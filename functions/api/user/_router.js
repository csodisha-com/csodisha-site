// Authenticated Candidate Progress & Cross-Device Bookmarks API (/api/user/*)
import { HttpError, json, readJson, validationError, errorResponse } from '../../_lib/http.js';
import { ALL_ROLES, requireRole, rateLimit } from '../../_lib/rbac.js';
import { cleanStr } from '../../_lib/validate.js';
import { enforceCandidateControls, logCandidateAudit } from '../../_lib/candidate-controls.js';

export const BOOKMARK_TYPES = ['job', 'current-affair', 'mock-test', 'resource'];

const LEGACY_TYPE_MAP = {
  job: 'job',
  jobs: 'job',
  'current-affair': 'current-affair',
  'current-affairs': 'current-affair',
  current_affair: 'current_affair',
  'mock-test': 'mock-test',
  'mock-tests': 'mock-test',
  mock_test: 'mock-test',
  resource: 'resource',
  resources: 'resource',
  study: 'resource',
  schemes: 'resource'
};

function safeUrl(u) {
  if (!u || typeof u !== 'string') return false;
  if (u.startsWith('/') && !u.startsWith('//') && !u.includes('\\')) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseMeta(metaJson) {
  if (!metaJson) return {};
  try {
    const parsed = JSON.parse(metaJson);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function serializeMeta(metaInput) {
  if (metaInput === undefined || metaInput === null || metaInput === '') return null;
  if (typeof metaInput === 'string') {
    try {
      const parsed = JSON.parse(metaInput);
      const s = JSON.stringify(parsed);
      return s.length <= 2000 ? s : s.slice(0, 2000);
    } catch {
      return JSON.stringify({ note: cleanStr(metaInput, 300) });
    }
  }
  if (typeof metaInput === 'object') {
    try {
      const s = JSON.stringify(metaInput);
      return s.length <= 2000 ? s : null;
    } catch {
      return null;
    }
  }
  return null;
}

function formatBookmarkRow(r) {
  const meta = parseMeta(r.meta_json);
  return {
    item_type: r.item_type,
    itemType: r.item_type,
    item_id: r.item_id,
    itemId: r.item_id,
    title: r.title,
    url: r.url,
    meta,
    meta_json: r.meta_json,
    created_at: r.created_at,
    createdAt: r.created_at
  };
}

function validateBookmarkInput(raw, { allowLegacyAlias = false } = {}) {
  const errors = {};
  const rawType = String(raw.item_type || raw.itemType || raw.type || '').trim();
  const item_type = allowLegacyAlias ? (LEGACY_TYPE_MAP[rawType] || '') : (BOOKMARK_TYPES.includes(rawType) ? rawType : '');
  if (!BOOKMARK_TYPES.includes(item_type)) {
    errors.item_type = 'item_type must be job, current-affair, mock-test or resource';
  }

  const item_id = cleanStr(raw.item_id ?? raw.itemId ?? raw.id, 160, { required: true });
  if (!item_id) errors.item_id = 'item_id is required';
  else if (item_id.length > 160) errors.item_id = 'item_id must be 160 characters or fewer';

  const title = cleanStr(raw.title, 300, { required: true });
  if (!title) errors.title = 'title is required';
  else if (title.length > 300) errors.title = 'title must be 300 characters or fewer';

  const url = cleanStr(raw.url, 500, { required: true });
  if (!url || !safeUrl(url)) {
    errors.url = 'url must be a valid site path (/…) or http(s) URL';
  } else if (url.length > 500) {
    errors.url = 'url must be 500 characters or fewer';
  }

  let metaSource = raw.meta !== undefined ? raw.meta : raw.meta_json;
  if (metaSource === undefined && raw.badge) {
    metaSource = { badge: cleanStr(raw.badge, 100) };
  }
  const meta_json = serializeMeta(metaSource);

  return { errors, value: { item_type, item_id, title, url, meta_json } };
}

async function listUserBookmarks(env, userId, typeFilter = '') {
  const binds = [userId];
  let where = 'user_id = ?';
  if (typeFilter && BOOKMARK_TYPES.includes(typeFilter)) {
    where += ' AND item_type = ?';
    binds.push(typeFilter);
  }
  const { results } = await env.DB.prepare(
    `SELECT item_type, item_id, title, url, meta_json, created_at
     FROM user_bookmarks
     WHERE ${where}
     ORDER BY created_at DESC, rowid DESC
     LIMIT 200`
  ).bind(...binds).all();
  return results.map(formatBookmarkRow);
}

export async function handleUserApi(request, env) {
  if (!env.DB) return json({ error: 'Database unavailable', code: 'NO_DATABASE' }, 500);
  try {
    const actor = await requireRole(request, env, ALL_ROLES);
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/api\/user\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const [resource, seg1, seg2] = parts;
    const isWrite = request.method !== 'GET' && request.method !== 'HEAD';

    const permNeeded = (isWrite && resource === 'bookmarks') ? 'canBookmark' : null;
    const controls = await enforceCandidateControls(env, actor.userId, { isWrite, permission: permNeeded });

    if (isWrite) {
      await rateLimit(env, `user-write:${actor.userId}`, 60, 60);
    }

    // POST /api/user/profile
    if (resource === 'profile' && !seg1) {
      if (request.method !== 'POST') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
      }
      await enforceCandidateControls(env, actor.userId, { isWrite: true, permission: 'canEditProfile' });
      const body = await readJson(request, 20000);
      const full_name = cleanStr(body.fullName || body.full_name || body.name, 120, { required: true });
      const phone = cleanStr(body.phone || body.mobile, 20) || '';
      const district = cleanStr(body.district, 80, { required: true });
      if (!full_name || !district) {
        throw validationError({ full_name: !full_name ? 'Name is required' : undefined, district: !district ? 'District is required' : undefined });
      }
      const streams = Array.isArray(body.targetExams || body.targetStreams)
        ? (body.targetExams || body.targetStreams).map(s => cleanStr(s, 80)).filter(Boolean).slice(0, 20)
        : null;

      if (streams) {
        await env.DB.prepare(
          'UPDATE candidates SET full_name = ?, phone = ?, district = ?, target_streams = ? WHERE id = ? OR email = ?'
        ).bind(full_name, phone, district, JSON.stringify(streams), actor.userId, actor.email).run();
      } else {
        await env.DB.prepare(
          'UPDATE candidates SET full_name = ?, phone = ?, district = ? WHERE id = ? OR email = ?'
        ).bind(full_name, phone, district, actor.userId, actor.email).run();
      }

      await logCandidateAudit(env, actor.userId, 'profile.update', actor.email, { full_name, district });
      return json({ ok: true, profile: { fullName: full_name, phone, district, targetStreams: streams } });
    }

    // GET / POST /api/user/preferences
    if (resource === 'preferences' && !seg1) {
      if (request.method === 'GET') {
        const row = await env.DB.prepare(
          'SELECT domain_slug, track_slug, primary_exam, selected_exams_json, selected_streams_json, updated_at FROM candidate_exam_preferences WHERE user_id = ?'
        ).bind(actor.userId).first().catch(() => null);
        return json({
          preferences: row ? {
            domain: row.domain_slug || null,
            track: row.track_slug || null,
            primaryExam: row.primary_exam || null,
            selectedExams: parseMeta(row.selected_exams_json),
            selectedStreams: parseMeta(row.selected_streams_json),
            updatedAt: row.updated_at || null
          } : null,
          locked: controls.lock_exam_preferences,
          assignedExams: controls.assigned_exams
        });
      }
      if (request.method === 'POST') {
        if (controls.lock_exam_preferences) {
          throw new HttpError(403, 'PREFERENCES_LOCKED', 'Your exam preferences are locked by an administrator.');
        }
        const body = await readJson(request, 20000);
        const domain = cleanStr(body.domain || body.domain_slug, 80) || null;
        const track = cleanStr(body.track || body.track_slug, 80) || null;
        const rawExams = Array.isArray(body.selectedExams) ? body.selectedExams : [];
        const selectedExams = [...new Set(rawExams.map(x => cleanStr(x, 80)).filter(Boolean))].slice(0, 20);
        const primaryExam = cleanStr(body.primaryExam || body.primary_exam, 80) || selectedExams[0] || null;
        const rawStreams = (body.selectedStreams && typeof body.selectedStreams === 'object' && !Array.isArray(body.selectedStreams))
          ? body.selectedStreams : {};
        const selectedStreams = {};
        for (const [k, v] of Object.entries(rawStreams)) {
          const ck = cleanStr(k, 80);
          const cv = cleanStr(v, 120);
          if (ck && cv) selectedStreams[ck] = cv;
        }

        await env.DB.prepare(
          `INSERT INTO candidate_exam_preferences (
             user_id, domain_slug, track_slug, primary_exam, selected_exams_json, selected_streams_json, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             domain_slug = excluded.domain_slug,
             track_slug = excluded.track_slug,
             primary_exam = excluded.primary_exam,
             selected_exams_json = excluded.selected_exams_json,
             selected_streams_json = excluded.selected_streams_json,
             updated_at = datetime('now')`
        ).bind(
          actor.userId,
          domain,
          track,
          primaryExam,
          JSON.stringify(selectedExams),
          JSON.stringify(selectedStreams)
        ).run();

        if (selectedExams.length > 0) {
          await env.DB.prepare(
            'UPDATE candidates SET target_streams = ? WHERE id = ? OR email = ?'
          ).bind(JSON.stringify(selectedExams), actor.userId, actor.email).run().catch(() => {});
        }

        await logCandidateAudit(env, actor.userId, 'preferences.update', actor.email, {
          domain, track, primaryExam, selectedExams
        });

        return json({
          ok: true,
          preferences: { domain, track, primaryExam, selectedExams, selectedStreams }
        });
      }
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }

    // GET /api/user/attempts
    if (resource === 'attempts' && !seg1) {
      if (request.method !== 'GET') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
      }
      const { results } = await env.DB.prepare(
        `SELECT
           a.id,
           a.test_id,
           a.score,
           a.max_score,
           a.accuracy,
           a.correct_count,
           a.wrong_count,
           a.unanswered_count,
           a.time_taken_sec,
           a.created_at,
           t.slug AS test_slug,
           t.title AS test_title,
           t.title_or AS test_title_or,
           t.target_exam
         FROM test_attempts a
         LEFT JOIN mock_tests t ON t.id = a.test_id
         WHERE a.user_id = ?
         ORDER BY a.created_at DESC, a.rowid DESC
         LIMIT 50`
      ).bind(actor.userId).all();

      const items = results.map(r => ({
        id: r.id,
        test_id: r.test_id,
        testId: r.test_id,
        test_slug: r.test_slug || r.test_id,
        testSlug: r.test_slug || r.test_id,
        title: r.test_title || 'Mock Test',
        test_title: r.test_title || 'Mock Test',
        testTitle: r.test_title || 'Mock Test',
        title_or: r.test_title_or || '',
        target_exam: r.target_exam || '',
        targetExam: r.target_exam || '',
        score: r.score,
        max_score: r.max_score,
        maxScore: r.max_score,
        accuracy: r.accuracy,
        correct_count: r.correct_count,
        correctCount: r.correct_count,
        wrong_count: r.wrong_count,
        wrongCount: r.wrong_count,
        unanswered_count: r.unanswered_count,
        unansweredCount: r.unanswered_count,
        time_taken_sec: r.time_taken_sec,
        timeTakenSec: r.time_taken_sec,
        created_at: r.created_at,
        createdAt: r.created_at
      }));

      return json({ items, total: items.length });
    }

    // /api/user/bookmarks
    if (resource === 'bookmarks') {
      // GET /api/user/bookmarks
      if (!seg1 && request.method === 'GET') {
        const typeFilter = (url.searchParams.get('type') || '').trim();
        const items = await listUserBookmarks(env, actor.userId, typeFilter);
        return json({ items, total: items.length });
      }

      // POST /api/user/bookmarks
      if (!seg1 && request.method === 'POST') {
        const body = await readJson(request, 20000);
        const { errors, value } = validateBookmarkInput(body, { allowLegacyAlias: false });
        if (Object.keys(errors).length) throw validationError(errors);

        await env.DB.prepare(
          `INSERT INTO user_bookmarks (user_id, item_type, item_id, title, url, meta_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET
             title = excluded.title,
             url = excluded.url,
             meta_json = excluded.meta_json`
        ).bind(actor.userId, value.item_type, value.item_id, value.title, value.url, value.meta_json).run();

        const saved = await env.DB.prepare(
          `SELECT item_type, item_id, title, url, meta_json, created_at
           FROM user_bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?`
        ).bind(actor.userId, value.item_type, value.item_id).first();

        return json({ ok: true, item: saved ? formatBookmarkRow(saved) : value }, 201);
      }

      // POST /api/user/bookmarks/sync
      if (seg1 === 'sync' && !seg2 && request.method === 'POST') {
        const body = await readJson(request, 100000);
        const rawList = Array.isArray(body.items) ? body.items : (Array.isArray(body.bookmarks) ? body.bookmarks : null);
        if (!rawList) {
          throw validationError({ items: 'items must be an array of bookmark objects' });
        }

        const stmts = [];
        for (const entry of rawList.slice(0, 200)) {
          if (!entry || typeof entry !== 'object') continue;
          const { errors, value } = validateBookmarkInput(entry, { allowLegacyAlias: true });
          if (Object.keys(errors).length) continue;
          stmts.push(
            env.DB.prepare(
              `INSERT INTO user_bookmarks (user_id, item_type, item_id, title, url, meta_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET
                 title = excluded.title,
                 url = excluded.url,
                 meta_json = COALESCE(excluded.meta_json, user_bookmarks.meta_json)`
            ).bind(actor.userId, value.item_type, value.item_id, value.title, value.url, value.meta_json)
          );
        }

        if (stmts.length > 0) {
          await env.DB.batch(stmts);
        }

        const items = await listUserBookmarks(env, actor.userId);
        return json({ ok: true, synced: stmts.length, items, total: items.length });
      }

      // DELETE /api/user/bookmarks/:type/:id
      if (seg1 && seg2 && request.method === 'DELETE') {
        if (!BOOKMARK_TYPES.includes(seg1)) {
          throw validationError({ item_type: 'Invalid bookmark type' });
        }
        const itemId = cleanStr(seg2, 160, { required: true });
        if (!itemId) {
          throw validationError({ item_id: 'Invalid bookmark id' });
        }
        const res = await env.DB.prepare(
          'DELETE FROM user_bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?'
        ).bind(actor.userId, seg1, itemId).run();
        const deleted = Boolean(res && res.meta && res.meta.changes > 0);
        return json({ ok: true, deleted, item_type: seg1, item_id: itemId });
      }

      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }

    if (resource === 'push-subscription') {
      if (request.method === 'GET') {
        const sub = await env.DB.prepare(
          `SELECT id, endpoint, channel, goal_exams, enabled, last_alert_at, updated_at
           FROM push_subscriptions WHERE user_id = ? AND enabled = 1 ORDER BY updated_at DESC LIMIT 1`
        ).bind(actor.userId).first();
        return json({
          enabled: Boolean(sub),
          subscription: sub ? {
            id: sub.id,
            endpoint: sub.endpoint,
            channel: sub.channel,
            goal_exams: JSON.parse(sub.goal_exams || '[]'),
            enabled: Boolean(sub.enabled),
            last_alert_at: sub.last_alert_at,
            updated_at: sub.updated_at
          } : null
        });
      }

      if (request.method === 'POST') {
        verifyCsrf(request);
        await rateLimit(env, `user-push:${actor.userId}`, 30, 300);
        const body = await readJson(request, 25000);
        const enabled = body.enabled !== false;
        const goalExams = Array.isArray(body.goal_exams)
          ? [...new Set(body.goal_exams.map(x => cleanStr(x, 60)).filter(Boolean))].slice(0, 12)
          : [];
        const channel = body.channel === 'webpush' || body.channel === 'email_digest' ? body.channel : 'in_app';
        const endpoint = cleanStr(body.endpoint, 500) || `in-app://user/${actor.userId}`;
        const p256dh = cleanStr(body.p256dh, 300) || null;
        const authSecret = cleanStr(body.auth_secret, 300) || null;
        const id = `ps-${actor.userId}`;

        if (!enabled) {
          await env.DB.prepare(`UPDATE push_subscriptions SET enabled = 0, updated_at = datetime('now') WHERE user_id = ?`).bind(actor.userId).run();
          return json({ ok: true, enabled: false });
        }

        await env.DB.prepare(
          `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth_secret, channel, goal_exams, enabled, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
           ON CONFLICT(endpoint) DO UPDATE SET
             user_id = excluded.user_id,
             p256dh = COALESCE(excluded.p256dh, push_subscriptions.p256dh),
             auth_secret = COALESCE(excluded.auth_secret, push_subscriptions.auth_secret),
             channel = excluded.channel,
             goal_exams = excluded.goal_exams,
             enabled = 1,
             updated_at = datetime('now')`
        ).bind(id, actor.userId, endpoint, p256dh, authSecret, channel, JSON.stringify(goalExams)).run();

        return json({ ok: true, enabled: true, channel, goal_exams: goalExams }, 200);
      }

      if (request.method === 'DELETE') {
        verifyCsrf(request);
        await env.DB.prepare(`UPDATE push_subscriptions SET enabled = 0, updated_at = datetime('now') WHERE user_id = ?`).bind(actor.userId).run();
        return json({ ok: true, enabled: false });
      }

      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }

    throw new HttpError(404, 'NOT_FOUND', 'Unknown user API route');
  } catch (e) {
    return errorResponse(e);
  }
}
