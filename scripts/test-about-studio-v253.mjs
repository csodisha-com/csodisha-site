#!/usr/bin/env node
/**
 * v253 About & Institutional Transparency Publishing House Verification Suite
 *
 * Tests:
 *  1. Migration 0142 creates all 5 tables, starter 3-layer institutional taxonomy (18 nodes),
 *     2 starter institutional pages, and 11 verified Odisha & Central .gov.in portals
 *  2. Zero-Stale-Cache Architecture & Full End-to-End SQLite Backend Flow:
 *     - 3-layer taxonomy CRUD + Cache-Control: no-store, max-age=0 + X-CSO-Cache-Purged: 1 + audit_log
 *     - Article create/edit + time-limited draft preview token (/about/?slug=...&preview_token=...)
 *     - Scheduled scheduled_publish_at auto-visibility on public pages endpoint
 *     - Revision snapshot history & 1-click rollback
 *     - Verified .gov.in Official Sources Registry CRUD + live public directory
 *     - Public Inquiries Desk submit + Admin status/reply resolution
 *     - Live Platform Transparency counters & view/PDF telemetry endpoint
 *  3. Topbar Media button CSS fix (.cs-topbar-media white-space/flex-shrink/min-width)
 *  4. Full Wiring across Admin Studio (5 Tabs), Public About Portal, Command Suite, Edge Invalidator & _worker.js
 *  5. Strict CSP Compliance across all v253 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v253
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import {
  handleAboutTaxonomyAdmin,
  handleAboutArticlesAdmin,
  handleAboutSourcesAdmin,
  handleAboutInquiriesAdmin,
  handlePublicAboutTreeApi,
  handlePublicAboutPagesApi,
  handlePublicAboutArticleApi,
  handlePublicAboutSourcesApi,
  handlePublicAboutInquiriesApi,
  handlePublicAboutTelemetryApi
} from '../functions/_lib/about-publishing-house.js';
import { CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

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

console.log('\n=== v253 About & Institutional Transparency Publishing House Verification ===');

function createSqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT,
      action TEXT,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE admin_rate_limits (
      key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE job_articles (id TEXT PRIMARY KEY, is_published INTEGER DEFAULT 1);
    CREATE TABLE scheme_articles (id TEXT PRIMARY KEY, is_published INTEGER DEFAULT 1);
    CREATE TABLE study_articles (id TEXT PRIMARY KEY, is_published INTEGER DEFAULT 1);
    CREATE TABLE community_posts (id TEXT PRIMARY KEY, moderation_status TEXT DEFAULT 'published');
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT);
    INSERT INTO job_articles VALUES ('j1', 1), ('j2', 1);
    INSERT INTO scheme_articles VALUES ('s1', 1);
    INSERT INTO study_articles VALUES ('st1', 1);
    INSERT INTO community_posts VALUES ('c1', 'published');
    INSERT INTO users VALUES ('u1', 'aspirant@odisha.in');
  `);
  const migSql = read('migrations/0142_about_institutional_studio.sql');
  sqlite.exec(migSql);

  function wrap(sql) {
    let params = [];
    const stmt = {
      bind(...args) { params = args; return stmt; },
      async run() {
        const s = sqlite.prepare(sql);
        const res = s.run(...params);
        return { success: true, meta: { changes: Number(res.changes || 0) } };
      },
      async first(col) {
        const s = sqlite.prepare(sql);
        const row = s.get(...params);
        if (!row) return null;
        return col ? row[col] : row;
      },
      async all() {
        const s = sqlite.prepare(sql);
        const rows = s.all(...params);
        return { success: true, results: rows };
      }
    };
    return stmt;
  }

  return {
    sqlite,
    prepare(sql) { return wrap(sql); },
    async batch(stmts) {
      const out = [];
      for (const st of stmts) out.push(await st.all());
      return out;
    }
  };
}

const actor = { userId: 'admin-1', email: 'editor@csodisha.com', role: 'super_admin' };
const db = createSqliteD1();
const env = { DB: db };

const reqJson = (url, method, body) => new Request(url, {
  method,
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
  body: body !== undefined ? JSON.stringify(body) : undefined
});

await check('Migration 0142 creates all 5 tables and seeds starter 3-layer taxonomy, 2 pages & 11 verified .gov.in portals', async () => {
  const taxCount = db.sqlite.prepare('SELECT COUNT(*) AS c FROM about_taxonomy_nodes').get().c;
  const l1Count = db.sqlite.prepare('SELECT COUNT(*) AS c FROM about_taxonomy_nodes WHERE level = 1').get().c;
  const l2Count = db.sqlite.prepare('SELECT COUNT(*) AS c FROM about_taxonomy_nodes WHERE level = 2').get().c;
  const l3Count = db.sqlite.prepare('SELECT COUNT(*) AS c FROM about_taxonomy_nodes WHERE level = 3').get().c;
  const pagesCount = db.sqlite.prepare('SELECT COUNT(*) AS c FROM about_articles').get().c;
  const sourcesCount = db.sqlite.prepare('SELECT COUNT(*) AS c FROM about_official_sources').get().c;
  assert.ok(taxCount >= 18, `Expected >= 18 starter taxonomy nodes, got ${taxCount}`);
  assert.equal(l1Count, 6);
  assert.ok(l2Count >= 6);
  assert.ok(l3Count >= 6);
  assert.ok(pagesCount >= 2, `Expected >= 2 starter pages, got ${pagesCount}`);
  assert.ok(sourcesCount >= 11, `Expected >= 11 verified .gov.in portals, got ${sourcesCount}`);
});

let customL1Id = '';
await check('3-Layer Taxonomy Admin CRUD + X-CSO-Cache-Purged: 1 + Public Tree Cache-Control: no-store & Transparency KPIs', async () => {
  const createRes = await handleAboutTaxonomyAdmin(
    reqJson('https://csodisha.com/api/admin/about/taxonomy', 'POST', {
      level: 1,
      title_en: 'Open Data & Audits',
      title_or: 'ଖୋଲା ତଥ୍ୟ ଓ ଅଡିଟ୍',
      subtitle_en: 'Quarterly transparency audits',
      icon: '📊',
      accent_variant: 'emerald',
      sort_order: 70
    }),
    env, actor, null
  );
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');
  const created = await createRes.json();
  assert.equal(created.ok, true);
  customL1Id = created.node.id;

  const treeRes = await handlePublicAboutTreeApi(new Request('https://csodisha.com/api/public/about/tree'), env);
  assert.equal(treeRes.status, 200);
  assert.equal(treeRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const treeBody = await treeRes.json();
  assert.ok(treeBody.tree.some(n => n.id === customL1Id), 'Newly created L1 node must appear immediately in public tree');
  assert.equal(treeBody.transparency.verified_jobs, 2);
  assert.equal(treeBody.transparency.active_schemes, 1);
  assert.equal(treeBody.transparency.study_modules, 1);
  assert.equal(treeBody.transparency.community_members, 1);
  assert.ok(treeBody.transparency.verified_portals >= 11);
});

let draftId = '';
let draftSlug = '';
await check('Article Draft Creation, Private Rejection, Real Draft Preview Token, Revision Rollback & Scheduled Auto-Publish', async () => {
  const createRes = await handleAboutArticlesAdmin(
    reqJson('https://csodisha.com/api/admin/about/articles', 'POST', {
      title_en: 'CSO Annual Civic Transparency Report 2026',
      title_or: 'CSO ବାର୍ଷିକ ସ୍ୱଚ୍ଛତା ରିପୋର୍ଟ ୨୦୨୬',
      summary_en: 'Independent audit of verified job alerts, schemes, and study kits across 30 Odisha districts.',
      doc_type_badge: 'Impact Report',
      category_l1_id: customL1Id,
      article_body_en: '## Executive Summary\nAll public notices undergo 3-tier verification.',
      impact_metrics_json: [{ value: '30 / 30', label_en: 'Odisha Districts', label_or: 'ଜିଲ୍ଲା' }],
      highlights_table_json: [{ key_en: 'Editorial Desk', value_en: 'Verification Lead · Khordha' }],
      verification_steps_json: [{ step: '1', title_en: 'Primary .gov.in Gazette Verification', detail_en: 'Check official notification PDF.' }],
      reference_links_json: [{ label: 'OPSC Portal', url: 'https://www.opsc.gov.in/' }],
      faq_items_json: [{ q_en: 'Is CSO affiliated with any government agency?', a_en: 'No, CSO is an independent public resource.' }],
      is_published: false
    }),
    env, actor, null, null
  );
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');
  const created = await createRes.json();
  draftId = created.item.id;
  draftSlug = created.item.slug;

  // Draft must NOT be accessible publicly without preview_token
  const noTokRes = await handlePublicAboutArticleApi(
    new Request(`https://csodisha.com/api/public/about/article?slug=${encodeURIComponent(draftSlug)}`),
    env
  );
  assert.equal(noTokRes.status, 404);
  assert.equal(noTokRes.headers.get('Cache-Control'), 'no-store, max-age=0');

  // Generate time-limited preview token
  const tokRes = await handleAboutArticlesAdmin(
    reqJson(`https://csodisha.com/api/admin/about/articles/${draftId}/preview-token`, 'POST', {}),
    env, actor, draftId, 'preview-token'
  );
  assert.equal(tokRes.status, 200);
  const tokBody = await tokRes.json();
  assert.ok(tokBody.preview_url.includes(`/about/?slug=${encodeURIComponent(draftSlug)}&preview_token=`));

  // Draft IS accessible with valid preview token
  const prevRes = await handlePublicAboutArticleApi(
    new Request(`https://csodisha.com/api/public/about/article?slug=${encodeURIComponent(draftSlug)}&preview_token=${encodeURIComponent(tokBody.preview_token)}`),
    env
  );
  assert.equal(prevRes.status, 200);
  assert.equal(prevRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const prevBody = await prevRes.json();
  assert.equal(prevBody.is_preview, true);
  assert.equal(prevBody.article.title_en, 'CSO Annual Civic Transparency Report 2026');

  // Edit article (creates revision #2) & set past scheduled_publish_at to test scheduled auto-publish
  const pastIso = new Date(Date.now() - 60000).toISOString();
  const updRes = await handleAboutArticlesAdmin(
    reqJson(`https://csodisha.com/api/admin/about/articles/${draftId}`, 'PUT', {
      title_en: 'CSO Annual Transparency Report 2026 (Revised)',
      scheduled_publish_at: pastIso,
      is_published: false,
      change_summary: 'Updated headline & scheduled past publish_at'
    }),
    env, actor, draftId, null
  );
  assert.equal(updRes.status, 200);
  assert.equal(updRes.headers.get('X-CSO-Cache-Purged'), '1');

  // Scheduled auto-publish makes it live on /api/public/about/pages
  const pagesRes = await handlePublicAboutPagesApi(new Request('https://csodisha.com/api/public/about/pages'), env);
  assert.equal(pagesRes.status, 200);
  assert.equal(pagesRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const pagesBody = await pagesRes.json();
  assert.ok(pagesBody.items.some(p => p.id === draftId), 'Scheduled article with past scheduled_publish_at must appear live');

  // Check revisions and rollback to revision #1
  const revsRes = await handleAboutArticlesAdmin(
    new Request(`https://csodisha.com/api/admin/about/articles/${draftId}/revisions`),
    env, actor, draftId, 'revisions'
  );
  const revsBody = await revsRes.json();
  assert.ok(revsBody.items.length >= 2, 'Expected at least 2 revision snapshots');
  const rev1 = revsBody.items.find(r => r.revision_number === 1);
  assert.ok(rev1, 'Revision #1 snapshot must exist');

  const rbRes = await handleAboutArticlesAdmin(
    reqJson(`https://csodisha.com/api/admin/about/articles/${draftId}/rollback`, 'POST', { revision_id: rev1.id }),
    env, actor, draftId, 'rollback'
  );
  assert.equal(rbRes.status, 200);
  assert.equal(rbRes.headers.get('X-CSO-Cache-Purged'), '1');
  const rbBody = await rbRes.json();
  assert.equal(rbBody.item.title_en, 'CSO Annual Civic Transparency Report 2026', 'Rollback must restore revision #1 title');
});

await check('Verified .gov.in Portals Registry Admin CRUD + Public Directory with Cache-Control: no-store', async () => {
  const createRes = await handleAboutSourcesAdmin(
    reqJson('https://csodisha.com/api/admin/about/sources', 'POST', {
      authority_name_en: 'Odisha Treasury IFMS Portal',
      authority_name_or: 'ଓଡ଼ିଶା ଟ୍ରେଜେରୀ ପୋର୍ଟାଲ୍',
      sector: 'Odisha State',
      official_url: 'https://www.odishatreasury.gov.in/',
      purpose_en: 'Official state treasury and DBT disbursement gateway.',
      helpline_info: '1800-345-6770',
      is_verified: true,
      is_published: true
    }),
    env, actor, null
  );
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');

  const pubRes = await handlePublicAboutSourcesApi(new Request('https://csodisha.com/api/public/about/sources?sector=Odisha%20State'), env);
  assert.equal(pubRes.status, 200);
  assert.equal(pubRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const pubBody = await pubRes.json();
  assert.ok(pubBody.items.some(s => s.official_url.includes('odishatreasury.gov.in')), 'Newly added verified portal must appear immediately');
});

await check('Public Inquiries & Partnership Desk Submit + Admin Review & Resolution', async () => {
  const subRes = await handlePublicAboutInquiriesApi(
    reqJson('https://csodisha.com/api/public/about/inquiries', 'POST', {
      inquiry_type: 'correction_report',
      sender_name: 'Subham Panda',
      sender_email: 'subham@odisha.in',
      district: 'Cuttack',
      subject_text: 'Update OSSSC helpline number',
      message_text: 'Please include the updated OSSSC grievance helpline on the verified portals directory.'
    }),
    env
  );
  assert.equal(subRes.status, 201);
  assert.equal(subRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const subBody = await subRes.json();
  assert.equal(subBody.ok, true);
  assert.ok(subBody.id);

  const listRes = await handleAboutInquiriesAdmin(
    new Request('https://csodisha.com/api/admin/about/inquiries'),
    env, actor, null
  );
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some(i => i.id === subBody.id));

  const resolveRes = await handleAboutInquiriesAdmin(
    reqJson(`https://csodisha.com/api/admin/about/inquiries/${subBody.id}`, 'PATCH', {
      status: 'resolved',
      admin_reply: 'Verified and updated in the Official Portals Registry.'
    }),
    env, actor, subBody.id
  );
  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.headers.get('X-CSO-Cache-Purged'), '1');
  const resolved = await resolveRes.json();
  assert.equal(resolved.item.status, 'resolved');

  const auditCount = db.sqlite.prepare("SELECT COUNT(*) AS c FROM audit_log WHERE action LIKE 'about%'").get().c;
  assert.ok(auditCount >= 6, `Expected >= 6 about* audit_log entries, got ${auditCount}`);
});

await check('Public Telemetry Endpoint increments views & PDF downloads with Cache-Control: no-store', async () => {
  const telRes = await handlePublicAboutTelemetryApi(
    reqJson('https://csodisha.com/api/public/about/telemetry', 'POST', { event: 'view', id: draftId }),
    env
  );
  assert.equal(telRes.status, 200);
  assert.equal(telRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const telBody = await telRes.json();
  assert.equal(telBody.ok, true);
  const row = db.sqlite.prepare('SELECT views_count FROM about_articles WHERE id = ?').get(draftId);
  assert.equal(row.views_count, 1);
});

await check('Topbar Media button CSS prevents clipping in admin/command-suite.css', () => {
  const css = read('admin/command-suite.css');
  const match = css.match(/\.cs-topbar-media\s*\{[^}]+\}/);
  assert.ok(match, '.cs-topbar-media rule must exist');
  assert.ok(match[0].includes('white-space: nowrap'));
  assert.ok(match[0].includes('flex-shrink: 0'));
  assert.ok(match[0].includes('min-width: max-content'));
});

await check('Full wiring across Admin Studio (5 Tabs), Public About Portal, Edge Invalidator, Command Suite & _worker.js', () => {
  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('/admin/about-publishing-studio.css?v=20261124v253'));
  assert.ok(adminHtml.includes('/admin/about-publishing-studio.js?v=20261124v253'));

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('CSOAboutPublishingStudio'));
  assert.ok(adminJs.includes("folderId === 'folder-about'"));
  assert.ok(adminJs.includes('openAboutPublishingTab'));
  assert.ok(adminJs.includes('/api/admin/about/taxonomy'));

  const csJs = read('admin/command-suite.js');
  assert.ok(csJs.includes('About Studio › Verified .gov.in Portals Registry'));
  assert.ok(csJs.includes('r.about_articles'));

  const csBackend = read('functions/_lib/command-suite.js');
  assert.ok(csBackend.includes('about_articles'));

  const aboutHtml = read('about/index.html');
  assert.ok(aboutHtml.includes('/assets/css/about-portal.css?v=20261124v25'));
  assert.ok(aboutHtml.includes('/assets/js/about-portal.js?v=20261124v25'));
  assert.ok(aboutHtml.includes('id="cso-about-portal-root"'));

  const workerJs = read('_worker.js');
  for (const ep of [
    '/api/public/about/tree',
    '/api/public/about/pages',
    '/api/public/about/article',
    '/api/public/about/sources',
    '/api/public/about/inquiries',
    '/api/public/about/telemetry'
  ]) {
    assert.ok(workerJs.includes(ep), `_worker.js must wire ${ep}`);
  }

  for (const ep of ['/api/public/about/tree', '/api/public/about/pages', '/api/public/about/article', '/api/public/about/sources']) {
    assert.ok(CONTENT_PUBLIC_PATHS.includes(ep), `edge-cache-invalidator must include ${ep}`);
  }

  assert.ok(read('functions/api/admin/_router.js').includes("case 'about':"));
  assert.ok(read('functions/api/media/_serve.js').includes('about-publishing'));
});

await check('Strict CSP compliance across all v253 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v253', () => {
  const jsFiles = [
    'admin/about-publishing-studio.js',
    'assets/js/about-portal.js',
    'admin/admin.js',
    'admin/command-suite.js'
  ];
  for (const rel of jsFiles) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }
  for (const rel of ['about/index.html', 'admin/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style attribute`);
  }

  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v25[3-9]';/.test(sw), 'sw.js must be bumped to v253+');
  assert.ok(sw.includes("'/assets/css/about-portal.css'"), 'sw.js must precache about-portal.css');
  assert.ok(sw.includes("'/assets/js/about-portal.js'"), 'sw.js must precache about-portal.js');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v25[3-9]';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\n=== v253 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
