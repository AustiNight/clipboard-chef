/* Service worker for Chef Tools combined suite */
// Bump the cache name whenever the list of cached files changes so that a new cache is created.
const CACHE_NAME = 'chef-tools-cache-v2';
const PRECACHE_URLS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'app.js',
  'catalog.js',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
