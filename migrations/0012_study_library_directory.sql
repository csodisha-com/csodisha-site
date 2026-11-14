-- Migration 0012: Study Library 1,681-Node Directory Tree & Extended Study Resources
-- Creates hierarchical `study_library_nodes` and extends `resources` with bilingual copy,
-- exam_slug cross-links, resource_type, verification date, structured syllabus units,
-- key takeaways, and official .gov.in / .nic.in / .ac.in source links.

CREATE TABLE IF NOT EXISTS study_library_nodes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  parent_slug TEXT,
  level TEXT NOT NULL CHECK (level IN ('group', 'section', 'subcategory', 'entry')),
  title TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT '📚',
  exam_slug TEXT NOT NULL DEFAULT '',
  resource_url TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_nodes_parent ON study_library_nodes(parent_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_study_nodes_level ON study_library_nodes(level, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_study_nodes_exam ON study_library_nodes(exam_slug);

ALTER TABLE resources ADD COLUMN exam_slug TEXT NOT NULL DEFAULT '';
ALTER TABLE resources ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'syllabus';
ALTER TABLE resources ADD COLUMN verified_date TEXT NOT NULL DEFAULT '';
ALTER TABLE resources ADD COLUMN title_or TEXT NOT NULL DEFAULT '';
ALTER TABLE resources ADD COLUMN description_or TEXT NOT NULL DEFAULT '';
ALTER TABLE resources ADD COLUMN syllabus_units_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resources ADD COLUMN key_takeaways_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resources ADD COLUMN official_source_url TEXT NOT NULL DEFAULT '';
