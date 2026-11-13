// Public read-only content API + server-side CBT grading & leaderboard.
// Visibility is evaluated at query time so scheduled items go live automatically — no cron worker required.
import { HttpError, json, readJson, errorResponse, clientIp } from '../../_lib/http.js';
import { getActor, verifyCsrf, rateLimit } from '../../_lib/rbac.js';
import { readBanner } from '../admin/_site.js';
import { renderMarkdown } from '../../_lib/markdown.js';
import { PUBLIC_VISIBLE_SQL, parsePaging, likeEscape } from '../../_lib/validate.js';
import { formatTaxonomyRow } from '../admin/_taxonomy.js';
import { enforceCandidateControls } from '../../_lib/candidate-controls.js';

const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const notFound = () => json({ error: 'Not found', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'public, max-age=30' });
const media = k => (k ? `/api/media/${k}` : null);

function postSummary(r) {
  const isExpired = r.type === 'job' && (r.status === 'expired' || Boolean(r.last_date && r.last_date < new Date().toISOString().slice(0, 10)));
  return {
    id: r.id, slug: r.slug, title: r.title, title_or: r.title_or, summary: r.summary, summary_or: r.summary_or,
    category: r.category, tags: JSON.parse(r.tags || '[]'), cover_url: media(r.cover_media_key),
    status: r.status === 'scheduled' ? 'published' : r.status,
    published_at: r.published_at, event_date: r.event_date,
    ...(r.type === 'job' ? {
      organisation: r.organisation, vacancies: r.vacancies, qualification: r.qualification, last_date: r.last_date,
      apply_url: r.apply_url, notification_url: media(r.notification_media_key), state: r.state,
      expired: isExpired,
      badge: isExpired ? 'Application Closed' : 'Active'
    } : {})
  };
}

const LIST_COLS = `id, type, slug, title, title_or, summary, summary_or, category, tags, cover_media_key, status, published_at, event_date,
  organisation, vacancies, qualification, last_date, apply_url, notification_media_key, state`;

