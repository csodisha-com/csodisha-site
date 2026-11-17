import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// 1. Evaluate admin/lazy-suite-loader.js in a minimal DOM sandbox
const loaderSrc = fs.readFileSync('admin/lazy-suite-loader.js', 'utf8');
const appended = [];
const sandbox = {
  window: {},
  document: {
    head: { appendChild: (el) => { appended.push(el); if (el._onload) el._onload(); } },
    createElement: () => ({
      addEventListener(ev, fn) {
        if (ev === 'load') this._onload = fn;
        if (ev === 'error') this._onerror = fn;
      }
    })
  },
  Promise,
  Set,
  Map,
  String,
  Error
};
sandbox.window = sandbox;
vm.runInNewContext(loaderSrc, sandbox);

const loader = sandbox.window.CSOLazySuiteLoader;
assert.ok(loader, 'CSOLazySuiteLoader must register on window');

// 2. Verify all 23 suites (01-23) map cleanly and every referenced script exists on disk
for (let i = 1; i <= 23; i++) {
  const key = String(i).padStart(2, '0');
  assert.ok(Object.hasOwn(loader.SUITE_SCRIPTS, key), `Missing suite key ${key}`);
  for (const src of loader.SUITE_SCRIPTS[key]) {
    const cleanRel = src.replace(/^\//, '').split('?')[0];
    assert.ok(fs.existsSync(cleanRel), `Missing lazy script on disk: ${cleanRel}`);
  }
}

// Spot-check prefix resolution across Suites 01-23
assert.equal(loader.resolveSuiteKey('module-05-001', 'folder-05'), '05');
assert.equal(loader.resolveSuiteKey('module-ana-001', 'folder-10'), '10');
assert.equal(loader.resolveSuiteKey('module-comms-002', 'folder-11'), '11');
assert.equal(loader.resolveSuiteKey('module-seo-004', 'folder-13'), '13');
assert.equal(loader.resolveSuiteKey('module-es-009', 'folder-14'), '14');
assert.equal(loader.resolveSuiteKey('module-int-011', 'folder-15'), '15');
assert.equal(loader.resolveSuiteKey('module-18-017', 'folder-18'), '18');
assert.equal(loader.resolveSuiteKey('module-19-011', 'folder-19'), '19');
assert.equal(loader.resolveSuiteKey('module-jc-001', 'folder-jobs-careers'), '20');
assert.equal(loader.resolveSuiteKey('module-sb-001', 'folder-schemes-benefits'), '21');
assert.equal(loader.resolveSuiteKey('module-sl-001', 'folder-study-library'), '22');
assert.equal(loader.resolveSuiteKey('module-cm-001', 'folder-community'), '23');

// Verify deduplicated lazy loading
assert.equal(loader.needsLazyScripts('module-19-001', 'folder-19'), true);
await loader.ensureForModule('module-19-001', 'folder-19');
assert.equal(appended.length, 3);
assert.equal(loader.needsLazyScripts('module-19-002', 'folder-19'), false);
await loader.ensureForModule('module-19-002', 'folder-19');
assert.equal(appended.length, 3, 'Already-loaded suite scripts must be cached in memory');

// 3. Verify admin/index.html loads only core shell scripts upfront (< 10 script tags)
const indexHtml = fs.readFileSync('admin/index.html', 'utf8');
const scriptTags = indexHtml.match(/<script\b/g) || [];
assert.ok(scriptTags.length < 10, `Expected < 10 upfront script tags, found ${scriptTags.length}`);
assert.ok(indexHtml.includes('/admin/lazy-suite-loader.js'));
assert.ok(!indexHtml.includes('settings-configuration-batch1.js'));

// 4. Verify admin/super-store.js is retired & publishFlash is parameterized
assert.equal(fs.existsSync('admin/super-store.js'), false, 'admin/super-store.js must be retired');
const suiteLive = fs.readFileSync('admin/suite-live.js', 'utf8');
assert.ok(suiteLive.includes('async function publishFlash(payload)'));
assert.ok(!suiteLive.includes('Urgent: OSSC CGL 2026 official hall ticket download released'));

// 5. Verify 0 CSP matches (innerHTML|<script|style=) across ALL admin/*.js (excluding line-1 header comment)
for (const f of fs.readdirSync('admin').filter(n => n.endsWith('.js'))) {
  const lines = fs.readFileSync(path.join('admin', f), 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (idx === 0) return;
    assert.ok(!/(innerHTML|<script|style=)/.test(line), `CSP pattern found in admin/${f}:${idx + 1}`);
  });
}

console.log('ALL ADMIN LAZY LOADER, RETIRED SUPER-STORE & ZERO-MATCH CSP (v131) TESTS PASSED');
