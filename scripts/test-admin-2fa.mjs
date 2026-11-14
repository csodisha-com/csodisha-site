// Verification for admin 2FA: TOTP (RFC 6238 vectors), OTP hashing/expiry/attempts, backup code single-use.
// Run: node scripts/test-admin-2fa.mjs   (uses node:sqlite as a D1 stand-in)
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import * as m from '../functions/_lib/admin-2fa.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...args) || null,
    _exec: () => db.prepare(sql).run(...args)
  });
  return { db, prepare: s => stmt(s), batch: async list => { for (const s of list) s._exec(); return []; } };
}
const env = { DB: makeD1(), ADMIN_TOTP_SECRET: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' }; // base32("12345678901234567890")

// --- TOTP: RFC 6238 SHA-1 test vectors (8 digits -> compare last 6)
const secret = m.base32Decode(env.ADMIN_TOTP_SECRET);
assert.equal(new TextDecoder().decode(secret), '12345678901234567890');
for (const [t, code8] of [[59, '94287082'], [1111111109, '07081804'], [1234567890, '89005924'], [2000000000, '69279037']]) {
  assert.equal(await m.hotp(secret, Math.floor(t / 30)), code8.slice(2));
}
const now = 1234567890 * 1000;
assert.equal(await m.verifyTotp(env.ADMIN_TOTP_SECRET, '005924', now), true);
assert.equal(await m.verifyTotp(env.ADMIN_TOTP_SECRET, '005924', now + 30000), true, '+1 step drift');
assert.equal(await m.verifyTotp(env.ADMIN_TOTP_SECRET, '005924', now - 30000), true, '-1 step drift');
assert.equal(await m.verifyTotp(env.ADMIN_TOTP_SECRET, '005924', now + 90000), false, 'beyond drift window');
assert.equal(await m.verifyTotp(env.ADMIN_TOTP_SECRET, '000000', now), false);
assert.equal(await m.verifyTotp(env.ADMIN_TOTP_SECRET, 'abc123', now), false);

// --- Config gating (safe rollout)
assert.equal(m.isTwoFactorConfigured({}), false);
assert.equal(m.isTwoFactorConfigured({ ADMIN_TOTP_SECRET: 'X' }), true);
assert.equal(m.isTwoFactorConfigured({ ADMIN_TG_BOT_TOKEN: 't', ADMIN_TG_CHAT_ID: '1' }), true);
assert.equal(m.isTwoFactorConfigured({ ADMIN_TG_BOT_TOKEN: 't' }), false);
assert.equal(m.isTwoFactorConfigured({ ADMIN_2FA_EMAIL: 'a@b.co' }), true);

// --- Push OTP: hash-only storage, 60s rate limit, expiry, 5-attempt cap, single use
const uid = 'user-1', t0 = 1_700_000_000;
const o1 = await m.issueOtp(env, uid, t0);
assert.ok(o1.ok && /^\d{6}$/.test(o1.code));
const row = env.DB.db.prepare('SELECT * FROM admin_otps WHERE user_id = ?').get(uid);
assert.equal(row.code_hash, await m.sha256Hex(`${uid}:${o1.code}`));
assert.ok(!JSON.stringify(row).includes(`"${o1.code}"`), 'plaintext OTP not stored');
assert.equal(row.expires_at, t0 + 600);
const o2 = await m.issueOtp(env, uid, t0 + 30);
assert.equal(o2.ok, false); assert.equal(o2.retryAfter, 30, 'rate limited to 1/60s');
assert.equal(await m.verifyOtp(env, uid, '000000' === o1.code ? '111111' : '000000', t0 + 10), false);
assert.equal(await m.verifyOtp(env, uid, o1.code, t0 + 20), true);
assert.equal(await m.verifyOtp(env, uid, o1.code, t0 + 21), false, 'OTP is single-use');
const o3 = await m.issueOtp(env, uid, t0 + 100);
assert.equal(o3.ok, true);
assert.equal(await m.verifyOtp(env, uid, o3.code, t0 + 100 + 601), false, 'expired after 10 min');
const o4 = await m.issueOtp(env, uid, t0 + 2000);
const wrong = o4.code === '123456' ? '654321' : '123456';
for (let i = 0; i < 5; i++) assert.equal(await m.verifyOtp(env, uid, wrong, t0 + 2001), false);
assert.equal(await m.verifyOtp(env, uid, o4.code, t0 + 2002), false, 'locked after 5 failed attempts');

// --- Backup codes
const codes = await m.generateBackupCodes(env);
assert.equal(codes.length, 8);
assert.ok(codes.every(c => /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c)) && new Set(codes).size === 8);
const stored = env.DB.db.prepare('SELECT code_hash FROM admin_backup_codes').all().map(r => r.code_hash);
assert.equal(stored.length, 8);
assert.ok(codes.every(c => !stored.includes(c)) && stored.every(h => /^[0-9a-f]{64}$/.test(h)), 'only SHA-256 hashes stored');
assert.deepEqual(await m.backupCodeStatus(env), { remaining: 8, total: 8 });
assert.equal(await m.consumeBackupCode(env, codes[0].toLowerCase().replace('-', ' ')), true, 'normalised input accepted');
assert.equal(await m.consumeBackupCode(env, codes[0]), false, 'single-use: second attempt rejected');
assert.deepEqual(await m.backupCodeStatus(env), { remaining: 7, total: 8 });
assert.equal(await m.verifyTwoFactor(env, uid, codes[1]), true, 'login path accepts backup code');
assert.equal(await m.verifyTwoFactor(env, uid, codes[1]), false);
assert.equal(await m.verifyTwoFactor(env, uid, 'NOPE-NOPE'), false);
const regen = await m.generateBackupCodes(env);
assert.equal(await m.consumeBackupCode(env, codes[2]), false, 'old codes invalid after regeneration');
assert.equal(await m.consumeBackupCode(env, regen[0]), true);

