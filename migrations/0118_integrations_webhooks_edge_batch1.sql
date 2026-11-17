-- Integrations, Webhooks & Cloudflare Edge Suite Batch 1 (v118): Modules 01-04
-- 01 Cloudflare R2 Bucket Asset Mirroring & Storage Sync
-- 02 Cloudflare Edge Cache Purging & Zone Invalidation
-- 03 Outbound Webhook Dispatcher & Event Subscriptions
-- 04 Telegram Broadcast Bot & Channel Alert Automation
-- Zero raw secrets/tokens stored in plaintext (SHA-256 hashes + masked hints only).

CREATE TABLE IF NOT EXISTS int_r2_sync_jobs (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL UNIQUE,
  bucket_name TEXT NOT NULL DEFAULT 'csodisha-assets',
  prefix_path TEXT NOT NULL DEFAULT '/assets/',
  mirror_target TEXT NOT NULL DEFAULT 'r2_secondary_apac',
  objects_scanned INTEGER NOT NULL DEFAULT 0,
  objects_mirrored INTEGER NOT NULL DEFAULT 0,
  total_bytes_synced INTEGER NOT NULL DEFAULT 0,
  checksum_verified INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced_healthy',
  last_synced_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_r2_bucket_status
  ON int_r2_sync_jobs(bucket_name, sync_status);

CREATE TABLE IF NOT EXISTS int_edge_cache_purges (
  id TEXT PRIMARY KEY,
  purge_code TEXT NOT NULL UNIQUE,
  purge_scope TEXT NOT NULL DEFAULT 'url_prefix',
  target_pattern TEXT NOT NULL,
  zone_identifier_masked TEXT NOT NULL DEFAULT 'zone_cso_••••8f21',
  urls_invalidated_count INTEGER NOT NULL DEFAULT 0,
  purge_status TEXT NOT NULL DEFAULT 'purged_edge_200',
  triggered_by TEXT NOT NULL DEFAULT 'system',
  created_at_ist TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_int_purge_scope_status
  ON int_edge_cache_purges(purge_scope, purge_status, created_at_ist);

CREATE TABLE IF NOT EXISTS int_outbound_webhooks (
  id TEXT PRIMARY KEY,
  webhook_code TEXT NOT NULL UNIQUE,
  subscriber_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  subscribed_events_json TEXT NOT NULL DEFAULT '[]',
  hmac_secret_hash_sha256 TEXT NOT NULL DEFAULT '',
  hmac_secret_masked_hint TEXT NOT NULL DEFAULT '',
  delivery_timeout_ms INTEGER NOT NULL DEFAULT 5000,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_http_status INTEGER NOT NULL DEFAULT 200,
  subscription_status TEXT NOT NULL DEFAULT 'active_live',
  last_dispatched_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_whk_status
  ON int_outbound_webhooks(subscription_status);

CREATE TABLE IF NOT EXISTS int_telegram_automations (
  id TEXT PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,
  bot_username TEXT NOT NULL DEFAULT '@CSOdishaAlertBot',
  channel_handle TEXT NOT NULL DEFAULT '@csodisha_official',
  trigger_event TEXT NOT NULL DEFAULT 'admit_card_released',
  message_template_en TEXT NOT NULL DEFAULT '',
  message_template_or TEXT NOT NULL DEFAULT '',
  bot_token_masked_hint TEXT NOT NULL DEFAULT 'bot74••••19:AAF',
  parse_mode TEXT NOT NULL DEFAULT 'HTML_SAFE',
  disable_web_preview INTEGER NOT NULL DEFAULT 1,
  dispatches_count INTEGER NOT NULL DEFAULT 0,
  rule_status TEXT NOT NULL DEFAULT 'active_live',
  last_triggered_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_tgb_status_event
  ON int_telegram_automations(rule_status, trigger_event);

CREATE TABLE IF NOT EXISTS int_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_int_rev_entity
  ON int_revisions(module_code, entity_id, version_num DESC);
