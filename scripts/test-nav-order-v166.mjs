// v166: Main Navigation Order Standardization verification.
// Usage: node scripts/test-nav-order-v166.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_HEADER_ORDER, sortCanonicalHeaderItems } from '../functions/_lib/categories-nav-batch1.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const EXPECTED_SLUGS = ['home', 'jobs-careers', 'schemes-benefits', 'study-library', 'community', 'about'];
const EXPECTED_LABELS = ['Home', 'Jobs & Careers', 'Schemes & Benefits', 'Study Library', 'Community', 'About'];

// 1. Server-side canonical header order in categories-nav-batch1.js
ok(JSON.stringify(CANONICAL_HEADER_ORDER) === JSON.stringify(EXPECTED_SLUGS), 'CANONICAL_HEADER_ORDER matches exact 6-item order');

const legacyShuffled = [
  { id: 'nmenu-about', label_en: 'About', url: '/about/', sort_order: 7 },
  { id: 'nmenu-library', label_en: 'Study Library', url: '/study-library/', sort_order: 2 },
  { id: 'nmenu-home', label_en: 'Home', url: '/', sort_order: 1 },
  { id: 'nmenu-community', label_en: 'Community', url: '/community/', sort_order: 5 },
  { id: 'nmenu-schemes', label_en: 'Schemes & Benefits', url: '/schemes/', sort_order: 4 },
  { id: 'nmenu-jobs', label_en: 'Jobs & Careers', url: '/jobs-careers/', sort_order: 3 }
];
const sorted = sortCanonicalHeaderItems(legacyShuffled);
ok(JSON.stringify(sorted.map(i => i.label_en)) === JSON.stringify(EXPECTED_LABELS), 'sortCanonicalHeaderItems reorders legacy D1 rows to canonical order');

const navBatchSrc = read('functions/_lib/categories-nav-batch1.js');
const idxHome = navBatchSrc.indexOf("id: 'nmenu-home'");
const idxJobs = navBatchSrc.indexOf("id: 'nmenu-jobs'");
const idxSchemes = navBatchSrc.indexOf("id: 'nmenu-schemes'");
const idxLib = navBatchSrc.indexOf("id: 'nmenu-library'");
const idxComm = navBatchSrc.indexOf("id: 'nmenu-community'");
const idxAbout = navBatchSrc.indexOf("id: 'nmenu-about'");
ok(idxHome > 0 && idxHome < idxJobs && idxJobs < idxSchemes && idxSchemes < idxLib && idxLib < idxComm && idxComm < idxAbout, 'STARTER_HEADER_ITEMS declared in exact canonical order');
ok(navBatchSrc.includes('sortCanonicalHeaderItems('), 'handlePublicNavConfigApi applies sortCanonicalHeaderItems');

// 2. Client-side shared-header.js default NAV + API hydration canonical sort
const sharedHeader = read('assets/shared-header.js');
const shJobs = sharedHeader.indexOf("['jobs-careers', 'Jobs & Careers'");
const shSchemes = sharedHeader.indexOf("['schemes-benefits', 'Schemes & Benefits'");
const shLib = sharedHeader.indexOf("['study-library', 'Study Library'");
const shComm = sharedHeader.indexOf("['community', 'Community'");
const shAbout = sharedHeader.indexOf("['about', 'About'");
ok(shJobs > 0 && shJobs < shSchemes && shSchemes < shLib && shLib < shComm && shComm < shAbout, 'shared-header.js default NAV matches canonical order');
ok(sharedHeader.includes("['home', 'jobs-careers', 'schemes-benefits', 'study-library', 'community', 'about']"), 'shared-header.js hydrateHeaderNavFromApi enforces canonical order');
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(sharedHeader), 'shared-header.js has zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(sharedHeader), 'shared-header.js has zero onclick=');

// 3. Homepage assets/app.js matches exact same order
const appJs = read('assets/app.js');
ok(appJs.includes("const NAV=[['jobs-careers','Jobs & Careers','💼'],['schemes-benefits','Schemes & Benefits','🏛'],['study-library','Study Library','📖'],['community','Community','👥'],['about','About','ⓘ']];"), 'app.js homepage NAV matches canonical order');

// 4. Every public HTML page uses the shared header/app nav and passes CSP checks
const SKIP = new Set(['node_modules', '.git', '.wrangler', 'dist']);
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.html')) htmlFiles.push(path.relative(root, full));
  }
})(root);

let checkedPages = 0;
for (const rel of htmlFiles) {
  if (rel.startsWith('admin/')) continue;
  const html = read(rel);
  if (/http-equiv=["']refresh["']/i.test(html)) continue;
  checkedPages++;
  const expectedScript = rel === 'index.html' ? '/assets/app.js' : '/assets/shared-header.js';
  ok(html.includes(expectedScript), `${rel}: loads ${expectedScript}`);
  ok(!/<style[\s>]/i.test(html), `${rel}: no inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: no style="" attribute`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: no inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: no executable inline <script>`);
  }
}
ok(checkedPages >= 50, `checked ${checkedPages} public HTML pages`);

// 5. SSR shell & cache bump v166
ok(read('functions/_lib/ssr-shell.js').includes('/assets/shared-header.js?v=20261121v166'), 'ssr-shell.js references v166 shared-header.js');
ok(/CACHE_NAME = 'cso-candidate-cache-v166'/.test(read('sw.js')), 'sw.js bumped to v166');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v166'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v166');
ok(/cso-candidate-cache-v166/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v166');

console.log(`test-nav-order-v166: ${passed} assertions passed (${checkedPages} HTML pages verified)`);
