#!/usr/bin/env node
/**
 * v427 Automated Audit: Interactive e-District Odisha Certificate &
 * Revenue Service Walkthrough (/guides/ & /tools/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v427 e-District Odisha Certificate & Revenue Service Walkthrough Audit ===');

const jsPath = path.join(ROOT, 'assets/js/edistrict-service-walkthrough.js');
const toolsHtmlPath = path.join(ROOT, 'tools/index.html');
const guidesSsrPath = path.join(ROOT, 'functions/_lib/informative-guides.js');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const toolsHtml = fs.readFileSync(toolsHtmlPath, 'utf8');
const guidesSsr = fs.readFileSync(guidesSsrPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(toolsHtml) && !/\sstyle\s*=/i.test(toolsHtml), 'tools/index.html must be strict CSP compliant');

// 2. Sandbox module check
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOEdistrictWalkthrough;
assert.ok(api, 'window.CSOEdistrictWalkthrough must be exported');
assert.equal(api.version, 'v427');
assert.equal(api.ODISHA_DISTRICTS.length, 30, 'Must include all 30 Odisha districts');
assert.equal(api.CERT_SERVICES.length, 6, 'Must include all 6 e-District Odisha certificate services');

// 3. Verify exact ORTPS SLAs (10, 10, 15, 10, 30, 30) & ₹0 statutory online fee
const expectedSlas = {
  resident: 10,
  income: 10,
  caste: 15,
  ews: 10,
  'legal-heir': 30,
  guardianship: 30
};
for (const [k, sla] of Object.entries(expectedSlas)) {
  const svc = api.getServiceByKey(k);
  assert.equal(svc.slaDays, sla, `${k} must have ORTPS SLA of ${sla} working days`);
  assert.ok(svc.statutoryFee.includes('₹0'), `${k} must document ₹0 statutory online fee`);
  assert.ok(svc.authority && svc.enclosures.length >= 3, `${k} must include issuing authority & enclosures`);
}

// 4. Verify Self-Declaration Generator in English & Odia
const declEn = api.generateSelfDeclarationText('ews', {
  applicantName: 'Ramesh Naik',
  guardianName: 'B. Naik',
  village: 'Junagarh',
  postPs: 'Junagarh',
  tahasil: 'Junagarh',
  district: 'Kalahandi',
  purpose: 'OPSC OAS 2026 Recruitment',
  annualIncome: '4,20,000'
}, 'en');
assert.ok(declEn.includes('Ramesh Naik') && declEn.includes('Kalahandi') && declEn.includes('4,20,000'));

const declOr = api.generateSelfDeclarationText('caste', {
  applicantName: 'ସୁମିତ୍ରା ଦାସ',
  guardianName: 'ରମେଶ ଦାସ',
  village: 'ଭବାନୀପାଟଣା',
  tahasil: 'ଭବାନୀପାଟଣା',
  district: 'Kalahandi',
  community: 'SEBC'
}, 'or');
assert.ok(declOr.includes('ସୁମିତ୍ରା ଦାସ') && declOr.includes('SEBC') && declOr.includes('ସ୍ୱ-ଘୋଷଣାପତ୍ର'));

// 5. Mounts on /tools/ & SSR /guides/, SW & Ops-Sentinel sync
assert.ok(toolsHtml.includes('id="cso-edistrict-walkthrough-root"'), 'tools/index.html must mount #cso-edistrict-walkthrough-root');
assert.ok(toolsHtml.includes('/assets/js/edistrict-service-walkthrough.js?v=20261127v440'), 'tools/index.html must load edistrict-service-walkthrough.js?v=20261127v440');
assert.ok(guidesSsr.includes('id="cso-edistrict-walkthrough-root"'), 'informative-guides.js must mount #cso-edistrict-walkthrough-root');
assert.ok(guidesSsr.includes('/assets/js/edistrict-service-walkthrough.js?v=20261127v440'), 'informative-guides.js must load edistrict-service-walkthrough.js?v=20261127v440');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v440'"), 'sw.js must bump CACHE_NAME to v427');
assert.ok(swSrc.includes("'/assets/js/edistrict-service-walkthrough.js?v=20261127v440'"), 'sw.js must precache edistrict-service-walkthrough.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v440'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v427');

// 6. CSS 4-theme semantic tokens check
const edwIdx = cssSrc.indexOf('/* ===== v427:');
assert.ok(edwIdx !== -1, 'assets/style.css must contain v427 .cso-edw-* CSS block');
const edwBlock = cssSrc.slice(edwIdx);
assert.ok(edwBlock.includes('.cso-edw-wrap') && edwBlock.includes('var(--cso-'), 'CSS must style .cso-edw-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(edwBlock), 'v427 .cso-edw-* CSS block must have zero hardcoded hex colors');
assert.ok(edwBlock.includes('prefers-reduced-motion'), 'v427 CSS must include prefers-reduced-motion guard');
assert.ok(edwBlock.includes('@media print'), 'v427 CSS must include @media print rules');

console.log('✅ v427 e-District Odisha Certificate & Revenue Service Walkthrough Audit PASSED');
