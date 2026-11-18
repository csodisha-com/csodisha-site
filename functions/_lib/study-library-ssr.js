import {
  resolvePublicStudyDirectory,
  resolvePublicStudyItem,
} from './study-library-studio.js';
import { CSO_SHELL_HEAD_LINKS, CSO_SHELL_HEADER, CSO_SHELL_FOOTER, decorateMain, renderKicker, normalizeCrumbs } from './ssr-shell.js';

const CANONICAL_ORIGIN = 'https://csodisha.com';

const STUDY_SSR_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
  // Strip any script/style tags or inline style/on* attributes to keep 100% CSP compliance.
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function buildHead({ title, description, canonicalUrl, jsonLdList = [] }) {
  const jsonLdScripts = jsonLdList
    .map((obj) => `<script type="application/ld+json">${safeJsonLd(obj)}</script>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  ${CSO_SHELL_HEAD_LINKS}
  <link rel="stylesheet" href="/study-library/assets/dashboard.css">
  <script src="/study-library/assets/ssr-actions.js" defer></script>
  ${jsonLdScripts}
</head>`;
}

function buildHeader() {
  return CSO_SHELL_HEADER;
}

function buildFooter() {
  return CSO_SHELL_FOOTER;
}

function htmlResponse(html, status = 200) {
  return new Response(decorateMain(html, { backHref: '/study-library/', backLabel: '← Back to Explorer' }), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=120, s-maxage=300' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': STUDY_SSR_CSP,
    },
  });
}

function renderNotFoundPage(pathLabel) {
  const canonicalUrl = `${CANONICAL_ORIGIN}/study-library/`;
  const html = `${buildHead({
    title: 'Directory or Resource Not Found — CSOdisha Study Library',
    description: 'The requested study library directory or resource could not be found or is not yet published.',
    canonicalUrl,
  })}
<body class="cso-sl-pub-body">
  ${buildHeader()}
  <main class="cso-sl-pub-main">
    <section class="cso-sl-pub-empty-card">
      <span class="cso-sl-pub-badge">404 · Not Available</span>
      <h1>Study Resource or Directory Not Found</h1>
      <p>We could not find a published directory or study resource at <code>${escHtml(pathLabel)}</code>.</p>
      <div class="cso-sl-pub-actions">
        <a class="cso-sl-pub-btn-primary" href="/study-library/">Explore All 10 Study Tracks</a>
        <a class="cso-sl-pub-btn-secondary" href="/">Back to CSOdisha Home</a>
      </div>
    </section>
  </main>
  ${buildFooter()}
</body>
</html>`;
  return htmlResponse(html, 404);
}

