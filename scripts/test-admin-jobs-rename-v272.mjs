#!/usr/bin/env node
/**
 * Admin Studio Jobs Sidebar & Breadcrumb Alignment Verification Suite (v272)
 *
 * Verifies:
 *  1. admin/index.html uses Jobs (not Jobs & Careers) in breadcrumb & title, 6-pillar filter labels,
 *     and cache-busted ?v=20261124v272 query strings for command-suite.js & admin.js.
 *  2. admin/admin.js maps folder-jobs-careers display label to 'Jobs', updates breadcrumbs to 'Jobs',
 *     and renders standalone Careers independently of Jobs search match so filtering matches both cleanly.
 *  3. admin/command-suite.js & functions/_lib/command-suite.js use 'Jobs' and 'Careers' cleanly
 *     in pillar labels, audit filters, and Ctrl+K Command Palette entries.
 *  4. Cache versions in sw.js & functions/_lib/ops-sentinel.js are bumped to cso-candidate-cache-v272.
 *  5. 100% strict CSP compliance across all touched files.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

console.log('\n=== v272 Admin Studio Jobs Rename & Search Alignment Verification ===');

check('1. admin/index.html breadcrumbs, heading, 6-pillar filter & v272 script versions', () => {
  const html = read('admin/index.html');
  assert.ok(!html.includes('Jobs &amp; Careers') && !html.includes('Jobs & Careers'), 'admin/index.html must not contain Jobs & Careers');
  assert.ok(html.includes('<button id="breadcrumbFolder" type="button" class="cso-breadcrumb-btn">Jobs</button>'), 'breadcrumbFolder must default to Jobs');
  assert.ok(html.includes('<span id="activeModuleTitleText">Jobs</span>'), 'activeModuleTitleText must default to Jobs');
  assert.ok(html.includes('placeholder="Filter 6 pillars &amp; items..."'), 'sidebar filter placeholder must reference 6 pillars');
  assert.ok(html.includes('for="moduleSearchInput" class="cso-sr-only">Filter 6 pillars</label>'), 'sidebar filter sr-only label must reference 6 pillars');
  assert.ok(/\/admin\/command-suite\.js\?v=20261124v2(?:7[2-9]|[8-9]\d)/.test(html), 'command-suite.js must be bumped to v272+');
  assert.ok(/\/admin\/admin\.js\?v=20261124v2(?:7[2-9]|[8-9]\d)/.test(html), 'admin.js must be bumped to v272+');
});

check('2. admin/admin.js renders Jobs sidebar item, Jobs breadcrumbs & independent Careers search matching', () => {
  const js = read('admin/admin.js');
  assert.ok(!js.includes("'Jobs & Careers'") && !js.includes('"Jobs & Careers"'), 'admin.js must not hardcode Jobs & Careers');
  assert.ok(js.includes("if (folder.id === 'folder-jobs-careers') return 'Jobs';"), 'admin.js must map folder-jobs-careers display title to Jobs');
  assert.ok(js.includes("if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Jobs';"), 'Jobs Publishing House breadcrumb must be Jobs');
  assert.ok(js.includes("if (!query || folderMatches || filteredModules.length > 0)"), 'Jobs folder filter must not short-circuit Careers rendering');
  assert.ok(js.includes("var crLabel = 'careers publishing house roadmaps tracks pathways କ୍ୟାରିୟର୍';"), 'Careers filter block must evaluate independently after Jobs');
});

check('3. admin/command-suite.js & functions/_lib/command-suite.js use Jobs & Careers cleanly', () => {
  const csJs = read('admin/command-suite.js');
  assert.ok(!csJs.includes('Jobs & Careers'), 'admin/command-suite.js must not contain Jobs & Careers');
  assert.ok(csJs.includes("jobs: 'Jobs', careers: 'Careers'"), 'PILLAR_LABELS must list Jobs and Careers separately');
  assert.ok(csJs.includes("label: 'Careers', hint: 'Alt+8'"), 'Ctrl+K palette must include Careers jump entry');
  assert.ok(csJs.includes("f.id === 'folder-jobs-careers' ? 'Jobs' : f.title"), 'Ctrl+K palette must map folder-jobs-careers to Jobs');
  assert.ok(csJs.includes('Careers Publishing House › + Publish New Career'), 'Ctrl+K palette must include Careers Publishing House action');

  const csLib = read('functions/_lib/command-suite.js');
  assert.ok(!csLib.includes('Jobs & Careers'), 'functions/_lib/command-suite.js must not contain Jobs & Careers');
  assert.ok(csLib.includes("jobs: { label: 'Jobs'"), 'PILLAR_TABLES.jobs.label must be Jobs');
});

check('4. Service Worker & Ops Sentinel bumped to cso-candidate-cache-v272+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:7[2-9]|[8-9]\d)';/.test(read('sw.js')), 'sw.js must be cso-candidate-cache-v272+');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:7[2-9]|[8-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js must be cso-candidate-cache-v272+');
});

check('5. Strict CSP compliance across all touched v272 files', () => {
  const html = read('admin/index.html');
  assert.ok(!/\sstyle\s*=/i.test(html), 'admin/index.html must have zero inline style=');
  assert.ok(!/\son[a-z]+\s*=/i.test(html), 'admin/index.html must have zero inline on*= handlers');
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'admin/index.html must have zero inline scripts');

  for (const rel of ['admin/admin.js', 'admin/command-suite.js', 'functions/_lib/command-suite.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v272 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
