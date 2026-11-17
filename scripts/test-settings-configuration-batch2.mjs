import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleSettingsConfigBatch1Admin as H1 } from '../functions/_lib/settings-configuration-batch1.js';
import {
  ensureSettingsConfigBatch2Schema,
  formatPreviewSamples,
  getFull8ModuleSettingsOverview,
  handlePublicSiteConfigBatch2Api,
  handleSettingsConfigBatch2Admin as H2
} from '../functions/_lib/settings-configuration-batch2.js';
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
const B = 'https://csodisha.com/api/admin/settings';
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const call1 = (method, path, id, sub, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/languages`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/timezone`, { method: 'PUT', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/homepage`, { method: 'PUT', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Format Preview Unit Checks
const smpIn = formatPreviewSamples({ date_format_pattern: 'DD-MM-YYYY', time_format_pattern: '12h_am_pm', number_grouping: 'indian_lakhs_crores', currency_symbol: '₹', decimal_places: 2 });
assert.equal(smpIn.date_sample, '17-11-2026');
assert.equal(smpIn.time_sample, '05:30 PM IST');
assert.equal(smpIn.currency_sample, '₹1,23,456.00');

const smpUs = formatPreviewSamples({ date_format_pattern: 'YYYY-MM-DD', time_format_pattern: '24h_military', number_grouping: 'international_thousands', currency_symbol: '₹', decimal_places: 0 });
assert.equal(smpUs.date_sample, '2026-11-17');
assert.equal(smpUs.time_sample, '17:30 IST');
assert.equal(smpUs.currency_sample, '₹123,456');

// 3. Idempotent schema, starter seeds & 8-module overview
await ensureSettingsConfigBatch2Schema(env.DB);
await ensureSettingsConfigBatch2Schema(env.DB);
const ov = await getFull8ModuleSettingsOverview(env);
assert.equal(ov.enabled_languages_count, 2);
assert.equal(ov.odia_coverage_pct, 98);
assert.equal(ov.iana_timezone, 'Asia/Kolkata');
assert.equal(ov.homepage_active_sections_count, 4);
for (const c of ['01', '02', '03', '04', '05', '06', '07', '08']) {
  assert.equal(ov.modules[c].status, 'active');
}
assert.equal(ov.modules['09'].status, 'queued');

// 4. Module 05: Languages Toggle & Default Protection
await rej(call2('PATCH', 'languages/cfg-lang-en/toggle', 'languages', 'cfg-lang-en', 'toggle'), 409);
const hiToggled = (await jcall2('PATCH', 'languages/cfg-lang-hi/toggle', 'languages', 'cfg-lang-hi', 'toggle')).item;
assert.equal(hiToggled.is_enabled, 1);
const langCreated = (await jcall2('POST', 'languages', 'languages', undefined, undefined, {
  lang_code: 'te-IN',
  english_name: 'Telugu',
  native_name: 'తెలుగు',
  script_name: 'Latin',
  translation_coverage_pct: 40
})).item;
assert.equal(langCreated.lang_code, 'te-IN');

// 5. Module 06: Time Zone
const tzRes = await jcall2('PUT', 'timezone', 'timezone', undefined, undefined, {
  iana_timezone: 'Asia/Kolkata',
  academic_session_label: '2027-28 (Apr – Mar)',
  enforce_ist_on_deadlines: true
});
assert.equal(tzRes.item.academic_session_label, '2027-28 (Apr – Mar)');
assert.ok(tzRes.server_ist_now.endsWith('+05:30'));

// 6. Module 07: Formats + Rollback
const fmtRes = await jcall2('PUT', 'formats', 'formats', undefined, undefined, {
  date_format_pattern: 'DD MMM YYYY',
  number_grouping: 'indian_lakhs_crores',
  decimal_places: 2
});
assert.equal(fmtRes.preview_samples.date_sample, '17 Nov 2026');
assert.equal(fmtRes.preview_samples.currency_sample, '₹1,23,456.00');

// 7. Module 08: Homepage Settings + Sanitization + Rollback
const hpRes = await jcall2('PUT', 'homepage', 'homepage', undefined, undefined, {
  hero_headline_en: '<script>x</script>Odisha Competitive Exams & Schemes 2026',
  show_daily_pyq_widget: false,
  featured_cards_limit: 8
});
assert.equal(hpRes.item.hero_headline_en, 'Odisha Competitive Exams & Schemes 2026');
assert.equal(hpRes.item.show_daily_pyq_widget, 0);
assert.equal(hpRes.item.featured_cards_limit, 8);
await jcall2('PUT', 'homepage', 'homepage', undefined, undefined, { featured_cards_limit: 10 });
const revs08 = await jcall1('GET', 'revisions?module_code=08&entity_id=primary', 'revisions');
assert.ok(revs08.items.length >= 2);
const rb08 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', { revision_id: revs08.items[1].id });
assert.equal(rb08.restored.featured_cards_limit, 8);

// 8. Public Enriched GET /api/config/public
const pubRes = await handlePublicSiteConfigBatch2Api(new Request('https://csodisha.com/api/config/public'), env);
assert.equal(pubRes.status, 200);
const pubJson = await pubRes.json();
assert.ok(Array.isArray(pubJson.languages) && pubJson.languages.length >= 3);
assert.equal(pubJson.timezone.iana_timezone, 'Asia/Kolkata');
assert.equal(pubJson.formats.preview_samples.currency_sample, '₹1,23,456.00');
assert.equal(pubJson.homepage.featured_cards_limit, 8);

console.log('ALL SETTINGS & CONFIGURATION BATCH 2 TESTS PASSED');
