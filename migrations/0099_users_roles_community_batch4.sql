-- 0099_users_roles_community_batch4.sql
-- Users, Roles & Community Batch 4 (v99): Modules 13-16
-- 13 User Activity | 14 Data Access Requests (DPDP) | 15 Discussion Forum | 16 Ask a Question

CREATE TABLE IF NOT EXISTS urc_user_activity_logs (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_activity_type ON urc_user_activity_logs(activity_type, portal_area, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_data_access_requests (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_dpdp_status ON urc_data_access_requests(fulfillment_status, request_type, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_forum_threads (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_forum_cat ON urc_forum_threads(category_key, status, is_pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_student_questions (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_qna_status ON urc_student_questions(answer_status, subject_or_exam, created_at DESC);
