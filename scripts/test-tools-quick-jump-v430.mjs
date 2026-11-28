#!/usr/bin/env node
/**
 * v430 Test Suite — Interactive Candidate Toolkit Quick-Jump Directory
 * & Live Search Index (/tools/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/tools-quick-jump-directory.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOToolsQuickJumpDirectory;

assert.ok(api, 'window.CSOToolsQuickJumpDirectory must be exposed');
assert.equal(api.VERSION, 'v430');
assert.equal(api.ROOT_ID, 'cso-tools-quick-jump-root');
assert.equal(api.PREFS_KEY, 'cso_tools_directory_prefs_v1');
assert.equal(api.CATEGORIES.length, 5, 'Must have All + 4 functional categories');
assert.ok(api.TOOL_CATALOG.length >= 14, 'Catalog must include all on-page & companion tools');

// 2. Verify every on-page tool maps 1-to-1 to a real, non-duplicate anchor ID in tools/index.html
const toolsHtml = read('tools/index.html');
const onPageItems = Array.from(api.TOOL_CATALOG).filter((item) => Boolean(item.targetId));
assert.ok(onPageItems.length >= 9, 'Must cover all 9 on-page /tools/ widgets');

const seenTargets = new Set();
for (const item of onPageItems) {
  assert.ok(!seenTargets.has(item.targetId), `Duplicate targetId in catalog: ${item.targetId}`);
  seenTargets.add(item.targetId);
  const idMatches = toolsHtml.match(new RegExp(`id=["']${item.targetId}["']`, 'g')) || [];
  assert.equal(idMatches.length, 1, `tools/index.html must have exactly one element with id="${item.targetId}"`);
}

// 3. Verify filtering across all 4 categories and English + Odia keyword searches
for (const cat of ['calculators', 'exam-practice', 'certificates', 'offline-backup']) {
  const subset = Array.from(api.filterTools(cat, ''));
  assert.ok(subset.length >= 2, `Category "${cat}" must return at least 2 tools`);
  assert.ok(subset.every((t) => t.category === cat), `All filtered tools must belong to "${cat}"`);
}

const enTyping = Array.from(api.filterTools('all', 'typing'));
assert.ok(enTyping.some((t) => t.id === 'typing-skill-arena'), 'English search "typing" must find Typing Arena');

const orSalary = Array.from(api.filterTools('all', 'ବେତନ'));
assert.ok(orSalary.some((t) => t.id === 'orsp-salary'), 'Odia search "ବେତନ" must find ORSP Salary Estimator');

const orCert = Array.from(api.filterTools('certificates', 'ପ୍ରମାଣପତ୍ର'));
assert.ok(orCert.length >= 2, 'Odia search "ପ୍ରମାଣପତ୍ର" in certificates must match e-District & Validity Matrix');

const counts = api.getCategoryCounts('');
assert.equal(
  counts.all,
  counts.calculators + counts['exam-practice'] + counts.certificates + counts['offline-backup'],
  'Category counts must sum to total catalog count'
);

// 4. Verify mount ordering, strict CSP, 4-theme semantic CSS & SW/ops-sentinel sync
const quickJumpIdx = toolsHtml.indexOf('id="cso-tools-quick-jump-root"');
const firstToolIdx = toolsHtml.indexOf('id="cso-offline-toolkit-hub-root"');
assert.ok(quickJumpIdx > 0, 'tools/index.html must mount #cso-tools-quick-jump-root');
assert.ok(quickJumpIdx < firstToolIdx, '#cso-tools-quick-jump-root must appear above the first tool section');
assert.ok(toolsHtml.includes('/assets/js/tools-quick-jump-directory.js?v=20261127v449'), 'tools/index.html must load tools-quick-jump-directory.js?v=20261127v449');
assert.ok(!/\son[a-z]+\s*=/i.test(toolsHtml), 'tools/index.html must have zero inline on* attributes');
assert.ok(!/\sstyle\s*=/i.test(toolsHtml), 'tools/index.html must have zero inline style attributes');

assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

const css = read('assets/style.css');
const tqjIdx = css.indexOf('v430: Candidate Toolkit Quick-Jump Directory');
assert.ok(tqjIdx > 0, 'assets/style.css must contain v430 .cso-tqj-* CSS block');
const tqjBlock = css.slice(tqjIdx);
assert.ok(tqjBlock.includes('.cso-tqj-card'), 'CSS must style .cso-tqj-card');
assert.ok(tqjBlock.includes('.cso-tqj-highlight'), 'CSS must style .cso-tqj-highlight');
assert.ok(tqjBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(tqjBlock), 'v430 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v449'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v449');
assert.ok(sw.includes('/assets/js/tools-quick-jump-directory.js?v=20261127v449'), 'sw.js must pre-cache tools-quick-jump-directory.js?v=20261127v449');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v449'"), 'ops-sentinel.js must match cso-candidate-cache-v449');

console.log('✅ v430 Candidate Toolkit Quick-Jump Directory & Live Search Index tests passed!');
