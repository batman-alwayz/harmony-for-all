const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function login(req, env) {
  const v = b64(crypto.getRandomValues(new Uint8Array(32)));
  const ch = b64(await crypto.subtle.digest('SHA-256', enc(v)));
  await env.KV.put('pkce:' + v, ch, { expirationTtl: 600 });
  const q = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: new URL('/auth/callback', req.url).href,
    code_challenge_method: 'S256',
    code_challenge: ch,
    scope: 'streaming user-read-playback-state user-modify-playback-state user-read-currently-playing'
  });
  return Response.redirect('https://accounts.spotify.com/authorize?' + q, 302);
}

export async function callback(req, env) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const ver = u.searchParams.get('state');
  const ch = await env.KV.get('pkce:' + ver);
  if (!code || !ch) return Response.redirect('/?e=pkce', 302);

  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: new URL('/auth/callback', req.url).href,
      client_id: env.SPOTIFY_CLIENT_ID,
      code_verifier: ver
    })
  });
  const t = await r.json();
  if (!t.access_token) return Response.redirect('/?e=token', 302);

  const me = await fetch('https://api.spotify.com/v1/me', {
    headers: { authorization: 'Bearer ' + t.access_token }
  }).then(x => x.json());

  await env.DB.prepare(
    `INSERT INTO members (id,name,provider,product,refresh,access,exp,created)
     VALUES (?,?,'spotify',?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET product=excluded.product, refresh=excluded.refresh,
       access=excluded.access, exp=excluded.exp`
  ).bind(me.id, me.display_name, me.product, t.refresh_token,
         t.access_token, Date.now() + t.expires_in * 1000, Date.now()).run();

  return new Response(null, {
    status: 302,
    headers: {
      location: '/',
      'set-cookie': `sid=${me.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
    }
  });
}

export function logout() {
  return new Response(null, {
    status: 302, headers: { location: '/', 'set-cookie': 'sid=; Path=/; Max-Age=0' }
  });
}

export async function whoami(req, env) {
  const sid = (req.headers.get('cookie') || '').match(/sid=([^;]+)/)?.[1];
  if (!sid) return null;
  const m = await env.DB.prepare('SELECT * FROM members WHERE id=?').bind(sid).first();
  if (!m) return null;
  if (m.provider === 'spotify' && m.exp < Date.now() + 60000) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', refresh_token: m.refresh,
        client_id: env.SPOTIFY_CLIENT_ID
      })
    }).then(x => x.json());
    if (r.access_token) {
      await env.DB.prepare('UPDATE members SET access=?, exp=?, refresh=COALESCE(?,refresh) WHERE id=?')
        .bind(r.access_token, Date.now() + r.expires_in * 1000, r.refresh_token || null, m.id).run();
      m.access = r.access_token;
    }
  }
  return { id: m.id, name: m.name, product: m.product, provider: m.provider, room: 'main' };
}
