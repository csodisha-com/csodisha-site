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
import { onRequestPost as handleForgotPasswordPost, onRequestOptions as handleForgotPasswordOptions } from './functions/api/auth/forgot-password.js';
import { onRequestPost as handleVerifyResetOtpPost, onRequestOptions as handleVerifyResetOtpOptions } from './functions/api/auth/verify-reset-otp.js';
import { onRequestPost as handleResetPasswordPost, onRequestOptions as handleResetPasswordOptions } from './functions/api/auth/reset-password.js';
import { onRequestPost as handleVerifyResetTokenPost, onRequestOptions as handleVerifyResetTokenOptions } from './functions/api/auth/verify-reset-token.js';
import { checkRateLimit, createSession, buildSessionCookie } from './functions/api/auth/_utils.js';
import { handleAdminApi } from './functions/api/admin/_router.js';
import { runLifecycleMaintenance } from './functions/api/admin/_cron.js';
import { handleContent } from './functions/api/content/_public.js';
import { handleSitemapXml, handleRssFeed, resolveDeepLinkMeta, rewriteHtmlWithMeta } from './functions/api/content/_seo.js';
import { getPublishedPage, getPageRedirect, renderDynamicPage, applyPageOverrides, publishDueScheduledPages, getSitewide } from './functions/_lib/site-pages.js';
import { handleUserApi } from './functions/api/user/_router.js';
import { handleMedia } from './functions/api/media/_serve.js';
import { handleAdminPage } from './functions/_lib/admin-pages.js';
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
      'SELECT id, email, password_hash, salt, failed_attempts, lockout_until, role FROM users WHERE email = ?'
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
      role: user.role || 'candidate'
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
        role: user.role || 'candidate'
      } : { id: user.id, email: user.email, role: user.role || 'candidate' },
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

    // 0a. Never serve server source / schema / config files from the static asset bucket
    //     (the assets directory is the repo root).
    if (/^\/(functions|migrations|scripts|docs|\.wrangler|\.git)(\/|$)/i.test(pathname) ||
        /^\/(_worker\.js|schema\.sql|wrangler\.(json|toml|jsonc)|package(-lock)?\.json)$/i.test(pathname)) {
      return new Response('Not Found', { status: 404 });
    }

    // 0b. CMS: server-enforced admin pages (role from D1; noindex + CSP headers)
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return handleAdminPage(request, env);
    }

    // 0c. CMS: admin JSON API (requireRole + CSRF + rate limits live in the router)
    if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
      return handleAdminApi(request, env);
    }

    // 0d. CMS: public content API + R2 media delivery + authenticated user progress/bookmarks API + Dynamic SEO
    if (pathname === '/sitemap.xml') return handleSitemapXml(request, env);
    if (pathname === '/feed.xml' || pathname === '/rss.xml') return handleRssFeed(request, env);
    if (pathname.startsWith('/api/content/') || /^\/api\/(jobs|current-affairs|mock-tests|resources)(\/|$)/.test(pathname)) {
      const apiRes = await handleContent(request, env);
      const hasSession = (request.headers.get('Cookie') || '').includes('cso_session=');
      if ((request.method === 'GET' || request.method === 'HEAD') && apiRes.status === 200 && !hasSession && !apiRes.headers.has('Cache-Control')) {
        const h = new Headers(apiRes.headers);
        h.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        return new Response(apiRes.body, { status: apiRes.status, statusText: apiRes.statusText, headers: h });
      }
      return apiRes;
    }
    if (pathname === '/api/user' || pathname.startsWith('/api/user/')) return handleUserApi(request, env);
    if (pathname.startsWith('/api/media/')) return handleMedia(request, env, ctx);

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

    // 2d. /api/auth/forgot-password — dual-channel recovery request
    if (pathname === '/api/auth/forgot-password' || (pathname === '/api/auth' && url.searchParams.get('action') === 'forgot-password')) {
      if (request.method === 'OPTIONS') return handleForgotPasswordOptions();
      if (request.method === 'POST') return handleForgotPasswordPost({ request, env, ctx });
    }

    // 2e. /api/auth/verify-reset-otp — in-page OTP verification
    if (pathname === '/api/auth/verify-reset-otp' || (pathname === '/api/auth' && url.searchParams.get('action') === 'verify-reset-otp')) {
      if (request.method === 'OPTIONS') return handleVerifyResetOtpOptions();
      if (request.method === 'POST') return handleVerifyResetOtpPost({ request, env, ctx });
    }

    // 2f. /api/auth/reset-password — consumes OTP grant or magic link
    if (pathname === '/api/auth/reset-password' || (pathname === '/api/auth' && url.searchParams.get('action') === 'reset-password')) {
      if (request.method === 'OPTIONS') return handleResetPasswordOptions();
      if (request.method === 'POST') return handleResetPasswordPost({ request, env, ctx });
    }

    // 2g. /api/auth/verify-reset-token — magic-link validity check
    if (pathname === '/api/auth/verify-reset-token' || (pathname === '/api/auth' && url.searchParams.get('action') === 'verify-reset-token')) {
      if (request.method === 'OPTIONS') return handleVerifyResetTokenOptions();
      if (request.method === 'POST') return handleVerifyResetTokenPost({ request, env, ctx });
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
      let res = await env.ASSETS.fetch(request);
      const isPageReq = (request.method === 'GET' || request.method === 'HEAD') && !pathname.startsWith('/api/') && !pathname.startsWith('/assets/') && (pathname.endsWith('/') || pathname.endsWith('.html') || !/\.[a-z0-9]+$/i.test(pathname));
      if (isPageReq) {
        const redirectTarget = await getPageRedirect(env, pathname);
        if (redirectTarget && redirectTarget.startsWith('/') && redirectTarget !== pathname) {
          return Response.redirect(new URL(redirectTarget, url.origin).toString(), 301);
        }
        const live = await getPublishedPage(env, pathname);
        const sitewide = await getSitewide(env);
        if (live || (sitewide && res.status === 200 && (res.headers.get('Content-Type') || '').includes('text/html'))) {
          const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'";
          if (res.status === 404 && live) {
            return new Response(request.method === 'HEAD' ? null : renderDynamicPage(live, sitewide), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' } });
          }
          if (res.status === 200 && (res.headers.get('Content-Type') || '').includes('text/html')) {
            res = applyPageOverrides(res, live, sitewide);
            res = new Response(res.body, { status: 200, headers: new Headers(res.headers) });
            res.headers.set('Cache-Control', 'no-cache');
          }
        }
      }
      if (pathname === '/' || pathname === '/index.html' || /^\/(jobs-careers|current-affairs|mock-tests|resources)(\/|$)/.test(pathname)) {
        const headers = new Headers(res.headers);
        headers.set(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'"
        );
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        const securedRes = new Response(res.body, { status: res.status, statusText: res.statusText, headers });
        if ((request.method === 'GET' || request.method === 'HEAD') && res.status === 200) {
          const meta = await resolveDeepLinkMeta(url, env);
          if (meta) {
            return rewriteHtmlWithMeta(securedRes, meta);
          }
        }
        return securedRes;
      }
      return res;
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    const task = (async () => { await publishDueScheduledPages(env); return runLifecycleMaintenance(env, { actorId: 'system:cron' }); })();
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(task);
    }
    return await task;
  }
};
