#!/usr/bin/env node
/**
 * v436 Test Suite — Interactive Odisha Govt Employee Leave Encashment,
 * Gratuity (DCRG) & Commutation Retirement Corpus Calculator (/career-paths/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/retirement-corpus-calculator.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSORetirementCorpusCalculator;

assert.ok(api, 'window.CSORetirementCorpusCalculator must be exposed');
assert.equal(api.VERSION, 'v436');
assert.equal(api.ROOT_ID, 'cso-retirement-corpus-root');
assert.equal(api.PREFS_KEY, 'cso_retirement_corpus_v1');
assert.equal(api.COMMUTATION_FACTORS[60], 8.194);
assert.equal(api.COMMUTATION_FACTORS[58], 8.371);
assert.equal(api.COMMUTATION_FACTORS[62], 7.991);

// 2. Verify 300-day EL cap, ₹25L DCRG ceiling (DA >= 50%), 40% commutation @ 8.194 & full DR on 100% basic pension
const l14 = api.calculateRetirementCorpus({
  lastBasic: 78800,
  daRate: 63,
  serviceYears: 30,
  elDays: 345, // should cap at 300
  scheme: 'ops-ups',
  commutationPct: 40,
  retirementAge: 60
});
const expectedDa = Math.round(78800 * 0.63); // 49644
const expectedEmol = 78800 + expectedDa; // 128444
const expectedEl = Math.round(300 * (expectedEmol / 30)); // 1284440
const expectedDcrgUncapped = Math.round(expectedEmol * (60 / 4)); // 1926660
const expectedBasicPen = Math.round(78800 * 0.50); // 39400
const expectedCommMo = Math.round(expectedBasicPen * 0.40); // 15760
const expectedCommLump = Math.round(expectedCommMo * 12 * 8.194);
const expectedDr = Math.round(expectedBasicPen * 0.63);

assert.equal(l14.cappedElDays, 300, 'EL encashment must be capped at 300 days');
assert.equal(l14.elEncashment, expectedEl);
assert.equal(l14.dcrgCeiling, 2500000, 'DCRG ceiling must be ₹25,00,000 when DA >= 50%');
assert.equal(l14.dcrgAmount, expectedDcrgUncapped);
assert.equal(l14.commutationLumpSum, expectedCommLump);
assert.equal(l14.monthlyPensionImmediate, (expectedBasicPen - expectedCommMo) + expectedDr, 'DR must be paid on 100% full basic pension even after 40% commutation');
assert.equal(l14.monthlyPensionFull, expectedBasicPen + expectedDr);
assert.equal(l14.totalLumpSum, expectedEl + expectedDcrgUncapped + expectedCommLump);

// 3. Verify DCRG ceiling caps cleanly at ₹25L (DA >= 50%) vs ₹20L (DA < 50%)
const l15HighDa = api.calculateRetirementCorpus({ lastBasic: 135100, daRate: 63, serviceYears: 33 });
assert.equal(l15HighDa.dcrgCeiling, 2500000);
assert.equal(l15HighDa.dcrgAmount, 2500000, 'High basic + DA >= 50% must cap DCRG at ₹25,00,000');

const l15LowDa = api.calculateRetirementCorpus({ lastBasic: 135100, daRate: 46, serviceYears: 33 });
assert.equal(l15LowDa.dcrgCeiling, 2000000);
assert.equal(l15LowDa.dcrgAmount, 2000000, 'DA < 50% must cap DCRG at ₹20,00,000');

// 4. Verify NPS mode disables government commutation
const npsMode = api.calculateRetirementCorpus({ lastBasic: 56100, daRate: 63, serviceYears: 30, scheme: 'nps', commutationPct: 40 });
assert.equal(npsMode.commutationPct, 0);
assert.equal(npsMode.commutationLumpSum, 0);

// 5. Verify strict CSP, mount in career-paths/index.html, 4-theme CSS & SW/ops-sentinel sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

const careerHtml = read('career-paths/index.html');
const mounts = careerHtml.match(/id=["']cso-retirement-corpus-root["']/g) || [];
assert.equal(mounts.length, 1, 'career-paths/index.html must have exactly one #cso-retirement-corpus-root');
assert.ok(careerHtml.includes('/assets/js/retirement-corpus-calculator.js?v=20261128v451'), 'career-paths/index.html must load retirement-corpus-calculator.js?v=20261128v451');
assert.ok(!/\son[a-z]+\s*=/i.test(careerHtml), 'career-paths/index.html must have zero inline on* attributes');
assert.ok(!/\sstyle\s*=/i.test(careerHtml), 'career-paths/index.html must have zero inline style attributes');

const css = read('assets/style.css');
const rccIdx = css.indexOf('v436: Odisha Govt Leave Encashment');
assert.ok(rccIdx > 0, 'assets/style.css must contain v436 .cso-rcc-* CSS block');
const rccBlock = css.slice(rccIdx);
assert.ok(rccBlock.includes('.cso-rcc-card'), 'CSS must style .cso-rcc-card');
assert.ok(rccBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(rccBlock), 'v436 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v451'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v451');
assert.ok(sw.includes('/assets/js/retirement-corpus-calculator.js?v=20261128v451'), 'sw.js must pre-cache retirement-corpus-calculator.js?v=20261128v451');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v451'"), 'ops-sentinel.js must match cso-candidate-cache-v451');

console.log('✅ v436 Odisha Govt Leave Encashment, Gratuity & Commutation Corpus Calculator tests passed!');
