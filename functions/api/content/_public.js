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
const media = k => {
  if (!k) return null;
  const s = String(k);
  return s.startsWith('external:') ? s.slice(9) : `/api/media/${s}`;
};

function safeJsonArr(v) {
  try {
    const p = JSON.parse(v || '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function postSummary(r) {
  const isExpired = r.type === 'job' && (r.status === 'expired' || Boolean(r.last_date && r.last_date < new Date().toISOString().slice(0, 10)));
  return {
    id: r.id, slug: r.slug, title: r.title, title_or: r.title_or, summary: r.summary, summary_or: r.summary_or,
    category: r.category, tags: safeJsonArr(r.tags), cover_url: media(r.cover_media_key),
    goal_exam_ids: safeJsonArr(r.goal_exam_ids),
    status: r.status === 'scheduled' ? 'published' : r.status,
    published_at: r.published_at, event_date: r.event_date,
    ...(r.type === 'job' ? {
      organisation: r.organisation, vacancies: r.vacancies, qualification: r.qualification, last_date: r.last_date,
      apply_url: r.apply_url, notification_url: media(r.notification_media_key), state: r.state,
      age_limit: r.age_limit || null, salary_pay: r.salary_pay || null, source_url: r.source_url || null,
      expired: isExpired,
      badge: isExpired ? 'Application Closed' : 'Active'
    } : {})
  };
}

const LIST_COLS = `id, type, slug, title, title_or, summary, summary_or, category, tags, goal_exam_ids, cover_media_key, status, published_at, event_date,
  organisation, vacancies, qualification, last_date, apply_url, notification_media_key, state, age_limit, salary_pay, source_url`;

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

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str || '')));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handlePublicFeedback(request, env) {
  const ip = clientIp(request);
  await rateLimit(env, `feedback:${ip}`, 8, 600);
  const body = await readJson(request, 25000);
  const allowedKinds = new Set(['error', 'suggestion', 'broken_link', 'outdated']);
  const kind = allowedKinds.has(body.kind) ? body.kind : 'error';
  const pageUrl = String(body.page_url || '/').trim().slice(0, 500) || '/';
  const pageTitle = String(body.page_title || '').trim().slice(0, 200);
  const subject = String(body.subject || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const details = String(body.details || '').trim().slice(0, 2000);
  const contactEmail = String(body.contact_email || '').trim().slice(0, 120);

  if (!subject || subject.length < 3) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Please enter a brief subject (at least 3 characters)', { fields: { subject: 'Subject too short' } });
  }
  if (!details || details.length < 8) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Please provide clear details (at least 8 characters)', { fields: { details: 'Details too short' } });
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Enter a valid email or leave blank', { fields: { contact_email: 'Invalid email' } });
  }

  const actor = await getActor(request, env).catch(() => null);
  const id = `fb-${crypto.randomUUID()}`;
  const ipHash = await sha256Hex(ip);

  await env.DB.prepare(
    `INSERT INTO community_feedback (id, kind, page_url, page_title, subject, details, contact_email, user_id, ip_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
  ).bind(id, kind, pageUrl, pageTitle || null, subject, details, contactEmail || null, actor ? actor.userId : null, ipHash).run();

  return json({ ok: true, id, message: 'Thank you. Your report has been queued for editorial review.' }, 201, { 'Cache-Control': 'no-store' });
}

async function handleJobsDirectory(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, parent_id, level, code, title, title_or, description, description_or, group_slug, url, exam_slug, notes_json, tags, sort_order
     FROM jobs_directory_nodes WHERE is_active = 1
     ORDER BY level ASC, sort_order ASC, id ASC`
  ).all();

  const nodeMap = new Map();
  const counts = { groups: 0, sections: 0, subcategories: 0, entries: 0, notes: 0 };
  const roots = [];

  for (const r of results) {
    const notesArr = safeJsonArr(r.notes_json).map(t => (typeof t === 'string' ? { text: t } : t));
    counts.notes += notesArr.length;
    if (r.level === 0) counts.groups++;
    else if (r.level === 1) counts.sections++;
    else if (r.level === 2) counts.subcategories++;
    else counts.entries++;

    nodeMap.set(r.id, {
      id: r.id,
      parent_id: r.parent_id,
      level: r.level,
      number: r.code || '',
      title: r.title,
      title_or: r.title_or || '',
      description: r.description || '',
      description_or: r.description_or || '',
      group_slug: r.group_slug || '',
      url: r.url || '',
      exam_slug: r.exam_slug || '',
      tags: safeJsonArr(r.tags),
      notes: notesArr,
      children: []
    });
  }

  for (const r of results) {
    const node = nodeMap.get(r.id);
    if (r.parent_id && nodeMap.has(r.parent_id)) {
      nodeMap.get(r.parent_id).children.push(node);
    } else if (r.level === 0) {
      roots.push(node);
    }
  }

  return json({ source: 'd1:jobs_directory_nodes', counts, sections: roots }, 200, { 'Cache-Control': CACHE });
}

