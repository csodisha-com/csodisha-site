// Categories & Navigation Batch 2 (v85): Modules 05-08
// 05 Mega Menu | 06 Footer Navigation | 07 Sidebar Menus | 08 Breadcrumbs
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { ensureCategoriesNavBatch1Schema, NAV_STATUSES } from './categories-nav-batch1.js';

export const MEGA_COLUMNS = ['Column 1: Quick Tracks', 'Column 2: Exam Bodies', 'Column 3: Study Tools', 'Featured Spotlight'];
export const FOOTER_COLUMNS = ['Portals & Directories', 'Odisha Exam Boards', 'Student Resources', 'About & Legal'];
export const SIDEBAR_LOCATIONS = ['sidebar_library', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_community'];
export const BC_SEPARATORS = ['›', '/', '→'];

const _nav2Ready = new WeakSet();

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

const STARTER_MEGA = [
  { id: 'mm-lib-notes', menu_location: 'mega_menu', parent_item_id: 'nmenu-library', column_group: 'Column 1: Quick Tracks', label_en: 'Chapter Notes & PDFs', label_or: 'ଅଧ୍ୟାୟ ନୋଟ୍ସ', url: '/study-library/?type=notes', icon_key: '📄', badge_text_en: 'FREE', sort_order: 1, status: 'published' },
  { id: 'mm-lib-pyq', menu_location: 'mega_menu', parent_item_id: 'nmenu-library', column_group: 'Column 2: Exam Bodies', label_en: 'OPSC / OSSC PYQ Archive', label_or: 'PYQ ସଂଗ୍ରହ', url: '/study-library/?type=pyq', icon_key: '📝', badge_text_en: '2025', sort_order: 2, status: 'published' },
  { id: 'mm-lib-tools', menu_location: 'mega_menu', parent_item_id: 'nmenu-library', column_group: 'Column 3: Study Tools', label_en: 'Age & CGPA Calculators', label_or: 'ବୟସ ଓ CGPA କ୍ୟାଲକୁଲେଟର୍', url: '/student/#tools', icon_key: '🧮', badge_text_en: '', sort_order: 3, status: 'published' },
  { id: 'mm-jobs-opsc', menu_location: 'mega_menu', parent_item_id: 'nmenu-jobs', column_group: 'Column 2: Exam Bodies', label_en: 'OPSC Civil Services & ASO', label_or: 'OPSC ସିଭିଲ୍ ସର୍ଭିସ୍', url: '/jobs-careers/?body=opsc', icon_key: '🏛️', badge_text_en: 'LIVE', sort_order: 4, status: 'published' }
];

const STARTER_FOOTER = [
  { id: 'ft-portals-lib', menu_location: 'footer', column_group: 'Portals & Directories', label_en: 'Study Library', label_or: 'ଅଧ୍ୟୟନ ପାଠାଗାର', url: '/study-library/', sort_order: 1, status: 'published' },
  { id: 'ft-boards-opsc', menu_location: 'footer', column_group: 'Odisha Exam Boards', label_en: 'OPSC Official Portal', label_or: 'OPSC ପୋର୍ଟାଲ୍', url: 'https://www.opsc.gov.in', open_new_tab: 1, badge_text_en: 'nofollow', sort_order: 2, status: 'published' },
  { id: 'ft-res-mocks', menu_location: 'footer', column_group: 'Student Resources', label_en: 'Free Mock Tests', label_or: 'ମାଗଣା ମକ୍ ଟେଷ୍ଟ', url: '/study-library/?tab=mocks', sort_order: 3, status: 'published' },
  { id: 'ft-about-privacy', menu_location: 'footer', column_group: 'About & Legal', label_en: 'About & Editorial Policy', label_or: 'ଆମ ବିଷୟରେ', url: '/about/', sort_order: 4, status: 'published' }
];

const STARTER_SIDEBARS = [
  { id: 'sb-lib-1', menu_location: 'sidebar_library', column_group: 'Core Library', label_en: 'Odisha GK Notes', label_or: 'ଓଡ଼ିଶା GK ନୋଟ୍ସ', url: '/study-library/?cat=odisha-gk', icon_key: '📚', badge_text_en: '48', sort_order: 1, status: 'published' },
  { id: 'sb-job-1', menu_location: 'sidebar_jobs', column_group: 'Active Drives', label_en: 'OSSC & OSSSC Openings', label_or: 'OSSC / OSSSC ନିଯୁକ୍ତି', url: '/jobs-careers/', icon_key: '💼', badge_text_en: '12', sort_order: 1, status: 'published' },
  { id: 'sb-sch-1', menu_location: 'sidebar_schemes', column_group: 'Welfare & Aid', label_en: 'Student Scholarships', label_or: 'ଛାତ୍ରବୃତ୍ତି', url: '/schemes/?type=scholarship', icon_key: '🎓', badge_text_en: 'OPEN', sort_order: 1, status: 'published' },
  { id: 'sb-com-1', menu_location: 'sidebar_community', column_group: 'Discussions', label_en: 'OPSC Study Circle', label_or: 'OPSC ଆଲୋଚନା', url: '/community/', icon_key: '💬', badge_text_en: 'HOT', sort_order: 1, status: 'published' }
];

const STARTER_BREADCRUMBS = [
  {
    id: 'bc-study-library', slug: 'study-library-trail', route_pattern: '/study-library/*', portal_key: 'study-library',
    trail_json: JSON.stringify([
      { step_no: 1, label_en: 'Home', label_or: 'ମୂଳପୃଷ୍ଠା', url_template: '/', is_dynamic_title: false },
      { step_no: 2, label_en: 'Study Library', label_or: 'ଅଧ୍ୟୟନ ପାଠାଗାର', url_template: '/study-library/', is_dynamic_title: false },
      { step_no: 3, label_en: 'Resource', label_or: 'ସମ୍ବଳ', url_template: '{current_url}', is_dynamic_title: true }
    ]),
    schema_org_enabled: 1, separator_symbol: '›', show_home_icon: 1, status: 'published'
  },
  {
    id: 'bc-jobs-careers', slug: 'jobs-careers-trail', route_pattern: '/jobs-careers/*', portal_key: 'jobs-careers',
    trail_json: JSON.stringify([
      { step_no: 1, label_en: 'Home', label_or: 'ମୂଳପୃଷ୍ଠା', url_template: '/', is_dynamic_title: false },
      { step_no: 2, label_en: 'Jobs & Careers', label_or: 'ଚାକିରି ଏବଂ କ୍ୟାରିୟର୍', url_template: '/jobs-careers/', is_dynamic_title: false },
      { step_no: 3, label_en: 'Notification', label_or: 'ବିଜ୍ଞପ୍ତି', url_template: '{current_url}', is_dynamic_title: true }
    ]),
    schema_org_enabled: 1, separator_symbol: '›', show_home_icon: 1, status: 'published'
  },
  {
    id: 'bc-schemes', slug: 'schemes-trail', route_pattern: '/schemes/*', portal_key: 'schemes',
    trail_json: JSON.stringify([
      { step_no: 1, label_en: 'Home', label_or: 'ମୂଳପୃଷ୍ଠା', url_template: '/', is_dynamic_title: false },
      { step_no: 2, label_en: 'Schemes & Benefits', label_or: 'ସରକାରୀ ଯୋଜନା', url_template: '/schemes/', is_dynamic_title: false },
      { step_no: 3, label_en: 'Scheme Details', label_or: 'ଯୋଜନା ବିବରଣୀ', url_template: '{current_url}', is_dynamic_title: true }
    ]),
    schema_org_enabled: 1, separator_symbol: '›', show_home_icon: 1, status: 'published'
  },
  {
    id: 'bc-community', slug: 'community-trail', route_pattern: '/community/*', portal_key: 'community',
    trail_json: JSON.stringify([
      { step_no: 1, label_en: 'Home', label_or: 'ମୂଳପୃଷ୍ଠା', url_template: '/', is_dynamic_title: false },
      { step_no: 2, label_en: 'Community', label_or: 'ସମୁଦାୟ', url_template: '/community/', is_dynamic_title: false },
      { step_no: 3, label_en: 'Thread', label_or: 'ଆଲୋଚନା', url_template: '{current_url}', is_dynamic_title: true }
    ]),
    schema_org_enabled: 1, separator_symbol: '›', show_home_icon: 1, status: 'published'
  }
];

export async function ensureCategoriesNavBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureCategoriesNavBatch1Schema(db);
  if (_nav2Ready.has(db)) return;

  const ddl = [
    `CREATE INDEX IF NOT EXISTS idx_nav_menu_loc_col ON nav_menu_items(menu_location, column_group, sort_order)`,
    `CREATE TABLE IF NOT EXISTS nav_breadcrumb_rules (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      route_pattern TEXT NOT NULL,
      portal_key TEXT NOT NULL DEFAULT 'study-library',
      trail_json TEXT NOT NULL DEFAULT '[]',
      schema_org_enabled INTEGER NOT NULL DEFAULT 1,
      separator_symbol TEXT NOT NULL DEFAULT '›' CHECK (separator_symbol IN ('›', '/', '→')),
      show_home_icon INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_bc_portal_status ON nav_breadcrumb_rules(portal_key, status)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  const mmCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'mega_menu'`).first();
  if (!mmCnt || Number(mmCnt.n || 0) === 0) {
    for (const m of [...STARTER_MEGA, ...STARTER_FOOTER, ...STARTER_SIDEBARS]) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_menu_items (id, menu_location, parent_item_id, column_group, label_en, label_or, url, icon_key, badge_text_en, open_new_tab, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        m.id, m.menu_location, m.parent_item_id || null, m.column_group || '',
        m.label_en, m.label_or || '', m.url, m.icon_key || '', m.badge_text_en || '',
        m.open_new_tab ? 1 : 0, m.sort_order || 10, m.status
      ).run();
    }
  }

  const bcCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_breadcrumb_rules`).first();
  if (!bcCnt || Number(bcCnt.n || 0) === 0) {
    for (const b of STARTER_BREADCRUMBS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_breadcrumb_rules (id, slug, route_pattern, portal_key, trail_json, schema_org_enabled, separator_symbol, show_home_icon, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(b.id, b.slug, b.route_pattern, b.portal_key, b.trail_json, b.schema_org_enabled, b.separator_symbol, b.show_home_icon, b.status).run();
    }
  }

  _nav2Ready.add(db);
}

export async function getCategoriesNavBatch2Overview(env) {
  await ensureCategoriesNavBatch2Schema(env.DB);
  const [mm, ft, sb, bc] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'mega_menu'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location = 'footer'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM nav_menu_items WHERE menu_location IN ('sidebar_library', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_community')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM nav_breadcrumb_rules`).first()
  ]);
  return {
    mega_menu_items: Number(mm?.n || 0),
    footer_links: Number(ft?.n || 0),
    sidebar_items: Number(sb?.n || 0),
    breadcrumb_rules: Number(bc?.n || 0)
  };
}

