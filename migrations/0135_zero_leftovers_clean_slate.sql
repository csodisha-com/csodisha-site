-- Migration 0135: Zero-Leftovers Clean-Slate Sweep (v238)
-- Wipes all remaining candidate workspace records, bookmarks, test attempts, and audit logs
-- so every workspace and public route starts as a clean canvas ready to be authored in /admin/.
-- Preserves `candidates` and `users` login accounts as well as the 5 root navigation pillars
-- in `nav_categories` and `nav_menu_items`.

CREATE TABLE IF NOT EXISTS candidate_checklist (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  exam_code TEXT NOT NULL,
  milestone_key TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_exam_preferences (
  candidate_id TEXT PRIMARY KEY,
  domain TEXT,
  track TEXT,
  primary_exam TEXT,
  selected_exams_json TEXT,
  selected_streams_json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_notes (
  candidate_id TEXT PRIMARY KEY,
  content TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_bookmarks (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  category TEXT,
  post_title TEXT,
  post_url TEXT,
  deadline_date TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_lockers (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  status TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_mock_scores (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  exam_name TEXT,
  score REAL,
  max_marks REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT,
  item_id TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  mock_test_id TEXT,
  score REAL,
  max_score REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_audit_logs (
  id TEXT PRIMARY KEY,
  candidate_id TEXT,
  action TEXT,
  created_at TEXT
);

DELETE FROM candidate_checklist;
DELETE FROM candidate_exam_preferences;
DELETE FROM candidate_notes;
DELETE FROM candidate_bookmarks;
DELETE FROM candidate_lockers;
DELETE FROM candidate_mock_scores;
DELETE FROM user_bookmarks;
DELETE FROM test_attempts;
DELETE FROM audit_log;
DELETE FROM candidate_audit_logs;

-- Ensure ONLY the 5 clean root pillars remain in nav_categories & nav_menu_items
DELETE FROM nav_categories
WHERE slug NOT IN ('jobs-careers', 'schemes-benefits', 'study-library', 'community', 'about');

DELETE FROM nav_menu_items
WHERE id NOT IN ('nmenu-pillar-01', 'nmenu-pillar-02', 'nmenu-pillar-03', 'nmenu-pillar-04', 'nmenu-pillar-05');
