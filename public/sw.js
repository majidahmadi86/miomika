const CACHE = 'miomika-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(async keys => {
      await Promise.all(keys.map(k => caches.delete(k)));
      await new Promise(r => setTimeout(r, 100));
      await self.clients.claim();
    }),
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
