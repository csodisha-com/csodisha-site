// v162: SSR Pre-Rendering for Active Jobs & Schemes verification.
// Usage: node scripts/test-ssr-feeds-v162.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  escapeHtml,
  safeHref,
  renderJobCard,
  renderSchemeCard,
  buildJobsJsonLd,
  injectJobsFeed,
  hydrateJobsFeedResponse,
  filterJobsForHub,
  hubMoreButton
} from '../functions/_lib/ssr-feeds.js';
import { HUBS, ORIGIN } from '../functions/_lib/career-hubs-data.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. Escaping & safeHref
ok(escapeHtml('<script>alert("x")</script>&\'') === '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;', 'escapeHtml must escape all HTML meta characters');
ok(safeHref('https://www.opsc.gov.in/apply') === 'https://www.opsc.gov.in/apply', 'safeHref allows https');
ok(safeHref('/jobs-careers/?job=opsc-oas') === '/jobs-careers/?job=opsc-oas', 'safeHref allows root-relative');
ok(safeHref('javascript:alert(1)') === '', 'safeHref blocks javascript:');
ok(safeHref('//evil.example/x') === '', 'safeHref blocks protocol-relative URLs');

// 2. Job card SSR rendering + XSS safety + 2x2 action row
const sampleJobs = [
  {
    id: 'j1',
    slug: 'opsc-oas-2026',
    title: 'OPSC Odisha Civil Services <OAS> "2026"',
    title_or: 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍',
    summary: 'Apply online for OAS & Allied posts <img src=x onerror=alert(1)>',
    organisation: 'OPSC',
    state: 'Odisha',
    category: 'OPSC',
    vacancies: 399,
    qualification: 'Graduate',
    last_date: '2026-12-31',
    published_at: '2026-11-15T10:00:00Z',
    apply_url: 'https://www.opsc.gov.in/',
    notification_url: 'https://www.opsc.gov.in/notice.pdf',
    tags: ['opsc', 'oas'],
    expired: false
  },
  {
    id: 'j2',
    slug: 'osstet-teacher-2026',
    title: 'OSSTET & Junior Teacher Recruitment 2026',
    summary: 'Teacher recruitment across Odisha schools.',
    organisation: 'OAVS',
    state: 'Odisha',
    category: 'Teaching',
    vacancies: 1200,
    qualification: 'B.Ed / OTET',
    last_date: '2026-12-20',
    published_at: '2026-11-18T10:00:00Z',
    apply_url: 'javascript:alert(1)',
    notification_url: null,
    tags: ['teaching', 'osstet'],
    expired: false
  }
];

const fixedNow = new Date('2026-11-21T12:00:00Z');
const cardHtml = renderJobCard(sampleJobs[0], fixedNow);
ok(cardHtml.includes('data-ssr-card'), 'job card has data-ssr-card');
ok(cardHtml.includes('data-job-slug="opsc-oas-2026"'), 'job card has data-job-slug');
ok(cardHtml.includes('&lt;OAS&gt; &quot;2026&quot;'), 'job title HTML-escaped');
ok(!cardHtml.includes('<img src=x'), 'XSS payload escaped in summary');
ok(cardHtml.includes('View Details'), 'job card has View Details');
ok(cardHtml.includes('Apply Online ↗') && cardHtml.includes('target="_blank" rel="noopener noreferrer"'), 'job card has Apply Online with safe target/rel');
ok(cardHtml.includes('📲 Share') && cardHtml.includes('data-action="share"'), 'job card has Share button');
ok(cardHtml.includes('★ Save') && cardHtml.includes('data-bookmark-type="job"') && cardHtml.includes('data-bookmark-id="opsc-oas-2026"'), 'job card has ★ Save bookmark button');
ok(!/style\s*=|onclick\s*=|<script/i.test(cardHtml), 'job card HTML is 100% CSP compliant');

