#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v407 Interactive Mock Test Series & Exam-Day Countdown Hub Audit ===');

const hubSrc = read('assets/js/mock-tests-hub.js');
const mockHtml = read('mock-tests/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// Load module in isolated VM context
const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(hubSrc, sandbox);
const Hub = sandbox.window.CSOMockTestsHub;
assert.ok(Hub, 'window.CSOMockTestsHub must be exported');
assert.equal(Hub.version, 'v407', 'CSOMockTestsHub.version must be v407');
assert.equal(Hub.HISTORY_KEY, 'cso_mock_test_history_v1', 'HISTORY_KEY must be cso_mock_test_history_v1');

// 1. Verify 3 sectional tracks + 4th Mixed Grand Mock (each 25 valid bilingual MCQs)
assert.equal(Hub.SECTIONAL_DRILLS.length, 4, 'Must define 3 sectional tracks + 1 Mixed Grand Mock');
const expectedKeys = ['odisha-gk', 'teaching-pedagogy', 'reasoning-quant', 'mixed-grand'];
assert.deepEqual(
  Array.from(Hub.SECTIONAL_DRILLS, d => d.key),
  expectedKeys,
  'Drill keys must include odisha-gk, teaching-pedagogy, reasoning-quant, and mixed-grand'
);

for (const drill of Hub.SECTIONAL_DRILLS) {
  assert.equal(drill.questions.length, 25, `${drill.key} must contain exactly 25 MCQs`);
  assert.ok(drill.title && drill.title_or, `${drill.key} must have bilingual EN + Odia title`);
  const seenIds = new Set();
  for (const q of drill.questions) {
    assert.ok(q.id && !seenIds.has(q.id), `Duplicate or missing question id in ${drill.key}: ${q.id}`);
    seenIds.add(q.id);
    assert.ok(q.subtopic && q.subtopic_or, `${q.id} must have bilingual subtopic`);
    assert.ok(q.q && q.q_or, `${q.id} must have bilingual EN + Odia question prompt`);
    assert.equal(Array.isArray(q.opts) ? q.opts.length : 0, 4, `${q.id} must have exactly 4 options`);
    assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans <= 3, `${q.id} must have valid answer index 0..3`);
    assert.ok(q.exp && q.exp_or, `${q.id} must have bilingual EN + Odia explanation`);
  }
}

// 2. Verify exact net-score & negative-marking arithmetic across 0, -0.25, -0.50 + topic breakdown
const gkDrill = Hub.SECTIONAL_DRILLS[0];
const sampleAnswers = {};
// Answer first 20 correctly, next 4 wrongly, leave 1 unanswered
for (let i = 0; i < 20; i++) sampleAnswers[gkDrill.questions[i].id] = gkDrill.questions[i].ans;
for (let i = 20; i < 24; i++) sampleAnswers[gkDrill.questions[i].id] = (gkDrill.questions[i].ans + 1) % 4;

const r0 = Hub.evaluateDrillAttempt(gkDrill.questions, sampleAnswers, 0);
assert.equal(r0.correct, 20);
assert.equal(r0.wrong, 4);
assert.equal(r0.unanswered, 1);
assert.equal(r0.penalty, 0);
assert.equal(r0.net_score, 20);
assert.equal(r0.accuracy_pct, 83); // 20/24 = 83.33 -> 83

const r25 = Hub.evaluateDrillAttempt(gkDrill.questions, sampleAnswers, 0.25);
assert.equal(r25.penalty, 1);
assert.equal(r25.net_score, 19);

const r50 = Hub.evaluateDrillAttempt(gkDrill.questions, sampleAnswers, 0.5);
assert.equal(r50.penalty, 2);
assert.equal(r50.net_score, 18);

// Topic-wise aggregation & weakest_topic check
assert.equal(r25.by_subtopic.length, 4, 'Odisha GK must aggregate 4 distinct sub-topics');
assert.ok(r25.weakest_topic, 'evaluateDrillAttempt must identify weakest_topic');
assert.equal(r25.weakest_topic.subtopic, 'Odisha Current Affairs', 'Weakest topic must be Odisha Current Affairs where the 4 wrong answers occurred');

// Live IST Exam Countdown Strip checks (CBSE CTET 22nd Edition & NTA UGC NET Dec 2026)
const cdTitles = Array.from(Hub.EXAM_COUNTDOWNS, e => e.title).join(' | ');
assert.ok(cdTitles.includes('CBSE CTET 22nd Edition'), 'Countdown strip must include CBSE CTET 22nd Edition');
assert.ok(cdTitles.includes('NTA UGC NET December 2026'), 'Countdown strip must include NTA UGC NET December 2026');
const det = Hub.computeCountdownDetails('2026-12-12', new Date('2026-11-27T08:00:00Z'));
assert.equal(det.days, 15, 'IST countdown days from 2026-11-27 to 2026-12-12 must be 15');
assert.equal(det.is_past, false);

// 3. Markup, Strict CSP, 4-Theme CSS & v407 Cache Sync
assert.match(mockHtml, /id="cso-mock-tests-hub-root"/, 'mock-tests/index.html must mount #cso-mock-tests-hub-root');
assert.match(mockHtml, /\/assets\/js\/ics-calendar-export\.js\?v=20261127v410/, 'mock-tests/index.html must load ics-calendar-export.js v407');
assert.match(mockHtml, /\/assets\/js\/mock-tests-hub\.js\?v=20261127v410/, 'mock-tests/index.html must load mock-tests-hub.js v407');
assert.ok(!/\sstyle="/i.test(mockHtml), 'mock-tests/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(mockHtml), 'mock-tests/index.html must have zero inline on* handlers');
assert.ok(!hubSrc.includes('.innerHTML') && !hubSrc.includes('.outerHTML') && !hubSrc.includes('insertAdjacentHTML') && !hubSrc.includes('.style.'), 'mock-tests-hub.js must obey strict CSP');

const v407CssIdx = styleCss.indexOf('v407: Mock Test Hub');
assert.ok(v407CssIdx !== -1, 'assets/style.css must contain v407 Mock Test Hub CSS block');
const v407Css = styleCss.slice(v407CssIdx);
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v407Css), 'v407 CSS block must have zero hardcoded hex colors');
assert.ok(v407Css.includes('@media print'), 'v407 CSS block must include clean @media print support');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v410'"), 'sw.js CACHE_NAME must be v407');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v410'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v407');

console.log('✅ v407 Interactive Mock Test Series & Exam-Day Countdown Hub Audit PASSED');
