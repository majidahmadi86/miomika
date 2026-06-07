/* Miomika service worker — generated 2026-06-07T16:39:35.541Z */
const CACHE_PREFIX = "miomika";
const BUILD_ID = "f44b2f4d9317";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheName = `${CACHE_PREFIX}-${BUILD_ID}`;
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== cacheName)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNetworkOnlyPath(pathname) {
  return (
    pathname === "/sw.js" ||
    pathname === "/version.json" ||
    pathname.startsWith("/api/")
  );
}

async function cacheName() {
  return `${CACHE_PREFIX}-${BUILD_ID}`;
}

async function networkFirst(request) {
  const name = await cacheName();
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      const cacheResponse = response.clone();
      void caches.open(name).then((cache) => cache.put(request, cacheResponse));
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && request.method === "GET") {
    const cacheResponse = response.clone();
    void caches.open(await cacheName()).then((cache) => cache.put(request, cacheResponse));
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const name = await cacheName();
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && request.method === "GET") {
        const cacheResponse = response.clone();
        void caches.open(name).then((cache) => cache.put(request, cacheResponse));
      }
      return response;
    })
    .catch(() => null);
  return cached || network || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;
  if (isNetworkOnlyPath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});
