const C = 'v1';
self.addEventListener('install', e => e.waitUntil(
  caches.open(C).then(c => c.addAll(['/', '/app.js', '/sync.js', '/players.js']))
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
