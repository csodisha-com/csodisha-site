// Categories & Navigation Batch 3 (v86): Modules 09-11 + Unified 11-Module Overview
// 09 Internal Links | 10 Menu Ordering | 11 Social Links
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { NAV_STATUSES } from './categories-nav-batch1.js';
import { ensureCategoriesNavBatch2Schema } from './categories-nav-batch2.js';

export const LINK_GROUPS = ['quick_access_bar', 'related_hub_links', 'seo_anchor_rules', 'contextual_cta'];
export const SOURCE_PORTALS = ['all', 'home', 'study-library', 'jobs-careers', 'schemes', 'community', 'student'];
export const REL_ATTRS = ['', 'nofollow', 'sponsored'];
export const SOCIAL_PLATFORMS = ['instagram', 'telegram', 'whatsapp', 'youtube', 'x_twitter', 'facebook', 'linkedin', 'github'];
export const SOCIAL_PLACEMENTS = ['header_and_footer', 'footer_only', 'community_hub', 'all'];

const _nav3Ready = new WeakSet();

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

const STARTER_INTERNAL_LINKS = [
  { id: 'il-study-pyq', slug: 'quick-opsc-pyqs', link_group: 'quick_access_bar', source_portal: 'all', anchor_text_en: 'OPSC / OSSC PYQ Archive', anchor_text_or: 'OPSC / OSSC ପ୍ରଶ୍ନପତ୍ର', target_url: '/study-library/?type=pyq', target_module_code: '11', priority_weight: 10, link_health_status: 'ok', status: 'published' },
  { id: 'il-jobs-govt', slug: 'quick-odisha-govt-jobs', link_group: 'related_hub_links', source_portal: 'study-library', anchor_text_en: 'Latest Odisha Govt Jobs', anchor_text_or: 'ନୂତନ ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି', target_url: '/jobs-careers/', target_module_code: '08', priority_weight: 9, link_health_status: 'ok', status: 'published' },
  { id: 'il-schemes-schol', slug: 'quick-odisha-scholarships', link_group: 'related_hub_links', source_portal: 'student', anchor_text_en: 'State Scholarship Portal Guide', anchor_text_or: 'ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ମାର୍ଗଦର୍ଶିକା', target_url: '/schemes/', target_module_code: '19', priority_weight: 8, link_health_status: 'ok', status: 'published' },
  { id: 'il-student-tools', slug: 'quick-age-cgpa-tools', link_group: 'contextual_cta', source_portal: 'jobs-careers', anchor_text_en: 'Check Age Eligibility & CGPA Tools', anchor_text_or: 'ବୟସ ଓ CGPA କ୍ୟାଲକୁଲେଟର୍', target_url: '/student/#tools', target_module_code: '22', priority_weight: 7, link_health_status: 'ok', status: 'published' }
];

const STARTER_SOCIAL_LINKS = [
  { id: 'soc-instagram', slug: 'instagram-csodisha', platform_key: 'instagram', label_en: 'Instagram', label_or: 'ଇନଷ୍ଟାଗ୍ରାମ', handle_text: '@csodisha', profile_url: 'https://instagram.com/csodisha', placement: 'all', follower_badge_text: 'Official', sort_order: 1, status: 'published' },
  { id: 'soc-telegram', slug: 'telegram-csodisha', platform_key: 'telegram', label_en: 'Telegram Channel', label_or: 'ଟେଲିଗ୍ରାମ', handle_text: 't.me/csodisha', profile_url: 'https://t.me/csodisha', placement: 'all', follower_badge_text: 'PDF Alerts', sort_order: 2, status: 'published' },
  { id: 'soc-whatsapp', slug: 'whatsapp-csodisha', platform_key: 'whatsapp', label_en: 'WhatsApp Channel', label_or: 'ହ୍ୱାଟସଆପ୍', handle_text: 'CS Odisha Updates', profile_url: 'https://whatsapp.com/channel/csodisha', placement: 'all', follower_badge_text: 'Instant', sort_order: 3, status: 'published' },
  { id: 'soc-youtube', slug: 'youtube-csodisha', platform_key: 'youtube', label_en: 'YouTube', label_or: 'ୟୁଟ୍ୟୁବ୍', handle_text: '@csodisha', profile_url: 'https://youtube.com/@csodisha', placement: 'footer_only', follower_badge_text: 'Classes', sort_order: 4, status: 'published' },
  { id: 'soc-x', slug: 'x-csodisha', platform_key: 'x_twitter', label_en: 'X (Twitter)', label_or: 'ଏକ୍ସ (ଟୁଇଟର୍)', handle_text: '@csodisha', profile_url: 'https://x.com/csodisha', placement: 'footer_only', follower_badge_text: 'News', sort_order: 5, status: 'published' }
];

