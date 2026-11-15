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
import { handleSecurityEdge } from '../functions/_lib/security-edge.js';
import { handleSecurityGovernance } from '../functions/_lib/security-governance.js';
import { totpCode } from '../functions/_lib/admin-2fa.js';

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

// ============================================================================
// 4. Module #4: Cloudflare Turnstile & Edge Bot Deterrence Rules
// ============================================================================
const botInit = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/bot-deterrence', { method: 'GET' }),
  env, adminActor, 'bot-deterrence'
)).json();
assert.equal(botInit.ok, true);
assert.equal(botInit.config.turnstile_mode, 'managed');
assert.equal(botInit.env_bindings.turnstile_secret_key_configured, false);

await assert.rejects(
  () => handleSecurityEdge(
    new Request('https://csodisha.com/api/admin/security/bot-deterrence', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_rate_limit_max: 2 })
    }),
    env, adminActor, 'bot-deterrence'
  ),
  err => err.status === 400 && err.code === 'INVALID_RATE_LIMIT'
);

const botPut = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/bot-deterrence', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstile_mode: 'non_interactive', login_rate_limit_max: 5, login_window_minutes: 10, block_empty_user_agent: true })
  }),
  env, adminActor, 'bot-deterrence'
)).json();
assert.equal(botPut.config.login_rate_limit_max, 5);

const simChallenge = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/bot-deterrence/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '/api/auth/login', user_agent: 'Mozilla/5.0', attempts_in_window: 1, has_turnstile_token: false })
  }),
  env, adminActor, 'bot-deterrence', 'simulate'
)).json();
assert.equal(simChallenge.verdict, 'CHALLENGE');

const simRateLimited = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/bot-deterrence/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '/api/auth/login', user_agent: 'Mozilla/5.0', attempts_in_window: 5, has_turnstile_token: true })
  }),
  env, adminActor, 'bot-deterrence', 'simulate'
)).json();
assert.equal(simRateLimited.verdict, 'RATE_LIMITED');

const simPass = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/bot-deterrence/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '/api/auth/login', user_agent: 'Mozilla/5.0', attempts_in_window: 1, has_turnstile_token: true })
  }),
  env, adminActor, 'bot-deterrence', 'simulate'
)).json();
assert.equal(simPass.verdict, 'PASS');

// ============================================================================
// 5. Module #5: Visual Audit Log Timeline Explorer & DPDP Redaction
// ============================================================================
await env.DB.prepare(
  `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata_json, ip_address)
   VALUES (?, ?, ?, ?, ?, ?)`
).bind(
  'u-admin',
  'auth.token_issue',
  'session',
  's-1',
  JSON.stringify({ token: 'SENSITIVE_TOKEN_ABC', password_hash: 'SENSITIVE_HASH_XYZ', note: 'Timeline test event' }),
  '203.0.113.10'
).run();

const streamAuth = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/audit-stream?category=auth&q=Timeline', { method: 'GET' }),
  env, adminActor, 'audit-stream'
)).json();
assert.equal(streamAuth.ok, true);
assert.equal(streamAuth.dpdp_redacted, true);
assert.equal(streamAuth.total, 1);
assert.equal(streamAuth.items[0].metadata.token, '[REDACTED_DPDP]');
assert.equal(streamAuth.items[0].metadata.password_hash, '[REDACTED_DPDP]');
assert.equal(streamAuth.items[0].metadata.note, 'Timeline test event');
assert.ok(Array.isArray(streamAuth.velocity_buckets) && streamAuth.velocity_buckets.length === 4);

// ============================================================================
// 6. Module #6: IP Access Control Lists & Anti-Self-Lockout Geofencing
// ============================================================================
const callerReqHeaders = { 'CF-Connecting-IP': '203.0.113.42', 'CF-IPCountry': 'IN', 'Content-Type': 'application/json' };
const ipInit = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/ip-geofence', { method: 'GET', headers: callerReqHeaders }),
  env, adminActor, 'ip-geofence'
)).json();
assert.equal(ipInit.caller.ip, '203.0.113.42');
assert.equal(ipInit.caller.country, 'IN');

