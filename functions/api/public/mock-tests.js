// Public CBT Mock Tests API (v312):
//   GET  /api/public/mock-tests                -> list published CBT exams from D1
//   GET  /api/public/mock-tests/:slug          -> load exam + ordered questions (correct answers stripped)
//   POST /api/public/mock-tests/:slug/submit   -> real server-side grading + negative marking + D1 mock_attempts insert
//   GET  /api/public/mock-tests/:slug/leaderboard -> real top attempts from mock_attempts
import { HttpError, json, readJson, errorResponse, clientIp } from '../../_lib/http.js';
import { likeEscape, parsePaging } from '../../_lib/validate.js';
import { getSessionFromRequest } from '../auth/_utils.js';
import {
  ensureMockTestsV312Schema,
  formatMockTestRow,
  formatMockQuestionRow,
  parseOptionsFromRow,
  parseCorrectIndexFromRow
} from '../admin/mock-tests.js';

const LETTERS = ['A', 'B', 'C', 'D'];

function normalizeSelectedIndex(raw) {
  if (raw === null || raw === undefined || raw === '') return -1;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= 3) return raw;
  const s = String(raw).trim().toUpperCase();
  if (LETTERS.includes(s)) return LETTERS.indexOf(s);
  if (/^[0-3]$/.test(s)) return Number(s);
  return -1;
}

