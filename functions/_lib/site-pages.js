// Live D1 page overrides + dynamic page rendering for the edge worker.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (typeof u === 'string' && ((u.startsWith('/') && !u.startsWith('//')) || /^https?:\/\//i.test(u))) ? u : '#';
export const PAGE_STATUSES = ['published', 'draft', 'scheduled', 'archived', 'trash'];

export function normalizeRoute(r) {
  let p = String(r || '').trim();
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/{2,}/g, '/');
}
export function routeCandidates(pathname) {
  const p = normalizeRoute(pathname);
  const set = new Set([p]);
  if (p !== '/') {
    if (p.endsWith('/')) { set.add(p.slice(0, -1)); set.add(p + 'index.html'); }
    else set.add(p + '/');
  } else set.add('/index.html');
  return [...set];
}
export const SITEWIDE_ROUTE = '/__sitewide';
export async function getSitewide(env) {
  if (!env || !env.DB) return null;
  try { return await env.DB.prepare("SELECT reusable_sections_json FROM site_pages WHERE route = ? AND status = 'published'").bind(SITEWIDE_ROUTE).first(); } catch { return null; }
}
export function sitewideHtml(row) {
  const list = parse(row && row.reusable_sections_json).filter(s => s && s.enabled !== false);
  return list.map(s => `<section class="cso-sitewide cso-sitewide-${esc(s.id)}"><div class="w">${s.title ? `<strong>${esc(s.title)}</strong> ` : ''}${esc(s.text)}${s.label ? ` <a href="${esc(safeUrl(s.url))}">${esc(s.label)}</a>` : ''}</div></section>`).join('');
}
export async function getPageRedirect(env, pathname) {
  if (!env || !env.DB) return null;
  try {
    const c = routeCandidates(pathname);
    const row = await env.DB.prepare(
      `SELECT new_route FROM site_redirects WHERE old_route IN (${c.map(() => '?').join(',')}) LIMIT 1`
    ).bind(...c).first();
    return row && row.new_route ? row.new_route : null;
  } catch { return null; }
}
export async function getPublishedPage(env, pathname) {
  if (!env || !env.DB || normalizeRoute(pathname) === SITEWIDE_ROUTE) return null;
  try {
    const c = routeCandidates(pathname);
    const row = await env.DB.prepare(
      `SELECT * FROM site_pages WHERE route IN (${c.map(() => '?').join(',')}) AND status = 'published' LIMIT 1`
    ).bind(...c).first();
    return row || null;
  } catch { return null; }
}
function parse(j) { try { const v = JSON.parse(j || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }

export function extractOgImage(blocks) {
  const list = parse(typeof blocks === 'string' ? blocks : JSON.stringify(blocks || []));
  const og = list.find(b => b && b.type === 'og_meta' && b.og_image);
  if (og) return safeUrl(og.og_image);
  const img = list.find(b => b && (b.type === 'image' || (b.type === 'attachment' && b.is_image)) && b.url);
  return img ? safeUrl(img.url) : '';
}

export function extractPageMeta(blocks) {
  const list = parse(typeof blocks === 'string' ? blocks : JSON.stringify(blocks || []));
  const m = list.find(b => b && b.type === 'page_meta');
  return m && typeof m === 'object' ? m : {};
}

export function buildJsonLd(row, blocks) {
  const list = parse(typeof blocks === 'string' ? blocks : JSON.stringify(blocks || []));
  const route = normalizeRoute(row.route || '/');
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://csodisha.com/' },
      { '@type': 'ListItem', position: 2, name: row.title || route, item: 'https://csodisha.com' + route }
    ]
  };
  const out = [crumbs];
  const faqs = list.filter(b => b && !b.hidden && b.type === 'faq');
  if (faqs.length) {
    const mainEntity = [];
    faqs.forEach(f => {
      if (Array.isArray(f.rows) && f.rows.length) {
        f.rows.forEach(r => {
          if (r && r.question && r.answer) mainEntity.push({ '@type': 'Question', name: r.question, acceptedAnswer: { '@type': 'Answer', text: r.answer } });
        });
      } else if (f.question && f.answer) {
        mainEntity.push({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } });
      } else if (Array.isArray(f.items) && f.items.length) {
        f.items.forEach(i => {
          const [q, a] = String(i).split('|');
          if ((q || '').trim() && (a || '').trim()) mainEntity.push({ '@type': 'Question', name: q.trim(), acceptedAnswer: { '@type': 'Answer', text: a.trim() } });
        });
      } else if (f.title && f.text) {
        mainEntity.push({ '@type': 'Question', name: f.title, acceptedAnswer: { '@type': 'Answer', text: f.text } });
      }
    });
    if (mainEntity.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity });
  }
  return out.map(obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`).join('');
}

export function renderBlocks(blocks) {
  return parse(typeof blocks === 'string' ? blocks : JSON.stringify(blocks || [])).map(b => {
    if (!b || b.hidden) return '';
    const t = b.type;
    if (t === 'og_meta' || t === 'page_meta') return '';
    const surf = ['elevated', 'accent'].includes(b.surface) ? b.surface : 'default';
    const sp = ['compact', 'spacious'].includes(b.spacing) ? b.spacing : 'normal';
    const wrap = inner => `<div class="cso-blk cso-blk-surface-${surf} cso-blk-space-${sp}">${inner}</div>`;
    const text = esc(b.text || b.body || b.title || b.heading || '');
    if (t === 'heading') return wrap(`<h2>${text}</h2>`);
    if (t === 'list') return wrap(`<ul>${(Array.isArray(b.items) ? b.items : String(b.text || '').split('\n')).filter(Boolean).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`);
    if (t === 'image') return b.url ? wrap(`<figure class="cso-live-figure"><img src="${esc(safeUrl(b.url))}" alt="${esc(b.alt || b.title || '')}" loading="lazy">${b.title ? `<figcaption>${esc(b.title)}</figcaption>` : ''}</figure>`) : '';
    if (t === 'attachment') {
      const u = safeUrl(b.url);
      const nt = b.new_tab !== false ? ' target="_blank" rel="noopener noreferrer"' : '';
      const badge = esc(b.role || b.source_label || 'Document');
      return wrap(`<div class="cso-live-attachment"><span class="cso-live-badge">${badge}</span> <strong>${esc(b.title || 'Resource')}</strong>${b.domain ? ` <span class="cso-live-domain">(${esc(b.domain)})</span>` : ''} <a class="btn btn-primary" href="${esc(u)}"${nt}>Open / Download</a></div>`);
    }
    if (t === 'attachments') {
      const list = Array.isArray(b.items) ? b.items : (Array.isArray(b.rows) ? b.rows : []);
      const lis = list.map(a => `<div class="cso-live-attachment"><span class="cso-live-badge">${esc(a.source_label || a.role || 'Link')}</span> <strong>${esc(a.title || a.label || 'Resource')}</strong> <a class="btn btn-primary" href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener noreferrer">Open / Download</a></div>`).join('');
      return wrap(`<section class="cso-live-attachments">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${lis}</section>`);
    }
    if (t === 'official_links') return wrap(`<aside class="cso-live-notice"><strong>${esc(b.title || b.heading || 'Official Links')}</strong><p>${esc(b.text || b.body || '')}</p>${b.url ? `<p><a href="${esc(safeUrl(b.url))}" target="_blank" rel="noopener noreferrer">${esc(b.url)}</a></p>` : ''}</aside>`);
    if (t === 'key_dates') {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      const tbl = rows.length ? `<table><tbody>${rows.map(r => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('')}</tbody></table>` : `<p>${esc(b.text || b.body || '')}</p>`;
      return wrap(`<section class="cso-live-notice"><h2>${esc(b.title || b.heading || 'Key Dates')}</h2>${tbl}</section>`);
    }
    if (t === 'cta') return wrap(`<p><a class="btn btn-primary" href="${esc(safeUrl(b.url))}">${esc(b.label || b.text || 'Learn more')}</a></p>`);
    const items = Array.isArray(b.items) ? b.items : String(b.items || '').split('\n').filter(Boolean);
    if (t === 'hero') return wrap(`<section class="cso-live-hero-block">${b.image_url ? `<img src="${esc(safeUrl(b.image_url))}" alt="${esc(b.title || '')}" loading="lazy">` : ''}<h2>${esc(b.title || b.heading)}</h2>${b.odia_subtitle ? `<p class="cso-live-odia">${esc(b.odia_subtitle)}</p>` : ''}${(b.text || b.body) ? `<p>${esc(b.text || b.body)}</p>` : ''}${b.label ? `<p><a class="btn btn-primary" href="${esc(safeUrl(b.url))}">${esc(b.label)}</a></p>` : ''}</section>`);
    if (t === 'ticker') return wrap(`<section class="cso-live-ticker"><h2>${esc(b.title || 'Latest Jobs')}</h2><p><a href="/jobs-careers/">View all live job notifications</a></p></section>`);
    if (t === 'examgrid' || t === 'exam_grid') {
      const cards = Array.isArray(b.cards) && b.cards.length ? b.cards : null;
      const body = cards
        ? `<ul class="cso-live-grid">${cards.map(c => `<li><a href="${esc(safeUrl(c.url || '/'))}"><strong>${esc(c.title || '')}</strong>${c.badge ? ` <span class="cso-live-badge">${esc(c.badge)}</span>` : ''}${c.summary ? `<p>${esc(c.summary)}</p>` : ''}</a></li>`).join('')}</ul>`
        : `<ul class="cso-live-grid">${items.map(i => { const [l, u] = String(i).split('|'); return `<li><a href="${esc(safeUrl((u || '').trim()))}">${esc((l || '').trim())}</a></li>`; }).join('')}</ul>`;
      return wrap(`<section><h2>${esc(b.title || 'Exam Portals')}</h2>${body}</section>`);
    }
    if (t === 'cbt') {
      const cards = Array.isArray(b.cards) && b.cards.length ? b.cards : null;
      const body = cards
        ? `<ul class="cso-live-grid">${cards.map(c => `<li><a href="${esc(safeUrl(c.url || '/mock-tests/'))}"><strong>${esc(c.title || '')}</strong>${c.badge ? ` <span class="cso-live-badge">${esc(c.badge)}</span>` : ''}${c.summary ? `<p>${esc(c.summary)}</p>` : ''}</a></li>`).join('')}</ul>`
        : `<p>${esc(b.text || '')}</p><p><a class="btn btn-primary" href="${esc(safeUrl(b.url || '/mock-tests/'))}">${esc(b.label || 'Start mock test')}</a></p>`;
      return wrap(`<section class="cso-live-cbt"><h2>${esc(b.title || 'CBT Mock Tests')}</h2>${body}</section>`);
    }
    if (t === 'faq') {
      if (Array.isArray(b.rows) && b.rows.length) {
        return wrap(`<section><h2>${esc(b.title || b.heading || 'FAQ')}</h2>${b.rows.map(r => `<details><summary>${esc(r.question || '')}</summary><p>${esc(r.answer || '')}</p></details>`).join('')}</section>`);
      }
      if (b.question && b.answer) return wrap(`<section><details open><summary>${esc(b.question)}</summary><p>${esc(b.answer)}</p></details></section>`);
      return wrap(`<section><h2>${esc(b.title || b.heading || 'FAQ')}</h2>${items.length ? items.map(i => { const [q, a] = String(i).split('|'); return `<details><summary>${esc((q || '').trim())}</summary><p>${esc((a || '').trim())}</p></details>`; }).join('') : `<p>${esc(b.text || b.body || '')}</p>`}</section>`);
    }
    if (t === 'notice') return wrap(`<aside class="cso-live-notice" role="note"><strong>${esc(b.title || b.heading)}</strong><p>${esc(b.text || b.body)}</p></aside>`);
    if (t === 'richtext' || t === 'rich_text') return wrap(`${(b.title || b.heading) ? `<h2>${esc(b.title || b.heading)}</h2>` : ''}${String(b.text || b.body || '').split(/\n{2,}/).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}`);
    if (t === 'quote') return wrap(`<blockquote>${text}</blockquote>`);
    return text ? wrap(`<p>${text}</p>`) : '';
  }).join('\n');
}
export function renderSections(sections) {
  return parse(typeof sections === 'string' ? sections : JSON.stringify(sections || [])).map(s =>
    `<section class="cso-live-section">${s.title ? `<h2>${esc(s.title)}</h2>` : ''}${renderBlocks(s.blocks || (s.text ? [{ type: 'paragraph', text: s.text }] : []))}</section>`
  ).join('\n');
}

