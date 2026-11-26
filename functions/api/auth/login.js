/**
 * Cloudflare Pages Functions — Hardened Login Edge Handler
 * Route: POST /api/auth/login
 */

import {
  CORS_HEADERS,
  jsonResponse,
  generateSalt,
  hashPassword,
  checkRateLimit,
  createSession,
  buildSessionCookie,
  constantTimeEqual,
  findAuthUserByIdentifier
} from './_utils.js';
import { hasAccountTotpEnabled, verifyAccountTotpOrRecovery } from '../admin/totp.js';
import { isTwoFactorConfigured, canSendOtp, verifyTwoFactor } from '../../_lib/admin-2fa.js';
import { isAdminEmailOtpEnabled, createAndSendAdminEmailOtp } from '../../_lib/admin-email-otp.js';
import { recordAdminAuditLog } from '../admin/system-ops.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown-ip';

    // Rate limiting: 10 attempts per 15 min per client IP
    const rateCheck = checkRateLimit(`login_${clientIP}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return jsonResponse({
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      }, 429, { 'Retry-After': String(rateCheck.retryAfter) });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const rawIdentifier = body.identifier || body.userId || body.username || body.email;
    const password = body.password;

    if (!rawIdentifier || !password) {
      return jsonResponse({
        success: false,
        error: 'Please enter your Email / User ID and password.'
      }, 400);
    }

    // Input sanitization: Trim and normalize identifier to lowercase
    const cleanEmail = String(rawIdentifier).trim().toLowerCase();
    const passStr = String(password);
    const nowUnix = Math.floor(Date.now() / 1000);

    // Simulated sandbox mode if D1 is not bound
    if (!env || !env.DB) {
      const fallbackId = 'cso_usr_' + Date.now().toString(36);
      return jsonResponse({
        success: true,
        mode: 'edge_simulated',
        candidate: {
          id: fallbackId,
          email: cleanEmail,
          fullName: 'Candidate Aspirant',
          district: 'Balasore (Baleswar)',
          targetStreams: ['opsc', 'ossc']
        }
      });
    }

    // 1. Look up user record by Email, User ID, or Username (from users or candidates table)
    const { userRecord, candidateMeta } = await findAuthUserByIdentifier(env, cleanEmail);

    // Timing-attack defense:
    // If the user does not exist in D1, run a dummy PBKDF2 derivation with identical 100,000 iteration count
    // before returning 401 Unauthorized
    if (!userRecord) {
      const dummySalt = generateSalt();
      await hashPassword(passStr, dummySalt, 100000);
      return jsonResponse({
        success: false,
        error: 'Invalid User ID / email or password.'
      }, 401);
    }

    const acctStatus = String(userRecord.status || 'active').toLowerCase();
    if (acctStatus === 'blocked' || acctStatus === 'suspended' || acctStatus === 'banned') {
      return jsonResponse({
        success: false,
        error: `Your account is currently ${acctStatus}. Please contact support.`
      }, 403);
    }

    // Brute-force & lockout protection:
    // Check lockout_until
    if (userRecord.lockout_until && userRecord.lockout_until > nowUnix) {
      const remainingSeconds = userRecord.lockout_until - nowUnix;
      return jsonResponse({
        success: false,
        error: 'Account temporarily locked due to multiple failed login attempts. Please try again later.'
      }, 429, { 'Retry-After': String(remainingSeconds) });
    }

    // Guard Google-only accounts or missing salt/hash
    if (!userRecord.salt || !userRecord.password_hash || String(userRecord.password_hash).startsWith('oauth_disabled_')) {
      return jsonResponse({
        success: false,
        error: 'This account uses Google Sign-In. Please click "Continue with Google" or use Forgot Password to set a password.'
      }, 401);
    }

    // Password verification with matching salt and 100,000 iterations (Cloudflare Workers Web Crypto limit)
    const computedHash100k = await hashPassword(passStr, userRecord.salt, 100000);
    const isMatch = constantTimeEqual(computedHash100k, userRecord.password_hash);

    // On failed password match:
    if (!isMatch) {
      const newAttempts = (userRecord.failed_attempts || 0) + 1;
      let newLockout = 0;
      if (newAttempts >= 5) {
        newLockout = nowUnix + (15 * 60); // Lockout for 15 minutes
      }

      await env.DB.batch([
        env.DB.prepare(`
          UPDATE users SET failed_attempts = ?, lockout_until = ?, updated_at = ? WHERE id = ?
        `).bind(newAttempts, newLockout, nowUnix, userRecord.id),
        env.DB.prepare(`
          UPDATE candidates SET failed_attempts = ?, lockout_until = ? WHERE id = ?
        `).bind(newAttempts, newLockout, userRecord.id)
      ]).catch(() => {});

      return jsonResponse({
        success: false,
        error: 'Invalid email or password'
      }, 401);
    }

    // Staff Email OTP + 2FA gate (v315):
    const userRole = userRecord.role || 'candidate';
    if (userRole === 'admin' || userRole === 'editor') {
      if (await isAdminEmailOtpEnabled(env)) {
        const challenge = await createAndSendAdminEmailOtp(env, userRecord, request);
        await recordAdminAuditLog(env, request, { userId: userRecord.id, email: userRecord.email, role: userRole }, 'admin.email_otp.sent', 'admin_email_otps', { challenge_id: challenge.challenge_id });
        return jsonResponse({
          ok: true,
          success: true,
          requires_email_otp: true,
          challenge_id: challenge.challenge_id,
          masked_email: challenge.masked_email,
          expires_in: challenge.expires_in,
          resend_after: challenge.resend_after
        }, 200);
      }

      const accountTotp = await hasAccountTotpEnabled(env, userRecord.id);
      const envTwoFa = isTwoFactorConfigured(env);
      if (accountTotp || envTwoFa) {
        const submitted = String(body.twofa_code || body.totp_code || '').trim().slice(0, 24);
        if (!submitted) {
          await recordAdminAuditLog(env, request, { userId: userRecord.id, email: userRecord.email, role: userRole }, 'admin.2fa.challenge_required', 'admin_totp_credentials', { totp_enabled: accountTotp });
          return jsonResponse({
            success: false,
            error: 'Enter your 6-digit Authenticator (TOTP) code or an 8-character recovery code.',
            requires_2fa: true,
            totp_enabled: accountTotp,
            can_send_otp: canSendOtp(env)
          }, 401);
        }
        let verified = null;
        if (accountTotp) {
          const accRes = await verifyAccountTotpOrRecovery(env, userRecord.id, submitted);
          if (accRes.ok) verified = accRes;
        }
        if (!verified && envTwoFa) {
          const envOk = await verifyTwoFactor(env, userRecord.id, submitted);
          if (envOk) verified = { ok: true, method: 'env_2fa' };
        }
        if (!verified) {
          await recordAdminAuditLog(env, request, { userId: userRecord.id, email: userRecord.email, role: userRole }, 'admin.2fa.failed', 'admin_totp_credentials', { email: userRecord.email });
          return jsonResponse({
            success: false,
            error: 'Invalid or expired 2FA / recovery code.',
            requires_2fa: true,
            totp_enabled: accountTotp,
            can_send_otp: canSendOtp(env)
          }, 401);
        }
        await recordAdminAuditLog(env, request, { userId: userRecord.id, email: userRecord.email, role: userRole }, 'admin.2fa.verified', 'admin_totp_credentials', { email: userRecord.email, method: verified.method });
      }
    }

    // On successful match: Reset failed_attempts to 0 and lockout_until to 0
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE users SET failed_attempts = 0, lockout_until = 0, updated_at = ? WHERE id = ?
      `).bind(nowUnix, userRecord.id),
      env.DB.prepare(`
        UPDATE candidates SET failed_attempts = 0, lockout_until = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(userRecord.id)
    ]).catch(() => {});

    // Create an active server session (opaque 256-bit token, 30-day TTL)
    const { token: sessionToken } = await createSession(env, {
      userId: userRecord.id,
      email: userRecord.email,
      role: userRole
    });

    // Issue Secure, HttpOnly, SameSite=Lax cookie (30-day session)
    const cookieHeader = buildSessionCookie(sessionToken);

    let targetStreams = ['opsc', 'ossc'];
    if (candidateMeta && candidateMeta.target_streams) {
      try { targetStreams = JSON.parse(candidateMeta.target_streams); } catch(e) {}
    }

    return jsonResponse({
      success: true,
      token: sessionToken,
      candidate: {
        id: userRecord.id,
        email: userRecord.email,
        fullName: candidateMeta ? (candidateMeta.full_name || 'Candidate Aspirant') : 'Candidate Aspirant',
        district: candidateMeta ? (candidateMeta.district || 'Balasore (Baleswar)') : 'Balasore (Baleswar)',
        targetStreams
      }
    }, 200, {
      'Set-Cookie': cookieHeader
    });

  } catch (error) {
    console.error('Login Edge Error:', error);
    return jsonResponse({
      success: false,
      error: 'An unexpected authentication error occurred.'
    }, 500);
  }
}