function formatVerifiedDate(iso) {
  if (!iso) return '';
  const d = String(iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

function renderSuggestBox({ domainSlug, folderId = '', itemSlug = '' }) {
  return `<section class="cso-sl-pub-suggest-box" aria-label="Suggest Topic or Report Outdated Content">
    <div class="cso-sl-pub-suggest-head">
      <button type="button" class="cso-sl-pub-btn-secondary cso-sl-pub-suggest-toggle">Report Outdated / Suggest Topic</button>
      <span class="cso-sl-pub-muted">DPDP Act 2023 safe — do not include phone numbers, emails, or personal IDs.</span>
    </div>
    <form class="cso-sl-pub-suggest-form" data-domain-slug="${escHtml(domainSlug)}" data-folder-id="${escHtml(folderId)}" data-item-slug="${escHtml(itemSlug)}" hidden>
      <div class="cso-sl-pub-suggest-grid">
        <label>
          <span>Type</span>
          <select name="suggestion_type">
            <option value="topic">Suggest Study Topic</option>
            <option value="correction">Report Outdated / Broken Link</option>
          </select>
        </label>
        <label>
          <span>Title / Summary</span>
          <input type="text" name="title" required minlength="4" maxlength="160" placeholder="e.g. Add 2026 OPSC OAS Prelims Paper 1 Official Key">
        </label>
      </div>
      <label>
        <span>Details (No personal data)</span>
        <textarea name="details" rows="2" maxlength="1200" placeholder="Describe the topic or outdated section..."></textarea>
      </label>
      <label>
        <span>Official Source URL (Optional)</span>
        <input type="url" name="source_url" placeholder="https://www.opsc.gov.in/...">
      </label>
      <div class="cso-sl-pub-actions">
        <button type="submit" class="cso-sl-pub-btn-primary">Submit Suggestion</button>
        <span class="cso-sl-pub-suggest-status cso-sl-pub-muted" role="status" aria-live="polite"></span>
      </div>
    </form>
  </section>`;
}

function renderDirectoryPage(resolved, url) {
  const {
    domain_slug,
    domain_title,
    folder,
    breadcrumb,
    children,
    parentFolder,
    siblingFolders,
    items,
  } = resolved;

  const activeType = (url.searchParams.get('type') || '').trim().toLowerCase();
  const activeLang = (url.searchParams.get('lang') || '').trim().toLowerCase();
  const basePath = `/study-library/${folder.slug_path}/`;
  const canonicalUrl = `${CANONICAL_ORIGIN}${basePath}`;
  const defaultTitle = folder.depth === 1
    ? `${folder.name} — CSOdisha Study Library`
    : `${folder.name} · ${domain_title} — CSOdisha Study Library`;
  const pageTitle = folder.seo_title || defaultTitle;
  const folderIntroEn = folder.description_en || folder.description || '';
  const folderIntroOr = folder.description_or || '';
  const pageDesc = folder.seo_description
    || folderIntroEn
    || `Explore ${folder.name} (${domain_title}) sub-directories, syllabus notes, PDFs, and verified study resources on CSOdisha.`;
  const verifiedDate = formatVerifiedDate(folder.verified_at);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Study Library',
        item: `${CANONICAL_ORIGIN}/study-library/`,
      },
      ...breadcrumb.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 2,
        name: b.name,
        item: `${CANONICAL_ORIGIN}/study-library/${b.slug_path}/`,
      })),
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: folder.name,
    description: pageDesc,
    url: canonicalUrl,
    hasPart: children.slice(0, 24).map((c) => ({
      '@type': 'CollectionPage',
      name: c.name,
      url: `${CANONICAL_ORIGIN}/study-library/${c.slug_path}/`,
    })),
  };

  const breadcrumbHtml = [
    '<a href="/study-library/">Study Library</a>',
    ...breadcrumb.map((b, idx) => {
      const isLast = idx === breadcrumb.length - 1;
      if (isLast) {
        return `<span class="cso-sl-pub-crumb-current" aria-current="page">${escHtml(b.name)}</span>`;
      }
      return `<a href="/study-library/${escHtml(b.slug_path)}/">${escHtml(b.name)}</a>`;
    }),
  ].join('<span class="cso-sl-pub-crumb-sep" aria-hidden="true">/</span>');

  const subDirsHtml = children.length > 0
    ? `<section class="cso-sl-pub-section" aria-labelledby="subdirs-heading">
        <div class="cso-sl-pub-section-head">
          <h2 id="subdirs-heading">Sub-Directories (${children.length})</h2>
          <span class="cso-sl-pub-muted">Select a sub-directory to browse deeper topics and materials</span>
        </div>
        <div class="cso-sl-pub-grid">
          ${children.map((child) => {
            const childUrl = `/study-library/${escHtml(child.slug_path)}/`;
            const countParts = [];
            if (child.child_count > 0) {
              countParts.push(`${child.child_count} ${child.child_count === 1 ? 'Sub-Directory' : 'Sub-Directories'}`);
            }
            if (child.total_item_count > 0) {
              countParts.push(`${child.total_item_count} ${child.total_item_count === 1 ? 'Resource' : 'Resources'}`);
            }
            const countLabel = countParts.length > 0 ? countParts.join(' · ') : 'Open Topic';
            return `<a class="cso-sl-pub-dir-card" href="${childUrl}">
              <div class="cso-sl-pub-dir-card-top">
                <span class="cso-sl-pub-dir-title">${escHtml(child.name)}</span>
                ${child.title_or ? `<span class="cso-sl-pub-dir-or">${escHtml(child.title_or)}</span>` : ''}
              </div>
              ${child.description ? `<p class="cso-sl-pub-dir-desc">${escHtml(child.description)}</p>` : ''}
              <div class="cso-sl-pub-dir-meta">
                <span class="cso-sl-pub-count-pill">${escHtml(countLabel)}</span>
                <span class="cso-sl-pub-arrow" aria-hidden="true">→</span>
              </div>
            </a>`;
          }).join('\n')}
        </div>
      </section>`
    : '';

  const filterTypes = [
    { key: '', label: 'All Types' },
    { key: 'note', label: 'Notes' },
    { key: 'pdf', label: 'PDFs' },
    { key: 'book', label: 'Books' },
    { key: 'pyq', label: 'PYQs' },
    { key: 'syllabus', label: 'Syllabus' },
    { key: 'video', label: 'Videos' },
  ];

  const filterBarHtml = `<div class="cso-sl-pub-filters" role="navigation" aria-label="Filter study resources">
    <div class="cso-sl-pub-filter-group">
      ${filterTypes.map((ft) => {
        const params = new URLSearchParams();
        if (ft.key) params.set('type', ft.key);
        if (activeLang) params.set('lang', activeLang);
        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;
        const activeClass = activeType === ft.key ? ' is-active' : '';
        return `<a class="cso-sl-pub-filter-pill${activeClass}" href="${escHtml(href)}">${escHtml(ft.label)}</a>`;
      }).join('')}
    </div>
    <div class="cso-sl-pub-filter-group">
      ${[
        { key: '', label: 'EN + OR' },
        { key: 'en', label: 'English' },
        { key: 'or', label: 'Odia' },
      ].map((fl) => {
        const params = new URLSearchParams();
        if (activeType) params.set('type', activeType);
        if (fl.key) params.set('lang', fl.key);
        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;
        const activeClass = activeLang === fl.key ? ' is-active' : '';
        return `<a class="cso-sl-pub-filter-pill${activeClass}" href="${escHtml(href)}">${escHtml(fl.label)}</a>`;
      }).join('')}
    </div>
  </div>`;

  const resourcesHtml = items.length > 0
    ? `<section class="cso-sl-pub-section" aria-labelledby="resources-heading">
        <div class="cso-sl-pub-section-head">
          <h2 id="resources-heading">Published Study Resources (${items.length})</h2>
        </div>
        ${filterBarHtml}
        <div class="cso-sl-pub-resource-list">
          ${items.map((item) => {
            const itemHref = `/study-library/item/${encodeURIComponent(item.slug || item.id)}/`;
            return `<article class="cso-sl-pub-resource-card">
              <div class="cso-sl-pub-resource-meta">
                <span class="cso-sl-pub-badge">${escHtml((item.resource_type || 'resource').toUpperCase())}</span>
                ${item.board_or_exam ? `<span class="cso-sl-pub-badge-soft">${escHtml(item.board_or_exam)}</span>` : ''}
                ${item.language_parity ? `<span class="cso-sl-pub-badge-soft">${escHtml(item.language_parity.toUpperCase())}</span>` : ''}
                ${item.is_featured ? '<span class="cso-sl-pub-badge-featured">Featured</span>' : ''}
              </div>
              <h3 class="cso-sl-pub-resource-title"><a href="${itemHref}">${escHtml(item.title)}</a></h3>
              ${item.summary ? `<p class="cso-sl-pub-resource-summary">${escHtml(item.summary)}</p>` : ''}
              <div class="cso-sl-pub-resource-actions">
                <a class="cso-sl-pub-btn-primary" href="${itemHref}">Read Resource</a>
                ${item.pdf_url ? `<a class="cso-sl-pub-btn-secondary" href="${escHtml(item.pdf_url)}" target="_blank" rel="noopener noreferrer">Download PDF${item.pdf_size_bytes ? ` (${escHtml(formatBytes(item.pdf_size_bytes))})` : ''}</a>` : ''}
              </div>
            </article>`;
          }).join('\n')}
        </div>
      </section>`
    : (children.length === 0 || activeType || activeLang)
      ? `<section class="cso-sl-pub-empty-card">
          ${(activeType || activeLang) ? filterBarHtml : ''}
          <h2>${(activeType || activeLang) ? 'No Matching Resources for Selected Filter' : 'No Published Resources Yet in This Topic'}</h2>
          <p>${(activeType || activeLang)
            ? 'Try clearing the active type or language filter to view all published resources in this directory.'
            : 'Our editorial team is curating verified notes, PDFs, and reference links for this directory.'}</p>
          <div class="cso-sl-pub-actions">
            ${(activeType || activeLang) ? `<a class="cso-sl-pub-btn-primary" href="${escHtml(basePath)}">Clear Filters</a>` : ''}
            ${parentFolder ? `<a class="cso-sl-pub-btn-secondary" href="/study-library/${escHtml(parentFolder.slug_path)}/">↑ Up to ${escHtml(parentFolder.name)}</a>` : ''}
            <a class="cso-sl-pub-btn-secondary" href="/study-library/">All 10 Study Tracks</a>
          </div>
        </section>`
      : '';

  const siblingsHtml = siblingFolders.length > 0
    ? `<section class="cso-sl-pub-section" aria-labelledby="siblings-heading">
        <div class="cso-sl-pub-section-head">
          <h2 id="siblings-heading">Related Sibling Directories</h2>
        </div>
        <div class="cso-sl-pub-sibling-chips">
          ${siblingFolders.slice(0, 12).map((sib) => `<a class="cso-sl-pub-sibling-chip" href="/study-library/${escHtml(sib.slug_path)}/">${escHtml(sib.name)}</a>`).join('')}
        </div>
      </section>`
    : '';

  const html = `${buildHead({
    title: pageTitle,
    description: pageDesc,
    canonicalUrl,
    jsonLdList: [breadcrumbJsonLd, collectionJsonLd],
  })}
<body class="cso-sl-pub-body">
  ${buildHeader()}
  <main class="cso-sl-pub-main">
    <nav class="cso-sl-pub-breadcrumbs" aria-label="Breadcrumb">
      ${breadcrumbHtml}
    </nav>

    <section class="cso-sl-pub-hero">
      <div class="cso-sl-pub-hero-meta">
        <span class="cso-sl-pub-badge">${escHtml(domain_title)}</span>
        <span class="cso-sl-pub-badge-soft">Depth ${folder.depth}</span>
        ${folder.featured_badge ? `<span class="cso-sl-pub-badge-featured">${escHtml(folder.featured_badge)}</span>` : ''}
        ${verifiedDate ? `<span class="cso-sl-pub-badge-soft">Last Verified: ${escHtml(verifiedDate)}</span>` : ''}
      </div>
      <h1>${escHtml(folder.name)}</h1>
      ${folder.title_or ? `<p class="cso-sl-pub-title-or">${escHtml(folder.title_or)}</p>` : ''}
      ${folderIntroEn ? `<p class="cso-sl-pub-hero-desc">${escHtml(folderIntroEn)}</p>` : ''}
      ${folderIntroOr ? `<p class="cso-sl-pub-hero-desc cso-sl-pub-title-or">${escHtml(folderIntroOr)}</p>` : ''}
      <div class="cso-sl-pub-stats-row">
        <span class="cso-sl-pub-stat"><strong>${children.length}</strong> Direct Sub-Directories</span>
        <span class="cso-sl-pub-stat"><strong>${folder.total_item_count}</strong> Total Published Resources</span>
        ${parentFolder ? `<a class="cso-sl-pub-stat-link" href="/study-library/${escHtml(parentFolder.slug_path)}/">↑ Parent: ${escHtml(parentFolder.name)}</a>` : ''}
        <button type="button" class="cso-sl-pub-btn-secondary cso-sl-pub-offline-btn">Save for Offline</button>
      </div>
    </section>

    ${subDirsHtml}
    ${resourcesHtml}
    ${siblingsHtml}
    ${renderSuggestBox({ domainSlug: domain_slug, folderId: folder.id })}
  </main>
  ${buildFooter()}
</body>
</html>`;

  return htmlResponse(html, 200);
}

