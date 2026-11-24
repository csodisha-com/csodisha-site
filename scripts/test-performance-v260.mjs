#!/usr/bin/env node
/**
 * v260 Site-Wide Page Load & API Performance Optimization Verification Suite
 *
 * Tests:
 *  1. Migration 0143 creates all composite performance indexes across all 12 tables and executes cleanly in SQLite.
 *  2. All 5 single-roundtrip batched /bootstrap endpoints execute via env.DB.batch([...]), return tree + items + kpis,
 *     and emit Cache-Control: public, max-age=15, s-maxage=300, stale-while-revalidate=60 (and no-store on ?refresh=1).
 *  3. _worker.js & edge-cache-invalidator.js wire all 5 /bootstrap endpoints, serve anonymous read-only /api/public/* via
 *     Edge cache (with preview_token / auth bypass), and purge all /bootstrap + HTML routes on Admin mutation.
 *  4. All 5 portal JS files call their /bootstrap endpoint, render optimistic skeleton shells, debounce at 180ms,
 *     and mark dynamic images with loading="lazy" & decoding="async".
 *  5. Site-wide HTML audit across all 60 HTML pages: zero render-blocking <script src>, lazy/async below-fold <img>,
 *     dns-prefetch hints on core pages, and slim core PRECACHE_URLS + Stale-While-Revalidate in sw.js (v260).
 *  6. Strict CSP compliance across all modified files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v260.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { handlePublicJobsBootstrapApi } from '../functions/_lib/jobs-publishing-house.js';
import { handlePublicSchemesBootstrapApi } from '../functions/_lib/schemes-publishing-house.js';
import { handlePublicStudyBootstrapApi } from '../functions/_lib/study-publishing-house.js';
import { handlePublicCommunityBootstrapApi } from '../functions/_lib/community-platform.js';
import { handlePublicAboutBootstrapApi } from '../functions/_lib/about-publishing-house.js';
import { CONTENT_PUBLIC_PATHS, PUBLIC_EDGE_CACHE_HEADER } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walkHtml(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '.wrangler') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p));
  }
  return acc;
}

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

console.log('\n=== v260 Site-Wide Page Load & API Performance Optimization Verification ===');

function createFullSqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT);
    CREATE TABLE candidates (id TEXT PRIMARY KEY, email TEXT, full_name TEXT, district TEXT);
    INSERT INTO users VALUES ('u1', 'aspirant@odisha.in');
  `);
  for (const mig of [
    'migrations/0138_jobs_publishing_house.sql',
    'migrations/0139_schemes_publishing_house.sql',
    'migrations/0140_study_library_publishing_house.sql',
    'migrations/0141_community_platform.sql',
    'migrations/0142_about_institutional_studio.sql',
    'migrations/0143_performance_indexes.sql'
  ]) {
    sqlite.exec(read(mig));
  }

  let batchCalls = 0;
  function wrap(sql) {
    let params = [];
    const stmt = {
      _sql: sql,
      bind(...args) { params = args; return stmt; },
      async run() {
        const res = sqlite.prepare(sql).run(...params);
        return { success: true, meta: { changes: Number(res.changes || 0) } };
      },
      async first(col) {
        const row = sqlite.prepare(sql).get(...params);
        if (!row) return null;
        return col ? row[col] : row;
      },
      async all() {
        return { success: true, results: sqlite.prepare(sql).all(...params) };
      }
    };
    return stmt;
  }

  return {
    sqlite,
    get batchCalls() { return batchCalls; },
    prepare(sql) { return wrap(sql); },
    async batch(stmts) {
      batchCalls++;
      const out = [];
      for (const st of stmts) out.push(await st.all());
      return out;
    }
  };
}

const db = createFullSqliteD1();
const env = { DB: db };

await check('1. Migration 0143 creates all 21 composite performance indexes cleanly across all 12 tables', () => {
  const rows = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_perf_%'").all();
  assert.ok(rows.length >= 21, `Expected >= 21 idx_perf_* indexes, got ${rows.length}`);
});

await check('2. All 5 single-roundtrip /bootstrap endpoints execute via env.DB.batch([...]) with Edge SWR headers', async () => {
  const before = db.batchCalls;
  const [jRes, sRes, stRes, cRes, aRes] = await Promise.all([
    handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap'), env),
    handlePublicSchemesBootstrapApi(new Request('https://csodisha.com/api/public/schemes/bootstrap'), env),
    handlePublicStudyBootstrapApi(new Request('https://csodisha.com/api/public/study/bootstrap'), env),
    handlePublicCommunityBootstrapApi(new Request('https://csodisha.com/api/public/community/bootstrap'), env),
    handlePublicAboutBootstrapApi(new Request('https://csodisha.com/api/public/about/bootstrap'), env)
  ]);

  assert.ok(db.batchCalls - before >= 5, 'Each bootstrap handler must execute via env.DB.batch([...])');

  for (const [label, res] of [['jobs', jRes], ['schemes', sRes], ['study', stRes], ['community', cRes], ['about', aRes]]) {
    assert.equal(res.status, 200, `${label} bootstrap must return 200`);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=15, s-maxage=300, stale-while-revalidate=60', `${label} bootstrap must set SWR Edge Cache-Control`);
    const body = await res.json();
    assert.equal(body.ok, true, `${label} bootstrap ok=true`);
    assert.ok(Array.isArray(body.tree) && Array.isArray(body.nodes), `${label} bootstrap must return tree & nodes`);
    assert.ok(Array.isArray(body.items), `${label} bootstrap must return items`);
    assert.ok(body.kpis && typeof body.kpis === 'object', `${label} bootstrap must return kpis`);
  }

  // ?refresh=1 bypasses edge cache cleanly with no-store
  const bypassRes = await handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap?refresh=1'), env);
  assert.equal(bypassRes.headers.get('Cache-Control'), 'no-store, max-age=0');
});

await check('3. _worker.js & edge-cache-invalidator.js wire all 5 /bootstrap routes, Edge SWR caching & instant purge', () => {
  const worker = read('_worker.js');
  const inv = read('functions/_lib/edge-cache-invalidator.js');
  assert.equal(PUBLIC_EDGE_CACHE_HEADER, 'public, max-age=15, s-maxage=300, stale-while-revalidate=60');
  for (const ep of [
    '/api/public/jobs/bootstrap',
    '/api/public/schemes/bootstrap',
    '/api/public/study/bootstrap',
    '/api/public/community/bootstrap',
    '/api/public/about/bootstrap'
  ]) {
    assert.ok(worker.includes(ep), `_worker.js must route ${ep}`);
    assert.ok(CONTENT_PUBLIC_PATHS.includes(ep), `edge-cache-invalidator must purge ${ep}`);
  }
  assert.ok(worker.includes('serveEdgeCachedPublicApi'), '_worker.js must use serveEdgeCachedPublicApi');
  assert.ok(worker.includes('stale-while-revalidate=60'), '_worker.js must set stale-while-revalidate=60');
  assert.ok(worker.includes("u.searchParams.has('preview_token')"), '_worker.js must bypass cache for preview_token');
  assert.ok(worker.includes("request.headers.get('Authorization')"), '_worker.js must bypass cache for Authorization header');
  assert.ok(inv.includes("'_ecv'"), 'edge-cache-invalidator must also purge versioned _ecv cache keys');
});

await check('4. All 5 portal JS files call /bootstrap, render optimistic skeletons, debounce 180ms & lazy/async images', () => {
  const portals = [
    ['assets/js/jobs-portal.js', '/api/public/jobs/bootstrap'],
    ['assets/js/schemes-portal.js', '/api/public/schemes/bootstrap'],
    ['assets/js/study-portal.js', '/api/public/study/bootstrap'],
    ['assets/js/community-portal.js', '/api/public/community/bootstrap'],
    ['assets/js/about-portal.js', '/api/public/about/bootstrap']
  ];
  for (const [rel, ep] of portals) {
    const src = read(rel);
    assert.ok(src.includes(ep), `${rel} must fetch ${ep}`);
    assert.ok(src.includes('cso-portal-skeleton'), `${rel} must mount optimistic skeleton shell`);
    assert.ok(src.includes('180'), `${rel} must debounce search input at 180ms`);
    assert.ok(src.includes("decoding = 'async'"), `${rel} must set decoding='async' on images`);
    assert.ok(src.includes("loading = 'lazy'"), `${rel} must set loading='lazy' on images`);
  }
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(shellCss.includes('.cso-portal-skeleton') && shellCss.includes('csoSkelPulse'));
});

await check('5. All 60 HTML pages have zero render-blocking scripts, lazy/async below-fold images & slim SWR sw.js', () => {
  const htmlFiles = walkHtml(ROOT);
  assert.ok(htmlFiles.length >= 60, `Expected >= 60 HTML files, found ${htmlFiles.length}`);
  for (const rel of htmlFiles) {
    const html = read(rel);
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/gi)];
    for (const m of scripts) {
      assert.ok(/\b(?:defer|async)\b|type="module"/i.test(m[0]), `Render-blocking script in ${rel}: ${m[0]}`);
    }
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
    for (const m of imgs) {
      const tag = m[0];
      assert.ok(/\bdecoding="async"/i.test(tag), `Missing decoding="async" in ${rel}: ${tag}`);
      if (!/\bfetchpriority="high"/i.test(tag)) {
        assert.ok(/\bloading="lazy"/i.test(tag), `Below-fold image missing loading="lazy" in ${rel}: ${tag}`);
      }
    }
  }

  for (const core of ['index.html', 'jobs/index.html', 'schemes/index.html', 'study-library/index.html', 'community/index.html', 'about/index.html']) {
    assert.ok(read(core).includes('rel="dns-prefetch"'), `${core} must include dns-prefetch resource hint`);
  }

  const sw = read('sw.js');
  const precacheMatch = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  assert.ok(precacheMatch, 'sw.js must define PRECACHE_URLS');
  const precacheItems = [...precacheMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(precacheItems.length <= 12, `PRECACHE_URLS must be slim (<=12 core files), got ${precacheItems.length}`);
  assert.ok(!precacheItems.some(u => u.includes('/admin/')), 'PRECACHE_URLS must never include Admin files');
  assert.ok(sw.includes('RUNTIME_SWR_ASSETS') && sw.includes('event.waitUntil(networkFetch)'), 'sw.js must use Stale-While-Revalidate');
});

await check('6. Strict CSP compliance across all v260 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v260', () => {
  const jsFiles = [
    'assets/js/jobs-portal.js',
    'assets/js/schemes-portal.js',
    'assets/js/study-portal.js',
    'assets/js/community-portal.js',
    'assets/js/about-portal.js'
  ];
  for (const rel of jsFiles) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v260';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v260';"));
});

console.log(`\n=== v260 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
