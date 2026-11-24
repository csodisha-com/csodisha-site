// Events & Scheduling Batch 3 (v117): Modules 07-09
// 07 Offline Workshops & District Meetups
// 08 Live Webinars & Virtual Counseling Sessions
// 09 Calendar Sync, ICS Feeds & Push Notification Dispatcher
// All timestamps normalized to IST (Asia/Kolkata, +05:30). Zero raw PII or raw passcodes.
import { HttpError, json, readJson, validationError } from './http.js';
import { invalidateEdgePaths, EVENTS_PUBLIC_PATHS } from './edge-cache-invalidator.js';
import { audit } from './rbac.js';
import { likeEscape } from './validate.js';
import {
  EVT_REV_TABLES,
  normalizeIstDate,
  normalizeIstTimestamp,
  nowIstIso,
  sanitizeEvtText,
  snapshotEvtRevision
} from './events-scheduling-batch1.js';
import {
  ensureEventsSchedulingBatch2Schema,
  formatInrFromPaise,
  getFull6ModuleEventsOverview
} from './events-scheduling-batch2.js';

export const EVT_RDC_ZONES = ['Central RDC', 'Northern RDC', 'Southern RDC'];
export const EVT_WORKSHOP_FOCUSES = [
  'opsc_oas_strategy', 'ossc_osssc_orientation', 'ugc_net_research_clinic',
  'digital_literacy_bootcamp', 'career_counseling_camp'
];
export const EVT_MEETUP_STATUSES = ['open_registration', 'almost_full', 'housefull_closed', 'completed', 'archived'];

export const EVT_SESSION_TRACKS = [
  'exam_strategy_ama', 'sams_counselling_walkthrough', 'scheme_application_clinic',
  'topper_mock_review', 'bilingual_doubt_clearing'
];
export const EVT_LANGUAGE_MEDIUMS = ['bilingual_en_or', 'odia_primary', 'english_primary'];
export const EVT_STREAMING_PLATFORMS = ['YouTube Live', 'Google Meet', 'Zoom Webinar', 'CS Odisha Live Room'];
export const EVT_WEBINAR_STATUSES = ['upcoming_rsvp', 'live_now', 'recording_available', 'cancelled', 'archived'];

export const EVT_FEED_SCOPES = ['all_events', 'exam_deadlines', 'admit_cards_results', 'meetups_webinars'];
export const EVT_FEED_STATUSES = ['active_live', 'paused', 'archived'];

const _evt3Ready = new WeakSet();

EVT_REV_TABLES['07'] = {
  table: 'evt_district_meetups',
  cols: [
    'meetup_code', 'district_odisha', 'rdc_zone', 'title_en', 'title_or',
    'workshop_focus', 'venue_name_address', 'event_date_ist', 'timing_ist',
    'seat_capacity', 'seats_registered', 'entry_fee_paise', 'coordinator_name', 'meetup_status'
  ]
};
EVT_REV_TABLES['08'] = {
  table: 'evt_live_webinars',
  cols: [
    'webinar_code', 'session_track', 'title_en', 'title_or', 'speaker_name_role',
    'language_medium', 'scheduled_start_ist', 'duration_minutes', 'streaming_platform',
    'public_join_url', 'passcode_masked_hint', 'rsvp_count', 'recording_archive_url', 'webinar_status'
  ]
};
EVT_REV_TABLES['09'] = {
  table: 'evt_calendar_ics_sync',
  cols: [
    'feed_slug', 'feed_title_en', 'feed_title_or', 'source_scope', 'timezone_id',
    'ics_cache_ttl_sec', 'subscribers_sync_count', 'last_dispatched_push_at_ist',
    'last_push_summary_en', 'push_dispatch_count', 'feed_status'
  ]
};

