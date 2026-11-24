#!/usr/bin/env node
/**
 * v254 Jobs & Careers Explorer Polish & Shared Public Portal Shell Verification Suite
 *
 * Tests:
 *  1. Shared portal shell (assets/css/portal-shell.css) collapses empty narrow sidebars,
 *     centers main content to max-width: 1240px, hides duplicate search bars & suppresses
 *     duplicate legacy empty states across all 5 pillars (Jobs, Schemes, Study, Community, About).
 *  2. cso-subpage-filter.js skips injecting #cso-subpage-topbar whenever any v249–v254 portal root exists.
 *  3. Jobs Portal (assets/js/jobs-portal.js & assets/css/jobs-portal.css) implements:
 *     - Flagship Editorial Hero Banner (eyebrow, EN/ଓଡ଼ିଆ title & subtitle, 4-tile Live KPI Strip, lang toggle)
 *     - Visual Sector Cards + 4-column Cascading 3-Layer Filter Bar + Qualification/Stage/30-District quick filters
 *     - High-contrast 2-column recruitment cards with View Full Notification → CTA
 *     - Illustrated SVG empty state + Browse 3-Layer Departments directory + Admin-only CTA
 *  4. All 7 pillar HTML pages load portal-shell.css?v=20261124v254 and all 5 portal JS files activate cso-portal-active.
 *  5. Strict CSP compliance across all v254 HTML, CSS & JS files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v254.
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

console.log('\n=== v254 Jobs Explorer Polish & Shared Public Portal Shell Verification ===');

check('1. Shared portal-shell.css collapses dead sidebars, centers content (max-width: 1240px), and suppresses duplicate bars & legacy empty states', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('max-width: 1240px;'), 'portal-shell.css must center main content at max-width: 1240px');
  assert.ok(css.includes('body.cso-portal-active .cso-jobs-rail'), 'must hide dead jobs rail');
  assert.ok(css.includes('body.cso-portal-active .cso-dir-topbar'), 'must hide redundant dir topbar');
  assert.ok(css.includes('body.cso-portal-active #cso-subpage-topbar'), 'must hide subpage topbar');
  assert.ok(css.includes('body.cso-portal-jobs-active .cso-jobs-hero'), 'must suppress legacy jobs hero when editorial hero mounts');
  assert.ok(css.includes('body.cso-portal-jobs-active #jobs-items-grid'), 'must suppress legacy jobs empty state');
  assert.ok(css.includes('body.cso-portal-schemes-active #schemes-directory-panel'), 'must suppress legacy schemes empty state');
  assert.ok(css.includes('body.cso-portal-study-active #live-study-section'), 'must suppress legacy study empty state');
  assert.ok(css.includes('body.cso-portal-community-active #community-directory-panel'), 'must suppress legacy community empty state');
  assert.ok(css.includes('body.cso-portal-about-active #directory-explorer'), 'must suppress legacy about empty state');
});

check('2. cso-subpage-filter.js guards against injecting duplicate search topbar on v249–v254 portal pages', () => {
  const src = read('assets/js/pages/cso-subpage-filter.js');
  assert.ok(src.includes('#cso-jobs-portal-root'), 'must check for #cso-jobs-portal-root');
  assert.ok(src.includes('#cso-schemes-portal-root'), 'must check for #cso-schemes-portal-root');
  assert.ok(src.includes('#cso-study-portal-root'), 'must check for #cso-study-portal-root');
  assert.ok(src.includes('#cso-community-portal-root'), 'must check for #cso-community-portal-root');
  assert.ok(src.includes('#cso-about-portal-root'), 'must check for #cso-about-portal-root');
});

check('3. Jobs Portal implements Flagship Editorial Hero, Visual Sector Cards, 4-Column Filter Grid, Quick Filters, Rich Cards & Illustrated Empty State', () => {
  const js = read('assets/js/jobs-portal.js');
  const css = read('assets/css/jobs-portal.css');

  // Editorial Hero & Live KPI Strip
  assert.ok(js.includes('ODISHA & CENTRAL RECRUITMENT PORTAL · VERIFIED .GOV.IN NOTIFICATIONS'));
  assert.ok(js.includes('Odisha & Central Government Jobs & Careers'));
  assert.ok(js.includes('ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ସରକାରୀ ନିଯୁକ୍ତି ଓ କ୍ୟାରିଅର୍'));
  assert.ok(js.includes('Active Recruitments'));
  assert.ok(js.includes('Total Vacancies'));
  assert.ok(js.includes('Closing This Week'));
  assert.ok(js.includes('Departments / Boards'));

  // Remove old technical jargon
  assert.ok(!js.includes('3-Layer Category Explorer'), 'must replace old technical jargon heading');
  assert.ok(!js.includes('live from D1'), 'must replace technical D1 counter jargon');

  // 4-Column Cascading Filter Grid + Quick Filters
  assert.ok(js.includes('1. Sector / Main Category'));
  assert.ok(js.includes('2. Department / Commission'));
  assert.ok(js.includes('3. Tenure / Cadre Type'));
  assert.ok(js.includes('4. Search by Post, Advt. No. or District'));
  assert.ok(js.includes('B.Ed / Technical'));
  assert.ok(js.includes('Apply Online'));
  assert.ok(js.includes('Admit Card'));
  assert.ok(js.includes('Answer Key'));
  assert.ok(js.includes('All 30 Districts'));

  // Rich Cards & Illustrated Empty State + 3-Layer Departments + Admin-only CTA
  assert.ok(js.includes('View Full Notification →'));
  assert.ok(js.includes('Browse 3-Layer Departments & Recruiting Boards'));
  assert.ok(js.includes('+ Publish First Job in Admin Studio ↗'));
  assert.ok(js.includes('buildEmptyBriefcaseSvg'));

  // CSS classes & 4-theme compatibility
  assert.ok(css.includes('.jp-hero'));
  assert.ok(css.includes('.jp-hero-kpis'));
  assert.ok(css.includes('.jp-sector-strip'));
  assert.ok(css.includes('.jp-empty-card'));
  assert.ok(css.includes('.jp-dept-grid'));
  assert.ok(css.includes('[data-cso-theme="utkal-bharat"]'));
  assert.ok(css.includes('[data-cso-resolved-mode="dark"]'));
  assert.ok(css.includes('[data-cso-theme="reading"]'));
});

check('4. All 7 pillar HTML pages link portal-shell.css and all 5 portal JS files activate cso-portal-active', () => {
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
    assert.ok(read(rel).includes('/assets/css/portal-shell.css?v=20261124v254'), `${rel} must link portal-shell.css?v=20261124v254`);
  }

  assert.ok(read('assets/js/jobs-portal.js').includes("document.body.classList.add('cso-portal-active', 'cso-portal-jobs-active')"));
  assert.ok(read('assets/js/schemes-portal.js').includes("document.body.classList.add('cso-portal-active', 'cso-portal-schemes-active')"));
  assert.ok(read('assets/js/study-portal.js').includes("document.body.classList.add('cso-portal-active', 'cso-portal-study-active')"));
  assert.ok(read('assets/js/community-portal.js').includes("document.body.classList.add('cso-portal-active', 'cso-portal-community-active')"));
  assert.ok(read('assets/js/about-portal.js').includes("document.body.classList.add('cso-portal-active', 'cso-portal-about-active')"));
});

check('5. Strict CSP compliance across all v254 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v254', () => {
  const jsFiles = [
    'assets/js/jobs-portal.js',
    'assets/js/schemes-portal.js',
    'assets/js/study-portal.js',
    'assets/js/community-portal.js',
    'assets/js/about-portal.js',
    'assets/js/pages/cso-subpage-filter.js'
  ];
  for (const rel of jsFiles) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }

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
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style attribute`);
  }

  const sw = read('sw.js');
  assert.ok(sw.includes("const CACHE_NAME = 'cso-candidate-cache-v254';"), 'sw.js must be bumped to v254');
  assert.ok(sw.includes("'/assets/css/portal-shell.css'"), 'sw.js must precache portal-shell.css');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v254';"));
});

console.log(`\n=== v254 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
