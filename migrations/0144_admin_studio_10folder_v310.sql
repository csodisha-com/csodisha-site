-- Phase 1 (v310): 10-Folder Admin Studio Architecture
-- Strictly additive migration: preserves all existing tables and columns.
-- Adds:
--   1. institutional_pages (Folder #8: Institutional & Legal Pages)
--   2. site_snippets       (Folder #8: Global Footer & Official Source Disclaimer Snippets)
--   3. media_files         (Folder #9: Cloudflare R2 File & Media Manager — additive-safe if 0087 already exists)
--   4. admin_audit_logs    (Folder #10: Real Async Admin Audit Log)
--   5. admin_sessions      (Folder #10: Active Staff Sessions & Force Revoke)
--   6. feature_flags       (Folder #10: Edge-Enforced Live Feature Flags)
--   7. redirects           (Folder #10: Edge-Enforced 301/302 Redirects)

CREATE TABLE IF NOT EXISTS institutional_pages (
  slug TEXT PRIMARY KEY,
  title_en TEXT NOT NULL DEFAULT '',
  title_or TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_or TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_institutional_pages_updated ON institutional_pages(updated_at DESC);

CREATE TABLE IF NOT EXISTS site_snippets (
  key TEXT PRIMARY KEY,
  value_en TEXT NOT NULL DEFAULT '',
  value_or TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  file_key TEXT UNIQUE,
  original_name TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'Jobs',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_files_created_v310 ON media_files(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  session_token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(revoked_at, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  is_active INTEGER NOT NULL DEFAULT 1,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_redirects_active_source ON redirects(is_active, source_path);
