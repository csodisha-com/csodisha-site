/**
 * Common Sense Odisha — Informative Articles & Guides Engine (v366)
 * - Idempotent D1 `informative_guides` schema guard
 * - Strict CSP-safe Markdown/Structured body parser + Auto-TOC generator
 * - Public WCAG AAA 4-Theme SSR hub (`/guides/`) & article reader (`/guides/<slug>`)
 *   with enriched `BreadcrumbList` + `Article` + `FAQPage` JSON-LD, raster `og:image`
 *   social preview fallback, 1-click WhatsApp / Telegram / Copy-Link / Native Share toolbar,
 *   bilingual EN/ଓଡ଼ିଆ toggle, Key Takeaways, Inline Photo Gallery, Downloadable PDFs,
 *   Verified `.gov.in` Links, and Related Practice/Alert CTA.
 */

import { CSO_SHELL_HEAD_LINKS, CSO_SHELL_HEADER, CSO_SHELL_FOOTER, escShell, renderKicker } from './ssr-shell.js';
import { GUIDE_TOPIC_ALIASES, matchGuideToTopic } from './trending-topics.js';
import { buildGuideDetailJsonLdBlocks } from './rich-results-jsonld.js';
import { buildArticleMiniQuizPayload, serializeQuizJson } from './article-mini-quiz.js';
import { buildSocialMetaTags } from './social-meta-tags.js';

export const DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH = '/assets/img/icon-512.png';

