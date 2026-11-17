import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  invalidateEdgePaths,
  SETTINGS_PUBLIC_PATHS,
  EVENTS_PUBLIC_PATHS,
  SEO_PUBLIC_PATHS
} from '../functions/_lib/edge-cache-invalidator.js';
import { handleSettingsConfigBatch1Admin } from '../functions/_lib/settings-configuration-batch1.js';
import { handleEventsSchedulingBatch1Admin } from '../functions/_lib/events-scheduling-batch1.js';
import { handleSeoSearchDiscoveryBatch1Admin } from '../functions/_lib/seo-search-discovery-batch1.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  return {
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

// 1. Safe no-op in Node when globalThis.caches is absent
const noopReq = new Request('https://csodisha.com/api/admin/settings/general', { method: 'PUT' });
const noopRes = await invalidateEdgePaths(noopReq, SETTINGS_PUBLIC_PATHS);
assert.equal(noopRes.ok, true);
assert.equal(noopRes.invalidated, 0);

// 2. Mock globalThis.caches.default to verify invalidation on Settings, Events & SEO writes
const deletedUrls = [];
globalThis.caches = {
  default: {
    async delete(req) {
      deletedUrls.push(req.url);
      return true;
    }
  }
};

const env = { DB: createMockDb() };
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, path, body) => new Request(`https://csodisha.com/api/admin/${path}`, {
  method,
  headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1', 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

// 2a. Settings write -> invalidates /api/config/public
deletedUrls.length = 0;
const setRes = await handleSettingsConfigBatch1Admin(
  req('PUT', 'settings/general', { site_title_en: 'CS Odisha Portal' }),
  env, staff, 'general'
);
assert.equal(setRes.status, 200);
assert.ok(deletedUrls.includes('https://csodisha.com/api/config/public'));

// 2b. Events write -> invalidates /api/events/upcoming & ICS feeds
deletedUrls.length = 0;
const evtRes = await handleEventsSchedulingBatch1Admin(
  req('POST', 'events/exam-calendar', {
    event_code: 'EXM-2026-999',
    exam_name_en: 'OPSC OCS Test Event',
    commission_body: 'OPSC',
    exam_date_start: '2026-12-20'
  }),
  env, staff, 'exam-calendar'
);
assert.equal(evtRes.status, 201);
for (const p of EVENTS_PUBLIC_PATHS) {
  assert.ok(deletedUrls.includes(`https://csodisha.com${p}`), `Missing event purge for ${p}`);
}

// 2c. SEO write -> invalidates /api/seo/meta, robots.txt, sitemaps
deletedUrls.length = 0;
const seoRes = await handleSeoSearchDiscoveryBatch1Admin(
  req('POST', 'seo/meta', {
    route_pattern: '/test-v130/',
    meta_title_en: 'Test SEO Route',
    meta_description_en: 'Test description'
  }),
  env, staff, 'meta'
);
assert.equal(seoRes.status, 201);
for (const p of SEO_PUBLIC_PATHS) {
  assert.ok(deletedUrls.includes(`https://csodisha.com${p}`), `Missing SEO purge for ${p}`);
}

delete globalThis.caches;

// 3. Verify frontend files prioritize live /api/* endpoints before static JSON fallbacks
const appJs = fs.readFileSync('assets/app.js', 'utf8');
assert.ok(appJs.indexOf("fetch('/api/events/upcoming'") < appJs.indexOf("fetch('data/latest-updates.json'"));
assert.ok(appJs.includes("'/api/public/jobs-directory/overview'"));
assert.ok(appJs.includes("'/api/public/schemes-directory/overview'"));
assert.ok(appJs.includes("'/api/public/study-library/items?limit=100'"));
assert.ok(appJs.includes("'/api/public/community-directory/overview'"));

const commDash = fs.readFileSync('community/assets/dashboard.js', 'utf8');
assert.ok(commDash.indexOf("fetch('/api/public/community-directory/overview'") < commDash.indexOf("fetch('./generated/directory.json')"));

console.log('ALL REAL-TIME SYNC & EDGE CACHE INVALIDATION (v130) TESTS PASSED');
