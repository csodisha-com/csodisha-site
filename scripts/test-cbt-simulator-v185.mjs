import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const cbt = require(path.join(root, 'study-library/cbt-mock-test/assets/cbt.js'));

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    }
  };
}

// 1. Verify exam preset scoring & negative marking math
const sampleQs = [
  { id: 'q1', exam: 'OPSC OAS', question: 'Q1?', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: 'Exp1' },
  { id: 'q2', exam: 'OPSC OAS', question: 'Q2?', options: ['A', 'B', 'C', 'D'], answerIndex: 1, explanation: 'Exp2' },
  { id: 'q3', exam: 'OPSC OAS', question: 'Q3?', options: ['A', 'B', 'C', 'D'], answerIndex: 2, explanation: 'Exp3' }
];
// 1 correct, 1 wrong, 1 unanswered
const responses = { 0: 0, 1: 0 };

const opscRes = cbt.scoreAttempt(sampleQs, responses, cbt.getPresetById('opsc-oas'));
assert.equal(opscRes.correct, 1);
assert.equal(opscRes.wrong, 1);
assert.equal(opscRes.unanswered, 1);
assert.equal(opscRes.netScore, 1.34); // +2 - 0.66
assert.equal(opscRes.accuracyPct, 50);
assert.equal(opscRes.missedItems.length, 1);

const ossscRes = cbt.scoreAttempt(sampleQs, responses, cbt.getPresetById('osssc-ri'));
assert.equal(ossscRes.netScore, 0.5); // +1 - 0.50

const oprbRes = cbt.scoreAttempt(sampleQs, responses, cbt.getPresetById('oprb'));
assert.equal(oprbRes.netScore, 0.75); // +1 - 0.25

const otetRes = cbt.scoreAttempt(sampleQs, responses, cbt.getPresetById('otet-osstet'));
assert.equal(otetRes.netScore, 1); // +1 - 0

// 2. Verify palette state transitions
const state = { responses: { 0: 1 }, marked: { 1: true } };
assert.equal(cbt.getPaletteStatus(state, 0), 'answered');
assert.equal(cbt.getPaletteStatus(state, 1), 'marked');
assert.equal(cbt.getPaletteStatus(state, 2), 'unanswered');
assert.equal(cbt.formatTimer(125), '02:05');

// 3. Verify Mistake Deck auto-sync (deduplication) & CBT history persistence
const storage = createMemoryStorage();
cbt.syncMissedToMistakeDeck(opscRes.missedItems, storage);
cbt.syncMissedToMistakeDeck(opscRes.missedItems, storage);
const deck = JSON.parse(storage.getItem('cso_study_mistake_deck'));
assert.equal(deck.length, 1);
assert.equal(deck[0].id, 'q2');

cbt.saveCbtHistory({ examId: 'opsc-oas', examLabel: 'OPSC OAS', netScore: 1.34, maxScore: 6, accuracyPct: 50, total: 3 }, storage);
const hist = cbt.loadCbtHistory(storage);
assert.equal(hist.length, 1);
assert.equal(hist[0].netScore, 1.34);

// 4. Verify HTML, JSON-LD, discovery, SSR pass-through, sitemap, and 100% CSP compliance
const html = fs.readFileSync(path.join(root, 'study-library/cbt-mock-test/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'study-library/cbt-mock-test/assets/cbt.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'study-library/cbt-mock-test/assets/cbt.js'), 'utf8');

const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(ldMatch, 'Must contain LearningResource/Quiz JSON-LD');
const ldJson = JSON.parse(ldMatch[1]);
assert.equal(ldJson.learningResourceType, 'Quiz');
assert.equal(ldJson.isAccessibleForFree, true);
assert.equal(ldJson.url, 'https://csodisha.com/study-library/cbt-mock-test/');

assert.equal(/<style\b/i.test(html), false, 'Zero <style> in cbt-mock-test/index.html');
assert.equal(/\sstyle="/i.test(html), false, 'Zero style="" in cbt-mock-test/index.html');
assert.equal(/\sonclick=/i.test(html), false, 'Zero onclick= in cbt-mock-test/index.html');
const nonLdScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
for (const s of nonLdScripts) {
  assert.equal(s[2].trim(), '', 'Executable scripts must be external');
}
assert.equal(/\.innerHTML\b|insertAdjacentHTML/i.test(js), false, 'Zero innerHTML in cbt.js');
assert.ok(css.includes('min-height: 44px'), '44px touch targets present in cbt.css');

const studyHtml = fs.readFileSync(path.join(root, 'study-library/index.html'), 'utf8');
assert.ok(studyHtml.includes('/study-library/cbt-mock-test/'));

const studySsr = fs.readFileSync(path.join(root, 'functions/_lib/study-library-ssr.js'), 'utf8');
assert.ok(studySsr.includes("pathname.startsWith('/study-library/cbt-mock-test/')"));

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('https://csodisha.com/study-library/cbt-mock-test/'));

const seoJs = fs.readFileSync(path.join(root, 'functions/api/content/_seo.js'), 'utf8');
assert.ok(seoJs.includes("'/study-library/cbt-mock-test/'"));

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v185'"));

console.log('test-cbt-simulator-v185: ALL CHECKS PASSED');
