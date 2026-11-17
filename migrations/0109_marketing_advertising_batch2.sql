-- 0109_marketing_advertising_batch2.sql
-- Marketing & Advertising Batch 2 (v109): Modules 05-08
-- 05 Referral Tracking | 06 Campaign Analytics | 07 UTM Management | 08 Social Sharing

CREATE TABLE IF NOT EXISTS mkt_referrals (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL UNIQUE,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'campus_ambassador' CHECK (partner_type IN ('campus_ambassador', 'educator_creator', 'coaching_partner', 'telegram_channel', 'alumni_network')),
  district_odisha TEXT NOT NULL DEFAULT 'Khordha',
  destination_path TEXT NOT NULL DEFAULT '/study-library/',
  clicks_count INTEGER NOT NULL DEFAULT 0,
  signups_attributed INTEGER NOT NULL DEFAULT 0,
  paid_conversions INTEGER NOT NULL DEFAULT 0,
  reward_paise_per_conv INTEGER NOT NULL DEFAULT 0,
  total_commission_paise INTEGER NOT NULL DEFAULT 0,
  referral_status TEXT NOT NULL DEFAULT 'active' CHECK (referral_status IN ('active', 'paused', 'capped', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_referrals_status ON mkt_referrals(partner_type, referral_status);

CREATE TABLE IF NOT EXISTS mkt_campaign_analytics (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES mkt_campaigns(id) ON DELETE CASCADE,
  bucket_date TEXT NOT NULL,
  channel_key TEXT NOT NULL DEFAULT 'portal_banners' CHECK (channel_key IN ('portal_banners', 'email_digest', 'telegram', 'whatsapp_waba', 'social_organic')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  paid_conversions INTEGER NOT NULL DEFAULT 0,
  spend_paise INTEGER NOT NULL DEFAULT 0,
  attributed_revenue_paise INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_analytics_cmp ON mkt_campaign_analytics(campaign_id, bucket_date DESC, channel_key);

CREATE TABLE IF NOT EXISTS mkt_utm_links (
  id TEXT PRIMARY KEY,
  utm_code TEXT NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT 'https://csodisha.com/study-library/',
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_term TEXT NOT NULL DEFAULT '',
  utm_content TEXT NOT NULL DEFAULT '',
  full_tagged_url TEXT NOT NULL,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  governance_status TEXT NOT NULL DEFAULT 'approved_canonical' CHECK (governance_status IN ('approved_canonical', 'draft', 'deprecated')),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_utm_status ON mkt_utm_links(governance_status, utm_source);

CREATE TABLE IF NOT EXISTS mkt_social_share_cards (
  id TEXT PRIMARY KEY,
  card_code TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL DEFAULT '/study-library/',
  platform_preset TEXT NOT NULL DEFAULT 'universal_og' CHECK (platform_preset IN ('universal_og', 'whatsapp_preview', 'telegram_instant', 'x_twitter', 'linkedin')),
  og_title_en TEXT NOT NULL,
  og_title_or TEXT NOT NULL DEFAULT '',
  og_description_en TEXT NOT NULL DEFAULT '',
  og_description_or TEXT NOT NULL DEFAULT '',
  og_image_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/brand/cso-og-default.png',
  share_cta_text_en TEXT NOT NULL DEFAULT 'Share with Aspirants',
  share_cta_text_or TEXT NOT NULL DEFAULT 'ସାଥୀଙ୍କ ସହ ସେୟାର୍ କରନ୍ତୁ',
  shares_count INTEGER NOT NULL DEFAULT 0,
  clickbacks_count INTEGER NOT NULL DEFAULT 0,
  card_status TEXT NOT NULL DEFAULT 'active_live' CHECK (card_status IN ('active_live', 'draft', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mkt_social_status ON mkt_social_share_cards(platform_preset, card_status);
