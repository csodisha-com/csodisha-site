#!/usr/bin/env node

/**
 * Site-wide Link, Asset & Syntax Integrity Crawler
 * Common Sense Odisha (csodisha.com)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

// Statistics counters
const stats = {
  pagesScanned: 0,
  internalLinksVerified: 0,
  assetPathsChecked: 0,
  jsFilesSyntaxChecked: 0,
  fetchCallsChecked: 0,
  errors: []
};

// Set of verified targets to avoid redundant disk reads
const verifiedFiles = new Set();

/**
 * Recursively find all HTML files
 */
function findHtmlFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.gemini') {
        findHtmlFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Recursively find all JS files
 */
function findJsFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.gemini' && entry.name !== 'scripts') {
        findJsFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Resolve and verify a relative URL against disk
 */
function verifyRelativePath(sourceFile, rawUrl, type = 'link') {
  if (!rawUrl || rawUrl.trim() === '') return true;

  const url = rawUrl.trim();

  // Skip external URLs and protocol-relative links
  if (/^(https?:|\/\/|mailto:|tel:|javascript:|data:)/i.test(url)) {
    return true;
  }

  // Pure fragment links within the current page
  if (url.startsWith('#')) {
    return true;
  }

  // Remove fragment and query parameters
  const [urlBeforeHash, hashFragment] = url.split('#');
  const cleanUrl = urlBeforeHash.split('?')[0];
  if (!cleanUrl) return true;

  const sourceDir = path.dirname(sourceFile);
  let resolvedPath;

  if (cleanUrl.startsWith('/')) {
    resolvedPath = path.join(ROOT_DIR, cleanUrl.slice(1));
  } else {
    resolvedPath = path.resolve(sourceDir, cleanUrl);
  }

  // Resolution candidates
  const candidates = [resolvedPath];

  // If path ends with '/' or is intended as directory, try index.html
  if (cleanUrl.endsWith('/') || !path.extname(cleanUrl)) {
    candidates.push(path.join(resolvedPath, 'index.html'));
  }

  // If path lacks extension, also try .html
  if (!path.extname(cleanUrl)) {
    candidates.push(resolvedPath + '.html');
  }

  // If path is a Worker/Pages Function endpoint (/api/...), check functions/api/...
  if (cleanUrl.startsWith('/api/')) {
    const fnBase = path.join(ROOT_DIR, 'functions', cleanUrl.slice(1));
    candidates.push(fnBase + '.js');
    candidates.push(path.join(fnBase, 'index.js'));
  }

  // Worker-rendered SSR routes (no static file): /guides/, /sitemap.xml, /feed.xml, /rss.xml, /feed.json
  const isSsrGuidesRoute = type === 'link' && /^\/guides(\/[^/]*)?\/?$/.test(cleanUrl)
    && fs.existsSync(path.join(ROOT_DIR, 'functions', '_lib', 'informative-guides.js'));
  const isDynamicSeoFeedRoute = (type === 'link' || type === 'fetch') && /^\/(sitemap\.xml|feed\.xml|rss\.xml|feed\.json)$/.test(cleanUrl)
    && fs.existsSync(path.join(ROOT_DIR, 'functions', '_lib', 'syndication-feeds.js'));
  if (isSsrGuidesRoute || isDynamicSeoFeedRoute) {
    stats.internalLinksVerified++;
    return true;
  }

  const matchedCandidate = candidates.find(candidate => {
    try {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

  if (matchedCandidate) {
    if (type === 'link' && hashFragment && matchedCandidate.endsWith('.html')) {
      const targetContent = fs.readFileSync(matchedCandidate, 'utf-8');
      const idRx = new RegExp(`\\sid=["']${hashFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i');
      if (!idRx.test(targetContent)) {
        const relSource = path.relative(ROOT_DIR, sourceFile);
        stats.errors.push({
          source: relSource,
          type: 'anchor',
          reference: rawUrl,
          resolved: `${path.relative(ROOT_DIR, matchedCandidate)}#${hashFragment}`,
          status: 404
        });
        return false;
      }
    }
    verifiedFiles.add(resolvedPath);
    if (type === 'asset') stats.assetPathsChecked++;
    else stats.internalLinksVerified++;
    return true;
  } else {
    const relSource = path.relative(ROOT_DIR, sourceFile);
    stats.errors.push({
      source: relSource,
      type,
      reference: rawUrl,
      resolved: path.relative(ROOT_DIR, resolvedPath),
      status: 404
    });
    return false;
  }
}

/**
 * Audit an individual HTML file
 */
function auditHtmlFile(filePath) {
  stats.pagesScanned++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(ROOT_DIR, filePath);

  // 1. Check <link ... href="...">
  const linkMatches = content.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi);
  for (const match of linkMatches) {
    verifyRelativePath(filePath, match[1], 'asset');
  }

  // 2. Check <script ... src="...">
  const scriptMatches = content.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
  for (const match of scriptMatches) {
    verifyRelativePath(filePath, match[1], 'asset');
  }

  // 3. Check <img ... src="...">
  const imgMatches = content.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) {
    verifyRelativePath(filePath, match[1], 'asset');
  }

  // 4. Check <source ... srcset="...">
  const sourceMatches = content.matchAll(/<source\s+[^>]*srcset=["']([^"']+)["'][^>]*>/gi);
  for (const match of sourceMatches) {
    const srcList = match[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    for (const src of srcList) {
      verifyRelativePath(filePath, src, 'asset');
    }
  }

  // 5. Check SVG <use ... href="...">
  const useMatches = content.matchAll(/<use\s+[^>]*href=["']([^"']+)["'][^>]*>/gi);
  for (const match of useMatches) {
    if (!match[1].startsWith('#')) {
      verifyRelativePath(filePath, match[1], 'asset');
    }
  }

  // 6. Check <a ... href="...">
  const aMatches = content.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi);
  for (const match of aMatches) {
    verifyRelativePath(filePath, match[1], 'link');
  }
}

