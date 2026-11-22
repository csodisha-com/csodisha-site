// Verification test for Odisha 7th Pay Matrix (ORSP) In-Hand Salary & Exam Fee Calculator (v216)
// Run: node scripts/test-orsp-salary-calculator-v216.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify tools/index.html & student-dashboard/index.html markup & v216 asset bumps
console.log('1. Checking tools/index.html & student-dashboard/index.html markup...');
const toolsHtml = fs.readFileSync(path.join(ROOT, 'tools/index.html'), 'utf8');
assert.ok(toolsHtml.includes('id="orsp-salary-calculator"'), 'Missing #orsp-salary-calculator');
assert.ok(toolsHtml.includes('id="orsp-pay-level"'), 'Missing #orsp-pay-level');
assert.ok(toolsHtml.includes('id="orsp-hra-tier"'), 'Missing #orsp-hra-tier');
assert.ok(toolsHtml.includes('id="orsp-da-pct"'), 'Missing #orsp-da-pct');
assert.ok(toolsHtml.includes('id="orsp-fee-category"'), 'Missing #orsp-fee-category');
assert.ok(toolsHtml.includes('id="orsp-salary-result"'), 'Missing #orsp-salary-result');
assert.ok(toolsHtml.includes('tools.css?v=20261122v216'), 'Missing ?v=20261122v216 on tools.css');
assert.ok(toolsHtml.includes('tools.js?v=20261122v216'), 'Missing ?v=20261122v216 on tools.js');

for (const lvl of ['12', '10', '9', '7', '5', '4']) {
  assert.ok(toolsHtml.includes(`value="${lvl}"`), `Missing ORSP Level ${lvl} option`);
}

const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('href="/tools/#orsp-salary-calculator"'), 'Missing cross-link to /tools/#orsp-salary-calculator in student-dashboard/index.html');

// 2. Unit test ORSP Pay Matrix Levels (4–12), DA, HRA, NPS, PT & Exam Fee calculations
console.log('2. Testing ORSP Pay Matrix Levels 4–12 & DA/HRA/NPS/Fee calculation...');
const toolsMod = require(path.join(ROOT, 'tools/assets/tools.js'));
assert.equal(toolsMod.ORSP_PAY_LEVELS['12'].basicPay, 56100);
assert.equal(toolsMod.ORSP_PAY_LEVELS['10'].basicPay, 44900);
assert.equal(toolsMod.ORSP_PAY_LEVELS['9'].basicPay, 35400);
assert.equal(toolsMod.ORSP_PAY_LEVELS['7'].basicPay, 25500);
assert.equal(toolsMod.ORSP_PAY_LEVELS['5'].basicPay, 21700);
assert.equal(toolsMod.ORSP_PAY_LEVELS['4'].basicPay, 19900);

// Level 12 (OPSC OAS) in Bhubaneswar (16% HRA), 53% DA, Odisha Resident Fee Waived
const oas = toolsMod.calculateOrspSalaryAndFee({ level: '12', hraPct: 16, daPct: 53, feeCategory: 'odisha-waived' });
assert.equal(oas.basicPay, 56100);
assert.equal(oas.daAmount, 29733); // 56100 * 0.53 = 29733
assert.equal(oas.hraAmount, 8976); // 56100 * 0.16 = 8976
assert.equal(oas.grossSalary, 94809);
assert.equal(oas.npsDeduction, 8583); // round((56100 + 29733) * 0.10) = 8583
assert.equal(oas.professionalTax, 200);
assert.equal(oas.netInHand, 86026);
assert.equal(oas.examFee, 0);
assert.equal(oas.isFeeWaived, true);

// Level 4 (OSSSC ARI/Amin) at 8% HRA, 53% DA, Central General ₹100
const ari = toolsMod.calculateOrspSalaryAndFee({ level: '4', hraPct: 8, daPct: 53, feeCategory: 'central-gen' });
assert.equal(ari.basicPay, 19900);
assert.equal(ari.daAmount, 10547);
assert.equal(ari.hraAmount, 1592);
assert.equal(ari.grossSalary, 32039);
assert.equal(ari.npsDeduction, 3045);
assert.equal(ari.professionalTax, 200);
assert.equal(ari.netInHand, 28794);
assert.equal(ari.examFee, 100);
assert.equal(ari.isFeeWaived, false);

// 3. Verify 44px touch targets & CSS styles
console.log('3. Checking tools/assets/tools.css styles...');
const toolsCss = fs.readFileSync(path.join(ROOT, 'tools/assets/tools.css'), 'utf8');
assert.ok(toolsCss.includes('.cso-orsp-net-box'), 'Missing .cso-orsp-net-box');
assert.ok(toolsCss.includes('min-height: 44px'), 'Missing 44px touch target');

// 4. Verify master navigation 23 folders / 299 modules
console.log('4. Checking admin/data/master-navigation.json (23 folders / 299 modules)...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 5. Strict CSP compliance across touched files
console.log('5. Checking 100% CSP compliance across touched files...');
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

// 6. Verify cache version bump to cso-candidate-cache-v216
console.log('6. Checking cache version bump to cso-candidate-cache-v216...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v216';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v216';"));

console.log('All v216 Odisha 7th Pay Matrix (ORSP) Salary & Exam Fee Calculator tests PASSED!');
