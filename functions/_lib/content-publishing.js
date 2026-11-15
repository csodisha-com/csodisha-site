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
export const NOTICE_PRIORITIES = ['normal', 'urgent', 'deadline'];
export const TAG_REGISTRY_KEY = 'content_tag_registry';
export const WORKFLOW_POLICY_KEY = 'content_workflow_policy';
export const LAST_SCHEDULED_DISPATCH_KEY = 'ops_last_scheduled_dispatch';

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
  ['notice_priority', "TEXT DEFAULT 'normal'"],
  ['notice_expires_at', 'TEXT'],
  ['notice_cta_url', 'TEXT'],
  ['notice_cta_label', 'TEXT'],
  ['review_notes', 'TEXT'],
  ['reviewed_by', 'TEXT'],
  ['reviewed_at', 'TEXT'],
  ['updated_by', 'TEXT'],
  ['updated_at', 'TEXT']
];

const DEFAULT_CATEGORIES = [
  { slug: 'odisha-news', name: 'Odisha News', description: 'Statewide institutional, district, and governance updates.', sort_order: 1 },
  { slug: 'current-affairs', name: 'Current Affairs', description: 'Daily and weekly current affairs digests for competitive exams.', sort_order: 2 },
  { slug: 'government-schemes', name: 'Government Schemes', description: 'Odisha and Central welfare & beneficiary scheme briefings.', sort_order: 3 },
  { slug: 'exam-alerts', name: 'Exam Alerts', description: 'OPSC, OSSSC, OSSC, and university recruitment notifications.', sort_order: 4 },
  { slug: 'education-policy', name: 'Education Policy', description: 'Higher education, NEP, and scholarship policy analysis.', sort_order: 5 },
  { slug: 'editorial-analysis', name: 'Editorial Analysis', description: 'Long-form essays and exam preparation strategies.', sort_order: 6 }
];

function validateSafeCtaUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_CTA_URL', 'CTA URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_CTA_URL', 'CTA URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_CTA_URL', 'CTA URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

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
       id TEXT,
       slug TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       post_type TEXT,
       description TEXT,
       parent_slug TEXT,
       sort_order INTEGER NOT NULL DEFAULT 0,
       is_active INTEGER NOT NULL DEFAULT 1,
       created_at TEXT NOT NULL,
       updated_at TEXT
     )`
  ).run();

  const catColsRes = await db.prepare(`PRAGMA table_info(content_categories)`).all();
  const catCols = new Set((catColsRes.results || []).map(c => c.name));
  for (const [cName, cDef] of [
    ['id', 'TEXT'],
    ['parent_slug', 'TEXT'],
    ['is_active', 'INTEGER NOT NULL DEFAULT 1'],
    ['updated_at', 'TEXT']
  ]) {
    if (!catCols.has(cName)) {
      await db.prepare(`ALTER TABLE content_categories ADD COLUMN ${cName} ${cDef}`).run();
    }
  }

  const catCount = await db.prepare(`SELECT COUNT(*) AS n FROM content_categories`).first();
  if (!catCount || Number(catCount.n) === 0) {
    const nowIso = new Date().toISOString();
    for (const c of DEFAULT_CATEGORIES) {
      await db.prepare(
        `INSERT OR IGNORE INTO content_categories (id, slug, name, description, parent_slug, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, 1, ?, ?)`
      ).bind(`cat_${c.slug}`, c.slug, c.name, c.description, c.sort_order, nowIso, nowIso).run();
    }
  }
}

function normalizeRow(row) {
  const postType = row.post_type || (row.type === 'current_affair' ? 'current_affairs' : row.type);
  const workflowStage = row.workflow_stage || row.status || 'draft';
  const tags = parseTags(row.tags_json || row.tags);
  const readingMinutes = computeReadingMinutes(row.body_md, row.summary);
  const seoTitle = row.seo_title || '';
  const seoDesc = row.seo_description || '';
  const expiresAt = row.notice_expires_at || null;
  const isExpired = Boolean(expiresAt && Date.parse(expiresAt) < Date.now());
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
    notice_priority: NOTICE_PRIORITIES.includes(row.notice_priority) ? row.notice_priority : 'normal',
    notice_expires_at: expiresAt,
    notice_cta_url: row.notice_cta_url || '',
    notice_cta_label: row.notice_cta_label || '',
    is_expired: isExpired,
    review_notes: row.review_notes || '',
    reviewed_by: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || null,
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
  const rawPriority = String(pick('notice_priority') || 'normal').trim().toLowerCase();
  const notice_priority = NOTICE_PRIORITIES.includes(rawPriority) ? rawPriority : 'normal';
  const notice_expires_at = cleanStr(pick('notice_expires_at'), 40) || null;
  const notice_cta_url = validateSafeCtaUrl(pick('notice_cta_url'));
  const notice_cta_label = cleanStr(pick('notice_cta_label'), 60) || '';

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
    seo_description,
    notice_priority,
    notice_expires_at,
    notice_cta_url,
    notice_cta_label
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
       notice_priority, notice_expires_at, notice_cta_url, notice_cta_label,
       created_by, updated_by, created_at, updated_at
     ) VALUES (?, 'current_affair', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.post_type, data.slug, data.title, data.title_or, data.summary, data.summary_or,
    data.body_md, data.body_md_or, data.category, data.category_slug, data.tags_json, data.tags_json,
    data.is_featured, data.featured_rank, data.status, data.workflow_stage, data.scheduled_for,
    publishedAt, data.event_date, data.exam_relevance, data.district_tag, data.source_citation,
    data.seo_title, data.seo_description,
    data.notice_priority, data.notice_expires_at, data.notice_cta_url, data.notice_cta_label,
    actorEmail, actorEmail, nowIso, nowIso
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
       seo_title = ?, seo_description = ?,
       notice_priority = ?, notice_expires_at = ?, notice_cta_url = ?, notice_cta_label = ?,
       updated_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    data.post_type, data.slug, data.title, data.title_or, data.summary, data.summary_or,
    data.body_md, data.body_md_or, data.category, data.category_slug, data.tags_json, data.tags_json,
    data.is_featured, data.featured_rank, data.status, data.workflow_stage, data.scheduled_for,
    publishedAt, data.event_date, data.exam_relevance, data.district_tag, data.source_citation,
    data.seo_title, data.seo_description,
    data.notice_priority, data.notice_expires_at, data.notice_cta_url, data.notice_cta_label,
    actorEmail, nowIso, id
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
// Module #5: Announcements & Notices
// ============================================================================
export async function listAnnouncements(env) {
  await ensureContentPublishingSchema(env.DB);
  const res = await env.DB.prepare(
    `SELECT * FROM posts
     WHERE deleted_at IS NULL AND COALESCE(post_type, '') = 'announcement'
     ORDER BY
       CASE COALESCE(notice_priority, 'normal')
         WHEN 'urgent' THEN 0
         WHEN 'deadline' THEN 1
         ELSE 2
       END ASC,
       COALESCE(updated_at, created_at) DESC
     LIMIT 100`
  ).all();

  const items = (res.results || []).map(normalizeRow);
  const nowMs = Date.now();
  const soonMs = nowMs + 7 * 86400000;

  let activeLiveCount = 0;
  let expiredCount = 0;
  let urgentCount = 0;
  let expiringSoonCount = 0;

  for (const it of items) {
    if (it.is_expired) expiredCount++;
    else if (it.status === 'published') activeLiveCount++;
    if (it.notice_priority === 'urgent' || it.notice_priority === 'deadline') urgentCount++;
    if (it.notice_expires_at && !it.is_expired && Date.parse(it.notice_expires_at) <= soonMs) {
      expiringSoonCount++;
    }
  }

  const tickerPreview = items.filter(it => it.status === 'published' && !it.is_expired).slice(0, 8);

  return {
    ok: true,
    kpis: {
      total_count: items.length,
      active_live_count: activeLiveCount,
      expired_count: expiredCount,
      urgent_count: urgentCount,
      expiring_soon_count: expiringSoonCount
    },
    ticker_preview: tickerPreview,
    items
  };
}

// ============================================================================
// Module #6: Featured Content
// ============================================================================
export async function getFeaturedContentState(env) {
  await ensureContentPublishingSchema(env.DB);
  const typeExpr = effectivePostTypeExpr();
  const [featRes, eligRes] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM posts
       WHERE deleted_at IS NULL AND COALESCE(is_featured, 0) = 1
         AND ${typeExpr} IN ('article', 'news', 'current_affairs', 'announcement')
       ORDER BY COALESCE(featured_rank, 999) ASC, COALESCE(updated_at, created_at) DESC
       LIMIT 50`
    ).all(),
    env.DB.prepare(
      `SELECT * FROM posts
       WHERE deleted_at IS NULL AND COALESCE(is_featured, 0) = 0 AND status = 'published'
         AND ${typeExpr} IN ('article', 'news', 'current_affairs', 'announcement')
       ORDER BY COALESCE(updated_at, created_at) DESC
       LIMIT 50`
    ).all()
  ]);

  const featuredItems = (featRes.results || []).map(normalizeRow);
  const eligibleItems = (eligRes.results || []).map(normalizeRow);
  const typeMix = new Set(featuredItems.map(i => i.post_type)).size;
  const heroLead = featuredItems[0] || null;

  return {
    ok: true,
    kpis: {
      active_featured_count: featuredItems.length,
      hero_lead_id: heroLead ? heroLead.id : null,
      hero_lead_title: heroLead ? heroLead.title : 'None pinned',
      slots_used: featuredItems.length,
      max_slots: 6,
      type_mix: typeMix,
      homepage_ready: featuredItems.some(i => i.status === 'published')
    },
    featured_items: featuredItems,
    eligible_items: eligibleItems
  };
}

