import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleUsersCommunityBatch1Admin as H1,
  ensureUsersCommunityBatch1Schema
} from '../functions/_lib/users-community-batch1.js';
import { ensureUsersCommunityBatch2Schema } from '../functions/_lib/users-community-batch2.js';
import {
  ensureUsersCommunityBatch3Schema,
  handleUsersCommunityBatch3Admin as H3
} from '../functions/_lib/users-community-batch3.js';
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
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, admin, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, admin, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/comments`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/comments`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/blocked-accounts`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureUsersCommunityBatch1Schema(env.DB);
await ensureUsersCommunityBatch2Schema(env.DB);
await ensureUsersCommunityBatch3Schema(env.DB);
await ensureUsersCommunityBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('urc_comments'), 3);
assert.equal(await cnt('urc_moderation_queue'), 2);
assert.equal(await cnt('urc_user_reports'), 2);
assert.equal(await cnt('urc_blocked_accounts'), 1);

// Overview includes 09-12 active
const ov = await jcall1('GET', 'overview', 'overview');
assert.equal(ov.modules['09'].status, 'active');
assert.equal(ov.modules['10'].status, 'active');
assert.equal(ov.modules['11'].status, 'active');
assert.equal(ov.modules['12'].status, 'active');
assert.equal(ov.published_comments_count, 2);
assert.equal(ov.pending_moderation_count, 2);
assert.equal(ov.open_user_reports_count, 1);
assert.equal(ov.active_blocked_accounts_count, 1);

// 3. Module 09: Comments & Replies CRUD, bulk-status, revision rollback
const mentorReply = (await jcall3('POST', 'comments', 'comments', undefined, undefined, {
  post_id: 'urc-post-001',
  body_en: 'Download the Balasore & Cuttack District History PDF from Study Library.',
  body_or: 'ଷ୍ଟଡି ଲାଇବ୍ରେରୀରୁ ବାଲେଶ୍ୱର ଏବଂ କଟକ ଜିଲ୍ଲା ଇତିହାସ PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ।',
  is_official_mentor_reply: true,
  status: 'published'
})).item;
assert.equal(mentorReply.is_official_mentor_reply, true);

await jcall3('PATCH', `comments/${mentorReply.id}`, 'comments', mentorReply.id, undefined, {
  body_en: 'Updated mentor reply with OPSC OAS 2026 PYQ link.'
});
await jcall3('PATCH', 'comments/bulk-status', 'comments', 'bulk-status', undefined, {
  ids: [mentorReply.id],
  status: 'pending_review'
});
const revs09 = await jcall1('GET', `revisions?module_code=09&entity_id=${mentorReply.id}`, 'revisions');
assert.ok(revs09.items.length >= 2);
const rb09 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs09.items[0].id });
assert.equal(rb09.ok, true);

// 4. Module 10: Moderation Queue cascading to source post & comment
await jcall3('PATCH', 'moderation/urc-mod-002', 'moderation', 'urc-mod-002', undefined, {
  decision: 'approved',
  moderator_note: 'Verified OTET checklist'
});
const pubPost = await env.DB.prepare(`SELECT status FROM urc_community_posts WHERE id = 'urc-post-003'`).first();
assert.equal(pubPost.status, 'published', 'Approving moderation item publishes linked post');

await jcall3('PATCH', 'moderation/urc-mod-001', 'moderation', 'urc-mod-001', undefined, {
  decision: 'rejected',
  moderator_note: 'Spam telegram link'
});
const hidCmt = await env.DB.prepare(`SELECT status FROM urc_comments WHERE id = 'urc-cmt-003'`).first();
assert.equal(hidCmt.status, 'hidden_spam', 'Rejecting moderation item hides linked comment');

// 5. Module 11: User Reports & auto_block_user
const newRpt = (await jcall3('POST', 'reports', 'reports', undefined, undefined, {
  reported_user_name: 'Test Reporter Target',
  reported_email: 'target@example.in',
  violation_category: 'harassment_abuse',
  severity: 'medium',
  description_text: 'Abusive reply in forum.'
})).item;
assert.equal(newRpt.report_status, 'open');

const resRpt = await jcall3('PATCH', 'reports/urc-rpt-001', 'reports', 'urc-rpt-001', undefined, {
  report_status: 'action_taken',
  action_summary: 'Confirmed unauthorized Telegram spam; account blocked.',
  auto_block_user: true
});
assert.equal(resRpt.item.report_status, 'action_taken');
assert.ok(resRpt.auto_block_id, 'Auto-created block record');
const blockedUser = await env.DB.prepare(`SELECT account_status FROM urc_users WHERE id = 'urc-u-005'`).first();
assert.equal(blockedUser.account_status, 'blocked', 'urc_users.account_status synced to blocked');

const revs11 = await jcall1('GET', 'revisions?module_code=11&entity_id=urc-rpt-001', 'revisions');
assert.ok(revs11.items.length >= 1);

// 6. Module 12: Blocked Accounts, super_admin guard, unblock & restore
await rej(call3('POST', 'blocked-accounts', 'blocked-accounts', undefined, undefined, {
  user_id: 'urc-u-001',
  block_scope: 'full_account',
  reason_category: 'repeated_spam'
}), 409);
await rej(call3('POST', 'blocked-accounts', 'blocked-accounts', undefined, undefined, {
  blocked_email: 'founder@csodisha.com',
  block_scope: 'full_account',
  reason_category: 'repeated_spam'
}), 409);

const unblk = (await jcall3('PATCH', `blocked-accounts/${resRpt.auto_block_id}`, 'blocked-accounts', resRpt.auto_block_id, undefined, {
  action: 'unblock'
})).item;
assert.equal(unblk.block_status, 'unblocked');
const restoredUser = await env.DB.prepare(`SELECT account_status FROM urc_users WHERE id = 'urc-u-005'`).first();
assert.equal(restoredUser.account_status, 'active', 'Unblocking restores urc_users.account_status to active');

const revs12 = await jcall1('GET', `revisions?module_code=12&entity_id=${resRpt.auto_block_id}`, 'revisions');
assert.ok(revs12.items.length >= 1);

console.log('✅ All Users, Roles & Community Batch 3 (09-12) tests passed!');
