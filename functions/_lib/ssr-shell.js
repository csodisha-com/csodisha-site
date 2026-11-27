/* v155: canonical homepage shell for every server-rendered (SSR) page. Zero inline <style>/<script>/style="". */

import { hydrateJobsFeedResponse, renderSchemeCard } from './ssr-feeds.js';

export const CSO_SHELL_HEAD_LINKS = [
  '<link rel="alternate" type="application/rss+xml" title="Common Sense Odisha — Bilingual Alerts (RSS)" href="https://csodisha.com/feed.xml">',
  '<link rel="alternate" type="application/feed+json" title="Common Sense Odisha — Bilingual Alerts (JSON Feed)" href="https://csodisha.com/feed.json">',
  '<link rel="stylesheet" href="/assets/css/cso-themes.css?v=20261125v304">',
  '<link rel="stylesheet" href="/assets/style.css?v=20261125v306">',
  '<link rel="stylesheet" href="/assets/css/portal-shell.css?v=20261125v304">',
  '<link rel="stylesheet" href="/assets/css/pages/cso-dir-topbar.css?v=20261125v304">',
  '<link rel="stylesheet" href="/assets/css/pages/cso-detail-page.css?v=20261125v304">',
  '<script src="/assets/shared-header.js?v=20261127v411" defer></script>',
  '<script src="/assets/js/instant-search-overlay.js?v=20261127v396" defer></script>',
  '<script src="/assets/js/voice-search.js?v=20261125v304" defer></script>'
].join('\n  ');

export const CSO_SHELL_HEADER = `<a class="cso-skip-link" href="#main-content">Skip to main content</a>
<header class="top site-header__top" id="header-top" role="banner">
<a href="/" class="cso-brand-link" aria-label="Common Sense Odisha Home">
  <img src="/assets/img/cso-logo-96.webp?v=20261126v330" alt="Common Sense Odisha Logo" class="cso-brand-logo cso-brand-emblem" width="54" height="38" fetchpriority="high" decoding="async">
</a>
<span id="ctl" class="cso-contents"></span>
<span class="sp"></span>
<div class="acct">
  <a class="adm cso-adm-icon-only cso-adm-stealth" href="/admin/" role="button" aria-label="Admin" title="Admin"><svg class="adm-ico" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/></svg></a>
  <span aria-hidden="true" class="cso-desktop-auth-icon">👤</span>
  <span id="auth" class="cso-contents"></span>
</div>
</header>
<nav class="main-nav site-header__nav" id="cso-main-navbar" aria-label="Main Navigation"><div class="w" id="navw"></div></nav>`;

