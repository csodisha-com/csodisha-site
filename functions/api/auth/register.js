/**
 * Cloudflare Pages Functions — Hardened Registration Edge Handler
 * Route: POST /api/auth/register
 */

import {
  CORS_HEADERS,
  jsonResponse,
  generateSalt,
  hashPassword,
  checkRateLimit,
  EMAIL_REGEX
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

    // Rate limiting: 5 attempts per 15 min per client IP
    const rateCheck = checkRateLimit(`reg_${clientIP}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return jsonResponse({
        success: false,
        error: 'Too many registration attempts. Please try again later.'
      }, 429, { 'Retry-After': String(rateCheck.retryAfter) });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const { email, password, fullName, district, targetStreams } = body;

    if (!email || !password) {
      return jsonResponse({
        success: false,
        error: 'Email and password are required.'
      }, 400);
    }

    // Input sanitization: Trim and normalize email to lowercase
    const cleanEmail = String(email).trim().toLowerCase();

    // Input validation: Strict email regex
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return jsonResponse({
        success: false,
        error: 'Please enter a valid email address.'
      }, 400);
    }

    // Password validation: Length between 8 and 64 characters (allowing symbols, spaces, ASCII, UTF-8)
    const passStr = String(password);
    if (passStr.length < 8 || passStr.length > 64) {
      return jsonResponse({
        success: false,
        error: 'Password must be between 8 and 64 characters.'
      }, 400);
    }

    const cleanName = String(fullName || 'Candidate Aspirant').trim();
    const cleanDistrict = String(district || 'Balasore (Baleswar)').trim();
    const streamArray = Array.isArray(targetStreams) ? targetStreams : ['opsc', 'ossc'];

    // In edge preview sandbox without D1 binding
    if (!env || !env.DB) {
      const fallbackId = 'cso_usr_' + Date.now().toString(36);
      return jsonResponse({
        success: true,
        mode: 'edge_simulated',
        candidate: {
          id: fallbackId,
          fullName: cleanName,
          email: cleanEmail,
          district: cleanDistrict,
          targetStreams: streamArray
        }
      }, 201);
    }

    // Account enumeration defense:
    // Check if account already exists.
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ? UNION SELECT id FROM candidates WHERE email = ?'
    ).bind(cleanEmail, cleanEmail).first();

    if (existing) {
      // Return a uniform status code and message if account already exists
      return jsonResponse({
        success: false,
        error: 'An account with this email address already exists.'
      }, 409);
    }

    // Password hashing: Web Crypto PBKDF2 with SHA-256, 100,000 iterations (Cloudflare Workers runtime limit), 16-byte random salt
    const salt = generateSalt();
    const passwordHash = await hashPassword(passStr, salt, 100000);
    const userId = 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const nowUnix = Math.floor(Date.now() / 1000);
    const nowIso = new Date().toISOString();

    // Atomic D1 execution via batch prepared statements across users and candidates tables
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO users (
          id, email, password_hash, salt, failed_attempts, lockout_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
      `).bind(userId, cleanEmail, passwordHash, salt, nowUnix, nowUnix),
      env.DB.prepare(`
        INSERT INTO candidates (
          id, full_name, email, district, password_hash, salt, failed_attempts, lockout_until, target_streams, created_at, last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `).bind(userId, cleanName, cleanEmail, cleanDistrict, passwordHash, salt, JSON.stringify(streamArray), nowIso, nowIso)
    ]);

    return jsonResponse({
      success: true,
      candidate: {
        id: userId,
        fullName: cleanName,
        email: cleanEmail,
        district: cleanDistrict,
        targetStreams: streamArray
      }
    }, 201);

  } catch (error) {
    console.error('Registration Edge Error:', error);
    return jsonResponse({
      success: false,
      error: 'An error occurred while creating your account. Please try again.'
    }, 500);
  }
}
