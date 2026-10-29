export class Room {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.s = { queue: [], playing: null, armed: {}, present: {}, votes: [], startAt: 0, endAt: 0, ended: {} };
    state.blockConcurrencyWhile(async () => {
      const r = await state.storage.get('s');
      if (r) this.s = r;
    });
  }

  save() { return this.state.storage.put('s', this.s); }

  async fetch(req) {
    if (new URL(req.url).pathname === '/ws') {
      const pair = new WebSocketPair();
      const [c, s] = Object.values(pair);
      this.state.acceptWebSocket(s);
      s.serializeAttachment({ id: req.headers.get('x-member') });
      return new Response(null, { status: 101, webSocket: c });
    }
    const t = new URL(req.url).pathname.slice(1);
    const b = req.method === 'POST' ? await req.json() : {};
    const who = req.headers.get('x-member');
    return this.on(t, b, who);
  }

  async webSocketMessage(ws, raw) {
    const { id } = ws.deserializeAttachment();
    const m = JSON.parse(raw);
    await this.on(m.t, m, id);
  }

  async webSocketClose(ws) {
    const { id } = ws.deserializeAttachment();
    delete this.s.present[id];
    this.maybeStart();
    this.push();
  }

  members() { return Object.keys(this.s.present); }
  admin(id) { return this.s.present[id]?.admin; }

  async on(t, b, who) {
    switch (t) {
      case 'join': {
        const m = await this.env.DB.prepare('SELECT id,name,product,provider,admin FROM members WHERE id=?').bind(who).first();
        if (!m) return;
        this.s.present[who] = { id: who, name: m.name, product: m.product, provider: m.provider, admin: !!m.admin };
        this.s.armed[who] = !this.s.playing;          // wait for the next track if one is running
        return this.push();
      }
      case 'arm': this.s.armed[who] = true; this.maybeStart(); return this.push();
      case 'unarm': this.s.armed[who] = false; return this.push();

      case 'add': {
        if (this.s.queue.some(q => q.tid === b.tid)) return this.push();   // idempotent
        const mine = this.s.queue.filter(q => q.by === who).length;
        if (mine >= 3) return this.push();
        const burst = this.s.queue.slice(-2).filter(q => q.by === who).length;
        const at = burst >= 2
          ? Math.max(0, this.s.queue.findLastIndex(q => q.by !== who) + 1)
          : this.s.queue.length;
        this.s.queue.splice(at, 0, { ...b, by: who });
        return this.push();
      }
      case 'remove': this.s.queue = this.s.queue.filter(q => q.tid !== b.tid); return this.push();
      case 'move': {
        const i = this.s.queue.findIndex(q => q.tid === b.tid);
        if (i < 0) return this.push();
        const [x] = this.s.queue.splice(i, 1);
        this.s.queue.splice(Math.max(0, Math.min(this.s.queue.length, b.pos)), 0, x);
        return this.push();
      }
      case 'skip': {
        if (!this.s.votes.includes(who)) this.s.votes.push(who);
        const need = Math.ceil(this.members().length * 0.6);
        if (this.s.votes.length >= need || this.admin(who)) return this.advance();
        return this.push();
      }
      case 'ended': {
        this.s.ended[who] = true;
        if (this.members().every(m => this.s.ended[m])) return this.advance();
        return this.push();
      }
      case 'progress': {
        this.s.present[who] && (this.s.present[who].ms = b.ms);
        return this.push();
      }
    }
  }

  // everyone armed, nothing playing -> countdown then start at 0:00 for all
  maybeStart() {
    if (this.s.playing || !this.s.queue.length) return;
    const all = this.members();
    if (!all.length || !all.every(m => this.s.armed[m])) return;
    this.s.playing = this.s.queue.shift();
    this.s.startAt = Date.now() + 3200;
    this.s.endAt = this.s.startAt + this.s.playing.dur * 1000 + 2500;
    this.s.votes = []; this.s.ended = {};
    for (const m of all) this.s.armed[m] = false;
    this.save(); this.push();
    setTimeout(() => this.guard(), 3400 + this.s.playing.dur * 1000);
  }

  // a stalled device must not hold the room forever
  async guard() {
    if (this.s.playing && Date.now() >= this.s.endAt - 200) this.advance();
  }

  async advance() {
    if (this.s.playing) {
      await this.env.DB.prepare('INSERT INTO plays (room,tid,by,listened,at) VALUES (?,?,?,?,?)')
        .bind('main', this.s.playing.tid, this.s.playing.by, this.s.playing.dur, Date.now()).run();
    }
    this.s.playing = null; this.s.votes = []; this.s.ended = {};
    this.save(); this.push();
    this.maybeStart();
  }

  push() {
    const f = JSON.stringify({ s: this.s, now: Date.now() });
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(f); } catch {}
    }
  }
}
