#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v414 Offline PWA Candidate Toolkit Hub & SW Pre-Caching Audit ===');

const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');
const otkSrc = read('assets/js/offline-toolkit-hub.js');
const toolsHtml = read('tools/index.html');
const styleCss = read('assets/style.css');

// 1. Verify sw.js v414+ cache, CANDIDATE_TOOLKIT_URLS, navigationPreload & message handlers
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v454';"), 'sw.js CACHE_NAME must be v454');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v454'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v454');
assert.ok(swJs.includes('navigationPreload.enable()'), 'sw.js activate handler must enable navigationPreload');
assert.ok(swJs.includes('event.preloadResponse'), 'sw.js navigate handler must await event.preloadResponse');
assert.ok(swJs.includes('ignoreSearch: true'), 'sw.js navigate fallback must match cached shell with ignoreSearch: true');
assert.ok(swJs.includes('CANDIDATE_TOOLKIT_URLS'), 'sw.js must define CANDIDATE_TOOLKIT_URLS');
assert.ok(swJs.includes('CSO_PRECACHE_TOOLKIT'), 'sw.js must handle CSO_PRECACHE_TOOLKIT message');
assert.ok(swJs.includes('CSO_GET_TOOLKIT_STATUS'), 'sw.js must handle CSO_GET_TOOLKIT_STATUS message');
assert.ok(swJs.includes('CSO_PRECACHE_PROGRESS') && swJs.includes('CSO_PRECACHE_COMPLETE'), 'sw.js must emit progress and completion messages');

for (const reqUrl of [
  '/tools/',
  '/exams/',
  '/mock-tests/',
  '/career-paths/',
  '/guides/',
  '/schemes/',
  '/current-affairs/',
  '/assets/js/orsp-salary-estimator.js?v=20261128v454',
  '/assets/js/photo-signature-resizer.js?v=20261128v454',
  '/assets/js/certificate-fee-matrix.js?v=20261128v454',
  '/assets/js/cgpa-percentage-converter.js?v=20261128v454',
  '/assets/js/exam-calendar-tracker.js?v=20261128v454',
  '/assets/js/mock-tests-hub.js?v=20261128v454',
  '/assets/js/offline-toolkit-hub.js?v=20261128v454'
]) {
  assert.ok(swJs.includes(reqUrl), `sw.js CANDIDATE_TOOLKIT_URLS must include ${reqUrl}`);
}

// 2. Verify offline-toolkit-hub.js readiness & storage metric helpers + strict CSP
const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(otkSrc, sandbox);
const OTK = sandbox.window.CSOOfflineToolkitHub;
assert.ok(OTK, 'window.CSOOfflineToolkitHub must be exported');
assert.equal(OTK.version, 'v414');
assert.equal(OTK.CACHE_NAME, 'cso-candidate-cache-v454');
assert.equal(OTK.TOOLKIT_ITEMS.length, 6, 'Must list all 6 offline-ready candidate tools');

assert.equal(OTK.formatBytes(512), '512 B');
assert.equal(OTK.formatBytes(45 * 1024), '45 KB');
assert.equal(OTK.formatBytes(1.5 * 1024 * 1024), '1.5 MB');

const avail = {};
for (let i = 0; i < OTK.TOOLKIT_URLS.length; i++) avail[OTK.TOOLKIT_URLS[i]] = true;
const fullMetrics = OTK.computeReadinessMetrics(avail, OTK.TOOLKIT_URLS);
assert.equal(fullMetrics.percent, 100);
assert.equal(fullMetrics.isReady, true);
assert.equal(fullMetrics.barStep, 100);

const partialMetrics = OTK.computeReadinessMetrics({ '/tools/': true }, OTK.TOOLKIT_URLS);
assert.equal(partialMetrics.cachedCount, 1);
assert.equal(partialMetrics.isReady, false);

// 3. Markup, Strict CSP & 4-Theme CSS
assert.match(toolsHtml, /id="cso-offline-toolkit-hub-root"/, 'tools/index.html must mount #cso-offline-toolkit-hub-root');
assert.match(toolsHtml, /\/assets\/js\/offline-toolkit-hub\.js\?v=20261128v454/, 'tools/index.html must load offline-toolkit-hub.js?v=20261128v454');
assert.ok(!/\sstyle="/i.test(toolsHtml), 'tools/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(toolsHtml), 'tools/index.html must have zero inline on* handlers');
assert.ok(!otkSrc.includes('.innerHTML') && !otkSrc.includes('.outerHTML') && !otkSrc.includes('insertAdjacentHTML') && !otkSrc.includes('.style.'), 'offline-toolkit-hub.js must obey strict CSP');

const v414CssIdx = styleCss.indexOf('v414: Offline PWA Candidate Toolkit Hub');
assert.ok(v414CssIdx !== -1, 'assets/style.css must contain v414 Offline Toolkit CSS block');
const v414Css = styleCss.slice(v414CssIdx);
assert.ok(v414Css.includes('.cso-otk-card') && v414Css.includes('var(--cso-surface-elevated)') && v414Css.includes('var(--cso-ink)'), 'v414 CSS must use semantic --cso-* tokens');
assert.ok(v414Css.includes('min-height: 44px'), 'v414 CSS must enforce >=44px touch targets');
assert.ok(v414Css.includes('prefers-reduced-motion: reduce'), 'v414 CSS must respect prefers-reduced-motion');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v414Css), 'v414 CSS block must have zero hardcoded hex values');

console.log('✅ v414 Offline PWA Candidate Toolkit Hub & SW Pre-Caching Audit PASSED');
