// Categories & Navigation Batch 1 (v84): Modules 01-04
// 01 Master Categories | 02 Subcategories | 03 Tags & Taxonomies | 04 Header Navigation
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';

export const NAV_STATUSES = ['draft', 'published', 'archived'];
export const NAV_PORTALS = ['all', 'study-library', 'jobs-careers', 'schemes', 'community', 'about'];
export const TAXONOMY_GROUPS = ['exam_body', 'subject', 'class_stage', 'scheme_type', 'district_odisha', 'general'];
export const MENU_LOCATIONS = ['header', 'mega_menu', 'footer', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_library', 'sidebar_community'];
export const VISIBILITY_RULES = ['all', 'logged_in', 'logged_out'];
export const HIGHLIGHT_STYLES = ['default', 'pill', 'accent'];

const _navReady = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function validateSafeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/') || s.startsWith('#')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

async function saveNavRevision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM nav_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  await db.prepare(
    `INSERT INTO nav_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || '', 200), cleanStr(actorEmail || 'system', 120)).run();
}

const STARTER_CATEGORIES = [
  { id: 'ncat-study-library', parent_id: null, slug: 'study-library', code: 'LIB', name_en: 'Study Library', name_or: 'ଅଧ୍ୟୟନ ପାଠାଗାର', description_en: 'Notes, textbooks, PYQs, and mock tests for Odisha learners.', target_portal: 'study-library', landing_url: '/study-library/', icon_key: 'book', sort_order: 1, featured: 1, status: 'published' },
  { id: 'ncat-jobs-careers', parent_id: null, slug: 'jobs-careers', code: 'JOB', name_en: 'Jobs & Careers', name_or: 'ଚାକିରି ଏବଂ କ୍ୟାରିୟର୍', description_en: 'OPSC, OSSC, OSSSC recruitments, admit cards, and career roadmaps.', target_portal: 'jobs-careers', landing_url: '/jobs-careers/', icon_key: 'briefcase', sort_order: 2, featured: 1, status: 'published' },
  { id: 'ncat-schemes', parent_id: null, slug: 'schemes', code: 'SCH', name_en: 'Schemes & Benefits', name_or: 'ସରକାରୀ ଯୋଜନା', description_en: 'Odisha State & Central Govt welfare and scholarship schemes.', target_portal: 'schemes', landing_url: '/schemes/', icon_key: 'landmark', sort_order: 3, featured: 1, status: 'published' },
  { id: 'ncat-community', parent_id: null, slug: 'community', code: 'COM', name_en: 'Community', name_or: 'ସମୁଦାୟ', description_en: 'Peer discussions, study groups, and mentor Q&A.', target_portal: 'community', landing_url: '/community/', icon_key: 'users', sort_order: 4, featured: 0, status: 'published' },
  { id: 'nsub-odisha-gk', parent_id: 'ncat-study-library', slug: 'odisha-gk-history', code: 'OGK', name_en: 'Odisha GK & History', name_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ', description_en: 'Districts, heritage, freedom struggle, and current affairs.', target_portal: 'study-library', landing_url: '/study-library/?cat=odisha-gk', icon_key: 'map', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-opsc-ossc', parent_id: 'ncat-jobs-careers', slug: 'opsc-ossc-osssc-exams', code: 'OPSC', name_en: 'OPSC / OSSC / OSSSC', name_or: 'OPSC / OSSC / OSSSC ପରୀକ୍ଷା', description_en: 'State civil services, CGL, RI, ARI, and Amin notifications.', target_portal: 'jobs-careers', landing_url: '/jobs-careers/?body=opsc', icon_key: 'award', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-scholarships', parent_id: 'ncat-schemes', slug: 'student-scholarships', code: 'SCL', name_en: 'Student Scholarships', name_or: 'ଛାତ୍ରବୃତ୍ତି', description_en: 'State Scholarship Portal, Gopabandhu, and NSP schemes.', target_portal: 'schemes', landing_url: '/schemes/?type=scholarship', icon_key: 'graduation', sort_order: 3, featured: 1, status: 'published' }
];

const STARTER_TAGS = [
  { id: 'ntag-opsc', slug: 'opsc', canonical_tag: 'opsc', label_en: 'OPSC', label_or: 'OPSC', taxonomy_group: 'exam_body', synonyms_json: JSON.stringify(['opsc-oas', 'odisha-public-service']), usage_count: 24, featured: 1, status: 'published' },
  { id: 'ntag-ossc', slug: 'ossc', canonical_tag: 'ossc', label_en: 'OSSC', label_or: 'OSSC', taxonomy_group: 'exam_body', synonyms_json: JSON.stringify(['ossc-cgl']), usage_count: 19, featured: 1, status: 'published' },
  { id: 'ntag-odisha-gk', slug: 'odisha-gk', canonical_tag: 'odisha-gk', label_en: 'Odisha GK', label_or: 'ଓଡ଼ିଶା GK', taxonomy_group: 'subject', synonyms_json: JSON.stringify(['odisha-general-knowledge']), usage_count: 32, featured: 1, status: 'published' },
  { id: 'ntag-khordha', slug: 'khordha', canonical_tag: 'khordha', label_en: 'Khordha', label_or: 'ଖୋର୍ଦ୍ଧା', taxonomy_group: 'district_odisha', synonyms_json: JSON.stringify(['khurda']), usage_count: 11, featured: 0, status: 'published' }
];

const STARTER_HEADER_ITEMS = [
  { id: 'nmenu-home', menu_location: 'header', label_en: 'Home', label_or: 'ମୂଳପୃଷ୍ଠା', url: '/', icon_key: '🏠', badge_text_en: '', highlight_style: 'default', sort_order: 1, status: 'published' },
  { id: 'nmenu-library', menu_location: 'header', label_en: 'Study Library', label_or: 'ଅଧ୍ୟୟନ ପାଠାଗାର', url: '/study-library/', icon_key: '📚', badge_text_en: '', highlight_style: 'default', sort_order: 2, status: 'published' },
  { id: 'nmenu-jobs', menu_location: 'header', label_en: 'Jobs & Careers', label_or: 'ଚାକିରି', url: '/jobs-careers/', icon_key: '💼', badge_text_en: 'LIVE', highlight_style: 'pill', sort_order: 3, status: 'published' },
  { id: 'nmenu-schemes', menu_location: 'header', label_en: 'Schemes & Benefits', label_or: 'ଯୋଜନା', url: '/schemes/', icon_key: '🏛️', badge_text_en: '', highlight_style: 'default', sort_order: 4, status: 'published' },
  { id: 'nmenu-community', menu_location: 'header', label_en: 'Community', label_or: 'ସମୁଦାୟ', url: '/community/', icon_key: '💬', badge_text_en: '', highlight_style: 'default', sort_order: 5, status: 'published' },
  { id: 'nmenu-student', menu_location: 'header', label_en: 'Student Hub', label_or: 'ଛାତ୍ର ହବ୍', url: '/student/', icon_key: '🎓', badge_text_en: 'NEW', highlight_style: 'accent', sort_order: 6, status: 'published' },
  { id: 'nmenu-about', menu_location: 'header', label_en: 'About', label_or: 'ଆମ ବିଷୟରେ', url: '/about/', icon_key: 'ℹ️', badge_text_en: '', highlight_style: 'default', sort_order: 7, status: 'published' }
];

export async function ensureCategoriesNavBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_navReady.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS nav_categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL DEFAULT '',
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      icon_key TEXT NOT NULL DEFAULT 'folder',
      color_token TEXT NOT NULL DEFAULT 'teal',
      target_portal TEXT NOT NULL DEFAULT 'all' CHECK (target_portal IN (
        'all', 'study-library', 'jobs-careers', 'schemes', 'community', 'about'
      )),
      landing_url TEXT NOT NULL DEFAULT '',
      seo_title_en TEXT NOT NULL DEFAULT '',
      seo_title_or TEXT NOT NULL DEFAULT '',
      item_count_cached INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 10,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_cat_parent_status ON nav_categories(parent_id, status, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_nav_cat_portal ON nav_categories(target_portal, status)`,
    `CREATE TABLE IF NOT EXISTS nav_tags (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      canonical_tag TEXT NOT NULL UNIQUE,
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      taxonomy_group TEXT NOT NULL DEFAULT 'general' CHECK (taxonomy_group IN (
        'exam_body', 'subject', 'class_stage', 'scheme_type', 'district_odisha', 'general'
      )),
      synonyms_json TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_tags_group_status ON nav_tags(taxonomy_group, status, usage_count DESC)`,
    `CREATE TABLE IF NOT EXISTS nav_menu_items (
      id TEXT PRIMARY KEY,
      menu_location TEXT NOT NULL DEFAULT 'header' CHECK (menu_location IN (
        'header', 'mega_menu', 'footer', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_library', 'sidebar_community'
      )),
      parent_item_id TEXT,
      column_group TEXT NOT NULL DEFAULT '',
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      icon_key TEXT NOT NULL DEFAULT '',
      badge_text_en TEXT NOT NULL DEFAULT '',
      badge_text_or TEXT NOT NULL DEFAULT '',
      open_new_tab INTEGER NOT NULL DEFAULT 0,
      visibility_rule TEXT NOT NULL DEFAULT 'all' CHECK (visibility_rule IN ('all', 'logged_in', 'logged_out')),
      highlight_style TEXT NOT NULL DEFAULT 'default' CHECK (highlight_style IN ('default', 'pill', 'accent')),
      sort_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_menu_loc_status ON nav_menu_items(menu_location, status, sort_order)`,
    `CREATE TABLE IF NOT EXISTS nav_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_rev_entity ON nav_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  const catCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_categories`).first();
  if (!catCnt || Number(catCnt.n || 0) === 0) {
    for (const c of STARTER_CATEGORIES) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, target_portal, landing_url, icon_key, sort_order, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(c.id, c.parent_id, c.slug, c.code, c.name_en, c.name_or, c.description_en, c.target_portal, c.landing_url, c.icon_key, c.sort_order, c.featured, c.status).run();
    }
  }

  const tagCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_tags`).first();
  if (!tagCnt || Number(tagCnt.n || 0) === 0) {
    for (const t of STARTER_TAGS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_tags (id, slug, canonical_tag, label_en, label_or, taxonomy_group, synonyms_json, usage_count, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(t.id, t.slug, t.canonical_tag, t.label_en, t.label_or, t.taxonomy_group, t.synonyms_json, t.usage_count, t.featured, t.status).run();
    }
  }

  const menuCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_menu_items`).first();
  if (!menuCnt || Number(menuCnt.n || 0) === 0) {
    for (const m of STARTER_HEADER_ITEMS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, highlight_style, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(m.id, m.menu_location, m.label_en, m.label_or, m.url, m.icon_key, m.badge_text_en, m.highlight_style, m.sort_order, m.status).run();
    }
  }

  _navReady.add(db);
}

