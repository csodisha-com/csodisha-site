/**
 * Common Sense Odisha (CSO) — Service Worker v10 (v305 Zero-Flash Auth & Dashboard)
 * Lean App-Shell Precache + Stale-While-Revalidate for visited portal assets:
 *  - Slim core PRECACHE_URLS (10 core shell files only — zero Admin Studio or Auth HTML bloat)
 *  - Dynamic Stale-While-Revalidate (SWR) caching for visited public portal CSS/JS assets
 *  - Strict Network-Only (cache: 'no-store', zero Cache Storage reads/writes) for authenticated
 *    & auth HTML routes (/login, /signup, /reset-password, /student-dashboard, /candidate-hub,
 *    /saved, /admin) and /api/auth/* endpoints to prevent stale-page login flashes
 *  - Network-first with cache fallback for offline-capable candidate-state GET APIs
 *  - Mutating requests and /admin/* routes are NEVER cached
 *  - Background `sync` event drains the IndexedDB mutation queue
 */

const CACHE_NAME = 'cso-candidate-cache-v457';
const OFFLINE_STUDY_CACHE = 'cso-offline-study-packs-v1';
const EXPECTED_CACHES = [CACHE_NAME, OFFLINE_STUDY_CACHE];

// v440: Candidate Offline Toolkit Pre-Cache Manifest (low-connectivity Odisha districts)
const CANDIDATE_TOOLKIT_URLS = [
  '/tools/',
  '/careers/',
  '/exams/',
  '/results/',
  '/admissions/',
  '/mock-tests/',
  '/career-paths/',
  '/guides/',
  '/schemes/',
  '/current-affairs/',
  '/odisha-special/',
  '/assets/style.css?v=20261128v457',
  '/assets/css/cso-themes.css?v=20261128v457',
  '/assets/shared-header.js?v=20261128v457',
  '/assets/js/offline-toolkit-hub.js?v=20261128v457',
  '/assets/js/candidate-data-backup.js?v=20261128v457',
  '/assets/js/admissions-counselling-tracker.js?v=20261128v457',
  '/assets/js/pyq-vault-analyzer.js?v=20261128v457',
  '/assets/js/holiday-exam-logistics.js?v=20261128v457',
  '/assets/js/typing-skill-arena.js?v=20261128v457',
  '/assets/js/macp-progression-simulator.js?v=20261128v457',
  '/assets/js/pet-pst-standards-checker.js?v=20261128v457',
  '/assets/js/edistrict-service-walkthrough.js?v=20261128v457',
  '/assets/js/teacher-eligibility-checker.js?v=20261128v457',
  '/assets/js/income-tax-takehome-estimator.js?v=20261128v457',
  '/assets/js/tools-quick-jump-directory.js?v=20261128v457',
  '/assets/js/scholarship-aid-finder.js?v=20261128v457',
  '/assets/js/district-exam-center-planner.js?v=20261128v457',
  '/assets/js/study-packet-compiler.js?v=20261128v457',
  '/assets/js/multi-post-eligibility-matrix.js?v=20261128v457',
  '/assets/js/answer-key-normalizer.js?v=20261128v457',
  '/assets/js/retirement-corpus-calculator.js?v=20261128v457',
  '/assets/js/candidate-profile-sync-bar.js?v=20261128v457',
  '/assets/js/document-pack-validator.js?v=20261128v457',
  '/assets/js/district-reservation-roster.js?v=20261128v457',
  '/assets/js/weekly-digest-composer.js?v=20261128v457',
  '/assets/js/qr-flyer-generator.js?v=20261128v457',
  '/assets/js/pay-arrear-calculator.js?v=20261128v457',
  '/assets/js/gk-flashcard-deck.js?v=20261128v457',
  '/assets/js/negative-marking-simulator.js?v=20261128v457',
  '/assets/js/transfer-tada-calculator.js?v=20261128v457',
  '/assets/js/subscription-alert-hub.js?v=20261128v457',
  '/assets/js/syllabus-mastery-tracker.js?v=20261128v457',
  '/assets/js/employee-advance-gpf-calculator.js?v=20261128v457',
  '/assets/js/application-status-grievance-tracker.js?v=20261128v457',
  '/assets/js/jobs-workspace-tabs.js?v=20261128v457',
  '/assets/js/careers-roadmap-library.js?v=20261128v457',
  '/assets/js/orsp-salary-estimator.js?v=20261128v457',
  '/assets/js/photo-signature-resizer.js?v=20261128v457',
  '/assets/js/certificate-fee-matrix.js?v=20261128v457',
  '/assets/js/cgpa-percentage-converter.js?v=20261128v457',
  '/assets/js/exam-calendar-tracker.js?v=20261128v457',
  '/assets/js/results-cutoff-estimator.js?v=20261128v457',
  '/assets/js/service-rules-pension-guide.js?v=20261128v457',
  '/assets/js/study-streak-planner.js?v=20261128v457',
  '/assets/js/odisha-admin-directory.js?v=20261128v457',
  '/assets/js/odisha-special-workspace-tabs.js?v=20261128v457',
  '/assets/js/mock-tests-hub.js?v=20261128v457',
  '/assets/js/schemes-eligibility-finder.js?v=20261128v457',
  '/assets/js/current-affairs-hub.js?v=20261128v457',
  '/assets/js/ics-calendar-export.js?v=20261128v457',
  '/assets/js/saved-alerts-drawer.js?v=20261128v457',
  '/assets/js/candidate-watchlist.js?v=20261128v457',
  '/assets/js/odisha-district-filter.js?v=20261128v457'
];

