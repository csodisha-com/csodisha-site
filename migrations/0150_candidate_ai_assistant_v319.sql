-- 0150_candidate_ai_assistant_v319.sql
-- Additive D1 migration for 100% Free-Tier Candidate Hub Study & Eligibility Assistant (v319)

CREATE TABLE IF NOT EXISTS candidate_ai_cache (
  cache_key TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  ref_id TEXT,
  response_json TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_ai_cache_mode
  ON candidate_ai_cache(mode, ref_id);

CREATE TABLE IF NOT EXISTS candidate_ai_usage (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  queries_used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_ai_usage_unique
  ON candidate_ai_usage(candidate_id, usage_date);
