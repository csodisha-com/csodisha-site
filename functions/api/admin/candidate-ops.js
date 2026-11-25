// Folder #7 Backend (v312): 30-District "Assigned For You" Push Desk & Public Support Inbox
// Strictly real D1 data (candidate_assignments, support_tickets) — zero synthetic rows.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { cleanStr, likeEscape } from '../../_lib/validate.js';
import { recordAdminAuditLog } from './system-ops.js';

export const ODISHA_30_DISTRICTS = [
  'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
  'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
  'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
  'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
];

const DISTRICT_LOOKUP = new Map([
  ['all', 'All Odisha'],
  ['all odisha', 'All Odisha'],
  ['statewide', 'All Odisha'],
  ['balasore (baleswar)', 'Balasore'],
  ['baleswar', 'Balasore'],
  ['khurda', 'Khordha'],
  ['sonepur', 'Subarnapur'],
  ['nowrangpur', 'Nabarangpur'],
  ['jajapur', 'Jajpur'],
  ['keonjhar', 'Kendujhar'],
  ['bolangir', 'Balangir'],
  ...ODISHA_30_DISTRICTS.map(d => [d.toLowerCase(), d])
]);

export const ASSIGNMENT_RESOURCE_TYPES = ['study_pdf', 'mock_test', 'exam_notice'];
export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'resolved'];

let _schemaReadyDb = null;

export function normalizeDistrictName(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'All Odisha';
  const hit = DISTRICT_LOOKUP.get(s.toLowerCase());
  return hit || '';
}

function validateSafeResourceUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw validationError({ resource_url: 'Unsafe URL scheme is not allowed.' });
  }
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 600);
  let u;
  try { u = new URL(s); } catch {
    throw validationError({ resource_url: 'Resource URL must be a relative path (/...) or valid http(s) URL.' });
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw validationError({ resource_url: 'Resource URL must use http:// or https://.' });
  }
  return u.toString().slice(0, 600);
}

export async function ensureCandidateOpsSchema(db) {
  if (!db || _schemaReadyDb === db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS candidate_assignments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        resource_type TEXT NOT NULL DEFAULT 'study_pdf',
        resource_url TEXT NOT NULL DEFAULT '',
        target_district TEXT NOT NULL DEFAULT 'All Odisha',
        target_exam TEXT NOT NULL DEFAULT '',
        expires_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        ticket_type TEXT NOT NULL DEFAULT 'report_error',
        page_url TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        contact_email TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        admin_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    _schemaReadyDb = db;
  } catch {
    // Graceful skip if DB unavailable
  }
}

function isAssignmentExpired(expiresAt, nowDateStr) {
  const raw = String(expiresAt || '').trim();
  if (!raw) return false;
  const datePart = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart < nowDateStr;
  }
  const ts = Date.parse(raw);
  return Number.isFinite(ts) && ts < Date.now();
}

/**
 * Matches active, non-expired `candidate_assignments` rows to a candidate's
 * Odisha district and target exam goals. Used live by `/student-dashboard/` ("Assigned For You").
 */
