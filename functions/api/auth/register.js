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
      return jsonResponse({
        success: false,
        error: 'Database service unavailable'
      }, 500);
    }

    // Account check: Check if an active, already-verified account exists
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE LOWER(email) = ?'
    ).bind(cleanEmail).first();

    if (existingUser) {
      return jsonResponse({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      }, 409);
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Password hashing: Web Crypto PBKDF2 with SHA-256, 100,000 iterations (Cloudflare Workers runtime limit), 16-byte random salt
    const salt = generateSalt();
    const passwordHash = await hashPassword(passStr, salt, 100000);
    const nowUnix = Math.floor(Date.now() / 1000);
    const expiresAt = nowUnix + 900; // 15-minute OTP expiration

    const candidateData = JSON.stringify({
      fullName: cleanName,
      district: cleanDistrict,
      targetStreams: streamArray
    });

    // Store/replace pending record in 'email_verifications'
    await env.DB.prepare(`
      INSERT INTO email_verifications (
        email, otp_code, password_hash, salt, candidate_data, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        otp_code = excluded.otp_code,
        password_hash = excluded.password_hash,
        salt = excluded.salt,
        candidate_data = excluded.candidate_data,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `).bind(cleanEmail, otpCode, passwordHash, salt, candidateData, expiresAt, nowUnix).run();

    // Dispatch OTP email via configured transactional provider if available
    try {
      if (env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Common Sense Odisha <noreply@csodisha.com>',
            to: cleanEmail,
            subject: 'Your Common Sense Odisha Verification Code: ' + otpCode,
            html: `<p>Namaskar ${cleanName},</p><p>Your 6-digit candidate verification code is: <strong>${otpCode}</strong>.</p><p>This code expires in 15 minutes.</p>`
          })
        });
      } else if (env.SENDGRID_API_KEY) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cleanEmail }] }],
            from: { email: 'noreply@csodisha.com', name: 'Common Sense Odisha' },
            subject: 'Your Common Sense Odisha Verification Code: ' + otpCode,
            content: [{ type: 'text/html', value: `<p>Your verification code is: <strong>${otpCode}</strong></p>` }]
          })
        });
      }
    } catch (mailErr) {
      console.warn('Transactional email dispatch notice:', mailErr);
    }

    // Return verification code sent response without inserting into users or candidates table
    return jsonResponse({
      success: true,
      message: 'Verification code sent',
      email: cleanEmail
    }, 200);

  } catch (error) {
    console.error('Registration Edge Error:', error);
    return jsonResponse({
      success: false,
      error: 'An error occurred while creating your account. Please try again.'
    }, 500);
  }
}
