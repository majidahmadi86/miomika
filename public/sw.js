/* Miomika service worker — SELF-DESTRUCT build, generated 2026-07-26T06:25:20.847Z
 *
 * The PWA cache layer MANUFACTURED the "please refresh" bug class: it cached
 * build files and purged them across deploys, stranding open pages. An online
 * AI companion needs no offline shell, so the worker is retired for good.
 * This build exists only to CLEAN UP every device that ever installed one:
 * it takes over immediately, deletes every cache, uninstalls itself, and gets
 * out of the way. New visitors never register a worker again (registration
 * removed from the app). Native app push (FCM) does not use this.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      // No clients.claim(): open pages keep running untouched on the network;
      // from their next navigation the worker is simply gone.
    })(),
  );
});

// No fetch handler: nothing is intercepted, nothing is cached, ever again.
