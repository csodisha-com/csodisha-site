// Mock tests + questions (tables: mock_tests, mock_questions).
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr, slugify, SLUG_RE, resolveStatus, likeEscape, parsePaging, STATUSES } from '../../_lib/validate.js';

const MEDIA_KEY_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const MAX_IMPORT = 500;

async function normalizeTest(body, existing) {
  const errors = {};
  const v = k => (body[k] !== undefined ? body[k] : existing ? existing[k] : undefined);
  const title = cleanStr(v('title'), 200, { required: true });
  if (!title) errors.title = 'Title is required'; else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer';
  const title_or = cleanStr(v('title_or'), 200);
  if (title_or.length > 200) errors.title_or = 'Odia title must be 200 characters or fewer';
  const target_exam = cleanStr(v('target_exam'), 100);
  if (target_exam.length > 100) errors.target_exam = 'Target exam must be 100 characters or fewer';
  const duration = Number(v('duration_minutes'));
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) errors.duration_minutes = 'Duration must be 1–600 minutes';
  const total = Number(v('total_marks'));
  if (!Number.isFinite(total) || total <= 0 || total > 10000) errors.total_marks = 'Total marks must be a positive number';
  const neg = v('negative_marking') === '' || v('negative_marking') === undefined || v('negative_marking') === null ? 0 : Number(v('negative_marking'));
  if (!Number.isFinite(neg) || neg < 0 || neg > 10) errors.negative_marking = 'Negative marking must be between 0 and 10';
  let slug = body.slug !== undefined ? cleanStr(body.slug, 80).toLowerCase() : existing ? existing.slug : '';
  const auto = !slug;
  if (!slug) slug = slugify(title) || 'mock-test';
  if (!SLUG_RE.test(slug) || slug.length > 80) errors.slug = 'Slug may contain lowercase letters, digits and hyphens only';
  const st = resolveStatus(body, existing, errors);
  if (Object.keys(errors).length) throw validationError(errors);
  return { slug, auto, title, title_or, target_exam, duration_minutes: duration, total_marks: total, negative_marking: neg, status: st.status, published_at: st.published_at };
}

async function uniqueSlug(env, slug, auto, excludeId) {
  let candidate = slug;
  for (let n = 0; n < 20; n++) {
    const row = await env.DB.prepare('SELECT id FROM mock_tests WHERE slug = ? AND deleted_at IS NULL AND id != ?').bind(candidate, excludeId || '').first();
    if (!row) return candidate;
    if (!auto) throw validationError({ slug: 'This slug is already in use' });
    candidate = `${slug}-${n + 2}`.slice(0, 80);
  }
  throw new HttpError(409, 'CONFLICT', 'Could not generate a unique slug');
}

