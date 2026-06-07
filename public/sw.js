// Prop-Scanner Service Worker
// Strategy:
//   - HTML, API responses → network only (auth-gated, must be fresh)
//   - Static assets (Next's hashed chunks under /_next/static, PNGs,
//     manifest, fonts) → cache-first with a stale-while-revalidate update
// Bump CACHE_VERSION whenever this file changes so old clients re-activate.

const CACHE_VERSION = "prop-scanner-v2";
const PRECACHE_URLS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css)$/i.test(url.pathname)) return true;
  if (url.pathname === "/manifest.json") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle same-origin requests; let third-party (tile maps, image CDNs)
  // pass straight through.
  if (url.origin !== self.location.origin) return;

  // API / HTML: network only — never serve stale auth-gated data.
  if (url.pathname.startsWith("/api/") || req.mode === "navigate") {
    return; // default browser behaviour
  }

  if (!isStaticAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone()).catch(() => undefined);
          }
          return res;
        })
        .catch(() => null);
      // Stale-while-revalidate: serve cached immediately, refresh in background.
      return cached || (await network) || fetch(req);
    })()
  );
});
