// Admin CRUD for 4-tier exam_taxonomy catalog (/api/admin/exam-taxonomy)
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr, likeEscape } from '../../_lib/validate.js';

function parseJsonField(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function serializeJsonField(val, fallbackStr, maxLen = 20000) {
  if (val === undefined || val === null) return fallbackStr;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallbackStr;
    JSON.parse(trimmed); // validate JSON
    return trimmed.slice(0, maxLen);
  }
  return JSON.stringify(val).slice(0, maxLen);
}

export function formatTaxonomyRow(r) {
  return {
    id: r.id,
    domain_slug: r.domain_slug,
    domain_label: r.domain_label,
    track_slug: r.track_slug,
    track_label: r.track_label,
    exam_label: r.exam_label,
    short_code: r.short_code,
    streams: parseJsonField(r.streams_json, []),
    parent_tags: parseJsonField(r.parent_tags, []),
    next_exam_date: r.next_exam_date || null,
    countdown_status: r.countdown_status || 'TENTATIVE',
    marking_scheme: parseJsonField(r.marking_scheme_json, { correct: 1, negative: 0.25, totalMarks: 100 }),
    syllabus: parseJsonField(r.syllabus_json, []),
    sort_order: Number(r.sort_order || 0),
    is_active: Boolean(r.is_active),
    updated_at: r.updated_at || null
  };
}

function validateTaxonomyPayload(body, isCreate) {
  const errors = {};
  const id = cleanStr(body.id, 80, { required: isCreate }).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (isCreate && !id) errors.id = 'Exam slug id is required (lowercase letters, digits, hyphens)';
  const domain_slug = cleanStr(body.domain_slug, 80, { required: isCreate });
  const domain_label = cleanStr(body.domain_label, 120, { required: isCreate });
  const track_slug = cleanStr(body.track_slug, 80, { required: isCreate });
  const track_label = cleanStr(body.track_label, 120, { required: isCreate });
  const exam_label = cleanStr(body.exam_label, 160, { required: isCreate });
  const short_code = cleanStr(body.short_code, 40, { required: isCreate });

  if (isCreate && (!domain_slug || !domain_label)) errors.domain_label = 'Domain slug & label are required';
  if (isCreate && (!track_slug || !track_label)) errors.track_label = 'Track slug & label are required';
  if (isCreate && !exam_label) errors.exam_label = 'Exam label is required';
  if (isCreate && !short_code) errors.short_code = 'Short code is required';

  const countdown_status = body.countdown_status ? String(body.countdown_status).toUpperCase() : 'TENTATIVE';
  if (!['OFFICIAL', 'TENTATIVE'].includes(countdown_status)) {
    errors.countdown_status = 'countdown_status must be OFFICIAL or TENTATIVE';
  }

  let streams_json, parent_tags, marking_scheme_json, syllabus_json;
  try { streams_json = serializeJsonField(body.streams !== undefined ? body.streams : body.streams_json, '[]', 4000); } catch { errors.streams = 'streams must be valid JSON array'; }
  try { parent_tags = serializeJsonField(body.parent_tags, '[]', 2000); } catch { errors.parent_tags = 'parent_tags must be valid JSON array'; }
  try { marking_scheme_json = serializeJsonField(body.marking_scheme !== undefined ? body.marking_scheme : body.marking_scheme_json, '{"correct":1,"negative":0.25,"totalMarks":100}', 1000); } catch { errors.marking_scheme = 'marking_scheme must be valid JSON'; }
  try { syllabus_json = serializeJsonField(body.syllabus !== undefined ? body.syllabus : body.syllabus_json, '[]', 25000); } catch { errors.syllabus = 'syllabus must be valid JSON array'; }

  if (Object.keys(errors).length) throw validationError(errors);

  return {
    id,
    domain_slug,
    domain_label,
    track_slug,
    track_label,
    exam_label,
    short_code,
    streams_json,
    parent_tags,
    next_exam_date: body.next_exam_date ? cleanStr(body.next_exam_date, 30) : null,
    countdown_status,
    marking_scheme_json,
    syllabus_json,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Math.trunc(Number(body.sort_order)) : 0,
    is_active: body.is_active === false || body.is_active === 0 ? 0 : 1
  };
}

