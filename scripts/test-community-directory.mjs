import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCommunityDirectoryStudioSchema,
  handleCommunityDirectoryStudio,
  handlePublicCommunityOverviewApi,
  handlePublicCommunityItemsApi,
  handlePublicCommunitySuggestApi,
  handleCommunityDirectorySitemapXml,
  COMMUNITY_DOMAINS
} from '../functions/_lib/community-directory-studio.js';
import { handlePublicCommunityRoute } from '../functions/_lib/community-directory-ssr.js';

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

  // 1. Schema idempotency & depth 1->2->3 seeding for #01-#05
  await ensureCommunityDirectoryStudioSchema(env.DB);
  await ensureCommunityDirectoryStudioSchema(env.DB);
  assert.equal(COMMUNITY_DOMAINS.length, 10);

  for (const domain of [
    'local-odisha-communities',
    'students-educators-mentorship',
    'careers-business-networks',
    'agriculture-rural-livelihoods',
    'women-families-inclusion'
  ]) {
    const res = await handleCommunityDirectoryStudio(
      makeReq('GET', `https://csodisha.com/api/admin/community-directory/tree?domain=${domain}`),
      env,
      admin,
      'tree'
    );
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.folders.length >= 7, `${domain} should seed depth 1->2->3 folders`);
    assert.ok(data.folders.some(f => f.depth === 1));
    assert.ok(data.folders.some(f => f.depth === 2));
    assert.ok(data.folders.some(f => f.depth === 3));
    assert.ok(data.items.length >= 1, `${domain} should seed initial verified community`);
  }

  // 2. Nested Sub-Directory CRUD & SEO editing
  const createParent = await handleCommunityDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/community-directory/folders', {
      domain_slug: 'local-odisha-communities',
      name_en: 'Puri & Konark Coastal Chapters',
      title_or: 'ପୁରୀ ଓ କୋଣାର୍କ ମଣ୍ଡଳୀ',
      description_en: 'Coastal civic and heritage volunteer chapters.',
      featured_badge: 'COASTAL'
    }),
    env,
    admin,
    'folders'
  );
  assert.equal(createParent.status, 201);
  const { folder: parentFolder } = await createParent.json();
  assert.equal(parentFolder.depth, 1);

  const createChild = await handleCommunityDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/community-directory/folders', {
      domain_slug: 'local-odisha-communities',
      parent_id: parentFolder.id,
      name_en: 'Puri Youth Library Network'
    }),
    env,
    admin,
    'folders'
  );
  assert.equal(createChild.status, 201);
  const { folder: childFolder } = await createChild.json();
  assert.equal(childFolder.depth, 2);

  const updFolder = await handleCommunityDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/community-directory/folders/${childFolder.id}`, {
      seo_title: 'Puri Youth Library Network | CSOdisha',
      seo_description: 'Verified Puri district youth reading circles.',
      mark_verified: true
    }),
    env,
    admin,
    'folders',
    childFolder.id
  );
  assert.equal(updFolder.status, 200);
  const { folder: updFolderObj } = await updFolder.json();
  assert.equal(updFolderObj.seo_title, 'Puri Youth Library Network | CSOdisha');
  assert.ok(updFolderObj.verified_at);

  // 409 FOLDER_NOT_EMPTY guard
  await assert.rejects(
    () => handleCommunityDirectoryStudio(
      makeReq('DELETE', `https://csodisha.com/api/admin/community-directory/folders/${parentFolder.id}`),
      env,
      admin,
      'folders',
      parentFolder.id
    ),
    err => err.status === 409 && err.code === 'FOLDER_NOT_EMPTY'
  );

  // 3. XSS URL blocking
  await assert.rejects(
    () => handleCommunityDirectoryStudio(
      makeReq('POST', 'https://csodisha.com/api/admin/community-directory/items', {
        domain_slug: 'local-odisha-communities',
        folder_id: childFolder.id,
        title: 'XSS Community Test',
        join_or_portal_url: 'javascript:alert(1)'
      }),
      env,
      admin,
      'items'
    ),
    err => err.status === 400 && err.code === 'INVALID_CTA_URL'
  );

  // 4. Community CRUD, DPDP PII Redaction, Revisions, Safety Verify, Status Toggle
  const createItem = await handleCommunityDirectoryStudio(
    makeReq('POST', 'https://csodisha.com/api/admin/community-directory/items', {
      domain_slug: 'local-odisha-communities',
      folder_id: childFolder.id,
      title: 'Puri Town Free Reading Circle',
      community_type: 'district_chapter',
      district_region: 'Puri & Konark',
      membership_model: 'Open & Free',
      platform_channel: 'In-Person & Local Chapter',
      join_or_portal_url: 'https://csodisha.com/community/',
      tags: ['Puri', 'Reading', 'Civic'],
      summary: 'Weekly reading meetup. Coordinator email lead@example.com or 9876543210.'
    }),
    env,
    admin,
    'items'
  );
  assert.equal(createItem.status, 201);
  const { item: createdItem } = await createItem.json();
  assert.ok(!createdItem.summary.includes('lead@example.com') && !createdItem.summary.includes('9876543210'), 'DPDP PII must be redacted');

  const verRes = await handleCommunityDirectoryStudio(
    makeReq('POST', `https://csodisha.com/api/admin/community-directory/items/${createdItem.id}/verify`, {}),
    env,
    admin,
    'items',
    createdItem.id,
    'verify'
  );
  assert.equal(verRes.status, 200);
  const { item: verItem } = await verRes.json();
  assert.equal(verItem.safety_verified, true);

  const statRes = await handleCommunityDirectoryStudio(
    makeReq('PATCH', `https://csodisha.com/api/admin/community-directory/items/${createdItem.id}/status`, { status: 'published' }),
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

  const updItem = await handleCommunityDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/community-directory/items/${createdItem.id}`, {
      activities_highlights: 'Sunday 8 AM reading & OPSC discussion.',
      change_note: 'Added schedule'
    }),
    env,
    admin,
    'items',
    createdItem.id
  );
  assert.equal(updItem.status, 200);

  const getItem = await handleCommunityDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/community-directory/items/${createdItem.id}`),
    env,
    admin,
    'items',
    createdItem.id
  );
  const getJson = await getItem.json();
  assert.equal(getJson.item.activities_highlights, 'Sunday 8 AM reading & OPSC discussion.');
  assert.ok(getJson.revisions.length >= 2);

  // 5. Legacy bridge idempotency test
  const legEnv = { DB: createMockDb() };
  await legEnv.DB.prepare(`CREATE TABLE community_directory_nodes (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, parent_slug TEXT, level TEXT NOT NULL,
    title TEXT NOT NULL, title_or TEXT NOT NULL DEFAULT '', subtitle TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'published'
  )`).run();
  await legEnv.DB.prepare(`INSERT INTO community_directory_nodes (id, slug, parent_slug, level, title) VALUES
    ('cn0', 'grp-youth', NULL, 'group', 'Youth, NGOs & Volunteering'),
    ('cn1', 'sec-nss', 'grp-youth', 'section', 'NSS & NYKS Chapters')
  `).run();
  await ensureCommunityDirectoryStudioSchema(legEnv.DB);
  await ensureCommunityDirectoryStudioSchema(legEnv.DB);
  const bridged = await legEnv.DB.prepare('SELECT COUNT(*) AS cnt FROM community_directory_folders WHERE legacy_node_id IS NOT NULL').first();
  assert.equal(bridged.cnt, 1);

  // 6. Public Overview, Paginated Items, SSR Routes, DPDP Suggest & Sitemap (v63)
  assert.equal(COMMUNITY_DOMAINS.length, 10);
  const ovRes = await handlePublicCommunityOverviewApi(
    new Request('https://csodisha.com/api/public/community-directory/overview'),
    env
  );
  assert.equal(ovRes.status, 200);
  const ovJson = await ovRes.json();
  assert.equal(ovJson.domains.length, 10);
  assert.ok(ovJson.totals.totalFolders >= 20);
  assert.ok(ovJson.totals.totalPublished >= 5);

  const itemsPageRes = await handlePublicCommunityItemsApi(
    new Request('https://csodisha.com/api/public/community-directory/items?page=1&limit=4'),
    env
  );
  assert.equal(itemsPageRes.status, 200);
  const itemsPageJson = await itemsPageRes.json();
  assert.ok(Array.isArray(itemsPageJson.items));
  assert.ok(itemsPageJson.items.length >= 1 && itemsPageJson.items.length <= 4);
  assert.equal(itemsPageJson.page, 1);
  assert.ok(itemsPageJson.totalPages >= 1);

  const firstItem = itemsPageJson.items[0];
  const ssrDirRes = await handlePublicCommunityRoute(
    new Request(`https://csodisha.com/community/${firstItem.domain_slug}/`),
    env,
    `/community/${firstItem.domain_slug}/`
  );
  assert.equal(ssrDirRes.status, 200);
  const ssrDirHtml = await ssrDirRes.text();
  assert.ok(ssrDirHtml.includes('application/ld+json'));
  assert.ok(!/style\s*=/i.test(ssrDirHtml), 'SSR directory must have zero style= attributes');

  const ssrItemRes = await handlePublicCommunityRoute(
    new Request(`https://csodisha.com/community/item/${firstItem.slug}/`),
    env,
    `/community/item/${firstItem.slug}/`
  );
  assert.equal(ssrItemRes.status, 200);
  const ssrItemHtml = await ssrItemRes.text();
  assert.ok(ssrItemHtml.includes(firstItem.title));
  assert.ok(!/style\s*=/i.test(ssrItemHtml), 'SSR item page must have zero style= attributes');

  const ssr404Res = await handlePublicCommunityRoute(
    new Request('https://csodisha.com/community/item/nonexistent-community-xyz/'),
    env,
    '/community/item/nonexistent-community-xyz/'
  );
  assert.equal(ssr404Res.status, 404);

  const suggestRes = await handlePublicCommunitySuggestApi(
    new Request('https://csodisha.com/api/public/community-directory/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain_slug: 'youth-ngos-volunteering',
        suggestion_type: 'new_community',
        reporter_name: 'Asha',
        message: 'Cuttack Youth Eco Volunteers: contact lead@example.org or 9876543210 for weekend plantation.',
        suggested_url: 'https://example.org/eco'
      })
    }),
    env
  );
  assert.equal(suggestRes.status, 201);
  const suggestJson = await suggestRes.json();
  assert.ok(suggestJson.id);
  const savedSuggest = await env.DB.prepare('SELECT message FROM community_directory_suggestions WHERE id = ?').bind(suggestJson.id).first();
  assert.ok(!savedSuggest.message.includes('lead@example.org'), 'Email must be DPDP redacted');
  assert.ok(!savedSuggest.message.includes('9876543210'), 'Phone must be DPDP redacted');

  const sitemapRes = await handleCommunityDirectorySitemapXml(
    new Request('https://csodisha.com/sitemap-community.xml'),
    env
  );
  assert.equal(sitemapRes.status, 200);
  const sitemapXml = await sitemapRes.text();
  assert.ok(sitemapXml.includes('<urlset'));
  assert.ok(sitemapXml.includes('https://csodisha.com/community/'));
  assert.ok(sitemapXml.includes(`/community/item/${firstItem.slug}/`));

  // 7. Cleanup
  assert.equal((await handleCommunityDirectoryStudio(makeReq('DELETE', `https://csodisha.com/api/admin/community-directory/items/${createdItem.id}`), env, admin, 'items', createdItem.id)).status, 200);
  assert.equal((await handleCommunityDirectoryStudio(makeReq('DELETE', `https://csodisha.com/api/admin/community-directory/folders/${childFolder.id}`), env, admin, 'folders', childFolder.id)).status, 200);
  assert.equal((await handleCommunityDirectoryStudio(makeReq('DELETE', `https://csodisha.com/api/admin/community-directory/folders/${parentFolder.id}`), env, admin, 'folders', parentFolder.id)).status, 200);

  console.log('ALL COMMUNITY DIRECTORY STUDIO TESTS PASSED');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
