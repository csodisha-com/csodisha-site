-- Educational Resources Batch 6 (v83): Modules 21-22
-- 21 Student Dashboard | 22 Educational Tools

CREATE TABLE IF NOT EXISTS edu_student_dashboard_widgets (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  widget_type TEXT NOT NULL DEFAULT 'pinned_announcement' CHECK (widget_type IN (
    'pinned_announcement', 'todays_update_digest', 'recommended_track', 'exam_countdown_banner', 'quick_action_card', 'mentor_tip'
  )),
  target_stage TEXT NOT NULL DEFAULT 'All Students' CHECK (target_stage IN (
    'All Students', 'School 6-10', 'Higher Secondary +2', 'UG / PG', 'OPSC / OSSC / OSSSC', 'Teaching / UGC NET'
  )),
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_or TEXT NOT NULL DEFAULT '',
  cta_label_en TEXT NOT NULL DEFAULT '',
  cta_label_or TEXT NOT NULL DEFAULT '',
  cta_url TEXT NOT NULL DEFAULT '',
  linked_module_code TEXT NOT NULL DEFAULT '',
  linked_item_id TEXT NOT NULL DEFAULT '',
  countdown_target_date TEXT NOT NULL DEFAULT '',
  priority_order INTEGER NOT NULL DEFAULT 10,
  pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_sdw_status_stage ON edu_student_dashboard_widgets(status, target_stage, priority_order);

CREATE TABLE IF NOT EXISTS edu_tools_registry (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  tool_type TEXT NOT NULL DEFAULT 'age_eligibility_calculator' CHECK (tool_type IN (
    'age_eligibility_calculator', 'cgpa_percentage_converter', 'negative_marking_score_calc',
    'study_timetable_generator', 'exam_countdown_tracker', 'syllabus_progress_tracker'
  )),
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  instructions_en TEXT NOT NULL DEFAULT '',
  instructions_or TEXT NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  tool_url TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT 'calculator',
  sort_order INTEGER NOT NULL DEFAULT 10,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_tools_status_type ON edu_tools_registry(status, tool_type, sort_order);

CREATE TABLE IF NOT EXISTS edu_batch6_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL CHECK (module_code IN ('21', '22')),
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_b6_rev_entity ON edu_batch6_revisions(module_code, entity_id, version_num DESC);
