// injected into the YTM WebView
const v = () => document.querySelector('video');

window.bridge = {
  play: () => v()?.play(),
  pause: () => v()?.pause(),
  seek: ms => { if (v()) v().currentTime = ms / 1000; },
  position: () => (v()?.currentTime ?? 0) * 1000,
  onEnd: cb => v()?.addEventListener('ended', cb)
};
