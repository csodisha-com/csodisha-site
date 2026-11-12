#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'admin', 'site-manifest.json');
const SKIP_DIRS = new Set(['admin', 'node_modules', '.git', '.wrangler', 'functions', 'migrations', 'scripts']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function extractTag(html, re) {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function toRoute(rel) {
  const posix = rel.split(path.sep).join('/');
  if (posix === 'index.html') return '/';
  if (posix.endsWith('/index.html')) return '/' + posix.slice(0, -'index.html'.length);
  return '/' + posix;
}

function classify(route) {
  if (/^\/(login|signup|reset-password|student-dashboard|opportunity-compass|job-opportunity-finder|scheme-opportunity-finder|study-path-finder|education-explorer|career-guidance|scholarship-guidance|community)/.test(route)) {
    return 'Candidate Workspace';
  }
  if (/^\/(about|contact|faqs|support|trust-layer|privacy|terms|disclaimer|copyright|cookie-policy|refund-policy|delivery-policy|editorial-policy|corrections-policy|community-guidelines|accessibility|legal-revisions)/.test(route)) {
    return 'Information & Legal';
  }
  return 'Core Portal';
}

const files = walk(ROOT).sort();
const pages = files.map((filePath) => {
  const rel = path.relative(ROOT, filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const route = toRoute(rel);
  const title = extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || route;
  const description =
    extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    extractTag(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
    '';

  return {
    route,
    file: rel.split(path.sep).join('/'),
    title,
    description,
    category: classify(route),
    lastModified: stat.mtime.toISOString()
  };
});

fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), total: pages.length, pages }, null, 2) + '\n');
console.log(`Generated ${OUT} with ${pages.length} pages.`);