export const CSO_SHELL_FOOTER = `<footer><div class="w cso-footer-grid">
  <div class="cso-footer-zone1">
    <div class="cso-footer-brand-header">
      <img src="/assets/img/cso-logo-96.webp?v=20261126v330" alt="" aria-hidden="true" class="cso-footer-logo cso-brand-emblem" width="54" height="38" loading="lazy" decoding="async">
      <div class="cso-footer-title">Common Sense Odisha</div>
    </div>
    <p class="cso-footer-desc">Independent, open-access public resource platform.</p>
    <p class="cso-footer-copy">© 2026 Common Sense Odisha. All rights reserved.</p>
    <p class="cso-footer-contact">Contact: <a class="cso-footer-contact-link" href="mailto:contact@csodisha.com">contact@csodisha.com</a></p>
    <div class="cso-footer-social" role="navigation" aria-label="Official Social Channels">
      <a class="cso-footer-social-link" href="https://www.instagram.com/csodisha.official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg><span>Instagram</span></a>
      <a class="cso-footer-social-link" href="https://www.facebook.com/profile.php?id=61596187936770" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg><span>Facebook</span></a>
      <a class="cso-footer-social-link" href="https://x.com/csodisha" target="_blank" rel="noopener noreferrer" aria-label="X" title="X"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>X</span></a>
      <a class="cso-footer-social-link" href="https://t.me/csodisha" target="_blank" rel="noopener noreferrer" aria-label="Telegram" title="Telegram"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg><span>Telegram</span></a>
      <a class="cso-footer-social-link" href="https://whatsapp.com/channel/0029Vb9aQYZ1Hspy0nfzRe0w" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>WhatsApp</span></a>
      <a class="cso-footer-social-link" href="https://www.youtube.com/@CSOdisha" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg><span>YouTube</span></a>
    </div>
  </div>
  <div class="cso-footer-zone2">
    <div class="cso-footer-col">
      <h4>Explore</h4>
      <a href="/jobs/">Job Alerts</a>
      <a href="/exams/">Exam Updates &amp; Admit Cards</a>
      <a href="/exams/#results">Exam Results</a>
      <a href="/scholarships/">Scholarships</a>
      <a href="/study-materials/">Study Materials</a>
      <a href="/career-paths/">Career Paths</a>
      <a href="/odisha-special/">Odisha Special</a>
      <a href="/guides/">Informative Guides</a>
      <a href="/updates/">All Updates (Newsroom)</a>
    </div>
    <div class="cso-footer-col">
      <h4>Quick Hubs</h4>
      <a href="/mock-tests/">Live CBT Mock Tests</a>
      <a href="/current-affairs/">Daily Current Affairs</a>
      <a href="/schemes/">Odisha Welfare Schemes</a>
      <a href="/community/">Community</a>
      <a href="/about/">About CSO</a>
      <a href="/feed.xml">RSS Feed</a>
      <a href="/feed.json">JSON Feed</a>
    </div>
    <div class="cso-footer-col">
      <h4>Support &amp; Legal</h4>
      <a href="/support/#faqs">Help &amp; FAQs</a>
      <a href="/support/#report-error">Report an Error</a>
      <a href="/support/#suggest-resource">Suggest Resource</a>
      <a href="/privacy-policy/">Privacy Policy</a>
      <a href="/terms-of-use/">Terms of Use</a>
      <a href="/disclaimer/">Disclaimer</a>
      <a href="/copyright-policy/">Copyright Policy</a>
    </div>
  </div>
  <div class="cso-footer-zone3">
    <img class="cso-footer-odisha-map" src="/assets/odisha-footer-map.svg" alt="Odisha vector outline" width="81" height="64" loading="lazy" decoding="async">
    <div class="cso-footer-motto">Be Self-Reliant · Build a Better Tomorrow</div>
    <div class="cso-footer-lang-pills">
      <button type="button" class="cso-footer-lang-pill" data-cso-lang="en">English</button>
      <span class="cso-footer-lang-sep" aria-hidden="true">·</span>
      <button type="button" class="cso-footer-lang-pill" data-cso-lang="or">ଓଡ଼ିଆ</button>
    </div>
  </div>
</div></footer>`;

