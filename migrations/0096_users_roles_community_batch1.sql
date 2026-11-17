-- 0096_users_roles_community_batch1.sql
-- Users, Roles & Community Batch 1 (v96): Modules 01-04
-- 01 All Users | 02 User Profiles | 03 Roles & Permissions | 04 Admin Accounts

CREATE TABLE IF NOT EXISTS urc_users (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_users_role_status ON urc_users(role_key, account_status, district_odisha);

CREATE TABLE IF NOT EXISTS urc_user_profiles (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_profiles_vis ON urc_user_profiles(verified_educator, profile_visibility, profile_completion_pct DESC);

CREATE TABLE IF NOT EXISTS urc_roles (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_roles_rank ON urc_roles(priority_rank ASC, status);

CREATE TABLE IF NOT EXISTS urc_admin_accounts (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_admins_role_status ON urc_admin_accounts(admin_role_key, status);

CREATE TABLE IF NOT EXISTS urc_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_urc_rev_lookup ON urc_revisions(module_code, entity_id, version_num DESC);
