-- 0002: staff roles, audit trail, admin rate limiting.
-- Roles: candidate (default) | editor | admin. users.role is the single source of
-- truth; sessions.role is never trusted for authorization.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'candidate'
  CHECK (role IN ('candidate', 'editor', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);

CREATE TABLE IF NOT EXISTS admin_rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_admin_rl_window ON admin_rate_limits(window_start);
