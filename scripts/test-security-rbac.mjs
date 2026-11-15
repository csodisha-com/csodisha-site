// Unit tests for Security, Privacy & RBAC Suite Modules #1, #2 & #3
// Run: node scripts/test-security-rbac.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleSecurityRbac,
  getRbacHierarchyState,
  getEngineGuardsState,
  getSessionLifecycleState
} from '../functions/_lib/security-rbac.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'candidate',
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'candidate',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const nowSec = Math.floor(Date.now() / 1000);
  db.prepare(`INSERT INTO users (id, email, role, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, 'h', 's', ?, ?)`)
    .run('u-admin', 'admin@csodisha.com', 'admin', nowSec, nowSec);
  db.prepare(`INSERT INTO users (id, email, role, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, 'h', 's', ?, ?)`)
    .run('u-editor', 'editor@csodisha.com', 'editor', nowSec, nowSec);
  db.prepare(`INSERT INTO users (id, email, role, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, 'h', 's', ?, ?)`)
    .run('u-reviewer', 'reviewer@csodisha.com', 'reviewer', nowSec, nowSec);
  db.prepare(`INSERT INTO users (id, email, role, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, 'h', 's', ?, ?)`)
    .run('u-cand', 'candidate@csodisha.com', 'candidate', nowSec, nowSec);

  // Active & expired sessions
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('SECRET_RAW_TOKEN_ADMIN_CURRENT_111111', 'u-admin', 'admin@csodisha.com', 'admin', nowSec - 100, nowSec + 7200);
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('SECRET_RAW_TOKEN_EDITOR_ACTIVE_222222', 'u-editor', 'editor@csodisha.com', 'editor', nowSec - 200, nowSec + 3600);
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('SECRET_RAW_TOKEN_CAND_ACTIVE_333333', 'u-cand', 'candidate@csodisha.com', 'candidate', nowSec - 300, nowSec + 3600);
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('SECRET_RAW_TOKEN_EXPIRED_444444', 'u-reviewer', 'reviewer@csodisha.com', 'reviewer', nowSec - 9000, nowSec - 10);

  return {
    db,
    prepare(sql) {
      let bound = [];
      const stmt = db.prepare(sql);
      return {
        bind(...args) { bound = args; return this; },
        async first() { return stmt.get(...bound) || null; },
        async all() { return { results: stmt.all(...bound) }; },
        async run() {
          const info = stmt.run(...bound);
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: makeD1() };
const adminActor = {
  userId: 'u-admin',
  email: 'admin@csodisha.com',
  role: 'admin',
  sessionToken: 'SECRET_RAW_TOKEN_ADMIN_CURRENT_111111'
};
const editorActor = {
  userId: 'u-editor',
  email: 'editor@csodisha.com',
  role: 'editor',
  sessionToken: 'SECRET_RAW_TOKEN_EDITOR_ACTIVE_222222'
};

// ============================================================================
// 1. Module #1: RBAC Hierarchy & Role Entitlements
// ============================================================================
const rbacGetRes = await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/rbac', { method: 'GET' }),
  env, adminActor, 'rbac'
);
assert.equal(rbacGetRes.status, 200);
const rbacInit = await rbacGetRes.json();
assert.equal(rbacInit.ok, true);
assert.equal(rbacInit.total_staff, 3);
assert.equal(rbacInit.user_counts.admin, 1);
assert.equal(rbacInit.user_counts.editor, 1);
assert.equal(rbacInit.user_counts.reviewer, 1);
assert.equal(rbacInit.custom_overrides, 0);

// Non-admin blocked from editing RBAC
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/rbac', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix: { editor: { delete: true } } })
    }),
    env, editorActor, 'rbac'
  ),
  err => err.status === 403
);

// Super Admin lockout prevention
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/rbac', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix: { admin: { manage_security: false } } })
    }),
    env, adminActor, 'rbac'
  ),
  err => err.status === 400 && err.code === 'ADMIN_LOCKOUT_PREVENTED'
);

// Privilege escalation guard
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/rbac', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix: { editor: { manage_security: true } } })
    }),
    env, adminActor, 'rbac'
  ),
  err => err.status === 400 && err.code === 'PRIVILEGE_ESCALATION_BLOCKED'
);

// Valid RBAC update + audit log
const rbacPutRes = await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/rbac', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      matrix: {
        editor: { delete: true },
        reviewer: { publish: true }
      }
    })
  }),
  env, adminActor, 'rbac'
);
assert.equal(rbacPutRes.status, 200);
const rbacUpdated = await rbacPutRes.json();
assert.equal(rbacUpdated.custom_overrides, 2);
assert.equal(rbacUpdated.matrix.editor.delete, true);
assert.equal(rbacUpdated.matrix.reviewer.publish, true);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'security.rbac.update'`).first()).n === 1);

// Effective Permission Simulator
const simAllow = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/rbac/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'editor', action: 'delete' })
  }),
  env, adminActor, 'rbac', 'simulate'
)).json();
assert.equal(simAllow.decision, 'ALLOW');
assert.equal(simAllow.source, 'custom_override');

const simDeny = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/rbac/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'candidate', action: 'publish' })
  }),
  env, adminActor, 'rbac', 'simulate'
)).json();
assert.equal(simDeny.decision, 'DENY');
assert.equal(simDeny.source, 'non_staff');

// ============================================================================
// 2. Module #2: Publish & Mutation Permissions Guard (6 Engines)
// ============================================================================
const guardsInit = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/engine-guards', { method: 'GET' }),
  env, adminActor, 'engine-guards'
)).json();
assert.equal(guardsInit.ok, true);
assert.equal(guardsInit.stats.total_engines, 6);
assert.equal(guardsInit.stats.protected_engines, 6);

await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/engine-guards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guards: { bogus_engine: { require_reviewer_signoff: true } } })
    }),
    env, adminActor, 'engine-guards'
  ),
  err => err.status === 400 && err.code === 'UNKNOWN_ENGINE'
);

const guardsPutRes = await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/engine-guards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guards: {
        news_posts: {
          require_reviewer_signoff: true,
          block_editor_hard_delete: true,
          require_seo_meta_before_publish: true
        }
      }
    })
  }),
  env, adminActor, 'engine-guards'
);
assert.equal(guardsPutRes.status, 200);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'security.engine_guards.update'`).first()).n === 1);

