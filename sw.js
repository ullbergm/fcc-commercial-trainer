/* Service worker: stale-while-revalidate for everything same-origin.
 * Loads are served from cache immediately (works offline), then the cache is
 * refreshed from the network in the background.
 *
 * The cache name carries the release version (stamped in by the deploy
 * workflow), so every release ships a byte-different sw.js: the browser
 * installs it as a new worker, which precaches everything fresh and drops the
 * old cache on activate. That gives each release a clean, consistent set of
 * assets (no mixed old/new files) and lets the page detect the update and
 * offer a reload. */
const VERSION = '__VERSION__'; // replaced with the release tag at deploy
const CACHE = 'nc-cdl-trainer-' + VERSION;
const CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/fsrs.js',
  'js/storage.js',
  'js/app.js',
  'data/questions.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  // Both are written into the deploy by the release workflow; without them
  // the About changelog and the footer version are blank offline.
  'CHANGELOG.md',
  'version.txt',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fetched = fetch(e.request).then(res => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
