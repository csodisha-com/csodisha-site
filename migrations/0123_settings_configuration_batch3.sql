-- Settings & Configuration Batch 3 (v123): Modules 09-12
-- 09 Feature Toggles | 10 Email Settings | 11 Upload Limits | 12 Content Defaults
-- Zero plaintext SMTP/mail credentials stored; dangerous executable MIME types blocked.

CREATE TABLE IF NOT EXISTS cfg_feature_toggles (
  id TEXT PRIMARY KEY,
  flag_key TEXT NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  category_group TEXT NOT NULL DEFAULT 'candidate_portal',
  rollout_scope TEXT NOT NULL DEFAULT 'all_users',
  rollout_pct INTEGER NOT NULL DEFAULT 100,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cfg_flags_cat_enabled
  ON cfg_feature_toggles(category_group, is_enabled);

CREATE TABLE IF NOT EXISTS cfg_email_settings (
  id TEXT PRIMARY KEY,
  transport_driver TEXT NOT NULL DEFAULT 'aws_ses_ap_south_1',
  smtp_host TEXT NOT NULL DEFAULT 'email-smtp.ap-south-1.amazonaws.com',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  encryption_mode TEXT NOT NULL DEFAULT 'STARTTLS',
  from_name_en TEXT NOT NULL DEFAULT 'CS Odisha Alerts',
  from_name_or TEXT NOT NULL DEFAULT 'ସିଏସ୍ ଓଡ଼ିଶା ସୂଚନା',
  from_address TEXT NOT NULL DEFAULT 'noreply@csodisha.com',
  reply_to_address TEXT NOT NULL DEFAULT 'support@csodisha.com',
  credential_hash_sha256 TEXT NOT NULL DEFAULT '',
  credential_masked_hint TEXT NOT NULL DEFAULT 'mail_••••7c4e',
  daily_send_quota INTEGER NOT NULL DEFAULT 50000,
  dkim_spf_verified INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_upload_limits (
  id TEXT PRIMARY KEY,
  max_pdf_mb INTEGER NOT NULL DEFAULT 25,
  max_image_mb INTEGER NOT NULL DEFAULT 5,
  max_audio_zip_mb INTEGER NOT NULL DEFAULT 50,
  max_files_per_batch INTEGER NOT NULL DEFAULT 10,
  allowed_mime_types_json TEXT NOT NULL DEFAULT '[]',
  blocked_extensions_json TEXT NOT NULL DEFAULT '[]',
  auto_convert_images_webp INTEGER NOT NULL DEFAULT 1,
  strip_exif_metadata INTEGER NOT NULL DEFAULT 1,
  r2_bucket_binding TEXT NOT NULL DEFAULT 'csodisha-assets',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cfg_content_defaults (
  id TEXT PRIMARY KEY,
  default_publish_status TEXT NOT NULL DEFAULT 'in_review',
  default_content_language TEXT NOT NULL DEFAULT 'bilingual_en_or',
  default_license_type TEXT NOT NULL DEFAULT 'CC-BY-NC-SA-4.0',
  default_meta_robots TEXT NOT NULL DEFAULT 'index, follow',
  auto_generate_odia_slug INTEGER NOT NULL DEFAULT 1,
  require_alt_text_on_images INTEGER NOT NULL DEFAULT 1,
  require_source_citation_url INTEGER NOT NULL DEFAULT 1,
  default_reading_wpm INTEGER NOT NULL DEFAULT 200,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
