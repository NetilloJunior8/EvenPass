const CACHE_NAME = 'ivonne-vip-v2';
const urlsToCache = [
  './',
  './escaner.html',
  './panel.html',
  './logo.png',
  'https://unpkg.com/html5-qrcode',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones a Google Script para que no se atoren en cache cuando hay internet
  if(event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
