const CACHE_NAME = "CRS-4.112";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./crs-icon-192.png",
  "./crs-icon-512.png",
  "./crs-icon.png",
  "./bg-track.jpg",
  "./crs-banner.png"
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES_TO_CACHE);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
    // Nudge clients to reload
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: "RELOAD" }));
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API / dynamic endpoints
  if (url.hostname.includes("script.google.com")) return;

  // Network-first for navigations (SPA) + index.html, with no-store to bypass iOS cache
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("index.html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Cache-first for static assets (same-origin)
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && (fresh.type === "basic" || fresh.type === "cors")) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }
});
