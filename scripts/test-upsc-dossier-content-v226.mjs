// Verification test for Complete Original-Reference UPSC CSE Dossier Content,
// 21 Services, 2,025 Marks Breakdown, Dropdown Line-Height Fix, and D1 1.1.1 Seed (v226)
// Run: node scripts/test-upsc-dossier-content-v226.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify 23 folders / 299 modules in master-navigation.json
console.log('1. Checking 23 folders / 299 modules preservation...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 2. Verify all 21 UPSC services, 2,025 marks breakdown, attempts & reference links
console.log('2. Checking UPSC CSE 21 services, 2,025 marks & statutory attempts...');
const dirJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'jobs-careers/generated/directory.json'), 'utf8'));
const dirData = require(path.join(ROOT, 'assets/js/jobs-directory-data.js'));
const upsc = dirData.resolveBranchFromDirectory(dirJson, 'upsc-civil-services-examination');
assert.ok(upsc, 'Must resolve upsc-civil-services-examination');
assert.equal(upsc.serviceAllocations.length, 21, `Expected all 21 UPSC services, got ${upsc.serviceAllocations.length}`);
for (const srvCode of ['IAS', 'IFS', 'IPS', 'IA&AS', 'ICAS', 'ICLS', 'IDAS', 'IDES', 'IIS', 'IPoS', 'IP&TAFS', 'IRPFS', 'IRS C&IT', 'IRS IT', 'ITS', 'IRMS', 'AFHQCS', 'DANICS', 'DANIPS', 'PONDICS', 'PONDIPS']) {
  assert.ok(upsc.serviceAllocations.some(s => s[0].includes(srvCode)), `Missing service ${srvCode}`);
}
assert.ok(upsc.examStages.some(r => r[2].includes('2,025')), 'Must include 2,025 Grand Total marks');
assert.ok(upsc.examStages.some(r => r[2].includes('275')), 'Must include 275 Interview marks');
assert.ok(upsc.examStages.some(r => r[2].includes('1,750')), 'Must include 1,750 Mains merit marks');
assert.ok(upsc.attemptMatrix.some(r => r[0].includes('General') && r[2].includes('6 Attempts')), 'Must include Gen 6 attempts');
assert.ok(upsc.attemptMatrix.some(r => r[0].includes('OBC') && r[2].includes('9 Attempts')), 'Must include OBC 9 attempts');
assert.ok(upsc.attemptMatrix.some(r => r[0].includes('SC / ST') && r[2].includes('Unlimited')), 'Must include SC/ST unlimited attempts');
assert.ok(upsc.referenceLinks.some(l => l.href === 'https://upsc.gov.in'), 'Must include upsc.gov.in reference');
assert.ok(upsc.referenceLinks.some(l => l.href === 'https://upsconline.nic.in'), 'Must include upsconline.nic.in reference');

// Simulate renderDossier in VM
function makeNode(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    id: '', className: '', textContent: '', href: '', type: '',
    children: [], attributes: {},
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
    title: '', readyState: 'loading',
    createElement: makeNode,
    createElementNS: (ns, tag) => makeNode(tag),
    getElementById: () => null,
    addEventListener() {}
  }
});
ctx.window = ctx;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/jobs-directory-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/content-dossier.js'), 'utf8'), ctx);
ctx.CSO_CONTENT_DOSSIER.renderDossier(rootEl, upsc, []);
assert.ok(collectTags(rootEl, 'table').length >= 4, 'Dossier must render specs, 3-stage exam, attempt matrix & 21 services tables');
assert.ok(collectTags(rootEl, 'svg').length >= 3, 'Dossier must render pure-SVG charts via createElementNS');

// 3. Verify dropdown line-height fix & D1 1.1.1 seed in _public.js
console.log('3. Checking dropdown line-height fix & D1 1.1.1 seed...');
const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('line-height: 1.4;') && dashCss.includes('height: auto;'), 'Missing .cso-top-selector__select vertical clipping fix');

const publicApi = fs.readFileSync(path.join(ROOT, 'functions/api/content/_public.js'), 'utf8');
assert.ok(publicApi.includes('ensureVerifiedUpscSeedNotice'), 'Missing ensureVerifiedUpscSeedNotice in _public.js');
assert.ok(publicApi.includes("'1.1', '1.1.1', 'upsc-civil-services-examination'"), 'D1 seed must map strictly to 1.1 -> 1.1.1');

const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

// 4. Strict 100% CSP compliance & v226 cache bump
console.log('4. Checking 100% CSP compliance & v226 cache bump...');
const touched = [
  'assets/js/jobs-directory-data.js',
  'assets/js/content-dossier.js',
  'jobs-careers/index.html',
  'jobs-careers/detail/index.html',
  'jobs-careers/assets/dashboard.css'
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

assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('cso-candidate-cache-v226'), 'sw.js must be bumped to v226');
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes('cso-candidate-cache-v226'), 'ops-sentinel.js must be bumped to v226');

console.log('All v226 UPSC Original-Reference Dossier, Dropdown Fix & D1 Seed tests PASSED!');
