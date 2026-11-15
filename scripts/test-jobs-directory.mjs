import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureJobsDirectoryStudioSchema,
  handleJobsDirectoryStudio,
  JOBS_DOMAINS
} from '../functions/_lib/jobs-directory-studio.js';

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
  function wrapStmt(sql, args = []) {
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
  }
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return wrapStmt(sql, args);
        },
        ...wrapStmt(sql, [])
      };
    },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) {
        out.push(await s.run());
      }
      return out;
    }
  };
}

function makeReq(method, url, body) {
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
}

async function main() {
  const env = { DB: createMockDb() };
  const admin = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };

  // 1. Schema idempotency & depth 1->2->3 seeding for #01-#04
  await ensureJobsDirectoryStudioSchema(env.DB);
  await ensureJobsDirectoryStudioSchema(env.DB);
  assert.equal(JOBS_DOMAINS.length, 8);

  for (const domain of ['jobs-recruitment', 'career-explorer', 'eligibility-explorer', 'courses-exams']) {
    const res = await handleJobsDirectoryStudio(
      makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/tree?domain=${domain}`),
      env,
      admin,
      'tree'
    );
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.folders.length >= 6, `${domain} should seed depth 1->2->3 folders`);
    assert.ok(data.folders.some(f => f.depth === 1));
    assert.ok(data.folders.some(f => f.depth === 2));
    assert.ok(data.folders.some(f => f.depth === 3));
    assert.ok(data.items.length >= 1, `${domain} should seed initial verified item`);
  }

  // 2. Nested Sub-Directory CRUD & SEO editing
  const createParentRes = await handleJobsDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/jobs-directory/folders', {
      domain_slug: 'jobs-recruitment',
      title: 'Odisha District Collectorate Drives',
      description: 'District-level contractual and regular recruitments.',
      hero_badge: 'DISTRICT'
    }),
    env,
    admin,
    'folders'
  );
  assert.equal(createParentRes.status, 201);
  const { folder: parentFolder } = await createParentRes.json();
  assert.equal(parentFolder.depth, 1);

  const createChildRes = await handleJobsDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/jobs-directory/folders', {
      domain_slug: 'jobs-recruitment',
      parent_id: parentFolder.id,
      title: 'Cuttack & Khordha Collectorate'
    }),
    env,
    admin,
    'folders'
  );
  assert.equal(createChildRes.status, 201);
  const { folder: childFolder } = await createChildRes.json();
  assert.equal(childFolder.depth, 2);

  // SEO update
  const updFolderRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/folders/${childFolder.id}`, {
      seo_title: 'Cuttack & Khordha Govt Jobs | CSOdisha',
      seo_description: 'Official district collectorate notifications.'
    }),
    env,
    admin,
    'folders',
    childFolder.id
  );
  assert.equal(updFolderRes.status, 200);
  const { folder: updFolder } = await updFolderRes.json();
  assert.equal(updFolder.seo_title, 'Cuttack & Khordha Govt Jobs | CSOdisha');

  // 409 FOLDER_NOT_EMPTY guard on parentFolder
  await assert.rejects(
    () => handleJobsDirectoryStudio(
      makeReq('DELETE', `https://csodisha.com/api/admin/jobs-directory/folders/${parentFolder.id}`),
      env,
      admin,
      'folders',
      parentFolder.id
    ),
    err => err.status === 409 && err.code === 'FOLDER_NOT_EMPTY'
  );

  // 3. XSS URL blocking (javascript: / data:)
  await assert.rejects(
    () => handleJobsDirectoryStudio(
      makeReq('POST', 'https://csodisha.com/api/admin/jobs-directory/items', {
        domain_slug: 'jobs-recruitment',
        folder_id: childFolder.id,
        title: 'Bad Link Test',
        official_apply_url: 'javascript:alert(1)'
      }),
      env,
      admin,
      'items'
    ),
    err => err.status === 400 && err.code === 'INVALID_CTA_URL'
  );

  // 4. Opportunity CRUD, Revisions, Verify, Status Toggle (with previous_status)
  const createItemRes = await handleJobsDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/jobs-directory/items', {
      domain_slug: 'jobs-recruitment',
      folder_id: childFolder.id,
      title: 'Khordha District Junior Clerk Recruitment 2026',
      item_type: 'job-notification',
      recruiting_body: 'Collector & DM, Khordha',
      qualification_tag: '12th Pass + Computer',
      vacancies: '28 Posts',
      deadline_date: '2026-12-20',
      official_apply_url: 'https://khordha.odisha.gov.in/',
      tags: ['Khordha', 'Clerk', '12th Pass'],
      summary: 'Official Khordha collectorate junior clerk notification.'
    }),
    env,
    admin,
    'items'
  );
  assert.equal(createItemRes.status, 201);
  const { item: createdItem } = await createItemRes.json();
  assert.equal(createdItem.status, 'draft');

  // Verify item
  const verRes = await handleJobsDirectoryStudio(
    makeReq('POST', `https://csodisha.com/api/admin/jobs-directory/items/${createdItem.id}/verify`, {}),
    env,
    admin,
    'items',
    createdItem.id,
    'verify'
  );
  assert.equal(verRes.status, 200);
  const { item: verifiedItem } = await verRes.json();
  assert.equal(verifiedItem.verified_by, admin.email);

  // Status toggle -> published (returns previous_status for 5s Undo)
  const statRes = await handleJobsDirectoryStudio(
    makeReq('PATCH', `https://csodisha.com/api/admin/jobs-directory/items/${createdItem.id}/status`, { status: 'published' }),
    env,
    admin,
    'items',
    createdItem.id,
    'status'
  );
  assert.equal(statRes.status, 200);
  const statJson = await statRes.json();
  assert.equal(statJson.previous_status, 'draft');
  assert.equal(statJson.item.status, 'published');

  // Update item -> creates revision #2
  const updItemRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${createdItem.id}`, {
      vacancies: '32 Posts',
      change_note: 'Updated vacancy count'
    }),
    env,
    admin,
    'items',
    createdItem.id
  );
  assert.equal(updItemRes.status, 200);

  const getItemRes = await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${createdItem.id}`),
    env,
    admin,
    'items',
    createdItem.id
  );
  const getItemJson = await getItemRes.json();
  assert.equal(getItemJson.item.vacancies, '32 Posts');
  assert.ok(getItemJson.revisions.length >= 2);

  // 5. Citizen Suggestions + DPDP Act 2023 PII redaction
  const sugPost = await handleJobsDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/jobs-directory/suggestions', {
      domain_slug: 'jobs-recruitment',
      reporter_name: 'Ramesh 9876543210',
      category: 'broken-link',
      message: 'Please update deadline; contact ramesh@example.com or Aadhaar 1234 5678 9012'
    }),
    env,
    admin,
    'suggestions'
  );
  assert.equal(sugPost.status, 201);
  const { suggestion } = await sugPost.json();
  assert.ok(!suggestion.message.includes('ramesh@example.com'));
  assert.ok(!suggestion.message.includes('1234 5678 9012'));
  assert.ok(suggestion.message.includes('[REDACTED-EMAIL]'));
  assert.ok(suggestion.message.includes('[REDACTED-AADHAAR]'));

  const sugPatch = await handleJobsDirectoryStudio(
    makeReq('PATCH', `https://csodisha.com/api/admin/jobs-directory/suggestions/${suggestion.id}`, {
      status: 'resolved',
      moderator_note: 'Fixed'
    }),
    env,
    admin,
    'suggestions',
    suggestion.id
  );
  assert.equal(sugPatch.status, 200);

  // 6. Delete item, then delete empty child and parent folders
  const delItem = await handleJobsDirectoryStudio(
    makeReq('DELETE', `https://csodisha.com/api/admin/jobs-directory/items/${createdItem.id}`),
    env,
    admin,
    'items',
    createdItem.id
  );
  assert.equal(delItem.status, 200);

  const delChild = await handleJobsDirectoryStudio(
    makeReq('DELETE', `https://csodisha.com/api/admin/jobs-directory/folders/${childFolder.id}`),
    env,
    admin,
    'folders',
    childFolder.id
  );
  assert.equal(delChild.status, 200);

  const delParent = await handleJobsDirectoryStudio(
    makeReq('DELETE', `https://csodisha.com/api/admin/jobs-directory/folders/${parentFolder.id}`),
    env,
    admin,
    'folders',
    parentFolder.id
  );
  assert.equal(delParent.status, 200);

  console.log('ALL JOBS DIRECTORY STUDIO TESTS PASSED');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
