#!/usr/bin/env node
/**
 * Regression & Runtime Simulation Suite — v454 Service Worker Navigation Stability
 * Verifies:
 *  1. sw.js activate enables navigationPreload, deletes stale caches, and calls clients.claim().
 *  2. sw.js navigate fetch handler awaits event.preloadResponse first, falls back to fetch(request),
 *     and falls back safely to caches.match(request, { ignoreSearch: true }) || /index.html || /offline.html
 *     || clean 503 HTML without ever rejecting or aborting navigations prematurely.
 *  3. Cross-origin requests, /api/*, and /admin/* bypass SW interception cleanly without throwing.
 *  4. Client-side SW scripts (pwa-install.js, app.js, shared-header.js) never auto-reload on
 *     controllerchange during initial page load.
 *  5. sw.js & functions/_lib/ops-sentinel.js are synced to cso-candidate-cache-v454.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const swCode = read('sw.js');
const opsCode = read('functions/_lib/ops-sentinel.js');
const pwaInstallCode = read('assets/js/pwa-install.js');
const appCode = read('assets/app.js');
const sharedHeaderCode = read('assets/shared-header.js');

// 1. Static cache version & contract checks
assert.match(swCode, /const CACHE_NAME = 'cso-candidate-cache-v454';/, 'sw.js CACHE_NAME must be cso-candidate-cache-v454');
assert.match(opsCode, /ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v454'/, 'ops-sentinel.js must match cso-candidate-cache-v454');
assert.ok(swCode.includes('self.registration.navigationPreload'), 'sw.js must check self.registration.navigationPreload');
assert.ok(swCode.includes('navigationPreload.enable()'), 'sw.js must enable navigationPreload on activate');
assert.ok(swCode.includes('event.preloadResponse'), 'sw.js must consume event.preloadResponse on navigate');
assert.ok(swCode.includes('ignoreSearch: true'), 'sw.js must use caches.match(..., { ignoreSearch: true }) fallback');
assert.ok(!/setTimeout\(\(\)\s*=>\s*controller\.abort\(\),\s*1500\)/.test(swCode), 'sw.js must not abort live navigations at 1500ms');

// 2. Runtime SW sandbox simulation
function createSwHarness({ fetchImpl, cachedMap }) {
  const listeners = {};
  const deletedCaches = [];
  let preloadEnabled = false;
  let claimed = false;

  const store = new Map(cachedMap || []);
  const mockCache = {
    async match(req, opts) {
      const raw = typeof req === 'string' ? req : req.url;
      if (store.has(raw)) return store.get(raw).clone();
      if (opts && opts.ignoreSearch) {
        const clean = raw.split('?')[0];
        if (store.has(clean)) return store.get(clean).clone();
        try {
          const p = new URL(clean, 'https://csodisha.com').pathname;
          if (store.has(p)) return store.get(p).clone();
        } catch (_) {}
      }
      return null;
    },
    async put(req, res) {
      const k = typeof req === 'string' ? req : req.url;
      store.set(k, res);
    },
    async keys() { return []; },
    async delete() { return true; },
    async addAll() {}
  };

  const sandbox = {
    self: {
      location: { origin: 'https://csodisha.com' },
      registration: {
        navigationPreload: {
          async enable() { preloadEnabled = true; }
        }
      },
      addEventListener(type, fn) {
        (listeners[type] ||= []).push(fn);
      },
      skipWaiting: async () => {},
      clients: {
        async claim() { claimed = true; },
        async matchAll() { return []; }
      }
    },
    caches: {
      async open() { return mockCache; },
      async match(req, opts) { return mockCache.match(req, opts); },
      async keys() { return ['cso-candidate-cache-v453', 'cso-candidate-cache-v454']; },
      async delete(k) { deletedCaches.push(k); return true; }
    },
    fetch: fetchImpl,
    URL,
    Request,
    Response,
    Headers,
    setTimeout,
    clearTimeout,
    console
  };

  vm.runInNewContext(swCode, sandbox);
  return {
    listeners,
    store,
    getState: () => ({ preloadEnabled, claimed, deletedCaches })
  };
}

// 2a. Activate enables navigationPreload, removes stale caches, and calls clients.claim()
{
  const h = createSwHarness({ fetchImpl: async () => new Response('ok') });
  let waitPromise = null;
  h.listeners.activate[0]({ waitUntil(p) { waitPromise = p; } });
  await waitPromise;
  const st = h.getState();
  assert.equal(st.preloadEnabled, true, 'activate must enable navigationPreload');
  assert.equal(st.claimed, true, 'activate must call self.clients.claim()');
  assert.deepEqual(st.deletedCaches, ['cso-candidate-cache-v453'], 'activate must delete stale SW caches');
}

// 2b. Navigate consumes event.preloadResponse first without calling fetch()
{
  let fetchCalled = false;
  const h = createSwHarness({
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response('network', { status: 200 });
    }
  });
  let responded = null;
  h.listeners.fetch[0]({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://csodisha.com/jobs/',
      headers: new Headers({ accept: 'text/html' })
    },
    preloadResponse: Promise.resolve(new Response('<h1>PRELOADED JOBS</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })),
    respondWith(p) { responded = p; },
    waitUntil() {}
  });
  const res = await responded;
  assert.equal(res.status, 200);
  assert.match(await res.text(), /PRELOADED JOBS/, 'navigate must serve event.preloadResponse first');
  assert.equal(fetchCalled, false, 'navigate must not re-fetch when preloadResponse succeeded');
}

// 2c. Navigate offline fallback matches query-stripped URL first, then /index.html, and NEVER rejects
{
  const h = createSwHarness({
    fetchImpl: async () => { throw new TypeError('Failed to fetch'); },
    cachedMap: [
      ['https://csodisha.com/jobs/', new Response('<h1>CACHED JOBS SHELL</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
      ['/index.html', new Response('<h1>CACHED INDEX SHELL</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })]
    ]
  });

  // Query-stripped match on /jobs/?sector=odisha
  let resp1 = null;
  h.listeners.fetch[0]({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://csodisha.com/jobs/?sector=odisha',
      headers: new Headers({ accept: 'text/html' })
    },
    preloadResponse: Promise.reject(new Error('preload aborted')),
    respondWith(p) { resp1 = p; },
    waitUntil() {}
  });
  const r1 = await resp1;
  assert.equal(r1.status, 200);
  assert.match(await r1.text(), /CACHED JOBS SHELL/, 'Offline navigate must match cached page via ignoreSearch: true');

  // Uncached route falls back cleanly to /index.html
  let resp2 = null;
  h.listeners.fetch[0]({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://csodisha.com/careers/',
      headers: new Headers({ accept: 'text/html' })
    },
    respondWith(p) { resp2 = p; },
    waitUntil() {}
  });
  const r2 = await resp2;
  assert.equal(r2.status, 200);
  assert.match(await r2.text(), /CACHED INDEX SHELL/, 'Uncached offline navigate must fall back to /index.html');
}

// 2d. Empty cache + offline network still returns clean 503 HTML instead of rejecting
{
  const h = createSwHarness({
    fetchImpl: async () => { throw new TypeError('Network down'); },
    cachedMap: []
  });
  let resp = null;
  h.listeners.fetch[0]({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://csodisha.com/careers/',
      headers: new Headers({ accept: 'text/html' })
    },
    respondWith(p) { resp = p; },
    waitUntil() {}
  });
  const r = await resp;
  assert.equal(r.status, 503, 'Total offline miss must resolve cleanly to 503 HTML fallback (never throw)');
  assert.match(r.headers.get('content-type') || '', /text\/html/);
}

// 2e. Cross-origin, /api/*, and /admin/* bypass SW interception completely
{
  const h = createSwHarness({ fetchImpl: async () => new Response('ok') });
  for (const bypassUrl of [
    'https://example.org/script.js',
    'https://csodisha.com/api/public/jobs/bootstrap',
    'https://csodisha.com/api/auth/me',
    'https://csodisha.com/admin/'
  ]) {
    let intercepted = false;
    h.listeners.fetch[0]({
      request: {
        method: 'GET',
        mode: 'navigate',
        url: bypassUrl,
        headers: new Headers({ accept: 'text/html' })
      },
      respondWith() { intercepted = true; },
      waitUntil() {}
    });
    assert.equal(intercepted, false, `SW must bypass ${bypassUrl} without intercepting`);
  }
}

// 3. Client-side SW registration must NEVER auto-reload on controllerchange during initial load
assert.ok(pwaInstallCode.includes('userRequestedSwReload'), 'pwa-install.js must gate controllerchange reload behind explicit user update click');
assert.doesNotMatch(appCode, /controllerchange[\s\S]{0,160}location\.reload/, 'assets/app.js must not auto-reload on controllerchange');
assert.doesNotMatch(sharedHeaderCode, /controllerchange[\s\S]{0,160}location\.reload/, 'assets/shared-header.js must not auto-reload on controllerchange');

console.log('PASS: v454 Service Worker navigation stability, navigationPreload, offline fallback & controllerchange guard passed.');
