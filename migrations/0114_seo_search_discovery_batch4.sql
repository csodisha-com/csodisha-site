-- 0114_seo_search_discovery_batch4.sql
-- SEO, Search & Discovery Batch 4 (v114): Modules 13-16
-- 13 Rich Snippet Previewer | 14 Internal Link Graph | 15 Slug Transliterator | 16 Search Intent Analytics

CREATE TABLE IF NOT EXISTS seo_rich_snippet_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  portal_section TEXT NOT NULL DEFAULT 'home',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  og_image_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/brand/cso-og-default.png',
  schema_badge_type TEXT NOT NULL DEFAULT 'Article' CHECK (schema_badge_type IN ('JobPosting', 'GovernmentService', 'Quiz', 'FAQPage', 'Article')),
  breadcrumb_trail TEXT NOT NULL DEFAULT '',
  serp_pixel_width_est INTEGER NOT NULL DEFAULT 0,
  og_card_readiness TEXT NOT NULL DEFAULT 'optimal_ready' CHECK (og_card_readiness IN ('optimal_ready', 'title_truncated', 'missing_og_image')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_snp_portal ON seo_rich_snippet_snapshots(portal_section, og_card_readiness);

CREATE TABLE IF NOT EXISTS seo_internal_link_nodes (
  id TEXT PRIMARY KEY,
  node_path TEXT NOT NULL UNIQUE,
  page_title_en TEXT NOT NULL,
  portal_section TEXT NOT NULL DEFAULT 'home',
  inbound_links_count INTEGER NOT NULL DEFAULT 0,
  outbound_links_count INTEGER NOT NULL DEFAULT 0,
  click_depth_from_home INTEGER NOT NULL DEFAULT 1,
  link_equity_score INTEGER NOT NULL DEFAULT 50,
  is_orphan_node INTEGER NOT NULL DEFAULT 0,
  recommended_parent_hub TEXT NOT NULL DEFAULT '/',
  resolution_status TEXT NOT NULL DEFAULT 'healthy_connected' CHECK (resolution_status IN ('healthy_connected', 'orphan_detected', 'linked_to_hub', 'ignored_archive')),
  last_scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_nodes_status ON seo_internal_link_nodes(resolution_status, is_orphan_node);

CREATE TABLE IF NOT EXISTS seo_slug_transliteration_rules (
  id TEXT PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,
  script_family TEXT NOT NULL DEFAULT 'odia_unicode' CHECK (script_family IN ('odia_unicode', 'cyrillic_unicode', 'devanagari_unicode', 'latin_diacritics')),
  source_sample TEXT NOT NULL,
  normalized_slug TEXT NOT NULL,
  strip_stopwords INTEGER NOT NULL DEFAULT 1,
  max_slug_length INTEGER NOT NULL DEFAULT 80,
  enforce_lowercase_ascii INTEGER NOT NULL DEFAULT 1,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_trn_family ON seo_slug_transliteration_rules(script_family, is_active);

CREATE TABLE IF NOT EXISTS seo_search_intent_metrics (
  id TEXT PRIMARY KEY,
  intent_code TEXT NOT NULL UNIQUE,
  query_cluster TEXT NOT NULL,
  intent_bucket TEXT NOT NULL DEFAULT 'exam_syllabus_pyq' CHECK (intent_bucket IN ('exam_syllabus_pyq', 'job_notification_apply', 'welfare_scheme_eligibility', 'mock_test_practice', 'navigational_portal')),
  lang_script TEXT NOT NULL DEFAULT 'mixed_bilingual' CHECK (lang_script IN ('en', 'or', 'mixed_bilingual')),
  impressions_30d INTEGER NOT NULL DEFAULT 0,
  search_clicks_30d INTEGER NOT NULL DEFAULT 0,
  ctr_pct INTEGER NOT NULL DEFAULT 0,
  avg_result_rank_x10 INTEGER NOT NULL DEFAULT 15,
  zero_result_rate_pct INTEGER NOT NULL DEFAULT 0,
  trend_direction TEXT NOT NULL DEFAULT 'steady' CHECK (trend_direction IN ('rising', 'steady', 'seasonal_peak')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_int_bucket ON seo_search_intent_metrics(intent_bucket, lang_script);
