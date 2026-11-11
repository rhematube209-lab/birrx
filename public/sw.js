const CACHE_NAME = 'birrx-pwa-v2';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/app-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
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
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip dev server internals and browser extensions
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/@react-refresh') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return (await caches.match('/index.html')) || (await caches.match('/'));
        })
    );
    return;
  }

  // 2. Static assets (JS, CSS, images, icons, fonts)
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Return from cache immediately, fetch fresh copy in background if online
        fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
            }
          })
          .catch(() => {
            // Offline - ignore network error since cached version is already returned
          });
        return cachedRes;
      }

      // Not in cache, fetch from network and store
      return fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          // Offline fallback for images or svg if needed
          if (req.destination === 'image') {
            return caches.match('/birrx.svg');
          }
          return new Response('Network error (offline)', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
