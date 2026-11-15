import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureContentPublishingSchema,
  handleContentPublishing
} from '../functions/_lib/content-publishing.js';
import { handleSecurityRbac } from '../functions/_lib/security-rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  // Start with a legacy 0006-style posts table missing modern editorial columns
  db.exec(`
    CREATE TABLE posts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('current_affair', 'job')),
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      title_or TEXT,
      summary TEXT,
      summary_or TEXT,
      body_md TEXT,
      body_md_or TEXT,
      category TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      cover_media_key TEXT,
      event_date TEXT,
      organisation TEXT,
      vacancies INTEGER,
      qualification TEXT,
      last_date TEXT,
      apply_url TEXT,
      notification_media_key TEXT,
      state TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'expired', 'archived')),
      published_at TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
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

  // Seed one legacy current_affair row to ensure backward compatibility
  db.prepare(
    `INSERT INTO posts (id, type, slug, title, summary, status, published_at, created_by)
     VALUES ('legacy_ca_1', 'current_affair', 'legacy-odisha-budget', 'Legacy Odisha Budget Highlight', 'Legacy summary', 'published', datetime('now'), 'admin@csodisha.com')`
  ).run();

  return {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        bind(...args) {
          return {
            async first() { return stmt.get(...args) ?? null; },
            async all() { return { results: stmt.all(...args) }; },
            async run() {
              const info = stmt.run(...args);
              return { meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
            }
          };
        },
        async first() { return stmt.get() ?? null; },
        async all() { return { results: stmt.all() }; },
        async run() {
          const info = stmt.run();
          return { meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const adminActor = { userId: 'u-admin', email: 'admin@csodisha.com', role: 'admin' };
const editorActor = { userId: 'u-editor', email: 'editor@csodisha.com', role: 'editor' };

// 1. Idempotent Schema Migration
await ensureContentPublishingSchema(env.DB);
await ensureContentPublishingSchema(env.DB); // Must be safe to run twice

const colsRes = await env.DB.prepare(`PRAGMA table_info(posts)`).all();
const colNames = new Set(colsRes.results.map(c => c.name));
for (const c of ['post_type', 'workflow_stage', 'seo_title', 'seo_description', 'district_tag', 'exam_relevance', 'source_citation', 'is_featured']) {
  assert.ok(colNames.has(c), `Expected column ${c} on posts`);
}

// 2. Module #2 Guardrail enforcement: require_seo_meta_before_publish = true
await assert.rejects(
  () => handleContentPublishing(
    new Request('https://csodisha.com/api/admin/content/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'OPSC OAS Mains Strategy 2026',
        post_type: 'article',
        workflow_stage: 'published',
        body_md: 'Detailed essay strategy for OPSC OAS aspirants.'
      })
    }),
    env, editorActor, 'posts'
  ),
  (e) => e.code === 'SEO_META_REQUIRED'
);

// 3. Create Draft Article, News Story, and Current Affairs Brief
const artCreate = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'OPSC OAS Mains Strategy 2026',
      post_type: 'article',
      workflow_stage: 'draft',
      category: 'Strategy',
      tags: ['opsc', 'mains'],
      is_featured: true,
      summary: 'Complete preparation blueprint.',
      body_md: 'Write structured answers with Odisha case studies and constitutional citations.'
    })
  }),
  env, editorActor, 'posts'
)).json();
assert.equal(artCreate.ok, true);
assert.equal(artCreate.item.post_type, 'article');
assert.equal(artCreate.item.workflow_stage, 'draft');

const newsCreate = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Balasore Collectorate Recruitment Notice',
      post_type: 'news',
      workflow_stage: 'published',
      district_tag: 'Balasore',
      source_citation: 'Odisha Gazette',
      seo_title: 'Balasore Collectorate Recruitment Notice 2026',
      seo_description: 'Official district update for Balasore candidates.'
    })
  }),
  env, adminActor, 'posts'
)).json();
assert.equal(newsCreate.item.post_type, 'news');
assert.equal(newsCreate.item.district_tag, 'Balasore');
assert.equal(newsCreate.item.status, 'published');

const caCreate = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Odisha Semiconductor Policy Approved',
      post_type: 'current_affairs',
      workflow_stage: 'published',
      exam_relevance: 'OPSC OAS, OSSC CGL',
      seo_title: 'Odisha Semiconductor Policy 2026',
      seo_description: 'Key takeaways for OPSC and OSSC Current Affairs.'
    })
  }),
  env, adminActor, 'posts'
)).json();
assert.equal(caCreate.item.post_type, 'current_affairs');
assert.equal(caCreate.item.exam_relevance, 'OPSC OAS, OSSC CGL');

// 4. Scoped Queries & Telemetry across all, article, news, current_affairs
const allList = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts?type=all&limit=25&offset=0', { method: 'GET' }),
  env, adminActor, 'posts'
)).json();
assert.equal(allList.kpis.total_count, 4); // legacy_ca_1 + 3 created
assert.equal(allList.kpis.featured_count, 1);

const artList = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts?type=article', { method: 'GET' }),
  env, adminActor, 'posts'
)).json();
assert.equal(artList.kpis.total_count, 1);
assert.equal(artList.items[0].id, artCreate.item.id);

const newsList = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts?type=news&q=Balasore', { method: 'GET' }),
  env, adminActor, 'posts'
)).json();
assert.equal(newsList.items.length, 1);
assert.equal(newsList.kpis.district_tagged_count, 1);

const caList = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts?type=current_affairs', { method: 'GET' }),
  env, adminActor, 'posts'
)).json();
assert.equal(caList.kpis.total_count, 2); // legacy_ca_1 + caCreate
assert.equal(caList.kpis.exam_tagged_count, 1);

// 5. Auto-Revision Snapshotting on Update & Publish after adding SEO Meta
const artUpdate = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/posts/${artCreate.item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seo_title: 'OPSC OAS Mains Strategy 2026 — Complete Guide',
      seo_description: 'Structured answer writing blueprint for OPSC OAS Mains.',
      change_note: 'Added SEO metadata'
    })
  }),
  env, editorActor, 'posts', artCreate.item.id
)).json();
assert.equal(artUpdate.revision.version_no, 1);
assert.equal(artUpdate.item.has_seo_meta, true);

const artPub = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/posts/${artCreate.item.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_stage: 'published' })
  }),
  env, editorActor, 'posts', artCreate.item.id, 'status'
)).json();
assert.equal(artPub.item.status, 'published');
assert.equal(artPub.revision.version_no, 2);

const revCount = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM content_revisions WHERE post_id = ?`).bind(artCreate.item.id).first()).n;
assert.equal(revCount, 2);

// 6. Enforce block_editor_hard_delete for editors, allow for admin, verify audit_log
await assert.rejects(
  () => handleContentPublishing(
    new Request(`https://csodisha.com/api/admin/content/posts/${artCreate.item.id}`, { method: 'DELETE' }),
    env, editorActor, 'posts', artCreate.item.id
  ),
  (e) => e.code === 'HARD_DELETE_BLOCKED'
);

const delRes = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/posts/${artCreate.item.id}`, { method: 'DELETE' }),
  env, adminActor, 'posts', artCreate.item.id
)).json();
assert.equal(delRes.deleted, true);

for (const action of ['content.post.create', 'content.post.update', 'content.post.status', 'content.post.delete']) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = ?`).bind(action).first();
  assert.ok(row.n >= 1, `Expected audit_log entry for ${action}`);
}

console.log('CONTENT & PUBLISHING SUITE MODULES #1-#4 TESTS PASSED');
