#!/usr/bin/env node
/**
 * v296 Full-Site Active HTML & Valid Links Overhaul Audit
 *
 * Verifies:
 *  1. Zero broken internal links (<a href>), zero missing assets (<link>, <script>, <img>, <source>, <use>),
 *     and zero dead anchor targets (#id) across ALL remaining HTML pages.
 *  2. Zero orphaned/unlinked HTML files left in the repo, zero deleted legacy/duplicate HTML files remaining,
 *     and clean 301 canonical redirects in _worker.js & _redirects for retired SEO paths.
 *  3. Valid HTML5 document structure (<!DOCTYPE html>, <html lang>, <meta charset="UTF-8">, <meta name="viewport">,
 *     unique <title>, exact clean path-based <link rel="canonical">, zero unclosed/malformed tags) on EVERY HTML page.
 *  4. /sitemap.xml (static sitemap.xml + dynamic STATIC_SITEMAP_ROUTES in functions/api/content/_seo.js) emits
 *     ONLY active, valid, 200-OK canonical URLs and zero deleted/disallowed paths.
 *  5. sw.js PRECACHE_URLS & RUNTIME_SWR_ASSETS contain only existing valid files, and sw.js + ops-sentinel.js
 *     are bumped to cso-candidate-cache-v296 with valid canonical warmer routes.
 *  6. 100% strict CSP compliance across all remaining HTML files and core JS modules.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.gemini'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out.sort();
}

function relToRoute(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

function resolveDiskTarget(sourceFile, rawUrl) {
  const [urlBeforeHash, hash] = rawUrl.split('#');
  const cleanUrl = urlBeforeHash.split('?')[0];
  if (!cleanUrl) return { file: sourceFile, hash };
  let resolved = cleanUrl.startsWith('/')
    ? path.join(ROOT, cleanUrl.slice(1))
    : path.resolve(path.dirname(sourceFile), cleanUrl);
  const candidates = [resolved];
  if (cleanUrl.endsWith('/') || !path.extname(cleanUrl)) {
    candidates.push(path.join(resolved, 'index.html'));
  }
  if (!path.extname(cleanUrl)) {
    candidates.push(resolved + '.html');
  }
  const found = candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
  return { file: found || null, hash, cleanUrl };
}

const DELETED_LEGACY_HTML = [
  'about.html',
  'accessibility.html',
  'admin/portal.html',
  'assets/downloads/study/early-childhood-primary-print-pack.html',
  'career-guidance/index.html',
  'community-guidelines.html',
  'community/join/index.html',
  'contact.html',
  'cookie-policy.html',
  'copyright.html',
  'corrections-policy.html',
  'delivery-policy.html',
  'disclaimer.html',
  'editorial-policy.html',
  'education-explorer/index.html',
  'faqs.html',
  'job-opportunity-finder/index.html',
  'jobs-careers/detail/index.html',
  'jobs-careers/index.html',
  'legal-revisions.html',
  'opportunity-compass/index.html',
  'privacy.html',
  'refund-policy.html',
  'scheme-opportunity-finder/index.html',
  'schemes-benefits/index.html',
  'scholarship-guidance/index.html',
  'study-path-finder/index.html',
  'study/examinations/index.html',
  'study/index.html',
  'templates/cso-standard-page.html',
  'terms.html',
  'trust-layer/index.html'
];

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr', 'path', 'circle', 'rect', 'line',
  'polygon', 'polyline', 'ellipse', 'stop', 'use'
]);

const htmlFiles = walkHtml(ROOT);
const idsByRel = new Map();
for (const full of htmlFiles) {
  const rel = path.relative(ROOT, full);
  const txt = fs.readFileSync(full, 'utf8');
  idsByRel.set(rel, new Set([...txt.matchAll(/\sid=["']([^"']+)["']/gi)].map(m => m[1])));
}

console.log('\n=== v296 Full-Site Active HTML & Valid Links Overhaul Audit ===\n');

check('1. Zero broken internal links, zero missing assets, and zero dead #anchor targets across all HTML pages', () => {
  assert.equal(htmlFiles.length, 30, `Expected exactly 30 active canonical HTML files, found ${htmlFiles.length}`);
  const errors = [];

  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');

    const assetRefs = [
      ...[...html.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]),
      ...[...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]),
      ...[...html.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]),
      ...[...html.matchAll(/<use\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]).filter(u => !u.startsWith('#'))
    ];
    for (const raw of assetRefs) {
      const u = raw.trim();
      if (!u || /^(https?:|\/\/|mailto:|tel:|javascript:|data:)/i.test(u)) continue;
      const res = resolveDiskTarget(full, u);
      if (!res.file) errors.push(`[ASSET 404] ${rel} -> ${u}`);
    }

    for (const m of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
      const u = m[1].trim();
      if (!u || u === '#' || /^(https?:|\/\/|mailto:|tel:|javascript:|data:)/i.test(u)) continue;
      const res = resolveDiskTarget(full, u);
      if (!res.file) {
        errors.push(`[LINK 404] ${rel} -> ${u}`);
        continue;
      }
      if (res.hash) {
        const targetRel = path.relative(ROOT, res.file);
        const ids = idsByRel.get(targetRel);
        if (ids && !ids.has(res.hash)) {
          errors.push(`[DEAD ANCHOR] ${rel} -> ${u} (missing #${res.hash} in ${targetRel})`);
        }
      }
    }
  }

  assert.equal(errors.length, 0, `Broken links/assets/anchors:\n  ${errors.join('\n  ')}`);
});

check('2. Zero deleted legacy HTML files remain; zero orphaned/unlinked HTML files; clean 301 redirects configured', () => {
  const stillExists = DELETED_LEGACY_HTML.filter(rel => fs.existsSync(path.join(ROOT, rel)));
  assert.equal(stillExists.length, 0, `Legacy HTML files still exist: ${stillExists.join(', ')}`);

  // Verify every remaining HTML page is actively linked or explicitly routed
  const inboundTargets = new Set();
  for (const full of htmlFiles) {
    const srcRel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    for (const m of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
      const u = m[1].trim();
      if (!u || u === '#' || /^(https?:|\/\/|mailto:|tel:|javascript:|data:)/i.test(u)) continue;
      const res = resolveDiskTarget(full, u);
      if (res.file) {
        const tgtRel = path.relative(ROOT, res.file);
        if (tgtRel !== srcRel) inboundTargets.add(tgtRel);
      }
    }
  }

  const routingSources = [
    read('_worker.js'),
    read('sw.js'),
    read('sitemap.xml'),
    read('assets/shared-header.js'),
    read('assets/app.js'),
    read('assets/js/pages/login.js'),
    read('functions/_lib/admin-pages.js'),
    read('functions/_lib/study-library-ssr.js'),
    read('functions/_lib/ssr-shell.js')
  ].join('\n');

  const orphans = [];
  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const route = relToRoute(rel);
    const linkedByHtml = inboundTargets.has(rel);
    const routedInApp = routingSources.includes(route) || routingSources.includes('/' + rel);
    if (!linkedByHtml && !routedInApp) orphans.push(rel);
  }
  assert.equal(orphans.length, 0, `Orphaned/unlinked HTML files detected: ${orphans.join(', ')}`);

  // Verify 301 redirects in _worker.js & _redirects for key retired paths
  const workerSrc = read('_worker.js');
  const redirectsSrc = read('_redirects');
  for (const retired of ['/about.html', '/privacy.html', '/terms.html', '/disclaimer.html', '/copyright.html', '/schemes-benefits/', '/jobs-careers/', '/study/', '/career-guidance/', '/opportunity-compass/', '/contact.html', '/faqs.html']) {
    assert.ok(workerSrc.includes(`'${retired}'`), `_worker.js missing 301 redirect for ${retired}`);
    assert.ok(redirectsSrc.includes(retired.replace(/\/$/, '')), `_redirects missing 301 redirect for ${retired}`);
  }
  assert.ok(workerSrc.includes("'/404.html'"), '_worker.js must serve /404.html on unmatched HTML page requests');
  assert.ok(read('functions/_lib/admin-pages.js').includes("'/admin/portal.html'"), 'admin-pages.js must redirect /admin/portal.html to /admin/');

  // Verify core nav & SSR shell use canonical /schemes/ and /jobs/ (zero /schemes-benefits/ or /jobs-careers/ nav links)
  assert.ok(read('assets/shared-header.js').includes("url: '/schemes/'"), 'shared-header.js NAV must use canonical /schemes/');
  assert.ok(read('assets/app.js').includes("'/schemes/'"), 'app.js NAV must use canonical /schemes/');
  assert.ok(!read('functions/_lib/ssr-shell.js').includes('href="/schemes-benefits/"'), 'ssr-shell.js footer must not link /schemes-benefits/');
  assert.ok(!read('functions/_lib/ssr-shell.js').includes('href="/jobs-careers/"'), 'ssr-shell.js footer must not link /jobs-careers/');
});

check('3. Valid HTML5 structure, unique <title>, exact clean <link rel="canonical">, and balanced tags on every HTML page', () => {
  const titles = new Map();
  const problems = [];

  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    const expectedCanon = 'https://csodisha.com' + relToRoute(rel);

    if (!/^<!DOCTYPE html>/i.test(html.trimStart())) problems.push(`${rel}: missing <!DOCTYPE html>`);
    if (!/<html\b[^>]*\blang=["'][a-z-]+["']/i.test(html)) problems.push(`${rel}: missing <html lang>`);
    if (!/<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(html)) problems.push(`${rel}: missing <meta charset="UTF-8">`);
    if (!/<meta\s+[^>]*name=["']viewport["']/i.test(html)) problems.push(`${rel}: missing viewport meta`);

    const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleM || !titleM[1].trim()) {
      problems.push(`${rel}: missing <title>`);
    } else {
      const t = titleM[1].replace(/\s+/g, ' ').trim();
      if (titles.has(t)) problems.push(`${rel}: duplicate <title> "${t}" (also in ${titles.get(t)})`);
      else titles.set(t, rel);
    }

    const canonM = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
    const canonHref = canonM ? (canonM[0].match(/href=["']([^"']+)["']/i) || [])[1] : null;
    if (canonHref !== expectedCanon) {
      problems.push(`${rel}: canonical "${canonHref}" !== expected "${expectedCanon}"`);
    }

    // Tag balance check
    const stripped = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const stack = [];
    for (const m of stripped.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g)) {
      const [, closing, rawTag, , selfClose] = m;
      const tag = rawTag.toLowerCase();
      if (VOID_TAGS.has(tag) || selfClose === '/') continue;
      if (!closing) {
        stack.push(tag);
      } else if (stack.length && stack[stack.length - 1] === tag) {
        stack.pop();
      } else {
        const idx = stack.lastIndexOf(tag);
        if (idx !== -1) {
          problems.push(`${rel}: unclosed <${stack.slice(idx + 1).join(', ')}> before </${tag}>`);
          stack.splice(idx);
        } else {
          problems.push(`${rel}: stray </${tag}>`);
        }
      }
    }
    if (stack.length) problems.push(`${rel}: unclosed at EOF <${stack.join(', ')}>`);
  }

  assert.equal(problems.length, 0, `HTML5/canonical/tag issues:\n  ${problems.join('\n  ')}`);
});

check('4. Static sitemap.xml & dynamic _seo.js sitemap emit ONLY active 200-OK canonical URLs', () => {
  const sitemap = read('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  assert.ok(locs.length >= 20, `Expected >=20 canonical URLs in sitemap.xml, found ${locs.length}`);
  for (const loc of locs) {
    assert.ok(loc.startsWith('https://csodisha.com/'), `Invalid sitemap origin: ${loc}`);
    const pathname = loc.slice('https://csodisha.com'.length);
    assert.ok(!pathname.includes('?'), `Static sitemap URL must not use query params: ${loc}`);
    assert.ok(!/^\/(admin|student-dashboard|jobs-careers|schemes-benefits|study\/|career-guidance|opportunity-compass|trust-layer)\b/.test(pathname), `Disallowed/retired URL in sitemap.xml: ${loc}`);
    const res = resolveDiskTarget(path.join(ROOT, 'index.html'), pathname);
    assert.ok(res.file, `Sitemap URL does not map to an active HTML file: ${loc}`);
  }

  const seoJs = read('functions/api/content/_seo.js');
  const dynPaths = [...seoJs.matchAll(/\{\s*path:\s*'([^']+)'/g)].map(m => m[1]);
  assert.ok(dynPaths.length >= 20, `Expected >=20 STATIC_SITEMAP_ROUTES in _seo.js, found ${dynPaths.length}`);
  for (const p of dynPaths) {
    assert.ok(!/^\/(jobs-careers|schemes-benefits|study\/)/.test(p), `Retired path in _seo.js STATIC_SITEMAP_ROUTES: ${p}`);
    const res = resolveDiskTarget(path.join(ROOT, 'index.html'), p);
    assert.ok(res.file, `_seo.js STATIC_SITEMAP_ROUTES entry has no active HTML file: ${p}`);
  }
});

check('5. sw.js precache & runtime SWR lists contain only existing valid files; v296 cache version synced', () => {
  const sw = read('sw.js');
  assert.match(sw, /const CACHE_NAME = 'cso-candidate-cache-v296';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v296';/);

  const precacheBlock = (sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/) || [])[1] || '';
  const swrBlock = (sw.match(/const RUNTIME_SWR_ASSETS = \[([\s\S]*?)\];/) || [])[1] || '';
  const allSwPaths = [...(precacheBlock + '\n' + swrBlock).matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(allSwPaths.length >= 20, `Expected >=20 sw.js cached asset paths, found ${allSwPaths.length}`);
  for (const p of allSwPaths) {
    const res = resolveDiskTarget(path.join(ROOT, 'index.html'), p);
    assert.ok(res.file, `sw.js cached path does not exist on disk: ${p}`);
  }

  const ops = read('functions/_lib/ops-sentinel.js');
  assert.ok(!ops.includes("'/jobs-careers/'") && !ops.includes("'/schemes-benefits/'") && !ops.includes("'/study/'"),
    'ops-sentinel.js default warmer/core routes must use canonical /jobs/, /schemes/, /study-library/');
});

check('6. 100% strict CSP compliance across all 30 HTML files and core JS files', () => {
  const cspErrors = [];
  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    if (/\sstyle\s*=\s*["']/i.test(html)) cspErrors.push(`${rel}: inline style="" attribute`);
    if (/\son[a-z]+\s*=\s*["']/i.test(html)) cspErrors.push(`${rel}: inline on*="" handler`);
    if (/<style\b/i.test(html)) cspErrors.push(`${rel}: inline <style> tag`);
    for (const sm of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = sm[1];
      const body = sm[2].trim();
      if (body && !/type=["']application\/ld\+json["']/i.test(attrs)) {
        cspErrors.push(`${rel}: inline executable <script> block`);
      }
    }
  }
  for (const rel of ['assets/shared-header.js', 'assets/app.js', 'admin/admin.js', 'assets/js/community-portal.js', 'assets/js/careers-portal.js']) {
    const code = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      if (code.includes(bad)) cspErrors.push(`${rel}: forbidden ${bad}`);
    }
  }
  assert.equal(cspErrors.length, 0, `CSP violations found:\n  ${cspErrors.join('\n  ')}`);
});

console.log(`\n=== v296 HTML & Links Overhaul Audit Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
