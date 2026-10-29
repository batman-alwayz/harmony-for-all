import { login, callback, logout, whoami } from './auth.js';
import { Room } from './room.js';
export { Room };

const json = (d, s = 200) => new Response(JSON.stringify(d), {
  status: s, headers: { 'content-type': 'application/json' }
});

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const p = u.pathname;

    if (p === '/auth/login') return login(req, env);
    if (p === '/auth/callback') return callback(req, env);
    if (p === '/auth/logout') return logout(req, env);

    const me = await whoami(req, env);
    if (p.startsWith('/api/')) {
      if (!me) return json({ error: 'auth' }, 401);

      if (p === '/api/me') return json(me);

      // one DO per room, id from the session's room
      const id = env.ROOM.idFromName(me.room);
      const stub = env.ROOM.get(id);

      if (p === '/api/ws') {
        const h = new Headers(req.headers);
        h.set('x-member', me.id);
        return stub.fetch(new Request('https://do/ws', { headers: h, method: req.method }));
      }

      const body = req.method === 'POST' ? await req.json() : null;
      return stub.fetch(new Request('https://do/' + p.slice(5), {
        method: req.method,
        headers: { 'content-type': 'application/json', 'x-member': me.id },
        body: body ? JSON.stringify(body) : null
      }));
    }

    return env.ASSETS.fetch(req);
  }
};
