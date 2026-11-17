import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleUsersCommunityBatch1Admin as H1,
  ensureUsersCommunityBatch1Schema
} from '../functions/_lib/users-community-batch1.js';
import {
  ensureUsersCommunityBatch2Schema,
  handleUsersCommunityBatch2Admin as H2,
  handlePublicCommunityPostsApi
} from '../functions/_lib/users-community-batch2.js';
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
const admin = { userId: 'urc-u-001', email: 'founder@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/users';
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, admin, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, admin, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/account-status`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/account-status/transition`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/community-posts`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureUsersCommunityBatch1Schema(env.DB);
await ensureUsersCommunityBatch2Schema(env.DB);
await ensureUsersCommunityBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('urc_account_status_logs'), 2);
assert.equal(await cnt('urc_registrations'), 3);
assert.equal(await cnt('urc_membership_grants'), 2);
assert.equal(await cnt('urc_community_posts'), 3);

// Overview includes 05-08 active
const ov = await jcall1('GET', 'overview', 'overview');
assert.equal(ov.modules['05'].status, 'active');
assert.equal(ov.modules['06'].status, 'active');
assert.equal(ov.modules['07'].status, 'active');
assert.equal(ov.modules['08'].status, 'active');
assert.equal(ov.pending_registrations, 2);
assert.equal(ov.active_membership_grants, 2);
assert.equal(ov.published_community_posts, 2);

// 3. Module 05: Account Status transition & super_admin guard
await rej(call2('POST', 'account-status/transition', 'account-status', 'transition', undefined, {
  user_id: 'urc-u-001',
  new_status: 'suspended',
  reason_code: 'policy_violation'
}), 409);

const tr1 = await jcall2('POST', 'account-status/transition', 'account-status', 'transition', undefined, {
  user_id: 'urc-u-004',
  new_status: 'suspended',
  reason_code: 'user_requested_pause',
  reason_note: 'Exam break pause'
});
assert.equal(tr1.user.account_status, 'suspended');
const tr2 = await jcall2('POST', 'account-status/transition', 'account-status', 'transition', undefined, {
  user_id: 'urc-u-004',
  new_status: 'active',
  reason_code: 'reinstated'
});
assert.equal(tr2.user.account_status, 'active');
assert.equal(await cnt('urc_account_status_logs'), 4);

// 4. Module 06: Registrations approval auto-provisions urc_users + urc_user_profiles
const appRes = (await jcall2('PATCH', 'registrations/urc-reg-001', 'registrations', 'urc-reg-001', undefined, {
  action: 'approve',
  reviewer_note: 'Verified Balasore student'
})).item;
assert.equal(appRes.approval_status, 'approved');
assert.ok(appRes.linked_user_id, 'linked_user_id provisioned');
const provUser = await env.DB.prepare(`SELECT * FROM urc_users WHERE id = ?`).bind(appRes.linked_user_id).first();
assert.equal(provUser.email, 'soumya.balasore@example.in');
const provProf = await env.DB.prepare(`SELECT * FROM urc_user_profiles WHERE user_id = ?`).bind(appRes.linked_user_id).first();
assert.ok(provProf, 'urc_user_profiles auto-created');

const rejReg = (await jcall2('POST', 'registrations', 'registrations', undefined, undefined, {
  full_name: 'Spam Signup',
  email: 'spam.test@example.in',
  district_odisha: 'Khordha',
  requested_role: 'student'
})).item;
const rejDone = (await jcall2('PATCH', `registrations/${rejReg.id}`, 'registrations', rejReg.id, undefined, {
  action: 'reject',
  reviewer_note: 'Duplicate test'
})).item;
assert.equal(rejDone.approval_status, 'rejected');

// 5. Module 07: Membership Access bridged to fin_memberships
const memList = await jcall2('GET', 'membership-access', 'membership-access');
assert.ok(memList.tiers.length >= 3, 'fin_memberships tiers loaded');

const granted = (await jcall2('POST', 'membership-access', 'membership-access', undefined, undefined, {
  user_id: appRes.linked_user_id,
  tier_code: 'opsc_elite',
  grant_source: 'scholarship_waiver',
  duration_days: 180,
  notes: 'Odisha Merit Scholarship'
})).item;
assert.equal(granted.tier_code, 'opsc_elite');
assert.equal(granted.access_status, 'active');

const ext = (await jcall2('PATCH', `membership-access/${granted.id}`, 'membership-access', granted.id, undefined, {
  extend_days: 30,
  notes: 'Extended +30d'
})).item;
assert.equal(ext.notes, 'Extended +30d');

const revGrant = await jcall2('DELETE', `membership-access/${granted.id}`, 'membership-access', granted.id);
assert.equal(revGrant.access_status, 'revoked');

// 6. Module 08: Community Posts CRUD, pin/feature, bulk-status & public /api/community/posts
const newPost = (await jcall2('POST', 'community-posts', 'community-posts', undefined, undefined, {
  title_en: 'Sambalpur OPSC Mains Answer Writing Meetup',
  title_or: 'ସମ୍ବଲପୁର OPSC ମେନ୍ସ ଉତ୍ତର ଲେଖା ଆଲୋଚନା',
  post_type: 'peer_announcement',
  exam_tag: 'OPSC OAS',
  district_tag: 'Sambalpur',
  body_en: 'Weekend peer review session.',
  status: 'draft'
})).item;
assert.equal(newPost.status, 'draft');

await jcall2('PATCH', 'community-posts/bulk-status', 'community-posts', 'bulk-status', undefined, {
  ids: [newPost.id],
  status: 'published'
});
await jcall2('PATCH', `community-posts/${newPost.id}`, 'community-posts', newPost.id, undefined, {
  is_pinned: true,
  featured: true
});

const pubRes = await (await handlePublicCommunityPostsApi(
  new Request('https://csodisha.com/api/community/posts', { method: 'GET' }),
  env
)).json();
assert.ok(pubRes.items.length >= 3);
assert.ok(pubRes.items.every(p => p.title_en !== undefined));
assert.equal(pubRes.items[0].is_pinned, true, 'Pinned posts appear first');

// 7. Revision rollback on Module 08 & 07
const revs08 = await jcall1('GET', `revisions?module_code=08&entity_id=${newPost.id}`, 'revisions');
assert.ok(revs08.items.length >= 1);
const rb08 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs08.items[0].id });
assert.equal(rb08.ok, true);

console.log('✅ All Users, Roles & Community Batch 2 (05-08) tests passed!');
