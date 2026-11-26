import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  HOME_FEED_CACHE_CONTROL,
  buildPublicHomeFeed,
  handlePublicHomeFeedApi
} from '../functions/api/public/home-feed.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';
import { CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb() {
  const execSql = (sql) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/FROM site_settings WHERE key = \?/i.test(s)) {
      return {
        first: {
          value_json: JSON.stringify({
            active: true,
            headline: 'OPSC OAS 2026 Prelims Admit Card Live',
            headline_or: 'OPSC OAS 2026 ପ୍ରିଲିମ୍ସ ଆଡମିଟ୍ କାର୍ଡ ଉପଲବ୍ଧ',
            badge_label: 'LIVE ALERT',
            severity: 'urgent',
            ctaText: 'Download Now',
            ctaUrl: '/jobs/'
          }),
          updated_at: '2026-11-26T00:00:00Z'
        }
      };
    }
    if (/FROM job_articles/i.test(s)) {
      return {
        results: [
          {
            id: 'job_1',
            slug: 'opsc-oas-2026',
            title_en: 'OPSC OAS Recruitment 2026',
            title_or: 'OPSC OAS ନିଯୁକ୍ତି 2026',
            last_date: '2026-12-20',
            total_vacancies: 399,
            location_district: 'All Odisha',
            sector_badge: 'OPSC',
            organisation_en: 'OPSC',
            organisation_or: 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ',
            lifecycle_stage: 'notification',
            qualification_summary: 'Any Graduate',
            published_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z'
          }
        ]
      };
    }
    if (/FROM cso_current_affairs/i.test(s)) {
      return {
        results: [
          {
            id: 'ca_2026_11_26',
            capsule_date: '2026-11-26',
            title_en: 'Odisha Semiconductor Policy 2026 Approved',
            title_or: 'ଓଡ଼ିଶା ସେମିକଣ୍ଡକ୍ଟର ନୀତି 2026 ଅନୁମୋଦିତ',
            highlights_en: JSON.stringify(['Odisha cabinet approved new semiconductor incentives.']),
            highlights_or: JSON.stringify(['ଓଡ଼ିଶା କ୍ୟାବିନେଟ୍ ନୂତନ ସେମିକଣ୍ଡକ୍ଟର ପ୍ରୋତ୍ସାହନ ଅନୁମୋଦନ କରିଛି।']),
            quiz_json: JSON.stringify([{ q_en: 'Q1', options: ['A', 'B', 'C', 'D'], answer_index: 0 }]),
            category: 'Odisha',
            created_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z'
          }
        ]
      };
    }
    if (/PRAGMA table_info\(mock_tests\)/i.test(s)) {
      return {
        results: [
          { name: 'id' }, { name: 'slug' }, { name: 'title_en' }, { name: 'title_or' },
          { name: 'exam_category' }, { name: 'duration_minutes' }, { name: 'negative_mark' },
          { name: 'status' }, { name: 'updated_at' }
        ]
      };
    }
    if (/PRAGMA table_info\(mock_questions\)/i.test(s)) {
      return { results: [{ name: 'id' }, { name: 'test_id' }] };
    }
    if (/FROM mock_tests t/i.test(s)) {
      return {
        results: [
          {
            id: 'mt_1',
            slug: 'opsc-oas-gs-mock-01',
            title_en: 'OPSC OAS GS Prelims Mock 01',
            title_or: 'OPSC OAS GS ପ୍ରିଲିମ୍ସ ମକ୍ 01',
            exam_category: 'OPSC OAS',
            duration_minutes: 120,
            negative_mark: 0.33,
            question_count: 100,
            status: 'published',
            updated_at: '2026-11-26T00:00:00Z'
          }
        ]
      };
    }
    if (/FROM study_articles/i.test(s)) {
      return {
        results: [
          {
            id: 'st_1',
            slug: 'ossc-cgl-2026-syllabus-pdf',
            title_en: 'OSSC CGL 2026 Complete Syllabus & PYQ PDF',
            title_or: 'OSSC CGL 2026 ସମ୍ପୂର୍ଣ୍ଣ ସିଲାବସ୍ ଏବଂ PYQ PDF',
            summary_en: 'Official tier-wise syllabus and previous papers.',
            summary_or: 'ସରକାରୀ ସିଲାବସ୍ ଏବଂ ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର।',
            exam_board_tag: 'OSSC CGL',
            pyq_year: '2026',
            resource_type_badge: 'Syllabus',
            notes_pdf_url: '/files/ossc-cgl-2026-syllabus.pdf',
            pyq_pdf_url: '',
            answer_key_pdf_url: '',
            published_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z'
          }
        ]
      };
    }
    if (/FROM careers_articles/i.test(s)) {
      return {
        results: [
          {
            id: 'car_1',
            slug: 'odisha-administrative-service-oas',
            title_en: 'Odisha Administrative Service (OAS) Roadmap',
            title_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS) ରୋଡମ୍ୟାପ୍',
            summary_en: 'Complete exam stages, eligibility and pay band.',
            summary_or: 'ପରୀକ୍ଷା ପର୍ଯ୍ୟାୟ, ଯୋଗ୍ୟତା ଏବଂ ବେତନ ସ୍ତର।',
            eligibility_summary: 'Any Graduate (21-38 yrs)',
            salary_band: 'ORSP Level-12 (Rs. 56,100)',
            track_slug: 'civil-services',
            career_stage: 'Graduate',
            published_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z'
          }
        ]
      };
    }
    if (/FROM scheme_articles/i.test(s)) {
      return {
        results: [
          {
            id: 'sch_1',
            slug: 'gopabandhu-sikhya-sahayata-yojana',
            title_en: 'Gopabandhu Sikhya Sahayata Yojana',
            title_or: 'ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା',
            summary_en: 'Rs. 20,000 annual scholarship for Odisha students.',
            summary_or: 'ଓଡ଼ିଶା ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ବାର୍ଷିକ ₹20,000 ବୃତ୍ତି।',
            benefit_amount_summary: 'Rs. 20,000 / year DBT',
            department_en: 'Higher Education Dept, Odisha',
            gov_badge: 'Govt of Odisha',
            last_date: '2026-12-31',
            is_ongoing: 1,
            published_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z'
          }
        ]
      };
    }
    return { first: null, results: [], run: { success: true } };
  };

  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() { return execSql(sql).first ?? null; },
        async all() { return { results: execSql(sql).results || [] }; },
        async run() { return { success: true }; }
      };
    }
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`  PASS  ${name}`);
  passed += 1;
}

