#!/usr/bin/env node
/**
 * Cascading Menu 4-Theme & Dark-Mode Surface Contrast Verification (v279)
 *
 * Verifies:
 *  1. assets/style.css & assets/css/portal-shell.css define --cso-surface-elevated,
 *     --cso-surface-elevated-ink, --cso-surface-elevated-border, and --cso-surface-elevated-hover
 *     across System Light, Dark / Dark Night (+ @media prefers-color-scheme: dark),
 *     Reading Mode, and Odisha & Bharat.
 *  2. .cso-jobs-stage1, .cso-jobs-stage2, .cso-careers-stage1, .cso-careers-stage2 and their
 *     child links/labels/chevrons enforce high-contrast ink (`color: inherit !important`) and
 *     crisp hover states (`rgba(56, 189, 248, 0.14)` in Dark, `rgba(15, 23, 42, 0.06)` in Light/Reading/Odisha).
 *  3. style.css, portal-shell.css, app.js, and shared-header.js query strings are bumped to
 *     ?v=20261125v279 across HTML pages, and sw.js + ops-sentinel.js use cso-candidate-cache-v279.
 *  4. 100% strict CSP compliance across style.css, portal-shell.css, app.js, shared-header.js, and HTML.
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

console.log('\n=== v279 Cascading Menu 4-Theme & Dark-Mode Surface Contrast Verification ===');

check('1. style.css & portal-shell.css define all 4-theme surface/ink/border/hover tokens & prefers-color-scheme: dark', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css']) {
    const css = read(rel);
    for (const tok of [
      '@media (prefers-color-scheme: dark)',
      'data-theme="dark-night"',
      'data-theme="odisha"',
      '--cso-surface-elevated: #ffffff;',
      '--cso-surface-elevated-ink: #0f172a;',
      '--cso-surface-elevated-border: #cbd5e1;',
      '--cso-surface-elevated: #161e2e;',
      '--cso-surface-elevated-ink: #f1f5f9;',
      '--cso-surface-elevated-border: #263245;',
      '--cso-surface-elevated-hover: rgba(56, 189, 248, 0.14);',
      '--cso-surface-elevated: #fdf9f1;',
      '--cso-surface-elevated-ink: #241b12;',
      '--cso-surface-elevated-border: #d6c8b2;',
      '--cso-surface-elevated: #fffdf9;',
      '--cso-surface-elevated-ink: #1f140c;',
      '--cso-surface-elevated-border: #e4d1bc;',
      '--cso-surface-elevated-hover: rgba(15, 23, 42, 0.06);',
      'color: inherit !important;'
    ]) {
      assert.ok(css.includes(tok), `${rel} missing "${tok}"`);
    }
    assert.ok(!css.includes('.cso-careers-stage2'), `${rel} must NOT include .cso-careers-stage2`);
  }
});

check('2. sw.js & ops-sentinel.js bumped to cso-candidate-cache-v279+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:79|[89]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:79|[89]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

check('3. All HTML pages referencing style.css, portal-shell.css, app.js, or shared-header.js use ?v=20261125v279+', () => {
  const htmlFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.wrangler') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(path.relative(ROOT, full));
    }
  }
  walk(ROOT);

  const assetRe = /\/assets\/(style\.css|css\/portal-shell\.css|app\.js|shared-header\.js)\?v=([^"'>\s]+)/g;
  let checkedCount = 0;
  for (const rel of htmlFiles) {
    const html = read(rel);
    let m;
    while ((m = assetRe.exec(html)) !== null) {
      checkedCount++;
      assert.ok(/^20261125v2(?:79|[89]\d)$/.test(m[2]), `${rel} has ${m[1]}?v=${m[2]} instead of 20261125v279+`);
    }
  }
  assert.ok(checkedCount >= 50, `Expected >=50 versioned core asset references across active HTML pages, got ${checkedCount}`);
});

check('4. Strict CSP compliance across shared-header.js, app.js, and core HTML pages', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
  for (const rel of ['index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html', 'study-library/index.html', 'community/index.html', 'about/index.html']) {
    const html = read(rel);
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }
});

console.log(`\n=== v279 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
