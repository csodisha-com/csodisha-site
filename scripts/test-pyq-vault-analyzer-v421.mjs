#!/usr/bin/env node
/**
 * v421 Automated Audit: Interactive Odisha Govt PYQ Paper Vault & Topic Weightage Analyzer
 * (/mock-tests/ & /guides/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v421 Odisha Govt PYQ Paper Vault & Topic Weightage Analyzer Audit ===');

const jsPath = path.join(ROOT, 'assets/js/pyq-vault-analyzer.js');
const mtHtmlPath = path.join(ROOT, 'mock-tests/index.html');
const guidesSsrPath = path.join(ROOT, 'functions/_lib/informative-guides.js');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const mtHtml = fs.readFileSync(mtHtmlPath, 'utf8');
const guidesSsr = fs.readFileSync(guidesSsrPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(mtHtml), 'mock-tests/index.html must have zero inline on* handlers');
assert.ok(!/\sstyle\s*=/i.test(mtHtml), 'mock-tests/index.html must have zero inline style attributes');

// 2. Sandbox module check
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOPyqVaultAnalyzer;
assert.ok(api, 'window.CSOPyqVaultAnalyzer must be exported');
assert.equal(api.version, 'v421');

// 3. Verify all 5 exam weightage profiles sum to exactly 100%
const expectedExams = ['opsc-oas', 'ossc-cgl', 'osssc-combined', 'odisha-police-si', 'cbse-ctet'];
for (const ek of expectedExams) {
  const prof = api.WEIGHTAGE_PROFILES[ek];
  assert.ok(prof, `Weightage profile required for ${ek}`);
  assert.ok(prof.en && prof.or && prof.negativeMarking, `Bilingual metadata + negative marking required for ${ek}`);
  const sum = prof.topics.reduce((acc, t) => acc + Number(t.pct || 0), 0);
  assert.equal(sum, 100, `Weightage percentages for ${ek} must sum to 100% (got ${sum}%)`);
  for (const t of prof.topics) {
    assert.ok(t.en && t.or && t.practiceHref.startsWith('/'), `Topic must have bilingual labels & valid practiceHref in ${ek}`);
  }
}

// 4. Verify all 12 PYQ archive papers & filtering
assert.equal(api.PYQ_PAPERS.length, 12, 'Must include 12 verified PYQ archive papers across 2021-2026');
assert.equal(api.filterPapers({ exam: 'opsc-oas' }).length, 3);
assert.equal(api.filterPapers({ exam: 'ossc-cgl' }).length, 3);
assert.equal(api.filterPapers({ exam: 'osssc-combined' }).length, 2);
assert.equal(api.filterPapers({ exam: 'odisha-police-si' }).length, 2);
assert.equal(api.filterPapers({ exam: 'cbse-ctet' }).length, 2);
assert.ok(api.filterPapers({ year: '2025-2026' }).length >= 3);
assert.ok(api.filterPapers({ stage: 'mains' }).length >= 4);
assert.ok(api.filterPapers({ query: 'Pedagogy' }).some((p) => p.examKey === 'cbse-ctet'));
assert.ok(api.filterPapers({ query: 'Amin' }).some((p) => p.examKey === 'osssc-combined'));

// 5. Mounts on /mock-tests/ & SSR /guides/, SW & Ops-Sentinel sync
assert.ok(mtHtml.includes('id="cso-pyq-vault-analyzer-root"'), 'mock-tests/index.html must mount #cso-pyq-vault-analyzer-root');
assert.ok(mtHtml.includes('/assets/js/pyq-vault-analyzer.js?v=20261127v446'), 'mock-tests/index.html must load pyq-vault-analyzer.js?v=20261127v446');
assert.ok(guidesSsr.includes('id="cso-pyq-vault-analyzer-root"'), 'informative-guides.js must mount #cso-pyq-vault-analyzer-root');
assert.ok(guidesSsr.includes('/assets/js/pyq-vault-analyzer.js?v=20261127v446'), 'informative-guides.js must load pyq-vault-analyzer.js?v=20261127v446');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v446'"), 'sw.js must bump CACHE_NAME to v421');
assert.ok(swSrc.includes("'/assets/js/pyq-vault-analyzer.js?v=20261127v446'"), 'sw.js must precache pyq-vault-analyzer.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v446'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v421');

// 6. CSS 4-theme semantic tokens check
const pyqCssIdx = cssSrc.indexOf('/* ===== v421:');
assert.ok(pyqCssIdx !== -1, 'assets/style.css must contain v421 .cso-pyq-* CSS block');
const pyqCssBlock = cssSrc.slice(pyqCssIdx);
assert.ok(pyqCssBlock.includes('.cso-pyq-wrap') && pyqCssBlock.includes('var(--cso-'), 'CSS must style .cso-pyq-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(pyqCssBlock), 'v421 .cso-pyq-* CSS block must have zero hardcoded hex colors');
assert.ok(pyqCssBlock.includes('prefers-reduced-motion'), 'v421 CSS must include prefers-reduced-motion guard');
assert.ok(pyqCssBlock.includes('@media print'), 'v421 CSS must include @media print rules');

console.log('✅ v421 Odisha Govt PYQ Paper Vault & Topic Weightage Analyzer Audit PASSED');
