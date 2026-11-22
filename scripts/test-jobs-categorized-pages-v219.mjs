// Verification test for Jobs & Careers Categorized Pages, Multi-Page Dossiers,
// 301 Legacy Redirects, and 100% CSP Compliance (v219)
// Run: node scripts/test-jobs-categorized-pages-v219.mjs
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

// 2. Verify legacy folders removed and 301 redirects configured in _worker.js
console.log('2. Checking legacy folder cleanup & 301 redirects...');
const legacyDirs = [
  'odisha-state-jobs',
  'teaching-education',
  'central-ssc-railways-banking',
  'police-defence',
  'psu-technical-healthcare',
  'private-remote-internships'
];
for (const dir of legacyDirs) {
  assert.ok(!fs.existsSync(path.join(ROOT, 'jobs-careers', dir)), `Legacy folder jobs-careers/${dir} should be removed`);
}

const { LEGACY_JOBS_REDIRECTS, JOBS_CATEGORY_SECTIONS, matchJobsCategoryPath, matchJobsDetailPath } = await import(
  path.join(ROOT, 'functions/_lib/jobs-directory-meta.js')
);
const { resolveDeepLinkMeta } = await import(path.join(ROOT, 'functions/api/content/_seo.js'));

for (const dir of legacyDirs) {
  const target = LEGACY_JOBS_REDIRECTS[`/jobs-careers/${dir}/`];
  assert.ok(target && target.startsWith('/jobs-careers/'), `Missing 301 redirect target for /jobs-careers/${dir}/`);
}

// 3. Verify all 9 category pages (Overview + 8 sections) & edge SEO metadata
console.log('3. Checking all 9 category section routes, sidebar <a> links & edge SEO...');
const expectedSlugs = [
  'jobs-recruitment',
  'career-explorer',
  'eligibility-explorer',
  'courses-exams',
  'scholarships-support',
  'international-overseas',
  'career-development',
  'institutions-portals'
];
assert.equal(Object.keys(JOBS_CATEGORY_SECTIONS).length, 8, 'Expected 8 dedicated category sections');
for (const slug of expectedSlugs) {
  assert.ok(matchJobsCategoryPath(`/jobs-careers/${slug}`), `matchJobsCategoryPath failed for ${slug}`);
  const meta = await resolveDeepLinkMeta(new URL(`https://csodisha.com/jobs-careers/${slug}`), null);
  assert.ok(meta && meta.pageTitle && meta.description && meta.canonicalUrl === `https://csodisha.com/jobs-careers/${slug}`, `Missing edge SEO meta for ${slug}`);
}

const workerCode = fs.readFileSync(path.join(ROOT, '_worker.js'), 'utf8');
assert.ok(workerCode.includes('LEGACY_JOBS_REDIRECTS'), '_worker.js must handle LEGACY_JOBS_REDIRECTS with 301');
assert.ok(workerCode.includes('matchJobsCategoryPath'), '_worker.js must route matchJobsCategoryPath');
assert.ok(workerCode.includes('matchJobsDetailPath'), '_worker.js must route matchJobsDetailPath');

const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(jobsHtml.includes('href="/jobs-careers/"'), 'Sidebar must include Overview <a> link');
for (const slug of expectedSlugs) {
  assert.ok(jobsHtml.includes(`href="/jobs-careers/${slug}"`), `Sidebar/grid must include <a href="/jobs-careers/${slug}">`);
}
assert.ok(jobsHtml.includes('/assets/js/jobs-directory-data.js?v=20261122v219'), 'Missing v219 jobs-directory-data.js');
assert.ok(jobsHtml.includes('./assets/dashboard.js?v=20261122v219'), 'Missing v219 dashboard.js');
assert.ok(jobsHtml.includes('./assets/dashboard.css?v=20261122v219'), 'Missing v219 dashboard.css');

// Single search bar check
const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('#side-navigation a.side-link') && dashCss.includes('min-height: 44px'), 'Sidebar <a> links must have 44px touch targets');

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(dashJs.includes('renderCategoryPagePanel'), 'dashboard.js must render category-specific SVG & filter pills');
assert.ok(dashJs.includes('createElementNS'), 'dashboard.js must render pure SVG via createElementNS');
assert.ok(dashJs.includes('history.pushState'), 'dashboard.js must support history.pushState');

// 4. Verify 60+ bilingual records across all 9 categories & /jobs-careers/detail/<slug>
console.log('4. Checking 60+ bilingual records across all 9 categories & detail/<slug>...');
const dirData = require(path.join(ROOT, 'assets/js/jobs-directory-data.js'));
assert.equal(dirData.DIRECTORY_SECTIONS.length, 9, 'Expected 9 Directory Sections in jobs-directory-data.js');
assert.ok(dirData.DIRECTORY_ITEMS.length >= 60, `Expected 60+ categorized items, got ${dirData.DIRECTORY_ITEMS.length}`);

for (const sec of dirData.DIRECTORY_SECTIONS) {
  const secItems = dirData.getItemsBySection(sec.slug);
  assert.ok(secItems.length >= 6, `Section ${sec.slug} must have at least 6 entries (got ${secItems.length})`);
  const sample = secItems[0];
  assert.ok(sample.title && sample.title_or && sample.summary && sample.summary_or, `Item ${sample.slug} must be bilingual (EN + ଓଡ଼ିଆ)`);
  assert.ok(matchJobsDetailPath(`/jobs-careers/detail/${sample.slug}`) === sample.slug, `matchJobsDetailPath failed for ${sample.slug}`);
  const dMeta = await resolveDeepLinkMeta(new URL(`https://csodisha.com/jobs-careers/detail/${sample.slug}`), null);
  assert.ok(dMeta && dMeta.pageTitle && dMeta.canonicalUrl.includes(`/jobs-careers/detail/${sample.slug}`), `Missing edge SEO for /jobs-careers/detail/${sample.slug}`);
}

// Simulate renderDossier in VM with /jobs-careers/detail/<slug> path
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

assert.equal(
  ctx.CSO_CONTENT_DOSSIER.resolveSlugFromLocation({ pathname: '/jobs-careers/detail/chevening-uk-masters-fellowship', search: '' }),
  'chevening-uk-masters-fellowship',
  'content-dossier.js must resolve /jobs-careers/detail/<slug>'
);
ctx.CSO_CONTENT_DOSSIER.renderDossier(rootEl, dirData.getItemBySlug('chevening-uk-masters-fellowship'), dirData.DIRECTORY_ITEMS);
const svgs = collectTags(rootEl, 'svg');
assert.ok(svgs.length >= 3, 'Dossier should render emblem + 2 SVG charts');
assert.ok(collectTags(rootEl, 'table').length >= 2, 'Dossier should render eligibility & pattern tables');

// 5. Strict 100% CSP compliance across all touched files
console.log('5. Checking 100% CSP compliance...');
const touched = [
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'jobs-careers/detail/index.html',
  'assets/js/jobs-directory-data.js',
  'assets/js/content-dossier.js',
  'assets/css/content-dossier.css'
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

// 6. Verify cache version bump to cso-candidate-cache-v219
console.log('6. Checking cache version bump to cso-candidate-cache-v219...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("cso-candidate-cache-v219"), 'sw.js must be bumped to v219');
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("cso-candidate-cache-v219"), 'ops-sentinel.js must be bumped to v219');

console.log('All v219 Categorized Pages, Multi-Page Dossiers & 301 Redirect tests PASSED!');
