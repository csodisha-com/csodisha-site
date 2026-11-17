-- Payments & Finance Batch 3 (v93): Modules 09-12
-- 09 Donations | 10 Coupons & Offers | 11 Refunds & Disputes | 12 Invoices & Receipts
-- Idempotent. fin_revisions (Batch 1) is reused with module_code '09'..'12'. All money is integer paise.

CREATE TABLE IF NOT EXISTS fin_donation_campaigns (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  campaign_code TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  cause_category TEXT NOT NULL DEFAULT 'free_odia_textbooks' CHECK (cause_category IN ('free_odia_textbooks', 'rural_student_scholarships', 'open_pyq_digitization', 'platform_sustainability')),
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  goal_paise INTEGER NOT NULL DEFAULT 0,
  raised_paise INTEGER NOT NULL DEFAULT 0,
  donor_count INTEGER NOT NULL DEFAULT 0,
  suggested_amounts_json TEXT NOT NULL DEFAULT '[10100, 25100, 50100, 110000]',
  allow_custom_amount INTEGER NOT NULL DEFAULT 1,
  show_donor_wall INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_don_camp_status ON fin_donation_campaigns(status, featured);

CREATE TABLE IF NOT EXISTS fin_donation_entries (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES fin_donation_campaigns(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL DEFAULT '',
  donor_city TEXT NOT NULL DEFAULT '',
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'upi',
  txn_reference TEXT NOT NULL DEFAULT '',
  message_note TEXT NOT NULL DEFAULT '',
  receipt_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_don_entries_camp ON fin_donation_entries(campaign_id, status);

CREATE TABLE IF NOT EXISTS fin_coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'flat_paise')),
  discount_value INTEGER NOT NULL DEFAULT 10,
  max_discount_paise INTEGER NOT NULL DEFAULT 0,
  min_order_paise INTEGER NOT NULL DEFAULT 0,
  applicable_scope TEXT NOT NULL DEFAULT 'all' CHECK (applicable_scope IN ('all', 'paid_resources', 'products', 'subscriptions', 'memberships')),
  usage_limit_total INTEGER NOT NULL DEFAULT 0,
  usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TEXT,
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_coupons_code ON fin_coupons(code, status);

CREATE TABLE IF NOT EXISTS fin_refunds_disputes (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL UNIQUE,
  case_type TEXT NOT NULL DEFAULT 'refund_request' CHECK (case_type IN ('refund_request', 'partial_refund', 'gateway_chargeback', 'upi_dispute')),
  order_id TEXT NOT NULL REFERENCES fin_orders(id) ON DELETE RESTRICT,
  transaction_id TEXT REFERENCES fin_transactions(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  amount_paise INTEGER NOT NULL DEFAULT 0,
  reason_code TEXT NOT NULL DEFAULT 'accidental_purchase' CHECK (reason_code IN ('duplicate_payment', 'accidental_purchase', 'content_mismatch', 'technical_access_issue', 'bank_chargeback')),
  reason_notes TEXT NOT NULL DEFAULT '',
  gateway_refund_id TEXT NOT NULL DEFAULT '',
  evidence_notes TEXT NOT NULL DEFAULT '',
  case_status TEXT NOT NULL DEFAULT 'open' CHECK (case_status IN ('open', 'under_review', 'approved_processed', 'rejected', 'won_dispute', 'lost_dispute')),
  revoke_digital_access INTEGER NOT NULL DEFAULT 1,
  resolved_by TEXT NOT NULL DEFAULT '',
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_refunds_status ON fin_refunds_disputes(case_status, created_at DESC);

CREATE TABLE IF NOT EXISTS fin_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL DEFAULT 'tax_invoice' CHECK (doc_type IN ('tax_invoice', 'payment_receipt', 'donation_receipt', 'credit_note')),
  order_id TEXT REFERENCES fin_orders(id) ON DELETE SET NULL,
  transaction_id TEXT REFERENCES fin_transactions(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL DEFAULT '',
  customer_state TEXT NOT NULL DEFAULT 'Odisha',
  customer_gstin TEXT NOT NULL DEFAULT '',
  supplier_gstin TEXT NOT NULL DEFAULT '21AAACC1234D1Z5',
  hsn_sac_code TEXT NOT NULL DEFAULT '999293',
  taxable_paise INTEGER NOT NULL DEFAULT 0,
  cgst_paise INTEGER NOT NULL DEFAULT 0,
  sgst_paise INTEGER NOT NULL DEFAULT 0,
  igst_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL DEFAULT 0,
  line_items_json TEXT NOT NULL DEFAULT '[]',
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'voided')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_order ON fin_invoices(order_id, status);
