#!/usr/bin/env node
/**
 * v433 Test Suite — Interactive Odisha Govt Job & Exam Clean-Sheet Study Packet Compiler
 * (/guides/ & /updates/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/study-packet-compiler.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOStudyPacketCompiler;

assert.ok(api, 'window.CSOStudyPacketCompiler must be exposed');
assert.equal(api.VERSION, 'v433');
assert.equal(api.ROOT_ID, 'cso-study-packet-compiler-root');
assert.equal(api.PREFS_KEY, 'cso_study_packet_prefs_v1');
assert.equal(api.EXAM_TRACKS.length, 8, 'Must include all 8 pre-configured Odisha exam tracks');
assert.equal(api.CATEGORY_PROFILES.length, 6, 'Must include all 6 category profiles');

// 2. Verify every track has bilingual titles, syllabus weightage, fee rules & certificates
for (const tr of Array.from(api.EXAM_TRACKS)) {
  assert.ok(tr.en && tr.or, `Track ${tr.key} must have bilingual EN/OR titles`);
  assert.ok(tr.patternEn && tr.patternOr, `Track ${tr.key} must have bilingual exam pattern`);
  assert.ok(Array.from(tr.weightage).length >= 3, `Track ${tr.key} must include subject weightage items`);
  assert.ok(Array.from(tr.certs).length >= 3, `Track ${tr.key} must include mandatory certificate items`);
}

// 3. Verify compileStudyPacket bundling, category relaxation & section toggling
const fullPacket = api.compileStudyPacket('opsc-oas', {
  category: 'sebc',
  candidateName: 'Subham Mohanty',
  targetDate: '2026-12-20'
});
assert.equal(fullPacket.sections.length, 4, 'Full packet must include all 4 sections');
assert.ok(fullPacket.effectiveMaxAge.includes('43 years'), 'OPSC OAS SEBC must compute 38 + 5 = 43 years max age');
assert.ok(fullPacket.markdown.includes('Subham Mohanty'), 'Markdown dossier must include candidate name');
assert.ok(fullPacket.markdown.includes('₹0 (Odisha State Govt Examination Fee Exempted'), 'Must state ₹0 Odisha State exam fee');
assert.ok(fullPacket.markdown.includes('T-30 mins: STRICT GATE CLOSURE'), 'Must include exam-day gate closure protocol');

const partialPacket = api.compileStudyPacket('oprb-si', {
  category: 'pwbd',
  includeSyllabus: true,
  includeEligibility: true,
  includeCertificates: false,
  includeExamDay: false
});
assert.equal(partialPacket.sections.length, 2, 'Partial packet must only bundle enabled sections');
assert.ok(partialPacket.effectiveMaxAge.includes('35 years'), 'OPRB SI PwBD must compute 25 + 10 = 35 years max age');

const tetPacket = api.compileStudyPacket('ctet-otet-osstet', { category: 'st' });
assert.equal(tetPacket.effectiveMaxAge, 'No Upper Age Limit', 'TET exams must show No Upper Age Limit');

// 4. Verify strict CSP, mounts on both SSR /guides/ and /updates/, 4-theme CSS & SW/ops-sentinel sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

const guidesSsr = read('functions/_lib/informative-guides.js');
assert.ok(guidesSsr.includes('id="cso-study-packet-compiler-root"'), 'informative-guides.js must mount #cso-study-packet-compiler-root');
assert.ok(guidesSsr.includes('/assets/js/study-packet-compiler.js?v=20261127v449'), 'informative-guides.js must load study-packet-compiler.js?v=20261127v449');

const updatesHtml = read('updates/index.html');
const mounts = updatesHtml.match(/id=["']cso-study-packet-compiler-root["']/g) || [];
assert.equal(mounts.length, 1, 'updates/index.html must have exactly one #cso-study-packet-compiler-root');
assert.ok(updatesHtml.includes('/assets/js/study-packet-compiler.js?v=20261127v449'), 'updates/index.html must load study-packet-compiler.js?v=20261127v449');
assert.ok(!/\son[a-z]+\s*=/i.test(updatesHtml), 'updates/index.html must have zero inline on* attributes');
assert.ok(!/\sstyle\s*=/i.test(updatesHtml), 'updates/index.html must have zero inline style attributes');

const css = read('assets/style.css');
const spcIdx = css.indexOf('v433: Odisha Govt Job & Exam Clean-Sheet Study Packet Compiler');
assert.ok(spcIdx > 0, 'assets/style.css must contain v433 .cso-spc-* CSS block');
const spcBlock = css.slice(spcIdx);
assert.ok(spcBlock.includes('.cso-spc-card'), 'CSS must style .cso-spc-card');
assert.ok(spcBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(spcBlock), 'v433 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v449'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v449');
assert.ok(sw.includes('/assets/js/study-packet-compiler.js?v=20261127v449'), 'sw.js must pre-cache study-packet-compiler.js?v=20261127v449');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v449'"), 'ops-sentinel.js must match cso-candidate-cache-v449');

console.log('✅ v433 Odisha Govt Job & Exam Clean-Sheet Study Packet Compiler tests passed!');
