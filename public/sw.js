/**
 * Service Worker for Regen Browser
 * Handles caching, offline support, and performance optimization
 * Layer 3: Enhanced caching strategies and offline resilience
 */

const CACHE_NAME = 'regen-v2'; // Layer 3: Updated version
const RUNTIME_CACHE = 'regen-runtime-v2';
const STATIC_CACHE = 'regen-static-v2';
const API_CACHE = 'regen-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/styles/globals.css',
  '/assets/fonts/', // Font files
];

// API endpoints to cache with stale-while-revalidate
const API_CACHE_PATTERNS = [
  /\/api\/search/,
  /\/api\/summarize/,
  /\/api\/agent/,
  /\/api\/history/,
  /\/api\/bookmarks/,
];

// Layer 3: Cache duration settings
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  api: 5 * 60 * 1000, // 5 minutes
  runtime: 24 * 60 * 60 * 1000, // 1 day
};

// Layer 3: Enhanced cache management
class CacheManager {
  static async addWithExpiry(cacheName, request, response, duration) {
    const cache = await caches.open(cacheName);
    const clonedResponse = response.clone();
    const body = await clonedResponse.blob();
    const expiry = Date.now() + duration;
    
    const responseWithExpiry = new Response(body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers: {
        ...Object.fromEntries(clonedResponse.headers.entries()),
        'sw-cache-expiry': expiry.toString(),
      },
    });
    
    await cache.put(request, responseWithExpiry);
  }

  static async matchWithExpiry(cacheName, request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (!cached) return null;
    
    const expiry = cached.headers.get('sw-cache-expiry');
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      await cache.delete(request);
      return null;
    }
    
    return cached;
  }

  static async cleanExpired(cacheName) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const now = Date.now();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const expiry = response?.headers.get('sw-cache-expiry');
      if (expiry && now > parseInt(expiry, 10)) {
        await cache.delete(request);
      }
    }
  }
}

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v2');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.error('[SW] Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and expired entries
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker v2');
  event.waitUntil(
    Promise.all([
      // Clean up old cache versions
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              return name !== CACHE_NAME && 
                     name !== RUNTIME_CACHE && 
                     name !== STATIC_CACHE &&
                     name !== API_CACHE;
            })
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Clean expired cache entries
      CacheManager.cleanExpired(RUNTIME_CACHE),
      CacheManager.cleanExpired(API_CACHE),
    ])
  );
  return self.clients.claim();
});

// Layer 3: Enhanced fetch event with comprehensive caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT/DELETE handled by offline queue)
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except our API)
  if (url.origin !== location.origin && !url.hostname.includes('api.')) {
    return;
  }

  // Strategy 1: Stale-while-revalidate for API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      (async () => {
        const cachedResponse = await CacheManager.matchWithExpiry(API_CACHE, request);
        
        // Fetch from network in parallel
        const networkPromise = fetch(request)
          .then(async response => {
            if (response.ok) {
              await CacheManager.addWithExpiry(
                API_CACHE, 
                request, 
                response.clone(), 
                CACHE_DURATIONS.api
              );
            }
            return response;
          })
          .catch(err => {
            console.log('[SW] Network request failed:', err.message);
            return null;
          });

        // Return cached immediately if available, otherwise wait for network
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          networkPromise.catch(() => {}); // Suppress unhandled rejections
          return cachedResponse;
        }

        const networkResponse = await networkPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // Fallback: return offline response
        return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })()
    );
    return;
  }

  // Strategy 2: Cache-first for static assets (images, fonts, CSS, JS)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/) ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cachedResponse = await CacheManager.matchWithExpiry(STATIC_CACHE, request);
        if (cachedResponse) {
          console.log('[SW] Cache hit:', url.pathname);
          return cachedResponse;
        }

        try {
          const response = await fetch(request);
          if (response.ok) {
            await CacheManager.addWithExpiry(
              STATIC_CACHE, 
              request, 
              response.clone(), 
              CACHE_DURATIONS.static
            );
          }
          return response;
        } catch (err) {
          console.error('[SW] Failed to fetch static asset:', err);
          return new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Strategy 3: Network-first for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          console.log('[SW] Navigation offline, serving cached version');
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to index.html for SPA routing
          return caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Strategy 4: Network-first with cache fallback for other requests
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await CacheManager.addWithExpiry(
            RUNTIME_CACHE, 
            request, 
            response.clone(), 
            CACHE_DURATIONS.runtime
          );
        }
        return response;
      } catch {
        const cachedResponse = await CacheManager.matchWithExpiry(RUNTIME_CACHE, request);
        if (cachedResponse) {
          console.log('[SW] Network failed, serving from cache');
          return cachedResponse;
        }
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// Layer 3: Background sync for offline queue
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-queue-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  try {
    // Send message to all clients to process offline queue
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
    }
  } catch (err) {
    console.error('[SW] Failed to process offline queue:', err);
  }
}

// Layer 3: Message handling for cache management
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            console.log('[SW] Clearing cache:', name);
            return caches.delete(name);
          })
        );
      })
    );
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAN_EXPIRED') {
    event.waitUntil(
      Promise.all([
        CacheManager.cleanExpired(RUNTIME_CACHE),
        CacheManager.cleanExpired(API_CACHE),
      ])
    );
  }
});

// Layer 3: Periodic cache cleanup (once per day)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
let lastCleanup = Date.now();

setInterval(() => {
  if (Date.now() - lastCleanup >= CLEANUP_INTERVAL) {
    CacheManager.cleanExpired(RUNTIME_CACHE);
    CacheManager.cleanExpired(API_CACHE);
    lastCleanup = Date.now();
    console.log('[SW] Periodic cache cleanup completed');
  }
}, 60 * 60 * 1000); // Check every hour
