// Folder #5 Backend (v312): CBT Mock Test & Bilingual Question Bank Studio
// Reconciles additive v312 columns seamlessly with legacy 0003_cms_content.sql tables
// so both Study Library CBT Studio and existing CMS endpoints stay 100% synchronized.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { cleanStr, slugify, SLUG_RE, likeEscape, parsePaging } from '../../_lib/validate.js';
import { recordAdminAuditLog } from './system-ops.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const MAX_IMPORT = 500;
let _schemaCache = null;

export async function ensureMockTestsV312Schema(db) {
  if (!db) return { testCols: new Set(), qCols: new Set() };
  if (_schemaCache && _schemaCache.db === db) return _schemaCache;

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS mock_tests (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL DEFAULT '',
      title_or TEXT NOT NULL DEFAULT '',
      exam_category TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      negative_mark REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS mock_questions (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      question_en TEXT NOT NULL DEFAULT '',
      question_or TEXT NOT NULL DEFAULT '',
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_index INTEGER NOT NULL DEFAULT 0,
      explanation_en TEXT NOT NULL DEFAULT '',
      explanation_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS mock_attempts (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      total_marks REAL NOT NULL DEFAULT 0,
      answers_json TEXT NOT NULL DEFAULT '{}',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  const tInfo = await db.prepare('PRAGMA table_info(mock_tests)').all();
  const testCols = new Set((tInfo.results || []).map(r => r.name));
  for (const [col, def] of [
    ['title_en', "TEXT NOT NULL DEFAULT ''"],
    ['title_or', "TEXT NOT NULL DEFAULT ''"],
    ['exam_category', "TEXT NOT NULL DEFAULT ''"],
    ['negative_mark', 'REAL NOT NULL DEFAULT 0']
  ]) {
    if (!testCols.has(col)) {
      await db.prepare(`ALTER TABLE mock_tests ADD COLUMN ${col} ${def}`).run();
      testCols.add(col);
    }
  }

  const qInfo = await db.prepare('PRAGMA table_info(mock_questions)').all();
  const qCols = new Set((qInfo.results || []).map(r => r.name));
  for (const [col, def] of [
    ['options_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['correct_index', 'INTEGER NOT NULL DEFAULT 0'],
    ['explanation_en', "TEXT NOT NULL DEFAULT ''"],
    ['explanation_or', "TEXT NOT NULL DEFAULT ''"],
    ['sort_order', 'INTEGER NOT NULL DEFAULT 0']
  ]) {
    if (!qCols.has(col)) {
      await db.prepare(`ALTER TABLE mock_questions ADD COLUMN ${col} ${def}`).run();
      qCols.add(col);
    }
  }

  _schemaCache = {
    db,
    testCols,
    qCols,
    hasLegacyTestCols: testCols.has('title') && testCols.has('target_exam'),
    hasLegacyTestDeleted: testCols.has('deleted_at'),
    hasLegacyQCols: qCols.has('option_a') && qCols.has('correct_option'),
    hasLegacyQDeleted: qCols.has('deleted_at')
  };
  return _schemaCache;
}

export function formatMockTestRow(r) {
  if (!r) return null;
  const titleEn = String(r.title_en || r.title || '');
  const examCat = String(r.exam_category || r.target_exam || '');
  const neg = Number(r.negative_mark !== undefined && r.negative_mark !== null && Number(r.negative_mark) !== 0
    ? r.negative_mark
    : (r.negative_marking !== undefined && r.negative_marking !== null ? r.negative_marking : r.negative_mark || 0));
  const qCount = Number(r.question_count || 0);
  return {
    id: String(r.id),
    slug: String(r.slug),
    title_en: titleEn,
    title: titleEn,
    title_or: String(r.title_or || ''),
    exam_category: examCat,
    target_exam: examCat,
    duration_minutes: Number(r.duration_minutes || 30),
    negative_mark: Number.isFinite(neg) ? neg : 0,
    negative_marking: Number.isFinite(neg) ? neg : 0,
    total_marks: Number(r.total_marks || qCount || 0),
    status: String(r.status || 'draft'),
    question_count: qCount,
    attempt_count: Number(r.attempt_count || 0),
    published_at: r.published_at || r.updated_at || r.created_at || '',
    created_at: r.created_at || '',
    updated_at: r.updated_at || ''
  };
}

export function parseOptionsFromRow(r) {
  if (r.options_json) {
    try {
      const arr = JSON.parse(r.options_json);
      if (Array.isArray(arr) && arr.length >= 2) {
        return arr.slice(0, 4).map(x => String(x ?? ''));
      }
    } catch { /* fall through */ }
  }
  const legacy = [r.option_a, r.option_b, r.option_c, r.option_d].map(x => String(x ?? ''));
  if (legacy.some(Boolean)) return legacy;
  return ['', '', '', ''];
}

export function parseCorrectIndexFromRow(r) {
  if (r.correct_index !== undefined && r.correct_index !== null && r.correct_index !== '') {
    const n = Number(r.correct_index);
    if (Number.isInteger(n) && n >= 0 && n <= 3) return n;
  }
  const letter = String(r.correct_option || '').trim().toUpperCase();
  const idx = LETTERS.indexOf(letter);
  return idx >= 0 ? idx : 0;
}

export function formatMockQuestionRow(r, includeAnswers = true) {
  const options = parseOptionsFromRow(r);
  while (options.length < 4) options.push('');
  const correctIdx = parseCorrectIndexFromRow(r);
  const sortOrder = Number(r.sort_order || r.position || 0);
  const base = {
    id: String(r.id),
    test_id: String(r.test_id),
    question_en: String(r.question_en || ''),
    question_or: String(r.question_or || ''),
    options,
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    sort_order: sortOrder,
    position: sortOrder,
    section: String(r.section || ''),
    marks: Number(r.marks || 1)
  };
  if (includeAnswers) {
    base.correct_index = correctIdx;
    base.correct_option = LETTERS[correctIdx] || 'A';
    base.explanation_en = String(r.explanation_en || r.explanation || '');
    base.explanation_or = String(r.explanation_or || '');
    base.explanation = base.explanation_en;
  }
  return base;
}

/** RFC 4180 CSV parser supporting quoted commas & multiline fields. */
export function parseMockQuestionsCsv(rawCsv) {
  const text = String(rawCsv || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'));
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = (cols[idx] || '').trim();
    });
    return obj;
  });
}

function normalizeQuestionPayload(raw, existing = null) {
  const errors = {};
  const v = (k, alias) => {
    if (raw[k] !== undefined) return raw[k];
    if (alias && raw[alias] !== undefined) return raw[alias];
    if (existing && existing[k] !== undefined) return existing[k];
    if (existing && alias && existing[alias] !== undefined) return existing[alias];
    return undefined;
  };

  const question_en = cleanStr(v('question_en', 'question'), 2000, { required: true, multiline: true });
  if (!question_en) errors.question_en = 'Question (English) is required';

  const question_or = cleanStr(v('question_or'), 2000, { multiline: true }) || '';

  let options = [];
  const rawOpts = raw.options !== undefined ? raw.options : raw.options_json;
  if (Array.isArray(rawOpts)) {
    options = rawOpts.map(o => cleanStr(o, 500, { multiline: true }) || '');
  } else if (typeof rawOpts === 'string' && rawOpts.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawOpts);
      if (Array.isArray(parsed)) options = parsed.map(o => cleanStr(o, 500, { multiline: true }) || '');
    } catch { /* ignore */ }
  } else {
    const existingOpts = existing ? parseOptionsFromRow(existing) : ['', '', '', ''];
    options = [
      cleanStr(raw.option_a !== undefined ? raw.option_a : existingOpts[0], 500, { multiline: true }) || '',
      cleanStr(raw.option_b !== undefined ? raw.option_b : existingOpts[1], 500, { multiline: true }) || '',
      cleanStr(raw.option_c !== undefined ? raw.option_c : existingOpts[2], 500, { multiline: true }) || '',
      cleanStr(raw.option_d !== undefined ? raw.option_d : existingOpts[3], 500, { multiline: true }) || ''
    ];
  }
  while (options.length < 4) options.push('');
  options = options.slice(0, 4);
  if (!options[0] || !options[1] || !options[2] || !options[3]) {
    errors.options = 'All 4 answer options (A, B, C, D) are required';
  }

  let correct_index = -1;
  const rawCorr = v('correct_index', 'correct_option');
  if (rawCorr !== undefined && rawCorr !== null && String(rawCorr).trim() !== '') {
    const str = String(rawCorr).trim().toUpperCase();
    if (LETTERS.includes(str)) {
      correct_index = LETTERS.indexOf(str);
    } else if (/^[0-3]$/.test(str)) {
      correct_index = Number(str);
    } else if (/^[1-4]$/.test(str) && raw.correct_index === undefined) {
      correct_index = Number(str) - 1;
    }
  }
  if (correct_index < 0 || correct_index > 3) {
    errors.correct_index = 'Correct answer must be 0–3 or A–D';
  }

  const explanation_en = cleanStr(v('explanation_en', 'explanation'), 4000, { multiline: true }) || '';
  const explanation_or = cleanStr(v('explanation_or'), 4000, { multiline: true }) || '';
  const sort_order = Math.max(0, Math.floor(Number(v('sort_order', 'position') || 0)));
  const section = cleanStr(v('section'), 80) || '';
  const marksRaw = v('marks');
  const marks = marksRaw === undefined || marksRaw === '' || marksRaw === null ? 1 : Number(marksRaw);

  return {
    q: {
      question_en: question_en || '',
      question_or,
      options,
      options_json: JSON.stringify(options),
      correct_index: Math.max(0, correct_index),
      correct_option: LETTERS[Math.max(0, correct_index)] || 'A',
      explanation_en,
      explanation_or,
      sort_order,
      section,
      marks: Number.isFinite(marks) && marks > 0 ? marks : 1
    },
    errors
  };
}

