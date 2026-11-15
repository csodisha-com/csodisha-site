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

// ============================================================================
// 7. Module #5: Announcements & Notices + XSS CTA URI Blocking
// ============================================================================
await assert.rejects(
  () => handleContentPublishing(
    new Request('https://csodisha.com/api/admin/content/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Malicious CTA Test',
        post_type: 'announcement',
        notice_priority: 'urgent',
        notice_cta_url: 'javascript:alert(1)'
      })
    }),
    env, adminActor, 'posts'
  ),
  (e) => e.code === 'INVALID_CTA_URL'
);

const annCreate = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'OSSC CGL Admit Card Window Open',
      post_type: 'announcement',
      workflow_stage: 'published',
      notice_priority: 'urgent',
      notice_cta_label: 'Download Now',
      notice_cta_url: '/jobs-careers/',
      seo_title: 'OSSC CGL Admit Card Notice',
      seo_description: 'Official admit card release notice.'
    })
  }),
  env, adminActor, 'posts'
)).json();
assert.equal(annCreate.item.post_type, 'announcement');
assert.equal(annCreate.item.notice_priority, 'urgent');
assert.equal(annCreate.item.notice_cta_url, '/jobs-careers/');

const annGet = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/announcements', { method: 'GET' }),
  env, adminActor, 'announcements'
)).json();
assert.equal(annGet.kpis.active_live_count, 1);
assert.equal(annGet.kpis.urgent_count, 1);
assert.ok(annGet.ticker_preview.some(t => t.id === annCreate.item.id));
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'content.announcement.save'`).first()).n >= 1);

// ============================================================================
// 8. Module #6: Featured Content Ranking & Unpublished Pin Guard
// ============================================================================
const draftForFeat = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Draft Not Ready For Homepage',
      post_type: 'article',
      workflow_stage: 'draft'
    })
  }),
  env, adminActor, 'posts'
)).json();

await assert.rejects(
  () => handleContentPublishing(
    new Request('https://csodisha.com/api/admin/content/featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: draftForFeat.item.id, is_featured: true, featured_rank: 1 })
    }),
    env, adminActor, 'featured'
  ),
  (e) => e.code === 'UNPUBLISHED_CANNOT_FEATURE'
);

const featPin = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/featured', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: newsCreate.item.id, is_featured: true, featured_rank: 1 })
  }),
  env, adminActor, 'featured'
)).json();
assert.equal(featPin.kpis.hero_lead_id, newsCreate.item.id);
assert.equal(featPin.kpis.homepage_ready, true);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'content.featured.update'`).first()).n >= 1);

// ============================================================================
// 9. Module #7: Content Categories CRUD & 409 CATEGORY_IN_USE Reassignment
// ============================================================================
const catInit = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/categories', { method: 'GET' }),
  env, adminActor, 'categories'
)).json();
assert.ok(catInit.kpis.total_categories >= 6); // 6 default CS Odisha categories seeded

const catNew = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'District Bulletins', slug: 'district-bulletins', sort_order: 7 })
  }),
  env, adminActor, 'categories'
)).json();
assert.ok(catNew.items.some(c => c.slug === 'district-bulletins'));

// Create a post referencing district-bulletins
await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Cuttack Heritage Corridor Update',
      post_type: 'news',
      category: 'District Bulletins',
      category_slug: 'district-bulletins',
      tags: ['opsc-oas', 'cuttack']
    })
  }),
  env, adminActor, 'posts'
);

await assert.rejects(
  () => handleContentPublishing(
    new Request('https://csodisha.com/api/admin/content/categories/district-bulletins', { method: 'DELETE' }),
    env, adminActor, 'categories', 'district-bulletins'
  ),
  (e) => e.code === 'CATEGORY_IN_USE'
);

const catDelReassign = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/categories/district-bulletins?reassign_to=odisha-news', { method: 'DELETE' }),
  env, adminActor, 'categories', 'district-bulletins'
)).json();
assert.ok(!catDelReassign.items.some(c => c.slug === 'district-bulletins'));
const odishaNewsCat = catDelReassign.items.find(c => c.slug === 'odisha-news');
assert.ok(odishaNewsCat.post_count >= 1);

// ============================================================================
// 10. Module #8: Tags Aggregation, Dry-Run & Merge across posts.tags_json
// ============================================================================
const tagsGet = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/tags', { method: 'GET' }),
  env, adminActor, 'tags'
)).json();
assert.ok(tagsGet.items.some(t => t.slug === 'opsc-oas'));

const mergeDry = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/tags/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_tag: 'opsc-oas', to_tag: 'opsc', dry_run: true })
  }),
  env, adminActor, 'tags', 'merge'
)).json();
assert.equal(mergeDry.dry_run, true);
assert.equal(mergeDry.affected_posts_count, 1);

