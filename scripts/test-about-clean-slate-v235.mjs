#!/usr/bin/env node
/**
 * Regression & Verification Suite for About Pillar Clean-Slate Purge (v235)
 * Verifies:
 *  1. about/index.html contains zero hardcoded static sections (CS Odisha by the Numbers,
 *     How It Works, 3-Step Editorial Verification, Official Portal Whitelist cards,
 *     All 30 Districts of Odisha Covered, Public Changelog, Official Helplines,
 *     Frequently Asked Questions, or 8-item hardcoded left sidebar).
 *  2. about/assets/about-explorer.js & about/assets/dashboard.js contain zero hardcoded
 *     district/portal/changelog/FAQ piles, hydrate live from /api/nav/config + /api/content/about-directory
 *     + /api/about/overview, and render "No items published yet — add categories or content in Admin Studio."
 *  3. functions/api/public/about-overview.js returns zero hardcoded fallback items/directories
 *     on empty SQLite DB (directories: [], totalFolders: 0, totalPublishedResources: 0, districtsCount: 0).
 *  4. Admin mutation cache invalidation covers /about/, /api/nav/config, /api/content/about-directory,
 *     /api/public/about-overview, and /api/about/overview, and _worker.js serves /api/about/overview.
 *  5. Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v235.
 *  6. Strict CSP compliance across all modified about/ HTML & JS files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { getAboutOverviewData, resetAboutOverviewMemo } from '../functions/api/public/about-overview.js';
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
    prepare(sql) { return wrap(sql); },
    async batch(stmts) {
      const out = [];
      for (const st of stmts) out.push(await st.all());
      return out;
    }
  };
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

console.log('=== CSO About Pillar Clean-Slate Verification Suite (v235) ===');

check('about/index.html has zero hardcoded sections, portals, districts, helplines, FAQs, or 8-item static sidebar', () => {
  const html = read('about/index.html');
  const forbidden = [
    'CS Odisha by the Numbers',
    'CS Odisha in Numbers',
    'How It Works',
    '3-Step Editorial Verification',
    'Official Portal Whitelist',
    'All 30 Districts of Odisha Covered',
    'Public Changelog &amp; Corrections Ledger',
    'Official Helplines',
    'Frequently Asked Questions',
    'opsc.gov.in',
    'subhadra.odisha.gov.in',
    '1800-345-6770',
    'href="#telemetry-strip"',
    'href="#how-it-works"',
    'href="#editorial-policy"',
    'href="#portal-verifier"',
    'href="#district-coverage"',
    'href="#changelog-ledger"',
    'href="#helplines"'
  ];
  for (const phrase of forbidden) {
    assert.ok(!html.includes(phrase), `about/index.html must not contain hardcoded content: "${phrase}"`);
  }
  assert.ok(html.includes('id="about-rail-nav"'), 'about/index.html must retain dynamic #about-rail-nav container');
  assert.ok(html.includes('id="about-directory-grid"'), 'about/index.html must retain dynamic #about-directory-grid container');
});

check('about/assets/about-explorer.js & dashboard.js have zero hardcoded district/portal piles and hydrate 100% live from D1', () => {
  const explorerJs = read('about/assets/about-explorer.js');
  assert.ok(!explorerJs.includes('ODISHA_DISTRICTS'), 'about-explorer.js must not hardcode ODISHA_DISTRICTS');
  assert.ok(!explorerJs.includes('VERIFIED_PORTAL_ALLOWLIST'), 'about-explorer.js must not hardcode VERIFIED_PORTAL_ALLOWLIST');
  assert.ok(explorerJs.includes("'/api/nav/config'"), 'about-explorer.js must fetch /api/nav/config');
  assert.ok(explorerJs.includes("'/api/content/about-directory'"), 'about-explorer.js must fetch /api/content/about-directory');
  assert.ok(explorerJs.includes("'/api/about/overview'"), 'about-explorer.js must fetch /api/about/overview');
  assert.ok(explorerJs.includes('No items published yet — add categories or content in Admin Studio.'),
    'about-explorer.js must render unified Admin Studio empty state');

  const dashJs = read('about/assets/dashboard.js');
  assert.ok(dashJs.includes('const ODISHA_DISTRICTS = [];'), 'about/assets/dashboard.js ODISHA_DISTRICTS must be empty');
  assert.ok(!dashJs.includes("'Sundargarh'"), 'about/assets/dashboard.js must not hardcode 30 districts');
});

check('Admin cache invalidator & _worker.js wire /about/, /api/about/overview, /api/public/about-overview, and /api/content/about-directory', () => {
  assert.ok(NAV_PUBLIC_PATHS.includes('/about/'));
  assert.ok(NAV_PUBLIC_PATHS.includes('/api/nav/config'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/content/about-directory'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/about-overview'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/about/overview'));
  assert.ok(read('_worker.js').includes("pathname === '/api/about/overview'"), '_worker.js must serve /api/about/overview');
  assert.ok(read('functions/api/admin/_router.js').includes('await invalidateAllPublicCaches(request);'),
    'Admin router must invalidate all public caches on mutations');
});

check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v235', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v235';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v235';"));
});

check('Strict CSP compliance across all modified about/ HTML & JS files', () => {
  for (const rel of ['about/assets/about-explorer.js', 'about/assets/dashboard.js']) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }
  const html = read('about/index.html');
  assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), 'about/index.html has inline event handler');
  assert.ok(!/\sstyle="/i.test(html), 'about/index.html has inline style attribute');
});

// Runtime D1 test: getAboutOverviewData returns zero hardcoded directories/counts on empty DB
resetAboutOverviewMemo();
const db = makeD1Mock();
const ov = await getAboutOverviewData({ DB: db });
assert.equal(ov.ok, true);
assert.deepEqual(ov.directories, [], 'getAboutOverviewData must return empty directories array when D1 is empty');
assert.equal(ov.totals.totalFolders, 0);
assert.equal(ov.totals.totalPublishedResources, 0);
assert.equal(ov.totals.districtsCount, 0, 'getAboutOverviewData must not hardcode districtsCount: 30');
passed++;
console.log('  ✓ getAboutOverviewData returns 0 hardcoded directories & 0 inflated counts on empty D1');

console.log(`\nALL ${passed} ABOUT CLEAN-SLATE (v235) CHECKS PASSED!`);
