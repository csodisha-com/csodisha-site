// v163: Odisha Student Toolkit, "Am I Eligible?" Badge Engine, WhatsApp Share & .ics Reminder tests.
// Usage: node scripts/test-student-toolkit-v163.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { HUBS } from '../functions/_lib/career-hubs-data.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. /tools/ HTML structure, SEO, presets, age calculator controls
ok(fs.existsSync(path.join(root, 'tools/index.html')), 'tools/index.html missing');
const toolsHtml = read('tools/index.html');
const toolsJs = read('tools/assets/tools.js');
const toolsCss = read('tools/assets/tools.css');
const utilsJs = read('assets/js/student-utilities.js');
const utilsCss = read('assets/css/student-utilities.css');

ok(toolsHtml.includes('<link rel="canonical" href="https://csodisha.com/tools/">'), '/tools/ canonical missing');
ok(/<title>[^<]*Odisha Student Toolkit[^<]*<\/title>/.test(toolsHtml), '/tools/ title missing');
ok(/<meta name="description" content="[^"]{40,}">/.test(toolsHtml), '/tools/ meta description missing');
ok(/<meta property="og:title" content="[^"]+">/.test(toolsHtml), '/tools/ og:title missing');
ok(/<meta property="og:description" content="[^"]+">/.test(toolsHtml), '/tools/ og:description missing');
ok(toolsHtml.includes('id="header-top"') && toolsHtml.includes('cso-footer-zone3'), '/tools/ uniform shell');

for (const preset of ['opsc-photo', 'opsc-sign', 'ossc-photo', 'ssc-photo', 'ssc-sign', 'custom']) {
  ok(toolsHtml.includes(`data-preset="${preset}"`), `/tools/ missing preset: ${preset}`);
}
for (const label of [
  'OPSC Photo (200×230px, 20–50KB)',
  'OPSC Signature (140×60px, 10–20KB)',
  'OSSC / OSSSC Photo (200×230px, 20–50KB)',
  'SSC Photo (3.5×4.5cm / 275×354px, 20–50KB)',
  'SSC Signature (140×60px, 10–20KB)',
  'Download JPG',
  'Date of Birth',
  'Notification Cut-Off Date',
  'SEBC (+5 yrs)',
  'SC / ST (+5 yrs)',
  'Women (+5 yrs)',
  'PwD (+10 yrs)',
  'Ex-Serviceman'
]) {
  ok(toolsHtml.includes(label), `/tools/ missing UI label: ${label}`);
}

for (const id of ['resizer-presets', 'resizer-width', 'resizer-height', 'resizer-min-kb', 'resizer-max-kb', 'resizer-file', 'resizer-process-btn', 'resizer-download-btn', 'resizer-canvas', 'age-calc-form', 'age-dob', 'age-cutoff', 'age-max', 'age-category', 'age-reset-btn']) {
  ok(toolsHtml.includes(`id="${id}"`) && toolsJs.includes(id), `/tools/ control #${id} not wired in tools.js`);
}
ok(toolsJs.includes("presetWrap.addEventListener('click'") && toolsJs.includes("fileEl.addEventListener('change'") && toolsJs.includes("downloadBtn.addEventListener('click'") && toolsJs.includes("form.addEventListener('submit'") && toolsJs.includes("cvs.toBlob("), 'tools.js event handlers & canvas toBlob');

// 2. Unit tests for student-utilities.js (execute in isolated VM sandbox)
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(utilsJs, sandbox);
const U = sandbox.CSOStudentUtils;
ok(U && typeof U.calculateOdishaAge === 'function', 'CSOStudentUtils loaded');
ok(Array.isArray(U.ODISHA_DISTRICTS) && U.ODISHA_DISTRICTS.length === 30, 'all 30 Odisha districts present');

// Age calculator unit assertions
const ageUr = U.calculateOdishaAge({ dob: '1990-01-01', cutoff: '2026-01-01', maxAge: 32, category: 'UR' });
ok(ageUr.valid && ageUr.years === 36 && ageUr.months === 0 && ageUr.days === 0 && ageUr.effectiveMaxAge === 32 && !ageUr.eligible, 'UR 36y over 32 max age');

const ageSebc = U.calculateOdishaAge({ dob: '1990-01-01', cutoff: '2026-01-01', maxAge: 32, category: 'SEBC' });
ok(ageSebc.valid && ageSebc.relaxation === 5 && ageSebc.effectiveMaxAge === 37 && ageSebc.eligible, 'SEBC +5 yrs relaxation makes 36y eligible for 32 max age');

const agePwd = U.calculateOdishaAge({ dob: '1985-06-15', cutoff: '2026-11-21', maxAge: 32, category: 'PwD' });
ok(agePwd.valid && agePwd.relaxation === 10 && agePwd.effectiveMaxAge === 42 && agePwd.eligible && agePwd.years === 41 && agePwd.months === 5 && agePwd.days === 6, 'PwD +10 yrs relaxation & exact Y/M/D calculation');

const ageInvalid = U.calculateOdishaAge({ dob: '2027-01-01', cutoff: '2026-01-01', maxAge: 32, category: 'UR' });
ok(!ageInvalid.valid, 'future DOB rejected');

// Eligibility badge engine unit assertions
const eligOk = U.evaluateCardEligibility('OPSC OAS Recruitment · Graduate · Cuttack District · Max Age 38 years', {
  age: '26', qualification: 'Graduate', category: 'UR', district: 'Cuttack'
});
ok(eligOk.some(b => b.label === '✓ Eligible'), 'eligible graduate stamped ✓ Eligible');
ok(eligOk.some(b => b.label === '📍 District Match'), 'matching district stamped 📍 District Match');

