-- =============================================================================
-- Migration 0006: Lifecycle Maintenance & Expanded Post Status Constraint
-- Expands posts.status CHECK constraint to allow 'expired' and 'archived' so
-- past-deadline job notifications can transition cleanly to 'expired' during
-- scheduled Cron maintenance while remaining publicly visible for SEO.
-- =============================================================================

CREATE TABLE posts_new (
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'expired', 'archived')),
  published_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

INSERT INTO posts_new (
  id, type, slug, title, title_or, summary, summary_or, body_md, body_md_or,
  category, tags, cover_media_key, event_date, organisation, vacancies,
  qualification, last_date, apply_url, notification_media_key, state,
  status, published_at, created_by, updated_by, created_at, updated_at, deleted_at
)
SELECT
  id, type, slug, title, title_or, summary, summary_or, body_md, body_md_or,
  category, tags, cover_media_key, event_date, organisation, vacancies,
  qualification, last_date, apply_url, notification_media_key, state,
  status, published_at, created_by, updated_by, created_at, updated_at, deleted_at
FROM posts;

DROP TABLE posts;

ALTER TABLE posts_new RENAME TO posts;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_type_slug ON posts(type, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_list ON posts(type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_last_date ON posts(last_date);
CREATE INDEX IF NOT EXISTS idx_posts_deleted ON posts(deleted_at);

-- Indexes for fast Cron maintenance token/session cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
