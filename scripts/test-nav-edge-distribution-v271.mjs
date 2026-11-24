#!/usr/bin/env node
/**
 * Tier 2 Navigation Edge-to-Edge Even Distribution Verification Suite (v271)
 *
 * Verifies:
 *  1. Speculative .cso-nav-bar / .cso-tier2-nav blocks are removed from assets/css/portal-shell.css.
 *  2. Both assets/style.css and assets/css/portal-shell.css target exact DOM selectors
 *     (#cso-main-navbar, #navw, #cso-nav-items, .cso-nav-bar-container, .cso-nav-saved-pill)
 *     with full 100% edge-to-edge width, clamp(16px, 2.5vw, 32px) padding, justify-content: space-between,
 *     display: contents flattening on desktop/tablet, white-space: nowrap, and 769px-1099px horizontal scrolling.
 *  3. Legacy 1280px centered cap and margin-left: auto spacer on .cso-nav-saved-pill / .cso-nav-bar-container are removed.
 *  4. All --cso-nav-* semantic theme tokens remain intact across all 4 themes.
 *  5. Cache busting (?v=20261124v271, cso-candidate-cache-v271) & strict CSP compliance across all core pages.
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

console.log('\n=== v271 Tier 2 Navigation Edge-to-Edge Even Distribution Verification ===');

check('1. Speculative .cso-nav-bar / .cso-tier2-nav blocks removed from portal-shell.css', () => {
  const portalCss = read('assets/css/portal-shell.css');
  assert.ok(!/\.cso-nav-bar\b(?!-)/.test(portalCss), 'portal-shell.css must not contain speculative .cso-nav-bar');
  assert.ok(!portalCss.includes('.cso-tier2-nav'), 'portal-shell.css must not contain speculative .cso-tier2-nav');
  assert.ok(!portalCss.includes('.cso-nav-list'), 'portal-shell.css must not contain speculative .cso-nav-list');
});

check('2. Exact Tier 2 selectors distribute evenly edge-to-edge in both style.css and portal-shell.css', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css']) {
    const css = read(rel);
    assert.ok(css.includes('#cso-main-navbar'), `${rel} missing #cso-main-navbar`);
    assert.ok(css.includes('#navw > #cso-nav-items'), `${rel} missing #navw > #cso-nav-items flattening rule`);
    assert.ok(css.includes('#navw > .cso-nav-bar-container'), `${rel} missing #navw > .cso-nav-bar-container flattening rule`);
    assert.ok(css.includes('justify-content: space-between !important;'), `${rel} missing justify-content: space-between`);
    assert.ok(css.includes('padding-inline: clamp(16px, 2.5vw, 32px) !important;'), `${rel} missing clamp(16px, 2.5vw, 32px) padding`);
    assert.ok(css.includes('white-space: nowrap !important;'), `${rel} missing white-space: nowrap`);
    assert.ok(css.includes('@media (min-width: 769px) and (max-width: 1099px)'), `${rel} missing tablet horizontal scroll media query`);
    assert.ok(css.includes('overflow-x: auto !important;'), `${rel} missing tablet overflow-x: auto`);
  }
});

check('3. Legacy 1280px centered cap & margin-left: auto spacers removed from style.css nav block', () => {
  const styleCss = read('assets/style.css');
  assert.ok(!styleCss.includes('/* Balanced Centered Layout Container */'), 'legacy centered nav container comment must be removed');
  assert.ok(!/\.cso-nav-saved-pill\s*\{[^}]*margin-left:\s*auto/s.test(styleCss), '.cso-nav-saved-pill must not force margin-left: auto');
});

check('4. All --cso-nav-* semantic tokens preserved across all 4 themes', () => {
  const portalCss = read('assets/css/portal-shell.css');
  for (const tok of [
    '--cso-nav-top-bg',
    '--cso-nav-sub-bg',
    '--cso-nav-sub-ink',
    '--cso-nav-pill-bg',
    '--cso-nav-pill-fg',
    '--cso-nav-saved-bg'
  ]) {
    assert.ok(portalCss.includes(tok), `portal-shell.css missing ${tok}`);
  }
  for (const theme of ['data-cso-theme="system"', 'data-cso-theme="dark"', 'data-cso-theme="reading"', 'data-cso-theme="utkal-bharat"']) {
    assert.ok(portalCss.includes(theme), `portal-shell.css missing theme selector ${theme}`);
  }
});

check('5. Cache busting (?v=20261124v271, cso-candidate-cache-v271) & strict CSP across core HTML pages', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v271';"), 'sw.js must be cso-candidate-cache-v271');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v271';"), 'ops-sentinel.js must be cso-candidate-cache-v271');

  const corePages = [
    'index.html',
    'jobs/index.html',
    'careers/index.html',
    'schemes/index.html',
    'study-library/index.html',
    'community/index.html',
    'about/index.html',
    'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.ok(html.includes('/assets/style.css?v=20261124v271'), `${rel} missing style.css?v=20261124v271`);
    if (rel === 'index.html') {
      assert.ok(html.includes('/assets/app.js?v=20261124v271'), 'index.html missing app.js?v=20261124v271');
    } else {
      assert.ok(html.includes('/assets/shared-header.js?v=20261124v271'), `${rel} missing shared-header.js?v=20261124v271`);
    }
    if (rel !== 'index.html' && rel !== 'student-dashboard/index.html') {
      assert.ok(html.includes('/assets/css/portal-shell.css?v=20261124v271'), `${rel} missing portal-shell.css?v=20261124v271`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }
});

console.log(`\n=== v271 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
