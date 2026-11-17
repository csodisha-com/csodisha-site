// Users, Roles & Community Batch 1 (v96): Modules 01-04
// 01 All Users | 02 User Profiles | 03 Roles & Permissions | 04 Admin Accounts
// Never expose password hashes, salts, or session tokens in any response.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const URC_BASE_ROLES = ['super_admin', 'admin', 'moderator', 'educator', 'student'];
export const URC_ADMIN_ROLES = ['super_admin', 'admin', 'moderator', 'educator'];
export const URC_ACCOUNT_STATUSES = ['active', 'pending_verification', 'suspended', 'blocked'];
export const URC_PREF_LANGS = ['en', 'or', 'both'];
export const URC_ACADEMIC_STAGES = [
  'Class 6-10',
  'Higher Secondary +2',
  'Undergraduate',
  'Postgraduate',
  'B.Ed / Teaching',
  'Competitive Aspirant'
];
export const URC_PROFILE_VISIBILITIES = ['public', 'community_only', 'private'];
export const URC_ADMIN_STATUSES = ['active', 'suspended'];
export const URC_DOMAINS = [
  'edu_resources',
  'nav_cms',
  'media_cloud',
  'payments_finance',
  'users_community',
  'system_ops'
];
export const URC_CAPABILITIES = ['view', 'create', 'edit', 'delete', 'publish'];
export const ODISHA_DISTRICTS = [
  'Khordha', 'Balasore', 'Cuttack', 'Sambalpur', 'Ganjam', 'Puri', 'Mayurbhanj',
  'Sundargarh', 'Kendrapara', 'Jajpur', 'Bhadrak', 'Angul', 'Koraput', 'Kalahandi', 'Bolangir'
];

const _urc1Ready = new WeakSet();

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

function stripSensitive(row) {
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

function decorateUser(row) {
  if (!row) return row;
  const out = stripSensitive(row);
  out.email_verified = Number(row.email_verified || 0) === 1;
  out.login_count = Number(row.login_count || 0);
  return out;
}

function decorateProfile(row) {
  if (!row) return row;
  const out = stripSensitive(row);
  out.target_exams = parseJson(row.target_exams_json, []);
  out.verified_educator = Number(row.verified_educator || 0) === 1;
  out.profile_completion_pct = Number(row.profile_completion_pct || 0);
  return out;
}

function decorateRole(row) {
  if (!row) return row;
  const out = stripSensitive(row);
  out.permissions = parseJson(row.permissions_json, {});
  out.is_system_role = Number(row.is_system_role || 0) === 1;
  out.priority_rank = Number(row.priority_rank || 10);
  return out;
}

function decorateAdmin(row) {
  if (!row) return row;
  const out = stripSensitive(row);
  out.mfa_enforced = Number(row.mfa_enforced || 0) === 1;
  out.session_timeout_mins = Number(row.session_timeout_mins || 60);
  return out;
}

/** Deterministic profile completeness score (0-100) for Module 02. */
export function computeProfileCompletion(user, profile) {
  let score = 0;
  const fullName = cleanStr(user?.full_name || profile?.full_name || '', 120);
  const district = cleanStr(user?.district_odisha || profile?.district_odisha || '', 80);
  const handle = cleanStr(profile?.display_handle || '', 80);
  const bioEn = cleanStr(profile?.bio_en || '', 600);
  const bioOr = cleanStr(profile?.bio_or || '', 600);
  const stage = cleanStr(profile?.academic_stage || '', 80);
  const inst = cleanStr(profile?.institution_name || '', 120);
  const avatarOrBadge = cleanStr(profile?.avatar_url || profile?.badge_label || '', 200);
  const exams = Array.isArray(profile?.target_exams)
    ? profile.target_exams
    : parseJson(profile?.target_exams_json, []);

  if (fullName) score += 15;
  if (handle) score += 10;
  if (bioEn) score += 15;
  if (bioOr) score += 10;
  if (stage) score += 10;
  if (Array.isArray(exams) && exams.length > 0) score += 15;
  if (inst) score += 10;
  if (district) score += 10;
  if (avatarOrBadge) score += 5;
  return Math.min(100, Math.max(0, score));
}

function makeFullMatrix(val = true) {
  const m = {};
  for (const d of URC_DOMAINS) {
    m[d] = {};
    for (const c of URC_CAPABILITIES) m[d][c] = val;
  }
  return m;
}

function normalizePermissions(raw) {
  const input = parseJson(raw, {});
  const out = {};
  for (const d of URC_DOMAINS) {
    const src = input && typeof input[d] === 'object' ? input[d] : {};
    out[d] = {};
    for (const c of URC_CAPABILITIES) {
      out[d][c] = Boolean(src[c]);
    }
  }
  return out;
}

function hasAllSuperAdminCorePerms(matrix) {
  for (const d of URC_DOMAINS) {
    for (const c of URC_CAPABILITIES) {
      if (!matrix[d] || matrix[d][c] !== true) return false;
    }
  }
  return true;
}

export const REV_TABLES = {
  '01': {
    table: 'urc_users',
    cols: ['user_uid', 'full_name', 'email', 'phone', 'role_key', 'account_status', 'email_verified', 'district_odisha', 'preferred_lang', 'last_login_at', 'login_count']
  },
  '02': {
    table: 'urc_user_profiles',
    cols: ['user_id', 'display_handle', 'bio_en', 'bio_or', 'academic_stage', 'target_exams_json', 'institution_name', 'avatar_url', 'badge_label', 'profile_visibility', 'profile_completion_pct', 'verified_educator']
  },
  '03': {
    table: 'urc_roles',
    cols: ['role_key', 'role_name_en', 'role_name_or', 'description_en', 'description_or', 'permissions_json', 'is_system_role', 'priority_rank', 'status']
  },
  '04': {
    table: 'urc_admin_accounts',
    cols: ['user_id', 'admin_code', 'full_name', 'email', 'admin_role_key', 'department_label', 'mfa_enforced', 'ip_allowlist_hint', 'session_timeout_mins', 'last_active_at', 'status']
  }
};

export async function snapshotRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM urc_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('urc-rev');
  await db.prepare(
    `INSERT INTO urc_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(stripSensitive(row)), cleanStr(changeNote, 200), actor?.email || actor?.userId || 'system').run();
  return { id: revId, version_num: nextVer };
}

export async function nextUserUid(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM urc_users`).first();
  const seq = Number(row?.n || 0) + 1;
  return `USR-2026-${String(seq).padStart(4, '0')}`;
}

