import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function makeFakeDom() {
  function node(tag) {
    return {
      tag, className: '', textContent: '', children: [], attrs: {}, listeners: {}, value: '', disabled: false,
      appendChild(c) { this.children.push(c); return c; },
      replaceChildren(...c) { this.children = c; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      click() { (this.listeners.click || []).forEach((f) => f({})); },
      remove() {},
      classList: { add() {}, remove() {}, contains() { return false; } }
    };
  }
  const doc = { readyState: 'complete', body: node('body'), addEventListener() {}, getElementById: () => null, createElement: node, createTextNode: (t) => ({ tag: '#text', textContent: t }) };
  const all = (n, out = []) => { out.push(n); (n.children || []).forEach((c) => all(c, out)); return out; };
  return { doc, all };
}

const plain = (x) => JSON.parse(JSON.stringify(x));
const jsPath = 'assets/js/syllabus-mastery-tracker.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');
assert.ok(!/\bstyle\s*=\s*["']/.test(src), 'Zero inline style attributes');

const store = {};
const sandbox = {
  window: { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } },
  document: { readyState: 'complete', addEventListener: () => {}, getElementById: () => null },
  console, Date, Math, JSON
};
vm.runInNewContext(src, sandbox, { filename: jsPath });
const api = sandbox.window.CSOSyllabusMasteryTracker;
assert.ok(api, 'window.CSOSyllabusMasteryTracker must be exposed');
assert.equal(api.STORE_KEY, 'cso_syllabus_mastery_v1');

// 2. Five bilingual syllabi with chapter-level weightages
assert.deepEqual(Array.from(api.TRACK_KEYS), ['opsc-oas', 'ossc-cglre', 'osssc-cadre', 'oprb-si', 'teacher-ltr-ssd-oav']);
const expectedCounts = { 'opsc-oas': 12, 'ossc-cglre': 10, 'osssc-cadre': 10, 'oprb-si': 10, 'teacher-ltr-ssd-oav': 10 };
for (const k of api.TRACK_KEYS) {
  const t = api.SYLLABI[k];
  assert.equal(t.chapters.length, expectedCounts[k], k + ' chapter count');
  assert.ok(t.en && /[\u0B00-\u0B7F]/.test(t.or), k + ' has EN + Odia title');
  assert.ok(/[\u0B00-\u0B7F]/.test(t.papersOr) && t.papersEn.length > 10, k + ' bilingual papers');
  const ids = new Set();
  for (const c of t.chapters) {
    assert.ok(!ids.has(c.id), k + ' unique chapter id ' + c.id);
    ids.add(c.id);
    assert.ok(c.weight > 0 && c.en && /[\u0B00-\u0B7F]/.test(c.or), k + '/' + c.id + ' weight + bilingual labels');
  }
}
for (const k of ['ossc-cglre', 'osssc-cadre', 'oprb-si', 'teacher-ltr-ssd-oav']) {
  assert.equal(api.SYLLABI[k].chapters.reduce((a, c) => a + c.weight, 0), 100, k + ' weightages total 100%');
}
const oas = Object.fromEntries(api.SYLLABI['opsc-oas'].chapters.map((c) => [c.id, c.weight]));
assert.equal(oas.polity, 18); assert.equal(oas['odisha-history'], 16); assert.equal(oas.economy, 15);
assert.equal(oas.geography, 14); assert.equal(oas['current-events'], 15); assert.equal(oas['science-tech'], 10); assert.equal(oas.csat, 12);

// 3. computeSyllabusReadiness weightage-weighted math
const oasTotal = api.SYLLABI['opsc-oas'].chapters.reduce((a, c) => a + c.weight, 0);
const none = api.computeSyllabusReadiness('opsc-oas', {});
assert.equal(none.weightedMasteryPct, 0); assert.equal(none.completionLabel, '0 / 12'); assert.equal(none.barClass, 'cso-vfv-bar--w0');
const allM = {}; const allR = {};
api.SYLLABI['opsc-oas'].chapters.forEach((c) => { allM[c.id] = 'Mastered'; allR[c.id] = 'In Revision'; });
assert.equal(api.computeSyllabusReadiness('opsc-oas', allM).weightedMasteryPct, 100);
assert.equal(api.computeSyllabusReadiness('opsc-oas', allM).completionLabel, '12 / 12');
assert.equal(api.computeSyllabusReadiness('opsc-oas', allM).barClass, 'cso-vfv-bar--w100');
assert.equal(api.computeSyllabusReadiness('opsc-oas', allR).weightedMasteryPct, 50);
assert.equal(api.computeSyllabusReadiness('opsc-oas', allR).completionLabel, '0 / 12');
const mix = api.computeSyllabusReadiness('opsc-oas', { polity: 'Mastered', 'odisha-history': 'In Revision' });
assert.equal(mix.weightedMasteryPct, Math.round(((18 + 16 * 0.5) / oasTotal) * 10000) / 100);
assert.equal(mix.masteredCount, 1); assert.equal(mix.inRevisionCount, 1); assert.equal(mix.notStartedCount, 10);
const cglre = api.computeSyllabusReadiness('ossc-cglre', { arithmetic: 'Mastered', 'logical-reasoning': 'In Revision' });
assert.equal(cglre.weightedMasteryPct, 21, '(15 + 12*0.5) of 100 = 21%');
assert.equal(api.computeSyllabusReadiness('ossc-cglre', { arithmetic: 'bogus' }).weightedMasteryPct, 0, 'Unknown status treated as Not Started');

// 4. Weak-topic prioritisation: unstarted by highest weightage first, then In Revision
assert.deepEqual(plain(none.weakTopics.map((w) => w.id)), ['polity', 'odisha-history', 'current-events']);
const w2 = api.computeSyllabusReadiness('opsc-oas', { polity: 'Mastered', 'odisha-history': 'Mastered', 'current-events': 'Mastered' });
assert.deepEqual(plain(w2.weakTopics.map((w) => w.id)), ['economy', 'geography', 'csat']);
const w3 = {};
api.SYLLABI['osssc-cadre'].chapters.forEach((c) => { w3[c.id] = 'Mastered'; });
w3.arithmetic = 'In Revision'; w3['odia-grammar'] = 'In Revision';
const w3r = api.computeSyllabusReadiness('osssc-cadre', w3);
assert.deepEqual(plain(w3r.weakTopics.map((w) => w.id)), ['arithmetic', 'odia-grammar'], 'Falls back to In Revision chapters by weight');
assert.deepEqual(plain(api.computeSyllabusReadiness('osssc-cadre', Object.fromEntries(api.SYLLABI['osssc-cadre'].chapters.map((c) => [c.id, 'Mastered']))).weakTopics), []);
assert.ok(api.buildRevisionPlanText('opsc-oas', {}, 'en').includes('Indian Polity & Governance'));
assert.ok(/[\u0B00-\u0B7F]/.test(api.buildRevisionPlanText('opsc-oas', {}, 'or')));

// 5. mount() renders, persists mastery & reset (fake DOM)
const dom = makeFakeDom();
const sb2 = { window: sandbox.window, document: dom.doc, console, Date, Math, JSON };
sb2.window.navigator = { clipboard: { writeText: async () => {} } };
sb2.window.print = () => { sb2.printed = true; };
vm.runInNewContext(src, sb2, { filename: jsPath });
const root = dom.doc.createElement('section');
const inst = sb2.window.CSOSyllabusMasteryTracker.mount(root);
let nodes = dom.all(root);
const labels = nodes.map((n) => n.textContent);
assert.ok(labels.includes('📋 Copy Weak-Topic Revision Plan'), 'Copy plan button');
assert.ok(labels.includes('↺ Reset Track Progress'), 'Reset button');
assert.ok(labels.includes('🖨️ Print Syllabus & Mastery Checklist'), 'Print button');
assert.ok(nodes.some((n) => /cso-vfv-bar--w0/.test(n.className)), 'Discrete progress bar class');
const masterBtn = nodes.find((n) => n.tag === 'button' && n.attrs['data-status'] === 'Mastered');
masterBtn.click();
assert.equal(JSON.parse(store.cso_syllabus_mastery_v1).mastery['opsc-oas'].polity, 'Mastered', 'Mastery persisted in localStorage');
nodes = dom.all(root);
assert.ok(nodes.some((n) => n.textContent === '14.06%'), 'KPI shows 14.06% after mastering Polity');
dom.all(root).find((n) => n.textContent === '↺ Reset Track Progress').click();
assert.deepEqual(JSON.parse(store.cso_syllabus_mastery_v1).mastery['opsc-oas'], {}, 'Reset clears track');
dom.all(root).find((n) => n.textContent === 'ଓଡ଼ିଆ' && n.className === 'cso-smt-lang-btn').click();
assert.equal(JSON.parse(store.cso_syllabus_mastery_v1).lang, 'or');

// 6. Mounts, script tags, SW, CSS tokens
for (const p of ['exams/index.html', 'mock-tests/index.html']) {
  const txt = fs.readFileSync(p, 'utf8');
  assert.ok(txt.includes('id="cso-syllabus-mastery-tracker-root"'), p + ' mounts root');
  assert.ok(txt.includes('/assets/js/syllabus-mastery-tracker.js?v=20261128v450'), p + ' loads script v449');
}
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("'/assets/js/syllabus-mastery-tracker.js?v=20261128v450'"), 'sw.js precaches tracker');
const css = fs.readFileSync('assets/style.css', 'utf8');
for (const sel of ['.cso-smt-card', '.cso-smt-chapter', '.cso-smt-status-btn', '.cso-smt-weak']) assert.ok(css.includes(sel), 'CSS defines ' + sel);
const block = css.slice(css.indexOf('.cso-smt-root'));
const smtRules = block.match(/[^{}]*\.cso-smt-[^{]*\{[^}]*\}/g) || [];
assert.ok(smtRules.length > 10);
assert.ok(!smtRules.some((r) => /#[0-9a-fA-F]{3,8}\b/.test(r)), '.cso-smt-* uses no hardcoded hex');
assert.ok(/var\(--cso-/.test(smtRules.join('')), '.cso-smt-* uses var(--cso-*) tokens');
assert.ok(/\.cso-smt-btn[\s\S]{0,400}min-height: 44px/.test(css), '>=44px touch target');

console.log('PASS: v447 Odisha Govt Exam Syllabus & Topic Mastery Tracker suite verified.');