function rid(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 10)}`;
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

function sanitizeOptionalUrl(raw) {
  const s = sanitizeEvtText(raw, 400);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return '';
}

export function maskPasscodeHint(raw) {
  const s = sanitizeEvtText(raw, 60);
  if (!s) return '';
  if (s.includes('••••')) return s;
  if (s.length <= 2) return '••••';
  const tail = s.slice(-2);
  const dashIdx = s.indexOf('-');
  if (dashIdx > 0 && dashIdx < s.length - 3) {
    return `${s.slice(0, dashIdx + 1)}••••${tail}`;
  }
  return `••••${tail}`;
}

function computeMeetupStatus(capacity, registered, currentStatus) {
  if (currentStatus === 'completed' || currentStatus === 'archived') return currentStatus;
  if (registered >= capacity) return 'housefull_closed';
  if (capacity > 0 && registered / capacity >= 0.85) return 'almost_full';
  return 'open_registration';
}

function enrichMeetupRow(row) {
  const cap = Math.max(1, Number(row.seat_capacity || 1));
  const reg = Math.max(0, Number(row.seats_registered || 0));
  return {
    ...row,
    occupancy_pct: Math.min(100, Math.round((reg / cap) * 100)),
    entry_fee_display_inr: formatInrFromPaise(row.entry_fee_paise || 0)
  };
}

/* ================= RFC 5545 ICS GENERATOR ================= */
export function escapeIcsText(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function foldIcsLine(line) {
  const str = String(line || '');
  if (str.length <= 75) return str;
  const parts = [];
  let i = 0;
  parts.push(str.slice(0, 75));
  i = 75;
  while (i < str.length) {
    parts.push(' ' + str.slice(i, i + 74));
    i += 74;
  }
  return parts.join('\r\n');
}

function formatIcsUtcStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatIcsDateOrIst(val, fallbackHour = '100000') {
  const s = String(val || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { prop: 'VALUE=DATE', value: s.replace(/-/g, '') };
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return { prop: 'TZID=Asia/Kolkata', value: `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] || '00'}` };
  }
  const norm = normalizeIstDate(s);
  if (norm) return { prop: 'TZID=Asia/Kolkata', value: `${norm.replace(/-/g, '')}T${fallbackHour}` };
  return { prop: 'TZID=Asia/Kolkata', value: `${nowIstIso().slice(0, 10).replace(/-/g, '')}T${fallbackHour}` };
}

export function generateIcsCalendar(feed, events, origin = 'https://csodisha.com') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Common Sense Odisha//Events & Scheduling Suite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(feed.feed_title_en || 'CS Odisha Events')}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  const stamp = formatIcsUtcStamp();
  for (const ev of events) {
    const dtStart = formatIcsDateOrIst(ev.start, '100000');
    const dtEnd = formatIcsDateOrIst(ev.end || ev.start, '120000');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(ev.uid)}@csodisha.com`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;${dtStart.prop}:${dtStart.value}`);
    lines.push(`DTEND;${dtEnd.prop}:${dtEnd.value}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    lines.push(`URL:${escapeIcsText(ev.url || `${origin}/events/`)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

async function collectIcsEventsForScope(db, scope, origin = 'https://csodisha.com') {
  const events = [];
  if (scope === 'all_events' || scope === 'exam_deadlines') {
    const [exRes, ddlRes] = await Promise.all([
      db.prepare(`SELECT id, event_code, commission_body, exam_name_en, advt_number, exam_date_start, exam_date_end, shift_timing_ist, official_notice_url FROM evt_exam_calendar WHERE schedule_status IN ('confirmed', 'tentative') ORDER BY exam_date_start ASC LIMIT 25`).all(),
      db.prepare(`SELECT id, deadline_code, commission_body, post_title_en, advt_number, registration_closes_ist, apply_portal_url FROM evt_deadline_countdowns WHERE status = 'active_live' ORDER BY registration_closes_ist ASC LIMIT 25`).all()
    ]);
    for (const r of (exRes.results || [])) {
      events.push({
        uid: `exam-${r.event_code}`,
        start: r.exam_date_start,
        end: r.exam_date_end || r.exam_date_start,
        summary: `[${r.commission_body}] ${r.exam_name_en}`,
        description: `${r.advt_number ? r.advt_number + ' | ' : ''}Shift: ${r.shift_timing_ist}`,
        location: 'Odisha Examination Centers (IST)',
        url: r.official_notice_url || `${origin}/jobs/`
      });
    }
    for (const r of (ddlRes.results || [])) {
      events.push({
        uid: `ddl-${r.deadline_code}`,
        start: r.registration_closes_ist,
        end: r.registration_closes_ist,
        summary: `[Deadline] ${r.commission_body}: ${r.post_title_en}`,
        description: `${r.advt_number || 'Recruitment Closing'} (IST)`,
        location: 'Online Portal (IST)',
        url: r.apply_portal_url || `${origin}/jobs/`
      });
    }
  }

  if (scope === 'all_events' || scope === 'admit_cards_results') {
    const [admitRes, resRes] = await Promise.all([
      db.prepare(`SELECT release_code, commission_body, exam_name_en, exam_date_ist, download_portal_url FROM evt_admit_card_releases WHERE release_status IN ('live_download', 'scheduled_soon') ORDER BY exam_date_ist ASC LIMIT 15`).all(),
      db.prepare(`SELECT roster_code, commission_body, exam_name_en, dv_start_date_ist, dv_venue_odisha, result_pdf_url FROM evt_results_dv_rosters WHERE status IN ('published_live', 'dv_ongoing') AND dv_start_date_ist != '' ORDER BY dv_start_date_ist ASC LIMIT 15`).all()
    ]);
    for (const r of (admitRes.results || [])) {
      events.push({
        uid: `admit-${r.release_code}`,
        start: r.exam_date_ist,
        end: r.exam_date_ist,
        summary: `[Admit Card] ${r.commission_body}: ${r.exam_name_en}`,
        description: 'Hall Ticket / Exam Date Alert (IST)',
        location: 'Odisha',
        url: r.download_portal_url || `${origin}/jobs/`
      });
    }
    for (const r of (resRes.results || [])) {
      events.push({
        uid: `dv-${r.roster_code}`,
        start: r.dv_start_date_ist,
        end: r.dv_start_date_ist,
        summary: `[DV Roster] ${r.commission_body}: ${r.exam_name_en}`,
        description: 'Document Verification Roster (IST)',
        location: r.dv_venue_odisha || 'Odisha',
        url: r.result_pdf_url || `${origin}/jobs/`
      });
    }
  }

  if (scope === 'all_events' || scope === 'meetups_webinars') {
    const [mtpRes, webRes] = await Promise.all([
      db.prepare(`SELECT meetup_code, district_odisha, title_en, venue_name_address, event_date_ist, timing_ist FROM evt_district_meetups WHERE meetup_status IN ('open_registration', 'almost_full') ORDER BY event_date_ist ASC LIMIT 15`).all(),
      db.prepare(`SELECT webinar_code, title_en, speaker_name_role, scheduled_start_ist, streaming_platform, public_join_url FROM evt_live_webinars WHERE webinar_status IN ('upcoming_rsvp', 'live_now') ORDER BY scheduled_start_ist ASC LIMIT 15`).all()
    ]);
    for (const r of (mtpRes.results || [])) {
      events.push({
        uid: `mtp-${r.meetup_code}`,
        start: r.event_date_ist,
        end: r.event_date_ist,
        summary: `[Workshop · ${r.district_odisha}] ${r.title_en}`,
        description: `Timing: ${r.timing_ist}`,
        location: r.venue_name_address || r.district_odisha,
        url: `${origin}/community/`
      });
    }
    for (const r of (webRes.results || [])) {
      events.push({
        uid: `web-${r.webinar_code}`,
        start: r.scheduled_start_ist,
        end: r.scheduled_start_ist,
        summary: `[Webinar] ${r.title_en}`,
        description: `Speaker: ${r.speaker_name_role} | Platform: ${r.streaming_platform}`,
        location: r.streaming_platform,
        url: r.public_join_url || `${origin}/community/`
      });
    }
  }

  return events;
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureEventsSchedulingBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEventsSchedulingBatch2Schema(db);
  if (_evt3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS evt_district_meetups (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_mtp_zone_status ON evt_district_meetups(rdc_zone, meetup_status, event_date_ist)`,

    `CREATE TABLE IF NOT EXISTS evt_live_webinars (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_web_track_status ON evt_live_webinars(session_track, webinar_status, scheduled_start_ist)`,

    `CREATE TABLE IF NOT EXISTS evt_calendar_ics_sync (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_ics_slug_status ON evt_calendar_ics_sync(feed_slug, feed_status)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  // Clean-slate v233: starter meetups/webinars seeding disabled; authored strictly in Admin Studio (/admin/).
  _evt3Ready.add(db);
}

async function seedEventsSchedulingBatch3(db) {
  const mtpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_district_meetups`).first();
  if (Number(mtpCnt?.n || 0) === 0) {
    const meetups = [
      [
        'evt-mtp-001', 'MTP-2026-0001', 'Khordha (Bhubaneswar)', 'Central RDC',
        'OPSC OAS Prelims & CSAT Strategy Seminar — Bhubaneswar',
        'OPSC OAS ପ୍ରାରମ୍ଭିକ ଏବଂ CSAT ରଣନୀତି ସେମିନାର — ଭୁବନେଶ୍ୱର',
        'opsc_oas_strategy', 'State Convention Hall, Unit-IV, Bhubaneswar',
        '2026-11-29', '10:30 AM – 02:30 PM IST', 200, 148, 0,
        'Subrat Mohanty (Central Coordinator)', 'open_registration'
      ],
      [
        'evt-mtp-002', 'MTP-2026-0002', 'Balasore', 'Central RDC',
        'OSSC CGL & OSSSC RI/ARI Orientation Workshop — Balasore',
        'OSSC CGL ଏବଂ OSSSC RI/ARI ଓରିଏଣ୍ଟେସନ୍ କର୍ମଶାଳା — ବାଲେଶ୍ୱର',
        'ossc_osssc_orientation', 'Fakir Mohan Auditorium, Balasore',
        '2026-12-06', '10:00 AM – 01:30 PM IST', 120, 106, 0,
        'Priyadarshini Jena', 'almost_full'
      ],
      [
        'evt-mtp-003', 'MTP-2026-0003', 'Sambalpur', 'Northern RDC',
        'Western Odisha Career Counseling & UGC NET Clinic — Sambalpur',
        'ପଶ୍ଚିମ ଓଡ଼ିଶା କ୍ୟାରିଅର୍ କାଉନସେଲିଂ ଏବଂ UGC NET କ୍ଲିନିକ୍ — ସମ୍ବଲପୁର',
        'career_counseling_camp', 'Gangadhar Meher Seminar Complex, Sambalpur',
        '2026-12-12', '11:00 AM – 03:00 PM IST', 150, 74, 0,
        'Biswajit Panda', 'open_registration'
      ]
    ];
    for (const r of meetups) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_district_meetups
         (id, meetup_code, district_odisha, rdc_zone, title_en, title_or, workshop_focus, venue_name_address, event_date_ist, timing_ist, seat_capacity, seats_registered, entry_fee_paise, coordinator_name, meetup_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const webCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_live_webinars`).first();
  if (Number(webCnt?.n || 0) === 0) {
    const webinars = [
      [
        'evt-web-001', 'WEB-2026-0001', 'exam_strategy_ama',
        'OPSC OAS 2026 Last-30-Days Revision & Current Affairs AMA',
        'OPSC OAS ୨୦୨୬ ଶେଷ ୩୦ ଦିନର ରିଭିଜନ୍ ଏବଂ କରେଣ୍ଟ ଆଫେୟାର୍ସ AMA',
        'Dr. Ananya Das (OAS Mentor)', 'bilingual_en_or',
        '2026-11-21T19:00:00+05:30', 90, 'YouTube Live',
        'https://csodisha.com/live/oas-ama', 'CSO-••••89', 642, '', 'upcoming_rsvp'
      ],
      [
        'evt-web-002', 'WEB-2026-0002', 'sams_counselling_walkthrough',
        'SAMS Odisha +3 & CPET Spot Admission Walkthrough',
        'SAMS ଓଡ଼ିଶା +୩ ଏବଂ CPET ସ୍ପଟ୍ ଆଡମିଶନ୍ ମାର୍ଗଦର୍ଶିକା',
        'Rakesh Kumar Sahoo (Admissions Desk)', 'odia_primary',
        '2026-11-23T18:30:00+05:30', 60, 'CS Odisha Live Room',
        'https://csodisha.com/live/sams-cpet', 'SAM-••••42', 415, '', 'upcoming_rsvp'
      ],
      [
        'evt-web-003', 'WEB-2026-0003', 'bilingual_doubt_clearing',
        'OSSC CGL Quantitative Aptitude & DI Mock Review',
        'OSSC CGL ଗଣିତ ଏବଂ DI ମକ୍ ଟେଷ୍ଟ ସମୀକ୍ଷା',
        'Prof. Debasis Tripathy', 'bilingual_en_or',
        '2026-11-10T19:00:00+05:30', 75, 'Zoom Webinar',
        'https://csodisha.com/live/cgl-di', 'CGL-••••17', 520,
        'https://csodisha.com/study-library/', 'recording_available'
      ]
    ];
    for (const r of webinars) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_live_webinars
         (id, webinar_code, session_track, title_en, title_or, speaker_name_role, language_medium, scheduled_start_ist, duration_minutes, streaming_platform, public_join_url, passcode_masked_hint, rsvp_count, recording_archive_url, webinar_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const icsCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_calendar_ics_sync`).first();
  if (Number(icsCnt?.n || 0) === 0) {
    const feeds = [
      [
        'evt-ics-001', 'odisha-all-exams',
        'CS Odisha Master Calendar (All Exams, Deadlines & Workshops)',
        'CS ଓଡ଼ିଶା ମାଷ୍ଟର କ୍ୟାଲେଣ୍ଡର (ସମସ୍ତ ପରୀକ୍ଷା ଏବଂ କର୍ମଶାଳା)',
        'all_events', 'Asia/Kolkata', 300, 1840,
        '2026-11-17T10:00:00+05:30', 'OPSC OAS Prelims & OSSC CGL City Intimation synced to subscribers.', 14, 'active_live'
      ],
      [
        'evt-ics-002', 'opsc-ossc-osssc-deadlines',
        'OPSC, OSSC & OSSSC Exam Dates & Application Deadlines',
        'OPSC, OSSC ଏବଂ OSSSC ପରୀକ୍ଷା ତାରିଖ ଏବଂ ଶେଷ ତାରିଖ',
        'exam_deadlines', 'Asia/Kolkata', 300, 1290,
        '2026-11-16T18:00:00+05:30', 'OAS 24h closing countdown alert pushed.', 9, 'active_live'
      ],
      [
        'evt-ics-003', 'admit-cards-results',
        'Admit Card Releases & DV Roster Calendar',
        'ଆଡମିଟ୍ କାର୍ଡ ଏବଂ DV ରୋଷ୍ଟର କ୍ୟାଲେଣ୍ଡର',
        'admit_cards_results', 'Asia/Kolkata', 300, 910,
        '2026-11-15T19:30:00+05:30', 'OPSC ASO Final Merit List & OSSC DV Roster updated.', 6, 'active_live'
      ],
      [
        'evt-ics-004', 'workshops-webinars',
        'Odisha District Workshops & Live Webinars Feed',
        'ଓଡ଼ିଶା ଜିଲ୍ଲା କର୍ମଶାଳା ଏବଂ ଲାଇଭ୍ ୱେବିନାର ଫିଡ୍',
        'meetups_webinars', 'Asia/Kolkata', 300, 620,
        '2026-11-14T16:00:00+05:30', 'Bhubaneswar & Sambalpur December workshops published.', 4, 'active_live'
      ]
    ];
    for (const r of feeds) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_calendar_ics_sync
         (id, feed_slug, feed_title_en, feed_title_or, source_scope, timezone_id, ics_cache_ttl_sec, subscribers_sync_count, last_dispatched_push_at_ist, last_push_summary_en, push_dispatch_count, feed_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }
}

/* ================= UNIFIED 9-MODULE OVERVIEW (01-09 ALL ACTIVE) ================= */
export async function getFull9ModuleEventsOverview(env) {
  await ensureEventsSchedulingBatch3Schema(env.DB);
  const [base6, mtpRows, webRows, icsRows] = await Promise.all([
    getFull6ModuleEventsOverview(env),
    env.DB.prepare(`SELECT meetup_status FROM evt_district_meetups WHERE meetup_status != 'archived'`).all(),
    env.DB.prepare(`SELECT webinar_status FROM evt_live_webinars WHERE webinar_status != 'archived'`).all(),
    env.DB.prepare(`SELECT feed_status, push_dispatch_count FROM evt_calendar_ics_sync WHERE feed_status != 'archived'`).all()
  ]);

  const meetups = mtpRows.results || [];
  const webinars = webRows.results || [];
  const feeds = icsRows.results || [];

  const open_district_workshops = meetups.filter(r => r.meetup_status === 'open_registration' || r.meetup_status === 'almost_full').length;
  const upcoming_live_webinars = webinars.filter(r => r.webinar_status === 'upcoming_rsvp' || r.webinar_status === 'live_now').length;
  const active_ics_feeds = feeds.filter(r => r.feed_status === 'active_live').length;
  const total_push_dispatches = feeds.reduce((acc, r) => acc + Number(r.push_dispatch_count || 0), 0);

  const modules = {
    ...base6.modules,
    '07': { code: '07', id: 'module-es-007', title: 'Offline Workshops & District Meetups', status: 'active', count: meetups.length },
    '08': { code: '08', id: 'module-es-008', title: 'Live Webinars & Virtual Counseling Sessions', status: 'active', count: webinars.length },
    '09': { code: '09', id: 'module-es-009', title: 'Calendar Sync, ICS Feeds & Push Notification Dispatcher', status: 'active', count: feeds.length }
  };

  const suite_09 = {
    total_modules: 9,
    active_modules: 9,
    timezone: 'Asia/Kolkata',
    confirmed_exam_dates: base6.confirmed_exam_dates,
    active_admission_milestones: base6.active_admission_milestones,
    open_application_countdowns: base6.open_application_countdowns,
    live_admit_card_portals: base6.live_admit_card_portals,
    open_answer_key_challenges: base6.open_answer_key_challenges,
    published_results_dv_rosters: base6.published_results_dv_rosters,
    open_district_workshops,
    upcoming_live_webinars,
    active_ics_feeds,
    total_push_dispatches
  };

  return {
    ...base6,
    open_district_workshops,
    upcoming_live_webinars,
    active_ics_feeds,
    total_push_dispatches,
    suite_09,
    modules
  };
}

/* ================= MODULE 07: OFFLINE WORKSHOPS & DISTRICT MEETUPS ================= */
async function handleMeetups(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const zoneFilter = sanitizeEvtText(url.searchParams.get('rdc_zone') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('meetup_status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (zoneFilter) { where.push(`rdc_zone = ?`); args.push(zoneFilter); }
    if (statusFilter) { where.push(`meetup_status = ?`); args.push(statusFilter); }
    else { where.push(`meetup_status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR district_odisha LIKE ? ESCAPE '\\' OR venue_name_address LIKE ? ESCAPE '\\' OR meetup_code LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like, like);
    }
    const sql = `SELECT * FROM evt_district_meetups ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY event_date_ist ASC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    return json({ items: (results || []).map(enrichMeetupRow), timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const meetup_code = sanitizeEvtText(b.meetup_code || `MTP-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const district_odisha = sanitizeEvtText(b.district_odisha || 'Khordha (Bhubaneswar)', 80);
    const rdc_zone = pick(b.rdc_zone, EVT_RDC_ZONES, 'rdc_zone', errors, 'Central RDC');
    const title_en = sanitizeEvtText(b.title_en, 240);
    const title_or = sanitizeEvtText(b.title_or, 240);
    const workshop_focus = pick(b.workshop_focus, EVT_WORKSHOP_FOCUSES, 'workshop_focus', errors, 'opsc_oas_strategy');
    const venue_name_address = sanitizeEvtText(b.venue_name_address, 240);
    const event_date_ist = normalizeIstDate(b.event_date_ist);
    const timing_ist = sanitizeEvtText(b.timing_ist || '10:30 AM – 02:30 PM IST', 100);
    const seat_capacity = Math.max(1, Math.min(10000, parseInt(b.seat_capacity ?? 100, 10) || 100));
    const seats_registered = Math.max(0, Math.min(seat_capacity, parseInt(b.seats_registered ?? 0, 10) || 0));
    const entry_fee_paise = Math.max(0, Math.min(1000000, parseInt(b.entry_fee_paise ?? 0, 10) || 0));
    const coordinator_name = sanitizeEvtText(b.coordinator_name, 120);
    const reqStatus = pick(b.meetup_status, EVT_MEETUP_STATUSES, 'meetup_status', errors, 'open_registration');
    const meetup_status = computeMeetupStatus(seat_capacity, seats_registered, reqStatus);

    if (!title_en) errors.title_en = 'title_en is required';
    if (!event_date_ist) errors.event_date_ist = 'event_date_ist must be a valid YYYY-MM-DD date';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-mtp');
    await db.prepare(
      `INSERT INTO evt_district_meetups
       (id, meetup_code, district_odisha, rdc_zone, title_en, title_or, workshop_focus, venue_name_address, event_date_ist, timing_ist, seat_capacity, seats_registered, entry_fee_paise, coordinator_name, meetup_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      newId, meetup_code, district_odisha, rdc_zone, title_en, title_or, workshop_focus,
      venue_name_address, event_date_ist, timing_ist, seat_capacity, seats_registered,
      entry_fee_paise, coordinator_name, meetup_status
    ).run();

    await snapshotEvtRevision(db, '07', newId, actor, 'create');
    await audit(env, request, actor, 'events.meetups.create', 'evt_district_meetups', newId, { meetup_code, district_odisha });
    const row = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(newId).first();
    return json({ item: enrichMeetupRow(row) }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'District meetup not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const district_odisha = sanitizeEvtText(b.district_odisha ?? existing.district_odisha, 80);
    const rdc_zone = pick(b.rdc_zone ?? existing.rdc_zone, EVT_RDC_ZONES, 'rdc_zone', errors, existing.rdc_zone);
    const title_en = sanitizeEvtText(b.title_en ?? existing.title_en, 240);
    const title_or = sanitizeEvtText(b.title_or ?? existing.title_or, 240);
    const workshop_focus = pick(b.workshop_focus ?? existing.workshop_focus, EVT_WORKSHOP_FOCUSES, 'workshop_focus', errors, existing.workshop_focus);
    const venue_name_address = sanitizeEvtText(b.venue_name_address ?? existing.venue_name_address, 240);
    const event_date_ist = normalizeIstDate(b.event_date_ist ?? existing.event_date_ist);
    const timing_ist = sanitizeEvtText(b.timing_ist ?? existing.timing_ist, 100);
    const seat_capacity = b.seat_capacity !== undefined ? Math.max(1, Math.min(10000, parseInt(b.seat_capacity, 10) || 1)) : existing.seat_capacity;
    const seats_registered = b.seats_registered !== undefined ? Math.max(0, Math.min(seat_capacity, parseInt(b.seats_registered, 10) || 0)) : Math.min(seat_capacity, existing.seats_registered);
    const entry_fee_paise = b.entry_fee_paise !== undefined ? Math.max(0, Math.min(1000000, parseInt(b.entry_fee_paise, 10) || 0)) : existing.entry_fee_paise;
    const coordinator_name = sanitizeEvtText(b.coordinator_name ?? existing.coordinator_name, 120);
    const reqStatus = pick(b.meetup_status ?? existing.meetup_status, EVT_MEETUP_STATUSES, 'meetup_status', errors, existing.meetup_status);
    const meetup_status = computeMeetupStatus(seat_capacity, seats_registered, reqStatus);

    if (!title_en) errors.title_en = 'title_en is required';
    if (!event_date_ist) errors.event_date_ist = 'event_date_ist must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_district_meetups
       SET district_odisha=?, rdc_zone=?, title_en=?, title_or=?, workshop_focus=?, venue_name_address=?, event_date_ist=?, timing_ist=?, seat_capacity=?, seats_registered=?, entry_fee_paise=?, coordinator_name=?, meetup_status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(
      district_odisha, rdc_zone, title_en, title_or, workshop_focus, venue_name_address,
      event_date_ist, timing_ist, seat_capacity, seats_registered, entry_fee_paise,
      coordinator_name, meetup_status, id
    ).run();

    await snapshotEvtRevision(db, '07', id, actor, 'update');
    await audit(env, request, actor, 'events.meetups.update', 'evt_district_meetups', id, { meetup_status });
    const row = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    return json({ item: enrichMeetupRow(row) });
  }

  if (method === 'PATCH' && id && sub === 'increment-rsvp') {
    const existing = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'District meetup not found');
    const b = await readJson(request, 8000).catch(() => ({}));
    const delta = Math.max(1, Math.min(50, parseInt(b.delta ?? 1, 10) || 1));
    const cap = Number(existing.seat_capacity || 0);
    const reg = Number(existing.seats_registered || 0);
    if (reg + delta > cap) {
      throw new HttpError(409, 'SEAT_CAPACITY_REACHED', `Seat capacity ceiling (${cap}) reached`);
    }
    const nextReg = reg + delta;
    const nextStatus = computeMeetupStatus(cap, nextReg, existing.meetup_status);
    await db.prepare(
      `UPDATE evt_district_meetups SET seats_registered=?, meetup_status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(nextReg, nextStatus, id).run();
    await snapshotEvtRevision(db, '07', id, actor, `rsvp:+${delta}`);
    await audit(env, request, actor, 'events.meetups.increment_rsvp', 'evt_district_meetups', id, { seats_registered: nextReg });
    const row = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    return json({ item: enrichMeetupRow(row) });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'District meetup not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const meetup_status = pick(b.meetup_status || b.status, EVT_MEETUP_STATUSES, 'meetup_status', errors, null);
    if (!meetup_status) errors.meetup_status = 'meetup_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_district_meetups SET meetup_status=?, updated_at=datetime('now') WHERE id=?`).bind(meetup_status, id).run();
    await snapshotEvtRevision(db, '07', id, actor, `status:${meetup_status}`);
    await audit(env, request, actor, 'events.meetups.status', 'evt_district_meetups', id, { meetup_status });
    const row = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    return json({ item: enrichMeetupRow(row) });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_district_meetups WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'District meetup not found');
    await db.prepare(`UPDATE evt_district_meetups SET meetup_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '07', id, actor, 'archive');
    await audit(env, request, actor, 'events.meetups.archive', 'evt_district_meetups', id, {});
    return json({ ok: true, id, meetup_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown meetups route');
}

/* ================= MODULE 08: LIVE WEBINARS & VIRTUAL COUNSELING ================= */
async function handleWebinars(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const trackFilter = sanitizeEvtText(url.searchParams.get('session_track') || '', 60);
    const statusFilter = sanitizeEvtText(url.searchParams.get('webinar_status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (trackFilter) { where.push(`session_track = ?`); args.push(trackFilter); }
    if (statusFilter) { where.push(`webinar_status = ?`); args.push(statusFilter); }
    else { where.push(`webinar_status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR speaker_name_role LIKE ? ESCAPE '\\' OR webinar_code LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const sql = `SELECT * FROM evt_live_webinars ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY scheduled_start_ist DESC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    return json({ items: results || [], timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const webinar_code = sanitizeEvtText(b.webinar_code || `WEB-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const session_track = pick(b.session_track, EVT_SESSION_TRACKS, 'session_track', errors, 'exam_strategy_ama');
    const title_en = sanitizeEvtText(b.title_en, 240);
    const title_or = sanitizeEvtText(b.title_or, 240);
    const speaker_name_role = sanitizeEvtText(b.speaker_name_role, 160);
    const language_medium = pick(b.language_medium, EVT_LANGUAGE_MEDIUMS, 'language_medium', errors, 'bilingual_en_or');
    const scheduled_start_ist = normalizeIstTimestamp(b.scheduled_start_ist, '19:00:00');
    const duration_minutes = Math.max(15, Math.min(480, parseInt(b.duration_minutes ?? 60, 10) || 60));
    const streaming_platform = pick(b.streaming_platform, EVT_STREAMING_PLATFORMS, 'streaming_platform', errors, 'YouTube Live');
    const public_join_url = sanitizeOptionalUrl(b.public_join_url);
    const passcode_masked_hint = maskPasscodeHint(b.passcode_masked_hint);
    const rsvp_count = Math.max(0, Math.min(500000, parseInt(b.rsvp_count ?? 0, 10) || 0));
    const recording_archive_url = sanitizeOptionalUrl(b.recording_archive_url);
    const webinar_status = pick(b.webinar_status, EVT_WEBINAR_STATUSES, 'webinar_status', errors, 'upcoming_rsvp');

    if (!title_en) errors.title_en = 'title_en is required';
    if (!scheduled_start_ist) errors.scheduled_start_ist = 'scheduled_start_ist must be a valid IST timestamp';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-web');
    await db.prepare(
      `INSERT INTO evt_live_webinars
       (id, webinar_code, session_track, title_en, title_or, speaker_name_role, language_medium, scheduled_start_ist, duration_minutes, streaming_platform, public_join_url, passcode_masked_hint, rsvp_count, recording_archive_url, webinar_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      newId, webinar_code, session_track, title_en, title_or, speaker_name_role,
      language_medium, scheduled_start_ist, duration_minutes, streaming_platform,
      public_join_url, passcode_masked_hint, rsvp_count, recording_archive_url, webinar_status
    ).run();

    await snapshotEvtRevision(db, '08', newId, actor, 'create');
    await audit(env, request, actor, 'events.webinars.create', 'evt_live_webinars', newId, { webinar_code, session_track });
    const item = await db.prepare(`SELECT * FROM evt_live_webinars WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_live_webinars WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webinar not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const session_track = pick(b.session_track ?? existing.session_track, EVT_SESSION_TRACKS, 'session_track', errors, existing.session_track);
    const title_en = sanitizeEvtText(b.title_en ?? existing.title_en, 240);
    const title_or = sanitizeEvtText(b.title_or ?? existing.title_or, 240);
    const speaker_name_role = sanitizeEvtText(b.speaker_name_role ?? existing.speaker_name_role, 160);
    const language_medium = pick(b.language_medium ?? existing.language_medium, EVT_LANGUAGE_MEDIUMS, 'language_medium', errors, existing.language_medium);
    const scheduled_start_ist = normalizeIstTimestamp(b.scheduled_start_ist ?? existing.scheduled_start_ist, '19:00:00');
    const duration_minutes = b.duration_minutes !== undefined ? Math.max(15, Math.min(480, parseInt(b.duration_minutes, 10) || 60)) : existing.duration_minutes;
    const streaming_platform = pick(b.streaming_platform ?? existing.streaming_platform, EVT_STREAMING_PLATFORMS, 'streaming_platform', errors, existing.streaming_platform);
    const public_join_url = b.public_join_url !== undefined ? sanitizeOptionalUrl(b.public_join_url) : existing.public_join_url;
    const passcode_masked_hint = b.passcode_masked_hint !== undefined ? maskPasscodeHint(b.passcode_masked_hint) : existing.passcode_masked_hint;
    const rsvp_count = b.rsvp_count !== undefined ? Math.max(0, Math.min(500000, parseInt(b.rsvp_count, 10) || 0)) : existing.rsvp_count;
    const recording_archive_url = b.recording_archive_url !== undefined ? sanitizeOptionalUrl(b.recording_archive_url) : existing.recording_archive_url;
    const webinar_status = pick(b.webinar_status ?? existing.webinar_status, EVT_WEBINAR_STATUSES, 'webinar_status', errors, existing.webinar_status);

    if (!title_en) errors.title_en = 'title_en is required';
    if (!scheduled_start_ist) errors.scheduled_start_ist = 'scheduled_start_ist must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_live_webinars
       SET session_track=?, title_en=?, title_or=?, speaker_name_role=?, language_medium=?, scheduled_start_ist=?, duration_minutes=?, streaming_platform=?, public_join_url=?, passcode_masked_hint=?, rsvp_count=?, recording_archive_url=?, webinar_status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(
      session_track, title_en, title_or, speaker_name_role, language_medium,
      scheduled_start_ist, duration_minutes, streaming_platform, public_join_url,
      passcode_masked_hint, rsvp_count, recording_archive_url, webinar_status, id
    ).run();

    await snapshotEvtRevision(db, '08', id, actor, 'update');
    await audit(env, request, actor, 'events.webinars.update', 'evt_live_webinars', id, { webinar_status });
    const item = await db.prepare(`SELECT * FROM evt_live_webinars WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_live_webinars WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webinar not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const webinar_status = pick(b.webinar_status || b.status, EVT_WEBINAR_STATUSES, 'webinar_status', errors, null);
    if (!webinar_status) errors.webinar_status = 'webinar_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_live_webinars SET webinar_status=?, updated_at=datetime('now') WHERE id=?`).bind(webinar_status, id).run();
    await snapshotEvtRevision(db, '08', id, actor, `status:${webinar_status}`);
    await audit(env, request, actor, 'events.webinars.status', 'evt_live_webinars', id, { webinar_status });
    const item = await db.prepare(`SELECT * FROM evt_live_webinars WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_live_webinars WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webinar not found');
    await db.prepare(`UPDATE evt_live_webinars SET webinar_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '08', id, actor, 'archive');
    await audit(env, request, actor, 'events.webinars.archive', 'evt_live_webinars', id, {});
    return json({ ok: true, id, webinar_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown webinars route');
}

/* ================= MODULE 09: CALENDAR SYNC, ICS FEEDS & PUSH DISPATCHER ================= */
async function handleCalendarSync(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const { results } = await db.prepare(
      `SELECT * FROM evt_calendar_ics_sync WHERE feed_status != 'archived' ORDER BY subscribers_sync_count DESC, feed_slug ASC`
    ).all();
    const previewSlug = sanitizeEvtText(url.searchParams.get('preview_slug') || '', 80);
    let ics_preview = '';
    if (previewSlug) {
      const feed = (results || []).find(f => f.feed_slug === previewSlug);
      if (feed) {
        const evs = await collectIcsEventsForScope(db, feed.source_scope, url.origin);
        ics_preview = generateIcsCalendar(feed, evs, url.origin);
      }
    }
    return json({ items: results || [], ics_preview, timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 32000);
    const errors = {};
    const feed_slug = sanitizeEvtText(b.feed_slug, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    const feed_title_en = sanitizeEvtText(b.feed_title_en, 200);
    const feed_title_or = sanitizeEvtText(b.feed_title_or, 200);
    const source_scope = pick(b.source_scope, EVT_FEED_SCOPES, 'source_scope', errors, 'all_events');
    const ics_cache_ttl_sec = Math.max(60, Math.min(86400, parseInt(b.ics_cache_ttl_sec ?? 300, 10) || 300));
    const feed_status = pick(b.feed_status, EVT_FEED_STATUSES, 'feed_status', errors, 'active_live');

    if (!feed_slug) errors.feed_slug = 'feed_slug is required';
    if (!feed_title_en) errors.feed_title_en = 'feed_title_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-ics');
    await db.prepare(
      `INSERT INTO evt_calendar_ics_sync
       (id, feed_slug, feed_title_en, feed_title_or, source_scope, timezone_id, ics_cache_ttl_sec, subscribers_sync_count, push_dispatch_count, feed_status, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Asia/Kolkata', ?, 0, 0, ?, datetime('now'))`
    ).bind(newId, feed_slug, feed_title_en, feed_title_or, source_scope, ics_cache_ttl_sec, feed_status).run();

    await snapshotEvtRevision(db, '09', newId, actor, 'create');
    await audit(env, request, actor, 'events.calendar_sync.create', 'evt_calendar_ics_sync', newId, { feed_slug, source_scope });
    const item = await db.prepare(`SELECT * FROM evt_calendar_ics_sync WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_calendar_ics_sync WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'ICS feed not found');
    const b = await readJson(request, 32000);
    const errors = {};
    const feed_title_en = sanitizeEvtText(b.feed_title_en ?? existing.feed_title_en, 200);
    const feed_title_or = sanitizeEvtText(b.feed_title_or ?? existing.feed_title_or, 200);
    const source_scope = pick(b.source_scope ?? existing.source_scope, EVT_FEED_SCOPES, 'source_scope', errors, existing.source_scope);
    const ics_cache_ttl_sec = b.ics_cache_ttl_sec !== undefined ? Math.max(60, Math.min(86400, parseInt(b.ics_cache_ttl_sec, 10) || 300)) : existing.ics_cache_ttl_sec;
    const feed_status = pick(b.feed_status ?? existing.feed_status, EVT_FEED_STATUSES, 'feed_status', errors, existing.feed_status);

    if (!feed_title_en) errors.feed_title_en = 'feed_title_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_calendar_ics_sync
       SET feed_title_en=?, feed_title_or=?, source_scope=?, ics_cache_ttl_sec=?, feed_status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(feed_title_en, feed_title_or, source_scope, ics_cache_ttl_sec, feed_status, id).run();

    await snapshotEvtRevision(db, '09', id, actor, 'update');
    await audit(env, request, actor, 'events.calendar_sync.update', 'evt_calendar_ics_sync', id, { feed_status });
    const item = await db.prepare(`SELECT * FROM evt_calendar_ics_sync WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'POST' && id && sub === 'dispatch-push') {
    const existing = await db.prepare(`SELECT * FROM evt_calendar_ics_sync WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'ICS feed not found');
    const b = await readJson(request, 16000).catch(() => ({}));
    const summary = sanitizeEvtText(
      b.summary_en || `Cookieless milestone push dispatched for ${existing.feed_title_en}`,
      240
    );
    const dispatchedAt = nowIstIso();
    const nextCount = Number(existing.push_dispatch_count || 0) + 1;

    await db.prepare(
      `UPDATE evt_calendar_ics_sync
       SET last_dispatched_push_at_ist=?, last_push_summary_en=?, push_dispatch_count=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(dispatchedAt, summary, nextCount, id).run();

    await snapshotEvtRevision(db, '09', id, actor, `push:#${nextCount}`);
    await audit(env, request, actor, 'events.calendar_sync.dispatch_push', 'evt_calendar_ics_sync', id, {
      feed_slug: existing.feed_slug,
      push_dispatch_count: nextCount,
      cookieless: true
    });
    const item = await db.prepare(`SELECT * FROM evt_calendar_ics_sync WHERE id = ?`).bind(id).first();
    return json({ ok: true, item, dispatched_at_ist: dispatchedAt });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_calendar_ics_sync WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'ICS feed not found');
    await db.prepare(`UPDATE evt_calendar_ics_sync SET feed_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '09', id, actor, 'archive');
    await audit(env, request, actor, 'events.calendar_sync.archive', 'evt_calendar_ics_sync', id, {});
    return json({ ok: true, id, feed_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown calendar-sync route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleEventsSchedulingBatch3Admin(request, env, actor, id, sub, extra) {
  await ensureEventsSchedulingBatch3Schema(env.DB);
  let res = null;
  if (id === 'meetups') res = await handleMeetups(request, env, actor, sub, extra);
  else if (id === 'webinars') res = await handleWebinars(request, env, actor, sub, extra);
  else if (id === 'calendar-sync') res = await handleCalendarSync(request, env, actor, sub, extra);
  else throw new HttpError(404, 'NOT_FOUND', 'Unknown events batch 3 admin route');
  if (request.method !== 'GET' && request.method !== 'HEAD' && res && res.status >= 200 && res.status < 300) {
    await invalidateEdgePaths(request, EVENTS_PUBLIC_PATHS);
  }
  return res;
}

/* ================= PUBLIC EDGE-CACHED RFC 5545 .ICS CALENDAR API ================= */
export async function handlePublicEventsIcsFeedApi(request, env, rawSlug) {
  await ensureEventsSchedulingBatch3Schema(env.DB);
  const slug = sanitizeEvtText(String(rawSlug || '').replace(/\.ics$/i, ''), 80);
  if (!slug) throw new HttpError(404, 'NOT_FOUND', 'Calendar feed slug required');

  const feed = await env.DB.prepare(
    `SELECT * FROM evt_calendar_ics_sync WHERE feed_slug = ? AND feed_status = 'active_live'`
  ).bind(slug).first();
  if (!feed) throw new HttpError(404, 'NOT_FOUND', 'Active calendar feed not found');

  const url = new URL(request.url);
  const events = await collectIcsEventsForScope(env.DB, feed.source_scope, url.origin);
  const icsBody = generateIcsCalendar(feed, events, url.origin);
  const ttl = Math.max(60, Number(feed.ics_cache_ttl_sec || 300));

  return new Response(icsBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${feed.feed_slug}.ics"`,
      'Cache-Control': `public, max-age=120, s-maxage=${ttl}`,
      'X-CSO-Timezone': 'Asia/Kolkata'
    }
  });
}
