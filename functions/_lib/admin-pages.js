// Server-side gate for /admin/* static pages. Session role (from D1 users.role) is the
// only source of truth — nothing in browser storage is consulted.
import { getActor } from './rbac.js';
import siteManifest from '../../admin/site-manifest.json';

// One strict policy for the whole /admin/ area (Master Command Suite included): no inline
// scripts/styles, no CDNs. The suite's legacy inline handlers/styles are translated by
// /admin/suite-boot.js (CSSOM + whitelisted dispatcher) — see docs/ADMIN-CMS.md.
const STRICT_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; " +
  "font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'";

const PUBLIC_PATHS = new Set(['/admin/login', '/admin/login.html', '/admin/cms/login.js', '/admin/cms/cms.css']);
// Admin-only static areas (mock fixtures from the pre-D1 console). Everything else under /admin/ is staff (editor + admin);
// what each role can DO is enforced per-endpoint by /api/admin/* requireRole.
const ADMIN_ONLY_PREFIXES = ['/admin/data/legacy-api/'];

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

export async function handleAdminPage(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') return plain(405, 'Method not allowed');
  const csp = STRICT_CSP;

  // The pre-suite URL keeps working: send it to the Master Command Suite.
  if (path === '/admin/legacy' || path === '/admin/legacy.html') {
    return secured(new Response(null, { status: 301 }), csp, { Location: '/admin/' });
  }

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
    const allowed = ADMIN_ONLY_PREFIXES.some(p => path.startsWith(p)) ? ['admin'] : ['editor', 'admin'];
    if (!allowed.includes(actor.role)) return plain(403, 'Forbidden: your account does not have access to this area.', csp);
  }
  if (path === '/admin/site-manifest.json') {
    return secured(
      new Response(JSON.stringify(siteManifest), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }),
      csp,
      { 'Cache-Control': 'private, max-age=300' }
    );
  }
  const res = await env.ASSETS.fetch(request);
  // Large static assets (the suite is ~12 MB of JS): allow conditional revalidation, never shared caching.
  // `no-cache` forces a round trip through this gate on every load, so role changes apply immediately.
  const isStatic = /\.(js|css|json)$/.test(path);
  return secured(res, csp, isStatic ? { 'Cache-Control': 'private, no-cache, max-age=0, must-revalidate' } : {});
}
