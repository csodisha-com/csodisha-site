// Server-side gate for /admin/* static pages. Session role (from D1 users.role) is the
// only source of truth — nothing in browser storage is consulted.
import { getActor } from './rbac.js';

const STRICT_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; " +
  "font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'";
// The pre-existing 241-module console relies on Tailwind CDN + inline scripts, so it needs a looser
// policy. It is restricted to the 'admin' role. TODO: migrate it off inline/CDN assets and use STRICT_CSP.
const LEGACY_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";

const PUBLIC_PATHS = new Set(['/admin/login', '/admin/login.html', '/admin/cms/login.js', '/admin/cms/cms.css']);

function secured(res, csp, extra = {}) {
  const h = new Headers(res.headers);
  h.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  h.set('Content-Security-Policy', csp);
  h.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'same-origin');
  h.set('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function plain(status, message, csp = STRICT_CSP) {
  return secured(new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }), csp);
}

function isStrictPath(p) {
  return p === '/admin' || p === '/admin/' || p === '/admin/index.html' || p === '/admin/login' || p === '/admin/login.html' || p.startsWith('/admin/cms/');
}

export async function handleAdminPage(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') return plain(405, 'Method not allowed');
  const csp = isStrictPath(path) ? STRICT_CSP : LEGACY_CSP;

  if (!PUBLIC_PATHS.has(path)) {
    const actor = await getActor(request, env).catch(() => null);
    const wantsHtml = (request.headers.get('Accept') || '').includes('text/html');
    if (!actor) {
      if (wantsHtml) {
        return secured(new Response(null, { status: 302 }), csp,
          { Location: '/admin/login?next=' + encodeURIComponent(path === '/admin' ? '/admin/' : path) });
      }
      return plain(401, 'Sign in required', csp);
    }
    const allowed = isStrictPath(path) ? ['editor', 'admin'] : ['admin'];
    if (!allowed.includes(actor.role)) return plain(403, 'Forbidden: your account does not have access to this area.', csp);
  }
  const res = await env.ASSETS.fetch(request);
  return secured(res, csp);
}
