// v155: verify clean topic titles, zero internal Module/Sub-Directories/DIRECTORY labels, and 100% CSP compliance.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { cleanTopicTitle, decorateMain } from '../functions/_lib/ssr-shell.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const errors = [];

// 1. Unit tests for cleanTopicTitle and decorateMain
assert.equal(cleanTopicTitle('Module #01 — Government &amp; Public Welfare'), 'Government & Public Welfare');
assert.equal(cleanTopicTitle('Track 02: Jobs &amp; Recruitment'), 'Jobs & Recruitment');
assert.equal(cleanTopicTitle('Directory — Schemes'), 'Schemes');
assert.equal(cleanTopicTitle('Section 1 · Government & Public Welfare'), 'Government & Public Welfare');

const decorated = decorateMain('<main><h1>Module #01 — Government &amp; Public Welfare</h1><h2>Categories &amp; Focus Areas (4)</h2></main>');
const pillMatch = /class="cso-dir-context-pill"[^>]*>([^<]+)</.exec(decorated);
assert.ok(pillMatch && pillMatch[1] === 'Government &amp; Public Welfare', 'context pill should contain clean entity');
assert.ok(!pillMatch[1].includes('Module #01'), 'context pill should strip Module #01');
assert.ok(!decorated.includes('&amp;amp;'), 'context pill should not double-escape entities');

// 2. Scan SSR builders in functions/_lib/
const ssrFiles = [
  'functions/_lib/ssr-shell.js',
  'functions/_lib/schemes-directory-ssr.js',
  'functions/_lib/jobs-directory-ssr.js',
  'functions/_lib/study-library-ssr.js',
  'functions/_lib/community-directory-ssr.js',
  'functions/_lib/site-pages.js'
];
for (const rel of ssrFiles) {
  const raw = readFileSync(join(root, rel), 'utf8');
  const src = raw.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  if (/Sub-Director(y|ies)/.test(src)) errors.push(`${rel}: contains Sub-Directories/Sub-Directory`);
  if (/>DIRECTORY</.test(src)) errors.push(`${rel}: contains >DIRECTORY< badge`);
  if (/Module #\$\{meta\.num\}/.test(src)) errors.push(`${rel}: contains Module #\${meta.num} prefix`);
  if (/<style[\s>]/i.test(src)) errors.push(`${rel}: contains inline <style>`);
  if (/\sstyle=\\?["']/i.test(src)) errors.push(`${rel}: contains inline style=""`);
  if (/\.innerHTML\b/.test(src)) errors.push(`${rel}: contains .innerHTML`);
}

// 3. Scan static .html and explorer .js files
const SKIP = new Set(['node_modules', '.git', '.wrangler', 'dist', 'admin', 'scripts']);
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.html') && !p.includes('/assets/')) continue;
    if (!e.name.endsWith('.html') && !e.name.endsWith('.js')) continue;
    const rel = relative(root, p);
    const src = readFileSync(p, 'utf8');
    if (/>DIRECTORY</.test(src)) errors.push(`${rel}: contains >DIRECTORY<`);
    if (/Module #01\s*[—–\-:]/.test(src)) errors.push(`${rel}: contains Module #01 prefix`);
    if (e.name.endsWith('.html')) {
      if (/<style[\s>]/i.test(src)) errors.push(`${rel}: inline <style>`);
      if (/\sstyle\s*=\s*["']/i.test(src)) errors.push(`${rel}: inline style=""`);
      for (const m of src.matchAll(/<script\b([^>]*)>/gi)) {
        if (!/\bsrc\s*=/.test(m[1]) && !/type=["']application\/(ld\+json)["']/.test(m[1])) {
          errors.push(`${rel}: inline <script>`);
        }
      }
    } else if (e.name.endsWith('.js') && !rel.startsWith('assets/vendor/')) {
      if (/\.innerHTML\b/.test(src)) errors.push(`${rel}: uses .innerHTML`);
    }
  }
})(root);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: clean titles & CSP v155 checks passed');
