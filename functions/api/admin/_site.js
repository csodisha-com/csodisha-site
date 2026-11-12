// Admin endpoints added for the Master Command Suite: homepage banner, resources
// (syllabus / PYQ), media library, incidents and richer candidate listing.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr, parsePaging, likeEscape } from '../../_lib/validate.js';
import { readLastCronRun } from './_cron.js';

const MEDIA_KEY_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;
export const BANNER_KEY = 'homepage_banner';
const SEVERITIES = ['info', 'notice', 'urgent'];
const INCIDENT_LEVELS = ['low', 'medium', 'high', 'critical'];
export const RESOURCE_KINDS = ['syllabus', 'pyq'];

export function defaultBanner() {
  return { active: false, headline: '', context: '', severity: 'info', ctaText: '', ctaUrl: '', updatedAt: null };
}

export async function readBanner(env) {
  const row = await env.DB.prepare('SELECT value_json, updated_at FROM site_settings WHERE key = ?').bind(BANNER_KEY).first();
  if (!row) return defaultBanner();
  try { return { ...defaultBanner(), ...JSON.parse(row.value_json), updatedAt: row.updated_at }; } catch { return defaultBanner(); }
}

function safeLink(u) {
  if (!u) return true;
  if (u.startsWith('/') && !u.startsWith('//') && !u.includes('\\')) return true;
  try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:'; } catch { return false; }
}

export async function handleBanner(request, env, actor) {
  if (request.method === 'GET') return json(await readBanner(env));
  if (request.method !== 'PUT') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  const body = await readJson(request, 20000);
  const errors = {};
  const headline = cleanStr(body.headline, 160);
  if (headline.length > 160) errors.headline = 'Headline must be 160 characters or fewer';
  const context = cleanStr(body.context, 300);
  if (context.length > 300) errors.context = 'Context must be 300 characters or fewer';
  const ctaText = cleanStr(body.ctaText, 40);
  if (ctaText.length > 40) errors.ctaText = 'Button text must be 40 characters or fewer';
  const ctaUrl = cleanStr(body.ctaUrl, 500);
  if (!safeLink(ctaUrl)) errors.ctaUrl = 'Link must be a site path (/…) or an http(s) URL';
  if (ctaUrl && !ctaText) errors.ctaText = 'Add button text for the link';
  const severity = body.severity === undefined ? 'info' : String(body.severity);
  if (!SEVERITIES.includes(severity)) errors.severity = 'Severity must be info, notice or urgent';
  const active = body.active === true;
  if (active && !headline) errors.headline = 'A headline is required to activate the banner';
  if (Object.keys(errors).length) throw validationError(errors);
  const value = { active, headline, context, severity, ctaText, ctaUrl };
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  ).bind(BANNER_KEY, JSON.stringify(value), actor.userId).run();
  await audit(env, request, actor, active ? 'banner.publish' : 'banner.deactivate', 'site_settings', BANNER_KEY, { headline, severity });
  return json(await readBanner(env));
}

/* ---------- resources (syllabus / pyq) ---------- */
async function normalizeResource(env, body, existing) {
  const errors = {};
  const v = k => (body[k] !== undefined ? body[k] : existing ? existing[k] : undefined);
  const kind = String(v('kind') || '');
  if (!RESOURCE_KINDS.includes(kind)) errors.kind = 'Kind must be syllabus or pyq';
  const title = cleanStr(v('title'), 200, { required: true });
  if (title === null) errors.title = 'Title is required'; else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer';
  const exam = cleanStr(v('exam'), 100); if (exam.length > 100) errors.exam = 'Exam must be 100 characters or fewer';
  const description = cleanStr(v('description'), 500, { multiline: true }); if (description.length > 500) errors.description = 'Description must be 500 characters or fewer';
  let year = v('year');
  if (year === '' || year === null || year === undefined) year = null;
  else if (!Number.isInteger(Number(year)) || Number(year) < 1990 || Number(year) > 2100) { errors.year = 'Year must be between 1990 and 2100'; year = null; }
  else year = Number(year);
  const key = cleanStr(v('media_key'), 100);
  if (!key) errors.media_key = 'Upload a PDF or image first';
  else if (!MEDIA_KEY_RE.test(key) || !(await env.DB.prepare('SELECT 1 AS ok FROM media_assets WHERE object_key = ? AND deleted_at IS NULL').bind(key).first())) errors.media_key = 'File must be an uploaded media asset';
  const status = v('status') === undefined ? 'draft' : String(v('status'));
  if (!['draft', 'published'].includes(status)) errors.status = 'Status must be draft or published';
  if (Object.keys(errors).length) throw validationError(errors);
  return { kind, title, exam, description, year, media_key: key, status };
}