const card2Html = renderJobCard(sampleJobs[1], fixedNow);
ok(!card2Html.includes('javascript:'), 'unsafe apply_url rejected on job card');
ok(card2Html.includes('Official Info'), 'fallback Official Info link rendered when apply_url is invalid');

// 3. Scheme card SSR rendering
const schemeHtml = renderSchemeCard({
  id: 's1',
  slug: 'subhadra-yojana',
  title: 'Subhadra Yojana <Odisha>',
  sponsor_level: 'Odisha State',
  department_name: 'WCD Dept',
  benefit_amount: '₹10,000 / year',
  application_mode: 'Online Portal',
  beneficiary_group: 'Women',
  summary: 'Direct benefit transfer <script>x</script>',
  official_apply_url: 'https://subhadra.odisha.gov.in/'
});
ok(schemeHtml.includes('data-scheme-slug="subhadra-yojana"'), 'scheme card has data-scheme-slug');
ok(schemeHtml.includes('&lt;Odisha&gt;') && !schemeHtml.includes('<script>x</script>'), 'scheme card escapes HTML');
ok(schemeHtml.includes('View Details') && schemeHtml.includes('Apply Online ↗'), 'scheme card has View Details and Apply Online');
ok(!/style\s*=|onclick\s*=/i.test(schemeHtml), 'scheme card is CSP compliant');

