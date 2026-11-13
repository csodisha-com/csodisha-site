-- Migration 0009: Ecosystem Unification (Jobs Directory, Schemes Directory, Community Feedback, Push Subscriptions)
-- Strictly idempotent (safe for both --local and --remote execution).

CREATE TABLE IF NOT EXISTS jobs_directory_nodes (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  code TEXT,
  title TEXT NOT NULL,
  title_or TEXT,
  description TEXT,
  description_or TEXT,
  group_slug TEXT,
  url TEXT,
  exam_slug TEXT,
  notes_json TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_dir_parent_sort ON jobs_directory_nodes(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_jobs_dir_level_sort ON jobs_directory_nodes(level, sort_order);
CREATE INDEX IF NOT EXISTS idx_jobs_dir_group ON jobs_directory_nodes(group_slug, is_active);

CREATE TABLE IF NOT EXISTS schemes_directory (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_or TEXT,
  summary TEXT,
  summary_or TEXT,
  body_md TEXT,
  body_md_or TEXT,
  category TEXT NOT NULL DEFAULT 'Welfare',
  department TEXT,
  gov_level TEXT NOT NULL DEFAULT 'Odisha',
  target_groups TEXT NOT NULL DEFAULT '[]',
  min_age INTEGER,
  max_age INTEGER,
  max_income INTEGER,
  gender_eligible TEXT NOT NULL DEFAULT 'all',
  beneficiary_categories TEXT NOT NULL DEFAULT '[]',
  benefit_summary TEXT,
  benefit_summary_or TEXT,
  documents_required TEXT NOT NULL DEFAULT '[]',
  apply_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_schemes_dir_status ON schemes_directory(status, deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_schemes_dir_gov_cat ON schemes_directory(gov_level, category, status);

CREATE TABLE IF NOT EXISTS community_feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'error',
  page_url TEXT NOT NULL,
  page_title TEXT,
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  contact_email TEXT,
  user_id TEXT,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON community_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_kind_status ON community_feedback(kind, status);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth_secret TEXT,
  channel TEXT NOT NULL DEFAULT 'webpush',
  goal_exams TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_alert_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_push_subs_enabled ON push_subscriptions(enabled, updated_at DESC);
