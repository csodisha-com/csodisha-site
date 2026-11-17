-- Settings & Configuration Batch 1 (v121): Modules 01-04
-- 01 General Website Settings | 02 Website Identity | 03 Contact Information | 04 Localization

CREATE TABLE IF NOT EXISTS cfg_general_settings (
  id TEXT PRIMARY KEY,
  site_name_en TEXT NOT NULL DEFAULT 'CS Odisha (Common Sense Odisha)',
  site_name_or TEXT NOT NULL DEFAULT 'ସିଏସ୍ ଓଡ଼ିଶା (କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା)',
  tagline_en TEXT NOT NULL DEFAULT 'Odisha Government Jobs, Competitive Exams & Citizen Schemes Portal',
  tagline_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି, ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା ଏବଂ ଯୋଜନା ପୋର୍ଟାଲ୍',
  canonical_origin TEXT NOT NULL DEFAULT 'https://csodisha.com',
  site_mode TEXT NOT NULL DEFAULT 'live_production',
  maintenance_banner_en TEXT NOT NULL DEFAULT '',
  maintenance_banner_or TEXT NOT NULL DEFAULT '',
  allow_search_indexing INTEGER NOT NULL DEFAULT 1,
  pwa_offline_enabled INTEGER NOT NULL DEFAULT 1,
  copyright_notice_en TEXT NOT NULL DEFAULT '© 2026 CS Odisha. All rights reserved.',
  copyright_notice_or TEXT NOT NULL DEFAULT '© ୨୦୨୬ CS ଓଡ଼ିଶା। ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ।',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_website_identity (
  id TEXT PRIMARY KEY,
  brand_short_code TEXT NOT NULL DEFAULT 'CSO',
  primary_palette_name TEXT NOT NULL DEFAULT 'Warm Alabaster & Deep Forest Green',
  primary_hex TEXT NOT NULL DEFAULT '#1B4332',
  surface_hex TEXT NOT NULL DEFAULT '#FAF9F6',
  accent_hex TEXT NOT NULL DEFAULT '#D97706',
  logo_light_url TEXT NOT NULL DEFAULT '/assets/logo-light.svg',
  logo_dark_url TEXT NOT NULL DEFAULT '/assets/logo-dark.svg',
  favicon_svg_url TEXT NOT NULL DEFAULT '/assets/favicon.svg',
  apple_touch_icon_url TEXT NOT NULL DEFAULT '/assets/apple-touch-icon.png',
  og_default_banner_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/og-default.png',
  founder_credit_en TEXT NOT NULL DEFAULT 'Founded by Ramesh Biswal · Odisha',
  founder_credit_or TEXT NOT NULL DEFAULT 'ପ୍ରତିଷ୍ଠାତା: ରମେଶ ବିଶ୍ୱାଳ · ଓଡ଼ିଶା',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_contact_information (
  id TEXT PRIMARY KEY,
  support_email TEXT NOT NULL DEFAULT 'support@csodisha.com',
  editorial_email TEXT NOT NULL DEFAULT 'editorial@csodisha.com',
  grievance_officer_name TEXT NOT NULL DEFAULT 'Ramesh Biswal (DPDP Grievance Officer)',
  grievance_email TEXT NOT NULL DEFAULT 'privacy@csodisha.com',
  helpline_phone_display TEXT NOT NULL DEFAULT '+91-6782-••••90',
  whatsapp_channel_url TEXT NOT NULL DEFAULT 'https://whatsapp.com/channel/csodisha',
  telegram_channel_url TEXT NOT NULL DEFAULT 'https://t.me/csodisha_official',
  youtube_channel_url TEXT NOT NULL DEFAULT 'https://youtube.com/@csodisha',
  x_twitter_url TEXT NOT NULL DEFAULT 'https://x.com/csodisha',
  instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com/csodisha',
  office_locality_en TEXT NOT NULL DEFAULT 'Basta, Balasore, Odisha 756029, India',
  office_locality_or TEXT NOT NULL DEFAULT 'ବସ୍ତା, ବାଲେଶ୍ୱର, ଓଡ଼ିଶା ୭୫୬୦୨୯, ଭାରତ',
  support_hours_ist TEXT NOT NULL DEFAULT 'Mon–Sat · 09:30 AM – 06:30 PM IST',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_localization_settings (
  id TEXT PRIMARY KEY,
  default_country_code TEXT NOT NULL DEFAULT 'IN',
  default_state_region TEXT NOT NULL DEFAULT 'Odisha (OD)',
  default_locale TEXT NOT NULL DEFAULT 'en-IN',
  secondary_locale TEXT NOT NULL DEFAULT 'or-IN',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  number_grouping_system TEXT NOT NULL DEFAULT 'indian_lakhs_crores',
  first_day_of_week TEXT NOT NULL DEFAULT 'monday',
  auto_detect_odia_script INTEGER NOT NULL DEFAULT 1,
  bilingual_toggle_visible INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cfg_rev_entity
  ON cfg_revisions(module_code, entity_id, version_num DESC);