function presentScheme(r) {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    title_or: r.title_or || '',
    summary: r.summary || '',
    summary_or: r.summary_or || '',
    body_html: r.body_md ? renderMarkdown(r.body_md) : '',
    body_html_or: r.body_md_or ? renderMarkdown(r.body_md_or) : '',
    category: r.category,
    department: r.department || '',
    gov_level: r.gov_level || 'Odisha',
    target_groups: safeJsonArr(r.target_groups),
    min_age: r.min_age,
    max_age: r.max_age,
    max_income: r.max_income,
    gender_eligible: r.gender_eligible || 'all',
    beneficiary_categories: safeJsonArr(r.beneficiary_categories),
    benefit_summary: r.benefit_summary || '',
    benefit_summary_or: r.benefit_summary_or || '',
    documents_required: safeJsonArr(r.documents_required),
    required_docs_json: safeJsonArr(r.required_docs_json),
    application_steps_json: safeJsonArr(r.application_steps_json),
    disbursement_mode: r.disbursement_mode || '',
    helpline: r.helpline || '',
    verified_date: r.verified_date || '',
    application_status_label: r.application_status_label || 'Open Year-Round',
    exam_slug: r.exam_slug || '',
    apply_url: r.apply_url || '',
    is_featured: Boolean(r.is_featured),
    sort_order: r.sort_order || 0,
    updated_at: r.updated_at
  };
}

