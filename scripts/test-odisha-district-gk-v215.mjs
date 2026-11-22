// Verification test for Odisha 30-District Static GK & Exam Fact-Sheet Explorer (v215)
// Run: node scripts/test-odisha-district-gk-v215.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify study-library/index.html mount & single search bar rule
console.log('1. Checking study-library/index.html mount & single search bar...');
const studyHtml = fs.readFileSync(path.join(ROOT, 'study-library/index.html'), 'utf8');
assert.ok(studyHtml.includes('id="odisha-district-gk"'), 'Missing #odisha-district-gk in study-library/index.html');
assert.ok(studyHtml.includes('/assets/css/odisha-district-gk.css?v=20261122v215'), 'Missing ?v=20261122v215 on odisha-district-gk.css');
assert.ok(studyHtml.includes('/assets/js/odisha-district-gk.js?v=20261122v215'), 'Missing ?v=20261122v215 on odisha-district-gk.js');

const searchInputs = (studyHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(searchInputs.length, 1, 'study-library/index.html must keep strictly 1 search bar (#directory-search)');

// 2. Verify all 30 Odisha districts, 3 divisions & bilingual fields
console.log('2. Checking 30 Odisha districts, 3 divisions & EN + Odia highlights...');
const dgk = require(path.join(ROOT, 'assets/js/odisha-district-gk.js'));
assert.equal(dgk.DISTRICTS_GK.length, 30, `Expected 30 districts, got ${dgk.DISTRICTS_GK.length}`);

const divCounts = { Central: 0, Northern: 0, Southern: 0 };
const slugs = new Set();
for (const d of dgk.DISTRICTS_GK) {
  assert.ok(d.slug && d.nameEn && d.nameOdia && d.headquarters && d.division && d.rivers && d.gkHighlightsEn && d.gkHighlightsOdia, `Incomplete district: ${d.slug}`);
  assert.ok(/[\u0B00-\u0B7F]/.test(d.nameOdia), `District ${d.slug} nameOdia must contain Odia script`);
  assert.ok(/[\u0B00-\u0B7F]/.test(d.gkHighlightsOdia), `District ${d.slug} gkHighlightsOdia must contain Odia script`);
  assert.equal(d.jobsFilterUrl, `/jobs-careers/?district=${d.slug}`);
  assert.ok(Object.prototype.hasOwnProperty.call(divCounts, d.division), `Invalid division ${d.division}`);
  divCounts[d.division] += 1;
  slugs.add(d.slug);
}
assert.equal(slugs.size, 30, 'All 30 district slugs must be unique');
assert.equal(divCounts.Central, 10);
assert.equal(divCounts.Northern, 10);
assert.equal(divCounts.Southern, 10);

assert.equal(dgk.filterDistricts('Central', 'all').length, 10);
assert.equal(dgk.filterDistricts('Northern', 'all').length, 10);
assert.equal(dgk.filterDistricts('Southern', 'all').length, 10);
assert.equal(dgk.filterDistricts('All', 'khordha').length, 1);

// 3. Test 5-question dynamic District GK drill & DOM mount simulation
console.log('3. Testing 5-question District GK drill & DOM mount simulation...');
const drill = dgk.generateDistrictDrill(0);
assert.equal(drill.length, 5, 'Drill must generate 5 questions');
for (const q of drill) {
  assert.ok(q.question && Array.isArray(q.options) && q.options.length >= 3);
  assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length);
  assert.ok(q.explanation);
}

function makeNode(tag) {
  const n = {
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    value: '',
    href: '',
    disabled: false,
    selected: false,
    children: [],
    listeners: {},
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    appendChild(c) { this.children.push(c); return c; },
    append(...args) { args.forEach(c => { if (c) this.children.push(c); }); },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    get firstChild() { return this.children[0] || null; },
    addEventListener(ev, fn) { this.listeners[ev] = this.listeners[ev] || []; this.listeners[ev].push(fn); },
    trigger(ev) { (this.listeners[ev] || []).forEach(fn => fn()); }
  };
  return n;
}

const host = makeNode('section');
host.id = 'odisha-district-gk';
const ctx = vm.createContext({
  console, Array, Object, String, Number, Boolean,
  document: {
    readyState: 'loading',
    createElement: makeNode,
    getElementById: id => (id === 'odisha-district-gk' ? host : null),
    addEventListener() {}
  }
});
ctx.window = ctx;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/odisha-district-gk.js'), 'utf8'), ctx);
ctx.CSO_ODISHA_DISTRICT_GK.mountDistrictGk(host);

// Initial render has 30 cards
assert.equal(host.children[2].children.length, 30);

// Open 5-question drill
const drillBtn = host.children[1].children[3];
drillBtn.trigger('click');
assert.equal(host.children[2].id, 'district-gk-drill-box');
assert.equal(host.children[3].children.length, 30);

// 4. Verify 44px touch targets in assets/css/odisha-district-gk.css
console.log('4. Checking assets/css/odisha-district-gk.css 44px touch targets...');
const dgkCss = fs.readFileSync(path.join(ROOT, 'assets/css/odisha-district-gk.css'), 'utf8');
assert.ok(dgkCss.includes('min-height: 44px'), 'Missing 44px touch targets in odisha-district-gk.css');

// 5. Verify master navigation 23 folders / 299 modules
console.log('5. Checking admin/data/master-navigation.json (23 folders / 299 modules)...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 6. Strict CSP compliance across touched files
console.log('6. Checking 100% CSP compliance across touched files...');
const touched = [
  'assets/js/odisha-district-gk.js',
  'assets/css/odisha-district-gk.css',
  'study-library/index.html'
];
for (const rel of touched) {
  const c = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!/\sstyle\s*=/i.test(c), `${rel} must have 0 style="" attributes`);
  assert.ok(!/\sonclick\s*=/i.test(c), `${rel} must have 0 onclick= attributes`);
  if (rel.endsWith('.js')) {
    assert.ok(!/\.innerHTML\s*=/.test(c), `${rel} must have 0 .innerHTML assignments`);
  }
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(c), `${rel} must have 0 inline <style>`);
    const noExt = c.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
    const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(!/<script\b/i.test(noJsonLd), `${rel} must have 0 executable inline <script>`);
  }
}

// 7. Verify cache version bump to cso-candidate-cache-v215
console.log('7. Checking cache version bump to cso-candidate-cache-v215...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v215';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v215';"));

console.log('All v215 Odisha 30-District Static GK & Exam Fact-Sheet Explorer tests PASSED!');
