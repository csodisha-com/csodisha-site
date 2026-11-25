#!/usr/bin/env node
/**
 * v290 Verification Suite:
 * 1. /api/public/about/bootstrap serves live institutional fields + defaults & invalidateAboutCaches purges bootstrap + /about/.
 * 2. Minimal /about/ page (about/index.html, about-portal.js, about-portal.css) renders compact .abt-hero--compact
 *    (no 5-box .ap-hero-kpis), motto, EN/OR toggle, and 5 structured institutional cards linking all 5 portals + citizen desk.
 * 3. About remains a single direct top-level nav link (/about/) with NO dropdown in shared-header.js & app.js.
 * 4. Admin Studio About editor displays Live Synced to Public /about/ Page banner.
 * 5. ?v=20261125v290 cache busting, cso-candidate-cache-v290 & strict CSP compliance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { handlePublicAboutBootstrapApi } from '../functions/_lib/about-publishing-house.js';

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

console.log('\n=== v290 Minimal /about/ Portal & Institutional Sync Tests ===\n');

await check('1. /api/public/about/bootstrap serves institutional data & invalidateAboutCaches purges /api/public/about/bootstrap', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(read('migrations/0142_about_institutional_studio.sql'));
  function makeStmt(sql, params = []) {
    return {
      bind(...args) { return makeStmt(sql, args); },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() { return { success: true, meta: { changes: sqlite.prepare(sql).run(...params).changes } }; }
    };
  }
  const db = {
    prepare(sql) { return makeStmt(sql, []); },
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.all().catch(() => ({ results: [] }))); return out; }
  };

  const res = await handlePublicAboutBootstrapApi(new Request('https://csodisha.com/api/public/about/bootstrap'), { DB: db });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.institutional && data.institutional.motto_en.includes('Be Self-Reliant'), 'bootstrap missing institutional motto');
  assert.equal(data.institutional.contact_email, 'contact@csodisha.com');

  const backendSrc = read('functions/_lib/about-publishing-house.js');
  assert.ok(backendSrc.includes("'/api/public/about/bootstrap'"), 'invalidateAboutCaches must purge /api/public/about/bootstrap');
  assert.ok(backendSrc.includes("X-CSO-Cache-Purged"), 'Admin mutations must set X-CSO-Cache-Purged: 1');
});

await check('2. /about/ renders compact hero (no .ap-hero-kpis), symmetrical 3-section layout (2 summary cards, 5-card portal strip, single citizen desk & charters footer), and Dark Night WCAG AA+ contrast rules', async () => {
  const html = read('about/index.html');
  assert.ok(html.includes('abt-hero--compact'), 'about/index.html missing .abt-hero--compact');
  assert.ok(!html.includes('ap-hero-kpis'), 'about/index.html must remove bloated KPI strip');

  const css = read('assets/css/about-portal.css');
  assert.ok(css.includes('.abt-hero--compact') && css.includes('.abt-summary-grid') && css.includes('.abt-portals-strip') && css.includes('.abt-desk-card'), 'about-portal.css missing v291 3-section classes');
  assert.ok(css.includes('html[data-theme="dark"] .abt-card-kicker') && css.includes('#7dd3fc'), 'about-portal.css missing Dark Night WCAG AA+ contrast overrides');

  function makeNode(tag) {
    return {
      tagName: String(tag || 'div').toUpperCase(),
      className: '', id: '', textContent: '', href: '', type: '',
      children: [], attrs: {},
      classList: { _s: new Set(), add(...cs) { cs.forEach(c => this._s.add(c)); }, remove(...cs) { cs.forEach(c => this._s.delete(c)); } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      appendChild(c) { this.children.push(c); return c; },
      append(...cs) { cs.forEach(c => this.children.push(c)); },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
      remove() {},
      get firstChild() { return this.children[0] || null; },
      addEventListener() {},
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        const cls = sel.startsWith('.') ? sel.slice(1) : null;
        const out = [];
        const stack = [...this.children];
        while (stack.length) {
          const n = stack.shift();
          if (!n || typeof n !== 'object') continue;
          if ((cls && String(n.className || '').split(/\s+/).includes(cls)) || (!cls && n.tagName && n.tagName.toLowerCase() === sel.toLowerCase())) out.push(n);
          if (Array.isArray(n.children)) stack.push(...n.children);
        }
        return out;
      }
    };
  }

  const mount = makeNode('section');
  mount.id = 'cso-about-portal-root';
  const sandbox = {
    window: null,
    document: {
      readyState: 'complete',
      body: makeNode('body'),
      head: makeNode('head'),
      activeElement: null,
      getElementById(id) { return id === 'cso-about-portal-root' ? mount : null; },
      createElement(tag) { return makeNode(tag); },
      createElementNS(_ns, tag) { return makeNode(tag); },
      createTextNode(t) { return { nodeType: 3, textContent: String(t) }; },
      addEventListener() {},
      removeEventListener() {}
    },
    URLSearchParams,
    localStorage: { getItem() { return null; }, setItem() {} },
    fetch: async () => ({
      ok: true, status: 200,
      async json() {
        return {
          ok: true, nodes: [], sources: [], sectors: [],
          pages: [{ id: 1, slug: 'cso-editorial-charter', title_en: 'CSO Editorial Charter', summary_en: 'Verified civic reporting charter.' }],
          institutional: {
            title_en: 'About Common Sense Odisha',
            motto_en: 'Be Self-Reliant | Build a Better Tomorrow',
            subtitle_en: 'Independent, open-access civic and educational platform.',
            contact_email: 'contact@csodisha.com'
          }
        };
      }
    }),
    setTimeout, clearTimeout, console
  };
  sandbox.window = { location: { pathname: '/about/', search: '' }, localStorage: sandbox.localStorage };

  vm.runInNewContext(read('assets/js/about-portal.js'), sandbox);
  await new Promise(r => setTimeout(r, 40));

  assert.ok(mount.querySelector('.abt-hero--compact'), 'Must render .abt-hero--compact');
  assert.equal(mount.querySelector('.ap-hero-kpis'), null, 'Must NOT render .ap-hero-kpis');
  assert.equal(mount.querySelector('.ap-cards-grid'), null, 'Must NOT render duplicate bottom Published Institutional Documents card grid');

  const summaryGrid = mount.querySelector('.abt-summary-grid');
  assert.ok(summaryGrid, 'Must render Section 1 .abt-summary-grid');
  assert.equal(summaryGrid.querySelectorAll('.abt-card').length, 2, 'Section 1 must have exactly 2 equal-height summary cards');

  const portalStrip = mount.querySelector('.abt-portals-strip');
  assert.ok(portalStrip, 'Must render Section 2 .abt-portals-strip');
  assert.equal(portalStrip.querySelectorAll('.abt-portal-card').length, 5, 'Section 2 must render 5 horizontal portal cards');

  const deskCard = mount.querySelector('.abt-desk-card');
  assert.ok(deskCard, 'Must render Section 3 .abt-desk-card');
  assert.equal(deskCard.querySelectorAll('.abt-charter-btn').length, 1, 'Section 3 must render published charters as inline modal triggers');

  const hrefs = mount.querySelectorAll('a').map(a => a.href);
  for (const required of ['/jobs/', '/careers/', '/schemes/', '/study-library/', '/community/', 'mailto:contact@csodisha.com']) {
    assert.ok(hrefs.includes(required), `Missing required link on /about/: ${required}`);
  }
});

await check('3. About stays a single direct nav link (no dropdown) & Admin Studio shows Live Synced banner', () => {
  assert.ok(!read('assets/shared-header.js').includes('cso-about-stage1'), 'About must NOT have a dropdown in shared-header.js');
  assert.ok(!read('assets/app.js').includes('cso-about-stage1'), 'About must NOT have a dropdown in app.js');
  assert.ok(read('admin/about-publishing-studio.js').includes('Live Synced to Public /about/ Page'), 'About Admin Studio missing Live Synced banner');
});

await check('4. ?v=20261125v291 cache busting, cso-candidate-cache-v291 & strict CSP compliance', () => {
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v291';"));
  assert.ok(read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v291';"));
  assert.ok(read('about/index.html').includes('/assets/js/about-portal.js?v=20261125v291'));
  assert.ok(read('about/index.html').includes('/assets/css/about-portal.css?v=20261125v291'));
  assert.ok(read('admin/index.html').includes('admin.js?v=20261125v290'));
  assert.ok(read('admin/index.html').includes('about-publishing-studio.js?v=20261125v290'));

  for (const rel of ['assets/js/about-portal.js', 'admin/about-publishing-studio.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v290 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
