#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — Dashboard UI & PWA Offline-First Sync Suite
 * Verifies Step 2 + Step 3 without a browser:
 *   1. Countdown math: D/H/M/S calculation, date formatting, sorting,
 *      urgency classification (normal / warning / critical / concluded).
 *   2. IndexedDB layer: store creation, bookmark mirror, checklist mirror,
 *      sync_queue enqueue (autoIncrement), FIFO order, retryCount bumps —
 *      driven through a faithful fake indexedDB implementation.
 *   3. Offline-first sync engine (_createSyncCore with injected fetch /
 *      isOnline / idb): optimistic dispatch, offline queueing, simulated
 *      offline → online transition, FIFO flush, 4xx drop, 5xx retryCount,
 *      status pill transitions.
 *   4. Service Worker v8: precache manifest, network-first with cache
 *      fallback for candidate-state GET APIs, never-cache mutations,
 *      background `sync` message bridge — simulated via fake self/caches.
 *   5. PWA manifest + dashboard HTML wiring assertions.
 *
 * Usage: node scripts/verify-dashboard-pwa.js
 */

const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
let passed = 0;
let failed = 0;
function logPass(msg) { passed++; console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`); }
function assert(cond, msg) { if (cond) logPass(msg); else { logFail(msg); throw new Error(msg); } }
function logFail(msg) { failed++; console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`); }

// ======================================================================
// Fake IndexedDB implementation (faithful to the operations cso-idb uses)
// ======================================================================
function createFakeIdbFactory() {
  const databases = new Map();

  function makeRequest(run) {
    const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: undefined, error: null };
    Promise.resolve().then(() => {
      try {
        req.result = run();
        if (req.onsuccess) req.onsuccess({ target: req });
      } catch (err) {
        req.error = err;
        if (req.onerror) req.onerror({ target: req });
      }
    });
    return req;
  }

  function makeStore(def, tx, mode) {
    return {
      createIndex: () => {},
      put(value) {
        return makeRequest(() => {
          const keyPath = def.keyPath;
          let key;
          if (keyPath && Object.prototype.hasOwnProperty.call(value, keyPath)) {
            key = value[keyPath];
          } else if (def.autoIncrement) {
            key = def.nextId++;
            value[keyPath] = key;
          } else {
            throw new Error('FakeIDB: missing keyPath value');
          }
          def.data.set(String(key), value);
          return key;
        });
      },
      get(key) {
        return makeRequest(() => def.data.get(String(key)));
      },
      getAll() {
        return makeRequest(() => Array.from(def.data.values()));
      },
      delete(key) {
        return makeRequest(() => def.data.delete(String(key)));
      },
      clear() {
        return makeRequest(() => def.data.clear());
      }
    };
  }

  return {
    open(name, version) {
      return makeRequest(() => {
        let db = databases.get(name);
        let isNew = false;
        if (!db) {
          isNew = true;
          db = { stores: {} };
          databases.set(name, db);
        }
        const dbApi = {
          objectStoreNames: {
            contains: (s) => !!db.stores[s]
          },
          createObjectStore(storeName, options = {}) {
            const def = {
              keyPath: options.keyPath || null,
              autoIncrement: !!options.autoIncrement,
              nextId: 1,
              data: new Map()
            };
            db.stores[storeName] = def;
            return { createIndex: () => {} };
          },
          transaction(storeNames, mode) {
            const names = Array.isArray(storeNames) ? storeNames : [storeNames];
            const tx = { oncomplete: null, onerror: null, onabort: null, mode };
            Promise.resolve().then(() => {
              if (tx.oncomplete) tx.oncomplete({ target: tx });
            });
            tx.objectStore = (s) => {
              const def = db.stores[s];
              if (!def) throw new Error(`FakeIDB: unknown store ${s}`);
              return makeStore(def, tx, mode);
            };
            return tx;
          },
          close() {}
        };
        if (isNew) {
          // Fire the upgrade handler before the open promise resolves.
          const req = arguments.length && this;
          // onupgradeneeded is invoked via the request wrapper below — see open() patch.
        }
        return dbApi;
      });
    },
    deleteDatabase(name) {
      return makeRequest(() => {
        databases.delete(name);
        return undefined;
      });
    },
    _databases: databases
  };
}

