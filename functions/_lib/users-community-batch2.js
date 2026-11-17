// Users, Roles & Community Batch 2 (v97): Modules 05-08
// 05 Account Status | 06 Registrations | 07 Membership Access | 08 Community Posts
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  ensureUsersCommunityBatch1Schema,
  REV_TABLES,
  snapshotRevision,
  computeProfileCompletion,
  nextUserUid,
  URC_ACCOUNT_STATUSES
} from './users-community-batch1.js';
import { ensurePaymentsFinanceBatch2Schema } from './payments-finance-batch2.js';

export const URC_STATUS_REASON_CODES = [
  'kyc_verified', 'policy_violation', 'spam_activity',
  'user_requested_pause', 'admin_manual_review', 'reinstated'
];
export const URC_REG_ROLES = ['student', 'educator'];
export const URC_REG_SOURCES = ['web_portal', 'study_library', 'mock_test_gate', 'referral_invite'];
export const URC_REG_STATUSES = ['pending_review', 'approved', 'rejected', 'expired'];
export const URC_TIER_CODES = ['free_scholar', 'pro_aspirant', 'opsc_elite', 'institutional'];
export const URC_GRANT_SOURCES = ['paid_order', 'admin_complimentary', 'scholarship_waiver', 'educator_grant'];
export const URC_ACCESS_STATUSES = ['active', 'expiring_soon', 'expired', 'revoked'];
export const URC_POST_TYPES = [
  'study_discussion', 'exam_strategy', 'odisha_current_affairs', 'peer_announcement', 'success_story'
];
export const URC_POST_STATUSES = ['draft', 'pending_moderation', 'published', 'archived'];

const _urc2Ready = new WeakSet();

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
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'post';
}

REV_TABLES['07'] = {
  table: 'urc_membership_grants',
  cols: ['grant_code', 'user_id', 'tier_code', 'tier_name_en', 'grant_source', 'order_number', 'daily_download_cap', 'mock_test_access_level', 'starts_at', 'expires_at', 'access_status', 'granted_by', 'notes']
};

REV_TABLES['08'] = {
  table: 'urc_community_posts',
  cols: ['slug', 'post_type', 'author_user_id', 'author_name', 'author_badge', 'title_en', 'title_or', 'body_en', 'body_or', 'exam_tag', 'district_tag', 'upvotes_count', 'replies_count', 'is_pinned', 'featured', 'status']
};

