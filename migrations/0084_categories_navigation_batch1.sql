-- Categories & Navigation Batch 1 (v84): Modules 01-04
-- 01 Master Categories | 02 Subcategories | 03 Tags & Taxonomies | 04 Header Navigation

CREATE TABLE IF NOT EXISTS nav_categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL,
  name_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT 'folder',
  color_token TEXT NOT NULL DEFAULT 'teal',
  target_portal TEXT NOT NULL DEFAULT 'all' CHECK (target_portal IN (
    'all', 'study-library', 'jobs-careers', 'schemes', 'community', 'about'
  )),
  landing_url TEXT NOT NULL DEFAULT '',
  seo_title_en TEXT NOT NULL DEFAULT '',
  seo_title_or TEXT NOT NULL DEFAULT '',
  item_count_cached INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 10,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_cat_parent_status ON nav_categories(parent_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_nav_cat_portal ON nav_categories(target_portal, status);

CREATE TABLE IF NOT EXISTS nav_tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  canonical_tag TEXT NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_or TEXT NOT NULL DEFAULT '',
  taxonomy_group TEXT NOT NULL DEFAULT 'general' CHECK (taxonomy_group IN (
    'exam_body', 'subject', 'class_stage', 'scheme_type', 'district_odisha', 'general'
  )),
  synonyms_json TEXT NOT NULL DEFAULT '[]',
  usage_count INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_tags_group_status ON nav_tags(taxonomy_group, status, usage_count DESC);

CREATE TABLE IF NOT EXISTS nav_menu_items (
  id TEXT PRIMARY KEY,
  menu_location TEXT NOT NULL DEFAULT 'header' CHECK (menu_location IN (
    'header', 'mega_menu', 'footer', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_library', 'sidebar_community'
  )),
  parent_item_id TEXT,
  column_group TEXT NOT NULL DEFAULT '',
  label_en TEXT NOT NULL,
  label_or TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT '',
  badge_text_en TEXT NOT NULL DEFAULT '',
  badge_text_or TEXT NOT NULL DEFAULT '',
  open_new_tab INTEGER NOT NULL DEFAULT 0,
  visibility_rule TEXT NOT NULL DEFAULT 'all' CHECK (visibility_rule IN ('all', 'logged_in', 'logged_out')),
  highlight_style TEXT NOT NULL DEFAULT 'default' CHECK (highlight_style IN ('default', 'pill', 'accent')),
  sort_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_menu_loc_status ON nav_menu_items(menu_location, status, sort_order);

CREATE TABLE IF NOT EXISTS nav_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_rev_entity ON nav_revisions(module_code, entity_id, version_num DESC);
