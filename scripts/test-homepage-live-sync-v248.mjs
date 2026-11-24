/**
 * v248 Homepage Studio Live Sync Verification
 * Verifies end-to-end cache invalidation, SW NetworkOnly API handling,
 * client no-store hydration, and strict CSP compliance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { handleHomepageBlocksAdmin, handlePublicHomepageBlocksApi } from '../functions/_lib/homepage-studio.js';
import { NAV_PUBLIC_PATHS, CONTENT_PUBLIC_PATHS } from '../functions/_lib/edge-cache-invalidator.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

console.log('\n=== v248 Homepage Studio Live Sync Verification ===');

function createMockDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        _args: [],
        bind(...args) { this._args = args; return this; },
        async run() {
          if (sql.startsWith('INSERT INTO homepage_blocks')) {
            const [id, section_key, title_en, title_or, subtitle_en, subtitle_or, badge_en, icon, href, cta_label_en, cta_label_or, accent_variant, sort_order, is_published, meta_json] = this._args;
            rows.set(id, { id, section_key, title_en, title_or, subtitle_en, subtitle_or, badge_en, icon, href, cta_label_en, cta_label_or, accent_variant, sort_order, is_published, clicks_count: 0, meta_json, updated_at: new Date().toISOString() });
          } else if (sql.startsWith('UPDATE homepage_blocks SET title_en')) {
            const id = this._args[this._args.length - 1];
            const cur = rows.get(id);
            if (cur) { cur.title_en = this._args[0]; cur.updated_at = new Date().toISOString(); }
          } else if (sql.startsWith('UPDATE homepage_blocks SET is_published')) {
            const [pub, id] = this._args;
            const cur = rows.get(id);
            if (cur) { cur.is_published = pub; cur.updated_at = new Date().toISOString(); }
          }
          return { success: true };
        },
        async first() {
          if (sql.includes('WHERE id = ?')) return rows.get(this._args[0]) || null;
          if (sql.includes('MAX(sort_order)')) return { m: rows.size * 10 };
          return null;
        },
        async all() {
          return { results: [...rows.values()] };
        }
      };
    },
    async batch(stmts) {
      for (const s of stmts) await s.run();
      return [];
    }
  };
}

const deletedCacheUrls = [];
globalThis.caches = {
  default: {
    async match() { return null; },
    async put() {},
    async delete(req) {
      deletedCacheUrls.push(typeof req === 'string' ? req : req.url);
      return true;
    }
  }
};

await check('1. Admin write saves to D1, purges edge cache, and public API returns max-age=0, s-maxage=60, must-revalidate', async () => {
  const db = createMockDb();
  const env = { DB: db };
  const actor = { id: 'adm_1', email: 'admin@csodisha.com', role: 'super_admin' };

  const createReq = new Request('https://csodisha.com/api/admin/homepage-blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section_key: 'popular_searches',
      title_en: 'OPSC OAS 2026',
      is_published: 1
    })
  });
  const createRes = await handleHomepageBlocksAdmin(createReq, env, actor, '', '');
  assert.equal(createRes.status, 201);
  assert.equal(createRes.headers.get('X-CSO-Cache-Purged'), '1');

  assert.ok(deletedCacheUrls.some((u) => u.endsWith('/api/public/homepage-blocks')), 'must purge /api/public/homepage-blocks');
  assert.ok(deletedCacheUrls.some((u) => u.endsWith('/api/homepage/blocks')), 'must purge /api/homepage/blocks');
  assert.ok(deletedCacheUrls.some((u) => u === 'https://csodisha.com/'), 'must purge /');
  assert.ok(deletedCacheUrls.some((u) => u.endsWith('/index.html')), 'must purge /index.html');

  const pubRes = await handlePublicHomepageBlocksApi(new Request('https://csodisha.com/api/public/homepage-blocks'), env);
  assert.equal(pubRes.status, 200);
  assert.equal(pubRes.headers.get('Cache-Control'), 'public, max-age=0, s-maxage=60, must-revalidate');
  const pubData = await pubRes.json();
  assert.equal(pubData.ok, true);
  assert.equal(pubData.source, 'd1');
  assert.equal(pubData.sections.popular_searches.length, 1);
  assert.equal(pubData.sections.popular_searches[0].title_en, 'OPSC OAS 2026');
});

await check('2. Edge cache invalidator includes / and /index.html and homepage-blocks endpoints', () => {
  assert.ok(NAV_PUBLIC_PATHS.includes('/'));
  assert.ok(NAV_PUBLIC_PATHS.includes('/index.html'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/public/homepage-blocks'));
  assert.ok(CONTENT_PUBLIC_PATHS.includes('/api/homepage/blocks'));
});

await check('3. sw.js never caches /api/public/* cache-first and is bumped to cso-candidate-cache-v248+', () => {
  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v24[89]';/.test(sw));
  assert.ok(sw.includes("url.pathname.startsWith('/api/') && !isNetworkFirstApi(url)"));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v24[89]';/.test(read('functions/_lib/ops-sentinel.js')));
});

await check('4. _worker.js bypasses edge cache on refresh/_cb and purges / and /index.html', () => {
  const worker = read('_worker.js');
  assert.ok(worker.includes("url.searchParams.has('refresh') || url.searchParams.has('_cb')"));
  assert.ok(worker.includes("'/api/public/homepage-blocks', '/api/homepage/blocks', '/', '/index.html'"));
});

await check('5. Client homepage-blocks.js uses cache: no-store and Admin Studio links to /?refresh=1', () => {
  const client = read('assets/js/homepage-blocks.js');
  assert.ok(client.includes("cache: 'no-store'"));
  assert.ok(client.includes('?refresh=1'));
  const adminJs = read('admin/homepage-studio.js');
  assert.ok(adminJs.includes('D1 saved & Edge Cache purged'));
  assert.ok(adminJs.includes('/?refresh=1'));
  assert.ok(read('index.html').includes('homepage-blocks.js?v=20261124v248'));
  assert.ok(read('admin/index.html').includes('homepage-studio.js?v=20261124v248'));
});

await check('6. Strict CSP compliance across modified client scripts', () => {
  for (const file of ['assets/js/homepage-blocks.js', 'admin/homepage-studio.js', 'sw.js']) {
    const src = read(file);
    assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), `${file} must not use unsafe DOM HTML APIs`);
    if (file !== 'sw.js') {
      assert.ok(!/\.style\./.test(src), `${file} must not mutate .style.*`);
    }
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