export async function ensureUsersCommunityBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureUsersCommunityBatch1Schema(db);
  try { await ensurePaymentsFinanceBatch2Schema(db); } catch { /* optional bridge */ }
  if (_urc2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS urc_account_status_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL CHECK (new_status IN ('active', 'pending_verification', 'suspended', 'blocked')),
      reason_code TEXT NOT NULL DEFAULT 'admin_manual_review' CHECK (reason_code IN ('kyc_verified', 'policy_violation', 'spam_activity', 'user_requested_pause', 'admin_manual_review', 'reinstated')),
      reason_note TEXT NOT NULL DEFAULT '',
      expires_at TEXT,
      changed_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_status_logs_user ON urc_account_status_logs(user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_registrations (
      id TEXT PRIMARY KEY,
      reg_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      requested_role TEXT NOT NULL DEFAULT 'student' CHECK (requested_role IN ('student', 'educator')),
      signup_source TEXT NOT NULL DEFAULT 'web_portal' CHECK (signup_source IN ('web_portal', 'study_library', 'mock_test_gate', 'referral_invite')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (approval_status IN ('pending_review', 'approved', 'rejected', 'expired')),
      linked_user_id TEXT,
      reviewer_note TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (linked_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_regs_status ON urc_registrations(approval_status, requested_role, district_odisha)`,
    `CREATE TABLE IF NOT EXISTS urc_membership_grants (
      id TEXT PRIMARY KEY,
      grant_code TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      tier_code TEXT NOT NULL DEFAULT 'pro_aspirant' CHECK (tier_code IN ('free_scholar', 'pro_aspirant', 'opsc_elite', 'institutional')),
      tier_name_en TEXT NOT NULL DEFAULT 'Pro Aspirant',
      grant_source TEXT NOT NULL DEFAULT 'admin_complimentary' CHECK (grant_source IN ('paid_order', 'admin_complimentary', 'scholarship_waiver', 'educator_grant')),
      order_number TEXT NOT NULL DEFAULT '',
      daily_download_cap INTEGER NOT NULL DEFAULT 25,
      mock_test_access_level TEXT NOT NULL DEFAULT 'all_mocks',
      starts_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('active', 'expiring_soon', 'expired', 'revoked')),
      granted_by TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_mem_grants_user ON urc_membership_grants(user_id, access_status, tier_code)`,
    `CREATE TABLE IF NOT EXISTS urc_community_posts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      post_type TEXT NOT NULL DEFAULT 'study_discussion' CHECK (post_type IN ('study_discussion', 'exam_strategy', 'odisha_current_affairs', 'peer_announcement', 'success_story')),
      author_user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_badge TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      exam_tag TEXT NOT NULL DEFAULT '',
      district_tag TEXT NOT NULL DEFAULT 'Khordha',
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      replies_count INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_moderation', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_user_id) REFERENCES urc_users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_posts_status ON urc_community_posts(status, is_pinned DESC, featured DESC, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 05 logs
  const logCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_account_status_logs`).first();
  if (Number(logCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_account_status_logs (id, user_id, previous_status, new_status, reason_code, reason_note, changed_by)
       VALUES (?, 'urc-u-004', 'pending_verification', 'active', 'kyc_verified', 'Verified Balasore aspirant email & district.', 'founder@csodisha.com')`
    ).bind('urc-slog-001').run();
    await db.prepare(
      `INSERT INTO urc_account_status_logs (id, user_id, previous_status, new_status, reason_code, reason_note, changed_by)
       VALUES (?, 'urc-u-005', 'active', 'pending_verification', 'admin_manual_review', 'Awaiting college ID confirmation for OSSSC cohort.', 'moderator@csodisha.com')`
    ).bind('urc-slog-002').run();
  }

  // Seed Module 06 registrations
  const regCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_registrations`).first();
  if (Number(regCnt?.n || 0) === 0) {
    const regs = [
      ['urc-reg-001', 'REG-2026-0001', 'Soumya Ranjan Das', 'soumya.balasore@example.in', '+91-9437220011', 'Balasore', 'student', 'web_portal', 1, 'pending_review', null, ''],
      ['urc-reg-002', 'REG-2026-0002', 'Dr. Nibedita Tripathy', 'nibedita.cuttack@example.in', '+91-9437220022', 'Cuttack', 'educator', 'study_library', 1, 'pending_review', null, 'Ravenshaw Economics faculty applicant'],
      ['urc-reg-003', 'REG-2026-0003', 'Ananya Senapati', 'ananya.balasore@example.in', '+91-9861000201', 'Balasore', 'student', 'mock_test_gate', 1, 'approved', 'urc-u-004', 'Auto-verified via mock test portal']
    ];
    for (const r of regs) {
      await db.prepare(
        `INSERT INTO urc_registrations (id, reg_code, full_name, email, phone, district_odisha, requested_role, signup_source, email_verified, approval_status, linked_user_id, reviewer_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  // Seed Module 07 membership grants
  const grantCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_membership_grants`).first();
  if (Number(grantCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_membership_grants (id, grant_code, user_id, tier_code, tier_name_en, grant_source, order_number, daily_download_cap, mock_test_access_level, expires_at, access_status, granted_by, notes)
       VALUES ('urc-mg-001', 'MEM-2026-0001', 'urc-u-004', 'pro_aspirant', 'Pro Aspirant', 'paid_order', 'CSO-ORD-2026-0001', 25, 'all_mocks', datetime('now', '+365 days'), 'active', 'founder@csodisha.com', 'Annual OPSC/OSSC Pro Aspirant pass')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_membership_grants (id, grant_code, user_id, tier_code, tier_name_en, grant_source, order_number, daily_download_cap, mock_test_access_level, expires_at, access_status, granted_by, notes)
       VALUES ('urc-mg-002', 'MEM-2026-0002', 'urc-u-003', 'opsc_elite', 'OPSC Elite', 'educator_grant', '', 100, 'all_mocks_plus_mentorship', datetime('now', '+365 days'), 'active', 'founder@csodisha.com', 'Verified Faculty complimentary Elite access')`
    ).run();
  }

  // Seed Module 08 community posts
  const postCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_community_posts`).first();
  if (Number(postCnt?.n || 0) === 0) {
    const posts = [
      [
        'urc-post-001', 'opsc-oas-2026-odisha-history-strategy', 'exam_strategy', 'urc-u-003',
        'Prof. Biswajit Panigrahi', 'Verified Educator',
        'OPSC OAS 2026: High-Yield Odisha History & Freedom Movement Strategy',
        'OPSC OAS ୨୦୨୬: ଓଡ଼ିଶା ଇତିହାସ ଏବଂ ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ ପ୍ରସ୍ତୁତି ରଣନୀତି',
        'Focus on Paika Rebellion (1817), Utkal Sammilani (1903), and Odisha Province formation (1936) with PYQ answer structures.',
        'ପାଇକ ବିଦ୍ରୋହ (୧୮୧୭), ଉତ୍କଳ ସମ୍ମିଳନୀ (୧୯୦୩) ଏବଂ ସ୍ୱତନ୍ତ୍ର ଓଡ଼ିଶା ପ୍ରଦେଶ ଗଠନ (୧୯୩୬) ଉପରେ ବିଶେଷ ଧ୍ୟାନ ଦିଅନ୍ତୁ।',
        'OPSC OAS', 'Cuttack', 48, 12, 1, 1, 'published'
      ],
      [
        'urc-post-002', 'balasore-ossc-cgl-study-group-notes', 'study_discussion', 'urc-u-004',
        'Ananya Senapati', 'OAS Aspirant',
        'OSSC CGL Prelims Quantitative & Odisha GK Weekly Peer Thread',
        'OSSC CGL ପ୍ରିଲିମ୍ସ ଗଣିତ ଏବଂ ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ସାପ୍ତାହିକ ଆଲୋଚନା',
        'Sharing compiled district-wise river systems and Odisha budget highlights for OSSC CGL aspirants.',
        'OSSC CGL ପରୀକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ ଜିଲ୍ଲାୱାରୀ ନଦୀ ପ୍ରଣାଳୀ ଏବଂ ଓଡ଼ିଶା ବଜେଟ୍ ସାରାଂଶ।',
        'OSSC CGL', 'Balasore', 29, 7, 0, 1, 'published'
      ],
      [
        'urc-post-003', 'otet-osstet-odia-pedagogy-draft', 'odisha_current_affairs', 'urc-u-006',
        'Smita Naik', 'Teaching Aspirant',
        'OTET & OSSTET Odia Pedagogy Revision Checklist',
        'OTET ଏବଂ OSSTET ଓଡ଼ିଆ ଶିକ୍ଷାଦାନ ସଂଶୋଧନ ତାଲିକା',
        'Draft checklist covering child-centric pedagogy and Odisha SCERT textbooks.',
        'ଓଡ଼ିଶା SCERT ପାଠ୍ୟପୁସ୍ତକ ଆଧାରିତ ଶିଶୁ-କୈନ୍ଦ୍ରିକ ଶିକ୍ଷାଦାନ ତାଲିକା।',
        'OTET', 'Cuttack', 5, 1, 0, 0, 'pending_moderation'
      ]
    ];
    for (const p of posts) {
      await db.prepare(
        `INSERT INTO urc_community_posts (id, slug, post_type, author_user_id, author_name, author_badge, title_en, title_or, body_en, body_or, exam_tag, district_tag, upvotes_count, replies_count, is_pinned, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...p).run();
    }
  }

  _urc2Ready.add(db);
}

