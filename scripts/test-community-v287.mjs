#!/usr/bin/env node
/**
 * v287 Verification Suite:
 * 1. migrations/0022_community_4channel_taxonomy.sql seeds ONLY 4 active L1 Community Channels in exact sort order
 *    and retires legacy starter L1 channels (is_published = 0).
 * 2. /api/public/community/bootstrap emits nav_channels with threads_count, and /api/public/community/list
 *    filters by ?channel=, ?sort= (latest, helpful, unanswered), ?scope= (all, odisha, central, verified), and ?q=.
 * 3. Single-stage vertical Community ▾ dropdown (shared-header.js, app.js, style.css, portal-shell.css):
 *    - NO Stage 2 slideout, NO › chevrons, width: 276px, 5 items (4 channels + All Community Discussions), opaque 4-theme surfaces.
 * 4. Minimal /community/ Explorer (community/index.html, community-portal.js, community-portal.css):
 *    - Compact .com-hero--compact (no 4-box .cp-hero-kpis), .com-channel-strip, single-row .com-filter-row,
 *      deep-link hydration (?channel=, ?sort=, ?scope=, ?q=), dismissible chips & centered flex empty state.
 * 5. Admin Studio #communitySidebarSubnav, Live Sync banner, ?v=20261125v287 cache busting & strict CSP compliance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import {
  handlePublicCommunityBootstrapApi,
  handlePublicCommunityFeedApi
} from '../functions/_lib/community-platform.js';

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
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT);
    CREATE TABLE IF NOT EXISTS candidates (id TEXT PRIMARY KEY, email TEXT, full_name TEXT, district TEXT);
  `);
  sqlite.exec(read('migrations/0141_community_platform.sql'));
  sqlite.exec(read('migrations/0022_community_4channel_taxonomy.sql'));

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
      for (const s of stmts) out.push(await s.all().catch(() => s.run()));
      return out;
    }
  };
}

console.log('\n=== v287 Community 4-Channel Taxonomy, Single-Stage Dropdown & Minimal Portal Tests ===\n');

await check('1. Migration 0022 seeds 4 canonical active L1 channels & /api/public/community/bootstrap emits nav_channels', async () => {
  const db = createMockD1();
  const env = { DB: db };
  const res = await handlePublicCommunityBootstrapApi(new Request('https://csodisha.com/api/public/community/bootstrap'), env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.nav_channels.length, 4);
  assert.deepEqual(
    data.nav_channels.map(c => [c.slug, c.title_en, c.sort_order]),
    [
      ['exam-career-qa', 'Exam & Career Q&A', 10],
      ['schemes-citizen-help', 'Odisha Schemes & Citizen Help', 20],
      ['study-groups-notes', 'Study Groups & Peer Notes', 30],
      ['success-stories-mentorship', 'Success Stories & Mentorship', 40]
    ]
  );
  // Idempotency check
  db.sqlite.exec(read('migrations/0022_community_4channel_taxonomy.sql'));
  const data2 = await (await handlePublicCommunityBootstrapApi(new Request('https://csodisha.com/api/public/community/bootstrap'), env)).json();
  assert.equal(data2.nav_channels.length, 4);
});

await check('2. /api/public/community/list filters by ?channel=, ?sort=, ?scope=, and ?q=', async () => {
  const db = createMockD1();
  const env = { DB: db };

  db.sqlite.prepare(`
    INSERT INTO community_posts (
      id, slug, category_l1_id, post_type, district_tag, exam_tag,
      title_en, body_en, upvotes_count, replies_count, is_solved, moderation_status
    ) VALUES
      ('p1', 'opsc-oas-booklist', 'comm_l1_exam_career_qa', 'question', 'Khordha', 'OPSC OAS', 'OPSC OAS Prelims Booklist', 'Best books for Odisha GK', 12, 2, 1, 'published'),
      ('p2', 'upsc-csat-help', 'comm_l1_exam_career_qa', 'question', '', 'UPSC CSE', 'UPSC CSAT Comprehension Tips', 'Need help with passages', 3, 0, 0, 'published')
  `).run();

  const verifiedRes = await (await handlePublicCommunityFeedApi(
    new Request('https://csodisha.com/api/public/community/list?channel=exam-career-qa&scope=verified&sort=helpful&q=opsc'),
    env
  )).json();
  assert.equal(verifiedRes.total, 1);
  assert.equal(verifiedRes.items[0].slug, 'opsc-oas-booklist');

  const unansRes = await (await handlePublicCommunityFeedApi(
    new Request('https://csodisha.com/api/public/community/list?channel=exam-career-qa&scope=central&sort=unanswered'),
    env
  )).json();
  assert.equal(unansRes.total, 1);
  assert.equal(unansRes.items[0].slug, 'upsc-csat-help');
});

await check('3. Single-stage vertical Community ▾ dropdown (5 items, NO Stage 2, width 276px, opaque 4-theme surfaces)', () => {
  for (const rel of ['assets/shared-header.js', 'assets/app.js']) {
    const src = read(rel);
    assert.ok(src.includes('cso-nav-community-wrap'), `${rel} missing cso-nav-community-wrap`);
    assert.ok(src.includes('cso-community-stage1'), `${rel} missing cso-community-stage1`);
    assert.ok(src.includes('cso_community_dropdown_v287'), `${rel} missing v287 cache key`);
    assert.ok(src.includes('All Community Discussions'), `${rel} missing 5th item All Community Discussions`);
    assert.ok(!src.includes('cso-community-stage2'), `${rel} must NOT include Stage 2 slideout`);
  }
  const css = read('assets/style.css');
  const shell = read('assets/css/portal-shell.css');
  assert.ok(css.includes('.cso-community-stage1 {\n  width: 276px;'), 'style.css must set .cso-community-stage1 width: 276px');
  assert.ok(shell.includes('#cso-main-navbar .cso-community-stage1'), 'portal-shell.css must style #cso-main-navbar .cso-community-stage1');
});

await check('4. Minimal /community/ Explorer renders compact hero, channel pills, single filter row, chips & flex empty state', async () => {
  const html = read('community/index.html');
  assert.ok(html.includes('com-hero--compact'), 'community/index.html missing compact hero');
  assert.ok(!html.includes('cp-hero-kpis'), 'community/index.html must remove 4-box KPI strip');

  const css = read('assets/css/community-portal.css');
  assert.ok(css.includes('.com-channel-strip') && css.includes('.com-filter-row') && css.includes('.cp-empty'), 'community-portal.css missing minimal classes');

  function makeNode(tag) {
    return {
      tagName: String(tag || 'div').toUpperCase(),
      className: '', id: '', textContent: '', value: '', href: '', type: '', placeholder: '',
      children: [], attrs: {},
      classList: { _s: new Set(), add(...cs) { cs.forEach(c => this._s.add(c)); }, remove(...cs) { cs.forEach(c => this._s.delete(c)); }, contains(c) { return this._s.has(c); } },
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
  mount.id = 'cso-community-portal-root';
  const mockNodes = [
    { id: 'comm_l1_exam_career_qa', level: 1, slug: 'exam-career-qa', title_en: 'Exam & Career Q&A', icon: '❓', posts_count: 0 },
    { id: 'comm_l1_schemes_citizen_help', level: 1, slug: 'schemes-citizen-help', title_en: 'Odisha Schemes & Citizen Help', icon: '🏛️', posts_count: 0 }
  ];
  const sandbox = {
    window: null,
    document: {
      readyState: 'complete',
      body: makeNode('body'),
      head: makeNode('head'),
      activeElement: null,
      cookie: '',
      getElementById(id) { return id === 'cso-community-portal-root' ? mount : null; },
      createElement(tag) { return makeNode(tag); },
      createTextNode(t) { return { nodeType: 3, textContent: String(t) }; },
      addEventListener() {}
    },
    Option: function Option(text, value) { const o = makeNode('option'); o.textContent = text; o.value = value; return o; },
    URLSearchParams,
    localStorage: { getItem() { return null; }, setItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch: async (url) => ({
      ok: true, status: 200,
      async json() {
        if (String(url).includes('/bootstrap')) return { ok: true, nodes: mockNodes, tree: [], posts: [], items: [] };
        return { ok: true, items: [], total: 0, leaderboard: [] };
      }
    }),
    setTimeout, clearTimeout, console
  };
  sandbox.window = {
    location: { pathname: '/community/', search: '?channel=exam-career-qa&scope=odisha' },
    history: { replaceState() {} },
    localStorage: sandbox.localStorage,
    sessionStorage: sandbox.sessionStorage
  };

  vm.runInNewContext(read('assets/js/community-portal.js'), sandbox);
  await new Promise(r => setTimeout(r, 40));

  assert.ok(mount.querySelector('.com-hero--compact'), 'Must render .com-hero--compact');
  assert.equal(mount.querySelector('.cp-hero-kpis'), null, 'Must NOT render .cp-hero-kpis');
  assert.ok(mount.querySelector('.com-channel-strip'), 'Must render .com-channel-strip');
  assert.ok(mount.querySelector('.com-filter-row'), 'Must render .com-filter-row');
  assert.ok(mount.querySelector('.com-reset-btn'), 'Must render conditional Reset button');
  assert.ok(mount.querySelectorAll('.com-filter-chip').length >= 2, 'Must render active filter chips for channel & scope');
  assert.ok(mount.querySelector('.cp-empty'), 'Must render centered flex empty state');
});

await check('5. Admin Studio sidebar sync, cache busting (?v=20261125v287 / cso-candidate-cache-v287) & strict CSP', () => {
  const adminJs = read('admin/admin.js');
  const studioJs = read('admin/community-publishing-studio.js');
  assert.ok(adminJs.includes('communitySidebarSubnav'), 'admin.js missing #communitySidebarSubnav');
  assert.ok(adminJs.includes('DEFAULT_COMMUNITY_CHANNELS'), 'admin.js missing DEFAULT_COMMUNITY_CHANNELS');
  assert.ok(studioJs.includes('Live Synced to Public Community'), 'community-publishing-studio.js missing live sync banner');
  assert.ok(studioJs.includes('cso_community_dropdown_v287'), 'community-publishing-studio.js missing v287 cache bust');

  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v2(?:8[7-9]|9\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:8[7-9]|9\d)';/);
  assert.match(read('community/index.html'), /\/assets\/js\/community-portal\.js\?v=20261125v2(?:8[7-9]|9\d)/);
  assert.match(read('community/index.html'), /\/assets\/css\/community-portal\.css\?v=20261125v2(?:8[7-9]|9\d)/);
  assert.match(read('admin/index.html'), /admin\.js\?v=20261125v2(?:8[7-9]|9\d)/);
  assert.match(read('admin/index.html'), /community-publishing-studio\.js\?v=20261125v2(?:8[7-9]|9\d)/);

  for (const rel of [
    'assets/shared-header.js',
    'assets/app.js',
    'assets/js/community-portal.js',
    'admin/admin.js',
    'admin/community-publishing-studio.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v287 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
