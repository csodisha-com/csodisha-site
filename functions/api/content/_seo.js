// Dynamic SEO endpoints (/sitemap.xml, /feed.xml, /rss.xml) and server-side
// HTMLRewriter OpenGraph / Twitter Card meta injection for deep-linked content.
import { PUBLIC_VISIBLE_SQL } from '../../_lib/validate.js';

const SITE_ORIGIN = 'https://csodisha.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/images/cso-logo.svg`;
const SEO_CACHE = 'public, max-age=300, s-maxage=900';

const STATIC_SITEMAP_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/jobs-careers/', changefreq: 'daily', priority: '0.9' },
  { path: '/current-affairs/', changefreq: 'daily', priority: '0.9' },
  { path: '/mock-tests/', changefreq: 'daily', priority: '0.8' },
  { path: '/resources/', changefreq: 'weekly', priority: '0.8' },
  { path: '/schemes-benefits/', changefreq: 'weekly', priority: '0.7' },
  { path: '/study-library/', changefreq: 'weekly', priority: '0.8' },
  { path: '/community/', changefreq: 'monthly', priority: '0.6' },
  { path: '/about/', changefreq: 'monthly', priority: '0.6' },
  { path: '/support/', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy-policy/', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms-of-use/', changefreq: 'yearly', priority: '0.3' }
];

export function xmlEscape(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function plainTextExcerpt(raw, maxLen = 160) {
  if (!raw) return '';
  const stripped = String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, Math.max(0, maxLen - 1)).trimEnd() + '…';
}

