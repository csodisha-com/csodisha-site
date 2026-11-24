#!/usr/bin/env node
/**
 * v245 Candidate Hub Roster & Topbar UI Polish Verification
 * Verifies:
 *  1. Candidate count consistency (kpis.total_candidates === total) & self-lockout protection
 *     (400 SELF_LOCKOUT_PREVENTED on self block / force_logout; ADMIN badge & disabled self buttons in UI).
 *  2. District alias normalization (Balasore (Baleswar) -> Balasore, Khurda -> Khordha,
 *     Sonepur -> Subarnapur, Nowrangpur -> Nabarangpur, Jajapur -> Jajpur) & Target Exam label formatting.
 *  3. Two-line District & Qualification/Category cell and crisp Workspace Activity pills with tooltips.
 *  4. Topbar no-wrap polish (white-space: nowrap on pills, non-truncated Common Sense Odisha brand)
 *     and disabled/dimmed bulk action bar when 0 rows selected.
 *  5. Strict CSP compliance and sw.js / ops-sentinel.js bumped to cso-candidate-cache-v245.
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

console.log('\n=== v245 Candidate Hub Roster & Topbar Polish Verification ===');

await check('Backend normalizes Odisha district aliases and target exam slugs', async () => {
  const mod = await import(path.join(ROOT, 'functions/_lib/candidate-hub-governance.js'));
  assert.equal(mod.normalizeOdishaDistrict('Balasore (Baleswar)'), 'Balasore');
  assert.equal(mod.normalizeOdishaDistrict('Khurda'), 'Khordha');
  assert.equal(mod.normalizeOdishaDistrict('Sonepur'), 'Subarnapur');
  assert.equal(mod.normalizeOdishaDistrict('Nowrangpur'), 'Nabarangpur');
  assert.equal(mod.normalizeOdishaDistrict('Jajapur'), 'Jajpur');

  assert.equal(mod.formatTargetExamLabel('ugc-net'), 'UGC NET');
  assert.equal(mod.formatTargetExamLabel('odisha-bed'), 'Odisha B.Ed');
  assert.equal(mod.formatTargetExamLabel('opsc'), 'OPSC');
  assert.equal(mod.formatTargetExamLabel('ossc'), 'OSSC');
  assert.equal(mod.formatTargetExamLabel('osssc'), 'OSSSC');
});

await check('Backend enforces candidate count consistency and prevents admin self-lockout', async () => {
  const mod = await import(path.join(ROOT, 'functions/_lib/candidate-hub-governance.js'));
  const mockDb = {
    async batch(stmts) { return stmts.map(() => ({ success: true })); },
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes('COUNT(DISTINCT u.id)')) return { n: 2 };
          if (sql.includes('COUNT(*) AS n FROM users')) return { n: 4 };
          if (sql.includes('FROM users u')) return { id: 'admin-1', email: 'admin@csodisha.com', role: 'admin', full_name: 'Admin' };
          return { n: 0 };
        },
        async all() {
          return {
            results: [
              { id: 'admin-1', email: 'admin@csodisha.com', role: 'admin', full_name: 'Admin', district: 'Khurda', primary_exam: 'opsc', created_at: '2026-11-24' },
              { id: 'cand-1', email: 'c@test.com', role: 'candidate', full_name: 'Aspirant', district: 'Balasore (Baleswar)', primary_exam: 'ugc-net', created_at: '2026-11-24' }
            ]
          };
        },
        async run() { return { success: true }; }
      };
    }
  };
  const actor = { userId: 'admin-1', email: 'admin@csodisha.com', role: 'admin' };
  const listRes = await mod.handleAdminCandidatesV244(
    new Request('https://csodisha.com/api/admin/candidates?district=Khordha'),
    { DB: mockDb },
    actor,
    null
  );
  const data = await listRes.json();
  assert.equal(data.total, 2);
  assert.equal(data.kpis.total_candidates, 2, 'KPI total_candidates must match filtered total');
  assert.equal(data.current_actor_id, 'admin-1');
  assert.equal(data.items[0].is_self, true);
  assert.equal(data.items[0].district, 'Khordha');
  assert.equal(data.items[0].target_exam, 'OPSC');
  assert.equal(data.items[1].district, 'Balasore');
  assert.equal(data.items[1].target_exam, 'UGC NET');

  // Self-lockout protection on force_logout and block
  const selfLogoutRes = await mod.handleAdminCandidatesV244(
    new Request('https://csodisha.com/api/admin/candidates/admin-1', { method: 'POST', body: JSON.stringify({ action: 'force_logout' }) }),
    { DB: mockDb },
    actor,
    'admin-1'
  ).catch(e => e);
  assert.equal(selfLogoutRes.status, 400);
  assert.equal(selfLogoutRes.code, 'SELF_LOCKOUT_PREVENTED');
});

await check('Candidate Hub UI renders ADMIN badge, self-disabled actions, 2-line district/qual, activity pills & bulk disabled state', () => {
  const js = read('admin/candidate-hub-studio.js');
  for (const token of [
    'ch-badge--admin', "'ADMIN'", 'Self-lockout protection', 'num(r.total)',
    'ch-dist-main', 'ch-activity-pill', 'Saved: ', 'Docs: ', 'Mocks: ', 'Assigned: ',
    'aria-disabled', 'formatExamLabel', 'normalizeDistrict'
  ]) {
    assert.ok(js.includes(token), `candidate-hub-studio.js includes ${token}`);
  }
  const css = read('admin/candidate-hub-studio.css');
  assert.ok(css.includes('.ch-badge--admin') && css.includes('.ch-activity-pill') && css.includes('.ch-bulkbar .ch-btn:disabled'));
});

await check('Topbar CSS enforces white-space: nowrap on pills and prevents brand truncation', () => {
  const studioCss = read('admin/studio.css');
  assert.match(studioCss, /\.cso-telemetry-pill\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(studioCss, /\.cso-pill-link\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(studioCss, /\.cso-brand\s*\{[^}]*flex-shrink:\s*0/s);
  const brandNameBlock = studioCss.match(/\.cso-brand-name\s*\{[^}]*\}/s)?.[0] || '';
  assert.equal(brandNameBlock.includes('text-overflow: ellipsis'), false, '.cso-brand-name must not truncate with ellipsis');

  const cmdCss = read('admin/command-suite.css');
  assert.match(cmdCss, /\.cs-topbar-search\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(cmdCss, /\.cs-topbar-media\s*\{[^}]*white-space:\s*nowrap/s);
});

await check('Strict CSP & sw.js / ops-sentinel.js bumped to cso-candidate-cache-v245+', () => {
  for (const rel of ['admin/candidate-hub-studio.js', 'functions/_lib/candidate-hub-governance.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel}: no innerHTML`);
    assert.equal(/\.style\.[a-zA-Z]|\.style\s*=|setAttribute\(\s*['"]style/.test(js), false, `${rel}: no .style.*`);
  }
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v24[5-9]';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v24[5-9]';/);
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
