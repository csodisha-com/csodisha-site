#!/usr/bin/env node
/**
 * v289 Verification Suite:
 * 1. Pure-CSS desktop (:hover, :focus-within, .is-open) + ::after hover bridge rules
 *    for Study Library ▾ and Community ▾ in assets/style.css & assets/css/portal-shell.css.
 * 2. Runtime JS mouseenter / mouseleave hover-intent tests on BOTH assets/shared-header.js
 *    and assets/app.js proving immediate open on hover, sibling dropdown closing, and
 *    150ms grace timer cancellation when entering .cso-study-stage1 / .cso-community-stage1.
 * 3. ?v=20261125v289 cache busting, cso-candidate-cache-v289 & strict CSP compliance.
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

function createInteractiveDom(pathname = '/community/') {
  function mkNode(tag) {
    const listeners = new Map();
    const n = {
      tagName: String(tag || 'div').toUpperCase(),
      nodeType: 1,
      _cls: new Set(),
      get className() { return [...this._cls].join(' '); },
      set className(v) { this._cls = new Set(String(v || '').split(/\s+/).filter(Boolean)); },
      id: '', textContent: '', href: '', type: '', value: '', title: '',
      dataset: {}, attrs: {}, children: [],
      classList: {
        add(...cs) { cs.forEach(c => c && n._cls.add(c)); },
        remove(...cs) { cs.forEach(c => n._cls.delete(c)); },
        toggle(c, f) { const on = f === undefined ? !n._cls.has(c) : !!f; on ? n._cls.add(c) : n._cls.delete(c); return on; },
        contains(c) { return n._cls.has(c); }
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
      addEventListener(ev, fn) {
        if (!listeners.has(ev)) listeners.set(ev, []);
        listeners.get(ev).push(fn);
      },
      dispatch(ev) {
        (listeners.get(ev) || []).forEach(fn => fn({ type: ev, target: n, preventDefault() {}, stopPropagation() {} }));
      },
      contains(target) {
        if (target === n) return true;
        return this.children.some(c => c && typeof c.contains === 'function' && c.contains(target));
      },
      closest() { return null; },
      getBoundingClientRect() { return { left: 0, right: 200, top: 0, bottom: 40, width: 200, height: 40 }; },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        const parts = sel.split(',').map(s => s.trim());
        const out = [];
        const stack = [...this.children];
        while (stack.length) {
          const cur = stack.shift();
          if (!cur || typeof cur !== 'object') continue;
          const hit = parts.some(p => {
            const last = p.split(/\s+/).pop();
            if (last.startsWith('#')) return cur.id === last.slice(1);
            if (last.startsWith('.')) {
              const clsList = String(cur.className || '').split(/\s+/);
              return last.slice(1).split('.').every(c => clsList.includes(c));
            }
            return cur.tagName && cur.tagName.toLowerCase() === last.toLowerCase();
          });
          if (hit) out.push(cur);
          if (Array.isArray(cur.children)) stack.push(...cur.children);
        }
        return out;
      },
      get firstChild() { return this.children[0] || null; },
      get lastChild() { return this.children[this.children.length - 1] || null; }
    };
    Object.defineProperty(n, '_initClass', {
      set(v) { n.classList._s = new Set(String(v || '').split(/\s+/).filter(Boolean)); n.className = [...n.classList._s].join(' '); }
    });
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
  const body = mkNode('body');
  body.append(ids['header-top'], ids['cso-main-navbar'], mkNode('main'));

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
      if (sel.startsWith('#') && !sel.includes(' ')) return ids[sel.slice(1)] || body.querySelector(sel);
      if (sel === 'header') return ids['header-top'];
      return body.querySelector(sel);
    },
    querySelectorAll(sel) { return body.querySelectorAll(sel); },
    addEventListener() {}
  };

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
    addEventListener: win.addEventListener, matchMedia: win.matchMedia,
    scrollY: 0, scrollTo() {}, NodeFilter: { SHOW_TEXT: 4 },
    console: { log() {}, warn() {}, error(...a) { console.error('[VM]', ...a); } }
  };

  return { ids, sandbox };
}

console.log('\n=== v289 Study Library ▾ & Community ▾ Desktop Hover Auto-Open Tests ===\n');

await check('1. style.css & portal-shell.css define desktop :hover, :focus-within, .is-open & ::after hover bridge', () => {
  const css = read('assets/style.css');
  const shell = read('assets/css/portal-shell.css');
  for (const [name, src] of [['style.css', css], ['portal-shell.css', shell]]) {
    assert.ok(src.includes('.cso-nav-study-wrap:hover > .cso-study-stage1'), `${name} missing study :hover rule`);
    assert.ok(src.includes('.cso-nav-study-wrap:focus-within > .cso-study-stage1'), `${name} missing study :focus-within rule`);
    assert.ok(src.includes('.cso-nav-study-wrap.is-open > .cso-study-stage1'), `${name} missing study .is-open rule`);
    assert.ok(src.includes('.cso-nav-community-wrap:hover > .cso-community-stage1'), `${name} missing community :hover rule`);
    assert.ok(src.includes('.cso-nav-community-wrap:focus-within > .cso-community-stage1'), `${name} missing community :focus-within rule`);
    assert.ok(src.includes('.cso-nav-community-wrap.is-open > .cso-community-stage1'), `${name} missing community .is-open rule`);
    assert.ok(src.includes('.cso-nav-study-wrap::after'), `${name} missing study ::after hover bridge`);
    assert.ok(src.includes('.cso-nav-community-wrap::after'), `${name} missing community ::after hover bridge`);
  }
});

for (const [idx, rel, pathname] of [[2, 'assets/shared-header.js', '/community/'], [3, 'assets/app.js', '/']]) {
  await check(`${idx}. ${rel}: mouseenter auto-opens Study Library ▾ & Community ▾, closes sibling, and cancels timer on stage1 enter`, async () => {
    const { ids, sandbox } = createInteractiveDom(pathname);
    vm.runInNewContext(read(rel), sandbox);

    const studyWrap = ids.navw.querySelector('.cso-nav-study-wrap');
    const studyStage1 = ids.navw.querySelector('.cso-study-stage1');
    const commWrap = ids.navw.querySelector('.cso-nav-community-wrap');
    const commStage1 = ids.navw.querySelector('.cso-community-stage1');
    assert.ok(studyWrap && studyStage1, `${rel}: missing Study Library wrap/stage1`);
    assert.ok(commWrap && commStage1, `${rel}: missing Community wrap/stage1`);

    // Hover Study Library ▾ -> immediately opens
    studyWrap.dispatch('mouseenter');
    assert.ok(studyWrap.classList.contains('is-open'), `${rel}: Study Library must gain .is-open on mouseenter`);
    assert.ok(studyWrap.classList.contains('cso-open'), `${rel}: Study Library must gain .cso-open on mouseenter`);
    assert.equal(studyWrap.querySelector('a').getAttribute('aria-expanded'), 'true');

    // Leave trigger then quickly enter .cso-study-stage1 -> stays open past 150ms
    studyWrap.dispatch('mouseleave');
    studyStage1.dispatch('mouseenter');
    await new Promise(r => setTimeout(r, 180));
    assert.ok(studyWrap.classList.contains('is-open'), `${rel}: Study Library must stay open when cursor enters .cso-study-stage1`);

    // Hover Community ▾ -> immediately opens Community AND closes Study Library
    commWrap.dispatch('mouseenter');
    assert.ok(commWrap.classList.contains('is-open'), `${rel}: Community must gain .is-open on mouseenter`);
    assert.equal(commWrap.querySelector('a').getAttribute('aria-expanded'), 'true');
    assert.ok(!studyWrap.classList.contains('is-open'), `${rel}: Study Library must close when hovering Community`);

    // Leave Community -> closes after 150ms grace timer
    commWrap.dispatch('mouseleave');
    await new Promise(r => setTimeout(r, 190));
    assert.ok(!commWrap.classList.contains('is-open'), `${rel}: Community must close after 150ms mouseleave`);
    assert.equal(commWrap.querySelector('a').getAttribute('aria-expanded'), 'false');
  });
}

await check('4. ?v=20261125v289+ cache busting, cso-candidate-cache-v289+ & strict CSP compliance', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v2(?:89|9\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:89|9\d)';/);
  assert.match(read('index.html'), /\/assets\/app\.js\?v=20261125v2(?:89|9\d)/);
  assert.match(read('index.html'), /\/assets\/style\.css\?v=20261125v2(?:89|9\d)/);
  assert.match(read('community/index.html'), /\/assets\/shared-header\.js\?v=20261125v2(?:89|9\d)/);
  assert.match(read('study-library/index.html'), /\/assets\/css\/portal-shell\.css\?v=20261125v2(?:89|9\d)/);

  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v289 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
