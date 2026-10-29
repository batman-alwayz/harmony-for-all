// connect: official Spotify app is the player
export const connect = (api, device) => ({
  position: () => api.get('/me/player').then(r => r?.progress_ms ?? 0),
  seek: ms => api.put(`/me/player/seek?position_ms=${Math.round(ms)}&device_id=${device}`),
  play: (uri, ms) => api.put(`/me/player/play?device_id=${device}`,
    { uris: [uri], position_ms: Math.round(ms) }),
  pause: () => api.put('/me/player/pause'),
  end: () => new Promise(r => {
    const iv = setInterval(async () => {
      const s = await api.get('/me/player');
      if (!s?.is_playing) { clearInterval(iv); r(); }
    }, 1000);
  })
});

// ytm: native shell only, talks to the injected bridge
export const ytm = (send) => ({
  position: () => send('position') ?? 0,
  seek: ms => send('seek', ms),
  play: (id, ms) => send('load', { id, ms }),
  pause: () => send('pause'),
  end: () => new Promise(r => { window.onYtmEnd = r; })
});

// browser fallback: countdown only, user taps play
export const manual = (state) => ({
  position: () => (Date.now() - state.startAt) / 1000,
  seek: () => {}, play: () => {}, pause: () => {},
  end: () => new Promise(r => setTimeout(r, state.playing.dur * 1000))
});
