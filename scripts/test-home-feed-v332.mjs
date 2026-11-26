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
import { handleAdminTrendingTopicsApi } from '../functions/api/admin/trending-topics.js';
import { TRENDING_TOPICS_SETTING_KEY, DEFAULT_TRENDING_TOPICS } from '../functions/_lib/trending-topics.js';
import { renderPublicGuidesHubHtml, formatGuideRow } from '../functions/_lib/informative-guides.js';
import { handleSiteConfig, HOME_SECTIONS_KEY } from '../functions/api/admin/_site.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';
import { CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';
import {
  buildJobsHubPayload,
  handlePublicJobsHubApi,
  computeDaysRemaining,
  isVerifiedGovUrl,
  ODISHA_30_DISTRICTS
} from '../functions/api/public/jobs-hub.js';
import {
  buildExamsHubPayload,
  handlePublicExamsHubApi,
  FLAGSHIP_EXAM_TRACKS,
  DAILY_QUIZ_BANK
} from '../functions/api/public/exams-hub.js';
import {
  buildScholarshipsHubPayload,
  handlePublicScholarshipsHubApi,
  FLAGSHIP_SCHOLARSHIPS
} from '../functions/api/public/scholarships-hub.js';
import {
  buildStudyHubPayload,
  handlePublicStudyHubApi,
  CORE_STUDY_PACKS
} from '../functions/api/public/study-hub.js';
import {
  buildCareersHubPayload,
  handlePublicCareersHubApi,
  CORE_CAREER_ROADMAPS
} from '../functions/api/public/careers-hub.js';

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
    if (/^DELETE FROM site_settings WHERE key = \?/i.test(s)) {
      siteSettings.delete(String(params[0] || ''));
      return { run: { success: true } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM job_articles/i.test(s)) {
      return { first: { c: jobPublished ? 2 : 0 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM posts WHERE type = 'job'/i.test(s)) {
      return { first: { c: 1 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM mock_tests/i.test(s)) {
      return { first: { c: 3 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM scheme_articles/i.test(s)) {
      return { first: { c: 4 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM study_articles/i.test(s)) {
      return { first: { c: 5 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM resources/i.test(s)) {
      return { first: { c: 2 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM careers_articles/i.test(s)) {
      return { first: { c: 3 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM cso_current_affairs/i.test(s)) {
      return { first: { c: 6 } };
    }
    if (/^SELECT COUNT\(\*\) AS c FROM posts WHERE type = 'current_affair'/i.test(s)) {
      return { first: { c: 1 } };
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
    if (/FROM informative_guides/i.test(s)) {
      return {
        results: [
          {
            id: 'guide_1',
            slug: 'how-to-apply-odisha-post-matric-scholarship',
            category: 'how-to',
            title_en: 'How to Apply for Odisha Post-Matric Scholarship 2026',
            title_or: 'ଓଡ଼ିଶା ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ବୃତ୍ତି ୨୦୨୬ କିପରି ଆବେଦନ କରିବେ',
            read_minutes: 6,
            tags: 'Odisha Scholarship, How-To, Exam',
            scope: 'Odisha',
            is_pinned: 0,
            is_exam: 1,
            created_at: '2026-11-26T01:00:00Z',
            updated_at: '2026-11-26T01:00:00Z'
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
  assert.equal(data.version, 'v369');
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
  const guideLu = data.latest_updates.find((x) => x.entity_type === 'guide');
  assert.ok(guideLu && guideLu.badge_type === 'GUIDE' && guideLu.cta_label === 'Read Guide →' && guideLu.url === '/guides/how-to-apply-odisha-post-matric-scholarship', 'home-feed latest_updates must include published informative_guides with GUIDE badge & Read Guide → CTA');
  assert.ok(guideLu.filter_tags.includes('education') && guideLu.filter_tags.includes('exams') && guideLu.filter_tags.includes('odisha'), 'informative_guides item must include education + exams filter tags when tagged');
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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v376');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v376';"));
  assert.ok(read('sw.js').includes('CSO_BUST_HOME_CACHE'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/guides') && CONTENT_PUBLIC_PATHS.includes('/guides/') && CONTENT_PUBLIC_PATHS.includes('/sitemap.xml') && CONTENT_PUBLIC_PATHS.includes('/api/home/feed'), 'CONTENT_PUBLIC_PATHS must purge /api/public/guides, /guides/, /sitemap.xml, and /api/home/feed');
  assert.ok(hydJs.includes("GUIDE: 'cso-lu-badge cso-lu-badge--guide'"), 'home-hydration.js must map GUIDE badge class');
  assert.ok(read('assets/style.css').includes('.cso-lu-badge--guide'), 'assets/style.css must style .cso-lu-badge--guide');

  // v352: Lower homepage duplicate promo cards removed & tightened 4-col/2-col Important Tools horizontal grid
  assert.ok(!indexHtml.includes('cso-action-hub-section'), 'Duplicate lower-homepage .cso-action-hub-section must be removed from index.html');
  assert.ok(!indexHtml.includes('cso-action-hub-grid'), 'Orphaned .cso-action-hub-grid wrapper must be removed from index.html');
  assert.ok(!indexHtml.includes('Free Study Library'), 'Duplicate Free Study Library promo card must be removed from index.html');
  assert.ok(!indexHtml.includes('Instant Notice Alerts'), 'Duplicate Instant Notice Alerts promo card must be removed from index.html');
  assert.ok(!indexHtml.includes('CSO Community Forum'), 'Duplicate CSO Community Forum promo card must be removed from index.html');
  assert.ok(indexHtml.includes('id="cso-tools"') && indexHtml.includes('data-feed-key="important_tools"'), 'index.html must include #cso-tools with D1 visibility key');
  assert.ok(indexHtml.includes('data-title-en="Age &amp; Eligibility Date Calculator"') && indexHtml.includes('data-title-or='), 'Important Tools cards must preserve bilingual EN/ଓଡ଼ିଆ attributes');
  assert.equal((indexHtml.match(/class="card tl tool-card"/g) || []).length, 8, 'Important Tools must render all 8 (4x2) compact tool cards');
  assert.ok(indexHtml.includes('/assets/style.css?v=20261126v376') && indexHtml.includes('/assets/js/homepage-blocks.js?v=20261126v376') && indexHtml.includes('/assets/js/home-hydration.js?v=20261126v376'), 'index.html must reference v367 cache-busted assets');
  const styleV352 = read('assets/style.css');
  assert.ok(!styleV352.includes('.cso-action-hub-section'), 'Orphaned .cso-action-hub-section CSS must be removed from style.css');
  assert.ok(styleV352.includes('grid-template-columns: repeat(4, minmax(0, 1fr)) !important;'), 'Important Tools desktop grid must be 4 columns');
  assert.ok(styleV352.includes('flex-direction: row !important;') && styleV352.includes('padding: 12px 14px !important;'), 'Important Tools cards must use streamlined horizontal 12px 14px layout');
  assert.ok(!read('assets/js/homepage-blocks.js').includes("replaceKids(hub"), 'homepage-blocks.js must never re-inject retired action_hub promo cards onto homepage');
  assert.ok(hydJs.includes("map, 'important_tools'"), 'home-hydration.js must honor Admin Studio important_tools visibility');

  // v343: Mobile slide-out drawer sits strictly above backdrop (1210 > 1200) with zero stacking-context trap
  const navStart = indexHtml.indexOf('<nav class="main-nav site-header__nav" id="cso-main-navbar"');
  const navEnd = indexHtml.indexOf('</nav>', navStart);
  const backdropIdx = indexHtml.indexOf('id="cso-mobile-drawer-backdrop"');
  assert.ok(backdropIdx > navStart && backdropIdx < navEnd, 'index.html must mount #cso-mobile-drawer-backdrop inside #cso-main-navbar');
  const styleV343 = read('assets/style.css');
  assert.ok(styleV343.includes('html.cso-drawer-open .cso-sticky-header') && styleV343.includes('z-index: 1210 !important;'), 'style.css must elevate .cso-sticky-header and drawer to z-index 1210 when open');
  assert.ok(styleV343.includes('z-index: 1200 !important;') && styleV343.includes('pointer-events: auto !important;'), 'style.css must layer backdrop at 1200 strictly below interactive drawer at 1210');
  assert.ok(read('assets/app.js').includes("classList.toggle('cso-drawer-open'") && read('assets/shared-header.js').includes("classList.toggle('cso-drawer-open'"), 'Both app.js and shared-header.js must toggle cso-drawer-open');

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

await test('6. v367 Trending & Popular Topics: live D1 counts, bilingual EN/ଓଡ଼ିଆ DOM, smart /guides/?category= routing & Admin API CRUD/reset', async () => {
  const db = createMockDb();
  const env = { DB: db };
  const actor = { userId: 'adm_1', email: 'admin@csodisha.com', role: 'admin' };

  assert.equal(TRENDING_TOPICS_SETTING_KEY, 'homepage_trending_topics_json');
  assert.equal(DEFAULT_TRENDING_TOPICS.length, 6);

  // 1. Public home feed returns all 6 default trending_topics with real D1 counts & Odia titles
  const initialFeed = await buildPublicHomeFeed(env);
  assert.equal(initialFeed.version, 'v369');
  assert.ok(Array.isArray(initialFeed.trending_topics) && initialFeed.trending_topics.length === 6, 'trending_topics must return 6 default topics');
  const jobsTopic = initialFeed.trending_topics.find((t) => t.id === 'jobs');
  const examsTopic = initialFeed.trending_topics.find((t) => t.id === 'exams');
  const schemesTopic = initialFeed.trending_topics.find((t) => t.id === 'schemes');
  const studyTopic = initialFeed.trending_topics.find((t) => t.id === 'study');
  const careerTopic = initialFeed.trending_topics.find((t) => t.id === 'career');
  const odishaTopic = initialFeed.trending_topics.find((t) => t.id === 'odisha');
  assert.equal(jobsTopic.href, '/jobs/');
  assert.equal(examsTopic.href, '/exams/');
  assert.equal(schemesTopic.href, '/scholarships/');
  assert.equal(studyTopic.href, '/study-materials/');
  assert.equal(careerTopic.href, '/career-paths/');
  assert.equal(odishaTopic.href, '/guides/?category=odisha-gk');
  assert.ok(jobsTopic.item_count >= 3 && examsTopic.item_count >= 4 && schemesTopic.item_count >= 5 && studyTopic.item_count >= 7 && careerTopic.item_count >= 4 && odishaTopic.item_count >= 7, 'Each trending topic must aggregate live D1 counts');
  assert.ok(jobsTopic.title_or.length > 0 && odishaTopic.title_or.length > 0, 'Every trending topic must carry Odia bilingual labels');

  // 2. Admin GET / PUT custom topics / Reset to Default 6 Topics
  const adminGet = await handleAdminTrendingTopicsApi(new Request('https://csodisha.com/api/admin/trending-topics', { method: 'GET' }), env, actor);
  assert.equal(adminGet.status, 200);
  const adminGetData = await adminGet.json();
  assert.equal(adminGetData.ok, true);
  assert.equal(adminGetData.is_custom, false);
  assert.equal(adminGetData.topics.length, 6);

  const customList = [
    { ...DEFAULT_TRENDING_TOPICS[1], sort_order: 1, title_en: 'OAVS & OPSC Prep', title_or: 'OAVS ଓ OPSC ପ୍ରସ୍ତୁତି', badge_text: 'HOT', enabled: true },
    { ...DEFAULT_TRENDING_TOPICS[0], sort_order: 2, badge_text: '2026', enabled: true },
    { ...DEFAULT_TRENDING_TOPICS[2], sort_order: 3, enabled: false }
  ];
  const adminPut = await handleAdminTrendingTopicsApi(new Request('https://csodisha.com/api/admin/trending-topics', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topics: customList })
  }), env, actor);
  assert.equal(adminPut.status, 200);
  const putData = await adminPut.json();
  assert.equal(putData.is_custom, true);
  assert.equal(putData.topics.length, 3);

  const customFeed = await buildPublicHomeFeed(env);
  assert.equal(customFeed.trending_topics.length, 2, 'Disabled trending topic must be omitted from public feed');
  assert.equal(customFeed.trending_topics[0].title_en, 'OAVS & OPSC Prep');
  assert.equal(customFeed.trending_topics[0].title_or, 'OAVS ଓ OPSC ପ୍ରସ୍ତୁତି');

  const adminReset = await handleAdminTrendingTopicsApi(new Request('https://csodisha.com/api/admin/trending-topics', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset: true })
  }), env, actor);
  assert.equal(adminReset.status, 200);
  const resetFeed = await buildPublicHomeFeed(env);
  assert.equal(resetFeed.trending_topics.length, 6, 'Reset must restore default 6 trending topics');

  // 3. Smart /guides/?category=<topic> filtering in SSR hub
  const sampleGuides = [
    formatGuideRow({ id: 'g1', slug: 'oavs-recruitment-2026', category: 'how-to', title_en: 'OAVS Recruitment 2026 Complete Guide', summary_en: '815 teacher vacancies & apply steps', tags: 'OAVS, Recruitment, Teaching', scope: 'Odisha', is_exam: 1, status: 'published' }),
    formatGuideRow({ id: 'g2', slug: 'oavs-25-day-prep', category: 'exam-strategy', title_en: 'OAVS 25-Day Preparation Strategy & Notes', summary_en: 'Syllabus, PYQ trend & revision plan', tags: 'Exam Prep, Study Notes, PYQ', scope: 'Odisha', is_exam: 1, status: 'published' }),
    formatGuideRow({ id: 'g3', slug: 'odisha-post-matric-scholarship', category: 'citizen-scheme', title_en: 'Odisha Post-Matric Scholarship Portal', summary_en: 'DBT financial aid & stipend guide', tags: 'Scholarship, Scheme, Odisha', scope: 'Odisha', is_exam: 0, status: 'published' }),
    formatGuideRow({ id: 'g4', slug: 'odisha-heritage-gk', category: 'odisha-gk', title_en: 'Odisha Heritage & Konark GK Handbook', summary_en: 'Complete Odisha state history & districts', tags: 'Odisha, Heritage, GK', scope: 'Odisha', is_exam: 0, status: 'published' })
  ];
  for (const [alias, expectedSlug] of [
    ['recruitment', 'oavs-recruitment-2026'],
    ['exam-prep', 'oavs-25-day-prep'],
    ['scholarships', 'odisha-post-matric-scholarship'],
    ['study-notes', 'oavs-25-day-prep'],
    ['career', 'oavs-recruitment-2026'],
    ['odisha-gk', 'odisha-heritage-gk']
  ]) {
    const html = renderPublicGuidesHubHtml(sampleGuides, new URL(`https://csodisha.com/guides/?category=${alias}`));
    assert.ok(html.includes(`/guides/${expectedSlug}`), `/guides/?category=${alias} must match ${expectedSlug}`);
  }

  // 4. Static HTML fallback & client hydration guards
  const indexHtml = read('index.html');
  assert.ok(indexHtml.includes('id="cso-trending-topics" data-v367-trending="1"'), 'index.html must tag #cso-trending-topics with data-v367-trending="1"');
  assert.ok(indexHtml.includes('data-en="Trending &amp; Popular Topics"') && indexHtml.includes('data-or="ଟ୍ରେଣ୍ଡିଂ ଓ ଲୋକପ୍ରିୟ ବିଷୟବସ୍ତୁ"'), 'index.html must include bilingual Trending heading');
  assert.ok(indexHtml.includes('href="/guides/" class="cso-h2-link" data-en="View All Topics →" data-or="ସମସ୍ତ ବିଷୟ ଦେଖନ୍ତୁ →"'), 'View All Topics must link directly to /guides/ with bilingual labels');
  for (const href of ['/jobs/', '/exams/', '/scholarships/', '/study-materials/', '/career-paths/', '/guides/?category=odisha-gk']) {
    assert.ok(indexHtml.includes(`href="${href}"`), `index.html missing trending card href ${href}`);
  }
  assert.equal((indexHtml.match(/class="cso-topic-count"/g) || []).length, 6, 'index.html must include 6 .cso-topic-count placeholders for zero CLS');

  const blocksJs = read('assets/js/homepage-blocks.js');
  assert.ok(blocksJs.includes("getAttribute('data-v367-trending') === '1'"), 'homepage-blocks.js must not overwrite v367 trending grid');
  const hydJs = read('assets/js/home-hydration.js');
  assert.ok(hydJs.includes('renderTrendingTopicsSection') && hydJs.includes('formatTopicCount') && hydJs.includes('toOdiaDigits'), 'home-hydration.js must hydrate live counts & Odia digits');
  assert.ok(read('_worker.js').includes("pathname === '/api/home/feed'"), '_worker.js must alias /api/home/feed');
});

await test('v369 Homepage: zero blank action pills, 30-district selector, 8-card tools grid, 2026 footer + /guides/ link', async () => {
  const html = read('index.html');
  const acts = [...html.matchAll(/<a [^>]*class="cso-hf-row__act[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.ok(acts.length >= 18, 'index.html must keep all 18 feed row action pills');
  for (const m of acts) assert.ok(m[1].replace(/&[a-z]+;/g, 'x').trim().length > 0, 'blank action pill in index.html');
  for (const lab of ['Notice &rarr;', 'Brief &rarr;', 'Roadmap &rarr;', 'Scheme &rarr;', '>Start<', '>PDF<']) assert.ok(html.includes(lab), `missing action label ${lab}`);
  const hyd = read('assets/js/home-hydration.js');
  assert.ok(hyd.includes("'Notice \\u2192'") && hyd.includes("'Brief \\u2192'") && hyd.includes("'Roadmap \\u2192'") && hyd.includes("'Scheme \\u2192'"), 'hydration must render labelled pills');
  assert.ok(hyd.includes("|| 'Open \\u2192'"), 'buildCompactFeedRow must never emit an empty pill');
  const sel = html.match(/<select class="cso-dist-select"[\s\S]*?<\/select>/)[0];
  const opts = [...sel.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(opts.length, 30, 'selector must hold 30 districts');
  assert.deepEqual(opts, [...opts].sort(), 'districts must be alphabetical');
  assert.ok(opts[0] === 'Angul' && opts[29] === 'Sundargarh');
  assert.equal((html.match(/class="cso-hero-kpi"/g) || []).length, 4, '4 KPI tiles');
  const grid = html.slice(html.indexOf('id="cso-tools-grid"'), html.indexOf('</main>'));
  assert.equal((grid.match(/class="card tl tool-card"/g) || []).length, 8, '8 tool cards');
  assert.ok(grid.includes('ORSP Pay &amp; Salary Estimator') && grid.includes('30-District Odisha Explorer'));
  assert.ok(html.includes('© 2026 Common Sense Odisha. All rights reserved.') && html.includes('<a href="/guides/">Informative Guides</a>'));
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'no inline handlers');
  assert.ok(ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
});

await test('v370 Homepage colored hover/focus CSS uses semantic --cso-* tokens, zero hex, reduced-motion, SW v370', async () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v370'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v370 CSS');
  for (const t of ['.cso-topic-card--odisha', '#cso-home-jobs-section', '.cso-hf-row:hover .cso-hf-row__act', '.cso-lu-item:hover .cso-lu-cta', 'translateX(3px)', 'border-left: 3px solid transparent', '.cso-dist-chip:hover', '.hero .search-chip:hover']) assert.ok(blk.includes(t), `v370 CSS missing ${t}`);
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(read('sw.js').includes("cso-candidate-cache-v376") && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
  assert.ok(read('index.html').includes('?v=20261126v376'));
});

await test('v371 Sharpened colored hover: ID-scoped specificity, purple Exams, tinted washes, ring + glow, SW v371', async () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v371'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk.replace(/#main-content|#cso-trending-topics|#cso-tools/g, '')), 'zero hardcoded hex in v371 CSS');
  for (const t of ['#main-content #cso-trending-topics .cso-topic-card--exams', '#main-content #cso-trending-topics .cso-topic-card:hover .cso-topic-card__badge', 'background: var(--card-accent);', 'color: var(--card-on);', '#main-content .cso-hf-section:hover', '#main-content #cso-tools .card.tl:hover', '#main-content .cso-dist-chip:hover', '#main-content .hero .search-chip:hover', '16%', '15%', '12%']) assert.ok(blk.includes(t), `v371 CSS missing ${t}`);
  assert.ok(read('sw.js').includes('cso-candidate-cache-v376') && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
  assert.ok(read('index.html').includes('?v=20261126v376'));
});

await test('v372 Live Jobs & Recruitment Hub: /api/public/jobs-hub aggregation, IST countdown, .gov.in badge, 30 districts & /jobs/ UI', async () => {
  assert.equal(ODISHA_30_DISTRICTS.length, 30, 'ODISHA_30_DISTRICTS must contain 30 districts');
  assert.equal(computeDaysRemaining('2026-11-29', '2026-11-26T10:00:00Z'), 3, 'IST countdown must be 3 days');
  assert.equal(isVerifiedGovUrl('https://opsc.gov.in/Public/OPSC/Default.aspx'), true);
  assert.equal(isVerifiedGovUrl('https://odisha.nic.in/portal'), true);
  assert.equal(isVerifiedGovUrl('https://example.com/fake'), false);

  const mockHubDb = {
    prepare(sql) {
      const q = String(sql || '');
      return {
        bind() { return this; },
        async all() {
          if (q.includes('FROM job_articles')) {
            return {
              results: [{
                id: 'ja1', slug: 'opsc-oas-2026', title_en: 'OPSC OAS 2026 Notification — 399 Posts',
                title_or: 'OPSC OAS 2026 ବିଜ୍ଞପ୍ତି', summary_en: 'Combined Civil Services exam.',
                summary_or: '', organisation_en: 'OPSC', total_vacancies: 399,
                qualification_level: 'Graduate', qualification_summary: 'Graduate',
                location_district: 'Khordha', last_date: '2026-11-29',
                official_apply_url: 'https://opsc.gov.in/apply', official_website_url: 'https://opsc.gov.in',
                lifecycle_stage: 'notification', published_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z'
              }]
            };
          }
          if (q.includes('FROM posts')) {
            return {
              results: [{
                id: 'p1', slug: 'oavs-admit-card-2026', title: 'OAVS Teacher Admit Card 2026 Released',
                title_or: 'OAVS ଆଡମିଟ୍ କାର୍ଡ', summary: 'Download hall ticket.',
                department: 'OAVS', category: 'admit_card', district: 'Cuttack',
                qualification: 'B.Ed', vacancies: 1342, last_date: '2026-12-10',
                official_url: 'https://oav.edu.in', published_at: '2026-11-21T00:00:00Z', updated_at: '2026-11-21T00:00:00Z'
              }]
            };
          }
          if (q.includes('FROM informative_guides')) {
            return {
              results: [{
                id: 'g1', slug: 'osssc-peo-recruitment-guide', title_en: 'OSSSC PEO Recruitment Strategy Guide',
                title_or: 'OSSSC PEO ନିଯୁକ୍ତି ଗାଇଡ୍', summary_en: 'Complete syllabus & vacancy prep.',
                summary_or: '', category: 'exam-strategy', tags: 'recruitment,osssc',
                scope: 'Odisha', is_exam: 1, published_at: '2026-11-22T00:00:00Z', updated_at: '2026-11-22T00:00:00Z'
              }]
            };
          }
          return { results: [] };
        }
      };
    }
  };

  const payload = await buildJobsHubPayload(mockHubDb, { nowIso: '2026-11-26T10:00:00Z' });
  assert.equal(payload.ok, true);
  assert.equal(payload.version, 'v372');
  assert.equal(payload.summary.total_active, 3);
  assert.equal(payload.summary.closing_soon, 1);
  assert.equal(payload.summary.verified_gov_count, 1);
  assert.equal(payload.summary.districts_covered, 30);
  const opsc = payload.items.find((x) => x.organization === 'OPSC');
  assert.ok(opsc && opsc.is_closing_soon && opsc.days_remaining === 3 && opsc.is_verified_gov && opsc.district === 'Khordha');
  const guide = payload.items.find((x) => x.source_type === 'guide');
  assert.ok(guide && guide.detail_url === '/guides/osssc-peo-recruitment-guide');

  const res = await handlePublicJobsHubApi(new Request('https://csodisha.com/api/public/jobs-hub?org=opsc&district=Khordha'), { DB: mockHubDb });
  assert.equal(res.status, 200);
  const filtered = await res.json();
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].organization, 'OPSC');

  const jobsHtml = read('jobs/index.html');
  assert.ok(jobsHtml.includes('id="cso-jobs-hub-root"') && jobsHtml.includes('/assets/js/jobs-hub.js?v=20261126v376'), '/jobs/index.html must mount jobs-hub.js');
  assert.ok(jobsHtml.includes('/guides/?category=recruitment'), '/jobs/index.html must cross-link recruitment guides');
  assert.ok(!/\son[a-z]+="/i.test(jobsHtml.replace(/<svg[\s\S]*?<\/svg>/g, '')), '/jobs/index.html must have zero inline handlers');
  const sel = jobsHtml.match(/<select id="cso-jh-district"[\s\S]*?<\/select>/)[0];
  const opts = [...sel.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(opts.length, 30, '/jobs/ district selector must hold all 30 Odisha districts');
  assert.deepEqual(opts, ODISHA_30_DISTRICTS, '/jobs/ districts must be alphabetical Angul -> Sundargarh');
  assert.ok(read('_worker.js').includes("pathname === '/api/public/jobs-hub'"), '_worker.js must route /api/public/jobs-hub');
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/jobs-hub'), 'edge-cache-invalidator must purge /api/public/jobs-hub');
  assert.ok(read('sw.js').includes('cso-candidate-cache-v376') && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
});

await test('v373 Exams & Prep Hub: /api/public/exams-hub 7 flagship tracks, IST countdowns, 5 bilingual MCQs & /exams/ UI', async () => {
  assert.equal(FLAGSHIP_EXAM_TRACKS.length, 7, 'Must include all 7 flagship Odisha & National exam tracks');
  assert.equal(DAILY_QUIZ_BANK.length, 5, 'Must include 5 daily bilingual practice MCQs');
  for (const q of DAILY_QUIZ_BANK) {
    assert.ok(q.question_en && q.question_or && q.options_en.length === 4 && q.options_or.length === 4 && q.explanation_en && q.explanation_or, 'Each MCQ must be fully bilingual');
  }

  const mockExamDb = {
    prepare(sql) {
      const q = String(sql || '');
      return {
        bind() { return this; },
        async all() {
          if (q.includes('FROM informative_guides')) {
            return {
              results: [{
                id: 'eg1', slug: 'oavs-25-day-prep-sprint', title_en: 'OAVS 2026 25-Day Prep Sprint & Strategy',
                title_or: 'OAVS ୨୫-ଦିନ ପ୍ରସ୍ତୁତି ରଣନୀତି', summary_en: 'Daily timetable for OAVS TGT/PGT.',
                summary_or: '', category: 'exam-strategy', tags: 'oavs,strategy,exam-prep',
                scope: 'Odisha', is_exam: 1, published_at: '2026-11-24T00:00:00Z', updated_at: '2026-11-24T00:00:00Z'
              }]
            };
          }
          if (q.includes('FROM mock_tests')) {
            return {
              results: [{
                id: 'm1', slug: 'oavs-cbt-mock-1', title_en: 'OAVS 2026 Full-Length CBT Mock #1',
                title_or: 'OAVS CBT ମକ୍ ଟେଷ୍ଟ ୧', exam_category: 'OAVS', duration_minutes: 180,
                negative_marking: 0.25, published_at: '2026-11-25T00:00:00Z', updated_at: '2026-11-25T00:00:00Z'
              }]
            };
          }
          if (q.includes('FROM study_articles')) {
            return {
              results: [{
                id: 's1', slug: 'opsc-oas-syllabus-2026', title_en: 'OPSC OAS Official Syllabus & Prelims PYQ Pack',
                title_or: 'OPSC OAS ସିଲାବସ୍ ଓ PYQ', summary_en: 'Complete GS & CSAT papers.',
                summary_or: '', exam_tag: 'OPSC OAS', resource_type: 'Syllabus',
                published_at: '2026-11-22T00:00:00Z', updated_at: '2026-11-22T00:00:00Z'
              }]
            };
          }
          return { results: [] };
        }
      };
    }
  };

  const payload = await buildExamsHubPayload(mockExamDb, { nowIso: '2026-11-26T10:00:00Z' });
  assert.equal(payload.ok, true);
  assert.equal(payload.version, 'v373');
  assert.equal(payload.summary.active_tracks, 7);
  assert.equal(payload.summary.live_guides, 1);
  assert.equal(payload.summary.cbt_mocks, 1);
  assert.equal(payload.summary.daily_mcqs, 5);
  const oavs = payload.exam_tracks.find((t) => t.id === 'oavs-2026');
  assert.ok(oavs && oavs.days_to_exam === 25 && oavs.guide_count === 1 && oavs.mock_count === 1 && oavs.primary_guide_url === '/guides/oavs-25-day-prep-sprint');

  const res = await handlePublicExamsHubApi(new Request('https://csodisha.com/api/public/exams-hub?family=teaching&type=mock'), { DB: mockExamDb });
  assert.equal(res.status, 200);
  const filtered = await res.json();
  assert.equal(filtered.exam_tracks.length, 2, 'Teaching family must return OAVS + OTET/OSSTET');
  assert.equal(filtered.items.length, 1, 'Mock filter must return CBT mock');

  const examsHtml = read('exams/index.html');
  assert.ok(examsHtml.includes('id="cso-exams-hub-root"') && examsHtml.includes('/assets/js/exams-hub.js?v=20261126v376'));
  assert.ok(examsHtml.includes('/guides/?category=exam-prep') && examsHtml.includes('id="cso-eh-quiz-root"'));
  assert.ok(!/\son[a-z]+="/i.test(examsHtml.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'exams/index.html must have zero inline handlers');
  assert.ok(read('_worker.js').includes("pathname === '/api/public/exams-hub'"));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/exams-hub'));
  assert.ok(read('sw.js').includes('cso-candidate-cache-v376') && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
});

await test('v374 Scholarships Hub: /api/public/scholarships-hub Odisha + NSP schemes, eligibility filters, document checklists & /scholarships/ UI', async () => {
  assert.equal(FLAGSHIP_SCHOLARSHIPS.length, 8, 'Must include all 8 verified flagship Odisha & NSP scholarships');
  const mockDb = {
    prepare(sql) {
      const q = String(sql || '');
      return {
        bind() { return this; },
        async all() {
          if (q.includes('FROM informative_guides')) {
            return {
              results: [{
                id: 'sg1', slug: 'odisha-post-matric-db-guide', title_en: 'How to Apply for Odisha Post-Matric Scholarship DBT',
                title_or: 'ପୋଷ୍ଟ-ମାଟ୍ରିକ୍ ବୃତ୍ତି ଆବେଦନ ଗାଇଡ୍', summary_en: 'Step-by-step NPCI Aadhaar seeding guide.',
                summary_or: '', category: 'citizen-scheme', tags: 'scholarship,post-matric,dbt',
                scope: 'Odisha', published_at: '2026-11-24T00:00:00Z', updated_at: '2026-11-24T00:00:00Z'
              }]
            };
          }
          return { results: [] };
        }
      };
    }
  };

  const payload = await buildScholarshipsHubPayload(mockDb, { nowIso: '2026-11-26T10:00:00Z' });
  assert.equal(payload.ok, true);
  assert.equal(payload.version, 'v374');
  assert.ok(payload.summary.active_scholarships >= 9, 'Must merge D1 guides with 8 flagship programs');
  assert.ok(payload.summary.verified_gov_portals >= 2, 'Must include scholarship.odisha.gov.in and scholarships.gov.in');
  const medha = payload.items.find((x) => x.id === 'odisha-e-medhabruti');
  assert.ok(medha && medha.is_verified_gov && medha.required_docs.length >= 4 && medha.portal_domain === 'scholarship.odisha.gov.in');

  const res = await handlePublicScholarshipsHubApi(new Request('https://csodisha.com/api/public/scholarships-hub?portal=nsp'), { DB: mockDb });
  assert.equal(res.status, 200);
  const filtered = await res.json();
  assert.ok(filtered.items.length >= 1 && filtered.items.every((x) => x.portal_source === 'nsp'), 'NSP filter must return only NSP schemes');

  const html = read('scholarships/index.html');
  assert.ok(html.includes('id="cso-scholarships-hub-root"') && html.includes('/assets/js/scholarships-hub.js?v=20261126v376'));
  assert.ok(html.includes('/guides/?category=scholarships') && html.includes('id="cso-sh-category"') && html.includes('id="cso-sh-portal"'));
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'scholarships/index.html must have zero inline handlers');
  assert.ok(read('_worker.js').includes("pathname === '/api/public/scholarships-hub'"));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/scholarships-hub'));
  assert.ok(read('sw.js').includes('cso-candidate-cache-v376') && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
});

await test('v375 Study Materials Hub: /api/public/study-hub PYQ vault, bilingual filters, offline save & /study-materials/ UI', async () => {
  assert.equal(CORE_STUDY_PACKS.length, 7, 'Must include all 7 structured Odisha core study & PYQ packs');
  const mockDb = {
    prepare(sql) {
      const q = String(sql || '');
      return {
        bind() { return this; },
        async all() {
          if (q.includes('FROM study_articles')) {
            return {
              results: [{
                id: 'sa1', slug: 'opsc-polity-notes-2026', title_en: 'OPSC OAS Indian Polity & Odisha Governance Notes',
                title_or: 'OPSC ଭାରତୀୟ ରାଜନୀତି ନୋଟ୍ସ', summary_en: 'High-yield polity revision.',
                summary_or: '', exam_tag: 'OPSC', resource_type: 'Study Notes',
                pdf_url: '/files/opsc-polity.pdf', published_at: '2026-11-24T00:00:00Z', updated_at: '2026-11-24T00:00:00Z'
              }]
            };
          }
          return { results: [] };
        }
      };
    }
  };

  const payload = await buildStudyHubPayload(mockDb);
  assert.equal(payload.ok, true);
  assert.equal(payload.version, 'v375');
  assert.ok(payload.summary.total_resources >= 8 && payload.summary.pyq_count >= 2 && payload.summary.bilingual_count >= 7);

  const res = await handlePublicStudyHubApi(new Request('https://csodisha.com/api/public/study-hub?format=pyq&exam=opsc'), { DB: mockDb });
  assert.equal(res.status, 200);
  const filtered = await res.json();
  assert.ok(filtered.items.length >= 1 && filtered.items.every((x) => x.format_tab === 'pyq' && x.exam_key === 'opsc'));

  const html = read('study-materials/index.html');
  assert.ok(html.includes('id="cso-study-hub-root"') && html.includes('/assets/js/study-materials-hub.js?v=20261126v376'));
  assert.ok(html.includes('/guides/?category=study-notes') && html.includes('id="cso-sm-subject"') && html.includes('id="cso-sm-language"'));
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'study-materials/index.html must have zero inline handlers');
  const js = read('assets/js/study-materials-hub.js');
  assert.ok(js.includes('OFFLINE_STUDY_CACHE') && js.includes('caches.open'), 'study-materials-hub.js must implement offline cache save');
  assert.ok(read('_worker.js').includes("pathname === '/api/public/study-hub'"));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/study-hub'));
  assert.ok(read('sw.js').includes('cso-candidate-cache-v376') && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
});

await test('v376 Career Paths Hub: /api/public/careers-hub 8 ORSP roadmaps, qualification matcher, stage stepper & /career-paths/ UI', async () => {
  assert.equal(CORE_CAREER_ROADMAPS.length, 8, 'Must include all 8 structured Odisha & Central career roadmaps');
  const payload = await buildCareersHubPayload(null);
  assert.equal(payload.ok, true);
  assert.equal(payload.version, 'v376');
  assert.equal(payload.summary.career_tracks, 8);
  const oas = payload.items.find((x) => x.id === 'opsc-oas-civil');
  assert.ok(oas && oas.pay_level.includes('Level-12') && oas.selection_stages.length === 3);

  const res = await handlePublicCareersHubApi(new Request('https://csodisha.com/api/public/careers-hub?qual=pg&domain=teaching'), {});
  assert.equal(res.status, 200);
  const filtered = await res.json();
  assert.ok(filtered.items.length >= 2 && filtered.items.every((x) => x.domain_key === 'teaching'));

  const html = read('career-paths/index.html');
  assert.ok(html.includes('id="cso-careers-hub-root"') && html.includes('/assets/js/career-paths-hub.js?v=20261126v376'));
  assert.ok(html.includes('/guides/?category=career') && html.includes('data-qual="bed-prof"') && html.includes('data-domain="healthcare"'));
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'career-paths/index.html must have zero inline handlers');
  assert.ok(read('_worker.js').includes("pathname === '/api/public/careers-hub'"));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/careers-hub'));
  assert.ok(read('sw.js').includes('cso-candidate-cache-v376') && ACTIVE_SW_CACHE_VERSION === 'cso-candidate-cache-v376');
});

console.log(`\n=== Homepage Live Feed v332 + v337 + v338 + v339 + v367 Results: ${passed} passed, 0 failed ===\n`);
