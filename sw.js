const CACHE_NAME = 'oficios-cache-v14';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/style.css',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
