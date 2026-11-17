import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureAnalyticsTelemetryBatch1Schema,
  handleAnalyticsBatch1Admin as H1
} from '../functions/_lib/analytics-telemetry-batch1.js';
import { ensureAnalyticsTelemetryBatch2Schema } from '../functions/_lib/analytics-telemetry-batch2.js';
import { ensureAnalyticsTelemetryBatch3Schema } from '../functions/_lib/analytics-telemetry-batch3.js';
import {
  ensureAnalyticsTelemetryBatch4Schema,
  getFull14ModuleAnalyticsOverview,
  handleAnalyticsBatch4Admin as H4
} from '../functions/_lib/analytics-telemetry-batch4.js';
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
const B = 'https://csodisha.com/api/admin/analytics';
const call4 = (method, path, id, sub, extra, body) => H4(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall4 = async (...a) => (await call4(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/dpdp-audits`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/dpdp-audits/run-verification`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/executive-digests/generate`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds + full 14-module suite_14 overview
await ensureAnalyticsTelemetryBatch1Schema(env.DB);
await ensureAnalyticsTelemetryBatch2Schema(env.DB);
await ensureAnalyticsTelemetryBatch3Schema(env.DB);
await ensureAnalyticsTelemetryBatch4Schema(env.DB);
await ensureAnalyticsTelemetryBatch4Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('at_dpdp_privacy_audits'), 2);
assert.equal(await cnt('at_executive_digests'), 1);

const ov = await getFull14ModuleAnalyticsOverview(env);
assert.ok(ov.suite_14, 'suite_14 present');
assert.equal(ov.suite_14.total_modules, 14);
assert.equal(ov.suite_14.active_modules, 14);
for (let i = 1; i <= 14; i++) {
  const k = String(i).padStart(2, '0');
  assert.equal(ov.suite_14.modules[k].status, 'active', `Module ${k} active`);
}
assert.equal(ov.suite_14.dpdp_compliance_label, '100% Compliant');
assert.ok(ov.suite_14.latest_executive_digest);

// 3. Module 13: Live DPDP Privacy & PII Verification Scan
const scanRes = (await jcall4('POST', 'dpdp-audits/run-verification', 'dpdp-audits', 'run-verification', undefined, {})).item;
assert.equal(scanRes.pii_leaks_detected, 0);
assert.equal(scanRes.compliance_status, 'verified_compliant');
assert.ok(scanRes.records_scanned >= 15);

const auditsList = await jcall4('GET', 'dpdp-audits', 'dpdp-audits');
assert.equal(auditsList.privacy_posture.status_label, '100% Compliant');

// 4. Module 14: Live Executive Digest generation, publish, JSON/Markdown export & rollback
const genDig = (await jcall4('POST', 'executive-digests/generate', 'executive-digests', 'generate', undefined, {
  digest_frequency: 'weekly',
  period_label: '2026-W47'
})).item;
assert.equal(genDig.delivery_status, 'draft');
assert.ok(genDig.highlights.length >= 3);
assert.equal(genDig.metrics_snapshot.dpdp_compliance_label, '100% Compliant');

const pubDig = (await jcall4('PATCH', `executive-digests/${genDig.id}`, 'executive-digests', genDig.id, undefined, {
  delivery_status: 'published_briefing'
})).item;
assert.equal(pubDig.delivery_status, 'published_briefing');

const expJsonRes = await call4('GET', `executive-digests/${genDig.id}/export?format=json`, 'executive-digests', genDig.id, 'export');
assert.equal(expJsonRes.status, 200);
assert.ok(expJsonRes.headers.get('Content-Disposition').includes('.json'));

const expMdRes = await call4('GET', `executive-digests/${genDig.id}/export?format=md`, 'executive-digests', genDig.id, 'export');
assert.equal(expMdRes.status, 200);
const mdText = await expMdRes.text();
assert.ok(mdText.includes('# CS Odisha Executive Analytics Briefing'));

const revs14 = await jcall1('GET', `revisions?module_code=14&entity_id=${genDig.id}`, 'revisions');
assert.ok(revs14.items.length >= 2);
const rb14 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs14.items[0].id });
assert.equal(rb14.ok, true);

console.log('✅ All Analytics & Telemetry Batch 4 (13-14) & 14-Module Suite tests passed!');
