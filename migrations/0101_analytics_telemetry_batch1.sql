-- 0101_analytics_telemetry_batch1.sql
-- Analytics, Telemetry & User Feedback Intelligence Batch 1 (v101): Modules 01-04
-- 01 Zero-Cookie Edge Telemetry | 02 Top Search Intent | 03 Zero-Result & Auto-Synonyms | 04 PYQ/Syllabus Download Metrics

CREATE TABLE IF NOT EXISTS at_edge_pageviews (
  id TEXT PRIMARY KEY,
  bucket_date TEXT NOT NULL,
  route_path TEXT NOT NULL,
  portal_section TEXT NOT NULL DEFAULT 'home' CHECK (portal_section IN ('study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home')),
  lang_mode TEXT NOT NULL DEFAULT 'en' CHECK (lang_mode IN ('en', 'or')),
  device_class TEXT NOT NULL DEFAULT 'mobile' CHECK (device_class IN ('mobile', 'desktop', 'tablet')),
  district_odisha TEXT NOT NULL DEFAULT 'Khordha',
  views_count INTEGER NOT NULL DEFAULT 1,
  unique_session_hashes INTEGER NOT NULL DEFAULT 1,
  avg_ttfb_ms INTEGER NOT NULL DEFAULT 42,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_pageviews_bucket ON at_edge_pageviews(bucket_date DESC, portal_section, views_count DESC);

CREATE TABLE IF NOT EXISTS at_search_queries (
  id TEXT PRIMARY KEY,
  normalized_query TEXT NOT NULL UNIQUE,
  display_query TEXT NOT NULL,
  portal_scope TEXT NOT NULL DEFAULT 'all' CHECK (portal_scope IN ('all', 'study-library', 'jobs-careers', 'schemes', 'mock-tests')),
  lang_script TEXT NOT NULL DEFAULT 'latin_en' CHECK (lang_script IN ('latin_en', 'odia_or')),
  search_count INTEGER NOT NULL DEFAULT 1,
  last_result_count INTEGER NOT NULL DEFAULT 0,
  is_zero_result INTEGER NOT NULL DEFAULT 0,
  trend_delta_pct INTEGER NOT NULL DEFAULT 0,
  mapped_synonym_target TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'active_trending' CHECK (resolution_status IN ('active_trending', 'zero_open', 'synonym_mapped', 'ignored')),
  last_searched_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_search_rank ON at_search_queries(resolution_status, search_count DESC, is_zero_result);

CREATE TABLE IF NOT EXISTS at_search_synonyms (
  id TEXT PRIMARY KEY,
  source_term TEXT NOT NULL UNIQUE,
  canonical_query TEXT NOT NULL,
  target_url TEXT NOT NULL DEFAULT '',
  boost_weight INTEGER NOT NULL DEFAULT 10,
  hit_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_synonyms_active ON at_search_synonyms(is_active, boost_weight DESC);

CREATE TABLE IF NOT EXISTS at_download_metrics (
  id TEXT PRIMARY KEY,
  bucket_date TEXT NOT NULL,
  resource_slug TEXT NOT NULL,
  resource_title_en TEXT NOT NULL,
  resource_title_or TEXT NOT NULL DEFAULT '',
  material_type TEXT NOT NULL DEFAULT 'pyq_paper' CHECK (material_type IN ('pyq_paper', 'exam_syllabus', 'study_notes', 'model_mock', 'govt_notification')),
  exam_tag TEXT NOT NULL DEFAULT 'OPSC OAS',
  downloads_count INTEGER NOT NULL DEFAULT 1,
  unique_downloaders_approx INTEGER NOT NULL DEFAULT 1,
  avg_file_kb INTEGER NOT NULL DEFAULT 512,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_downloads_rank ON at_download_metrics(material_type, exam_tag, downloads_count DESC);

CREATE TABLE IF NOT EXISTS at_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_rev_lookup ON at_revisions(module_code, entity_id, version_num DESC);
