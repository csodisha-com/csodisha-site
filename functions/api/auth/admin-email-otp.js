/**
 * Admin Login Email OTP Endpoints (v315)
 *   POST /api/auth/admin-email-otp/verify
 *   POST /api/auth/admin-email-otp/resend
 */

import {
  jsonResponse,
  createSession,
  buildSessionCookie,
  createSessionToken,
  constantTimeEqual
} from './_utils.js';
import { verifyAdminEmailOtp, resendAdminEmailOtp } from '../../_lib/admin-email-otp.js';
import { hasAccountTotpEnabled, verifyAccountTotpOrRecovery } from '../admin/totp.js';
import { registerAdminSession, recordAdminAuditLog } from '../admin/system-ops.js';

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return JSON.parse(atob(b64 + pad));
  } catch (_e) {
    return null;
  }
}

async function verifyTotpBridgeToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const dataToSign = `${parts[0]}.${parts[1]}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (!constantTimeEqual(parts[2], expectedSig)) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.admin_id || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export async function handleAdminEmailOtpVerify({ request, env, ctx = null }) {
  try {
    const body = await request.json().catch(() => ({}));
    const challengeId = String(body.challenge_id || '').trim();
    const otp = String(body.otp || '').trim();
    const totpToken = String(body.totp_token || '').trim();
    const submittedTotp = String(body.totp_code || body.twofa_code || '').trim().slice(0, 24);
    const bridgeSecret = (env && (env.SESSION_SECRET || env.AUTH_SECRET)) || 'cso_email_otp_totp_bridge_2026';

    let adminId = null;
    let adminEmail = '';

    if (totpToken) {
      const bridgePayload = await verifyTotpBridgeToken(totpToken, bridgeSecret);
      if (!bridgePayload) {
        return jsonResponse({ ok: false, success: false, error: '2FA session expired. Please sign in again.' }, 401);
      }
      adminId = bridgePayload.admin_id;
      adminEmail = bridgePayload.email || '';
    } else {
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
      adminId = res.admin_id;
      adminEmail = res.email;
      await recordAdminAuditLog(
        env,
        request,
        { userId: adminId, email: adminEmail, role: 'admin' },
        'admin.email_otp.verified',
        'admin_email_otps',
        { challenge_id: challengeId },
        ctx
      ).catch(() => {});
    }

    const user = await env.DB.prepare(
      'SELECT id, email, role FROM users WHERE id = ? LIMIT 1'
    ).bind(adminId).first();
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return jsonResponse({ ok: false, success: false, error: 'Staff account not found.' }, 403);
    }

    const totpEnabled = await hasAccountTotpEnabled(env, user.id);
    if (totpEnabled) {
      const nextBridge = totpToken || await createSessionToken({
        admin_id: user.id,
        email: user.email,
        challenge_id: challengeId,
        exp: Math.floor(Date.now() / 1000) + 300
      }, bridgeSecret);

      if (!submittedTotp) {
        return jsonResponse({
          ok: true,
          success: false,
          requires_totp: true,
          totp_token: nextBridge
        }, 200);
      }

      const totpRes = await verifyAccountTotpOrRecovery(env, user.id, submittedTotp);
      if (!totpRes.ok) {
        await recordAdminAuditLog(
          env,
          request,
          { userId: user.id, email: user.email, role: user.role },
          'admin.2fa.failed',
          'admin_totp_credentials',
          { email: user.email },
          ctx
        ).catch(() => {});
        return jsonResponse({
          ok: false,
          success: false,
          requires_totp: true,
          totp_token: nextBridge,
          error: 'Invalid or expired Authenticator / recovery code.'
        }, 401);
      }
      await recordAdminAuditLog(
        env,
        request,
        { userId: user.id, email: user.email, role: user.role },
        'admin.2fa.verified',
        'admin_totp_credentials',
        { email: user.email, method: totpRes.method },
        ctx
      ).catch(() => {});
    }

    await env.DB.prepare(
      'UPDATE users SET failed_attempts = 0, lockout_until = 0 WHERE id = ?'
    ).bind(user.id).run().catch(() => {});

    const { token: sessionToken, expiresAt } = await createSession(env, {
      userId: user.id,
      email: user.email,
      role: user.role
    });
    const sessionCookie = buildSessionCookie(sessionToken);

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
      { role: user.role, email_otp: true },
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
