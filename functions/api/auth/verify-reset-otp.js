/**
 * Cloudflare Pages Functions — Reset OTP Verification (in-page recovery)
 * Route: POST /api/auth/verify-reset-otp
 *
 * Verifies the 6-digit recovery OTP without leaving the sign-in page.
 * On success the candidate is allowed to set a new password immediately:
 * the response carries a one-time `resetToken` (hashed into D1 as
 * grant_hash) that the reset-password endpoint accepts.
 *
 * Security:
 *   - Maximum 5 failed OTP attempts, then the reset record is invalidated
 *     and the candidate must request a fresh email.
 *   - Constant-time hash comparison; attempts counter persisted in D1.
 *   - Identical error message for unknown emails, expired, consumed and
 *     wrong-OTP cases (no enumeration signal).
 */

import {
  CORS_HEADERS,
  jsonResponse,
  normalizeEmail,
  EMAIL_REGEX,
  constantTimeEqual
} from './_utils.js';
import {
  MAX_OTP_ATTEMPTS,
  sha256Hex,
  generateResetToken,
  findActiveReset
} from './_reset-utils.js';

const GENERIC_INVALID = 'Invalid or expired verification code.';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    let body = {};
    try { body = await request.json(); } catch { /* treated as invalid below */ }

    const email = normalizeEmail(body.email);
    const otp = String(body.otp || '').trim();

    if (!EMAIL_REGEX.test(email) || !/^\d{6}$/.test(otp)) {
      return jsonResponse({ success: false, error: GENERIC_INVALID }, 400);
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    const reset = user ? await findActiveReset(env, user.id, nowUnix) : null;
    if (!user || !reset) {
      return jsonResponse({ success: false, error: GENERIC_INVALID }, 400);
    }

    // 5+ prior failures invalidate the record outright.
    if ((reset.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(reset.id).run();
      return jsonResponse({ success: false, error: GENERIC_INVALID, attemptsLeft: 0 }, 400);
    }

    const otpHash = await sha256Hex(otp);
    if (!constantTimeEqual(otpHash, reset.otp_hash)) {
      const attempts = (reset.attempts || 0) + 1;
      const invalidated = attempts >= MAX_OTP_ATTEMPTS ? 1 : 0;
      await env.DB.prepare(
        'UPDATE password_resets SET attempts = ?, used = ? WHERE id = ?'
      ).bind(attempts, invalidated, reset.id).run();

      return jsonResponse({
        success: false,
        error: GENERIC_INVALID,
        attemptsLeft: Math.max(0, MAX_OTP_ATTEMPTS - attempts)
      }, 400);
    }

    // OTP verified — mint the one-time reset grant (hash stored, plaintext
    // returned to the verified client only).
    const grantToken = generateResetToken();
    const grantHash = await sha256Hex(grantToken);
    await env.DB.prepare(
      'UPDATE password_resets SET grant_hash = ? WHERE id = ?'
    ).bind(grantHash, reset.id).run();

    return jsonResponse({
      success: true,
      message: 'Code verified. You can now set a new password.',
      resetToken: grantToken,
      expiresIn: Math.max(0, (reset.expires_at || 0) - nowUnix)
    }, 200);

  } catch (err) {
    console.error('Verify Reset OTP Error:', err);
    return jsonResponse({ success: false, error: GENERIC_INVALID }, 500);
  }
}
