const CACHE_NAME = "miomika-shell-v1";
const APP_SHELL = ["/", "/home", "/create", "/manifest.json", "/miomi/idle.png"];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#8B1A35" />
  <title>Miomika — Offline</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #1a1a1a; display: flex; min-height: 100dvh; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    h1 { font-size: 1.125rem; font-weight: 500; color: #8B1A35; }
    p { font-size: 0.875rem; color: #888; line-height: 1.6; }
  </style>
</head>
<body>
  <div>
    <h1>ออฟไลน์อยู่ค่ะ</h1>
    <p>หนูรอคุณอยู่นะคะ — ลองเชื่อมต่ออินเทอร์เน็ตแล้วเปิด Miomika ใหม่ค่ะ</p>
    <p>You're offline — connect and open Miomika again.</p>
  </div>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => offlineResponse());
    }),
  );
});