function parseSqlDate(ts) {
  if (!ts) return null;
  const s = String(ts).trim();
  const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoLastMod(ts) {
  const d = parseSqlDate(ts);
  return d ? d.toISOString() : null;
}

function toRfc822Date(ts) {
  const d = parseSqlDate(ts) || new Date();
  return d.toUTCString();
}

export async function handleSitemapXml(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const urls = STATIC_SITEMAP_ROUTES.map(r => ({
    loc: `${SITE_ORIGIN}${r.path}`,
    lastmod: null,
    changefreq: r.changefreq,
    priority: r.priority
  }));

  if (env && env.DB) {
    try {
      const [jobsRes, caRes, testsRes, schemesRes] = await Promise.all([
        env.DB.prepare(
          `SELECT slug, updated_at, published_at FROM posts
           WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL}
           ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 1000`
        ).all(),
        env.DB.prepare(
          `SELECT slug, updated_at, published_at FROM posts
           WHERE type = 'current_affair' AND ${PUBLIC_VISIBLE_SQL}
           ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 1000`
        ).all(),
        env.DB.prepare(
          `SELECT slug, updated_at, published_at FROM mock_tests
           WHERE ${PUBLIC_VISIBLE_SQL}
           ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 500`
        ).all(),
        env.DB.prepare(
          `SELECT slug, updated_at FROM schemes_directory
           WHERE status = 'published' AND deleted_at IS NULL
           ORDER BY is_featured DESC, sort_order ASC LIMIT 500`
        ).all().catch(() => ({ results: [] }))
      ]);

      for (const row of (jobsRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/jobs-careers/?job=${encodeURIComponent(row.slug)}`,
          lastmod: toIsoLastMod(row.updated_at || row.published_at),
          changefreq: 'daily',
          priority: '0.9'
        });
      }

      for (const row of (caRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/current-affairs/?slug=${encodeURIComponent(row.slug)}`,
          lastmod: toIsoLastMod(row.updated_at || row.published_at),
          changefreq: 'daily',
          priority: '0.8'
        });
      }

      for (const row of (testsRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/mock-tests/?test=${encodeURIComponent(row.slug)}`,
          lastmod: toIsoLastMod(row.updated_at || row.published_at),
          changefreq: 'weekly',
          priority: '0.8'
        });
      }

      for (const row of (schemesRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/schemes-benefits/?scheme=${encodeURIComponent(row.slug)}`,
          lastmod: toIsoLastMod(row.updated_at),
          changefreq: 'weekly',
          priority: '0.7'
        });
      }
    } catch (e) {
      console.error('sitemap D1 query error:', e);
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => {
      const parts = [
        `  <url>`,
        `    <loc>${xmlEscape(u.loc)}</loc>`
      ];
      if (u.lastmod) parts.push(`    <lastmod>${xmlEscape(u.lastmod)}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${xmlEscape(u.changefreq)}</changefreq>`);
      if (u.priority) parts.push(`    <priority>${xmlEscape(u.priority)}</priority>`);
      parts.push(`  </url>`);
      return parts.join('\n');
    }).join('\n') +
    `\n</urlset>\n`;

  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SEO_CACHE,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function handleRssFeed(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  let items = [];
  if (env && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, type, slug, title, summary, body_md, category, organisation, published_at, updated_at
         FROM posts
         WHERE type IN ('job', 'current_affair') AND ${PUBLIC_VISIBLE_SQL}
         ORDER BY COALESCE(published_at, updated_at) DESC
         LIMIT 30`
      ).all();
      items = results || [];
    } catch (e) {
      console.error('rss D1 query error:', e);
    }
  }

  const lastBuildDate = items.length > 0
    ? toRfc822Date(items[0].published_at || items[0].updated_at)
    : new Date().toUTCString();

  const itemXml = items.map(r => {
    const link = r.type === 'job'
      ? `${SITE_ORIGIN}/jobs-careers/?job=${encodeURIComponent(r.slug)}`
      : `${SITE_ORIGIN}/current-affairs/?slug=${encodeURIComponent(r.slug)}`;
    const category = r.category || (r.type === 'job' ? (r.organisation || 'Recruitment') : 'Current Affairs');
    const desc = plainTextExcerpt(r.summary || r.body_md || r.title, 280);
    const pubDate = toRfc822Date(r.published_at || r.updated_at);

    return [
      `    <item>`,
      `      <title>${xmlEscape(r.title)}</title>`,
      `      <link>${xmlEscape(link)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
      `      <pubDate>${xmlEscape(pubDate)}</pubDate>`,
      `      <category>${xmlEscape(category)}</category>`,
      `      <description>${xmlEscape(desc)}</description>`,
      `    </item>`
    ].join('\n');
  }).join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>CS Odisha — Jobs, Recruitment &amp; Current Affairs</title>\n` +
    `    <link>${SITE_ORIGIN}/</link>\n` +
    `    <description>Verified Odisha government job alerts, OPSC/OSSC/OSSSC updates, and daily current affairs from Common Sense Odisha.</description>\n` +
    `    <language>en-in</language>\n` +
    `    <lastBuildDate>${xmlEscape(lastBuildDate)}</lastBuildDate>\n` +
    `    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml" />\n` +
    (itemXml ? `${itemXml}\n` : '') +
    `  </channel>\n` +
    `</rss>\n`;

  return new Response(request.method === 'HEAD' ? null : xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': SEO_CACHE,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function resolveImageMediaUrl(mediaKey) {
  if (!mediaKey || typeof mediaKey !== 'string') return DEFAULT_OG_IMAGE;
  if (/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(mediaKey.trim())) {
    return `${SITE_ORIGIN}/api/media/${mediaKey.trim()}`;
  }
  return DEFAULT_OG_IMAGE;
}

export async function resolveDeepLinkMeta(url, env) {
  if (!env || !env.DB) return null;
  const pathname = url.pathname;

  try {
    if (/^\/jobs-careers(\/|\/index\.html)?$/.test(pathname)) {
      const slug = (url.searchParams.get('job') || '').trim().slice(0, 120);
      if (!slug) return null;
      const job = await env.DB.prepare(
        `SELECT slug, title, summary, body_md, organisation, vacancies, qualification, last_date, cover_media_key, notification_media_key
         FROM posts
         WHERE type = 'job' AND (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`
      ).bind(slug, slug).first();
      if (!job) return null;

      const fallbackSummary = [
        job.organisation ? `${job.organisation}:` : '',
        job.title,
        job.vacancies ? `(${job.vacancies} Vacancies)` : '',
        job.qualification ? `· Qualification: ${job.qualification}` : '',
        job.last_date ? `· Last Date: ${job.last_date}` : ''
      ].filter(Boolean).join(' ');

      const description = plainTextExcerpt(job.summary || job.body_md || fallbackSummary, 160);
      const canonicalUrl = `${SITE_ORIGIN}/jobs-careers/?job=${encodeURIComponent(job.slug)}`;
      const ogImage = resolveImageMediaUrl(job.cover_media_key || job.notification_media_key);

      return {
        pageTitle: `${job.title} | CS Odisha`,
        title: job.title,
        description,
        canonicalUrl,
        ogImage
      };
    }

    if (/^\/current-affairs(\/|\/index\.html)?$/.test(pathname)) {
      const slug = (url.searchParams.get('slug') || '').trim().slice(0, 120);
      if (!slug) return null;
      const ca = await env.DB.prepare(
        `SELECT slug, title, summary, body_md, category, cover_media_key
         FROM posts
         WHERE type = 'current_affair' AND (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`
      ).bind(slug, slug).first();
      if (!ca) return null;

      const description = plainTextExcerpt(ca.summary || ca.body_md || ca.title, 160);
      const canonicalUrl = `${SITE_ORIGIN}/current-affairs/?slug=${encodeURIComponent(ca.slug)}`;
      const ogImage = resolveImageMediaUrl(ca.cover_media_key);

      return {
        pageTitle: `${ca.title} | CS Odisha`,
        title: ca.title,
        description,
        canonicalUrl,
        ogImage
      };
    }

    if (/^\/mock-tests(\/|\/index\.html)?$/.test(pathname)) {
      const slug = (url.searchParams.get('test') || '').trim().slice(0, 120);
      if (!slug) return null;
      const test = await env.DB.prepare(
        `SELECT slug, title, target_exam, duration_minutes, total_marks
         FROM mock_tests
         WHERE (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`
      ).bind(slug, slug).first();
      if (!test) return null;

      const description = plainTextExcerpt(
        `${test.title}${test.target_exam ? ' (' + test.target_exam + ')' : ''} — ${test.duration_minutes || 60} min, ${test.total_marks || 100} marks online CBT practice test on CS Odisha.`,
        160
      );
      const canonicalUrl = `${SITE_ORIGIN}/mock-tests/?test=${encodeURIComponent(test.slug)}`;

      return {
        pageTitle: `${test.title} | CS Odisha`,
        title: test.title,
        description,
        canonicalUrl,
        ogImage: DEFAULT_OG_IMAGE
      };
    }
  } catch (e) {
    console.error('resolveDeepLinkMeta error:', e);
  }

  return null;
}

export function rewriteHtmlWithMeta(response, meta) {
  if (!meta || typeof HTMLRewriter === 'undefined') return response;

  const injectedTags = [
    `<meta name="description" content="${xmlEscape(meta.description)}">`,
    `<link rel="canonical" href="${xmlEscape(meta.canonicalUrl)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="CS Odisha">`,
    `<meta property="og:title" content="${xmlEscape(meta.title)}">`,
    `<meta property="og:description" content="${xmlEscape(meta.description)}">`,
    `<meta property="og:url" content="${xmlEscape(meta.canonicalUrl)}">`,
    `<meta property="og:image" content="${xmlEscape(meta.ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${xmlEscape(meta.title)}">`,
    `<meta name="twitter:description" content="${xmlEscape(meta.description)}">`,
    `<meta name="twitter:image" content="${xmlEscape(meta.ogImage)}">`
  ].join('\n  ');

  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(meta.pageTitle);
      }
    })
    .on('meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]', {
      element(el) {
        el.remove();
      }
    })
    .on('head', {
      element(el) {
        el.append(`\n  ${injectedTags}\n`, { html: true });
      }
    })
    .transform(response);
}
