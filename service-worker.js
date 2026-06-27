// ===============================================================
// Mahasap POS — Service Worker v3 (Offline Queue Support)
// ===============================================================
const CACHE_NAME = 'mahasap-pwa-v3';
const BASE = '/mahasap.github.io';

const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Always network for GAS API (POST and GET to script.google.com)
  if (url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — no network.' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // POST requests — always network
  if (event.request.method === 'POST') {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell — cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // For navigation requests, return cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});

// Background sync (triggered when back online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'mahasap-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SYNC_NOW' }));
      })
    );
  }
});
