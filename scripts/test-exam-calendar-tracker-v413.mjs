#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v413 Interactive Odisha Exam Calendar & Admit Card Tracker Audit ===');

const ectSrc = read('assets/js/exam-calendar-tracker.js');
const examsHtml = read('exams/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(ectSrc, sandbox);
const ECT = sandbox.window.CSOExamCalendarTracker;
assert.ok(ECT, 'window.CSOExamCalendarTracker must be exported');
assert.equal(ECT.version, 'v413');
assert.equal(ECT.PREFS_KEY, 'cso_exam_calendar_prefs_v1');

// 1. Verify curated schedule & D1 merge produce valid month buckets & 4 milestones
assert.equal(ECT.CURATED_SCHEDULE.length, 7, 'Must include all 7 verified 2026-27 exam milestones');
for (const ex of ECT.CURATED_SCHEDULE) {
  assert.ok(ex.title_en && ex.title_or, `${ex.id} must have bilingual EN + Odia title`);
  assert.ok(ex.notification_date && ex.last_date_apply && ex.admit_card_window && ex.exam_date_label, `${ex.id} must define all 4 milestones`);
  assert.ok(['2026-11', '2026-12', '2027-01', '2027-02-03'].includes(ex.month_bucket), `${ex.id} must map to a valid month bucket`);
}

const merged = ECT.mergeD1Items(ECT.CURATED_SCHEDULE, [
  { slug: 'ossc-new-exam-2027', title: 'OSSC Junior Clerk Exam 2027 Admit Card', deadline_iso: '2027-02-18', published_at: '2026-11-26', url: '/jobs/ossc-new-exam-2027' }
]);
assert.equal(merged.length, 8, 'mergeD1Items must append unseen D1 exam items');
assert.equal(merged[7].month_bucket, '2027-02-03');
assert.equal(merged[7].board, 'ossc');
assert.equal(merged[7].stage, 'admit_card_live');

// 2. Verify deterministic filtering by month, board, stage & keyword
const decExams = ECT.filterSchedule(ECT.CURATED_SCHEDULE, { month: '2026-12' });
assert.equal(decExams.length, 3, 'December 2026 must contain CTET, UGC NET & Odisha Police SI');

const oprbExams = ECT.filterSchedule(ECT.CURATED_SCHEDULE, { board: 'oprb' });
assert.equal(oprbExams.length, 1);
assert.ok(oprbExams[0].title_en.includes('Odisha Police SI'));

const admitLive = ECT.filterSchedule(ECT.CURATED_SCHEDULE, { stage: 'admit_card_live' });
assert.ok(admitLive.length >= 3, 'Must filter Admit Card / City Slip Live exams');

const kwSearch = ECT.filterSchedule(ECT.CURATED_SCHEDULE, { query: '4273' });
assert.equal(kwSearch.length, 1);
assert.equal(kwSearch[0].board, 'ossc');

const cd = ECT.computeExamCountdown('2026-12-12', new Date('2026-11-27T08:00:00Z'));
assert.equal(cd, 15, 'IST countdown from 2026-11-27 to 2026-12-12 must be 15 days');

// 3. Markup, Strict CSP, 4-Theme CSS & v413 Cache Sync
assert.match(examsHtml, /id="cso-exam-calendar-tracker-root"/, 'exams/index.html must mount #cso-exam-calendar-tracker-root');
assert.match(examsHtml, /\/assets\/js\/exam-calendar-tracker\.js\?v=20261127v414/, 'exams/index.html must load exam-calendar-tracker.js?v=20261127v414');
assert.ok(!/\sstyle="/i.test(examsHtml), 'exams/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(examsHtml), 'exams/index.html must have zero inline on* handlers');
assert.ok(!ectSrc.includes('.innerHTML') && !ectSrc.includes('.outerHTML') && !ectSrc.includes('insertAdjacentHTML') && !ectSrc.includes('.style.'), 'exam-calendar-tracker.js must obey strict CSP');

const v413CssIdx = styleCss.indexOf('v413: Interactive Odisha Exam Calendar & Admit Card Tracker');
assert.ok(v413CssIdx !== -1, 'assets/style.css must contain v413 Exam Calendar CSS block');
const v413Css = styleCss.slice(v413CssIdx);
assert.ok(v413Css.includes('.cso-ect-card') && v413Css.includes('var(--cso-surface-elevated)') && v413Css.includes('var(--cso-ink)'), 'v413 CSS must use semantic --cso-* tokens');
assert.ok(v413Css.includes('min-height: 44px'), 'v413 CSS must enforce >=44px touch targets');
assert.ok(v413Css.includes('prefers-reduced-motion: reduce'), 'v413 CSS must respect prefers-reduced-motion');
assert.ok(v413Css.includes('@media print'), 'v413 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v413Css), 'v413 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v414'"), 'sw.js CACHE_NAME must be v413');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v414'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v413');

console.log('✅ v413 Interactive Odisha Exam Calendar & Admit Card Tracker Audit PASSED');