/**
 * Audit JavaScript files for syntax and static fetch calls
 */
function auditJsFiles(jsFiles) {
  for (const file of jsFiles) {
    const relPath = path.relative(ROOT_DIR, file);

    // 1. Syntax check
    try {
      execSync(`node -c "${file}"`, { stdio: 'pipe' });
      stats.jsFilesSyntaxChecked++;
    } catch (err) {
      stats.errors.push({
        source: relPath,
        type: 'syntax',
        reference: file,
        message: err.message
      });
    }

    // 2. Fetch calls check
    const content = fs.readFileSync(file, 'utf-8');
    const fetchMatches = content.matchAll(/fetch\s*\(\s*["'`]([^"'`$]+)["'`]/gi);
    for (const match of fetchMatches) {
      const fetchUrl = match[1];
      stats.fetchCallsChecked++;

      // If it's an API route or Worker-rendered syndication feed handled by backend, skip static file check
      if (
        fetchUrl.startsWith('/api/') ||
        fetchUrl.startsWith('api/') ||
        /^\/(feed\.json|feed\.xml|rss\.xml|sitemap\.xml)(\?|$)/i.test(fetchUrl) ||
        /^https?:\/\//i.test(fetchUrl)
      ) {
        continue;
      }

      // Check relative to ROOT_DIR, file directory, or parent page directory (if in assets/)
      let resolved = fetchUrl.startsWith('/')
        ? path.join(ROOT_DIR, fetchUrl.slice(1))
        : path.resolve(ROOT_DIR, fetchUrl);
      if (!fs.existsSync(resolved)) {
        const fileDir = path.dirname(file);
        resolved = path.resolve(fileDir, fetchUrl);
        if (!fs.existsSync(resolved) && path.basename(fileDir) === 'assets') {
          resolved = path.resolve(fileDir, '..', fetchUrl);
        }
      }

      if (fs.existsSync(resolved)) {
        stats.assetPathsChecked++;
      } else {
        stats.errors.push({
          source: relPath,
          type: 'fetch',
          reference: fetchUrl,
          resolved: path.relative(ROOT_DIR, resolved),
          status: 404
        });
      }
    }
  }
}

function runAudit() {
  console.log('====================================================');
  console.log('CS Odisha (csodisha.com) Site-Wide Integrity Audit');
  console.log('====================================================\n');

  const htmlFiles = findHtmlFiles(ROOT_DIR);
  console.log(`Discovered ${htmlFiles.length} HTML pages across site.`);

  for (const file of htmlFiles) {
    auditHtmlFile(file);
  }

  const jsFiles = findJsFiles(ROOT_DIR);
  console.log(`Discovered ${jsFiles.length} JavaScript files to audit.\n`);
  auditJsFiles(jsFiles);

  console.log('---------------- Audit Results ----------------');
  console.log(`Total HTML Pages Scanned:      ${stats.pagesScanned}`);
  console.log(`Total Internal Links Verified: ${stats.internalLinksVerified}`);
  console.log(`Total Asset Paths Checked:     ${stats.assetPathsChecked}`);
  console.log(`Fetch() API Calls Audited:     ${stats.fetchCallsChecked}`);
  console.log(`JS Files Syntax Verified:      ${stats.jsFilesSyntaxChecked}`);
  console.log(`Total 404 / Broken Errors:     ${stats.errors.length}\n`);

  if (stats.errors.length > 0) {
    console.error('FAILED: Found broken references:');
    stats.errors.forEach(err => {
      console.error(` - [${err.type.toUpperCase()}] in ${err.source}: "${err.reference}" -> not found (${err.resolved})`);
    });
    process.exit(1);
  } else {
    console.log('SUCCESS: All internal links, assets, and scripts resolved with 100% integrity!');
    process.exit(0);
  }
}

runAudit();
