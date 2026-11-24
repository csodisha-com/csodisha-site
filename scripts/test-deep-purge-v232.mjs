#!/usr/bin/env node
/**
 * Regression & Verification Suite for Site-Wide Deep Purge (v232)
 * Verifies:
 *  1. Zero hardcoded directory trees, job/scheme/study/community cards, or bulky static datasets
 *     remain in data/, admin/data/, study/generated/, assets/js/, study-library/, and all HTML hubs.
 *  2. Zero runtime auto-seeders populate D1 tables when fresh studio/edu/content schemas initialize.
 *  3. Public overview APIs return empty domains/items (0 phantom categories) when D1 is empty.
 *  4. Service Worker cache version bumped to cso-candidate-cache-v232 (matching ops-sentinel.js).
 *  5. Strict CSP compliance across all modified public JS & HTML files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

import { ensureLiveOdishaDirectoryContentSeeded } from '../functions/_lib/odisha-directory-seed.js';
import {
  ensureJobsDirectoryStudioSchema,
  listPublicJobsOverview,
  listPublicJobsItems
} from '../functions/_lib/jobs-directory-studio.js';
import {
  ensureSchemesDirectoryStudioSchema,
  listPublicSchemesOverview,
  listPublicSchemesItems
} from '../functions/_lib/schemes-directory-studio.js';
import { ensureStudyLibraryStudioSchema } from '../functions/_lib/study-library-studio.js';
import {
  ensureCommunityDirectoryStudioSchema,
  listPublicCommunityOverview,
  listPublicCommunityItems
} from '../functions/_lib/community-directory-studio.js';
import { ensureEduResourcesBatch6Schema, getFull22ModuleOverview } from '../functions/_lib/edu-resources-batch6.js';
import { CONTENT_PUBLIC_PATHS, NAV_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);

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

console.log('=== CSO Deep Purge Verification Suite (v232) ===');

// 1. Static JSON & JS data files purged
check('data/cso-knowledge-index.json & data/latest-updates.json are empty', () => {
  const kb = JSON.parse(read('data/cso-knowledge-index.json'));
  assert.deepEqual(kb.records, []);
  const lu = JSON.parse(read('data/latest-updates.json'));
  assert.deepEqual(lu, []);
  const studyDir = JSON.parse(read('study/generated/directory.json'));
  assert.deepEqual(studyDir.navigation, []);
});

check('admin/data/seed-*.json and fallback-trees.js are purged to empty registries', () => {
  for (const rel of [
    'admin/data/seed-jobs-careers.json',
    'admin/data/seed-jobs-careers-compact.json',
    'admin/data/seed-schemes-benefits.json',
    'admin/data/seed-schemes-benefits-compact.json',
    'admin/data/seed-study-library.json',
    'admin/data/seed-study-library-compact.json',
    'admin/data/seed-community.json',
    'admin/data/seed-community-compact.json'
  ]) {
    const parsed = JSON.parse(read(rel));
    assert.deepEqual(parsed, [], `${rel} must be empty array`);
  }
  const fb = read('admin/data/fallback-trees.js');
  assert.ok(!fb.includes('Career Explorer'), 'fallback-trees.js must not contain Career Explorer');
  assert.ok(fb.length < 600, `fallback-trees.js should be lightweight, got ${fb.length}B`);
});

check('Study Library, CBT, Courses, Glossary, District GK & Content Dossier datasets are empty', () => {
  const vault = require(path.join(ROOT, 'study-library/assets/syllabus-pyq-vault.js'));
  assert.deepEqual(vault.VAULT, []);
  const si = require(path.join(ROOT, 'study-library/assets/study-interactive.js'));
  assert.deepEqual(si.CURATED_FLASHCARDS, []);
  const cbtPacks = require(path.join(ROOT, 'study-library/cbt-mock-test/assets/cbt-exam-packs.js'));
  assert.deepEqual(cbtPacks.EXAM_PACKS, []);
  const glossary = require(path.join(ROOT, 'assets/js/odia-glossary.js'));
  assert.deepEqual(glossary.GLOSSARY_TERMS, []);
  const dgk = require(path.join(ROOT, 'assets/js/odisha-district-gk.js'));
  assert.deepEqual(dgk.DISTRICTS_GK, []);
  for (const coursePath of [
    'study-library/early-childhood-education/assets/course.js',
    'study-library/opsc-oas/assets/course.js',
    'study-library/osssc-ri-ari-amin/assets/course.js',
    'study-library/odisha-police-oprb/assets/course.js',
    'study-library/otet-osstet/assets/course.js'
  ]) {
    const mod = require(path.join(ROOT, coursePath));
    const arr = mod.ECE_MODULES || mod.MODULES;
    assert.deepEqual(arr, [], `${coursePath} must export empty modules array`);
  }
  const dossierSrc = read('assets/js/content-dossier.js');
  assert.ok(dossierSrc.includes('var HUB_SUBTRACK_DOSSIERS = {};'), 'HUB_SUBTRACK_DOSSIERS must be empty');
  assert.ok(!dossierSrc.includes('hub-rrb-ntpc-railway'), 'content-dossier.js must not contain hardcoded RRB NTPC card');
});

check('Public HTML hubs contain zero hardcoded content piles or phantom category counts', () => {
  const home = read('index.html');
  assert.ok(!home.includes('Ravenshaw University ITEP'), 'index.html must not contain hardcoded Ravenshaw notice');
  assert.ok(!home.includes('Cyclone Arnab'), 'index.html must not contain hardcoded Cyclone Arnab notice');
  assert.ok(home.includes('No items published yet'), 'index.html must render clean empty state');

  const slHtml = read('study-library/index.html');
  assert.ok(!slHtml.includes('1,681'), 'study-library/index.html must not reference 1,681 static nodes');
  assert.ok(!slHtml.includes('course-hubs-showcase'), 'study-library/index.html must not hardcode course-hubs-showcase');

  const jobsHtml = read('jobs/index.html');
  assert.ok(!jobsHtml.includes('Explore All 8 Career Categories'), 'jobs/index.html must not hardcode 8 categories');

  const schemesHtml = read('schemes/index.html');
  assert.ok(!schemesHtml.includes('Explore All 8 Scheme Categories'), 'schemes/index.html must not hardcode 8 categories');
  assert.ok(!schemesHtml.includes('CM-KISAN / KALIA'), 'schemes/index.html must not hardcode CM-KISAN pill');

  const commHtml = read('community/index.html');
  assert.ok(!commHtml.includes('Explore All 10 Community Domains'), 'community/index.html must not hardcode 10 domains');

  const examHtml = read('study/examinations/index.html');
  assert.ok(!examHtml.includes('OAVS Recruitment'), 'study/examinations/index.html must not hardcode OAVS card');
  assert.ok(examHtml.includes('No items published yet'), 'study/examinations/index.html must render clean empty state');

  const aboutJs = read('about/assets/about-explorer.js');
  assert.ok(!aboutJs.includes('const fallback = ['), 'about-explorer.js must not contain static fallback arrays');
});

check('Service Worker and ops-sentinel cache version bumped to cso-candidate-cache-v232+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v23[2-9]';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v23[2-9]';/.test(read('functions/_lib/ops-sentinel.js')));
});

check('Migration 0133 exists and edge cache invalidator covers all public API routes', () => {
  const mig = read('migrations/0133_deep_purge_seeded_directories.sql');
  assert.ok(mig.includes('DELETE FROM jobs_directory_items'));
  assert.ok(mig.includes('DELETE FROM schemes_directory_items'));
  assert.ok(mig.includes('DELETE FROM study_library_items'));
  assert.ok(mig.includes('DELETE FROM community_directory_items'));
  assert.ok(NAV_PUBLIC_PATHS.includes('/jobs/'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/edu/resources'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/jobs-directory/overview'));
});

check('Strict CSP compliance across all v232 modified public JS & HTML files', () => {
  const jsFiles = [
    'jobs/assets/jobs-explorer.js',
    'schemes/assets/schemes-explorer.js',
    'community/assets/community-explorer.js',
    'about/assets/about-explorer.js',
    'study-library/assets/course-hub.js',
    'study-library/assets/syllabus-pyq-vault.js',
    'study-library/assets/study-interactive.js',
    'study-library/cbt-mock-test/assets/cbt-exam-packs.js',
    'study-library/cbt-mock-test/assets/cbt.js',
    'study-library/early-childhood-education/assets/course.js',
    'study-library/opsc-oas/assets/course.js',
    'study-library/osssc-ri-ari-amin/assets/course.js',
    'study-library/odisha-police-oprb/assets/course.js',
    'study-library/otet-osstet/assets/course.js',
    'assets/js/odia-glossary.js',
    'assets/js/odisha-district-gk.js',
    'assets/js/content-dossier.js',
    'admin/data/fallback-trees.js'
  ];
  for (const rel of jsFiles) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }
  for (const htmlRel of [
    'index.html', 'jobs/index.html', 'schemes/index.html', 'schemes-benefits/index.html',
    'study-library/index.html', 'study/index.html', 'study/examinations/index.html',
    'community/index.html', 'mock-tests/index.html'
  ]) {
    const html = read(htmlRel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${htmlRel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${htmlRel} has inline style attribute`);
  }
});

// 2. Runtime SQLite checks: zero auto-seeding across all studio & edu schemas
const db = makeD1Mock();
const env = { DB: db };

const seedRes = await ensureLiveOdishaDirectoryContentSeeded(db);
assert.equal(seedRes.skipped, true, 'ensureLiveOdishaDirectoryContentSeeded must be a no-op');
assert.equal(seedRes.jobsSeeded, 0);
assert.equal(seedRes.schemesSeeded, 0);
assert.equal(seedRes.studySeeded, 0);
passed++;
console.log('  ✓ ensureLiveOdishaDirectoryContentSeeded is a clean no-op');

await ensureJobsDirectoryStudioSchema(db);
const jobsOv = await listPublicJobsOverview(env);
const jobsItems = await listPublicJobsItems(env, {});
assert.deepEqual(jobsOv.domains, [], 'Jobs overview domains must be empty on clean D1');
assert.equal(jobsOv.totals.totalFolders, 0);
assert.equal(jobsOv.totals.totalPublished, 0);
assert.equal((jobsItems.items || []).length, 0);
passed++;
console.log('  ✓ Jobs Directory Studio seeds 0 folders & 0 items on fresh D1');

await ensureSchemesDirectoryStudioSchema(db);
const schOv = await listPublicSchemesOverview(env);
const schItems = await listPublicSchemesItems(env, {});
assert.deepEqual(schOv.domains, [], 'Schemes overview domains must be empty on clean D1');
assert.equal(schOv.totals.totalFolders, 0);
assert.equal(schOv.totals.totalPublished, 0);
assert.equal((schItems.items || []).length, 0);
passed++;
console.log('  ✓ Schemes Directory Studio seeds 0 folders & 0 items on fresh D1');

await ensureStudyLibraryStudioSchema(db);
const slFolders = await db.prepare('SELECT COUNT(*) AS n FROM study_library_folders').first();
const slItems = await db.prepare('SELECT COUNT(*) AS n FROM study_library_items').first();
assert.equal(Number(slFolders.n), 0);
assert.equal(Number(slItems.n), 0);
passed++;
console.log('  ✓ Study Library Studio seeds 0 folders & 0 items on fresh D1');

await ensureCommunityDirectoryStudioSchema(db);
const commOv = await listPublicCommunityOverview(env);
const commItems = await listPublicCommunityItems(env, {});
assert.deepEqual(commOv.domains, [], 'Community overview domains must be empty on clean D1');
assert.equal(commOv.totals.totalFolders, 0);
assert.equal(commOv.totals.totalPublished, 0);
assert.equal((commItems.items || []).length, 0);
passed++;
console.log('  ✓ Community Directory Studio seeds 0 folders & 0 items on fresh D1');

await ensureEduResourcesBatch6Schema(db);
const eduOv = await getFull22ModuleOverview(env);
for (const [k, v] of Object.entries(eduOv.modules || {})) {
  const count = Number(v?.total ?? v?.count ?? 0);
  assert.equal(count, 0, `Edu module ${k} must have 0 auto-seeded rows on fresh D1 (got ${count})`);
}
passed++;
console.log('  ✓ Edu Resources Batches 1–6 seed 0 starter rows on fresh D1');

console.log(`\nALL ${passed} DEEP PURGE (v232) CHECKS PASSED!`);
