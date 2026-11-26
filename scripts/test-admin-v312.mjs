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

// 6. Strict CSP, 4-theme Zero Hardcoded Hex & SW Cache Version v312
await check('6. Strict CSP compliance, zero hardcoded hex in v312 CSS, and cso-candidate-cache-v333 sync', async () => {
  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v333');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v333';"), 'sw.js cache version must be cso-candidate-cache-v333');

  const jsFiles = [
    'admin/qr-svg.js',
    'admin/billing-ads.js',
    'admin/system-ops.js',
    'admin/study-publishing-studio.js',
    'admin/candidate-hub-studio.js',
    'admin/admin.js',
    'admin/cms/login.js',
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

  for (const cssRel of ['admin/system-ops.css', 'assets/css/pages/support.css']) {
    const css = read(cssRel).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), `${cssRel} must use semantic --cso-* tokens only (zero hardcoded hex)`);
  }

  // Ensure [Coming in v312] placeholder is completely replaced
  assert.ok(!read('admin/admin.js').includes('[Coming in v312]'), 'admin/admin.js must replace [Coming in v312] placeholder');
  assert.ok(!read('admin/system-ops.js').includes('[Coming in v312]'), 'admin/system-ops.js must replace [Coming in v312] placeholder');
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

console.log(`\n=== v312 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
