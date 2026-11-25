/**
 * Admin Login Email OTP Verification Service (v315)
 * Uses native fetch() against Resend (primary) or Brevo (secondary fallback).
 * Zero external npm packages. Strict anti-lockout protection when no provider key is bound.
 */

import { bufToHex, constantTimeEqual, generateOtpCode } from '../api/auth/_utils.js';

const OTP_TTL_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

let _schemaReadyDb = null;

export async function ensureAdminEmailOtpSchema(env) {
  if (!env || !env.DB) return;
  if (_schemaReadyDb === env.DB) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS admin_email_otps (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        email TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        consumed INTEGER NOT NULL DEFAULT 0,
        ip_address TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_admin_email_otps_lookup
       ON admin_email_otps(admin_id, consumed, expires_at)`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_admin_email_otps_expires
       ON admin_email_otps(expires_at)`
    )
  ]);
  _schemaReadyDb = env.DB;
}

export function hasEmailProviderSecret(env) {
  if (!env) return false;
  const resend = env.RESEND_API_KEY ? String(env.RESEND_API_KEY).trim() : '';
  const brevo = env.BREVO_API_KEY ? String(env.BREVO_API_KEY).trim() : '';
  return Boolean(resend || brevo);
}

export function getEmailProviderName(env) {
  if (env && env.RESEND_API_KEY && String(env.RESEND_API_KEY).trim()) return 'resend';
  if (env && env.BREVO_API_KEY && String(env.BREVO_API_KEY).trim()) return 'brevo';
  return null;
}

export async function isAdminEmailOtpFlagEnabled(env) {
  if (!env || !env.DB) return true;
  try {
    const row = await env.DB.prepare(
      "SELECT enabled FROM feature_flags WHERE key = 'admin_email_otp_enabled' LIMIT 1"
    ).first();
    if (!row) return true;
    return Number(row.enabled) === 1;
  } catch (_e) {
    return true;
  }
}

export async function isAdminEmailOtpEnabled(env) {
  if (!hasEmailProviderSecret(env)) return false;
  return await isAdminEmailOtpFlagEnabled(env);
}

export function maskEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 0) return '***';
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

