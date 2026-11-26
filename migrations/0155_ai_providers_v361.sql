-- 0155_ai_providers_v361.sql
-- Multi-Provider AI API Manager & Model Switcher (v361) — additive & idempotent.

CREATE TABLE IF NOT EXISTS ai_custom_providers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_custom_providers_priority
  ON ai_custom_providers(enabled, priority ASC, created_at ASC);
