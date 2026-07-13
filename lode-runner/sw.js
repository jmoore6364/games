// Offline support: precache the whole game (it is tiny and has no external
// assets), serve cache-first, and refresh entries in the background so a new
// deploy is picked up on the next visit.
const CACHE = 'lode-runner-v3';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/main.js',
  'src/game.js',
  'src/levels.js',
  'src/sprites.js',
  'src/audio.js',
  'src/input.js',
  'src/touch.js',
  'src/editor.js',
  'src/validate.js',
  'src/share.js',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.registration.scope)) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const refresh = fetch(e.request)
        .then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
