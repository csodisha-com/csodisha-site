import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const dirJson = JSON.parse(fs.readFileSync(path.join(root, 'jobs-careers/generated/directory.json'), 'utf8'));
const masterNav = JSON.parse(fs.readFileSync(path.join(root, 'admin/data/master-navigation.json'), 'utf8'));
const jobsDirApi = require(path.join(root, 'assets/js/jobs-directory-data.js'));
const extMap = require(path.join(root, 'assets/js/extended-jobs-1-3-to-1-10-data.js'));

assert.equal(masterNav.folders.length, 5, 'Expected 5 clean top-level pillars in master-navigation.json');
const totalModules = masterNav.folders.reduce((s, f) => s + (Array.isArray(f.modules) ? f.modules.length : 0), 0);
assert.equal(totalModules, 0, 'Expected 0 pre-seeded child modules in clean-slate master-navigation.json');
assert.ok(Array.isArray(dirJson.sections) && dirJson.sections.length === 0, 'jobs-careers/generated/directory.json must be empty');
assert.equal(Object.keys(extMap).length, 0, 'extended-jobs-1-3-to-1-10-data.js must be an empty registry');
assert.ok(Array.isArray(jobsDirApi.DIRECTORY_ITEMS) && jobsDirApi.DIRECTORY_ITEMS.length === 0, 'DIRECTORY_ITEMS must be empty');

const extJs = fs.readFileSync(path.join(root, 'assets/js/extended-jobs-1-3-to-1-10-data.js'), 'utf8');
assert.ok(!extJs.includes('.innerHTML') && !extJs.includes('.style.'), 'CSP violation');

console.log('PASS test-extended-jobs-details-v229: Clean-slate v231 verified — 5 pillars / 0 pre-seeded modules, empty extended static registry, 100% CSP compliant.');