async function listPosts(env, request, type, orderBy) {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaging(url);
  const where = [`type = ?`, PUBLIC_VISIBLE_SQL]; const binds = [type];
  const cat = (url.searchParams.get('category') || '').slice(0, 60);
  if (cat) { where.push('category = ?'); binds.push(cat); }
  const state = (url.searchParams.get('state') || '').slice(0, 60);
  if (state && type === 'job') { where.push('state = ?'); binds.push(state); }
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (q) {
    where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR organisation LIKE ? ESCAPE '\\')`);
    const l = likeEscape(q); binds.push(l, l, l);
  }
  const w = where.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${w}`).bind(...binds).first()).n;
  const { results } = await env.DB.prepare(
    `SELECT ${LIST_COLS} FROM posts WHERE ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ items: results.map(postSummary), page, limit, total }, 200, { 'Cache-Control': CACHE });
}

async function postDetail(env, type, slug) {
  const r = await env.DB.prepare(`SELECT ${LIST_COLS}, body_md, body_md_or FROM posts WHERE type = ? AND slug = ? AND ${PUBLIC_VISIBLE_SQL}`)
    .bind(type, slug).first();
  if (!r) return notFound();
  return json({ ...postSummary(r), body_html: renderMarkdown(r.body_md), body_html_or: r.body_md_or ? renderMarkdown(r.body_md_or) : '' },
    200, { 'Cache-Control': CACHE });
}

const TEST_COLS = 'id, slug, title, title_or, target_exam, duration_minutes, total_marks, negative_marking, published_at';

function maskDisplayName(fullName, email) {
  const cleanName = String(fullName || '').trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/);
    const first = parts[0];
    const lastInitial = parts.length > 1 && parts[parts.length - 1][0] ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : '';
    return `${first}${lastInitial}`;
  }
  const local = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
  if (!local) return 'Aspirant';
  if (local.length <= 3) return `${local[0].toUpperCase()}***`;
  return `${local.slice(0, 3)}***`;
}

async function handleMockTestLeaderboard(env, key) {
  const t = await env.DB.prepare(`SELECT ${TEST_COLS} FROM mock_tests WHERE (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`).bind(key, key).first();
  if (!t) return notFound();

  const { results } = await env.DB.prepare(
    `WITH ranked AS (
       SELECT
         a.id,
         a.user_id,
         a.score,
         a.max_score,
         a.accuracy,
         a.correct_count,
         a.wrong_count,
         a.unanswered_count,
         a.time_taken_sec,
         a.created_at,
         ROW_NUMBER() OVER (
           PARTITION BY a.user_id
           ORDER BY a.score DESC, a.time_taken_sec ASC, a.created_at ASC
         ) AS rn
       FROM test_attempts a
       WHERE a.test_id = ?
     )
     SELECT
       r.id AS attempt_id,
       r.user_id,
       r.score,
       r.max_score,
       r.accuracy,
       r.correct_count,
       r.wrong_count,
       r.unanswered_count,
       r.time_taken_sec,
       r.created_at,
       c.full_name,
       u.email
     FROM ranked r
     LEFT JOIN candidates c ON c.id = r.user_id
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.rn = 1
     ORDER BY r.score DESC, r.time_taken_sec ASC, r.created_at ASC
     LIMIT 10`
  ).bind(t.id).all();

  const items = results.map((row, idx) => {
    const displayName = maskDisplayName(row.full_name, row.email);
    return {
      rank: idx + 1,
      displayName,
      display_name: displayName,
      score: row.score,
      maxScore: row.max_score,
      max_score: row.max_score,
      accuracy: row.accuracy,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      timeTakenSec: row.time_taken_sec,
      time_taken_sec: row.time_taken_sec,
      createdAt: row.created_at,
      created_at: row.created_at
    };
  });

  return json(
    { testId: t.id, slug: t.slug, title: t.title, items },
    200,
    { 'Cache-Control': 'public, max-age=15, s-maxage=30' }
  );
}

async function handleMockTestSubmit(request, env, key) {
  verifyCsrf(request);
  const actor = await getActor(request, env);
  if (actor) {
    await enforceCandidateControls(env, actor.userId, { isWrite: true, permission: 'canTakeCbt' });
  }
  await rateLimit(env, `cbt-submit:${actor ? actor.userId : clientIp(request)}`, 30, 60);

  const t = await env.DB.prepare(`SELECT ${TEST_COLS} FROM mock_tests WHERE (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`).bind(key, key).first();
  if (!t) return notFound();

  const body = await readJson(request, 100000);
  const rawAnswers = (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) ? body.answers : {};
  const maxAllowedSec = Math.max(3600, (Number(t.duration_minutes) || 60) * 60 * 2);
  const timeTakenSec = Math.max(0, Math.min(maxAllowedSec, Math.floor(Number(body.timeTakenSec) || 0)));

  const { results: questions } = await env.DB.prepare(
    `SELECT id, position, section, question_en, question_or, option_a, option_b, option_c, option_d,
            correct_option, explanation, image_media_key, marks
     FROM mock_questions WHERE test_id = ? AND deleted_at IS NULL ORDER BY position`
  ).bind(t.id).all();

  if (!questions.length) {
    throw new HttpError(400, 'EMPTY_TEST', 'This mock test has no questions to grade');
  }

  const negMark = Math.max(0, Number(t.negative_marking) || 0);
  let rawScore = 0;
  let questionsMaxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const normalizedAnswers = {};

  const breakdown = questions.map(q => {
    const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
    questionsMaxScore += qMarks;

    const rawSel = rawAnswers[q.id];
    const selStr = typeof rawSel === 'string' ? rawSel.trim().toUpperCase() : '';
    const selectedOption = (selStr === 'A' || selStr === 'B' || selStr === 'C' || selStr === 'D') ? selStr : null;

    let status = 'unanswered';
    let marksAwarded = 0;

    if (!selectedOption) {
      unansweredCount++;
    } else if (selectedOption === q.correct_option) {
      correctCount++;
      status = 'correct';
      marksAwarded = qMarks;
      normalizedAnswers[q.id] = selectedOption;
    } else {
      wrongCount++;
      status = 'wrong';
      marksAwarded = -negMark;
      normalizedAnswers[q.id] = selectedOption;
    }

    rawScore += marksAwarded;

    return {
      questionId: q.id,
      position: q.position,
      section: q.section || '',
      question_en: q.question_en,
      question_or: q.question_or || '',
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      selectedOption,
      correctOption: q.correct_option,
      status,
      marks: qMarks,
      marksAwarded: Number(marksAwarded.toFixed(2)),
      explanation: q.explanation || ''
    };
  });

  const score = Number(rawScore.toFixed(2));
  const maxScore = Number((questionsMaxScore > 0 ? questionsMaxScore : (Number(t.total_marks) || 0)).toFixed(2));
  const attempted = correctCount + wrongCount;
  const accuracy = attempted > 0 ? Number(((correctCount / attempted) * 100).toFixed(2)) : 0;

  if (!actor) {
    return json({
      testId: t.id,
      slug: t.slug,
      score,
      maxScore,
      accuracy,
      correctCount,
      wrongCount,
      unansweredCount,
      timeTakenSec,
      breakdown,
      persisted: false
    }, 200, { 'Cache-Control': 'no-store' });
  }

  const attemptId = crypto.randomUUID();
  const answersJson = JSON.stringify({
    answers: normalizedAnswers,
    breakdown: breakdown.map(b => ({
      questionId: b.questionId,
      selectedOption: b.selectedOption,
      correctOption: b.correctOption,
      status: b.status,
      marksAwarded: b.marksAwarded
    }))
  });

  await env.DB.prepare(
    `INSERT INTO test_attempts (
       id, user_id, test_id, score, max_score, accuracy,
       correct_count, wrong_count, unanswered_count, time_taken_sec, answers_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    attemptId,
    actor.userId,
    t.id,
    score,
    maxScore,
    accuracy,
    correctCount,
    wrongCount,
    unansweredCount,
    timeTakenSec,
    answersJson
  ).run();

  const [betterRow, totalAttemptsRow, totalParticipantsRow] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) AS n
       FROM test_attempts
       WHERE test_id = ?
         AND user_id != ?
         AND (score > ? OR (score = ? AND time_taken_sec < ?))`
    ).bind(t.id, actor.userId, score, score, timeTakenSec).first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM test_attempts WHERE test_id = ?').bind(t.id).first(),
    env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM test_attempts WHERE test_id = ?').bind(t.id).first()
  ]);

  const rank = (betterRow ? betterRow.n : 0) + 1;
  const totalAttempts = totalAttemptsRow ? totalAttemptsRow.n : 1;
  const totalParticipants = totalParticipantsRow ? totalParticipantsRow.n : 1;
  const percentile = totalParticipants <= 1
    ? 100
    : Number((((totalParticipants - rank) / (totalParticipants - 1)) * 100).toFixed(1));

  return json({
    testId: t.id,
    slug: t.slug,
    score,
    maxScore,
    accuracy,
    correctCount,
    wrongCount,
    unansweredCount,
    timeTakenSec,
    breakdown,
    persisted: true,
    attemptId,
    rank,
    percentile,
    totalAttempts,
    totalParticipants
  }, 200, { 'Cache-Control': 'no-store' });
}

export async function handleContent(request, env) {
  if (!env.DB) return json({ error: 'Database unavailable', code: 'NO_DATABASE' }, 500);
  try {
    const url = new URL(request.url);
    const [resource, key, action] = url.pathname.replace(/^\/api\/content\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

    if (request.method === 'POST') {
      if (resource === 'mock-tests' && key && action === 'submit') {
        return await handleMockTestSubmit(request, env, key);
      }
      return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET, HEAD, POST' });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET, HEAD' });
    }

    if (resource === 'current-affairs') {
      return key ? await postDetail(env, 'current_affair', key)
        : await listPosts(env, request, 'current_affair', 'COALESCE(event_date, substr(published_at, 1, 10)) DESC, published_at DESC');
    }
    if (resource === 'jobs') {
      return key ? await postDetail(env, 'job', key)
        : await listPosts(env, request, 'job', "(last_date IS NULL OR last_date < date('now')) ASC, last_date ASC, published_at DESC");
    }
    if (resource === 'banner') {
      const b = await readBanner(env);
      const live = b.active && b.headline;
      return json(live ? { active: true, headline: b.headline, context: b.context, severity: b.severity, ctaText: b.ctaText, ctaUrl: b.ctaUrl, updatedAt: b.updatedAt } : { active: false },
        200, { 'Cache-Control': 'public, max-age=15, s-maxage=15' });
    }
    if (resource === 'exam-taxonomy') {
      const domain = (url.searchParams.get('domain') || '').trim().slice(0, 80);
      const where = ['is_active = 1'];
      const binds = [];
      if (domain) {
        where.push('domain_slug = ?');
        binds.push(domain);
      }
      const { results } = await env.DB.prepare(
        `SELECT * FROM exam_taxonomy WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, exam_label ASC`
      ).bind(...binds).all();
      return json({ items: results.map(formatTaxonomyRow), total: results.length }, 200, { 'Cache-Control': CACHE });
    }
    if (resource === 'schemes') {
      const { results } = await env.DB.prepare(
        `SELECT id, exam_label, short_code, track_label, streams_json, next_exam_date, countdown_status, parent_tags
         FROM exam_taxonomy WHERE domain_slug = 'scholarships-welfare' AND is_active = 1
         ORDER BY sort_order ASC`
      ).all();
      const items = results.map(r => ({
        id: r.id,
        title: r.exam_label,
        short_code: r.short_code,
        category: r.track_label,
        streams: JSON.parse(r.streams_json || '[]'),
        deadline: r.next_exam_date || null,
        status: r.countdown_status || 'TENTATIVE',
        tags: JSON.parse(r.parent_tags || '[]'),
        url: '/schemes-benefits/'
      }));
      return json({ items, total: items.length }, 200, { 'Cache-Control': CACHE });
    }
    if (resource === 'resources') {
      const { page, limit, offset } = parsePaging(url);
      const where = ["deleted_at IS NULL AND status = 'published'"]; const binds = [];
      const kind = url.searchParams.get('kind');
      if (kind === 'syllabus' || kind === 'pyq') { where.push('kind = ?'); binds.push(kind); }
      const exam = (url.searchParams.get('exam') || '').trim().slice(0, 100);
      if (exam) { where.push('exam = ?'); binds.push(exam); }
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR exam LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q); binds.push(l, l, l);
      }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM resources WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT id, kind, title, exam, year, description, media_key, published_at FROM resources WHERE ${w} ORDER BY year DESC, published_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({ items: results.map(({ media_key, ...r }) => ({ ...r, file_url: media(media_key) })), page, limit, total }, 200, { 'Cache-Control': CACHE });
    }
    if (resource === 'mock-tests') {
      if (!key) {
        const { page, limit, offset } = parsePaging(url);
        const where = [PUBLIC_VISIBLE_SQL]; const binds = [];
        const exam = (url.searchParams.get('exam') || '').trim().slice(0, 100);
        if (exam) { where.push('target_exam = ?'); binds.push(exam); }
        const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
        if (q) {
          where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR target_exam LIKE ? ESCAPE '\\')`);
          const l = likeEscape(q); binds.push(l, l, l);
        }
        const w = where.join(' AND ');
        const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM mock_tests WHERE ${w}`).bind(...binds).first()).n;
        const { results } = await env.DB.prepare(
          `SELECT ${TEST_COLS}, (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = mock_tests.id AND q.deleted_at IS NULL) AS question_count
           FROM mock_tests WHERE ${w} ORDER BY published_at DESC LIMIT ? OFFSET ?`
        ).bind(...binds, limit, offset).all();
        return json({ items: results, page, limit, offset, total }, 200, { 'Cache-Control': CACHE });
      }
      if (action === 'leaderboard') {
        return await handleMockTestLeaderboard(env, key);
      }
      if (action) return notFound();
      // Detail by slug or id. Answers/explanations are deliberately NOT exposed here;
      // the test engine grades strictly server-side via POST /api/content/mock-tests/:id/submit.
      const t = await env.DB.prepare(`SELECT ${TEST_COLS} FROM mock_tests WHERE (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`).bind(key, key).first();
      if (!t) return notFound();
      const { results } = await env.DB.prepare(
        `SELECT id, position, section, question_en, question_or, option_a, option_b, option_c, option_d, image_media_key, marks
         FROM mock_questions WHERE test_id = ? AND deleted_at IS NULL ORDER BY position`
      ).bind(t.id).all();
      return json({ ...t, questions: results.map(({ image_media_key, ...q }) => ({ ...q, image_url: media(image_media_key) })) },
        200, { 'Cache-Control': CACHE });
    }
    return notFound();
  } catch (e) {
    return errorResponse(e);
  }
}
