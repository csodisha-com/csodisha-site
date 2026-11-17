-- 0110_marketing_advertising_batch3.sql
-- Marketing & Advertising Batch 3 (v110): Modules 09-10
-- 09 Promotional Landing Pages | 10 Advertising Reports

CREATE TABLE IF NOT EXISTS mkt_promo_landing_pages (
  id TEXT PRIMARY KEY,
  page_code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  campaign_id TEXT REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
  sponsor_id TEXT REFERENCES mkt_sponsors(id) ON DELETE SET NULL,
  hero_badge_en TEXT NOT NULL DEFAULT 'Odisha Exam Special',
  hero_badge_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ପରୀକ୍ଷା ବିଶେଷ',
  hero_title_en TEXT NOT NULL,
  hero_title_or TEXT NOT NULL DEFAULT '',
  hero_subtitle_en TEXT NOT NULL DEFAULT '',
  hero_subtitle_or TEXT NOT NULL DEFAULT '',
  highlights_json TEXT NOT NULL DEFAULT '[]',
  primary_cta_label_en TEXT NOT NULL DEFAULT 'Explore Now',
  primary_cta_label_or TEXT NOT NULL DEFAULT 'ବର୍ତ୍ତମାନ ଦେଖନ୍ତୁ',
  primary_cta_url TEXT NOT NULL DEFAULT 'https://csodisha.com/study-library/',
  theme_variant TEXT NOT NULL DEFAULT 'forest_gold' CHECK (theme_variant IN ('forest_gold', 'alabaster_emerald', 'amber_highlight', 'royal_indigo')),
  views_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  page_status TEXT NOT NULL DEFAULT 'draft' CHECK (page_status IN ('draft', 'published_live', 'scheduled', 'archived')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_lp_status ON mkt_promo_landing_pages(page_status, slug);

CREATE TABLE IF NOT EXISTS mkt_advertising_reports (
  id TEXT PRIMARY KEY,
  report_code TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL DEFAULT 'sponsor_roi_statement' CHECK (report_type IN ('sponsor_roi_statement', 'campaign_performance_ledger', 'placement_yield_audit', 'referral_commission_payouts', 'utm_channel_attribution')),
  period_label TEXT NOT NULL DEFAULT '2026-Q4 / Nov 2026',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_metrics_json TEXT NOT NULL DEFAULT '{}',
  rows_snapshot_json TEXT NOT NULL DEFAULT '[]',
  generated_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_reports_type ON mkt_advertising_reports(report_type, created_at DESC);
