import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureJobsDirectoryStudioSchema,
  enrichJobsRecruitmentCategory01,
  enrichCareerExplorerCategory02,
  enrichEligibilityExplorerCategory03,
  handleJobsDirectoryStudio,
  handlePublicJobsOverviewApi,
  handlePublicJobsItemsApi,
  handlePublicJobsSuggestApi,
  handleJobsDirectorySitemapXml,
  JOBS_DOMAINS
} from '../functions/_lib/jobs-directory-studio.js';
import { handlePublicJobsRoute } from '../functions/_lib/jobs-directory-ssr.js';

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

  // 7. Verify all 8 domains (#01-#08) + career-development alias
  for (const d of [...JOBS_DOMAINS, 'career-development']) {
    const res = await handleJobsDirectoryStudio(
      makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/tree?domain=${d}`),
      env,
      admin,
      'tree'
    );
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.folders.length >= 6, `${d} should have depth 1->2->3 folders`);
    assert.ok(data.items.length >= 1, `${d} should have at least 1 published item`);
    assert.equal(data.crossDomainStats.totalDomains, 8);
  }

  // 8. Public APIs: overview, items, suggest (with DPDP PII redaction)
  const ovRes = await handlePublicJobsOverviewApi(makeReq('GET', 'https://csodisha.com/api/public/jobs-directory/overview'), env);
  assert.equal(ovRes.status, 200);
  const ovJson = await ovRes.json();
  assert.equal(ovJson.domains.length, 8);
  assert.ok(ovJson.totals.totalPublished >= 8);

  const pubItemsRes = await handlePublicJobsItemsApi(makeReq('GET', 'https://csodisha.com/api/public/jobs-directory/items?q=Scholarship'), env);
  assert.equal(pubItemsRes.status, 200);
  const pubItemsJson = await pubItemsRes.json();
  assert.ok(pubItemsJson.items.some(i => i.slug === 'odisha-state-scholarship-portal-guide'));

  const pubSugRes = await handlePublicJobsSuggestApi(
    makeReq('POST', 'https://csodisha.com/api/public/jobs-directory/suggest', {
      domain_slug: 'scholarships-support',
      category: 'outdated-link',
      message: 'Check portal link; my phone 9876543210'
    }),
    env
  );
  assert.equal(pubSugRes.status, 201);

  // 9. SSR directory & item reader pages (200 for published, 404 for missing/draft)
  const dirOk = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/scholarships-support/odisha-state-scholarships/'),
    env,
    new URL('https://csodisha.com/jobs/scholarships-support/odisha-state-scholarships/')
  );
  assert.equal(dirOk.status, 200);
  const dirHtml = await dirOk.text();
  assert.ok(dirHtml.includes('Odisha State Scholarships'));
  assert.ok(!dirHtml.includes('style='));

  const itemOk = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/odisha-state-scholarship-portal-guide/'),
    env,
    new URL('https://csodisha.com/jobs/item/odisha-state-scholarship-portal-guide/')
  );
  assert.equal(itemOk.status, 200);
  const itemHtml = await itemOk.text();
  assert.ok(itemHtml.includes('Official Apply / Portal'));

  const missing404 = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/non-existent-draft-item/'),
    env,
    new URL('https://csodisha.com/jobs/item/non-existent-draft-item/')
  );
  assert.equal(missing404.status, 404);

  // 10. /sitemap-jobs.xml
  const smRes = await handleJobsDirectorySitemapXml(makeReq('GET', 'https://csodisha.com/sitemap-jobs.xml'), env);
  assert.equal(smRes.status, 200);
  const smXml = await smRes.text();
  assert.ok(smXml.includes('<loc>https://csodisha.com/jobs/scholarships-support/</loc>'));
  assert.ok(smXml.includes('<loc>https://csodisha.com/jobs/item/odisha-state-scholarship-portal-guide/</loc>'));

  // 11. Legacy 417-node bridge test (jobs_directory_nodes level 0->1->2->3 + posts type='job')
  const legacyRaw = new DatabaseSync(':memory:');
  legacyRaw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
    CREATE TABLE posts (id TEXT PRIMARY KEY, type TEXT, slug TEXT, title TEXT, title_or TEXT, organisation TEXT, summary TEXT, body TEXT, apply_url TEXT, last_date TEXT, qualification TEXT, vacancies TEXT, status TEXT);
    INSERT INTO jobs_directory_nodes VALUES (1, NULL, 0, '01', 'Jobs & Recruitment', 'ନିଯୁକ୍ତି', 'State & Central Jobs', '', 'jobs-recruitment', '', '', '[]', '[]', 1, 1);
    INSERT INTO jobs_directory_nodes VALUES (2, 1, 1, '01.01', 'Odisha State Commissions', 'ଓଡ଼ିଶା କମିଶନ', 'OPSC & OSSC', '', 'jobs-recruitment', '', '', '[]', '[]', 1, 1);
    INSERT INTO jobs_directory_nodes VALUES (3, 2, 2, '01.01.01', 'OSSC CGLRE', '', 'Combined Graduate Level', '', 'jobs-recruitment', '', '', '[]', '["OSSC"]', 1, 1);
    INSERT INTO jobs_directory_nodes VALUES (4, 3, 3, '01.01.01.01', 'OSSC CGL Notification Portal', 'ଓଏସଏସସି ସିଜିଏଲ', 'Official OSSC CGL guide', '', 'jobs-recruitment', 'https://www.ossc.gov.in/', '', '[]', '["OSSC","CGL"]', 1, 1);
    INSERT INTO posts VALUES ('p_opsc_1', 'job', 'opsc-aso-2026', 'OPSC ASO Recruitment 2026', 'ଓପିଏସସି ଏଏସଓ', 'OPSC', 'Assistant Section Officer', '<p>OPSC ASO details</p>', 'https://www.opsc.gov.in/', '2026-12-30', 'Graduate', '796 Posts', 'published');
  `);
  function wrapLegacy(sql, args = []) {
    return {
      async first() { return legacyRaw.prepare(sql).get(...args) || null; },
      async all() { return { results: legacyRaw.prepare(sql).all(...args) }; },
      async run() { const info = legacyRaw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const legacyEnv = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapLegacy(sql, a); }, ...wrapLegacy(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };
  await ensureJobsDirectoryStudioSchema(legacyEnv.DB);
  const legOverview = await handlePublicJobsOverviewApi(makeReq('GET', 'https://csodisha.com/api/public/jobs-directory/overview'), legacyEnv);
  const legJson = await legOverview.json();
  assert.ok(legJson.typeBreakdown.recruitment >= 1, 'Bridged job post should appear in typeBreakdown');
  const legDir = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/jobs-recruitment/odisha-state-commissions/ossc-cglre/'),
    legacyEnv,
    new URL('https://csodisha.com/jobs/jobs-recruitment/odisha-state-commissions/ossc-cglre/')
  );
  assert.equal(legDir.status, 200);
  const legItem = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/opsc-aso-2026-job/'),
    legacyEnv,
    new URL('https://csodisha.com/jobs/item/opsc-aso-2026-job/')
  );
  assert.equal(legItem.status, 200);

  // 12. Category #01 (v68) Exhaustive Enrichment across all 137 subcategories + 18 Handbooks + Admin Sync + Zero inline style=""
  const cat01Raw = new DatabaseSync(':memory:');
  cat01Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const dirJson = JSON.parse(fs.readFileSync(path.resolve('jobs-careers/generated/directory.json'), 'utf8'));
  const jrSection = dirJson.sections[0];
  let nodeSeq = 1;
  const insNode = cat01Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insNode.run(1, null, 0, '01', jrSection.title, '', 'Jobs & Recruitment', '', 'jobs-recruitment', '', '', '[]', '[]', 1);
  function insertChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      nodeSeq += 1;
      const myId = nodeSeq;
      insNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'jobs-recruitment', '', '', '[]', '[]', i + 1);
      insertChildren(ch.children, myId, level + 1);
    }
  }
  insertChildren(jrSection.children, 1, 1);
  assert.equal(nodeSeq - 1, 137, 'directory.json should contain all 137 subcategories under Jobs & Recruitment');

  function wrapCat01(sql, args = []) {
    return {
      async first() { return cat01Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat01Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat01Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat01Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat01(sql, a); }, ...wrapCat01(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat01Env.DB);

  // Verify GET /api/admin/jobs-directory/tree returns enriched bilingual fields for all 137+ folders
  const treeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=jobs-recruitment'),
    cat01Env,
    admin,
    'tree'
  );
  assert.equal(treeRes.status, 200);
  const treeData = await treeRes.json();
  assert.ok(treeData.folders.length >= 137, `Expected >= 137 folders, got ${treeData.folders.length}`);
  for (const f of treeData.folders) {
    assert.ok((f.description_en || '').length >= 140, `Folder "${f.title}" description_en < 140 chars`);
    assert.ok((f.description_or || '').length >= 140, `Folder "${f.title}" description_or < 140 chars`);
    assert.ok(Boolean(f.seo_title), `Folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Folder "${f.title}" missing verified_at`);
  }

  // Verify all 18 handbooks are returned by GET /api/admin/jobs-directory/items
  const itemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=jobs-recruitment'),
    cat01Env,
    admin,
    'items'
  );
  assert.equal(itemsRes.status, 200);
  const itemsData = await itemsRes.json();
  const handbooks = itemsData.items.filter(it => Boolean(it.exam_code && it.pay_matrix && it.application_steps));
  assert.ok(handbooks.length >= 18, `Expected >= 18 enriched handbooks, got ${handbooks.length}`);
  for (const hb of handbooks) {
    assert.ok(Boolean(hb.title_or), `Handbook "${hb.title}" missing title_or`);
    assert.ok(Boolean(hb.conducting_body), `Handbook "${hb.title}" missing conducting_body`);
    assert.ok(Boolean(hb.cadre_group), `Handbook "${hb.title}" missing cadre_group`);
    assert.ok(Boolean(hb.age_limit_relaxation), `Handbook "${hb.title}" missing age_limit_relaxation`);
    assert.ok(Boolean(hb.qualification_odia_rule), `Handbook "${hb.title}" missing qualification_odia_rule`);
    assert.ok(Boolean(hb.selection_stages), `Handbook "${hb.title}" missing selection_stages`);
    assert.ok(Boolean(hb.pst_pet_skill_norms), `Handbook "${hb.title}" missing pst_pet_skill_norms`);
    assert.ok(Boolean(hb.documents_checklist), `Handbook "${hb.title}" missing documents_checklist`);
    assert.ok(Boolean(hb.official_portal_url), `Handbook "${hb.title}" missing official_portal_url`);
    assert.ok(Boolean(hb.verified_at), `Handbook "${hb.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT preserves custom admin edits on re-enrichment
  const sampleFolder = treeData.folders[0];
  const customEn = 'Custom Admin English Description verified for Odisha aspirants with more than one hundred and forty characters so enrichment preserves it safely.';
  const customOr = 'କଷ୍ଟମ୍ ଆଡମିନ୍ ଓଡ଼ିଆ ବିବରଣୀ ଯାହା ୧୪୦ ଅକ୍ଷରରୁ ଅଧିକ ଅଟେ ଏବଂ ଏହାକୁ ଏନରିଚମେଣ୍ଟ ଦ୍ୱାରା ପରିବର୍ତ୍ତନ କରାଯିବ ନାହିଁ ବୋଲି ସୁନିଶ୍ଚିତ କରାଯାଇଛି — ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ଏବଂ କ୍ୟାରିୟର ଡାଇରେକ୍ଟୋରୀ।';
  const putFolderRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/folders/${sampleFolder.id}`, {
      description_en: customEn,
      description_or: customOr,
      featured_badge: 'CUSTOM'
    }),
    cat01Env,
    admin,
    'folders',
    sampleFolder.id
  );
  assert.equal(putFolderRes.status, 200);
  await enrichJobsRecruitmentCategory01(cat01Env.DB, new Date().toISOString());
  const treeAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=jobs-recruitment'),
    cat01Env,
    admin,
    'tree'
  )).json();
  const editedFolder = treeAfter.folders.find(f => f.id === sampleFolder.id);
  assert.equal(editedFolder.description_en, customEn);
  assert.equal(editedFolder.description_or, customOr);
  assert.equal(editedFolder.featured_badge, 'CUSTOM');

  // Verify SSR rendering of /jobs/ item page & /jobs/index.html have zero inline style="" attributes
  const ssrHb = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/opsc-odisha-civil-services-ocs-guide/'),
    cat01Env,
    new URL('https://csodisha.com/jobs/item/opsc-odisha-civil-services-ocs-guide/')
  );
  assert.equal(ssrHb.status, 200);
  const ssrHbHtml = await ssrHb.text();
  assert.ok(!/\sstyle\s*=/i.test(ssrHbHtml), 'SSR item page must have zero inline style="" attributes');
  const jobsIndexHtml = fs.readFileSync(path.resolve('jobs/index.html'), 'utf8');
  assert.ok(!/\sstyle\s*=/i.test(jobsIndexHtml), 'jobs/index.html must have zero inline style="" attributes');
  assert.ok(jobsIndexHtml.includes('OSSC / OSSSC') && jobsIndexHtml.includes('Odisha PSUs'), 'jobs/index.html must include aligned Quick Jump pills');

  // 13. Category #02 (v69) Exhaustive Enrichment across all 127 subcategories + 16 Career Roadmaps + Admin Sync + SSR
  const cat02Raw = new DatabaseSync(':memory:');
  cat02Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const ceSection = dirJson.sections[1];
  let ceSeq = 1;
  const insCeNode = cat02Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insCeNode.run(1, null, 0, '02', ceSection.title, '', 'Career Explorer', '', 'career-explorer', '', '', '[]', '[]', 1);
  function insertCeChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      ceSeq += 1;
      const myId = ceSeq;
      insCeNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'career-explorer', '', '', '[]', '[]', i + 1);
      insertCeChildren(ch.children, myId, level + 1);
    }
  }
  insertCeChildren(ceSection.children, 1, 1);
  assert.equal(ceSeq - 1, 127, 'directory.json should contain all 127 subcategories under Career Explorer');

  function wrapCat02(sql, args = []) {
    return {
      async first() { return cat02Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat02Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat02Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat02Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat02(sql, a); }, ...wrapCat02(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat02Env.DB);

  const ceTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=career-explorer'),
    cat02Env,
    admin,
    'tree'
  );
  assert.equal(ceTreeRes.status, 200);
  const ceTreeData = await ceTreeRes.json();
  assert.ok(ceTreeData.folders.length >= 127, `Expected >= 127 career-explorer folders, got ${ceTreeData.folders.length}`);
  for (const f of ceTreeData.folders) {
    assert.ok((f.description_en || '').length >= 140, `Career folder "${f.title}" description_en < 140 chars`);
    assert.ok((f.description_or || '').length >= 140, `Career folder "${f.title}" description_or < 140 chars`);
    assert.ok(Boolean(f.seo_title), `Career folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Career folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Career folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Career folder "${f.title}" missing verified_at`);
  }

  const ceItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=career-explorer'),
    cat02Env,
    admin,
    'items'
  );
  assert.equal(ceItemsRes.status, 200);
  const ceItemsData = await ceItemsRes.json();
  const roadmaps = ceItemsData.items.filter(it => Boolean(it.academic_pathways && it.premier_institutions && it.career_ladder));
  assert.ok(roadmaps.length >= 16, `Expected >= 16 career roadmaps, got ${roadmaps.length}`);
  for (const rm of roadmaps) {
    assert.ok(Boolean(rm.title_or), `Roadmap "${rm.title}" missing title_or`);
    assert.ok(Boolean(rm.entrance_licensing), `Roadmap "${rm.title}" missing entrance_licensing`);
    assert.ok(Boolean(rm.skills_certifications), `Roadmap "${rm.title}" missing skills_certifications`);
    assert.ok(Boolean(rm.salary_progression), `Roadmap "${rm.title}" missing salary_progression`);
    assert.ok(Boolean(rm.verified_at), `Roadmap "${rm.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT on Career Roadmap & preservation on re-enrichment
  const sampleRm = roadmaps[0];
  const putRmRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleRm.id}`, {
      salary_progression: 'Custom Admin Salary Progression Verified'
    }),
    cat02Env,
    admin,
    'items',
    sampleRm.id
  );
  assert.equal(putRmRes.status, 200);
  await enrichCareerExplorerCategory02(cat02Env.DB, new Date().toISOString());
  const ceItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleRm.id}`),
    cat02Env,
    admin,
    'items',
    sampleRm.id
  )).json();
  assert.equal(ceItemAfter.item.salary_progression, 'Custom Admin Salary Progression Verified');

  // Verify SSR Career Roadmap page renders new fields with zero inline style="" attributes
  const ssrCe = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/software-engineering-ai-data-science-cloud-roadmap/'),
    cat02Env,
    new URL('https://csodisha.com/jobs/item/software-engineering-ai-data-science-cloud-roadmap/')
  );
  assert.equal(ssrCe.status, 200);
  const ssrCeHtml = await ssrCe.text();
  assert.ok(ssrCeHtml.includes('Academic Entry Pathways') && ssrCeHtml.includes('5-to-15 Yr Career Ladder'));
  assert.ok(!/\sstyle\s*=/i.test(ssrCeHtml), 'SSR career roadmap page must have zero inline style="" attributes');

  // 14. Category #03 (v70) Exhaustive Enrichment across all 7 subcategories + 10 Eligibility Handbooks + Admin Sync + SSR
  const cat03Raw = new DatabaseSync(':memory:');
  cat03Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const eeSection = dirJson.sections[2];
  let eeSeq = 1;
  const insEeNode = cat03Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insEeNode.run(1, null, 0, '03', eeSection.title, '', 'Eligibility & Qualification Explorer', '', 'eligibility-explorer', '', '', '[]', '[]', 1);
  function insertEeChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      eeSeq += 1;
      const myId = eeSeq;
      insEeNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'eligibility-explorer', '', '', '[]', '[]', i + 1);
      insertEeChildren(ch.children, myId, level + 1);
    }
  }
  insertEeChildren(eeSection.children, 1, 1);
  assert.equal(eeSeq - 1, 7, 'directory.json should contain all 7 subcategories under Eligibility & Qualification Explorer');

  function wrapCat03(sql, args = []) {
    return {
      async first() { return cat03Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat03Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat03Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat03Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat03(sql, a); }, ...wrapCat03(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat03Env.DB);

  const eeTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=eligibility-explorer'),
    cat03Env,
    admin,
    'tree'
  );
  assert.equal(eeTreeRes.status, 200);
  const eeTreeData = await eeTreeRes.json();
  assert.ok(eeTreeData.folders.length >= 7, `Expected >= 7 eligibility-explorer folders, got ${eeTreeData.folders.length}`);
  for (const f of eeTreeData.folders) {
    assert.ok((f.description_en || '').length >= 160, `Eligibility folder "${f.title}" description_en < 160 chars`);
    assert.ok((f.description_or || '').length >= 160, `Eligibility folder "${f.title}" description_or < 160 chars`);
    assert.ok(Boolean(f.seo_title), `Eligibility folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Eligibility folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Eligibility folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Eligibility folder "${f.title}" missing verified_at`);
  }

  const eeItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=eligibility-explorer'),
    cat03Env,
    admin,
    'items'
  );
  assert.equal(eeItemsRes.status, 200);
  const eeItemsData = await eeItemsRes.json();
  const eeGuides = eeItemsData.items.filter(it => it.item_type === 'eligibility-matrix' && Boolean(it.qualification_odia_rule && it.age_limit_relaxation));
  assert.ok(eeGuides.length >= 10, `Expected >= 10 eligibility guides, got ${eeGuides.length}`);
  for (const g of eeGuides) {
    assert.ok(Boolean(g.title_or), `Eligibility guide "${g.title}" missing title_or`);
    assert.ok(Boolean(g.documents_checklist), `Eligibility guide "${g.title}" missing documents_checklist`);
    assert.ok(Boolean(g.official_portal_url), `Eligibility guide "${g.title}" missing official_portal_url`);
    assert.ok(Boolean(g.verified_at), `Eligibility guide "${g.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT & custom edit preservation
  const sampleEe = eeGuides[0];
  const putEeRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleEe.id}`, {
      qualification_odia_rule: 'Custom Admin Odia Qualification Rule Verified'
    }),
    cat03Env,
    admin,
    'items',
    sampleEe.id
  );
  assert.equal(putEeRes.status, 200);
  await enrichEligibilityExplorerCategory03(cat03Env.DB, new Date().toISOString());
  const eeItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleEe.id}`),
    cat03Env,
    admin,
    'items',
    sampleEe.id
  )).json();
  assert.equal(eeItemAfter.item.qualification_odia_rule, 'Custom Admin Odia Qualification Rule Verified');

  // Verify SSR Eligibility guide renders cleanly with zero inline style="" attributes
  const ssrEe = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/odisha-mandatory-odia-language-rule-and-degree-equivalence/'),
    cat03Env,
    new URL('https://csodisha.com/jobs/item/odisha-mandatory-odia-language-rule-and-degree-equivalence/')
  );
  assert.equal(ssrEe.status, 200);
  const ssrEeHtml = await ssrEe.text();
  assert.ok(ssrEeHtml.includes('Qualification &amp; Odia Rule') && ssrEeHtml.includes('BSE Odisha'));
  assert.ok(!/\sstyle\s*=/i.test(ssrEeHtml), 'SSR eligibility guide page must have zero inline style="" attributes');

  console.log('ALL JOBS DIRECTORY STUDIO TESTS PASSED');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
