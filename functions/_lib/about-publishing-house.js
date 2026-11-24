/**
 * v253: About & Institutional Transparency Publishing House Engine
 *
 * ZERO-STALE-CACHE ARCHITECTURE:
 *  - Every Admin mutation writes atomically to D1, logs to audit_log, calls
 *    invalidateAllPublicCaches(request) immediately, and sets X-CSO-Cache-Purged: 1.
 *  - Every /api/public/about/* response returns Cache-Control: no-store, max-age=0
 *    for 100% instant public domain reflection.
 */
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

const MB = 1024 * 1024;
const ALLOWED_UPLOAD_MIME = {
  'image/jpeg': { ext: 'jpg', max: 5 * MB, kind: 'image' },
  'image/png': { ext: 'png', max: 5 * MB, kind: 'image' },
  'image/webp': { ext: 'webp', max: 5 * MB, kind: 'image' },
  'application/pdf': { ext: 'pdf', max: 15 * MB, kind: 'pdf' }
};

export const ABOUT_DOC_TYPES = [
  'Institutional Charter',
  'Editorial Policy',
  'Author / Mentor Profile',
  'Legal / Privacy',
  'Impact Report',
  'Public FAQ'
];

export const OFFICIAL_SOURCE_SECTORS = [
  'Odisha State',
  'Central Govt',
  'Scholarships & DBT',
  'Recruitment Commissions'
];

const INQUIRY_TYPES = ['general_inquiry', 'academic_partnership', 'editorial_correction', 'grievance_escalation', 'press_media'];
const INQUIRY_STATUSES = ['open', 'replied', 'resolved', 'archived'];

let _schemaReady = false;

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function intOrZero(v, min = 0, max = 99999999) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function boolInt(v, def = 0) {
  if (v === undefined || v === null || v === '') return def ? 1 : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  return (s === '1' || s === 'true' || s === 'yes' || s === 'on') ? 1 : 0;
}

function slugify(input, fallback = 'about-page') {
  const s = String(input || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  return s || fallback;
}

function safeHref(v) {
  const s = str(v, 500);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw || ''));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

