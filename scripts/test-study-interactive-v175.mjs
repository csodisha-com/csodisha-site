// v175: Interactive Study Library & Bilingual (EN | ଓଡ଼ିଆ | Dual) Verification.
// Usage: node scripts/test-study-interactive-v175.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const si = require(path.join(root, 'study-library/assets/study-interactive.js'));
const siSrc = read('study-library/assets/study-interactive.js');
const dashJs = read('study-library/assets/dashboard.js');
const dashCss = read('study-library/assets/dashboard.css');
const html = read('study-library/index.html');

// Mock localStorage
const store = new Map();
const mockStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); }
};

// 1. EN | ଓଡ଼ିଆ | Dual Bilingual Reader Toggle & Persistence
ok(html.includes('data-lang="en"') && html.includes('data-lang="or"') && html.includes('data-lang="dual"'), 'study-library/index.html renders 3-way EN | ଓଡ଼ିଆ | Dual toggle');
ok(si.setLangMode('dual', mockStorage) === 'dual' && si.getLangMode(mockStorage) === 'dual', 'cso_study_lang_mode persists dual');
ok(si.setLangMode('or', mockStorage) === 'or' && si.getLangMode(mockStorage) === 'or', 'cso_study_lang_mode persists or');
ok(si.setLangMode('en', mockStorage) === 'en' && si.getLangMode(mockStorage) === 'en', 'cso_study_lang_mode persists en');

const sampleItem = { title: 'OPSC Syllabus', title_or: 'OPSC ପାଠ୍ୟକ୍ରମ', description: 'Prelims & Mains', description_or: 'ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ' };
const dualOut = si.resolveBilingualContent(sampleItem, 'dual');
ok(dualOut.primaryTitle === 'OPSC Syllabus' && dualOut.secondaryTitle === 'OPSC ପାଠ୍ୟକ୍ରମ' && !dualOut.fallbackNote, 'Dual mode returns both EN & Odia');

const noOrItem = { title: 'UGC NET Paper 1', description: 'Teaching Aptitude' };
const fallbackOut = si.resolveBilingualContent(noOrItem, 'or');
ok(fallbackOut.primaryTitle === 'UGC NET Paper 1' && fallbackOut.fallbackNote === true, 'Odia mode falls back gracefully to EN with fallbackNote');

// 2. Flip Flashcards & Web Speech API Tap-to-Hear
ok(html.includes('id="study-flashcards-open"'), 'study-library/index.html includes Quick Flashcards button');
ok(si.CURATED_FLASHCARDS.length >= 6, 'Curated flashcards populated');
ok(siSrc.includes('← Previous') && siSrc.includes('Next →') && siSrc.includes('🔀 Shuffle') && siSrc.includes('🔊 Listen'), 'Flashcard controls (Previous, Next, Shuffle, Listen) present');
ok(siSrc.includes('window.speechSynthesis') && siSrc.includes('speechSynthesis.cancel()'), 'Web Speech API guarded & cancels active speech');
ok(siSrc.includes('canSpeak()') && siSrc.includes('listenBtn.hidden = true'), 'Gracefully hides Listen button if speechSynthesis unsupported');

// 3. Revise Again Mistake Deck (cso_study_mistake_deck)
ok(html.includes('id="study-revise-again-btn"') && html.includes('Revise Again (0)'), 'study-library/index.html includes Revise Again (N) button');
const d1 = si.addMistakeItem({ id: 'm1', exam: 'OPSC', q: 'Question 1', a: 'Answer 1' }, mockStorage);
ok(d1.length === 1 && si.loadMistakeDeck(mockStorage).length === 1, 'addMistakeItem persists to cso_study_mistake_deck');
const d2 = si.removeMistakeItem('m1', mockStorage);
ok(d2.length === 0 && si.loadMistakeDeck(mockStorage).length === 0, 'removeMistakeItem removes mastered item');
ok(siSrc.includes('✓ Mark Mastered'), 'Revise Again modal includes ✓ Mark Mastered button');

// 4. Theme Compatibility, 44px Mobile Touch Targets & 100% CSP Compliance
ok(dashCss.includes('var(--cso-surface') && dashCss.includes('var(--cso-surface-alt') && dashCss.includes('var(--cso-text'), 'v175 styles use --cso-* theme variables');
ok(/@media \(max-width: 768px\)[\s\S]*?\.study-flashcards-btn[\s\S]*?min-height:\s*44px/.test(dashCss), 'v175 enforces 44px mobile touch targets');

ok(!/<style[\s>]/i.test(html), 'study-library/index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(html), 'study-library/index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), 'study-library/index.html: zero inline event handlers');
for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
  ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), 'study-library/index.html: zero executable inline <script>');
}
for (const [rel, src] of [['study-interactive.js', siSrc], ['dashboard.js', dashJs]]) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${rel}: zero innerHTML sinks`);
  ok(!/\bonclick\s*=/.test(src), `${rel}: zero onclick=`);
}

// 5. Asset & Cache bumps (v175)
ok(html.includes('./assets/dashboard.css?v=20261121v175'), 'study-library/index.html references dashboard.css v175');
ok(html.includes('./assets/study-interactive.js?v=20261121v175'), 'study-library/index.html references study-interactive.js v175');
ok(html.includes('./assets/dashboard.js?v=20261121v175'), 'study-library/index.html references dashboard.js v175');
ok(/CACHE_NAME = 'cso-candidate-cache-v175'/.test(read('sw.js')), 'sw.js bumped to v175');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v175'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v175');
ok(/cso-candidate-cache-v175/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v175');

console.log(`test-study-interactive-v175: ${passed} assertions passed`);
