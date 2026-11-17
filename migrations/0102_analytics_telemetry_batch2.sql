-- 0102_analytics_telemetry_batch2.sql
-- Analytics, Telemetry & User Feedback Intelligence Batch 2 (v102): Modules 05-08
-- 05 District Demographics | 06 Web Vitals & Edge Latency | 07 Citizen CSAT & Sentiment | 08 404 Sentinel Triage

CREATE TABLE IF NOT EXISTS at_district_demographics (
  id TEXT PRIMARY KEY,
  district_code TEXT NOT NULL UNIQUE,
  district_name_en TEXT NOT NULL,
  district_name_or TEXT NOT NULL DEFAULT '',
  rdc_zone TEXT NOT NULL DEFAULT 'Central' CHECK (rdc_zone IN ('Central', 'Northern', 'Southern')),
  active_learners_count INTEGER NOT NULL DEFAULT 0,
  pageviews_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  top_portal_section TEXT NOT NULL DEFAULT 'study-library',
  preferred_lang_share_or_pct INTEGER NOT NULL DEFAULT 35,
  growth_delta_pct INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_dist_zone ON at_district_demographics(rdc_zone, active_learners_count DESC);

CREATE TABLE IF NOT EXISTS at_web_vitals_metrics (
  id TEXT PRIMARY KEY,
  bucket_date TEXT NOT NULL,
  route_group TEXT NOT NULL DEFAULT 'study-library' CHECK (route_group IN ('home', 'study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community')),
  device_class TEXT NOT NULL DEFAULT 'mobile_android' CHECK (device_class IN ('mobile_android', 'mobile_ios', 'desktop', 'tablet')),
  connection_tier TEXT NOT NULL DEFAULT '4g_5g' CHECK (connection_tier IN ('4g_5g', 'broadband_wifi', 'slow_3g_2g')),
  sample_count INTEGER NOT NULL DEFAULT 1,
  p75_ttfb_ms INTEGER NOT NULL DEFAULT 42,
  p75_lcp_ms INTEGER NOT NULL DEFAULT 1450,
  p75_inp_ms INTEGER NOT NULL DEFAULT 85,
  p75_cls_milli INTEGER NOT NULL DEFAULT 35,
  cwv_rating TEXT NOT NULL DEFAULT 'good' CHECK (cwv_rating IN ('good', 'needs_improvement', 'poor')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_cwv_rating ON at_web_vitals_metrics(cwv_rating, device_class, route_group);

CREATE TABLE IF NOT EXISTS at_citizen_feedback (
  id TEXT PRIMARY KEY,
  feedback_code TEXT NOT NULL UNIQUE,
  portal_section TEXT NOT NULL DEFAULT 'study-library',
  page_url TEXT NOT NULL DEFAULT '/',
  csat_score INTEGER NOT NULL DEFAULT 5 CHECK (csat_score >= 1 AND csat_score <= 5),
  sentiment_label TEXT NOT NULL DEFAULT 'positive' CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  topic_tag TEXT NOT NULL DEFAULT 'content_quality' CHECK (topic_tag IN ('content_quality', 'odia_translation', 'site_speed', 'exam_coverage', 'ui_accessibility')),
  comment_text TEXT NOT NULL DEFAULT '',
  lang_mode TEXT NOT NULL DEFAULT 'en' CHECK (lang_mode IN ('en', 'or')),
  district_odisha TEXT NOT NULL DEFAULT 'Khordha',
  triage_status TEXT NOT NULL DEFAULT 'new' CHECK (triage_status IN ('new', 'acknowledged', 'actioned', 'archived')),
  admin_response_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_feedback_triage ON at_citizen_feedback(triage_status, sentiment_label, csat_score);

CREATE TABLE IF NOT EXISTS at_sentinel_404_inbox (
  id TEXT PRIMARY KEY,
  incident_code TEXT NOT NULL UNIQUE,
  missing_path TEXT NOT NULL UNIQUE,
  referrer_path TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL DEFAULT 'edge_404_hit' CHECK (source_kind IN ('edge_404_hit', 'crawler_bot', 'internal_link_audit', 'external_backlink')),
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  suggested_redirect_to TEXT NOT NULL DEFAULT '',
  triage_status TEXT NOT NULL DEFAULT 'open' CHECK (triage_status IN ('open', 'redirect_mapped', 'ignored_bot', 'fixed_source')),
  resolution_note TEXT NOT NULL DEFAULT '',
  resolved_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_404_triage ON at_sentinel_404_inbox(triage_status, hit_count DESC);
