#!/usr/bin/env node
/**
 * Regression & Contract Audit Suite — v456 (/careers/ Visual Micro-Tweaks:
 * Full-Width 3-Column Desktop Grid, Header Top-Right '+ Compare' Pill,
 * Single-Line Non-Wrapping Quick-Links Strip, Permanent Ask CSOdisha Bar,
 * Strict CSP & 100% var(--cso-*) 4-Theme Semantic Tokens)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const portalCode = read('assets/js/careers-portal.js');
const careersHtml = read('careers/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// 1. Full-Width 3-Column Grouped & Desktop Grid (100% var(--cso-*) tokens, zero hardcoded hex)
const v456Idx = styleCss.indexOf('v456 — /careers/');
assert.ok(v456Idx > 0, 'assets/style.css must contain v456 /careers/ visual micro-tweaks block');
const v456Css = styleCss.slice(v456Idx);
assert.doesNotMatch(v456Css, /#[0-9a-fA-F]{3,8}\b/, 'v456 CSS block must contain ZERO hardcoded hex colors');
assert.match(v456Css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, 'Desktop >= 1100px must use 3-column equal grid');
assert.match(v456Css, /@media \(max-width:\s*1099px\)[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, 'Tablet 720px-1099px must use 2-column equal grid');
assert.match(v456Css, /@media \(max-width:\s*719px\)[\s\S]*grid-template-columns:\s*1fr/, 'Mobile < 720px must use 1-column grid');

// 2. '+ Compare' pill moved to card header top-right; footer holds only View Full Roadmap + Save
assert.match(portalCode, /crp-card-head-row/, 'Card must render .crp-card-head-row header');
assert.match(portalCode, /crp-compare-btn--header/, 'Card header must render compact .crp-compare-btn--header pill');
assert.match(portalCode, /headRow\.append\(badges,\s*cmpBtn\)/, '+ Compare button must be appended to card header row alongside badges');
assert.match(portalCode, /foot\.append\(openBtn,\s*saveBtn\)/, 'Card footer must contain only View Full Roadmap and Save buttons');
assert.doesNotMatch(portalCode, /foot\.append\([^)]*cmpBtn/, '+ Compare button must NOT remain inside bottom card footer');
assert.match(v456Css, /\.crp-card-head-row[\s\S]*justify-content:\s*space-between/, 'Card header row must align badges left and Compare right');
assert.match(v456Css, /\.crp-card-foot--v456[\s\S]*flex:\s*1 1 auto/, 'View Full Roadmap button must flex: 1 inside footer row');

// 3. Single-Line Non-Wrapping Quick-Links Strip above footer
assert.match(portalCode, /crp-card-shortcuts--v456/, 'Card must render single-line .crp-card-shortcuts--v456 strip');
assert.match(portalCode, /crp-shortcut-sep/, 'Quick-links strip must separate Live Jobs · Salary Calc · Syllabus');
assert.match(v456Css, /\.crp-card-shortcuts--v456[\s\S]*flex-wrap:\s*nowrap[\s\S]*white-space:\s*nowrap[\s\S]*overflow:\s*hidden[\s\S]*text-overflow:\s*ellipsis/, 'Quick-links strip must be single-line non-wrapping with ellipsis');

// 4. Permanent Ask CSOdisha Bar, Strict CSP & v456 Cache Sync
assert.match(careersHtml, /semantic-search\.js\?v=20261128v457/, 'careers/index.html must preserve permanent Ask CSOdisha bar');
assert.doesNotMatch(portalCode, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/i, 'careers-portal.js must not use unsafe markup injection');
assert.doesNotMatch(portalCode, /\.style\.[a-zA-Z]/, 'careers-portal.js must not mutate inline styles');
assert.doesNotMatch(careersHtml, /\sstyle\s*=\s*["']/i, 'careers/index.html must have zero inline style=""');
assert.doesNotMatch(careersHtml, /\son[a-z]+\s*=\s*["']/i, 'careers/index.html must have zero inline on*=""');
assert.match(swJs, /CACHE_NAME\s*=\s*'cso-candidate-cache-v457'/, 'sw.js must be bumped to cso-candidate-cache-v457');
assert.match(opsJs, /ACTIVE_SW_CACHE_VERSION\s*=\s*'cso-candidate-cache-v457'/, 'ops-sentinel.js must be bumped to cso-candidate-cache-v457');

console.log('PASS: v456 /careers/ 3-column grid, header Compare pill, single-line quick-links strip, CSP & SW cache audit passed.');
