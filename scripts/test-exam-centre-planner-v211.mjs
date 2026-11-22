// Verification test for Odisha Exam-Day Centre Logistics & Hall Ticket Carry-Bag Planner (v211)
// Run: node scripts/test-exam-centre-planner-v211.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify tools/index.html & student-dashboard/index.html markup & asset bumps
console.log('1. Checking tools/index.html & student-dashboard/index.html markup...');
const toolsHtml = fs.readFileSync(path.join(ROOT, 'tools/index.html'), 'utf8');
assert.ok(toolsHtml.includes('id="exam-centre-planner"'), 'Missing #exam-centre-planner in tools/index.html');
assert.ok(toolsHtml.includes('id="centre-home-district"'), 'Missing #centre-home-district');
assert.ok(toolsHtml.includes('id="centre-exam-district"'), 'Missing #centre-exam-district');
assert.ok(toolsHtml.includes('id="centre-exam-date"'), 'Missing #centre-exam-date');
assert.ok(toolsHtml.includes('id="centre-gate-time"'), 'Missing #centre-gate-time');
assert.ok(toolsHtml.includes('id="centre-ics-btn"'), 'Missing #centre-ics-btn');
assert.ok(toolsHtml.includes('id="centre-bag-checklist"'), 'Missing #centre-bag-checklist');
assert.ok(toolsHtml.includes('id="centre-bag-progress"'), 'Missing #centre-bag-progress');
assert.ok(toolsHtml.includes('tools.css?v=20261122v211'), 'Missing ?v=20261122v211 on tools.css');
assert.ok(toolsHtml.includes('tools.js?v=20261122v211'), 'Missing ?v=20261122v211 on tools.js');
assert.ok(toolsHtml.includes('odisha-districts.js?v=20261122v211'), 'Missing ?v=20261122v211 on odisha-districts.js');
assert.ok(toolsHtml.includes('deadline-tracker.js?v=20261122v211'), 'Missing ?v=20261122v211 on deadline-tracker.js');

const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('href="/tools/#exam-centre-planner"'), 'Missing cross-link to /tools/#exam-centre-planner in student-dashboard/index.html');
assert.ok(dashHtml.includes('student-dashboard-bp.css?v=20261122v211'), 'Missing ?v=20261122v211 on student-dashboard-bp.css');
assert.ok(dashHtml.includes('student-dashboard.js?v=20261122v211'), 'Missing ?v=20261122v211 on student-dashboard.js');

// 2. Unit test logistics calculator & .ics generator
console.log('2. Testing calculateExamDayLogistics & buildExamDayIcs...');
const toolsMod = require(path.join(ROOT, 'tools/assets/tools.js'));
assert.equal(toolsMod.CARRY_BAG_KEY, 'cso_exam_day_bag_v1');
assert.equal(toolsMod.CARRY_BAG_ITEMS.length, 6, 'Expected 6 bilingual carry-bag items');

const sameDist = toolsMod.calculateExamDayLogistics({
  examName: 'OSSC CGLRE Prelims',
  homeDistrict: 'khordha',
  centreDistrict: 'khordha',
  centreDistrictLabel: 'Khordha (ଖୋର୍ଦ୍ଧା)',
  examDate: '2026-12-15',
  gateTime: '09:00'
});
assert.equal(sameDist.arrivalTimeLabel, '08:15 AM');
assert.equal(sameDist.gateClosingLabel, '09:00 AM');
assert.equal(sameDist.isInterDistrict, false);
assert.ok(sameDist.departureWindow.includes('Same-Day Morning Departure'));

const interDist = toolsMod.calculateExamDayLogistics({
  examName: 'OPSC OCS Prelims',
  homeDistrict: 'sambalpur',
  centreDistrict: 'cuttack',
  centreDistrictLabel: 'Cuttack (କଟକ)',
  examDate: '2026-12-20',
  gateTime: '10:30'
});
assert.equal(interDist.arrivalTimeLabel, '09:45 AM');
assert.equal(interDist.isInterDistrict, true);
assert.ok(interDist.departureWindow.includes('Overnight Travel Advisory'));

const ics = toolsMod.buildExamDayIcs({
  examName: 'OPSC OCS Prelims',
  homeDistrict: 'sambalpur',
  centreDistrict: 'cuttack',
  centreDistrictLabel: 'Cuttack',
  examDate: '2026-12-20',
  gateTime: '09:00'
});
assert.ok(ics.includes('BEGIN:VCALENDAR'));
assert.ok(ics.includes('BEGIN:VEVENT'));
assert.ok(ics.includes('BEGIN:VALARM'));
assert.ok(ics.includes('20261220'));

