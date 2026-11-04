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

// ==========================================
// Web Push Event Handlers (iOS 16.4+ & PWA)
// ==========================================

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "StageSignal", body: event.data.text() };
    }
  }

  const title = data.title || "StageSignal Alert";
  const options = {
    body: data.body || "New stage request received.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "stagesignal-alert",
    data: {
      url: data.url || "/",
      timestamp: data.timestamp || Date.now(),
    },
    silent: true, // Visual-only: strictly zero sound playback
    renotify: true,
  };

  // iOS 16.4+ strictly requires every push event to show a notification,
  // otherwise it revokes the push subscription.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Look for an existing StageSignal window to focus
        for (const client of clientList) {
          if (client.url && client.url.includes("/room/") && "focus" in client) {
            if ("navigate" in client && targetUrl !== "/") {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no matching window is open, launch a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
