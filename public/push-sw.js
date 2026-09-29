/* Miomika push worker — web push for Miomi's care notes, nothing else.
 *
 * Registered by /me with scope "/push/" so it never controls a page and has
 * no fetch handler: the retired PWA cache layer (see sw.js) stays retired.
 * A push subscription only needs *a* registration to live on; this is it.
 * Payload shape comes from lib/care/push.ts: { title, body, url }.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

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
      // This worker controls no pages, so it can't navigate them; focus an
      // open Miomika tab if there is one, otherwise open the target.
      const open = list.find((c) => "focus" in c);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