export async function setFeaturedContentItem(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const postId = String(body.post_id || body.id || '').trim();
  if (!postId) throw new HttpError(400, 'POST_ID_REQUIRED', 'post_id is required');

  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(postId).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${postId}" not found`);

  const isFeatured = body.is_featured !== false;
  if (isFeatured && existing.status !== 'published') {
    throw new HttpError(
      400,
      'UNPUBLISHED_CANNOT_FEATURE',
      'Unpublished drafts or archived items cannot be pinned to homepage Featured slots.'
    );
  }

  let rank = body.featured_rank !== undefined ? Number(body.featured_rank) : (Number(existing.featured_rank) || 1);
  if (!Number.isInteger(rank) || rank < 1 || rank > 50) {
    rank = 1;
  }

  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE posts SET is_featured = ?, featured_rank = ?, updated_by = ?, updated_at = ? WHERE id = ?`
  ).bind(isFeatured ? 1 : 0, isFeatured ? rank : 0, actorEmail, nowIso, postId).run();

  return await getFeaturedContentState(env);
}

// ============================================================================
// Module #7: Content Categories
// ============================================================================
export async function listContentCategories(env) {
  await ensureContentPublishingSchema(env.DB);
  const [catsRes, countsRes, uncatRow] = await Promise.all([
    env.DB.prepare(`SELECT * FROM content_categories ORDER BY sort_order ASC, name ASC`).all(),
    env.DB.prepare(
      `SELECT
         COALESCE(NULLIF(category_slug, ''), LOWER(REPLACE(COALESCE(category, ''), ' ', '-'))) AS cat_key,
         COUNT(*) AS post_count,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_count
       FROM posts
       WHERE deleted_at IS NULL AND COALESCE(category_slug, category, '') != ''
       GROUP BY cat_key`
    ).all(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM posts WHERE deleted_at IS NULL AND COALESCE(NULLIF(category_slug, ''), NULLIF(category, ''), '') = ''`
    ).first()
  ]);

  const countMap = new Map();
  for (const r of (countsRes.results || [])) {
    countMap.set(String(r.cat_key || '').toLowerCase(), {
      post_count: Number(r.post_count) || 0,
      published_count: Number(r.published_count) || 0
    });
  }

  const items = (catsRes.results || []).map(c => {
    const counts = countMap.get(String(c.slug).toLowerCase()) || { post_count: 0, published_count: 0 };
    return {
      id: c.id || `cat_${c.slug}`,
      slug: c.slug,
      name: c.name,
      description: c.description || '',
      parent_slug: c.parent_slug || null,
      sort_order: Number(c.sort_order || 0),
      is_active: c.is_active === undefined ? true : Boolean(c.is_active),
      post_count: counts.post_count,
      published_count: counts.published_count,
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at
    };
  });

  const categorizedTotal = items.reduce((acc, c) => acc + c.post_count, 0);
  return {
    ok: true,
    kpis: {
      total_categories: items.length,
      active_categories: items.filter(c => c.is_active).length,
      categorized_posts: categorizedTotal,
      uncategorized_posts: Number(uncatRow && uncatRow.n) || 0
    },
    items
  };
}

