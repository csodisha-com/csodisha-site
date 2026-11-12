// /api/admin/* dispatcher. Every route is gated by requireRole() (and CSRF for writes).
import { HttpError, json, errorResponse, readJson, validationError, clientIp } from '../../_lib/http.js';
import { requireRole, rateLimit, audit, STAFF_ROLES, ALL_ROLES } from '../../_lib/rbac.js';
import { renderMarkdown } from '../../_lib/markdown.js';
import { parsePaging, likeEscape } from '../../_lib/validate.js';
import { handlePosts, POST_TYPES } from './_posts.js';
import { handleMockTests, handleQuestion } from './_mock.js';
import { handleUpload } from './_media.js';
import { handleBanner, handleResources, handleMediaList, handleIncidents, extraStats } from './_site.js';
import { runLifecycleMaintenance, readLastCronRun } from './_cron.js';

export async function handleAdminApi(request, env) {
  try {
    if (!env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const [resource, id, sub] = parts;
    const method = request.method;
    const write = method !== 'GET' && method !== 'HEAD';

    // Admin-only: user role management.
    if (resource === 'users') {
      const actor = await requireRole(request, env, ['admin']);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      return await handleUsers(request, env, actor, id, sub);
    }

    // Admin-only: manual lifecycle & D1 maintenance trigger.
    if (resource === 'maintenance') {
      if (id === 'run') {
        if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
        const actor = await requireRole(request, env, ['admin']);
        await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
        const summary = await runLifecycleMaintenance(env, { actorId: actor.userId, ipAddress: clientIp(request) });
        return json({ ok: true, ...summary, last_cron_run: summary });
      }
      if (!id && method === 'GET') {
        await requireRole(request, env, STAFF_ROLES);
        return json({ last_cron_run: await readLastCronRun(env) });
      }
      throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
    }

    const actor = await requireRole(request, env, STAFF_ROLES);
    if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);

    switch (resource) {
      case 'session':
        return json({ user: { id: actor.userId, email: actor.email, role: actor.role } });
      case 'stats':
        return await handleStats(env);
      case 'audit':
        return await handleAudit(request, env);
      case 'preview': {
        if (method !== 'POST') break;
        const body = await readJson(request, 200000);
        return json({ html: renderMarkdown(body.markdown || '') });
      }
      case 'current-affairs':
      case 'jobs':
        return await handlePosts(request, env, actor, resource, id, sub);
      case 'mock-tests':
        return await handleMockTests(request, env, actor, id, sub);
      case 'questions':
        if (id && !sub) return await handleQuestion(request, env, actor, id);
        break;
      case 'banner':
        if (!id) return await handleBanner(request, env, actor);
        break;
      case 'resources':
        if (!sub) return await handleResources(request, env, actor, id);
        break;
      case 'incidents':
        return await handleIncidents(request, env, actor, id, sub);
      case 'media':
        if (!id && method === 'GET') return await handleMediaList(request, env);
        if (id === 'upload' && method === 'POST') {
          await rateLimit(env, `admin-upload:${actor.userId}`, 30, 600);
          return await handleUpload(request, env, actor);
        }
        break;
    }
    throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
  } catch (e) {
    return errorResponse(e);
  }
}

async function handleStats(env) {
  const one = async sql => (await env.DB.prepare(sql).first()).n;
  const [ca, caPub, jobs, jobsPub, jobsExp, tests, testsPub, scheduled] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM posts WHERE type='current_affair' AND deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='current_affair' AND deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='job' AND deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='job' AND deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='job' AND deleted_at IS NULL AND status='expired'"),
    one('SELECT COUNT(*) AS n FROM mock_tests WHERE deleted_at IS NULL'),
    one("SELECT COUNT(*) AS n FROM mock_tests WHERE deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))"),
    one("SELECT (SELECT COUNT(*) FROM posts WHERE status='scheduled' AND published_at > datetime('now') AND deleted_at IS NULL) + (SELECT COUNT(*) FROM mock_tests WHERE status='scheduled' AND published_at > datetime('now') AND deleted_at IS NULL) AS n")
  ]);
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata_json, a.created_at, u.email AS actor_email
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.id DESC LIMIT 10`
  ).all();
  const extra = await extraStats(env);
  return json({
    ...extra,
    current_affairs: { total: ca, live: caPub }, jobs: { total: jobs, live: jobsPub, expired: jobsExp },
    mock_tests: { total: tests, live: testsPub }, scheduled_pending: scheduled, recent_audit: results
  });
}

async function handleAudit(request, env) {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaging(url, 25, 100);
  const kind = url.searchParams.get('kind') || 'all';
  const KINDS = {
    all: '1=1', incident: "a.action LIKE 'incident.%'", security: "(a.action LIKE 'incident.%' OR a.action LIKE 'user.%')",
    content: "a.action NOT LIKE 'incident.%' AND a.action NOT LIKE 'user.%'"
  };
  if (!KINDS[kind]) throw validationError({ kind: 'Unknown filter' });
  const where = [KINDS[kind]]; const binds = [];
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (q) { where.push("(a.action LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')"); const l = likeEscape(q); binds.push(l, l); }
  const w = where.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id WHERE ${w}`).bind(...binds).first()).n;
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at, u.email AS actor_email
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id WHERE ${w} ORDER BY a.id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ items: results, page, limit, total });
}

async function handleUsers(request, env, actor, id, sub) {
  const url = new URL(request.url);
  if (!id && request.method === 'GET') {
    const { page, limit, offset } = parsePaging(url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const role = url.searchParams.get('role');
    const where = []; const binds = [];
    if (q) {
      where.push("(u.email LIKE ? ESCAPE '\\' OR c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.district LIKE ? ESCAPE '\\')");
      const l = likeEscape(q); binds.push(l, l, l, l);
    }
    if (role) {
      if (!ALL_ROLES.includes(role)) throw validationError({ role: 'Unknown role' });
      where.push('u.role = ?'); binds.push(role);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const from = 'FROM users u LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email';
    const total = (await env.DB.prepare(`SELECT COUNT(DISTINCT u.id) AS n ${from} ${w}`).bind(...binds).first()).n;
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.email, u.role, u.created_at, MAX(c.full_name) AS full_name, MAX(c.phone) AS phone, MAX(c.district) AS district,
         MAX(c.last_login_at) AS last_login_at
       ${from} ${w} GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();
    return json({ items: results, page, limit, total });
  }
  if (id && sub === 'role' && request.method === 'PUT') {
    const body = await readJson(request, 10000);
    if (!ALL_ROLES.includes(body.role)) throw validationError({ role: 'Role must be candidate, editor or admin' });
    const target = await env.DB.prepare('SELECT id, email, role FROM users WHERE id = ?').bind(id).first();
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'User not found');
    if (target.id === actor.userId && body.role !== 'admin') {
      throw new HttpError(409, 'CONFLICT', 'You cannot remove your own admin role');
    }
    await env.DB.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").bind(body.role, Math.floor(Date.now() / 1000), id).run();
    await audit(env, request, actor, 'user.role_change', 'user', id, { email: target.email, from: target.role, to: body.role });
    return json({ id, role: body.role });
  }
  throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
}
