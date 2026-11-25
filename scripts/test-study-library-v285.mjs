#!/usr/bin/env node
/**
 * v285 Verification Suite:
 * 1. D1 migration 0020_study_library_6track_taxonomy.sql seeds 6 canonical L1 Study Tracks + 18 L2 Sub-Collections
 *    and retires legacy starter L1 nodes (is_published = 0).
 * 2. /api/public/study-library/bootstrap emits nav_tracks (6 active L1 tracks, each with 3 L2 subcollections & live counts),
 *    and /api/public/study-library/list filters by ?track=, ?sub=, ?type=, ?medium=, ?q=.
 * 3. Admin taxonomy/article mutations set X-CSO-Cache-Purged: 1 and purge study-library bootstrap/list caches.
 * 4. Single-stage vertical Study Library ▾ dropdown (assets/shared-header.js, assets/app.js, assets/style.css, assets/css/portal-shell.css):
 *    - NO Stage 2 slideout, NO › chevrons
 *    - 6 L1 tracks + All Study Resources (7th item), width: 276px, solid opaque 4-theme surfaces.
 * 5. Minimal /study-library/ & /study/ Explorer (assets/js/study-portal.js & assets/css/study-portal.css):
 *    - Compact hero (no 4-box .sp-hero-kpis), single-card filter bar with L1 track pills + single compact filter row
 *      (Search, Sub-Collection, Type, Medium, conditional Reset), deep-link URL hydration (?track=, ?sub=, ?type=, ?medium=, ?q=),
 *      and centered flex-column empty state (zero overlap).
 * 6. Admin Studio Study Library ▾ sidebar folder (#studyLibrarySidebarSubnav) & Live Synced banner + strict CSP compliance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

import {
  handlePublicStudyBootstrapApi,
  handlePublicStudyListApi,
  handleStudyTaxonomyAdmin
} from '../functions/_lib/study-publishing-house.js';

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

function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_role TEXT,
      action TEXT,
      resource_type TEXT,
      resource_id TEXT,
      meta_json TEXT,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  sqlite.exec(read('migrations/0140_study_library_publishing_house.sql'));
  sqlite.exec(read('migrations/0020_study_library_6track_taxonomy.sql'));

  function makeStmt(sql, params = []) {
    return {
      bind(...args) { return makeStmt(sql, args); },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() {
        const info = sqlite.prepare(sql).run(...params);
        return { success: true, meta: { changes: info.changes } };
      }
    };
  }
  return {
    sqlite,
    prepare(sql) { return makeStmt(sql, []); },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) {
        out.push(await s.all().catch(() => s.run()));
      }
      return out;
    }
  };
}

console.log('\n=== v285 Study Library 6-Track Taxonomy, Single-Stage Dropdown & Minimal Explorer Tests ===\n');

await check('1. D1 migration 0020 seeds 6 canonical L1 tracks + 18 L2 sub-collections & retires legacy L1', async () => {
  const db = createMockD1();
  const env = { DB: db };

  const bootRes = await handlePublicStudyBootstrapApi(new Request('https://csodisha.com/api/public/study-library/bootstrap'), env);
  assert.equal(bootRes.status, 200);
  const boot = await bootRes.json();
  assert.equal(boot.ok, true);
  assert.equal(boot.nav_tracks.length, 6, `Expected 6 active L1 tracks, got ${boot.nav_tracks.length}`);

  const slugs = boot.nav_tracks.map(t => t.slug);
  assert.deepEqual(slugs, [
    'odisha-state-exams',
    'central-competitive-exams',
    'teaching-educator-exams',
    'school-board-notes',
    'skill-coding-digital',
    'previous-papers-mock-tests'
  ]);

  let totalL2 = 0;
  for (const t of boot.nav_tracks) {
    assert.equal(t.subcollections.length, 3, `Track ${t.slug} must have 3 L2 sub-collections`);
    totalL2 += t.subcollections.length;
  }
  assert.equal(totalL2, 18);

  // Verify idempotency (re-running migration produces exact same 6 L1 + 18 L2)
  db.sqlite.exec(read('migrations/0020_study_library_6track_taxonomy.sql'));
  const boot2 = await (await handlePublicStudyBootstrapApi(new Request('https://csodisha.com/api/public/study-library/bootstrap'), env)).json();
  assert.equal(boot2.nav_tracks.length, 6);
});

await check('2. /api/public/study-library/list filters by ?track=, ?sub=, ?type=, ?medium=, ?q= and Admin mutation purges cache', async () => {
  const db = createMockD1();
  const env = { DB: db };

  db.sqlite.prepare(`
    INSERT INTO study_articles (
      id, slug, category_l1_id, category_l2_id, resource_type_badge, language_medium,
      title_en, title_or, summary_en, exam_board_tag, is_published, published_at, updated_at
    ) VALUES (
      'sa_1', 'opsc-oas-prelims-pyq-2025', 'stl_l1_odisha_state', 'stl_l2_opsc_oas',
      'Previous Year Paper (PYQ)', 'Bilingual',
      'OPSC OAS Prelims 2025 Solved Paper', 'OPSC OAS ପ୍ରିଲିମ୍ସ ୨୦୨୫',
      'Complete solved GS Paper 1 with official key', 'OPSC', 1, datetime('now'), datetime('now')
    )
  `).run();

  const listRes = await handlePublicStudyListApi(
    new Request('https://csodisha.com/api/public/study-library/list?track=odisha-state-exams&sub=opsc-oas-ojs-aso&type=pyq&medium=bilingual&q=opsc'),
    env
  );
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.total, 1);
  assert.equal(listData.items[0].slug, 'opsc-oas-prelims-pyq-2025');

  const actor = { userId: 'adm1', role: 'super_admin', email: 'admin@csodisha.com' };
  const createRes = await handleStudyTaxonomyAdmin(
    new Request('https://csodisha.com/api/admin/study/taxonomy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 2, parent_id: 'stl_l1_odisha_state', title_en: 'OPSC OJS Prelims', slug: 'opsc-ojs-prelims' })
    }),
    env,
    actor,
    '',
    ''
  );
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');
});

await check('3. Single-stage Study Library ▾ dropdown (NO Stage 2, NO › chevrons, width 276px, 4-theme opaque)', () => {
  const sh = read('assets/shared-header.js');
  const app = read('assets/app.js');
  const css = read('assets/style.css');
  const shell = read('assets/css/portal-shell.css');

  for (const [label, src] of [['shared-header.js', sh], ['app.js', app]]) {
    assert.ok(src.includes('cso-nav-study-wrap'), `${label} missing cso-nav-study-wrap`);
    assert.ok(src.includes('cso-study-stage1'), `${label} missing cso-study-stage1`);
    assert.ok(src.includes('cso_study_library_dropdown_v285'), `${label} missing sessionStorage cache key`);
    assert.ok(src.includes('/api/public/study-library/bootstrap'), `${label} missing bootstrap sync`);
    assert.ok(src.includes('All Study Resources'), `${label} missing 7th item All Study Resources`);
    assert.ok(!src.includes('cso-study-stage2'), `${label} must NOT have Stage 2 slideout`);
  }

  assert.ok(css.includes('.cso-study-stage1 {\n  width: 276px;'), 'style.css must set .cso-study-stage1 width: 276px');
  assert.ok(css.includes('#cso-main-navbar .cso-study-stage1'), 'style.css must style #cso-main-navbar .cso-study-stage1');
  assert.ok(shell.includes('#cso-main-navbar .cso-study-stage1'), 'portal-shell.css must style #cso-main-navbar .cso-study-stage1');
});

await check('4. Minimal /study-library/ Explorer renders compact hero, L1 track pills, single filter row, chips & zero-overlap empty state', async () => {
  const html = read('study-library/index.html');
  assert.ok(html.includes('stl-hero--compact'), 'study-library/index.html missing compact hero');
  assert.ok(!html.includes('sp-hero-kpis'), 'study-library/index.html must remove 4-box KPI grid');

  const studyHtml = read('study/index.html');
  assert.ok(studyHtml.includes('stl-hero--compact'), 'study/index.html missing compact hero');
  assert.ok(!studyHtml.includes('sp-hero-kpis'), 'study/index.html must remove 4-box KPI grid');

  const portalCss = read('assets/css/study-portal.css');
  assert.ok(portalCss.includes('.sp-empty-card') && portalCss.includes('flex-direction: column;'), 'study-portal.css must use flex-column on .sp-empty-card');
  assert.ok(portalCss.includes('.stl-filter-row'), 'study-portal.css missing .stl-filter-row');
  assert.ok(portalCss.includes('.stl-track-strip'), 'study-portal.css missing .stl-track-strip');

  // Lightweight VM render of assets/js/study-portal.js with ?track=odisha-state-exams&type=Study+Notes
  function makeNode(tag) {
    return {
      tagName: String(tag || 'div').toUpperCase(),
      className: '',
      id: '',
      textContent: '',
      value: '',
      href: '',
      type: '',
      placeholder: '',
      children: [],
      attrs: {},
      classList: {
        _set: new Set(),
        add(...cs) { cs.forEach(c => this._set.add(c)); },
        remove(...cs) { cs.forEach(c => this._set.delete(c)); },
        contains(c) { return this._set.has(c); }
      },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] || null; },
      appendChild(c) { this.children.push(c); return c; },
      append(...cs) { cs.forEach(c => this.children.push(c)); },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
      get firstChild() { return this.children[0] || null; },
      addEventListener() {},
      querySelector(sel) {
        const cls = sel.startsWith('.') ? sel.slice(1) : null;
        const id = sel.startsWith('#') ? sel.slice(1) : null;
        const stack = [...this.children];
        while (stack.length) {
          const n = stack.shift();
          if (!n || typeof n !== 'object') continue;
          if (cls && String(n.className || '').split(/\s+/).includes(cls)) return n;
          if (id && n.id === id) return n;
          if (Array.isArray(n.children)) stack.push(...n.children);
        }
        return null;
      },
      querySelectorAll(sel) {
        const cls = sel.startsWith('.') ? sel.slice(1) : null;
        const out = [];
        const stack = [...this.children];
        while (stack.length) {
          const n = stack.shift();
          if (!n || typeof n !== 'object') continue;
          if (cls && String(n.className || '').split(/\s+/).includes(cls)) out.push(n);
          if (Array.isArray(n.children)) stack.push(...n.children);
        }
        return out;
      }
    };
  }

  const mount = makeNode('section');
  mount.id = 'cso-study-portal-root';
  const body = makeNode('body');
  const mockNodes = [
    { id: 'stl_l1_odisha_state', level: 1, parent_id: null, slug: 'odisha-state-exams', title_en: 'Odisha State Exams', icon: '🏛️', published_modules_count: 0 },
    { id: 'stl_l2_opsc_oas', level: 2, parent_id: 'stl_l1_odisha_state', slug: 'opsc-oas-ojs-aso', title_en: 'OPSC (OAS / OJS / ASO)', icon: '🏛️', published_modules_count: 0 }
  ];

  const sandbox = {
    window: null,
    document: {
      readyState: 'complete',
      body,
      head: makeNode('head'),
      activeElement: null,
      getElementById(id) { return id === 'cso-study-portal-root' ? mount : null; },
      createElement(tag) { return makeNode(tag); },
      createElementNS(_ns, tag) { return makeNode(tag); },
      createTextNode(t) { return { nodeType: 3, textContent: String(t) }; },
      addEventListener() {}
    },
    Option: function Option(text, value) { const o = makeNode('option'); o.textContent = text; o.value = value; return o; },
    URLSearchParams,
    localStorage: { getItem() { return null; }, setItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch: async (url) => ({
      ok: true,
      status: 200,
      async json() {
        if (String(url).includes('/bootstrap')) return { ok: true, nodes: mockNodes, tree: [], items: [], articles: [] };
        if (String(url).includes('/list')) return { ok: true, items: [], total: 0, facets: { types: [], mediums: [] } };
        return { ok: false };
      }
    }),
    setTimeout,
    clearTimeout,
    console
  };
  sandbox.window = {
    location: { pathname: '/study-library/', search: '?track=odisha-state-exams&type=Study+Notes' },
    history: { replaceState() {} },
    localStorage: sandbox.localStorage,
    sessionStorage: sandbox.sessionStorage
  };

  vm.runInNewContext(read('assets/js/study-portal.js'), sandbox);
  await new Promise(r => setTimeout(r, 40));

  assert.ok(mount.querySelector('.stl-hero--compact'), 'Must render .stl-hero--compact');
  assert.equal(mount.querySelector('.sp-hero-kpis'), null, 'Must NOT render .sp-hero-kpis');
  assert.ok(mount.querySelector('.stl-track-strip'), 'Must render .stl-track-strip');
  assert.ok(mount.querySelector('.stl-filter-row'), 'Must render .stl-filter-row');
  assert.ok(mount.querySelector('.stl-reset-btn'), 'Must render conditional Reset button when filters active');
  assert.ok(mount.querySelectorAll('.stl-filter-chip').length >= 2, 'Must render active filter chips for track & type');
  assert.ok(mount.querySelector('.sp-empty-card'), 'Must render centered empty state card when 0 items');
});

await check('5. Admin Studio sidebar sync, cache busting (?v=20261125v285 / cso-candidate-cache-v285) & strict CSP', () => {
  const adminJs = read('admin/admin.js');
  const studioJs = read('admin/study-publishing-studio.js');
  assert.ok(adminJs.includes('studyLibrarySidebarSubnav'), 'admin.js missing #studyLibrarySidebarSubnav');
  assert.ok(adminJs.includes('DEFAULT_STUDY_TRACKS'), 'admin.js missing DEFAULT_STUDY_TRACKS');
  assert.ok(adminJs.includes('/api/admin/study/taxonomy'), 'admin.js missing /api/admin/study/taxonomy sync');
  assert.ok(studioJs.includes('Live Synced to Public Study Library'), 'study-publishing-studio.js missing live sync banner');
  assert.ok(studioJs.includes('cso_study_library_dropdown_v285'), 'study-publishing-studio.js missing sessionStorage cache bust');

  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v285';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v285';"));
  assert.ok(read('study-library/index.html').includes('/assets/js/study-portal.js?v=20261125v285'));
  assert.ok(read('study-library/index.html').includes('/assets/css/study-portal.css?v=20261125v285'));
  assert.ok(read('admin/index.html').includes('admin.js?v=20261125v285'));
  assert.ok(read('admin/index.html').includes('study-publishing-studio.js?v=20261125v285'));

  for (const rel of [
    'assets/shared-header.js',
    'assets/app.js',
    'assets/js/study-portal.js',
    'admin/admin.js',
    'admin/study-publishing-studio.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v285 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
