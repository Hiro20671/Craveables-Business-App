// CRAVEABLES Service Worker - v4
const CACHE_NAME = 'craveables-cache-v4';
const STATIC_ASSETS = [
  '/logo.png',
  '/badge.png',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        // Purge ALL old caches to ensure fresh code
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let API and admin requests go to network directly
  if (event.request.url.includes('/api/') || event.request.url.includes('/admin/')) {
    return;
  }

  // HTML navigation requests must ALWAYS go Network-First so users get the latest deployed frontend
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets (images, icons)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
