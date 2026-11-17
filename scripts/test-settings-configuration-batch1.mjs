import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureSettingsConfigBatch1Schema,
  handlePublicSiteConfigApi,
  handleSettingsConfigBatch1Admin as H
} from '../functions/_lib/settings-configuration-batch1.js';
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
const call = (method, path, id, sub, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/general`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/general`, { method: 'PUT', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/identity`, { method: 'PUT', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema, starter seeds & 17-module overview
await ensureSettingsConfigBatch1Schema(env.DB);
await ensureSettingsConfigBatch1Schema(env.DB);
const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.site_mode, 'live_production');
assert.equal(ov.dpdp_grievance_ready, true);
assert.equal(ov.default_locale, 'en-IN');
assert.equal(ov.secondary_locale, 'or-IN');
assert.equal(ov.currency_code, 'INR');
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.modules['05'].status, 'queued');
assert.equal(ov.modules['17'].status, 'queued');

// 3. Module 01: General Website Settings + Sanitization + Rollback
const g1 = (await jcall('PUT', 'general', 'general', undefined, {
  site_name_en: '<script>x</script>CS Odisha Portal 2026',
  site_mode: 'scheduled_maintenance',
  maintenance_banner_en: 'Scheduled D1 upgrade at 02:00 AM IST'
})).item;
assert.equal(g1.site_name_en, 'CS Odisha Portal 2026');
assert.equal(g1.site_mode, 'scheduled_maintenance');
const revs01 = await jcall('GET', 'revisions?module_code=01&entity_id=primary', 'revisions');
assert.ok(revs01.items.length >= 1);
await jcall('PUT', 'general', 'general', undefined, { site_mode: 'live_production' });
const revs01b = await jcall('GET', 'revisions?module_code=01&entity_id=primary', 'revisions');
assert.ok(revs01b.items.length >= 2);
const rb01 = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', { revision_id: revs01b.items[1].id });
assert.equal(rb01.restored.site_mode, 'scheduled_maintenance');
await jcall('PUT', 'general', 'general', undefined, { site_mode: 'live_production' });

// 4. Module 02: Website Identity Hex Color Validation
const badHex = await call('PUT', 'identity', 'identity', undefined, { primary_hex: 'not-a-hex' });
assert.equal(badHex.status, 422);
const iden = (await jcall('PUT', 'identity', 'identity', undefined, {
  primary_hex: '#14532d',
  accent_hex: '#b45309'
})).item;
assert.equal(iden.primary_hex, '#14532D');

// 5. Module 03: Contact Information Email Validation & DPDP Grievance Officer
const badEmail = await call('PUT', 'contact', 'contact', undefined, { support_email: 'invalid-email' });
assert.equal(badEmail.status, 422);
const con = (await jcall('PUT', 'contact', 'contact', undefined, {
  support_email: 'help@csodisha.com',
  grievance_email: 'dpo@csodisha.com'
})).item;
assert.equal(con.support_email, 'help@csodisha.com');
assert.equal(con.grievance_email, 'dpo@csodisha.com');

// 6. Module 04: Localization
const loc = (await jcall('PUT', 'localization', 'localization', undefined, {
  default_locale: 'en-IN',
  secondary_locale: 'or-IN',
  currency_code: 'INR',
  number_grouping_system: 'indian_lakhs_crores'
})).item;
assert.equal(loc.currency_symbol, '₹');

// 7. Public edge-cached GET /api/config/public
const pubRes = await handlePublicSiteConfigApi(new Request('https://csodisha.com/api/config/public'), env);
assert.equal(pubRes.status, 200);
assert.ok(pubRes.headers.get('Cache-Control').includes('public'));
const pubJson = await pubRes.json();
assert.equal(pubJson.general.site_mode, 'live_production');
assert.equal(pubJson.general.updated_by, undefined);
assert.equal(pubJson.identity.primary_hex, '#14532D');
assert.equal(pubJson.contact.grievance_email, 'dpo@csodisha.com');
assert.equal(pubJson.localization.currency_code, 'INR');

console.log('ALL SETTINGS & CONFIGURATION BATCH 1 TESTS PASSED');
