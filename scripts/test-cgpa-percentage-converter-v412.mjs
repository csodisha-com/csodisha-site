#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v412 Odisha University CGPA / SGPA to Percentage & Marks Converter Audit ===');

const cgpaSrc = read('assets/js/cgpa-percentage-converter.js');
const toolsHtml = read('tools/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(cgpaSrc, sandbox);
const C = sandbox.window.CSOCgpaPercentageConverter;
assert.ok(C, 'window.CSOCgpaPercentageConverter must be exported');
assert.equal(C.version, 'v412');
assert.equal(C.PREFS_KEY, 'cso_cgpa_converter_prefs_v1');

// 1. Verify all 9 university presets & exact conversion formulas
assert.equal(C.UNIVERSITIES.length, 9, 'Must expose all 9 Odisha university / board presets');
assert.equal(C.convertCgpaToPercentage(8.7, 'bput').percentage, 82, 'BPUT 8.7 CGPA must equal 82.00%');
assert.equal(C.convertCgpaToPercentage(8.7, 'sambalpur').percentage, 82, 'Sambalpur CBCS 8.7 CGPA must equal 82.00%');
assert.equal(C.convertCgpaToPercentage(8.0, 'utkal').percentage, 76, 'Utkal 8.0 CGPA must equal 76.00%');
assert.equal(C.convertCgpaToPercentage(8.0, 'ravenshaw').percentage, 76, 'Ravenshaw 8.0 CGPA must equal 76.00%');
assert.equal(C.convertCgpaToPercentage(8.0, 'cbse').percentage, 76, 'CBSE 8.0 CGPA must equal 76.00%');
assert.equal(C.convertCgpaToPercentage(8.5, 'berhampur').percentage, 80, 'Berhampur 8.5 CGPA must equal 80.00%');
assert.equal(C.convertCgpaToPercentage(8.5, 'fakir-mohan').percentage, 80, 'Fakir Mohan/MSCB 8.5 CGPA must equal 80.00%');
assert.equal(C.convertCgpaToPercentage(8.75, 'chse-ugc').percentage, 80, 'UGC/AICTE 8.75 CGPA must equal 80.00%');
assert.equal(C.convertCgpaToPercentage(9.0, { offset: 0, multiplier: 10 }).percentage, 90, 'Custom ×10 formula must equal 90.00%');

// 2. Verify multi-semester weighted & unweighted aggregation, division & form marks
const unweighted = C.aggregateSemesters([{ sgpa: 8.0 }, { sgpa: 9.0 }]);
assert.equal(unweighted.cgpa, 8.5, 'Unweighted average of 8.0 and 9.0 must be 8.50');

const weighted = C.aggregateSemesters([{ sgpa: 8.0, credits: 20 }, { sgpa: 9.0, credits: 30 }]);
assert.equal(weighted.cgpa, 8.6, 'Credit-weighted CGPA of (8.0×20 + 9.0×30)/50 must be 8.60');

assert.equal(C.classifyDivision(78).key, 'distinction');
assert.equal(C.classifyDivision(64).key, 'first');
assert.equal(C.classifyDivision(54).key, 'second');
assert.equal(C.classifyDivision(42).key, 'pass');

const formMarks = C.computeFormMarks(82, 2400);
assert.equal(formMarks.exact, 1968);
assert.equal(formMarks.rounded, 1968);

// 3. Markup, Strict CSP, 4-Theme CSS & v412 Cache Sync
assert.match(toolsHtml, /id="cso-cgpa-converter-root"/, 'tools/index.html must mount #cso-cgpa-converter-root');
assert.match(toolsHtml, /\/assets\/js\/cgpa-percentage-converter\.js\?v=20261127v421/, 'tools/index.html must load cgpa-percentage-converter.js?v=20261127v421');
assert.ok(!/\sstyle="/i.test(toolsHtml), 'tools/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(toolsHtml), 'tools/index.html must have zero inline on* handlers');
assert.ok(!cgpaSrc.includes('.innerHTML') && !cgpaSrc.includes('.outerHTML') && !cgpaSrc.includes('insertAdjacentHTML') && !cgpaSrc.includes('.style.'), 'cgpa-percentage-converter.js must obey strict CSP');

const v412CssIdx = styleCss.indexOf('v412: Odisha University CGPA / SGPA to Percentage & Marks Converter');
assert.ok(v412CssIdx !== -1, 'assets/style.css must contain v412 CGPA Converter CSS block');
const v412Css = styleCss.slice(v412CssIdx);
assert.ok(v412Css.includes('.cso-cgpa-card') && v412Css.includes('var(--cso-surface-elevated)') && v412Css.includes('var(--cso-ink)'), 'v412 CSS must use semantic --cso-* tokens');
assert.ok(v412Css.includes('min-height: 44px'), 'v412 CSS must enforce >=44px touch targets');
assert.ok(v412Css.includes('prefers-reduced-motion: reduce'), 'v412 CSS must respect prefers-reduced-motion');
assert.ok(v412Css.includes('@media print'), 'v412 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v412Css), 'v412 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v421'"), 'sw.js CACHE_NAME must be v412');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v421'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v412');

console.log('✅ v412 Odisha University CGPA / SGPA to Percentage & Marks Converter Audit PASSED');
