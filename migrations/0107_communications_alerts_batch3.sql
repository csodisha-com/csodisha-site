-- 0107_communications_alerts_batch3.sql
-- Communications, Alerts & Candidate Notifications Batch 3 (v107): Modules 09-12
-- 09 DPDP Opt-Outs | 10 Bilingual Variable Tags | 11 Carrier DLR Diagnostics | 12 Broadcast Queue

CREATE TABLE IF NOT EXISTS comm_dpdp_optouts (
  id TEXT PRIMARY KEY,
  suppression_code TEXT NOT NULL UNIQUE,
  channel_scope TEXT NOT NULL DEFAULT 'all_channels' CHECK (channel_scope IN ('all_channels', 'sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
  contact_hash_sha256 TEXT NOT NULL UNIQUE,
  contact_masked_hint TEXT NOT NULL DEFAULT '',
  revocation_source TEXT NOT NULL DEFAULT 'candidate_self_portal' CHECK (revocation_source IN ('candidate_self_portal', 'sms_stop_keyword', 'email_unsubscribe_link', 'whatsapp_stop_reply', 'dpdp_erasure_request', 'admin_compliance_entry')),
  reason_note TEXT NOT NULL DEFAULT '',
  suppression_status TEXT NOT NULL DEFAULT 'active_suppressed' CHECK (suppression_status IN ('active_suppressed', 're_consented')),
  revoked_at TEXT NOT NULL DEFAULT (datetime('now')),
  reconsented_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_dpdp_optouts_scope ON comm_dpdp_optouts(channel_scope, suppression_status, created_at DESC);

CREATE TABLE IF NOT EXISTS comm_variable_tags (
  id TEXT PRIMARY KEY,
  tag_key TEXT NOT NULL UNIQUE,
  placeholder_syntax TEXT NOT NULL,
  dlt_slot_mapping TEXT NOT NULL DEFAULT '{#var#}',
  category_group TEXT NOT NULL DEFAULT 'identity' CHECK (category_group IN ('identity', 'exam_recruitment', 'welfare_scheme', 'security_otp')),
  fallback_en TEXT NOT NULL DEFAULT '',
  fallback_or TEXT NOT NULL DEFAULT '',
  sample_value_en TEXT NOT NULL DEFAULT '',
  sample_value_or TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_var_tags_cat ON comm_variable_tags(category_group, is_active);

CREATE TABLE IF NOT EXISTS comm_delivery_receipts (
  id TEXT PRIMARY KEY,
  dlr_uid TEXT NOT NULL UNIQUE,
  channel_key TEXT NOT NULL DEFAULT 'sms_dlt' CHECK (channel_key IN ('sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
  carrier_or_mx TEXT NOT NULL DEFAULT 'Reliance Jio',
  circle_region TEXT NOT NULL DEFAULT 'Odisha Telecom Circle',
  campaign_or_template_code TEXT NOT NULL DEFAULT '',
  recipient_masked_hint TEXT NOT NULL DEFAULT '',
  delivery_status TEXT NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('delivered', 'bounced_hard', 'bounced_soft', 'dlt_scrubbed_failed', 'dnd_blocked', 'queued')),
  carrier_error_code TEXT NOT NULL DEFAULT '000_DELIVERED',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  reported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_dlr_lookup ON comm_delivery_receipts(channel_key, delivery_status, carrier_or_mx, reported_at DESC);

CREATE TABLE IF NOT EXISTS comm_broadcast_queue (
  id TEXT PRIMARY KEY,
  job_code TEXT NOT NULL UNIQUE,
  source_module_code TEXT NOT NULL DEFAULT '03' CHECK (source_module_code IN ('01', '02', '03', '04', '05', '06', '07')),
  source_ref_code TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  channel_key TEXT NOT NULL DEFAULT 'web_push' CHECK (channel_key IN ('sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
  audience_segment TEXT NOT NULL DEFAULT 'all_odisha_candidates',
  target_count INTEGER NOT NULL DEFAULT 0,
  scheduled_for_ist TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent_exam')),
  queue_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (queue_status IN ('scheduled', 'processing', 'completed', 'paused', 'cancelled')),
  dpdp_optouts_skipped INTEGER NOT NULL DEFAULT 0,
  executed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_queue_sched ON comm_broadcast_queue(queue_status, priority, scheduled_for_ist ASC);
