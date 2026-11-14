/**
 * Common Sense Odisha (CSO) — Service Worker v8
 * Offline-first strategy:
 *  - App-shell precache (dashboard, styles, JS modules, manifest, login)
 *  - Network-first with cache fallback for candidate-state GET APIs
 *    (/api/candidate/bookmarks, /api/candidate/checklist, /api/sync,
 *    /api/auth/me) so saved syllabi and deadlines stay reviewable offline
 *  - Mutating requests are NEVER cached
 *  - Background `sync` event drains the IndexedDB mutation queue by
 *    messaging the dashboard clients (with a SW-side fallback drain)
 */

const CACHE_NAME = 'cso-candidate-cache-v25';
const EXPECTED_CACHES = [CACHE_NAME];

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/about/',
  '/about/index.html',
  '/student-dashboard/',
  '/student-dashboard/index.html',
  '/login.html',
  '/reset-password.html',
  '/jobs-careers/',
  '/jobs-careers/index.html',
  '/schemes-benefits/',
  '/schemes-benefits/index.html',
  '/study-library/',
  '/study-library/index.html',
  '/study-library/assets/dashboard.css',
  '/study-library/assets/dashboard.js',
  '/community/',
  '/community/index.html',
  '/assets/style.css',
  '/assets/css/public-content.css',
  '/assets/css/student-dashboard-bp.css',
  '/assets/favicon.svg',
  '/manifest.webmanifest',
  '/assets/shared-header.js',
  '/assets/js/cso-global-enhancements.js',
  '/assets/js/bookmark-manager.js',
  '/assets/js/cso-countdown.js',
  '/assets/js/cso-idb.js',
  '/assets/js/candidate-sync.js',
  '/assets/js/student-auth-guard.js',
  '/assets/js/student-dashboard.js',
  '/assets/js/pwa-install.js'
];

// Candidate-state GET APIs: network-first with cache fallback (offline reads).
const NETWORK_FIRST_API_ROUTES = [
  '/api/candidate/bookmarks',
  '/api/candidate/checklist',
  '/api/sync',
  '/api/auth/me'
];

function isNetworkFirstApi(url) {
  if (url.pathname.startsWith('/api/content/') || url.pathname.startsWith('/api/user/')) return true;
  return NETWORK_FIRST_API_ROUTES.some(route => url.pathname === route || url.pathname === route + '/');
}

function isMutatingRequest(request) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Some precache assets could not be fetched:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => !EXPECTED_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ---- IndexedDB queue drain fallback (runs in the SW global scope) ----
// The dashboard's candidate-sync.js is the primary drainer (it refreshes UI
// state); the SW performs its own silent drain as a safety net when no
// dashboard client is open.
async function swDrainSyncQueue() {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('CSO_LOCAL_DB', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const readQueue = () => new Promise((resolve, reject) => {
      const tx = db.transaction(['sync_queue'], 'readonly');
      const req = tx.objectStore('sync_queue').getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => (a.id || 0) - (b.id || 0)));
      req.onerror = () => reject(req.error);
    });

    const deleteEntry = (id) => new Promise((resolve, reject) => {
      const tx = db.transaction(['sync_queue'], 'readwrite');
      const req = tx.objectStore('sync_queue').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    let queue = await readQueue();
    for (const entry of queue) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;
      try {
        const res = await fetch(entry.url, {
          method: entry.method || 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: entry.body === undefined || entry.body === null
            ? undefined
            : (typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body))
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          await deleteEntry(entry.id); // success or permanent failure
        }
      } catch (err) {
        break; // still offline — keep the queue intact
      }
    }
    db.close();
  } catch (err) {
    // No IDB in this SW scope — the client-side drain is authoritative.
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'cso-sync') {
    event.waitUntil((async () => {
      // Ask every open dashboard client to drain (keeps UI state fresh).
      try {
        const clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        clientList.forEach((client) => client.postMessage({ type: 'CSO_FLUSH_SYNC_QUEUE' }));
      } catch (err) { /* fall through to the SW-side drain */ }
      await swDrainSyncQueue();
    })());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CSO_REQUEST_SYNC' && self.registration.sync) {
    self.registration.sync.register('cso-sync').catch(() => {});
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return; // mutations pass straight through (never cached)
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin')) {
    return;
  }

  // Mutating endpoints must never be cached even on GET quirks.
  if (isMutatingRequest(request)) {
    return;
  }

  // 1. Candidate-state APIs: network-first with cache fallback.
  if (isNetworkFirstApi(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(
          JSON.stringify({ success: false, error: 'Offline: cached copy unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // 2. Navigations: network-first, offline fallback to the dashboard shell.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cachedPage = await cache.match(request);
        if (cachedPage) return cachedPage;
        const shell = await cache.match('/student-dashboard/index.html');
        return shell || Response.error();
      }
    })());
    return;
  }

  // 3. Static assets & everything else: cache-first with network refresh.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (err) {
      return Response.error();
    }
  })());
});
