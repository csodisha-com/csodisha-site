// Content & Publishing Suite — Modules #1-#4 Backend Hardening
// - Module #1: All Content (cross-type editorial command)
// - Module #2: Articles & Blogs (post_type = 'article')
// - Module #3: News & Updates (post_type = 'news')
// - Module #4: Current Affairs (post_type = 'current_affairs')
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';
import { getEngineGuardsState } from './security-rbac.js';

export const EDITORIAL_POST_TYPES = ['article', 'news', 'current_affairs', 'announcement'];
export const WORKFLOW_STAGES = ['draft', 'in_review', 'approved', 'published', 'scheduled', 'archived'];

const REQUIRED_POST_COLUMNS = [
  ['post_type', 'TEXT'],
  ['category_slug', 'TEXT'],
  ['tags_json', 'TEXT'],
  ['is_featured', 'INTEGER DEFAULT 0'],
  ['featured_rank', 'INTEGER DEFAULT 0'],
  ['workflow_stage', 'TEXT'],
  ['scheduled_for', 'TEXT'],
  ['exam_relevance', 'TEXT'],
  ['district_tag', 'TEXT'],
  ['source_citation', 'TEXT'],
  ['seo_title', 'TEXT'],
  ['seo_description', 'TEXT'],
  ['updated_by', 'TEXT'],
  ['updated_at', 'TEXT']
];

function sanitizeEditorialText(raw, maxLen = 50000) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw);
  // Strip script/style blocks, inline event handlers, and inline style attributes for strict CSP safety.
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');
  s = s.replace(/javascript\s*:/gi, '');
  return s.trim().slice(0, maxLen);
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try { arr = JSON.parse(trimmed); } catch { arr = trimmed.split(','); }
    } else {
      arr = trimmed ? trimmed.split(',') : [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(t => cleanStr(t, 40)).filter(Boolean))].slice(0, 12);
}

function computeReadingMinutes(bodyText, summaryText) {
  const combined = `${summaryText || ''} ${bodyText || ''}`.trim();
  if (!combined) return 1;
  const words = combined.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function resolvePublicUrl(postType, slug) {
  const safeSlug = encodeURIComponent(slug || 'item');
  if (postType === 'news' || postType === 'article') return `/news/${safeSlug}/`;
  return `/updates/${safeSlug}/`;
}

function mapWorkflowToDbStatus(stage) {
  if (stage === 'published') return 'published';
  if (stage === 'scheduled') return 'scheduled';
  if (stage === 'archived') return 'archived';
  return 'draft';
}

function effectivePostTypeExpr() {
  return `COALESCE(post_type, CASE WHEN type = 'current_affair' THEN 'current_affairs' ELSE type END)`;
}

function effectiveWorkflowExpr() {
  return `COALESCE(workflow_stage, status, 'draft')`;
}

export async function ensureContentPublishingSchema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS posts (
       id TEXT PRIMARY KEY,
       type TEXT NOT NULL DEFAULT 'current_affair' CHECK (type IN ('current_affair', 'job')),
       slug TEXT NOT NULL,
       title TEXT NOT NULL,
       title_or TEXT,
       summary TEXT,
       summary_or TEXT,
       body_md TEXT,
       body_md_or TEXT,
       category TEXT,
       tags TEXT NOT NULL DEFAULT '[]',
       cover_media_key TEXT,
       event_date TEXT,
       organisation TEXT,
       vacancies INTEGER,
       qualification TEXT,
       last_date TEXT,
       apply_url TEXT,
       notification_media_key TEXT,
       state TEXT,
       status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'expired', 'archived')),
       published_at TEXT,
       created_by TEXT,
       updated_by TEXT,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       updated_at TEXT NOT NULL DEFAULT (datetime('now')),
       deleted_at TEXT
     )`
  ).run();

  const pragmaRes = await db.prepare(`PRAGMA table_info(posts)`).all();
  const existingCols = new Set((pragmaRes.results || []).map(c => c.name));

  for (const [colName, colDef] of REQUIRED_POST_COLUMNS) {
    if (!existingCols.has(colName)) {
      await db.prepare(`ALTER TABLE posts ADD COLUMN ${colName} ${colDef}`).run();
    }
  }

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS content_revisions (
       id TEXT PRIMARY KEY,
       post_id TEXT NOT NULL,
       version_no INTEGER NOT NULL DEFAULT 1,
       title TEXT NOT NULL,
       post_type TEXT,
       status TEXT,
       workflow_stage TEXT,
       snapshot_json TEXT NOT NULL,
       edited_by TEXT,
       change_note TEXT,
       created_at TEXT NOT NULL
     )`
  ).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_content_revisions_post ON content_revisions(post_id, version_no DESC)`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS content_categories (
       slug TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       post_type TEXT,
       description TEXT,
       sort_order INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL
     )`
  ).run();
}

