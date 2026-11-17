-- 0097_users_roles_community_batch2.sql
-- Users, Roles & Community Batch 2 (v97): Modules 05-08
-- 05 Account Status | 06 Registrations | 07 Membership Access | 08 Community Posts

CREATE TABLE IF NOT EXISTS urc_account_status_logs (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_status_logs_user ON urc_account_status_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_registrations (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_regs_status ON urc_registrations(approval_status, requested_role, district_odisha);

CREATE TABLE IF NOT EXISTS urc_membership_grants (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_mem_grants_user ON urc_membership_grants(user_id, access_status, tier_code);

CREATE TABLE IF NOT EXISTS urc_community_posts (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_posts_status ON urc_community_posts(status, is_pinned DESC, featured DESC, created_at DESC);
