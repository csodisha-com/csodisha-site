-- Master Feature Registry Batch 3 (v127): Modules 09-11
-- 09 Implementation Status | 10 Regression Test Coverage | 11 Feature Documentation

CREATE TABLE IF NOT EXISTS reg_implementation_releases (
  id TEXT PRIMARY KEY,
  release_version TEXT NOT NULL UNIQUE,
  domain_suite TEXT NOT NULL,
  modules_range TEXT NOT NULL DEFAULT '01-11',
  modules_shipped_count INTEGER NOT NULL DEFAULT 0,
  migration_files_range TEXT NOT NULL DEFAULT '',
  sw_cache_tag TEXT NOT NULL DEFAULT '',
  csp_zero_inline_passed INTEGER NOT NULL DEFAULT 1,
  link_audit_passed INTEGER NOT NULL DEFAULT 1,
  deployment_status TEXT NOT NULL DEFAULT 'deployed_verified',
  deployed_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_rel_suite_status ON reg_implementation_releases(domain_suite, deployment_status);

CREATE TABLE IF NOT EXISTS reg_regression_test_suites (
  id TEXT PRIMARY KEY,
  test_code TEXT NOT NULL UNIQUE,
  script_path TEXT NOT NULL UNIQUE,
  domain_suite TEXT NOT NULL,
  test_category TEXT NOT NULL DEFAULT 'api_rbac_csrf_unit',
  assertions_count INTEGER NOT NULL DEFAULT 0,
  last_run_status TEXT NOT NULL DEFAULT 'passed_green',
  last_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_verified_at_ist TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_tst_cat_status ON reg_regression_test_suites(test_category, last_run_status);

CREATE TABLE IF NOT EXISTS reg_feature_documentation (
  id TEXT PRIMARY KEY,
  doc_slug TEXT NOT NULL UNIQUE,
  domain_suite TEXT NOT NULL,
  doc_category TEXT NOT NULL DEFAULT 'architecture_adr',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  body_markdown_en TEXT NOT NULL DEFAULT '',
  body_markdown_or TEXT NOT NULL DEFAULT '',
  related_modules_csv TEXT NOT NULL DEFAULT '',
  doc_status TEXT NOT NULL DEFAULT 'published_canonical',
  author_name TEXT NOT NULL DEFAULT 'Ramesh Biswal · CS Odisha Architecture',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_doc_cat_status ON reg_feature_documentation(doc_category, doc_status);
