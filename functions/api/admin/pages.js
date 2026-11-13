// Real-time Website Pages & Builder API (RBAC + CSRF enforced by requireRole).
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { requireRole, audit, STAFF_ROLES } from '../../_lib/rbac.js';
import { PAGE_STATUSES, normalizeRoute } from '../../_lib/site-pages.js';
import manifest from '../../../admin/site-manifest.json';

const ROUTE_RE = /^\/[a-z0-9\-_/.]*$/i;
const cut = (v, n) => v == null ? null : String(v).trim().slice(0, n);
const jsonStr = v => v == null ? null : (typeof v === 'string' ? v : JSON.stringify(v));

let schemaReady = false;
async function ensureSitePagesSchema(db) {
  if (schemaReady || !db) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS site_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL UNIQUE,
      title TEXT, meta_description TEXT, category TEXT,
      hero_title TEXT, hero_subtitle TEXT, cta_label TEXT, cta_url TEXT,
      blocks_json TEXT, reusable_sections_json TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      publish_at TEXT, created_by TEXT, updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_site_pages_status ON site_pages(status, publish_at)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS site_page_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL, snapshot_json TEXT NOT NULL, editor_email TEXT, note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_site_page_rev_route ON site_page_revisions(route, id DESC)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS site_redirects (
      old_route TEXT PRIMARY KEY,
      new_route TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  ]);
  schemaReady = true;
}

async function getManifestPages(request, env) {
  if (manifest && Array.isArray(manifest.pages)) return manifest.pages;
  try {
    if (env && env.ASSETS && request) {
      const r = await env.ASSETS.fetch(new URL('/admin/site-manifest.json', request.url));
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.pages)) return d.pages;
      }
    }
  } catch {}
  return [];
}

