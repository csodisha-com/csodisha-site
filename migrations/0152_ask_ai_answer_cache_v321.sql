-- 0152_ask_ai_answer_cache_v321.sql
-- Additive D1 migration for Ask CSOdisha Hybrid RAG + General AI Answer Cache (v321)

CREATE TABLE IF NOT EXISTS semantic_answer_cache (
  cache_key TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  filter_type TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  answer_or TEXT,
  source_mode TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_semantic_answer_cache_created
  ON semantic_answer_cache(created_at);
