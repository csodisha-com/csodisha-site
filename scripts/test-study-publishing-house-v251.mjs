#!/usr/bin/env node
/**
 * v251 Study Library, Curriculum & EdTech Publishing House Verification Suite
 * Tests:
 *  1. Migration 0140 schema (5 tables + starter 3-layer Odisha academic taxonomy + 4 bilingual study snippets)
 *  2. End-to-end 3-Layer Taxonomy CRUD, Study Module Draft -> Preview Token -> Publish -> Scheduled Auto-Publish -> Rollback -> Telemetry -> Reader Doubts Queue
 *  3. PDF-to-Study-Notes Auto-Draft Extractor (Exam Board, Paper Code, PYQ Year, Resource Type, Title & Summary)
 *  4. Admin Studio, Public Study Portal (Flip-Cards, Timed Exam Simulation, A4 Print, LearningResource JSON-LD), Jobs "Prepare for This Exam" Sync, Homepage & Candidate Hub wiring
 *  5. Strict CSP compliance across all v251 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v251
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractStudyMetadataFromPdfBytes,
  handleStudyTaxonomyAdmin,
  handleStudyArticlesAdmin,
  handleStudyDoubtsAdmin,
  handlePublicStudyTreeApi,
  handlePublicStudyListApi,
  handlePublicStudyArticleApi,
  handlePublicStudyTelemetryApi,
  handlePublicStudyDoubtsApi
} from '../functions/_lib/study-publishing-house.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v251 Study Library, Curriculum & EdTech Publishing House Verification ===');

// Lightweight in-memory mock D1 tailored for study_publishing_house handlers
function createMockD1() {
  const state = {
    study_taxonomy_nodes: [],
    study_articles: [],
    study_article_revisions: [],
    study_reader_doubts: [],
    candidate_study_progress: [],
    audit_log: [],
    rate_limits: new Map()
  };

  function makeStmt(sql) {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    const stmt = {
      _binds: [],
      bind(...args) { this._binds = args; return this; },
      async run() {
        const b = this._binds;
        if (/^CREATE TABLE/i.test(cleanSql)) return { success: true, meta: { changes: 0 } };
        if (/^INSERT INTO audit_log/i.test(cleanSql)) {
          state.audit_log.push({ sql: cleanSql, binds: b });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO study_taxonomy_nodes/i.test(cleanSql)) {
          state.study_taxonomy_nodes.push({
            id: b[0], level: b[1], parent_id: b[2], slug: b[3],
            title_en: b[4], title_or: b[5], subtitle_en: b[6], subtitle_or: b[7],
            icon: b[8], accent_variant: b[9], sort_order: b[10], is_published: b[11],
            updated_at: new Date().toISOString()
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^UPDATE study_taxonomy_nodes SET sort_order = \?/i.test(cleanSql)) {
          const n = state.study_taxonomy_nodes.find(x => x.id === b[1]);
          if (n) n.sort_order = b[0];
          return { success: true, meta: { changes: n ? 1 : 0 } };
        }
        if (/^UPDATE study_taxonomy_nodes SET/i.test(cleanSql)) {
          const id = b[b.length - 1];
          const n = state.study_taxonomy_nodes.find(x => x.id === id);
          if (n && /is_published = \?/.test(cleanSql)) n.is_published = b[0];
          return { success: true, meta: { changes: n ? 1 : 0 } };
        }
        if (/^DELETE FROM study_taxonomy_nodes WHERE id = \?/i.test(cleanSql)) {
          const idx = state.study_taxonomy_nodes.findIndex(x => x.id === b[0]);
          if (idx >= 0) state.study_taxonomy_nodes.splice(idx, 1);
          return { success: true, meta: { changes: idx >= 0 ? 1 : 0 } };
        }
        if (/^INSERT INTO study_articles/i.test(cleanSql)) {
          state.study_articles.push({
            id: b[0], slug: b[1], category_l1_id: b[2], category_l2_id: b[3], category_l3_id: b[4],
            resource_type_badge: b[5], difficulty_level: b[6], high_yield_priority: b[7], estimated_read_mins: b[8], negative_marking_rule: b[9],
            title_en: b[10], title_or: b[11], subtitle_en: b[12], subtitle_or: b[13], summary_en: b[14], summary_or: b[15],
            exam_board_tag: b[16], paper_code: b[17], pyq_year: b[18], language_medium: b[19],
            cover_image_url: b[20], cover_image_caption: b[21], article_body_en: b[22], article_body_or: b[23],
            syllabus_topics_json: b[24], key_facts_table_json: b[25], pyq_analysis_json: b[26], practice_mcqs_json: b[27],
            reference_links_json: b[28], linked_job_ids_json: b[29],
            notes_pdf_url: b[30], pyq_pdf_url: b[31], answer_key_pdf_url: b[32],
            pdf_index_bookmarks_json: b[33], extra_attachments_json: b[34],
            edition_note_en: b[35], edition_note_or: b[36], scheduled_publish_at: b[37],
            is_featured: b[38], is_free_access: b[39], is_published: b[40], published_at: b[41],
            preview_token: '', preview_expires_at: '',
            views_count: 0, pdf_downloads_count: 0, completions_count: 0, bookmarks_count: 0,
            updated_at: new Date().toISOString()
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^UPDATE study_articles SET is_published = 1,/i.test(cleanSql)) {
          const cutoff = String(b[0] || '').replace('T', ' ');
          let ch = 0;
          state.study_articles.forEach(a => {
            if (!a.is_published && a.scheduled_publish_at && String(a.scheduled_publish_at).replace('T', ' ') <= cutoff) {
              a.is_published = 1;
              if (!a.published_at) a.published_at = new Date().toISOString();
              ch++;
            }
          });
          return { success: true, meta: { changes: ch } };
        }
        if (/^UPDATE study_articles SET preview_token = \?/i.test(cleanSql)) {
          const a = state.study_articles.find(x => x.id === b[2]);
          if (a) { a.preview_token = b[0]; a.preview_expires_at = b[1]; }
          return { success: true, meta: { changes: a ? 1 : 0 } };
        }
        if (/^UPDATE study_articles SET (views_count|pdf_downloads_count|completions_count|bookmarks_count)/i.test(cleanSql)) {
          const col = cleanSql.match(/SET (\w+) =/)[1];
          const a = state.study_articles.find(x => x.id === b[0] || x.slug === b[0]);
          if (a) a[col] = Number(a[col] || 0) + 1;
          return { success: true, meta: { changes: a ? 1 : 0 } };
        }
        if (/^UPDATE study_articles SET category_l1_id = \?/i.test(cleanSql)) {
          // rollback update
          const id = b[b.length - 1];
          const a = state.study_articles.find(x => x.id === id);
          if (a) {
            a.category_l1_id = b[0]; a.category_l2_id = b[1]; a.category_l3_id = b[2];
            a.resource_type_badge = b[3]; a.difficulty_level = b[4]; a.high_yield_priority = b[5];
            a.estimated_read_mins = b[6]; a.negative_marking_rule = b[7];
            a.title_en = b[8]; a.title_or = b[9]; a.subtitle_en = b[10]; a.subtitle_or = b[11];
            a.summary_en = b[12]; a.summary_or = b[13];
            a.updated_at = new Date().toISOString();
          }
          return { success: true, meta: { changes: a ? 1 : 0 } };
        }
        if (/^UPDATE study_articles SET slug = \?/i.test(cleanSql)) {
          const id = b[b.length - 1];
          const a = state.study_articles.find(x => x.id === id);
          if (a) {
            a.slug = b[0]; a.category_l1_id = b[1]; a.category_l2_id = b[2]; a.category_l3_id = b[3];
            a.resource_type_badge = b[4]; a.difficulty_level = b[5]; a.high_yield_priority = b[6];
            a.estimated_read_mins = b[7]; a.negative_marking_rule = b[8];
            a.title_en = b[9]; a.title_or = b[10]; a.subtitle_en = b[11]; a.subtitle_or = b[12];
            a.summary_en = b[13]; a.summary_or = b[14];
            a.is_published = b[39]; a.published_at = b[40];
            a.updated_at = new Date().toISOString();
          }
          return { success: true, meta: { changes: a ? 1 : 0 } };
        }
        if (/^INSERT INTO study_article_revisions/i.test(cleanSql)) {
          state.study_article_revisions.push({
            id: b[0], article_id: b[1], revision_number: b[2], change_summary: b[3],
            snapshot_json: b[4], created_by: b[5], created_at: new Date().toISOString()
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO study_reader_doubts/i.test(cleanSql)) {
          state.study_reader_doubts.push({
            id: b[0], article_id: b[1], user_id: b[2], reader_name: b[3], doubt_type: b[4],
            message_text: b[5], admin_reply: '', status: 'open', created_at: new Date().toISOString(), resolved_at: ''
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^UPDATE study_reader_doubts SET admin_reply = \?/i.test(cleanSql)) {
          const d = state.study_reader_doubts.find(x => x.id === b[3]);
          if (d) { d.admin_reply = b[0]; d.status = b[1]; d.resolved_at = b[2]; }
          return { success: true, meta: { changes: d ? 1 : 0 } };
        }
        if (/^INSERT INTO rate_limits/i.test(cleanSql)) return { success: true, meta: { changes: 1 } };
        return { success: true, meta: { changes: 0 } };
      },
      async first() {
        const b = this._binds;
        if (/FROM study_taxonomy_nodes WHERE id = \?/i.test(cleanSql)) {
          return state.study_taxonomy_nodes.find(x => x.id === b[0]) || null;
        }
        if (/MAX\(sort_order\) AS m FROM study_taxonomy_nodes/i.test(cleanSql)) {
          const ms = state.study_taxonomy_nodes.filter(x => x.level === b[0] && (x.parent_id || '') === (b[1] || ''));
          return { m: ms.reduce((acc, x) => Math.max(acc, x.sort_order), 0) };
        }
        if (/COUNT\(\*\) AS n FROM study_taxonomy_nodes WHERE parent_id = \?/i.test(cleanSql)) {
          return { n: state.study_taxonomy_nodes.filter(x => x.parent_id === b[0]).length };
        }
        if (/FROM study_articles WHERE slug = \? AND id != \?/i.test(cleanSql)) {
          return state.study_articles.find(x => x.slug === b[0] && x.id !== b[1]) || null;
        }
        if (/FROM study_articles WHERE slug = \?/i.test(cleanSql)) {
          return state.study_articles.find(x => x.slug === b[0]) || null;
        }
        if (/FROM study_articles WHERE id = \?/i.test(cleanSql)) {
          return state.study_articles.find(x => x.id === b[0]) || null;
        }
        if (/MAX\(revision_number\) AS m FROM study_article_revisions/i.test(cleanSql)) {
          const rs = state.study_article_revisions.filter(x => x.article_id === b[0]);
          return { m: rs.reduce((acc, x) => Math.max(acc, x.revision_number), 0) };
        }
        if (/FROM study_article_revisions WHERE id = \? AND article_id = \?/i.test(cleanSql)) {
          return state.study_article_revisions.find(x => x.id === b[0] && x.article_id === b[1]) || null;
        }
        if (/COUNT\(\*\) AS n FROM study_reader_doubts WHERE status = 'open'/i.test(cleanSql)) {
          return { n: state.study_reader_doubts.filter(x => x.status === 'open').length };
        }
        if (/FROM study_reader_doubts WHERE id = \?/i.test(cleanSql)) {
          return state.study_reader_doubts.find(x => x.id === b[0]) || null;
        }
        if (/FROM rate_limits/i.test(cleanSql)) return { count: 1 };
        return null;
      },
      async all() {
        const b = this._binds;
        if (/FROM study_taxonomy_nodes WHERE is_published = 1/i.test(cleanSql)) {
          return { results: state.study_taxonomy_nodes.filter(x => x.is_published) };
        }
        if (/FROM study_taxonomy_nodes WHERE level = \?/i.test(cleanSql)) {
          return { results: state.study_taxonomy_nodes.filter(x => x.level === b[0] && (x.parent_id || '') === (b[1] || '')) };
        }
        if (/FROM study_taxonomy_nodes/i.test(cleanSql)) {
          return { results: [...state.study_taxonomy_nodes] };
        }
        if (/FROM study_articles WHERE is_published = 1 AND id != \?/i.test(cleanSql)) {
          return { results: state.study_articles.filter(x => x.is_published && x.id !== b[0]) };
        }
        if (/FROM study_articles WHERE is_published = 1 AND category_l2_id = \?/i.test(cleanSql)) {
          return { results: state.study_articles.filter(x => x.is_published && x.category_l2_id === b[0]) };
        }
        if (/FROM study_articles WHERE is_published = 1/i.test(cleanSql)) {
          return { results: state.study_articles.filter(x => x.is_published) };
        }
        if (/FROM study_articles/i.test(cleanSql)) {
          return { results: [...state.study_articles] };
        }
        if (/FROM study_article_revisions WHERE article_id = \?/i.test(cleanSql)) {
          return { results: state.study_article_revisions.filter(x => x.article_id === b[0]).sort((a, c) => c.revision_number - a.revision_number) };
        }
        if (/FROM study_reader_doubts/i.test(cleanSql)) {
          return {
            results: state.study_reader_doubts.map(d => {
              const art = state.study_articles.find(a => a.id === d.article_id);
              return { ...d, article_title: art ? art.title_en : '', article_slug: art ? art.slug : '' };
            })
          };
        }
        return { results: [] };
      }
    };
    return stmt;
  }

  return {
    state,
    prepare: (sql) => makeStmt(sql),
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    }
  };
}

// ============================================================================
// TEST 1: Migration 0140 Schema & Seeds
// ============================================================================
await check('1. Migration 0140 creates all 5 study tables + starter 3-layer Odisha taxonomy + 4 bilingual study snippets', () => {
  const sql = read('migrations/0140_study_library_publishing_house.sql');
  [
    'CREATE TABLE IF NOT EXISTS study_taxonomy_nodes',
    'CREATE TABLE IF NOT EXISTS study_articles',
    'CREATE TABLE IF NOT EXISTS study_article_revisions',
    'CREATE TABLE IF NOT EXISTS candidate_study_progress',
    'CREATE TABLE IF NOT EXISTS study_reader_doubts',
    'resource_type_badge',
    'high_yield_priority',
    'negative_marking_rule',
    'syllabus_topics_json',
    'key_facts_table_json',
    'pyq_analysis_json',
    'practice_mcqs_json',
    'linked_job_ids_json',
    'pdf_index_bookmarks_json',
    'Odisha Civil Services (OPSC OAS)',
    'OSSC & OSSSC Combined Exams (CGL / RI / ARI / PEO)',
    'Teaching & TET (OTET / OSSTET / OAVS / B.Ed)',
    'Odisha GK, History & Culture',
    'Odia Language & Grammar',
    'UGC NET & Higher Education',
    'Odisha GK Quick Fact Box Template',
    'OPSC / OSSC Negative Marking & Exam Hall Rules',
    'Odia Grammar Sandhi & Samasa Summary Block',
    'PYQ Trend & High-Yield Chapter Callout'
  ].forEach(tok => assert.ok(sql.includes(tok), `Migration 0140 missing: ${tok}`));
});

// ============================================================================
// TEST 2: End-to-End Backend Lifecycle
// ============================================================================
await check('2. End-to-end 3-Layer Taxonomy, Draft -> Preview Token -> Publish -> Scheduled Auto-Publish -> Rollback -> Telemetry -> Doubts Queue', async () => {
  const db = createMockD1();
  const env = { DB: db };
  const actor = { userId: 'adm-1', email: 'editor@csodisha.com', role: 'admin' };
  const req = (url, method = 'GET', body = null) => new Request('https://csodisha.com' + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });

  // Create 3-layer taxonomy L1 -> L2 -> L3
  const l1 = await (await handleStudyTaxonomyAdmin(req('/api/admin/study/taxonomy', 'POST', { level: 1, title_en: 'OPSC OAS', title_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା' }), env, actor)).json();
  assert.ok(l1.ok && l1.node.id);
  const l2 = await (await handleStudyTaxonomyAdmin(req('/api/admin/study/taxonomy', 'POST', { level: 2, parent_id: l1.node.id, title_en: 'Odisha History' }), env, actor)).json();
  assert.ok(l2.ok && l2.node.parent_id === l1.node.id);
  const l3 = await (await handleStudyTaxonomyAdmin(req('/api/admin/study/taxonomy', 'POST', { level: 3, parent_id: l2.node.id, title_en: 'Chapter Study Notes' }), env, actor)).json();
  assert.ok(l3.ok && l3.node.parent_id === l2.node.id);

  // Create Draft Study Module
  const created = await (await handleStudyArticlesAdmin(req('/api/admin/study/articles', 'POST', {
    title_en: 'Paika Rebellion 1817 — Complete OPSC Notes',
    title_or: 'ପାଇକ ବିଦ୍ରୋହ ୧୮୧୭ — ସମ୍ପୂର୍ଣ୍ଣ ନୋଟ୍ସ',
    category_l1_id: l1.node.id,
    category_l2_id: l2.node.id,
    category_l3_id: l3.node.id,
    resource_type_badge: 'Study Notes',
    high_yield_priority: 'Must-Study',
    negative_marking_rule: '-0.33 (OPSC/UPSC)',
    key_facts_table: [{ term_en: 'Leader', fact_en: 'Bakshi Jagabandhu' }],
    practice_mcqs: [{ question_en: 'When did Paika Rebellion begin?', options: ['1817', '1857', '1905', '1936'], correct_index: 0, explanation_en: 'Started in Khordha in 1817.' }],
    is_published: 0
  }), env, actor)).json();
  assert.ok(created.ok && created.item.id && !created.item.is_published);

  // Public access to draft without token must fail with 404
  const unauthDraft = await handlePublicStudyArticleApi(req(`/api/public/study/article?slug=${created.item.slug}`), env);
  assert.equal(unauthDraft.status, 404);

  // Mint preview token and verify draft preview succeeds with no-store
  const prevTok = await (await handleStudyArticlesAdmin(req(`/api/admin/study/${created.item.id}/preview-token`, 'POST', {}), env, actor, created.item.id, 'preview-token')).json();
  assert.ok(prevTok.preview_token && prevTok.preview_url.includes('preview_token='));
  const prevRes = await handlePublicStudyArticleApi(req(`/api/public/study/article?slug=${created.item.slug}&preview_token=${prevTok.preview_token}`), env);
  assert.equal(prevRes.status, 200);
  assert.equal(prevRes.headers.get('Cache-Control'), 'no-store');
  const prevData = await prevRes.json();
  assert.equal(prevData.is_preview, true);

  // Update & Publish Live -> Revision #2 created
  const pubRes = await (await handleStudyArticlesAdmin(req(`/api/admin/study/articles/${created.item.id}`, 'PUT', {
    title_en: 'Paika Rebellion 1817 — Revised 2026 Edition',
    is_published: 1
  }), env, actor, created.item.id)).json();
  assert.ok(pubRes.ok && pubRes.item.is_published);

  // Public Tree & List reflect published module
  const treeRes = await (await handlePublicStudyTreeApi(req('/api/public/study/tree'), env)).json();
  assert.equal(treeRes.total_published_modules, 1);
  const listRes = await (await handlePublicStudyListApi(req(`/api/public/study?l1=${l1.node.id}`), env)).json();
  assert.equal(listRes.total, 1);

  // Scheduled auto-publish test
  const schedCreated = await (await handleStudyArticlesAdmin(req('/api/admin/study/articles', 'POST', {
    title_en: 'OPSC GS-I Scheduled PYQ Pack',
    category_l1_id: l1.node.id,
    scheduled_publish_at: '2020-01-01 00:00:00',
    is_published: 0
  }), env, actor)).json();
  assert.equal(schedCreated.item.is_published, false);
  const afterSchedList = await (await handlePublicStudyListApi(req('/api/public/study'), env)).json();
  assert.equal(afterSchedList.total, 2, 'Scheduled study article past its publish time must auto-publish');

  // Revision Rollback back to Rev #1
  const revs = await (await handleStudyArticlesAdmin(req(`/api/admin/study/${created.item.id}/revisions`), env, actor, created.item.id, 'revisions')).json();
  assert.ok(revs.items.length >= 2);
  const rev1 = revs.items.find(r => r.revision_number === 1);
  const rolled = await (await handleStudyArticlesAdmin(req(`/api/admin/study/${created.item.id}/rollback`, 'POST', { revision_id: rev1.id }), env, actor, created.item.id, 'rollback')).json();
  assert.equal(rolled.item.title_en, 'Paika Rebellion 1817 — Complete OPSC Notes');

  // Telemetry increment
  await handlePublicStudyTelemetryApi(req('/api/public/study/telemetry', 'POST', { event: 'view', id: created.item.id }), env);
  await handlePublicStudyTelemetryApi(req('/api/public/study/telemetry', 'POST', { event: 'pdf_download', id: created.item.id }), env);
  const artAfterTel = db.state.study_articles.find(a => a.id === created.item.id);
  assert.equal(artAfterTel.views_count, 1);
  assert.equal(artAfterTel.pdf_downloads_count, 1);

  // Reader Doubt submission + Admin Reply & Resolve
  const doubtSub = await (await handlePublicStudyDoubtsApi(req('/api/public/study/doubts', 'POST', {
    article_id: created.item.id,
    reader_name: 'Subham Mohanty',
    doubt_type: 'pyq_typo',
    message_text: 'Question 3 date should mention March 1817.'
  }), env)).json();
  assert.ok(doubtSub.ok && doubtSub.id);
  const adminDoubts = await (await handleStudyDoubtsAdmin(req('/api/admin/study/doubts?status=open'), env, actor)).json();
  assert.equal(adminDoubts.open_count, 1);
  const resolved = await (await handleStudyDoubtsAdmin(req(`/api/admin/study/doubts/${doubtSub.id}`, 'PUT', {
    admin_reply: 'Verified & updated to March 1817.',
    status: 'resolved'
  }), env, actor, doubtSub.id)).json();
  assert.equal(resolved.item.status, 'resolved');
});

// ============================================================================
// TEST 3: PDF-to-Study-Notes Auto-Draft Extractor
// ============================================================================
await check('3. PDF-to-Study-Notes Auto-Draft Extractor parses Exam Board, Paper Code, PYQ Year, Resource Type & Summary', () => {
  const samplePdf = Buffer.from(
    '%PDF-1.4\n'
    + '(OPSC Odisha Civil Services Preliminary Examination 2025 Previous Year Question Paper)\n'
    + '(Paper Code: GS-I General Studies Paper 1)\n'
    + '(Odisha Public Service Commission solved paper with answer key and detailed explanations.)\n'
    + '%%EOF',
    'utf8'
  );
  const draft = extractStudyMetadataFromPdfBytes(new Uint8Array(samplePdf));
  assert.ok(draft.exam_board_tag.includes('OPSC'), 'Should detect OPSC exam board');
  assert.equal(draft.paper_code, 'GS-I');
  assert.equal(draft.pyq_year, '2025');
  assert.equal(draft.resource_type_badge, 'PYQ Paper');
  assert.ok(draft.title_en.includes('OPSC'));
  assert.ok(draft.summary_en.length > 20);
});

// ============================================================================
// TEST 4: Full Wiring Verification
// ============================================================================
await check('4. Admin Studio, Public Study Portal, Jobs Kit Sync, Homepage & Candidate Hub wiring verified', () => {
  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('study-publishing-studio.css?v=20261124v251'));
  assert.ok(adminHtml.includes('study-publishing-studio.js?v=20261124v251'));

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('CSOStudyPublishingStudio') && adminJs.includes('openStudyPublishingTab'));

  const cmdSuiteJs = read('admin/command-suite.js');
  assert.ok(cmdSuiteJs.includes('Study Library Studio') && cmdSuiteJs.includes('study_articles'));

  const router = read('functions/api/admin/_router.js');
  assert.ok(router.includes("case 'study':") && router.includes('handleStudyDoubtsAdmin'));

  const worker = read('_worker.js');
  assert.ok(worker.includes('/api/public/study/tree') && worker.includes('/api/public/study/article') && worker.includes('/api/candidate/study-progress'));

  const inv = read('functions/_lib/edge-cache-invalidator.js');
  assert.ok(inv.includes('/api/public/study/tree') && inv.includes('/api/public/study/article'));

  const mediaServe = read('functions/api/media/_serve.js');
  assert.ok(mediaServe.includes('study-publishing'));

  const jobsLib = read('functions/_lib/jobs-publishing-house.js');
  assert.ok(jobsLib.includes('study_article:') && jobsLib.includes('linked_job_ids_json'));

  const studyHtml = read('study-library/index.html');
  assert.ok(studyHtml.includes('id="cso-study-portal-root"') && studyHtml.includes('study-portal.js?v=20261124v251'));
  const studyHubHtml = read('study/index.html');
  assert.ok(studyHubHtml.includes('id="cso-study-portal-root"') && studyHubHtml.includes('study-portal.js?v=20261124v251'));

  const portalCss = read('assets/css/study-portal.css');
  assert.ok(portalCss.includes('@media print') && portalCss.includes('.sp-flashcard'));

  const portalJs = read('assets/js/study-portal.js');
  assert.ok(portalJs.includes('LearningResource') && portalJs.includes('Flip-Card Revision Mode') && portalJs.includes('Timed Exam Simulation'));

  const appJs = read('assets/app.js');
  assert.ok(appJs.includes('/api/public/study?limit=12') && appJs.includes('csoMapStudyArticlesToUpdates'));

  const candGov = read('functions/_lib/candidate-hub-governance.js');
  assert.ok(candGov.includes('candidate_study_progress') && candGov.includes('study_materials'));
});

// ============================================================================
// TEST 5: Strict CSP Compliance + Service Worker v251
// ============================================================================
await check('5. Strict CSP compliance across all v251 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v251', () => {
  const jsFiles = [
    'admin/study-publishing-studio.js',
    'assets/js/study-portal.js'
  ];
  const badSinkRe = /\.(?:innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|\.style\.[a-zA-Z]+\s*=/;
  for (const rel of jsFiles) {
    const src = read(rel);
    assert.ok(!badSinkRe.test(src), `CSP violation found in ${rel}`);
  }

  for (const rel of ['study-library/index.html', 'study/index.html', 'admin/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `Inline handler found in ${rel}`);
    assert.ok(!/\sstyle="/i.test(html), `Inline style attribute found in ${rel}`);
  }

  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v25[1-9]';/.test(sw), 'sw.js must be bumped to v251+');
  assert.ok(sw.includes("'/assets/js/study-portal.js'") && sw.includes("'/assets/css/study-portal.css'"));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v25[1-9]';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