// 3. Simulate full DOM boot of tools.js + odisha-districts.js + deadline-tracker.js
console.log('3. Simulating DOM boot for 30-district selects, schedule card & cso_exam_day_bag_v1 checklist...');
const storageMap = new Map();
const storage = {
  getItem: k => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v))
};

function makeNode(tag) {
  const n = {
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    value: '',
    type: '',
    checked: false,
    selected: false,
    selectedIndex: 0,
    max: 0,
    children: [],
    listeners: {},
    attributes: {},
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    appendChild(c) {
      this.children.push(c);
      if (this.tagName === 'SELECT') {
        this.options = this.children;
        if (c.selected) this.selectedIndex = this.children.length - 1;
        if (this.children.length === 1 || c.selected) this.value = c.value;
      }
      return c;
    },
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
    },
    get firstChild() { return this.children[0] || null; },
    addEventListener(ev, fn) {
      this.listeners[ev] = this.listeners[ev] || [];
      this.listeners[ev].push(fn);
    },
    trigger(ev) {
      (this.listeners[ev] || []).forEach(fn => fn({ preventDefault() {} }));
    }
  };
  if (n.tagName === 'SELECT') n.options = n.children;
  return n;
}

const byId = new Map([
  ['centre-planner-form', makeNode('form')],
  ['centre-exam-name', Object.assign(makeNode('input'), { value: 'OPSC OCS Prelims' })],
  ['centre-home-district', makeNode('select')],
  ['centre-exam-district', makeNode('select')],
  ['centre-exam-date', Object.assign(makeNode('input'), { value: '2026-12-20' })],
  ['centre-gate-time', Object.assign(makeNode('input'), { value: '09:00' })],
  ['centre-ics-btn', makeNode('button')],
  ['centre-schedule-result', makeNode('div')],
  ['centre-bag-checklist', makeNode('div')],
  ['centre-bag-progress', makeNode('progress')],
  ['centre-bag-badge', makeNode('span')]
]);

const win = { location: { href: 'https://csodisha.com/tools/' } };
win.window = win;
const doc = {
  readyState: 'complete',
  createElement: makeNode,
  getElementById: id => byId.get(id) || null,
  addEventListener() {}
};

const ctx = vm.createContext({
  window: win,
  document: doc,
  localStorage: storage,
  console, Date, Math, Number, String, Array, Object, JSON, setTimeout, clearTimeout
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/odisha-districts.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/deadline-tracker.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tools/assets/tools.js'), 'utf8'), ctx);

assert.equal(byId.get('centre-home-district').children.length, 30, 'Home district select must have all 30 Odisha districts');
assert.equal(byId.get('centre-exam-district').children.length, 30, 'Exam centre district select must have all 30 Odisha districts');
assert.equal(byId.get('centre-bag-checklist').children.length, 6, 'Carry-bag checklist must render 6 bilingual items');

// Check first carry-bag item and verify localStorage + progress update
const firstCb = byId.get('centre-bag-checklist').children[0].children[0];
firstCb.checked = true;
firstCb.trigger('change');
assert.equal(byId.get('centre-bag-progress').value, 1);
assert.equal(byId.get('centre-bag-badge').textContent, '1 / 6 Ready');
const savedBag = JSON.parse(storage.getItem('cso_exam_day_bag_v1'));
assert.equal(savedBag.admit_card, true);

// 4. Verify 44px touch targets & CSS classes in tools/assets/tools.css
console.log('4. Checking tools/assets/tools.css styles...');
const toolsCss = fs.readFileSync(path.join(ROOT, 'tools/assets/tools.css'), 'utf8');
assert.ok(toolsCss.includes('.cso-carrybag-row'), 'Missing .cso-carrybag-row');
assert.ok(toolsCss.includes('min-height: 44px'), 'Missing 44px touch targets');

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
  'tools/index.html',
  'tools/assets/tools.js',
  'tools/assets/tools.css',
  'student-dashboard/index.html'
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

// 7. Verify cache version bump to cso-candidate-cache-v211
console.log('7. Checking cache version bump to cso-candidate-cache-v211...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v211';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v211';"));

console.log('All v211 Odisha Exam-Day Centre Logistics & Carry-Bag Planner tests PASSED!');
