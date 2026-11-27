import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  hasEmailProviderSecret,
  isAdminEmailOtpEnabled,
  maskEmail,
  hashOtpChallenge,
  createAndSendAdminEmailOtp,
  verifyAdminEmailOtp,
  resendAdminEmailOtp
} from '../functions/_lib/admin-email-otp.js';
import { handleAdminEmailOtpVerify, handleAdminEmailOtpResend } from '../functions/api/auth/admin-email-otp.js';
import { onRequestPost as loginPost } from '../functions/api/auth/login.js';
import { generateSalt, hashPassword } from '../functions/api/auth/_utils.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb(seedUsers = [], seedFlags = []) {
  const users = [...seedUsers];
  const otps = [];
  const flags = [...seedFlags];
  const sessions = [];
  const adminSessions = [];
  const auditLogs = [];

  const execSql = (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^SELECT enabled FROM feature_flags WHERE key = 'admin_email_otp_enabled'/i.test(s)) {
      return { first: flags.find((f) => f.key === 'admin_email_otp_enabled') || null };
    }
    if (/^SELECT .* FROM users WHERE (?:email = \?|LOWER\(email\) = \?)/i.test(s)) {
      const ident = String(params[0] || '').toLowerCase();
      return {
        first: users.find((u) =>
          String(u.email || '').toLowerCase() === ident ||
          String(u.id || '').toLowerCase() === ident ||
          String(u.username || '').toLowerCase() === ident
        ) || null
      };
    }
    if (/^SELECT id, email, role FROM users WHERE id = \?/i.test(s)) {
      return { first: users.find((u) => u.id === params[0]) || null };
    }
    if (/^SELECT enabled FROM admin_totp_credentials/i.test(s)) {
      return { first: { enabled: 1 } };
    }
    if (/^UPDATE admin_email_otps SET consumed = 1 WHERE admin_id = \? AND consumed = 0/i.test(s)) {
      otps.forEach((o) => {
        if (o.admin_id === params[0] && o.consumed === 0) o.consumed = 1;
      });
      return { run: { success: true } };
    }
    if (/^INSERT INTO admin_email_otps/i.test(s)) {
      const [id, admin_id, email, otp_hash, ip_address, expires_at, created_at] = params;
      otps.push({ id, admin_id, email, otp_hash, attempts: 0, consumed: 0, ip_address, expires_at, created_at });
      return { run: { success: true } };
    }
    if (/^SELECT id, admin_id, email, otp_hash, attempts, consumed, expires_at FROM admin_email_otps WHERE id = \?/i.test(s)) {
      return { first: otps.find((o) => o.id === params[0]) || null };
    }
    if (/^SELECT id, admin_id, email, attempts, consumed, created_at FROM admin_email_otps WHERE id = \?/i.test(s)) {
      return { first: otps.find((o) => o.id === params[0]) || null };
    }
    if (/^UPDATE admin_email_otps SET attempts = \?/i.test(s)) {
      const [nextAttempts, , cid] = params;
      const row = otps.find((o) => o.id === cid);
      if (row) {
        row.attempts = nextAttempts;
        if (nextAttempts >= 5) row.consumed = 1;
      }
      return { run: { success: true } };
    }
    if (/^UPDATE admin_email_otps SET consumed = 1 WHERE id = \?/i.test(s)) {
      const row = otps.find((o) => o.id === params[0]);
      if (row) row.consumed = 1;
      return { run: { success: true } };
    }
    if (/^INSERT INTO sessions/i.test(s)) {
      sessions.push({ token: params[0], user_id: params[1], email: params[2], role: params[3] });
      return { run: { success: true } };
    }
    if (/^INSERT INTO admin_sessions/i.test(s)) {
      adminSessions.push({ id: params[0], email: params[3] });
      return { run: { success: true } };
    }
    if (/^INSERT INTO admin_audit_logs/i.test(s)) {
      auditLogs.push({ action: params[4] || 'audit', detail: params.map((p) => String(p || '')).join(' ') });
      return { run: { success: true } };
    }
    return { first: null, run: { success: true } };
  };

  return {
    otps,
    sessions,
    auditLogs,
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async first() {
          return execSql(sql, bound).first;
        },
        async run() {
          return execSql(sql, bound).run;
        },
        _exec() {
          return execSql(sql, bound);
        }
      };
    },
    async batch(stmts) {
      return stmts.map((st) => st._exec());
    }
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`  PASS  ${name}`);
  passed += 1;
}

console.log('\n=== Admin Login Email OTP Verification (v315) ===\n');

await test('1. Anti-lockout guard & email masking', async () => {
  const db = createMockDb();
  assert.equal(hasEmailProviderSecret({}), false);
  assert.equal(await isAdminEmailOtpEnabled({ DB: db }), false);
  assert.equal(await isAdminEmailOtpEnabled({ DB: db, RESEND_API_KEY: 're_test_123' }), true);
  assert.equal(maskEmail('commonsenseodisha@gmail.com'), 'co***@gmail.com');
});

