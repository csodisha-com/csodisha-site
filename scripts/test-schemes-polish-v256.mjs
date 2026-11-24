#!/usr/bin/env node
/**
 * v256 Schemes & Benefits Explorer Editorial Polish & Unified Portal Verification Suite
 *
 * Tests:
 *  1. portal-shell.css hides redundant static .cso-schemes-hero & .welcome once #cso-schemes-portal-root mounts.
 *  2. schemes-portal.js & schemes-portal.css implement:
 *     - Flagship Editorial Hero Banner (eyebrow, EN/ଓଡ଼ିଆ title & subtitle, 4-tile KPI Strip, lang toggle)
 *     - Zero technical jargon ('3-Layer Welfare Explorer', 'live from D1' removed)
 *     - 5-column horizontal Government Level cards + 4-column Cascading Filter Bar + Benefit/Mode/Status quick filters
 *     - Polished Self/Family Eligibility Checker with Reset Eligibility & Auto-Fill from Candidate Hub
 *     - CSP-safe SVG-illustrated Empty State + Admin-only CTA + Browse 3-Layer Welfare Domains grid (minmax(260px, 1fr))
 *  3. schemes/index.html & schemes-benefits/index.html link v256 portal-shell.css, schemes-portal.css & schemes-portal.js.
 *  4. Strict CSP compliance across all v256 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v256.
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

console.log('\n=== v256 Schemes & Benefits Explorer Editorial Polish Verification ===');

check('1. portal-shell.css suppresses duplicate static .cso-schemes-hero & legacy .welcome header', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('body.cso-portal-active .cso-schemes-hero'), 'must hide static .cso-schemes-hero');
  assert.ok(css.includes('body.cso-portal-schemes-active .welcome'), 'must hide legacy .welcome hero on schemes-benefits');
});

check('2. schemes-portal.js implements Editorial Hero, 5 Gov Level Cards, Quick Filters, Eligibility Controls & Illustrated Empty State + Domains Grid', () => {
  const js = read('assets/js/schemes-portal.js');
  const css = read('assets/css/schemes-portal.css');

  // Editorial Hero & KPIs
  assert.ok(js.includes('ODISHA & CENTRAL WELFARE PORTAL · VERIFIED .GOV.IN & DBT SCHEMES'));
  assert.ok(js.includes('Odisha & Central Government Schemes & Scholarships'));
  assert.ok(js.includes('ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି'));
  assert.ok(js.includes('Active Schemes'));
  assert.ok(js.includes('DBT & Scholarships'));
  assert.ok(js.includes('Ongoing Year-Round'));
  assert.ok(js.includes('Welfare Domains'));

  // No technical jargon
  assert.ok(!js.includes('3-Layer Welfare Explorer'), 'must replace old technical heading');
  assert.ok(!js.includes('live from D1'), 'must replace technical D1 counter text');

  // 5 Gov Level Cards + Quick Filters
  assert.ok(js.includes('All Government Levels'));
  assert.ok(js.includes('Direct Cash Transfer (DBT)'));
  assert.ok(js.includes('Scholarship / Stipend'));
  assert.ok(js.includes('Subsidy / Loan'));
  assert.ok(js.includes('Health Insurance'));
  assert.ok(js.includes('Monthly Pension'));
  assert.ok(js.includes('Mo Seba Kendra / CSC'));
  assert.ok(js.includes('Block / District Office'));
  assert.ok(js.includes('Fresh & Renewal'));

  // Polished Eligibility Checker
  assert.ok(js.includes('Reset Eligibility'));
  assert.ok(js.includes('Auto-Fill from Candidate Hub'));
  assert.ok(js.includes('Family Member'));

  // Illustrated Empty State + Browse 3-Layer Welfare Domains Grid + Admin-only CTA
  assert.ok(js.includes('Fresh Verified Welfare Schemes & Scholarships Coming Soon'));
  assert.ok(js.includes('+ Publish First Scheme in Admin Studio ↗'));
  assert.ok(js.includes('Browse 3-Layer Welfare Domains & Benefit Categories'));
  assert.ok(js.includes('buildEmptySchemeSvg'));

  // CSS wide desktop grids & 4-theme support
  assert.ok(css.includes('.sp-hero'));
  assert.ok(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'));
  assert.ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr));'));
  assert.ok(css.includes('grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));'));
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(css.includes('[data-cso-theme="utkal-bharat"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-theme="utkal-bharat"]')));
  assert.ok(css.includes('[data-cso-resolved-mode="dark"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-resolved-mode="dark"]')));
  assert.ok(css.includes('[data-cso-theme="reading"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-theme="reading"]')));
});

check('3. schemes/index.html & schemes-benefits/index.html link v256 assets', () => {
  for (const rel of ['schemes/index.html', 'schemes-benefits/index.html']) {
    const html = read(rel);
    assert.ok(/\/assets\/css\/portal-shell\.css\?v=20261124v2(?:5[6-9]|[6-9]\d)/.test(html), `${rel} must link portal-shell.css?v=20261124v256`);
    assert.ok(/\/assets\/css\/schemes-portal\.css\?v=20261124v2(?:5[6-9]|[6-9]\d)/.test(html), `${rel} must link schemes-portal.css?v=20261124v256+`);
    assert.ok(/\/assets\/js\/schemes-portal\.js\?v=20261124v2(?:5[6-9]|[6-9]\d)/.test(html), `${rel} must link schemes-portal.js?v=20261124v256`);
  }
});

check('4. Strict CSP compliance across all v256 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v256', () => {
  const src = read('assets/js/schemes-portal.js');
  assert.ok(!/\.innerHTML\s*=/.test(src), 'schemes-portal.js violates CSP (.innerHTML)');
  assert.ok(!/\.outerHTML\s*=/.test(src), 'schemes-portal.js violates CSP (.outerHTML)');
  assert.ok(!/insertAdjacentHTML/.test(src), 'schemes-portal.js violates CSP (insertAdjacentHTML)');
  assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), 'schemes-portal.js violates CSP (.style.*)');

  for (const rel of ['schemes/index.html', 'schemes-benefits/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style attribute`);
  }

  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:5[6-9]|[6-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:5[6-9]|[6-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\n=== v256 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
