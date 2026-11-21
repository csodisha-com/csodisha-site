// v173: Mobile Navigation Left-Alignment & 44px Touch Target Verification.
// Usage: node scripts/test-mobile-nav-left-align-v173.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const css = read('assets/style.css');
const blockStart = css.indexOf('/* v173: Left-align mobile navigation items & 44px touch targets */');
ok(blockStart > 0, 'assets/style.css contains v173 mobile nav left-align block');
const block = css.slice(blockStart);

// 1. Mobile nav list & rows left-aligned
ok(/align-items:\s*stretch\s*!important/.test(block), 'mobile .cso-nav-items uses align-items: stretch');
ok(/justify-content:\s*flex-start\s*!important/.test(block), 'mobile .cso-nav-items uses justify-content: flex-start');
ok(/text-align:\s*left\s*!important/.test(block), 'mobile .cso-nav-items uses text-align: left');
ok(/width:\s*100%\s*!important/.test(block), 'mobile .cso-nav-items and .ni span width: 100%');
ok(/\.cso-nav-items\s+\.cso-nav-arrow[\s\S]*?margin-left:\s*auto\s*!important/.test(block), 'mobile .cso-nav-arrow pushed to right with margin-left: auto');
ok(/min-height:\s*44px\s*!important/.test(block), 'mobile nav items enforce >= 44px touch targets');

// 2. Desktop horizontal nav layout preserved
ok(/@media \(min-width: 769px\)[\s\S]*?justify-content:\s*center\s*!important/.test(css), 'desktop >= 769px nav layout preserved');

// 3. 100% CSP compliance across index.html, shared-header.js, ssr-shell.js
const indexHtml = read('index.html');
ok(!/<style[\s>]/i.test(indexHtml), 'index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(indexHtml), 'index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(indexHtml), 'index.html: zero inline event handlers');
for (const m of indexHtml.matchAll(/<script\b([^>]*)>/gi)) {
  ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), 'index.html: zero executable inline <script>');
}

const sharedHeader = read('assets/shared-header.js');
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(sharedHeader), 'shared-header.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(sharedHeader), 'shared-header.js: zero onclick=');

// 4. Asset & Cache version bumps (v173)
ok(indexHtml.includes('/assets/style.css?v=20261121v173'), 'index.html references style.css v173');
ok(read('functions/_lib/ssr-shell.js').includes('/assets/style.css?v=20261121v173'), 'ssr-shell.js references style.css v173');
ok(read('scripts/build-career-hubs.mjs').includes("const V = '20261121v173';"), 'build-career-hubs.mjs bumped to v173');
ok(/CACHE_NAME = 'cso-candidate-cache-v173'/.test(read('sw.js')), 'sw.js bumped to v173');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v173'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v173');
ok(/cso-candidate-cache-v173/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v173');

console.log(`test-mobile-nav-left-align-v173: ${passed} assertions passed`);