function normalizeRow(row) {
  const postType = row.post_type || (row.type === 'current_affair' ? 'current_affairs' : row.type);
  const workflowStage = row.workflow_stage || row.status || 'draft';
  const tags = parseTags(row.tags_json || row.tags);
  const readingMinutes = computeReadingMinutes(row.body_md, row.summary);
  const seoTitle = row.seo_title || '';
  const seoDesc = row.seo_description || '';
  return {
    id: row.id,
    type: row.type,
    post_type: postType,
    slug: row.slug,
    title: row.title,
    title_or: row.title_or || '',
    summary: row.summary || '',
    summary_or: row.summary_or || '',
    body_md: row.body_md || '',
    body_md_or: row.body_md_or || '',
    category: row.category || '',
    category_slug: row.category_slug || (row.category ? slugify(row.category) : ''),
    tags,
    is_featured: Boolean(row.is_featured),
    featured_rank: Number(row.featured_rank || 0),
    status: row.status,
    workflow_stage: workflowStage,
    scheduled_for: row.scheduled_for || null,
    published_at: row.published_at || null,
    event_date: row.event_date || null,
    exam_relevance: row.exam_relevance || '',
    district_tag: row.district_tag || '',
    source_citation: row.source_citation || '',
    seo_title: seoTitle,
    seo_description: seoDesc,
    has_seo_meta: Boolean(seoTitle.trim() && seoDesc.trim()),
    reading_time_minutes: readingMinutes,
    public_url: resolvePublicUrl(postType, row.slug),
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function getNewsPostsGuard(env) {
  try {
    const state = await getEngineGuardsState(env);
    return (state && state.guards && state.guards.news_posts) || {
      require_reviewer_signoff: false,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: true
    };
  } catch {
    return {
      require_reviewer_signoff: false,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: true
    };
  }
}

async function enforcePublishGuards(env, actor, nextStage, candidate, priorRow = null) {
  if (nextStage !== 'published') return;
  const guard = await getNewsPostsGuard(env);
  const hasSeo = Boolean(String(candidate.seo_title || '').trim() && String(candidate.seo_description || '').trim());
  if (guard.require_seo_meta_before_publish && !hasSeo) {
    throw new HttpError(
      403,
      'SEO_META_REQUIRED',
      'Security Engine Guard: Both SEO Title and SEO Description are required before publishing.'
    );
  }
  const priorStage = priorRow ? (priorRow.workflow_stage || priorRow.status) : 'draft';
  if (guard.require_reviewer_signoff && actor.role !== 'admin' && priorStage !== 'approved' && priorStage !== 'published') {
    throw new HttpError(
      403,
      'REVIEWER_SIGNOFF_REQUIRED',
      'Security Engine Guard: Reviewer sign-off (approved stage) is required before publishing.'
    );
  }
}

async function snapshotPostRevision(db, row, actorEmail, changeNote = 'editorial_update') {
  if (!row) return null;
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_no), 0) AS max_v FROM content_revisions WHERE post_id = ?`
  ).bind(row.id).first();
  const nextVer = (Number(verRow && verRow.max_v) || 0) + 1;
  const revId = `rev_${Date.now().toString(36)}_${nextVer}`;
  const nowIso = new Date().toISOString();
  await db.prepare(
    `INSERT INTO content_revisions (id, post_id, version_no, title, post_type, status, workflow_stage, snapshot_json, edited_by, change_note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    revId,
    row.id,
    nextVer,
    row.title || '',
    row.post_type || row.type || 'current_affairs',
    row.status || 'draft',
    row.workflow_stage || row.status || 'draft',
    JSON.stringify(row),
    actorEmail || 'admin',
    changeNote,
    nowIso
  ).run();
  return { id: revId, version_no: nextVer };
}