export async function getCategoriesNavOverview(env) {
  await ensureCategoriesNavBatch1Schema(env.DB);
  const [cats, tags, hdr] = await Promise.all([
    env.DB.prepare(`SELECT parent_id, name_or FROM nav_categories`).all(),
    env.DB.prepare(`SELECT label_or FROM nav_tags`).all(),
    env.DB.prepare(`SELECT label_or FROM nav_menu_items WHERE menu_location = 'header'`).all()
  ]);
  const cRows = cats.results || [];
  const tRows = tags.results || [];
  const hRows = hdr.results || [];
  const total = cRows.length + tRows.length + hRows.length;
  const bi = cRows.filter(r => r.name_or).length + tRows.filter(r => r.label_or).length + hRows.filter(r => r.label_or).length;

  return {
    master_categories: cRows.filter(r => !r.parent_id).length,
    subcategories: cRows.filter(r => Boolean(r.parent_id)).length,
    canonical_tags: tRows.length,
    header_links: hRows.length,
    bilingual_pct: total ? Math.round((bi / total) * 100) : 100
  };
}

// ---------- Modules 01 & 02: Master Categories & Subcategories ----------
function formatCat(row) {
  if (!row) return null;
  return { ...row, featured: Boolean(row.featured) };
}

async function handleCategories(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const level = url.searchParams.get('level') || '';
      const parentId = url.searchParams.get('parent_id') || '';
      const portal = url.searchParams.get('target_portal') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (level === 'master') where.push('parent_id IS NULL');
      else if (level === 'sub') where.push('parent_id IS NOT NULL');
      if (parentId) { where.push('parent_id = ?'); binds.push(parentId); }
      if (portal && NAV_PORTALS.includes(portal)) { where.push('target_portal = ?'); binds.push(portal); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(name_en LIKE ? ESCAPE '\\' OR name_or LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\')`); binds.push(l, l, l); }

      const { results } = await env.DB.prepare(`SELECT * FROM nav_categories WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const countSql = level === 'master' ? `SELECT status FROM nav_categories WHERE parent_id IS NULL`
        : level === 'sub' ? `SELECT status FROM nav_categories WHERE parent_id IS NOT NULL`
          : `SELECT status FROM nav_categories`;
      const { results: allRows } = await env.DB.prepare(countSql).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }

      const { results: masters } = await env.DB.prepare(`SELECT id, name_en, slug FROM nav_categories WHERE parent_id IS NULL ORDER BY sort_order ASC`).all();
      return json({ ok: true, items: (results || []).map(formatCat), counts, masters: masters || [] });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_categories SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      if (body.action === 'reorder' && Array.isArray(body.ordered_ids)) {
        for (let i = 0; i < body.ordered_ids.length; i++) {
          await env.DB.prepare(`UPDATE nav_categories SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i + 1, body.ordered_ids[i]).run();
        }
        return json({ ok: true, reordered: body.ordered_ids.length });
      }
      const name_en = cleanStr(body.name_en || '', 160);
      if (!name_en) throw validationError({ name_en: 'name_en is required' });
      const parent_id = body.parent_id ? cleanStr(body.parent_id, 100) : null;
      const portal = NAV_PORTALS.includes(body.target_portal) ? body.target_portal : 'all';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || name_en).slice(0, 90) || 'category';
      const dup = await env.DB.prepare(`SELECT id FROM nav_categories WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `${parent_id ? 'nsub' : 'ncat'}-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, description_or, icon_key, color_token, target_portal, landing_url, seo_title_en, seo_title_or, sort_order, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, parent_id, finalSlug, cleanStr(body.code || '', 24).toUpperCase(), name_en, cleanStr(body.name_or || '', 160),
        cleanStr(body.description_en || '', 500), cleanStr(body.description_or || '', 500),
        cleanStr(body.icon_key || 'folder', 40), cleanStr(body.color_token || 'teal', 30), portal,
        validateSafeUrl(body.landing_url || ''), cleanStr(body.seo_title_en || '', 160), cleanStr(body.seo_title_or || '', 160),
        Number(body.sort_order ?? 10), body.featured ? 1 : 0, status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, parent_id ? '02' : '01', newId, created, 'Created category', actor.email);
      await audit(env, request, actor, 'nav.category.create', 'nav_categories', newId);
      return json({ ok: true, item: formatCat(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Category not found');
  const modCode = existing.parent_id ? '02' : '01';

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = ? AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(modCode, id).all();
    return json({ ok: true, item: formatCat(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const portal = NAV_PORTALS.includes(body.target_portal) ? body.target_portal : existing.target_portal;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    const parentId = body.parent_id !== undefined ? (body.parent_id || null) : existing.parent_id;
    await env.DB.prepare(
      `UPDATE nav_categories SET parent_id = ?, code = ?, name_en = ?, name_or = ?, description_en = ?, description_or = ?, icon_key = ?, color_token = ?, target_portal = ?, landing_url = ?, seo_title_en = ?, seo_title_or = ?, sort_order = ?, featured = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      parentId, cleanStr(body.code ?? existing.code, 24).toUpperCase(),
      cleanStr(body.name_en ?? existing.name_en, 160), cleanStr(body.name_or ?? existing.name_or, 160),
      cleanStr(body.description_en ?? existing.description_en, 500), cleanStr(body.description_or ?? existing.description_or, 500),
      cleanStr(body.icon_key ?? existing.icon_key, 40), cleanStr(body.color_token ?? existing.color_token, 30),
      portal, validateSafeUrl(body.landing_url ?? existing.landing_url),
      cleanStr(body.seo_title_en ?? existing.seo_title_en, 160), cleanStr(body.seo_title_or ?? existing.seo_title_or, 160),
      Number(body.sort_order ?? existing.sort_order), body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, modCode, id, updated, body.change_note || 'Updated category', actor.email);
    return json({ ok: true, item: formatCat(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `${existing.parent_id ? 'nsub' : 'ncat'}-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, description_or, icon_key, color_token, target_portal, landing_url, seo_title_en, seo_title_or, sort_order, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft')`
      ).bind(cloneId, existing.parent_id, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.code, `${existing.name_en} (Copy)`, existing.name_or, existing.description_en, existing.description_or, existing.icon_key, existing.color_token, existing.target_portal, existing.landing_url, existing.seo_title_en, existing.seo_title_or, existing.sort_order).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatCat(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = ? AND entity_id = ?`).bind(body.revision_id, modCode, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_categories SET name_en = ?, name_or = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.name_en, snap.name_or || '', Number(snap.sort_order || 10), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCat(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_categories SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCat(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_categories WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 03: Tags & Taxonomies ----------
function formatTag(row) {
  if (!row) return null;
  return { ...row, featured: Boolean(row.featured), synonyms: parseJson(row.synonyms_json, []) };
}

async function handleTags(request, env, actor, id) {
  const method = request.method;
  if (id === 'merge' && method === 'POST') {
    const body = await readJson(request, 50_000);
    const sourceId = cleanStr(body.source_tag_id || '', 100);
    const targetId = cleanStr(body.target_tag_id || '', 100);
    if (!sourceId || !targetId || sourceId === targetId) throw validationError({ target_tag_id: 'Distinct source_tag_id and target_tag_id required' });
    const src = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(sourceId).first();
    const tgt = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(targetId).first();
    if (!src || !tgt) throw new HttpError(404, 'NOT_FOUND', 'Source or target tag not found');

    const srcSyns = parseJson(src.synonyms_json, []);
    const tgtSyns = parseJson(tgt.synonyms_json, []);
    const mergedSyns = [...new Set([...tgtSyns, src.canonical_tag, ...srcSyns].map(s => cleanStr(s, 48).toLowerCase()).filter(s => s && s !== tgt.canonical_tag))];
    const newUsage = Number(tgt.usage_count || 0) + Number(src.usage_count || 0);

    await env.DB.prepare(`UPDATE nav_tags SET synonyms_json = ?, usage_count = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(JSON.stringify(mergedSyns), newUsage, targetId).run();
    await env.DB.prepare(`DELETE FROM nav_tags WHERE id = ?`).bind(sourceId).run();

    // Best-effort sync across edu_resources if table exists
    try {
      const { results: eduRows } = await env.DB.prepare(`SELECT id, tags_json FROM edu_resources WHERE tags_json LIKE ? ESCAPE '\\'`).bind(`%${likeEscape(src.canonical_tag)}%`).all();
      for (const r of eduRows || []) {
        const arr = parseJson(r.tags_json, []).map(t => (t === src.canonical_tag ? tgt.canonical_tag : t));
        await env.DB.prepare(`UPDATE edu_resources SET tags_json = ? WHERE id = ?`).bind(JSON.stringify([...new Set(arr)]), r.id).run();
      }
    } catch {}

    await audit(env, request, actor, 'nav.tag.merge', 'nav_tags', targetId, { merged_from: src.canonical_tag });
    const updated = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(targetId).first();
    return json({ ok: true, item: formatTag(updated), merged_from: src.canonical_tag });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const grp = url.searchParams.get('taxonomy_group') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (grp && TAXONOMY_GROUPS.includes(grp)) { where.push('taxonomy_group = ?'); binds.push(grp); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(canonical_tag LIKE ? ESCAPE '\\' OR label_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_tags WHERE ${where.join(' AND ')} ORDER BY usage_count DESC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_tags`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatTag), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_tags SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const label_en = cleanStr(body.label_en || '', 120);
      const canonical = slugify(body.canonical_tag || label_en).slice(0, 60);
      if (!label_en || !canonical) throw validationError({ label_en: 'label_en is required' });
      const grp = TAXONOMY_GROUPS.includes(body.taxonomy_group) ? body.taxonomy_group : 'general';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const syns = Array.isArray(body.synonyms) ? body.synonyms.map(s => cleanStr(s, 48).toLowerCase()).filter(Boolean) : [];
      const newId = `ntag-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_tags (id, slug, canonical_tag, label_en, label_or, taxonomy_group, synonyms_json, usage_count, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, canonical, canonical, label_en, cleanStr(body.label_or || '', 120), grp, JSON.stringify(syns), Number(body.usage_count || 0), body.featured ? 1 : 0, status).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '03', newId, created, 'Created canonical tag', actor.email);
      return json({ ok: true, item: formatTag(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tag not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '03' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatTag(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const grp = TAXONOMY_GROUPS.includes(body.taxonomy_group) ? body.taxonomy_group : existing.taxonomy_group;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    const syns = body.synonyms !== undefined ? (Array.isArray(body.synonyms) ? body.synonyms : []) : parseJson(existing.synonyms_json, []);
    await env.DB.prepare(
      `UPDATE nav_tags SET label_en = ?, label_or = ?, taxonomy_group = ?, synonyms_json = ?, featured = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.label_en ?? existing.label_en, 120), cleanStr(body.label_or ?? existing.label_or, 120),
      grp, JSON.stringify(syns), body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '03', id, updated, body.change_note || 'Updated tag', actor.email);
    return json({ ok: true, item: formatTag(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '03' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_tags SET label_en = ?, synonyms_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.label_en, snap.synonyms_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatTag(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_tags SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatTag(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_tags WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 04: Header Navigation (and reusable nav_menu_items) ----------
function formatMenuItem(row) {
  if (!row) return null;
  return { ...row, open_new_tab: Boolean(row.open_new_tab) };
}

async function handleHeaderMenu(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [`menu_location = 'header'`]; const binds = [];
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(label_en LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_menu_items WHERE menu_location = 'header'`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatMenuItem), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_menu_items SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      if (body.action === 'reorder' && Array.isArray(body.ordered_ids)) {
        for (let i = 0; i < body.ordered_ids.length; i++) {
          await env.DB.prepare(`UPDATE nav_menu_items SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i + 1, body.ordered_ids[i]).run();
        }
        return json({ ok: true, reordered: body.ordered_ids.length });
      }
      const label_en = cleanStr(body.label_en || '', 80);
      const url = validateSafeUrl(body.url || '');
      if (!label_en || !url) throw validationError({ label_en: 'label_en and url are required' });
      const vis = VISIBILITY_RULES.includes(body.visibility_rule) ? body.visibility_rule : 'all';
      const hl = HIGHLIGHT_STYLES.includes(body.highlight_style) ? body.highlight_style : 'default';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const newId = `nmenu-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, badge_text_or, open_new_tab, visibility_rule, highlight_style, sort_order, status)
         VALUES (?, 'header', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, label_en, cleanStr(body.label_or || '', 80), url, cleanStr(body.icon_key || '', 24),
        cleanStr(body.badge_text_en || '', 20), cleanStr(body.badge_text_or || '', 20),
        body.open_new_tab ? 1 : 0, vis, hl, Number(body.sort_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '04', newId, created, 'Created header nav link', actor.email);
      await audit(env, request, actor, 'nav.header.create', 'nav_menu_items', newId);
      return json({ ok: true, item: formatMenuItem(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Menu item not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '04' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatMenuItem(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const vis = VISIBILITY_RULES.includes(body.visibility_rule) ? body.visibility_rule : existing.visibility_rule;
    const hl = HIGHLIGHT_STYLES.includes(body.highlight_style) ? body.highlight_style : existing.highlight_style;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE nav_menu_items SET label_en = ?, label_or = ?, url = ?, icon_key = ?, badge_text_en = ?, badge_text_or = ?, open_new_tab = ?, visibility_rule = ?, highlight_style = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.label_en ?? existing.label_en, 80), cleanStr(body.label_or ?? existing.label_or, 80),
      validateSafeUrl(body.url ?? existing.url), cleanStr(body.icon_key ?? existing.icon_key, 24),
      cleanStr(body.badge_text_en ?? existing.badge_text_en, 20), cleanStr(body.badge_text_or ?? existing.badge_text_or, 20),
      body.open_new_tab !== undefined ? (body.open_new_tab ? 1 : 0) : existing.open_new_tab,
      vis, hl, Number(body.sort_order ?? existing.sort_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '04', id, updated, body.change_note || 'Updated header link', actor.email);
    return json({ ok: true, item: formatMenuItem(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `nmenu-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, badge_text_or, open_new_tab, visibility_rule, highlight_style, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, existing.menu_location, `${existing.label_en} (Copy)`, existing.label_or, existing.url, existing.icon_key, existing.badge_text_en, existing.badge_text_or, existing.open_new_tab, existing.visibility_rule, existing.highlight_style, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatMenuItem(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '04' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_menu_items SET label_en = ?, url = ?, badge_text_en = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.label_en, snap.url, snap.badge_text_en || '', Number(snap.sort_order || 10), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatMenuItem(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_menu_items SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatMenuItem(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_menu_items WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCategoriesNavBatch1Admin(request, env, actor, id, sub) {
  await ensureCategoriesNavBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json({ ok: true, ...(await getCategoriesNavOverview(env)) });
  }
  if (id === 'categories') return handleCategories(request, env, actor, sub);
  if (id === 'tags') return handleTags(request, env, actor, sub);
  if (id === 'header') return handleHeaderMenu(request, env, actor, sub);
  return null;
}

// ---------- Public /api/nav/config ----------
export async function handlePublicNavConfigApi(request, env) {
  await ensureCategoriesNavBatch1Schema(env.DB);
  const [hdrRes, catRes, tagRes] = await Promise.all([
    env.DB.prepare(`SELECT * FROM nav_menu_items WHERE menu_location = 'header' AND status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_categories WHERE status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_tags WHERE status = 'published' AND featured = 1 ORDER BY usage_count DESC LIMIT 30`).all()
  ]);

  const allCats = (catRes.results || []).map(formatCat);
  const masters = allCats.filter(c => !c.parent_id).map(m => ({
    ...m,
    subcategories: allCats.filter(s => s.parent_id === m.id)
  }));

  return json({
    ok: true,
    header: (hdrRes.results || []).map(formatMenuItem),
    categories: masters,
    featured_tags: (tagRes.results || []).map(formatTag)
  });
}
