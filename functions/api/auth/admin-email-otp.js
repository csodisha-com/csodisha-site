/**
 * Admin Login Email OTP Endpoints (v317)
 *   POST /api/auth/admin-email-otp/verify
 *   POST /api/auth/admin-email-otp/resend
 *
 * Once the 6-digit Email OTP is verified, TOTP 2FA is skipped and the
 * admin session is issued immediately.
 */

import {
  jsonResponse,
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS
} from './_utils.js';
import { verifyAdminEmailOtp, resendAdminEmailOtp } from '../../_lib/admin-email-otp.js';
import { registerAdminSession, recordAdminAuditLog } from '../admin/system-ops.js';

function buildStrictAdminSessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export async function handleAdminEmailOtpVerify({ request, env, ctx = null }) {
  try {
    const body = await request.json().catch(() => ({}));
    const challengeId = String(body.challenge_id || '').trim();
    const otp = String(body.otp || '').trim();

    const res = await verifyAdminEmailOtp(env, challengeId, otp);
    if (!res.ok) {
      await recordAdminAuditLog(
        env,
        request,
        { userId: 'unknown', email: '', role: 'admin' },
        'admin.email_otp.failed',
        'admin_email_otps',
        { challenge_id: challengeId, locked: Boolean(res.locked) },
        ctx
      ).catch(() => {});
      return jsonResponse({
        ok: false,
        success: false,
        error: res.error,
        locked: Boolean(res.locked)
      }, 401);
    }

    const user = await env.DB.prepare(
      'SELECT id, email, role FROM users WHERE id = ? LIMIT 1'
    ).bind(res.admin_id).first();
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return jsonResponse({ ok: false, success: false, error: 'Staff account not found.' }, 403);
    }

    await recordAdminAuditLog(
      env,
      request,
      { userId: user.id, email: user.email, role: user.role },
      'admin.email_otp.verified',
      'admin_email_otps',
      { challenge_id: challengeId, totp_skipped: true },
      ctx
    ).catch(() => {});

    await env.DB.prepare(
      'UPDATE users SET failed_attempts = 0, lockout_until = 0 WHERE id = ?'
    ).bind(user.id).run().catch(() => {});

    const { token: sessionToken, expiresAt } = await createSession(env, {
      userId: user.id,
      email: user.email,
      role: user.role
    });
    const sessionCookie = buildStrictAdminSessionCookie(sessionToken);

    registerAdminSession(env, request, {
      token: sessionToken,
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt
    }, ctx);
    recordAdminAuditLog(
      env,
      request,
      { userId: user.id, email: user.email, role: user.role },
      'admin.login',
      'admin_sessions',
      { role: user.role, email_otp: true, totp_skipped: true },
      ctx
    );

    return jsonResponse({
      ok: true,
      success: true,
      redirect: '/admin/#command-overview'
    }, 200, {
      'Set-Cookie': sessionCookie
    });
  } catch (err) {
    console.error('Admin email OTP verify error:', err);
    return jsonResponse({ ok: false, success: false, error: 'Verification failed.' }, 500);
  }
}

export async function handleAdminEmailOtpResend({ request, env, ctx = null }) {
  try {
    const body = await request.json().catch(() => ({}));
    const challengeId = String(body.challenge_id || '').trim();
    const res = await resendAdminEmailOtp(env, challengeId, request);
    if (!res.ok) {
      const extra = res.retry_after ? { 'Retry-After': String(res.retry_after) } : {};
      return jsonResponse({
        ok: false,
        success: false,
        error: res.error,
        retry_after: res.retry_after
      }, res.status || 400, extra);
    }

    await recordAdminAuditLog(
      env,
      request,
      { userId: res.admin_id, email: res.email, role: 'admin' },
      'admin.email_otp.sent',
      'admin_email_otps',
      { challenge_id: res.challenge_id, resend: true },
      ctx
    ).catch(() => {});

    return jsonResponse({
      ok: true,
      challenge_id: res.challenge_id,
      masked_email: res.masked_email,
      expires_in: res.expires_in,
      resend_after: res.resend_after
    });
  } catch (err) {
    console.error('Admin email OTP resend error:', err);
    return jsonResponse({ ok: false, success: false, error: 'Could not resend verification code.' }, 500);
  }
}
