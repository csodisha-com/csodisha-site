/**
 * Common Sense Odisha — Bilingual RSS 2.0 (/feed.xml, /rss.xml) & JSON Feed 1.1 (/feed.json) Engine (v395)
 * Backed live by Cloudflare D1 (`job_articles` + `informative_guides`).
 * Supports optional `?category=jobs|exams|results|guides` and `?limit=1..60` (default 40).
 * Cached at edge (`public, max-age=300, s-maxage=900, stale-while-revalidate=3600`) and purged on Admin saves.
 */

export const SITE_ORIGIN = 'https://csodisha.com';
export const DEFAULT_FEED_IMAGE = `${SITE_ORIGIN}/assets/img/cso-logo-400.webp`;

function escXml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripPlain(raw, maxLen = 320) {
  const s = String(raw || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`~>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1).replace(/\s+\S*$/, '').trim() + '…';
}

function resolveAbsImage(raw, origin = SITE_ORIGIN) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const s = String(raw || '').trim();
  if (!s) return `${cleanOrigin}/assets/img/cso-logo-400.webp`;
  if (/^https:\/\//i.test(s)) return s;
  if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, 'https://');
  if (s.startsWith('/') && !s.startsWith('//')) return `${cleanOrigin}${s}`;
  return `${cleanOrigin}/assets/img/cso-logo-400.webp`;
}

function inferMime(url) {
  const clean = String(url || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/webp';
}

function toIsoDate(raw, fallbackIso = '') {
  const s = String(raw || '').trim();
  if (s) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00Z`;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallbackIso || new Date().toISOString();
}

function toRfc2822(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

function classifyJobRow(row) {
  const stage = String(row.lifecycle_stage || '').toLowerCase().trim();
  if (stage === 'result') return { bucket: 'results', label: 'Exam Result' };
  if (stage === 'admit_card' || stage === 'exam_date' || stage === 'answer_key') {
    return { bucket: 'exams', label: 'Exam Update & Admit Card' };
  }
  if (stage === 'current_affairs') return { bucket: 'guides', label: 'Current Affairs' };
  return { bucket: 'jobs', label: 'Job Alert' };
}

function normalizeFeedEntry(row, kind, origin = SITE_ORIGIN) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const slug = String(row.slug || row.id || '').trim();
  if (!slug) return null;

  const isJob = kind === 'job';
  const url = isJob
    ? `${cleanOrigin}/jobs/${encodeURIComponent(slug)}`
    : `${cleanOrigin}/guides/${encodeURIComponent(slug)}`;

  const titleEn = stripPlain(row.title_en || 'Common Sense Odisha Update', 180);
  const titleOr = stripPlain(row.title_or || '', 220);
  const bilingualTitle = (titleOr && titleOr !== titleEn) ? `${titleEn} | ${titleOr}` : titleEn;

  const summaryEn = stripPlain(row.summary_en || row.article_body_en || row.body_en || titleEn, 280);
  const summaryOr = stripPlain(row.summary_or || '', 320);
  const bilingualSummary = (summaryOr && summaryOr !== summaryEn) ? `${summaryEn} — ${summaryOr}` : summaryEn;

  const image = resolveAbsImage(isJob ? row.cover_image_url : row.cover_image, cleanOrigin);
  const org = stripPlain(isJob ? (row.organisation_en || row.sector_badge) : (row.scope || 'Common Sense Odisha'), 120);
  const deadlineIso = isJob ? String(row.last_date || row.exam_date || '').trim() : '';
  const officialUrl = isJob
    ? String(row.official_apply_url || row.result_url || row.notification_pdf_url || row.official_website_url || '').trim()
    : '';

  const cls = isJob
    ? classifyJobRow(row)
    : { bucket: 'guides', label: row.is_exam ? 'Exam Update & Admit Card' : 'Study Guide' };

  const publishedIso = toIsoDate(row.published_at || row.created_at || row.updated_at);
  const modifiedIso = toIsoDate(row.updated_at || row.published_at || row.created_at, publishedIso);
  const sortTs = Date.parse(modifiedIso) || Date.parse(publishedIso) || 0;

  const htmlParts = [
    `<p><img src="${escHtml(image)}" alt="${escHtml(titleEn)}" width="1200" height="630" /></p>`,
    `<p><strong>${escHtml(titleEn)}</strong></p>`
  ];
  if (titleOr && titleOr !== titleEn) {
    htmlParts.push(`<p><strong>${escHtml(titleOr)}</strong></p>`);
  }
  if (summaryEn) htmlParts.push(`<p>${escHtml(summaryEn)}</p>`);
  if (summaryOr && summaryOr !== summaryEn) htmlParts.push(`<p>${escHtml(summaryOr)}</p>`);
  const metaBullets = [];
  if (org) metaBullets.push(`<li><strong>Authority / Scope:</strong> ${escHtml(org)}</li>`);
  if (deadlineIso) metaBullets.push(`<li><strong>Key Date / Deadline:</strong> ${escHtml(deadlineIso)}</li>`);
  if (officialUrl && /^https?:\/\//i.test(officialUrl)) {
    metaBullets.push(`<li><strong>Official Portal / PDF:</strong> <a href="${escHtml(officialUrl)}">${escHtml(officialUrl)}</a></li>`);
  }
  metaBullets.push(`<li><strong>Full Bilingual Details:</strong> <a href="${escHtml(url)}">${escHtml(url)}</a></li>`);
  htmlParts.push(`<ul>${metaBullets.join('')}</ul>`);

  return {
    id: url,
    slug,
    kind,
    bucket: cls.bucket,
    category_label: cls.label,
    url,
    title: bilingualTitle,
    summary: bilingualSummary,
    content_html: htmlParts.join('\n'),
    image,
    image_mime: inferMime(image),
    date_published: publishedIso,
    date_modified: modifiedIso,
    pub_date_rfc2822: toRfc2822(publishedIso),
    sort_ts: sortTs,
    tags: [cls.label, org].filter(Boolean),
    _cso_bilingual: {
      title_en: titleEn,
      title_or: titleOr,
      summary_en: summaryEn,
      summary_or: summaryOr,
      org,
      category: cls.label,
      official_url: officialUrl,
      deadline_iso: deadlineIso
    }
  };
}

export async function collectUnifiedFeedItems(env, options = {}) {
  const origin = String(options.origin || SITE_ORIGIN).replace(/\/+$/, '');
  const categoryFilter = String(options.category || '').trim().toLowerCase();
  const limit = Math.max(1, Math.min(60, Number(options.limit) || 40));

  let jobRows = [];
  let guideRows = [];
  if (env && env.DB) {
    const [jobsRes, guidesRes] = await Promise.all([
      env.DB.prepare(
        `SELECT * FROM job_articles WHERE is_published = 1 ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC LIMIT 60`
      ).all().catch(() => ({ results: [] })),
      env.DB.prepare(
        `SELECT * FROM informative_guides WHERE status = 'published' ORDER BY updated_at DESC LIMIT 60`
      ).all().catch(() => ({ results: [] }))
    ]);
    jobRows = (jobsRes && jobsRes.results) || [];
    guideRows = (guidesRes && guidesRes.results) || [];
  }

  const unified = [];
  const seen = new Set();

  for (const r of jobRows) {
    if (r.is_published !== undefined && Number(r.is_published) !== 1) continue;
    const item = normalizeFeedEntry(r, 'job', origin);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    unified.push(item);
  }
  for (const g of guideRows) {
    if (g.status !== undefined && String(g.status).toLowerCase() !== 'published') continue;
    const item = normalizeFeedEntry(g, 'guide', origin);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    unified.push(item);
  }

  unified.sort((a, b) => b.sort_ts - a.sort_ts);

  const filtered = categoryFilter
    ? unified.filter((it) => {
        if (categoryFilter === 'jobs' || categoryFilter === 'job') return it.bucket === 'jobs';
        if (categoryFilter === 'exams' || categoryFilter === 'exam') return it.bucket === 'exams';
        if (categoryFilter === 'results' || categoryFilter === 'result') return it.bucket === 'results';
        if (categoryFilter === 'guides' || categoryFilter === 'guide') return it.bucket === 'guides';
        return true;
      })
    : unified;

  return filtered.slice(0, limit);
}

export function renderRss2Xml(items, options = {}) {
  const origin = String(options.origin || SITE_ORIGIN).replace(/\/+$/, '');
  const selfUrl = String(options.selfUrl || `${origin}/feed.xml`);
  const lastBuild = items.length ? items[0].pub_date_rfc2822 : new Date().toUTCString();

  const itemsXml = items.map((it) => (
    `    <item>\n` +
    `      <title>${escXml(it.title)}</title>\n` +
    `      <link>${escXml(it.url)}</link>\n` +
    `      <guid isPermaLink="true">${escXml(it.url)}</guid>\n` +
    `      <pubDate>${escXml(it.pub_date_rfc2822)}</pubDate>\n` +
    `      <category>${escXml(it.category_label)}</category>\n` +
    `      <description>${escXml(it.summary)}</description>\n` +
    `      <media:content url="${escXml(it.image)}" type="${escXml(it.image_mime)}" medium="image" width="1200" height="630" />\n` +
    `    </item>`
  )).join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n` +
    `  <channel>\n` +
    `    <title>Common Sense Odisha — Bilingual Job, Exam &amp; Result Alerts (EN / ଓଡ଼ିଆ)</title>\n` +
    `    <link>${escXml(origin)}/</link>\n` +
    `    <description>Verified Odisha &amp; National government job notifications, exam schedules, admit cards, results, and study guides in English and Odia.</description>\n` +
    `    <language>en-IN</language>\n` +
    `    <lastBuildDate>${escXml(lastBuild)}</lastBuildDate>\n` +
    `    <atom:link href="${escXml(selfUrl)}" rel="self" type="application/rss+xml" />\n` +
    (itemsXml ? `${itemsXml}\n` : '') +
    `  </channel>\n` +
    `</rss>\n`
  );
}

export function renderJsonFeed11(items, options = {}) {
  const origin = String(options.origin || SITE_ORIGIN).replace(/\/+$/, '');
  const feedUrl = String(options.feedUrl || `${origin}/feed.json`);
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Common Sense Odisha — Bilingual Job, Exam & Result Alerts (EN / ଓଡ଼ିଆ)',
    home_page_url: `${origin}/`,
    feed_url: feedUrl,
    description: 'Verified Odisha & National government job notifications, exam schedules, admit cards, results, and study guides in English and Odia.',
    icon: `${origin}/assets/img/icon-512.png`,
    favicon: `${origin}/assets/img/favicon-32x32.png`,
    language: 'en-IN',
    items: items.map((it) => ({
      id: it.id,
      url: it.url,
      title: it.title,
      content_html: it.content_html,
      summary: it.summary,
      image: it.image,
      date_published: it.date_published,
      date_modified: it.date_modified,
      tags: it.tags,
      _cso_bilingual: it._cso_bilingual
    }))
  };
}

export async function handlePublicRssFeedXml(request, env) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || '';
  const limit = url.searchParams.get('limit') || 40;
  const items = await collectUnifiedFeedItems(env, { origin: SITE_ORIGIN, category, limit });
  const selfUrl = `${SITE_ORIGIN}/feed.xml${category ? (`?category=${encodeURIComponent(category)}`) : ''}`;
  const xml = renderRss2Xml(items, { origin: SITE_ORIGIN, selfUrl });
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function handlePublicJsonFeed(request, env) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || '';
  const limit = url.searchParams.get('limit') || 40;
  const items = await collectUnifiedFeedItems(env, { origin: SITE_ORIGIN, category, limit });
  const feedUrl = `${SITE_ORIGIN}/feed.json${category ? (`?category=${encodeURIComponent(category)}`) : ''}`;
  const payload = renderJsonFeed11(items, { origin: SITE_ORIGIN, feedUrl });
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
