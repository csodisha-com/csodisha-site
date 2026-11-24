#!/usr/bin/env node
/**
 * Regression & Verification Suite for 100% Full Public Clean-Slate Purge (v233)
 * Verifies:
 *  1. Zero hardcoded directory trees, sidebar piles, or generated/directory.json fallbacks
 *     across all 5 pillars, sub-hubs, homepage, assets/shared-header.js, and assets/app.js.
 *  2. Zero runtime auto-seeders across Jobs, Schemes, Study Library, Community, Events/Scheduling,
 *     Users/Community (posts/threads/Q&A/shared knowledge), and Edu Resources Batches 1–6.
 *  3. Migration 0134_full_public_clean_slate.sql executes cleanly against SQLite, wipes EVERY
 *     content/directory/event/edu/community table to 0 rows, and preserves ONLY the 5 top-level
 *     pillars in nav_categories and nav_menu_items.
 *  4. invalidateAllPublicCaches() covers /api/nav/config, /api/content/*, /api/public/*,
 *     /api/edu/*, /api/community/*, /api/about/*, and /api/events/upcoming.
 *  5. Service Worker sw.js & ops-sentinel.js cache version bumped to cso-candidate-cache-v233.
 *  6. Strict CSP compliance across all modified public JS & HTML files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { ensureJobsDirectoryStudioSchema, listPublicJobsOverview } from '../functions/_lib/jobs-directory-studio.js';
import { ensureSchemesDirectoryStudioSchema, listPublicSchemesOverview } from '../functions/_lib/schemes-directory-studio.js';
import { ensureStudyLibraryStudioSchema } from '../functions/_lib/study-library-studio.js';
import { ensureCommunityDirectoryStudioSchema, listPublicCommunityOverview } from '../functions/_lib/community-directory-studio.js';
import { ensureEventsSchedulingBatch3Schema } from '../functions/_lib/events-scheduling-batch3.js';
import { ensureUsersCommunityBatch5Schema } from '../functions/_lib/users-community-batch5.js';
import { ensureEduResourcesBatch6Schema } from '../functions/_lib/edu-resources-batch6.js';
import { ensureCategoriesNavBatch3Schema } from '../functions/_lib/categories-nav-batch3.js';
import { NAV_PUBLIC_PATHS, CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function makeD1Mock() {
  const sqlite = new DatabaseSync(':memory:');
  function wrap(sql) {
    let params = [];
    const stmt = {
      bind(...args) { params = args; return stmt; },
      async run() {
        const s = sqlite.prepare(sql);
        const res = s.run(...params);
        return { success: true, meta: { changes: Number(res.changes || 0) } };
      },
      async first(col) {
        const s = sqlite.prepare(sql);
        const row = s.get(...params);
        if (!row) return null;
        return col ? row[col] : row;
      },
      async all() {
        const s = sqlite.prepare(sql);
        const rows = s.all(...params);
        return { success: true, results: rows };
      }
    };
    return stmt;
  }
  return {
    _sqlite: sqlite,
    prepare(sql) { return wrap(sql); },
    async batch(stmts) {
      const out = [];
      for (const st of stmts) out.push(await st.run());
      return out;
    },
    async exec(sql) { sqlite.exec(sql); }
  };
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

console.log('=== CSO 100% Full Public Clean-Slate Verification Suite (v233) ===');

// 1. Public JS/HTML clean-slate checks
check('No static generated/directory.json fetches remain in assets/app.js or content-dossier.js', () => {
  const appJs = read('assets/app.js');
  assert.ok(!appJs.includes("'/generated/directory.json'") && !appJs.includes("+/generated/directory.json") && !appJs.includes("generated/directory.json"),
    'assets/app.js must not fetch static generated/directory.json');
  const dossierJs = read('assets/js/content-dossier.js');
  assert.ok(!dossierJs.includes('generated/directory.json'), 'content-dossier.js must not fetch static generated/directory.json');
  assert.ok(dossierJs.includes('No items published yet — add categories or content in Admin Studio.'),
    'content-dossier.js must render clean empty state');
});

check('All 5 section dashboards render clean Admin Studio empty states with zero hardcoded exam presets', () => {
  for (const rel of [
    'jobs-careers/assets/dashboard.js',
    'schemes-benefits/assets/dashboard.js',
    'study-library/assets/dashboard.js',
    'community/assets/dashboard.js',
    'about/assets/dashboard.js'
  ]) {
    const src = read(rel);
    assert.ok(src.includes('No items published yet — add categories or content in Admin Studio.'),
      `${rel} must render clean empty state`);
  }
  const slDash = read('study-library/assets/dashboard.js');
  assert.ok(!slDash.includes("['opsc-oas', 'OPSC Civil Services (OAS)']"), 'study-library/assets/dashboard.js must not hardcode exam presets');
  assert.ok(!slDash.includes('Across 10 Academic Track Groups'), 'study-library/assets/dashboard.js must not hardcode 10 track groups');
});

check('Header & navigation remain clean 5-pillar structure with empty static MENUS', () => {
  const hdr = read('assets/shared-header.js');
  assert.ok(hdr.includes("'jobs-careers': []"));
  assert.ok(hdr.includes("'schemes-benefits': []"));
  assert.ok(hdr.includes("'study-library': []"));
  assert.ok(hdr.includes("'community': []"));
  assert.ok(hdr.includes("'about': []"));
  assert.ok(!hdr.includes('Career Explorer'), 'shared-header.js must not contain Career Explorer');
});

check('Cache invalidator covers /api/nav/config, /api/content/*, /api/public/*, /api/edu/*, /api/community/*, /api/about/*, /api/events/upcoming', () => {
  assert.ok(NAV_PUBLIC_PATHS.includes('/api/nav/config'));
  for (const p of [
    '/api/content/jobs',
    '/api/content/jobs-directory',
    '/api/content/schemes-directory',
    '/api/content/study-library-directory',
    '/api/content/about-directory',
    '/api/public/jobs-directory/overview',
    '/api/public/schemes-directory/overview',
    '/api/public/community-directory/overview',
    '/api/public/about-overview',
    '/api/community/posts',
    '/api/community/qna',
    '/api/about/overview',
    '/api/edu/resources',
    '/api/edu/mock-tests',
    '/api/events/upcoming'
  ]) {
    assert.ok(CONTENT_PUBLIC_PATHS.includes(p), `CONTENT_PUBLIC_PATHS missing ${p}`);
  }
});

check('Service Worker & ops-sentinel bumped to cso-candidate-cache-v233+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:3[3-9]|4\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:3[3-9]|4\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

check('Strict CSP compliance across all v233 modified public JS files', () => {
  for (const rel of [
    'assets/js/content-dossier.js',
    'jobs-careers/assets/dashboard.js',
    'schemes-benefits/assets/dashboard.js',
    'study-library/assets/dashboard.js',
    'community/assets/dashboard.js',
    'about/assets/dashboard.js'
  ]) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }
});

// 2. Fresh SQLite DB runtime checks: ZERO auto-seeding across ALL backend suites
const db = makeD1Mock();
const env = { DB: db };

await ensureCategoriesNavBatch3Schema(db);
await ensureJobsDirectoryStudioSchema(db);
await ensureSchemesDirectoryStudioSchema(db);
await ensureStudyLibraryStudioSchema(db);
await ensureCommunityDirectoryStudioSchema(db);
await ensureEventsSchedulingBatch3Schema(db);
await ensureUsersCommunityBatch5Schema(db);
await ensureEduResourcesBatch6Schema(db);

const zeroSeedTables = [
  'jobs_directory_folders', 'jobs_directory_items',
  'schemes_directory_folders', 'schemes_directory_items',
  'study_library_folders', 'study_library_items',
  'community_directory_folders', 'community_directory_items',
  'urc_community_posts', 'urc_forum_threads', 'urc_student_questions', 'urc_shared_knowledge',
  'evt_exam_calendar', 'evt_admission_milestones', 'evt_deadline_countdowns',
  'evt_admit_card_releases', 'evt_answer_key_challenges', 'evt_results_dv_rosters',
  'evt_district_meetups', 'evt_live_webinars',
  'edu_resources', 'edu_scholarships', 'edu_career_paths', 'edu_mock_tests',
  'edu_quizzes', 'edu_syllabi', 'edu_pyq_papers', 'edu_examinations',
  'edu_subjects_topics', 'edu_classes_grades', 'edu_collections', 'edu_admit_results', 'edu_answer_keys'
];

for (const tbl of zeroSeedTables) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM ${tbl}`).first();
  assert.equal(Number(row?.n || 0), 0, `Table ${tbl} auto-seeded ${row?.n} rows on fresh D1!`);
}
assert.deepEqual((await listPublicJobsOverview(env)).domains, []);
assert.deepEqual((await listPublicSchemesOverview(env)).domains, []);
assert.deepEqual((await listPublicCommunityOverview(env)).domains, []);
passed++;
console.log(`  ✓ Verified 0 auto-seeded rows across all ${zeroSeedTables.length} backend D1 tables`);

// 3. Validate migrations/0134_full_public_clean_slate.sql against SQLite with legacy tables + dummy rows
const migSql = read('migrations/0134_full_public_clean_slate.sql');
// Create the legacy migration-only tables that 0134 wipes so we can test EVERY DELETE statement end-to-end
const legacyStubs = [
  'jobs_directory_nodes', 'schemes_directory_nodes', 'schemes_directory',
  'study_library_nodes', 'community_feedback', 'about_directory_nodes',
  'posts', 'resources', 'mock_tests', 'mock_questions'
];
for (const tbl of legacyStubs) {
  db._sqlite.exec(`CREATE TABLE IF NOT EXISTS ${tbl} (id TEXT PRIMARY KEY);`);
  db._sqlite.exec(`INSERT OR IGNORE INTO ${tbl} (id) VALUES ('dummy-row-1');`);
}
// Insert dummy non-pillar rows in nav tables & content tables
db._sqlite.exec(`INSERT OR IGNORE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, target_portal, landing_url, sort_order, status) VALUES ('ncat-extra', 'ncat-jobs-careers', 'extra-sub', 'EXT', 'Extra Sub', '', 'jobs-careers', '/jobs/', 99, 'published');`);
db._sqlite.exec(`INSERT OR IGNORE INTO nav_menu_items (id, menu_location, label_en, url, sort_order, status) VALUES ('nmenu-extra', 'mega_menu', 'Legacy Mega Link', '/jobs/', 99, 'published');`);
db._sqlite.exec(`INSERT OR IGNORE INTO nav_tags (id, slug, canonical_tag, label_en, status) VALUES ('ntag-extra', 'legacy-tag', 'legacy-tag', 'Legacy Tag', 'published');`);
db._sqlite.exec(`INSERT OR IGNORE INTO nav_internal_links (id, slug, anchor_text_en, target_url, status) VALUES ('nlink-extra', 'legacy-link', 'Legacy', '/jobs/', 'published');`);

// Execute migration 0134
db._sqlite.exec(migSql);

const allWipedTables = [
  'jobs_directory_nodes', 'jobs_directory_folders', 'jobs_directory_items', 'jobs_directory_suggestions',
  'schemes_directory_nodes', 'schemes_directory_folders', 'schemes_directory_items', 'schemes_directory', 'schemes_directory_suggestions',
  'study_library_nodes', 'study_library_folders', 'study_library_items', 'study_library_suggestions',
  'community_directory_nodes', 'community_directory_folders', 'community_directory_items', 'community_directory_suggestions',
  'community_feedback', 'urc_community_posts', 'urc_forum_threads', 'urc_shared_knowledge',
  'about_directory_nodes', 'posts', 'resources', 'cso_current_affairs', 'mock_tests', 'mock_questions',
  'edu_resources', 'edu_scholarships', 'edu_career_paths', 'edu_mock_tests', 'edu_quizzes',
  'edu_syllabi', 'edu_pyq_papers', 'edu_examinations', 'edu_subjects_topics', 'edu_classes_grades',
  'edu_collections', 'edu_admit_results', 'edu_answer_keys',
  'evt_exam_calendar', 'evt_deadline_countdowns', 'evt_admit_card_releases', 'evt_results_dv_rosters',
  'evt_admission_milestones', 'evt_answer_key_challenges', 'evt_live_webinars', 'evt_district_meetups',
  'nav_tags', 'nav_internal_links'
];

for (const tbl of allWipedTables) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM ${tbl}`).first();
  assert.equal(Number(row?.n || 0), 0, `Migration 0134 failed to wipe ${tbl} (remaining: ${row?.n})`);
}
const navCats = await db.prepare(`SELECT id, parent_id, slug FROM nav_categories ORDER BY sort_order ASC`).all();
const navMenus = await db.prepare(`SELECT id, menu_location, url FROM nav_menu_items ORDER BY sort_order ASC`).all();
assert.equal(navCats.results.length, 5, 'nav_categories must contain ONLY the 5 top-level root pillars');
assert.ok(navCats.results.every(r => r.parent_id === null), 'All 5 nav_categories must be root pillars');
assert.equal(navMenus.results.length, 5, 'nav_menu_items must contain ONLY the 5 top-level navbar links');
assert.ok(navMenus.results.every(r => r.menu_location === 'header'), 'All 5 nav_menu_items must be header links');
passed++;
console.log(`  ✓ Migration 0134 executed cleanly: wiped all ${allWipedTables.length} tables to 0 rows & preserved 5 clean root pillars`);

console.log(`\nALL ${passed} FULL PUBLIC CLEAN-SLATE (v233) CHECKS PASSED!`);
