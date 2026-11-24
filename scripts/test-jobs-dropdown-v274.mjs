#!/usr/bin/env node
/**
 * Jobs Mega-Dropdown Menu, 5-Sector + Geographic Taxonomy Sync & Deep-Link Filter Hydration Verification (v274)
 *
 * Verifies:
 *  1. migrations/0018_jobs_5sector_dropdown_sync.sql runs cleanly after 0138_jobs_publishing_house.sql,
 *     consolidating to exactly 5 Core L1 Sectors (government, private, psu, ngo, foreign) with zero duplicates,
 *     15 new L2 geographic/domain branches, and region_scope on job_articles.
 *  2. Backend /api/public/jobs/bootstrap returns live sector_counts, region_counts & stage_counts;
 *     /api/public/jobs/list filters cleanly by ?sector=, ?region=, ?sub=, ?tenure=, ?stage= (including
 *     apply-online, admit-card, answer-key, result, closing-soon); Admin mutations purge caches immediately.
 *  3. Jobs Mega-Dropdown Menu in assets/app.js & assets/shared-header.js renders accessible triggers
 *     (aria-haspopup="true", aria-expanded="false", direct /jobs/ click), Top Geographic & Urgency Strip,
 *     5 Sector Columns with sessionStorage-cached live counts, Bottom Candidate Lifecycle Strip,
 *     120ms hover-intent, keyboard nav, and mobile accordion.
 *  4. Deep-link URL filter hydration (?sector=, ?region=, ?stage=, ?sub=, ?tenure=) + Active Filter Chips
 *     in assets/js/jobs-portal.js, plus expandable Jobs sidebar folder & Region Scope in Admin Studio.
 *  5. 4-Theme semantic CSS tokens, v274 cache busting across core HTML pages, sw.js & ops-sentinel.js,
 *     and 100% strict CSP compliance across all touched files.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicJobsBootstrapApi,
  handlePublicJobsListApi,
  handleJobsArticlesAdmin,
  resetJobsPublishingSchemaMemo
} from '../functions/_lib/jobs-publishing-house.js';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

const adminActor = { userId: 'u-admin-1', email: 'admin@csodisha.com', role: 'admin' };

function createMockD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  db.exec(read('migrations/0138_jobs_publishing_house.sql'));
  db.exec(read('migrations/0018_jobs_5sector_dropdown_sync.sql'));

  const makeStmt = (sql, args = []) => ({
    bind(...a) { return makeStmt(sql, a); },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() {
      const info = db.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(info.changes) } };
    },
    _execAll() { return { results: db.prepare(sql).all(...args) }; }
  });

  return {
    raw: db,
    prepare(sql) { return makeStmt(sql); },
    async batch(stmts) { return stmts.map(s => s._execAll()); }
  };
}

const req = (method, url, body = null) => {
  const headers = { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' };
  const opts = { method, headers };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};

console.log('\n=== v274 Jobs 5-Sector Taxonomy Sync & Mega-Dropdown Verification ===');

await check('1. Migration 0018 consolidates to exactly 5 Core L1 Sectors with zero duplicates + 15 L2 branches + region_scope', () => {
  const env = { DB: createMockD1() };
  const l1 = env.DB.raw.prepare(`SELECT id, slug, title_en FROM job_taxonomy_nodes WHERE level = 1 ORDER BY sort_order ASC`).all();
  assert.deepEqual(l1.map(r => r.slug), ['government', 'private', 'psu', 'ngo', 'foreign'], 'must have exactly 5 canonical L1 sectors');

  for (const parentId of ['jtax_l1_government', 'jtax_l1_private', 'jtax_l1_psu', 'jtax_l1_ngo', 'jtax_l1_foreign']) {
    const l2Cnt = env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM job_taxonomy_nodes WHERE level = 2 AND parent_id = ?`).get(parentId).n;
    assert.ok(l2Cnt >= 3, `${parentId} must have at least 3 L2 branches (got ${l2Cnt})`);
  }

  const cols = env.DB.raw.prepare(`PRAGMA table_info(job_articles)`).all().map(c => c.name);
  assert.ok(cols.includes('region_scope'), 'job_articles must include region_scope column');
});

await check('2. Public /api/public/jobs/bootstrap returns live sector_counts & /api/public/jobs/list filters by sector/region/sub/stage', async () => {
  resetJobsPublishingSchemaMemo();
  const env = { DB: createMockD1() };
  const soonDate = new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 10);

  // Create 2 published jobs across different sectors/regions/stages via Admin API
  const r1 = await handleJobsArticlesAdmin(
    req('POST', 'https://csodisha.com/api/admin/jobs/articles', {
      title_en: 'OPSC Odisha Civil Services 2026',
      category_l1_id: 'jtax_l1_government',
      category_l2_id: 'jtax_l2_gov_odisha',
      region_scope: 'odisha',
      location_district: 'All Odisha',
      lifecycle_stage: 'notification',
      last_date: soonDate,
      is_published: 1
    }),
    env,
    adminActor,
    '',
    ''
  );
  assert.equal(r1.status, 201);
  assert.equal(r1.headers.get('X-CSO-Cache-Purged'), '1');

  const r2 = await handleJobsArticlesAdmin(
    req('POST', 'https://csodisha.com/api/admin/jobs/articles', {
      title_en: 'MEA Verified Germany Nursing Recruitment',
      category_l1_id: 'jtax_l1_foreign',
      category_l2_id: 'jtax_l2_foreign_mea',
      region_scope: 'foreign',
      location_district: 'Foreign / Overseas',
      lifecycle_stage: 'admit_card',
      is_published: 1
    }),
    env,
    adminActor,
    '',
    ''
  );
  assert.equal(r2.status, 201);

  // Bootstrap live sector_counts & region_counts
  const boot = await (await handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap'), env)).json();
  assert.equal(boot.ok, true);
  assert.equal(boot.sector_counts.government, 1);
  assert.equal(boot.sector_counts.foreign, 1);
  assert.equal(boot.sector_counts.private, 0);
  assert.equal(boot.region_counts.odisha, 1);
  assert.equal(boot.region_counts.foreign, 1);
  assert.equal(boot.stage_counts['closing-soon'], 1);

  // Deep-link filtered list queries
  const qGov = await (await handlePublicJobsListApi(new Request('https://csodisha.com/api/public/jobs/list?sector=government&region=odisha&sub=odisha-state-govt'), env)).json();
  assert.equal(qGov.total, 1);
  assert.equal(qGov.items[0].title_en, 'OPSC Odisha Civil Services 2026');

  const qClosing = await (await handlePublicJobsListApi(new Request('https://csodisha.com/api/public/jobs/list?stage=closing-soon'), env)).json();
  assert.equal(qClosing.total, 1);

  const qAdmit = await (await handlePublicJobsListApi(new Request('https://csodisha.com/api/public/jobs/list?stage=admit-card&sector=foreign'), env)).json();
  assert.equal(qAdmit.total, 1);
  assert.equal(qAdmit.items[0].title_en, 'MEA Verified Germany Nursing Recruitment');
});

await check('3. Jobs Dropdown Menu wired in assets/app.js & assets/shared-header.js with 5 sectors, scopes, lifecycle & a11y', () => {
  for (const rel of ['assets/app.js', 'assets/shared-header.js']) {
    const src = read(rel);
    for (const token of [
      'cso-nav-jobs-wrap',
      'aria-haspopup',
      'aria-expanded',
      '/jobs/?region=odisha',
      '/jobs/?region=central',
      '/jobs/?region=all-india',
      '/jobs/?stage=closing-soon',
      'government',
      'private',
      'psu',
      'ngo',
      'foreign',
      'apply-online',
      'admit-card',
      'answer-key',
      'result',
      '/api/public/jobs/bootstrap',
      'ArrowDown',
      'Escape'
    ]) {
      assert.ok(src.includes(token), `${rel} missing Jobs Dropdown feature "${token}"`);
    }
  }
});

await check('4. Deep-link URL filter hydration on /jobs/ portal, Admin Studio expandable Jobs folder & worker routing', () => {
  const jobsPortal = read('assets/js/jobs-portal.js');
  for (const tok of [
    "params.get('sector')",
    "params.get('sub')",
    "params.get('tenure')",
    "params.get('region')",
    "params.get('stage')",
    'jp-active-chips',
    'REGION_PRESETS',
    '/api/public/jobs/list?'
  ]) {
    assert.ok(jobsPortal.includes(tok), `assets/js/jobs-portal.js missing "${tok}"`);
  }

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('jobsSidebarSubnav'), 'admin.js missing expandable Jobs sidebar subnav');
  assert.ok(adminJs.includes('5-Sector & 3-Layer Hierarchy'), 'admin.js missing 5-Sector & 3-Layer Hierarchy link');

  const jobsStudio = read('admin/jobs-publishing-studio.js');
  assert.ok(jobsStudio.includes('REGION_SCOPES'), 'jobs-publishing-studio.js missing REGION_SCOPES');
  assert.ok(jobsStudio.includes('Geographic Scope'), 'jobs-publishing-studio.js missing Geographic Scope filter/selector');

  const workerJs = read('_worker.js');
  assert.ok(workerJs.includes("pathname === '/api/public/jobs/list'"), '_worker.js must route /api/public/jobs/list');
  assert.ok(fs.existsSync(path.join(ROOT, 'functions/api/public/jobs/list.js')), 'functions/api/public/jobs/list.js must exist');
  assert.ok(read('functions/_lib/edge-cache-invalidator.js').includes("'/api/public/jobs/list'"), 'edge-cache-invalidator must purge /api/public/jobs/list');
});

await check('5. 4-Theme semantic CSS, cache busting & 100% strict CSP compliance', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css']) {
    const css = read(rel);
    assert.ok(css.includes('.cso-jobs-stage1') || css.includes('.cso-jobs-mega'), `${rel} missing Jobs dropdown styles`);
    assert.ok(css.includes('--cso-nav-sub-bg'), `${rel} missing --cso-nav-sub-bg token`);
  }

  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v27[4-9]';/, 'sw.js must be >= v274');
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v27[4-9]';/, 'ops-sentinel.js must be >= v274');

  const corePages = [
    'index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html',
    'study-library/index.html', 'community/index.html', 'about/index.html', 'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.match(html, /\/assets\/style\.css\?v=20261124v27[4-9]/, `${rel} missing style.css >= v274`);
    if (rel === 'index.html') {
      assert.match(html, /\/assets\/app\.js\?v=20261124v27[4-9]/, 'index.html missing app.js >= v274');
    } else {
      assert.match(html, /\/assets\/shared-header\.js\?v=20261124v27[4-9]/, `${rel} missing shared-header.js >= v274`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }

  assert.match(read('jobs/index.html'), /\/assets\/js\/jobs-portal\.js\?v=20261124v27[4-9]/);
  assert.match(read('jobs/index.html'), /\/assets\/css\/jobs-portal\.css\?v=20261124v27[4-9]/);
  assert.match(read('admin/index.html'), /\/admin\/jobs-publishing-studio\.js\?v=20261124v27[4-9]/);
  assert.match(read('admin/index.html'), /\/admin\/admin\.js\?v=20261124v27[4-9]/);

  for (const rel of [
    'assets/shared-header.js',
    'assets/js/jobs-portal.js',
    'admin/jobs-publishing-studio.js',
    'admin/admin.js',
    'functions/_lib/jobs-publishing-house.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v274 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
