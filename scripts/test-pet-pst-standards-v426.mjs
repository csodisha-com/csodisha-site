#!/usr/bin/env node
/**
 * v426 Automated Audit: Interactive Odisha Police SI, Constable,
 * Forest Guard & Excise PET/PST Standards Checker (/tools/ & /guides/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v426 Odisha Police SI, Constable, Forest Guard & Excise PET/PST Standards Audit ===');

const jsPath = path.join(ROOT, 'assets/js/pet-pst-standards-checker.js');
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

const api = sandbox.window.CSOPetPstChecker;
assert.ok(api, 'window.CSOPetPstChecker must be exported');
assert.equal(api.version, 'v426');
assert.equal(Object.keys(api.POST_BENCHMARKS).length, 4, 'Must include all 4 Odisha uniformed recruitment benchmarks');

// 3. Test Police SI Male UR Pass
const siPass = api.evaluatePetPstCandidate({
  postKey: 'police-si', gender: 'male', category: 'ur',
  heightCm: 170, weightKg: 62, chestUnexp: 81, chestExp: 87,
  runSec: 450, longJumpM: 3.8
});
assert.equal(siPass.overallEligible, true);
assert.equal(siPass.pstPass, true);
assert.equal(siPass.petPass, true);

// 4. Test Police Constable Male UR Deficit Diagnostics (chest expansion < 5cm & run over 7 min)
const constFail = api.evaluatePetPstCandidate({
  postKey: 'police-constable', gender: 'male', category: 'ur',
  heightCm: 168, weightKg: 60, chestUnexp: 80, chestExp: 83.5,
  runSec: 438, longJumpM: 3.7, highJumpM: 1.25
});
assert.equal(constFail.overallEligible, false);
assert.ok(constFail.deficits.some((d) => d.includes('1.5 cm chest expansion')), 'Must report exact chest expansion deficit');
assert.ok(constFail.deficits.some((d) => d.includes('Shave 18 sec')), 'Must report exact 18 sec run deficit');

// 5. Test Forest Guard ST Male relaxation (158 cm) & 25 km walk <= 240 min
const fgStPass = api.evaluatePetPstCandidate({
  postKey: 'forest-guard', gender: 'male', category: 'st',
  heightCm: 159, weightKg: 54, chestUnexp: 80, chestExp: 85,
  runSec: 13800
});
assert.equal(fgStPass.overallEligible, true);

// 6. Test Excise Female SC Pass
const excFemPass = api.evaluatePetPstCandidate({
  postKey: 'excise-si-constable', gender: 'female', category: 'sc',
  heightCm: 151, weightKg: 46, runSec: 550, longJumpM: 2.8, highJumpM: 1.05
});
assert.equal(excFemPass.overallEligible, true);

// 7. Mounts on /tools/ & SSR /guides/, SW & Ops-Sentinel sync
assert.ok(toolsHtml.includes('id="cso-pet-pst-standards-root"'), 'tools/index.html must mount #cso-pet-pst-standards-root');
assert.ok(toolsHtml.includes('/assets/js/pet-pst-standards-checker.js?v=20261127v428'), 'tools/index.html must load pet-pst-standards-checker.js?v=20261127v428');
assert.ok(guidesSsr.includes('id="cso-pet-pst-standards-root"'), 'informative-guides.js must mount #cso-pet-pst-standards-root');
assert.ok(guidesSsr.includes('/assets/js/pet-pst-standards-checker.js?v=20261127v428'), 'informative-guides.js must load pet-pst-standards-checker.js?v=20261127v428');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v428'"), 'sw.js must bump CACHE_NAME to v426');
assert.ok(swSrc.includes("'/assets/js/pet-pst-standards-checker.js?v=20261127v428'"), 'sw.js must precache pet-pst-standards-checker.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v428'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v426');

// 8. CSS 4-theme semantic tokens check
const ppsIdx = cssSrc.indexOf('/* ===== v426:');
assert.ok(ppsIdx !== -1, 'assets/style.css must contain v426 .cso-pps-* CSS block');
const ppsBlock = cssSrc.slice(ppsIdx);
assert.ok(ppsBlock.includes('.cso-pps-wrap') && ppsBlock.includes('var(--cso-'), 'CSS must style .cso-pps-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(ppsBlock), 'v426 .cso-pps-* CSS block must have zero hardcoded hex colors');
assert.ok(ppsBlock.includes('prefers-reduced-motion'), 'v426 CSS must include prefers-reduced-motion guard');
assert.ok(ppsBlock.includes('@media print'), 'v426 CSS must include @media print rules');

console.log('✅ v426 Odisha Police SI, Constable, Forest Guard & Excise PET/PST Standards Audit PASSED');
