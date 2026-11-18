// v156: verify Early Childhood & Primary Education showcase, assets, admin registration & CSP compliance.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  EARLY_CHILDHOOD_PORTALS,
  EARLY_CHILDHOOD_MCQS,
  EARLY_CHILDHOOD_SEED_ITEMS,
  renderEarlyChildhoodShowcaseHtml
} from '../functions/_lib/study-early-childhood-pack.js';

const root = resolve(new URL('..', import.meta.url).pathname);

// 1. Static assets exist and are non-empty
const requiredFiles = [
  'assets/img/study/nep-nipun-foundational-stage.svg',
  'assets/downloads/study/early-childhood-primary-education-complete-guide.odt',
  'assets/downloads/study/nipun-odisha-fln-checklist.ods',
  'assets/downloads/study/early-childhood-primary-print-pack.html'
];
for (const rel of requiredFiles) {
  const p = join(root, rel);
  assert.ok(existsSync(p), `missing ${rel}`);
  assert.ok(statSync(p).size > 200, `${rel} is too small`);
}

// 2. Showcase HTML content checks
const html = renderEarlyChildhoodShowcaseHtml('early-childhood-primary-education', 'Early Childhood & Primary Education');
assert.ok(html.includes('/assets/img/study/nep-nipun-foundational-stage.svg'), 'missing SVG diagram');
assert.ok(html.includes('early-childhood-primary-education-complete-guide.odt'), 'missing ODT download');
assert.ok(html.includes('nipun-odisha-fln-checklist.ods'), 'missing ODS download');
assert.ok(html.includes('early-childhood-primary-print-pack.html'), 'missing Print/PDF pack');
assert.ok(html.includes('Unit 1 — NEP 2020'), 'missing Unit 1');
assert.ok(html.includes('Unit 2 — OSEPA Class 1–5'), 'missing Unit 2');
assert.ok(html.includes('Unit 3 — ECCE'), 'missing Unit 3');
assert.ok(html.includes('Unit 4 — Practice &amp; Self-Test Capsule (8 Exam MCQs)'), 'missing Unit 4');
assert.ok(html.includes('cso-sl-selftest-toggle'), 'missing self-test toggle button');
assert.equal(EARLY_CHILDHOOD_MCQS.length, 8, 'expected 8 MCQs');
assert.equal(EARLY_CHILDHOOD_PORTALS.length, 7, 'expected 7 official portals');
assert.ok(EARLY_CHILDHOOD_SEED_ITEMS.length >= 5, 'expected >= 5 seeded items');
for (const portal of EARLY_CHILDHOOD_PORTALS) {
  assert.ok(html.includes(portal.url), `missing portal ${portal.url}`);
}

// 3. SSR template checks (zero legacy strings)
const ssrSrc = readFileSync(join(root, 'functions/_lib/study-library-ssr.js'), 'utf8');
assert.ok(!ssrSrc.includes('Sibling Directories'), 'study-library-ssr.js still has Sibling Directories');
assert.ok(ssrSrc.includes('Related Study Guides &amp; Textbooks'), 'missing Related Study Guides & Textbooks');
assert.ok(ssrSrc.includes('Curated Guides'), 'missing Curated Guides stats label');
assert.ok(!ssrSrc.includes('cso-sl-pub-breadcrumbs'), 'redundant breadcrumb bar still present');

// 4. Admin & Studio registration checks
const studioSrc = readFileSync(join(root, 'functions/_lib/study-library-studio.js'), 'utf8');
assert.ok(studioSrc.includes('EARLY_CHILDHOOD_SEED_ITEMS'), 'study-library-studio.js missing EARLY_CHILDHOOD_SEED_ITEMS');
assert.ok(studioSrc.includes('early-childhood-playgroup-kindergarten'), 'missing playgroup folder seed');
const adminCmsSrc = readFileSync(join(root, 'admin/cms/cms.js'), 'utf8');
assert.ok(adminCmsSrc.includes("'early-childhood'") && adminCmsSrc.includes('studyLibraryStudioPanel'), 'admin/cms/cms.js missing early-childhood studio panel');

// 5. CSP checks on new/modified files
for (const rel of [
  'functions/_lib/study-early-childhood-pack.js',
  'study-library/assets/ssr-actions.js',
  'assets/downloads/study/early-childhood-primary-print-pack.html'
]) {
  const raw = readFileSync(join(root, rel), 'utf8');
  const code = raw.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/<style[\s>]/i.test(code), `${rel}: inline <style>`);
  assert.ok(!/\sstyle\s*=\s*["']/i.test(code), `${rel}: inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(code), `${rel}: .innerHTML`);
}

console.log('PASS: Early Childhood & Primary Education showcase v156 checks passed');
