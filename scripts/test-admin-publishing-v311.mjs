#!/usr/bin/env node
/**
 * Phase 2 (v311): Publishing Velocity, R2 File Picker, Sanity Check,
 * Publish Chain & Operational Radars Verification Suite
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  handleSanityCheckApi,
  handlePublishChainApi,
  handleBulkImportApi,
  handleDuplicateItemApi,
  parseCsvRows
} from '../functions/api/admin/publish-pipeline.js';
import {
  handleAdminRadarsApi,
  handlePublicStudyOfflinePackApi,
  logZeroResultSearch,
  isFuturePublishAt,
  isExpiredTimestamp
} from '../functions/_lib/radars-v311.js';
import {
  handlePublicJobsListApi,
  handlePublicJobsBootstrapApi
} from '../functions/_lib/jobs-publishing-house.js';
import {
  handlePublicSchemesListApi,
  handlePublicSchemesBootstrapApi
} from '../functions/_lib/schemes-publishing-house.js';
import {
  handlePublicStudyListApi,
  handlePublicStudyBootstrapApi
} from '../functions/_lib/study-publishing-house.js';

const ROOT = process.cwd();
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

function makeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(read('migrations/0136_homepage_studio.sql'));
  sqlite.exec(read('migrations/0137_candidate_hub_governance.sql'));
  sqlite.exec(read('migrations/0138_jobs_publishing_house.sql'));
  sqlite.exec(read('migrations/0139_schemes_publishing_house.sql'));
  sqlite.exec(read('migrations/0140_study_library_publishing_house.sql'));
  sqlite.exec(read('migrations/0016_careers_portal.sql'));
  sqlite.exec(read('migrations/0144_admin_studio_10folder_v310.sql'));
  sqlite.exec(read('migrations/0145_admin_publishing_radars_v311.sql'));
  sqlite.exec(`CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, slug TEXT, type TEXT, status TEXT, published_at TEXT, updated_at TEXT)`);

  function wrapStmt(sql, params = []) {
    return {
      _sql: sql,
      _params: params,
      bind(...args) { return wrapStmt(sql, args); },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() {
        const info = sqlite.prepare(sql).run(...params);
        return { success: true, meta: { changes: info.changes } };
      }
    };
  }
  return {
    sqlite,
    prepare(sql) { return wrapStmt(sql, []); },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) {
        if (/^\s*SELECT/i.test(s._sql)) {
          out.push(await s.all());
        } else {
          out.push(await s.run());
        }
      }
      return out;
    }
  };
}

function jsonReq(url, method = 'GET', body = null) {
  const init = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' }
  };
  if (body !== null) init.body = JSON.stringify(body);
  return new Request(url, init);
}

const actor = { id: 'admin_1', email: 'admin@csodisha.com', role: 'super_admin' };

console.log('\nPhase 2 (v311) Admin Publishing & Radars Verification Suite\n');

// 1. Additive Migration & Columns
await check('1. Additive migration 0145 adds lifecycle, scheme, offline_pack columns and radar tables', async () => {
  const db = makeD1();
  const jobCols = db.sqlite.prepare('PRAGMA table_info(job_articles)').all().map(r => r.name);
  for (const col of ['publish_at', 'expires_at', 'notification_url', 'apply_url', 'admit_card_url', 'answer_key_url', 'result_url', 'corrigendum_note']) {
    assert.ok(jobCols.includes(col), `job_articles missing column ${col}`);
  }
  const schCols = db.sqlite.prepare('PRAGMA table_info(scheme_articles)').all().map(r => r.name);
  for (const col of ['publish_at', 'expires_at', 'district_codes', 'required_docs']) {
    assert.ok(schCols.includes(col), `scheme_articles missing column ${col}`);
  }
  const stCols = db.sqlite.prepare('PRAGMA table_info(study_articles)').all().map(r => r.name);
  assert.ok(stCols.includes('offline_pack'), 'study_articles missing offline_pack');

  const tables = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  assert.ok(tables.includes('link_health_checks'), 'link_health_checks table missing');
  assert.ok(tables.includes('search_zero_logs'), 'search_zero_logs table missing');
});

// 2. Inline R2 File Picker Modal & Cross-Studio Triggers
await check('2. Inline R2 File Picker modal loaded in admin/index.html & wired in all 5 studios', async () => {
  const html = read('admin/index.html');
  assert.ok(html.includes('file-picker-modal.css'), 'file-picker-modal.css not loaded');
  assert.ok(html.includes('file-picker-modal.js'), 'file-picker-modal.js not loaded');
  assert.ok(html.includes('publish-tools.css'), 'publish-tools.css not loaded');
  assert.ok(html.includes('publish-tools.js'), 'publish-tools.js not loaded');

  for (const studioFile of [
    'admin/jobs-publishing-studio.js',
    'admin/careers-publishing-studio.js',
    'admin/schemes-publishing-studio.js',
    'admin/study-publishing-studio.js',
    'admin/web-studio.js'
  ]) {
    const src = read(studioFile);
    assert.ok(src.includes('CSOFilePicker'), `${studioFile} missing CSOFilePicker trigger`);
  }
  for (const studioFile of [
    'admin/jobs-publishing-studio.js',
    'admin/careers-publishing-studio.js',
    'admin/schemes-publishing-studio.js',
    'admin/study-publishing-studio.js'
  ]) {
    const src = read(studioFile);
    assert.ok(src.includes('CSOPublishTools.runSanityCheck'), `${studioFile} missing runSanityCheck`);
    assert.ok(src.includes('CSOPublishTools.runPublishChain'), `${studioFile} missing runPublishChain`);
    assert.ok(src.includes('CSOPublishTools.openBulkImporter'), `${studioFile} missing openBulkImporter`);
  }
});

// 3. Pre-Publish Sanity Check (Failing & Passing Cases)
await check('3. POST /api/admin/sanity-check catches missing fields, duplicate slug, past expiry, missing /files key, and HTTP 404 official URL', async () => {
  const db = makeD1();
  const env = { DB: db };
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published) VALUES ('j_existing', 'opsc-oas-2026', 'OPSC OAS 2026', 1)").run();
  db.sqlite.prepare("INSERT INTO media_files (id, file_key, original_name, mime_type, size_bytes, folder) VALUES ('mf_1', 'jobs/valid-notice.pdf', 'valid-notice.pdf', 'application/pdf', 12000, 'Jobs')").run();

  const mockFetch = async (url) => {
    if (String(url).includes('broken.gov.in')) return new Response('Not Found', { status: 404 });
    return new Response('OK', { status: 200 });
  };

  // Failing item
  const badRes = await handleSanityCheckApi(
    jsonReq('https://csodisha.com/api/admin/sanity-check', 'POST', {
      pillar: 'jobs',
      item: {
        title_en: '',
        slug: 'opsc-oas-2026',
        expires_at: '2020-01-01T00:00:00Z',
        notification_pdf_url: '/files/jobs/missing-file.pdf',
        apply_url: 'https://broken.gov.in/apply'
      }
    }),
    env, actor, mockFetch
  );
  const badData = await badRes.json();
  assert.equal(badRes.status, 200);
  assert.equal(badData.passed, false);
  assert.ok(badData.blocking_count >= 4, `expected >=4 blocking checks, got ${badData.blocking_count}`);

  // Passing item
  const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();
  const okRes = await handleSanityCheckApi(
    jsonReq('https://csodisha.com/api/admin/sanity-check', 'POST', {
      pillar: 'jobs',
      item: {
        title_en: 'OSSC CGL 2026',
        slug: 'ossc-cgl-2026',
        category_l1_id: 'cat_gov',
        expires_at: futureDate,
        notification_pdf_url: '/files/jobs/valid-notice.pdf',
        apply_url: 'https://ossc.gov.in/apply'
      }
    }),
    env, actor, mockFetch
  );
  const okData = await okRes.json();
  assert.equal(okData.passed, true, `expected sanity check pass, got ${JSON.stringify(okData.checks)}`);
  assert.equal(okData.blocking_count, 0);
});

// 4. Single-Click Publish Chain
await check('4. POST /api/admin/publish-chain syncs Homepage Latest Updates, Candidate Vault required_docs, purges cache & generates WhatsApp/Telegram card', async () => {
  const db = makeD1();
  const env = { DB: db };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  const res = await handlePublishChainApi(
    jsonReq('https://csodisha.com/api/admin/publish-chain', 'POST', {
      pillar: 'schemes',
      id: 'sch_subhadra_2026',
      slug: 'subhadra-yojana-2026',
      title_en: 'Subhadra Yojana Phase 2',
      title_or: 'ସୁଭଦ୍ରା ଯୋଜନା ପର୍ଯ୍ୟାୟ ୨',
      summary_en: 'Direct DBT support for eligible women in Odisha.',
      expires_at: '2027-03-31',
      official_url: 'https://subhadra.odisha.gov.in/',
      required_docs: ['Aadhaar Card', 'NPCI Bank Passbook']
    }),
    env, actor, ctx
  );
  await Promise.all(waits);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-CSO-Cache-Purged'), '1');
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.homepage_synced, true);
  assert.equal(data.vault_docs_synced.length, 2);
  assert.ok(data.whatsapp_telegram_card.includes('Subhadra Yojana Phase 2'));
  assert.ok(data.whatsapp_telegram_card.includes('https://csodisha.com/schemes/?slug=subhadra-yojana-2026'));

  const hpRow = db.sqlite.prepare("SELECT * FROM homepage_blocks WHERE section_key = 'latest_updates' AND href LIKE '%subhadra-yojana-2026%'").get();
  assert.ok(hpRow, 'homepage_blocks row should be upserted');

  const docRows = db.sqlite.prepare("SELECT * FROM candidate_doc_templates WHERE title_en IN ('Aadhaar Card', 'NPCI Bank Passbook')").all();
  assert.equal(docRows.length, 2, 'candidate_doc_templates should contain both required docs');
});

// 5. Bulk CSV/JSON Importer (Dry-Run + Commit) & Duplicate as Template
await check('5. Bulk CSV/JSON importer dry-run catches duplicate slugs & bad dates; commit inserts valid rows; duplicate-item clones cleanly', async () => {
  const db = makeD1();
  const env = { DB: db };
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published) VALUES ('j_dup', 'existing-job-slug', 'Existing Job', 1)").run();

  const csvRaw = [
    'title_en,slug,department_en,last_date,apply_url',
    'OSSSC RI Recruitment 2026,osssc-ri-2026,Revenue Dept,2027-06-30,https://osssc.gov.in/',
    'Duplicate Slug Job,existing-job-slug,Home Dept,2027-07-01,https://odisha.gov.in/',
    'Bad Date Job,bad-date-job,Finance Dept,not-a-date,https://odisha.gov.in/'
  ].join('\n');

  assert.equal(parseCsvRows(csvRaw).length, 3);

  // Dry run
  const dryRes = await handleBulkImportApi(
    jsonReq('https://csodisha.com/api/admin/bulk-import', 'POST', {
      pillar: 'jobs', format: 'csv', raw: csvRaw, dry_run: true
    }),
    env, actor
  );
  const dryData = await dryRes.json();
  assert.equal(dryData.dry_run, true);
  assert.equal(dryData.valid_count, 1);
  assert.equal(dryData.error_count, 2);

  // Ensure dry-run wrote nothing
  const beforeCommit = db.sqlite.prepare("SELECT COUNT(*) AS c FROM job_articles WHERE slug = 'osssc-ri-2026'").get().c;
  assert.equal(beforeCommit, 0);

  // Commit
  const commitRes = await handleBulkImportApi(
    jsonReq('https://csodisha.com/api/admin/bulk-import', 'POST', {
      pillar: 'jobs', format: 'csv', raw: csvRaw, dry_run: false
    }),
    env, actor
  );
  const commitData = await commitRes.json();
  assert.equal(commitData.inserted_count, 1);
  assert.equal(commitData.skipped_count, 2);

  const inserted = db.sqlite.prepare("SELECT * FROM job_articles WHERE slug = 'osssc-ri-2026'").get();
  assert.ok(inserted, 'Valid CSV row must be inserted');

  // Duplicate as Template
  const dupRes = await handleDuplicateItemApi(
    jsonReq('https://csodisha.com/api/admin/duplicate-item', 'POST', {
      pillar: 'jobs', id: inserted.id
    }),
    env, actor
  );
  const dupData = await dupRes.json();
  assert.equal(dupRes.status, 201);
  assert.ok(dupData.item.title_en.startsWith('Copy of '), `expected Copy of title, got ${dupData.item.title_en}`);
  assert.equal(dupData.item.is_published, 0);
  assert.notEqual(dupData.item.slug, inserted.slug);
});

// 6. Public Enforcement: Future publish_at hidden, past expires_at auto-archived, Offline PWA Study Pack
await check('6. Public endpoints hide future publish_at, auto-archive past expires_at without deleting SEO page, and serve offline_pack study items', async () => {
  const db = makeD1();
  const env = { DB: db };
  const futureIso = new Date(Date.now() + 3 * 86400000).toISOString();
  const pastIso = new Date(Date.now() - 3 * 86400000).toISOString();

  assert.equal(isFuturePublishAt(futureIso), true);
  assert.equal(isExpiredTimestamp(pastIso), true);

  // Jobs: 1 future scheduled (even with is_published=1), 1 expired, 1 active
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published, publish_at, expires_at) VALUES ('j_fut', 'future-job', 'Future Scheduled Job', 1, ?, '')").run(futureIso);
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published, publish_at, expires_at) VALUES ('j_exp', 'expired-job', 'Expired Archived Job', 1, '', ?)").run(pastIso);
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published, publish_at, expires_at) VALUES ('j_act', 'active-job', 'Active Live Job', 1, '', ?)").run(futureIso);

  const jobsBoot = await (await handlePublicJobsBootstrapApi(new Request('https://csodisha.com/api/public/jobs/bootstrap'), env)).json();
  const jobsSlugs = jobsBoot.items.map(i => i.slug);
  assert.ok(!jobsSlugs.includes('future-job'), 'Future publish_at job must be hidden in bootstrap');
  assert.ok(jobsSlugs.includes('active-job'), 'Active job must appear in bootstrap');
  const expJob = jobsBoot.items.find(i => i.slug === 'expired-job');
  assert.ok(expJob, 'Expired job SEO item must remain visible');
  assert.equal(expJob.is_expired, true);
  assert.equal(expJob.status_badge, 'Archived / Applications Closed');

  const jobsList = await (await handlePublicJobsListApi(new Request('https://csodisha.com/api/public/jobs/list'), env)).json();
  assert.ok(!jobsList.items.some(i => i.slug === 'future-job'), 'Future job must be hidden in list');

  // Schemes: 1 future, 1 expired
  db.sqlite.prepare("INSERT INTO scheme_articles (id, slug, title_en, is_published, publish_at, expires_at) VALUES ('s_fut', 'future-scheme', 'Future Scheme', 1, ?, '')").run(futureIso);
  db.sqlite.prepare("INSERT INTO scheme_articles (id, slug, title_en, is_published, publish_at, expires_at) VALUES ('s_exp', 'expired-scheme', 'Expired Scheme', 1, '', ?)").run(pastIso);

  const schBoot = await (await handlePublicSchemesBootstrapApi(new Request('https://csodisha.com/api/public/schemes/bootstrap'), env)).json();
  assert.ok(!schBoot.items.some(i => i.slug === 'future-scheme'), 'Future scheme hidden in bootstrap');
  const expSch = schBoot.items.find(i => i.slug === 'expired-scheme');
  assert.ok(expSch && expSch.is_expired && expSch.status_badge === 'Archived / Applications Closed');

  const schList = await (await handlePublicSchemesListApi(new Request('https://csodisha.com/api/public/schemes/list'), env)).json();
  assert.ok(!schList.items.some(i => i.slug === 'future-scheme'), 'Future scheme hidden in list');

  // Study: 1 future, 1 offline_pack=1, 1 offline_pack=0
  db.sqlite.prepare("INSERT INTO study_articles (id, slug, title_en, is_published, scheduled_publish_at, offline_pack, notes_pdf_url) VALUES ('st_fut', 'future-study', 'Future Study', 1, ?, 1, '/files/study/fut.pdf')").run(futureIso);
  db.sqlite.prepare("INSERT INTO study_articles (id, slug, title_en, is_published, scheduled_publish_at, offline_pack, notes_pdf_url) VALUES ('st_off', 'odisha-history-pack', 'Odisha History Offline Notes', 1, '', 1, '/files/study/odisha-history.pdf')").run();
  db.sqlite.prepare("INSERT INTO study_articles (id, slug, title_en, is_published, scheduled_publish_at, offline_pack, notes_pdf_url) VALUES ('st_onl', 'online-only-notes', 'Online Only Notes', 1, '', 0, '/files/study/online.pdf')").run();

  const stBoot = await (await handlePublicStudyBootstrapApi(new Request('https://csodisha.com/api/public/study/bootstrap'), env)).json();
  assert.ok(!stBoot.items.some(i => i.slug === 'future-study'), 'Future study item hidden in bootstrap');

  const stList = await (await handlePublicStudyListApi(new Request('https://csodisha.com/api/public/study/list'), env)).json();
  assert.ok(!stList.items.some(i => i.slug === 'future-study'), 'Future study item hidden in list');

  const offRes = await handlePublicStudyOfflinePackApi(new Request('https://csodisha.com/api/public/study/offline-pack'), env);
  const offData = await offRes.json();
  assert.equal(offData.total, 1);
  assert.equal(offData.items[0].slug, 'odisha-history-pack');
  assert.ok(offData.cache_urls.includes('/files/study/odisha-history.pdf'));

  const swSrc = read('sw.js');
  assert.ok(swSrc.includes('SYNC_OFFLINE_STUDY_PACK'), 'sw.js missing SYNC_OFFLINE_STUDY_PACK handler');
  assert.ok(swSrc.includes('/api/public/study/offline-pack'), 'sw.js missing offline-pack route');
});

// 7. Live Operational Radars: Expiring Deadlines, Broken .gov.in Link Sentinel, Zero-Result Visitor Search Log
await check('7. Live Operational Radars report expiring items (<=7d), real HTTP 404 link scans, and async ctx.waitUntil() zero-result searches', async () => {
  const db = makeD1();
  const env = { DB: db };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  const in2Days = new Date(Date.now() + 2 * 86400000).toISOString();
  const in5Days = new Date(Date.now() + 5 * 86400000).toISOString();
  const in20Days = new Date(Date.now() + 20 * 86400000).toISOString();

  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published, expires_at, apply_url) VALUES ('j_soon', 'opsc-soon', 'OPSC Expiring Soon', 1, ?, 'https://broken-portal.gov.in/404')").run(in2Days);
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, is_published, expires_at, apply_url) VALUES ('j_far', 'opsc-far', 'OPSC Far Deadline', 1, ?, 'https://healthy-portal.gov.in/ok')").run(in20Days);
  db.sqlite.prepare("INSERT INTO scheme_articles (id, slug, title_en, is_published, expires_at, official_apply_url) VALUES ('s_soon', 'kalia-soon', 'KALIA Renewal Soon', 1, ?, 'https://kalia.odisha.gov.in/')").run(in5Days);

  // Trigger real zero-result search via public jobs list + direct logger
  await handlePublicJobsListApi(new Request('https://csodisha.com/api/public/jobs/list?q=forest+guard+2027'), env, ctx);
  logZeroResultSearch(env, '  Forest Guard 2027 ', 'jobs', ctx);
  await Promise.all(waits);

  // Run Link Health Scan with mocked HTTP probe
  const mockFetch = async (url) => {
    if (String(url).includes('broken-portal.gov.in')) return new Response('Not Found', { status: 404 });
    return new Response('OK', { status: 200 });
  };
  const scanRes = await handleAdminRadarsApi(
    jsonReq('https://csodisha.com/api/admin/radars/link-health/scan', 'POST', {}),
    env, actor, 'link-health', 'scan', ctx, mockFetch
  );
  const scanData = await scanRes.json();
  assert.equal(scanData.scanned, 3);
  assert.equal(scanData.broken, 1);
  assert.equal(scanData.healthy, 2);

  // Unified GET /api/admin/radars
  const radarRes = await handleAdminRadarsApi(
    new Request('https://csodisha.com/api/admin/radars'),
    env, actor, '', '', ctx
  );
  const radarData = await radarRes.json();
  assert.equal(radarData.expiring_deadlines.total, 2, 'Should find 2 items expiring within 7 days');
  assert.equal(radarData.expiring_deadlines.items[0].slug, 'opsc-soon', 'Nearest deadline must be sorted first');
  assert.equal(radarData.link_health.broken, 1);
  assert.equal(radarData.zero_searches.total, 1);
  assert.equal(radarData.zero_searches.items[0].hits, 2);

  // Dismiss zero-result search
  const disRes = await handleAdminRadarsApi(
    jsonReq('https://csodisha.com/api/admin/radars/zero-searches/dismiss', 'POST', { query_norm: 'forest guard 2027' }),
    env, actor, 'zero-searches', 'dismiss', ctx
  );
  assert.equal(disRes.status, 200);
  const radarAfter = await (await handleAdminRadarsApi(new Request('https://csodisha.com/api/admin/radars'), env, actor, '', '', ctx)).json();
  assert.equal(radarAfter.zero_searches.total, 0);
});

// 8. Strict CSP & Zero Hardcoded Hex across v311 Admin UI files
await check('8. Strict CSP (zero innerHTML/.style./eval) and zero hardcoded hex in v311 Admin UI files', async () => {
  const jsFiles = [
    'admin/file-picker-modal.js',
    'admin/publish-tools.js',
    'admin/command-suite.js',
    'admin/jobs-publishing-studio.js',
    'admin/schemes-publishing-studio.js',
    'admin/study-publishing-studio.js',
    'admin/careers-publishing-studio.js'
  ];
  for (const rel of jsFiles) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\(|\beval\(|new Function|\.style\./.test(codeOnly), `CSP violation in ${rel}`);
  }
  for (const cssRel of ['admin/file-picker-modal.css', 'admin/publish-tools.css']) {
    const css = read(cssRel);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), `Hardcoded hex color found in ${cssRel}`);
    assert.ok(css.includes('backdrop-filter: none'), `${cssRel} missing solid opaque modal backdrop-filter: none`);
    assert.ok(css.includes('90dvh'), `${cssRel} missing max-height: 90dvh mobile modal guardrail`);
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
