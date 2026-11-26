import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  HOME_FEED_CACHE_CONTROL,
  buildPublicHomeFeed,
  handlePublicHomeFeedApi
} from '../functions/api/public/home-feed.js';
import {
  isExternalHref,
  upsertLatestUpdateMeta
} from '../functions/_lib/latest-updates.js';
import { handleAdminLatestUpdates } from '../functions/api/admin/latest-updates.js';
import { handleSiteConfig, HOME_SECTIONS_KEY } from '../functions/api/admin/_site.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';
import { CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb() {
  const luMeta = new Map();
  const siteSettings = new Map([
    ['homepage_banner', {
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
    }]
  ]);
  let jobPublished = 1;

  const execSql = (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^INSERT INTO site_settings/i.test(s)) {
      const [key, value_json] = params;
      siteSettings.set(String(key), { value_json: String(value_json), updated_at: '2026-11-26T08:00:00Z' });
      return { run: { success: true } };
    }
    if (/^INSERT INTO cso_latest_updates_meta/i.test(s)) {
      const [entity_type, entity_id, is_pinned, scope, is_exam, updated_at] = params;
      const prev = luMeta.get(`${entity_type}:${entity_id}`);
      const nextExam = (is_exam !== null && is_exam !== undefined) ? is_exam : (prev ? prev.is_exam : null);
      luMeta.set(`${entity_type}:${entity_id}`, { entity_type, entity_id, is_pinned, scope, is_exam: nextExam, updated_at });
      return { run: { success: true } };
    }
    if (/^SELECT entity_type, entity_id, is_pinned, scope, is_exam, updated_at FROM cso_latest_updates_meta/i.test(s)) {
      return { results: Array.from(luMeta.values()) };
    }
    if (/^UPDATE job_articles SET is_published = 0/i.test(s)) {
      jobPublished = 0;
      return { run: { success: true } };
    }
    if (/FROM site_settings WHERE key = \?/i.test(s)) {
      const key = String(params[0] || '');
      return { first: siteSettings.get(key) || null };
    }
    if (/FROM nav_menu_items/i.test(s)) {
      return {
        results: [
          { id: 'nh_1', label_en: 'Jobs', label_or: 'ଚାକିରି', url: '/jobs/', icon_key: '💼', badge_text_en: 'LIVE', badge_text_or: 'ଲାଇଭ୍', open_new_tab: 0, highlight_style: 'default', sort_order: 1 },
          { id: 'nh_2', label_en: 'Careers', label_or: 'କ୍ୟାରିୟର୍', url: '/careers/', icon_key: '🧭', badge_text_en: '', badge_text_or: '', open_new_tab: 0, highlight_style: 'default', sort_order: 2 },
          { id: 'nh_3', label_en: 'Schemes', label_or: 'ଯୋଜନା', url: '/schemes/', icon_key: '🏛', badge_text_en: '', badge_text_or: '', open_new_tab: 0, highlight_style: 'default', sort_order: 3 }
        ]
      };
    }
    if (/FROM job_articles/i.test(s)) {
      if (!jobPublished) return { results: [] };
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
      let bound = [];
      return {
        bind(...args) { bound = args; return this; },
        async first() { return execSql(sql, bound).first ?? null; },
        async all() { return { results: execSql(sql, bound).results || [] }; },
        async run() { return execSql(sql, bound).run || { success: true }; }
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
  assert.equal(data.version, 'v341');
  assert.equal(data.broadcast.active, true);
  assert.ok(data.broadcast.id, 'broadcast must include stable dismissal id');
  assert.ok(Array.isArray(data.nav_header) && data.nav_header.length === 3, 'home-feed must include published nav_header links');
  assert.equal(data.nav_header[0].url, '/jobs/');
  assert.equal(data.nav_header[0].label_or, 'ଚାକିରି');
  assert.equal(data.nav_header[0].badge_text_en, 'LIVE');
  assert.deepEqual(data.section_visibility, {
    jobs: true,
    current_affairs: true,
    mock_tests: true,
    syllabus_pyq: true,
    careers: true,
    schemes: true
  });
  assert.ok(Array.isArray(data.latest_updates) && data.latest_updates.length >= 6, 'home-feed must include unified latest_updates across tables including mock_tests');
  const jobLu = data.latest_updates.find((x) => x.entity_type === 'job');
  assert.ok(jobLu && jobLu.badge_type === 'JOB' && jobLu.cta_label === 'View Job →' && jobLu.is_external === false);
  assert.ok(jobLu.filter_tags.includes('all') && jobLu.filter_tags.includes('jobs') && jobLu.filter_tags.includes('exams') && jobLu.filter_tags.includes('odisha'));
  const mockLu = data.latest_updates.find((x) => x.entity_type === 'mock_test');
  assert.ok(mockLu && mockLu.badge_type === 'EXAM' && mockLu.cta_label === 'Start Test →' && mockLu.url === '/mock-tests/?test=opsc-oas-gs-mock-01');
  assert.ok(mockLu.filter_tags.includes('exams') && mockLu.is_exam === true);
  assert.ok(jobLu.meta_line && !/CS Odisha Editorial Desk/i.test(jobLu.meta_line));
  assert.equal(isExternalHref('https://www.opsc.gov.in/'), true);
  assert.equal(isExternalHref('/jobs/opsc-oas-2026'), false);
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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v342');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v342';"));
  assert.ok(read('sw.js').includes('CSO_BUST_HOME_CACHE'));

  // v342: Single-row <1100px mobile header (zero duplicate lang/theme rows), polite public Latest Updates empty state, short mobile search placeholder
  assert.ok(indexHtml.includes('id="cso-mobile-top-actions"') && indexHtml.includes('id="cso-header-menu-toggle"'), 'index.html must include consolidated single-row mobile header actions');
  assert.ok(indexHtml.includes('Ask jobs, schemes, exams, syllabus...'), 'index.html must include concise mobile search placeholder');
  assert.ok(!read('assets/app.js').includes('add categories or content in Admin Studio'), 'app.js must NOT show internal Admin Studio text to public visitors');
  assert.ok(!hydJs.includes('publish content in Admin Studio') && hydJs.includes('No updates in this category yet. Click All to view recent updates.'), 'home-hydration.js must show polite public empty state without Admin Studio text');
  assert.ok(hydJs.includes('Ask jobs, schemes, exams, syllabus...') && hydJs.includes('ଚାକିରି, ଯୋଜନା, ପରୀକ୍ଷା, ସିଲାବସ୍ ଖୋଜନ୍ତୁ...'), 'home-hydration.js must use concise bilingual mobile search placeholders');
  assert.ok(read('assets/app.js').includes('buildDrawerUtilities') && read('assets/style.css').includes('.cso-drawer-utilities'), 'Mobile secondary utilities must live cleanly inside the <1100px slide-out drawer');

  // v341: Sticky single-row desktop header, brand name, Candidate Hub, EN|ଓଡ଼ିଆ toggle, 4-theme switcher, broadcast ID dismissal, nav_header sync & <1100px slide-out drawer
  assert.ok(indexHtml.includes('class="cso-sticky-header"') && indexHtml.includes('class="cso-brand-name">Common Sense Odisha<'), 'index.html must include sticky header and Common Sense Odisha brand name');
  assert.ok(indexHtml.includes('id="cso-header-hub-link"') && indexHtml.includes('href="/student-dashboard/"'), 'index.html must include Candidate Hub button in header');
  assert.ok(indexHtml.includes('id="cso-mobile-drawer-backdrop"'), 'index.html must include mobile slide-out drawer backdrop');
  assert.ok(indexHtml.includes('aria-current="page"'), 'index.html static fallback nav must include aria-current="page"');
  const appJs = read('assets/app.js');
  assert.ok(appJs.includes('cso-lang-toggle') && appJs.includes('cso:langchange'), 'app.js must provide instant EN|ଓଡ଼ିଆ segmented toggle and cso:langchange event');
  assert.ok(appJs.includes('window.CSOHeaderNav') && appJs.includes('applyHeaderLinks'), 'app.js must expose CSOHeaderNav.applyHeaderLinks for Admin nav_header sync');
  assert.ok(appJs.includes('setMobileDrawerOpen') && appJs.includes("classList.toggle('cso-modal-open'"), 'app.js must lock body scroll on mobile slide-out drawer');
  assert.ok(appJs.includes("ev.key==='ArrowDown'") && appJs.includes("ev.key==='Escape'"), 'app.js 4-theme menu must support keyboard arrow navigation and Escape');
  assert.ok(hydJs.includes('cso_dismissed_broadcast_id') && hydJs.includes('applyHeaderLinks'), 'home-hydration.js must persist per-broadcast dismissal ID and hydrate nav_header');
  assert.ok(qcJs.includes('cso_nav_cache_bust') && qcJs.includes("bustHomeCache('nav')"), 'quick-create-studio.js must bust nav & broadcast caches immediately on save');

  // v340: Trending & Popular Topics positioned strictly above compact 2-column feeds with zero duplicates
  const idxHeroLu = indexHtml.indexOf('id="cso-latest-updates-card"');
  const idxTrending = indexHtml.indexOf('id="cso-trending-topics"');
  const idxFeeds = indexHtml.indexOf('id="cso-home-feeds"');
  assert.ok(idxHeroLu > 0 && idxTrending > idxHeroLu && idxFeeds > idxTrending, 'index.html must order Hero/Latest Updates -> Trending & Popular Topics -> Compact 2-Column Feeds');
  assert.equal((indexHtml.match(/id="cso-trending-topics"/g) || []).length, 1, 'index.html must contain exactly one #cso-trending-topics section');
  assert.ok(read('assets/js/homepage-blocks.js').includes('ensureTrendingAboveFeeds'), 'homepage-blocks.js must preserve Trending Topics above compact feeds during hydration');
  assert.ok(hydJs.includes('ensureTrendingTopicsOrder'), 'home-hydration.js must preserve Trending Topics order and bilingual copy');

  // v339: Compact 2-column split grid, slim list rows, zero filler subtitles/footers & Admin Studio section visibility toggles
  assert.ok(indexHtml.includes('class="cso-hf-split-grid" id="cso-home-feeds"'), 'index.html must wrap 6 feeds in .cso-hf-split-grid#cso-home-feeds');
  assert.ok(!indexHtml.includes('class="cso-hf-sub"'), 'index.html must remove redundant .cso-hf-sub section subtitle paragraphs');
  assert.ok(!indexHtml.includes('Live from Admin Studio') && !indexHtml.includes('Free Access') && !indexHtml.includes('Verified PDFs'), 'index.html must remove legacy filler footers from feed cards');
  assert.ok(indexHtml.includes('class="cso-hf-row"') && indexHtml.includes('class="cso-hf-row__act'), 'index.html must use slim .cso-hf-row list items');
  const styleCssV339 = read('assets/style.css');
  assert.ok(styleCssV339.includes('.cso-hf-split-grid') && styleCssV339.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'style.css must define 2-column .cso-hf-split-grid');
  assert.ok(styleCssV339.includes('@media (max-width: 960px)'), 'style.css must collapse 2-column split grid below 960px');
  assert.ok(hydJs.includes('applySectionVisibility') && hydJs.includes('buildCompactFeedRow'), 'home-hydration.js must hydrate compact rows and honor section_visibility');
  assert.ok(qcJs.includes('Homepage Compact Sections') && qcJs.includes('/api/admin/site'), 'quick-create-studio.js must include Homepage Compact Sections toggle group backed by /api/admin/site');
  assert.ok(read('functions/api/admin/_router.js').includes("case 'site':"), '_router.js must wire /api/admin/site');

  // v337 + v338: Latest Updates homepage DOM, Exams tab, Admin Studio pin/exam/scope controls & live feed panel
  assert.ok(indexHtml.includes('id="cso-latest-updates-card"') && indexHtml.includes('id="cso-lu-list"'), 'index.html must include upgraded Latest Updates card');
  assert.ok(indexHtml.includes('data-filter="exams"') && indexHtml.includes('>Exams<'), 'index.html must include Exams filter tab');
  assert.ok(indexHtml.includes('data-tags="all exams education odisha"'), 'index.html must include Exams static fallback card');
  assert.ok(read('assets/js/homepage-blocks.js').includes("data-tab') === 'exams'"), 'homepage-blocks.js must preserve Exams tab');
  assert.ok(read('assets/js/home-hydration.js').includes("exams: 'ପରୀକ୍ଷା'"), 'home-hydration.js must support Odia Exams tab label');
  assert.ok(read('admin/quick-create-studio.js').includes('Pin to Homepage Latest Updates'), 'quick-create-studio.js must include Pin to Homepage Latest Updates');
  assert.ok(read('admin/quick-create-studio.js').includes('Exams Tag'), 'quick-create-studio.js must include Exams Tag control');
  assert.ok(read('admin/quick-create-studio.js').includes('Latest Updates Live Feed'), 'quick-create-studio.js must include Latest Updates Live Feed panel');
  assert.ok(read('admin/cms/cms.js').includes('Pin to Homepage Latest Updates') && read('admin/cms/cms.js').includes('Exams Tag'), 'cms.js must include Pin & Exams Tag controls');
  assert.ok(read('functions/api/admin/_router.js').includes("if (resource === 'latest-updates')"), '_router.js must wire /api/admin/latest-updates');

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

await test('4. v337 Admin /api/admin/latest-updates pin, scope & unpublish immediately control homepage Latest Updates order', async () => {
  const db = createMockDb();
  const env = { DB: db };
  const actor = { userId: 'adm_1', email: 'admin@csodisha.com', role: 'admin' };

  // Pin scheme_articles sch_1 with National scope + explicit is_exam = 1 override so it appears under Exams too
  await upsertLatestUpdateMeta(db, { entity_type: 'scheme', entity_id: 'sch_1', is_pinned: 1, scope: 'National', is_exam: 1 });
  const listRes = await handleAdminLatestUpdates(new Request('https://csodisha.com/api/admin/latest-updates', { method: 'GET' }), env, actor);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.ok, true);
  assert.equal(listData.items[0].entity_id, 'sch_1');
  assert.equal(listData.items[0].is_pinned, true);
  assert.equal(listData.items[0].scope, 'National');
  assert.equal(listData.items[0].is_exam, true);
  assert.ok(listData.items[0].filter_tags.includes('national') && listData.items[0].filter_tags.includes('exams'));

  // Untag exam via POST /api/admin/latest-updates action='untag_exam'
  const untagRes = await handleAdminLatestUpdates(new Request('https://csodisha.com/api/admin/latest-updates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'untag_exam', entity_type: 'scheme', entity_id: 'sch_1', is_pinned: 1, scope: 'National' })
  }), env, actor);
  assert.equal(untagRes.status, 200);
  const feedAfterUntag = await buildPublicHomeFeed(env);
  const schAfterUntag = feedAfterUntag.latest_updates.find((it) => it.entity_id === 'sch_1');
  assert.equal(schAfterUntag.is_exam, false);
  assert.equal(schAfterUntag.filter_tags.includes('exams'), false);

  // 1-click Unpublish job_1 removes it from homepage Latest Updates
  const unpubRes = await handleAdminLatestUpdates(new Request('https://csodisha.com/api/admin/latest-updates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unpublish', entity_type: 'job', entity_id: 'job_1' })
  }), env, actor);
  assert.equal(unpubRes.status, 200);
  const feedAfter = await buildPublicHomeFeed(env);
  assert.equal(feedAfter.latest_updates.some((it) => it.entity_id === 'job_1'), false, 'Unpublished job must disappear from latest_updates');
});

