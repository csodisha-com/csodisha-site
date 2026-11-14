// Admin multi-factor authentication helpers (zero external dependencies).
//   Factor 1: RFC 6238 TOTP checked against env.ADMIN_TOTP_SECRET (Base32)
//   Factor 2: one-time 6-digit push OTP (Telegram Bot API and/or email), stored hashed in D1
//   Factor 3: 8 single-use backup recovery codes (XXXX-XXXX), stored hashed in D1
// 2FA is enforced only when at least one secret is configured, so setup can never lock the admin out.

export const OTP_TTL_SECONDS = 600;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const BACKUP_CODE_COUNT = 8;

const enc = new TextEncoder();
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function twoFactorChannels(env) {
  const e = env || {};
  return {
    totp: !!String(e.ADMIN_TOTP_SECRET || '').trim(),
    telegram: !!(e.ADMIN_TG_BOT_TOKEN && e.ADMIN_TG_CHAT_ID),
    email: !!String(e.ADMIN_2FA_EMAIL || '').trim()
  };
}

export function isTwoFactorConfigured(env) {
  const c = twoFactorChannels(env);
  return c.totp || c.telegram || c.email;
}

export function canSendOtp(env) {
  const c = twoFactorChannels(env);
  return c.telegram || c.email;
}

/* ---------- crypto primitives ---------- */
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqualStr(a, b) {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let d = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) d |= (x[i % (x.length || 1)] || 0) ^ (y[i % (y.length || 1)] || 0);
  return d === 0;
}

export function base32Decode(input) {
  const clean = String(input || '').toUpperCase().replace(/[\s=-]+/g, '');
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alpha.indexOf(ch);
    if (idx < 0) throw new Error('Invalid Base32 secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

export async function hotp(secretBytes, counter, digits = 6) {
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % (10 ** digits)).padStart(digits, '0');
}

export async function totpCode(secretBase32, nowMs = Date.now(), stepSeconds = 30) {
  return hotp(base32Decode(secretBase32), Math.floor(nowMs / 1000 / stepSeconds));
}

// ±1 step (30 s) drift tolerance.
export async function verifyTotp(secretBase32, code, nowMs = Date.now(), window = 1) {
  const c = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(c) || !String(secretBase32 || '').trim()) return false;
  let secret;
  try { secret = base32Decode(secretBase32); } catch (_) { return false; }
  const step = Math.floor(nowMs / 1000 / 30);
  let ok = false;
  for (let w = -window; w <= window; w++) {
    if (timingSafeEqualStr(await hotp(secret, step + w), c)) ok = true;
  }
  return ok;
}

export function randomDigits(n = 6) {
  const out = new Uint32Array(n);
  crypto.getRandomValues(out);
  return Array.from(out).map(v => String(v % 10)).join('');
}

export function generateOtp() {
  // Rejection-free uniform 6-digit code from 32-bit randomness.
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 1000000) * 1000000;
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return String(v % 1000000).padStart(6, '0');
}

export function generateBackupCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes).map(b => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join('');
  return chars.slice(0, 4) + '-' + chars.slice(4);
}

export function normalizeBackupCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : '';
}

