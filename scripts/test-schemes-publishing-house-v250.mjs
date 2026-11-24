#!/usr/bin/env node
/**
 * v250 Schemes & Welfare Publishing House, 3-Layer Taxonomy & Citizen Eligibility Engine Verification Suite
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  handleSchemesTaxonomyAdmin,
  handleSchemesArticlesAdmin,
  handlePublicSchemesTreeApi,
  handlePublicSchemesListApi,
  handlePublicSchemesArticleApi,
  handlePublicSchemesTelemetryApi,
  extractSchemeMetadataFromPdfBytes,
  resetSchemesPublishingSchemaMemo
} from '../functions/_lib/schemes-publishing-house.js';
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

console.log('\n=== v250 Schemes & Welfare Publishing House, 3-Layer Taxonomy & Eligibility Verification ===');

function createMockDb() {
  const taxonomy = new Map();
  const articles = new Map();
  const revisions = [];
  const auditLogs = [];

  return {
    taxonomy, articles, revisions, auditLogs,
    prepare(sql) {
      const s = sql.replace(/\s+/g, ' ').trim();
      return {
        _args: [],
        bind(...args) { this._args = args; return this; },
        async run() {
          if (s.startsWith('CREATE TABLE')) return { success: true };
          if (s.startsWith('INSERT INTO audit_log')) { auditLogs.push(this._args); return { success: true }; }
          if (s.startsWith('INSERT INTO scheme_taxonomy_nodes')) {
            const [id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published] = this._args;
            taxonomy.set(id, { id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at: new Date().toISOString() });
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_taxonomy_nodes SET sort_order')) {
            const [ord, id] = this._args;
            const n = taxonomy.get(id); if (n) n.sort_order = ord;
            return { success: true };
          }
          if (s.startsWith('DELETE FROM scheme_taxonomy_nodes WHERE id = ?')) {
            taxonomy.delete(this._args[0]);
            return { success: true };
          }
          if (s.startsWith('INSERT INTO scheme_articles')) {
            const a = this._args;
            const row = {
              id: a[0], slug: a[1], category_l1_id: a[2], category_l2_id: a[3], category_l3_id: a[4], gov_badge: a[5],
              title_en: a[6], title_or: a[7], summary_en: a[8], summary_or: a[9], department_en: a[10], department_or: a[11], scheme_code: a[12],
              benefit_amount_summary: a[13], benefit_frequency: a[14], dbt_mode: a[15], npci_seeding_required: a[16],
              prerequisite_otr_label: a[17], prerequisite_otr_url: a[18], target_beneficiaries: a[19],
              min_age: a[20], max_age: a[21], gender_eligibility: a[22], allowed_categories_json: a[23], max_annual_income: a[24],
              min_qualifying_marks: a[25], occupation_tag: a[26], odisha_domicile_required: a[27], renewal_type: a[28],
              stackable_policy: a[29], application_mode: a[30], application_start_date: a[31], last_date: a[32],
              institute_verification_date: a[33], dwo_sanction_date: a[34], is_ongoing: a[35],
              helpline_number: a[36], grievance_url: a[37], track_status_url: a[38],
              cover_image_url: a[39], cover_image_caption: a[40], article_body_en: a[41], article_body_or: a[42],
              benefits_breakdown_json: a[43], eligibility_rules_json: a[44], required_documents_json: a[45],
              application_steps_json: a[46], important_dates_json: a[47], faq_items_json: a[48],
              official_apply_url: a[49], official_portal_url: a[50], guidelines_pdf_url: a[51], application_form_pdf_url: a[52],
              pdf_index_bookmarks_json: a[53], extra_attachments_json: a[54], scheme_status: a[55],
              amendment_note_en: a[56], amendment_note_or: a[57], scheduled_publish_at: a[58],
              preview_token: '', preview_expires_at: '',
              is_featured: a[59], is_published: a[60],
              views_count: 0, apply_clicks_count: 0, pdf_downloads_count: 0, bookmarks_count: 0,
              published_at: a[61], updated_at: new Date().toISOString()
            };
            articles.set(row.id, row);
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_articles SET is_published = 1, published_at =')) {
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
          if (s.startsWith('UPDATE scheme_articles SET preview_token = ?')) {
            const [tok, exp, id] = this._args;
            const r = articles.get(id);
            if (r) { r.preview_token = tok; r.preview_expires_at = exp; }
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_articles SET slug = ?')) {
            const a = this._args;
            const id = a[a.length - 1];
            const r = articles.get(id);
            if (r) {
              r.slug = a[0]; r.title_en = a[5]; r.benefit_amount_summary = a[12];
              r.is_published = a[59]; r.published_at = a[60]; r.updated_at = new Date().toISOString();
            }
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_articles SET category_l1_id = ?')) {
            const a = this._args;
            const id = a[a.length - 1];
            const r = articles.get(id);
            if (r) { r.title_en = a[4]; r.benefit_amount_summary = a[11]; r.is_published = a[58]; }
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_articles SET views_count')) {
            const r = [...articles.values()].find(x => x.id === this._args[0] || x.slug === this._args[0]);
            if (r) r.views_count += 1;
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_articles SET apply_clicks_count')) {
            const r = [...articles.values()].find(x => x.id === this._args[0] || x.slug === this._args[0]);
            if (r) r.apply_clicks_count += 1;
            return { success: true };
          }
          if (s.startsWith('UPDATE scheme_articles SET pdf_downloads_count')) {
            const r = [...articles.values()].find(x => x.id === this._args[0] || x.slug === this._args[0]);
            if (r) r.pdf_downloads_count += 1;
            return { success: true };
          }
          if (s.startsWith('INSERT INTO scheme_article_revisions')) {
            const [id, article_id, revision_number, change_summary, snapshot_json, created_by] = this._args;
            revisions.push({ id, article_id, revision_number, change_summary, snapshot_json, created_by, created_at: new Date().toISOString() });
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (s.includes('FROM scheme_taxonomy_nodes WHERE id = ?')) return taxonomy.get(this._args[0]) || null;
          if (s.includes('MAX(sort_order) AS m FROM scheme_taxonomy_nodes')) return { m: taxonomy.size * 10 };
          if (s.includes('FROM scheme_articles WHERE id = ?')) return articles.get(this._args[0]) || null;
          if (s.includes('FROM scheme_articles WHERE slug = ? AND id != ?')) {
            return [...articles.values()].find(a => a.slug === this._args[0] && a.id !== this._args[1]) || null;
          }
          if (s.includes('FROM scheme_articles WHERE slug = ?')) {
            return [...articles.values()].find(a => a.slug === this._args[0]) || null;
          }
          if (s.includes('MAX(revision_number) AS m FROM scheme_article_revisions')) {
            const list = revisions.filter(r => r.article_id === this._args[0]);
            return { m: list.length ? Math.max(...list.map(x => x.revision_number)) : 0 };
          }
          if (s.includes('FROM scheme_article_revisions WHERE id = ? AND article_id = ?')) {
            return revisions.find(r => r.id === this._args[0] && r.article_id === this._args[1]) || null;
          }
          return null;
        },
        async all() {
          if (s.includes('FROM scheme_taxonomy_nodes WHERE is_published = 1')) {
            return { results: [...taxonomy.values()].filter(n => n.is_published === 1).sort((a, b) => a.level - b.level || a.sort_order - b.sort_order) };
          }
          if (s.includes('FROM scheme_taxonomy_nodes')) {
            return { results: [...taxonomy.values()].sort((a, b) => a.level - b.level || a.sort_order - b.sort_order) };
          }
          if (s.includes('FROM scheme_article_revisions WHERE article_id = ?')) {
            return { results: revisions.filter(r => r.article_id === this._args[0]).slice().reverse() };
          }
          if (s.includes('FROM scheme_articles WHERE is_published = 1 AND id != ?')) {
            return { results: [...articles.values()].filter(a => a.is_published === 1 && a.id !== this._args[0]) };
          }
          if (s.includes('FROM scheme_articles WHERE is_published = 1')) {
            return { results: [...articles.values()].filter(a => a.is_published === 1) };
          }
          if (s.includes('FROM scheme_articles')) {
            return { results: [...articles.values()] };
          }
          return { results: [] };
        }
      };
    },
    async batch(stmts) { for (const st of stmts) await st.run(); return []; }
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

await check('1. Migration 0139 creates all 3 scheme tables + starter 3-layer Odisha taxonomy + 4 bilingual scheme snippets', () => {
  const sql = read('migrations/0139_schemes_publishing_house.sql');
  for (const tbl of ['scheme_taxonomy_nodes', 'scheme_articles', 'scheme_article_revisions']) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table ${tbl}`);
  }
  for (const col of ['category_l1_id', 'category_l2_id', 'category_l3_id', 'npci_seeding_required', 'prerequisite_otr_label', 'allowed_categories_json', 'max_annual_income', 'min_qualifying_marks', 'institute_verification_date', 'dwo_sanction_date', 'preview_token', 'preview_expires_at', 'benefits_breakdown_json', 'required_documents_json', 'faq_items_json', 'amendment_note_en']) {
    assert.ok(sql.includes(col), `Missing column ${col}`);
  }
  assert.ok(sql.includes('Odisha State Government') && sql.includes('npci-aadhaar-bank-seeding-guide') && sql.includes('odisha-scholarship-otr-freeship-guide'));
});

await check('2. End-to-end 3-Layer Scheme Taxonomy, Draft -> Preview Token -> Publish -> Scheduled Auto-Publish -> Rollback -> Telemetry', async () => {
  resetSchemesPublishingSchemaMemo();
  const db = createMockDb();
  const env = { DB: db };
  const actor = { userId: 'adm-1', email: 'editor@csodisha.com', role: 'admin' };

  const rL1 = await handleSchemesTaxonomyAdmin(new Request('https://csodisha.com/api/admin/schemes/taxonomy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 1, title_en: 'Odisha State Government', title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାର' })
  }), env, actor, '', '');
  assert.equal(rL1.status, 201);
  assert.equal(rL1.headers.get('X-CSO-Cache-Purged'), '1');
  const l1 = (await rL1.json()).node;

  const rL2 = await handleSchemesTaxonomyAdmin(new Request('https://csodisha.com/api/admin/schemes/taxonomy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 2, parent_id: l1.id, title_en: 'Women & Child Empowerment (Subhadra)' })
  }), env, actor, '', '');
  const l2 = (await rL2.json()).node;

  const rL3 = await handleSchemesTaxonomyAdmin(new Request('https://csodisha.com/api/admin/schemes/taxonomy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 3, parent_id: l2.id, title_en: 'Direct Cash Transfer (DBT)' })
  }), env, actor, '', '');
  const l3 = (await rL3.json()).node;

  // Create Draft Scheme Article
  const rArt = await handleSchemesArticlesAdmin(new Request('https://csodisha.com/api/admin/schemes/articles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title_en: 'Subhadra Yojana Odisha 2026',
      title_or: 'ସୁଭଦ୍ରା ଯୋଜନା ଓଡ଼ିଶା ୨୦୨୬',
      category_l1_id: l1.id, category_l2_id: l2.id, category_l3_id: l3.id,
      department_en: 'WCD Dept, Odisha', benefit_amount_summary: '₹10,000 / Year',
      min_age: 21, max_age: 60, gender_eligibility: 'Female Only', max_annual_income: 250000,
      allowed_categories: ['UR', 'SEBC', 'SC', 'ST'], npci_seeding_required: 1, is_ongoing: 1,
      official_apply_url: 'https://subhadra.odisha.gov.in/', helpline_number: '14678',
      required_documents: [{ doc_key: 'aadhaar', document_name: 'Aadhaar Card', format_spec: 'PDF < 500KB', vault_sync: true }],
      is_published: 0
    })
  }), env, actor, '', '');
  assert.equal(rArt.status, 201);
  const art = (await rArt.json()).item;
  assert.equal(art.is_published, 0);
  assert.equal(db.revisions.length, 1);

  // Anonymous draft blocked (404)
  const blocked = await handlePublicSchemesArticleApi(new Request(`https://csodisha.com/api/public/schemes/article?slug=${encodeURIComponent(art.slug)}`), env);
  assert.equal(blocked.status, 404);

  // Generate Preview Token
  const rTok = await handleSchemesArticlesAdmin(new Request(`https://csodisha.com/api/admin/schemes/${art.id}/preview-token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  }), env, actor, art.id, 'preview-token');
  assert.equal(rTok.status, 200);
  const tok = await rTok.json();
  assert.ok(tok.preview_url.includes(`/schemes/?slug=${art.slug}&preview_token=`));

  // Valid token loads draft with Cache-Control: no-store
  const pvRes = await handlePublicSchemesArticleApi(new Request(`https://csodisha.com/api/public/schemes/article?slug=${encodeURIComponent(art.slug)}&preview_token=${tok.preview_token}`), env);
  assert.equal(pvRes.status, 200);
  assert.equal(pvRes.headers.get('Cache-Control'), 'no-store');
  const pvData = await pvRes.json();
  assert.equal(pvData.is_preview, true);

  // Publish Live + update benefit summary
  const rPub = await handleSchemesArticlesAdmin(new Request(`https://csodisha.com/api/admin/schemes/articles/${art.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title_en: 'Subhadra Yojana Odisha 2026 (Phase 2)', benefit_amount_summary: '₹50,000 (5 Yrs)', is_published: 1 })
  }), env, actor, art.id, '');
  assert.equal(rPub.status, 200);
  assert.equal(db.revisions.length, 2);

  // Tree counts reflect live scheme at all 3 levels
  const treeRes = await handlePublicSchemesTreeApi(new Request('https://csodisha.com/api/public/schemes/tree'), env);
  const treeData = await treeRes.json();
  assert.equal(treeData.total_published_schemes, 1);
  assert.equal(treeData.tree[0].published_schemes_count, 1);
  assert.equal(treeData.tree[0].children[0].published_schemes_count, 1);
  assert.equal(treeData.tree[0].children[0].children[0].published_schemes_count, 1);

  // Scheduled auto-publish test
  await handleSchemesArticlesAdmin(new Request('https://csodisha.com/api/admin/schemes/articles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title_en: 'CM-KISAN Odisha', category_l1_id: l1.id, scheduled_publish_at: '2025-01-01 00:00:00', is_published: 0 })
  }), env, actor, '', '');
  const listRes = await handlePublicSchemesListApi(new Request(`https://csodisha.com/api/public/schemes?l1=${l1.id}`), env);
  assert.equal((await listRes.json()).total, 2, 'Scheduled due scheme auto-published');

  // Telemetry
  await handlePublicSchemesTelemetryApi(new Request('https://csodisha.com/api/public/schemes/telemetry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: art.id, event: 'view' })
  }), env);
  await handlePublicSchemesTelemetryApi(new Request('https://csodisha.com/api/public/schemes/telemetry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: art.id, event: 'apply_click' })
  }), env);
  await handlePublicSchemesTelemetryApi(new Request('https://csodisha.com/api/public/schemes/telemetry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: art.id, event: 'pdf_download' })
  }), env);
  assert.equal(db.articles.get(art.id).views_count, 1);
  assert.equal(db.articles.get(art.id).apply_clicks_count, 1);
  assert.equal(db.articles.get(art.id).pdf_downloads_count, 1);

  // Rollback to Rev #1
  const rev1 = db.revisions.find(r => r.article_id === art.id && r.revision_number === 1);
  const rb = await handleSchemesArticlesAdmin(new Request(`https://csodisha.com/api/admin/schemes/${art.id}/rollback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision_id: rev1.id })
  }), env, actor, art.id, 'rollback');
  assert.equal(rb.status, 200);
  assert.equal(db.articles.get(art.id).benefit_amount_summary, '₹10,000 / Year');
  assert.ok(purgedUrls.some(u => u.includes('/api/public/schemes')));
});

await check('3. PDF-to-Scheme Auto-Draft Extractor parses Department, Benefit, Income Limit, Marks %, Age, Dates, Helpline & .gov.in URL', () => {
  const sample = '%PDF-1.4\n(Department of Higher Education, Government of Odisha) (Scholarship amount Rs. 10,000 per annum) (Annual family income limit Rs. 2.5 lakh) (Minimum 60% marks in last exam) (Age between 18 to 35 years) (Opening date: 01-12-2026) (Last date: 31-12-2026) (Toll free helpline 155335) (NPCI Aadhaar seeded DBT enabled) (Apply at https://scholarship.odisha.gov.in/apply)';
  const ex = extractSchemeMetadataFromPdfBytes(new TextEncoder().encode(sample));
  assert.ok(ex.department_en.includes('Department of Higher Education'));
  assert.ok(ex.benefit_amount_summary.includes('10,000'));
  assert.equal(ex.max_annual_income, 250000);
  assert.equal(ex.min_qualifying_marks, 60);
  assert.equal(ex.min_age, 18);
  assert.equal(ex.max_age, 35);
  assert.equal(ex.application_start_date, '2026-12-01');
  assert.equal(ex.last_date, '2026-12-31');
  assert.equal(ex.helpline_number, '155335');
  assert.equal(ex.npci_seeding_required, 1);
  assert.equal(ex.official_apply_url, 'https://scholarship.odisha.gov.in/apply');
});

await check('4. Admin Studio, Public Schemes Portal, Topbar Media CSS, Homepage & Candidate Hub sync verified', () => {
  assert.ok(read('admin/index.html').includes('schemes-publishing-studio.css?v=20261124v250'));
  assert.ok(read('admin/index.html').includes('schemes-publishing-studio.js?v=20261124v250'));
  assert.ok(read('admin/admin.js').includes('CSOSchemesPublishingStudio'));
  assert.ok(read('admin/command-suite.js').includes('Schemes Publishing House'));
  assert.ok(read('admin/command-suite.css').includes('white-space: nowrap; flex-shrink: 0;'));
  assert.ok(read('schemes/index.html').match(/(jobs|schemes|study|community|about)-portal\.js\?v=20261124v2[5-9]/));
  assert.ok(read('schemes/index.html').includes('id="cso-schemes-portal-root"'));
  assert.ok(read('schemes-benefits/index.html').match(/(jobs|schemes|study|community|about)-portal\.js\?v=20261124v2[5-9]/));
  assert.ok(read('assets/app.js').includes('/api/public/schemes?limit=12'));
  assert.ok(read('functions/_lib/candidate-hub-governance.js').includes('FROM scheme_articles WHERE is_published = 1'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/schemes'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/schemes/tree'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/schemes/article'));
});

await check('5. Strict CSP compliance across all v250 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v250', () => {
  for (const rel of ['admin/schemes-publishing-studio.js', 'assets/js/schemes-portal.js', 'admin/admin.js', 'admin/command-suite.js']) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\b/.test(src), `${rel} violates CSP (HTML injection)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=|\.style\s*=|setAttribute\(\s*['"]style/.test(src), `${rel} violates CSP (.style.*)`);
    assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(src), `${rel} has inline event handler`);
  }
  for (const rel of ['schemes/index.html', 'schemes-benefits/index.html', 'admin/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style`);
  }
  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2[5-9]\d';/.test(sw), 'sw.js must be bumped to v250+');
  assert.ok(sw.includes("url.pathname.startsWith('/api/') && !isNetworkFirstApi(url)"), 'sw.js must keep /api/* NetworkOnly');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2[5-9]\d';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
