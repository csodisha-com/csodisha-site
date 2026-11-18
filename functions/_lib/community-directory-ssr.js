import {
  resolvePublicCommunityDirectory,
  resolvePublicCommunityItem
} from './community-directory-studio.js';
import { CSO_SHELL_HEAD_LINKS, CSO_SHELL_HEADER, CSO_SHELL_FOOTER, decorateMain, renderKicker, normalizeCrumbs } from './ssr-shell.js';

const CANONICAL_ORIGIN = 'https://csodisha.com';

const COMMUNITY_SSR_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function sanitizeRichBody(html) {
  const raw = String(html || '').trim();
  if (!raw) return '';
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function safeExternalUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
    return '';
  } catch {
    return '';
  }
}

function renderShellRaw({ title, description, canonicalPath, jsonLdList = [], bodyHtml }) {
  const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;
  const ldTags = jsonLdList
    .map((obj) => `<script type="application/ld+json">${safeJsonLd(obj)}</script>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#14532d">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  ${CSO_SHELL_HEAD_LINKS}
  <link rel="stylesheet" href="/community/assets/community-explorer.css">
  <script src="/community/assets/ssr-actions.js" defer></script>
  ${ldTags}
</head>
<body>
  ${CSO_SHELL_HEADER}
  <main class="cso-ssr-wrap">
    ${bodyHtml}
  </main>
  ${CSO_SHELL_FOOTER}
</body>
</html>`;
}

function renderShell(args) {
  return decorateMain(renderShellRaw(args), { backHref: '/community/', backLabel: '← Back to Explorer' });
}

function renderNotFoundPage(pathname) {
  const html = renderShell({
    title: 'Community or Directory Not Found | Common Sense Odisha',
    description: 'The requested community directory or chapter profile could not be found.',
    canonicalPath: pathname || '/community/',
    bodyHtml: `
      <section class="cso-comm-panel">
        <h1>404 — Community or Directory Not Found</h1>
        <p>This community profile or sub-directory may have been archived, hidden, or moved.</p>
        <div class="cso-comm-item-actions">
          <a class="cso-comm-btn cso-comm-btn-primary" href="/community/">Back to Community Explorer</a>
          <a class="cso-comm-btn" href="/">Home</a>
        </div>
      </section>
    `
  });
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': COMMUNITY_SSR_CSP,
      'Cache-Control': 'no-store'
    }
  });
}