// Validate one question row (shared by manual create/update and bulk import).
export function normalizeQuestion(raw, existing) {
  const errors = {};
  const v = k => (raw[k] !== undefined ? raw[k] : existing ? existing[k] : undefined);
  const s = (k, max, label, required) => {
    const x = cleanStr(v(k), max, { required, multiline: true });
    if (x === null) { errors[k] = `${label} is required`; return ''; }
    if (x.length > max) { errors[k] = `${label} must be ${max} characters or fewer`; return ''; }
    return x;
  };
  const q = {
    section: s('section', 80, 'Section'),
    question_en: s('question_en', 2000, 'Question', true),
    question_or: s('question_or', 2000, 'Odia question'),
    option_a: s('option_a', 500, 'Option A', true),
    option_b: s('option_b', 500, 'Option B', true),
    option_c: s('option_c', 500, 'Option C', true),
    option_d: s('option_d', 500, 'Option D', true),
    explanation: s('explanation', 4000, 'Explanation')
  };
  const co = String(v('correct_option') ?? '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(co)) errors.correct_option = 'Correct option must be A, B, C or D';
  q.correct_option = co;
  const marks = v('marks') === '' || v('marks') === undefined || v('marks') === null ? 1 : Number(v('marks'));
  if (!Number.isFinite(marks) || marks <= 0 || marks > 100) errors.marks = 'Marks must be a positive number';
  q.marks = marks;
  const img = cleanStr(v('image_media_key'), 100);
  if (img && !MEDIA_KEY_RE.test(img)) errors.image_media_key = 'Invalid image reference';
  q.image_media_key = img || null;
  return { q, errors };
}

const QCOLS = ['section', 'question_en', 'question_or', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation', 'image_media_key', 'marks'];

async function checkImage(env, key) {
  if (!key) return;
  const row = await env.DB.prepare("SELECT kind FROM media_assets WHERE object_key = ? AND deleted_at IS NULL").bind(key).first();
  if (!row || row.kind !== 'image') throw validationError({ image_media_key: 'Diagram must be an uploaded image' });
}

export async function handleMockTests(request, env, actor, id, sub) {
  const method = request.method;
  const url = new URL(request.url);

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url);
      const where = ['t.deleted_at IS NULL']; const binds = [];
      const status = url.searchParams.get('status');
      if (status) {
        if (!STATUSES.includes(status)) throw validationError({ status: 'Unknown status filter' });
        where.push('t.status = ?'); binds.push(status);
      }
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) {
        where.push(`(t.title LIKE ? ESCAPE '\\' OR t.title_or LIKE ? ESCAPE '\\' OR t.slug LIKE ? ESCAPE '\\' OR t.target_exam LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q); binds.push(l, l, l, l);
      }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM mock_tests t WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT t.id, t.slug, t.title, t.title_or, t.target_exam, t.duration_minutes, t.total_marks, t.negative_marking,
                t.status, t.published_at, t.updated_at,
                (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = t.id AND q.deleted_at IS NULL) AS question_count
         FROM mock_tests t WHERE ${w} ORDER BY t.updated_at DESC, t.id LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({ items: results, page, limit, total });
    }
    if (method === 'POST') {
      const f = await normalizeTest(await readJson(request), null);
      const slug = await uniqueSlug(env, f.slug, f.auto, null);
      const newId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO mock_tests (id, slug, title, title_or, target_exam, duration_minutes, total_marks, negative_marking, status, published_at, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, slug, f.title, f.title_or, f.target_exam, f.duration_minutes, f.total_marks, f.negative_marking, f.status, f.published_at, actor.userId, actor.userId).run();
      await audit(env, request, actor, 'mock_test.create', 'mock_test', newId, { title: f.title });
      return json({ id: newId, slug }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const test = await env.DB.prepare('SELECT * FROM mock_tests WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!test) throw new HttpError(404, 'NOT_FOUND', 'Mock test not found');

  if (sub === 'status' && method === 'POST') {
    const body = await readJson(request);
    const errors = {};
    const st = resolveStatus({ status: body.status, published_at: body.published_at }, test, errors);
    if (Object.keys(errors).length) throw validationError(errors);
    if (st.status !== 'draft') {
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM mock_questions WHERE test_id = ? AND deleted_at IS NULL').bind(id).first()).n;
      if (n === 0) throw validationError({ status: 'Add at least one question before publishing' });
    }
    await env.DB.prepare("UPDATE mock_tests SET status = ?, published_at = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(st.status, st.published_at, actor.userId, id).run();
    await audit(env, request, actor, `mock_test.${st.status}`, 'mock_test', id, { title: test.title, published_at: st.published_at });
    return json({ id, status: st.status, published_at: st.published_at });
  }

  if (sub === 'questions') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT id, position, ${QCOLS.join(', ')} FROM mock_questions WHERE test_id = ? AND deleted_at IS NULL ORDER BY position, created_at`
      ).bind(id).all();
      return json({ items: results, total: results.length });
    }
    if (method === 'POST') {
      const { q, errors } = normalizeQuestion(await readJson(request), null);
      if (Object.keys(errors).length) throw validationError(errors);
      await checkImage(env, q.image_media_key);
      const qid = crypto.randomUUID();
      const pos = (await env.DB.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM mock_questions WHERE test_id = ?').bind(id).first()).m + 1;
      await env.DB.prepare(
        `INSERT INTO mock_questions (id, test_id, position, ${QCOLS.join(', ')}) VALUES (?, ?, ?, ${QCOLS.map(() => '?').join(', ')})`
      ).bind(qid, id, pos, ...QCOLS.map(c => q[c])).run();
      await env.DB.prepare("UPDATE mock_tests SET updated_at = datetime('now') WHERE id = ?").bind(id).run();
      await audit(env, request, actor, 'mock_question.create', 'mock_test', id, { question_id: qid });
      return json({ id: qid, position: pos }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (sub === 'import' && method === 'POST') {
    const body = await readJson(request, 3_000_000);
    const rows = body.rows;
    if (!Array.isArray(rows) || rows.length === 0) throw validationError({ rows: 'Provide a non-empty rows array' });
    if (rows.length > MAX_IMPORT) throw validationError({ rows: `At most ${MAX_IMPORT} questions per import` });
    const valid = []; const invalid = [];
    rows.forEach((raw, i) => {
      const { q, errors } = normalizeQuestion(raw && typeof raw === 'object' ? raw : {}, null);
      if (Object.keys(errors).length) invalid.push({ row: i + 1, errors, data: q });
      else valid.push({ row: i + 1, data: q });
    });
    const report = { total: rows.length, valid_count: valid.length, invalid_count: invalid.length, invalid, preview: valid.slice(0, 50).map(x => ({ row: x.row, ...x.data })) };
    if (body.dry_run !== false) return json({ ...report, dry_run: true });
    if (invalid.length && !body.skip_invalid) throw new HttpError(422, 'VALIDATION_ERROR', `${invalid.length} row(s) have errors. Fix them or choose to skip invalid rows.`, { fields: { rows: 'Invalid rows present' } });
    if (!valid.length) throw validationError({ rows: 'No valid rows to import' });
    let pos = (await env.DB.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM mock_questions WHERE test_id = ?').bind(id).first()).m;
    const stmts = valid.map(x => {
      pos += 1;
      return env.DB.prepare(
        `INSERT INTO mock_questions (id, test_id, position, ${QCOLS.join(', ')}) VALUES (?, ?, ?, ${QCOLS.map(() => '?').join(', ')})`
      ).bind(crypto.randomUUID(), id, pos, ...QCOLS.map(c => (c === 'image_media_key' ? null : x.data[c])));
    });
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    await env.DB.prepare("UPDATE mock_tests SET updated_at = datetime('now') WHERE id = ?").bind(id).run();
    await audit(env, request, actor, 'mock_question.import', 'mock_test', id, { imported: valid.length, skipped: invalid.length });
    return json({ imported: valid.length, skipped: invalid.length });
  }
  if (sub) throw new HttpError(404, 'NOT_FOUND', 'Unknown route');

  if (method === 'GET') return json(test);
  if (method === 'PUT') {
    const f = await normalizeTest(await readJson(request), test);
    const slug = await uniqueSlug(env, f.slug, false, id);
    if (f.status !== 'draft') {
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM mock_questions WHERE test_id = ? AND deleted_at IS NULL').bind(id).first()).n;
      if (n === 0) throw validationError({ status: 'Add at least one question before publishing' });
    }
    await env.DB.prepare(
      `UPDATE mock_tests SET slug = ?, title = ?, title_or = ?, target_exam = ?, duration_minutes = ?, total_marks = ?, negative_marking = ?,
         status = ?, published_at = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(slug, f.title, f.title_or, f.target_exam, f.duration_minutes, f.total_marks, f.negative_marking, f.status, f.published_at, actor.userId, id).run();
    await audit(env, request, actor, 'mock_test.update', 'mock_test', id, { title: f.title, status: f.status });
    return json({ id, slug });
  }
  if (method === 'DELETE') {
    await env.DB.batch([
      env.DB.prepare("UPDATE mock_tests SET deleted_at = datetime('now'), updated_by = ?, updated_at = datetime('now') WHERE id = ?").bind(actor.userId, id),
      env.DB.prepare("UPDATE mock_questions SET deleted_at = datetime('now') WHERE test_id = ? AND deleted_at IS NULL").bind(id)
    ]);
    await audit(env, request, actor, 'mock_test.delete', 'mock_test', id, { title: test.title });
    return json({ id, deleted: true });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleQuestion(request, env, actor, qid) {
  const existing = await env.DB.prepare('SELECT * FROM mock_questions WHERE id = ? AND deleted_at IS NULL').bind(qid).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Question not found');
  if (request.method === 'GET') return json(existing);
  if (request.method === 'PUT') {
    const { q, errors } = normalizeQuestion(await readJson(request), existing);
    if (Object.keys(errors).length) throw validationError(errors);
    await checkImage(env, q.image_media_key);
    await env.DB.prepare(
      `UPDATE mock_questions SET ${QCOLS.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...QCOLS.map(c => q[c]), qid).run();
    await audit(env, request, actor, 'mock_question.update', 'mock_test', existing.test_id, { question_id: qid });
    return json({ id: qid });
  }
  if (request.method === 'DELETE') {
    await env.DB.prepare("UPDATE mock_questions SET deleted_at = datetime('now') WHERE id = ?").bind(qid).run();
    await audit(env, request, actor, 'mock_question.delete', 'mock_test', existing.test_id, { question_id: qid });
    return json({ id: qid, deleted: true });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