// Reject enforce mode if caller's own IP/country would be blocked (Anti-Self-Lockout Guard)
await assert.rejects(
  () => handleSecurityEdge(
    new Request('https://csodisha.com/api/admin/security/ip-geofence', {
      method: 'PUT',
      headers: callerReqHeaders,
      body: JSON.stringify({
        enforcement_mode: 'enforce',
        allowed_countries: ['US'],
        allowlist_ips: [],
        blocklist_ips: []
      })
    }),
    env, adminActor, 'ip-geofence'
  ),
  err => err.status === 400 && err.code === 'SELF_LOCKOUT_PREVENTED'
);

// Reject invalid CIDR
await assert.rejects(
  () => handleSecurityEdge(
    new Request('https://csodisha.com/api/admin/security/ip-geofence', {
      method: 'PUT',
      headers: callerReqHeaders,
      body: JSON.stringify({
        enforcement_mode: 'monitor_only',
        allowlist_ips: ['999.999.1.1']
      })
    }),
    env, adminActor, 'ip-geofence'
  ),
  err => err.status === 400 && err.code === 'INVALID_IP_OR_CIDR'
);

// Save enforce policy with caller's CIDR allowlisted & foreign country blocked
const ipPut = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/ip-geofence', {
    method: 'PUT',
    headers: callerReqHeaders,
    body: JSON.stringify({
      enforcement_mode: 'enforce',
      allowed_countries: ['IN'],
      blocked_countries: ['KP'],
      allowlist_ips: ['203.0.113.0/24'],
      blocklist_ips: ['198.51.100.7']
    })
  }),
  env, adminActor, 'ip-geofence'
)).json();
assert.equal(ipPut.policy.enforcement_mode, 'enforce');

const ipSimAllow = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/ip-geofence/simulate', {
    method: 'POST',
    headers: callerReqHeaders,
    body: JSON.stringify({ ip: '203.0.113.99', country: 'US' })
  }),
  env, adminActor, 'ip-geofence', 'simulate'
)).json();
assert.equal(ipSimAllow.decision, 'ALLOW');

const ipSimBlock = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/ip-geofence/simulate', {
    method: 'POST',
    headers: callerReqHeaders,
    body: JSON.stringify({ ip: '198.51.100.7', country: 'IN' })
  }),
  env, adminActor, 'ip-geofence', 'simulate'
)).json();
assert.equal(ipSimBlock.decision, 'BLOCKED');

// ============================================================================
// 7. Module #7: Two-Factor Authentication (2FA / TOTP) & RFC 6238 Sandbox
// ============================================================================
const twofaInit = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/2fa', { method: 'GET' }),
  env, adminActor, '2fa'
)).json();
assert.equal(twofaInit.binding_posture, 'ENV_SECRET_UNSET_DEV_MODE');
assert.equal(twofaInit.total_staff, 3);

const twofaPut = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/2fa/policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enforcement: 'admins_only', grace_period_days: 14, allow_webauthn_passkeys: true })
  }),
  env, adminActor, '2fa', 'policy'
)).json();
assert.equal(twofaPut.policy.enforcement, 'admins_only');
assert.equal(twofaPut.policy.grace_period_days, 14);

const setupPreview = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/2fa/setup-preview', { method: 'POST' }),
  env, adminActor, '2fa', 'setup-preview'
)).json();
assert.match(setupPreview.secret_base32, /^[A-Z2-7]{32}$/);
assert.match(setupPreview.otpauth_uri, /^otpauth:\/\/totp\//);
assert.equal(setupPreview.recovery_codes.length, 8);

const liveCode = await totpCode(setupPreview.secret_base32);
const verifyValid = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/2fa/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_base32: setupPreview.secret_base32, code: liveCode })
  }),
  env, adminActor, '2fa', 'verify-code'
)).json();
assert.equal(verifyValid.valid, true);

const verifyInvalid = await (await handleSecurityEdge(
  new Request('https://csodisha.com/api/admin/security/2fa/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_base32: setupPreview.secret_base32, code: '000000' })
  }),
  env, adminActor, '2fa', 'verify-code'
)).json();
assert.equal(verifyInvalid.valid, false);