async function handleSchemesDirectory(env, url, slugKey) {
  if (slugKey) {
    const r = await env.DB.prepare(
      `SELECT * FROM schemes_directory WHERE (slug = ? OR id = ?) AND status = 'published' AND deleted_at IS NULL`
    ).bind(slugKey, slugKey).first();
    if (!r) return notFound();
    return json(presentScheme(r), 200, { 'Cache-Control': CACHE });
  }

  const where = [`status = 'published'`, `deleted_at IS NULL`];
  const binds = [];

  const gov = (url.searchParams.get('gov') || url.searchParams.get('gov_level') || '').trim().slice(0, 40);
  if (gov) { where.push('gov_level = ?'); binds.push(gov); }

  const cat = (url.searchParams.get('category') || '').trim().slice(0, 60);
  if (cat) { where.push('category = ?'); binds.push(cat); }

  const gender = (url.searchParams.get('gender') || '').trim().toLowerCase();
  if (gender === 'female' || gender === 'male') {
    where.push(`(gender_eligible = 'all' OR gender_eligible = ?)`);
    binds.push(gender);
  }

  const ageRaw = url.searchParams.get('age');
  if (ageRaw !== null && ageRaw !== '') {
    const age = Number(ageRaw);
    if (Number.isFinite(age) && age >= 0 && age <= 120) {
      where.push(`(min_age IS NULL OR min_age <= ?) AND (max_age IS NULL OR max_age >= ?)`);
      binds.push(Math.floor(age), Math.floor(age));
    }
  }

  const incomeRaw = url.searchParams.get('income');
  if (incomeRaw !== null && incomeRaw !== '') {
    const inc = Number(incomeRaw);
    if (Number.isFinite(inc) && inc >= 0) {
      where.push(`(max_income IS NULL OR max_income >= ?)`);
      binds.push(Math.floor(inc));
    }
  }

  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (q) {
    where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\' OR benefit_summary LIKE ? ESCAPE '\\')`);
    const l = likeEscape(q);
    binds.push(l, l, l, l, l);
  }

  const statusLabel = (url.searchParams.get('status_label') || '').trim().slice(0, 60);
  if (statusLabel) {
    where.push('application_status_label = ?');
    binds.push(statusLabel);
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM schemes_directory WHERE ${where.join(' AND ')} ORDER BY is_featured DESC, sort_order ASC, title ASC`
  ).bind(...binds).all();

  let items = results.map(presentScheme);
  const group = (url.searchParams.get('group') || '').trim().toLowerCase();
  if (group) {
    const groupAliases = {
      seniors: ['seniors', 'senior'],
      health: ['health', 'healthcare'],
      housing: ['housing', 'rural', 'housing & civic'],
      workers: ['workers', 'artisans', 'msme'],
      farmers: ['farmers', 'farmers & rural'],
      students: ['students', 'scholarship', 'youth']
    };
    const aliases = groupAliases[group] || [group];
    items = items.filter(s => {
      const tgMatch = s.target_groups.some(tg => aliases.includes(String(tg).toLowerCase()));
      const catMatch = aliases.includes(String(s.category || '').toLowerCase());
      return tgMatch || catMatch;
    });
  }
  const caste = (url.searchParams.get('beneficiary') || url.searchParams.get('caste') || '').trim().toLowerCase();
  if (caste) {
    const casteAliases = caste === 'sebc' ? ['sebc', 'obc'] : caste === 'bpl' ? ['bpl', 'ews'] : [caste];
    items = items.filter(s => s.beneficiary_categories.some(c => casteAliases.includes(String(c).toLowerCase())));
  }

  return json({ items, total: items.length }, 200, { 'Cache-Control': CACHE });
}

function presentSchemesTreeNode(r) {
  let meta = {};
  try { meta = JSON.parse(r.metadata_json || '{}') || {}; } catch {}
  return {
    id: r.id,
    slug: r.slug,
    parent_slug: r.parent_slug || null,
    level: r.level,
    number: meta.number ? String(meta.number) : '',
    title: r.title,
    title_or: r.title_or || '',
    subtitle: r.subtitle || '',
    subtitle_or: r.subtitle_or || '',
    badge_text: r.badge_text || '',
    icon_name: r.icon_name || '📄',
    official_url: r.official_url || '',
    metadata: meta,
    sort_order: Number(r.sort_order) || 0,
    updated_at: r.updated_at || null
  };
}

async function handleSchemesDirectoryTree(env, url) {
  const groupFilter = (url.searchParams.get('group') || '').trim().toLowerCase().slice(0, 100);
  const sectionFilter = (url.searchParams.get('section') || '').trim().toLowerCase().slice(0, 100);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);

  const { results } = await env.DB.prepare(
    `SELECT * FROM schemes_directory_nodes
     WHERE status = 'published'
     ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 WHEN 'subcategory' THEN 2 ELSE 3 END, sort_order ASC, title ASC`
  ).all().catch(() => ({ results: [] }));

  const allNodes = (results || []).map(presentSchemesTreeNode);
  const rawGroups = allNodes.filter(n => n.level === 'group');
  const rawSections = allNodes.filter(n => n.level === 'section');
  const rawSubcats = allNodes.filter(n => n.level === 'subcategory');
  const rawEntries = allNodes.filter(n => n.level === 'entry');

  const groupMap = (arr, field = 'parent_slug') => {
    const m = new Map();
    arr.forEach(item => {
      const k = item[field] || '';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(item);
    });
    return m;
  };

  const secByGroup = groupMap(rawSections);
  const subBySec = groupMap(rawSubcats);
  const entBySub = groupMap(rawEntries);

  const matchQ = n => !q || [n.title, n.title_or, n.subtitle, n.subtitle_or, n.badge_text, n.number]
    .some(v => String(v || '').toLowerCase().includes(q));

  const filteredGroups = rawGroups
    .filter(g => !groupFilter || g.slug === groupFilter || g.id === groupFilter || g.number === groupFilter)
    .map(g => {
      const gHit = matchQ(g);
      const secs = (secByGroup.get(g.slug) || [])
        .filter(s => !sectionFilter || s.slug === sectionFilter || s.id === sectionFilter || s.number === sectionFilter)
        .map(s => {
          const sHit = gHit || matchQ(s);
          const subs = (subBySec.get(s.slug) || [])
            .map(sub => {
              const subHit = sHit || matchQ(sub);
              const entries = (entBySub.get(sub.slug) || []).filter(e => !q || subHit || matchQ(e));
              return { ...sub, children: entries };
            })
            .filter(sub => !q || sHit || matchQ(sub) || sub.children.length > 0);
          return { ...s, children: subs };
        })
        .filter(s => !q || gHit || matchQ(s) || s.children.length > 0);
      return { ...g, sections: secs };
    })
    .filter(g => (!sectionFilter && !q) || matchQ(g) || g.sections.length > 0);

  const flatSecs = filteredGroups.flatMap(g => g.sections);
  const flatSubs = flatSecs.flatMap(s => s.children);
  const flatEntries = flatSubs.flatMap(sub => sub.children);

  return json({
    groups: filteredGroups,
    counts: {
      groups: filteredGroups.length,
      sections: flatSecs.length,
      subcategories: flatSubs.length,
      entries: flatEntries.length,
      totalNodes: filteredGroups.length + flatSecs.length + flatSubs.length + flatEntries.length
    },
    total_counts: {
      groups: rawGroups.length,
      sections: rawSections.length,
      subcategories: rawSubcats.length,
      entries: rawEntries.length,
      totalNodes: allNodes.length
    }
  }, 200, { 'Cache-Control': CACHE });
}

function presentStudyNode(r) {
  let meta = {};
  try { meta = JSON.parse(r.metadata_json || '{}') || {}; } catch {}
  return {
    id: r.id,
    slug: r.slug,
    parent_slug: r.parent_slug || null,
    level: r.level,
    number: meta.number ? String(meta.number) : '',
    title: r.title,
    title_or: r.title_or || '',
    subtitle: r.subtitle || '',
    subtitle_or: r.subtitle_or || '',
    badge_text: r.badge_text || '',
    icon_name: r.icon_name || '📚',
    exam_slug: r.exam_slug || '',
    resource_url: r.resource_url || '',
    metadata: meta,
    sort_order: Number(r.sort_order) || 0,
    updated_at: r.updated_at || null
  };
}

async function handleStudyLibraryDirectory(env, url) {
  const groupFilter = (url.searchParams.get('group') || '').trim().toLowerCase().slice(0, 100);
  const sectionFilter = (url.searchParams.get('section') || '').trim().toLowerCase().slice(0, 100);
  const examSlug = (url.searchParams.get('exam_slug') || '').trim().toLowerCase().slice(0, 80);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);

  const { results } = await env.DB.prepare(
    `SELECT * FROM study_library_nodes
     WHERE status = 'published'
     ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 WHEN 'subcategory' THEN 2 ELSE 3 END, sort_order ASC, title ASC`
  ).all().catch(() => ({ results: [] }));

  const allNodes = (results || []).map(presentStudyNode);
  const rawGroups = allNodes.filter(n => n.level === 'group');
  const rawSections = allNodes.filter(n => n.level === 'section');
  const rawSubcats = allNodes.filter(n => n.level === 'subcategory');
  const rawEntries = allNodes.filter(n => n.level === 'entry');

  const groupMap = (arr, field = 'parent_slug') => {
    const m = new Map();
    arr.forEach(item => {
      const k = item[field] || '';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(item);
    });
    return m;
  };

  const secByGroup = groupMap(rawSections);
  const subBySec = groupMap(rawSubcats);
  const entBySub = groupMap(rawEntries);

  const matchNode = n => {
    const examOk = !examSlug || String(n.exam_slug || '').toLowerCase() === examSlug;
    const qOk = !q || [n.title, n.title_or, n.subtitle, n.subtitle_or, n.badge_text, n.number, n.exam_slug]
      .some(v => String(v || '').toLowerCase().includes(q));
    return examOk && qOk;
  };

  const filteredGroups = rawGroups
    .filter(g => !groupFilter || g.slug === groupFilter || g.id === groupFilter || (g.metadata && g.metadata.legacy_id === groupFilter) || g.number === groupFilter)
    .map(g => {
      const gHit = !examSlug && !q ? true : (q && [g.title, g.title_or, g.subtitle, g.subtitle_or].some(v => String(v || '').toLowerCase().includes(q)));
      const secs = (secByGroup.get(g.slug) || [])
        .filter(s => !sectionFilter || s.slug === sectionFilter || s.id === sectionFilter || s.number === sectionFilter)
        .map(s => {
          const sHit = gHit || (q && [s.title, s.title_or, s.number].some(v => String(v || '').toLowerCase().includes(q)));
          const subs = (subBySec.get(s.slug) || [])
            .map(sub => {
              const subHit = sHit || (q && [sub.title, sub.title_or, sub.number].some(v => String(v || '').toLowerCase().includes(q)));
              const entries = (entBySub.get(sub.slug) || []).filter(e => (!examSlug && !q) || (subHit && (!examSlug || e.exam_slug === examSlug)) || matchNode(e));
              return { ...sub, children: entries };
            })
            .filter(sub => (!examSlug && !q) || sub.children.length > 0 || (!examSlug && sHit) || matchNode(sub));
          return { ...s, children: subs };
        })
        .filter(s => (!examSlug && !q) || s.children.length > 0 || (!examSlug && gHit) || matchNode(s));
      return { ...g, sections: secs };
    })
    .filter(g => (!sectionFilter && !examSlug && !q) || g.sections.length > 0 || matchNode(g));

  const flatSecs = filteredGroups.flatMap(g => g.sections);
  const flatSubs = flatSecs.flatMap(s => s.children);
  const flatEntries = flatSubs.flatMap(sub => sub.children);

  return json({
    groups: filteredGroups,
    counts: {
      groups: filteredGroups.length,
      sections: flatSecs.length,
      subcategories: flatSubs.length,
      entries: flatEntries.length,
      totalNodes: filteredGroups.length + flatSecs.length + flatSubs.length + flatEntries.length
    },
    total_counts: {
      groups: rawGroups.length,
      sections: rawSections.length,
      subcategories: rawSubcats.length,
      entries: rawEntries.length,
      totalNodes: allNodes.length
    }
  }, 200, { 'Cache-Control': CACHE });
}

async function handleUnifiedSearch(env, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const typeFilter = (url.searchParams.get('type') || '').trim().toLowerCase();
  const limit = Math.min(24, Math.max(4, parseInt(url.searchParams.get('limit') || '12', 10) || 12));
  if (!q) {
    return json({ query: '', items: [], counts: {}, total: 0 }, 200, { 'Cache-Control': 'public, max-age=30' });
  }
  const l = likeEscape(q);

  const [jobsRes, caRes, schemesRes, dirRes, testsRes, resRes, examRes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, slug, title, title_or, organisation, category, last_date, status FROM posts
       WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL}
         AND (title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR organisation LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')
       ORDER BY published_at DESC LIMIT 8`
    ).bind(l, l, l, l, l).all(),
    env.DB.prepare(
      `SELECT id, slug, title, title_or, category, event_date FROM posts
       WHERE type = 'current_affair' AND ${PUBLIC_VISIBLE_SQL}
         AND (title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
       ORDER BY published_at DESC LIMIT 6`
    ).bind(l, l, l, l).all(),
    env.DB.prepare(
      `SELECT id, slug, title, title_or, category, gov_level, department FROM schemes_directory
       WHERE status = 'published' AND deleted_at IS NULL
         AND (title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
       ORDER BY is_featured DESC, sort_order ASC LIMIT 8`
    ).bind(l, l, l, l).all(),
    env.DB.prepare(
      `SELECT id, level, code, title, title_or, description, exam_slug FROM jobs_directory_nodes
       WHERE is_active = 1
         AND (title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR notes_json LIKE ? ESCAPE '\\')
       ORDER BY level ASC, sort_order ASC LIMIT 8`
    ).bind(l, l, l, l).all(),
    env.DB.prepare(
      `SELECT id, slug, title, title_or, target_exam, duration_minutes FROM mock_tests
       WHERE ${PUBLIC_VISIBLE_SQL}
         AND (title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR target_exam LIKE ? ESCAPE '\\')
       ORDER BY published_at DESC LIMIT 6`
    ).bind(l, l, l).all(),
    env.DB.prepare(
      `SELECT id, kind, title, exam, year FROM resources
       WHERE deleted_at IS NULL AND status = 'published'
         AND (title LIKE ? ESCAPE '\\' OR exam LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')
       ORDER BY year DESC LIMIT 6`
    ).bind(l, l, l).all(),
    env.DB.prepare(
      `SELECT id, exam_label, short_code, track_label, domain_slug FROM exam_taxonomy
       WHERE is_active = 1
         AND (exam_label LIKE ? ESCAPE '\\' OR short_code LIKE ? ESCAPE '\\' OR track_label LIKE ? ESCAPE '\\')
       ORDER BY sort_order ASC LIMIT 6`
    ).bind(l, l, l).all()
  ]);

  const all = [
    ...(jobsRes.results || []).map(r => ({
      type: 'job', id: r.id, title: r.title, title_or: r.title_or || '',
      subtitle: [r.organisation, r.category, r.last_date ? `Last date: ${r.last_date}` : ''].filter(Boolean).join(' · '),
      badge: r.status === 'expired' ? 'Closed Job' : 'Job Notice',
      url: `/jobs-careers/?job=${encodeURIComponent(r.slug)}`
    })),
    ...(schemesRes.results || []).map(r => ({
      type: 'scheme', id: r.id, title: r.title, title_or: r.title_or || '',
      subtitle: [r.gov_level, r.category, r.department].filter(Boolean).join(' · '),
      badge: 'Govt Scheme',
      url: `/schemes-benefits/?scheme=${encodeURIComponent(r.slug)}`
    })),
    ...(caRes.results || []).map(r => ({
      type: 'current_affair', id: r.id, title: r.title, title_or: r.title_or || '',
      subtitle: [r.category, r.event_date].filter(Boolean).join(' · '),
      badge: 'Current Affairs',
      url: `/current-affairs/?slug=${encodeURIComponent(r.slug)}`
    })),
    ...(testsRes.results || []).map(r => ({
      type: 'mock_test', id: r.id, title: r.title, title_or: r.title_or || '',
      subtitle: [r.target_exam, `${r.duration_minutes} mins`].filter(Boolean).join(' · '),
      badge: 'Mock Test',
      url: `/mock-tests/?test=${encodeURIComponent(r.slug)}`
    })),
    ...(resourcesResMap(resRes.results || [])),
    ...(examRes.results || []).map(r => ({
      type: 'exam', id: r.id, title: `${r.short_code} — ${r.exam_label}`, title_or: '',
      subtitle: r.track_label || r.domain_slug,
      badge: 'Exam Track',
      url: `/jobs-careers/?q=${encodeURIComponent(r.short_code)}`
    })),
    ...(dirRes.results || []).map(r => ({
      type: 'directory', id: r.id, title: r.code ? `${r.code} ${r.title}` : r.title, title_or: r.title_or || '',
      subtitle: r.description || 'Career & Recruitment Directory Node',
      badge: 'Directory',
      url: `/jobs-careers/?q=${encodeURIComponent(r.title)}`
    }))
  ];

  const counts = {
    jobs: (jobsRes.results || []).length,
    schemes: (schemesRes.results || []).length,
    current_affairs: (caRes.results || []).length,
    mock_tests: (testsRes.results || []).length,
    resources: (resRes.results || []).length,
    exams: (examRes.results || []).length,
    directory: (dirRes.results || []).length
  };
  const filtered = typeFilter ? all.filter(i => i.type === typeFilter) : all;
  return json({ query: q, counts, total: filtered.length, items: filtered.slice(0, limit) }, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=60' });
}

