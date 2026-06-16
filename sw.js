const CACHE_NAME = 'ceremonial-console-v1';

// The service worker simply needs to exist to satisfy mobile device PWA security criteria
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Direct pass-through network routing to let your custom RAM allocation cache handle data
  e.respondWith(fetch(e.request));
});