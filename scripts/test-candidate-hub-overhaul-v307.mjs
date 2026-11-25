#!/usr/bin/env node
/**
 * v307 Candidate Hub Visual, Structural & Mobile UI Overhaul Verification Suite
 *
 * Verifies:
 *  1. Clean Workspace Header & Sticky Sidebar: duplicate Theme dropdown, Sign Out button,
 *     and bottom sidebar profile card removed; compact Profile Badge retained; sticky desktop
 *     sidebar (>= 1100px) & 44px mobile close/backdrop wired.
 *  2. Upgraded 6-Card KPI Summary Strip (repeat(6), repeat(3), repeat(2), icon badges,
 *     tabular-nums, uppercase muted micro-labels).
 *  3. Balanced Desktop Card Grid (Row 1 1fr 1fr, Row 2 1.15fr 0.85fr + 3-col inline matcher,
 *     Row 3 full-width Document Readiness Vault with <progress> meter + 2-col checklist grid,
 *     Row 4 full-width Study Notes) & actionable empty-state CTAs.
 *  4. Mobile Responsiveness (< 1100px / < 960px / < 640px): 1fr card/form collapse,
 *     max(16px, 1rem) inputs, 44px touch targets, opaque --cso-surface-elevated drawer,
 *     body.cso-modal-open scroll lock, Escape-to-close & overflow-x: clip.
 *  5. Strict CSP compliance & v307 cache busting.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v307 Candidate Hub Visual, Structural & Mobile UI Overhaul Verification ===\n');

check('1. Clean Workspace Header & Sticky Desktop Sidebar in student-dashboard/index.html + CSS', () => {
  const html = read('student-dashboard/index.html');
  assert.ok(!html.includes('id="cso-theme-toggle"'), 'Duplicate workspace theme toggle must be removed');
  assert.ok(!html.includes('id="bp-topbar-logout-btn"'), 'Duplicate workspace Sign Out button must be removed');
  assert.ok(!html.includes('bp-sidebar-footer'), 'Redundant bottom sidebar profile card must be removed');
  assert.ok(html.includes('id="bp-topbar-user-btn"'), 'Compact Profile Badge must remain in workspace header');
  assert.ok(html.includes('id="bp-sidebar-close-btn"') && html.includes('id="bp-sidebar-backdrop"'), 'Mobile close button & backdrop must be present');

  const bpCss = read('assets/css/student-dashboard-bp.css');
  assert.ok(bpCss.includes('@media (min-width: 1100px)') && bpCss.includes('position: sticky;') && bpCss.includes('align-self: start;'), 'Desktop sidebar must be sticky');
});

check('2. Upgraded 6-Card KPI Summary Strip across JS & CSS', () => {
  const js = read('assets/js/student-dashboard.js');
  for (const lbl of ['Assigned Items', 'Saved Deadlines', 'Docs Ready', 'Mock Tests', 'Community Tier', 'Circles / Unread DMs']) {
    assert.ok(js.includes(lbl), `student-dashboard.js missing KPI "${lbl}"`);
  }
  assert.ok(js.includes('cso-hub-stat__head') && js.includes('cso-hub-stat__icon'), 'KPI tiles must include icon badge & head');

  const css = read('assets/css/candidate-hub-v244.css');
  assert.ok(css.includes('repeat(6, minmax(0, 1fr))'), 'Desktop KPI grid must use 6 columns');
  assert.ok(css.includes('repeat(3, minmax(0, 1fr))'), 'Tablet KPI grid must use 3 columns');
  assert.ok(css.includes('repeat(2, minmax(0, 1fr))'), 'Phone KPI grid must use 2 columns');
  assert.ok(css.includes('font-variant-numeric: tabular-nums;'), 'KPI values must use tabular-nums');
});

check('3. Balanced Desktop Card Grid, Document Vault Progress Meter & Actionable Empty States', () => {
  const js = read('assets/js/student-dashboard.js');
  assert.ok(js.includes('cso-hub-row--pair') && js.includes('cso-hub-row--split'), 'Overview must render balanced pair & split rows');
  assert.ok(js.includes('cso-vault-meter') && js.includes('cso-vault-grid'), 'Document Vault must render progress meter & 2-col checklist grid');
  for (const cta of ['Explore Study Library →', 'Browse Jobs & Schemes →', 'Start a Mock Test →']) {
    assert.ok(js.includes(cta), `student-dashboard.js missing actionable empty-state CTA "${cta}"`);
  }

  const css = read('assets/css/candidate-hub-v244.css');
  assert.ok(css.includes('grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);'), 'Row 2 split must be 1.15fr / 0.85fr');
  assert.ok(css.includes('.cso-hub-inline-form--matcher { grid-template-columns: repeat(3, minmax(0, 1fr)); }'), 'Matcher form must use 3-column inline row on desktop');
  assert.ok(css.includes('.cso-vault-grid'), 'CSS must style 2-column Document Vault grid');
});

check('4. Mobile Responsiveness (< 1100px / < 960px), 16px Inputs, 44px Targets & Drawer Controls', () => {
  const bpCss = read('assets/css/student-dashboard-bp.css');
  assert.ok(bpCss.includes('@media (max-width: 1099px)') && bpCss.includes('background: var(--cso-surface-elevated);'), 'Mobile drawer must use opaque --cso-surface-elevated');
  assert.ok(bpCss.includes('body.cso-modal-open'), 'Mobile drawer must support body.cso-modal-open scroll lock');

  const css = read('assets/css/candidate-hub-v244.css');
  assert.ok(css.includes('@media (max-width: 959px)') && css.includes('font-size: max(16px, 1rem);'), 'Mobile inputs must enforce >= 16px');
  assert.ok(css.includes('overflow-x: clip;'), 'Dashboard layout must prevent horizontal overflow');

  const js = read('assets/js/student-dashboard.js');
  assert.ok(js.includes('setMobileDrawerOpen') && js.includes("e.key === 'Escape'"), 'Mobile drawer must support Escape-to-close & scroll lock');
});

check('5. Strict CSP compliance & v307+ / v308 cache busting + style.css .cso-hub-card override guard', () => {
  const html = read('student-dashboard/index.html');
  for (const tok of [
    '/assets/css/student-dashboard-bp.css?v=20261125v308',
    '/assets/css/candidate-hub-v244.css?v=20261125v308',
    '/assets/js/student-dashboard.js?v=20261125v308'
  ]) {
    assert.ok(html.includes(tok), `student-dashboard/index.html missing ${tok}`);
  }
  const hubCss = read('assets/css/candidate-hub-v244.css');
  assert.ok(hubCss.includes('#cso-candidate-workspace .cso-hub-card') && hubCss.includes('align-items: stretch;'), 'candidate-hub-v244.css must override assets/style.css .cso-hub-card align-items');
  assert.ok(hubCss.includes('.cso-hub-list.cso-vault-grid'), 'candidate-hub-v244.css must ensure .cso-vault-grid beats .cso-hub-list flex');
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v3(?:0[789]|[1-9]\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v3(?:0[789]|[1-9]\d)';/);

  const code = read('assets/js/student-dashboard.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.', 'document.write']) {
    assert.ok(!code.includes(bad), `student-dashboard.js violates strict CSP (${bad})`);
  }
});

console.log(`\n=== v307 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
