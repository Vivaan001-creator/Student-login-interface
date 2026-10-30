// GenAlpha service worker.
// 1) Shows notifications and opens the app when one is tapped.
// 2) Makes every page open instantly: pages, scripts, styles, images, fonts and the
//    Firebase SDK are served from the phone's cache first, then refreshed quietly in
//    the background (stale-while-revalidate). A change you upload shows up the next
//    time the page is opened after that. Live data (Firestore, login, whats-new.json)
//    is never cached, so results, fees, notices and update alerts stay fresh.
const CACHE = "genalpha-v3";   // change this number whenever you upload new files, so phones drop the old copies at once
const NEVER = [/whats-new\.json/, /firestore\.googleapis\.com/, /identitytoolkit/, /securetoken/, /firebasestorage/, /firebaseio\.com/];
const CDN_OK = ["www.gstatic.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([
    "login.html", "premium.css", "protect.css", "protect.js", "site.css", "site.js", "appearance.js", "Firebase.js", "logo.png"
  ]).catch(() => {})));
});
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NEVER.some((re) => re.test(req.url))) return;
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN_OK.includes(url.hostname)) return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: false }).then((hit) => {
        const refresh = fetch(req).then((res) => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || refresh;
      })
    )
  );
});

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
