// Dynamic SEO endpoints (/sitemap.xml, /feed.xml, /rss.xml) and server-side
// HTMLRewriter OpenGraph / Twitter Card meta injection for deep-linked content.
import { PUBLIC_VISIBLE_SQL } from '../../_lib/validate.js';

const SITE_ORIGIN = 'https://csodisha.com';
const DEFAULT_OG_IMAGE = "https://assets.csodisha.org/img/cso-dashboard-og-preview.png";
const OG_TITLE_SUFFIX = " | Common Sense Odisha";
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
      const [jobsRes, caRes, testsRes, schemesRes, aboutGroupsRes, schemeGroupsRes, studyGroupsRes] = await Promise.all([
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
        ).all().catch(() => ({ results: [] })),
        env.DB.prepare(
          `SELECT slug, updated_at FROM about_directory_nodes
           WHERE level = 'group' AND status = 'published'
           ORDER BY sort_order ASC LIMIT 50`
        ).all().catch(() => ({ results: [] })),
        env.DB.prepare(
          `SELECT slug, updated_at FROM schemes_directory_nodes
           WHERE level = 'group' AND status = 'published'
           ORDER BY sort_order ASC LIMIT 50`
        ).all().catch(() => ({ results: [] })),
        env.DB.prepare(
          `SELECT slug, updated_at FROM study_library_nodes
           WHERE level = 'group' AND status = 'published'
           ORDER BY sort_order ASC LIMIT 50`
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

      for (const row of (aboutGroupsRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/about/?group=${encodeURIComponent(row.slug)}`,
          lastmod: toIsoLastMod(row.updated_at),
          changefreq: 'monthly',
          priority: '0.5'
        });
      }

      for (const row of (schemeGroupsRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/schemes-benefits/?group=${encodeURIComponent(row.slug)}`,
          lastmod: toIsoLastMod(row.updated_at),
          changefreq: 'weekly',
          priority: '0.6'
        });
      }

      for (const row of (studyGroupsRes.results || [])) {
        if (!row.slug) continue;
        urls.push({
          loc: `${SITE_ORIGIN}/study-library/?group=${encodeURIComponent(row.slug)}`,
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

export function handleRobotsTxt(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const body = [
    'User-agent: *',
    'Allow: /',
    'Allow: /jobs-careers/',
    'Allow: /schemes-benefits/',
    'Allow: /study-library/',
    'Allow: /mock-tests/',
    'Allow: /resources/',
    'Allow: /about/',
    'Allow: /current-affairs/',
    'Disallow: /admin/',
    'Disallow: /student-dashboard/',
    'Disallow: /api/admin/',
    'Disallow: /api/candidate/',
    'Disallow: /api/',
    '',
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    ''
  ].join('\n');

  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': SEO_CACHE,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function handleLlmsTxt(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  let counts = {
    exams: '44+',
    careerNodes: '417+',
    schemes: '25+',
    studyNodes: '1,681',
    resources: '14+'
  };
  if (env && env.DB) {
    try {
      const [exRow, jobNodeRow, schRow, studyRow, resRow] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) AS n FROM exam_taxonomy WHERE is_active = 1').first().catch(() => null),
        env.DB.prepare('SELECT COUNT(*) AS n FROM jobs_directory_nodes WHERE is_active = 1').first().catch(() => null),
        env.DB.prepare("SELECT COUNT(*) AS n FROM schemes_directory WHERE status = 'published' AND deleted_at IS NULL").first().catch(() => null),
        env.DB.prepare("SELECT COUNT(*) AS n FROM study_library_nodes WHERE status = 'published'").first().catch(() => null),
        env.DB.prepare("SELECT COUNT(*) AS n FROM resources WHERE status = 'published' AND deleted_at IS NULL").first().catch(() => null)
      ]);
      if (exRow && exRow.n > 0) counts.exams = `${exRow.n}+`;
      if (jobNodeRow && jobNodeRow.n > 0) counts.careerNodes = `${jobNodeRow.n}+`;
      if (schRow && schRow.n > 0) counts.schemes = `${schRow.n}+`;
      if (studyRow && studyRow.n > 0) counts.studyNodes = String(studyRow.n);
      if (resRow && resRow.n > 0) counts.resources = String(resRow.n);
    } catch {}
  }

  const lines = [
    '# Common Sense Odisha (CS Odisha)',
    '',
    '> Independent, open-access civic, career, welfare, and competitive exam preparation platform for citizens and aspirants in Odisha, India.',
    '',
    '## Key Identity & Bilingual Brand Names',
    '- Brand: Common Sense Odisha (also known as CS Odisha, CSOdisha, କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା)',
    `- Canonical Origin: ${SITE_ORIGIN}/`,
    '- Languages: English, Odia (ଓଡ଼ିଆ), Hindi',
    '',
    '## Core Public Knowledge Portals',
    `- [Jobs & Careers Directory](${SITE_ORIGIN}/jobs-careers/): ${counts.careerNodes} structured career nodes, ${counts.exams} Odisha & National exam tracks (OPSC OAS, OSSC CGL, OSSSC RI/ARI/Amin, OTET, OSSTET, B.Ed., UGC NET), and live recruitment alerts.`,
    `- [Schemes & Benefits Explorer](${SITE_ORIGIN}/schemes-benefits/): ${counts.schemes} verified Odisha State & Central welfare/scholarship schemes plus eligibility filters and document checklists.`,
    `- [Study Library & Syllabi](${SITE_ORIGIN}/study-library/): ${counts.studyNodes} structured academic & exam curriculum nodes alongside ${counts.resources} verified syllabi, solved PYQs, Odisha GK notes, BSE Class 10 & CHSE +2 blueprints.`,
    `- [Online CBT Mock Tests](${SITE_ORIGIN}/mock-tests/): Server-graded Odisha exam practice tests with leaderboards and negative-marking rules.`,
    `- [Daily Current Affairs](${SITE_ORIGIN}/current-affairs/): Odisha & National exam-oriented daily briefings.`,
    `- [About CSO & Governance](${SITE_ORIGIN}/about/): Platform mission, editorial standards, source verification, and institutional transparency.`,
    '',
    '## Sitemaps, Feeds & Read-Only Public APIs',
    `- Dynamic XML Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    `- RSS 2.0 Feed: ${SITE_ORIGIN}/feed.xml`,
    `- Public Jobs API: ${SITE_ORIGIN}/api/content/jobs`,
    `- Public Schemes API: ${SITE_ORIGIN}/api/content/schemes`,
    `- Public Study Resources API: ${SITE_ORIGIN}/api/content/resources`,
    `- Public Study Library Tree API: ${SITE_ORIGIN}/api/content/study-library-directory`,
    `- Public Exam Taxonomy API: ${SITE_ORIGIN}/api/content/exam-taxonomy`,
    `- Robots Policy: ${SITE_ORIGIN}/robots.txt`,
    ''
  ].join('\n');

  return new Response(request.method === 'HEAD' ? null : lines, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': SEO_CACHE,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function resolveImageMediaUrl(mediaKey) {
  if (!mediaKey || typeof mediaKey !== 'string') return DEFAULT_OG_IMAGE;
  const ext = mediaKey.trim().match(/^external:(https:\/\/[^\s"<>]+\.(?:jpe?g|png|webp)(?:\?[^\s"<>]*)?)$/i);
  if (ext) return ext[1];
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
      if (slug) {
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
          pageTitle: `${job.title} — CS Odisha`,
          title: job.title,
          description,
          canonicalUrl,
          ogImage
        };
      }

      const groupSlug = (url.searchParams.get('group') || '').trim().slice(0, 120);
      if (!groupSlug) return null;
      const groupNode = await env.DB.prepare(
        `SELECT id, group_slug, title, description
         FROM jobs_directory_nodes
         WHERE is_active = 1 AND (LOWER(group_slug) = LOWER(?) OR id = ?)
         ORDER BY level ASC, sort_order ASC LIMIT 1`
      ).bind(groupSlug, groupSlug).first();
      if (!groupNode) return null;
      const gKey = groupNode.group_slug || groupNode.id;
      const description = plainTextExcerpt(
        groupNode.description || `${groupNode.title} — verified Odisha & Central recruitment notices, exam dates, and eligibility tracks on CS Odisha.`,
        160
      );
      return {
        pageTitle: `${groupNode.title} | Jobs & Careers | CS Odisha`,
        title: `${groupNode.title} — Jobs & Careers`,
        description,
        canonicalUrl: `${SITE_ORIGIN}/jobs-careers/?group=${encodeURIComponent(gKey)}`,
        ogImage: DEFAULT_OG_IMAGE
      };
    }

    if (/^\/schemes-benefits(\/|\/index\.html)?$/.test(pathname)) {
      const schemeSlug = (url.searchParams.get('scheme') || '').trim().slice(0, 120);
      if (schemeSlug) {
        const sch = await env.DB.prepare(
          `SELECT slug, title, summary, benefit_summary, body_md, department, gov_level
           FROM schemes_directory
           WHERE (slug = ? OR id = ?) AND status = 'published' AND deleted_at IS NULL
           LIMIT 1`
        ).bind(schemeSlug, schemeSlug).first();
        if (!sch) return null;
        const description = plainTextExcerpt(
          sch.summary || sch.benefit_summary || sch.body_md || `${sch.title} (${sch.gov_level || 'Odisha'} Govt Scheme) — eligibility, documents & application guide on CS Odisha.`,
          160
        );
        return {
          pageTitle: `${sch.title} — CS Odisha`,
          title: sch.title,
          description,
          canonicalUrl: `${SITE_ORIGIN}/schemes-benefits/?scheme=${encodeURIComponent(sch.slug)}`,
          ogImage: DEFAULT_OG_IMAGE
        };
      }

      const groupSlug = (url.searchParams.get('group') || '').trim().slice(0, 120);
      if (!groupSlug) return null;
      const grp = await env.DB.prepare(
        `SELECT slug, title, subtitle
         FROM schemes_directory_nodes
         WHERE level = 'group' AND (slug = ? OR id = ?) AND status = 'published'
         LIMIT 1`
      ).bind(groupSlug, groupSlug).first();
      if (!grp) return null;
      const description = plainTextExcerpt(
        grp.subtitle || `${grp.title} — verified Odisha & Central citizen welfare schemes, eligibility rules, and application portals on CS Odisha.`,
        160
      );
      return {
        pageTitle: `${grp.title} | Schemes & Benefits | CS Odisha`,
        title: grp.title,
        description,
        canonicalUrl: `${SITE_ORIGIN}/schemes-benefits/?group=${encodeURIComponent(grp.slug)}`,
        ogImage: DEFAULT_OG_IMAGE
      };
    }

    if (/^\/study-library(\/|\/index\.html)?$/.test(pathname)) {
      const resSlug = (url.searchParams.get('resource') || '').trim().slice(0, 120);
      if (resSlug) {
        const res = await env.DB.prepare(
          `SELECT id, title, exam, year, description
           FROM resources
           WHERE (id = ? OR LOWER(exam_slug) = LOWER(?)) AND status = 'published' AND deleted_at IS NULL
           LIMIT 1`
        ).bind(resSlug, resSlug).first();
        if (!res) return null;
        const description = plainTextExcerpt(
          res.description || `${res.title} (${res.exam || 'Odisha Exam'}) — verified syllabus, solved PYQ and study brief on CS Odisha.`,
          160
        );
        return {
          pageTitle: `${res.title} | Study Library | CS Odisha`,
          title: res.title,
          description,
          canonicalUrl: `${SITE_ORIGIN}/study-library/?resource=${encodeURIComponent(res.id)}`,
          ogImage: DEFAULT_OG_IMAGE
        };
      }

      const groupSlug = (url.searchParams.get('group') || '').trim().slice(0, 120);
      if (!groupSlug) return null;
      const grp = await env.DB.prepare(
        `SELECT slug, title, subtitle
         FROM study_library_nodes
         WHERE level = 'group' AND (slug = ? OR id = ?) AND status = 'published'
         LIMIT 1`
      ).bind(groupSlug, groupSlug).first();
      if (!grp) return null;
      const description = plainTextExcerpt(
        grp.subtitle || `${grp.title} — curated Odisha & National syllabi, solved PYQs, and study topics on CS Odisha.`,
        160
      );
      return {
        pageTitle: `${grp.title} | Study Library | CS Odisha`,
        title: grp.title,
        description,
        canonicalUrl: `${SITE_ORIGIN}/study-library/?group=${encodeURIComponent(grp.slug)}`,
        ogImage: DEFAULT_OG_IMAGE
      };
    }

    if (/^\/about(\/|\/index\.html)?$/.test(pathname)) {
      const groupSlug = (url.searchParams.get('group') || '').trim().slice(0, 120);
      if (!groupSlug) return null;
      const grp = await env.DB.prepare(
        `SELECT slug, title, subtitle, body_text
         FROM about_directory_nodes
         WHERE level = 'group' AND (slug = ? OR id = ?) AND status = 'published'
         LIMIT 1`
      ).bind(groupSlug, groupSlug).first();
      if (!grp) return null;
      const description = plainTextExcerpt(
        grp.subtitle || grp.body_text || `${grp.title} — Common Sense Odisha editorial standards, source verification, and citizen mission.`,
        160
      );
      return {
        pageTitle: `${grp.title} | About CS Odisha`,
        title: grp.title,
        description,
        canonicalUrl: `${SITE_ORIGIN}/about/?group=${encodeURIComponent(grp.slug)}`,
        ogImage: DEFAULT_OG_IMAGE
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
    `<meta property="og:site_name" content="Common Sense Odisha (CS Odisha)">`,
    `<meta property="og:title" content="${xmlEscape(meta.title + OG_TITLE_SUFFIX)}">`,
    `<meta property="og:description" content="${xmlEscape(meta.description)}">`,
    `<meta property="og:url" content="${xmlEscape(meta.canonicalUrl)}">`,
    `<meta property="og:image" content="${xmlEscape(meta.ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${xmlEscape(meta.title + OG_TITLE_SUFFIX)}">`,
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
