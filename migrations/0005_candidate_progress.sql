-- =============================================================================
-- Migration 0005: Candidate Progress (Persistent CBT Attempts & D1 Bookmarks)
-- =============================================================================

CREATE TABLE IF NOT EXISTS test_attempts (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  test_id          TEXT NOT NULL,
  score            REAL NOT NULL,
  max_score        REAL NOT NULL,
  accuracy         REAL NOT NULL,
  correct_count    INTEGER NOT NULL DEFAULT 0,
  wrong_count      INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  time_taken_sec   INTEGER NOT NULL DEFAULT 0,
  answers_json     TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_leaderboard
  ON test_attempts (test_id, score DESC, time_taken_sec ASC);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_recent
  ON test_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  user_id    TEXT NOT NULL,
  item_type  TEXT NOT NULL CHECK (item_type IN ('job', 'current-affair', 'mock-test', 'resource')),
  item_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  meta_json  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_recent
  ON user_bookmarks (user_id, created_at DESC);
