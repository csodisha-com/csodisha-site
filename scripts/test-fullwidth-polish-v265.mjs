/**
 * Full-Width Desktop Layout & Filter Bar Polish Verification Suite (v265)
 *
 * Verifies:
 *  1. portal-shell.css expands main portal containers to max-width: min(1600px, calc(100vw - 2.5rem)) !important.
 *  2. schemes-portal.js removes redundant 1. Gov Level dropdown & renders 3-column filter bar (1. Welfare Domain, 2. Benefit Type, 3. Search Schemes).
 *  3. schemes-portal.css, jobs-portal.css & study-portal.css widen search columns (1fr 1fr 1.6fr, 1fr 1fr 1fr 1.5fr, 1fr 1fr 1fr 1fr 1.5fr) and tighten hero padding to 1.5rem 1.75rem.
 *  4. All 8 portal HTML pages link v265 assets & sw.js / ops-sentinel.js are bumped to cso-candidate-cache-v265.
 *  5. Strict CSP compliance across all modified CSS & JS files.
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

console.log('\n=== v265 Full-Width Desktop Layout & Filter Bar Polish Verification ===');

check('1. portal-shell.css expands portal containers to full width', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('max-width: 100% !important;') || css.includes('max-width: min(1600px, calc(100vw - 2.5rem)) !important;'));
  assert.ok(css.includes('padding: 1rem 1rem 3rem !important;') || css.includes('padding: 1.1rem 1.25rem 3rem !important;'));
});

check('2. schemes-portal.js removes redundant 1. Gov Level dropdown & uses clean 3-column filter bar', () => {
  const js = read('assets/js/schemes-portal.js');
  assert.ok(!js.includes("'1. Gov Level'"), 'redundant 1. Gov Level dropdown must be removed');
  assert.ok(js.includes("'1. Welfare Domain'"));
  assert.ok(js.includes("'2. Benefit Type'"));
  assert.ok(js.includes("'3. Search Schemes'"));
  assert.ok(js.includes('Search by scheme name, department, or benefit...'));
});

check('3. Portal CSS widens search columns & tightens hero vertical padding to 1.5rem 1.75rem', () => {
  const sp = read('assets/css/schemes-portal.css');
  assert.ok(sp.includes('grid-template-columns: 1fr 1fr 1.6fr;'));
  assert.ok(sp.includes('padding: 1.5rem 1.75rem;'));
  assert.ok(sp.includes('padding: 0.75rem 1rem;'));

  const jp = read('assets/css/jobs-portal.css');
  assert.ok(jp.includes('grid-template-columns: 1fr 1fr 1fr 1.5fr;'));
  assert.ok(jp.includes('padding: 1.5rem 1.75rem;'));
  assert.ok(jp.includes('padding: 0.75rem 1rem;'));

  const st = read('assets/css/study-portal.css');
  assert.ok(st.includes('grid-template-columns: 1fr 1fr 1fr 1fr 1.5fr;'));
  assert.ok(st.includes('padding: 1.5rem 1.75rem;'));

  assert.ok(read('assets/css/community-portal.css').includes('padding: 1.5rem 1.75rem;'));
  assert.ok(read('assets/css/about-portal.css').includes('padding: 1.5rem 1.75rem;'));
});

check('4. All 8 portal HTML pages link v265 assets & sw.js / ops-sentinel.js bumped to cso-candidate-cache-v265', () => {
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
    assert.ok(/\/assets\/css\/portal-shell\.css\?v=20261124v26[5-9]/.test(html), `${file} missing portal-shell v265+`);
    assert.ok(new RegExp(`/assets/css/${key}-portal\\.css\\?v=20261124v26[5-9]`).test(html), `${file} missing ${key}-portal.css v265+`);
    assert.ok(new RegExp(`/assets/js/${key}-portal\\.js\\?v=20261124v26[5-9]`).test(html), `${file} missing ${key}-portal.js v265+`);
  }
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v26[5-9]';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v26[5-9]';/.test(read('functions/_lib/ops-sentinel.js')));
});

check('5. Strict CSP compliance across schemes-portal.js', () => {
  const codeOnly = read('assets/js/schemes-portal.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
    assert.ok(!codeOnly.includes(bad), `schemes-portal.js violates strict CSP: ${bad}`);
  }
});

console.log(`\n=== v265 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
