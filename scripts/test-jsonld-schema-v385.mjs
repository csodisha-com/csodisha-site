import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildJobDetailJsonLdBlocks,
  buildGuideDetailJsonLdBlocks,
  injectJsonLdAndMetaIntoHtml,
  serializeJsonLd,
  isVacancyJobPosting
} from '../functions/_lib/rich-results-jsonld.js';
import { renderPublicGuidesHubHtml, renderPublicGuideArticleHtml, formatGuideRow } from '../functions/_lib/informative-guides.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  PASS  ${name}`);
}

console.log('\n=== v385 Google Rich Results JSON-LD Schema Verification ===\n');

check('1. /jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026 emits valid JobPosting + NewsArticle (with PDF) + BreadcrumbList', () => {
  const mmu = {
    slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
    title_en: 'Maa Manikeshwari University (MMU) Bhawanipatna Walk-in: 31 ITEP Teaching Posts',
    summary_en: 'Walk-in interview on 10 Dec 2026 for 31 ITEP teaching posts at MMU Bhawanipatna.',
    organisation_en: 'MMU',
    advt_number: '4334/mmu (Dated 26/11/2026)',
    total_vacancies: 31,
    location_district: 'Kalahandi',
    qualification_summary: '55% PG + B.Ed./M.Ed. + NET/SLET/Ph.D.',
    salary_pay_scale: '₹35,000 – ₹50,000 / month (Consolidated)',
    selection_mode: 'Walk-in Interview (10 Dec 2026)',
    last_date: '2026-12-10',
    published_at: '2026-11-27 01:49:41',
    updated_at: '2026-11-27 02:14:50',
    lifecycle_stage: 'notification',
    official_website_url: 'https://kalahandiuniversity.ac.in',
    official_apply_url: 'https://kalahandiuniversity.ac.in',
    notification_pdf_url: 'https://media.kalahandiuniversity.ac.in/storage/notices/261126/162125.pdf',
    cover_image_url: '/assets/img/icon-512.png'
  };
  assert.equal(isVacancyJobPosting(mmu), true);
  const blocks = buildJobDetailJsonLdBlocks(mmu, 'https://csodisha.com');
  const jp = blocks.find((b) => b['@type'] === 'JobPosting');
  const na = blocks.find((b) => b['@type'] === 'NewsArticle');
  const bc = blocks.find((b) => b['@type'] === 'BreadcrumbList');
  assert.ok(jp, 'Must emit JobPosting');
  assert.equal(jp.jobLocation.address.addressCountry, 'IN');
  assert.equal(jp.jobLocation.address.addressRegion, 'Odisha');
  assert.equal(jp.jobLocation.address.addressLocality, 'Kalahandi');
  assert.equal(jp.hiringOrganization.name, 'MMU');
  assert.equal(jp.hiringOrganization.sameAs, 'https://kalahandiuniversity.ac.in');
  assert.ok(jp.datePosted.startsWith('2026-11-27T'));
  assert.ok(jp.validThrough.startsWith('2026-12-10T23:59:59+05:30'));
  assert.equal(jp.url, 'https://csodisha.com/jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026');
  assert.ok(na, 'Must emit companion NewsArticle');
  assert.equal(na.isBasedOn, 'https://media.kalahandiuniversity.ac.in/storage/notices/261126/162125.pdf');
  assert.equal(na.citation, 'https://media.kalahandiuniversity.ac.in/storage/notices/261126/162125.pdf');
  assert.ok(bc && bc.itemListElement.length === 3, 'Must emit BreadcrumbList');
});

