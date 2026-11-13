// Current affairs + job alerts (table: posts). Routes are mounted by _router.js.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr, slugify, SLUG_RE, isIsoDate, resolveStatus, likeEscape, parsePaging, STATUSES } from '../../_lib/validate.js';

export const POST_TYPES = { 'current-affairs': 'current_affair', jobs: 'job' };
const MEDIA_KEY_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

function cleanTags(v, errors) {
  let arr = v;
  if (typeof v === 'string') arr = v.split(',');
  if (!Array.isArray(arr)) return [];
  const out = [...new Set(arr.map(t => cleanStr(t, 30)).filter(Boolean))];
  if (out.length > 10) { errors.tags = 'At most 10 tags'; return []; }
  if (out.some(t => t.length > 30)) { errors.tags = 'Tags must be 30 characters or fewer'; return []; }
  return out;
}

async function mediaKeyOk(env, key, kind) {
  if (!key) return null;
  if (!MEDIA_KEY_RE.test(key)) return false;
  const row = await env.DB.prepare('SELECT kind FROM media_assets WHERE object_key = ? AND deleted_at IS NULL').bind(key).first();
  return !!row && row.kind === kind;
}

async function normalizePost(env, type, body, existing) {
  const errors = {};
  const v = k => (body[k] !== undefined ? body[k] : existing ? existing[k] : undefined);
  const lim = (field, max, label, opts) => {
    const s = cleanStr(v(field), max, opts);
    if (s === null) { errors[field] = `${label} is required`; return ''; }
    if (s.length > max) { errors[field] = `${label} must be ${max} characters or fewer`; return ''; }
    return s;
  };
  const f = {};
  f.title = lim('title', 200, 'Title', { required: true });
  f.title_or = lim('title_or', 200, 'Odia title');
  f.summary = lim('summary', 500, 'Summary', { multiline: true });
  f.summary_or = lim('summary_or', 500, 'Odia summary', { multiline: true });
  f.body_md = lim('body_md', 50000, 'Body', { multiline: true });
  f.body_md_or = lim('body_md_or', 50000, 'Odia body', { multiline: true });
  f.category = lim('category', 60, 'Category');
  f.tags = JSON.stringify(body.tags !== undefined ? cleanTags(body.tags, errors)
    : existing ? JSON.parse(existing.tags || '[]') : []);

  let slug = body.slug !== undefined ? cleanStr(body.slug, 80) : existing ? existing.slug : '';
  slug = slug ? slug.toLowerCase() : slugify(f.title);
  f.autoSlug = !(body.slug || (existing && existing.slug));
  if (!slug) slug = type === 'job' ? 'job' : 'update';
  if (!SLUG_RE.test(slug) || slug.length > 80) errors.slug = 'Slug may contain lowercase letters, digits and hyphens only';
  f.slug = slug;

  const cover = cleanStr(v('cover_media_key'), 100);
  if (cover) {
    const ok = await mediaKeyOk(env, cover, 'image');
    if (!ok) errors.cover_media_key = 'Cover must be an uploaded image';
  }
  f.cover_media_key = cover || null;

  if (type === 'current_affair') {
    let d = cleanStr(v('event_date'), 10);
    if (!d && !existing) d = new Date().toISOString().slice(0, 10);
    if (d && !isIsoDate(d)) errors.event_date = 'Date must be YYYY-MM-DD';
    f.event_date = d || null;
    Object.assign(f, {
      organisation: null, vacancies: null, qualification: null, last_date: null,
      apply_url: null, notification_media_key: null, state: null,
      age_limit: null, salary_pay: null, source_url: null
    });
  } else {
    f.event_date = null;
    f.organisation = lim('organisation', 120, 'Organisation', { required: true });
    const vac = v('vacancies');
    if (vac === '' || vac === null || vac === undefined) f.vacancies = null;
    else if (!Number.isInteger(Number(vac)) || Number(vac) < 0 || Number(vac) > 10000000) { errors.vacancies = 'Vacancies must be a whole number'; f.vacancies = null; }
    else f.vacancies = Number(vac);
    f.qualification = lim('qualification', 500, 'Qualification', { multiline: true });
    const ld = cleanStr(v('last_date'), 10);
    if (ld && !isIsoDate(ld)) errors.last_date = 'Last date must be YYYY-MM-DD';
    f.last_date = ld || null;
    const url = cleanStr(v('apply_url'), 500);
    if (url) {
      let okUrl = false;
      try { const u = new URL(url); okUrl = u.protocol === 'https:' || u.protocol === 'http:'; } catch {}
      if (!okUrl) errors.apply_url = 'Apply URL must be a valid http(s) link';
    }
    f.apply_url = url || null;
    const pdf = cleanStr(v('notification_media_key'), 100);
    if (pdf) {
      const ok = await mediaKeyOk(env, pdf, 'pdf');
      if (!ok) errors.notification_media_key = 'Notification must be an uploaded PDF';
    }
    f.notification_media_key = pdf || null;
    f.state = lim('state', 60, 'State') || 'Odisha';
    f.age_limit = lim('age_limit', 120, 'Age Limit');
    f.salary_pay = lim('salary_pay', 120, 'Salary / Pay Matrix');
    const srcUrl = cleanStr(v('source_url'), 500);
    if (srcUrl) {
      let okSrc = false;
      try { const u = new URL(srcUrl); okSrc = u.protocol === 'https:' || u.protocol === 'http:'; } catch {}
      if (!okSrc) errors.source_url = 'Source URL must be a valid http(s) link';
    }
    f.source_url = srcUrl || null;
  }

  let goalIds = v('goal_exam_ids');
  if (typeof goalIds === 'string') {
    try { goalIds = JSON.parse(goalIds); } catch { goalIds = goalIds.split(',').map(s => s.trim()).filter(Boolean); }
  }
  f.goal_exam_ids = JSON.stringify(Array.isArray(goalIds) ? [...new Set(goalIds.map(g => cleanStr(g, 60)).filter(Boolean))].slice(0, 12) : []);

  const st = resolveStatus(body, existing, errors);
  f.status = st.status; f.published_at = st.published_at;
  if (Object.keys(errors).length) throw validationError(errors);
  return f;
}

