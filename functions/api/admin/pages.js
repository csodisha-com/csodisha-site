// Real-time Website Pages & Builder API (RBAC + CSRF enforced by requireRole).
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { requireRole, audit, STAFF_ROLES } from '../../_lib/rbac.js';
import { PAGE_STATUSES, normalizeRoute } from '../../_lib/site-pages.js';
import manifest from '../../../admin/site-manifest.json';

const ROUTE_RE = /^\/[a-z0-9\-_/.]*$/i;
const cut = (v, n) => v == null ? null : String(v).trim().slice(0, n);
const jsonStr = v => v == null ? null : (typeof v === 'string' ? v : JSON.stringify(v));

async function listPages(env) {
  const { results: rows } = await env.DB.prepare('SELECT * FROM site_pages').all();
  const { results: revs } = await env.DB.prepare('SELECT route, COUNT(*) AS n FROM site_page_revisions GROUP BY route').all();
  const rc = Object.fromEntries((revs || []).map(r => [r.route, r.n]));
  const live = new Map((rows || []).map(r => [r.route, r]));
  const out = [];
  for (const p of manifest.pages || []) {
    const o = live.get(p.route); live.delete(p.route);
    out.push({ route: p.route, file: p.file, source: o ? 'override' : 'static',
      title: o?.title || p.title, meta_description: o?.meta_description ?? p.description, category: o?.category || p.category,
      hero_title: o?.hero_title || '', hero_subtitle: o?.hero_subtitle || '', cta_label: o?.cta_label || '', cta_url: o?.cta_url || '',
      blocks_json: o?.blocks_json || '[]', reusable_sections_json: o?.reusable_sections_json || '[]',
      status: o?.status || 'published', publish_at: o?.publish_at || null, updated_at: o?.updated_at || p.lastModified,
      updated_by: o?.updated_by || null, revisions: rc[p.route] || 0 });
  }
  for (const o of live.values()) out.push({ ...o, source: 'dynamic', revisions: rc[o.route] || 0 });
  return out;
}

async function savePage(request, env, actor, body, isCreate) {
  const route = normalizeRoute(body.route);
  const errors = {};
  if (!ROUTE_RE.test(route) || route.includes('..') || /^\/(admin|api)(\/|$)/.test(route)) errors.route = 'Invalid route';
  const status = body.status || 'published';
  if (!PAGE_STATUSES.includes(status)) errors.status = 'Invalid status';
  const publishAt = cut(body.publish_at, 40);
  if (status === 'scheduled' && !publishAt) errors.publish_at = 'publish_at required for scheduled pages';
  if (!cut(body.title, 200) && isCreate) errors.title = 'Title required';
  for (const k of ['blocks_json', 'reusable_sections_json']) {
    if (body[k] != null) { try { if (!Array.isArray(JSON.parse(jsonStr(body[k])))) throw 0; } catch { errors[k] = 'Must be a JSON array'; } }
  }
  if (Object.keys(errors).length) throw validationError(errors);
  const prev = await env.DB.prepare('SELECT * FROM site_pages WHERE route = ?').bind(route).first();
  const m = (manifest.pages || []).find(p => p.route === route);
  const pick = (k, n, fallback = null) => body[k] !== undefined ? cut(body[k], n) : (prev ? prev[k] : fallback);
  const rec = {
    title: pick('title', 200, m?.title), meta_description: pick('meta_description', 400, m?.description), category: pick('category', 80, m?.category),
    hero_title: pick('hero_title', 200), hero_subtitle: pick('hero_subtitle', 400), cta_label: pick('cta_label', 60), cta_url: pick('cta_url', 500),
    blocks_json: body.blocks_json !== undefined ? jsonStr(body.blocks_json) : (prev?.blocks_json ?? '[]'),
    reusable_sections_json: body.reusable_sections_json !== undefined ? jsonStr(body.reusable_sections_json) : (prev?.reusable_sections_json ?? '[]'),
    status, publish_at: status === 'scheduled' ? publishAt : null
  };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO site_pages (route,title,meta_description,category,hero_title,hero_subtitle,cta_label,cta_url,blocks_json,reusable_sections_json,status,publish_at,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(route) DO UPDATE SET title=excluded.title, meta_description=excluded.meta_description, category=excluded.category, hero_title=excluded.hero_title,
      hero_subtitle=excluded.hero_subtitle, cta_label=excluded.cta_label, cta_url=excluded.cta_url, blocks_json=excluded.blocks_json,
      reusable_sections_json=excluded.reusable_sections_json, status=excluded.status, publish_at=excluded.publish_at, updated_by=excluded.updated_by, updated_at=datetime('now')`)
      .bind(route, rec.title, rec.meta_description, rec.category, rec.hero_title, rec.hero_subtitle, rec.cta_label, rec.cta_url, rec.blocks_json, rec.reusable_sections_json, rec.status, rec.publish_at, actor.userId, actor.userId),
    env.DB.prepare('INSERT INTO site_page_revisions (route, snapshot_json, editor_email, note) VALUES (?,?,?,?)')
      .bind(route, JSON.stringify({ route, ...rec }), actor.email || null, cut(body.note, 200) || (prev ? 'update' : 'create'))
  ]);
  await audit(env, request, actor, prev ? 'page.update' : 'page.create', 'site_pages', route, { status });
  return json({ ok: true, route, ...rec }, prev ? 200 : 201);
}

async function restorePage(request, env, actor, body) {
  const route = normalizeRoute(body.route);
  let snap;
  if (body.revision_id) {
    const r = await env.DB.prepare('SELECT snapshot_json FROM site_page_revisions WHERE id = ? AND route = ?').bind(body.revision_id, route).first();
    if (!r) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    snap = JSON.parse(r.snapshot_json);
    if (!snap.status || ['archived', 'trash'].includes(snap.status)) snap.status = 'draft';
  } else {
    const p = await env.DB.prepare('SELECT * FROM site_pages WHERE route = ?').bind(route).first();
    if (!p) throw new HttpError(404, 'NOT_FOUND', 'Page not found');
    if (!['archived', 'trash'].includes(p.status)) throw new HttpError(400, 'BAD_STATE', 'Page is not archived or in trash');
    snap = { ...p };
  }
  const to = body.status === 'published' ? 'published' : 'draft';
  const res = await savePage(request, env, actor, { ...snap, route, status: to, publish_at: null, note: body.revision_id ? `restore revision ${body.revision_id}` : 'recovered' }, false);
  await audit(env, request, actor, 'page.restore', 'site_pages', route, { status: to, revision_id: body.revision_id || null });
  return res;
}

export async function handlePages(request, env, actor, id) {
  const m = request.method;
  if (id === 'restore') {
    if (m !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return restorePage(request, env, actor, await readJson(request, 2_000_000));
  }
  if (id === 'revisions' && m === 'GET') {
    const route = normalizeRoute(new URL(request.url).searchParams.get('route'));
    const { results } = await env.DB.prepare('SELECT id, route, editor_email, note, created_at FROM site_page_revisions WHERE route = ? ORDER BY id DESC LIMIT 50').bind(route).all();
    return json({ revisions: results || [] });
  }
  if (m === 'GET') { const pages = await listPages(env); return json({ total: pages.length, pages }); }
  if (m === 'POST' || m === 'PUT') return savePage(request, env, actor, await readJson(request, 2_000_000), m === 'POST');
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function onRequest({ request, env }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handlePages(request, env, actor, new URL(request.url).pathname.split('/')[4]);
}
