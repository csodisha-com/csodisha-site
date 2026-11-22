// Verification test for Unified Candidate Exam Readiness Overview & Print-Ready Study Plan (v210)
// Run: node scripts/test-candidate-readiness-v210.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Verify student-dashboard/index.html markup & v210 asset bumps
console.log('1. Checking student-dashboard/index.html markup & v210 asset bumps...');
const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('id="cso-readiness-summary-card"'), 'Missing #cso-readiness-summary-card in student-dashboard/index.html');
assert.ok(dashHtml.includes('student-dashboard-bp.css?v=20261122v210'), 'Missing ?v=20261122v210 on student-dashboard-bp.css');
assert.ok(dashHtml.includes('student-dashboard.js?v=20261122v210'), 'Missing ?v=20261122v210 on student-dashboard.js');

// 2. Verify assets/js/student-dashboard.js aggregation logic & zero innerHTML
console.log('2. Checking assets/js/student-dashboard.js live aggregation & CSP compliance...');
const dashJs = fs.readFileSync(path.join(ROOT, 'assets/js/student-dashboard.js'), 'utf8');
assert.ok(dashJs.includes('computeReadinessTelemetry'), 'Missing computeReadinessTelemetry()');
assert.ok(dashJs.includes('renderReadinessSummaryCard'), 'Missing renderReadinessSummaryCard()');
assert.ok(dashJs.includes('cso_tracked_deadlines_v1'), 'Missing deadline storage key');
assert.ok(dashJs.includes('cso_doc_readiness_v1'), 'Missing document readiness storage key');
assert.ok(dashJs.includes('cso_syllabus_progress_v1'), 'Missing syllabus progress storage key');
assert.ok(dashJs.includes('cso_ca_quiz_streak_v1'), 'Missing daily quiz streak storage key');
assert.ok(dashJs.includes('cso_cbt_history_v1'), 'Missing CBT history storage key');
assert.ok(dashJs.includes('window.print()'), 'Missing window.print() handler');
assert.ok(dashJs.includes('Print / Save Readiness Plan'), 'Missing Print / Save Readiness Plan button label');
assert.ok(!/\.innerHTML\s*=/.test(dashJs), 'student-dashboard.js must have 0 .innerHTML assignments');

// 3. Simulate live DOM + localStorage execution of deadline-tracker, document-readiness, syllabus-pyq-vault, and readiness summary
console.log('3. Simulating live telemetry aggregation with empty vs populated localStorage...');
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
}

function makeFakeDom(storage) {
  const elementsById = new Map();
  function makeNode(tag) {
    const node = {
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      type: '',
      href: '',
      children: [],
      attributes: {},
      listeners: {},
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {}
      },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] || null; },
      appendChild(child) { this.children.push(child); return child; },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
      },
      get firstChild() { return this.children[0] || null; },
      addEventListener(ev, fn) {
        this.listeners[ev] = this.listeners[ev] || [];
        this.listeners[ev].push(fn);
      },
      click() {
        (this.listeners.click || []).forEach(fn => fn());
      }
    };
    return node;
  }
  const summaryCard = makeNode('section');
  summaryCard.id = 'cso-readiness-summary-card';
  elementsById.set('cso-readiness-summary-card', summaryCard);

  const win = {
    location: { pathname: '/student-dashboard/', search: '' },
    printCalled: 0,
    print() { this.printCalled += 1; },
    addEventListener() {},
    localStorage: storage
  };
  win.window = win;
  const doc = {
    createElement: tag => makeNode(tag),
    getElementById: id => elementsById.get(id) || null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };
  return { win, doc, summaryCard };
}

// Load helper modules into VM to test real aggregation
function collectText(node) {
  let out = node.textContent ? [node.textContent] : [];
  for (const ch of node.children || []) out = out.concat(collectText(ch));
  return out;
}

// Empty state check (zero fake fallback values)
{
  const storage = makeStorage();
  const { win, doc, summaryCard } = makeFakeDom(storage);
  const ctx = vm.createContext({ window: win, document: doc, localStorage: storage, console, Date, Math, Number, String, Array, Object, JSON, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/deadline-tracker.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/document-readiness.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'study-library/assets/syllabus-pyq-vault.js'), 'utf8'), ctx);

  // Extract computeReadinessTelemetry + renderReadinessSummaryCard + helpers for isolated unit test
  const fnSliceStart = dashJs.indexOf('  function computeReadinessTelemetry()');
  const fnSliceEnd = dashJs.indexOf('  function renderTrackedDeadlinesPanel()');
  const snippet = dashJs.slice(fnSliceStart, fnSliceEnd);
  vm.runInContext(`
    const state = { attempts: [] };
    const SCORES_KEY = 'cso_candidate_mock_scores_v1';
    function clear(n){ while(n && n.firstChild) n.removeChild(n.firstChild); return n; }
    function el(t, c, txt){ const n = document.createElement(t); if(c) n.className = c; if(txt !== undefined && txt !== null) n.textContent = String(txt); return n; }
    function readJsonStorage(k, fb){ try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } }
    ${snippet}
    renderReadinessSummaryCard();
    window.__telemetryEmpty = computeReadinessTelemetry();
  `, ctx);

  assert.equal(win.__telemetryEmpty.activeDeadlines, 0, 'Empty deadlines must be 0');
  assert.equal(win.__telemetryEmpty.docsReady, 0, 'Empty docsReady must be 0');
  assert.equal(win.__telemetryEmpty.docsTotal, 8, 'docsTotal must be 8');
  assert.equal(win.__telemetryEmpty.syllabusDone, 0, 'Empty syllabusDone must be 0');
  assert.equal(win.__telemetryEmpty.cbtAttempts, 0, 'Empty cbtAttempts must be 0');
  assert.equal(win.__telemetryEmpty.currentStreak, 0, 'Empty currentStreak must be 0');

  const texts = collectText(summaryCard).join(' | ');
  assert.ok(texts.includes('0 / 8 verified'), 'Should display 0 / 8 verified when empty');
  assert.ok(texts.includes('No upcoming deadlines tracked'), 'Should display empty deadline message');
}

