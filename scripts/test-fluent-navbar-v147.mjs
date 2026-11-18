import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

const styleCss = read('assets/style.css');
const sharedJs = read('assets/shared-header.js');
const swJs = read('sw.js');
const opsSentinel = read('functions/_lib/ops-sentinel.js');

const v147Idx = styleCss.indexOf('v147: Modern Fluent Main Navigation Bar');
assert.ok(v147Idx !== -1, 'v147 fluent navbar section present in assets/style.css');
const v147 = styleCss.slice(v147Idx);

// 1. Modern Fluent Bar Surface & Balanced Layout
assert.match(v147, /min-height:\s*50px\s*!important;[\s\S]*?padding:\s*6px\s+20px\s*!important;[\s\S]*?border-bottom:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.12\)\s*!important;[\s\S]*?box-shadow:\s*0\s+4px\s+16px\s+-4px\s+rgba\(2,\s*6,\s*23,\s*0\.25\)\s*!important;/, 'fluent bar surface min-height 50px, padding 6px 20px, subtle border & shadow');
assert.match(v147, /linear-gradient\(180deg,\s*#165B33\s+0%,\s*#114727\s+100%\)/, 'System Light & Reading Mode emerald gradient');
assert.match(v147, /:root\[data-cso-theme="dark"\][\s\S]*?rgba\(15,\s*23,\s*42,\s*0\.92\)[\s\S]*?backdrop-filter:\s*blur\(12px\)/, 'Dark Mode translucent midnight glass');
assert.match(v147, /:root\[data-cso-theme="utkal-bharat"\][\s\S]*?linear-gradient\(180deg,\s*#7C2D12\s+0%,\s*#5C1D0C\s+100%\)[\s\S]*?#F59E0B/, 'Odisha & Bharat heritage vermilion-maroon gradient & temple-gold border');
assert.match(v147, /max-width:\s*1280px\s*!important;[\s\S]*?margin:\s*0\s+auto\s*!important;[\s\S]*?display:\s*flex\s*!important;[\s\S]*?align-items:\s*center\s*!important;[\s\S]*?justify-content:\s*center\s*!important;[\s\S]*?gap:\s*6px\s*!important;/, 'balanced 1280px centered nav container');

// 2. Fluent Pill Items, Active State & Smooth Micro-Interactions
assert.match(v147, /height:\s*36px\s*!important;[\s\S]*?padding:\s*0\s+14px\s*!important;[\s\S]*?border-radius:\s*999px\s*!important;[\s\S]*?font-size:\s*14px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;[\s\S]*?letter-spacing:\s*0\.005em\s*!important;[\s\S]*?gap:\s*7px\s*!important;[\s\S]*?cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/, 'pill capsule 36px height, 999px radius, 7px gap, cubic-bezier transitions');
assert.match(v147, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.13\)\s*!important;[\s\S]*?transform:\s*translateY\(-1px\)\s*!important;/, 'hover pill glow & translateY(-1px)');
assert.match(v147, /background:\s*#FAF9F6\s*!important;[\s\S]*?color:\s*#114727\s*!important;[\s\S]*?font-weight:\s*700\s*!important;[\s\S]*?box-shadow:\s*0\s+2px\s+8px\s+rgba\(0,\s*0,\s*0,\s*0\.18\),\s*inset\s+0\s+1px\s+0\s+rgba\(255,\s*255,\s*255,\s*0\.9\)/, 'active tab pill in light/reading');
assert.match(v147, /:root\[data-cso-theme="dark"\][\s\S]*?background:\s*#F8FAFC\s*!important;[\s\S]*?color:\s*#0F172A\s*!important;/, 'active tab pill in dark mode (#F8FAFC / #0F172A)');
assert.match(v147, /:root\[data-cso-theme="utkal-bharat"\][\s\S]*?background:\s*#FFFBEB\s*!important;[\s\S]*?color:\s*#7C2D12\s*!important;/, 'active tab pill in utkal-bharat (#FFFBEB / #7C2D12)');

// Optical Alignment & Rotating Chevrons
assert.match(v147, /font-size:\s*15px\s*!important;[\s\S]*?line-height:\s*1\s*!important;/, 'optical icon alignment 15px');
assert.match(v147, /\.cso-nav-arrow[\s\S]*?font-size:\s*12px\s*!important;[\s\S]*?transition:\s*transform\s+200ms\s+cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/, '12px chevron with 200ms cubic-bezier rotation transition');
assert.match(v147, /transform:\s*rotate\(180deg\)\s*!important;/, 'chevron rotates 180deg on hover/focus/open');

// Fluent Dropdown Panels (.dd)
assert.match(v147, /border-radius:\s*14px\s*!important;[\s\S]*?padding:\s*8px\s*!important;[\s\S]*?box-shadow:\s*0\s+16px\s+36px\s+-8px\s+rgba\(2,\s*6,\s*23,\s*0\.28\)\s*!important;[\s\S]*?transform:\s*translateY\(6px\)\s*!important;/, 'fluent dropdown panel 14px radius, 8px padding, shadow, translateY(6px)');
assert.match(v147, /border-radius:\s*8px\s*!important;[\s\S]*?padding:\s*9px\s+12px\s*!important;/, 'dropdown items 8px radius, 9px 12px padding');
assert.match(v147, /transform:\s*translateX\(2px\)\s*!important;/, 'dropdown items slide 2px on hover');

// 3. CSP compliance (zero inline style="", <script>, or .innerHTML)
const htmlPages = [
  'index.html',
  'jobs-careers/index.html',
  'schemes-benefits/index.html',
  'study-library/index.html',
  'community/index.html',
  'about/index.html'
];

for (const page of htmlPages) {
  const html = read(page);
  assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${page}: zero inline style=""`);
  assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html), `${page}: zero inline <script>`);
}

assert.ok(!/\sstyle\s*=\s*["']/i.test(sharedJs), 'assets/shared-header.js: zero inline style=""');
assert.ok(!/\.innerHTML\b/.test(sharedJs), 'assets/shared-header.js: zero .innerHTML');

// 4. Service Worker & Ops Sentinel Cache Version v147
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v147'"), 'sw.js CACHE_NAME bumped to v147');
assert.ok(opsSentinel.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v147'"), 'ops-sentinel ACTIVE_SW_CACHE_VERSION bumped to v147');

console.log('Fluent Navbar v147 tests passed.');
