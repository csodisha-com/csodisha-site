#!/usr/bin/env node
/**
 * v428 Automated Audit: Interactive Odisha Govt Teacher
 * (LTR / SSD / OAV / OTET / OSSTET) Eligibility & Subject-Combination Checker
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v428 Odisha Govt Teacher (LTR/SSD/OAV/OTET/OSSTET) Eligibility Checker Audit ===');

const jsPath = path.join(ROOT, 'assets/js/teacher-eligibility-checker.js');
const examsHtmlPath = path.join(ROOT, 'exams/index.html');
const guidesSsrPath = path.join(ROOT, 'functions/_lib/informative-guides.js');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const examsHtml = fs.readFileSync(examsHtmlPath, 'utf8');
const guidesSsr = fs.readFileSync(guidesSsrPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(examsHtml) && !/\sstyle\s*=/i.test(examsHtml), 'exams/index.html must be strict CSP compliant');

// 2. Sandbox module check
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOTeacherEligibilityChecker;
assert.ok(api, 'window.CSOTeacherEligibilityChecker must be exported');
assert.equal(api.version, 'v428');
assert.equal(api.TEACHER_TRACKS.length, 9, 'Must include all 9 Odisha teacher recruitment tracks');

for (const t of api.TEACHER_TRACKS) {
  assert.ok(t.key && t.en && t.or && t.ageRule, `Track must include bilingual metadata & age rule: ${t.key}`);
}

// 3. Test TGT Arts 2-subject rule & UR 50% threshold
const artsOk = api.evaluateTeacherEligibility({
  trackKey: 'tgt-arts', category: 'ur', aggregatePct: 52,
  trainingDegree: 'bed', subjects: ['history', 'pol-science'],
  tetStatus: 'osstet-1', odiaLevel: 'hsc'
});
assert.equal(artsOk.status, 'eligible');

// 4. Test SC 45% relaxation + TGT PCM + TET pending verdict
const pcmTetPending = api.evaluateTeacherEligibility({
  trackKey: 'tgt-pcm', category: 'sc', aggregatePct: 46,
  trainingDegree: 'itep', subjects: ['physics', 'mathematics'],
  tetStatus: 'none', odiaLevel: 'single-10'
});
assert.equal(pcmTetPending.minPct, 45);
assert.equal(pcmTetPending.status, 'tet_pending');

// 5. Test TGT CBZ subject combination failure (only 1 CBZ subject)
const cbzFail = api.evaluateTeacherEligibility({
  trackKey: 'tgt-cbz', category: 'sebc', aggregatePct: 55,
  trainingDegree: 'bed', subjects: ['chemistry', 'history'],
  tetStatus: 'osstet-1', odiaLevel: 'hsc'
});
assert.equal(cbzFail.status, 'not_eligible');

// 6. Test Elementary Primary (OTET Paper-I + D.El.Ed.) & PET (B.P.Ed. + OSSTET Paper-II)
const primaryOk = api.evaluateTeacherEligibility({
  trackKey: 'elementary-primary', category: 'st', aggregatePct: 46,
  trainingDegree: 'deled', subjects: [], tetStatus: 'otet-1', odiaLevel: 'hsc'
});
assert.equal(primaryOk.status, 'eligible');

const petOk = api.evaluateTeacherEligibility({
  trackKey: 'pet', category: 'ur', aggregatePct: 51,
  trainingDegree: 'bped', subjects: [], tetStatus: 'osstet-2', odiaLevel: 'hsc'
});
assert.equal(petOk.status, 'eligible');

// 7. Mounts on /exams/ & SSR /guides/, SW & Ops-Sentinel sync
assert.ok(examsHtml.includes('id="cso-teacher-eligibility-root"'), 'exams/index.html must mount #cso-teacher-eligibility-root');
assert.ok(examsHtml.includes('/assets/js/teacher-eligibility-checker.js?v=20261127v428'), 'exams/index.html must load teacher-eligibility-checker.js?v=20261127v428');
assert.ok(guidesSsr.includes('id="cso-teacher-eligibility-root"'), 'informative-guides.js must mount #cso-teacher-eligibility-root');
assert.ok(guidesSsr.includes('/assets/js/teacher-eligibility-checker.js?v=20261127v428'), 'informative-guides.js must load teacher-eligibility-checker.js?v=20261127v428');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v428'"), 'sw.js must bump CACHE_NAME to v428');
assert.ok(swSrc.includes("'/assets/js/teacher-eligibility-checker.js?v=20261127v428'"), 'sw.js must precache teacher-eligibility-checker.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v428'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v428');

// 8. CSS 4-theme semantic tokens check
const tecIdx = cssSrc.indexOf('/* ===== v428:');
assert.ok(tecIdx !== -1, 'assets/style.css must contain v428 .cso-tec-* CSS block');
const tecBlock = cssSrc.slice(tecIdx);
assert.ok(tecBlock.includes('.cso-tec-wrap') && tecBlock.includes('var(--cso-'), 'CSS must style .cso-tec-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(tecBlock), 'v428 .cso-tec-* CSS block must have zero hardcoded hex colors');
assert.ok(tecBlock.includes('prefers-reduced-motion'), 'v428 CSS must include prefers-reduced-motion guard');
assert.ok(tecBlock.includes('@media print'), 'v428 CSS must include @media print rules');

console.log('✅ v428 Odisha Govt Teacher (LTR/SSD/OAV/OTET/OSSTET) Eligibility Checker Audit PASSED');
