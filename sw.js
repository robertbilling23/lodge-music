const CACHE_NAME = 'lodge-music-v52';

// Only pre-cache the absolute core layout shell files on first install
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sets.json'
];

// 1. Install Event: Lock down the core application interface shell framework
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Wipe out old cache files completely when you change version tokens
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

// 3. Fetch Interceptor: The Smart Cellular Shield & Cache-First Routing Engine
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAudioFile = url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav');

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If the file is already sitting safely in our permanent database cache, use it instantly!
      if (cachedResponse) {
        return cachedResponse;
      }

      // CELLULAR SHIELD LAYER: If it's a heavy audio asset and NOT cached yet, check connection metrics
      if (isAudioFile && navigator.connection) {
        const connectionType = navigator.connection.type;
        const saveDataActive = navigator.connection.saveData;

        // If explicitly on a cellular network or data-saver mode is active
        if (connectionType === 'cellular' || saveDataActive === true) {
          // Check if the request contains the bypass flag directly in its URL
          if (url.searchParams.get('forceMobile') !== 'true') {
            return new Response(
              JSON.stringify({ error: "Cellular data download blocked. Turn on 'Allow Mobile Data' on the home screen to override." }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // If we have a cache miss but we are safely on Wi-Fi (or the override token is present), download and save it
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response stream to slide a copy into permanent Cache Storage for total offline independence
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});