async function nextAdminCode(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM urc_admin_accounts`).first();
  const seq = Number(row?.n || 0) + 1;
  return `ADM-${String(seq).padStart(3, '0')}`;
}

/** Bridge existing auth `users` (and `candidates` if present) into `urc_users` without exposing secrets. */
async function bridgeAuthUsers(db) {
  let rows = [];
  try {
    const res = await db.prepare(
      `SELECT u.id, u.email, u.role, u.created_at,
              c.full_name AS cand_name, c.phone AS cand_phone, c.district AS cand_district, c.last_login_at AS cand_last_login
       FROM users u LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email`
    ).all();
    rows = res?.results || [];
  } catch {
    try {
      const res = await db.prepare(`SELECT id, email, role FROM users`).all();
      rows = res?.results || [];
    } catch {
      return;
    }
  }
  for (const r of rows) {
    if (!r || !r.email) continue;
    const existing = await db.prepare(`SELECT id FROM urc_users WHERE id = ? OR email = ?`).bind(r.id, r.email).first();
    if (existing) continue;
    const mappedRole = r.role === 'admin' ? 'admin' : r.role === 'editor' ? 'moderator' : 'student';
    const uid = await nextUserUid(db);
    const fullName = cleanStr(r.cand_name || r.email.split('@')[0], 120) || 'CS Odisha User';
    const district = cleanStr(r.cand_district || 'Khordha', 80) || 'Khordha';
    const phone = cleanStr(r.cand_phone || '', 30);
    await db.prepare(
      `INSERT INTO urc_users (id, user_uid, full_name, email, phone, role_key, account_status, email_verified, district_odisha, preferred_lang, last_login_at, login_count)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, 'both', ?, 1)`
    ).bind(r.id, uid, fullName, r.email, phone, mappedRole, district, r.cand_last_login || null).run();

    const profId = rid('urc-prof');
    const handle = '@' + r.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const pct = computeProfileCompletion({ full_name: fullName, district_odisha: district }, { display_handle: handle, academic_stage: 'Competitive Aspirant' });
    await db.prepare(
      `INSERT OR IGNORE INTO urc_user_profiles (id, user_id, display_handle, academic_stage, profile_visibility, profile_completion_pct)
       VALUES (?, ?, ?, 'Competitive Aspirant', 'public', ?)`
    ).bind(profId, r.id, handle, pct).run();

    if (mappedRole === 'admin' || mappedRole === 'moderator') {
      const admCode = await nextAdminCode(db);
      await db.prepare(
        `INSERT OR IGNORE INTO urc_admin_accounts (id, user_id, admin_code, full_name, email, admin_role_key, department_label, mfa_enforced, session_timeout_mins, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Platform Administration', 1, 60, 'active')`
      ).bind(rid('urc-adm'), r.id, admCode, fullName, r.email, mappedRole).run();
    }
  }
}

