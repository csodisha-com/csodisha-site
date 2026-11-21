// v172: Jobs & Careers Top Toolbar Search Bar Restoration & Uniformity.
// Usage: node scripts/test-jobs-topbar-search-v172.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const html = read('jobs-careers/index.html');
const js = read('jobs-careers/assets/dashboard.js');
const css = read('jobs-careers/assets/dashboard.css');

// 1. Topbar structure matches [☰ sidebar toggle] [Search] [⌂ Overview] and is NOT hidden on overview
const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart);
ok(topbarStart > 0 && topbarEnd > topbarStart, 'jobs-careers/index.html has .topbar');
const topbar = html.slice(topbarStart, topbarEnd);

const toggleIdx = topbar.indexOf('id="cso-sidebar-toggle-top"');
const searchWrapIdx = topbar.indexOf('<div class="top-search">');
const searchInputIdx = topbar.indexOf('id="directory-search"');
const overviewLinkIdx = topbar.indexOf('class="home-link"');
ok(toggleIdx > 0 && searchWrapIdx > toggleIdx && searchInputIdx > searchWrapIdx && overviewLinkIdx > searchInputIdx,
  'topbar matches [☰ sidebar toggle] [Search] [⌂ Overview] order');
ok(!topbar.includes('<div class="top-search" hidden>'), 'top-search is visible on overview (not hidden)');

// 2. Dashboard JS keeps top search visible on overview and wires CSP-compliant listeners
ok(/function showOverview[^}]*setTopSearchVisible\(true\)/.test(js), 'showOverview keeps top-search visible');
ok(js.includes("search.addEventListener('input', renderSearch)"), 'directory-search wired with addEventListener');
ok(js.includes("clearSearch.addEventListener('click'"), 'clear-search wired with addEventListener');
ok(js.includes('syncTopSearchToLiveJobs('), 'top-search syncs with live-jobs-search');

// 3. Mobile font-size >= 16px & overflow protection
ok(/font-size:\s*max\(16px,\s*1rem\)\s*!important/.test(css), 'mobile top-search input uses font-size: max(16px, 1rem)');
ok(/min-width:\s*0;\s*max-width:\s*100%;/.test(css), 'mobile .topbar .top-search prevents horizontal overflow');

// 4. 100% CSP compliance
ok(!/<style[\s>]/i.test(html), 'jobs-careers/index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(html), 'jobs-careers/index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), 'jobs-careers/index.html: zero inline event handlers');
for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
  ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), 'jobs-careers/index.html: zero executable inline <script>');
}
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(js), 'jobs-careers/assets/dashboard.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(js), 'jobs-careers/assets/dashboard.js: zero onclick=');

// 5. Asset & Cache version bumps (v172)
ok(html.includes('./assets/dashboard.css?v=20261121v172'), 'jobs-careers/index.html references dashboard.css v172');
ok(html.includes('./assets/dashboard.js?v=20261121v172'), 'jobs-careers/index.html references dashboard.js v172');
ok(/CACHE_NAME = 'cso-candidate-cache-v172'/.test(read('sw.js')), 'sw.js bumped to v172');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v172'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v172');
ok(/cso-candidate-cache-v172/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v172');

console.log(`test-jobs-topbar-search-v172: ${passed} assertions passed`);