function renderItemPage(resolved) {
  const { item, domain_title, related } = resolved;
  const canonicalUrl = `${CANONICAL_ORIGIN}/study-library/item/${encodeURIComponent(item.slug || item.id)}/`;
  const pageTitle = item.seo_title || `${item.title} — ${domain_title} | CSOdisha Study Library`;
  const pageDesc = item.seo_description || item.summary || `Verified ${item.resource_type || 'study'} resource in ${domain_title} on CSOdisha.`;

  const folderSegments = String(item.folder_path || '')
    .split('/')
    .filter(Boolean);
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Study Library',
      item: `${CANONICAL_ORIGIN}/study-library/`,
    },
  ];
  if (folderSegments.length > 0) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: domain_title,
      item: `${CANONICAL_ORIGIN}/study-library/${folderSegments[0]}/`,
    });
  }
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: breadcrumbItems.length + 1,
    name: item.title,
    item: canonicalUrl,
  });

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Article', 'LearningResource'],
    headline: item.title,
    name: item.title,
    description: pageDesc,
    url: canonicalUrl,
    dateModified: item.updated_at || undefined,
    learningResourceType: item.resource_type || 'study resource',
    educationalLevel: item.board_or_exam || undefined,
    inLanguage: item.language_parity === 'or' ? 'or' : 'en',
  };

  const links = Array.isArray(item.links) ? item.links : [];
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const bodyHtml = sanitizeRichBody(item.body_html);

  const html = `${buildHead({
    title: pageTitle,
    description: pageDesc,
    canonicalUrl,
    jsonLdList: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
      articleJsonLd,
    ],
  })}
<body class="cso-sl-pub-body">
  ${buildHeader()}
  <main class="cso-sl-pub-main">
    <nav class="cso-sl-pub-breadcrumbs" aria-label="Breadcrumb">
      <a href="/study-library/">Study Library</a>
      ${item.folder_path ? `<span class="cso-sl-pub-crumb-sep" aria-hidden="true">/</span><a href="/study-library/${escHtml(item.folder_path)}/">${escHtml(domain_title)}</a>` : ''}
      <span class="cso-sl-pub-crumb-sep" aria-hidden="true">/</span>
      <span class="cso-sl-pub-crumb-current" aria-current="page">${escHtml(item.title)}</span>
    </nav>

    <article class="cso-sl-pub-reader">
      <div class="cso-sl-pub-resource-meta">
        <span class="cso-sl-pub-badge">${escHtml((item.resource_type || 'resource').toUpperCase())}</span>
        ${item.board_or_exam ? `<span class="cso-sl-pub-badge-soft">${escHtml(item.board_or_exam)}</span>` : ''}
        ${item.subject_tag ? `<span class="cso-sl-pub-badge-soft">${escHtml(item.subject_tag)}</span>` : ''}
        ${item.language_parity ? `<span class="cso-sl-pub-badge-soft">Lang: ${escHtml(item.language_parity.toUpperCase())}</span>` : ''}
        ${formatVerifiedDate(item.verified_at) ? `<span class="cso-sl-pub-badge-soft">Last Verified: ${escHtml(formatVerifiedDate(item.verified_at))}</span>` : ''}
      </div>

      <h1>${escHtml(item.title)}</h1>
      ${item.summary ? `<p class="cso-sl-pub-reader-summary">${escHtml(item.summary)}</p>` : ''}

      ${item.cover_image_url ? `<figure class="cso-sl-pub-cover"><img src="${escHtml(item.cover_image_url)}" alt="${escHtml(item.title)}"></figure>` : ''}

      ${item.pdf_url ? `<div class="cso-sl-pub-pdf-card">
        <div>
          <strong>Study PDF Document</strong>
          <p class="cso-sl-pub-muted">${item.pdf_size_bytes ? `File size: ${escHtml(formatBytes(item.pdf_size_bytes))}` : 'Verified R2 Study Document'}</p>
        </div>
        <a class="cso-sl-pub-btn-primary" href="${escHtml(item.pdf_url)}" target="_blank" rel="noopener noreferrer">Open / Download PDF</a>
      </div>` : ''}

      ${bodyHtml ? `<div class="cso-sl-pub-reader-body">${bodyHtml}</div>` : ''}

      ${links.length > 0 ? `<section class="cso-sl-pub-links-box">
        <h2>Official Reference Links</h2>
        <ul>
          ${links.map((lnk) => {
            const href = typeof lnk === 'string' ? lnk : (lnk.url || '');
            const label = typeof lnk === 'string' ? lnk : (lnk.label || lnk.title || lnk.url || 'Reference Link');
            if (!href) return '';
            return `<li><a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a></li>`;
          }).join('')}
        </ul>
      </section>` : ''}

      ${tags.length > 0 ? `<div class="cso-sl-pub-tags">
        ${tags.map((tag) => `<span class="cso-sl-pub-tag">#${escHtml(tag)}</span>`).join('')}
      </div>` : ''}

      <div class="cso-sl-pub-actions">
        <button type="button" class="cso-sl-pub-btn-primary cso-sl-pub-offline-btn" data-pdf-url="${escHtml(item.pdf_url || '')}">Save for Offline</button>
        ${item.folder_path ? `<a class="cso-sl-pub-btn-secondary" href="/study-library/${escHtml(item.folder_path)}/">← Back to Directory</a>` : ''}
        <a class="cso-sl-pub-btn-secondary" href="/study-library/">All 10 Study Tracks</a>
      </div>
    </article>

    ${renderSuggestBox({ domainSlug: item.domain_slug, folderId: item.folder_id || '', itemSlug: item.slug || item.id })}

    ${Array.isArray(related) && related.length > 0 ? `<section class="cso-sl-pub-section" aria-labelledby="related-heading">
      <div class="cso-sl-pub-section-head">
        <h2 id="related-heading">Related Study Resources</h2>
      </div>
      <div class="cso-sl-pub-resource-list">
        ${related.map((rel) => `<article class="cso-sl-pub-resource-card">
          <div class="cso-sl-pub-resource-meta">
            <span class="cso-sl-pub-badge">${escHtml((rel.resource_type || 'resource').toUpperCase())}</span>
            ${rel.board_or_exam ? `<span class="cso-sl-pub-badge-soft">${escHtml(rel.board_or_exam)}</span>` : ''}
          </div>
          <h3 class="cso-sl-pub-resource-title"><a href="/study-library/item/${encodeURIComponent(rel.slug || rel.id)}/">${escHtml(rel.title)}</a></h3>
          ${rel.summary ? `<p class="cso-sl-pub-resource-summary">${escHtml(rel.summary)}</p>` : ''}
        </article>`).join('')}
      </div>
    </section>` : ''}
  </main>
  ${buildFooter()}
</body>
</html>`;

  return htmlResponse(html, 200);
}

