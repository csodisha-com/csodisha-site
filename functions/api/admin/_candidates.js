// Admin Candidate Behavior Governance & Audit Console API (/api/admin/candidates)
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr, likeEscape, parsePaging } from '../../_lib/validate.js';
import {
  ACCOUNT_STATUSES,
  NOTICE_LEVELS,
  getCandidateControls,
  logCandidateAudit,
  normalizePermissions
} from '../../_lib/candidate-controls.js';

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : fallback;
  } catch {
    return fallback;
  }
}

async function ensureCandidateUser(env, id) {
  const user = await env.DB.prepare(
    `SELECT u.id, u.email, u.role, u.created_at,
            c.full_name, c.phone, c.district, c.target_streams, c.last_login_at
     FROM users u
     LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email
     WHERE u.id = ?
     LIMIT 1`
  ).bind(id).first();
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'Candidate account not found');
  return user;
}

export async function handleAdminCandidates(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/admin/candidates — search & filter candidates with governance state
  if (!id && method === 'GET') {
    const { page, limit, offset } = parsePaging(url, 25, 100);
    const q = cleanStr(url.searchParams.get('q'), 100);
    const status = cleanStr(url.searchParams.get('status'), 30);
    const exam = cleanStr(url.searchParams.get('exam'), 80);

    const where = [];
    const binds = [];
    if (q) {
      where.push("(u.email LIKE ? ESCAPE '\\' OR c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.district LIKE ? ESCAPE '\\')");
      const l = likeEscape(q);
      binds.push(l, l, l, l);
    }
    if (status) {
      if (!ACCOUNT_STATUSES.includes(status)) throw validationError({ status: 'Invalid account_status filter' });
      if (status === 'active') {
        where.push("(cc.account_status IS NULL OR cc.account_status = 'active')");
      } else {
        where.push('cc.account_status = ?');
        binds.push(status);
      }
    }
    if (exam) {
      where.push("(cp.selected_exams_json LIKE ? ESCAPE '\\' OR cc.assigned_exams_json LIKE ? ESCAPE '\\' OR c.target_streams LIKE ? ESCAPE '\\')");
      const l = likeEscape(exam);
      binds.push(l, l, l);
    }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const fromSql = `
      FROM users u
      LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email
      LEFT JOIN candidate_controls cc ON cc.user_id = u.id
      LEFT JOIN candidate_exam_preferences cp ON cp.user_id = u.id
    `;

    const totalRow = await env.DB.prepare(`SELECT COUNT(DISTINCT u.id) AS n ${fromSql} ${w}`).bind(...binds).first();
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.email, u.role, u.created_at,
              MAX(c.full_name) AS full_name, MAX(c.phone) AS phone, MAX(c.district) AS district,
              MAX(c.last_login_at) AS last_login_at,
              MAX(cc.account_status) AS account_status, MAX(cc.lock_exam_preferences) AS lock_exam_preferences,
              MAX(cc.admin_notice_text) AS admin_notice_text, MAX(cc.session_version) AS session_version,
              MAX(cp.primary_exam) AS primary_exam, MAX(cp.selected_exams_json) AS selected_exams_json,
              (SELECT COUNT(*) FROM test_attempts ta WHERE ta.user_id = u.id) AS attempts_count,
              (SELECT COUNT(*) FROM user_bookmarks ub WHERE ub.user_id = u.id) AS bookmarks_count
       ${fromSql} ${w}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();

    const items = results.map(r => ({
      id: r.id,
      email: r.email,
      role: r.role,
      full_name: r.full_name || 'Candidate Aspirant',
      phone: r.phone || '',
      district: r.district || '',
      last_login_at: r.last_login_at || null,
      created_at: r.created_at,
      account_status: r.account_status || 'active',
      lock_exam_preferences: Boolean(r.lock_exam_preferences),
      has_notice: Boolean(r.admin_notice_text),
      session_version: Number(r.session_version || 1),
      primary_exam: r.primary_exam || null,
      selected_exams: parseJson(r.selected_exams_json, []),
      attempts_count: Number(r.attempts_count || 0),
      bookmarks_count: Number(r.bookmarks_count || 0)
    }));

    return json({ items, page, limit, total: Number(totalRow?.n || 0) });
  }

  // GET /api/admin/candidates/:id — full inspection (controls + preferences + audit logs)
  if (id && method === 'GET') {
    const user = await ensureCandidateUser(env, id);
    const controls = await getCandidateControls(env, id);
    const prefsRow = await env.DB.prepare(
      'SELECT * FROM candidate_exam_preferences WHERE user_id = ?'
    ).bind(id).first().catch(() => null);
    const logsRes = await env.DB.prepare(
      'SELECT id, action, actor, details, created_at FROM candidate_audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT 50'
    ).bind(id).all();

    return json({
      candidate: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name || 'Candidate Aspirant',
        phone: user.phone || '',
        district: user.district || '',
        last_login_at: user.last_login_at || null,
        target_streams: parseJson(user.target_streams, [])
      },
      controls,
      preferences: prefsRow ? {
        domain_slug: prefsRow.domain_slug || null,
        track_slug: prefsRow.track_slug || null,
        primary_exam: prefsRow.primary_exam || null,
        selected_exams: parseJson(prefsRow.selected_exams_json, []),
        selected_streams: parseJson(prefsRow.selected_streams_json, {}),
        updated_at: prefsRow.updated_at || null
      } : null,
      audit_logs: logsRes.results || []
    });
  }

  // POST /api/admin/candidates/:id — governance actions & control updates
  if (id && method === 'POST') {
    const user = await ensureCandidateUser(env, id);
    const body = await readJson(request, 30000);
    const action = cleanStr(body.action, 50) || 'update_controls';

    if (action === 'force_logout') {
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
      await env.DB.prepare(
        `INSERT INTO candidate_controls (user_id, session_version, updated_by, updated_at)
         VALUES (?, 2, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           session_version = candidate_controls.session_version + 1,
           updated_by = excluded.updated_by,
           updated_at = datetime('now')`
      ).bind(id, actor.email).run();
      await logCandidateAudit(env, id, 'session.force_logout', actor.email, { email: user.email });
      await audit(env, request, actor, 'candidate.force_logout', 'user', id, { email: user.email });
      return json({ ok: true, action, controls: await getCandidateControls(env, id) });
    }

    if (action === 'reset_cbt') {
      const res = await env.DB.prepare('DELETE FROM test_attempts WHERE user_id = ?').bind(id).run();
      const deleted = Number(res?.meta?.changes || 0);
      await logCandidateAudit(env, id, 'cbt.reset', actor.email, { deleted_attempts: deleted });
      await audit(env, request, actor, 'candidate.reset_cbt', 'user', id, { email: user.email, deleted });
      return json({ ok: true, action, deleted });
    }

    if (action === 'reset_checklist') {
      const res = await env.DB.prepare('DELETE FROM candidate_checklist WHERE candidate_id = ?').bind(id).run();
      const deleted = Number(res?.meta?.changes || 0);
      await logCandidateAudit(env, id, 'checklist.reset', actor.email, { deleted_milestones: deleted });
      await audit(env, request, actor, 'candidate.reset_checklist', 'user', id, { email: user.email, deleted });
      return json({ ok: true, action, deleted });
    }

    if (action === 'update_controls') {
      const current = await getCandidateControls(env, id);
      const account_status = body.account_status !== undefined ? String(body.account_status) : current.account_status;
      if (!ACCOUNT_STATUSES.includes(account_status)) {
        throw validationError({ account_status: 'account_status must be active, restricted, suspended, or banned' });
      }
      const notice_level = body.admin_notice_level !== undefined ? String(body.admin_notice_level) : current.admin_notice_level;
      if (!NOTICE_LEVELS.includes(notice_level)) {
        throw validationError({ admin_notice_level: 'admin_notice_level must be info, warning, or urgent' });
      }

      const restriction_reason = body.restriction_reason !== undefined
        ? (cleanStr(body.restriction_reason, 500) || null)
        : current.restriction_reason;
      const suspended_until = body.suspended_until !== undefined
        ? (cleanStr(body.suspended_until, 40) || null)
        : current.suspended_until;
      const permissions = body.permissions !== undefined
        ? normalizePermissions(body.permissions)
        : current.permissions;
      const assigned_exams = body.assigned_exams !== undefined
        ? (Array.isArray(body.assigned_exams) ? body.assigned_exams.map(s => cleanStr(s, 80)).filter(Boolean).slice(0, 30) : current.assigned_exams)
        : current.assigned_exams;
      const lock_exam_preferences = body.lock_exam_preferences !== undefined
        ? (body.lock_exam_preferences ? 1 : 0)
        : (current.lock_exam_preferences ? 1 : 0);
      const admin_notice_text = body.admin_notice_text !== undefined
        ? (cleanStr(body.admin_notice_text, 600) || null)
        : current.admin_notice_text;

      await env.DB.prepare(
        `INSERT INTO candidate_controls (
           user_id, account_status, restriction_reason, suspended_until, permissions_json,
           assigned_exams_json, lock_exam_preferences, admin_notice_text, admin_notice_level,
           updated_by, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           account_status = excluded.account_status,
           restriction_reason = excluded.restriction_reason,
           suspended_until = excluded.suspended_until,
           permissions_json = excluded.permissions_json,
           assigned_exams_json = excluded.assigned_exams_json,
           lock_exam_preferences = excluded.lock_exam_preferences,
           admin_notice_text = excluded.admin_notice_text,
           admin_notice_level = excluded.admin_notice_level,
           updated_by = excluded.updated_by,
           updated_at = datetime('now')`
      ).bind(
        id,
        account_status,
        restriction_reason,
        suspended_until,
        JSON.stringify(permissions),
        JSON.stringify(assigned_exams),
        lock_exam_preferences,
        admin_notice_text,
        notice_level,
        actor.email
      ).run();

      // If locked & assigned_exams provided, also sync candidate_exam_preferences so their workspace reflects it
      if (lock_exam_preferences && assigned_exams.length > 0) {
        await env.DB.prepare(
          `INSERT INTO candidate_exam_preferences (user_id, primary_exam, selected_exams_json, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             primary_exam = excluded.primary_exam,
             selected_exams_json = excluded.selected_exams_json,
             updated_at = datetime('now')`
        ).bind(id, assigned_exams[0], JSON.stringify(assigned_exams)).run();
      }

      await logCandidateAudit(env, id, 'controls.update', actor.email, {
        account_status,
        lock_exam_preferences: Boolean(lock_exam_preferences),
        assigned_exams,
        has_notice: Boolean(admin_notice_text)
      });
      await audit(env, request, actor, 'candidate.controls_update', 'user', id, {
        email: user.email,
        account_status
      });

      return json({ ok: true, action, controls: await getCandidateControls(env, id) });
    }

    throw validationError({ action: 'Unsupported candidate governance action' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
