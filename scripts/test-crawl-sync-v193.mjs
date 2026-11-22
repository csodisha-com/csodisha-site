// Verification for v193 Persistent Crawl4AI Cron + One-Click Admin D1 Queue Sync
// Run: node scripts/test-crawl-sync-v193.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { handleCrawlDrafts } from '../functions/api/admin/crawl-drafts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, role TEXT);
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at INTEGER);
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER, count INTEGER);
    INSERT INTO users VALUES ('u-admin', 'admin@csodisha.com', 'admin');
    INSERT INTO sessions VALUES ('tok-admin', 'u-admin', ${Math.floor(Date.now() / 1000) + 3600});
  `);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(r.changes) } };
    },
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) || [] })
  });
  return { db, prepare: s => stmt(s) };
}

const env = {
  DB: makeD1(),
  CSO_CRAWL_SYNC_TOKEN: 'test-sync-secret-193'
};

// 1. Unauthorized POST without token or session returns 401
const unauthRes = await handleCrawlDrafts(
  new Request('https://csodisha.com/api/admin/crawl-drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drafts: [] })
  }),
  env
);
assert.equal(unauthRes.status, 401, 'Unauthenticated POST must return 401');

// 2. Invalid bearer token returns 401
const badTokRes = await handleCrawlDrafts(
  new Request('https://csodisha.com/api/admin/crawl-drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer wrong-token'
    },
    body: JSON.stringify({ drafts: [] })
  }),
  env
);
assert.equal(badTokRes.status, 401, 'Invalid sync token must return 401');

// 3. Valid sync token POST upserts verified .gov.in drafts & rejects non-.gov.in
const sampleDrafts = [
  {
    title: 'OPSC OAS 2026 Recruitment Notification',
    agency: 'OPSC',
    official_url: 'https://www.opsc.gov.in/Public/Pages/View_Content.aspx?id=123',
    last_date: '2026-12-15',
    important_dates: [{ label: 'Last Date to Apply', date: '2026-12-15' }],
    summary: 'Official OPSC notice',
    fetched_at: '2026-11-22T02:00:00Z'
  },
  {
    title: 'Unofficial blog spam',
    agency: 'Spam',
    official_url: 'https://example.com/fake.pdf',
    last_date: ''
  }
];

const postRes = await handleCrawlDrafts(
  new Request('https://csodisha.com/api/admin/crawl-drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-sync-secret-193'
    },
    body: JSON.stringify({ drafts: sampleDrafts })
  }),
  env
);
assert.equal(postRes.status, 200);
const postBody = await postRes.json();
assert.equal(postBody.ok, true);
assert.equal(postBody.inserted, 1);
assert.equal(postBody.updated, 0);
assert.equal(postBody.total_pending, 1);

// 4. Re-POST same URL updates instead of inserting duplicate
const repostRes = await handleCrawlDrafts(
  new Request('https://csodisha.com/api/admin/crawl-drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Crawl-Sync-Token': 'test-sync-secret-193'
    },
    body: JSON.stringify({ drafts: [sampleDrafts[0]] })
  }),
  env
);
const repostBody = await repostRes.json();
assert.equal(repostBody.inserted, 0);
assert.equal(repostBody.updated, 1);
assert.equal(repostBody.total_pending, 1);

// 5. GET returns pending drafts with parsed important_dates
const getRes = await handleCrawlDrafts(
  new Request('https://csodisha.com/api/admin/crawl-drafts', {
    method: 'GET',
    headers: { 'X-Crawl-Sync-Token': 'test-sync-secret-193' }
  }),
  env
);
assert.equal(getRes.status, 200);
const getBody = await getRes.json();
assert.equal(getBody.ok, true);
assert.equal(getBody.drafts.length, 1);
assert.equal(getBody.drafts[0].agency, 'OPSC');
assert.equal(getBody.drafts[0].important_dates[0].date, '2026-12-15');

// 6. Verify admin UI, scripts, .gitignore, and strict CSP compliance
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
const fastPubJs = fs.readFileSync(path.join(ROOT, 'admin', 'fast-publish.js'), 'utf8');
const routerJs = fs.readFileSync(path.join(ROOT, 'functions', 'api', 'admin', '_router.js'), 'utf8');
const runSh = fs.readFileSync(path.join(ROOT, 'scripts', 'crawl4ai', 'run_watcher.sh'), 'utf8');
const installSh = fs.readFileSync(path.join(ROOT, 'scripts', 'crawl4ai', 'install-persistent-runner.sh'), 'utf8');
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');

assert.ok(routerJs.includes("resource === 'crawl-drafts'"), '_router.js must route crawl-drafts');
assert.ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v193') || adminHtml.includes('/admin/fast-publish.js?v=20261122v199') || adminHtml.includes('/admin/fast-publish.js?v=20261122v200'), 'admin/index.html must bump fast-publish.js');
assert.ok(adminHtml.includes('/admin/studio.css?v=20261122v193') || adminHtml.includes('/admin/studio.css?v=20261122v199') || adminHtml.includes('/admin/studio.css?v=20261122v200'), 'admin/index.html must bump studio.css');
assert.ok(fastPubJs.includes('/api/admin/crawl-drafts'), 'admin/fast-publish.js must fetch /api/admin/crawl-drafts');
assert.ok(fastPubJs.includes('Sync Live D1 Queue'), 'admin/fast-publish.js must include Sync Live D1 Queue button');
assert.ok(!/\.innerHTML\b/.test(fastPubJs), 'No .innerHTML allowed in admin/fast-publish.js');
assert.ok(!/<style\b/i.test(adminHtml) && !/\sstyle\s*=/i.test(adminHtml), 'No inline styles in admin/index.html');
assert.ok(runSh.includes('watch_gov_notices.py --sync'), 'run_watcher.sh must support --sync');
assert.ok(installSh.includes('07:30:00') && installSh.includes('19:30:00'), 'install-persistent-runner.sh must schedule 7:30 AM & 7:30 PM');
assert.ok(gitignore.includes('scripts/crawl4ai/watcher.log'), '.gitignore must ignore watcher.log');

console.log('PASS: /api/admin/crawl-drafts D1 upsert/auth, Admin live queue UI, persistent runner & CSP verified (v193)');
