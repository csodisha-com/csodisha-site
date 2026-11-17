import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleSettingsConfigBatch1Admin as H1 } from '../functions/_lib/settings-configuration-batch1.js';
import {
  ensureSettingsConfigBatch4Schema,
  getFull17ModuleSettingsOverview,
  handlePublicSiteConfigBatch4Api,
  handleSettingsConfigBatch4Admin as H4
} from '../functions/_lib/settings-configuration-batch4.js';
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
const call4 = (method, path, id, sub, body) => H4(req(method, `${B}/${path}`, body), env, staff, id, sub);
const jcall4 = async (...a) => (await call4(...a)).json();
const call1 = (method, path, id, sub, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/registration`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/payments`, { method: 'PUT', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/environment/run-diagnostics`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema, starter seeds & Full 17-Module Suite Overview
await ensureSettingsConfigBatch4Schema(env.DB);
await ensureSettingsConfigBatch4Schema(env.DB);
const ov = await getFull17ModuleSettingsOverview(env);
assert.equal(ov.suite_17.total_modules, 17);
assert.equal(ov.suite_17.active_modules, 17);
assert.equal(ov.registration_mode, 'otp_verified_signup');
assert.equal(ov.primary_payment_gateway, 'razorpay_india');
assert.equal(ov.gst_rate_pct, 18);
assert.equal(ov.environment_health, 'healthy');
for (let i = 1; i <= 17; i++) {
  const code = String(i).padStart(2, '0');
  assert.equal(ov.modules[code].status, 'active');
}

// 3. Module 13: Registration DPDP & Age Guardrails + Rollback
const badDpdp = await call4('PUT', 'registration', 'registration', undefined, { require_dpdp_explicit_consent: false });
assert.equal(badDpdp.status, 422);
const badAge = await call4('PUT', 'registration', 'registration', undefined, { minimum_age_years: 12 });
assert.equal(badAge.status, 422);

const regOk = (await jcall4('PUT', 'registration', 'registration', undefined, {
  registration_mode: 'open_self_signup',
  minimum_age_years: 18,
  require_dpdp_explicit_consent: true,
  auth_methods: ['email_otp', 'mobile_sms_otp']
})).item;
assert.equal(regOk.minimum_age_years, 18);
await jcall4('PUT', 'registration', 'registration', undefined, { minimum_age_years: 16 });
const revs13 = await jcall1('GET', 'revisions?module_code=13&entity_id=primary', 'revisions');
assert.ok(revs13.items.length >= 2);
const rb13 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', { revision_id: revs13.items[1].id });
assert.equal(rb13.restored.minimum_age_years, 18);

// 4. Module 14: Comment Settings
const cmtOk = (await jcall4('PUT', 'comments', 'comments', undefined, {
  moderation_mode: 'pre_approve_all',
  max_comment_length_chars: 1200
})).item;
assert.equal(cmtOk.moderation_mode, 'pre_approve_all');
assert.equal(cmtOk.max_comment_length_chars, 1200);

// 5. Module 15: Payment Settings Secret Masking & Integer Paise Validation
const badPay = await call4('PUT', 'payments', 'payments', undefined, { min_order_paise: 50 });
assert.equal(badPay.status, 422);

const payOk = (await jcall4('PUT', 'payments', 'payments', undefined, {
  primary_gateway: 'razorpay_india',
  key_id: 'rzp_live_1234567a1c',
  key_secret: 'rzp_secret_never_exposed_999',
  min_order_paise: 2500,
  max_order_paise: 1000000
})).item;
assert.equal(payOk.key_id_masked_hint, 'rzp_live_••••7a1c');
assert.equal(payOk.key_secret_hash_sha256, undefined);
assert.equal(payOk.min_order_inr, '₹25.00');

// 6. Module 16: Live Environment Diagnostics
const diag = await jcall4('POST', 'environment/run-diagnostics', 'environment', 'run-diagnostics', {});
assert.equal(diag.ok, true);
assert.equal(diag.diagnostics.d1_database.status, 'healthy');
assert.ok(diag.diagnostics.d1_database.table_count >= 15);
assert.equal(diag.diagnostics.csp_shield.policy, 'strict_zero_inline_csp');

// 7. Module 17: Administrative Preferences
const prefOk = (await jcall4('PUT', 'admin-preferences', 'admin-preferences', undefined, {
  admin_ui_density: 'compact_ops',
  table_rows_per_page: 50
})).item;
assert.equal(prefOk.admin_ui_density, 'compact_ops');
assert.equal(prefOk.table_rows_per_page, 50);

// 8. Public Enriched GET /api/config/public
const pubRes = await handlePublicSiteConfigBatch4Api(new Request('https://csodisha.com/api/config/public'), env);
assert.equal(pubRes.status, 200);
const pubJson = await pubRes.json();
assert.equal(pubJson.registration_policy.require_dpdp_explicit_consent, true);
assert.equal(pubJson.comment_policy.moderation_mode, 'pre_approve_all');
assert.equal(pubJson.payment_policy.min_order_inr, '₹25.00');
assert.equal(pubJson.payment_policy.gst_rate_pct, 18);

console.log('ALL SETTINGS & CONFIGURATION BATCH 4 & 17-MODULE SUITE TESTS PASSED');
