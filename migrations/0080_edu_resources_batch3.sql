-- Educational Resources Batch 3 (v80): Modules 09-12
-- 09 Admit Cards & Results | 10 Syllabus & Exam Patterns | 11 Previous Year Questions | 12 Question Bank

CREATE TABLE IF NOT EXISTS edu_admit_results (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  notice_type TEXT NOT NULL DEFAULT 'admit_card' CHECK (notice_type IN (
    'admit_card', 'exam_city_slip', 'provisional_result', 'final_result', 'merit_list', 'cutoff_scorecard'
  )),
  examination_id TEXT NOT NULL DEFAULT '',
  conducting_body TEXT NOT NULL DEFAULT 'OPSC',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  release_date TEXT NOT NULL DEFAULT '',
  exam_date TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  cutoff_table_json TEXT NOT NULL DEFAULT '[]',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TEXT,
  expires_at TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_admit_type_status ON edu_admit_results(notice_type, status);
CREATE INDEX IF NOT EXISTS idx_edu_admit_body ON edu_admit_results(conducting_body, status);

CREATE TABLE IF NOT EXISTS edu_syllabi (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  examination_id TEXT NOT NULL DEFAULT '',
  class_grade_id TEXT NOT NULL DEFAULT '',
  conducting_body TEXT NOT NULL DEFAULT 'OPSC',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  exam_pattern_json TEXT NOT NULL DEFAULT '[]',
  topics_checklist_json TEXT NOT NULL DEFAULT '[]',
  r2_key TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_syllabi_body_status ON edu_syllabi(conducting_body, status);

CREATE TABLE IF NOT EXISTS edu_pyq_papers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  examination_id TEXT NOT NULL DEFAULT '',
  class_grade_id TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL DEFAULT '',
  exam_year INTEGER NOT NULL DEFAULT 2025,
  shift_or_paper TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  question_count INTEGER NOT NULL DEFAULT 0,
  duration_mins INTEGER NOT NULL DEFAULT 120,
  total_marks REAL NOT NULL DEFAULT 100,
  difficulty_level TEXT NOT NULL DEFAULT 'Moderate' CHECK (difficulty_level IN ('Easy', 'Moderate', 'Hard')),
  offline_ready INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  answer_key_url TEXT NOT NULL DEFAULT '',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_pyq_year_subj ON edu_pyq_papers(exam_year DESC, subject_name, status);

CREATE TABLE IF NOT EXISTS edu_question_bank (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  pyq_paper_id TEXT,
  class_grade_id TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL DEFAULT '',
  topic_name TEXT NOT NULL DEFAULT '',
  exam_tag TEXT NOT NULL DEFAULT '',
  exam_year INTEGER,
  difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  question_en TEXT NOT NULL,
  question_or TEXT NOT NULL DEFAULT '',
  options_json TEXT NOT NULL DEFAULT '{}',
  correct_option TEXT NOT NULL DEFAULT 'A' CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation_en TEXT NOT NULL DEFAULT '',
  explanation_or TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_qbank_subj_diff ON edu_question_bank(subject_name, difficulty, status);
CREATE INDEX IF NOT EXISTS idx_edu_qbank_pyq ON edu_question_bank(pyq_paper_id);

CREATE TABLE IF NOT EXISTS edu_batch3_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL CHECK (module_code IN ('09', '10', '11', '12')),
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_b3_rev_entity ON edu_batch3_revisions(module_code, entity_id, version_num DESC);
