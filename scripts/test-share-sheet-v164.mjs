// v164: Multi-Option Share Sheet verification.
// Usage: node scripts/test-share-sheet-v164.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const utilsJs = read('assets/js/student-utilities.js');
const utilsCss = read('assets/css/student-utilities.css');
const dashJs = read('jobs-careers/assets/dashboard.js');
const hubJs = read('jobs-careers/assets/hub.js');

// 1. Unit tests on buildShareLinks via isolated VM sandbox
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(utilsJs, sandbox);
const U = sandbox.CSOStudentUtils;
ok(U && typeof U.buildShareLinks === 'function' && typeof U.openShareSheet === 'function' && typeof U.closeShareSheet === 'function', 'share sheet APIs exported on CSOStudentUtils');

const sample = {
  title: 'OPSC OAS & Allied Services 2026',
  organisation: 'OPSC',
  qualification: 'Graduate',
  lastDate: '2026-12-31',
  url: 'https://csodisha.com/jobs-careers/?job=opsc-oas-2026'
};
const links = U.buildShareLinks(sample);

ok(links.whatsapp.startsWith('https://wa.me/?text='), 'WhatsApp URL uses wa.me');
const waDecoded = decodeURIComponent(links.whatsapp.slice('https://wa.me/?text='.length));
ok(waDecoded.includes('📌 OPSC OAS & Allied Services 2026') && waDecoded.includes('🏛️ OPSC') && waDecoded.includes('🎓 Graduate') && waDecoded.includes('📅 Last Date: 2026-12-31') && waDecoded.includes('🔗 https://csodisha.com/jobs-careers/?job=opsc-oas-2026'), 'WhatsApp URL properly encodes structured summary');

ok(links.telegram.startsWith('https://t.me/share/url?url='), 'Telegram URL uses t.me/share/url');
const tgUrl = new URL(links.telegram);
ok(tgUrl.searchParams.get('url') === sample.url, 'Telegram URL encodes canonical url param');
ok(tgUrl.searchParams.get('text').includes('OPSC OAS & Allied Services 2026'), 'Telegram URL encodes text param');

ok(links.x.startsWith('https://twitter.com/intent/tweet?'), 'X URL uses twitter intent');
const xUrl = new URL(links.x);
ok(xUrl.searchParams.get('text') === sample.title && xUrl.searchParams.get('url') === sample.url, 'X URL encodes text & url');

ok(links.facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u='), 'Facebook URL uses sharer.php');
const fbUrl = new URL(links.facebook);
ok(fbUrl.searchParams.get('u') === sample.url, 'Facebook URL encodes u param');

// 2. All 7 share options & modal accessibility present in student-utilities.js
for (const needle of [
  "'WhatsApp'",
  "'Telegram'",
  "'Copy Link'",
  "'Link Copied!'",
  "'Copy Summary'",
  "'Summary Copied!'",
  "'X (Twitter)'",
  "'Facebook'",
  "'More Apps'",
  "typeof navigator.share === 'function'",
  "role', 'dialog'",
  "aria-modal', 'true'",
  "e.key === 'Escape'",
  "if (e.target === backdrop) closeShareSheet()",
  "a.target = '_blank'",
  "a.rel = 'noopener noreferrer'",
  "addEventListener('click'"
]) {
  ok(utilsJs.includes(needle), `student-utilities.js missing: ${needle}`);
}

// 3. CSS bottom sheet + desktop modal + 44px touch targets + theme variables
for (const cssNeedle of [
  '.cso-share-backdrop',
  '.cso-share-sheet',
  '.cso-share-grid',
  '.cso-share-opt',
  'min-height: 46px',
  'min-width: 44px',
  'min-height: 44px',
  'align-items: flex-end',
  'var(--cso-card-bg',
  'var(--cso-text'
]) {
  ok(utilsCss.includes(cssNeedle), `student-utilities.css missing: ${cssNeedle}`);
}

// 4. Wired across /jobs-careers/ and all 6 Career Hubs
ok(dashJs.includes('window.CSOStudentUtils.openShareSheet(info)'), 'dashboard.js invokes openShareSheet');
ok(hubJs.includes('window.CSOStudentUtils.openShareSheet(info)'), 'hub.js invokes openShareSheet');

// 5. 100% CSP compliance & zero dead links
for (const [label, src] of [
  ['assets/js/student-utilities.js', utilsJs],
  ['jobs-careers/assets/dashboard.js', dashJs],
  ['jobs-careers/assets/hub.js', hubJs]
]) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${label}: no innerHTML sinks`);
  ok(!/\.style\.cssText|setAttribute\(\s*['"]style['"]/.test(src), `${label}: no inline style mutations`);
  ok(!/\bonclick\s*=/.test(src), `${label}: no onclick=`);
  ok(!/\.href\s*=\s*['"](#|javascript:)?['"]/.test(src), `${label}: no dead hrefs`);
}
ok(!/<style|\.innerHTML/.test(utilsCss), 'student-utilities.css clean');

// 6. Cache bump v164
ok(/CACHE_NAME = 'cso-candidate-cache-v164'/.test(read('sw.js')), 'sw.js bumped to v164');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v164'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v164');
ok(/cso-candidate-cache-v164/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v164');

console.log(`test-share-sheet-v164: ${passed} assertions passed`);
