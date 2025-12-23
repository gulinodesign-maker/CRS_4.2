const CACHE_NAME = "CRS-4.79";
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './crs-icon-192.png',
  './crs-icon-512.png',
  './crs-icon.png',
  './bg.jpg',
  './logo_crs.png'
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

self.addEventListener("fetch", e => {
  // Avoid caching API calls
  if (e.request.url.includes("script.google.com") || e.request.url.includes("/exec")) {
    e.respondWith(fetch(e.request, { cache: "no-store" }));
    return;
  }

  const url = new URL(e.request.url);
  if (url.hostname.includes("script.google.com")) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then(r => {
          const c = r.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", c));
          return r;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
