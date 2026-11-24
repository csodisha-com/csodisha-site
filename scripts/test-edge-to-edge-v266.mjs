/**
 * 100% Full-Screen Edge-to-Edge Portal Width & Auto-Fill Grids Verification Suite (v266)
 *
 * Verifies:
 *  1. portal-shell.css sets width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; padding: 1rem 1rem 3rem !important across all outer and inner portal containers.
 *  2. All 5 portal stylesheets expand multi-column card grids smoothly via repeat(auto-fill, minmax(320px, 1fr)).
 *  3. All 8 portal HTML pages link v266 CSS assets & sw.js / ops-sentinel.js are bumped to cso-candidate-cache-v266.
 *  4. Strict CSP compliance across all 8 portal HTML pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

console.log('\n=== v266 100% Full-Screen Edge-to-Edge Portal Width Verification ===');

check('1. portal-shell.css enforces 100% edge-to-edge width across all outer and inner portal wrappers', () => {
  const css = read('assets/css/portal-shell.css');
  for (const sel of [
    '.cso-jobs-main',
    '.cso-schemes-main',
    '.cso-comm-main',
    '.cso-about-main',
    '.cso-study-hub',
    '.app-shell > .workspace > .main-content',
    '#cso-jobs-portal-root',
    '#cso-schemes-portal-root',
    '#cso-study-portal-root',
    '#cso-community-portal-root',
    '#cso-about-portal-root'
  ]) {
    assert.ok(css.includes(sel), `portal-shell.css missing ${sel}`);
  }
  assert.ok(css.includes('max-width: 100% !important;'));
  assert.ok(css.includes('margin-left: 0 !important;'));
  assert.ok(css.includes('margin-right: 0 !important;'));
  assert.ok(css.includes('padding: 1rem 1rem 3rem !important;'));
  assert.ok(!css.includes('max-width: min(1600px'), 'must remove 1600px cap');
});

check('2. Portal card grids expand smoothly with repeat(auto-fill, minmax(320px, 1fr))', () => {
  for (const cssFile of [
    'assets/css/jobs-portal.css',
    'assets/css/schemes-portal.css',
    'assets/css/study-portal.css',
    'assets/css/about-portal.css'
  ]) {
    const css = read(cssFile);
    assert.ok(css.includes('grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));'), `${cssFile} must use auto-fill 320px grid`);
  }
});

check('3. All 8 portal HTML pages link v266 CSS & sw.js / ops-sentinel.js bumped to cso-candidate-cache-v266', () => {
  for (const [file, key] of [
    ['jobs/index.html', 'jobs'],
    ['jobs-careers/index.html', 'jobs'],
    ['schemes/index.html', 'schemes'],
    ['schemes-benefits/index.html', 'schemes'],
    ['study-library/index.html', 'study'],
    ['study/index.html', 'study'],
    ['community/index.html', 'community'],
    ['about/index.html', 'about']
  ]) {
    const html = read(file);
    assert.ok(html.includes('/assets/style.css?v=20261124v266'), `${file} missing style.css v266`);
    assert.ok(html.includes('/assets/css/portal-shell.css?v=20261124v266'), `${file} missing portal-shell v266`);
    assert.ok(html.includes(`/assets/css/${key}-portal.css?v=20261124v266`), `${file} missing ${key}-portal.css v266`);
  }
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v266';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v266';"));
});

check('4. Strict CSP compliance across all 8 portal HTML pages', () => {
  for (const file of [
    'jobs/index.html',
    'jobs-careers/index.html',
    'schemes/index.html',
    'schemes-benefits/index.html',
    'study-library/index.html',
    'study/index.html',
    'community/index.html',
    'about/index.html'
  ]) {
    const html = read(file);
    assert.ok(!/\sstyle\s*=/i.test(html), `${file} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${file} contains inline on*=`);
  }
});

console.log(`\n=== v266 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
