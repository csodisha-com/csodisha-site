-- 0112_seo_search_discovery_batch2.sql
-- SEO, Search & Discovery Batch 2 (v112): Modules 05-08
-- 05 Canonical & Redirects | 06 Robots.txt Studio | 07 Odia Tokenizer | 08 Exam Synonyms

CREATE TABLE IF NOT EXISTS seo_redirects_canonicals (
  id TEXT PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,
  rule_kind TEXT NOT NULL DEFAULT 'redirect_301' CHECK (rule_kind IN ('redirect_301', 'redirect_302', 'canonical_override')),
  source_path TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  preserve_query_string INTEGER NOT NULL DEFAULT 1,
  match_mode TEXT NOT NULL DEFAULT 'exact' CHECK (match_mode IN ('exact', 'prefix')),
  hits_count INTEGER NOT NULL DEFAULT 0,
  reason_note TEXT NOT NULL DEFAULT '',
  rule_status TEXT NOT NULL DEFAULT 'active_live' CHECK (rule_status IN ('active_live', 'paused', 'archived')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_redirects_status ON seo_redirects_canonicals(rule_status, rule_kind);

CREATE TABLE IF NOT EXISTS seo_robots_directives (
  id TEXT PRIMARY KEY,
  rule_order INTEGER NOT NULL DEFAULT 10,
  user_agent TEXT NOT NULL DEFAULT '*',
  directive_type TEXT NOT NULL DEFAULT 'Allow' CHECK (directive_type IN ('Allow', 'Disallow', 'Crawl-delay')),
  path_or_value TEXT NOT NULL,
  policy_purpose TEXT NOT NULL DEFAULT 'core_search_allow' CHECK (policy_purpose IN ('core_search_allow', 'private_area_block', 'ai_scraper_governance', 'crawl_rate_guard')),
  is_locked_safety_rule INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_robots_order ON seo_robots_directives(is_active, rule_order);

CREATE TABLE IF NOT EXISTS seo_search_tokenizer_configs (
  id TEXT PRIMARY KEY,
  index_key TEXT NOT NULL UNIQUE,
  index_name_en TEXT NOT NULL,
  index_name_or TEXT NOT NULL DEFAULT '',
  unicode_normalization TEXT NOT NULL DEFAULT 'NFC' CHECK (unicode_normalization IN ('NFC', 'NFKC')),
  odia_matra_folding INTEGER NOT NULL DEFAULT 1,
  strip_odia_stopwords INTEGER NOT NULL DEFAULT 1,
  cross_script_phonetic_bridge INTEGER NOT NULL DEFAULT 1,
  title_weight INTEGER NOT NULL DEFAULT 8,
  odia_title_weight INTEGER NOT NULL DEFAULT 9,
  tags_weight INTEGER NOT NULL DEFAULT 6,
  body_weight INTEGER NOT NULL DEFAULT 2,
  indexed_docs_count INTEGER NOT NULL DEFAULT 0,
  last_reindexed_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seo_keyword_synonyms (
  id TEXT PRIMARY KEY,
  synonym_code TEXT NOT NULL UNIQUE,
  exam_or_domain TEXT NOT NULL,
  primary_term TEXT NOT NULL,
  synonyms_json TEXT NOT NULL DEFAULT '[]',
  boost_factor_x10 INTEGER NOT NULL DEFAULT 20,
  pinned_target_url TEXT NOT NULL DEFAULT '',
  is_bidirectional INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_synonyms_domain ON seo_keyword_synonyms(exam_or_domain, is_active);
