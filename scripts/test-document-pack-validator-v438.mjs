#!/usr/bin/env node
/**
 * v438 Test Suite — 100% Client-Side Odisha Govt Document Pack,
 * Image-to-PDF & Size Validator (/tools/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const jsCode = read('assets/js/document-pack-validator.js');
const sandbox = { window: {}, globalThis: {}, console, Uint8Array };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSODocumentPackValidator;

assert.ok(api, 'window.CSODocumentPackValidator must be exposed');
assert.equal(api.VERSION, 'v438');
assert.equal(api.ROOT_ID, 'cso-document-pack-validator-root');
assert.equal(api.PREFS_KEY, 'cso_doc_pack_validator_v1');
assert.deepEqual(Array.from(Object.keys(api.PORTAL_SPECS)), ['opsc', 'ossc', 'osssc', 'ojee-sams']);
assert.equal(api.SLOT_ORDER.length, 5);

// 1. validateUploadFileMeta pass / oversize / undersize / dimension diagnostics
const passPhoto = api.validateUploadFileMeta({
  fileName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 42 * 1024, width: 200, height: 230, presetKey: 'ossc', slotType: 'photo'
});
assert.equal(passPhoto.valid, true);
assert.equal(passPhoto.status, 'PASS');

const oversizeSig = api.validateUploadFileMeta({
  fileName: 'sig.jpg', mimeType: 'image/jpeg', sizeBytes: 45 * 1024, width: 140, height: 60, presetKey: 'ossc', slotType: 'signature'
});
assert.equal(oversizeSig.valid, false);
assert.equal(oversizeSig.code, 'OVERSIZE');

const undersizeCert = api.validateUploadFileMeta({
  fileName: 'caste.pdf', mimeType: 'application/pdf', sizeBytes: 20 * 1024, presetKey: 'opsc', slotType: 'certificates'
});
assert.equal(undersizeCert.valid, false);
assert.equal(undersizeCert.code, 'UNDERSIZE');

const badDims = api.validateUploadFileMeta({
  fileName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 35 * 1024, width: 800, height: 800, presetKey: 'ossc', slotType: 'photo'
});
assert.equal(badDims.valid, false);
assert.equal(badDims.code, 'DIMENSION_MISMATCH');

// 2. Verify buildSinglePagePdfFromJpeg pure-JS binary %PDF-1.4 structure
const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
const pdfBytes = api.buildSinglePagePdfFromJpeg(fakeJpeg, 600, 800);
assert.ok(pdfBytes instanceof Uint8Array && pdfBytes.length > 200, 'Must emit valid binary PDF Uint8Array');
const pdfText = Buffer.from(pdfBytes).toString('latin1');
assert.ok(pdfText.startsWith('%PDF-1.4'), 'PDF must start with %PDF-1.4 header');
assert.ok(pdfText.includes('/Type /Catalog'), 'PDF must include /Catalog');
assert.ok(pdfText.includes('/Filter /DCTDecode'), 'PDF must embed JPEG via /DCTDecode');
assert.ok(pdfText.includes('xref\n0 6'), 'PDF must include valid xref table');
assert.ok(pdfText.includes('startxref') && pdfText.includes('%%EOF'), 'PDF must include startxref & %%EOF');

// 3. CSP, /tools/ mount, Quick-Jump registration, 4-theme CSS & SW sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode));
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode));

const toolsHtml = read('tools/index.html');
assert.equal((toolsHtml.match(/id=["']cso-document-pack-validator-root["']/g) || []).length, 1);
assert.ok(toolsHtml.includes('/assets/js/document-pack-validator.js?v=20261128v454'));
assert.ok(!/\son[a-z]+\s*=/i.test(toolsHtml) && !/\sstyle\s*=/i.test(toolsHtml));

const qj = read('assets/js/tools-quick-jump-directory.js');
assert.ok(qj.includes('cso-document-pack-validator-root'));

const css = read('assets/style.css');
const blk = css.slice(css.indexOf('v438 / v439 / v440: Document Pack Validator'));
assert.ok(blk.includes('.cso-dpv-card') && blk.includes('var(--cso-') && !/#[0-9a-fA-F]{3,8}\b/.test(blk));

const sw = read('sw.js');
assert.ok(sw.includes('/assets/js/document-pack-validator.js?v=20261128v454'));

console.log('✅ v438 Odisha Govt Document Pack, Image-to-PDF & Size Validator tests passed!');