console.log('\n=== Homepage Live Feed Hydration (v332) Verification ===\n');

await test('1. GET /api/public/home-feed returns all 7 live content buckets with Cache-Control headers', async () => {
  const db = createMockDb();
  const res = await handlePublicHomeFeedApi(new Request('https://csodisha.com/api/public/home-feed'), { DB: db });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), HOME_FEED_CACHE_CONTROL);
  assert.ok(HOME_FEED_CACHE_CONTROL.includes('max-age=60') && HOME_FEED_CACHE_CONTROL.includes('s-maxage=120'));

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.version, 'v332');
  assert.equal(data.broadcast.active, true);
  assert.equal(data.broadcast.badge_label, 'LIVE ALERT');
  assert.ok(data.broadcast.headline_or.includes('OPSC'));

  assert.equal(data.jobs.length, 1);
  assert.equal(data.jobs[0].href, '/jobs/opsc-oas-2026');
  assert.equal(data.jobs[0].vacancies, 399);

  assert.equal(data.current_affairs.length, 1);
  assert.equal(data.current_affairs[0].href, '/current-affairs/ca_2026_11_26');
  assert.equal(data.current_affairs[0].quiz_count, 1);

  assert.equal(data.mock_tests.length, 1);
  assert.equal(data.mock_tests[0].question_count, 100);
  assert.equal(data.mock_tests[0].href, '/mock-tests/?test=opsc-oas-gs-mock-01');

  assert.equal(data.syllabus_pyq.length, 1);
  assert.equal(data.syllabus_pyq[0].pdf_url, '/files/ossc-cgl-2026-syllabus.pdf');

  assert.equal(data.careers.length, 1);
  assert.equal(data.careers[0].href, '/careers/odisha-administrative-service-oas');

  assert.equal(data.schemes.length, 1);
  assert.equal(data.schemes[0].href, '/schemes/gopabandhu-sikhya-sahayata-yojana');
});

await test('2. ?refresh=1 cache bypass returns no-store and empty DB degrades cleanly without errors', async () => {
  const res = await handlePublicHomeFeedApi(new Request('https://csodisha.com/api/public/home-feed?refresh=1&_cb=12345'), { DB: createMockDb() });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'no-store, max-age=0');

  const emptyFeed = await buildPublicHomeFeed({});
  assert.equal(emptyFeed.ok, true);
  assert.equal(emptyFeed.jobs.length, 0);
  assert.equal(emptyFeed.broadcast.active, false);
});

