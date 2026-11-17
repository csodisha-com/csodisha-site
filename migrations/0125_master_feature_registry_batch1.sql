-- Master Feature Registry Batch 1 (v125): Modules 01-04
-- 01 All Discovered Features | 02 Page & Route Inventory | 03 Public UI Components | 04 Database Entities

CREATE TABLE IF NOT EXISTS reg_discovered_features (
  id TEXT PRIMARY KEY,
  feature_code TEXT NOT NULL UNIQUE,
  feature_name_en TEXT NOT NULL,
  feature_name_or TEXT NOT NULL DEFAULT '',
  domain_suite TEXT NOT NULL DEFAULT 'Educational Resources',
  surface_layer TEXT NOT NULL DEFAULT 'admin_command_center',
  discovery_source TEXT NOT NULL DEFAULT 'master_navigation_scan',
  has_admin_control INTEGER NOT NULL DEFAULT 1,
  csp_compliant INTEGER NOT NULL DEFAULT 1,
  lifecycle_state TEXT NOT NULL DEFAULT 'production_live',
  release_tag TEXT NOT NULL DEFAULT 'v125',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_ftr_suite_layer
  ON reg_discovered_features(domain_suite, surface_layer, lifecycle_state);

CREATE TABLE IF NOT EXISTS reg_page_route_inventory (
  id TEXT PRIMARY KEY,
  route_path TEXT NOT NULL UNIQUE,
  file_or_handler TEXT NOT NULL DEFAULT '',
  route_kind TEXT NOT NULL DEFAULT 'static_html_page',
  auth_requirement TEXT NOT NULL DEFAULT 'public_open',
  edge_cache_policy TEXT NOT NULL DEFAULT 'sw_stale_while_revalidate',
  bilingual_ready INTEGER NOT NULL DEFAULT 1,
  audit_status TEXT NOT NULL DEFAULT 'verified_200',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_rte_kind_auth
  ON reg_page_route_inventory(route_kind, auth_requirement, audit_status);

CREATE TABLE IF NOT EXISTS reg_public_ui_components (
  id TEXT PRIMARY KEY,
  component_code TEXT NOT NULL UNIQUE,
  component_name TEXT NOT NULL,
  asset_script_path TEXT NOT NULL DEFAULT '',
  css_stylesheet_path TEXT NOT NULL DEFAULT '',
  csp_zero_inline_verified INTEGER NOT NULL DEFAULT 1,
  wcag_aa_verified INTEGER NOT NULL DEFAULT 1,
  used_on_pages_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active_live',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_cmp_status
  ON reg_public_ui_components(status);

CREATE TABLE IF NOT EXISTS reg_database_entities (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL UNIQUE,
  suite_owner TEXT NOT NULL DEFAULT 'Platform Core',
  migration_file TEXT NOT NULL DEFAULT '',
  column_count INTEGER NOT NULL DEFAULT 0,
  live_row_count INTEGER NOT NULL DEFAULT 0,
  contains_pii_or_hashes INTEGER NOT NULL DEFAULT 0,
  dpdp_retention_policy TEXT NOT NULL DEFAULT 'non_pii_public_catalog',
  schema_health TEXT NOT NULL DEFAULT 'synced_verified',
  last_introspected_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_reg_db_suite_health
  ON reg_database_entities(suite_owner, schema_health);

CREATE TABLE IF NOT EXISTS reg_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_rev_entity
  ON reg_revisions(module_code, entity_id, version_num DESC);
