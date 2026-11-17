import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleEventsSchedulingBatch1Admin as H1 } from '../functions/_lib/events-scheduling-batch1.js';
import {
  ensureEventsSchedulingBatch3Schema,
  getFull9ModuleEventsOverview,
  handleEventsSchedulingBatch3Admin as H3,
  handlePublicEventsIcsFeedApi,
  maskPasscodeHint
} from '../functions/_lib/events-scheduling-batch3.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  return {
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/events';
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/meetups`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/webinars`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/calendar-sync`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Passcode masking unit test
assert.equal(maskPasscodeHint('SECRET-998877'), 'SECRET-••••77');
assert.equal(maskPasscodeHint('CSO-••••89'), 'CSO-••••89');

// 3. Idempotent schema, starter seeds & Full 9-Module Suite Overview
await ensureEventsSchedulingBatch3Schema(env.DB);
await ensureEventsSchedulingBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('evt_district_meetups'), 3);
assert.equal(await cnt('evt_live_webinars'), 3);
assert.equal(await cnt('evt_calendar_ics_sync'), 4);

const ov = await getFull9ModuleEventsOverview(env);
assert.equal(ov.suite_09.total_modules, 9);
assert.equal(ov.suite_09.active_modules, 9);
assert.equal(ov.open_district_workshops, 3);
assert.equal(ov.upcoming_live_webinars, 2);
assert.equal(ov.active_ics_feeds, 4);
for (const code of ['01', '02', '03', '04', '05', '06', '07', '08', '09']) {
  assert.equal(ov.modules[code].status, 'active');
}

// 4. Module 07: District Meetup Seat Capacity Enforcement & Rollback
const mtpNew = (await jcall3('POST', 'meetups', 'meetups', undefined, undefined, {
  meetup_code: 'MTP-2026-0099',
  district_odisha: 'Ganjam (Berhampur)',
  rdc_zone: 'Southern RDC',
  title_en: '<script>x</script>Berhampur OPSC & OSSC Career Camp',
  event_date_ist: '2026-12-19',
  seat_capacity: 50,
  seats_registered: 49,
  meetup_status: 'open_registration'
})).item;
assert.equal(mtpNew.title_en, 'Berhampur OPSC & OSSC Career Camp');
assert.equal(mtpNew.meetup_status, 'almost_full');

const rsvpOk = await jcall3('PATCH', `meetups/${mtpNew.id}/increment-rsvp`, 'meetups', mtpNew.id, 'increment-rsvp', { delta: 1 });
assert.equal(rsvpOk.item.seats_registered, 50);
assert.equal(rsvpOk.item.meetup_status, 'housefull_closed');
await rej(call3('PATCH', `meetups/${mtpNew.id}/increment-rsvp`, 'meetups', mtpNew.id, 'increment-rsvp', { delta: 1 }), 409);

const revs07 = await jcall1('GET', `revisions?module_code=07&entity_id=${mtpNew.id}`, 'revisions');
assert.ok(revs07.items.length >= 2);
const rb07 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, {
  revision_id: revs07.items[revs07.items.length - 1].id
});
assert.equal(rb07.restored.seats_registered, 49);

// 5. Module 08: Live Webinars CRUD & Masked Passcode Hint
const webNew = (await jcall3('POST', 'webinars', 'webinars', undefined, undefined, {
  webinar_code: 'WEB-2026-0099',
  session_track: 'topper_mock_review',
  title_en: '<script>bad</script>OAS Topper Answer Writing Workshop',
  speaker_name_role: 'Rank 12 OAS Officer',
  language_medium: 'bilingual_en_or',
  scheduled_start_ist: '2026-12-02T19:30:00+05:30',
  duration_minutes: 90,
  streaming_platform: 'Zoom Webinar',
  public_join_url: 'https://csodisha.com/live/oas-writing',
  passcode_masked_hint: 'OAS-998855',
  webinar_status: 'upcoming_rsvp'
})).item;
assert.equal(webNew.title_en, 'OAS Topper Answer Writing Workshop');
assert.equal(webNew.passcode_masked_hint, 'OAS-••••55');
await jcall3('PATCH', `webinars/${webNew.id}/status`, 'webinars', webNew.id, 'status', { webinar_status: 'live_now' });

// 6. Module 09: ICS Calendar Feed, RFC 5545 .ics Endpoint & Cookieless Push Dispatch
const feedNew = (await jcall3('POST', 'calendar-sync', 'calendar-sync', undefined, undefined, {
  feed_slug: 'odisha-test-feed',
  feed_title_en: 'Odisha Test Calendar Feed',
  source_scope: 'all_events',
  ics_cache_ttl_sec: 300
})).item;
assert.equal(feedNew.feed_slug, 'odisha-test-feed');

const pushRes = await jcall3('POST', `calendar-sync/${feedNew.id}/dispatch-push`, 'calendar-sync', feedNew.id, 'dispatch-push', {
  summary_en: 'OPSC OAS Prelims Admit Card Alert Pushed'
});
assert.equal(pushRes.ok, true);
assert.equal(pushRes.item.push_dispatch_count, 1);

const icsRes = await handlePublicEventsIcsFeedApi(new Request('https://csodisha.com/api/events/calendar/odisha-all-exams.ics'), env, 'odisha-all-exams.ics');
assert.equal(icsRes.status, 200);
assert.equal(icsRes.headers.get('Content-Type'), 'text/calendar; charset=utf-8');
assert.equal(icsRes.headers.get('X-CSO-Timezone'), 'Asia/Kolkata');
const icsText = await icsRes.text();
assert.ok(icsText.includes('BEGIN:VCALENDAR'));
assert.ok(icsText.includes('X-WR-TIMEZONE:Asia/Kolkata'));
assert.ok(icsText.includes('TZID:Asia/Kolkata'));
assert.ok(icsText.includes('BEGIN:VEVENT'));
assert.ok(icsText.includes('END:VCALENDAR'));

// Soft-archive cleanup
await jcall3('DELETE', `meetups/${mtpNew.id}`, 'meetups', mtpNew.id);
await jcall3('DELETE', `webinars/${webNew.id}`, 'webinars', webNew.id);
await jcall3('DELETE', `calendar-sync/${feedNew.id}`, 'calendar-sync', feedNew.id);

console.log('ALL EVENTS & SCHEDULING BATCH 3 & 9-MODULE SUITE TESTS PASSED');
