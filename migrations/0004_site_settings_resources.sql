-- 0004: site-wide settings (homepage live broadcast banner) and educational
-- resources (syllabus / previous-year question papers backed by R2 files).

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('syllabus', 'pyq')),
  title TEXT NOT NULL,
  exam TEXT,
  year INTEGER,
  description TEXT,
  media_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_resources_list ON resources(kind, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_deleted ON resources(deleted_at);
