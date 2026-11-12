/**
 * Password Reset shared helpers — used by the forgot-password,
 * verify-reset-otp, reset-password and verify-reset-token endpoints.
 *
 * Security invariants:
 *   - OTP (6-digit), magic-link token (256-bit) and post-OTP reset grant
 *     are hashed with SHA-256 before storage; plaintext never persists.
 *   - Every channel is single-use (`used` flag) with a fixed 15-minute TTL.
 *   - At most 5 failed OTP attempts before the record is invalidated.
 */

import { bufToHex, generateOtpCode, generateSessionToken } from './_utils.js';

export const RESET_TTL_SECONDS = 15 * 60;      // fixed 15-minute TTL
export const MAX_OTP_ATTEMPTS = 5;             // failed OTP attempts before invalidation
export const PER_EMAIL_COOLDOWN_SECONDS = 60;  // minimum gap between recovery emails
export const IP_RATE_LIMIT_MAX = 5;            // requests per IP
export const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return bufToHex(digest);
}

export function generateResetOtp() {
  return generateOtpCode(); // unbiased 6-digit numeric OTP
}

// 256-bit one-click magic-link / grant token (hex-encoded).
export function generateResetToken() {
  return generateSessionToken();
}

export function resetRowId(userId) {
  // Unique per request: user id + random suffix keeps inserts conflict-free.
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'pwr_' + userId + '_' + bufToHex(bytes.buffer);
}

// The newest non-consumed, non-expired reset record for a candidate.
export async function findActiveReset(env, userId, nowUnix) {
  return env.DB.prepare(`
    SELECT id, token_hash, otp_hash, grant_hash, attempts, expires_at, used
    FROM password_resets
    WHERE user_id = ? AND used = 0 AND expires_at > ?
    ORDER BY expires_at DESC, created_at DESC
    LIMIT 1
  `).bind(userId, nowUnix).first();
}

// Seconds elapsed since the candidate's most recent reset request
// (null when there is no history — cooldown then does not apply).
export async function secondsSinceLastRequest(env, userId) {
  const row = await env.DB.prepare(`
    SELECT (strftime('%s','now') - strftime('%s', created_at)) AS age
    FROM password_resets
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(userId).first();
  if (!row || row.age === null || row.age === undefined) return null;
  return Number(row.age);
}

// Dual-channel recovery email: big 6-digit OTP + one-click magic link.
export function recoveryEmailHtml({ displayName, otpCode, magicLink }) {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:28px 24px;background:#0f172a;border:1px solid #1e293b;border-radius:12px;color:#f1f5f9;">
      <h2 style="color:#f8fafc;margin-top:0;font-size:22px;margin-bottom:8px;">Common Sense Odisha</h2>
      <p style="font-size:15px;line-height:1.5;">Namaskar <strong>${displayName}</strong>,</p>
      <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">
        We received a request to reset your candidate portal password. Use either recovery method below:
      </p>

      <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase;margin:0 0 8px;">Channel 1 — 6-digit OTP</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:6px;padding:16px 20px;background:#020617;border:2px dashed #0d9488;border-radius:10px;text-align:center;color:#2dd4bf;margin:0 0 8px;">
        ${otpCode}
      </div>
      <p style="font-size:12px;color:#64748b;margin:0 0 20px;">Enter this code on the sign-in page to set a new password without leaving the page.</p>

      <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase;margin:0 0 8px;">Channel 2 — One-click reset link</p>
      <div style="text-align:center;margin:8px 0 20px;">
        <a href="${magicLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:8px;font-size:14px;">
          Reset Password &rarr;
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.5;margin-bottom:0;">
        Both the code and the link expire in 15 minutes and can be used only once.
        If you did not request a password reset, you can safely ignore this email —
        your current password remains unchanged.
      </p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
      <p style="font-size:12px;color:#475569;margin-bottom:0;text-align:center;">
        Common Sense Odisha (csodisha.com) — Independent Candidate Workspace
      </p>
    </div>
  `;
}

export function recoveryEmailText({ displayName, otpCode, magicLink }) {
  return `Namaskar ${displayName},\n\nWe received a request to reset your candidate portal password.\n\nChannel 1 — 6-digit OTP: ${otpCode}\nEnter this code on the sign-in page to set a new password.\n\nChannel 2 — One-click reset link:\n${magicLink}\n\nBoth expire in 15 minutes and can be used only once. If you did not request this, ignore this email.\n\n— Common Sense Odisha`;
}

// Post-reset security alert email.
export function securityAlertEmailHtml({ displayName, ipAddress, timeLabel }) {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:28px 24px;background:#0f172a;border:1px solid #1e293b;border-radius:12px;color:#f1f5f9;">
      <h2 style="color:#f8fafc;margin-top:0;font-size:22px;margin-bottom:8px;">Security alert — password changed</h2>
      <p style="font-size:15px;line-height:1.5;">Namaskar <strong>${displayName}</strong>,</p>
      <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">
        The password for your Common Sense Odisha candidate account was just changed successfully.
      </p>
      <div style="background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px 18px;font-size:13px;color:#94a3b8;margin-bottom:20px;">
        <div><strong style="color:#f1f5f9;">When:</strong> ${timeLabel}</div>
        <div><strong style="color:#f1f5f9;">Request origin IP:</strong> ${ipAddress || 'unknown'}</div>
        <div><strong style="color:#f1f5f9;">Active sessions:</strong> all were signed out as a security precaution</div>
      </div>
      <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">
        If this was you, no action is needed — simply sign in with your new password.
        If you did <strong style="color:#fca5a5;">not</strong> authorise this change, please contact support immediately; your account may be at risk.
      </p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
      <p style="font-size:12px;color:#475569;margin-bottom:0;text-align:center;">
        Common Sense Odisha (csodisha.com) — Independent Candidate Workspace
      </p>
    </div>
  `;
}

export function securityAlertEmailText({ displayName, ipAddress, timeLabel }) {
  return `Namaskar ${displayName},\n\nYour Common Sense Odisha candidate account password was just changed successfully.\n\nWhen: ${timeLabel}\nRequest origin IP: ${ipAddress || 'unknown'}\nAll active sessions were signed out as a security precaution.\n\nIf this was you, no action is needed. If you did not authorise this change, contact support immediately.\n\n— Common Sense Odisha`;
}
