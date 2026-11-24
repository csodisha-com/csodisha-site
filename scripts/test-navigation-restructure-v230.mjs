import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  CANONICAL_HEADER_ORDER,
  ensureCategoriesNavBatch1Schema,
  getCategoriesNavOverview,
  handlePublicNavConfigApi
} from '../functions/_lib/categories-nav-batch1.js';
import {
  ensureCategoriesNavBatch2Schema,
  getPublishedNavBatch2Config
} from '../functions/_lib/categories-nav-batch2.js';

const ROOT = process.cwd();

function resolveLiveRouteOnDisk(rawUrl) {
  const clean = String(rawUrl || '').split('#')[0].split('?')[0].trim();
  if (!clean || clean === '/') return fs.existsSync(path.join(ROOT, 'index.html'));
  const rel = clean.replace(/^\/+/, '');
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) || fs.existsSync(path.join(full, 'index.html')) || fs.existsSync(full + '.html');
}

function createMockDb() {
  const db = new DatabaseSync(':memory:');
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

// 1. Validate admin/data/master-navigation.json has exact 7 pillars and 28 modules
const masterNav = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
assert.equal(masterNav.folders.length, 7, `Expected 7 pillars, got ${masterNav.folders.length}`);

const EXPECTED_PILLARS = [
  'Home & Live Updates',
  'Jobs & Recruitment',
  'Study Library & Current Affairs',
  'Mock Tests & Practice',
  'Schemes & Scholarships',
  'Student Tools & Verified Portals',
  'Community & Support'
];

const EXPECTED_MODULE_TITLES = [
  ['Homepage Overview', 'Live Recruitment Alerts', "Today's Current Affairs", 'Annual Exam Calendar'],
  ['Odisha State Govt: OPSC/OSSC/OSSSC/Police', 'Central Govt: UPSC/SSC/RRB/Banking', 'PSUs & Apprenticeships', 'Notification Lifecycle Tracker'],
  ['Syllabi & Exam Patterns', 'Solved PYQs', 'Bilingual Study Notes', 'Daily Current Affairs & 5-MCQ Capsules'],
  ['Odisha Govt Mock Tests', 'Central Govt CBT Tests', 'Sectional & Speed Drills', 'Scoreboard & Analytics'],
  ['Odisha State Welfare Schemes', 'Central Govt Schemes', 'Post-Matric & Merit Scholarships', 'Eligibility Matcher'],
  ['Age Eligibility Calculator', 'Photo & Signature Resizer', 'Document Readiness Checklist', 'Official .gov.in Portals Directory'],
  ['Student Discussion Forum', 'Help & FAQs', 'Report an Error / Suggest Resource', 'About & Legal Policies']
];

let totalModules = 0;
const allModuleIds = [];
masterNav.folders.forEach((folder, idx) => {
  assert.equal(folder.title, EXPECTED_PILLARS[idx], `Pillar ${idx + 1} title mismatch`);
  assert.ok(folder.title_or && folder.title_or.length >= 3, `Missing Odia title_or on ${folder.id}`);
  assert.ok(resolveLiveRouteOnDisk(folder.route), `Broken pillar route: ${folder.route}`);
  assert.equal(folder.modules.length, 4, `Expected 4 modules in ${folder.title}`);
  folder.modules.forEach((mod, mIdx) => {
    totalModules++;
    allModuleIds.push(mod.id);
    assert.equal(mod.title, EXPECTED_MODULE_TITLES[idx][mIdx], `Module title mismatch in ${folder.id}`);
    assert.ok(mod.title_or && mod.title_or.length >= 3, `Missing Odia title_or on ${mod.id}`);
    assert.equal(mod.status, 'active', `Module ${mod.id} must be active`);
    assert.ok(resolveLiveRouteOnDisk(mod.route), `Broken module route for ${mod.id}: ${mod.route}`);
  });
});
assert.equal(totalModules, 28, `Expected 28 total modules, got ${totalModules}`);

// 2. Verify public shared-header.js & app.js have 7 pillars, bilingual support, live routes, and strict CSP
const sharedHeaderSrc = fs.readFileSync(path.join(ROOT, 'assets/shared-header.js'), 'utf8');
for (const forbidden of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
  assert.ok(!sharedHeaderSrc.includes(forbidden), `CSP violation (${forbidden}) in assets/shared-header.js`);
}
for (const key of ['home', 'jobs-careers', 'study-library', 'mock-tests', 'schemes-benefits', 'tools', 'community']) {
  assert.ok(sharedHeaderSrc.includes(`key: '${key}'`), `Missing pillar ${key} in assets/shared-header.js`);
}
assert.ok(sharedHeaderSrc.includes('labelOr:'), 'shared-header.js must define bilingual Odia labels');
assert.ok(sharedHeaderSrc.includes('renderNav();'), 'shared-header.js must re-render navigation on language change');

// Extract all url: '...' entries in shared-header.js NAV/MENUS and verify they exist on disk
const headerUrlMatches = [...sharedHeaderSrc.matchAll(/url:\s*'([^']+)'/g)].map(m => m[1]);
assert.ok(headerUrlMatches.length >= 35, `Expected >= 35 pillar/module routes in shared-header.js, got ${headerUrlMatches.length}`);
for (const u of headerUrlMatches) {
  assert.ok(resolveLiveRouteOnDisk(u), `Broken route in assets/shared-header.js: ${u}`);
}

const appJsSrc = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
for (const key of ['home', 'jobs-careers', 'study-library', 'mock-tests', 'schemes-benefits', 'tools', 'community']) {
  assert.ok(appJsSrc.includes(`'${key}'`), `Missing pillar ${key} in assets/app.js`);
}

// 3. Verify Admin Studio wiring & CSP compliance
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8');
assert.ok(!adminHtml.includes('299 Modules') && !adminHtml.includes('23 Folders'), 'Stale 23/299 strings remain in admin/index.html');
assert.ok(adminHtml.includes('7 Pillars Master Tree') && adminHtml.includes('28 / 28'), 'admin/index.html missing 7-pillar / 28-module labels');
assert.ok(adminHtml.includes('data-create-target="nav-manager"'), 'admin/index.html missing Navigation Manager launcher');

const suiteLiveSrc = fs.readFileSync(path.join(ROOT, 'admin/suite-live.js'), 'utf8');
for (const modId of allModuleIds) {
  assert.ok(suiteLiveSrc.includes(`'${modId}'`), `Module ${modId} not mapped in admin/suite-live.js ROUTES`);
}

for (const adminFile of ['admin/admin.js', 'admin/suite-live.js', 'admin/categories-nav-batch1.js']) {
  const src = fs.readFileSync(path.join(ROOT, adminFile), 'utf8');
  for (const forbidden of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
    assert.ok(!src.includes(forbidden), `CSP violation (${forbidden}) in ${adminFile}`);
  }
}

// 4. Verify D1 starter seeds, /api/nav/config, and Migration 0131 in SQLite
assert.deepEqual(CANONICAL_HEADER_ORDER, ['home', 'jobs-careers', 'study-library', 'mock-tests', 'schemes-benefits', 'tools', 'community']);

const env = { DB: createMockDb() };
await ensureCategoriesNavBatch2Schema(env.DB);
const ov = await getCategoriesNavOverview(env);
assert.equal(ov.master_categories, 7, `Expected 7 D1 master categories, got ${ov.master_categories}`);
assert.equal(ov.subcategories, 28, `Expected 28 D1 subcategories, got ${ov.subcategories}`);
assert.equal(ov.header_links, 7, `Expected 7 D1 header links, got ${ov.header_links}`);
assert.equal(ov.bilingual_pct, 100, `Expected 100% bilingual coverage in D1 nav, got ${ov.bilingual_pct}%`);

const pubConfig = await (await handlePublicNavConfigApi(new Request('https://csodisha.com/api/nav/config'), env)).json();
assert.equal(pubConfig.header.length, 7);
for (const h of pubConfig.header) {
  assert.ok(resolveLiveRouteOnDisk(h.url), `Broken D1 header URL: ${h.url}`);
  assert.ok(h.label_or && h.label_or.length > 0, `Missing D1 Odia header label for ${h.id}`);
}
const b2Config = await getPublishedNavBatch2Config(env);
assert.equal(b2Config.mega_menu.length, 28, `Expected 28 D1 mega_menu items, got ${b2Config.mega_menu.length}`);
for (const mm of b2Config.mega_menu) {
  assert.ok(resolveLiveRouteOnDisk(mm.url), `Broken D1 mega_menu URL: ${mm.url}`);
}

// Test migration 0131 against a fresh 0084 schema
const migDb = new DatabaseSync(':memory:');
migDb.exec(fs.readFileSync(path.join(ROOT, 'migrations/0084_categories_navigation_batch1.sql'), 'utf8'));
migDb.exec(fs.readFileSync(path.join(ROOT, 'migrations/0131_restructure_7_pillar_navigation.sql'), 'utf8'));
const hdrCnt = migDb.prepare("SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'header'").get().n;
const mmCnt = migDb.prepare("SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'mega_menu'").get().n;
const masterCnt = migDb.prepare('SELECT COUNT(*) AS n FROM nav_categories WHERE parent_id IS NULL').get().n;
const subCnt = migDb.prepare('SELECT COUNT(*) AS n FROM nav_categories WHERE parent_id IS NOT NULL').get().n;
assert.equal(hdrCnt, 7, `Migration 0131 expected 7 header rows, got ${hdrCnt}`);
assert.equal(mmCnt, 28, `Migration 0131 expected 28 mega_menu rows, got ${mmCnt}`);
assert.equal(masterCnt, 7, `Migration 0131 expected 7 master category rows, got ${masterCnt}`);
assert.equal(subCnt, 28, `Migration 0131 expected 28 subcategory rows, got ${subCnt}`);

// 5. Verify GEMINI.md updated for 7-pillar / 28-module structure
const geminiMd = fs.readFileSync(path.join(ROOT, 'GEMINI.md'), 'utf8');
assert.ok(geminiMd.includes('7 pillars') && geminiMd.includes('28 modules'), 'GEMINI.md must document 7 pillars / 28 modules');
assert.ok(geminiMd.includes('test-navigation-restructure-v230.mjs'), 'GEMINI.md must include v230 test command');

console.log('PASS test-navigation-restructure-v230: 7 pillars / 28 modules verified across master-navigation.json, shared-header.js, Admin Studio, D1 seeds, and migration 0131 (100% live routes, bilingual EN/OR, strict CSP).');