/* ---------- D1 schema ---------- */
export async function ensureTwoFactorTables(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_otps (
      user_id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_backup_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code_hash TEXT UNIQUE NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    )`)
  ]);
}

/* ---------- push OTP ---------- */
export async function issueOtp(env, userId, nowSec = Math.floor(Date.now() / 1000)) {
  await ensureTwoFactorTables(env);
  const prev = await env.DB.prepare('SELECT created_at FROM admin_otps WHERE user_id = ?').bind(String(userId)).first();
  if (prev && nowSec - Number(prev.created_at) < OTP_RESEND_SECONDS) {
    return { ok: false, retryAfter: OTP_RESEND_SECONDS - (nowSec - Number(prev.created_at)) };
  }
  const code = generateOtp();
  const hash = await sha256Hex(`${userId}:${code}`);
  await env.DB.prepare(
    `INSERT INTO admin_otps (user_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`
  ).bind(String(userId), hash, nowSec + OTP_TTL_SECONDS, nowSec).run();
  return { ok: true, code };
}

export async function verifyOtp(env, userId, code, nowSec = Math.floor(Date.now() / 1000)) {
  const c = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  await ensureTwoFactorTables(env);
  const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM admin_otps WHERE user_id = ?').bind(String(userId)).first();
  if (!row) return false;
  if (Number(row.expires_at) < nowSec || Number(row.attempts) >= OTP_MAX_ATTEMPTS) {
    await env.DB.prepare('DELETE FROM admin_otps WHERE user_id = ?').bind(String(userId)).run();
    return false;
  }
  const hash = await sha256Hex(`${userId}:${c}`);
  if (timingSafeEqualStr(hash, row.code_hash)) {
    await env.DB.prepare('DELETE FROM admin_otps WHERE user_id = ?').bind(String(userId)).run(); // single use
    return true;
  }
  await env.DB.prepare('UPDATE admin_otps SET attempts = attempts + 1 WHERE user_id = ?').bind(String(userId)).run();
  return false;
}

export async function deliverOtp(env, code, fetchImpl = fetch) {
  const sent = [];
  const text = `CS Odisha admin sign-in code: ${code}\nValid for 10 minutes. If this wasn't you, change your password.`;
  if (env.ADMIN_TG_BOT_TOKEN && env.ADMIN_TG_CHAT_ID) {
    try {
      const r = await fetchImpl(`https://api.telegram.org/bot${env.ADMIN_TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.ADMIN_TG_CHAT_ID, text })
      });
      if (r.ok) sent.push('telegram');
    } catch (_) {}
  }
  const to = String(env.ADMIN_2FA_EMAIL || '').trim();
  // Telegram first; email is used as a fallback (or in addition when Telegram failed / isn't set).
  if (to && !sent.includes('telegram')) {
    const from = env.EMAIL_FROM || 'Common Sense Odisha <onboarding@resend.dev>';
    try {
      if (env.RESEND_API_KEY) {
        const r = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [to], subject: 'Your CS Odisha admin sign-in code', text })
        });
        if (r.ok) sent.push('email');
      } else {
        const fromEmail = (/<([^>]+)>/.exec(from) || [null, from])[1];
        const r = await fetchImpl('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: 'Common Sense Odisha' },
            subject: 'Your CS Odisha admin sign-in code',
            content: [{ type: 'text/plain', value: text }]
          })
        });
        if (r.ok || r.status === 202) sent.push('email');
      }
    } catch (_) {}
  }
  return sent;
}

/* ---------- backup codes ---------- */
export async function generateBackupCodes(env) {
  await ensureTwoFactorTables(env);
  const codes = [];
  while (codes.length < BACKUP_CODE_COUNT) {
    const c = generateBackupCode();
    if (!codes.includes(c)) codes.push(c);
  }
  const hashes = await Promise.all(codes.map(sha256Hex));
  const stmts = [env.DB.prepare('DELETE FROM admin_backup_codes')]
    .concat(hashes.map(h => env.DB.prepare("INSERT INTO admin_backup_codes (code_hash, used_at, created_at) VALUES (?, NULL, datetime('now'))").bind(h)));
  await env.DB.batch(stmts);
  return codes;
}

export async function backupCodeStatus(env) {
  await ensureTwoFactorTables(env);
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_backup_codes WHERE used_at IS NULL').first();
  const tot = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_backup_codes').first();
  return { remaining: Number(row && row.n) || 0, total: Number(tot && tot.n) || 0 };
}

// Atomic single-use consumption: the UPDATE only succeeds while used_at IS NULL.
export async function consumeBackupCode(env, raw) {
  const code = normalizeBackupCode(raw);
  if (!code) return false;
  await ensureTwoFactorTables(env);
  const hash = await sha256Hex(code);
  const res = await env.DB.prepare("UPDATE admin_backup_codes SET used_at = datetime('now') WHERE code_hash = ? AND used_at IS NULL").bind(hash).run();
  const changes = res && res.meta ? res.meta.changes : res && res.changes;
  return Number(changes) > 0;
}

/* ---------- combined verifier used at login ---------- */
export async function verifyTwoFactor(env, userId, submitted, nowMs = Date.now()) {
  const code = String(submitted || '').trim();
  if (!code) return false;
  const ch = twoFactorChannels(env);
  if (/^\d{6}$/.test(code.replace(/\s+/g, ''))) {
    if (ch.totp && await verifyTotp(env.ADMIN_TOTP_SECRET, code, nowMs)) return true;
    if ((ch.telegram || ch.email) && await verifyOtp(env, userId, code, Math.floor(nowMs / 1000))) return true;
    return false;
  }
  return consumeBackupCode(env, code);
}