function resourcesResMap(rows) {
  return rows.map(r => ({
    type: 'resource', id: r.id, title: r.title, title_or: '',
    subtitle: [r.exam, r.kind, r.year].filter(Boolean).join(' · '),
    badge: String(r.kind || 'Resource').toUpperCase(),
    url: `/resources/?q=${encodeURIComponent(r.title)}`
  }));
}

async function handleExamLeaderboard(env, url) {
  const exam = (url.searchParams.get('exam') || '').trim().slice(0, 100);
  const where = ['1=1'];
  const binds = [];
  if (exam) {
    where.push(`(t.target_exam = ? OR t.slug = ? OR t.target_exam LIKE ? ESCAPE '\\')`);
    binds.push(exam, exam, likeEscape(exam));
  }
  const { results } = await env.DB.prepare(
    `SELECT
       a.user_id,
       ROUND(AVG(a.score), 2) AS avg_score,
       MAX(a.score) AS best_score,
       MAX(a.max_score) AS max_score,
       ROUND(AVG(a.accuracy), 1) AS avg_accuracy,
       COUNT(*) AS attempts_count,
       MIN(a.time_taken_sec) AS fastest_sec,
       c.full_name,
       u.email
     FROM test_attempts a
     JOIN mock_tests t ON t.id = a.test_id
     LEFT JOIN candidates c ON c.id = a.user_id
     LEFT JOIN users u ON u.id = a.user_id
     WHERE ${where.join(' AND ')} AND t.deleted_at IS NULL
     GROUP BY a.user_id
     ORDER BY best_score DESC, avg_accuracy DESC, fastest_sec ASC
     LIMIT 20`
  ).bind(...binds).all();

  const items = (results || []).map((row, idx) => ({
    rank: idx + 1,
    displayName: maskDisplayName(row.full_name, row.email),
    display_name: maskDisplayName(row.full_name, row.email),
    bestScore: row.best_score,
    avgScore: row.avg_score,
    maxScore: row.max_score,
    accuracy: row.avg_accuracy,
    attemptsCount: row.attempts_count,
    fastestSec: row.fastest_sec
  }));

  return json({ exam: exam || 'All Exams', items }, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=60' });
}

function presentAboutNode(r) {
  return {
    id: r.id,
    slug: r.slug,
    parent_slug: r.parent_slug || null,
    level: r.level,
    title: r.title,
    title_or: r.title_or || '',
    subtitle: r.subtitle || '',
    subtitle_or: r.subtitle_or || '',
    body_text: r.body_text || '',
    body_text_or: r.body_text_or || '',
    badge_text: r.badge_text || '',
    icon_name: r.icon_name || '📄',
    official_url: r.official_url || '',
    sort_order: Number(r.sort_order) || 0,
    status: r.status || 'published',
    updated_at: r.updated_at || null
  };
}

async function handleAboutDirectory(env, url) {
  const groupFilter = (url.searchParams.get('group') || '').trim().toLowerCase().slice(0, 100);
  const sectionFilter = (url.searchParams.get('section') || '').trim().toLowerCase().slice(0, 100);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);

  const { results } = await env.DB.prepare(
    `SELECT * FROM about_directory_nodes
     WHERE status = 'published'
     ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 ELSE 2 END, sort_order ASC, title ASC`
  ).all().catch(() => ({ results: [] }));

  const allNodes = (results || []).map(presentAboutNode);
  const rawGroups = allNodes.filter(n => n.level === 'group');
  const rawSections = allNodes.filter(n => n.level === 'section');
  const rawEntries = allNodes.filter(n => n.level === 'entry');

  const sectionByParent = new Map();
  rawSections.forEach(s => {
    const key = s.parent_slug || '';
    if (!sectionByParent.has(key)) sectionByParent.set(key, []);
    sectionByParent.get(key).push(s);
  });

  const entryByParent = new Map();
  rawEntries.forEach(e => {
    const key = e.parent_slug || '';
    if (!entryByParent.has(key)) entryByParent.set(key, []);
    entryByParent.get(key).push(e);
  });

  const matchQ = n => !q || [n.title, n.title_or, n.subtitle, n.subtitle_or, n.body_text, n.body_text_or, n.badge_text]
    .some(v => String(v || '').toLowerCase().includes(q));

  let filteredGroups = rawGroups
    .filter(g => !groupFilter || g.slug === groupFilter || g.id === groupFilter)
    .map(g => {
      const secs = (sectionByParent.get(g.slug) || [])
        .filter(s => !sectionFilter || s.slug === sectionFilter || s.id === sectionFilter)
        .map(s => {
          const entries = (entryByParent.get(s.slug) || []).filter(e => !q || matchQ(e) || matchQ(s) || matchQ(g));
          return { ...s, entries };
        })
        .filter(s => !q || matchQ(s) || matchQ(g) || s.entries.length > 0);
      return { ...g, sections: secs };
    })
    .filter(g => (!sectionFilter && !q) || matchQ(g) || g.sections.length > 0);

  const flatSections = filteredGroups.flatMap(g => g.sections);
  const flatEntries = flatSections.flatMap(s => s.entries);

  return json({
    groups: filteredGroups,
    sections: flatSections,
    entries: flatEntries,
    counts: {
      groups: filteredGroups.length,
      sections: flatSections.length,
      entries: flatEntries.length
    },
    total_counts: {
      groups: rawGroups.length,
      sections: rawSections.length,
      entries: rawEntries.length
    }
  }, 200, { 'Cache-Control': CACHE });
}

