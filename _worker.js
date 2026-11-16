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
import { isTwoFactorConfigured, canSendOtp, issueOtp, deliverOtp, verifyTwoFactor, OTP_RESEND_SECONDS } from './functions/_lib/admin-2fa.js';
import { checkReadOnlyFreezeGuard } from './functions/_lib/ops-sentinel.js';
import { runScheduledBackupPolicy } from './functions/_lib/ops-hygiene.js';
import { runLifecycleMaintenance } from './functions/api/admin/_cron.js';
import { handleContent } from './functions/api/content/_public.js';
import { handleSitemapXml, handleRssFeed, handleRobotsTxt, handleLlmsTxt, resolveDeepLinkMeta, rewriteHtmlWithMeta } from './functions/api/content/_seo.js';
import { getPublishedPage, getPageRedirect, getExpiredRedirect, renderDynamicPage, applyPageOverrides, publishDueScheduledPages, getSitewide } from './functions/_lib/site-pages.js';
import { handleUserApi } from './functions/api/user/_router.js';
import { handleMedia } from './functions/api/media/_serve.js';
import { handleAdminPage } from './functions/_lib/admin-pages.js';
import { handlePublicStudyLibraryRoute } from './functions/_lib/study-library-ssr.js';
import { handlePublicStudyItemsApi, handlePublicStudySuggestApi, handleStudyLibrarySitemapXml } from './functions/_lib/study-library-studio.js';
import { handlePublicEduResourcesApi } from './functions/_lib/edu-resources-batch1.js';
import { handlePublicEduTaxonomyApi, handlePublicEduExaminationsApi } from './functions/_lib/edu-resources-batch2.js';
import { handlePublicEduAdmitResultsApi, handlePublicEduSyllabiApi, handlePublicEduPyqsApi } from './functions/_lib/edu-resources-batch3.js';
import { handlePublicEduQuizzesApi, handlePublicEduMockTestsApi, handlePublicEduAnswerKeysApi, handlePublicEduCollectionsApi, handlePublicEduAssessmentGradeApi } from './functions/_lib/edu-resources-batch4.js';
import { handlePublicEduScholarshipsApi, handlePublicEduCareersApi } from './functions/_lib/edu-resources-batch5.js';
import { handlePublicEduStudentHubApi, handlePublicEduToolsApi } from './functions/_lib/edu-resources-batch6.js';
import { handlePublicNavConfigApi } from './functions/_lib/categories-nav-batch1.js';
import { handlePublicJobsRoute } from './functions/_lib/jobs-directory-ssr.js';
import { handlePublicJobsOverviewApi, handlePublicJobsItemsApi, handlePublicJobsSuggestApi, handleJobsDirectorySitemapXml } from './functions/_lib/jobs-directory-studio.js';
import { handlePublicSchemesRoute } from './functions/_lib/schemes-directory-ssr.js';
import { handlePublicSchemesOverviewApi, handlePublicSchemesItemsApi, handlePublicSchemesSuggestApi, handleSchemesDirectorySitemapXml } from './functions/_lib/schemes-directory-studio.js';
import { handlePublicCommunityRoute } from './functions/_lib/community-directory-ssr.js';
import { handlePublicCommunityOverviewApi, handlePublicCommunityItemsApi, handlePublicCommunitySuggestApi, handleCommunityDirectorySitemapXml } from './functions/_lib/community-directory-studio.js';
import { handlePublicAboutOverviewApi } from './functions/api/public/about-overview.js';
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

