-- 0106_communications_alerts_batch2.sql
-- Communications, Alerts & Candidate Notifications Batch 2 (v106): Modules 05-08
-- 05 Scheme DBT Alerts | 06 WhatsApp WABA Registry | 07 Telegram Broadcasting | 08 Frequency Caps

CREATE TABLE IF NOT EXISTS comm_scheme_dbt_alerts (
  id TEXT PRIMARY KEY,
  alert_code TEXT NOT NULL UNIQUE,
  scheme_key TEXT NOT NULL DEFAULT 'subhadra_yojana' CHECK (scheme_key IN ('subhadra_yojana', 'cm_kisan_kalia', 'gopabandhu_sambadika', 'post_matric_scholarship_odisha', 'biju_swasthya_kalyan', 'mo_ghar_housing')),
  scheme_name_en TEXT NOT NULL,
  scheme_name_or TEXT NOT NULL DEFAULT '',
  alert_stage TEXT NOT NULL DEFAULT 'dbt_installment_credited' CHECK (alert_stage IN ('application_window_open', 'ekyc_npci_seeding_reminder', 'sanction_list_released', 'dbt_installment_credited', 'grievance_window')),
  beneficiary_segment TEXT NOT NULL DEFAULT 'all_odisha_citizens' CHECK (beneficiary_segment IN ('women_entrepreneurs', 'farmers_sharecroppers', 'sc_st_obc_students', 'all_odisha_citizens')),
  official_portal_url TEXT NOT NULL DEFAULT '',
  message_en TEXT NOT NULL,
  message_or TEXT NOT NULL DEFAULT '',
  channels_json TEXT NOT NULL DEFAULT '["web_push","whatsapp_waba","sms_dlt"]',
  dispatched_count INTEGER NOT NULL DEFAULT 0,
  alert_status TEXT NOT NULL DEFAULT 'draft' CHECK (alert_status IN ('draft', 'dispatched_live', 'archived')),
  dispatched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_scheme_dbt_status ON comm_scheme_dbt_alerts(scheme_key, alert_status, created_at DESC);

CREATE TABLE IF NOT EXISTS comm_whatsapp_waba_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL UNIQUE,
  waba_template_name TEXT NOT NULL UNIQUE,
  meta_category TEXT NOT NULL DEFAULT 'UTILITY' CHECK (meta_category IN ('UTILITY', 'AUTHENTICATION', 'MARKETING')),
  lang_code TEXT NOT NULL DEFAULT 'en' CHECK (lang_code IN ('en', 'or')),
  header_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (header_type IN ('TEXT', 'DOCUMENT', 'NONE')),
  header_text TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL,
  footer_text TEXT NOT NULL DEFAULT '',
  cta_button_label TEXT NOT NULL DEFAULT '',
  cta_button_url TEXT NOT NULL DEFAULT '',
  waba_phone_number_id_masked TEXT NOT NULL DEFAULT '',
  token_masked_hint TEXT NOT NULL DEFAULT '',
  meta_review_status TEXT NOT NULL DEFAULT 'pending_meta_review' CHECK (meta_review_status IN ('approved_meta', 'pending_meta_review', 'rejected', 'paused')),
  delivered_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_waba_status ON comm_whatsapp_waba_templates(meta_review_status, meta_category);

CREATE TABLE IF NOT EXISTS comm_telegram_broadcasts (
  id TEXT PRIMARY KEY,
  post_code TEXT NOT NULL UNIQUE,
  channel_handle TEXT NOT NULL DEFAULT '@csodisha_official',
  automation_trigger TEXT NOT NULL DEFAULT 'manual_broadcast' CHECK (automation_trigger IN ('manual_broadcast', 'auto_new_job_pdf', 'auto_pyq_upload', 'auto_daily_quiz')),
  headline_en TEXT NOT NULL,
  headline_or TEXT NOT NULL DEFAULT '',
  message_body_en TEXT NOT NULL DEFAULT '',
  message_body_or TEXT NOT NULL DEFAULT '',
  inline_cta_label TEXT NOT NULL DEFAULT '',
  inline_cta_url TEXT NOT NULL DEFAULT '',
  bot_token_masked_hint TEXT NOT NULL DEFAULT '',
  pin_in_channel INTEGER NOT NULL DEFAULT 0,
  silent_notification INTEGER NOT NULL DEFAULT 0,
  reach_views_count INTEGER NOT NULL DEFAULT 0,
  broadcast_status TEXT NOT NULL DEFAULT 'draft' CHECK (broadcast_status IN ('draft', 'scheduled', 'posted_live', 'archived')),
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_tg_status ON comm_telegram_broadcasts(broadcast_status, channel_handle, created_at DESC);

CREATE TABLE IF NOT EXISTS comm_frequency_caps (
  id TEXT PRIMARY KEY,
  policy_code TEXT NOT NULL UNIQUE,
  channel_key TEXT NOT NULL UNIQUE CHECK (channel_key IN ('sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
  channel_label_en TEXT NOT NULL,
  channel_label_or TEXT NOT NULL DEFAULT '',
  max_per_day INTEGER NOT NULL DEFAULT 2,
  max_per_week INTEGER NOT NULL DEFAULT 6,
  quiet_hours_start TEXT NOT NULL DEFAULT '21:30',
  quiet_hours_end TEXT NOT NULL DEFAULT '07:30',
  bypass_for_urgent_admit_cards INTEGER NOT NULL DEFAULT 1,
  default_opt_in_en INTEGER NOT NULL DEFAULT 1,
  default_opt_in_or INTEGER NOT NULL DEFAULT 1,
  enforcement_mode TEXT NOT NULL DEFAULT 'defer_to_morning' CHECK (enforcement_mode IN ('strict_drop', 'defer_to_morning', 'digest_rollup')),
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_caps_channel ON comm_frequency_caps(channel_key, is_active);