export const GUIDE_CATEGORIES = [
  { key: 'how-to', label_en: 'Step-by-Step How-To Guides', label_or: 'ପର୍ଯ୍ୟାୟକ୍ରମେ ମାର୍ଗଦର୍ଶିକା', short_en: 'How-To Guide', icon: '🧭' },
  { key: 'exam-strategy', label_en: 'Exam Strategy & Study Handbooks', label_or: 'ପରୀକ୍ଷା ରଣନୀତି ଓ ଅଧ୍ୟୟନ ପୁସ୍ତିକା', short_en: 'Exam Handbook', icon: '🎯' },
  { key: 'citizen-scheme', label_en: 'Citizen & Scheme Explainers', label_or: 'ନାଗରିକ ଓ ଯୋଜନା ବିବରଣୀ', short_en: 'Scheme Explainer', icon: '🏛️' },
  { key: 'odisha-gk', label_en: 'Odisha GK & Heritage', label_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ଐତିହ୍ୟ', short_en: 'Odisha GK', icon: '🏺' }
];

export const GUIDE_CATEGORY_MAP = new Map(GUIDE_CATEGORIES.map((c) => [c.key, c]));

let _guidesSchemaDb = null;

export async function ensureInformativeGuidesSchema(db) {
  if (!db) return;
  if (_guidesSchemaDb === db) return;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS informative_guides (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL DEFAULT 'how-to',
        title_en TEXT NOT NULL,
        title_or TEXT NOT NULL DEFAULT '',
        summary_en TEXT NOT NULL DEFAULT '',
        summary_or TEXT NOT NULL DEFAULT '',
        takeaways_json TEXT NOT NULL DEFAULT '[]',
        body_en TEXT NOT NULL DEFAULT '',
        body_or TEXT NOT NULL DEFAULT '',
        cover_image TEXT NOT NULL DEFAULT '',
        cover_caption_en TEXT NOT NULL DEFAULT '',
        cover_caption_or TEXT NOT NULL DEFAULT '',
        photos_json TEXT NOT NULL DEFAULT '[]',
        pdfs_json TEXT NOT NULL DEFAULT '[]',
        links_json TEXT NOT NULL DEFAULT '[]',
        related_cta_json TEXT NOT NULL DEFAULT '{}',
        quiz_json TEXT NOT NULL DEFAULT '',
        read_minutes INTEGER NOT NULL DEFAULT 5,
        tags TEXT NOT NULL DEFAULT '',
        scope TEXT NOT NULL DEFAULT 'Odisha',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_exam INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        author_email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_informative_guides_pub_sort ON informative_guides(status, is_pinned DESC, updated_at DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_informative_guides_category ON informative_guides(category, status, updated_at DESC)'),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS guide_slug_history (
        old_slug TEXT PRIMARY KEY,
        guide_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_guide_slug_history_guide ON guide_slug_history(guide_id)')
  ]);
  try {
    await db.prepare("ALTER TABLE informative_guides ADD COLUMN quiz_json TEXT NOT NULL DEFAULT ''").run();
  } catch { /* column already exists */ }
  _guidesSchemaDb = db;
}

/** v368: remember an edited slug so the old URL 301-redirects to the current canonical slug. */
export async function recordGuideSlugChange(db, guideId, oldSlug, newSlug) {
  const o = String(oldSlug || '').trim();
  const n = String(newSlug || '').trim();
  if (!db || !guideId) return;
  await ensureInformativeGuidesSchema(db);
  // A slug that is live again must never keep redirecting away.
  if (n) await db.prepare('DELETE FROM guide_slug_history WHERE old_slug = ?').bind(n).run();
  if (o && n && o !== n) {
    await db.prepare(
      `INSERT INTO guide_slug_history (old_slug, guide_id, created_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(old_slug) DO UPDATE SET guide_id = excluded.guide_id, created_at = excluded.created_at`
    ).bind(o, guideId).run();
  }
}

export function slugifyGuide(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function safeGuideUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//') && !s.includes('\\')) return s.slice(0, 600);
  if (/^https?:\/\//i.test(s)) return s.slice(0, 600);
  return '';
}

function parseJsonSafe(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw || ''));
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeCategory(raw) {
  const k = String(raw || '').trim().toLowerCase();
  if (GUIDE_CATEGORY_MAP.has(k)) return k;
  if (k.includes('exam') || k.includes('study') || k.includes('handbook')) return 'exam-strategy';
  if (k.includes('scheme') || k.includes('citizen')) return 'citizen-scheme';
  if (k.includes('gk') || k.includes('heritage') || k.includes('odisha')) return 'odisha-gk';
  return 'how-to';
}

export function normalizeTakeaways(raw) {
  const arr = Array.isArray(raw) ? raw : parseJsonSafe(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (typeof item === 'string') {
        const textEn = item.trim().slice(0, 320);
        return textEn ? { text_en: textEn, text_or: '' } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const textEn = String(item.text_en || item.en || item.text || '').trim().slice(0, 320);
      const textOr = String(item.text_or || item.or || '').trim().slice(0, 420);
      if (!textEn && !textOr) return null;
      return { text_en: textEn || textOr, text_or: textOr };
    })
    .filter(Boolean)
    .slice(0, 16);
}

export function normalizePhotos(raw) {
  const arr = Array.isArray(raw) ? raw : parseJsonSafe(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const url = safeGuideUrl(p.url || p.src || p.image_url);
      if (!url) return null;
      return {
        url,
        caption_en: String(p.caption_en || p.caption || '').trim().slice(0, 280),
        caption_or: String(p.caption_or || '').trim().slice(0, 360),
        alt: String(p.alt || p.alt_text || p.caption_en || 'Guide illustration').trim().slice(0, 200)
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

export function normalizePdfs(raw) {
  const arr = Array.isArray(raw) ? raw : parseJsonSafe(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((d) => {
      if (!d || typeof d !== 'object') return null;
      const url = safeGuideUrl(d.url || d.pdf_url);
      const titleEn = String(d.title_en || d.title || '').trim().slice(0, 220);
      if (!url || !titleEn) return null;
      return {
        title_en: titleEn,
        title_or: String(d.title_or || '').trim().slice(0, 280),
        url,
        badge: String(d.badge || d.size_label || 'Official PDF').trim().slice(0, 60)
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

export function normalizeLinks(raw) {
  const arr = Array.isArray(raw) ? raw : parseJsonSafe(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((l) => {
      if (!l || typeof l !== 'object') return null;
      const url = safeGuideUrl(l.url || l.href);
      const labelEn = String(l.label_en || l.label || '').trim().slice(0, 180);
      if (!url || !labelEn) return null;
      const isGovAuto = /\.gov\.in\b|\.nic\.in\b/i.test(url);
      const isOfficial = l.is_official !== undefined ? Boolean(l.is_official) : isGovAuto;
      return {
        label_en: labelEn,
        label_or: String(l.label_or || '').trim().slice(0, 240),
        url,
        is_official: isOfficial
      };
    })
    .filter(Boolean)
    .slice(0, 24);
}

export function normalizeRelatedCta(raw) {
  const obj = raw && typeof raw === 'object' ? raw : parseJsonSafe(raw, {});
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const kind = String(obj.type || obj.kind || '').trim().toLowerCase();
  const validKinds = new Set(['mock_test', 'job', 'scheme', 'custom']);
  const slug = String(obj.slug || '').trim().slice(0, 160);
  const customUrl = safeGuideUrl(obj.url || '');
  if (!slug && !customUrl) return {};
  const type = validKinds.has(kind) ? kind : (slug ? 'mock_test' : 'custom');
  let targetUrl = customUrl;
  if (!targetUrl && slug) {
    if (slug.startsWith('/')) targetUrl = safeGuideUrl(slug);
    else if (type === 'mock_test') targetUrl = `/mock-tests/?test=${encodeURIComponent(slug)}`;
    else if (type === 'job') targetUrl = `/jobs/${encodeURIComponent(slug)}`;
    else if (type === 'scheme') targetUrl = `/schemes/${encodeURIComponent(slug)}`;
  }
  return {
    type,
    slug,
    url: targetUrl,
    title_en: String(obj.title_en || obj.title || '').trim().slice(0, 180),
    title_or: String(obj.title_or || '').trim().slice(0, 220),
    cta_en: String(obj.cta_en || '').trim().slice(0, 60),
    cta_or: String(obj.cta_or || '').trim().slice(0, 80)
  };
}

export function normalizeFaqs(raw) {
  const arr = Array.isArray(raw) ? raw : parseJsonSafe(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const q = String(item.question || item.question_en || item.q || item.name || '').trim().slice(0, 320);
      const a = String(item.answer || item.answer_en || item.a || (item.acceptedAnswer && item.acceptedAnswer.text) || '').trim().slice(0, 1200);
      if (!q || !a) return null;
      return { question: q, answer: a };
    })
    .filter(Boolean)
    .slice(0, 20);
}

export function resolveSocialPreviewImageUrl(guide, origin = 'https://csodisha.com') {
  const cleanOrigin = String(origin || 'https://csodisha.com').replace(/\/+$/, '');
  const fallbackUrl = `${cleanOrigin}${DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH}`;
  const raw = String((guide && guide.cover_image) || '').trim();
  if (!raw) return fallbackUrl;
  const pathWithoutQuery = raw.split(/[?#]/)[0].trim();
  if (!pathWithoutQuery || /\.svg$/i.test(pathWithoutQuery)) {
    return fallbackUrl;
  }
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return `${cleanOrigin}${raw}`;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return fallbackUrl;
}

export function estimateReadMinutes(bodyEn, explicit) {
  const n = Number(explicit);
  if (Number.isFinite(n) && n >= 1 && n <= 120) return Math.round(n);
  const words = String(bodyEn || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(60, Math.ceil(words / 200) || 4));
}

export function formatGuideRow(row) {
  if (!row) return null;
  const cat = GUIDE_CATEGORY_MAP.get(row.category) || GUIDE_CATEGORIES[0];
  const takeaways = normalizeTakeaways(row.takeaways_json);
  const photos = normalizePhotos(row.photos_json);
  const pdfs = normalizePdfs(row.pdfs_json);
  const links = normalizeLinks(row.links_json);
  const relatedCta = normalizeRelatedCta(row.related_cta_json);
  const faqs = normalizeFaqs(row.faq_json !== undefined ? row.faq_json : row.faqs);
  return {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    category: cat.key,
    category_label_en: cat.label_en,
    category_label_or: cat.label_or,
    category_short_en: cat.short_en,
    category_icon: cat.icon,
    title_en: String(row.title_en || ''),
    title_or: String(row.title_or || ''),
    summary_en: String(row.summary_en || ''),
    summary_or: String(row.summary_or || ''),
    takeaways,
    takeaways_json: JSON.stringify(takeaways),
    body_en: String(row.body_en || ''),
    body_or: String(row.body_or || ''),
    cover_image: safeGuideUrl(row.cover_image),
    cover_caption_en: String(row.cover_caption_en || ''),
    cover_caption_or: String(row.cover_caption_or || ''),
    photos,
    photos_json: JSON.stringify(photos),
    pdfs,
    pdfs_json: JSON.stringify(pdfs),
    links,
    links_json: JSON.stringify(links),
    related_cta: relatedCta,
    related_cta_json: JSON.stringify(relatedCta),
    quiz_json: String(row.quiz_json || ''),
    faqs,
    faq_json: JSON.stringify(faqs),
    read_minutes: Number(row.read_minutes) || 5,
    tags: String(row.tags || ''),
    scope: String(row.scope || 'Odisha') === 'National' ? 'National' : 'Odisha',
    is_pinned: Number(row.is_pinned || 0) === 1,
    is_exam: Number(row.is_exam || 0) === 1,
    status: String(row.status || 'draft') === 'published' ? 'published' : 'draft',
    author_email: String(row.author_email || ''),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
    url: `/guides/${encodeURIComponent(String(row.slug || ''))}`
  };
}

// =========================================================================
// Strict CSP-Safe Structured Body Renderer + Auto-Generated Table of Contents
// =========================================================================
function renderInlineFmt(rawText) {
  let s = escShell(rawText);
  // Safe Markdown links: [label](url)
  s = s.replace(/\[([^\]]{1,160})\]\(([^)\s]{1,500})\)/g, (_, lbl, rawHref) => {
    const decodedHref = rawHref.replace(/&amp;/g, '&');
    const clean = safeGuideUrl(decodedHref);
    if (!clean) return lbl;
    const isExt = /^https?:\/\//i.test(clean);
    const attrs = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escShell(clean)}"${attrs}>${lbl}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function normalizeHtmlLikeBodyToMarkdown(rawBody) {
  let s = String(rawBody || '').replace(/\r\n/g, '\n');
  if (/<(?:h[23]|p|li|strong|em|br)\b/i.test(s)) {
    s = s
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:p|ul|ol|div|section|article)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '');
  }
  return s;
}

export function renderGuideBodyWithToc(rawBody, headingPrefix = 'sec') {
  const lines = normalizeHtmlLikeBodyToMarkdown(rawBody).split('\n');
  const html = [];
  const toc = [];
  const usedIds = new Set();

  function makeAnchor(text) {
    let base = slugifyGuide(text).slice(0, 48) || headingPrefix;
    let id = `${headingPrefix}-${base}`;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${headingPrefix}-${base}-${n++}`;
    }
    usedIds.add(id);
    return id;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    // Standalone Markdown image block: ![Alt / Caption](url)
    const imgMatch = line.match(/^!\[([^\]]{0,260})\]\(([^)\s]{1,600})\)$/);
    if (imgMatch) {
      const cleanSrc = safeGuideUrl(imgMatch[2]);
      const altText = imgMatch[1].trim() || 'Guide infographic chart';
      if (cleanSrc) {
        html.push(
          `<figure class="gp-inline-figure">` +
          `<img src="${escShell(cleanSrc)}" alt="${escShell(altText)}" class="gp-inline-img" loading="lazy" decoding="async">` +
          (imgMatch[1].trim() ? `<figcaption class="gp-caption">${escShell(imgMatch[1].trim())}</figcaption>` : '') +
          `</figure>`
        );
        i += 1;
        continue;
      }
    }

    // Headings (## or ###)
    const hMatch = line.match(/^(#{2,3})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      const id = makeAnchor(text);
      toc.push({ id, level, text });
      html.push(`<h${level} id="${escShell(id)}" class="gp-h${level}">${renderInlineFmt(text)}</h${level}>`);
      i += 1;
      continue;
    }

    // Callout Box (> lines)
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      let badge = '';
      if (quoteLines[0] && /^\[!(NOTE|TIP|IMPORTANT|WARNING)\]/i.test(quoteLines[0])) {
        badge = quoteLines.shift().replace(/^\[!([A-Z]+)\]\s*/i, '$1').toUpperCase();
      }
      const inner = quoteLines.filter(Boolean).map((q) => `<p>${renderInlineFmt(q)}</p>`).join('');
      const badgeLabel = badge ? `📌 ${badge}` : '📌 IMPORTANT NOTE / EXAM RULE';
      const variant = badge ? badge.toLowerCase() : 'note';
      html.push(
        `<aside class="gp-callout is-${escShell(variant)}">` +
        `<div class="gp-callout-tag">${escShell(badgeLabel)}</div>` +
        inner +
        `</aside>`
      );
      continue;
    }

    // Markdown Table (| col | col |)
    if (line.startsWith('|') && line.endsWith('|') && i + 1 < lines.length && /^\|[\s:-]+(?:\|[\s:-]+)*\|$/.test(lines[i + 1].trim())) {
      const parseCells = (rowStr) => rowStr.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const headers = parseCells(line);
      i += 2; // skip header + separator
      const bodyRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        bodyRows.push(parseCells(lines[i].trim()));
        i += 1;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${renderInlineFmt(h)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${bodyRows.map((r) => `<tr>${headers.map((_, idx) => `<td>${renderInlineFmt(r[idx] || '')}</td>`).join('')}</tr>`).join('')}</tbody>`;
      html.push(`<div class="gp-table-wrap"><table class="gp-table">${thead}${tbody}</table></div>`);
      continue;
    }

    // Unordered list (- or *)
    if (/^[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i += 1;
      }
      html.push(`<ul class="gp-list">${items.map((it) => `<li>${renderInlineFmt(it)}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list (1. 2. ...)
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      html.push(`<ol class="gp-list is-ordered">${items.map((it) => `<li>${renderInlineFmt(it)}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph (join contiguous plain lines)
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,3}\s|>|\||[-*•]\s|\d+\.\s|!\[)/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p class="gp-para">${renderInlineFmt(para.join(' '))}</p>`);
  }

  return { html: html.join('\n'), toc };
}

function formatHumanDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s.slice(0, 16);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${m[3]} ${months[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

function buildGuidesHead({ title, description, body = '', canonical, ogImage = '', ogImageAlt = '', ogType = 'website', publishedTime = '', modifiedTime = '', jsonLd = null, origin = 'https://csodisha.com', robots = '' }) {
  const cleanOrigin = String(origin || 'https://csodisha.com').replace(/\/+$/, '');
  const resolvedOgImg = ogImage || `${cleanOrigin}${DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH}`;
  const resolvedOgAlt = ogImageAlt || title;
  const socialMeta = buildSocialMetaTags({
    origin: cleanOrigin,
    ogType,
    url: canonical,
    title,
    description,
    body,
    image: resolvedOgImg,
    imageAlt: resolvedOgAlt,
    publishedTime,
    modifiedTime
  });
  const ldTag = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="dns-prefetch" href="https://csodisha.com">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <title>${escShell(title)}</title>
  <meta name="description" content="${escShell(description)}">
  ${robots ? `<meta name="robots" content="${escShell(robots)}">` : ''}
  <link rel="canonical" href="${escShell(canonical)}">
  ${socialMeta}
  <link rel="icon" href="/assets/img/favicon-32x32.png?v=20261126v330" type="image/png" sizes="32x32">
  <link rel="manifest" href="/manifest.webmanifest">
  ${CSO_SHELL_HEAD_LINKS}
  <link rel="stylesheet" href="/assets/css/guides-portal.css?v=20261127v428">
  <script src="/assets/js/guides-portal.js?v=20261127v428" defer></script>
  <script src="/assets/js/ics-calendar-export.js?v=20261127v428" defer></script>
  <script src="/assets/js/saved-alerts-drawer.js?v=20261127v428" defer></script>
  <script src="/assets/js/article-mini-quiz.js?v=20261127v428" defer></script>
  <script src="/assets/js/certificate-fee-matrix.js?v=20261127v428" defer></script>
  <script src="/assets/js/service-rules-pension-guide.js?v=20261127v428" defer></script>
  <script src="/assets/js/pyq-vault-analyzer.js?v=20261127v428" defer></script>
  <script src="/assets/js/holiday-exam-logistics.js?v=20261127v428" defer></script>
  <script src="/assets/js/pet-pst-standards-checker.js?v=20261127v428" defer></script>
  <script src="/assets/js/edistrict-service-walkthrough.js?v=20261127v428" defer></script>
  <script src="/assets/js/teacher-eligibility-checker.js?v=20261127v428" defer></script>
  ${ldTag}
</head>`;
}

function buildGuideShareBarHtml(guide, canonical, position = 'header') {
  const titleEn = String(guide.title_en || 'Common Sense Odisha Guide').trim();
  const titleOr = String(guide.title_or || '').trim();
  const hookRaw = String(guide.deadline || guide.summary_en || '').trim().replace(/\s+/g, ' ').slice(0, 160);
  const titleLines = [titleEn];
  if (titleOr && titleOr !== titleEn) titleLines.push(titleOr);
  const waParts = [...titleLines];
  if (hookRaw) waParts.push(hookRaw);
  waParts.push(canonical);
  const waText = waParts.join('\n');

  const tgParts = [...titleLines];
  if (hookRaw) tgParts.push(hookRaw);
  const tgText = tgParts.join(' — ');

  const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(tgText)}`;
  const posClass = position === 'footer' ? ' is-footer' : ' is-header';
  const ariaLabel = position === 'footer' ? 'Share this guide from article footer' : 'Share this guide';

  return `<div class="gp-share-bar${posClass}" role="region" aria-label="${escShell(ariaLabel)}">
      <span class="gp-share-label">
        <span class="gp-lang-en">Share this guide:</span>
        <span class="gp-lang-or">ଏହି ମାର୍ଗଦର୍ଶିକା ସେୟାର କରନ୍ତୁ:</span>
      </span>
      <div class="gp-share-actions">
        <a class="gp-share-btn gp-share-wa" href="${escShell(waHref)}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">WhatsApp</a>
        <a class="gp-share-btn gp-share-tg" href="${escShell(tgHref)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram">Telegram</a>
        <button type="button" class="gp-share-btn gp-share-copy" data-copy-guide-url="${escShell(canonical)}" aria-label="Copy guide link">Copy Link</button>
        ${position === 'header' ? '<button type="button" class="gp-share-btn cso-print-btn" data-cso-print-btn="1" aria-label="Print or save clean PDF guide"><span class="gp-lang-en">🖨️ Print / Save Clean Guide</span><span class="gp-lang-or">🖨️ ପ୍ରିଣ୍ଟ / PDF ସେଭ୍ କରନ୍ତୁ</span></button>' : ''}
        <button type="button" class="gp-share-btn gp-share-native" data-native-share data-share-title="${escShell(titleEn)}" data-share-text="${escShell(tgText)}" data-share-url="${escShell(canonical)}" hidden aria-label="Share via device menu">Share</button>
      </div>
      <span class="gp-share-live cso-sr-only" role="status" aria-live="polite"></span>
    </div>`;
}

export function renderPublicGuidesHubHtml(guides, url) {
  const activeCat = String(url.searchParams.get('category') || 'all').trim().toLowerCase();
  const activeTopicAlias = GUIDE_TOPIC_ALIASES[activeCat] || null;
  const activeQ = String(url.searchParams.get('q') || '').trim();
  const origin = url ? url.origin : 'https://csodisha.com';

  const catCounts = { all: guides.length };
  GUIDE_CATEGORIES.forEach((c) => {
    catCounts[c.key] = guides.filter((g) => g.category === c.key).length;
  });

  const filtered = guides.filter((g) => {
    if (activeCat !== 'all') {
      if (activeTopicAlias) {
        if (!matchGuideToTopic(g, activeTopicAlias.key)) return false;
      } else if (g.category !== activeCat) {
        return false;
      }
    }
    if (activeQ) {
      const hay = `${g.title_en} ${g.title_or} ${g.summary_en} ${g.summary_or} ${g.tags}`.toLowerCase();
      if (!hay.includes(activeQ.toLowerCase())) return false;
    }
    return true;
  });

  const topicPillHtml = activeTopicAlias && !GUIDE_CATEGORY_MAP.has(activeCat)
    ? `<a class="gp-cat-pill is-active" href="/guides/?category=${encodeURIComponent(activeTopicAlias.key)}" data-guide-cat="${escShell(activeTopicAlias.key)}">${escShell(activeTopicAlias.icon)} <span class="gp-lang-en">${escShell(activeTopicAlias.label_en)}</span><span class="gp-lang-or">${escShell(activeTopicAlias.label_or)}</span> <span class="gp-cat-cnt">${filtered.length}</span></a>${activeCat === 'recruitment' ? '\n<a class="gp-cat-pill" href="/jobs/">💼 <span class="gp-lang-en">Open Live Jobs &amp; Recruitment Hub →</span><span class="gp-lang-or">ଲାଇଭ୍ ଚାକିରି ଓ ନିଯୁକ୍ତି ହବ୍ →</span></a>' : ''}${activeCat === 'exam-prep' ? '\n<a class="gp-cat-pill" href="/exams/">🎯 <span class="gp-lang-en">Open Live Exams &amp; Prep Hub →</span><span class="gp-lang-or">ଲାଇଭ୍ ପରୀକ୍ଷା ଓ ପ୍ରସ୍ତୁତି ହବ୍ →</span></a>' : ''}${activeCat === 'scholarships' ? '\n<a class="gp-cat-pill" href="/scholarships/">🎓 <span class="gp-lang-en">Open Scholarships &amp; Eligibility Hub →</span><span class="gp-lang-or">ବୃତ୍ତି ଓ ଯୋଗ୍ୟତା ହବ୍ →</span></a>' : ''}${activeCat === 'study-notes' ? '\n<a class="gp-cat-pill" href="/study-materials/">📚 <span class="gp-lang-en">Open Study Materials &amp; PYQ Vault →</span><span class="gp-lang-or">ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଓ PYQ ଭଲ୍ଟ →</span></a>' : ''}${activeCat === 'career' ? '\n<a class="gp-cat-pill" href="/career-paths/">🧭 <span class="gp-lang-en">Open Career Paths &amp; ORSP Pay Explorer →</span><span class="gp-lang-or">କ୍ୟାରିଅର ମାର୍ଗ ଓ ORSP ବେତନ →</span></a>' : ''}${activeCat === 'odisha-gk' ? '\n<a class="gp-cat-pill" href="/odisha-special/">🏺 <span class="gp-lang-en">Open Odisha Special &amp; 30-District Explorer →</span><span class="gp-lang-or">ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ଓ ୩୦ ଜିଲ୍ଲା ଏକ୍ସପ୍ଲୋରର →</span></a>' : ''}`
    : '';

  const pillsHtml = [
    `<a class="gp-cat-pill${activeCat === 'all' ? ' is-active' : ''}" href="/guides/" data-guide-cat="all">All Guides <span class="gp-cat-cnt">${catCounts.all}</span></a>`,
    ...(topicPillHtml ? [topicPillHtml] : []),
    ...GUIDE_CATEGORIES.map((c) => (
      `<a class="gp-cat-pill${activeCat === c.key ? ' is-active' : ''}" href="/guides/?category=${encodeURIComponent(c.key)}" data-guide-cat="${escShell(c.key)}">${escShell(c.icon)} ${escShell(c.label_en)} <span class="gp-cat-cnt">${catCounts[c.key] || 0}</span></a>`
    ))
  ].join('\n');

  const cardsHtml = filtered.length
    ? filtered.map((g) => {
      const cover = g.cover_image
        ? `<div class="gp-card-media"><img src="${escShell(g.cover_image)}" alt="${escShell(g.cover_caption_en || g.title_en)}" loading="lazy" decoding="async"></div>`
        : '';
      const hasOr = Boolean(g.title_or || g.summary_or);
      return `<article class="gp-card" data-category="${escShell(g.category)}" data-search="${escShell(`${g.title_en} ${g.title_or} ${g.summary_en} ${g.tags}`.toLowerCase())}">
        ${cover}
        <div class="gp-card-body">
          <div class="gp-card-meta">
            <span class="gp-badge">${escShell(g.category_icon)} ${escShell(g.category_short_en)}</span>
            <span class="gp-meta-dot" aria-hidden="true">·</span>
            <span>${escShell(g.read_minutes)} min read</span>
            <span class="gp-meta-dot" aria-hidden="true">·</span>
            <span>${escShell(g.scope)}</span>
          </div>
          <h2 class="gp-card-title">
            <a href="${escShell(g.url)}">
              <span class="gp-lang-en">${escShell(g.title_en)}</span>
              <span class="gp-lang-or">${escShell(g.title_or || g.title_en)}</span>
            </a>
          </h2>
          <p class="gp-card-summary">
            <span class="gp-lang-en">${escShell(g.summary_en)}</span>
            <span class="gp-lang-or">${escShell(g.summary_or || g.summary_en)}</span>
          </p>
          <div class="gp-card-foot">
            <span class="gp-card-date">${escShell(formatHumanDate(g.updated_at || g.created_at))}</span>
            ${hasOr ? '<span class="gp-bi-badge">EN · ଓଡ଼ିଆ</span>' : ''}
            <a class="gp-card-cta" href="${escShell(g.url)}">Read Guide →</a>
          </div>
        </div>
      </article>`;
    }).join('\n')
    : `<div class="gp-empty-state">
        <h2>No Informative Guides match this filter yet</h2>
        <p>Check back soon or browse all categories across Step-by-Step How-To Guides, Exam Strategy Handbooks, Citizen Explainers, and Odisha GK.</p>
        <a class="gp-btn-primary" href="/guides/">Browse All Guides</a>
      </div>`;

  const head = buildGuidesHead({
    title: 'Informative Articles & Guides | Common Sense Odisha',
    description: 'Bilingual Odisha & National step-by-step how-to guides, exam strategy handbooks, government scheme explainers, and Odisha GK deep dives.',
    canonical: `${origin}/guides/`,
    ogImage: `${origin}${DEFAULT_GUIDE_SOCIAL_OG_IMAGE_PATH}`,
    ogImageAlt: 'Common Sense Odisha Informative Articles & Practical Guides',
    ogType: 'website',
    origin
  });

  return `${head}
<body class="cso-portal-page cso-guides-page" data-cso-portal="guides" data-guide-lang="en">
${CSO_SHELL_HEADER}
<main id="main-content" class="gp-main gp-shell">
  <section class="gp-hero gp-hero-card">
    <div class="gp-hero-top">
      <div>
        <div class="gp-eyebrow">INFORMATIVE ARTICLES &amp; GUIDES · ମାର୍ଗଦର୍ଶିକା</div>
        <h1 class="gp-hero-title">
          <span class="gp-lang-en">Informative Articles &amp; Practical Guides</span>
          <span class="gp-lang-or">ତଥ୍ୟଭିତ୍ତିକ ପ୍ରବନ୍ଧ ଓ ବ୍ୟବହାରିକ ମାର୍ଗଦର୍ଶିକା</span>
        </h1>
        <p class="gp-hero-sub">
          <span class="gp-lang-en">Verified step-by-step how-to walkthroughs, exam strategy handbooks, citizen scheme explainers, and Odisha GK deep dives.</span>
          <span class="gp-lang-or">ପର୍ଯ୍ୟାୟକ୍ରମେ ଆବେଦନ ପଦ୍ଧତି, ପରୀକ୍ଷା ରଣନୀତି, ସରକାରୀ ଯୋଜନା ବିବରଣୀ ଓ ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ।</span>
        </p>
      </div>
      <div class="gp-lang-switch" role="group" aria-label="Reading Language">
        <button type="button" class="gp-lang-btn is-active" data-set-guide-lang="en" aria-pressed="true">English</button>
        <button type="button" class="gp-lang-btn" data-set-guide-lang="or" aria-pressed="false">ଓଡ଼ିଆ</button>
      </div>
    </div>
    <form class="gp-search-bar" action="/guides/" method="get" role="search">
      <label for="gpHubSearch" class="cso-sr-only">Search informative guides</label>
      <input type="search" id="gpHubSearch" name="q" class="gp-search-input" value="${escShell(activeQ)}" placeholder="Search guides by exam, scheme, process, or topic...">
      <button type="submit" class="gp-btn-primary">Search</button>
    </form>
    <nav class="gp-cat-pills" aria-label="Guide Categories">
      ${pillsHtml}
    </nav>
  </section>

  <section class="gp-grid" id="gpGuidesGrid" aria-label="Published Informative Guides">
    ${cardsHtml}
  </section>

  <section id="cso-certificate-fee-matrix-root" class="cso-cfm-root" aria-label="Bilingual Odisha Certificate Validity and Fee Waiver Matrix"></section>
  <section id="cso-service-rules-guide-root" class="cso-srp-root" aria-label="Odisha Govt Leave, TA/DA and NPS vs UPS Pension Quick Reference"></section>
  <section id="cso-pyq-vault-analyzer-root" class="cso-pyq-root" aria-label="Odisha Govt PYQ Paper Vault and Topic Weightage Analyzer"></section>
  <section id="cso-holiday-exam-logistics-root" class="cso-hel-root" aria-label="Odisha Govt Holiday, Treasury and Exam-Day Logistics Calendar"></section>
  <section id="cso-pet-pst-standards-root" class="cso-pps-root" aria-label="Odisha Police SI, Constable, Forest Guard and Excise PET/PST Standards Checker"></section>
  <section id="cso-edistrict-walkthrough-root" class="cso-edw-root" aria-label="e-District Odisha Certificate and Revenue Service Walkthrough"></section>
  <section id="cso-teacher-eligibility-root" class="cso-tec-root" aria-label="Odisha Govt Teacher Eligibility and Subject-Combination Checker"></section>
</main>
${CSO_SHELL_FOOTER}
</body>
</html>`;
}

export function renderPublicGuideArticleHtml(guide, relatedGuides = [], url = null) {
  const origin = url ? url.origin : 'https://csodisha.com';
  const canonical = `${origin}/guides/${encodeURIComponent(guide.slug)}`;
  const enParsed = renderGuideBodyWithToc(guide.body_en || '', 'en');
  const orParsed = renderGuideBodyWithToc(guide.body_or || guide.body_en || '', 'or');
  const socialOgImg = resolveSocialPreviewImageUrl(guide, origin);
  const categoryLabelEn = guide.category_label_en || (GUIDE_CATEGORY_MAP.get(guide.category) || GUIDE_CATEGORIES[0]).label_en;
  const categoryUrl = `${origin}/guides/?category=${encodeURIComponent(guide.category || 'how-to')}`;
  const faqs = normalizeFaqs(guide.faq_json !== undefined ? guide.faq_json : guide.faqs);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': buildGuideDetailJsonLdBlocks(guide, origin, categoryLabelEn, faqs)
  };

  const shareBarHeaderHtml = buildGuideShareBarHtml(guide, canonical, 'header');
  const shareBarFooterHtml = buildGuideShareBarHtml(guide, canonical, 'footer');

  const kicker = renderKicker([
    { label: 'Guides', url: '/guides/' },
    { label: guide.category_label_en, url: `/guides/?category=${encodeURIComponent(guide.category)}` },
    { label: guide.title_en, url: '' }
  ])
    .replace('class="cso-detail-kicker"', 'class="gp-breadcrumb cso-detail-kicker"')
    .replaceAll('class="cso-detail-kicker-sep"', 'class="gp-breadcrumb-sep cso-detail-kicker-sep"');

  const coverHtml = guide.cover_image
    ? `<figure class="gp-cover gp-cover-figure">
        <div class="gp-cover-frame gp-hero-media">
          <img src="${escShell(guide.cover_image)}" alt="${escShell(guide.cover_caption_en || guide.title_en)}" class="gp-cover-img" loading="eager" decoding="async">
        </div>
        ${(guide.cover_caption_en || guide.cover_caption_or)
          ? `<figcaption class="gp-caption">
              <span class="gp-lang-en">${escShell(guide.cover_caption_en || guide.cover_caption_or)}</span>
              <span class="gp-lang-or">${escShell(guide.cover_caption_or || guide.cover_caption_en)}</span>
            </figcaption>`
          : ''}
      </figure>`
    : '';

  const takeawaysHtml = guide.takeaways && guide.takeaways.length
    ? `<section class="gp-takeaways" aria-label="Key Takeaways">
        <h2 class="gp-sec-title">
          <span class="gp-lang-en">📌 Key Takeaways</span>
          <span class="gp-lang-or">📌 ମୁଖ୍ୟ ବିନ୍ଦୁସମୂହ</span>
        </h2>
        <ul class="gp-takeaway-list">
          ${guide.takeaways.map((t) => `<li>
            <span class="gp-lang-en">${escShell(t.text_en)}</span>
            <span class="gp-lang-or">${escShell(t.text_or || t.text_en)}</span>
          </li>`).join('\n')}
        </ul>
      </section>`
    : '';

  const tocEnHtml = enParsed.toc.length
    ? `<nav class="gp-toc gp-toc-card gp-lang-en" aria-label="Table of Contents">
        <details class="gp-toc-details" open>
          <summary class="gp-toc-summary">
            <span class="gp-toc-title">📑 On This Page (${enParsed.toc.length})</span>
            <span class="gp-toc-chevron" aria-hidden="true">▾</span>
          </summary>
          <ol class="gp-toc-list">
            ${enParsed.toc.map((h) => `<li class="is-lvl-${h.level}"><a href="#${escShell(h.id)}">${escShell(h.text)}</a></li>`).join('\n')}
          </ol>
        </details>
      </nav>`
    : '';
  const tocOrHtml = orParsed.toc.length
    ? `<nav class="gp-toc gp-toc-card gp-lang-or" aria-label="ବିଷୟସୂଚୀ">
        <details class="gp-toc-details" open>
          <summary class="gp-toc-summary">
            <span class="gp-toc-title">📑 ବିଷୟସୂଚୀ (${orParsed.toc.length})</span>
            <span class="gp-toc-chevron" aria-hidden="true">▾</span>
          </summary>
          <ol class="gp-toc-list">
            ${orParsed.toc.map((h) => `<li class="is-lvl-${h.level}"><a href="#${escShell(h.id)}">${escShell(h.text)}</a></li>`).join('\n')}
          </ol>
        </details>
      </nav>`
    : '';

  const galleryHtml = guide.photos && guide.photos.length
    ? `<section class="gp-section gp-gallery-sec" aria-label="Photo Gallery">
        <h2 class="gp-sec-title">
          <span class="gp-lang-en">🖼️ Visual Walkthrough &amp; Reference Photos</span>
          <span class="gp-lang-or">🖼️ ଚିତ୍ର ଓ ପ୍ରମାଣିକ ଫଟୋ</span>
        </h2>
        <div class="gp-gallery-grid">
          ${guide.photos.map((p) => `<figure class="gp-photo-card">
            <img src="${escShell(p.url)}" alt="${escShell(p.alt || p.caption_en || guide.title_en)}" loading="lazy" decoding="async">
            ${(p.caption_en || p.caption_or)
              ? `<figcaption class="gp-caption">
                  <span class="gp-lang-en">${escShell(p.caption_en || p.caption_or)}</span>
                  <span class="gp-lang-or">${escShell(p.caption_or || p.caption_en)}</span>
                </figcaption>`
              : ''}
          </figure>`).join('\n')}
        </div>
      </section>`
    : '';

  const pdfsHtml = guide.pdfs && guide.pdfs.length
    ? `<section class="gp-section gp-pdfs-sec" aria-label="Downloadable PDFs">
        <h2 class="gp-sec-title">
          <span class="gp-lang-en">📄 Downloadable PDFs &amp; Official Documents</span>
          <span class="gp-lang-or">📄 ଡାଉନଲୋଡ୍ ଯୋଗ୍ୟ PDF ଓ ସରକାରୀ ଦଲିଲ</span>
        </h2>
        <div class="gp-pdf-grid">
          ${guide.pdfs.map((d) => `<a class="gp-pdf-card" href="${escShell(d.url)}" target="_blank" rel="noopener noreferrer">
            <span class="gp-pdf-ico" aria-hidden="true">PDF</span>
            <span class="gp-pdf-info">
              <strong class="gp-pdf-title">
                <span class="gp-lang-en">${escShell(d.title_en)}</span>
                <span class="gp-lang-or">${escShell(d.title_or || d.title_en)}</span>
              </strong>
              <span class="gp-pdf-badge">${escShell(d.badge || 'Official PDF')}</span>
            </span>
            <span class="gp-pdf-dl">Download ↓</span>
          </a>`).join('\n')}
        </div>
      </section>`
    : '';

  const linksHtml = guide.links && guide.links.length
    ? `<section class="gp-section gp-links-sec" aria-label="Verified Official Links">
        <h2 class="gp-sec-title">
          <span class="gp-lang-en">🔗 Verified Official Links &amp; References</span>
          <span class="gp-lang-or">🔗 ଯାଞ୍ଚ ହୋଇଥିବା ସରକାରୀ ଲିଙ୍କ୍</span>
        </h2>
        <div class="gp-table-wrap">
          <table class="gp-table gp-links-table">
            <thead>
              <tr>
                <th>Resource / Portal</th>
                <th>Verification</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${guide.links.map((l) => {
                const ext = /^https?:\/\//i.test(l.url);
                const attrs = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
                return `<tr>
                  <td>
                    <span class="gp-lang-en">${escShell(l.label_en)}</span>
                    <span class="gp-lang-or">${escShell(l.label_or || l.label_en)}</span>
                  </td>
                  <td>${l.is_official ? '<span class="gp-gov-badge">✓ Official .gov.in Verified</span>' : '<span class="gp-ref-badge">Reference</span>'}</td>
                  <td><a class="gp-link-btn" href="${escShell(l.url)}"${attrs}>Open Link ↗</a></td>
                </tr>`;
              }).join('\n')}
            </tbody>
          </table>
        </div>
      </section>`
    : '';

  const cta = guide.related_cta && guide.related_cta.url ? guide.related_cta : null;
  const ctaTypeLabel = cta
    ? (cta.type === 'mock_test' ? '⏱️ Related CBT Mock Test' : (cta.type === 'job' ? '💼 Related Recruitment Alert' : (cta.type === 'scheme' ? '🏛️ Related Government Scheme' : '🚀 Next Recommended Action')))
    : '';
  const ctaBtnText = cta
    ? (cta.cta_en || (cta.type === 'mock_test' ? 'Start Practice Test →' : (cta.type === 'job' ? 'View Recruitment Alert →' : (cta.type === 'scheme' ? 'Check Scheme Eligibility →' : 'Open Resource →'))))
    : '';
  const relatedCtaHtml = cta
    ? `<section class="gp-related-cta" aria-label="Related Practice or Alert">
        <div class="gp-related-cta-copy">
          <span class="gp-badge">${escShell(ctaTypeLabel)}</span>
          <h2 class="gp-related-cta-title">
            <span class="gp-lang-en">${escShell(cta.title_en || cta.slug || 'Continue Your Preparation')}</span>
            <span class="gp-lang-or">${escShell(cta.title_or || cta.title_en || cta.slug || 'ଆପଣଙ୍କ ପ୍ରସ୍ତୁତି ଜାରି ରଖନ୍ତୁ')}</span>
          </h2>
        </div>
        <a class="gp-btn-primary" href="${escShell(cta.url)}">${escShell(ctaBtnText)}</a>
      </section>`
    : '';

  const moreGuidesHtml = relatedGuides && relatedGuides.length
    ? `<section class="gp-section gp-more-sec" aria-label="More Guides">
        <h2 class="gp-sec-title">More Informative Guides</h2>
        <div class="gp-more-grid">
          ${relatedGuides.slice(0, 3).map((rg) => `<a class="gp-more-card" href="${escShell(rg.url)}">
            <span class="gp-badge">${escShell(rg.category_icon)} ${escShell(rg.category_short_en)}</span>
            <strong>${escShell(rg.title_en)}</strong>
            <span>${escShell(rg.read_minutes)} min read →</span>
          </a>`).join('\n')}
        </div>
      </section>`
    : '';

  const tagList = String(guide.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const tagsHtml = tagList.length
    ? `<div class="gp-tags-row" aria-label="Topics">${tagList.map((t) => `<a class="gp-tag-chip" href="/guides/?q=${encodeURIComponent(t)}">#${escShell(t)}</a>`).join('')}</div>`
    : '';

  const head = buildGuidesHead({
    title: `${guide.title_en} | Common Sense Odisha`,
    description: guide.summary_en || '',
    body: guide.body_en || '',
    canonical,
    ogImage: socialOgImg,
    ogImageAlt: guide.cover_caption_en || guide.title_en,
    ogType: 'article',
    publishedTime: guide.created_at || guide.updated_at || '',
    modifiedTime: guide.updated_at || guide.created_at || '',
    jsonLd,
    origin
  });

  return `${head}
<body class="cso-portal-page cso-guide-reader-page" data-cso-portal="guides" data-guide-lang="en">
${CSO_SHELL_HEADER}
<main id="main-content" class="gp-main gp-reader-main gp-shell gp-detail-shell">
  <div class="cso-print-masthead">
    <strong class="cso-print-masthead__brand">Common Sense Odisha (csodisha.com)</strong>
    <span class="cso-print-masthead__url">${escShell(canonical)}</span>
  </div>
  ${kicker}
  <header class="gp-article-head gp-hero-card">
    <div class="gp-article-meta-row">
      <span class="gp-badge">${escShell(guide.category_icon)} ${escShell(guide.category_label_en)}</span>
      <span class="gp-meta-pill">⏱️ ${escShell(guide.read_minutes)} min read</span>
      <span class="gp-meta-pill">${escShell(guide.scope)}</span>
      ${guide.is_exam ? '<span class="gp-meta-pill is-exam">📝 Exam Relevant</span>' : ''}
      ${guide.updated_at ? `<span class="gp-meta-date">Updated ${escShell(formatHumanDate(guide.updated_at))}</span>` : ''}
      <div class="gp-lang-switch" role="group" aria-label="Article Language">
        <button type="button" class="gp-lang-btn is-active" data-set-guide-lang="en" aria-pressed="true">English</button>
        <button type="button" class="gp-lang-btn" data-set-guide-lang="or" aria-pressed="false">ଓଡ଼ିଆ</button>
      </div>
    </div>
    ${shareBarHeaderHtml}
    <h1 class="gp-article-title">
      <span class="gp-lang-en">${escShell(guide.title_en)}</span>
      <span class="gp-lang-or">${escShell(guide.title_or || guide.title_en)}</span>
    </h1>
    ${(guide.summary_en || guide.summary_or)
      ? `<p class="gp-article-summary">
          <span class="gp-lang-en">${escShell(guide.summary_en)}</span>
          <span class="gp-lang-or">${escShell(guide.summary_or || guide.summary_en)}</span>
        </p>`
      : ''}
  </header>

  ${coverHtml}

  <div class="gp-reader-layout gp-detail-grid">
    <aside class="gp-toc-rail">
      ${tocEnHtml}
      ${tocOrHtml}
    </aside>
    <article class="gp-article gp-article-body gp-article-card">
      ${takeawaysHtml}
      <div class="gp-body gp-prose gp-lang-en">${enParsed.html}</div>
      <div class="gp-body gp-prose gp-lang-or">${orParsed.html}</div>
      ${galleryHtml}
      ${pdfsHtml}
      ${linksHtml}
      ${relatedCtaHtml}
      ${tagsHtml}
      <section id="cso-article-quiz-root" class="cso-aq-root" data-quiz-type="guide" data-quiz-slug="${escShell(guide.slug)}"></section>
      <script type="application/json" id="cso-article-quiz-data">${serializeQuizJson(buildArticleMiniQuizPayload(guide, 'guide'))}</script>
      <footer class="gp-article-footer">
        ${shareBarFooterHtml}
      </footer>
      <div class="cso-print-footer">Source: Common Sense Odisha (csodisha.com) · ${escShell(canonical)}</div>
    </article>
  </div>

  ${moreGuidesHtml}
</main>
${CSO_SHELL_FOOTER}
</body>
</html>`;
}

function htmlResponse(html, status = 200, cacheControl = 'public, max-age=15, s-maxage=300, stale-while-revalidate=60') {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cacheControl,
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data: blob:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}

export async function handlePublicGuidesApi(request, env, url) {
  if (!env || !env.DB) {
    return new Response(JSON.stringify({ ok: true, items: [], categories: GUIDE_CATEGORIES }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  await ensureInformativeGuidesSchema(env.DB);
  const cat = String(url.searchParams.get('category') || '').trim().toLowerCase();
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
  const slug = String(url.searchParams.get('slug') || '').trim();

  if (slug) {
    const row = await env.DB.prepare(
      `SELECT * FROM informative_guides WHERE slug = ? AND status = 'published' LIMIT 1`
    ).bind(slug).first();
    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Guide not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    return new Response(JSON.stringify({ ok: true, item: formatGuideRow(row) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=15, s-maxage=300' }
    });
  }

  let sql = `SELECT * FROM informative_guides WHERE status = 'published'`;
  const binds = [];
  if (cat && cat !== 'all' && GUIDE_CATEGORY_MAP.has(cat)) {
    sql += ` AND category = ?`;
    binds.push(cat);
  }
  sql += ` ORDER BY is_pinned DESC, updated_at DESC LIMIT 60`;
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  let items = (results || []).map(formatGuideRow);
  if (q) {
    items = items.filter((g) => `${g.title_en} ${g.title_or} ${g.summary_en} ${g.tags}`.toLowerCase().includes(q));
  }
  return new Response(JSON.stringify({ ok: true, items, categories: GUIDE_CATEGORIES }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=15, s-maxage=300' }
  });
}

export async function handlePublicGuidesRoute(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const pathname = url.pathname;
  if (pathname === '/guides') {
    return Response.redirect(new URL('/guides/' + url.search, url.origin).toString(), 301);
  }
  if (!pathname.startsWith('/guides/')) return null;

  const rest = pathname.replace(/^\/guides\//, '').replace(/\/+$/, '');
  // Hub page: /guides/ or /guides/index.html
  if (!rest || rest === 'index.html') {
    let items = [];
    if (env && env.DB) {
      try {
        await ensureInformativeGuidesSchema(env.DB);
        const { results } = await env.DB.prepare(
          `SELECT * FROM informative_guides WHERE status = 'published' ORDER BY is_pinned DESC, updated_at DESC LIMIT 80`
        ).all();
        items = (results || []).map(formatGuideRow);
      } catch (_e) {}
    }
    const html = renderPublicGuidesHubHtml(items, url);
    return htmlResponse(request.method === 'HEAD' ? '' : html, 200);
  }

  // Ignore static asset extensions if any
  if (/\.[a-z0-9]{2,5}$/i.test(rest) || rest.includes('/')) return null;

  const slug = decodeURIComponent(rest).trim();
  let row = null;
  let related = [];
  if (env && env.DB) {
    try {
      await ensureInformativeGuidesSchema(env.DB);
      row = await env.DB.prepare(
        `SELECT * FROM informative_guides WHERE slug = ? AND status = 'published' LIMIT 1`
      ).bind(slug).first();
      if (row) {
        const relRes = await env.DB.prepare(
          `SELECT * FROM informative_guides WHERE status = 'published' AND id != ? ORDER BY (category = ?) DESC, is_pinned DESC, updated_at DESC LIMIT 3`
        ).bind(row.id, row.category).all();
        related = (relRes.results || []).map(formatGuideRow);
      }
    } catch (_e) {}
  }

  if (!row) {
    // v368: edited slug -> 301 to the current canonical slug instead of 404
    if (env && env.DB) {
      try {
        const moved = await env.DB.prepare(
          `SELECT g.slug AS slug FROM guide_slug_history h
           JOIN informative_guides g ON g.id = h.guide_id
           WHERE h.old_slug = ? AND g.status = 'published' LIMIT 1`
        ).bind(slug).first();
        if (moved && moved.slug && moved.slug !== slug) {
          return Response.redirect(new URL(`/guides/${encodeURIComponent(moved.slug)}${url.search}`, url.origin).toString(), 301);
        }
      } catch (_e) {}
    }
    const head404 = buildGuidesHead({
      title: 'Guide Not Found | Common Sense Odisha',
      description: 'The requested informative guide could not be found. Browse all Odisha & National guides on Common Sense Odisha.',
      canonical: `${url.origin}/guides/`,
      robots: 'noindex, follow'
    });
    const notFoundHtml = `${head404}
<body class="cso-portal-page cso-guides-page" data-cso-portal="guides" data-guide-lang="en">
${CSO_SHELL_HEADER}
<main id="main-content" class="gp-main gp-shell">
  <div class="gp-empty-state">
    <h1>Guide Not Found</h1>
    <p>This informative article or guide may have been moved or is still in draft review.</p>
    <form class="gp-search-bar" action="/guides/" method="get" role="search">
      <label for="gp404Search" class="cso-sr-only">Search informative guides</label>
      <input type="search" id="gp404Search" name="q" class="gp-search-input" placeholder="Search guides...">
      <button type="submit" class="gp-btn-primary">Search</button>
    </form>
    <a class="gp-btn-primary" href="/guides/">Browse All Informative Guides →</a>
    <a class="gp-btn-primary" href="/">Back to Home</a>
  </div>
</main>
${CSO_SHELL_FOOTER}
</body>
</html>`;
    const nfRes = htmlResponse(request.method === 'HEAD' ? '' : notFoundHtml, 404, 'no-store');
    nfRes.headers.set('X-Robots-Tag', 'noindex, follow');
    return nfRes;
  }

  const guide = formatGuideRow(row);
  const html = renderPublicGuideArticleHtml(guide, related, url);
  return htmlResponse(request.method === 'HEAD' ? '' : html, 200);
}