// POST /api/admin/auth/send-otp  { email, password }
// Validates the staff password first, then pushes a one-time code via Telegram and/or email.
async function handleAdminSendOtp(request, env) {
  const J = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
  try {
    if (!env || !env.DB) return J({ error: 'Database binding unavailable' }, 500);
    let body = {};
    try { body = await request.json(); } catch { return J({ error: 'Invalid JSON request payload' }, 400); }
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return J({ error: 'Invalid email or password' }, 401);
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown-ip';
    const rate = checkRateLimit('sendotp_' + ip, 10, 15 * 60 * 1000);
    if (!rate.allowed) return J({ error: 'Too many requests. Please try again later.' }, 429, { 'Retry-After': String(rate.retryAfter) });
    const user = await env.DB.prepare('SELECT id, email, password_hash, salt, lockout_until, role FROM users WHERE email = ?').bind(email).first();
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: user ? hexToBuf(user.salt) : new Uint8Array(16), iterations: 100000, hash: 'SHA-256' }, key, 256);
    const now = Math.floor(Date.now() / 1000);
    if (!user || bufToHex(bits) !== user.password_hash || (user.role !== 'admin' && user.role !== 'editor')) {
      return J({ error: 'Invalid email or password' }, 401);
    }
    if (user.lockout_until && user.lockout_until > now) return J({ error: 'Account temporarily locked. Please try again later.' }, 429);
    if (!canSendOtp(env)) return J({ error: 'No OTP delivery channel (Telegram/Email) is configured.' }, 400);
    const issued = await issueOtp(env, user.id, now);
    if (!issued.ok) return J({ error: 'Please wait ' + issued.retryAfter + 's before requesting another code.', retry_after: issued.retryAfter }, 429, { 'Retry-After': String(issued.retryAfter) });
    const channels = await deliverOtp(env, issued.code);
    if (!channels.length) return J({ error: 'Could not deliver the OTP. Check the Telegram/Email configuration.' }, 502);
    return J({ ok: true, channels, cooldown: OTP_RESEND_SECONDS, expires_in: 600 });
  } catch (e) {
    console.error('send-otp error:', e);
    return J({ error: 'Could not send OTP.' }, 500);
  }
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

    // Multi-factor gate (staff only). Enforced only once a 2FA secret is configured,
    // so initial setup can never lock the admin out. No session is issued before this passes.
    if ((user.role === 'admin' || user.role === 'editor') && isTwoFactorConfigured(env)) {
      const submitted = String(body.twofa_code || '').trim().slice(0, 16);
      if (!submitted) {
        return new Response(JSON.stringify({ error: 'Enter your 2FA code, a Telegram/Email OTP, or a backup code.', requires_2fa: true, can_send_otp: canSendOtp(env) }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const okTwoFactor = await verifyTwoFactor(env, user.id, submitted);
      if (!okTwoFactor) {
        return new Response(JSON.stringify({ error: 'Invalid or expired 2FA code.', requires_2fa: true, can_send_otp: canSendOtp(env) }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
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

// Track anonymous GET cache URLs (including query strings) for immediate invalidation on admin mutations
const TRACKED_PUBLIC_CACHE_URLS = new Set();

function recordPublicCachePut(edgeCache, request, response, ctx) {
  if (!edgeCache || !response || response.status !== 200) return;
  try {
    if (TRACKED_PUBLIC_CACHE_URLS.size > 500) TRACKED_PUBLIC_CACHE_URLS.clear();
    TRACKED_PUBLIC_CACHE_URLS.add(request.url);
    const putPromise = edgeCache.put(request, response.clone()).catch(() => {});
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(putPromise);
  } catch {}
}

async function invalidatePublicEdgeCache(edgeCache, origin) {
  if (!edgeCache) return;
  const basePaths = [
    '/sitemap.xml', '/sitemap-study-library.xml', '/sitemap-jobs.xml', '/sitemap-schemes.xml', '/sitemap-community.xml', '/feed.xml', '/rss.xml', '/robots.txt', '/llms.txt',
    '/api/content/jobs', '/api/content/current-affairs', '/api/content/jobs-directory',
    '/api/content/about-directory', '/api/content/schemes-directory', '/api/content/study-library-directory', '/api/public/study-library/items', '/api/edu/resources', '/api/edu/taxonomy', '/api/edu/examinations', '/api/edu/admit-results', '/api/edu/syllabi', '/api/edu/pyqs', '/api/edu/quizzes', '/api/edu/mock-tests', '/api/edu/answer-keys', '/api/edu/collections', '/api/edu/scholarships', '/api/edu/careers', '/api/edu/student-hub', '/api/edu/tools', '/api/nav/config', '/api/public/jobs-directory/overview', '/api/public/jobs-directory/items', '/api/public/schemes-directory/overview', '/api/public/schemes-directory/items', '/api/public/community-directory/overview', '/api/public/community-directory/items', '/api/public/about-overview', '/api/content/platform-stats', '/api/content/changelog',
    '/api/content/schemes', '/api/content/mock-tests', '/api/content/resources',
    '/api/content/exam-taxonomy', '/api/content/banner', '/api/content/search', '/api/content/leaderboard'
  ];
  const allUrls = new Set(basePaths.map(p => `${origin}${p}`));
  for (const cachedUrl of TRACKED_PUBLIC_CACHE_URLS) {
    allUrls.add(cachedUrl);
  }
  TRACKED_PUBLIC_CACHE_URLS.clear();
  await Promise.all([...allUrls].map(u => edgeCache.delete(new Request(u)).catch(() => false)));
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

    // 0b-freeze. Emergency Read-Only Freeze guard (Module #12): blocks mutating requests
    // with 503 READ_ONLY_FREEZE except allowlisted admin login/auth/ops/session routes.
    const freezeBlocked = await checkReadOnlyFreezeGuard(request, env);
    if (freezeBlocked) return freezeBlocked;

    // 0c-login. Alias /api/admin/login to strict D1 login handler
    if (pathname === '/api/admin/login') {
      if (request.method === 'POST') return handleStrictD1Login(request, env);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } });
    }

    // 0c-pre. Pre-auth: staff password check + push OTP (must precede the role-gated admin router)
    if (pathname === '/api/admin/auth/send-otp') {
      if (request.method === 'POST') return handleAdminSendOtp(request, env);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } });
    }

    // 0c. CMS: admin JSON API (requireRole + CSRF + rate limits live in the router)
    if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
      const adminRes = await handleAdminApi(request, env);
      if (request.method !== 'GET' && request.method !== 'HEAD' && adminRes.status >= 200 && adminRes.status < 400) {
        const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
        await invalidatePublicEdgeCache(edgeCache, url.origin);
      }
      return adminRes;
    }

    // 0d. CMS: public content API + R2 media delivery + authenticated user progress/bookmarks API + Dynamic SEO
    const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    const isAnonGet = (request.method === 'GET' || request.method === 'HEAD') && !(request.headers.get('Cookie') || '').includes('cso_session=');
    if (pathname === '/sitemap-study-library.xml') {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const slMapRes = await handleStudyLibrarySitemapXml(request, env);
      if (isAnonGet && slMapRes.status === 200) {
        recordPublicCachePut(edgeCache, request, slMapRes, ctx);
      }
      return slMapRes;
    }
    if (pathname === '/api/public/study-library/items' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicStudyItemsApi(request, env);
    }
    if (pathname === '/api/edu/resources' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const eduRes = await handlePublicEduResourcesApi(request, env);
      if (isAnonGet && eduRes.status === 200) {
        recordPublicCachePut(edgeCache, request, eduRes, ctx);
      }
      return eduRes;
    }
    if (pathname === '/api/edu/taxonomy' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const taxRes = await handlePublicEduTaxonomyApi(request, env);
      if (isAnonGet && taxRes.status === 200) {
        recordPublicCachePut(edgeCache, request, taxRes, ctx);
      }
      return taxRes;
    }
    if (pathname === '/api/edu/examinations' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const examRes = await handlePublicEduExaminationsApi(request, env);
      if (isAnonGet && examRes.status === 200) {
        recordPublicCachePut(edgeCache, request, examRes, ctx);
      }
      return examRes;
    }
    if (pathname === '/api/edu/admit-results' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const arRes = await handlePublicEduAdmitResultsApi(request, env);
      if (isAnonGet && arRes.status === 200) {
        recordPublicCachePut(edgeCache, request, arRes, ctx);
      }
      return arRes;
    }
    if (pathname === '/api/edu/syllabi' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const sylRes = await handlePublicEduSyllabiApi(request, env);
      if (isAnonGet && sylRes.status === 200) {
        recordPublicCachePut(edgeCache, request, sylRes, ctx);
      }
      return sylRes;
    }
    if (pathname === '/api/edu/pyqs' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const pyqRes = await handlePublicEduPyqsApi(request, env);
      if (isAnonGet && pyqRes.status === 200) {
        recordPublicCachePut(edgeCache, request, pyqRes, ctx);
      }
      return pyqRes;
    }
    if (pathname === '/api/edu/quizzes' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const qzRes = await handlePublicEduQuizzesApi(request, env);
      if (isAnonGet && qzRes.status === 200) {
        recordPublicCachePut(edgeCache, request, qzRes, ctx);
      }
      return qzRes;
    }
    if (pathname === '/api/edu/mock-tests' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const mkRes = await handlePublicEduMockTestsApi(request, env);
      if (isAnonGet && mkRes.status === 200) {
        recordPublicCachePut(edgeCache, request, mkRes, ctx);
      }
      return mkRes;
    }
    if (pathname === '/api/edu/answer-keys' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const akRes = await handlePublicEduAnswerKeysApi(request, env);
      if (isAnonGet && akRes.status === 200) {
        recordPublicCachePut(edgeCache, request, akRes, ctx);
      }
      return akRes;
    }
    if (pathname === '/api/edu/collections' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const colRes = await handlePublicEduCollectionsApi(request, env);
      if (isAnonGet && colRes.status === 200) {
        recordPublicCachePut(edgeCache, request, colRes, ctx);
      }
      return colRes;
    }
    if (pathname === '/api/edu/assessments/grade' && request.method === 'POST') {
      return handlePublicEduAssessmentGradeApi(request, env);
    }
    if (pathname === '/api/edu/scholarships' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const scholRes = await handlePublicEduScholarshipsApi(request, env);
      if (isAnonGet && scholRes.status === 200) {
        recordPublicCachePut(edgeCache, request, scholRes, ctx);
      }
      return scholRes;
    }
    if (pathname === '/api/edu/careers' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const carRes = await handlePublicEduCareersApi(request, env);
      if (isAnonGet && carRes.status === 200) {
        recordPublicCachePut(edgeCache, request, carRes, ctx);
      }
      return carRes;
    }
    if (pathname === '/api/edu/student-hub' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const hubRes = await handlePublicEduStudentHubApi(request, env);
      if (isAnonGet && hubRes.status === 200) {
        recordPublicCachePut(edgeCache, request, hubRes, ctx);
      }
      return hubRes;
    }
    if (pathname === '/api/edu/tools' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const toolsRes = await handlePublicEduToolsApi(request, env);
      if (isAnonGet && toolsRes.status === 200) {
        recordPublicCachePut(edgeCache, request, toolsRes, ctx);
      }
      return toolsRes;
    }
    if (pathname === '/api/nav/config' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const navRes = await handlePublicNavConfigApi(request, env);
      if (isAnonGet && navRes.status === 200) {
        recordPublicCachePut(edgeCache, request, navRes, ctx);
      }
      return navRes;
    }
    if (pathname === '/api/public/study-library/suggest' && request.method === 'POST') {
      return handlePublicStudySuggestApi(request, env);
    }
    if (pathname === '/sitemap-jobs.xml') {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const jobsMapRes = await handleJobsDirectorySitemapXml(request, env);
      if (isAnonGet && jobsMapRes.status === 200) {
        recordPublicCachePut(edgeCache, request, jobsMapRes, ctx);
      }
      return jobsMapRes;
    }
    if (pathname === '/api/public/jobs-directory/overview' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicJobsOverviewApi(request, env);
    }
    if (pathname === '/api/public/jobs-directory/items' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicJobsItemsApi(request, env);
    }
    if (pathname === '/api/public/jobs-directory/suggest' && request.method === 'POST') {
      return handlePublicJobsSuggestApi(request, env);
    }
    if (pathname === '/sitemap-schemes.xml') {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const schemesMapRes = await handleSchemesDirectorySitemapXml(request, env);
      if (isAnonGet && schemesMapRes.status === 200) {
        recordPublicCachePut(edgeCache, request, schemesMapRes, ctx);
      }
      return schemesMapRes;
    }
    if (pathname === '/api/public/schemes-directory/overview' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicSchemesOverviewApi(request, env);
    }
    if (pathname === '/api/public/schemes-directory/items' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicSchemesItemsApi(request, env);
    }
    if (pathname === '/api/public/schemes-directory/suggest' && request.method === 'POST') {
      return handlePublicSchemesSuggestApi(request, env);
    }
    if (pathname === '/sitemap-community.xml') {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const communityMapRes = await handleCommunityDirectorySitemapXml(request, env);
      if (isAnonGet && communityMapRes.status === 200) {
        recordPublicCachePut(edgeCache, request, communityMapRes, ctx);
      }
      return communityMapRes;
    }
    if (pathname === '/api/public/community-directory/overview' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicCommunityOverviewApi(request, env);
    }
    if (pathname === '/api/public/community-directory/items' && (request.method === 'GET' || request.method === 'HEAD')) {
      return handlePublicCommunityItemsApi(request, env);
    }
    if (pathname === '/api/public/community-directory/suggest' && request.method === 'POST') {
      return handlePublicCommunitySuggestApi(request, env);
    }
    if (pathname === '/api/public/about-overview' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const aboutRes = await handlePublicAboutOverviewApi(request, env);
      if (isAnonGet && aboutRes.status === 200) {
        recordPublicCachePut(edgeCache, request, aboutRes, ctx);
      }
      return aboutRes;
    }
    if (pathname === '/sitemap.xml' || pathname === '/feed.xml' || pathname === '/rss.xml' || pathname === '/robots.txt' || pathname === '/llms.txt') {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      let seoRes;
      if (pathname === '/sitemap.xml') seoRes = await handleSitemapXml(request, env);
      else if (pathname === '/robots.txt') seoRes = handleRobotsTxt(request);
      else if (pathname === '/llms.txt') seoRes = await handleLlmsTxt(request, env);
      else seoRes = await handleRssFeed(request, env);
      if (isAnonGet && seoRes.status === 200) {
        recordPublicCachePut(edgeCache, request, seoRes, ctx);
      }
      return seoRes;
    }
    if (pathname.startsWith('/api/content/') || /^\/api\/(jobs|current-affairs|mock-tests|resources)(\/|$)/.test(pathname)) {
      if (edgeCache && isAnonGet) {
        const hit = await edgeCache.match(request);
        if (hit) return hit;
      }
      const apiRes = await handleContent(request, env);
      let finalRes = apiRes;
      if (isAnonGet && apiRes.status === 200) {
        if (!apiRes.headers.has('Cache-Control')) {
          const h = new Headers(apiRes.headers);
          h.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
          finalRes = new Response(apiRes.body, { status: apiRes.status, statusText: apiRes.statusText, headers: h });
        }
        recordPublicCachePut(edgeCache, request, finalRes, ctx);
      }
      return finalRes;
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

    if (pathname.startsWith('/study-library/')) {
      const studyRes = await handlePublicStudyLibraryRoute(request, env, url);
      if (studyRes) return studyRes;
    }
    if (pathname.startsWith('/jobs/')) {
      const jobsRes = await handlePublicJobsRoute(request, env, url);
      if (jobsRes) return jobsRes;
    }
    if (pathname === '/schemes' || pathname === '/schemes-benefits' || pathname === '/schemes-benefits/') {
      return Response.redirect(new URL('/schemes/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/schemes/')) {
      const schemesRes = await handlePublicSchemesRoute(request, env, pathname);
      if (schemesRes) return schemesRes;
    }
    if (pathname === '/community') {
      return Response.redirect(new URL('/community/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/community/')) {
      const communityRes = await handlePublicCommunityRoute(request, env, pathname);
      if (communityRes) return communityRes;
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
        const expTarget = getExpiredRedirect(live);
        if (expTarget && expTarget !== pathname) {
          return Response.redirect(new URL(expTarget, url.origin).toString(), 301);
        }
        const sitewide = await getSitewide(env);
        if (live || (sitewide && res.status === 200 && (res.headers.get('Content-Type') || '').includes('text/html'))) {
          const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'";
          if (res.status === 404 && live) {
            return new Response(request.method === 'HEAD' ? null : renderDynamicPage(live, sitewide), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Cache-Control': 'no-cache' } });
          }
          if (res.status === 200 && (res.headers.get('Content-Type') || '').includes('text/html')) {
            res = applyPageOverrides(res, live, sitewide);
            res = new Response(res.body, { status: 200, headers: new Headers(res.headers) });
            res.headers.set('Cache-Control', 'no-cache');
            res.headers.set('X-Frame-Options', 'SAMEORIGIN');
            if (!res.headers.get('Content-Security-Policy')) {
              res.headers.set('Content-Security-Policy', csp);
            }
          }
        }
      }
      if (pathname === '/' || pathname === '/index.html' || /^\/(jobs-careers|jobs|schemes|schemes-benefits|study-library|community|current-affairs|mock-tests|resources|student-dashboard|about)(\/|$)/.test(pathname)) {
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
    const task = (async () => {
      await publishDueScheduledPages(env);
      const maint = await runLifecycleMaintenance(env, { actorId: 'system:cron' });
      try {
        await runScheduledBackupPolicy(env, { force: false, actorEmail: 'system:cron' });
      } catch (e) {
        console.error('Scheduled backup policy error:', e);
      }
      return maint;
    })();
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(task);
    }
    return await task;
  }
};
