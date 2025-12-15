/**
 * Service Worker for Regen Browser
 * Handles caching, offline support, and performance optimization
 */

const CACHE_NAME = 'regen-v1';
const RUNTIME_CACHE = 'regen-runtime-v1';
const STATIC_CACHE = 'regen-static-v1';

// Assets to cache immediately
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/logo.png', '/styles/globals.css'];

// API endpoints to cache
const API_CACHE_PATTERNS = [/\/api\/search/, /\/api\/summarize/, /\/api\/agent/];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => {
            return name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== STATIC_CACHE;
          })
          .map(name => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except same-origin)
  if (url.origin !== location.origin && !url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle API requests with cache-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // Serve from cache, but fetch in background to update
            fetch(request).then(response => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
            });
            return cachedResponse;
          }
          // Fetch from network
          return fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/) ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          return (
            cachedResponse ||
            fetch(request).then(response => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
          );
        });
      })
    );
    return;
  }

  // Handle navigation requests with network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Default: network-first for other requests
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-research-results') {
    event.waitUntil(syncResearchResults());
  }
});

async function syncResearchResults() {
  // Sync offline research results when online
  // Implementation depends on your offline storage strategy
}
