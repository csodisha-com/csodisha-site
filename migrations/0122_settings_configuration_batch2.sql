-- Settings & Configuration Batch 2 (v122): Modules 05-08
-- 05 Languages | 06 Time Zone | 07 Date & Number Formats | 08 Homepage Settings

CREATE TABLE IF NOT EXISTS cfg_languages (
  id TEXT PRIMARY KEY,
  lang_code TEXT NOT NULL UNIQUE,
  iso_639_1 TEXT NOT NULL DEFAULT 'en',
  english_name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  script_name TEXT NOT NULL DEFAULT 'Latin',
  direction TEXT NOT NULL DEFAULT 'ltr',
  fallback_lang_code TEXT NOT NULL DEFAULT 'en-IN',
  translation_coverage_pct INTEGER NOT NULL DEFAULT 100,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_timezone_settings (
  id TEXT PRIMARY KEY,
  iana_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  tz_abbreviation TEXT NOT NULL DEFAULT 'IST',
  utc_offset_label TEXT NOT NULL DEFAULT 'UTC+05:30',
  enforce_ist_on_deadlines INTEGER NOT NULL DEFAULT 1,
  show_ist_badge_on_timers INTEGER NOT NULL DEFAULT 1,
  academic_session_start_month INTEGER NOT NULL DEFAULT 4,
  academic_session_label TEXT NOT NULL DEFAULT '2026-27 (Apr – Mar)',
  ntp_sync_note TEXT NOT NULL DEFAULT 'Cloudflare Edge Worker Clock (IST +05:30)',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_date_number_formats (
  id TEXT PRIMARY KEY,
  date_format_pattern TEXT NOT NULL DEFAULT 'DD-MM-YYYY',
  time_format_pattern TEXT NOT NULL DEFAULT '12h_am_pm',
  datetime_separator TEXT NOT NULL DEFAULT ' · ',
  number_grouping TEXT NOT NULL DEFAULT 'indian_lakhs_crores',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  currency_position TEXT NOT NULL DEFAULT 'prefix_no_space',
  decimal_places INTEGER NOT NULL DEFAULT 2,
  odia_numerals_mode TEXT NOT NULL DEFAULT 'latin_digits_default',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_homepage_settings (
  id TEXT PRIMARY KEY,
  hero_badge_en TEXT NOT NULL DEFAULT 'Odisha Education, Exams & Welfare Portal',
  hero_badge_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ଶିକ୍ଷା, ପରୀକ୍ଷା ଓ ଜନକଲ୍ୟାଣ ପୋର୍ଟାଲ',
  hero_headline_en TEXT NOT NULL DEFAULT 'Your Trusted Odisha Competitive Exam, Jobs & Citizen Schemes Hub',
  hero_headline_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶାର ବିଶ୍ୱସ୍ତ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା, ନିଯୁକ୍ତି ଏବଂ ଯୋଜନା କେନ୍ଦ୍ର',
  hero_subheadline_en TEXT NOT NULL DEFAULT 'Verified OPSC, OSSC, OSSSC schedules, free bilingual mock tests, PYQs, and Odisha DBT schemes in English and ଓଡ଼ିଆ.',
  hero_subheadline_or TEXT NOT NULL DEFAULT 'ଯାଞ୍ଚ ହୋଇଥିବା OPSC, OSSC, OSSSC ସମୟସୂଚୀ, ମାଗଣା ମକ୍ ଟେଷ୍ଟ, PYQ ଏବଂ ଓଡ଼ିଶା DBT ଯୋଜନା।',
  primary_cta_label_en TEXT NOT NULL DEFAULT 'Explore Study Library',
  primary_cta_label_or TEXT NOT NULL DEFAULT 'ଅଧ୍ୟୟନ ପାଠାଗାର ଦେଖନ୍ତୁ',
  primary_cta_url TEXT NOT NULL DEFAULT '/study-library/',
  show_live_deadline_ticker INTEGER NOT NULL DEFAULT 1,
  show_featured_exams_grid INTEGER NOT NULL DEFAULT 1,
  show_odisha_schemes_strip INTEGER NOT NULL DEFAULT 1,
  show_daily_pyq_widget INTEGER NOT NULL DEFAULT 1,
  featured_cards_limit INTEGER NOT NULL DEFAULT 6,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