// Dry-run Gate Tester: blocked without signoff, blocked without SEO, allowed when satisfied
const gateNoSignoff = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/engine-guards/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'editor', engine: 'news_posts', mutation: 'publish', has_reviewer_signoff: false, has_seo_meta: true })
  }),
  env, adminActor, 'engine-guards', 'test'
)).json();
assert.equal(gateNoSignoff.decision, 'BLOCKED');
assert.equal(gateNoSignoff.failed_gates[0].code, 'REVIEWER_SIGNOFF_REQUIRED');

const gateNoSeo = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/engine-guards/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'editor', engine: 'news_posts', mutation: 'publish', has_reviewer_signoff: true, has_seo_meta: false })
  }),
  env, adminActor, 'engine-guards', 'test'
)).json();
assert.equal(gateNoSeo.decision, 'BLOCKED');
assert.equal(gateNoSeo.failed_gates[0].code, 'SEO_META_REQUIRED');

const gatePass = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/engine-guards/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'editor', engine: 'news_posts', mutation: 'publish', has_reviewer_signoff: true, has_seo_meta: true })
  }),
  env, adminActor, 'engine-guards', 'test'
)).json();
assert.equal(gatePass.decision, 'ALLOWED');

const gateHardDelete = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/engine-guards/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'editor', engine: 'gov_schemes', mutation: 'delete' })
  }),
  env, adminActor, 'engine-guards', 'test'
)).json();
assert.equal(gateHardDelete.decision, 'BLOCKED');
assert.ok(gateHardDelete.failed_gates.some(g => g.code === 'HARD_DELETE_GUARDED'));

// ============================================================================
// 3. Module #3: Session Lifecycle, Inactivity Timeouts & Token Expiry
// ============================================================================
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/sessions', { method: 'GET' }),
    env, editorActor, 'sessions'
  ),
  err => err.status === 403
);

const sessRes = await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/sessions', { method: 'GET' }),
  env, adminActor, 'sessions'
);
assert.equal(sessRes.status, 200);
const sessRaw = await sessRes.text();
assert.ok(!sessRaw.includes('SECRET_RAW_TOKEN_'), 'raw session tokens must NEVER be exposed in API responses');
const sessBody = JSON.parse(sessRaw);
assert.equal(sessBody.active_count, 3);
assert.equal(sessBody.expired_count, 1);
const currentSess = sessBody.sessions.find(s => s.is_current);
const editorSess = sessBody.sessions.find(s => s.email === 'editor@csodisha.com');
assert.ok(currentSess && editorSess);
assert.match(currentSess.masked_token, /^SECRET••••1111$/);

// Policy validation bounds
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/sessions/policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idle_timeout_minutes: 5 })
    }),
    env, adminActor, 'sessions', 'policy'
  ),
  err => err.status === 400 && err.code === 'INVALID_IDLE_TIMEOUT'
);

const policyRes = await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/sessions/policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idle_timeout_minutes: 30,
      absolute_ttl_hours: 12,
      max_concurrent_sessions: 2,
      bind_user_agent: true
    })
  }),
  env, adminActor, 'sessions', 'policy'
);
assert.equal(policyRes.status, 200);
assert.equal((await policyRes.json()).policy.idle_timeout_minutes, 30);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'security.session.policy.update'`).first()).n === 1);

// Prevent accidental current-session self-lockout
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/sessions/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: currentSess.session_id })
    }),
    env, adminActor, 'sessions', 'revoke'
  ),
  err => err.status === 400 && err.code === 'CANNOT_REVOKE_CURRENT_SESSION'
);

// Revoke single non-current session
const revOne = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/sessions/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: editorSess.session_id })
  }),
  env, adminActor, 'sessions', 'revoke'
)).json();
assert.equal(revOne.revoked_count, 1);

// Bulk revoke confirmation guard
await assert.rejects(
  () => handleSecurityRbac(
    new Request('https://csodisha.com/api/admin/security/sessions/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ except_current: true, confirm: 'WRONG' })
    }),
    env, adminActor, 'sessions', 'revoke'
  ),
  err => err.status === 400 && err.code === 'CONFIRMATION_REQUIRED'
);

// Bulk revoke all other sessions while preserving current admin session
const revOthers = await (await handleSecurityRbac(
  new Request('https://csodisha.com/api/admin/security/sessions/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ except_current: true, confirm: 'REVOKE_OTHERS' })
  }),
  env, adminActor, 'sessions', 'revoke'
)).json();
assert.equal(revOthers.preserved_current, true);
assert.ok(revOthers.revoked_count >= 1);

const afterSess = await getSessionLifecycleState(env, { currentToken: adminActor.sessionToken });
assert.equal(afterSess.active_count, 1);
assert.equal(afterSess.sessions[0].is_current, true);
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'security.session.revoke'`).first()).n, 2);

console.log('SECURITY & RBAC SUITE MODULES #1, #2 & #3 TESTS PASSED');
