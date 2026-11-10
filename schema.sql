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

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidate_checklists_cid ON candidate_checklists(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_mock_scores_cid ON candidate_mock_scores(candidate_id);
