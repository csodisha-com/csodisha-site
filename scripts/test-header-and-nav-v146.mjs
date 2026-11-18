import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

const styleCss = read('assets/style.css');
const sharedJs = read('assets/shared-header.js');
const jcHtml = read('jobs-careers/index.html');
const jcCss = read('jobs-careers/assets/dashboard.css');
const jcJs = read('jobs-careers/assets/dashboard.js');

// 1. Utility bar high-contrast labels & no right-edge Logout clipping
const v146Block = styleCss.slice(styleCss.indexOf('v146: Utility Bar'));
assert.ok(v146Block.length > 200, 'v146 block present in assets/style.css');
assert.match(v146Block, /padding-right:\s*16px\s*!important;[\s\S]*?flex-wrap:\s*nowrap\s*!important;[\s\S]*?gap:\s*8px\s*!important;/, 'utility bar nowrap + gap: 8px + padding-right: 16px');
assert.match(v146Block, /color:\s*#F8FAFC\s*!important;[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?width:\s*auto\s*!important;[\s\S]*?overflow:\s*visible\s*!important;/, 'utility bar pills explicit #F8FAFC contrast + visible overflow');
assert.match(v146Block, /\.cso-auth-logout-btn[\s\S]*?flex-shrink:\s*0\s*!important;/, 'Logout button flex-shrink: 0');

// 2. Jobs & Careers header markup & unified main-nav active pill + 6px chevron gap
assert.ok(jcHtml.includes('<header class="top site-header__top" id="header-top" role="banner">'), 'jobs-careers/index.html uses site-header__top');
assert.ok(jcHtml.includes('<nav class="main-nav site-header__nav" id="cso-main-navbar" aria-label="Main Navigation">'), 'jobs-careers/index.html uses main-nav site-header__nav');
assert.ok(!/\.cso-nav-parent\s*>\s*a[\s\S]{0,220}color:\s*#fff\s*!important/i.test(jcCss), 'jobs-careers dashboard.css has no .cso-nav-parent > a #fff override');
assert.match(v146Block, /\.main-nav\s+\.cso-nav-parent[\s\S]*?display:\s*inline-flex\s*!important;[\s\S]*?align-items:\s*center\s*!important;[\s\S]*?gap:\s*6px\s*!important;/, 'main-nav parent inline-flex with 6px chevron gap');
assert.match(v146Block, /background:\s*var\(--cso-surface\)\s*!important;[\s\S]*?color:\s*var\(--cso-primary\)\s*!important;[\s\S]*?font-weight:\s*700\s*!important;/, 'unified active nav pill contrast');
assert.ok(sharedJs.includes("rawSlug === 'schemes' ? 'schemes-benefits'"), 'shared-header.js maps schemes -> schemes-benefits for dropdown chevron parity');

// 3. Breadcrumb contrast on /jobs-careers/ (zero dark-on-dark)
const jcV146 = jcCss.slice(jcCss.indexOf('v146: Jobs & Careers'));
assert.ok(jcV146.includes('color: #F8FAFC !important;'), 'jobs-careers breadcrumb uses crisp #F8FAFC ink');
assert.ok(!styleCss.includes('.cso-jobs-hero .breadcrumb.cso-jc-crumb .breadcrumb-link {\n  color: var(--cso-hero-title) !important;'), 'dark-on-dark hero breadcrumb override removed from assets/style.css');

// 4. CSP compliance (zero inline style="", <script>, or .innerHTML)
for (const [name, src] of [['jobs-careers/index.html', jcHtml], ['jobs-careers/assets/dashboard.js', jcJs], ['assets/shared-header.js', sharedJs]]) {
  assert.ok(!/\sstyle\s*=\s*["']/i.test(src), `${name}: no inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(src), `${name}: no .innerHTML`);
}
assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(jcHtml), 'jobs-careers/index.html: no inline <script>');

// 5. Cache version v146
assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v146'"), 'sw.js CACHE_NAME v146');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v146'"), 'ops-sentinel v146');

console.log('Header & Nav v146 checks passed.');
