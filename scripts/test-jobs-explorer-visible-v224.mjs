// Verification test for Default Visible #explorer, Zero Null-DOM TypeErrors,
// Immediate Top Selector + Branch Cards Rendering, and 100% CSP Compliance (v224)
// Run: node scripts/test-jobs-explorer-visible-v224.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Verify 23 folders / 299 modules in master-navigation.json
console.log('1. Checking 23 folders / 299 modules preservation...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 2. Verify #explorer is NOT hidden by default in jobs-careers/index.html & CSS
console.log('2. Checking #explorer is visible by default...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(/<section\s+id="explorer"\s+class="explorer"\s*>/i.test(jobsHtml), '<section id="explorer"> must NOT have hidden attribute');
assert.ok(jobsHtml.includes('/assets/js/jobs-directory-data.js?v=20261122v224'), 'Missing v224 jobs-directory-data.js');
assert.ok(jobsHtml.includes('./assets/dashboard.js?v=20261122v224'), 'Missing v224 dashboard.js');
assert.ok(jobsHtml.includes('./assets/dashboard.css?v=20261122v224'), 'Missing v224 dashboard.css');

const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('#explorer:not([hidden])'), 'CSS must ensure #explorer:not([hidden]) is display: block');

// 3. Simulate dashboard.js in Node VM against jobs-careers/index.html IDs
console.log('3. Simulating dashboard.js in Node VM to verify zero TypeErrors & immediate rendering...');
const ids = new Set([...jobsHtml.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]));
const els = {};
function makeEl(id) {
  return {
    id: id || '', tagName: 'DIV', className: '', textContent: '', value: '', hidden: false, style: {},
    dataset: {}, children: [],
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    setAttribute(){}, removeAttribute(){}, getAttribute(){ return ''; },
    append(...a){ this.children.push(...a); }, appendChild(a){ this.children.push(a); return a; },
    replaceChildren(...a){ this.children = a; }, addEventListener(){},
    querySelectorAll(){ return []; }, querySelector(){ return null; }, closest(){ return null; },
    insertBefore(){}, removeChild(){}, get firstChild(){ return this.children[0] || null; }
  };
}
for (const id of ids) els[id] = makeEl(id);
const dirJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'jobs-careers/generated/directory.json'), 'utf8'));
const ctx = vm.createContext({
  console, Array, Object, String, Number, Math, Set, Map, URL, URLSearchParams, Promise,
  setTimeout, clearTimeout, addEventListener(){},
  localStorage: { getItem: () => null, setItem(){} },
  history: { pushState(){}, replaceState(){} },
  location: { href: 'https://csodisha.com/jobs-careers/', pathname: '/jobs-careers/', search: '' },
  matchMedia: () => ({ matches: false, addEventListener(){} }),
  fetch: (u) => {
    if (String(u).includes('directory.json') || String(u).includes('jobs-directory')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(dirJson) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
  },
  document: {
    title: '', body: makeEl('body'), readyState: 'complete',
    getElementById: (id) => els[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    createElement: (t) => makeEl(t), createElementNS: (ns, t) => makeEl(t),
    addEventListener(){}
  }
});
ctx.window = ctx;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/jobs-directory-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8'), ctx);

await new Promise(r => setTimeout(r, 30));

assert.equal(els['explorer'].hidden, false, '#explorer must remain visible');
assert.ok(!els['load-status'].textContent.includes('Unable to load'), `Unexpected load error: ${els['load-status'].textContent}`);
assert.ok(els['cso-top-category-selector'].children.length >= 4, '#cso-top-category-selector must render 3 dropdowns + actions');
assert.ok(els['explorer-items'].children.length >= 1, '#explorer-items must render Layer 3 branch cards immediately');

// 4. Strict 100% CSP compliance & v224 cache bump
console.log('4. Checking 100% CSP compliance & v224 cache bump...');
const touched = [
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'jobs-careers/detail/index.html'
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

assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('cso-candidate-cache-v224'), 'sw.js must be bumped to v224');
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes('cso-candidate-cache-v224'), 'ops-sentinel.js must be bumped to v224');

console.log('All v224 Visible #explorer & Zero-TypeError tests PASSED!');
