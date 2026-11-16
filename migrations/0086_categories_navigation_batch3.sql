-- Categories & Navigation Batch 3 (v86): Modules 09-11
-- 09 Internal Links | 10 Menu Ordering | 11 Social Links

CREATE TABLE IF NOT EXISTS nav_internal_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  link_group TEXT NOT NULL DEFAULT 'quick_access_bar' CHECK (link_group IN (
    'quick_access_bar', 'related_hub_links', 'seo_anchor_rules', 'contextual_cta'
  )),
  source_portal TEXT NOT NULL DEFAULT 'all' CHECK (source_portal IN (
    'all', 'home', 'study-library', 'jobs-careers', 'schemes', 'community', 'student'
  )),
  anchor_text_en TEXT NOT NULL,
  anchor_text_or TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL,
  target_module_code TEXT NOT NULL DEFAULT '',
  rel_attributes TEXT NOT NULL DEFAULT '' CHECK (rel_attributes IN ('', 'nofollow', 'sponsored')),
  priority_weight INTEGER NOT NULL DEFAULT 10,
  click_count INTEGER NOT NULL DEFAULT 0,
  link_health_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (link_health_status IN ('ok', 'broken', 'unchecked')),
  last_checked_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_il_group_portal ON nav_internal_links(link_group, source_portal, status);

CREATE TABLE IF NOT EXISTS nav_social_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  platform_key TEXT NOT NULL DEFAULT 'instagram' CHECK (platform_key IN (
    'instagram', 'telegram', 'whatsapp', 'youtube', 'x_twitter', 'facebook', 'linkedin', 'github'
  )),
  label_en TEXT NOT NULL,
  label_or TEXT NOT NULL DEFAULT '',
  handle_text TEXT NOT NULL DEFAULT '',
  profile_url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'header_and_footer' CHECK (placement IN (
    'header_and_footer', 'footer_only', 'community_hub', 'all'
  )),
  follower_badge_text TEXT NOT NULL DEFAULT '',
  open_new_tab INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_soc_place_status ON nav_social_links(placement, status, sort_order);
