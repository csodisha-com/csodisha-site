/**
 * Common Sense Odisha — Dynamic OpenGraph & WhatsApp/Telegram Rich Link Preview Builder (v392)
 * Emits a single, deduplicated, HTML-escaped set of og:*, article:*, and twitter:* tags
 * for /jobs/<slug> and /guides/<slug> SSR detail responses and hub pages.
 */

export const SITE_ORIGIN = 'https://csodisha.com';
export const DEFAULT_SOCIAL_IMAGE_PATH = '/assets/img/cso-logo-400.webp';

export function escMetaAttr(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function cleanSocialText(raw, maxLen = 160) {
  let s = String(raw || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`~>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, Math.max(1, maxLen - 1)).replace(/\s+\S*$/, '').trim();
  return (cut || s.slice(0, maxLen - 1).trim()) + '…';
}

export function resolveAbsoluteHttpsImage(rawImage, origin = SITE_ORIGIN) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const fallback = `${cleanOrigin}${DEFAULT_SOCIAL_IMAGE_PATH}`;
  const raw = String(rawImage || '').trim();
  if (!raw) return fallback;
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  if (raw.startsWith('/') && !raw.startsWith('//')) return `${cleanOrigin}${raw}`;
  return fallback;
}

export function inferImageMimeType(url) {
  const clean = String(url || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/webp';
}

export function toIsoTimestamp(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00+05:30`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * Strips any stale/static og:*, article:*, or twitter:* <meta> tags from HTML
 * so WhatsApp, Telegram, Facebook, and X scrapers read one authoritative set.
 */
export function stripExistingSocialMetaTags(html) {
  return String(html || '')
    .replace(/\s*<meta\s+[^>]*\bproperty=["'](?:og|article):[^"']+["'][^>]*>\s*/gi, '\n')
    .replace(/\s*<meta\s+[^>]*\bname=["']twitter:[^"']+["'][^>]*>\s*/gi, '\n');
}

/**
 * Builds clean, HTML-escaped OpenGraph + Article + Twitter Card <meta> tags.
 */
export function buildSocialMetaTags(options = {}) {
  const origin = String(options.origin || SITE_ORIGIN).replace(/\/+$/, '');
  const ogType = String(options.ogType || 'article').trim();
  const canonical = String(options.url || options.canonical || `${origin}/`).trim();
  const title = cleanSocialText(options.title || 'Common Sense Odisha', 95) || 'Common Sense Odisha';
  const descSource = options.description || options.body || options.title || 'Odisha Government Jobs, Exam Updates, Admit Cards & Welfare Schemes on Common Sense Odisha.';
  const description = cleanSocialText(descSource, 160) || title;
  const imageUrl = resolveAbsoluteHttpsImage(options.image, origin);
  const imageType = inferImageMimeType(imageUrl);
  const imageAlt = cleanSocialText(options.imageAlt || title, 120) || title;
  const width = String(options.imageWidth || '1200');
  const height = String(options.imageHeight || '630');
  const publishedIso = ogType === 'article' ? toIsoTimestamp(options.publishedTime) : '';
  const modifiedIso = ogType === 'article' ? toIsoTimestamp(options.modifiedTime) : '';

  const tags = [
    `<meta property="og:site_name" content="Common Sense Odisha">`,
    `<meta property="og:locale" content="en_IN">`,
    `<meta property="og:locale:alternate" content="or_IN">`,
    `<meta property="og:type" content="${escMetaAttr(ogType)}">`,
    `<meta property="og:url" content="${escMetaAttr(canonical)}">`,
    `<meta property="og:title" content="${escMetaAttr(title)}">`,
    `<meta property="og:description" content="${escMetaAttr(description)}">`,
    `<meta property="og:image" content="${escMetaAttr(imageUrl)}">`,
    `<meta property="og:image:secure_url" content="${escMetaAttr(imageUrl)}">`,
    `<meta property="og:image:type" content="${escMetaAttr(imageType)}">`,
    `<meta property="og:image:width" content="${escMetaAttr(width)}">`,
    `<meta property="og:image:height" content="${escMetaAttr(height)}">`,
    `<meta property="og:image:alt" content="${escMetaAttr(imageAlt)}">`
  ];

  if (publishedIso) {
    tags.push(`<meta property="article:published_time" content="${escMetaAttr(publishedIso)}">`);
  }
  if (modifiedIso) {
    tags.push(`<meta property="article:modified_time" content="${escMetaAttr(modifiedIso)}">`);
  }

  tags.push(
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escMetaAttr(title)}">`,
    `<meta name="twitter:description" content="${escMetaAttr(description)}">`,
    `<meta name="twitter:image" content="${escMetaAttr(imageUrl)}">`,
    `<meta name="twitter:image:alt" content="${escMetaAttr(imageAlt)}">`
  );

  return tags.join('\n  ');
}

/**
 * Strips any existing og:* / article:* / twitter:* tags in <head> and injects
 * the freshly generated authoritative social meta tags before </head>.
 */
export function injectSocialMetaIntoHtml(html, options = {}) {
  const stripped = stripExistingSocialMetaTags(html);
  const block = buildSocialMetaTags(options);
  return stripped.replace(/<\/head>/i, `  ${block}\n</head>`);
}
