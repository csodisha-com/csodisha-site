-- Payments & Finance Batch 4 (v94): Modules 13-16
-- 13 Tax Configuration | 14 Payouts & Settlements | 15 Reconciliation | 16 Finance Reports
-- Idempotent. fin_revisions (Batch 1) is reused with module_code '13'..'15'. All money is integer paise.

CREATE TABLE IF NOT EXISTS fin_tax_rules (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  rule_code TEXT NOT NULL UNIQUE,
  rule_name_en TEXT NOT NULL,
  rule_name_or TEXT NOT NULL DEFAULT '',
  tax_regime TEXT NOT NULL DEFAULT 'indian_gst' CHECK (tax_regime IN ('indian_gst', 'exempt_educational', 'donation_80g')),
  hsn_sac_code TEXT NOT NULL DEFAULT '999293',
  applicable_scope TEXT NOT NULL DEFAULT 'all_taxable' CHECK (applicable_scope IN ('all_taxable', 'paid_resources', 'mock_tests', 'subscriptions', 'memberships', 'donations')),
  home_state_code TEXT NOT NULL DEFAULT '21',
  total_gst_pct REAL NOT NULL DEFAULT 18 CHECK (total_gst_pct IN (0, 5, 12, 18)),
  cgst_pct REAL NOT NULL DEFAULT 9,
  sgst_pct REAL NOT NULL DEFAULT 9,
  igst_pct REAL NOT NULL DEFAULT 18,
  is_tax_inclusive INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_tax_rules_status ON fin_tax_rules(status, applicable_scope);

CREATE TABLE IF NOT EXISTS fin_payout_settlements (
  id TEXT PRIMARY KEY,
  settlement_utr TEXT NOT NULL UNIQUE,
  gateway_key TEXT NOT NULL DEFAULT 'razorpay-live',
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  gross_captured_paise INTEGER NOT NULL DEFAULT 0,
  gateway_fee_paise INTEGER NOT NULL DEFAULT 0,
  gst_on_fee_paise INTEGER NOT NULL DEFAULT 0,
  net_settled_paise INTEGER NOT NULL DEFAULT 0,
  txn_count INTEGER NOT NULL DEFAULT 0,
  bank_account_masked TEXT NOT NULL DEFAULT 'SBI •••• 4821',
  settlement_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (settlement_status IN ('scheduled', 'processing', 'settled', 'on_hold')),
  settled_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_settlements_status ON fin_payout_settlements(settlement_status, gateway_key, created_at DESC);

CREATE TABLE IF NOT EXISTS fin_reconciliation_runs (
  id TEXT PRIMARY KEY,
  run_code TEXT NOT NULL UNIQUE,
  gateway_key TEXT NOT NULL DEFAULT 'all',
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  expected_ledger_paise INTEGER NOT NULL DEFAULT 0,
  gateway_reported_paise INTEGER NOT NULL DEFAULT 0,
  settled_bank_paise INTEGER NOT NULL DEFAULT 0,
  variance_paise INTEGER NOT NULL DEFAULT 0,
  matched_txn_count INTEGER NOT NULL DEFAULT 0,
  unmatched_txn_count INTEGER NOT NULL DEFAULT 0,
  discrepancy_items_json TEXT NOT NULL DEFAULT '[]',
  run_status TEXT NOT NULL DEFAULT 'balanced' CHECK (run_status IN ('balanced', 'variance_detected', 'resolved')),
  reconciled_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_recon_status ON fin_reconciliation_runs(run_status, created_at DESC);

CREATE TABLE IF NOT EXISTS fin_saved_reports (
  id TEXT PRIMARY KEY,
  report_code TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL DEFAULT 'gst_gstr1_summary' CHECK (report_type IN ('gst_gstr1_summary', 'revenue_by_product', 'gateway_settlement_ledger', 'refund_chargeback_register', 'donation_80g_ledger')),
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  summary_metrics_json TEXT NOT NULL DEFAULT '{}',
  generated_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_reports_type ON fin_saved_reports(report_type, created_at DESC);
