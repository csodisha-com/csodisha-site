/**
 * Cloudflare Pages / Worker Functions — OTP Email Verification Handler
 * Route: POST /api/auth/verify-otp
 *
 * On success the staged record is promoted into `users` + `candidates` and an
 * active server session is created atomically; the response carries the
 * session cookie and an explicit auto-login payload for the client.
 */

import {
  CORS_HEADERS,
  jsonResponse,
  constantTimeEqual,
  checkRateLimit,
  normalizeEmail,
  sanitizeTargetStreams,
  generateSessionToken,
  SESSION_TTL_SECONDS,
  buildSessionCookie
} from './_utils.js';

const MAX_OTP_ATTEMPTS = 5;
const OTP_RATE_LIMIT_MAX = 5;              // Max OTP verification attempts...
const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // ...per IP per 15 minutes

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost({ request, env }) {
  try {
    // Rate limiting: 5 OTP verification attempts per IP per 15 minutes
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown-ip';
    const rateCheck = checkRateLimit(`votp_${clientIP}`, OTP_RATE_LIMIT_MAX, OTP_RATE_LIMIT_WINDOW_MS);
    if (!rateCheck.allowed) {
      return jsonResponse({
        success: false,
        error: 'Too many verification attempts. Please try again later.'
      }, 429, { 'Retry-After': String(rateCheck.retryAfter) });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const { email, code, otp } = body;
    const otpCode = String(code || otp || '').trim();

    if (!email || !otpCode) {
      return jsonResponse({
        success: false,
        error: 'Email and verification code are required'
      }, 400);
    }

    const cleanEmail = normalizeEmail(email);
    const nowUnix = Math.floor(Date.now() / 1000);

    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    // Look up pending row in email_verifications
    const pending = await env.DB.prepare(`
      SELECT email, otp_code, token, password_hash, salt, candidate_data, attempts, expires_at
      FROM email_verifications
      WHERE LOWER(email) = ?
    `).bind(cleanEmail).first();

    if (!pending) {
      return jsonResponse({
        success: false,
        error: 'No pending registration found for this email. Please request a new code.'
      }, 400);
    }

    // Strict expiration: hard 15-minute TTL
    if ((pending.expires_at || 0) < nowUnix) {
      return jsonResponse({
        success: false,
        error: 'Verification code has expired. Please request a new code.'
      }, 400);
    }

    // Constant-time OTP comparison — no early-exit leak
    if (!constantTimeEqual(pending.otp_code, otpCode)) {
      const nextAttempts = (pending.attempts || 0) + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await env.DB.prepare('DELETE FROM email_verifications WHERE LOWER(email) = ?').bind(cleanEmail).run();
        return jsonResponse({
          success: false,
          error: 'Too many invalid attempts. Please request a new verification code.'
        }, 403);
      }

      await env.DB.prepare('UPDATE email_verifications SET attempts = ? WHERE LOWER(email) = ?')
        .bind(nextAttempts, cleanEmail)
        .run();

      const remainingAttempts = MAX_OTP_ATTEMPTS - nextAttempts;
      return jsonResponse({
        success: false,
        error: `Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`
      }, 400);
    }

    // Parse staged profile
    let candidateObj = {
      fullName: 'Candidate Aspirant',
      district: 'Balasore (Baleswar)',
      phone: '',
      targetStreams: ['opsc', 'ossc']
    };
    if (pending.candidate_data) {
      try {
        const parsed = JSON.parse(pending.candidate_data);
        if (parsed && typeof parsed === 'object') {
          candidateObj = { ...candidateObj, ...parsed };
        }
      } catch (e) {}
    }

    const streamArray = sanitizeTargetStreams(candidateObj.targetStreams);
    const stagedPhone = String(candidateObj.phone || '').replace(/\D/g, '').slice(-10);

    // Guard the 1-to-1 phone constraint at promotion time: if the mobile was
    // claimed by another candidate while this row was staged, drop it (NULL)
    // instead of failing the whole verification.
    let phoneValue = null;
    if (/^[6-9]\d{9}$/.test(stagedPhone)) {
      const phoneConflict = await env.DB.prepare(
        'SELECT id FROM candidates WHERE phone = ? AND LOWER(email) != ?'
      ).bind(stagedPhone, cleanEmail).first();
      phoneValue = phoneConflict ? null : stagedPhone;
    }

    // Generate new user ID
    const userId = 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();
    const sessionToken = generateSessionToken();
    const sessionExpiresAt = nowUnix + SESSION_TTL_SECONDS;

    // Atomically execute batch into D1:
    // 1. INSERT INTO users
    // 2. INSERT INTO candidates (with normalized phone)
    // 3. INSERT INTO sessions (auto-login on verification)
    // 4. DELETE FROM email_verifications
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO users (
          id, email, password_hash, salt, failed_attempts, lockout_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
      `).bind(userId, cleanEmail, pending.password_hash, pending.salt, nowUnix, nowUnix),

      env.DB.prepare(`
        INSERT INTO candidates (
          id, full_name, email, phone, district, password_hash, salt, failed_attempts, lockout_until, target_streams, created_at, last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `).bind(userId, candidateObj.fullName, cleanEmail, phoneValue, candidateObj.district, pending.password_hash, pending.salt, JSON.stringify(streamArray), nowIso, nowIso),

      env.DB.prepare(`
        INSERT INTO sessions (token, user_id, email, role, created_at, expires_at)
        VALUES (?, ?, ?, 'candidate', ?, ?)
      `).bind(sessionToken, userId, cleanEmail, nowUnix, sessionExpiresAt),

      env.DB.prepare(
        'DELETE FROM email_verifications WHERE LOWER(email) = ?'
      ).bind(cleanEmail)
    ]);

    const user = {
      id: userId,
      email: cleanEmail,
      name: candidateObj.fullName,
      role: 'candidate'
    };

    return jsonResponse({
      success: true,
      message: 'Account verified successfully',
      user,
      sessionToken,
      redirect: '/student-dashboard/?verified=1',
      // Backward-compatible aliases for existing clients
      token: sessionToken,
      candidate: {
        id: userId,
        fullName: candidateObj.fullName,
        name: candidateObj.fullName,
        email: cleanEmail,
        district: candidateObj.district,
        phone: phoneValue || '',
        targetStreams: streamArray
      }
    }, 200, {
      'Set-Cookie': buildSessionCookie(sessionToken)
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return jsonResponse({
      success: false,
      error: 'An error occurred during verification. Please try again.'
    }, 500);
  }
}
