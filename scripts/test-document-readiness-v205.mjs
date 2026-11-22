#!/usr/bin/env node
/**
 * v205 Verification:
 * 1. assets/js/document-readiness.js has all 8 Odisha document/OTR items with EN + Odia labels & cso_doc_readiness_v1 persistence
 * 2. /student-dashboard/ loads document-readiness.js & renders #cso-doc-readiness-panel
 * 3. /tools/ links directly to /student-dashboard/#cso-doc-readiness-panel
 * 4. 100% CSP compliance & SW cache v205
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

await import('../assets/js/document-readiness.js');
const api = globalThis.CSO_DOCUMENT_READINESS;
assert.ok(api, 'window.CSO_DOCUMENT_READINESS must be defined');
assert.equal(api.STORAGE_KEY, 'cso_doc_readiness_v1');
assert.equal(api.ITEMS.length, 8, 'Must define exactly 8 Odisha document/OTR items');

const expectedIds = [
  'aadhaar-digilocker',
  'hsc-10th',
  'degree-marksheets',
  'odisha-resident',
  'caste-sebc-ews',
  'employment-exchange',
  'otr-portals',
  'photo-signature-scan'
];
assert.deepEqual(api.ITEMS.map(x => x.id), expectedIds);

for (const item of api.ITEMS) {
  assert.ok(item.title_en && item.title_en.length > 3, `Missing title_en on ${item.id}`);
  assert.ok(item.title_or && /[\u0B00-\u0B7F]/.test(item.title_or), `Missing Odia label on ${item.id}`);
  assert.ok(item.validityNote && item.validityNote.length > 10, `Missing validityNote on ${item.id}`);
  assert.ok(Array.isArray(item.links) && item.links.length > 0, `Missing links on ${item.id}`);
}

const store = new Map();
const mockStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v))
};

let st = api.load(mockStorage);
assert.equal(api.getSummary(st).ready, 0);
st = api.toggle('aadhaar-digilocker', mockStorage);
st = api.toggle('otr-portals', mockStorage);
const summary = api.getSummary(st);
assert.equal(summary.ready, 2);
assert.equal(summary.total, 8);
assert.equal(summary.pct, 25);

const reloaded = api.load(mockStorage);
assert.equal(reloaded.checked['aadhaar-digilocker'], true);
assert.equal(reloaded.checked['otr-portals'], true);

const studHtml = read('student-dashboard/index.html');
assert.ok(studHtml.includes('id="cso-doc-readiness-panel"'));
assert.ok(studHtml.includes('/assets/js/document-readiness.js?v=20261122v205'));
assert.ok(studHtml.includes('/assets/js/student-dashboard.js?v=20261122v205'));
assert.ok(studHtml.includes('/assets/css/student-dashboard-bp.css?v=20261122v205'));

const studJs = read('assets/js/student-dashboard.js');
assert.ok(studJs.includes('function renderDocumentReadinessPanel()'));

const toolsHtml = read('tools/index.html');
assert.ok(toolsHtml.includes('/student-dashboard/#cso-doc-readiness-panel'));

const cspFiles = [
  ['assets/js/document-readiness.js', read('assets/js/document-readiness.js')],
  ['student-dashboard/index.html', studHtml],
  ['assets/js/student-dashboard.js', studJs],
  ['tools/index.html', toolsHtml]
];
for (const [name, content] of cspFiles) {
  assert.ok(!/\.innerHTML\s*=/.test(content), `${name}: no .innerHTML`);
  assert.ok(!/\sonclick\s*=/i.test(content), `${name}: no onclick=`);
  assert.ok(!/\sstyle\s*=/i.test(content), `${name}: no style=`);
  if (name.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(content), `${name}: no inline <style>`);
    assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(content), `${name}: no executable inline <script>`);
  }
}

assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v205';"));
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v205';"));

console.log('PASS: test-document-readiness-v205.mjs');
