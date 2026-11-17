-- 0113_seo_search_discovery_batch3.sql
-- SEO, Search & Discovery Batch 3 (v113): Modules 09-12
-- 09 Autocomplete & Typo Rules | 10 Zero-Result Fallbacks | 11 IndexNow & GSC | 12 Edge Pre-Render Hints

CREATE TABLE IF NOT EXISTS seo_autocomplete_rules (
  id TEXT PRIMARY KEY,
  suggestion_code TEXT NOT NULL UNIQUE,
  trigger_prefix TEXT NOT NULL,
  suggestion_label_en TEXT NOT NULL,
  suggestion_label_or TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL,
  portal_badge TEXT NOT NULL DEFAULT 'Study Library' CHECK (portal_badge IN ('Study Library', 'Jobs & Careers', 'Odisha Schemes', 'Mock Tests')),
  typo_variants_json TEXT NOT NULL DEFAULT '[]',
  max_edit_distance INTEGER NOT NULL DEFAULT 1 CHECK (max_edit_distance IN (0, 1, 2)),
  popularity_score INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_ac_prefix ON seo_autocomplete_rules(is_active, trigger_prefix);

CREATE TABLE IF NOT EXISTS seo_zero_result_fallbacks (
  id TEXT PRIMARY KEY,
  fallback_code TEXT NOT NULL UNIQUE,
  unmatched_query_pattern TEXT NOT NULL,
  fallback_strategy TEXT NOT NULL DEFAULT 'curated_cards' CHECK (fallback_strategy IN ('curated_cards', 'broad_portal_redirect', 'related_exam_hub')),
  fallback_title_en TEXT NOT NULL,
  fallback_title_or TEXT NOT NULL DEFAULT '',
  recommended_links_json TEXT NOT NULL DEFAULT '[]',
  trigger_hits_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active_live' CHECK (status IN ('active_live', 'draft', 'archived')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_zrf_status ON seo_zero_result_fallbacks(status, fallback_strategy);

CREATE TABLE IF NOT EXISTS seo_indexnow_submissions (
  id TEXT PRIMARY KEY,
  batch_code TEXT NOT NULL UNIQUE,
  engine_target TEXT NOT NULL DEFAULT 'indexnow_bing_yandex' CHECK (engine_target IN ('indexnow_bing_yandex', 'google_indexing_api', 'sitemap_ping_all')),
  action_type TEXT NOT NULL DEFAULT 'URL_UPDATED' CHECK (action_type IN ('URL_UPDATED', 'URL_DELETED', 'SITEMAP_RESUBMIT')),
  urls_json TEXT NOT NULL DEFAULT '[]',
  url_count INTEGER NOT NULL DEFAULT 0,
  key_masked_hint TEXT NOT NULL DEFAULT 'cso-idx-••••9a4f',
  http_status_code INTEGER NOT NULL DEFAULT 200,
  submission_status TEXT NOT NULL DEFAULT 'accepted_200' CHECK (submission_status IN ('accepted_200', 'queued_batch', 'validation_failed')),
  response_note TEXT NOT NULL DEFAULT '',
  submitted_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_idx_engine ON seo_indexnow_submissions(engine_target, submission_status);

CREATE TABLE IF NOT EXISTS seo_edge_prerender_hints (
  id TEXT PRIMARY KEY,
  hint_code TEXT NOT NULL UNIQUE,
  route_pattern TEXT NOT NULL UNIQUE,
  edge_cache_ttl_sec INTEGER NOT NULL DEFAULT 300,
  stale_while_revalidate_sec INTEGER NOT NULL DEFAULT 600,
  speculation_prerender_urls_json TEXT NOT NULL DEFAULT '[]',
  preconnect_origins_json TEXT NOT NULL DEFAULT '[]',
  lcp_image_preload_hint TEXT NOT NULL DEFAULT '',
  priority_tier TEXT NOT NULL DEFAULT 'standard_edge' CHECK (priority_tier IN ('critical_lcp', 'standard_edge', 'dynamic_bypass')),
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_edge_tier ON seo_edge_prerender_hints(priority_tier, is_active);
