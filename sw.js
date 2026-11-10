/**
 * Common Sense Odisha (CSO) — Service Worker v7
 * Provides offline caching for core platform shells, style assets, and candidate portal.
 */

const CACHE_NAME = 'cso-candidate-cache-v7';
const EXPECTED_CACHES = [CACHE_NAME];

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/student-dashboard/',
  '/student-dashboard/index.html',
  '/jobs-careers/',
  '/jobs-careers/index.html',
  '/schemes-benefits/',
  '/schemes-benefits/index.html',
  '/study-library/',
  '/study-library/index.html',
  '/community/',
  '/community/index.html',
  '/assets/style.css',
  '/assets/css/student-dashboard-bp.css',
  '/assets/favicon.svg',
  '/assets/shared-header.js',
  '/assets/js/bookmark-manager.js',
  '/assets/js/auth-modal.js',
  '/assets/js/student-dashboard.js',
  '/admin/super-store.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Some precache assets could not be fetched:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!EXPECTED_CACHES.includes(name)) {
            console.log('Deleting outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Exclude admin mutations or external APIs from caching
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/cdn-cgi/')) {
    return;
  }

  // 1. Always fetch navigation/dashboard HTML fresh from the network
  if (request.mode === 'navigate' || url.pathname.includes('/student-dashboard')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Clone and update the cache with the fresh response
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Only fallback to cache if the device is completely offline
          return caches.match(request).then((matched) => {
            return matched || caches.match('/student-dashboard/index.html') || caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Default handler for static assets (images, fonts, stylesheets)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    })
  );
});
