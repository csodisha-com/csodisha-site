#!/usr/bin/env node
/**
 * v249 Jobs Publishing House, 3-Layer Taxonomy & EdTech Career Engine Verification Suite
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  handleJobsTaxonomyAdmin,
  handleJobsSnippetsAdmin,
  handleJobsArticlesAdmin,
  handlePublicJobsTreeApi,
  handlePublicJobsListApi,
  handlePublicJobsArticleApi,
  handlePublicJobsTelemetryApi,
  extractJobMetadataFromPdfBytes,
  resetJobsPublishingSchemaMemo
} from '../functions/_lib/jobs-publishing-house.js';
import { CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

console.log('\n=== v249 Jobs Publishing House, 3-Layer Taxonomy & EdTech Engine Verification ===');

// In-memory mock D1 for Jobs Publishing House tables
function createMockDb() {
  const taxonomy = new Map();
  const articles = new Map();
  const snippets = new Map();
  const revisions = [];
  const auditLogs = [];

  return {
    taxonomy, articles, snippets, revisions, auditLogs,
    prepare(sql) {
      const s = sql.replace(/\s+/g, ' ').trim();
      return {
        _args: [],
        bind(...args) { this._args = args; return this; },
        async run() {
          if (s.startsWith('CREATE TABLE')) return { success: true };
          if (s.startsWith('INSERT INTO audit_log')) {
            auditLogs.push(this._args);
            return { success: true };
          }
          if (s.startsWith('INSERT INTO job_taxonomy_nodes')) {
            const [id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published] = this._args;
            taxonomy.set(id, { id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at: new Date().toISOString() });
            return { success: true };
          }
          if (s.startsWith('UPDATE job_taxonomy_nodes SET sort_order')) {
            const [ord, id] = this._args;
            const n = taxonomy.get(id); if (n) n.sort_order = ord;
            return { success: true };
          }
          if (s.startsWith('DELETE FROM job_taxonomy_nodes WHERE id = ?')) {
            taxonomy.delete(this._args[0]);
            return { success: true };
          }
          if (s.startsWith('INSERT INTO editorial_snippets')) {
            const [id, snippet_key, category, title_en, title_or, body_en, body_or, sort_order, is_published] = this._args;
            snippets.set(id, { id, snippet_key, category, title_en, title_or, body_en, body_or, sort_order, is_published, updated_at: new Date().toISOString() });
            return { success: true };
          }
          if (s.startsWith('DELETE FROM editorial_snippets WHERE id = ?')) {
            snippets.delete(this._args[0]);
            return { success: true };
          }
          if (s.startsWith('INSERT INTO job_articles')) {
            const a = this._args;
            const row = {
              id: a[0], slug: a[1], category_l1_id: a[2], category_l2_id: a[3], category_l3_id: a[4], sector_badge: a[5],
              title_en: a[6], title_or: a[7], summary_en: a[8], summary_or: a[9], organisation_en: a[10], organisation_or: a[11],
              advt_number: a[12], total_vacancies: a[13], qualification_level: a[14], qualification_summary: a[15],
              min_age: a[16], max_age: a[17], age_cutoff_date: a[18], age_limit_summary: a[19], odisha_domicile_required: a[20],
              salary_pay_scale: a[21], selection_mode: a[22], location_district: a[23],
              application_start_date: a[24], last_date: a[25], exam_date: a[26],
              cover_image_url: a[27], cover_image_caption: a[28], article_body_en: a[29], article_body_or: a[30],
              vacancy_breakdown_json: a[31], important_dates_json: a[32], fee_structure_json: a[33],
              selection_steps_json: a[34], cutoff_reference_json: a[35], lifecycle_updates_json: a[36], linked_study_ids_json: a[37],
              official_apply_url: a[38], official_website_url: a[39], notification_pdf_url: a[40], syllabus_pdf_url: a[41],
              pdf_index_bookmarks_json: a[42], extra_attachments_json: a[43], lifecycle_stage: a[44],
              corrigendum_note_en: a[45], corrigendum_note_or: a[46], scheduled_publish_at: a[47],
              preview_token: '', preview_expires_at: '',
              is_featured: a[48], is_published: a[49],
              views_count: 0, apply_clicks_count: 0, pdf_downloads_count: 0, bookmarks_count: 0,
              published_at: a[50], updated_at: new Date().toISOString()
            };
            articles.set(row.id, row);
            return { success: true };
          }
          if (s.startsWith('UPDATE job_articles SET is_published = 1, published_at =')) {
            const nowUtc = this._args[0];
            let changes = 0;
            for (const r of articles.values()) {
              if (!r.is_published && r.scheduled_publish_at && r.scheduled_publish_at.replace('T', ' ') <= nowUtc) {
                r.is_published = 1;
                r.published_at = r.published_at || r.scheduled_publish_at;
                changes++;
              }
            }
            return { success: true, meta: { changes } };
          }
          if (s.startsWith('UPDATE job_articles SET preview_token = ?')) {
            const [tok, exp, id] = this._args;
            const r = articles.get(id);
            if (r) { r.preview_token = tok; r.preview_expires_at = exp; }
            return { success: true };
          }
          if (s.startsWith('UPDATE job_articles SET slug = ?')) {
            const a = this._args;
            const id = a[a.length - 1];
            const r = articles.get(id);
            if (r) {
              r.slug = a[0]; r.category_l1_id = a[1]; r.category_l2_id = a[2]; r.category_l3_id = a[3]; r.sector_badge = a[4];
              r.title_en = a[5]; r.title_or = a[6]; r.summary_en = a[7]; r.summary_or = a[8]; r.organisation_en = a[9]; r.organisation_or = a[10];
              r.advt_number = a[11]; r.total_vacancies = a[12]; r.qualification_level = a[13]; r.qualification_summary = a[14];
              r.min_age = a[15]; r.max_age = a[16]; r.age_cutoff_date = a[17]; r.age_limit_summary = a[18]; r.odisha_domicile_required = a[19];
              r.salary_pay_scale = a[20]; r.selection_mode = a[21]; r.location_district = a[22];
              r.application_start_date = a[23]; r.last_date = a[24]; r.exam_date = a[25];
              r.cover_image_url = a[26]; r.cover_image_caption = a[27]; r.article_body_en = a[28]; r.article_body_or = a[29];
              r.vacancy_breakdown_json = a[30]; r.important_dates_json = a[31]; r.fee_structure_json = a[32];
              r.selection_steps_json = a[33]; r.cutoff_reference_json = a[34]; r.lifecycle_updates_json = a[35]; r.linked_study_ids_json = a[36];
              r.official_apply_url = a[37]; r.official_website_url = a[38]; r.notification_pdf_url = a[39]; r.syllabus_pdf_url = a[40];
              r.pdf_index_bookmarks_json = a[41]; r.extra_attachments_json = a[42]; r.lifecycle_stage = a[43];
              r.corrigendum_note_en = a[44]; r.corrigendum_note_or = a[45]; r.scheduled_publish_at = a[46];
              r.is_featured = a[47]; r.is_published = a[48]; r.published_at = a[49];
              r.updated_at = new Date().toISOString();
            }
            return { success: true };
          }
          if (s.startsWith('UPDATE job_articles SET category_l1_id = ?')) {
            const a = this._args;
            const id = a[a.length - 1];
            const r = articles.get(id);
            if (r) {
              r.category_l1_id = a[0]; r.category_l2_id = a[1]; r.category_l3_id = a[2]; r.sector_badge = a[3];
              r.title_en = a[4]; r.title_or = a[5]; r.total_vacancies = a[11]; r.is_published = a[47];
            }
            return { success: true };
          }
          if (s.startsWith('UPDATE job_articles SET views_count')) {
            const r = [...articles.values()].find(x => x.id === this._args[0] || x.slug === this._args[0]);
            if (r) r.views_count += 1;
            return { success: true };
          }
          if (s.startsWith('UPDATE job_articles SET apply_clicks_count')) {
            const r = [...articles.values()].find(x => x.id === this._args[0] || x.slug === this._args[0]);
            if (r) r.apply_clicks_count += 1;
            return { success: true };
          }
          if (s.startsWith('UPDATE job_articles SET pdf_downloads_count')) {
            const r = [...articles.values()].find(x => x.id === this._args[0] || x.slug === this._args[0]);
            if (r) r.pdf_downloads_count += 1;
            return { success: true };
          }
          if (s.startsWith('INSERT INTO job_article_revisions')) {
            const [id, article_id, revision_number, change_summary, snapshot_json, created_by] = this._args;
            revisions.push({ id, article_id, revision_number, change_summary, snapshot_json, created_by, created_at: new Date().toISOString() });
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (s.includes('FROM job_taxonomy_nodes WHERE id = ?')) return taxonomy.get(this._args[0]) || null;
          if (s.includes('MAX(sort_order) AS m FROM job_taxonomy_nodes')) return { m: taxonomy.size * 10 };
          if (s.includes('FROM editorial_snippets WHERE id = ?')) return snippets.get(this._args[0]) || null;
          if (s.includes('MAX(sort_order) AS m FROM editorial_snippets')) return { m: snippets.size * 10 };
          if (s.includes('FROM job_articles WHERE id = ?')) return articles.get(this._args[0]) || null;
          if (s.includes('FROM job_articles WHERE slug = ? AND id != ?')) {
            return [...articles.values()].find(a => a.slug === this._args[0] && a.id !== this._args[1]) || null;
          }
          if (s.includes('FROM job_articles WHERE slug = ?')) {
            return [...articles.values()].find(a => a.slug === this._args[0]) || null;
          }
          if (s.includes('MAX(revision_number) AS m FROM job_article_revisions')) {
            const list = revisions.filter(r => r.article_id === this._args[0]);
            return { m: list.length ? Math.max(...list.map(x => x.revision_number)) : 0 };
          }
          if (s.includes('FROM job_article_revisions WHERE id = ? AND article_id = ?')) {
            return revisions.find(r => r.id === this._args[0] && r.article_id === this._args[1]) || null;
          }
          return null;
        },
        async all() {
          if (s.includes('FROM job_taxonomy_nodes WHERE is_published = 1')) {
            return { results: [...taxonomy.values()].filter(n => n.is_published === 1).sort((a, b) => a.level - b.level || a.sort_order - b.sort_order) };
          }
          if (s.includes('FROM job_taxonomy_nodes')) {
            return { results: [...taxonomy.values()].sort((a, b) => a.level - b.level || a.sort_order - b.sort_order) };
          }
          if (s.includes('FROM editorial_snippets')) {
            return { results: [...snippets.values()] };
          }
          if (s.includes('FROM job_article_revisions WHERE article_id = ?')) {
            return { results: revisions.filter(r => r.article_id === this._args[0]).slice().reverse() };
          }
          if (s.includes('FROM job_articles WHERE is_published = 1 AND id != ?')) {
            return { results: [...articles.values()].filter(a => a.is_published === 1 && a.id !== this._args[0]) };
          }
          if (s.includes('FROM job_articles WHERE is_published = 1')) {
            return { results: [...articles.values()].filter(a => a.is_published === 1) };
          }
          if (s.includes('FROM job_articles')) {
            return { results: [...articles.values()] };
          }
          return { results: [] };
        }
      };
    },
    async batch(stmts) {
      for (const st of stmts) await st.run();
      return [];
    }
  };
}

const purgedUrls = [];
globalThis.caches = {
  default: {
    async match() { return null; },
    async put() {},
    async delete(req) { purgedUrls.push(typeof req === 'string' ? req : req.url); return true; }
  }
};

await check('1. Migration 0138 creates all 4 required tables & starter taxonomy/snippets', () => {
  const sql = read('migrations/0138_jobs_publishing_house.sql');
  for (const tbl of ['job_taxonomy_nodes', 'job_articles', 'editorial_snippets', 'job_article_revisions']) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table ${tbl}`);
  }
  for (const col of ['category_l1_id', 'category_l2_id', 'category_l3_id', 'preview_token', 'preview_expires_at', 'vacancy_breakdown_json', 'lifecycle_updates_json', 'pdf_index_bookmarks_json', 'linked_study_ids_json', 'corrigendum_note_en', 'scheduled_publish_at', 'views_count', 'apply_clicks_count', 'pdf_downloads_count', 'bookmarks_count']) {
    assert.ok(sql.includes(col), `Missing column ${col}`);
  }
  assert.ok(sql.includes('State Sector (Odisha)') && sql.includes('Central Sector') && sql.includes('odisha-age-relaxation'));
});

await check('2. End-to-end 3-Layer Taxonomy CRUD, Snippets, Article Draft -> Preview Token -> Publish -> Revision Rollback -> Telemetry', async () => {
  resetJobsPublishingSchemaMemo();
  const db = createMockDb();
  const env = { DB: db };
  const actor = { userId: 'adm-1', email: 'editor@csodisha.com', role: 'admin' };

  // Create L1 -> L2 -> L3 taxonomy nodes
  const rL1 = await handleJobsTaxonomyAdmin(new Request('https://csodisha.com/api/admin/jobs/taxonomy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 1, title_en: 'State Sector (Odisha)', title_or: 'ରାଜ୍ୟ ସରକାରୀ', icon: '🏛️' })
  }), env, actor, '', '');
  assert.equal(rL1.status, 201);
  assert.equal(rL1.headers.get('X-CSO-Cache-Purged'), '1');
  const l1 = (await rL1.json()).node;

  const rL2 = await handleJobsTaxonomyAdmin(new Request('https://csodisha.com/api/admin/jobs/taxonomy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 2, parent_id: l1.id, title_en: 'OPSC', title_or: 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ' })
  }), env, actor, '', '');
  assert.equal(rL2.status, 201);
  const l2 = (await rL2.json()).node;

  const rL3 = await handleJobsTaxonomyAdmin(new Request('https://csodisha.com/api/admin/jobs/taxonomy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 3, parent_id: l2.id, title_en: 'Permanent / Regular', title_or: 'ସ୍ଥାୟୀ' })
  }), env, actor, '', '');
  assert.equal(rL3.status, 201);
  const l3 = (await rL3.json()).node;

  // Create Bilingual Snippet
  const rSnip = await handleJobsSnippetsAdmin(new Request('https://csodisha.com/api/admin/jobs/snippets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title_en: 'Odisha Age Relaxation', title_or: 'ବୟସ ଛାଡ଼', category: 'eligibility', body_en: 'SEBC +5 yrs', body_or: '୫ ବର୍ଷ ଛାଡ଼' })
  }), env, actor, '');
  assert.equal(rSnip.status, 201);

  // Create Draft Job Article
  const rArt = await handleJobsArticlesAdmin(new Request('https://csodisha.com/api/admin/jobs/articles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title_en: 'OPSC OAS Civil Services 2026',
      title_or: 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ ୨୦୨୬',
      category_l1_id: l1.id, category_l2_id: l2.id, category_l3_id: l3.id,
      organisation_en: 'OPSC', total_vacancies: 399, min_age: 21, max_age: 38,
      last_date: '2027-01-15', official_apply_url: 'https://www.opsc.gov.in/',
      vacancy_breakdown: [{ post_name: 'OAS', vacancies: '120', qualification: 'Graduate', pay_level: 'Level-12' }],
      pdf_index_bookmarks: [{ page: 3, label: 'Page 3: Vacancy Table' }],
      is_published: 0
    })
  }), env, actor, '', '');
  assert.equal(rArt.status, 201);
  const art = (await rArt.json()).item;
  assert.equal(art.is_published, 0);
  assert.equal(db.revisions.length, 1);

  // Anonymous access to draft without preview_token must 404
  const blockedDraft = await handlePublicJobsArticleApi(
    new Request(`https://csodisha.com/api/public/jobs/article?slug=${encodeURIComponent(art.slug)}`), env
  );
  assert.equal(blockedDraft.status, 404);

  // Generate preview token
  const rTok = await handleJobsArticlesAdmin(new Request(`https://csodisha.com/api/admin/jobs/${art.id}/preview-token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  }), env, actor, art.id, 'preview-token');
  assert.equal(rTok.status, 200);
  const tokData = await rTok.json();
  assert.ok(tokData.preview_token.length >= 32);
  assert.ok(tokData.preview_url.includes(`/jobs/?slug=${art.slug}&preview_token=`));

  // Valid preview_token loads unpublished draft with Cache-Control: no-store
  const pvRes = await handlePublicJobsArticleApi(
    new Request(`https://csodisha.com/api/public/jobs/article?slug=${encodeURIComponent(art.slug)}&preview_token=${tokData.preview_token}`), env
  );
  assert.equal(pvRes.status, 200);
  assert.equal(pvRes.headers.get('Cache-Control'), 'no-store');
  const pvJson = await pvRes.json();
  assert.equal(pvJson.is_preview, true);
  assert.equal(pvJson.article.title_en, 'OPSC OAS Civil Services 2026');

  // Update & Publish Live
  const rPub = await handleJobsArticlesAdmin(new Request(`https://csodisha.com/api/admin/jobs/articles/${art.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title_en: 'OPSC OAS Civil Services 2026 (Updated)', total_vacancies: 420, is_published: 1, change_summary: 'Published live' })
  }), env, actor, art.id, '');
  assert.equal(rPub.status, 200);
  assert.equal(db.revisions.length, 2);

  // Public tree reports live count = 1 across L1, L2, L3
  const treeRes = await handlePublicJobsTreeApi(new Request('https://csodisha.com/api/public/jobs/tree'), env);
  const treeData = await treeRes.json();
  assert.equal(treeData.total_published_jobs, 1);
  assert.equal(treeData.tree[0].published_jobs_count, 1);
  assert.equal(treeData.tree[0].children[0].published_jobs_count, 1);
  assert.equal(treeData.tree[0].children[0].children[0].published_jobs_count, 1);

  // Public list filter by L1/L2/L3 + automatic scheduled publish check
  const schedRes = await handleJobsArticlesAdmin(new Request('https://csodisha.com/api/admin/jobs/articles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title_en: 'OSSC Past Deadline Closed Job',
      category_l1_id: l1.id, category_l2_id: l2.id,
      last_date: '2025-01-01', scheduled_publish_at: '2025-01-01 00:00:00', is_published: 0
    })
  }), env, actor, '', '');
  assert.equal(schedRes.status, 201);

  const listRes = await handlePublicJobsListApi(new Request(`https://csodisha.com/api/public/jobs?l1=${l1.id}`), env);
  const listData = await listRes.json();
  assert.equal(listData.total, 2, 'Scheduled due job auto-published');
  const closedJob = listData.items.find(x => x.title_en.includes('Closed Job'));
  assert.equal(closedJob.is_expired, true);
  assert.equal(closedJob.status_badge, 'Application Closed · Awaiting Exam/Result');

  // Telemetry increments
  const t1 = await handlePublicJobsTelemetryApi(new Request('https://csodisha.com/api/public/jobs/telemetry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: art.id, event: 'view' })
  }), env);
  assert.equal(t1.status, 200);
  await handlePublicJobsTelemetryApi(new Request('https://csodisha.com/api/public/jobs/telemetry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: art.id, event: 'apply_click' })
  }), env);
  await handlePublicJobsTelemetryApi(new Request('https://csodisha.com/api/public/jobs/telemetry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: art.id, event: 'pdf_download' })
  }), env);
  const storedArt = db.articles.get(art.id);
  assert.equal(storedArt.views_count, 1);
  assert.equal(storedArt.apply_clicks_count, 1);
  assert.equal(storedArt.pdf_downloads_count, 1);

  // Rollback to Revision #1
  const firstRev = db.revisions.find(r => r.article_id === art.id && r.revision_number === 1);
  const rRoll = await handleJobsArticlesAdmin(new Request(`https://csodisha.com/api/admin/jobs/${art.id}/rollback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision_id: firstRev.id })
  }), env, actor, art.id, 'rollback');
  assert.equal(rRoll.status, 200);
  assert.equal(db.articles.get(art.id).total_vacancies, 399);
  assert.ok(purgedUrls.some(u => u.includes('/api/public/jobs')));
});

await check('3. PDF-to-Article Auto-Draft Helper extracts Advt No, Vacancies, Dates, Age, Qualification & .gov.in URL', () => {
  const samplePdfText = '%PDF-1.4\n(Odisha Public Service Commission OPSC) (Advt. No. 12 of 2026) (Total Vacancies: 399) (Opening Date: 01-12-2026) (Last Date: 31-12-2026) (Age limit 21 to 38 years) (Qualification: Bachelor Degree in any discipline) (Apply at https://www.opsc.gov.in/apply)';
  const bytes = new TextEncoder().encode(samplePdfText);
  const ex = extractJobMetadataFromPdfBytes(bytes);
  assert.equal(ex.advt_number, '12 of 2026');
  assert.equal(ex.total_vacancies, 399);
  assert.equal(ex.application_start_date, '2026-12-01');
  assert.equal(ex.last_date, '2026-12-31');
  assert.equal(ex.min_age, 21);
  assert.equal(ex.max_age, 38);
  assert.equal(ex.qualification_level, 'Graduate (Any Discipline)');
  assert.equal(ex.official_apply_url, 'https://www.opsc.gov.in/apply');
});

await check('4. Admin Studio, Public Jobs Portal, Homepage & Candidate Hub wiring verified', () => {
  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('jobs-publishing-studio.css?v=20261124v249'));
  assert.ok(/jobs-publishing-studio\.js\?v=20261124v2(?:49|[5-9]\d)/.test(adminHtml), 'admin/index.html missing jobs-publishing-studio.js v249+');
  assert.ok(!adminHtml.includes('0 Child Modules'), 'admin/index.html must not hardcode 0 Child Modules');
  assert.ok(!read('admin/admin.js').includes('Child Modules'), 'admin/admin.js must not display 0 Child Modules');
  assert.ok(read('admin/admin.js').includes('CSOJobsPublishingStudio'));
  assert.ok(read('admin/command-suite.js').includes('Jobs Publishing House'));

  assert.ok(read('jobs/index.html').includes('jobs-portal.js?v=20261124v2'));
  assert.ok(read('jobs/index.html').includes('id="cso-jobs-portal-root"'));
  assert.ok(read('jobs-careers/index.html').includes('jobs-portal.js?v=20261124v2'));
  assert.ok(read('jobs-careers/index.html').includes('id="cso-jobs-portal-root"'));
  assert.ok(read('assets/app.js').includes('/api/public/jobs?limit=12'));
  assert.ok(read('functions/_lib/candidate-hub-governance.js').includes('FROM job_articles WHERE is_published = 1'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/jobs'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/jobs/tree'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/jobs/article'));
});

await check('5. Strict CSP compliance across all v249 HTML, CSS & JS files + sw.js bumped to cso-candidate-cache-v249', () => {
  for (const rel of ['admin/jobs-publishing-studio.js', 'assets/js/jobs-portal.js', 'admin/admin.js', 'admin/command-suite.js']) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\b/.test(src), `${rel} violates CSP (HTML injection)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=|\.style\s*=|setAttribute\(\s*['"]style/.test(src), `${rel} violates CSP (.style.*)`);
    assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(src), `${rel} has inline event handler`);
  }
  for (const rel of ['jobs/index.html', 'jobs-careers/index.html', 'admin/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style`);
  }
  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:49|[5-9]\d)';/.test(sw), 'sw.js must be bumped to v249+');
  assert.ok(sw.includes("url.pathname.startsWith('/api/') && !isNetworkFirstApi(url)"), 'sw.js must keep /api/* NetworkOnly');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:49|[5-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
