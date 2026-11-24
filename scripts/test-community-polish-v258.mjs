#!/usr/bin/env node
/**
 * v258 Community & Civic Networks Explorer Editorial Polish Verification Suite
 *
 * Tests:
 *  1. portal-shell.css hides redundant static .cso-comm-hero once #cso-community-portal-root mounts.
 *  2. community-portal.js & community-portal.css implement:
 *     - Flagship Editorial Hero Banner (eyebrow, EN/ଓଡ଼ିଆ title & subtitle, segmented English | ଓଡ଼ିଆ toggle, 4-tile KPI Strip)
 *     - Clean bilingual dropdown labels (zero '(L1)', '(L2)', '(L3)' technical suffixes)
 *     - Clean Markdown excerpt stripping (stripMarkdownExcerpt) + CSP-safe rich prose renderer (renderRichProse)
 *     - Deduplicated Daily Quiz Challenge question prompts (formatQuizPrompt)
 *     - Elevated action toolbar, right-rail circles & leaderboard cards, and 4-theme compatibility
 *  3. Runtime verification of stripMarkdownExcerpt & formatQuizPrompt behavior.
 *  4. community/index.html links v258 portal-shell.css, community-portal.css & community-portal.js.
 *  5. Strict CSP compliance across all v258 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v258.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v258 Community & Civic Networks Explorer Editorial Polish Verification ===');

check('1. portal-shell.css suppresses duplicate static .cso-comm-hero once portal mounts', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('body.cso-portal-active .cso-comm-hero'), 'must hide static .cso-comm-hero');
  assert.ok(css.includes('body.cso-portal-community-active .cso-comm-hero'), 'must hide static .cso-comm-hero when community active');
});

check('2. community-portal.js & community-portal.css implement Editorial Hero, Clean Labels, Excerpt Stripping, Quiz Deduplication & 4-Theme Polish', () => {
  const js = read('assets/js/community-portal.js');
  const css = read('assets/css/community-portal.css');

  // Editorial Hero & KPIs
  assert.ok(js.includes('ODISHA ASPIRANT & CIVIC NETWORK · PEER Q&A, STUDY CIRCLES & PRO REWARDS'));
  assert.ok(js.includes('Odisha Aspirant Community, Study Circles & Civic Helpdesk'));
  assert.ok(js.includes('ଓଡ଼ିଶା ପରୀକ୍ଷାର୍ଥୀ ସମୁଦାୟ, ଅଧ୍ୟୟନ ଚକ୍ର ଏବଂ ନାଗରିକ ସହାୟତା କେନ୍ଦ୍ର'));
  assert.ok(js.includes('Interest Circles'));
  assert.ok(js.includes('Active Discussions'));
  assert.ok(js.includes('Pro & Permanent Contributors'));
  assert.ok(js.includes('Solved Q&As'));

  // Zero technical dropdown suffixes
  assert.ok(!js.includes('(L1)'), 'must remove (L1) technical suffix');
  assert.ok(!js.includes('(L2)'), 'must remove (L2) technical suffix');
  assert.ok(!js.includes('(L3)'), 'must remove (L3) technical suffix');
  assert.ok(js.includes('All Community Circles'));
  assert.ok(js.includes('All Interest Groups'));
  assert.ok(js.includes('All Discussion Formats'));

  // Clean Markdown Excerpt Stripping + Rich Prose Reader + Quiz Deduplication
  assert.ok(js.includes('function stripMarkdownExcerpt'));
  assert.ok(js.includes('function renderRichProse'));
  assert.ok(js.includes('function formatQuizPrompt'));

  // Elevated action bar & right rail + 4-theme CSS
  assert.ok(css.includes('.cp-hero'));
  assert.ok(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'));
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(css.includes('[data-cso-theme="utkal-bharat"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-theme="utkal-bharat"]')));
  assert.ok(css.includes('[data-cso-resolved-mode="dark"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-resolved-mode="dark"]')));
  assert.ok(css.includes('[data-cso-theme="reading"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-theme="reading"]')));
  assert.ok(css.includes('.cp-quiz-prompt'));
  assert.ok(css.includes('.cp-prose'));
});

check('3. Runtime check: stripMarkdownExcerpt removes raw Markdown & formatQuizPrompt deduplicates Q1–Q5 prompts', () => {
  const src = read('assets/js/community-portal.js');
  const sandbox = {
    window: { location: { search: '' } },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById() { return null; }
    },
    localStorage: { getItem() { return 'en'; }, setItem() {} },
    URLSearchParams
  };
  vm.runInNewContext(src, sandbox);
  const api = sandbox.window.CSOCommunityPortal;
  assert.ok(api && typeof api.stripMarkdownExcerpt === 'function' && typeof api.formatQuizPrompt === 'function');

  const excerpt = api.stripMarkdownExcerpt('## How Our Community Helps\\n- Join your **Exam Circle** (`OPSC`) and __District Chapter__.', 260);
  assert.ok(!excerpt.includes('##'), 'excerpt must not contain ##');
  assert.ok(!excerpt.includes('**'), 'excerpt must not contain **');
  assert.ok(!excerpt.includes('__'), 'excerpt must not contain __');
  assert.ok(!excerpt.includes('`'), 'excerpt must not contain backticks');
  assert.ok(excerpt.includes('How Our Community Helps') && excerpt.includes('Exam Circle'));

  const q1 = api.formatQuizPrompt({ question_en: 'Q1. Which is the highest mountain peak of Odisha?' }, 0);
  assert.equal(q1, 'Q1. Which is the highest mountain peak of Odisha?');
  const q2 = api.formatQuizPrompt({ question_en: 'In which year was the Paika Rebellion fought? In which year was the Paika Rebellion fought?' }, 1);
  assert.equal(q2, 'Q2. In which year was the Paika Rebellion fought?');
});

check('4. community/index.html links v258 assets', () => {
  const html = read('community/index.html');
  assert.ok(/\/assets\/css\/portal-shell\.css\?v=20261124v2(?:5[8-9]|[6-9]\d)/.test(html), 'must link portal-shell.css?v=20261124v258');
  assert.ok(/\/assets\/css\/community-portal\.css\?v=20261124v2(?:5[8-9]|[6-9]\d)/.test(html), 'must link community-portal.css?v=20261124v258+');
  assert.ok(/\/assets\/js\/community-portal\.js\?v=20261124v2(?:5[8-9]|[6-9]\d)/.test(html), 'must link community-portal.js?v=20261124v258');
});

check('5. Strict CSP compliance across all v258 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v258', () => {
  const src = read('assets/js/community-portal.js');
  assert.ok(!/\.innerHTML\s*=/.test(src), 'community-portal.js violates CSP (.innerHTML)');
  assert.ok(!/\.outerHTML\s*=/.test(src), 'community-portal.js violates CSP (.outerHTML)');
  assert.ok(!/insertAdjacentHTML/.test(src), 'community-portal.js violates CSP (insertAdjacentHTML)');
  assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), 'community-portal.js violates CSP (.style.*)');

  const html = read('community/index.html');
  assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), 'community/index.html has inline event handler');
  assert.ok(!/\sstyle="/i.test(html), 'community/index.html has inline style attribute');

  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:5[89]|[6-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:5[89]|[6-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\n=== v258 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
