-- Integrations, Webhooks & Cloudflare Edge Suite Batch 3 (v120): Modules 09-11
-- 09 SMS Gateway Integration & OTP Dispatch Engine
-- 10 Third-Party Service Health Monitors & Ping Heartbeats
-- 11 Integration Logs, Webhook Payloads & Dead-Letter Queue (DLQ)
-- Zero raw OTPs, zero raw mobile numbers, zero plaintext API keys stored or logged.

CREATE TABLE IF NOT EXISTS int_sms_otp_gateways (
  id TEXT PRIMARY KEY,
  gateway_code TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL DEFAULT 'MSG91 India',
  route_type TEXT NOT NULL DEFAULT 'transactional_otp',
  sender_id TEXT NOT NULL DEFAULT 'CSODSH',
  pe_id TEXT NOT NULL DEFAULT '',
  default_dlt_template_id TEXT NOT NULL DEFAULT '',
  api_key_hash_sha256 TEXT NOT NULL DEFAULT '',
  api_key_masked_hint TEXT NOT NULL DEFAULT 'msg91_••••8a4c',
  otp_expiry_sec INTEGER NOT NULL DEFAULT 300,
  max_otp_attempts INTEGER NOT NULL DEFAULT 3,
  dispatched_24h_count INTEGER NOT NULL DEFAULT 0,
  delivery_rate_pct INTEGER NOT NULL DEFAULT 99,
  gateway_status TEXT NOT NULL DEFAULT 'active_primary',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_sms_status_route
  ON int_sms_otp_gateways(gateway_status, route_type);

CREATE TABLE IF NOT EXISTS int_service_health_monitors (
  id TEXT PRIMARY KEY,
  monitor_code TEXT NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL DEFAULT 'cloudflare_edge',
  endpoint_label TEXT NOT NULL DEFAULT '',
  check_interval_sec INTEGER NOT NULL DEFAULT 60,
  latency_ms INTEGER NOT NULL DEFAULT 25,
  uptime_30d_pct_x100 INTEGER NOT NULL DEFAULT 9998,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'operational_healthy',
  last_ping_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_mon_cat_status
  ON int_service_health_monitors(service_category, health_status);

CREATE TABLE IF NOT EXISTS int_webhook_dlq_logs (
  id TEXT PRIMARY KEY,
  event_uid TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL DEFAULT 'outbound_webhook',
  integration_ref_code TEXT NOT NULL DEFAULT '',
  event_topic TEXT NOT NULL DEFAULT '',
  endpoint_or_channel TEXT NOT NULL DEFAULT '',
  sanitized_payload_json TEXT NOT NULL DEFAULT '{}',
  http_status_code INTEGER NOT NULL DEFAULT 200,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_summary TEXT NOT NULL DEFAULT '',
  queue_state TEXT NOT NULL DEFAULT 'delivered_ok',
  created_at_ist TEXT NOT NULL DEFAULT '',
  replayed_at_ist TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_int_dlq_state_dir
  ON int_webhook_dlq_logs(queue_state, direction, created_at_ist);
