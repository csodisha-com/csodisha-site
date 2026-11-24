import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import {
  CANONICAL_HEADER_ORDER,
  ensureCategoriesNavBatch1Schema,
  getCategoriesNavOverview,
  handleCategoriesNavBatch1Admin,
  handlePublicNavConfigApi
} from '../functions/_lib/categories-nav-batch1.js';
import {
  ensureCategoriesNavBatch2Schema,
  handleCategoriesNavBatch2Admin,
  getPublishedNavBatch2Config
} from '../functions/_lib/categories-nav-batch2.js';
import { invalidateAllPublicCaches } from '../functions/_lib/edge-cache-invalidator.js';
import { getPublicContentMemoVersion } from '../functions/api/content/_public.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  return {
    raw: db,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const adminActor = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};

// 1. Purge check: All 5 static generated/directory.json files and 4 jobs JS registries are empty shells
const dirFiles = [
  ['jobs-careers/generated/directory.json', 'sections'],
  ['schemes-benefits/generated/directory.json', 'navigation'],
  ['study-library/generated/directory.json', 'navigation'],
  ['community/generated/directory.json', 'navigation'],
  ['about/generated/directory.json', 'navigation']
];
for (const [rel, key] of dirFiles) {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  assert.ok(Array.isArray(parsed[key]) && parsed[key].length === 0, `${rel} must have empty ${key} array`);
}

assert.equal(Object.keys(require(path.join(ROOT, 'assets/js/national-jobs-1-1-data.js'))).length, 0);
assert.equal(Object.keys(require(path.join(ROOT, 'assets/js/odisha-jobs-1-2-data.js'))).length, 0);
assert.equal(Object.keys(require(path.join(ROOT, 'assets/js/extended-jobs-1-3-to-1-10-data.js'))).length, 0);
const jobsApi = require(path.join(ROOT, 'assets/js/jobs-directory-data.js'));
assert.equal(jobsApi.DIRECTORY_SECTIONS.length, 0);
assert.equal(jobsApi.DIRECTORY_ITEMS.length, 0);

// 2. Clean-slate 5-pillar navigation in master-navigation.json & zero hardcoded mega-menu piles
const masterNav = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
assert.deepEqual(
  masterNav.folders.map(f => f.title),
  ['Jobs & Careers', 'Schemes & Benefits', 'Study Library', 'Community', 'About']
);
for (const f of masterNav.folders) {
  assert.deepEqual(f.modules, [], `Folder ${f.title} must start with empty modules array`);
}

const sharedHeaderSrc = fs.readFileSync(path.join(ROOT, 'assets/shared-header.js'), 'utf8');
assert.ok(sharedHeaderSrc.includes("'jobs-careers': []") && sharedHeaderSrc.includes("'about': []"), 'shared-header.js MENUS must be empty');
assert.ok(!sharedHeaderSrc.includes('Career Explorer'), 'Hardcoded mega-menu links must be removed from shared-header.js');

const appJsSrc = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
assert.ok(appJsSrc.includes("'jobs-careers':[]") && appJsSrc.includes("'about':[]"), 'app.js MENUS must be empty');
assert.ok(appJsSrc.includes("fetch('/api/nav/config'"), 'app.js must hydrate live nav from /api/nav/config');

// 3. Auto-seeding loops removed from functions/api/content/_public.js
const publicJsSrc = fs.readFileSync(path.join(ROOT, 'functions/api/content/_public.js'), 'utf8');
for (const forbidden of ['ensureVerifiedUpscSeedNotice', 'ODISHA_1_2_SEEDS', 'NATIONAL_1_1_SEEDS', 'EXTENDED_1_3_10_SEEDS']) {
  assert.ok(!publicJsSrc.includes(forbidden), `Auto-seeder ${forbidden} must be removed from _public.js`);
}

// 4. Migration 0132 leaves ONLY 5 top-level pillars in nav_categories & nav_menu_items and strips seed-* posts
const migDb = new DatabaseSync(':memory:');
migDb.exec(fs.readFileSync(path.join(ROOT, 'migrations/0084_categories_navigation_batch1.sql'), 'utf8'));
migDb.exec(`CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, type TEXT, title TEXT);`);
migDb.exec(`INSERT INTO posts (id, type, title) VALUES ('seed-opsc-1', 'job', 'Auto Seeded'), ('admin-job-1', 'job', 'Admin Authored');`);
migDb.exec(fs.readFileSync(path.join(ROOT, 'migrations/0131_restructure_7_pillar_navigation.sql'), 'utf8'));
migDb.exec(fs.readFileSync(path.join(ROOT, 'migrations/0132_clean_slate_navigation_sync.sql'), 'utf8'));

assert.equal(migDb.prepare("SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'header'").get().n, 5);
assert.equal(migDb.prepare("SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'mega_menu'").get().n, 0);
assert.equal(migDb.prepare('SELECT COUNT(*) AS n FROM nav_categories WHERE parent_id IS NULL').get().n, 5);
assert.equal(migDb.prepare('SELECT COUNT(*) AS n FROM nav_categories WHERE parent_id IS NOT NULL').get().n, 0);
assert.equal(migDb.prepare("SELECT COUNT(*) AS n FROM posts WHERE id LIKE 'seed-%'").get().n, 0);
assert.equal(migDb.prepare("SELECT COUNT(*) AS n FROM posts WHERE id = 'admin-job-1'").get().n, 1);

