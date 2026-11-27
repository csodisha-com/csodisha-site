#!/usr/bin/env node
/**
 * Phase 3 (v312): 10-Folder Admin Studio Architecture Verification Suite
 *
 * Verifies end-to-end:
 *  1. Strictly additive D1 migration 0146_admin_2fa_cbt_monetization_v312.sql (standalone & layered on 0003+0144+0145).
 *  2. Folder #10 Real TOTP 2FA & Recovery Codes: secret generation, at-rest AES-GCM encryption,
 *     otpauth:// URI, RFC 6238 HMAC-SHA1 verification, 8 single-use hashed recovery codes,
 *     live login gate enforcement (/api/auth/login & _worker.js), and admin_audit_logs entries.
 *  3. Folder #5 CBT Mock Test & Question Bank Studio + Public /mock-tests/ API:
 *     bilingual exam CRUD, CSV bulk import (dry-run + commit), answer-stripped public fetch,
 *     real server-side grading with negative marking, bilingual explanations & D1 mock_attempts insert.
 *  4. Folder #7 30-District "Assigned For You" Push Desk & Support Inbox:
 *     All Odisha + 30 Odisha districts targeting, real /student-dashboard/ matching,
 *     public POST /api/public/support creation, and Open -> In Progress -> Resolved workflow.
 *  5. Folder #10 Live Payments & Ads Studio:
 *     Gateway readiness check (zero fake orders), ad_slots CRUD, active public delivery,
 *     real impression/click tracking via POST /api/public/ads/track, plans & promo coupons CRUD.
 *  6. Strict CSP compliance, zero hardcoded hex in v312 CSS, QR SVG encoder validation,
 *     and cso-candidate-cache-v312 Service Worker & Ops Sentinel sync.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

import { totpCode } from '../functions/_lib/admin-2fa.js';
import {
  handleAdminTotpApi,
  hasAccountTotpEnabled,
  verifyAccountTotpOrRecovery
} from '../functions/api/admin/totp.js';
import { onRequestPost as handlePagesLoginPost } from '../functions/api/auth/login.js';
import { hashPassword } from '../functions/api/auth/_utils.js';
import { handleAdminMockTestsV312, parseMockQuestionsCsv } from '../functions/api/admin/mock-tests.js';
import { handlePublicMockTestsApi } from '../functions/api/public/mock-tests.js';
import {
  handleAdminCandidateOpsApi,
  getMatchingDistrictAssignments,
  ODISHA_30_DISTRICTS
} from '../functions/api/admin/candidate-ops.js';
import { handlePublicSupportSubmitApi } from '../functions/api/public/support.js';
import { handleAdminBillingAdsApi } from '../functions/api/admin/billing-ads.js';
import { handlePublicAdsApi } from '../functions/api/public/ads.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';
import { handleCandidateHubConfigApi, handleCandidateAssignedItemsApi } from '../functions/_lib/candidate-hub-governance.js';
import { createSession } from '../functions/api/auth/_utils.js';
import { handleAdminGuidesApi } from '../functions/api/admin/guides.js';
import {
  handlePublicGuidesRoute,
  handlePublicGuidesApi,
  renderPublicGuideArticleHtml,
  resolveSocialPreviewImageUrl,
  DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH
} from '../functions/_lib/informative-guides.js';
import { handleSitemapXml } from '../functions/api/content/_seo.js';
import { recordGuideSlugChange } from '../functions/_lib/informative-guides.js';
import { VALID_AI_MODES } from '../functions/_lib/ai-coauthor.js';
import { handleAdminAiCoauthorApi } from '../functions/api/admin/ai-coauthor.js';
import { handleAdminAiProvidersApi } from '../functions/api/admin/ai-providers.js';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

function makeD1(includeLegacyCms = false) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      lockout_until INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'candidate',
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      full_name TEXT DEFAULT '',
      email TEXT UNIQUE,
      phone TEXT DEFAULT '',
      district TEXT DEFAULT '',
      password_hash TEXT DEFAULT '',
      salt TEXT DEFAULT '',
      failed_attempts INTEGER DEFAULT 0,
      lockout_until INTEGER DEFAULT 0,
      target_streams TEXT DEFAULT '[]',
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  if (includeLegacyCms) {
    sqlite.exec(read('migrations/0003_cms_content.sql'));
  }
  sqlite.exec(read('migrations/0144_admin_studio_10folder_v310.sql'));
  sqlite.exec(read('migrations/0146_admin_2fa_cbt_monetization_v312.sql'));

  function wrapStmt(sql, params = []) {
    return {
      _sql: sql,
      _params: params,
      bind(...args) { return wrapStmt(sql, args); },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() {
        const info = sqlite.prepare(sql).run(...params);
        return { success: true, meta: { changes: Number(info.changes) } };
      }
    };
  }
  return {
    sqlite,
    prepare(sql) { return wrapStmt(sql, []); },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) {
        if (/^\s*SELECT/i.test(s._sql)) out.push(await s.all());
        else out.push(await s.run());
      }
      return out;
    }
  };
}

function jsonReq(url, method = 'GET', body = null, extraHeaders = {}) {
  const init = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1', ...extraHeaders }
  };
  if (body !== null) init.body = JSON.stringify(body);
  return new Request(url, init);
}

const adminActor = { userId: 'u_admin_v312', email: 'admin@csodisha.com', role: 'admin' };

console.log('\n=== Phase 3 (v312) Admin Studio 2FA, CBT, 30-District Ops & Monetization Suite ===\n');

// 1. Additive D1 Migration 0146 (standalone & layered on 0003)
await check('1. Additive D1 migration 0146 executes cleanly standalone AND layered on legacy 0003', async () => {
  const sql = read('migrations/0146_admin_2fa_cbt_monetization_v312.sql');
  const expectedTables = [
    'admin_totp_credentials',
    'mock_tests',
    'mock_questions',
    'mock_attempts',
    'candidate_assignments',
    'support_tickets',
    'ad_slots',
    'monetization_plans',
    'payment_coupons',
    'payment_orders'
  ];
  for (const tbl of expectedTables) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Migration 0146 missing table ${tbl}`);
  }
  assert.ok(!/\bDROP\s+TABLE\b/i.test(sql) && !/\bRENAME\s+COLUMN\b/i.test(sql), 'Migration 0146 must be strictly additive');

  const fresh = makeD1(false);
  const layered = makeD1(true);
  for (const db of [fresh, layered]) {
    const names = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    for (const tbl of expectedTables) {
      assert.ok(names.includes(tbl), `Table ${tbl} not present after migration`);
    }
  }
});

// 2. Real TOTP 2FA, Recovery Codes & Login Gate Enforcement
await check('2. Folder #10 TOTP 2FA: secret setup, AES-GCM encryption, RFC 6238 verify, 8 single-use recovery codes & login enforcement', async () => {
  const db = makeD1(false);
  const env = { DB: db, TOTP_ENC_KEY: 'v312-unit-test-encryption-secret' };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  // Create real admin user in D1
  const salt = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
  const pass = 'Str0ngOdishaAdmin!2026';
  const passHash = await hashPassword(pass, salt, 100000);
  db.sqlite.prepare(
    'INSERT INTO users (id, email, password_hash, salt, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(adminActor.userId, adminActor.email, passHash, salt, 'admin', 1700000000, 1700000000);

  // Initially disabled
  assert.equal(await hasAccountTotpEnabled(env, adminActor.userId), false);

  // Step A: Initiate TOTP setup
  const setupRes = await handleAdminTotpApi(
    jsonReq('https://csodisha.com/api/admin/totp/setup', 'POST', {}),
    env, adminActor, 'setup', ctx
  );
  assert.equal(setupRes.status, 200);
  const setupData = await setupRes.json();
  assert.ok(setupData.secret && setupData.secret.length >= 26, 'Expected 160-bit Base32 secret');
  assert.ok(setupData.otpauth_uri.startsWith('otpauth://totp/'), 'Expected standard otpauth:// URI');

  // Verify at-rest encryption (plaintext secret never stored raw)
  const storedRow = db.sqlite.prepare('SELECT secret_enc, enabled FROM admin_totp_credentials WHERE admin_id = ?').get(adminActor.userId);
  assert.equal(storedRow.enabled, 0);
  assert.ok(storedRow.secret_enc.startsWith('v1:'), 'Secret must be AES-GCM encrypted');
  assert.ok(!storedRow.secret_enc.includes(setupData.secret), 'Plaintext Base32 secret must not appear in secret_enc');

  // Step B: Wrong 6-digit code fails to enable
  const badEnable = await handleAdminTotpApi(
    jsonReq('https://csodisha.com/api/admin/totp/enable', 'POST', { code: '000000' }),
    env, adminActor, 'enable', ctx
  ).catch(e => e);
  assert.equal(badEnable.status, 400);

  // Step C: Valid live RFC 6238 code enables 2FA and issues 8 single-use hashed recovery codes
  const liveCode = await totpCode(setupData.secret, Date.now());
  const enableRes = await handleAdminTotpApi(
    jsonReq('https://csodisha.com/api/admin/totp/enable', 'POST', { code: liveCode }),
    env, adminActor, 'enable', ctx
  );
  assert.equal(enableRes.status, 200);
  const enableData = await enableRes.json();
  assert.equal(enableData.enabled, true);
  assert.equal(enableData.recovery_codes.length, 8);
  assert.equal(await hasAccountTotpEnabled(env, adminActor.userId), true);

  // Verify only SHA-256 hashes stored in recovery_hashes_json
  const credAfter = db.sqlite.prepare('SELECT recovery_hashes_json FROM admin_totp_credentials WHERE admin_id = ?').get(adminActor.userId);
  for (const rc of enableData.recovery_codes) {
    assert.ok(!credAfter.recovery_hashes_json.includes(rc), 'Plaintext recovery code must never be stored in D1');
  }

  // Step D: Login enforcement (no code -> 401 requires_2fa, wrong code -> 401, valid TOTP -> 200, recovery code single-use -> 200 then 401)
  const loginNo2fa = await handlePagesLoginPost({
    request: jsonReq('https://csodisha.com/api/auth/login', 'POST', { email: adminActor.email, password: pass }, { 'cf-connecting-ip': '198.51.100.11' }),
    env
  });
  assert.equal(loginNo2fa.status, 401);
  const no2faData = await loginNo2fa.json();
  assert.equal(no2faData.requires_2fa, true);
  assert.equal(no2faData.totp_enabled, true);

  const loginBad2fa = await handlePagesLoginPost({
    request: jsonReq('https://csodisha.com/api/auth/login', 'POST', { email: adminActor.email, password: pass, twofa_code: '999999' }, { 'cf-connecting-ip': '198.51.100.12' }),
    env
  });
  assert.equal(loginBad2fa.status, 401);

  const loginGoodTotp = await handlePagesLoginPost({
    request: jsonReq('https://csodisha.com/api/auth/login', 'POST', { email: adminActor.email, password: pass, twofa_code: liveCode }, { 'cf-connecting-ip': '198.51.100.13' }),
    env
  });
  assert.equal(loginGoodTotp.status, 200);
  const goodTotpData = await loginGoodTotp.json();
  assert.equal(goodTotpData.success, true);

  // Recovery code single-use consumption on login
  const rec0 = enableData.recovery_codes[0];
  const loginRec1 = await handlePagesLoginPost({
    request: jsonReq('https://csodisha.com/api/auth/login', 'POST', { email: adminActor.email, password: pass, twofa_code: rec0 }, { 'cf-connecting-ip': '198.51.100.14' }),
    env
  });
  assert.equal(loginRec1.status, 200, 'Valid single-use recovery code must succeed');

  const loginRecReplay = await handlePagesLoginPost({
    request: jsonReq('https://csodisha.com/api/auth/login', 'POST', { email: adminActor.email, password: pass, twofa_code: rec0 }, { 'cf-connecting-ip': '198.51.100.15' }),
    env
  });
  assert.equal(loginRecReplay.status, 401, 'Replayed single-use recovery code must be rejected');

  // Verify real audit log records for both failed and successful 2FA challenges
  await Promise.all(waits);
  const auditActions = db.sqlite.prepare('SELECT action FROM admin_audit_logs').all().map(r => r.action);
  assert.ok(auditActions.includes('admin.2fa.enabled'), 'Missing admin.2fa.enabled audit entry');
  assert.ok(auditActions.includes('admin.2fa.failed'), 'Missing admin.2fa.failed audit entry');
  assert.ok(auditActions.includes('admin.2fa.verified'), 'Missing admin.2fa.verified audit entry');

  // Verify pure-JS QR SVG encoder renders valid matrix for otpauth:// URI
  const qrSandbox = { window: {}, document: {}, TextEncoder };
  vm.runInNewContext(read('admin/qr-svg.js'), qrSandbox);
  const qrMatrix = qrSandbox.window.CSOQrSvg.encodeMatrix(setupData.otpauth_uri);
  assert.ok(qrMatrix.size >= 21 && qrMatrix.modules.length === qrMatrix.size, 'QR SVG encoder must generate valid square module matrix');
});

// 3. CBT Mock Test Studio + CSV Import + Public Grading & Attempt Recording
await check('3. Folder #5 CBT Mock Tests: bilingual exam CRUD, CSV bulk import, answer-stripped public fetch & real negative-marking score', async () => {
  const db = makeD1(true); // Test with legacy 0003 schema + 0146 reconciled seamlessly
  const env = { DB: db };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  const createRes = await handleAdminMockTestsV312(
    jsonReq('https://csodisha.com/api/admin/mock-tests', 'POST', {
      title_en: 'OPSC OAS Odisha History Mini CBT',
      title_or: 'ଓଡ଼ିଶା ଇତିହାସ ମକ୍ ଟେଷ୍ଟ',
      exam_category: 'OPSC',
      duration_minutes: 20,
      negative_mark: 0.25,
      status: 'draft'
    }),
    env, adminActor, null, null, null, ctx
  );
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  const testId = created.id;
  const slug = created.slug;

  // Add 1 bilingual question manually
  const q1Res = await handleAdminMockTestsV312(
    jsonReq(`https://csodisha.com/api/admin/mock-tests/${testId}/questions`, 'POST', {
      question_en: 'Who built the Konark Sun Temple?',
      question_or: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର କିଏ ନିର୍ମାଣ କରିଥିଲେ?',
      options: ['Narasimhadeva I', 'Anantavarman Chodaganga', 'Kapilendra Deva', 'Kharavela'],
      correct_index: 0,
      explanation_en: 'King Narasimhadeva I of the Eastern Ganga dynasty built Konark Sun Temple in the 13th century.',
      explanation_or: 'ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ରାଜା ପ୍ରଥମ ନରସିଂହଦେବ ଏହାକୁ ନିର୍ମାଣ କରିଥିଲେ।'
    }),
    env, adminActor, testId, 'questions', null, ctx
  );
  assert.equal(q1Res.status, 201);

  // Bulk CSV import (2 valid rows + 1 invalid row)
  const csvRaw = [
    'question_en,question_or,option_a,option_b,option_c,option_d,correct_index,explanation_en,explanation_or',
    '"Which lake in Odisha is Asia\'s largest brackish water lagoon?","ଓଡ଼ିଶାର କେଉଁ ହ୍ରଦ ଏସିଆର ବୃହତ୍ତମ ଲୁଣା ହ୍ରଦ?","Chilika Lake","Ansupa Lake","Kanjia Lake","Tampara Lake",0,"Chilika Lake spans Puri, Khordha, and Ganjam districts.","ଚିଲିକା ହ୍ରଦ ପୁରୀ, ଖୋର୍ଦ୍ଧା ଓ ଗଞ୍ଜାମରେ ବିସ୍ତୃତ।"',
    '"Capital city of Odisha is?","ଓଡ଼ିଶାର ରାଜଧାନୀ କଣ?","Cuttack","Bhubaneswar","Puri","Sambalpur",B,"Bhubaneswar became capital in 1948.","୧୯୪୮ରେ ଭୁବନେଶ୍ୱର ରାଜଧାନୀ ହେଲା।"',
    '"Broken row missing options","","Only A","","","","0","",""'
  ].join('\n');

  assert.equal(parseMockQuestionsCsv(csvRaw).length, 3);

  const dryRes = await handleAdminMockTestsV312(
    jsonReq(`https://csodisha.com/api/admin/mock-tests/${testId}/import-csv`, 'POST', { csv: csvRaw, dry_run: true }),
    env, adminActor, testId, 'import-csv', null, ctx
  );
  const dryData = await dryRes.json();
  assert.equal(dryData.valid_count, 2);
  assert.equal(dryData.invalid_count, 1);

  const impRes = await handleAdminMockTestsV312(
    jsonReq(`https://csodisha.com/api/admin/mock-tests/${testId}/import-csv`, 'POST', { csv: csvRaw, dry_run: false, skip_invalid: true }),
    env, adminActor, testId, 'import-csv', null, ctx
  );
  const impData = await impRes.json();
  assert.equal(impData.imported, 2);
  assert.equal(impData.skipped, 1);

  // Draft test must not appear publicly
  const pubBefore = await (await handlePublicMockTestsApi(new Request('https://csodisha.com/api/public/mock-tests'), env, '', '')).json();
  assert.equal(pubBefore.items.length, 0);

  // Publish test
  const pubStatusRes = await handleAdminMockTestsV312(
    jsonReq(`https://csodisha.com/api/admin/mock-tests/${testId}/status`, 'POST', { status: 'published' }),
    env, adminActor, testId, 'status', null, ctx
  );
  assert.equal(pubStatusRes.status, 200);

  // Public fetch strips answers
  const pubDetailRes = await handlePublicMockTestsApi(new Request(`https://csodisha.com/api/public/mock-tests/${slug}`), env, slug, '');
  assert.equal(pubDetailRes.status, 200);
  const pubDetail = await pubDetailRes.json();
  assert.equal(pubDetail.questions.length, 3);
  assert.equal(pubDetail.questions[0].correct_index, undefined, 'Public CBT fetch must never leak correct_index');
  assert.equal(pubDetail.questions[0].correct_option, undefined, 'Public CBT fetch must never leak correct_option');

  // Public submit: Q1 correct (+1), Q2 wrong (-0.25), Q3 correct (+1) => 1.75 / 3
  const answers = {
    [pubDetail.questions[0].id]: 0,
    [pubDetail.questions[1].id]: 2,
    [pubDetail.questions[2].id]: 'B'
  };
  const submitRes = await handlePublicMockTestsApi(
    jsonReq(`https://csodisha.com/api/public/mock-tests/${slug}/submit`, 'POST', { answers, timeTakenSec: 95 }),
    env, slug, 'submit'
  );
  assert.equal(submitRes.status, 200);
  const result = await submitRes.json();
  assert.equal(result.score, 1.75);
  assert.equal(result.total_marks, 3);
  assert.equal(result.correct_count, 2);
  assert.equal(result.wrong_count, 1);
  assert.equal(result.unanswered_count, 0);
  assert.ok(result.breakdown[0].explanation_en.includes('Narasimhadeva I'));
  assert.ok(result.breakdown[0].explanation_or.includes('ନରସିଂହଦେବ'));

  // Verify real D1 mock_attempts row recorded
  const attemptRow = db.sqlite.prepare('SELECT * FROM mock_attempts WHERE test_id = ?').get(testId);
  assert.ok(attemptRow, 'Real attempt must be persisted in mock_attempts');
  assert.equal(Number(attemptRow.score), 1.75);
  await Promise.all(waits);
});

// 4. 30-District "Assigned For You" Push Desk & Public Support Inbox
await check('4. Folder #7 30-District Assignments matching & Public Support ticket lifecycle (Open -> In Progress -> Resolved)', async () => {
  assert.equal(ODISHA_30_DISTRICTS.length, 30, 'Must include all 30 official Odisha districts');
  const db = makeD1(false);
  const env = { DB: db };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const pastDate = '2020-01-01';

  // Push 4 targeted assignments
  for (const payload of [
    { title: 'All Odisha OPSC Syllabus PDF', resource_type: 'study_pdf', resource_url: '/files/study-pdfs/opsc-syllabus.pdf', target_district: 'All Odisha', target_exam: '', expires_at: futureDate },
    { title: 'Khordha OPSC Mock Test Pack', resource_type: 'mock_test', resource_url: '/mock-tests/?exam=OPSC', target_district: 'Khordha', target_exam: 'OPSC', expires_at: futureDate },
    { title: 'Puri OSSC Admit Notice', resource_type: 'exam_notice', resource_url: '/jobs/', target_district: 'Puri', target_exam: 'OSSC', expires_at: futureDate },
    { title: 'Expired Khordha Notice', resource_type: 'exam_notice', resource_url: '/jobs/', target_district: 'Khordha', target_exam: 'OPSC', expires_at: pastDate }
  ]) {
    const r = await handleAdminCandidateOpsApi(
      jsonReq('https://csodisha.com/api/admin/candidate-ops/assignments', 'POST', payload),
      env, adminActor, 'assignments', null, ctx
    );
    assert.equal(r.status, 201);
  }

  // Match for Khordha (alias "Khurda") + OPSC candidate
  const khordhaMatches = await getMatchingDistrictAssignments(db, { district: 'Khurda', examGoals: ['opsc'] });
  const khordhaTitles = khordhaMatches.map(m => m.title);
  assert.equal(khordhaMatches.length, 2);
  assert.ok(khordhaTitles.includes('All Odisha OPSC Syllabus PDF'));
  assert.ok(khordhaTitles.includes('Khordha OPSC Mock Test Pack'));
  assert.ok(!khordhaTitles.includes('Puri OSSC Admit Notice'));
  assert.ok(!khordhaTitles.includes('Expired Khordha Notice'));

  // Match for Puri + OSSC candidate
  const puriMatches = await getMatchingDistrictAssignments(db, { district: 'Puri', examGoals: ['ossc'] });
  assert.equal(puriMatches.length, 2);
  assert.ok(puriMatches.some(m => m.title === 'Puri OSSC Admit Notice'));

  // Public Support submission -> Admin inbox lifecycle
  const pubSup = await handlePublicSupportSubmitApi(
    jsonReq('https://csodisha.com/api/public/support', 'POST', {
      ticket_type: 'report_error',
      page_url: '/jobs/?slug=opsc-oas-2026',
      subject: 'Broken PDF link on OPSC notice',
      message: 'The official advertisement link returns HTTP 404.',
      contact_email: 'aspirant@example.com'
    }, { 'cf-connecting-ip': '203.0.113.55' }),
    env
  );
  assert.equal(pubSup.status, 201);
  const ticket = await pubSup.json();
  assert.equal(ticket.status, 'open');

  const listOpen = await (await handleAdminCandidateOpsApi(
    new Request('https://csodisha.com/api/admin/candidate-ops/support'),
    env, adminActor, 'support', null, ctx
  )).json();
  assert.equal(listOpen.counts.total, 1);
  assert.equal(listOpen.counts.open, 1);

  // Transition Open -> In Progress -> Resolved
  const progRes = await handleAdminCandidateOpsApi(
    jsonReq(`https://csodisha.com/api/admin/candidate-ops/support/${ticket.id}`, 'PUT', {
      status: 'in_progress',
      admin_note: 'Checking updated opsc.gov.in PDF mirror'
    }),
    env, adminActor, 'support', ticket.id, ctx
  );
  assert.equal(progRes.status, 200);
  assert.equal((await progRes.json()).item.status, 'in_progress');

  const resvRes = await handleAdminCandidateOpsApi(
    jsonReq(`https://csodisha.com/api/admin/candidate-ops/support/${ticket.id}`, 'PUT', {
      status: 'resolved',
      admin_note: 'Replaced with verified /files/jobs/opsc-2026.pdf'
    }),
    env, adminActor, 'support', ticket.id, ctx
  );
  assert.equal(resvRes.status, 200);
  const after = await (await handleAdminCandidateOpsApi(
    new Request('https://csodisha.com/api/admin/candidate-ops/support'),
    env, adminActor, 'support', null, ctx
  )).json();
  assert.equal(after.counts.open, 0);
  assert.equal(after.counts.resolved, 1);
  await Promise.all(waits);
});

// 5. Payments & Ads Studio + Public Slot Delivery & Impression/Click Tracking
await check('5. Folder #10 Payments & Ads: gateway readiness, zero fake orders, live ad slot delivery & real impression/click tracking', async () => {
  const db = makeD1(false);
  const envNoKeys = { DB: db };
  const envWithKeys = { DB: db, RAZORPAY_KEY_ID: 'rzp_test_123', RAZORPAY_KEY_SECRET: 'sec_456', CSO_UPI_VPA: 'cso@upi' };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  // Zero fake orders / stats & honest gateway readiness
  const ov0 = await (await handleAdminBillingAdsApi(new Request('https://csodisha.com/api/admin/billing-ads/overview'), envNoKeys, adminActor, 'overview', null, ctx)).json();
  assert.equal(ov0.gateway_readiness.razorpay_ready, false);
  assert.equal(ov0.gateway_readiness.upi_ready, false);
  assert.equal(ov0.stats.orders_total, 0);
  assert.equal(ov0.stats.total_impressions, 0);

  const ov1 = await (await handleAdminBillingAdsApi(new Request('https://csodisha.com/api/admin/billing-ads/overview'), envWithKeys, adminActor, 'overview', null, ctx)).json();
  assert.equal(ov1.gateway_readiness.razorpay_ready, true);
  assert.equal(ov1.gateway_readiness.upi_ready, true);

  // Create active ad slot
  const adRes = await handleAdminBillingAdsApi(
    jsonReq('https://csodisha.com/api/admin/billing-ads/ads', 'POST', {
      slot_key: 'jobs_top_sponsor',
      title: 'Odisha State Library Free Coaching Fellowship',
      image_url: '/files/images/fellowship-banner.webp',
      target_url: 'https://partner.odisha-edu.org/fellowship',
      badge_text: 'Sponsored',
      active: 1
    }),
    envNoKeys, adminActor, 'ads', null, ctx
  );
  assert.equal(adRes.status, 201);
  const ad = (await adRes.json()).item;
  assert.equal(ad.impressions, 0);
  assert.equal(ad.clicks, 0);

  // Public GET /api/public/ads returns active slot
  const pubAds = await (await handlePublicAdsApi(new Request('https://csodisha.com/api/public/ads?slot_key=jobs_top_sponsor'), envNoKeys, '')).json();
  assert.equal(pubAds.items.length, 1);
  assert.equal(pubAds.items[0].rel, 'sponsored noopener noreferrer');

  // Track 2 real impressions and 1 real click
  await handlePublicAdsApi(jsonReq('https://csodisha.com/api/public/ads/track', 'POST', { id: ad.id, event: 'impression' }), envNoKeys, 'track');
  await handlePublicAdsApi(jsonReq('https://csodisha.com/api/public/ads/track', 'POST', { id: ad.id, event: 'impression' }), envNoKeys, 'track');
  const clkRes = await (await handlePublicAdsApi(jsonReq('https://csodisha.com/api/public/ads/track', 'POST', { id: ad.id, event: 'click' }), envNoKeys, 'track')).json();
  assert.equal(clkRes.impressions, 2);
  assert.equal(clkRes.clicks, 1);

  // Pause ad -> immediately removed from public /api/public/ads
  await handleAdminBillingAdsApi(jsonReq(`https://csodisha.com/api/admin/billing-ads/ads/${ad.id}`, 'PUT', { active: 0 }), envNoKeys, adminActor, 'ads', ad.id, ctx);
  const pubAfterPause = await (await handlePublicAdsApi(new Request('https://csodisha.com/api/public/ads?slot_key=jobs_top_sponsor'), envNoKeys, '')).json();
  assert.equal(pubAfterPause.items.length, 0);

  // Plans & Coupons CRUD
  const planRes = await handleAdminBillingAdsApi(
    jsonReq('https://csodisha.com/api/admin/billing-ads/plans', 'POST', {
      name: 'Aspirant Pro 90D', slug: 'aspirant-pro-90d', price_inr: 199, validity_days: 90, features: ['Unlimited CBT', 'Offline PDFs']
    }),
    envNoKeys, adminActor, 'plans', null, ctx
  );
  assert.equal(planRes.status, 201);

  const cpnRes = await handleAdminBillingAdsApi(
    jsonReq('https://csodisha.com/api/admin/billing-ads/coupons', 'POST', {
      code: 'ODISHA25', discount_type: 'percent', discount_value: 25, max_uses: 500
    }),
    envNoKeys, adminActor, 'coupons', null, ctx
  );
  assert.equal(cpnRes.status, 201);
  assert.equal((await cpnRes.json()).item.code, 'ODISHA25');
  await Promise.all(waits);
});

// 6. Strict CSP, 4-theme Zero Hardcoded Hex & SW Cache Version v367
await check('6. Strict CSP compliance, zero hardcoded hex in v312/v367 CSS, and cso-candidate-cache-v385 sync', async () => {
  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v385');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v385';"), 'sw.js cache version must be cso-candidate-cache-v385');

  const jsFiles = [
    'admin/qr-svg.js',
    'admin/billing-ads.js',
    'admin/system-ops.js',
    'admin/study-publishing-studio.js',
    'admin/guides-publishing-studio.js',
    'admin/homepage-studio.js',
    'admin/studio-translator.js',
    'admin/candidate-hub-studio.js',
    'admin/admin.js',
    'admin/cms/login.js',
    'assets/js/home-hydration.js',
    'assets/js/guides-portal.js',
    'assets/js/pages/support-desk.js',
    'assets/shared-header.js',
    'mock-tests/assets/mock-tests.js'
  ];
  for (const rel of jsFiles) {
    const code = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', 'document.write(', 'eval(', 'new Function', '.style.']) {
      assert.ok(!code.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }

  for (const cssRel of ['admin/system-ops.css', 'assets/css/pages/support.css', 'assets/css/guides-portal.css']) {
    const css = read(cssRel).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), `${cssRel} must use semantic --cso-* tokens only (zero hardcoded hex)`);
  }

  // Ensure [Coming in v312] placeholder is completely replaced
  assert.ok(!read('admin/admin.js').includes('[Coming in v312]'), 'admin/admin.js must replace [Coming in v312] placeholder');
  assert.ok(!read('admin/system-ops.js').includes('[Coming in v312]'), 'admin/system-ops.js must replace [Coming in v312] placeholder');

  // v344: Admin ▾ topbar dropdown button, menu items, z-index 1300 & click/Escape wiring
  const adminHtml = read('admin/index.html');
  const adminJs = read('admin/admin.js');
  const studioCss = read('admin/studio.css');
  assert.ok(adminHtml.includes('id="btnAdminUserMenu"') && adminHtml.includes('id="adminUserDropdown"'), 'admin/index.html must include #btnAdminUserMenu and #adminUserDropdown');
  for (const act of ['palette', 'users', 'ops', 'live', 'signout']) {
    assert.ok(adminHtml.includes(`data-admin-menu-action="${act}"`), `admin/index.html missing Admin dropdown action ${act}`);
  }
  assert.ok(adminJs.includes('closeAdminUserMenu') && adminJs.includes('btnAdminUserMenu.addEventListener'), 'admin/admin.js must wire #btnAdminUserMenu toggle, outside click, and Escape close');
  assert.ok(studioCss.includes('.cso-user-dropdown') && studioCss.includes('z-index: 1300;'), 'admin/studio.css must layer .cso-user-dropdown at z-index 1300');

  // v345: Topbar flex sizing, zero overlap between Media Library & + Create New, and sessionTimer inside Admin dropdown
  const csCss = read('admin/command-suite.css');
  assert.ok(csCss.includes('flex: 1 1 180px; min-width: 140px; max-width: 280px;'), 'command-suite.css must size .cs-topbar-search flexibly');
  assert.ok(!adminHtml.includes('Live Site ↗'), 'admin/index.html must remove duplicate Live Site ↗ pill from topbar');
  const ddIdx = adminHtml.indexOf('id="adminUserDropdown"');
  const timerIdx = adminHtml.indexOf('id="sessionTimer"');
  assert.ok(ddIdx > 0 && timerIdx > ddIdx, 'admin/index.html must place #sessionTimer inside #adminUserDropdown');
});

// 7. End-to-End Candidate Hub 30-District Live Feed + _worker.js & _router.js Wiring Check
await check('7. Live /student-dashboard/ API merges 30-district assignments & _worker.js/_router.js wire all v312 routes', async () => {
  const db = makeD1(false);
  db.sqlite.exec(read('migrations/0137_candidate_hub_governance.sql'));
  db.sqlite.exec(`
    CREATE TABLE IF NOT EXISTS candidate_exam_preferences (
      user_id TEXT PRIMARY KEY,
      domain_slug TEXT DEFAULT '',
      track_slug TEXT DEFAULT '',
      primary_exam TEXT DEFAULT '',
      selected_exams_json TEXT DEFAULT '[]',
      selected_streams_json TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  const env = { DB: db };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  // Create real Khordha / OPSC candidate + active D1 session
  db.sqlite.prepare("INSERT INTO users (id, email, password_hash, salt, role) VALUES ('cand_kh1', 'khordha@example.com', '00', '00', 'candidate')").run();
  db.sqlite.prepare("INSERT INTO candidates (id, full_name, email, district, target_streams) VALUES ('cand_kh1', 'Asha Mohanty', 'khordha@example.com', 'Khordha', '[\"OPSC\"]')").run();
  const { token } = await createSession(env, { userId: 'cand_kh1', email: 'khordha@example.com', role: 'candidate' });

  // Push Khordha + All Odisha + Balasore assignments via Admin API
  const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await handleAdminCandidateOpsApi(jsonReq('https://csodisha.com/api/admin/candidate-ops/assignments', 'POST', {
    title: 'Khordha District OPSC Mock PDF', resource_type: 'study_pdf', resource_url: '/files/study-pdfs/khordha.pdf', target_district: 'Khordha', target_exam: 'OPSC', expires_at: futureDate
  }), env, adminActor, 'assignments', null, ctx);
  await handleAdminCandidateOpsApi(jsonReq('https://csodisha.com/api/admin/candidate-ops/assignments', 'POST', {
    title: 'Balasore Only Notice', resource_type: 'exam_notice', resource_url: '/jobs/', target_district: 'Balasore', target_exam: 'OSSC', expires_at: futureDate
  }), env, adminActor, 'assignments', null, ctx);

  // Verify live Candidate Hub endpoints return Khordha assignment and exclude Balasore
  const hubRes = await handleCandidateHubConfigApi(
    new Request('https://csodisha.com/api/candidate/hub-config', { headers: { Cookie: `cso_session=${token}` } }),
    env
  );
  assert.equal(hubRes.status, 200);
  const hubData = await hubRes.json();
  assert.ok(hubData.assigned_items.some(i => i.title_en === 'Khordha District OPSC Mock PDF'), 'hub-config must include matching 30-district assignment');
  assert.ok(!hubData.assigned_items.some(i => i.title_en === 'Balasore Only Notice'), 'hub-config must exclude non-matching district assignment');

  const assignedRes = await handleCandidateAssignedItemsApi(
    new Request('https://csodisha.com/api/candidate/assigned-items', { headers: { Cookie: `cso_session=${token}` } }),
    env
  );
  assert.equal(assignedRes.status, 200);
  const assignedData = await assignedRes.json();
  assert.ok(assignedData.items.some(i => i.title_en === 'Khordha District OPSC Mock PDF'));

  // Verify _worker.js & _router.js route all v312 endpoints + 2FA enforcement
  const workerSrc = read('_worker.js');
  for (const marker of [
    'hasAccountTotpEnabled',
    'verifyAccountTotpOrRecovery',
    'admin.2fa.verified',
    'admin.2fa.failed',
    '/api/public/mock-tests',
    '/api/public/support',
    '/api/public/ads',
    '/api/public/ads/track'
  ]) {
    assert.ok(workerSrc.includes(marker), `_worker.js missing v312 marker: ${marker}`);
  }
  const routerSrc = read('functions/api/admin/_router.js');
  for (const marker of ["resource === 'totp'", "resource === 'candidate-ops'", "resource === 'billing-ads'", 'handleAdminMockTestsV312']) {
    assert.ok(routerSrc.includes(marker), `functions/api/admin/_router.js missing v312 marker: ${marker}`);
  }

  await Promise.all(waits);
});

// 8. v348 Informative Articles & Guides Studio, Templates, Media Slots, AI, Live Preview, CRUD, SSR & Sitemap
await check('8. v348 Informative Articles & Guides: folder/templates/AI/Live Preview, CRUD API, /guides/<slug> SSR & sitemap.xml', async () => {
  const db = makeD1(false);
  db.sqlite.exec(read('migrations/0153_informative_guides_v348.sql'));
  const env = { DB: db };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  // A. Verify Admin UI wiring (sidebar folder + 6 sub-views, Launchpad, + Create New, CMS, 5 templates, AI buttons, Live Preview modal, v350 PDF Auto-Write & AI Images, v351 Extensive Long-Form UI, v354 Markdown Toolbar, v355 Header-Pinned Translator, v356 Body Lock & Wide Layout)
  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('data-create-target="guides/new"'), 'admin/index.html + Create New must include Informative Article / Guide');
  assert.ok(adminHtml.includes('id="headerTranslatorWrap"') && adminHtml.includes('id="btnHeaderOdiaTranslator"') && adminHtml.includes('aria-controls="csoHeaderTranslatorPopover"'), 'admin/index.html must pin #btnHeaderOdiaTranslator in the top header bar');
  assert.ok(adminHtml.includes('/admin/guides-publishing-studio.js?v=20261127v385'), 'admin/index.html must load guides-publishing-studio.js?v=20261127v385');
  assert.ok(adminHtml.includes('/admin/studio-translator.js?v=20261127v385'), 'admin/index.html must load studio-translator.js?v=20261127v385');
  assert.ok(adminHtml.includes('/assets/css/guides-portal.css?v=20261127v385'), 'admin/index.html must load guides-portal.css for identical Live Preview');

  const adminJs = read('admin/admin.js');
  for (const sub of ['All Articles & Guides', 'Step-by-Step How-To Guides', 'Exam Strategy & Study Handbooks', 'Citizen & Scheme Explainers', 'Odisha GK & Heritage', 'Drafts']) {
    assert.ok(adminJs.includes(sub), `admin/admin.js sidebar missing Informative Guides sub-view: ${sub}`);
  }
  assert.ok(read('admin/command-suite.js').includes('Informative Article / Guide'), 'command-suite.js Launchpad must include Informative Article / Guide card');
  assert.ok(read('admin/quick-create-studio.js').includes("'guides/new'"), 'quick-create-studio.js must route guides/new');
  assert.ok(read('admin/cms/cms.js').includes('viewInformativeGuides') && read('admin/cms/cms.js').includes('#/guides'), 'cms.js must wire Informative Guides');

  const guidesStudioJs = read('admin/guides-publishing-studio.js');
  for (const tplName of [
    'Step-by-Step How-To Guide',
    'Exam Strategy & Study Handbook',
    'Citizen & Government Scheme Explainer',
    'Odisha GK & Heritage Deep Dive',
    'Blank Custom Guide'
  ]) {
    assert.ok(guidesStudioJs.includes(tplName), `guides-publishing-studio.js missing starter template: ${tplName}`);
  }
  for (const marker of [
    'btnGuidePdfAutoWrite',
    'guidePdfDropzone',
    'btnGuideAiAutoFix',
    'chkGuideAiOverwrite',
    'chkGuideAiAutoCover',
    'btnGuideCoverAiGen',
    'btnGuideCoverAiRegen',
    'btnGuideAddAiIllustration',
    '/api/admin/ai/generate-image',
    'auto_fix_fill',
    '/assets/js/vendor/pdfjs/pdf.min.mjs',
    'btnGuideAiDraft',
    'btnGuideAiMeta',
    'btnGuideAiTranslateAll',
    'btnGuideLivePreview',
    'openLivePreviewModal',
    'Desktop (100%)',
    'Mobile (390px)',
    'is-mobile-frame',
    '/api/admin/media/upload',
    '/api/admin/files/upload',
    'syncSlugFromTitleIfUnmodified',
    'isBlueprintPlaceholderSlug',
    'gp-cover-frame',
    'gp-breadcrumb',
    'selGuideAiDepth',
    'guideBodyWordCount',
    'runDedicatedOdiaTranslationPass',
    'gp-toc-details',
    '1/3 Structuring full English guide',
    '2/3 Translating full guide',
    '3/3 Filling metadata, links',
    'btnGuideTranslateMdFull',
    'btnGuideTranslateMdSel',
    'guideMdTranslateBadge',
    'btnGuideCopyTranslatedMd',
    'translate_markdown',
    'Translating Markdown sections & tables',
    'inpGuideBodyEn',
    'guideBodyEnLockBadge',
    'Pasted Text Locked (Auto-Fill will preserve 100% verbatim)',
    'preserve_body_en',
    'gp-detail-shell',
    'gp-detail-grid',
    'gp-hero-media',
    'gp-article-card',
    'runGuideAutoFixAndFill',
    'LOCAL_META_QUOTA_NOTICE',
    'quota_exhausted_odia',
    'is-warn-amber',
    'selGuideAiEngine',
    'btnOpenAiProvidersModal',
    'csoAiProvidersModal',
    'cso_admin_preferred_ai_model',
    'AI_PROVIDER_PRESETS'
  ]) {
    assert.ok(guidesStudioJs.includes(marker), `guides-publishing-studio.js missing required UI marker: ${marker}`);
  }
  const translatorJs = read('admin/studio-translator.js');
  for (const marker of [
    'headerTranslatorWrap',
    'btnHeaderOdiaTranslator',
    'csoHeaderTranslatorPopover',
    'btnCsoHeaderTrClose',
    'chkCsoHeaderTrAuto',
    'btnCsoHeaderTrRun',
    'csoHeaderTrInputEn',
    'csoHeaderTrOutputOr',
    'btnCsoHeaderTrCopy',
    'btnCsoHeaderTrInsert',
    'btnCsoHeaderTrClear',
    'AUTO_DEBOUNCE_MS = 800',
    'translate_markdown',
    'window.CSOStudioTranslator'
  ]) {
    assert.ok(translatorJs.includes(marker), `admin/studio-translator.js missing required v355 header-popover marker: ${marker}`);
  }
  for (const removed of ['btnCsoFloatTranslatorToggle', 'csoStudioTranslatorRoot', 'csoFloatTranslatorDragHandle', 'cso-ftr-launcher']) {
    assert.ok(!translatorJs.includes(removed), `admin/studio-translator.js must remove old floating corner marker: ${removed}`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/js/vendor/pdfjs/pdf.min.mjs')), 'Self-hosted pdfjs pdf.min.mjs must exist');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/js/vendor/pdfjs/pdf.worker.min.mjs')), 'Self-hosted pdfjs pdf.worker.min.mjs must exist');
  assert.ok(read('functions/api/admin/_router.js').includes("id === 'generate-image'") && read('functions/api/admin/_router.js').includes('handleAdminAiGenerateImage'), '_router.js must route POST /api/admin/ai/generate-image');
  assert.ok(VALID_AI_MODES.has('auto_fix_fill') && VALID_AI_MODES.has('guide') && VALID_AI_MODES.has('suggest_meta') && VALID_AI_MODES.has('translate_fields') && VALID_AI_MODES.has('translate_markdown'), 'ai-coauthor.js must support auto_fix_fill, guide, suggest_meta, translate_fields & translate_markdown');
  const studioCss = read('admin/studio.css');
  assert.ok(studioCss.includes('.cso-guide-pdf-dropzone') && studioCss.includes('.cso-guide-cover-ai-bar'), 'admin/studio.css must style PDF Auto-Write dropzone & Cover AI bar');
  assert.ok(studioCss.includes('.cso-htr-btn') && studioCss.includes('.cso-htr-popover') && studioCss.includes('top: 64px;') && studioCss.includes('right: 16px;') && studioCss.includes('z-index: 1200;') && studioCss.includes('width: 420px;') && studioCss.includes('.cso-guide-md-tr-badge'), 'admin/studio.css must style header-pinned translator button, anchored 420px popover & Markdown toolbar controls');
  assert.ok(!studioCss.includes('.cso-ftr-launcher') && !studioCss.includes('.cso-ftr-root'), 'admin/studio.css must remove old floating bottom-right corner pill styles');
  assert.ok(studioCss.includes('min-height: 420px;') && studioCss.includes('.cso-guide-wordcount-bar'), 'admin/studio.css must style tall 420px body textareas & word-count bar');
  assert.ok(studioCss.includes('.cso-guide-preview-overlay') && studioCss.includes('.cso-guide-preview-frame.is-mobile-frame'), 'admin/studio.css must style the interactive Live Preview modal & 390px mobile frame');
  assert.ok(studioCss.includes('#csoGuideLivePreviewModal .cso-guide-preview-frame table tbody td') && studioCss.includes('opacity: 1 !important;'), 'admin/studio.css must enforce high-contrast tbody td isolation inside #csoGuideLivePreviewModal');
  const guidesCss = read('assets/css/guides-portal.css');
  assert.ok(guidesCss.includes('.gp-shell') && guidesCss.includes('.gp-detail-shell') && guidesCss.includes('max-width: 100%;') && guidesCss.includes('padding-inline: clamp(12px, 1.4vw, 24px);'), 'assets/css/guides-portal.css must expand .gp-shell/.gp-detail-shell edge-to-edge (max-width: 100%)');
  assert.ok(guidesCss.includes('.gp-detail-grid') && guidesCss.includes('grid-template-columns: 260px minmax(0, 1fr);') && guidesCss.includes('gap: 20px;') && guidesCss.includes('.gp-article-card'), 'assets/css/guides-portal.css must use edge-to-edge 260px + 1fr reading grid with 20px gap on desktop');
  assert.ok(guidesCss.includes('.gp-cover,') && guidesCss.includes('.gp-cover-frame') && guidesCss.includes('.gp-hero-media') && guidesCss.includes('overflow: hidden;') && guidesCss.includes('height: auto;') && guidesCss.includes('aspect-ratio: 16 / 9;') && guidesCss.includes('object-fit: contain;') && !guidesCss.includes('max-height: 440px;'), 'assets/css/guides-portal.css must enforce uncropped 16:9 height: auto + object-fit: contain on cover banners');
  assert.ok(guidesCss.includes('@media (max-width: 768px)') && guidesCss.includes('padding-inline: 8px;') && guidesCss.includes('padding: 14px 12px;'), 'assets/css/guides-portal.css must remove double side margins on mobile (<= 768px)');
  assert.ok(guidesCss.includes('.gp-inline-figure img') && read('functions/_lib/informative-guides.js').includes('/assets/css/guides-portal.css?v=20261127v385'), 'Informative guides SSR must load guides-portal.css?v=20261127v385 and style .gp-inline-figure img');
  assert.ok(guidesCss.includes('.gp-takeaways') && guidesCss.includes('clear: both;') && guidesCss.includes('z-index: 1;'), 'assets/css/guides-portal.css must prevent .gp-cover overlap on .gp-takeaways');
  assert.ok(guidesCss.includes('.gp-body table tbody td') && guidesCss.includes('color: var(--gp-ink, var(--cso-ink)) !important;') && guidesCss.includes('opacity: 1 !important;'), 'assets/css/guides-portal.css must enforce high-contrast tbody td text');
  assert.ok(guidesCss.includes('.gp-table-wrap') && guidesCss.includes('border-radius: 12px;') && guidesCss.includes('position: sticky;'), 'assets/css/guides-portal.css must style .gp-table-wrap & sticky table headers');
  assert.ok(guidesCss.includes('.gp-callout.is-warning') && guidesCss.includes('.gp-toc-details') && guidesCss.includes('scroll-margin-top: 90px;'), 'assets/css/guides-portal.css must style callout cards, collapsible TOC & heading scroll margins');
  assert.ok(guidesCss.includes('.gp-breadcrumb') && guidesCss.includes('gap: 6px;'), 'assets/css/guides-portal.css must space .gp-breadcrumb segments cleanly');

  // B. Real Admin CRUD API roundtrip with Photos, PDFs, Verified .gov.in Links, Key Takeaways & Related CTA
  const createRes = await handleAdminGuidesApi(
    jsonReq('https://csodisha.com/api/admin/guides', 'POST', {
      category: 'exam-strategy',
      scope: 'Odisha',
      read_minutes: 7,
      tags: 'OPSC, OAS, Strategy',
      is_pinned: true,
      is_exam: true,
      status: 'published',
      title_en: 'OPSC OAS Prelims 60-Day Strategy Handbook',
      title_or: 'OPSC OAS ପ୍ରିଲିମ୍ସ ୬୦-ଦିନିଆ ରଣନୀତି ପୁସ୍ତିକା',
      slug: 'opsc-oas-prelims-60-day-handbook',
      summary_en: 'Complete 60-day study schedule, high-yield Odisha GK syllabus breakdown, and PYQ practice roadmap.',
      summary_or: 'ସମ୍ପୂର୍ଣ୍ଣ ୬୦-ଦିନିଆ ଅଧ୍ୟୟନ ରୋଡମ୍ୟାପ୍ ଏବଂ PYQ ଅଭ୍ୟାସ ଯୋଜନା।',
      takeaways: [
        { text_en: 'Prioritize Odisha History, Geography, and Polity for 40% of GS Paper I.', text_or: 'ଓଡ଼ିଶା ଇତିହାସ ଓ ଭୂଗୋଳ ଉପରେ ବିଶେଷ ଧ୍ୟାନ ଦିଅନ୍ତୁ।' }
      ],
      body_en: '## Exam Pattern Snapshot\nOPSC OAS Prelims consists of GS Paper I & CSAT.\n\n### High-Yield Syllabus Breakdown\n- Odisha GK & Schemes\n- Indian Polity\n\n> [!TIP]\n> Attempt 2 timed CBT mock tests every week.\n\n| Paper | Marks |\n| --- | --- |\n| GS-I | 200 |',
      body_or: '## ପରୀକ୍ଷା ଢାଞ୍ଚା\nOPSC OAS ପ୍ରିଲିମ୍ସରେ ଦୁଇଟି ପେପର୍ ଅଛି।',
      cover_image: '/api/media/vault/image/2026/opsc-cover.webp',
      cover_caption_en: 'OPSC OAS Preparation Desk',
      cover_caption_or: 'OPSC OAS ପ୍ରସ୍ତୁତି',
      photos: [
        { url: '/api/media/vault/image/2026/study-plan.webp', caption_en: '60-Day Study Chart', caption_or: '୬୦-ଦିନିଆ ଚାର୍ଟ', alt: 'OPSC OAS 60-Day Study Plan Chart' }
      ],
      pdfs: [
        { title_en: 'OPSC OAS Official Syllabus PDF', title_or: 'OPSC OAS ସରକାରୀ ସିଲାବସ୍ PDF', url: '/files/study-pdfs/opsc-oas-syllabus.pdf', badge: 'Syllabus PDF · 1.2 MB' }
      ],
      links: [
        { label_en: 'OPSC Official Portal', label_or: 'OPSC ସରକାରୀ ପୋର୍ଟାଲ୍', url: 'https://www.opsc.gov.in/', is_official: true }
      ],
      related_cta: {
        type: 'mock_test',
        slug: 'opsc-oas-gs-mock-01',
        title_en: 'Practice OPSC OAS Full-Length CBT Mock',
        title_or: 'OPSC OAS ସମ୍ପୂର୍ଣ୍ଣ CBT ମକ୍ ଟେଷ୍ଟ ଅଭ୍ୟାସ କରନ୍ତୁ',
        cta_en: 'Start Practice Test →'
      }
    }),
    env, adminActor, '', '', ctx
  );
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()).item;
  assert.equal(created.slug, 'opsc-oas-prelims-60-day-handbook');
  assert.equal(created.photos.length, 1);
  assert.equal(created.pdfs.length, 1);
  assert.equal(created.links.length, 1);
  assert.equal(created.links[0].is_official, true);
  assert.equal(created.takeaways.length, 1);
  assert.equal(created.related_cta.url, '/mock-tests/?test=opsc-oas-gs-mock-01');

  // C. Public /guides/ Hub & /guides/<slug> SSR rendering + JSON-LD Article + Auto-TOC + /sitemap.xml
  const hubRes = await handlePublicGuidesRoute(new Request('https://csodisha.com/guides/'), env, new URL('https://csodisha.com/guides/'));
  assert.equal(hubRes.status, 200);
  const hubHtml = await hubRes.text();
  assert.ok(hubHtml.includes('OPSC OAS Prelims 60-Day Strategy Handbook') && hubHtml.includes('/guides/opsc-oas-prelims-60-day-handbook'), '/guides/ hub must list published guide');

  const artRes = await handlePublicGuidesRoute(
    new Request('https://csodisha.com/guides/opsc-oas-prelims-60-day-handbook'),
    env,
    new URL('https://csodisha.com/guides/opsc-oas-prelims-60-day-handbook')
  );
  assert.equal(artRes.status, 200);
  const artHtml = await artRes.text();
  assert.ok(artHtml.includes('"@type":"Article"'), '/guides/<slug> must emit valid JSON-LD Article structured data');
  assert.ok(artHtml.includes('class="gp-toc gp-toc-card gp-lang-en"') && artHtml.includes('class="gp-toc-details"') && artHtml.includes('Exam Pattern Snapshot'), '/guides/<slug> must auto-generate collapsible Table of Contents from headings');
  assert.ok(artHtml.includes('gp-takeaways') && artHtml.includes('gp-gallery-grid') && artHtml.includes('gp-pdf-card'), '/guides/<slug> must render Key Takeaways, Photo Gallery, and PDF Download Cards');
  assert.ok(artHtml.includes('class="gp-cover gp-cover-figure"') && artHtml.includes('class="gp-cover-frame gp-hero-media"') && artHtml.includes('class="gp-breadcrumb cso-detail-kicker"') && artHtml.includes('gp-detail-shell') && artHtml.includes('gp-detail-grid') && artHtml.includes('gp-article-card'), '/guides/<slug> must render wide .gp-detail-shell, .gp-detail-grid, .gp-article-card, full-bleed .gp-hero-media & .gp-breadcrumb classes');
  assert.ok(artHtml.includes('Official .gov.in Verified') && artHtml.includes('https://www.opsc.gov.in/'), '/guides/<slug> must render Verified Official .gov.in Links');
  assert.ok(artHtml.includes('/mock-tests/?test=opsc-oas-gs-mock-01') && artHtml.includes('Start Practice Test →'), '/guides/<slug> must render Related Practice CTA card');

  const apiRes = await handlePublicGuidesApi(new Request('https://csodisha.com/api/public/guides'), env, new URL('https://csodisha.com/api/public/guides'));
  assert.equal(apiRes.status, 200);
  assert.equal((await apiRes.json()).items.length, 1);

  const smRes = await handleSitemapXml(new Request('https://csodisha.com/sitemap.xml'), env);
  assert.equal(smRes.status, 200);
  const smXml = await smRes.text();
  assert.ok(smXml.includes('https://csodisha.com/guides/') && smXml.includes('https://csodisha.com/guides/opsc-oas-prelims-60-day-handbook'), '/sitemap.xml must include /guides/ and published /guides/<slug>');

  // D. Duplicate as Draft template, PATCH toggle Draft (hides from public 404), and DELETE cleanup
  const dupRes = await handleAdminGuidesApi(
    jsonReq(`https://csodisha.com/api/admin/guides/${created.id}/duplicate`, 'POST', {}),
    env, adminActor, created.id, 'duplicate', ctx
  );
  assert.equal(dupRes.status, 201);
  const dupItem = (await dupRes.json()).item;
  assert.equal(dupItem.status, 'draft');

  const patchRes = await handleAdminGuidesApi(
    jsonReq(`https://csodisha.com/api/admin/guides/${created.id}`, 'PATCH', { status: 'draft', is_pinned: false }),
    env, adminActor, created.id, '', ctx
  );
  assert.equal(patchRes.status, 200);
  const draftPublicRes = await handlePublicGuidesRoute(
    new Request('https://csodisha.com/guides/opsc-oas-prelims-60-day-handbook'),
    env,
    new URL('https://csodisha.com/guides/opsc-oas-prelims-60-day-handbook')
  );
  assert.equal(draftPublicRes.status, 404, 'Draft guide must not be served publicly');

  const delRes = await handleAdminGuidesApi(
    jsonReq(`https://csodisha.com/api/admin/guides/${created.id}`, 'DELETE'),
    env, adminActor, created.id, '', ctx
  );
  assert.equal(delRes.status, 200);

  // E. v359: Verify POST /api/admin/ai-coauthor (auto_fix_fill) still populates all English metadata locally when daily AI quota is exhausted
  db.sqlite.exec(read('migrations/0149_ai_coauthor_v318.sql'));
  db.sqlite.prepare(
    `INSERT INTO ai_generation_logs (id, actor_id, target_module, provider, model, estimated_neurons, status, created_at)
     VALUES ('ai_quota_v359', 'adm_1', 'guide', 'cloudflare_workers_ai', '@cf/meta/llama-3.1-8b-instruct-fp8-fast', 9800, 'ok', ?)`
  ).run(new Date().toISOString());
  const pastedQuotaBody = [
    '## Odisha State Scholarship Portal 2026 Complete Application Handbook',
    'Students belonging to SC, ST, OBC, SEBC, and EBC categories in Odisha can submit Post-Matric Scholarship applications online at https://scholarship.odisha.gov.in/ and verify Aadhaar DBT seeding status via https://npci.org.in/ or https://odisha.nic.in/ and https://utkaluniversity.edu.in/notices.',
    '',
    '### Important Steps & Eligibility Rules',
    '- Permanent resident of Odisha enrolled in a recognized higher education institution.',
    '- Aadhaar number must be seeded with an active bank account for Direct Benefit Transfer (DBT).',
    '- Upload valid income certificate, caste certificate, and previous year marksheet.',
    '- Track institute verification and district officer approval online using application ID.',
    '- Never share OTP or bank PIN with unauthorized agents; verify only on .gov.in portals.'
  ].join('\n');
  const aiQuotaRes = await handleAdminAiCoauthorApi(
    jsonReq('https://csodisha.com/api/admin/ai-coauthor', 'POST', {
      mode: 'auto_fix_fill',
      skip_body_or: true,
      preserve_body_en: true,
      draft: { category: 'how-to', scope: 'Odisha', body_en: pastedQuotaBody }
    }),
    env, adminActor, ctx
  );
  assert.equal(aiQuotaRes.status, 200, 'POST /api/admin/ai-coauthor auto_fix_fill must return 200 locally even when daily AI quota is exhausted');
  const aiQuotaJson = await aiQuotaRes.json();
  assert.equal(aiQuotaJson.ok, true);
  assert.equal(aiQuotaJson.provider, 'deterministic_fallback');
  assert.equal(aiQuotaJson.quota_exhausted_odia, true);
  assert.equal(aiQuotaJson.data.body_en, pastedQuotaBody);
  assert.equal(aiQuotaJson.data.title_en, 'Odisha State Scholarship Portal 2026 Complete Application Handbook');
  assert.equal(aiQuotaJson.data.category, 'citizen-scheme');
  assert.equal(aiQuotaJson.data.scope, 'Odisha');
  assert.ok(aiQuotaJson.data.read_minutes >= 1 && aiQuotaJson.data.summary_en.length > 20);
  assert.equal(aiQuotaJson.data.takeaways_en.length, 5);
  assert.ok(aiQuotaJson.data.tags.length >= 4 && aiQuotaJson.data.cover_caption_en && aiQuotaJson.data.cover_alt);
  assert.ok(aiQuotaJson.data.official_links.some((l) => l.url.includes('scholarship.odisha.gov.in')) && aiQuotaJson.data.official_links.some((l) => l.url.includes('odisha.nic.in')) && aiQuotaJson.data.official_links.some((l) => l.url.includes('utkaluniversity.edu.in')));

  // F. v361: Multi-Provider AI API Manager CRUD, Key Masking, SSRF Guard, Preserve-Key on Edit & UI Wiring
  db.sqlite.exec(read('migrations/0155_ai_providers_v361.sql'));
  const routerSrc = read('functions/api/admin/_router.js');
  assert.ok(routerSrc.includes("resource === 'ai-providers'") && routerSrc.includes('requireAdmin'), '_router.js must guard /api/admin/ai-providers with requireAdmin');
  assert.ok(translatorJs.includes('selHeaderTranslatorAiEngine') && translatorJs.includes('cso_admin_preferred_ai_model'), 'studio-translator.js must wire synced #selHeaderTranslatorAiEngine');
  assert.ok(studioCss.includes('.cso-aip-dialog') && studioCss.includes('.cso-ai-engine-bar'), 'studio.css must style AI Engine switcher & AI Providers modal');

  // Block insecure http:// and private loopback SSRF URLs
  await assert.rejects(
    () => handleAdminAiProvidersApi(
      jsonReq('https://csodisha.com/api/admin/ai-providers', 'POST', {
        label: 'Bad Localhost', provider_type: 'openai_compatible', base_url: 'https://127.0.0.1/v1', model_id: 'x', api_key: 'sk-1234567890'
      }),
      env, adminActor, '', ctx
    ),
    (e) => e && (e.status === 400 || e.status === 422) && /blocked|https/i.test(String(e.message || ''))
  );

  // Create Groq custom provider
  const createProvRes = await handleAdminAiProvidersApi(
    jsonReq('https://csodisha.com/api/admin/ai-providers', 'POST', {
      label: 'Groq Free (Llama 3.3 70B)',
      provider_type: 'openai_compatible',
      base_url: 'https://api.groq.com/openai/v1/',
      model_id: 'llama-3.3-70b-versatile',
      api_key: 'gsk_secret_live_key_998877',
      priority: 5,
      enabled: true
    }),
    env, adminActor, '', ctx
  );
  assert.equal(createProvRes.status, 201);
  const createdProv = (await createProvRes.json()).provider;
  assert.equal(createdProv.api_key_masked, 'gsk_...8877', 'API key must be masked on response');
  assert.equal(createdProv.api_key, undefined, 'Raw API key must NEVER be returned to client');

  // GET list returns masked key only
  const listProvJson = await (await handleAdminAiProvidersApi(
    new Request('https://csodisha.com/api/admin/ai-providers'),
    env, adminActor, '', ctx
  )).json();
  assert.equal(listProvJson.providers.length, 1);
  assert.equal(listProvJson.providers[0].api_key_masked, 'gsk_...8877');
  assert.equal(listProvJson.providers[0].api_key, undefined);

  // Update with blank api_key preserves stored secret key
  const updProvRes = await handleAdminAiProvidersApi(
    jsonReq('https://csodisha.com/api/admin/ai-providers', 'POST', {
      id: createdProv.id,
      label: 'Groq Free Priority #1',
      provider_type: 'openai_compatible',
      base_url: 'https://api.groq.com/openai/v1',
      model_id: 'llama-3.3-70b-versatile',
      api_key: '',
      priority: 1,
      enabled: true
    }),
    env, adminActor, '', ctx
  );
  assert.equal(updProvRes.status, 200);
  const rawAfterUpd = db.sqlite.prepare('SELECT api_key, priority FROM ai_custom_providers WHERE id = ?').get(createdProv.id);
  assert.equal(rawAfterUpd.api_key, 'gsk_secret_live_key_998877', 'Blank api_key on update must preserve existing stored secret');
  assert.equal(Number(rawAfterUpd.priority), 1);

  // Delete provider
  const delProvRes = await handleAdminAiProvidersApi(
    jsonReq(`https://csodisha.com/api/admin/ai-providers/${createdProv.id}`, 'DELETE'),
    env, adminActor, createdProv.id, ctx
  );
  assert.equal(delProvRes.status, 200);
  const listAfterDel = await (await handleAdminAiProvidersApi(
    new Request('https://csodisha.com/api/admin/ai-providers'),
    env, adminActor, '', ctx
  )).json();
  assert.equal(listAfterDel.providers.length, 0);

  // G. v362: Anthropic provider CRUD, configured_env_providers active-only filtering & 12-preset UI catalog
  const createAnthropicRes = await handleAdminAiProvidersApi(
    jsonReq('https://csodisha.com/api/admin/ai-providers', 'POST', {
      label: 'Anthropic (Claude Sonnet)',
      provider_type: 'anthropic',
      base_url: 'https://api.anthropic.com/v1',
      model_id: 'claude-3-5-sonnet-latest',
      api_key: 'sk-ant-api03-live-secret-5566',
      priority: 3,
      enabled: true
    }),
    env, adminActor, '', ctx
  );
  assert.equal(createAnthropicRes.status, 201);
  const createdAnthropic = (await createAnthropicRes.json()).provider;
  assert.equal(createdAnthropic.provider_type, 'anthropic');
  assert.equal(createdAnthropic.api_key_masked, 'sk-...5566');
  assert.equal(createdAnthropic.api_key, undefined);

  const envWithSecrets = {
    ...env,
    SARVAM_API_KEY: 'sarvam_live_key_123',
    HF_TOKEN: 'hf_live_token_456',
    META_API_KEY: 'meta_live_key_789',
    XAI_API_KEY: ''
  };
  const listWithEnv = await (await handleAdminAiProvidersApi(
    new Request('https://csodisha.com/api/admin/ai-providers'),
    envWithSecrets, adminActor, '', ctx
  )).json();
  assert.equal(listWithEnv.providers.length, 1);
  assert.equal(listWithEnv.configured_env_providers.length, 3, 'Only active non-empty Worker secrets should appear in configured_env_providers');
  assert.deepEqual(
    listWithEnv.configured_env_providers.map((p) => p.env_var).sort(),
    ['HF_TOKEN', 'META_API_KEY', 'SARVAM_API_KEY']
  );
  assert.ok(listWithEnv.configured_env_providers.every((p) => p.api_key === undefined), 'configured_env_providers must never leak raw secret values');

  await handleAdminAiProvidersApi(
    jsonReq(`https://csodisha.com/api/admin/ai-providers/${createdAnthropic.id}`, 'DELETE'),
    env, adminActor, createdAnthropic.id, ctx
  );

  // Verify all 12 provider presets & 3 groups exist in guides-publishing-studio.js + active-only sync in studio-translator.js
  for (const presetMarker of [
    'Free-Tier Ready ($0/Month)',
    'Indian Language / Odia Specialist',
    'Frontier & Additional APIs (Add Anytime Later)',
    'https://generativelanguage.googleapis.com/v1beta',
    'https://api.groq.com/openai/v1',
    'https://openrouter.ai/api/v1',
    'https://api.cerebras.ai/v1',
    'https://api.mistral.ai/v1',
    'https://router.huggingface.co/v1',
    'google/gemma-4-26b-a4b-it',
    'https://api.sarvam.ai/v1',
    'sarvam-105b',
    'https://api.openai.com/v1',
    'gpt-4o-mini',
    'https://api.anthropic.com/v1',
    'https://api.x.ai/v1',
    'grok-4.7',
    'https://api.meta.ai/v1',
    'muse-spark-1.3',
    'https://api.deepseek.com/v1',
    'deepseek-chat'
  ]) {
    assert.ok(guidesStudioJs.includes(presetMarker), `guides-publishing-studio.js missing v362 preset marker: ${presetMarker}`);
  }
  assert.ok(translatorJs.includes('configured_env_providers') && guidesStudioJs.includes('configured_env_providers'), 'Both Guides Studio and Header Translator must sync configured_env_providers');
  assert.ok(studioCss.includes('.cso-aip-preset-groups') && studioCss.includes('.cso-aip-env-strip'), 'studio.css must style v362 preset groups and active env strip');

  // H. v363: 1-Click Batch Health Check (`POST /api/admin/ai-providers/test` with `{ test_all: true }`) & `#btnTestAllAiProviders` UI
  assert.ok(guidesStudioJs.includes('btnTestAllAiProviders') && guidesStudioJs.includes('test_all: true') && guidesStudioJs.includes('Test All Active APIs'), 'guides-publishing-studio.js must render #btnTestAllAiProviders and post { test_all: true }');
  assert.ok(studioCss.includes('.cso-aip-health-badge') && studioCss.includes('.cso-aip-test-all-btn'), 'studio.css must style batch health check button & badges');

  // Seed one enabled D1 provider and one disabled D1 provider (disabled must be skipped)
  const enabledRes = await handleAdminAiProvidersApi(
    jsonReq('https://csodisha.com/api/admin/ai-providers', 'POST', {
      label: 'Custom Sarvam Odia',
      provider_type: 'openai_compatible',
      base_url: 'https://api.sarvam.ai/v1',
      model_id: 'sarvam-105b',
      api_key: 'sarvam_enabled_secret_xyz',
      priority: 2,
      enabled: true
    }),
    env, adminActor, '', ctx
  );
  const enabledProv = (await enabledRes.json()).provider;
  const disabledRes = await handleAdminAiProvidersApi(
    jsonReq('https://csodisha.com/api/admin/ai-providers', 'POST', {
      label: 'Disabled DeepSeek',
      provider_type: 'openai_compatible',
      base_url: 'https://api.deepseek.com/v1',
      model_id: 'deepseek-chat',
      api_key: 'sk-disabled-secret-000',
      priority: 9,
      enabled: false
    }),
    env, adminActor, '', ctx
  );
  const disabledProv = (await disabledRes.json()).provider;

  const origBatchFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('generativelanguage.googleapis.com')) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }), { status: 200 });
    }
    if (u.includes('api.groq.com')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });
    }
    if (u.includes('router.huggingface.co')) {
      // Simulate upstream echoing secret in 401 error body -> server MUST scrub secret!
      return new Response('Invalid token hf_secret_echo_test_999', { status: 401 });
    }
    if (u.includes('api.sarvam.ai')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });
    }
    throw new Error('Unexpected fetch in test_all: ' + u);
  };

  try {
    const batchEnv = {
      ...env,
      GEMINI_API_KEY: 'gm_primary_secret_111',
      GROQ_API_KEY: 'gsk_batch_secret_222',
      HF_TOKEN: 'hf_secret_echo_test_999'
    };
    const testAllRes = await handleAdminAiProvidersApi(
      jsonReq('https://csodisha.com/api/admin/ai-providers/test', 'POST', { test_all: true }),
      batchEnv, adminActor, 'test', ctx
    );
    assert.equal(testAllRes.status, 200);
    const testAllJson = await testAllRes.json();
    assert.equal(testAllJson.ok, true);
    assert.equal(testAllJson.total, 4, 'Should probe 3 active env secrets + 1 enabled D1 provider (skipping disabled D1 row)');
    assert.equal(testAllJson.passed, 3, '3 probes should succeed and 1 (HF 401) should report ok: false');
    assert.ok(!testAllJson.results.some((r) => r.id === disabledProv.id), 'Disabled D1 provider must NOT be probed');

    const byId = Object.fromEntries(testAllJson.results.map((r) => [r.id, r]));
    assert.equal(byId.env_gemini.ok, true);
    assert.ok(byId.env_gemini.latency_ms >= 1);
    assert.equal(byId.env_groq.ok, true);
    assert.equal(byId[enabledProv.id].ok, true);
    assert.equal(byId.env_huggingface.ok, false);

    // Ensure ZERO raw API keys appear anywhere in serialized test_all JSON response
    const rawBatchPayload = JSON.stringify(testAllJson);
    for (const secret of ['gm_primary_secret_111', 'gsk_batch_secret_222', 'hf_secret_echo_test_999', 'sarvam_enabled_secret_xyz', 'sk-disabled-secret-000']) {
      assert.ok(!rawBatchPayload.includes(secret), `Batch health check MUST NEVER leak raw key: ${secret}`);
    }
  } finally {
    globalThis.fetch = origBatchFetch;
    await handleAdminAiProvidersApi(jsonReq(`https://csodisha.com/api/admin/ai-providers/${enabledProv.id}`, 'DELETE'), env, adminActor, enabledProv.id, ctx);
    await handleAdminAiProvidersApi(jsonReq(`https://csodisha.com/api/admin/ai-providers/${disabledProv.id}`, 'DELETE'), env, adminActor, disabledProv.id, ctx);
  }

  // I. v364: Verify /api/admin/ai-coauthor preserves true Groq/HF provider errors & Admin Studio UI never masks them with Gemini IST quota text
  const origErrFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.groq.com')) {
      return new Response('TPM limit exceeded', { status: 429, headers: { 'Retry-After': '0' } });
    }
    if (String(url).includes('router.huggingface.co')) {
      return new Response('Forbidden', { status: 403 });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const groqErrRes = await handleAdminAiCoauthorApi(
      jsonReq('https://csodisha.com/api/admin/ai-coauthor', 'POST', {
        mode: 'translate_odia', input: 'OPSC OAS 2026', preferred_model: 'env:groq', auto_failover: false
      }),
      { ...env, GROQ_API_KEY: 'gsk_err_check' },
      adminActor, ctx
    );
    assert.equal(groqErrRes.status, 429);
    const groqErrJson = await groqErrRes.json();
    assert.equal(groqErrJson.ok, false);
    assert.equal(groqErrJson.is_daily_quota, false);
    assert.ok(/Groq/i.test(groqErrJson.error) && /HTTP 429/i.test(groqErrJson.error), 'API must return exact Groq 429 diagnostic');
    assert.ok(!groqErrJson.error.includes('5:30 AM IST'), 'Groq 429 must NEVER return Gemini/Workers AI 5:30 AM IST message');
    assert.ok(Array.isArray(groqErrJson.attempted_errors) && groqErrJson.attempted_errors.length === 1);

    const hfErrRes = await handleAdminAiCoauthorApi(
      jsonReq('https://csodisha.com/api/admin/ai-coauthor', 'POST', {
        mode: 'translate_odia', input: 'OPSC OAS 2026', preferred_model: 'env:huggingface', auto_failover: false
      }),
      { ...env, HF_TOKEN: 'hf_err_check' },
      adminActor, ctx
    );
    assert.equal(hfErrRes.status, 403);
    const hfErrJson = await hfErrRes.json();
    assert.equal(hfErrJson.ok, false);
    assert.ok(/Hugging Face/i.test(hfErrJson.error) && /Inference Providers/i.test(hfErrJson.error));
    assert.ok(!hfErrJson.error.includes('5:30 AM IST'));
  } finally {
    globalThis.fetch = origErrFetch;
  }
  assert.ok(guidesStudioJs.includes('isGeminiWorkersDailyQuotaError') && guidesStudioJs.includes('fallback_notice'), 'guides-publishing-studio.js must distinguish genuine daily quota from provider errors and display fallback_notice');
  assert.ok(!guidesStudioJs.includes('function isQuotaLikeError'), 'guides-publishing-studio.js must remove catch-all isQuotaLikeError quota rewrite');
  assert.ok(translatorJs.includes('fallback_notice') && translatorJs.includes('attempted_errors'), 'studio-translator.js must surface fallback_notice and attempted_errors');

  // J. v365: Zero retired gemini-2.0-* strings, Groq llama-3.1-8b-instant default & live /test 404 model auto-discovery + OpenRouter Authorization header
  for (const rel of ['functions/_lib/ai-coauthor.js', 'functions/api/admin/_ai.js', 'admin/guides-publishing-studio.js', 'admin/studio-translator.js']) {
    assert.ok(!read(rel).includes('gemini-2.0-'), `${rel} must not contain retired gemini-2.0-* models`);
  }
  assert.ok(guidesStudioJs.includes("model_id: 'llama-3.1-8b-instant'"), 'Groq preset must default to llama-3.1-8b-instant');

  const origV365Fetch = globalThis.fetch;
  const v365HeadersSeen = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const bodyObj = init && init.body ? JSON.parse(String(init.body)) : null;
    v365HeadersSeen.push({ url: u, headers: init && init.headers, model: bodyObj && bodyObj.model });
    if (u === 'https://openrouter.ai/api/v1/chat/completions') {
      if (bodyObj && bodyObj.model === 'retired-openrouter-model') {
        return new Response('Model not found', { status: 404 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });
    }
    if (u === 'https://openrouter.ai/api/v1/models') {
      return new Response(JSON.stringify({
        data: [
          { id: 'openai/text-embedding-3-large' },
          { id: 'meta-llama/llama-3.3-70b-instruct:free' }
        ]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch in v365 test: ' + u);
  };
  try {
    const orTestRes = await handleAdminAiProvidersApi(
      jsonReq('https://csodisha.com/api/admin/ai-providers/test', 'POST', {
        label: 'OpenRouter Free',
        provider_type: 'openai_compatible',
        base_url: 'https://openrouter.ai/api/v1',
        model_id: 'retired-openrouter-model',
        api_key: 'sk-or-v1-check-9911'
      }),
      env, adminActor, 'test', ctx
    );
    assert.equal(orTestRes.status, 200);
    const orTestJson = await orTestRes.json();
    assert.equal(orTestJson.ok, true);
    assert.equal(orTestJson.model_id, 'meta-llama/llama-3.3-70b-instruct:free', 'HTTP 404 must auto-discover live :free chat model via /models');
    assert.ok(v365HeadersSeen.every((h) => h.headers && h.headers.Authorization === 'Bearer sk-or-v1-check-9911' && h.headers['HTTP-Referer'] === 'https://csodisha.com'));
  } finally {
    globalThis.fetch = origV365Fetch;
  }

  // K. v366: WhatsApp/Telegram/Copy-Link share toolbar, raster OG fallback for .svg covers & BreadcrumbList + Article + FAQPage JSON-LD
  const rasterFallbackDiskPath = path.join(ROOT, DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH.replace(/^\/+/, ''));
  assert.ok(fs.existsSync(rasterFallbackDiskPath), `Raster OG fallback asset must exist on disk: ${DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH}`);

  // Raster cover keeps absolute raster URL; SVG cover (even with query string) resolves to raster PNG fallback
  assert.equal(
    resolveSocialPreviewImageUrl({ cover_image: '/api/media/guides/oavs-cover.jpg' }, 'https://csodisha.com'),
    'https://csodisha.com/api/media/guides/oavs-cover.jpg'
  );
  assert.equal(
    resolveSocialPreviewImageUrl({ cover_image: '/api/media/guides/oavs-2026-strategy-cover.svg?v=2' }, 'https://csodisha.com'),
    `https://csodisha.com${DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH}`
  );

  const svgGuideHtml = renderPublicGuideArticleHtml({
    slug: 'oavs-2026-strategy-svg-test',
    category: 'exam-strategy',
    category_label_en: 'Exam Strategy & Study Handbooks',
    category_icon: '🎯',
    title_en: 'OAVS 2026 25-Day Preparation Strategy',
    title_or: 'OAVS 2026 ୨୫-ଦିନିଆ ପ୍ରସ୍ତୁତି ରଣନୀତି',
    summary_en: 'Complete remaining-days timetable and high-yield revision plan for OAVS CBT.',
    summary_or: 'OAVS CBT ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ରଣନୀତି।',
    cover_image: '/api/media/guides/oavs-2026-strategy-cover.svg?v=1',
    cover_caption_en: 'OAVS 2026 Strategy Banner',
    body_en: '## Phase 1 Revision\nFocus on Pedagogy and Core Subjects.',
    body_or: '## ପ୍ରଥମ ପର୍ଯ୍ୟାୟ\nଶିକ୍ଷାଶାସ୍ତ୍ର ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ।',
    read_minutes: 6,
    scope: 'Odisha',
    is_exam: true,
    tags: 'OAVS, Teaching, Strategy',
    created_at: '2026-11-25T10:00:00.000Z',
    updated_at: '2026-11-26T10:00:00.000Z',
    faq_json: JSON.stringify([
      { question: 'Is there negative marking in OAVS CBT 2026?', answer: 'Yes, 0.25 marks are deducted for each wrong answer.' }
    ])
  }, [], new URL('https://csodisha.com/guides/oavs-2026-strategy-svg-test'));

  // 1. Header & footer share bars with WhatsApp, Telegram, Copy Link & Native Share and zero inline onclick=
  assert.ok(!/onclick\s*=/i.test(svgGuideHtml), '/guides/<slug> must contain ZERO inline onclick= handlers');
  assert.ok(svgGuideHtml.includes('class="gp-share-bar is-header"') && svgGuideHtml.includes('class="gp-share-bar is-footer"'), 'Must render share bar in both article header and footer');
  assert.ok(svgGuideHtml.includes('https://api.whatsapp.com/send?text='), 'Must render WhatsApp share link');
  assert.ok(svgGuideHtml.includes('https://t.me/share/url?url=https%3A%2F%2Fcsodisha.com%2Fguides%2Foavs-2026-strategy-svg-test'), 'Must render Telegram share link');
  assert.ok(svgGuideHtml.includes('data-copy-guide-url="https://csodisha.com/guides/oavs-2026-strategy-svg-test"'), 'Must render CSP-safe Copy Link button');
  assert.ok(svgGuideHtml.includes('data-native-share'), 'Must render progressive-enhancement Native Share button');

  // 2. Non-.svg raster og:image & twitter:image in <head>, while visible <article> cover keeps the crisp .svg banner
  const expectedRasterOg = `https://csodisha.com${DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH}`;
  assert.ok(svgGuideHtml.includes(`<meta property="og:type" content="article">`));
  assert.ok(svgGuideHtml.includes(`<meta property="og:site_name" content="Common Sense Odisha">`));
  assert.ok(svgGuideHtml.includes(`<meta property="og:locale" content="en_IN">`) && svgGuideHtml.includes(`<meta property="og:locale:alternate" content="or_IN">`));
  assert.ok(svgGuideHtml.includes(`<meta property="og:image" content="${expectedRasterOg}">`), 'SVG cover must resolve to raster PNG og:image');
  assert.ok(svgGuideHtml.includes(`<meta property="og:image:secure_url" content="${expectedRasterOg}">`));
  assert.ok(svgGuideHtml.includes(`<meta property="og:image:width" content="1200">`) && svgGuideHtml.includes(`<meta property="og:image:height" content="630">`));
  assert.ok(svgGuideHtml.includes(`<meta name="twitter:card" content="summary_large_image">`) && svgGuideHtml.includes(`<meta name="twitter:image" content="${expectedRasterOg}">`));
  assert.ok(!/<meta[^>]+(?:og:image|twitter:image)[^>]*\.svg/i.test(svgGuideHtml), 'og:image and twitter:image must NEVER point to an .svg file');
  assert.ok(svgGuideHtml.includes('<img src="/api/media/guides/oavs-2026-strategy-cover.svg?v=1"'), 'Visible article cover banner must still render the crisp .svg asset');

  // 3. Valid JSON-LD parsing via JSON.parse() with BreadcrumbList, Article & FAQPage nodes
  const ldMatch = svgGuideHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ldMatch && ldMatch[1], '/guides/<slug> must emit JSON-LD script block');
  const parsedLd = JSON.parse(ldMatch[1]);
  assert.equal(parsedLd['@context'], 'https://schema.org');
  assert.ok(Array.isArray(parsedLd['@graph']), 'JSON-LD must emit @graph array');
  const bcNode = parsedLd['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
  const artNode = parsedLd['@graph'].find((n) => n['@type'] === 'Article');
  const faqNode = parsedLd['@graph'].find((n) => n['@type'] === 'FAQPage');
  assert.ok(bcNode && bcNode.itemListElement.length === 4 && bcNode.itemListElement[0].name === 'Home' && bcNode.itemListElement[1].name === 'Guides');
  assert.ok(artNode && artNode.headline === 'OAVS 2026 25-Day Preparation Strategy' && artNode.alternativeHeadline === 'OAVS 2026 ୨୫-ଦିନିଆ ପ୍ରସ୍ତୁତି ରଣନୀତି');
  assert.deepEqual(artNode.inLanguage, ['en', 'or']);
  assert.deepEqual(artNode.image, [expectedRasterOg]);
  assert.ok(faqNode && faqNode.mainEntity.length === 1 && faqNode.mainEntity[0].name.includes('negative marking'));

  // 4. v367 Admin Studio Trending & Popular Topics Editor wiring & RBAC route protection
  const hsJs = read('admin/homepage-studio.js');
  const routerJs = read('functions/api/admin/_router.js');
  const adminHtmlV367 = read('admin/index.html');
  assert.ok(hsJs.includes("var TRENDING_API = '/api/admin/trending-topics';") && hsJs.includes('hsTrendingTopicsEditor') && hsJs.includes('Reset to Default 6 Topics'), 'admin/homepage-studio.js must mount v367 Trending & Popular Topics Editor');
  assert.ok(routerJs.includes("if (resource === 'trending-topics')") && routerJs.includes('handleAdminTrendingTopicsApi'), 'functions/api/admin/_router.js must protect /api/admin/trending-topics with RBAC');
  assert.ok(adminHtmlV367.includes('/admin/homepage-studio.js?v=20261127v385') && adminHtmlV367.includes('/admin/homepage-studio.css?v=20261127v385'), 'admin/index.html must cache-bust homepage-studio assets to v367');
  await Promise.all(waits);
});

await check('9. v368 SEO: legacy .html 301 map, clean 200 sitemap (published-only, zero .html/draft), slug-history 301 & noindex 404', async () => {
  const db = makeD1(false);
  db.sqlite.exec(read('migrations/0153_informative_guides_v348.sql'));
  db.sqlite.exec(`
    CREATE TABLE job_articles (id TEXT, slug TEXT, is_published INTEGER, scheduled_publish_at TEXT, published_at TEXT, updated_at TEXT);
    CREATE TABLE cso_current_affairs (id TEXT, status TEXT, capsule_date TEXT, updated_at TEXT, created_at TEXT);
    INSERT INTO job_articles VALUES ('j1','oavs-2026',1,'','2026-11-01','2026-11-02'), ('j2','draft-job',0,'','','2026-11-02');
    INSERT INTO cso_current_affairs VALUES ('ca1','published','2026-11-26','2026-11-26','2026-11-26'), ('ca2','draft','2026-11-25','','');
    INSERT INTO informative_guides (id, slug, title_en, status) VALUES ('g1','new-slug','Guide','published'), ('g2','draft-guide','Draft','draft');
  `);
  const env = { DB: db };

  // 1. sitemap.xml: HTTP 200, published-only, zero .html, includes /guides/
  const smRes = await handleSitemapXml(new Request('https://csodisha.com/sitemap.xml'), env);
  assert.equal(smRes.status, 200);
  const xml = await smRes.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.includes('https://csodisha.com/guides/') && locs.includes('https://csodisha.com/guides/new-slug'));
  assert.ok(locs.includes('https://csodisha.com/jobs/?slug=oavs-2026') && locs.includes('https://csodisha.com/current-affairs/?slug=ca1'));
  assert.ok(!locs.some((l) => l.includes('draft-guide') || l.includes('draft-job') || l.includes('ca2')), 'sitemap must exclude drafts');
  assert.ok(!locs.some((l) => /\.html?(\?|#|$)/i.test(l)), 'sitemap must contain zero .html URLs');
  assert.equal(new Set(locs).size, locs.length, 'sitemap must contain no duplicate <loc>');

  // 2. Edited slug -> 301 to current canonical slug; draft/unknown -> 404 with noindex
  await recordGuideSlugChange(db, 'g1', 'old-slug', 'new-slug');
  const moved = await handlePublicGuidesRoute(new Request('https://csodisha.com/guides/old-slug?utm=1'), env, new URL('https://csodisha.com/guides/old-slug?utm=1'));
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('location'), 'https://csodisha.com/guides/new-slug?utm=1');
  const missing = await handlePublicGuidesRoute(new Request('https://csodisha.com/guides/nope'), env, new URL('https://csodisha.com/guides/nope'));
  assert.equal(missing.status, 404);
  const nfHtml = await missing.text();
  assert.ok(nfHtml.includes('<meta name="robots" content="noindex, follow">') && missing.headers.get('x-robots-tag') === 'noindex, follow');
  assert.ok(nfHtml.includes('href="/"') && nfHtml.includes('href="/guides/"') && nfHtml.includes('type="search"'), '404 must link to /, /guides/ and search');
  const draft = await handlePublicGuidesRoute(new Request('https://csodisha.com/guides/draft-guide'), env, new URL('https://csodisha.com/guides/draft-guide'));
  assert.equal(draft.status, 404);

  // 3. Worker: legacy .html -> 301 canonical map, plain 404 carries noindex; static 404 page is noindex with portal links
  const workerSrc = read('_worker.js');
  for (const [from, to] of [['/index.html', '/'], ['/guides.html', '/guides/'], ['/login.html', '/login'], ['/signup.html', '/signup'], ['/about.html', '/about/'], ['/contact.html', '/about/'], ['/privacy.html', '/privacy-policy/'], ['/terms.html', '/terms-of-use/']]) {
    assert.ok(workerSrc.includes(`'${from}': '${to}'`), `_worker.js must 301 ${from} -> ${to}`);
    assert.ok(read('_redirects').split(/\r?\n/).every((l) => !l.startsWith(from + ' ') || l.includes(' 301')) , `_redirects ${from} must be 301`);
  }
  assert.ok(workerSrc.includes('Response.redirect(legacyDest.toString(), 301)'), 'legacy redirects must be HTTP 301');
  assert.ok(workerSrc.includes("'X-Robots-Tag': 'noindex, follow'"), 'fallback 404 must send X-Robots-Tag noindex');
  const html404 = read('404.html');
  assert.ok(html404.includes('<meta name="robots" content="noindex, follow">') && html404.includes('href="/guides/"') && html404.includes('type="search"'));
});

console.log(`\n=== v312 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
