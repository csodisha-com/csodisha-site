#!/usr/bin/env node
/**
 * v286 Verification Suite:
 * 1. migrations/0021_study_library_4tracks.sql keeps ONLY 4 active L1 tracks in exact sort order:
 *      1. Central Competitive Exams (central-competitive-exams)
 *      2. Odisha State Exams        (odisha-state-exams)
 *      3. Teaching & Educator Exams (teaching-educator-exams)
 *      4. School & Board Exams      (school-board-notes)
 *    and retires skill-coding-digital & previous-papers-mock-tests (is_published = 0).
 * 2. Public Study Library ▾ dropdown (shared-header.js & app.js) renders ONLY those 5 items
 *    (4 tracks + All Study Resources) with no Stage 2 slideout and cso_study_library_dropdown_v286 cache key.
 * 3. /study-library/ track pill strip shows only the 4 active tracks + All Tracks, while Resource Type <select>
 *    preserves Study Notes, Previous Year Paper (PYQ), Official Syllabus, Current Affairs Digest & Practice Set / E-Book.
 * 4. Admin Studio #studyLibrarySidebarSubnav & Study Publishing Studio mirror the 4 active tracks & bust v286 cache.
 * 5. ?v=20261125v286 cache busting, cso-candidate-cache-v286 & strict CSP compliance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { handlePublicStudyBootstrapApi } from '../functions/_lib/study-publishing-house.js';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(read('migrations/0140_study_library_publishing_house.sql'));
  sqlite.exec(read('migrations/0020_study_library_6track_taxonomy.sql'));
  sqlite.exec(read('migrations/0021_study_library_4tracks.sql'));

  function makeStmt(sql, params = []) {
    return {
      bind(...args) { return makeStmt(sql, args); },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() {
        const info = sqlite.prepare(sql).run(...params);
        return { success: true, meta: { changes: info.changes } };
      }
    };
  }
  return {
    sqlite,
    prepare(sql) { return makeStmt(sql, []); },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.all().catch(() => s.run()));
      return out;
    }
  };
}

console.log('\n=== v286 Study Library 4-Track / 5-Item Refinement Tests ===\n');

await check('1. Migration 0021 emits ONLY the 4 canonical active L1 tracks in exact sort order', async () => {
  const db = createMockD1();
  const env = { DB: db };
  const res = await handlePublicStudyBootstrapApi(new Request('https://csodisha.com/api/public/study-library/bootstrap'), env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.nav_tracks.length, 4, `Expected 4 active L1 tracks, got ${data.nav_tracks.length}`);
  assert.deepEqual(
    data.nav_tracks.map(t => [t.slug, t.title_en, t.sort_order]),
    [
      ['central-competitive-exams', 'Central Competitive Exams', 10],
      ['odisha-state-exams', 'Odisha State Exams', 20],
      ['teaching-educator-exams', 'Teaching & Educator Exams', 30],
      ['school-board-notes', 'School & Board Exams', 40]
    ]
  );

  // Confirm retired slugs are is_published = 0
  const retired = db.sqlite.prepare(
    "SELECT slug, is_published FROM study_taxonomy_nodes WHERE slug IN ('skill-coding-digital', 'previous-papers-mock-tests') ORDER BY slug"
  ).all();
  assert.equal(retired.length, 2);
  retired.forEach(r => assert.equal(Number(r.is_published), 0, `${r.slug} must be unpublished`));

  // Confirm idempotency
  db.sqlite.exec(read('migrations/0021_study_library_4tracks.sql'));
  const data2 = await (await handlePublicStudyBootstrapApi(new Request('https://csodisha.com/api/public/study-library/bootstrap'), env)).json();
  assert.equal(data2.nav_tracks.length, 4);
});

await check('2. shared-header.js & app.js default tracks & cache key enforce exact 5-item Study Library ▾ dropdown', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    assert.ok(src.includes('cso_study_library_dropdown_v286'), `${rel} missing v286 cache key`);
    assert.ok(src.includes('School & Board Exams'), `${rel} missing updated School & Board Exams title`);
    assert.ok(src.includes('All Study Resources'), `${rel} missing All Study Resources 5th item`);
    assert.ok(!src.includes('cso-study-stage2'), `${rel} must NOT include Stage 2 slideout`);
    const idxCentral = src.indexOf("slug: 'central-competitive-exams'") !== -1
      ? src.indexOf("slug: 'central-competitive-exams'")
      : src.indexOf("slug:'central-competitive-exams'");
    const idxOdisha = src.indexOf("slug: 'odisha-state-exams'") !== -1
      ? src.indexOf("slug: 'odisha-state-exams'")
      : src.indexOf("slug:'odisha-state-exams'");
    assert.ok(idxCentral > 0 && idxOdisha > idxCentral, `${rel} must order Central Competitive Exams before Odisha State Exams`);
  }
});

await check('3. /study-library/ keeps PYQ & all 5 Resource Types while filtering retired tracks from pill strip', () => {
  const sp = read('assets/js/study-portal.js');
  for (const rt of ['Study Notes', 'Previous Year Paper (PYQ)', 'Official Syllabus', 'Current Affairs Digest', 'Practice Set / E-Book']) {
    assert.ok(sp.includes(rt), `study-portal.js missing Resource Type option: ${rt}`);
  }
  assert.ok(sp.includes("n.slug !== 'skill-coding-digital'"), 'study-portal.js must guard against retired skill-coding-digital');
  assert.ok(sp.includes("n.slug !== 'previous-papers-mock-tests'"), 'study-portal.js must guard against retired previous-papers-mock-tests');
});

await check('4. Admin Studio sidebar & Study Publishing Studio mirror 4 tracks & bust v286 cache', () => {
  const adminJs = read('admin/admin.js');
  const studioJs = read('admin/study-publishing-studio.js');
  assert.ok(adminJs.includes('School & Board Exams'), 'admin.js missing School & Board Exams');
  assert.ok(!adminJs.includes('stl_l1_skill_coding'), 'admin.js must not include retired skill_coding default');
  assert.ok(!adminJs.includes('stl_l1_pyq_mocks'), 'admin.js must not include retired pyq_mocks default');
  assert.ok(studioJs.includes('cso_study_library_dropdown_v286'), 'study-publishing-studio.js must bust v286 cache');
});

await check('5. ?v=20261125v286+ cache busting, cso-candidate-cache-v286+ & strict CSP compliance', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v28[6-9]';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v28[6-9]';/);
  assert.match(read('index.html'), /\/assets\/style\.css\?v=20261125v28[6-9]/);
  assert.match(read('index.html'), /\/assets\/app\.js\?v=20261125v28[6-9]/);
  assert.match(read('study-library/index.html'), /\/assets\/shared-header\.js\?v=20261125v28[6-9]/);
  assert.match(read('study-library/index.html'), /\/assets\/js\/study-portal\.js\?v=20261125v28[6-9]/);
  assert.match(read('admin/index.html'), /admin\.js\?v=20261125v28[6-9]/);
  assert.match(read('admin/index.html'), /study-publishing-studio\.js\?v=20261125v28[6-9]/);

  for (const rel of ['assets/shared-header.js', 'assets/app.js', 'assets/js/study-portal.js', 'admin/admin.js', 'admin/study-publishing-studio.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v286 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
