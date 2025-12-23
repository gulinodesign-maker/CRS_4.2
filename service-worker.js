const CACHE_NAME = "CRS-4.81";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./crs-icon-192.png",
  "./crs-icon-512.png",
  "./crs-icon.png",
  "./bg-track.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});




self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API / dynamic endpoints
  if (url.hostname.includes("script.google.com")) return;

  // Network-first for navigations (index.html / SPA)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })());
    return;
  }

  // Cache-first for same-origin static assets
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const fresh = await fetch(req);
      // Cache only successful basic responses
      if (fresh && fresh.ok && (fresh.type === "basic" || fresh.type === "cors")) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      }
      return fresh;
    })());
    return;
  }

  // Default: just fetch
  return;
});
