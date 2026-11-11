/**
 * Cloudflare Worker Entrypoint (_worker.js)
 * Strictly authenticates against Cloudflare D1 with zero simulation/mocking.
 */

import { onRequestGet as handleHealthGet, onRequestOptions as handleHealthOptions } from './functions/api/health.js';
import { onRequestPost as handleRegisterPost, onRequestOptions as handleRegisterOptions } from './functions/api/auth/register.js';
import { onRequestPost as handleVerifyOtpPost, onRequestOptions as handleVerifyOtpOptions } from './functions/api/auth/verify-otp.js';
import { onRequestGet as handleVerifyLinkGet, onRequestOptions as handleVerifyLinkOptions } from './functions/api/auth/verify-link.js';
import { onRequestGet as handleMeGet, onRequestOptions as handleMeOptions } from './functions/api/auth/me.js';
import { onRequestPost as handleLogoutPost, onRequestOptions as handleLogoutOptions } from './functions/api/auth/logout.js';
import { checkRateLimit, createSession, buildSessionCookie } from './functions/api/auth/_utils.js';
import { onRequestGet as handleBookmarksGet, onRequestPost as handleBookmarksPost, onRequestOptions as handleBookmarksOptions } from './functions/api/candidate/bookmarks.js';
import { onRequestGet as handleChecklistGet, onRequestPost as handleChecklistPost, onRequestOptions as handleChecklistOptions } from './functions/api/candidate/checklist.js';
import { onRequestGet as handleSyncGet, onRequestPost as handleSyncPost, onRequestOptions as handleSyncOptions } from './functions/api/sync.js';