async function uniqueSlug(env, type, slug, auto, excludeId) {
  let candidate = slug;
  for (let n = 0; n < 20; n++) {
    const row = await env.DB.prepare(
      'SELECT id FROM posts WHERE type = ? AND slug = ? AND deleted_at IS NULL AND id != ?'
    ).bind(type, candidate, excludeId || '').first();
    if (!row) return candidate;
    if (!auto) throw validationError({ slug: 'This slug is already in use' });
    candidate = `${slug}-${n + 2}`.slice(0, 80);
  }
  if (auto) {
    const fallback = `${slug.slice(0, 71)}-${crypto.randomUUID().slice(0, 8)}`;
    const row = await env.DB.prepare(
      'SELECT id FROM posts WHERE type = ? AND slug = ? AND deleted_at IS NULL AND id != ?'
    ).bind(type, fallback, excludeId || '').first();
    if (!row) return fallback;
  }
  throw new HttpError(409, 'CONFLICT', 'Could not generate a unique slug');
}

const COLS = ['title', 'title_or', 'summary', 'summary_or', 'body_md', 'body_md_or', 'category', 'tags', 'cover_media_key',
  'event_date', 'organisation', 'vacancies', 'qualification', 'last_date', 'apply_url', 'notification_media_key', 'state',
  'age_limit', 'salary_pay', 'source_url', 'goal_exam_ids', 'status', 'published_at', 'slug'];

function present(row) {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    goal_exam_ids: JSON.parse(row.goal_exam_ids || '[]')
  };
}

