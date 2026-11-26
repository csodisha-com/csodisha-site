-- 0153_informative_guides_v348.sql
-- Informative Articles & Guides Studio (v348) — additive & idempotent.

CREATE TABLE IF NOT EXISTS informative_guides (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'how-to',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  takeaways_json TEXT NOT NULL DEFAULT '[]',
  body_en TEXT NOT NULL DEFAULT '',
  body_or TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  cover_caption_en TEXT NOT NULL DEFAULT '',
  cover_caption_or TEXT NOT NULL DEFAULT '',
  photos_json TEXT NOT NULL DEFAULT '[]',
  pdfs_json TEXT NOT NULL DEFAULT '[]',
  links_json TEXT NOT NULL DEFAULT '[]',
  related_cta_json TEXT NOT NULL DEFAULT '{}',
  read_minutes INTEGER NOT NULL DEFAULT 5,
  tags TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'Odisha',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_exam INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  author_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_informative_guides_pub_sort
  ON informative_guides(status, is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_informative_guides_category
  ON informative_guides(category, status, updated_at DESC);