function renderDirectoryPage(resolved) {
  const { domain, meta, canonicalPath, breadcrumbs, folder, children, items } = resolved;
  const pageTitle = folder ? `${folder.name_en} — ${meta.title} | Common Sense Odisha` : `${meta.title} | Community Directory | Common Sense Odisha`;
  const pageDesc = (folder && (folder.seo_description || folder.description_en)) || meta.summary || `Verified ${meta.title} communities and chapters on Common Sense Odisha.`;

  const crumbHtml = breadcrumbs
    .map((b, idx) => (idx === breadcrumbs.length - 1
      ? `<span>${escHtml(b.label)}</span>`
      : `<a href="${escHtml(b.url)}">${escHtml(b.label)}</a>`))
    .join(' <span>›</span> ');

  const childCards = children.length
    ? `<section class="cso-comm-panel">
        <h2>Sub-Directories (${children.length})</h2>
        <div class="cso-comm-domain-grid">
          ${children.map((ch) => `
            <a class="cso-comm-domain-card" href="${escHtml(`${canonicalPath}${encodeURIComponent(ch.slug)}/`)}">
              <div class="cso-comm-domain-top">
                <span>DIRECTORY</span>
                <span>${Number(ch.item_count || 0)} communit${Number(ch.item_count || 0) === 1 ? 'y' : 'ies'}</span>
              </div>
              <div class="cso-comm-domain-title">${escHtml(ch.name_en)}</div>
              <div class="cso-comm-domain-desc">${escHtml(ch.description_en || ch.seo_description || '')}</div>
            </a>
          `).join('')}
        </div>
      </section>`
    : '';

  const itemCards = items.length
    ? `<div class="cso-comm-items-grid">
        ${items.map((it) => {
          const joinUrl = safeExternalUrl(it.join_or_portal_url);
          return `
            <article class="cso-comm-item-card">
              <div class="cso-comm-item-meta">
                <span class="cso-comm-tag">${escHtml(it.district_region || 'All Odisha')}</span>
                <span>${escHtml(it.membership_model || 'Open & Free')}</span>
                <span>${escHtml(it.platform_channel || 'Hybrid')}</span>
              </div>
              <h3 class="cso-comm-item-title">${escHtml(it.title)}</h3>
              <div class="cso-comm-item-meta">${escHtml(it.summary || '')}</div>
              <div class="cso-comm-item-actions">
                <a class="cso-comm-btn cso-comm-btn-primary" href="${escHtml(`/community/item/${encodeURIComponent(it.slug || it.id)}/`)}">View Charter &amp; Details</a>
                ${joinUrl ? `<a class="cso-comm-btn" href="${escHtml(joinUrl)}" target="_blank" rel="noopener noreferrer">Join / Portal ↗</a>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>`
    : '<p>No published communities in this directory yet. Check sub-directories above or suggest a verified Odisha chapter below.</p>';

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: normalizeCrumbs(breadcrumbs).map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.label,
      item: `${CANONICAL_ORIGIN}${b.url}`
    }))
  };
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDesc,
    url: `${CANONICAL_ORIGIN}${canonicalPath}`
  };

  const bodyHtml = `
    <section class="cso-comm-hero">
      ${renderKicker(breadcrumbs)}
      <h1>${escHtml(folder ? folder.name_en : `Module #${meta.num} — ${meta.title}`)}</h1>
      ${folder && folder.title_or ? `<p class="cso-comm-hero-sub">${escHtml(folder.title_or)}</p>` : ''}
      <p class="cso-comm-hero-sub">${escHtml(pageDesc)}</p>
      <div class="cso-comm-item-actions">
        <a class="cso-comm-action-pill" href="/community/">All 10 Domains</a>
        <button type="button" class="cso-comm-action-pill cso-comm-ssr-suggest-toggle">Suggest Community / Report Safety Concern</button>
      </div>
    </section>

    ${childCards}

    <section class="cso-comm-panel">
      <h2>Verified Communities &amp; Chapters (${items.length})</h2>
      ${itemCards}
    </section>

    <section class="cso-comm-panel cso-ssr-suggest-box">
      <h2>Suggest a Community or Report a Safety Concern</h2>
      <form class="cso-ssr-suggest-form" data-domain-slug="${escHtml(domain)}" data-folder-id="${escHtml(folder ? folder.id : '')}" hidden>
        <select name="category" class="cso-comm-select" aria-label="Report Category">
          <option value="new_community">Suggest Verified Odisha Community / Chapter</option>
          <option value="correction">Correction / Broken Join Link</option>
          <option value="safety_report">Report Spam / Fake Group / Safety Concern</option>
        </select>
        <input type="url" name="suggested_url" class="cso-comm-input" placeholder="Official Chapter or Portal URL (https://...)">
        <textarea name="message" class="cso-ssr-textarea" rows="3" placeholder="Share details (DPDP Act 2023: do not include personal phone numbers, Aadhaar, or emails)..." required></textarea>
        <button type="submit" class="cso-comm-btn cso-comm-btn-primary">Submit for Safety &amp; Editorial Review</button>
        <div class="cso-ssr-suggest-status"></div>
      </form>
    </section>
  `;

  const html = renderShell({
    title: pageTitle,
    description: pageDesc,
    canonicalPath,
    jsonLdList: [collectionLd, breadcrumbLd],
    bodyHtml
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': COMMUNITY_SSR_CSP,
      'Cache-Control': 'public, max-age=120'
    }
  });
}

function renderItemReaderPage(resolved) {
  const { item, folder, domain, meta, breadcrumbs } = resolved;
  const canonicalPath = `/community/item/${encodeURIComponent(item.slug || item.id)}/`;
  const joinUrl = safeExternalUrl(item.join_or_portal_url);
  const pdfUrl = safeExternalUrl(item.pdf_url);
  const bodyContent = sanitizeRichBody(item.body_html) || `<p>${escHtml(item.summary || '')}</p>`;

  const crumbHtml = breadcrumbs
    .map((b, idx) => (idx === breadcrumbs.length - 1
      ? `<span>${escHtml(b.label)}</span>`
      : `<a href="${escHtml(b.url)}">${escHtml(b.label)}</a>`))
    .join(' <span>›</span> ');

  const isCharter = item.community_type === 'safety_governance';
  const itemLd = isCharter
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: item.title,
        description: item.summary || meta.summary,
        url: `${CANONICAL_ORIGIN}${canonicalPath}`,
        dateModified: item.updated_at || item.verified_at || undefined,
        publisher: { '@type': 'Organization', name: 'Common Sense Odisha', url: CANONICAL_ORIGIN }
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: item.title,
        description: item.summary || meta.summary,
        url: `${CANONICAL_ORIGIN}${canonicalPath}`,
        sameAs: joinUrl || undefined,
        areaServed: {
          '@type': 'AdministrativeArea',
          name: item.district_region || 'Odisha, India'
        }
      };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: normalizeCrumbs(breadcrumbs).map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.label,
      item: `${CANONICAL_ORIGIN}${b.url}`
    }))
  };

  const bodyHtml = `
    <section class="cso-comm-hero">
      ${renderKicker(breadcrumbs)}
      <h1>${escHtml(item.title)}</h1>
      ${item.title_or ? `<p class="cso-comm-hero-sub">${escHtml(item.title_or)}</p>` : ''}
      <p class="cso-comm-hero-sub">${escHtml(item.summary || '')}</p>
      <div class="cso-comm-item-actions">
        ${joinUrl ? `<a class="cso-comm-action-pill" href="${escHtml(joinUrl)}" target="_blank" rel="noopener noreferrer">Join / Official Portal ↗</a>` : ''}
        ${pdfUrl ? `<a class="cso-comm-action-pill" href="${escHtml(pdfUrl)}" target="_blank" rel="noopener noreferrer">Download Charter PDF</a>` : ''}
        <button type="button" class="cso-comm-action-pill cso-comm-ssr-offline-btn" data-pdf-url="${escHtml(pdfUrl)}">Save for Offline</button>
        <button type="button" class="cso-comm-action-pill cso-comm-ssr-print-btn">Print</button>
      </div>
    </section>

    <section class="cso-comm-panel">
      <h2>District &amp; Membership Summary</h2>
      <div class="cso-ssr-facts">
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">District / Region</div><div class="cso-ssr-fact-v">${escHtml(item.district_region || 'All Odisha (30 Districts)')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Membership Model</div><div class="cso-ssr-fact-v">${escHtml(item.membership_model || 'Open & Free')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Platform Channel</div><div class="cso-ssr-fact-v">${escHtml(item.platform_channel || 'Hybrid')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Safety Verification</div><div class="cso-ssr-fact-v">${item.safety_verified ? 'Verified by CSO Editorial' : 'Pending Review'}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Language Parity</div><div class="cso-ssr-fact-v">${escHtml(item.language_parity || 'EN+OR')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Domain</div><div class="cso-ssr-fact-v">${escHtml(meta.title)}</div></div>
      </div>

      <div class="cso-comm-summary-box">
        <h2>Charter &amp; Code of Conduct</h2>
        <p>${escHtml(item.charter_guidelines || 'Open, respectful civic participation. Zero spam, zero unsolicited commercial promotion, and strict DPDP Act 2023 privacy protection.')}</p>
      </div>

      ${item.activities_highlights ? `
      <div class="cso-comm-summary-box">
        <h2>Key Activities &amp; Schedule</h2>
        <p>${escHtml(item.activities_highlights)}</p>
      </div>` : ''}

      <div class="cso-comm-summary-box">
        <h2>Community Overview</h2>
        <div>${bodyContent}</div>
      </div>

      <div class="cso-comm-item-actions">
        ${joinUrl ? `<a class="cso-comm-btn cso-comm-btn-primary" href="${escHtml(joinUrl)}" target="_blank" rel="noopener noreferrer">Join / Open Official Portal ↗</a>` : ''}
        <a class="cso-comm-btn" href="${escHtml(`/community/${encodeURIComponent(domain)}/`)}">Back to ${escHtml(meta.title)}</a>
        <button type="button" class="cso-comm-btn cso-comm-ssr-suggest-toggle">Report Safety Concern / Update Link</button>
      </div>
    </section>

    <section class="cso-comm-panel cso-ssr-suggest-box">
      <form class="cso-ssr-suggest-form" data-domain-slug="${escHtml(domain)}" data-folder-id="${escHtml(folder ? folder.id : item.folder_id || '')}" data-item-id="${escHtml(item.id)}" hidden>
        <select name="category" class="cso-comm-select" aria-label="Issue Category">
          <option value="safety_report">Report Safety / Spam Concern</option>
          <option value="correction">Outdated Join Link or Details</option>
          <option value="new_community">Suggest Related Chapter</option>
        </select>
        <input type="url" name="suggested_url" class="cso-comm-input" placeholder="Updated Official URL (https://...)">
        <textarea name="message" class="cso-ssr-textarea" rows="3" placeholder="Describe the issue (DPDP Act 2023: do not include personal phone numbers, Aadhaar, or emails)..." required></textarea>
        <button type="submit" class="cso-comm-btn cso-comm-btn-primary">Submit Report</button>
        <div class="cso-ssr-suggest-status"></div>
      </form>
    </section>
  `;

  const html = renderShell({
    title: `${item.title} | Community Directory | Common Sense Odisha`,
    description: item.summary || meta.summary,
    canonicalPath,
    jsonLdList: [itemLd, breadcrumbLd],
    bodyHtml
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': COMMUNITY_SSR_CSP,
      'Cache-Control': 'public, max-age=120'
    }
  });
}

export async function handlePublicCommunityRoute(request, env, pathname) {
  if (!pathname || !pathname.startsWith('/community/')) return null;
  if (pathname === '/community/' || pathname.startsWith('/community/assets/')) return null;

  const trimmed = pathname.replace(/^\/community\//, '').replace(/\/+$/, '');
  if (!trimmed) return null;
  const segments = trimmed.split('/').filter(Boolean);
  if (!segments.length) return null;

  if (segments[0] === 'item' && segments.length >= 2) {
    const resolvedItem = await resolvePublicCommunityItem(env, decodeURIComponent(segments[1]));
    if (!resolvedItem) return renderNotFoundPage(pathname);
    return renderItemReaderPage(resolvedItem);
  }

  const resolvedDir = await resolvePublicCommunityDirectory(env, segments.map((s) => decodeURIComponent(s)));
  if (!resolvedDir) return renderNotFoundPage(pathname);
  return renderDirectoryPage(resolvedDir);
}