async function uniqueTestSlug(db, schema, slug, auto, excludeId = '') {
  let candidate = slug;
  const delClause = schema.hasLegacyTestDeleted ? 'AND deleted_at IS NULL' : '';
  for (let n = 0; n < 20; n++) {
    const row = await db.prepare(
      `SELECT id FROM mock_tests WHERE slug = ? ${delClause} AND id != ?`
    ).bind(candidate, excludeId || '').first();
    if (!row) return candidate;
    if (!auto) throw validationError({ slug: 'This mock test slug is already in use' });
    candidate = `${slug}-${n + 2}`.slice(0, 80);
  }
  throw new HttpError(409, 'CONFLICT', 'Could not generate a unique slug');
}

function normalizeTestPayload(body, existing = null) {
  const errors = {};
  const pick = (k, alias) => {
    if (body[k] !== undefined) return body[k];
    if (alias && body[alias] !== undefined) return body[alias];
    if (existing && existing[k] !== undefined && existing[k] !== '') return existing[k];
    if (existing && alias && existing[alias] !== undefined) return existing[alias];
    return undefined;
  };

  const title_en = cleanStr(pick('title_en', 'title'), 200, { required: true });
  if (!title_en) errors.title_en = 'Mock test title (EN) is required';

  const title_or = cleanStr(pick('title_or'), 200) || '';
  const exam_category = cleanStr(pick('exam_category', 'target_exam'), 100) || 'OPSC';

  const duration_minutes = Number(pick('duration_minutes') ?? 30);
  if (!Number.isInteger(duration_minutes) || duration_minutes < 1 || duration_minutes > 600) {
    errors.duration_minutes = 'Duration must be an integer between 1 and 600 minutes';
  }

  const negVal = pick('negative_mark', 'negative_marking');
  const negative_mark = (negVal === '' || negVal === undefined || negVal === null) ? 0 : Number(negVal);
  if (!Number.isFinite(negative_mark) || negative_mark < 0 || negative_mark > 10) {
    errors.negative_mark = 'Negative mark must be between 0 and 10';
  }

  const totalVal = pick('total_marks');
  const total_marks = (totalVal === '' || totalVal === undefined || totalVal === null) ? 100 : Number(totalVal);

  const rawStatus = String(pick('status') || 'draft').trim().toLowerCase();
  const status = ['draft', 'published', 'scheduled'].includes(rawStatus) ? rawStatus : 'draft';

  let slug = body.slug !== undefined ? cleanStr(body.slug, 80).toLowerCase() : (existing ? existing.slug : '');
  const auto = !slug;
  if (!slug) slug = slugify(title_en) || 'mock-test';
  if (!SLUG_RE.test(slug) || slug.length > 80) {
    errors.slug = 'Slug may contain lowercase letters, digits, and hyphens only';
  }

  if (Object.keys(errors).length) throw validationError(errors);
  return {
    slug,
    auto,
    title_en,
    title_or,
    exam_category,
    duration_minutes,
    negative_mark,
    total_marks: Number.isFinite(total_marks) && total_marks > 0 ? total_marks : 100,
    status
  };
}

