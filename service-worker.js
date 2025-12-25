const CACHE_NAME = "CRS-4.121";
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

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Don't cache potential API calls
  if (url.pathname.includes("/api/")) return;

  // Network-first for navigations (iOS cache-beater)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy)).catch(()=>{});
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