export async function hashOtpChallenge(challengeId, otp) {
  const raw = `${String(challengeId)}:${String(otp)}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return bufToHex(digest);
}

function getClientIp(request) {
  if (!request || !request.headers) return 'unknown';
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown'
  ).split(',')[0].trim();
}

export async function sendAdminOtpEmail(env, { toEmail, otp, ipAddress, timestampIso }) {
  const resendKey = env && env.RESEND_API_KEY ? String(env.RESEND_API_KEY).trim() : '';
  const brevoKey = env && env.BREVO_API_KEY ? String(env.BREVO_API_KEY).trim() : '';
  if (!resendKey && !brevoKey) {
    throw new Error('No email provider API key (RESEND_API_KEY or BREVO_API_KEY) is configured.');
  }

  const subject = `CS Odisha Admin Verification Code: ${otp}`;
  const textBody = [
    'Common Sense Odisha — Admin Security Verification',
    '',
    `Your 6-digit verification code is: ${otp}`,
    '',
    'This code expires in 5 minutes and can only be used once.',
    `Request IP: ${ipAddress || 'unknown'}`,
    `Timestamp: ${timestampIso}`,
    '',
    'If you did not attempt to sign in to CS Odisha Admin Studio, change your password immediately.'
  ].join('\n');

  const htmlBody = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;">',
    '<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">CS Odisha Admin Verification</h2>',
    '<p style="margin:0 0 16px;font-size:14px;color:#475569;">Use the 6-digit code below to complete your Admin Studio sign-in. This code expires in <strong>5 minutes</strong>.</p>',
    `<div style="margin:16px 0;padding:14px 18px;border-radius:10px;background:#f8fafc;border:1px solid #cbd5e1;font-size:28px;font-weight:700;letter-spacing:0.25em;text-align:center;color:#0f172a;">${otp}</div>`,
    `<p style="margin:16px 0 4px;font-size:12px;color:#64748b;">Request IP: ${ipAddress || 'unknown'}</p>`,
    `<p style="margin:0 0 12px;font-size:12px;color:#64748b;">Timestamp: ${timestampIso}</p>`,
    '<p style="margin:0;font-size:12px;color:#64748b;">If you did not initiate this login, secure your account immediately.</p>',
    '</div>'
  ].join('');

  if (resendKey) {
    const fromAddr = (env.ADMIN_OTP_FROM_EMAIL && String(env.ADMIN_OTP_FROM_EMAIL).trim()) ||
      'Common Sense Odisha Security <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [toEmail],
        subject,
        html: htmlBody,
        text: textBody
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Resend email delivery failed (${res.status}): ${errText.slice(0, 180)}`);
    }
    return { provider: 'resend' };
  }

  const fromRaw = (env.ADMIN_OTP_FROM_EMAIL && String(env.ADMIN_OTP_FROM_EMAIL).trim()) || 'security@csodisha.com';
  const emailMatch = fromRaw.match(/<([^>]+)>/);
  const senderEmail = emailMatch ? emailMatch[1].trim() : fromRaw;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Common Sense Odisha Security', email: senderEmail },
      to: [{ email: toEmail }],
      subject,
      htmlContent: htmlBody,
      textContent: textBody
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Brevo email delivery failed (${res.status}): ${errText.slice(0, 180)}`);
  }
  return { provider: 'brevo' };
}

export async function createAndSendAdminEmailOtp(env, adminUser, request) {
  await ensureAdminEmailOtpSchema(env);
  const adminId = String(adminUser.id);
  const cleanEmail = String(adminUser.email || '').trim().toLowerCase();
  const challengeId = crypto.randomUUID();
  const otp = generateOtpCode();
  const otpHash = await hashOtpChallenge(challengeId, otp);
  const nowMs = Date.now();
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + OTP_TTL_SECONDS * 1000).toISOString();
  const ipAddress = getClientIp(request);

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE admin_email_otps SET consumed = 1 WHERE admin_id = ? AND consumed = 0'
    ).bind(adminId),
    env.DB.prepare(
      `INSERT INTO admin_email_otps (id, admin_id, email, otp_hash, attempts, consumed, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`
    ).bind(challengeId, adminId, cleanEmail, otpHash, ipAddress, expiresAt, createdAt)
  ]);

  await sendAdminOtpEmail(env, {
    toEmail: cleanEmail,
    otp,
    ipAddress,
    timestampIso: createdAt
  });

  return {
    challenge_id: challengeId,
    masked_email: maskEmail(cleanEmail),
    expires_in: OTP_TTL_SECONDS,
    resend_after: RESEND_COOLDOWN_SECONDS
  };
}

export async function verifyAdminEmailOtp(env, challengeId, code) {
  await ensureAdminEmailOtpSchema(env);
  const cid = String(challengeId || '').trim();
  const cleanCode = String(code || '').trim();
  if (!cid || !/^\d{6}$/.test(cleanCode)) {
    return { ok: false, error: 'Enter a valid 6-digit email verification code.' };
  }

  const row = await env.DB.prepare(
    'SELECT id, admin_id, email, otp_hash, attempts, consumed, expires_at FROM admin_email_otps WHERE id = ? LIMIT 1'
  ).bind(cid).first();

  if (!row) {
    return { ok: false, error: 'Invalid or expired verification challenge.' };
  }
  if (Number(row.consumed) === 1) {
    return { ok: false, error: 'Verification code already used or locked. Please sign in again.' };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: 'Verification code has expired. Please request a new code.' };
  }
  if (Number(row.attempts) >= MAX_OTP_ATTEMPTS) {
    return { ok: false, locked: true, error: 'Too many failed attempts (5/5). Please sign in again.' };
  }

  const expectedHash = await hashOtpChallenge(cid, cleanCode);
  if (!constantTimeEqual(expectedHash, row.otp_hash)) {
    const nextAttempts = Number(row.attempts) + 1;
    const locked = nextAttempts >= MAX_OTP_ATTEMPTS;
    await env.DB.prepare(
      `UPDATE admin_email_otps
       SET attempts = ?,
           consumed = CASE WHEN ? >= ${MAX_OTP_ATTEMPTS} THEN 1 ELSE consumed END
       WHERE id = ?`
    ).bind(nextAttempts, nextAttempts, cid).run();
    return {
      ok: false,
      attempts: nextAttempts,
      locked,
      error: locked
        ? 'Too many failed attempts (5/5). Challenge locked — please sign in again.'
        : `Incorrect verification code (${MAX_OTP_ATTEMPTS - nextAttempts} attempt(s) remaining).`
    };
  }

  await env.DB.prepare(
    'UPDATE admin_email_otps SET consumed = 1 WHERE id = ?'
  ).bind(cid).run();

  return { ok: true, admin_id: row.admin_id, email: row.email };
}

export async function resendAdminEmailOtp(env, challengeId, request) {
  await ensureAdminEmailOtpSchema(env);
  const cid = String(challengeId || '').trim();
  if (!cid) {
    return { ok: false, status: 400, error: 'Missing verification challenge ID.' };
  }
  const row = await env.DB.prepare(
    'SELECT id, admin_id, email, attempts, consumed, created_at FROM admin_email_otps WHERE id = ? LIMIT 1'
  ).bind(cid).first();

  if (!row || Number(row.consumed) === 1 || Number(row.attempts) >= MAX_OTP_ATTEMPTS) {
    return { ok: false, status: 400, error: 'Verification challenge is no longer active. Please sign in again.' };
  }

  const createdMs = new Date(row.created_at).getTime();
  const elapsedSec = Math.floor((Date.now() - createdMs) / 1000);
  if (Number.isFinite(elapsedSec) && elapsedSec < RESEND_COOLDOWN_SECONDS) {
    const waitSec = Math.max(1, RESEND_COOLDOWN_SECONDS - elapsedSec);
    return {
      ok: false,
      status: 429,
      retry_after: waitSec,
      error: `Please wait ${waitSec} seconds before requesting a new code.`
    };
  }

  const issued = await createAndSendAdminEmailOtp(env, { id: row.admin_id, email: row.email }, request);
  return { ok: true, admin_id: row.admin_id, email: row.email, ...issued };
}
