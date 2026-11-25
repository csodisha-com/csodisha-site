-- Phase 2 (v311): Publishing Velocity, Lifecycle Fields, Offline Study Packs & Operational Radars
-- Strictly additive migration: zero table drops, zero column renames.

-- 1. Unified Recruitment Lifecycle & Scheduling/Expiry fields on job_articles
ALTER TABLE job_articles ADD COLUMN publish_at TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN expires_at TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN notification_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN apply_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN admit_card_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN answer_key_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN result_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_articles ADD COLUMN corrigendum_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_job_articles_publish_expires ON job_articles (is_published, publish_at, expires_at);

-- 2. Scheduling, Expiry, District Targeting & Required Document Vault keys on scheme_articles
ALTER TABLE scheme_articles ADD COLUMN publish_at TEXT NOT NULL DEFAULT '';
ALTER TABLE scheme_articles ADD COLUMN expires_at TEXT NOT NULL DEFAULT '';
ALTER TABLE scheme_articles ADD COLUMN district_codes TEXT NOT NULL DEFAULT '';
ALTER TABLE scheme_articles ADD COLUMN required_docs TEXT NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_scheme_articles_publish_expires ON scheme_articles (is_published, publish_at, expires_at);

-- 3. Offline Low-Bandwidth PWA Study Pack flag on study_articles
ALTER TABLE study_articles ADD COLUMN offline_pack INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_study_articles_offline_pack ON study_articles (is_published, offline_pack, updated_at DESC);

-- 4. Broken .gov.in Link Sentinel real HTTP scan records
CREATE TABLE IF NOT EXISTS link_health_checks (
  id TEXT PRIMARY KEY,
  pillar TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_slug TEXT NOT NULL DEFAULT '',
  item_title TEXT NOT NULL DEFAULT '',
  field_name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  http_status INTEGER NOT NULL DEFAULT 0,
  is_broken INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_link_health_broken ON link_health_checks (is_broken, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_health_item ON link_health_checks (pillar, item_id);

-- 5. Real "Zero-Result" Visitor Search Log (zero synthetic rows)
CREATE TABLE IF NOT EXISTS search_zero_logs (
  query_norm TEXT PRIMARY KEY,
  sample_query TEXT NOT NULL DEFAULT '',
  pillar TEXT NOT NULL DEFAULT 'all',
  hits INTEGER NOT NULL DEFAULT 1,
  last_searched_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_search_zero_active_hits ON search_zero_logs (resolved_at, hits DESC, last_searched_at DESC);