function formatMenuItem(row) {
  if (!row) return null;
  return { ...row, open_new_tab: Boolean(row.open_new_tab) };
}

async function handleScopedMenu(request, env, actor, id, moduleCode, allowedLocations, defaultLocation) {
  const method = request.method;
  const locPlaceholders = allowedLocations.map(() => '?').join(', ');

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const loc = url.searchParams.get('menu_location') || '';
      const col = url.searchParams.get('column_group') || '';
      const parentId = url.searchParams.get('parent_item_id') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [`menu_location IN (${locPlaceholders})`];
      const binds = [...allowedLocations];
      if (loc && allowedLocations.includes(loc)) { where.push('menu_location = ?'); binds.push(loc); }
      if (col) { where.push('column_group = ?'); binds.push(col); }
      if (parentId) { where.push('parent_item_id = ?'); binds.push(parentId); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(label_en LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')`); binds.push(l, l); }

      const { results } = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_menu_items WHERE menu_location IN (${locPlaceholders})`).bind(...allowedLocations).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }

      const { results: headerParents } = await env.DB.prepare(`SELECT id, label_en FROM nav_menu_items WHERE menu_location = 'header' ORDER BY sort_order ASC`).all();
      return json({ ok: true, items: (results || []).map(formatMenuItem), counts, header_parents: headerParents || [] });
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
      const loc = allowedLocations.includes(body.menu_location) ? body.menu_location : defaultLocation;
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const newId = `nmenu-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_menu_items (id, menu_location, parent_item_id, column_group, label_en, label_or, url, icon_key, badge_text_en, badge_text_or, open_new_tab, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, loc, body.parent_item_id ? cleanStr(body.parent_item_id, 100) : null,
        cleanStr(body.column_group || '', 80), label_en, cleanStr(body.label_or || '', 80),
        url, cleanStr(body.icon_key || '', 24), cleanStr(body.badge_text_en || '', 24), cleanStr(body.badge_text_or || '', 24),
        body.open_new_tab ? 1 : 0, Number(body.sort_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, moduleCode, newId, created, `Created ${loc} item`, actor.email);
      await audit(env, request, actor, `nav.${loc}.create`, 'nav_menu_items', newId);
      return json({ ok: true, item: formatMenuItem(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Menu item not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = ? AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(moduleCode, id).all();
    return json({ ok: true, item: formatMenuItem(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const loc = allowedLocations.includes(body.menu_location) ? body.menu_location : existing.menu_location;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE nav_menu_items SET menu_location = ?, parent_item_id = ?, column_group = ?, label_en = ?, label_or = ?, url = ?, icon_key = ?, badge_text_en = ?, open_new_tab = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      loc, body.parent_item_id !== undefined ? (body.parent_item_id || null) : existing.parent_item_id,
      cleanStr(body.column_group ?? existing.column_group, 80),
      cleanStr(body.label_en ?? existing.label_en, 80), cleanStr(body.label_or ?? existing.label_or, 80),
      validateSafeUrl(body.url ?? existing.url), cleanStr(body.icon_key ?? existing.icon_key, 24),
      cleanStr(body.badge_text_en ?? existing.badge_text_en, 24),
      body.open_new_tab !== undefined ? (body.open_new_tab ? 1 : 0) : existing.open_new_tab,
      Number(body.sort_order ?? existing.sort_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, moduleCode, id, updated, body.change_note || 'Updated item', actor.email);
    return json({ ok: true, item: formatMenuItem(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `nmenu-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_menu_items (id, menu_location, parent_item_id, column_group, label_en, label_or, url, icon_key, badge_text_en, open_new_tab, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, existing.menu_location, existing.parent_item_id, existing.column_group, `${existing.label_en} (Copy)`, existing.label_or, existing.url, existing.icon_key, existing.badge_text_en, existing.open_new_tab, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatMenuItem(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = ? AND entity_id = ?`).bind(body.revision_id, moduleCode, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_menu_items SET label_en = ?, column_group = ?, url = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.label_en, snap.column_group || '', snap.url, Number(snap.sort_order || 10), snap.status || 'draft', id).run();
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

// ---------- Module 08: Breadcrumbs & Schema.org JSON-LD ----------
function formatBreadcrumb(row) {
  if (!row) return null;
  return {
    ...row,
    schema_org_enabled: Boolean(row.schema_org_enabled),
    show_home_icon: Boolean(row.show_home_icon),
    trail: parseJson(row.trail_json, [])
  };
}

export function generateBreadcrumbJsonLd(rule, sampleUrl = '/study-library/', dynamicTitle = 'Odisha GK Notes') {
  const trail = Array.isArray(rule.trail) ? rule.trail : parseJson(rule.trail_json, []);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.is_dynamic_title ? dynamicTitle : step.label_en,
      item: `https://csodisha.com${String(step.url_template || '/').replace('{current_url}', sampleUrl)}`
    }))
  };
}

function matchRoutePattern(pattern, pathname) {
  const p = String(pattern || '').trim();
  if (!p) return false;
  if (p.endsWith('/*')) return pathname.startsWith(p.slice(0, -1));
  return pathname === p;
}

async function handleBreadcrumbs(request, env, actor, id) {
  const method = request.method;
  if (id === 'test' && method === 'POST') {
    const body = await readJson(request, 20_000);
    const sampleUrl = cleanStr(body.url || '/study-library/odisha-gk', 200);
    const { results } = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE status = 'published' ORDER BY LENGTH(route_pattern) DESC`).all();
    const matched = (results || []).find(r => matchRoutePattern(r.route_pattern, sampleUrl));
    if (!matched) return json({ ok: true, matched: null, json_ld: null });
    const formatted = formatBreadcrumb(matched);
    return json({ ok: true, matched: formatted, json_ld: generateBreadcrumbJsonLd(formatted, sampleUrl, body.title || 'Sample Page') });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const portal = url.searchParams.get('portal_key') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (portal) { where.push('portal_key = ?'); binds.push(portal); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(route_pattern LIKE ? ESCAPE '\\' OR portal_key LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_breadcrumb_rules`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatBreadcrumb), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_breadcrumb_rules SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const route_pattern = cleanStr(body.route_pattern || '', 160);
      if (!route_pattern) throw validationError({ route_pattern: 'route_pattern is required' });
      const sep = BC_SEPARATORS.includes(body.separator_symbol) ? body.separator_symbol : '›';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || route_pattern).slice(0, 90) || 'breadcrumb';
      const dup = await env.DB.prepare(`SELECT id FROM nav_breadcrumb_rules WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `bc-${crypto.randomUUID().slice(0, 10)}`;
      const trail = parseJson(body.trail ?? body.trail_json, []);
      await env.DB.prepare(
        `INSERT INTO nav_breadcrumb_rules (id, slug, route_pattern, portal_key, trail_json, schema_org_enabled, separator_symbol, show_home_icon, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, route_pattern, cleanStr(body.portal_key || 'study-library', 60),
        JSON.stringify(trail), body.schema_org_enabled !== false ? 1 : 0, sep, body.show_home_icon !== false ? 1 : 0, status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '08', newId, created, 'Created breadcrumb rule', actor.email);
      return json({ ok: true, item: formatBreadcrumb(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Breadcrumb rule not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '08' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatBreadcrumb(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const sep = BC_SEPARATORS.includes(body.separator_symbol) ? body.separator_symbol : existing.separator_symbol;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    const trail = body.trail !== undefined ? parseJson(body.trail, []) : parseJson(existing.trail_json, []);
    await env.DB.prepare(
      `UPDATE nav_breadcrumb_rules SET route_pattern = ?, portal_key = ?, trail_json = ?, schema_org_enabled = ?, separator_symbol = ?, show_home_icon = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.route_pattern ?? existing.route_pattern, 160), cleanStr(body.portal_key ?? existing.portal_key, 60),
      JSON.stringify(trail), body.schema_org_enabled !== undefined ? (body.schema_org_enabled ? 1 : 0) : existing.schema_org_enabled,
      sep, body.show_home_icon !== undefined ? (body.show_home_icon ? 1 : 0) : existing.show_home_icon, status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '08', id, updated, body.change_note || 'Updated breadcrumb rule', actor.email);
    return json({ ok: true, item: formatBreadcrumb(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `bc-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_breadcrumb_rules (id, slug, route_pattern, portal_key, trail_json, schema_org_enabled, separator_symbol, show_home_icon, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, `${existing.route_pattern}-copy`, existing.portal_key, existing.trail_json, existing.schema_org_enabled, existing.separator_symbol, existing.show_home_icon).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatBreadcrumb(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '08' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_breadcrumb_rules SET route_pattern = ?, trail_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.route_pattern, snap.trail_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatBreadcrumb(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_breadcrumb_rules SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatBreadcrumb(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_breadcrumb_rules WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCategoriesNavBatch2Admin(request, env, actor, id, sub) {
  await ensureCategoriesNavBatch2Schema(env.DB);
  if (id === 'mega-menu') return handleScopedMenu(request, env, actor, sub, '05', ['mega_menu'], 'mega_menu');
  if (id === 'footer') return handleScopedMenu(request, env, actor, sub, '06', ['footer'], 'footer');
  if (id === 'sidebars') return handleScopedMenu(request, env, actor, sub, '07', SIDEBAR_LOCATIONS, 'sidebar_library');
  if (id === 'breadcrumbs') return handleBreadcrumbs(request, env, actor, sub);
  return null;
}

export async function getPublishedNavBatch2Config(env) {
  await ensureCategoriesNavBatch2Schema(env.DB);
  const [mmRes, ftRes, sbRes, bcRes] = await Promise.all([
    env.DB.prepare(`SELECT * FROM nav_menu_items WHERE menu_location = 'mega_menu' AND status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_menu_items WHERE menu_location = 'footer' AND status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_menu_items WHERE menu_location IN ('sidebar_library', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_community') AND status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_breadcrumb_rules WHERE status = 'published' ORDER BY LENGTH(route_pattern) DESC`).all()
  ]);
  return {
    mega_menu: (mmRes.results || []).map(formatMenuItem),
    footer: (ftRes.results || []).map(formatMenuItem),
    sidebars: (sbRes.results || []).map(formatMenuItem),
    breadcrumb_rules: (bcRes.results || []).map(b => {
      const f = formatBreadcrumb(b);
      return { ...f, sample_json_ld: f.schema_org_enabled ? generateBreadcrumbJsonLd(f, f.route_pattern.replace('*', 'sample')) : null };
    })
  };
}
