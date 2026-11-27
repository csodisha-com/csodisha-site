/**
 * v403: Bilingual Daily Current Affairs Quiz & Clean-Sheet Study Digest Verification Suite
 * Validates:
 *  1. current-affairs/index.html mounts the topic/date filter toolbar, 10-MCQ practice drill,
 *     and clean-sheet print digest button with zero inline style or on* attributes
 *  2. assets/js/current-affairs-hub.js supports all 4 topic filters (Odisha Governance, Economy,
 *     Awards & Sports, National & International), 10-MCQ scoring/explanation state, best-score
 *     localStorage persistence, and clean-sheet print digest rendering
 *  3. assets/style.css includes clean @media print rules for .cso-ca-* without hardcoded hex values
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 1. HTML Shell & Strict CSP validation
const html = fs.readFileSync('current-affairs/index.html', 'utf8');
assert.ok(html.includes('<link rel="canonical" href="https://csodisha.com/current-affairs/">'), 'Canonical URL present');
assert.ok(html.includes('/assets/js/current-affairs-hub.js?v=20261127v429'), 'Loads current-affairs-hub.js?v=20261127v429');
assert.ok(html.includes('id="cso-ca-topic-pills"'), 'Topic filter toolbar mounted');
assert.ok(html.includes('id="cso-ca-date-pills"'), 'Date window filter toolbar mounted');
assert.ok(html.includes('id="cso-ca-quiz-root"'), '10-MCQ practice drill mounted');
assert.ok(html.includes('id="cso-ca-print-btn"'), 'Clean-sheet print digest button mounted');
assert.ok(html.includes('id="cso-ca-print-digest"'), 'Clean-sheet print digest section mounted');

for (const topic of ['Odisha Governance', 'Economy', 'Awards &amp; Sports', 'National &amp; International']) {
  assert.ok(html.includes(topic), `Topic pill "${topic}" present in current-affairs/index.html`);
}
assert.ok(!/\sstyle\s*=\s*["']/i.test(html), 'Zero inline style="" attributes in current-affairs/index.html');
assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), 'Zero inline on* event handlers in current-affairs/index.html');

// 2. Controller logic & strict CSP validation
const jsSrc = fs.readFileSync('assets/js/current-affairs-hub.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(jsSrc), 'Zero .innerHTML in current-affairs-hub.js');
assert.ok(!/\.outerHTML\b/.test(jsSrc), 'Zero .outerHTML in current-affairs-hub.js');
assert.ok(!/insertAdjacentHTML/.test(jsSrc), 'Zero insertAdjacentHTML in current-affairs-hub.js');
assert.ok(!/\.style\./.test(jsSrc), 'Zero .style.* mutations in current-affairs-hub.js');

const store = {};
const sandbox = {
  globalThis: {},
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(jsSrc, sandbox);
const ca = sandbox.CSOCurrentAffairsHub;
assert.ok(ca && ca.version === 'v403', 'CSOCurrentAffairsHub v403 loaded');

// Verify all 4 topic filters work cleanly
const allRes = ca.filterBulletins(ca.CURATED_BULLETINS, { topic: 'all', now: new Date('2026-11-27T12:00:00Z') });
assert.ok(allRes.counts.all >= 6);
assert.ok(allRes.counts['odisha-governance'] >= 2, 'Odisha Governance count >= 2');
assert.ok(allRes.counts.economy >= 2, 'Economy count >= 2');
assert.ok(allRes.counts['awards-sports'] >= 1, 'Awards & Sports count >= 1');
assert.ok(allRes.counts['national-international'] >= 1, 'National & International count >= 1');

const econOnly = ca.filterBulletins(ca.CURATED_BULLETINS, { topic: 'economy' });
assert.ok(econOnly.results.length >= 2 && econOnly.results.every((b) => b.topic === 'economy'));

const novOnly = ca.filterBulletins(ca.CURATED_BULLETINS, { dateWindow: 'nov-2026' });
assert.equal(novOnly.results.length, ca.CURATED_BULLETINS.length);

// Verify 10-MCQ drill selection, scoring & localStorage best score
const ten = ca.selectTenMcqs(ca.MCQ_BANK, 0);
assert.equal(ten.length, 10, 'Drill must select exactly 10 MCQs');
for (const q of ten) {
  assert.ok(q.question_en && q.question_or && q.explanation_en && q.explanation_or, `MCQ ${q.id} must be bilingual`);
  assert.equal(q.options_en.length, 4);
  assert.equal(q.options_or.length, 4);
}
const mockAnswers = {};
ten.forEach((q, idx) => { mockAnswers[q.id] = idx < 8 ? q.correct_index : (q.correct_index + 1) % 4; });
const scored = ca.scoreMcqAttempt(ten, mockAnswers);
assert.deepEqual({ ...scored }, { correct: 8, answered: 10, total: 10 });
const savedStats = ca.saveBestScore(scored.correct, scored.total);
assert.equal(savedStats.best, 8);
assert.equal(ca.loadBestScore().best, 8);

// Verify Clean-Sheet Print Study Digest rendering payload
const digestEn = ca.buildPrintDigestSummary(allRes.results, ten, false);
assert.equal(digestEn.mcq_count, 10);
assert.equal(digestEn.answer_key.length, 10);
assert.ok(digestEn.answer_key[0].correct_letter && digestEn.answer_key[0].explanation);

// 3. CSS & @media print checks (zero hardcoded hex)
const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const v403Css = styleCss.slice(styleCss.indexOf('v403:'));
assert.ok(v403Css.includes('.cso-ca-hero') && v403Css.includes('.cso-ca-print-digest'), 'assets/style.css defines .cso-ca-* styles');
assert.ok(v403Css.includes('@media print') && v403Css.includes('display: block !important;'), 'assets/style.css includes clean @media print rules for .cso-ca-print-digest');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v403Css), 'Zero hardcoded hex colors in v403 CSS');

console.log('✅ v403 Bilingual Daily Current Affairs Quiz & Clean-Sheet Study Digest test suite passed!');
