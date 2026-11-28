import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsPath = 'assets/js/gk-flashcard-deck.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');

// 2. Execute in clean sandbox and verify 30-card deck + Leitner engine
const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    addEventListener: () => {},
    getElementById: () => null
  },
  console,
  Date,
  Math
};
vm.runInNewContext(src, sandbox, { filename: jsPath });

const api = sandbox.window.CSOGkFlashcardDeck;
assert.ok(api, 'window.CSOGkFlashcardDeck must be exposed');
assert.equal(api.FLASHCARD_DECK.length, 30, 'Deck must have exactly 30 Odisha GK flashcards');

// Verify 5 domains with 6 cards each and full bilingual fields
const domainCounts = {};
const seenIds = new Set();
for (const card of api.FLASHCARD_DECK) {
  assert.ok(card.id && !seenIds.has(card.id), `Unique card id: ${card.id}`);
  seenIds.add(card.id);
  domainCounts[card.domain] = (domainCounts[card.domain] || 0) + 1;
  assert.ok(card.qEn && card.qOr && card.aEn && card.aOr && card.tip, `Bilingual fields present on ${card.id}`);
}
for (const d of ['polity', 'geography', 'economy', 'schemes', 'history']) {
  assert.equal(domainCounts[d], 6, `Domain ${d} must have 6 cards (got ${domainCounts[d]})`);
}

// Verify 3-Box Leitner scheduling transitions
const now = Date.UTC(2026, 10, 27, 12, 0, 0);
const r1 = api.scheduleFlashcardReview('pol-1', 'good', {}, now);
assert.equal(r1.entry.box, 2);
assert.equal(r1.entry.reviews, 1);
assert.equal(r1.entry.nextDueAt, now + 3 * 86400000, 'Box 2 scheduled +3 days');

const r2 = api.scheduleFlashcardReview('pol-1', 'mastered', r1.progressMap, now);
assert.equal(r2.entry.box, 3);
assert.equal(r2.entry.reviews, 2);
assert.equal(r2.entry.nextDueAt, now + 7 * 86400000, 'Box 3 scheduled +7 days');

const r3 = api.scheduleFlashcardReview('pol-1', 'again', r2.progressMap, now);
assert.equal(r3.entry.box, 1, 'Again resets card to Box 1');
assert.equal(r3.entry.nextDueAt, now + 86400000, 'Box 1 scheduled +1 day');

// 3. Verify HTML mounts in current-affairs/index.html & mock-tests/index.html
for (const htmlPath of ['current-affairs/index.html', 'mock-tests/index.html']) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('id="cso-gk-flashcard-deck-root"'), `${htmlPath} mounts #cso-gk-flashcard-deck-root`);
  assert.ok(html.includes('/assets/js/gk-flashcard-deck.js?v=20261128v455'), `${htmlPath} loads gk-flashcard-deck.js v443`);
}

// 4. Verify CSS, SW cache & ops-sentinel version sync
const css = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(css.includes('.cso-gfd-root') && css.includes('.cso-gfd-stage'), 'CSS defines .cso-gfd-* styles');

const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("const CACHE_NAME = 'cso-candidate-cache-v455';"), 'sw.js CACHE_NAME is cso-candidate-cache-v455');
assert.ok(sw.includes("'/assets/js/gk-flashcard-deck.js?v=20261128v455'"), 'sw.js precaches gk-flashcard-deck.js');

const ops = fs.readFileSync('functions/_lib/ops-sentinel.js', 'utf8');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v455'"), 'ops-sentinel.js synced to v443');

console.log('PASS: v443 30-Card Odisha GK & Current Affairs Leitner Flashcard Deck suite verified.');
