/**
 * v400: Public District-Wise Odisha Recruitment & Exam Filter Verification Suite
 * Validates:
 *  1. All 30 Odisha districts in alphabetical order + HQ/alias mappings
 *     (kalahandi <-> bhawanipatna, khordha <-> bhubaneswar/khurda, ganjam <-> chhatrapur/berhampur,
 *      subarnapur <-> sonepur, kendujhar <-> keonjhar, mayurbhanj <-> baripada, etc.)
 *     and matchDistrict() district-only vs includeStatewide behavior
 *  2. /jobs/ and /updates/ HTML shells & JS controllers mount the 30-district selector bar
 *     and sync ?district= URL query params with strict CSP compliance
 *  3. /feed.json (syndication-feeds.js) & /api/public/search-index (public-search-index.js)
 *     expose normalized district metadata cleanly
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { collectUnifiedFeedItems, renderJsonFeed11 } from '../functions/_lib/syndication-feeds.js';
import { buildSearchIndexRecords } from '../functions/_lib/public-search-index.js';

// 1. Load assets/js/odisha-district-filter.js & verify strict CSP
const dfSrc = fs.readFileSync('assets/js/odisha-district-filter.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(dfSrc), 'odisha-district-filter.js must not use .innerHTML');
assert.ok(!/\.outerHTML\b/.test(dfSrc), 'odisha-district-filter.js must not use .outerHTML');
assert.ok(!/insertAdjacentHTML/.test(dfSrc), 'odisha-district-filter.js must not use insertAdjacentHTML');
assert.ok(!/\.style\./.test(dfSrc), 'odisha-district-filter.js must not mutate .style.*');

const sandbox = { globalThis: {}, URL };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(dfSrc, sandbox);
const df = sandbox.CSODistrictFilter;
assert.ok(df && df.version === 'v400', 'CSODistrictFilter v400 loaded');
assert.equal(df.DISTRICTS.length, 30, 'Must contain all 30 Odisha districts');

// Verify strict alphabetical slug ordering
const slugs = Array.from(df.DISTRICTS, (d) => d.slug);
const sortedSlugs = [...slugs].sort();
assert.deepEqual(slugs, sortedSlugs, 'All 30 district slugs must be in alphabetical order');
for (const d of df.DISTRICTS) {
  assert.ok(d.en && d.or && d.hq && Array.isArray(d.aliases), `District ${d.slug} must have EN, Odia, HQ & aliases`);
}

// Verify HQ & spelling alias resolution
const aliasCases = [
  ['bhawanipatna', 'kalahandi'],
  ['Kalahandi', 'kalahandi'],
  ['କଳାହାଣ୍ଡି', 'kalahandi'],
  ['bhubaneswar', 'khordha'],
  ['khurda', 'khordha'],
  ['BBSR', 'khordha'],
  ['chhatrapur', 'ganjam'],
  ['berhampur', 'ganjam'],
  ['brahmapur', 'ganjam'],
  ['baripada', 'mayurbhanj'],
  ['phulbani', 'kandhamal'],
  ['paralakhemundi', 'gajapati'],
  ['sonepur', 'subarnapur'],
  ['keonjhar', 'kendujhar'],
  ['baleswar', 'balasore'],
  ['bolangir', 'balangir']
];
for (const [input, expected] of aliasCases) {
  assert.equal(df.resolveDistrictSlug(input), expected, `Alias "${input}" should resolve to "${expected}"`);
}

// Verify matchDistrict: MMU Bhawanipatna matches kalahandi immediately; statewide toggle works
const mmuItem = {
  title_en: 'Maa Manikeswari University (MMU) Bhawanipatna ITEP Teaching Recruitment 2026',
  organisation_en: 'MMU Bhawanipatna',
  district: 'Kalahandi'
};
const opscStatewide = {
  title_en: 'OPSC OAS Civil Services 2026 Notification',
  organisation_en: 'OPSC',
  district: 'All Odisha'
};
const cuttackItem = {
  title_en: 'Cuttack District Court Junior Clerk Walk-in',
  organisation_en: 'District Judge Cuttack',
  district: 'Cuttack'
};

assert.equal(df.matchDistrict(mmuItem, 'kalahandi', { includeStatewide: false }), true, 'MMU Bhawanipatna matches kalahandi (district-only)');
assert.equal(df.matchDistrict(mmuItem, 'cuttack', { includeStatewide: false }), false, 'MMU Bhawanipatna does not match cuttack');
assert.equal(df.matchDistrict(opscStatewide, 'kalahandi', { includeStatewide: true }), true, 'Statewide OPSC matches kalahandi when includeStatewide=true');
assert.equal(df.matchDistrict(opscStatewide, 'kalahandi', { includeStatewide: false }), false, 'Statewide OPSC excluded when includeStatewide=false');
assert.equal(df.matchDistrict(cuttackItem, 'cuttack', { includeStatewide: false }), true, 'Cuttack notice matches cuttack');

// URL param parsing
const parsedUrl = df.readUrlParams('https://csodisha.com/jobs/?district=bhawanipatna&include_statewide=0');
assert.equal(parsedUrl.district, 'kalahandi');
assert.equal(parsedUrl.includeStatewide, false);

// 2. Verify /jobs/ and /updates/ HTML shells, JS wiring, CSS tokens & strict CSP
const jobsHtml = fs.readFileSync('jobs/index.html', 'utf8');
const updatesHtml = fs.readFileSync('updates/index.html', 'utf8');
const jobsHubJs = fs.readFileSync('assets/js/jobs-hub.js', 'utf8');
const updatesJs = fs.readFileSync('assets/js/updates-newsroom.js', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(jobsHtml.includes('/assets/js/odisha-district-filter.js?v=20261128v450'), 'jobs/index.html loads odisha-district-filter.js');
assert.ok(jobsHtml.includes('id="cso-jobs-district-bar"'), 'jobs/index.html mounts #cso-jobs-district-bar');
assert.ok(updatesHtml.includes('/assets/js/odisha-district-filter.js?v=20261128v450'), 'updates/index.html loads odisha-district-filter.js');
assert.ok(updatesHtml.includes('id="cso-updates-district-bar"'), 'updates/index.html mounts #cso-updates-district-bar');
assert.ok(jobsHubJs.includes('CSODistrictFilter.mountSelectorBar'), 'jobs-hub.js mounts CSODistrictFilter');
assert.ok(updatesJs.includes('CSODistrictFilter.mountSelectorBar'), 'updates-newsroom.js mounts CSODistrictFilter');

assert.ok(!/\sstyle\s*=\s*["']/i.test(jobsHtml) && !/\son[a-z]+\s*=\s*["']/i.test(jobsHtml), 'jobs/index.html has zero inline styles/handlers');
assert.ok(!/\sstyle\s*=\s*["']/i.test(updatesHtml) && !/\son[a-z]+\s*=\s*["']/i.test(updatesHtml), 'updates/index.html has zero inline styles/handlers');

const dfCss = styleCss.slice(styleCss.indexOf('v400:'));
assert.ok(dfCss.includes('.cso-df-bar') && dfCss.includes('min-height: 44px'), 'assets/style.css defines .cso-df-* styles with >=44px touch targets');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(dfCss), 'Zero hardcoded hex colors in v400 District Filter CSS');

// 3. Verify /feed.json and /api/public/search-index expose district metadata
const mockEnv = {
  DB: {
    prepare(sql) {
      return {
        async all() {
          if (sql.includes('job_articles')) {
            return {
              results: [
                {
                  slug: 'mmu-bhawanipatna-itep-2026',
                  title_en: 'MMU Bhawanipatna ITEP Recruitment',
                  organisation_en: 'MMU Bhawanipatna',
                  location_district: 'Kalahandi',
                  lifecycle_stage: 'notification',
                  is_published: 1,
                  published_at: '2026-11-27T08:00:00Z',
                  updated_at: '2026-11-27T08:00:00Z'
                }
              ]
            };
          }
          return { results: [] };
        }
      };
    }
  }
};
const feedItems = await collectUnifiedFeedItems(mockEnv, { limit: 10 });
const jsonFeed = renderJsonFeed11(feedItems);
assert.equal(jsonFeed.items.length, 1);
assert.equal(jsonFeed.items[0].district, 'Kalahandi', '/feed.json exposes top-level district');
assert.equal(jsonFeed.items[0]._cso_bilingual.district, 'Kalahandi', '/feed.json exposes _cso_bilingual.district');

const searchRecs = buildSearchIndexRecords({
  jobRows: [{ slug: 'mmu-bhawanipatna-itep-2026', title_en: 'MMU Bhawanipatna', location_district: 'Kalahandi', is_published: 1 }],
  guideRows: []
});
const mmuRec = searchRecs.find((r) => r.id === 'job:mmu-bhawanipatna-itep-2026');
assert.ok(mmuRec && mmuRec.district === 'Kalahandi', '/api/public/search-index exposes district metadata');

console.log('✅ v400 Public 30-District Odisha Recruitment & Exam Filter test suite passed!');
