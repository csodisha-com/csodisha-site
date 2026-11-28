#!/usr/bin/env node
/**
 * Regression & Contract Audit Suite — v455 (/careers/ 15-Item Visual, Layout,
 * Quick-Sort, Grouped/Flat Toggle, 3-Track Comparison Drawer, Vertical Stepper,
 * Candidate Profile Matcher, Sticky Track Bar, Clean Odia Subtitles & Public Header)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const libCode = read('assets/js/careers-roadmap-library.js');
const portalCode = read('assets/js/careers-portal.js');
const careersHtml = read('careers/index.html');
const sharedHeaderJs = read('assets/shared-header.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {} };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(libCode, sandbox);
const lib = sandbox.window.CSOCareersRoadmapLibrary;

assert.ok(lib, 'window.CSOCareersRoadmapLibrary must be exposed');
assert.equal(lib.VERSION, 'v455', 'CSOCareersRoadmapLibrary.VERSION must be v455');
assert.equal(typeof lib.sortCareerRoadmaps, 'function', 'sortCareerRoadmaps must be exported');
assert.equal(typeof lib.cleanOdiaSubtitle, 'function', 'cleanOdiaSubtitle must be exported');
assert.equal(typeof lib.evaluateCandidateMatch, 'function', 'evaluateCandidateMatch must be exported');

const all = lib.getAllCareerRoadmaps([]);
assert.equal(all.length, 18, 'Must preserve all 18 built-in bilingual roadmaps');

// Item 3: Clean Odia-only line 2 subtitles (no redundant English parenthetical duplication)
for (const rm of all) {
  assert.ok(/[\u0B00-\u0B7F]/.test(rm.title_or_clean), `${rm.slug} title_or_clean must contain Odia script`);
  assert.doesNotMatch(rm.title_or_clean, /\([A-Za-z0-9\s/&,.\-+]+\)/, `${rm.slug} title_or_clean must strip redundant English parentheticals`);
  assert.ok(rm.pay_pill_en && rm.pay_pill_en.length <= 36, `${rm.slug} pay_pill_en must be concise 1-line pill`);
  assert.ok(rm.rank_5_15_en && rm.rank_5_15_or, `${rm.slug} must provide 5-15 year rank comparison metadata`);
}
assert.equal(lib.cleanOdiaSubtitle('OPSC / F&ARD ଓଡ଼ିଶା ସେବା (OAS / OPS)'), 'ଓଡ଼ିଶା ସେବା');

// Item 6: Quick-Sort (Most Popular, Highest Starting Pay, Early Entry)
const byPopular = lib.sortCareerRoadmaps(all, 'popular');
assert.equal(byPopular[0].slug, 'opsc-oas-ofs-ops-ors', 'Most Popular must place OPSC OAS first');

const byHighestPay = lib.sortCareerRoadmaps(all, 'highest-pay');
assert.ok(
  byHighestPay[0].starting_pay_num >= byHighestPay[1].starting_pay_num &&
  byHighestPay[0].starting_pay_num >= byHighestPay[byHighestPay.length - 1].starting_pay_num,
  'Highest Starting Pay must sort descending by starting_pay_num'
);
assert.equal(byHighestPay[0].slug, 'rbi-grade-b-nabard-sebi-officer', 'RBI Grade B must rank #1 in Highest Starting Pay');

const byEarlyEntry = lib.sortCareerRoadmaps(all, 'early-entry');
assert.equal(byEarlyEntry[0].entry_order, 1, 'Early Entry must place After 10th/+2 pathways first');
assert.ok(byEarlyEntry[byEarlyEntry.length - 1].entry_order >= 4, 'Early Entry must place PG/In-Service last');

// Item 12: Unified Candidate Profile Matcher (cso_unified_candidate_profile_v1)
const gradProfile = { dob: '2000-05-15', category: 'ur', gender: 'male', qualification: 'graduate', pwbd: false };
const oasMatch = lib.evaluateCandidateMatch(all.find((x) => x.slug === 'opsc-oas-ofs-ops-ors'), gradProfile, new Date('2026-11-28'));
assert.equal(oasMatch.matched, true, '26-yr graduate must match OPSC OAS');

const plus2Profile = { dob: '2006-05-15', category: 'sebc', gender: 'female', qualification: 'plus-2', pwbd: false };
const oasPlus2 = lib.evaluateCandidateMatch(all.find((x) => x.slug === 'opsc-oas-ofs-ops-ors'), plus2Profile, new Date('2026-11-28'));
assert.equal(oasPlus2.matched, false, '+2 candidate must not match graduate-only OPSC OAS');
const earlyPlus2 = lib.evaluateCandidateMatch(all.find((x) => x.slug === 'after-10th-12th-early-entry-govt-skill'), plus2Profile, new Date('2026-11-28'));
assert.equal(earlyPlus2.matched, true, '+2 candidate must match After 10th/+2 Early-Entry roadmap');

const eligFiltered = lib.filterCareerRoadmaps(all, { profile: gradProfile, onlyEligible: true });
assert.ok(eligFiltered.total >= 6 && eligFiltered.total < 18, 'My Eligible Paths filter must narrow to matching roadmaps');

// Portal UI contracts (Items 4, 5, 6, 7, 12, 13, 14)
assert.match(portalCode, /Grouped by Track/, 'Must include Grouped by Track view mode');
assert.match(portalCode, /Flat Grid/, 'Must include Flat Grid view mode');
assert.match(portalCode, /crp-filter-sort/, 'Must render Quick-Sort selector');
assert.match(portalCode, /crp-compare-drawer-backdrop/, 'Must render side-by-side comparison drawer');
assert.match(portalCode, /Min Qualification/, 'Comparison table must include Min Qualification row');
assert.match(portalCode, /Age Limit/, 'Comparison table must include Age Limit row');
assert.match(portalCode, /Selection Stages/, 'Comparison table must include Selection Stages row');
assert.match(portalCode, /Starting Pay/, 'Comparison table must include Starting Pay row');
assert.match(portalCode, /5–15 Year Rank/, 'Comparison table must include 5–15 Year Rank row');
assert.match(portalCode, /cso_unified_candidate_profile_v1/, 'Must sync with unified candidate profile key');
assert.match(portalCode, /cso:profile-synced/, 'Must listen for cso:profile-synced event');
assert.match(portalCode, /Matches Your Qualification/, 'Must badge matching cards');
assert.match(portalCode, /My Eligible Paths/, 'Must render 1-click My Eligible Paths filter toggle');
assert.match(portalCode, /crp-track-bar-sticky/, 'Must render sticky track jump-bar');
assert.match(portalCode, /\/career-paths\/#cso-orsp-salary-root/, 'Must include Salary Calc direct shortcut');
assert.match(portalCode, /\/exams\/#cso-syllabus-mastery-tracker-root/, 'Must include Syllabus direct shortcut');
assert.match(portalCode, /\/jobs\//, 'Must include Live Jobs direct shortcut');

// Item 15: Clean Public Header & Permanent Ask CSOdisha Bar
assert.match(careersHtml, /cso-adm-icon-only cso-adm-stealth/, 'careers/index.html admin link must carry cso-adm-stealth so public visitors do not see Admin icon');
assert.match(careersHtml, /semantic-search\.js\?v=20261128v457/, 'careers/index.html must preserve permanent Ask CSOdisha search bar');
assert.match(sharedHeaderJs, /parsed\.email \|\| parsed\.id \|\| parsed\.user_id/, 'shared-header.js must require authenticated session object before showing Admin Studio / Candidate Hub pills');

// Strict CSP checks across JS & HTML
for (const [name, code] of [['careers-roadmap-library.js', libCode], ['careers-portal.js', portalCode]]) {
  assert.doesNotMatch(code, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/i, `${name} must not use unsafe markup injection`);
  assert.doesNotMatch(code, /\.style\.[a-zA-Z]/, `${name} must not mutate inline styles`);
}
assert.doesNotMatch(careersHtml, /\sstyle\s*=\s*["']/i, 'careers/index.html must have zero inline style=""');
assert.doesNotMatch(careersHtml, /\son[a-z]+\s*=\s*["']/i, 'careers/index.html must have zero inline on*=""');

// CSS Audit (Items 1, 2, 4, 8, 9, 10, 11, 13 + 100% var(--cso-*) tokens, zero hardcoded hex)
const v455Idx = styleCss.indexOf('v455 — /careers/');
assert.ok(v455Idx > 0, 'assets/style.css must contain v455 /careers/ CSS block');
const v455Css = styleCss.slice(v455Idx);
assert.doesNotMatch(v455Css, /#[0-9a-fA-F]{3,8}\b/, 'v455 CSS block must contain ZERO hardcoded hex colors');
assert.match(v455Css, /repeat\(auto-fit,\s*minmax\(min\(100%,\s*355px\),\s*1fr\)\)/, 'Item 1: must set 355px auto-fit grid');
assert.match(v455Css, /display:\s*flex;\s*flex-direction:\s*column;\s*height:\s*100%/, 'Item 2: equal-height flex cards');
assert.match(v455Css, /margin-top:\s*auto/, 'Item 2: pinned card action footers');
assert.match(v455Css, /white-space:\s*nowrap/, 'Item 4 & 10: single-line card buttons & pay pills');
for (const trackVar of ['--cso-track-civil', '--cso-track-eng', '--cso-track-bank', '--cso-track-health', '--cso-track-agri', '--cso-track-pathway']) {
  assert.ok(v455Css.includes(trackVar), `Item 8: v455 CSS must define ${trackVar}`);
}
assert.match(v455Css, /crp-card-milestones--v455[\s\S]*::before/, 'Item 9: vertical timeline stepper connector line');
assert.match(v455Css, /-webkit-line-clamp:\s*2/, 'Item 11: 2-line description clamp');
assert.match(v455Css, /position:\s*sticky/, 'Item 13: sticky track jump-bar');
assert.match(v455Css, /min-height:\s*44px/, 'Must enforce >= 44px touch targets');
assert.match(v455Css, /prefers-reduced-motion:\s*reduce/, 'Must support prefers-reduced-motion');
assert.match(v455Css, /@media print/, 'Must include clean print rules');

// SW & ops-sentinel v455 sync
assert.match(swJs, /CACHE_NAME\s*=\s*'cso-candidate-cache-v457'/, 'sw.js must be bumped to cso-candidate-cache-v457');
assert.match(opsJs, /ACTIVE_SW_CACHE_VERSION\s*=\s*'cso-candidate-cache-v457'/, 'ops-sentinel.js must be bumped to cso-candidate-cache-v457');

console.log('PASS: v455 /careers/ 15-item visual polish, stepper, compare drawer, sort, profile match, CSP & SW audit passed.');
