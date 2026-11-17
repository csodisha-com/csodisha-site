import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureUsersCommunityBatch1Schema,
  handleUsersCommunityBatch1Admin as H,
  computeProfileCompletion
} from '../functions/_lib/users-community-batch1.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT 'hash_secret',
      salt TEXT NOT NULL DEFAULT 'salt_secret',
      role TEXT NOT NULL DEFAULT 'candidate',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE candidates (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      district TEXT NOT NULL,
      password_hash TEXT NOT NULL DEFAULT 'hash_secret',
      salt TEXT NOT NULL DEFAULT 'salt_secret',
      target_streams TEXT NOT NULL DEFAULT '["opsc"]',
      last_login_at TEXT
    );
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  // Seed one bridged auth user + candidate
  db.prepare(`INSERT INTO users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)`).run(
    'auth-u-99', 'bridged.puri@example.in', 'SUPER_SECRET_HASH', 'SUPER_SECRET_SALT', 'candidate'
  );
  db.prepare(`INSERT INTO candidates (id, full_name, email, phone, district) VALUES (?, ?, ?, ?, ?)`).run(
    'auth-u-99', 'Pritam Swain', 'bridged.puri@example.in', '+91-9437999999', 'Puri'
  );
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
const superActor = { userId: 'urc-u-001', email: 'founder@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/users';
const call = (method, path, id, sub, extra, body, actor = superActor) =>
  H(req(method, `${B}/${path}`, body), env, actor, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/directory`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/directory`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/directory`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema, starter seeds & auth bridge
await ensureUsersCommunityBatch1Schema(env.DB);
await ensureUsersCommunityBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('urc_roles'), 5);
assert.ok((await cnt('urc_users')) >= 7, '6 starter + 1 bridged auth user');
assert.ok((await cnt('urc_user_profiles')) >= 7);
assert.equal(await cnt('urc_admin_accounts'), 3);

// 3. Overview KPIs
const ov = await jcall('GET', 'overview', 'overview');
assert.ok(ov.total_users >= 7);
assert.equal(ov.verified_educators, 3);
assert.equal(ov.active_admins, 3);
assert.equal(ov.total_roles, 5);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');

// 4. Module 01: Directory CRUD, filters, bulk status, no secret exposure & Super Admin protection
const dirAll = await jcall('GET', 'directory', 'directory');
for (const u of dirAll.items) {
  assert.equal('password_hash' in u, false, 'password_hash must never be exposed');
  assert.equal('salt' in u, false, 'salt must never be exposed');
  assert.equal('sessionToken' in u, false, 'sessionToken must never be exposed');
}
const balUsers = await jcall('GET', 'directory?district_odisha=Balasore', 'directory');
assert.ok(balUsers.items.length >= 2);
assert.ok(balUsers.items.every(u => u.district_odisha === 'Balasore'));

const createdUser = (await jcall('POST', 'directory', 'directory', undefined, undefined, {
  full_name: 'Lopamudra Panda',
  email: 'lopamudra.sambalpur@example.in',
  phone: '+91-9437111222',
  role_key: 'student',
  district_odisha: 'Sambalpur',
  preferred_lang: 'both'
})).item;
assert.equal(createdUser.district_odisha, 'Sambalpur');

await jcall('PATCH', `directory/${createdUser.id}`, 'directory', createdUser.id, undefined, {
  role_key: 'educator',
  account_status: 'pending_verification'
});
await jcall('PATCH', 'directory/bulk-status', 'directory', 'bulk-status', undefined, {
  ids: [createdUser.id],
  account_status: 'active'
});
await rej(call('DELETE', 'directory/urc-u-001', 'directory', 'urc-u-001'), 409);
const archived = await jcall('DELETE', `directory/${createdUser.id}`, 'directory', createdUser.id);
assert.equal(archived.account_status, 'blocked');

// 5. Module 02: User Profiles & completion % calculation
const basePct = computeProfileCompletion({ full_name: 'Test', district_odisha: 'Khordha' }, { display_handle: '@t' });
const fullPct = computeProfileCompletion(
  { full_name: 'Test', district_odisha: 'Khordha' },
  {
    display_handle: '@t', bio_en: 'Bio EN', bio_or: 'Bio OR',
    academic_stage: 'Postgraduate', target_exams: ['OPSC OAS'],
    institution_name: 'Utkal University', badge_label: 'Scholar'
  }
);
assert.ok(fullPct > basePct && fullPct === 100);

const profList = await jcall('GET', 'profiles?q=debasis', 'profiles');
assert.equal(profList.items.length, 1);
const debProf = profList.items[0];
const updProf = (await jcall('PUT', `profiles/${debProf.id}`, 'profiles', debProf.id, undefined, {
  bio_or: 'ଓଡ଼ିଆ ବାୟୋ ଅପଡେଟ୍',
  target_exams: ['OSSSC RI', 'OSSC CGL'],
  badge_label: 'Active Aspirant',
  verified_educator: true
})).item;
assert.ok(updProf.profile_completion_pct > debProf.profile_completion_pct);
assert.equal(updProf.verified_educator, true);

// 6. Module 03: Roles & Permissions matrix + Super Admin protection
const customRole = (await jcall('POST', 'roles', 'roles', undefined, undefined, {
  role_key: 'district_coord',
  role_name_en: 'District Coordinator',
  role_name_or: 'ଜିଲ୍ଲା ସଂଯୋଜକ',
  permissions: { edu_resources: { view: true, create: true }, users_community: { view: true } }
})).item;
assert.equal(customRole.permissions.edu_resources.create, true);

await rej(call('PUT', 'roles/super_admin', 'roles', 'super_admin', undefined, {
  permissions: { edu_resources: { view: true, create: false } }
}), 409);
await rej(call('DELETE', 'roles/super_admin', 'roles', 'super_admin'), 409);
const delRole = await jcall('DELETE', `roles/${customRole.id}`, 'roles', customRole.id);
assert.equal(delRole.status, 'archived');

// 7. Module 04: Admin Accounts + Self-Lockout & Last-Super-Admin protection
const newAdm = (await jcall('POST', 'admins', 'admins', undefined, undefined, {
  full_name: 'Kalyani Mishra',
  email: 'kalyani.admin@csodisha.com',
  admin_role_key: 'admin',
  department_label: 'Finance & Compliance',
  mfa_enforced: true,
  session_timeout_mins: 45
})).item;
assert.equal(newAdm.mfa_enforced, true);
assert.equal(newAdm.session_timeout_mins, 45);

// Self-lockout guard on urc-a-001 (linked to urc-u-001 / founder@csodisha.com)
await rej(call('PATCH', 'admins/urc-a-001', 'admins', 'urc-a-001', undefined, { status: 'suspended' }), 409);
await rej(call('PATCH', 'admins/urc-a-001', 'admins', 'urc-a-001', undefined, { admin_role_key: 'admin' }), 409);
await rej(call('DELETE', 'admins/urc-a-001', 'admins', 'urc-a-001'), 409);

// 8. Revision history & rollback
const revs = await jcall('GET', `revisions?module_code=02&entity_id=${debProf.id}`, 'revisions');
assert.ok(revs.items.length >= 1);
const rb = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs.items[0].id });
assert.equal(rb.ok, true);

console.log('✅ All Users, Roles & Community Batch 1 (01-04) tests passed!');