export async function ensureUsersCommunityBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_urc1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS urc_users (
      id TEXT PRIMARY KEY,
      user_uid TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      role_key TEXT NOT NULL DEFAULT 'student',
      account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending_verification', 'suspended', 'blocked')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      preferred_lang TEXT NOT NULL DEFAULT 'both' CHECK (preferred_lang IN ('en', 'or', 'both')),
      last_login_at TEXT,
      login_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_users_role_status ON urc_users(role_key, account_status, district_odisha)`,
    `CREATE TABLE IF NOT EXISTS urc_user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      display_handle TEXT NOT NULL DEFAULT '',
      bio_en TEXT NOT NULL DEFAULT '',
      bio_or TEXT NOT NULL DEFAULT '',
      academic_stage TEXT NOT NULL DEFAULT 'Competitive Aspirant' CHECK (academic_stage IN ('Class 6-10', 'Higher Secondary +2', 'Undergraduate', 'Postgraduate', 'B.Ed / Teaching', 'Competitive Aspirant')),
      target_exams_json TEXT NOT NULL DEFAULT '[]',
      institution_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      badge_label TEXT NOT NULL DEFAULT '',
      profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'community_only', 'private')),
      profile_completion_pct INTEGER NOT NULL DEFAULT 0,
      verified_educator INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_profiles_vis ON urc_user_profiles(verified_educator, profile_visibility, profile_completion_pct DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_roles (
      id TEXT PRIMARY KEY,
      role_key TEXT NOT NULL UNIQUE,
      role_name_en TEXT NOT NULL,
      role_name_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      permissions_json TEXT NOT NULL DEFAULT '{}',
      is_system_role INTEGER NOT NULL DEFAULT 0,
      priority_rank INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_roles_rank ON urc_roles(priority_rank ASC, status)`,
    `CREATE TABLE IF NOT EXISTS urc_admin_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      admin_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      admin_role_key TEXT NOT NULL DEFAULT 'admin' CHECK (admin_role_key IN ('super_admin', 'admin', 'moderator', 'educator')),
      department_label TEXT NOT NULL DEFAULT 'Platform Operations',
      mfa_enforced INTEGER NOT NULL DEFAULT 1,
      ip_allowlist_hint TEXT NOT NULL DEFAULT '',
      session_timeout_mins INTEGER NOT NULL DEFAULT 60,
      last_active_at TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_admins_role_status ON urc_admin_accounts(admin_role_key, status)`,
    `CREATE TABLE IF NOT EXISTS urc_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_rev_lookup ON urc_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed 5-tier RBAC roles if empty
  const roleCount = await db.prepare(`SELECT COUNT(*) AS n FROM urc_roles`).first();
  if (Number(roleCount?.n || 0) === 0) {
    const adminMatrix = makeFullMatrix(true);
    adminMatrix.system_ops.delete = false;
    const modMatrix = {
      edu_resources: { view: true, create: true, edit: true, delete: false, publish: true },
      nav_cms: { view: true, create: true, edit: true, delete: false, publish: false },
      media_cloud: { view: true, create: true, edit: true, delete: false, publish: true },
      payments_finance: { view: true, create: false, edit: false, delete: false, publish: false },
      users_community: { view: true, create: false, edit: true, delete: false, publish: true },
      system_ops: { view: false, create: false, edit: false, delete: false, publish: false }
    };
    const eduMatrix = {
      edu_resources: { view: true, create: true, edit: true, delete: false, publish: false },
      nav_cms: { view: true, create: false, edit: false, delete: false, publish: false },
      media_cloud: { view: true, create: true, edit: false, delete: false, publish: false },
      payments_finance: { view: false, create: false, edit: false, delete: false, publish: false },
      users_community: { view: true, create: true, edit: false, delete: false, publish: false },
      system_ops: { view: false, create: false, edit: false, delete: false, publish: false }
    };
    const studentMatrix = makeFullMatrix(false);
    studentMatrix.edu_resources.view = true;
    studentMatrix.users_community.view = true;

    const rolesSeed = [
      ['role-super-admin', 'super_admin', 'Super Admin', 'ସୁପର ଆଡମିନ୍', 'Full unrestricted authority across all 6 Admin Command domains.', 'ସମସ୍ତ ୬ଟି ଆଡମିନ୍ ଡୋମେନ୍ ଉପରେ ସମ୍ପୂର୍ଣ୍ଣ ଅଧିକାର।', makeFullMatrix(true), 1, 1],
      ['role-admin', 'admin', 'Platform Admin', 'ପ୍ଲାଟଫର୍ମ ଆଡମିନ୍', 'Manages users, content, media, and finance operations.', 'ବ୍ୟବହାରକାରୀ, ବିଷୟବସ୍ତୁ, ମିଡିଆ ଏବଂ ଅର୍ଥ ପରିଚାଳନା।', adminMatrix, 1, 2],
      ['role-moderator', 'moderator', 'Content Moderator', 'ବିଷୟବସ୍ତୁ ମଡରେଟର୍', 'Reviews community posts, study notes, and user reports.', 'କମ୍ୟୁନିଟି ପୋଷ୍ଟ ଏବଂ ରିପୋର୍ଟ ସମୀକ୍ଷା।', modMatrix, 1, 3],
      ['role-educator', 'educator', 'Verified Educator', 'ଯାଞ୍ଚିତ ଶିକ୍ଷକ', 'Creates OPSC/OSSC study materials, PYQs, and mock sets.', 'OPSC/OSSC ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଏବଂ ମକ୍ ଟେଷ୍ଟ ପ୍ରସ୍ତୁତକାରୀ।', eduMatrix, 1, 4],
      ['role-student', 'student', 'Student / Aspirant', 'ଛାତ୍ର / ପରୀକ୍ଷାର୍ଥୀ', 'Standard learner access to study library and community forums.', 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ ଏବଂ ଫୋରମ୍ ପ୍ରବେଶ।', studentMatrix, 1, 5]
    ];
    for (const [id, rk, rnEn, rnOr, dEn, dOr, perms, sys, rank] of rolesSeed) {
      await db.prepare(
        `INSERT INTO urc_roles (id, role_key, role_name_en, role_name_or, description_en, description_or, permissions_json, is_system_role, priority_rank, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
      ).bind(id, rk, rnEn, rnOr, dEn, dOr, JSON.stringify(perms), sys, rank).run();
    }
  }

  // Seed Odisha starter users, profiles, and admin accounts if empty
  const userCount = await db.prepare(`SELECT COUNT(*) AS n FROM urc_users`).first();
  if (Number(userCount?.n || 0) === 0) {
    const starterUsers = [
      {
        id: 'urc-u-001', uid: 'USR-2026-0001', name: 'Rajesh Behera', email: 'founder@csodisha.com',
        phone: '+91-9437000101', role: 'super_admin', status: 'active', verified: 1,
        district: 'Balasore', lang: 'both', logins: 142,
        handle: '@rajesh_csodisha', bio_en: 'Founder & Chief Architect of Common Sense Odisha.',
        bio_or: 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶାର ପ୍ରତିଷ୍ଠାତା ଏବଂ ମୁଖ୍ୟ ସ୍ଥପତି।',
        stage: 'Postgraduate', exams: ['OPSC OAS', 'UGC NET'], inst: 'Fakir Mohan University, Balasore',
        badge: 'Founder · Super Admin', vis: 'public', verEdu: 1,
        admCode: 'ADM-001', dept: 'Executive & Platform Security', mfa: 1, ipHint: '103.21.0.0/16', timeout: 60
      },
      {
        id: 'urc-u-002', uid: 'USR-2026-0002', name: 'Subhashree Mohanty', email: 'moderator@csodisha.com',
        phone: '+91-9437000102', role: 'moderator', status: 'active', verified: 1,
        district: 'Khordha', lang: 'both', logins: 64,
        handle: '@subhashree_mod', bio_en: 'Odia & English Editorial Moderator for OPSC/OSSC resources.',
        bio_or: 'OPSC/OSSC ବିଷୟବସ୍ତୁ ପାଇଁ ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀ ସମ୍ପାଦକୀୟ ମଡରେଟର୍।',
        stage: 'Postgraduate', exams: ['OPSC OAS', 'OSSC CGL'], inst: 'Utkal University, Bhubaneswar',
        badge: 'Senior Moderator', vis: 'public', verEdu: 1,
        admCode: 'ADM-002', dept: 'Editorial & Community Trust', mfa: 1, ipHint: '49.36.0.0/16', timeout: 45
      },
      {
        id: 'urc-u-003', uid: 'USR-2026-0003', name: 'Prof. Biswajit Panigrahi', email: 'educator@csodisha.com',
        phone: '+91-9437000103', role: 'educator', status: 'active', verified: 1,
        district: 'Cuttack', lang: 'both', logins: 38,
        handle: '@prof_biswajit', bio_en: 'Odisha History, Polity & OPSC Mains Answer Writing Mentor.',
        bio_or: 'ଓଡ଼ିଶା ଇତିହାସ, ରାଜନୀତି ଏବଂ OPSC ମେନ୍ସ ଉତ୍ତର ଲେଖା ପରାମର୍ଶଦାତା।',
        stage: 'B.Ed / Teaching', exams: ['OPSC OAS', 'OAVS', 'OSSTET'], inst: 'Ravenshaw University, Cuttack',
        badge: 'Verified Educator', vis: 'public', verEdu: 1,
        admCode: 'ADM-003', dept: 'Odisha Academic Faculty', mfa: 1, ipHint: '', timeout: 90
      },
      {
        id: 'urc-u-004', uid: 'USR-2026-0004', name: 'Ananya Senapati', email: 'ananya.balasore@example.in',
        phone: '+91-9861000201', role: 'student', status: 'active', verified: 1,
        district: 'Balasore', lang: 'both', logins: 19,
        handle: '@ananya_oas', bio_en: 'Preparing for OPSC OAS 2026 & OSSC CGL.',
        bio_or: 'OPSC OAS ୨୦୨୬ ଏବଂ OSSC CGL ପାଇଁ ପ୍ରସ୍ତୁତି।',
        stage: 'Competitive Aspirant', exams: ['OPSC OAS', 'OSSC CGL'], inst: 'FM Autonomous College, Balasore',
        badge: 'OAS Aspirant', vis: 'public', verEdu: 0
      },
      {
        id: 'urc-u-005', uid: 'USR-2026-0005', name: 'Debasis Pradhan', email: 'debasis.khordha@example.in',
        phone: '+91-9861000202', role: 'student', status: 'pending_verification', verified: 0,
        district: 'Khordha', lang: 'en', logins: 2,
        handle: '@debasis_k', bio_en: 'B.Sc Undergraduate aiming for OSSSC RI & Amin.',
        bio_or: '', stage: 'Undergraduate', exams: ['OSSSC RI', 'OSSSC Amin'], inst: 'BJB Autonomous College, Bhubaneswar',
        badge: '', vis: 'community_only', verEdu: 0
      },
      {
        id: 'urc-u-006', uid: 'USR-2026-0006', name: 'Smita Naik', email: 'smita.cuttack@example.in',
        phone: '+91-9861000203', role: 'student', status: 'active', verified: 1,
        district: 'Cuttack', lang: 'or', logins: 11,
        handle: '@smita_bed', bio_en: 'B.Ed Trainee preparing for OTET and OSSTET.',
        bio_or: 'OTET ଏବଂ OSSTET ପାଇଁ ପ୍ରସ୍ତୁତ ହେଉଥିବା B.Ed ଛାତ୍ରୀ।',
        stage: 'B.Ed / Teaching', exams: ['OTET', 'OSSTET'], inst: 'Radhanath IASE, Cuttack',
        badge: 'Teaching Aspirant', vis: 'public', verEdu: 0
      }
    ];

    for (const u of starterUsers) {
      await db.prepare(
        `INSERT INTO urc_users (id, user_uid, full_name, email, phone, role_key, account_status, email_verified, district_odisha, preferred_lang, last_login_at, login_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
      ).bind(u.id, u.uid, u.name, u.email, u.phone, u.role, u.status, u.verified, u.district, u.lang, u.logins).run();

      const pct = computeProfileCompletion(
        { full_name: u.name, district_odisha: u.district },
        {
          display_handle: u.handle, bio_en: u.bio_en, bio_or: u.bio_or,
          academic_stage: u.stage, target_exams: u.exams,
          institution_name: u.inst, badge_label: u.badge
        }
      );
      await db.prepare(
        `INSERT INTO urc_user_profiles (id, user_id, display_handle, bio_en, bio_or, academic_stage, target_exams_json, institution_name, badge_label, profile_visibility, profile_completion_pct, verified_educator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `urc-p-${u.id.slice(-3)}`, u.id, u.handle, u.bio_en, u.bio_or, u.stage,
        JSON.stringify(u.exams), u.inst, u.badge, u.vis, pct, u.verEdu
      ).run();

      if (u.admCode) {
        await db.prepare(
          `INSERT INTO urc_admin_accounts (id, user_id, admin_code, full_name, email, admin_role_key, department_label, mfa_enforced, ip_allowlist_hint, session_timeout_mins, last_active_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'active')`
        ).bind(
          `urc-a-${u.id.slice(-3)}`, u.id, u.admCode, u.name, u.email,
          u.role, u.dept, u.mfa, u.ipHint, u.timeout
        ).run();
      }
    }
  }

  // Bridge any existing auth users if present
  await bridgeAuthUsers(db);
  _urc1Ready.add(db);
}

/** Module 01-19 Overview KPIs */
export async function getUsersOverview(db) {
  const [tot, act, pend, susp, verEdu, admAct, rolesCnt] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM urc_users`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM urc_users WHERE account_status = 'active'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM urc_users WHERE account_status = 'pending_verification'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM urc_users WHERE account_status IN ('suspended', 'blocked')`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM urc_user_profiles WHERE verified_educator = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM urc_admin_accounts WHERE status = 'active'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM urc_roles WHERE status = 'active'`).first()
  ]);
  const { results: districts } = await db.prepare(
    `SELECT district_odisha, COUNT(*) AS count FROM urc_users GROUP BY district_odisha ORDER BY count DESC LIMIT 12`
  ).all();
  const { results: roles } = await db.prepare(
    `SELECT role_key, COUNT(*) AS count FROM urc_users GROUP BY role_key ORDER BY count DESC`
  ).all();

  let statusLogsCount = 0;
  let pendingRegs = 0;
  let totalRegs = 0;
  let activeGrants = 0;
  let publishedPosts = 0;
  let totalPosts = 0;
  let b2Active = false;
  try {
    const [sl, pr, tr, ag, pp, tp] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS n FROM urc_account_status_logs`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_registrations WHERE approval_status = 'pending_review'`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_registrations`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_membership_grants WHERE access_status IN ('active', 'expiring_soon')`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_community_posts WHERE status = 'published'`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_community_posts`).first()
    ]);
    statusLogsCount = Number(sl?.n || 0);
    pendingRegs = Number(pr?.n || 0);
    totalRegs = Number(tr?.n || 0);
    activeGrants = Number(ag?.n || 0);
    publishedPosts = Number(pp?.n || 0);
    totalPosts = Number(tp?.n || 0);
    b2Active = true;
  } catch { /* Batch 2 tables not yet initialized */ }

  let pubComments = 0;
  let pendingMod = 0;
  let openReports = 0;
  let activeBlocks = 0;
  let b3Active = false;
  try {
    const [pc, pm, orpt, ab] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS n FROM urc_comments WHERE status = 'published'`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_moderation_queue WHERE decision_status = 'pending'`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_user_reports WHERE report_status IN ('open', 'investigating')`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_blocked_accounts WHERE block_status = 'active'`).first()
    ]);
    pubComments = Number(pc?.n || 0);
    pendingMod = Number(pm?.n || 0);
    openReports = Number(orpt?.n || 0);
    activeBlocks = Number(ab?.n || 0);
    b3Active = true;
  } catch { /* Batch 3 tables not yet initialized */ }

  const totalUsers = Number(tot?.n || 0);
  const activeAdmins = Number(admAct?.n || 0);
  const totalRoles = Number(rolesCnt?.n || 0);
  const modules = {};
  for (let i = 1; i <= 19; i++) {
    const k = String(i).padStart(2, '0');
    const active = i <= 4 || (b2Active && i <= 8) || (b3Active && i <= 12);
    let count = 0;
    if (i === 1 || i === 2) count = totalUsers;
    else if (i === 3) count = totalRoles;
    else if (i === 4) count = activeAdmins;
    else if (i === 5) count = statusLogsCount;
    else if (i === 6) count = totalRegs;
    else if (i === 7) count = activeGrants;
    else if (i === 8) count = totalPosts;
    else if (i === 9) count = pubComments;
    else if (i === 10) count = pendingMod;
    else if (i === 11) count = openReports;
    else if (i === 12) count = activeBlocks;
    modules[k] = { status: active ? 'active' : 'queued', count };
  }
  return {
    total_users: totalUsers,
    active_users: Number(act?.n || 0),
    pending_verifications: Number(pend?.n || 0),
    suspended_or_blocked: Number(susp?.n || 0),
    verified_educators: Number(verEdu?.n || 0),
    active_admins: activeAdmins,
    total_roles: totalRoles,
    status_transitions_count: statusLogsCount,
    pending_registrations: pendingRegs,
    active_membership_grants: activeGrants,
    published_community_posts: publishedPosts,
    published_comments_count: pubComments,
    pending_moderation_count: pendingMod,
    open_user_reports_count: openReports,
    active_blocked_accounts_count: activeBlocks,
    district_breakdown: districts || [],
    role_breakdown: roles || [],
    modules
  };
}

