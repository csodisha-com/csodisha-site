-- Phase 3 (v312): Real TOTP 2FA, CBT Mock Test Studio, 30-District Assignments,
-- Public Support Inbox, Live Ad Slots, and Monetization Plans / Coupons / Order Ledger.
-- Strictly additive migration: zero table drops, zero column renames, zero synthetic seed rows.

-- 1. Per-admin RFC 6238 TOTP 2FA credentials & hashed single-use recovery codes
CREATE TABLE IF NOT EXISTS admin_totp_credentials (
  admin_id TEXT PRIMARY KEY,
  secret_enc TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  recovery_hashes_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_totp_enabled ON admin_totp_credentials(enabled, updated_at DESC);

-- 2. CBT Mock Tests (additive-safe alongside 0003_cms_content.sql)
CREATE TABLE IF NOT EXISTS mock_tests (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  title_or TEXT NOT NULL DEFAULT '',
  exam_category TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  negative_mark REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mock_tests_status_v312 ON mock_tests(status, updated_at DESC);

-- 3. CBT Mock Questions (additive-safe alongside 0003_cms_content.sql)
CREATE TABLE IF NOT EXISTS mock_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  question_en TEXT NOT NULL DEFAULT '',
  question_or TEXT NOT NULL DEFAULT '',
  options_json TEXT NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation_en TEXT NOT NULL DEFAULT '',
  explanation_or TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mock_questions_test_v312 ON mock_questions(test_id);

-- 4. Real CBT Mock Test Attempts
CREATE TABLE IF NOT EXISTS mock_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  total_marks REAL NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_test_submitted ON mock_attempts(test_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_candidate ON mock_attempts(candidate_id, submitted_at DESC);

-- 5. 30-District Targeted Candidate "Assigned For You" Feed
CREATE TABLE IF NOT EXISTS candidate_assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL DEFAULT 'study_pdf',
  resource_url TEXT NOT NULL DEFAULT '',
  target_district TEXT NOT NULL DEFAULT 'All Odisha',
  target_exam TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_candidate_assignments_target ON candidate_assignments(target_district, target_exam, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_assignments_expires ON candidate_assignments(expires_at);

-- 6. Public Support & "Report an Error" / "Suggest Resource" Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_type TEXT NOT NULL DEFAULT 'report_error',
  page_url TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);

-- 7. Live Ad Slots & Sponsorship Banners (real impressions & outbound clicks)
CREATE TABLE IF NOT EXISTS ad_slots (
  id TEXT PRIMARY KEY,
  slot_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT 'Sponsored',
  starts_at TEXT NOT NULL DEFAULT '',
  ends_at TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ad_slots_key_active ON ad_slots(slot_key, active, created_at DESC);

-- 8. Monetization Membership Plans
CREATE TABLE IF NOT EXISTS monetization_plans (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  price_inr INTEGER NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 30,
  features_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_monetization_plans_active ON monetization_plans(active, price_inr ASC);

-- 9. Payment Promo Coupons
CREATE TABLE IF NOT EXISTS payment_coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_payment_coupons_active ON payment_coupons(active, code);

-- 10. Real Payment Orders Ledger (zero fake orders)
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  order_ref TEXT UNIQUE NOT NULL,
  candidate_id TEXT NOT NULL DEFAULT '',
  plan_id TEXT NOT NULL DEFAULT '',
  coupon_code TEXT NOT NULL DEFAULT '',
  amount_inr REAL NOT NULL DEFAULT 0,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_payment_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_candidate ON payment_orders(candidate_id, created_at DESC);
