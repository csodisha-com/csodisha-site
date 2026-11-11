/**
 * Cloudflare Pages Functions — Hardened Registration Edge Handler
 * Dual-channel candidate verification: 6-digit OTP + one-click Magic Link
 * Route: POST /api/auth/register (also serves POST /api/auth/resend-otp via _worker.js)
 *
 * Production rules: honeypot bot trap, disposable-email blocklist, password
 * policy, name/phone/stream sanitization, verified-account duplicate checks,
 * 1-to-1 mobile uniqueness, and IP rate limiting.
 */

import {
  jsonResponse,
  generateSalt,
  hashPassword,
  generateOtpCode,
  generateVerificationToken,
  checkRateLimit,
  EMAIL_REGEX,
  isDisposableEmail,
  normalizeEmail,
  validatePasswordStrength,
  sanitizeFullName,
  normalizeIndianPhone,
  sanitizeTargetStreams
} from './_utils.js';

const OTP_TTL_SECONDS = 15 * 60;     // 15-minute dual-channel expiry window
const RESEND_COOLDOWN_SECONDS = 60;  // Minimum gap between email dispatches
const RATE_LIMIT_MAX = 5;            // Max registration attempts...
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // ...per IP per 10 minutes

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

export async function onRequestPost({ request, env, ctx }) {
  try {
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown-ip';

    // Rate limiting: 5 attempts per IP per 10 minutes
    const rateCheck = checkRateLimit(`reg_${clientIP}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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

    // Honeypot trap: hidden fields (CSS-invisible on signup.html). Any value
    // means a bot filled the form — respond like success, touch nothing.
    if (String(body.website || body.confirm_email_address || '').trim() !== '') {
      return jsonResponse({
        success: true,
        message: 'Verification code sent',
        email: normalizeEmail(body.email)
      }, 200);
    }

    const { email, password, fullName, district, targetStreams, phone } = body;

    // Passwordless requests are resends (the pending verification supplies the
    // staged credentials); a fresh registration requires email + password.
    if (!email) {
      return jsonResponse({
        success: false,
        error: 'Email is required.'
      }, 400);
    }

    // Email normalization + RFC-compliant validation + disposable blocklist
    const cleanEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return jsonResponse({
        success: false,
        error: 'Please enter a valid email address.'
      }, 400);
    }
    if (isDisposableEmail(cleanEmail)) {
      return jsonResponse({
        success: false,
        error: 'Disposable or temporary email addresses are not allowed. Please use a permanent email address.'
      }, 400);
    }

    const passStr = password === undefined || password === null ? '' : String(password);

    // Password policy: 8-128 chars, mixed case + digit + symbol, no common
    // passwords, nothing derived from the candidate's own name/email.
    if (passStr) {
      const policyError = validatePasswordStrength(passStr, { name: fullName, email: cleanEmail });
      if (policyError) {
        return jsonResponse({ success: false, error: policyError }, 400);
      }
    }

    // Profile sanitization (fresh registrations only; resends reuse staged data)
    let cleanName = 'Candidate Aspirant';
    let cleanDistrict = 'Balasore (Baleswar)';
    let cleanPhone = '';
    let streamArray = ['opsc', 'ossc'];

    if (fullName !== undefined && String(fullName).trim() !== '') {
      const nameResult = sanitizeFullName(fullName);
      if (nameResult.error) {
        return jsonResponse({ success: false, error: nameResult.error }, 400);
      }
      cleanName = nameResult.value;
    }
    if (district !== undefined && district !== null && String(district).trim() !== '') {
      cleanDistrict = String(district).trim().slice(0, 64);
    }

    // Strict 1-to-1 Indian mobile normalization (optional field)
    const phoneResult = normalizeIndianPhone(phone || (body.candidate && body.candidate.phone));
    if (phoneResult.error) {
      return jsonResponse({ success: false, error: phoneResult.error }, 400);
    }
    cleanPhone = phoneResult.value;

    // Target exam streams: strict enum validation
    streamArray = sanitizeTargetStreams(targetStreams);

    // In edge preview sandbox without D1 binding
    if (!env || !env.DB) {
      return jsonResponse({
        success: false,
        error: 'Database service unavailable'
      }, 500);
    }

    // Duplicate check strictly against the verified `users` table — staged,
    // unverified emails must never block re-registration.
    const existingVerifiedUser = await env.DB.prepare(
      'SELECT id FROM users WHERE LOWER(email) = ?'
    ).bind(cleanEmail).first();

    if (existingVerifiedUser) {
      return jsonResponse({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      }, 409);
    }

    // Strict 1-to-1 mobile uniqueness against verified candidate accounts
    if (cleanPhone) {
      const existingPhone = await env.DB.prepare(
        'SELECT id FROM candidates WHERE phone = ?'
      ).bind(cleanPhone).first();

      if (existingPhone) {
        return jsonResponse({
          success: false,
          error: 'This mobile number is already registered with an existing candidate account.'
        }, 409);
      }
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    // Check if email already has a pending (dual-channel) verification
    const pendingRecord = await env.DB.prepare(
      'SELECT email, password_hash, salt, candidate_data, expires_at, created_at FROM email_verifications WHERE LOWER(email) = ?'
    ).bind(cleanEmail).first();

    let isResume = false;
    if (pendingRecord) {
      isResume = true;
      // Dispatch cooldown: 'created_at' is refreshed every time a new code is issued
      const diff = nowUnix - (pendingRecord.created_at || 0);
      if (diff < RESEND_COOLDOWN_SECONDS) {
        const remaining = RESEND_COOLDOWN_SECONDS - diff;
        return jsonResponse({
          success: false,
          error: `Please wait ${remaining} seconds before requesting a new code.`
        }, 429, { 'Retry-After': String(remaining) });
      }
    }

    // Channel secrets: unbiased 6-digit OTP + 192-bit magic-link token
    const otpCode = generateOtpCode();
    const magicToken = generateVerificationToken();

    // Credential materialization:
    // - Fresh registration: PBKDF2-SHA256 (100,000 iterations — Cloudflare Workers
    //   runtime limit) with a fresh 16-byte random salt
    // - Resend/resume (no password in payload): reuse the pending password hash so a
    //   re-dispatched code never clobbers the credentials captured at sign-up time
    let passwordHash;
    let salt;
    let candidateData;

    if (!passStr) {
      if (!pendingRecord) {
        return jsonResponse({
          success: false,
          error: 'No pending registration found for this email. Please submit the registration form again.'
        }, 400);
      }
      passwordHash = pendingRecord.password_hash;
      salt = pendingRecord.salt;
      candidateData = pendingRecord.candidate_data;
    } else {
      salt = generateSalt();
      passwordHash = await hashPassword(passStr, salt, 100000);
      candidateData = JSON.stringify({
        fullName: cleanName,
        district: cleanDistrict,
        phone: cleanPhone,
        targetStreams: streamArray
      });
    }

    // Greeting name comes from the stored profile data on resends
    let displayName = 'Candidate Aspirant';
    try {
      const parsed = JSON.parse(candidateData);
      if (parsed && typeof parsed.fullName === 'string' && parsed.fullName.trim()) {
        displayName = parsed.fullName.trim();
      }
    } catch (e) {}

    const expiresAt = nowUnix + OTP_TTL_SECONDS;

    // Store/replace pending record with a fresh OTP + magic token and attempts reset to 0
    await env.DB.prepare(`
      INSERT INTO email_verifications (
        email, otp_code, token, password_hash, salt, candidate_data, attempts, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        otp_code = excluded.otp_code,
        token = excluded.token,
        password_hash = excluded.password_hash,
        salt = excluded.salt,
        candidate_data = excluded.candidate_data,
        attempts = 0,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `).bind(cleanEmail, otpCode, magicToken, passwordHash, salt, candidateData, expiresAt, nowUnix).run();

    // Lazy pruning of expired verifications in background
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(
        env.DB.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(nowUnix).run().catch(() => {})
      );
    }

    // Magic link URL (channel 2)
    const appOrigin = env.APP_ORIGIN || new URL(request.url).origin;
    const magicLink = `${appOrigin}/api/auth/verify-link?email=${encodeURIComponent(cleanEmail)}&token=${magicToken}`;

    // Dispatch OTP + Magic Link email via configured transactional provider
    const emailSubject = 'Your Verification Code - Common Sense Odisha';
    const emailHtml = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:28px 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;color:#0f172a;">
        <h2 style="color:#093824;margin-top:0;font-size:22px;margin-bottom:8px;">Common Sense Odisha</h2>
        <p style="font-size:15px;line-height:1.5;">Namaskar <strong>${displayName}</strong>,</p>
        <p style="font-size:14px;color:#475569;margin-bottom:16px;">
          Use either the 6-digit code or the one-click sign-in button below to activate your candidate dashboard:
        </p>

        <div style="font-size:32px;font-weight:800;letter-spacing:6px;padding:16px 20px;background:#f8fafc;border:2px dashed #093824;border-radius:10px;text-align:center;color:#093824;margin:20px 0;">
          ${otpCode}
        </div>

        <div style="text-align:center;margin:24px 0;">
          <a href="${magicLink}" style="display:inline-block;background:#093824;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:8px;font-size:14px;">
            Verify with Magic Link &rarr;
          </a>
        </div>

        <p style="font-size:13px;color:#64748b;line-height:1.5;margin-bottom:0;">
          This verification code and link will expire in 15 minutes. If you did not request this account, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="font-size:12px;color:#94a3b8;margin-bottom:0;text-align:center;">
          Common Sense Odisha (csodisha.com) — Independent Candidate Workspace
        </p>
      </div>
    `;
    const emailText = `Namaskar ${displayName},\n\nYour verification code is: ${otpCode}\n\nOr click the magic link to verify instantly:\n${magicLink}\n\nThis expires in 15 minutes.\n\n— Common Sense Odisha`;

    if (env.RESEND_API_KEY) {
      try {
        const fromAddress = env.EMAIL_FROM || 'Common Sense Odisha <onboarding@resend.dev>';
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanEmail],
            subject: emailSubject,
            html: emailHtml,
            text: emailText
          })
        });

        if (!emailRes.ok) {
          const errData = await emailRes.text().catch(() => '');
          console.error('Email dispatch failed:', emailRes.status, errData);
          return jsonResponse({
            success: false,
            error: 'Failed to deliver verification email. Please check your address or try again.'
          }, 502);
        }
      } catch (err) {
        console.error('Email dispatch failed:', err);
        return jsonResponse({
          success: false,
          error: 'Failed to deliver verification email. Please check your address or try again.'
        }, 502);
      }
    } else if (env.SENDGRID_API_KEY) {
      try {
        const emailRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cleanEmail }] }],
            from: { email: env.EMAIL_FROM || 'noreply@csodisha.com', name: 'Common Sense Odisha' },
            subject: emailSubject,
            content: [
              { type: 'text/plain', value: emailText },
              { type: 'text/html', value: emailHtml }
            ]
          })
        });

        if (!emailRes.ok) {
          const errData = await emailRes.text().catch(() => '');
          console.error('Email dispatch failed:', emailRes.status, errData);
          return jsonResponse({
            success: false,
            error: 'Failed to deliver verification email. Please check your address or try again.'
          }, 502);
        }
      } catch (err) {
        console.error('Email dispatch failed:', err);
        return jsonResponse({
          success: false,
          error: 'Failed to deliver verification email. Please check your address or try again.'
        }, 502);
      }
    }

    // Return verification code sent response without inserting into users or candidates table
    return jsonResponse({
      success: true,
      message: 'Verification code sent',
      email: cleanEmail,
      isResume
    }, 200);

  } catch (error) {
    console.error('Registration Edge Error:', error);
    return jsonResponse({
      success: false,
      error: 'An error occurred while creating your account. Please try again.'
    }, 500);
  }
}
