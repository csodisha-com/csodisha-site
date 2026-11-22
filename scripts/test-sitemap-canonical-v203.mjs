#!/usr/bin/env node
/**
 * v203 Verification:
 * 1. functions/api/content/_seo.js & sitemap.xml emit zero /schemes-benefits/ URLs and use /schemes/
 * 2. index.html has v203 CSS cache-bust, sequential heading hierarchy, image dimensions, and 100% CSP compliance
 * 3. sw.js & ops-sentinel.js are bumped to cso-candidate-cache-v203
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSitemapXml } from '../functions/api/content/_seo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// 1. Static sitemap.xml
const staticSitemap = read('sitemap.xml');
assert.ok(!staticSitemap.includes('/schemes-benefits/'), 'sitemap.xml must not contain /schemes-benefits/');
assert.ok(staticSitemap.includes('<loc>https://csodisha.com/schemes/</loc>'), 'sitemap.xml must include canonical /schemes/');

// 2. Dynamic handleSitemapXml with mock D1
const mockDb = {
  prepare(sql) {
    return {
      all: async () => {
        if (sql.includes('FROM schemes_directory_nodes')) {
          return { results: [{ slug: 'government-and-public-welfare', updated_at: '2026-11-22 00:00:00' }] };
        }
        if (sql.includes('FROM schemes_directory')) {
          return { results: [{ slug: 'subhadra-yojana-odisha', updated_at: '2026-11-22 00:00:00' }] };
        }
        return { results: [] };
      }
    };
  }
};

const smRes = await handleSitemapXml(new Request('https://csodisha.com/sitemap.xml'), { DB: mockDb });
assert.equal(smRes.status, 200);
const smXml = await smRes.text();
assert.ok(!smXml.includes('/schemes-benefits/'), 'Dynamic sitemap.xml must emit zero /schemes-benefits/ URLs');
assert.ok(smXml.includes('<loc>https://csodisha.com/schemes/</loc>'), 'Dynamic sitemap.xml must emit /schemes/');
assert.ok(smXml.includes('<loc>https://csodisha.com/schemes/?scheme=subhadra-yojana-odisha</loc>'), 'Dynamic sitemap.xml must emit /schemes/?scheme=...');
assert.ok(smXml.includes('<loc>https://csodisha.com/schemes/?group=government-and-public-welfare</loc>'), 'Dynamic sitemap.xml must emit /schemes/?group=...');

// 3. Homepage CLS, Accessibility & CSP compliance
const indexHtml = read('index.html');
assert.ok(indexHtml.includes('/assets/style.css?v=20261122v203'), 'index.html must reference style.css?v=20261122v203');
assert.ok(indexHtml.includes('<aside class="card lu" aria-label="Latest Updates"><h2>'), 'index.html Latest Updates aside must use h2 and aria-label');
assert.ok(!/<style\b/i.test(indexHtml), 'index.html: zero inline <style>');
assert.ok(!/\sstyle\s*=/i.test(indexHtml), 'index.html: zero style="" attributes');
assert.ok(!/\sonclick\s*=/i.test(indexHtml), 'index.html: zero onclick=');
assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(indexHtml), 'index.html: zero executable inline <script>');

const imgTags = indexHtml.match(/<img\b[^>]*>/gi) || [];
for (const tag of imgTags) {
  assert.ok(/\bwidth\s*=/.test(tag) && /\bheight\s*=/.test(tag), `img missing width/height: ${tag}`);
  assert.ok(/\balt\s*=/.test(tag), `img missing alt: ${tag}`);
}

const styleCss = read('assets/style.css');
assert.ok(styleCss.includes('v203: Homepage CLS 0.00 reservation'), 'assets/style.css must include v203 CLS reservation rules');

// 4. SW cache version v203
assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v203';"), 'sw.js must be bumped to v203');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v203';"), 'ops-sentinel.js must be bumped to v203');

console.log('PASS: test-sitemap-canonical-v203.mjs');
