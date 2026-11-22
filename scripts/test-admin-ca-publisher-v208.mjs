#!/usr/bin/env node
/**
 * v208 Verification: Admin Studio Daily Current Affairs & 5-MCQ Composer
 * 1. #cso-ca-publisher-card panel with 5 structured MCQs in admin/index.html
 * 2. POST & GET /api/admin/current-affairs integration in D1
 * 3. Exact 23 folders & 299 modules preservation in admin/data/master-navigation.json
 * 4. 100% CSP compliance (zero inline style, style="", executable script, onclick=, or innerHTML)
 * 5. Cache & asset version bumps to v208
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { handleAdminCurrentAffairs } from '../functions/api/admin/current-affairs.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
}

console.log('--- Step 1: Admin Studio HTML & DOM Structure (#cso-ca-publisher-card) ---');
const adminHtml = read('admin/index.html');
const studioCss = read('admin/studio.css');
const fastPubJs = read('admin/fast-publish.js');
const adminJs = read('admin/admin.js');
const navJson = JSON.parse(read('admin/data/master-navigation.json'));

ok(adminHtml.includes('id="cso-ca-publisher-card"'), 'admin/index.html contains #cso-ca-publisher-card');
ok(adminHtml.includes('class="studio-card cso-card cso-ca-composer"'), '#cso-ca-publisher-card matches studio-card & cso-card classes');
ok(adminHtml.includes('form-grid cso-form-grid'), '#cso-ca-publisher-card uses form-grid & cso-form-grid classes');
ok(adminHtml.includes('id="csoCaDate"') && adminHtml.includes('name="capsule_date"'), 'Date field present in form');
ok(adminHtml.includes('id="csoCaCategory"') && adminHtml.includes('name="category"'), 'Category select present in form');

// Verify 4 required categories
const categories = ['Odisha State', 'National &amp; Economy', 'Polity &amp; Schemes', 'Science &amp; Environment'];
for (const cat of categories) {
  ok(adminHtml.includes(cat), `Category option "${cat}" present`);
}

ok(adminHtml.includes('id="csoCaTitleEn"') && adminHtml.includes('name="title_en"'), 'Title (EN) input present');
ok(adminHtml.includes('id="csoCaTitleOr"') && adminHtml.includes('name="title_or"'), 'Title (ଓଡ଼ିଆ) input present');
ok(adminHtml.includes('id="csoCaHighlightsEn"') && adminHtml.includes('name="highlights_en"'), 'Highlights (EN) textarea present');
ok(adminHtml.includes('id="csoCaHighlightsOr"') && adminHtml.includes('name="highlights_or"'), 'Highlights (ଓଡ଼ିଆ) textarea present');

// Verify collapsible 5-MCQ drawer
ok(adminHtml.includes('<details class="cso-ca-mcq-drawer">'), '<details class="cso-ca-mcq-drawer"> collapsible drawer present');
ok(adminHtml.includes('<summary class="cso-ca-mcq-summary">Add 5-Question Practice Quiz (Optional)</summary>'), 'Collapsible drawer summary present');

// Verify 5 structured MCQ rows
const mcqMatches = adminHtml.match(/class="cso-ca-mcq-row"/g) || [];
assert.equal(mcqMatches.length, 5, 'Exactly 5 structured MCQ rows present in drawer');

for (let i = 0; i < 5; i++) {
  ok(adminHtml.includes(`id="csoMcqQEn${i}"`), `MCQ ${i + 1} Question EN input present`);
  ok(adminHtml.includes(`id="csoMcqQOr${i}"`), `MCQ ${i + 1} Question ଓଡ଼ିଆ input present`);
  ok(adminHtml.includes(`id="csoMcqOptA${i}"`), `MCQ ${i + 1} Option A input present`);
  ok(adminHtml.includes(`id="csoMcqOptB${i}"`), `MCQ ${i + 1} Option B input present`);
  ok(adminHtml.includes(`id="csoMcqOptC${i}"`), `MCQ ${i + 1} Option C input present`);
  ok(adminHtml.includes(`id="csoMcqOptD${i}"`), `MCQ ${i + 1} Option D input present`);
  ok(adminHtml.includes(`id="csoMcqAns${i}"`), `MCQ ${i + 1} Answer select present (0-3)`);
}

// Verify Publish button, status feedback & live D1 capsules feed
ok(adminHtml.includes('id="csoBtnPublishCa"'), 'Publish Daily Capsule submit button present');
ok(adminHtml.includes('Publish Daily Capsule &rarr;'), 'Publish Daily Capsule label present');
ok(adminHtml.includes('id="csoCaStatusMessage"'), 'Status message element present');
ok(adminHtml.includes('id="csoCaCapsulesList"'), 'Published capsules list container present');
ok(adminHtml.includes('id="csoBtnRefreshCaFeed"'), 'Refresh capsules feed button present');

// Verify 44px touch targets in CSS
ok(studioCss.includes('.studio-card'), 'studio.css defines .studio-card');
ok(studioCss.includes('.form-grid'), 'studio.css defines .form-grid');
ok(studioCss.includes('.cso-ca-composer'), 'studio.css defines .cso-ca-composer');
ok(studioCss.includes('.cso-ca-mcq-drawer'), 'studio.css defines .cso-ca-mcq-drawer');
ok(studioCss.includes('min-height: 44px;'), 'studio.css enforces 44px touch targets');

console.log('--- Step 2: POST & GET /api/admin/current-affairs D1 Integration ---');
function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, salt TEXT, role TEXT, failed_attempts INTEGER, lockout_until INTEGER, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER, reset_at INTEGER);
  `);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) || [] })
  });
  return { db, prepare: (s) => stmt(s) };
}

const env = { DB: makeD1() };

// Unauthenticated call rejected
const unauthRes = await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', { method: 'GET' }),
  env
);
assert.equal(unauthRes.status, 401, 'Unauthenticated request must receive 401');

// Authenticated POST creates bilingual capsule with 5 MCQs
const adminActor = { userId: 'u-admin-test', email: 'admin@csodisha.com', role: 'admin' };
const testPayload = {
  capsule_date: '2026-11-22',
  category: 'Odisha State',
  title_en: 'Odisha High Court Approves Digital e-Services Gateway',
  title_or: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ ଡିଜିଟାଲ୍ ଇ-ସେବା ଗେଟୱେ ଅନୁମୋଦନ କଲେ',
  highlights_en: [
    '24x7 paperless filing across all 30 district courts',
    'Real-time bail application tracking system'
  ],
  highlights_or: [
    'ସମସ୍ତ ୩୦ ଜିଲ୍ଲା କୋର୍ଟରେ ୨୪x୭ କାଗଜବିହୀନ ଫାଇଲିଂ',
    'ବାସ୍ତବ ସମୟ ଜାମିନ ଆବେଦନ ଟ୍ରାକିଂ ବ୍ୟବସ୍ଥା'
  ],
  quiz: [
    {
      question_en: 'Where is the Principal Seat of the High Court of Orissa located?',
      question_or: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟର ପ୍ରଧାନ ପୀଠ କେଉଁଠାରେ ଅବସ୍ଥିତ?',
      options_en: ['Cuttack', 'Bhubaneswar', 'Sambalpur', 'Berhampur'],
      answer_index: 0,
      explanation_en: 'The High Court of Orissa was established at Cuttack in 1948.'
    },
    {
      question_en: 'In which year was the High Court of Orissa established?',
      question_or: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ କେଉଁ ବର୍ଷ ପ୍ରତିଷ୍ଠିତ ହୋଇଥିଲା?',
      options_en: ['1947', '1948', '1950', '1952'],
      answer_index: 1,
      explanation_en: 'Orissa High Court was inaugurated on 26 July 1948.'
    },
    {
      question_en: 'Who was the first Chief Justice of Orissa High Court?',
      question_or: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟର ପ୍ରଥମ ପ୍ରଧାନ ବିଚାରପତି କିଏ ଥିଲେ?',
      options_en: ['Justice Bira Kishore Ray', 'Justice B. Jagannadha Das', 'Justice Lingaraj Panigrahi', 'Justice R. L. Narasimham'],
      answer_index: 0,
      explanation_en: 'Justice Bira Kishore Ray served as the first Chief Justice.'
    },
    {
      question_en: 'How many sanctioned judge strengths does Orissa High Court have?',
      question_or: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟର ମଞ୍ଜୁରପ୍ରାପ୍ତ ବିଚାରପତି ସଂଖ୍ୟା କେତେ?',
      options_en: ['27', '33', '31', '35'],
      answer_index: 1,
      explanation_en: 'The sanctioned strength is 33 judges (24 permanent, 9 additional).'
    },
    {
      question_en: 'Which article of the Indian Constitution provides for a High Court in every State?',
      question_or: 'ଭାରତୀୟ ସମ୍ବିଧାନର କେଉଁ ଧାରା ପ୍ରତ୍ୟେକ ରାଜ୍ୟରେ ଏକ ଉଚ୍ଚ ନ୍ୟାୟାଳୟ ବ୍ୟବସ୍ଥା କରେ?',
      options_en: ['Article 214', 'Article 226', 'Article 124', 'Article 243'],
      answer_index: 0,
      explanation_en: 'Article 214 of the Constitution provides that there shall be a High Court for each State.'
    }
  ]
};

const postRes = await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '127.0.0.1' },
    body: JSON.stringify(testPayload)
  }),
  env,
  adminActor
);
assert.equal(postRes.status, 201, 'POST /api/admin/current-affairs must return 201 Created');
const postJson = await postRes.json();
ok(postJson.ok, 'POST response ok is true');
ok(postJson.item && postJson.item.id, 'POST returns saved capsule item with id');
assert.equal(postJson.item.title_en, testPayload.title_en);
assert.equal(postJson.item.quiz.length, 5, 'Persisted exactly 5 MCQs in D1');

// Authenticated GET retrieves published capsule
const getRes = await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', { method: 'GET' }),
  env,
  adminActor
);
assert.equal(getRes.status, 200, 'GET /api/admin/current-affairs must return 200');
const getJson = await getRes.json();
ok(getJson.ok, 'GET response ok is true');
ok(Array.isArray(getJson.items) && getJson.items.length >= 1, 'GET returns published capsule array');
assert.equal(getJson.items[0].id, postJson.item.id);

// Check fast-publish.js exports
const fpModule = require(path.join(ROOT, 'admin/fast-publish.js'));
ok(typeof fpModule.initCurrentAffairsPublisher === 'function', 'CSOFastPublish.initCurrentAffairsPublisher is exported');

console.log('--- Step 3: Master Navigation Schema Preservation (23 Folders / 299 Modules) ---');
assert.equal(navJson.folders.length, 23, 'Preserved exactly 23 folders in master-navigation.json');
const totalModules = navJson.folders.reduce((acc, f) => acc + (f.modules || []).length, 0);
assert.equal(totalModules, 299, 'Preserved exactly 299 modules in master-navigation.json');

const caModule = (navJson.folders.find((f) => f.id === 'folder-04') || {}).modules?.find((m) => m.id === 'module-04-004');
ok(caModule && caModule.title === 'Current Affairs', 'module-04-004 is Current Affairs in folder-04');

console.log('--- Step 4: 100% CSP Compliance ---');
// 1. admin/index.html checks
ok(!/<style\b/i.test(adminHtml), 'admin/index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(adminHtml), 'admin/index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(adminHtml), 'admin/index.html: zero inline event handlers (onclick, etc.)');
const noExtScripts = adminHtml.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
ok(!/<script\b/i.test(noExtScripts), 'admin/index.html: zero executable inline <script>');

// 2. admin/fast-publish.js checks
ok(!/\.innerHTML\b/.test(fastPubJs), 'admin/fast-publish.js: zero .innerHTML');
ok(!/\.outerHTML\b/.test(fastPubJs), 'admin/fast-publish.js: zero .outerHTML');
ok(!/insertAdjacentHTML/.test(fastPubJs), 'admin/fast-publish.js: zero insertAdjacentHTML');
ok(!/document\.write/.test(fastPubJs), 'admin/fast-publish.js: zero document.write');
ok(!/\bonclick\s*=/.test(fastPubJs), 'admin/fast-publish.js: zero onclick=');
ok(!/\.style\./.test(fastPubJs), 'admin/fast-publish.js: zero .style assignments');

// 3. admin/admin.js checks
ok(!/\.innerHTML\b/.test(adminJs), 'admin/admin.js: zero .innerHTML');

console.log('--- Step 5: Version & Cache Bumps (v208) ---');
const swSrc = read('sw.js');
const opsSentinelSrc = read('functions/_lib/ops-sentinel.js');
const testOpsSentinelSrc = read('scripts/test-ops-sentinel.mjs');

ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v208';"), 'sw.js CACHE_NAME bumped to v208');
ok(opsSentinelSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v208';"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION bumped to v208');
ok(testOpsSentinelSrc.includes("cso-candidate-cache-v208"), 'test-ops-sentinel.mjs asserts v208');

ok(adminHtml.includes('/admin/studio.css?v=20261122v208'), 'admin/index.html references studio.css?v=20261122v208');
ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v208'), 'admin/index.html references fast-publish.js?v=20261122v208');
ok(adminHtml.includes('/admin/admin.js?v=20261122v208'), 'admin/index.html references admin.js?v=20261122v208');

console.log(`PASS: test-admin-ca-publisher-v208.mjs completed successfully (${passed} assertions passed)!`);
