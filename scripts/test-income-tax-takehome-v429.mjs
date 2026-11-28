#!/usr/bin/env node
/**
 * v429 Test Suite — Interactive Odisha Govt Employee Income Tax
 * (FY 2026–27 New vs. Old Regime) & GPF / NPS / UPS Take-Home Estimator
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/income-tax-takehome-estimator.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOIncomeTaxTakehomeEstimator;

assert.ok(api, 'window.CSOIncomeTaxTakehomeEstimator must be exposed');
assert.equal(api.VERSION, 'v429');
assert.equal(api.ROOT_ID, 'cso-income-tax-takehome-root');
assert.equal(api.PREFS_KEY, 'cso_income_tax_prefs_v1');
assert.equal(api.ORSP_PREFS_KEY, 'cso_orsp_salary_prefs_v1');
assert.equal(api.ORSP_LEVELS.length, 17, 'Must include ORSP Levels 1 to 17');
assert.equal(api.getLevelBasic(9), 35400, 'Level 9 entry basic must be ₹35,400');

// 2. Verify Odisha Professional Tax slabs
assert.equal(api.computeOdishaProfessionalTax(160000).annual, 0);
assert.equal(api.computeOdishaProfessionalTax(250000).annual, 1500);
assert.equal(api.computeOdishaProfessionalTax(300001).annual, 2500);

// 3. Verify FY 2026–27 New Regime Zero-Tax at ₹12,75,000 gross (GPF track -> ₹12,00,000 taxable)
const exact1275 = api.calculateFy2026TaxComparison({
  customBasic: 106250, // 106250 * 12 = 12,75,000
  daRate: 0,
  hraRate: 0,
  monthlyAllowances: 0,
  pensionTrack: 'gpf',
  customMonthlyGpf: 10000,
  ded80C: 150000,
  ded80CCD1B: 50000,
  ded80D: 25000,
  hraOr24b: 0
});
assert.equal(exact1275.annualGross, 1275000);
assert.equal(exact1275.newRegime.standardDeduction, 75000);
assert.equal(exact1275.newRegime.taxableIncome, 1200000);
assert.equal(exact1275.newRegime.slabTax, 60000);
assert.equal(exact1275.newRegime.rebate87A, 60000);
assert.equal(exact1275.newRegime.totalTax, 0, '₹12.75L salaried gross must have ₹0 tax in FY 2026–27 New Regime');
assert.equal(exact1275.oldRegime.standardDeduction, 50000);
assert.equal(exact1275.oldRegime.professionalTaxDeduction, 2500);
assert.ok(exact1275.oldRegime.totalTax > 0, 'Old Regime should have positive tax at ₹12.75L with ₹2.25L VI-A');
assert.equal(exact1275.recommended, 'new');

// 4. Verify New Regime Marginal Relief just above ₹12,00,000 taxable (e.g., ₹12,10,000 taxable -> ₹10,000 tax + 4% cess = ₹10,400)
const marginal = api.calculateFy2026TaxComparison({
  customBasic: 100000,
  daRate: 0,
  hraRate: 0,
  monthlyAllowances: 7083.3334, // annualGross ~ 12,85,000 -> wait use exact integer monthly: 107083 -> let's use exact: 12,85,000 = 107083? Let's use 107500 * 12 = 12,90,000 -> taxable 12,15,000!
  pensionTrack: 'gpf',
  customMonthlyGpf: 10000
});
// Wait: let's test exact integer 107500 * 12 = 12,90,000 -> taxable 12,15,000 -> slabTax = 60,000 + 2,250 = 62,250, excess = 15,000 -> marginalRelief = 47,250, taxBeforeCess = 15,000, cess = 600, totalTax = 15,600
const marginalExact = api.calculateFy2026TaxComparison({
  customBasic: 107500,
  daRate: 0,
  hraRate: 0,
  monthlyAllowances: 0,
  pensionTrack: 'gpf',
  customMonthlyGpf: 10000
});
assert.equal(marginalExact.newRegime.taxableIncome, 1215000);
assert.equal(marginalExact.newRegime.slabTax, 62250);
assert.equal(marginalExact.newRegime.marginalRelief, 47250);
assert.equal(marginalExact.newRegime.taxBeforeCess, 15000);
assert.equal(marginalExact.newRegime.cess, 600);
assert.equal(marginalExact.newRegime.totalTax, 15600);
assert.ok(marginal.newRegime.totalTax >= 0);

// 5. Verify NPS 14% 80CCD(2) in BOTH New and Old Regimes + Monthly Net In-Hand Deduction Accuracy (Level 12 OAS)
const npsL12 = api.calculateFy2026TaxComparison({
  level: 12, // ₹56,100
  daRate: 63,
  hraRate: 20,
  monthlyAllowances: 0,
  pensionTrack: 'nps',
  ded80C: 150000,
  ded80CCD1B: 50000,
  ded80D: 50000,
  hraOr24b: 200000
});
const expectedDa = Math.round(56100 * 0.63);
const expectedHra = Math.round(56100 * 0.20);
const expectedGross = 56100 + expectedDa + expectedHra;
const expectedEmpNps = Math.round((56100 + expectedDa) * 0.10);
const expectedGovt80CCD2 = Math.round((56100 + expectedDa) * 0.14) * 12;
assert.equal(npsL12.grossMonthly, expectedGross);
assert.equal(npsL12.employeePensionMonthly, expectedEmpNps);
assert.equal(npsL12.employer80CCD2Annual, expectedGovt80CCD2);
assert.equal(npsL12.newRegime.ded80CCD2, expectedGovt80CCD2, 'NPS 14% 80CCD(2) must apply in New Regime');
assert.equal(npsL12.oldRegime.ded80CCD2, expectedGovt80CCD2, 'NPS 14% 80CCD(2) must apply in Old Regime');
assert.equal(npsL12.professionalTax.annual, 2500);
assert.equal(
  npsL12.newRegime.monthlyNetInHand,
  expectedGross - expectedEmpNps - npsL12.professionalTax.monthlyAvg - npsL12.newRegime.monthlyTds,
  'Monthly Net In-Hand (New) must deduct employee NPS + Odisha PT + monthly TDS'
);
assert.equal(
  npsL12.oldRegime.monthlyNetInHand,
  expectedGross - expectedEmpNps - npsL12.professionalTax.monthlyAvg - npsL12.oldRegime.monthlyTds,
  'Monthly Net In-Hand (Old) must deduct employee NPS + Odisha PT + monthly TDS'
);

// 6. Verify Old Regime ₹5L Rebate u/s 87A
const oldRebate = api.calculateFy2026TaxComparison({
  level: 4, // ₹19,900
  daRate: 63,
  hraRate: 10,
  pensionTrack: 'nps',
  ded80C: 150000,
  ded80CCD1B: 0,
  ded80D: 25000,
  hraOr24b: 0
});
assert.ok(oldRebate.oldRegime.taxableIncome <= 500000);
assert.equal(oldRebate.oldRegime.totalTax, 0, 'Old Regime <= ₹5L taxable must yield ₹0 tax u/s 87A');
assert.equal(oldRebate.newRegime.totalTax, 0, 'New Regime <= ₹12L taxable must yield ₹0 tax u/s 87A/156');
assert.equal(oldRebate.recommended, 'equal');

// 7. Verify UPS track
const upsL10 = api.calculateFy2026TaxComparison({ level: 10, daRate: 63, hraRate: 20, pensionTrack: 'ups' });
assert.equal(upsL10.pensionTrack, 'ups');
assert.ok(upsL10.employer80CCD2Annual > 0, 'UPS must include employer 80CCD(2) contribution');
assert.ok(upsL10.upsGovtPoolMonthly > 0, 'UPS must track 8.5% govt pool');

// 8. Verify CSP hygiene & mounts in career-paths/index.html, JS, CSS, sw.js & ops-sentinel.js
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

const careerHtml = read('career-paths/index.html');
assert.ok(careerHtml.includes('id="cso-income-tax-takehome-root"'), 'career-paths/index.html must mount #cso-income-tax-takehome-root');
assert.ok(careerHtml.includes('/assets/js/income-tax-takehome-estimator.js?v=20261128v455'), 'career-paths/index.html must load income-tax-takehome-estimator.js?v=20261128v455');
assert.ok(!/\son[a-z]+\s*=/i.test(careerHtml), 'career-paths/index.html must have zero inline on* attributes');
assert.ok(!/\sstyle\s*=/i.test(careerHtml), 'career-paths/index.html must have zero inline style attributes');

const css = read('assets/style.css');
const ittBlockStart = css.indexOf('v429: Odisha Govt Employee Income Tax');
assert.ok(ittBlockStart > 0, 'assets/style.css must contain v429 .cso-itt-* CSS block');
const ittBlock = css.slice(ittBlockStart);
assert.ok(ittBlock.includes('.cso-itt-card'), 'CSS must style .cso-itt-card');
assert.ok(ittBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(ittBlock), 'v429 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v455'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v455');
assert.ok(sw.includes('/assets/js/income-tax-takehome-estimator.js?v=20261128v455'), 'sw.js must pre-cache income-tax-takehome-estimator.js?v=20261128v455');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v455'"), 'ops-sentinel.js must match cso-candidate-cache-v455');

console.log('✅ v429 Odisha Govt Income Tax (New vs Old) & GPF/NPS/UPS Take-Home Estimator tests passed!');
