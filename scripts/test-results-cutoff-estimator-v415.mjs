#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v415 Interactive Odisha Result, Cut-Off & Merit Rank Estimator Audit ===');

const rceSrc = read('assets/js/results-cutoff-estimator.js');
const resultsHtml = read('results/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(rceSrc, sandbox);
const RCE = sandbox.window.CSOResultsCutoffEstimator;
assert.ok(RCE, 'window.CSOResultsCutoffEstimator must be exported');
assert.equal(RCE.version, 'v415');
assert.equal(RCE.PREFS_KEY, 'cso_results_cutoff_prefs_v1');

// 1. Verify all 7 exam benchmarks, category/gender cut-offs, margin, zone & raw score arithmetic
assert.equal(RCE.BENCHMARKS.length, 7, 'Must define all 7 exam benchmark presets');
assert.equal(RCE.getBenchmarkCutoff('opsc-oas-prelims', 'ur', 'male'), 76.09);
assert.equal(RCE.getBenchmarkCutoff('opsc-oas-prelims', 'sebc', 'female'), 65.41);
assert.equal(RCE.getBenchmarkCutoff('ossc-cgl-prelims', 'ur', 'male'), 106.5);
assert.equal(RCE.getBenchmarkCutoff('ossc-cgl-mains', 'sc', 'female'), 102);
assert.equal(RCE.getBenchmarkCutoff('osssc-combined-district', 'st', 'male'), 88.5);
assert.equal(RCE.getBenchmarkCutoff('oprb-police-si', 'ur', 'female'), 182.5);
assert.equal(RCE.getBenchmarkCutoff('cbse-ctet-qualifying', 'ur', 'male'), 90);
assert.equal(RCE.getBenchmarkCutoff('cbse-ctet-qualifying', 'sc', 'female'), 82);

const safeEval = RCE.evaluateCutoffMargin(95, 76.09, 200);
assert.equal(safeEval.margin, 18.91);
assert.equal(safeEval.zone, 'Safe');
assert.ok(safeEval.percentileBand.includes('Top 2%'));

const borderEval = RCE.evaluateCutoffMargin(105, 106.5, 150);
assert.equal(borderEval.margin, -1.5);
assert.equal(borderEval.zone, 'Borderline');

const belowEval = RCE.evaluateCutoffMargin(70, 90, 150);
assert.equal(belowEval.margin, -20);
assert.equal(belowEval.zone, 'Below');

assert.equal(RCE.computeRawScoreFromCounts(100, 20, 0.25, 1), 95, '100 correct - 20×0.25 must equal 95');
assert.equal(RCE.computeRawScoreFromCounts(80, 10, 0.5, 1), 75, '80 correct - 10×0.50 must equal 75');

// 2. Verify archive filtering & D1 search-index merge
const merged = RCE.mergeD1Results(
  RCE.BENCHMARKS.filter(b => b.key !== 'custom'),
  [{ slug: 'ossc-live-result-2026', title: 'OSSC Technical Final Merit List 2026', category: 'results', published_at: '2026-11-27', url: '/guides/ossc-live-result-2026' }]
);
assert.equal(merged.length, 7, 'mergeD1Results must append unseen D1 result articles');
const osscFinal = RCE.filterArchive(merged, { board: 'ossc', stage: 'final_merit' });
assert.equal(osscFinal.length, 2, 'OSSC Final Merit filter must return CGLRE Mains + live D1 OSSC merit list');

// 3. Markup, Strict CSP, 4-Theme CSS & v415 SW Cache Sync
assert.match(resultsHtml, /id="cso-results-cutoff-estimator-root"/, 'results/index.html must mount #cso-results-cutoff-estimator-root');
assert.match(resultsHtml, /\/assets\/js\/results-cutoff-estimator\.js\?v=20261127v418/, 'results/index.html must load results-cutoff-estimator.js?v=20261127v418');
assert.ok(!/\sstyle="/i.test(resultsHtml), 'results/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(resultsHtml), 'results/index.html must have zero inline on* handlers');
assert.ok(!rceSrc.includes('.innerHTML') && !rceSrc.includes('.outerHTML') && !rceSrc.includes('insertAdjacentHTML') && !rceSrc.includes('.style.'), 'results-cutoff-estimator.js must obey strict CSP');

const v415CssIdx = styleCss.indexOf('v415: Interactive Odisha Result, Cut-Off & Merit Rank Estimator');
assert.ok(v415CssIdx !== -1, 'assets/style.css must contain v415 Results Estimator CSS block');
const v415Css = styleCss.slice(v415CssIdx);
assert.ok(v415Css.includes('.cso-rce-card') && v415Css.includes('var(--cso-surface-elevated)') && v415Css.includes('var(--cso-ink)'), 'v415 CSS must use semantic --cso-* tokens');
assert.ok(v415Css.includes('min-height: 44px'), 'v415 CSS must enforce >=44px touch targets');
assert.ok(v415Css.includes('prefers-reduced-motion: reduce'), 'v415 CSS must respect prefers-reduced-motion');
assert.ok(v415Css.includes('@media print'), 'v415 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v415Css), 'v415 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v418'"), 'sw.js CACHE_NAME must be v415');
assert.ok(swJs.includes("'/results/'") && swJs.includes("'/assets/js/results-cutoff-estimator.js?v=20261127v418'"), 'sw.js must pre-cache /results/ and results-cutoff-estimator.js');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v418'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v415');

console.log('✅ v415 Interactive Odisha Result, Cut-Off & Merit Rank Estimator Audit PASSED');
