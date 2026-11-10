/**
 * Cloudflare Pages / Worker Functions — OTP Email Verification Handler
 * Route: POST /api/auth/verify-otp
 */

import { CORS_HEADERS, jsonResponse } from './_utils.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost({ request, env }) {
  try {
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

    const cleanEmail = String(email).trim().toLowerCase();
    const nowUnix = Math.floor(Date.now() / 1000);

    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    // Look up pending row in email_verifications
    const pending = await env.DB.prepare(
      'SELECT email, otp_code, password_hash, salt, candidate_data, expires_at FROM email_verifications WHERE LOWER(email) = ? AND otp_code = ?'
    ).bind(cleanEmail, otpCode).first();

    if (!pending || pending.expires_at < nowUnix) {
      return jsonResponse({
        success: false,
        error: 'Invalid or expired verification code'
      }, 400);
    }

    // Generate new user ID
    const userId = 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    let candidateObj = {
      fullName: 'Candidate Aspirant',
      district: 'Balasore (Baleswar)',
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

    const streamArray = Array.isArray(candidateObj.targetStreams)
      ? candidateObj.targetStreams
      : ['opsc', 'ossc'];

    // Atomically execute batch into D1:
    // 1. INSERT INTO users
    // 2. INSERT INTO candidates
    // 3. DELETE FROM email_verifications
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO users (
          id, email, password_hash, salt, failed_attempts, lockout_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
      `).bind(userId, cleanEmail, pending.password_hash, pending.salt, nowUnix, nowUnix),

      env.DB.prepare(`
        INSERT INTO candidates (
          id, full_name, email, district, password_hash, salt, failed_attempts, lockout_until, target_streams, created_at, last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `).bind(userId, candidateObj.fullName, cleanEmail, candidateObj.district, pending.password_hash, pending.salt, JSON.stringify(streamArray), nowIso, nowIso),

      env.DB.prepare(
        'DELETE FROM email_verifications WHERE LOWER(email) = ?'
      ).bind(cleanEmail)
    ]);

    const sessionPayload = {
      id: userId,
      email: cleanEmail,
      fullName: candidateObj.fullName,
      district: candidateObj.district,
      targetStreams: streamArray
    };

    return jsonResponse({
      success: true,
      candidate: sessionPayload,
      token: userId
    }, 200, {
      'Set-Cookie': 'cso_session=' + userId + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return jsonResponse({
      success: false,
      error: 'An error occurred during verification. Please try again.'
    }, 500);
  }
}
