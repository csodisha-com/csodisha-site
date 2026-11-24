#!/usr/bin/env node
/**
 * Foreign Jobs Direct Single-Stage Menu & Admin/Backend/Portal Synchronization Verification (v277)
 *
 * Verifies:
 *  1. In both assets/shared-header.js and assets/app.js:
 *     - Foreign Jobs (`slug === 'foreign'`) renders as a direct single-stage item (`is-direct-only`)
 *       with NO right chevron (`›`), NO Stage 2 slideout on hover/focus (clears & removes `is-stage2-open`),
 *       and NO mobile inline accordion toggle/submenu.
 *     - Government, Private, PSUs, and NGOs / Non-Profit retain the `›` chevron, Stage 2 slideout
 *       (`Central`, `Odisha`, `All Over India`), and mobile inline accordion.
 *  2. Admin Studio (`admin/jobs-publishing-studio.js` & `admin/admin.js`):
 *     - Composer locks `region_scope` to `'foreign'` (`Foreign / Overseas`) when `foreign` sector is chosen
 *       and restricts domestic sectors to `odisha`, `central`, `all-india`.
 *     - Sidebar `Jobs ▾` folder clearly tags `Foreign Jobs` as `Overseas / Foreign`.
 *  3. Backend (`functions/_lib/jobs-publishing-house.js`) & Public `/jobs/` (`assets/js/jobs-portal.js`):
 *     - Creating a `foreign` job forces `region_scope = 'foreign'` even if `odisha` was submitted.
 *     - Querying `/api/public/jobs/list?sector=foreign&region=odisha` clears incompatible domestic `region`
 *       and returns Foreign / Overseas jobs cleanly; `jobs-portal.js` clears incompatible domestic `region`.
 *  4. v277 cache busting across core HTML pages, sw.js & ops-sentinel.js, and 100% strict CSP compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleJobsArticlesAdmin,
  handlePublicJobsListApi,
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

console.log('\n=== v277 Foreign Jobs Single-Stage & Admin/Portal Sync Verification ===');

await check('1. Foreign Jobs skips chevron, Stage 2 flyout, ArrowRight & mobile accordion in shared-header.js & app.js', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    assert.match(src, /===\s*'foreign'/, `${rel} missing === 'foreign' check`);
    for (const tok of [
      'is-direct-only',
      "cascade.classList.remove('is-stage2-open')",
      'cso_jobs_flyout_v277'
    ]) {
      assert.ok(src.includes(tok), `${rel} missing "${tok}"`);
    }
    assert.match(src, /if\s*\(\s*hasStage2\s*\)/, `${rel} missing if (hasStage2) guard`);
    assert.ok(
      src.includes("ev.key === 'ArrowRight' && hasStage2") || src.includes("ev.key==='ArrowRight'&&hasStage2"),
      `${rel} must guard ArrowRight with hasStage2`
    );
  }
});

await check('2. Admin Studio locks region_scope=foreign for Foreign Jobs & public /jobs/ clears incompatible domestic region', () => {
  const studioJs = read('admin/jobs-publishing-studio.js');
  for (const tok of [
    'isForeignSectorId',
    'Foreign / Overseas (Locked for Foreign Jobs)',
    "d.region_scope = 'foreign'",
    'lastSel.disabled = true',
    'cso_jobs_flyout_v277'
  ]) {
    assert.ok(studioJs.includes(tok), `admin/jobs-publishing-studio.js missing "${tok}"`);
  }

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('Overseas / Foreign'), 'admin/admin.js must tag Foreign Jobs with Overseas / Foreign');

  const portalJs = read('assets/js/jobs-portal.js');
  assert.ok(portalJs.includes('isForeignSectorActive'), 'assets/js/jobs-portal.js missing isForeignSectorActive guard');
  assert.ok(portalJs.includes('isForeignDeepLink'), 'assets/js/jobs-portal.js missing isForeignDeepLink guard');
});

await check('3. Backend forces region_scope=foreign for Foreign Jobs & ignores incompatible domestic ?region= on /api/public/jobs/list', async () => {
  resetJobsPublishingSchemaMemo();
  const env = { DB: createMockD1() };

  // Even if region_scope='odisha' is passed with category_l1_id='jtax_l1_foreign', backend enforces 'foreign'
  const createRes = await handleJobsArticlesAdmin(
    req('POST', 'https://csodisha.com/api/admin/jobs/articles', {
      title_en: 'MEA Nursing & Healthcare Recruitment — Japan',
      category_l1_id: 'jtax_l1_foreign',
      category_l2_id: 'jtax_l2_foreign_mea',
      region_scope: 'odisha',
      is_published: 1
    }),
    env, adminActor, '', ''
  );
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');
  const created = (await createRes.json()).item;
  assert.equal(created.region_scope, 'foreign', 'backend must enforce region_scope=foreign for foreign sector');

  // Querying ?sector=foreign&region=odisha must clear incompatible domestic region and return the foreign job
  const listRes = await (await handlePublicJobsListApi(
    new Request('https://csodisha.com/api/public/jobs/list?sector=foreign&region=odisha'),
    env
  )).json();
  assert.equal(listRes.total, 1, '/api/public/jobs/list?sector=foreign&region=odisha must ignore incompatible region');
  assert.equal(listRes.items[0].slug, created.slug);
});

await check('4. v277 cache busting across HTML pages, sw.js & ops-sentinel.js + 100% strict CSP compliance', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v277';"), 'sw.js must be cso-candidate-cache-v277');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v277';"), 'ops-sentinel.js must be cso-candidate-cache-v277');

  const corePages = [
    'index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html',
    'study-library/index.html', 'community/index.html', 'about/index.html', 'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.ok(html.includes('/assets/style.css?v=20261124v277'), `${rel} missing style.css?v=20261124v277`);
    if (rel === 'index.html') {
      assert.ok(html.includes('/assets/app.js?v=20261124v277'), 'index.html missing app.js?v=20261124v277');
    } else {
      assert.ok(html.includes('/assets/shared-header.js?v=20261124v277'), `${rel} missing shared-header.js?v=20261124v277`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }

  assert.ok(read('jobs/index.html').includes('/assets/js/jobs-portal.js?v=20261124v277'));
  assert.ok(read('admin/index.html').includes('/admin/admin.js?v=20261124v277'));
  assert.ok(read('admin/index.html').includes('/admin/jobs-publishing-studio.js?v=20261124v277'));

  for (const rel of [
    'assets/shared-header.js',
    'assets/js/jobs-portal.js',
    'admin/admin.js',
    'admin/jobs-publishing-studio.js',
    'functions/_lib/jobs-publishing-house.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v277 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
