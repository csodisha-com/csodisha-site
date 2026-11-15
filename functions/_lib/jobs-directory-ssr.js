import {
  resolvePublicJobsDirectory,
  resolvePublicJobsItem
} from './jobs-directory-studio.js';

const CANONICAL_ORIGIN = 'https://csodisha.com';

const JOBS_SSR_CSP = [
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
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function buildHead({ title, description, canonicalUrl, jsonLdList = [] }) {
  const jsonLdScripts = jsonLdList
    .map(obj => `<script type="application/ld+json">${safeJsonLd(obj)}</script>`)
    .join('\n  ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#14532d">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  <link rel="stylesheet" href="/jobs/assets/jobs-explorer.css">
  <script src="/jobs/assets/ssr-actions.js" defer></script>
  ${jsonLdScripts}
</head>`;
}

function buildHeader() {
  return `<header class="cso-pub-header">
  <div class="cso-pub-header-inner">
    <a class="cso-pub-brand" href="/">
      <span class="cso-jobs-badge" aria-hidden="true">CSO</span>
      <span>Common Sense Odisha</span>
    </a>
    <nav class="cso-pub-nav" aria-label="Primary">
      <a href="/">Home</a>
      <a href="/jobs/" aria-current="page">Jobs &amp; Careers</a>
      <a href="/study-library/">Study Library</a>
      <a href="/schemes-benefits/">Schemes</a>
      <a href="/mock-tests/">Mock Tests</a>
    </nav>
  </div>
</header>`;
}

function buildFooter() {
  return `<footer class="cso-pub-footer">
  Common Sense Odisha · Verified Public Recruitment, Scholarship &amp; Career Directory · <a href="/jobs/">All 8 Jobs &amp; Careers Domains</a>
</footer>`;
}

function buildBreadcrumbHtml(breadcrumbs) {
  return breadcrumbs
    .map((b, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      return isLast
        ? `<span>${escHtml(b.title)}</span>`
        : `<a href="${escHtml(b.path)}">${escHtml(b.title)}</a>`;
    })
    .join(' <span>›</span> ');
}

function buildBreadcrumbJsonLd(breadcrumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.title,
      item: `${CANONICAL_ORIGIN}${b.path}`
    }))
  };
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': JOBS_SSR_CSP,
      'Cache-Control': status === 200 ? 'public, max-age=120, s-maxage=300' : 'no-store'
    }
  });
}

function renderNotFoundPage(pathname) {
  const html = `${buildHead({
    title: 'Directory Page Not Found | Common Sense Odisha',
    description: 'The requested Jobs & Careers directory or notification could not be found.',
    canonicalUrl: `${CANONICAL_ORIGIN}${pathname}`
  })}
<body>
  ${buildHeader()}
  <main class="cso-ssr-wrap">
    <section class="cso-jobs-panel">
      <h1>Directory Page Not Found</h1>
      <p>The requested opportunity or sub-directory is unavailable or unpublished.</p>
      <a class="cso-jobs-btn cso-jobs-btn-primary" href="/jobs/">Browse All 8 Jobs &amp; Careers Domains</a>
    </section>
  </main>
  ${buildFooter()}
</body>
</html>`;
  return htmlResponse(html, 404);
}

function renderDirectoryPage(data) {
  const { domain, meta, canonicalPath, breadcrumbs, folder, children, items } = data;
  const pageTitle = (folder && folder.seo_title) || (folder ? `${folder.title} — ${meta.title} | CSOdisha` : `${meta.title} | Common Sense Odisha`);
  const pageDesc = (folder && (folder.seo_description || folder.description)) || meta.summary;
  const heading = folder ? folder.title : meta.title;
  const intro = (folder && (folder.intro_html || folder.description)) || meta.summary;
  const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;

  const jsonLdList = [
    buildBreadcrumbJsonLd(breadcrumbs),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: heading,
      description: pageDesc,
      url: canonicalUrl
    }
  ];

  const childrenHtml = children.length
    ? `<section class="cso-jobs-panel">
        <h2>Sub-Directories (${children.length})</h2>
        <div class="cso-jobs-domain-grid">
          ${children.map(ch => `
            <a class="cso-jobs-domain-card" href="${escHtml(ch.public_path)}">
              <div class="cso-jobs-domain-top"><span>DEPTH ${ch.depth}</span><span>Open →</span></div>
              <div class="cso-jobs-domain-title">${escHtml(ch.title)}</div>
              <div class="cso-jobs-domain-desc">${escHtml(ch.description || '')}</div>
            </a>`).join('')}
        </div>
      </section>`
    : '';

  const itemsHtml = items.length
    ? `<section class="cso-jobs-panel">
        <h2>Published Opportunities &amp; Guides (${items.length})</h2>
        <div class="cso-jobs-items-grid">
          ${items.map(it => `
            <article class="cso-jobs-item-card">
              <div class="cso-jobs-item-meta">
                <span class="cso-jobs-tag">${escHtml(it.item_type)}</span>
                ${it.qualification_tag ? `<span>${escHtml(it.qualification_tag)}</span>` : ''}
                ${it.deadline_date ? `<span>Deadline: ${escHtml(it.deadline_date)}</span>` : ''}
              </div>
              <h3 class="cso-jobs-item-title">${escHtml(it.title)}</h3>
              <p class="cso-jobs-domain-desc">${escHtml(it.summary || '')}</p>
              <div class="cso-jobs-item-actions">
                <a class="cso-jobs-btn cso-jobs-btn-primary" href="/jobs/item/${escHtml(it.slug)}/">Read Full Details</a>
                ${it.official_apply_url ? `<a class="cso-jobs-btn" href="${escHtml(it.official_apply_url)}" target="_blank" rel="noopener noreferrer">Official Portal</a>` : ''}
              </div>
            </article>`).join('')}
        </div>
      </section>`
    : `<section class="cso-jobs-panel"><p>No published opportunities in this sub-directory yet. Browse sibling sections or check back soon.</p></section>`;

  const html = `${buildHead({ title: pageTitle, description: pageDesc, canonicalUrl, jsonLdList })}
<body>
  ${buildHeader()}
  <main class="cso-ssr-wrap">
    <section class="cso-jobs-hero">
      <div class="cso-jobs-crumb">${buildBreadcrumbHtml(breadcrumbs)}</div>
      <h1>${escHtml(heading)}</h1>
      <p class="cso-jobs-hero-sub">${sanitizeRichBody(intro)}</p>
    </section>
    ${childrenHtml}
    ${itemsHtml}
  </main>
  ${buildFooter()}
</body>
</html>`;
  return htmlResponse(html, 200);
}

function renderItemReaderPage(data) {
  const { item, folder, domain, meta, breadcrumbs } = data;
  const canonicalUrl = `${CANONICAL_ORIGIN}/jobs/item/${item.slug}/`;
  const title = item.seo_title || `${item.title} | Common Sense Odisha`;
  const desc = item.seo_description || item.summary || meta.summary;

  const isJobPosting = item.item_type === 'job-notification';
  const itemJsonLd = isJobPosting
    ? {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: item.title,
        description: desc,
        datePosted: (item.start_date || item.created_at || '').slice(0, 10),
        validThrough: item.deadline_date || undefined,
        hiringOrganization: {
          '@type': 'Organization',
          name: item.recruiting_body || 'Government of Odisha'
        },
        jobLocation: {
          '@type': 'Place',
          address: { '@type': 'PostalAddress', addressRegion: 'Odisha', addressCountry: 'IN' }
        }
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: item.title,
        description: desc,
        dateModified: item.updated_at,
        publisher: { '@type': 'Organization', name: 'Common Sense Odisha' }
      };

  const firstPdf = Array.isArray(item.attachments) && item.attachments.length ? item.attachments[0] : null;
  const attHtml = Array.isArray(item.attachments) && item.attachments.length
    ? `<section class="cso-jobs-panel">
        <h2>Official Notification PDFs</h2>
        <div class="cso-jobs-item-actions">
          ${item.attachments.map(a => `<a class="cso-jobs-btn" href="${escHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escHtml(a.name || 'Download PDF')}</a>`).join('')}
        </div>
      </section>`
    : '';

  const linksHtml = Array.isArray(item.links) && item.links.length
    ? `<section class="cso-jobs-panel">
        <h2>Official Reference Links</h2>
        <div class="cso-jobs-item-actions">
          ${item.links.map(l => `<a class="cso-jobs-btn" href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escHtml(l.label || 'Reference Link')}</a>`).join('')}
        </div>
      </section>`
    : '';

  const html = `${buildHead({ title, description: desc, canonicalUrl, jsonLdList: [buildBreadcrumbJsonLd(breadcrumbs), itemJsonLd] })}
<body>
  ${buildHeader()}
  <main class="cso-ssr-wrap">
    <section class="cso-jobs-hero">
      <div class="cso-jobs-crumb">${buildBreadcrumbHtml(breadcrumbs)}</div>
      <h1>${escHtml(item.title)}</h1>
      <p class="cso-jobs-hero-sub">${escHtml(item.summary || '')}</p>
      <div class="cso-jobs-item-actions">
        ${item.official_apply_url ? `<a class="cso-jobs-btn cso-jobs-btn-primary" href="${escHtml(item.official_apply_url)}" target="_blank" rel="noopener noreferrer">Official Apply / Portal →</a>` : ''}
        <button type="button" class="cso-jobs-btn cso-jobs-ssr-offline-btn" data-pdf-url="${escHtml(firstPdf ? firstPdf.url : '')}">Save for Offline</button>
        <button type="button" class="cso-jobs-btn cso-jobs-ssr-print-btn">Print Clean Sheet</button>
      </div>
    </section>

    <section class="cso-jobs-panel">
      <div class="cso-ssr-facts">
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Recruiting / Issuing Body</div><div class="cso-ssr-fact-v">${escHtml(item.recruiting_body || meta.title)}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Qualification</div><div class="cso-ssr-fact-v">${escHtml(item.qualification_tag || 'See details')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Vacancies / Scope</div><div class="cso-ssr-fact-v">${escHtml(item.vacancies || 'Notified in PDF')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Deadline Date</div><div class="cso-ssr-fact-v">${escHtml(item.deadline_date || 'Open / Rolling')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Exam / Event Date</div><div class="cso-ssr-fact-v">${escHtml(item.exam_date || 'To be notified')}</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Verification Status</div><div class="cso-ssr-fact-v">${item.verified_at ? 'Verified (' + escHtml(item.verified_at.slice(0, 10)) + ')' : 'Editorial Review'}</div></div>
      </div>
      <div>${sanitizeRichBody(item.body_html) || `<p>${escHtml(item.summary || '')}</p>`}</div>
    </section>

    ${attHtml}
    ${linksHtml}

    <section class="cso-jobs-panel cso-ssr-suggest-box">
      <h2>Report Outdated / Dead Link</h2>
      <p class="cso-jobs-domain-desc">Help keep Odisha public recruitment links accurate. Do not include personal phone numbers, Aadhaar, or emails.</p>
      <button type="button" class="cso-jobs-btn cso-jobs-ssr-suggest-toggle">Report Correction or Update</button>
      <form class="cso-ssr-suggest-form" hidden data-domain-slug="${escHtml(domain)}" data-folder-id="${escHtml(folder.id)}" data-item-id="${escHtml(item.id)}">
        <select name="category" class="cso-jobs-select" aria-label="Report category">
          <option value="outdated-link">Dead / Outdated Official Link</option>
          <option value="deadline-update">Extended Deadline / Corrigendum</option>
          <option value="correction">Fact / Qualification Correction</option>
        </select>
        <textarea name="message" class="cso-ssr-textarea" rows="3" placeholder="Describe the update or correction..." required></textarea>
        <input name="suggested_url" class="cso-jobs-input" type="url" placeholder="Official .gov.in / .nic.in reference URL (optional)">
        <button type="submit" class="cso-jobs-btn cso-jobs-btn-primary">Submit Report</button>
        <div class="cso-ssr-suggest-status" aria-live="polite"></div>
      </form>
    </section>
  </main>
  ${buildFooter()}
</body>
</html>`;
  return htmlResponse(html, 200);
}

export async function handlePublicJobsRoute(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const pathname = url.pathname;
  if (pathname === '/jobs/' || pathname === '/jobs/index.html' || pathname.startsWith('/jobs/assets/')) {
    return null;
  }
  const rest = pathname.replace(/^\/jobs\/?/, '').replace(/\/+$/, '');
  if (!rest) return null;
  const segs = rest.split('/').filter(Boolean).map(decodeURIComponent);

  if (segs[0] === 'item' && segs[1]) {
    const itemData = await resolvePublicJobsItem(env, segs[1]);
    if (!itemData) return renderNotFoundPage(pathname);
    return renderItemReaderPage(itemData);
  }

  const dirData = await resolvePublicJobsDirectory(env, segs);
  if (!dirData) return renderNotFoundPage(pathname);
  return renderDirectoryPage(dirData);
}
