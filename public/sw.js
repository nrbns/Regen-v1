/* eslint-env serviceworker */
/**
 * Service Worker for Game Hub Offline Support
 * Caches game assets for offline play
 */

const CACHE_NAME = 'game-hub-v1';
// const OFFLINE_GAMES = [
//   // Add game IDs that support offline play
//   // These will be precached when user visits the game hub
// ];

// Install event - cache game assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache game hub assets
      return cache.addAll([
        '/',
        '/games/index.html',
        // Add other critical assets
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache game assets and hub resources
  if (
    url.pathname.startsWith('/games/') ||
    url.pathname.startsWith('/api/games/') ||
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // If offline and no cache, return offline page
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
    );
  }
});

// Message handler for precaching games
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRECACHE_GAME') {
    const gameId = event.data.gameId;
    const gameUrl = event.data.gameUrl;

    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.add(gameUrl).then(() => {
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'GAME_PRECACHED',
                gameId,
              });
            });
          });
        });
      })
    );
  }
});