check('2. OSSTET Result 2026 & CBSE CTET 22nd Edition emit NewsArticle + BreadcrumbList and NEVER JobPosting', () => {
  const osstet = {
    slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
    title_en: 'BSE Odisha OSSTET Result 2026 Out (79.15% Pass): Direct Link, Certificate & OMR Sheet',
    summary_en: 'BSE Odisha declared OSSTET-2026 Result with 79.15% pass rate.',
    organisation_en: 'BSE Odisha',
    lifecycle_stage: 'result',
    result_url: 'https://results.indiaresults.com/or/bse-orissa/osstet0RESexam-result-2026/mquery.htm',
    cover_image_url: '/assets/img/osstet-2026-result-cover.webp',
    published_at: '2026-11-27 02:36:00'
  };
  const ctet = {
    slug: 'cbse-ctet-december-2026-22nd-edition-exam-dates-admit-card-notice',
    title_en: 'CTET December 2026 (22nd Edition) Exam Dates, City Slip & Admit Card Schedule',
    summary_en: 'CBSE CTET 22nd Edition exam dates on 12 & 13 Dec 2026.',
    organisation_en: 'CBSE',
    lifecycle_stage: 'admit_card',
    official_website_url: 'https://ctet.nic.in',
    published_at: '2026-11-27 01:51:21'
  };
  for (const row of [osstet, ctet]) {
    assert.equal(isVacancyJobPosting(row), false);
    const blocks = buildJobDetailJsonLdBlocks(row, 'https://csodisha.com');
    assert.equal(blocks.some((b) => b['@type'] === 'JobPosting'), false, `${row.slug} must NOT emit JobPosting`);
    assert.ok(blocks.some((b) => b['@type'] === 'NewsArticle'), `${row.slug} must emit NewsArticle`);
    assert.ok(blocks.some((b) => b['@type'] === 'BreadcrumbList'), `${row.slug} must emit BreadcrumbList`);
  }
});

check('3. /guides/ugc-net-december-2026-schedule-nta-guidelines emits NewsArticle + BreadcrumbList (no JobPosting)', () => {
  const guide = formatGuideRow({
    id: 'guide_ugc_net_dec_2026_schedule_nta',
    slug: 'ugc-net-december-2026-schedule-nta-guidelines',
    category: 'exam-strategy',
    title_en: 'UGC NET December 2026: Complete Exam Schedule, Subject-Wise Dates & Key NTA Guidelines',
    summary_en: 'Complete NTA UGC NET Dec 2026 CBT schedule and guidelines.',
    links_json: JSON.stringify([{ label_en: 'NTA Portal', url: 'https://ugcnet.nta.nic.in/', is_official: true }]),
    cover_image: '/assets/img/icon-512.png',
    status: 'published',
    created_at: '2026-11-27 01:11:20',
    updated_at: '2026-11-27 01:11:20'
  });
  const html = renderPublicGuideArticleHtml(guide, [], new URL('https://csodisha.com/guides/ugc-net-december-2026-schedule-nta-guidelines'));
  assert.ok(html.includes('"@type":"NewsArticle"'));
  assert.ok(html.includes('"@type":"BreadcrumbList"'));
  assert.ok(!html.includes('"@type":"JobPosting"'));
  const blocks = buildGuideDetailJsonLdBlocks(guide, 'https://csodisha.com');
  assert.equal(blocks[0].isBasedOn, 'https://ugcnet.nta.nic.in/');
});

check('4. /jobs/ and /guides/ hub list pages NEVER emit JobPosting & JSON-LD escapes </script>', () => {
  const jobsHubHtml = fs.readFileSync('jobs/index.html', 'utf8');
  assert.ok(!jobsHubHtml.includes('JobPosting'), '/jobs/ hub must not emit JobPosting');
  const guidesHubHtml = renderPublicGuidesHubHtml([], new URL('https://csodisha.com/guides/'));
  assert.ok(!guidesHubHtml.includes('JobPosting'), '/guides/ hub must not emit JobPosting');
  const serialized = serializeJsonLd({ title: '</script><img src=x>' });
  assert.ok(!serialized.includes('</script>') && serialized.includes('\\u003c/script>'));
  const injected = injectJsonLdAndMetaIntoHtml('<html><head><title>X</title></head><body></body></html>', {
    title: 'Test',
    description: 'Desc',
    canonical: 'https://csodisha.com/jobs/test',
    jsonLdBlocks: [{ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: 'Test' }]
  });
  assert.ok(injected.includes('<script type="application/ld+json">'));
});

console.log(`\n=== v385 JSON-LD Schema Results: ${passed} passed, 0 failed ===\n`);
