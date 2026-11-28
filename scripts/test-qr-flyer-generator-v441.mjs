import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsPath = 'assets/js/qr-flyer-generator.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');

// 2. Execute in clean sandbox and verify pure-JS QR + WhatsApp Alert engine
const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    addEventListener: () => {},
    getElementById: () => null
  },
  console,
  URL,
  Date,
  Math
};
vm.runInNewContext(src, sandbox, { filename: jsPath });

const api = sandbox.window.CSOQrFlyerGenerator;
assert.ok(api, 'window.CSOQrFlyerGenerator must be exposed');
assert.ok(Array.isArray(api.FALLBACK_NOTICES) && api.FALLBACK_NOTICES.length >= 3, 'Fallback notices present');
assert.equal(api.LAYOUT_DIMS.a5.w, 740);
assert.equal(api.LAYOUT_DIMS.a4.w, 840);
assert.equal(api.LAYOUT_DIMS.square.w, 900);

// QR Matrix encoder verification
const qr = api.encodeQrMatrix('https://csodisha.com/jobs/');
assert.ok(qr && qr.size >= 21 && qr.size % 4 === 1, `Valid QR version size (got ${qr && qr.size})`);
assert.equal(qr.modules.length, qr.size);
// Verify top-left 7x7 finder pattern outer ring is dark (1)
for (let i = 0; i < 7; i++) {
  assert.equal(qr.modules[0][i], 1, 'Top-left finder top edge');
  assert.equal(qr.modules[6][i], 1, 'Top-left finder bottom edge');
  assert.equal(qr.modules[i][0], 1, 'Top-left finder left edge');
  assert.equal(qr.modules[i][6], 1, 'Top-left finder right edge');
}
// Verify center 3x3 of top-left finder is dark
assert.equal(qr.modules[3][3], 1, 'Top-left finder center dark');

// Longer URL uses higher QR version cleanly
const qrLong = api.encodeQrMatrix('https://csodisha.com/jobs/opsc-oas-combined-civil-services-2026-notification-apply-online');
assert.ok(qrLong.size >= 29, `Long URL upgrades QR version (got ${qrLong.size})`);

// Bilingual WhatsApp/SMS Alert text
const sample = api.FALLBACK_NOTICES[0];
const waText = api.buildWhatsAppAlertText(sample);
assert.ok(waText.includes(sample.url), 'WhatsApp alert includes notice URL');
assert.ok(waText.includes(sample.titleOr), 'WhatsApp alert includes Odia title');

// 3. Verify HTML mounts in jobs/index.html & admin/index.html
for (const htmlPath of ['jobs/index.html', 'admin/index.html']) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('id="cso-qr-flyer-generator-root"'), `${htmlPath} mounts #cso-qr-flyer-generator-root`);
  assert.ok(html.includes('/assets/js/qr-flyer-generator.js?v=20261128v453'), `${htmlPath} loads qr-flyer-generator.js v443`);
}

// 4. Verify CSS & Service Worker precache
const css = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(css.includes('.cso-qfg-root') && css.includes('.cso-qfg-canvas'), 'CSS defines .cso-qfg-* styles');

const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("'/assets/js/qr-flyer-generator.js?v=20261128v453'"), 'sw.js precaches qr-flyer-generator.js');

console.log('PASS: v441 QR Flyer & SMS/WhatsApp Quick-Alert Generator suite verified.');
