#!/usr/bin/env node
/**
 * v242 Homepage Studio verification: D1 schema + seed, backend endpoints, admin module,
 * public hydration, strict CSP, theme variables and cache version bump.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let passed = 0; let failed = 0;
function check(label, fn) {
  return Promise.resolve().then(fn).then(() => { console.log(`  PASS: ${label}`); passed++; })
    .catch((err) => { console.error(`  FAIL: ${label}\n        ${err.message}`); failed++; });
}
console.log('\n=== v242 Homepage Studio Verification ===');

const SECTIONS = ['popular_searches', 'latest_updates_tabs', 'opportunity_compass', 'trending_topics', 'important_tools', 'action_hub'];
const EXPECTED = { popular_searches: 11, latest_updates_tabs: 6, opportunity_compass: 4, trending_topics: 6, important_tools: 6, action_hub: 3 };

await check('migration 0136 creates homepage_blocks with every required column', () => {
  const sql = read('migrations/0136_homepage_studio.sql');
  assert.ok(/CREATE TABLE IF NOT EXISTS homepage_blocks/.test(sql));
  for (const c of ['id', 'section_key', 'title_en', 'title_or', 'subtitle_en', 'subtitle_or', 'badge_en', 'icon', 'href', 'cta_label_en', 'cta_label_or', 'accent_variant', 'sort_order', 'is_published', 'clicks_count', 'meta_json', 'updated_at']) {
    assert.ok(new RegExp(`\\b${c}\\b`).test(sql.split(');')[0]), `column ${c} missing`);
  }
});

await check('migration seeds the exact current homepage items for all 6 sections (idempotent)', () => {
  const sql = read('migrations/0136_homepage_studio.sql');
  for (const s of SECTIONS) {
    const n = (sql.match(new RegExp(`VALUES \\('hb_${s}_\\d+', '${s}'`, 'g')) || []).length;
    assert.equal(n, EXPECTED[s], `${s} seed rows`);
  }
  assert.equal(/INSERT INTO homepage_blocks/.test(sql), false, 'seed must use INSERT OR IGNORE');
  const html = read('index.html');
  for (const t of ['OSSTET', 'Odisha Jobs', 'Job Opportunities', 'Odisha Special', 'Flashcard &amp; Self-Quiz Maker', 'Instant Notice Alerts']) {
    assert.ok(html.includes(t), `index.html fallback keeps ${t}`);
  }
  for (const t of ['OSSTET', 'Odisha Jobs', 'Job Opportunities', 'Odisha Special', 'Flashcard & Self-Quiz Maker', 'Instant Notice Alerts']) {
    assert.ok(sql.includes(t.replace(/'/g, "''")), `seed has ${t}`);
  }
});

await check('router exposes /api/admin/homepage-blocks and invalidates caches on mutation', () => {
  const r = read('functions/api/admin/_router.js');
  assert.ok(r.includes("resource === 'homepage-blocks'"));
  assert.ok(r.includes('handleHomepageBlocksAdmin'));
  assert.ok(/homepage-blocks[\s\S]{0,700}invalidateAllPublicCaches\(request\)/.test(r));
  const lib = read('functions/_lib/homepage-studio.js');
  for (const k of ["'reorder'", "'bulk'", "'reset-analytics'", "'duplicate'", "'publish'", "'move'", "'DELETE'"]) assert.ok(lib.includes(k), `lib handles ${k}`);
  assert.ok(lib.includes('invalidateAllPublicCaches(request'));
});

await check('worker serves public cached endpoints + click telemetry', () => {
  const w = read('_worker.js');
  assert.ok(w.includes("'/api/public/homepage-blocks'") && w.includes("'/api/homepage/blocks'"));
  assert.ok(w.includes("pathname === '/api/public/homepage-blocks/click'"));
  assert.ok(read('functions/_lib/edge-cache-invalidator.js').includes("'/api/public/homepage-blocks'"));
});

await check('public + admin handlers behave correctly against a mock D1', async () => {
  const lib = await import(path.join(ROOT, 'functions/_lib/homepage-studio.js'));
  const rows = [
    { id: 'hb_a', section_key: 'popular_searches', title_en: 'A', is_published: 1, sort_order: 10, clicks_count: 3, meta_json: '{}' },
    { id: 'hb_b', section_key: 'popular_searches', title_en: 'B', is_published: 0, sort_order: 20, clicks_count: 0, meta_json: '{}' },
    { id: 'hb_c', section_key: 'action_hub', title_en: 'C', is_published: 1, sort_order: 10, clicks_count: 1, meta_json: '{"btn":"blue"}' }
  ];
  const mk = (data) => ({ prepare: () => ({ run: async () => ({}), all: async () => ({ results: data }), bind() { return this; }, first: async () => null }) });
  const res = await lib.handlePublicHomepageBlocksApi(new Request('https://x/api/public/homepage-blocks'), { DB: mk(rows) });
  const body = await res.json();
  assert.equal(body.source, 'd1');
  assert.deepEqual(Object.keys(body.sections).sort(), [...SECTIONS].sort());
  assert.equal(body.sections.popular_searches.length, 1, 'drafts are hidden');
  assert.equal(body.sections.action_hub[0].meta.btn, 'blue');
  assert.ok(/s-maxage/.test(res.headers.get('Cache-Control')));
  const empty = await (await lib.handlePublicHomepageBlocksApi(new Request('https://x/'), { DB: mk([]) })).json();
  assert.equal(empty.source, 'empty', 'empty table keeps static DOM');
  const broken = await (await lib.handlePublicHomepageBlocksApi(new Request('https://x/'), { DB: { prepare() { throw new Error('down'); } } })).json();
  assert.equal(broken.source, 'fallback', 'D1 failure falls back gracefully');
  const stats = lib.buildStats(rows.map((r) => ({ ...r, clicks_count: r.clicks_count })));
  assert.equal(stats.total, 3); assert.equal(stats.published, 2); assert.equal(stats.draft, 1); assert.equal(stats.clicks, 4);
});

await check('Admin Studio has Homepage Studio sidebar module, tabs, KPIs, form, reorder, bulk, preview', () => {
  const html = read('admin/index.html');
  assert.ok(html.includes('homepage-studio.js') && html.includes('homepage-studio.css') && html.includes('homepage-blocks.js'));
  const admin = read('admin/admin.js');
  assert.ok(admin.includes('module-homepage-studio') && admin.includes('Homepage Studio') && admin.includes('homepageCount'));
  const hs = read('admin/homepage-studio.js');
  for (const t of ['All Sections', 'Popular Searches', 'Latest Updates Tabs', 'Opportunity Compass', 'Trending Topics', 'Important Tools', 'Action Hub']) assert.ok(hs.includes(t), `tab ${t}`);
  for (const t of ['Total blocks', 'Published', 'Draft', 'Total clicks', 'Section breakdown', 'Title (EN)', 'Title (ଓଡ଼ିଆ)', 'Target URL / route', 'CTA button label (EN)', 'Sort order', 'Move up', 'Move down', 'Duplicate', 'Publish selected', 'Unpublish selected', 'Reset analytics', 'Live preview', 'Odisha & Bharat', 'Dark Night', 'Reading Mode', 'System']) assert.ok(hs.includes(t), `studio has ${t}`);
  const master = JSON.parse(read('admin/data/master-navigation.json'));
  assert.equal(master.folders.length, 5, '5 pillars preserved');
});

await check('public homepage hydrates all 6 sections and tracks clicks', () => {
  const html = read('index.html');
  assert.ok(html.includes('/assets/js/homepage-blocks.js'));
  const js = read('assets/js/homepage-blocks.js');
  assert.ok(js.includes('/api/public/homepage-blocks') && js.includes('/api/public/homepage-blocks/click'));
  for (const s of SECTIONS) assert.ok(js.includes(s), `hydrates ${s}`);
  assert.ok(js.includes("d.source === 'd1'"), 'only hydrates from live D1 (static DOM is fallback)');
});

await check('v242 strict CSP across all new/changed files', () => {
  for (const rel of ['admin/homepage-studio.js', 'assets/js/homepage-blocks.js', 'admin/admin.js', 'functions/_lib/homepage-studio.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel}: no HTML string injection`);
    assert.equal(/\.style\.[a-zA-Z]|\.style\s*=|setAttribute\(\s*['"]style/.test(js), false, `${rel}: no .style mutation`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(js), false, `${rel}: no inline handlers`);
  }
  for (const rel of ['admin/index.html', 'index.html']) {
    const html = read(rel);
    assert.equal(/\sstyle\s*=\s*["']/i.test(html), false, `${rel}: no inline style`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(html), false, `${rel}: no inline handlers`);
  }
});

await check('Homepage Studio CSS uses semantic --studio-* / --cso-* variables and all 4 theme previews', () => {
  const css = read('admin/homepage-studio.css');
  assert.ok(css.includes('var(--studio-') && css.includes('var(--cso-'));
  for (const t of ['dark', 'reading', 'utkal-bharat']) assert.ok(css.includes(`.hs-pv--${t}`), `preview theme ${t}`);
  assert.equal(/@import|https?:\/\//.test(css), false, 'self-hosted only');
});

await check('sw.js and ops-sentinel bumped to cso-candidate-cache-v242+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-(?:v2(?:4[2-9]|[5-9]\d)|v3\d\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-(?:v2(?:4[2-9]|[5-9]\d)|v3\d\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
