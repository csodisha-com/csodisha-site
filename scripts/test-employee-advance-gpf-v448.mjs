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

const jsPath = 'assets/js/employee-advance-gpf-calculator.js';
const src = fs.readFileSync(jsPath, 'utf8');

assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');
assert.ok(!/\bstyle\s*=\s*["']/.test(src), 'Zero inline style attributes');

const store = { cso_orsp_salary_prefs_v1: JSON.stringify({ basicPay: 61000 }) };
const win = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
const sandbox = { window: win, document: { readyState: 'complete', addEventListener: () => {}, getElementById: () => null }, console, Date, Math, JSON };
vm.runInNewContext(src, sandbox, { filename: jsPath });
const api = win.CSOEmployeeAdvanceGpfCalculator;
assert.ok(api, 'window.CSOEmployeeAdvanceGpfCalculator must be exposed');
assert.equal(api.PREFS_KEY, 'cso_employee_advance_gpf_v1');

// Module A: HBA — 34 months Basic Pay, simple-interest schedule
const simpleInterest = (P, n, rate) => Math.round((rate / 1200) * (n * P - (P / n) * n * (n - 1) / 2));
const a = api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, estimatedCost: 3000000, remainingServiceMonths: 240, capMode: 'standard' });
assert.equal(a.hba.byBasicPay, 1700000, '34 x 50,000 = 17,00,000');
assert.equal(a.maxSanctionedHba, 1700000);
assert.equal(a.hba.bindingLimit, 'basic-pay-34');
assert.equal(a.hba.principalInstalments, 180, 'Principal recovery in 180 instalments');
assert.equal(a.monthlyPrincipalEmi, Math.round(1700000 / 180));
assert.equal(a.hba.interestInstalments, 60, 'Interest recovery in 60 instalments');
assert.equal(a.hba.interestRate, 7.1, 'Default simple interest 7.1%');
assert.equal(a.totalSimpleInterest, simpleInterest(1700000, 180, 7.1));
assert.equal(a.monthlyInterestEmi, Math.round(a.totalSimpleInterest / 60));
assert.equal(a.hba.totalRepayable, 1700000 + a.totalSimpleInterest);
const custom = api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, estimatedCost: 3000000, remainingServiceMonths: 240, hbaInterestRate: 8.5 });
assert.equal(custom.totalSimpleInterest, simpleInterest(1700000, 180, 8.5), 'Custom interest %');
assert.ok(custom.totalSimpleInterest > a.totalSimpleInterest);

// Caps & binding limits
const capStd = api.calculateEmployeeAdvanceAndGpf({ basicPay: 100000, estimatedCost: 9000000, remainingServiceMonths: 300, capMode: 'standard' });
assert.equal(capStd.maxSanctionedHba, 2500000, 'Standard cap ₹25,00,000'); assert.equal(capStd.hba.bindingLimit, 'ceiling');
const capExt = api.calculateEmployeeAdvanceAndGpf({ basicPay: 150000, estimatedCost: 9000000, remainingServiceMonths: 300, capMode: 'extended' });
assert.equal(capExt.maxSanctionedHba, 4000000, 'Extended cap ₹40,00,000');
assert.equal(api.calculateEmployeeAdvanceAndGpf({ basicPay: 100000, estimatedCost: 9000000, remainingServiceMonths: 300, capMode: 'extended' }).maxSanctionedHba, 3400000, '34 x 1,00,000 below extended cap');
const costBound = api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, estimatedCost: 1000000, remainingServiceMonths: 240 });
assert.equal(costBound.maxSanctionedHba, 1000000); assert.equal(costBound.hba.bindingLimit, 'estimated-cost');
const repay = api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, estimatedCost: 3000000, remainingServiceMonths: 60 });
assert.equal(repay.hba.byRepayCapacity, 1200000, '40% x 50,000 x 60');
assert.equal(repay.maxSanctionedHba, 1200000); assert.equal(repay.hba.bindingLimit, 'repaying-capacity');
assert.equal(repay.hba.principalInstalments, 60, 'Principal instalments limited by remaining service');
assert.equal(repay.hba.recoveryExceedsService, true);
assert.equal(a.hba.recoveryExceedsService, false);