export async function createContentCategory(env, body = {}) {
  await ensureContentPublishingSchema(env.DB);
  const name = cleanStr(body.name, 80, { required: true });
  if (!name) throw validationError({ name: 'Category name is required (max 80 chars)' });

  let slug = body.slug ? cleanStr(body.slug, 80).toLowerCase() : slugify(name);
  if (!slug || !SLUG_RE.test(slug)) {
    throw validationError({ slug: 'Slug must contain lowercase letters, digits, and hyphens only' });
  }

  const dup = await env.DB.prepare(`SELECT slug FROM content_categories WHERE slug = ?`).bind(slug).first();
  if (dup) throw new HttpError(409, 'SLUG_CONFLICT', `Category slug "${slug}" already exists.`);

  const id = `cat_${Date.now().toString(36)}`;
  const nowIso = new Date().toISOString();
  const sortOrder = Math.max(0, Math.min(999, Math.round(Number(body.sort_order) || 10)));
  const isActive = body.is_active === false ? 0 : 1;

  await env.DB.prepare(
    `INSERT INTO content_categories (id, slug, name, description, parent_slug, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    slug,
    name,
    cleanStr(body.description, 300) || '',
    cleanStr(body.parent_slug, 80) || null,
    sortOrder,
    isActive,
    nowIso,
    nowIso
  ).run();

  return await listContentCategories(env);
}

export async function updateContentCategory(env, idOrSlug, body = {}) {
  await ensureContentPublishingSchema(env.DB);
  const existing = await env.DB.prepare(
    `SELECT * FROM content_categories WHERE id = ? OR slug = ? LIMIT 1`
  ).bind(idOrSlug, idOrSlug).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Category "${idOrSlug}" not found`);

  const name = body.name !== undefined ? cleanStr(body.name, 80, { required: true }) : existing.name;
  if (!name) throw validationError({ name: 'Category name is required' });

  const nextSlug = body.slug !== undefined ? cleanStr(body.slug, 80).toLowerCase() : existing.slug;
  if (!nextSlug || !SLUG_RE.test(nextSlug)) {
    throw validationError({ slug: 'Slug must contain lowercase letters, digits, and hyphens only' });
  }
  if (nextSlug !== existing.slug) {
    const dup = await env.DB.prepare(`SELECT slug FROM content_categories WHERE slug = ?`).bind(nextSlug).first();
    if (dup) throw new HttpError(409, 'SLUG_CONFLICT', `Category slug "${nextSlug}" already exists.`);
  }

  const description = body.description !== undefined ? (cleanStr(body.description, 300) || '') : (existing.description || '');
  const parentSlug = body.parent_slug !== undefined ? (cleanStr(body.parent_slug, 80) || null) : existing.parent_slug;
  const sortOrder = body.sort_order !== undefined ? Math.max(0, Math.min(999, Math.round(Number(body.sort_order) || 0))) : Number(existing.sort_order || 0);
  const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing.is_active === undefined ? 1 : Number(existing.is_active));
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE content_categories SET slug = ?, name = ?, description = ?, parent_slug = ?, sort_order = ?, is_active = ?, updated_at = ?
     WHERE slug = ?`
  ).bind(nextSlug, name, description, parentSlug, sortOrder, isActive, nowIso, existing.slug).run();

  if (nextSlug !== existing.slug || name !== existing.name) {
    await env.DB.prepare(
      `UPDATE posts SET category = ?, category_slug = ? WHERE (category_slug = ? OR LOWER(COALESCE(category, '')) = LOWER(?)) AND deleted_at IS NULL`
    ).bind(name, nextSlug, existing.slug, existing.name).run();
  }

  return await listContentCategories(env);
}

export async function deleteContentCategory(env, idOrSlug, reassignTo = '') {
  await ensureContentPublishingSchema(env.DB);
  const existing = await env.DB.prepare(
    `SELECT * FROM content_categories WHERE id = ? OR slug = ? LIMIT 1`
  ).bind(idOrSlug, idOrSlug).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Category "${idOrSlug}" not found`);

  const refRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM posts WHERE deleted_at IS NULL AND (category_slug = ? OR LOWER(COALESCE(category, '')) = LOWER(?))`
  ).bind(existing.slug, existing.name).first();
  const refCount = Number(refRow && refRow.n) || 0;

  if (refCount > 0) {
    const cleanTarget = String(reassignTo || '').trim();
    if (!cleanTarget) {
      throw new HttpError(
        409,
        'CATEGORY_IN_USE',
        `Category "${existing.name}" is referenced by ${refCount} active post(s). Provide reassign_to to reassign them first.`
      );
    }
    const targetCat = await env.DB.prepare(
      `SELECT * FROM content_categories WHERE (id = ? OR slug = ?) AND slug != ? LIMIT 1`
    ).bind(cleanTarget, cleanTarget, existing.slug).first();
    if (!targetCat) {
      throw new HttpError(400, 'INVALID_REASSIGN_TARGET', `Target category "${cleanTarget}" not found.`);
    }
    await env.DB.prepare(
      `UPDATE posts SET category = ?, category_slug = ? WHERE deleted_at IS NULL AND (category_slug = ? OR LOWER(COALESCE(category, '')) = LOWER(?))`
    ).bind(targetCat.name, targetCat.slug, existing.slug, existing.name).run();
  }

  await env.DB.prepare(`DELETE FROM content_categories WHERE slug = ?`).bind(existing.slug).run();
  return await listContentCategories(env);
}

// ============================================================================
// Module #8: Tags
// ============================================================================
async function ensureSiteSettingsTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_settings (
       key TEXT PRIMARY KEY,
       value_json TEXT NOT NULL,
       updated_by TEXT,
       updated_at TEXT NOT NULL
     )`
  ).run();
}

