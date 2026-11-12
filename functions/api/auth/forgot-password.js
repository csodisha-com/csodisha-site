/**
 * Cloudflare Pages Functions — Forgot Password (dual-channel recovery request)
 * Route: POST /api/auth/forgot-password
 *
 * For an existing candidate this dispatches ONE email containing BOTH:
 *   Channel 1 — a 6-digit OTP to enter directly on the sign-in page
 *   Channel 2 — a one-click magic link (/reset-password.html?token=<token>)
 *
 * Security:
 *   - Anti-enumeration: the response is identical whether or not the email
 *     exists, and cooldown suppression silently skips the email instead of
 *     returning a distinguishable error.
 *   - Hashed at rest: only SHA-256 hashes of the OTP and link token are
 *     stored in D1 — never plaintext.
 *   - Rate limits: 60s cooldown per email + 5 requests per IP per 15 min.
 *   - Fixed 15-minute TTL; previous outstanding resets are invalidated.
 */

import {
  CORS_HEADERS,
  jsonResponse,
  checkRateLimit,
  normalizeEmail,
  EMAIL_REGEX
} from './_utils.js';
import {
  RESET_TTL_SECONDS,
  PER_EMAIL_COOLDOWN_SECONDS,
  IP_RATE_LIMIT_MAX,
  IP_RATE_LIMIT_WINDOW_MS,
  sha256Hex,
  generateResetOtp,
  generateResetToken,
  resetRowId,
  secondsSinceLastRequest,
  recoveryEmailHtml,
  recoveryEmailText
} from './_reset-utils.js';

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account exists for this email, a password recovery email has been sent with a 6-digit code and a one-click reset link.'
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env, ctx }) {
  try {
    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    // IP rate limit: 5 requests per 15 minutes (applies to everyone — the
    // IP is not email-derived, so this does not leak account existence).
    const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    const rate = checkRateLimit('forgot-pw:' + ip, IP_RATE_LIMIT_MAX, IP_RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      return jsonResponse({
        success: false,
        error: 'Too many recovery requests. Please try again later.'
      }, 429);
    }

    let body = {};
    try { body = await request.json(); } catch { /* treated as invalid below */ }

    const email = normalizeEmail(body.email);
    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse({ success: false, error: 'Please enter a valid email address.' }, 400);
    }

    // Anti-enumeration: unknown emails get the exact same generic success.
    const user = await env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
      return jsonResponse(GENERIC_SUCCESS, 200);
    }

    // Per-email cooldown: 60s. Suppression is silent (same generic response)
    // so cooldowns cannot be used to probe whether an account exists.
    const sinceLast = await secondsSinceLastRequest(env, user.id);
    if (sinceLast !== null && sinceLast < PER_EMAIL_COOLDOWN_SECONDS) {
      return jsonResponse(GENERIC_SUCCESS, 200);
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const expiresAt = nowUnix + RESET_TTL_SECONDS;

    // Channel secrets — stored only as SHA-256 hashes.
    const otpCode = generateResetOtp();
    const magicToken = generateResetToken();
    const [otpHash, tokenHash] = await Promise.all([
      sha256Hex(otpCode),
      sha256Hex(magicToken)
    ]);

    // Invalidate outstanding resets, then store the fresh dual-channel row.
    await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id).run();
    await env.DB.prepare(`
      INSERT INTO password_resets (id, user_id, token_hash, otp_hash, grant_hash, attempts, expires_at, used, ip_address, created_at)
      VALUES (?, ?, ?, ?, NULL, 0, ?, 0, ?, CURRENT_TIMESTAMP)
    `).bind(resetRowId(user.id), user.id, tokenHash, otpHash, expiresAt, ip).run();

    // Lazy pruning of expired reset rows in the background
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(
        env.DB.prepare('DELETE FROM password_resets WHERE expires_at < ?').bind(nowUnix).run().catch(() => {})
      );
    }

    // Compose and dispatch the dual-channel email.
    const appOrigin = env.APP_ORIGIN || new URL(request.url).origin;
    const magicLink = `${appOrigin}/reset-password.html?token=${magicToken}`;

    if (env.RESEND_API_KEY) {
      const fromAddress = env.EMAIL_FROM || 'Common Sense Odisha <onboarding@resend.dev>';
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: 'Reset Your Password - Common Sense Odisha',
          html: recoveryEmailHtml({ displayName: email.split('@')[0], otpCode, magicLink }),
          text: recoveryEmailText({ displayName: email.split('@')[0], otpCode, magicLink })
        })
      });

      if (!emailRes.ok) {
        const errData = await emailRes.text().catch(() => '');
        console.error('Password reset email dispatch failed:', emailRes.status, errData);
        // Do not leak delivery status details; the row stays valid so the
        // candidate can retry after the cooldown.
        return jsonResponse({
          success: false,
          error: 'Unable to send the recovery email right now. Please try again shortly.'
        }, 502);
      }
    }

    return jsonResponse(GENERIC_SUCCESS, 200);

  } catch (err) {
    console.error('Forgot Password Error:', err);
    return jsonResponse({ success: false, error: 'Unable to process the recovery request. Please try again.' }, 500);
  }
}
