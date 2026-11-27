import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildArticleMiniQuizPayload, serializeQuizJson } from '../functions/_lib/article-mini-quiz.js';
import { renderPublicGuideArticleHtml, renderPublicGuidesHubHtml, formatGuideRow } from '../functions/_lib/informative-guides.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  PASS  ${name}`);
}

console.log('\n=== v387 Interactive 25-MCQ "Test Yourself" Practice Quiz Verification ===\n');

check('1. MMU Bhawanipatna job emits grounded bilingual 25-MCQ set with exact D1 facts (31 posts, Kalahandi, MMU, 2026-12-10)', () => {
  const mmu = {
    slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
    title_en: 'Maa Manikeshwari University (MMU) Bhawanipatna Walk-in: 31 ITEP Teaching Posts',
    title_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ (MMU) ଭବାନୀପାଟଣା: ୩୧ଟି ITEP ଅଧ୍ୟାପକ ପଦବୀ',
    organisation_en: 'MMU',
    advt_number: '4334/mmu (Dated 26/11/2026)',
    total_vacancies: 31,
    location_district: 'Kalahandi',
    last_date: '2026-12-10',
    qualification_summary: '55% PG + B.Ed./M.Ed. + NET/SLET/Ph.D.',
    salary_pay_scale: '₹35,000 – ₹50,000 / month (Consolidated)',
    official_website_url: 'https://kalahandiuniversity.ac.in',
    lifecycle_stage: 'notification'
  };
  const payload = buildArticleMiniQuizPayload(mmu, 'job');
  assert.match(String(payload.version), /^v38[78]$/);
  assert.equal(payload.questions.length, 25, 'Should assemble 25 distinct bilingual MCQs');
  const vacQ = payload.questions.find((q) => q.id.endsWith('_f_vac'));
  assert.ok(vacQ && vacQ.options_en[vacQ.correct_index] === '31 Posts', 'Vacancy MCQ must match exact D1 count 31');
  const distQ = payload.questions.find((q) => q.id.endsWith('_f_dist'));
  assert.ok(distQ && distQ.options_en[distQ.correct_index] === 'Kalahandi', 'District MCQ must match Kalahandi');
  for (const q of payload.questions) {
    assert.ok(q.question_en && q.question_or && q.options_en.length === 4 && q.options_or.length === 4 && q.explanation_en && q.explanation_or);
  }
});

check('2. OSSTET Result 2026 & CBSE CTET 22nd Edition emit grounded 25-MCQ sets with exact pass % / authority facts', () => {
  const osstet = {
    slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
    title_en: 'BSE Odisha OSSTET Result 2026 Out (79.15% Pass): Direct Link, Certificate & OMR Sheet',
    summary_en: 'BSE Odisha declared OSSTET-2026 Result with 79.15% overall pass.',
    organisation_en: 'BSE Odisha',
    last_date: '2026-12-02',
    lifecycle_stage: 'result',
    result_url: 'https://results.indiaresults.com/or/bse-orissa/osstet0RESexam-result-2026/mquery.htm'
  };
  const pOsstet = buildArticleMiniQuizPayload(osstet, 'job');
  assert.equal(pOsstet.questions.length, 25);
  const passQ = pOsstet.questions.find((q) => q.id.endsWith('_f_pass'));
  assert.ok(passQ && passQ.options_en[passQ.correct_index] === '79.15%', 'OSSTET pass % MCQ must match 79.15%');

  const ctet = {
    slug: 'cbse-ctet-december-2026-22nd-edition-exam-dates-admit-card-notice',
    title_en: 'CTET December 2026 (22nd Edition) Exam Dates, City Slip & Admit Card Schedule',
    organisation_en: 'CBSE',
    advt_number: 'F. No. CBSE/CTET/ 2026 (Dated 14.09.2026)',
    last_date: '2026-12-13',
    lifecycle_stage: 'admit_card',
    official_website_url: 'https://ctet.nic.in'
  };
  const pCtet = buildArticleMiniQuizPayload(ctet, 'job');
  assert.equal(pCtet.questions.length, 25);
  const orgQ = pCtet.questions.find((q) => q.id.endsWith('_f_org'));
  assert.ok(orgQ && orgQ.options_en[orgQ.correct_index] === 'CBSE');
});

check('3. /guides/<slug> SSR embeds #cso-article-quiz-root + #cso-article-quiz-data while /guides/ hub does NOT', () => {
  const guide = formatGuideRow({
    id: 'guide_ugc_net_dec_2026_schedule_nta',
    slug: 'ugc-net-december-2026-schedule-nta-guidelines',
    category: 'exam-strategy',
    title_en: 'UGC NET December 2026: Complete Exam Schedule, Subject-Wise Dates & Key NTA Guidelines',
    summary_en: 'Complete NTA UGC NET Dec 2026 CBT schedule.',
    links_json: JSON.stringify([{ label_en: 'NTA', url: 'https://ugcnet.nta.nic.in/', is_official: true }]),
    status: 'published'
  });
  const detailHtml = renderPublicGuideArticleHtml(guide, [], new URL('https://csodisha.com/guides/ugc-net-december-2026-schedule-nta-guidelines'));
  assert.ok(detailHtml.includes('id="cso-article-quiz-root"'));
  assert.ok(detailHtml.includes('id="cso-article-quiz-data"'));
  assert.ok(detailHtml.includes('/assets/js/article-mini-quiz.js'));
  const hubHtml = renderPublicGuidesHubHtml([], new URL('https://csodisha.com/guides/'));
  assert.ok(!hubHtml.includes('id="cso-article-quiz-root"'), '/guides/ hub must not mount article quiz');
  assert.ok(!serializeQuizJson({ x: '</script>' }).includes('</script>'));
});

check('4. assets/js/article-mini-quiz.js is strict CSP-compliant (zero innerHTML, zero inline style/on*)', () => {
  const js = fs.readFileSync('assets/js/article-mini-quiz.js', 'utf8');
  assert.ok(!js.includes('innerHTML') && !js.includes('outerHTML') && !js.includes('insertAdjacentHTML'));
  assert.ok(!js.includes('.style.'));
  assert.ok(js.includes('5-Question Quick Drill') && js.includes('Retry / Shuffle'));
});

console.log(`\n=== v387 Article Mini-Quiz Results: ${passed} passed, 0 failed ===\n`);
