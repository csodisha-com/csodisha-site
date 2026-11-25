// Folder #10 Backend (v312): Real Per-Admin RFC 6238 TOTP 2FA & Single-Use Hashed Recovery Codes.
// Zero external dependencies; uses Web Crypto API (HMAC-SHA1 TOTP, AES-256-GCM at-rest encryption, SHA-256 recovery hashes).
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import {
  verifyTotp,
  sha256Hex,
  timingSafeEqualStr,
  generateBackupCode,
  normalizeBackupCode,
  BACKUP_CODE_COUNT,
  isTwoFactorConfigured
} from '../../_lib/admin-2fa.js';
import { recordAdminAuditLog } from './system-ops.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_ISSUER = 'CS Odisha Admin';
let _schemaReadyDb = null;

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const clean = String(hex || '').trim();
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function generateBase32Secret(byteLen = 20) {
  const bytes = new Uint8Array(Math.max(16, Math.min(32, byteLen)));
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

export function buildOtpauthUri(email, secretBase32, issuer = TOTP_ISSUER) {
  const cleanIssuer = String(issuer || TOTP_ISSUER).trim();
  const cleanAccount = String(email || 'admin@csodisha.com').trim();
  const label = `${encodeURIComponent(cleanIssuer)}:${encodeURIComponent(cleanAccount)}`;
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secretBase32)}&issuer=${encodeURIComponent(cleanIssuer)}&algorithm=SHA1&digits=6&period=30`;
}

async function deriveAesKey(env) {
  const rawMaterial = String(
    (env && (env.TOTP_ENC_KEY || env.SESSION_SECRET || env.ADMIN_TOTP_SECRET)) || 'csodisha-admin-totp-v312-key'
  );
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawMaterial));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptTotpSecret(plainSecret, env) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await deriveAesKey(env);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(String(plainSecret || ''))
  );
  return `v1:${bytesToHex(iv)}:${bytesToHex(ct)}`;
}

export async function decryptTotpSecret(secretEnc, env) {
  const raw = String(secretEnc || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('v1:')) return raw;
  const parts = raw.split(':');
  if (parts.length !== 3) return '';
  const iv = hexToBytes(parts[1]);
  const ct = hexToBytes(parts[2]);
  const key = await deriveAesKey(env);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plainBuf);
}

export async function ensureAdminTotpSchema(db) {
  if (!db || _schemaReadyDb === db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS admin_totp_credentials (
        admin_id TEXT PRIMARY KEY,
        secret_enc TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 0,
        recovery_hashes_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_admin_totp_enabled ON admin_totp_credentials(enabled, updated_at DESC)'
    ).run();
    _schemaReadyDb = db;
  } catch {
    // Graceful skip if DB unavailable
  }
}

function parseHashes(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.length === 64) : [];
  } catch {
    return [];
  }
}

async function generateRecoveryBundle() {
  const codes = [];
  while (codes.length < BACKUP_CODE_COUNT) {
    const c = generateBackupCode();
    if (!codes.includes(c)) codes.push(c);
  }
  const hashes = await Promise.all(codes.map(c => sha256Hex(c)));
  return { codes, hashes };
}

/** Returns true if the given admin account has enabled per-account TOTP 2FA in D1. */
export async function hasAccountTotpEnabled(env, adminId) {
  if (!env || !env.DB || !adminId) return false;
  try {
    const row = await env.DB.prepare(
      'SELECT enabled, secret_enc FROM admin_totp_credentials WHERE admin_id = ?'
    ).bind(String(adminId)).first();
    return Boolean(row && Number(row.enabled) === 1 && String(row.secret_enc || '').trim());
  } catch {
    return false;
  }
}

/**
 * Verifies a 6-digit RFC 6238 TOTP code OR a single-use 8-character recovery code
 * against `admin_totp_credentials` for a specific admin account.
 */
export async function verifyAccountTotpOrRecovery(env, adminId, submittedCode, nowMs = Date.now()) {
  if (!env || !env.DB || !adminId) return { ok: false };
  const raw = String(submittedCode || '').trim();
  if (!raw) return { ok: false };
  try {
    const row = await env.DB.prepare(
      'SELECT secret_enc, enabled, recovery_hashes_json FROM admin_totp_credentials WHERE admin_id = ?'
    ).bind(String(adminId)).first();
    if (!row || Number(row.enabled) !== 1 || !row.secret_enc) return { ok: false };

    // 1. Check 6-digit RFC 6238 HMAC-SHA1 TOTP (±1 step drift tolerance)
    const digits = raw.replace(/\s+/g, '');
    if (/^\d{6}$/.test(digits)) {
      const secret = await decryptTotpSecret(row.secret_enc, env);
      if (secret && await verifyTotp(secret, digits, nowMs, 1)) {
        return { ok: true, method: 'totp' };
      }
    }

    // 2. Check single-use SHA-256 hashed backup recovery codes (XXXX-XXXX)
    const normCode = normalizeBackupCode(raw);
    if (normCode) {
      const hashes = parseHashes(row.recovery_hashes_json);
      if (hashes.length) {
        const candidateHash = await sha256Hex(normCode);
        let matchIdx = -1;
        for (let i = 0; i < hashes.length; i++) {
          if (timingSafeEqualStr(hashes[i], candidateHash)) {
            matchIdx = i;
          }
        }
        if (matchIdx !== -1) {
          const nextHashes = hashes.filter((_, idx) => idx !== matchIdx);
          await env.DB.prepare(
            `UPDATE admin_totp_credentials
             SET recovery_hashes_json = ?, updated_at = datetime('now')
             WHERE admin_id = ?`
          ).bind(JSON.stringify(nextHashes), String(adminId)).run();
          return { ok: true, method: 'recovery_code', remaining_recovery_codes: nextHashes.length };
        }
      }
    }

    return { ok: false };
  } catch (err) {
    console.error('verifyAccountTotpOrRecovery error:', err);
    return { ok: false };
  }
}

// ============================================================================
// ADMIN API: /api/admin/totp/*
// ============================================================================
export async function handleAdminTotpApi(request, env, actor, sub, ctx) {
  await ensureAdminTotpSchema(env.DB);
  const method = request.method;
  const adminId = String(actor.userId || actor.id || '');
  if (!adminId) throw new HttpError(401, 'UNAUTHORIZED', 'Staff identity required');

  const noStore = { 'Cache-Control': 'no-store' };

  // GET /api/admin/totp or /api/admin/totp/status
  if ((!sub || sub === 'status') && method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT secret_enc, enabled, recovery_hashes_json, updated_at FROM admin_totp_credentials WHERE admin_id = ?'
    ).bind(adminId).first();
    const enabled = Boolean(row && Number(row.enabled) === 1);
    const hasPending = Boolean(row && !enabled && String(row.secret_enc || '').trim());
    const hashes = row ? parseHashes(row.recovery_hashes_json) : [];
    return json({
      ok: true,
      admin_id: adminId,
      email: actor.email || '',
      issuer: TOTP_ISSUER,
      enabled,
      has_pending_secret: hasPending,
      recovery_codes_remaining: enabled ? hashes.length : 0,
      recovery_codes_total: BACKUP_CODE_COUNT,
      updated_at: row ? row.updated_at : null,
      env_totp_configured: isTwoFactorConfigured(env)
    }, 200, noStore);
  }

  // POST /api/admin/totp/setup — generate fresh 160-bit Base32 secret + otpauth:// URI
  if (sub === 'setup' && method === 'POST') {
    const existing = await env.DB.prepare(
      'SELECT enabled FROM admin_totp_credentials WHERE admin_id = ?'
    ).bind(adminId).first();
    if (existing && Number(existing.enabled) === 1) {
      throw new HttpError(409, 'TOTP_ALREADY_ENABLED', '2FA is already enabled on this account. Disable it first to enroll a new authenticator.');
    }

    const secret = generateBase32Secret(20);
    const secretEnc = await encryptTotpSecret(secret, env);
    const otpauthUri = buildOtpauthUri(actor.email || adminId, secret, TOTP_ISSUER);

    await env.DB.prepare(
      `INSERT INTO admin_totp_credentials (admin_id, secret_enc, enabled, recovery_hashes_json, updated_at)
       VALUES (?, ?, 0, '[]', datetime('now'))
       ON CONFLICT(admin_id) DO UPDATE SET
         secret_enc = excluded.secret_enc,
         enabled = 0,
         recovery_hashes_json = '[]',
         updated_at = datetime('now')`
    ).bind(adminId, secretEnc).run();

    recordAdminAuditLog(env, request, actor, 'admin.2fa.setup_initiated', adminId, { email: actor.email }, ctx);

    return json({
      ok: true,
      secret,
      otpauth_uri: otpauthUri,
      issuer: TOTP_ISSUER,
      account: actor.email || adminId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    }, 200, noStore);
  }

  // POST /api/admin/totp/enable (or verify / verify-enable) — verify 6-digit code, enable 2FA, issue 8 recovery codes
  if ((sub === 'enable' || sub === 'verify' || sub === 'verify-enable') && method === 'POST') {
    const body = await readJson(request, 8000);
    const code = String(body.code || body.totp_code || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      throw validationError({ code: 'Enter a valid 6-digit code from your authenticator app.' });
    }

    const row = await env.DB.prepare(
      'SELECT secret_enc, enabled FROM admin_totp_credentials WHERE admin_id = ?'
    ).bind(adminId).first();
    if (!row || !row.secret_enc) {
      throw new HttpError(400, 'TOTP_NOT_INITIALIZED', 'Start 2FA setup first before verifying a code.');
    }

    const plainSecret = await decryptTotpSecret(row.secret_enc, env);
    const valid = plainSecret ? await verifyTotp(plainSecret, code, Date.now(), 1) : false;
    if (!valid) {
      recordAdminAuditLog(env, request, actor, 'admin.2fa.enable_failed', adminId, { email: actor.email }, ctx);
      throw new HttpError(400, 'INVALID_TOTP_CODE', 'The 6-digit authenticator code is invalid or expired. Check your device clock and try again.');
    }

    const { codes, hashes } = await generateRecoveryBundle();
    await env.DB.prepare(
      `UPDATE admin_totp_credentials
       SET enabled = 1, recovery_hashes_json = ?, updated_at = datetime('now')
       WHERE admin_id = ?`
    ).bind(JSON.stringify(hashes), adminId).run();

    recordAdminAuditLog(env, request, actor, 'admin.2fa.enabled', adminId, { email: actor.email, recovery_codes: codes.length }, ctx);

    return json({
      ok: true,
      enabled: true,
      recovery_codes: codes,
      recovery_codes_remaining: codes.length
    }, 200, noStore);
  }

  // POST /api/admin/totp/recovery-codes — regenerate 8 single-use backup codes (requires current 6-digit TOTP)
  if (sub === 'recovery-codes' && method === 'POST') {
    const body = await readJson(request, 8000);
    const code = String(body.code || body.totp_code || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      throw validationError({ code: 'Enter your current 6-digit authenticator code to regenerate recovery codes.' });
    }

    const row = await env.DB.prepare(
      'SELECT secret_enc, enabled FROM admin_totp_credentials WHERE admin_id = ?'
    ).bind(adminId).first();
    if (!row || Number(row.enabled) !== 1 || !row.secret_enc) {
      throw new HttpError(400, 'TOTP_NOT_ENABLED', 'Enable TOTP 2FA before regenerating recovery codes.');
    }

    const plainSecret = await decryptTotpSecret(row.secret_enc, env);
    if (!plainSecret || !(await verifyTotp(plainSecret, code, Date.now(), 1))) {
      recordAdminAuditLog(env, request, actor, 'admin.2fa.recovery_regen_failed', adminId, { email: actor.email }, ctx);
      throw new HttpError(400, 'INVALID_TOTP_CODE', 'Invalid 6-digit authenticator code.');
    }

    const { codes, hashes } = await generateRecoveryBundle();
    await env.DB.prepare(
      `UPDATE admin_totp_credentials
       SET recovery_hashes_json = ?, updated_at = datetime('now')
       WHERE admin_id = ?`
    ).bind(JSON.stringify(hashes), adminId).run();

    recordAdminAuditLog(env, request, actor, 'admin.2fa.recovery_regenerated', adminId, { email: actor.email, count: codes.length }, ctx);

    return json({
      ok: true,
      recovery_codes: codes,
      recovery_codes_remaining: codes.length
    }, 200, noStore);
  }

  // POST /api/admin/totp/disable — disable 2FA (requires valid TOTP or recovery code)
  if (sub === 'disable' && method === 'POST') {
    const body = await readJson(request, 8000);
    const code = String(body.code || body.totp_code || '').trim();
    if (!code) {
      throw validationError({ code: 'Enter a valid 6-digit authenticator code or backup recovery code to disable 2FA.' });
    }

    const check = await verifyAccountTotpOrRecovery(env, adminId, code);
    if (!check.ok) {
      recordAdminAuditLog(env, request, actor, 'admin.2fa.disable_failed', adminId, { email: actor.email }, ctx);
      throw new HttpError(400, 'INVALID_2FA_CODE', 'Invalid authenticator or recovery code.');
    }

    await env.DB.prepare(
      `UPDATE admin_totp_credentials
       SET enabled = 0, secret_enc = '', recovery_hashes_json = '[]', updated_at = datetime('now')
       WHERE admin_id = ?`
    ).bind(adminId).run();

    recordAdminAuditLog(env, request, actor, 'admin.2fa.disabled', adminId, { email: actor.email, verified_via: check.method }, ctx);

    return json({ ok: true, enabled: false }, 200, noStore);
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown TOTP route');
}