// Module B: GPF part-final withdrawal
const g1 = api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 800000, serviceYears: 12, gpfPurpose: 'house', basicPay: 50000 });
assert.equal(g1.gpf.purposePct, 90); assert.equal(g1.permissibleWithdrawal, 720000); assert.equal(g1.gpf.taxFreeAmount, 720000);
assert.equal(g1.gpf.taxExemptSection, '10(11)');
const g2 = api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 800000, serviceYears: 12, gpfPurpose: 'education' });
assert.equal(g2.gpf.purposePct, 75); assert.equal(g2.gpf.eligible, false); assert.equal(g2.permissibleWithdrawal, 0, '15-year rule not met');
assert.equal(g2.gpf.maxPermissibleAmount, 600000);
const g3 = api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 800000, serviceYears: 15, gpfPurpose: 'education' });
assert.equal(g3.gpf.eligible, true); assert.equal(g3.permissibleWithdrawal, 600000);
assert.equal(api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 1000000, serviceYears: 20, gpfPurpose: 'medical' }).permissibleWithdrawal, 900000);
assert.equal(api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 1000000, serviceYears: 20, gpfPurpose: 'vehicle' }).permissibleWithdrawal, 750000);
assert.equal(api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 1000000, serviceYears: 30, gpfPurpose: 'superannuation' }).permissibleWithdrawal, 900000);
assert.equal(api.calculateEmployeeAdvanceAndGpf({ gpfBalance: 0, serviceYears: 30, gpfPurpose: 'house' }).gpf.eligibilityReason, 'no-balance');
assert.equal(Object.keys(api.GPF_PURPOSES).length, 5);

// Module C: Festival Advance & vehicle/computer
const c = api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, vehicleKind: 'two-wheeler', vehicleCost: 60000 });
assert.equal(c.festivalAdvance, 20000); assert.equal(c.other.festivalInstalments, 10); assert.equal(c.festivalMonthlyRecovery, 2000);
assert.equal(c.other.festivalInterestFree, true);
assert.equal(c.other.vehicleAdvanceAmount, 60000); assert.equal(c.other.vehicleMonthlyRecovery, 1000);
const pc = api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, vehicleKind: 'computer', vehicleCost: 80000 });
assert.equal(pc.other.vehicleAdvanceAmount, 50000, 'Computer advance ceiling'); assert.equal(pc.other.vehicleInstalments, 48);
assert.equal(api.calculateEmployeeAdvanceAndGpf({ basicPay: 50000, vehicleCost: 0 }).other.vehicleEligible, false);

// mount(): ORSP sync, persistence, buttons (fake DOM)
const dom = makeFakeDom();
const sb2 = { window: win, document: dom.doc, console, Date, Math, JSON };
win.navigator = { clipboard: { writeText: async () => {} } };
win.print = () => {};
vm.runInNewContext(src, sb2, { filename: jsPath });
const root = dom.doc.createElement('section');
const inst = win.CSOEmployeeAdvanceGpfCalculator.mount(root);
assert.equal(inst.getState().basicPay, 61000, 'Synced Basic Pay from cso_orsp_salary_prefs_v1');
const labels = dom.all(root).map((n) => n.textContent);
assert.ok(labels.includes('📋 Copy Advance & GPF Eligibility Summary'));
assert.ok(labels.includes('🖨️ Print Advance & GPF Worksheet'));
dom.all(root).find((n) => n.className === 'cso-eag-lang-btn' && n.textContent === 'ଓଡ଼ିଆ').click();
assert.equal(JSON.parse(store.cso_employee_advance_gpf_v1).lang, 'or', 'Preferences persisted');
assert.ok(win.CSOEmployeeAdvanceGpfCalculator.buildSummaryText(inst.getState(), api.calculateEmployeeAdvanceAndGpf(inst.getState()), 'en').includes('Max Sanctioned HBA'));

// Mount, SW, CSS
const html = fs.readFileSync('career-paths/index.html', 'utf8');
assert.ok(html.includes('id="cso-employee-advance-gpf-root"'), '/career-paths/ mounts root');
assert.ok(html.includes('/assets/js/employee-advance-gpf-calculator.js?v=20261128v456'), '/career-paths/ loads script v449');
assert.ok(fs.readFileSync('sw.js', 'utf8').includes("'/assets/js/employee-advance-gpf-calculator.js?v=20261128v456'"));
const css = fs.readFileSync('assets/style.css', 'utf8');
for (const sel of ['.cso-eag-card', '.cso-eag-kpi', '.cso-eag-table', '.cso-eag-verdict']) assert.ok(css.includes(sel), 'CSS defines ' + sel);
const eagRules = (css.slice(css.indexOf('.cso-smt-root')).match(/[^{}]*\.cso-eag-[^{]*\{[^}]*\}/g)) || [];
assert.ok(eagRules.length > 10);
assert.ok(!eagRules.some((r) => /#[0-9a-fA-F]{3,8}\b/.test(r)), '.cso-eag-* uses no hardcoded hex');
assert.ok(/var\(--cso-/.test(eagRules.join('')));
assert.ok(/\.cso-eag-btn[\s\S]{0,400}min-height: 44px/.test(css), '>=44px touch target');

console.log('PASS: v448 Odisha Govt Employee HBA, GPF Withdrawal & Festival/Vehicle Advance suite verified.');
