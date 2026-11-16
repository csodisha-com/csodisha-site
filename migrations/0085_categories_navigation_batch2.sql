-- Categories & Navigation Batch 2 (v85): Modules 05-08
-- 05 Mega Menu | 06 Footer Navigation | 07 Sidebar Menus | 08 Breadcrumbs

CREATE INDEX IF NOT EXISTS idx_nav_menu_loc_col ON nav_menu_items(menu_location, column_group, sort_order);

CREATE TABLE IF NOT EXISTS nav_breadcrumb_rules (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  route_pattern TEXT NOT NULL,
  portal_key TEXT NOT NULL DEFAULT 'study-library',
  trail_json TEXT NOT NULL DEFAULT '[]',
  schema_org_enabled INTEGER NOT NULL DEFAULT 1,
  separator_symbol TEXT NOT NULL DEFAULT '›' CHECK (separator_symbol IN ('›', '/', '→')),
  show_home_icon INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nav_bc_portal_status ON nav_breadcrumb_rules(portal_key, status);
