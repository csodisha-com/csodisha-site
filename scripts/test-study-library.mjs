import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureStudyLibraryStudioSchema,
  handleStudyLibraryStudio
} from '../functions/_lib/study-library-studio.js';
import { handlePublicStudyLibraryRoute } from '../functions/_lib/study-library-ssr.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              return db.prepare(sql).get(...args) || null;
            },
            async all() {
              return { results: db.prepare(sql).all(...args) };
            },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() {
          return db.prepare(sql).get() || null;
        },
        async all() {
          return { results: db.prepare(sql).all() };
        },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const adminActor = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };
const editorActor = { userId: 'u_editor', email: 'editor@csodisha.com', role: 'editor' };
const viewerActor = { userId: 'u_viewer', email: 'viewer@csodisha.com', role: 'reviewer' };

// 1. Idempotent Schema & Seed Tree Verification across Modules #1-#4
await ensureStudyLibraryStudioSchema(env.DB);
await ensureStudyLibraryStudioSchema(env.DB);

for (const domain of [
  'early-childhood',
  'school-higher-sec',
  'ug-pg-research',
  'competitive-teacher',
  'vocational-digital',
  'subjects-materials',
  'international-inclusive',
  'life-skills-culture',
  'libraries-support',
  'odisha-study-hub'
]) {
  const tree = await (await handleStudyLibraryStudio(
    new Request(`https://csodisha.com/api/admin/study-library/tree?domain=${domain}`, { method: 'GET' }),
    env, adminActor, 'tree'
  )).json();
  assert.equal(tree.ok, true);
  assert.ok(tree.metrics.total_folders >= 4, `Expected seeded folders for ${domain}`);
}

// 2. Recursive Multi-Level Folder Creation (depth 1 -> depth 2 -> depth 3)
const d1 = await (await handleStudyLibraryStudio(
  new Request('https://csodisha.com/api/admin/study-library/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain_slug: 'competitive-teacher', name: 'OAS Test Series' })
  }),
  env, editorActor, 'folders'
)).json();
assert.equal(d1.folder.depth, 1);

const d2 = await (await handleStudyLibraryStudio(
  new Request('https://csodisha.com/api/admin/study-library/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain_slug: 'competitive-teacher', parent_id: d1.folder.id, name: 'GS Paper 1' })
  }),
  env, editorActor, 'folders'
)).json();
assert.equal(d2.folder.depth, 2);

const d3 = await (await handleStudyLibraryStudio(
  new Request('https://csodisha.com/api/admin/study-library/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain_slug: 'competitive-teacher', parent_id: d2.folder.id, name: 'Kalinga History' })
  }),
  env, editorActor, 'folders'
)).json();
assert.equal(d3.folder.depth, 3);

// 3. Create Study Resource in depth-3 folder with R2 PDF, Cover Image & Links
const itemRes = await (await handleStudyLibraryStudio(
  new Request('https://csodisha.com/api/admin/study-library/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain_slug: 'competitive-teacher',
      folder_id: d3.folder.id,
      title: 'Kharavela & Hathigumpha Inscription Notes',
      resource_type: 'notes',
      board_or_exam: 'OPSC OAS',
      subject_tag: 'Odisha History',
      language_parity: 'EN+OR',
      pdf_url: '/media/content/2026/11/1700000-kharavela.pdf',
      pdf_size_bytes: 204800,
      cover_image_url: '/media/content/2026/11/1700000-cover.png',
      links: [{ label: 'OPSC Syllabus', url: 'https://www.opsc.gov.in/' }],
      tags: ['opsc', 'odisha-history'],
      seo_title: 'Kharavela & Hathigumpha Notes for OPSC OAS',
      seo_description: 'Bilingual OPSC OAS Prelims & Mains notes on Kharavela and Hathigumpha Inscription.'
    })
  }),
  env, adminActor, 'items'
)).json();
assert.equal(itemRes.ok, true);
assert.equal(itemRes.item.folder_path, 'OAS Test Series › GS Paper 1 › Kalinga History');
assert.equal(itemRes.item.pdf_url, '/media/content/2026/11/1700000-kharavela.pdf');
assert.equal(itemRes.item.links.length, 1);

// 4. Descendant Resource Filtering (include_descendants=1 vs 0)
const descYes = await (await handleStudyLibraryStudio(
  new Request(`https://csodisha.com/api/admin/study-library/items?domain=competitive-teacher&folder_id=${d1.folder.id}&include_descendants=1`, { method: 'GET' }),
  env, adminActor, 'items'
)).json();
assert.equal(descYes.items.length, 1);

const descNo = await (await handleStudyLibraryStudio(
  new Request(`https://csodisha.com/api/admin/study-library/items?domain=competitive-teacher&folder_id=${d1.folder.id}&include_descendants=0`, { method: 'GET' }),
  env, adminActor, 'items'
)).json();
assert.equal(descNo.items.length, 0);

