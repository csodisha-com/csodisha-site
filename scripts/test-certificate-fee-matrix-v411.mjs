#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v411 Bilingual Odisha Certificate Validity & Fee Waiver Matrix Audit ===');

const cfmSrc = read('assets/js/certificate-fee-matrix.js');
const guidesSsr = read('functions/_lib/informative-guides.js');
const toolsHtml = read('tools/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(cfmSrc, sandbox);
const CFM = sandbox.window.CSOCertificateFeeMatrix;
assert.ok(CFM, 'window.CSOCertificateFeeMatrix must be exported');
assert.equal(CFM.version, 'v411');
assert.equal(CFM.PREFS_KEY, 'cso_cert_matrix_prefs_v1');

// 1. Verify all 9 essential Odisha certificates with bilingual labels, authorities & validity windows
assert.equal(CFM.CERTIFICATES.length, 9, 'Must include all 9 essential Odisha certificates');
const keys = Array.from(CFM.CERTIFICATES, c => c.key);
assert.deepEqual(keys, [
  'caste-sc-st',
  'sebc-state',
  'obc-central-ncl',
  'ews-income-asset',
  'resident-nativity',
  'income-certificate',
  'pwbd-udid',
  'abc-id',
  'esm-sportsperson'
]);
for (const c of CFM.CERTIFICATES) {
  assert.ok(c.name_en && c.name_or, `${c.key} must have bilingual EN + Odia name`);
  assert.ok(c.authority_en && c.authority_or, `${c.key} must have bilingual issuing authority`);
  assert.ok(c.validity_en && c.validity_or, `${c.key} must have bilingual validity window`);
}

// 2. Verify Fee Exemption Matrix & Certificate Expiry Calculation
assert.equal(CFM.FEE_MATRIX.length, 4, 'Fee matrix must cover OPSC, OSSC, OSSSC & Central Exams');
for (const b of ['opsc', 'ossc', 'osssc']) {
  for (const cat of ['ur', 'sebc_obc', 'sc_st', 'ews', 'pwbd', 'women']) {
    assert.ok(CFM.getFeeRule(b, cat).includes('₹0'), `${b.toUpperCase()} ${cat} must be ₹0 exempted`);
  }
}
assert.ok(CFM.getFeeRule('central', 'sc_st').includes('₹0'), 'Central SC/ST must note ₹0 UPSC/SSC exemption');
assert.ok(CFM.getFeeRule('central', 'pwbd').includes('50%'), 'Central PwBD must note 50% CTET/NTA concession');
assert.ok(CFM.getFeeRule('central', 'women').includes('₹0'), 'Central Women must note ₹0 UPSC/SSC exemption');

// Expiry calculations
const refDate = new Date('2026-11-27T00:00:00Z');
const permExp = CFM.checkCertificateExpiry('caste-sc-st', '2020-01-10', refDate);
assert.equal(permExp.status, 'permanent');

const fyExp = CFM.checkCertificateExpiry('obc-central-ncl', '2026-04-15', refDate);
assert.equal(fyExp.expiry_iso, '2027-03-31', 'FY cert issued April 2026 must expire 2027-03-31');
assert.equal(fyExp.status, 'valid');

const expiredFy = CFM.checkCertificateExpiry('ews-income-asset', '2025-05-01', refDate);
assert.equal(expiredFy.expiry_iso, '2026-03-31');
assert.equal(expiredFy.status, 'expired');

const oneYrExp = CFM.checkCertificateExpiry('sebc-state', '2026-06-01', refDate);
assert.equal(oneYrExp.expiry_iso, '2027-06-01');
assert.equal(oneYrExp.status, 'valid');

// 3. Markup (/guides/ SSR + /tools/ HTML), Strict CSP, 4-Theme CSS & v411 Cache Sync
assert.ok(guidesSsr.includes('id="cso-certificate-fee-matrix-root"'), 'informative-guides.js (/guides/) must mount #cso-certificate-fee-matrix-root');
assert.ok(guidesSsr.includes('/assets/js/certificate-fee-matrix.js?v=20261128v451'), 'informative-guides.js must load certificate-fee-matrix.js?v=20261128v451');
assert.match(toolsHtml, /id="cso-certificate-fee-matrix-root"/, 'tools/index.html must mount #cso-certificate-fee-matrix-root');
assert.match(toolsHtml, /\/assets\/js\/certificate-fee-matrix\.js\?v=20261128v451/, 'tools/index.html must load certificate-fee-matrix.js?v=20261128v451');
assert.ok(!/\sstyle="/i.test(toolsHtml), 'tools/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(toolsHtml), 'tools/index.html must have zero inline on* handlers');
assert.ok(!cfmSrc.includes('.innerHTML') && !cfmSrc.includes('.outerHTML') && !cfmSrc.includes('insertAdjacentHTML') && !cfmSrc.includes('.style.'), 'certificate-fee-matrix.js must obey strict CSP');

const v411CssIdx = styleCss.indexOf('v411: Bilingual Odisha Certificate Validity & Fee Waiver Matrix');
assert.ok(v411CssIdx !== -1, 'assets/style.css must contain v411 Certificate Matrix CSS block');
const v411Css = styleCss.slice(v411CssIdx);
assert.ok(v411Css.includes('.cso-cfm-card') && v411Css.includes('var(--cso-surface-elevated)') && v411Css.includes('var(--cso-ink)'), 'v411 CSS must use semantic --cso-* tokens');
assert.ok(v411Css.includes('min-height: 44px'), 'v411 CSS must enforce >=44px touch targets');
assert.ok(v411Css.includes('prefers-reduced-motion: reduce'), 'v411 CSS must respect prefers-reduced-motion');
assert.ok(v411Css.includes('@media print'), 'v411 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v411Css), 'v411 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v451'"), 'sw.js CACHE_NAME must be v411');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v451'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v411');

console.log('✅ v411 Bilingual Odisha Certificate Validity & Fee Waiver Matrix Audit PASSED');
