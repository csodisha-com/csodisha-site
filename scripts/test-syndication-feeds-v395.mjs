/**
 * v395: Bilingual RSS 2.0 (/feed.xml) & JSON Feed 1.1 (/feed.json) Verification Suite
 * Validates:
 *  1. GET /feed.xml returns HTTP 200 application/rss+xml with valid <rss version="2.0">,
 *     <channel>, <atom:link rel="self">, <media:content>, RFC 2822 <pubDate>, bilingual titles,
 *     and properly XML-escaped & / < characters.
 *  2. GET /feed.json returns HTTP 200 application/feed+json with valid JSON Feed 1.1 fields
 *     (version, home_page_url, feed_url, items[] with id, url, title, content_html, image,
 *     date_published, and _cso_bilingual).
 *  3. Category filtering (?category=jobs, ?category=results, ?category=guides) works accurately.
 *  4. <link rel="alternate"> RSS + JSON Feed discovery tags appear in <head> across /, /jobs/,
 *     /exams/, and /guides/ (via ssr-shell.js).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  handlePublicRssFeedXml,
  handlePublicJsonFeed
} from '../functions/_lib/syndication-feeds.js';
import { renderPublicGuidesHubHtml } from '../functions/_lib/informative-guides.js';

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
                title_en: 'MMU Bhawanipatna Walk-in: 31 ITEP & Guest Posts',
                title_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ: ୩୧ ITEP ପଦବୀ',
                summary_en: 'Walk-in interview on 10 Dec 2026 for 31 teaching posts <verified>.',
                summary_or: '୧୦ ଡିସେମ୍ବର ୨୦୨୬ ରେ ୱାକ୍-ଇନ୍ ସାକ୍ଷାତକାର।',
                organisation_en: 'Maa Manikeshwari University',
                last_date: '2026-12-10',
                cover_image_url: '',
                official_apply_url: 'https://kalahandiuniversity.ac.in/',
                lifecycle_stage: 'notification',
                is_published: 1,
                published_at: '2026-11-26T10:00:00Z',
                updated_at: '2026-11-26T12:00:00Z'
              },
              {
                slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
                title_en: 'BSE Odisha OSSTET Result 2026 Out (79.15% Pass)',
                title_or: 'BSE ଓଡ଼ିଶା OSSTET ଫଳାଫଳ ୨୦୨୬',
                summary_en: 'Digitized pass certificate from 25 Nov & OMR download till 2 Dec 2026.',
                summary_or: '୨୫ ନଭେମ୍ବରରୁ ସାର୍ଟିଫିକେଟ୍ ଓ ୨ ଡିସେମ୍ବର ଯାଏଁ OMR।',
                organisation_en: 'BSE Odisha',
                last_date: '2026-12-02',
                cover_image_url: '/assets/img/osstet-2026-result-cover.webp',
                result_url: 'https://bseodisha.ac.in/',
                lifecycle_stage: 'result',
                is_published: 1,
                published_at: '2026-11-27T02:36:18Z',
                updated_at: '2026-11-27T02:36:18Z'
              }
            ]
          };
        }
        if (/FROM\s+informative_guides/i.test(sql)) {
          return {
            results: [
              {
                slug: 'ugc-net-december-2026-schedule-nta-guidelines',
                title_en: 'UGC NET December 2026 Exam Schedule & Guidelines',
                title_or: 'UGC NET ଡିସେମ୍ବର ୨୦୨୬ ପରୀକ୍ଷା ସୂଚୀ',
                summary_en: 'Subject-wise NTA schedule & Paper 1 preparation strategy.',
                summary_or: 'ବିଷୟଭିତ୍ତିକ ପରୀକ୍ଷା ସୂଚୀ।',
                cover_image: '/assets/img/cso-logo-400.webp',
                scope: 'National',
                is_exam: 0,
                status: 'published',
                created_at: '2026-11-26T08:00:00Z',
                updated_at: '2026-11-27T01:00:00Z'
              }
            ]
          };
        }
        return { results: [] };
      }
    };
  }
};

// 1. RSS 2.0 (/feed.xml)
const rssRes = await handlePublicRssFeedXml(new Request('https://csodisha.com/feed.xml'), { DB: mockDb });
assert.equal(rssRes.status, 200);
assert.match(rssRes.headers.get('Content-Type') || '', /application\/rss\+xml/i);
const xml = await rssRes.text();
assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(xml.includes('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">'));
assert.ok(xml.includes('<atom:link href="https://csodisha.com/feed.xml" rel="self" type="application/rss+xml" />'));
assert.equal((xml.match(/<item>/g) || []).length, 3, 'All 3 published items emitted');
assert.ok(xml.includes('31 ITEP &amp; Guest Posts'), 'Ampersands properly XML-escaped');
assert.ok(!xml.includes('<verified>'), 'Raw HTML tags stripped from RSS description');
assert.ok(xml.includes('https://csodisha.com/assets/img/osstet-2026-result-cover.webp'));
assert.match(xml, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/, 'Valid RFC 2822 pubDate');

// 2. JSON Feed 1.1 (/feed.json)
const jsonRes = await handlePublicJsonFeed(new Request('https://csodisha.com/feed.json'), { DB: mockDb });
assert.equal(jsonRes.status, 200);
assert.match(jsonRes.headers.get('Content-Type') || '', /application\/feed\+json/i);
const jf = await jsonRes.json();
assert.equal(jf.version, 'https://jsonfeed.org/version/1.1');
assert.equal(jf.home_page_url, 'https://csodisha.com/');
assert.equal(jf.feed_url, 'https://csodisha.com/feed.json');
assert.equal(jf.items.length, 3);
assert.equal(jf.items[0].url, 'https://csodisha.com/jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr', 'Newest item sorted first');
assert.equal(jf.items[0].image, 'https://csodisha.com/assets/img/osstet-2026-result-cover.webp');
assert.ok(jf.items[0]._cso_bilingual && jf.items[0]._cso_bilingual.title_or.includes('OSSTET'), 'Includes _cso_bilingual extension');

// 3. Category filtering
const jobsOnly = await (await handlePublicJsonFeed(new Request('https://csodisha.com/feed.json?category=jobs'), { DB: mockDb })).json();
assert.equal(jobsOnly.items.length, 1);
assert.ok(jobsOnly.items[0].url.includes('mmu-bhawanipatna'));

const resultsOnly = await (await handlePublicJsonFeed(new Request('https://csodisha.com/feed.json?category=results'), { DB: mockDb })).json();
assert.equal(resultsOnly.items.length, 1);
assert.ok(resultsOnly.items[0].url.includes('osstet-result'));

const guidesOnly = await (await handlePublicJsonFeed(new Request('https://csodisha.com/feed.json?category=guides'), { DB: mockDb })).json();
assert.equal(guidesOnly.items.length, 1);
assert.ok(guidesOnly.items[0].url.includes('/guides/ugc-net'));

// 4. <link rel="alternate"> discovery tags across /, /jobs/, /exams/, and /guides/
for (const file of ['index.html', 'jobs/index.html', 'exams/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes('type="application/rss+xml"') && html.includes('https://csodisha.com/feed.xml'), `${file} has RSS alternate link`);
  assert.ok(html.includes('type="application/feed+json"') && html.includes('https://csodisha.com/feed.json'), `${file} has JSON Feed alternate link`);
}
const guidesHtml = renderPublicGuidesHubHtml([], new URL('https://csodisha.com/guides/'));
assert.ok(guidesHtml.includes('type="application/rss+xml"') && guidesHtml.includes('https://csodisha.com/feed.xml'), '/guides/ has RSS alternate link');
assert.ok(guidesHtml.includes('type="application/feed+json"') && guidesHtml.includes('https://csodisha.com/feed.json'), '/guides/ has JSON Feed alternate link');

console.log('✅ v395 Bilingual RSS 2.0 (/feed.xml) & JSON Feed 1.1 (/feed.json) test suite passed!');
