#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v409 Browser-Side Photo, Signature & Thumb Impression Resizer Audit ===');

const psrSrc = read('assets/js/photo-signature-resizer.js');
const toolsHtml = read('tools/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// Load module in isolated VM context
const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(psrSrc, sandbox);
const PSR = sandbox.window.CSOPhotoSignatureResizer;
assert.ok(PSR, 'window.CSOPhotoSignatureResizer must be exported');
assert.equal(PSR.version, 'v409');

// 1. Verify all 8 exam presets & exact pixel / KB bounds
assert.equal(PSR.PRESETS.length, 8, 'Must expose all 8 exam & document presets');
const byKey = Object.fromEntries(Array.from(PSR.PRESETS, p => [p.key, p]));

assert.deepEqual([byKey['opsc-photo'].width, byKey['opsc-photo'].height, byKey['opsc-photo'].minKb, byKey['opsc-photo'].maxKb], [200, 230, 20, 50]);
assert.deepEqual([byKey['opsc-sign'].width, byKey['opsc-sign'].height, byKey['opsc-sign'].minKb, byKey['opsc-sign'].maxKb], [140, 60, 10, 20]);
assert.deepEqual([byKey['opsc-lti'].width, byKey['opsc-lti'].height, byKey['opsc-lti'].minKb, byKey['opsc-lti'].maxKb], [240, 240, 10, 50]);
assert.deepEqual([byKey['ctet-photo'].width, byKey['ctet-photo'].height, byKey['ctet-photo'].minKb, byKey['ctet-photo'].maxKb], [276, 354, 10, 100]);
assert.deepEqual([byKey['ctet-sign'].width, byKey['ctet-sign'].height, byKey['ctet-sign'].minKb, byKey['ctet-sign'].maxKb], [276, 118, 3, 30]);
assert.deepEqual([byKey['nta-photo'].width, byKey['nta-photo'].height, byKey['nta-photo'].minKb, byKey['nta-photo'].maxKb], [200, 230, 10, 200]);
assert.deepEqual([byKey['nta-sign'].width, byKey['nta-sign'].height, byKey['nta-sign'].minKb, byKey['nta-sign'].maxKb], [140, 60, 4, 30]);
assert.ok(byKey['custom'], 'Must include custom preset');

for (const p of PSR.PRESETS) {
  assert.ok(p.en && p.or, `Preset ${p.key} must have bilingual EN + Odia labels`);
}

// 2. Verify dataUrlToBytes, bytesToKb, buildOutputFilename & binary-search KB convergence
const sampleBytes = Buffer.alloc(34 * 1024, 65); // 34 KB exact
const sampleDataUrl = 'data:image/jpeg;base64,' + sampleBytes.toString('base64');
assert.equal(PSR.dataUrlToBytes(sampleDataUrl), 34 * 1024, 'dataUrlToBytes must decode exact byte length');
assert.equal(PSR.bytesToKb(34 * 1024), 34, 'bytesToKb must convert bytes to KB accurately');
assert.equal(PSR.buildOutputFilename('opsc-photo', 200, 230, 34.2), 'opsc-photo-200x230-34kb.jpg');

// Mock canvas where encoded JPEG size scales linearly from 10 KB (q=0.10) to 95 KB (q=0.95)
const mockCanvas = {
  toDataURL(_mime, q) {
    const kb = Math.round(q * 100);
    const buf = Buffer.alloc(kb * 1024, 66);
    return 'data:image/jpeg;base64,' + buf.toString('base64');
  }
};
const fittedPhoto = PSR.fitCanvasToTargetKb(mockCanvas, 20, 50);
assert.equal(fittedPhoto.status, 'within', 'Binary search must converge within [20, 50] KB');
assert.ok(fittedPhoto.kb >= 20 && fittedPhoto.kb <= 50, `Expected 20..50 KB, got ${fittedPhoto.kb}`);

const fittedSign = PSR.fitCanvasToTargetKb(mockCanvas, 10, 20);
assert.equal(fittedSign.status, 'within', 'Binary search must converge within [10, 20] KB');
assert.ok(fittedSign.kb >= 10 && fittedSign.kb <= 20, `Expected 10..20 KB, got ${fittedSign.kb}`);

// 3. Markup, Strict CSP, 4-Theme CSS & v409 Cache Sync
assert.match(toolsHtml, /id="cso-photo-signature-resizer-root"/, 'tools/index.html must mount #cso-photo-signature-resizer-root');
assert.match(toolsHtml, /\/assets\/js\/photo-signature-resizer\.js\?v=20261127v414/, 'tools/index.html must load photo-signature-resizer.js?v=20261127v414');
assert.ok(!/\sstyle="/i.test(toolsHtml), 'tools/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(toolsHtml), 'tools/index.html must have zero inline on* handlers');
assert.ok(!psrSrc.includes('.innerHTML') && !psrSrc.includes('.outerHTML') && !psrSrc.includes('insertAdjacentHTML') && !psrSrc.includes('.style.'), 'photo-signature-resizer.js must obey strict CSP');

const v409CssIdx = styleCss.indexOf('v409: Browser-Side Photo, Signature & Thumb Impression Resizer');
assert.ok(v409CssIdx !== -1, 'assets/style.css must contain v409 Resizer CSS block');
const v409Css = styleCss.slice(v409CssIdx);
assert.ok(v409Css.includes('.cso-psr-card') && v409Css.includes('var(--cso-surface-elevated)') && v409Css.includes('var(--cso-ink)'), 'v409 CSS must use semantic --cso-* tokens');
assert.ok(v409Css.includes('min-height: 44px'), 'v409 CSS must enforce >=44px touch targets');
assert.ok(v409Css.includes('prefers-reduced-motion: reduce'), 'v409 CSS must respect prefers-reduced-motion');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v409Css), 'v409 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v414'"), 'sw.js CACHE_NAME must be v409');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v414'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v409');

console.log('✅ v409 Browser-Side Photo, Signature & Thumb Impression Resizer Audit PASSED');
