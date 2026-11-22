// Verification for v192 explorer boot in simulated DOM & zero dangling search refs
// Run: node scripts/test-explorer-boot-v192.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EXPLORERS = [
  {
    name: 'community',
    htmlPath: 'community/index.html',
    jsPath: 'community/assets/community-explorer.js',
    overviewUrl: '/api/public/community-directory/overview',
    itemsUrl: '/api/public/community-directory/items',
    countId: 'community-results-count',
    railId: 'community-rail-nav',
    domainGridId: 'community-domain-grid',
    itemsGridId: 'community-items-grid',
    topbarSearchId: 'community-topbar-search'
  },
  {
    name: 'schemes',
    htmlPath: 'schemes/index.html',
    jsPath: 'schemes/assets/schemes-explorer.js',
    overviewUrl: '/api/public/schemes-directory/overview',
    itemsUrl: '/api/public/schemes-directory/items',
    countId: 'schemes-results-count',
    railId: 'schemes-rail-nav',
    domainGridId: 'schemes-domain-grid',
    itemsGridId: 'schemes-items-grid',
    topbarSearchId: 'schemes-topbar-search'
  },
  {
    name: 'schemes-benefits',
    htmlPath: 'schemes-benefits/index.html',
    jsPath: 'schemes-benefits/assets/dashboard.js'
  },
  {
    name: 'study-library',
    htmlPath: 'study-library/index.html',
    jsPath: 'study-library/assets/dashboard.js'
  }
];

const REMOVED_IDS = ['community-search', 'schemes-search', 'scheme-q', 'study-q', 'mainSearch'];

for (const exp of EXPLORERS) {
  const html = fs.readFileSync(path.join(ROOT, exp.htmlPath), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, exp.jsPath), 'utf8');

  for (const bad of REMOVED_IDS) {
    assert.ok(!js.includes(bad), `${exp.jsPath} still contains dangling reference "${bad}"`);
  }

  // Strict CSP compliance
  assert.ok(!/<style\b/i.test(html), `No inline <style> in ${exp.htmlPath}`);
  assert.ok(!/\sstyle\s*=/i.test(html), `No style="" in ${exp.htmlPath}`);
  assert.ok(!/\sonclick\s*=/i.test(html), `No onclick= in ${exp.htmlPath}`);
  const noExt = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
  const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(!/<script\b/i.test(noJsonLd), `No executable inline <script> in ${exp.htmlPath}`);
  assert.ok(!/\.innerHTML\b/.test(js), `No .innerHTML in ${exp.jsPath}`);
}

function createMockElement(tag, id = '') {
  const attrs = new Map();
  if (id) attrs.set('id', id);
  const listeners = new Map();
  const el = {
    tagName: String(tag || 'DIV').toUpperCase(),
    id,
    className: '',
    value: '',
    hidden: false,
    textContent: '',
    children: [],
    dataset: {},
    style: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) { this._set.delete(c); return false; }
          this._set.add(c); return true;
        }
        if (force) this._set.add(c); else this._set.delete(c);
        return Boolean(force);
      },
      contains(c) { return this._set.has(c); }
    },
    get firstChild() { return this.children[0] || null; },
    appendChild(child) { this.children.push(child); return child; },
    append(...nodes) { nodes.forEach(n => this.children.push(typeof n === 'string' ? { nodeType: 3, textContent: n } : n)); },
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      return child;
    },
    setAttribute(k, v) { attrs.set(k, String(v)); if (k === 'id') this.id = String(v); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(evt) {
      const fns = listeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    scrollIntoView() {}
  };
  return el;
}

async function bootExplorerInDom(exp) {
  const js = fs.readFileSync(path.join(ROOT, exp.jsPath), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, exp.htmlPath), 'utf8');
  const byId = new Map();
  for (const m of html.matchAll(/\bid=["']([^"']+)["']/g)) {
    byId.set(m[1], createMockElement('div', m[1]));
  }
  const docListeners = new Map();
  const document = {
    title: '',
    createElement(tag) { return createMockElement(tag); },
    createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
    getElementById(id) { return byId.get(id) || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    }
  };

  const mockOverview = {
    ok: true,
    totals: { totalDomains: 10, totalFolders: 20, totalPublished: 10, totalVerified: 10 },
    domains: [
      { slug: 'local-odisha-communities', title: 'Local & Odisha Communities', summary: 'District chapters' }
    ]
  };
  const mockItems = {
    ok: true,
    total: 1,
    totalPages: 1,
    hasMore: false,
    items: [
      { id: 'item-1', slug: 'item-1', title: 'Sample Item', summary: 'Verified item', district_region: 'All Odisha' }
    ]
  };

  const sandbox = {
    window: {
      location: { origin: 'https://csodisha.com', pathname: `/${exp.name}/`, search: '', href: `https://csodisha.com/${exp.name}/` },
      history: { replaceState() {}, pushState() {} },
      matchMedia: () => ({ matches: false }),
      addEventListener() {},
      removeEventListener() {}
    },
    document,
    location: { origin: 'https://csodisha.com', pathname: `/${exp.name}/`, search: '' },
    history: { replaceState() {}, pushState() {} },
    localStorage: { getItem: () => null, setItem: () => {} },
    URLSearchParams,
    URL,
    Event: class Event { constructor(type) { this.type = type; } },
    setTimeout,
    clearTimeout,
    console,
    fetch: async (url) => {
      const s = String(url);
      if (s.includes('overview')) {
        return { ok: true, status: 200, async json() { return mockOverview; } };
      }
      if (s.includes('items')) {
        return { ok: true, status: 200, async json() { return mockItems; } };
      }
      return { ok: true, status: 200, async json() { return { ok: true, items: [], sections: [], navigation: [] }; } };
    }
  };
  sandbox.window.document = document;

  vm.runInNewContext(js, sandbox, { filename: exp.jsPath });
  const domReadyFns = docListeners.get('DOMContentLoaded') || [];
  for (const fn of domReadyFns) {
    await fn();
  }
  await new Promise(r => setTimeout(r, 20));

  if (exp.countId) {
    const countEl = byId.get(exp.countId);
    assert.ok(countEl && !countEl.textContent.includes('Loading'), `${exp.name}: ${exp.countId} stuck on Loading`);
    assert.ok(byId.get(exp.railId).children.length > 0, `${exp.name}: ${exp.railId} did not render`);
    assert.ok(byId.get(exp.domainGridId).children.length > 0, `${exp.name}: ${exp.domainGridId} did not render`);
    assert.ok(byId.get(exp.itemsGridId).children.length > 0, `${exp.name}: ${exp.itemsGridId} did not render`);
  }
}

for (const exp of EXPLORERS) {
  await bootExplorerInDom(exp);
}

console.log('PASS: All 4 explorers boot cleanly in simulated DOM with zero dangling search refs & 100% CSP compliance (v192)');
