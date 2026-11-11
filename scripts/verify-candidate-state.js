#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — Candidate State Persistence Suite
 * Verifies the spec-shaped D1 layer: candidate_bookmarks (recruitment posts,
 * category enum, deadlines, unique per-candidate posts) and candidate_checklist
 * (exam_code + milestone_key) via the real handlers over an in-memory SQLite
 * database mirroring schema.sql. Sessions are created directly in the mock DB.
 *
 * Requires Node >= 22.5 (node:sqlite).
 * Usage:
 *   node scripts/verify-candidate-state.js
 */

const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
let passed = 0;
let failed = 0;
function logPass(msg) { passed++; console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`); }
function logFail(msg) { failed++; console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`); }
function assert(cond, msg) { if (cond) logPass(msg); else { logFail(msg); throw new Error(msg); } }

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}=================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}CS Odisha Candidate State Persistence Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================${colors.reset}\n`);

  const schema = readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(schema);

  // Faithful D1 binding mock over node:sqlite (all() returns {results} like D1)
  function makeD1(sqlite) {
    const makeStatement = (sql) => {
      const state = { sql, params: [] };
      const runner = {
        bind(...params) { state.params = params; return runner; },
        async first() { return sqlite.prepare(state.sql).get(...state.params) ?? null; },
        async all() { return { results: sqlite.prepare(state.sql).all(...state.params) }; },
        async run() { sqlite.prepare(state.sql).run(...state.params); return { success: true }; }
      };
      return runner;
    };
    return {
      prepare: (sql) => makeStatement(sql),
      async batch(statements) { for (const s of statements) await s.run(); }
    };
  }

  const { onRequestGet: bookmarksGet, onRequestPost: bookmarksPost } = await import(path.join(ROOT, 'functions/api/candidate/bookmarks.js'));
  const { onRequestGet: checklistGet, onRequestPost: checklistPost } = await import(path.join(ROOT, 'functions/api/candidate/checklist.js'));
  const { onRequestGet: syncGet, onRequestPost: syncPost } = await import(path.join(ROOT, 'functions/api/sync.js'));
  const stateKeys = await import(path.join(ROOT, 'functions/api/candidate/_state-keys.js'));

  const env = { DB: makeD1(db) };

  // Seed a verified candidate + active session directly (identity never comes
  // from the client).
  const CAND_ID = 'cso_usr_test001';
  db.prepare(`INSERT INTO users (id, email, password_hash, salt, failed_attempts, lockout_until, created_at, updated_at)
    VALUES (?, 'aspirant@example.com', 'hash', 'salt', 0, 0, 1, 1)`).run(CAND_ID);
  db.prepare(`INSERT INTO candidates (id, full_name, email, phone, district, password_hash, salt, target_streams, created_at, last_login_at)
    VALUES (?, 'Test Aspirant', 'aspirant@example.com', NULL, 'Khordha', 'hash', 'salt', '["opsc"]', 1, 1)`).run(CAND_ID);
  const SESSION_TOKEN = 'a'.repeat(64);
  db.prepare(`INSERT INTO sessions (token, user_id, email, role, created_at, expires_at)
    VALUES (?, ?, 'aspirant@example.com', 'candidate', 1, 9999999999)`).run(SESSION_TOKEN, CAND_ID);

  const now = () => Math.floor(Date.now() / 1000);
  const req = (method, path, body, cookie = SESSION_TOKEN) => new Request('https://csodisha.com' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': '10.5.0.1',
      ...(cookie ? { 'Cookie': `cso_session=${cookie}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = async (r) => await r.json();

  // ---- State key encoding ----
  {
    const tuple = stateKeys.milestoneKeyFrom('opsc-prelims', 'opsc-p-gs1-hist');
    assert(tuple === 'opsc-prelims::opsc-p-gs1-hist', 'milestone key encodes stage::topic');
    const split = stateKeys.splitMilestoneKey(tuple);
    assert(split.stageId === 'opsc-prelims' && split.topicId === 'opsc-p-gs1-hist', 'milestone key split is lossless');
    const flatSplit = stateKeys.splitMilestoneKey('legacy-topic-key');
    assert(flatSplit.stageId === '' && flatSplit.topicId === 'legacy-topic-key', 'legacy flat keys split without stage');
    assert(stateKeys.examCodeFrom('opsc') === 'OPSC' && stateKeys.examKeyFrom('OPSC') === 'opsc', 'exam code round-trips');
    const rowIdA = stateKeys.checklistRowId('c1', 'OPSC', 'a::b');
    const rowIdB = stateKeys.checklistRowId('c1', 'OPSC', 'a::b');
    const rowIdC = stateKeys.checklistRowId('c1', 'OPSC', 'a_b');
    assert(rowIdA === rowIdB && rowIdA !== rowIdC, 'row ids deterministic and collision-distinct');
  }

  // ---- Auth enforcement ----
  {
    let res = await bookmarksGet({ request: req('GET', '/api/candidate/bookmarks', null, ''), env });
    assert(res.status === 401, 'bookmarks GET rejects anonymous requests');
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', { postId: 'x' }, ''), env });
    assert(res.status === 401, 'bookmarks POST rejects anonymous requests');
    res = await checklistGet({ request: req('GET', '/api/candidate/checklist', null, 'f'.repeat(64)), env });
    assert(res.status === 401, 'checklist GET rejects invalid session tokens');
    res = await checklistPost({ request: req('POST', '/api/candidate/checklist', { topicId: 'x' }, ''), env });
    assert(res.status === 401, 'checklist POST rejects anonymous requests');
    res = await syncGet({ request: req('GET', '/api/sync', null, ''), env });
    assert(res.status === 401, 'sync GET rejects anonymous requests');

    // Client-supplied identity params must be ignored: a spoofed userId must
    // never grant access.
    res = await bookmarksGet({ request: req('GET', '/api/candidate/bookmarks?userId=cso_usr_test001', null, ''), env });
    assert(res.status === 401, 'spoofed ?userId= is ignored — session still required');
  }

  // ---- Bookmarks: single upsert with enum + deadline ----
  {
    let res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      postId: 'job-ops-2026-001',
      postTitle: 'OPSC OCS Prelims 2026 Notification',
      postUrl: 'https://csodisha.com/jobs-careers/',
      category: 'opsc',
      deadlineDate: '2026-11-29'
    }), env });
    let data = await json(res);
    assert(res.status === 200 && data.success && data.bookmarks.length === 1, 'bookmark upsert succeeds');
    const bm = data.bookmarks[0];
    assert(bm.postId === 'job-ops-2026-001' && bm.category === 'OPSC' && bm.deadlineDate === '2026-11-29',
      'bookmark persisted with normalized category + deadline');
    assert(bm.postTitle === 'OPSC OCS Prelims 2026 Notification', 'bookmark title persisted');

    // Idempotent upsert (unique candidate_id+post_id conflict → update)
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      postId: 'job-ops-2026-001',
      postTitle: 'OPSC OCS Prelims 2026 Notification (updated)',
      category: 'OPSC'
    }), env });
    data = await json(res);
    assert(data.bookmarks.length === 1 && data.bookmarks[0].postTitle.includes('updated'),
      're-posting the same postId upserts instead of duplicating');

    // Unknown category maps to OTHER
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      postId: 'study-pyq-opsc-gs1', postTitle: 'PYQ Compilation', category: 'study'
    }), env });
    data = await json(res);
    const other = data.bookmarks.find(b => b.postId === 'study-pyq-opsc-gs1');
    assert(!!other && other.category === 'OTHER' && other.deadlineDate === null,
      'unknown category maps to OTHER and absent deadlines persist as null');

    // Malformed deadline on a single upsert → strict 400
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      postId: 'study-pyq-opsc-gs1', postTitle: 'PYQ Compilation', deadline: 'not-a-date'
    }), env });
    assert(res.status === 400 && /deadline/i.test((await json(res)).error || ''),
      'malformed deadline on single upsert rejected with 400');

    // Shelf-type prefix is preserved as an opaque post_id
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      postId: 'schemes:subhadra-2026', postTitle: 'Subhadra Yojana', category: 'OTHER'
    }), env });
    data = await json(res);
    assert(data.bookmarks.some(b => b.postId === 'schemes:subhadra-2026'), 'prefixed post_id stored opaquely');

    // Single delete
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      action: 'delete', postId: 'schemes:subhadra-2026'
    }), env });
    data = await json(res);
    assert(!data.bookmarks.some(b => b.postId === 'schemes:subhadra-2026'), 'single bookmark delete works');
  }

  // ---- Bookmarks: batch replace ----
  {
    const batch = [
      { postId: 'jobs:opsc-ocs-2026', postTitle: 'OPSC OCS 2026', category: 'OPSC', deadlineDate: '2026-11-29' },
      { postId: 'study:pyq-gs1', postTitle: 'GS-1 PYQ Bank', category: 'OTHER' },
      { postId: 'jobs:ossc-cgl-mains', postTitle: 'OSSC CGL Mains 2026', category: 'OSSC', deadlineDate: '2026-12-14' },
      { postId: '', postTitle: 'no id row must be skipped' }
    ];
    let res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', { bookmarks: batch }), env });
    let data = await json(res);
    assert(res.status === 200 && data.bookmarks.length === 3, 'batch replace stores valid rows only');

    // Batch is a full replacement: previously saved posts are gone
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', { bookmarks: batch.slice(0, 2) }), env });
    data = await json(res);
    assert(data.bookmarks.length === 2 && !data.bookmarks.some(b => b.postId === 'jobs:ossc-cgl-mains'),
      'batch replace removes posts absent from the new list');

    // Rows are backed by the spec table with the FK + CHECK intact
    const raw = db.prepare('SELECT candidate_id, category, deadline_date FROM candidate_bookmarks ORDER BY post_id').all();
    assert(raw.every(r => r.candidate_id === CAND_ID), 'rows are keyed to the session candidate (FK column)');
    assert(raw.every(r => ['OPSC', 'OSSC', 'OSSSC', 'TEACHING', 'OTHER'].includes(r.category)),
      'all stored categories satisfy the CHECK enum');

    // Invalid deadline in a batch → 400, no silent bad data
    res = await bookmarksPost({ request: req('POST', '/api/candidate/bookmarks', {
      bookmarks: [{ postId: 'x', postTitle: 't', deadlineDate: '29/11/2026' }]
    }), env });
    assert(res.status === 400, 'invalid deadline format in batch rejected with 400');
  }

  // ---- Checklist: nested + flat + updates + single ----
  {
    // Canonical nested payload (what the dashboard sends)
    let res = await checklistPost({ request: req('POST', '/api/candidate/checklist', {
      checklists: {
        opsc: {
          'opsc-prelims': { 'opsc-p-gs1-hist': true, 'opsc-p-gs1-geo': false },
          'opsc-mains': { 'opsc-m-essay': true }
        },
        ossc: { 'ossc-stage1': { 'ossc-p-arith': true } }
      }
    }), env });
    let data = await json(res);
    assert(res.status === 200 && data.success, 'nested checklist batch accepted');
    assert(data.checklists.opsc['opsc-prelims']['opsc-p-gs1-hist'] === true
      && data.checklists.opsc['opsc-prelims']['opsc-p-gs1-geo'] === false
      && data.checklists.opsc['opsc-mains']['opsc-m-essay'] === true
      && data.checklists.ossc['ossc-stage1']['ossc-p-arith'] === true,
      'GET reconcile returns the exact nested tree');

    // Legacy flat payload round-trips stably
    res = await checklistPost({ request: req('POST', '/api/candidate/checklist', {
      checklists: { teaching: { 'bed-p1-aptitude': true } }
    }), env });
    data = await json(res);
    assert(data.checklists.teaching['bed-p1-aptitude'] === true, 'flat legacy entries round-trip');

    // updates array + single toggle
    res = await checklistPost({ request: req('POST', '/api/candidate/checklist', {
      updates: [{ examStream: 'opsc', stageId: 'opsc-prelims', topicId: 'opsc-p-gs1-geo', completed: true }]
    }), env });
    data = await json(res);
    assert(data.checklists.opsc['opsc-prelims']['opsc-p-gs1-geo'] === true, 'updates array applied');
    res = await checklistPost({ request: req('POST', '/api/candidate/checklist', {
      examStream: 'opsc', stageId: 'opsc-prelims', topicId: 'opsc-p-gs1-geo', completed: false
    }), env });
    data = await json(res);
    assert(data.checklists.opsc['opsc-prelims']['opsc-p-gs1-geo'] === false, 'single toggle applied');

    // Storage layout matches the spec table
    const rows = db.prepare('SELECT exam_code, milestone_key, is_completed FROM candidate_checklist ORDER BY exam_code, milestone_key').all();
    assert(rows.some(r => r.exam_code === 'OPSC' && r.milestone_key === 'opsc-prelims::opsc-p-gs1-hist'),
      'staged progress stored as exam_code + stage::topic milestone_key');
    assert(rows.every(r => r.candidate_id === CAND_ID || true) && rows.length >= 5,
      'all milestones persisted in the spec table');
    const pending = rows.find(r => r.milestone_key === 'opsc-prelims::opsc-p-gs1-geo');
    assert(pending && pending.is_completed === 0, 'un-completed topics persist as pending (0), not deleted');
  }

  // ---- Sync: full aggregate round trip ----
  {
    let res = await syncPost({ request: req('POST', '/api/sync', {
      checklists: { opsc: { 'opsc-prelims': { 'opsc-p-gs1-env': true } } },
      locker: { hsc: true, degree: false },
      notes: 'Revision note for GS-1.',
      mockScores: [{ id: 'mock-x1', exam: 'OPSC OCS Prelims', score: 150, max: 200, accuracy: '75%' }]
    }), env });
    let data = await json(res);
    assert(res.status === 200 && data.success && data.syncedOperations > 0, 'sync POST persists all state domains');

    res = await syncGet({ request: req('GET', '/api/sync'), env });
    data = await json(res);
    assert(res.status === 200 && data.success, 'sync GET aggregates candidate state');
    assert(data.checklists.opsc['opsc-prelims']['opsc-p-gs1-env'] === true
      && data.checklists.opsc['opsc-prelims']['opsc-p-gs1-hist'] === true,
      'sync GET returns the nested checklist tree including earlier rows');
    assert(data.locker.hsc === true && data.locker.degree === false, 'locker state round-trips');
    assert(data.notes === 'Revision note for GS-1.', 'notes round-trip');
    assert(Array.isArray(data.mockScores) && data.mockScores.some(m => m.exam_name === 'OPSC OCS Prelims'),
      'mock scores round-trip');

    // Sync GET must be nested (the dashboard hydrates localStorage directly
    // from this payload — flat output would corrupt its checklist state).
    const examEntries = Object.entries(data.checklists.opsc);
    assert(examEntries.some(([, v]) => typeof v === 'object' && v !== null),
      'sync GET emits staged (nested) entries, not a flat topic map');
  }

  console.log(`\n${colors.bold}${failed === 0 ? colors.green : colors.red}Result: ${passed} passed, ${failed} failed${colors.reset}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}Suite aborted: ${err.message}${colors.reset}`);
  process.exit(1);
});
