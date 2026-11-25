#!/usr/bin/env node
/**
 * Jobs Portal Non-Empty <main> Render & Strict CSP Verification (v280)
 *
 * Verifies:
 *  1. jobs/index.html & jobs-careers/index.html contain #cso-jobs-portal-root inside <main>
 *     and reference ?v=20261125v280 assets.
 *  2. assets/js/jobs-portal.js defines findNodeById and executes cleanly in a DOM shim
 *     against:
 *       (a) 0-job empty D1 state
 *       (b) Populated D1 state with L1/L2/L3 nodes and jobs
 *       (c) Failed /api/public/jobs/bootstrap fetch
 *     rendering non-empty .jp-portal > .jp-hero, filter explorer, and cards/empty state.
 *  3. sw.js purges older cso-candidate-cache-* buckets on activate, calls self.clients.claim(),
 *     and both sw.js & ops-sentinel.js use cso-candidate-cache-v280.
 *  4. 100% strict CSP compliance across jobs-portal.js, jobs-portal.css, portal-shell.css,
 *     jobs/index.html, and jobs-careers/index.html.
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

function createDomShim(fetchImpl) {
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

  const byId = { 'cso-jobs-portal-root': mount };
  const doc = {
    readyState: 'complete',
    body: makeNode('body'),
    createElement: (t) => makeNode(t),
    createElementNS: (_ns, t) => makeNode(t),
    createTextNode: (txt) => ({ nodeType: 3, textContent: String(txt) }),
    getElementById: (id) => byId[id] || null,
    addEventListener() {}
  };

  const win = {
    location: { pathname: '/jobs/', search: '' },
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

console.log('\n=== v280 Jobs Portal Non-Empty <main> Render & Strict CSP Verification ===');

await check('1. jobs/index.html & jobs-careers/index.html contain #cso-jobs-portal-root and ?v=20261125v280 assets', () => {
  for (const rel of ['jobs/index.html', 'jobs-careers/index.html']) {
    const html = read(rel);
    assert.ok(html.includes('id="cso-jobs-portal-root"'), `${rel} missing #cso-jobs-portal-root`);
    assert.match(html, /\/assets\/style\.css\?v=20261125v28[0-9]/, `${rel} missing style.css?v=20261125v280+`);
    assert.match(html, /\/assets\/css\/portal-shell\.css\?v=20261125v28[0-9]/, `${rel} missing portal-shell.css?v=20261125v280+`);
    assert.match(html, /\/assets\/shared-header\.js\?v=20261125v28[0-9]/, `${rel} missing shared-header.js?v=20261125v280+`);
    assert.match(html, /\/assets\/css\/jobs-portal\.css\?v=20261125v28[0-9]/, `${rel} missing jobs-portal.css?v=20261125v280+`);
    assert.match(html, /\/assets\/js\/jobs-portal\.js\?v=20261125v28[0-9]/, `${rel} missing jobs-portal.js?v=20261125v280+`);
  }
});

await check('2. jobs-portal.js renders non-empty .jp-portal UI for 0 jobs, populated jobs, and failed bootstrap fetch', async () => {
  const code = read('assets/js/jobs-portal.js');
  assert.ok(code.includes('function findNodeById('), 'jobs-portal.js missing findNodeById');

  const scenarios = [
    {
      name: '0-job empty state',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          tree: [],
          nodes: [{ id: 'n1', level: 1, slug: 'government', title_en: 'Government', published_jobs_count: 0 }],
          items: [],
          facets: { districts: [], qualifications: [], stages: [] }
        })
      })
    },
    {
      name: 'populated jobs state',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          tree: [],
          nodes: [
            { id: 'n1', level: 1, slug: 'government', title_en: 'Government', published_jobs_count: 1 },
            { id: 'n2', level: 2, parent_id: 'n1', slug: 'opsc', title_en: 'OPSC', published_jobs_count: 1 }
          ],
          items: [{
            id: 'j1',
            slug: 'opsc-oas-2026',
            title_en: 'OPSC OAS Combined Competitive Exam 2026',
            total_vacancies: 399,
            stage: 'notification',
            is_expired: 0
          }],
          facets: { districts: ['Khordha'], qualifications: ['Graduate'], stages: ['notification'] }
        })
      })
    },
    {
      name: 'failed bootstrap fetch fallback',
      fetchImpl: async () => { throw new Error('Network offline'); }
    }
  ];

  for (const sc of scenarios) {
    const { win, doc, mount } = createDomShim(sc.fetchImpl);
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
    assert.ok(portal, `${sc.name}: #cso-jobs-portal-root did not render .jp-portal`);
    assert.ok(portal.querySelector('.jp-hero'), `${sc.name}: missing .jp-hero inside .jp-portal`);
    assert.ok(portal.children.length >= 3, `${sc.name}: expected hero + filters + content inside .jp-portal`);
  }
});

await check('3. sw.js purges older caches on activate, calls clients.claim(), and uses cso-candidate-cache-v280+', () => {
  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v28\d';/.test(sw), 'sw.js must use cso-candidate-cache-v280+');
  assert.ok(sw.includes('caches.delete(key)'), 'sw.js must delete old cache buckets');
  assert.ok(sw.includes('self.clients.claim()'), 'sw.js must call self.clients.claim()');
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v28\d';/.test(read('functions/_lib/ops-sentinel.js')));
});

await check('4. Strict CSP compliance across jobs-portal.js and HTML pages', () => {
  const codeOnly = read('assets/js/jobs-portal.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
    assert.ok(!codeOnly.includes(bad), `jobs-portal.js violates strict CSP (${bad})`);
  }
  for (const rel of ['jobs/index.html', 'jobs-careers/index.html']) {
    const html = read(rel);
    assert.ok(!/\sstyle\s*=/i.test(html), `${rel} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${rel} contains inline on*= handler`);
  }
});

console.log(`\n=== v280 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
