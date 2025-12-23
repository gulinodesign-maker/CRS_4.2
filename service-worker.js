/* CRS Score Service Worker - BUILD 4.81 */
const BUILD = "4.81";
const CACHE_NAME = `CRS-${BUILD}`;

// Static assets to precache (keep this list small + deterministic)
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./bg-track.jpg",
  "./crs-logo.png",
  "./crs-icon.png",
  "./crs-icon-192.png",
  "./crs-icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Cleanup old caches
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME && key.startsWith("CRS-")) return caches.delete(key);
      })
    );
    await self.clients.claim();
  })());
});

function isNavigationRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

function isApiRequest(url) {
  // Avoid caching API calls (customize if you add endpoints)
  return url.pathname.startsWith("/api/") || url.pathname.includes("/api/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache API calls (network only)
  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for navigations / index.html
  if (isNavigationRequest(request) || url.pathname.endsWith("/index.html")) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", networkResponse.clone());
        return networkResponse;
      } catch (err) {
        const cached = await caches.match("./index.html");
        if (cached) return cached;
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Cache-first for other static assets
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    // Cache only successful GETs (avoid caching opaque/error)
    if (request.method === "GET" && response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
