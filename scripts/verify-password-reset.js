#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — Password Reset (Dual-Channel Recovery) Suite
 * Verifies the complete forgot-password flow against the real handlers over
 * an in-memory SQLite database mirroring schema.sql:
 *   - forgot-password: dual-channel email dispatch (OTP + magic link),
 *     hashed-at-rest storage, anti-enumeration, per-email 60s cooldown,
 *     per-IP rate limit, outstanding-reset invalidation
 *   - verify-reset-otp: wrong-OTP attempts counting, 5-attempt invalidation,
 *     success mints a hashed one-time grant
 *   - reset-password: grant + magic-link channels, password policy,
 *     global session revocation, single-use consumption, security alert
 *   - verify-reset-token: stateless magic-link validity check
 *
 * Requires Node >= 22.5 (node:sqlite).
 * Usage: node scripts/verify-password-reset.js
 */

const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
let passed = 0;
let failed = 0;
function assert(cond, msg) { if (cond) logPass(msg); else { logFail(msg); throw new Error(msg); } }
function logPass(msg) { passed++; console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`); }
function logFail(msg) { failed++; console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`); }

// ---- Stub the global fetch to capture Resend dispatches ----
const emailLog = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async function stubbedFetch(url, init = {}) {
  if (String(url).startsWith('https://api.resend.com/emails')) {
    const payload = JSON.parse(init.body || '{}');
    emailLog.push({ to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
    return new Response(JSON.stringify({ id: 'stub' }), { status: 200 });
  }
  return realFetch(url, init);
};

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}=================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}CS Odisha Password Reset (Dual-Channel) Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================${colors.reset}\n`);

  const schema = readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(schema);

  function makeD1(sqlite) {
    const makeStatement = (sql) => {
      const state = { sql, params: [] };
      const runner = {
        bind(...params) { state.params = params; return runner; },
        async first() { return sqlite.prepare(state.sql).get(...state.params) ?? null; },
        async all() { return { results: sqlite.prepare(state.sql).all(...state.params) }; },
        async run() { sqlite.prepare(state.sql).run(...state.params); return { success: true }; }
      };
      return runner;
    };
    return {
      prepare: (sql) => makeStatement(sql),
      async batch(statements) { for (const s of statements) await s.run(); }
    };
  }

  const env = { DB: makeD1(db), RESEND_API_KEY: 'test-key-resend-stub', EMAIL_FROM: 'Common Sense Odisha <onboarding@resend.dev>' };
  const { onRequestPost: forgotPost } = await import(path.join(ROOT, 'functions/api/auth/forgot-password.js'));
  const { onRequestPost: verifyOtpPost } = await import(path.join(ROOT, 'functions/api/auth/verify-reset-otp.js'));
  const { onRequestPost: resetPost } = await import(path.join(ROOT, 'functions/api/auth/reset-password.js'));
  const { onRequestPost: verifyTokenPost } = await import(path.join(ROOT, 'functions/api/auth/verify-reset-token.js'));
  const { hashPassword } = await import(path.join(ROOT, 'functions/api/auth/_utils.js'));
  const resetUtils = await import(path.join(ROOT, 'functions/api/auth/_reset-utils.js'));

  const EMAIL = 'aspirant@example.com';
  const CAND_ID = 'cso_usr_reset001';
  db.prepare(`INSERT INTO users (id, email, password_hash, salt, failed_attempts, lockout_until, created_at, updated_at)
    VALUES (?, ?, 'oldhash', 'oldsalt', 0, 0, 1, 1)`).run(CAND_ID, EMAIL);
  db.prepare(`INSERT INTO candidates (id, full_name, email, phone, district, password_hash, salt, target_streams, created_at, last_login_at)
    VALUES (?, 'Reset Test Aspirant', ?, NULL, 'Khordha', 'oldhash', 'oldsalt', '["opsc"]', 1, 1)`).run(CAND_ID, EMAIL);

  // Two active sessions that must be revoked on reset.
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES ('${'a'.repeat(64)}', ?, ?, 'candidate', 1, 9999999999)`).run(CAND_ID, EMAIL);
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES ('${'b'.repeat(64)}', ?, ?, 'candidate', 1, 9999999999)`).run(CAND_ID, EMAIL);

  const req = (method, path, body, ip = '10.7.0.1') => new Request('https://csodisha.com' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = async (r) => await r.json();
  const sha256 = (v) => resetUtils.sha256Hex(v);
  const extractOtp = () => {
    const last = emailLog[emailLog.length - 1];
    return (last.text.match(/6-digit OTP: (\d{6})/) || [])[1];
  };
  const extractToken = () => {
    const last = emailLog[emailLog.length - 1];
    return (last.text.match(/reset-password\.html\?token=([0-9a-f]{64})/) || [])[1];
  };
  const bumpCooldown = () => {
    db.prepare("UPDATE password_resets SET created_at = datetime('now', '-61 seconds')").run();
  };

  // ---- forgot-password: anti-enumeration + dual-channel dispatch ----
  {
    emailLog.length = 0;
    let res = await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: 'nobody@nowhere.dev' }), env, ctx: {} });
    let data = await json(res);
    assert(res.status === 200 && data.success && /recovery email has been sent/.test(data.message),
      'unknown email gets the identical generic success (anti-enumeration)');

    res = await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }), env, ctx: {} });
    data = await json(res);
    assert(res.status === 200 && data.success && /recovery email has been sent/.test(data.message),
      'known email gets the same generic success response');

    assert(emailLog.length === 1 && emailLog[0].to[0] === EMAIL, 'dual-channel recovery email dispatched to the candidate');
    const otp = extractOtp();
    const token = extractToken();
    assert(/^\d{6}$/.test(otp), 'email carries the 6-digit OTP (channel 1)');
    assert(/reset-password\.html\?token=[0-9a-f]{64}/.test(emailLog[0].text), 'email carries the one-click reset link (channel 2)');

    const row = db.prepare('SELECT token_hash, otp_hash, attempts, used, expires_at, ip_address, grant_hash FROM password_resets').all()[0];
    assert(row.otp_hash === await sha256(otp), 'OTP stored only as SHA-256 hash (never plaintext)');
    assert(row.token_hash === await sha256(token), 'magic-link token stored only as SHA-256 hash (never plaintext)');
    assert(row.attempts === 0 && row.used === 0 && row.ip_address === '10.7.0.1', 'row starts clean with the request IP recorded');
    assert(row.expires_at > Math.floor(Date.now() / 1000) + 890 && row.expires_at <= Math.floor(Date.now() / 1000) + 900,
      'fixed 15-minute TTL applied');
    assert(row.grant_hash === null, 'no grant minted before OTP verification');

    // Cooldown: suppressed silently, same response, no second row/email
    emailLog.length = 0;
    res = await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }), env, ctx: {} });
    data = await json(res);
    const rowCount = db.prepare('SELECT COUNT(*) AS c FROM password_resets').get().c;
    assert(res.status === 200 && data.success && rowCount === 1 && emailLog.length === 0,
      '60s per-email cooldown silently suppresses the email (same generic response)');

    // Outstanding resets invalidated on a fresh request (after cooldown)
    bumpCooldown();
    res = await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }), env, ctx: {} });
    data = await json(res);
    const rows = db.prepare('SELECT id FROM password_resets').all();
    assert(res.status === 200 && rows.length === 1, 'fresh request replaces the outstanding reset (single outstanding per user)');
  }

  // ---- IP rate limit: 5 per 15 minutes ----
  {
    const ip = '10.8.4.2';
    let sawLimited = false;
    for (let i = 0; i < 6; i++) {
      const res = await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: 'other@nowhere.dev' }, ip), env, ctx: {} });
      if (res.status === 429) { sawLimited = true; break; }
    }
    assert(sawLimited, 'per-IP rate limit (5 requests / 15 min) returns 429 on the 6th request');
  }

  // ---- verify-reset-otp: attempts, invalidation, grant minting ----
  {
    const BLOCK_IP = '10.7.1.1';
    bumpCooldown();
    emailLog.length = 0;
    await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }, BLOCK_IP), env, ctx: {} });
    const otp = extractOtp();

    // 4 wrong attempts → attempts counter climbs, attemptsLeft shrinks
    let lastLeft = null;
    for (let i = 0; i < 4; i++) {
      const res = await verifyOtpPost({ request: req('POST', '/api/auth/verify-reset-otp', { email: EMAIL, otp: '000000' }), env });
      const data = await json(res);
      assert(res.status === 400 && /Invalid or expired/.test(data.error), `wrong OTP attempt ${i + 1} rejected`);
      lastLeft = data.attemptsLeft;
    }
    assert(lastLeft === 1, 'attempts counter exposed (1 attempt left after 4 failures)');
    const midRow = db.prepare('SELECT attempts, used FROM password_resets').get();
    assert(midRow.attempts === 4 && midRow.used === 0, '4 failed attempts persisted without invalidation');

    // 5th wrong attempt invalidates the record
    let res = await verifyOtpPost({ request: req('POST', '/api/auth/verify-reset-otp', { email: EMAIL, otp: '000000' }), env });
    let data = await json(res);
    const burntRow = db.prepare('SELECT attempts, used FROM password_resets').get();
    assert(res.status === 400 && burntRow.used === 1 && burntRow.attempts === 5,
      '5th failed OTP invalidates the reset record');

    // Even the correct OTP is dead now
    res = await verifyOtpPost({ request: req('POST', '/api/auth/verify-reset-otp', { email: EMAIL, otp }), env });
    data = await json(res);
    assert(res.status === 400 && !data.resetToken, 'correct OTP rejected after record invalidation');

    // Fresh request → correct OTP mints a hashed grant
    bumpCooldown();
    emailLog.length = 0;
    await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }, BLOCK_IP), env, ctx: {} });
    const otp2 = extractOtp();
    res = await verifyOtpPost({ request: req('POST', '/api/auth/verify-reset-otp', { email: EMAIL, otp: otp2 }), env });
    data = await json(res);
    assert(res.status === 200 && data.success && /^[0-9a-f]{64}$/.test(data.resetToken),
      'valid OTP verifies in-page and mints the one-time reset grant');
    const grantRow = db.prepare('SELECT grant_hash, used, attempts FROM password_resets').get();
    assert(grantRow.grant_hash === await sha256(data.resetToken),
      'reset grant stored only as SHA-256 hash (never plaintext)');
    assert(grantRow.used === 0 && grantRow.attempts === 0, 'successful verification leaves the row ready for consumption');
    globalThis.__grant = data.resetToken;
  }

  // ---- reset-password via grant: policy, revocation, alert, single-use ----
  {
    const grant = globalThis.__grant;

    // Password policy enforced on the reset channel too
    let res = await resetPost({ request: req('POST', '/api/auth/reset-password', { email: EMAIL, grant, password: 'weakpass' }), env });
    let data = await json(res);
    assert(res.status === 400 && /Password/.test(data.error), 'weak new password rejected by the reset policy');

    res = await resetPost({ request: req('POST', '/api/auth/reset-password', { email: EMAIL, grant, password: 'N3wS3cure!Pass' }), env });
    data = await json(res);
    assert(res.status === 200 && data.success && /Password reset successfully/.test(data.message),
      'new password set via the in-page OTP grant');

    // Credentials rotated in users + candidates; old password no longer works
    const user = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(CAND_ID);
    const computed = await hashPassword('N3wS3cure!Pass', user.salt);
    assert(computed === user.password_hash && user.salt !== 'oldsalt',
      'users credentials replaced with a fresh PBKDF2 salt');
    const cand = db.prepare('SELECT password_hash, salt FROM candidates WHERE email = ?').get(EMAIL);
    assert(cand.password_hash === user.password_hash, 'legacy candidates table credentials kept in sync');

    // Global session revocation
    const sessionCount = db.prepare('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?').get(CAND_ID).c;
    assert(sessionCount === 0, 'ALL active sessions revoked upon password reset');

    // Single-use: replaying the grant fails
    res = await resetPost({ request: req('POST', '/api/auth/reset-password', { email: EMAIL, grant, password: 'Another1!Pass' }), env });
    data = await json(res);
    assert(res.status === 400 && /invalid, expired or already used/.test(data.error),
      'reset grant is single-use (replay rejected)');

    // Security alert email dispatched immediately
    const alert = emailLog.find(e => /Password Was Changed/i.test(e.subject));
    assert(!!alert && alert.to[0] === EMAIL, 'post-reset security alert email dispatched');
    assert(/password was just changed/i.test(alert.text), 'security alert explains the change + session revocation');
  }

  // ---- reset-password via magic link ----
  {
    const BLOCK_IP = '10.7.2.1';
    bumpCooldown();
    emailLog.length = 0;
    await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }, BLOCK_IP), env, ctx: {} });
    const token = extractToken();

    // Stateless validity check
    let res = await verifyTokenPost({ request: req('POST', '/api/auth/verify-reset-token', { token }), env });
    let data = await json(res);
    assert(res.status === 200 && data.valid === true, 'magic-link token validates as fresh');

    db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES ('${'c'.repeat(64)}', ?, ?, 'candidate', 1, 9999999999)`).run(CAND_ID, EMAIL);

    res = await resetPost({ request: req('POST', '/api/auth/reset-password', { token, password: 'L1nkR3set!Pass' }), env });
    data = await json(res);
    assert(res.status === 200 && data.success, 'magic-link channel sets the new password');

    const sessionCount = db.prepare('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?').get(CAND_ID).c;
    assert(sessionCount === 0, 'magic-link reset also revokes all sessions');

    res = await verifyTokenPost({ request: req('POST', '/api/auth/verify-reset-token', { token }), env });
    data = await json(res);
    assert(res.status === 200 && data.valid === false, 'consumed token no longer validates');

    res = await resetPost({ request: req('POST', '/api/auth/reset-password', { token, password: 'Replay1!Pass' }), env });
    data = await json(res);
    assert(res.status === 400 && /already used/.test(data.error), 'magic link is single-use (replay rejected)');

    // Tampered token rejected
    res = await verifyTokenPost({ request: req('POST', '/api/auth/verify-reset-token', { token: 'f'.repeat(64) }), env });
    data = await json(res);
    assert(res.status === 200 && data.valid === false, 'tampered/unknown token does not validate');
  }

  // ---- expiry enforcement ----
  {
    const BLOCK_IP = '10.7.3.1';
    bumpCooldown();
    emailLog.length = 0;
    await forgotPost({ request: req('POST', '/api/auth/forgot-password', { email: EMAIL }, BLOCK_IP), env, ctx: {} });
    const otp = extractOtp();
    const token = extractToken();

    // Force expiry
    db.prepare('UPDATE password_resets SET expires_at = ?').run(Math.floor(Date.now() / 1000) - 10);

    let res = await verifyOtpPost({ request: req('POST', '/api/auth/verify-reset-otp', { email: EMAIL, otp }), env });
    let data = await json(res);
    assert(res.status === 400 && /Invalid or expired/.test(data.error), 'expired OTP rejected');

    res = await verifyTokenPost({ request: req('POST', '/api/auth/verify-reset-token', { token }), env });
    data = await json(res);
    assert(res.status === 200 && data.valid === false, 'expired magic link fails the validity check');

    res = await resetPost({ request: req('POST', '/api/auth/reset-password', { token, password: 'Late1!Passx' }), env });
    data = await json(res);
    assert(res.status === 400 && /invalid, expired/.test(data.error), 'expired reset cannot consume the password change');
  }

  console.log(`\n${colors.bold}${failed === 0 ? colors.green : colors.red}Result: ${passed} passed, ${failed} failed${colors.reset}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}Suite aborted: ${err.message}${colors.reset}`);
  process.exit(1);
});
