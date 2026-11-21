// v170: Clean Category Cards (Remove Leftover Category / Community Placeholder Labels).
// Usage: node scripts/test-clean-category-cards-v170.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. schemes-explorer.js & schemes-benefits/assets/dashboard.js
const schemesJs = read('schemes/assets/schemes-explorer.js');
ok(!schemesJs.includes("' Category'"), 'schemes-explorer.js: no leftover Category label');
ok(!schemesJs.includes('cso-schemes-domain-top'), 'schemes-explorer.js: no redundant cso-schemes-domain-top row');
ok(schemesJs.includes("text: icon + ' ' + title"), 'schemes-explorer.js: card title includes icon + title directly');

const schemesBenJs = read('schemes-benefits/assets/dashboard.js');
ok(!schemesBenJs.includes("'Explore category'") && !schemesBenJs.includes("'View scheme entry details'"), 'schemes-benefits/assets/dashboard.js: no placeholder fallback labels');

// 2. community-explorer.js, jobs-careers/assets/dashboard.js, study-library/assets/dashboard.js
const commJs = read('community/assets/community-explorer.js');
ok(!commJs.includes("' Community'"), 'community-explorer.js: no leftover Community placeholder label');
ok(!commJs.includes('cso-comm-domain-top'), 'community-explorer.js: no redundant cso-comm-domain-top row');
ok(commJs.includes("text: icon + ' ' + title"), 'community-explorer.js: card title includes icon + title directly');

const jobsJs = read('jobs-careers/assets/dashboard.js');
ok(!jobsJs.includes("'Explore category'"), 'jobs-careers/assets/dashboard.js: no Explore category fallback label');

const studyJs = read('study-library/assets/dashboard.js');
ok(!studyJs.includes('Subject Categories ·'), 'study-library/assets/dashboard.js: no Subject Categories · count label');

// 3. 100% CSP compliance
for (const [rel, src] of [
  ['schemes/assets/schemes-explorer.js', schemesJs],
  ['community/assets/community-explorer.js', commJs],
  ['schemes-benefits/assets/dashboard.js', schemesBenJs],
  ['jobs-careers/assets/dashboard.js', jobsJs],
  ['study-library/assets/dashboard.js', studyJs]
]) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${rel}: zero innerHTML sinks`);
  ok(!/\bonclick\s*=/.test(src), `${rel}: zero onclick=`);
}

for (const rel of ['schemes/index.html', 'community/index.html']) {
  const html = read(rel);
  ok(!/<style[\s>]/i.test(html), `${rel}: zero inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: zero style="" attributes`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: zero inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: zero executable inline <script>`);
  }
}

// 4. Asset & Cache version bumps (v170)
ok(read('schemes/index.html').includes('/schemes/assets/schemes-explorer.js?v=20261121v170'), 'schemes/index.html bumped to v170');
ok(read('community/index.html').includes('/community/assets/community-explorer.js?v=20261121v170'), 'community/index.html bumped to v170');
ok(/CACHE_NAME = 'cso-candidate-cache-v170'/.test(read('sw.js')), 'sw.js bumped to v170');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v170'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v170');
ok(/cso-candidate-cache-v170/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v170');

console.log(`test-clean-category-cards-v170: ${passed} assertions passed`);
