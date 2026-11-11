/**
 * Cloudflare Pages Functions — Magic Link Verification Handler
 * Route: GET /api/auth/verify-link?email=...&token=...
 *
 * On success the staged record is promoted and an active server session is
 * created atomically; the browser receives the session cookie and a 302
 * redirect into the candidate dashboard.
 */

import {
  constantTimeEqual,
  normalizeEmail,
  sanitizeTargetStreams,
  generateSessionToken,
  SESSION_TTL_SECONDS,
  buildSessionCookie
} from './_utils.js';

const MAX_LINK_TOKEN_ATTEMPTS = 5;

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequestGet({ request, env, ctx }) {
  try {
    const url = new URL(request.url);
    const emailParam = url.searchParams.get('email') || '';
    const tokenParam = url.searchParams.get('token') || '';

    const cleanEmail = normalizeEmail(emailParam);
    const cleanToken = tokenParam.trim();

    if (!cleanEmail || !cleanToken) {
      return new Response('Invalid verification link. Missing parameters.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    if (!env || !env.DB) {
      return new Response('Database service unavailable. Please try again later.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    // Look up the pending row by email only; the token is compared in
    // constant time afterwards to avoid timing side channels.
    const pending = await env.DB.prepare(`
      SELECT email, token, attempts, password_hash, salt, candidate_data, expires_at
      FROM email_verifications
      WHERE LOWER(email) = ?
    `).bind(cleanEmail).first();

    if (!pending || (pending.expires_at || 0) < nowUnix) {
      return expiredLinkResponse();
    }

    // Invalidate the row after repeated link misses (scanning/guessing defense)
    if (!constantTimeEqual(pending.token, cleanToken)) {
      const nextAttempts = (pending.attempts || 0) + 1;
      if (nextAttempts >= MAX_LINK_TOKEN_ATTEMPTS) {
        await env.DB.prepare('DELETE FROM email_verifications WHERE LOWER(email) = ?').bind(cleanEmail).run();
      } else {
        await env.DB.prepare('UPDATE email_verifications SET attempts = ? WHERE LOWER(email) = ?')
          .bind(nextAttempts, cleanEmail).run();
      }
      return expiredLinkResponse();
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

    // Guard the 1-to-1 phone constraint at promotion time
    let phoneValue = null;
    if (/^[6-9]\d{9}$/.test(stagedPhone)) {
      const phoneConflict = await env.DB.prepare(
        'SELECT id FROM candidates WHERE phone = ? AND LOWER(email) != ?'
      ).bind(stagedPhone, cleanEmail).first();
      phoneValue = phoneConflict ? null : stagedPhone;
    }

    // Generate new user ID + session
    const userId = 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();
    const sessionToken = generateSessionToken();
    const sessionExpiresAt = nowUnix + SESSION_TTL_SECONDS;

    // Atomically promote account + create active session
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

    // Lazy prune expired verifications
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(
        env.DB.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(nowUnix).run().catch(() => {})
      );
    }

    // Set HttpOnly session cookie (30-day) and redirect via 302
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/student-dashboard/?verified=1',
        'Set-Cookie': buildSessionCookie(sessionToken)
      }
    });

  } catch (err) {
    console.error('Verify Link Error:', err);
    return new Response('An error occurred during verification. Please try again.', { status: 500 });
  }
}

function expiredLinkResponse() {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Link Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,sans-serif;background:#090e18;color:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;padding:2rem;max-width:400px;background:#0f172a;border-radius:12px;border:1px solid #1e293b;"><h2>Link Expired or Invalid</h2><p style="color:#94a3b8;font-size:0.9rem;">This magic verification link has expired or has already been used.</p><a href="/signup.html" style="display:inline-block;margin-top:1rem;padding:0.75rem 1.5rem;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Request New Link</a></div></body></html>',
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
