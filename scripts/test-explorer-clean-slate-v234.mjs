#!/usr/bin/env node
/**
 * Regression & Verification Suite for Final Explorer Clean-Slate (v234)
 * Verifies:
 *  1. Zero occurrences of legacy hardcoded Study Library / Explorer titles, track lists,
 *     or inflated counts ("Odisha History, Geography, Polity & Art Heritage Master Notes",
 *     "OSSC CGL & Combined Technical", "145 Topics", "Explore Live Study Materials",
 *     "14 Verified Materials") anywhere in public explorers, assets/js/, functions/, or seeders.
 *  2. Zero dead hardcoded SEED_* / STARTER_* data arrays in backend studio, edu, early-childhood,
 *     or seed-odisha modules.
 *  3. Study Library SSR never inflates counts (EARLY_CHILDHOOD_SHOWCASE_COUNT === 0) and
 *     resolveEarlyChildhoodRoute() returns null so every route is strictly D1-backed.
 *  4. All 5 section explorers (jobs-careers, schemes-benefits, study-library, community, about)
 *     wire live /api/nav/config + D1 directory APIs and render the clean CSP-safe empty state
 *     ("No items published yet — add categories or content in Admin Studio") when D1 is empty.
 *  5. Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v234.
 *  6. Strict CSP compliance across all modified public JS & HTML files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  EARLY_CHILDHOOD_SHOWCASE_COUNT,
  EARLY_CHILDHOOD_STAGES,
  EARLY_CHILDHOOD_SEED_ITEMS,
  resolveEarlyChildhoodRoute
} from '../functions/_lib/study-early-childhood-pack.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    if (['node_modules', '.git', '.wrangler'].includes(e.name)) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(js|mjs|html|json)$/.test(e.name)) out.push(rel);
  }
  return out;
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

console.log('=== CSO Final Explorer Clean-Slate Verification Suite (v234) ===');

check('Zero forbidden Study Library / Explorer hardcoded titles or inflated counts in public dirs, assets/js, functions & seeders', () => {
  const forbidden = [
    'Odisha History, Geography, Polity & Art Heritage Master Notes',
    'OSSC CGL & Combined Technical',
    '145 Topics',
    'Explore Live Study Materials',
    '14 Verified Materials'
  ];
  const scanFiles = [
    ...walk('study-library'),
    ...walk('jobs-careers'),
    ...walk('schemes-benefits'),
    ...walk('community'),
    ...walk('about'),
    ...walk('assets/js'),
    ...walk('functions'),
    'scripts/seed-study-library-d1.mjs'
  ];
  for (const rel of scanFiles) {
    const src = read(rel);
    for (const phrase of forbidden) {
      assert.ok(!src.includes(phrase), `${rel} must not contain forbidden hardcoded string: "${phrase}"`);
    }
  }
});

check('Early Childhood showcase pack neutralized (0 hardcoded count, empty stages/items, null route bypass)', () => {
  assert.equal(EARLY_CHILDHOOD_SHOWCASE_COUNT, 0);
  assert.deepEqual(EARLY_CHILDHOOD_STAGES, []);
  assert.deepEqual(EARLY_CHILDHOOD_SEED_ITEMS, []);
  assert.equal(resolveEarlyChildhoodRoute(['early-childhood-primary-education']), null);
  const ssrSrc = read('functions/_lib/study-library-ssr.js');
  assert.ok(!ssrSrc.includes('Math.max(Number(folder.total_item_count || 0), EARLY_CHILDHOOD_SHOWCASE_COUNT)'),
    'study-library-ssr.js must not inflate counts with EARLY_CHILDHOOD_SHOWCASE_COUNT');
  assert.ok(!ssrSrc.includes('All 10 Study Tracks'), 'study-library-ssr.js must not reference 10 hardcoded study tracks');
});

check('All dead hardcoded SEED_* / STARTER_* literals purged from backend studio, edu & seed-odisha modules', () => {
  const expectedEmpty = [
    ['functions/_lib/jobs-directory-studio.js', 'const SEED_TREE_BY_DOMAIN = {};'],
    ['functions/_lib/jobs-directory-studio.js', 'const SEED_ITEMS_BY_DOMAIN = {};'],
    ['functions/_lib/schemes-directory-studio.js', 'const SEED_FOLDERS_BY_DOMAIN = {};'],
    ['functions/_lib/schemes-directory-studio.js', 'const SEED_ITEMS_BY_DOMAIN = {};'],
    ['functions/_lib/study-library-studio.js', 'const SEED_TREE = [];'],
    ['functions/_lib/community-directory-studio.js', 'const SEED_FOLDERS_BY_DOMAIN = {};'],
    ['functions/_lib/community-directory-studio.js', 'const SEED_ITEMS_BY_DOMAIN = {};'],
    ['functions/_lib/edu-resources-batch1.js', 'const STARTER_RESOURCES = [];'],
    ['functions/_lib/edu-resources-batch2.js', 'const STARTER_EXAMS = [];'],
    ['functions/_lib/edu-resources-batch3.js', 'const STARTER_SYLLABI = [];'],
    ['functions/_lib/edu-resources-batch4.js', 'const STARTER_MOCK_TESTS = [];'],
    ['functions/_lib/edu-resources-batch5.js', 'const STARTER_SCHOLARSHIPS = [];'],
    ['functions/_lib/edu-resources-batch6.js', 'const STARTER_TOOLS = [];'],
    ['functions/api/admin/seed-odisha.js', 'const SEED_JOBS = [];']
  ];
  for (const [rel, snippet] of expectedEmpty) {
    assert.ok(read(rel).includes(snippet), `${rel} missing empty registry: ${snippet}`);
  }
});

check('All 5 section explorers sync live /api/nav/config & D1 APIs and show clean Admin Studio empty state', () => {
  const explorers = [
    'jobs-careers/assets/dashboard.js',
    'schemes-benefits/assets/dashboard.js',
    'study-library/assets/dashboard.js',
    'community/assets/dashboard.js',
    'about/assets/dashboard.js'
  ];
  for (const rel of explorers) {
    const src = read(rel);
    assert.ok(src.includes("'/api/nav/config'"), `${rel} must hydrate live categories from /api/nav/config`);
    assert.ok(src.includes('No items published yet — add categories or content in Admin Studio.'),
      `${rel} must render clean Admin Studio empty state`);
  }
});

check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v234+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:3[4-9]|[4-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:3[4-9]|[4-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

check('Strict CSP compliance across all v234 modified public JS & HTML files', () => {
  for (const rel of [
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
  const slHtml = read('study-library/index.html');
  assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(slHtml), 'study-library/index.html has inline event handler');
  assert.ok(!/\sstyle="/i.test(slHtml), 'study-library/index.html has inline style attribute');
});

console.log(`\nALL ${passed} EXPLORER CLEAN-SLATE (v234) CHECKS PASSED!`);