async function handlePlatformStats(env) {
  const safeCount = async (sql, ...binds) => {
    try {
      const row = await env.DB.prepare(sql).bind(...binds).first();
      return Number(row && (row.n ?? row.cnt)) || 0;
    } catch {
      return 0;
    }
  };

  const [
    examsCount,
    jobsDirectoryCount,
    aboutNodesCount,
    aboutEntriesCount,
    activeJobsCount,
    schemesCount,
    resourcesCount,
    mockTestsCount,
    resolvedFeedbackCount
  ] = await Promise.all([
    safeCount('SELECT COUNT(*) AS n FROM exam_taxonomy WHERE is_active = 1'),
    safeCount('SELECT COUNT(*) AS n FROM jobs_directory_nodes WHERE is_active = 1'),
    safeCount("SELECT COUNT(*) AS n FROM about_directory_nodes WHERE status = 'published'"),
    safeCount("SELECT COUNT(*) AS n FROM about_directory_nodes WHERE level = 'entry' AND status = 'published'"),
    safeCount(`SELECT COUNT(*) AS n FROM posts WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL} AND (last_date IS NULL OR last_date >= date('now'))`),
    safeCount("SELECT COUNT(*) AS n FROM schemes_directory WHERE status = 'published' AND deleted_at IS NULL"),
    safeCount("SELECT COUNT(*) AS n FROM resources WHERE deleted_at IS NULL AND status = 'published'"),
    safeCount(`SELECT COUNT(*) AS n FROM mock_tests WHERE ${PUBLIC_VISIBLE_SQL}`),
    safeCount("SELECT COUNT(*) AS n FROM community_feedback WHERE status = 'resolved'")
  ]);

  return json({
    examsCount,
    directoryNodesCount: jobsDirectoryCount,
    aboutNodesCount,
    aboutEntriesCount,
    activeJobsCount,
    schemesCount,
    resourcesCount,
    mockTestsCount,
    resolvedFeedbackCount,
    districtsCount: 30,
    updatedAt: new Date().toISOString()
  }, 200, { 'Cache-Control': CACHE });
}

