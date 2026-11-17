-- 0098_users_roles_community_batch3.sql
-- Users, Roles & Community Batch 3 (v98): Modules 09-12
-- 09 Comments & Replies | 10 Moderation Queue | 11 User Reports | 12 Blocked Accounts

CREATE TABLE IF NOT EXISTS urc_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_comment_id TEXT,
  author_user_id TEXT,
  author_name TEXT NOT NULL,
  author_badge TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL,
  body_or TEXT NOT NULL DEFAULT '',
  is_official_mentor_reply INTEGER NOT NULL DEFAULT 0,
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review', 'hidden_spam', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_urc_comments_post ON urc_comments(post_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_moderation_queue (
  id TEXT PRIMARY KEY,
  queue_code TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'community_post' CHECK (content_type IN ('community_post', 'comment_reply', 'forum_thread', 'shared_note', 'profile_bio')),
  source_table TEXT NOT NULL DEFAULT '',
  source_id TEXT NOT NULL DEFAULT '',
  author_user_id TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  excerpt_text TEXT NOT NULL DEFAULT '',
  flag_source TEXT NOT NULL DEFAULT 'pre_publish_filter' CHECK (flag_source IN ('pre_publish_filter', 'keyword_guard', 'community_flag', 'new_account_hold')),
  risk_reason TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  decision_status TEXT NOT NULL DEFAULT 'pending' CHECK (decision_status IN ('pending', 'approved', 'rejected', 'escalated')),
  moderator_note TEXT NOT NULL DEFAULT '',
  decided_by TEXT NOT NULL DEFAULT '',
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_urc_mod_queue_status ON urc_moderation_queue(decision_status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_user_reports (
  id TEXT PRIMARY KEY,
  report_code TEXT NOT NULL UNIQUE,
  reported_user_id TEXT,
  reported_user_name TEXT NOT NULL DEFAULT '',
  reported_email TEXT NOT NULL DEFAULT '',
  reporter_name TEXT NOT NULL DEFAULT '',
  reporter_email TEXT NOT NULL DEFAULT '',
  violation_category TEXT NOT NULL DEFAULT 'spam_promotion' CHECK (violation_category IN ('spam_promotion', 'harassment_abuse', 'misinformation_exam', 'copyright_piracy', 'impersonation')),
  target_url_or_ref TEXT NOT NULL DEFAULT '',
  description_text TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  report_status TEXT NOT NULL DEFAULT 'open' CHECK (report_status IN ('open', 'investigating', 'action_taken', 'dismissed')),
  action_summary TEXT NOT NULL DEFAULT '',
  resolved_by TEXT NOT NULL DEFAULT '',
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reported_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_urc_reports_status ON urc_user_reports(report_status, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_blocked_accounts (
  id TEXT PRIMARY KEY,
  block_code TEXT NOT NULL UNIQUE,
  user_id TEXT,
  blocked_email TEXT NOT NULL DEFAULT '',
  blocked_ip_hash TEXT NOT NULL DEFAULT '',
  block_scope TEXT NOT NULL DEFAULT 'full_account' CHECK (block_scope IN ('full_account', 'community_posting_only', 'ip_rate_block')),
  reason_category TEXT NOT NULL DEFAULT 'repeated_spam' CHECK (reason_category IN ('repeated_spam', 'exam_leak_fraud', 'harassment', 'payment_chargeback_abuse', 'bot_scraping')),
  reason_notes TEXT NOT NULL DEFAULT '',
  is_permanent INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  block_status TEXT NOT NULL DEFAULT 'active' CHECK (block_status IN ('active', 'expired', 'unblocked')),
  blocked_by TEXT NOT NULL DEFAULT '',
  unblocked_by TEXT NOT NULL DEFAULT '',
  unblocked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_urc_blocked_status ON urc_blocked_accounts(block_status, block_scope, created_at DESC);
