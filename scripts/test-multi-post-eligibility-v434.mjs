#!/usr/bin/env node
/**
 * v434 Test Suite — Interactive Odisha Govt Recruitment Fee & Age Relaxation
 * Multi-Post Eligibility Matrix (/jobs/ & /tools/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/multi-post-eligibility-matrix.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOMultiPostEligibilityMatrix;

assert.ok(api, 'window.CSOMultiPostEligibilityMatrix must be exposed');
assert.equal(api.VERSION, 'v434');
assert.equal(api.ROOT_ID, 'cso-multi-post-eligibility-root');
assert.equal(api.PREFS_KEY, 'cso_multi_post_profile_v1');
assert.equal(api.DEFAULT_NOTICES.length, 8, 'Must include 8 curated active Odisha & Central recruitment drives');

// 2. Verify exact Age-on-Cutoff arithmetic
const exactAge = api.computeExactAge('1999-03-04', '2026-01-01');
assert.equal(exactAge.years, 26);
assert.equal(exactAge.months, 9);
assert.equal(exactAge.days, 28);

// 3. Verify UR Male Graduate (DOB 1999-03-04 -> 26y 9m on 2026-01-01)
const urMale = api.evaluateMultiPostEligibility({
  dob: '1999-03-04',
  gender: 'male',
  category: 'ur',
  qualification: 'graduate',
  pwbd: false,
  exServiceman: false,
  inService: false
});
const rowsUr = Array.from(urMale.rows);
const opscUr = rowsUr.find((r) => r.notice.id === 'opsc-oas-2026');
const siUr = rowsUr.find((r) => r.notice.id === 'oprb-police-si-2026');
const sscUr = rowsUr.find((r) => r.notice.id === 'ssc-cgl-2026');
assert.equal(opscUr.status, 'eligible', '26y UR Graduate must be eligible for OPSC OAS (21–38)');
assert.equal(opscUr.fee.feeAmount, 0, 'Odisha State OPSC fee must be ₹0');
assert.equal(siUr.status, 'over-age', '26y 9m UR Male must be over-age for OPRB SI (21–25)');
assert.equal(sscUr.status, 'eligible', '27y UR Male Graduate must be eligible for SSC CGL (18–30)');
assert.equal(sscUr.fee.feeAmount, 100, 'UR Male must pay ₹100 for Central SSC CGL');

// 4. Verify SEBC Female + PwBD relaxations & Central Fee Waiver
const scFemalePwbd = api.evaluateMultiPostEligibility({
  dob: '1980-01-01', // 46y on 2026-01-01
  gender: 'female',
  category: 'sc',
  qualification: 'bed-deled',
  pwbd: true,
  exServiceman: false,
  inService: false
});
const rowsSc = Array.from(scFemalePwbd.rows);
const opscSc = rowsSc.find((r) => r.notice.id === 'opsc-oas-2026');
const sscSc = rowsSc.find((r) => r.notice.id === 'ssc-cgl-2026');
assert.equal(opscSc.relaxYears, 15, 'SC + PwBD must receive +15 yrs relaxation in Odisha State');
assert.equal(opscSc.effectiveMaxAge, 53, 'OPSC OAS 38 + 15 = 53 yrs');
assert.equal(opscSc.status, 'eligible', '46y SC PwBD must be eligible for OPSC OAS');
assert.equal(sscSc.fee.feeAmount, 0, 'SC Female PwBD must receive ₹0 fee waiver in Central SSC CGL');
assert.equal(scFemalePwbd.summary.feeExemptCount, 8, 'All 8 State & Central drives must be ₹0 fee exempt for SC Female PwBD');

// 5. Verify Ex-Serviceman relaxation
const exServ = api.evaluateMultiPostEligibility({
  dob: '1984-06-01', // 41y on 2026-01-01
  gender: 'male',
  category: 'ur',
  qualification: 'graduate',
  exServiceman: true
});
const opscEx = Array.from(exServ.rows).find((r) => r.notice.id === 'opsc-oas-2026');
assert.ok(opscEx.relaxYears >= 5, 'Ex-Serviceman must receive >= +5 yrs state relaxation');
assert.equal(opscEx.status, 'eligible', '41y Ex-Serviceman must be eligible for OPSC OAS');

// 6. Verify strict CSP, mounts on both /jobs/ and /tools/, quick-jump registration, 4-theme CSS & SW/ops-sentinel sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

for (const htmlPath of ['jobs/index.html', 'tools/index.html']) {
  const html = read(htmlPath);
  const mounts = html.match(/id=["']cso-multi-post-eligibility-root["']/g) || [];
  assert.equal(mounts.length, 1, `${htmlPath} must have exactly one #cso-multi-post-eligibility-root`);
  assert.ok(html.includes('/assets/js/multi-post-eligibility-matrix.js?v=20261127v435'), `${htmlPath} must load multi-post-eligibility-matrix.js?v=20261127v435`);
  assert.ok(!/\son[a-z]+\s*=/i.test(html), `${htmlPath} must have zero inline on* attributes`);
  assert.ok(!/\sstyle\s*=/i.test(html), `${htmlPath} must have zero inline style attributes`);
}

const qj = read('assets/js/tools-quick-jump-directory.js');
assert.ok(qj.includes('cso-multi-post-eligibility-root'), 'tools-quick-jump-directory.js must register #cso-multi-post-eligibility-root');

const css = read('assets/style.css');
const mpeIdx = css.indexOf('v434: Multi-Post Age Relaxation & Fee Exemption Eligibility Matrix');
assert.ok(mpeIdx > 0, 'assets/style.css must contain v434 .cso-mpe-* CSS block');
const mpeBlock = css.slice(mpeIdx);
assert.ok(mpeBlock.includes('.cso-mpe-card'), 'CSS must style .cso-mpe-card');
assert.ok(mpeBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(mpeBlock), 'v434 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v435'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v435');
assert.ok(sw.includes('/assets/js/multi-post-eligibility-matrix.js?v=20261127v435'), 'sw.js must pre-cache multi-post-eligibility-matrix.js?v=20261127v435');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v435'"), 'ops-sentinel.js must match cso-candidate-cache-v435');

console.log('✅ v434 Odisha Govt Multi-Post Age Relaxation & Fee Exemption Matrix tests passed!');
