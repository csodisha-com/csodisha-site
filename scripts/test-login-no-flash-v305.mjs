#!/usr/bin/env node
/**
 * v305 Zero-Flash Candidate Login, Service Worker No-Store & Pre-Hydration Verification Suite
 *
 * Verifies:
 *  1. sw.js enforces Network-Only (cache: 'no-store', zero Cache Storage reads/writes) on
 *     authenticated & auth HTML navigations (/login, /signup, /reset-password, /student-dashboard,
 *     /candidate-hub, /saved, /admin) and /api/auth/* endpoints, plus skipWaiting() & clients.claim().
 *  2. Runtime SW fetch simulation proves /student-dashboard/ and /login.html never serve stale
 *     cached HTML and never cache.put() auth pages into Cache Storage.
 *  3. _worker.js, _headers, and functions/api/auth/_utils.js enforce Cache-Control: no-store, private
 *     on auth and Candidate Hub HTML/API responses.
 *  4. student-dashboard/index.html, student-auth-guard.js, student-dashboard.js, and
 *     candidate-hub-v244.css hide #cso-workspace-empty during hydration, paint canonical
 *     #cso-workspace-skeleton & #bp-sidebar-skeleton, parallelize D1 hydration fetches, and sync
 *     canonical 4-theme attributes without legacy alabaster-cobalt/csoStudentTheme flashes.
 *  5. login.js, signup.js, and shared-header.js normalize alias redirects (/candidate-hub/ ->
 *     /student-dashboard/) for a single-hop window.location.replace() with cache eviction, and
 *     header logout clears cso_candidate_profile cleanly.
 *  6. Strict CSP compliance & v305 cache busting across sw.js, ops-sentinel.js, ssr-shell.js,
 *     and all affected HTML pages.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v305 Zero-Flash Candidate Login & Dashboard Hydration Verification ===\n');

await check('1. sw.js enforces Network-Only (no-store) on auth/dashboard routes & /api/auth/*, plus skipWaiting + clients.claim', () => {
  const sw = read('sw.js');
  assert.match(sw, /const CACHE_NAME = 'cso-candidate-cache-v3(?:0[5-9]|[1-9]\d)';/);
  assert.ok(sw.includes('AUTH_NO_STORE_ROUTE_RE'), 'sw.js missing AUTH_NO_STORE_ROUTE_RE');
  assert.ok(sw.includes("cache: 'no-store'"), 'sw.js missing cache: no-store on auth navigations');
  assert.ok(sw.includes("url.pathname.startsWith('/api/auth/')"), 'sw.js must bypass /api/auth/*');
  assert.ok(!sw.includes("'/api/auth/me'"), 'sw.js must NOT include /api/auth/me in NETWORK_FIRST_API_ROUTES');
  assert.ok(sw.includes('self.skipWaiting()'), 'sw.js missing self.skipWaiting()');
  assert.ok(sw.includes('self.clients.claim()'), 'sw.js missing self.clients.claim()');
  assert.ok(!/PRECACHE_URLS\s*=\s*\[[^\]]*(?:student-dashboard|candidate-hub|login\.html)/s.test(sw), 'sw.js must not precache auth/dashboard HTML');
  assert.ok(!/RUNTIME_SWR_ASSETS\s*=\s*\[[^\]]*(?:student-dashboard|candidate-hub|login\.html)/s.test(sw), 'sw.js must not SWR-cache auth/dashboard HTML');
});

await check('2. Runtime SW simulation proves /student-dashboard/ & /login.html NEVER read/write Cache Storage', async () => {
  const swCode = read('sw.js');
  const listeners = {};
  const cacheStore = new Map([
    ['https://csodisha.com/student-dashboard/', new Response('<h1>STALE OLD PAGE</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['https://csodisha.com/login.html', new Response('<h1>STALE OLD LOGIN</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['/offline.html', new Response('<h1>OFFLINE</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })]
  ]);
  const putUrls = [];
  const fetchCalls = [];

  const mockCache = {
    async match(req) {
      const k = typeof req === 'string' ? req : req.url;
      return cacheStore.get(k) || null;
    },
    async put(req, res) {
      const k = typeof req === 'string' ? req : req.url;
      putUrls.push(k);
      cacheStore.set(k, res);
    },
    async keys() {
      return [...cacheStore.keys()].filter(k => k.startsWith('http')).map(u => new Request(u));
    },
    async delete(req) {
      const k = typeof req === 'string' ? req : req.url;
      return cacheStore.delete(k);
    },
    async addAll() {}
  };

  const sandbox = {
    self: {
      location: { origin: 'https://csodisha.com' },
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [] }
    },
    caches: {
      open: async () => mockCache,
      keys: async () => ['cso-candidate-cache-v304', 'cso-candidate-cache-v305'],
      delete: async () => true
    },
    fetch: async (req, opts) => {
      const u = typeof req === 'string' ? req : req.url;
      fetchCalls.push({ url: u, opts });
      return new Response('<h1>FRESH LIVE ' + new URL(u).pathname + '</h1>', {
        status: 200,
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, private' }
      });
    },
    URL,
    Request,
    Response,
    Headers,
    AbortController,
    setTimeout,
    clearTimeout,
    console
  };
  vm.runInNewContext(swCode, sandbox);

  for (const testPath of ['/student-dashboard/', '/candidate-hub/', '/login.html', '/signup.html', '/saved/']) {
    let responded = null;
    const req = {
      method: 'GET',
      mode: 'navigate',
      url: 'https://csodisha.com' + testPath,
      headers: new Headers({ accept: 'text/html' })
    };
    listeners.fetch[0]({ request: req, respondWith(p) { responded = p; }, waitUntil() {} });
    assert.ok(responded, `SW should intercept navigation for ${testPath}`);
    const res = await responded;
    const html = await res.text();
    assert.ok(html.includes('FRESH LIVE ' + testPath), `${testPath} must serve fresh network HTML, got: ${html}`);
    assert.ok(!html.includes('STALE OLD'), `${testPath} must NEVER serve stale cached HTML`);
  }
  assert.equal(putUrls.length, 0, `Auth/dashboard navigations must NEVER cache.put(), saw: ${putUrls.join(', ')}`);
  assert.ok(fetchCalls.every(c => c.opts && c.opts.cache === 'no-store'), 'All auth/dashboard SW fetches must pass cache: no-store');

  // Verify /api/auth/me is completely bypassed (not intercepted by SW)
  let authMeIntercepted = false;
  listeners.fetch[0]({
    request: { method: 'GET', mode: 'cors', url: 'https://csodisha.com/api/auth/me', headers: new Headers({ accept: 'application/json' }) },
    respondWith() { authMeIntercepted = true; },
    waitUntil() {}
  });
  assert.equal(authMeIntercepted, false, '/api/auth/me must bypass SW caching completely');
});

await check('3. _worker.js, _headers & functions/api/auth/_utils.js enforce Cache-Control: no-store, private on auth/dashboard routes', () => {
  const worker = read('_worker.js');
  assert.ok(worker.includes('isAuthOrDashboardPath'), '_worker.js missing isAuthOrDashboardPath check');
  assert.ok(worker.includes("'Cache-Control', 'no-store, no-cache, private, must-revalidate'"), '_worker.js missing no-store private Cache-Control');
  assert.ok(worker.includes("'Vary', 'Cookie'"), '_worker.js missing Vary: Cookie on auth/dashboard routes');

  const headers = read('_headers');
  for (const route of ['/student-dashboard/*', '/candidate-hub/*', '/saved/*', '/login.html', '/signup.html', '/reset-password.html']) {
    const idx = headers.indexOf(route);
    assert.ok(idx !== -1, `_headers missing ${route} block`);
    const block = headers.slice(idx, idx + 360);
    assert.ok(block.includes('Cache-Control: no-store, no-cache, private, must-revalidate'), `_headers ${route} missing no-store private Cache-Control`);
  }

  const authUtils = read('functions/api/auth/_utils.js');
  assert.ok(authUtils.includes("'Cache-Control': 'no-store, private, max-age=0'"), 'auth/_utils.js missing no-store Cache-Control');
});

await check('4. Candidate Hub eliminates pre-hydration legacy empty-state & theme flashes', () => {
  const html = read('student-dashboard/index.html');
  assert.ok(html.includes('class="bp-app-layout is-hydrating"'), 'student-dashboard/index.html must start in .is-hydrating state');
  assert.ok(html.includes('id="cso-workspace-skeleton"'), 'student-dashboard/index.html missing canonical #cso-workspace-skeleton');
  assert.ok(html.includes('id="bp-sidebar-skeleton"'), 'student-dashboard/index.html missing canonical #bp-sidebar-skeleton');
  assert.match(html, /<p\s+id="cso-workspace-empty"[^>]*\bhidden\b/i, '#cso-workspace-empty must be hidden on initial byte-0 paint');

  const css = read('assets/css/candidate-hub-v244.css');
  assert.ok(css.includes('.bp-app-layout.is-hydrating #cso-workspace-empty'), 'candidate-hub-v244.css must hide #cso-workspace-empty during hydration');
  assert.ok(css.includes('.cso-hub-skeleton-grid') && css.includes('.bp-nav-skeleton'), 'candidate-hub-v244.css missing canonical skeleton rules');

  const guard = read('assets/js/student-auth-guard.js');
  assert.ok(!guard.includes('alabaster-cobalt') && !guard.includes('csoStudentTheme'), 'student-auth-guard.js must remove legacy alabaster-cobalt/csoStudentTheme flash');
  assert.ok(guard.includes("setAttribute('data-cso-theme'") && guard.includes("setAttribute('data-theme'"), 'student-auth-guard.js must sync canonical 4-theme attributes');
  assert.ok(guard.includes("window.location.replace('/login.html?redirect='"), 'student-auth-guard.js must use window.location.replace');

  const dashJs = read('assets/js/student-dashboard.js');
  assert.ok(dashJs.includes('function finishHydration()'), 'student-dashboard.js missing finishHydration()');
  assert.ok(dashJs.includes("fetch('/api/candidate/hub-config'") && /Promise\.allSettled\(\[\s*fetch\('\/api\/candidate\/hub-config'/.test(dashJs), 'student-dashboard.js must fetch hub-config, workspace, and matches in parallel');
  assert.ok(dashJs.includes('purgeAuthDashboardCaches'), 'student-dashboard.js must purge auth/dashboard caches on sign-out');
});

await check('5. login.js, signup.js & shared-header.js perform single-hop canonical window.location.replace() + cache/profile cleanup', () => {
  const loginJs = read('assets/js/pages/login.js');
  assert.ok(loginJs.includes('normalizeCanonicalRedirect'), 'login.js missing normalizeCanonicalRedirect');
  assert.ok(loginJs.includes('candidate-hub'), 'login.js must normalize /candidate-hub/ alias directly to canonical /student-dashboard/');
  assert.ok(loginJs.includes('purgeAuthDashboardCaches'), 'login.js missing purgeAuthDashboardCaches');
  assert.ok(loginJs.includes('window.location.replace(targetUrl)'), 'login.js must redirect via window.location.replace(targetUrl)');
  assert.ok(!loginJs.includes('window.location.href ='), 'login.js must not use window.location.href (use replace)');
  assert.ok(loginJs.includes("cache: 'no-store'") && loginJs.includes("credentials: 'same-origin'"), 'login.js must pass no-store & same-origin on login fetch');

  const signupJs = read('assets/js/pages/signup.js');
  assert.ok(signupJs.includes('window.location.replace('), 'signup.js must use window.location.replace');
  assert.ok(!signupJs.includes('window.location.href ='), 'signup.js must not use window.location.href');

  const headerJs = read('assets/shared-header.js');
  assert.ok(headerJs.includes("localStorage.removeItem('cso_candidate_profile')"), 'shared-header.js logout must clear cso_candidate_profile');
  assert.ok(headerJs.includes("window.location.replace('/login.html')"), 'shared-header.js logout on dashboard must replace to /login.html');
});

await check('6. Strict CSP compliance & v305+ cache busting across affected HTML pages, ssr-shell.js, sw.js & ops-sentinel.js', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v3(?:0[5-9]|[1-9]\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v3(?:0[5-9]|[1-9]\d)';/);
  assert.match(read('functions/_lib/ssr-shell.js'), /\/assets\/shared-header\.js\?v=20261125v3(?:0[5-9]|[1-9]\d)/, 'ssr-shell.js missing shared-header.js?v=20261125v305+');
  assert.ok(read('login.html').includes('/assets/js/pages/login.js?v=20261125v305'), 'login.html missing login.js?v=20261125v305');
  assert.ok(read('signup.html').includes('/assets/js/pages/signup.js?v=20261125v305'), 'signup.html missing signup.js?v=20261125v305');

  const dashHtml = read('student-dashboard/index.html');
  for (const tok of [
    '/assets/shared-header.js?v=20261125v305',
    '/assets/css/student-dashboard-bp.css?v=20261125v305',
    '/assets/css/candidate-hub-v244.css?v=20261125v305',
    '/assets/js/student-auth-guard.js?v=20261125v305',
    '/assets/js/student-dashboard.js?v=20261125v305'
  ]) {
    assert.ok(dashHtml.includes(tok), `student-dashboard/index.html missing ${tok}`);
  }

  for (const jsRel of ['assets/js/pages/login.js', 'assets/js/pages/signup.js', 'assets/js/student-auth-guard.js', 'assets/js/student-dashboard.js', 'assets/shared-header.js']) {
    const code = read(jsRel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.', 'document.write']) {
      assert.ok(!code.includes(bad), `${jsRel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v305 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
