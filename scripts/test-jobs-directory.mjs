import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureJobsDirectoryStudioSchema,
  enrichJobsRecruitmentCategory01,
  enrichCareerExplorerCategory02,
  enrichEligibilityExplorerCategory03,
  enrichCoursesExamsCategory04,
  enrichScholarshipsCategory05,
  enrichInternationalCategory06,
  enrichCareerDevelopmentCategory07,
  enrichInstitutionsPortalsCategory08,
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

  // 15. Category #04 (v71) Exhaustive Enrichment across all 35 subcategories + 14 Course/Exam Handbooks + Admin Sync + SSR
  const cat04Raw = new DatabaseSync(':memory:');
  cat04Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const cxSection = dirJson.sections[3];
  let cxSeq = 1;
  const insCxNode = cat04Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insCxNode.run(1, null, 0, '04', cxSection.title, '', 'Courses, Entrance Exams & Certifications', '', 'courses-exams', '', '', '[]', '[]', 1);
  function insertCxChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      cxSeq += 1;
      const myId = cxSeq;
      insCxNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'courses-exams', '', '', '[]', '[]', i + 1);
      insertCxChildren(ch.children, myId, level + 1);
    }
  }
  insertCxChildren(cxSection.children, 1, 1);
  assert.equal(cxSeq - 1, 35, 'directory.json should contain all 35 subcategories under Courses, Entrance Exams & Certifications');

  function wrapCat04(sql, args = []) {
    return {
      async first() { return cat04Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat04Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat04Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat04Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat04(sql, a); }, ...wrapCat04(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat04Env.DB);

  const cxTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=courses-exams'),
    cat04Env,
    admin,
    'tree'
  );
  assert.equal(cxTreeRes.status, 200);
  const cxTreeData = await cxTreeRes.json();
  assert.ok(cxTreeData.folders.length >= 35, `Expected >= 35 courses-exams folders, got ${cxTreeData.folders.length}`);
  for (const f of cxTreeData.folders) {
    assert.ok((f.description_en || '').length >= 160, `Courses folder "${f.title}" description_en < 160 chars`);
    assert.ok((f.description_or || '').length >= 160, `Courses folder "${f.title}" description_or < 160 chars`);
    assert.ok(Boolean(f.seo_title), `Courses folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Courses folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Courses folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Courses folder "${f.title}" missing verified_at`);
  }

  const cxItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=courses-exams'),
    cat04Env,
    admin,
    'items'
  );
  assert.equal(cxItemsRes.status, 200);
  const cxItemsData = await cxItemsRes.json();
  const cxGuides = cxItemsData.items.filter(it => it.item_type === 'course-exam' && Boolean(it.exam_code && it.qualification_odia_rule));
  assert.ok(cxGuides.length >= 14, `Expected >= 14 course-exam guides, got ${cxGuides.length}`);
  for (const g of cxGuides) {
    assert.ok(Boolean(g.title_or), `Course/Exam guide "${g.title}" missing title_or`);
    assert.ok(Boolean(g.selection_stages), `Course/Exam guide "${g.title}" missing selection_stages`);
    assert.ok(Boolean(g.documents_checklist), `Course/Exam guide "${g.title}" missing documents_checklist`);
    assert.ok(Boolean(g.application_steps), `Course/Exam guide "${g.title}" missing application_steps`);
    assert.ok(Boolean(g.official_portal_url), `Course/Exam guide "${g.title}" missing official_portal_url`);
    assert.ok(Boolean(g.verified_at), `Course/Exam guide "${g.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT & custom edit preservation
  const sampleCx = cxGuides.find(g => g.slug === 'ojee-counselling-document-checklist') || cxGuides[0];
  const customCxRule = 'Custom Admin OJEE TFW & Counselling Qualification Rule Verified';
  const putCxRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleCx.id}`, {
      qualification_odia_rule: customCxRule,
      exam_code: 'OJEE-CUSTOM-2026'
    }),
    cat04Env,
    admin,
    'items',
    sampleCx.id
  );
  assert.equal(putCxRes.status, 200);
  await enrichCoursesExamsCategory04(cat04Env.DB, new Date().toISOString());
  const cxItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleCx.id}`),
    cat04Env,
    admin,
    'items',
    sampleCx.id
  )).json();
  assert.equal(cxItemAfter.item.qualification_odia_rule, customCxRule, 'Custom admin edit in Category #04 must not be overwritten');
  assert.equal(cxItemAfter.item.exam_code, 'OJEE-CUSTOM-2026');

  // Verify SSR Course/Exam guide renders cleanly with zero inline style="" attributes
  const ssrCx = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/ojee-counselling-document-checklist/'),
    cat04Env,
    new URL('https://csodisha.com/jobs/item/ojee-counselling-document-checklist/')
  );
  assert.equal(ssrCx.status, 200);
  const ssrCxHtml = await ssrCx.text();
  assert.ok(ssrCxHtml.includes('Qualification &amp; Odia Rule') && ssrCxHtml.includes('OJEE'));
  assert.ok(!/\sstyle\s*=/i.test(ssrCxHtml), 'SSR course/exam guide page must have zero inline style="" attributes');

  // 16. Category #05 (v72) Exhaustive Enrichment across all 8 subcategories + 12 Scholarship Handbooks + Admin Sync + SSR
  const cat05Raw = new DatabaseSync(':memory:');
  cat05Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const ssSection = dirJson.sections[4];
  let ssSeq = 1;
  const insSsNode = cat05Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insSsNode.run(1, null, 0, '05', ssSection.title, '', 'Scholarships & Financial Support', '', 'scholarships-support', '', '', '[]', '[]', 1);
  function insertSsChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      ssSeq += 1;
      const myId = ssSeq;
      insSsNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'scholarships-support', '', '', '[]', '[]', i + 1);
      insertSsChildren(ch.children, myId, level + 1);
    }
  }
  insertSsChildren(ssSection.children, 1, 1);
  assert.equal(ssSeq - 1, 8, 'directory.json should contain all 8 subcategories under Scholarships & Financial Support');

  function wrapCat05(sql, args = []) {
    return {
      async first() { return cat05Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat05Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat05Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat05Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat05(sql, a); }, ...wrapCat05(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat05Env.DB);

  const ssTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=scholarships-support'),
    cat05Env,
    admin,
    'tree'
  );
  assert.equal(ssTreeRes.status, 200);
  const ssTreeData = await ssTreeRes.json();
  assert.ok(ssTreeData.folders.length >= 8, `Expected >= 8 scholarships-support folders, got ${ssTreeData.folders.length}`);
  for (const f of ssTreeData.folders) {
    assert.ok((f.description_en || '').length >= 160, `Scholarship folder "${f.title}" description_en < 160 chars`);
    assert.ok((f.description_or || '').length >= 160, `Scholarship folder "${f.title}" description_or < 160 chars`);
    assert.ok(Boolean(f.seo_title), `Scholarship folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Scholarship folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Scholarship folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Scholarship folder "${f.title}" missing verified_at`);
  }

  const ssItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=scholarships-support'),
    cat05Env,
    admin,
    'items'
  );
  assert.equal(ssItemsRes.status, 200);
  const ssItemsData = await ssItemsRes.json();
  const ssGuides = ssItemsData.items.filter(it => it.item_type === 'scholarship' && Boolean(it.exam_code && it.qualification_odia_rule));
  assert.ok(ssGuides.length >= 12, `Expected >= 12 scholarship guides, got ${ssGuides.length}`);
  for (const g of ssGuides) {
    assert.ok(Boolean(g.title_or), `Scholarship guide "${g.title}" missing title_or`);
    assert.ok(Boolean(g.pay_matrix), `Scholarship guide "${g.title}" missing pay_matrix`);
    assert.ok(Boolean(g.documents_checklist), `Scholarship guide "${g.title}" missing documents_checklist`);
    assert.ok(Boolean(g.application_steps), `Scholarship guide "${g.title}" missing application_steps`);
    assert.ok(Boolean(g.official_portal_url), `Scholarship guide "${g.title}" missing official_portal_url`);
    assert.ok(Boolean(g.verified_at), `Scholarship guide "${g.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT & custom edit preservation
  const sampleSs = ssGuides.find(g => g.slug === 'odisha-state-scholarship-portal-guide') || ssGuides[0];
  const customSsRule = 'Custom Admin Odisha Scholarship DBT & Income Rule Verified';
  const putSsRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleSs.id}`, {
      qualification_odia_rule: customSsRule,
      exam_code: 'OSP-CUSTOM-2026'
    }),
    cat05Env,
    admin,
    'items',
    sampleSs.id
  );
  assert.equal(putSsRes.status, 200);
  await enrichScholarshipsCategory05(cat05Env.DB, new Date().toISOString());
  const ssItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleSs.id}`),
    cat05Env,
    admin,
    'items',
    sampleSs.id
  )).json();
  assert.equal(ssItemAfter.item.qualification_odia_rule, customSsRule, 'Custom admin edit in Category #05 must not be overwritten');
  assert.equal(ssItemAfter.item.exam_code, 'OSP-CUSTOM-2026');

  // Verify SSR Scholarship guide renders cleanly with zero inline style="" attributes
  const ssrSs = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/odisha-state-scholarship-portal-guide/'),
    cat05Env,
    new URL('https://csodisha.com/jobs/item/odisha-state-scholarship-portal-guide/')
  );
  assert.equal(ssrSs.status, 200);
  const ssrSsHtml = await ssrSs.text();
  assert.ok(ssrSsHtml.includes('Qualification &amp; Odia Rule') && ssrSsHtml.includes('scholarship.odisha.gov.in'));
  assert.ok(!/\sstyle\s*=/i.test(ssrSsHtml), 'SSR scholarship guide page must have zero inline style="" attributes');

  // 17. Category #06 (v73) Exhaustive Enrichment across all 48 subcategories + 12 Overseas Handbooks + Admin Sync + SSR
  const cat06Raw = new DatabaseSync(':memory:');
  cat06Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const ioSection = dirJson.sections[5];
  let ioSeq = 1;
  const insIoNode = cat06Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insIoNode.run(1, null, 0, '06', ioSection.title, '', 'International & Overseas Opportunities', '', 'international-overseas', '', '', '[]', '[]', 1);
  function insertIoChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      ioSeq += 1;
      const myId = ioSeq;
      insIoNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'international-overseas', '', '', '[]', '[]', i + 1);
      insertIoChildren(ch.children, myId, level + 1);
    }
  }
  insertIoChildren(ioSection.children, 1, 1);
  assert.equal(ioSeq - 1, 48, 'directory.json should contain all 48 subcategories under International & Overseas Opportunities');

  function wrapCat06(sql, args = []) {
    return {
      async first() { return cat06Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat06Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat06Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat06Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat06(sql, a); }, ...wrapCat06(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat06Env.DB);

  const ioTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=international-overseas'),
    cat06Env,
    admin,
    'tree'
  );
  assert.equal(ioTreeRes.status, 200);
  const ioTreeData = await ioTreeRes.json();
  assert.ok(ioTreeData.folders.length >= 48, `Expected >= 48 international-overseas folders, got ${ioTreeData.folders.length}`);
  for (const f of ioTreeData.folders) {
    assert.ok((f.description_en || '').length >= 160, `International folder "${f.title}" description_en < 160 chars`);
    assert.ok((f.description_or || '').length >= 160, `International folder "${f.title}" description_or < 160 chars`);
    assert.ok(Boolean(f.seo_title), `International folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `International folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `International folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `International folder "${f.title}" missing verified_at`);
  }

  const ioItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=international-overseas'),
    cat06Env,
    admin,
    'items'
  );
  assert.equal(ioItemsRes.status, 200);
  const ioItemsData = await ioItemsRes.json();
  const ioGuides = ioItemsData.items.filter(it => it.item_type === 'overseas-track' && Boolean(it.exam_code && it.qualification_odia_rule));
  assert.ok(ioGuides.length >= 12, `Expected >= 12 overseas-track guides, got ${ioGuides.length}`);
  for (const g of ioGuides) {
    assert.ok(Boolean(g.title_or), `Overseas guide "${g.title}" missing title_or`);
    assert.ok(Boolean(g.pay_matrix), `Overseas guide "${g.title}" missing pay_matrix`);
    assert.ok(Boolean(g.documents_checklist), `Overseas guide "${g.title}" missing documents_checklist`);
    assert.ok(Boolean(g.application_steps), `Overseas guide "${g.title}" missing application_steps`);
    assert.ok(Boolean(g.official_portal_url), `Overseas guide "${g.title}" missing official_portal_url`);
    assert.ok(Boolean(g.verified_at), `Overseas guide "${g.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT & custom edit preservation
  const sampleIo = ioGuides.find(g => g.slug === 'safe-overseas-employment-mea-emigrate-anti-fraud-guide') || ioGuides[0];
  const customIoRule = 'Custom Admin MEA e-Migrate RA & PBBY Verification Rule Verified';
  const putIoRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleIo.id}`, {
      qualification_odia_rule: customIoRule,
      exam_code: 'MEA-CUSTOM-2026'
    }),
    cat06Env,
    admin,
    'items',
    sampleIo.id
  );
  assert.equal(putIoRes.status, 200);
  await enrichInternationalCategory06(cat06Env.DB, new Date().toISOString());
  const ioItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleIo.id}`),
    cat06Env,
    admin,
    'items',
    sampleIo.id
  )).json();
  assert.equal(ioItemAfter.item.qualification_odia_rule, customIoRule, 'Custom admin edit in Category #06 must not be overwritten');
  assert.equal(ioItemAfter.item.exam_code, 'MEA-CUSTOM-2026');

  // Verify SSR Overseas guide renders cleanly with zero inline style="" attributes
  const ssrIo = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/safe-overseas-employment-mea-emigrate-anti-fraud-guide/'),
    cat06Env,
    new URL('https://csodisha.com/jobs/item/safe-overseas-employment-mea-emigrate-anti-fraud-guide/')
  );
  assert.equal(ssrIo.status, 200);
  const ssrIoHtml = await ssrIo.text();
  assert.ok(ssrIoHtml.includes('Qualification &amp; Odia Rule') && ssrIoHtml.includes('emigrate.gov.in'));
  assert.ok(!/\sstyle\s*=/i.test(ssrIoHtml), 'SSR overseas guide page must have zero inline style="" attributes');

  // 18. Category #07 (v74) Exhaustive Enrichment across all 20 subcategories + 12 Employability Handbooks + Admin Sync + SSR
  const cat07Raw = new DatabaseSync(':memory:');
  cat07Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const cdSection = dirJson.sections[6];
  let cdSeq = 1;
  const insCdNode = cat07Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insCdNode.run(1, null, 0, '07', cdSection.title, '', 'Career Development & Employability', '', 'career-employability', '', '', '[]', '[]', 1);
  function insertCdChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      cdSeq += 1;
      const myId = cdSeq;
      insCdNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'career-employability', '', '', '[]', '[]', i + 1);
      insertCdChildren(ch.children, myId, level + 1);
    }
  }
  insertCdChildren(cdSection.children, 1, 1);
  assert.equal(cdSeq - 1, 20, 'directory.json should contain all 20 subcategories under Career Development & Employability');

  function wrapCat07(sql, args = []) {
    return {
      async first() { return cat07Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat07Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat07Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat07Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat07(sql, a); }, ...wrapCat07(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat07Env.DB);

  const cdTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=career-employability'),
    cat07Env,
    admin,
    'tree'
  );
  assert.equal(cdTreeRes.status, 200);
  const cdTreeData = await cdTreeRes.json();
  assert.ok(cdTreeData.folders.length >= 20, `Expected >= 20 career-employability folders, got ${cdTreeData.folders.length}`);
  for (const f of cdTreeData.folders) {
    assert.ok((f.description_en || '').length >= 160, `Career Dev folder "${f.title}" description_en < 160 chars`);
    assert.ok((f.description_or || '').length >= 160, `Career Dev folder "${f.title}" description_or < 160 chars`);
    assert.ok(Boolean(f.seo_title), `Career Dev folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Career Dev folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Career Dev folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Career Dev folder "${f.title}" missing verified_at`);
  }

  const cdItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=career-employability'),
    cat07Env,
    admin,
    'items'
  );
  assert.equal(cdItemsRes.status, 200);
  const cdItemsData = await cdItemsRes.json();
  const cdGuides = cdItemsData.items.filter(it => it.item_type === 'employability-guide' && Boolean(it.exam_code && it.qualification_odia_rule));
  assert.ok(cdGuides.length >= 12, `Expected >= 12 employability-guide items, got ${cdGuides.length}`);
  for (const g of cdGuides) {
    assert.ok(Boolean(g.title_or), `Employability guide "${g.title}" missing title_or`);
    assert.ok(Boolean(g.pay_matrix), `Employability guide "${g.title}" missing pay_matrix`);
    assert.ok(Boolean(g.documents_checklist), `Employability guide "${g.title}" missing documents_checklist`);
    assert.ok(Boolean(g.application_steps), `Employability guide "${g.title}" missing application_steps`);
    assert.ok(Boolean(g.official_portal_url), `Employability guide "${g.title}" missing official_portal_url`);
    assert.ok(Boolean(g.verified_at), `Employability guide "${g.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT & custom edit preservation
  const sampleCd = cdGuides.find(g => g.slug === 'opsc-oas-personality-test-daf-kit') || cdGuides[0];
  const customCdRule = 'Custom Admin OPSC OAS DAF & Odisha District Viva Rule Verified';
  const putCdRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleCd.id}`, {
      qualification_odia_rule: customCdRule,
      exam_code: 'OPSC-DAF-CUSTOM-2026'
    }),
    cat07Env,
    admin,
    'items',
    sampleCd.id
  );
  assert.equal(putCdRes.status, 200);
  await enrichCareerDevelopmentCategory07(cat07Env.DB, new Date().toISOString());
  const cdItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleCd.id}`),
    cat07Env,
    admin,
    'items',
    sampleCd.id
  )).json();
  assert.equal(cdItemAfter.item.qualification_odia_rule, customCdRule, 'Custom admin edit in Category #07 must not be overwritten');
  assert.equal(cdItemAfter.item.exam_code, 'OPSC-DAF-CUSTOM-2026');

  // Verify SSR Employability guide renders cleanly with zero inline style="" attributes
  const ssrCd = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/opsc-oas-personality-test-daf-kit/'),
    cat07Env,
    new URL('https://csodisha.com/jobs/item/opsc-oas-personality-test-daf-kit/')
  );
  assert.equal(ssrCd.status, 200);
  const ssrCdHtml = await ssrCd.text();
  assert.ok(ssrCdHtml.includes('Qualification &amp; Odia Rule') && ssrCdHtml.includes('opsc.gov.in'));
  assert.ok(!/\sstyle\s*=/i.test(ssrCdHtml), 'SSR employability guide page must have zero inline style="" attributes');

  // 19. Category #08 (v75) Exhaustive Enrichment across all 27 subcategories + 12 Official Portal Handbooks + Admin Sync + SSR
  const cat08Raw = new DatabaseSync(':memory:');
  cat08Raw.exec(`
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE jobs_directory_nodes (id INTEGER PRIMARY KEY, parent_id INTEGER, level INTEGER, code TEXT, title TEXT, title_or TEXT, description TEXT, description_or TEXT, group_slug TEXT, url TEXT, exam_slug TEXT, notes_json TEXT, tags TEXT, sort_order INTEGER, is_active INTEGER);
  `);
  const ipSection = dirJson.sections[7];
  let ipSeq = 1;
  const insIpNode = cat08Raw.prepare('INSERT INTO jobs_directory_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
  insIpNode.run(1, null, 0, '08', ipSection.title, '', 'Institutions, Official Portals & Verification', '', 'institutions-portals', '', '', '[]', '[]', 1);
  function insertIpChildren(children, parentId, level) {
    for (let i = 0; i < (children || []).length; i++) {
      const ch = children[i];
      ipSeq += 1;
      const myId = ipSeq;
      insIpNode.run(myId, parentId, level, ch.number || '', ch.title, '', '', '', 'institutions-portals', '', '', '[]', '[]', i + 1);
      insertIpChildren(ch.children, myId, level + 1);
    }
  }
  insertIpChildren(ipSection.children, 1, 1);
  assert.equal(ipSeq - 1, 27, 'directory.json should contain all 27 subcategories under Institutions, Official Portals & Verification');

  function wrapCat08(sql, args = []) {
    return {
      async first() { return cat08Raw.prepare(sql).get(...args) || null; },
      async all() { return { results: cat08Raw.prepare(sql).all(...args) }; },
      async run() { const info = cat08Raw.prepare(sql).run(...args); return { success: true, meta: { changes: info.changes } }; }
    };
  }
  const cat08Env = {
    DB: {
      prepare(sql) { return { bind(...a) { return wrapCat08(sql, a); }, ...wrapCat08(sql, []) }; },
      async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
    }
  };

  await ensureJobsDirectoryStudioSchema(cat08Env.DB);

  const ipTreeRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/tree?domain=institutions-portals'),
    cat08Env,
    admin,
    'tree'
  );
  assert.equal(ipTreeRes.status, 200);
  const ipTreeData = await ipTreeRes.json();
  assert.ok(ipTreeData.folders.length >= 27, `Expected >= 27 institutions-portals folders, got ${ipTreeData.folders.length}`);
  for (const f of ipTreeData.folders) {
    assert.ok((f.description_en || '').length >= 160, `Institutions folder "${f.title}" description_en < 160 chars`);
    assert.ok((f.description_or || '').length >= 160, `Institutions folder "${f.title}" description_or < 160 chars`);
    assert.ok(Boolean(f.seo_title), `Institutions folder "${f.title}" missing seo_title`);
    assert.ok(Boolean(f.seo_description), `Institutions folder "${f.title}" missing seo_description`);
    assert.ok(Boolean(f.featured_badge), `Institutions folder "${f.title}" missing featured_badge`);
    assert.ok(Boolean(f.verified_at), `Institutions folder "${f.title}" missing verified_at`);
  }

  const ipItemsRes = await handleJobsDirectoryStudio(
    makeReq('GET', 'https://csodisha.com/api/admin/jobs-directory/items?domain=institutions-portals'),
    cat08Env,
    admin,
    'items'
  );
  assert.equal(ipItemsRes.status, 200);
  const ipItemsData = await ipItemsRes.json();
  const ipGuides = ipItemsData.items.filter(it => it.item_type === 'official-portal' && Boolean(it.exam_code && it.qualification_odia_rule));
  assert.ok(ipGuides.length >= 12, `Expected >= 12 official-portal items, got ${ipGuides.length}`);
  for (const g of ipGuides) {
    assert.ok(Boolean(g.title_or), `Official Portal guide "${g.title}" missing title_or`);
    assert.ok(Boolean(g.pay_matrix), `Official Portal guide "${g.title}" missing pay_matrix`);
    assert.ok(Boolean(g.documents_checklist), `Official Portal guide "${g.title}" missing documents_checklist`);
    assert.ok(Boolean(g.application_steps), `Official Portal guide "${g.title}" missing application_steps`);
    assert.ok(Boolean(g.official_portal_url), `Official Portal guide "${g.title}" missing official_portal_url`);
    assert.ok(Boolean(g.verified_at), `Official Portal guide "${g.title}" missing verified_at`);
  }

  // Verify Admin two-way sync PUT & custom edit preservation
  const sampleIp = ipGuides.find(g => g.slug === 'verified-odisha-recruitment-portals-directory') || ipGuides[0];
  const customIpRule = 'Custom Admin OPSC OSSC OSSSC Verified Portal Rule Verified';
  const putIpRes = await handleJobsDirectoryStudio(
    makeReq('PUT', `https://csodisha.com/api/admin/jobs-directory/items/${sampleIp.id}`, {
      qualification_odia_rule: customIpRule,
      exam_code: 'PORTALS-CUSTOM-2026'
    }),
    cat08Env,
    admin,
    'items',
    sampleIp.id
  );
  assert.equal(putIpRes.status, 200);
  await enrichInstitutionsPortalsCategory08(cat08Env.DB, new Date().toISOString());
  const ipItemAfter = await (await handleJobsDirectoryStudio(
    makeReq('GET', `https://csodisha.com/api/admin/jobs-directory/items/${sampleIp.id}`),
    cat08Env,
    admin,
    'items',
    sampleIp.id
  )).json();
  assert.equal(ipItemAfter.item.qualification_odia_rule, customIpRule, 'Custom admin edit in Category #08 must not be overwritten');
  assert.equal(ipItemAfter.item.exam_code, 'PORTALS-CUSTOM-2026');

  // Verify SSR Official Portal guide renders cleanly with zero inline style="" attributes
  const ssrIp = await handlePublicJobsRoute(
    makeReq('GET', 'https://csodisha.com/jobs/item/verified-odisha-recruitment-portals-directory/'),
    cat08Env,
    new URL('https://csodisha.com/jobs/item/verified-odisha-recruitment-portals-directory/')
  );
  assert.equal(ssrIp.status, 200);
  const ssrIpHtml = await ssrIp.text();
  assert.ok(ssrIpHtml.includes('Qualification &amp; Odia Rule') && ssrIpHtml.includes('opsc.gov.in'));
  assert.ok(!/\sstyle\s*=/i.test(ssrIpHtml), 'SSR official portal guide page must have zero inline style="" attributes');

  console.log('ALL JOBS DIRECTORY STUDIO TESTS PASSED');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