export async function listContentPosts(env, query = {}) {
  await ensureContentPublishingSchema(env.DB);
  const guard = await getNewsPostsGuard(env);

  const typeParam = String(query.type || 'all').trim().toLowerCase();
  const statusParam = String(query.status || 'all').trim().toLowerCase();
  const categoryParam = String(query.category || '').trim();
  const qParam = String(query.q || '').trim();
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
  const offset = Math.max(0, Number(query.offset) || 0);

  const typeExpr = effectivePostTypeExpr();
  const stageExpr = effectiveWorkflowExpr();

  // Scope KPIs to either a specific post_type or all editorial post types
  const kpiWhere = [`deleted_at IS NULL`, `${typeExpr} IN ('article', 'news', 'current_affairs', 'announcement')`];
  const kpiBind = [];
  if (typeParam !== 'all' && EDITORIAL_POST_TYPES.includes(typeParam)) {
    kpiWhere.push(`${typeExpr} = ?`);
    kpiBind.push(typeParam);
  }

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const kpiRow = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total_count,
       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_count,
       SUM(CASE WHEN ${stageExpr} = 'draft' THEN 1 ELSE 0 END) AS draft_count,
       SUM(CASE WHEN ${stageExpr} = 'in_review' THEN 1 ELSE 0 END) AS in_review_count,
       SUM(CASE WHEN COALESCE(is_featured, 0) = 1 THEN 1 ELSE 0 END) AS featured_count,
       SUM(CASE WHEN COALESCE(published_at, created_at) LIKE ? THEN 1 ELSE 0 END) AS today_count,
       SUM(CASE WHEN COALESCE(district_tag, '') != '' THEN 1 ELSE 0 END) AS district_tagged_count,
       SUM(CASE WHEN COALESCE(exam_relevance, '') != '' THEN 1 ELSE 0 END) AS exam_tagged_count
     FROM posts
     WHERE ${kpiWhere.join(' AND ')}`
  ).bind(`${todayPrefix}%`, ...kpiBind).first();

  const where = [...kpiWhere];
  const bind = [...kpiBind];

  if (statusParam !== 'all' && WORKFLOW_STAGES.includes(statusParam)) {
    if (statusParam === 'published' || statusParam === 'scheduled' || statusParam === 'archived') {
      where.push(`(status = ? OR ${stageExpr} = ?)`);
      bind.push(statusParam, statusParam);
    } else {
      where.push(`${stageExpr} = ?`);
      bind.push(statusParam);
    }
  }
  if (categoryParam) {
    where.push(`(category = ? OR category_slug = ?)`);
    bind.push(categoryParam, slugify(categoryParam));
  }
  if (qParam) {
    const like = `%${likeEscape(qParam)}%`;
    where.push(`(title LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' OR COALESCE(summary,'') LIKE ? ESCAPE '\\' OR COALESCE(district_tag,'') LIKE ? ESCAPE '\\' OR COALESCE(exam_relevance,'') LIKE ? ESCAPE '\\')`);
    bind.push(like, like, like, like, like);
  }

  const whereSql = where.join(' AND ');
  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${whereSql}`).bind(...bind).first();
  const rowsRes = await env.DB.prepare(
    `SELECT * FROM posts
     WHERE ${whereSql}
     ORDER BY COALESCE(is_featured, 0) DESC, COALESCE(featured_rank, 0) ASC, COALESCE(updated_at, created_at) DESC
     LIMIT ? OFFSET ?`
  ).bind(...bind, limit, offset).all();

  const items = (rowsRes.results || []).map(normalizeRow);
  const avgRead = items.length
    ? Math.max(1, Math.round(items.reduce((acc, it) => acc + it.reading_time_minutes, 0) / items.length))
    : 1;

  return {
    ok: true,
    scope: typeParam,
    kpis: {
      total_count: Number(kpiRow && kpiRow.total_count) || 0,
      published_count: Number(kpiRow && kpiRow.published_count) || 0,
      draft_count: Number(kpiRow && kpiRow.draft_count) || 0,
      in_review_count: Number(kpiRow && kpiRow.in_review_count) || 0,
      featured_count: Number(kpiRow && kpiRow.featured_count) || 0,
      today_count: Number(kpiRow && kpiRow.today_count) || 0,
      district_tagged_count: Number(kpiRow && kpiRow.district_tagged_count) || 0,
      exam_tagged_count: Number(kpiRow && kpiRow.exam_tagged_count) || 0,
      avg_reading_minutes: avgRead
    },
    guards: guard,
    paging: {
      total: Number(countRow && countRow.n) || 0,
      limit,
      offset
    },
    items
  };
}

function validateAndNormalizeInput(body = {}, existing = null) {
  const errors = {};
  const pick = (k) => (body[k] !== undefined ? body[k] : (existing ? existing[k] : undefined));

  const title = cleanStr(pick('title'), 200, { required: true });
  if (!title) errors.title = 'Title is required (max 200 chars)';

  const rawPostType = String(pick('post_type') || (existing && existing.post_type) || 'article').trim().toLowerCase();
  const post_type = EDITORIAL_POST_TYPES.includes(rawPostType) ? rawPostType : 'article';

  const rawSlug = body.slug !== undefined ? cleanStr(body.slug, 80) : (existing ? existing.slug : '');
  let slug = rawSlug ? rawSlug.toLowerCase() : slugify(title || 'post');
  if (!slug) slug = 'post';
  if (!SLUG_RE.test(slug) || slug.length > 80) {
    errors.slug = 'Slug may contain lowercase letters, digits, and hyphens only';
  }

  const rawStage = String(pick('workflow_stage') || pick('status') || 'draft').trim().toLowerCase();
  const workflow_stage = WORKFLOW_STAGES.includes(rawStage) ? rawStage : 'draft';
  const status = mapWorkflowToDbStatus(workflow_stage);

  const summary = sanitizeEditorialText(pick('summary') || '', 600);
  const body_md = sanitizeEditorialText(pick('body_md') || '', 50000);
  const title_or = cleanStr(pick('title_or'), 200) || null;
  const summary_or = sanitizeEditorialText(pick('summary_or') || '', 600) || null;
  const body_md_or = sanitizeEditorialText(pick('body_md_or') || '', 50000) || null;
  const category = cleanStr(pick('category'), 60) || '';
  const category_slug = cleanStr(pick('category_slug'), 60) || (category ? slugify(category) : '');
  const tagsArr = body.tags !== undefined ? parseTags(body.tags) : parseTags(existing && (existing.tags_json || existing.tags));
  const is_featured = Boolean(pick('is_featured')) ? 1 : 0;
  const featured_rank = Math.max(0, Math.min(999, Math.round(Number(pick('featured_rank')) || 0)));
  const scheduled_for = cleanStr(pick('scheduled_for'), 40) || null;
  const event_date = cleanStr(pick('event_date'), 10) || new Date().toISOString().slice(0, 10);
  const exam_relevance = cleanStr(pick('exam_relevance'), 160) || '';
  const district_tag = cleanStr(pick('district_tag'), 80) || '';
  const source_citation = cleanStr(pick('source_citation'), 240) || '';
  const seo_title = cleanStr(pick('seo_title'), 120) || '';
  const seo_description = cleanStr(pick('seo_description'), 240) || '';

  if (Object.keys(errors).length) throw validationError(errors);

  return {
    title,
    title_or,
    post_type,
    slug,
    summary,
    summary_or,
    body_md,
    body_md_or,
    category,
    category_slug,
    tags_json: JSON.stringify(tagsArr),
    is_featured,
    featured_rank,
    workflow_stage,
    status,
    scheduled_for,
    event_date,
    exam_relevance,
    district_tag,
    source_citation,
    seo_title,
    seo_description
  };
}

export async function createContentPost(env, body, actor) {
  await ensureContentPublishingSchema(env.DB);
  const data = validateAndNormalizeInput(body, null);

  await enforcePublishGuards(env, actor, data.workflow_stage, data, null);

  const dup = await env.DB.prepare(
    `SELECT id FROM posts WHERE slug = ? AND deleted_at IS NULL LIMIT 1`
  ).bind(data.slug).first();
  if (dup) {
    throw new HttpError(409, 'SLUG_CONFLICT', `A post with slug "${data.slug}" already exists.`);
  }

  const id = `cnt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const publishedAt = data.status === 'published' ? nowIso : (data.status === 'scheduled' ? data.scheduled_for : null);
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';

  await env.DB.prepare(
    `INSERT INTO posts (
       id, type, post_type, slug, title, title_or, summary, summary_or, body_md, body_md_or,
       category, category_slug, tags, tags_json, is_featured, featured_rank,
       status, workflow_stage, scheduled_for, published_at, event_date,
       exam_relevance, district_tag, source_citation, seo_title, seo_description,
       created_by, updated_by, created_at, updated_at
     ) VALUES (?, 'current_affair', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.post_type, data.slug, data.title, data.title_or, data.summary, data.summary_or,
    data.body_md, data.body_md_or, data.category, data.category_slug, data.tags_json, data.tags_json,
    data.is_featured, data.featured_rank, data.status, data.workflow_stage, data.scheduled_for,
    publishedAt, data.event_date, data.exam_relevance, data.district_tag, data.source_citation,
    data.seo_title, data.seo_description, actorEmail, actorEmail, nowIso, nowIso
  ).run();

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first();
  return { ok: true, item: normalizeRow(row) };
}

export async function updateContentPost(env, id, body, actor) {
  await ensureContentPublishingSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${id}" not found`);

  const data = validateAndNormalizeInput(body, existing);
  await enforcePublishGuards(env, actor, data.workflow_stage, data, existing);

  if (data.slug !== existing.slug) {
    const dup = await env.DB.prepare(
      `SELECT id FROM posts WHERE slug = ? AND id != ? AND deleted_at IS NULL LIMIT 1`
    ).bind(data.slug, id).first();
    if (dup) throw new HttpError(409, 'SLUG_CONFLICT', `A post with slug "${data.slug}" already exists.`);
  }

  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const revision = await snapshotPostRevision(env.DB, existing, actorEmail, cleanStr(body.change_note, 120) || 'editorial_edit');

  const nowIso = new Date().toISOString();
  const publishedAt = data.status === 'published'
    ? (existing.published_at || nowIso)
    : (data.status === 'scheduled' ? data.scheduled_for : existing.published_at);

  await env.DB.prepare(
    `UPDATE posts SET
       post_type = ?, slug = ?, title = ?, title_or = ?, summary = ?, summary_or = ?,
       body_md = ?, body_md_or = ?, category = ?, category_slug = ?, tags = ?, tags_json = ?,
       is_featured = ?, featured_rank = ?, status = ?, workflow_stage = ?, scheduled_for = ?,
       published_at = ?, event_date = ?, exam_relevance = ?, district_tag = ?, source_citation = ?,
       seo_title = ?, seo_description = ?, updated_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    data.post_type, data.slug, data.title, data.title_or, data.summary, data.summary_or,
    data.body_md, data.body_md_or, data.category, data.category_slug, data.tags_json, data.tags_json,
    data.is_featured, data.featured_rank, data.status, data.workflow_stage, data.scheduled_for,
    publishedAt, data.event_date, data.exam_relevance, data.district_tag, data.source_citation,
    data.seo_title, data.seo_description, actorEmail, nowIso, id
  ).run();

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first();
  return { ok: true, revision, item: normalizeRow(row) };
}

export async function updateContentPostStatus(env, id, body, actor) {
  await ensureContentPublishingSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${id}" not found`);

  const rawStage = String((body && (body.workflow_stage || body.status)) || '').trim().toLowerCase();
  if (!WORKFLOW_STAGES.includes(rawStage)) {
    throw new HttpError(400, 'INVALID_STAGE', `workflow_stage must be one of: ${WORKFLOW_STAGES.join(', ')}`);
  }

  await enforcePublishGuards(env, actor, rawStage, existing, existing);

  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const revision = await snapshotPostRevision(env.DB, existing, actorEmail, `status_change:${rawStage}`);

  const nextStatus = mapWorkflowToDbStatus(rawStage);
  const nowIso = new Date().toISOString();
  const publishedAt = nextStatus === 'published' ? (existing.published_at || nowIso) : existing.published_at;

  await env.DB.prepare(
    `UPDATE posts SET status = ?, workflow_stage = ?, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`
  ).bind(nextStatus, rawStage, publishedAt, actorEmail, nowIso, id).run();

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first();
  return { ok: true, revision, item: normalizeRow(row) };
}

