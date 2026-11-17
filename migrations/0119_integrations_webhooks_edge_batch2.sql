-- Integrations, Webhooks & Cloudflare Edge Suite Batch 2 (v119): Modules 05-08
-- 05 WhatsApp Business API & Template Notifications
-- 06 Public API Gateway & Token Rate Limiting (IP/Token Tiering)
-- 07 Inbound Webhook Receivers & Signature Verification (HMAC)
-- 08 Cloudflare D1 Database Sync & State Replication
-- Zero plaintext tokens/secrets stored (SHA-256 hashes + masked hints only).

CREATE TABLE IF NOT EXISTS int_whatsapp_connectors (
  id TEXT PRIMARY KEY,
  connector_code TEXT NOT NULL UNIQUE,
  graph_api_version TEXT NOT NULL DEFAULT 'v21.0',
  phone_number_id_masked TEXT NOT NULL DEFAULT 'pnid_••••9042',
  waba_id_masked TEXT NOT NULL DEFAULT 'waba_••••3318',
  access_token_hash_sha256 TEXT NOT NULL DEFAULT '',
  access_token_masked_hint TEXT NOT NULL DEFAULT 'EAAG••••8x9Q',
  template_name TEXT NOT NULL DEFAULT 'cso_admit_card_instant_or',
  lang_code TEXT NOT NULL DEFAULT 'or',
  daily_tier_limit INTEGER NOT NULL DEFAULT 10000,
  sent_today_count INTEGER NOT NULL DEFAULT 0,
  quality_rating TEXT NOT NULL DEFAULT 'GREEN_HIGH',
  connector_status TEXT NOT NULL DEFAULT 'connected_live',
  last_dispatch_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_wab_status_lang
  ON int_whatsapp_connectors(connector_status, lang_code);

CREATE TABLE IF NOT EXISTS int_api_gateway_tokens (
  id TEXT PRIMARY KEY,
  token_code TEXT NOT NULL UNIQUE,
  client_app_name TEXT NOT NULL,
  tier_level TEXT NOT NULL DEFAULT 'partner_standard',
  token_hash_sha256 TEXT NOT NULL UNIQUE,
  token_prefix_masked TEXT NOT NULL DEFAULT '',
  allowed_scopes_json TEXT NOT NULL DEFAULT '[]',
  rate_limit_rpm INTEGER NOT NULL DEFAULT 300,
  burst_limit INTEGER NOT NULL DEFAULT 60,
  ip_allowlist_cidr TEXT NOT NULL DEFAULT '*',
  requests_24h_count INTEGER NOT NULL DEFAULT 0,
  rate_limited_429_count INTEGER NOT NULL DEFAULT 0,
  token_status TEXT NOT NULL DEFAULT 'active_live',
  expires_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_gwk_tier_status
  ON int_api_gateway_tokens(tier_level, token_status);

CREATE TABLE IF NOT EXISTS int_inbound_receivers (
  id TEXT PRIMARY KEY,
  receiver_slug TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL,
  signature_header TEXT NOT NULL DEFAULT 'X-CSO-Signature-256',
  hmac_algorithm TEXT NOT NULL DEFAULT 'HMAC-SHA256',
  signing_secret_hash_sha256 TEXT NOT NULL DEFAULT '',
  signing_secret_masked_hint TEXT NOT NULL DEFAULT '',
  replay_window_sec INTEGER NOT NULL DEFAULT 300,
  verified_events_count INTEGER NOT NULL DEFAULT 0,
  rejected_sig_count INTEGER NOT NULL DEFAULT 0,
  receiver_status TEXT NOT NULL DEFAULT 'active_verifying',
  last_received_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_inb_slug_status
  ON int_inbound_receivers(receiver_slug, receiver_status);

CREATE TABLE IF NOT EXISTS int_d1_replication_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_code TEXT NOT NULL UNIQUE,
  database_binding TEXT NOT NULL DEFAULT 'DB (csodisha-prod)',
  replica_region TEXT NOT NULL DEFAULT 'APAC-BOM (Mumbai)',
  table_group TEXT NOT NULL DEFAULT 'edu_resources_core',
  tables_covered_count INTEGER NOT NULL DEFAULT 0,
  total_rows_verified INTEGER NOT NULL DEFAULT 0,
  schema_checksum_sha256 TEXT NOT NULL DEFAULT '',
  replication_lag_ms INTEGER NOT NULL DEFAULT 18,
  sync_status TEXT NOT NULL DEFAULT 'consistent_synced',
  verified_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_d1r_group_status
  ON int_d1_replication_snapshots(table_group, sync_status);
