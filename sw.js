/* Service worker for Chef Tools combined suite */
// Bump the cache name whenever the list of cached files changes so that a new cache is created.
// The version number must be incremented whenever new assets are added or logic is updated
// to ensure clients receive fresh content.  v3 includes catalog.js and ExcelJS support.
const CACHE_NAME = 'chef-tools-cache-v3';
const PRECACHE_URLS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'app.js',
  // catalog.js is now embedded inline in index.html, so no need to pre-cache it.
  'manifest.json',
  // Cache ExcelJS library for offline XLSX generation
  'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js'
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