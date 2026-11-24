#!/usr/bin/env node
/**
 * v257 Study Library Explorer Editorial Polish & Unified Portal Verification Suite
 *
 * Tests:
 *  1. portal-shell.css hides redundant static .cso-study-hero, .cso-sl-hero-banner, .welcome & #cso-clean-page-content
 *     once #cso-study-portal-root mounts, and centers .cso-study-hub at max-width: 1280px.
 *  2. study-portal.js & study-portal.css implement:
 *     - Flagship Editorial Hero Banner (eyebrow, EN/ଓଡ଼ିଆ title & subtitle, 4-tile KPI Strip, English | ଓଡ଼ିଆ toggle)
 *     - Zero technical jargon ('All Exam Tracks (L1)', 'All Subjects / Papers (L2)', 'All Chapters / Formats (L3)', Admin Studio instructions in public empty copy removed)
 *     - Polished Candidate Syllabus Completion & Study Streak strip with Resume / Revision Queue CTA
 *     - Elevated Exam Track Cards + Quick Resource-Type Pills + 5-Column Curriculum Filter Bar
 *     - CSP-safe SVG-illustrated Empty State + Admin-only CTA + Browse 3-Layer Exam Tracks & Subjects grid (minmax(260px, 1fr))
 *     - 4-theme compatibility (System, Dark Night, Reading Mode, Odisha & Bharat) + preserved EdTech Reader & A4 print
 *  3. study-library/index.html & study/index.html link v257 portal-shell.css, study-portal.css & study-portal.js.
 *  4. Strict CSP compliance across all v257 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v257.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

console.log('\n=== v257 Study Library Explorer Editorial Polish Verification ===');

check('1. portal-shell.css suppresses static .cso-study-hero, .cso-sl-hero-banner & legacy fallbacks and centers .cso-study-hub', () => {
  const css = read('assets/css/portal-shell.css');
  assert.ok(css.includes('body.cso-portal-active .cso-study-hero'), 'must hide static .cso-study-hero');
  assert.ok(css.includes('body.cso-portal-active .cso-sl-hero-banner'), 'must hide static .cso-sl-hero-banner');
  assert.ok(css.includes('body.cso-portal-study-active .welcome'), 'must hide legacy .welcome hero');
  assert.ok(css.includes('body.cso-portal-study-active #cso-clean-page-content'), 'must hide legacy clean-page empty fallback on /study/');
  assert.ok(css.includes('.cso-study-hub'), 'must include .cso-study-hub in centered 1280px shell');
});

check('2. study-portal.js & study-portal.css implement Editorial Hero, Progress Strip, Exam Track Cards, 5-Col Filters & Illustrated Empty State + Tracks Grid', () => {
  const js = read('assets/js/study-portal.js');
  const css = read('assets/css/study-portal.css');

  // Editorial Hero & KPIs
  assert.ok(js.includes('ODISHA & CENTRAL EXAM PREPARATION · SYLLABI, NOTES, PYQS & MOCKS'));
  assert.ok(js.includes('Odisha & Central Exam Study Library & PYQ Hub'));
  assert.ok(js.includes('ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ପରୀକ୍ଷା ଅଧ୍ୟୟନ ପାଠାଗାର ଓ PYQ ହବ୍'));
  assert.ok(js.includes('Study Modules'));
  assert.ok(js.includes('PYQ & Syllabus Sets'));
  assert.ok(js.includes('Practice MCQs'));
  assert.ok(js.includes('Exam Tracks'));

  // Zero technical jargon
  assert.ok(!js.includes('All Exam Tracks (L1)'), 'must remove (L1) technical suffix');
  assert.ok(!js.includes('All Subjects / Papers (L2)'), 'must remove (L2) technical suffix');
  assert.ok(!js.includes('All Chapters / Formats (L3)'), 'must remove (L3) technical suffix');
  assert.ok(!js.includes('Admin Studio → Study Library (Alt+3)'), 'must remove internal Admin instructions from public empty state');

  // Progress Strip & Resume CTA
  assert.ok(js.includes('Your Syllabus Completion & Study Streak'));
  assert.ok(js.includes('Resume Last Chapter / View Revision Queue'));

  // Elevated Exam Track Cards + Quick Pills + 5-Col Curriculum Filter Bar
  assert.ok(js.includes('All Exam Tracks'));
  assert.ok(js.includes('OPSC OAS'));
  assert.ok(js.includes('OSSC & OSSSC'));
  assert.ok(js.includes('Teaching & TET'));
  assert.ok(js.includes('Odisha GK & Odia'));
  assert.ok(js.includes('Central Exams'));
  assert.ok(js.includes('🔥 Must-Study High-Yield'));
  assert.ok(js.includes('1. Exam Track'));
  assert.ok(js.includes('2. Subject / Paper'));
  assert.ok(js.includes('3. Chapter / Format'));
  assert.ok(js.includes('4. Difficulty Level'));
  assert.ok(js.includes('5. Search Topic or Paper Code'));

  // Illustrated Empty State + Admin-only CTA + Browse 3-Layer Exam Tracks & Subjects
  assert.ok(js.includes('Fresh Bilingual Study Notes, Syllabi & PYQs Coming Soon'));
  assert.ok(js.includes('+ Publish First Study Module in Admin Studio ↗'));
  assert.ok(js.includes('Browse 3-Layer Exam Tracks & Subjects'));
  assert.ok(js.includes('buildEmptyStudySvg'));

  // Preserved EdTech Reader capabilities
  assert.ok(js.includes('LearningResource'));
  assert.ok(js.includes('Flip-Card Revision Mode'));
  assert.ok(js.includes('Timed Exam Simulation'));

  // CSS wide desktop grids & 4-theme support
  assert.ok(css.includes('.sp-hero'));
  assert.ok(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'));
  assert.ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr));') || css.includes('grid-template-columns: 1fr 1fr 1fr 1fr 1.5fr;'));
  assert.ok(css.includes('grid-template-columns: repeat(6, minmax(0, 1fr));'));
  assert.ok(css.includes('grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));'));
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(css.includes('[data-cso-theme="utkal-bharat"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-theme="utkal-bharat"]')));
  assert.ok(css.includes('[data-cso-resolved-mode="dark"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-resolved-mode="dark"]')));
  assert.ok(css.includes('[data-cso-theme="reading"]') || (css.includes('var(--cso-hero-gradient') && shellCss.includes('[data-cso-theme="reading"]')));
  assert.ok(css.includes('@media print'));
});

check('3. study-library/index.html & study/index.html link v257 assets', () => {
  for (const rel of ['study-library/index.html', 'study/index.html']) {
    const html = read(rel);
    assert.ok(/\/assets\/css\/portal-shell\.css\?v=20261124v2(?:5[7-9]|[6-9]\d)/.test(html), `${rel} must link portal-shell.css?v=20261124v257`);
    assert.ok(/\/assets\/css\/study-portal\.css\?v=20261124v2(?:5[7-9]|[6-9]\d)/.test(html), `${rel} must link study-portal.css?v=20261124v257+`);
    assert.ok(/\/assets\/js\/study-portal\.js\?v=20261124v2(?:5[7-9]|[6-9]\d)/.test(html), `${rel} must link study-portal.js?v=20261124v257`);
  }
});

check('4. Strict CSP compliance across all v257 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v257', () => {
  const src = read('assets/js/study-portal.js');
  assert.ok(!/\.innerHTML\s*=/.test(src), 'study-portal.js violates CSP (.innerHTML)');
  assert.ok(!/\.outerHTML\s*=/.test(src), 'study-portal.js violates CSP (.outerHTML)');
  assert.ok(!/insertAdjacentHTML/.test(src), 'study-portal.js violates CSP (insertAdjacentHTML)');
  assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), 'study-portal.js violates CSP (.style.*)');

  for (const rel of ['study-library/index.html', 'study/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style attribute`);
  }

  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:5[7-9]|[6-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:5[7-9]|[6-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\n=== v257 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
