// Site-wide uniformity guardrail (v151). Usage: node scripts/audit-site-uniformity.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const SKIP = new Set(['node_modules', '.git', '.wrangler', 'dist']);
const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) files.push(p);
  }
})(root);
const errors = [];
const scriptsSeen = new Set();
const NAV_RE = /<nav\b[^>]*id=["']cso-main-navbar["'][^>]*>[\s\S]*?<\/nav>/i;
const normalizeNavMarkup = (navHtml) => String(navHtml || '')
  .replace(/\s+aria-current=["']page["']/gi, '')
  .replace(/class=["']cso-nav-home\s+on["']/gi, 'class="cso-nav-home"')
  .replace(/\s+/g, ' ')
  .trim();
const indexHtmlSrc = readFileSync(join(root, 'index.html'), 'utf8');
const indexNavMatch = indexHtmlSrc.match(NAV_RE);
const canonicalNavNorm = indexNavMatch ? normalizeNavMarkup(indexNavMatch[0]) : '';
if (!canonicalNavNorm) {
  errors.push('index.html: missing canonical #cso-main-navbar');
} else {
  for (const stageId of ['cso-mobile-drawer-backdrop', 'cso-jobs-stage1', 'cso-careers-stage1', 'cso-schemes-stage1', 'cso-study-stage1', 'cso-community-stage1']) {
    if (!canonicalNavNorm.includes(`id="${stageId}"`)) {
      errors.push(`index.html: canonical #cso-main-navbar missing #${stageId}`);
    }
  }
}
for (const f of files) {
  const rel = relative(root, f);
  const h = readFileSync(f, 'utf8');
  const bad = (m) => errors.push(`${rel}: ${m}`);
  const isAdmin = rel.startsWith('admin/');
  const isRedirect = /http-equiv=["']refresh["']/i.test(h);
  // index.html is the canonical shell and hydrates via assets/app.js; every other page uses shared-header.js
  const shell = !isAdmin && !isRedirect;
  const auto = /data-cso-auto-shell/.test(h);
  const autoF = /data-cso-auto-footer/.test(h);
  if (shell && !/href=["']\/assets\/style\.css/.test(h)) bad('missing /assets/style.css');
  if (shell && rel !== 'index.html' && !/src=["']\/assets\/shared-header\.js[^"']*["'][^>]*defer|defer[^>]*src=["']\/assets\/shared-header\.js/.test(h)) bad('missing deferred /assets/shared-header.js');
  if (shell && !auto && !(/id=["']header-top["']/.test(h) && /id=["']cso-main-navbar["']/.test(h))) bad('missing #header-top/#cso-main-navbar (or data-cso-auto-shell)');
  if (shell && !auto && canonicalNavNorm) {
    const mNav = h.match(NAV_RE);
    if (!mNav || normalizeNavMarkup(mNav[0]) !== canonicalNavNorm) {
      bad('#cso-main-navbar dropdown structure/links diverged from index.html');
    }
  }
  if (shell && !auto && !/cso-logo-96\.webp/.test(h)) bad('missing cso-logo-96.webp');
  if (/class=["'][^"']*(?<![\w-])(brand-mark|logo-square|cs-badge|cso-badge)(?![\w-])/.test(h) || />\s*CSO?\s*</.test(h)) bad('legacy CS/CSO badge');
  if (shell && !autoF && !(/cso-footer-zone1/.test(h) && /cso-footer-zone2/.test(h) && /cso-footer-zone3/.test(h))) bad('missing 3-zone portal footer (or data-cso-auto-footer)');
  if (/\sstyle\s*=\s*["']/i.test(h)) bad('inline style="" attribute');
  if (/<style[\s>]/i.test(h)) bad('inline <style> block (CSP style-src self): extract to /assets/css/pages/*.css');
  for (const m of h.matchAll(/<script\b([^>]*)>/gi)) if (!/\bsrc\s*=/.test(m[1]) && !/type=["']application\/(ld\+json|json)["']/.test(m[1])) bad('inline <script>');
  for (const m of h.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) if (m[1].startsWith('/')) scriptsSeen.add(m[1].split('?')[0]);
}
for (const s of scriptsSeen) {
  const p = join(root, s);
  if (existsSync(p) && /\.innerHTML\b/.test(readFileSync(p, 'utf8'))) errors.push(`${s}: uses .innerHTML`);
}

// v153: server-rendered HTML templates in functions/**/*.js (files that emit a full <!DOCTYPE html> document)
const fnFiles = [];
(function walkFn(d) {
  if (!existsSync(d)) return;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walkFn(p); else if (e.name.endsWith('.js')) fnFiles.push(p);
  }
})(join(root, 'functions'));
for (const f of fnFiles) {
  const rel = relative(root, f);
  const src = readFileSync(f, 'utf8');
  if (!/<!DOCTYPE html/i.test(src)) continue;
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const bad = (m) => errors.push(`${rel}: ${m}`);
  if (/Current Affairs\s*<\/a>/.test(code)) bad('legacy "Current Affairs" nav header in SSR template');
  if (/<span[^>]*(badge|brand-mark)[^>]*>\s*CSO?\s*<\/span>/.test(code)) bad('legacy green square CSO badge in SSR template');
  if (/<style[\s>]/i.test(code)) bad('inline <style> in SSR template');
  if (/<script(?![^>]*(\bsrc=|application\/(ld\+)?json))[^>]*>/i.test(code.replace(/\/<script[^/]*\//g, ''))) bad('inline <script> in SSR template');
  if (/\sstyle=\\?["']/i.test(code)) bad('inline style="" in SSR template');
  if (/\.innerHTML\b/.test(code)) bad('.innerHTML in SSR template');
  if (!/ssr-shell\.js/.test(code) && !/cso-main-navbar/.test(code)) bad('SSR template does not use canonical shell (functions/_lib/ssr-shell.js)');
}
// v450: verify SSR canonical shell (functions/_lib/ssr-shell.js) and client nav scripts (app.js & shared-header.js) match index.html
const ssrShellSrc = readFileSync(join(root, 'functions/_lib/ssr-shell.js'), 'utf8');
const ssrNavMatch = ssrShellSrc.match(NAV_RE);
if (!ssrNavMatch || (canonicalNavNorm && normalizeNavMarkup(ssrNavMatch[0]) !== canonicalNavNorm)) {
  errors.push('functions/_lib/ssr-shell.js: CSO_SHELL_HEADER #cso-main-navbar diverged from index.html');
}
const extractCanonicalDropdowns = (src, label) => {
  const m = src.match(/const\s+CSO_CANONICAL_NAV_DROPDOWNS\s*=\s*(\{[\s\S]*?\n\s*\});/);
  if (!m) { errors.push(`${label}: missing CSO_CANONICAL_NAV_DROPDOWNS single-source definition`); return null; }
  try {
    return new Function(`return (${m[1]});`)();
  } catch (e) {
    errors.push(`${label}: failed to parse CSO_CANONICAL_NAV_DROPDOWNS (${e.message})`);
    return null;
  }
};
const appDropdowns = extractCanonicalDropdowns(readFileSync(join(root, 'assets/app.js'), 'utf8'), 'assets/app.js');
const sharedDropdowns = extractCanonicalDropdowns(readFileSync(join(root, 'assets/shared-header.js'), 'utf8'), 'assets/shared-header.js');
if (appDropdowns && sharedDropdowns) {
  if (JSON.stringify(appDropdowns) !== JSON.stringify(sharedDropdowns)) {
    errors.push('assets/app.js vs assets/shared-header.js: CSO_CANONICAL_NAV_DROPDOWNS mismatch');
  } else {
    const htmlHrefs = Array.from(canonicalNavNorm.matchAll(/class="cso-js1-link"\s+href="([^"]+)"/g)).map((x) => x[1]);
    const jsHrefs = ['jobs', 'careers', 'schemes', 'study', 'community'].flatMap((k) => (appDropdowns[k] || []).map((it) => it.href));
    if (JSON.stringify(htmlHrefs) !== JSON.stringify(jsHrefs)) {
      errors.push(`Canonical navbar dropdown href mismatch between index.html (${htmlHrefs.join(', ')}) and JS (${jsHrefs.join(', ')})`);
    }
  }
}
console.log(`Audited ${fnFiles.length} functions/*.js files for SSR shell compliance.`);
console.log(`Audited ${files.length} HTML files.`);
if (errors.length) { console.error(errors.join('\n')); console.error(`FAIL: ${errors.length} issue(s)`); process.exit(1); }
console.log('PASS: site uniformity OK');