async function readTagRegistry(db) {
  await ensureSiteSettingsTable(db);
  try {
    const row = await db.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(TAG_REGISTRY_KEY).first();
    if (row && row.value_json) {
      const parsed = JSON.parse(row.value_json);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

async function writeTagRegistry(db, tags, actorEmail) {
  await ensureSiteSettingsTable(db);
  const nowIso = new Date().toISOString();
  await db.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(TAG_REGISTRY_KEY, JSON.stringify(tags), actorEmail || 'admin', nowIso).run();
}

export async function listContentTags(env) {
  await ensureContentPublishingSchema(env.DB);
  const [postsRes, registry] = await Promise.all([
    env.DB.prepare(`SELECT id, title, status, tags, tags_json FROM posts WHERE deleted_at IS NULL`).all(),
    readTagRegistry(env.DB)
  ]);

  const map = new Map();
  for (const reg of registry) {
    const s = slugify(reg.slug || reg.label || '');
    if (!s) continue;
    map.set(s, { slug: s, label: cleanStr(reg.label || s, 40), post_count: 0, published_count: 0, sample_titles: [] });
  }

  let taggedPostsCount = 0;
  for (const p of (postsRes.results || [])) {
    const tags = parseTags(p.tags_json || p.tags);
    if (tags.length) taggedPostsCount++;
    for (const rawLabel of tags) {
      const s = slugify(rawLabel);
      if (!s) continue;
      if (!map.has(s)) {
        map.set(s, { slug: s, label: rawLabel, post_count: 0, published_count: 0, sample_titles: [] });
      }
      const entry = map.get(s);
      entry.post_count++;
      if (p.status === 'published') entry.published_count++;
      if (entry.sample_titles.length < 3) entry.sample_titles.push(p.title);
    }
  }

  const items = [...map.values()].sort((a, b) => b.post_count - a.post_count || a.slug.localeCompare(b.slug));
  const multiUse = items.filter(t => t.post_count > 1).length;
  const orphans = items.filter(t => t.post_count <= 1).length;

  return {
    ok: true,
    kpis: {
      total_unique_tags: items.length,
      tagged_posts_count: taggedPostsCount,
      multi_use_tags: multiUse,
      orphan_tags: orphans
    },
    items
  };
}

export async function registerContentTag(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const label = cleanStr(body.label || body.name, 40, { required: true });
  if (!label) throw validationError({ label: 'Tag label is required (max 40 chars)' });
  const slug = slugify(body.slug || label);
  if (!slug) throw validationError({ slug: 'Provide a valid alphanumeric tag slug' });

  const reg = await readTagRegistry(env.DB);
  if (!reg.some(r => slugify(r.slug || r.label) === slug)) {
    reg.push({ slug, label });
    await writeTagRegistry(env.DB, reg, actor && (actor.email || actor.userId));
  }
  return await listContentTags(env);
}

export async function renameOrMergeContentTag(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const fromSlug = slugify(body.from_tag || body.from_slug || '');
  const toLabel = cleanStr(body.to_tag || body.to_label || '', 40);
  const toSlug = slugify(toLabel);
  if (!fromSlug || !toSlug) {
    throw new HttpError(400, 'INVALID_TAG_PARAMS', 'Both from_tag and to_tag are required');
  }
  if (fromSlug === toSlug && toLabel === fromSlug) {
    throw new HttpError(400, 'SAME_TAG', 'Source and target tags must differ');
  }

  const postsRes = await env.DB.prepare(`SELECT id, title, tags, tags_json FROM posts WHERE deleted_at IS NULL`).all();
  const affected = [];
  for (const p of (postsRes.results || [])) {
    const tags = parseTags(p.tags_json || p.tags);
    if (tags.some(t => slugify(t) === fromSlug)) {
      affected.push({ id: p.id, title: p.title, tags });
    }
  }

  if (body.dry_run === true) {
    return {
      ok: true,
      dry_run: true,
      from_slug: fromSlug,
      to_slug: toSlug,
      to_label: toLabel,
      affected_posts_count: affected.length,
      sample_titles: affected.slice(0, 5).map(a => a.title)
    };
  }

  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  for (const p of affected) {
    const mapped = [];
    const seen = new Set();
    for (const t of p.tags) {
      const nextVal = slugify(t) === fromSlug ? toLabel : t;
      const key = slugify(nextVal);
      if (key && !seen.has(key)) {
        seen.add(key);
        mapped.push(nextVal);
      }
    }
    const jsonTags = JSON.stringify(mapped);
    await env.DB.prepare(
      `UPDATE posts SET tags = ?, tags_json = ?, updated_by = ?, updated_at = ? WHERE id = ?`
    ).bind(jsonTags, jsonTags, actorEmail, nowIso, p.id).run();
  }

  const reg = await readTagRegistry(env.DB);
  const nextReg = reg.filter(r => slugify(r.slug || r.label) !== fromSlug);
  if (!nextReg.some(r => slugify(r.slug || r.label) === toSlug)) {
    nextReg.push({ slug: toSlug, label: toLabel });
  }
  await writeTagRegistry(env.DB, nextReg, actorEmail);

  const state = await listContentTags(env);
  return { ...state, dry_run: false, affected_posts_count: affected.length };
}

export async function deleteContentTag(env, rawSlug, actor) {
  await ensureContentPublishingSchema(env.DB);
  const targetSlug = slugify(rawSlug || '');
  if (!targetSlug) throw new HttpError(400, 'INVALID_SLUG', 'Valid tag slug is required');

  const postsRes = await env.DB.prepare(`SELECT id, tags, tags_json FROM posts WHERE deleted_at IS NULL`).all();
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  let updatedCount = 0;

  for (const p of (postsRes.results || [])) {
    const tags = parseTags(p.tags_json || p.tags);
    const filtered = tags.filter(t => slugify(t) !== targetSlug);
    if (filtered.length !== tags.length) {
      const jsonTags = JSON.stringify(filtered);
      await env.DB.prepare(
        `UPDATE posts SET tags = ?, tags_json = ?, updated_by = ?, updated_at = ? WHERE id = ?`
      ).bind(jsonTags, jsonTags, actorEmail, nowIso, p.id).run();
      updatedCount++;
    }
  }

  const reg = await readTagRegistry(env.DB);
  const nextReg = reg.filter(r => slugify(r.slug || r.label) !== targetSlug);
  await writeTagRegistry(env.DB, nextReg, actorEmail);

  const state = await listContentTags(env);
  return { ...state, deleted_slug: targetSlug, affected_posts_count: updatedCount };
}

// ============================================================================
// Module #9: Editorial Calendar
// ============================================================================
function currentIstMonth() {
  return new Date(Date.now() + 19800000).toISOString().slice(0, 7);
}

export async function getEditorialCalendar(env, query = {}) {
  await ensureContentPublishingSchema(env.DB);
  const rawMonth = String(query.month || currentIstMonth()).trim();
  if (!/^\d{4}-\d{2}$/.test(rawMonth)) {
    throw new HttpError(400, 'INVALID_MONTH', 'month must be in YYYY-MM format');
  }
  const typeParam = String(query.type || 'all').trim().toLowerCase();
  const typeExpr = effectivePostTypeExpr();

  const where = [`deleted_at IS NULL`, `${typeExpr} IN ('article', 'news', 'current_affairs', 'announcement')`];
  const bind = [];
  if (typeParam !== 'all' && EDITORIAL_POST_TYPES.includes(typeParam)) {
    where.push(`${typeExpr} = ?`);
    bind.push(typeParam);
  }

  const res = await env.DB.prepare(
    `SELECT * FROM posts WHERE ${where.join(' AND ')} ORDER BY COALESCE(scheduled_for, published_at, updated_at, created_at) ASC LIMIT 300`
  ).bind(...bind).all();

  const items = (res.results || []).map(normalizeRow);
  const days = {};
  const draftsBacklog = [];
  let totalInMonth = 0;
  let publishedInMonth = 0;
  let scheduledInMonth = 0;

  for (const it of items) {
    if ((it.workflow_stage === 'draft' || it.status === 'draft') && !it.scheduled_for) {
      if (draftsBacklog.length < 30) draftsBacklog.push(it);
    }
    const effDate = String(it.scheduled_for || it.published_at || it.updated_at || it.created_at || '');
    if (effDate.slice(0, 7) === rawMonth) {
      const dayKey = effDate.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
        if (!days[dayKey]) days[dayKey] = [];
        days[dayKey].push(it);
        totalInMonth++;
        if (it.status === 'published') publishedInMonth++;
        else if (it.workflow_stage === 'scheduled' || it.status === 'scheduled') scheduledInMonth++;
      }
    }
  }

  return {
    ok: true,
    month: rawMonth,
    type: typeParam,
    kpis: {
      total_in_month: totalInMonth,
      published_in_month: publishedInMonth,
      scheduled_in_month: scheduledInMonth,
      drafts_backlog: draftsBacklog.length
    },
    days,
    drafts_backlog: draftsBacklog
  };
}

export async function slotCalendarPost(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const postId = String(body.post_id || body.id || '').trim();
  if (!postId) throw new HttpError(400, 'POST_ID_REQUIRED', 'post_id is required');

  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(postId).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${postId}" not found`);

  const rawDate = String(body.target_date || body.scheduled_for || '').trim();
  if (!rawDate || Number.isNaN(Date.parse(rawDate))) {
    throw new HttpError(400, 'INVALID_DATE', 'Provide a valid ISO-8601 target_date (YYYY-MM-DD or timestamp)');
  }
  const isoSlot = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T09:00:00Z` : new Date(rawDate).toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const nowIso = new Date().toISOString();

  const nextStatus = existing.status === 'published' ? 'published' : 'scheduled';
  const nextStage = existing.status === 'published' ? 'published' : 'scheduled';
  const nextPublishedAt = existing.status === 'published' ? (existing.published_at || isoSlot) : null;

  await env.DB.prepare(
    `UPDATE posts SET status = ?, workflow_stage = ?, scheduled_for = ?, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`
  ).bind(nextStatus, nextStage, isoSlot, nextPublishedAt, actorEmail, nowIso, postId).run();

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(postId).first();
  return { ok: true, item: normalizeRow(row) };
}

// ============================================================================
// Module #10: Publishing Workflow
// ============================================================================
export function defaultWorkflowPolicy() {
  return {
    require_seo_meta: true,
    min_word_count: 20,
    require_reviewer_signoff: false,
    notify_on_submit: true
  };
}

function normalizeWorkflowPolicy(raw) {
  const def = defaultWorkflowPolicy();
  if (!raw || typeof raw !== 'object') return def;
  const minWords = Number(raw.min_word_count);
  return {
    require_seo_meta: raw.require_seo_meta !== undefined ? Boolean(raw.require_seo_meta) : def.require_seo_meta,
    min_word_count: Number.isFinite(minWords) ? Math.max(0, Math.min(2000, Math.round(minWords))) : def.min_word_count,
    require_reviewer_signoff: raw.require_reviewer_signoff !== undefined ? Boolean(raw.require_reviewer_signoff) : def.require_reviewer_signoff,
    notify_on_submit: raw.notify_on_submit !== undefined ? Boolean(raw.notify_on_submit) : def.notify_on_submit
  };
}

async function readWorkflowPolicy(db) {
  await ensureSiteSettingsTable(db);
  try {
    const row = await db.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(WORKFLOW_POLICY_KEY).first();
    if (row && row.value_json) return normalizeWorkflowPolicy(JSON.parse(row.value_json));
  } catch {}
  return defaultWorkflowPolicy();
}

function countWordsForRow(row) {
  const txt = `${row.summary || ''} ${row.body_md || ''}`.trim();
  return txt ? txt.split(/\s+/).filter(Boolean).length : 0;
}

export async function getWorkflowState(env) {
  await ensureContentPublishingSchema(env.DB);
  const policy = await readWorkflowPolicy(env.DB);
  const typeExpr = effectivePostTypeExpr();
  const res = await env.DB.prepare(
    `SELECT * FROM posts
     WHERE deleted_at IS NULL AND ${typeExpr} IN ('article', 'news', 'current_affairs', 'announcement')
     ORDER BY COALESCE(updated_at, created_at) DESC
     LIMIT 120`
  ).all();

  const stages = { draft: [], in_review: [], approved: [], published: [] };
  let passCount = 0;
  let evaluatedCount = 0;

  for (const r of (res.results || [])) {
    const item = normalizeRow(r);
    const wc = countWordsForRow(r);
    const meetsWordCount = wc >= policy.min_word_count;
    const hasCategory = Boolean(item.category || item.category_slug);
    const passesSeo = !policy.require_seo_meta || item.has_seo_meta;
    const gatePassed = meetsWordCount && passesSeo;
    const enriched = {
      ...item,
      word_count: wc,
      meets_word_count: meetsWordCount,
      has_category: hasCategory,
      gate_passed: gatePassed
    };
    const st = item.workflow_stage || item.status || 'draft';
    if (st === 'archived') continue;
    evaluatedCount++;
    if (gatePassed) passCount++;
    if (st === 'in_review') stages.in_review.push(enriched);
    else if (st === 'approved') stages.approved.push(enriched);
    else if (st === 'published' || item.status === 'published') stages.published.push(enriched);
    else stages.draft.push(enriched);
  }

  return {
    ok: true,
    policy,
    kpis: {
      drafts_count: stages.draft.length,
      in_review_count: stages.in_review.length,
      approved_count: stages.approved.length,
      published_count: stages.published.length,
      gate_pass_rate: evaluatedCount ? Math.round((passCount / evaluatedCount) * 100) : 100
    },
    stages
  };
}

export async function saveWorkflowPolicy(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  if (body.min_word_count !== undefined) {
    const w = Number(body.min_word_count);
    if (!Number.isInteger(w) || w < 0 || w > 2000) {
      throw new HttpError(400, 'INVALID_WORD_COUNT', 'min_word_count must be an integer between 0 and 2000');
    }
  }
  const current = await readWorkflowPolicy(env.DB);
  const next = normalizeWorkflowPolicy({ ...current, ...body });
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(WORKFLOW_POLICY_KEY, JSON.stringify(next), actorEmail, nowIso).run();

  return await getWorkflowState(env);
}

export async function transitionWorkflowPost(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const postId = String(body.post_id || body.id || '').trim();
  const action = String(body.action || '').trim().toLowerCase();
  const reviewNotes = cleanStr(body.review_notes, 500) || '';

  const ACTION_MAP = {
    submit_for_review: 'in_review',
    approve: 'approved',
    request_changes: 'draft',
    return_to_draft: 'draft',
    publish: 'published'
  };
  if (!postId || !ACTION_MAP[action]) {
    throw new HttpError(400, 'INVALID_TRANSITION', 'Provide post_id and valid action (submit_for_review, approve, request_changes, publish, return_to_draft)');
  }

  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(postId).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${postId}" not found`);

  const policy = await readWorkflowPolicy(env.DB);
  const nextStage = ACTION_MAP[action];
  const existingStage = existing.workflow_stage || existing.status || 'draft';

  if (action === 'approve' && policy.require_reviewer_signoff && actor.role !== 'admin' && actor.role !== 'reviewer') {
    throw new HttpError(403, 'REVIEWER_ROLE_REQUIRED', 'Only Reviewers or Super Administrators can approve submissions.');
  }

  if (nextStage === 'published') {
    const wc = countWordsForRow(existing);
    if (wc < policy.min_word_count) {
      throw new HttpError(
        400,
        'MIN_WORD_COUNT_NOT_MET',
        `Post has ${wc} word(s); workflow policy requires at least ${policy.min_word_count} words before publishing.`
      );
    }
    const hasSeo = Boolean(String(existing.seo_title || '').trim() && String(existing.seo_description || '').trim());
    if (policy.require_seo_meta && !hasSeo) {
      throw new HttpError(403, 'SEO_META_REQUIRED', 'Workflow Policy: SEO Title and SEO Description are required before publishing.');
    }
    if (policy.require_reviewer_signoff && actor.role !== 'admin' && existingStage !== 'approved' && existingStage !== 'published') {
      throw new HttpError(403, 'REVIEWER_SIGNOFF_REQUIRED', 'Workflow Policy: Reviewer approval is required before publishing.');
    }
    await enforcePublishGuards(env, actor, 'published', existing, existing);
  }

  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const revision = await snapshotPostRevision(env.DB, existing, actorEmail, `workflow:${action}`);
  const nextStatus = mapWorkflowToDbStatus(nextStage);
  const nowIso = new Date().toISOString();
  const publishedAt = nextStatus === 'published' ? (existing.published_at || nowIso) : existing.published_at;
  const reviewedBy = (action === 'approve' || action === 'request_changes') ? actorEmail : existing.reviewed_by;
  const reviewedAt = (action === 'approve' || action === 'request_changes') ? nowIso : existing.reviewed_at;
  const notesToSave = reviewNotes || existing.review_notes || '';

  await env.DB.prepare(
    `UPDATE posts SET
       status = ?, workflow_stage = ?, published_at = ?,
       review_notes = ?, reviewed_by = ?, reviewed_at = ?,
       updated_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(nextStatus, nextStage, publishedAt, notesToSave, reviewedBy, reviewedAt, actorEmail, nowIso, postId).run();

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(postId).first();
  return { ok: true, revision, item: normalizeRow(row) };
}

// ============================================================================
// Module #11: Scheduled Content
// ============================================================================
export async function getScheduledContentState(env) {
  await ensureContentPublishingSchema(env.DB);
  await ensureSiteSettingsTable(env.DB);
  const typeExpr = effectivePostTypeExpr();
  const [res, lastRow] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM posts
       WHERE deleted_at IS NULL
         AND ${typeExpr} IN ('article', 'news', 'current_affairs', 'announcement')
         AND (status = 'scheduled' OR workflow_stage = 'scheduled')
       ORDER BY COALESCE(scheduled_for, created_at) ASC
       LIMIT 100`
    ).all(),
    env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(LAST_SCHEDULED_DISPATCH_KEY).first()
  ]);

  const nowMs = Date.now();
  const dueQueue = [];
  const upcomingQueue = [];

  for (const r of (res.results || [])) {
    const it = normalizeRow(r);
    const ts = it.scheduled_for ? Date.parse(it.scheduled_for) : nowMs;
    const isDue = Number.isNaN(ts) || ts <= nowMs;
    const entry = { ...it, is_due: isDue };
    if (isDue) dueQueue.push(entry);
    else upcomingQueue.push(entry);
  }

  let lastDispatch = null;
  if (lastRow && lastRow.value_json) {
    try { lastDispatch = JSON.parse(lastRow.value_json); } catch {}
  }

  return {
    ok: true,
    kpis: {
      total_scheduled: dueQueue.length + upcomingQueue.length,
      due_count: dueQueue.length,
      upcoming_count: upcomingQueue.length,
      next_go_live: upcomingQueue[0] ? upcomingQueue[0].scheduled_for : null,
      last_dispatch_at: lastDispatch ? lastDispatch.dispatched_at : null
    },
    due_queue: dueQueue,
    upcoming_queue: upcomingQueue,
    last_dispatch: lastDispatch
  };
}

