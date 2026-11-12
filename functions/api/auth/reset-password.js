/**
 * Cloudflare Pages Functions — Set New Password (consumes either channel)
 * Route: POST /api/auth/reset-password
 *
 * Body shapes:
 *   { token, password }              — magic-link channel
 *   { email, grant, password }       — in-page OTP channel (grant returned
 *                                      by /api/auth/verify-reset-otp)
 *
 * On success:
 *   - the reset record is consumed (single-use),
 *   - users + candidates credentials are replaced (fresh salt),
 *   - ALL active sessions for the candidate are revoked,
 *   - a security alert email confirms the change.
 */

import {
  CORS_HEADERS,
  jsonResponse,
  normalizeEmail,
  EMAIL_REGEX,
  generateSalt,
  hashPassword,
  validatePasswordStrength,
  constantTimeEqual
} from './_utils.js';
import {
  sha256Hex,
  findActiveReset,
  securityAlertEmailHtml,
  securityAlertEmailText
} from './_reset-utils.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    let body = {};
    try { body = await request.json(); } catch { /* handled below */ }

    const password = String(body.password || '');
    const magicToken = String(body.token || '').trim();
    const grant = String(body.grant || '').trim();
    const email = normalizeEmail(body.email);

    const nowUnix = Math.floor(Date.now() / 1000);

    // Resolve the reset record through whichever channel the client used.
    let reset = null;
    let user = null;

    if (magicToken) {
      const tokenHash = await sha256Hex(magicToken);
      reset = await env.DB.prepare(`
        SELECT id, user_id, attempts, expires_at, used
        FROM password_resets
        WHERE token_hash = ?
        ORDER BY expires_at DESC
        LIMIT 1
      `).bind(tokenHash).first();
    } else if (grant && EMAIL_REGEX.test(email)) {
      user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first();
      const active = user ? await findActiveReset(env, user.id, nowUnix) : null;
      const grantHash = await sha256Hex(grant);
      if (active && active.grant_hash && constantTimeEqual(grantHash, active.grant_hash)) {
        reset = active;
      }
    }

    if (!reset || reset.used) {
      return jsonResponse({
        success: false,
        error: 'This password reset link or code is invalid, expired or already used. Please request a new one.'
      }, 400);
    }
    if ((reset.expires_at || 0) <= nowUnix) {
      await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(reset.id).run();
      return jsonResponse({
        success: false,
        error: 'This password reset link or code is invalid, expired or already used. Please request a new one.'
      }, 400);
    }

    user = user || await env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(reset.user_id).first();

    if (!user) {
      return jsonResponse({
        success: false,
        error: 'This password reset link or code is invalid, expired or already used. Please request a new one.'
      }, 400);
    }

    // Password policy (same rules as registration; name context included).
    const profile = await env.DB.prepare(
      'SELECT full_name FROM candidates WHERE email = ?'
    ).bind(user.email).first();
    const policyError = validatePasswordStrength(password, {
      name: profile ? profile.full_name : '',
      email: user.email
    });
    if (policyError) {
      return jsonResponse({ success: false, error: policyError }, 400);
    }

    // Replace credentials (fresh salt) in users + legacy candidates tables.
    const newSalt = generateSalt();
    const newHash = await hashPassword(password, newSalt);

    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, salt = ?, failed_attempts = 0, lockout_until = 0, updated_at = ? WHERE id = ?'
    ).bind(newHash, newSalt, Math.floor(Date.now() / 1000), user.id).run();

    await env.DB.prepare(
      'UPDATE candidates SET password_hash = ?, salt = ?, failed_attempts = 0, lockout_until = 0 WHERE email = ?'
    ).bind(newHash, newSalt, user.email).run();

    // Consume the reset (single-use) and revoke ALL active sessions.
    await env.DB.batch([
      env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(reset.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id)
    ]);

    // Immediate post-reset security notification email.
    if (env.RESEND_API_KEY) {
      try {
        const ipAddress = request.headers.get('cf-connecting-ip') || 'unknown';
        const timeLabel = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        const displayName = profile ? profile.full_name : user.email.split('@')[0];
        const fromAddress = env.EMAIL_FROM || 'Common Sense Odisha <onboarding@resend.dev>';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [user.email],
            subject: 'Security Alert: Your Password Was Changed - Common Sense Odisha',
            html: securityAlertEmailHtml({ displayName, ipAddress, timeLabel }),
            text: securityAlertEmailText({ displayName, ipAddress, timeLabel })
          })
        });
      } catch (err) {
        // The reset itself succeeded — alert delivery must not fail it.
        console.error('Security alert email dispatch failed:', err);
      }
    }

    return jsonResponse({
      success: true,
      message: 'Password reset successfully. Please sign in with your new credentials.'
    }, 200);

  } catch (err) {
    console.error('Reset Password Error:', err);
    return jsonResponse({ success: false, error: 'Unable to reset the password. Please try again.' }, 500);
  }
}
