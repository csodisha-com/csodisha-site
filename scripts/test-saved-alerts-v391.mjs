/**
 * v391: Candidate Saved-Alerts & Deadline Countdown Drawer (Local-First) Verification Suite
 * Validates:
 *  1. IST (Asia/Kolkata) countdown badge calculations:
 *     - Today! / ଆଜି! (0 days, urgent-pulse)
 *     - Walk-in Tomorrow / Ends Tomorrow / ଆସନ୍ତାକାଲି (1 day, urgent)
 *     - Ends in 3 days / 3 ଦିନ ବାକି (2..7 days, warn, urgent when <= 3)
 *     - In 14 days (DD MMM) (> 7 days, calm)
 *     - Closed / Passed / ସମାପ୍ତ (< 0 days, muted)
 *     - Saved Reference / ସେଭ୍ ହୋଇଛି (no parseable date)
 *  2. localStorage (`cso_saved_alerts_v1`) persistence, toggle, deduplication, remove & clearAll
 *  3. Nearest-deadline sorting & multi-event .ics bundle generation via CSOCalendarExport
 *  4. Presence of bookmark controls & script across homepage, /jobs/, /exams/, /guides/ + strict CSP
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const icsSrc = fs.readFileSync('assets/js/ics-calendar-export.js', 'utf8');
const saSrc = fs.readFileSync('assets/js/saved-alerts-drawer.js', 'utf8');

const store = {};
const mockStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const sandbox = {
  localStorage: mockStorage,
  location: { origin: 'https://csodisha.com', href: 'https://csodisha.com/', pathname: '/' },
  globalThis: {}
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(icsSrc, sandbox);
vm.runInNewContext(saSrc, sandbox);

const sa = sandbox.CSOSavedAlerts;
const cal = sandbox.CSOCalendarExport;
assert.ok(sa && sa.version === 'v391', 'CSOSavedAlerts v391 loaded');
assert.equal(sa.STORAGE_KEY, 'cso_saved_alerts_v1');

// 1. IST Countdown calculations (fixed reference date 2026-12-09)
const todayCd = sa.computeIstCountdown('2026-12-09', { todayIso: '2026-12-09' });
assert.equal(todayCd.label_en, 'Today!');
assert.equal(todayCd.label_or, 'ଆଜି!');
assert.equal(todayCd.urgent, true);

const walkInTmrw = sa.computeIstCountdown('2026-12-10', { todayIso: '2026-12-09', title: 'MMU Bhawanipatna Walk-in: 31 ITEP Posts' });
assert.equal(walkInTmrw.label_en, 'Walk-in Tomorrow');
assert.equal(walkInTmrw.label_or, 'ଆସନ୍ତାକାଲି');
assert.equal(walkInTmrw.urgent, true);

const endsTmrw = sa.computeIstCountdown('2026-12-10', { todayIso: '2026-12-09', title: 'OPSC OAS Online Application' });
assert.equal(endsTmrw.label_en, 'Ends Tomorrow');

const in3Days = sa.computeIstCountdown('2026-12-12', { todayIso: '2026-12-09' });
assert.equal(in3Days.label_en, 'Ends in 3 days');
assert.equal(in3Days.label_or, '3 ଦିନ ବାକି');
assert.equal(in3Days.urgent, true);

const in14Days = sa.computeIstCountdown('2026-12-23', { todayIso: '2026-12-09' });
assert.equal(in14Days.label_en, 'In 14 days (23 Dec)');
assert.equal(in14Days.urgent, false);

const closedCd = sa.computeIstCountdown('2026-12-02', { todayIso: '2026-12-09' });
assert.equal(closedCd.label_en, 'Closed / Passed');
assert.equal(closedCd.label_or, 'ସମାପ୍ତ');
assert.equal(closedCd.urgent, false);

const refCd = sa.computeIstCountdown('', { todayIso: '2026-12-09' });
assert.equal(refCd.label_en, 'Saved Reference');
assert.equal(refCd.label_or, 'ସେଭ୍ ହୋଇଛି');

// 2. localStorage persistence, toggle, deduplication & remove
assert.equal(sa.getAll().length, 0);
const added1 = sa.toggleAlert({
  id: 'job:mmu-bhawanipatna',
  slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
  url: '/jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026',
  title_en: 'MMU Bhawanipatna Walk-in: 31 ITEP Teaching Posts',
  org: 'Maa Manikeshwari University',
  category: 'job_alert',
  deadline_iso: '2026-12-10',
  venue_or_mode: 'Kalahandi, Odisha'
});
assert.equal(added1, true);
assert.equal(sa.isSaved('job:mmu-bhawanipatna'), true);
assert.equal(sa.getAll().length, 1);

sa.toggleAlert({
  id: 'exam:ctet-dec-2026',
  slug: 'cbse-ctet-december-2026-22nd-edition-exam-dates-admit-card-notice',
  url: '/jobs/cbse-ctet-december-2026-22nd-edition-exam-dates-admit-card-notice',
  title_en: 'CBSE CTET December 2026 (22nd Edition)',
  org: 'CBSE',
  category: 'exam_update',
  deadline_iso: '2026-12-12'
});
sa.toggleAlert({
  id: 'result:osstet-2026',
  slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
  url: '/jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr',
  title_en: 'BSE Odisha OSSTET Result 2026',
  org: 'BSE Odisha',
  category: 'result',
  deadline_iso: ''
});
assert.equal(sa.getAll().length, 3);

// 3. Nearest-deadline sorting & multi-event .ics bundle export
const sorted = sa.sortAlertsForDrawer(sa.getAll(), new Date('2026-12-09T06:00:00Z'));
assert.equal(sorted[0].id, 'job:mmu-bhawanipatna', 'Nearest deadline (Dec 10) sorted first');
assert.equal(sorted[1].id, 'exam:ctet-dec-2026', 'Next deadline (Dec 12) sorted second');
assert.equal(sorted[2].id, 'result:osstet-2026', 'Undated reference sorted after upcoming deadlines');

const icsEvents = sa.buildIcsEventsFromSaved(sa.getAll());
assert.equal(icsEvents.length, 2, 'Only dated saved items included in .ics export');
const bundleIcs = cal.buildIcsString(icsEvents);
assert.equal((bundleIcs.match(/BEGIN:VEVENT\r\n/g) || []).length, 2, 'Multi-event .ics bundle has 2 VEVENT blocks');
assert.ok(bundleIcs.includes('DTSTART;VALUE=DATE:20261210\r\n'));
assert.ok(bundleIcs.includes('DTSTART;VALUE=DATE:20261212\r\n'));

// Toggle off & clearAll
assert.equal(sa.toggleAlert({ id: 'job:mmu-bhawanipatna', title_en: 'MMU' }), false);
assert.equal(sa.isSaved('job:mmu-bhawanipatna'), false);
sa.clearAll();
assert.equal(sa.getAll().length, 0);

// 4. Wiring across homepage, /jobs/, /exams/, /guides/ + strict CSP
const indexHtml = fs.readFileSync('index.html', 'utf8');
const jobsHtml = fs.readFileSync('jobs/index.html', 'utf8');
const examsHtml = fs.readFileSync('exams/index.html', 'utf8');
const guidesLib = fs.readFileSync('functions/_lib/informative-guides.js', 'utf8');
const homeHydrationJs = fs.readFileSync('assets/js/home-hydration.js', 'utf8');
const jobsPortalJs = fs.readFileSync('assets/js/jobs-portal.js', 'utf8');
const examsHubJs = fs.readFileSync('assets/js/exams-hub.js', 'utf8');
const sharedHeaderJs = fs.readFileSync('assets/shared-header.js', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(indexHtml.includes('/assets/js/saved-alerts-drawer.js'), 'index.html loads saved-alerts-drawer.js');
assert.ok(jobsHtml.includes('/assets/js/saved-alerts-drawer.js'), 'jobs/index.html loads saved-alerts-drawer.js');
assert.ok(examsHtml.includes('/assets/js/saved-alerts-drawer.js'), 'exams/index.html loads saved-alerts-drawer.js');
assert.ok(guidesLib.includes('/assets/js/saved-alerts-drawer.js'), 'informative-guides.js loads saved-alerts-drawer.js');
assert.ok(homeHydrationJs.includes('CSOSavedAlerts.createBookmarkButton'), 'home-hydration.js mounts bookmark buttons');
assert.ok(jobsPortalJs.includes('CSOSavedAlerts.createBookmarkButton'), 'jobs-portal.js mounts bookmark buttons');
assert.ok(examsHubJs.includes('CSOSavedAlerts.createBookmarkButton'), 'exams-hub.js mounts bookmark buttons');
assert.ok(sharedHeaderJs.includes('window.CSOSavedAlerts'), 'shared-header.js integrates window.CSOSavedAlerts drawer');
assert.ok(styleCss.includes('.cso-sa-drawer') && styleCss.includes('.cso-sa-bm-btn'), 'assets/style.css defines .cso-sa-* 4-theme styles');
assert.ok(!/\.innerHTML\s*=/.test(saSrc), 'Zero unsafe DOM markup injection in saved-alerts-drawer.js');
assert.ok(!/\.style\./.test(saSrc), 'Zero inline .style.* mutations in saved-alerts-drawer.js');

console.log('✅ v391 Candidate Saved-Alerts & Deadline Countdown Drawer test suite passed!');
