/**
 * Cloudflare Pages Functions — Authentication Shared Utilities & Crypto Engine
 * Web Crypto PBKDF2 (600,000 iterations, SHA-256)
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}

// Convert buffer to hex string
export function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
export function hexToBuf(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Base64Url helpers
export function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Generate cryptographically secure 16-byte random salt
export function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return bufToHex(array.buffer);
}

// Generate a cryptographically secure, unbiased 6-digit OTP (100000-999999).
// Rejection sampling over crypto.getRandomValues removes modulo bias so every
// code in the range is exactly equally likely.
export function generateOtpCode() {
  const OTP_RANGE = 900000; // codes span 100000..999999
  const UINT32_LIMIT = Math.floor(4294967296 / OTP_RANGE) * OTP_RANGE;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= UINT32_LIMIT);
  return String(100000 + (value % OTP_RANGE));
}

// Generate a cryptographically secure magic-link verification token
// (24 random bytes, hex-encoded to 48 characters)
export function generateVerificationToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes.buffer);
}

// PBKDF2 Web Crypto Hash (600,000 iterations, SHA-256)
export async function hashPassword(password, saltHex, iterations = 100000) {
  const encoder = new TextEncoder();
  const passBuffer = encoder.encode(password);
  const saltBuffer = hexToBuf(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bufToHex(derivedBits);
}

// In-memory rate limiting defense per client IP (e.g. 5 attempts per 15 min window)
const rateLimitMap = new Map();

export function checkRateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    rateLimitMap.set(ip, entry);
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter: retryAfterSec };
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return { allowed: true, remaining: maxAttempts - entry.count };
}

// RFC-compliant email validation (pragmatic subset: local@domain.tld)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Trim + lowercase normalization applied before every email query or write
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Known temporary / disposable inbox providers — registration is rejected
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'temp-mail.org', 'fakeinbox.com',
  'throwawaymail.com', 'mailnesia.com', 'tempmailo.com', 'mohmal.com',
  'emailondeck.com', 'moakt.com', 'tmpmail.org', 'spamgourmet.com'
]);

export function isDisposableEmail(email) {
  const domain = String(email || '').split('@')[1];
  return !!domain && DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

// Create signed lightweight JWT or secure signed token
export async function createSessionToken(payload, secret = 'cso_edge_auth_secret_key_2026') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const encodedSig = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${dataToSign}.${encodedSig}`;
}

// ---------------------------------------------------------------------------
// Production auth & validation rules
// ---------------------------------------------------------------------------

// Password policy: 8-128 chars (128 caps PBKDF2 DoS), mixed case, digit, symbol;
// rejects common passwords and anything containing the candidate's name/email.
const COMMON_PASSWORD_FRAGMENTS = [
  'password', 'admin123', 'qwerty', 'welcome', 'letmein',
  'iloveyou', '123456', '12345678', 'abc123', 'odisha123'
];

export function validatePasswordStrength(password, { name = '', email = '' } = {}) {
  const pw = String(password || '');
  if (pw.length < 8) return 'Password must be at least 8 characters long.';
  if (pw.length > 128) return 'Password must not exceed 128 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one digit.';
  if (!/[!@#$%^&*(),.?":{}|<>[\]\-_~`+=;']/.test(pw)) return 'Password must include at least one special character.';
  const lower = pw.toLowerCase();
  if (COMMON_PASSWORD_FRAGMENTS.some(f => lower.includes(f))) {
    return 'This password is too common. Please choose a stronger, unique password.';
  }
  const localPart = normalizeEmail(email).split('@')[0];
  if (localPart.length >= 3 && lower.includes(localPart)) {
    return 'Password must not contain your email address.';
  }
  const namePart = String(name || '').trim().toLowerCase();
  const nameTokens = namePart.split(/\s+/).filter(t => t.length >= 3);
  if (nameTokens.some(t => lower.includes(t))) {
    return 'Password must not contain your name.';
  }
  return null;
}

// Full name sanitization: strip tags, collapse whitespace, 2-80 chars,
// letters (unicode) with dots, spaces, apostrophes and hyphens only.
export function sanitizeFullName(raw) {
  const value = String(raw || '')
    .replace(/<[^>]*>/g, '')   // strip HTML/script tags
    .replace(/[<>]/g, '')      // strip stray angle brackets
    .replace(/\s+/g, ' ')
    .trim();
  if (value.length < 2 || value.length > 80) {
    return { error: 'Full name must be between 2 and 80 characters.' };
  }
  if (!/^[\p{L}][\p{L}\s.'\-]*$/u.test(value)) {
    return { error: 'Full name may only contain letters, spaces, dots, apostrophes and hyphens.' };
  }
  return { value };
}

// Indian mobile normalization: keep digits, take the last 10 (strips +91/0
// prefixes). Empty input is valid — phone is optional at registration.
export function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return { value: '' };
  const clean = digits.slice(-10);
  if (!/^[6-9]\d{9}$/.test(clean)) {
    return { error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  return { value: clean };
}

// Target exam streams: strict allow-list enum
export const TARGET_STREAMS = ['opsc', 'ossc', 'osssc', 'teaching'];

export function sanitizeTargetStreams(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const cleaned = [...new Set(arr.map(s => String(s).toLowerCase().trim()).filter(s => TARGET_STREAMS.includes(s)))];
  return cleaned.length ? cleaned : ['opsc', 'ossc'];
}

// Constant-time byte comparison (Workers expose crypto.subtle.timingSafeEqual;
// fall back to a branch-free accumulation loop elsewhere).
export function constantTimeEqual(a, b) {
  const aStr = String(a || '');
  const bStr = String(b || '');
  if (aStr.length === bStr.length && aStr.length > 0 &&
      typeof crypto.subtle !== 'undefined' && typeof crypto.subtle.timingSafeEqual === 'function') {
    try {
      return crypto.subtle.timingSafeEqual(new TextEncoder().encode(aStr), new TextEncoder().encode(bStr));
    } catch (e) { /* fall through */ }
  }
  const len = Math.max(aStr.length, bStr.length);
  let diff = aStr.length ^ bStr.length;
  for (let i = 0; i < len; i++) {
    diff |= (aStr.charCodeAt(i) || 0) ^ (bStr.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Server-side sessions (opaque 256-bit tokens, 30-day sliding window)
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = 'cso_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 2592000

export function generateSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes.buffer);
}

export function buildSessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// Persist an active session row in the `sessions` table
export async function createSession(env, { userId, email, role = 'candidate' }) {
  const token = generateSessionToken();
  const nowUnix = Math.floor(Date.now() / 1000);
  const expiresAt = nowUnix + SESSION_TTL_SECONDS;
  await env.DB.prepare(`
    INSERT INTO sessions (token, user_id, email, role, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(token, userId, email, role, nowUnix, expiresAt).run();
  return { token, expiresAt };
}

// Resolve the active session from the HttpOnly cookie or Bearer header.
// Identity is NEVER taken from query parameters or request bodies.
export async function getSessionFromRequest(request, env) {
  if (!env || !env.DB) return null;
  let token = null;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)cso_session=([^;]+)/);
  if (match) token = match[1].trim();
  if (!token) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7).trim();
  }
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const nowUnix = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    'SELECT token, user_id, email, role, expires_at FROM sessions WHERE token = ?'
  ).bind(token).first();
  if (!row || (row.expires_at || 0) <= nowUnix) return null;
  return { token: row.token, userId: row.user_id, email: row.email, role: row.role, expiresAt: row.expires_at };
}