// 5. XSS URL Blocking & Revision Snapshotting
await assert.rejects(
  () => handleStudyLibraryStudio(
    new Request('https://csodisha.com/api/admin/study-library/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain_slug: 'early-childhood',
        title: 'XSS Probe',
        links: [{ label: 'Bad', url: 'javascript:alert(1)' }]
      })
    }),
    env, adminActor, 'items'
  ),
  (e) => e.code === 'INVALID_CTA_URL'
);

const updRes = await (await handleStudyLibraryStudio(
  new Request(`https://csodisha.com/api/admin/study-library/items/${itemRes.item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Kharavela & Hathigumpha Inscription Master Notes', status: 'published' })
  }),
  env, adminActor, 'items', itemRes.item.id
)).json();
assert.equal(updRes.revision.version_no, 1);
assert.equal(updRes.item.status, 'published');

// 6. 409 FOLDER_NOT_EMPTY & Reassign Delete + RBAC check
await assert.rejects(
  () => handleStudyLibraryStudio(
    new Request(`https://csodisha.com/api/admin/study-library/folders/${d3.folder.id}`, { method: 'DELETE' }),
    env, adminActor, 'folders', d3.folder.id
  ),
  (e) => e.code === 'FOLDER_NOT_EMPTY' && e.status === 409
);

const delReassign = await (await handleStudyLibraryStudio(
  new Request(`https://csodisha.com/api/admin/study-library/folders/${d3.folder.id}?reassign_to=${d2.folder.id}`, { method: 'DELETE' }),
  env, adminActor, 'folders', d3.folder.id
)).json();
assert.equal(delReassign.ok, true);

await assert.rejects(
  () => handleStudyLibraryStudio(
    new Request('https://csodisha.com/api/admin/study-library/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_slug: 'early-childhood', name: 'Denied' })
    }),
    env, viewerActor, 'folders'
  ),
  (e) => e.code === 'FORBIDDEN' && e.status === 403
);

assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'study.folder.save'`).first()).n >= 3);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'study.item.create'`).first()).n >= 1);

// 7. Modules #5-#7: Nested Sub-Directory Creation & Resource CRUD
for (const [dom, subName, itemTitle, tags] of [
  ['vocational-digital', 'Prompt Engineering Lab', 'OS-CIT & AI Prompt Handbook', ['OS-CIT', 'AI Literacy']],
  ['subjects-materials', 'Odia Chhanda & Alankara', 'Odia Byakarana Master Guide', ['Odia Sahitya', 'STEM']],
  ['international-inclusive', 'DAISY Audio Books', 'CWSN Assistive Pedagogy Kit', ['Inclusive', 'MLE Odisha']],
  ['life-skills-culture', 'Pattachitra & Palm Leaf', 'Jagannath Culture & Heritage Guide', ['Odisha Heritage', 'Wellness']],
  ['libraries-support', 'State Central Library Catalog', 'NDLI & Odisha Library Access Manual', ['Odisha Libraries', 'NDLI']],
  ['odisha-study-hub', 'Kalahandi & Nuapada Hub', 'Odisha 30-District Master Study Index', ['30 Districts', 'Odisha Yearbook']]
]) {
  const domTree = await (await handleStudyLibraryStudio(
    new Request(`https://csodisha.com/api/admin/study-library/tree?domain=${dom}`, { method: 'GET' }),
    env, adminActor, 'tree'
  )).json();
  assert.ok(domTree.metrics.max_depth >= 3, `Expected depth >= 3 seed tree for ${dom}`);
  const rootId = domTree.children[0].id;
  const nested = await (await handleStudyLibraryStudio(
    new Request('https://csodisha.com/api/admin/study-library/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_slug: dom, parent_id: rootId, name: subName })
    }),
    env, editorActor, 'folders'
  )).json();
  assert.equal(nested.folder.depth, 2);

  const created = await (await handleStudyLibraryStudio(
    new Request('https://csodisha.com/api/admin/study-library/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain_slug: dom,
        folder_id: nested.folder.id,
        title: itemTitle,
        resource_type: 'guide',
        language_parity: 'EN+OR',
        tags
      })
    }),
    env, adminActor, 'items'
  )).json();
  assert.equal(created.ok, true);
  assert.equal(created.item.domain_slug, dom);
  assert.equal(created.item.tags.length, 2);
}

const hubItems = await (await handleStudyLibraryStudio(
  new Request('https://csodisha.com/api/admin/study-library/items?domain=odisha-study-hub', { method: 'GET' }),
  env, adminActor, 'items'
)).json();
assert.ok(hubItems.kpis.cross_domain_total_items >= 7);