// --- verifyTwoFactor with TOTP / OTP at login
assert.equal(await m.verifyTwoFactor(env, uid, '005924', now), true);
const tgEnv = { ...env, ADMIN_TG_BOT_TOKEN: 't', ADMIN_TG_CHAT_ID: '1' };
const live = await m.issueOtp(tgEnv, 'user-2', Math.floor(Date.now() / 1000));
assert.equal(await m.verifyTwoFactor(tgEnv, 'user-2', live.code), true);

// --- Delivery: Telegram first, email fallback
const calls = [];
const okFetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200 }; };
let sent = await m.deliverOtp({ ADMIN_TG_BOT_TOKEN: 'TOK', ADMIN_TG_CHAT_ID: '42', ADMIN_2FA_EMAIL: 'a@b.co', RESEND_API_KEY: 'k' }, '123456', okFetch);
assert.deepEqual(sent, ['telegram']);
assert.equal(calls[0].url, 'https://api.telegram.org/botTOK/sendMessage');
assert.equal(calls[0].body.chat_id, '42'); assert.ok(calls[0].body.text.includes('123456'));
calls.length = 0;
sent = await m.deliverOtp({ ADMIN_2FA_EMAIL: 'a@b.co', RESEND_API_KEY: 'k' }, '123456', okFetch);
assert.deepEqual(sent, ['email']); assert.equal(calls[0].url, 'https://api.resend.com/emails');
calls.length = 0;
sent = await m.deliverOtp({ ADMIN_2FA_EMAIL: 'a@b.co' }, '123456', okFetch);
assert.deepEqual(sent, ['email']); assert.equal(calls[0].url, 'https://api.mailchannels.net/tx/v1/send');
sent = await m.deliverOtp({ ADMIN_TG_BOT_TOKEN: 'T', ADMIN_TG_CHAT_ID: '1', ADMIN_2FA_EMAIL: 'a@b.co' }, '123456',
  async (url) => url.includes('telegram') ? { ok: false, status: 500 } : { ok: true, status: 200 });
assert.deepEqual(sent, ['email'], 'email fallback when Telegram fails');

console.log('ADMIN 2FA TESTS PASSED');