const mergeLive = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/tags/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_tag: 'opsc-oas', to_tag: 'opsc', dry_run: false })
  }),
  env, adminActor, 'tags', 'merge'
)).json();
assert.equal(mergeLive.dry_run, false);
assert.ok(!mergeLive.items.some(t => t.slug === 'opsc-oas'));
assert.ok(mergeLive.items.some(t => t.slug === 'opsc'));
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'content.tag.merge'`).first()).n >= 1);

// ============================================================================
// 11. Module #9: Editorial Calendar Grouping & Date Slotting
// ============================================================================
const slotRes = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/calendar/slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: draftForFeat.item.id, target_date: '2026-12-15' })
  }),
  env, editorActor, 'calendar', 'slot'
)).json();
assert.equal(slotRes.item.workflow_stage, 'scheduled');
assert.ok(slotRes.item.scheduled_for.startsWith('2026-12-15'));

const calGet = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/calendar?month=2026-12&type=all', { method: 'GET' }),
  env, adminActor, 'calendar'
)).json();
assert.equal(calGet.kpis.scheduled_in_month, 1);
assert.ok(Array.isArray(calGet.days['2026-12-15']) && calGet.days['2026-12-15'].length === 1);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'content.calendar.slot'`).first()).n >= 1);

// ============================================================================
// 12. Module #10: Publishing Workflow Policy Gates & Stage Transitions
// ============================================================================
const wfPol = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/workflow/policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ min_word_count: 10, require_seo_meta: true, require_reviewer_signoff: true })
  }),
  env, adminActor, 'workflow', 'policy'
)).json();
assert.equal(wfPol.policy.min_word_count, 10);
assert.equal(wfPol.policy.require_reviewer_signoff, true);

const wfDraft = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Workflow Gate Test Article',
      post_type: 'article',
      workflow_stage: 'draft',
      body_md: 'One two three four five six seven eight nine ten eleven twelve words here.',
      seo_title: 'Workflow Gate Test SEO Title',
      seo_description: 'Workflow Gate Test SEO Description.'
    })
  }),
  env, editorActor, 'posts'
)).json();

// Editor cannot publish directly when require_reviewer_signoff = true
await assert.rejects(
  () => handleContentPublishing(
    new Request('https://csodisha.com/api/admin/content/workflow/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: wfDraft.item.id, action: 'publish' })
    }),
    env, editorActor, 'workflow', 'transition'
  ),
  (e) => e.code === 'REVIEWER_SIGNOFF_REQUIRED'
);

// Submit -> Reviewer Approve -> Editor Publish
await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/workflow/transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: wfDraft.item.id, action: 'submit_for_review', review_notes: 'Ready for review' })
  }),
  env, editorActor, 'workflow', 'transition'
);

const reviewerActor = { userId: 'u-rev', email: 'reviewer@csodisha.com', role: 'reviewer' };
const wfApproved = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/workflow/transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: wfDraft.item.id, action: 'approve', review_notes: 'Looks accurate' })
  }),
  env, reviewerActor, 'workflow', 'transition'
)).json();
assert.equal(wfApproved.item.workflow_stage, 'approved');

const wfPublished = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/workflow/transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: wfDraft.item.id, action: 'publish' })
  }),
  env, editorActor, 'workflow', 'transition'
)).json();
assert.equal(wfPublished.item.status, 'published');

// ============================================================================
// 13. Module #11: Scheduled Content Due-Queue Dry-Run, Dispatch & Reschedule
// ============================================================================
const duePost = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Past Due Scheduled Post',
      post_type: 'news',
      workflow_stage: 'scheduled',
      scheduled_for: '2025-01-01T08:00:00Z',
      seo_title: 'Past Due Scheduled Post SEO',
      seo_description: 'Ready for immediate scheduled dispatch.'
    })
  }),
  env, adminActor, 'posts'
)).json();

const schedGet = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/scheduled', { method: 'GET' }),
  env, adminActor, 'scheduled'
)).json();
assert.ok(schedGet.due_queue.some(i => i.id === duePost.item.id));
assert.ok(schedGet.upcoming_queue.some(i => i.id === draftForFeat.item.id));

const schedDry = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/scheduled/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: true })
  }),
  env, adminActor, 'scheduled', 'dispatch'
)).json();
assert.equal(schedDry.dry_run, true);
assert.ok(schedDry.would_publish_count >= 1);

const schedLive = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/scheduled/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: false })
  }),
  env, adminActor, 'scheduled', 'dispatch'
)).json();
assert.equal(schedLive.dry_run, false);
assert.ok(schedLive.published.some(p => p.id === duePost.item.id));

