#!/usr/bin/env node
/**
 * v244 Candidate Hub, Governance & Dashboard UI/Feature Studio Verification
 * Verifies:
 *  1. Migration 0137 creates all 5 D1 tables with every required column and seeds defaults idempotently in SQLite.
 *  2. Backend enforceCandidateAccess rejects blocked/suspended (403 + block_reason) & stale session_version (401),
 *     and canCandidateAccessModule respects access_tier + per-candidate granted_modules_json overrides.
 *  3. Admin router & _worker.js wire /api/admin/candidates, /api/admin/candidate-hub/*, /api/candidate/hub-config,
 *     /api/candidate/matches, /api/candidate/workspace, /api/candidate/profile & /candidate/ redirect.
 *  4. Admin Studio includes unified Candidate Hub sidebar module (with live badge, Alt+7, Ctrl+K),
 *     all 5 sub-tabs, 360° Authority Drawer, 4-Theme UI Preview, Custom Feature Builder & R2 Picker.
 *  5. Live D1-driven student-dashboard/index.html & assets/js/student-dashboard.js link cso-themes.css,
 *     hydrate from /api/candidate/hub-config, render restricted screen on 403, and honor strict CSP.
 *  6. Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v244.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

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

console.log('\n=== v244 Candidate Hub, Governance & UI/Feature Studio Verification ===');

await check('Migration 0137 creates all 5 tables with exact columns and seeds idempotently in SQLite', () => {
  const sql = read('migrations/0137_candidate_hub_governance.sql');
  const db = new DatabaseSync(':memory:');
  db.exec(sql);
  db.exec(sql); // verify idempotency

  const tables = {
    candidate_hub_modules: ['id', 'module_key', 'title_en', 'title_or', 'subtitle_en', 'subtitle_or', 'icon', 'module_type', 'layout_slot', 'card_span', 'accent_variant', 'required_access_tier', 'sort_order', 'is_enabled', 'config_json', 'updated_at'],
    candidate_hub_ui_config: ['id', 'hero_title_en', 'hero_title_or', 'hero_subtitle_en', 'hero_subtitle_or', 'announcement_banner_en', 'announcement_banner_or', 'announcement_type', 'show_announcement', 'layout_mode', 'grid_columns', 'default_theme', 'allow_theme_switch', 'show_quick_stats', 'show_sidebar', 'custom_empty_title_en', 'custom_empty_title_or', 'updated_at'],
    candidate_doc_templates: ['id', 'doc_key', 'title_en', 'title_or', 'category', 'notes_en', 'notes_or', 'is_required', 'sort_order', 'is_published', 'updated_at'],
    candidate_governance: ['user_id', 'email', 'account_status', 'block_reason', 'access_tier', 'granted_modules_json', 'session_version', 'admin_notes', 'updated_by', 'updated_at'],
    candidate_assigned_items: ['id', 'target_scope', 'target_user_id', 'target_district', 'target_exam_board', 'item_type', 'title_en', 'title_or', 'summary_en', 'summary_or', 'resource_url', 'r2_file_key', 'priority', 'expires_at', 'is_published', 'created_by', 'created_at']
  };
  for (const [tbl, expectedCols] of Object.entries(tables)) {
    const cols = db.prepare(`PRAGMA table_info(${tbl})`).all().map(r => r.name);
    for (const c of expectedCols) {
      assert.ok(cols.includes(c), `${tbl} missing column ${c}`);
    }
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate_hub_modules').get().n, 8, '8 core modules seeded');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate_hub_ui_config').get().n, 1, 'default UI config seeded');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate_doc_templates').get().n, 8, '8 Odisha doc templates seeded');
});

await check('enforceCandidateAccess & canCandidateAccessModule enforce blocks, session_version & tier/overrides', async () => {
  const mod = await import(path.join(ROOT, 'functions/_lib/candidate-hub-governance.js'));

  const mockDb = (govRow) => ({
    async batch(stmts) { return stmts.map(() => ({ success: true })); },
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes('candidate_governance')) return govRow;
          return null;
        },
        async all() { return { results: [] }; },
        async run() { return { success: true }; }
      };
    }
  });

  // Blocked account must throw 403 with block_reason
  await assert.rejects(
    () => mod.enforceCandidateAccess(
      { DB: mockDb({ user_id: 'u1', account_status: 'blocked', block_reason: 'Policy breach', session_version: 2 }) },
      { userId: 'u1', email: 'c@test.com' }
    ),
    (err) => err.status === 403 && err.code === 'ACCOUNT_RESTRICTED' && err.extra.block_reason === 'Policy breach'
  );

  // Stale session_version must throw 401 SESSION_REVOKED
  await assert.rejects(
    () => mod.enforceCandidateAccess(
      { DB: mockDb({ user_id: 'u2', account_status: 'active', access_tier: 'verified', session_version: 5 }) },
      { userId: 'u2', email: 'c2@test.com', sessionVersion: 3 }
    ),
    (err) => err.status === 401 && err.code === 'SESSION_REVOKED'
  );

  // Access tier & per-candidate module overrides
  const mentorMod = { module_key: 'vip_tool', is_enabled: 1, required_access_tier: 'mentor' };
  assert.equal(mod.canCandidateAccessModule(mentorMod, 'standard', {}), false);
  assert.equal(mod.canCandidateAccessModule(mentorMod, 'mentor', {}), true);
  assert.equal(mod.canCandidateAccessModule(mentorMod, 'standard', { vip_tool: true }), true, 'override grants access');
  assert.equal(mod.canCandidateAccessModule(mentorMod, 'vip', { vip_tool: false }), false, 'override revokes access');
});

await check('Router & worker expose all v244 Admin & Candidate endpoints and enforce access', () => {
  const router = read('functions/api/admin/_router.js');
  assert.ok(router.includes('handleAdminCandidatesV244') && router.includes('handleAdminCandidateHubStudio'));
  assert.ok(router.includes("resource === 'candidate-hub'"));

  const worker = read('_worker.js');
  for (const route of ['/api/candidate/hub-config', '/api/candidate/matches', '/api/candidate/workspace', '/api/candidate/profile', '/api/auth/profile', '/candidate']) {
    assert.ok(worker.includes(route), `_worker.js routes ${route}`);
  }
  for (const rel of ['functions/api/candidate/bookmarks.js', 'functions/api/candidate/checklist.js', 'functions/api/sync.js']) {
    assert.ok(read(rel).includes('enforceCandidateAccess'), `${rel} enforces candidate access`);
  }
  assert.ok(read('functions/api/auth/me.js').includes('getCandidateGovernance'), 'me.js enforces candidate_governance');
});

await check('Admin Studio integrates unified Candidate Hub sidebar module, Alt+7, Ctrl+K & all 5 sub-tabs', () => {
  const adminHtml = read('admin/index.html');
  assert.ok(adminHtml.includes('/admin/candidate-hub-studio.css?v=20261124v244'));
  assert.ok(adminHtml.includes('/admin/candidate-hub-studio.js?v=20261124v244'));

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('folder-candidate-hub') && adminJs.includes('Candidate Hub') && adminJs.includes('candidateCount'));

  const cmdJs = read('admin/command-suite.js');
  assert.ok(cmdJs.includes('Alt+7') && cmdJs.includes('folder-candidate-hub') && cmdJs.includes('Digit[0-7]'));

  const hubAdminJs = read('admin/candidate-hub-studio.js');
  for (const token of [
    'Candidates Roster & Governance',
    'Dashboard UI Manager & Preview',
    'Add & Manage Features',
    'Provide Content & Push',
    'Document Vault Templates',
    '360° Candidate Authority Drawer',
    '+ Add New Candidate Feature',
    '4-Theme Live UI Preview',
    'Pick from R2 Media Library',
    'Bulk Block', 'Bulk Unblock', 'Bulk Assign Content', 'Bulk Change Tier', 'Export CSV',
    'Force Logout'
  ]) {
    assert.ok(hubAdminJs.includes(token), `candidate-hub-studio.js includes "${token}"`);
  }
});

await check('Live D1-driven Candidate Hub frontend wires cso-themes.css, hub-config, restricted 403 view & custom features', () => {
  const html = read('student-dashboard/index.html');
  assert.ok(html.includes('/assets/css/cso-themes.css?v=20261124v244'));
  assert.ok(html.includes('/assets/css/candidate-hub-v244.css?v=20261124v244'));
  assert.ok(html.includes('cso-restricted-screen') && html.includes('cso-hub-top-tabs') && html.includes('cso-hub-quick-stats'));

  const js = read('assets/js/student-dashboard.js');
  for (const token of ['/api/candidate/hub-config', '/api/candidate/workspace', '/api/candidate/matches', '/api/candidate/profile', 'renderRestrictedScreen', 'buildCustomFeatureCard', 'buildDocVaultCard', 'buildAssignedCard', 'buildMatcherCard']) {
    assert.ok(js.includes(token), `student-dashboard.js includes "${token}"`);
  }
});

await check('Strict CSP & 4-Theme CSS token compliance across all v244 files', () => {
  for (const rel of ['admin/candidate-hub-studio.js', 'admin/admin.js', 'admin/command-suite.js', 'assets/js/student-dashboard.js', 'functions/_lib/candidate-hub-governance.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel}: no innerHTML/outerHTML/insertAdjacentHTML`);
    assert.equal(/\.style\.[a-zA-Z]|\.style\s*=|setAttribute\(\s*['"]style/.test(js), false, `${rel}: no .style mutation`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(js), false, `${rel}: no inline handlers`);
  }
  for (const rel of ['admin/index.html', 'student-dashboard/index.html']) {
    const html = read(rel);
    assert.equal(/\sstyle\s*=\s*["']/i.test(html), false, `${rel}: no inline style=""`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(html), false, `${rel}: no inline on*=""`);
  }
  for (const rel of ['admin/candidate-hub-studio.css', 'assets/css/candidate-hub-v244.css']) {
    const css = read(rel);
    assert.ok(css.includes('var(--cso-'), `${rel} uses semantic --cso-* tokens`);
    assert.equal(/@import|https?:\/\//.test(css), false, `${rel}: self-hosted only`);
    assert.equal(/\bcolor\s*:\s*(#fff\b|#ffffff\b|#f8fafc\b|#f1f5f9\b|#e2e8f0\b|#cbd5e1\b|#94a3b8\b)/i.test(css), false, `${rel}: no unguarded light/white text colors`);
  }
});

await check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v244', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v244';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v244';"));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