const RES_COLS = 'id, kind, title, exam, year, description, media_key, status, published_at, updated_at';

export async function handleResources(request, env, actor, id) {
  const method = request.method; const url = new URL(request.url);
  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url);
      const where = ['deleted_at IS NULL']; const binds = [];
      const kind = url.searchParams.get('kind');
      if (kind) { if (!RESOURCE_KINDS.includes(kind)) throw validationError({ kind: 'Unknown kind' }); where.push('kind = ?'); binds.push(kind); }
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) { where.push("(title LIKE ? ESCAPE '\\' OR exam LIKE ? ESCAPE '\\')"); const l = likeEscape(q); binds.push(l, l); }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM resources WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(`SELECT ${RES_COLS} FROM resources WHERE ${w} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all();
      return json({ items: results.map(r => ({ ...r, file_url: `/api/media/${r.media_key}` })), page, limit, total });
    }
    if (method === 'POST') {
      const f = await normalizeResource(env, await readJson(request), null);
      const newId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO resources (id, kind, title, exam, year, description, media_key, status, published_at, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${f.status === 'published' ? "datetime('now')" : 'NULL'}, ?, ?)`
      ).bind(newId, f.kind, f.title, f.exam, f.year, f.description, f.media_key, f.status, actor.userId, actor.userId).run();
      await audit(env, request, actor, `resource.create`, 'resource', newId, { kind: f.kind, title: f.title, status: f.status });
      return json({ id: newId }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }
  const existing = await env.DB.prepare('SELECT * FROM resources WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Resource not found');
  if (method === 'GET') return json({ ...existing, file_url: `/api/media/${existing.media_key}` });
  if (method === 'PUT') {
    const f = await normalizeResource(env, await readJson(request), existing);
    const publishedAt = f.status === 'published' ? (existing.published_at || null) : null;
    await env.DB.prepare(
      `UPDATE resources SET kind = ?, title = ?, exam = ?, year = ?, description = ?, media_key = ?, status = ?,
         published_at = ${f.status === 'published' && !publishedAt ? "datetime('now')" : '?'}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(...[f.kind, f.title, f.exam, f.year, f.description, f.media_key, f.status,
      ...(f.status === 'published' && !publishedAt ? [] : [publishedAt]), actor.userId, id]).run();
    await audit(env, request, actor, 'resource.update', 'resource', id, { kind: f.kind, title: f.title, status: f.status });
    return json({ id });
  }
  if (method === 'DELETE') {
    await env.DB.prepare("UPDATE resources SET deleted_at = datetime('now'), updated_by = ?, updated_at = datetime('now') WHERE id = ?").bind(actor.userId, id).run();
    await audit(env, request, actor, 'resource.delete', 'resource', id, { title: existing.title });
    return json({ id, deleted: true });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ---------- media library ---------- */
export async function handleMediaList(request, env) {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaging(url, 24, 100);
  const where = ['deleted_at IS NULL']; const binds = [];
  const kind = url.searchParams.get('kind');
  if (kind) { if (!['image', 'pdf'].includes(kind)) throw validationError({ kind: 'Unknown kind' }); where.push('kind = ?'); binds.push(kind); }
  const w = where.join(' AND ');
  const agg = await env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS bytes FROM media_assets WHERE ${w}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT id, object_key, kind, mime_type, size_bytes, original_name, created_at FROM media_assets WHERE ${w} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ items: results.map(r => ({ ...r, url: `/api/media/${r.object_key}` })), page, limit, total: agg.n, total_bytes: agg.bytes });
}

/* ---------- incidents (stored in audit_log) ---------- */
export async function handleIncidents(request, env, actor, id, sub) {
  const method = request.method;
  if (!id && method === 'GET') {
    const url = new URL(request.url);
    const { page, limit, offset } = parsePaging(url, 25, 100);
    const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'incident.%' AND action != 'incident.resolved'").first()).n;
    const { results } = await env.DB.prepare(
      `SELECT a.id, a.action, a.metadata_json, a.created_at, u.email AS actor_email,
         EXISTS (SELECT 1 FROM audit_log r WHERE r.action = 'incident.resolved' AND r.target_id = CAST(a.id AS TEXT)) AS resolved
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.action LIKE 'incident.%' AND a.action != 'incident.resolved' ORDER BY a.id DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    const items = results.map(r => {
      let m = {}; try { m = JSON.parse(r.metadata_json || '{}'); } catch {}
      return { id: r.id, severity: r.action.slice('incident.'.length), title: m.title || '', details: m.details || '', actor_email: r.actor_email, created_at: r.created_at, resolved: !!r.resolved };
    });
    const open = (await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM audit_log a WHERE a.action LIKE 'incident.%' AND a.action != 'incident.resolved'
       AND NOT EXISTS (SELECT 1 FROM audit_log r WHERE r.action = 'incident.resolved' AND r.target_id = CAST(a.id AS TEXT))`
    ).first()).n;
    return json({ items, page, limit, total, open });
  }
  if (!id && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const severity = String(body.severity || '');
    if (!INCIDENT_LEVELS.includes(severity)) errors.severity = 'Severity must be low, medium, high or critical';
    const title = cleanStr(body.title, 150, { required: true });
    if (title === null) errors.title = 'Title is required'; else if (title.length > 150) errors.title = 'Title must be 150 characters or fewer';
    const details = cleanStr(body.details, 2000, { multiline: true });
    if (details.length > 2000) errors.details = 'Details must be 2000 characters or fewer';
    if (Object.keys(errors).length) throw validationError(errors);
    await audit(env, request, actor, `incident.${severity}`, 'incident', null, { title, details });
    const row = await env.DB.prepare("SELECT id FROM audit_log WHERE actor_user_id = ? AND action = ? ORDER BY id DESC LIMIT 1").bind(actor.userId, `incident.${severity}`).first();
    return json({ id: row ? row.id : null }, 201);
  }
  if (id && sub === 'resolve' && method === 'POST') {
    const inc = await env.DB.prepare("SELECT id, action FROM audit_log WHERE id = ? AND action LIKE 'incident.%' AND action != 'incident.resolved'").bind(id).first();
    if (!inc) throw new HttpError(404, 'NOT_FOUND', 'Incident not found');
    await audit(env, request, actor, 'incident.resolved', 'incident', String(inc.id), { note: cleanStr((await readJson(request, 5000)).note, 500) });
    return json({ id: inc.id, resolved: true });
  }
  throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
}

/* ---------- richer telemetry ---------- */
export async function extraStats(env) {
  const one = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first());
  const now = Math.floor(Date.now() / 1000);
  const [users, staff, new7, new1, sessions, audit24, media, res, incidents, attempts, bookmarks, banner, lastCronRun] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM users'),
    one("SELECT COUNT(*) AS n FROM users WHERE role IN ('editor','admin')"),
    one('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', now - 7 * 86400),
    one('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', now - 86400),
    one('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?', now),
    one("SELECT COUNT(*) AS n FROM audit_log WHERE created_at >= datetime('now', '-1 day')"),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS bytes FROM media_assets WHERE deleted_at IS NULL'),
    one("SELECT COUNT(*) AS n, SUM(status = 'published') AS live FROM resources WHERE deleted_at IS NULL"),
    one(`SELECT COUNT(*) AS n FROM audit_log a WHERE a.action LIKE 'incident.%' AND a.action != 'incident.resolved'
         AND NOT EXISTS (SELECT 1 FROM audit_log r WHERE r.action = 'incident.resolved' AND r.target_id = CAST(a.id AS TEXT))`),
    one('SELECT COUNT(*) AS n FROM test_attempts').catch(() => ({ n: 0 })),
    one('SELECT COUNT(*) AS n FROM user_bookmarks').catch(() => ({ n: 0 })),
    readBanner(env),
    readLastCronRun(env)
  ]);
  return {
    accounts: { total: users.n, staff: staff.n, new_7d: new7.n, new_24h: new1.n, active_sessions: sessions.n },
    audit_24h: audit24.n,
    media: { total: media.n, bytes: media.bytes },
    resources: { total: res.n, live: res.live || 0 },
    open_incidents: incidents.n,
    attempts_total: attempts ? attempts.n : 0,
    bookmarks_total: bookmarks ? bookmarks.n : 0,
    banner: { active: banner.active, headline: banner.headline, severity: banner.severity, updated_at: banner.updatedAt },
    last_cron_run: lastCronRun
  };
}