await test('5. v339 Admin /api/admin/site section visibility toggles persist in D1 and sync to /api/public/home-feed', async () => {
  const db = createMockDb();
  const env = { DB: db };
  const actor = { userId: 'adm_1', email: 'admin@csodisha.com', role: 'admin' };

  assert.equal(HOME_SECTIONS_KEY, 'homepage_compact_sections');
  const getInitial = await handleSiteConfig(new Request('https://csodisha.com/api/admin/site', { method: 'GET' }), env, actor);
  assert.equal(getInitial.status, 200);
  const initData = await getInitial.json();
  assert.equal(initData.ok, true);
  assert.equal(initData.homepage_sections.jobs, true);
  assert.equal(initData.homepage_sections.schemes, true);

  const putRes = await handleSiteConfig(new Request('https://csodisha.com/api/admin/site', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      homepage_sections: {
        jobs: true,
        current_affairs: false,
        mock_tests: true,
        syllabus_pyq: true,
        careers: false,
        schemes: true
      }
    })
  }), env, actor);
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.homepage_sections.current_affairs, false);
  assert.equal(putData.homepage_sections.careers, false);
  assert.equal(putData.homepage_sections.jobs, true);

  const feedAfterToggle = await buildPublicHomeFeed(env);
  assert.deepEqual(feedAfterToggle.section_visibility, {
    jobs: true,
    current_affairs: false,
    mock_tests: true,
    syllabus_pyq: true,
    careers: false,
    schemes: true
  });
});

console.log(`\n=== Homepage Live Feed v332 + v337 + v338 + v339 Results: ${passed} passed, 0 failed ===\n`);
