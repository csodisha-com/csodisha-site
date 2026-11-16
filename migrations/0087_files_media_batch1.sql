-- Files, Media & Cloud Batch 1 (v87): Modules 01-04
-- 01 File Library | 02 Bulk Uploads | 03 Folders & Collections | 04 PDF Manager

CREATE TABLE IF NOT EXISTS media_folders (
  id TEXT PRIMARY KEY,
  parent_folder_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  folder_scope TEXT NOT NULL DEFAULT 'general' CHECK (folder_scope IN (
    'general', 'study_notes', 'pyq_archive', 'syllabus', 'exam_notices', 'schemes', 'branding_assets'
  )),
  color_token TEXT NOT NULL DEFAULT 'teal',
  icon_key TEXT NOT NULL DEFAULT 'folder',
  access_tier TEXT NOT NULL DEFAULT 'public' CHECK (access_tier IN ('public', 'registered', 'admin_only')),
  sort_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_folder_id, status, sort_order);

CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  folder_id TEXT REFERENCES media_folders(id) ON DELETE SET NULL,
  file_category TEXT NOT NULL DEFAULT 'pdf' CHECK (file_category IN (
    'pdf', 'image', 'video', 'audio', 'document', 'archive'
  )),
  storage_provider TEXT NOT NULL DEFAULT 'r2_primary' CHECK (storage_provider IN (
    'r2_primary', 'google_drive', 'external_cloud'
  )),
  r2_key TEXT NOT NULL DEFAULT '',
  public_url TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  alt_or_caption_en TEXT NOT NULL DEFAULT '',
  alt_or_caption_or TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256_hash TEXT NOT NULL DEFAULT '',
  page_count INTEGER NOT NULL DEFAULT 0,
  pdf_version TEXT NOT NULL DEFAULT '',
  watermark_enabled INTEGER NOT NULL DEFAULT 0,
  offline_ready INTEGER NOT NULL DEFAULT 0,
  access_tier TEXT NOT NULL DEFAULT 'public' CHECK (access_tier IN ('public', 'registered', 'admin_only')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  linked_modules_json TEXT NOT NULL DEFAULT '[]',
  download_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  uploaded_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_files_cat_status ON media_files(file_category, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_folder ON media_files(folder_id, status);

CREATE TABLE IF NOT EXISTS media_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_rev_entity ON media_revisions(module_code, entity_id, version_num DESC);
