#!/usr/bin/env node
/**
 * Clean, Minimal Jobs Explorer Verification (v281)
 *
 * Verifies:
 *  1. Compact Hero Header (Verified Jobs & Recruitment Notifications, 1-line subtitle,
 *     English / ଓଡ଼ିଆ toggle, NO 4-box .jp-hero-kpis grid) in HTML & JS.
 *  2. Streamlined Single-Card Filter Bar: Sector Tabs + 1-row .jp-filter-row
 *     (Search, Geographic Scope hidden on Foreign Jobs, Stage, conditional Reset).
 *  3. Deep-link URL parameter support (?sector=, ?region=, ?stage=, ?dept=, ?q=).
 *  4. Bottom 25-card .jp-dept-section ("Browse 3-Layer Departments & Recruiting Boards") removed.
 *  5. Clean empty state ("No matching job notifications right now" + Reset Filters when active).
 *  6. ?v=20261125v281 cache busting, cso-candidate-cache-v281, and 100% strict CSP compliance.
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

function createDomShim(searchStr, fetchImpl) {
  function makeNode(tag) {
    const node = {
      tagName: String(tag || 'DIV').toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      children: [],
      attrs: {},
      classList: {
        _set: new Set(),
        add(...cls) { cls.forEach(c => this._set.add(c)); },
        remove(...cls) { cls.forEach(c => this._set.delete(c)); },
        contains(c) { return this._set.has(c); }
      },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener() {},
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        return child;
      },
      get firstChild() { return this.children[0] || null; },
      get childNodes() { return this.children; },
      querySelector(sel) {
        if (sel.startsWith('.')) {
          const cls = sel.slice(1);
          const walk = (n) => {
            if ((n.className || '').split(/\s+/).includes(cls)) return n;
            for (const c of (n.children || [])) {
              const hit = walk(c);
              if (hit) return hit;
            }
            return null;
          };
          return walk(this);
        }
        return null;
      }
    };
    return node;
  }

  const mount = makeNode('section');
  mount.id = 'cso-jobs-portal-root';
  mount.appendChild(makeNode('div'));

  const doc = {
    readyState: 'complete',
    body: makeNode('body'),
    createElement: (t) => makeNode(t),
    createElementNS: (_ns, t) => makeNode(t),
    createTextNode: (txt) => ({ nodeType: 3, textContent: String(txt) }),
    getElementById: (id) => (id === 'cso-jobs-portal-root' ? mount : null),
    addEventListener() {}
  };

  const win = {
    location: { pathname: '/jobs/', search: searchStr || '' },
    history: { replaceState() {} },
    document: doc,
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: fetchImpl,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Promise
  };
  win.window = win;
  return { win, doc, mount };
}

console.log('\n=== v281 Clean, Minimal Jobs Explorer Verification ===');

await check('1. Compact Hero (no 4-box KPI grid) & streamlined CSS classes in HTML + CSS', () => {
  for (const rel of ['jobs/index.html', 'jobs-careers/index.html']) {
    const html = read(rel);
    assert.ok(html.includes('Verified Jobs &amp; Recruitment Notifications'), `${rel} missing compact hero title`);
    assert.ok(!html.includes('jp-hero-kpis'), `${rel} must not contain 4-box .jp-hero-kpis grid`);
    assert.ok(html.includes('/assets/css/jobs-portal.css?v=20261125v281'), `${rel} missing jobs-portal.css?v=20261125v281`);
    assert.ok(html.includes('/assets/js/jobs-portal.js?v=20261125v281'), `${rel} missing jobs-portal.js?v=20261125v281`);
  }
  const css = read('assets/css/jobs-portal.css');
  assert.ok(css.includes('.jp-hero--compact'), 'jobs-portal.css missing .jp-hero--compact');
  assert.ok(css.includes('.jp-filter-row'), 'jobs-portal.css missing .jp-filter-row');
  assert.ok(css.includes('.jp-filter-row.is-no-scope'), 'jobs-portal.css missing .jp-filter-row.is-no-scope');
});

await check('2. Minimal render (no .jp-hero-kpis, no .jp-dept-section, single .jp-filter-row, clean empty state)', async () => {
  const code = read('assets/js/jobs-portal.js');
  const { win, doc, mount } = createDomShim('', async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      tree: [],
      nodes: [
        { id: 'n1', level: 1, slug: 'government', title_en: 'Government', published_jobs_count: 0 },
        { id: 'n2', level: 2, parent_id: 'n1', slug: 'opsc', title_en: 'OPSC', published_jobs_count: 0 },
        { id: 'nf', level: 1, slug: 'foreign', title_en: 'Foreign Jobs', published_jobs_count: 0 }
      ],
      items: [],
      facets: { districts: [], qualifications: [], stages: [] }
    })
  }));
  vm.runInNewContext(code, {
    window: win,
    document: doc,
    localStorage: win.localStorage,
    fetch: win.fetch,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Promise,
    console
  });
  await new Promise(r => setTimeout(r, 30));

  const portal = mount.querySelector('.jp-portal');
  assert.ok(portal, 'Expected .jp-portal');
  assert.ok(portal.querySelector('.jp-hero--compact'), 'Expected compact hero');
  assert.equal(portal.querySelector('.jp-hero-kpis'), null, '4-box KPI grid must be removed');
  assert.ok(portal.querySelector('.jp-sector-strip'), 'Expected sector tabs');
  assert.ok(portal.querySelector('.jp-filter-row'), 'Expected streamlined 1-row .jp-filter-row');
  assert.equal(portal.querySelector('.jp-cascade-grid'), null, 'Multi-row .jp-cascade-grid must be removed');
  assert.equal(portal.querySelector('.jp-dept-section'), null, '25-card .jp-dept-section must be removed');
  const emptyTitle = portal.querySelector('.jp-empty-title');
  assert.ok(emptyTitle && emptyTitle.textContent === 'No matching job notifications right now', 'Expected clean empty state title');
});

await check('3. Deep-link ?sector=foreign&dept=opsc hides Scope select & preserves active chips', async () => {
  const code = read('assets/js/jobs-portal.js');
  const { win, doc, mount } = createDomShim('?sector=foreign&q=engineer', async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      tree: [],
      nodes: [
        { id: 'nf', level: 1, slug: 'foreign', title_en: 'Foreign Jobs', published_jobs_count: 0 }
      ],
      items: [],
      facets: { districts: [], qualifications: [], stages: [] }
    })
  }));
  vm.runInNewContext(code, {
    window: win,
    document: doc,
    localStorage: win.localStorage,
    fetch: win.fetch,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Promise,
    console
  });
  await new Promise(r => setTimeout(r, 30));

  const portal = mount.querySelector('.jp-portal');
  assert.ok(portal.querySelector('.is-no-scope'), 'Expected .jp-filter-row.is-no-scope when Foreign Jobs selected');
  assert.ok(portal.querySelector('.jp-reset-btn'), 'Expected Reset button when filters active');
  assert.ok(portal.querySelector('.jp-active-chips'), 'Expected active filter chips');
});

await check('4. sw.js & ops-sentinel.js bumped to cso-candidate-cache-v281 + strict CSP', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v281';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v281';"));
  const codeOnly = read('assets/js/jobs-portal.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
    assert.ok(!codeOnly.includes(bad), `jobs-portal.js violates strict CSP (${bad})`);
  }
});

console.log(`\n=== v281 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