async function handleChangelog(env, url) {
  const limit = Math.min(30, Math.max(4, parseInt(url.searchParams.get('limit') || '12', 10) || 12));
  const [aboutRes, jobsRes, caRes, feedbackRes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, slug, title, title_or, subtitle, badge_text, official_url, updated_at
       FROM about_directory_nodes
       WHERE status = 'published' AND level = 'entry'
       ORDER BY updated_at DESC LIMIT 6`
    ).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT id, slug, title, title_or, organisation, published_at, updated_at
       FROM posts
       WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL}
       ORDER BY COALESCE(updated_at, published_at) DESC LIMIT 6`
    ).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT id, slug, title, title_or, category, published_at, updated_at
       FROM posts
       WHERE type = 'current_affair' AND ${PUBLIC_VISIBLE_SQL}
       ORDER BY COALESCE(updated_at, published_at) DESC LIMIT 6`
    ).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT id, kind, subject, admin_note, page_url, resolved_at
       FROM community_feedback
       WHERE status = 'resolved'
       ORDER BY COALESCE(resolved_at, created_at) DESC LIMIT 6`
    ).all().catch(() => ({ results: [] }))
  ]);

  const entries = [
    ...(aboutRes.results || []).map(r => ({
      id: `about-${r.id}`,
      kind: 'directory',
      badge: r.badge_text || 'Directory',
      title: r.title,
      title_or: r.title_or || '',
      summary: r.subtitle || 'About CSO Directory Charter Update',
      url: r.official_url || `/about/`,
      timestamp: r.updated_at || ''
    })),
    ...(jobsRes.results || []).map(r => ({
      id: `job-${r.id}`,
      kind: 'job',
      badge: 'Job Notice',
      title: r.title,
      title_or: r.title_or || '',
      summary: r.organisation || 'Verified Recruitment Notice',
      url: `/jobs-careers/?job=${encodeURIComponent(r.slug)}`,
      timestamp: r.updated_at || r.published_at || ''
    })),
    ...(caRes.results || []).map(r => ({
      id: `ca-${r.id}`,
      kind: 'current_affair',
      badge: 'Current Affairs',
      title: r.title,
      title_or: r.title_or || '',
      summary: r.category || 'Daily Digest',
      url: `/current-affairs/?slug=${encodeURIComponent(r.slug)}`,
      timestamp: r.updated_at || r.published_at || ''
    })),
    ...(feedbackRes.results || []).map(r => ({
      id: `fb-${r.id}`,
      kind: 'correction',
      badge: 'Correction Verified',
      title: r.subject || 'Community Feedback Resolved',
      title_or: '',
      summary: r.admin_note || `Updated on ${r.page_url || '/'}`,
      url: r.page_url || '/support/',
      timestamp: r.resolved_at || ''
    }))
  ]
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, limit);

  return json({ items: entries, total: entries.length }, 200, { 'Cache-Control': CACHE });
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
      if (resource === 'feedback') {
        return await handlePublicFeedback(request, env);
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
    if (resource === 'jobs-directory') {
      return await handleJobsDirectory(env);
    }
    if (resource === 'about-directory') {
      return await handleAboutDirectory(env, url);
    }
    if (resource === 'platform-stats') {
      return await handlePlatformStats(env);
    }
    if (resource === 'changelog') {
      return await handleChangelog(env, url);
    }
    if (resource === 'search') {
      return await handleUnifiedSearch(env, url);
    }
    if (resource === 'leaderboard') {
      return await handleExamLeaderboard(env, url);
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
      return await handleSchemesDirectory(env, url, key);
    }
    if (resource === 'schemes-directory') {
      return await handleSchemesDirectoryTree(env, url);
    }
    if (resource === 'study-library-directory') {
      return await handleStudyLibraryDirectory(env, url);
    }
    if (resource === 'resources') {
      const { page, limit, offset } = parsePaging(url);
      const where = ["deleted_at IS NULL AND status = 'published'"]; const binds = [];
      const kind = url.searchParams.get('kind');
      if (kind === 'syllabus' || kind === 'pyq') { where.push('kind = ?'); binds.push(kind); }
      const resourceType = (url.searchParams.get('resource_type') || '').trim().toLowerCase();
      if (['syllabus', 'pyq', 'study_notes', 'odisha_gk'].includes(resourceType)) {
        where.push('resource_type = ?'); binds.push(resourceType);
      }
      const exam = (url.searchParams.get('exam') || '').trim().slice(0, 100);
      if (exam) { where.push('exam = ?'); binds.push(exam); }
      const examSlug = (url.searchParams.get('exam_slug') || '').trim().toLowerCase().slice(0, 80);
      if (examSlug) { where.push('LOWER(exam_slug) = ?'); binds.push(examSlug); }
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR exam LIKE ? ESCAPE '\\' OR exam_slug LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR description_or LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q); binds.push(l, l, l, l, l, l);
      }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM resources WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT id, kind, resource_type, title, title_or, exam, exam_slug, year, verified_date,
                description, description_or, media_key, official_source_url,
                syllabus_units_json, key_takeaways_json, published_at
         FROM resources WHERE ${w} ORDER BY year DESC, published_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      const items = (results || []).map(({ media_key, syllabus_units_json, key_takeaways_json, ...r }) => {
        let syllabus_units = [];
        let key_takeaways = [];
        try { syllabus_units = JSON.parse(syllabus_units_json || '[]') || []; } catch {}
        try { key_takeaways = JSON.parse(key_takeaways_json || '[]') || []; } catch {}
        return {
          ...r,
          resource_type: r.resource_type || r.kind || 'syllabus',
          file_url: media(media_key),
          official_source_url: r.official_source_url || media(media_key),
          syllabus_units,
          key_takeaways
        };
      });
      return json({ items, page, limit, total }, 200, { 'Cache-Control': CACHE });
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
