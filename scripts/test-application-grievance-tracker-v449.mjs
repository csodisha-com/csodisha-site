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

const jsPath = 'assets/js/application-status-grievance-tracker.js';
const src = fs.readFileSync(jsPath, 'utf8');

assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');
assert.ok(!/\bstyle\s*=\s*["']/.test(src), 'Zero inline style attributes');

const store = {};
const win = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
const sandbox = { window: win, document: { readyState: 'complete', addEventListener: () => {}, getElementById: () => null }, console, Date, Math, JSON };
vm.runInNewContext(src, sandbox, { filename: jsPath });
const api = win.CSOApplicationGrievanceTracker;
assert.ok(api, 'window.CSOApplicationGrievanceTracker must be exposed');
assert.equal(api.LEDGER_KEY, 'cso_personal_applications_ledger_v1');
assert.deepEqual(Array.from(api.BOARDS), ['OPSC', 'OSSC', 'OSSSC', 'OPRB', 'OAVS', 'SSB Odisha', 'RRB / SSC']);
assert.deepEqual(Array.from(api.STAGES), ['Applied & Fee Paid', 'Admit Card Downloaded', 'Written / CBT Appeared', 'Answer Key Challenged', 'Document Verification (DV)', 'Final Selected']);

// Ledger state transitions
assert.equal(api.loadLedger().length, 2, 'Preloaded sample entries when ledger empty');
assert.ok(api.loadLedger().every((e) => e.sample));
let ledger = [];
ledger = api.upsertApplicationEntry(ledger, { title: 'OPSC OAS 2027', board: 'OPSC', appNo: 'A-1', rollNo: 'R-1', examDate: '2027-02-10', stage: 'Applied & Fee Paid', notes: 'n' });
assert.equal(ledger.length, 1); assert.ok(ledger[0].id, 'id assigned');
const id = ledger[0].id;
ledger = api.upsertApplicationEntry(ledger, Object.assign({}, ledger[0], { stage: 'Admit Card Downloaded' }));
assert.equal(ledger.length, 1, 'Upsert by id updates in place'); assert.equal(ledger[0].stage, 'Admit Card Downloaded'); assert.equal(ledger[0].id, id);
const before = ledger;
ledger = api.upsertApplicationEntry(ledger, { title: 'OSSC CGLRE', board: 'OSSC', examDate: '2027-03-01', stage: 'Document Verification (DV)' });
assert.equal(ledger.length, 2); assert.equal(before.length, 1, 'upsert is pure (does not mutate input)');
ledger = api.upsertApplicationEntry(ledger, { title: 'OSSSC RI', board: 'OSSSC', examDate: '2026-01-05', stage: 'Final Selected' });
ledger = api.upsertApplicationEntry(ledger, { title: 'Bad', board: 'NOPE', stage: 'NOPE', examDate: 'tomorrow' });
const bad = ledger[3];
assert.equal(bad.board, 'OSSC'); assert.equal(bad.stage, 'Applied & Fee Paid'); assert.equal(bad.examDate, '', 'invalid values normalised');
const sum = api.summarizeApplicationLedger(ledger, '2026-12-01');
assert.equal(sum.total, 4);
assert.equal(sum.upcoming, 1, 'Only OPSC (admit card stage, future date) is upcoming; DV/final/past excluded');
assert.equal(sum.dvFinal, 2, 'DV + Final Selected');
assert.equal(sum.byStage['Admit Card Downloaded'], 1);
assert.equal(sum.nextExam.title, 'OPSC OAS 2027');
assert.equal(sum.byBoard.OSSC, 2);
ledger = api.removeApplicationEntry(ledger, id);
assert.equal(api.summarizeApplicationLedger(ledger, '2026-12-01').upcoming, 0);
assert.equal(api.summarizeApplicationLedger([], '2026-12-01').total, 0);

// Escalation directory
const d = api.DIRECTORY;
assert.equal(d.OPSC.website, 'opsconline.gov.in'); assert.equal(d.OPSC.phone, '0671-2304141'); assert.equal(d.OPSC.email, 'opsc@nic.in');
assert.equal(d.OSSC.website, 'ossc.gov.in'); assert.equal(d.OSSC.phone, '0674-2394466'); assert.equal(d.OSSC.email, 'orissassc@gmail.com');
assert.equal(d.OSSSC.website, 'osssc.gov.in'); assert.equal(d.OSSSC.phone, '0674-2597149'); assert.equal(d.OSSSC.email, 'helpdesk@osssc.gov.in');
assert.equal(d.OPRB.website, 'odishapolice.gov.in'); assert.equal(d.OPRB.phone, '0671-2304001');
assert.equal(d.OAVS.website, 'oav.edu.in'); assert.equal(d.OAVS.phone, '0674-2303382');
const portals = Array.from(api.ESCALATION_PORTALS).map((p) => p.website);
assert.ok(portals.includes('janasunani.odisha.gov.in') && portals.includes('rtiodisha.gov.in'));

// Letters
const rep = api.generateCommissionRepresentation({ type: 'admit-card', board: 'OSSSC', name: 'A Candidate', post: 'OSSSC RI', appNo: 'AP-9', rollNo: 'RN-4', details: 'photo mismatch' });
assert.ok(rep.includes('OSSSC') && rep.includes('AP-9') && rep.includes('RN-4') && rep.includes('photo mismatch') && rep.includes('Admit Card'));
assert.ok(!rep.includes('Section 6(1)'));
const ak = api.generateCommissionRepresentation({ type: 'answer-key', board: 'OPSC', name: 'N', post: 'OAS', details: 'Q17 Set B' });
assert.ok(ak.includes('Answer Key') && ak.includes('Q17 Set B') && ak.includes('Odisha Public Service Commission'));
const cat = api.generateCommissionRepresentation({ type: 'category-pwbd', board: 'OSSC', name: 'N', post: 'CGLRE' });
assert.ok(cat.includes('Category / PwBD'));
const rti = api.generateCommissionRepresentation({ type: 'rti', board: 'OPRB', name: 'N', post: 'SI', appNo: 'X1', rollNo: 'Y2', date: '2026-12-01' });
assert.ok(rti.includes('Section 6(1) of the Right to Information Act, 2005'), 'RTI Section 6(1)');
assert.ok(rti.includes('₹10') && rti.includes('Indian Postal Order') && rti.includes('0070-60-800'), 'RTI fee ₹10 IPO / challan head');
assert.ok(rti.includes('State Public Information Officer') && rti.includes('Odisha Police Recruitment Board'));
assert.ok(rti.includes('1 December 2026'));
assert.ok(api.generateCommissionRepresentation({}).includes('[Candidate Name]'), 'Safe defaults');

// Calendar export integration + mount (fake DOM)
const icsSrc = fs.readFileSync('assets/js/ics-calendar-export.js', 'utf8');
const dom = makeFakeDom();
dom.doc.body.classList = { contains: () => false };
dom.doc.createElement = ((orig) => (t) => { const n = orig(t); n.click = n.click || (() => {}); n.remove = () => {}; return n; })(dom.doc.createElement);
const downloads = [];
const win2 = Object.assign({}, win, {
  navigator: { clipboard: { writeText: async () => {} } }, print: () => {}, Blob: class { constructor(p, o) { this.p = p; this.o = o; } },
  URL: { createObjectURL: (b) => { downloads.push(b); return 'blob:x'; }, revokeObjectURL() {} }
});
const sb2 = { window: win2, document: dom.doc, console, Date, Math, JSON, setTimeout: () => 0, URL: win2.URL, Blob: win2.Blob };
vm.runInNewContext(icsSrc, sb2, { filename: 'ics-calendar-export.js' });
assert.ok(win2.CSOCalendarExport, 'window.CSOCalendarExport available');
const ics = win2.CSOCalendarExport.buildIcsString([{ uid: 'cso-app-x', date: '2027-02-10', summary: 'OPSC — OAS' }]);
assert.ok(ics.includes('BEGIN:VEVENT') && ics.includes('20270210'), 'ISO exam date produces valid ICS event');
vm.runInNewContext(src, sb2, { filename: jsPath });
const root = dom.doc.createElement('section');
win2.CSOApplicationGrievanceTracker.mount(root);
let labels = dom.all(root).map((n) => n.textContent);
for (const l of ['➕ Add Application Record', '📥 Export Ledger JSON', '📋 Copy Application Summary', '🖨️ Print Personal Application Log', '📅 Export Exam Date (.ics)', '✍️ Generate Letter']) assert.ok(labels.includes(l), 'Button: ' + l);
assert.ok(labels.includes('Total Applied') && labels.includes('Upcoming Exams') && labels.includes('DV / Final Stage'), 'KPI counters');
const icsBtn = dom.all(root).find((n) => n.textContent === '📅 Export Exam Date (.ics)' && !n.disabled);
icsBtn.click();
assert.ok(downloads.length >= 1, 'ICS download triggered through CSOCalendarExport');
dom.all(root).find((n) => n.textContent === '🧹 Clear Sample Entries').click();
assert.equal(JSON.parse(store.cso_personal_applications_ledger_v1).length, 0, 'Sample entries cleared and ledger persisted');
dom.all(root).find((n) => n.textContent === '✍️ Generate Letter').click();
assert.ok(dom.all(root).some((n) => n.className === 'cso-agt-letter' && n.textContent.includes('Subject:')), 'Letter rendered');

// Mounts, CSS, SW
for (const p of ['jobs/index.html', 'functions/_lib/informative-guides.js']) {
  const txt = fs.readFileSync(p, 'utf8');
  assert.ok(txt.includes('id="cso-application-grievance-root"'), p + ' mounts root');
  assert.ok(txt.includes('/assets/js/application-status-grievance-tracker.js?v=20261128v456'), p + ' loads script v449');
}
assert.ok(fs.readFileSync('sw.js', 'utf8').includes("'/assets/js/application-status-grievance-tracker.js?v=20261128v456'"));
const css = fs.readFileSync('assets/style.css', 'utf8');
for (const sel of ['.cso-agt-card', '.cso-agt-row', '.cso-agt-letter', '.cso-agt-table']) assert.ok(css.includes(sel), 'CSS defines ' + sel);
const agtRules = (css.slice(css.indexOf('.cso-smt-root')).match(/[^{}]*\.cso-agt-[^{]*\{[^}]*\}/g)) || [];
assert.ok(agtRules.length > 10);
assert.ok(!agtRules.some((r) => /#[0-9a-fA-F]{3,8}\b/.test(r)), '.cso-agt-* uses no hardcoded hex');
assert.ok(/var\(--cso-/.test(agtRules.join('')));
assert.ok(/\.cso-agt-btn[\s\S]{0,400}min-height: 44px/.test(css), '>=44px touch target');

console.log('PASS: v449 Odisha Govt Recruitment Application Status, Admit Card & Grievance Tracker suite verified.');
