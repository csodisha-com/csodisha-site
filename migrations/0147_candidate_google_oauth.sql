-- 0147_candidate_google_oauth.sql
-- Additive Google OAuth 2.0 columns for candidate accounts (strictly isolated from RBAC admin auth)

ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'password';

ALTER TABLE candidates ADD COLUMN google_sub TEXT;
ALTER TABLE candidates ADD COLUMN avatar_url TEXT;
ALTER TABLE candidates ADD COLUMN auth_provider TEXT DEFAULT 'password';

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_candidates_google_sub ON candidates(google_sub);
