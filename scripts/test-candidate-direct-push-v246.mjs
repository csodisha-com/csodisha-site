#!/usr/bin/env node
/**
 * v246 One-Step Direct File Upload & Instant Push to Candidate Dashboard Verification
 * Verifies:
 *  1. POST /api/admin/candidate-hub/upload-and-push (STAFF_ROLES gated) accepts multipart/form-data,
 *     uploads to R2 (candidate-assigned/<ts>-<slug>.<ext>), registers media_files/media_assets,
 *     auto-fills title from filename, and pushes candidate_assigned_items for all scopes including selected_users.
 *  2. /api/media/_serve.js allows candidate-assigned/* keys & PDF/image/doc/txt/mp3/zip extensions.
 *  3. Candidate endpoints /api/candidate/assigned-items & /api/candidate/assigned-items/ack record
 *     seen, download, and completed acknowledgments.
 *  4. Admin Studio Tab 4, 360° Authority Drawer & Bulk Assign Modal embed drag-and-drop Direct Upload & Push
 *     and display Seen / Download telemetry badges.
 *  5. Candidate Dashboard renders priority highlight strip, file badge, Open/Download & Mark Completed toggle.
 *  6. Strict CSP compliance and sw.js / ops-sentinel.js bumped to cso-candidate-cache-v246.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let passed = 0;
let failed = 0;

function check(label, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  PASS: ${label}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  FAIL: ${label}\n        ${err.message}`);
      failed++;
    });
}

console.log('\n=== v246 One-Step Direct Upload & Instant Push Verification ===');

await check('Router gates upload-and-push to STAFF_ROLES & _worker.js wires assigned-items + ack', () => {
  const router = read('functions/api/admin/_router.js');
  assert.ok(router.includes("id === 'upload-and-push' ? STAFF_ROLES"));
  const worker = read('_worker.js');
  assert.ok(worker.includes("'/api/candidate/assigned-items'") && worker.includes("'/api/candidate/assigned-items/ack'"));
  const serve = read('functions/api/media/_serve.js');
  assert.ok(serve.includes('candidate-assigned\\/') && serve.includes('docx:'));
});

await check('Backend upload-and-push uploads to R2, registers media & pushes to selected_users', async () => {
  const mod = await import(path.join(ROOT, 'functions/_lib/candidate-hub-governance.js'));
  const r2Writes = [];
  const sqlCalls = [];
  const mockDb = {
    async batch(stmts) { return stmts.map(() => ({ success: true })); },
    prepare(sql) {
      sqlCalls.push(sql);
      return {
        bind() { return this; },
        async first() { return null; },
        async all() { return { results: [] }; },
        async run() { return { success: true }; }
      };
    }
  };
  const env = {
    DB: mockDb,
    MEDIA: {
      async put(key, buf, opts) { r2Writes.push({ key, size: buf.byteLength, contentType: opts.httpMetadata.contentType }); }
    }
  };
  const actor = { userId: 'ed-1', email: 'editor@csodisha.com', role: 'editor' };
  const fd = new FormData();
  fd.append('file', new File([new Uint8Array([37, 80, 68, 70, 45])], 'OPSC_OAS_Notes_2026.pdf', { type: 'application/pdf' }));
  fd.append('target_scope', 'selected_users');
  fd.append('target_user_ids', JSON.stringify(['cand-1', 'cand-2']));
  fd.append('item_type', 'study_pack');
  fd.append('priority', 'urgent');

  const res = await mod.handleAdminCandidateHubStudio(
    new Request('https://csodisha.com/api/admin/candidate-hub/upload-and-push', { method: 'POST', body: fd }),
    env,
    actor,
    'upload-and-push',
    null,
    null
  );
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.pushed_count, 2);
  assert.equal(r2Writes.length, 1);
  assert.match(r2Writes[0].key, /^candidate-assigned\/\d+-opsc-oas-notes-2026\.pdf$/);
  assert.equal(r2Writes[0].contentType, 'application/pdf');
  assert.ok(body.url.startsWith('/api/media/candidate-assigned/'));
  assert.ok(sqlCalls.some(s => s.includes('INSERT OR IGNORE INTO media_files')));
  assert.ok(sqlCalls.some(s => s.includes('INSERT INTO candidate_assigned_items')));
});

await check('Admin Studio UI embeds Direct Upload & Push dropzone across Tab 4, Drawer & Bulk Modal + telemetry', () => {
  const js = read('admin/candidate-hub-studio.js');
  for (const token of [
    'buildDirectUploadPushWidget', 'ch-dropzone', 'uploadAndPushWithProgress',
    '/api/admin/candidate-hub/upload-and-push', 'openBulkAssignModal',
    'Direct Upload & Push to Candidate Dashboard', 'Upload to R2 & Push Live',
    'seen_count', 'download_count', '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.mp3,.zip'
  ]) {
    assert.ok(js.includes(token), `candidate-hub-studio.js includes "${token}"`);
  }
  const css = read('admin/candidate-hub-studio.css');
  assert.ok(css.includes('.ch-dropzone') && css.includes('.ch-progress') && css.includes('.ch-telemetry-pill') && css.includes('.ch-modal'));
});

await check('Candidate Dashboard renders assigned files, priority highlight, Open/Download & Mark Completed + acks', () => {
  const js = read('assets/js/student-dashboard.js');
  for (const token of [
    '/api/candidate/assigned-items/ack', 'sendAssignedAck',
    'Open / Download', 'Mark Completed', 'Completed',
    'Priority Assigned Files & Alerts', 'file_size_bytes'
  ]) {
    assert.ok(js.includes(token), `student-dashboard.js includes "${token}"`);
  }
  const css = read('assets/css/candidate-hub-v244.css');
  assert.ok(css.includes('.cso-hub-highlight') && css.includes('.cso-hub-item.is-completed'));
});

await check('Strict CSP & sw.js / ops-sentinel.js bumped to cso-candidate-cache-v246+', () => {
  for (const rel of ['admin/candidate-hub-studio.js', 'assets/js/student-dashboard.js', 'functions/_lib/candidate-hub-governance.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel}: no innerHTML`);
    assert.equal(/\.style\.[a-zA-Z]|\.style\s*=|setAttribute\(\s*['"]style/.test(js), false, `${rel}: no .style.*`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(js), false, `${rel}: no inline handlers`);
  }
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v24[6-9]';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v24[6-9]';/);
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
