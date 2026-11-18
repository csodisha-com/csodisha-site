import {
  resolvePublicSchemesDirectory,
  resolvePublicSchemesItem
} from './schemes-directory-studio.js';
import { CSO_SHELL_HEAD_LINKS, CSO_SHELL_HEADER, CSO_SHELL_FOOTER, decorateMain, renderKicker, normalizeCrumbs } from './ssr-shell.js';

const CANONICAL_ORIGIN = 'https://csodisha.com';

const SCHEMES_SSR_CSP = [
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
  <link rel="stylesheet" href="/schemes/assets/schemes-explorer.css">
  <script src="/schemes/assets/ssr-actions.js" defer></script>
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
  return decorateMain(renderShellRaw(args), { backHref: '/schemes/', backLabel: '← Back to Explorer' });
}

function renderNotFoundPage(pathname) {
  const html = renderShell({
    title: 'Scheme or Directory Not Found | Common Sense Odisha',
    description: 'The requested scheme directory or benefit guide could not be found.',
    canonicalPath: pathname || '/schemes/',
    bodyHtml: `
      <section class="cso-schemes-panel">
        <h1>404 — Scheme or Directory Not Found</h1>
        <p>This scheme page or sub-directory may have been archived, hidden, or moved.</p>
        <div class="cso-schemes-item-actions">
          <a class="cso-schemes-btn cso-schemes-btn-primary" href="/schemes/">Back to Schemes &amp; Benefits Explorer</a>
          <a class="cso-schemes-btn" href="/">Home</a>
        </div>
      </section>
    `
  });
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': SCHEMES_SSR_CSP,
      'Cache-Control': 'no-store'
    }
  });
}

function renderDirectoryPage(resolved) {
  const { domain, meta, canonicalPath, breadcrumbs, folder, children, items } = resolved;
  const pageTitle = folder ? `${folder.name} — ${meta.title} | Common Sense Odisha` : `${meta.title} | Schemes & Benefits | Common Sense Odisha`;
  const pageDesc = (folder && (folder.seo_description || folder.description)) || meta.description || `Verified ${meta.title} schemes and citizen guides on Common Sense Odisha.`;

  const crumbHtml = breadcrumbs
    .map((b, idx) => (idx === breadcrumbs.length - 1
      ? `<span>${escHtml(b.label)}</span>`
      : `<a href="${escHtml(b.url)}">${escHtml(b.label)}</a>`))
    .join(' <span>›</span> ');

  const childCards = children.length
    ? `<section class="cso-schemes-panel">
        <h2>Sub-Directories (${children.length})</h2>
        <div class="cso-schemes-domain-grid">
          ${children.map((ch) => `
            <a class="cso-schemes-domain-card" href="${escHtml(`${canonicalPath}${encodeURIComponent(ch.slug)}/`)}">
              <div class="cso-schemes-domain-top">
                <span>DIRECTORY</span>
                <span>${Number(ch.item_count || 0)} scheme${Number(ch.item_count || 0) === 1 ? '' : 's'}</span>
              </div>
              <div class="cso-schemes-domain-title">${escHtml(ch.name)}</div>
              <div class="cso-schemes-domain-desc">${escHtml(ch.description || ch.seo_description || '')}</div>
            </a>
          `).join('')}
        </div>
      </section>`
    : '';

  const itemCards = items.length
    ? `<div class="cso-schemes-items-grid">
        ${items.map((it) => {
          const applyUrl = safeExternalUrl(it.official_apply_url);
          return `
            <article class="cso-schemes-item-card">
              <div class="cso-schemes-item-meta">
                <span class="cso-schemes-tag">${escHtml(it.sponsor_level || 'Odisha State')}</span>
                <span>${escHtml(it.department_name || 'Govt of Odisha')}</span>
                ${it.benefit_amount ? `<span>Benefit: ${escHtml(it.benefit_amount)}</span>` : ''}
              </div>
              <h3 class="cso-schemes-item-title">${escHtml(it.title)}</h3>
              <div class="cso-schemes-item-meta">${escHtml(it.beneficiary_group ? `Beneficiaries: ${it.beneficiary_group} · ` : '')}${escHtml(it.summary || '')}</div>
              <div class="cso-schemes-item-actions">
                <a class="cso-schemes-btn cso-schemes-btn-primary" href="${escHtml(`/schemes/item/${encodeURIComponent(it.slug || it.id)}/`)}">View Eligibility &amp; Details</a>
                ${applyUrl ? `<a class="cso-schemes-btn" href="${escHtml(applyUrl)}" target="_blank" rel="noopener noreferrer">Official Apply Portal ↗</a>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>`
    : '<p>No published schemes in this directory yet. Check sub-directories above or submit a scheme suggestion below.</p>';

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
    <section class="cso-schemes-hero">
      ${renderKicker(breadcrumbs)}
      <h1>${escHtml(folder ? folder.name : `Module #${meta.num} — ${meta.title}`)}</h1>
      <p class="cso-schemes-hero-sub">${escHtml(pageDesc)}</p>
      <div class="cso-schemes-item-actions">
        <a class="cso-schemes-action-pill" href="/schemes/">All 8 Domains</a>
        <button type="button" class="cso-schemes-action-pill cso-schemes-ssr-suggest-toggle">Report Missing Scheme / Dead Link</button>
      </div>
    </section>

    ${childCards}

    <section class="cso-schemes-panel">
      <h2>Verified Schemes &amp; Guides (${items.length})</h2>
      ${itemCards}
    </section>

    <section class="cso-schemes-panel cso-ssr-suggest-box">
      <h2>Suggest a Correction or Missing Scheme</h2>
      <form class="cso-ssr-suggest-form" data-domain-slug="${escHtml(domain)}" data-folder-id="${escHtml(folder ? folder.id : '')}" hidden>
        <select name="category" class="cso-schemes-select" aria-label="Issue Category">
          <option value="missing-scheme">Missing Odisha / Central Scheme</option>
          <option value="outdated-link">Outdated Link / Dead Portal</option>
          <option value="eligibility-update">Eligibility or Benefit Amount Update</option>
        </select>
        <input type="url" name="suggested_url" class="cso-schemes-input" placeholder="Official Govt Portal URL (https://...)">
        <textarea name="message" class="cso-ssr-textarea" rows="3" placeholder="Share scheme name or correction details (no personal Aadhaar/phone info)..." required></textarea>
        <button type="submit" class="cso-schemes-btn cso-schemes-btn-primary">Submit for Editorial Verification</button>
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
      'Content-Security-Policy': SCHEMES_SSR_CSP,
      'Cache-Control': 'public, max-age=120'
    }
  });
}