// Populated state check
{
  const futureDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const storage = makeStorage({
    cso_tracked_deadlines_v1: JSON.stringify([
      { id: 'job-opsc-1', title: 'OPSC OAS Prelims', board: 'OPSC', lastDate: futureDate }
    ]),
    cso_doc_readiness_v1: JSON.stringify({
      checked: { 'aadhaar-digilocker': true, 'hsc-10th': true, 'otr-portals': true }
    }),
    cso_syllabus_progress_v1: JSON.stringify({
      'opsc-oas': { 'opsc-gs1-hist': true, 'opsc-gs1-geo': true },
      'osssc-group-c': { 'osssc-arith': true }
    }),
    cso_cbt_history_v1: JSON.stringify([{ examLabel: 'OPSC Mock 1', accuracyPct: 80 }]),
    cso_ca_quiz_streak_v1: JSON.stringify({ streak: 7 })
  });
  const { win, doc, summaryCard } = makeFakeDom(storage);
  const ctx = vm.createContext({ window: win, document: doc, localStorage: storage, console, Date, Math, Number, String, Array, Object, JSON, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/deadline-tracker.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/document-readiness.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'study-library/assets/syllabus-pyq-vault.js'), 'utf8'), ctx);

  const fnSliceStart = dashJs.indexOf('  function computeReadinessTelemetry()');
  const fnSliceEnd = dashJs.indexOf('  function renderTrackedDeadlinesPanel()');
  const snippet = dashJs.slice(fnSliceStart, fnSliceEnd);
  vm.runInContext(`
    const state = { attempts: [{ id: 'a1' }] };
    const SCORES_KEY = 'cso_candidate_mock_scores_v1';
    function clear(n){ while(n && n.firstChild) n.removeChild(n.firstChild); return n; }
    function el(t, c, txt){ const n = document.createElement(t); if(c) n.className = c; if(txt !== undefined && txt !== null) n.textContent = String(txt); return n; }
    function readJsonStorage(k, fb){ try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } }
    ${snippet}
    renderReadinessSummaryCard();
    window.__telemetryPopulated = computeReadinessTelemetry();
  `, ctx);

  assert.equal(win.__telemetryPopulated.activeDeadlines, 1);
  assert.ok(win.__telemetryPopulated.nearestDays >= 4 && win.__telemetryPopulated.nearestDays <= 5);
  assert.equal(win.__telemetryPopulated.docsReady, 3);
  assert.equal(win.__telemetryPopulated.docsTotal, 8);
  assert.equal(win.__telemetryPopulated.syllabusDone, 3);
  assert.equal(win.__telemetryPopulated.cbtAttempts, 2);
  assert.equal(win.__telemetryPopulated.currentStreak, 7);

  const texts = collectText(summaryCard).join(' | ');
  assert.ok(texts.includes('3 / 8 verified'), 'Should display 3 / 8 verified');
  assert.ok(texts.includes('2 Mocks · 7d Streak'), 'Should display 2 Mocks · 7d Streak');
  assert.ok(texts.includes('OPSC OAS Prelims'), 'Should highlight nearest deadline title');

  // Verify Print button click triggers window.print()
  const printBtn = summaryCard.children[0].children[1];
  assert.equal(printBtn.id, 'cso-readiness-print-btn');
  printBtn.click();
  assert.equal(win.printCalled, 1, 'Clicking Print / Save Readiness Plan should call window.print()');
}

// 4. Verify @media print & 44px touch targets in assets/css/student-dashboard-bp.css
console.log('4. Checking assets/css/student-dashboard-bp.css @media print & 44px touch targets...');
const dashCss = fs.readFileSync(path.join(ROOT, 'assets/css/student-dashboard-bp.css'), 'utf8');
assert.ok(dashCss.includes('@page'), 'Missing @page A4 rule');
assert.ok(dashCss.includes('@media print'), 'Missing @media print rules');
assert.ok(dashCss.includes('.cso-readiness-print-btn'), 'Missing .cso-readiness-print-btn styles');
assert.ok(dashCss.includes('min-height: 44px') || dashCss.includes('min-height:44px'), 'Missing 44px touch target');
assert.ok(dashCss.includes('#cso-readiness-summary-card'), 'Missing print rules for #cso-readiness-summary-card');

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
  'student-dashboard/index.html',
  'assets/js/student-dashboard.js',
  'assets/css/student-dashboard-bp.css'
];
for (const rel of touched) {
  const c = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!/\sstyle\s*=/i.test(c), `${rel} must have 0 style="" attributes`);
  assert.ok(!/\sonclick\s*=/i.test(c), `${rel} must have 0 onclick= attributes`);
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(c), `${rel} must have 0 inline <style>`);
    const noExt = c.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
    const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(!/<script\b/i.test(noJsonLd), `${rel} must have 0 executable inline <script>`);
  }
}

// 7. Verify cache version bump to cso-candidate-cache-v210
console.log('7. Checking cache version bump to cso-candidate-cache-v210...');
const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v210';"), 'sw.js missing v210');
const opsJs = fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v210';"), 'ops-sentinel.js missing v210');

console.log('All v210 Candidate Readiness Overview & Print-Ready Study Plan tests PASSED!');