export async function handleExamTaxonomy(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;

  if (!id && method === 'GET') {
    const domain = cleanStr(url.searchParams.get('domain'), 80);
    const q = cleanStr(url.searchParams.get('q'), 100);
    const where = [];
    const binds = [];
    if (domain) {
      where.push('domain_slug = ?');
      binds.push(domain);
    }
    if (q) {
      where.push("(exam_label LIKE ? ESCAPE '\\' OR short_code LIKE ? ESCAPE '\\' OR track_label LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\')");
      const like = likeEscape(q);
      binds.push(like, like, like, like);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await env.DB.prepare(
      `SELECT * FROM exam_taxonomy ${w} ORDER BY sort_order ASC, exam_label ASC`
    ).bind(...binds).all();
    return json({ items: results.map(formatTaxonomyRow), total: results.length });
  }

  if (!id && method === 'POST') {
    const body = await readJson(request, 60000);
    const data = validateTaxonomyPayload(body, true);
    const existing = await env.DB.prepare('SELECT id FROM exam_taxonomy WHERE id = ?').bind(data.id).first();
    if (existing) throw new HttpError(409, 'CONFLICT', `Exam '${data.id}' already exists`);

    await env.DB.prepare(
      `INSERT INTO exam_taxonomy (
         id, domain_slug, domain_label, track_slug, track_label, exam_label, short_code,
         streams_json, parent_tags, next_exam_date, countdown_status, marking_scheme_json,
         syllabus_json, sort_order, is_active, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      data.id, data.domain_slug, data.domain_label, data.track_slug, data.track_label,
      data.exam_label, data.short_code, data.streams_json, data.parent_tags,
      data.next_exam_date, data.countdown_status, data.marking_scheme_json,
      data.syllabus_json, data.sort_order, data.is_active
    ).run();

    await audit(env, request, actor, 'taxonomy.create', 'exam_taxonomy', data.id, { exam_label: data.exam_label });
    const created = await env.DB.prepare('SELECT * FROM exam_taxonomy WHERE id = ?').bind(data.id).first();
    return json({ item: formatTaxonomyRow(created) }, 201);
  }

  if (id && method === 'PUT') {
    const existing = await env.DB.prepare('SELECT * FROM exam_taxonomy WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Exam taxonomy entry not found');
    const body = await readJson(request, 60000);
    const merged = {
      id,
      domain_slug: body.domain_slug ?? existing.domain_slug,
      domain_label: body.domain_label ?? existing.domain_label,
      track_slug: body.track_slug ?? existing.track_slug,
      track_label: body.track_label ?? existing.track_label,
      exam_label: body.exam_label ?? existing.exam_label,
      short_code: body.short_code ?? existing.short_code,
      streams: body.streams !== undefined ? body.streams : (body.streams_json ?? existing.streams_json),
      parent_tags: body.parent_tags ?? existing.parent_tags,
      next_exam_date: body.next_exam_date !== undefined ? body.next_exam_date : existing.next_exam_date,
      countdown_status: body.countdown_status ?? existing.countdown_status,
      marking_scheme: body.marking_scheme !== undefined ? body.marking_scheme : (body.marking_scheme_json ?? existing.marking_scheme_json),
      syllabus: body.syllabus !== undefined ? body.syllabus : (body.syllabus_json ?? existing.syllabus_json),
      sort_order: body.sort_order !== undefined ? body.sort_order : existing.sort_order,
      is_active: body.is_active !== undefined ? body.is_active : existing.is_active
    };
    const data = validateTaxonomyPayload(merged, true);
    await env.DB.prepare(
      `UPDATE exam_taxonomy SET
         domain_slug = ?, domain_label = ?, track_slug = ?, track_label = ?, exam_label = ?,
         short_code = ?, streams_json = ?, parent_tags = ?, next_exam_date = ?, countdown_status = ?,
         marking_scheme_json = ?, syllabus_json = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      data.domain_slug, data.domain_label, data.track_slug, data.track_label, data.exam_label,
      data.short_code, data.streams_json, data.parent_tags, data.next_exam_date, data.countdown_status,
      data.marking_scheme_json, data.syllabus_json, data.sort_order, data.is_active, id
    ).run();

    await audit(env, request, actor, 'taxonomy.update', 'exam_taxonomy', id, { exam_label: data.exam_label });
    const updated = await env.DB.prepare('SELECT * FROM exam_taxonomy WHERE id = ?').bind(id).first();
    return json({ item: formatTaxonomyRow(updated) });
  }

  if (id && method === 'DELETE') {
    const existing = await env.DB.prepare('SELECT id, exam_label FROM exam_taxonomy WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Exam taxonomy entry not found');
    await env.DB.prepare('DELETE FROM exam_taxonomy WHERE id = ?').bind(id).run();
    await audit(env, request, actor, 'taxonomy.delete', 'exam_taxonomy', id, { exam_label: existing.exam_label });
    return json({ ok: true, id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
