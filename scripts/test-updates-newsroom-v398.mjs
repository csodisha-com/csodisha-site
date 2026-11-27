/**
 * v398: Public /updates/ Unified Chronological Newsroom & Archive Page Verification Suite
 * Validates:
 *  1. updates/index.html has canonical https://csodisha.com/updates/, RSS/JSON discovery & subscribe links,
 *     category pills (All, Jobs, Exams & Admit Cards, Results, Guides), bilingual EN/ଓଡ଼ିଆ controls,
 *     and zero inline style/script handlers (strict CSP)
 *  2. assets/js/updates-newsroom.js accurately classifies, filters (jobs, exams, results, guides),
 *     searches, and sorts (newest vs deadlines) entries from /feed.json with strict CSP compliance
 *  3. /sitemap.xml (dynamic-sitemap.js), /api/public/search-index (public-search-index.js),
 *     edge-cache-invalidator.js, robots.txt, and _worker.js include /updates/
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildSitemapXmlString, buildRobotsTxtString } from '../functions/_lib/dynamic-sitemap.js';
import { buildSearchIndexRecords } from '../functions/_lib/public-search-index.js';
import { collectUnifiedFeedItems, renderJsonFeed11 } from '../functions/_lib/syndication-feeds.js';
import { CONTENT_PUBLIC_PATHS, NAV_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

// 1. Validate updates/index.html shell, canonical, OG/Twitter, RSS/JSON, category pills & strict CSP
const html = fs.readFileSync('updates/index.html', 'utf8');
assert.ok(html.includes('<link rel="canonical" href="https://csodisha.com/updates/">'), 'updates/index.html must declare canonical https://csodisha.com/updates/');
assert.ok(html.includes('rel="alternate" type="application/rss+xml"') && html.includes('href="https://csodisha.com/feed.xml"'), 'updates/index.html must include RSS discovery link');
assert.ok(html.includes('rel="alternate" type="application/feed+json"') && html.includes('href="https://csodisha.com/feed.json"'), 'updates/index.html must include JSON Feed discovery link');
assert.ok(html.includes('property="og:url" content="https://csodisha.com/updates/"'), 'updates/index.html must include og:url');
assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'updates/index.html must include twitter:card');
assert.ok(html.includes('href="/feed.xml"') && html.includes('data-copy-feed="rss"'), 'updates/index.html must include 1-click RSS subscribe & copy controls');
assert.ok(html.includes('href="/feed.json"') && html.includes('data-copy-feed="json"'), 'updates/index.html must include 1-click JSON Feed subscribe & copy controls');

for (const pill of ['data-un-cat="all"', 'data-un-cat="jobs"', 'data-un-cat="exams"', 'data-un-cat="results"', 'data-un-cat="guides"']) {
  assert.ok(html.includes(pill), `updates/index.html must include category pill ${pill}`);
}
for (const label of ['All', 'Jobs', 'Exams &amp; Admit Cards', 'Results', 'Guides']) {
  assert.ok(html.includes(label), `updates/index.html must display category label ${label}`);
}

assert.ok(html.includes('/assets/js/updates-newsroom.js?v=20261127v402'), 'updates/index.html must load updates-newsroom.js?v=20261127v402');
assert.ok(html.includes('/assets/js/saved-alerts-drawer.js?v=20261127v402'), 'updates/index.html must load saved-alerts-drawer.js');
assert.ok(html.includes('/assets/js/ics-calendar-export.js?v=20261127v402'), 'updates/index.html must load ics-calendar-export.js');
assert.ok(!/\sstyle\s*=\s*["']/i.test(html), 'updates/index.html must have zero inline style="" attributes');
assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), 'updates/index.html must have zero inline on* event handlers');
assert.ok(!/<style[\s>]/i.test(html), 'updates/index.html must have zero inline <style> blocks');

// 2. Validate assets/js/updates-newsroom.js classification, filtering, search, sorting & CSP
const jsSrc = fs.readFileSync('assets/js/updates-newsroom.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(jsSrc), 'updates-newsroom.js must not use .innerHTML');
assert.ok(!/\.outerHTML\b/.test(jsSrc), 'updates-newsroom.js must not use .outerHTML');
assert.ok(!/insertAdjacentHTML/.test(jsSrc), 'updates-newsroom.js must not use insertAdjacentHTML');
assert.ok(!/\.style\./.test(jsSrc), 'updates-newsroom.js must not mutate .style.*');

const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(jsSrc, sandbox);
const newsroom = sandbox.CSOUpdatesNewsroom;
assert.ok(newsroom && newsroom.version === 'v398', 'CSOUpdatesNewsroom v398 loaded');

// Synthesize a live-shaped /feed.json payload via syndication-feeds.js
const mockEnv = {
  DB: {
    prepare(sql) {
      return {
        async all() {
          if (sql.includes('job_articles')) {
            return {
              results: [
                {
                  slug: 'opsc-oas-2026',
                  title_en: 'OPSC OAS 2026 Notification',
                  title_or: 'OPSC OAS ୨୦୨୬ ବିଜ୍ଞପ୍ତି',
                  summary_en: 'Odisha Civil Services recruitment.',
                  organisation_en: 'OPSC',
                  lifecycle_stage: 'notification',
                  last_date: '2026-12-20',
                  is_published: 1,
                  published_at: '2026-11-26T10:00:00Z',
                  updated_at: '2026-11-26T10:00:00Z'
                },
                {
                  slug: 'ossc-cgl-admit-card',
                  title_en: 'OSSC CGL Admit Card Out',
                  title_or: 'OSSC CGL ଆଡମିଟ୍ କାର୍ଡ',
                  summary_en: 'Download admit card.',
                  organisation_en: 'OSSC',
                  lifecycle_stage: 'admit_card',
                  exam_date: '2026-12-05',
                  is_published: 1,
                  published_at: '2026-11-27T08:00:00Z',
                  updated_at: '2026-11-27T08:00:00Z'
                },
                {
                  slug: 'osssc-ri-result',
                  title_en: 'OSSSC RI Final Result 2026',
                  title_or: 'OSSSC RI ଫଳାଫଳ ୨୦୨୬',
                  summary_en: 'Merit list published.',
                  organisation_en: 'OSSSC',
                  lifecycle_stage: 'result',
                  is_published: 1,
                  published_at: '2026-11-25T12:00:00Z',
                  updated_at: '2026-11-25T12:00:00Z'
                }
              ]
            };
          }
          return {
            results: [
              {
                slug: 'odisha-gk-handbook',
                title_en: 'Odisha 30-District GK Handbook',
                title_or: 'ଓଡ଼ିଶା ୩୦ ଜିଲ୍ଲା ଜିକେ ପୁସ୍ତିକା',
                summary_en: 'Complete Odisha GK study guide.',
                scope: 'Odisha',
                is_exam: 0,
                status: 'published',
                created_at: '2026-11-24T09:00:00Z',
                updated_at: '2026-11-24T09:00:00Z'
              }
            ]
          };
        }
      };
    }
  }
};

const unifiedItems = await collectUnifiedFeedItems(mockEnv, { limit: 40 });
const feedJson = renderJsonFeed11(unifiedItems);
assert.equal(feedJson.items.length, 4, 'Unified /feed.json should contain all 4 items');

const allOut = newsroom.filterAndSortItems(feedJson.items, { category: 'all', q: '', sort: 'newest' });
assert.equal(allOut.counts.all, 4);
assert.equal(allOut.counts.jobs, 1);
assert.equal(allOut.counts.exams, 1);
assert.equal(allOut.counts.results, 1);
assert.equal(allOut.counts.guides, 1);

const jobsOut = newsroom.filterAndSortItems(feedJson.items, { category: 'jobs' });
assert.equal(jobsOut.results.length, 1);
assert.ok(jobsOut.results[0].url.includes('/jobs/opsc-oas-2026'));

const examsOut = newsroom.filterAndSortItems(feedJson.items, { category: 'exams' });
assert.equal(examsOut.results.length, 1);
assert.ok(examsOut.results[0].url.includes('/jobs/ossc-cgl-admit-card'));

const resultsOut = newsroom.filterAndSortItems(feedJson.items, { category: 'results' });
assert.equal(resultsOut.results.length, 1);
assert.ok(resultsOut.results[0].url.includes('/jobs/osssc-ri-result'));

const guidesOut = newsroom.filterAndSortItems(feedJson.items, { category: 'guides' });
assert.equal(guidesOut.results.length, 1);
assert.ok(guidesOut.results[0].url.includes('/guides/odisha-gk-handbook'));

// Deadlines sort puts earliest deadline first (2026-12-05 before 2026-12-20)
const deadlinesOut = newsroom.filterAndSortItems(feedJson.items, { category: 'all', sort: 'deadlines' });
assert.ok(deadlinesOut.results[0].url.includes('ossc-cgl-admit-card'), 'Deadlines sort prioritizes earliest upcoming key date');
assert.ok(deadlinesOut.results[1].url.includes('opsc-oas-2026'), 'Deadlines sort orders next upcoming deadline second');

// Keyword search works in Odia as well as English
const odiaSearch = newsroom.filterAndSortItems(feedJson.items, { category: 'all', q: 'ଫଳାଫଳ' });
assert.equal(odiaSearch.results.length, 1);
assert.ok(odiaSearch.results[0].url.includes('osssc-ri-result'));

// 3. Validate Sitemap, Robots, Search Index, Edge Cache Invalidator & _worker.js wiring
const sitemapXml = buildSitemapXmlString({ jobRows: [], guideRows: [] });
assert.ok(sitemapXml.includes('<loc>https://csodisha.com/updates/</loc>'), '/sitemap.xml must include https://csodisha.com/updates/');
assert.ok(buildRobotsTxtString().includes('Allow: /updates/'), '/robots.txt must allow /updates/');

const searchItems = buildSearchIndexRecords({ jobRows: [], guideRows: [] });
assert.ok(searchItems.some((it) => it.url === '/updates/'), '/api/public/search-index must include /updates/');
assert.ok(CONTENT_PUBLIC_PATHS.includes('/updates/'), 'CONTENT_PUBLIC_PATHS must purge /updates/');
assert.ok(NAV_PUBLIC_PATHS.includes('/updates/'), 'NAV_PUBLIC_PATHS must purge /updates/');

const workerSrc = fs.readFileSync('_worker.js', 'utf8');
assert.ok(workerSrc.includes("'/updates': '/updates/'"), '_worker.js must canonical-redirect /updates -> /updates/');
assert.ok(workerSrc.includes("'/updates/'"), '_worker.js must include /updates/ in edge cache invalidation');

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(styleCss.includes('.cso-un-hero') && styleCss.includes('.cso-un-card'), 'assets/style.css must define .cso-un-* newsroom styles');

console.log('✅ v398 Public /updates/ Unified Chronological Newsroom test suite passed!');
