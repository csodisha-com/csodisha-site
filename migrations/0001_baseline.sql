-- 0001_baseline.sql — snapshot of schema.sql at CMS checkpoint (all statements idempotent).
-- Common Sense Odisha (CSO) — Edge Database Schema (Cloudflare D1 / SQLite)
-- Candidate Workspace, Identity Vault, Checklists, Document Locker & Telemetry

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  lockout_until INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 1b. Candidates & Profile Workspace (compat)
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  district TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  lockout_until INTEGER DEFAULT 0,
  target_streams TEXT NOT NULL, -- JSON array (e.g. ["opsc", "ossc"])
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- MIGRATION (pre-phone deployments): add the phone column, then apply the
-- unique partial index at the bottom of this file. Run once per database:
--   ALTER TABLE candidates ADD COLUMN phone TEXT;
-- (Safe to run only if the column does not already exist.)

-- 1d. Active Server Sessions (opaque 256-bit tokens, 30-day TTL)
-- Identity is resolved exclusively from this table — never from client input.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 1e. Password Reset Requests (dual-channel recovery)
-- Dual-channel: one row powers BOTH recovery channels.
--   otp_hash    = SHA-256 of the 6-digit email OTP (in-page verification)
--   token_hash  = SHA-256 of the 256-bit magic-link token
--                 (/reset-password.html?token=<token>)
--   grant_hash  = SHA-256 of the one-time reset grant minted after a
--                 successful in-page OTP verification
-- Plaintext OTP/token/grant values are NEVER stored — only their hashes.
-- attempts counts failed OTP verifications (max 5, then the row is
-- invalidated). used flags consumption (single-use for every channel).
-- expires_at is stored as unix seconds (15-minute TTL) to match the
-- sessions/email_verifications convention.
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,       -- SHA-256 hash of the 256-bit magic link token
  otp_hash TEXT NOT NULL,                 -- SHA-256 hash of the 6-digit OTP
  grant_hash TEXT,                        -- SHA-256 hash of the post-OTP reset grant
  attempts INTEGER DEFAULT 0,            -- Failed OTP attempts counter
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_grant_hash ON password_resets(grant_hash);

-- 2. Syllabus & Preparation Checklist Progress
-- Key conventions:
--   exam_code     = uppercase exam key, e.g. 'OPSC', 'OSSC', 'OSSSC', 'TEACHING', 'POLICE'
--   milestone_key = '<stageId>::<topicId>' when the syllabus stage is known
--                   (e.g. 'opsc-prelims::opsc-p-gs1-hist'), otherwise the raw
--                   milestone/topic key for legacy or flat entries.
-- is_completed: 0 = pending, 1 = completed (rows persist for progress history).
CREATE TABLE IF NOT EXISTS candidate_checklist (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  exam_code TEXT NOT NULL,          -- e.g., 'OPSC_OCS', 'OSSC_CGL'
  milestone_key TEXT NOT NULL,      -- e.g., 'prelims_gs1_odisha_history'
  is_completed INTEGER DEFAULT 0,  -- 0 = pending, 1 = completed
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_candidate_milestone
ON candidate_checklist(candidate_id, exam_code, milestone_key);
CREATE INDEX IF NOT EXISTS idx_checklist_candidate_id
ON candidate_checklist(candidate_id);

-- 2b. Candidate Bookmarks for Recruitment Posts
-- category is a strict enum; deadline_date (ISO 'YYYY-MM-DD') powers the
-- dashboard countdown widgets. post_id is unique per candidate.
CREATE TABLE IF NOT EXISTS candidate_bookmarks (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('OPSC', 'OSSC', 'OSSSC', 'TEACHING', 'OTHER')),
  post_title TEXT NOT NULL,
  post_url TEXT,
  deadline_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_candidate_post
ON candidate_bookmarks(candidate_id, post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_candidate_id
ON candidate_bookmarks(candidate_id);

-- 3. Document Locker Statuses
CREATE TABLE IF NOT EXISTS candidate_lockers (
  candidate_id TEXT PRIMARY KEY,
  locker_data TEXT NOT NULL, -- JSON object tracking HSC, Degree, KYC
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- 4. Revision Scratchpad Notes
CREATE TABLE IF NOT EXISTS candidate_notes (
  candidate_id TEXT PRIMARY KEY,
  notes_content TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- 5. Mock Test Score Logs
CREATE TABLE IF NOT EXISTS candidate_mock_scores (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  score REAL NOT NULL,
  total_marks REAL NOT NULL,
  accuracy_rate REAL,
  tested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- MIGRATION (v2 -> v3): legacy checklist/bookmark tables rebuilt to the new
-- spec shapes. The legacy `candidate_checklists` (exam_stream/topic_id PK) and
-- the old `candidate_bookmarks` (user_id/article_id/title/url) are renamed,
-- recreated per spec above, and their rows copied across. Run per database:
--   ALTER TABLE candidate_bookmarks RENAME TO candidate_bookmarks_legacy;
--   ALTER TABLE candidate_checklists RENAME TO candidate_checklists_legacy;
--   wrangler d1 execute cso-database --remote --file schema.sql
--   INSERT INTO candidate_bookmarks (id, candidate_id, post_id, category, post_title, post_url, deadline_date, created_at)
--     SELECT id, user_id, article_id, 'OTHER', title, url, NULL, datetime(created_at, 'unixepoch')
--     FROM candidate_bookmarks_legacy;
--   INSERT INTO candidate_checklist (id, candidate_id, exam_code, milestone_key, is_completed, updated_at)
--     SELECT 'chk_' || candidate_id || '_' || UPPER(exam_stream) || '_' || topic_id,
--            candidate_id, UPPER(exam_stream), topic_id, is_completed, updated_at
--     FROM candidate_checklists_legacy;
--   DROP TABLE candidate_bookmarks_legacy;
--   DROP TABLE candidate_checklists_legacy;

-- 1c. Pending Email Verifications & Dual-Channel Auth Lifecycle
-- One row per pending candidate: the 6-digit OTP (channel 1) and the magic-link
-- token (channel 2) share a single 15-minute expiry window. 'attempts' tracks
-- failed OTP submissions (row is invalidated after 5 misses); 'created_at' is
-- refreshed on every dispatch and doubles as the resend-cooldown timestamp.
CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  token TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  candidate_data TEXT,
  attempts INTEGER DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- MIGRATION (v1 -> v2): the legacy 'magic_token' column was renamed to 'token'
-- (now NOT NULL) and 'last_requested_at' was folded into 'created_at'. Rows in
-- this table expire after 15 minutes, so already-deployed D1 databases can
-- drop and recreate it safely (candidates simply request a fresh code):
--   wrangler d1 execute cso-database --remote --command "DROP TABLE IF EXISTS email_verifications;"
--   wrangler d1 execute cso-database --remote --file schema.sql

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_candidate_mock_scores_cid ON candidate_mock_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Strict 1-to-1 phone uniqueness: at most one verified candidate per mobile
-- number. Partial index keeps legacy/NULL rows out of the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_phone
ON candidates(phone)
WHERE phone IS NOT NULL AND phone != '';
