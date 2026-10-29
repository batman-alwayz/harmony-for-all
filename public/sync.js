let offset = 0;

export function setOffset(srvNow) {
  offset = offset * 0.8 + (srvNow - Date.now()) * 0.2;   // smoothed
}

export function startLoop(player, state, onDrift) {
  return setInterval(() => {
    if (!state.playing) return;
    const target = (Date.now() + offset - state.startAt) / 1000;
    if (target < 0) return;
    const now = player.position();
    const drift = now - target;
    if (Math.abs(drift) > 1.5) player.seek(target * 1000);
    onDrift(drift);
  }, 2000);
}