export async function dispatchScheduledContent(env, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const dryRun = body.dry_run !== false;
  const targetPostId = body.post_id ? String(body.post_id).trim() : null;
  const state = await getScheduledContentState(env);

  let candidates = [];
  if (targetPostId) {
    candidates = [...state.due_queue, ...state.upcoming_queue].filter(i => i.id === targetPostId);
    if (!candidates.length) {
      throw new HttpError(404, 'NOT_FOUND', `Scheduled post "${targetPostId}" not found`);
    }
  } else {
    candidates = state.due_queue;
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      would_publish_count: candidates.length,
      candidates
    };
  }

  const guard = await getNewsPostsGuard(env);
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const published = [];
  const skipped = [];

  for (const item of candidates) {
    if (guard.require_seo_meta_before_publish && !item.has_seo_meta) {
      if (targetPostId) {
        throw new HttpError(403, 'SEO_META_REQUIRED', 'Security Engine Guard: SEO Title and SEO Description are required before publishing.');
      }
      skipped.push({ id: item.id, title: item.title, reason: 'SEO_META_REQUIRED' });
      continue;
    }
    const rawRow = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(item.id).first();
    await snapshotPostRevision(env.DB, rawRow, actorEmail, 'scheduled_dispatch');
    await env.DB.prepare(
      `UPDATE posts SET status = 'published', workflow_stage = 'published', published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`
    ).bind(nowIso, actorEmail, nowIso, item.id).run();
    published.push({ id: item.id, title: item.title });
  }

  await ensureSiteSettingsTable(env.DB);
  const dispatchMeta = {
    dispatched_at: nowIso,
    dispatched_by: actorEmail,
    published_count: published.length,
    skipped_count: skipped.length
  };
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(LAST_SCHEDULED_DISPATCH_KEY, JSON.stringify(dispatchMeta), actorEmail, nowIso).run();

  return {
    ok: true,
    dry_run: false,
    published_count: published.length,
    published,
    skipped,
    dispatch: dispatchMeta
  };
}

