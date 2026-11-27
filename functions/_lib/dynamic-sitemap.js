/**
 * Common Sense Odisha — Dynamic D1-Backed XML Sitemap & Robots.txt Engine (v393)
 * Serves GET /sitemap.xml (Sitemaps.org 0.9) live from Cloudflare D1:
 *  - Homepage + all operational hubs
 *  - All published `job_articles` -> https://csodisha.com/jobs/<slug>
 *  - All published `informative_guides` -> https://csodisha.com/guides/<slug>
 *  - Zero drafts/unpublished slugs, zero duplicate <loc> entries, ISO 8601 <lastmod>
 *  - Cached at edge (public, max-age=300, s-maxage=900, stale-while-revalidate=3600)
 *    and automatically purged on Admin Studio saves.
 */

export const SITE_ORIGIN = 'https://csodisha.com';

export const CORE_SITEMAP_HUBS = [
  { path: '/', changefreq: 'hourly', priority: '1.0' },
  { path: '/jobs/', changefreq: 'hourly', priority: '0.95' },
  { path: '/exams/', changefreq: 'daily', priority: '0.95' },
  { path: '/scholarships/', changefreq: 'daily', priority: '0.90' },
  { path: '/study-materials/', changefreq: 'daily', priority: '0.90' },
  { path: '/career-paths/', changefreq: 'weekly', priority: '0.85' },
  { path: '/odisha-special/', changefreq: 'daily', priority: '0.90' },
  { path: '/guides/', changefreq: 'daily', priority: '0.90' },
  { path: '/updates/', changefreq: 'hourly', priority: '0.90' },
  { path: '/mock-tests/', changefreq: 'daily', priority: '0.85' },
  { path: '/current-affairs/', changefreq: 'daily', priority: '0.90' },
  { path: '/schemes/', changefreq: 'weekly', priority: '0.85' },
  { path: '/tools/', changefreq: 'weekly', priority: '0.85' },
  { path: '/community/', changefreq: 'daily', priority: '0.85' },
  { path: '/about/', changefreq: 'monthly', priority: '0.85' }
];

function escXml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toIsoLastMod(raw, fallbackIso = '') {
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

export function buildSitemapXmlString({ origin = SITE_ORIGIN, jobRows = [], guideRows = [], nowIso = new Date().toISOString() }) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const seen = new Set();
  const entries = [];

  function pushUrl(loc, lastmod, changefreq, priority) {
    const cleanLoc = String(loc || '').trim();
    if (!cleanLoc || seen.has(cleanLoc)) return;
    seen.add(cleanLoc);
    entries.push(
      `  <url>\n` +
      `    <loc>${escXml(cleanLoc)}</loc>\n` +
      `    <lastmod>${escXml(toIsoLastMod(lastmod, nowIso))}</lastmod>\n` +
      `    <changefreq>${escXml(changefreq)}</changefreq>\n` +
      `    <priority>${escXml(priority)}</priority>\n` +
      `  </url>`
    );
  }

  for (const hub of CORE_SITEMAP_HUBS) {
    pushUrl(`${cleanOrigin}${hub.path}`, nowIso, hub.changefreq, hub.priority);
  }

  for (const row of (Array.isArray(jobRows) ? jobRows : [])) {
    if (!row || !row.slug) continue;
    if (row.is_published !== undefined && Number(row.is_published) !== 1) continue;
    const slug = String(row.slug).trim();
    if (!slug) continue;
    const lm = row.updated_at || row.published_at || row.created_at || nowIso;
    pushUrl(`${cleanOrigin}/jobs/${encodeURIComponent(slug)}`, lm, 'daily', '0.85');
  }

  for (const g of (Array.isArray(guideRows) ? guideRows : [])) {
    if (!g || !g.slug) continue;
    if (g.status !== undefined && String(g.status).toLowerCase() !== 'published') continue;
    const slug = String(g.slug).trim();
    if (!slug) continue;
    const lm = g.updated_at || g.published_at || g.created_at || nowIso;
    pushUrl(`${cleanOrigin}/guides/${encodeURIComponent(slug)}`, lm, 'weekly', '0.80');
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join('\n') +
    `\n</urlset>\n`
  );
}

