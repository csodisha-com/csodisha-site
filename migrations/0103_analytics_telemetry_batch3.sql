-- 0103_analytics_telemetry_batch3.sql
-- Analytics, Telemetry & User Feedback Intelligence Batch 3 (v103): Modules 09-12
-- 09 Outbound Referrals | 10 Exam Funnels | 11 Bilingual Usage | 12 Community Engagement Index

CREATE TABLE IF NOT EXISTS at_outbound_referrals (
  id TEXT PRIMARY KEY,
  authority_key TEXT NOT NULL CHECK (authority_key IN ('opsc', 'ossc', 'osssc', 'nta_ugc_net', 'sams_odisha', 'odisha_gov_schemes', 'bse_chse_odisha')),
  authority_name_en TEXT NOT NULL,
  authority_name_or TEXT NOT NULL DEFAULT '',
  official_domain TEXT NOT NULL,
  source_portal_section TEXT NOT NULL DEFAULT 'jobs-careers' CHECK (source_portal_section IN ('jobs-careers', 'schemes', 'study-library', 'educational-tools')),
  link_category TEXT NOT NULL DEFAULT 'apply_online' CHECK (link_category IN ('apply_online', 'official_notification_pdf', 'admit_card', 'result_merit_list', 'scheme_portal')),
  clicks_7d INTEGER NOT NULL DEFAULT 0,
  clicks_30d INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_official_ssl INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_outbound_auth ON at_outbound_referrals(authority_key, link_category, clicks_30d DESC);

CREATE TABLE IF NOT EXISTS at_exam_funnels (
  id TEXT PRIMARY KEY,
  funnel_key TEXT NOT NULL UNIQUE CHECK (funnel_key IN ('opsc_oas_2026', 'ossc_cgl_2026', 'osssc_ri_ari_2026', 'ugc_net_dec_2026', 'odisha_teacher_tet')),
  exam_title_en TEXT NOT NULL,
  exam_title_or TEXT NOT NULL DEFAULT '',
  stage_1_discovery_views INTEGER NOT NULL DEFAULT 0,
  stage_2_syllabus_reads INTEGER NOT NULL DEFAULT 0,
  stage_3_pyq_downloads INTEGER NOT NULL DEFAULT 0,
  stage_4_mock_attempts INTEGER NOT NULL DEFAULT 0,
  stage_5_official_apply_clicks INTEGER NOT NULL DEFAULT 0,
  biggest_dropoff_stage TEXT NOT NULL DEFAULT 'mock_attempts',
  optimization_note_en TEXT NOT NULL DEFAULT '',
  optimization_note_or TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_funnel_key ON at_exam_funnels(funnel_key);

CREATE TABLE IF NOT EXISTS at_bilingual_usage (
  id TEXT PRIMARY KEY,
  portal_section TEXT NOT NULL UNIQUE CHECK (portal_section IN ('study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home')),
  section_label_en TEXT NOT NULL,
  section_label_or TEXT NOT NULL DEFAULT '',
  english_views INTEGER NOT NULL DEFAULT 0,
  odia_views INTEGER NOT NULL DEFAULT 0,
  bilingual_toggle_switches INTEGER NOT NULL DEFAULT 0,
  odia_share_pct INTEGER NOT NULL DEFAULT 0,
  top_odia_topic TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_bilingual_share ON at_bilingual_usage(odia_share_pct DESC);

CREATE TABLE IF NOT EXISTS at_community_engagement_index (
  id TEXT PRIMARY KEY,
  bucket_week TEXT NOT NULL UNIQUE,
  posts_created INTEGER NOT NULL DEFAULT 0,
  forum_threads_created INTEGER NOT NULL DEFAULT 0,
  questions_asked INTEGER NOT NULL DEFAULT 0,
  verified_mentor_answers INTEGER NOT NULL DEFAULT 0,
  knowledge_notes_shared INTEGER NOT NULL DEFAULT 0,
  active_contributors INTEGER NOT NULL DEFAULT 0,
  engagement_index_score INTEGER NOT NULL DEFAULT 0,
  top_active_district TEXT NOT NULL DEFAULT 'Khordha',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_comm_idx_week ON at_community_engagement_index(bucket_week DESC);
