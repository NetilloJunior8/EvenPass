const CACHE_NAME = 'mi-panel-v2';
const urlsToCache = [
  './panel.html',
  './mi_logo.svg',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
    )
  );
});

self.addEventListener('fetch', event => {
  // No cachear llamadas al Google Script
  if (event.request.url.includes('script.google.com')) return;
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});
