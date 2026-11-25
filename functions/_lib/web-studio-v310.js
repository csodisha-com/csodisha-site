// Folder #8 Backend: Web & Page Studio (v310)
// Manages D1 `institutional_pages` & `site_snippets`, serves dynamic institutional
// routes (/about/, /terms/, /privacy/, /copyright/, /disclaimer/, /contact/) with
// graceful static HTML fallback, and injects live `site_snippets` into public footers.
import { HttpError, json, readJson, validationError } from './http.js';
import { CSO_SHELL_HEAD_LINKS, CSO_SHELL_HEADER, CSO_SHELL_FOOTER, escShell } from './ssr-shell.js';
import { registerCacheInvalidator } from './edge-cache-invalidator.js';
import { recordAdminAuditLog } from '../api/admin/system-ops.js';

export const INSTITUTIONAL_PAGE_DEFS = [
  { slug: 'about', label: 'About Common Sense Odisha', publicPath: '/about/', aliases: ['/about/', '/about/index.html'] },
  { slug: 'terms', label: 'Terms of Use', publicPath: '/terms-of-use/', aliases: ['/terms/', '/terms-of-use/', '/terms-of-use/index.html'] },
  { slug: 'privacy', label: 'Privacy Policy', publicPath: '/privacy-policy/', aliases: ['/privacy/', '/privacy-policy/', '/privacy-policy/index.html'] },
  { slug: 'copyright', label: 'Copyright Policy', publicPath: '/copyright-policy/', aliases: ['/copyright/', '/copyright-policy/', '/copyright-policy/index.html'] },
  { slug: 'disclaimer', label: 'Disclaimer', publicPath: '/disclaimer/', aliases: ['/disclaimer/', '/disclaimer/index.html'] },
  { slug: 'contact', label: 'Contact & Grievance Desk', publicPath: '/contact/', aliases: ['/contact/'] }
];

export const SITE_SNIPPET_DEFS = [
  {
    key: 'footer_copyright',
    label: 'Global Footer Copyright Line',
    description: 'Rendered in the footer copyright line across all public pages.',
    placeholder_en: '© 2026 Common Sense Odisha. All rights reserved.',
    placeholder_or: '© ୨୦୨୬ କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା। ସର୍ବସ୍ୱତ୍ୱ ସଂରକ୍ଷିତ।'
  },
  {
    key: 'official_source_disclaimer',
    label: 'Official Source Disclaimer',
    description: 'Injected into public footers and institutional disclaimers clarifying CSO is an independent public-information platform.',
    placeholder_en: 'Common Sense Odisha is an independent civic information platform and is not affiliated with any government department. Always verify final details on official .gov.in portals.',
    placeholder_or: 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ଏକ ସ୍ୱାଧୀନ ନାଗରିକ ସୂଚନା ପ୍ଲାଟଫର୍ମ ଏବଂ କୌଣସି ସରକାରୀ ବିଭାଗ ସହିତ ଜଡିତ ନୁହେଁ। ସର୍ବଦା ସରକାରୀ .gov.in ପୋର୍ଟାଲରେ ଯାଞ୍ଚ କରନ୍ତୁ।'
  }
];

const VALID_PAGE_SLUGS = new Set(INSTITUTIONAL_PAGE_DEFS.map(d => d.slug));
const VALID_SNIPPET_KEYS = new Set(SITE_SNIPPET_DEFS.map(d => d.key));

const ROUTE_TO_INSTITUTIONAL_SLUG = {
  '/about/': 'about',
  '/about/index.html': 'about',
  '/terms/': 'terms',
  '/terms-of-use/': 'terms',
  '/terms-of-use/index.html': 'terms',
  '/privacy/': 'privacy',
  '/privacy-policy/': 'privacy',
  '/privacy-policy/index.html': 'privacy',
  '/copyright/': 'copyright',
  '/copyright-policy/': 'copyright',
  '/copyright-policy/index.html': 'copyright',
  '/disclaimer/': 'disclaimer',
  '/disclaimer/index.html': 'disclaimer',
  '/contact/': 'contact'
};

const STATIC_ALIAS_FALLBACK = {
  '/terms/': '/terms-of-use/index.html',
  '/privacy/': '/privacy-policy/index.html',
  '/copyright/': '/copyright-policy/index.html'
};

const CACHE_TTL_MS = 60 * 1000;
let _schemaReady = false;
let _snippetsMemo = { at: 0, map: null };
const _pagesMemo = new Map();

export function invalidateWebStudioCache() {
  _snippetsMemo = { at: 0, map: null };
  _pagesMemo.clear();
}
registerCacheInvalidator(invalidateWebStudioCache);

