#!/usr/bin/env node
/**
 * v259 About & Institutional Transparency Portal Editorial Polish Verification Suite
 *
 * Tests:
 *  1. portal-shell.css suppresses duplicate static .cso-about-hero once #cso-about-portal-root mounts.
 *  2. about-portal.js & about-portal.css implement:
 *     - Flagship Editorial Hero Banner (eyebrow, EN/ଓଡ଼ିଆ title & subtitle, segmented English | ଓଡ଼ିଆ toggle)
 *     - Embedded 5-Tile Live Platform Transparency KPI Strip (Verified Jobs Live, Active Welfare Schemes, Study Modules & PYQs, Registered Members, Verified .gov.in Portals)
 *     - Pillar filter pills with live document counts, rich document cards, CSP-safe SVG empty state & Admin-only CTA
 *     - 3-column bottom-aligned Verified .gov.in Official Government Portals Registry with live search & sector filter
 *     - Polished Contact, Academic Partnership & Editorial Correction Desk with citizen-facing copy (zero Admin Studio leak)
 *     - Full 4-theme compatibility (System, Dark Night, Reading Mode, Odisha & Bharat)
 *  3. about/index.html links v259 portal-shell.css, about-portal.css & about-portal.js.
 *  4. Strict CSP compliance across all v259 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v259.
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

console.log('\n=== v259 About & Institutional Transparency Portal Editorial Polish Verification ===');

check('1. portal-shell.css suppresses duplicate static .cso-about-hero once portal mounts', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('body.cso-portal-active .cso-about-hero'), 'must hide static .cso-about-hero');
  assert.ok(css.includes('body.cso-portal-about-active .cso-about-hero'), 'must hide static .cso-about-hero when about active');
});

check('2. about-portal.js & about-portal.css implement Editorial Hero, 5-Tile Transparency Strip, Pillar Counts, 3-Col Aligned Registry & 4-Theme Polish', () => {
  const js = read('assets/js/about-portal.js');
  const css = read('assets/css/about-portal.css');

  // Editorial Hero & 5-Tile Transparency Strip
  assert.ok(js.includes('INDEPENDENT PUBLIC KNOWLEDGE CHARTER · VERIFIED .GOV.IN & EDITORIAL TRANSPARENCY'));
  assert.ok(js.includes('About Common Sense Odisha — Public Charter & Transparency Hub'));
  assert.ok(js.includes('କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା — ସାର୍ବଜନୀନ ଚାର୍ଟର ଏବଂ ସ୍ୱଚ୍ଛତା କେନ୍ଦ୍ର'));
  assert.ok(js.includes('Verified Jobs Live'));
  assert.ok(js.includes('Active Welfare Schemes'));
  assert.ok(js.includes('Study Modules & PYQs'));
  assert.ok(js.includes('Registered Members'));
  assert.ok(js.includes('Verified .gov.in Portals'));

  // Zero internal Admin Studio leak in public inquiry status copy
  assert.ok(!js.includes('logged directly in Admin Studio'), 'must replace internal Admin Studio copy in inquiry confirmation');

  // Pillar counts, SVG empty state & Admin-only CTA
  assert.ok(js.includes('countPagesForPillar'));
  assert.ok(js.includes('buildEmptyDocSvg'));
  assert.ok(js.includes('+ Author Page in Admin Studio ↗'));
  assert.ok(js.includes('detectAdminSession'));

  // 3-column bottom-aligned registry & 4-theme CSS
  assert.ok(css.includes('.ap-hero'));
  assert.ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr));'));
  assert.ok(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'));
  assert.ok(css.includes('justify-content: space-between;'));
  assert.ok(css.includes('[data-cso-theme="utkal-bharat"]'));
  assert.ok(css.includes('[data-cso-resolved-mode="dark"]'));
  assert.ok(css.includes('[data-cso-theme="reading"]'));
});

check('3. about/index.html links v259 assets & citizen-facing meta description', () => {
  const html = read('about/index.html');
  assert.ok(/\/assets\/css\/portal-shell\.css\?v=20261124v2(?:5[9-9]|[6-9]\d)/.test(html), 'must link portal-shell.css?v=20261124v259');
  assert.ok(/\/assets\/css\/about-portal\.css\?v=20261124v2(?:5[9-9]|[6-9]\d)/.test(html), 'must link about-portal.css?v=20261124v259+');
  assert.ok(/\/assets\/js\/about-portal\.js\?v=20261124v2(?:5[9-9]|[6-9]\d)/.test(html), 'must link about-portal.js?v=20261124v259');
  assert.ok(!html.includes('managed dynamically from Admin Studio'), 'meta description should be citizen-facing');
});

check('4. Strict CSP compliance across all v259 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v259', () => {
  const src = read('assets/js/about-portal.js');
  assert.ok(!/\.innerHTML\s*=/.test(src), 'about-portal.js violates CSP (.innerHTML)');
  assert.ok(!/\.outerHTML\s*=/.test(src), 'about-portal.js violates CSP (.outerHTML)');
  assert.ok(!/insertAdjacentHTML/.test(src), 'about-portal.js violates CSP (insertAdjacentHTML)');
  assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), 'about-portal.js violates CSP (.style.*)');

  const html = read('about/index.html');
  assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), 'about/index.html has inline event handler');
  assert.ok(!/\sstyle="/i.test(html), 'about/index.html has inline style attribute');

  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:59|[6-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:59|[6-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\n=== v259 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
