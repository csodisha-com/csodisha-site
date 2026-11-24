import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  CANONICAL_HEADER_ORDER,
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

// 1. Validate clean-slate 5-pillar structure in admin/data/master-navigation.json
const masterNav = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
assert.equal(masterNav.folders.length, 5, `Expected 5 pillars, got ${masterNav.folders.length}`);
const EXPECTED_PILLARS = ['Jobs & Careers', 'Schemes & Benefits', 'Study Library', 'Community', 'About'];
masterNav.folders.forEach((folder, idx) => {
  assert.equal(folder.title, EXPECTED_PILLARS[idx]);
  assert.ok(folder.title_or && folder.title_or.length >= 3, `Missing Odia title_or on ${folder.id}`);
  assert.ok(resolveLiveRouteOnDisk(folder.route), `Broken pillar route: ${folder.route}`);
  assert.ok(Array.isArray(folder.modules) && folder.modules.length === 0, `Expected empty modules list in ${folder.title}`);
});

// 2. Verify D1 nav schema seeds only the 5 clean top-level pillars with 0 subcategories & 0 mega-menu rows
assert.deepEqual(CANONICAL_HEADER_ORDER, ['jobs-careers', 'schemes-benefits', 'study-library', 'community', 'about']);
const env = { DB: createMockDb() };
await ensureCategoriesNavBatch2Schema(env.DB);
const ov = await getCategoriesNavOverview(env);
assert.equal(ov.master_categories, 5);
assert.equal(ov.subcategories, 0);
assert.equal(ov.header_links, 5);
assert.equal(ov.bilingual_pct, 100);

const pubConfig = await (await handlePublicNavConfigApi(new Request('https://csodisha.com/api/nav/config'), env)).json();
assert.equal(pubConfig.header.length, 5);
const b2Config = await getPublishedNavBatch2Config(env);
assert.equal(b2Config.mega_menu.length, 0);

console.log('PASS test-navigation-restructure-v230: Clean-slate 5-pillar structure verified (5 master pillars, 0 pre-seeded child modules/mega-menus, 100% live routes & bilingual EN/OR).');
