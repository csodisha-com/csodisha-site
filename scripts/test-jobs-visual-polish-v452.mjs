#!/usr/bin/env node
/**
 * v452 Test Suite — /jobs/ Visual Beautification, Collapsible Profile Chip Bar,
 * Enriched Auto-Fit Cards, Segmented Workspace Tabs, Dot-Grid QR Stage &
 * Permanent Global 'Ask CSOdisha' Search Bar Preservation
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('=== v452 /jobs/ Visual Polish & Permanent Ask CSOdisha Bar Audit ===');

const indexHtml = read('index.html');
const jobsHtml = read('jobs/index.html');
const semanticJs = read('assets/js/semantic-search.js');
const cpsJs = read('assets/js/candidate-profile-sync-bar.js');
const mpeJs = read('assets/js/multi-post-eligibility-matrix.js');
const hubJs = read('assets/js/jobs-hub.js');
const tabsJs = read('assets/js/jobs-workspace-tabs.js');
const sharedJs = read('assets/shared-header.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// 1. Permanently preserve Global 'Ask CSOdisha' search & assistant bar on / and /jobs/
assert.ok(indexHtml.includes('id="cso-ask-input"') && indexHtml.includes('id="cso-hero-ask-btn"') && indexHtml.includes('Ask CSOdisha'), 'index.html must preserve global Ask CSOdisha search bar');
assert.ok(indexHtml.includes('/assets/js/semantic-search.js?v=20261128v453'), 'index.html must load semantic-search.js v452');
assert.ok(jobsHtml.includes('/assets/css/semantic-search.css?v=20261128v453') && jobsHtml.includes('/assets/js/semantic-search.js?v=20261128v453'), 'jobs/index.html must permanently load semantic-search Ask CSOdisha bar');
assert.ok(semanticJs.includes("bar.id = 'csoAskSearchBar'") && semanticJs.includes("'Ask CSOdisha'"), 'semantic-search.js must mount #csoAskSearchBar with Ask CSOdisha CTA');
assert.ok(!/\.cso-ask-bar\s*\{[^}]*display\s*:\s*none/i.test(styleCss), 'assets/style.css must never hide .cso-ask-bar');

// 2. Strict CSP checks across jobs/index.html & all touched JS files
assert.ok(!/\sstyle\s*=\s*["']/i.test(jobsHtml), 'jobs/index.html: zero inline style attributes');
assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(jobsHtml), 'jobs/index.html: zero inline on* attributes');
for (const [label, src] of [
  ['assets/js/candidate-profile-sync-bar.js', cpsJs],
  ['assets/js/multi-post-eligibility-matrix.js', mpeJs],
  ['assets/js/jobs-hub.js', hubJs],
  ['assets/js/jobs-workspace-tabs.js', tabsJs],
  ['assets/shared-header.js', sharedJs]
]) {
  assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), `${label}: zero unsafe HTML sinks`);
  assert.ok(!/\.style\.[a-zA-Z]/.test(src), `${label}: zero .style.* mutations`);
}

// 3. Tinted Gradient Hero, Inline Stat Pills & Removal of Duplicate EN/Odia Toggles inside /jobs/ hero & cards
assert.ok(jobsHtml.includes('cso-jh-hero--compact') && jobsHtml.includes('cso-jh-hero__right') && jobsHtml.includes('cso-jh-stat-pill'), 'jobs/index.html must render inline stat pills on right of compact hero');
assert.ok(!jobsHtml.includes('cso-jh-lang-toggle'), 'jobs/index.html must remove duplicate local EN/Odia toggle inside hero');
assert.ok(sharedJs.includes("new CustomEvent('cso:lang-change'"), 'shared-header.js must broadcast cso:lang-change globally');
assert.ok(mpeJs.includes('if (!compactProfileMode)') && mpeJs.includes("cso:lang-change"), 'multi-post-eligibility-matrix.js must omit duplicate lang toggle in compact mode & sync with global lang');

// 4. Collapsible Candidate Profile Chip Bar on /jobs/ (interactive sandbox test)
assert.ok(jobsHtml.includes('id="cso-candidate-profile-sync-root"') && jobsHtml.includes('data-cso-collapsible="1"'), 'jobs/index.html must enable collapsible 1-line profile chip bar');

function mkNode(tag) {
  const n = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    attrs: {},
    children: [],
    listeners: {},
    value: '',
    checked: false,
    appendChild(c) { this.children.push(c); return c; },
    replaceChildren(...c) { this.children = c; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    click() { (this.listeners.click || []).forEach((f) => f({})); },
    focus() {}
  };
  return n;
}
const flatten = (n, out = []) => { out.push(n); (n.children || []).forEach((c) => flatten(c, out)); return out; };
const store = {};
const winMock = {
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  addEventListener() {},
  dispatchEvent() {},
  CustomEvent: class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } },
  Event: class { constructor(t) { this.type = t; } }
};
const docMock = { readyState: 'complete', documentElement: { getAttribute: () => 'en' }, addEventListener() {}, getElementById: () => null, createElement: mkNode };
const sb = { window: winMock, globalThis: winMock, document: docMock, console };
vm.runInNewContext(cpsJs, sb, { filename: 'assets/js/candidate-profile-sync-bar.js' });
const cpsRoot = mkNode('section');
cpsRoot.setAttribute('data-cso-collapsible', '1');
winMock.CSOCandidateProfileSyncBar.mount(cpsRoot);
let nodes = flatten(cpsRoot);
assert.ok(nodes.some((n) => n.className.includes('cso-cps-chip-bar')), 'Collapsible profile defaults to 1-line chip bar');
assert.ok(nodes.some((n) => n.textContent.includes('1999-03-04')), 'Chip bar shows DOB');
assert.ok(!nodes.some((n) => n.className === 'cso-cps-grid'), '6-field grid is collapsed by default on /jobs/');
const editBtn = nodes.find((n) => n.className.includes('cso-cps-edit-toggle'));
assert.ok(editBtn && editBtn.attrs['aria-expanded'] === 'false', 'Edit Profile toggle starts aria-expanded="false"');
editBtn.click();
nodes = flatten(cpsRoot);
assert.ok(nodes.some((n) => n.className === 'cso-cps-grid'), 'Clicking Edit Profile expands full 6-field grid');
assert.ok(!nodes.some((n) => n.className.includes('cso-cps-lang-toggle')), 'Collapsible mode omits duplicate lang toggle');

// 5. Unified Local Filter Bar, Combined Watchlist/Count Strip, Board Monograms & Workspace Count Badges
assert.ok(jobsHtml.includes('id="cso-jobs-district-bar" class="cso-df-mount cso-df-mount--merged" hidden'), 'Duplicate standalone district bar is cleanly merged/hidden');
assert.ok(jobsHtml.includes('class="cso-jh-status-strip"') && jobsHtml.includes('id="cso-jobs-watchlist-bar"') && jobsHtml.includes('id="cso-jh-results-count"'), 'Watchlist + results count combined in one status strip');
assert.ok(hubJs.includes('cso-jh-monogram') && hubJs.includes('getBoardMonogram'), 'jobs-hub.js renders board monogram badges');
assert.ok(jobsHtml.includes('cso-jwt-sticky-bar') && jobsHtml.includes('cso-jwt-badge') && tabsJs.includes('syncBadges'), 'Workspace tabs include segmented badges & sticky jump strip');
assert.ok(mpeJs.includes("cso-mpe-badge--"), 'Eligibility Matrix uses distinct high-contrast status badge classes');
assert.ok(mpeJs.includes("'danger'"), 'OVER-AGE uses dedicated high-contrast danger badge class');

// 6. Clean Public Header (no cache-version pill in header) & Footer Build Pill
const headerSlice = jobsHtml.slice(jobsHtml.indexOf('<header'), jobsHtml.indexOf('</header>'));
assert.ok(!/cso-candidate-cache-v\d+/.test(headerSlice), 'Header must not display technical cache-version pill');
const footerSlice = jobsHtml.slice(jobsHtml.indexOf('<footer'));
assert.ok(footerSlice.includes('class="cso-footer-build-pill"') && footerSlice.includes('cso-candidate-cache-v453'), 'Footer displays clean build cache pill');

// 7. v452 CSS tokens, zero hardcoded hex, auto-fit 310px grid, primary brand CTA, zebra table, dot-grid stage, reduced-motion
const v452Idx = styleCss.indexOf('v452: Visual Beautification & UI Organization Pass');
assert.ok(v452Idx > 0, 'assets/style.css must contain v452 CSS block');
const v452Css = styleCss.slice(v452Idx);
assert.ok(v452Css.includes('.cso-ask-bar') && v452Css.includes('border-radius: 999px'), 'v452 CSS polishes Ask CSOdisha search capsule');
assert.ok(v452Css.includes('repeat(auto-fit, minmax(min(100%, 310px), 1fr))'), 'v452 CSS switches #cso-jh-grid to auto-fit 310px');
assert.ok(v452Css.includes('border-top: 3px solid var(--card-accent)') && v452Css.includes('.cso-jh-monogram'), 'v452 CSS adds board top accent border & monogram');
assert.ok(v452Css.includes('.cso-jh-card .cso-jh-btn--primary') && v452Css.includes('var(--cso-cta-bg, var(--cso-accent))'), 'v452 CSS standardizes View Details CTA to primary brand accent');
assert.ok(v452Css.includes('tbody tr:nth-child(even)') && v452Css.includes('.cso-mpe-badge--danger'), 'v452 CSS adds zebra striping & danger badge contrast');
assert.ok(v452Css.includes('radial-gradient(') && v452Css.includes('background-size: 14px 14px'), 'v452 CSS frames QR Flyer canvas on dot-grid stage');
assert.ok(v452Css.includes('prefers-reduced-motion: reduce'), 'v452 CSS guards animations with prefers-reduced-motion');
assert.ok(v452Css.includes('var(--cso-'), 'v452 CSS uses semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v452Css), 'v452 CSS has zero hardcoded hex colors');

// 8. SW & Ops-Sentinel v452 cache sync
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v453'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v453');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v453'"), 'ops-sentinel.js must match cso-candidate-cache-v453');

console.log('PASS: v452 /jobs/ Visual Polish & Permanent Ask CSOdisha Bar verified.');
