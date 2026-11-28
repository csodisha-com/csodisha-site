#!/usr/bin/env node
/**
 * v423 Automated Audit: Global Header Navigation, Mobile Drawer & Homepage Quick-Launch
 * Wiring for /admissions/ & /results/
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
console.log('=== v423 Global Header Nav, Mobile Drawer & Homepage Quick-Launch (/admissions/ & /results/) Audit ===');

const headerJs = fs.readFileSync(path.join(ROOT, 'assets/shared-header.js'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const homeHydrationJs = fs.readFileSync(path.join(ROOT, 'assets/js/home-hydration.js'), 'utf8');
const ssrShellJs = fs.readFileSync(path.join(ROOT, 'functions/_lib/ssr-shell.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const opsSrc = fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8');

// 1. Both shared-header.js and app.js expose identical canonical dropdowns including /results/ & /admissions/
for (const [label, src] of [['assets/shared-header.js', headerJs], ['assets/app.js', appJs]]) {
  assert.ok(src.includes("href:'/results/'") || src.includes("href: '/results/'"), `${label} must expose /results/ in desktop & mobile Jobs dropdown`);
  assert.ok(src.includes("title_en:'Results & Cut-Offs'") || src.includes("title_en: 'Results & Cut-Offs'"), `${label} must include Results & Cut-Offs label`);
  assert.ok(src.includes("href:'/admissions/'") || src.includes("href: '/admissions/'"), `${label} must expose /admissions/ in desktop & mobile Jobs dropdown`);
  assert.ok(src.includes("title_en:'Admissions & Counselling'") || src.includes("title_en: 'Admissions & Counselling'"), `${label} must include Admissions & Counselling label`);
  assert.ok(src.includes("p.startsWith('/results')") && src.includes("p.startsWith('/admissions')"), `${label} active pillar resolver must recognize /results/ and /admissions/`);
  assert.ok(src.includes('aria-current'), `${label} must set aria-current on active links`);
  assert.ok(src.includes('CSO_CANONICAL_NAV_DROPDOWNS'), `${label} must define CSO_CANONICAL_NAV_DROPDOWNS`);
}
assert.ok(headerJs.includes("['Results & Cut-Offs', '/results/']") && headerJs.includes("['Admissions & Counselling', '/admissions/']"), 'shared-header.js FOOTER_COLS must expose /results/ and /admissions/');

// 1b. v450: Verify exact parity of CSO_CANONICAL_NAV_DROPDOWNS between app.js & shared-header.js + static/SSR nav shells
const parseCanonical = (src) => {
  const m = src.match(/const\s+CSO_CANONICAL_NAV_DROPDOWNS\s*=\s*(\{[\s\S]*?\n\s*\});/);
  assert.ok(m, 'CSO_CANONICAL_NAV_DROPDOWNS definition must exist');
  return new Function(`return (${m[1]});`)();
};
assert.deepEqual(parseCanonical(appJs), parseCanonical(headerJs), 'app.js and shared-header.js must define identical dropdown links');
const normNav = (html) => {
  const m = html.match(/<nav\b[^>]*id="cso-main-navbar"[^>]*>[\s\S]*?<\/nav>/i);
  assert.ok(m, 'Expected #cso-main-navbar');
  return m[0].replace(/\s+aria-current="page"/gi, '').replace(/class="cso-nav-home\s+on"/gi, 'class="cso-nav-home"').replace(/\s+/g, ' ').trim();
};
const idxNav = normNav(indexHtml);
for (const rel of ['jobs/index.html', 'exams/index.html', 'tools/index.html', 'career-paths/index.html', 'updates/index.html', 'functions/_lib/ssr-shell.js']) {
  const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.equal(normNav(txt), idxNav, `${rel} navbar dropdown markup must match index.html`);
}

// 2. SSR shell footer exposes /results/ and /admissions/
assert.ok(ssrShellJs.includes('href="/results/"') && ssrShellJs.includes('href="/admissions/"'), 'ssr-shell.js footer must link to /results/ and /admissions/');

// 3. index.html quick-launch spotlight cards & strict CSP
assert.ok(indexHtml.includes('id="cso-quick-launch-hubs"'), 'index.html must include #cso-quick-launch-hubs section');
assert.ok(indexHtml.includes('data-qlaunch-hub="results"') && indexHtml.includes('href="/results/"'), 'index.html must render /results/ quick-launch spotlight card');
assert.ok(indexHtml.includes('data-qlaunch-hub="admissions"') && indexHtml.includes('href="/admissions/"'), 'index.html must render /admissions/ quick-launch spotlight card');
assert.ok(!/\son[a-z]+\s*=/i.test(indexHtml), 'index.html must have zero inline on* handlers');
assert.ok(!/\sstyle\s*=/i.test(indexHtml), 'index.html must have zero inline style attributes');
assert.ok(homeHydrationJs.includes('hydrateQuickLaunchHubCounts'), 'home-hydration.js must hydrate quick-launch hub live counts');

// 4. CSS semantic 4-theme tokens & zero hardcoded hex
const qlIdx = cssSrc.indexOf('/* ===== v423:');
assert.ok(qlIdx !== -1, 'assets/style.css must contain v423 .cso-qlaunch-* CSS block');
const qlBlock = cssSrc.slice(qlIdx);
assert.ok(qlBlock.includes('.cso-qlaunch-grid') && qlBlock.includes('min(100%, 260px)'), 'v423 CSS must use mobile-safe min(100%, 260px) grid');
assert.ok(qlBlock.includes('var(--cso-'), 'v423 CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(qlBlock), 'v423 CSS block must have zero hardcoded hex colors');
assert.ok(qlBlock.includes('prefers-reduced-motion'), 'v423 CSS must include prefers-reduced-motion guard');

// 5. SW & Ops-Sentinel cache sync
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v456'"), 'sw.js must bump CACHE_NAME to v423');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v456'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v423');

console.log('✅ v423 Global Header Nav, Mobile Drawer & Homepage Quick-Launch Audit PASSED');