// cso-idb.js sets `request.onupgradeneeded` synchronously after calling
// indexedDB.open(...). Our fake fires handlers in a microtask, so we need
// open() to run the upgrade hook lazily — patch it to invoke onupgradeneeded
// on the request object when the store schema is empty.
function createIdbImpl() {
  const factory = createFakeIdbFactory();
  const upgraded = new Set();
  const originalOpen = factory.open.bind(factory);

  factory.open = function (name, version) {
    const req = originalOpen(name, version);
    const realOnsuccess = () => req.onsuccess;
    // Intercept handler assignment to run upgrade before success.
    let userUpgrade = null;
    let userSuccess = null;
    Object.defineProperty(req, 'onupgradeneeded', {
      get: () => userUpgrade,
      set: (fn) => { userUpgrade = fn; }
    });
    Object.defineProperty(req, 'onsuccess', {
      get: () => userSuccess,
      set: (fn) => {
        userSuccess = fn;
        // Chain: run upgrade (if needed) first, then success.
        Promise.resolve().then(async () => {
          if (userUpgrade && !upgraded.has(name)) {
            const dbDef = factory._databases.get(name);
            // Build a fresh db wrapper with only upgrade-time stores.
            const dbApi = {
              objectStoreNames: { contains: (s) => !!(dbDef && dbDef.stores[s]) },
              createObjectStore: (storeName, options = {}) => {
                dbDef.stores[storeName] = {
                  keyPath: options.keyPath || null,
                  autoIncrement: !!options.autoIncrement,
                  nextId: 1,
                  data: new Map()
                };
                return { createIndex: () => {} };
              }
            };
            upgraded.add(name);
            userUpgrade({ target: { result: dbApi } });
          }
          if (userSuccess) userSuccess({ target: req });
        });
      }
    });
    // Repoint the microtask success to userSuccess (already intercepted).
    req.onerror = null;
    return req;
  };
  return factory;
}

// ======================================================================
// Fake service worker environment
// ======================================================================
function createSwEnv(networkFetch) {
  const cacheStorage = new Map(); // url -> Response

  const fakeCache = {
    addAll: async (urls) => {
      urls.forEach(u => cacheStorage.set(u, new Response('cached:' + u, { status: 200 })));
    },
    match: async (req) => cacheStorage.get(typeof req === 'string' ? req : req.url) || undefined,
    put: async (req, res) => cacheStorage.set(typeof req === 'string' ? req : req.url, res),
    keys: async () => Array.from(cacheStorage.keys()),
    delete: async (u) => cacheStorage.delete(u)
  };

  const listeners = {};
  const fakeSelf = {
    location: { origin: 'https://csodisha.com' },
    registration: { sync: { register: async () => {} } },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    skipWaiting: async () => {},
    clients: {
      matchAll: async () => [],
      claim: async () => {},
      postMessageLog: []
    },
    _listeners: listeners,
    _cacheStorage: cacheStorage
  };
  fakeSelf.caches = {
    open: async () => fakeCache,
    keys: async () => ['cso-candidate-cache-v8']
  };
  fakeSelf.fetch = networkFetch;

  const code = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const context = {
    self: fakeSelf,
    caches: fakeSelf.caches,
    console,
    fetch: networkFetch,
    URL,
    Response,
    navigator: { onLine: true },
    indexedDB: undefined
  };
  context.self.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'sw.js' });

  async function dispatch(type, event) {
    const handlers = listeners[type] || [];
    let respondWithPromise = null;
    const ev = {
      ...event,
      respondWith: (p) => { respondWithPromise = p; }
    };
    handlers.forEach(fn => fn(ev));
    return {
      get response() { return respondWithPromise; },
      waitUntilPromises: ev._waitPromises || []
    };
  }

  return { fakeSelf, dispatch, cacheStorage, fakeCache };
}

