const CACHE_VERSION = "meals-v5";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Never cache — always network (API, Next chunks, pages)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    request.mode === "navigate"
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Other static public files: network-first, optional cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.open(CACHE_VERSION).then((c) => c.match(request))),
  );
});
