/**
 * v389: 1-Click "Add to Calendar (.ics)" Reminder Export Verification Suite
 * Validates:
 *  1. RFC 5545 output structure (VCALENDAR, VEVENT, DTSTART, DTEND, VALARM -P1D & -PT2H, CRLF)
 *  2. Text escaping (\, ;, ,, \n) and 75-octet UTF-8 safe line folding (incl. Odia text)
 *  3. Single-event (MMU Bhawanipatna Walk-in Dec 10, 2026) & multi-day range (CTET Dec 12–13, 2026)
 *  4. Multi-event bundle (OSSTET Certificate Nov 25 + OMR Deadline Dec 2, 2026)
 *  5. Zero unverified/fabricated dates (unparseable strings return null / empty string)
 *  6. Script & button presence on /jobs/<slug>, /exams/, and /guides/<slug> + strict CSP compliance
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const icsSrc = fs.readFileSync('assets/js/ics-calendar-export.js', 'utf8');
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(icsSrc, sandbox);
const cal = sandbox.CSOCalendarExport;
assert.ok(cal && cal.version === 'v389', 'CSOCalendarExport v389 loaded');

// 1. Date parsing — single, range, and unverified rejection
const mmuDate = cal.parseDateRange('2026-12-10');
assert.deepEqual({ ...mmuDate }, { startYmd: '20261210', endExclusiveYmd: '20261211', isoStart: '2026-12-10', isoEnd: '2026-12-10' });

const ctetRange = cal.parseDateRange('Dec 12–13, 2026');
assert.deepEqual({ ...ctetRange }, { startYmd: '20261212', endExclusiveYmd: '20261214', isoStart: '2026-12-12', isoEnd: '2026-12-13' });

const osstetCert = cal.parseDateRange('25 Nov 2026');
assert.deepEqual({ ...osstetCert }, { startYmd: '20261125', endExclusiveYmd: '20261126', isoStart: '2026-11-25', isoEnd: '2026-11-25' });

assert.equal(cal.parseDateRange('To Be Announced'), null, 'Unverified text must return null');
assert.equal(cal.parseDateRange(''), null);
assert.equal(cal.buildIcsString([{ summary: 'No Date Event', date: 'TBA' }]), '', 'Zero unverified dates emitted');

// 2. Single-event RFC 5545 output (MMU Bhawanipatna Walk-in)
const singleIcs = cal.buildIcsString([{
  uid: 'mmu-walkin-2026',
  summary: 'MMU Bhawanipatna Walk-in; 31 ITEP Posts, Kalahandi',
  date: '2026-12-10',
  location: 'Bhawanipatna, Kalahandi, Odisha',
  url: 'https://csodisha.com/jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026',
  officialUrl: 'https://media.kalahandiuniversity.ac.in/storage/notices/261126/162125.pdf',
  description: 'Bring original certificates\nReporting time 10:00 AM'
}]);
assert.ok(singleIcs.startsWith('BEGIN:VCALENDAR\r\n'), 'Starts with BEGIN:VCALENDAR CRLF');
assert.ok(singleIcs.includes('VERSION:2.0\r\n'));
assert.ok(singleIcs.includes('PRODID:-//Common Sense Odisha//CSOdisha Alerts//EN\r\n'));
assert.ok(singleIcs.includes('CALSCALE:GREGORIAN\r\n'));
assert.ok(singleIcs.includes('METHOD:PUBLISH\r\n'));
assert.ok(singleIcs.includes('X-WR-TIMEZONE:Asia/Kolkata\r\n'));
assert.ok(singleIcs.includes('BEGIN:VEVENT\r\n'));
assert.ok(singleIcs.includes('DTSTART;VALUE=DATE:20261210\r\n'));
assert.ok(singleIcs.includes('DTEND;VALUE=DATE:20261211\r\n'));
assert.ok(singleIcs.includes('TRIGGER:-P1D\r\n'), 'Includes 1-day VALARM');
assert.ok(singleIcs.includes('TRIGGER:-PT2H\r\n'), 'Includes 2-hour VALARM');
assert.ok(singleIcs.includes('END:VEVENT\r\n'));
assert.ok(singleIcs.endsWith('END:VCALENDAR\r\n'));
// Escaping check (unfolded)
const unfoldedSingle = singleIcs.replace(/\r\n /g, '');
assert.ok(unfoldedSingle.includes('MMU Bhawanipatna Walk-in\\; 31 ITEP Posts\\, Kalahandi'), 'Escapes ; and ,');
assert.ok(unfoldedSingle.includes('Bring original certificates\\nReporting time 10:00 AM'), 'Escapes newline');
assert.ok(unfoldedSingle.includes('https://media.kalahandiuniversity.ac.in/storage/notices/261126/162125.pdf'), 'Includes official PDF URL');

// 3. 75-octet UTF-8 safe line folding (including Odia text)
const longOdiaLine = 'SUMMARY:' + cal.escapeIcsText('ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଭବାନୀପାଟଣା ୩୧ ITEP ଶିକ୍ଷକ ନିଯୁକ୍ତି ୨୦୨୬ — ୱାକ୍-ଇନ୍ ସାକ୍ଷାତକାର');
const folded = cal.foldIcsLine(longOdiaLine);
assert.ok(folded.includes('\r\n '), 'Long UTF-8 line is folded with CRLF+SPACE');
for (const seg of folded.split('\r\n')) {
  assert.ok(Buffer.byteLength(seg, 'utf8') <= 75, `Line segment exceeds 75 octets: ${Buffer.byteLength(seg, 'utf8')}`);
}

// 4. Multi-event bundle (OSSTET Certificate + OMR Deadline + CTET Exam Range)
const bundleIcs = cal.buildIcsString([
  { uid: 'osstet-cert', summary: 'BSE Odisha OSSTET Digitized Certificate Available', date: '25 Nov 2026', url: 'https://csodisha.com/jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr' },
  { uid: 'osstet-omr', summary: 'BSE Odisha OSSTET OMR Sheet Closing Deadline', date: '2 Dec 2026', url: 'https://csodisha.com/jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr' },
  { uid: 'ctet-2026', summary: 'CBSE CTET December 2026 (22nd Edition) Exam', date: 'Dec 12–13, 2026', url: 'https://csodisha.com/jobs/cbse-ctet-december-2026-22nd-edition-exam-dates-admit-card-notice' }
]);
const veventCount = (bundleIcs.match(/BEGIN:VEVENT\r\n/g) || []).length;
assert.equal(veventCount, 3, 'Multi-event bundle emits 3 separate VEVENT blocks');
assert.ok(bundleIcs.includes('DTSTART;VALUE=DATE:20261212\r\n'));
assert.ok(bundleIcs.includes('DTEND;VALUE=DATE:20261214\r\n'));

// 5. extractEventsFromJobArticle deduplicates & ignores invalid dates
const extracted = cal.extractEventsFromJobArticle({
  slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
  title_en: 'MMU Bhawanipatna Walk-in: 31 ITEP Teaching Posts',
  organisation_en: 'Maa Manikeshwari University',
  location_district: 'Kalahandi',
  last_date: '2026-12-10',
  important_dates: [
    { event: 'Notification Issued', date: '2026-11-26', note: 'Advt. 1621' },
    { event: 'Walk-in Interview', date: '2026-12-10', note: '10 AM' },
    { event: 'Result', date: 'To Be Announced', note: 'Later' }
  ]
}, 'https://csodisha.com');
assert.equal(extracted.length, 3, 'Extracts valid milestone dates and skips TBA');

// 6. Presence on /jobs/<slug>, /exams/, /guides/<slug> + strict CSP checks
const jobsHtml = fs.readFileSync('jobs/index.html', 'utf8');
const examsHtml = fs.readFileSync('exams/index.html', 'utf8');
const guidesLib = fs.readFileSync('functions/_lib/informative-guides.js', 'utf8');
const jobsPortalJs = fs.readFileSync('assets/js/jobs-portal.js', 'utf8');
const examsHubJs = fs.readFileSync('assets/js/exams-hub.js', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(jobsHtml.includes('/assets/js/ics-calendar-export.js'), 'jobs/index.html loads ics-calendar-export.js');
assert.ok(examsHtml.includes('/assets/js/ics-calendar-export.js'), 'exams/index.html loads ics-calendar-export.js');
assert.ok(guidesLib.includes('/assets/js/ics-calendar-export.js'), 'informative-guides.js loads ics-calendar-export.js');
assert.ok(jobsPortalJs.includes('CSOCalendarExport'), 'jobs-portal.js integrates CSOCalendarExport');
assert.ok(examsHubJs.includes('CSOCalendarExport'), 'exams-hub.js integrates CSOCalendarExport');
assert.ok(styleCss.includes('.cso-ics-btn'), 'assets/style.css defines .cso-ics-btn 4-theme styles');
assert.ok(!/\.innerHTML\s*=/.test(icsSrc), 'Zero unsafe DOM markup injection in ics-calendar-export.js');
assert.ok(!/\.style\./.test(icsSrc), 'Zero inline .style.* mutations in ics-calendar-export.js');

console.log('✅ v389 1-Click "Add to Calendar (.ics)" Reminder Export test suite passed!');
