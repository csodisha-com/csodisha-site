/**
 * Cloudflare Worker Entrypoint (_worker.js)
 * Strictly authenticates against Cloudflare D1 with zero simulation/mocking.
 */

import { onRequestGet as handleHealthGet, onRequestOptions as handleHealthOptions } from './functions/api/health.js';
import { onRequestPost as handleRegisterPost, onRequestOptions as handleRegisterOptions } from './functions/api/auth/register.js';
import { onRequestPost as handleVerifyOtpPost, onRequestOptions as handleVerifyOtpOptions } from './functions/api/auth/verify-otp.js';
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

    // Fetch candidate profile from candidates table or return user session
    const candidate = await env.DB.prepare(
      'SELECT id, full_name, email, district, target_streams FROM candidates WHERE id = ? OR email = ?'
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
        email: candidate.email,
        district: candidate.district,
        targetStreams
      } : { id: user.id, email: user.email },
      token: user.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'cso_session=' + user.id + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'
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

    // 2b. /api/auth/verify-otp or /api/auth?action=verify-otp
    if (pathname === '/api/auth/verify-otp' || (pathname === '/api/auth' && url.searchParams.get('action') === 'verify-otp')) {
      if (request.method === 'OPTIONS') return handleVerifyOtpOptions();
      if (request.method === 'POST') return handleVerifyOtpPost({ request, env, ctx });
    }

    // 3. /api/auth/login or /api/auth?action=login (Strict D1)
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

    // 4. /api/sync
    if (pathname === '/api/sync') {
      if (request.method === 'OPTIONS') return handleSyncOptions();
      if (request.method === 'GET') return handleSyncGet({ request, env, ctx });
      if (request.method === 'POST') return handleSyncPost({ request, env, ctx });
    }

    // 5. /api/candidate/bookmarks
    if (pathname === '/api/candidate/bookmarks') {
      if (request.method === 'OPTIONS') return handleBookmarksOptions();
      if (request.method === 'GET') return handleBookmarksGet({ request, env, ctx });
      if (request.method === 'POST') return handleBookmarksPost({ request, env, ctx });
    }

    // 6. /api/candidate/checklist
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