// Authenticated, auth & account routes that must NEVER be served from or written to SW HTML cache.
const AUTH_NO_STORE_ROUTE_RE = /^\/(?:login(?:\.html)?|signup(?:\.html)?|reset-password(?:\.html)?|student-dashboard|candidate-hub|candidate|dashboard|portal|saved|admin)(?:\/|$)/i;

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
  '/assets/img/cso-logo-96.webp',
  '/assets/img/favicon-32x32.png',
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
  '/assets/js/about-portal.js',
  '/assets/css/guides-portal.css',
  '/assets/js/guides-portal.js'
];

// Candidate-state GET APIs: network-first with cache fallback (offline reads).
// /api/auth/* is intentionally excluded and strictly network-only to avoid stale session flashes.
const NETWORK_FIRST_API_ROUTES = [
  '/api/candidate/bookmarks',
  '/api/candidate/checklist',
  '/api/public/study/offline-pack',
  '/api/sync'
];

function isAuthNoStorePath(pathname) {
  return AUTH_NO_STORE_ROUTE_RE.test(String(pathname || ''));
}

function isNetworkFirstApi(url) {
  if (url.pathname.startsWith('/api/auth/')) return false;
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
  event.waitUntil((async () => {
    try {
      if (self.registration && self.registration.navigationPreload && typeof self.registration.navigationPreload.enable === 'function') {
        await self.registration.navigationPreload.enable();
      }
    } catch (_) {}

    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !EXPECTED_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
    } catch (_) {}

    try {
      const remainingKeys = await caches.keys();
      await Promise.all(remainingKeys.map(async (cacheKey) => {
        const cache = await caches.open(cacheKey);
        const cachedReqs = await cache.keys();
        await Promise.all(
          cachedReqs
            .filter((req) => {
              try {
                const p = new URL(req.url).pathname;
                return p.startsWith('/admin') || isAuthNoStorePath(p) || p.startsWith('/api/auth/');
              } catch (_) {
                return false;
              }
            })
            .map((req) => cache.delete(req))
        );
      }));
    } catch (_) {}

    await self.clients.claim();
  })());
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
  if (event.data && event.data.type === 'CSO_BUST_HOME_CACHE') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled([
          cache.delete('/'),
          cache.delete('/index.html'),
          cache.delete('/api/content/banner'),
          cache.delete('/api/public/home-feed'),
          cache.delete('/api/public/homepage-blocks'),
          cache.delete('/api/public/guides'),
          cache.delete('/guides/')
        ]);
      } catch (_) {}
    })());
  }
  if (event.data && event.data.type === 'SYNC_OFFLINE_STUDY_PACK') {
    event.waitUntil((async () => {
      try {
        const res = await fetch('/api/public/study/offline-pack', { cache: 'no-cache' });
        if (!res.ok) return;
        const manifest = await res.json();
        const urls = Array.isArray(manifest && manifest.cache_urls) ? manifest.cache_urls : [];
        if (!urls.length) return;
        const packCache = await caches.open(OFFLINE_STUDY_CACHE);
        await Promise.allSettled(urls.slice(0, 30).map((u) => packCache.add(u)));
      } catch (_) {}
    })());
  }
  if (event.data && event.data.type === 'CSO_PRECACHE_TOOLKIT') {
    event.waitUntil((async () => {
      const replyTarget = event.source;
      const total = CANDIDATE_TOOLKIT_URLS.length;
      let completed = 0;
      let cachedCount = 0;
      const availability = {};
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(CANDIDATE_TOOLKIT_URLS.map(async (u) => {
          try {
            const resp = await fetch(u, { cache: 'no-cache', credentials: 'same-origin' });
            if (resp && resp.ok) {
              await cache.put(u, resp.clone());
              availability[u] = true;
              cachedCount += 1;
            } else {
              availability[u] = false;
            }
          } catch (_) {
            availability[u] = false;
          } finally {
            completed += 1;
            if (replyTarget && typeof replyTarget.postMessage === 'function') {
              replyTarget.postMessage({
                type: 'CSO_PRECACHE_PROGRESS',
                completed,
                total,
                cachedCount,
                cacheName: CACHE_NAME
              });
            }
          }
        }));
      } catch (_) {}
      if (replyTarget && typeof replyTarget.postMessage === 'function') {
        replyTarget.postMessage({
          type: 'CSO_PRECACHE_COMPLETE',
          completed,
          total,
          cachedCount,
          availability,
          cacheName: CACHE_NAME,
          syncedAtIso: new Date().toISOString()
        });
      }
    })());
  }
  if (event.data && event.data.type === 'CSO_GET_TOOLKIT_STATUS') {
    event.waitUntil((async () => {
      const replyTarget = event.source;
      const availability = {};
      let cachedCount = 0;
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(CANDIDATE_TOOLKIT_URLS.map(async (u) => {
          const hit = await cache.match(u);
          const ok = Boolean(hit);
          availability[u] = ok;
          if (ok) cachedCount += 1;
        }));
      } catch (_) {}
      if (replyTarget && typeof replyTarget.postMessage === 'function') {
        replyTarget.postMessage({
          type: 'CSO_TOOLKIT_STATUS',
          total: CANDIDATE_TOOLKIT_URLS.length,
          cachedCount,
          availability,
          cacheName: CACHE_NAME
        });
      }
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Non-GET / mutating requests pass straight through to the browser network stack.
  if (request.method !== 'GET' || isMutatingRequest(request)) return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Strict Network-Only bypass: /admin*, /student-dashboard*, /api/auth/*, and non-offline /api* routes must NEVER touch SW Cache Storage.
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/student-dashboard') ||
    url.pathname.startsWith('/api/auth/') ||
    (url.pathname.startsWith('/api') && !isNetworkFirstApi(url))
  ) {
    return;
  }

  // Offline study pack PDFs & R2 /files/* assets: cache-first from offline pack, else network fetch
  if (/^\/files\//.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const packCache = await caches.open(OFFLINE_STUDY_CACHE);
        const cached = await packCache.match(request);
        if (cached) return cached;
      } catch (_) {
        // Failed cache lookup: fall through to network fetch
      }
      try {
        return await fetch(request);
      } catch (_) {
        return new Response('Offline: file not cached yet', { status: 503 });
      }
    })());
    return;
  }

  // Public & general /api/* endpoints must NEVER be served cache-first from SW Cache Storage.
  if (url.pathname.startsWith('/api/') && !isNetworkFirstApi(url)) {
    return;
  }

  // 1. Candidate-state APIs: network-first with safe cache fallback.
  if (isNetworkFirstApi(url)) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, networkResponse.clone()))
            .catch(() => {});
        }
        return networkResponse;
      } catch (_) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;
        } catch (_) {}
        return new Response(
          JSON.stringify({ success: false, error: 'Offline: cached copy unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // 2. HTML Navigations (request.mode === 'navigate' or text/html):
  //    - Auth & Candidate Dashboard routes: Strict Network-First with cache: 'no-store'
  //      and ZERO SW HTML caching (prevents stale pre-login or old-layout flashes).
  //    - Public HTML routes (v454): Consume event.preloadResponse first if available,
  //      falling back cleanly to fetch(request) and then cached HTML shell
  //      (caches.match(request, { ignoreSearch: true }) || caches.match('/index.html') || '/offline.html')
  //      inside a try/catch block so event.respondWith() NEVER rejects with an uncaught error.
  const acceptHeader = (request.headers && request.headers.get('accept')) || '';
  if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    if (isAuthNoStorePath(url.pathname)) {
      event.respondWith((async () => {
        try {
          return await fetch(request, { cache: 'no-store', credentials: 'same-origin' });
        } catch (_) {
          try {
            const offlinePage = await caches.match('/offline.html');
            if (offlinePage) return offlinePage;
            const indexPage = await caches.match('/index.html');
            if (indexPage) return indexPage;
          } catch (_) {}
          return new Response(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Connection Unavailable — Common Sense Odisha</title></head><body><h1>Connection temporarily unavailable</h1><p>Please reload to try again.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })());
      return;
    }

    event.respondWith((async () => {
      try {
        const preloaded = event.preloadResponse ? await event.preloadResponse : null;
        if (preloaded && preloaded.ok) {
          const ccPre = (preloaded.headers && preloaded.headers.get('cache-control')) || '';
          if (!/\b(no-store|private)\b/i.test(ccPre)) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, preloaded.clone()))
              .catch(() => {});
          }
          return preloaded;
        }
      } catch (_) {
        // Navigation preload failed or unavailable — fall through to live network fetch.
      }

      try {
        const networkResponse = await fetch(request);
        const cc = (networkResponse && networkResponse.headers && networkResponse.headers.get('cache-control')) || '';
        if (networkResponse && networkResponse.ok && !/\b(no-store|private)\b/i.test(cc)) {
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, networkResponse.clone()))
            .catch(() => {});
        }
        return networkResponse;
      } catch (_) {
        try {
          const cachedMatch =
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match(url.pathname, { ignoreSearch: true })) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/offline.html'));
          if (cachedMatch) return cachedMatch;
        } catch (_) {}
        return new Response(
          '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Offline — Common Sense Odisha</title></head><body><h1>Common Sense Odisha</h1><p>You appear to be offline. Please check your connection and reload.</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Never serve stale copies of auth/dashboard paths from SWR static cache.
  if (isAuthNoStorePath(url.pathname)) {
    return;
  }

  // 3. Static assets & visited portal assets: Stale-While-Revalidate (instant paint + background refresh).
  //    Failed cache lookups pass straight through to fetch(request).
  event.respondWith((async () => {
    let cache = null;
    let cached = null;
    try {
      cache = await caches.open(CACHE_NAME);
      cached = await cache.match(request);
    } catch (_) {
      try {
        return await fetch(request);
      } catch (_) {
        return Response.error();
      }
    }

    const isTrackedPortalAsset = RUNTIME_SWR_ASSETS.some(p => url.pathname === p);
    const networkFetch = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.ok && cache) {
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
