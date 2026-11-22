import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const CORE_PAGES = [
  'index.html',
  'jobs-careers/index.html',
  'schemes/index.html',
  'study-library/index.html',
  'student-dashboard/index.html',
  'tools/index.html',
  'about/index.html'
];

for (const rel of CORE_PAGES) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');

  // 1. 100% CSP compliance
  assert.equal(/<style\b/i.test(html), false, `Zero <style> in ${rel}`);
  assert.equal(/\sstyle="/i.test(html), false, `Zero style="" in ${rel}`);
  assert.equal(/\sonclick=/i.test(html), false, `Zero onclick= in ${rel}`);

  const nonLdScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
  for (const s of nonLdScripts) {
    assert.equal(s[2].trim(), '', `Executable scripts in ${rel} must be external`);
    if (/\bsrc=/i.test(s[1])) {
      assert.ok(/\b(?:defer|async)\b/i.test(s[1]), `External script in ${rel} must use defer or async: <script ${s[1]}>`);
    }
  }

  // 2. Every <img> has explicit width & height; header logo has fetchpriority="high"; footer images have loading="lazy"
  const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)];
  assert.ok(imgs.length >= 2, `${rel} must contain header/footer images`);
  for (const m of imgs) {
    const attrs = m[1];
    assert.ok(/\bwidth="\d+"/i.test(attrs) && /\bheight="\d+"/i.test(attrs), `Missing width/height on <img> in ${rel}: ${attrs}`);
    assert.ok(/\bdecoding="async"/i.test(attrs), `Missing decoding="async" on <img> in ${rel}: ${attrs}`);
    if (/cso-brand-logo/i.test(attrs)) {
      assert.ok(/\bfetchpriority="high"/i.test(attrs), `Header logo in ${rel} must have fetchpriority="high"`);
      assert.equal(/\bloading="lazy"/i.test(attrs), false, `Header logo in ${rel} must not be lazy-loaded`);
    }
    if (/cso-footer-logo|cso-footer-odisha-map/i.test(attrs)) {
      assert.ok(/\bloading="lazy"/i.test(attrs), `Footer image in ${rel} must have loading="lazy"`);
    }
  }

  // 3. Updated stylesheet cache-busting tag
  assert.ok(html.includes('/assets/style.css?v=20261122v181'), `${rel} must reference style.css?v=20261122v181`);
}

// 4. Verify functions/_lib/ssr-shell.js
const ssrShell = fs.readFileSync(path.join(root, 'functions/_lib/ssr-shell.js'), 'utf8');
assert.ok(ssrShell.includes('/assets/style.css?v=20261122v181'), 'ssr-shell.js must reference style.css?v=20261122v181');
assert.ok(ssrShell.includes('fetchpriority="high"'), 'ssr-shell.js header logo must have fetchpriority="high"');
assert.ok(ssrShell.includes('width="81" height="64" loading="lazy" decoding="async"'), 'ssr-shell.js footer map must have explicit dimensions + lazy');
assert.equal(/\.innerHTML\b|insertAdjacentHTML/i.test(ssrShell), false, 'Zero innerHTML in ssr-shell.js');

// 5. Verify assets/style.css content-visibility rules
const styleCss = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');
assert.ok(styleCss.includes('content-visibility: auto;'), 'assets/style.css must include content-visibility: auto');
assert.ok(styleCss.includes('contain-intrinsic-size: auto 400px;'), 'assets/style.css must include contain-intrinsic-size: auto 400px');
assert.ok(styleCss.includes('aspect-ratio: 960 / 760;'), 'assets/style.css must preserve Odisha map aspect-ratio');

// 6. Verify v181 cache version
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v181'"), 'sw.js must be bumped to v181');

console.log('test-cwv-speed-v181: ALL CHECKS PASSED');
