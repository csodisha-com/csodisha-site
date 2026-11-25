-- 0151_semantic_search_v320.sql
-- Additive D1 migration for 100% Free-Tier Smart Semantic Search ("Ask CSOdisha") (v320)

CREATE TABLE IF NOT EXISTS semantic_index_items (
  vector_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_or TEXT,
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  indexed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_semantic_index_entity
  ON semantic_index_items(entity_type, entity_id);
