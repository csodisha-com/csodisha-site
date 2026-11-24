// Educational Resources Batch 4 (v81): Modules 13-16
// 13 MCQ & Quiz Builder | 14 Mock Tests | 15 Answer Keys & Explanations | 16 Resource Collections
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { ensureEduResourcesBatch3Schema } from './edu-resources-batch3.js';

export const B4_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
export const MOCK_ACCESS_TIERS = ['free', 'registered', 'featured'];
export const ANSWER_KEY_TYPES = ['official_provisional', 'official_final', 'model_expert', 'detailed_solutions'];
export const COLLECTION_TYPES = ['exam_starter_pack', 'subject_roadmap', 'crash_course_bundle', 'class_bundle'];

const _b4Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) { try { arr = JSON.parse(t); } catch { arr = t.split(','); } }
    else arr = t ? t.split(',') : [];
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 48).toLowerCase()).filter(Boolean))].slice(0, 16);
}

function validateSafeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

function sanitizeLinks(raw) {
  const list = parseJson(raw, []);
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list.slice(0, 15)) {
    if (!entry || typeof entry !== 'object') continue;
    const label = cleanStr(entry.label || entry.title || 'Official Link', 100);
    const url = validateSafeUrl(entry.url || '');
    if (!url) continue;
    out.push({
      label,
      url,
      type: cleanStr(entry.type || 'official', 30) || 'official',
      link_status: cleanStr(entry.link_status || 'unchecked', 20) || 'unchecked'
    });
  }
  return out;
}

async function saveB4Revision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM edu_batch4_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  const revId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO edu_batch4_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || '', 200), cleanStr(actorEmail || 'system', 120)).run();
}

const STARTER_QUIZZES = [];

const STARTER_MOCK_TESTS = [];

const STARTER_ANSWER_KEYS = [];

const STARTER_COLLECTIONS = [];

export async function ensureEduResourcesBatch4Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEduResourcesBatch3Schema(db);
  if (_b4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS edu_quizzes (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      class_grade_id TEXT NOT NULL DEFAULT '',
      subject_name TEXT NOT NULL DEFAULT '',
      topic_name TEXT NOT NULL DEFAULT '',
      exam_tag TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      question_ids_json TEXT NOT NULL DEFAULT '[]',
      duration_mins INTEGER NOT NULL DEFAULT 15,
      passing_score_pct REAL NOT NULL DEFAULT 40,
      marks_per_question REAL NOT NULL DEFAULT 1,
      negative_marks REAL NOT NULL DEFAULT 0,
      shuffle_questions INTEGER NOT NULL DEFAULT 1,
      flashcard_mode_enabled INTEGER NOT NULL DEFAULT 1,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      publish_at TEXT,
      expires_at TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      avg_score_pct REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_quizzes_status_subj ON edu_quizzes(status, subject_name)`,
    `CREATE TABLE IF NOT EXISTS edu_mock_tests (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      examination_id TEXT NOT NULL DEFAULT '',
      class_grade_id TEXT NOT NULL DEFAULT '',
      conducting_body TEXT NOT NULL DEFAULT 'OPSC',
      test_series_name TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      sections_json TEXT NOT NULL DEFAULT '[]',
      total_questions INTEGER NOT NULL DEFAULT 0,
      total_marks REAL NOT NULL DEFAULT 0,
      total_duration_mins INTEGER NOT NULL DEFAULT 120,
      negative_marking_rule TEXT NOT NULL DEFAULT '0.25 per wrong answer',
      access_tier TEXT NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free', 'registered', 'featured')),
      live_window_start TEXT,
      live_window_end TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      avg_score_pct REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_mocks_status_body ON edu_mock_tests(status, conducting_body)`,
    `CREATE TABLE IF NOT EXISTS edu_answer_keys (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      examination_id TEXT NOT NULL DEFAULT '',
      pyq_paper_id TEXT NOT NULL DEFAULT '',
      mock_test_id TEXT NOT NULL DEFAULT '',
      key_type TEXT NOT NULL DEFAULT 'official_provisional' CHECK (key_type IN (
        'official_provisional', 'official_final', 'model_expert', 'detailed_solutions'
      )),
      conducting_body TEXT NOT NULL DEFAULT 'OSSC',
      exam_year INTEGER NOT NULL DEFAULT 2025,
      paper_set_code TEXT NOT NULL DEFAULT 'Set A / B / C / D',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      answer_mapping_json TEXT NOT NULL DEFAULT '[]',
      objection_window_end TEXT NOT NULL DEFAULT '',
      challenge_url TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_ak_status_year ON edu_answer_keys(status, exam_year DESC)`,
    `CREATE TABLE IF NOT EXISTS edu_collections (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      collection_type TEXT NOT NULL DEFAULT 'exam_starter_pack' CHECK (collection_type IN (
        'exam_starter_pack', 'subject_roadmap', 'crash_course_bundle', 'class_bundle'
      )),
      examination_id TEXT NOT NULL DEFAULT '',
      class_grade_id TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL DEFAULT '[]',
      offline_pack_ready INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      enrollment_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_col_status_type ON edu_collections(status, collection_type)`,
    `CREATE TABLE IF NOT EXISTS edu_batch4_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL CHECK (module_code IN ('13', '14', '15', '16')),
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_b4_rev_entity ON edu_batch4_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Clean-slate v232: starter auto-seeding disabled; quizzes, mock tests, answer keys, and collections are managed via Admin Studio (/admin/).
  _b4Ready.add(db);
}

export async function getBatch4Overview(env) {
  await ensureEduResourcesBatch4Schema(env.DB);
  const [qRow, mRow, akRow, colRow] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(attempt_count), 0) AS att FROM edu_quizzes`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(attempt_count), 0) AS att FROM edu_mock_tests`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_answer_keys`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_collections`).first()
  ]);
  return {
    quizzes: Number(qRow?.n || 0),
    mock_tests: Number(mRow?.n || 0),
    answer_keys: Number(akRow?.n || 0),
    collections: Number(colRow?.n || 0),
    total_attempts: Number(qRow?.att || 0) + Number(mRow?.att || 0)
  };
}