export async function deleteContentPost(env, id, actor) {
  await ensureContentPublishingSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${id}" not found`);

  const guard = await getNewsPostsGuard(env);
  if (guard.block_editor_hard_delete && actor.role !== 'admin') {
    throw new HttpError(
      403,
      'HARD_DELETE_BLOCKED',
      'Security Engine Guard: Editors cannot delete posts; archive instead.'
    );
  }

  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE posts SET deleted_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`
  ).bind(nowIso, actorEmail, nowIso, id).run();

  return { ok: true, deleted: true, id };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/content/posts[...]
// ============================================================================
export async function handleContentPublishing(request, env, actor, subResource, id, action) {
  if (subResource !== 'posts') {
    throw new HttpError(404, 'NOT_FOUND', 'Unknown content publishing resource');
  }
  const method = request.method;

  if (!id && method === 'GET') {
    const u = new URL(request.url);
    const res = await listContentPosts(env, {
      type: u.searchParams.get('type') || 'all',
      status: u.searchParams.get('status') || 'all',
      category: u.searchParams.get('category') || '',
      q: u.searchParams.get('q') || '',
      limit: u.searchParams.get('limit') || 25,
      offset: u.searchParams.get('offset') || 0
    });
    return json(res, 200, { 'Cache-Control': 'no-store' });
  }

  if (!id && method === 'POST') {
    if (actor.role !== 'admin' && actor.role !== 'editor') {
      throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can create content');
    }
    const body = await readJson(request, 65536).catch(() => ({}));
    const res = await createContentPost(env, body, actor);
    await audit(env, request, actor, 'content.post.create', 'posts', res.item.id, {
      post_type: res.item.post_type,
      slug: res.item.slug,
      workflow_stage: res.item.workflow_stage
    });
    return json(res, 201, { 'Cache-Control': 'no-store' });
  }

  if (id && !action && method === 'PUT') {
    if (actor.role !== 'admin' && actor.role !== 'editor') {
      throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can update content');
    }
    const body = await readJson(request, 65536).catch(() => ({}));
    const res = await updateContentPost(env, id, body, actor);
    await audit(env, request, actor, 'content.post.update', 'posts', id, {
      post_type: res.item.post_type,
      slug: res.item.slug,
      revision_version: res.revision ? res.revision.version_no : null
    });
    return json(res, 200, { 'Cache-Control': 'no-store' });
  }

  if (id && action === 'status' && (method === 'PATCH' || method === 'PUT')) {
    if (actor.role !== 'admin' && actor.role !== 'editor' && actor.role !== 'reviewer') {
      throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions to change content status');
    }
    const body = await readJson(request, 8192).catch(() => ({}));
    const res = await updateContentPostStatus(env, id, body, actor);
    await audit(env, request, actor, 'content.post.status', 'posts', id, {
      workflow_stage: res.item.workflow_stage,
      status: res.item.status
    });
    return json(res, 200, { 'Cache-Control': 'no-store' });
  }

  if (id && !action && method === 'DELETE') {
    const res = await deleteContentPost(env, id, actor);
    await audit(env, request, actor, 'content.post.delete', 'posts', id, { deleted: true });
    return json(res, 200, { 'Cache-Control': 'no-store' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
