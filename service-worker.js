/* CRS_4.144 */
'use strict';

const BUILD = 'CRS_4.144';
const CACHE_NAME = `crs-cache-${BUILD}`;
const HTML_CACHE = `crs-html-${BUILD}`;
const ASSET_CACHE = `crs-assets-${BUILD}`;

// Files we want offline (keep minimal to reduce iOS cache weirdness)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Heuristic: treat these as API and avoid caching
function isApiRequest(url) {
  // same-origin API path patterns (edit as needed)
  return url.pathname.startsWith('/api/')
    || url.pathname.includes('/api')
    || url.pathname.endsWith('.php')
    || url.pathname.endsWith('.json') && url.pathname.includes('/api');
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    // Precache core
    const cache = await caches.open(ASSET_CACHE);
    await cache.addAll(CORE_ASSETS.map(u => new Request(u, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients so the new SW controls immediately
    await self.clients.claim();

    // Cleanup old caches
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('crs-') && ![CACHE_NAME, HTML_CACHE, ASSET_CACHE].includes(k))
        .map(k => caches.delete(k))
    );
  })());
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first for navigations / HTML (index.html)
async function networkFirst(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const fresh = await fetch(request, {
      cache: 'no-store' // important for iOS aggressive caching
    });
    // Cache only successful basic responses
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // fallback to cached index for SPA-like navigations
    const fallback = await cache.match('./index.html', { ignoreSearch: true });
    return fallback || Response.error();
  }
}

// Stale-while-revalidate for static assets
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const fetchPromise = fetch(request).then((resp) => {
    if (resp && resp.ok && resp.type === 'basic') {
      cache.put(request, resp.clone());
    }
    return resp;
  }).catch(() => null);

  return cached || (await fetchPromise) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Avoid caching cross-origin and APIs
  if (url.origin !== self.location.origin) {
    return; // let it pass-through
  }
  if (isApiRequest(url)) {
    // Always network for API (no cache)
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for navigations (includes opening from Home Screen)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    // Always use a normalized request for index.html
    const navReq = new Request('./index.html', {
      headers: req.headers,
      cache: 'no-store'
    });
    event.respondWith(networkFirst(navReq));
    return;
  }

  // For static assets: SWR
  event.respondWith(staleWhileRevalidate(req));
});
