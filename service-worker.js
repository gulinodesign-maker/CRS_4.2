const CACHE_NAME = "CRS-4.85";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./bg-track.jpg",
  "./crs-logo-4.85.svg",
  "./logo_clean_4.85.png",
  
  
  "./crs-icon.png",
  "./crs-icon-192.png",
  "./crs-icon-512.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k.startsWith("CRS-") && k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
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