await test('3. Edge cache invalidation, worker routing, homepage DOM & strict CSP + SW v332 sync', async () => {
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/home-feed'));
  const worker = read('_worker.js');
  assert.ok(worker.includes("pathname === '/api/public/home-feed'"));
  assert.ok(worker.includes("'/api/public/home-feed'"));
  assert.ok(worker.includes("pathname.startsWith('/careers/')"));
  assert.ok(worker.includes("pathname.startsWith('/current-affairs/')"));

  const indexHtml = read('index.html');
  for (const id of [
    'csoPublicAnnouncementMount',
    'cso-home-jobs-grid',
    'cso-home-ca-grid',
    'cso-home-mocks-grid',
    'cso-home-syllabus-grid',
    'cso-home-careers-grid',
    'cso-home-schemes-grid'
  ]) {
    assert.ok(indexHtml.includes(`id="${id}"`), `index.html missing #${id}`);
  }

  const hydJs = read('assets/js/home-hydration.js');
  assert.ok(hydJs.includes('/api/public/home-feed'));
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(hydJs), 'home-hydration.js must remain strictly CSP-safe');

  const qcJs = read('admin/quick-create-studio.js');
  assert.ok(qcJs.includes('bustHomeCache') && qcJs.includes('cso_home_feed_bust'));

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v336');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v336';"));
  assert.ok(read('sw.js').includes('CSO_BUST_HOME_CACHE'));

  // v334: CSO Opportunity Compass completely removed from homepage HTML, JS hydration & CSS
  assert.ok(!indexHtml.includes('CSO Opportunity Compass'), 'CSO Opportunity Compass must be completely absent from index.html');
  assert.ok(!indexHtml.includes('id="cso-opportunity-compass"'), 'id="cso-opportunity-compass" must be completely absent from index.html');
  assert.ok(!indexHtml.includes('cso-compass-section'), 'cso-compass-section must be completely absent from index.html');
  assert.ok(!indexHtml.includes('cso-compass-card'), 'cso-compass-card must be completely absent from index.html');
  assert.ok(!read('assets/style.css').includes('.cso-compass-section'), 'Unused .cso-compass-section CSS must be removed');
  assert.ok(!read('assets/style.css').includes('.cso-compass-grid'), 'Unused .cso-compass-grid CSS must be removed');
  assert.ok(!read('assets/js/homepage-blocks.js').includes("replaceKids(compass"), 'homepage-blocks.js must never re-inject opportunity_compass');

  // v335 + v336: Hero card & Ask CSOdisha search bar polish + high-contrast AI answer
  assert.ok(!indexHtml.includes('class="sr-icon"'), 'Duplicate left magnifying glass .sr-icon must be removed from hero search');
  assert.ok(indexHtml.includes('id="cso-hero-clear"') && indexHtml.includes('✕ Clear'), 'Hero search must include ✕ Clear reset button');
  assert.ok(indexHtml.includes('id="cso-hero-ask-btn"') && indexHtml.includes('✨ Ask'), 'Hero search must include single SVG ✨ Ask submit button');
  assert.match(indexHtml, /<button[^>]+id="smic"[^>]+hidden\b/, 'Voice mic button #smic must be hidden by default in HTML');
  assert.ok(indexHtml.includes('id="cso-hero-trust-strip"') && indexHtml.includes('30 Odisha Districts'), 'Hero card must include semantic trust strip');
  const heroChipsBlock = indexHtml.slice(indexHtml.indexOf('class="chips"'), indexHtml.indexOf('id="cso-hero-trust-strip"'));
  assert.equal((heroChipsBlock.match(/class="search-chip"/g) || []).length, 7, 'Popular Searches must contain 7 single-row chips');
  const semClientJs = read('assets/js/semantic-search.js');
  assert.ok(semClientJs.includes('window.CSOAskSearch'), 'semantic-search.js must expose window.CSOAskSearch');
  assert.ok(!semClientJs.includes('✕ Close / Reset'), 'Duplicate Close / Reset button must be removed from results panel');
  assert.ok(semClientJs.includes('formatHumanSectionNames'), 'semantic-search.js must format raw slash paths to clean names');
  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('#cso-hero #cso-hero-ask-results .cso-ask-answer-en'), 'style.css must enforce high-contrast ink inside hero AI answer');
  assert.ok(styleCss.includes('#cso-hero #sf:focus-within .cso-search-kbd'), 'style.css must hide Ctrl+K badge on focus/query');
  assert.ok(read('assets/app.js').includes('window.CSOAskSearch'), 'app.js chips & form must invoke window.CSOAskSearch');
});

console.log(`\n=== Homepage Live Feed v332 Results: ${passed} passed, 0 failed ===\n`);
