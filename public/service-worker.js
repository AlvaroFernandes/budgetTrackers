const STATIC_CACHE = "static-cache-v1";
const RUNTIME_CACHE = "runtime";
const FILES_TO_CACHE = [
  "/",
  "index.html",
  "index.js",
  "indexedDb.js",
  "manifest.json",
  "/icons/icon_192x192.png",
  "/icons/icon_512x512.png",
  "/styles.css",
];

//* Install Service worker
self.addEventListener("install", (e) => {
    console.log(`SW Installed.`);
    e.waitUntil(
      caches
        .open(STATIC_CACHE)
        .then((cache) => cache.addAll(FILES_TO_CACHE))
        .then(() => self.skipWaiting())
    );
  });

//* event calls and cleaning old caches.
self.addEventListener("active", (e) => {
    console.log(`SW: Active.`);
    const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
    e.waitUntil(
      caches
        .keys()
        .then((names) => {
          return names.filter(
            (name) => !currentCaches.includes(name)
          );
        })
        .then((deletes) => {
          return Promise.all(
            deletes.map((cacheDelete) => {
              return caches.delete(cacheDelete);
            })
          );
        })
        .then(() => self.clients.claim())
    );
  });

self.addEventListener("fetch", e => {
  if (
    e.request.method !== "GET" ||
    !e.request.url.startsWith(self.location.origin)
  ) {
    e.respondWith(fetch(e.request));
    return;
  };

  if (e.request.url.includes("/api")) {
    e.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(e.request)
          .then((response) => {
            cache.put(e.request, response.clone());
            return response;
          })
          .catch(() => caches.match(e.request));
      })
    );
    return;
  };

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      };

      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(e.request).then((response) => {
          return cache.put(e.request, response.clone()).then(() => {
            return response;
          });
        });
      });
    })
  );
});