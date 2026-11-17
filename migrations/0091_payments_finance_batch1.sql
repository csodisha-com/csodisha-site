-- Payments & Finance Batch 1 (v91): Modules 01-04
-- 01 Payment Overview | 02 Gateway Settings | 03 Transactions | 04 Orders
-- Idempotent. Starter Odisha INR records are seeded by ensurePaymentsFinanceBatch1Schema() when tables are empty.
-- Raw gateway secrets are never stored: only secret_masked_hint.

CREATE TABLE IF NOT EXISTS fin_gateways (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      provider_key TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider_key IN ('razorpay','cashfree','phonepe_upi','paytm_business','stripe','manual_upi_qr')),
      display_name_en TEXT NOT NULL,
      display_name_or TEXT NOT NULL DEFAULT '',
      environment_mode TEXT NOT NULL DEFAULT 'test_sandbox' CHECK (environment_mode IN ('test_sandbox','live_production')),
      merchant_id_or_key_id TEXT NOT NULL DEFAULT '',
      secret_masked_hint TEXT NOT NULL DEFAULT '',
      webhook_endpoint_path TEXT NOT NULL DEFAULT '',
      supported_methods_json TEXT NOT NULL DEFAULT '["upi","cards","netbanking","wallet"]',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      convenience_fee_pct REAL NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      health_status TEXT NOT NULL DEFAULT 'sandbox_ready' CHECK (health_status IN ('connected','sandbox_ready','disabled')),
      priority_order INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_gateways_status ON fin_gateways(status, priority_order);

CREATE TABLE IF NOT EXISTS fin_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_state TEXT NOT NULL DEFAULT 'Odisha',
      user_id TEXT,
      order_type TEXT NOT NULL DEFAULT 'study_pack' CHECK (order_type IN ('study_pack','mock_test_series','membership','ebook','donation')),
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal_paise INTEGER NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'INR',
      coupon_code TEXT NOT NULL DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded','partially_refunded')),
      fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled','access_granted','cancelled')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_orders_status ON fin_orders(payment_status, fulfillment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS fin_transactions (
      id TEXT PRIMARY KEY,
      txn_reference TEXT NOT NULL UNIQUE,
      order_id TEXT REFERENCES fin_orders(id) ON DELETE SET NULL,
      gateway_key TEXT NOT NULL DEFAULT '',
      gateway_payment_id TEXT NOT NULL DEFAULT '',
      gateway_order_id TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi','card','netbanking','wallet','manual_bank')),
      upi_vpa_or_last4 TEXT NOT NULL DEFAULT '',
      amount_paise INTEGER NOT NULL DEFAULT 0,
      gateway_fee_paise INTEGER NOT NULL DEFAULT 0,
      net_settled_paise INTEGER NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'INR',
      txn_status TEXT NOT NULL DEFAULT 'initiated' CHECK (txn_status IN ('initiated','authorized','captured','failed','refunded')),
      failure_reason TEXT NOT NULL DEFAULT '',
      captured_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_txn_status ON fin_transactions(txn_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fin_txn_order ON fin_transactions(order_id);

CREATE TABLE IF NOT EXISTS fin_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL DEFAULT 1,
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_rev_entity ON fin_revisions(module_code, entity_id, version_num DESC);
