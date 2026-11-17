-- Settings & Configuration Batch 4 (v124): Modules 13-17
-- 13 Registration Settings | 14 Comment Settings | 15 Payment Settings | 16 Environment Status | 17 Administrative Preferences
-- Zero plaintext payment secrets stored; DPDP Act 2023 explicit consent & age guardrails enforced.

CREATE TABLE IF NOT EXISTS cfg_registration_settings (
  id TEXT PRIMARY KEY,
  registration_mode TEXT NOT NULL DEFAULT 'otp_verified_signup',
  auth_methods_json TEXT NOT NULL DEFAULT '[]',
  require_dpdp_explicit_consent INTEGER NOT NULL DEFAULT 1,
  minimum_age_years INTEGER NOT NULL DEFAULT 16,
  default_candidate_role TEXT NOT NULL DEFAULT 'candidate_learner',
  collect_home_district_odisha INTEGER NOT NULL DEFAULT 1,
  session_ttl_hours INTEGER NOT NULL DEFAULT 168,
  max_failed_login_attempts INTEGER NOT NULL DEFAULT 5,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_comment_settings (
  id TEXT PRIMARY KEY,
  comments_enabled_globally INTEGER NOT NULL DEFAULT 1,
  moderation_mode TEXT NOT NULL DEFAULT 'auto_publish_verified_filter_links',
  block_external_urls INTEGER NOT NULL DEFAULT 1,
  odia_english_profanity_filter INTEGER NOT NULL DEFAULT 1,
  max_comment_length_chars INTEGER NOT NULL DEFAULT 1500,
  rate_limit_comments_per_hour INTEGER NOT NULL DEFAULT 10,
  allow_nested_replies_depth INTEGER NOT NULL DEFAULT 2,
  auto_lock_threads_after_days INTEGER NOT NULL DEFAULT 90,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_payment_settings (
  id TEXT PRIMARY KEY,
  primary_gateway TEXT NOT NULL DEFAULT 'razorpay_india',
  gateway_mode TEXT NOT NULL DEFAULT 'live_production',
  key_id_masked_hint TEXT NOT NULL DEFAULT 'rzp_live_••••8f3d',
  key_secret_hash_sha256 TEXT NOT NULL DEFAULT '',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  gst_enabled INTEGER NOT NULL DEFAULT 1,
  gst_rate_bps INTEGER NOT NULL DEFAULT 1800,
  gstin_masked_hint TEXT NOT NULL DEFAULT '21•••••1Z5',
  min_order_paise INTEGER NOT NULL DEFAULT 1000,
  max_order_paise INTEGER NOT NULL DEFAULT 5000000,
  refund_window_days INTEGER NOT NULL DEFAULT 7,
  invoice_prefix TEXT NOT NULL DEFAULT 'CSO-INV-2026-',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_admin_preferences (
  id TEXT PRIMARY KEY,
  admin_ui_density TEXT NOT NULL DEFAULT 'comfortable_alabaster',
  default_admin_landing_module TEXT NOT NULL DEFAULT 'module-18-001',
  table_rows_per_page INTEGER NOT NULL DEFAULT 20,
  confirm_before_destructive_action INTEGER NOT NULL DEFAULT 1,
  show_odia_bilingual_fields_expanded INTEGER NOT NULL DEFAULT 1,
  audit_trail_retention_days INTEGER NOT NULL DEFAULT 365,
  keyboard_shortcuts_enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
