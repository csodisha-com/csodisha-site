#!/usr/bin/env node
/**
 * Ultra-Minimal Two-Stage Jobs Cascading Menu Verification (v276)
 *
 * Verifies:
 *  1. Minimal Stage 1 Vertical Dropdown (.cso-jobs-stage1, width: 240px) in assets/shared-header.js
 *     & assets/app.js renders ONLY active sectors from D1 / Admin Studio with right chevron (›),
 *     direct /jobs/?sector=<slug> click, and ZERO top geographic filter bar or bottom footer bar.
 *  2. Minimal Stage 2 Right-Side Slide Flyout (.cso-jobs-stage2, width: 210px) renders ONLY 3 links:
 *     Central (/jobs/?sector=<slug>&region=central), Odisha (/jobs/?sector=<slug>&region=odisha),
 *     All Over India (/jobs/?sector=<slug>&region=all-india) — with ZERO sector header,
 *     SUBCATEGORIES & BOARDS list, or QUICK STAGES section; mobile < 1100px expands those exact 3 links;
 *     150ms hover-intent grace timer auto-hides both stages cleanly.
 *  3. 100% Solid Opaque Background across all 4 themes (#ffffff System/Light, #161b26 Dark Night,
 *     #faf6ee Reading Mode, #fffdf9 Odisha & Bharat), opacity: 1, backdrop-filter: none,
 *     0 16px 36px rgba(0, 0, 0, 0.35), and overflow: hidden in assets/style.css & assets/css/portal-shell.css.
 *  4. v276 cache busting across all core HTML pages, sw.js & ops-sentinel.js, and 100% strict CSP compliance.
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

console.log('\n=== v276 Ultra-Minimal Two-Stage Jobs Cascading Menu Verification ===');

check('1. Minimal Stage 1 (sectors only, no top strip / no footer) in shared-header.js & app.js', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    for (const reqTok of [
      'cso-nav-jobs-wrap',
      'cso-jobs-stage1',
      'cso-js1-list',
      'cso-js1-arrow',
      'cso_jobs_flyout_v27',
      '/api/public/jobs/bootstrap',
      '/jobs/?sector='
    ]) {
      assert.ok(src.includes(reqTok), `${rel} missing "${reqTok}"`);
    }
    for (const removed of [
      'cso-js1-scope-strip',
      'cso-js1-footer',
      'Closing Soon',
      'View All Jobs',
      'cso-jobs-mega'
    ]) {
      assert.ok(!src.includes(removed), `${rel} must remove "${removed}" from Stage 1`);
    }
  }
});

check('2. Minimal Stage 2 (ONLY Central, Odisha, All Over India) + 150ms hover-intent + mobile 3-link accordion', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    for (const reqTok of [
      'cso-jobs-stage2',
      'JOBS_STAGE2_REGIONS',
      "'central'",
      "'odisha'",
      "'all-india'",
      "'Central'",
      "'Odisha'",
      "'All Over India'",
      '&region=',
      'cso-js1-mob-sub',
      'is-flip-left',
      '150'
    ]) {
      assert.ok(src.includes(reqTok), `${rel} missing "${reqTok}"`);
    }
    for (const removed of [
      'Subcategories & Boards',
      'Quick Stages',
      'JOBS_QUICK_STAGES',
      'cso-js2-head',
      'cso-js2-sublist',
      'cso-js2-section--stages',
      'cso-js2-stage-pill'
    ]) {
      assert.ok(!src.includes(removed), `${rel} must remove "${removed}" from Stage 2`);
    }
  }
});

check('3. 100% Solid Opaque Surfaces across all 4 themes & exact 240px / 210px widths in CSS', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css']) {
    const css = read(rel);
    for (const tok of [
      '--cso-surface-elevated: #ffffff;',
      '--cso-surface-elevated: #161b26;',
      '--cso-surface-elevated: #faf6ee;',
      '--cso-surface-elevated: #fffdf9;',
      'background-color: var(--cso-surface-elevated',
      'opacity: 1',
      'backdrop-filter: none',
      '0 16px 36px rgba(0, 0, 0, 0.35)',
      'overflow: hidden'
    ]) {
      assert.ok(css.includes(tok), `${rel} missing solid opaque rule/token "${tok}"`);
    }
    for (const removed of ['.cso-jobs-mega', '.cso-js1-scope-strip', '.cso-js1-footer', '.cso-js2-head', '.cso-js2-sublist']) {
      assert.ok(!css.includes(removed), `${rel} must remove unused "${removed}" CSS`);
    }
  }

  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('width: 240px;'), 'assets/style.css must set Stage 1 width: 240px');
  assert.ok(styleCss.includes('width: 210px;'), 'assets/style.css must set Stage 2 width: 210px');
  assert.ok(styleCss.includes('left: calc(100% + 6px);'), 'assets/style.css must offset Stage 2 right of Stage 1');
});

check('4. Cache busting (>= v276) across HTML pages, sw.js & ops-sentinel.js + 100% strict CSP compliance', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v27[6-9]';/, 'sw.js must be >= v276');
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v27[6-9]';/, 'ops-sentinel.js must be >= v276');

  const corePages = [
    'index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html',
    'study-library/index.html', 'community/index.html', 'about/index.html', 'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.match(html, /\/assets\/style\.css\?v=20261124v27[6-9]/, `${rel} missing style.css >= v276`);
    if (rel === 'index.html') {
      assert.match(html, /\/assets\/app\.js\?v=20261124v27[6-9]/, 'index.html missing app.js >= v276');
    } else {
      assert.match(html, /\/assets\/shared-header\.js\?v=20261124v27[6-9]/, `${rel} missing shared-header.js >= v276`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }

  for (const portalPage of ['jobs/index.html', 'careers/index.html', 'schemes/index.html', 'study-library/index.html', 'community/index.html', 'about/index.html']) {
    assert.ok(read(portalPage).includes('/assets/css/portal-shell.css?v=20261124v276'), `${portalPage} missing portal-shell.css?v=20261124v276`);
  }

  for (const rel of ['assets/shared-header.js', 'admin/jobs-publishing-studio.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v276 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
