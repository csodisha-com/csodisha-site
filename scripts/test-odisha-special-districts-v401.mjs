/**
 * v401: /odisha-special/ 30-District Live Counters & Deep Links Verification Suite
 * Validates:
 *  1. odisha-special/index.html loads odisha-district-filter.js?v=20261127v421 and mounts the
 *     30-district live summary strip & counters with zero inline style or on* attributes
 *  2. All 30 canonical Odisha districts resolve valid /jobs/?district=<slug> and /updates/?district=<slug>
 *     deep links and compute accurate district-specific counts against /api/public/search-index data
 *     (including Kalahandi <-> Bhawanipatna matching MMU Bhawanipatna)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildSearchIndexRecords } from '../functions/_lib/public-search-index.js';

// 1. Validate odisha-special/index.html & CSS strict CSP + wiring
const html = fs.readFileSync('odisha-special/index.html', 'utf8');
assert.ok(html.includes('/assets/js/odisha-district-filter.js?v=20261127v421'), 'odisha-special/index.html must load odisha-district-filter.js?v=20261127v421');
assert.ok(html.includes('/assets/js/odisha-special-hub.js?v=20261127v421'), 'odisha-special/index.html must load odisha-special-hub.js?v=20261127v421');
assert.ok(html.includes('id="cso-od-dist-live-strip"'), 'odisha-special/index.html must include live summary strip');
assert.ok(html.includes('href="/jobs/"'), 'odisha-special/index.html must include View All Odisha Jobs CTA');
assert.ok(!/\sstyle\s*=\s*["']/i.test(html), 'odisha-special/index.html must have zero inline style="" attributes');
assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), 'odisha-special/index.html must have zero inline on* handlers');

const hubJs = fs.readFileSync('assets/js/odisha-special-hub.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(hubJs), 'odisha-special-hub.js must not use .innerHTML');
assert.ok(!/\.outerHTML\b/.test(hubJs), 'odisha-special-hub.js must not use .outerHTML');
assert.ok(!/insertAdjacentHTML/.test(hubJs), 'odisha-special-hub.js must not use insertAdjacentHTML');
assert.ok(!/\.style\./.test(hubJs), 'odisha-special-hub.js must not mutate .style.*');
assert.ok(hubJs.includes('/api/public/search-index'), 'odisha-special-hub.js fetches /api/public/search-index');
assert.ok(hubJs.includes('/jobs/?district='), 'odisha-special-hub.js links districts to /jobs/?district=<slug>');
assert.ok(hubJs.includes('/updates/?district='), 'odisha-special-hub.js links districts to /updates/?district=<slug>');

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const v401Css = styleCss.slice(styleCss.indexOf('v401:'));
assert.ok(v401Css.includes('.cso-od-live-strip') && v401Css.includes('.cso-od-live-badge'), 'assets/style.css defines v401 4-theme classes');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v401Css), 'Zero hardcoded hex colors in v401 CSS');

// 2. Execute odisha-district-filter.js + odisha-special-hub.js in VM & verify all 30 districts
const dfSrc = fs.readFileSync('assets/js/odisha-district-filter.js', 'utf8');
const sandbox = {
  globalThis: {},
  URL,
  document: {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener: () => {}
  },
  addEventListener: () => {}
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(dfSrc, sandbox);
vm.runInNewContext(hubJs, sandbox);

const df = sandbox.CSODistrictFilter;
const odHub = sandbox.CSOOdishaHub;
assert.ok(df && df.DISTRICTS.length === 30, 'CSODistrictFilter loaded with 30 districts');
assert.ok(odHub && odHub.version === 'v401' && typeof odHub.computeDistrictLiveStats === 'function', 'CSOOdishaHub v401 loaded');

const searchItems = buildSearchIndexRecords({
  jobRows: [
    {
      slug: 'mmu-bhawanipatna-itep-2026',
      title_en: 'MMU Bhawanipatna ITEP Teaching Recruitment 2026',
      organisation_en: 'Maa Manikeswari University, Bhawanipatna',
      location_district: 'Kalahandi',
      lifecycle_stage: 'notification',
      is_published: 1
    },
    {
      slug: 'bhawanipatna-exam-admit-2026',
      title_en: 'Bhawanipatna District Exam Admit Card 2026',
      organisation_en: 'Kalahandi Collectorate',
      location_district: 'Bhawanipatna',
      lifecycle_stage: 'admit_card',
      is_published: 1
    },
    {
      slug: 'bbsr-bmc-recruitment-2026',
      title_en: 'Bhubaneswar Municipal Corporation Walk-in 2026',
      organisation_en: 'BMC Bhubaneswar',
      location_district: 'Khordha',
      lifecycle_stage: 'notification',
      is_published: 1
    },
    {
      slug: 'opsc-oas-statewide-2026',
      title_en: 'OPSC OAS Civil Services 2026',
      organisation_en: 'OPSC',
      location_district: 'All Odisha',
      lifecycle_stage: 'notification',
      is_published: 1
    }
  ],
  guideRows: [
    {
      slug: 'berhampur-ganjam-handbook',
      title_en: 'Ganjam & Berhampur Recruitment Guide',
      scope: 'Odisha',
      status: 'published'
    }
  ]
});

const stats = odHub.computeDistrictLiveStats(searchItems, df);
assert.equal(Object.keys(stats.bySlug).length, 30, 'Live stats computed for all 30 districts');

// Verify Kalahandi <-> Bhawanipatna matching MMU Bhawanipatna (1 job_alert + 1 exam_update = 2 total updates)
assert.equal(stats.bySlug.kalahandi.active_jobs, 1, 'Kalahandi should have 1 active job (MMU Bhawanipatna)');
assert.equal(stats.bySlug.kalahandi.total_updates, 2, 'Kalahandi should have 2 district-specific updates');
assert.equal(stats.bySlug.kalahandi.jobs_url, '/jobs/?district=kalahandi');
assert.equal(stats.bySlug.kalahandi.updates_url, '/updates/?district=kalahandi');

// Verify Khordha <-> Bhubaneswar matching BMC
assert.equal(stats.bySlug.khordha.active_jobs, 1, 'Khordha should have 1 active job (BMC Bhubaneswar)');
assert.equal(stats.bySlug.khordha.total_updates, 1);

// Verify Ganjam <-> Berhampur guide match (0 job_alert, 1 total update)
assert.equal(stats.bySlug.ganjam.active_jobs, 0);
assert.equal(stats.bySlug.ganjam.total_updates, 1);

// Verify statewide OPSC is NOT counted as district-specific in Angul (0 district-specific)
assert.equal(stats.bySlug.angul.active_jobs, 0);
assert.equal(stats.bySlug.angul.total_updates, 0);

// Verify all 30 canonical districts have valid deep links
for (const d of df.DISTRICTS) {
  const row = stats.bySlug[d.slug];
  assert.ok(row, `Missing stats entry for ${d.slug}`);
  assert.equal(row.jobs_url, `/jobs/?district=${d.slug}`);
  assert.equal(row.updates_url, `/updates/?district=${d.slug}`);
}

console.log('✅ v401 /odisha-special/ 30-District Live Counters & Deep Links test suite passed!');
