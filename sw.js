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

// 3. Fetch Interceptor: FIXED CRITICAL LOCAL-OVER-NETWORK LOOKUP PRIORITY
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAudioFile = url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav');

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // RULE 1: If it's sitting safely on the device hard drive, use it instantly!
      // This bypasses connection checking entirely so your unticked checkbox won't block local playback.
      if (cachedResponse) {
        return cachedResponse;
      }

      // RULE 2: If it's NOT cached, check cellular limits before trying to download from the web
      if (isAudioFile && navigator.connection) {
        const connectionType = navigator.connection.type;
        const saveDataActive = navigator.connection.saveData;

        if (connectionType === 'cellular' || saveDataActive === true) {
          if (url.searchParams.get('forceMobile') !== 'true') {
            return new Response(
              JSON.stringify({ error: "Cellular data download blocked. Turn on 'Allow Mobile Data' on the home screen to override." }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // RULE 3: Wi-Fi connection safe or override active -> Fetch from internet and cache it
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});