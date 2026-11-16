-- Educational Resources Batch 2 (v79): Modules 05-08
-- 05 Subjects & Topics | 06 Class / Grade Management | 07 Examination Management | 08 Recruitment & Jobs (bridged to jobs_directory_items)

CREATE TABLE IF NOT EXISTS edu_classes_grades (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL,
  name_or TEXT NOT NULL DEFAULT '',
  stage_group TEXT NOT NULL DEFAULT 'school_1_10' CHECK (stage_group IN (
    'school_1_10', 'higher_secondary_11_12', 'ug_pg',
    'competitive_odisha', 'competitive_national', 'teaching_eligibility'
  )),
  board_or_body TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_classes_stage_status ON edu_classes_grades(stage_group, status, sort_order);

CREATE TABLE IF NOT EXISTS edu_subjects_topics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  class_grade_id TEXT NOT NULL DEFAULT '',
  parent_topic_id TEXT,
  code TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_subjects_class_parent ON edu_subjects_topics(class_grade_id, parent_topic_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_edu_subjects_status ON edu_subjects_topics(status);

CREATE TABLE IF NOT EXISTS edu_examinations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  exam_code TEXT NOT NULL DEFAULT '',
  conducting_body TEXT NOT NULL DEFAULT 'OPSC' CHECK (conducting_body IN (
    'OPSC', 'OSSC', 'OSSSC', 'BSE Odisha', 'CHSE Odisha', 'NTA', 'UPSC', 'SSC', 'IBPS', 'Other'
  )),
  exam_level TEXT NOT NULL DEFAULT 'State' CHECK (exam_level IN ('State', 'National', 'Board', 'Entrance')),
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  eligibility_en TEXT NOT NULL DEFAULT '',
  eligibility_or TEXT NOT NULL DEFAULT '',
  age_limit_text TEXT NOT NULL DEFAULT '',
  fee_structure_json TEXT NOT NULL DEFAULT '{}',
  important_dates_json TEXT NOT NULL DEFAULT '{}',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  r2_key TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TEXT,
  expires_at TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_exams_body_level ON edu_examinations(conducting_body, exam_level, status);
CREATE INDEX IF NOT EXISTS idx_edu_exams_featured ON edu_examinations(featured, status);

CREATE TABLE IF NOT EXISTS edu_batch2_revisions (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_b2_rev_res ON edu_batch2_revisions(resource_id, version_num DESC);
