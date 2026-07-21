/* Miomika service worker — generated 2026-07-16T05:55:40.134Z */
const CACHE_PREFIX = "miomika";
const BUILD_ID = "b92dc37d1b91";

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
    // Only fall back to a shell from THE CURRENT build's cache. A shell from a
    // previous build references purged /_next/static chunks and is exactly what
    // caused the "please refresh" screen — so never serve a cross-build shell.
    const cache = await caches.open(name);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const name = await cacheName();
  const cache = await caches.open(name);
  const cached = await cache.match(request);
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

/* --- Miomi care notifications (web push) --- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Miomika", {
      body: data.body || "",
      icon: "/manifest-icon-192.png",
      badge: "/manifest-icon-192.png",
      data: { url: data.url || "/talk" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/talk";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
