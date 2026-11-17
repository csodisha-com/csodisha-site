-- Master Feature Registry Batch 2 (v126): Modules 05-08
-- 05 API Endpoints | 06 Admin Coverage Matrix | 07 Missing Admin Controls | 08 Feature Dependencies

CREATE TABLE IF NOT EXISTS reg_api_endpoints (
  id TEXT PRIMARY KEY,
  endpoint_code TEXT NOT NULL UNIQUE,
  http_method TEXT NOT NULL DEFAULT 'GET',
  endpoint_path TEXT NOT NULL,
  domain_suite TEXT NOT NULL DEFAULT 'Public Edge APIs',
  auth_guard TEXT NOT NULL DEFAULT 'admin_rbac_csrf',
  cache_strategy TEXT NOT NULL DEFAULT 'no_store',
  rate_limit_tier TEXT NOT NULL DEFAULT 'admin_internal',
  contract_status TEXT NOT NULL DEFAULT 'verified_live',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_api_method_auth
  ON reg_api_endpoints(http_method, auth_guard, contract_status);

CREATE TABLE IF NOT EXISTS reg_admin_coverage_matrix (
  id TEXT PRIMARY KEY,
  suite_code TEXT NOT NULL UNIQUE,
  suite_name TEXT NOT NULL,
  total_modules_count INTEGER NOT NULL DEFAULT 0,
  implemented_modules_count INTEGER NOT NULL DEFAULT 0,
  d1_backed_count INTEGER NOT NULL DEFAULT 0,
  csp_compliant_count INTEGER NOT NULL DEFAULT 0,
  coverage_pct INTEGER NOT NULL DEFAULT 100,
  release_range TEXT NOT NULL DEFAULT '',
  matrix_status TEXT NOT NULL DEFAULT 'complete_100',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reg_missing_controls (
  id TEXT PRIMARY KEY,
  gap_code TEXT NOT NULL UNIQUE,
  surface_area TEXT NOT NULL,
  domain_suite TEXT NOT NULL DEFAULT 'Candidate Portal',
  severity_tier TEXT NOT NULL DEFAULT 'p2_medium',
  gap_description_en TEXT NOT NULL DEFAULT '',
  recommended_module_target TEXT NOT NULL DEFAULT '',
  remediation_status TEXT NOT NULL DEFAULT 'open_gap',
  resolved_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_gap_status_sev
  ON reg_missing_controls(remediation_status, severity_tier);

CREATE TABLE IF NOT EXISTS reg_feature_dependencies (
  id TEXT PRIMARY KEY,
  dep_code TEXT NOT NULL UNIQUE,
  source_feature_code TEXT NOT NULL,
  source_feature_name TEXT NOT NULL DEFAULT '',
  target_feature_code TEXT NOT NULL,
  target_feature_name TEXT NOT NULL DEFAULT '',
  dependency_type TEXT NOT NULL DEFAULT 'requires_d1_schema',
  is_critical_path INTEGER NOT NULL DEFAULT 1,
  health_status TEXT NOT NULL DEFAULT 'healthy_verified',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_dep_type_health
  ON reg_feature_dependencies(dependency_type, health_status);
