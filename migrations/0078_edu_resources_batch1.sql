-- Educational Resources Batch 1 (v78): Modules 01-04
-- 01 Digital Library | 02 Study Materials | 03 Notes & PDFs | 04 Books & References

CREATE TABLE IF NOT EXISTS edu_resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('digital_library', 'study_material', 'notes_pdf', 'book_reference')),
  stage_or_class TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL DEFAULT '',
  topic_name TEXT NOT NULL DEFAULT '',
  exam_tag TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  author_or_board TEXT NOT NULL DEFAULT '',
  publisher_or_source TEXT NOT NULL DEFAULT '',
  publication_year INTEGER,
  edition_or_isbn TEXT NOT NULL DEFAULT '',
  language_code TEXT NOT NULL DEFAULT 'bilingual' CHECK (language_code IN ('en', 'or', 'bilingual')),
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  content_md_en TEXT NOT NULL DEFAULT '',
  content_md_or TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER NOT NULL DEFAULT 0,
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  access_tier TEXT NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free', 'registered', 'featured')),
  offline_ready INTEGER NOT NULL DEFAULT 0,
  watermark_enabled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TEXT,
  expires_at TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_resources_type_status ON edu_resources(resource_type, status);
CREATE INDEX IF NOT EXISTS idx_edu_resources_stage_subject ON edu_resources(stage_or_class, subject_name);
CREATE INDEX IF NOT EXISTS idx_edu_resources_featured ON edu_resources(featured, status);

CREATE TABLE IF NOT EXISTS edu_resource_revisions (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (resource_id) REFERENCES edu_resources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edu_revisions_res ON edu_resource_revisions(resource_id, version_num DESC);

CREATE TABLE IF NOT EXISTS edu_resource_links (
  id TEXT PRIMARY KEY,
  source_module TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_module TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('notes_for', 'book_for', 'syllabus_for', 'pyq_for', 'mock_for', 'related')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edu_links_source ON edu_resource_links(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_edu_links_target ON edu_resource_links(target_module, target_id);

CREATE TABLE IF NOT EXISTS edu_resource_reports (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('typo', 'broken_pdf', 'broken_link', 'outdated')),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (resource_id) REFERENCES edu_resources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edu_reports_res_status ON edu_resource_reports(resource_id, status);
