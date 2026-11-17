-- 0108_marketing_advertising_batch1.sql
-- Marketing & Advertising Batch 1 (v108): Modules 01-04
-- 01 Advertising Placements | 02 Sponsors | 03 Promotional Banners | 04 Campaigns

CREATE TABLE IF NOT EXISTS mkt_ad_placements (
  id TEXT PRIMARY KEY,
  slot_code TEXT NOT NULL UNIQUE,
  slot_name_en TEXT NOT NULL,
  slot_name_or TEXT NOT NULL DEFAULT '',
  portal_section TEXT NOT NULL DEFAULT 'study-library' CHECK (portal_section IN ('study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home')),
  position_zone TEXT NOT NULL DEFAULT 'top_leaderboard' CHECK (position_zone IN ('top_leaderboard', 'sidebar_card', 'in_feed_native', 'pdf_viewer_footer', 'mock_test_interstitial')),
  dimensions_label TEXT NOT NULL DEFAULT '728x90 / Responsive',
  pricing_model TEXT NOT NULL DEFAULT 'cpm_paise' CHECK (pricing_model IN ('cpm_paise', 'cpc_paise', 'flat_weekly_paise')),
  rate_paise INTEGER NOT NULL DEFAULT 0,
  max_concurrent_ads INTEGER NOT NULL DEFAULT 2,
  impressions_30d INTEGER NOT NULL DEFAULT 0,
  clicks_30d INTEGER NOT NULL DEFAULT 0,
  slot_status TEXT NOT NULL DEFAULT 'active' CHECK (slot_status IN ('active', 'paused', 'reserved_sponsor', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_placements_section ON mkt_ad_placements(portal_section, slot_status);

CREATE TABLE IF NOT EXISTS mkt_sponsors (
  id TEXT PRIMARY KEY,
  sponsor_code TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  brand_display_en TEXT NOT NULL,
  brand_display_or TEXT NOT NULL DEFAULT '',
  sponsor_category TEXT NOT NULL DEFAULT 'odisha_edtech_institute' CHECK (sponsor_category IN ('odisha_edtech_institute', 'university_college', 'book_publisher', 'skill_academy', 'csr_foundation')),
  contact_person TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  gstin_masked TEXT NOT NULL DEFAULT '',
  sponsorship_tier TEXT NOT NULL DEFAULT 'portal_sponsor' CHECK (sponsorship_tier IN ('title_partner', 'gold_sponsor', 'portal_sponsor', 'scholarship_supporter')),
  contract_value_paise INTEGER NOT NULL DEFAULT 0,
  amount_paid_paise INTEGER NOT NULL DEFAULT 0,
  logo_url TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  contract_start_date TEXT NOT NULL DEFAULT '',
  contract_end_date TEXT NOT NULL DEFAULT '',
  sponsor_status TEXT NOT NULL DEFAULT 'active' CHECK (sponsor_status IN ('active', 'pending_approval', 'renewal_due', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_sponsors_status ON mkt_sponsors(sponsor_status, sponsorship_tier);

CREATE TABLE IF NOT EXISTS mkt_campaigns (
  id TEXT PRIMARY KEY,
  campaign_code TEXT NOT NULL UNIQUE,
  sponsor_id TEXT REFERENCES mkt_sponsors(id) ON DELETE SET NULL,
  campaign_name_en TEXT NOT NULL,
  campaign_name_or TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT 'mock_test_enrollment' CHECK (objective IN ('mock_test_enrollment', 'study_library_traffic', 'sponsor_brand_awareness', 'scholarship_drive', 'app_pwa_install')),
  channels_json TEXT NOT NULL DEFAULT '["portal_banners","email_digest"]',
  target_exam_audience TEXT NOT NULL DEFAULT 'All Odisha Aspirants' CHECK (target_exam_audience IN ('OPSC OAS', 'OSSC/OSSSC', 'UGC NET', 'CHSE +2', 'All Odisha Aspirants')),
  budget_paise INTEGER NOT NULL DEFAULT 0,
  spent_paise INTEGER NOT NULL DEFAULT 0,
  target_conversions INTEGER NOT NULL DEFAULT 0,
  actual_conversions INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  campaign_status TEXT NOT NULL DEFAULT 'draft' CHECK (campaign_status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status ON mkt_campaigns(campaign_status, objective);

CREATE TABLE IF NOT EXISTS mkt_promo_banners (
  id TEXT PRIMARY KEY,
  banner_code TEXT NOT NULL UNIQUE,
  placement_id TEXT REFERENCES mkt_ad_placements(id) ON DELETE SET NULL,
  sponsor_id TEXT REFERENCES mkt_sponsors(id) ON DELETE SET NULL,
  campaign_id TEXT REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
  headline_en TEXT NOT NULL,
  headline_or TEXT NOT NULL DEFAULT '',
  subcopy_en TEXT NOT NULL DEFAULT '',
  subcopy_or TEXT NOT NULL DEFAULT '',
  cta_label_en TEXT NOT NULL DEFAULT 'Learn More',
  cta_label_or TEXT NOT NULL DEFAULT 'ଅଧିକ ଜାଣନ୍ତୁ',
  target_url TEXT NOT NULL DEFAULT 'https://csodisha.com/',
  badge_tag_en TEXT NOT NULL DEFAULT 'Sponsored',
  badge_tag_or TEXT NOT NULL DEFAULT 'ପ୍ରାୟୋଜିତ',
  theme_variant TEXT NOT NULL DEFAULT 'forest_gold' CHECK (theme_variant IN ('forest_gold', 'alabaster_emerald', 'amber_highlight', 'royal_indigo')),
  impressions_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  priority_weight INTEGER NOT NULL DEFAULT 10,
  banner_status TEXT NOT NULL DEFAULT 'draft' CHECK (banner_status IN ('draft', 'scheduled', 'active_live', 'paused', 'archived')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_banners_status ON mkt_promo_banners(banner_status, priority_weight DESC);

CREATE TABLE IF NOT EXISTS mkt_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_rev_lookup ON mkt_revisions(module_code, entity_id, version_num DESC);
