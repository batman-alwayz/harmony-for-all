async function tick() {
  if (route.player !== 'connect') return;
  const target = (Date.now() + clockOffset - startAt) / 1000;
  const s = await api('/me/player');
  if (!s || s.is_playing === false) return;
  if (Math.abs(s.progress_ms / 1000 - target) > 1.5) {
    await api('/me/player/seek?position_ms=' + Math.round(target * 1000));
  }
}
setInterval(tick, 2000);

const AD_HOSTS = [/doubleclick\.net/, /googlesyndication/, /\/pagead\//, /googleads\.g\.doubleclick/];
// Android: shouldInterceptRequest returns an empty response for those.
// iOS: WKContentRuleList with the same patterns.

// injected, as a backstop
setInterval(() => {
  const v = document.querySelector('video');
  if (!v) return;
  const adShowing = document.querySelector('.ad-showing') || document.querySelector('.ytp-ad-player-overlay');
  if (adShowing && v.duration > 1) {
    v.currentTime = v.duration - 0.1;
    window.bridge.reportAdSkip();
  }
}, 400);