export async function ensureCategoriesNavBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureCategoriesNavBatch2Schema(db);
  if (_nav3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS nav_internal_links (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      link_group TEXT NOT NULL DEFAULT 'quick_access_bar' CHECK (link_group IN (
        'quick_access_bar', 'related_hub_links', 'seo_anchor_rules', 'contextual_cta'
      )),
      source_portal TEXT NOT NULL DEFAULT 'all' CHECK (source_portal IN (
        'all', 'home', 'study-library', 'jobs-careers', 'schemes', 'community', 'student'
      )),
      anchor_text_en TEXT NOT NULL,
      anchor_text_or TEXT NOT NULL DEFAULT '',
      target_url TEXT NOT NULL,
      target_module_code TEXT NOT NULL DEFAULT '',
      rel_attributes TEXT NOT NULL DEFAULT '' CHECK (rel_attributes IN ('', 'nofollow', 'sponsored')),
      priority_weight INTEGER NOT NULL DEFAULT 10,
      click_count INTEGER NOT NULL DEFAULT 0,
      link_health_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (link_health_status IN ('ok', 'broken', 'unchecked')),
      last_checked_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_il_group_portal ON nav_internal_links(link_group, source_portal, status)`,
    `CREATE TABLE IF NOT EXISTS nav_social_links (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      platform_key TEXT NOT NULL DEFAULT 'instagram' CHECK (platform_key IN (
        'instagram', 'telegram', 'whatsapp', 'youtube', 'x_twitter', 'facebook', 'linkedin', 'github'
      )),
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      handle_text TEXT NOT NULL DEFAULT '',
      profile_url TEXT NOT NULL,
      placement TEXT NOT NULL DEFAULT 'header_and_footer' CHECK (placement IN (
        'header_and_footer', 'footer_only', 'community_hub', 'all'
      )),
      follower_badge_text TEXT NOT NULL DEFAULT '',
      open_new_tab INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_soc_place_status ON nav_social_links(placement, status, sort_order)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  const ilCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_internal_links`).first();
  if (!ilCnt || Number(ilCnt.n || 0) === 0) {
    for (const l of STARTER_INTERNAL_LINKS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_internal_links (id, slug, link_group, source_portal, anchor_text_en, anchor_text_or, target_url, target_module_code, priority_weight, link_health_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(l.id, l.slug, l.link_group, l.source_portal, l.anchor_text_en, l.anchor_text_or, l.target_url, l.target_module_code, l.priority_weight, l.link_health_status, l.status).run();
    }
  }

  const socCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_social_links`).first();
  if (!socCnt || Number(socCnt.n || 0) === 0) {
    for (const s of STARTER_SOCIAL_LINKS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_social_links (id, slug, platform_key, label_en, label_or, handle_text, profile_url, placement, follower_badge_text, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(s.id, s.slug, s.platform_key, s.label_en, s.label_or, s.handle_text, s.profile_url, s.placement, s.follower_badge_text, s.sort_order, s.status).run();
    }
  }

  _nav3Ready.add(db);
}

export async function getFull11ModuleNavOverview(env) {
  await ensureCategoriesNavBatch3Schema(env.DB);
  const [catRes, tagRes, menuRes, bcRes, ilRes, socRes] = await Promise.all([
    env.DB.prepare(`SELECT parent_id, status, name_or FROM nav_categories`).all(),
    env.DB.prepare(`SELECT status, label_or FROM nav_tags`).all(),
    env.DB.prepare(`SELECT menu_location, status, label_or FROM nav_menu_items`).all(),
    env.DB.prepare(`SELECT status FROM nav_breadcrumb_rules`).all(),
    env.DB.prepare(`SELECT status, anchor_text_or, link_health_status FROM nav_internal_links`).all(),
    env.DB.prepare(`SELECT status, label_or FROM nav_social_links`).all()
  ]);

  const cats = catRes.results || [];
  const tags = tagRes.results || [];
  const menus = menuRes.results || [];
  const bcs = bcRes.results || [];
  const ils = ilRes.results || [];
  const socs = socRes.results || [];

  const buckets = {
    '01': cats.filter(r => !r.parent_id),
    '02': cats.filter(r => Boolean(r.parent_id)),
    '03': tags,
    '04': menus.filter(r => r.menu_location === 'header'),
    '05': menus.filter(r => r.menu_location === 'mega_menu'),
    '06': menus.filter(r => r.menu_location === 'footer'),
    '07': menus.filter(r => String(r.menu_location || '').startsWith('sidebar_')),
    '08': bcs,
    '09': ils,
    '10': menus,
    '11': socs
  };

  const modules = {};
  let totalItems = 0; let published = 0; let draft = 0;
  for (const [k, arr] of Object.entries(buckets)) {
    const pub = arr.filter(r => r.status === 'published').length;
    const drf = arr.filter(r => r.status === 'draft').length;
    modules[k] = { total: arr.length, published: pub, draft: drf };
    if (k !== '10') { totalItems += arr.length; published += pub; draft += drf; }
  }

  const biSource = [...cats.map(r => r.name_or), ...tags.map(r => r.label_or), ...menus.map(r => r.label_or), ...ils.map(r => r.anchor_text_or), ...socs.map(r => r.label_or)];
  const bilingualPct = biSource.length ? Math.round((biSource.filter(Boolean).length / biSource.length) * 100) : 100;

  return {
    modules,
    totals: { total_items: totalItems, published, draft },
    bilingual_parity_pct: bilingualPct,
    internal_links_total: ils.length,
    internal_links_ok: ils.filter(r => r.link_health_status === 'ok').length,
    internal_links_broken: ils.filter(r => r.link_health_status === 'broken').length,
    social_channels: socs.length
  };
}

// ---------- Module 09: Internal Links ----------
const KNOWN_PORTAL_PREFIXES = ['/', '/study-library', '/jobs-careers', '/jobs', '/schemes', '/community', '/student', '/about', '/login.html', '/signup.html'];

async function handleInternalLinks(request, env, actor, id) {
  const method = request.method;
  if (id === 'verify' && method === 'POST') {
    const { results } = await env.DB.prepare(`SELECT id, target_url FROM nav_internal_links`).all();
    const now = new Date().toISOString();
    let okCount = 0; let brokenCount = 0;
    for (const row of results || []) {
      const u = String(row.target_url || '').trim();
      const isOk = u.startsWith('/') && KNOWN_PORTAL_PREFIXES.some(p => u === p || u.startsWith(p + '/') || u.startsWith(p + '?') || u.startsWith(p + '#'));
      const status = isOk ? 'ok' : 'broken';
      if (isOk) okCount++; else brokenCount++;
      await env.DB.prepare(`UPDATE nav_internal_links SET link_health_status = ?, last_checked_at = ? WHERE id = ?`).bind(status, now, row.id).run();
    }
    await audit(env, request, actor, 'nav.internal_links.verify', 'nav_internal_links', null, { ok: okCount, broken: brokenCount });
    return json({ ok: true, checked: (results || []).length, ok_count: okCount, broken_count: brokenCount });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const grp = url.searchParams.get('link_group') || '';
      const portal = url.searchParams.get('source_portal') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (grp && LINK_GROUPS.includes(grp)) { where.push('link_group = ?'); binds.push(grp); }
      if (portal && SOURCE_PORTALS.includes(portal)) { where.push('source_portal = ?'); binds.push(portal); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(anchor_text_en LIKE ? ESCAPE '\\' OR target_url LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE ${where.join(' AND ')} ORDER BY priority_weight DESC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_internal_links`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: results || [], counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_internal_links SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const anchor_text_en = cleanStr(body.anchor_text_en || '', 160);
      const target_url = validateSafeUrl(body.target_url || '');
      if (!anchor_text_en || !target_url) throw validationError({ anchor_text_en: 'anchor_text_en and target_url are required' });
      const grp = LINK_GROUPS.includes(body.link_group) ? body.link_group : 'quick_access_bar';
      const portal = SOURCE_PORTALS.includes(body.source_portal) ? body.source_portal : 'all';
      const rel = REL_ATTRS.includes(body.rel_attributes) ? body.rel_attributes : '';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || anchor_text_en).slice(0, 90) || 'link';
      const dup = await env.DB.prepare(`SELECT id FROM nav_internal_links WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `il-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_internal_links (id, slug, link_group, source_portal, anchor_text_en, anchor_text_or, target_url, target_module_code, rel_attributes, priority_weight, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, grp, portal, anchor_text_en, cleanStr(body.anchor_text_or || '', 160),
        target_url, cleanStr(body.target_module_code || '', 10), rel, Number(body.priority_weight ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '09', newId, created, 'Created internal link', actor.email);
      return json({ ok: true, item: created }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Internal link not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '09' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: existing, revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const grp = LINK_GROUPS.includes(body.link_group) ? body.link_group : existing.link_group;
    const portal = SOURCE_PORTALS.includes(body.source_portal) ? body.source_portal : existing.source_portal;
    const rel = REL_ATTRS.includes(body.rel_attributes) ? body.rel_attributes : existing.rel_attributes;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE nav_internal_links SET link_group = ?, source_portal = ?, anchor_text_en = ?, anchor_text_or = ?, target_url = ?, target_module_code = ?, rel_attributes = ?, priority_weight = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      grp, portal, cleanStr(body.anchor_text_en ?? existing.anchor_text_en, 160), cleanStr(body.anchor_text_or ?? existing.anchor_text_or, 160),
      validateSafeUrl(body.target_url ?? existing.target_url), cleanStr(body.target_module_code ?? existing.target_module_code, 10),
      rel, Number(body.priority_weight ?? existing.priority_weight), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '09', id, updated, body.change_note || 'Updated internal link', actor.email);
    return json({ ok: true, item: updated });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `il-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_internal_links (id, slug, link_group, source_portal, anchor_text_en, anchor_text_or, target_url, target_module_code, rel_attributes, priority_weight, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.link_group, existing.source_portal, `${existing.anchor_text_en} (Copy)`, existing.anchor_text_or, existing.target_url, existing.target_module_code, existing.rel_attributes, existing.priority_weight).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: cloned }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '09' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_internal_links SET anchor_text_en = ?, target_url = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.anchor_text_en, snap.target_url, snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: rolled });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_internal_links SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_internal_links WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: patched });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_internal_links WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 10: Unified Menu Ordering ----------
async function handleMenuOrdering(request, env, actor) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const location = url.searchParams.get('location') || 'header';
    if (location === 'categories_master') {
      const { results } = await env.DB.prepare(`SELECT id, name_en AS label_en, name_or AS label_or, landing_url AS url, sort_order, status FROM nav_categories WHERE parent_id IS NULL ORDER BY sort_order ASC`).all();
      return json({ ok: true, location, items: results || [] });
    }
    if (location === 'categories_sub') {
      const { results } = await env.DB.prepare(`SELECT id, name_en AS label_en, name_or AS label_or, landing_url AS url, sort_order, status FROM nav_categories WHERE parent_id IS NOT NULL ORDER BY sort_order ASC`).all();
      return json({ ok: true, location, items: results || [] });
    }
    const { results } = await env.DB.prepare(`SELECT id, menu_location, column_group, label_en, label_or, url, sort_order, status FROM nav_menu_items WHERE menu_location = ? ORDER BY sort_order ASC`).bind(location).all();
    return json({ ok: true, location, items: results || [] });
  }
  if (request.method === 'POST') {
    const body = await readJson(request, 100_000);
    const location = cleanStr(body.location || 'header', 60);
    const orderedIds = Array.isArray(body.ordered_ids) ? body.ordered_ids : [];
    if (!orderedIds.length) throw validationError({ ordered_ids: 'ordered_ids array is required' });
    const isCat = location === 'categories_master' || location === 'categories_sub';
    const table = isCat ? 'nav_categories' : 'nav_menu_items';
    for (let i = 0; i < orderedIds.length; i++) {
      await env.DB.prepare(`UPDATE ${table} SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i + 1, orderedIds[i]).run();
    }
    await saveNavRevision(env.DB, '10', location, { location, ordered_ids: orderedIds }, `Reordered ${orderedIds.length} items in ${location}`, actor.email);
    await audit(env, request, actor, 'nav.ordering.save', table, location, { count: orderedIds.length });
    return json({ ok: true, location, reordered: orderedIds.length });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 11: Social Links ----------
function formatSocial(row) {
  if (!row) return null;
  return { ...row, open_new_tab: Boolean(row.open_new_tab) };
}

async function handleSocialLinks(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const place = url.searchParams.get('placement') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (place && SOCIAL_PLACEMENTS.includes(place)) { where.push('placement = ?'); binds.push(place); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(label_en LIKE ? ESCAPE '\\' OR handle_text LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_social_links`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatSocial), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_social_links SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      if (body.action === 'reorder' && Array.isArray(body.ordered_ids)) {
        for (let i = 0; i < body.ordered_ids.length; i++) {
          await env.DB.prepare(`UPDATE nav_social_links SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i + 1, body.ordered_ids[i]).run();
        }
        return json({ ok: true, reordered: body.ordered_ids.length });
      }
      const label_en = cleanStr(body.label_en || '', 80);
      const profile_url = validateSafeUrl(body.profile_url || '');
      if (!label_en || !profile_url) throw validationError({ label_en: 'label_en and profile_url are required' });
      const plat = SOCIAL_PLATFORMS.includes(body.platform_key) ? body.platform_key : 'instagram';
      const place = SOCIAL_PLACEMENTS.includes(body.placement) ? body.placement : 'header_and_footer';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || `${plat}-${label_en}`).slice(0, 90) || 'social';
      const dup = await env.DB.prepare(`SELECT id FROM nav_social_links WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `soc-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_social_links (id, slug, platform_key, label_en, label_or, handle_text, profile_url, placement, follower_badge_text, open_new_tab, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, plat, label_en, cleanStr(body.label_or || '', 80), cleanStr(body.handle_text || '', 80),
        profile_url, place, cleanStr(body.follower_badge_text || '', 30), body.open_new_tab !== false ? 1 : 0,
        Number(body.sort_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '11', newId, created, 'Created social link', actor.email);
      return json({ ok: true, item: formatSocial(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Social link not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '11' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatSocial(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const plat = SOCIAL_PLATFORMS.includes(body.platform_key) ? body.platform_key : existing.platform_key;
    const place = SOCIAL_PLACEMENTS.includes(body.placement) ? body.placement : existing.placement;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE nav_social_links SET platform_key = ?, label_en = ?, label_or = ?, handle_text = ?, profile_url = ?, placement = ?, follower_badge_text = ?, open_new_tab = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      plat, cleanStr(body.label_en ?? existing.label_en, 80), cleanStr(body.label_or ?? existing.label_or, 80),
      cleanStr(body.handle_text ?? existing.handle_text, 80), validateSafeUrl(body.profile_url ?? existing.profile_url),
      place, cleanStr(body.follower_badge_text ?? existing.follower_badge_text, 30),
      body.open_new_tab !== undefined ? (body.open_new_tab ? 1 : 0) : existing.open_new_tab,
      Number(body.sort_order ?? existing.sort_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '11', id, updated, body.change_note || 'Updated social link', actor.email);
    return json({ ok: true, item: formatSocial(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `soc-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_social_links (id, slug, platform_key, label_en, label_or, handle_text, profile_url, placement, follower_badge_text, open_new_tab, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.platform_key, `${existing.label_en} (Copy)`, existing.label_or, existing.handle_text, existing.profile_url, existing.placement, existing.follower_badge_text, existing.open_new_tab, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatSocial(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '11' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_social_links SET label_en = ?, profile_url = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.label_en, snap.profile_url, Number(snap.sort_order || 10), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatSocial(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_social_links SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_social_links WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatSocial(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_social_links WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCategoriesNavBatch3Admin(request, env, actor, id, sub) {
  await ensureCategoriesNavBatch3Schema(env.DB);
  if (id === 'internal-links') return handleInternalLinks(request, env, actor, sub);
  if (id === 'ordering') return handleMenuOrdering(request, env, actor);
  if (id === 'social-links') return handleSocialLinks(request, env, actor, sub);
  return null;
}

export async function getPublishedNavBatch3Config(env) {
  await ensureCategoriesNavBatch3Schema(env.DB);
  const [ilRes, socRes] = await Promise.all([
    env.DB.prepare(`SELECT * FROM nav_internal_links WHERE status = 'published' ORDER BY priority_weight DESC`).all(),
    env.DB.prepare(`SELECT * FROM nav_social_links WHERE status = 'published' ORDER BY sort_order ASC`).all()
  ]);
  return {
    internal_links: ilRes.results || [],
    social_links: (socRes.results || []).map(formatSocial)
  };
}