// 4. JSON-LD structured data
const ldHtml = buildJobsJsonLd(sampleJobs, { listName: 'Live Jobs', pageUrl: `${ORIGIN}/jobs-careers/` });
ok(ldHtml.startsWith('<script type="application/ld+json" id="cso-jobposting-jsonld">'), 'JSON-LD uses application/ld+json');
const ldJson = JSON.parse(ldHtml.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
ok(ldJson['@type'] === 'ItemList' && ldJson.itemListElement.length === 2, 'JSON-LD ItemList has 2 items');
ok(ldJson.itemListElement[0].item['@type'] === 'JobPosting', 'JSON-LD items are JobPosting');
ok(ldJson.itemListElement[0].item.validThrough === '2026-12-31', 'JSON-LD preserves validThrough');

// 5. injectJobsFeed on landing HTML
const landingHtml = read('jobs-careers/index.html');
const injectedLanding = injectJobsFeed(landingHtml, {
  ids: { grid: 'live-jobs-grid', status: 'live-jobs-status', count: 'live-jobs-count' },
  jobs: sampleJobs,
  total: 2,
  ld: ldHtml,
  now: fixedNow
});
ok(injectedLanding.includes('data-ssr="1"'), 'landing grid marked data-ssr="1"');
ok((injectedLanding.match(/data-ssr-card/g) || []).length === 2, 'landing grid contains 2 SSR cards');
ok(!injectedLanding.includes('Loading live recruitment notifications…'), 'Loading placeholder removed when SSR cards exist');
ok(injectedLanding.includes('2 Active Notices'), 'count badge populated on server');
ok(injectedLanding.includes('id="cso-jobposting-jsonld"'), 'JSON-LD injected into <head>');

// 6. hydrateJobsFeedResponse on landing + all 6 Career Hub pages with mock D1
const mockDb = {
  prepare(sql) {
    const stmt = {
      bind() { return stmt; },
      async all() {
        return {
          results: sampleJobs.map(j => ({
            ...j,
            type: 'job',
            status: 'published',
            tags: JSON.stringify(j.tags),
            notification_media_key: j.notification_url ? `external:${j.notification_url}` : null
          }))
        };
      },
      async first() { return { n: sampleJobs.length }; }
    };
    return stmt;
  }
};

const landingRes = await hydrateJobsFeedResponse(
  new Response(landingHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
  '/jobs-careers/',
  new URL(`${ORIGIN}/jobs-careers/`),
  { DB: mockDb }
);
const landingOut = await landingRes.text();
ok((landingOut.match(/View Details/g) || []).length >= 2, 'hydrated /jobs-careers/ outputs View Details');
ok(!landingOut.includes('Loading live recruitment notifications…'), 'hydrated /jobs-careers/ removes Loading text');

const opscHub = HUBS.find(h => h.slug === 'odisha-state-jobs');
const opscHtml = read(`jobs-careers/${opscHub.slug}/index.html`);
const opscRes = await hydrateJobsFeedResponse(
  new Response(opscHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
  `/jobs-careers/${opscHub.slug}/`,
  new URL(`${ORIGIN}/jobs-careers/${opscHub.slug}/`),
  { DB: mockDb }
);
const opscOut = await opscRes.text();
ok(opscOut.includes('data-ssr="1"') && opscOut.includes('opsc-oas-2026'), 'odisha-state-jobs hub SSR renders matching OPSC card');
ok(!opscOut.includes('osstet-teacher-2026'), 'odisha-state-jobs hub filters out non-matching teaching card');
ok(!opscOut.includes('Loading live recruitment notices…'), 'hub SSR removes Loading text');
ok(opscOut.includes('id="cso-jobposting-jsonld"'), 'hub SSR injects JobPosting JSON-LD');
ok(hubMoreButton(5).includes('Show more notices (5)'), 'hubMoreButton renders remaining count');
ok(filterJobsForHub(sampleJobs, HUBS.find(h => h.slug === 'teaching-education')).length === 1, 'teaching hub matches OSSTET job');

// 7. Client hydration checks (zero duplicate renders, attaches listeners, syncs bookmarks)
const dashJs = read('jobs-careers/assets/dashboard.js');
const hubJs = read('jobs-careers/assets/hub.js');
const schemesJs = read('schemes/assets/schemes-explorer.js');
ok(dashJs.includes('function hydrateSsrJobCards') && dashJs.includes("card.dataset.hydrated === '1'"), 'dashboard.js hydrates SSR cards idempotently');
ok(dashJs.includes('loadLiveJobs({ silent: true })') && dashJs.includes('ssrSlugs === liveSlugs'), 'dashboard.js avoids wiping/duplicating matching SSR cards');
ok(hubJs.includes('function hydrateSsrHubCards') && hubJs.includes("card.getAttribute('data-hydrated') === '1'"), 'hub.js hydrates SSR cards idempotently');
ok(hubJs.includes('ssrSlugs === topSlugs'), 'hub.js avoids wiping/duplicating matching SSR cards');
ok(schemesJs.includes("host.getAttribute('data-ssr') === '1'") && schemesJs.includes('ssrSlugs === liveSlugs'), 'schemes-explorer.js avoids wiping/duplicating matching SSR cards');

// 8. 100% CSP compliance across modified files
for (const rel of ['functions/_lib/ssr-feeds.js', 'jobs-careers/assets/dashboard.js', 'jobs-careers/assets/hub.js', 'schemes/assets/schemes-explorer.js']) {
  const src = read(rel);
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${rel}: no innerHTML sinks`);
  ok(!/\.style\.cssText|setAttribute\(\s*['"]style['"]/.test(src), `${rel}: no inline style mutations`);
  ok(!/\bonclick\s*=/.test(src), `${rel}: no onclick= attributes`);
}
for (const out of [landingOut, opscOut]) {
  ok(!/<style[\s>]/i.test(out), 'SSR output has no inline <style>');
  ok(!/\sstyle\s*=/i.test(out), 'SSR output has no style="" attributes');
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(out), 'SSR output has no inline event handlers');
  for (const m of out.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /type="application\/ld\+json"/.test(m[1]), `SSR output has executable inline <script>: ${m[1]}`);
  }
}

// 9. Cache version v162
ok(/CACHE_NAME = 'cso-candidate-cache-v162'/.test(read('sw.js')), 'sw.js bumped to v162');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v162'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v162');
ok(/cso-candidate-cache-v162/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v162');

console.log(`test-ssr-feeds-v162: ${passed} assertions passed`);
