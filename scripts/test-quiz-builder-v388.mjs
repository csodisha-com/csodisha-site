/**
 * v388: Admin Studio Custom Quiz Editor (quiz_json Builder) Verification Suite
 * Tests:
 *  1. validateAndNormalizeQuizJson: valid extend/override, legacy array, empty string, malformed JSON & schema errors
 *  2. buildArticleMiniQuizPayload:
 *     - mode: "extend" prepends custom MCQs and fills up to 25 with deduplicated auto-extracted & subject-bank MCQs
 *     - mode: "override" serves ONLY custom MCQs (does not append auto-extracted MCQs)
 *     - legacy array shape treated as "extend"
 *     - answer_index / correct_index parity
 *  3. Admin RBAC protection: unauthenticated requests to /api/admin/jobs/articles and /api/admin/guides are rejected (401/403)
 *  4. CSP & UI surface checks on admin/jobs-publishing-studio.js, admin/guides-publishing-studio.js, admin/jobs-publishing-studio.css
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildArticleMiniQuizPayload,
  validateAndNormalizeQuizJson
} from '../functions/_lib/article-mini-quiz.js';
import { requireRole, STAFF_ROLES } from '../functions/_lib/rbac.js';

const sampleJob = {
  id: 'jart_mmu_test',
  slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
  title_en: 'Maa Manikeshwari University (MMU) Bhawanipatna Walk-in: 31 ITEP Teaching Posts',
  title_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଭବାନୀପାଟଣା: ୩୧ ITEP ଶିକ୍ଷକ ପଦବୀ',
  organisation_en: 'Maa Manikeshwari University',
  organisation_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ',
  advt_number: 'Advt. No. 1621/MMU',
  total_vacancies: 31,
  location_district: 'Kalahandi',
  last_date: '2026-12-05',
  qualification_summary: 'PG + M.Ed / Ph.D / NET as per NCTE ITEP norms',
  official_website_url: 'https://kalahandiuniversity.ac.in/',
  lifecycle_stage: 'notification'
};

const customQ1 = {
  id: 'custom_1',
  tag: 'Editorial Custom',
  question_en: 'What is the full form of ITEP offered at Maa Manikeshwari University?',
  question_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ITEP ର ସମ୍ପୂର୍ଣ୍ଣ ରୂପ କ’ଣ?',
  options_en: [
    'Integrated Teacher Education Programme',
    'Indian Technical Education Portal',
    'Internal Teaching Eligibility Policy',
    'Institute of Teacher Evaluation Process'
  ],
  options_or: [
    'Integrated Teacher Education Programme',
    'Indian Technical Education Portal',
    'Internal Teaching Eligibility Policy',
    'Institute of Teacher Evaluation Process'
  ],
  answer_index: 0,
  explanation_en: 'ITEP is the 4-year Integrated Teacher Education Programme introduced under NEP 2020.',
  explanation_or: 'ITEP ହେଉଛି NEP ୨୦୨୦ ଅଧୀନରେ ୪ ବର୍ଷିଆ ସମନ୍ୱିତ ଶିକ୍ଷକ ଶିକ୍ଷା କାର୍ଯ୍ୟକ୍ରମ।'
};

const customQ2 = {
  id: 'custom_2',
  tag: 'Editorial Custom',
  question_en: 'Which statutory body regulates ITEP curriculum norms in India?',
  question_or: 'ଭାରତରେ ITEP ପାଠ୍ୟକ୍ରମ ନିୟମ କେଉଁ ସଂସ୍ଥା ଦ୍ୱାରା ପରିଚାଳିତ ହୁଏ?',
  options_en: ['AICTE', 'NCTE', 'BCI', 'NMC'],
  options_or: ['AICTE', 'NCTE', 'BCI', 'NMC'],
  answer_index: 1,
  explanation_en: 'National Council for Teacher Education (NCTE) regulates ITEP norms.',
  explanation_or: 'NCTE ଭାରତରେ ITEP ନିୟମ ପରିଚାଳନା କରେ।'
};

// 1. Validation tests
assert.equal(validateAndNormalizeQuizJson(''), '');
assert.equal(validateAndNormalizeQuizJson('   '), '');
assert.equal(validateAndNormalizeQuizJson(null), '');
assert.equal(validateAndNormalizeQuizJson(JSON.stringify({ mode: 'extend', questions: [] })), '');

const normExtend = validateAndNormalizeQuizJson(JSON.stringify({ mode: 'extend', questions: [customQ1] }));
const parsedExtend = JSON.parse(normExtend);
assert.equal(parsedExtend.mode, 'extend');
assert.equal(parsedExtend.questions.length, 1);
assert.equal(parsedExtend.questions[0].answer_index, 0);
assert.equal(parsedExtend.questions[0].correct_index, 0);

const normLegacy = validateAndNormalizeQuizJson(JSON.stringify([customQ1, customQ2]));
const parsedLegacy = JSON.parse(normLegacy);
assert.equal(parsedLegacy.mode, 'extend');
assert.equal(parsedLegacy.questions.length, 2);

const normOverride = validateAndNormalizeQuizJson(JSON.stringify({ mode: 'override', questions: [customQ1, customQ2] }));
const parsedOverride = JSON.parse(normOverride);
assert.equal(parsedOverride.mode, 'override');
assert.equal(parsedOverride.questions.length, 2);

// Malformed JSON rejected with validationError (HTTP 422/400)
assert.throws(
  () => validateAndNormalizeQuizJson('{ invalid json'),
  (err) => err && (err.status === 422 || err.status === 400) && err.code === 'VALIDATION_ERROR'
);

// Invalid mode rejected
assert.throws(
  () => validateAndNormalizeQuizJson(JSON.stringify({ mode: 'replace_all', questions: [customQ1] })),
  (err) => err && (err.status === 422 || err.status === 400) && err.code === 'VALIDATION_ERROR'
);

// Out-of-range answer_index rejected
assert.throws(
  () => validateAndNormalizeQuizJson(JSON.stringify({ mode: 'extend', questions: [{ ...customQ1, answer_index: 5 }] })),
  (err) => err && (err.status === 422 || err.status === 400) && err.code === 'VALIDATION_ERROR'
);

// Missing 4 options rejected
assert.throws(
  () => validateAndNormalizeQuizJson(JSON.stringify({ mode: 'extend', questions: [{ ...customQ1, options_en: ['Only A', 'Only B'] }] })),
  (err) => err && (err.status === 422 || err.status === 400) && err.code === 'VALIDATION_ERROR'
);

// 2. Extend mode: custom MCQs first, auto-extracted fills up to 25
const extendPayload = buildArticleMiniQuizPayload({ ...sampleJob, quiz_json: normExtend }, 'job');
assert.equal(extendPayload.ok, true);
assert.equal(extendPayload.quiz_mode, 'extend');
assert.equal(extendPayload.custom_count, 1);
assert.equal(extendPayload.questions[0].id, 'custom_1');
assert.equal(extendPayload.questions[0].answer_index, 0);
assert.equal(extendPayload.questions[0].correct_index, 0);
assert.ok(extendPayload.questions.length >= 20 && extendPayload.questions.length <= 25, 'Extend mode should fill up to 25 MCQs');

// 3. Override mode: serves ONLY custom MCQs
const overridePayload = buildArticleMiniQuizPayload({ ...sampleJob, quiz_json: normOverride }, 'job');
assert.equal(overridePayload.ok, true);
assert.equal(overridePayload.quiz_mode, 'override');
assert.equal(overridePayload.custom_count, 2);
assert.equal(overridePayload.total, 2);
assert.equal(overridePayload.questions.length, 2);
assert.deepEqual(overridePayload.questions.map((q) => q.id), ['custom_1', 'custom_2']);

// 4. Legacy array shape behaves like extend
const legacyPayload = buildArticleMiniQuizPayload({ ...sampleJob, quiz_json: JSON.stringify([customQ1]) }, 'job');
assert.equal(legacyPayload.quiz_mode, 'extend');
assert.equal(legacyPayload.questions[0].id, 'custom_1');
assert.ok(legacyPayload.questions.length >= 20);

// 5. Admin RBAC protection for unauthenticated requests
const mockEnv = {
  DB: {
    prepare() {
      return {
        bind() { return this; },
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true })
      };
    }
  }
};
for (const path of ['/api/admin/jobs/articles', '/api/admin/guides']) {
  const req = new Request('https://csodisha.com' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title_en: 'Unauth Test', quiz_json: normOverride })
  });
  let status = 200;
  try {
    await requireRole(req, mockEnv, STAFF_ROLES);
  } catch (err) {
    status = err && err.status ? err.status : 500;
  }
  assert.ok(status === 401 || status === 403, `Expected 401/403 for unauthenticated ${path}, got ${status}`);
}
const adminRouterSrc = fs.readFileSync('functions/api/admin/_router.js', 'utf8');
assert.ok(adminRouterSrc.includes('requireRole('), 'Admin router enforces RBAC via requireRole');

// 6. UI & Strict CSP checks
const jobsStudioSrc = fs.readFileSync('admin/jobs-publishing-studio.js', 'utf8');
const guidesStudioSrc = fs.readFileSync('admin/guides-publishing-studio.js', 'utf8');
const jobsStudioCss = fs.readFileSync('admin/jobs-publishing-studio.css', 'utf8');

assert.ok(jobsStudioSrc.includes('window.CSOQuizBuilder'), 'CSOQuizBuilder exported in jobs-publishing-studio.js');
assert.ok(jobsStudioSrc.includes('Practice Quiz Editor (quiz_json Builder)'), 'Quiz Builder accordion mounted in Jobs Studio');
assert.ok(guidesStudioSrc.includes('CSOQuizBuilder.buildQuizEditorAccordion'), 'Quiz Builder accordion mounted in Guides Studio');
assert.ok(guidesStudioSrc.includes('quiz_json: guideQuizJson'), 'Guides Studio persists quiz_json');
assert.ok(jobsStudioCss.includes('.jph-quiz-details'), 'Quiz Builder CSS rules present');
assert.ok(!/\.innerHTML\s*=/.test(jobsStudioSrc), 'No unsafe DOM markup injection in jobs-publishing-studio.js');
assert.ok(!/\.innerHTML\s*=/.test(guidesStudioSrc), 'No unsafe DOM markup injection in guides-publishing-studio.js');

console.log('✅ v388 Admin Studio Custom Quiz Editor (quiz_json Builder) test suite passed!');