export function escShell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Strip internal Module #XX / Track #XX / Directory / Section N prefixes for clean public titles. */
export function cleanTopicTitle(value) {
  return decodeHtmlEntities(String(value ?? ''))
    .replace(/^(?:module|track)\s*#?\s*\d+\s*[—–\-:]\s*/i, '')
    .replace(/^directory\s*[—–\-:]\s*/i, '')
    .replace(/^section\s*\d+\s*[·—–\-:]\s*/i, '')
    .trim();
}

/** Accepts both {label,url} and {title,path|name} crumb shapes; drops empty segments. */
export function normalizeCrumbs(crumbs) {
  return (Array.isArray(crumbs) ? crumbs : [])
    .map((b) => ({
      label: cleanTopicTitle((b && (b.label ?? b.title ?? b.name)) ?? ''),
      url: String((b && (b.url ?? b.path)) ?? '').trim()
    }))
    .filter((b) => b.label);
}

/** Clean kicker: CS ODISHA › SCHEMES & BENEFITS › STATE WELFARE (uppercased by CSS; current page omitted, it is the H1). */
export function renderKicker(crumbs, rootLabel = 'CS Odisha') {
  const trail = normalizeCrumbs(crumbs).slice(0, -1);
  const parts = [`<a href="/">${escShell(rootLabel)}</a>`].concat(
    trail.map((b) => (b.url ? `<a href="${escShell(b.url)}">${escShell(b.label)}</a>` : `<span>${escShell(b.label)}</span>`))
  );
  return `<div class="cso-detail-kicker" role="navigation" aria-label="Breadcrumb">${parts.join('<span class="cso-detail-kicker-sep" aria-hidden="true">›</span>')}</div>`;
}

function decodeHtmlEntities(str) {
  return String(str ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function plainText(markup) {
  return decodeHtmlEntities(String(markup).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function sectionLabel(text) {
  const t = text.toLowerCase();
  if (t.includes('related study guides')) return 'Related Guides';
  if (t.includes('categories')) return 'Categories';
  if (t.includes('summary')) return 'Summary';
  if (t.includes('document')) return 'Documents';
  if (t.includes('eligib')) return 'Eligibility';
  if (t.includes('overview') || t.includes('how to apply')) return 'Overview';
  return text.length > 22 ? text.slice(0, 21) + '…' : text;
}

/** Inserts the sticky .cso-dir-topbar (Back to Explorer, section jump pills, active item pill) at the top of <main>. */
export function decorateMain(html, { backHref = '/', backLabel = '← Back to Explorer' } = {}) {
  const mainOpen = /<main\b[^>]*>/.exec(html);
  if (!mainOpen || html.includes('class="cso-dir-topbar')) return html;
  const start = mainOpen.index + mainOpen[0].length;
  const mainEnd = html.indexOf('</main>', start);
  let body = html.slice(start, mainEnd === -1 ? undefined : mainEnd);
  const rest = mainEnd === -1 ? '' : html.slice(mainEnd);

  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(body);
  const title = h1 ? cleanTopicTitle(plainText(h1[1])) : '';
  const pills = [];
  let n = 0;
  body = body.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
    if (n >= 4) return m;
    const label = sectionLabel(plainText(inner));
    if (!label || pills.some((p) => p.label === label)) return m;
    const existing = /\sid="([^"]+)"/.exec(attrs);
    const id = existing ? existing[1] : `cso-sec-${n + 1}`;
    n += 1;
    pills.push({ id, label });
    return existing ? m : `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  body = body.replace(/<a\b([^>]*)>([^<]*Official[^<]*Portal[^<]*)<\/a>/, (m, attrs, text) => {
    if (/\sid=/.test(attrs)) return m;
    pills.push({ id: 'cso-sec-portal', label: 'Official Portal' });
    return `<a${attrs} id="cso-sec-portal">${text}</a>`;
  });

  const jump = pills.length
    ? `<div class="cso-dir-jump" role="navigation" aria-label="Jump to section">${pills.map((p) => `<a class="cso-dir-jump-pill" href="#${escShell(p.id)}">${escShell(p.label)}</a>`).join('')}</div>`
    : '';
  const bar = `<header class="cso-dir-topbar cso-dir-topbar--detail" id="cso-detail-topbar" role="navigation" aria-label="Page context">` +
    `<a class="cso-dir-back" href="${escShell(backHref)}">${escShell(backLabel)}</a>${jump}` +
    (title ? `<span class="cso-dir-context-pill" aria-current="page">${escShell(title)}</span>` : '') +
    `</header>`;
  return html.slice(0, start) + bar + body + rest;
}

function fmtNum(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toLocaleString('en-IN') : '0';
}

async function safeBatch(db, stmts) {
  if (!db || typeof db.batch !== 'function') return null;
  try {
    return await db.batch(stmts);
  } catch {
    return null;
  }
}

/** Hydrate /schemes/, /jobs-careers/, /community/, and /about/ initial HTML server-side via env.DB.batch(). */
export async function hydrateExplorerIndexHtml(res, pathname, env, url) {
  const db = env && env.DB;
  if (!db) return res;

  /* v162: /jobs-careers/ landing + 6 Career Hub pages (pure string injection, no HTMLRewriter needed). */
  if (pathname === '/jobs-careers/' || pathname === '/jobs-careers/index.html' || /^\/jobs-careers\/[a-z0-9-]+\/?(?:index\.html)?$/.test(pathname)) {
    return hydrateJobsFeedResponse(res, pathname, url, env);
  }

  if (typeof HTMLRewriter === 'undefined') return res;

  if (pathname === '/schemes/' || pathname === '/schemes/index.html') {
    const results = await safeBatch(db, [
      db.prepare("SELECT i.id, i.slug, i.title, i.sponsor_level, i.department_name, i.benefit_amount, i.beneficiary_group, i.summary, i.official_apply_url, i.application_mode FROM schemes_directory_items i JOIN schemes_directory_folders f ON f.id = i.folder_id WHERE i.status = 'published' AND f.is_active = 1 ORDER BY i.official_portal_verified DESC, i.updated_at DESC LIMIT 12"),
      db.prepare("SELECT domain_slug, COUNT(*) AS cnt FROM schemes_directory_items WHERE status = 'published' GROUP BY domain_slug HAVING COUNT(*) >= 2"),
      db.prepare("SELECT COUNT(*) AS n FROM schemes_directory_items i JOIN schemes_directory_folders f ON f.id = i.folder_id WHERE i.status = 'published' AND f.is_active = 1")
    ]);
    if (!results) return res;
    const items = (results[0] && results[0].results) || [];
    const domainRows = (results[1] && results[1].results) || [];
    const total = Number((results[2] && results[2].results && results[2].results[0] && results[2].results[0].n) || items.length);
    const domainHtml = domainRows.map((d) => {
      const label = cleanTopicTitle(String(d.domain_slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      return `<a class="cso-schemes-domain-card" href="/schemes/${escShell(d.domain_slug)}/"><div class="cso-schemes-domain-top"><span>Category</span><span>${Number(d.cnt)} entries</span></div><div class="cso-schemes-domain-title">${escShell(label)}</div></a>`;
    }).join('');
    const itemsHtml = items.length
      ? items.map((it) => renderSchemeCard(it, cleanTopicTitle(it.title))).join('')
      : '<div class="cso-empty-state"><p>No published schemes in D1 yet. Author schemes in Admin Studio to publish live.</p></div>';
    return new HTMLRewriter()
      .on('#schemes-domain-grid', { element(el) { if (domainHtml) el.setInnerContent(domainHtml, { html: true }); else el.setInnerContent('', { html: false }); } })
      .on('#schemes-items-grid', { element(el) { el.setInnerContent(itemsHtml, { html: true }); el.setAttribute('data-ssr', '1'); } })
      .on('#schemes-results-count', { element(el) { el.setInnerContent(`Showing ${items.length} of ${fmtNum(total)} verified schemes`, { html: false }); } })
      .transform(res);
  }

  if (pathname === '/community/' || pathname === '/community/index.html') {
    const results = await safeBatch(db, [
      db.prepare("SELECT id, slug, title, district_region, membership_model, platform_channel, summary FROM community_directory_items WHERE status = 'published' ORDER BY is_featured DESC, updated_at DESC LIMIT 12"),
      db.prepare("SELECT domain_slug, COUNT(*) AS cnt FROM community_directory_items WHERE status = 'published' GROUP BY domain_slug HAVING COUNT(*) >= 2"),
      db.prepare("SELECT COUNT(*) AS n FROM community_directory_items WHERE status = 'published'")
    ]);
    if (!results) return res;
    const items = (results[0] && results[0].results) || [];
    const domainRows = (results[1] && results[1].results) || [];
    const total = Number((results[2] && results[2].results && results[2].results[0] && results[2].results[0].n) || items.length);
    const domainHtml = domainRows.map((d) => {
      const label = cleanTopicTitle(String(d.domain_slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      return `<a class="cso-comm-domain-card" href="/community/${escShell(d.domain_slug)}/"><div class="cso-comm-domain-top"><span>Community</span><span>${Number(d.cnt)} live</span></div><div class="cso-comm-domain-title">${escShell(label)}</div></a>`;
    }).join('');
    const itemsHtml = items.length
      ? items.map((it) => `<article class="cso-comm-item-card"><div class="cso-comm-item-meta"><span class="cso-comm-tag">${escShell(it.district_region || 'All Odisha')}</span><span>${escShell(it.membership_model || 'Open & Free')}</span></div><h3 class="cso-comm-item-title">${escShell(cleanTopicTitle(it.title))}</h3><div class="cso-comm-item-meta">${escShell(it.summary || '')}</div><div class="cso-comm-item-actions"><a class="cso-comm-btn cso-comm-btn-primary" href="/community/item/${escShell(encodeURIComponent(it.slug || it.id))}/">View Charter &amp; Details</a></div></article>`).join('')
      : '<div class="cso-empty-state"><p>No published community chapters in D1 yet. Author communities in Admin Studio to publish live.</p></div>';
    return new HTMLRewriter()
      .on('#community-domain-grid', { element(el) { if (domainHtml) el.setInnerContent(domainHtml, { html: true }); else el.setInnerContent('', { html: false }); } })
      .on('#community-items-grid', { element(el) { el.setInnerContent(itemsHtml, { html: true }); } })
      .on('#community-results-count', { element(el) { el.setInnerContent(`Showing ${items.length} of ${fmtNum(total)} verified communities`, { html: false }); } })
      .transform(res);
  }

  if (pathname === '/about/' || pathname === '/about/index.html') {
    const results = await safeBatch(db, [
      db.prepare("SELECT COUNT(*) AS n FROM study_library_items WHERE status = 'published'"),
      db.prepare("SELECT COUNT(*) AS n FROM jobs_directory_items WHERE status = 'published'"),
      db.prepare("SELECT COUNT(*) AS n FROM schemes_directory_items WHERE status = 'published'"),
      db.prepare("SELECT COUNT(*) AS n FROM community_directory_items WHERE status = 'published'"),
      db.prepare("SELECT COUNT(*) AS n FROM community_feedback WHERE status = 'resolved'")
    ]);
    if (!results) return res;
    const studyItems = Number(results[0]?.results?.[0]?.n || 0);
    const jobsItems = Number(results[1]?.results?.[0]?.n || 0);
    const schemesItems = Number(results[2]?.results?.[0]?.n || 0);
    const communityItems = Number(results[3]?.results?.[0]?.n || 0);
    const resolvedFeedback = Number(results[4]?.results?.[0]?.n || 0);
    const totalRes = studyItems + jobsItems + schemesItems + communityItems;
    const kpiHtml = [
      [fmtNum(totalRes), 'Total Verified Resources'],
      [fmtNum(studyItems), 'Study Library Guides'],
      [fmtNum(jobsItems), 'Jobs & Career Notices'],
      [fmtNum(schemesItems), 'Welfare Schemes'],
      [fmtNum(communityItems), 'Community Chapters'],
      [fmtNum(resolvedFeedback), 'Verified Corrections'],
      ['30', 'Odisha Districts Covered']
    ].map(([val, lbl]) => `<div class="cso-about-kpi"><div class="cso-about-kpi-val">${escShell(val)}</div><div class="cso-about-kpi-lbl">${escShell(lbl)}</div></div>`).join('');
    return new HTMLRewriter()
      .on('#about-kpis', { element(el) { el.setInnerContent(kpiHtml, { html: true }); } })
      .transform(res);
  }

  return res;
}