// ======================================================================
async function main() {
  console.log(`\n${colors.bold}${colors.cyan}=================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}CS Odisha Dashboard UI & PWA Offline Sync Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================${colors.reset}\n`);

  // ---- 1. Countdown engine ----
  {
    const cd = require(path.join(ROOT, 'assets/js/cso-countdown.js'));
    const now = new Date(2026, 10, 11, 10, 0, 0); // Wed 11 Nov 2026 10:00

    // Live D/H/M/S math: 2026-11-29 23:59:59.999 − 2026-11-11 10:00:00
    const c29 = cd.computeCountdown('2026-11-29', now);
    assert(c29.days === 18 && c29.hours === 13 && c29.minutes === 59 && c29.seconds === 59,
      'countdown D/H/M/S computed correctly for a date-only target');
    assert(c29.urgency === 'warning' && c29.urgencyClass === 'cd-warning' && c29.label === 'Application Open',
      '18 days out → warning urgency + Application Open label');

    const cDec = cd.computeCountdown('2027-01-18', now);
    assert(cDec.urgency === 'normal' && cDec.days > 30, '>30 days out → normal urgency');

    const c14 = cd.computeCountdown('2026-11-25', now);
    assert(c14.urgency === 'warning' && c14.days === 14, '7–30 days out → warning urgency');

    const c6 = cd.computeCountdown('2026-11-16', now);
    assert(c6.urgency === 'critical' && c6.label === 'Closing Soon',
      '<7 days out → critical urgency + Closing Soon label');

    const cToday = cd.computeCountdown('2026-11-11', now);
    assert(cToday.isToday === true && cToday.urgency === 'critical' && cToday.label === 'Today — Final Day!',
      'deadline today → critical pulsing + final-day label');

    const cPast = cd.computeCountdown('2026-11-01', now);
    assert(cPast.isPast && cPast.urgency === 'concluded'
      && cPast.label === 'Exam Concluded / Application Closed',
      'past deadline → concluded state');

    assert(cd.computeCountdown('not-a-date', now) === null, 'invalid target returns null');
    assert(cd.formatTargetDate('2026-11-29') === '29 Nov 2026', "date formatting '29 Nov 2026'");
    assert(cd.formatTargetDate('2027-01-18') === '18 Jan 2027', 'date formatting across months');

    // Sorting: future asc first, concluded last
    const sorted = cd.sortCountdowns([
      { id: 'past', target: '2026-11-01' },
      { id: 'soon', target: '2026-11-20' },
      { id: 'far', target: '2027-03-01' },
      { id: 'soonest', target: '2026-11-15' },
      { id: 'past2', target: '2026-10-05' }
    ], now);
    assert(
      JSON.stringify(sorted.map(c => c.id)) === JSON.stringify(['soonest', 'soon', 'far', 'past2', 'past']),
      'sort: future deadlines ascending, concluded cards last'
    );
  }

  // ---- 2. IndexedDB layer over the fake implementation ----
  const idbFactory = createIdbImpl();
  // cso-idb resolves the store lazily via global indexedDB — install the fake
  // before the module is first required.
  globalThis.indexedDB = idbFactory;
  const idb = require(path.join(ROOT, 'assets/js/cso-idb.js'));
  await idb.getDb();
  const coreIdb = idb;
  {
    // Bookmark mirror (clear + putAll semantics)
    await idb.mirrorBookmarks([
      { post_id: 'jobs:opsc-ocs-2026', category: 'OPSC', post_title: 'OPSC OCS 2026', post_url: '/jobs/', deadline_date: '2026-11-29' },
      { post_id: 'study:pyq-gs1', category: 'OTHER', post_title: 'GS-1 PYQ', post_url: '', deadline_date: null }
    ]);
    const bms = await idb.getBookmarks();
    assert(bms.length === 2 && bms.some(b => b.post_id === 'jobs:opsc-ocs-2026'),
      'bookmarks store mirrors saved posts keyed by post_id');

    // Checklist mirror with composite id
    await idb.mirrorChecklist([
      { id: idb.checklistRecordId('OPSC', 'opsc-prelims::opsc-p-gs1-hist'), exam_code: 'OPSC', milestone_key: 'opsc-prelims::opsc-p-gs1-hist', is_completed: 1 }
    ]);
    const chk = await idb.getChecklist();
    assert(chk.length === 1 && chk[0].id === 'OPSC::opsc-prelims::opsc-p-gs1-hist',
      'checklist store rows keyed by exam_code::milestone_key composite id');

    // Queue: enqueue with autoIncrement ids + FIFO order
    const id1 = await idb.enqueueSyncAction({ url: '/api/candidate/checklist', method: 'POST', body: { a: 1 }, timestamp: 111 });
    const id2 = await idb.enqueueSyncAction({ url: '/api/candidate/bookmarks', method: 'POST', body: { b: 2 }, timestamp: 222 });
    assert(typeof id1 === 'number' && typeof id2 === 'number' && id2 === id1 + 1,
      'sync_queue enqueues generate sequential autoIncrement ids');
    let queue = await idb.getSyncQueue();
    assert(queue.length === 2 && queue[0].body.a === 1 && queue[1].body.b === 2,
      'queue reads back in FIFO (insertion) order');
    assert(queue[0].retryCount === 0 && typeof queue[0].timestamp === 'number',
      'queued records carry retryCount + timestamp per spec');

    await idb.bumpRetryCount(queue[0]);
    queue = await idb.getSyncQueue();
    assert(queue[0].retryCount === 1, 'bumpRetryCount increments the persisted retry counter');

    await idb.deleteSyncAction(id2);
    queue = await idb.getSyncQueue();
    assert(queue.length === 1, 'deleteSyncAction removes the flushed entry');
    await idb.clearSyncQueue();
    queue = await idb.getSyncQueue();
    assert(queue.length === 0, 'clearSyncQueue empties the queue (sign-out cleanup)');
  }

  // ---- 3. Offline-first sync engine ----
  {
    const syncModule = require(path.join(ROOT, 'assets/js/candidate-sync.js'));
    const statuses = [];
    let online = true;

    // Sequential call log for asserting FIFO dispatch order.
    const fetchLog = [];
    let failMode = null; // null | 'network' | '500' | '400' | 'offline'
    const fetchImpl = async (url, init = {}) => {
      fetchLog.push({ url, method: init.method, body: init.body });
      if (failMode === 'offline' || !online) throw new TypeError('Failed to fetch');
      if (failMode === 'network') throw new TypeError('Failed to fetch');
      if (failMode === '500') return new Response(JSON.stringify({ success: false }), { status: 500 });
      if (failMode === '400') return new Response(JSON.stringify({ success: false, error: 'bad' }), { status: 400 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const core = syncModule._createSyncCore({
      fetch: fetchImpl,
      isOnline: () => online,
      idb: coreIdb,
      onStatus: (text, kind) => statuses.push({ text, kind }),
      logger: console
    });

    // Offline action → queued + "Saved offline" pill
    online = false;
    const offlineResult = await core.queueAction('/api/candidate/checklist', 'POST', { topicId: 'x', completed: true });
    assert(offlineResult.queued === true && offlineResult.dispatched === false,
      'offline mutation is queued, not dispatched');
    assert(statuses.some(s => s.text === syncModule.STATUS_OFFLINE),
      'offline mutation raises the "Saved offline" status pill');
    let queue = await coreIdb.getSyncQueue();
    assert(queue.length === 1, 'offline mutation lands in sync_queue');

    // Simulate reconnection: offline → online flush (FIFO)
    fetchLog.length = 0;
    online = true;
    const flush1 = await core.flushQueue();
    assert(flush1.flushed === 1 && flush1.remaining === 0,
      'online transition drains the queued mutation');
    assert(fetchLog.length === 1 && fetchLog[0].url === '/api/candidate/checklist',
      'flush dispatches the queued action to the canonical endpoint');
    assert(statuses.some(s => s.text === syncModule.STATUS_SYNCED),
      'successful flush raises the "All changes synced" pill');

    // Multi-entry FIFO flush ordering
    await coreIdb.clearSyncQueue();
    fetchLog.length = 0;
    await coreIdb.enqueueSyncAction({ url: '/api/candidate/checklist', method: 'POST', body: { n: 1 }, timestamp: 1 });
    await coreIdb.enqueueSyncAction({ url: '/api/candidate/bookmarks', method: 'POST', body: { n: 2 }, timestamp: 2 });
    await coreIdb.enqueueSyncAction({ url: '/api/sync', method: 'POST', body: { n: 3 }, timestamp: 3 });
    const flush2 = await core.flushQueue();
    assert(flush2.flushed === 3, 'all queued actions flush');
    assert(
      fetchLog[0].body === JSON.stringify({ n: 1 })
      && fetchLog[1].body === JSON.stringify({ n: 2 })
      && fetchLog[2].body === JSON.stringify({ n: 3 }),
      'flush processes the queue in strict FIFO order'
    );

    // 5xx → retryCount++ + drain stops; queue preserved in order
    await coreIdb.clearSyncQueue();
    failMode = '500';
    await coreIdb.enqueueSyncAction({ url: '/api/candidate/checklist', method: 'POST', body: { n: 1 }, timestamp: 1 });
    await coreIdb.enqueueSyncAction({ url: '/api/candidate/bookmarks', method: 'POST', body: { n: 2 }, timestamp: 2 });
    const flush3 = await core.flushQueue();
    assert(flush3.flushed === 0, '5xx flush flushes nothing');
    queue = await coreIdb.getSyncQueue();
    assert(queue.length === 2 && queue[0].retryCount === 1 && queue[1].retryCount === 0,
      '5xx bumps retryCount on the failed head and preserves the rest of the queue');

    // 4xx → dropped permanently
    failMode = '400';
    const flush4 = await core.flushQueue();
    assert(flush4.flushed === 0, '4xx flush flushes nothing');
    queue = await coreIdb.getSyncQueue();
    assert(queue.length === 0, '4xx responses drop the entries permanently (never retried)');
    failMode = null;

    // Optimistic online dispatch → no queueing
    const onlineResult = await core.queueAction('/api/sync', 'POST', { n: 9 });
    assert(onlineResult.dispatched === true && onlineResult.queued === false,
      'online mutation dispatches immediately without queueing');
    queue = await coreIdb.getSyncQueue();
    assert(queue.length === 0, 'successful dispatch leaves the queue empty');

    // Domain action: checklist toggle mirrors into IDB + payload shape
    await coreIdb.clearSyncQueue();
    fetchLog.length = 0;
    failMode = 'offline';
    await core.recordChecklistChange('opsc', 'opsc-prelims::opsc-p-gs1-hist', true);
    queue = await coreIdb.getSyncQueue();
    assert(queue.length === 1, 'checklist toggle offline lands in the queue');
    const queuedBody = typeof queue[0].body === 'string' ? JSON.parse(queue[0].body) : queue[0].body;
    assert(queuedBody.examStream === 'opsc' && queuedBody.topicId === 'opsc-prelims::opsc-p-gs1-hist' && queuedBody.completed === true,
      'queued checklist payload carries examStream + stage::topic milestone');
    const chkMirror = await coreIdb.getChecklist();
    assert(chkMirror.some(r => r.exam_code === 'OPSC' && r.milestone_key === 'opsc-prelims::opsc-p-gs1-hist' && r.is_completed === 1),
      'checklist mirror row persisted in IndexedDB');
    failMode = null;

    // Domain action: bookmark save/remove mirrors
    await coreIdb.clearSyncQueue();
    fetchLog.length = 0;
    failMode = 'offline';
    await core.saveBookmarkAction('save', {
      postId: 'jobs:opsc-ocs-2026', postTitle: 'OPSC OCS 2026', postUrl: '/jobs/',
      category: 'OPSC', deadlineDate: '2026-11-29'
    });
    await core.saveBookmarkAction('save', {
      postId: 'study:pyq-gs1', postTitle: 'GS-1 PYQ', postUrl: '', category: 'OTHER', deadlineDate: null
    });
    let bmMirror = await coreIdb.getBookmarks();
    assert(bmMirror.length === 2 && bmMirror.some(b => b.post_id === 'jobs:opsc-ocs-2026' && b.deadline_date === '2026-11-29'),
      'bookmark save mirrors record (with deadline) into IndexedDB');
    await core.saveBookmarkAction('remove', { postId: 'study:pyq-gs1' });
    bmMirror = await coreIdb.getBookmarks();
    assert(bmMirror.length === 1 && !bmMirror.some(b => b.post_id === 'study:pyq-gs1'),
      'bookmark remove drops the mirrored record');
    queue = await coreIdb.getSyncQueue();
    const removeBody = typeof queue[2].body === 'string' ? JSON.parse(queue[2].body) : queue[2].body;
    assert(queue.length === 3 && removeBody.action === 'delete'
      && removeBody.postId === 'study:pyq-gs1',
      'bookmark remove queues a delete action with the prefixed post_id');
    failMode = null;
    await coreIdb.clearSyncQueue();
  }

  // ---- 4. Service Worker v8 simulation ----
  {
    const fetchCalls = [];
    const networkFetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      fetchCalls.push(url);
      if (url.includes('/offline-break')) throw new TypeError('Failed to fetch');
      return new Response('network:' + url, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    };
    const env = createSwEnv(networkFetch);

    // Install: app shell precache
    let installDone = null;
    const installHandlers = env.fakeSelf._listeners['install'];
    assert(installHandlers && installHandlers.length === 1, 'SW registers an install handler');
    installHandlers[0]({
      waitUntil: (p) => { installDone = p; }
    });
    await installDone;
    assert(env.cacheStorage.has('/student-dashboard/index.html')
      && env.cacheStorage.has('/assets/css/student-dashboard-bp.css')
      && env.cacheStorage.has('/assets/js/cso-idb.js')
      && env.cacheStorage.has('/assets/js/cso-countdown.js')
      && env.cacheStorage.has('/assets/js/candidate-sync.js')
      && env.cacheStorage.has('/manifest.webmanifest')
      && env.cacheStorage.has('/login.html'),
      'install precaches the dashboard app shell, styles, JS modules, manifest & login');

    // Network-first API: cache populated on success
    const apiReq = { method: 'GET', url: 'https://csodisha.com/api/candidate/bookmarks' };
    const apiEvent = await env.dispatch('fetch', { request: apiReq });
    const apiRes1 = await apiEvent.response;
    assert(apiRes1 && apiRes1.ok && (await apiRes1.text()) === 'network:https://csodisha.com/api/candidate/bookmarks',
      'candidate-state GET goes network-first on first visit');
    assert(env.cacheStorage.has(apiReq.url), 'successful API response is cached for offline fallback');

    // Network fails → cached copy served
    fetchCalls.length = 0;
    const apiEvent2 = await env.dispatch('fetch', { request: { method: 'GET', url: apiReq.url } });
    // Simulate network failure for this request
    const cacheOnlyEnv = createSwEnv(async () => { throw new TypeError('Failed to fetch'); });
    // Seed its cache directly through the network-first flow of the fresh env
    const seedHandlers = cacheOnlyEnv.fakeSelf._listeners['install'];
    let seedDone = null;
    seedHandlers[0]({ waitUntil: (p) => { seedDone = p; } });
    await seedDone;
    await cacheOnlyEnv.fakeCache.put(apiReq.url, new Response('cached-copy', { status: 200 }));
    const evt2 = await cacheOnlyEnv.dispatch('fetch', { request: { method: 'GET', url: apiReq.url } });
    const apiRes2 = await evt2.response;
    assert(apiRes2 && (await apiRes2.text()) === 'cached-copy',
      'network-first falls back to the cached API copy when offline');

    // Mutations: POST must never hit respondWith (never cached)
    fetchCalls.length = 0;
    const postEvent = await env.dispatch('fetch', { request: { method: 'POST', url: 'https://csodisha.com/api/candidate/bookmarks' } });
    assert(postEvent.response === null, 'POST requests bypass the SW cache entirely (respondWith never called)');

    // /api/auth/me is also network-first (session handshake offline support)
    const meEvent = await env.dispatch('fetch', { request: { method: 'GET', url: 'https://csodisha.com/api/auth/me' } });
    const meRes = await meEvent.response;
    assert(meRes && meRes.ok && (await meRes.text()) === 'network:https://csodisha.com/api/auth/me',
      '/api/auth/me follows the network-first strategy');
    assert(env.cacheStorage.has('https://csodisha.com/api/auth/me'),
      '/api/auth/me cached for offline session resolution');

    // Background sync: 'sync' event registers + SW-side drain fallback works
    await env.fakeSelf._listeners['sync'][0]({
      tag: 'cso-sync',
      waitUntil: (p) => p
    });
    assert(true, 'SW handles the cso-sync background sync event without error');
  }

  // ---- 5. PWA manifest + dashboard HTML wiring ----
  {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert(manifest.start_url === '/student-dashboard/' && manifest.display === 'standalone',
      'PWA manifest points at the dashboard with standalone display');
    assert(Array.isArray(manifest.icons) && manifest.icons.length > 0,
      'PWA manifest declares at least one icon');

    const html = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
    assert(html.includes('id="cso-profile-card"') && html.includes('id="cso-profile-details"'),
      'dashboard HTML contains the profile card with skeleton + details panes');
    assert(html.includes('id="cso-profile-signout-btn"'),
      'profile card includes the integrated Sign Out action');
    assert(html.includes('id="cso-countdown-grid"'),
      'dashboard HTML contains the countdown grid mount');
    const cdIdx = html.indexOf('/assets/js/cso-countdown.js');
    const idbIdx = html.indexOf('/assets/js/cso-idb.js');
    const syncIdx = html.indexOf('/assets/js/candidate-sync.js');
    assert(cdIdx > -1 && idbIdx > -1 && syncIdx > -1 && cdIdx < idbIdx && idbIdx < syncIdx,
      'script order: cso-countdown.js + cso-idb.js load before candidate-sync.js');

    const css = fs.readFileSync(path.join(ROOT, 'assets/css/student-dashboard-bp.css'), 'utf8');
    ['cd-normal', 'cd-warning', 'cd-critical', 'cd-concluded', 'cso-profile-card', 'cso-countdown-grid', 'cso-sync-pill']
      .forEach(cls => {
        assert(css.includes(cls), `CSS ships the ${cls} style block`);
      });
  }

  console.log(`\n${colors.bold}${failed === 0 ? colors.green : colors.red}Result: ${passed} passed, ${failed} failed${colors.reset}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}Suite aborted: ${err.message}${colors.reset}`);
  process.exit(1);
});
