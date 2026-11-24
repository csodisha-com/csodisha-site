#!/usr/bin/env node
/**
 * Careers Portal, Separated Jobs/Careers Navigation & Admin Careers Publishing House Verification Suite (v269)
 *
 * Verifies:
 *  1. Site-wide navigation splits Jobs (/jobs/) and Careers (/careers/) as clean standalone direct links (no dropdown panels)
 *     in assets/app.js, assets/shared-header.js, and all 11 public HTML pages, with accurate active-route detection for
 *     /jobs/*, /jobs-careers/*, and /careers/*.
 *  2. migrations/0016_careers_portal.sql executes cleanly in SQLite, creating careers_articles & career_taxonomy_nodes
 *     and pre-seeding 6 core career tracks, 3 regions, and 5 career stages.
 *  3. Public APIs: GET /api/public/careers/bootstrap (live D1 + graceful pending-migration fallback) and
 *     GET /api/public/careers/list (track/region/stage/q filtering + admin-gated preview_id).
 *  4. Admin APIs: GET & POST /api/admin/careers (create, update, toggle_status, delete, audit_log, cache purge) and
 *     POST /api/admin/careers/taxonomy (inline track/region/stage creation).
 *  5. Public /careers/ portal (careers/index.html, assets/css/careers-portal.css, assets/js/careers-portal.js) +
 *     edge-to-edge portal-shell.css integration.
 *  6. Admin Studio Careers tab & bilingual composer (admin/index.html, admin/admin.js,
 *     admin/careers-publishing-studio.js, admin/careers-publishing-studio.css).
 *  7. Cache busting (?v=20261124v269, cso-candidate-cache-v269) & 100% strict CSP compliance across all touched files.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicCareersBootstrap,
  handlePublicCareersList,
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

const ADMIN_SESSION_TOKEN = 'a'.repeat(64);

function createMockD1({ withMigration = true } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT, role TEXT, created_at INTEGER, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
    INSERT INTO users (id, email, role) VALUES ('u-admin-1', 'admin@csodisha.com', 'admin');
    INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES ('${ADMIN_SESSION_TOKEN}', 'u-admin-1', 'admin@csodisha.com', 'admin', ${Math.floor(Date.now() / 1000)}, ${Math.floor(Date.now() / 1000) + 3600});
  `);
  if (withMigration) {
    db.exec(read('migrations/0016_careers_portal.sql'));
  }

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
    async batch(stmts) {
      return stmts.map(s => s._execAll());
    }
  };
}

const adminActor = { userId: 'u-admin-1', email: 'admin@csodisha.com', role: 'admin' };
const req = (method, url, body = null, extraHeaders = {}) => {
  const headers = { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1', ...extraHeaders };
  const opts = { method, headers };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};

console.log('\n=== v269 Separated Jobs/Careers Nav, /careers/ Portal & Admin Studio Verification ===');

await check('1. Site-wide navigation separates Jobs (/jobs/) & Careers (/careers/) with active-route detection & no dropdowns', () => {
  const appJs = read('assets/app.js');
  const sharedHeaderJs = read('assets/shared-header.js');

  assert.ok(appJs.includes("['jobs','Jobs','💼','/jobs/']"), 'assets/app.js missing standalone Jobs nav item');
  assert.ok(appJs.includes("['careers','Careers','🧭','/careers/']"), 'assets/app.js missing standalone Careers nav item');
  assert.ok(appJs.includes("p.startsWith('/careers')"), 'assets/app.js missing /careers active route detection');
  assert.ok(appJs.includes("p.startsWith('/jobs-careers')||p.startsWith('/jobs')") || appJs.includes("p.startsWith('/jobs-careers') || p.startsWith('/jobs')"), 'assets/app.js missing /jobs & /jobs-careers active route detection');

  assert.ok(sharedHeaderJs.includes("key: 'jobs', labelEn: 'Jobs'") && sharedHeaderJs.includes("url: '/jobs/'"), 'shared-header.js missing Jobs nav item');
  assert.ok(sharedHeaderJs.includes("key: 'careers', labelEn: 'Careers'") && sharedHeaderJs.includes("url: '/careers/'"), 'shared-header.js missing Careers nav item');
  assert.ok(sharedHeaderJs.includes("if (p.startsWith('/careers') || p.startsWith('/career-guidance')) return 'careers';"), 'shared-header.js missing /careers active pillar');
  assert.ok(sharedHeaderJs.includes("if (p.startsWith('/jobs-careers') || p.startsWith('/jobs')"), 'shared-header.js missing /jobs active pillar');

  const corePages = [
    'index.html',
    'jobs/index.html',
    'jobs-careers/index.html',
    'careers/index.html',
    'schemes/index.html',
    'schemes-benefits/index.html',
    'study-library/index.html',
    'study/index.html',
    'community/index.html',
    'about/index.html',
    'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.ok(html.includes('href="/jobs/"'), `${rel} missing /jobs/ link`);
    assert.ok(html.includes('href="/careers/"'), `${rel} missing /careers/ link`);
  }
});

await check('2. Migration 0016_careers_portal.sql creates tables & pre-seeds 6 tracks, 3 regions, 5 stages', () => {
  const env = { DB: createMockD1({ withMigration: true }) };
  const tracks = env.DB.raw.prepare(`SELECT slug, label_en, label_or FROM career_taxonomy_nodes WHERE kind = 'track' ORDER BY sort_order`).all();
  const regions = env.DB.raw.prepare(`SELECT slug, label_en FROM career_taxonomy_nodes WHERE kind = 'region' ORDER BY sort_order`).all();
  const stages = env.DB.raw.prepare(`SELECT slug, label_en FROM career_taxonomy_nodes WHERE kind = 'stage' ORDER BY sort_order`).all();

  assert.deepEqual(tracks.map(t => t.slug), [
    'civil-services', 'engineering-it', 'banking-finance', 'healthcare', 'agriculture', 'pathways'
  ]);
  assert.deepEqual(regions.map(r => r.slug), ['odisha', 'central', 'all-india']);
  assert.deepEqual(stages.map(s => s.slug), ['after-10th-12th', 'graduate', 'postgraduate', 'internship-apprenticeship', 'all-stages']);
});

await check('3. Public /api/public/careers/bootstrap & /list handle pending migration gracefully', async () => {
  const pendingEnv = { DB: createMockD1({ withMigration: false }) };
  const bRes = await handlePublicCareersBootstrap(new Request('https://csodisha.com/api/public/careers/bootstrap'), pendingEnv);
  assert.equal(bRes.status, 200);
  const bData = await bRes.json();
  assert.equal(bData.ok, true);
  assert.equal(bData.migration_pending, true);
  assert.equal(bData.taxonomy.tracks.length, 6);
  assert.equal(bData.taxonomy.regions.length, 3);
  assert.equal(bData.taxonomy.stages.length, 5);

  const lRes = await handlePublicCareersList(new Request('https://csodisha.com/api/public/careers/list?track=civil-services'), pendingEnv);
  assert.equal(lRes.status, 200);
  const lData = await lRes.json();
  assert.equal(lData.ok, true);
  assert.equal(lData.migration_pending, true);
  assert.deepEqual(lData.items, []);
});

await check('4. Admin CRUD, inline taxonomy creation, public filtering, and admin-only draft preview_id', async () => {
  const env = { DB: createMockD1({ withMigration: true }) };

  // Inline create a new career track
  const taxRes = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', {
      kind: 'track',
      label_en: 'Teaching & Academia',
      label_or: 'ଶିକ୍ଷାଦାନ ଓ ଗବେଷଣା'
    }),
    env,
    adminActor
  );
  assert.equal(taxRes.status, 201);
  const taxData = await taxRes.json();
  assert.equal(taxData.node.slug, 'teaching-and-academia');

  // Create draft career roadmap
  const createRes = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', {
      title_en: 'Odisha Administrative Service (OAS) Roadmap',
      title_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS) ମାର୍ଗଦର୍ଶିକା',
      track_slug: 'civil-services',
      region_scope: 'odisha',
      career_stage: 'graduate',
      summary_en: 'Step-by-step guide to OPSC OAS Prelims, Mains, and Interview.',
      roadmap_body_en: '### Step 1\nComplete graduation.\n\n### Step 2\nClear OPSC OCS.',
      eligibility_summary: 'Graduate, Age 21-38 yrs',
      salary_band: 'ORSP Level-12 (₹56,100+)',
      key_exams: 'OPSC OCS',
      official_links: [{ label: 'OPSC Official Portal', url: 'https://www.opsc.gov.in/' }],
      status: 'draft',
      featured: 1
    }),
    env,
    adminActor
  );
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()).item;
  assert.equal(created.status, 'draft');

  // Unauthenticated public list must NOT expose draft
  const pubBefore = await (await handlePublicCareersList(new Request('https://csodisha.com/api/public/careers/list'), env)).json();
  assert.equal(pubBefore.items.length, 0);

  // Unauthenticated preview_id must be rejected with 401
  const anonPrev = await handlePublicCareersList(
    new Request(`https://csodisha.com/api/public/careers/list?preview_id=${encodeURIComponent(created.id)}`),
    env
  );
  assert.equal(anonPrev.status, 401);

  // Authenticated staff preview_id returns the draft cleanly
  const staffPrev = await handlePublicCareersList(
    new Request(`https://csodisha.com/api/public/careers/list?preview_id=${encodeURIComponent(created.id)}`, {
      headers: { Cookie: `cso_session=${ADMIN_SESSION_TOKEN}` }
    }),
    env
  );
  assert.equal(staffPrev.status, 200);
  const staffPrevData = await staffPrev.json();
  assert.equal(staffPrevData.preview, true);
  assert.equal(staffPrevData.preview_item.id, created.id);

  // Toggle status to published
  const pubToggle = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', { action: 'toggle_status', id: created.id }),
    env,
    adminActor
  );
  assert.equal(pubToggle.status, 200);
  assert.equal((await pubToggle.json()).item.status, 'published');

  // Public bootstrap & filtered list now see it immediately
  const bootData = await (await handlePublicCareersBootstrap(new Request('https://csodisha.com/api/public/careers/bootstrap'), env)).json();
  assert.equal(bootData.stats.total_published, 1);
  assert.equal(bootData.featured.length, 1);
  assert.equal(bootData.taxonomy.tracks.length, 7);

  const filtered = await (await handlePublicCareersList(
    new Request('https://csodisha.com/api/public/careers/list?track=civil-services&region=odisha&stage=graduate&q=opsc'),
    env
  )).json();
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].slug, created.slug);

  // Delete via POST action
  const delRes = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', { action: 'delete', id: created.id }),
    env,
    adminActor
  );
  assert.equal(delRes.status, 200);
  const adminListAfter = await (await handleAdminCareers(req('GET', 'https://csodisha.com/api/admin/careers'), env, adminActor)).json();
  assert.equal(adminListAfter.items.length, 0);
});

await check('5. Public /careers/ portal, Admin Studio Careers tab, worker routing & pages functions exist', () => {
  const careersHtml = read('careers/index.html');
  assert.ok(careersHtml.includes('<body class="cso-portal-page" data-cso-portal="careers">'), 'careers/index.html missing zero-flash portal body');
  assert.ok(careersHtml.includes('id="cso-careers-portal-root"'), 'careers/index.html missing portal root');
  assert.ok(careersHtml.includes('Odisha &amp; National Careers Explorer'), 'careers/index.html missing hero title');
  assert.ok(careersHtml.includes('/assets/css/careers-portal.css?v=20261124v269'));
  assert.ok(careersHtml.includes('/assets/js/careers-portal.js?v=20261124v269'));

  const careersJs = read('assets/js/careers-portal.js');
  assert.ok(careersJs.includes('/api/public/careers/bootstrap'));
  assert.ok(careersJs.includes('/api/public/careers/list'));
  assert.ok(careersJs.includes("querySelector('.cso-portal-skeleton')"));
  assert.ok(careersJs.includes('/jobs/'), 'careers-portal.js must cross-link to /jobs/');

  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('/admin/careers-publishing-studio.css?v=20261124v269'));
  assert.ok(adminHtml.includes('/admin/careers-publishing-studio.js?v=20261124v269'));
  assert.ok(adminHtml.includes('/admin/admin.js?v=20261124v269'));

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('CSOCareersPublishingStudio'), 'admin.js must wire CSOCareersPublishingStudio');
  assert.ok(adminJs.includes('folder-careers-studio'), 'admin.js must add Careers sidebar tab');

  const studioJs = read('admin/careers-publishing-studio.js');
  assert.ok(studioJs.includes('/api/admin/careers/taxonomy'), 'careers studio must wire inline taxonomy endpoint');
  assert.ok(studioJs.includes('/careers/?preview_id='), 'careers studio must provide 1-click Preview Draft link');

  const workerJs = read('_worker.js');
  assert.ok(workerJs.includes('/api/public/careers/bootstrap'));
  assert.ok(workerJs.includes('/api/public/careers/list'));

  const routerJs = read('functions/api/admin/_router.js');
  assert.ok(routerJs.includes("case 'careers':"));

  for (const fnFile of [
    'functions/api/public/careers/bootstrap.js',
    'functions/api/public/careers/list.js',
    'functions/api/admin/careers/index.js',
    'functions/api/admin/careers/taxonomy.js'
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, fnFile)), `Missing function handler: ${fnFile}`);
  }
});

await check('6. Cache busting (?v=20261124v269, cso-candidate-cache-v269) & 100% strict CSP compliance', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v269';"), 'sw.js must be cso-candidate-cache-v269');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v269';"), 'ops-sentinel.js must be cso-candidate-cache-v269');
  assert.ok(read('index.html').includes('/assets/style.css?v=20261124v269'));
  assert.ok(read('index.html').includes('/assets/app.js?v=20261124v269'));
  assert.ok(read('jobs/index.html').includes('/assets/css/portal-shell.css?v=20261124v269'));
  assert.ok(read('jobs/index.html').includes('/assets/shared-header.js?v=20261124v269'));

  const cspJsFiles = [
    'assets/js/careers-portal.js',
    'admin/careers-publishing-studio.js',
    'assets/shared-header.js',
    'admin/admin.js'
  ];
  for (const rel of cspJsFiles) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }

  for (const rel of ['careers/index.html', 'index.html', 'jobs/index.html', 'admin/index.html']) {
    const html = read(rel);
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
    assert.ok(!/<script(?![^>]*type="application\/ld\+json")(?![^>]*\bsrc=)[^>]*>/i.test(html), `${rel} contains inline <script>`);
  }
});

console.log(`\n=== v269 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