// 8. Bridge 1,681-Node Public Taxonomy (study_library_nodes + resources) & SSR Clean-URL Directory Pages
const bridgeDb = new DatabaseSync(':memory:');
bridgeDb.exec(`
  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata_json TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE study_library_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    level TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_or TEXT,
    description TEXT,
    icon_name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    summary TEXT,
    body_html TEXT,
    pdf_url TEXT,
    source_url TEXT,
    is_featured INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO study_library_nodes (id, parent_id, level, slug, title, title_or, description, sort_order, status) VALUES
    (1, NULL, 'group', 'competitive-exams-teacher-education', 'Competitive Exams & Teacher Education', 'ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା', 'Odisha & National Exams', 4, 'published'),
    (2, 1, 'section', 'opsc-odisha-civil-services', 'OPSC & Odisha Civil Services', 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସ୍', 'OPSC OAS/OCS syllabus & PYQs', 1, 'published'),
    (3, 2, 'subcategory', 'prelims-general-studies', 'Prelims General Studies', 'ପ୍ରିଲିମ୍ସ ସାଧାରଣ ଅଧ୍ୟୟନ', 'GS Paper 1 & CSAT', 1, 'published'),
    (4, 3, 'entry', 'odisha-history-culture', 'Odisha History & Culture', 'ଓଡ଼ିଶା ଇତିହାସ ଓ ସଂସ୍କୃତି', 'Kalinga, Gajapati & Freedom Movement notes', 1, 'published'),
    (5, 3, 'entry', 'hidden-draft-topic', 'Hidden Draft Topic', '', 'Should not appear publicly', 2, 'draft');
  INSERT INTO resources (id, title, slug, category, exam_type, language, summary, body_html, status) VALUES
    (10, 'Odisha History Master Notes', 'odisha-history-master-notes', 'Notes', 'OPSC', 'en', 'Complete Kalinga to 1947 notes', '<p>Kalinga &amp; Utkal Sammilani summary.</p>', 'published'),
    (11, 'Unpublished Draft Paper', 'unpublished-draft-paper', 'PYQ', 'OPSC', 'en', 'Draft only', '<p>Draft</p>', 'draft');
`);
const bridgeEnv = {
  DB: {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return bridgeDb.prepare(sql).get(...args) || null; },
            async all() { return { results: bridgeDb.prepare(sql).all(...args) }; },
            async run() {
              const info = bridgeDb.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return bridgeDb.prepare(sql).get() || null; },
        async all() { return { results: bridgeDb.prepare(sql).all() }; },
        async run() {
          const info = bridgeDb.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  }
};

await ensureStudyLibraryStudioSchema(bridgeEnv.DB);
await ensureStudyLibraryStudioSchema(bridgeEnv.DB);

// Verify bridged track group & 4-level SSR directory pages
const trackRes = await handlePublicStudyLibraryRoute(
  new Request('https://csodisha.com/study-library/competitive-exams-teacher-education/'),
  bridgeEnv,
  new URL('https://csodisha.com/study-library/competitive-exams-teacher-education/')
);
assert.equal(trackRes.status, 200);
const trackHtml = await trackRes.text();
assert.ok(trackHtml.includes('Competitive Exams &amp; Teacher Education'));
assert.ok(trackHtml.includes('OPSC &amp; Odisha Civil Services'));
assert.ok(!/style\s*=|<style\b/i.test(trackHtml), 'SSR track page must have zero inline styles');

const deepRes = await handlePublicStudyLibraryRoute(
  new Request('https://csodisha.com/study-library/competitive-exams-teacher-education/opsc-odisha-civil-services/prelims-general-studies/odisha-history-culture/'),
  bridgeEnv,
  new URL('https://csodisha.com/study-library/competitive-exams-teacher-education/opsc-odisha-civil-services/prelims-general-studies/odisha-history-culture/')
);
assert.equal(deepRes.status, 200);
const deepHtml = await deepRes.text();
assert.ok(deepHtml.includes('Odisha History &amp; Culture'));
assert.ok(deepHtml.includes('BreadcrumbList'));
assert.ok(!/style\s*=|<style\b/i.test(deepHtml), 'SSR deep topic page must have zero inline styles');

// Draft folder must return 404
const draftNodeRes = await handlePublicStudyLibraryRoute(
  new Request('https://csodisha.com/study-library/competitive-exams-teacher-education/opsc-odisha-civil-services/prelims-general-studies/hidden-draft-topic/'),
  bridgeEnv,
  new URL('https://csodisha.com/study-library/competitive-exams-teacher-education/opsc-odisha-civil-services/prelims-general-studies/hidden-draft-topic/')
);
assert.equal(draftNodeRes.status, 404);

// Published resource reader page must return 200, draft resource must return 404
const ssrItemRes = await handlePublicStudyLibraryRoute(
  new Request('https://csodisha.com/study-library/item/odisha-history-master-notes/'),
  bridgeEnv,
  new URL('https://csodisha.com/study-library/item/odisha-history-master-notes/')
);
assert.equal(ssrItemRes.status, 200);
const itemHtml = await ssrItemRes.text();
assert.ok(itemHtml.includes('Odisha History Master Notes'));
assert.ok(itemHtml.includes('LearningResource'));
assert.ok(!/style\s*=|<style\b/i.test(itemHtml), 'SSR item reader page must have zero inline styles');

const draftItemRes = await handlePublicStudyLibraryRoute(
  new Request('https://csodisha.com/study-library/item/unpublished-draft-paper/'),
  bridgeEnv,
  new URL('https://csodisha.com/study-library/item/unpublished-draft-paper/')
);
assert.equal(draftItemRes.status, 404);

console.log('STUDY LIBRARY DIRECTORY MODULES #1-#10 + SSR TESTS PASSED');
