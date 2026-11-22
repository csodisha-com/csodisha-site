// Verification test for Top Cascading Selection Box Bar (#cso-top-category-selector),
// Direct Layer 3 Branch Cards, Enriched Bilingual Dossiers, and 100% CSP Compliance (v221)
// Run: node scripts/test-jobs-top-selector-v221.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify preservation of 23 folders / 299 modules in master-navigation.json
console.log('1. Checking 23 folders / 299 modules preservation...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 2. Verify #cso-top-category-selector, native <select> cascading boxes & single search bar
console.log('2. Checking #cso-top-category-selector, native <select> boxes & single search bar...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(jobsHtml.includes('id="cso-top-category-selector"'), 'Missing #cso-top-category-selector');
assert.ok(/\/assets\/js\/jobs-directory-data\.js\?v=20261122v22(1|2)/.test(jobsHtml), 'Missing v221/v222 jobs-directory-data.js');
assert.ok(/\.\/assets\/dashboard\.js\?v=20261122v22(1|2)/.test(jobsHtml), 'Missing v221/v222 dashboard.js');
assert.ok(/\.\/assets\/dashboard\.css\?v=20261122v22(1|2)/.test(jobsHtml), 'Missing v221/v222 dashboard.css');

const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(dashJs.includes('renderTopCategorySelector'), 'Missing renderTopCategorySelector');
assert.ok(dashJs.includes('cso-select-l1'), 'Missing #cso-select-l1');
assert.ok(dashJs.includes('cso-select-l2'), 'Missing #cso-select-l2');
assert.ok(dashJs.includes('cso-select-l3'), 'Missing #cso-select-l3');
assert.ok(dashJs.includes('cso-select-reset'), 'Missing #cso-select-reset');
assert.ok(dashJs.includes('cso-selector-bookmarks-toggle'), 'Missing #cso-selector-bookmarks-toggle');
assert.ok(dashJs.includes("url.searchParams.set('l1'") && dashJs.includes("url.searchParams.set('l2'") && dashJs.includes("url.searchParams.set('l3'"), 'Missing ?l1=&l2=&l3= URL sync');
assert.ok(dashJs.includes('cso_bookmarked_tracks_v1'), 'Missing cso_bookmarked_tracks_v1 persistence');
assert.ok(dashJs.includes('collectBranchesUnder'), 'Missing collectBranchesUnder direct Layer 3 rendering');

const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('.cso-top-selector__select') && dashCss.includes('min-height: 44px'), 'Top selector <select> must have 44px touch target');
assert.ok(dashCss.includes('white-space: normal') && dashCss.includes('text-overflow: clip'), 'Top selector <select> must avoid ellipsis cutoff');

// 3. Verify enriched bilingual branch dossier resolution at /jobs-careers/detail/<slug>
console.log('3. Checking enriched bilingual branch dossier resolution...');
const dirJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'jobs-careers/generated/directory.json'), 'utf8'));
const dirData = require(path.join(ROOT, 'assets/js/jobs-directory-data.js'));
const upscBranch = dirData.resolveBranchFromDirectory(dirJson, 'upsc-civil-services-examination');
assert.ok(upscBranch, 'Must resolve upsc-civil-services-examination');
assert.ok(upscBranch.age_limit && upscBranch.age_limit.includes('21'), 'Must include domain-accurate age_limit');
assert.ok(upscBranch.pay_level && upscBranch.pay_level.includes('Level-10'), 'Must include domain-accurate pay_level');
assert.ok(upscBranch.apply_url.includes('upsc.gov.in'), 'Must include verified .gov.in portal link');
assert.ok(upscBranch.summary_or && upscBranch.summary_or.length > 20, 'Must include Odia summary_or');

function makeNode(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    href: '',
    type: '',
    children: [],
    attributes: {},
    classList: { toggle() {} },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    get firstChild() { return this.children[0] || null; },
    addEventListener() {}
  };
}
function collectTags(node, tagName, out = []) {
  if (node.tagName === tagName.toUpperCase()) out.push(node);
  for (const ch of node.children || []) collectTags(ch, tagName, out);
  return out;
}

const rootEl = makeNode('div');
const ctx = vm.createContext({
  console, Array, Object, String, Number, Math, URLSearchParams,
  location: { pathname: '/jobs-careers/detail/upsc-civil-services-examination', search: '?section=jobs-recruitment&l1=1.1&l2=1.1.1' },
  document: {
    title: '',
    readyState: 'loading',
    createElement: makeNode,
    createElementNS: (ns, tag) => makeNode(tag),
    getElementById: () => null,
    addEventListener() {}
  }
});
ctx.window = ctx;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/jobs-directory-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/content-dossier.js'), 'utf8'), ctx);
ctx.CSO_CONTENT_DOSSIER.renderDossier(rootEl, upscBranch, []);

assert.ok(collectTags(rootEl, 'svg').length >= 3, 'Dossier must render emblem + 2 pure SVG charts');
assert.ok(collectTags(rootEl, 'table').length >= 2, 'Dossier must render specification & exam pattern tables');

// 4. Strict 100% CSP compliance & v221 cache bump
console.log('4. Checking 100% CSP compliance & v221 cache bump...');
const touched = [
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'jobs-careers/detail/index.html',
  'assets/js/jobs-directory-data.js',
  'assets/js/content-dossier.js'
];
for (const rel of touched) {
  const c = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!/\sstyle\s*=/i.test(c), `${rel} must have 0 style="" attributes`);
  assert.ok(!/\sonclick\s*=/i.test(c), `${rel} must have 0 onclick= attributes`);
  if (rel.endsWith('.js')) {
    assert.ok(!/\.innerHTML\s*=/.test(c), `${rel} must have 0 .innerHTML assignments`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(c), `${rel} must have 0 .style.* assignments`);
  }
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(c), `${rel} must have 0 inline <style>`);
    const noExt = c.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
    assert.ok(!/<script(?![^>]*application\/ld\+json)/i.test(noExt), `${rel} must have 0 executable inline <script>`);
  }
}

assert.ok(/cso-candidate-cache-v22(1|2)/.test(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')), 'sw.js must be bumped to v221+');
assert.ok(/cso-candidate-cache-v22(1|2)/.test(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8')), 'ops-sentinel.js must be bumped to v221+');

console.log('All v221 Top Cascading Selector, Branch Dossier & CSP tests PASSED!');
