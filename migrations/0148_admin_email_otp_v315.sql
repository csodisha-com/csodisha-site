-- 0148_admin_email_otp_v315.sql
-- Additive D1 migration for Admin Login Email OTP Verification (v315)

CREATE TABLE IF NOT EXISTS admin_email_otps (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_email_otps_lookup
  ON admin_email_otps(admin_id, consumed, expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_email_otps_expires
  ON admin_email_otps(expires_at);

INSERT OR IGNORE INTO feature_flags (key, enabled, description, updated_at, updated_by)
VALUES (
  'admin_email_otp_enabled',
  1,
  'Require 6-digit Email OTP verification on staff/admin login when an email provider key is configured.',
  CURRENT_TIMESTAMP,
  'system'
);