function nowIsoSql() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// ============================================================================
// SCHEMA GUARD & CACHE INVALIDATION
// ============================================================================
export async function ensureAboutStudioSchema(db) {
  if (_schemaReady || !db) return;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS about_taxonomy_nodes (
      id TEXT PRIMARY KEY,
      level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
      parent_id TEXT,
      slug TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      accent_variant TEXT NOT NULL DEFAULT 'emerald',
      sort_order INTEGER NOT NULL DEFAULT 100,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS about_articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      category_l1_id TEXT NOT NULL DEFAULT '',
      category_l2_id TEXT NOT NULL DEFAULT '',
      category_l3_id TEXT NOT NULL DEFAULT '',
      doc_type_badge TEXT NOT NULL DEFAULT 'Institutional Charter',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      person_role_en TEXT NOT NULL DEFAULT '',
      person_role_or TEXT NOT NULL DEFAULT '',
      person_credentials TEXT NOT NULL DEFAULT '',
      person_district TEXT NOT NULL DEFAULT '',
      effective_date TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      cover_image_caption TEXT NOT NULL DEFAULT '',
      article_body_en TEXT NOT NULL DEFAULT '',
      article_body_or TEXT NOT NULL DEFAULT '',
      highlights_table_json TEXT NOT NULL DEFAULT '[]',
      verification_steps_json TEXT NOT NULL DEFAULT '[]',
      impact_metrics_json TEXT NOT NULL DEFAULT '[]',
      faq_items_json TEXT NOT NULL DEFAULT '[]',
      reference_links_json TEXT NOT NULL DEFAULT '[]',
      charter_pdf_url TEXT NOT NULL DEFAULT '',
      press_kit_pdf_url TEXT NOT NULL DEFAULT '',
      pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
      extra_attachments_json TEXT NOT NULL DEFAULT '[]',
      revision_note_en TEXT NOT NULL DEFAULT '',
      revision_note_or TEXT NOT NULL DEFAULT '',
      scheduled_publish_at TEXT NOT NULL DEFAULT '',
      preview_token TEXT NOT NULL DEFAULT '',
      preview_expires_at TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      pdf_downloads_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS about_official_sources (
      id TEXT PRIMARY KEY,
      sector TEXT NOT NULL DEFAULT 'Odisha State',
      authority_name_en TEXT NOT NULL,
      authority_name_or TEXT NOT NULL DEFAULT '',
      official_url TEXT NOT NULL,
      domain_badge TEXT NOT NULL DEFAULT '.gov.in',
      purpose_en TEXT NOT NULL DEFAULT '',
      purpose_or TEXT NOT NULL DEFAULT '',
      helpline_info TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 100,
      is_verified INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS about_article_revisions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL DEFAULT 1,
      change_summary TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS about_public_inquiries (
      id TEXT PRIMARY KEY,
      inquiry_type TEXT NOT NULL DEFAULT 'general_inquiry',
      sender_name TEXT NOT NULL,
      sender_email TEXT NOT NULL DEFAULT '',
      sender_phone TEXT NOT NULL DEFAULT '',
      district TEXT NOT NULL DEFAULT '',
      subject_text TEXT NOT NULL,
      message_text TEXT NOT NULL,
      admin_reply TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT NOT NULL DEFAULT ''
    )`).run();

    _schemaReady = true;
  } catch (e) {
    console.error('ensureAboutStudioSchema error:', e);
  }
}

async function invalidateAboutCaches(request, slug = '') {
  const extra = [
    '/about/',
    '/about/index.html',
    '/',
    '/index.html',
    '/api/public/about/tree',
    '/api/public/about/pages',
    '/api/public/about/article',
    '/api/public/about/sources',
    '/api/public/about-overview',
    '/api/about/overview'
  ];
  if (slug) extra.push(`/api/public/about/article?slug=${encodeURIComponent(slug)}`);
  await invalidateAllPublicCaches(request, extra);
}

export async function publishDueScheduledAboutArticles(db) {
  if (!db) return 0;
  try {
    const nowIso = new Date().toISOString().slice(0, 19);
    const res = await db.prepare(
      `UPDATE about_articles
       SET is_published = 1,
           published_at = CASE WHEN published_at = '' THEN datetime('now') ELSE published_at END,
           updated_at = datetime('now')
       WHERE is_published = 0
         AND scheduled_publish_at != ''
         AND replace(scheduled_publish_at, 'T', ' ') <= replace(?, 'T', ' ')`
    ).bind(nowIso).run();
    return Number((res && res.meta && res.meta.changes) || 0);
  } catch {
    return 0;
  }
}

// ============================================================================
// TAXONOMY & ARTICLE FORMATTERS
// ============================================================================
function formatTaxNode(row) {
  if (!row) return null;
  return {
    id: row.id,
    level: Number(row.level || 1),
    parent_id: row.parent_id || null,
    slug: row.slug,
    title_en: row.title_en,
    title_or: row.title_or || '',
    subtitle_en: row.subtitle_en || '',
    subtitle_or: row.subtitle_or || '',
    icon: row.icon || '',
    accent_variant: row.accent_variant || 'emerald',
    sort_order: Number(row.sort_order || 100),
    is_published: Boolean(row.is_published),
    updated_at: row.updated_at || ''
  };
}

async function loadTaxonomyMap(db) {
  const { results } = await db.prepare('SELECT * FROM about_taxonomy_nodes ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] }));
  const map = new Map();
  const list = (results || []).map(r => {
    const f = formatTaxNode(r);
    map.set(f.id, f);
    return f;
  });
  return { list, map };
}

function buildTaxonomyTree(nodes) {
  const byId = new Map();
  nodes.forEach(n => byId.set(n.id, { ...n, children: [] }));
  const roots = [];
  for (const node of byId.values()) {
    if (node.level === 1 || !node.parent_id || !byId.has(node.parent_id)) {
      if (node.level === 1) roots.push(node);
    } else {
      byId.get(node.parent_id).children.push(node);
    }
  }
  const sortFn = (a, b) => (a.sort_order - b.sort_order) || a.title_en.localeCompare(b.title_en);
  roots.sort(sortFn);
  roots.forEach(l1 => {
    l1.children.sort(sortFn);
    l1.children.forEach(l2 => l2.children.sort(sortFn));
  });
  return roots;
}

function sanitizeHighlights(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 40).map(r => ({
    principle_en: str(r && (r.principle_en || r.title), 160),
    principle_or: str(r && r.principle_or, 160),
    detail_en: str(r && (r.detail_en || r.detail), 400),
    detail_or: str(r && r.detail_or, 400)
  })).filter(r => r.principle_en || r.detail_en);
}

function sanitizeSteps(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 20).map(r => ({
    step: str(r && r.step, 120),
    detail_en: str(r && (r.detail_en || r.detail), 400),
    detail_or: str(r && r.detail_or, 400)
  })).filter(r => r.step || r.detail_en);
}

function sanitizeMetrics(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 20).map(r => ({
    metric: str(r && r.metric, 60),
    label_en: str(r && (r.label_en || r.label), 160),
    label_or: str(r && r.label_or, 160)
  })).filter(r => r.metric || r.label_en);
}

function sanitizeFaqs(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 40).map(r => ({
    q_en: str(r && (r.q_en || r.question), 260),
    q_or: str(r && r.q_or, 260),
    a_en: str(r && (r.a_en || r.answer), 700),
    a_or: str(r && r.a_or, 700)
  })).filter(r => r.q_en && r.a_en);
}

function sanitizeLinks(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 20).map(r => ({
    label_en: str(r && (r.label_en || r.label), 160),
    url: safeHref(r && r.url)
  })).filter(r => r.label_en && r.url);
}

function sanitizePdfBookmarks(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 30).map(r => ({
    page: Math.max(1, intOrZero(r && r.page, 1, 2000)),
    label: str(r && r.label, 140)
  })).filter(r => r.label);
}

function formatAboutArticle(row, taxMap = new Map(), includeAdmin = false) {
  if (!row) return null;
  const l1 = taxMap.get(row.category_l1_id) || null;
  const l2 = taxMap.get(row.category_l2_id) || null;
  const l3 = taxMap.get(row.category_l3_id) || null;
  const isPub = Boolean(row.is_published);
  const sched = row.scheduled_publish_at || '';
  const status = isPub ? 'published' : (sched ? 'scheduled' : 'draft');

  const out = {
    id: row.id,
    slug: row.slug,
    category_l1_id: row.category_l1_id || '',
    category_l2_id: row.category_l2_id || '',
    category_l3_id: row.category_l3_id || '',
    taxonomy: {
      l1: l1 ? { id: l1.id, slug: l1.slug, title_en: l1.title_en, title_or: l1.title_or, icon: l1.icon } : null,
      l2: l2 ? { id: l2.id, slug: l2.slug, title_en: l2.title_en, title_or: l2.title_or, icon: l2.icon } : null,
      l3: l3 ? { id: l3.id, slug: l3.slug, title_en: l3.title_en, title_or: l3.title_or, icon: l3.icon } : null
    },
    doc_type_badge: row.doc_type_badge || 'Institutional Charter',
    title_en: row.title_en || '',
    title_or: row.title_or || '',
    subtitle_en: row.subtitle_en || '',
    subtitle_or: row.subtitle_or || '',
    summary_en: row.summary_en || '',
    summary_or: row.summary_or || '',
    person_role_en: row.person_role_en || '',
    person_role_or: row.person_role_or || '',
    person_credentials: row.person_credentials || '',
    person_district: row.person_district || '',
    effective_date: row.effective_date || '',
    cover_image_url: row.cover_image_url || '',
    cover_image_caption: row.cover_image_caption || '',
    article_body_en: row.article_body_en || '',
    article_body_or: row.article_body_or || '',
    highlights_table: parseJson(row.highlights_table_json, []),
    verification_steps: parseJson(row.verification_steps_json, []),
    impact_metrics: parseJson(row.impact_metrics_json, []),
    faq_items: parseJson(row.faq_items_json, []),
    reference_links: parseJson(row.reference_links_json, []),
    charter_pdf_url: row.charter_pdf_url || '',
    press_kit_pdf_url: row.press_kit_pdf_url || '',
    pdf_index_bookmarks: parseJson(row.pdf_index_bookmarks_json, []),
    extra_attachments: parseJson(row.extra_attachments_json, []),
    revision_note_en: row.revision_note_en || '',
    revision_note_or: row.revision_note_or || '',
    scheduled_publish_at: sched,
    is_featured: Boolean(row.is_featured),
    is_published: isPub,
    status,
    views_count: Number(row.views_count || 0),
    pdf_downloads_count: Number(row.pdf_downloads_count || 0),
    published_at: row.published_at || '',
    updated_at: row.updated_at || '',
    public_url: `/about/?slug=${encodeURIComponent(row.slug)}`
  };
  if (includeAdmin) {
    out.preview_token = row.preview_token || '';
    out.preview_expires_at = row.preview_expires_at || '';
  }
  return out;
}

// ============================================================================
// ADMIN: R2 UPLOAD (/api/admin/about/upload)
// ============================================================================
function sniffMime(b) {
  const eq = (off, sig) => sig.every((x, i) => b[off + i] === x);
  if (b.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (b.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (b.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (b.length >= 5 && eq(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export async function handleAboutMediaUpload(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 MEDIA storage is not configured');
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string' || file.size <= 0) throw validationError({ file: 'Select a valid image or PDF file.' });
  const purpose = str(form.get('purpose') || 'about-asset', 40).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'about-asset';

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const sniffed = sniffMime(bytes.slice(0, 16));
  const spec = ALLOWED_UPLOAD_MIME[sniffed || (file.type || '').toLowerCase()];
  if (!spec || !sniffed) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP images and PDFs are supported.');
  if (file.size > spec.max) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds ${Math.round(spec.max / MB)} MB limit.`);

  const baseName = slugify((file.name || purpose).replace(/\.[^.]+$/, ''), purpose).slice(0, 48);
  const key = `about-publishing/${Date.now()}-${baseName}-${randomHex(3)}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: sniffed } });
  const publicUrl = `/api/media/${key}`;
  try {
    await env.DB.prepare(
      `INSERT INTO media_files (id, original_filename, title_en, file_category, mime_type, file_size_bytes, r2_key, public_url, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind('mf_' + randomHex(6), str(file.name || key, 140), str(file.name || purpose, 140), spec.kind, sniffed, file.size, key, publicUrl, actor.email || actor.userId).run();
  } catch {}
  await audit(env, request, actor, 'about_media.upload', 'media', key, { purpose, kind: spec.kind, size: file.size });
  return json({ ok: true, key, url: publicUrl, kind: spec.kind, size_bytes: file.size, filename: str(file.name || key, 160) }, 201, NO_STORE);
}

// ============================================================================
// ADMIN: 3-LAYER INSTITUTIONAL TAXONOMY (/api/admin/about/taxonomy)
// ============================================================================
export async function handleAboutTaxonomyAdmin(request, env, actor, nodeId, action) {
  const db = env.DB;
  await ensureAboutStudioSchema(db);
  const method = request.method;

  if (!nodeId && method === 'GET') {
    const { list } = await loadTaxonomyMap(db);
    const { results: counts } = await db.prepare(
      'SELECT category_l1_id, category_l2_id, category_l3_id, COUNT(*) AS n FROM about_articles GROUP BY category_l1_id, category_l2_id, category_l3_id'
    ).all().catch(() => ({ results: [] }));
    const cMap = new Map();
    const bump = (id, n) => { if (id) cMap.set(id, (cMap.get(id) || 0) + Number(n || 0)); };
    (counts || []).forEach(r => { bump(r.category_l1_id, r.n); bump(r.category_l2_id, r.n); bump(r.category_l3_id, r.n); });
    const enriched = list.map(n => ({ ...n, pages_count: cMap.get(n.id) || 0 }));
    return json({ ok: true, nodes: enriched, tree: buildTaxonomyTree(enriched) }, 200, NO_STORE);
  }

  if (!nodeId && method === 'POST') {
    const body = await readJson(request, 20000);
    const level = Number(body.level);
    if (![1, 2, 3].includes(level)) throw validationError({ level: 'Level must be 1, 2, or 3.' });
    const titleEn = str(body.title_en, 140);
    if (!titleEn) throw validationError({ title_en: 'English title is required.' });
    const parentId = level === 1 ? null : str(body.parent_id, 80) || null;
    if (level > 1 && !parentId) throw validationError({ parent_id: 'Parent node is required for Level 2 and Level 3.' });
    if (parentId) {
      const parent = await db.prepare('SELECT id, level FROM about_taxonomy_nodes WHERE id = ?').bind(parentId).first();
      if (!parent || Number(parent.level) !== level - 1) throw validationError({ parent_id: `Parent must be an existing Level ${level - 1} node.` });
    }
    const slug = slugify(body.slug || titleEn, `about-l${level}`);
    const maxRow = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM about_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ?").bind(level, parentId || '').first().catch(() => ({ m: 0 }));
    const sortOrder = body.sort_order !== undefined && body.sort_order !== '' ? intOrZero(body.sort_order, 0, 100000) : Number((maxRow && maxRow.m) || 0) + 10;
    const id = `atax_l${level}_${Date.now().toString(36)}_${randomHex(3)}`;

    await db.prepare(
      `INSERT INTO about_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, level, parentId, slug, titleEn, str(body.title_or, 160), str(body.subtitle_en, 240), str(body.subtitle_or, 240), str(body.icon, 24), str(body.accent_variant || 'emerald', 32), sortOrder, boolInt(body.is_published, 1)).run();

    const created = formatTaxNode(await db.prepare('SELECT * FROM about_taxonomy_nodes WHERE id = ?').bind(id).first());
    await audit(env, request, actor, 'about_taxonomy.create', 'about_taxonomy_nodes', id, { level, title_en: titleEn });
    await invalidateAboutCaches(request);
    const res = json({ ok: true, node: created }, 201, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && action === 'move' && method === 'POST') {
    const body = await readJson(request, 5000);
    const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!dir) throw validationError({ direction: 'direction must be up or down.' });
    const node = await db.prepare('SELECT * FROM about_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!node) throw new HttpError(404, 'NOT_FOUND', 'Node not found');
    const { results: siblings } = await db.prepare("SELECT id FROM about_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ? ORDER BY sort_order ASC, title_en ASC").bind(node.level, node.parent_id || '').all();
    const ids = (siblings || []).map(s => s.id);
    const idx = ids.indexOf(nodeId);
    const swapIdx = idx + dir;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < ids.length) {
      [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
      await db.batch(ids.map((rid, n) => db.prepare("UPDATE about_taxonomy_nodes SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)));
    }
    await audit(env, request, actor, 'about_taxonomy.reorder', 'about_taxonomy_nodes', nodeId, { direction: body.direction });
    await invalidateAboutCaches(request);
    const res = json({ ok: true, id: nodeId }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM about_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Node not found');
    const body = await readJson(request, 20000);
    const fields = [];
    const vals = [];
    const set = (c, v) => { fields.push(`${c} = ?`); vals.push(v); };
    if (body.title_en !== undefined) set('title_en', str(body.title_en, 140) || existing.title_en);
    if (body.title_or !== undefined) set('title_or', str(body.title_or, 160));
    if (body.subtitle_en !== undefined) set('subtitle_en', str(body.subtitle_en, 240));
    if (body.subtitle_or !== undefined) set('subtitle_or', str(body.subtitle_or, 240));
    if (body.icon !== undefined) set('icon', str(body.icon, 24));
    if (body.is_published !== undefined) set('is_published', boolInt(body.is_published, 1));
    if (fields.length) {
      await db.prepare(`UPDATE about_taxonomy_nodes SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, nodeId).run();
    }
    const updated = formatTaxNode(await db.prepare('SELECT * FROM about_taxonomy_nodes WHERE id = ?').bind(nodeId).first());
    await audit(env, request, actor, 'about_taxonomy.update', 'about_taxonomy_nodes', nodeId, { title_en: updated.title_en });
    await invalidateAboutCaches(request);
    const res = json({ ok: true, node: updated }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && method === 'DELETE') {
    const childRow = await db.prepare('SELECT COUNT(*) AS n FROM about_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).first().catch(() => ({ n: 0 }));
    if (Number((childRow && childRow.n) || 0) > 0) throw new HttpError(409, 'HAS_CHILDREN', 'Delete child sections/formats first.');
    await db.prepare('DELETE FROM about_taxonomy_nodes WHERE id = ?').bind(nodeId).run();
    await audit(env, request, actor, 'about_taxonomy.delete', 'about_taxonomy_nodes', nodeId, {});
    await invalidateAboutCaches(request);
    const res = json({ ok: true, deleted: nodeId }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown about taxonomy route');
}

// ============================================================================
// ADMIN: INSTITUTIONAL PAGES & PROFILES CRUD, PREVIEW TOKEN & REVISIONS
// ============================================================================
function normalizeAboutPayload(body, existing = null) {
  const titleEn = body.title_en !== undefined ? str(body.title_en, 240) : (existing ? existing.title_en : '');
  if (!titleEn) throw validationError({ title_en: 'English title is required.' });
  const slug = body.slug !== undefined ? slugify(body.slug || titleEn, 'about-' + Date.now().toString(36)) : (existing ? existing.slug : slugify(titleEn, 'about-' + Date.now().toString(36)));
  const isPub = body.is_published !== undefined ? boolInt(body.is_published, 0) : (existing ? Number(existing.is_published || 0) : 0);
  const pick = (k, max = 500, def = '') => body[k] !== undefined ? str(body[k], max) : (existing ? String(existing[k] || '') : def);
  const pickHref = (k) => body[k] !== undefined ? safeHref(body[k]) : (existing ? String(existing[k] || '') : '');
  const pubAt = isPub ? (existing && existing.published_at ? existing.published_at : nowIsoSql()) : (existing ? String(existing.published_at || '') : '');

  return {
    slug,
    category_l1_id: pick('category_l1_id', 80),
    category_l2_id: pick('category_l2_id', 80),
    category_l3_id: pick('category_l3_id', 80),
    doc_type_badge: pick('doc_type_badge', 60, 'Institutional Charter'),
    title_en: titleEn,
    title_or: pick('title_or', 260),
    subtitle_en: pick('subtitle_en', 260),
    subtitle_or: pick('subtitle_or', 260),
    summary_en: pick('summary_en', 1200),
    summary_or: pick('summary_or', 1200),
    person_role_en: pick('person_role_en', 160),
    person_role_or: pick('person_role_or', 160),
    person_credentials: pick('person_credentials', 260),
    person_district: pick('person_district', 80),
    effective_date: pick('effective_date', 30),
    cover_image_url: pickHref('cover_image_url'),
    cover_image_caption: pick('cover_image_caption', 240),
    article_body_en: body.article_body_en !== undefined ? str(body.article_body_en, 50000) : (existing ? String(existing.article_body_en || '') : ''),
    article_body_or: body.article_body_or !== undefined ? str(body.article_body_or, 50000) : (existing ? String(existing.article_body_or || '') : ''),
    highlights_table_json: JSON.stringify(body.highlights_table !== undefined ? sanitizeHighlights(body.highlights_table) : (existing ? parseJson(existing.highlights_table_json, []) : [])),
    verification_steps_json: JSON.stringify(body.verification_steps !== undefined ? sanitizeSteps(body.verification_steps) : (existing ? parseJson(existing.verification_steps_json, []) : [])),
    impact_metrics_json: JSON.stringify(body.impact_metrics !== undefined ? sanitizeMetrics(body.impact_metrics) : (existing ? parseJson(existing.impact_metrics_json, []) : [])),
    faq_items_json: JSON.stringify(body.faq_items !== undefined ? sanitizeFaqs(body.faq_items) : (existing ? parseJson(existing.faq_items_json, []) : [])),
    reference_links_json: JSON.stringify(body.reference_links !== undefined ? sanitizeLinks(body.reference_links) : (existing ? parseJson(existing.reference_links_json, []) : [])),
    charter_pdf_url: pickHref('charter_pdf_url'),
    press_kit_pdf_url: pickHref('press_kit_pdf_url'),
    pdf_index_bookmarks_json: JSON.stringify(body.pdf_index_bookmarks !== undefined ? sanitizePdfBookmarks(body.pdf_index_bookmarks) : (existing ? parseJson(existing.pdf_index_bookmarks_json, []) : [])),
    extra_attachments_json: JSON.stringify(body.extra_attachments !== undefined ? sanitizeLinks(body.extra_attachments) : (existing ? parseJson(existing.extra_attachments_json, []) : [])),
    revision_note_en: pick('revision_note_en', 400),
    revision_note_or: pick('revision_note_or', 400),
    scheduled_publish_at: pick('scheduled_publish_at', 40),
    is_featured: body.is_featured !== undefined ? boolInt(body.is_featured, 0) : (existing ? Number(existing.is_featured || 0) : 0),
    is_published: isPub,
    published_at: pubAt
  };
}

async function saveAboutRevision(db, articleId, snap, summary, actorEmail) {
  try {
    const r = await db.prepare('SELECT COALESCE(MAX(revision_number), 0) AS m FROM about_article_revisions WHERE article_id = ?').bind(articleId).first();
    const nextNum = Number((r && r.m) || 0) + 1;
    await db.prepare(
      `INSERT INTO about_article_revisions (id, article_id, revision_number, change_summary, snapshot_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(`arev_${Date.now().toString(36)}_${randomHex(3)}`, articleId, nextNum, str(summary || 'Update', 240), JSON.stringify(snap), str(actorEmail, 120)).run();
  } catch {}
}

export async function handleAboutArticlesAdmin(request, env, actor, articleId, action) {
  const db = env.DB;
  await ensureAboutStudioSchema(db);
  await publishDueScheduledAboutArticles(db);
  const method = request.method;
  const url = new URL(request.url);

  if (articleId && action === 'preview-token' && method === 'POST') {
    const row = await db.prepare('SELECT id, slug FROM about_articles WHERE id = ?').bind(articleId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Institutional page not found');
    const token = randomHex(20);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await db.prepare("UPDATE about_articles SET preview_token = ?, preview_expires_at = ?, updated_at = datetime('now') WHERE id = ?").bind(token, expiresAt, articleId).run();
    await audit(env, request, actor, 'about_article.preview_token', 'about_articles', articleId, { slug: row.slug });
    return json({
      ok: true, id: articleId, slug: row.slug, preview_token: token, preview_expires_at: expiresAt,
      preview_url: `/about/?slug=${encodeURIComponent(row.slug)}&preview_token=${encodeURIComponent(token)}`
    }, 200, NO_STORE);
  }

  if (articleId && action === 'revisions' && method === 'GET') {
    const { results } = await db.prepare('SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM about_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 25').bind(articleId).all().catch(() => ({ results: [] }));
    return json({ ok: true, items: results || [] }, 200, NO_STORE);
  }

  if (articleId && action === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const rev = await db.prepare('SELECT * FROM about_article_revisions WHERE id = ? AND article_id = ?').bind(str(body.revision_id, 80), articleId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const snap = parseJson(rev.snapshot_json, null);
    const existing = await db.prepare('SELECT * FROM about_articles WHERE id = ?').bind(articleId).first();
    if (!snap || !existing) throw new HttpError(400, 'BAD_SNAPSHOT', 'Invalid revision snapshot');
    const data = normalizeAboutPayload(snap, existing);
    await db.prepare(
      `UPDATE about_articles SET title_en = ?, title_or = ?, subtitle_en = ?, subtitle_or = ?, summary_en = ?, summary_or = ?,
        article_body_en = ?, article_body_or = ?, highlights_table_json = ?, verification_steps_json = ?, impact_metrics_json = ?, faq_items_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.summary_en, data.summary_or, data.article_body_en, data.article_body_or, data.highlights_table_json, data.verification_steps_json, data.impact_metrics_json, data.faq_items_json, articleId).run();
    const updated = await db.prepare('SELECT * FROM about_articles WHERE id = ?').bind(articleId).first();
    await saveAboutRevision(db, articleId, updated, `Rolled back to revision #${rev.revision_number}`, actor.email);
    await audit(env, request, actor, 'about_article.rollback', 'about_articles', articleId, { revision_number: rev.revision_number });
    await invalidateAboutCaches(request, updated.slug);
    const { map: taxMap } = await loadTaxonomyMap(db);
    const res = json({ ok: true, item: formatAboutArticle(updated, taxMap, true) }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (!articleId && method === 'GET') {
    const l1 = str(url.searchParams.get('l1'), 80);
    const l2 = str(url.searchParams.get('l2'), 80);
    const l3 = str(url.searchParams.get('l3'), 80);
    const type = str(url.searchParams.get('type'), 60).toLowerCase();
    const status = str(url.searchParams.get('status'), 24).toLowerCase();
    const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();

    const [{ map: taxMap }, { results: rows }, srcCount, inqCount] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT * FROM about_articles ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] })),
      db.prepare('SELECT COUNT(*) AS n FROM about_official_sources WHERE is_published = 1').first().catch(() => ({ n: 0 })),
      db.prepare("SELECT COUNT(*) AS n FROM about_public_inquiries WHERE status = 'open'").first().catch(() => ({ n: 0 }))
    ]);

    const all = (rows || []).map(r => formatAboutArticle(r, taxMap, true));
    const kpis = {
      total_pages: all.length,
      published_live: all.filter(a => a.is_published).length,
      scheduled_drafts: all.filter(a => !a.is_published).length,
      verified_portals: Number((srcCount && srcCount.n) || 0),
      open_inquiries: Number((inqCount && inqCount.n) || 0)
    };

    const filtered = all.filter(a => {
      if (l1 && a.category_l1_id !== l1) return false;
      if (l2 && a.category_l2_id !== l2) return false;
      if (l3 && a.category_l3_id !== l3) return false;
      if (type && a.doc_type_badge.toLowerCase() !== type) return false;
      if (status && a.status !== status) return false;
      if (search) {
        const hay = `${a.title_en} ${a.title_or} ${a.person_role_en} ${a.summary_en} ${a.slug}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    return json({ ok: true, kpis, items: filtered, total: filtered.length }, 200, NO_STORE);
  }

  if (!articleId && method === 'POST') {
    const body = await readJson(request, 240000);
    const data = normalizeAboutPayload(body, null);
    let finalSlug = data.slug;
    const conflict = await db.prepare('SELECT id FROM about_articles WHERE slug = ?').bind(finalSlug).first().catch(() => null);
    if (conflict) finalSlug = `${finalSlug}-${randomHex(2)}`;
    const id = `aart_${Date.now().toString(36)}_${randomHex(4)}`;

    await db.prepare(
      `INSERT INTO about_articles (
        id, slug, category_l1_id, category_l2_id, category_l3_id, doc_type_badge,
        title_en, title_or, subtitle_en, subtitle_or, summary_en, summary_or,
        person_role_en, person_role_or, person_credentials, person_district, effective_date,
        cover_image_url, cover_image_caption, article_body_en, article_body_or,
        highlights_table_json, verification_steps_json, impact_metrics_json, faq_items_json,
        reference_links_json, charter_pdf_url, press_kit_pdf_url, pdf_index_bookmarks_json, extra_attachments_json,
        revision_note_en, revision_note_or, scheduled_publish_at, is_featured, is_published, published_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )`
    ).bind(
      id, finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id, data.doc_type_badge,
      data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.summary_en, data.summary_or,
      data.person_role_en, data.person_role_or, data.person_credentials, data.person_district, data.effective_date,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.highlights_table_json, data.verification_steps_json, data.impact_metrics_json, data.faq_items_json,
      data.reference_links_json, data.charter_pdf_url, data.press_kit_pdf_url, data.pdf_index_bookmarks_json, data.extra_attachments_json,
      data.revision_note_en, data.revision_note_or, data.scheduled_publish_at, data.is_featured, data.is_published, data.published_at
    ).run();

    const row = await db.prepare('SELECT * FROM about_articles WHERE id = ?').bind(id).first();
    await saveAboutRevision(db, id, row || data, 'Initial creation', actor.email);
    await audit(env, request, actor, 'about_article.create', 'about_articles', id, { slug: finalSlug, is_published: data.is_published });
    await invalidateAboutCaches(request, finalSlug);
    const { map: taxMap } = await loadTaxonomyMap(db);
    const res = json({ ok: true, item: formatAboutArticle(row, taxMap, true) }, 201, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (articleId && !action && method === 'GET') {
    const row = await db.prepare('SELECT * FROM about_articles WHERE id = ?').bind(articleId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Institutional page not found');
    const [{ map: taxMap }, revRes] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM about_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 20').bind(articleId).all().catch(() => ({ results: [] }))
    ]);
    return json({ ok: true, item: formatAboutArticle(row, taxMap, true), revisions: revRes.results || [] }, 200, NO_STORE);
  }

  if (articleId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM about_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Institutional page not found');
    const body = await readJson(request, 240000);
    const data = normalizeAboutPayload(body, existing);
    await db.prepare(
      `UPDATE about_articles SET
        slug = ?, category_l1_id = ?, category_l2_id = ?, category_l3_id = ?, doc_type_badge = ?,
        title_en = ?, title_or = ?, subtitle_en = ?, subtitle_or = ?, summary_en = ?, summary_or = ?,
        person_role_en = ?, person_role_or = ?, person_credentials = ?, person_district = ?, effective_date = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        highlights_table_json = ?, verification_steps_json = ?, impact_metrics_json = ?, faq_items_json = ?,
        reference_links_json = ?, charter_pdf_url = ?, press_kit_pdf_url = ?, pdf_index_bookmarks_json = ?, extra_attachments_json = ?,
        revision_note_en = ?, revision_note_or = ?, scheduled_publish_at = ?, is_featured = ?, is_published = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      data.slug, data.category_l1_id, data.category_l2_id, data.category_l3_id, data.doc_type_badge,
      data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.summary_en, data.summary_or,
      data.person_role_en, data.person_role_or, data.person_credentials, data.person_district, data.effective_date,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.highlights_table_json, data.verification_steps_json, data.impact_metrics_json, data.faq_items_json,
      data.reference_links_json, data.charter_pdf_url, data.press_kit_pdf_url, data.pdf_index_bookmarks_json, data.extra_attachments_json,
      data.revision_note_en, data.revision_note_or, data.scheduled_publish_at, data.is_featured, data.is_published, data.published_at, articleId
    ).run();

    const row = await db.prepare('SELECT * FROM about_articles WHERE id = ?').bind(articleId).first();
    await saveAboutRevision(db, articleId, row || data, body.change_summary || 'Editorial update', actor.email);
    await audit(env, request, actor, 'about_article.update', 'about_articles', articleId, { slug: data.slug, is_published: data.is_published });
    await invalidateAboutCaches(request, data.slug);
    const { map: taxMap } = await loadTaxonomyMap(db);
    const res = json({ ok: true, item: formatAboutArticle(row, taxMap, true) }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (articleId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT id, slug FROM about_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Institutional page not found');
    await db.prepare('DELETE FROM about_article_revisions WHERE article_id = ?').bind(articleId).run().catch(() => {});
    await db.prepare('DELETE FROM about_articles WHERE id = ?').bind(articleId).run();
    await audit(env, request, actor, 'about_article.delete', 'about_articles', articleId, { slug: existing.slug });
    await invalidateAboutCaches(request, existing.slug);
    const res = json({ ok: true, deleted: articleId }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown about articles route');
}

// ============================================================================
// ADMIN: VERIFIED OFFICIAL PORTALS REGISTRY (/api/admin/about/sources)
// ============================================================================
export async function handleAboutSourcesAdmin(request, env, actor, sourceId) {
  const db = env.DB;
  await ensureAboutStudioSchema(db);
  const method = request.method;

  if (!sourceId && method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM about_official_sources ORDER BY sort_order ASC, authority_name_en ASC').all().catch(() => ({ results: [] }));
    return json({ ok: true, items: results || [] }, 200, NO_STORE);
  }

  if (!sourceId && method === 'POST') {
    const body = await readJson(request, 20000);
    const nameEn = str(body.authority_name_en, 180);
    const officialUrl = safeHref(body.official_url);
    if (!nameEn || !officialUrl) throw validationError({ authority_name_en: 'Authority name and valid https:// URL are required.' });
    const id = `asrc_${Date.now().toString(36)}_${randomHex(3)}`;
    const sector = OFFICIAL_SOURCE_SECTORS.includes(body.sector) ? body.sector : str(body.sector || 'Odisha State', 60);
    const domainBadge = /\.nic\.in/i.test(officialUrl) ? '.nic.in' : (/\.gov\.in/i.test(officialUrl) ? '.gov.in' : str(body.domain_badge || 'Official', 24));

    await db.prepare(
      `INSERT INTO about_official_sources (id, sector, authority_name_en, authority_name_or, official_url, domain_badge, purpose_en, purpose_or, helpline_info, sort_order, is_verified, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, sector, nameEn, str(body.authority_name_or, 180), officialUrl, domainBadge, str(body.purpose_en, 320), str(body.purpose_or, 320), str(body.helpline_info, 120), intOrZero(body.sort_order, 0, 10000) || 100, boolInt(body.is_verified, 1), boolInt(body.is_published, 1)).run();

    const row = await db.prepare('SELECT * FROM about_official_sources WHERE id = ?').bind(id).first();
    await audit(env, request, actor, 'about_source.create', 'about_official_sources', id, { authority_name_en: nameEn, official_url: officialUrl });
    await invalidateAboutCaches(request);
    const res = json({ ok: true, item: row }, 201, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (sourceId && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM about_official_sources WHERE id = ?').bind(sourceId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Official source not found');
    const body = await readJson(request, 20000);
    await db.prepare(
      `UPDATE about_official_sources SET sector = ?, authority_name_en = ?, authority_name_or = ?, official_url = ?, domain_badge = ?,
        purpose_en = ?, purpose_or = ?, helpline_info = ?, sort_order = ?, is_verified = ?, is_published = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.sector !== undefined ? str(body.sector, 60) : existing.sector,
      body.authority_name_en !== undefined ? str(body.authority_name_en, 180) : existing.authority_name_en,
      body.authority_name_or !== undefined ? str(body.authority_name_or, 180) : existing.authority_name_or,
      body.official_url !== undefined ? (safeHref(body.official_url) || existing.official_url) : existing.official_url,
      body.domain_badge !== undefined ? str(body.domain_badge, 24) : existing.domain_badge,
      body.purpose_en !== undefined ? str(body.purpose_en, 320) : existing.purpose_en,
      body.purpose_or !== undefined ? str(body.purpose_or, 320) : existing.purpose_or,
      body.helpline_info !== undefined ? str(body.helpline_info, 120) : existing.helpline_info,
      body.sort_order !== undefined ? intOrZero(body.sort_order, 0, 10000) : existing.sort_order,
      body.is_verified !== undefined ? boolInt(body.is_verified, 1) : existing.is_verified,
      body.is_published !== undefined ? boolInt(body.is_published, 1) : existing.is_published,
      sourceId
    ).run();

    const updated = await db.prepare('SELECT * FROM about_official_sources WHERE id = ?').bind(sourceId).first();
    await audit(env, request, actor, 'about_source.update', 'about_official_sources', sourceId, {});
    await invalidateAboutCaches(request);
    const res = json({ ok: true, item: updated }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (sourceId && method === 'DELETE') {
    await db.prepare('DELETE FROM about_official_sources WHERE id = ?').bind(sourceId).run();
    await audit(env, request, actor, 'about_source.delete', 'about_official_sources', sourceId, {});
    await invalidateAboutCaches(request);
    const res = json({ ok: true, deleted: sourceId }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown about sources route');
}

// ============================================================================
// ADMIN: PUBLIC INQUIRIES, PARTNERSHIPS & GRIEVANCE INBOX (/api/admin/about/inquiries)
// ============================================================================
export async function handleAboutInquiriesAdmin(request, env, actor, inquiryId) {
  const db = env.DB;
  await ensureAboutStudioSchema(db);
  const method = request.method;
  const url = new URL(request.url);

  if (!inquiryId && method === 'GET') {
    const st = str(url.searchParams.get('status'), 24).toLowerCase();
    const { results } = await db.prepare('SELECT * FROM about_public_inquiries ORDER BY created_at DESC LIMIT 200').all().catch(() => ({ results: [] }));
    const all = results || [];
    const filtered = st && st !== 'all' ? all.filter(i => i.status === st) : all;
    return json({
      ok: true,
      counts: {
        open: all.filter(i => i.status === 'open').length,
        replied: all.filter(i => i.status === 'replied').length,
        resolved: all.filter(i => i.status === 'resolved').length,
        archived: all.filter(i => i.status === 'archived').length
      },
      items: filtered
    }, 200, NO_STORE);
  }

  if (inquiryId && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM about_public_inquiries WHERE id = ?').bind(inquiryId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Inquiry not found');
    const body = await readJson(request, 20000);
    const reply = body.admin_reply !== undefined ? str(body.admin_reply, 2000) : existing.admin_reply;
    const nextStatus = INQUIRY_STATUSES.includes(body.status) ? body.status : (reply ? 'replied' : existing.status);
    const resolvedAt = (nextStatus === 'resolved' || nextStatus === 'archived') ? nowIsoSql() : existing.resolved_at;
    await db.prepare('UPDATE about_public_inquiries SET admin_reply = ?, status = ?, resolved_at = ? WHERE id = ?').bind(reply, nextStatus, resolvedAt, inquiryId).run();
    const updated = await db.prepare('SELECT * FROM about_public_inquiries WHERE id = ?').bind(inquiryId).first();
    await audit(env, request, actor, 'about_inquiry.update', 'about_public_inquiries', inquiryId, { status: nextStatus });
    await invalidateAboutCaches(request);
    const res = json({ ok: true, item: updated }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (inquiryId && method === 'DELETE') {
    await db.prepare('DELETE FROM about_public_inquiries WHERE id = ?').bind(inquiryId).run();
    await audit(env, request, actor, 'about_inquiry.delete', 'about_public_inquiries', inquiryId, {});
    await invalidateAboutCaches(request);
    const res = json({ ok: true, deleted: inquiryId }, 200, NO_STORE);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown about inquiries route');
}

// ============================================================================
// PUBLIC ENDPOINTS (ALWAYS Cache-Control: no-store, max-age=0)
// ============================================================================
const BOOTSTRAP_EDGE_CACHE = 'public, max-age=15, s-maxage=300, stale-while-revalidate=60';

export async function handlePublicAboutBootstrapApi(request, env) {
  if (!env || !env.DB) {
    return json({ ok: false, tree: [], nodes: [], pages: [], items: [], sources: [], sectors: OFFICIAL_SOURCE_SECTORS, transparency: {}, kpis: {} }, 200, NO_STORE);
  }
  await ensureAboutStudioSchema(env.DB);
  await publishDueScheduledAboutArticles(env.DB);

  const url = new URL(request.url);
  const bypass = url.searchParams.has('refresh') || url.searchParams.has('_cb');

  const coreBatch = await env.DB.batch([
    env.DB.prepare('SELECT * FROM about_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC'),
    env.DB.prepare('SELECT * FROM about_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC'),
    env.DB.prepare('SELECT * FROM about_official_sources WHERE is_published = 1 ORDER BY sort_order ASC, authority_name_en ASC')
  ]).catch(() => [{ results: [] }, { results: [] }, { results: [] }]);

  const rawNodes = (coreBatch[0] && coreBatch[0].results) || [];
  const rawPages = (coreBatch[1] && coreBatch[1].results) || [];
  const sources = (coreBatch[2] && coreBatch[2].results) || [];

  const safeCount = async (sql) => {
    try { const r = await env.DB.prepare(sql).first(); return Number((r && r.n) || 0); } catch { return 0; }
  };
  let jobsCount = 0; let schemesCount = 0; let studyCount = 0; let commMembersCount = 0;
  try {
    const kpiBatch = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS n FROM job_articles WHERE is_published = 1'),
      env.DB.prepare('SELECT COUNT(*) AS n FROM scheme_articles WHERE is_published = 1'),
      env.DB.prepare('SELECT COUNT(*) AS n FROM study_articles WHERE is_published = 1'),
      env.DB.prepare('SELECT COUNT(*) AS n FROM users')
    ]);
    jobsCount = Number((kpiBatch[0] && kpiBatch[0].results && kpiBatch[0].results[0] && kpiBatch[0].results[0].n) || 0);
    schemesCount = Number((kpiBatch[1] && kpiBatch[1].results && kpiBatch[1].results[0] && kpiBatch[1].results[0].n) || 0);
    studyCount = Number((kpiBatch[2] && kpiBatch[2].results && kpiBatch[2].results[0] && kpiBatch[2].results[0].n) || 0);
    commMembersCount = Number((kpiBatch[3] && kpiBatch[3].results && kpiBatch[3].results[0] && kpiBatch[3].results[0].n) || 0);
  } catch {
    [jobsCount, schemesCount, studyCount, commMembersCount] = await Promise.all([
      safeCount('SELECT COUNT(*) AS n FROM job_articles WHERE is_published = 1'),
      safeCount('SELECT COUNT(*) AS n FROM scheme_articles WHERE is_published = 1'),
      safeCount('SELECT COUNT(*) AS n FROM study_articles WHERE is_published = 1'),
      safeCount('SELECT COUNT(*) AS n FROM users')
    ]);
  }
  const portalsCount = sources.filter(s => Boolean(s.is_verified)).length || sources.length;

  const taxMap = new Map();
  const nodes = rawNodes.map(r => {
    const n = formatTaxNode(r);
    taxMap.set(n.id, n);
    return n;
  });
  const pages = rawPages.map(r => formatAboutArticle(r, taxMap, false));
  const transparency = {
    verified_jobs: jobsCount,
    active_schemes: schemesCount,
    study_modules: studyCount,
    community_members: commMembersCount,
    verified_portals: portalsCount
  };

  return json({
    ok: true,
    nodes,
    tree: buildTaxonomyTree(nodes),
    total: pages.length,
    pages,
    items: pages,
    sources,
    sectors: OFFICIAL_SOURCE_SECTORS,
    transparency,
    kpis: transparency
  }, 200, { 'Cache-Control': bypass ? 'no-store, max-age=0' : BOOTSTRAP_EDGE_CACHE });
}

export async function handlePublicAboutTreeApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, tree: [], nodes: [], transparency: {} }, 200, NO_STORE);
  await ensureAboutStudioSchema(env.DB);
  await publishDueScheduledAboutArticles(env.DB);

  const safeCount = async (sql) => {
    try { const r = await env.DB.prepare(sql).first(); return Number((r && r.n) || 0); } catch { return 0; }
  };

  const [{ results: rawNodes }, jobsCount, schemesCount, studyCount, commMembersCount, portalsCount] = await Promise.all([
    env.DB.prepare('SELECT * FROM about_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] })),
    safeCount('SELECT COUNT(*) AS n FROM job_articles WHERE is_published = 1'),
    safeCount('SELECT COUNT(*) AS n FROM scheme_articles WHERE is_published = 1'),
    safeCount('SELECT COUNT(*) AS n FROM study_articles WHERE is_published = 1'),
    safeCount('SELECT COUNT(*) AS n FROM users'),
    safeCount('SELECT COUNT(*) AS n FROM about_official_sources WHERE is_published = 1 AND is_verified = 1')
  ]);

  const nodes = (rawNodes || []).map(formatTaxNode);
  return json({
    ok: true,
    nodes,
    tree: buildTaxonomyTree(nodes),
    transparency: {
      verified_jobs: jobsCount,
      active_schemes: schemesCount,
      study_modules: studyCount,
      community_members: commMembersCount,
      verified_portals: portalsCount
    }
  }, 200, NO_STORE);
}

export async function handlePublicAboutPagesApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, items: [], total: 0 }, 200, NO_STORE);
  await ensureAboutStudioSchema(env.DB);
  await publishDueScheduledAboutArticles(env.DB);
  const url = new URL(request.url);
  const l1 = str(url.searchParams.get('l1'), 80);
  const l2 = str(url.searchParams.get('l2'), 80);
  const l3 = str(url.searchParams.get('l3'), 80);
  const type = str(url.searchParams.get('type'), 60).toLowerCase();
  const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();

  const [{ map: taxMap }, { results }] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare('SELECT * FROM about_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] }))
  ]);

  const all = (results || []).map(r => formatAboutArticle(r, taxMap, false));
  const filtered = all.filter(a => {
    if (l1 && a.category_l1_id !== l1 && (!a.taxonomy.l1 || a.taxonomy.l1.slug !== l1)) return false;
    if (l2 && a.category_l2_id !== l2 && (!a.taxonomy.l2 || a.taxonomy.l2.slug !== l2)) return false;
    if (l3 && a.category_l3_id !== l3 && (!a.taxonomy.l3 || a.taxonomy.l3.slug !== l3)) return false;
    if (type && a.doc_type_badge.toLowerCase() !== type) return false;
    if (search) {
      const hay = `${a.title_en} ${a.title_or} ${a.summary_en} ${a.person_role_en} ${a.doc_type_badge}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  return json({ ok: true, total: filtered.length, items: filtered }, 200, NO_STORE);
}

export async function handlePublicAboutArticleApi(request, env) {
  if (!env || !env.DB) return json({ error: 'Database unavailable' }, 500, NO_STORE);
  await ensureAboutStudioSchema(env.DB);
  await publishDueScheduledAboutArticles(env.DB);
  const url = new URL(request.url);
  const slug = str(url.searchParams.get('slug'), 160);
  const previewToken = str(url.searchParams.get('preview_token'), 160);
  if (!slug) return json({ error: 'slug query parameter is required' }, 400, NO_STORE);

  const row = await env.DB.prepare('SELECT * FROM about_articles WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Institutional page not found' }, 404, NO_STORE);

  let isPreview = false;
  let previewExpiresAt = '';
  if (!row.is_published) {
    let authorized = false;
    if (previewToken && row.preview_token && constantTimeEqual(previewToken, row.preview_token)) {
      const exp = Date.parse(String(row.preview_expires_at || ''));
      if (Number.isFinite(exp) && exp > Date.now()) {
        authorized = true;
        previewExpiresAt = String(row.preview_expires_at || '');
      }
    }
    if (!authorized) {
      const actor = await getActor(request, env).catch(() => null);
      if (actor && STAFF_ROLES.includes(actor.role)) {
        authorized = true;
        previewExpiresAt = String(row.preview_expires_at || new Date(Date.now() + 2 * 3600 * 1000).toISOString());
      }
    }
    if (!authorized) return json({ error: 'Institutional page not found or preview link expired' }, 404, NO_STORE);
    isPreview = true;
  }

  const { map: taxMap } = await loadTaxonomyMap(env.DB);
  return json({
    ok: true,
    is_preview: isPreview,
    preview_expires_at: previewExpiresAt,
    article: formatAboutArticle(row, taxMap, false)
  }, 200, NO_STORE);
}

export async function handlePublicAboutSourcesApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, items: [] }, 200, NO_STORE);
  await ensureAboutStudioSchema(env.DB);
  const url = new URL(request.url);
  const sector = str(url.searchParams.get('sector'), 60).toLowerCase();
  const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();
  const { results } = await env.DB.prepare('SELECT * FROM about_official_sources WHERE is_published = 1 ORDER BY sort_order ASC, authority_name_en ASC').all().catch(() => ({ results: [] }));
  const items = (results || []).filter(r => {
    if (sector && String(r.sector || '').toLowerCase() !== sector) return false;
    if (search) {
      const hay = `${r.authority_name_en} ${r.authority_name_or} ${r.official_url} ${r.purpose_en} ${r.sector}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
  return json({ ok: true, total: items.length, sectors: OFFICIAL_SOURCE_SECTORS, items }, 200, NO_STORE);
}

export async function handlePublicAboutInquiriesApi(request, env) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureAboutStudioSchema(env.DB);
  try {
    await rateLimit(env, `about-inq:${clientIp(request)}`, 10, 600);
  } catch {
    return json({ ok: false, error: 'Too many submissions. Please wait a few minutes.' }, 429, NO_STORE);
  }
  const body = await readJson(request, 12000);
  const senderName = str(body.sender_name, 120);
  const subjectText = str(body.subject_text, 200);
  const messageText = str(body.message_text, 3000);
  if (!senderName || senderName.length < 2) throw validationError({ sender_name: 'Please enter your name.' });
  if (!subjectText || subjectText.length < 4) throw validationError({ subject_text: 'Please enter a subject.' });
  if (!messageText || messageText.length < 10) throw validationError({ message_text: 'Please describe your inquiry (min 10 characters).' });

  const inqType = INQUIRY_TYPES.includes(body.inquiry_type) ? body.inquiry_type : 'general_inquiry';
  const id = `ainq_${Date.now().toString(36)}_${randomHex(4)}`;
  await env.DB.prepare(
    `INSERT INTO about_public_inquiries (id, inquiry_type, sender_name, sender_email, sender_phone, district, subject_text, message_text, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))`
  ).bind(id, inqType, senderName, str(body.sender_email, 140), str(body.sender_phone, 24), str(body.district, 80), subjectText, messageText).run();

  return json({ ok: true, id, status: 'open' }, 201, NO_STORE);
}

export async function handlePublicAboutTelemetryApi(request, env) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env || !env.DB) return json({ ok: false }, 200, NO_STORE);
  await ensureAboutStudioSchema(env.DB);
  const body = await readJson(request, 4000).catch(() => ({}));
  const event = str(body.event, 32).toLowerCase();
  const id = str(body.id, 80);
  const slug = str(body.slug, 160);
  const col = event === 'pdf_download' ? 'pdf_downloads_count' : (event === 'view' ? 'views_count' : '');
  if (!col || (!id && !slug)) return json({ ok: false }, 400, NO_STORE);
  if (id) await env.DB.prepare(`UPDATE about_articles SET ${col} = ${col} + 1 WHERE id = ?`).bind(id).run();
  else await env.DB.prepare(`UPDATE about_articles SET ${col} = ${col} + 1 WHERE slug = ?`).bind(slug).run();
  return json({ ok: true, event }, 200, NO_STORE);
}
