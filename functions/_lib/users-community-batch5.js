// Users, Roles & Community Batch 5 (v100): Modules 17-19 + Unified 19-Module Suite
// 17 Share Knowledge | 18 Suggest a Topic | 19 Report an Error
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { REV_TABLES, snapshotRevision, getUsersOverview } from './users-community-batch1.js';
import { ensureUsersCommunityBatch4Schema } from './users-community-batch4.js';
import { ensureEduResourcesBatch1Schema } from './edu-resources-batch1.js';

export const URC_KNOWLEDGE_KINDS = [
  'study_note', 'exam_strategy', 'mnemonics_cheat_sheet', 'odisha_gk_digest', 'teaching_pedagogy'
];
export const URC_KNOWLEDGE_STATUSES = [
  'pending_review', 'approved_community', 'promoted_to_library', 'needs_revision', 'rejected'
];
export const URC_TOPIC_PORTALS = [
  'study-library', 'mock-tests', 'jobs-careers', 'schemes', 'educational-tools'
];
export const URC_TOPIC_STATUSES = [
  'new', 'under_review', 'planned', 'in_production', 'published', 'declined'
];
export const URC_ERRATA_AREAS = [
  'study_note_pdf', 'mcq_answer_key', 'job_notification', 'scheme_eligibility', 'broken_download', 'translation_typo'
];
export const URC_ERRATA_TYPES = [
  'wrong_answer_key', 'outdated_date_fee', 'odia_translation_error', 'broken_link_pdf', 'factual_typo'
];
export const URC_ERRATA_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const URC_ERRATA_STATUSES = ['open', 'verifying', 'fixed_deployed', 'duplicate', 'wont_fix'];

const _urc5Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'resource';
}

REV_TABLES['17'] = {
  table: 'urc_shared_knowledge',
  cols: ['submission_code', 'contributor_user_id', 'contributor_name', 'contributor_role_label', 'district_odisha', 'content_kind', 'subject_or_exam', 'title_en', 'title_or', 'body_en', 'body_or', 'attachment_url', 'upvotes_count', 'promoted_edu_resource_id', 'review_status', 'reviewer_note', 'reviewed_by']
};
REV_TABLES['18'] = {
  table: 'urc_topic_suggestions',
  cols: ['suggestion_code', 'suggested_by_name', 'suggested_by_email', 'district_odisha', 'target_portal', 'exam_or_class', 'topic_title_en', 'topic_title_or', 'rationale_text', 'votes_count', 'workflow_status', 'assigned_admin_note', 'published_url']
};
REV_TABLES['19'] = {
  table: 'urc_error_reports',
  cols: ['errata_code', 'reporter_name', 'reporter_email', 'target_area', 'page_or_item_url', 'item_title', 'error_type', 'description_text', 'suggested_correction', 'severity', 'fix_status', 'resolution_note', 'resolved_by', 'resolved_at']
};

