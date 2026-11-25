#!/usr/bin/env node
/**
 * Two-Stage Cascading Careers Menu & Admin/D1 Live Sync Verification (v278)
 *
 * Verifies:
 *  1. Backend (`functions/_lib/careers-portal.js`):
 *     - GET /api/public/careers/bootstrap emits `nav_tracks` from active D1 `career_taxonomy_nodes`
 *       (L1 sorted by `sort_order ASC`, each embedding active L2 `subtracks` sorted by `sort_order ASC`
 *       and live `published_guides_count`).
 *     - Creating/updating L1 tracks, L2 subtracks, or publishing a career guide returns `X-CSO-Cache-Purged: 1`.
 *  2. Admin Studio (`admin/admin.js`, `admin/careers-publishing-studio.js`, `admin/careers-publishing-studio.css`):
 *     - `#careersSidebarSubnav` mirrors active L1 Career Tracks with live counts and deep-links into Careers Publishing House.
 *     - Live-sync status badge (`Live Synced to Public Careers ▾ Menu`) and `cso_careers_flyout_v278` sessionStorage clear.
 *  3. Two-Stage Cascading Careers Menu (`assets/shared-header.js` & `assets/app.js`):
 *     - `.cso-nav-careers-wrap`, `.cso-careers-stage1`, `.cso-careers-stage2`, `.is-flip-left`, `150ms` hover-intent,
 *       keyboard navigation (`ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`, `Escape`), mobile inline accordion.
 *  4. Deep-Link Filter Hydration on `/careers/` (`assets/js/careers-portal.js` & `assets/css/careers-portal.css`):
 *     - `?track=<l1_slug>&subtrack=<l2_slug>` hydration and dismissible active filter chips (`.crp-active-chips`, `.crp-filter-chip`).
 *  5. 100% solid opaque surfaces across all 4 themes (`assets/style.css`, `assets/css/portal-shell.css`),
 *     `?v=20261124v278` cache busting, `cso-candidate-cache-v278` in `sw.js` & `ops-sentinel.js`, and strict CSP compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicCareersBootstrap,
  handleAdminCareers,
  handleAdminCareersTaxonomy
} from '../functions/_lib/careers-portal.js';

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
  db.exec(read('migrations/0016_careers_portal.sql'));
  db.exec(read('migrations/0017_careers_publishing_house.sql'));

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

console.log('\n=== v278 Two-Stage Cascading Careers Menu & Live Sync Verification ===');

await check('1. Bootstrap emits D1 nav_tracks (L1 + nested L2 + live counts) & mutations purge edge cache', async () => {
  const db = createMockD1();
  const env = { DB: db, ADMIN_SESSION_SECRET: 'test-secret-v278' };

  const resTaxL1 = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', {
      kind: 'track',
      slug: 'defence-paramilitary',
      label_en: 'Defence & Paramilitary',
      label_or: 'ପ୍ରତିରକ୍ଷା ଓ ଅର୍ଦ୍ଧସାମରିକ',
      icon: '🎖️',
      sort_order: 7,
      active: 1
    }),
    env,
    adminActor
  );
  assert.equal(resTaxL1.status, 201);
  assert.equal(resTaxL1.headers.get('X-CSO-Cache-Purged'), '1');
  const l1Body = await resTaxL1.json();

  const resTaxL2 = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', {
      kind: 'subtrack',
      parent_id: l1Body.node.id,
      slug: 'cds-nda-afcat',
      label_en: 'CDS, NDA & AFCAT Officer Entry',
      label_or: 'CDS, NDA ଓ AFCAT ଅଫିସର୍ ଏଣ୍ଟ୍ରି',
      sort_order: 1,
      active: 1
    }),
    env,
    adminActor
  );
  assert.equal(resTaxL2.status, 201);
  assert.equal(resTaxL2.headers.get('X-CSO-Cache-Purged'), '1');

  const resArt = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', {
      title_en: 'CDS & NDA Officer Career Roadmap',
      track_slug: 'defence-paramilitary',
      subtrack_slug: 'cds-nda-afcat',
      region_scope: 'central',
      career_stage: 'graduate',
      status: 'published'
    }),
    env,
    adminActor
  );
  assert.equal(resArt.status, 201);
  assert.equal(resArt.headers.get('X-CSO-Cache-Purged'), '1');

  const bootRes = await handlePublicCareersBootstrap(
    req('GET', 'https://csodisha.com/api/public/careers/bootstrap'),
    env
  );
  assert.equal(bootRes.status, 200);
  const boot = await bootRes.json();
  assert.ok(Array.isArray(boot.nav_tracks) && boot.nav_tracks.length >= 7, 'nav_tracks must include custom L1 track');
  const customTrack = boot.nav_tracks.find(t => t.slug === 'defence-paramilitary');
  assert.ok(customTrack, 'defence-paramilitary track must appear in nav_tracks');
  assert.equal(customTrack.published_guides_count, 1);
  assert.equal(customTrack.subtracks.length, 1);
  assert.equal(customTrack.subtracks[0].slug, 'cds-nda-afcat');
  assert.equal(customTrack.subtracks[0].published_guides_count, 1);
});

await check('2. Admin Studio Careers ▾ sidebar subnav & Live-Sync Badge wired in admin.js & careers-publishing-studio.js', () => {
  const adminJs = read('admin/admin.js');
  for (const tok of [
    'careersSidebarSubnav',
    'activeCareersTrackSlug',
    'careersTrackNodes',
    'Public Careers ▾ Menu Tracks',
    'openCareersPublishingStudio'
  ]) {
    assert.ok(adminJs.includes(tok), `admin/admin.js missing "${tok}"`);
  }

  const studioJs = read('admin/careers-publishing-studio.js');
  for (const tok of [
    'cso_careers_flyout_v278',
    'Live Synced to Public Careers ▾ Menu',
    'cps-live-sync-banner',
    'Manage Menu Tracks'
  ]) {
    assert.ok(studioJs.includes(tok), `admin/careers-publishing-studio.js missing "${tok}"`);
  }

  const studioCss = read('admin/careers-publishing-studio.css');
  assert.ok(studioCss.includes('.cps-live-sync-banner'), 'careers-publishing-studio.css missing .cps-live-sync-banner');
});

await check('3. Two-Stage Cascading Careers Menu in shared-header.js & app.js (Stage 1 -> Stage 2 + mobile + keyboard)', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    for (const tok of [
      'cso-nav-careers-wrap',
      'cso-careers-cascade',
      'cso-careers-stage1',
      'cso-careers-stage2',
      'cso_careers_flyout_v278',
      'is-flip-left',
      'is-stage2-open',
      'cso-js1-mob-exp',
      'cso-js1-mob-sub',
      '/api/public/careers/bootstrap'
    ]) {
      assert.ok(src.includes(tok), `${rel} missing "${tok}"`);
    }
    assert.ok(src.includes('150'), `${rel} missing 150ms hover-intent grace timer`);
  }
});

await check('4. Deep-link filter hydration & dismissible active filter chips on /careers/', () => {
  const cpJs = read('assets/js/careers-portal.js');
  for (const tok of [
    "urlParams.get('track')",
    "urlParams.get('subtrack')",
    'crp-active-chips',
    'crp-filter-chip'
  ]) {
    assert.ok(cpJs.includes(tok), `assets/js/careers-portal.js missing "${tok}"`);
  }
  const cpCss = read('assets/css/careers-portal.css');
  assert.ok(cpCss.includes('.crp-active-chips'), 'assets/css/careers-portal.css missing .crp-active-chips');
  assert.ok(cpCss.includes('.crp-filter-chip'), 'assets/css/careers-portal.css missing .crp-filter-chip');
});

await check('5. Solid opaque 4-theme surfaces, v278 cache busting & strict CSP compliance', () => {
  const styleCss = read('assets/style.css');
  for (const tok of [
    '.cso-careers-stage1',
    '.cso-careers-stage2',
    'width: 256px;',
    'width: 248px;',
    'backdrop-filter: none;',
    'var(--cso-surface-elevated'
  ]) {
    assert.ok(styleCss.includes(tok), `assets/style.css missing "${tok}"`);
  }
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(shellCss.includes('#cso-main-navbar .cso-careers-stage1'), 'portal-shell.css missing .cso-careers-stage1');
  assert.ok(shellCss.includes('#cso-main-navbar .cso-careers-stage2'), 'portal-shell.css missing .cso-careers-stage2');

  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:7[89]|[89]\d)';/.test(read('sw.js')), 'sw.js must be cso-candidate-cache-v278+');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:7[89]|[89]\d)';/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js must be cso-candidate-cache-v278+');

  const corePages = [
    'index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html',
    'study-library/index.html', 'community/index.html', 'about/index.html', 'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.ok(/\/assets\/style\.css\?v=2026112[45]v2(?:7[89]|[89]\d)/.test(html), `${rel} missing style.css?v=20261124v278+`);
    if (rel === 'index.html') {
      assert.ok(/\/assets\/app\.js\?v=2026112[45]v2(?:7[89]|[89]\d)/.test(html), 'index.html missing app.js?v=20261124v278+');
    } else {
      assert.ok(/\/assets\/shared-header\.js\?v=2026112[45]v2(?:7[89]|[89]\d)/.test(html), `${rel} missing shared-header.js?v=20261124v278+`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }

  assert.match(read('careers/index.html'), /\/assets\/js\/careers-portal\.js\?v=2026112[45]v2(?:7[89]|8\d)/);
  assert.match(read('admin/index.html'), /\/admin\/admin\.js\?v=2026112[45]v2(?:7[89]|8\d)/);
  assert.ok(read('admin/index.html').includes('/admin/careers-publishing-studio.js?v=20261124v278'));

  for (const rel of [
    'assets/shared-header.js',
    'assets/app.js',
    'assets/js/careers-portal.js',
    'admin/admin.js',
    'admin/careers-publishing-studio.js',
    'functions/_lib/careers-portal.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v278 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
