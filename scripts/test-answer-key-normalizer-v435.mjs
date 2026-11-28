#!/usr/bin/env node
/**
 * v435 Test Suite — Interactive Odisha Govt Recruitment Answer Key
 * & Raw-to-Normalized Score Calculator (/results/ & /mock-tests/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/answer-key-normalizer.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOAnswerKeyNormalizer;

assert.ok(api, 'window.CSOAnswerKeyNormalizer must be exposed');
assert.equal(api.VERSION, 'v435');
assert.equal(api.ROOT_ID, 'cso-answer-key-normalizer-root');
assert.equal(api.PREFS_KEY, 'cso_answer_key_normalizer_v1');
assert.equal(api.MARKING_PRESETS.length, 5, 'Must include 5 marking scheme presets');
assert.equal(api.OBJECTION_WINDOWS.length, 4, 'Must include 4 objection window trackers');

// 2. Verify OPSC (+2 / -0.66) raw score & single-shift mode
const opscSingle = api.computeNormalizedScore({
  presetId: 'opsc',
  totalQuestions: 100,
  correct: 60,
  wrong: 15,
  graceQuestions: 1,
  normMode: 'single'
});
assert.equal(opscSingle.maxScore, 200);
assert.equal(opscSingle.positiveMarks, 120);
assert.equal(opscSingle.penaltyDeducted, 9.9);
assert.equal(opscSingle.graceMarks, 2);
assert.equal(opscSingle.rawScore, 112.1);
assert.equal(opscSingle.normalizedScore, 112.1);
assert.equal(opscSingle.shiftDelta, 0);
assert.equal(opscSingle.unattempted, 25);
assert.equal(opscSingle.accuracyPct, 80);

// 3. Verify OSSC (+1 / -0.25) with Z-Score multi-shift normalization (harder shift gets boost)
const osscZ = api.computeNormalizedScore({
  presetId: 'ossc',
  totalQuestions: 150,
  correct: 100,
  wrong: 20,
  graceQuestions: 0,
  normMode: 'zscore',
  shiftMean: 80,
  shiftStdDev: 15,
  overallMean: 90,
  overallStdDev: 15
});
assert.equal(osscZ.rawScore, 95, 'OSSC 100*1 - 20*0.25 = 95');
assert.equal(osscZ.normalizedScore, 105, 'Z-score boost: 90 + ((95-80)/15)*15 = 105');
assert.equal(osscZ.shiftDelta, 10);

// 4. Verify OSSSC (+1 / -0.25) with Equipercentile normalization
const ossscEq = api.computeNormalizedScore({
  presetId: 'osssc',
  totalQuestions: 100,
  correct: 70,
  wrong: 12,
  normMode: 'equipercentile',
  shiftPercentile: 87.5, // zEq = ((87.5-50)/50)*2 = 1.5
  overallMean: 60,
  overallStdDev: 10
});
assert.equal(ossscEq.rawScore, 67, 'OSSSC 70*1 - 12*0.25 = 67');
assert.equal(ossscEq.normalizedScore, 75, 'Equipercentile: 60 + 1.5*10 = 75');
assert.equal(ossscEq.shiftDelta, 8);

// 5. Verify TET (+1 / 0.00 No Negative)
const tet = api.computeNormalizedScore({
  presetId: 'tet',
  totalQuestions: 150,
  correct: 96,
  wrong: 54,
  normMode: 'single'
});
assert.equal(tet.penaltyDeducted, 0);
assert.equal(tet.rawScore, 96);

// 6. Verify strict CSP, mounts on both /results/ and /mock-tests/, 4-theme CSS & SW/ops-sentinel sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

for (const htmlPath of ['results/index.html', 'mock-tests/index.html']) {
  const html = read(htmlPath);
  const mounts = html.match(/id=["']cso-answer-key-normalizer-root["']/g) || [];
  assert.equal(mounts.length, 1, `${htmlPath} must have exactly one #cso-answer-key-normalizer-root`);
  assert.ok(html.includes('/assets/js/answer-key-normalizer.js?v=20261128v457'), `${htmlPath} must load answer-key-normalizer.js?v=20261128v457`);
  assert.ok(!/\son[a-z]+\s*=/i.test(html), `${htmlPath} must have zero inline on* attributes`);
  assert.ok(!/\sstyle\s*=/i.test(html), `${htmlPath} must have zero inline style attributes`);
}

const css = read('assets/style.css');
const aknIdx = css.indexOf('v435: Odisha Govt Recruitment Answer Key');
assert.ok(aknIdx > 0, 'assets/style.css must contain v435 .cso-akn-* CSS block');
const aknBlock = css.slice(aknIdx);
assert.ok(aknBlock.includes('.cso-akn-card'), 'CSS must style .cso-akn-card');
assert.ok(aknBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(aknBlock), 'v435 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v457'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v457');
assert.ok(sw.includes('/assets/js/answer-key-normalizer.js?v=20261128v457'), 'sw.js must pre-cache answer-key-normalizer.js?v=20261128v457');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v457'"), 'ops-sentinel.js must match cso-candidate-cache-v457');

console.log('✅ v435 Odisha Govt Answer Key & Raw-to-Normalized Score Calculator tests passed!');
