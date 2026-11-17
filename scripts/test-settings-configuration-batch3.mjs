import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleSettingsConfigBatch1Admin as H1 } from '../functions/_lib/settings-configuration-batch1.js';
import {
  ensureSettingsConfigBatch3Schema,
  getFull12ModuleSettingsOverview,
  handlePublicSiteConfigBatch3Api,
  handleSettingsConfigBatch3Admin as H3
} from '../functions/_lib/settings-configuration-batch3.js';
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
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const call1 = (method, path, id, sub, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/feature-toggles`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/email`, { method: 'PUT', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/upload-limits`, { method: 'PUT', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema, starter seeds & 12-module overview
await ensureSettingsConfigBatch3Schema(env.DB);
await ensureSettingsConfigBatch3Schema(env.DB);
const ov = await getFull12ModuleSettingsOverview(env);
assert.equal(ov.enabled_feature_toggles_count, 5);
assert.equal(ov.total_feature_toggles_count, 6);
assert.equal(ov.email_transport_driver, 'aws_ses_ap_south_1');
assert.equal(ov.max_pdf_mb, 25);
assert.equal(ov.default_content_language, 'bilingual_en_or');
for (const c of ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']) {
  assert.equal(ov.modules[c].status, 'active');
}
assert.equal(ov.modules['13'].status, 'queued');

// 3. Module 09: Feature Toggles + Public Exposure + Rollback
const flgNew = (await jcall3('POST', 'feature-toggles', 'feature-toggles', undefined, undefined, {
  flag_key: 'odia_voice_reader',
  label_en: '<script>x</script>Odia Voice Reader',
  label_or: 'ଓଡ଼ିଆ ଭଏସ୍ ରିଡର୍',
  category_group: 'study_tools',
  is_enabled: true
})).item;
assert.equal(flgNew.label_en, 'Odia Voice Reader');
assert.equal(flgNew.is_enabled, 1);

const toggled = (await jcall3('PATCH', `feature-toggles/${flgNew.id}/toggle`, 'feature-toggles', flgNew.id, 'toggle')).item;
assert.equal(toggled.is_enabled, 0);
const revs09 = await jcall1('GET', `revisions?module_code=09&entity_id=${flgNew.id}`, 'revisions');
assert.ok(revs09.items.length >= 2);
const rb09 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', { revision_id: revs09.items[1].id });
assert.equal(rb09.restored.is_enabled, 1);

// 4. Module 10: Email Settings Secret Masking & Transport Test
const mailRes = (await jcall3('PUT', 'email', 'email', undefined, undefined, {
  transport_driver: 'resend_api',
  smtp_host: 'api.resend.com',
  credential: 're_live_secret_token_9f2a'
})).item;
assert.equal(mailRes.credential_masked_hint, 'mail_••••9f2a');
assert.equal(mailRes.credential_hash_sha256, undefined);
const mailGet = (await jcall3('GET', 'email', 'email')).item;
assert.equal(mailGet.credential_hash_sha256, undefined);

const diag = await jcall3('POST', 'email/test-connection', 'email', 'test-connection', undefined, {});
assert.equal(diag.ok, true);
assert.equal(diag.transport_driver, 'resend_api');

// 5. Module 11: Upload Limits Executable MIME Rejection
const badMime = await call3('PUT', 'upload-limits', 'upload-limits', undefined, undefined, {
  max_pdf_mb: 25,
  allowed_mime_types: ['application/pdf', 'application/x-msdownload']
});
assert.equal(badMime.status, 422);

const goodUpl = (await jcall3('PUT', 'upload-limits', 'upload-limits', undefined, undefined, {
  max_pdf_mb: 30,
  max_image_mb: 8,
  allowed_mime_types: ['application/pdf', 'image/webp', 'image/png']
})).item;
assert.equal(goodUpl.max_pdf_mb, 30);

// 6. Module 12: Content Defaults
const cntRes = (await jcall3('PUT', 'content-defaults', 'content-defaults', undefined, undefined, {
  default_publish_status: 'in_review',
  default_content_language: 'bilingual_en_or',
  require_source_citation_url: true,
  default_reading_wpm: 220
})).item;
assert.equal(cntRes.default_reading_wpm, 220);

// 7. Public Enriched GET /api/config/public
const pubRes = await handlePublicSiteConfigBatch3Api(new Request('https://csodisha.com/api/config/public'), env);
assert.equal(pubRes.status, 200);
const pubJson = await pubRes.json();
assert.equal(pubJson.feature_flags.odia_voice_reader, true);
assert.equal(pubJson.feature_flags.pwa_offline_study_pack, true);
assert.equal(pubJson.upload_limits.max_pdf_mb, 30);
assert.deepEqual(pubJson.upload_limits.allowed_mime_types, ['application/pdf', 'image/webp', 'image/png']);

console.log('ALL SETTINGS & CONFIGURATION BATCH 3 TESTS PASSED');
