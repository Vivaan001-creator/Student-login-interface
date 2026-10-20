// GenAlpha service worker. It only shows notifications and opens the app when one
// is tapped. It does not cache anything, so pages and scripts are never stale.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./login.html", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          return client.focus().then(() => ("navigate" in client ? client.navigate(target).catch(() => {}) : undefined));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Ready for a real push sender later (payload: { "title": "...", "body": "...", "url": "..." }).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "GenAlpha", {
    body: data.body || "",
    icon: "icon-192.png",
    badge: "favicon-32.png",
    data: { url: data.url || "./login.html" }
  }));
});