export async function getMatchingDistrictAssignments(db, { district = '', examGoals = [] } = {}) {
  if (!db) return [];
  try {
    await ensureCandidateOpsSchema(db);
    const { results } = await db.prepare(
      `SELECT id, title, resource_type, resource_url, target_district, target_exam, expires_at, created_at
       FROM candidate_assignments
       ORDER BY created_at DESC
       LIMIT 200`
    ).all();
    const rows = results || [];
    if (!rows.length) return [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const candDist = normalizeDistrictName(district) || String(district || '').trim();
    const candDistLower = candDist.toLowerCase();
    const goalTokens = (Array.isArray(examGoals) ? examGoals : [examGoals])
      .map(g => String(g || '').trim().toLowerCase())
      .filter(Boolean);

    return rows.filter(r => {
      if (isAssignmentExpired(r.expires_at, todayStr)) return false;

      const rowDist = normalizeDistrictName(r.target_district) || 'All Odisha';
      const distMatch = rowDist === 'All Odisha' || (candDistLower && candDistLower !== 'all odisha' && rowDist.toLowerCase() === candDistLower);
      if (!distMatch) return false;

      const rowExam = String(r.target_exam || '').trim().toLowerCase();
      if (!rowExam || rowExam === 'all' || rowExam === 'all exams') return true;
      if (!goalTokens.length) return false;
      return goalTokens.some(g => g === rowExam || g.includes(rowExam) || rowExam.includes(g));
    }).map(r => ({
      id: String(r.id),
      source: 'district_push',
      title: String(r.title || ''),
      title_en: String(r.title || ''),
      title_or: '',
      summary_en: [r.target_district || 'All Odisha', r.target_exam || 'All Exams'].filter(Boolean).join(' · '),
      summary_or: '',
      resource_type: String(r.resource_type || 'study_pdf'),
      item_type: String(r.resource_type || 'study_pdf'),
      resource_url: String(r.resource_url || ''),
      target_scope: r.target_district === 'All Odisha' ? 'all' : 'district',
      target_district: String(r.target_district || 'All Odisha'),
      target_exam: String(r.target_exam || ''),
      target_exam_board: String(r.target_exam || ''),
      priority: 'high',
      expires_at: String(r.expires_at || ''),
      created_at: String(r.created_at || ''),
      completed: false
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// ADMIN API: /api/admin/candidate-ops/*
// ============================================================================
export async function handleAdminCandidateOpsApi(request, env, actor, section, id, ctx) {
  await ensureCandidateOpsSchema(env.DB);
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  // --------------------------------------------------------------------------
  // 1. 30-District Targeted "Assigned For You" Push Desk
  // --------------------------------------------------------------------------
  if (section === 'assignments') {
    if (!id && method === 'GET') {
      const district = (url.searchParams.get('district') || '').trim();
      const exam = (url.searchParams.get('exam') || '').trim();
      const type = (url.searchParams.get('type') || '').trim();
      const where = [];
      const binds = [];

      if (district) {
        const norm = normalizeDistrictName(district) || district;
        where.push('target_district = ?');
        binds.push(norm);
      }
      if (exam) {
        where.push("lower(target_exam) LIKE ? ESCAPE '\\'");
        binds.push(likeEscape(exam.toLowerCase()));
      }
      if (type && ASSIGNMENT_RESOURCE_TYPES.includes(type)) {
        where.push('resource_type = ?');
        binds.push(type);
      }

      const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const { results } = await db.prepare(
        `SELECT id, title, resource_type, resource_url, target_district, target_exam, expires_at, created_at
         FROM candidate_assignments ${w}
         ORDER BY created_at DESC LIMIT 200`
      ).bind(...binds).all();

      const todayStr = new Date().toISOString().slice(0, 10);
      const items = (results || []).map(r => ({
        ...r,
        is_expired: isAssignmentExpired(r.expires_at, todayStr)
      }));

      return json({
        ok: true,
        items,
        total: items.length,
        active_count: items.filter(i => !i.is_expired).length,
        districts: ['All Odisha', ...ODISHA_30_DISTRICTS]
      });
    }

    if (!id && method === 'POST') {
      const body = await readJson(request, 20000);
      const title = cleanStr(body.title, 200, { required: true });
      if (!title) throw validationError({ title: 'Assignment title is required.' });

      const resourceType = ASSIGNMENT_RESOURCE_TYPES.includes(body.resource_type)
        ? body.resource_type
        : 'study_pdf';
      const resourceUrl = validateSafeResourceUrl(body.resource_url);
      if (!resourceUrl) throw validationError({ resource_url: 'Resource URL (or /files/... R2 path) is required.' });

      const targetDistrict = normalizeDistrictName(body.target_district || 'All Odisha');
      if (!targetDistrict) {
        throw validationError({ target_district: 'Select "All Odisha" or one of the 30 official Odisha districts.' });
      }
      const targetExam = cleanStr(body.target_exam, 100) || '';
      const expiresAt = cleanStr(body.expires_at, 40) || '';

      const newId = `asgn_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const nowIso = new Date().toISOString();
      await db.prepare(
        `INSERT INTO candidate_assignments (id, title, resource_type, resource_url, target_district, target_exam, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, title, resourceType, resourceUrl, targetDistrict, targetExam, expiresAt, nowIso).run();

      recordAdminAuditLog(env, request, actor, 'candidate_ops.assignment.create', newId, {
        target_district: targetDistrict,
        target_exam: targetExam,
        resource_type: resourceType
      }, ctx);

      const item = await db.prepare('SELECT * FROM candidate_assignments WHERE id = ?').bind(newId).first();
      return json({ ok: true, id: newId, item }, 201);
    }

    if (id && method === 'PUT') {
      const existing = await db.prepare('SELECT * FROM candidate_assignments WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Assignment not found');

      const body = await readJson(request, 20000);
      const title = body.title !== undefined ? cleanStr(body.title, 200, { required: true }) : existing.title;
      if (!title) throw validationError({ title: 'Assignment title is required.' });

      const resourceType = body.resource_type !== undefined
        ? (ASSIGNMENT_RESOURCE_TYPES.includes(body.resource_type) ? body.resource_type : existing.resource_type)
        : existing.resource_type;
      const resourceUrl = body.resource_url !== undefined
        ? validateSafeResourceUrl(body.resource_url)
        : existing.resource_url;
      const targetDistrict = body.target_district !== undefined
        ? normalizeDistrictName(body.target_district)
        : existing.target_district;
      if (!targetDistrict) {
        throw validationError({ target_district: 'Select "All Odisha" or one of the 30 official Odisha districts.' });
      }
      const targetExam = body.target_exam !== undefined ? (cleanStr(body.target_exam, 100) || '') : existing.target_exam;
      const expiresAt = body.expires_at !== undefined ? (cleanStr(body.expires_at, 40) || '') : existing.expires_at;

      await db.prepare(
        `UPDATE candidate_assignments
         SET title = ?, resource_type = ?, resource_url = ?, target_district = ?, target_exam = ?, expires_at = ?
         WHERE id = ?`
      ).bind(title, resourceType, resourceUrl, targetDistrict, targetExam, expiresAt, id).run();

      recordAdminAuditLog(env, request, actor, 'candidate_ops.assignment.update', id, { target_district: targetDistrict }, ctx);
      const item = await db.prepare('SELECT * FROM candidate_assignments WHERE id = ?').bind(id).first();
      return json({ ok: true, id, item });
    }

    if (id && method === 'DELETE') {
      const existing = await db.prepare('SELECT id FROM candidate_assignments WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Assignment not found');
      await db.prepare('DELETE FROM candidate_assignments WHERE id = ?').bind(id).run();
      recordAdminAuditLog(env, request, actor, 'candidate_ops.assignment.delete', id, null, ctx);
      return json({ ok: true, id, deleted: true });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // --------------------------------------------------------------------------
  // 2. Support & "Report an Error" / "Suggest Resource" Inbox
  // --------------------------------------------------------------------------
  if (section === 'support') {
    if (!id && method === 'GET') {
      const status = (url.searchParams.get('status') || '').trim().toLowerCase();
      const ticketType = (url.searchParams.get('type') || '').trim().toLowerCase();
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [];
      const binds = [];

      if (status && SUPPORT_TICKET_STATUSES.includes(status)) {
        where.push('status = ?');
        binds.push(status);
      }
      if (ticketType) {
        where.push('ticket_type = ?');
        binds.push(ticketType);
      }
      if (q) {
        const l = likeEscape(q);
        where.push("(subject LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\' OR page_url LIKE ? ESCAPE '\\' OR contact_email LIKE ? ESCAPE '\\')");
        binds.push(l, l, l, l);
      }
      const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [rowsRes, countsRes] = await Promise.all([
        db.prepare(
          `SELECT id, ticket_type, page_url, subject, message, contact_email, status, admin_note, created_at, updated_at
           FROM support_tickets ${w}
           ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC
           LIMIT 200`
        ).bind(...binds).all(),
        db.prepare(
          `SELECT
             COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) AS open,
             COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress,
             COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0) AS resolved
           FROM support_tickets`
        ).first()
      ]);

      return json({
        ok: true,
        items: rowsRes.results || [],
        counts: {
          total: Number((countsRes && countsRes.total) || 0),
          open: Number((countsRes && countsRes.open) || 0),
          in_progress: Number((countsRes && countsRes.in_progress) || 0),
          resolved: Number((countsRes && countsRes.resolved) || 0)
        }
      });
    }

    if (id && method === 'PUT') {
      const existing = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Support ticket not found');

      const body = await readJson(request, 20000);
      const nextStatus = body.status !== undefined ? String(body.status).trim().toLowerCase() : existing.status;
      if (!SUPPORT_TICKET_STATUSES.includes(nextStatus)) {
        throw validationError({ status: 'Status must be open, in_progress, or resolved.' });
      }
      const adminNote = body.admin_note !== undefined
        ? (cleanStr(body.admin_note, 2000, { multiline: true }) || '')
        : existing.admin_note;

      const nowIso = new Date().toISOString();
      await db.prepare(
        'UPDATE support_tickets SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?'
      ).bind(nextStatus, adminNote, nowIso, id).run();

      recordAdminAuditLog(env, request, actor, 'candidate_ops.support.update', id, { from: existing.status, to: nextStatus }, ctx);
      const item = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').bind(id).first();
      return json({ ok: true, id, item });
    }

    if (id && method === 'DELETE') {
      const existing = await db.prepare('SELECT id FROM support_tickets WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Support ticket not found');
      await db.prepare('DELETE FROM support_tickets WHERE id = ?').bind(id).run();
      recordAdminAuditLog(env, request, actor, 'candidate_ops.support.delete', id, null, ctx);
      return json({ ok: true, id, deleted: true });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown candidate-ops route');
}