export async function ensureWebStudioSchema(db) {
  if (!db || _schemaReady) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS institutional_pages (
        slug TEXT PRIMARY KEY,
        title_en TEXT NOT NULL DEFAULT '',
        title_or TEXT NOT NULL DEFAULT '',
        body_en TEXT NOT NULL DEFAULT '',
        body_or TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by TEXT NOT NULL DEFAULT ''
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS site_snippets (
        key TEXT PRIMARY KEY,
        value_en TEXT NOT NULL DEFAULT '',
        value_or TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    _schemaReady = true;
  } catch {
    // Allow graceful fallback if DB is read-only or unavailable
  }
}

export function resolveInstitutionalSlug(pathname) {
  const clean = String(pathname || '').replace(/\/{2,}/g, '/');
  return ROUTE_TO_INSTITUTIONAL_SLUG[clean] || null;
}

export async function getInstitutionalPageRow(env, slug) {
  if (!env || !env.DB || !VALID_PAGE_SLUGS.has(slug)) return null;
  const now = Date.now();
  const cached = _pagesMemo.get(slug);
  if (cached && (now - cached.at) < CACHE_TTL_MS) return cached.row;
  try {
    const row = await env.DB.prepare(
      'SELECT slug, title_en, title_or, body_en, body_or, updated_at, updated_by FROM institutional_pages WHERE slug = ?'
    ).bind(slug).first();
    _pagesMemo.set(slug, { at: now, row: row || null });
    return row || null;
  } catch {
    return null;
  }
}

export async function getPublicSiteSnippets(env) {
  if (!env || !env.DB) return {};
  const now = Date.now();
  if (_snippetsMemo.at && (now - _snippetsMemo.at) < CACHE_TTL_MS && _snippetsMemo.map) {
    return _snippetsMemo.map;
  }
  try {
    const { results } = await env.DB.prepare(
      'SELECT key, value_en, value_or, updated_at FROM site_snippets'
    ).all();
    const map = {};
    for (const r of results || []) {
      if (r && r.key) {
        map[r.key] = {
          key: r.key,
          value_en: String(r.value_en || '').trim(),
          value_or: String(r.value_or || '').trim(),
          updated_at: r.updated_at || ''
        };
      }
    }
    _snippetsMemo = { at: now, map };
    return map;
  } catch {
    return {};
  }
}

/** Strict-CSP plain/Markdown body formatter: escapes all HTML first, outputs clean semantic tags only. */
export function renderSafeInstitutionalBody(raw) {
  const text = String(raw || '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  const blocks = text.split(/\n{2,}/);
  const out = [];
  for (const blk of blocks) {
    const lines = blk.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && /^###\s+/.test(lines[0])) {
      out.push(`<h3>${escShell(lines[0].replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (lines.length === 1 && /^##\s+/.test(lines[0])) {
      out.push(`<h2>${escShell(lines[0].replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (lines.every(l => /^[-*•]\s+/.test(l))) {
      const lis = lines.map(l => `<li>${escShell(l.replace(/^[-*•]\s+/, ''))}</li>`).join('');
      out.push(`<ul>${lis}</ul>`);
      continue;
    }
    if (/^##\s+/.test(lines[0]) && lines.length > 1) {
      const heading = escShell(lines[0].replace(/^##\s+/, ''));
      const rest = lines.slice(1).map(l => `<p>${escShell(l)}</p>`).join('');
      out.push(`<section class="cso-legal-card"><h2>${heading}</h2>${rest}</section>`);
      continue;
    }
    out.push(`<section class="cso-legal-card"><p>${lines.map(escShell).join('<br>')}</p></section>`);
  }
  return out.join('\n');
}

function formatEffectiveDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  } catch {
    return String(iso);
  }
}

export function renderInstitutionalPageHtml(row, def, snippets = {}) {
  const titleEn = String(row.title_en || def.label || 'Institutional Page').trim();
  const titleOr = String(row.title_or || '').trim();
  const bodyEnHtml = renderSafeInstitutionalBody(row.body_en);
  const bodyOrHtml = renderSafeInstitutionalBody(row.body_or);
  const updatedLabel = formatEffectiveDate(row.updated_at);
  const canonical = `https://csodisha.com${def.publicPath}`;
  const desc = (String(row.body_en || titleEn).replace(/\s+/g, ' ').trim()).slice(0, 155);

  let footerHtml = CSO_SHELL_FOOTER;
  const copySnip = snippets.footer_copyright;
  if (copySnip && copySnip.value_en) {
    footerHtml = footerHtml.replace(
      /<p class="cso-footer-copy">[\s\S]*?<\/p>/,
      `<p class="cso-footer-copy" data-cso-snippet="footer_copyright">${escShell(copySnip.value_en)}</p>`
    );
  }
  const discSnip = snippets.official_source_disclaimer;
  if (discSnip && discSnip.value_en) {
    footerHtml = footerHtml.replace(
      /<p class="cso-footer-contact">/,
      `<p class="cso-footer-disclaimer" data-cso-snippet="official_source_disclaimer">${escShell(discSnip.value_en)}</p>\n    <p class="cso-footer-contact">`
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="description" content="${escShell(desc)}">
  <title>${escShell(titleEn)} | Common Sense Odisha</title>
  <link rel="canonical" href="${escShell(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escShell(titleEn)} | Common Sense Odisha">
  <meta property="og:description" content="${escShell(desc)}">
  <meta property="og:url" content="${escShell(canonical)}">
  <link rel="icon" href="/assets/img/favicon-32x32.png" type="image/png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  ${CSO_SHELL_HEAD_LINKS}
  <link rel="stylesheet" href="/assets/css/pages/cso-subpage-module.css">
</head>
<body>
  ${CSO_SHELL_HEADER}
  <main id="main-content" class="cso-legal-main" data-cso-institutional-slug="${escShell(row.slug)}">
    <div class="cso-legal-intro">
      <p><a href="/">Home</a> / ${escShell(titleEn)}</p>
      <h1>${escShell(titleEn)}</h1>
      ${titleOr ? `<p class="cso-legal-odia-title" lang="or">${escShell(titleOr)}</p>` : ''}
      ${updatedLabel ? `<p class="cso-legal-note">Common Sense Odisha (CSO) · Effective / Last Updated: ${escShell(updatedLabel)}</p>` : ''}
    </div>
    ${bodyEnHtml}
    ${bodyOrHtml ? `<section class="cso-legal-card cso-legal-odia-section" lang="or"><h2>ଓଡ଼ିଆ ସଂସ୍କରଣ (Odia)</h2>${bodyOrHtml}</section>` : ''}
    ${discSnip && discSnip.value_en ? `<section class="cso-legal-card" data-cso-snippet="official_source_disclaimer"><h2>Official Source Disclaimer</h2><p>${escShell(discSnip.value_en)}</p>${discSnip.value_or ? `<p lang="or">${escShell(discSnip.value_or)}</p>` : ''}</section>` : ''}
  </main>
  ${footerHtml}
  <script src="/assets/cso-auth-client.js" defer></script>
</body>
</html>`;
}

/**
 * Serves dynamic institutional pages (/about/, /terms/, /privacy/, /copyright/, /disclaimer/, /contact/)
 * from D1 `institutional_pages` when customized; falls back gracefully to existing static HTML otherwise.
 */
export async function handlePublicInstitutionalRoute(request, env, pathname, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const slug = resolveInstitutionalSlug(pathname);
  if (!slug) return null;

  const def = INSTITUTIONAL_PAGE_DEFS.find(d => d.slug === slug);
  if (!def) return null;

  const row = await getInstitutionalPageRow(env, slug);
  const isCustomized = Boolean(row && (String(row.body_en || '').trim() || String(row.body_or || '').trim()));

  // Preserve /about/ interactive portal shell; if customized, let static HTML load and inject custom notice below
  if (slug === 'about') {
    return null;
  }

  if (isCustomized) {
    const snippets = await getPublicSiteSnippets(env);
    const html = renderInstitutionalPageHtml(row, def, snippets);
    return new Response(request.method === 'HEAD' ? null : html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
        'X-CSO-Institutional-Live': '1'
      }
    });
  }

  // Graceful fallback for short aliases (/terms/, /privacy/, /copyright/) when not yet customized in D1
  const fallbackAsset = STATIC_ALIAS_FALLBACK[pathname];
  if (fallbackAsset && env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    const assetRes = await env.ASSETS.fetch(new Request(new URL(fallbackAsset, url.origin).toString(), { method: request.method }));
    if (assetRes && assetRes.status === 200) {
      return applySiteSnippetsToResponse(assetRes, env);
    }
  }
  return null;
}

/** Injects live `site_snippets` (and customized `about` institutional copy if present) into public HTML responses. */
export async function applySiteSnippetsToResponse(res, env, pathname = '') {
  if (!res || res.status !== 200) return res;
  const ct = res.headers.get('Content-Type') || '';
  if (!ct.includes('text/html')) return res;

  const snippets = await getPublicSiteSnippets(env);
  const copyEn = snippets.footer_copyright && snippets.footer_copyright.value_en ? snippets.footer_copyright.value_en : '';
  const discEn = snippets.official_source_disclaimer && snippets.official_source_disclaimer.value_en ? snippets.official_source_disclaimer.value_en : '';
  const discOr = snippets.official_source_disclaimer && snippets.official_source_disclaimer.value_or ? snippets.official_source_disclaimer.value_or : '';

  let customAbout = null;
  if (pathname === '/about/' || pathname === '/about/index.html') {
    const ab = await getInstitutionalPageRow(env, 'about');
    if (ab && (String(ab.body_en || '').trim() || String(ab.body_or || '').trim())) {
      customAbout = ab;
    }
  }

  if (!copyEn && !discEn && !customAbout) return res;

  if (typeof HTMLRewriter !== 'undefined') {
    let rw = new HTMLRewriter();
    if (copyEn) {
      rw = rw.on('.cso-footer-copy', {
        element(el) {
          el.setAttribute('data-cso-snippet', 'footer_copyright');
          el.setInnerContent(copyEn, { html: false });
        }
      });
    }
    if (discEn) {
      rw = rw.on('.cso-footer-zone1 .cso-footer-contact', {
        element(el) {
          const orPart = discOr ? `<span class="cso-footer-disclaimer-or" lang="or"> ${escShell(discOr)}</span>` : '';
          el.before(`<p class="cso-footer-disclaimer" data-cso-snippet="official_source_disclaimer">${escShell(discEn)}${orPart}</p>`, { html: true });
        }
      });
    }
    if (customAbout) {
      const updated = formatEffectiveDate(customAbout.updated_at);
      const htmlBlock = `<section class="cso-legal-card cso-about-live-institutional" data-cso-institutional-slug="about">` +
        `<h2>${escShell(customAbout.title_en || 'About Common Sense Odisha')}</h2>` +
        (customAbout.title_or ? `<p class="cso-legal-odia-title" lang="or">${escShell(customAbout.title_or)}</p>` : '') +
        (updated ? `<p class="cso-legal-note">Effective / Last Updated: ${escShell(updated)}</p>` : '') +
        renderSafeInstitutionalBody(customAbout.body_en) +
        (customAbout.body_or ? `<div class="cso-legal-odia-section" lang="or">${renderSafeInstitutionalBody(customAbout.body_or)}</div>` : '') +
        `</section>`;
      rw = rw.on('#main-content', {
        element(el) {
          el.append(htmlBlock, { html: true });
        }
      });
    }
    return rw.transform(res);
  }

  // Fallback for Node test environments without Cloudflare HTMLRewriter
  let html = await res.text();
  if (copyEn) {
    html = html.replace(
      /<p class="cso-footer-copy">[\s\S]*?<\/p>/,
      `<p class="cso-footer-copy" data-cso-snippet="footer_copyright">${escShell(copyEn)}</p>`
    );
  }
  if (discEn) {
    html = html.replace(
      /<p class="cso-footer-contact">/,
      `<p class="cso-footer-disclaimer" data-cso-snippet="official_source_disclaimer">${escShell(discEn)}</p><p class="cso-footer-contact">`
    );
  }
  const headers = new Headers(res.headers);
  headers.delete('Content-Length');
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}

// ============================================================================
// ADMIN API: /api/admin/web-studio/*
// ============================================================================
export async function handleAdminWebStudioApi(request, env, actor, id, sub, ctx) {
  await ensureWebStudioSchema(env.DB);
  const method = request.method;

  // GET /api/admin/web-studio/pages — list all 6 institutional pages (live D1 + uncustomized status)
  if (id === 'pages' && !sub && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT slug, title_en, title_or, body_en, body_or, updated_at, updated_by FROM institutional_pages ORDER BY slug'
    ).all();
    const bySlug = new Map((results || []).map(r => [r.slug, r]));
    const items = INSTITUTIONAL_PAGE_DEFS.map(def => {
      const row = bySlug.get(def.slug);
      return {
        slug: def.slug,
        label: def.label,
        public_path: def.publicPath,
        customized: Boolean(row && (String(row.body_en || '').trim() || String(row.body_or || '').trim())),
        title_en: row ? row.title_en : '',
        title_or: row ? row.title_or : '',
        body_en: row ? row.body_en : '',
        body_or: row ? row.body_or : '',
        updated_at: row ? row.updated_at : null,
        updated_by: row ? row.updated_by : null
      };
    });
    return json({ ok: true, items, total_customized: items.filter(i => i.customized).length });
  }

  // PUT /api/admin/web-studio/pages/:slug — save institutional/legal page with automatic timestamp
  if (id === 'pages' && sub && (method === 'PUT' || method === 'POST')) {
    const slug = String(sub).trim().toLowerCase();
    if (!VALID_PAGE_SLUGS.has(slug)) {
      throw validationError({ slug: 'Unsupported institutional page slug' });
    }
    const body = await readJson(request, 200000);
    const titleEn = String(body.title_en || '').trim().slice(0, 200);
    const titleOr = String(body.title_or || '').trim().slice(0, 240);
    const bodyEn = String(body.body_en || '').trim().slice(0, 100000);
    const bodyOr = String(body.body_or || '').trim().slice(0, 100000);
    if (!titleEn) throw validationError({ title_en: 'English title is required' });
    if (!bodyEn && !bodyOr) throw validationError({ body_en: 'Provide page content in English or Odia' });

    const nowIso = new Date().toISOString();
    const updatedBy = (actor && actor.email) || 'admin';
    await env.DB.prepare(
      `INSERT INTO institutional_pages (slug, title_en, title_or, body_en, body_or, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title_en = excluded.title_en,
         title_or = excluded.title_or,
         body_en = excluded.body_en,
         body_or = excluded.body_or,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    ).bind(slug, titleEn, titleOr, bodyEn, bodyOr, nowIso, updatedBy).run();

    invalidateWebStudioCache();
    recordAdminAuditLog(env, request, actor, 'web_studio.page.update', `institutional_pages:${slug}`, { title_en: titleEn }, ctx);

    return json({
      ok: true,
      item: {
        slug,
        title_en: titleEn,
        title_or: titleOr,
        body_en: bodyEn,
        body_or: bodyOr,
        updated_at: nowIso,
        updated_by: updatedBy,
        customized: true
      }
    });
  }

  // DELETE /api/admin/web-studio/pages/:slug — revert to static HTML fallback
  if (id === 'pages' && sub && method === 'DELETE') {
    const slug = String(sub).trim().toLowerCase();
    if (!VALID_PAGE_SLUGS.has(slug)) {
      throw validationError({ slug: 'Unsupported institutional page slug' });
    }
    await env.DB.prepare('DELETE FROM institutional_pages WHERE slug = ?').bind(slug).run();
    invalidateWebStudioCache();
    recordAdminAuditLog(env, request, actor, 'web_studio.page.reset', `institutional_pages:${slug}`, null, ctx);
    return json({ ok: true, slug, customized: false });
  }

  // GET /api/admin/web-studio/snippets — list global snippets
  if (id === 'snippets' && !sub && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT key, value_en, value_or, updated_at FROM site_snippets ORDER BY key'
    ).all();
    const byKey = new Map((results || []).map(r => [r.key, r]));
    const items = SITE_SNIPPET_DEFS.map(def => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        placeholder_en: def.placeholder_en,
        placeholder_or: def.placeholder_or,
        value_en: row ? row.value_en : '',
        value_or: row ? row.value_or : '',
        updated_at: row ? row.updated_at : null,
        customized: Boolean(row && (String(row.value_en || '').trim() || String(row.value_or || '').trim()))
      };
    });
    return json({ ok: true, items });
  }

  // PUT /api/admin/web-studio/snippets/:key — save global snippet
  if (id === 'snippets' && sub && (method === 'PUT' || method === 'POST')) {
    const key = String(sub).trim().toLowerCase();
    if (!VALID_SNIPPET_KEYS.has(key)) {
      throw validationError({ key: 'Unsupported snippet key' });
    }
    const body = await readJson(request, 20000);
    const valueEn = String(body.value_en || '').trim().slice(0, 1500);
    const valueOr = String(body.value_or || '').trim().slice(0, 1500);
    const nowIso = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO site_snippets (key, value_en, value_or, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_en = excluded.value_en,
         value_or = excluded.value_or,
         updated_at = excluded.updated_at`
    ).bind(key, valueEn, valueOr, nowIso).run();

    invalidateWebStudioCache();
    recordAdminAuditLog(env, request, actor, 'web_studio.snippet.update', `site_snippets:${key}`, { length_en: valueEn.length }, ctx);

    return json({
      ok: true,
      item: { key, value_en: valueEn, value_or: valueOr, updated_at: nowIso, customized: Boolean(valueEn || valueOr) }
    });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown web-studio route');
}

export async function handlePublicWebStudioSnippetsApi(request, env) {
  const map = await getPublicSiteSnippets(env);
  return json({ ok: true, snippets: map });
}
