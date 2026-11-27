/**
 * v392: Dynamic OpenGraph & WhatsApp/Telegram Rich Link Preview Verification Suite
 * Validates:
 *  1. /jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr emits a single non-duplicate
 *     set of og:title, og:description, og:image ('https://csodisha.com/assets/img/osstet-2026-result-cover.webp'),
 *     og:image:type='image/webp', og:url, article:published_time, and twitter:card='summary_large_image'.
 *  2. /jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026 (no custom cover) and /guides/<slug>
 *     emit valid absolute https://csodisha.com/... og:image & og:url with zero HTML entity corruption.
 *  3. /jobs/ and /guides/ hub pages have zero duplicate og:title or og:image tags.
 *  4. Admin Studio Alert Generator includes the live '🖼️ Link Card Preview' component.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildJobDetailJsonLdBlocks,
  injectJsonLdAndMetaIntoHtml
} from '../functions/_lib/rich-results-jsonld.js';
import {
  renderPublicGuideArticleHtml,
  renderPublicGuidesHubHtml
} from '../functions/_lib/informative-guides.js';

const jobsShellHtml = fs.readFileSync('jobs/index.html', 'utf8');

function countMeta(html, attr, key) {
  const re = new RegExp(`<meta\\s+[^>]*${attr}="${key}"[^>]*>`, 'gi');
  return (html.match(re) || []).length;
}

// 1. OSSTET Result 2026 detail page
const osstetRow = {
  id: 'jart_osstet_2026',
  slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
  title_en: 'BSE Odisha OSSTET Result 2026 Out: 79.15% Pass, Digitized Certificate & OMR Sheet Link',
  summary_en: 'Check BSE Odisha OSSTET 2026 result, digitized pass certificate from 25 Nov 2026, and OMR sheet download window till 2 Dec 2026.',
  cover_image_url: '/assets/img/osstet-2026-result-cover.webp',
  lifecycle_stage: 'result',
  published_at: '2026-11-26T10:00:00Z',
  updated_at: '2026-11-27T04:00:00Z'
};
const osstetHtml = injectJsonLdAndMetaIntoHtml(jobsShellHtml, {
  title: osstetRow.title_en,
  description: osstetRow.summary_en,
  canonical: `https://csodisha.com/jobs/${osstetRow.slug}`,
  ogImage: 'https://csodisha.com/assets/img/osstet-2026-result-cover.webp',
  ogType: 'article',
  publishedTime: osstetRow.published_at,
  modifiedTime: osstetRow.updated_at,
  origin: 'https://csodisha.com',
  jsonLdBlocks: buildJobDetailJsonLdBlocks(osstetRow, 'https://csodisha.com')
});

assert.equal(countMeta(osstetHtml, 'property', 'og:title'), 1, 'Exactly one og:title on OSSTET detail');
assert.equal(countMeta(osstetHtml, 'property', 'og:description'), 1, 'Exactly one og:description on OSSTET detail');
assert.equal(countMeta(osstetHtml, 'property', 'og:image'), 1, 'Exactly one og:image on OSSTET detail');
assert.equal(countMeta(osstetHtml, 'property', 'og:url'), 1, 'Exactly one og:url on OSSTET detail');
assert.equal(countMeta(osstetHtml, 'name', 'twitter:card'), 1, 'Exactly one twitter:card on OSSTET detail');
assert.ok(osstetHtml.includes('<meta property="og:image" content="https://csodisha.com/assets/img/osstet-2026-result-cover.webp">'), 'Emits exact OSSTET WebP og:image');
assert.ok(osstetHtml.includes('<meta property="og:image:type" content="image/webp">'), 'Emits image/webp MIME type');
assert.ok(osstetHtml.includes('<meta property="og:url" content="https://csodisha.com/jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr">'));
assert.ok(osstetHtml.includes('<meta name="twitter:card" content="summary_large_image">'));
assert.ok(osstetHtml.includes('<meta property="article:published_time" content="2026-11-26T10:00:00Z">'));

// 2. MMU Bhawanipatna (fallback image) & /guides/<slug> detail page
const mmuRow = {
  id: 'jart_mmu',
  slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
  title_en: 'Maa Manikeshwari University (MMU) Bhawanipatna Walk-in: 31 ITEP Teaching Posts & "Quotes"',
  summary_en: '',
  article_body_en: '<p>Maa Manikeshwari University Bhawanipatna invites <b>eligible</b> candidates for 31 ITEP teaching posts on 10 Dec 2026.</p>',
  cover_image_url: '',
  lifecycle_stage: 'notification',
  published_at: '2026-11-26T09:00:00Z',
  updated_at: '2026-11-26T09:00:00Z'
};
const mmuHtml = injectJsonLdAndMetaIntoHtml(jobsShellHtml, {
  title: mmuRow.title_en,
  description: mmuRow.summary_en,
  body: mmuRow.article_body_en,
  canonical: `https://csodisha.com/jobs/${mmuRow.slug}`,
  ogImage: '',
  ogType: 'article',
  publishedTime: mmuRow.published_at,
  modifiedTime: mmuRow.updated_at,
  origin: 'https://csodisha.com',
  jsonLdBlocks: buildJobDetailJsonLdBlocks(mmuRow, 'https://csodisha.com')
});
assert.equal(countMeta(mmuHtml, 'property', 'og:image'), 1);
assert.ok(mmuHtml.includes('<meta property="og:image" content="https://csodisha.com/assets/img/cso-logo-400.webp">'), 'Falls back to verified absolute HTTPS WebP banner');
assert.ok(mmuHtml.includes('&amp; &quot;Quotes&quot;'), 'Escapes & and " cleanly without corruption');
assert.ok(!mmuHtml.includes('<p>Maa Manikeshwari'), 'Strips HTML tags from fallback og:description');

const sampleGuide = {
  id: 'guide_og_test',
  slug: 'ugc-net-december-2026-schedule-nta-guidelines',
  category: 'exam-strategy',
  category_label_en: 'Exam Strategy & Study Handbooks',
  category_label_or: 'ପରୀକ୍ଷା ରଣନୀତି',
  category_icon: '🎯',
  title_en: 'UGC NET December 2026 Exam Schedule & NTA Guidelines',
  title_or: 'UGC NET ଡିସେମ୍ବର ୨୦୨୬',
  summary_en: 'Complete NTA UGC NET Dec 2026 schedule, Paper 1 & 2 pattern, and city slip updates.',
  summary_or: '',
  body_en: '## Schedule\nExam runs in December 2026.',
  body_or: '',
  cover_image: '/assets/img/cso-logo-400.webp',
  takeaways: [],
  photos: [],
  pdfs: [],
  links: [],
  related_cta: {},
  faqs: [],
  read_minutes: 5,
  tags: 'UGC NET',
  scope: 'National',
  is_exam: true,
  status: 'published',
  created_at: '2026-11-26T08:00:00Z',
  updated_at: '2026-11-27T04:00:00Z'
};
const guideDetailHtml = renderPublicGuideArticleHtml(sampleGuide, [], new URL(`https://csodisha.com/guides/${sampleGuide.slug}`));
assert.equal(countMeta(guideDetailHtml, 'property', 'og:title'), 1);
assert.equal(countMeta(guideDetailHtml, 'property', 'og:image'), 1);
assert.ok(guideDetailHtml.includes('https://csodisha.com/assets/img/cso-logo-400.webp'));
assert.ok(guideDetailHtml.includes(`<meta property="og:url" content="https://csodisha.com/guides/${sampleGuide.slug}">`));

// 3. Hub pages have zero duplicate og:title or og:image
assert.ok(countMeta(jobsShellHtml, 'property', 'og:title') <= 1, '/jobs/ hub has <= 1 og:title');
assert.ok(countMeta(jobsShellHtml, 'property', 'og:image') <= 1, '/jobs/ hub has <= 1 og:image');
const guidesHubHtml = renderPublicGuidesHubHtml([sampleGuide], new URL('https://csodisha.com/guides/'));
assert.equal(countMeta(guidesHubHtml, 'property', 'og:title'), 1, '/guides/ hub has exactly 1 og:title');
assert.equal(countMeta(guidesHubHtml, 'property', 'og:image'), 1, '/guides/ hub has exactly 1 og:image');

// 4. Admin Studio live Social Link Card Preview
const jobsStudioJs = fs.readFileSync('admin/jobs-publishing-studio.js', 'utf8');
assert.ok(jobsStudioJs.includes('Link Card Preview') && jobsStudioJs.includes('jph-og-preview__card'), 'Admin Studio Alert Generator includes live Link Card Preview');

console.log('✅ v392 Dynamic OpenGraph & WhatsApp/Telegram Rich Link Preview test suite passed!');
