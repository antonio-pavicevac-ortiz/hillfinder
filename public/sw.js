const CACHE_VERSION = "v1";
const SHELL_CACHE = `hillfinder-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `hillfinder-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// Assets guaranteed to be cached at install time
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove any caches from previous versions on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.endsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Let API routes always go to the network
  if (url.pathname.startsWith("/api/")) return;

  // Next.js static chunks are content-hashed → safe to cache forever (cache-first)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // Public static assets (icons, images) → cache-first with background update
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/favicon") ||
    /\.(png|svg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              caches
                .open(SHELL_CACHE)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // Page navigations → network-first, offline page as fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached ?? new Response("Offline", { status: 503 }))
      )
    );
  }
});
