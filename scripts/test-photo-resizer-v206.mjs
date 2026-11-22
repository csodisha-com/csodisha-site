#!/usr/bin/env node
/**
 * v206 Verification:
 * 1. tools/index.html has #photo-resizer, Odisha exam presets (200x230, 140x60, 20-50KB, 10-20KB), privacy badge, and v206 assets
 * 2. tools/assets/tools.js implements binary-search JPEG compression via canvas.toBlob('image/jpeg', quality)
 * 3. 100% CSP compliance & SW cache v206
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const toolsHtml = read('tools/index.html');
const toolsJs = read('tools/assets/tools.js');
const toolsCss = read('tools/assets/tools.css');

// 1. Anchor & presets
assert.ok(toolsHtml.includes('id="photo-resizer"'), 'tools/index.html must include #photo-resizer');
assert.ok(toolsHtml.includes('Photos Never Leave Your Device'), 'tools/index.html must include privacy badge');
assert.ok(toolsHtml.includes('data-w="200" data-h="230" data-min-kb="20" data-max-kb="50"'), 'Must include 200x230 20-50KB passport photo preset');
assert.ok(toolsHtml.includes('data-w="140" data-h="60" data-min-kb="10" data-max-kb="20"'), 'Must include 140x60 10-20KB signature preset');
assert.ok(toolsHtml.includes('Odisha Police / Custom JPG'), 'Must include Odisha Police / Custom JPG preset');
assert.ok(toolsHtml.includes('accept="image/jpeg,image/png,image/webp"'), 'Must accept JPEG/PNG/WebP');
assert.ok(toolsHtml.includes('/tools/assets/tools.css?v=20261122v206'));
assert.ok(toolsHtml.includes('/tools/assets/tools.js?v=20261122v206'));

// 2. Canvas binary-search compression logic
assert.ok(toolsJs.includes("cvs.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', quality)"));
assert.ok(toolsJs.includes('async function encodeToTargetKb('));
assert.ok(toolsJs.includes('var mid = (low + high) / 2;'));

// 3. Touch targets in CSS
assert.ok(toolsCss.includes('min-height: 44px;'));

// 4. CSP compliance
for (const [name, content] of [['tools/index.html', toolsHtml], ['tools/assets/tools.js', toolsJs]]) {
  assert.ok(!/\.innerHTML\s*=/.test(content), `${name}: no .innerHTML`);
  assert.ok(!/\sonclick\s*=/i.test(content), `${name}: no onclick=`);
  assert.ok(!/\sstyle\s*=/i.test(content), `${name}: no style=`);
  if (name.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(content), `${name}: no inline <style>`);
    assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(content), `${name}: no executable inline <script>`);
  }
}

assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v206';"));
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v206';"));

console.log('PASS: test-photo-resizer-v206.mjs');