// ============================================================================
// 8. Module #8: Sensitive Field Masking & PII Redaction Controls
// ============================================================================
const piiInit = await (await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/pii-masking', { method: 'GET' }),
  env, adminActor, 'pii-masking'
)).json();
assert.equal(piiInit.ok, true);
assert.equal(piiInit.dpdp_act_mode, 'INDIA_DPDP_2023_ENFORCED');
assert.ok(piiInit.policy.custom_redacted_fields.includes('aadhaar'));

// Prevent disabling core credential redaction
await assert.rejects(
  () => handleSecurityGovernance(
    new Request('https://csodisha.com/api/admin/security/pii-masking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redact_export_credentials: false })
    }),
    env, adminActor, 'pii-masking'
  ),
  err => err.status === 400 && err.code === 'DPDP_LOCKED_RULE'
);

const piiPreview = await (await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/pii-masking/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewer_role: 'reviewer',
      payload: JSON.stringify({
        email: 'aspirant@csodisha.com',
        aadhaar: '1234-5678-9012',
        ip_address: '203.0.113.45',
        password_hash: 'SECRET_HASH'
      })
    })
  }),
  env, adminActor, 'pii-masking', 'preview'
)).json();
assert.equal(piiPreview.redacted_payload.email, 'a***@csodisha.com');
assert.equal(piiPreview.redacted_payload.aadhaar, '[REDACTED_DPDP]');
assert.equal(piiPreview.redacted_payload.password_hash, '[REDACTED_DPDP]');
assert.equal(piiPreview.redacted_payload.ip_address, '203.0.•••.•••');

// ============================================================================
// 9. Module #9: API Key Management & SHA-256 Token Scoping
// ============================================================================
const apiCreateRes = await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Odisha Mobile App',
      scopes: ['read:schemes', 'read:jobs'],
      expires_in_days: 90,
      rate_limit_rpm: 120
    })
  }),
  env, adminActor, 'api-keys'
);
assert.equal(apiCreateRes.status, 201);
const apiCreateBody = await apiCreateRes.json();
assert.match(apiCreateBody.plaintext_token, /^cso_live_[0-9a-f]{32}$/);
assert.ok(apiCreateBody.key.key_prefix.startsWith('cso_live_'));
assert.equal(apiCreateBody.key.status, 'active');

// Listing keys NEVER returns key_hash or plaintext_token
const apiListRaw = await (await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/api-keys', { method: 'GET' }),
  env, adminActor, 'api-keys'
)).text();
assert.ok(!apiListRaw.includes(apiCreateBody.plaintext_token), 'list endpoint must never leak plaintext token');
assert.ok(!apiListRaw.includes('key_hash'), 'list endpoint must never expose key_hash');
const apiList = JSON.parse(apiListRaw);
assert.equal(apiList.active_count, 1);

// Revoke key
const revKeyRes = await (await handleSecurityGovernance(
  new Request(`https://csodisha.com/api/admin/security/api-keys/${apiCreateBody.key.id}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }),
  env, adminActor, 'api-keys', apiCreateBody.key.id, 'revoke'
)).json();
assert.equal(revKeyRes.key.status, 'revoked');
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'security.api_key.revoke'`).first()).n === 1);

// ============================================================================
// 10. Module #10: CSRF Protection & Origin Integrity Headers
// ============================================================================
const origGet = await (await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/origin-headers', { method: 'GET' }),
  env, adminActor, 'origin-headers'
)).json();
assert.equal(origGet.csp_inline_zero, true);
assert.ok(origGet.headers_audit.some(h => h.header === 'Content-Security-Policy'));

const csrfBlock = await (await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/origin-headers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'POST', origin: 'https://evil-attacker.example', has_session_cookie: true })
  }),
  env, adminActor, 'origin-headers', 'test'
)).json();
assert.equal(csrfBlock.allowed, false);
assert.equal(csrfBlock.verdict, 'BLOCK_CSRF_ORIGIN_MISMATCH');

const csrfAllow = await (await handleSecurityGovernance(
  new Request('https://csodisha.com/api/admin/security/origin-headers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'POST', origin: 'https://csodisha.com', has_session_cookie: true })
  }),
  env, adminActor, 'origin-headers', 'test'
)).json();
assert.equal(csrfAllow.allowed, true);
assert.equal(csrfAllow.verdict, 'ALLOW');

console.log('SECURITY & RBAC SUITE MODULES #1-#10 TESTS PASSED');
