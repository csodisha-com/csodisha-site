-- Files, Media & Cloud Batch 2 (v88): Modules 05-08
-- 05 Image Library | 06 Video & Audio | 07 Cloud Links | 08 Google Drive Links

CREATE TABLE IF NOT EXISTS media_image_meta (
  file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
  width_px INTEGER NOT NULL DEFAULT 0,
  height_px INTEGER NOT NULL DEFAULT 0,
  aspect_ratio TEXT NOT NULL DEFAULT '',
  dominant_color TEXT NOT NULL DEFAULT '#0f766e',
  usage_context TEXT NOT NULL DEFAULT 'study_diagram' CHECK (usage_context IN (
    'hero_banner', 'study_diagram', 'book_cover', 'social_og_card', 'icon_badge'
  )),
  webp_optimized INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS media_av_meta (
  file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
  media_kind TEXT NOT NULL DEFAULT 'video' CHECK (media_kind IN ('video', 'audio')),
  source_mode TEXT NOT NULL DEFAULT 'youtube_embed' CHECK (source_mode IN (
    'r2_upload', 'youtube_embed', 'vimeo_embed', 'external_stream'
  )),
  embed_id_or_url TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript_en TEXT NOT NULL DEFAULT '',
  transcript_or TEXT NOT NULL DEFAULT '',
  chapters_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS media_cloud_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  connector_type TEXT NOT NULL DEFAULT 'custom_cdn' CHECK (connector_type IN (
    'google_drive', 'onedrive', 'dropbox', 'internet_archive', 'github_raw', 'custom_cdn'
  )),
  drive_resource_kind TEXT NOT NULL DEFAULT 'other' CHECK (drive_resource_kind IN (
    'pdf_file', 'folder_share', 'google_doc', 'google_sheet', 'google_slides', 'video_file', 'other'
  )),
  drive_file_id TEXT NOT NULL DEFAULT '',
  raw_share_url TEXT NOT NULL,
  preview_embed_url TEXT NOT NULL DEFAULT '',
  direct_download_url TEXT NOT NULL DEFAULT '',
  folder_id TEXT REFERENCES media_folders(id) ON DELETE SET NULL,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  estimated_size_label TEXT NOT NULL DEFAULT '',
  access_tier TEXT NOT NULL DEFAULT 'public' CHECK (access_tier IN ('public', 'registered', 'admin_only')),
  link_health_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (link_health_status IN ('ok', 'broken', 'restricted', 'unchecked')),
  last_checked_at TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  linked_modules_json TEXT NOT NULL DEFAULT '[]',
  click_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_cloud_conn_status ON media_cloud_links(connector_type, status, updated_at DESC);
