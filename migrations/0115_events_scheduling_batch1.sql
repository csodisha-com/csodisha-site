-- Events & Scheduling Batch 1 (v115): Modules 01-03
-- 01 State Competitive Exam Calendar | 02 Entrance & Admission Milestones | 03 Recruitment Application Deadlines & Countdown Engine
-- All dates & timestamps normalized to IST (Asia/Kolkata, +05:30).

CREATE TABLE IF NOT EXISTS evt_exam_calendar (
  id TEXT PRIMARY KEY,
  event_code TEXT NOT NULL UNIQUE,
  commission_body TEXT NOT NULL DEFAULT 'OPSC',
  exam_name_en TEXT NOT NULL,
  exam_name_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  exam_stage TEXT NOT NULL DEFAULT 'prelims',
  exam_date_start TEXT NOT NULL,
  exam_date_end TEXT NOT NULL,
  shift_timing_ist TEXT NOT NULL DEFAULT '10:00 AM – 12:00 PM IST',
  official_notice_url TEXT NOT NULL DEFAULT '',
  district_scope TEXT NOT NULL DEFAULT 'all_30_districts',
  schedule_status TEXT NOT NULL DEFAULT 'confirmed',
  is_featured INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_exam_body_status
  ON evt_exam_calendar(commission_body, schedule_status, exam_date_start);

CREATE TABLE IF NOT EXISTS evt_admission_milestones (
  id TEXT PRIMARY KEY,
  milestone_code TEXT NOT NULL UNIQUE,
  portal_authority TEXT NOT NULL DEFAULT 'SAMS_ODISHA',
  program_stream TEXT NOT NULL DEFAULT 'plus_two_plus_three',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  milestone_phase TEXT NOT NULL DEFAULT 'caf_application',
  starts_at_ist TEXT NOT NULL,
  ends_at_ist TEXT NOT NULL,
  official_portal_url TEXT NOT NULL DEFAULT '',
  eligibility_note_en TEXT NOT NULL DEFAULT '',
  eligibility_note_or TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active_live',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_adm_auth_status
  ON evt_admission_milestones(portal_authority, status, starts_at_ist);

CREATE TABLE IF NOT EXISTS evt_deadline_countdowns (
  id TEXT PRIMARY KEY,
  deadline_code TEXT NOT NULL UNIQUE,
  commission_body TEXT NOT NULL DEFAULT 'OPSC',
  post_title_en TEXT NOT NULL,
  post_title_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  total_vacancies INTEGER NOT NULL DEFAULT 0,
  registration_opens_ist TEXT NOT NULL,
  registration_closes_ist TEXT NOT NULL,
  fee_payment_closes_ist TEXT NOT NULL DEFAULT '',
  correction_window_note TEXT NOT NULL DEFAULT '',
  apply_portal_url TEXT NOT NULL DEFAULT '',
  urgency_badge TEXT NOT NULL DEFAULT 'open_normal',
  is_pinned_ticker INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active_live',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_ddl_status_close
  ON evt_deadline_countdowns(status, urgency_badge, registration_closes_ist);

CREATE TABLE IF NOT EXISTS evt_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_rev_entity
  ON evt_revisions(module_code, entity_id, version_num DESC);
