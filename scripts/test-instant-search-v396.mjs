/**
 * v396: Public Instant Search & Filter Overlay (Ctrl+K / /) Verification Suite
 * Validates:
 *  1. GET /api/public/search-index returns HTTP 200 JSON with normalized records spanning
 *     jobs, exams, results, guides, and hubs (MMU Bhawanipatna, OSSTET Result 2026, CBSE CTET, UGC NET)
 *  2. Multi-token bilingual ranking (EN + ଓଡ଼ିଆ), district matching (Kalahandi / Bhawanipatna),
 *     and category filtering (job_alert, exam_update, result, guide, hub)
 *  3. Top navbar / shared-header mounts the search trigger and instant-search-overlay.js has
 *     zero inline style or unsafe DOM markup injection
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { handlePublicSearchIndexApi } from '../functions/_lib/public-search-index.js';

const mockDb = {
  prepare(sql) {
    return {
      bind() { return this; },
      all: async () => {
        if (/FROM\s+job_articles/i.test(sql)) {
          return {
            results: [
              {
                slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
                title_en: 'Maa Manikeshwari University (MMU) Bhawanipatna Walk-in: 31 ITEP Teaching Posts',
                title_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଭବାନୀପାଟଣା: ୩୧ ITEP ଶିକ୍ଷକ ପଦବୀ',
                summary_en: 'Walk-in interview on 10 Dec 2026 in Kalahandi district.',
                organisation_en: 'Maa Manikeshwari University',
                location_district: 'Kalahandi',
                last_date: '2026-12-10',
                lifecycle_stage: 'notification',
                is_published: 1,
                updated_at: '2026-11-26T12:00:00Z'
              },
              {
                slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
                title_en: 'BSE Odisha OSSTET Result 2026 Out (79.15% Pass)',
                title_or: 'BSE ଓଡ଼ିଶା OSSTET ଫଳାଫଳ ୨୦୨୬',
                summary_en: 'Digitized certificate & OMR sheet download.',
                organisation_en: 'BSE Odisha',
                location_district: 'All Odisha',
                last_date: '2026-12-02',
                lifecycle_stage: 'result',
                is_published: 1,
                updated_at: '2026-11-27T02:36:18Z'
              },
              {
                slug: 'cbse-ctet-december-2026-22nd-edition-exam-dates-admit-card-notice',
                title_en: 'CBSE CTET December 2026 (22nd Edition) Exam Dates & Admit Card',
                title_or: 'CBSE CTET ଡିସେମ୍ବର ୨୦୨୬ ପରୀକ୍ଷା ତାରିଖ',
                summary_en: 'Exam scheduled for Dec 12-13, 2026.',
                organisation_en: 'CBSE',
                location_district: 'All India',
                exam_date: '2026-12-12',
                lifecycle_stage: 'admit_card',
                is_published: 1,
                updated_at: '2026-11-27T01:00:00Z'
              }
            ]
          };
        }
        if (/FROM\s+informative_guides/i.test(sql)) {
          return {
            results: [
              {
                slug: 'ugc-net-december-2026-schedule-nta-guidelines',
                category: 'exam-strategy',
                title_en: 'UGC NET December 2026 Exam Schedule & NTA Guidelines',
                title_or: 'UGC NET ଡିସେମ୍ବର ୨୦୨୬ ପରୀକ୍ଷା ସୂଚୀ',
                summary_en: 'Subject-wise NTA schedule & Paper 1 prep.',
                tags: 'UGC NET, NTA',
                scope: 'National',
                is_exam: 1,
                status: 'published',
                updated_at: '2026-11-27T03:00:00Z'
              }
            ]
          };
        }
        return { results: [] };
      }
    };
  }
};

// 1. GET /api/public/search-index
const res = await handlePublicSearchIndexApi(new Request('https://csodisha.com/api/public/search-index'), { DB: mockDb });
assert.equal(res.status, 200);
assert.match(res.headers.get('Content-Type') || '', /application\/json/i);
const data = await res.json();
assert.equal(data.ok, true);
assert.equal(data.version, 'v396');
assert.ok(data.items.length >= 15, 'Includes jobs, results, exams, guides, and 11 hubs');
assert.ok(data.items.some((i) => i.url.includes('mmu-bhawanipatna') && i.type === 'job_alert'));
assert.ok(data.items.some((i) => i.url.includes('osstet-result') && i.type === 'result'));
assert.ok(data.items.some((i) => i.url.includes('cbse-ctet') && i.type === 'exam_update'));
assert.ok(data.items.some((i) => i.url.includes('ugc-net') && i.type === 'guide'));
assert.ok(data.items.some((i) => i.url === '/odisha-special/' && i.type === 'hub'));

// 2. Client-side bilingual ranking & category filtering
const overlaySrc = fs.readFileSync('assets/js/instant-search-overlay.js', 'utf8');
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(overlaySrc, sandbox);
const ks = sandbox.CSOInstantSearch;
assert.ok(ks && ks.version === 'v396');

const rKalahandi = ks.searchAndRank(data.items, 'Kalahandi', 'all');
assert.ok(rKalahandi.results.length >= 1);
assert.ok(rKalahandi.results[0].url.includes('mmu-bhawanipatna'), 'Kalahandi ranks MMU Bhawanipatna first');

const rOdia = ks.searchAndRank(data.items, 'ଫଳାଫଳ', 'result');
assert.equal(rOdia.results.length, 1);
assert.ok(rOdia.results[0].url.includes('osstet-result'), 'Odia query matches OSSTET Result');

const rCtet = ks.searchAndRank(data.items, 'CTET', 'exam_update');
assert.equal(rCtet.results.length, 1);
assert.ok(rCtet.results[0].url.includes('cbse-ctet'));

const rUgc = ks.searchAndRank(data.items, 'UGC NET', 'guide');
assert.equal(rUgc.results.length, 1);
assert.ok(rUgc.results[0].url.includes('ugc-net'));

// 3. Header wiring & strict CSP checks
const sharedHeaderJs = fs.readFileSync('assets/shared-header.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(sharedHeaderJs.includes('data-cso-search-trigger') && sharedHeaderJs.includes('CSOInstantSearch.openOverlay'), 'shared-header.js mounts search trigger');
assert.ok(indexHtml.includes('/assets/js/instant-search-overlay.js'), 'index.html loads instant-search-overlay.js');
assert.ok(styleCss.includes('.cso-ks-dialog') && styleCss.includes('.cso-ks-mark'), 'assets/style.css defines .cso-ks-* 4-theme styles');
assert.ok(!/\.innerHTML\s*=/.test(overlaySrc), 'Zero unsafe DOM markup injection in instant-search-overlay.js');
assert.ok(!/\.style\./.test(overlaySrc), 'Zero inline .style.* mutations in instant-search-overlay.js');

console.log('✅ v396 Public Instant Search & Filter Overlay (Ctrl+K / /) test suite passed!');
