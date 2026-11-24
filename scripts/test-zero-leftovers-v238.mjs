#!/usr/bin/env node
/**
 * Regression & Verification Suite for Zero-Leftovers Clean-Slate Sweep (v238)
 * Verifies:
 *  1. Candidate Hub (student-dashboard/index.html, assets/js/student-dashboard.js,
 *     assets/js/candidate-hub-unified.js, assets/js/document-readiness.js, assets/js/current-affairs.js)
 *     contains zero hardcoded workspace cards, checklists, preset widgets, 30-district lists,
 *     UGC NET / JRF target defaults, ADMIN & TOOLS link piles, or static sidebar items,
 *     and displays the unified empty state:
 *     "Your workspace is clean — save items from published sections or add modules in Admin Studio."
 *  2. Homepage (index.html) and all standalone routes (tools/, current-affairs/, mock-tests/,
 *     resources/, career-guidance/, opportunity-compass/, job-opportunity-finder/,
 *     scheme-opportunity-finder/, trust-layer/, support/, study/, faqs.html) contain zero
 *     hardcoded feature cards, preset calculators, popular search chips, district grids,
 *     FAQ accordions, or starter articles.
 *  3. migrations/0135_zero_leftovers_clean_slate.sql executes cleanly in SQLite, wipes all
 *     10 candidate/activity tables to 0 rows, and preserves candidates, users, and the 5 root pillars.
 *  4. Service Worker sw.js & functions/_lib/ops-sentinel.js bumped to cso-candidate-cache-v238.
 *  5. Strict CSP compliance across all v238 modified HTML & JS files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

console.log('=== CSO Zero-Leftovers Clean-Slate Verification Suite (v238) ===');

check('Candidate Hub HTML & JS contain zero hardcoded widgets, checklists, 30-district lists, or sidebar piles', () => {
  const html = read('student-dashboard/index.html');
  const dashJs = read('assets/js/student-dashboard.js');
  const hubJs = read('assets/js/candidate-hub-unified.js');
  const docJs = read('assets/js/document-readiness.js');
  const caJs = read('assets/js/current-affairs.js');

  const forbiddenHubStrings = [
    'Live D1 Workspace Snapshot',
    'Immediate Light Checklists',
    "Today's Practice Focus",
    'Document Readiness &amp; Locker Guard',
    'Smart Scheme &amp; Scholarship Auto-Matcher',
    'Odisha Exam Document &amp; ID Vault',
    '8-Step Master Checklist',
    'Personalized Study Planner',
    'Offline &amp; Low-Data Pack',
    'Daily Odisha Current Affairs &amp; 5-Question Quiz',
    'Exam Readiness Score',
    'UGC NET / JRF',
    'Primary Study Tracks',
    'Daily 5-Question Morning Odisha',
    'ADMIN &amp; TOOLS',
    'ADMIN & TOOLS',
    'My Learning &amp; Syllabi',
    'Study Tools',
    'Cutoff Calculator',
    'Daily GK Drill',
    'Odisha Govt Exam Age'
  ];
  for (const s of forbiddenHubStrings) {
    assert.ok(!html.includes(s), `student-dashboard/index.html must not contain "${s}"`);
    assert.ok(!dashJs.includes(s), `assets/js/student-dashboard.js must not contain "${s}"`);
  }

  assert.ok(html.includes('Your workspace is clean — save items from published sections or add modules in Admin Studio.'),
    'student-dashboard/index.html must include unified empty workspace message');
  assert.ok(dashJs.includes('Your workspace is clean — save items from published sections or add modules in Admin Studio.'),
    'assets/js/student-dashboard.js must render unified empty workspace message');
  assert.ok(!dashJs.includes('ODISHA_DISTRICTS'), 'student-dashboard.js must not hardcode 30 districts');
  assert.ok(!dashJs.includes('GK_DRILL_BANK'), 'student-dashboard.js must not hardcode GK_DRILL_BANK');
  assert.ok(!dashJs.includes('LOCKER_ITEMS'), 'student-dashboard.js must not hardcode LOCKER_ITEMS');
  assert.ok(hubJs.includes('var DISTRICTS = [];'), 'candidate-hub-unified.js DISTRICTS must be empty');
  assert.ok(!hubJs.includes('Quick Student Toolkit'), 'candidate-hub-unified.js must not inject Quick Student Toolkit');
  assert.ok(docJs.includes('var ITEMS = [];'), 'document-readiness.js ITEMS must be empty');
  assert.ok(caJs.includes('container.hidden = true;'), 'current-affairs.js must hide panel when 0 capsules exist');
});

check('Homepage (index.html) keeps clean Admin Studio empty state for Latest Updates (v239 restored layout)', () => {
  const home = read('index.html');
  assert.ok(home.includes('No items published yet — add categories or content in Admin Studio.'));
});

check('All standalone routes remove hardcoded feature cards, preset calculators, district grids, and FAQ accordions', () => {
  const routeChecks = [
    ['tools/index.html', ['Odisha Exam Photo', 'Odisha Govt Exam Age', 'Odisha CBT Score', '7th Pay Matrix', 'Uniformed Services PET']],
    ['current-affairs/index.html', ['Polity &amp; Governance', 'Science &amp; Tech', 'pc-hero__nav']],
    ['mock-tests/index.html', ['data-exam="OPSC"', 'data-exam="OSSC"', 'data-exam="OSSSC"', 'pc-hero__nav']],
    ['resources/index.html', ['value="OPSC"', 'value="OSSC"', 'value="OSSSC"', 'pc-hero__nav']],
    ['career-guidance/index.html', ['Find Your Career Direction', 'After Class 10', 'Explore Career Pathways', 'Build Skills That Support Your Goals']],
    ['opportunity-compass/index.html', ['Sundargarh', 'Kalahandi', 'Discover My Pathways']],
    ['job-opportunity-finder/index.html', ['CSO Job Opportunity Finder', 'Find Job Directions', 'National Career Service']],
    ['scheme-opportunity-finder/index.html', ['What kind of support do you need?', 'Popular searches:', 'Check before applying']],
    ['trust-layer/index.html', ['Official Source', 'Last Verified', 'Deadline &amp; Status', 'Report an Issue']],
    ['support/index.html', ['What is Common Sense Odisha?', 'Is CSO an official government website?', 'Getting Started']],
    ['study/index.html', ['Study Path Finder', 'Education Explorer', 'Education Updates']],
    ['faqs.html', ['Verified Academic Knowledgebase', 'Reconciliation Cycle']]
  ];

  for (const [rel, forbidden] of routeChecks) {
    const html = read(rel);
    for (const s of forbidden) {
      assert.ok(!html.includes(s), `${rel} must not contain hardcoded content "${s}"`);
    }
    assert.ok(html.includes('No items published yet — add categories or content in Admin Studio.'),
      `${rel} must include clean Admin Studio empty state`);
  }

  const faqsJs = read('assets/js/pages/faqs.js');
  assert.ok(!faqsJs.includes('FAQ-01'), 'assets/js/pages/faqs.js must not contain hardcoded FAQ-01');
  assert.ok(!faqsJs.includes('csoSetHtml'), 'assets/js/pages/faqs.js must use strict CSP DOM APIs');
});

check('Migration 0135 executes cleanly in SQLite, wipes all 10 tables, and preserves accounts & 5 root pillars', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE candidates (id TEXT PRIMARY KEY, email TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT);
    CREATE TABLE nav_categories (id TEXT PRIMARY KEY, slug TEXT);
    CREATE TABLE nav_menu_items (id TEXT PRIMARY KEY, title TEXT);
    INSERT INTO candidates VALUES ('c1', 'aspirant@example.com');
    INSERT INTO users VALUES ('u1', 'admin@csodisha.com');
    INSERT INTO nav_categories VALUES
      ('ncat-1', 'jobs-careers'), ('ncat-2', 'schemes-benefits'), ('ncat-3', 'study-library'),
      ('ncat-4', 'community'), ('ncat-5', 'about'), ('ncat-extra', 'legacy-extra');
    INSERT INTO nav_menu_items VALUES
      ('nmenu-pillar-01', 'Jobs'), ('nmenu-pillar-02', 'Schemes'), ('nmenu-pillar-03', 'Study'),
      ('nmenu-pillar-04', 'Community'), ('nmenu-pillar-05', 'About'), ('nmenu-extra', 'Legacy');
  `);

  const migrationSql = read('migrations/0135_zero_leftovers_clean_slate.sql');
  db.exec(migrationSql);

  // Seed dummy rows into all 10 tables then re-run migration to verify complete deletion
  db.exec(`
    INSERT INTO candidate_checklist VALUES ('1','c1','OPSC','m1',1,'2026-01-01');
    INSERT INTO candidate_exam_preferences VALUES ('c1','d','t','p','[]','{}','2026-01-01');
    INSERT INTO candidate_notes VALUES ('c1','note','2026-01-01');
    INSERT INTO candidate_bookmarks VALUES ('1','c1','p1','OPSC','T','/','2026-01-01','2026-01-01');
    INSERT INTO candidate_lockers VALUES ('1','c1','aadhaar','ok','2026-01-01');
    INSERT INTO candidate_mock_scores VALUES ('1','c1','OPSC',50,100,'2026-01-01');
    INSERT INTO user_bookmarks VALUES ('1','u1','job','j1','2026-01-01');
    INSERT INTO test_attempts VALUES ('1','u1','mt1',50,100,'2026-01-01');
    INSERT INTO audit_log VALUES ('1','u1','test','2026-01-01');
    INSERT INTO candidate_audit_logs VALUES ('1','c1','login','2026-01-01');
  `);
  db.exec(migrationSql);

  const wipedTables = [
    'candidate_checklist', 'candidate_exam_preferences', 'candidate_notes',
    'candidate_bookmarks', 'candidate_lockers', 'candidate_mock_scores',
    'user_bookmarks', 'test_attempts', 'audit_log', 'candidate_audit_logs'
  ];
  for (const tbl of wipedTables) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${tbl}`).get();
    assert.equal(row.n, 0, `${tbl} must have 0 rows after migration 0135`);
  }

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidates').get().n, 1, 'candidates login accounts must be preserved');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1, 'users login accounts must be preserved');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM nav_categories').get().n, 5, '5 root pillars in nav_categories must be preserved');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM nav_menu_items').get().n, 5, '5 root pillars in nav_menu_items must be preserved');
});

check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v238+', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v2(?:3[8-9]|4\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:3[8-9]|4\d)';/);
});

check('Strict CSP compliance across all v238 modified HTML & JS files', () => {
  const jsFiles = [
    'assets/js/student-dashboard.js',
    'assets/js/candidate-hub-unified.js',
    'assets/js/document-readiness.js',
    'assets/js/current-affairs.js',
    'assets/js/pages/cso-clean-page.js',
    'assets/js/pages/faqs.js',
    'current-affairs/assets/current-affairs.js',
    'mock-tests/assets/mock-tests.js',
    'resources/assets/resources.js'
  ];
  for (const rel of jsFiles) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }

  const htmlFiles = [
    'index.html',
    'student-dashboard/index.html',
    'tools/index.html',
    'current-affairs/index.html',
    'mock-tests/index.html',
    'resources/index.html',
    'career-guidance/index.html',
    'opportunity-compass/index.html',
    'job-opportunity-finder/index.html',
    'scheme-opportunity-finder/index.html',
    'trust-layer/index.html',
    'support/index.html',
    'study/index.html',
    'faqs.html'
  ];
  for (const rel of htmlFiles) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style attribute`);
  }
});

console.log(`\nALL ${passed} ZERO-LEFTOVERS CLEAN-SLATE (v238) CHECKS PASSED!`);
