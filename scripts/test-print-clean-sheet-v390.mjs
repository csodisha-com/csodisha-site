/**
 * v390: Public Article Print / Save-as-PDF Clean Sheet (@media print) Verification Suite
 * Validates:
 *  1. assets/style.css contains the @media print clean-sheet block hiding navbar, footer,
 *     quiz containers (#cso-article-quiz-root, .cso-article-quiz), action bars, and formatting
 *     single-column #0f172a-on-#ffffff print output with @page margins, break-inside: avoid,
 *     visible external URLs (attr(href)), and print masthead/footer.
 *  2. /jobs/<slug> (assets/js/jobs-portal.js) and /guides/<slug> (renderPublicGuideDetailHtml)
 *     render the bilingual '🖨️ Print / Save Clean Guide' / '🖨️ ପ୍ରିଣ୍ଟ / PDF ସେଭ୍ କରନ୍ତୁ' button
 *     with zero inline onclick/style attributes and bind window.print() via addEventListener.
 *  3. /jobs/ (jobs/index.html) and /guides/ (renderPublicGuidesHubHtml) hub list pages do NOT
 *     render the detail print button.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  renderPublicGuideArticleHtml,
  renderPublicGuidesHubHtml
} from '../functions/_lib/informative-guides.js';

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const jobsPortalJs = fs.readFileSync('assets/js/jobs-portal.js', 'utf8');
const guidesPortalJs = fs.readFileSync('assets/js/guides-portal.js', 'utf8');
const jobsHubHtml = fs.readFileSync('jobs/index.html', 'utf8');

// 1. @media print clean-sheet stylesheet checks
const printIdx = styleCss.indexOf('/* ===== v390: Public Article Print / Save-as-PDF Clean Sheet');
assert.ok(printIdx !== -1, 'v390 @media print block exists in assets/style.css');
const printSection = styleCss.slice(printIdx);

assert.ok(printSection.includes('@media print'), 'Contains @media print block');
assert.ok(printSection.includes('@page') && printSection.includes('14mm 12mm'), 'Sets @page { margin: 14mm 12mm }');
assert.ok(printSection.includes('rgb(15 23 42)') && printSection.includes('rgb(255 255 255)') && printSection.includes('rgb(203 213 225)'), 'Uses crisp #0f172a (rgb 15 23 42) on #ffffff (rgb 255 255 255) with #cbd5e1 (rgb 203 213 225) borders');
assert.ok(printSection.includes('.cso-header') && printSection.includes('#cso-main-navbar'), 'Hides top navbar in print');
assert.ok(printSection.includes('footer.site-footer') && printSection.includes('.cso-site-footer'), 'Hides global site footer in print');
assert.ok(printSection.includes('#cso-article-quiz-root') && printSection.includes('.cso-article-quiz'), 'Hides 25-MCQ quiz containers in print');
assert.ok(printSection.includes('.cso-ics-btn') && printSection.includes('.cso-print-btn'), 'Hides calendar & print trigger buttons in print');
assert.ok(printSection.includes('break-inside: avoid'), 'Applies break-inside: avoid to rows/figures/cards');
assert.ok(printSection.includes('attr(href)'), 'Prints external official URLs via attr(href)');
assert.ok(printSection.includes('.cso-print-masthead') && printSection.includes('.cso-print-footer'), 'Reveals print-only masthead and attribution footer');

// 2. /jobs/<slug> detail view bilingual Print button + CSP compliance
assert.ok(jobsPortalJs.includes('Print / Save Clean Guide'), 'jobs-portal.js includes EN Print button label');
assert.ok(jobsPortalJs.includes('ପ୍ରିଣ୍ଟ / PDF ସେଭ୍ କରନ୍ତୁ'), 'jobs-portal.js includes Odia Print button label');
assert.ok(jobsPortalJs.includes('data-cso-print-btn'), 'jobs-portal.js sets data-cso-print-btn');
assert.ok(jobsPortalJs.includes('window.print()'), 'jobs-portal.js binds window.print() via addEventListener');
assert.ok(jobsPortalJs.includes('cso-print-masthead'), 'jobs-portal.js mounts print-only masthead');
assert.ok(!jobsHubHtml.includes('data-cso-print-btn'), '/jobs/ hub HTML does NOT render detail print button');

// 3. /guides/<slug> SSR detail page vs /guides/ hub page
const sampleGuide = {
  id: 'guide_print_test',
  slug: 'ctet-february-2026-information-bulletin-syllabus-guide',
  category: 'exam-strategy',
  category_label_en: 'Exam Strategy & Study Handbooks',
  category_label_or: 'ପରୀକ୍ଷା ରଣନୀତି ଓ ଅଧ୍ୟୟନ ପୁସ୍ତିକା',
  category_icon: '🎯',
  title_en: 'CBSE CTET 2026 Syllabus & Exam Guide',
  title_or: 'CBSE CTET ୨୦୨୬ ସିଲାବସ୍ ଓ ପରୀକ୍ଷା ମାର୍ଗଦର୍ଶିକା',
  summary_en: 'Complete Paper I & II syllabus and schedule.',
  summary_or: 'ସମ୍ପୂର୍ଣ୍ଣ ପେପର-୧ ଓ ପେପର-୨ ସିଲାବସ୍।',
  body_en: '## Exam Schedule\n| Event | Date |\n|---|---|\n| Exam Date | 12 Dec 2026 |',
  body_or: '## ପରୀକ୍ଷା ସମୟସୂଚୀ\n| ଘଟଣା | ତାରିଖ |\n|---|---|\n| ପରୀକ୍ଷା ତାରିଖ | 12 Dec 2026 |',
  takeaways: [],
  photos: [],
  pdfs: [],
  links: [],
  related_cta: {},
  faqs: [],
  read_minutes: 6,
  tags: 'CTET, Teaching',
  scope: 'National',
  is_exam: true,
  status: 'published',
  updated_at: '2026-11-27T00:00:00Z'
};

const detailHtml = renderPublicGuideArticleHtml(sampleGuide, [], new URL('https://csodisha.com/guides/ctet-february-2026-information-bulletin-syllabus-guide'));
assert.ok(detailHtml.includes('data-cso-print-btn="1"'), '/guides/<slug> detail renders Print button');
assert.ok(detailHtml.includes('Print / Save Clean Guide'), '/guides/<slug> detail renders EN Print label');
assert.ok(detailHtml.includes('ପ୍ରିଣ୍ଟ / PDF ସେଭ୍ କରନ୍ତୁ'), '/guides/<slug> detail renders Odia Print label');
assert.ok(detailHtml.includes('cso-print-masthead') && detailHtml.includes('Common Sense Odisha (csodisha.com)'), '/guides/<slug> renders print-only masthead');
assert.ok(!/onclick\s*=|style\s*=/i.test(detailHtml.match(/<button[^>]*data-cso-print-btn[^>]*>[\s\S]*?<\/button>/)[0]), 'Print button has zero inline onclick or style attributes');
assert.ok(guidesPortalJs.includes('data-cso-print-btn') && guidesPortalJs.includes('window.print()'), 'guides-portal.js binds [data-cso-print-btn] to window.print()');

const hubHtml = renderPublicGuidesHubHtml([sampleGuide], new URL('https://csodisha.com/guides/'));
assert.ok(!hubHtml.includes('data-cso-print-btn'), '/guides/ hub page does NOT render detail Print button');

console.log('✅ v390 Public Article Print / Save-as-PDF Clean Sheet (@media print) test suite passed!');
