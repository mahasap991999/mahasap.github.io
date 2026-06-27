// ===============================================================
// Mahasap POS — Service Worker
// Caches the app shell for fast load & basic offline support.
// ===============================================================

const CACHE_NAME = 'mahasap-pwa-v1';

// App shell assets to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js',
];

// ── Install: pre-cache app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache what we can; ignore failures for external CDN resources
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ──────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go network for GAS API calls (POST requests)
  if (event.request.method === 'POST') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for the GAS API URL pattern
  if (url.pathname.includes('/macros/s/') || url.pathname.includes('/exec')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — no network connection.' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Cache-first for app shell & static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for app assets
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// ── Background sync (future use) ──────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sales') {
    // TODO: replay queued offline sales when back online
    console.log('[SW] Background sync: sync-sales');
  }
});