export async function rescheduleScheduledPost(env, id, body = {}, actor) {
  await ensureContentPublishingSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Post "${id}" not found`);

  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  const nowIso = new Date().toISOString();
  const action = String(body.action || '').trim().toLowerCase();

  if (action === 'unschedule' || body.workflow_stage === 'draft') {
    await env.DB.prepare(
      `UPDATE posts SET status = 'draft', workflow_stage = 'draft', scheduled_for = NULL, updated_by = ?, updated_at = ? WHERE id = ?`
    ).bind(actorEmail, nowIso, id).run();
  } else {
    const rawDate = String(body.scheduled_for || '').trim();
    if (!rawDate || Number.isNaN(Date.parse(rawDate))) {
      throw new HttpError(400, 'INVALID_DATE', 'Provide a valid ISO-8601 scheduled_for timestamp');
    }
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T09:00:00Z` : new Date(rawDate).toISOString();
    await env.DB.prepare(
      `UPDATE posts SET status = 'scheduled', workflow_stage = 'scheduled', scheduled_for = ?, updated_by = ?, updated_at = ? WHERE id = ?`
    ).bind(iso, actorEmail, nowIso, id).run();
  }

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first();
  return { ok: true, item: normalizeRow(row) };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/content/{posts|announcements|featured|categories|tags|calendar|workflow|scheduled}
