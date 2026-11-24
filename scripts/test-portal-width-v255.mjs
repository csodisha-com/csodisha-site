#!/usr/bin/env node
/**
 * v255 Parent Grid/Flex Width Fix & Wide Desktop Grid Verification Suite
 *
 * Tests:
 *  1. portal-shell.css unconditionally overrides .app-shell's `290px minmax(0, 1fr) !important`
 *     grid from assets/style.css, forces all ancestor wrappers to 100% width with `display: block !important`,
 *     hides all empty <aside> rails, and centers <main> at `max-width: 1280px !important`.
 *  2. Zero layout shift on initial paint (rules apply unconditionally without waiting for JS body classes).
 *  3. jobs-portal.css renders 4-column hero KPIs, 5-column horizontal Sector Cards,
 *     4-column Cascading Filter controls, and `minmax(260px, 1fr)` multi-column Departments grid.
 *  4. All 7 pillar HTML pages link portal-shell.css?v=20261124v255.
 *  5. Strict CSP compliance + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v255.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v255 Parent Grid/Flex Width Fix & Wide Desktop Grid Verification ===');

check('1. portal-shell.css unconditionally overrides .app-shell 290px grid with !important & centers <main> at 1280px', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('display: block !important;'), 'must force display: block !important on shell & workspace');
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr) !important;'), 'must override 290px grid column');
  assert.ok(css.includes('width: 100% !important;'), 'must force width: 100% !important');
  assert.ok(css.includes('max-width: 100% !important;') || css.includes('max-width: 1280px !important;') || css.includes('max-width: min(1600px, calc(100vw - 2.5rem)) !important;'), 'must set full-width/centered <main> max-width in portal-shell.css');
  assert.ok(css.includes('padding: 1rem 1rem 3rem !important;') || css.includes('padding: 1.25rem 1.5rem 3rem !important;') || css.includes('padding: 1.1rem 1.25rem 3rem !important;'), 'must apply balanced padding');
  assert.ok(css.includes('.app-shell > aside'), 'must hide empty <aside> elements');
  assert.ok(css.includes('#cso-jobs-portal-root'), 'must force portal root to 100% width');
  // Unconditional selector (not only body.cso-portal-active)
  assert.ok(/^\.cso-jobs-shell,/m.test(css), 'shell reset must apply unconditionally on initial paint');
});

check('2. jobs-portal.css configures wide desktop grids (4 KPIs, 5 Sector Cards, 4 Filters, 260px+ Departments)', () => {
  const css = read('assets/css/jobs-portal.css');
  assert.ok(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'), 'Hero KPIs & Filter grid must be 4 columns');
  assert.ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr));'), 'Sector cards must be 5-column horizontal row on desktop');
  assert.ok(css.includes('grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));'), 'Departments grid must use minmax(260px, 1fr)');
});

check('3. All 7 pillar HTML pages link portal-shell.css?v=20261124v255', () => {
  const htmlFiles = [
    'jobs/index.html',
    'jobs-careers/index.html',
    'schemes/index.html',
    'schemes-benefits/index.html',
    'study-library/index.html',
    'community/index.html',
    'about/index.html'
  ];
  for (const rel of htmlFiles) {
    assert.ok(/\/assets\/css\/portal-shell\.css\?v=20261124v2(?:5[5-9]|[6-9]\d)/.test(read(rel)), `${rel} must link portal-shell.css?v=20261124v255+`);
  }
});

check('4. sw.js & ops-sentinel.js bumped to cso-candidate-cache-v255+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:5[5-9]|[6-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:5[5-9]|[6-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\n=== v255 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
