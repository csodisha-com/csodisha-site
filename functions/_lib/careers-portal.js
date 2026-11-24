// v269 Careers Portal & Publishing House Engine
// Strict D1-backed public & admin handlers with safe pending-migration fallback,
// RBAC admin draft preview, inline taxonomy creation, audit logging, and immediate cache invalidation.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';

export const CAREER_STATUSES = ['draft', 'published', 'archived'];
export const CAREER_TAXONOMY_KINDS = ['track', 'region', 'stage'];

export const DEFAULT_CAREER_TAXONOMY = [
  // 6 Core Career Tracks
  { id: 'ctax-track-civil-services', kind: 'track', slug: 'civil-services', label_en: 'Civil Services', label_or: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍', sort_order: 1, active: 1 },
  { id: 'ctax-track-engineering-it', kind: 'track', slug: 'engineering-it', label_en: 'Engineering / IT', label_or: 'ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି', sort_order: 2, active: 1 },
  { id: 'ctax-track-banking-finance', kind: 'track', slug: 'banking-finance', label_en: 'Banking & Finance', label_or: 'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି', sort_order: 3, active: 1 },
  { id: 'ctax-track-healthcare', kind: 'track', slug: 'healthcare', label_en: 'Healthcare', label_or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା', sort_order: 4, active: 1 },
  { id: 'ctax-track-agriculture', kind: 'track', slug: 'agriculture', label_en: 'Agriculture', label_or: 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ', sort_order: 5, active: 1 },
  { id: 'ctax-track-pathways', kind: 'track', slug: 'pathways', label_en: 'Career Stage & Pathways', label_or: 'କ୍ୟାରିୟର ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗଦର୍ଶନ', sort_order: 6, active: 1 },
  // 3 Region Scopes
  { id: 'ctax-region-odisha', kind: 'region', slug: 'odisha', label_en: 'Odisha', label_or: 'ଓଡ଼ିଶା', sort_order: 1, active: 1 },
  { id: 'ctax-region-central', kind: 'region', slug: 'central', label_en: 'Central', label_or: 'କେନ୍ଦ୍ର ସରକାର', sort_order: 2, active: 1 },
  { id: 'ctax-region-all-india', kind: 'region', slug: 'all-india', label_en: 'All Over India', label_or: 'ସମଗ୍ର ଭାରତ', sort_order: 3, active: 1 },
  // 5 Career Stages
  { id: 'ctax-stage-after-10th-12th', kind: 'stage', slug: 'after-10th-12th', label_en: 'After 10th / 12th', label_or: 'ଦଶମ / ଦ୍ୱାଦଶ ପରେ', sort_order: 1, active: 1 },
  { id: 'ctax-stage-graduate', kind: 'stage', slug: 'graduate', label_en: 'Graduate', label_or: 'ସ୍ନାତକ', sort_order: 2, active: 1 },
  { id: 'ctax-stage-postgraduate', kind: 'stage', slug: 'postgraduate', label_en: 'Postgraduate', label_or: 'ସ୍ନାତକୋତ୍ତର', sort_order: 3, active: 1 },
  { id: 'ctax-stage-internship-apprenticeship', kind: 'stage', slug: 'internship-apprenticeship', label_en: 'Internship & Apprenticeship', label_or: 'ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍', sort_order: 4, active: 1 },
  { id: 'ctax-stage-all-stages', kind: 'stage', slug: 'all-stages', label_en: 'All Stages', label_or: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ', sort_order: 5, active: 1 }
];

const _schemaReady = new WeakSet();

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function slugify(raw, fallback = 'career-guide') {
  const s = String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || fallback;
}

function safeLinksArray(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const label = str(item.label || item.title || '', 160);
    const url = str(item.url || item.href || '', 500);
    if (!url || /^(javascript|data|vbscript)\s*:/i.test(url)) continue;
    if (!url.startsWith('/') && !/^https?:\/\//i.test(url)) continue;
    out.push({ label: label || url, url });
  }
  return out;
}

function groupTaxonomy(nodes) {
  const list = Array.isArray(nodes) && nodes.length ? nodes : DEFAULT_CAREER_TAXONOMY;
  const sortFn = (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.label_en || '').localeCompare(String(b.label_en || ''));
  return {
    tracks: list.filter(n => n.kind === 'track' && Number(n.active ?? 1) === 1).sort(sortFn),
    regions: list.filter(n => n.kind === 'region' && Number(n.active ?? 1) === 1).sort(sortFn),
    stages: list.filter(n => n.kind === 'stage' && Number(n.active ?? 1) === 1).sort(sortFn),
    nodes: list
  };
}

function hydrateArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title_en: row.title_en || '',
    title_or: row.title_or || '',
    track_slug: row.track_slug || 'civil-services',
    region_scope: row.region_scope || 'odisha',
    career_stage: row.career_stage || 'graduate',
    summary_en: row.summary_en || '',
    summary_or: row.summary_or || '',
    roadmap_body_en: row.roadmap_body_en || '',
    roadmap_body_or: row.roadmap_body_or || '',
    eligibility_summary: row.eligibility_summary || '',
    salary_band: row.salary_band || '',
    key_exams: row.key_exams || '',
    official_links: safeLinksArray(row.official_links_json),
    official_links_json: typeof row.official_links_json === 'string' ? row.official_links_json : JSON.stringify(safeLinksArray(row.official_links_json)),
    status: row.status || 'draft',
    featured: Number(row.featured || 0) ? 1 : 0,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    published_at: row.published_at || null
  };
}

function isMissingTableError(err) {
  const msg = String((err && err.message) || err || '').toLowerCase();
  return msg.includes('no such table') || msg.includes('does not exist');
}

export async function ensureCareersSchema(db) {
  if (!db || _schemaReady.has(db)) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS careers_articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      track_slug TEXT NOT NULL DEFAULT 'civil-services',
      region_scope TEXT NOT NULL DEFAULT 'odisha',
      career_stage TEXT NOT NULL DEFAULT 'graduate',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      roadmap_body_en TEXT NOT NULL DEFAULT '',
      roadmap_body_or TEXT NOT NULL DEFAULT '',
      eligibility_summary TEXT NOT NULL DEFAULT '',
      salary_band TEXT NOT NULL DEFAULT '',
      key_exams TEXT NOT NULL DEFAULT '',
      official_links_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_careers_articles_status_track ON careers_articles(status, track_slug, region_scope, career_stage)`,
    `CREATE INDEX IF NOT EXISTS idx_careers_articles_featured ON careers_articles(status, featured DESC, updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS career_taxonomy_nodes (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('track', 'region', 'stage')),
      slug TEXT NOT NULL,
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(kind, slug)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_career_taxonomy_kind_active ON career_taxonomy_nodes(kind, active, sort_order)`
  ];
  for (const sql of stmts) {
    await db.prepare(sql).run();
  }
  for (const n of DEFAULT_CAREER_TAXONOMY) {
    await db.prepare(
      `INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, slug, label_en, label_or, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(n.id, n.kind, n.slug, n.label_en, n.label_or, n.sort_order, n.active).run();
  }
  _schemaReady.add(db);
}

// ============================================================================
// PUBLIC: GET /api/public/careers/bootstrap
// ============================================================================
export async function handlePublicCareersBootstrap(request, env) {
  const fallbackTaxonomy = groupTaxonomy(DEFAULT_CAREER_TAXONOMY);
  const emptyPayload = (pending) => json({
    ok: true,
    migration_pending: Boolean(pending),
    stats: {
      total_published: 0,
      featured_count: 0,
      tracks_count: fallbackTaxonomy.tracks.length,
      regions_count: fallbackTaxonomy.regions.length,
      track_counts: {},
      region_counts: {}
    },
    taxonomy: fallbackTaxonomy,
    featured: [],
    latest: []
  }, 200, { 'Cache-Control': 'public, max-age=15, s-maxage=300, stale-while-revalidate=60' });

  if (!env || !env.DB) return emptyPayload(true);

  try {
    const db = env.DB;
    let taxRows = [];
    let countRows = [];
    let regionRows = [];
    let featuredRows = [];
    let latestRows = [];

    const qTax = db.prepare(`SELECT id, kind, slug, label_en, label_or, sort_order, active FROM career_taxonomy_nodes WHERE active = 1 ORDER BY kind ASC, sort_order ASC, label_en ASC`);
    const qTrackCounts = db.prepare(`SELECT track_slug, COUNT(*) AS cnt FROM careers_articles WHERE status = 'published' GROUP BY track_slug`);
    const qRegionCounts = db.prepare(`SELECT region_scope, COUNT(*) AS cnt FROM careers_articles WHERE status = 'published' GROUP BY region_scope`);
    const qFeatured = db.prepare(`SELECT * FROM careers_articles WHERE status = 'published' AND featured = 1 ORDER BY updated_at DESC LIMIT 6`);
    const qLatest = db.prepare(`SELECT * FROM careers_articles WHERE status = 'published' ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC LIMIT 24`);

    if (typeof db.batch === 'function') {
      const batchRes = await db.batch([qTax, qTrackCounts, qRegionCounts, qFeatured, qLatest]);
      taxRows = (batchRes[0] && batchRes[0].results) || [];
      countRows = (batchRes[1] && batchRes[1].results) || [];
      regionRows = (batchRes[2] && batchRes[2].results) || [];
      featuredRows = (batchRes[3] && batchRes[3].results) || [];
      latestRows = (batchRes[4] && batchRes[4].results) || [];
    } else {
      taxRows = ((await qTax.all()) || {}).results || [];
      countRows = ((await qTrackCounts.all()) || {}).results || [];
      regionRows = ((await qRegionCounts.all()) || {}).results || [];
      featuredRows = ((await qFeatured.all()) || {}).results || [];
      latestRows = ((await qLatest.all()) || {}).results || [];
    }

    const taxonomy = groupTaxonomy(taxRows.length ? taxRows : DEFAULT_CAREER_TAXONOMY);
    const trackCounts = {};
    let totalPublished = 0;
    for (const r of countRows) {
      const c = Number(r.cnt || 0);
      trackCounts[r.track_slug] = c;
      totalPublished += c;
    }
    const regionCounts = {};
    for (const r of regionRows) {
      regionCounts[r.region_scope] = Number(r.cnt || 0);
    }

    return json({
      ok: true,
      migration_pending: false,
      stats: {
        total_published: totalPublished,
        featured_count: featuredRows.length,
        tracks_count: taxonomy.tracks.length,
        regions_count: taxonomy.regions.length,
        track_counts: trackCounts,
        region_counts: regionCounts
      },
      taxonomy,
      featured: featuredRows.map(hydrateArticle),
      latest: latestRows.map(hydrateArticle)
    }, 200, { 'Cache-Control': 'public, max-age=15, s-maxage=300, stale-while-revalidate=60' });
  } catch (err) {
    if (isMissingTableError(err)) return emptyPayload(true);
    return emptyPayload(true);
  }
}

// ============================================================================
// PUBLIC: GET /api/public/careers/list
// ============================================================================
export async function handlePublicCareersList(request, env) {
  const url = new URL(request.url);
  const track = str(url.searchParams.get('track'), 80).toLowerCase();
  const region = str(url.searchParams.get('region'), 80).toLowerCase();
  const stage = str(url.searchParams.get('stage'), 80).toLowerCase();
  const q = str(url.searchParams.get('q'), 120).toLowerCase();
  const slugParam = str(url.searchParams.get('slug'), 120).toLowerCase();
  const previewId = str(url.searchParams.get('preview_id'), 120);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 40));

  if (!env || !env.DB) {
    return json({ ok: true, migration_pending: true, items: [], total: 0, preview: false }, 200, { 'Cache-Control': 'no-store' });
  }

  try {
    // Admin draft preview mode: strictly requires authenticated staff session
    if (previewId) {
      let actor = null;
      try {
        actor = await getActor(request, env);
      } catch {
        actor = null;
      }
      if (!actor || !STAFF_ROLES.includes(actor.role)) {
        return json({ ok: false, error: 'Admin authentication required to preview drafts.' }, 401, { 'Cache-Control': 'no-store' });
      }
      const row = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ? OR slug = ? LIMIT 1`)
        .bind(previewId, previewId).first();
      if (!row) {
        return json({ ok: false, error: 'Career guide not found for preview.' }, 404, { 'Cache-Control': 'no-store' });
      }
      const item = hydrateArticle(row);
      return json({
        ok: true,
        preview: true,
        preview_item: item,
        items: [item],
        total: 1
      }, 200, { 'Cache-Control': 'no-store' });
    }

    const where = [`status = 'published'`];
    const binds = [];
    if (slugParam) {
      where.push(`slug = ?`);
      binds.push(slugParam);
    }
    if (track && track !== 'all') {
      where.push(`track_slug = ?`);
      binds.push(track);
    }
    if (region && region !== 'all') {
      where.push(`region_scope = ?`);
      binds.push(region);
    }
    if (stage && stage !== 'all') {
      where.push(`(career_stage = ? OR career_stage = 'all-stages')`);
      binds.push(stage);
    }
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push(`(LOWER(title_en) LIKE ? ESCAPE '\\' OR LOWER(title_or) LIKE ? ESCAPE '\\' OR LOWER(summary_en) LIKE ? ESCAPE '\\' OR LOWER(key_exams) LIKE ? ESCAPE '\\' OR LOWER(eligibility_summary) LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like, like);
    }

    const sql = `SELECT * FROM careers_articles WHERE ${where.join(' AND ')} ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC LIMIT ?`;
    const { results } = await env.DB.prepare(sql).bind(...binds, limit).all();
    const items = (results || []).map(hydrateArticle);

    return json({
      ok: true,
      migration_pending: false,
      preview: false,
      items,
      total: items.length
    }, 200, { 'Cache-Control': 'public, max-age=15, s-maxage=300, stale-while-revalidate=60' });
  } catch (err) {
    if (isMissingTableError(err)) {
      return json({ ok: true, migration_pending: true, items: [], total: 0, preview: false }, 200, { 'Cache-Control': 'no-store' });
    }
    throw err;
  }
}