const eligQualWarn = U.evaluateCardEligibility('Lecturer Recruitment · Post Graduate required', {
  age: '24', qualification: '10th', category: 'UR', district: ''
});
ok(eligQualWarn.some(b => b.label === 'Check Qualification'), 'under-qualified user gets Check Qualification');

const eligAgeWarn = U.evaluateCardEligibility('Constable Recruitment · 18-25 years · +2 pass', {
  age: '35', qualification: 'Graduate', category: 'UR', district: ''
});
ok(eligAgeWarn.some(b => b.label === 'Check Age'), 'over-age user gets Check Age');

// WhatsApp-ready share formatter
const waText = U.formatWhatsAppShare({
  title: 'OPSC OAS 2026',
  organisation: 'OPSC',
  qualification: 'Graduate',
  lastDate: '2026-12-31',
  url: 'https://csodisha.com/jobs-careers/?job=opsc-oas-2026'
});
ok(waText.includes('📌 OPSC OAS 2026') && waText.includes('🏛️ OPSC') && waText.includes('🎓 Graduate') && waText.includes('📅 Last Date: 2026-12-31') && waText.includes('🔗 https://csodisha.com/jobs-careers/?job=opsc-oas-2026'), 'WhatsApp share format complete');

// RFC 5545 .ics calendar generator
const ics = U.buildJobIcs({
  slug: 'opsc-oas-2026',
  title: 'OPSC OAS, 2026',
  organisation: 'OPSC',
  lastDate: '2026-12-31',
  url: 'https://csodisha.com/jobs-careers/?job=opsc-oas-2026'
});
ok(ics && ics.includes('\r\n'), '.ics uses CRLF');
ok(ics.includes('BEGIN:VCALENDAR') && ics.includes('VERSION:2.0') && ics.includes('BEGIN:VEVENT') && ics.includes('DTSTART;VALUE=DATE:20261231') && ics.includes('DTEND;VALUE=DATE:20270101') && ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:-P1D') && ics.includes('END:VCALENDAR'), 'valid RFC 5545 .ics with 1-day VALARM');
ok(ics.includes('OPSC OAS\\, 2026'), '.ics escapes commas in SUMMARY');
ok(U.buildJobIcs({ title: 'No date' }) === null, '.ics returns null when lastDate missing');

// 3. Site-wide wiring & sitemap
const landingHtml = read('jobs-careers/index.html');
const schemesHtml = read('schemes/index.html');
ok(landingHtml.includes('href="/tools/"'), '/jobs-careers/ links to /tools/');
ok(landingHtml.includes('/assets/js/student-utilities.js') && landingHtml.includes('/assets/css/student-utilities.css'), '/jobs-careers/ loads student-utilities');
ok(schemesHtml.includes('/assets/js/student-utilities.js') && schemesHtml.includes('/assets/css/student-utilities.css'), '/schemes/ loads student-utilities');
for (const hub of HUBS) {
  const h = read(`jobs-careers/${hub.slug}/index.html`);
  ok(h.includes('/assets/js/student-utilities.js') && h.includes('href="/tools/"'), `${hub.slug} loads student-utilities and links to /tools/`);
}
ok(read('sitemap.xml').includes('<loc>https://csodisha.com/tools/</loc>'), 'sitemap.xml includes /tools/');
ok(read('functions/api/content/_seo.js').includes("'/tools/'"), '_seo.js includes /tools/');
ok(read('_worker.js').includes('|tools|'), '_worker.js applies CSP headers to /tools/');

const dashJs = read('jobs-careers/assets/dashboard.js');
const hubJs = read('jobs-careers/assets/hub.js');
const ssrFeeds = read('functions/_lib/ssr-feeds.js');
ok(dashJs.includes('shareWhatsAppFormatted') && dashJs.includes('downloadJobIcs') && dashJs.includes('📅 Remind'), 'dashboard.js wires WhatsApp share & .ics reminder');
ok(hubJs.includes('shareWhatsAppFormatted') && hubJs.includes('downloadJobIcs') && hubJs.includes('📅 Remind'), 'hub.js wires WhatsApp share & .ics reminder');
ok(ssrFeeds.includes('data-action="remind"') && ssrFeeds.includes('📅 Remind'), 'ssr-feeds.js renders Remind button on SSR cards');

// 4. Dead links & 100% CSP compliance
for (const [label, html] of [['tools/index.html', toolsHtml], ['jobs-careers/index.html', landingHtml], ['schemes/index.html', schemesHtml]]) {
  ok(!/<style[\s>]/i.test(html), `${label}: no inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${label}: no style="" attribute`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${label}: no inline event handler`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${label}: no executable inline <script>`);
  }
  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    ok(m[1] !== '' && m[1] !== '#' && !/^javascript:/i.test(m[1]), `${label}: dead href "${m[1]}"`);
  }
}
for (const [label, src] of [
  ['assets/js/student-utilities.js', utilsJs],
  ['tools/assets/tools.js', toolsJs],
  ['jobs-careers/assets/dashboard.js', dashJs],
  ['jobs-careers/assets/hub.js', hubJs]
]) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${label}: no innerHTML sinks`);
  ok(!/\.style\.cssText|setAttribute\(\s*['"]style['"]/.test(src), `${label}: no inline style mutations`);
  ok(!/\bonclick\s*=/.test(src), `${label}: no onclick=`);
}
ok(!/<style|\.innerHTML/.test(toolsCss + utilsCss), 'CSS files clean');

// 5. Cache version v163
ok(/CACHE_NAME = 'cso-candidate-cache-v163'/.test(read('sw.js')), 'sw.js bumped to v163');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v163'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v163');
ok(/cso-candidate-cache-v163/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v163');

console.log(`test-student-toolkit-v163: ${passed} assertions passed`);