// Convert hex string to Uint8Array
function hexToBuf(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Convert buffer to hex string
function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Strict D1-backed login handler
async function handleStrictD1Login(request, env) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON request payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { email, password } = body;
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Normalize email
    const cleanEmail = email.trim().toLowerCase();

    // 1b. Rate limiting: 10 login attempts per IP per 15 minutes
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown-ip';
    const rateCheck = checkRateLimit(`login_${clientIP}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: 'Too many authentication attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateCheck.retryAfter) }
      });
    }

    // 2. Query D1 strictly
    if (!env || !env.DB) {
      return new Response(JSON.stringify({ error: 'Database binding unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await env.DB.prepare(
      'SELECT id, email, password_hash, salt, failed_attempts, lockout_until FROM users WHERE email = ?'
    ).bind(cleanEmail).first();

    // 3. If user does not exist: Execute dummy PBKDF2 derivation with static salt to prevent timing leaks
    // Cloudflare Workers Web Crypto caps PBKDF2 iterations at 100,000
    if (!user) {
      const dummyKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(16),
          iterations: 100000,
          hash: 'SHA-256'
        },
        dummyKey,
        256
      );
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Check lockout
    const now = Math.floor(Date.now() / 1000);
    if (user.lockout_until && user.lockout_until > now) {
      return new Response(JSON.stringify({ error: 'Account temporarily locked due to multiple failed attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Hash incoming password with user.salt using 100,000 PBKDF2 iterations (Workers runtime limit)
    const passKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: hexToBuf(user.salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      passKey,
      256
    );

    const derivedHex = bufToHex(derivedBits);

    // 6. Compare derived hash with user.password_hash
    if (derivedHex !== user.password_hash) {
      const nextAttempts = (user.failed_attempts || 0) + 1;
      const lockUntil = nextAttempts >= 5 ? now + 900 : 0;
      await env.DB.prepare(
        'UPDATE users SET failed_attempts = ?, lockout_until = ? WHERE id = ?'
      ).bind(nextAttempts, lockUntil, user.id).run();

      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // On match: reset attempts and lockout
    await env.DB.prepare(
      'UPDATE users SET failed_attempts = 0, lockout_until = 0 WHERE id = ?'
    ).bind(user.id).run();

    // Create an active server session (opaque 256-bit token, 30-day TTL)
    // instead of exposing the raw user id as the session token.
    const { token: sessionToken } = await createSession(env, {
      userId: user.id,
      email: user.email,
      role: 'candidate'
    });

    // Fetch candidate profile from candidates table for the response payload
    const candidate = await env.DB.prepare(
      'SELECT id, full_name, email, phone, district, target_streams FROM candidates WHERE id = ? OR email = ?'
    ).bind(user.id, cleanEmail).first();

    let targetStreams = ['opsc', 'ossc'];
    if (candidate && candidate.target_streams) {
      try { targetStreams = JSON.parse(candidate.target_streams); } catch(e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      candidate: candidate ? {
        id: candidate.id,
        fullName: candidate.full_name,
        name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone || '',
        district: candidate.district,
        targetStreams,
        role: 'candidate'
      } : { id: user.id, email: user.email, role: 'candidate' },
      token: sessionToken
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSessionCookie(sessionToken)
      }
    });

  } catch (err) {
    console.error('Strict D1 Login Error:', err);
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. /api/health
    if (pathname === '/api/health') {
      if (request.method === 'OPTIONS') return handleHealthOptions();
      if (request.method === 'GET') return handleHealthGet({ request, env, ctx });
    }

    // 2. /api/auth/register or /api/auth?action=register
    if (pathname === '/api/auth/register' || (pathname === '/api/auth' && url.searchParams.get('action') === 'register')) {
      if (request.method === 'OPTIONS') return handleRegisterOptions();
      if (request.method === 'POST') return handleRegisterPost({ request, env, ctx });
    }

    // 2a. /api/auth/resend-otp — dual-channel code re-dispatch (delegates to the
    // register handler, which preserves the pending password hash on resends)
    if (pathname === '/api/auth/resend-otp' || (pathname === '/api/auth' && url.searchParams.get('action') === 'resend-otp')) {
      if (request.method === 'OPTIONS') return handleRegisterOptions();
      if (request.method === 'POST') return handleRegisterPost({ request, env, ctx });
    }

    // 2b. /api/auth/verify-otp or /api/auth?action=verify-otp
    if (pathname === '/api/auth/verify-otp' || (pathname === '/api/auth' && url.searchParams.get('action') === 'verify-otp')) {
      if (request.method === 'OPTIONS') return handleVerifyOtpOptions();
      if (request.method === 'POST') return handleVerifyOtpPost({ request, env, ctx });
    }

    // 2c. /api/auth/verify-link or /api/auth?action=verify-link
    if (pathname === '/api/auth/verify-link' || (pathname === '/api/auth' && url.searchParams.get('action') === 'verify-link')) {
      if (request.method === 'OPTIONS') return handleVerifyLinkOptions();
      if (request.method === 'GET') return handleVerifyLinkGet({ request, env, ctx });
    }

    // 4. /api/auth/logout — revoke the active server session
    if (pathname === '/api/auth/logout' || (pathname === '/api/auth' && url.searchParams.get('action') === 'logout')) {
      if (request.method === 'OPTIONS') return handleLogoutOptions();
      if (request.method === 'POST') return handleLogoutPost({ request, env, ctx });
    }

    // 5. /api/auth/me — session introspection for client restoration
    if (pathname === '/api/auth/me' || (pathname === '/api/auth' && url.searchParams.get('action') === 'me')) {
      if (request.method === 'OPTIONS') return handleMeOptions();
      if (request.method === 'GET') return handleMeGet({ request, env, ctx });
    }

    // 6. /api/auth/login or /api/auth?action=login (Strict D1)
    if (pathname === '/api/auth/login' || (pathname === '/api/auth' && url.searchParams.get('action') === 'login')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        });
      }
      if (request.method === 'POST') return handleStrictD1Login(request, env);
    }

    // 7. /api/sync
    if (pathname === '/api/sync') {
      if (request.method === 'OPTIONS') return handleSyncOptions();
      if (request.method === 'GET') return handleSyncGet({ request, env, ctx });
      if (request.method === 'POST') return handleSyncPost({ request, env, ctx });
    }

    // 8. /api/candidate/bookmarks
    if (pathname === '/api/candidate/bookmarks') {
      if (request.method === 'OPTIONS') return handleBookmarksOptions();
      if (request.method === 'GET') return handleBookmarksGet({ request, env, ctx });
      if (request.method === 'POST') return handleBookmarksPost({ request, env, ctx });
    }

    // 9. /api/candidate/checklist
    if (pathname === '/api/candidate/checklist') {
      if (request.method === 'OPTIONS') return handleChecklistOptions();
      if (request.method === 'GET') return handleChecklistGet({ request, env, ctx });
      if (request.method === 'POST') return handleChecklistPost({ request, env, ctx });
    }

    // Fall back to static asset binding
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
