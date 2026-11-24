/**
 * Zero-Flash Portal Shell & Instant First-Byte Paint Verification Suite (v261)
 *
 * Verifies:
 *  1. All 8 portal HTML pages have static <body class="cso-portal-page" data-cso-portal="..."> on byte 0.
 *  2. All 8 portal HTML pages pre-render the Editorial Hero & .cso-portal-skeleton inside #cso-*-portal-root & link v261 assets.
 *  3. portal-shell.css unconditionally hides legacy heroes, sidebars, topbars & fallback containers via body.cso-portal-page.
 *  4. All 5 portal JS files preserve pre-rendered .cso-portal-skeleton until /bootstrap resolves (CLS = 0).
 *  5. sw.js uses Network-First with 1.5s AbortController timeout for HTML navigations + skipWaiting/clients.claim & v261 cache.
 *  6. Strict CSP compliance across all 8 portal HTML files, portal-shell.css, and 5 portal JS files.
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

console.log('\n=== v261 Zero-Flash Portal Shell & Network-First SW Verification ===');

const PORTAL_PAGES = [
  { file: 'jobs/index.html', portal: 'jobs', rootId: 'cso-jobs-portal-root', heroClass: 'jp-hero', css: 'jobs-portal.css', js: 'jobs-portal.js' },
  { file: 'jobs-careers/index.html', portal: 'jobs', rootId: 'cso-jobs-portal-root', heroClass: 'jp-hero', css: 'jobs-portal.css', js: 'jobs-portal.js' },
  { file: 'schemes/index.html', portal: 'schemes', rootId: 'cso-schemes-portal-root', heroClass: 'sp-hero', css: 'schemes-portal.css', js: 'schemes-portal.js' },
  { file: 'schemes-benefits/index.html', portal: 'schemes', rootId: 'cso-schemes-portal-root', heroClass: 'sp-hero', css: 'schemes-portal.css', js: 'schemes-portal.js' },
  { file: 'study-library/index.html', portal: 'study', rootId: 'cso-study-portal-root', heroClass: 'sp-hero', css: 'study-portal.css', js: 'study-portal.js' },
  { file: 'study/index.html', portal: 'study', rootId: 'cso-study-portal-root', heroClass: 'sp-hero', css: 'study-portal.css', js: 'study-portal.js' },
  { file: 'community/index.html', portal: 'community', rootId: 'cso-community-portal-root', heroClass: 'cp-hero', css: 'community-portal.css', js: 'community-portal.js' },
  { file: 'about/index.html', portal: 'about', rootId: 'cso-about-portal-root', heroClass: 'ap-hero', css: 'about-portal.css', js: 'about-portal.js' }
];

check('1. All 8 portal HTML pages have static <body class="cso-portal-page" data-cso-portal="..."> on byte 0', () => {
  for (const p of PORTAL_PAGES) {
    const html = read(p.file);
    const re = new RegExp(`<body\\s+class="cso-portal-page"\\s+data-cso-portal="${p.portal}"`, 'i');
    assert.ok(re.test(html), `${p.file} missing static <body class="cso-portal-page" data-cso-portal="${p.portal}">`);
  }
});

check('2. All 8 portal HTML pages pre-render Editorial Hero & Skeleton Frame and link v261 assets', () => {
  for (const p of PORTAL_PAGES) {
    const html = read(p.file);
    assert.ok(html.includes(`id="${p.rootId}"`), `${p.file} missing #${p.rootId}`);
    assert.ok(html.includes(`class="${p.heroClass}"`), `${p.file} missing pre-rendered .${p.heroClass}`);
    assert.ok(html.includes('class="cso-portal-skeleton"'), `${p.file} missing pre-rendered .cso-portal-skeleton`);
    assert.ok(html.includes('/assets/css/portal-shell.css?v=20261124v261'), `${p.file} missing portal-shell.css?v=20261124v261`);
    assert.ok(html.includes(`/assets/css/${p.css}?v=20261124v261`), `${p.file} missing ${p.css}?v=20261124v261`);
    assert.ok(html.includes(`/assets/js/${p.js}?v=20261124v261`), `${p.file} missing ${p.js}?v=20261124v261`);
  }
});

check('3. portal-shell.css unconditionally hides legacy heroes, sidebars, topbars & fallback containers via body.cso-portal-page', () => {
  const css = read('assets/css/portal-shell.css');
  for (const sel of [
    'body.cso-portal-page .cso-jobs-hero',
    'body.cso-portal-page .cso-schemes-hero',
    'body.cso-portal-page .cso-study-hero',
    'body.cso-portal-page .cso-sl-hero-banner',
    'body.cso-portal-page .cso-comm-hero',
    'body.cso-portal-page .cso-about-hero',
    'body.cso-portal-page .welcome',
    'body.cso-portal-page aside',
    'body.cso-portal-page .sidebar',
    'body.cso-portal-page #cso-subpage-topbar',
    'body.cso-portal-page #cso-clean-page-content'
  ]) {
    assert.ok(css.includes(sel), `portal-shell.css missing ${sel}`);
  }
});

check('4. All 5 portal JS files preserve pre-rendered .cso-portal-skeleton until /bootstrap resolves', () => {
  for (const jsFile of [
    'assets/js/jobs-portal.js',
    'assets/js/schemes-portal.js',
    'assets/js/study-portal.js',
    'assets/js/community-portal.js',
    'assets/js/about-portal.js'
  ]) {
    const src = read(jsFile);
    assert.ok(src.includes("querySelector('.cso-portal-skeleton')"), `${jsFile} must preserve pre-rendered .cso-portal-skeleton`);
  }
});

check('5. sw.js uses Network-First with 1.5s timeout for HTML navigations + skipWaiting/clients.claim & v261 cache', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes("const CACHE_NAME = 'cso-candidate-cache-v261';"), 'sw.js must be cso-candidate-cache-v261');
  assert.ok(sw.includes('self.skipWaiting()'), 'sw.js must call skipWaiting()');
  assert.ok(sw.includes('self.clients.claim()'), 'sw.js must call clients.claim()');
  assert.ok(sw.includes("acceptHeader.includes('text/html')"), 'sw.js must match text/html accept header');
  assert.ok(sw.includes('AbortController') && sw.includes('1500'), 'sw.js must enforce 1.5s network timeout for HTML navigations');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v261';"));
});

check('6. Strict CSP compliance across all 8 portal HTML files, portal-shell.css & 5 portal JS files', () => {
  for (const p of PORTAL_PAGES) {
    const html = read(p.file);
    assert.ok(!/\sstyle\s*=/i.test(html), `${p.file} contains inline style= attribute`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${p.file} contains inline on*= handler`);
    assert.ok(!/<script(?![^>]*type="application\/ld\+json")(?![^>]*\bsrc=)[^>]*>/i.test(html), `${p.file} contains inline <script>`);
  }
  for (const jsFile of [
    'assets/js/jobs-portal.js',
    'assets/js/schemes-portal.js',
    'assets/js/study-portal.js',
    'assets/js/community-portal.js',
    'assets/js/about-portal.js'
  ]) {
    const codeOnly = read(jsFile).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${jsFile} violates strict CSP: ${bad}`);
    }
  }
});

console.log(`\n=== v261 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