export async function collectLiveSitemapData(env, origin = SITE_ORIGIN) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const nowIso = new Date().toISOString();
  let jobRows = [];
  let guideRows = [];

  if (env && env.DB) {
    const [jobsRes, guidesRes] = await Promise.all([
      env.DB.prepare(
        `SELECT slug, updated_at, published_at FROM job_articles WHERE is_published = 1 ORDER BY updated_at DESC LIMIT 2000`
      ).all().catch(() => ({ results: [] })),
      env.DB.prepare(
        `SELECT slug, updated_at, created_at FROM informative_guides WHERE status = 'published' ORDER BY updated_at DESC LIMIT 2000`
      ).all().catch(() => ({ results: [] }))
    ]);
    jobRows = (jobsRes && jobsRes.results) || [];
    guideRows = (guidesRes && guidesRes.results) || [];
  }

  const seen = new Set();
  const urls = [];
  let hubsCount = 0;
  let jobsCount = 0;
  let guidesCount = 0;
  let latestLastmod = '';

  function track(loc, lm, bucket) {
    if (!loc || seen.has(loc)) return;
    seen.add(loc);
    urls.push(loc);
    if (bucket === 'hub') hubsCount += 1;
    else if (bucket === 'job') jobsCount += 1;
    else if (bucket === 'guide') guidesCount += 1;
    const iso = toIsoLastMod(lm, nowIso);
    if (!latestLastmod || iso > latestLastmod) latestLastmod = iso;
  }

  for (const hub of CORE_SITEMAP_HUBS) {
    track(`${cleanOrigin}${hub.path}`, nowIso, 'hub');
  }
  for (const row of jobRows) {
    if (!row || !row.slug) continue;
    if (row.is_published !== undefined && Number(row.is_published) !== 1) continue;
    const slug = String(row.slug).trim();
    if (!slug) continue;
    track(`${cleanOrigin}/jobs/${encodeURIComponent(slug)}`, row.updated_at || row.published_at || row.created_at, 'job');
  }
  for (const g of guideRows) {
    if (!g || !g.slug) continue;
    if (g.status !== undefined && String(g.status).toLowerCase() !== 'published') continue;
    const slug = String(g.slug).trim();
    if (!slug) continue;
    track(`${cleanOrigin}/guides/${encodeURIComponent(slug)}`, g.updated_at || g.published_at || g.created_at, 'guide');
  }

  return {
    origin: cleanOrigin,
    nowIso,
    total_urls: urls.length,
    hubs_count: hubsCount,
    jobs_count: jobsCount,
    guides_count: guidesCount,
    latest_lastmod: latestLastmod || nowIso,
    urls,
    jobRows,
    guideRows
  };
}

export async function handleDynamicSitemapXml(request, env) {
  const data = await collectLiveSitemapData(env, SITE_ORIGIN);
  const xml = buildSitemapXmlString({
    origin: data.origin,
    jobRows: data.jobRows,
    guideRows: data.guideRows,
    nowIso: data.nowIso
  });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export function buildRobotsTxtString() {
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /jobs/',
    'Allow: /exams/',
    'Allow: /scholarships/',
    'Allow: /study-materials/',
    'Allow: /career-paths/',
    'Allow: /odisha-special/',
    'Allow: /guides/',
    'Allow: /updates/',
    'Allow: /mock-tests/',
    'Allow: /current-affairs/',
    'Allow: /schemes/',
    'Allow: /tools/',
    'Allow: /community/',
    'Allow: /about/',
    'Disallow: /admin/',
    'Disallow: /student-dashboard/',
    'Disallow: /api/admin/',
    'Disallow: /api/candidate/',
    'Disallow: /api/',
    '',
    'Sitemap: https://csodisha.com/sitemap.xml',
    ''
  ].join('\n');
}

export function handleDynamicRobotsTxt() {
  return new Response(buildRobotsTxtString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