// ============================================================================
export async function handleContentPublishing(request, env, actor, subResource, id, action) {
  const method = request.method;

  // Module #9: /api/admin/content/calendar
  if (subResource === 'calendar') {
    if (!id && method === 'GET') {
      const u = new URL(request.url);
      return json(await getEditorialCalendar(env, {
        month: u.searchParams.get('month') || '',
        type: u.searchParams.get('type') || 'all'
      }), 200, { 'Cache-Control': 'no-store' });
    }
    if (id === 'slot' && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can slot calendar dates');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await slotCalendarPost(env, body, actor);
      await audit(env, request, actor, 'content.calendar.slot', 'posts', res.item.id, {
        scheduled_for: res.item.scheduled_for
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #10: /api/admin/content/workflow
  if (subResource === 'workflow') {
    if (!id && method === 'GET') {
      return json(await getWorkflowState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (id === 'policy' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update workflow quality gates');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await saveWorkflowPolicy(env, body, actor);
      await audit(env, request, actor, 'content.workflow.policy.update', 'site_settings', WORKFLOW_POLICY_KEY, res.policy);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id === 'transition' && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor' && actor.role !== 'reviewer') {
        throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions to transition workflow stage');
      }
      const body = await readJson(request, 8192).catch(() => ({}));
      const res = await transitionWorkflowPost(env, body, actor);
      await audit(env, request, actor, 'content.workflow.transition', 'posts', res.item.id, {
        action: body.action,
        workflow_stage: res.item.workflow_stage
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #11: /api/admin/content/scheduled
  if (subResource === 'scheduled') {
    if (!id && method === 'GET') {
      return json(await getScheduledContentState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (id === 'dispatch' && method === 'POST') {
      const body = await readJson(request, 4096).catch(() => ({}));
      const dryRun = body.dry_run !== false;
      if (!dryRun && actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can dispatch scheduled posts');
      }
      const res = await dispatchScheduledContent(env, body, actor);
      if (!res.dry_run) {
        await audit(env, request, actor, 'content.scheduled.dispatch', 'posts', body.post_id || 'batch', {
          published_count: res.published_count,
          skipped_count: res.skipped ? res.skipped.length : 0
        });
      }
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && (method === 'PATCH' || method === 'PUT')) {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can reschedule posts');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await rescheduleScheduledPost(env, id, body, actor);
      await audit(env, request, actor, 'content.scheduled.reschedule', 'posts', id, {
        workflow_stage: res.item.workflow_stage,
        scheduled_for: res.item.scheduled_for
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #5: /api/admin/content/announcements
  if (subResource === 'announcements') {
    if (!id && method === 'GET') {
      return json(await listAnnouncements(env), 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #6: /api/admin/content/featured
  if (subResource === 'featured') {
    if (!id && method === 'GET') {
      return json(await getFeaturedContentState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!id && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can manage featured slots');
      }
      const body = await readJson(request, 8192).catch(() => ({}));
      const res = await setFeaturedContentItem(env, body, actor);
      await audit(env, request, actor, 'content.featured.update', 'posts', String(body.post_id || body.id || ''), {
        is_featured: body.is_featured !== false,
        featured_rank: body.featured_rank || 1
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #7: /api/admin/content/categories
  if (subResource === 'categories') {
    if (!id && method === 'GET') {
      return json(await listContentCategories(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!id && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can create categories');
      }
      const body = await readJson(request, 8192).catch(() => ({}));
      const res = await createContentCategory(env, body);
      await audit(env, request, actor, 'content.category.save', 'content_categories', body.slug || body.name || '', {
        action: 'create',
        name: body.name
      });
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'PUT') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can update categories');
      }
      const body = await readJson(request, 8192).catch(() => ({}));
      const res = await updateContentCategory(env, id, body);
      await audit(env, request, actor, 'content.category.save', 'content_categories', id, {
        action: 'update',
        name: body.name
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'DELETE') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can delete categories');
      }
      const u = new URL(request.url);
      const body = await readJson(request, 4096).catch(() => ({}));
      const reassignTo = u.searchParams.get('reassign_to') || body.reassign_to || '';
      const res = await deleteContentCategory(env, id, reassignTo);
      await audit(env, request, actor, 'content.category.delete', 'content_categories', id, {
        reassign_to: reassignTo || null
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #8: /api/admin/content/tags
  if (subResource === 'tags') {
    if (!id && method === 'GET') {
      return json(await listContentTags(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!id && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can register tags');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await registerContentTag(env, body, actor);
      await audit(env, request, actor, 'content.tag.save', 'site_settings', TAG_REGISTRY_KEY, {
        label: body.label || body.name
      });
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if ((id === 'rename' || id === 'merge') && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can rename or merge tags');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await renameOrMergeContentTag(env, body, actor);
      if (!res.dry_run) {
        await audit(env, request, actor, id === 'merge' ? 'content.tag.merge' : 'content.tag.rename', 'posts', body.from_tag || '', {
          to_tag: body.to_tag,
          affected_posts_count: res.affected_posts_count
        });
      }
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'DELETE') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can delete tags');
      }
      const res = await deleteContentTag(env, id, actor);
      await audit(env, request, actor, 'content.tag.delete', 'posts', id, {
        affected_posts_count: res.affected_posts_count
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (subResource !== 'posts') {
    throw new HttpError(404, 'NOT_FOUND', 'Unknown content publishing resource');
  }

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
    await audit(env, request, actor, res.item.post_type === 'announcement' ? 'content.announcement.save' : 'content.post.create', 'posts', res.item.id, {
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
    await audit(env, request, actor, res.item.post_type === 'announcement' ? 'content.announcement.save' : 'content.post.update', 'posts', id, {
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
    await audit(env, request, actor, res.item.post_type === 'announcement' ? 'content.announcement.save' : 'content.post.status', 'posts', id, {
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
