// Verification for v195 Exam-Specific CBT Mock Packs & Candidate Hub Streaks
// Run: node scripts/test-cbt-exam-packs-v195.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const { EXAM_PACKS } = require(path.join(ROOT, 'study-library/cbt-mock-test/assets/cbt-exam-packs.js'));
const cbt = require(path.join(ROOT, 'study-library/cbt-mock-test/assets/cbt.js'));

// 1. Verify all 4 dedicated Odisha exam packs, bilingual EN/Odia fields, and negative-marking rules
assert.equal(EXAM_PACKS.length, 4, 'Expected 4 dedicated Odisha exam packs');
const expectedIds = ['opsc-oas', 'osssc-ri', 'otet-osstet', 'oprb'];
assert.deepEqual(EXAM_PACKS.map(p => p.id), expectedIds);

for (const pack of EXAM_PACKS) {
  assert.ok(pack.title && pack.title_or && pack.subtitle, `Missing metadata in pack ${pack.id}`);
  assert.ok(Array.isArray(pack.questions) && pack.questions.length >= 4, `Expected >=4 questions in ${pack.id}`);
  for (const q of pack.questions) {
    assert.ok(q.id && q.section && q.question && q.question_or, `Missing bilingual stem/section in ${q.id}`);
    assert.ok(Array.isArray(q.options) && q.options.length === 4, `Expected 4 EN options in ${q.id}`);
    assert.ok(Array.isArray(q.options_or) && q.options_or.length === 4, `Expected 4 Odia options in ${q.id}`);
    assert.ok(q.explanation && q.explanation_or, `Missing bilingual explanation in ${q.id}`);
  }
}

// Verify negative marking math on pack configs (1/3, 1/3, 0, 1/4)
const opscPack = EXAM_PACKS.find(p => p.id === 'opsc-oas');
const ossscPack = EXAM_PACKS.find(p => p.id === 'osssc-ri');
const otetPack = EXAM_PACKS.find(p => p.id === 'otet-osstet');
const oprbPack = EXAM_PACKS.find(p => p.id === 'oprb');

const sampleResp = { 0: opscPack.questions[0].answerIndex, 1: (opscPack.questions[1].answerIndex + 1) % 4 };
const opscScore = cbt.scoreAttempt(opscPack.questions.slice(0, 2), sampleResp, opscPack);
assert.equal(opscScore.netScore, 1.34); // +2 - 0.66
assert.ok(Array.isArray(opscScore.sectionStats) && opscScore.sectionStats.length === 2);
assert.ok(opscScore.weakTopic, 'Expected weakTopic on scorecard');

const ossscScore = cbt.scoreAttempt(ossscPack.questions.slice(0, 2), { 0: ossscPack.questions[0].answerIndex, 1: (ossscPack.questions[1].answerIndex + 1) % 4 }, ossscPack);
assert.equal(ossscScore.netScore, 0.67); // +1 - 0.33

const otetScore = cbt.scoreAttempt(otetPack.questions.slice(0, 2), { 0: otetPack.questions[0].answerIndex, 1: (otetPack.questions[1].answerIndex + 1) % 4 }, otetPack);
assert.equal(otetScore.netScore, 1); // +1 - 0

const oprbScore = cbt.scoreAttempt(oprbPack.questions.slice(0, 2), { 0: oprbPack.questions[0].answerIndex, 1: (oprbPack.questions[1].answerIndex + 1) % 4 }, oprbPack);
assert.equal(oprbScore.netScore, 0.75); // +1 - 0.25

// 2. Verify Candidate Hub streak & attempt persistence
const store = new Map();
const memStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v))
};
cbt.saveCbtHistory({ examId: 'opsc-oas', examLabel: opscPack.title, netScore: 1.34, maxScore: 4, accuracyPct: 50, weakTopic: 'Odisha Geography', date: '2026-11-21', total: 2 }, memStorage);
cbt.saveCbtHistory({ examId: 'oprb', examLabel: oprbPack.title, netScore: 0.75, maxScore: 2, accuracyPct: 50, weakTopic: 'Reasoning', date: '2026-11-22', total: 2 }, memStorage);
const hist = cbt.loadCbtHistory(memStorage);
const streak = JSON.parse(memStorage.getItem(cbt.STREAK_KEY));
assert.equal(hist.length, 2);
assert.equal(streak.count, 2);

// 3. Verify HTML/JS/CSS wiring & 100% CSP compliance
const cbtHtml = fs.readFileSync(path.join(ROOT, 'study-library/cbt-mock-test/index.html'), 'utf8');
const cbtJs = fs.readFileSync(path.join(ROOT, 'study-library/cbt-mock-test/assets/cbt.js'), 'utf8');
const cbtCss = fs.readFileSync(path.join(ROOT, 'study-library/cbt-mock-test/assets/cbt.css'), 'utf8');
const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
const dashJs = fs.readFileSync(path.join(ROOT, 'assets/js/student-dashboard.js'), 'utf8');

assert.ok(cbtHtml.includes('/study-library/cbt-mock-test/assets/cbt-exam-packs.js?v=20261122v195'));
assert.ok(cbtHtml.includes('/study-library/cbt-mock-test/assets/cbt.js?v=20261122v195'));
assert.ok(cbtHtml.includes('/study-library/cbt-mock-test/assets/cbt.css?v=20261122v195'));
assert.ok(cbtJs.includes('EN / ଓଡ଼ିଆ'));
assert.ok(cbtCss.includes('.cbt-pack-grid'));
assert.ok(dashHtml.includes('id="cso-cbt-streak-panel"'));
assert.ok(dashHtml.includes('/assets/js/student-dashboard.js?v=20261122v195'));
assert.ok(dashJs.includes('renderLocalCbtStreaks'));

for (const [name, html] of [['cbt-mock-test/index.html', cbtHtml], ['student-dashboard/index.html', dashHtml]]) {
  assert.ok(!/<style\b/i.test(html), `No <style> in ${name}`);
  assert.ok(!/\sstyle\s*=/i.test(html), `No style= in ${name}`);
  assert.ok(!/\sonclick\s*=/i.test(html), `No onclick= in ${name}`);
  const noExt = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
  const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(!/<script\b/i.test(noJsonLd), `No executable inline <script> in ${name}`);
}

for (const [name, js] of [['cbt-exam-packs.js', fs.readFileSync(path.join(ROOT, 'study-library/cbt-mock-test/assets/cbt-exam-packs.js'), 'utf8')], ['cbt.js', cbtJs], ['student-dashboard.js', dashJs]]) {
  assert.ok(!/\.innerHTML\b/.test(js), `No .innerHTML in ${name}`);
}

console.log('PASS: All 4 Odisha CBT exam packs, bilingual EN/Odia toggle, streaks & strict CSP verified (v195)');
