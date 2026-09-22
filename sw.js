const CACHE_NAME = 'kasir-os-cache-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: simpan app shell ke cache biar bisa dibuka walau offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: bersihin cache versi lama & langsung ambil alih tab yang lagi kebuka
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST buat file sendiri (HTML/manifest/icon).
// Tiap dibuka, coba ambil versi TERBARU dulu dari internet & update cache-nya.
// Kalau gagal (beneran offline), baru jatuh ke versi terakhir yang tersimpan di cache.
// Request ke Supabase (beda origin) DIBIARKAN LEWAT LANGSUNG ke network,
// biar logic sinkron/offline-queue di app.js yang nanganin, bukan service worker.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) return; // biarkan request ke Supabase apa adanya

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