// ============================================================================
// ADMIN: GET / POST / PUT / DELETE /api/admin/careers
// ============================================================================
export async function handleAdminCareers(request, env, actor, pathId = '') {
  await ensureCareersSchema(env.DB);
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (method === 'GET') {
    const statusFilter = str(url.searchParams.get('status'), 40).toLowerCase();
    const trackFilter = str(url.searchParams.get('track'), 80).toLowerCase();
    const regionFilter = str(url.searchParams.get('region'), 80).toLowerCase();
    const stageFilter = str(url.searchParams.get('stage'), 80).toLowerCase();
    const q = str(url.searchParams.get('q'), 120).toLowerCase();

    const where = ['1=1'];
    const binds = [];
    if (statusFilter && CAREER_STATUSES.includes(statusFilter)) {
      where.push('status = ?');
      binds.push(statusFilter);
    }
    if (trackFilter && trackFilter !== 'all') {
      where.push('track_slug = ?');
      binds.push(trackFilter);
    }
    if (regionFilter && regionFilter !== 'all') {
      where.push('region_scope = ?');
      binds.push(regionFilter);
    }
    if (stageFilter && stageFilter !== 'all') {
      where.push('career_stage = ?');
      binds.push(stageFilter);
    }
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push(`(LOWER(title_en) LIKE ? ESCAPE '\\' OR LOWER(title_or) LIKE ? ESCAPE '\\' OR LOWER(slug) LIKE ? ESCAPE '\\' OR LOWER(key_exams) LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like);
    }

    const [articlesRes, taxRes, statsRes] = await Promise.all([
      env.DB.prepare(`SELECT * FROM careers_articles WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT 200`).bind(...binds).all(),
      env.DB.prepare(`SELECT id, kind, slug, label_en, label_or, sort_order, active FROM career_taxonomy_nodes ORDER BY kind ASC, sort_order ASC, label_en ASC`).all(),
      env.DB.prepare(`SELECT status, COUNT(*) AS cnt FROM careers_articles GROUP BY status`).all()
    ]);

    const counts = { total: 0, published: 0, draft: 0, archived: 0 };
    for (const r of (statsRes.results || [])) {
      const c = Number(r.cnt || 0);
      counts.total += c;
      if (r.status in counts) counts[r.status] = c;
    }

    return json({
      ok: true,
      items: (articlesRes.results || []).map(hydrateArticle),
      taxonomy: groupTaxonomy(taxRes.results || []),
      stats: counts
    }, 200, { 'Cache-Control': 'no-store' });
  }

  if (method === 'DELETE') {
    const targetId = str(pathId || url.searchParams.get('id'), 120);
    if (!targetId) throw validationError({ id: 'Career guide ID is required' });
    const existing = await env.DB.prepare(`SELECT id, title_en, slug FROM careers_articles WHERE id = ?`).bind(targetId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
    await env.DB.prepare(`DELETE FROM careers_articles WHERE id = ?`).bind(targetId).run();
    await audit(env, request, actor, 'careers.delete', 'careers_article', targetId, { slug: existing.slug, title: existing.title_en });
    await invalidateAllPublicCaches(request);
    return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const body = await readJson(request, 200000);
    const action = str(body.action, 40).toLowerCase();

    // Action: delete via POST
    if (action === 'delete') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Career guide ID is required' });
      const existing = await env.DB.prepare(`SELECT id, title_en, slug FROM careers_articles WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
      await env.DB.prepare(`DELETE FROM careers_articles WHERE id = ?`).bind(targetId).run();
      await audit(env, request, actor, 'careers.delete', 'careers_article', targetId, { slug: existing.slug, title: existing.title_en });
      await invalidateAllPublicCaches(request);
      return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    // Action: toggle_status / status change
    if (action === 'toggle_status' || action === 'set_status') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Career guide ID is required' });
      const existing = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
      const requestedStatus = str(body.status, 30).toLowerCase();
      const nextStatus = CAREER_STATUSES.includes(requestedStatus)
        ? requestedStatus
        : (existing.status === 'published' ? 'draft' : 'published');
      const nowIso = new Date().toISOString();
      const publishedAt = nextStatus === 'published' ? (existing.published_at || nowIso) : existing.published_at;
      await env.DB.prepare(`UPDATE careers_articles SET status = ?, published_at = ?, updated_at = ? WHERE id = ?`)
        .bind(nextStatus, publishedAt, nowIso, targetId).run();
      await audit(env, request, actor, nextStatus === 'published' ? 'careers.publish' : 'careers.unpublish', 'careers_article', targetId, { from: existing.status, to: nextStatus });
      await invalidateAllPublicCaches(request);
      const updated = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(targetId).first();
      return json({ ok: true, item: hydrateArticle(updated) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    // Default: Create or Update career roadmap
    const id = str(body.id || pathId, 120);
    const titleEn = str(body.title_en, 240);
    if (!titleEn) throw validationError({ title_en: 'English title is required' });

    const titleOr = str(body.title_or, 240);
    const trackSlug = slugify(body.track_slug || 'civil-services', 'civil-services');
    const regionScope = slugify(body.region_scope || 'odisha', 'odisha');
    const careerStage = slugify(body.career_stage || 'graduate', 'graduate');
    const summaryEn = str(body.summary_en, 1200);
    const summaryOr = str(body.summary_or, 1200);
    const roadmapBodyEn = str(body.roadmap_body_en, 40000);
    const roadmapBodyOr = str(body.roadmap_body_or, 40000);
    const eligibilitySummary = str(body.eligibility_summary, 600);
    const salaryBand = str(body.salary_band, 240);
    const keyExams = str(body.key_exams, 500);
    const linksArr = safeLinksArray(body.official_links !== undefined ? body.official_links : body.official_links_json);
    const officialLinksJson = JSON.stringify(linksArr);
    const rawStatus = str(body.status, 30).toLowerCase();
    const status = CAREER_STATUSES.includes(rawStatus) ? rawStatus : 'draft';
    const featured = body.featured ? 1 : 0;
    const nowIso = new Date().toISOString();

    const baseSlug = slugify(body.slug || titleEn, 'career-guide');

    if (id) {
      const existing = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
      let finalSlug = baseSlug;
      const collision = await env.DB.prepare(`SELECT id FROM careers_articles WHERE slug = ? AND id != ?`).bind(finalSlug, id).first();
      if (collision) finalSlug = `${baseSlug}-${id.slice(0, 6)}`;
      const publishedAt = status === 'published' ? (existing.published_at || nowIso) : existing.published_at;

      await env.DB.prepare(
        `UPDATE careers_articles SET
           slug = ?, title_en = ?, title_or = ?, track_slug = ?, region_scope = ?, career_stage = ?,
           summary_en = ?, summary_or = ?, roadmap_body_en = ?, roadmap_body_or = ?,
           eligibility_summary = ?, salary_band = ?, key_exams = ?, official_links_json = ?,
           status = ?, featured = ?, updated_at = ?, published_at = ?
         WHERE id = ?`
      ).bind(
        finalSlug, titleEn, titleOr, trackSlug, regionScope, careerStage,
        summaryEn, summaryOr, roadmapBodyEn, roadmapBodyOr,
        eligibilitySummary, salaryBand, keyExams, officialLinksJson,
        status, featured, nowIso, publishedAt, id
      ).run();

      await audit(env, request, actor, 'careers.update', 'careers_article', id, { slug: finalSlug, status });
      await invalidateAllPublicCaches(request);
      const updated = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: hydrateArticle(updated) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    const newId = `car-${crypto.randomUUID().slice(0, 12)}`;
    let finalSlug = baseSlug;
    const collision = await env.DB.prepare(`SELECT id FROM careers_articles WHERE slug = ?`).bind(finalSlug).first();
    if (collision) finalSlug = `${baseSlug}-${newId.slice(-6)}`;
    const publishedAt = status === 'published' ? nowIso : null;

    await env.DB.prepare(
      `INSERT INTO careers_articles (
         id, slug, title_en, title_or, track_slug, region_scope, career_stage,
         summary_en, summary_or, roadmap_body_en, roadmap_body_or,
         eligibility_summary, salary_band, key_exams, official_links_json,
         status, featured, created_at, updated_at, published_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, finalSlug, titleEn, titleOr, trackSlug, regionScope, careerStage,
      summaryEn, summaryOr, roadmapBodyEn, roadmapBodyOr,
      eligibilitySummary, salaryBand, keyExams, officialLinksJson,
      status, featured, nowIso, nowIso, publishedAt
    ).run();

    await audit(env, request, actor, 'careers.create', 'careers_article', newId, { slug: finalSlug, status });
    await invalidateAllPublicCaches(request);
    const created = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(newId).first();
    return json({ ok: true, item: hydrateArticle(created) }, 201, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ============================================================================
// ADMIN: GET / POST /api/admin/careers/taxonomy
// ============================================================================
export async function handleAdminCareersTaxonomy(request, env, actor) {
  await ensureCareersSchema(env.DB);
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT id, kind, slug, label_en, label_or, sort_order, active FROM career_taxonomy_nodes ORDER BY kind ASC, sort_order ASC, label_en ASC`
    ).all();
    return json({ ok: true, taxonomy: groupTaxonomy(results || []) }, 200, { 'Cache-Control': 'no-store' });
  }

  if (method === 'POST') {
    const body = await readJson(request, 20000);
    const kind = str(body.kind, 20).toLowerCase();
    if (!CAREER_TAXONOMY_KINDS.includes(kind)) {
      throw validationError({ kind: 'kind must be track, region, or stage' });
    }
    const labelEn = str(body.label_en, 120);
    if (!labelEn) {
      throw validationError({ label_en: 'English label is required' });
    }
    const labelOr = str(body.label_or, 120);
    const slug = slugify(body.slug || labelEn, `${kind}-option`);
    const existing = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE kind = ? AND slug = ?`).bind(kind, slug).first();
    if (existing) {
      await env.DB.prepare(`UPDATE career_taxonomy_nodes SET label_en = ?, label_or = ?, active = 1 WHERE id = ?`)
        .bind(labelEn, labelOr || existing.label_or, existing.id).run();
      await audit(env, request, actor, 'careers.taxonomy.update', 'career_taxonomy', existing.id, { kind, slug, label_en: labelEn });
      await invalidateAllPublicCaches(request);
      const updated = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(existing.id).first();
      return json({ ok: true, node: updated }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    const maxRow = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS mx FROM career_taxonomy_nodes WHERE kind = ?`).bind(kind).first();
    const sortOrder = Number.isFinite(Number(body.sort_order)) && Number(body.sort_order) > 0
      ? Number(body.sort_order)
      : Number(maxRow?.mx || 0) + 1;
    const nodeId = `ctax-${kind}-${slug}-${crypto.randomUUID().slice(0, 6)}`;
    await env.DB.prepare(
      `INSERT INTO career_taxonomy_nodes (id, kind, slug, label_en, label_or, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).bind(nodeId, kind, slug, labelEn, labelOr, sortOrder).run();

    await audit(env, request, actor, 'careers.taxonomy.create', 'career_taxonomy', nodeId, { kind, slug, label_en: labelEn });
    await invalidateAllPublicCaches(request);
    const created = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(nodeId).first();
    return json({ ok: true, node: created }, 201, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
