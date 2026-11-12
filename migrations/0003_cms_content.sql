-- 0003: CMS content tables. Timestamps are UTC 'YYYY-MM-DD HH:MM:SS' text so they
-- compare directly with datetime('now'). All tables soft-delete via deleted_at.

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'pdf')),
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  original_name TEXT,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_deleted ON media_assets(deleted_at);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('current_affair', 'job')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  title_or TEXT,
  summary TEXT,
  summary_or TEXT,
  body_md TEXT,
  body_md_or TEXT,
  category TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  cover_media_key TEXT,
  event_date TEXT,                 -- current affairs date (YYYY-MM-DD)
  organisation TEXT,               -- job fields
  vacancies INTEGER,
  qualification TEXT,
  last_date TEXT,                  -- YYYY-MM-DD
  apply_url TEXT,
  notification_media_key TEXT,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_type_slug ON posts(type, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_list ON posts(type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_last_date ON posts(last_date);
CREATE INDEX IF NOT EXISTS idx_posts_deleted ON posts(deleted_at);

CREATE TABLE IF NOT EXISTS mock_tests (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  title_or TEXT,
  target_exam TEXT,
  duration_minutes INTEGER NOT NULL,
  total_marks REAL NOT NULL,
  negative_marking REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mock_tests_slug ON mock_tests(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mock_tests_list ON mock_tests(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_tests_deleted ON mock_tests(deleted_at);

CREATE TABLE IF NOT EXISTS mock_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES mock_tests(id),
  position INTEGER NOT NULL DEFAULT 0,
  section TEXT,
  question_en TEXT NOT NULL,
  question_or TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  image_media_key TEXT,
  marks REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mock_questions_test ON mock_questions(test_id, position);
CREATE INDEX IF NOT EXISTS idx_mock_questions_deleted ON mock_questions(deleted_at);
