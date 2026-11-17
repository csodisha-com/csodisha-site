-- Events & Scheduling Batch 2 (v116): Modules 04-06
-- 04 Admit Card, Hall Ticket & Center Allotment Alerts
-- 05 Answer Key Challenges & Provisional Key Timelines
-- 06 Result Declarations & Document Verification (DV) Rosters
-- All timestamps normalized to IST (Asia/Kolkata, +05:30). INR fees stored in integer paise.

CREATE TABLE IF NOT EXISTS evt_admit_card_releases (
  id TEXT PRIMARY KEY,
  release_code TEXT NOT NULL UNIQUE,
  commission_body TEXT NOT NULL DEFAULT 'OPSC',
  exam_name_en TEXT NOT NULL,
  exam_name_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  release_stage TEXT NOT NULL DEFAULT 'admit_card_live',
  released_at_ist TEXT NOT NULL,
  exam_date_ist TEXT NOT NULL,
  allotted_districts_json TEXT NOT NULL DEFAULT '[]',
  download_portal_url TEXT NOT NULL DEFAULT '',
  login_credentials_required TEXT NOT NULL DEFAULT 'PPSAN / User ID + DOB',
  release_status TEXT NOT NULL DEFAULT 'live_download',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_admit_body_status
  ON evt_admit_card_releases(commission_body, release_status, exam_date_ist);

CREATE TABLE IF NOT EXISTS evt_answer_key_challenges (
  id TEXT PRIMARY KEY,
  key_code TEXT NOT NULL UNIQUE,
  commission_body TEXT NOT NULL DEFAULT 'OSSC',
  exam_name_en TEXT NOT NULL,
  exam_name_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  key_stage TEXT NOT NULL DEFAULT 'provisional_key_open',
  provisional_released_at_ist TEXT NOT NULL,
  objection_deadline_ist TEXT NOT NULL,
  fee_per_question_paise INTEGER NOT NULL DEFAULT 0,
  is_fee_refundable_if_accepted INTEGER NOT NULL DEFAULT 1,
  answer_key_pdf_url TEXT NOT NULL DEFAULT '',
  objection_portal_url TEXT NOT NULL DEFAULT '',
  total_sets_covered TEXT NOT NULL DEFAULT 'Sets A, B, C, D',
  status TEXT NOT NULL DEFAULT 'open_for_challenge',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_key_body_status
  ON evt_answer_key_challenges(commission_body, status, objection_deadline_ist);

CREATE TABLE IF NOT EXISTS evt_results_dv_rosters (
  id TEXT PRIMARY KEY,
  roster_code TEXT NOT NULL UNIQUE,
  commission_body TEXT NOT NULL DEFAULT 'OSSC',
  exam_name_en TEXT NOT NULL,
  exam_name_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  declaration_type TEXT NOT NULL DEFAULT 'prelims_shortlist',
  declared_at_ist TEXT NOT NULL,
  dv_start_date_ist TEXT NOT NULL DEFAULT '',
  dv_end_date_ist TEXT NOT NULL DEFAULT '',
  dv_venue_odisha TEXT NOT NULL DEFAULT '',
  shortlisted_candidates_count INTEGER NOT NULL DEFAULT 0,
  roll_range_summary TEXT NOT NULL DEFAULT '',
  cutoff_summary_en TEXT NOT NULL DEFAULT '',
  cutoff_summary_or TEXT NOT NULL DEFAULT '',
  result_pdf_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published_live',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_res_body_type_status
  ON evt_results_dv_rosters(commission_body, declaration_type, status, declared_at_ist);