export async function handlePublicMockTestsApi(request, env, slugOrAction = '', sub = '') {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
    const db = env.DB;
    const schema = await ensureMockTestsV312Schema(db);
    const method = request.method;
    const url = new URL(request.url);
    const tDel = schema.hasLegacyTestDeleted ? 't.deleted_at IS NULL' : '1=1';
    const qDel = schema.hasLegacyQDeleted ? 'AND q.deleted_at IS NULL' : '';
    const qDelPlain = schema.hasLegacyQDeleted ? 'AND deleted_at IS NULL' : '';

    // 1. GET /api/public/mock-tests — list published tests
    if (!slugOrAction && (method === 'GET' || method === 'HEAD')) {
      const { page, limit, offset } = parsePaging(url, 12, 60);
      const where = [tDel, "t.status = 'published'"];
      const binds = [];

      const exam = (url.searchParams.get('exam') || url.searchParams.get('category') || '').trim();
      if (exam) {
        if (schema.hasLegacyTestCols) {
          where.push('(lower(t.exam_category) = lower(?) OR lower(t.target_exam) = lower(?))');
          binds.push(exam, exam);
        } else {
          where.push('lower(t.exam_category) = lower(?)');
          binds.push(exam);
        }
      }

      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) {
        const l = likeEscape(q);
        if (schema.hasLegacyTestCols) {
          where.push("(t.title_en LIKE ? ESCAPE '\\' OR t.title LIKE ? ESCAPE '\\' OR t.title_or LIKE ? ESCAPE '\\' OR t.exam_category LIKE ? ESCAPE '\\' OR t.target_exam LIKE ? ESCAPE '\\')");
          binds.push(l, l, l, l, l);
        } else {
          where.push("(t.title_en LIKE ? ESCAPE '\\' OR t.title_or LIKE ? ESCAPE '\\' OR t.exam_category LIKE ? ESCAPE '\\')");
          binds.push(l, l, l);
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

      const items = (results || []).map(formatMockTestRow);
      const categories = [...new Set(items.map(i => i.exam_category).filter(Boolean))];
      return json({
        ok: true,
        items,
        categories,
        page,
        limit,
        total: Number((totalRow && totalRow.n) || 0)
      });
    }

    // 2. GET /api/public/mock-tests/attempts — signed-in candidate's real attempts
    if (slugOrAction === 'attempts' && !sub && method === 'GET') {
      const session = await getSessionFromRequest(request, env).catch(() => null);
      if (!session || !session.userId) {
        return json({ ok: false, error: 'Sign in required' }, 401, { 'Cache-Control': 'no-store' });
      }
      const { results } = await db.prepare(
        `SELECT a.id, a.test_id, a.score, a.total_marks, a.submitted_at,
                t.slug AS test_slug, t.title_en, t.exam_category
         FROM mock_attempts a
         LEFT JOIN mock_tests t ON t.id = a.test_id
         WHERE a.candidate_id = ?
         ORDER BY a.submitted_at DESC LIMIT 50`
      ).bind(String(session.userId)).all();
      return json({ ok: true, items: results || [], total: (results || []).length }, 200, { 'Cache-Control': 'no-store' });
    }

    // Resolve published test by slug or id
    const testRow = await db.prepare(
      `SELECT t.*,
              (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = t.id ${qDel}) AS question_count,
              (SELECT COUNT(*) FROM mock_attempts a WHERE a.test_id = t.id) AS attempt_count
       FROM mock_tests t
       WHERE (t.slug = ? OR t.id = ?) AND t.status = 'published' AND ${tDel}`
    ).bind(slugOrAction, slugOrAction).first();
    if (!testRow) {
      return json({ ok: false, error: 'Mock test not found or not published' }, 404, { 'Cache-Control': 'no-store' });
    }
    const test = formatMockTestRow(testRow);

    // 3. GET /api/public/mock-tests/:slug — test + questions (answers omitted)
    if (!sub && (method === 'GET' || method === 'HEAD')) {
      const orderCol = schema.hasLegacyQCols ? 'COALESCE(NULLIF(sort_order, 0), position, 0), id' : 'sort_order ASC, id ASC';
      const { results: qRows } = await db.prepare(
        `SELECT * FROM mock_questions WHERE test_id = ? ${qDelPlain} ORDER BY ${orderCol}`
      ).bind(test.id).all();
      const questions = (qRows || []).map(r => formatMockQuestionRow(r, false));
      return json({
        ok: true,
        ...test,
        question_count: questions.length,
        total_marks: questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0),
        questions
      });
    }

    // 4. POST /api/public/mock-tests/:slug/submit — real server-side grading & mock_attempts persistence
    if (sub === 'submit' && method === 'POST') {
      const body = await readJson(request, 200000);
      const rawAnswers = (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) ? body.answers : {};
      const timeTakenSec = Math.max(0, Math.min(86400, Math.floor(Number(body.timeTakenSec || body.time_taken_sec || 0))));

      const orderCol = schema.hasLegacyQCols ? 'COALESCE(NULLIF(sort_order, 0), position, 0), id' : 'sort_order ASC, id ASC';
      const { results: qRows } = await db.prepare(
        `SELECT * FROM mock_questions WHERE test_id = ? ${qDelPlain} ORDER BY ${orderCol}`
      ).bind(test.id).all();

      if (!qRows || !qRows.length) {
        throw new HttpError(400, 'EMPTY_TEST', 'This mock test has no questions to grade.');
      }

      const negMark = Math.max(0, Number(test.negative_mark) || 0);
      let rawScore = 0;
      let totalMarks = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;
      const recordedAnswers = {};

      const breakdown = qRows.map(r => {
        const qMarks = Number(r.marks) > 0 ? Number(r.marks) : 1;
        totalMarks += qMarks;
        const options = parseOptionsFromRow(r);
        while (options.length < 4) options.push('');
        const correctIdx = parseCorrectIndexFromRow(r);
        const correctOption = LETTERS[correctIdx] || 'A';

        const selIdx = normalizeSelectedIndex(rawAnswers[r.id]);
        const selectedOption = selIdx >= 0 ? LETTERS[selIdx] : null;
        let status = 'unanswered';
        let marksAwarded = 0;

        if (selIdx < 0) {
          unansweredCount += 1;
        } else if (selIdx === correctIdx) {
          correctCount += 1;
          status = 'correct';
          marksAwarded = qMarks;
          recordedAnswers[r.id] = selIdx;
        } else {
          wrongCount += 1;
          status = 'wrong';
          marksAwarded = -negMark;
          recordedAnswers[r.id] = selIdx;
        }

        rawScore += marksAwarded;
        const expEn = String(r.explanation_en || r.explanation || '');
        const expOr = String(r.explanation_or || '');

        return {
          question_id: String(r.id),
          questionId: String(r.id),
          position: Number(r.sort_order || r.position || 0),
          section: String(r.section || ''),
          question_en: String(r.question_en || ''),
          question_or: String(r.question_or || ''),
          options,
          option_a: options[0],
          option_b: options[1],
          option_c: options[2],
          option_d: options[3],
          selected_index: selIdx >= 0 ? selIdx : null,
          selectedOption,
          correct_index: correctIdx,
          correctOption,
          status,
          marks: qMarks,
          marks_awarded: Number(marksAwarded.toFixed(2)),
          marksAwarded: Number(marksAwarded.toFixed(2)),
          explanation_en: expEn,
          explanation_or: expOr,
          explanation: expEn
        };
      });

      const score = Number(rawScore.toFixed(2));
      const finalTotal = Number(totalMarks.toFixed(2));
      const attempted = correctCount + wrongCount;
      const accuracy = attempted > 0 ? Number(((correctCount / attempted) * 100).toFixed(2)) : 0;

      const session = await getSessionFromRequest(request, env).catch(() => null);
      const candidateId = session && session.userId ? String(session.userId) : `guest:${clientIp(request) || 'anon'}`;
      const attemptId = `att_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const nowIso = new Date().toISOString();

      await db.prepare(
        `INSERT INTO mock_attempts (id, test_id, candidate_id, score, total_marks, answers_json, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        attemptId,
        test.id,
        candidateId,
        score,
        finalTotal,
        JSON.stringify({ answers: recordedAnswers, timeTakenSec, correctCount, wrongCount, unansweredCount, accuracy }),
        nowIso
      ).run();

      // Calculate real rank among all recorded attempts for this test
      const totalAttemptsRow = await db.prepare('SELECT COUNT(*) AS n FROM mock_attempts WHERE test_id = ?').bind(test.id).first();
      const higherRow = await db.prepare('SELECT COUNT(*) AS n FROM mock_attempts WHERE test_id = ? AND score > ?').bind(test.id, score).first();
      const totalAttempts = Number((totalAttemptsRow && totalAttemptsRow.n) || 1);
      const rank = Number((higherRow && higherRow.n) || 0) + 1;
      const percentile = totalAttempts <= 1 ? 100 : Number((((totalAttempts - rank) / (totalAttempts - 1)) * 100).toFixed(1));

      return json({
        ok: true,
        attempt_id: attemptId,
        test_id: test.id,
        testId: test.id,
        slug: test.slug,
        score,
        total_marks: finalTotal,
        maxScore: finalTotal,
        negative_mark: negMark,
        accuracy,
        correct_count: correctCount,
        correctCount,
        wrong_count: wrongCount,
        wrongCount,
        unanswered_count: unansweredCount,
        unansweredCount,
        timeTakenSec,
        rank,
        totalAttempts,
        totalParticipants: totalAttempts,
        percentile,
        persisted: true,
        signed_in: Boolean(session && session.userId),
        submitted_at: nowIso,
        breakdown
      }, 200, { 'Cache-Control': 'no-store' });
    }

    // 5. GET /api/public/mock-tests/:slug/leaderboard
    if (sub === 'leaderboard' && method === 'GET') {
      const { results } = await db.prepare(
        `SELECT id, candidate_id, score, total_marks, answers_json, submitted_at
         FROM mock_attempts
         WHERE test_id = ?
         ORDER BY score DESC, submitted_at ASC
         LIMIT 10`
      ).bind(test.id).all();

      const items = (results || []).map((row, idx) => {
        let meta = {};
        try { meta = JSON.parse(row.answers_json || '{}'); } catch { meta = {}; }
        const cid = String(row.candidate_id || '');
        const label = cid.startsWith('guest:') ? `Guest #${idx + 1}` : `Aspirant ${cid.slice(-4).toUpperCase()}`;
        return {
          rank: idx + 1,
          display_name: label,
          displayName: label,
          score: Number(row.score || 0),
          max_score: Number(row.total_marks || 0),
          maxScore: Number(row.total_marks || 0),
          accuracy: Number(meta.accuracy || 0),
          time_taken_sec: Number(meta.timeTakenSec || 0),
          timeTakenSec: Number(meta.timeTakenSec || 0),
          created_at: row.submitted_at
        };
      });
      return json({ ok: true, testId: test.id, slug: test.slug, title: test.title_en, items });
    }

    throw new HttpError(404, 'NOT_FOUND', 'Unknown public mock test route');
  } catch (err) {
    return errorResponse(err);
  }
}
