// v242 Homepage Studio: D1-backed homepage blocks (admin CRUD + public cached read + click telemetry).
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';

export const HOMEPAGE_SECTIONS = [
  'popular_searches',
  'latest_updates_tabs',
  'opportunity_compass',
  'trending_topics',
  'important_tools',
  'action_hub'
];

const COLS = ['id', 'section_key', 'title_en', 'title_or', 'subtitle_en', 'subtitle_or', 'badge_en', 'icon', 'href',
  'cta_label_en', 'cta_label_or', 'accent_variant', 'sort_order', 'is_published', 'clicks_count', 'meta_json', 'updated_at'];
const PUBLIC_CACHE = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';

let _schemaReady = false;
export async function ensureHomepageBlocksSchema(db) {
  if (!db || _schemaReady) return;
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS homepage_blocks (
      id TEXT PRIMARY KEY,
      section_key TEXT NOT NULL,
      title_en TEXT NOT NULL DEFAULT '',
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      badge_en TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      href TEXT NOT NULL DEFAULT '',
      cta_label_en TEXT NOT NULL DEFAULT '',
      cta_label_or TEXT NOT NULL DEFAULT '',
      accent_variant TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      clicks_count INTEGER NOT NULL DEFAULT 0,
      meta_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  _schemaReady = true;
}

function parseMeta(raw) {
  if (raw && typeof raw === 'object') return raw;
  try { const v = JSON.parse(String(raw || '{}')); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
}

function formatRow(r) {
  return {
    id: String(r.id),
    section_key: String(r.section_key),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    subtitle_en: String(r.subtitle_en || ''),
    subtitle_or: String(r.subtitle_or || ''),
    badge_en: String(r.badge_en || ''),
    icon: String(r.icon || ''),
    href: String(r.href || ''),
    cta_label_en: String(r.cta_label_en || ''),
    cta_label_or: String(r.cta_label_or || ''),
    accent_variant: String(r.accent_variant || ''),
    sort_order: Number(r.sort_order || 0),
    is_published: r.is_published ? 1 : 0,
    clicks_count: Number(r.clicks_count || 0),
    meta: parseMeta(r.meta_json),
    updated_at: String(r.updated_at || '')
  };
}

function safeHref(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s === '#' || s.startsWith('/') || s.startsWith('#')) return s.slice(0, 500);
  if (/^[a-z0-9][a-z0-9\-_./?=&%#]*$/i.test(s) && !/^[a-z]+:/i.test(s)) return s.slice(0, 500); // relative path such as community/
  let u;
  try { u = new URL(s); } catch { throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path or a valid http(s) URL.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  return u.toString().slice(0, 500);
}

function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

function normalizeInput(body, partial = false) {
  const out = {};
  const errors = {};
  if (!partial || body.section_key !== undefined) {
    out.section_key = str(body.section_key, 40);
    if (!HOMEPAGE_SECTIONS.includes(out.section_key)) errors.section_key = 'section_key must be one of: ' + HOMEPAGE_SECTIONS.join(', ');
  }
  if (!partial || body.title_en !== undefined) {
    out.title_en = str(body.title_en, 160);
    if (!out.title_en) errors.title_en = 'English title is required.';
  }
  const textFields = { title_or: 160, subtitle_en: 300, subtitle_or: 300, badge_en: 40, icon: 40, cta_label_en: 60, cta_label_or: 60, accent_variant: 40 };
  for (const [k, max] of Object.entries(textFields)) {
    if (!partial || body[k] !== undefined) out[k] = str(body[k], max);
  }
  if (!partial || body.href !== undefined) out.href = safeHref(body.href);
  if (!partial || body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    out.sort_order = Number.isFinite(n) ? Math.max(0, Math.min(100000, Math.round(n))) : 0;
  }
  if (!partial || body.is_published !== undefined) {
    out.is_published = body.is_published === false || body.is_published === 0 || body.is_published === '0' || body.is_published === 'draft' ? 0 : 1;
  }
  if (!partial || body.meta !== undefined || body.meta_json !== undefined) {
    const m = body.meta !== undefined ? body.meta : body.meta_json;
    const obj = parseMeta(m);
    const text = JSON.stringify(obj);
    if (text.length > 1000) errors.meta = 'meta_json is too large.';
    out.meta_json = text;
  }
  if (Object.keys(errors).length) throw validationError(errors);
  return out;
}

function newId(section) {
  return 'hb_' + section + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function nextSort(db, section) {
  const r = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM homepage_blocks WHERE section_key = ?').bind(section).first();
  return Number((r && r.m) || 0) + 10;
}

async function getById(db, id) {
  const r = await db.prepare('SELECT * FROM homepage_blocks WHERE id = ?').bind(id).first();
  return r ? formatRow(r) : null;
}

async function listAll(db, section) {
  const q = section && HOMEPAGE_SECTIONS.includes(section)
    ? db.prepare('SELECT * FROM homepage_blocks WHERE section_key = ? ORDER BY sort_order ASC, id ASC').bind(section)
    : db.prepare('SELECT * FROM homepage_blocks ORDER BY section_key ASC, sort_order ASC, id ASC');
  const { results } = await q.all();
  return (results || []).map(formatRow);
}

export function buildStats(items) {
  const sections = {};
  HOMEPAGE_SECTIONS.forEach((s) => { sections[s] = { total: 0, published: 0, draft: 0, clicks: 0 }; });
  let published = 0; let clicks = 0;
  items.forEach((i) => {
    const s = sections[i.section_key] || (sections[i.section_key] = { total: 0, published: 0, draft: 0, clicks: 0 });
    s.total += 1; s.clicks += i.clicks_count;
    if (i.is_published) { s.published += 1; published += 1; } else s.draft += 1;
    clicks += i.clicks_count;
  });
  return { total: items.length, published, draft: items.length - published, clicks, sections };
}

async function invalidate(request) {
  try { await invalidateAllPublicCaches(request, ['/api/public/homepage-blocks', '/api/homepage/blocks']); } catch { /* best effort */ }
}

// ---------- Admin: /api/admin/homepage-blocks[/...] ----------
export async function handleHomepageBlocksAdmin(request, env, actor, id, sub) {
  const db = env.DB;
  await ensureHomepageBlocksSchema(db);
  const method = request.method;
  const isWrite = method !== 'GET' && method !== 'HEAD';
  let res;

  if (!id && method === 'GET') {
    const url = new URL(request.url);
    const items = await listAll(db, url.searchParams.get('section'));
    const all = url.searchParams.get('section') ? await listAll(db) : items;
    return json({ ok: true, items, stats: buildStats(all), sections: HOMEPAGE_SECTIONS });
  }

  if (!id && method === 'POST') {
    const data = normalizeInput(await readJson(request));
    const sortOrder = data.sort_order > 0 ? data.sort_order : await nextSort(db, data.section_key);
    const newRowId = newId(data.section_key);
    await db.prepare(
      `INSERT INTO homepage_blocks (id, section_key, title_en, title_or, subtitle_en, subtitle_or, badge_en, icon, href, cta_label_en, cta_label_or, accent_variant, sort_order, is_published, clicks_count, meta_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))`
    ).bind(newRowId, data.section_key, data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.badge_en, data.icon,
      data.href, data.cta_label_en, data.cta_label_or, data.accent_variant, sortOrder, data.is_published, data.meta_json || '{}').run();
    await audit(env, request, actor, 'homepage_block.create', 'homepage_block', newRowId, { section: data.section_key });
    res = json({ ok: true, item: await getById(db, newRowId) }, 201);
  } else if (id === 'reorder' && method === 'POST') {
    const body = await readJson(request);
    const ids = Array.isArray(body.ids) ? body.ids.map((x) => String(x)).slice(0, 200) : [];
    if (!ids.length) throw validationError({ ids: 'ids array is required.' });
    const stmts = ids.map((rid, idx) => db.prepare("UPDATE homepage_blocks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((idx + 1) * 10, rid));
    await db.batch(stmts);
    await audit(env, request, actor, 'homepage_block.reorder', 'homepage_block', null, { count: ids.length });
    res = json({ ok: true, reordered: ids.length });
  } else if (id === 'bulk' && method === 'POST') {
    const body = await readJson(request);
    const ids = Array.isArray(body.ids) ? body.ids.map((x) => String(x)).slice(0, 200) : [];
    const action = String(body.action || '');
    if (!ids.length) throw validationError({ ids: 'ids array is required.' });
    if (!['publish', 'unpublish', 'delete'].includes(action)) throw validationError({ action: 'action must be publish, unpublish or delete.' });
    const stmts = ids.map((rid) => action === 'delete'
      ? db.prepare('DELETE FROM homepage_blocks WHERE id = ?').bind(rid)
      : db.prepare("UPDATE homepage_blocks SET is_published = ?, updated_at = datetime('now') WHERE id = ?").bind(action === 'publish' ? 1 : 0, rid));
    await db.batch(stmts);
    await audit(env, request, actor, 'homepage_block.bulk_' + action, 'homepage_block', null, { count: ids.length });
    res = json({ ok: true, action, affected: ids.length });
  } else if (id === 'reset-analytics' && method === 'POST') {
    const body = await readJson(request).catch(() => ({}));
    if (body && body.id) {
      await db.prepare("UPDATE homepage_blocks SET clicks_count = 0, updated_at = datetime('now') WHERE id = ?").bind(String(body.id)).run();
    } else if (body && HOMEPAGE_SECTIONS.includes(body.section_key)) {
      await db.prepare("UPDATE homepage_blocks SET clicks_count = 0, updated_at = datetime('now') WHERE section_key = ?").bind(body.section_key).run();
    } else {
      await db.prepare("UPDATE homepage_blocks SET clicks_count = 0, updated_at = datetime('now')").run();
    }
    await audit(env, request, actor, 'homepage_block.reset_analytics', 'homepage_block', body && body.id ? String(body.id) : null);
    res = json({ ok: true });
  } else if (id && !sub && method === 'GET') {
    const item = await getById(db, id);
    if (!item) throw new HttpError(404, 'NOT_FOUND', 'Homepage block not found');
    return json({ ok: true, item });
  } else if (id && !sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await getById(db, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Homepage block not found');
    const data = normalizeInput(await readJson(request), true);
    const keys = Object.keys(data);
    if (keys.length) {
      const sets = keys.map((k) => `${k} = ?`).join(', ');
      await db.prepare(`UPDATE homepage_blocks SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...keys.map((k) => data[k]), id).run();
    }
    await audit(env, request, actor, 'homepage_block.update', 'homepage_block', id, { fields: keys });
    res = json({ ok: true, item: await getById(db, id) });
  } else if (id && !sub && method === 'DELETE') {
    await db.prepare('DELETE FROM homepage_blocks WHERE id = ?').bind(id).run();
    await audit(env, request, actor, 'homepage_block.delete', 'homepage_block', id);
    res = json({ ok: true, deleted: id });
  } else if (id && sub === 'duplicate' && method === 'POST') {
    const src = await getById(db, id);
    if (!src) throw new HttpError(404, 'NOT_FOUND', 'Homepage block not found');
    const copyId = newId(src.section_key);
    const sort = await nextSort(db, src.section_key);
    await db.prepare(
      `INSERT INTO homepage_blocks (id, section_key, title_en, title_or, subtitle_en, subtitle_or, badge_en, icon, href, cta_label_en, cta_label_or, accent_variant, sort_order, is_published, clicks_count, meta_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, datetime('now'))`
    ).bind(copyId, src.section_key, (src.title_en + ' (copy)').slice(0, 160), src.title_or, src.subtitle_en, src.subtitle_or, src.badge_en, src.icon,
      src.href, src.cta_label_en, src.cta_label_or, src.accent_variant, sort, JSON.stringify(src.meta)).run();
    await audit(env, request, actor, 'homepage_block.duplicate', 'homepage_block', copyId, { from: id });
    res = json({ ok: true, item: await getById(db, copyId) }, 201);
  } else if (id && (sub === 'publish' || sub === 'unpublish') && method === 'POST') {
    await db.prepare("UPDATE homepage_blocks SET is_published = ?, updated_at = datetime('now') WHERE id = ?").bind(sub === 'publish' ? 1 : 0, id).run();
    await audit(env, request, actor, 'homepage_block.' + sub, 'homepage_block', id);
    res = json({ ok: true, item: await getById(db, id) });
  } else if (id && sub === 'move' && method === 'POST') {
    const body = await readJson(request);
    const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!dir) throw validationError({ direction: 'direction must be up or down.' });
    const item = await getById(db, id);
    if (!item) throw new HttpError(404, 'NOT_FOUND', 'Homepage block not found');
    const siblings = await listAll(db, item.section_key);
    const idx = siblings.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx >= 0 && swapIdx < siblings.length) {
      const order = siblings.map((s) => s.id);
      [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
      await db.batch(order.map((rid, n) => db.prepare("UPDATE homepage_blocks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)));
    }
    await audit(env, request, actor, 'homepage_block.move', 'homepage_block', id, { direction: body.direction });
    res = json({ ok: true, items: await listAll(db, item.section_key) });
  } else {
    throw new HttpError(404, 'NOT_FOUND', 'Unknown homepage-blocks route');
  }

  if (isWrite && res && res.status >= 200 && res.status < 400) await invalidate(request);
  return res;
}

// ---------- Public: GET /api/public/homepage-blocks (+ alias /api/homepage/blocks) ----------
export async function handlePublicHomepageBlocksApi(request, env) {
  const empty = () => json({ ok: false, source: 'fallback', sections: {} }, 200, { 'Cache-Control': 'public, max-age=15' });
  if (!env || !env.DB) return empty();
  try {
    await ensureHomepageBlocksSchema(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM homepage_blocks ORDER BY section_key ASC, sort_order ASC, id ASC').all();
    const rows = (results || []).map(formatRow);
    if (!rows.length) return json({ ok: true, source: 'empty', sections: {} }, 200, { 'Cache-Control': 'public, max-age=30' });
    const sections = {};
    HOMEPAGE_SECTIONS.forEach((s) => { sections[s] = []; });
    rows.filter((r) => r.is_published && sections[r.section_key]).forEach((r) => {
      sections[r.section_key].push({
        id: r.id, title_en: r.title_en, title_or: r.title_or, subtitle_en: r.subtitle_en, subtitle_or: r.subtitle_or,
        badge_en: r.badge_en, icon: r.icon, href: r.href, cta_label_en: r.cta_label_en, cta_label_or: r.cta_label_or,
        accent_variant: r.accent_variant, sort_order: r.sort_order, meta: r.meta
      });
    });
    return json({ ok: true, source: 'd1', sections, updated_at: rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '') }, 200, { 'Cache-Control': PUBLIC_CACHE });
  } catch (e) {
    console.error('homepage-blocks public error', e && e.message);
    return empty();
  }
}

// ---------- Public: POST /api/public/homepage-blocks/click ----------
export async function handlePublicHomepageBlockClick(request, env) {
  try {
    if (!env || !env.DB) return json({ ok: false }, 202);
    try { await rateLimit(env, `hb-click:${clientIp(request)}`, 120, 60); } catch { return json({ ok: false, code: 'RATE_LIMITED' }, 429); }
    const body = await readJson(request, 2000);
    const id = str(body.id, 80);
    if (!/^hb_[a-z0-9_]+$/i.test(id)) return json({ ok: false }, 400);
    await ensureHomepageBlocksSchema(env.DB);
    await env.DB.prepare('UPDATE homepage_blocks SET clicks_count = clicks_count + 1 WHERE id = ? AND is_published = 1').bind(id).run();
    return json({ ok: true }, 202);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, code: e.code }, e.status);
    return json({ ok: false }, 202);
  }
}
