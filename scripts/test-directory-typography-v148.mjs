import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

const styleCss = read('assets/style.css');
const jcCss = read('jobs-careers/assets/dashboard.css');
const schemesCss = read('schemes/assets/schemes-explorer.css');
const commCss = read('community/assets/community-explorer.css');
const studyCss = read('study-library/assets/dashboard.css');
const swJs = read('sw.js');
const opsSentinel = read('functions/_lib/ops-sentinel.js');

// 1. Dark-on-light hero contrast in assets/style.css & jobs-careers/assets/dashboard.css
assert.ok(styleCss.includes('--cso-hero-title: #111827;'), 'light mode --cso-hero-title uses #111827');
assert.ok(styleCss.includes('--cso-hero-sub: #374151;'), 'light/reading/utkal-bharat --cso-hero-sub uses #374151');
assert.ok(styleCss.includes('--cso-hero-title: #F8FAFC;'), 'dark mode --cso-hero-title uses #F8FAFC');
assert.ok(styleCss.includes('--cso-hero-sub: #CBD5E1;'), 'dark mode --cso-hero-sub uses #CBD5E1');
assert.ok(!styleCss.includes('.cso-jobs-hero h1,\n:root[data-cso-theme] .welcome.cso-sl-hero-banner h1'), 'legacy white-on-beige override removed');

const styleV148 = styleCss.slice(styleCss.indexOf('v148: Directory Explorer Hero Contrast'));
assert.ok(styleV148.includes('color: var(--cso-hero-title, #111827) !important;'), 'assets/style.css enforces --cso-hero-title');
assert.ok(styleV148.includes('color: var(--cso-hero-sub, #374151) !important;'), 'assets/style.css enforces --cso-hero-sub');
assert.ok(styleV148.includes('font-size: 14.5px !important;'), 'assets/style.css upgrades .cso-dir-search-input to 14.5px');

const jcV148 = jcCss.slice(jcCss.indexOf('v148: Jobs & Careers Hero Contrast'));
assert.ok(jcV148.includes('color: var(--cso-hero-title, #111827) !important;'), 'jobs-careers dashboard.css enforces --cso-hero-title');
assert.ok(jcV148.includes('color: var(--cso-hero-sub, #374151) !important;'), 'jobs-careers dashboard.css enforces --cso-hero-sub');

// 2. Compact breadcrumb pill height on /jobs-careers/
const jcCrumbBlock = jcCss.slice(jcCss.indexOf('.cso-jobs-hero .breadcrumb,'), jcCss.indexOf('v148: Jobs & Careers Hero Contrast'));
assert.match(jcCrumbBlock, /display:\s*inline-flex\s*!important;/, 'breadcrumb inline-flex');
assert.match(jcCrumbBlock, /padding:\s*5px\s+14px\s*!important;/, 'breadcrumb compact 5px 14px padding');
assert.match(jcCrumbBlock, /min-height:\s*30px\s*!important;/, 'breadcrumb min-height 30px');
assert.match(jcCrumbBlock, /max-height:\s*34px\s*!important;/, 'breadcrumb max-height 34px');
assert.match(jcCrumbBlock, /border-radius:\s*999px\s*!important;/, 'breadcrumb 999px pill radius');
assert.match(jcCrumbBlock, /font-size:\s*13px\s*!important;/, 'breadcrumb 13px font-size');

// 3. 14px+ sidebar/input typography & single-row filter alignment across all explorers
assert.match(jcV148, /\.side-link[\s\S]*?font-size:\s*14px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;[\s\S]*?line-height:\s*1\.35\s*!important;[\s\S]*?padding:\s*9px\s+12px\s*!important;/, 'jobs-careers sidebar links 14px / 600 / 1.35 / 9px 12px');
assert.match(jcV148, /\.sidebar-heading[\s\S]*?font-size:\s*12px\s*!important;/, 'jobs-careers sidebar heading 12px');
assert.match(jcV148, /\.side-link\s+\.side-count[\s\S]*?font-size:\s*12\.5px\s*!important;/, 'jobs-careers sidebar count badge 12.5px');
assert.match(jcV148, /\.top-search\s+input[\s\S]*?font-size:\s*14\.5px\s*!important;/, 'jobs-careers top search input 14.5px');
assert.match(jcV148, /\.live-filter-input,[\s\S]*?font-size:\s*14\.5px\s*!important;[\s\S]*?min-height:\s*40px\s*!important;/, 'jobs-careers live filter inputs/selects 14.5px / 40px');
assert.match(jcV148, /\.live-chip,\s*\.live-chip--goal[\s\S]*?font-size:\s*13\.5px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;[\s\S]*?padding:\s*6px\s+12px\s*!important;/, 'quick-filter pills 13.5px / 600 / 6px 12px');
assert.match(jcV148, /@media\s*\(min-width:\s*1100px\)[\s\S]*?flex-wrap:\s*nowrap\s*!important;/, 'single-row filter alignment at 1280px-1366px');

for (const [name, css] of [
  ['schemes/assets/schemes-explorer.css', schemesCss],
  ['community/assets/community-explorer.css', commCss],
  ['study-library/assets/dashboard.css', studyCss]
]) {
  assert.ok(css.includes('14px'), `${name} has 14px sidebar link typography`);
  assert.ok(css.includes('14.5px'), `${name} has 14.5px search/filter input typography`);
  assert.ok(css.includes('12.5px'), `${name} has 12.5px count badge typography`);
}

// 4. CSP compliance (zero inline style="", <script>, or .innerHTML)
const htmlPages = [
  'index.html',
  'jobs-careers/index.html',
  'schemes/index.html',
  'schemes-benefits/index.html',
  'study-library/index.html',
  'community/index.html'
];
for (const page of htmlPages) {
  const html = read(page);
  assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${page}: zero inline style=""`);
  assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html), `${page}: zero inline <script>`);
}

const jsFiles = [
  'jobs-careers/assets/dashboard.js',
  'schemes/assets/schemes-explorer.js',
  'community/assets/community-explorer.js',
  'study-library/assets/dashboard.js',
  'assets/shared-header.js'
];
for (const file of jsFiles) {
  const src = read(file);
  assert.ok(!/\sstyle\s*=\s*["']/i.test(src), `${file}: zero inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(src), `${file}: zero .innerHTML`);
}

// 5. Cache version v148
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v148'"), 'sw.js CACHE_NAME bumped to v148');
assert.ok(opsSentinel.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v148'"), 'ops-sentinel ACTIVE_SW_CACHE_VERSION bumped to v148');

console.log('Directory Typography & Contrast v148 tests passed.');
