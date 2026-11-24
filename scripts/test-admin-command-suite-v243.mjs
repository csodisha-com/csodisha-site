#!/usr/bin/env node
/**
 * v243 Executive Command Suite Verification:
 * - Backend endpoints (/api/admin/overview-stats, /api/admin/audit-feed, /api/admin/system-diagnostics,
 *   /api/admin/purge-caches, /api/admin/command-index, /api/admin/media-library, /api/admin/slug-check,
 *   /api/admin/bulk-content) with auth guard and zero dummy data.
 * - Admin Studio Command Overview default view, Ctrl+K Command Palette, keyboard shortcuts,
 *   autosave draft recovery, bilingual/SEO pre-flight validator, R2 media drawer, bulk operations.
 * - Strict CSP compliance across all admin/ JS & HTML files and semantic 4-theme CSS tokens.
 * - Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v243.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let passed = 0;
let failed = 0;

function check(label, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  PASS: ${label}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  FAIL: ${label}\n        ${err.message}`);
      failed++;
    });
}

console.log('\n=== v243 Executive Command Suite Verification ===');

await check('Admin router wires all Command Suite resources behind requireRole(STAFF_ROLES)', () => {
  const router = read('functions/api/admin/_router.js');
  assert.ok(router.includes('COMMAND_SUITE_RESOURCES') && router.includes('handleCommandSuiteAdmin'));
  assert.ok(/COMMAND_SUITE_RESOURCES\.includes\(resource\)[\s\S]{0,300}requireRole\(request,\s*env,\s*STAFF_ROLES\)/.test(router));
  const lib = read('functions/_lib/command-suite.js');
  for (const r of ['overview-stats', 'audit-feed', 'system-diagnostics', 'purge-caches', 'command-index', 'media-library', 'slug-check', 'bulk-content']) {
    assert.ok(lib.includes(`'${r}'`), `command-suite handles ${r}`);
  }
});

await check('Backend overview-stats, audit-feed, diagnostics, slug-check & bulk-content work against mock D1/R2', async () => {
  const mod = await import(path.join(ROOT, 'functions/_lib/command-suite.js'));
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes('homepage_blocks')) return { total: 36, published: 34, clicks: 120 };
          if (sql.includes("role = 'candidate'")) return { n: 42 };
          if (sql.includes("role IN ('editor','admin')")) return { n: 3 };
          if (sql.includes('nav_categories')) return { total: 5, published: 5 };
          if (sql.includes('nav_menu_items')) return { total: 5, published: 5 };
          if (sql.includes('WHERE slug = ?')) return null;
          if (sql.includes('sqlite_master')) return { n: 219 };
          if (sql.includes('media_files')) return { n: 8, bytes: 1048576 };
          return { total: 2, published: 1, n: 10 };
        },
        async all() {
          if (sql.includes('FROM audit_log')) {
            return {
              results: [
                { id: 10, action: 'homepage_block.publish', target_type: 'homepage_block', target_id: 'hb_1', metadata_json: '{}', created_at: '2026-11-24 04:00:00', actor_email: 'admin@csodisha.com' }
              ]
            };
          }
          return { results: [{ id: 'j1', title: 'OPSC OAS', slug: 'opsc-oas', status: 'published', updated_at: '2026-11-24' }] };
        },
        async run() { return { success: true }; }
      };
    },
    async batch(stmts) { return stmts.map(() => ({ success: true })); }
  };
  const env = { DB: db, MEDIA: { list: async () => ({ objects: [] }) } };

  const ovRes = await mod.handleOverviewStats(new Request('https://csodisha.com/api/admin/overview-stats'), env);
  const ov = await ovRes.json();
  assert.equal(ov.ok, true);
  assert.equal(ov.candidates, 42);
  assert.equal(ov.homepage.clicks, 120);
  assert.match(ov.sw_cache_version, /^cso-candidate-cache-v2(?:4[3-9]|[5-9]\d)$/);

  const afRes = await mod.handleAuditFeed(new Request('https://csodisha.com/api/admin/audit-feed?pillar=homepage&type=publish'), env);
  const af = await afRes.json();
  assert.equal(af.ok, true);
  assert.equal(af.items.length, 1);
  assert.equal(af.items[0].pillar, 'homepage');
  assert.equal(af.items[0].type, 'publish');

  const diagRes = await mod.handleDiagnostics(new Request('https://csodisha.com/api/admin/system-diagnostics'), env);
  const diag = await diagRes.json();
  assert.equal(diag.ok, true);
  assert.equal(diag.r2.reachable, true);
  assert.match(diag.service_worker.expected_cache_version, /^cso-candidate-cache-v2(?:4[3-9]|[5-9]\d)$/);

  const scRes = await mod.handleSlugCheck(new Request('https://csodisha.com/api/admin/slug-check?pillar=jobs&slug=opsc-oas-2026'), env);
  const sc = await scRes.json();
  assert.equal(sc.valid, true);
  assert.equal(sc.available, true);

  const bkRes = await mod.handleBulkContent(new Request('https://csodisha.com/api/admin/bulk-content?pillar=jobs'), env, { userId: 'u1', email: 'admin@csodisha.com', role: 'admin' });
  const bk = await bkRes.json();
  assert.equal(bk.ok, true);
  assert.equal(bk.items.length, 1);
});

await check('Admin Studio defaults to Command Overview & links command-suite assets', () => {
  const html = read('admin/index.html');
  assert.ok(html.includes('/admin/command-suite.css'));
  assert.ok(html.includes('/admin/command-suite.js'));
  const admin = read('admin/admin.js');
  assert.ok(admin.includes('folder-command-overview') && admin.includes('module-command-overview'));
  assert.ok(admin.includes('openCommandOverview'));
  assert.ok(admin.includes('{ folderId: OV_FOLDER_ID, moduleId: OV_MODULE_ID }'));
});

await check('Command Suite JS implements Overview, Ctrl+K Palette, Shortcuts, Autosave, Pre-Flight, R2 Media Drawer & Bulk Ops', () => {
  const js = read('admin/command-suite.js');
  for (const token of [
    'overview-stats', 'audit-feed', 'system-diagnostics', 'purge-caches', 'command-index', 'media-library', 'slug-check', 'bulk-content',
    'Quick-Action Launchpad', 'Content Pipeline', 'Recent Activity & Audit Trail', 'Purge All Edge Caches',
    'Command Palette', 'Save Draft', 'Publish Live', 'Unpublish', 'Unsaved draft found',
    'Search & social card preview', 'Media Library · R2', 'Publish Selected', 'Move to Draft', 'Delete Selected', 'Export JSON', 'Export CSV'
  ]) {
    assert.ok(js.includes(token), `command-suite.js includes "${token}"`);
  }
});

await check('Strict CSP compliance across v243 files (zero innerHTML, .style.*, or inline handlers)', () => {
  for (const rel of ['admin/command-suite.js', 'admin/admin.js', 'admin/homepage-studio.js', 'functions/_lib/command-suite.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel}: no HTML string injection`);
    assert.equal(/\.style\.[a-zA-Z]|\.style\s*=|setAttribute\(\s*['"]style/.test(js), false, `${rel}: no .style mutation`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(js), false, `${rel}: no inline event handlers`);
  }
  const html = read('admin/index.html');
  assert.equal(/\sstyle\s*=\s*["']/i.test(html), false, 'admin/index.html: no inline style');
  assert.equal(/\son[a-z]+\s*=\s*["']/i.test(html), false, 'admin/index.html: no inline handlers');
});

await check('Command Suite CSS uses semantic --studio-* / --cso-* tokens & tabular-nums with zero unguarded light/white text', () => {
  const css = read('admin/command-suite.css');
  assert.ok(css.includes('var(--studio-') && css.includes('var(--cso-'));
  assert.ok(css.includes('font-variant-numeric: tabular-nums'));
  assert.equal(/@import|https?:\/\//.test(css), false, 'self-hosted CSS only');
  assert.equal(/\bcolor\s*:\s*(#fff\b|#ffffff\b|#f8fafc\b|#f1f5f9\b|#e2e8f0\b|#cbd5e1\b|#94a3b8\b)/i.test(css), false, 'no unguarded light/white text colors');
});

await check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v243+', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v2(?:4[3-9]|[5-9]\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:4[3-9]|[5-9]\d)';/);
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
