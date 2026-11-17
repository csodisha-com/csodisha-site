-- Files, Media & Cloud Batch 3 (v89): Modules 09-12
-- 09 Storage Providers | 10 File Versions | 11 File Permissions | 12 Storage Usage

CREATE TABLE IF NOT EXISTS media_storage_providers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  provider_key TEXT NOT NULL DEFAULT 'r2_primary' CHECK (provider_key IN (
    'r2_primary', 'google_drive', 'cloudflare_images', 'internet_archive', 'github_releases', 'custom_s3_cdn'
  )),
  name_en TEXT NOT NULL,
  name_or TEXT NOT NULL DEFAULT '',
  bucket_or_root_label TEXT NOT NULL DEFAULT '',
  base_url_prefix TEXT NOT NULL DEFAULT '',
  quota_limit_bytes INTEGER NOT NULL DEFAULT 10737418240,
  is_default_upload_target INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'offline')),
  last_ping_ms INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  config_notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_prov_status ON media_storage_providers(status, sort_order);

CREATE TABLE IF NOT EXISTS media_file_binary_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL DEFAULT 'v1.0',
  version_num INTEGER NOT NULL DEFAULT 1,
  r2_key TEXT NOT NULL DEFAULT '',
  public_url TEXT NOT NULL DEFAULT '',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256_hash TEXT NOT NULL DEFAULT '',
  page_count INTEGER NOT NULL DEFAULT 0,
  change_summary_en TEXT NOT NULL DEFAULT '',
  change_summary_or TEXT NOT NULL DEFAULT '',
  is_current INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_binver_file ON media_file_binary_versions(file_id, version_num DESC);

CREATE TABLE IF NOT EXISTS media_permission_policies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  policy_name_en TEXT NOT NULL,
  policy_name_or TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'folder' CHECK (target_type IN (
    'folder', 'file_category', 'specific_file', 'storage_provider'
  )),
  target_ref_id TEXT NOT NULL DEFAULT '',
  allowed_roles_json TEXT NOT NULL DEFAULT '["public","student"]',
  require_login INTEGER NOT NULL DEFAULT 0,
  allow_direct_download INTEGER NOT NULL DEFAULT 1,
  allow_embed_preview INTEGER NOT NULL DEFAULT 1,
  daily_download_cap INTEGER NOT NULL DEFAULT 0,
  referer_lock_enabled INTEGER NOT NULL DEFAULT 0,
  priority_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_perm_target ON media_permission_policies(target_type, status, priority_order);
