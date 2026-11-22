// Verification test for Overview Multi-Level Clickable Navigation & Full Visual Content Dossier (v218)
// Run: node scripts/test-overview-dossier-v218.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify zero deleted directories/folders under jobs-careers/
console.log('1. Checking preservation of all Career Hub subdirectories & 23/299 master-navigation...');
const hubDirs = [
  'odisha-state-jobs',
  'teaching-education',
  'central-ssc-railways-banking',
  'police-defence',
  'psu-technical-healthcare',
  'private-remote-internships'
];
for (const dir of hubDirs) {
  assert.ok(fs.existsSync(path.join(ROOT, 'jobs-careers', dir, 'index.html')), `Missing jobs-careers/${dir}/index.html`);
}

const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 2. Verify jobs-careers/index.html & dashboard.js Overview features & single search bar
console.log('2. Checking jobs-careers/index.html & dashboard.js Overview navigation...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(jobsHtml.includes('id="cso-overview-visual-bar"'), 'Missing #cso-overview-visual-bar');
assert.ok(jobsHtml.includes('id="cso-hub-suboptions"'), 'Missing #cso-hub-suboptions');
assert.ok(jobsHtml.includes('./assets/dashboard.css?v=20261122v218'), 'Missing v218 dashboard.css');
assert.ok(jobsHtml.includes('./assets/dashboard.js?v=20261122v218'), 'Missing v218 dashboard.js');
for (const dir of hubDirs) {
  assert.ok(jobsHtml.includes(`data-hub-key="${dir}"`), `Missing data-hub-key="${dir}"`);
}

const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(dashJs.includes('renderOverviewVisualBar'), 'Missing renderOverviewVisualBar');
assert.ok(dashJs.includes('initCareerHubSuboptions'), 'Missing initCareerHubSuboptions');
assert.ok(dashJs.includes('/jobs-careers/detail/?slug='), 'View Details must navigate to /jobs-careers/detail/?slug=');
assert.ok(dashJs.includes('createElementNS'), 'Overview visual bar must use pure SVG createElementNS');

// 3. Verify jobs-careers/detail/index.html & content-dossier.js SVG charts, timeline & tables
console.log('3. Checking jobs-careers/detail/index.html & content-dossier.js...');
const detailHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/detail/index.html'), 'utf8');
assert.ok(detailHtml.includes('/assets/css/content-dossier.css?v=20261122v218'), 'Missing v218 content-dossier.css');
assert.ok(detailHtml.includes('/assets/js/content-dossier.js?v=20261122v218'), 'Missing v218 content-dossier.js');
assert.ok(detailHtml.includes('id="cso-dossier-root"'), 'Missing #cso-dossier-root');

const detailSearchInputs = (detailHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(detailSearchInputs.length, 0, 'jobs-careers/detail/index.html should have 0 duplicate search inputs');

// Simulate renderDossier in VM
const dossierMod = require(path.join(ROOT, 'assets/js/content-dossier.js'));
assert.ok(Object.keys(dossierMod.HUB_SUBTRACK_DOSSIERS).length >= 12);

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

const rootEl = makeNode('div');
const ctx = vm.createContext({
  console, Array, Object, String, Number, Math,
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/content-dossier.js'), 'utf8'), ctx);
ctx.CSO_CONTENT_DOSSIER.renderDossier(rootEl, {
  slug: 'opsc-odisha-civil-services-ocs-2026',
  title: 'OPSC Odisha Civil Services (OCS / OAS Group A & B) Examination',
  title_or: 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍',
  organisation: 'OPSC',
  category: 'OPSC',
  stage: 'new-recruitment',
  stage_label: 'New Recruitment',
  vacancies: 399,
  last_date: '2026-12-20',
  apply_url: 'https://www.opsc.gov.in/',
  summary: 'OPSC OAS recruitment.',
  summary_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା।'
}, []);

function collectTags(node, tagName, out = []) {
  if (node.tagName === tagName.toUpperCase()) out.push(node);
  for (const ch of node.children || []) collectTags(ch, tagName, out);
  return out;
}

const svgs = collectTags(rootEl, 'svg');
assert.ok(svgs.length >= 3, 'Dossier should render authority emblem SVG + 2 data chart SVGs');
const chartSvgs = svgs.filter(s => s.attributes.viewBox === '0 0 640 210');
assert.equal(chartSvgs.length, 2, 'Expected 2 SVG data charts with viewBox="0 0 640 210"');
assert.ok(collectTags(rootEl, 'table').length >= 2, 'Expected Eligibility & Exam Pattern specification tables');

// 4. Strict CSP compliance across all touched files
console.log('4. Checking 100% CSP compliance across touched files...');
const touched = [
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'jobs-careers/detail/index.html',
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
    const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(!/<script\b/i.test(noJsonLd), `${rel} must have 0 executable inline <script>`);
  }
}

// 5. Verify cache version bump to cso-candidate-cache-v218
console.log('5. Checking cache version bump to cso-candidate-cache-v218...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v218';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v218';"));

console.log('All v218 Overview Multi-Level Navigation & Full Visual Content Dossier tests PASSED!');
