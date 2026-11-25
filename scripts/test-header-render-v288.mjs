#!/usr/bin/env node
/**
 * v288 Runtime Header Render Smoke Test:
 * Actually executes BOTH assets/shared-header.js and assets/app.js against a DOM environment
 * and verifies ZERO uncaught exceptions while rendering:
 *  - Top Utility Row (#ctl): Language, Theme, Accessibility, Font size (A- A A+)
 *  - Primary Navigation Row (#navw): Home, Jobs ▾ (Stage 1 + Stage 2), Careers ▾ (Stage 1 + Stage 2),
 *    Schemes & Benefits ▾ (3 items, no Stage 2), Study Library ▾ (5 items, no Stage 2),
 *    Community ▾ (5 items, no Stage 2), About, and Saved (in shared-header.js).
 *  - ?v=20261125v288 cache busting, cso-candidate-cache-v288, and strict CSP compliance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

function createDomHarness(pathname = '/community/') {
  function mkNode(tag) {
    const n = {
      tagName: String(tag || 'div').toUpperCase(),
      nodeType: 1,
      className: '', id: '', textContent: '', href: '', type: '', value: '', title: '',
      dataset: {}, attrs: {}, children: [],
      classList: {
        _s: new Set(),
        add(...cs) { cs.forEach(c => c && this._s.add(c)); n.className = [...this._s].join(' '); },
        remove(...cs) { cs.forEach(c => this._s.delete(c)); n.className = [...this._s].join(' '); },
        toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); n.className = [...this._s].join(' '); return on; },
        contains(c) { return this._s.has(c); }
      },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); },
      getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; },
      hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
      removeAttribute(k) { delete this.attrs[k]; },
      appendChild(c) { if (c && typeof c === 'object') { c.parentNode = this; this.children.push(c); } return c; },
      append(...cs) { cs.forEach(c => this.appendChild(typeof c === 'string' ? { nodeType: 3, textContent: c } : c)); },
      replaceChildren(...cs) { this.children = []; this.append(...cs); },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
      insertBefore(c) { this.appendChild(c); return c; },
      after(c) { if (this.parentNode) this.parentNode.appendChild(c); },
      remove() {},
      addEventListener() {},
      closest() { return null; },
      getBoundingClientRect() { return { left: 0, right: 200, top: 0, bottom: 40, width: 200, height: 40 }; },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        const out = [];
        const stack = [...this.children];
        while (stack.length) {
          const cur = stack.shift();
          if (!cur || typeof cur !== 'object') continue;
          const hit = (sel.startsWith('#') && cur.id === sel.slice(1)) ||
            (sel.startsWith('.') && String(cur.className || '').split(/\s+/).includes(sel.slice(1))) ||
            (cur.tagName && cur.tagName.toLowerCase() === sel.toLowerCase());
          if (hit) out.push(cur);
          if (Array.isArray(cur.children)) stack.push(...cur.children);
        }
        return out;
      },
      get firstChild() { return this.children[0] || null; },
      get lastChild() { return this.children[this.children.length - 1] || null; }
    };
    return n;
  }

  const ids = {};
  for (const id of ['ctl', 'auth', 'navw', 'header-top', 'cso-main-navbar', 'csoPublicAnnouncementMount']) {
    const el = mkNode('div');
    el.id = id;
    ids[id] = el;
  }
  ids['header-top'].appendChild(ids.ctl);
  ids['header-top'].appendChild(ids.auth);
  ids['cso-main-navbar'].appendChild(ids.navw);
  const main = mkNode('main');
  const body = mkNode('body');
  body.append(ids['header-top'], ids['cso-main-navbar'], main);

  const doc = {
    readyState: 'complete',
    documentElement: mkNode('html'),
    head: mkNode('head'),
    body,
    cookie: '',
    getElementById(id) { return ids[id] || body.querySelector('#' + id); },
    createElement(tag) { return mkNode(tag); },
    createElementNS(_ns, tag) { return mkNode(tag); },
    createTextNode(t) { return { nodeType: 3, textContent: String(t) }; },
    createTreeWalker() { return { nextNode() { return null; } }; },
    querySelector(sel) {
      if (sel.startsWith('#')) return ids[sel.slice(1)] || body.querySelector(sel);
      if (sel === 'header') return ids['header-top'];
      return body.querySelector(sel);
    },
    querySelectorAll(sel) { return body.querySelectorAll(sel); },
    addEventListener() {}
  };

  const errors = [];
  const win = {
    location: { pathname, search: '', hash: '', origin: 'https://csodisha.com', href: 'https://csodisha.com' + pathname },
    innerWidth: 1440,
    matchMedia() { return { matches: false, addEventListener() {} }; },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    addEventListener() {},
    history: { replaceState() {} },
    fetch: async () => ({ ok: false, status: 404, async json() { return {}; } }),
    document: doc,
    CSS: { escape: s => s },
    navigator: { userAgent: 'node' }
  };

  const sandbox = {
    window: win, document: doc,
    localStorage: win.localStorage, sessionStorage: win.sessionStorage,
    fetch: win.fetch, URLSearchParams, URL, setTimeout, clearTimeout,
    navigator: win.navigator, location: win.location, history: win.history,
    addEventListener: win.addEventListener, matchMedia: win.matchMedia, scrollY: 0, scrollTo() {}, NodeFilter: { SHOW_TEXT: 4 },
    console: { log() {}, warn() {}, error(...args) { errors.push(args.join(' ')); } }
  };

  return { ids, sandbox, errors };
}

console.log('\n=== v288 Runtime Header Render Smoke Tests ===\n');

await check('1. assets/shared-header.js executes with ZERO errors and mounts full utility bar + all 5 dropdowns + Saved', () => {
  const { ids, sandbox, errors } = createDomHarness('/community/');
  vm.runInNewContext(read('assets/shared-header.js'), sandbox);

  assert.equal(errors.length, 0, `shared-header.js logged errors: ${errors.join('; ')}`);
  assert.ok(ids.ctl.children.length >= 4, `Expected >=4 utility controls in #ctl, got ${ids.ctl.children.length}`);
  assert.equal(ids.navw.querySelectorAll('.ni').length, 6, 'Expected 6 .ni pillar wrappers');
  assert.ok(ids.navw.querySelector('#cso-jobs-stage1'), 'Missing Jobs Stage 1');
  assert.ok(ids.navw.querySelector('#cso-jobs-stage2'), 'Missing Jobs Stage 2');
  assert.ok(ids.navw.querySelector('#cso-careers-stage1'), 'Missing Careers Stage 1');
  assert.ok(ids.navw.querySelector('#cso-careers-stage2'), 'Missing Careers Stage 2');
  assert.equal(ids.navw.querySelector('#cso-schemes-stage1').querySelectorAll('.cso-js1-item').length, 3, 'Schemes dropdown must have 3 items');
  assert.equal(ids.navw.querySelector('#cso-study-stage1').querySelectorAll('.cso-js1-item').length, 5, 'Study Library dropdown must have 5 items');
  assert.equal(ids.navw.querySelector('#cso-community-stage1').querySelectorAll('.cso-js1-item').length, 5, 'Community dropdown must have 5 items');
  assert.ok(ids.navw.querySelector('.cso-nav-saved-pill'), 'Missing Saved pill in nav');
});

await check('2. assets/app.js executes with ZERO errors and mounts full utility bar + all 5 dropdowns on homepage', () => {
  const { ids, sandbox, errors } = createDomHarness('/');
  vm.runInNewContext(read('assets/app.js'), sandbox);

  assert.equal(errors.length, 0, `app.js logged errors: ${errors.join('; ')}`);
  assert.ok(ids.ctl.children.length >= 4, `Expected >=4 utility controls in #ctl, got ${ids.ctl.children.length}`);
  assert.equal(ids.navw.querySelectorAll('.ni').length, 6, 'Expected 6 .ni pillar wrappers');
  assert.ok(ids.navw.querySelector('#cso-jobs-stage1'), 'Missing Jobs Stage 1');
  assert.ok(ids.navw.querySelector('#cso-careers-stage1'), 'Missing Careers Stage 1');
  assert.equal(ids.navw.querySelector('#cso-schemes-stage1').querySelectorAll('.cso-js1-item').length, 3, 'Schemes dropdown must have 3 items');
  assert.equal(ids.navw.querySelector('#cso-study-stage1').querySelectorAll('.cso-js1-item').length, 5, 'Study Library dropdown must have 5 items');
  assert.equal(ids.navw.querySelector('#cso-community-stage1').querySelectorAll('.cso-js1-item').length, 5, 'Community dropdown must have 5 items');
});

await check('3. ?v=20261125v288+ cache busting, cso-candidate-cache-v288+ & strict CSP compliance', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v28[8-9]';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v28[8-9]';/);
  assert.match(read('index.html'), /\/assets\/app\.js\?v=20261125v28[8-9]/);
  assert.match(read('index.html'), /\/assets\/style\.css\?v=20261125v28[8-9]/);
  assert.match(read('community/index.html'), /\/assets\/shared-header\.js\?v=20261125v28[8-9]/);
  assert.match(read('jobs/index.html'), /\/assets\/css\/portal-shell\.css\?v=20261125v28[8-9]/);

  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v288 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
