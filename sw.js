/**
 * Common Sense Odisha (CSO) — Service Worker v9 (v260 Performance Optimization)
 * Lean App-Shell Precache + Stale-While-Revalidate for visited portal assets:
 *  - Slim core PRECACHE_URLS (10 core shell files only — zero Admin Studio bloat)
 *  - Dynamic Stale-While-Revalidate (SWR) caching for visited portal CSS/JS assets
 *  - Network-first with cache fallback for candidate-state GET APIs
 *  - Mutating requests and /admin/* routes are NEVER cached
 *  - Background `sync` event drains the IndexedDB mutation queue
 */

const CACHE_NAME = 'cso-candidate-cache-v293';
const EXPECTED_CACHES = [CACHE_NAME];

// Slim Core App-Shell Precache (fast SW install on slow 3G/4G connections)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/style.css',
  '/assets/css/cso-themes.css',
  '/assets/css/portal-shell.css',
  '/assets/app.js',
  '/assets/shared-header.js',
  '/assets/favicon.svg',
  '/manifest.webmanifest'
];

// Visited portal assets cached lazily on demand via Stale-While-Revalidate
const RUNTIME_SWR_ASSETS = [
  '/assets/css/jobs-portal.css',
  '/assets/js/jobs-portal.js',
  '/assets/css/careers-portal.css',
  '/assets/js/careers-portal.js',
  '/assets/css/schemes-portal.css',
  '/assets/js/schemes-portal.js',
  '/assets/css/study-portal.css',
  '/assets/js/study-portal.js',
  '/assets/css/community-portal.css',
  '/assets/js/community-portal.js',
  '/assets/css/about-portal.css',
  '/assets/js/about-portal.js'
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
          await deleteEntry(entry.id);
        }
      } catch (err) {
        break;
      }
    }
    db.close();
  } catch (err) {
    // No IDB in this SW scope — client-side drain is authoritative.
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'cso-sync') {
    event.waitUntil((async () => {
      try {
        const clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        clientList.forEach((client) => client.postMessage({ type: 'CSO_FLUSH_SYNC_QUEUE' }));
      } catch (err) {}
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

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin')) {
    return;
  }

  if (isMutatingRequest(request)) return;

  // Public & general /api/* endpoints must NEVER be served cache-first from SW Cache Storage.
  if (url.pathname.startsWith('/api/') && !isNetworkFirstApi(url)) {
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

  // 2. HTML Navigations: Network-First with short 1.5s timeout fallback to cache, then /offline.html.
  const acceptHeader = (request.headers && request.headers.get('accept')) || '';
  if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 1500) : null;
      try {
        const networkResponse = await fetch(request, controller ? { signal: controller.signal } : undefined);
        if (timer) clearTimeout(timer);
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        if (timer) clearTimeout(timer);
        const cachedPage = await cache.match(request);
        if (cachedPage) return cachedPage;
        const offlinePage = await cache.match('/offline.html');
        return offlinePage || Response.error();
      }
    })());
    return;
  }

  // 3. Static assets & visited portal assets: Stale-While-Revalidate (instant paint + background refresh).
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const isTrackedPortalAsset = RUNTIME_SWR_ASSETS.some(p => url.pathname === p);
    const networkFetch = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
      return networkResponse;
    }).catch(() => null);

    if (cached) {
      if (typeof event.waitUntil === 'function') event.waitUntil(networkFetch);
      return cached;
    }
    const fresh = await networkFetch;
    if (fresh) return fresh;
    if (isTrackedPortalAsset) return Response.error();
    return Response.error();
  })());
});