// 5. Real-time two-way live sync: create, edit, reorder, delete in /admin/ -> immediately reflected in /api/nav/config & cache invalidation
assert.deepEqual(CANONICAL_HEADER_ORDER, ['jobs-careers', 'schemes-benefits', 'study-library', 'community', 'about']);
const env = { DB: createMockDb() };
await ensureCategoriesNavBatch1Schema(env.DB);
await ensureCategoriesNavBatch2Schema(env.DB);

const initialOv = await getCategoriesNavOverview(env);
assert.equal(initialOv.master_categories, 5);
assert.equal(initialOv.subcategories, 0);
assert.equal(initialOv.header_links, 5);

const memoBefore = getPublicContentMemoVersion();

// Create a submenu item under Jobs & Careers via Admin API
const mmCreateRes = await handleCategoriesNavBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/mega-menu', {
    parent_item_id: 'nmenu-jobs-careers',
    column_group: 'Column 1: Quick Tracks',
    label_en: 'OPSC Live Notices',
    label_or: 'OPSC ତାଜା ବିଜ୍ଞପ୍ତି',
    url: '/jobs-careers/?board=opsc',
    sort_order: 1,
    status: 'published'
  }),
  env, adminActor, 'mega-menu'
);
assert.equal(mmCreateRes.status, 201);
const createdSub = (await mmCreateRes.json()).item;
assert.ok(getPublicContentMemoVersion() > memoBefore, 'Admin mutation must immediately invalidate public content memo');

// Verify public /api/nav/config reflects the newly created submenu immediately
const b2LiveAfterCreate = await getPublishedNavBatch2Config(env);
assert.equal(b2LiveAfterCreate.mega_menu.length, 1);
assert.equal(b2LiveAfterCreate.mega_menu[0].label_en, 'OPSC Live Notices');

// Reorder header items in Admin Panel (put Study Library first) and confirm public API respects new order
const reorderRes = await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/header', {
    action: 'reorder',
    ordered_ids: ['nmenu-study-library', 'nmenu-jobs-careers', 'nmenu-schemes-benefits', 'nmenu-community', 'nmenu-about']
  }),
  env, adminActor, 'header'
);
assert.equal(reorderRes.status, 200);
const pubAfterReorder = await (await handlePublicNavConfigApi(new Request('https://csodisha.com/api/nav/config'), env)).json();
assert.equal(pubAfterReorder.header[0].id, 'nmenu-study-library', 'Reordered header item must appear first immediately');

// Delete the created submenu item in Admin Panel and verify it disappears immediately
const mmDelRes = await handleCategoriesNavBatch2Admin(
  req('DELETE', `https://csodisha.com/api/admin/nav/mega-menu/${createdSub.id}`),
  env, adminActor, 'mega-menu', createdSub.id
);
assert.equal(mmDelRes.status, 200);
const b2LiveAfterDelete = await getPublishedNavBatch2Config(env);
assert.equal(b2LiveAfterDelete.mega_menu.length, 0);

// Verify invalidateAllPublicCaches is wired in both _router.js and _worker.js
const routerSrc = fs.readFileSync(path.join(ROOT, 'functions/api/admin/_router.js'), 'utf8');
const workerSrc = fs.readFileSync(path.join(ROOT, '_worker.js'), 'utf8');
assert.ok(routerSrc.includes('invalidateAllPublicCaches'), '_router.js must invoke invalidateAllPublicCaches on writes');
assert.ok(workerSrc.includes('invalidateAllPublicCaches'), '_worker.js must invoke invalidateAllPublicCaches on writes');
const invOut = await invalidateAllPublicCaches(new Request('https://csodisha.com/api/admin/nav/header'));
assert.equal(invOut.ok, true);

// 6. Strict CSP compliance check across all modified public & admin JS files
const cspFiles = [
  'assets/shared-header.js',
  'assets/js/jobs-directory-data.js',
  'assets/js/national-jobs-1-1-data.js',
  'assets/js/odisha-jobs-1-2-data.js',
  'assets/js/extended-jobs-1-3-to-1-10-data.js',
  'jobs-careers/assets/dashboard.js',
  'schemes-benefits/assets/dashboard.js',
  'study-library/assets/dashboard.js',
  'community/assets/dashboard.js',
  'about/assets/dashboard.js',
  'admin/admin.js',
  'admin/suite-live.js',
  'admin/categories-nav-batch1.js',
  'admin/categories-nav-batch2.js',
  'admin/categories-nav-batch3.js'
];
for (const rel of cspFiles) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const forbidden of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
    assert.ok(!src.includes(forbidden), `CSP violation (${forbidden}) in ${rel}`);
  }
}

// 7. Verify GEMINI.md reflects v231 clean-slate 5-pillar architecture
const geminiMd = fs.readFileSync(path.join(ROOT, 'GEMINI.md'), 'utf8');
assert.ok(geminiMd.includes('5 clean top-level navigation pillars') && geminiMd.includes('test-clean-slate-live-sync-v231.mjs'));

console.log('PASS test-clean-slate-live-sync-v231: 5 clean pillars, 0 hardcoded mega-menus/trees, auto-seeders removed, real-time Admin->Public sync & cache invalidation verified, 100% CSP compliant.');
