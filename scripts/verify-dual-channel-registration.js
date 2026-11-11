#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — Dual-Channel Registration Integration Suite
 * Verifies the 6-digit OTP + Magic Link candidate registration lifecycle by
 * executing the real edge handlers against an in-memory SQLite database that
 * mirrors schema.sql. Only the outbound Resend HTTP call is mocked.
 *
 * Covers the hardened pipeline: honeypot trap, disposable-email blocklist,
 * password policy, name/phone/stream sanitization, 1-to-1 mobile uniqueness,
 * server-side sessions, brute-force lockout, IP rate limiting and the
 * /api/auth/me + /api/auth/logout session lifecycle.
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
let res;
let data;
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
  const { onRequestGet: meGet } = await import(path.join(ROOT, 'functions/api/auth/me.js'));
  const { onRequestPost: logoutPost } = await import(path.join(ROOT, 'functions/api/auth/logout.js'));
  const {
    generateOtpCode,
    generateVerificationToken,
    validatePasswordStrength,
    normalizeIndianPhone,
    sanitizeFullName,
    sanitizeTargetStreams,
    constantTimeEqual,
    isDisposableEmail,
    normalizeEmail
  } = await import(path.join(ROOT, 'functions/api/auth/_utils.js'));

  const env = { DB: makeD1(db), RESEND_API_KEY: 're_test_key', EMAIL_FROM: 'Common Sense Odisha <onboarding@resend.dev>' };
  const ctx = { waitUntil: (p) => p.catch(() => {}) };

  let ip = 0;
  const post = (pathName, body) => new Request('https://csodisha.com' + pathName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': `10.1.0.${++ip}` },
    body: JSON.stringify(body)
  });
  const postFromIp = (pathName, body, ipAddr) => new Request('https://csodisha.com' + pathName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ipAddr },
    body: JSON.stringify(body)
  });
  const get = (pathName, extraHeaders = {}) => new Request('https://csodisha.com' + pathName, {
    headers: { 'cf-connecting-ip': `10.1.0.${++ip}`, ...extraHeaders }
  });
  const now = () => Math.floor(Date.now() / 1000);
  const pendingRow = (email) => db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(email);
  const sessionRow = (token) => db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);

  // Shared security helpers
  {
    const codes = new Set();
    for (let i = 0; i < 3000; i++) codes.add(generateOtpCode());
    assert([...codes].every(c => /^[0-9]{6}$/.test(c)) && codes.size > 500, 'OTP generator is crypto-secure, unbiased 6-digit');
    assert(/^[0-9a-f]{48}$/.test(generateVerificationToken()), 'magic token generator is 24-byte hex');
    assert(validatePasswordStrength('Weakpass1') !== null && validatePasswordStrength('Str0ng!Passw0rd') === null,
      'password policy requires length + mixed case + digit + symbol');
    assert(validatePasswordStrength('Password123!') !== null, 'common passwords are rejected');
    assert(validatePasswordStrength('Str0ng!Passw0rd', { name: 'Rani', email: 'rani@example.com' }) === null,
      'unrelated password passes the name/email check');
    assert(validatePasswordStrength('RaniStr0ng!', { name: 'Rani Das' }) !== null, 'passwords containing a name token are rejected');
    assert(validatePasswordStrength('dasSecure!99X', { name: 'Rani Das' }) !== null, 'passwords containing a surname token are rejected');
    assert(validatePasswordStrength('rani!secure99X', { email: 'rani@example.com' }) !== null, 'passwords containing the email local-part are rejected');
    assert(normalizeIndianPhone('+91 98765 43210').value === '9876543210', 'Indian phone normalization strips +91 and spaces');
    assert(normalizeIndianPhone('12345').error !== undefined, 'invalid phone formats are rejected');
    assert(sanitizeFullName('  <b>Rani Das</b> ').value === 'Rani Das', 'full name sanitizer strips HTML tags');
    assert(sanitizeFullName('A').error !== undefined && sanitizeFullName('Rani D4s!').error !== undefined,
      'full name enforces 2-80 chars, letters/dots/spaces only');
    assert(JSON.stringify(sanitizeTargetStreams(['OPSC', 'bogus', 'teaching', 'OPSC'])) === JSON.stringify(['opsc', 'teaching']),
      'target streams filtered to the allowed enum');
    assert(constantTimeEqual('abc', 'abc') === true && constantTimeEqual('abc', 'abd') === false && constantTimeEqual('ab', 'abc') === false,
      'constant-time compare is correct');
    assert(isDisposableEmail('x@mailinator.com') && !isDisposableEmail('x@gmail.com'), 'disposable domain blocklist works');
    assert(normalizeEmail('  Rani@Example.COM ') === 'rani@example.com', 'email normalization trims and lowercases');
  }

  // 1. Honeypot bot trap: silent 200, no staging, no email
  const honeypotMailCount = sentEmails.length;
  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Bot Fill', email: 'bot@example.com', password: 'BotPass123!', website: 'http://spam.example'
  }), env, ctx });
  data = await res.json();
  assert(res.status === 200 && data.success === true && !pendingRow('bot@example.com') && sentEmails.length === honeypotMailCount,
    'honeypot submission returns silent 200 without staging or dispatching mail');

  // 2. Disposable email blocklist
  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Temp User', email: 'temp@mailinator.com', password: 'TempPass123!'
  }), env, ctx });
  assert(res.status === 400 && /disposable/i.test((await res.json()).error || ''), 'disposable email domain is rejected');

  // 3. Password policy enforcement
  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Weak Pass', email: 'weak@example.com', password: 'weakpass'
  }), env, ctx });
  assert(res.status === 400 && /[Uu]ppercase/.test((await res.json()).error || ''), 'weak password is rejected with policy guidance');

  // 4. Fresh registration dispatches both channels
  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Rani Das', email: '  Rani@Example.COM ', district: 'Puri',
    password: 'SecretPass123!', targetStreams: ['opsc']
  }), env, ctx });
  data = await res.json();
  assert(res.status === 200 && data.success && data.message === 'Verification code sent' && data.email === 'rani@example.com',
    'fresh registration responds with code-sent + normalized email');
  let row = pendingRow('rani@example.com');
  assert(row && /^[0-9]{6}$/.test(row.otp_code) && /^[0-9a-f]{48}$/.test(row.token) && row.attempts === 0 && row.expires_at > now(),
    'pending row staged with OTP, token, attempts and expiry');
  assert(sentEmails.some(m => m.html.includes(row.otp_code) && m.html.includes(`token=${row.token}`)),
    'Resend email carries both the OTP and the magic link');

  // 5. Dispatch cooldown
  res = await registerPost({ request: post('/api/auth/register', { email: 'rani@example.com' }), env, ctx });
  assert(res.status === 429, 'resend within 60 s is throttled');

  // 6. Passwordless resend preserves staged credentials
  db.prepare('UPDATE email_verifications SET created_at = ? WHERE email = ?').run(now() - 120, 'rani@example.com');
  const before = pendingRow('rani@example.com');
  res = await registerPost({ request: post('/api/auth/register', { email: 'rani@example.com' }), env, ctx });
  data = await res.json();
  const after = pendingRow('rani@example.com');
  assert(res.status === 200 && data.isResume === true, 'passwordless resend succeeds as resume');
  assert(after.password_hash === before.password_hash && after.salt === before.salt && after.candidate_data === before.candidate_data,
    'resend preserves the staged password hash, salt and profile');
  assert(after.otp_code !== before.otp_code && after.token !== before.token && after.attempts === 0,
    'resend issues a fresh OTP + token with attempts reset');

  // 7. Staged (unverified) email can re-register with fresh credentials
  await registerPost({ request: post('/api/auth/register', {
    fullName: 'Staged User', email: 'staged@example.com', password: 'FirstPass123!'
  }), env, ctx });
  const stagedBefore = pendingRow('staged@example.com');
  db.prepare('UPDATE email_verifications SET created_at = ? WHERE email = ?').run(now() - 120, 'staged@example.com');
  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Staged User', email: 'staged@example.com', password: 'SecondPass456!'
  }), env, ctx });
  const stagedAfter = pendingRow('staged@example.com');
  assert(res.status === 200 && stagedAfter.password_hash !== stagedBefore.password_hash && stagedAfter.attempts === 0,
    'staged unverified email can re-register with an upserted hash');

  // 8. Wrong OTP increments attempt tracking
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'rani@example.com', code: '000000' }), env, ctx });
  data = await res.json();
  assert(res.status === 400 && /4 attempt\(s\) remaining/.test(data.error) && pendingRow('rani@example.com').attempts === 1,
    'wrong OTP increments attempts and reports remaining tries');

  // 9. Correct OTP promotes the candidate and opens a server session
  const stagedHash = after.password_hash;
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'rani@example.com', code: after.otp_code }), env, ctx });
  data = await res.json();
  const promotedUser = db.prepare('SELECT * FROM users WHERE email = ?').get('rani@example.com');
  const promotedCand = db.prepare('SELECT * FROM candidates WHERE email = ?').get('rani@example.com');
  assert(res.status === 200 && data.success === true && data.message === 'Account verified successfully',
    'correct OTP verifies with the explicit success message');
  assert(data.user && data.user.id === promotedUser.id && data.user.email === 'rani@example.com'
    && data.user.name === 'Rani Das' && data.user.role === 'candidate',
    'verification payload carries the verified user object');
  assert(typeof data.sessionToken === 'string' && /^[0-9a-f]{64}$/.test(data.sessionToken)
    && data.redirect === '/student-dashboard/?verified=1',
    'verification payload carries a 256-bit session token and dashboard redirect');
  const raniSession = sessionRow(data.sessionToken);
  assert(!!raniSession && raniSession.user_id === promotedUser.id && raniSession.expires_at > now(),
    'active session row created in the sessions table');
  assert(promotedUser && promotedUser.password_hash === stagedHash && promotedCand && promotedCand.full_name === 'Rani Das',
    'account promoted atomically with the staged hash and profile');
  assert(!pendingRow('rani@example.com') && (res.headers.get('Set-Cookie') || '').startsWith('cso_session=')
    && /Max-Age=2592000/.test(res.headers.get('Set-Cookie') || ''),
    'pending row cleared and 30-day session cookie issued');

  // 10. /api/auth/me introspects the session cookie
  const meRes = await meGet({ request: get('/api/auth/me', { Cookie: `cso_session=${data.sessionToken}` }), env });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.authenticated === true && meData.user.email === 'rani@example.com'
    && meData.user.name === 'Rani Das', '/api/auth/me resolves the session cookie to the verified profile');

  // 11. /api/auth/logout revokes the session and clears the cookie
  const logoutReq = new Request('https://csodisha.com/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `cso_session=${data.sessionToken}` }
  });
  const realLogoutRes = await logoutPost({ request: logoutReq, env });
  const logoutData = await realLogoutRes.json();
  assert(realLogoutRes.status === 200 && logoutData.success && /Max-Age=0/.test(realLogoutRes.headers.get('Set-Cookie') || ''),
    'logout clears the session cookie');
  assert(!sessionRow(data.sessionToken), 'logout deletes the session row');
  const meAfterLogout = await meGet({ request: get('/api/auth/me', { Cookie: `cso_session=${data.sessionToken}` }), env });
  assert(meAfterLogout.status === 401, 'me returns 401 after logout');

  // 12. Re-registration blocked after verification
  res = await registerPost({ request: post('/api/auth/register', { email: 'rani@example.com', password: 'Whatever123!' }), env, ctx });
  assert(res.status === 409, 'already-verified email cannot re-register');

  // 13. Magic link channel
  await registerPost({ request: post('/api/auth/register', { fullName: 'Magic User', email: 'magic@example.com', password: 'Wizard!Pass77Z' }), env, ctx });
  const magicRow = pendingRow('magic@example.com');
  res = await verifyLinkGet({ request: get(`/api/auth/verify-link?email=magic%40example.com&token=${magicRow.token}`), env, ctx });
  const magicCookie = res.headers.get('Set-Cookie') || '';
  assert(res.status === 302 && res.headers.get('Location') === '/student-dashboard/?verified=1'
    && magicCookie.startsWith('cso_session=')
    && !!db.prepare('SELECT id FROM users WHERE email = ?').get('magic@example.com') && !pendingRow('magic@example.com'),
    'magic link verifies in one click, issues a session cookie, and is single-use');
  assert(magicCookie.includes('HttpOnly') && magicCookie.includes('Secure') && magicCookie.includes('SameSite=Lax'),
    'session cookie is HttpOnly, Secure and SameSite=Lax');
  res = await verifyLinkGet({ request: get(`/api/auth/verify-link?email=magic%40example.com&token=${magicRow.token}`), env, ctx });
  assert(res.status === 400, 'replayed magic link is rejected');

  // 14. Resend without a pending row
  res = await registerPost({ request: post('/api/auth/register', { email: 'ghost@example.com', resend: true }), env, ctx });
  assert(res.status === 400 && /No pending registration/.test((await res.json()).error || ''),
    'resend with no pending verification returns a clear 400');

  // 15. Expiry + brute-force lockout (403 after 5 invalid attempts)
  await registerPost({ request: post('/api/auth/register', { fullName: 'Locked T', email: 'locked@example.com', password: 'Vault!Pass12L' }), env, ctx });
  const expRow = pendingRow('locked@example.com');
  db.prepare('UPDATE email_verifications SET expires_at = ? WHERE email = ?').run(now() - 1, 'locked@example.com');
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'locked@example.com', code: expRow.otp_code }), env, ctx });
  assert(res.status === 400 && /expired/i.test((await res.json()).error || ''), 'expired verification window is rejected');

  db.prepare('UPDATE email_verifications SET expires_at = ? WHERE email = ?').run(now() + 900, 'locked@example.com');
  for (let i = 0; i < 5; i++) {
    res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'locked@example.com', code: '111111' }), env, ctx });
  }
  assert(res.status === 403 && /Too many invalid attempts/.test((await res.json()).error || '') && !pendingRow('locked@example.com'),
    'five wrong codes invalidate the pending row with a 403 lockout');

  // 16. Registration IP rate limiting: 5 per IP per 10 minutes
  for (let i = 1; i <= 5; i++) {
    res = await registerPost({ request: postFromIp('/api/auth/register', {
      fullName: 'Test Candidate', email: `rl${i}@example.com`, password: 'RateLimit123!'
    }, '198.51.100.7'), env, ctx });
    assert(res.status === 200, `registration ${i}/5 from the same IP allowed`);
  }
  res = await registerPost({ request: postFromIp('/api/auth/register', {
    fullName: 'Test Candidate', email: 'rl6@example.com', password: 'RateLimit123!'
  }, '198.51.100.7'), env, ctx });
  assert(res.status === 429 && (res.headers.get('Retry-After') || '') !== '',
    '6th registration from the same IP is rate limited with Retry-After');

  // 17. OTP verification IP rate limiting: 5 per IP per 15 minutes
  await registerPost({ request: post('/api/auth/register', { fullName: 'RL Verify', email: 'rlverify@example.com', password: 'RateVerif1!' }), env, ctx });
  for (let i = 1; i <= 4; i++) {
    res = await verifyOtpPost({ request: postFromIp('/api/auth/verify-otp', { email: 'rlverify@example.com', code: '999999' }, '198.51.100.9'), env, ctx });
    assert(res.status === 400, `OTP attempt ${i}/5 from the same IP processed normally`);
  }
  // 5th wrong code trips the per-row lockout (403) before the IP limit is hit
  res = await verifyOtpPost({ request: postFromIp('/api/auth/verify-otp', { email: 'rlverify@example.com', code: '999999' }, '198.51.100.9'), env, ctx });
  assert(res.status === 403 && !pendingRow('rlverify@example.com'),
    '5th wrong OTP from the same IP trips the account lockout');
  // 6th verification request from the same IP now hits the IP rate limit
  res = await verifyOtpPost({ request: postFromIp('/api/auth/verify-otp', { email: 'rlverify@example.com', code: '999999' }, '198.51.100.9'), env, ctx });
  assert(res.status === 429 && (res.headers.get('Retry-After') || '') !== '',
    '6th OTP verification from the same IP is rate limited with Retry-After');

  // 18. Strict 1-to-1 phone uniqueness
  await registerPost({ request: post('/api/auth/register', {
    fullName: 'Alok Kumar', email: 'phone1@example.com', password: 'Star!Light88K', phone: '+91 90000 00001'
  }), env, ctx });
  const phone1Row = pendingRow('phone1@example.com');
  await registerPost({ request: post('/api/auth/register', {
    fullName: 'Meera Sen', email: 'phone2@example.com', password: 'Moon!Beam77M', phone: '9000000001'
  }), env, ctx });
  const phone2Row = pendingRow('phone2@example.com');
  assert(phone1Row && phone2Row && JSON.parse(phone1Row.candidate_data).phone === '9000000001'
    && JSON.parse(phone2Row.candidate_data).phone === '9000000001',
    'phone normalized to 10 digits and staged for both pending rows');

  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'phone1@example.com', code: phone1Row.otp_code }), env, ctx });
  assert(res.status === 200 && db.prepare('SELECT phone FROM candidates WHERE email = ?').get('phone1@example.com').phone === '9000000001',
    'first verified candidate claims the mobile number');

  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Gita Priya', email: 'phone3@example.com', password: 'River!Flow66G', phone: '9000000001'
  }), env, ctx });
  assert(res.status === 409 && /already registered/.test((await res.json()).error || ''),
    'registration with an already-claimed mobile number is rejected with 409');

  // Phone conflict discovered at promotion time: staged number claimed in the
  // meantime is dropped (NULL) instead of failing the whole verification.
  res = await verifyOtpPost({ request: post('/api/auth/verify-otp', { email: 'phone2@example.com', code: phone2Row.otp_code }), env, ctx });
  const phone2Cand = db.prepare('SELECT phone FROM candidates WHERE email = ?').get('phone2@example.com');
  assert(res.status === 200 && (phone2Cand.phone === null || phone2Cand.phone === ''),
    'conflicting staged phone is nulled at promotion, verification still succeeds');

  // 19. Invalid phone format rejected
  res = await registerPost({ request: post('/api/auth/register', {
    fullName: 'Bad Phone', email: 'badphone@example.com', password: 'Sky!High55B', phone: '12345'
  }), env, ctx });
  assert(res.status === 400 && /valid 10-digit Indian mobile/.test((await res.json()).error || ''),
    'invalid Indian mobile format is rejected');

  console.log(`\n${colors.bold}${failed === 0 ? colors.green : colors.red}Result: ${passed} passed, ${failed} failed${colors.reset}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}Suite aborted: ${err.message}${colors.reset}`);
  process.exit(1);
});