async function insertQuestionRow(db, schema, testId, q, sortOrder) {
  const qid = `mq_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  if (schema.hasLegacyQCols) {
    await db.prepare(
      `INSERT INTO mock_questions (
        id, test_id, position, sort_order, section,
        question_en, question_or,
        option_a, option_b, option_c, option_d, options_json,
        correct_option, correct_index,
        explanation, explanation_en, explanation_or, marks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      qid, testId, sortOrder, sortOrder, q.section,
      q.question_en, q.question_or,
      q.options[0], q.options[1], q.options[2], q.options[3], q.options_json,
      q.correct_option, q.correct_index,
      q.explanation_en, q.explanation_en, q.explanation_or, q.marks
    ).run();
  } else {
    await db.prepare(
      `INSERT INTO mock_questions (
        id, test_id, question_en, question_or, options_json, correct_index,
        explanation_en, explanation_or, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      qid, testId, q.question_en, q.question_or, q.options_json, q.correct_index,
      q.explanation_en, q.explanation_or, sortOrder
    ).run();
  }
  return qid;
}

// ============================================================================
// ADMIN API: /api/admin/mock-tests/*
// ============================================================================
export async function handleAdminMockTestsV312(request, env, actor, id, sub, extra, ctx) {
  const db = env.DB;
  const schema = await ensureMockTestsV312Schema(db);
  const method = request.method;
  const url = new URL(request.url);
  const tDel = schema.hasLegacyTestDeleted ? 't.deleted_at IS NULL' : '1=1';
  const qDel = schema.hasLegacyQDeleted ? 'AND q.deleted_at IS NULL' : '';
  const qDelPlain = schema.hasLegacyQDeleted ? 'AND deleted_at IS NULL' : '';

  // 1. Collection routes: GET / POST /api/admin/mock-tests
  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url, 30, 100);
      const where = [tDel];
      const binds = [];

      const status = (url.searchParams.get('status') || '').trim().toLowerCase();
      if (status && ['draft', 'published', 'scheduled'].includes(status)) {
        where.push('t.status = ?');
        binds.push(status);
      }
      const cat = (url.searchParams.get('category') || url.searchParams.get('exam') || '').trim();
      if (cat) {
        if (schema.hasLegacyTestCols) {
          where.push('(t.exam_category = ? OR t.target_exam = ?)');
          binds.push(cat, cat);
        } else {
          where.push('t.exam_category = ?');
          binds.push(cat);
        }
      }
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) {
        const l = likeEscape(q);
        if (schema.hasLegacyTestCols) {
          where.push("(t.title_en LIKE ? ESCAPE '\\' OR t.title LIKE ? ESCAPE '\\' OR t.title_or LIKE ? ESCAPE '\\' OR t.slug LIKE ? ESCAPE '\\' OR t.exam_category LIKE ? ESCAPE '\\' OR t.target_exam LIKE ? ESCAPE '\\')");
          binds.push(l, l, l, l, l, l);
        } else {
          where.push("(t.title_en LIKE ? ESCAPE '\\' OR t.title_or LIKE ? ESCAPE '\\' OR t.slug LIKE ? ESCAPE '\\' OR t.exam_category LIKE ? ESCAPE '\\')");
          binds.push(l, l, l, l);
        }
      }

      const w = where.join(' AND ');
      const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM mock_tests t WHERE ${w}`).bind(...binds).first();
      const { results } = await db.prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = t.id ${qDel}) AS question_count,
                (SELECT COUNT(*) FROM mock_attempts a WHERE a.test_id = t.id) AS attempt_count
         FROM mock_tests t
         WHERE ${w}
         ORDER BY t.updated_at DESC, t.id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();

      const [pubRow, qTotRow, attTotRow] = await Promise.all([
        db.prepare(`SELECT COUNT(*) AS n FROM mock_tests t WHERE ${tDel} AND t.status = 'published'`).first(),
        db.prepare(`SELECT COUNT(*) AS n FROM mock_questions q WHERE 1=1 ${qDel}`).first(),
        db.prepare('SELECT COUNT(*) AS n FROM mock_attempts').first()
      ]);

      return json({
        ok: true,
        items: (results || []).map(formatMockTestRow),
        page,
        limit,
        total: Number((totalRow && totalRow.n) || 0),
        kpis: {
          total_tests: Number((totalRow && totalRow.n) || 0),
          published_tests: Number((pubRow && pubRow.n) || 0),
          total_questions: Number((qTotRow && qTotRow.n) || 0),
          total_attempts: Number((attTotRow && attTotRow.n) || 0)
        }
      });
    }

    if (method === 'POST') {
      const f = normalizeTestPayload(await readJson(request, 60000), null);
      const slug = await uniqueTestSlug(db, schema, f.slug, f.auto, '');
      const newId = `mt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const nowIso = new Date().toISOString();
      const pubAt = f.status === 'published' ? nowIso : null;

      if (schema.hasLegacyTestCols) {
        await db.prepare(
          `INSERT INTO mock_tests (
            id, slug, title, title_en, title_or, target_exam, exam_category,
            duration_minutes, total_marks, negative_marking, negative_mark,
            status, published_at, created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          newId, slug, f.title_en, f.title_en, f.title_or, f.exam_category, f.exam_category,
          f.duration_minutes, f.total_marks, f.negative_mark, f.negative_mark,
          f.status, pubAt, actor.userId || '', actor.userId || '', nowIso, nowIso
        ).run();
      } else {
        await db.prepare(
          `INSERT INTO mock_tests (
            id, slug, title_en, title_or, exam_category, duration_minutes, negative_mark, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          newId, slug, f.title_en, f.title_or, f.exam_category, f.duration_minutes, f.negative_mark, f.status, nowIso, nowIso
        ).run();
      }

      recordAdminAuditLog(env, request, actor, 'mock_test.create', newId, { slug, title_en: f.title_en }, ctx);
      const created = await db.prepare('SELECT * FROM mock_tests WHERE id = ?').bind(newId).first();
      return json({ ok: true, id: newId, slug, item: formatMockTestRow({ ...created, question_count: 0, attempt_count: 0 }) }, 201);
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Load target test
  const test = await db.prepare(
    `SELECT t.*,
            (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = t.id ${qDel}) AS question_count,
            (SELECT COUNT(*) FROM mock_attempts a WHERE a.test_id = t.id) AS attempt_count
     FROM mock_tests t WHERE t.id = ? AND ${tDel}`
  ).bind(id).first();
  if (!test) throw new HttpError(404, 'NOT_FOUND', 'Mock test not found');

  // 2. POST /api/admin/mock-tests/:id/status
  if (sub === 'status' && method === 'POST') {
    const body = await readJson(request, 8000);
    const nextStatus = String(body.status || '').trim().toLowerCase();
    if (!['draft', 'published', 'scheduled'].includes(nextStatus)) {
      throw validationError({ status: 'Status must be draft, published, or scheduled' });
    }
    if (nextStatus !== 'draft') {
      const qn = await db.prepare(`SELECT COUNT(*) AS n FROM mock_questions WHERE test_id = ? ${qDelPlain}`).bind(id).first();
      if (!qn || Number(qn.n) === 0) {
        throw validationError({ status: 'Add at least one question before publishing' });
      }
    }
    const nowIso = new Date().toISOString();
    if (schema.hasLegacyTestCols) {
      const pubAt = nextStatus === 'published' ? (test.published_at || nowIso) : (body.published_at || test.published_at || null);
      await db.prepare(
        'UPDATE mock_tests SET status = ?, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?'
      ).bind(nextStatus, pubAt, actor.userId || '', nowIso, id).run();
    } else {
      await db.prepare('UPDATE mock_tests SET status = ?, updated_at = ? WHERE id = ?').bind(nextStatus, nowIso, id).run();
    }
    recordAdminAuditLog(env, request, actor, `mock_test.${nextStatus}`, id, { slug: test.slug }, ctx);
    return json({ ok: true, id, status: nextStatus });
  }

  // 3. Questions sub-resource: /api/admin/mock-tests/:id/questions[/:qid]
  if (sub === 'questions') {
    if (!extra) {
      if (method === 'GET') {
        const orderCol = schema.hasLegacyQCols ? 'COALESCE(NULLIF(sort_order, 0), position, 0), id' : 'sort_order ASC, id ASC';
        const { results } = await db.prepare(
          `SELECT * FROM mock_questions WHERE test_id = ? ${qDelPlain} ORDER BY ${orderCol}`
        ).bind(id).all();
        return json({ ok: true, items: (results || []).map(r => formatMockQuestionRow(r, true)), total: (results || []).length });
      }
      if (method === 'POST') {
        const body = await readJson(request, 60000);
        const { q, errors } = normalizeQuestionPayload(body, null);
        if (Object.keys(errors).length) throw validationError(errors);
        const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM mock_questions WHERE test_id = ? ${qDelPlain}`).bind(id).first();
        const sortOrder = q.sort_order > 0 ? q.sort_order : Number((maxRow && maxRow.m) || 0) + 1;
        const qid = await insertQuestionRow(db, schema, id, q, sortOrder);
        await db.prepare('UPDATE mock_tests SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
        recordAdminAuditLog(env, request, actor, 'mock_question.create', id, { question_id: qid }, ctx);
        const saved = await db.prepare('SELECT * FROM mock_questions WHERE id = ?').bind(qid).first();
        return json({ ok: true, id: qid, position: sortOrder, sort_order: sortOrder, item: formatMockQuestionRow(saved, true) }, 201);
      }
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }

    // Single question PUT / DELETE
    const qRow = await db.prepare(`SELECT * FROM mock_questions WHERE id = ? AND test_id = ? ${qDelPlain}`).bind(extra, id).first();
    if (!qRow) throw new HttpError(404, 'NOT_FOUND', 'Question not found');

    if (method === 'PUT') {
      const body = await readJson(request, 60000);
      const { q, errors } = normalizeQuestionPayload(body, qRow);
      if (Object.keys(errors).length) throw validationError(errors);
      const sortOrder = q.sort_order || Number(qRow.sort_order || qRow.position || 1);
      if (schema.hasLegacyQCols) {
        await db.prepare(
          `UPDATE mock_questions
           SET position = ?, sort_order = ?, section = ?,
               question_en = ?, question_or = ?,
               option_a = ?, option_b = ?, option_c = ?, option_d = ?, options_json = ?,
               correct_option = ?, correct_index = ?,
               explanation = ?, explanation_en = ?, explanation_or = ?, marks = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          sortOrder, sortOrder, q.section,
          q.question_en, q.question_or,
          q.options[0], q.options[1], q.options[2], q.options[3], q.options_json,
          q.correct_option, q.correct_index,
          q.explanation_en, q.explanation_en, q.explanation_or, q.marks, extra
        ).run();
      } else {
        await db.prepare(
          `UPDATE mock_questions
           SET question_en = ?, question_or = ?, options_json = ?, correct_index = ?,
               explanation_en = ?, explanation_or = ?, sort_order = ?
           WHERE id = ?`
        ).bind(
          q.question_en, q.question_or, q.options_json, q.correct_index,
          q.explanation_en, q.explanation_or, sortOrder, extra
        ).run();
      }
      await db.prepare('UPDATE mock_tests SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
      recordAdminAuditLog(env, request, actor, 'mock_question.update', id, { question_id: extra }, ctx);
      const updated = await db.prepare('SELECT * FROM mock_questions WHERE id = ?').bind(extra).first();
      return json({ ok: true, id: extra, item: formatMockQuestionRow(updated, true) });
    }

    if (method === 'DELETE') {
      if (schema.hasLegacyQDeleted) {
        await db.prepare("UPDATE mock_questions SET deleted_at = datetime('now') WHERE id = ?").bind(extra).run();
      } else {
        await db.prepare('DELETE FROM mock_questions WHERE id = ?').bind(extra).run();
      }
      await db.prepare('UPDATE mock_tests SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
      recordAdminAuditLog(env, request, actor, 'mock_question.delete', id, { question_id: extra }, ctx);
      return json({ ok: true, id: extra, deleted: true });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // 4. Bulk CSV or JSON Import: POST /api/admin/mock-tests/:id/import or /import-csv
  if ((sub === 'import' || sub === 'import-csv') && method === 'POST') {
    const body = await readJson(request, 3_000_000);
    let rawRows = [];
    if (typeof body.csv === 'string' && body.csv.trim()) {
      rawRows = parseMockQuestionsCsv(body.csv);
    } else if (typeof body.raw === 'string' && body.raw.trim()) {
      rawRows = parseMockQuestionsCsv(body.raw);
    } else if (Array.isArray(body.rows)) {
      rawRows = body.rows;
    }

    if (!rawRows.length) {
      throw validationError({ rows: 'Provide a non-empty CSV string or rows array.' });
    }
    if (rawRows.length > MAX_IMPORT) {
      throw validationError({ rows: `At most ${MAX_IMPORT} questions per bulk import.` });
    }

    const valid = [];
    const invalid = [];
    rawRows.forEach((raw, i) => {
      const { q, errors } = normalizeQuestionPayload(raw && typeof raw === 'object' ? raw : {}, null);
      if (Object.keys(errors).length) invalid.push({ row: i + 1, errors, data: q });
      else valid.push({ row: i + 1, data: q });
    });

    const isDryRun = body.dry_run === true || (body.dry_run !== false && sub === 'import' && !body.csv && !body.raw);
    const report = {
      ok: true,
      total: rawRows.length,
      valid_count: valid.length,
      invalid_count: invalid.length,
      invalid,
      preview: valid.slice(0, 50).map(x => ({ row: x.row, ...x.data }))
    };

    if (isDryRun) return json({ ...report, dry_run: true });
    if (invalid.length && !body.skip_invalid) {
      throw new HttpError(422, 'VALIDATION_ERROR', `${invalid.length} row(s) have errors. Fix them or enable skip_invalid.`, { fields: { rows: 'Invalid rows present' } });
    }
    if (!valid.length) throw validationError({ rows: 'No valid questions found to import.' });

    const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM mock_questions WHERE test_id = ? ${qDelPlain}`).bind(id).first();
    let order = Number((maxRow && maxRow.m) || 0);

    for (const item of valid) {
      order += 1;
      await insertQuestionRow(db, schema, id, item.data, order);
    }
    await db.prepare('UPDATE mock_tests SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
    recordAdminAuditLog(env, request, actor, 'mock_question.import', id, { imported: valid.length, skipped: invalid.length }, ctx);
    return json({ ok: true, imported: valid.length, skipped: invalid.length, total: rawRows.length });
  }

  // 5. Real Attempts log: GET /api/admin/mock-tests/:id/attempts
  if (sub === 'attempts' && method === 'GET') {
    const { results } = await db.prepare(
      `SELECT id, test_id, candidate_id, score, total_marks, submitted_at
       FROM mock_attempts WHERE test_id = ? ORDER BY submitted_at DESC LIMIT 100`
    ).bind(id).all();
    return json({ ok: true, items: results || [], total: (results || []).length });
  }

  if (sub) throw new HttpError(404, 'NOT_FOUND', 'Unknown mock test route');

  // 6. Single Test GET / PUT / DELETE
  if (method === 'GET') {
    const orderCol = schema.hasLegacyQCols ? 'COALESCE(NULLIF(sort_order, 0), position, 0), id' : 'sort_order ASC, id ASC';
    const { results: qRows } = await db.prepare(
      `SELECT * FROM mock_questions WHERE test_id = ? ${qDelPlain} ORDER BY ${orderCol}`
    ).bind(id).all();
    return json({
      ok: true,
      ...formatMockTestRow(test),
      questions: (qRows || []).map(r => formatMockQuestionRow(r, true))
    });
  }

  if (method === 'PUT') {
    const f = normalizeTestPayload(await readJson(request, 60000), test);
    const slug = await uniqueTestSlug(db, schema, f.slug, false, id);
    const nowIso = new Date().toISOString();
    if (schema.hasLegacyTestCols) {
      const pubAt = f.status === 'published' ? (test.published_at || nowIso) : (test.published_at || null);
      await db.prepare(
        `UPDATE mock_tests
         SET slug = ?, title = ?, title_en = ?, title_or = ?, target_exam = ?, exam_category = ?,
             duration_minutes = ?, total_marks = ?, negative_marking = ?, negative_mark = ?,
             status = ?, published_at = ?, updated_by = ?, updated_at = ?
         WHERE id = ?`
      ).bind(
        slug, f.title_en, f.title_en, f.title_or, f.exam_category, f.exam_category,
        f.duration_minutes, f.total_marks, f.negative_mark, f.negative_mark,
        f.status, pubAt, actor.userId || '', nowIso, id
      ).run();
    } else {
      await db.prepare(
        `UPDATE mock_tests
         SET slug = ?, title_en = ?, title_or = ?, exam_category = ?,
             duration_minutes = ?, negative_mark = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).bind(slug, f.title_en, f.title_or, f.exam_category, f.duration_minutes, f.negative_mark, f.status, nowIso, id).run();
    }
    recordAdminAuditLog(env, request, actor, 'mock_test.update', id, { slug, status: f.status }, ctx);
    const updated = await db.prepare('SELECT * FROM mock_tests WHERE id = ?').bind(id).first();
    return json({ ok: true, id, slug, item: formatMockTestRow({ ...updated, question_count: test.question_count, attempt_count: test.attempt_count }) });
  }

  if (method === 'DELETE') {
    if (schema.hasLegacyTestDeleted) {
      await db.prepare("UPDATE mock_tests SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(id).run();
      if (schema.hasLegacyQDeleted) {
        await db.prepare("UPDATE mock_questions SET deleted_at = datetime('now') WHERE test_id = ? AND deleted_at IS NULL").bind(id).run();
      }
    } else {
      await db.prepare('DELETE FROM mock_questions WHERE test_id = ?').bind(id).run();
      await db.prepare('DELETE FROM mock_tests WHERE id = ?').bind(id).run();
    }
    recordAdminAuditLog(env, request, actor, 'mock_test.delete', id, { slug: test.slug }, ctx);
    return json({ ok: true, id, deleted: true });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
