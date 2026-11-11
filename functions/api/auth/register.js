/**
 * Cloudflare Pages Functions — Hardened Registration Edge Handler
 * Dual-channel candidate verification: 6-digit OTP + one-click Magic Link
 * Route: POST /api/auth/register (also serves POST /api/auth/resend-otp via _worker.js)
 */

import {
  CORS_HEADERS,
  jsonResponse,
  generateSalt,
  hashPassword,
  generateOtpCode,
  generateVerificationToken,
  checkRateLimit,
  EMAIL_REGEX
} from './_utils.js';

const OTP_TTL_SECONDS = 15 * 60;     // 15-minute dual-channel expiry window
const RESEND_COOLDOWN_SECONDS = 60;  // Minimum gap between email dispatches

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost({ request, env, ctx }) {
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

    // Passwordless requests are resends (the pending verification supplies the
    // staged credentials); a fresh registration requires email + password.
    if (!email) {
      return jsonResponse({
        success: false,
        error: 'Email is required.'
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

    const passStr = password === undefined || password === null ? '' : String(password);

    // Password validation: Length between 8 and 64 characters (allowing symbols, spaces, ASCII, UTF-8)
    if (passStr && (passStr.length < 8 || passStr.length > 64)) {
      return jsonResponse({
        success: false,
        error: 'Password must be between 8 and 64 characters.'
      }, 400);
    }

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
          error: `Please wait ${remaining}s before requesting a new code.`
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
      const cleanName = String(fullName || 'Candidate Aspirant').trim();
      const cleanDistrict = String(district || 'Balasore (Baleswar)').trim();
      const streamArray = Array.isArray(targetStreams) ? targetStreams : ['opsc', 'ossc'];

      salt = generateSalt();
      passwordHash = await hashPassword(passStr, salt, 100000);
      candidateData = JSON.stringify({
        fullName: cleanName,
        district: cleanDistrict,
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