function parseDocumentsList(item) {
  const rawDocs = item.documents_required || (item.meta && item.meta.documents) || '';
  if (Array.isArray(rawDocs)) return rawDocs.map((d) => String(d || '').trim()).filter(Boolean);
  if (typeof rawDocs === 'string' && rawDocs.trim()) {
    return rawDocs.split(/\n|;|,/).map((d) => d.trim()).filter(Boolean);
  }
  return [
    'Aadhaar Card (linked with active mobile number & bank account for DBT)',
    'Ration Card / Residence Certificate (Odisha)',
    'Active Bank Passbook (NPCI / Aadhaar-seeded)',
    'Income / Caste / Category Certificate (if applicable)'
  ];
}

function renderItemReaderPage(resolved) {
  const { item, folder, domain, meta, breadcrumbs } = resolved;
  const canonicalPath = `/schemes/item/${encodeURIComponent(item.slug || item.id)}/`;
  const applyUrl = safeExternalUrl(item.official_apply_url);
  const pdfUrl = safeExternalUrl(item.pdf_url);
  const docs = parseDocumentsList(item);
  const bodyContent = sanitizeRichBody(item.body_html) || `<p>${escHtml(item.summary || '')}</p>`;

  const crumbHtml = breadcrumbs
    .map((b, idx) => (idx === breadcrumbs.length - 1
      ? `<span>${escHtml(b.label)}</span>`
      : `<a href="${escHtml(b.url)}">${escHtml(b.label)}</a>`))
    .join(' <span>›</span> ');

  const isGuide = item.scheme_type === 'eligibility_tool' || item.scheme_type === 'citizen_service';
  const itemLd = isGuide
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: item.title,
        description: item.summary || meta.description,
        url: `${CANONICAL_ORIGIN}${canonicalPath}`,
        dateModified: item.updated_at || item.last_verified_at || undefined,
        publisher: { '@type': 'Organization', name: 'Common Sense Odisha', url: CANONICAL_ORIGIN }
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'GovernmentService',
        name: item.title,
        serviceType: item.scheme_type || 'Government Welfare Scheme',
        description: item.summary || meta.description,
        url: `${CANONICAL_ORIGIN}${canonicalPath}`,
        serviceOperator: {
          '@type': 'GovernmentOrganization',
          name: item.department_name || 'Government of Odisha'
        },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: item.sponsor_level === 'Central Govt' ? 'India' : 'Odisha, India'
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
    <section class="cso-schemes-hero">
      ${renderKicker(breadcrumbs)}
      <h1>${escHtml(item.title)}</h1>
      ${item.title_or ? `<p class="cso-schemes-hero-sub">${escHtml(item.title_or)}</p>` : ''}
      <p class="cso-schemes-hero-sub">${escHtml(item.summary || '')}</p>
      <div class="cso-schemes-item-actions">
        ${applyUrl ? `<a class="cso-schemes-action-pill" href="${escHtml(applyUrl)}" target="_blank" rel="noopener noreferrer">Official Apply Portal ↗</a>` : ''}
        ${pdfUrl ? `<a class="cso-schemes-action-pill" href="${escHtml(pdfUrl)}" target="_blank" rel="noopener noreferrer">Download Guidelines PDF</a>` : ''}
        <button type="button" class="cso-schemes-action-pill cso-schemes-ssr-offline-btn" data-pdf-url="${escHtml(pdfUrl)}">Save for Offline</button>
        <button type="button" class="cso-schemes-action-pill cso-schemes-ssr-print-btn">Print</button>
      </div>
    </section>

    <section class="cso-schemes-panel">
      <h2>Benefit &amp; Eligibility Summary</h2>
      <div class="cso-ssr-facts">
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Sponsor Level</div><div class="cso-ssr-fact-v">${escHtml(item.sponsor_level || 'Odisha State')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Nodal Department</div><div class="cso-ssr-fact-v">${escHtml(item.department_name || 'Govt of Odisha')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Beneficiary Group</div><div class="cso-ssr-fact-v">${escHtml(item.beneficiary_group || 'Eligible Citizens')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Benefit / Assistance</div><div class="cso-ssr-fact-v">${escHtml(item.benefit_amount || 'As per scheme norms')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Income / Eligibility Limit</div><div class="cso-ssr-fact-v">${escHtml(item.income_limit || 'See official guidelines')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Application Mode &amp; Deadline</div><div class="cso-ssr-fact-v">${escHtml(item.application_mode || 'Online Portal')}${item.application_deadline ? ` · ${escHtml(item.application_deadline)}` : ''}</div></div>
      </div>

      <div class="cso-schemes-summary-box">
        <h2>Documents Checklist</h2>
        <ul class="cso-schemes-checklist">
          ${docs.map((d) => `<li>${escHtml(d)}</li>`).join('')}
        </ul>
      </div>

      <div class="cso-schemes-summary-box">
        <h2>Scheme Overview &amp; How to Apply</h2>
        <div>${bodyContent}</div>
      </div>

      <div class="cso-schemes-item-actions">
        ${applyUrl ? `<a class="cso-schemes-btn cso-schemes-btn-primary" href="${escHtml(applyUrl)}" target="_blank" rel="noopener noreferrer">Proceed to Official Portal ↗</a>` : ''}
        <a class="cso-schemes-btn" href="${escHtml(`/schemes/${encodeURIComponent(domain)}/`)}">Back to ${escHtml(meta.title)}</a>
        <button type="button" class="cso-schemes-btn cso-schemes-ssr-suggest-toggle">Report Outdated / Dead Link</button>
      </div>
    </section>

    <section class="cso-schemes-panel cso-ssr-suggest-box">
      <form class="cso-ssr-suggest-form" data-domain-slug="${escHtml(domain)}" data-folder-id="${escHtml(folder ? folder.id : item.folder_id || '')}" data-item-id="${escHtml(item.id)}" hidden>
        <select name="category" class="cso-schemes-select" aria-label="Issue Category">
          <option value="outdated-link">Outdated / Dead Official Link</option>
          <option value="eligibility-update">Eligibility or Benefit Amount Changed</option>
          <option value="deadline-update">Application Deadline Update</option>
        </select>
        <input type="url" name="suggested_url" class="cso-schemes-input" placeholder="Updated Official URL (https://...)">
        <textarea name="message" class="cso-ssr-textarea" rows="3" placeholder="Describe what needs updating (do not include personal Aadhaar/phone info)..." required></textarea>
        <button type="submit" class="cso-schemes-btn cso-schemes-btn-primary">Submit Report</button>
        <div class="cso-ssr-suggest-status"></div>
      </form>
    </section>
  `;

  const html = renderShell({
    title: `${item.title} | Schemes & Benefits | Common Sense Odisha`,
    description: item.summary || meta.description,
    canonicalPath,
    jsonLdList: [itemLd, breadcrumbLd],
    bodyHtml
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': SCHEMES_SSR_CSP,
      'Cache-Control': 'public, max-age=120'
    }
  });
}

export async function handlePublicSchemesRoute(request, env, pathname) {
  if (!pathname || !pathname.startsWith('/schemes/')) return null;
  if (pathname === '/schemes/' || pathname.startsWith('/schemes/assets/')) return null;

  const trimmed = pathname.replace(/^\/schemes\//, '').replace(/\/+$/, '');
  if (!trimmed) return null;
  const segments = trimmed.split('/').filter(Boolean);
  if (!segments.length) return null;

  if (segments[0] === 'item' && segments.length >= 2) {
    const resolvedItem = await resolvePublicSchemesItem(env, decodeURIComponent(segments[1]));
    if (!resolvedItem) return renderNotFoundPage(pathname);
    return renderItemReaderPage(resolvedItem);
  }

  const resolvedDir = await resolvePublicSchemesDirectory(env, segments.map((s) => decodeURIComponent(s)));
  if (!resolvedDir) return renderNotFoundPage(pathname);
  return renderDirectoryPage(resolvedDir);
}