export async function handlePosts(request, env, actor, typeKey, id, sub) {
  const type = POST_TYPES[typeKey];
  const method = request.method;
  const url = new URL(request.url);

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url);
      const where = ['type = ?', 'deleted_at IS NULL']; const binds = [type];
      const status = url.searchParams.get('status');
      if (status) {
        if (!STATUSES.includes(status)) throw validationError({ status: 'Unknown status filter' });
        where.push('status = ?'); binds.push(status);
      }
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' OR organisation LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q); binds.push(l, l, l, l);
      }
      const cat = (url.searchParams.get('category') || '').trim().slice(0, 60);
      if (cat) { where.push('category = ?'); binds.push(cat); }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT id, type, slug, title, title_or, category, status, published_at, event_date, organisation, last_date, vacancies, updated_at
         FROM posts WHERE ${w} ORDER BY updated_at DESC, id LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({ items: results, page, limit, total });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const f = await normalizePost(env, type, body, null);
      const slug = await uniqueSlug(env, type, f.slug, f.autoSlug, null);
      const newId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO posts (id, type, ${COLS.join(', ')}, created_by, updated_by)
         VALUES (?, ?, ${COLS.map(() => '?').join(', ')}, ?, ?)`
      ).bind(newId, type, ...COLS.map(c => (c === 'slug' ? slug : f[c])), actor.userId, actor.userId).run();
      let goalAlertCount = 0;
      if (body.send_goal_alert && f.status === 'published') {
        await env.DB.prepare(`UPDATE posts SET alert_sent_at = datetime('now') WHERE id = ?`).bind(newId).run().catch(() => {});
        const subRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').first().catch(() => ({ n: 0 }));
        goalAlertCount = subRow ? subRow.n : 0;
        await audit(env, request, actor, `${type}.goal_alert`, 'post', newId, { title: f.title, subscribers: goalAlertCount });
      }
      await audit(env, request, actor, `${type}.create`, 'post', newId, { title: f.title, status: f.status });
      return json({ id: newId, slug, goal_alert_queued: goalAlertCount }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const existing = await env.DB.prepare('SELECT * FROM posts WHERE id = ? AND type = ? AND deleted_at IS NULL').bind(id, type).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Item not found');

  if (sub === 'status' && method === 'POST') {
    const body = await readJson(request);
    const errors = {};
    const st = resolveStatus({ status: body.status, published_at: body.published_at }, existing, errors);
    if (Object.keys(errors).length) throw validationError(errors);
    await env.DB.prepare('UPDATE posts SET status = ?, published_at = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(st.status, st.published_at, actor.userId, id).run();
    await audit(env, request, actor, `${type}.${st.status}`, 'post', id, { title: existing.title, published_at: st.published_at });
    return json({ id, status: st.status, published_at: st.published_at });
  }
  if (sub) throw new HttpError(404, 'NOT_FOUND', 'Unknown route');

  if (method === 'GET') return json(present(existing));
  if (method === 'PUT') {
    const body = await readJson(request);
    const f = await normalizePost(env, type, body, existing);
    const slug = await uniqueSlug(env, type, f.slug, false, id);
    await env.DB.prepare(
      `UPDATE posts SET ${COLS.map(c => `${c} = ?`).join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(...COLS.map(c => (c === 'slug' ? slug : f[c])), actor.userId, id).run();
    let goalAlertCount = 0;
    if (body.send_goal_alert && f.status === 'published') {
      await env.DB.prepare(`UPDATE posts SET alert_sent_at = datetime('now') WHERE id = ?`).bind(id).run().catch(() => {});
      const subRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').first().catch(() => ({ n: 0 }));
      goalAlertCount = subRow ? subRow.n : 0;
      await audit(env, request, actor, `${type}.goal_alert`, 'post', id, { title: f.title, subscribers: goalAlertCount });
    }
    await audit(env, request, actor, `${type}.update`, 'post', id, { title: f.title, status: f.status });
    return json({ id, slug, goal_alert_queued: goalAlertCount });
  }
  if (method === 'DELETE') {
    await env.DB.prepare('UPDATE posts SET deleted_at = datetime(\'now\'), updated_by = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(actor.userId, id).run();
    await audit(env, request, actor, `${type}.delete`, 'post', id, { title: existing.title });
    return json({ id, deleted: true });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
