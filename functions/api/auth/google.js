/**
 * Cloudflare Pages Functions — Candidate Google OAuth 2.0 (Authorization Code Flow)
 * Routes:
 *   GET /api/auth/google
 *   GET /api/auth/google/callback
 *
 * Strictly isolated to Candidate accounts (/student-dashboard/).
 * Never creates or authenticates RBAC admin/editor sessions.
 */

import {
  bufToHex,
  generateSalt,
  normalizeEmail,
  sanitizeFullName,
  constantTimeEqual,
  createSession,
  buildSessionCookie
} from './_utils.js';

const OAUTH_STATE_COOKIE = 'cso_oauth_state';
const OAUTH_STATE_TTL_SECONDS = 600;

function redirectWithCookies(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache'
  });
  for (const c of cookies) {
    if (c) headers.append('Set-Cookie', c);
  }
  return new Response(null, { status: 302, headers });
}

function buildStateCookie(value, maxAge = OAUTH_STATE_TTL_SECONDS) {
  return `${OAUTH_STATE_COOKIE}=${encodeURIComponent(value)}; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearStateCookie() {
  return buildStateCookie('', 0);
}

function parseStateCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)cso_oauth_state=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1].trim());
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    const state = decoded.slice(0, idx);
    const mode = decoded.slice(idx + 1) === 'signup' ? 'signup' : 'login';
    if (!state || !/^[0-9a-f]{32,64}$/i.test(state)) return null;
    return { state, mode };
  } catch (_e) {
    return null;
  }
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch (_e) {
    return null;
  }
}

function generateOAuthState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes.buffer);
}

function generateUnusablePasswordHash() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'oauth_disabled_' + bufToHex(bytes.buffer);
}

export async function handleGoogleAuthStart({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const fallbackPath = mode === 'signup' ? '/signup.html' : '/login.html';

  const clientId = env && env.GOOGLE_CLIENT_ID ? String(env.GOOGLE_CLIENT_ID).trim() : '';
  const clientSecret = env && env.GOOGLE_CLIENT_SECRET ? String(env.GOOGLE_CLIENT_SECRET).trim() : '';
  if (!clientId || !clientSecret) {
    return redirectWithCookies(`${fallbackPath}?error=google_not_configured`);
  }

  const state = generateOAuthState();
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return redirectWithCookies(authUrl.toString(), [buildStateCookie(`${state}:${mode}`)]);
}

export async function handleGoogleAuthCallback({ request, env }) {
  const url = new URL(request.url);
  const parsedCookie = parseStateCookie(request);
  const mode = parsedCookie ? parsedCookie.mode : 'login';
  const fallbackPath = mode === 'signup' ? '/signup.html' : '/login.html';
  const clearedCookie = clearStateCookie();

  const oauthError = url.searchParams.get('error');
  const code = url.searchParams.get('code') || '';
  const returnedState = url.searchParams.get('state') || '';

  if (oauthError || !code || !returnedState || !parsedCookie || !constantTimeEqual(returnedState, parsedCookie.state)) {
    return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
  }

  const clientId = env && env.GOOGLE_CLIENT_ID ? String(env.GOOGLE_CLIENT_ID).trim() : '';
  const clientSecret = env && env.GOOGLE_CLIENT_SECRET ? String(env.GOOGLE_CLIENT_SECRET).trim() : '';
  if (!clientId || !clientSecret || !env || !env.DB) {
    return redirectWithCookies(`${fallbackPath}?error=google_not_configured`, [clearedCookie]);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!tokenRes.ok) {
      return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
    }

    const tokenData = await tokenRes.json().catch(() => null);
    if (!tokenData || (!tokenData.access_token && !tokenData.id_token)) {
      return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
    }

    let idClaims = tokenData.id_token ? decodeJwtPayload(tokenData.id_token) : null;
    if (idClaims && idClaims.aud && idClaims.aud !== clientId) {
      return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
    }

    let profile = idClaims || {};
    if (tokenData.access_token) {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      }).catch(() => null);
      if (userInfoRes && userInfoRes.ok) {
        const ui = await userInfoRes.json().catch(() => null);
        if (ui && typeof ui === 'object') {
          profile = { ...profile, ...ui };
        }
      }
    }

    if (profile.aud && profile.aud !== clientId) {
      return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
    }

    const googleSub = String(profile.sub || '').trim();
    const cleanEmail = normalizeEmail(profile.email || '');
    const emailVerified = profile.email_verified === true || profile.email_verified === 'true';

    if (!googleSub || !cleanEmail || !emailVerified) {
      return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
    }

    const avatarUrl = typeof profile.picture === 'string' && profile.picture.startsWith('https://')
      ? profile.picture.slice(0, 500)
      : null;

    const rawName = String(profile.name || cleanEmail.split('@')[0] || 'Candidate Aspirant');
    const nameCheck = sanitizeFullName(rawName);
    const fullName = nameCheck.value || 'Candidate Aspirant';

    const nowUnix = Math.floor(Date.now() / 1000);

    // 1. Check existing user in `users` by google_sub or lowercase email
    const userRow = await env.DB.prepare(
      'SELECT id, email, role, google_sub, avatar_url FROM users WHERE google_sub = ? OR LOWER(email) = ? LIMIT 1'
    ).bind(googleSub, cleanEmail).first();

    // Admin isolation: never allow Google OAuth to sign into staff/admin accounts
    if (userRow && (userRow.role === 'admin' || userRow.role === 'editor')) {
      return redirectWithCookies('/login.html?error=google_admin_blocked', [clearedCookie]);
    }

    const candRow = await env.DB.prepare(
      'SELECT id, email, google_sub, avatar_url FROM candidates WHERE google_sub = ? OR LOWER(email) = ? LIMIT 1'
    ).bind(googleSub, cleanEmail).first();

    let userId;
    let isNew = false;

    if (userRow || candRow) {
      userId = (userRow && userRow.id) || (candRow && candRow.id);
      const stmts = [];
      if (userRow) {
        stmts.push(
          env.DB.prepare(`
            UPDATE users
            SET google_sub = COALESCE(google_sub, ?),
                avatar_url = COALESCE(avatar_url, ?),
                updated_at = ?
            WHERE id = ?
          `).bind(googleSub, avatarUrl, nowUnix, userId)
        );
      } else {
        const salt = generateSalt();
        const pwHash = generateUnusablePasswordHash();
        stmts.push(
          env.DB.prepare(`
            INSERT INTO users (
              id, email, password_hash, salt, role, google_sub, avatar_url, auth_provider,
              failed_attempts, lockout_until, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'candidate', ?, ?, 'google', 0, 0, ?, ?)
          `).bind(userId, cleanEmail, pwHash, salt, googleSub, avatarUrl, nowUnix, nowUnix)
        );
      }

      if (candRow) {
        stmts.push(
          env.DB.prepare(`
            UPDATE candidates
            SET google_sub = COALESCE(google_sub, ?),
                avatar_url = COALESCE(avatar_url, ?),
                last_login_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(googleSub, avatarUrl, userId)
        );
      } else {
        const salt = generateSalt();
        const pwHash = generateUnusablePasswordHash();
        stmts.push(
          env.DB.prepare(`
            INSERT INTO candidates (
              id, full_name, email, phone, district, password_hash, salt,
              failed_attempts, lockout_until, target_streams, google_sub, avatar_url, auth_provider
            ) VALUES (?, ?, ?, NULL, 'Khordha (Bhubaneswar)', ?, ?, 0, 0, '["opsc","ossc"]', ?, ?, 'google')
          `).bind(userId, fullName, cleanEmail, pwHash, salt, googleSub, avatarUrl)
        );
      }
      await env.DB.batch(stmts);
    } else {
      isNew = true;
      userId = 'cso_usr_' + Date.now().toString(36) + '_' + generateSalt().slice(0, 8);
      const salt = generateSalt();
      const pwHash = generateUnusablePasswordHash();
      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO users (
            id, email, password_hash, salt, role, google_sub, avatar_url, auth_provider,
            failed_attempts, lockout_until, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'candidate', ?, ?, 'google', 0, 0, ?, ?)
        `).bind(userId, cleanEmail, pwHash, salt, googleSub, avatarUrl, nowUnix, nowUnix),
        env.DB.prepare(`
          INSERT INTO candidates (
            id, full_name, email, phone, district, password_hash, salt,
            failed_attempts, lockout_until, target_streams, google_sub, avatar_url, auth_provider
          ) VALUES (?, ?, ?, NULL, 'Khordha (Bhubaneswar)', ?, ?, 0, 0, '["opsc","ossc"]', ?, ?, 'google')
        `).bind(userId, fullName, cleanEmail, pwHash, salt, googleSub, avatarUrl)
      ]);
    }

    const { token: sessionToken } = await createSession(env, {
      userId,
      email: cleanEmail,
      role: 'candidate'
    });
    const sessionCookie = buildSessionCookie(sessionToken);
    const dest = isNew ? '/student-dashboard/?welcome=1' : '/student-dashboard/';

    return redirectWithCookies(dest, [sessionCookie, clearedCookie]);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return redirectWithCookies(`${fallbackPath}?error=google_auth_failed`, [clearedCookie]);
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/callback')) {
    return handleGoogleAuthCallback({ request, env });
  }
  return handleGoogleAuthStart({ request, env });
}
