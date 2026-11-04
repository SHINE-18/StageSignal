/**
 * StageSignal PWA Service Worker
 * Version: stagesignal-shell-v1
 *
 * Rules:
 * - Cache ONLY static app shell and static assets.
 * - NEVER cache or intercept Convex WebSocket/API traffic, or any dynamic data.
 * - Network-first for navigations with an offline fallback page.
 * - Clean up old caches on activate.
 * - Activate updates safely without breaking live sessions.
 */

const CACHE_NAME = "stagesignal-shell-v1";

const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER intercept or cache Convex traffic, WebSockets, APIs, or non-GET requests
  if (
    event.request.method !== "GET" ||
    url.hostname.includes("convex.cloud") ||
    url.hostname.includes("convex.site") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes("_convex") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:"
  ) {
    return; // Pass through to browser network layer unmodified
  }

  // 2. Navigation requests (HTML pages): Network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline.html").then((fallback) => {
          return fallback || new Response("Offline. StageSignal needs an internet connection.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
    );
    return;
  }

  // 3. Static assets: Stale-While-Revalidate / Cache-First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // All other requests: default browser fetch
  event.respondWith(fetch(event.request));
});
