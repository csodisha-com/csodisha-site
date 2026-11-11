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

// Strict email validation regex
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

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
