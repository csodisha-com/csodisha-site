import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureSchemesDirectoryStudioSchema,
  handleSchemesDirectoryStudio,
  SCHEMES_DOMAINS
} from '../functions/_lib/schemes-directory-studio.js';

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
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const info = db.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  return {
    prepare(sql) {
      return {
        bind(...args) { return wrapStmt(sql, args); },
        ...wrapStmt(sql, [])
      };
    },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
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
  await ensureSchemesDirectoryStudioSchema(env.DB);
  await ensureSchemesDirectoryStudioSchema(env.DB);
  assert.equal(SCHEMES_DOMAINS.length, 8);

  for (const domain of ['govt-public-welfare', 'education-employment', 'agriculture-livelihoods', 'health-housing-protection']) {
    const res = await handleSchemesDirectoryStudio(
      makeReq('GET', `https://csodisha.com/api/admin/schemes-directory/tree?domain=${domain}`),
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
    assert.ok(data.items.length >= 1, `${domain} should seed initial verified scheme`);
  }

  // 2. Nested Sub-Directory CRUD & SEO editing
  const createParent = await handleSchemesDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/schemes-directory/folders', {
      domain_slug: 'govt-public-welfare',
      name_en: 'Odisha Disaster & Relief Aid',
      title_or: 'ଓଡ଼ିଶା ବିପର୍ଯ୍ୟୟ ସହାୟତା',
      description_en: 'Cyclone and flood relief welfare grants.',
      featured_badge: 'RELIEF'
    }),
    env,
    admin,
    'folders'
  );
  assert.equal(createParent.status, 201);
  const { folder: parentFolder } = await createParent.json();
  assert.equal(parentFolder.depth, 1);

  const createChild = await handleSchemesDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/schemes-directory/folders', {
      domain_slug: 'govt-public-welfare',
      parent_id: parentFolder.id,
      name_en: 'Coastal District Cyclone Housing Aid'
    }),
    env,
    admin,
    'folders'
  );
  assert.equal(createChild.status, 201);
  const { folder: childFolder } = await createChild.json();
  assert.equal(childFolder.depth, 2);

  // Folder SEO update
  const updFolder = await handleSchemesDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/schemes-directory/folders/${childFolder.id}`, {
      seo_title: 'Coastal Cyclone Housing Aid | CSOdisha',
      seo_description: 'Official Odisha disaster relief housing support.',
      mark_verified: true
    }),
    env,
    admin,
    'folders',
    childFolder.id
  );
  assert.equal(updFolder.status, 200);
  const { folder: updFolderObj } = await updFolder.json();
  assert.equal(updFolderObj.seo_title, 'Coastal Cyclone Housing Aid | CSOdisha');
  assert.ok(updFolderObj.verified_at);

  // 409 FOLDER_NOT_EMPTY guard
  await assert.rejects(
    () => handleSchemesDirectoryStudio(
      makeReq('DELETE', `https://csodisha.com/api/admin/schemes-directory/folders/${parentFolder.id}`),
      env,
      admin,
      'folders',
      parentFolder.id
    ),
    err => err.status === 409 && err.code === 'FOLDER_NOT_EMPTY'
  );

  // 3. XSS URL blocking
  await assert.rejects(
    () => handleSchemesDirectoryStudio(
      makeReq('POST', 'https://csodisha.com/api/admin/schemes-directory/items', {
        domain_slug: 'govt-public-welfare',
        folder_id: childFolder.id,
        title: 'XSS Scheme Test',
        official_apply_url: 'javascript:alert(1)'
      }),
      env,
      admin,
      'items'
    ),
    err => err.status === 400 && err.code === 'INVALID_CTA_URL'
  );

  // 4. Scheme CRUD, Revisions, Verify, Status Toggle
  const createItem = await handleSchemesDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/schemes-directory/items', {
      domain_slug: 'govt-public-welfare',
      folder_id: childFolder.id,
      title: 'Biju Pucca Ghar Special Relief Variant',
      scheme_type: 'state_scheme',
      sponsor_level: 'Odisha State',
      department_name: 'PR & DW Dept Odisha',
      beneficiary_group: 'Affected Rural Households',
      benefit_amount: 'Rs 1,30,000',
      application_mode: 'Offline / Block Office',
      official_apply_url: 'https://rhodisha.gov.in/',
      tags: ['Housing', 'Relief', 'Odisha State'],
      summary: 'Special housing relief for disaster-affected families.'
    }),
    env,
    admin,
    'items'
  );
  assert.equal(createItem.status, 201);
  const { item: createdItem } = await createItem.json();

  const verRes = await handleSchemesDirectoryStudio(
    makeReq('POST', `https://csodisha.com/api/admin/schemes-directory/items/${createdItem.id}/verify`, {}),
    env,
    admin,
    'items',
    createdItem.id,
    'verify'
  );
  assert.equal(verRes.status, 200);
  const { item: verItem } = await verRes.json();
  assert.equal(verItem.official_portal_verified, true);

  const statRes = await handleSchemesDirectoryStudio(
    makeReq('PATCH', `https://csodisha.com/api/admin/schemes-directory/items/${createdItem.id}/status`, { status: 'published' }),
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

  const updItem = await handleSchemesDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/schemes-directory/items/${createdItem.id}`, {
      benefit_amount: 'Rs 1,50,000',
      change_note: 'Revised grant amount'
    }),
    env,
    admin,
    'items',
    createdItem.id
  );
  assert.equal(updItem.status, 200);

  const getItem = await handleSchemesDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/schemes-directory/items/${createdItem.id}`),
    env,
    admin,
    'items',
    createdItem.id
  );
  const getJson = await getItem.json();
  assert.equal(getJson.item.benefit_amount, 'Rs 1,50,000');
  assert.ok(getJson.revisions.length >= 2);

  // 5. Cleanup
  assert.equal((await handleSchemesDirectoryStudio(makeReq('DELETE', `https://csodisha.com/api/admin/schemes-directory/items/${createdItem.id}`), env, admin, 'items', createdItem.id)).status, 200);
  assert.equal((await handleSchemesDirectoryStudio(makeReq('DELETE', `https://csodisha.com/api/admin/schemes-directory/folders/${childFolder.id}`), env, admin, 'folders', childFolder.id)).status, 200);
  assert.equal((await handleSchemesDirectoryStudio(makeReq('DELETE', `https://csodisha.com/api/admin/schemes-directory/folders/${parentFolder.id}`), env, admin, 'folders', parentFolder.id)).status, 200);

  console.log('ALL SCHEMES DIRECTORY STUDIO TESTS PASSED');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