export async function ensureUsersCommunityBatch5Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureUsersCommunityBatch4Schema(db);
  if (_urc5Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS urc_shared_knowledge (
      id TEXT PRIMARY KEY,
      submission_code TEXT NOT NULL UNIQUE,
      contributor_user_id TEXT,
      contributor_name TEXT NOT NULL,
      contributor_role_label TEXT NOT NULL DEFAULT 'Aspirant',
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      content_kind TEXT NOT NULL DEFAULT 'study_note' CHECK (content_kind IN ('study_note', 'exam_strategy', 'mnemonics_cheat_sheet', 'odisha_gk_digest', 'teaching_pedagogy')),
      subject_or_exam TEXT NOT NULL DEFAULT 'OPSC OAS',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      attachment_url TEXT NOT NULL DEFAULT '',
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      promoted_edu_resource_id TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved_community', 'promoted_to_library', 'needs_revision', 'rejected')),
      reviewer_note TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (contributor_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_shared_knowledge_status ON urc_shared_knowledge(review_status, content_kind, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_topic_suggestions (
      id TEXT PRIMARY KEY,
      suggestion_code TEXT NOT NULL UNIQUE,
      suggested_by_name TEXT NOT NULL,
      suggested_by_email TEXT NOT NULL DEFAULT '',
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      target_portal TEXT NOT NULL DEFAULT 'study-library' CHECK (target_portal IN ('study-library', 'mock-tests', 'jobs-careers', 'schemes', 'educational-tools')),
      exam_or_class TEXT NOT NULL DEFAULT 'OPSC OAS',
      topic_title_en TEXT NOT NULL,
      topic_title_or TEXT NOT NULL DEFAULT '',
      rationale_text TEXT NOT NULL DEFAULT '',
      votes_count INTEGER NOT NULL DEFAULT 1,
      workflow_status TEXT NOT NULL DEFAULT 'new' CHECK (workflow_status IN ('new', 'under_review', 'planned', 'in_production', 'published', 'declined')),
      assigned_admin_note TEXT NOT NULL DEFAULT '',
      published_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_topic_sugg_status ON urc_topic_suggestions(workflow_status, votes_count DESC, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_error_reports (
      id TEXT PRIMARY KEY,
      errata_code TEXT NOT NULL UNIQUE,
      reporter_name TEXT NOT NULL,
      reporter_email TEXT NOT NULL DEFAULT '',
      target_area TEXT NOT NULL DEFAULT 'study_note_pdf' CHECK (target_area IN ('study_note_pdf', 'mcq_answer_key', 'job_notification', 'scheme_eligibility', 'broken_download', 'translation_typo')),
      page_or_item_url TEXT NOT NULL DEFAULT '',
      item_title TEXT NOT NULL DEFAULT '',
      error_type TEXT NOT NULL DEFAULT 'factual_typo' CHECK (error_type IN ('wrong_answer_key', 'outdated_date_fee', 'odia_translation_error', 'broken_link_pdf', 'factual_typo')),
      description_text TEXT NOT NULL,
      suggested_correction TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      fix_status TEXT NOT NULL DEFAULT 'open' CHECK (fix_status IN ('open', 'verifying', 'fixed_deployed', 'duplicate', 'wont_fix')),
      resolution_note TEXT NOT NULL DEFAULT '',
      resolved_by TEXT NOT NULL DEFAULT '',
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_errata_status ON urc_error_reports(fix_status, severity, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 17 shared knowledge
  const shkCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_shared_knowledge`).first();
  if (Number(shkCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_shared_knowledge (id, submission_code, contributor_user_id, contributor_name, contributor_role_label, district_odisha, content_kind, subject_or_exam, title_en, title_or, body_en, body_or, upvotes_count, review_status)
       VALUES ('urc-shk-001', 'SHK-2026-0001', 'urc-u-004', 'Ananya Senapati', 'OAS Aspirant', 'Balasore', 'odisha_gk_digest', 'OPSC OAS',
               'Mahanadi & Baitarani River Basin Tributaries Mnemonic Sheet',
               'ମହାନଦୀ ଏବଂ ବୈତରଣୀ ନଦୀ ଅବବାହିକା ସ୍ମରଣିକା ନୋଟ୍ସ',
               'Concise district-by-district river tributaries and dam projects in Odisha (Hirakud, Rengali, Mandira, Balimela).',
               'ଓଡ଼ିଶାର ଜିଲ୍ଲାୱାରୀ ନଦୀ ଉପନଦୀ ଏବଂ ବନ୍ଧ ପ୍ରକଳ୍ପ (ହୀରାକୁଦ, ରେଙ୍ଗାଲି, ମନ୍ଦିରା, ବାଲିମେଳା) ସାରାଂଶ।',
               34, 'pending_review')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_shared_knowledge (id, submission_code, contributor_user_id, contributor_name, contributor_role_label, district_odisha, content_kind, subject_or_exam, title_en, title_or, body_en, body_or, upvotes_count, review_status, reviewed_by)
       VALUES ('urc-shk-002', 'SHK-2026-0002', 'urc-u-003', 'Prof. Biswajit Panigrahi', 'Verified Educator', 'Cuttack', 'teaching_pedagogy', 'OSSTET / B.Ed',
               'Constructivist Pedagogy & NCF 2005 Classroom Examples',
               'ଗଠନମୂଳକ ଶିକ୍ଷାଦାନ ଏବଂ NCF ୨୦୦୫ ଶ୍ରେଣୀଗୃହ ଉଦାହରଣ',
               'Practical B.Ed & OSSTET pedagogy notes aligned with Odisha SCERT syllabus.',
               'ଓଡ଼ିଶା SCERT ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ B.Ed ଏବଂ OSSTET ଶିକ୍ଷାଦାନ ନୋଟ୍ସ।',
               52, 'approved_community', 'moderator@csodisha.com')`
    ).run();
  }

  // Seed Module 18 topic suggestions
  const topCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_topic_suggestions`).first();
  if (Number(topCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_topic_suggestions (id, suggestion_code, suggested_by_name, suggested_by_email, district_odisha, target_portal, exam_or_class, topic_title_en, topic_title_or, rationale_text, votes_count, workflow_status, assigned_admin_note)
       VALUES ('urc-top-001', 'TOP-2026-0001', 'Ananya Senapati', 'ananya.balasore@example.in', 'Balasore', 'mock-tests', 'OSSC CGL',
               'OSSC CGL Data Interpretation & Ratio Shortcuts Pack',
               'OSSC CGL ଡାଟା ଇଣ୍ଟରପ୍ରିଟେସନ୍ ଏବଂ ଅନୁପାତ ସର୍ଟକଟ୍ ପ୍ୟାକ୍',
               'High weightage in OSSC CGL Prelims; timed 20-question practice sets needed.', 42, 'planned', 'Scheduled for next OSSC CGL sprint.')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_topic_suggestions (id, suggestion_code, suggested_by_name, suggested_by_email, district_odisha, target_portal, exam_or_class, topic_title_en, topic_title_or, rationale_text, votes_count, workflow_status)
       VALUES ('urc-top-002', 'TOP-2026-0002', 'Smita Naik', 'smita.cuttack@example.in', 'Cuttack', 'study-library', 'UGC NET',
               'UGC NET Paper-I ICT & Higher Education Digest (Bilingual)',
               'UGC NET ପେପର-୧ ICT ଏବଂ ଉଚ୍ଚଶିକ୍ଷା ସାରାଂଶ',
               'Bilingual Odia + English glossary for digital initiatives like SWAYAM and DIKSHA.', 19, 'new')`
    ).run();
  }

  // Seed Module 19 error reports
  const errCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_error_reports`).first();
  if (Number(errCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_error_reports (id, errata_code, reporter_name, reporter_email, target_area, page_or_item_url, item_title, error_type, description_text, suggested_correction, severity, fix_status)
       VALUES ('urc-err-001', 'ERR-2026-0001', 'Ananya Senapati', 'ananya.balasore@example.in', 'mcq_answer_key', '/study-library/opsc-oas-2024-polity', 'OPSC OAS 2024 Polity PYQ Q14', 'wrong_answer_key',
               'Option B is marked correct for Article 243G, whereas official OPSC key is Option C.', 'Update answer key to Option C (73rd Amendment).', 'high', 'open')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_error_reports (id, errata_code, reporter_name, reporter_email, target_area, page_or_item_url, item_title, error_type, description_text, suggested_correction, severity, fix_status, resolution_note, resolved_by, resolved_at)
       VALUES ('urc-err-002', 'ERR-2026-0002', 'Debasis Pradhan', 'debasis.khordha@example.in', 'scheme_eligibility', '/schemes/kalia-odisha', 'Odisha KALIA Scheme Eligibility', 'outdated_date_fee',
               'Last installment window showed 2025 cutoff date.', 'Updated to 2026 cycle.', 'medium', 'fixed_deployed', 'Updated scheme eligibility & pushed cache invalidation.', 'moderator@csodisha.com', datetime('now'))`
    ).run();
  }

  _urc5Ready.add(db);
}

export async function getFull19ModuleUsersOverview(env) {
  await ensureUsersCommunityBatch5Schema(env.DB);
  return getUsersOverview(env.DB);
}

/* ================= MODULE 17: SHARE KNOWLEDGE ================= */
async function nextShkCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_shared_knowledge`).first();
  return `SHK-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleSharedKnowledge(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('review_status') || '').trim();
    const kind = (url.searchParams.get('content_kind') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('review_status = ?'); binds.push(status); }
    if (kind) { where.push('content_kind = ?'); binds.push(kind); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(submission_code LIKE ? ESCAPE '\\' OR title_en LIKE ? ESCAPE '\\' OR contributor_name LIKE ? ESCAPE '\\' OR subject_or_exam LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_shared_knowledge ${w} ORDER BY CASE review_status WHEN 'pending_review' THEN 0 ELSE 1 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 35000);
    const errors = {};
    const name = cleanStr(body.contributor_name || 'Community Contributor', 120);
    const kind = pick(body.content_kind, URC_KNOWLEDGE_KINDS, 'content_kind', errors, 'study_note');
    const titleEn = cleanStr(body.title_en || '', 200);
    if (!titleEn) errors.title_en = 'title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-shk');
    const code = await nextShkCode(db);
    await db.prepare(
      `INSERT INTO urc_shared_knowledge (id, submission_code, contributor_user_id, contributor_name, contributor_role_label, district_odisha, content_kind, subject_or_exam, title_en, title_or, body_en, body_or, attachment_url, review_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')`
    ).bind(
      newId, code, body.contributor_user_id ? cleanStr(body.contributor_user_id, 80) : null,
      name, cleanStr(body.contributor_role_label || 'Aspirant', 80),
      cleanStr(body.district_odisha || 'Khordha', 80), kind,
      cleanStr(body.subject_or_exam || 'OPSC OAS', 80),
      titleEn, cleanStr(body.title_or || '', 240),
      cleanStr(body.body_en || '', 5000), cleanStr(body.body_or || '', 5000),
      cleanStr(body.attachment_url || '', 300)
    ).run();

    await snapshotRevision(db, '17', newId, actor, 'create shared knowledge');
    await audit(env, request, actor, 'urc.shared_knowledge.create', 'urc_shared_knowledge', newId, { submission_code: code });
    const created = await db.prepare(`SELECT * FROM urc_shared_knowledge WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_shared_knowledge WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Shared knowledge submission not found');
    const body = await readJson(request, 35000);
    const action = cleanStr(body.action || '', 40).toLowerCase();

    const titleEn = body.title_en !== undefined ? cleanStr(body.title_en, 200) : existing.title_en;
    const titleOr = body.title_or !== undefined ? cleanStr(body.title_or, 240) : existing.title_or;
    const bodyEn = body.body_en !== undefined ? cleanStr(body.body_en, 5000) : existing.body_en;
    const bodyOr = body.body_or !== undefined ? cleanStr(body.body_or, 5000) : existing.body_or;
    const note = body.reviewer_note !== undefined ? cleanStr(body.reviewer_note, 400) : existing.reviewer_note;

    let reviewStatus = existing.review_status;
    let promotedId = existing.promoted_edu_resource_id || null;

    if (action === 'approve_community') reviewStatus = 'approved_community';
    else if (action === 'needs_revision') reviewStatus = 'needs_revision';
    else if (action === 'reject') reviewStatus = 'rejected';
    else if (action === 'promote_to_library') {
      await ensureEduResourcesBatch1Schema(db);
      if (!promotedId) {
        promotedId = rid('edu-shk');
        const baseSlug = slugify(titleEn);
        const dup = await db.prepare(`SELECT id FROM edu_resources WHERE slug = ?`).bind(baseSlug).first();
        const slug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
        const rType = existing.attachment_url ? 'notes_pdf' : 'study_material';
        await db.prepare(
          `INSERT INTO edu_resources (id, slug, resource_type, subject_name, exam_tag, title_en, title_or, author_or_board, language_code, summary_en, summary_or, content_md_en, content_md_or, file_url, access_tier, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bilingual', ?, ?, ?, ?, ?, 'free', 'published', ?)`
        ).bind(
          promotedId, slug, rType, existing.subject_or_exam, existing.subject_or_exam,
          titleEn, titleOr, existing.contributor_name,
          bodyEn.slice(0, 300), bodyOr.slice(0, 300), bodyEn, bodyOr, existing.attachment_url || '',
          actor?.email || 'admin'
        ).run();
      }
      reviewStatus = 'promoted_to_library';
    } else if (body.review_status && URC_KNOWLEDGE_STATUSES.includes(body.review_status)) {
      reviewStatus = body.review_status;
    }

    await snapshotRevision(db, '17', sub, actor, action || body.change_note || 'update shared knowledge');
    await db.prepare(
      `UPDATE urc_shared_knowledge
       SET title_en = ?, title_or = ?, body_en = ?, body_or = ?, review_status = ?, reviewer_note = ?, reviewed_by = ?, promoted_edu_resource_id = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(titleEn, titleOr, bodyEn, bodyOr, reviewStatus, note, actor?.email || actor?.userId || 'admin', promotedId, sub).run();

    await audit(env, request, actor, `urc.shared_knowledge.${action || 'update'}`, 'urc_shared_knowledge', sub, {
      review_status: reviewStatus, promoted_edu_resource_id: promotedId
    });
    const updated = await db.prepare(`SELECT * FROM urc_shared_knowledge WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 18: SUGGEST A TOPIC ================= */
async function nextTopCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_topic_suggestions`).first();
  return `TOP-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleTopicSuggestions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('workflow_status') || '').trim();
    const portal = (url.searchParams.get('target_portal') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('workflow_status = ?'); binds.push(status); }
    if (portal) { where.push('target_portal = ?'); binds.push(portal); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(suggestion_code LIKE ? ESCAPE '\\' OR topic_title_en LIKE ? ESCAPE '\\' OR suggested_by_name LIKE ? ESCAPE '\\' OR exam_or_class LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_topic_suggestions ${w} ORDER BY votes_count DESC, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const name = cleanStr(body.suggested_by_name || 'Student', 120);
    const portal = pick(body.target_portal, URC_TOPIC_PORTALS, 'target_portal', errors, 'study-library');
    const titleEn = cleanStr(body.topic_title_en || '', 200);
    if (!titleEn) errors.topic_title_en = 'topic_title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-top');
    const code = await nextTopCode(db);
    await db.prepare(
      `INSERT INTO urc_topic_suggestions (id, suggestion_code, suggested_by_name, suggested_by_email, district_odisha, target_portal, exam_or_class, topic_title_en, topic_title_or, rationale_text, votes_count, workflow_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'new')`
    ).bind(
      newId, code, name, cleanStr(body.suggested_by_email || '', 160).toLowerCase(),
      cleanStr(body.district_odisha || 'Khordha', 80), portal,
      cleanStr(body.exam_or_class || 'OPSC OAS', 80), titleEn,
      cleanStr(body.topic_title_or || '', 240), cleanStr(body.rationale_text || '', 1000)
    ).run();

    await snapshotRevision(db, '18', newId, actor, 'create topic suggestion');
    await audit(env, request, actor, 'urc.topic_suggestion.create', 'urc_topic_suggestions', newId, { suggestion_code: code });
    const created = await db.prepare(`SELECT * FROM urc_topic_suggestions WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_topic_suggestions WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Topic suggestion not found');
    const body = await readJson(request, 20000);
    const errors = {};

    const action = cleanStr(body.action || '', 30).toLowerCase();
    const nextVotes = action === 'upvote' ? Number(existing.votes_count || 0) + 1 : Number(existing.votes_count || 0);
    const status = body.workflow_status !== undefined
      ? pick(body.workflow_status, URC_TOPIC_STATUSES, 'workflow_status', errors, existing.workflow_status)
      : existing.workflow_status;
    const note = body.assigned_admin_note !== undefined ? cleanStr(body.assigned_admin_note, 400) : existing.assigned_admin_note;
    const pubUrl = body.published_url !== undefined ? cleanStr(body.published_url, 300) : existing.published_url;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotRevision(db, '18', sub, actor, action || `status -> ${status}`);
    await db.prepare(
      `UPDATE urc_topic_suggestions
       SET votes_count = ?, workflow_status = ?, assigned_admin_note = ?, published_url = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(nextVotes, status, note, pubUrl, sub).run();

    await audit(env, request, actor, 'urc.topic_suggestion.update', 'urc_topic_suggestions', sub, { workflow_status: status, votes_count: nextVotes });
    const updated = await db.prepare(`SELECT * FROM urc_topic_suggestions WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_topic_suggestions WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Topic suggestion not found');
    await snapshotRevision(db, '18', sub, actor, 'decline topic suggestion');
    await db.prepare(`UPDATE urc_topic_suggestions SET workflow_status = 'declined', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.topic_suggestion.decline', 'urc_topic_suggestions', sub, {});
    return json({ ok: true, id: sub, workflow_status: 'declined' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 19: REPORT AN ERROR (ERRATA) ================= */
async function nextErrCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_error_reports`).first();
  return `ERR-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleErrorReports(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('fix_status') || '').trim();
    const area = (url.searchParams.get('target_area') || '').trim();
    const sev = (url.searchParams.get('severity') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('fix_status = ?'); binds.push(status); }
    if (area) { where.push('target_area = ?'); binds.push(area); }
    if (sev) { where.push('severity = ?'); binds.push(sev); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(errata_code LIKE ? ESCAPE '\\' OR item_title LIKE ? ESCAPE '\\' OR description_text LIKE ? ESCAPE '\\' OR reporter_name LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_error_reports ${w} ORDER BY CASE fix_status WHEN 'open' THEN 0 WHEN 'verifying' THEN 1 ELSE 2 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const area = pick(body.target_area, URC_ERRATA_AREAS, 'target_area', errors, 'study_note_pdf');
    const eType = pick(body.error_type, URC_ERRATA_TYPES, 'error_type', errors, 'factual_typo');
    const sev = pick(body.severity, URC_ERRATA_SEVERITIES, 'severity', errors, 'medium');
    const desc = cleanStr(body.description_text || '', 1500);
    if (!desc) errors.description_text = 'description_text is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-err');
    const code = await nextErrCode(db);
    await db.prepare(
      `INSERT INTO urc_error_reports (id, errata_code, reporter_name, reporter_email, target_area, page_or_item_url, item_title, error_type, description_text, suggested_correction, severity, fix_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
    ).bind(
      newId, code, cleanStr(body.reporter_name || 'Learner', 120),
      cleanStr(body.reporter_email || '', 160).toLowerCase(),
      area, cleanStr(body.page_or_item_url || '', 300),
      cleanStr(body.item_title || '', 200), eType, desc,
      cleanStr(body.suggested_correction || '', 1000), sev
    ).run();

    await snapshotRevision(db, '19', newId, actor, 'log errata report');
    await audit(env, request, actor, 'urc.errata.create', 'urc_error_reports', newId, { errata_code: code, severity: sev });
    const created = await db.prepare(`SELECT * FROM urc_error_reports WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_error_reports WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Error report not found');
    const body = await readJson(request, 20000);
    const errors = {};
    const fixStatus = body.fix_status !== undefined ? pick(body.fix_status, URC_ERRATA_STATUSES, 'fix_status', errors, existing.fix_status) : existing.fix_status;
    const resNote = body.resolution_note !== undefined ? cleanStr(body.resolution_note, 600) : existing.resolution_note;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotRevision(db, '19', sub, actor, `errata -> ${fixStatus}`);
    await db.prepare(
      `UPDATE urc_error_reports
       SET fix_status = ?, resolution_note = ?, resolved_by = ?, resolved_at = CASE WHEN ? IN ('fixed_deployed', 'wont_fix', 'duplicate') THEN datetime('now') ELSE resolved_at END, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(fixStatus, resNote, actor?.email || actor?.userId || 'admin', fixStatus, sub).run();

    await audit(env, request, actor, 'urc.errata.update', 'urc_error_reports', sub, { fix_status: fixStatus });
    const updated = await db.prepare(`SELECT * FROM urc_error_reports WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= PUBLIC CONTRIBUTE INTAKE ================= */
export async function handlePublicCommunityContributeApi(request, env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureUsersCommunityBatch5Schema(env.DB);
  await rateLimit(env, `pub-contrib:${clientIp(request)}`, 30, 300);

  const body = await readJson(request, 35000);
  const kind = cleanStr(body.kind || '', 40);

  if (kind === 'shared_knowledge') {
    const errors = {};
    const titleEn = cleanStr(body.title_en || '', 200);
    const cKind = pick(body.content_kind, URC_KNOWLEDGE_KINDS, 'content_kind', errors, 'study_note');
    if (!titleEn) errors.title_en = 'title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);
    const newId = rid('urc-shk');
    const code = await nextShkCode(env.DB);
    await env.DB.prepare(
      `INSERT INTO urc_shared_knowledge (id, submission_code, contributor_name, district_odisha, content_kind, subject_or_exam, title_en, title_or, body_en, body_or, review_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')`
    ).bind(
      newId, code, cleanStr(body.contributor_name || 'Community Learner', 120),
      cleanStr(body.district_odisha || 'Khordha', 80), cKind,
      cleanStr(body.subject_or_exam || 'OPSC OAS', 80), titleEn,
      cleanStr(body.title_or || '', 240), cleanStr(body.body_en || '', 5000), cleanStr(body.body_or || '', 5000)
    ).run();
    return json({ ok: true, kind, id: newId, code }, 201);
  }

  if (kind === 'topic_suggestion') {
    const errors = {};
    const titleEn = cleanStr(body.topic_title_en || '', 200);
    const portal = pick(body.target_portal, URC_TOPIC_PORTALS, 'target_portal', errors, 'study-library');
    if (!titleEn) errors.topic_title_en = 'topic_title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);
    const newId = rid('urc-top');
    const code = await nextTopCode(env.DB);
    await env.DB.prepare(
      `INSERT INTO urc_topic_suggestions (id, suggestion_code, suggested_by_name, suggested_by_email, district_odisha, target_portal, exam_or_class, topic_title_en, topic_title_or, rationale_text, workflow_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
    ).bind(
      newId, code, cleanStr(body.suggested_by_name || 'Student', 120),
      cleanStr(body.suggested_by_email || '', 160).toLowerCase(),
      cleanStr(body.district_odisha || 'Khordha', 80), portal,
      cleanStr(body.exam_or_class || 'OPSC OAS', 80), titleEn,
      cleanStr(body.topic_title_or || '', 240), cleanStr(body.rationale_text || '', 1000)
    ).run();
    return json({ ok: true, kind, id: newId, code }, 201);
  }

  if (kind === 'error_report') {
    const errors = {};
    const area = pick(body.target_area, URC_ERRATA_AREAS, 'target_area', errors, 'study_note_pdf');
    const eType = pick(body.error_type, URC_ERRATA_TYPES, 'error_type', errors, 'factual_typo');
    const desc = cleanStr(body.description_text || '', 1500);
    if (!desc) errors.description_text = 'description_text is required';
    if (Object.keys(errors).length) throw validationError(errors);
    const newId = rid('urc-err');
    const code = await nextErrCode(env.DB);
    await env.DB.prepare(
      `INSERT INTO urc_error_reports (id, errata_code, reporter_name, reporter_email, target_area, page_or_item_url, item_title, error_type, description_text, suggested_correction, severity, fix_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'medium', 'open')`
    ).bind(
      newId, code, cleanStr(body.reporter_name || 'Learner', 120),
      cleanStr(body.reporter_email || '', 160).toLowerCase(), area,
      cleanStr(body.page_or_item_url || '', 300), cleanStr(body.item_title || '', 200),
      eType, desc, cleanStr(body.suggested_correction || '', 1000)
    ).run();
    return json({ ok: true, kind, id: newId, code }, 201);
  }

  throw validationError({ kind: 'kind must be shared_knowledge, topic_suggestion, or error_report' });
}

export async function handleUsersCommunityBatch5Admin(request, env, actor, id, sub, extra) {
  await ensureUsersCommunityBatch5Schema(env.DB);
  if (id === 'shared-knowledge') return handleSharedKnowledge(request, env, actor, sub, extra);
  if (id === 'topic-suggestions') return handleTopicSuggestions(request, env, actor, sub, extra);
  if (id === 'error-reports') return handleErrorReports(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown users & community batch 5 route');
}
