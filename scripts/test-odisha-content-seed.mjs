import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureJobsDirectoryStudioSchema } from '../functions/_lib/jobs-directory-studio.js';
import { ensureSchemesDirectoryStudioSchema } from '../functions/_lib/schemes-directory-studio.js';
import { ensureStudyLibraryStudioSchema } from '../functions/_lib/study-library-studio.js';
import { ensureLiveOdishaDirectoryContentSeeded } from '../functions/_lib/odisha-directory-seed.js';

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

const db = createMockDb();

// 1. Bootstrap all 3 directory schemas (triggers ensureLiveOdishaDirectoryContentSeeded)
await ensureJobsDirectoryStudioSchema(db);
await ensureSchemesDirectoryStudioSchema(db);
await ensureStudyLibraryStudioSchema(db);

// 2. Verify Jobs & Careers Directory (5 seeded bilingual Odisha/NTA records)
const jobsRes = await db.prepare(
  `SELECT * FROM jobs_directory_items WHERE id LIKE 'job-live-%' ORDER BY id ASC`
).all();
const jobs = jobsRes.results || [];
assert.equal(jobs.length, 5);
for (const j of jobs) {
  assert.equal(j.status, 'published');
  assert.equal(j.language, 'EN+OR');
  assert.ok(/\.(gov\.in|ac\.in)$/i.test(new URL(j.official_apply_url).hostname), `Invalid official URL: ${j.official_apply_url}`);
  assert.ok(j.verified_at.endsWith('+05:30'));
  assert.ok(!j.summary.includes('<script>') && !j.body_html.includes('<script>'));
}

// 3. Verify Schemes & Benefits Directory (5 seeded bilingual Odisha welfare schemes)
const schemesRes = await db.prepare(
  `SELECT * FROM schemes_directory_items WHERE id LIKE 'sch-live-%' ORDER BY id ASC`
).all();
const schemes = schemesRes.results || [];
assert.equal(schemes.length, 5);
for (const s of schemes) {
  assert.equal(s.status, 'published');
  assert.equal(s.language_parity, 'EN+OR');
  assert.equal(Number(s.official_portal_verified), 1);
  assert.ok(s.title_or.length > 0);
  assert.ok(/\.odisha\.gov\.in$/i.test(new URL(s.official_apply_url).hostname), `Invalid Odisha govt URL: ${s.official_apply_url}`);
  assert.ok(s.verified_at.endsWith('+05:30'));
  assert.ok(!s.summary.includes('<script>') && !s.body_html.includes('<script>'));
}

// 4. Verify Study Library Directory (5 seeded bilingual Odisha/UGC NET study packs)
const studyRes = await db.prepare(
  `SELECT * FROM study_library_items WHERE id LIKE 'std-live-%' ORDER BY id ASC`
).all();
const study = studyRes.results || [];
assert.equal(study.length, 5);
for (const st of study) {
  assert.equal(st.status, 'published');
  assert.equal(st.language_parity, 'EN+OR');
  assert.ok(st.created_at.endsWith('+05:30'));
  assert.ok(!st.summary.includes('<script>') && !st.body_html.includes('<script>'));
}

// 5. Idempotency: admin edit is never overwritten on re-seed
await db.prepare(
  `UPDATE schemes_directory_items SET benefit_amount = 'Custom Admin Updated Benefit' WHERE id = 'sch-live-odisha-subhadra-yojana'`
).run();
await ensureLiveOdishaDirectoryContentSeeded(db);
const subhadra = await db.prepare(
  `SELECT benefit_amount FROM schemes_directory_items WHERE id = 'sch-live-odisha-subhadra-yojana'`
).first();
assert.equal(subhadra.benefit_amount, 'Custom Admin Updated Benefit');

console.log('ALL LIVE ODISHA CONTENT SEED TESTS PASSED (5 Jobs, 5 Schemes, 5 Study Packs)');
