#!/usr/bin/env node
/**
 * Regression & Contract Audit Suite — v457 (/odisha-special/ Unified 30-District &
 * 314-Block Atlas, Cards vs Compact Table Toggle, Active Jobs Only Filter, ARIA
 * 314-Block Drawer, 3-Tab Odisha Special Workspace, Brand Emerald/Teal Buttons,
 * Permanent Ask CSOdisha Bar, Strict CSP & 100% var(--cso-*) 4-Theme Tokens)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const html = read('odisha-special/index.html');
const hubJs = read('assets/js/odisha-special-hub.js');
const adminDirJs = read('assets/js/odisha-admin-directory.js');
const wsTabsJs = read('assets/js/odisha-special-workspace-tabs.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// 1. Verify unified 30-district rendering (no duplicate 60-card stack)
assert.match(html, /id="cso-od-districts-grid"/, 'Must mount unified #cso-od-districts-grid');
assert.match(html, /id="cso-odisha-admin-directory-root"[^>]*data-cso-unified-atlas="1"/, 'Admin directory mount must carry data-cso-unified-atlas="1" to prevent duplicate 30-card grid');
assert.match(adminDirJs, /data-cso-unified-atlas/, 'odisha-admin-directory.js must skip duplicate grid when unified atlas flag is set');

// 2. Revenue Division filter pills, Active Jobs Only toggle & Cards vs Compact Table toggle
for (const divKey of ['all', 'central', 'northern', 'southern']) {
  assert.match(html, new RegExp(`data-division="${divKey}"`), `Must render Revenue Division pill for ${divKey}`);
}
assert.match(html, /id="cso-od-active-jobs-toggle"/, 'Must render Active Jobs Only filter toggle');
assert.match(html, /data-od-view-mode="cards"/, 'Must render Cards Grid toggle button');
assert.match(html, /data-od-view-mode="table"/, 'Must render Compact Table toggle button');

// 3. Sandbox-test Unified 30-District & 314-Block Data Merging
const sandbox = {
  window: { localStorage: new Map(), addEventListener: () => {} },
  globalThis: {},
  document: {
    readyState: 'complete',
    documentElement: { getAttribute: () => 'en' },
    getElementById: () => null,
    addEventListener: () => {}
  },
  URL
};
sandbox.window.localStorage.getItem = (k) => (sandbox.window.localStorage.has(k) ? sandbox.window.localStorage.get(k) : null);
sandbox.window.localStorage.setItem = (k, v) => sandbox.window.localStorage.set(k, String(v));
sandbox.globalThis = sandbox.window;
sandbox.window.document = sandbox.document;

vm.runInNewContext(read('assets/js/odisha-district-filter.js'), sandbox);
vm.runInNewContext(adminDirJs, sandbox);
vm.runInNewContext(hubJs, sandbox);
vm.runInNewContext(wsTabsJs, sandbox);

const unified = sandbox.window.CSOOdishaSpecialHub.getUnifiedDistrictRecords();
assert.equal(unified.length, 30, 'Unified atlas must return exactly 30 districts');
const totalBlocks = unified.reduce((acc, d) => acc + d.blocks.length, 0);
assert.equal(totalBlocks, 314, 'Unified atlas must preserve all 314 Panchayat Samiti blocks');
for (const d of unified) {
  assert.ok(d.rto && /^OD-\d{2}$/.test(d.rto), `${d.slug} must have valid OD-XX RTO code`);
  assert.ok(d.pin && /^7[567]\d{4}$/.test(d.pin), `${d.slug} must have valid Odisha 6-digit PIN`);
  assert.ok(d.blocks.length >= 3, `${d.slug} must carry its block list for the 314-Block drawer`);
}

// 4. Verify 3-Tab Odisha Special Workspace ARIA structure & API
const wsApi = sandbox.window.CSOOdishaSpecialWorkspaceTabs;
assert.ok(wsApi && wsApi.VERSION === 'v457', 'window.CSOOdishaSpecialWorkspaceTabs v457 must be exposed');
assert.equal(wsApi.STORE_KEY, 'cso_odisha_special_tab_v1', 'Must persist active tab in cso_odisha_special_tab_v1');
assert.equal(wsApi.TABS.length, 3, 'Workspace must organize bottom utilities into exactly 3 tabs');
assert.equal(wsApi.resolveTabKey('cso-exam-travel-planner-root'), 'travel');
assert.equal(wsApi.resolveTabKey('cso-district-reservation-root'), 'roster');
assert.equal(wsApi.resolveTabKey('heritage'), 'heritage-gk');

assert.match(html, /id="cso-odisha-special-workspace-tabs"/, 'Must mount #cso-odisha-special-workspace-tabs');
assert.match(html, /role="tablist"[\s\S]*data-od-ws-tab="travel"[\s\S]*data-od-ws-tab="roster"[\s\S]*data-od-ws-tab="heritage-gk"/, 'Must render all 3 ARIA tabs in tablist');
assert.match(html, /data-od-ws-expand-all="1"/, 'Must include Show All Expanded toggle');
assert.match(html, /role="tabpanel"[\s\S]*data-od-ws-panel="travel"[\s\S]*id="cso-district-exam-center-root"/, 'Tab 1 panel must wrap Exam Center & Travel Logistics');
assert.match(html, /role="tabpanel"[\s\S]*data-od-ws-panel="roster"[\s\S]*id="cso-district-reservation-root"/, 'Tab 2 panel must wrap District Reservation Roster');
assert.match(html, /role="tabpanel"[\s\S]*data-od-ws-panel="heritage-gk"[\s\S]*id="cso-od-items-grid"[\s\S]*id="cso-od-drill"/, 'Tab 3 panel must wrap Heritage/GI Tags & Odisha GK Drill');

// 5. Verify hero inline pills, removed hero lang toggle, clean stealth admin icon & permanent Ask CSOdisha bar
assert.doesNotMatch(html, /cso-od-lang-toggle/, 'Duplicate hero EN/Odia toggle must be removed from odisha-special/index.html');
assert.match(html, /cso-od-hero-pills/, 'Hero must render compact inline stat pills');
assert.match(html, /cso-adm-icon-only cso-adm-stealth/, 'Admin link must carry cso-adm-stealth on /odisha-special/');
assert.match(html, /semantic-search\.js\?v=20261128v457/, 'Must permanently preserve global Ask CSOdisha bar');
assert.match(html, /odisha-special-workspace-tabs\.js\?v=20261128v457/, 'Must load odisha-special-workspace-tabs.js?v=20261128v457');
assert.match(html, /cso-candidate-cache-v457/, 'Footer must display cso-candidate-cache-v457');

// 6. Strict CSP across HTML and JS
for (const [name, src] of [
  ['odisha-special-hub.js', hubJs],
  ['odisha-special-workspace-tabs.js', wsTabsJs]
]) {
  assert.doesNotMatch(src, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/i, `${name} must not use unsafe markup injection`);
  assert.doesNotMatch(src, /\.style\.[a-zA-Z]/, `${name} must not mutate inline styles`);
}
assert.doesNotMatch(html, /\sstyle\s*=\s*["']/i, 'odisha-special/index.html must have zero inline style=""');
assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i, 'odisha-special/index.html must have zero inline on*=""');

// 7. 4-Theme CSS Audit: Unified emerald/teal button tokens, 305px auto-fit grid, zero hardcoded hex
const v457Idx = styleCss.indexOf('v457 — /odisha-special/');
assert.ok(v457Idx > 0, 'assets/style.css must contain v457 /odisha-special/ CSS block');
const v457Css = styleCss.slice(v457Idx);
assert.doesNotMatch(v457Css, /#[0-9a-fA-F]{3,8}\b/, 'v457 CSS block must contain ZERO hardcoded hex colors');
assert.match(v457Css, /body\[data-cso-portal="odisha-special"\] \.cso-od-btn--primary[\s\S]*var\(--cso-cta-bg/, 'Primary buttons on /odisha-special/ must unify to var(--cso-cta-bg) emerald/teal');
assert.match(v457Css, /repeat\(auto-fit,\s*minmax\(min\(100%,\s*305px\),\s*1fr\)\)/, 'Unified district grid must use 305px auto-fit columns');
assert.match(v457Css, /min-height:\s*44px/, 'Must enforce >= 44px touch targets');
assert.match(v457Css, /prefers-reduced-motion:\s*reduce/, 'Must respect prefers-reduced-motion');
assert.match(v457Css, /@media print/, 'Must include clean @media print rules');

// 8. SW & ops-sentinel cache sync
assert.match(swJs, /CACHE_NAME\s*=\s*'cso-candidate-cache-v457'/, 'sw.js CACHE_NAME must be cso-candidate-cache-v457');
assert.match(swJs, /\/assets\/js\/odisha-special-workspace-tabs\.js\?v=20261128v457/, 'sw.js CANDIDATE_TOOLKIT_URLS must precache odisha-special-workspace-tabs.js?v=20261128v457');
assert.match(opsJs, /ACTIVE_SW_CACHE_VERSION\s*=\s*'cso-candidate-cache-v457'/, 'ops-sentinel.js must match cso-candidate-cache-v457');

console.log('PASS: v457 /odisha-special/ unified 30-district & 314-block atlas, 3-tab workspace, emerald palette, CSP & SW audit passed.');
