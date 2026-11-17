-- 0105_communications_alerts_batch1.sql
-- Communications, Alerts & Candidate Notifications Batch 1 (v105): Modules 01-04
-- 01 SMS Gateway & TRAI DLT | 02 Multilingual Email Campaigns | 03 Admit Card Push Alerts | 04 Deadline Countdown Broadcaster

CREATE TABLE IF NOT EXISTS comm_sms_dlt_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL UNIQUE,
  gateway_provider TEXT NOT NULL DEFAULT 'msg91' CHECK (gateway_provider IN ('msg91', 'kaleyra', 'fast2sms_dlt', 'gupshup', 'twilio_in')),
  sender_id TEXT NOT NULL DEFAULT 'CSODSH',
  pe_id TEXT NOT NULL DEFAULT '',
  dlt_template_id TEXT NOT NULL,
  template_category TEXT NOT NULL DEFAULT 'transactional_otp' CHECK (template_category IN ('transactional_otp', 'service_implicit', 'service_explicit')),
  lang_code TEXT NOT NULL DEFAULT 'en' CHECK (lang_code IN ('en', 'or')),
  template_body TEXT NOT NULL,
  var_count INTEGER NOT NULL DEFAULT 0,
  secret_masked_hint TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'pending_dlt' CHECK (approval_status IN ('approved_dlt', 'pending_dlt', 'rejected', 'archived')),
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_sms_dlt_status ON comm_sms_dlt_templates(approval_status, gateway_provider, template_category);

CREATE TABLE IF NOT EXISTS comm_email_campaigns (
  id TEXT PRIMARY KEY,
  campaign_code TEXT NOT NULL UNIQUE,
  campaign_type TEXT NOT NULL DEFAULT 'exam_bulletin' CHECK (campaign_type IN ('exam_bulletin', 'weekly_study_digest', 'scheme_alert', 'mock_test_invite', 'onboarding')),
  audience_segment TEXT NOT NULL DEFAULT 'all_subscribers' CHECK (audience_segment IN ('all_subscribers', 'opsc_oas_aspirants', 'ossc_osssc_aspirants', 'ugc_net_scholars', 'odia_medium_learners')),
  subject_en TEXT NOT NULL,
  subject_or TEXT NOT NULL DEFAULT '',
  preheader_en TEXT NOT NULL DEFAULT '',
  preheader_or TEXT NOT NULL DEFAULT '',
  body_blocks_json TEXT NOT NULL DEFAULT '[]',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  open_rate_pct REAL NOT NULL DEFAULT 0,
  click_rate_pct REAL NOT NULL DEFAULT 0,
  campaign_status TEXT NOT NULL DEFAULT 'draft' CHECK (campaign_status IN ('draft', 'scheduled', 'sent', 'archived')),
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_email_status ON comm_email_campaigns(campaign_status, audience_segment, created_at DESC);

CREATE TABLE IF NOT EXISTS comm_admit_card_alerts (
  id TEXT PRIMARY KEY,
  alert_code TEXT NOT NULL UNIQUE,
  commission_key TEXT NOT NULL DEFAULT 'opsc' CHECK (commission_key IN ('opsc', 'ossc', 'osssc', 'nta_ugc_net', 'bse_chse', 'rrc_bhubaneswar')),
  exam_title_en TEXT NOT NULL,
  exam_title_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  exam_date TEXT NOT NULL DEFAULT '',
  download_portal_url TEXT NOT NULL DEFAULT '',
  channels_json TEXT NOT NULL DEFAULT '["web_push","email"]',
  target_district_scope TEXT NOT NULL DEFAULT 'all_30_districts' CHECK (target_district_scope IN ('all_30_districts', 'selected_zones')),
  urgency_level TEXT NOT NULL DEFAULT 'high_priority' CHECK (urgency_level IN ('standard', 'high_priority', 'urgent_hall_ticket')),
  dispatched_count INTEGER NOT NULL DEFAULT 0,
  dispatch_status TEXT NOT NULL DEFAULT 'draft' CHECK (dispatch_status IN ('draft', 'dispatched_live', 'archived')),
  dispatched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_admit_status ON comm_admit_card_alerts(dispatch_status, commission_key, urgency_level);

CREATE TABLE IF NOT EXISTS comm_deadline_broadcasts (
  id TEXT PRIMARY KEY,
  broadcast_code TEXT NOT NULL UNIQUE,
  commission_key TEXT NOT NULL DEFAULT 'osssc' CHECK (commission_key IN ('opsc', 'ossc', 'osssc', 'nta_ugc_net', 'bse_chse', 'rrc_bhubaneswar')),
  post_title_en TEXT NOT NULL,
  post_title_or TEXT NOT NULL DEFAULT '',
  vacancy_count INTEGER NOT NULL DEFAULT 0,
  application_deadline_at TEXT NOT NULL,
  fee_last_date TEXT NOT NULL DEFAULT '',
  apply_url TEXT NOT NULL DEFAULT '',
  reminder_cadence TEXT NOT NULL DEFAULT '7d_3d_24h_final' CHECK (reminder_cadence IN ('7d_3d_24h_final', '48h_6h_closing', 'single_final_call')),
  channels_json TEXT NOT NULL DEFAULT '["web_push","sms_dlt","email"]',
  subscribers_notified INTEGER NOT NULL DEFAULT 0,
  broadcast_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (broadcast_status IN ('scheduled', 'active_countdown', 'closed_expired', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_deadline_status ON comm_deadline_broadcasts(broadcast_status, application_deadline_at ASC);

CREATE TABLE IF NOT EXISTS comm_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_rev_lookup ON comm_revisions(module_code, entity_id, version_num DESC);
