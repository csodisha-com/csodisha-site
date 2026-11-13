-- Migration 0010: About CSO Directory & Institutional Standards CMS
-- Stores hierarchical groups, sections, and bilingual entries for /about/ and Command Studio (#/about-directory)

CREATE TABLE IF NOT EXISTS about_directory_nodes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  parent_slug TEXT,
  level TEXT NOT NULL CHECK (level IN ('group', 'section', 'entry')),
  title TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  body_text_or TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT '📄',
  official_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_about_nodes_parent ON about_directory_nodes(parent_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_about_nodes_level ON about_directory_nodes(level, status, sort_order);