export function renderDynamicPage(row, sitewide) {
  const ogImg = extractOgImage(row.blocks_json);
  const meta = extractPageMeta(row.blocks_json);
  const ogMeta = ogImg ? `<meta property="og:image" content="${esc(ogImg)}">` : '';
  const robotsMeta = meta.noindex ? '<meta name="robots" content="noindex,nofollow">' : '';
  const jsonLd = buildJsonLd(row, row.blocks_json);
  const odiaSub = meta.odia_subtitle ? `<p class="cso-live-odia">${esc(meta.odia_subtitle)}</p>` : '';
  const hero = row.hero_title ? `<section class="hero cso-live-hero"><div class="w"><h1>${esc(row.hero_title)}</h1>${row.hero_subtitle ? `<p>${esc(row.hero_subtitle)}</p>` : ''}${odiaSub}${row.cta_label ? `<p><a class="btn btn-primary" href="${esc(safeUrl(row.cta_url))}">${esc(row.cta_label)}</a></p>` : ''}</div></section>` : `<section class="hero cso-live-hero"><div class="w"><h1>${esc(row.title)}</h1>${odiaSub}</div></section>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(row.title)}</title><meta name="description" content="${esc(row.meta_description)}">${robotsMeta}${ogMeta}${jsonLd}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/design-tokens.css"><link rel="stylesheet" href="/assets/css/ui-kit.css"><link rel="stylesheet" href="/assets/css/public-content.css"><link rel="stylesheet" href="/styles.css"></head>
<body><header class="top site-header__top" role="banner"><div class="w"><a href="/" class="brand">Common Sense Odisha</a>
<nav aria-label="Primary"><a href="/jobs-careers/">Jobs</a> <a href="/current-affairs/">Current Affairs</a> <a href="/mock-tests/">Mock Tests</a> <a href="/study-library/">Study Library</a></nav></div></header>
<main id="main">${hero}<div class="w cso-live-body">${renderBlocks(row.blocks_json)}${renderSections(row.reusable_sections_json)}</div></main>
<footer><div class="w"><p>&copy; Common Sense Odisha · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/contact.html">Contact</a></p></div></footer>${sitewide ? sitewideHtml(sitewide) : ''}</body></html>`;
}

