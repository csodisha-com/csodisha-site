-- 0100_users_roles_community_batch5.sql
-- Users, Roles & Community Batch 5 (v100): Modules 17-19 (Completing 19-Module Suite)
-- 17 Share Knowledge | 18 Suggest a Topic | 19 Report an Error

CREATE TABLE IF NOT EXISTS urc_shared_knowledge (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_shared_knowledge_status ON urc_shared_knowledge(review_status, content_kind, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_topic_suggestions (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_topic_sugg_status ON urc_topic_suggestions(workflow_status, votes_count DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS urc_error_reports (
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
);
CREATE INDEX IF NOT EXISTS idx_urc_errata_status ON urc_error_reports(fix_status, severity, created_at DESC);
