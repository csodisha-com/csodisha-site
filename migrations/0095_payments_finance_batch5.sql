-- Payments & Finance Batch 5 (v95): Modules 17-18 + Full 18-Module Suite
-- 17 Payment Webhooks | 18 Fraud & Risk Events
-- Idempotent. fin_revisions (Batch 1) is reused with module_code '18'. Never stores raw webhook secrets.

CREATE TABLE IF NOT EXISTS fin_webhook_events (
  id TEXT PRIMARY KEY,
  event_uid TEXT NOT NULL UNIQUE,
  gateway_key TEXT NOT NULL DEFAULT 'razorpay' CHECK (gateway_key IN ('razorpay', 'cashfree', 'phonepe_upi', 'stripe')),
  event_type TEXT NOT NULL DEFAULT 'payment.captured' CHECK (event_type IN ('payment.captured', 'payment.failed', 'order.paid', 'refund.processed', 'dispute.created', 'settlement.processed')),
  signature_verified INTEGER NOT NULL DEFAULT 0,
  http_status_returned INTEGER NOT NULL DEFAULT 200,
  processing_status TEXT NOT NULL DEFAULT 'processed' CHECK (processing_status IN ('processed', 'ignored_duplicate', 'failed_signature', 'retry_queued', 'replayed')),
  linked_order_number TEXT NOT NULL DEFAULT '',
  linked_txn_reference TEXT NOT NULL DEFAULT '',
  amount_paise INTEGER NOT NULL DEFAULT 0,
  sanitized_payload_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT NOT NULL DEFAULT '',
  replay_count INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_webhooks_status ON fin_webhook_events(gateway_key, processing_status, received_at DESC);

CREATE TABLE IF NOT EXISTS fin_fraud_risk_events (
  id TEXT PRIMARY KEY,
  alert_code TEXT NOT NULL UNIQUE,
  rule_triggered TEXT NOT NULL DEFAULT 'high_value_anomaly' CHECK (rule_triggered IN ('velocity_burst_ip', 'high_value_anomaly', 'multiple_failed_cards', 'geo_mismatch_upi', 'chargeback_repeat_email')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  order_number TEXT NOT NULL DEFAULT '',
  txn_reference TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  ip_hash_masked TEXT NOT NULL DEFAULT '',
  amount_paise INTEGER NOT NULL DEFAULT 0,
  action_taken TEXT NOT NULL DEFAULT 'flagged_review' CHECK (action_taken IN ('flagged_review', 'auto_blocked', 'otp_challenged', 'cleared_safe')),
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'blocked_confirmed', 'false_positive_cleared')),
  analyst_notes TEXT NOT NULL DEFAULT '',
  resolved_by TEXT NOT NULL DEFAULT '',
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_fraud_status ON fin_fraud_risk_events(resolution_status, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS fin_fraud_rules (
  id TEXT PRIMARY KEY,
  rule_key TEXT NOT NULL UNIQUE CHECK (rule_key IN ('velocity_burst_ip', 'high_value_anomaly', 'multiple_failed_cards', 'geo_mismatch_upi', 'chargeback_repeat_email')),
  rule_name_en TEXT NOT NULL,
  rule_name_or TEXT NOT NULL DEFAULT '',
  threshold_value INTEGER NOT NULL DEFAULT 5,
  window_minutes INTEGER NOT NULL DEFAULT 15,
  auto_action TEXT NOT NULL DEFAULT 'flag' CHECK (auto_action IN ('flag', 'challenge', 'block')),
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