/* ================= MODULE 05: ACCOUNT STATUS ================= */
async function handleAccountStatus(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('account_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('account_status = ?'); binds.push(status); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(full_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR user_uid LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results: users } = await db.prepare(
      `SELECT id, user_uid, full_name, email, role_key, account_status, district_odisha, updated_at
       FROM urc_users ${w} ORDER BY updated_at DESC LIMIT 200`
    ).bind(...binds).all();
    const { results: logs } = await db.prepare(
      `SELECT l.*, u.full_name, u.email, u.user_uid
       FROM urc_account_status_logs l
       JOIN urc_users u ON u.id = l.user_id
       ORDER BY l.created_at DESC LIMIT 50`
    ).all();
    return json({ users: users || [], logs: logs || [] });
  }

  if (sub === 'transition' && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const userId = cleanStr(body.user_id || '', 80);
    const newStatus = pick(body.new_status, URC_ACCOUNT_STATUSES, 'new_status', errors, null);
    const reasonCode = pick(body.reason_code, URC_STATUS_REASON_CODES, 'reason_code', errors, 'admin_manual_review');
    const reasonNote = cleanStr(body.reason_note || '', 400);
    const expiresAt = body.expires_at ? cleanStr(body.expires_at, 40) : null;
    if (!userId) errors.user_id = 'user_id is required';
    if (!newStatus) errors.new_status = 'Valid new_status is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const target = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(userId).first();
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'User not found');

    if ((newStatus === 'suspended' || newStatus === 'blocked') && (target.id === actor.userId || target.email === actor.email)) {
      throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot suspend or block your own active account');
    }
    if ((newStatus === 'suspended' || newStatus === 'blocked') && target.role_key === 'super_admin') {
      throw new HttpError(409, 'PRIMARY_SUPER_ADMIN', 'Primary Super Admin cannot be suspended or blocked');
    }

    await snapshotRevision(db, '01', userId, actor, `status ${target.account_status} -> ${newStatus}`);
    await db.prepare(`UPDATE urc_users SET account_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(newStatus, userId).run();

    const logId = rid('urc-slog');
    await db.prepare(
      `INSERT INTO urc_account_status_logs (id, user_id, previous_status, new_status, reason_code, reason_note, expires_at, changed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(logId, userId, target.account_status, newStatus, reasonCode, reasonNote, expiresAt, actor?.email || actor?.userId || 'admin').run();

    await audit(env, request, actor, 'urc.account_status.transition', 'urc_users', userId, {
      from: target.account_status, to: newStatus, reason_code: reasonCode
    });
    const updatedUser = await db.prepare(
      `SELECT id, user_uid, full_name, email, role_key, account_status, district_odisha, updated_at FROM urc_users WHERE id = ?`
    ).bind(userId).first();
    return json({ ok: true, log_id: logId, user: updatedUser });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 06: REGISTRATIONS ================= */
async function nextRegCode(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM urc_registrations`).first();
  return `REG-2026-${String(Number(row?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleRegistrations(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('approval_status') || '').trim();
    const role = (url.searchParams.get('requested_role') || '').trim();
    const district = (url.searchParams.get('district_odisha') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('approval_status = ?'); binds.push(status); }
    if (role) { where.push('requested_role = ?'); binds.push(role); }
    if (district) { where.push('district_odisha = ?'); binds.push(district); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(full_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR reg_code LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_registrations ${w} ORDER BY CASE approval_status WHEN 'pending_review' THEN 0 ELSE 1 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({
      items: (results || []).map(r => ({ ...r, email_verified: Number(r.email_verified || 0) === 1 })),
      total: (results || []).length
    });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const fullName = cleanStr(body.full_name || '', 120);
    const email = cleanStr(body.email || '', 160).toLowerCase();
    const phone = cleanStr(body.phone || '', 30);
    const district = cleanStr(body.district_odisha || 'Khordha', 80) || 'Khordha';
    const reqRole = pick(body.requested_role, URC_REG_ROLES, 'requested_role', errors, 'student');
    const source = pick(body.signup_source, URC_REG_SOURCES, 'signup_source', errors, 'web_portal');
    const emailVerified = body.email_verified ? 1 : 0;
    const note = cleanStr(body.reviewer_note || '', 300);

    if (!fullName) errors.full_name = 'full_name is required';
    if (!email || !email.includes('@')) errors.email = 'Valid email is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-reg');
    const regCode = await nextRegCode(db);
    await db.prepare(
      `INSERT INTO urc_registrations (id, reg_code, full_name, email, phone, district_odisha, requested_role, signup_source, email_verified, approval_status, reviewer_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)`
    ).bind(newId, regCode, fullName, email, phone, district, reqRole, source, emailVerified, note).run();

    await audit(env, request, actor, 'urc.registration.create', 'urc_registrations', newId, { email, requested_role: reqRole });
    const created = await db.prepare(`SELECT * FROM urc_registrations WHERE id = ?`).bind(newId).first();
    return json({ item: { ...created, email_verified: Number(created.email_verified || 0) === 1 } }, 201);
  }

  if (sub && method === 'PATCH') {
    const reg = await db.prepare(`SELECT * FROM urc_registrations WHERE id = ?`).bind(sub).first();
    if (!reg) throw new HttpError(404, 'NOT_FOUND', 'Registration not found');
    const body = await readJson(request, 15000);
    const action = cleanStr(body.action || '', 20).toLowerCase();
    const note = cleanStr(body.reviewer_note || reg.reviewer_note || '', 300);
    if (action !== 'approve' && action !== 'reject') {
      throw validationError({ action: 'action must be approve or reject' });
    }

    let linkedUserId = reg.linked_user_id || null;
    if (action === 'approve') {
      let userRow = await db.prepare(`SELECT * FROM urc_users WHERE email = ?`).bind(reg.email).first();
      if (!userRow) {
        linkedUserId = rid('urc-u');
        const userUid = await nextUserUid(db);
        await db.prepare(
          `INSERT INTO urc_users (id, user_uid, full_name, email, phone, role_key, account_status, email_verified, district_odisha, preferred_lang)
           VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, 'both')`
        ).bind(linkedUserId, userUid, reg.full_name, reg.email, reg.phone || '', reg.requested_role, reg.district_odisha || 'Khordha').run();

        const handle = '@' + reg.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        const pct = computeProfileCompletion(
          { full_name: reg.full_name, district_odisha: reg.district_odisha },
          { display_handle: handle, academic_stage: reg.requested_role === 'educator' ? 'B.Ed / Teaching' : 'Competitive Aspirant' }
        );
        await db.prepare(
          `INSERT INTO urc_user_profiles (id, user_id, display_handle, academic_stage, profile_visibility, profile_completion_pct, verified_educator)
           VALUES (?, ?, ?, ?, 'public', ?, ?)`
        ).bind(
          rid('urc-p'), linkedUserId, handle,
          reg.requested_role === 'educator' ? 'B.Ed / Teaching' : 'Competitive Aspirant',
          pct, reg.requested_role === 'educator' ? 1 : 0
        ).run();
      } else {
        linkedUserId = userRow.id;
        await db.prepare(
          `UPDATE urc_users SET account_status = 'active', email_verified = 1, role_key = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(reg.requested_role === 'educator' && userRow.role_key === 'student' ? 'educator' : userRow.role_key, linkedUserId).run();
      }
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    await db.prepare(
      `UPDATE urc_registrations
       SET approval_status = ?, linked_user_id = ?, reviewer_note = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(nextStatus, linkedUserId, note, actor?.email || actor?.userId || 'admin', sub).run();

    await audit(env, request, actor, `urc.registration.${action}`, 'urc_registrations', sub, {
      email: reg.email, linked_user_id: linkedUserId
    });
    const updated = await db.prepare(`SELECT * FROM urc_registrations WHERE id = ?`).bind(sub).first();
    return json({ item: { ...updated, email_verified: Number(updated.email_verified || 0) === 1 } });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 07: MEMBERSHIP ACCESS ================= */
const FALLBACK_TIERS = [
  { tier_code: 'free_scholar', tier_name_en: 'Free Scholar', download_quota_daily: 3, mock_test_access_level: 'free_only', duration_days: 365 },
  { tier_code: 'pro_aspirant', tier_name_en: 'Pro Aspirant', download_quota_daily: 25, mock_test_access_level: 'all_mocks', duration_days: 365 },
  { tier_code: 'opsc_elite', tier_name_en: 'OPSC Elite', download_quota_daily: 100, mock_test_access_level: 'all_mocks_plus_mentorship', duration_days: 365 },
  { tier_code: 'institutional', tier_name_en: 'Institutional / Coaching', download_quota_daily: 500, mock_test_access_level: 'all_mocks_plus_mentorship', duration_days: 365 }
];

async function getMembershipTiers(db) {
  try {
    const { results } = await db.prepare(
      `SELECT tier_code, tier_name_en, download_quota_daily, mock_test_access_level, duration_days, price_paise, status
       FROM fin_memberships ORDER BY sort_order ASC`
    ).all();
    if (results && results.length) return results;
  } catch { /* fallback */ }
  return FALLBACK_TIERS;
}

async function nextGrantCode(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM urc_membership_grants`).first();
  return `MEM-2026-${String(Number(row?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleMembershipAccess(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('access_status') || '').trim();
    const tier = (url.searchParams.get('tier_code') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('g.access_status = ?'); binds.push(status); }
    if (tier) { where.push('g.tier_code = ?'); binds.push(tier); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(u.full_name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR g.grant_code LIKE ? ESCAPE '\\' OR g.order_number LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT g.*, u.full_name, u.email, u.user_uid, u.district_odisha
       FROM urc_membership_grants g
       JOIN urc_users u ON u.id = g.user_id
       ${w}
       ORDER BY g.created_at DESC LIMIT 200`
    ).bind(...binds).all();
    const tiers = await getMembershipTiers(db);
    return json({ items: results || [], tiers });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const userId = cleanStr(body.user_id || '', 80);
    const tierCode = pick(body.tier_code, URC_TIER_CODES, 'tier_code', errors, 'pro_aspirant');
    const grantSource = pick(body.grant_source, URC_GRANT_SOURCES, 'grant_source', errors, 'admin_complimentary');
    const orderNumber = cleanStr(body.order_number || '', 60);
    const notes = cleanStr(body.notes || '', 300);
    const durationDays = Math.max(1, Math.min(3650, Number(body.duration_days || 365) || 365));

    if (!userId) errors.user_id = 'user_id is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const userRow = await db.prepare(`SELECT id, full_name FROM urc_users WHERE id = ?`).bind(userId).first();
    if (!userRow) throw new HttpError(404, 'NOT_FOUND', 'User not found');

    const tiers = await getMembershipTiers(db);
    const tierMeta = tiers.find(t => t.tier_code === tierCode) || FALLBACK_TIERS[1];
    const cap = body.daily_download_cap !== undefined ? Math.max(0, Number(body.daily_download_cap) || 0) : Number(tierMeta.download_quota_daily || 25);
    const mockLvl = cleanStr(body.mock_test_access_level || tierMeta.mock_test_access_level || 'all_mocks', 60);
    const tierName = cleanStr(body.tier_name_en || tierMeta.tier_name_en || tierCode, 80);

    const newId = rid('urc-mg');
    const grantCode = await nextGrantCode(db);
    const expiresExpr = body.expires_at ? cleanStr(body.expires_at, 40) : null;

    if (expiresExpr) {
      await db.prepare(
        `INSERT INTO urc_membership_grants (id, grant_code, user_id, tier_code, tier_name_en, grant_source, order_number, daily_download_cap, mock_test_access_level, expires_at, access_status, granted_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      ).bind(newId, grantCode, userId, tierCode, tierName, grantSource, orderNumber, cap, mockLvl, expiresExpr, actor?.email || 'admin', notes).run();
    } else {
      await db.prepare(
        `INSERT INTO urc_membership_grants (id, grant_code, user_id, tier_code, tier_name_en, grant_source, order_number, daily_download_cap, mock_test_access_level, expires_at, access_status, granted_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' days'), 'active', ?, ?)`
      ).bind(newId, grantCode, userId, tierCode, tierName, grantSource, orderNumber, cap, mockLvl, String(durationDays), actor?.email || 'admin', notes).run();
    }

    await snapshotRevision(db, '07', newId, actor, 'grant membership');
    await audit(env, request, actor, 'urc.membership.grant', 'urc_membership_grants', newId, { user_id: userId, tier_code: tierCode });
    const created = await db.prepare(
      `SELECT g.*, u.full_name, u.email, u.user_uid, u.district_odisha
       FROM urc_membership_grants g JOIN urc_users u ON u.id = g.user_id WHERE g.id = ?`
    ).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM urc_membership_grants WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Membership grant not found');
    const body = await readJson(request, 15000);
    const errors = {};

    const tierCode = body.tier_code !== undefined ? pick(body.tier_code, URC_TIER_CODES, 'tier_code', errors, existing.tier_code) : existing.tier_code;
    const accessStatus = body.access_status !== undefined ? pick(body.access_status, URC_ACCESS_STATUSES, 'access_status', errors, existing.access_status) : existing.access_status;
    const notes = body.notes !== undefined ? cleanStr(body.notes, 300) : existing.notes;
    if (Object.keys(errors).length) throw validationError(errors);

    let tierName = existing.tier_name_en;
    let cap = existing.daily_download_cap;
    let mockLvl = existing.mock_test_access_level;
    if (body.tier_code && body.tier_code !== existing.tier_code) {
      const tiers = await getMembershipTiers(db);
      const t = tiers.find(x => x.tier_code === tierCode);
      if (t) {
        tierName = t.tier_name_en;
        cap = Number(t.download_quota_daily || cap);
        mockLvl = t.mock_test_access_level || mockLvl;
      }
    }
    const extendDays = Number(body.extend_days || 0);

    await snapshotRevision(db, '07', sub, actor, body.change_note || 'update membership grant');
    if (extendDays > 0) {
      await db.prepare(
        `UPDATE urc_membership_grants
         SET tier_code = ?, tier_name_en = ?, daily_download_cap = ?, mock_test_access_level = ?, access_status = ?, notes = ?,
             expires_at = datetime(COALESCE(expires_at, datetime('now')), '+' || ? || ' days'), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(tierCode, tierName, cap, mockLvl, accessStatus, notes, String(Math.min(3650, extendDays)), sub).run();
    } else {
      await db.prepare(
        `UPDATE urc_membership_grants
         SET tier_code = ?, tier_name_en = ?, daily_download_cap = ?, mock_test_access_level = ?, access_status = ?, notes = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(tierCode, tierName, cap, mockLvl, accessStatus, notes, sub).run();
    }

    await audit(env, request, actor, 'urc.membership.update', 'urc_membership_grants', sub, { tier_code: tierCode, access_status: accessStatus });
    const updated = await db.prepare(
      `SELECT g.*, u.full_name, u.email, u.user_uid, u.district_odisha
       FROM urc_membership_grants g JOIN urc_users u ON u.id = g.user_id WHERE g.id = ?`
    ).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_membership_grants WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Membership grant not found');
    await snapshotRevision(db, '07', sub, actor, 'revoke membership grant');
    await db.prepare(`UPDATE urc_membership_grants SET access_status = 'revoked', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.membership.revoke', 'urc_membership_grants', sub, { grant_code: existing.grant_code });
    return json({ ok: true, id: sub, access_status: 'revoked' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 08: COMMUNITY POSTS ================= */
function decoratePost(row) {
  if (!row) return row;
  return {
    ...row,
    is_pinned: Number(row.is_pinned || 0) === 1,
    featured: Number(row.featured || 0) === 1,
    upvotes_count: Number(row.upvotes_count || 0),
    replies_count: Number(row.replies_count || 0)
  };
}

async function handleCommunityPosts(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('status') || '').trim();
    const postType = (url.searchParams.get('post_type') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('status = ?'); binds.push(status); }
    if (postType) { where.push('post_type = ?'); binds.push(postType); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\' OR exam_tag LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_community_posts ${w} ORDER BY is_pinned DESC, featured DESC, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decoratePost), total: (results || []).length });
  }

  if (sub === 'bulk-status' && (method === 'PATCH' || method === 'POST')) {
    const body = await readJson(request, 20000);
    const ids = Array.isArray(body.ids) ? body.ids.map(x => cleanStr(x, 80)).filter(Boolean) : [];
    const errors = {};
    const status = pick(body.status, URC_POST_STATUSES, 'status', errors, null);
    if (!ids.length) errors.ids = 'Select at least one post';
    if (!status) errors.status = 'Valid status is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let updated = 0;
    for (const pid of ids) {
      await snapshotRevision(db, '08', pid, actor, `bulk status -> ${status}`);
      await db.prepare(`UPDATE urc_community_posts SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, pid).run();
      updated++;
    }
    await audit(env, request, actor, 'urc.community_posts.bulk_status', 'urc_community_posts', ids.join(','), { status, updated });
    return json({ ok: true, updated, status });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 40000);
    const errors = {};
    const titleEn = cleanStr(body.title_en || '', 200);
    const titleOr = cleanStr(body.title_or || '', 240);
    const bodyEn = cleanStr(body.body_en || '', 4000);
    const bodyOr = cleanStr(body.body_or || '', 4000);
    const postType = pick(body.post_type, URC_POST_TYPES, 'post_type', errors, 'study_discussion');
    const status = pick(body.status, URC_POST_STATUSES, 'status', errors, 'draft');
    const examTag = cleanStr(body.exam_tag || 'OPSC OAS', 80);
    const districtTag = cleanStr(body.district_tag || 'Khordha', 80);
    const isPinned = body.is_pinned ? 1 : 0;
    const featured = body.featured ? 1 : 0;

    if (!titleEn) errors.title_en = 'title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let authorId = cleanStr(body.author_user_id || '', 80);
    let authorName = cleanStr(body.author_name || '', 120);
    let authorBadge = cleanStr(body.author_badge || '', 80);
    if (authorId) {
      const u = await db.prepare(`SELECT id, full_name FROM urc_users WHERE id = ?`).bind(authorId).first();
      if (u && !authorName) authorName = u.full_name;
    } else {
      const firstU = await db.prepare(`SELECT id, full_name FROM urc_users WHERE email = ? OR id = ? LIMIT 1`).bind(actor?.email || '', actor?.userId || '').first()
        || await db.prepare(`SELECT id, full_name FROM urc_users ORDER BY created_at ASC LIMIT 1`).first();
      authorId = firstU?.id || 'urc-u-001';
      if (!authorName) authorName = firstU?.full_name || 'CS Odisha Editorial';
    }

    const baseSlug = slugify(body.slug || titleEn);
    const dupSlug = await db.prepare(`SELECT id FROM urc_community_posts WHERE slug = ?`).bind(baseSlug).first();
    const slug = dupSlug ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;

    const newId = rid('urc-post');
    await db.prepare(
      `INSERT INTO urc_community_posts (id, slug, post_type, author_user_id, author_name, author_badge, title_en, title_or, body_en, body_or, exam_tag, district_tag, is_pinned, featured, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, slug, postType, authorId, authorName, authorBadge, titleEn, titleOr, bodyEn, bodyOr, examTag, districtTag, isPinned, featured, status).run();

    await snapshotRevision(db, '08', newId, actor, 'create community post');
    await audit(env, request, actor, 'urc.community_post.create', 'urc_community_posts', newId, { slug, status });
    const created = await db.prepare(`SELECT * FROM urc_community_posts WHERE id = ?`).bind(newId).first();
    return json({ item: decoratePost(created) }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_community_posts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community post not found');
    const body = await readJson(request, 40000);
    const errors = {};

    const titleEn = body.title_en !== undefined ? cleanStr(body.title_en, 200) : existing.title_en;
    const titleOr = body.title_or !== undefined ? cleanStr(body.title_or, 240) : existing.title_or;
    const bodyEn = body.body_en !== undefined ? cleanStr(body.body_en, 4000) : existing.body_en;
    const bodyOr = body.body_or !== undefined ? cleanStr(body.body_or, 4000) : existing.body_or;
    const postType = body.post_type !== undefined ? pick(body.post_type, URC_POST_TYPES, 'post_type', errors, existing.post_type) : existing.post_type;
    const status = body.status !== undefined ? pick(body.status, URC_POST_STATUSES, 'status', errors, existing.status) : existing.status;
    const examTag = body.exam_tag !== undefined ? cleanStr(body.exam_tag, 80) : existing.exam_tag;
    const districtTag = body.district_tag !== undefined ? cleanStr(body.district_tag, 80) : existing.district_tag;
    const isPinned = body.is_pinned !== undefined ? (body.is_pinned ? 1 : 0) : existing.is_pinned;
    const featured = body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured;

    if (!titleEn) errors.title_en = 'title_en cannot be empty';
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotRevision(db, '08', sub, actor, body.change_note || 'update community post');
    await db.prepare(
      `UPDATE urc_community_posts
       SET title_en = ?, title_or = ?, body_en = ?, body_or = ?, post_type = ?, status = ?, exam_tag = ?, district_tag = ?, is_pinned = ?, featured = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(titleEn, titleOr, bodyEn, bodyOr, postType, status, examTag, districtTag, isPinned, featured, sub).run();

    await audit(env, request, actor, 'urc.community_post.update', 'urc_community_posts', sub, { status, is_pinned: isPinned, featured });
    const updated = await db.prepare(`SELECT * FROM urc_community_posts WHERE id = ?`).bind(sub).first();
    return json({ item: decoratePost(updated) });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_community_posts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community post not found');
    await snapshotRevision(db, '08', sub, actor, 'archive community post');
    await db.prepare(`UPDATE urc_community_posts SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.community_post.archive', 'urc_community_posts', sub, { slug: existing.slug });
    return json({ ok: true, id: sub, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/** Public cached endpoint: GET /api/community/posts */
export async function handlePublicCommunityPostsApi(request, env) {
  if (!env || !env.DB) return json({ items: [] });
  await ensureUsersCommunityBatch2Schema(env.DB);
  const url = new URL(request.url);
  const postType = (url.searchParams.get('post_type') || '').trim();
  const examTag = (url.searchParams.get('exam_tag') || '').trim();
  const district = (url.searchParams.get('district_tag') || '').trim();
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const where = [`status = 'published'`];
  const binds = [];
  if (postType) { where.push('post_type = ?'); binds.push(postType); }
  if (examTag) { where.push('exam_tag = ?'); binds.push(examTag); }
  if (district) { where.push('district_tag = ?'); binds.push(district); }
  if (q) {
    const l = likeEscape(q);
    where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR body_en LIKE ? ESCAPE '\\')`);
    binds.push(l, l, l);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, slug, post_type, author_name, author_badge, title_en, title_or, body_en, body_or,
            exam_tag, district_tag, upvotes_count, replies_count, is_pinned, featured, created_at
     FROM urc_community_posts
     WHERE ${where.join(' AND ')}
     ORDER BY is_pinned DESC, featured DESC, created_at DESC
     LIMIT 60`
  ).bind(...binds).all();
  return json({ items: (results || []).map(decoratePost) }, 200, {
    'Cache-Control': 'public, max-age=120'
  });
}

export async function handleUsersCommunityBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureUsersCommunityBatch2Schema(env.DB);
  if (id === 'account-status') return handleAccountStatus(request, env, actor, sub, extra);
  if (id === 'registrations') return handleRegistrations(request, env, actor, sub, extra);
  if (id === 'membership-access') return handleMembershipAccess(request, env, actor, sub, extra);
  if (id === 'community-posts') return handleCommunityPosts(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown users & community batch 2 route');
}
