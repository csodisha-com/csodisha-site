import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const dirJson = JSON.parse(fs.readFileSync(path.join(root, 'jobs-careers/generated/directory.json'), 'utf8'));
const masterNav = JSON.parse(fs.readFileSync(path.join(root, 'admin/data/master-navigation.json'), 'utf8'));
const jobsDirApi = require(path.join(root, 'assets/js/jobs-directory-data.js'));
const od12Map = require(path.join(root, 'assets/js/odisha-jobs-1-2-data.js'));

// 1. Clean-slate v231: 5 clean top-level pillars, 0 pre-seeded child modules
assert.equal(masterNav.folders.length, 5, 'Expected 5 clean top-level pillars in master-navigation.json');
const totalModules = masterNav.folders.reduce((sum, f) => sum + (Array.isArray(f.modules) ? f.modules.length : 0), 0);
assert.equal(totalModules, 0, 'Expected 0 pre-seeded child modules in clean-slate master-navigation.json');

// 2. Static directory & Odisha job seed registries purged to lightweight empty shells
assert.ok(Array.isArray(dirJson.sections) && dirJson.sections.length === 0, 'jobs-careers/generated/directory.json must be empty');
assert.equal(Object.keys(od12Map).length, 0, 'odisha-jobs-1-2-data.js must be an empty registry');
assert.equal(typeof jobsDirApi.getItemBySlug, 'function', 'jobs-directory-data.js must preserve helper API');
assert.equal(typeof jobsDirApi.slugifyBranch, 'function', 'jobs-directory-data.js must preserve slugifyBranch');

// 3. HTML script wiring & strict CSP compliance (no broken script tags, no .innerHTML / .style.)
const detailHtml = fs.readFileSync(path.join(root, 'jobs-careers/detail/index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'jobs-careers/index.html'), 'utf8');
assert.match(detailHtml, /odisha-jobs-1-2-data\.js/);
assert.match(indexHtml, /odisha-jobs-1-2-data\.js/);

const odJs = fs.readFileSync(path.join(root, 'assets/js/odisha-jobs-1-2-data.js'), 'utf8');
assert.ok(!odJs.includes('.innerHTML') && !odJs.includes('.style.'), 'CSP violation in odisha-jobs-1-2-data.js');

// 4. Auto-seeding loop removed from _public.js
const publicJs = fs.readFileSync(path.join(root, 'functions/api/content/_public.js'), 'utf8');
assert.ok(!publicJs.includes('ODISHA_1_2_SEEDS'), 'ODISHA_1_2_SEEDS auto-seeder must be removed from _public.js');
assert.ok(!publicJs.includes('ensureVerifiedUpscSeedNotice'), 'ensureVerifiedUpscSeedNotice must be removed from _public.js');

console.log('PASS test-odisha-jobs-details-v227: Clean-slate v231 verified — 5 pillars / 0 pre-seeded modules, empty Odisha static registry, auto-seeder removed, 100% CSP compliant.');
