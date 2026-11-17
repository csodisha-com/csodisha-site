// Users, Roles & Community Batch 4 (v99): Modules 13-16
// 13 User Activity | 14 Data Access Requests (DPDP) | 15 Discussion Forum | 16 Ask a Question
// Never expose password hashes, salts, or session tokens in DPDP exports or API responses.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { REV_TABLES, snapshotRevision } from './users-community-batch1.js';
import { ensureUsersCommunityBatch3Schema } from './users-community-batch3.js';

export const URC_ACTIVITY_TYPES = [
  'login_success', 'login_failed', 'pdf_download', 'mock_test_submit',
  'forum_post', 'question_asked', 'profile_update', 'order_placed'
];
export const URC_PORTAL_AREAS = ['study-library', 'jobs-careers', 'schemes', 'community', 'student-hub', 'auth'];
export const URC_DPDP_TYPES = ['data_export_json', 'account_erasure_anonymize', 'rectification', 'consent_withdrawal'];
export const URC_DPDP_VERIFICATION = ['identity_verified', 'pending_otp'];
export const URC_DPDP_STATUSES = ['open', 'processing', 'fulfilled', 'rejected'];
export const URC_FORUM_CATEGORIES = [
  'opsc_oas_prep', 'ossc_osssc_exams', 'ugc_net_academia',
  'odisha_gk_history', 'b_ed_teaching', 'career_guidance'
];
export const URC_FORUM_STATUSES = ['draft', 'published', 'locked', 'archived'];
export const URC_QNA_SUBJECTS = [
  'Odisha History & Culture', 'Indian Polity', 'English Literature',
  'Teaching Aptitude & B.Ed', 'Reasoning & Quant', 'Odisha Govt Schemes'
];
export const URC_QNA_STATUSES = ['unanswered', 'answered_verified', 'featured_faq', 'archived'];

const _urc4Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'thread';
}

function stripSecrets(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.password_hash;
  delete out.salt;
  delete out.sessionToken;
  delete out.token;
  delete out.otp_hash;
  delete out.token_hash;
  return out;
}

REV_TABLES['14'] = {
  table: 'urc_data_access_requests',
  cols: ['request_code', 'user_id', 'requester_name', 'requester_email', 'request_type', 'statutory_due_date', 'verification_status', 'fulfillment_status', 'export_bundle_summary', 'handler_note', 'handled_by', 'fulfilled_at']
};
REV_TABLES['15'] = {
  table: 'urc_forum_threads',
  cols: ['slug', 'category_key', 'author_user_id', 'author_name', 'author_badge', 'title_en', 'title_or', 'body_en', 'body_or', 'tags_json', 'views_count', 'replies_count', 'is_pinned', 'is_locked', 'status']
};
REV_TABLES['16'] = {
  table: 'urc_student_questions',
  cols: ['question_code', 'subject_or_exam', 'asker_user_id', 'asker_name', 'district_odisha', 'question_en', 'question_or', 'answer_en', 'answer_or', 'answered_by_name', 'answered_by_badge', 'is_verified_answer', 'upvotes_count', 'answer_status']
};

