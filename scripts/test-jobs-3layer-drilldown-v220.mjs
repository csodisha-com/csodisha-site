// Verification test for 3-Layer Drill-Down (Layer 1 -> Layer 2 -> Layer 3),
// Bookmarks (cso_bookmarked_tracks_v1), Strict Branch Filtering, and Dossier Resolution (v220)
// Run: node scripts/test-jobs-3layer-drilldown-v220.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify exact existing 3-layer hierarchy in directory.json
console.log('1. Checking exact existing 3-layer hierarchy in jobs-careers/generated/directory.json...');
const dirJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'jobs-careers/generated/directory.json'), 'utf8'));
assert.equal(dirJson.sections.length, 8, 'Expected 8 directory sections');
const jobsSec = dirJson.sections[0];
assert.equal(jobsSec.title, 'Jobs & Recruitment');
const l1List = jobsSec.children[0].children;
assert.equal(l1List.length, 10, 'Expected 10 Layer 1 categories (1.1 to 1.10)');
assert.equal(l1List[0].number, '1.1');
assert.equal(l1List[0].title, 'National-Level Government Jobs & Recruitment');
assert.equal(l1List[0].children.length, 12, 'Expected 12 Layer 2 subcategories (1.1.1 to 1.1.12)');
assert.equal(l1List[0].children[0].number, '1.1.1');
assert.equal(l1List[0].children[0].title, 'Civil Services and Administration');
assert.ok(l1List[0].children[0].notes.some(n => n.text === 'UPSC Civil Services Examination'), 'Missing Layer 3 branch UPSC Civil Services Examination');

// 2. Verify 23 folders / 299 modules in master-navigation.json
console.log('2. Checking 23 folders / 299 modules preservation...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 3. Verify 3-layer drill-down, bookmarks, and strict branch filtering in dashboard.js & CSS
console.log('3. Checking 3-layer drill-down, ?l1=&l2= state, bookmarks & branch filtering...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(jobsHtml.includes('id="live-jobs-bookmarks-toggle"'), 'Missing ★ Saved Bookmarks filter pill');
assert.ok(jobsHtml.includes('/assets/js/jobs-directory-data.js?v=20261122v220'), 'Missing v220 jobs-directory-data.js');
assert.ok(jobsHtml.includes('./assets/dashboard.js?v=20261122v220'), 'Missing v220 dashboard.js');
assert.ok(jobsHtml.includes('./assets/dashboard.css?v=20261122v220'), 'Missing v220 dashboard.css');

const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(dashJs.includes('cso_bookmarked_tracks_v1'), 'Missing cso_bookmarked_tracks_v1 localStorage key');
assert.ok(dashJs.includes("url.searchParams.set('l1'"), 'Missing ?l1= URL state sync');
assert.ok(dashJs.includes("url.searchParams.set('l2'"), 'Missing ?l2= URL state sync');
assert.ok(dashJs.includes('← Previous level'), 'Missing ← Previous level button label');
assert.ok(dashJs.includes('☆ Bookmark') && dashJs.includes('★ Bookmarked'), 'Missing ☆ Bookmark / ★ Bookmarked toggle');
assert.ok(dashJs.includes('View Full Details & Graphs →'), 'Missing View Full Details & Graphs → link');
assert.ok(dashJs.includes('classifyJobToBranch'), 'Missing classifyJobToBranch strict branch classifier');
assert.ok(dashJs.includes('live-badge--branch'), 'Missing clickable 1.x › 1.x.x branch badge on job cards');

const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('#back-button') && dashCss.includes('min-height: 44px'), '#back-button must have 44px touch target');
assert.ok(dashCss.includes('.cso-branch-bm'), 'Missing .cso-branch-bm styling');

// 4. Verify Layer 3 branch slug resolution & ← Previous level back link in content-dossier.js
console.log('4. Checking Layer 3 branch slug resolution & ← Previous level in content-dossier.js...');
const dirData = require(path.join(ROOT, 'assets/js/jobs-directory-data.js'));
const resolvedBranch = dirData.resolveBranchFromDirectory(dirJson, 'upsc-civil-services-examination');
assert.ok(resolvedBranch, 'resolveBranchFromDirectory must resolve upsc-civil-services-examination');
assert.equal(resolvedBranch.l1Code, '1.1');
assert.equal(resolvedBranch.l2Code, '1.1.1');
assert.equal(resolvedBranch.section, 'jobs-recruitment');
assert.equal(resolvedBranch.apply_url, 'https://upsc.gov.in/');

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
ctx.CSO_CONTENT_DOSSIER.renderDossier(rootEl, resolvedBranch, []);

const links = collectTags(rootEl, 'a');
const prevLink = links.find(a => a.textContent.includes('← Previous level'));
assert.ok(prevLink, 'Dossier must render ← Previous level link');
assert.equal(prevLink.href, '/jobs-careers/jobs-recruitment?l1=1.1&l2=1.1.1', '← Previous level must link back to exact ?l1=&l2= path');
assert.ok(collectTags(rootEl, 'svg').length >= 3, 'Dossier must render emblem + 2 pure SVG charts');

// 5. Strict 100% CSP compliance & v220 cache bump
console.log('5. Checking 100% CSP compliance & v220 cache bump...');
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

assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('cso-candidate-cache-v220'), 'sw.js must be bumped to v220');
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes('cso-candidate-cache-v220'), 'ops-sentinel.js must be bumped to v220');

console.log('All v220 3-Layer Drill-Down, Bookmarks & Branch Filtering tests PASSED!');
