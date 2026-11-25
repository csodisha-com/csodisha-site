#!/usr/bin/env node
/**
 * Clean, Minimal Careers Explorer & Empty-State Verification (v282)
 *
 * Verifies:
 *  1. Compact Hero Header (Odisha & National Career Roadmaps, 1-line subtitle,
 *     English / ଓଡ଼ିଆ toggle, NO 4-box .crp-hero-kpis grid) in careers/index.html & JS.
 *  2. Streamlined Single-Card Filter Bar: .crp-track-strip pill strip + single-row .crp-filter-row
 *     (Search, Sub-Track, Region/Scope, Career Stage, conditional Reset) + NO .crp-domains-grid.
 *  3. Deep-link URL hydration (?track=, ?subtrack=, ?region=, ?stage=, ?q=) & .crp-filter-chip.
 *  4. Empty-state flex column layout (.crp-empty { display: flex; flex-direction: column; })
 *     preventing overlap behind compass icon.
 *  5. ?v=20261125v282 cache busting, cso-candidate-cache-v282, and 100% strict CSP compliance.
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
      dataset: {},
      classList: {
        _set: new Set(),
        add(...cls) { cls.forEach(c => this._set.add(c)); },
        remove(...cls) { cls.forEach(c => this._set.delete(c)); },
        contains(c) { return this._set.has(c); }
      },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener() {},
      append(...items) {
        for (const it of items) {
          if (it) this.children.push(typeof it === 'string' ? { nodeType: 3, textContent: it } : it);
        }
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      replaceChildren(...items) {
        this.children = [];
        this.append(...items);
      },
      get firstChild() { return this.children[0] || null; },
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
  mount.id = 'cso-careers-portal-root';
  mount.appendChild(makeNode('div'));

  const doc = {
    readyState: 'complete',
    body: makeNode('body'),
    activeElement: null,
    createElement: (t) => makeNode(t),
    createTextNode: (txt) => ({ nodeType: 3, textContent: String(txt) }),
    getElementById: (id) => (id === 'cso-careers-portal-root' ? mount : null),
    addEventListener() {}
  };

  function Option(text, value) {
    const o = makeNode('option');
    o.textContent = text;
    o.value = value;
    return o;
  }

  const win = {
    location: { pathname: '/careers/', search: searchStr || '' },
    history: { replaceState() {} },
    document: doc,
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: fetchImpl,
    URLSearchParams,
    Option,
    setTimeout,
    clearTimeout,
    Promise
  };
  win.window = win;
  return { win, doc, mount, Option };
}

console.log('\n=== v282 Clean, Minimal Careers Explorer & Empty-State Verification ===');

await check('1. Compact Hero (no 4-box KPI grid), track strip, single-row filter & flex empty state in HTML + CSS', () => {
  const html = read('careers/index.html');
  assert.ok(html.includes('Odisha &amp; National Career Roadmaps'), 'careers/index.html missing compact hero title');
  assert.ok(!html.includes('crp-hero-kpis'), 'careers/index.html must not contain 4-box .crp-hero-kpis grid');
  assert.ok(html.includes('/assets/css/careers-portal.css?v=20261125v282'), 'careers/index.html missing careers-portal.css?v=20261125v282');
  assert.ok(html.includes('/assets/js/careers-portal.js?v=20261125v282'), 'careers/index.html missing careers-portal.js?v=20261125v282');

  const css = read('assets/css/careers-portal.css');
  for (const tok of ['.crp-hero--compact', '.crp-track-strip', '.crp-track-pill', '.crp-filter-row', 'flex-direction: column']) {
    assert.ok(css.includes(tok), `careers-portal.css missing "${tok}"`);
  }
});

await check('2. Minimal render (no .crp-hero-kpis, no .crp-domains-grid, .crp-track-strip, .crp-filter-row, clean .crp-empty)', async () => {
  const code = read('assets/js/careers-portal.js');
  const { win, doc, mount, Option } = createDomShim('', async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      taxonomy: {
        tracks: [
          { id: 't1', slug: 'civil-services', label_en: 'Civil Services', label_or: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍' },
          { id: 't2', slug: 'engineering-it', label_en: 'Engineering / IT', label_or: 'ଇଞ୍ଜିନିୟରିଂ / ଆଇଟି' }
        ],
        subtracks: [
          { id: 's1', parent_id: 't1', slug: 'opsc-oas', label_en: 'OPSC OAS', label_or: 'OPSC OAS' }
        ],
        regions: [{ slug: 'odisha', label_en: 'Odisha' }, { slug: 'central', label_en: 'Central' }],
        stages: [{ slug: 'graduate', label_en: 'Graduate' }]
      },
      stats: { total_published: 0, track_counts: { 'civil-services': 0, 'engineering-it': 0 } },
      latest: []
    })
  }));
  vm.runInNewContext(code, {
    window: win,
    document: doc,
    localStorage: win.localStorage,
    fetch: win.fetch,
    URLSearchParams,
    Option,
    setTimeout,
    clearTimeout,
    Promise,
    console
  });
  await new Promise(r => setTimeout(r, 30));

  const portal = mount.querySelector('.crp-portal');
  assert.ok(portal, 'Expected .crp-portal');
  assert.ok(portal.querySelector('.crp-hero--compact'), 'Expected compact hero');
  assert.equal(portal.querySelector('.crp-hero-kpis'), null, '4-box KPI grid must be removed');
  assert.equal(portal.querySelector('.crp-domains-grid'), null, '6 oversized domain cards must be removed');
  assert.ok(portal.querySelector('.crp-track-strip'), 'Expected compact Career Track Pill Strip');
  assert.ok(portal.querySelector('.crp-filter-row'), 'Expected single clean filter row');
  const empty = portal.querySelector('.crp-empty');
  assert.ok(empty, 'Expected .crp-empty');
  const emptyTitle = empty.querySelector('.crp-empty-title');
  assert.ok(emptyTitle && emptyTitle.textContent === 'No career roadmaps match this filter yet');
});

await check('3. Deep-link ?track=civil-services&subtrack=opsc-oas renders Reset button & active filter chips', async () => {
  const code = read('assets/js/careers-portal.js');
  const { win, doc, mount, Option } = createDomShim('?track=civil-services&subtrack=opsc-oas', async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      taxonomy: {
        tracks: [{ id: 't1', slug: 'civil-services', label_en: 'Civil Services' }],
        subtracks: [{ id: 's1', parent_id: 't1', slug: 'opsc-oas', label_en: 'OPSC OAS' }],
        regions: [{ slug: 'odisha', label_en: 'Odisha' }],
        stages: [{ slug: 'graduate', label_en: 'Graduate' }]
      },
      stats: { total_published: 0, track_counts: {} },
      items: []
    })
  }));
  vm.runInNewContext(code, {
    window: win,
    document: doc,
    localStorage: win.localStorage,
    fetch: win.fetch,
    URLSearchParams,
    Option,
    setTimeout,
    clearTimeout,
    Promise,
    console
  });
  await new Promise(r => setTimeout(r, 30));

  const portal = mount.querySelector('.crp-portal');
  assert.ok(portal.querySelector('.crp-reset-btn'), 'Expected conditional Reset button when filters active');
  assert.ok(portal.querySelector('.crp-active-chips'), 'Expected dismissible active filter chips');
  assert.ok(portal.querySelector('.crp-filter-chip'), 'Expected .crp-filter-chip');
});

await check('4. sw.js & ops-sentinel.js bumped to cso-candidate-cache-v282+ + strict CSP', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v28[2-9]';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v28[2-9]';/.test(read('functions/_lib/ops-sentinel.js')));
  const codeOnly = read('assets/js/careers-portal.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
    assert.ok(!codeOnly.includes(bad), `careers-portal.js violates strict CSP (${bad})`);
  }
  const html = read('careers/index.html');
  assert.ok(!/\sstyle\s*=/i.test(html), 'careers/index.html contains inline style=');
  assert.ok(!/\son[a-z]+\s*=/i.test(html), 'careers/index.html contains inline on*= handler');
});

console.log(`\n=== v282 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
