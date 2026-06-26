const CACHE_NAME = 'lodge-music-v53';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sets.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAudioFile = url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav');

  // Create a clean URL request pointer with parameters stripped for consistent local storage mapping
  const cleanRequestTarget = isAudioFile ? new Request(url.origin + url.pathname) : event.request;

  event.respondWith(
    caches.match(cleanRequestTarget).then((cachedResponse) => {
      // 1. Always serve instantly if found in local hardware storage
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. If it's a cache miss, handle cellular connection restrictions
      if (isAudioFile && navigator.connection) {
        const connectionType = navigator.connection.type;
        const saveDataActive = navigator.connection.saveData;

        if (connectionType === 'cellular' || saveDataActive === true) {
          if (url.searchParams.get('forceMobile') !== 'true') {
            return new Response(
              JSON.stringify({ error: "Cellular download blocked. Turn on 'Allow Mobile Data' on the home screen." }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // 3. Download asset, then clean the address string before writing to cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Save under the clean, parameterless URL so checkbox states won't cause split hits
          cache.put(cleanRequestTarget, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});