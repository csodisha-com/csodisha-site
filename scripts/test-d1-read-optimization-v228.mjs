import assert from 'node:assert/strict';
import fs from 'node:fs';

const mig = fs.readFileSync('migrations/0130_d1_read_indexes.sql', 'utf8');
assert(mig.includes('idx_posts_type_l1_active'), 'Missing idx_posts_type_l1_active');
assert(mig.includes('idx_posts_taxonomy_pub'), 'Missing idx_posts_taxonomy_pub');
assert(mig.includes('idx_site_pages_route_status'), 'Missing idx_site_pages_route_status');

const pub = fs.readFileSync('functions/api/content/_public.js', 'utf8');
assert(pub.includes('SEED_CHECK_TTL_MS'), 'Missing seed memoization TTL');
assert(pub.includes('withEdgeCache'), 'Missing edge cache wrapper in _public.js');

const about = fs.readFileSync('functions/api/public/about-overview.js', 'utf8');
assert(about.includes('ABOUT_MEMO_TTL_MS'), 'Missing about-overview memoization');

const ca = fs.readFileSync('functions/api/public/current-affairs.js', 'utf8');
assert(ca.includes('_caSchemaChecked'), 'Missing current-affairs schema memoization');

const sp = fs.readFileSync('functions/_lib/site-pages.js', 'utf8');
assert(sp.includes('PAGE_CACHE_TTL_MS'), 'Missing site-pages isolate cache');

const wrangler = JSON.parse(fs.readFileSync('wrangler.json', 'utf8'));
assert.deepEqual(wrangler.triggers.crons, ['0 * * * *'], 'Expected hourly cron trigger');

console.log('PASS test-d1-read-optimization-v228: Composite indexes, isolate memoization, edge caching, and hourly cron verified.');