const resched = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/scheduled/${draftForFeat.item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unschedule' })
  }),
  env, editorActor, 'scheduled', draftForFeat.item.id
)).json();
assert.equal(resched.item.workflow_stage, 'draft');
assert.equal(resched.item.scheduled_for, null);

// ============================================================================
// 14. Module #12: Content Archive, Restore & PURGE_ARCHIVED Confirmation Guard
// ============================================================================
const archMove = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: duePost.item.id, action: 'archive', archive_reason: 'Exam cycle ended' })
  }),
  env, editorActor, 'archive'
)).json();
assert.equal(archMove.item.workflow_stage, 'archived');
assert.equal(archMove.item.archive_reason, 'Exam cycle ended');

const archList = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/archive?type=all', { method: 'GET' }),
  env, adminActor, 'archive'
)).json();
assert.ok(archList.items.some(i => i.id === duePost.item.id));

await assert.rejects(
  () => handleContentPublishing(
    new Request(`https://csodisha.com/api/admin/content/archive/${duePost.item.id}?confirm=WRONG`, { method: 'DELETE' }),
    env, adminActor, 'archive', duePost.item.id
  ),
  (e) => e.code === 'CONFIRMATION_REQUIRED'
);

const archRestore = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: duePost.item.id, action: 'restore_draft' })
  }),
  env, editorActor, 'archive'
)).json();
assert.equal(archRestore.item.workflow_stage, 'draft');

// Re-archive and test PURGE_ARCHIVED by admin
await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: duePost.item.id, action: 'archive', archive_reason: 'Final purge' })
  }),
  env, adminActor, 'archive'
);
const archPurge = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/archive/${duePost.item.id}?confirm=PURGE_ARCHIVED`, { method: 'DELETE' }),
  env, adminActor, 'archive', duePost.item.id
)).json();
assert.equal(archPurge.purged, true);

// ============================================================================
// 15. Module #13: Content Revisions Diffing & Zero-Loss Rollback
// ============================================================================
const revList = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/revisions?post_id=${wfDraft.item.id}`, { method: 'GET' }),
  env, adminActor, 'revisions'
)).json();
assert.ok(revList.items.length >= 2);
const firstRev = revList.items[revList.items.length - 1];

const diffRes = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/revisions/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision_id: firstRev.id, target_revision_id: 'LIVE_POST' })
  }),
  env, adminActor, 'revisions', 'compare'
)).json();
assert.equal(diffRes.diffs.workflow_stage.left, 'draft');
assert.equal(diffRes.diffs.workflow_stage.right, 'published');
assert.equal(diffRes.diffs.workflow_stage.changed, true);

const restoreRev = await (await handleContentPublishing(
  new Request(`https://csodisha.com/api/admin/content/revisions/${firstRev.id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }),
  env, editorActor, 'revisions', firstRev.id, 'restore'
)).json();
assert.ok(restoreRev.pre_restore_snapshot.id);
assert.equal(restoreRev.item.workflow_stage, 'draft');
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'content.revision.restore'`).first()).n >= 1);

// ============================================================================
// 16. Module #14: Bulk Content Operations Dry-Run, SEO Gate Skipping & BULK_DELETE
// ============================================================================
const bulkDry = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_ids: [draftForFeat.item.id, wfDraft.item.id],
      action: 'publish',
      dry_run: true
    })
  }),
  env, adminActor, 'bulk'
)).json();
assert.equal(bulkDry.dry_run, true);
assert.equal(bulkDry.eligible_count, 1); // wfDraft has SEO meta
assert.equal(bulkDry.blocked_count, 1);  // draftForFeat lacks SEO meta
assert.equal(bulkDry.skipped_reasons[0].reason, 'SEO_META_REQUIRED');

const bulkExec = await (await handleContentPublishing(
  new Request('https://csodisha.com/api/admin/content/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_ids: [draftForFeat.item.id, wfDraft.item.id],
      action: 'publish',
      dry_run: false
    })
  }),
  env, adminActor, 'bulk'
)).json();
assert.equal(bulkExec.dry_run, false);
assert.equal(bulkExec.succeeded_count, 1);
assert.equal(bulkExec.skipped_count, 1);

await assert.rejects(
  () => handleContentPublishing(
    new Request('https://csodisha.com/api/admin/content/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_ids: [draftForFeat.item.id], action: 'delete', dry_run: false, confirm: 'NOPE' })
    }),
    env, adminActor, 'bulk'
  ),
  (e) => e.code === 'CONFIRMATION_REQUIRED'
);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'content.bulk.execute'`).first()).n >= 1);

console.log('CONTENT & PUBLISHING SUITE MODULES #1-#14 TESTS PASSED');
