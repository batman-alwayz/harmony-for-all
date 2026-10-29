async function match(track) {
  const isrc = track.external_ids?.isrc;
  if (isrc) { const hit = await ytByIsrc(isrc); if (hit) return { ...hit, conf: 0.99, how: 'isrc' }; }
  const fp = await acoustid(track.previewUrl);
  const cands = await ytSearch(`${track.name} ${track.artists[0].name}`);
  const scored = cands.map(c => score(c, track, fp)).sort((a, b) => b.conf - a.conf);
  return scored[0];
}
