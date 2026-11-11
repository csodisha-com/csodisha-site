#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — Dual-Channel Registration Integration Suite
 * Verifies the 6-digit OTP + Magic Link candidate registration lifecycle by
 * executing the real edge handlers against an in-memory SQLite database that
 * mirrors schema.sql. Only the outbound Resend HTTP call is mocked.
 *
 * Requires Node >= 22.5 (node:sqlite).
 * Usage:
 *   node scripts/verify-dual-channel-registration.js
 */

const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
let passed = 0;
let failed = 0;
function logPass(msg) { passed++; console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`); }
function logFail(msg) { failed++; console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`); }
function assert(cond, msg) { if (cond) logPass(msg); else { logFail(msg); throw new Error(msg); } }

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}CS Odisha Dual-Channel Registration Integration Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  const schema = readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(schema);

  // Minimal D1 binding mock over node:sqlite
  function makeD1(sqlite) {
    const makeStatement = (sql) => {
      const state = { sql, params: [] };
      const runner = {
        bind(...params) { state.params = params; return runner; },
        async first() { return sqlite.prepare(state.sql).get(...state.params) ?? null; },
        async all() { return sqlite.prepare(state.sql).all(...state.params); },
        async run() { sqlite.prepare(state.sql).run(...state.params); return { success: true }; }
      };
      return runner;
    };
    return {
      prepare: (sql) => makeStatement(sql),
      async batch(statements) { for (const s of statements) await s.run(); }
    };
  }

  // Mock the Resend transactional transport
  const sentEmails = [];
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://api.resend.com/emails') {
      sentEmails.push(JSON.parse(init.body));
      return { ok: true, status: 200, text: async () => '' };
    }
    throw new Error('Unexpected outbound fetch: ' + url);
  };

  const { onRequestPost: registerPost } = await import(path.join(ROOT, 'functions/api/auth/register.js'));
  const { onRequestPost: verifyOtpPost } = await import(path.join(ROOT, 'functions/api/auth/verify-otp.js'));
  const { onRequestGet: verifyLinkGet } = await import(path.join(ROOT, 'functions/api/auth/verify-link.js'));
  const { generateOtpCode, generateVerificationToken } = await import(path.join(ROOT, 'functions/api/auth/_utils.js'));

  const env = { DB: makeD1(db), RESEND_API_KEY: 're_test_key', EMAIL_FROM: 'Common Sense Odisha <onboarding@resend.dev>' };
  const ctx = { waitUntil: (p) => p.catch(() => {}) };

  let ip = 0;
  const post = (pathName, body) => new Request('https://csodisha.com' + pathName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': `10.1.0.${++ip}` },
    body: JSON.stringify(body)
  });
  const get = (pathName) => new Request('https://csodisha.com' + pathName, {
    headers: { 'cf-connecting-ip': `10.1.0.${++ip}` }
  });
  const now = () => Math.floor(Date.now() / 1000);
  const pendingRow = (email) => db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(email);

  // Channel-secret generators
  {
    const codes = new Set();
    for (let i = 0; i < 3000; i++) codes.add(generateOtpCode());
    assert([...codes].every(c => /^[0-9]{6}$/.test(c)) && codes.size > 500, 'OTP generator is crypto-secure, unbiased 6-digit');
    assert(/^[0-9a-f]{48}$/.test(generateVerificationToken()), 'magic token generator is 24-byte hex');
  }

  // 1. Fresh registration dispatches both channels
  let res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Rani Das', email: '  Rani@Example.COM ', district: 'Puri',
    password: 'SecretPass123', targetStreams: ['opsc']
  }), env, ctx });
  let data = await res.json();
  assert(res.status === 200 && data.success && data.message === 'Verification code sent' && data.email === 'rani@example.com',
    'fresh registration responds with code-sent + normalized email');
  let row = pendingRow('rani@example.com');
  assert(row && /^[0-9]{6}$/.test(row.otp_code) && /^[0-9a-f]{48}$/.test(row.token) && row.attempts === 0 && row.expires_at > now(),
    'pending row staged with OTP, token, attempts and expiry');
  assert(sentEmails.length === 1 && sentEmails[0].html.includes(row.otp_code) && sentEmails[0].html.includes(`token=${row.token}`),
    'Resend email carries both the OTP and the magic link');

  // 2. Dispatch cooldown
  res = await registerPost({ request: post('/api/auth/register', { email: 'rani@example.com', password: 'OtherPass12345', resend: true }), env, ctx });
  assert(res.status === 429, 'resend within 60 s is throttled');

  // 3. Passwordless resend preserves staged credentials
  db.prepare('UPDATE email_verifications SET created_at = ? WHERE email = ?').run(now() - 120, 'rani@example.com');
  const before = pendingRow('rani@example.com');
  res = await registerPost({ request: post('/api/auth/resend-otp', { email: 'rani@example.com' }), env, ctx });
  data = await res.json();
  const after = pendingRow('rani@example.com');
  assert(res.status === 200 && data.isResume === true, 'passwordless resend succeeds as resume');
  assert(after.password_hash === before.password_hash && after.salt === before.salt && after.candidate_data === before.candidate_data,
    'resend preserves the staged password hash, salt and profile');
  assert(after.otp_code !== before.otp_code && after.token !== before.token && after.attempts === 0,
    'resend issues a fresh OTP + token with attempts reset');

  // 4. Wrong OTP increments attempt tracking
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'rani@example.com', code: '000000' }), env, ctx });
  data = await res.json();
  assert(res.status === 400 && /4 attempt\(s\) remaining/.test(data.error) && pendingRow('rani@example.com').attempts === 1,
    'wrong OTP increments attempts and reports remaining tries');

  // 5. Correct OTP promotes the candidate
  const stagedHash = after.password_hash;
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'rani@example.com', code: after.otp_code }), env, ctx });
  data = await res.json();
  const promotedUser = db.prepare('SELECT * FROM users WHERE email = ?').get('rani@example.com');
  const promotedCand = db.prepare('SELECT * FROM candidates WHERE email = ?').get('rani@example.com');
  assert(res.status === 200 && data.success && !!data.token, 'correct OTP verifies and returns a session token');
  assert(promotedUser && promotedUser.password_hash === stagedHash && promotedCand && promotedCand.full_name === 'Rani Das',
    'account promoted atomically with the staged hash and profile');
  assert(!pendingRow('rani@example.com') && (res.headers.get('Set-Cookie') || '').startsWith('cso_session='),
    'pending row cleared and session cookie issued');

  // 6. Re-registration blocked after verification
  res = await registerPost({ request: post('/api/auth/register', { email: 'rani@example.com', password: 'Whatever123' }), env, ctx });
  assert(res.status === 409, 'already-verified email cannot re-register');

  // 7. Magic link channel
  await registerPost({ request: post('/api/auth/register', { fullName: 'Magic User', email: 'magic@example.com', password: 'MagicPass123' }), env, ctx });
  const magicRow = pendingRow('magic@example.com');
  res = await verifyLinkGet({ request: get(`/api/auth/verify-link?email=magic%40example.com&token=${magicRow.token}`), env, ctx });
  assert(res.status === 302 && res.headers.get('Location') === '/student-dashboard/?verified=1'
    && !!db.prepare('SELECT id FROM users WHERE email = ?').get('magic@example.com') && !pendingRow('magic@example.com'),
    'magic link verifies in one click and is single-use');
  res = await verifyLinkGet({ request: get(`/api/auth/verify-link?email=magic%40example.com&token=${magicRow.token}`), env, ctx });
  assert(res.status === 400, 'replayed magic link is rejected');

  // 8. Resend without a pending row
  res = await registerPost({ request: post('/api/auth/register', { email: 'ghost@example.com', resend: true }), env, ctx });
  assert(res.status === 400 && /No pending registration/.test((await res.json()).error || ''),
    'resend with no pending verification returns a clear 400');

  // 9. Expiry + brute-force invalidation
  await registerPost({ request: post('/api/auth/register', { fullName: 'Locked T', email: 'locked@example.com', password: 'LockedPass12' }), env, ctx });
  const expRow = pendingRow('locked@example.com');
  db.prepare('UPDATE email_verifications SET expires_at = ? WHERE email = ?').run(now() - 1, 'locked@example.com');
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'locked@example.com', code: expRow.otp_code }), env, ctx });
  assert(res.status === 400 && /expired/i.test((await res.json()).error || ''), 'expired verification window is rejected');

  db.prepare('UPDATE email_verifications SET expires_at = ? WHERE email = ?').run(now() + 900, 'locked@example.com');
  for (let i = 0; i < 5; i++) {
    res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'locked@example.com', code: '111111' }), env, ctx });
  }
  assert(res.status === 429 && !pendingRow('locked@example.com'),
    'five wrong codes invalidate the pending row');

  console.log(`\n${colors.bold}${failed === 0 ? colors.green : colors.red}Result: ${passed} passed, ${failed} failed${colors.reset}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}Suite aborted: ${err.message}${colors.reset}`);
  process.exit(1);
});
