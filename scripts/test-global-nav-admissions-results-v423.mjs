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
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const homeHydrationJs = fs.readFileSync(path.join(ROOT, 'assets/js/home-hydration.js'), 'utf8');
const ssrShellJs = fs.readFileSync(path.join(ROOT, 'functions/_lib/ssr-shell.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const opsSrc = fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8');

// 1. shared-header.js exposes /results/ and /admissions/ in nav dropdown/mobile drawer & footer + active route
assert.ok(headerJs.includes("href: '/results/'") && headerJs.includes("title_en: 'Results & Cut-Offs'"), 'shared-header.js must expose /results/ in desktop & mobile Jobs dropdown');
assert.ok(headerJs.includes("href: '/admissions/'") && headerJs.includes("title_en: 'Admissions & Counselling'"), 'shared-header.js must expose /admissions/ in desktop & mobile Jobs dropdown');
assert.ok(headerJs.includes("p.startsWith('/results')") && headerJs.includes("p.startsWith('/admissions')"), 'shared-header.js resolveActivePillar must recognize /results/ and /admissions/');
assert.ok(headerJs.includes("['Results & Cut-Offs', '/results/']") && headerJs.includes("['Admissions & Counselling', '/admissions/']"), 'shared-header.js FOOTER_COLS must expose /results/ and /admissions/');
assert.ok(headerJs.includes("aria-current"), 'shared-header.js must set aria-current on active links');

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
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v449'"), 'sw.js must bump CACHE_NAME to v423');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v449'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v423');

console.log('✅ v423 Global Header Nav, Mobile Drawer & Homepage Quick-Launch Audit PASSED');