/** Module 01: All Users (/api/admin/users/directory) */
async function handleDirectory(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const roleKey = (url.searchParams.get('role_key') || '').trim();
    const status = (url.searchParams.get('account_status') || '').trim();
    const district = (url.searchParams.get('district_odisha') || '').trim();
    const where = [];
    const binds = [];
    if (q) {
      const l = likeEscape(q);
      where.push(`(full_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR user_uid LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR district_odisha LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l, l);
    }
    if (roleKey) { where.push('role_key = ?'); binds.push(roleKey); }
    if (status) { where.push('account_status = ?'); binds.push(status); }
    if (district) { where.push('district_odisha = ?'); binds.push(district); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT id, user_uid, full_name, email, phone, role_key, account_status, email_verified, district_odisha, preferred_lang, last_login_at, login_count, created_at, updated_at
       FROM urc_users ${w} ORDER BY created_at DESC, user_uid ASC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateUser), total: (results || []).length });
  }

  if (sub === 'bulk-status' && (method === 'PATCH' || method === 'POST')) {
    const body = await readJson(request, 20000);
    const ids = Array.isArray(body.ids) ? body.ids.map(x => cleanStr(x, 80)).filter(Boolean) : [];
    const errors = {};
    const status = pick(body.account_status, URC_ACCOUNT_STATUSES, 'account_status', errors, null);
    if (!ids.length) errors.ids = 'Select at least one user';
    if (!status) errors.account_status = 'Valid account_status is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let updated = 0;
    for (const uid of ids) {
      const target = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(uid).first();
      if (!target) continue;
      if ((status === 'suspended' || status === 'blocked') && (target.id === actor.userId || target.email === actor.email)) {
        throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot suspend or block your own active account');
      }
      if ((status === 'suspended' || status === 'blocked') && target.role_key === 'super_admin') {
        const saCount = await db.prepare(`SELECT COUNT(*) AS n FROM urc_users WHERE role_key = 'super_admin' AND account_status = 'active'`).first();
        if (Number(saCount?.n || 0) <= 1) {
          throw new HttpError(409, 'LAST_SUPER_ADMIN', 'Cannot suspend or block the primary Super Admin');
        }
      }
      await snapshotRevision(db, '01', uid, actor, `bulk status -> ${status}`);
      await db.prepare(`UPDATE urc_users SET account_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, uid).run();
      updated++;
    }
    await audit(env, request, actor, 'urc.users.bulk_status', 'urc_users', ids.join(','), { account_status: status, updated });
    return json({ ok: true, updated, account_status: status });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const fullName = cleanStr(body.full_name || '', 120);
    const email = cleanStr(body.email || '', 160).toLowerCase();
    const phone = cleanStr(body.phone || '', 30);
    const roleKey = cleanStr(body.role_key || 'student', 60);
    const accountStatus = pick(body.account_status, URC_ACCOUNT_STATUSES, 'account_status', errors, 'active');
    const district = cleanStr(body.district_odisha || 'Khordha', 80) || 'Khordha';
    const prefLang = pick(body.preferred_lang, URC_PREF_LANGS, 'preferred_lang', errors, 'both');
    const emailVerified = body.email_verified ? 1 : 0;

    if (!fullName) errors.full_name = 'Full name is required';
    if (!email || !email.includes('@')) errors.email = 'Valid email is required';
    const roleExists = await db.prepare(`SELECT role_key FROM urc_roles WHERE role_key = ? AND status = 'active'`).bind(roleKey).first();
    if (!roleExists) errors.role_key = `Unknown or inactive role_key: ${roleKey}`;
    if (Object.keys(errors).length) throw validationError(errors);

    const dup = await db.prepare(`SELECT id FROM urc_users WHERE email = ?`).bind(email).first();
    if (dup) throw new HttpError(409, 'DUPLICATE_EMAIL', 'A user with this email already exists');

    const newId = rid('urc-u');
    const userUid = cleanStr(body.user_uid || '', 40) || await nextUserUid(db);
    await db.prepare(
      `INSERT INTO urc_users (id, user_uid, full_name, email, phone, role_key, account_status, email_verified, district_odisha, preferred_lang)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, userUid, fullName, email, phone, roleKey, accountStatus, emailVerified, district, prefLang).run();

    const handle = '@' + email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const pct = computeProfileCompletion({ full_name: fullName, district_odisha: district }, { display_handle: handle, academic_stage: 'Competitive Aspirant' });
    await db.prepare(
      `INSERT INTO urc_user_profiles (id, user_id, display_handle, academic_stage, profile_visibility, profile_completion_pct)
       VALUES (?, ?, ?, 'Competitive Aspirant', 'public', ?)`
    ).bind(rid('urc-p'), newId, handle, pct).run();

    await snapshotRevision(db, '01', newId, actor, 'create user');
    await audit(env, request, actor, 'urc.user.create', 'urc_users', newId, { email, role_key: roleKey, district_odisha: district });
    const created = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(newId).first();
    return json({ item: decorateUser(created) }, 201);
  }

  if (sub && !extra && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User not found');
    const body = await readJson(request, 20000);
    const errors = {};

    const fullName = body.full_name !== undefined ? cleanStr(body.full_name, 120) : existing.full_name;
    const phone = body.phone !== undefined ? cleanStr(body.phone, 30) : existing.phone;
    const roleKey = body.role_key !== undefined ? cleanStr(body.role_key, 60) : existing.role_key;
    const accountStatus = body.account_status !== undefined ? pick(body.account_status, URC_ACCOUNT_STATUSES, 'account_status', errors, existing.account_status) : existing.account_status;
    const district = body.district_odisha !== undefined ? cleanStr(body.district_odisha, 80) : existing.district_odisha;
    const prefLang = body.preferred_lang !== undefined ? pick(body.preferred_lang, URC_PREF_LANGS, 'preferred_lang', errors, existing.preferred_lang) : existing.preferred_lang;
    const emailVerified = body.email_verified !== undefined ? (body.email_verified ? 1 : 0) : existing.email_verified;

    if (!fullName) errors.full_name = 'Full name cannot be empty';
    if (body.role_key !== undefined) {
      const rOk = await db.prepare(`SELECT role_key FROM urc_roles WHERE role_key = ?`).bind(roleKey).first();
      if (!rOk) errors.role_key = `Unknown role_key: ${roleKey}`;
    }
    if (Object.keys(errors).length) throw validationError(errors);

    if ((accountStatus === 'suspended' || accountStatus === 'blocked') && (existing.id === actor.userId || existing.email === actor.email)) {
      throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot suspend or block your own account');
    }
    if (existing.role_key === 'super_admin' && (roleKey !== 'super_admin' || accountStatus !== 'active')) {
      const saCount = await db.prepare(`SELECT COUNT(*) AS n FROM urc_users WHERE role_key = 'super_admin' AND account_status = 'active'`).first();
      if (Number(saCount?.n || 0) <= 1) {
        throw new HttpError(409, 'LAST_SUPER_ADMIN', 'Cannot demote or deactivate the last active Super Admin');
      }
    }

    await snapshotRevision(db, '01', sub, actor, body.change_note || 'update user');
    await db.prepare(
      `UPDATE urc_users
       SET full_name = ?, phone = ?, role_key = ?, account_status = ?, email_verified = ?, district_odisha = ?, preferred_lang = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(fullName, phone, roleKey, accountStatus, emailVerified, district, prefLang, sub).run();

    await audit(env, request, actor, 'urc.user.update', 'urc_users', sub, { role_key: roleKey, account_status: accountStatus });
    const updated = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(sub).first();
    return json({ item: decorateUser(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User not found');
    if (existing.id === actor.userId || existing.email === actor.email) {
      throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot archive your own active account');
    }
    if (existing.role_key === 'super_admin') {
      throw new HttpError(409, 'PRIMARY_SUPER_ADMIN', 'Primary Super Admin cannot be deleted or archived');
    }
    await snapshotRevision(db, '01', sub, actor, 'soft-archive user');
    await db.prepare(`UPDATE urc_users SET account_status = 'blocked', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.user.archive', 'urc_users', sub, { email: existing.email });
    return json({ ok: true, id: sub, account_status: 'blocked' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/** Module 02: User Profiles (/api/admin/users/profiles) */
async function handleProfiles(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const stage = (url.searchParams.get('academic_stage') || '').trim();
    const vis = (url.searchParams.get('profile_visibility') || '').trim();
    const verEdu = url.searchParams.get('verified_educator');
    const where = [];
    const binds = [];
    if (q) {
      const l = likeEscape(q);
      where.push(`(u.full_name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR p.display_handle LIKE ? ESCAPE '\\' OR p.institution_name LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    if (stage) { where.push('p.academic_stage = ?'); binds.push(stage); }
    if (vis) { where.push('p.profile_visibility = ?'); binds.push(vis); }
    if (verEdu === '1' || verEdu === 'true') { where.push('p.verified_educator = 1'); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT p.*, u.user_uid, u.full_name, u.email, u.role_key, u.district_odisha, u.account_status
       FROM urc_user_profiles p
       JOIN urc_users u ON u.id = p.user_id
       ${w}
       ORDER BY p.profile_completion_pct DESC, p.updated_at DESC
       LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateProfile), total: (results || []).length });
  }

  if (sub && !extra && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(
      `SELECT p.*, u.full_name, u.district_odisha FROM urc_user_profiles p JOIN urc_users u ON u.id = p.user_id WHERE p.id = ? OR p.user_id = ?`
    ).bind(sub, sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User profile not found');
    const body = await readJson(request, 30000);
    const errors = {};

    const displayHandle = body.display_handle !== undefined ? cleanStr(body.display_handle, 80) : existing.display_handle;
    const bioEn = body.bio_en !== undefined ? cleanStr(body.bio_en, 1000) : existing.bio_en;
    const bioOr = body.bio_or !== undefined ? cleanStr(body.bio_or, 1000) : existing.bio_or;
    const academicStage = body.academic_stage !== undefined
      ? pick(body.academic_stage, URC_ACADEMIC_STAGES, 'academic_stage', errors, existing.academic_stage)
      : existing.academic_stage;
    const institutionName = body.institution_name !== undefined ? cleanStr(body.institution_name, 160) : existing.institution_name;
    const avatarUrl = body.avatar_url !== undefined ? cleanStr(body.avatar_url, 300) : existing.avatar_url;
    const badgeLabel = body.badge_label !== undefined ? cleanStr(body.badge_label, 80) : existing.badge_label;
    const visibility = body.profile_visibility !== undefined
      ? pick(body.profile_visibility, URC_PROFILE_VISIBILITIES, 'profile_visibility', errors, existing.profile_visibility)
      : existing.profile_visibility;
    const verifiedEducator = body.verified_educator !== undefined ? (body.verified_educator ? 1 : 0) : existing.verified_educator;

    let targetExams = parseJson(existing.target_exams_json, []);
    if (body.target_exams !== undefined) {
      targetExams = Array.isArray(body.target_exams)
        ? body.target_exams.map(x => cleanStr(x, 60)).filter(Boolean).slice(0, 12)
        : String(body.target_exams).split(',').map(x => cleanStr(x, 60)).filter(Boolean).slice(0, 12);
    } else if (body.target_exams_json !== undefined) {
      targetExams = parseJson(body.target_exams_json, []);
    }
    if (Object.keys(errors).length) throw validationError(errors);

    const pct = computeProfileCompletion(
      { full_name: existing.full_name, district_odisha: existing.district_odisha },
      {
        display_handle: displayHandle,
        bio_en: bioEn,
        bio_or: bioOr,
        academic_stage: academicStage,
        target_exams: targetExams,
        institution_name: institutionName,
        avatar_url: avatarUrl,
        badge_label: badgeLabel
      }
    );

    await snapshotRevision(db, '02', existing.id, actor, body.change_note || 'update profile');
    await db.prepare(
      `UPDATE urc_user_profiles
       SET display_handle = ?, bio_en = ?, bio_or = ?, academic_stage = ?, target_exams_json = ?,
           institution_name = ?, avatar_url = ?, badge_label = ?, profile_visibility = ?,
           profile_completion_pct = ?, verified_educator = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      displayHandle, bioEn, bioOr, academicStage, JSON.stringify(targetExams),
      institutionName, avatarUrl, badgeLabel, visibility, pct, verifiedEducator, existing.id
    ).run();

    await audit(env, request, actor, 'urc.profile.update', 'urc_user_profiles', existing.id, { verified_educator: verifiedEducator, profile_completion_pct: pct });
    const updated = await db.prepare(
      `SELECT p.*, u.user_uid, u.full_name, u.email, u.role_key, u.district_odisha, u.account_status
       FROM urc_user_profiles p JOIN urc_users u ON u.id = p.user_id WHERE p.id = ?`
    ).bind(existing.id).first();
    return json({ item: decorateProfile(updated) });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/** Module 03: Roles & Permissions (/api/admin/users/roles) */
async function handleRoles(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM urc_roles ORDER BY priority_rank ASC, role_key ASC`).all();
    return json({ items: (results || []).map(decorateRole), domains: URC_DOMAINS, capabilities: URC_CAPABILITIES });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 25000);
    const errors = {};
    const roleKey = cleanStr(body.role_key || '', 50).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const nameEn = cleanStr(body.role_name_en || '', 100);
    const nameOr = cleanStr(body.role_name_or || '', 120);
    const descEn = cleanStr(body.description_en || '', 400);
    const descOr = cleanStr(body.description_or || '', 400);
    const rank = Math.max(1, Math.min(999, Number(body.priority_rank || 20) || 20));
    if (!roleKey) errors.role_key = 'role_key is required (lowercase alphanumeric/underscore)';
    if (!nameEn) errors.role_name_en = 'role_name_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const dup = await db.prepare(`SELECT id FROM urc_roles WHERE role_key = ?`).bind(roleKey).first();
    if (dup) throw new HttpError(409, 'DUPLICATE_ROLE', `Role ${roleKey} already exists`);

    const perms = normalizePermissions(body.permissions || body.permissions_json || {});
    const newId = rid('role');
    await db.prepare(
      `INSERT INTO urc_roles (id, role_key, role_name_en, role_name_or, description_en, description_or, permissions_json, is_system_role, priority_rank, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')`
    ).bind(newId, roleKey, nameEn, nameOr, descEn, descOr, JSON.stringify(perms), rank).run();

    await snapshotRevision(db, '03', newId, actor, 'create role');
    await audit(env, request, actor, 'urc.role.create', 'urc_roles', newId, { role_key: roleKey });
    const created = await db.prepare(`SELECT * FROM urc_roles WHERE id = ?`).bind(newId).first();
    return json({ item: decorateRole(created) }, 201);
  }

  if (sub && !extra && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_roles WHERE id = ? OR role_key = ?`).bind(sub, sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Role not found');
    const body = await readJson(request, 25000);

    const nameEn = body.role_name_en !== undefined ? cleanStr(body.role_name_en, 100) : existing.role_name_en;
    const nameOr = body.role_name_or !== undefined ? cleanStr(body.role_name_or, 120) : existing.role_name_or;
    const descEn = body.description_en !== undefined ? cleanStr(body.description_en, 400) : existing.description_en;
    const descOr = body.description_or !== undefined ? cleanStr(body.description_or, 400) : existing.description_or;
    const rank = body.priority_rank !== undefined ? Math.max(1, Math.min(999, Number(body.priority_rank) || existing.priority_rank)) : existing.priority_rank;
    const status = body.status === 'archived' ? 'archived' : 'active';
    const perms = (body.permissions !== undefined || body.permissions_json !== undefined)
      ? normalizePermissions(body.permissions || body.permissions_json)
      : parseJson(existing.permissions_json, makeFullMatrix(false));

    if (existing.role_key === 'super_admin') {
      if (status !== 'active') throw new HttpError(409, 'PROTECTED_ROLE', 'Super Admin role cannot be archived');
      if (!hasAllSuperAdminCorePerms(perms)) {
        throw new HttpError(409, 'PROTECTED_ROLE', 'Super Admin core permissions cannot be stripped');
      }
    }

    await snapshotRevision(db, '03', existing.id, actor, body.change_note || 'update role matrix');
    await db.prepare(
      `UPDATE urc_roles
       SET role_name_en = ?, role_name_or = ?, description_en = ?, description_or = ?, permissions_json = ?, priority_rank = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(nameEn, nameOr, descEn, descOr, JSON.stringify(perms), rank, status, existing.id).run();

    await audit(env, request, actor, 'urc.role.update', 'urc_roles', existing.id, { role_key: existing.role_key });
    const updated = await db.prepare(`SELECT * FROM urc_roles WHERE id = ?`).bind(existing.id).first();
    return json({ item: decorateRole(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_roles WHERE id = ? OR role_key = ?`).bind(sub, sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Role not found');
    if (Number(existing.is_system_role || 0) === 1 || existing.role_key === 'super_admin') {
      throw new HttpError(409, 'PROTECTED_ROLE', 'System roles and Super Admin cannot be deleted');
    }
    await snapshotRevision(db, '03', existing.id, actor, 'archive role');
    await db.prepare(`UPDATE urc_roles SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(existing.id).run();
    await audit(env, request, actor, 'urc.role.archive', 'urc_roles', existing.id, { role_key: existing.role_key });
    return json({ ok: true, id: existing.id, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/** Module 04: Admin Accounts (/api/admin/users/admins) */
async function handleAdmins(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('status') || '').trim();
    const role = (url.searchParams.get('admin_role_key') || '').trim();
    const where = [];
    const binds = [];
    if (status) { where.push('a.status = ?'); binds.push(status); }
    if (role) { where.push('a.admin_role_key = ?'); binds.push(role); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT a.*, u.user_uid, u.district_odisha, u.account_status
       FROM urc_admin_accounts a
       LEFT JOIN urc_users u ON u.id = a.user_id
       ${w}
       ORDER BY a.admin_code ASC`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateAdmin), total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const email = cleanStr(body.email || '', 160).toLowerCase();
    const fullName = cleanStr(body.full_name || '', 120);
    const adminRoleKey = pick(body.admin_role_key, URC_ADMIN_ROLES, 'admin_role_key', errors, 'admin');
    const dept = cleanStr(body.department_label || 'Platform Operations', 120);
    const mfa = body.mfa_enforced !== false ? 1 : 0;
    const ipHint = cleanStr(body.ip_allowlist_hint || '', 120);
    const timeoutMins = Math.max(5, Math.min(480, Number(body.session_timeout_mins || 60) || 60));

    if (!email || !email.includes('@')) errors.email = 'Valid email is required';
    if (!fullName) errors.full_name = 'Full name is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let userRow = await db.prepare(`SELECT * FROM urc_users WHERE email = ?`).bind(email).first();
    if (!userRow) {
      const uid = rid('urc-u');
      const userUid = await nextUserUid(db);
      await db.prepare(
        `INSERT INTO urc_users (id, user_uid, full_name, email, role_key, account_status, email_verified, district_odisha, preferred_lang)
         VALUES (?, ?, ?, ?, ?, 'active', 1, ?, 'both')`
      ).bind(uid, userUid, fullName, email, adminRoleKey, cleanStr(body.district_odisha || 'Khordha', 80)).run();
      await db.prepare(
        `INSERT INTO urc_user_profiles (id, user_id, display_handle, academic_stage, profile_visibility, profile_completion_pct)
         VALUES (?, ?, ?, 'Postgraduate', 'public', 35)`
      ).bind(rid('urc-p'), uid, '@' + email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()).run();
      userRow = await db.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(uid).first();
    } else {
      await db.prepare(`UPDATE urc_users SET role_key = ?, updated_at = datetime('now') WHERE id = ?`).bind(adminRoleKey, userRow.id).run();
    }

    const dupAdm = await db.prepare(`SELECT id FROM urc_admin_accounts WHERE user_id = ? OR email = ?`).bind(userRow.id, email).first();
    if (dupAdm) throw new HttpError(409, 'DUPLICATE_ADMIN', 'Admin account already provisioned for this user');

    const admId = rid('urc-adm');
    const admCode = cleanStr(body.admin_code || '', 30) || await nextAdminCode(db);
    await db.prepare(
      `INSERT INTO urc_admin_accounts (id, user_id, admin_code, full_name, email, admin_role_key, department_label, mfa_enforced, ip_allowlist_hint, session_timeout_mins, last_active_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'active')`
    ).bind(admId, userRow.id, admCode, fullName, email, adminRoleKey, dept, mfa, ipHint, timeoutMins).run();

    await snapshotRevision(db, '04', admId, actor, 'provision admin account');
    await audit(env, request, actor, 'urc.admin.provision', 'urc_admin_accounts', admId, { email, admin_role_key: adminRoleKey, admin_code: admCode });
    const created = await db.prepare(
      `SELECT a.*, u.user_uid, u.district_odisha, u.account_status FROM urc_admin_accounts a LEFT JOIN urc_users u ON u.id = a.user_id WHERE a.id = ?`
    ).bind(admId).first();
    return json({ item: decorateAdmin(created) }, 201);
  }

  if (sub && !extra && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_admin_accounts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admin account not found');
    const body = await readJson(request, 20000);
    const errors = {};

    const fullName = body.full_name !== undefined ? cleanStr(body.full_name, 120) : existing.full_name;
    const adminRoleKey = body.admin_role_key !== undefined
      ? pick(body.admin_role_key, URC_ADMIN_ROLES, 'admin_role_key', errors, existing.admin_role_key)
      : existing.admin_role_key;
    const dept = body.department_label !== undefined ? cleanStr(body.department_label, 120) : existing.department_label;
    const mfa = body.mfa_enforced !== undefined ? (body.mfa_enforced ? 1 : 0) : existing.mfa_enforced;
    const ipHint = body.ip_allowlist_hint !== undefined ? cleanStr(body.ip_allowlist_hint, 120) : existing.ip_allowlist_hint;
    const timeoutMins = body.session_timeout_mins !== undefined
      ? Math.max(5, Math.min(480, Number(body.session_timeout_mins) || 60))
      : existing.session_timeout_mins;
    const status = body.status !== undefined
      ? pick(body.status, URC_ADMIN_STATUSES, 'status', errors, existing.status)
      : existing.status;

    if (!fullName) errors.full_name = 'Full name is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const isSelf = existing.user_id === actor.userId || existing.email === actor.email;
    if (isSelf && (status === 'suspended' || adminRoleKey !== existing.admin_role_key)) {
      throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot suspend or demote your own active admin account');
    }

    if (existing.admin_role_key === 'super_admin' && (status !== 'active' || adminRoleKey !== 'super_admin')) {
      const saCount = await db.prepare(`SELECT COUNT(*) AS n FROM urc_admin_accounts WHERE admin_role_key = 'super_admin' AND status = 'active'`).first();
      if (Number(saCount?.n || 0) <= 1) {
        throw new HttpError(409, 'LAST_SUPER_ADMIN', 'Cannot suspend or demote the last active Super Admin account');
      }
    }

    await snapshotRevision(db, '04', sub, actor, body.change_note || 'update admin account');
    await db.prepare(
      `UPDATE urc_admin_accounts
       SET full_name = ?, admin_role_key = ?, department_label = ?, mfa_enforced = ?, ip_allowlist_hint = ?, session_timeout_mins = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(fullName, adminRoleKey, dept, mfa, ipHint, timeoutMins, status, sub).run();

    await audit(env, request, actor, 'urc.admin.update', 'urc_admin_accounts', sub, { admin_role_key: adminRoleKey, status, mfa_enforced: mfa });
    const updated = await db.prepare(
      `SELECT a.*, u.user_uid, u.district_odisha, u.account_status FROM urc_admin_accounts a LEFT JOIN urc_users u ON u.id = a.user_id WHERE a.id = ?`
    ).bind(sub).first();
    return json({ item: decorateAdmin(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_admin_accounts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admin account not found');
    const isSelf = existing.user_id === actor.userId || existing.email === actor.email;
    if (isSelf) throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot suspend or remove your own active admin account');
    if (existing.admin_role_key === 'super_admin') {
      const saCount = await db.prepare(`SELECT COUNT(*) AS n FROM urc_admin_accounts WHERE admin_role_key = 'super_admin' AND status = 'active'`).first();
      if (Number(saCount?.n || 0) <= 1) {
        throw new HttpError(409, 'LAST_SUPER_ADMIN', 'Cannot suspend the last active Super Admin account');
      }
    }
    await snapshotRevision(db, '04', sub, actor, 'suspend admin account');
    await db.prepare(`UPDATE urc_admin_accounts SET status = 'suspended', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.admin.suspend', 'urc_admin_accounts', sub, { email: existing.email });
    return json({ ok: true, id: sub, status: 'suspended' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/** Revisions & Rollback (/api/admin/users/revisions) */
async function handleRevisions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const modCode = (url.searchParams.get('module_code') || '').trim();
    const entityId = (url.searchParams.get('entity_id') || '').trim();
    const where = [];
    const binds = [];
    if (modCode) { where.push('module_code = ?'); binds.push(modCode); }
    if (entityId) { where.push('entity_id = ?'); binds.push(entityId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at
       FROM urc_revisions ${w} ORDER BY version_num DESC, created_at DESC LIMIT 50`
    ).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = cleanStr(body.revision_id || '', 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM urc_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', `Rollback unsupported for module ${rev.module_code}`);
    const snap = parseJson(rev.snapshot_json, null);
    if (!snap) throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Revision snapshot is invalid');

    await snapshotRevision(db, rev.module_code, rev.entity_id, actor, `pre-rollback to v${rev.version_num}`);
    const setCols = cfg.cols.filter(c => c in snap);
    const sets = setCols.map(c => `${c} = ?`).join(', ');
    const vals = setCols.map(c => snap[c]);
    await db.prepare(`UPDATE ${cfg.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, rev.entity_id).run();

    await audit(env, request, actor, 'urc.revision.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    return json({ ok: true, module_code: rev.module_code, entity_id: rev.entity_id, restored_version: rev.version_num });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleUsersCommunityBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureUsersCommunityBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json(await getUsersOverview(env.DB));
  }
  if (id === 'directory') return handleDirectory(request, env, actor, sub, extra);
  if (id === 'profiles') return handleProfiles(request, env, actor, sub, extra);
  if (id === 'roles') return handleRoles(request, env, actor, sub, extra);
  if (id === 'admins') return handleAdmins(request, env, actor, sub, extra);
  if (id === 'revisions') return handleRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown users & community route');
}
