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
  createSessionToken
} from './_utils.js';

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

    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({
        success: false,
        error: 'Invalid email or password'
      }, 401);
    }

    // Input sanitization: Trim and normalize email to lowercase
    const cleanEmail = String(email).trim().toLowerCase();
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

    // 1. Look up user record (from users or candidates table)
    let userRecord = await env.DB.prepare(`
      SELECT id, email, password_hash, salt, failed_attempts, lockout_until
      FROM users WHERE email = ?
    `).bind(cleanEmail).first();

    let candidateMeta = null;

    if (!userRecord) {
      // Check legacy/profile candidates table
      const cand = await env.DB.prepare(`
        SELECT id, full_name, email, district, password_hash, salt, failed_attempts, lockout_until, target_streams
        FROM candidates WHERE email = ?
      `).bind(cleanEmail).first();

      if (cand) {
        userRecord = cand;
        candidateMeta = cand;
      }
    } else {
      candidateMeta = await env.DB.prepare(`
        SELECT full_name, district, target_streams FROM candidates WHERE id = ?
      `).bind(userRecord.id).first();
    }

    // Timing-attack defense:
    // If the user does not exist in D1, run a dummy PBKDF2 derivation with identical 600,000 iteration count
    // before returning 401 Unauthorized
    if (!userRecord) {
      const dummySalt = generateSalt();
      await hashPassword(passStr, dummySalt, 600000);
      return jsonResponse({
        success: false,
        error: 'Invalid email or password'
      }, 401);
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

    // Password verification with matching salt and 600,000 iterations
    // (with backward compatibility fallback for 100,000 if legacy account)
    let isMatch = false;
    const computedHash600k = await hashPassword(passStr, userRecord.salt, 600000);

    if (computedHash600k === userRecord.password_hash) {
      isMatch = true;
    } else {
      // Check legacy 100k iteration hash
      const computedHash100k = await hashPassword(passStr, userRecord.salt, 100000);
      if (computedHash100k === userRecord.password_hash) {
        isMatch = true;
        // Upgrade user to 600,000 iterations seamlessly
        try {
          await env.DB.prepare(`
            UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
          `).bind(computedHash600k, nowUnix, userRecord.id).run();
        } catch(e) {}
      }
    }

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

    // On successful match: Reset failed_attempts to 0 and lockout_until to 0
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE users SET failed_attempts = 0, lockout_until = 0, updated_at = ? WHERE id = ?
      `).bind(nowUnix, userRecord.id),
      env.DB.prepare(`
        UPDATE candidates SET failed_attempts = 0, lockout_until = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(userRecord.id)
    ]).catch(() => {});

    // Standard session claims
    const sessionClaims = {
      sub: userRecord.id,
      email: userRecord.email,
      iat: nowUnix,
      exp: nowUnix + (7 * 24 * 60 * 60) // 7 days expiration
    };

    const sessionToken = await createSessionToken(sessionClaims);

    // Issue Secure, HttpOnly, SameSite=Lax cookie
    const cookieHeader = `cso_session=${sessionToken}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`;

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
