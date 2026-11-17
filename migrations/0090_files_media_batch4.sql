-- Files, Media & Cloud Batch 4 (v90): Modules 13-15
-- 13 Duplicate Detection | 14 Broken File Links | 15 Media Optimization

CREATE TABLE IF NOT EXISTS media_duplicate_groups (
  id TEXT PRIMARY KEY,
  match_basis TEXT NOT NULL DEFAULT 'sha256_exact' CHECK (match_basis IN (
    'sha256_exact', 'filename_size', 'drive_id_duplicate'
  )),
  fingerprint_key TEXT NOT NULL UNIQUE,
  canonical_file_id TEXT NOT NULL,
  duplicate_file_ids_json TEXT NOT NULL DEFAULT '[]',
  reclaimable_bytes INTEGER NOT NULL DEFAULT 0,
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'merged', 'ignored')),
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_dup_status ON media_duplicate_groups(resolution_status, reclaimable_bytes DESC);

CREATE TABLE IF NOT EXISTS media_broken_link_scans (
  id TEXT PRIMARY KEY,
  source_table TEXT NOT NULL DEFAULT 'media_files' CHECK (source_table IN (
    'media_files', 'media_cloud_links', 'edu_resources'
  )),
  source_id TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL DEFAULT '',
  issue_type TEXT NOT NULL DEFAULT 'missing_r2_object' CHECK (issue_type IN (
    'missing_r2_object', 'http_404', 'http_403_restricted', 'timeout_unreachable', 'empty_url'
  )),
  http_status_code INTEGER NOT NULL DEFAULT 0,
  error_detail TEXT NOT NULL DEFAULT '',
  fix_status TEXT NOT NULL DEFAULT 'open' CHECK (fix_status IN ('open', 'repaired', 'archived', 'ignored')),
  replacement_url TEXT NOT NULL DEFAULT '',
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_broken_status ON media_broken_link_scans(fix_status, source_table, detected_at DESC);

CREATE TABLE IF NOT EXISTS media_optimization_jobs (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  asset_kind TEXT NOT NULL DEFAULT 'image_webp' CHECK (asset_kind IN (
    'image_webp', 'pdf_compress', 'thumbnail_gen'
  )),
  original_bytes INTEGER NOT NULL DEFAULT 0,
  optimized_bytes INTEGER NOT NULL DEFAULT 0,
  savings_pct REAL NOT NULL DEFAULT 0,
  target_format TEXT NOT NULL DEFAULT 'webp' CHECK (target_format IN ('webp', 'avif', 'pdf_linearized')),
  quality_preset TEXT NOT NULL DEFAULT 'balanced_80' CHECK (quality_preset IN (
    'high_90', 'balanced_80', 'compact_65'
  )),
  job_status TEXT NOT NULL DEFAULT 'queued' CHECK (job_status IN ('queued', 'completed', 'skipped', 'failed')),
  notes TEXT NOT NULL DEFAULT '',
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_opt_status ON media_optimization_jobs(job_status, file_id);
