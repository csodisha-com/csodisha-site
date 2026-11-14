-- Migration 0011: Schemes & Benefits Full 1,264-Node Directory Tree & Extended Metadata
-- Creates hierarchical `schemes_directory_nodes` and extends `schemes_directory`
-- with structured docs checklist, application steps, disbursement mode, helpline,
-- verification date, application window status, and optional exam/scholarship link.

CREATE TABLE IF NOT EXISTS schemes_directory_nodes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  parent_slug TEXT,
  level TEXT NOT NULL CHECK (level IN ('group', 'section', 'subcategory', 'entry')),
  title TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT '📄',
  official_url TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schemes_nodes_parent ON schemes_directory_nodes(parent_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_schemes_nodes_level ON schemes_directory_nodes(level, status, sort_order);

ALTER TABLE schemes_directory ADD COLUMN required_docs_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE schemes_directory ADD COLUMN application_steps_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE schemes_directory ADD COLUMN disbursement_mode TEXT NOT NULL DEFAULT '';
ALTER TABLE schemes_directory ADD COLUMN helpline TEXT NOT NULL DEFAULT '';
ALTER TABLE schemes_directory ADD COLUMN verified_date TEXT NOT NULL DEFAULT '';
ALTER TABLE schemes_directory ADD COLUMN application_status_label TEXT NOT NULL DEFAULT '';
ALTER TABLE schemes_directory ADD COLUMN exam_slug TEXT NOT NULL DEFAULT '';
