import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// 1. All optimized logo assets exist and are non-empty; cso-logo.webp < 45 KB
const requiredAssets = [
  'assets/img/cso-logo-source.png',
  'assets/img/cso-logo.webp',
  'assets/img/cso-logo.png',
  'assets/img/cso-logo-192.png',
  'assets/img/cso-logo-96.webp',
  'assets/img/cso-logo-96.png',
  'assets/img/apple-touch-icon.png',
  'assets/img/favicon-32x32.png',
  'favicon.ico',
];
for (const rel of requiredAssets) {
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `${rel} must exist`);
  const stat = fs.statSync(full);
  assert.ok(stat.size > 0, `${rel} must be non-empty`);
}
assert.ok(fs.statSync(path.join(root, 'assets/img/cso-logo.webp')).size < 45 * 1024, 'cso-logo.webp must be < 45 KB');

// 2. Shared header, manifest, settings defaults, and CSS emblem rules
const sharedHeader = read('assets/shared-header.js');
assert.ok(sharedHeader.includes('/assets/img/cso-logo-96.webp'), 'shared-header.js must reference /assets/img/cso-logo-96.webp');
assert.ok(sharedHeader.includes('Common Sense Odisha Logo'), 'shared-header.js must set alt="Common Sense Odisha Logo"');
assert.equal(sharedHeader.includes('.innerHTML'), false, 'shared-header.js must obey zero .innerHTML CSP rule');

const styleCss = read('assets/style.css');
assert.ok(styleCss.includes('.cso-brand-emblem'), 'assets/style.css must define .cso-brand-emblem');
assert.ok(styleCss.includes('scale(1.05)'), 'assets/style.css must define hover scale(1.05) on .cso-brand-emblem');

const manifest = read('manifest.webmanifest');
assert.ok(manifest.includes('/assets/img/cso-logo-192.png'), 'manifest.webmanifest must include cso-logo-192.png');
assert.ok(manifest.includes('/assets/img/cso-logo.png'), 'manifest.webmanifest must include cso-logo.png');

const settingsBatch1 = read('functions/_lib/settings-configuration-batch1.js');
assert.ok(settingsBatch1.includes('/assets/img/cso-logo.webp'), 'settings-configuration-batch1.js must default logo_light_url/logo_dark_url to /assets/img/cso-logo.webp');

// 3. Key HTML pages reference optimized emblem with alt="Common Sense Odisha Logo" and no old cso-logo.svg
for (const htmlRel of [
  'index.html',
  'jobs-careers/index.html',
  'schemes/index.html',
  'study-library/index.html',
  'community/index.html',
  'admin/index.html',
]) {
  const html = read(htmlRel);
  assert.ok(html.includes('/assets/img/cso-logo-96.webp'), `${htmlRel} must reference /assets/img/cso-logo-96.webp`);
  assert.ok(html.includes('alt="Common Sense Odisha Logo"'), `${htmlRel} must have alt="Common Sense Odisha Logo"`);
  assert.ok(html.includes('/assets/img/favicon-32x32.png'), `${htmlRel} must reference /assets/img/favicon-32x32.png`);
  assert.equal(html.includes('cso-logo.svg'), false, `${htmlRel} must not reference legacy cso-logo.svg`);
}

console.log('✅ test-logo-integration-v139 passed');
