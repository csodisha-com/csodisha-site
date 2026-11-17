-- Events & Scheduling Batch 3 (v117): Modules 07-09
-- 07 Offline Workshops & District Meetups
-- 08 Live Webinars & Virtual Counseling Sessions
-- 09 Calendar Sync, ICS Feeds & Push Notification Dispatcher
-- All timestamps normalized to IST (Asia/Kolkata, +05:30). Zero raw PII or raw passcodes.

CREATE TABLE IF NOT EXISTS evt_district_meetups (
  id TEXT PRIMARY KEY,
  meetup_code TEXT NOT NULL UNIQUE,
  district_odisha TEXT NOT NULL DEFAULT 'Khordha (Bhubaneswar)',
  rdc_zone TEXT NOT NULL DEFAULT 'Central RDC',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  workshop_focus TEXT NOT NULL DEFAULT 'opsc_oas_strategy',
  venue_name_address TEXT NOT NULL DEFAULT '',
  event_date_ist TEXT NOT NULL,
  timing_ist TEXT NOT NULL DEFAULT '10:30 AM – 02:30 PM IST',
  seat_capacity INTEGER NOT NULL DEFAULT 100,
  seats_registered INTEGER NOT NULL DEFAULT 0,
  entry_fee_paise INTEGER NOT NULL DEFAULT 0,
  coordinator_name TEXT NOT NULL DEFAULT '',
  meetup_status TEXT NOT NULL DEFAULT 'open_registration',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_mtp_zone_status
  ON evt_district_meetups(rdc_zone, meetup_status, event_date_ist);

CREATE TABLE IF NOT EXISTS evt_live_webinars (
  id TEXT PRIMARY KEY,
  webinar_code TEXT NOT NULL UNIQUE,
  session_track TEXT NOT NULL DEFAULT 'exam_strategy_ama',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  speaker_name_role TEXT NOT NULL DEFAULT '',
  language_medium TEXT NOT NULL DEFAULT 'bilingual_en_or',
  scheduled_start_ist TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  streaming_platform TEXT NOT NULL DEFAULT 'YouTube Live',
  public_join_url TEXT NOT NULL DEFAULT '',
  passcode_masked_hint TEXT NOT NULL DEFAULT '',
  rsvp_count INTEGER NOT NULL DEFAULT 0,
  recording_archive_url TEXT NOT NULL DEFAULT '',
  webinar_status TEXT NOT NULL DEFAULT 'upcoming_rsvp',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_web_track_status
  ON evt_live_webinars(session_track, webinar_status, scheduled_start_ist);

CREATE TABLE IF NOT EXISTS evt_calendar_ics_sync (
  id TEXT PRIMARY KEY,
  feed_slug TEXT NOT NULL UNIQUE,
  feed_title_en TEXT NOT NULL,
  feed_title_or TEXT NOT NULL DEFAULT '',
  source_scope TEXT NOT NULL DEFAULT 'all_events',
  timezone_id TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ics_cache_ttl_sec INTEGER NOT NULL DEFAULT 300,
  subscribers_sync_count INTEGER NOT NULL DEFAULT 0,
  last_dispatched_push_at_ist TEXT NOT NULL DEFAULT '',
  last_push_summary_en TEXT NOT NULL DEFAULT '',
  push_dispatch_count INTEGER NOT NULL DEFAULT 0,
  feed_status TEXT NOT NULL DEFAULT 'active_live',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evt_ics_slug_status
  ON evt_calendar_ics_sync(feed_slug, feed_status);
