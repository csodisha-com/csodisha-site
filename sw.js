/**
 * Common Sense Odisha (CSO) — Service Worker v3
 * Provides offline caching for core platform shells, style assets, and candidate portal.
 */

const CACHE_NAME = 'cso-candidate-cache-v3';
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

  // HTML Navigation: Network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((matched) => {
            return matched || caches.match('/student-dashboard/index.html') || caches.match('/');
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images): Cache first with network fallback
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
  }
});
