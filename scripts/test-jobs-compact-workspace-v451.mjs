#!/usr/bin/env node
/**
 * v451 Test Suite — Compact /jobs/ Hierarchy, Deduplicated Unified Profile Strip,
 * 4-Tab Interactive Candidate Workspace & Compact 2-Column QR Flyer Studio
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('=== v451 Compact /jobs/ Hierarchy & 4-Tab Candidate Workspace Audit ===');

const jobsHtml = read('jobs/index.html');
const tabsJs = read('assets/js/jobs-workspace-tabs.js');
const mpeJs = read('assets/js/multi-post-eligibility-matrix.js');
const hubJs = read('assets/js/jobs-hub.js');
const qfgJs = read('assets/js/qr-flyer-generator.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// 1. Strict CSP static checks across HTML & all touched JS modules
assert.ok(!/\sstyle\s*=\s*["']/i.test(jobsHtml), 'jobs/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(jobsHtml), 'jobs/index.html must have zero inline on* attributes');
for (const [name, src] of [
  ['assets/js/jobs-workspace-tabs.js', tabsJs],
  ['assets/js/multi-post-eligibility-matrix.js', mpeJs],
  ['assets/js/jobs-hub.js', hubJs],
  ['assets/js/qr-flyer-generator.js', qfgJs]
]) {
  assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), `${name}: zero unsafe HTML sinks`);
  assert.ok(!/\.style\.[a-zA-Z]/.test(src), `${name}: zero .style.* mutations`);
  assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), `${name}: zero inline on* handlers`);
}

// 2. Verify Zone 1 (Compact Hero + 3-Stat Pulse Strip + Unified Profile) & Zone 2 (Jobs First above Zone 3 Workspace)
assert.ok(jobsHtml.includes('cso-jh-hero--compact'), 'jobs/index.html must use compact hero');
assert.ok(jobsHtml.includes('Active Drives') && jobsHtml.includes('₹0 Odisha State Fee') && jobsHtml.includes('30 Districts Covered'), 'Zone 1 must render 3-stat recruitment pulse strip');
assert.ok(jobsHtml.includes('cso-cps-root--compact'), 'Zone 1 must mount compact #cso-candidate-profile-sync-root');

const idxProfile = jobsHtml.indexOf('id="cso-candidate-profile-sync-root"');
const idxLiveFeed = jobsHtml.indexOf('id="cso-jh-grid"');
const idxWorkspace = jobsHtml.indexOf('id="cso-jobs-workspace-tabs"');
assert.ok(idxProfile > 0 && idxLiveFeed > idxProfile && idxWorkspace > idxLiveFeed, 'Visual hierarchy must be Zone 1 Profile -> Zone 2 Live Job Feed -> Zone 3 4-Tab Workspace');

// 3. Verify all 4 root mounts live intact inside #cso-jobs-workspace-tabs with valid ARIA tablist / tab / tabpanel roles
const wsEnd = jobsHtml.indexOf('</section>', jobsHtml.indexOf('id="cso-qr-flyer-generator-root"')) + 10;
const wsSlice = jobsHtml.slice(idxWorkspace, jobsHtml.indexOf('id="cso-jobs-portal-root"'));
assert.ok(wsSlice.includes('role="tablist"'), '#cso-jobs-workspace-tabs must declare role="tablist"');
assert.ok(wsSlice.includes('data-jobs-expand-all="1"'), '#cso-jobs-workspace-tabs must include Show All Expanded toggle');

const expectedTabs = [
  ['eligibility', 'cso-jobs-tab-eligibility', 'cso-jobs-panel-eligibility', 'cso-multi-post-eligibility-root'],
  ['roster', 'cso-jobs-tab-roster', 'cso-jobs-panel-roster', 'cso-district-reservation-root'],
  ['applications', 'cso-jobs-tab-applications', 'cso-jobs-panel-applications', 'cso-application-grievance-root'],
  ['qr', 'cso-jobs-tab-qr', 'cso-jobs-panel-qr', 'cso-qr-flyer-generator-root']
];
for (const [key, tabId, panelId, mountId] of expectedTabs) {
  assert.ok(wsSlice.includes(`id="${tabId}"`), `Missing tab ${tabId}`);
  assert.ok(wsSlice.includes(`aria-controls="${panelId}"`), `Tab ${tabId} must control ${panelId}`);
  assert.ok(wsSlice.includes(`id="${panelId}"`) && wsSlice.includes(`role="tabpanel"`) && wsSlice.includes(`aria-labelledby="${tabId}"`), `Missing accessible tabpanel ${panelId}`);
  assert.ok(wsSlice.includes(`id="${mountId}"`), `Mount #${mountId} must live inside #cso-jobs-workspace-tabs`);
  assert.equal((jobsHtml.match(new RegExp(`id=["']${mountId}["']`, 'g')) || []).length, 1, `Exactly one #${mountId} in jobs/index.html`);
}
assert.ok(wsSlice.includes('id="cso-multi-post-eligibility-root"') && wsSlice.includes('data-cso-compact-profile="1"'), '#cso-multi-post-eligibility-root on /jobs/ must enable compact deduplicated profile mode');
assert.ok(jobsHtml.includes('/assets/js/jobs-workspace-tabs.js?v=20261128v451'), 'jobs/index.html must load jobs-workspace-tabs.js?v=20261128v451');

// 4. Interactive sandbox test for window.CSOJobsWorkspaceTabs (click, keyboard arrows, localStorage, expand-all, cso:jobs-open-tab)
function makeNode(tag, attrs = {}) {
  const cls = new Set();
  const node = {
    tagName: tag.toUpperCase(),
    attrs: { ...attrs },
    hidden: Boolean(attrs.hidden),
    textContent: '',
    children: [],
    listeners: {},
    focused: false,
    classList: {
      add: (c) => cls.add(c),
      remove: (c) => cls.delete(c),
      contains: (c) => cls.has(c),
      toggle: (c, f) => { const n = typeof f === 'boolean' ? f : !cls.has(c); if (n) cls.add(c); else cls.delete(c); return n; }
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    dispatch(t, ev = {}) { (this.listeners[t] || []).forEach((fn) => fn(ev)); },
    focus() { this.focused = true; },
    scrollIntoView() {},
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        for (const c of n.children) {
          if (sel === '[role="tab"][data-jobs-tab]' && c.attrs.role === 'tab' && c.attrs['data-jobs-tab']) out.push(c);
          else if (sel === '[role="tabpanel"][data-jobs-panel]' && c.attrs.role === 'tabpanel' && c.attrs['data-jobs-panel']) out.push(c);
          else if (sel === '[data-en]' && c.attrs['data-en']) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    },
    querySelector(sel) {
      if (sel === '[data-jobs-expand-all]') return this.children.find((c) => c.attrs['data-jobs-expand-all']) || null;
      return this.querySelectorAll(sel)[0] || null;
    }
  };
  return node;
}

const store = {};
const winListeners = {};
const winMock = {
  location: { hash: '' },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  },
  addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); }
};
const docMock = { readyState: 'complete', documentElement: { getAttribute: () => 'en' }, addEventListener() {}, getElementById: () => null };
const sb = { window: winMock, globalThis: winMock, document: docMock, console };
vm.runInNewContext(tabsJs, sb, { filename: 'assets/js/jobs-workspace-tabs.js' });
const tabsApi = winMock.CSOJobsWorkspaceTabs;
assert.ok(tabsApi && tabsApi.VERSION === 'v451', 'window.CSOJobsWorkspaceTabs v451 exposed');
assert.equal(tabsApi.STORE_KEY, 'cso_jobs_active_tab_v1');
assert.equal(tabsApi.resolveTabKey('#cso-qr-flyer-generator-root'), 'qr');
assert.equal(tabsApi.resolveTabKey('cso-application-grievance-root'), 'applications');

const wsRoot = makeNode('section', { id: 'cso-jobs-workspace-tabs' });
const expandBtn = makeNode('button', { 'data-jobs-expand-all': '1', 'aria-pressed': 'false' });
wsRoot.children.push(expandBtn);
const tabNodes = expectedTabs.map(([k, tid, pid]) => makeNode('button', { role: 'tab', id: tid, 'data-jobs-tab': k, 'aria-controls': pid, 'aria-selected': k === 'eligibility' ? 'true' : 'false' }));
const panelNodes = expectedTabs.map(([k, tid, pid]) => makeNode('div', { role: 'tabpanel', id: pid, 'data-jobs-panel': k, 'aria-labelledby': tid, hidden: k !== 'eligibility' }));
wsRoot.children.push(...tabNodes, ...panelNodes);

const ctrl = tabsApi.mount(wsRoot);
assert.equal(ctrl.getState().activeKey, 'eligibility');
assert.equal(panelNodes[0].hidden, false);
assert.equal(panelNodes[1].hidden, true);

// Keyboard ArrowRight advances to roster & persists
let prevented = false;
tabNodes[0].dispatch('keydown', { key: 'ArrowRight', preventDefault: () => { prevented = true; } });
assert.equal(prevented, true);
assert.equal(ctrl.getState().activeKey, 'roster');
assert.equal(store.cso_jobs_active_tab_v1, 'roster');
assert.equal(tabNodes[1].attrs['aria-selected'], 'true');
assert.equal(panelNodes[1].hidden, false);
assert.equal(panelNodes[0].hidden, true);

// Show All Expanded reveals all 4 panels simultaneously
expandBtn.dispatch('click');
assert.equal(ctrl.getState().expandAll, true);
assert.equal(expandBtn.attrs['aria-pressed'], 'true');
assert.ok(panelNodes.every((p) => p.hidden === false), 'Show All Expanded must unhide all 4 tabpanels');

// Programmatic cso:jobs-open-tab switches cleanly to QR tab
(winListeners['cso:jobs-open-tab'] || []).forEach((fn) => fn({ detail: { tab: 'qr', scroll: true } }));
assert.equal(ctrl.getState().activeKey, 'qr');
assert.equal(ctrl.getState().expandAll, false);
assert.equal(panelNodes[3].hidden, false);
assert.equal(panelNodes[0].hidden, true);

// 5. Verify Multi-Post Eligibility Matrix compact profile deduplication & live cso:profile-synced wiring
assert.ok(mpeJs.includes("cso_unified_candidate_profile_v1") && mpeJs.includes("cso:profile-synced"), 'multi-post-eligibility-matrix.js must sync with cso_unified_candidate_profile_v1 & cso:profile-synced');
assert.ok(mpeJs.includes("Edit Profile ↑") && mpeJs.includes("data-cso-compact-profile"), 'multi-post-eligibility-matrix.js must render compact active-profile pill summary + Edit Profile ↑ link');

// 6. Verify enriched Job Card quick actions & 2-column QR Flyer Studio
assert.ok(hubJs.includes('View Details') && hubJs.includes('cso-jh-btn--save') && hubJs.includes('cso-jh-btn--qr') && hubJs.includes('cso:qr-flyer-load'), 'jobs-hub.js must render View Details, Save & QR Flyer quick action buttons');
assert.ok(qfgJs.includes('cso-qfg-workspace') && qfgJs.includes('cso-qfg-controls') && qfgJs.includes('cso-qfg-preview-col') && qfgJs.includes('cso:qr-flyer-load'), 'qr-flyer-generator.js must render 2-column workspace & listen for cso:qr-flyer-load');

// 7. CSS semantic tokens only (zero hardcoded hex), 1.15fr / 0.85fr QR layout, >=44px tap targets, reduced-motion, @media print
const v451Idx = styleCss.indexOf('v451: Compact /jobs/ Hierarchy');
assert.ok(v451Idx > 0, 'assets/style.css must contain v451 CSS block');
const v451Css = styleCss.slice(v451Idx);
assert.ok(v451Css.includes('minmax(0, 1.15fr) minmax(0, 0.85fr)'), 'v451 CSS must configure 1.15fr / 0.85fr 2-column QR Flyer workspace');
assert.ok(v451Css.includes('.cso-jwt-tablist') && v451Css.includes('.cso-jwt-tab') && v451Css.includes('.cso-mpe-profile-strip'), 'v451 CSS must define workspace tabs & compact profile strip styles');
assert.ok(v451Css.includes('min-height: 44px'), 'v451 CSS must enforce >=44px tap targets');
assert.ok(v451Css.includes('prefers-reduced-motion: reduce'), 'v451 CSS must include prefers-reduced-motion');
assert.ok(v451Css.includes('@media print'), 'v451 CSS must include @media print rules');
assert.ok(v451Css.includes('var(--cso-'), 'v451 CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v451Css), 'v451 CSS must have zero hardcoded hex colors');

// 8. SW & Ops-Sentinel v451 cache sync
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v451'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v451');
assert.ok(swJs.includes("'/assets/js/jobs-workspace-tabs.js?v=20261128v451'"), 'sw.js must precache jobs-workspace-tabs.js?v=20261128v451');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v451'"), 'ops-sentinel.js must match cso-candidate-cache-v451');

console.log('PASS: v451 Compact /jobs/ Hierarchy, Deduplicated Profile, 4-Tab Workspace & 2-Col QR Studio verified.');
