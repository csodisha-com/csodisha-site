#!/usr/bin/env node
/**
 * Two-Stage Cascading Schemes & Benefits Menu, D1 6-Category Taxonomy,
 * Admin Studio Sync & Minimal /schemes/ Explorer Verification (v283)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicSchemesBootstrapApi,
  handlePublicSchemesListApi,
  handleSchemesTaxonomyAdmin
} from '../functions/_lib/schemes-publishing-house.js';

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

const adminActor = { userId: 'u-admin-1', email: 'admin@csodisha.com', role: 'admin' };

function createMockD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS editorial_snippets (
      id TEXT PRIMARY KEY, snippet_key TEXT NOT NULL DEFAULT '', title_en TEXT NOT NULL, title_or TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'general', body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(read('migrations/0139_schemes_publishing_house.sql'));
  db.exec(read('migrations/0019_schemes_6category_taxonomy.sql'));

  const makeStmt = (sql, args = []) => ({
    bind(...a) { return makeStmt(sql, a); },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() {
      const info = db.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(info.changes) } };
    },
    _execAll() { return { results: db.prepare(sql).all(...args) }; }
  });

  return {
    raw: db,
    prepare(sql) { return makeStmt(sql); },
    async batch(stmts) { return stmts.map(s => s._execAll()); }
  };
}

console.log('\n=== v283 Two-Stage Cascading Schemes Menu, D1 6-Category Taxonomy & Minimal /schemes/ ===');

await check('1. Migration 0019 seeds 6 L1 Categories & 18 L2 Sub-Categories and bootstrap emits nav_categories', async () => {
  const db = createMockD1();
  const env = { DB: db };

  const bootRes = await handlePublicSchemesBootstrapApi(new Request('https://csodisha.com/api/public/schemes/bootstrap'), env);
  assert.equal(bootRes.status, 200);
  const boot = await bootRes.json();
  assert.equal(boot.ok, true);
  assert.equal(boot.nav_categories.length, 6, 'Expected 6 active L1 categories in nav_categories');
  const totalSubs = boot.nav_categories.reduce((acc, c) => acc + (c.subcategories || []).length, 0);
  assert.equal(totalSubs, 18, 'Expected 18 active L2 sub-categories across 6 L1 categories');

  const slugs = boot.nav_categories.map(c => c.slug);
  assert.deepEqual(slugs, [
    'odisha-state-welfare',
    'central-welfare',
    'agriculture-farmers',
    'education-scholarships',
    'women-child-social',
    'health-msme-livelihoods'
  ]);

  // Verify taxonomy creation returns X-CSO-Cache-Purged: 1
  const postRes = await handleSchemesTaxonomyAdmin(
    new Request('https://csodisha.com/api/admin/schemes/taxonomy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' },
      body: JSON.stringify({ level: 2, parent_id: 'stax_l1_odisha_welfare', title_en: 'District Welfare Grants', slug: 'district-welfare-grants' })
    }),
    env,
    adminActor,
    null,
    null
  );
  assert.equal(postRes.status, 201);
  assert.equal(postRes.headers.get('X-CSO-Cache-Purged'), '1');

  // Verify /api/public/schemes/list supports category, sub, scope, beneficiary, q
  const listRes = await handlePublicSchemesListApi(
    new Request('https://csodisha.com/api/public/schemes/list?category=odisha-state-welfare&scope=odisha&beneficiary=women'),
    env
  );
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.ok, true);
});

await check('2. Admin Studio #schemesSidebarSubnav & Live-Sync Banner wired in admin.js & schemes-publishing-studio.js', () => {
  const adminJs = read('admin/admin.js');
  for (const tok of ['schemesSidebarSubnav', 'DEFAULT_SCHEMES_CATEGORIES', 'Public Schemes ▾ Menu Categories', 'setSchemesCategoryNodes']) {
    assert.ok(adminJs.includes(tok), `admin/admin.js missing "${tok}"`);
  }
  const sphJs = read('admin/schemes-publishing-studio.js');
  for (const tok of ['Live Synced to Public Schemes ▾ Menu', 'cso_schemes_flyout_v283', 'Government Scope', 'Beneficiary Group', 'Implementing Department / Ministry']) {
    assert.ok(sphJs.includes(tok), `admin/schemes-publishing-studio.js missing "${tok}"`);
  }
});

await check('3. Schemes Menu in shared-header.js, app.js, style.css & portal-shell.css', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    for (const tok of ['cso-nav-schemes-wrap', 'cso-schemes-stage1', '/schemes/?scope=odisha', '/schemes/?scope=central']) {
      assert.ok(src.includes(tok), `${rel} missing "${tok}"`);
    }
  }
  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('.cso-schemes-stage1'), 'style.css missing .cso-schemes-stage1');
  assert.ok(styleCss.includes('width: 248px;'), 'style.css missing Stage 1 width: 248px');
  const shellCss = read('assets/css/portal-shell.css');
  assert.ok(shellCss.includes('#cso-main-navbar .cso-schemes-stage1'), 'portal-shell.css missing .cso-schemes-stage1');
});

await check('4. Minimal /schemes/ Explorer renders compact hero, L1 pill strip, 1-row filter & flex empty state', async () => {
  const html = read('schemes/index.html');
  assert.ok(html.includes('sch-hero--compact'), 'schemes/index.html missing sch-hero--compact');
  assert.ok(!html.includes('sp-hero-kpis'), 'schemes/index.html must not contain 4-box .sp-hero-kpis');
  assert.match(html, /\/assets\/css\/schemes-portal\.css\?v=20261125v2(?:8[3-9]|9\d)/);
  assert.match(html, /\/assets\/js\/schemes-portal\.js\?v=20261125v2(?:8[3-9]|9\d)/);

  const css = read('assets/css/schemes-portal.css');
  for (const tok of ['.sch-hero--compact', '.sch-cat-strip', '.sch-filter-row', 'flex-direction: column']) {
    assert.ok(css.includes(tok), `schemes-portal.css missing "${tok}"`);
  }

  function makeNode(tag) {
    return {
      tagName: String(tag || 'DIV').toUpperCase(),
      id: '', className: '', textContent: '', children: [], attrs: {},
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
    location: { pathname: '/schemes/', search: '?category=odisha-state-welfare&scope=odisha' },
    history: { replaceState() {} },
    document: doc,
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        nodes: [
          { id: 'stax_l1_odisha_welfare', level: 1, slug: 'odisha-state-welfare', title_en: 'Odisha State Welfare', icon: '🏛️', published_schemes_count: 0 },
          { id: 'stax_l2_food', level: 2, parent_id: 'stax_l1_odisha_welfare', slug: 'food-security-ration', title_en: 'Food Security & Ration', published_schemes_count: 0 }
        ],
        items: [],
        facets: { modes: [], occupations: [] }
      })
    }),
    URLSearchParams, setTimeout, clearTimeout, Promise
  };
  win.window = win;

  vm.runInNewContext(read('assets/js/schemes-portal.js'), {
    window: win, document: doc, localStorage: win.localStorage, fetch: win.fetch,
    URLSearchParams, setTimeout, clearTimeout, Promise, console
  });
  await new Promise(r => setTimeout(r, 30));

  const portal = mount.querySelector('.sp-portal');
  assert.ok(portal, 'Expected .sp-portal');
  assert.ok(portal.querySelector('.sch-hero--compact'), 'Expected .sch-hero--compact');
  assert.equal(portal.querySelector('.sp-hero-kpis'), null, '4-box KPI strip must be removed');
  assert.ok(portal.querySelector('.sch-cat-strip'), 'Expected L1 category pill strip');
  assert.ok(portal.querySelector('.sch-filter-row'), 'Expected 1-row filter bar');
  assert.ok(portal.querySelector('.sch-active-chips'), 'Expected active filter chips for deep-link');
  assert.ok(portal.querySelector('.sp-empty-card'), 'Expected centered flex empty state');
});

await check('5. sw.js & ops-sentinel.js bumped to cso-candidate-cache-v283+ + strict CSP compliance', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:8[3-9]|9\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:8[3-9]|9\d)';/.test(read('functions/_lib/ops-sentinel.js')));
  for (const rel of [
    'assets/shared-header.js',
    'assets/app.js',
    'assets/js/schemes-portal.js',
    'admin/admin.js',
    'admin/schemes-publishing-studio.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v283 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
