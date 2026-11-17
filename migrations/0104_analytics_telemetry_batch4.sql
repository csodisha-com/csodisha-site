-- 0104_analytics_telemetry_batch4.sql
-- Analytics, Telemetry & User Feedback Intelligence Batch 4 (v104): Modules 13-14 (Completing 14-Module Suite)
-- 13 DPDP Act Privacy Audits | 14 Executive Analytics Digests

CREATE TABLE IF NOT EXISTS at_dpdp_privacy_audits (
  id TEXT PRIMARY KEY,
  audit_code TEXT NOT NULL UNIQUE,
  check_category TEXT NOT NULL DEFAULT 'zero_cookie_verification' CHECK (check_category IN ('zero_cookie_verification', 'raw_ip_redaction_scan', 'salt_rotation_check', 'retention_purge_30d', 'dpdp_request_sla_audit')),
  scope_target TEXT NOT NULL DEFAULT 'at_edge_pageviews',
  records_scanned INTEGER NOT NULL DEFAULT 0,
  pii_leaks_detected INTEGER NOT NULL DEFAULT 0,
  compliance_status TEXT NOT NULL DEFAULT 'verified_compliant' CHECK (compliance_status IN ('verified_compliant', 'warning_review', 'remediated')),
  verification_summary_en TEXT NOT NULL DEFAULT '',
  verification_summary_or TEXT NOT NULL DEFAULT '',
  executed_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_dpdp_audit_cat ON at_dpdp_privacy_audits(check_category, compliance_status, created_at DESC);

CREATE TABLE IF NOT EXISTS at_executive_digests (
  id TEXT PRIMARY KEY,
  digest_code TEXT NOT NULL UNIQUE,
  period_label TEXT NOT NULL,
  digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('weekly', 'monthly', 'on_demand_briefing')),
  headline_en TEXT NOT NULL,
  headline_or TEXT NOT NULL DEFAULT '',
  highlights_json TEXT NOT NULL DEFAULT '[]',
  metrics_snapshot_json TEXT NOT NULL DEFAULT '{}',
  delivery_status TEXT NOT NULL DEFAULT 'draft' CHECK (delivery_status IN ('draft', 'published_briefing', 'archived')),
  generated_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_at_digest_status ON at_executive_digests(delivery_status, digest_frequency, created_at DESC);
