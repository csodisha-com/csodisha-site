#!/usr/bin/env node
/**
 * Careers 3-Layer Publishing House, Pop-Up & Token Preview, Snippets & Dark Mode Verification Suite (v273)
 *
 * Verifies:
 *  1. migrations/0017_careers_publishing_house.sql executes cleanly BOTH after 0016_careers_portal.sql
 *     AND on a fresh database, creating 3-layer taxonomy (L1/L2/L3 + regions + stages) & 10 bilingual snippets.
 *  2. Full end-to-end CRUD lifecycle:
 *     create draft -> strictly hidden from public -> generate temporary preview token ->
 *     verify token preview returns 200 with Cache-Control: no-store & rejects bad/expired tokens ->
 *     publish -> immediately visible on /api/public/careers/list & /bootstrap with L2 filtering ->
 *     duplicate -> unpublish -> delete -> hidden from public immediately.
 *  3. 3-Layer Career Hierarchy CRUD (L1/L2/L3 + toggle_active + delete) & Reusable Bilingual Snippets CRUD.
 *  4. Admin Studio header clipping fix, 4-theme Dark Mode semantic token contrast (zero undefined --cso-ink),
 *     expandable Careers sidebar sub-navigation, 3-tab Studio, Pop-Up Preview Modal & Temp Preview Link UI.
 *  5. Public /careers/ portal supports preview_token, UNPUBLISHED DRAFT PREVIEW banner & L2 sub-track pills.
 *  6. Cache busting (?v=20261124v273, cso-candidate-cache-v273) & 100% strict CSP compliance across all touched files.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicCareersBootstrap,
  handlePublicCareersList,
  handleAdminCareers,
  handleAdminCareersTaxonomy,
  handleAdminCareersSnippets,
  handleAdminCareersPreviewToken
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

const ADMIN_SESSION_TOKEN = 'b'.repeat(64);
const adminActor = { userId: 'u-admin-1', email: 'admin@csodisha.com', role: 'admin' };

function createMockD1({ run0016 = true, run0017 = true } = {}) {
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
  if (run0016) db.exec(read('migrations/0016_careers_portal.sql'));
  if (run0017) db.exec(read('migrations/0017_careers_publishing_house.sql'));

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

const req = (method, url, body = null, extraHeaders = {}) => {
  const headers = { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1', ...extraHeaders };
  const opts = { method, headers };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};

console.log('\n=== v273 Careers 3-Layer Publishing House & Live Preview Verification ===');

await check('1. Migration 0017 runs cleanly after 0016 and on fresh DB (3-layer taxonomy + 10 bilingual snippets)', () => {
  for (const run0016 of [true, false]) {
    const env = { DB: createMockD1({ run0016, run0017: true }) };
    const l1 = env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM career_taxonomy_nodes WHERE kind = 'track'`).get().n;
    const l2 = env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM career_taxonomy_nodes WHERE kind = 'subtrack'`).get().n;
    const l3 = env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM career_taxonomy_nodes WHERE kind = 'role_stream'`).get().n;
    const snips = env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM career_bilingual_snippets`).get().n;
    assert.equal(l1, 6, `expected 6 L1 tracks (run0016=${run0016})`);
    assert.equal(l2, 12, `expected 12 L2 subtracks (run0016=${run0016})`);
    assert.equal(l3, 12, `expected 12 L3 role_streams (run0016=${run0016})`);
    assert.equal(snips, 10, `expected 10 pre-seeded bilingual snippets (run0016=${run0016})`);
  }
});

await check('2. Full lifecycle: Create Draft -> Token Preview -> Publish -> Public L2 Filter -> Duplicate -> Unpublish -> Delete', async () => {
  const env = { DB: createMockD1({ run0016: true, run0017: true }) };

  // Create draft with 3-layer taxonomy
  const createRes = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', {
      title_en: 'OPSC OAS Group-A Complete Career Guide',
      title_or: 'OPSC OAS ଗ୍ରୁପ୍-ଏ ସମ୍ପୂର୍ଣ୍ଣ କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା',
      track_slug: 'civil-services',
      subtrack_slug: 'odisha-state-pcs',
      role_stream_slug: 'oas-ops-ofs',
      region_scope: 'odisha',
      career_stage: 'graduate',
      eligibility_summary: 'Graduate, Age 21-38 yrs, Odia proficiency',
      salary_band: 'ORSP Level-12 (₹56,100+)',
      key_exams: 'OPSC OCS',
      summary_en: 'Complete roadmap for Odisha Administrative Service.',
      summary_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ମାର୍ଗଦର୍ଶିକା।',
      roadmap_body_en: '### Stage 1\n- Prelims MCQ\n- Mains Written\n- Personality Test',
      roadmap_body_or: '### ପର୍ଯ୍ୟାୟ ୧\n- ପ୍ରିଲିମ୍ସ\n- ମେନ୍ସ\n- ସାକ୍ଷାତକାର',
      official_links: [{ label: 'OPSC Portal', url: 'https://www.opsc.gov.in/' }],
      status: 'draft',
      featured: 1
    }),
    env,
    adminActor
  );
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');
  const created = (await createRes.json()).item;
  assert.equal(created.status, 'draft');
  assert.equal(created.subtrack_slug, 'odisha-state-pcs');
  assert.equal(created.role_stream_slug, 'oas-ops-ofs');

  // Public list & bootstrap must strictly hide draft
  const pubHidden = await (await handlePublicCareersList(new Request('https://csodisha.com/api/public/careers/list'), env)).json();
  assert.equal(pubHidden.items.length, 0, 'draft must not appear in public list');
  const bootHidden = await (await handlePublicCareersBootstrap(new Request('https://csodisha.com/api/public/careers/bootstrap'), env)).json();
  assert.equal(bootHidden.stats.total_published, 0, 'draft must not count as published');

  // Generate time-limited preview token
  const tokRes = await handleAdminCareersPreviewToken(
    req('POST', 'https://csodisha.com/api/admin/careers/preview-token', { id: created.id, ttl_hours: 24 }),
    env,
    adminActor
  );
  assert.equal(tokRes.status, 200);
  const tokData = await tokRes.json();
  assert.ok(tokData.preview_token && tokData.preview_token.length >= 32, 'preview_token generated');
  assert.ok(tokData.preview_url.includes(`preview_id=${encodeURIComponent(created.id)}&preview_token=`), 'preview_url formatted correctly');

  // Unauthenticated visitor WITH valid token CAN preview draft (no-store)
  const validPrevRes = await handlePublicCareersList(
    new Request(`https://csodisha.com/api/public/careers/list?preview_id=${encodeURIComponent(created.id)}&preview_token=${encodeURIComponent(tokData.preview_token)}`),
    env
  );
  assert.equal(validPrevRes.status, 200);
  assert.equal(validPrevRes.headers.get('Cache-Control'), 'no-store');
  const validPrev = await validPrevRes.json();
  assert.equal(validPrev.preview, true);
  assert.equal(validPrev.preview_mode, 'token');
  assert.equal(validPrev.preview_item.id, created.id);

  // Bad token rejected with 401
  const badTokRes = await handlePublicCareersList(
    new Request(`https://csodisha.com/api/public/careers/list?preview_id=${encodeURIComponent(created.id)}&preview_token=wrongtoken`),
    env
  );
  assert.equal(badTokRes.status, 401);

  // Expired token rejected with 401
  env.DB.raw.prepare(`UPDATE careers_articles SET preview_expires_at = '2020-01-01T00:00:00.000Z' WHERE id = ?`).run(created.id);
  const expTokRes = await handlePublicCareersList(
    new Request(`https://csodisha.com/api/public/careers/list?preview_id=${encodeURIComponent(created.id)}&preview_token=${encodeURIComponent(tokData.preview_token)}`),
    env
  );
  assert.equal(expTokRes.status, 401);

  // Publish guide
  const pubRes = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', { action: 'toggle_status', id: created.id }),
    env,
    adminActor
  );
  assert.equal(pubRes.status, 200);
  assert.equal((await pubRes.json()).item.status, 'published');

  // Immediately visible in public list with L2 subtrack & L3 role filters + bootstrap
  const pubFiltered = await (await handlePublicCareersList(
    new Request('https://csodisha.com/api/public/careers/list?track=civil-services&subtrack=odisha-state-pcs&role_stream=oas-ops-ofs'),
    env
  )).json();
  assert.equal(pubFiltered.items.length, 1);
  assert.equal(pubFiltered.items[0].slug, created.slug);

  const bootLive = await (await handlePublicCareersBootstrap(new Request('https://csodisha.com/api/public/careers/bootstrap'), env)).json();
  assert.equal(bootLive.stats.total_published, 1);
  assert.equal(bootLive.taxonomy.subtracks.length, 12);

  // Duplicate creates a hidden draft copy
  const dupRes = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', { action: 'duplicate', id: created.id }),
    env,
    adminActor
  );
  assert.equal(dupRes.status, 201);
  const dupItem = (await dupRes.json()).item;
  assert.equal(dupItem.status, 'draft');
  assert.ok(dupItem.title_en.includes('(Copy)'));

  // Public still sees ONLY the 1 published item
  const pubAfterDup = await (await handlePublicCareersList(new Request('https://csodisha.com/api/public/careers/list'), env)).json();
  assert.equal(pubAfterDup.items.length, 1);

  // Unpublish original -> public sees 0
  const unpubRes = await handleAdminCareers(
    req('POST', 'https://csodisha.com/api/admin/careers', { action: 'toggle_status', id: created.id }),
    env,
    adminActor
  );
  assert.equal((await unpubRes.json()).item.status, 'draft');
  const pubAfterUnpub = await (await handlePublicCareersList(new Request('https://csodisha.com/api/public/careers/list'), env)).json();
  assert.equal(pubAfterUnpub.items.length, 0);

  // Delete both
  await handleAdminCareers(req('POST', 'https://csodisha.com/api/admin/careers', { action: 'delete', id: created.id }), env, adminActor);
  await handleAdminCareers(req('POST', 'https://csodisha.com/api/admin/careers', { action: 'delete', id: dupItem.id }), env, adminActor);
  const adminAfterDel = await (await handleAdminCareers(req('GET', 'https://csodisha.com/api/admin/careers'), env, adminActor)).json();
  assert.equal(adminAfterDel.items.length, 0);
});

await check('3. 3-Layer Taxonomy CRUD (L2/L3 + toggle_active + delete) & Reusable Bilingual Snippets CRUD', async () => {
  const env = { DB: createMockD1({ run0016: true, run0017: true }) };

  // Add L2 subtrack under civil-services
  const l2Res = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', {
      kind: 'subtrack',
      parent_id: 'ctax-track-civil-services',
      label_en: 'Judicial Services (OJS)',
      label_or: 'ଓଡ଼ିଶା ନ୍ୟାୟିକ ସେବା (OJS)'
    }),
    env,
    adminActor
  );
  assert.equal(l2Res.status, 201);
  const l2Node = (await l2Res.json()).node;
  assert.equal(l2Node.level, 2);
  assert.equal(l2Node.parent_id, 'ctax-track-civil-services');

  // Add L3 role under new L2
  const l3Res = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', {
      kind: 'role_stream',
      parent_id: l2Node.id,
      label_en: 'Civil Judge (Junior Division)',
      label_or: 'ସିଭିଲ୍ ଜଜ୍'
    }),
    env,
    adminActor
  );
  assert.equal(l3Res.status, 201);
  const l3Node = (await l3Res.json()).node;
  assert.equal(l3Node.level, 3);

  // Toggle active off & delete
  const togRes = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', { action: 'toggle_active', id: l3Node.id }),
    env,
    adminActor
  );
  assert.equal((await togRes.json()).node.active, 0);

  const delTax = await handleAdminCareersTaxonomy(
    req('POST', 'https://csodisha.com/api/admin/careers/taxonomy', { action: 'delete', id: l2Node.id }),
    env,
    adminActor
  );
  assert.equal(delTax.status, 200);

  // Snippets CRUD
  const listSnips = await (await handleAdminCareersSnippets(req('GET', 'https://csodisha.com/api/admin/careers/snippets'), env, adminActor)).json();
  assert.equal(listSnips.snippets.length, 10);

  const addSnip = await handleAdminCareersSnippets(
    req('POST', 'https://csodisha.com/api/admin/careers/snippets', {
      category: 'eligibility',
      title_en: 'OJS Law Degree Criteria',
      title_or: 'OJS ଆଇନ ଡିଗ୍ରୀ ଯୋଗ୍ୟତା',
      body_en: '### LLB Requirement\n- Recognised LLB degree.',
      body_or: '### LLB ଯୋଗ୍ୟତା\n- ସ୍ୱୀକୃତିପ୍ରାପ୍ତ LLB ଡିଗ୍ରୀ।'
    }),
    env,
    adminActor
  );
  assert.equal(addSnip.status, 201);
  const createdSnip = (await addSnip.json()).snippet;
  assert.equal(createdSnip.title_en, 'OJS Law Degree Criteria');

  const delSnip = await handleAdminCareersSnippets(
    req('POST', 'https://csodisha.com/api/admin/careers/snippets', { action: 'delete', id: createdSnip.id }),
    env,
    adminActor
  );
  assert.equal(delSnip.status, 200);
});

await check('4. Admin Studio header fix, 4-theme contrast, expandable Careers sidebar & 3-tab Publishing House UI', () => {
  const studioCss = read('admin/studio.css');
  assert.ok(studioCss.includes('overflow-x: clip;'), 'studio.css must use overflow-x: clip so sticky topbar works cleanly');
  assert.ok(/\.cso-subheader\s*\{[\s\S]*?position:\s*relative;/m.test(studioCss), '.cso-subheader must be position: relative to prevent clipping behind sticky topbar');

  const cpsCss = read('admin/careers-publishing-studio.css');
  assert.ok(!cpsCss.includes('--cso-ink'), 'careers-publishing-studio.css must not use undefined --cso-ink variable');
  for (const tok of ['--cso-text-primary', '--cso-text-secondary', '--cso-surface-card', '--cso-border-subtle']) {
    assert.ok(cpsCss.includes(tok), `careers-publishing-studio.css missing semantic token ${tok}`);
  }
  assert.ok(cpsCss.includes(':root[data-cso-resolved-mode="dark"] .cps-select option'), 'dark mode <select><option> contrast rule required');

  const cpsJs = read('admin/careers-publishing-studio.js');
  for (const feat of [
    'Open Live Careers Portal ↗',
    '+ Publish New Career Guide',
    'Published & Draft Career Guides',
    '3-Layer Career Hierarchy',
    'Reusable Bilingual Snippets',
    'openPopupPreviewModal',
    'Open Temporary Preview Link ↗',
    '/api/admin/careers/preview-token',
    '/api/admin/careers/snippets',
    "action: 'duplicate'",
    'Publish Now',
    'Save Draft'
  ]) {
    assert.ok(cpsJs.includes(feat), `careers-publishing-studio.js missing "${feat}"`);
  }

  const adminJs = read('admin/admin.js');
  for (const sub of ['Published & Draft Guides', '3-Layer Career Hierarchy', 'Reusable Bilingual Snippets', '+ Publish New Career Guide']) {
    assert.ok(adminJs.includes(sub), `admin/admin.js missing Careers expandable sidebar item "${sub}"`);
  }

  const routerJs = read('functions/api/admin/_router.js');
  assert.ok(routerJs.includes("if (id === 'snippets')"));
  assert.ok(routerJs.includes("if (id === 'preview-token')"));

  for (const fnFile of [
    'functions/api/admin/careers/preview-token.js',
    'functions/api/admin/careers/snippets.js'
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, fnFile)), `Missing function handler: ${fnFile}`);
  }
});

await check('5. Public /careers/ portal supports preview_token, UNPUBLISHED DRAFT PREVIEW banner & L2 sub-track pills', () => {
  const portalJs = read('assets/js/careers-portal.js');
  assert.ok(portalJs.includes("previewToken: urlParams.get('preview_token')"), 'careers-portal.js must parse preview_token');
  assert.ok(portalJs.includes('UNPUBLISHED DRAFT PREVIEW'), 'careers-portal.js must display UNPUBLISHED DRAFT PREVIEW banner');
  assert.ok(portalJs.includes('renderSubtrackPills'), 'careers-portal.js must render L2 subtrack pills');

  const workerJs = read('_worker.js');
  assert.ok(workerJs.includes("url.searchParams.has('preview_id') || url.searchParams.has('preview_token')"), '_worker.js must bypass edge cache for preview_token');
  assert.ok(workerJs.includes("'/api/public/careers/bootstrap', '/api/public/careers/list', '/careers/'"), '_worker.js must invalidate careers paths');
});

await check('6. Cache busting (?v=20261124v273+, cso-candidate-cache-v273+) & 100% strict CSP compliance', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:7[3-9]|[8-9]\d)';/.test(read('sw.js')), 'sw.js must be cso-candidate-cache-v273+');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:7[3-9]|[8-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js must be cso-candidate-cache-v273+');

  const adminHtml = read('admin/index.html');
  for (const pat of [
    /\/admin\/studio\.css\?v=20261124v2(?:7[3-9]|[8-9]\d)/,
    /\/admin\/careers-publishing-studio\.css\?v=20261124v2(?:7[3-9]|[8-9]\d)/,
    /\/admin\/careers-publishing-studio\.js\?v=20261124v2(?:7[3-9]|[8-9]\d)/,
    /\/admin\/command-suite\.js\?v=20261124v2(?:7[3-9]|[8-9]\d)/,
    /\/admin\/admin\.js\?v=20261124v2(?:7[3-9]|[8-9]\d)/
  ]) {
    assert.ok(pat.test(adminHtml), `admin/index.html missing ${pat}`);
  }

  const careersHtml = read('careers/index.html');
  assert.ok(/\/assets\/css\/careers-portal\.css\?v=20261124v2(?:7[3-9]|[8-9]\d)/.test(careersHtml));
  assert.ok(/\/assets\/js\/careers-portal\.js\?v=20261124v2(?:7[3-9]|[8-9]\d)/.test(careersHtml));

  for (const rel of [
    'admin/careers-publishing-studio.js',
    'admin/admin.js',
    'admin/command-suite.js',
    'assets/js/careers-portal.js',
    'functions/_lib/careers-portal.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }

  for (const rel of ['admin/index.html', 'careers/index.html']) {
    const html = read(rel);
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
    assert.ok(!/<script(?![^>]*type="application\/ld\+json")(?![^>]*\bsrc=)[^>]*>/i.test(html), `${rel} contains inline <script>`);
  }
});

console.log(`\n=== v273 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
