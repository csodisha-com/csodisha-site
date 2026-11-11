-- schema.sql
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
  district TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  lockout_until INTEGER DEFAULT 0,
  target_streams TEXT NOT NULL, -- JSON array (e.g. ["opsc", "ossc"])
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- 2. Syllabus & Milestone Checklists
CREATE TABLE IF NOT EXISTS candidate_checklists (
  candidate_id TEXT NOT NULL,
  exam_stream TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (candidate_id, exam_stream, topic_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- 2b. Candidate Bookmarks (State Sync)
CREATE TABLE IF NOT EXISTS candidate_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, article_id)
);

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
CREATE INDEX IF NOT EXISTS idx_candidate_checklists_cid ON candidate_checklists(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_mock_scores_cid ON candidate_mock_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON candidate_bookmarks(user_id);
