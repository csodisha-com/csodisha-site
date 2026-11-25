-- 0149_ai_coauthor_v318.sql
-- Additive D1 migration for 100% Free-Tier Admin Studio AI Co-Author (v318)

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_module TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  estimated_neurons INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created
  ON ai_generation_logs(created_at);