await test('2. OTP generation, SHA-256 hashing, 5-attempt lockout, expiry & resend cooldown', async () => {
  const db = createMockDb();
  const origFetch = globalThis.fetch;
  let lastSentOtp = '';
  let lastFrom = '';
  globalThis.fetch = async (url, init) => {
    const payload = JSON.parse(init.body);
    lastFrom = payload.from || '';
    const match = String(payload.text || '').match(/\b(\d{6})\b/);
    if (match) lastSentOtp = match[1];
    return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
  };

  try {
    const env = { DB: db, RESEND_API_KEY: 're_test_123', EMAIL_FROM: 'CS Odisha Security <security@csodisha.com>' };
    const req = new Request('https://csodisha.com/api/auth/login', {
      headers: { 'cf-connecting-ip': '203.0.113.10' }
    });
    const issued = await createAndSendAdminEmailOtp(env, { id: 'adm_1', email: 'admin@csodisha.com' }, req);
    assert.equal(lastFrom, 'CS Odisha Security <security@csodisha.com>');
    assert.ok(issued.challenge_id);
    assert.equal(issued.masked_email, 'ad***@csodisha.com');
    assert.equal(issued.expires_in, 300);
    assert.equal(issued.resend_after, 60);
    assert.match(lastSentOtp, /^\d{6}$/);

    // Hash check
    const expectedHash = await hashOtpChallenge(issued.challenge_id, lastSentOtp);
    assert.equal(db.otps[0].otp_hash, expectedHash);

    // Resend cooldown enforced (< 60s)
    const resendTooSoon = await resendAdminEmailOtp(env, issued.challenge_id, req);
    assert.equal(resendTooSoon.ok, false);
    assert.equal(resendTooSoon.status, 429);

    // 5 failed attempts lock challenge
    for (let i = 0; i < 5; i++) {
      const wrong = await verifyAdminEmailOtp(env, issued.challenge_id, '000000');
      assert.equal(wrong.ok, false);
      if (i === 4) assert.equal(wrong.locked, true);
    }
    const afterLock = await verifyAdminEmailOtp(env, issued.challenge_id, lastSentOtp);
    assert.equal(afterLock.ok, false);

    // Expiry rejection
    const issued2 = await createAndSendAdminEmailOtp(env, { id: 'adm_1', email: 'admin@csodisha.com' }, req);
    db.otps[1].expires_at = new Date(Date.now() - 1000).toISOString();
    const expiredRes = await verifyAdminEmailOtp(env, issued2.challenge_id, lastSentOtp);
    assert.equal(expiredRes.ok, false);
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('3. Login gate & /verify endpoint issue HttpOnly cso_session only after OTP verified', async () => {
  const salt = generateSalt();
  const pwHash = await hashPassword('StrongPass!2026', salt, 100000);
  const db = createMockDb([{
    id: 'adm_1',
    email: 'admin@csodisha.com',
    password_hash: pwHash,
    salt,
    failed_attempts: 0,
    lockout_until: 0,
    role: 'admin'
  }]);

  const origFetch = globalThis.fetch;
  let capturedOtp = '';
  globalThis.fetch = async (url, init) => {
    const payload = JSON.parse(init.body);
    const match = String(payload.text || '').match(/\b(\d{6})\b/);
    if (match) capturedOtp = match[1];
    return new Response(JSON.stringify({ id: 'email_456' }), { status: 200 });
  };

  try {
    const env = { DB: db, RESEND_API_KEY: 're_test_123' };
    const loginRes = await loginPost({
      request: new Request('https://csodisha.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.11' },
        body: JSON.stringify({ email: 'admin@csodisha.com', password: 'StrongPass!2026' })
      }),
      env
    });
    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.requires_email_otp, true);
    assert.ok(loginBody.challenge_id);
    assert.equal(db.sessions.length, 0);

    const verifyRes = await handleAdminEmailOtpVerify({
      request: new Request('https://csodisha.com/api/auth/admin-email-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: loginBody.challenge_id, otp: capturedOtp })
      }),
      env
    });
    assert.equal(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.equal(verifyBody.ok, true);
    assert.equal(verifyBody.requires_totp, undefined);
    assert.equal(verifyBody.redirect, '/admin/#command-overview');
    const cookieHdr = verifyRes.headers.get('Set-Cookie') || '';
    assert.ok(cookieHdr.includes('cso_session='));
    assert.ok(cookieHdr.includes('SameSite=Strict'));
    assert.equal(db.sessions.length, 1);
    assert.ok(db.auditLogs.some((l) => String(l.detail || '').includes('"totp_skipped":true')));

    // Resend endpoint returns 400 on consumed challenge
    const resendUsed = await handleAdminEmailOtpResend({
      request: new Request('https://csodisha.com/api/auth/admin-email-otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: loginBody.challenge_id })
      }),
      env
    });
    assert.equal(resendUsed.status, 400);
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('4. Strict CSP, 4-theme tokens, migration 0148 & v315 cache sync', async () => {
  const mig = read('migrations/0148_admin_email_otp_v315.sql');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS admin_email_otps'));
  assert.ok(mig.includes('admin_email_otp_enabled'));

  const loginHtml = read('admin/login.html');
  assert.ok(loginHtml.includes('id="emailOtpStep"'));
  assert.ok(loginHtml.includes('id="emailOtpInput"'));
  assert.ok(!/\son[a-z]+\s*=|\sstyle\s*=/i.test(loginHtml), 'admin/login.html must remain strictly CSP-safe');

  const loginJs = read('admin/cms/login.js');
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(loginJs), 'admin/cms/login.js must remain CSP-safe');

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v428');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v428';"));
});

console.log(`\n=== Admin Email OTP v315 Results: ${passed} passed, 0 failed ===\n`);
