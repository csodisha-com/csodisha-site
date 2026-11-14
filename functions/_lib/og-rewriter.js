// Dynamic <title> / description / Open Graph / Twitter Card injection for shared
// Job and Scheme deep links. Any failure falls back to the untouched static page.
import { PUBLIC_VISIBLE_SQL } from './validate.js';

const ORIGIN = 'https://csodisha.com';
const SITE_NAME = 'Common Sense Odisha (CS Odisha)';
export const DEFAULT_OG_IMAGE = 'https://assets.csodisha.org/img/cso-dashboard-og-preview.png';

export function clean(v, max) {
  const s = String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!max || s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

export function httpsImage(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (s.startsWith('external:')) return httpsImage(s.slice(9));
  if (/^https:\/\/[^\s"<>]+$/i.test(s)) return s;
  if (/^\/(?!\/)[^\s"<>]*$/.test(s)) return ORIGIN + s;
  return null;
}

function coverUrl(key) {
  if (!key) return null;
  const s = String(key);
  if (s.startsWith('external:')) return httpsImage(s.slice(9));
  return httpsImage('/api/media/' + encodeURIComponent(s).replace(/%2F/g, '/'));
}

function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  if (!m) return '';
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1];
  return mon ? `${Number(m[3])} ${mon} ${m[1]}` : '';
}

export function buildJobMeta(r) {
  const slug = r.slug || r.id;
  const parts = [r.organisation, r.category].map(x => clean(x)).filter(Boolean);
  let desc = parts.join(' · ');
  const key = clean(r.summary || r.qualification, 90);
  if (key) desc += (desc ? ' — ' : '') + key;
  if (r.last_date && fmtDate(r.last_date)) desc += (desc ? '. ' : '') + 'Last date: ' + fmtDate(r.last_date);
  return {
    title: clean(r.title, 110),
    description: clean(desc || 'Odisha job notification with eligibility, vacancies and last date on Common Sense Odisha.', 160),
    url: `${ORIGIN}/jobs-careers/?job=${encodeURIComponent(slug)}`,
    image: coverUrl(r.cover_media_key) || DEFAULT_OG_IMAGE
  };
}

export function buildSchemeMeta(r) {
  const slug = r.slug || r.id;
  const parts = [r.department, r.category].map(x => clean(x)).filter(Boolean);
  let desc = parts.join(' · ');
  const key = clean(r.benefit_summary || r.summary, 100);
  if (key) desc += (desc ? ' — ' : '') + key;
  return {
    title: clean(r.title, 110),
    description: clean(desc || 'Odisha welfare scheme benefits, eligibility and how to apply on Common Sense Odisha.', 160),
    url: `${ORIGIN}/schemes-benefits/?scheme=${encodeURIComponent(slug)}`,
    image: DEFAULT_OG_IMAGE
  };
}

// Pure rewriter so it can be unit-tested with any HTMLRewriter-compatible implementation.
export function rewriteHead(response, meta, RewriterCtor) {
  const Rewriter = RewriterCtor || globalThis.HTMLRewriter;
  const seen = {};
  const wanted = {
    'name:description': meta.description,
    'property:og:description': meta.description,
    'name:twitter:description': meta.description,
    'property:og:title': `${meta.title} | Common Sense Odisha`,
    'name:twitter:title': `${meta.title} | Common Sense Odisha`,
    'property:og:url': meta.url,
    'property:og:type': 'article',
    'property:og:site_name': SITE_NAME,
    'property:og:image': meta.image,
    'name:twitter:image': meta.image,
    'name:twitter:card': 'summary_large_image'
  };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let titleSeen = false, canonSeen = false;
  return new Rewriter()
    .on('title', { element(e) { titleSeen = true; e.setInnerContent(`${meta.title} — CS Odisha`); } })
    .on('link[rel="canonical"]', { element(e) { canonSeen = true; e.setAttribute('href', meta.url); } })
    .on('meta', {
      element(e) {
        const name = e.getAttribute('name');
        const prop = e.getAttribute('property');
        const k = name ? 'name:' + name : prop ? 'property:' + prop : null;
        if (k && Object.prototype.hasOwnProperty.call(wanted, k)) {
          seen[k] = true;
          e.setAttribute('content', wanted[k]);
        }
      }
    })
    .on('head', {
      element(e) {
        e.onEndTag(end => {
          let add = '';
          if (!titleSeen) add += `<title>${esc(meta.title + ' — CS Odisha')}</title>\n`;
          if (!canonSeen) add += `<link rel="canonical" href="${esc(meta.url)}">\n`;
          Object.keys(wanted).forEach(k => {
            if (seen[k]) return;
            const i = k.indexOf(':');
            add += `<meta ${k.slice(0, i)}="${esc(k.slice(i + 1))}" content="${esc(wanted[k])}">\n`;
          });
          if (add) end.before(add, { html: true });
        });
      }
    })
    .transform(response);
}

async function handle(context, param, loader, builder) {
  try {
    const url = new URL(context.request.url);
    const raw = (url.searchParams.get(param) || '').trim();
    if (!raw || raw.length > 200 || context.request.method !== 'GET' || !context.env || !context.env.DB) return context.next();
    const row = await loader(context.env.DB, raw);
    if (!row) return context.next();
    const res = await context.next();
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('text/html')) return res;
    return rewriteHead(res, builder(row));
  } catch (_) {
    return context.next();
  }
}

export function handleJobOg(context) {
  return handle(context, 'job', (db, v) => db.prepare(
    `SELECT id, slug, title, summary, category, organisation, qualification, last_date, cover_media_key
       FROM posts WHERE type = 'job' AND (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL} LIMIT 1`).bind(v, v).first(), buildJobMeta);
}

export function handleSchemeOg(context) {
  return handle(context, 'scheme', (db, v) => db.prepare(
    `SELECT id, slug, title, summary, benefit_summary, category, department
       FROM schemes_directory WHERE (slug = ? OR id = ?) AND status = 'published' AND deleted_at IS NULL LIMIT 1`).bind(v, v).first(), buildSchemeMeta);
}