async function listPages(request, env) {
  const manifestPages = await getManifestPages(request, env);
  const { results: rows } = await env.DB.prepare('SELECT * FROM site_pages').all();
  const { results: revs } = await env.DB.prepare('SELECT route, COUNT(*) AS n FROM site_page_revisions GROUP BY route').all();
  const rc = Object.fromEntries((revs || []).map(r => [r.route, r.n]));
  const live = new Map((rows || []).map(r => [r.route, r]));
  const out = [];
  for (const p of manifestPages) {
    const o = live.get(p.route); live.delete(p.route);
    out.push({ route: p.route, file: p.file, source: o ? 'override' : 'static',
      title: o?.title || p.title, meta_description: o?.meta_description ?? p.description, category: o?.category || p.category,
      hero_title: o?.hero_title || '', hero_subtitle: o?.hero_subtitle || '', cta_label: o?.cta_label || '', cta_url: o?.cta_url || '',
      blocks_json: o?.blocks_json || '[]', reusable_sections_json: o?.reusable_sections_json || '[]',
      status: o?.status || 'published', publish_at: o?.publish_at || null, updated_at: o?.updated_at || p.lastModified,
      updated_by: o?.updated_by || null, revisions: rc[p.route] || 0 });
  }
  live.delete('/__sitewide');
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
  const oldRoute = body.old_route ? normalizeRoute(body.old_route) : null;
  if (oldRoute && oldRoute !== route && ROUTE_RE.test(oldRoute)) {
    const oldRow = await env.DB.prepare('SELECT * FROM site_pages WHERE route = ?').bind(oldRoute).first();
    const targetExists = await env.DB.prepare('SELECT 1 FROM site_pages WHERE route = ?').bind(route).first();
    if (oldRow && !targetExists) {
      await env.DB.prepare('UPDATE site_pages SET route = ? WHERE route = ?').bind(route, oldRoute).run();
    }
    if (body.create_redirect !== false) {
      await env.DB.prepare('INSERT OR REPLACE INTO site_redirects (old_route, new_route, created_by) VALUES (?,?,?)')
        .bind(oldRoute, route, actor.email || actor.userId || null).run();
      await audit(env, request, actor, 'page.redirect', 'site_redirects', oldRoute, { to: route });
    }
  }
  const prev = await env.DB.prepare('SELECT * FROM site_pages WHERE route = ?').bind(route).first();
  const manifestPages = await getManifestPages(request, env);
  const m = manifestPages.find(p => p.route === route);
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
      .bind(route, JSON.stringify({ route, ...rec }), actor.email || null, cut(body.note, 200) || (prev ? 'update' : 'create')),
    env.DB.prepare('DELETE FROM site_page_revisions WHERE route = ? AND id NOT IN (SELECT id FROM site_page_revisions WHERE route = ? ORDER BY id DESC LIMIT 10)')
      .bind(route, route)
  ]);
  await audit(env, request, actor, prev ? 'page.update' : 'page.create', 'site_pages', route, { status });
  return json({ ok: true, route, redirect_from: (oldRoute && oldRoute !== route && body.create_redirect !== false) ? oldRoute : null, ...rec }, prev ? 200 : 201);
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
  try {
    await ensureSitePagesSchema(env.DB);
    const m = request.method;
    if (id === 'restore') {
      if (m !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
      return restorePage(request, env, actor, await readJson(request, 2_000_000));
    }
    if (id === 'revisions' && m === 'GET') {
      const u = new URL(request.url);
      const rawRoute = u.searchParams.get('route');
      if (!rawRoute || u.searchParams.get('all') === '1') {
        const { results } = await env.DB.prepare('SELECT id, route, snapshot_json, editor_email, note, created_at FROM site_page_revisions ORDER BY id DESC LIMIT 40').all();
        return json({ revisions: results || [] });
      }
      const route = normalizeRoute(rawRoute);
      const { results } = await env.DB.prepare('SELECT id, route, snapshot_json, editor_email, note, created_at FROM site_page_revisions WHERE route = ? ORDER BY id DESC LIMIT 25').bind(route).all();
      return json({ revisions: results || [] });
    }
    if (id === 'prune-revisions' && m === 'POST') {
      const body = await readJson(request, 64_000);
      const route = normalizeRoute(body.route);
      const keep = Math.max(1, Math.min(50, Number(body.keep) || 10));
      await env.DB.prepare('DELETE FROM site_page_revisions WHERE route = ? AND id NOT IN (SELECT id FROM site_page_revisions WHERE route = ? ORDER BY id DESC LIMIT ?)').bind(route, route, keep).run();
      await audit(env, request, actor, 'page.prune_revisions', 'site_page_revisions', route, { keep });
      return json({ ok: true, route, keep });
    }
    if (id === 'redirects') {
      if (m === 'GET') {
        const { results } = await env.DB.prepare('SELECT old_route, new_route, created_by, created_at FROM site_redirects ORDER BY created_at DESC').all();
        return json({ redirects: results || [] });
      }
      if (m === 'POST') {
        const body = await readJson(request, 64_000);
        const oldR = normalizeRoute(body.old_route);
        if (body.action === 'delete') {
          await env.DB.prepare('DELETE FROM site_redirects WHERE old_route = ?').bind(oldR).run();
          await audit(env, request, actor, 'page.redirect_delete', 'site_redirects', oldR, {});
          return json({ ok: true, deleted: oldR });
        }
        const newR = normalizeRoute(body.new_route || '/');
        await env.DB.prepare('INSERT OR REPLACE INTO site_redirects (old_route, new_route, created_by) VALUES (?,?,?)').bind(oldR, newR, actor.email).run();
        await audit(env, request, actor, 'page.redirect', 'site_redirects', oldR, { to: newR });
        return json({ ok: true, old_route: oldR, new_route: newR });
      }
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }
    if (m === 'DELETE') {
      const body = await readJson(request, 64_000);
      const route = normalizeRoute(body.route);
      await env.DB.prepare('DELETE FROM site_pages WHERE route = ?').bind(route).run();
      await env.DB.prepare('DELETE FROM site_page_revisions WHERE route = ?').bind(route).run();
      if (body.redirect_to) {
        const target = normalizeRoute(body.redirect_to);
        await env.DB.prepare('INSERT OR REPLACE INTO site_redirects (old_route, new_route, created_by) VALUES (?,?,?)').bind(route, target, actor.email).run();
      }
      await audit(env, request, actor, 'page.purge', 'site_pages', route, { redirect_to: body.redirect_to || null });
      return json({ ok: true, purged: route });
    }
    if (m === 'GET' && id === 'sitewide') { const r = await env.DB.prepare("SELECT reusable_sections_json FROM site_pages WHERE route = '/__sitewide'").first(); return json({ sections: JSON.parse(r?.reusable_sections_json || '[]') }); }
    if (m === 'GET') { const pages = await listPages(request, env); return json({ total: pages.length, pages }); }
    if (m === 'POST' || m === 'PUT') return savePage(request, env, actor, await readJson(request, 2_000_000), m === 'POST');
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  } catch (err) {
    if (err instanceof HttpError) throw err;
    return json({ error: err?.message || 'Internal server error' }, 500);
  }
}

export async function onRequest({ request, env }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handlePages(request, env, actor, new URL(request.url).pathname.split('/')[4]);
}
