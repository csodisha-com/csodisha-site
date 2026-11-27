/**
 * v404: Candidate Saved-Search & District Alert Watchlist (Local-First Preferences) Verification Suite
 * Validates:
 *  1. LocalStorage persistence (cso_candidate_watchlist_v1), district alias normalization,
 *     exam track matching (Teaching / TET, OPSC / OSSC, Central Exams, etc.), and custom keyword matching
 *  2. /jobs/ and /updates/ HTML shells & JS controllers mount the Watchlist bar, "Matching Your Watchlist"
 *     filter toggle, and automatic card match highlight badges with strict CSP compliance
 *  3. assets/style.css defines .cso-wl-* 4-theme styles with >=44px touch targets & zero hardcoded hex
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const wlSrc = fs.readFileSync('assets/js/candidate-watchlist.js', 'utf8');
const dfSrc = fs.readFileSync('assets/js/odisha-district-filter.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(wlSrc), 'Zero .innerHTML in candidate-watchlist.js');
assert.ok(!/\.outerHTML\b/.test(wlSrc), 'Zero .outerHTML in candidate-watchlist.js');
assert.ok(!/insertAdjacentHTML/.test(wlSrc), 'Zero insertAdjacentHTML in candidate-watchlist.js');
assert.ok(!/\.style\./.test(wlSrc), 'Zero .style.* mutations in candidate-watchlist.js');

const store = {};
const sandbox = {
  globalThis: {},
  URL,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(dfSrc, sandbox);
vm.runInNewContext(wlSrc, sandbox);

const wl = sandbox.CSOWatchlist;
const df = sandbox.CSODistrictFilter;
assert.ok(wl && /^v40[48]$/.test(wl.version), 'CSOWatchlist v404+ loaded');
assert.equal(wl.hasPreferences(), false, 'Starts empty before preferences are saved');

// 1. Save preferences with alias normalization (bhawanipatna -> kalahandi, bhubaneswar -> khordha)
const saved = wl.savePreferences({
  districts: ['bhawanipatna', 'bhubaneswar', 'cuttack'],
  tracks: ['teaching-tet', 'opsc-ossc'],
  keywords: ['ITEP']
});
assert.deepEqual(Array.from(saved.districts), ['kalahandi', 'khordha', 'cuttack']);
assert.deepEqual(Array.from(saved.tracks), ['teaching-tet', 'opsc-ossc']);
assert.deepEqual(Array.from(saved.keywords), ['ITEP']);
assert.equal(wl.hasPreferences(), true);
assert.deepEqual(Array.from(wl.loadPreferences().districts), ['kalahandi', 'khordha', 'cuttack']);

// 2. Match notices against watchlist
const mmuItem = {
  title_en: 'Maa Manikeswari University Bhawanipatna ITEP Teaching Recruitment 2026',
  organisation_en: 'MMU Bhawanipatna',
  district: 'Kalahandi'
};
const opscItem = {
  title_en: 'OPSC OAS Civil Services 2026 Notification',
  organisation_en: 'OPSC',
  district: 'All Odisha'
};
const unrelatedItem = {
  title_en: 'Rayagada District Sports Hostel Trial',
  organisation_en: 'Rayagada Sports',
  district: 'Rayagada'
};

const m1 = wl.matchesWatchlist(mmuItem, null, df);
assert.equal(m1.matched, true, 'MMU Bhawanipatna matches Kalahandi + Teaching / TET + ITEP');
assert.ok(m1.reasons.includes('Kalahandi'));
assert.ok(m1.reasons.includes('Teaching / TET'));

const m2 = wl.matchesWatchlist(opscItem, null, df);
assert.equal(m2.matched, true, 'OPSC OAS matches OPSC / OSSC / OSSSC track');

const m3 = wl.matchesWatchlist(unrelatedItem, null, df);
assert.equal(m3.matched, false, 'Unrelated Rayagada sports notice does not match');
assert.equal(wl.countMatches([mmuItem, opscItem, unrelatedItem], null, df), 2);

// 3. HTML/JS/CSS wiring & strict CSP
const jobsHtml = fs.readFileSync('jobs/index.html', 'utf8');
const updatesHtml = fs.readFileSync('updates/index.html', 'utf8');
const jobsHubJs = fs.readFileSync('assets/js/jobs-hub.js', 'utf8');
const updatesJs = fs.readFileSync('assets/js/updates-newsroom.js', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(jobsHtml.includes('/assets/js/candidate-watchlist.js?v=20261127v417'), 'jobs/index.html loads candidate-watchlist.js');
assert.ok(jobsHtml.includes('id="cso-jobs-watchlist-bar"'), 'jobs/index.html mounts #cso-jobs-watchlist-bar');
assert.ok(updatesHtml.includes('/assets/js/candidate-watchlist.js?v=20261127v417'), 'updates/index.html loads candidate-watchlist.js');
assert.ok(updatesHtml.includes('id="cso-updates-watchlist-bar"'), 'updates/index.html mounts #cso-updates-watchlist-bar');
assert.ok(jobsHubJs.includes('CSOWatchlist.mountWatchlistBar') && jobsHubJs.includes('CSOWatchlist.createMatchBadge'), 'jobs-hub.js integrates CSOWatchlist bar & card badges');
assert.ok(updatesJs.includes('CSOWatchlist.mountWatchlistBar') && updatesJs.includes('CSOWatchlist.createMatchBadge'), 'updates-newsroom.js integrates CSOWatchlist bar & card badges');

const v404Css = styleCss.slice(styleCss.indexOf('v404:'));
assert.ok(v404Css.includes('.cso-wl-bar') && v404Css.includes('.cso-wl-match-badge') && v404Css.includes('min-height: 44px'), 'assets/style.css defines v404 watchlist styles & >=44px touch targets');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v404Css), 'Zero hardcoded hex colors in v404 CSS');

console.log('✅ v404 Candidate Saved-Search & District Alert Watchlist test suite passed!');
