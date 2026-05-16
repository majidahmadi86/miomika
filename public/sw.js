self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('miomika-v1').then(cache =>
      cache.addAll(['/', '/home'])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