export async function handlePublicStudyLibraryRoute(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null;
  }

  const pathname = url.pathname;
  if (!pathname.startsWith('/study-library/')) {
    return null;
  }

  if (
    pathname === '/study-library/' ||
    pathname === '/study-library/index.html' ||
    pathname.startsWith('/study-library/assets/') ||
    pathname.startsWith('/study-library/generated/')
  ) {
    return null;
  }

  const trimmed = pathname.replace(/^\/study-library\/+/, '').replace(/\/+$/, '');
  if (!trimmed) {
    return null;
  }

  const segments = trimmed.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  if (segments[0] === 'item' && segments.length >= 2) {
    const slugOrId = segments.slice(1).join('/');
    const resolvedItem = await resolvePublicStudyItem(env, slugOrId);
    if (!resolvedItem) {
      return renderNotFoundPage(pathname);
    }
    return renderItemPage(resolvedItem);
  }

  const type = url.searchParams.get('type') || '';
  const lang = url.searchParams.get('lang') || '';
  const q = url.searchParams.get('q') || '';
  const resolvedDir = await resolvePublicStudyDirectory(env, segments, { type, lang, q });
  if (!resolvedDir) {
    return renderNotFoundPage(pathname);
  }
  return renderDirectoryPage(resolvedDir, url);
}
