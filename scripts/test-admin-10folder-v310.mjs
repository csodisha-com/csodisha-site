#!/usr/bin/env node
/**
 * Phase 1 (v310): 10-Folder Admin Studio Architecture Verification Suite
 *
 * Verifies end-to-end:
 *  1. Wrangler R2 binding (CSO_FILES) + Additive D1 migration (0144_admin_studio_10folder_v310.sql).
 *  2. Exact 10-Folder Admin Sidebar consolidation in admin/admin.js & admin/index.html.
 *  3. Folder #8 (Web & Page Studio): institutional_pages & site_snippets CRUD, automatic timestamps,
 *     live public SSR page rendering (/terms/, /privacy/, /disclaimer/) + live footer snippet injection.
 *  4. Folder #9 (File & Media Manager): strict MIME/ext allowlist, hard-block (.html/.js/.svg/.exe),
 *     size caps (15 MB docs, 3 MB images), unbound-R2 graceful JSON status, upload/list/delete,
 *     pre-delete D1 content reference check, and public GET /files/:key delivery headers.
 *  5. Folder #10 (System, Security & Billing): real async ctx.waitUntil() admin_audit_logs,
 *     real admin_sessions listing & Force Revoke (rejects revoked token immediately),
 *     edge-cached feature_flags, edge-cached 301/302 redirects, Purge Public Caches (X-CSO-Cache-Purged: 1),
 *     and real D1 JSON/CSV backup export.
 *  6. Folder #1 (Command Overview): real D1 COUNT(*) telemetry across all 10 studio folders (zero mock data).
 *  7. 100% strict CSP & zero hardcoded hex color leaks across all v310 Admin UI files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  handleAdminWebStudioApi,
  handlePublicInstitutionalRoute,
  applySiteSnippetsToResponse,
  invalidateWebStudioCache
} from '../functions/_lib/web-studio-v310.js';
import {
  handleAdminFilesApi,
  handlePublicFileDelivery,
  validateUploadFile,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES
} from '../functions/api/admin/files.js';
import {
  handleAdminSystemOpsApi,
  recordAdminAuditLog,
  registerAdminSession,
  isAdminSessionRevoked,
  getPublicFeatureFlags,
  matchActiveEdgeRedirect,
  renderMaintenancePageResponse,
  invalidateSystemOpsCache
} from '../functions/api/admin/system-ops.js';
import { handleOverviewStats } from '../functions/_lib/command-suite.js';

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
  sqlite.exec(read('migrations/0144_admin_studio_10folder_v310.sql'));
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, email TEXT, role TEXT, created_at INTEGER, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS job_articles (id TEXT PRIMARY KEY, slug TEXT, title_en TEXT, banner_url TEXT, notification_pdf_url TEXT, body_en TEXT, body_or TEXT, structured_json TEXT, is_published INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS careers_articles (id TEXT PRIMARY KEY, title_en TEXT, status TEXT DEFAULT 'draft');
    CREATE TABLE IF NOT EXISTS homepage_blocks (id TEXT PRIMARY KEY, title_en TEXT, is_published INTEGER DEFAULT 1, clicks_count INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value_json TEXT, updated_by TEXT, updated_at TEXT);
  `);

  function wrapStmt(sql, params = []) {
    return {
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
    prepare(sql) { return wrapStmt(sql, []); }
  };
}

function makeMockR2() {
  const store = new Map();
  return {
    store,
    async put(key, body, opts = {}) {
      const buf = body instanceof Uint8Array ? body : new Uint8Array(body);
      store.set(key, {
        body: buf,
        size: buf.byteLength,
        httpEtag: `"etag-${key}"`,
        httpMetadata: opts.httpMetadata || {},
        customMetadata: opts.customMetadata || {}
      });
    },
    async get(key) {
      return store.get(key) || null;
    },
    async delete(key) {
      store.delete(key);
    }
  };
}

const adminActor = {
  userId: 'u-admin-1',
  email: 'admin@csodisha.com',
  role: 'admin',
  sessionToken: 'a'.repeat(64)
};

console.log('\n=== v310 Phase 1: 10-Folder Admin Studio Architecture Suite ===\n');

await check('1. Wrangler R2 CSO_FILES binding & additive D1 migration 0144', async () => {
  const wrangler = JSON.parse(read('wrangler.json'));
  const hasCsoFiles = (wrangler.r2_buckets || []).some(b => b.binding === 'CSO_FILES' && b.bucket_name === 'cso-files');
  assert.ok(hasCsoFiles, 'wrangler.json missing CSO_FILES R2 bucket binding');
  assert.ok((wrangler.r2_buckets || []).some(b => b.binding === 'MEDIA'), 'wrangler.json must preserve existing MEDIA binding');

  const sql = read('migrations/0144_admin_studio_10folder_v310.sql');
  for (const tbl of ['institutional_pages', 'site_snippets', 'media_files', 'admin_audit_logs', 'admin_sessions', 'feature_flags', 'redirects']) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Migration 0144 missing table ${tbl}`);
  }
  assert.ok(!/\bDROP\s+TABLE\b/i.test(sql) && !/\bRENAME\s+COLUMN\b/i.test(sql), 'Migration 0144 must be strictly additive');
});

await check('2. Exact 10-Folder Admin Sidebar order & asset wiring', async () => {
  const html = read('admin/index.html');
  assert.ok(/\/admin\/web-studio\.css\?v=20261125v31\d/.test(html), 'admin/index.html missing web-studio.css');
  assert.ok(/\/admin\/file-manager\.css\?v=20261125v31\d/.test(html), 'admin/index.html missing file-manager.css');
  assert.ok(/\/admin\/system-ops\.css\?v=20261125v31\d/.test(html), 'admin/index.html missing system-ops.css');
  assert.ok(/\/admin\/web-studio\.js\?v=20261125v31\d/.test(html), 'admin/index.html missing web-studio.js');
  assert.ok(/\/admin\/file-manager\.js\?v=20261125v31\d/.test(html), 'admin/index.html missing file-manager.js');
  assert.ok(/\/admin\/system-ops\.js\?v=20261125v31\d/.test(html), 'admin/index.html missing system-ops.js');
  assert.ok(html.includes('10 / 10'), 'admin/index.html sidebar footer must show 10 / 10 folders');

  const adminJs = read('admin/admin.js');
  for (const marker of [
    'Command Overview',
    "folder.id === 'folder-about') return;",
    'navTabCareers',
    'navTabCandidateHub',
    'navTabWebStudio',
    'Web & Page Studio',
    'navTabFileManager',
    'File & Media Manager',
    'navTabSystemOps',
    'System, Security & Billing',
    'Payments & Ads'
  ]) {
    assert.ok(adminJs.includes(marker), `admin/admin.js missing 10-folder marker: ${marker}`);
  }
});

await check('3. Folder #8 (Web & Page Studio): institutional_pages & site_snippets end-to-end public wiring', async () => {
  const db = makeD1();
  const env = { DB: db };
  const waited = [];
  const ctx = { waitUntil(p) { waited.push(p); } };
  invalidateWebStudioCache();

  // Save custom /terms/ page
  const putRes = await handleAdminWebStudioApi(
    new Request('https://csodisha.com/api/admin/web-studio/pages/terms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title_en: 'Terms of Use (Live D1)',
        title_or: 'ବ୍ୟବହାର ନିୟମାବଳୀ',
        body_en: '## Official Policy\nAll portal guidance is informational. Verify on .gov.in.',
        body_or: 'ସମସ୍ତ ସୂଚନା କେବଳ ଶିକ୍ଷାମୂଳକ।'
      })
    }),
    env, adminActor, 'pages', 'terms', ctx
  );
  assert.equal(putRes.status, 200);
  const saved = await putRes.json();
  assert.equal(saved.item.customized, true);
  assert.ok(saved.item.updated_at, 'Must stamp automatic updated_at');

  // Save live site_snippets
  const snipRes1 = await handleAdminWebStudioApi(
    new Request('https://csodisha.com/api/admin/web-studio/snippets/footer_copyright', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value_en: '© 2026 Common Sense Odisha — Verified Civic Archive.', value_or: '' })
    }),
    env, adminActor, 'snippets', 'footer_copyright', ctx
  );
  assert.equal(snipRes1.status, 200);

  const snipRes2 = await handleAdminWebStudioApi(
    new Request('https://csodisha.com/api/admin/web-studio/snippets/official_source_disclaimer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value_en: 'Independent public portal. Verify with .gov.in authorities.', value_or: '' })
    }),
    env, adminActor, 'snippets', 'official_source_disclaimer', ctx
  );
  assert.equal(snipRes2.status, 200);

  // Public dynamic /terms/ rendering
  const pubTerms = await handlePublicInstitutionalRoute(
    new Request('https://csodisha.com/terms/', { method: 'GET' }),
    env, '/terms/', new URL('https://csodisha.com/terms/')
  );
  assert.ok(pubTerms && pubTerms.status === 200, '/terms/ must serve live D1 institutional page');
  const html = await pubTerms.text();
  assert.ok(html.includes('Terms of Use (Live D1)'), 'Dynamic /terms/ missing custom English title');
  assert.ok(html.includes('ବ୍ୟବହାର ନିୟମାବଳୀ'), 'Dynamic /terms/ missing custom Odia title');
  assert.ok(html.includes('Effective / Last Updated:'), 'Dynamic /terms/ missing Effective / Last Updated timestamp');
  assert.ok(html.includes('Verified Civic Archive.'), 'Dynamic /terms/ footer missing live footer_copyright snippet');
  assert.ok(html.includes('Independent public portal. Verify with .gov.in authorities.'), 'Dynamic /terms/ missing live official_source_disclaimer snippet');

  // Static page snippet injection fallback
  const staticSample = new Response(
    '<html><body><footer><div class="cso-footer-zone1"><p class="cso-footer-copy">Old</p><p class="cso-footer-contact">Mail</p></div></footer></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
  const injected = await applySiteSnippetsToResponse(staticSample, env, '/');
  const injHtml = await injected.text();
  assert.ok(injHtml.includes('Verified Civic Archive.'), 'Footer copyright snippet not injected into public HTML');
  assert.ok(injHtml.includes('data-cso-snippet="official_source_disclaimer"'), 'Official disclaimer snippet not injected into public HTML');

  await Promise.all(waited);
});

await check('4. Folder #9 (File & Media Manager): allowlist, hard-blocks, unbound R2 safety, reference scan & /files/:key delivery', async () => {
  const db = makeD1();
  const waited = [];
  const ctx = { waitUntil(p) { waited.push(p); } };

  // Strict allowlist / blocklist / size checks
  assert.throws(() => validateUploadFile({ name: 'evil.html', type: 'text/html', size: 100, bytes: new Uint8Array([60, 104, 116, 109]) }), err => err.code === 'FILE_TYPE_BLOCKED');
  assert.throws(() => validateUploadFile({ name: 'xss.svg', type: 'image/svg+xml', size: 100, bytes: new Uint8Array([60, 115, 118, 103]) }), err => err.code === 'FILE_TYPE_BLOCKED');
  assert.throws(() => validateUploadFile({ name: 'payload.js', type: 'application/javascript', size: 100, bytes: new Uint8Array([97, 98, 99, 100]) }), err => err.code === 'FILE_TYPE_BLOCKED');
  assert.throws(() => validateUploadFile({ name: 'run.exe', type: 'application/octet-stream', size: 100, bytes: new Uint8Array([77, 90, 0, 0]) }), err => err.code === 'FILE_TYPE_BLOCKED');
  assert.throws(() => validateUploadFile({ name: 'huge.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1, bytes: null }), err => err.code === 'FILE_TOO_LARGE');
  assert.throws(() => validateUploadFile({ name: 'huge.pdf', type: 'application/pdf', size: MAX_DOC_BYTES + 1, bytes: null }), err => err.code === 'FILE_TOO_LARGE');

  // Unbound env.CSO_FILES returns clean JSON status without crashing
  const unboundList = await handleAdminFilesApi(new Request('https://csodisha.com/api/admin/files'), { DB: db }, adminActor, null, null, ctx);
  assert.equal(unboundList.status, 200);
  const unboundJson = await unboundList.json();
  assert.equal(unboundJson.r2_configured, false);
  assert.equal(unboundJson.config_status, 'unbound');
  assert.equal(unboundJson.total_files, 0);

  const unboundPost = await handleAdminFilesApi(new Request('https://csodisha.com/api/admin/files', { method: 'POST' }), { DB: db }, adminActor, null, null, ctx);
  assert.equal(unboundPost.status, 503);
  const unboundPostJson = await unboundPost.json();
  assert.equal(unboundPostJson.code, 'R2_UNBOUND');

  // Bound R2 upload + public /files/:key delivery + pre-delete D1 reference warning
  const r2 = makeMockR2();
  const env = { DB: db, CSO_FILES: r2 };
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
  const fd = new FormData();
  fd.append('folder', 'Jobs');
  fd.append('file', new File([pdfBytes], 'opsc-oas-2026-notice.pdf', { type: 'application/pdf' }));

  const upRes = await handleAdminFilesApi(
    new Request('https://csodisha.com/api/admin/files', { method: 'POST', body: fd }),
    env, adminActor, null, null, ctx
  );
  assert.equal(upRes.status, 201);
  const uploaded = (await upRes.json()).item;
  assert.ok(uploaded.file_key.startsWith('jobs/'), 'File key must include folder slug');
  assert.equal(uploaded.clean_url, `/files/${uploaded.file_key}`);

  // Public GET /files/:key delivery
  const pubFile = await handlePublicFileDelivery(
    new Request(`https://csodisha.com${uploaded.clean_url}`, { method: 'GET' }),
    env, uploaded.file_key
  );
  assert.equal(pubFile.status, 200);
  assert.equal(pubFile.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(pubFile.headers.get('Content-Type'), 'application/pdf');
  assert.equal(pubFile.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');

  // Reference check blocks non-forced delete when linked from job_articles
  db.sqlite.prepare("INSERT INTO job_articles (id, slug, title_en, notification_pdf_url, is_published) VALUES ('j1', 'oas-2026', 'OPSC OAS 2026', ?, 1)")
    .run(uploaded.clean_url);

  const refRes = await handleAdminFilesApi(
    new Request(`https://csodisha.com/api/admin/files/${uploaded.id}/references`, { method: 'GET' }),
    env, adminActor, uploaded.id, 'references', ctx
  );
  const refJson = await refRes.json();
  assert.equal(refJson.reference_count, 1);
  assert.equal(refJson.references[0].table, 'job_articles');

  const blockedDel = await handleAdminFilesApi(
    new Request(`https://csodisha.com/api/admin/files/${uploaded.id}`, { method: 'DELETE' }),
    env, adminActor, uploaded.id, null, ctx
  );
  assert.equal(blockedDel.status, 409);

  // Forced delete succeeds and removes from R2 + D1
  const forceDel = await handleAdminFilesApi(
    new Request(`https://csodisha.com/api/admin/files/${uploaded.id}?force=1`, { method: 'DELETE' }),
    env, adminActor, uploaded.id, null, ctx
  );
  assert.equal(forceDel.status, 200);
  assert.equal(await r2.get(uploaded.file_key), null);

  await Promise.all(waited);
});

await check('5. Folder #10 (System, Security & Billing): async audit logs, session revoke, flags, redirects, cache purge & D1 backup', async () => {
  const db = makeD1();
  const env = { DB: db };
  const waited = [];
  const ctx = { waitUntil(p) { waited.push(p); } };
  invalidateSystemOpsCache();

  // Register real admin session & async audit log
  const token = 'b'.repeat(64);
  await registerAdminSession(env, new Request('https://csodisha.com/api/admin/login', { headers: { 'cf-connecting-ip': '203.0.113.10' } }), {
    token, userId: 'u-admin-1', email: 'admin@csodisha.com', role: 'admin', expiresAt: Math.floor(Date.now() / 1000) + 3600
  }, ctx);
  await recordAdminAuditLog(env, new Request('https://csodisha.com/api/admin/login', { headers: { 'cf-connecting-ip': '203.0.113.10' } }), adminActor, 'admin.login', 'admin_sessions', { role: 'admin' }, ctx);
  await Promise.all(waited);

  assert.equal(await isAdminSessionRevoked(env, token), false);

  // List active sessions & Force Revoke
  const sessRes = await handleAdminSystemOpsApi(new Request('https://csodisha.com/api/admin/system-ops/sessions'), env, { ...adminActor, sessionToken: token }, 'sessions', null, ctx);
  const sessJson = await sessRes.json();
  assert.ok(sessJson.items.length >= 1, 'Expected active admin session');
  const sid = sessJson.items[0].id;
  assert.equal(sessJson.items[0].session_token_hash, undefined, 'Never expose token hashes to client');

  const revRes = await handleAdminSystemOpsApi(new Request(`https://csodisha.com/api/admin/system-ops/sessions/${sid}`, { method: 'POST' }), env, adminActor, 'sessions', sid, ctx);
  assert.equal(revRes.status, 200);
  assert.equal(await isAdminSessionRevoked(env, token), true, 'Force Revoke must immediately revoke session');

  // Toggle live feature_flags & verify edge evaluator + maintenance 503 response
  const flRes = await handleAdminSystemOpsApi(
    new Request('https://csodisha.com/api/admin/system-ops/flags/maintenance_mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    }),
    env, adminActor, 'flags', 'maintenance_mode', ctx
  );
  assert.equal(flRes.status, 200);
  const flags = await getPublicFeatureFlags(env);
  assert.equal(flags.maintenance_mode, true);
  assert.equal(flags.registrations_enabled, true);

  const maintRes = renderMaintenancePageResponse();
  assert.equal(maintRes.status, 503);

  // Create active 301 redirect & verify edge matcher
  const rdrRes = await handleAdminSystemOpsApi(
    new Request('https://csodisha.com/api/admin/system-ops/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_path: '/old-opsc-link/', target_url: '/jobs/', status_code: 301 })
    }),
    env, adminActor, 'redirects', null, ctx
  );
  assert.equal(rdrRes.status, 201);
  const matched = await matchActiveEdgeRedirect(env, '/old-opsc-link/');
  assert.deepEqual(matched, { target_url: '/jobs/', status_code: 301 });

  // Purge caches returns X-CSO-Cache-Purged: 1
  const purgeRes = await handleAdminSystemOpsApi(
    new Request('https://csodisha.com/api/admin/system-ops/purge-caches', { method: 'POST' }),
    env, adminActor, 'purge-caches', null, ctx
  );
  assert.equal(purgeRes.status, 200);
  assert.equal(purgeRes.headers.get('X-CSO-Cache-Purged'), '1');

  // Real D1 JSON & CSV backup export
  const jsonBk = await handleAdminSystemOpsApi(
    new Request('https://csodisha.com/api/admin/system-ops/backup?format=json', { method: 'GET' }),
    env, adminActor, 'backup', null, ctx
  );
  assert.equal(jsonBk.status, 200);
  const bkData = await jsonBk.json();
  assert.equal(bkData.schema_version, 'v310');
  assert.ok(bkData.tables.redirects.length === 1, 'Backup must include real D1 redirect rows');

  // Real Command Overview live COUNT(*) query
  const ovRes = await handleOverviewStats(new Request('https://csodisha.com/api/admin/overview-stats'), env);
  assert.equal(ovRes.status, 200);
  const ov = await ovRes.json();
  assert.equal(ov.system_ops.redirects_active, 1);
  assert.ok(ov.system_ops.audit_logs >= 1, 'Overview must count real admin_audit_logs');

  await Promise.all(waited);
});

await check('6. Strict CSP & zero unguarded hex leaks across all v310 Admin UI files', async () => {
  for (const rel of ['admin/web-studio.js', 'admin/file-manager.js', 'admin/system-ops.js', 'admin/admin.js', 'admin/command-suite.js']) {
    const code = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function', '.style.']) {
      assert.ok(!code.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
  for (const rel of ['admin/web-studio.css', 'admin/file-manager.css', 'admin/system-ops.css']) {
    const css = read(rel).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), `${rel} must use semantic --cso-* tokens only (zero hardcoded hex colors)`);
  }
});

console.log(`\n=== v310 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