// ---------- Module 13: MCQ & Quiz Builder ----------
function formatQuiz(row) {
  if (!row) return null;
  const qIds = parseJson(row.question_ids_json, []);
  const marksPerQ = Number(row.marks_per_question ?? 1);
  return {
    ...row,
    featured: Boolean(row.featured),
    shuffle_questions: Boolean(row.shuffle_questions),
    flashcard_mode_enabled: Boolean(row.flashcard_mode_enabled),
    question_ids: Array.isArray(qIds) ? qIds : [],
    total_questions: Array.isArray(qIds) ? qIds.length : 0,
    total_marks: Number(((Array.isArray(qIds) ? qIds.length : 0) * marksPerQ).toFixed(2)),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleQuizzes(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const subj = (url.searchParams.get('subject_name') || '').trim();
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B4_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (subj) { where.push('subject_name = ?'); binds.push(subj); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR subject_name LIKE ? ESCAPE '\\' OR exam_tag LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_quizzes`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatQuiz), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B4_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_quizzes SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        await audit(env, request, actor, 'edu.quiz.bulk_status', 'edu_quizzes', null, { status: body.status, count: ids.length });
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = B4_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'quiz';
      const dup = await env.DB.prepare(`SELECT id FROM edu_quizzes WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `quiz-${crypto.randomUUID().slice(0, 10)}`;
      const qIds = Array.isArray(body.question_ids) ? body.question_ids.map(x => cleanStr(x, 80)).filter(Boolean) : [];
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_quizzes (id, slug, class_grade_id, subject_name, topic_name, exam_tag, title_en, title_or, summary_en, summary_or, question_ids_json, duration_mins, passing_score_pct, marks_per_question, negative_marks, shuffle_questions, flashcard_mode_enabled, tags_json, status, publish_at, expires_at, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.class_grade_id || '', 120), cleanStr(body.subject_name || '', 120),
        cleanStr(body.topic_name || '', 120), cleanStr(body.exam_tag || '', 100), title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000), JSON.stringify(qIds),
        Number(body.duration_mins ?? 15) || 15, Number(body.passing_score_pct ?? 40), Number(body.marks_per_question ?? 1),
        Number(body.negative_marks ?? 0), body.shuffle_questions !== false ? 1 : 0, body.flashcard_mode_enabled !== false ? 1 : 0,
        JSON.stringify(tags), status, body.publish_at || null, body.expires_at || null, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ?`).bind(newId).first();
      await saveB4Revision(env.DB, '13', newId, created, 'Created quiz', actor.email);
      await audit(env, request, actor, 'edu.quiz.create', 'edu_quizzes', newId);
      return json({ ok: true, item: formatQuiz(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Quiz not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch4_revisions WHERE module_code = '13' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatQuiz(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const status = B4_STATUSES.includes(body.status) ? body.status : existing.status;
    const qIds = body.question_ids !== undefined ? (Array.isArray(body.question_ids) ? body.question_ids.map(x => cleanStr(x, 80)).filter(Boolean) : []) : parseJson(existing.question_ids_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_quizzes SET class_grade_id = ?, subject_name = ?, topic_name = ?, exam_tag = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, question_ids_json = ?, duration_mins = ?, passing_score_pct = ?, marks_per_question = ?, negative_marks = ?, shuffle_questions = ?, flashcard_mode_enabled = ?, tags_json = ?, status = ?, publish_at = ?, expires_at = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.class_grade_id ?? existing.class_grade_id, 120), cleanStr(body.subject_name ?? existing.subject_name, 120),
      cleanStr(body.topic_name ?? existing.topic_name, 120), cleanStr(body.exam_tag ?? existing.exam_tag, 100),
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      JSON.stringify(qIds), Number(body.duration_mins ?? existing.duration_mins), Number(body.passing_score_pct ?? existing.passing_score_pct),
      Number(body.marks_per_question ?? existing.marks_per_question), Number(body.negative_marks ?? existing.negative_marks),
      body.shuffle_questions !== undefined ? (body.shuffle_questions ? 1 : 0) : existing.shuffle_questions,
      body.flashcard_mode_enabled !== undefined ? (body.flashcard_mode_enabled ? 1 : 0) : existing.flashcard_mode_enabled,
      JSON.stringify(tags), status, body.publish_at !== undefined ? body.publish_at : existing.publish_at,
      body.expires_at !== undefined ? body.expires_at : existing.expires_at,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ?`).bind(id).first();
    await saveB4Revision(env.DB, '13', id, updated, body.change_note || 'Updated quiz', actor.email);
    await audit(env, request, actor, 'edu.quiz.update', 'edu_quizzes', id);
    return json({ ok: true, item: formatQuiz(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `quiz-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_quizzes (id, slug, class_grade_id, subject_name, topic_name, exam_tag, title_en, title_or, summary_en, summary_or, question_ids_json, duration_mins, passing_score_pct, marks_per_question, negative_marks, shuffle_questions, flashcard_mode_enabled, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.class_grade_id, existing.subject_name, existing.topic_name, existing.exam_tag, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.question_ids_json, existing.duration_mins, existing.passing_score_pct, existing.marks_per_question, existing.negative_marks, existing.shuffle_questions, existing.flashcard_mode_enabled, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatQuiz(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch4_revisions WHERE id = ? AND module_code = '13' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_quizzes SET title_en = ?, title_or = ?, question_ids_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.title_or || '', snap.question_ids_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatQuiz(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B4_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_quizzes SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatQuiz(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_quizzes WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 14: Mock Tests ----------
function computeMockTotals(sections) {
  let totalQ = 0;
  let totalM = 0;
  for (const s of Array.isArray(sections) ? sections : []) {
    const qIds = Array.isArray(s.question_ids_json) ? s.question_ids_json : (Array.isArray(s.question_ids) ? s.question_ids : []);
    const cnt = qIds.length;
    totalQ += cnt;
    totalM += cnt * Number(s.marks_per_q ?? 1);
  }
  return { total_questions: totalQ, total_marks: Number(totalM.toFixed(2)) };
}

function formatMockTest(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    sections: parseJson(row.sections_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleMockTests(request, env, actor, id) {
  const method = request.method;
  if (id === 'auto-fill' && method === 'POST') {
    const body = await readJson(request, 50_000);
    const subj = cleanStr(body.subject_name || '', 120);
    const diff = cleanStr(body.difficulty || '', 30);
    const limit = Math.min(Math.max(Number(body.limit || 20), 1), 100);
    const where = [`status = 'published'`]; const binds = [];
    if (subj) { where.push(`subject_name LIKE ? ESCAPE '\\'`); binds.push(`%${likeEscape(subj)}%`); }
    if (diff) { where.push(`difficulty = ?`); binds.push(diff); }
    const { results } = await env.DB.prepare(`SELECT id, question_en, subject_name, difficulty FROM edu_question_bank WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`).bind(...binds, limit).all();
    return json({ ok: true, question_ids: (results || []).map(r => r.id), items: results || [] });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const tier = url.searchParams.get('access_tier') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B4_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (tier && MOCK_ACCESS_TIERS.includes(tier)) { where.push('access_tier = ?'); binds.push(tier); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR conducting_body LIKE ? ESCAPE '\\' OR test_series_name LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_mock_tests`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatMockTest), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 400_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B4_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_mock_tests SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = B4_STATUSES.includes(body.status) ? body.status : 'draft';
      const tier = MOCK_ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : 'free';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'mock-test';
      const dup = await env.DB.prepare(`SELECT id FROM edu_mock_tests WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mock-${crypto.randomUUID().slice(0, 10)}`;
      const sections = parseJson(body.sections ?? body.sections_json, []);
      const totals = computeMockTotals(sections);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_mock_tests (id, slug, examination_id, class_grade_id, conducting_body, test_series_name, title_en, title_or, summary_en, summary_or, sections_json, total_questions, total_marks, total_duration_mins, negative_marking_rule, access_tier, live_window_start, live_window_end, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.examination_id || '', 120), cleanStr(body.class_grade_id || '', 120),
        cleanStr(body.conducting_body || 'OPSC', 60), cleanStr(body.test_series_name || '', 140),
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        JSON.stringify(sections), totals.total_questions, totals.total_marks,
        Number(body.total_duration_mins ?? 120) || 120, cleanStr(body.negative_marking_rule || '0.25 per wrong answer', 120),
        tier, body.live_window_start || null, body.live_window_end || null, JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ?`).bind(newId).first();
      await saveB4Revision(env.DB, '14', newId, created, 'Created mock test', actor.email);
      await audit(env, request, actor, 'edu.mock_test.create', 'edu_mock_tests', newId);
      return json({ ok: true, item: formatMockTest(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Mock test not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch4_revisions WHERE module_code = '14' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatMockTest(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 400_000);
    const status = B4_STATUSES.includes(body.status) ? body.status : existing.status;
    const tier = MOCK_ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : existing.access_tier;
    const sections = body.sections !== undefined ? parseJson(body.sections, []) : parseJson(existing.sections_json, []);
    const totals = computeMockTotals(sections);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_mock_tests SET examination_id = ?, class_grade_id = ?, conducting_body = ?, test_series_name = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, sections_json = ?, total_questions = ?, total_marks = ?, total_duration_mins = ?, negative_marking_rule = ?, access_tier = ?, live_window_start = ?, live_window_end = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.examination_id ?? existing.examination_id, 120), cleanStr(body.class_grade_id ?? existing.class_grade_id, 120),
      cleanStr(body.conducting_body ?? existing.conducting_body, 60), cleanStr(body.test_series_name ?? existing.test_series_name, 140),
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      JSON.stringify(sections), totals.total_questions, totals.total_marks,
      Number(body.total_duration_mins ?? existing.total_duration_mins), cleanStr(body.negative_marking_rule ?? existing.negative_marking_rule, 120),
      tier, body.live_window_start !== undefined ? body.live_window_start : existing.live_window_start,
      body.live_window_end !== undefined ? body.live_window_end : existing.live_window_end,
      JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ?`).bind(id).first();
    await saveB4Revision(env.DB, '14', id, updated, body.change_note || 'Updated mock test', actor.email);
    await audit(env, request, actor, 'edu.mock_test.update', 'edu_mock_tests', id);
    return json({ ok: true, item: formatMockTest(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `mock-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_mock_tests (id, slug, examination_id, class_grade_id, conducting_body, test_series_name, title_en, title_or, summary_en, summary_or, sections_json, total_questions, total_marks, total_duration_mins, negative_marking_rule, access_tier, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.examination_id, existing.class_grade_id, existing.conducting_body, existing.test_series_name, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.sections_json, existing.total_questions, existing.total_marks, existing.total_duration_mins, existing.negative_marking_rule, existing.access_tier, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatMockTest(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch4_revisions WHERE id = ? AND module_code = '14' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_mock_tests SET title_en = ?, sections_json = ?, total_questions = ?, total_marks = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.sections_json || '[]', Number(snap.total_questions || 0), Number(snap.total_marks || 0), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatMockTest(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B4_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_mock_tests SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatMockTest(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_mock_tests WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 15: Answer Keys & Explanations ----------
function formatAnswerKey(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    answer_mapping: parseJson(row.answer_mapping_json, []),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleAnswerKeys(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const keyType = url.searchParams.get('key_type') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B4_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (keyType && ANSWER_KEY_TYPES.includes(keyType)) { where.push('key_type = ?'); binds.push(keyType); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR conducting_body LIKE ? ESCAPE '\\')`);
        binds.push(l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE ${where.join(' AND ')} ORDER BY exam_year DESC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_answer_keys`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatAnswerKey), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 400_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B4_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_answer_keys SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = B4_STATUSES.includes(body.status) ? body.status : 'draft';
      const keyType = ANSWER_KEY_TYPES.includes(body.key_type) ? body.key_type : 'official_provisional';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'answer-key';
      const dup = await env.DB.prepare(`SELECT id FROM edu_answer_keys WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `ak-${crypto.randomUUID().slice(0, 10)}`;
      const mapping = parseJson(body.answer_mapping ?? body.answer_mapping_json, []);
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_answer_keys (id, slug, examination_id, pyq_paper_id, mock_test_id, key_type, conducting_body, exam_year, paper_set_code, title_en, title_or, summary_en, summary_or, answer_mapping_json, objection_window_end, challenge_url, r2_key, file_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.examination_id || '', 120), cleanStr(body.pyq_paper_id || '', 120), cleanStr(body.mock_test_id || '', 120),
        keyType, cleanStr(body.conducting_body || 'OSSC', 60), Number(body.exam_year || 2025) || 2025, cleanStr(body.paper_set_code || 'Set A / B / C / D', 60),
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        JSON.stringify(mapping), cleanStr(body.objection_window_end || '', 40), validateSafeUrl(body.challenge_url || ''),
        cleanStr(body.r2_key || '', 240), validateSafeUrl(body.file_url || ''), JSON.stringify(links), JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE id = ?`).bind(newId).first();
      await saveB4Revision(env.DB, '15', newId, created, 'Created answer key', actor.email);
      await audit(env, request, actor, 'edu.answer_key.create', 'edu_answer_keys', newId);
      return json({ ok: true, item: formatAnswerKey(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Answer key not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch4_revisions WHERE module_code = '15' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatAnswerKey(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 400_000);
    const status = B4_STATUSES.includes(body.status) ? body.status : existing.status;
    const keyType = ANSWER_KEY_TYPES.includes(body.key_type) ? body.key_type : existing.key_type;
    const mapping = body.answer_mapping !== undefined ? parseJson(body.answer_mapping, []) : parseJson(existing.answer_mapping_json, []);
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.external_links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_answer_keys SET examination_id = ?, pyq_paper_id = ?, mock_test_id = ?, key_type = ?, conducting_body = ?, exam_year = ?, paper_set_code = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, answer_mapping_json = ?, objection_window_end = ?, challenge_url = ?, r2_key = ?, file_url = ?, external_links_json = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.examination_id ?? existing.examination_id, 120), cleanStr(body.pyq_paper_id ?? existing.pyq_paper_id, 120),
      cleanStr(body.mock_test_id ?? existing.mock_test_id, 120), keyType, cleanStr(body.conducting_body ?? existing.conducting_body, 60),
      Number(body.exam_year ?? existing.exam_year), cleanStr(body.paper_set_code ?? existing.paper_set_code, 60),
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      JSON.stringify(mapping), cleanStr(body.objection_window_end ?? existing.objection_window_end, 40),
      validateSafeUrl(body.challenge_url ?? existing.challenge_url), cleanStr(body.r2_key ?? existing.r2_key, 240),
      validateSafeUrl(body.file_url ?? existing.file_url), JSON.stringify(links), JSON.stringify(tags), status,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE id = ?`).bind(id).first();
    await saveB4Revision(env.DB, '15', id, updated, body.change_note || 'Updated answer key', actor.email);
    return json({ ok: true, item: formatAnswerKey(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `ak-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_answer_keys (id, slug, examination_id, pyq_paper_id, mock_test_id, key_type, conducting_body, exam_year, paper_set_code, title_en, title_or, summary_en, summary_or, answer_mapping_json, objection_window_end, challenge_url, r2_key, file_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.examination_id, existing.pyq_paper_id, existing.mock_test_id, existing.key_type, existing.conducting_body, existing.exam_year, existing.paper_set_code, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.answer_mapping_json, existing.objection_window_end, existing.challenge_url, existing.r2_key, existing.file_url, existing.external_links_json, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatAnswerKey(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch4_revisions WHERE id = ? AND module_code = '15' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_answer_keys SET title_en = ?, answer_mapping_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.answer_mapping_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatAnswerKey(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B4_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_answer_keys SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatAnswerKey(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_answer_keys WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 16: Resource Collections ----------
function formatCollection(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    offline_pack_ready: Boolean(row.offline_pack_ready),
    items: parseJson(row.items_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleCollections(request, env, actor, id) {
  const method = request.method;
  if (id === 'search-items' && method === 'GET') {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    const l = `%${likeEscape(q)}%`;
    const [resRows, sylRows, pyqRows, qzRows, mkRows] = await Promise.all([
      env.DB.prepare(`SELECT id, title_en, title_or, resource_type FROM edu_resources WHERE title_en LIKE ? ESCAPE '\\' LIMIT 10`).bind(l).all(),
      env.DB.prepare(`SELECT id, title_en, title_or FROM edu_syllabi WHERE title_en LIKE ? ESCAPE '\\' LIMIT 10`).bind(l).all(),
      env.DB.prepare(`SELECT id, title_en, title_or FROM edu_pyq_papers WHERE title_en LIKE ? ESCAPE '\\' LIMIT 10`).bind(l).all(),
      env.DB.prepare(`SELECT id, title_en, title_or FROM edu_quizzes WHERE title_en LIKE ? ESCAPE '\\' LIMIT 10`).bind(l).all(),
      env.DB.prepare(`SELECT id, title_en, title_or FROM edu_mock_tests WHERE title_en LIKE ? ESCAPE '\\' LIMIT 10`).bind(l).all()
    ]);
    const results = [
      ...(resRows.results || []).map(r => ({ module_code: r.resource_type === 'notes_pdf' ? '03' : r.resource_type === 'book_reference' ? '04' : '01', item_id: r.id, title_en: r.title_en, title_or: r.title_or || '' })),
      ...(sylRows.results || []).map(r => ({ module_code: '10', item_id: r.id, title_en: r.title_en, title_or: r.title_or || '' })),
      ...(pyqRows.results || []).map(r => ({ module_code: '11', item_id: r.id, title_en: r.title_en, title_or: r.title_or || '' })),
      ...(qzRows.results || []).map(r => ({ module_code: '13', item_id: r.id, title_en: r.title_en, title_or: r.title_or || '' })),
      ...(mkRows.results || []).map(r => ({ module_code: '14', item_id: r.id, title_en: r.title_en, title_or: r.title_or || '' }))
    ];
    return json({ ok: true, items: results });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const cType = url.searchParams.get('collection_type') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B4_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (cType && COLLECTION_TYPES.includes(cType)) { where.push('collection_type = ?'); binds.push(cType); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\')`);
        binds.push(l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_collections WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_collections`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatCollection), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B4_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_collections SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = B4_STATUSES.includes(body.status) ? body.status : 'draft';
      const cType = COLLECTION_TYPES.includes(body.collection_type) ? body.collection_type : 'exam_starter_pack';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'collection';
      const dup = await env.DB.prepare(`SELECT id FROM edu_collections WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `col-${crypto.randomUUID().slice(0, 10)}`;
      const items = parseJson(body.items ?? body.items_json, []);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_collections (id, slug, collection_type, examination_id, class_grade_id, title_en, title_or, summary_en, summary_or, cover_image_url, items_json, offline_pack_ready, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cType, cleanStr(body.examination_id || '', 120), cleanStr(body.class_grade_id || '', 120),
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        validateSafeUrl(body.cover_image_url || ''), JSON.stringify(items), body.offline_pack_ready ? 1 : 0,
        JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_collections WHERE id = ?`).bind(newId).first();
      await saveB4Revision(env.DB, '16', newId, created, 'Created collection', actor.email);
      await audit(env, request, actor, 'edu.collection.create', 'edu_collections', newId);
      return json({ ok: true, item: formatCollection(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_collections WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Collection not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch4_revisions WHERE module_code = '16' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatCollection(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const status = B4_STATUSES.includes(body.status) ? body.status : existing.status;
    const cType = COLLECTION_TYPES.includes(body.collection_type) ? body.collection_type : existing.collection_type;
    const items = body.items !== undefined ? parseJson(body.items, []) : parseJson(existing.items_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_collections SET collection_type = ?, examination_id = ?, class_grade_id = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, cover_image_url = ?, items_json = ?, offline_pack_ready = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cType, cleanStr(body.examination_id ?? existing.examination_id, 120), cleanStr(body.class_grade_id ?? existing.class_grade_id, 120),
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      validateSafeUrl(body.cover_image_url ?? existing.cover_image_url), JSON.stringify(items),
      body.offline_pack_ready !== undefined ? (body.offline_pack_ready ? 1 : 0) : existing.offline_pack_ready,
      JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_collections WHERE id = ?`).bind(id).first();
    await saveB4Revision(env.DB, '16', id, updated, body.change_note || 'Updated collection', actor.email);
    return json({ ok: true, item: formatCollection(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `col-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_collections (id, slug, collection_type, examination_id, class_grade_id, title_en, title_or, summary_en, summary_or, cover_image_url, items_json, offline_pack_ready, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.collection_type, existing.examination_id, existing.class_grade_id, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.cover_image_url, existing.items_json, existing.offline_pack_ready, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_collections WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatCollection(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch4_revisions WHERE id = ? AND module_code = '16' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_collections SET title_en = ?, items_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.items_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_collections WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCollection(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B4_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_collections SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_collections WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatCollection(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_collections WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleEduBatch4Admin(request, env, actor, sub, extra) {
  await ensureEduResourcesBatch4Schema(env.DB);
  if (sub === 'quizzes') return handleQuizzes(request, env, actor, extra);
  if (sub === 'mock-tests') return handleMockTests(request, env, actor, extra);
  if (sub === 'answer-keys') return handleAnswerKeys(request, env, actor, extra);
  if (sub === 'collections') return handleCollections(request, env, actor, extra);
  return null;
}

// ---------- Public APIs & Assessment Grading ----------
async function fetchSanitizedQuestions(db, questionIds) {
  const ids = Array.isArray(questionIds) ? questionIds.filter(Boolean).slice(0, 200) : [];
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const { results } = await db.prepare(
    `SELECT id, slug, subject_name, topic_name, difficulty, question_en, question_or, options_json FROM edu_question_bank WHERE id IN (${placeholders}) AND status = 'published'`
  ).bind(...ids).all();
  const byId = new Map((results || []).map(r => [r.id, {
    id: r.id,
    slug: r.slug,
    subject_name: r.subject_name,
    topic_name: r.topic_name,
    difficulty: r.difficulty,
    question_en: r.question_en,
    question_or: r.question_or,
    options: parseJson(r.options_json, {})
  }]));
  return ids.map(id => byId.get(id)).filter(Boolean);
}

export async function handlePublicEduQuizzesApi(request, env) {
  await ensureEduResourcesBatch4Schema(env.DB);
  const url = new URL(request.url);
  const idOrSlug = (url.searchParams.get('id') || url.searchParams.get('slug') || '').trim();
  if (idOrSlug) {
    const row = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE (id = ? OR slug = ?) AND status = 'published'`).bind(idOrSlug, idOrSlug).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Quiz not found');
    const formatted = formatQuiz(row);
    const questions = await fetchSanitizedQuestions(env.DB, formatted.question_ids);
    return json({ ok: true, item: formatted, questions });
  }
  const { results } = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE status = 'published' ORDER BY featured DESC, updated_at DESC LIMIT 60`).all();
  return json({ ok: true, items: (results || []).map(formatQuiz) });
}

export async function handlePublicEduMockTestsApi(request, env) {
  await ensureEduResourcesBatch4Schema(env.DB);
  const url = new URL(request.url);
  const idOrSlug = (url.searchParams.get('id') || url.searchParams.get('slug') || '').trim();
  if (idOrSlug) {
    const row = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE (id = ? OR slug = ?) AND status = 'published'`).bind(idOrSlug, idOrSlug).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Mock test not found');
    const formatted = formatMockTest(row);
    const sections = [];
    for (const sec of formatted.sections) {
      const qIds = Array.isArray(sec.question_ids_json) ? sec.question_ids_json : (Array.isArray(sec.question_ids) ? sec.question_ids : []);
      sections.push({
        ...sec,
        questions: await fetchSanitizedQuestions(env.DB, qIds)
      });
    }
    return json({ ok: true, item: formatted, sections });
  }
  const { results } = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE status = 'published' ORDER BY featured DESC, updated_at DESC LIMIT 60`).all();
  return json({ ok: true, items: (results || []).map(formatMockTest) });
}

export async function handlePublicEduAnswerKeysApi(request, env) {
  await ensureEduResourcesBatch4Schema(env.DB);
  const { results } = await env.DB.prepare(`SELECT * FROM edu_answer_keys WHERE status = 'published' ORDER BY exam_year DESC, featured DESC, updated_at DESC LIMIT 60`).all();
  return json({ ok: true, items: (results || []).map(formatAnswerKey) });
}

export async function handlePublicEduCollectionsApi(request, env) {
  await ensureEduResourcesBatch4Schema(env.DB);
  const { results } = await env.DB.prepare(`SELECT * FROM edu_collections WHERE status = 'published' ORDER BY featured DESC, updated_at DESC LIMIT 60`).all();
  return json({ ok: true, items: (results || []).map(formatCollection) });
}

export async function handlePublicEduAssessmentGradeApi(request, env) {
  await ensureEduResourcesBatch4Schema(env.DB);
  const body = await readJson(request, 200_000);
  const kind = body.kind === 'mock_test' ? 'mock_test' : 'quiz';
  const id = cleanStr(body.id || '', 120);
  if (!id) throw validationError({ id: 'Assessment id is required' });
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  let questionSpecs = [];
  let passingPct = 40;
  let table = 'edu_quizzes';
  let currentAttempts = 0;
  let currentAvg = 0;

  if (kind === 'quiz') {
    const qz = await env.DB.prepare(`SELECT * FROM edu_quizzes WHERE id = ? AND status = 'published'`).bind(id).first();
    if (!qz) throw new HttpError(404, 'NOT_FOUND', 'Quiz not found');
    const qIds = parseJson(qz.question_ids_json, []);
    const pos = Number(qz.marks_per_question ?? 1);
    const neg = Number(qz.negative_marks ?? 0);
    passingPct = Number(qz.passing_score_pct ?? 40);
    currentAttempts = Number(qz.attempt_count || 0);
    currentAvg = Number(qz.avg_score_pct || 0);
    questionSpecs = qIds.map(qId => ({ qId, pos, neg }));
  } else {
    table = 'edu_mock_tests';
    const mk = await env.DB.prepare(`SELECT * FROM edu_mock_tests WHERE id = ? AND status = 'published'`).bind(id).first();
    if (!mk) throw new HttpError(404, 'NOT_FOUND', 'Mock test not found');
    currentAttempts = Number(mk.attempt_count || 0);
    currentAvg = Number(mk.avg_score_pct || 0);
    const sections = parseJson(mk.sections_json, []);
    for (const sec of sections) {
      const qIds = Array.isArray(sec.question_ids_json) ? sec.question_ids_json : (Array.isArray(sec.question_ids) ? sec.question_ids : []);
      const pos = Number(sec.marks_per_q ?? 1);
      const neg = Number(sec.negative_marks ?? 0);
      for (const qId of qIds) questionSpecs.push({ qId, pos, neg });
    }
  }

  const allIds = [...new Set(questionSpecs.map(s => s.qId).filter(Boolean))];
  const qbMap = new Map();
  if (allIds.length) {
    const placeholders = allIds.map(() => '?').join(', ');
    const { results } = await env.DB.prepare(
      `SELECT id, correct_option, explanation_en, explanation_or FROM edu_question_bank WHERE id IN (${placeholders})`
    ).bind(...allIds).all();
    for (const r of results || []) qbMap.set(r.id, r);
  }

  let attempted = 0;
  let correct = 0;
  let wrong = 0;
  let score = 0;
  let maxScore = 0;
  const breakdown = [];

  for (const spec of questionSpecs) {
    const qb = qbMap.get(spec.qId);
    if (!qb) continue;
    maxScore += spec.pos;
    const given = String(answers[spec.qId] || '').trim().toUpperCase();
    const isCorrect = given && given === qb.correct_option;
    if (given) {
      attempted++;
      if (isCorrect) {
        correct++;
        score += spec.pos;
      } else {
        wrong++;
        score -= spec.neg;
      }
    }
    breakdown.push({
      question_id: spec.qId,
      given_option: given || null,
      correct_option: qb.correct_option,
      is_correct: Boolean(isCorrect),
      explanation_en: qb.explanation_en || '',
      explanation_or: qb.explanation_or || ''
    });
  }

  const scorePct = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
  const newAttempts = currentAttempts + 1;
  const newAvg = Number((((currentAvg * currentAttempts) + scorePct) / newAttempts).toFixed(2));
  await env.DB.prepare(`UPDATE ${table} SET attempt_count = ?, avg_score_pct = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(newAttempts, newAvg, id).run();

  return json({
    ok: true,
    kind,
    id,
    total_questions: breakdown.length,
    attempted,
    correct,
    wrong,
    score: Number(score.toFixed(2)),
    max_score: Number(maxScore.toFixed(2)),
    score_pct: scorePct,
    passed: scorePct >= passingPct,
    breakdown
  });
}
