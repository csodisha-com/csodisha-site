#!/usr/bin/env node
/**
 * Two-Stage Cascading Jobs Menu (Stage 1 Vertical Dropdown -> Stage 2 Right Flyout)
 * & Direct Admin Studio Jobs Folder Live Sync Verification (v275)
 *
 * Verifies:
 *  1. Direct D1 -> Public bootstrap sync (`nav_sectors`): adding, renaming, reordering,
 *     toggling active/inactive L1 sectors & L2 subcategories, or publishing jobs in Admin Studio
 *     immediately purges edge caches (`X-CSO-Cache-Purged: 1`) and updates `nav_sectors` in
 *     GET /api/public/jobs/bootstrap.
 *  2. Admin Studio left sidebar (`Jobs ▾` folder in admin/admin.js) mirrors all 5 L1 sectors
 *     with live counts & direct sector filtering, and Jobs Publishing House renders the
 *     Live-Sync Badge banner confirming public Jobs ▾ two-stage dropdown sync.
 *  3. Simplified Two-Stage Cascading Jobs Menu in both assets/app.js & assets/shared-header.js:
 *     .cso-nav-jobs-wrap, .cso-jobs-stage1 (top scope strip All/Odisha/Central/All India,
 *     5 Admin-synced sectors with sessionStorage-cached counts, footer Closing Soon + View All Jobs),
 *     .cso-jobs-stage2 (right flyout with .is-flip-left viewport edge flip, geographic scopes,
 *     Admin-synced L2 subcategories, Quick Stages pills), 150ms hover-intent grace timer,
 *     keyboard nav (ArrowDown/ArrowRight/ArrowLeft/Escape), and mobile 44px+ inline accordion.
 *  4. 100% Opaque Elevated Surfaces & Zero Layout Overlap in assets/style.css & assets/css/portal-shell.css:
 *     old .cso-jobs-mega rules removed completely; .cso-jobs-stage1 (268px) & .cso-jobs-stage2 (280px,
 *     left: calc(100% + 6px)) use solid --cso-surface-elevated, backdrop-filter: none,
 *     0 18px 42px rgba(0, 0, 0, 0.42), and overflow: hidden across all 4 themes.
 *  5. v275 cache busting across HTML pages, sw.js & ops-sentinel.js, and 100% strict CSP compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicJobsBootstrapApi,
  handleJobsTaxonomyAdmin,
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

console.log('\n=== v275 Two-Stage Cascading Jobs Flyout & Admin Folder Live Sync Verification ===');

await check('1. Admin Jobs taxonomy & article mutations immediately update /api/public/jobs/bootstrap nav_sectors & purge cache', async () => {
  resetJobsPublishingSchemaMemo();
  const env = { DB: createMockD1() };

  // Initial bootstrap returns all 5 canonical sectors with their L2 subcategories
  const b0 = await (await handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap'), env)).json();
  assert.equal(b0.ok, true);
  assert.ok(Array.isArray(b0.nav_sectors), 'bootstrap must return nav_sectors array');
  assert.deepEqual(b0.nav_sectors.map(s => s.slug), ['government', 'private', 'psu', 'ngo', 'foreign']);
  assert.ok(b0.nav_sectors[0].subcategories.length >= 3, 'Government must include L2 subcategories');

  // Admin adds a new L2 board under Private -> immediate cache purge + appears in Stage 2
  const addL2 = await handleJobsTaxonomyAdmin(
    req('POST', 'https://csodisha.com/api/admin/jobs/taxonomy', {
      level: 2,
      parent_id: 'jtax_l1_private',
      title_en: 'Bhubaneswar FinTech & Startups',
      title_or: 'ଭୁବନେଶ୍ୱର ଫିନଟେକ୍ ଓ ଷ୍ଟାର୍ଟଅପ୍',
      slug: 'bhubaneswar-fintech-startups',
      is_published: 1
    }),
    env, adminActor, '', ''
  );
  assert.equal(addL2.status, 201);
  assert.equal(addL2.headers.get('X-CSO-Cache-Purged'), '1');
  const createdL2 = (await addL2.json()).node;

  // Admin publishes a job inside that new L2 board
  const addJob = await handleJobsArticlesAdmin(
    req('POST', 'https://csodisha.com/api/admin/jobs/articles', {
      title_en: 'Software Engineer — Bhubaneswar FinTech Hub',
      category_l1_id: 'jtax_l1_private',
      category_l2_id: createdL2.id,
      region_scope: 'odisha',
      is_published: 1
    }),
    env, adminActor, '', ''
  );
  assert.equal(addJob.status, 201);
  assert.equal(addJob.headers.get('X-CSO-Cache-Purged'), '1');

  const b1 = await (await handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap'), env)).json();
  const priv = b1.nav_sectors.find(s => s.slug === 'private');
  assert.equal(priv.published_jobs_count, 1, 'Private sector live count must reflect newly published job');
  const newSub = priv.subcategories.find(sc => sc.slug === 'bhubaneswar-fintech-startups');
  assert.ok(newSub, 'newly added Admin L2 subcategory must appear in public nav_sectors');
  assert.equal(newSub.published_jobs_count, 1);

  // Admin hides that L2 subcategory -> immediately removed from public Stage 2
  const hideL2 = await handleJobsTaxonomyAdmin(
    req('PATCH', `https://csodisha.com/api/admin/jobs/taxonomy/${createdL2.id}`, { is_published: 0 }),
    env, adminActor, createdL2.id, ''
  );
  assert.equal(hideL2.status, 200);
  assert.equal(hideL2.headers.get('X-CSO-Cache-Purged'), '1');

  const b2 = await (await handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap'), env)).json();
  const priv2 = b2.nav_sectors.find(s => s.slug === 'private');
  assert.ok(!priv2.subcategories.some(sc => sc.slug === 'bhubaneswar-fintech-startups'), 'hidden L2 node must not appear in public nav_sectors');
});

await check('2. Admin Studio Jobs ▾ sidebar mirrors 5 L1 sectors with live counts & Live-Sync Badge banner', () => {
  const adminJs = read('admin/admin.js');
  for (const tok of [
    'DEFAULT_JOBS_SECTORS',
    'jobsSectorNodes',
    'cso-nav-jobs-sector-sep',
    'cso-nav-mod-btn--sector',
    'data-jobs-sector',
    'setJobsSectorNodes',
    'openJobsSector',
    '/api/admin/jobs/taxonomy'
  ]) {
    assert.ok(adminJs.includes(tok), `admin/admin.js missing "${tok}"`);
  }

  const studioJs = read('admin/jobs-publishing-studio.js');
  for (const tok of [
    'jph-live-sync-banner',
    'Live Synced to Public Jobs ▾ Menu',
    'syncSidebarAndFlyoutCache',
    'cso_jobs_flyout_v275',
    'openSector:'
  ]) {
    assert.ok(studioJs.includes(tok), `admin/jobs-publishing-studio.js missing "${tok}"`);
  }
  assert.ok(!studioJs.includes('loadArticles().then(renderMain)'), 'fixed stale renderMain bug in jobs-publishing-studio.js');

  const studioCss = read('admin/jobs-publishing-studio.css');
  assert.ok(studioCss.includes('.jph-live-sync-banner'), 'jobs-publishing-studio.css missing .jph-live-sync-banner');
  assert.ok(studioCss.includes('.cso-nav-jobs-sector-sep'), 'jobs-publishing-studio.css missing .cso-nav-jobs-sector-sep');
});

await check('3. Simplified Two-Stage Cascading Jobs Menu wired cleanly in assets/app.js & assets/shared-header.js', () => {
  for (const rel of ['assets/app.js', 'assets/shared-header.js']) {
    const src = read(rel);
    assert.ok(!src.includes('cso-jobs-mega'), `${rel} must not contain old wide .cso-jobs-mega markup`);
    for (const tok of [
      'cso-nav-jobs-wrap',
      'cso-jobs-cascade',
      'cso-jobs-stage1',
      'cso-jobs-stage2',
      'cso-js1-scope-strip',
      'cso-js1-list',
      'cso-js1-footer',
      'cso-js1-mob-exp',
      'cso-js1-mob-sub',
      'is-stage2-open',
      'is-flip-left',
      'cso_jobs_flyout_v275',
      'd.nav_sectors',
      'Closing Soon',
      'View All Jobs →',
      'Apply Online',
      'Admit Cards',
      'Answer Keys',
      'Results',
      'ArrowRight',
      'ArrowLeft',
      'ArrowDown',
      'Escape',
      '150'
    ]) {
      assert.ok(src.includes(tok), `${rel} missing Two-Stage Cascading Menu feature "${tok}"`);
    }
  }
});

await check('4. 100% Opaque Elevated Surfaces, exact dimensions & zero .cso-jobs-mega leftovers in CSS', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css']) {
    const css = read(rel);
    assert.ok(!css.includes('.cso-jobs-mega'), `${rel} must completely remove old .cso-jobs-mega rules`);
    assert.ok(!css.includes('.cso-jm-grid'), `${rel} must completely remove old .cso-jm-* rules`);
    for (const tok of [
      '--cso-surface-elevated',
      '--cso-nav-bg',
      '.cso-jobs-stage1',
      '.cso-jobs-stage2',
      'backdrop-filter: none',
      '0 18px 42px rgba(0, 0, 0, 0.42)',
      'overflow: hidden'
    ]) {
      assert.ok(css.includes(tok), `${rel} missing opaque flyout token/rule "${tok}"`);
    }
  }

  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('width: 268px;'), 'assets/style.css must set Stage 1 width: 268px');
  assert.ok(styleCss.includes('width: 280px;'), 'assets/style.css must set Stage 2 width: 280px');
  assert.ok(styleCss.includes('left: calc(100% + 6px);'), 'assets/style.css must position Stage 2 at left: calc(100% + 6px)');
  assert.ok(styleCss.includes('top: calc(100% + 6px);'), 'assets/style.css must position Stage 1 at top: calc(100% + 6px)');
  assert.ok(styleCss.includes('z-index: 1200;'), 'assets/style.css must set z-index: 1200');
  assert.ok(styleCss.includes('min-height: 44px;'), 'assets/style.css must enforce 44px+ mobile touch targets');
});

await check('5. v275 cache busting across HTML pages, sw.js & ops-sentinel.js + 100% strict CSP compliance', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v275';"), 'sw.js must be cso-candidate-cache-v275');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v275';"), 'ops-sentinel.js must be cso-candidate-cache-v275');

  const corePages = [
    'index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html',
    'study-library/index.html', 'community/index.html', 'about/index.html', 'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.ok(html.includes('/assets/style.css?v=20261124v275'), `${rel} missing style.css?v=20261124v275`);
    if (rel === 'index.html') {
      assert.ok(html.includes('/assets/app.js?v=20261124v275'), 'index.html missing app.js?v=20261124v275');
    } else {
      assert.ok(html.includes('/assets/shared-header.js?v=20261124v275'), `${rel} missing shared-header.js?v=20261124v275`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }

  for (const portalPage of ['jobs/index.html', 'careers/index.html', 'schemes/index.html', 'study-library/index.html', 'community/index.html', 'about/index.html']) {
    assert.ok(read(portalPage).includes('/assets/css/portal-shell.css?v=20261124v275'), `${portalPage} missing portal-shell.css?v=20261124v275`);
  }

  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('/admin/admin.js?v=20261124v275'), 'admin/index.html missing admin.js?v=20261124v275');
  assert.ok(adminHtml.includes('/admin/jobs-publishing-studio.js?v=20261124v275'), 'admin/index.html missing jobs-publishing-studio.js?v=20261124v275');
  assert.ok(adminHtml.includes('/admin/jobs-publishing-studio.css?v=20261124v275'), 'admin/index.html missing jobs-publishing-studio.css?v=20261124v275');

  for (const rel of [
    'assets/shared-header.js',
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

console.log(`\n=== v275 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