export async function ensureUsersCommunityBatch4Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureUsersCommunityBatch3Schema(db);
  if (_urc4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS urc_user_activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL DEFAULT '',
      user_email TEXT NOT NULL DEFAULT '',
      activity_type TEXT NOT NULL DEFAULT 'login_success' CHECK (activity_type IN ('login_success', 'login_failed', 'pdf_download', 'mock_test_submit', 'forum_post', 'question_asked', 'profile_update', 'order_placed')),
      portal_area TEXT NOT NULL DEFAULT 'study-library' CHECK (portal_area IN ('study-library', 'jobs-careers', 'schemes', 'community', 'student-hub', 'auth')),
      target_ref TEXT NOT NULL DEFAULT '',
      ip_hash_masked TEXT NOT NULL DEFAULT '',
      device_summary TEXT NOT NULL DEFAULT '',
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_activity_type ON urc_user_activity_logs(activity_type, portal_area, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_data_access_requests (
      id TEXT PRIMARY KEY,
      request_code TEXT NOT NULL UNIQUE,
      user_id TEXT,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      request_type TEXT NOT NULL DEFAULT 'data_export_json' CHECK (request_type IN ('data_export_json', 'account_erasure_anonymize', 'rectification', 'consent_withdrawal')),
      statutory_due_date TEXT NOT NULL DEFAULT (date('now', '+30 days')),
      verification_status TEXT NOT NULL DEFAULT 'pending_otp' CHECK (verification_status IN ('identity_verified', 'pending_otp')),
      fulfillment_status TEXT NOT NULL DEFAULT 'open' CHECK (fulfillment_status IN ('open', 'processing', 'fulfilled', 'rejected')),
      export_bundle_summary TEXT NOT NULL DEFAULT '',
      handler_note TEXT NOT NULL DEFAULT '',
      handled_by TEXT NOT NULL DEFAULT '',
      fulfilled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_dpdp_status ON urc_data_access_requests(fulfillment_status, request_type, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_forum_threads (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      category_key TEXT NOT NULL DEFAULT 'opsc_oas_prep' CHECK (category_key IN ('opsc_oas_prep', 'ossc_osssc_exams', 'ugc_net_academia', 'odisha_gk_history', 'b_ed_teaching', 'career_guidance')),
      author_user_id TEXT,
      author_name TEXT NOT NULL,
      author_badge TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      views_count INTEGER NOT NULL DEFAULT 0,
      replies_count INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'locked', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_forum_cat ON urc_forum_threads(category_key, status, is_pinned DESC, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_student_questions (
      id TEXT PRIMARY KEY,
      question_code TEXT NOT NULL UNIQUE,
      subject_or_exam TEXT NOT NULL DEFAULT 'Odisha History & Culture' CHECK (subject_or_exam IN ('Odisha History & Culture', 'Indian Polity', 'English Literature', 'Teaching Aptitude & B.Ed', 'Reasoning & Quant', 'Odisha Govt Schemes')),
      asker_user_id TEXT,
      asker_name TEXT NOT NULL,
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      question_en TEXT NOT NULL,
      question_or TEXT NOT NULL DEFAULT '',
      answer_en TEXT NOT NULL DEFAULT '',
      answer_or TEXT NOT NULL DEFAULT '',
      answered_by_name TEXT NOT NULL DEFAULT '',
      answered_by_badge TEXT NOT NULL DEFAULT '',
      is_verified_answer INTEGER NOT NULL DEFAULT 0,
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      answer_status TEXT NOT NULL DEFAULT 'unanswered' CHECK (answer_status IN ('unanswered', 'answered_verified', 'featured_faq', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (asker_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_qna_status ON urc_student_questions(answer_status, subject_or_exam, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 13 activity logs
  const actCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_user_activity_logs`).first();
  if (Number(actCnt?.n || 0) === 0) {
    const acts = [
      ['urc-act-001', 'urc-u-004', 'Ananya Senapati', 'ananya.balasore@example.in', 'mock_test_submit', 'student-hub', 'mock-opsc-oas-gs1', '103.21.44.***', 'Android Chrome 130', 'Balasore'],
      ['urc-act-002', 'urc-u-003', 'Prof. Biswajit Panigrahi', 'educator@csodisha.com', 'pdf_download', 'study-library', 'odisha-history-pyq-2025.pdf', '49.36.12.***', 'Desktop Firefox 132', 'Cuttack'],
      ['urc-act-003', 'urc-u-001', 'Rajesh Behera', 'founder@csodisha.com', 'login_success', 'auth', 'admin-2fa-verified', '103.21.10.***', 'Linux Chromium', 'Balasore'],
      ['urc-act-004', 'urc-u-006', 'Smita Naik', 'smita.cuttack@example.in', 'question_asked', 'community', 'QNA-2026-0002', '157.48.90.***', 'Android Edge', 'Cuttack']
    ];
    for (const a of acts) {
      await db.prepare(
        `INSERT INTO urc_user_activity_logs (id, user_id, user_name, user_email, activity_type, portal_area, target_ref, ip_hash_masked, device_summary, district_odisha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...a).run();
    }
  }

  // Seed Module 14 DPDP requests
  const dpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_data_access_requests`).first();
  if (Number(dpCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_data_access_requests (id, request_code, user_id, requester_name, requester_email, request_type, verification_status, fulfillment_status, handler_note)
       VALUES ('urc-dpdp-001', 'DPDP-2026-0001', 'urc-u-004', 'Ananya Senapati', 'ananya.balasore@example.in', 'data_export_json', 'identity_verified', 'open', 'Requested personal profile & mock attempt export under DPDP Act 2023 Sec 11.')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_data_access_requests (id, request_code, user_id, requester_name, requester_email, request_type, verification_status, fulfillment_status, export_bundle_summary, handler_note, handled_by, fulfilled_at)
       VALUES ('urc-dpdp-002', 'DPDP-2026-0002', 'urc-u-006', 'Smita Naik', 'smita.cuttack@example.in', 'rectification', 'identity_verified', 'fulfilled', 'Updated district & B.Ed institution metadata.', 'Rectified Cuttack IASE college name.', 'founder@csodisha.com', datetime('now'))`
    ).run();
  }

  // Seed Module 15 forum threads
  const thCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_forum_threads`).first();
  if (Number(thCnt?.n || 0) === 0) {
    const threads = [
      [
        'urc-th-001', 'opsc-oas-prelims-2026-booklist-odisha', 'opsc_oas_prep', 'urc-u-003',
        'Prof. Biswajit Panigrahi', 'Verified Educator',
        'OPSC OAS 2026 Prelims & Mains Standard Booklist (Odisha Focus)',
        'OPSC OAS ୨୦୨୬ ପ୍ରିଲିମ୍ସ ଏବଂ ମେନ୍ସ ପାଇଁ ମାନକ ପୁସ୍ତକ ତାଲିକା',
        'Complete subject-wise booklist covering Odisha History, Geography, Polity, and Economy.',
        'ଓଡ଼ିଶା ଇତିହାସ, ଭୂଗୋଳ, ରାଜନୀତି ଏବଂ ଅର୍ଥନୀତି ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ପୁସ୍ତକ ତାଲିକା।',
        '["OPSC OAS", "Prelims", "Booklist"]', 312, 18, 1, 0, 'published'
      ],
      [
        'urc-th-002', 'ugc-net-odia-english-paper1-research-aptitude', 'ugc_net_academia', 'urc-u-002',
        'Subhashree Mohanty', 'Senior Moderator',
        'UGC NET Paper 1 Research Aptitude & Higher Education PYQ Thread',
        'UGC NET ପେପର ୧ ଗବେଷଣା ଯୋଗ୍ୟତା ଏବଂ ଉଚ୍ଚଶିକ୍ଷା PYQ ଆଲୋଚନା',
        'Discuss 2021-2025 UGC NET Paper 1 trend shifts and NEP 2020 questions.',
        '୨୦୨୧-୨୦୨୫ UGC NET ପେପର ୧ ପ୍ରଶ୍ନ ଧାରା ଏବଂ NEP ୨୦୨୦ ଆଲୋଚନା।',
        '["UGC NET", "Paper 1", "NEP 2020"]', 185, 9, 0, 0, 'published'
      ]
    ];
    for (const t of threads) {
      await db.prepare(
        `INSERT INTO urc_forum_threads (id, slug, category_key, author_user_id, author_name, author_badge, title_en, title_or, body_en, body_or, tags_json, views_count, replies_count, is_pinned, is_locked, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...t).run();
    }
  }

  // Seed Module 16 student questions
  const qCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_student_questions`).first();
  if (Number(qCnt?.n || 0) === 0) {
    const qnas = [
      [
        'urc-qna-001', 'QNA-2026-0001', 'Odisha History & Culture', 'urc-u-004', 'Ananya Senapati', 'Balasore',
        'Who led the Paika Rebellion of 1817 in Khordha and what were its main causes?',
        '୧୮୧୭ ଖୋର୍ଦ୍ଧା ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ କିଏ ନେଇଥିଲେ ଏବଂ ଏହାର ମୁଖ୍ୟ କାରଣ କଣ ଥିଲା?',
        'Bakshi Jagabandhu Bidyadhar led the 1817 Paika Rebellion against British land revenue policies, salt monopoly, and currency changes.',
        'ବକ୍ସି ଜଗବନ୍ଧୁ ବିଦ୍ୟାଧର ୧୮୧୭ ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ ନେଇଥିଲେ।',
        'Prof. Biswajit Panigrahi', 'Verified Educator', 1, 24, 'featured_faq'
      ],
      [
        'urc-qna-002', 'QNA-2026-0002', 'Teaching Aptitude & B.Ed', 'urc-u-006', 'Smita Naik', 'Cuttack',
        'What is the recommended pupil-teacher ratio for upper primary schools under RTE Act 2009?',
        'RTE ଆଇନ ୨୦୦୯ ଅନୁଯାୟୀ ଉଚ୍ଚ ପ୍ରାଥମିକ ବିଦ୍ୟାଳୟ ପାଇଁ ଛାତ୍ର-ଶିକ୍ଷକ ଅନୁପାତ କେତେ?',
        '', '', '', '', 0, 4, 'unanswered'
      ]
    ];
    for (const q of qnas) {
      await db.prepare(
        `INSERT INTO urc_student_questions (id, question_code, subject_or_exam, asker_user_id, asker_name, district_odisha, question_en, question_or, answer_en, answer_or, answered_by_name, answered_by_badge, is_verified_answer, upvotes_count, answer_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...q).run();
    }
  }

  _urc4Ready.add(db);
}

/* ================= MODULE 13: USER ACTIVITY ================= */
async function handleActivity(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const actType = (url.searchParams.get('activity_type') || '').trim();
    const portal = (url.searchParams.get('portal_area') || '').trim();
    const district = (url.searchParams.get('district_odisha') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (actType) { where.push('activity_type = ?'); binds.push(actType); }
    if (portal) { where.push('portal_area = ?'); binds.push(portal); }
    if (district) { where.push('district_odisha = ?'); binds.push(district); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(user_name LIKE ? ESCAPE '\\' OR user_email LIKE ? ESCAPE '\\' OR target_ref LIKE ? ESCAPE '\\' OR device_summary LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ results }, { results: byType }, { results: byPortal }] = await Promise.all([
      db.prepare(`SELECT * FROM urc_user_activity_logs ${w} ORDER BY created_at DESC LIMIT 200`).bind(...binds).all(),
      db.prepare(`SELECT activity_type, COUNT(*) AS count FROM urc_user_activity_logs GROUP BY activity_type ORDER BY count DESC`).all(),
      db.prepare(`SELECT portal_area, COUNT(*) AS count FROM urc_user_activity_logs GROUP BY portal_area ORDER BY count DESC`).all()
    ]);
    return json({
      items: results || [],
      total: (results || []).length,
      breakdown: { by_type: byType || [], by_portal: byPortal || [] }
    });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const actType = pick(body.activity_type, URC_ACTIVITY_TYPES, 'activity_type', errors, 'login_success');
    const portal = pick(body.portal_area, URC_PORTAL_AREAS, 'portal_area', errors, 'study-library');
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-act');
    await db.prepare(
      `INSERT INTO urc_user_activity_logs (id, user_id, user_name, user_email, activity_type, portal_area, target_ref, ip_hash_masked, device_summary, district_odisha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId,
      body.user_id ? cleanStr(body.user_id, 80) : null,
      cleanStr(body.user_name || actor?.email || 'User', 120),
      cleanStr(body.user_email || '', 160).toLowerCase(),
      actType, portal,
      cleanStr(body.target_ref || '', 160),
      cleanStr(body.ip_hash_masked || '103.21.0.***', 60),
      cleanStr(body.device_summary || 'Web Browser', 120),
      cleanStr(body.district_odisha || 'Khordha', 80)
    ).run();

    await audit(env, request, actor, 'urc.activity.record', 'urc_user_activity_logs', newId, { activity_type: actType, portal_area: portal });
    const created = await db.prepare(`SELECT * FROM urc_user_activity_logs WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 14: DATA ACCESS REQUESTS (DPDP) ================= */
async function nextDpdpCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_data_access_requests`).first();
  return `DPDP-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleDataRequests(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('fulfillment_status') || '').trim();
    const rType = (url.searchParams.get('request_type') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('fulfillment_status = ?'); binds.push(status); }
    if (rType) { where.push('request_type = ?'); binds.push(rType); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(request_code LIKE ? ESCAPE '\\' OR requester_name LIKE ? ESCAPE '\\' OR requester_email LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_data_access_requests ${w} ORDER BY CASE fulfillment_status WHEN 'open' THEN 0 WHEN 'processing' THEN 1 ELSE 2 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const name = cleanStr(body.requester_name || '', 120);
    const email = cleanStr(body.requester_email || '', 160).toLowerCase();
    const rType = pick(body.request_type, URC_DPDP_TYPES, 'request_type', errors, 'data_export_json');
    const verSt = pick(body.verification_status, URC_DPDP_VERIFICATION, 'verification_status', errors, 'pending_otp');
    if (!name) errors.requester_name = 'requester_name is required';
    if (!email || !email.includes('@')) errors.requester_email = 'Valid requester_email is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let uid = body.user_id ? cleanStr(body.user_id, 80) : null;
    if (!uid) {
      const u = await db.prepare(`SELECT id FROM urc_users WHERE email = ?`).bind(email).first();
      if (u) uid = u.id;
    }

    const newId = rid('urc-dpdp');
    const code = await nextDpdpCode(db);
    await db.prepare(
      `INSERT INTO urc_data_access_requests (id, request_code, user_id, requester_name, requester_email, request_type, verification_status, fulfillment_status, handler_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`
    ).bind(newId, code, uid, name, email, rType, verSt, cleanStr(body.handler_note || '', 400)).run();

    await snapshotRevision(db, '14', newId, actor, 'create DPDP request');
    await audit(env, request, actor, 'urc.dpdp.create', 'urc_data_access_requests', newId, { request_code: code, request_type: rType });
    const created = await db.prepare(`SELECT * FROM urc_data_access_requests WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const reqRow = await db.prepare(`SELECT * FROM urc_data_access_requests WHERE id = ?`).bind(sub).first();
    if (!reqRow) throw new HttpError(404, 'NOT_FOUND', 'DPDP request not found');
    const body = await readJson(request, 20000);
    const action = cleanStr(body.action || '', 30).toLowerCase();
    const note = cleanStr(body.handler_note || reqRow.handler_note || '', 400);

    if (!['generate_export', 'anonymize_erase', 'reject'].includes(action)) {
      throw validationError({ action: 'action must be generate_export, anonymize_erase, or reject' });
    }

    const userRow = reqRow.user_id
      ? await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(reqRow.user_id).first()
      : await db.prepare(`SELECT * FROM urc_users WHERE email = ?`).bind(reqRow.requester_email).first();

    let exportBundle = null;
    let summary = reqRow.export_bundle_summary || '';
    let nextStatus = 'fulfilled';

    if (action === 'generate_export') {
      const uid = userRow?.id || reqRow.user_id || '';
      const profile = uid ? await db.prepare(`SELECT * FROM urc_user_profiles WHERE user_id = ?`).bind(uid).first() : null;
      const grants = uid ? (await db.prepare(`SELECT * FROM urc_membership_grants WHERE user_id = ?`).bind(uid).all()).results : [];
      const acts = uid ? (await db.prepare(`SELECT * FROM urc_user_activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).bind(uid).all()).results : [];

      exportBundle = {
        dpdp_request_code: reqRow.request_code,
        generated_at: new Date().toISOString(),
        user: stripSecrets(userRow),
        profile: stripSecrets(profile),
        membership_grants: (grants || []).map(stripSecrets),
        activity_logs: (acts || []).map(stripSecrets)
      };
      summary = `Sanitized JSON bundle: user=${userRow ? 1 : 0}, profile=${profile ? 1 : 0}, grants=${(grants || []).length}, activity=${(acts || []).length}`;
    } else if (action === 'anonymize_erase') {
      if (userRow && userRow.role_key === 'super_admin') {
        throw new HttpError(409, 'PRIMARY_SUPER_ADMIN', 'Primary Super Admin cannot be anonymized or erased');
      }
      if (userRow && (userRow.id === actor.userId || userRow.email === actor.email)) {
        throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot erase your own active admin account');
      }
      if (userRow) {
        await snapshotRevision(db, '01', userRow.id, actor, `DPDP erasure ${reqRow.request_code}`);
        const redactedEmail = `erased+${userRow.id}@redacted.invalid`;
        await db.prepare(
          `UPDATE urc_users SET full_name = 'Erased User', email = ?, phone = '', account_status = 'blocked', updated_at = datetime('now') WHERE id = ?`
        ).bind(redactedEmail, userRow.id).run();
        await db.prepare(
          `UPDATE urc_user_profiles SET display_handle = '', bio_en = '', bio_or = '', institution_name = '', profile_visibility = 'private', updated_at = datetime('now') WHERE user_id = ?`
        ).bind(userRow.id).run();
      }
      summary = `PII anonymized for ${reqRow.requester_email} under DPDP Act 2023.`;
    } else if (action === 'reject') {
      nextStatus = 'rejected';
    }

    await snapshotRevision(db, '14', sub, actor, `DPDP action: ${action}`);
    await db.prepare(
      `UPDATE urc_data_access_requests
       SET fulfillment_status = ?, export_bundle_summary = ?, handler_note = ?, handled_by = ?, fulfilled_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(nextStatus, summary, note, actor?.email || actor?.userId || 'admin', sub).run();

    await audit(env, request, actor, `urc.dpdp.${action}`, 'urc_data_access_requests', sub, { request_code: reqRow.request_code });
    const updated = await db.prepare(`SELECT * FROM urc_data_access_requests WHERE id = ?`).bind(sub).first();
    return json({ item: updated, export_bundle: exportBundle });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 15: DISCUSSION FORUM ================= */
function decorateThread(r) {
  if (!r) return r;
  return {
    ...r,
    tags: parseJson(r.tags_json, []),
    is_pinned: Number(r.is_pinned || 0) === 1,
    is_locked: Number(r.is_locked || 0) === 1,
    views_count: Number(r.views_count || 0),
    replies_count: Number(r.replies_count || 0)
  };
}

async function handleForum(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const cat = (url.searchParams.get('category_key') || '').trim();
    const status = (url.searchParams.get('status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (cat) { where.push('category_key = ?'); binds.push(cat); }
    if (status) { where.push('status = ?'); binds.push(status); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_forum_threads ${w} ORDER BY is_pinned DESC, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateThread), total: (results || []).length });
  }

  if (sub === 'bulk-status' && (method === 'PATCH' || method === 'POST')) {
    const body = await readJson(request, 20000);
    const ids = Array.isArray(body.ids) ? body.ids.map(x => cleanStr(x, 80)).filter(Boolean) : [];
    const errors = {};
    const status = pick(body.status, URC_FORUM_STATUSES, 'status', errors, null);
    if (!ids.length) errors.ids = 'Select at least one thread';
    if (!status) errors.status = 'Valid status is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let updated = 0;
    for (const tid of ids) {
      await snapshotRevision(db, '15', tid, actor, `bulk status -> ${status}`);
      await db.prepare(`UPDATE urc_forum_threads SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, tid).run();
      updated++;
    }
    await audit(env, request, actor, 'urc.forum.bulk_status', 'urc_forum_threads', ids.join(','), { status, updated });
    return json({ ok: true, updated, status });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 35000);
    const errors = {};
    const titleEn = cleanStr(body.title_en || '', 200);
    const titleOr = cleanStr(body.title_or || '', 240);
    const bodyEn = cleanStr(body.body_en || '', 4000);
    const bodyOr = cleanStr(body.body_or || '', 4000);
    const cat = pick(body.category_key, URC_FORUM_CATEGORIES, 'category_key', errors, 'opsc_oas_prep');
    const status = pick(body.status, URC_FORUM_STATUSES, 'status', errors, 'published');
    if (!titleEn) errors.title_en = 'title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const tags = Array.isArray(body.tags)
      ? body.tags.map(x => cleanStr(x, 40)).filter(Boolean).slice(0, 8)
      : String(body.tags || '').split(',').map(x => cleanStr(x, 40)).filter(Boolean).slice(0, 8);

    const baseSlug = slugify(body.slug || titleEn);
    const dup = await db.prepare(`SELECT id FROM urc_forum_threads WHERE slug = ?`).bind(baseSlug).first();
    const slug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;

    const newId = rid('urc-th');
    await db.prepare(
      `INSERT INTO urc_forum_threads (id, slug, category_key, author_user_id, author_name, author_badge, title_en, title_or, body_en, body_or, tags_json, is_pinned, is_locked, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, slug, cat,
      body.author_user_id ? cleanStr(body.author_user_id, 80) : null,
      cleanStr(body.author_name || 'CS Odisha Mentor', 120),
      cleanStr(body.author_badge || 'Moderator', 80),
      titleEn, titleOr, bodyEn, bodyOr, JSON.stringify(tags),
      body.is_pinned ? 1 : 0, body.is_locked ? 1 : 0, status
    ).run();

    await snapshotRevision(db, '15', newId, actor, 'create forum thread');
    await audit(env, request, actor, 'urc.forum.create', 'urc_forum_threads', newId, { slug, category_key: cat });
    const created = await db.prepare(`SELECT * FROM urc_forum_threads WHERE id = ?`).bind(newId).first();
    return json({ item: decorateThread(created) }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_forum_threads WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Forum thread not found');
    const body = await readJson(request, 35000);
    const errors = {};

    const titleEn = body.title_en !== undefined ? cleanStr(body.title_en, 200) : existing.title_en;
    const titleOr = body.title_or !== undefined ? cleanStr(body.title_or, 240) : existing.title_or;
    const bodyEn = body.body_en !== undefined ? cleanStr(body.body_en, 4000) : existing.body_en;
    const bodyOr = body.body_or !== undefined ? cleanStr(body.body_or, 4000) : existing.body_or;
    const cat = body.category_key !== undefined ? pick(body.category_key, URC_FORUM_CATEGORIES, 'category_key', errors, existing.category_key) : existing.category_key;
    const status = body.status !== undefined ? pick(body.status, URC_FORUM_STATUSES, 'status', errors, existing.status) : existing.status;
    const isPinned = body.is_pinned !== undefined ? (body.is_pinned ? 1 : 0) : existing.is_pinned;
    const isLocked = body.is_locked !== undefined ? (body.is_locked ? 1 : 0) : existing.is_locked;
    let tagsJson = existing.tags_json;
    if (body.tags !== undefined) {
      const tags = Array.isArray(body.tags)
        ? body.tags.map(x => cleanStr(x, 40)).filter(Boolean).slice(0, 8)
        : String(body.tags).split(',').map(x => cleanStr(x, 40)).filter(Boolean).slice(0, 8);
      tagsJson = JSON.stringify(tags);
    }
    if (!titleEn) errors.title_en = 'title_en cannot be empty';
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotRevision(db, '15', sub, actor, body.change_note || 'update forum thread');
    await db.prepare(
      `UPDATE urc_forum_threads
       SET category_key = ?, title_en = ?, title_or = ?, body_en = ?, body_or = ?, tags_json = ?, is_pinned = ?, is_locked = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(cat, titleEn, titleOr, bodyEn, bodyOr, tagsJson, isPinned, isLocked, status, sub).run();

    await audit(env, request, actor, 'urc.forum.update', 'urc_forum_threads', sub, { status, is_pinned: isPinned, is_locked: isLocked });
    const updated = await db.prepare(`SELECT * FROM urc_forum_threads WHERE id = ?`).bind(sub).first();
    return json({ item: decorateThread(updated) });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_forum_threads WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Forum thread not found');
    await snapshotRevision(db, '15', sub, actor, 'archive forum thread');
    await db.prepare(`UPDATE urc_forum_threads SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.forum.archive', 'urc_forum_threads', sub, {});
    return json({ ok: true, id: sub, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 16: ASK A QUESTION ================= */
async function nextQnaCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_student_questions`).first();
  return `QNA-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

function decorateQna(r) {
  if (!r) return r;
  return {
    ...r,
    is_verified_answer: Number(r.is_verified_answer || 0) === 1,
    upvotes_count: Number(r.upvotes_count || 0)
  };
}

async function handleQuestions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('answer_status') || '').trim();
    const subj = (url.searchParams.get('subject_or_exam') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('answer_status = ?'); binds.push(status); }
    if (subj) { where.push('subject_or_exam = ?'); binds.push(subj); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(question_code LIKE ? ESCAPE '\\' OR asker_name LIKE ? ESCAPE '\\' OR question_en LIKE ? ESCAPE '\\' OR answer_en LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_student_questions ${w}
       ORDER BY CASE answer_status WHEN 'unanswered' THEN 0 WHEN 'featured_faq' THEN 1 ELSE 2 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateQna), total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 25000);
    const errors = {};
    const subj = pick(body.subject_or_exam, URC_QNA_SUBJECTS, 'subject_or_exam', errors, 'Odisha History & Culture');
    const asker = cleanStr(body.asker_name || '', 120);
    const qEn = cleanStr(body.question_en || '', 1500);
    const qOr = cleanStr(body.question_or || '', 1500);
    const district = cleanStr(body.district_odisha || 'Khordha', 80);
    if (!asker) errors.asker_name = 'asker_name is required';
    if (!qEn) errors.question_en = 'question_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-qna');
    const qCode = await nextQnaCode(db);
    await db.prepare(
      `INSERT INTO urc_student_questions (id, question_code, subject_or_exam, asker_user_id, asker_name, district_odisha, question_en, question_or, answer_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unanswered')`
    ).bind(newId, qCode, subj, body.asker_user_id ? cleanStr(body.asker_user_id, 80) : null, asker, district, qEn, qOr).run();

    await snapshotRevision(db, '16', newId, actor, 'create student question');
    await audit(env, request, actor, 'urc.qna.create', 'urc_student_questions', newId, { question_code: qCode });
    const created = await db.prepare(`SELECT * FROM urc_student_questions WHERE id = ?`).bind(newId).first();
    return json({ item: decorateQna(created) }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_student_questions WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Question not found');
    const body = await readJson(request, 30000);
    const errors = {};

    const qEn = body.question_en !== undefined ? cleanStr(body.question_en, 1500) : existing.question_en;
    const qOr = body.question_or !== undefined ? cleanStr(body.question_or, 1500) : existing.question_or;
    const aEn = body.answer_en !== undefined ? cleanStr(body.answer_en, 4000) : existing.answer_en;
    const aOr = body.answer_or !== undefined ? cleanStr(body.answer_or, 4000) : existing.answer_or;
    const isVer = body.is_verified_answer !== undefined ? (body.is_verified_answer ? 1 : 0) : (aEn ? 1 : existing.is_verified_answer);
    const defaultStatus = aEn ? (isVer ? 'answered_verified' : existing.answer_status) : existing.answer_status;
    const status = body.answer_status !== undefined ? pick(body.answer_status, URC_QNA_STATUSES, 'answer_status', errors, defaultStatus) : defaultStatus;
    const ansBy = body.answered_by_name !== undefined ? cleanStr(body.answered_by_name, 120) : (existing.answered_by_name || actor?.email || 'Verified Mentor');
    const ansBadge = body.answered_by_badge !== undefined ? cleanStr(body.answered_by_badge, 80) : (existing.answered_by_badge || 'Verified Educator');
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotRevision(db, '16', sub, actor, body.change_note || 'answer/update question');
    await db.prepare(
      `UPDATE urc_student_questions
       SET question_en = ?, question_or = ?, answer_en = ?, answer_or = ?, answered_by_name = ?, answered_by_badge = ?, is_verified_answer = ?, answer_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(qEn, qOr, aEn, aOr, ansBy, ansBadge, isVer, status, sub).run();

    await audit(env, request, actor, 'urc.qna.update', 'urc_student_questions', sub, { answer_status: status, is_verified_answer: isVer });
    const updated = await db.prepare(`SELECT * FROM urc_student_questions WHERE id = ?`).bind(sub).first();
    return json({ item: decorateQna(updated) });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_student_questions WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Question not found');
    await snapshotRevision(db, '16', sub, actor, 'archive question');
    await db.prepare(`UPDATE urc_student_questions SET answer_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.qna.archive', 'urc_student_questions', sub, {});
    return json({ ok: true, id: sub, answer_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/** Public cached endpoint: GET /api/community/qna */
export async function handlePublicCommunityQnaApi(request, env) {
  if (!env || !env.DB) return json({ questions: [], threads: [] });
  await ensureUsersCommunityBatch4Schema(env.DB);
  const url = new URL(request.url);
  const subj = (url.searchParams.get('subject_or_exam') || '').trim();
  const cat = (url.searchParams.get('category_key') || '').trim();

  const qWhere = [`answer_status IN ('answered_verified', 'featured_faq')`];
  const qBinds = [];
  if (subj) { qWhere.push('subject_or_exam = ?'); qBinds.push(subj); }

  const tWhere = [`status = 'published'`];
  const tBinds = [];
  if (cat) { tWhere.push('category_key = ?'); tBinds.push(cat); }

  const [{ results: questions }, { results: threads }] = await Promise.all([
    env.DB.prepare(
      `SELECT id, question_code, subject_or_exam, asker_name, district_odisha, question_en, question_or,
              answer_en, answer_or, answered_by_name, answered_by_badge, is_verified_answer, upvotes_count, answer_status, created_at
       FROM urc_student_questions WHERE ${qWhere.join(' AND ')}
       ORDER BY CASE answer_status WHEN 'featured_faq' THEN 0 ELSE 1 END, upvotes_count DESC, created_at DESC LIMIT 40`
    ).bind(...qBinds).all(),
    env.DB.prepare(
      `SELECT id, slug, category_key, author_name, author_badge, title_en, title_or, body_en, body_or,
              tags_json, views_count, replies_count, is_pinned, is_locked, created_at
       FROM urc_forum_threads WHERE ${tWhere.join(' AND ')}
       ORDER BY is_pinned DESC, created_at DESC LIMIT 40`
    ).bind(...tBinds).all()
  ]);

  return json({
    questions: (questions || []).map(decorateQna),
    threads: (threads || []).map(decorateThread)
  }, 200, { 'Cache-Control': 'public, max-age=120' });
}

export async function handleUsersCommunityBatch4Admin(request, env, actor, id, sub, extra) {
  await ensureUsersCommunityBatch4Schema(env.DB);
  if (id === 'activity') return handleActivity(request, env, actor, sub, extra);
  if (id === 'data-requests') return handleDataRequests(request, env, actor, sub, extra);
  if (id === 'forum') return handleForum(request, env, actor, sub, extra);
  if (id === 'questions') return handleQuestions(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown users & community batch 4 route');
}
