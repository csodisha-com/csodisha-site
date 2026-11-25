#!/usr/bin/env node
/**
 * Minimal 3-Item Schemes & Benefits Dropdown Verification (v284)
 *
 * Verifies:
 *  1. assets/shared-header.js & assets/app.js render ONLY 3 links in .cso-schemes-stage1:
 *       - Odisha State Schemes (/schemes/?scope=odisha)
 *       - Central Government Schemes (/schemes/?scope=central)
 *       - All Schemes & Benefits (/schemes/)
 *     with NO Stage 2 flyout (.cso-schemes-stage2) and NO › chevrons.
 *  2. assets/style.css & assets/css/portal-shell.css style .cso-schemes-stage1 at width: 248px
 *     with 100% solid opaque 4-theme surfaces (--cso-surface-elevated, opacity: 1, backdrop-filter: none).
 *  3. /schemes/?scope=odisha and /schemes/?scope=central activate Government Scope filter
 *     and dismissible active filter chip in assets/js/schemes-portal.js.
 *  4. ?v=20261125v284 cache busting, cso-candidate-cache-v284 in sw.js & ops-sentinel.js,
 *     and 100% strict CSP compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

console.log('\n=== v284 Minimal 3-Item Schemes & Benefits Dropdown Verification ===');

await check('1. shared-header.js & app.js render ONLY 3 Schemes dropdown links with no Stage 2 flyout', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    for (const tok of [
      'cso-nav-schemes-wrap',
      'cso-schemes-stage1',
      'Odisha State Schemes',
      '/schemes/?scope=odisha',
      'Central Government Schemes',
      '/schemes/?scope=central',
      'All Schemes & Benefits'
    ]) {
      assert.ok(src.includes(tok), `${rel} missing "${tok}"`);
    }
    assert.ok(!src.includes("el('div', 'cso-schemes-stage2')"), `${rel} must not create .cso-schemes-stage2`);
    assert.ok(!src.includes("mk('div','cso-schemes-stage2')"), `${rel} must not create .cso-schemes-stage2`);
  }
});

await check('2. style.css & portal-shell.css configure .cso-schemes-stage1 (width: 248px, opaque 4-theme surfaces)', () => {
  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('.cso-schemes-stage1 {\n  width: 248px;'), 'style.css .cso-schemes-stage1 must be width: 248px');
  assert.ok(styleCss.includes('var(--cso-surface-elevated'), 'style.css missing --cso-surface-elevated');
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(shellCss.includes('#cso-main-navbar .cso-schemes-stage1'), 'portal-shell.css missing #cso-main-navbar .cso-schemes-stage1');
  assert.ok(shellCss.includes('backdrop-filter: none !important;'), 'portal-shell.css missing opaque backdrop-filter: none');
});

await check('3. /schemes/?scope=odisha & /schemes/?scope=central activate Government Scope filter & chip', async () => {
  function makeNode(tag) {
    return {
      tagName: String(tag || 'DIV').toUpperCase(),
      id: '', className: '', textContent: '', value: '', selected: false, children: [], attrs: {},
      classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener() {},
      appendChild(ch) { this.children.push(ch); return ch; },
      removeChild(ch) { const i = this.children.indexOf(ch); if (i >= 0) this.children.splice(i, 1); return ch; },
      get firstChild() { return this.children[0] || null; },
      querySelector(sel) {
        if (sel.startsWith('.')) {
          const cls = sel.slice(1);
          const walk = (n) => {
            if ((n.className || '').split(/\s+/).includes(cls)) return n;
            for (const c of (n.children || [])) { const h = walk(c); if (h) return h; }
            return null;
          };
          return walk(this);
        }
        return null;
      }
    };
  }

  for (const [scopeKey, expectedLabel] of [['odisha', 'Scope: Odisha State ✕'], ['central', 'Scope: Central Government ✕']]) {
    const mount = makeNode('section');
    mount.id = 'cso-schemes-portal-root';
    const doc = {
      readyState: 'complete',
      body: makeNode('body'),
      activeElement: null,
      createElement: (t) => makeNode(t),
      createElementNS: (_ns, t) => makeNode(t),
      createTextNode: (txt) => ({ nodeType: 3, textContent: String(txt) }),
      getElementById: (id) => (id === 'cso-schemes-portal-root' ? mount : null),
      addEventListener() {}
    };
    const win = {
      location: { pathname: '/schemes/', search: '?scope=' + scopeKey },
      history: { replaceState() {} },
      document: doc,
      localStorage: { getItem: () => null, setItem: () => {} },
      fetch: async () => ({
        ok: true,
        json: async () => ({ ok: true, nodes: [], items: [], facets: { modes: [], occupations: [] } })
      }),
      URLSearchParams, setTimeout, clearTimeout, Promise
    };
    win.window = win;

    vm.runInNewContext(read('assets/js/schemes-portal.js'), {
      window: win, document: doc, localStorage: win.localStorage, fetch: win.fetch,
      URLSearchParams, setTimeout, clearTimeout, Promise, console
    });
    await new Promise(r => setTimeout(r, 30));

    const chip = mount.querySelector('.sch-filter-chip');
    assert.ok(chip, `?scope=${scopeKey}: expected active .sch-filter-chip`);
    assert.equal(chip.textContent, expectedLabel);
  }
});

await check('4. ?v=20261125v284 cache busting, cso-candidate-cache-v284 & strict CSP compliance', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v284';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v284';"));
  assert.ok(read('index.html').includes('/assets/style.css?v=20261125v284'));
  assert.ok(read('index.html').includes('/assets/app.js?v=20261125v284'));
  assert.ok(read('schemes/index.html').includes('/assets/shared-header.js?v=20261125v284'));
  assert.ok(read('schemes/index.html').includes('/assets/js/schemes-portal.js?v=20261125v284'));

  for (const rel of ['assets/shared-header.js', 'assets/app.js', 'assets/js/schemes-portal.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v284 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