export function applyPageOverrides(res, row, sitewide) {
  const rw = new HTMLRewriter();
  row = row || {};
  const sw = sitewide ? sitewideHtml(sitewide) : '';
  if (sw) rw.on('body', { element(e) { e.append(sw, { html: true }); } });
  if (row.title) rw.on('title', { element(e) { e.setInnerContent(row.title); } });
  if (row.meta_description) rw.on('meta[name="description"]', { element(e) { e.setAttribute('content', row.meta_description); } });
  const ogImg = extractOgImage(row.blocks_json);
  const meta = extractPageMeta(row.blocks_json);
  const headExtra = (ogImg ? `<meta property="og:image" content="${esc(ogImg)}">` : '') +
    (meta.noindex ? '<meta name="robots" content="noindex,nofollow">' : '') +
    buildJsonLd(row, row.blocks_json);
  if (headExtra) rw.on('head', { element(e) { e.append(headExtra, { html: true }); } });
  if (row.hero_title) rw.on('h1', (() => { let done = false; return { element(e) { if (done) return; done = true; e.setInnerContent(row.hero_title); e.removeAttribute('aria-label'); } }; })());
  if (row.hero_subtitle) rw.on('.hero p, #cso-hero p', (() => { let done = false; return { element(e) { if (done) return; done = true; e.setInnerContent(row.hero_subtitle); } }; })());
  const extra = renderBlocks(row.blocks_json) + renderSections(row.reusable_sections_json);
  if (row && extra.trim()) rw.on('main', { element(e) { e.append(`<div class="w cso-live-body">${extra}</div>`, { html: true }); } });
  return rw.transform(res);
}

export async function publishDueScheduledPages(env) {
  if (!env || !env.DB) return 0;
  try {
    const r = await env.DB.prepare(
      `UPDATE site_pages SET status='published', updated_at=datetime('now') WHERE status='scheduled' AND publish_at IS NOT NULL AND publish_at <= datetime('now')`
    ).run();
    return (r.meta && r.meta.changes) || 0;
  } catch { return 0; }
}
