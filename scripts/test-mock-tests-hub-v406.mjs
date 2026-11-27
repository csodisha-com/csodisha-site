/**
 * v406: Interactive Mock Test Series & Exam-Day Countdown Hub (/mock-tests/) Verification Suite
 * Validates:
 *  1. 3 complete 25-MCQ sectional drills (Odisha GK & Current Affairs, Teaching Aptitude & Pedagogy,
 *     Reasoning & Quantitative Aptitude = 75 total unique MCQs)
 *  2. Negative-marking scoring engine (-0.25 / -0.50 / 0) & instant topic-wise accuracy breakdown
 *  3. Live IST exam-day countdowns, mock-tests/index.html mount, strict CSP compliance & zero hardcoded hex
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsSrc = fs.readFileSync('assets/js/mock-tests-hub.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(jsSrc), 'Zero .innerHTML in mock-tests-hub.js');
assert.ok(!/\.outerHTML\b/.test(jsSrc), 'Zero .outerHTML in mock-tests-hub.js');
assert.ok(!/insertAdjacentHTML/.test(jsSrc), 'Zero insertAdjacentHTML in mock-tests-hub.js');
assert.ok(!/\.style\./.test(jsSrc), 'Zero .style.* mutations in mock-tests-hub.js');

const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(jsSrc, sandbox);
const hub = sandbox.CSOMockTestsHub;
assert.ok(hub && hub.version === 'v406', 'CSOMockTestsHub v406 loaded');

// 1. Verify all 3 sectional drills have exactly 25 valid MCQs each (75 total)
assert.equal(hub.SECTIONAL_DRILLS.length, 3, 'Must provide 3 sectional drills');
const seenIds = new Set();
for (const drill of hub.SECTIONAL_DRILLS) {
  assert.equal(drill.questions.length, 25, `${drill.key} must contain exactly 25 MCQs`);
  for (const q of drill.questions) {
    assert.ok(!seenIds.has(q.id), `Duplicate MCQ id: ${q.id}`);
    seenIds.add(q.id);
    assert.equal(q.opts.length, 4);
    assert.ok(q.ans >= 0 && q.ans <= 3 && q.subtopic && q.exp);
  }
}
assert.equal(seenIds.size, 75, '75 total unique MCQs across 3 sectional drills');

// 2. Verify negative marking (-0.25 / -0.50 / 0) and topic-wise accuracy breakdown
const ogDrill = hub.SECTIONAL_DRILLS[0];
const mockAns = {};
ogDrill.questions.forEach((q, idx) => {
  if (idx < 16) mockAns[q.id] = q.ans; // 16 correct
  else if (idx < 20) mockAns[q.id] = (q.ans + 1) % 4; // 4 wrong
  // 5 unanswered
});

const scoreNeg25 = hub.evaluateDrillAttempt(ogDrill.questions, mockAns, 0.25);
assert.equal(scoreNeg25.correct, 16);
assert.equal(scoreNeg25.wrong, 4);
assert.equal(scoreNeg25.unanswered, 5);
assert.equal(scoreNeg25.penalty, 1);
assert.equal(scoreNeg25.net_score, 15);
assert.equal(scoreNeg25.accuracy_pct, 80);
assert.equal(scoreNeg25.by_subtopic.length, 5, 'Odisha GK splits across 5 subtopics');

const scoreNeg50 = hub.evaluateDrillAttempt(ogDrill.questions, mockAns, 0.5);
assert.equal(scoreNeg50.penalty, 2);
assert.equal(scoreNeg50.net_score, 14);

const scoreZero = hub.evaluateDrillAttempt(ogDrill.questions, mockAns, 0);
assert.equal(scoreZero.penalty, 0);
assert.equal(scoreZero.net_score, 16);

// 3. Verify IST countdowns, mock-tests/index.html wiring & CSS tokens
assert.ok(hub.EXAM_COUNTDOWNS.length >= 6);
const daysToDec31 = hub.computeCountdownDays('2026-12-31', new Date('2026-11-27T06:30:00Z'));
assert.equal(daysToDec31, 34);

const html = fs.readFileSync('mock-tests/index.html', 'utf8');
assert.ok(html.includes('id="cso-mock-tests-hub-root"'), 'mock-tests/index.html mounts #cso-mock-tests-hub-root');
assert.ok(html.includes('/assets/js/mock-tests-hub.js?v=20261127v410'), 'mock-tests/index.html loads mock-tests-hub.js');
assert.ok(!/\sstyle\s*=\s*["']/i.test(html) && !/\son[a-z]+\s*=\s*["']/i.test(html), 'mock-tests/index.html has zero inline styles/handlers');

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const v406Css = styleCss.slice(styleCss.indexOf('v406:'));
assert.ok(v406Css.includes('.cso-mtd-card') && v406Css.includes('min-height: 44px'), 'assets/style.css defines .cso-mtd-* styles with >=44px touch targets');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v406Css), 'Zero hardcoded hex colors in v406 CSS');

console.log('✅ v406 Interactive Mock Test Series & Exam-Day Countdown Hub test suite passed!');
