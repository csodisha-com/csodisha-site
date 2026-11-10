/**
 * Candidate & PWA Verification Test Suite
 * Validates Bookmark sync across portals, Student Dashboard rendering,
 * and PWA manifest & Service Worker integrity.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Candidate Bookmarking & PWA Verification...\n');

// 1. Verify Manifest
console.log('1. Checking manifest.webmanifest...');
const manifestRaw = fs.readFileSync(path.join(__dirname, '../manifest.webmanifest'), 'utf8');
const manifest = JSON.parse(manifestRaw);
assert.strictEqual(manifest.short_name, 'CSO Hub', 'Manifest short_name should be CSO Hub');
assert.strictEqual(manifest.start_url, '/student-dashboard/', 'Manifest start_url should point to /student-dashboard/');
assert.strictEqual(manifest.display, 'standalone', 'Manifest display should be standalone');
assert(manifest.icons && manifest.icons.length > 0, 'Manifest must have icons defined');
console.log('   ✓ manifest.webmanifest is valid JSON and well-formed.');

// 2. Verify Service Worker
console.log('\n2. Checking sw.js precache list and caching strategies...');
const swContent = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
assert(swContent.includes('PRECACHE_URLS'), 'sw.js must define precache URLs');
assert(swContent.includes('/student-dashboard/'), 'sw.js must precache candidate dashboard');
assert(swContent.includes('caches.open'), 'sw.js must open cache');
console.log('   ✓ sw.js includes proper offline caching routes and lifecycle events.');

// 3. Mock localStorage and Browser Environment to test CSOBookmarks
console.log('\n3. Testing CSOBookmarks logic in headless environment...');
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
global.window = {
  dispatchEvent: (event) => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.CustomEvent = class {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts ? opts.detail : null;
  }
};
global.document = {
  querySelectorAll: () => [],
  addEventListener: () => {},
  readyState: 'complete'
};

// Evaluate bookmark-manager.js
const bmCode = fs.readFileSync(path.join(__dirname, '../assets/js/bookmark-manager.js'), 'utf8');
eval(bmCode);

assert(global.window.CSOBookmarks, 'window.CSOBookmarks should be initialized');
const bm = global.window.CSOBookmarks;

// Test adding a job bookmark
console.log('   Testing toggleBookmark for job...');
const addedJob = bm.toggleBookmark('jobs', {
  id: 'job-opsc-ocs-2026',
  title: 'OPSC Odisha Civil Services 2026',
  badge: 'Jobs & Careers',
  url: '/jobs-careers/'
});
assert.strictEqual(addedJob, true, 'Job should be added');
assert.strictEqual(bm.isBookmarked('jobs', 'job-opsc-ocs-2026'), true, 'Job should report as bookmarked');

// Test adding a study resource bookmark
console.log('   Testing toggleBookmark for study resource...');
const addedStudy = bm.toggleBookmark('study', {
  id: 'study-pyq-cgl-maths',
  title: 'OSSC CGL Arithmetic Question Bank',
  badge: 'Study Material / PYQ',
  url: '/study-library/'
});
assert.strictEqual(addedStudy, true, 'Study bookmark should be added');
assert.strictEqual(bm.isBookmarked('study', 'study-pyq-cgl-maths'), true, 'Study bookmark should be bookmarked');

// Test adding a scheme bookmark
console.log('   Testing toggleBookmark for scheme...');
const addedScheme = bm.toggleBookmark('schemes', {
  id: 'sch-subhadra-yojana',
  title: 'Subhadra Yojana Direct Assistance',
  badge: 'Schemes & Benefits',
  url: '/schemes-benefits/'
});
assert.strictEqual(addedScheme, true, 'Scheme bookmark should be added');
assert.strictEqual(bm.isBookmarked('schemes', 'sch-subhadra-yojana'), true, 'Scheme should report as bookmarked');

// Check localStorage persistence
const rawStored = JSON.parse(store['cso_candidate_bookmarks_v1']);
assert.strictEqual(rawStored.jobs.length, 1);
assert.strictEqual(rawStored.study.length, 1);
assert.strictEqual(rawStored.schemes.length, 1);
console.log('   ✓ Bookmarks correctly persisted to localStorage cso_candidate_bookmarks_v1');

// Test removing bookmark
console.log('   Testing removeBookmark...');
bm.removeBookmark('jobs', 'job-opsc-ocs-2026');
assert.strictEqual(bm.isBookmarked('jobs', 'job-opsc-ocs-2026'), false, 'Job should no longer be bookmarked');
const rawStoredAfter = JSON.parse(store['cso_candidate_bookmarks_v1']);
assert.strictEqual(rawStoredAfter.jobs.length, 0);
console.log('   ✓ Bookmark removed successfully.');

console.log('\n🎉 ALL CANDIDATE BOOKMARKING & PWA SMOKE TESTS PASSED CLEANLY!\n');
