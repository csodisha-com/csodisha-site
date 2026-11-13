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
export async function getPublishedPage(env, pathname) {
  if (!env || !env.DB) return null;
  try {
    const c = routeCandidates(pathname);
    const row = await env.DB.prepare(
      `SELECT * FROM site_pages WHERE route IN (${c.map(() => '?').join(',')}) AND status = 'published' LIMIT 1`
    ).bind(...c).first();
    return row || null;
  } catch { return null; }
}
function parse(j) { try { const v = JSON.parse(j || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }

export function renderBlocks(blocks) {
  return parse(typeof blocks === 'string' ? blocks : JSON.stringify(blocks || [])).map(b => {
    const t = b && b.type;
    const text = esc(b.text || b.title || '');
    if (t === 'heading') return `<h2>${text}</h2>`;
    if (t === 'list') return `<ul>${(Array.isArray(b.items) ? b.items : String(b.text || '').split('\n')).filter(Boolean).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    if (t === 'image') return b.url ? `<img src="${esc(safeUrl(b.url))}" alt="${esc(b.alt || '')}" loading="lazy">` : '';
    if (t === 'cta') return `<p><a class="btn btn-primary" href="${esc(safeUrl(b.url))}">${esc(b.label || b.text || 'Learn more')}</a></p>`;
    if (t === 'quote') return `<blockquote>${text}</blockquote>`;
    return text ? `<p>${text}</p>` : '';
  }).join('\n');
}
export function renderSections(sections) {
  return parse(typeof sections === 'string' ? sections : JSON.stringify(sections || [])).map(s =>
    `<section class="cso-live-section">${s.title ? `<h2>${esc(s.title)}</h2>` : ''}${renderBlocks(s.blocks || (s.text ? [{ type: 'paragraph', text: s.text }] : []))}</section>`
  ).join('\n');
}

export function renderDynamicPage(row) {
  const hero = row.hero_title ? `<section class="hero cso-live-hero"><div class="w"><h1>${esc(row.hero_title)}</h1>${row.hero_subtitle ? `<p>${esc(row.hero_subtitle)}</p>` : ''}${row.cta_label ? `<p><a class="btn btn-primary" href="${esc(safeUrl(row.cta_url))}">${esc(row.cta_label)}</a></p>` : ''}</div></section>` : `<section class="hero cso-live-hero"><div class="w"><h1>${esc(row.title)}</h1></div></section>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(row.title)}</title><meta name="description" content="${esc(row.meta_description)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/design-tokens.css"><link rel="stylesheet" href="/assets/css/ui-kit.css"><link rel="stylesheet" href="/assets/css/public-content.css"><link rel="stylesheet" href="/styles.css"></head>
<body><header class="top site-header__top" role="banner"><div class="w"><a href="/" class="brand">Common Sense Odisha</a>
<nav aria-label="Primary"><a href="/jobs-careers/">Jobs</a> <a href="/current-affairs/">Current Affairs</a> <a href="/mock-tests/">Mock Tests</a> <a href="/study-library/">Study Library</a></nav></div></header>
<main id="main">${hero}<div class="w cso-live-body">${renderBlocks(row.blocks_json)}${renderSections(row.reusable_sections_json)}</div></main>
<footer><div class="w"><p>&copy; Common Sense Odisha · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/contact.html">Contact</a></p></div></footer></body></html>`;
}

export function applyPageOverrides(res, row) {
  const rw = new HTMLRewriter();
  if (row.title) rw.on('title', { element(e) { e.setInnerContent(row.title); } });
  if (row.meta_description) rw.on('meta[name="description"]', { element(e) { e.setAttribute('content', row.meta_description); } });
  if (row.hero_title) rw.on('h1', (() => { let done = false; return { element(e) { if (done) return; done = true; e.setInnerContent(row.hero_title); e.removeAttribute('aria-label'); } }; })());
  if (row.hero_subtitle) rw.on('.hero p, #cso-hero p', (() => { let done = false; return { element(e) { if (done) return; done = true; e.setInnerContent(row.hero_subtitle); } }; })());
  const extra = renderBlocks(row.blocks_json) + renderSections(row.reusable_sections_json);
  if (extra.trim()) rw.on('main', { element(e) { e.append(`<div class="w cso-live-body">${extra}</div>`, { html: true }); } });
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
