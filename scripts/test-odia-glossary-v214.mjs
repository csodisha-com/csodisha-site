// Verification test for Bilingual Odia-English Administrative & Exam Glossary (v214)
// Run: node scripts/test-odia-glossary-v214.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify study-library/index.html mount, v214 assets & single search bar rule
console.log('1. Checking study-library/index.html mount & single search bar...');
const studyHtml = fs.readFileSync(path.join(ROOT, 'study-library/index.html'), 'utf8');
assert.ok(studyHtml.includes('id="odia-glossary"'), 'Missing #odia-glossary in study-library/index.html');
assert.ok(studyHtml.includes('/assets/css/odia-glossary.css?v=20261122v214'), 'Missing ?v=20261122v214 on odia-glossary.css');
assert.ok(studyHtml.includes('/assets/js/odia-glossary.js?v=20261122v214'), 'Missing ?v=20261122v214 on odia-glossary.js');

const searchInputs = (studyHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(searchInputs.length, 1, 'study-library/index.html must keep strictly 1 search bar (#directory-search)');

// 2. Verify 40+ authentic terms, 4 categories & cso_saved_glossary_v1 persistence
console.log('2. Testing 40+ authentic EN + Odia terms & cso_saved_glossary_v1...');
const glossary = require(path.join(ROOT, 'assets/js/odia-glossary.js'));
assert.equal(glossary.STORAGE_KEY, 'cso_saved_glossary_v1');
assert.ok(glossary.GLOSSARY_TERMS.length >= 40, `Expected >= 40 terms, got ${glossary.GLOSSARY_TERMS.length}`);
assert.deepEqual(glossary.CATEGORIES, [
  'Revenue & District Admin',
  'Secretariat & Notifications',
  'Judiciary & Polity',
  'Finance & Welfare Schemes'
]);

for (const term of glossary.GLOSSARY_TERMS) {
  assert.ok(term.id && term.en && term.odia && term.translit && term.category && term.usageEn && term.usageOdia, `Incomplete term: ${term.id}`);
  assert.ok(/[\u0B00-\u0B7F]/.test(term.odia), `Term ${term.id} must contain Odia script`);
}

// 3. Simulate DOM mount, category filtering, self-test toggle & bookmarking
console.log('3. Simulating DOM mount, self-test mode & bookmarking...');
const storeMap = new Map();
const fakeStorage = {
  getItem: k => (storeMap.has(k) ? storeMap.get(k) : null),
  setItem: (k, v) => storeMap.set(k, String(v))
};

function makeNode(tag) {
  const n = {
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    value: '',
    selected: false,
    children: [],
    listeners: {},
    attributes: {},
    classList: {
      toggle(cls, force) {
        const set = new Set(n.className.split(/\s+/).filter(Boolean));
        const has = set.has(cls);
        const next = force === undefined ? !has : Boolean(force);
        if (next) set.add(cls); else set.delete(cls);
        n.className = Array.from(set).join(' ');
      }
    },
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
host.id = 'odia-glossary';
const syncCalls = [];

const ctx = vm.createContext({
  localStorage: fakeStorage,
  console,
  Array,
  Object,
  String,
  Boolean,
  JSON,
  fetch: async (url, opts) => { syncCalls.push({ url, opts }); return { ok: true }; },
  document: {
    readyState: 'loading',
    createElement: makeNode,
    getElementById: id => (id === 'odia-glossary' ? host : null),
    addEventListener() {}
  }
});
ctx.window = ctx;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/odia-glossary.js'), 'utf8'), ctx);
ctx.CSO_ODIA_GLOSSARY.mountGlossary(host, fakeStorage);

function collectText(node) {
  let out = node.textContent ? [node.textContent] : [];
  for (const ch of node.children || []) out = out.concat(collectText(ch));
  return out;
}

// Verify 44 cards rendered initially
const grid = host.children[2];
assert.equal(grid.children.length, glossary.GLOSSARY_TERMS.length);

// Save first term
const firstSaveBtn = grid.children[0].children[0].children[1];
firstSaveBtn.trigger('click');
assert.equal(ctx.CSO_ODIA_GLOSSARY.isSaved(glossary.GLOSSARY_TERMS[0].id, fakeStorage), true);
assert.equal(syncCalls.length, 1);
assert.equal(syncCalls[0].url, '/api/sync');

// Toggle Self-Test mode (Hide Odia Meaning)
const selfTestBtn = host.children[1].children[2];
selfTestBtn.trigger('click');
const textAfterHide = collectText(host).join(' | ');
assert.ok(textAfterHide.includes('Reveal Odia Meaning'), 'Self-test mode should show Reveal Odia Meaning button');
assert.ok(!textAfterHide.includes(glossary.GLOSSARY_TERMS[0].odia), 'Self-test mode should hide Odia meaning until revealed');

// Toggle Saved for Revision Only
const savedOnlyBtn = host.children[1].children[1];
savedOnlyBtn.trigger('click');
assert.equal(host.children[2].children.length, 1, 'Saved-only filter should show 1 bookmarked term');

// 4. Verify 44px touch targets in assets/css/odia-glossary.css
console.log('4. Checking assets/css/odia-glossary.css 44px touch targets...');
const glossaryCss = fs.readFileSync(path.join(ROOT, 'assets/css/odia-glossary.css'), 'utf8');
assert.ok(glossaryCss.includes('min-height: 44px'), 'Missing 44px touch targets in odia-glossary.css');
assert.ok(!glossaryCss.includes('<style'), 'No HTML in CSS');

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
  'assets/js/odia-glossary.js',
  'assets/css/odia-glossary.css',
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

// 7. Verify cache version bump to cso-candidate-cache-v214
console.log('7. Checking cache version bump to cso-candidate-cache-v214...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v214';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v214';"));

console.log('All v214 Bilingual Odia-English Administrative & Exam Glossary tests PASSED!');
