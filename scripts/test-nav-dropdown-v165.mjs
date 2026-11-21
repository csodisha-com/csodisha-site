// v165: Main Navigation Dropdown Reliability verification.
// Usage: node scripts/test-nav-dropdown-v165.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const styleCss = read('assets/style.css');
const sharedHeaderJs = read('assets/shared-header.js');
const appJs = read('assets/app.js');

// 1. Target pages load nav shell + bumped style.css & nav JS
const pages = [
  { rel: 'index.html', script: '/assets/app.js?v=20261121v165' },
  { rel: 'jobs-careers/index.html', script: '/assets/shared-header.js?v=20261121v165' },
  { rel: 'jobs-careers/odisha-state-jobs/index.html', script: '/assets/shared-header.js?v=20261121v165' },
  { rel: 'tools/index.html', script: '/assets/shared-header.js?v=20261121v165' },
  { rel: 'schemes/index.html', script: '/assets/shared-header.js?v=20261121v165' }
];

for (const p of pages) {
  const html = read(p.rel);
  ok(html.includes('id="cso-main-navbar"') && html.includes('id="navw"'), `${p.rel}: missing #cso-main-navbar / #navw`);
  ok(html.includes('/assets/style.css?v=20261121v165'), `${p.rel}: missing bumped style.css`);
  ok(html.includes(p.script), `${p.rel}: missing ${p.script}`);
  // CSP checks on HTML
  ok(!/<style[\s>]/i.test(html), `${p.rel}: inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${p.rel}: style="" attribute`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${p.rel}: inline event handler`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${p.rel}: executable inline <script>`);
  }
}

// 2. CSS: no overflow clipping on .main-nav .w / #navw; open state & stacking & 44px mobile targets
ok(!/\.main-nav\s+\.w\s*\{[^}]*overflow-x\s*:\s*(auto|hidden|clip)/.test(styleCss), 'style.css must not clip .main-nav .w with overflow-x: auto/hidden/clip');
ok(!/\.tabs,\s*\.main-nav\s+\.w/.test(styleCss), 'style.css must not include .main-nav .w in horizontal scroll-clipping rule');
ok(/#cso-main-navbar \.w,[\s\S]*?overflow:\s*visible\s*!important/.test(styleCss), 'style.css forces overflow: visible on #navw / .main-nav .w');
ok(/\.cso-nav-items \.ni\.cso-open > \.dd,[\s\S]*?display:\s*block\s*!important;[\s\S]*?pointer-events:\s*auto\s*!important;[\s\S]*?z-index:\s*1200\s*!important/.test(styleCss), 'style.css open dropdown rules complete');
ok(/\.cso-nav-items \.dd a,[\s\S]*?min-height:\s*44px/.test(styleCss), 'style.css enforces 44px touch targets on mobile dropdown links');

// 3. JS: idempotent listener guard, toggle, single-open, outside click, Escape, mobile scroll safe
for (const [label, src] of [['assets/shared-header.js', sharedHeaderJs], ['assets/app.js', appJs]]) {
  ok(src.includes('window.__csoNavDropdownWired'), `${label}: missing idempotent nav listener guard`);
  ok(src.includes('#navw .cso-nav-arrow') && src.includes('#navw .cso-nav-mobile'), `${label}: missing nav dropdown/mobile triggers`);
  ok(src.includes("aria-expanded") && src.includes("cso-open"), `${label}: missing aria-expanded / cso-open toggle`);
  ok(src.includes("e.preventDefault()") && src.includes("e.stopPropagation()"), `${label}: missing preventDefault/stopPropagation on nav toggles`);
  ok(src.includes("!e.target.closest('#navw')"), `${label}: missing outside-click close handler`);
  ok(src.includes("'Escape'"), `${label}: missing Escape key close handler`);
}
ok(sharedHeaderJs.includes('if (window.innerWidth > 768)'), 'shared-header.js does not collapse mobile dropdowns on scroll');
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(sharedHeaderJs), 'shared-header.js has zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(sharedHeaderJs), 'shared-header.js has zero onclick=');

// 4. SSR shell updated + cache bump v165
ok(read('functions/_lib/ssr-shell.js').includes('/assets/style.css?v=20261121v165') && read('functions/_lib/ssr-shell.js').includes('/assets/shared-header.js?v=20261121v165'), 'ssr-shell.js references bumped nav assets');
ok(/CACHE_NAME = 'cso-candidate-cache-v165'/.test(read('sw.js')), 'sw.js bumped to v165');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v165'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v165');
ok(/cso-candidate-cache-v165/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v165');

console.log(`test-nav-dropdown-v165: ${passed} assertions passed`);
