import { setOffset, startLoop } from './sync.js';
import { connect, ytm, manual } from './players.js';

let S = { queue: [], playing: null, present: {}, armed: {}, votes: [], startAt: 0, endAt: 0 };
let player, loop, ws;

function route(m) {
  if (m.provider === 'spotify') {
    return m.product === 'premium' ? 'connect' : 'manual';
  }
  return window.NativeBridge ? 'ytm' : 'manual';
}

function pick() {
  const me = S.present[myId];
  const r = route(me);
  if (r === 'connect') {
    device = await getDevice();            // cached from /me/player/devices
    player = connect(api, device);
  } else if (r === 'ytm') {
    player = ytm(sendToShell);
  } else {
    player = manual(S);
  }
}

function onFrame({ s, now }) {
  setOffset(now);
  const prev = S.playing;
  S = s;
  render();
  if (!prev && S.playing) begin();
  if (prev && !S.playing) finish();
}

function begin() {
  clearInterval(loop);
  // start at the countdown, not at zero, so everyone lands on 0:00 together
  const wait = Math.max(0, S.startAt - Date.now() - 400);
  setTimeout(() => {
    player.play(S.playing.uri, 0);
    loop = startLoop(player, S, d => paintDrift(d));
  }, wait);
  player.end().then(() => send({ t: 'ended' }));
}
