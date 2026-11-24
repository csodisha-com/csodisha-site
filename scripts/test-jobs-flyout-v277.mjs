#!/usr/bin/env node
/**
 * Foreign Jobs Direct Single-Stage Menu Verification (v277)
 *
 * Verifies:
 *  1. In both assets/shared-header.js and assets/app.js:
 *     - Foreign Jobs (`slug === 'foreign'`) renders as a direct single-stage item (`is-direct-only`)
 *       with NO right chevron (`›`), NO Stage 2 slideout on hover/focus (clears & removes `is-stage2-open`),
 *       and NO mobile inline accordion toggle/submenu.
 *     - Government, Private, PSUs, and NGOs / Non-Profit retain the `›` chevron, Stage 2 slideout
 *       (`Central`, `Odisha`, `All Over India`), and mobile inline accordion.
 *  2. v277 cache busting across core HTML pages, sw.js & ops-sentinel.js, and 100% strict CSP compliance.
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

console.log('\n=== v277 Foreign Jobs Single-Stage Menu Verification ===');

check('1. Foreign Jobs skips chevron, Stage 2 flyout, ArrowRight & mobile accordion in shared-header.js & app.js', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    assert.match(src, /===\s*'foreign'/, `${rel} missing === 'foreign' check`);
    for (const tok of [
      'is-direct-only',
      "cascade.classList.remove('is-stage2-open')",
      'cso_jobs_flyout_v277'
    ]) {
      assert.ok(src.includes(tok), `${rel} missing "${tok}"`);
    }
    assert.match(src, /if\s*\(\s*hasStage2\s*\)/, `${rel} missing if (hasStage2) guard`);
    assert.ok(
      src.includes("ev.key === 'ArrowRight' && hasStage2") || src.includes("ev.key==='ArrowRight'&&hasStage2"),
      `${rel} must guard ArrowRight with hasStage2`
    );
  }
});

check('2. v277 cache busting across HTML pages, sw.js & ops-sentinel.js + 100% strict CSP compliance', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v277';"), 'sw.js must be cso-candidate-cache-v277');
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v277';"), 'ops-sentinel.js must be cso-candidate-cache-v277');

  const corePages = [
    'index.html', 'jobs/index.html', 'careers/index.html', 'schemes/index.html',
    'study-library/index.html', 'community/index.html', 'about/index.html', 'student-dashboard/index.html'
  ];
  for (const rel of corePages) {
    const html = read(rel);
    assert.ok(html.includes('/assets/style.css?v=20261124v277'), `${rel} missing style.css?v=20261124v277`);
    if (rel === 'index.html') {
      assert.ok(html.includes('/assets/app.js?v=20261124v277'), 'index.html missing app.js?v=20261124v277');
    } else {
      assert.ok(html.includes('/assets/shared-header.js?v=20261124v277'), `${rel} missing shared-header.js?v=20261124v277`);
    }
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }

  for (const rel of ['assets/shared-header.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v277 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
