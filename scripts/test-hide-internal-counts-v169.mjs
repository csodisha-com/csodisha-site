// v169: Hide Internal Category/Entry Counts from Public Explorer Cards & Sidebars.
// Usage: node scripts/test-hide-internal-counts-v169.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. /schemes/ & /schemes-benefits/
const schemesJs = read('schemes/assets/schemes-explorer.js');
ok(!schemesJs.includes("cso-schemes-nav-count"), 'schemes-explorer.js: no cso-schemes-nav-count pills');
ok(!schemesJs.includes("folder_count + ' categories'"), 'schemes-explorer.js: no X categories count');
ok(!schemesJs.includes("item_count + ' entries'"), 'schemes-explorer.js: no Y entries count');

const schemesBenJs = read('schemes-benefits/assets/dashboard.js');
ok(!schemesBenJs.includes("'side-count'"), 'schemes-benefits/assets/dashboard.js: no side-count pills');
ok(!schemesBenJs.includes('categories`') && !schemesBenJs.includes('entries`'), 'schemes-benefits/assets/dashboard.js: no categories/entries card counts');

// 2. /jobs-careers/
const jobsHtml = read('jobs-careers/index.html');
ok(!/class="side-count"/.test(jobsHtml), 'jobs-careers/index.html: no side-count pills');
ok(!/\d+\s+categories\s*·\s*\d+\s+entries/.test(jobsHtml), 'jobs-careers/index.html: no X categories · Y entries');

const jobsJs = read('jobs-careers/assets/dashboard.js');
ok(!jobsJs.includes("'side-count'"), 'jobs-careers/assets/dashboard.js: no side-count pills');
ok(!jobsJs.includes('categories`') && !jobsJs.includes('entries`'), 'jobs-careers/assets/dashboard.js: no categories/entries card counts');
ok(!/plural\([^)]*,\s*['"]entry['"],\s*['"]entries['"]\)/.test(jobsJs), 'jobs-careers/assets/dashboard.js: no plural entry/entries card-meta');

// 3. /community/
const commJs = read('community/assets/community-explorer.js');
ok(!commJs.includes('cso-comm-nav-count'), 'community-explorer.js: no cso-comm-nav-count pills');
ok(!commJs.includes("folder_count + ' categories'"), 'community-explorer.js: no X categories count');
ok(!commJs.includes("item_count + ' live'"), 'community-explorer.js: no Y live count');

const commDashJs = read('community/assets/dashboard.js');
ok(!commDashJs.includes("'side-count'"), 'community/assets/dashboard.js: no side-count pills');
ok(!commDashJs.includes('categories`') && !commDashJs.includes('entries`'), 'community/assets/dashboard.js: no categories/entries card counts');

// 4. /study-library/
const studyJs = read('study-library/assets/dashboard.js');
ok(!studyJs.includes('Sections ·') && !studyJs.includes('Categories ·'), 'study-library/assets/dashboard.js: no Sections · Categories · Topics card-count');

// 5. 100% CSP compliance across all modified HTML & JS files
const htmlPages = [
  'schemes/index.html',
  'schemes-benefits/index.html',
  'jobs-careers/index.html',
  'community/index.html',
  'study-library/index.html'
];
for (const rel of htmlPages) {
  const html = read(rel);
  ok(!/<style[\s>]/i.test(html), `${rel}: zero inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: zero style="" attributes`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: zero inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: zero executable inline <script>`);
  }
}

const jsFiles = [
  ['schemes/assets/schemes-explorer.js', schemesJs],
  ['schemes-benefits/assets/dashboard.js', schemesBenJs],
  ['jobs-careers/assets/dashboard.js', jobsJs],
  ['community/assets/community-explorer.js', commJs],
  ['community/assets/dashboard.js', commDashJs],
  ['study-library/assets/dashboard.js', studyJs]
];
for (const [rel, src] of jsFiles) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${rel}: zero innerHTML sinks`);
  ok(!/\bonclick\s*=/.test(src), `${rel}: zero onclick=`);
}

// 6. Asset & Cache version bumps (v169)
ok(read('schemes/index.html').includes('/schemes/assets/schemes-explorer.js?v=20261121v169'), 'schemes/index.html bumped to v169');
ok(read('schemes-benefits/index.html').includes('./assets/dashboard.js?v=20261121v169'), 'schemes-benefits/index.html bumped to v169');
ok(jobsHtml.includes('./assets/dashboard.js?v=20261121v169'), 'jobs-careers/index.html bumped to v169');
ok(read('community/index.html').includes('/community/assets/community-explorer.js?v=20261121v169'), 'community/index.html bumped to v169');
ok(read('study-library/index.html').includes('./assets/dashboard.js?v=20261121v169'), 'study-library/index.html bumped to v169');
ok(/CACHE_NAME = 'cso-candidate-cache-v169'/.test(read('sw.js')), 'sw.js bumped to v169');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v169'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v169');
ok(/cso-candidate-cache-v169/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v169');

console.log(`test-hide-internal-counts-v169: ${passed} assertions passed`);
