-- Educational Resources Batch 4 (v81): Modules 13-16
-- 13 MCQ & Quiz Builder | 14 Mock Tests | 15 Answer Keys & Explanations | 16 Resource Collections

CREATE TABLE IF NOT EXISTS edu_quizzes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  class_grade_id TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL DEFAULT '',
  topic_name TEXT NOT NULL DEFAULT '',
  exam_tag TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  question_ids_json TEXT NOT NULL DEFAULT '[]',
  duration_mins INTEGER NOT NULL DEFAULT 15,
  passing_score_pct REAL NOT NULL DEFAULT 40,
  marks_per_question REAL NOT NULL DEFAULT 1,
  negative_marks REAL NOT NULL DEFAULT 0,
  shuffle_questions INTEGER NOT NULL DEFAULT 1,
  flashcard_mode_enabled INTEGER NOT NULL DEFAULT 1,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TEXT,
  expires_at TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  avg_score_pct REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_quizzes_status_subj ON edu_quizzes(status, subject_name);

CREATE TABLE IF NOT EXISTS edu_mock_tests (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  examination_id TEXT NOT NULL DEFAULT '',
  class_grade_id TEXT NOT NULL DEFAULT '',
  conducting_body TEXT NOT NULL DEFAULT 'OPSC',
  test_series_name TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  sections_json TEXT NOT NULL DEFAULT '[]',
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_marks REAL NOT NULL DEFAULT 0,
  total_duration_mins INTEGER NOT NULL DEFAULT 120,
  negative_marking_rule TEXT NOT NULL DEFAULT '0.25 per wrong answer',
  access_tier TEXT NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free', 'registered', 'featured')),
  live_window_start TEXT,
  live_window_end TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  avg_score_pct REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_mocks_status_body ON edu_mock_tests(status, conducting_body);

CREATE TABLE IF NOT EXISTS edu_answer_keys (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  examination_id TEXT NOT NULL DEFAULT '',
  pyq_paper_id TEXT NOT NULL DEFAULT '',
  mock_test_id TEXT NOT NULL DEFAULT '',
  key_type TEXT NOT NULL DEFAULT 'official_provisional' CHECK (key_type IN (
    'official_provisional', 'official_final', 'model_expert', 'detailed_solutions'
  )),
  conducting_body TEXT NOT NULL DEFAULT 'OSSC',
  exam_year INTEGER NOT NULL DEFAULT 2025,
  paper_set_code TEXT NOT NULL DEFAULT 'Set A / B / C / D',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  answer_mapping_json TEXT NOT NULL DEFAULT '[]',
  objection_window_end TEXT NOT NULL DEFAULT '',
  challenge_url TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_ak_status_year ON edu_answer_keys(status, exam_year DESC);

CREATE TABLE IF NOT EXISTS edu_collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  collection_type TEXT NOT NULL DEFAULT 'exam_starter_pack' CHECK (collection_type IN (
    'exam_starter_pack', 'subject_roadmap', 'crash_course_bundle', 'class_bundle'
  )),
  examination_id TEXT NOT NULL DEFAULT '',
  class_grade_id TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL DEFAULT '[]',
  offline_pack_ready INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  enrollment_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_col_status_type ON edu_collections(status, collection_type);

CREATE TABLE IF NOT EXISTS edu_batch4_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL CHECK (module_code IN ('13', '14', '15', '16')),
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_b4_rev_entity ON edu_batch4_revisions(module_code, entity_id, version_num DESC);
