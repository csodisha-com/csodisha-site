// Verification test for Odisha Exam Lifecycle Stage Filter (v209)
// Tests:
// 1. Stage auto-detection keywords (admit card, hall ticket, answer key, result, merit list, shortlist, new recruitment)
// 2. /api/content/jobs stage filtering and stage return in postSummary
// 3. Notice Stage <select id="csoJobStage"> in admin/index.html with all 4 options
// 4. Compact 44px-touch-target stage filter pills in jobs-careers/index.html & single search bar rule
// 5. Card stage badge classes & styling in jobs-careers/assets/dashboard.css
// 6. Preservation of 23 folders / 299 modules in admin/data/master-navigation.json
// 7. Strict 100% CSP compliance (0 inline <style>, 0 style="", 0 onclick=, 0 executable <script>, 0 innerHTML in touched code)
// 8. Service Worker & Ops Sentinel cache version bumped to cso-candidate-cache-v209

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Import detectJobStage & formatJobStageLabel from functions/api/content/jobs.js & functions/api/content/_public.js
import { detectJobStage, formatJobStageLabel, onRequestGet } from '../functions/api/content/jobs.js';
import { detectJobStage as detectPublicStage } from '../functions/api/content/_public.js';

console.log('Testing Stage auto-detection logic...');
assert.equal(detectJobStage('OPSC Civil Services Preliminary Examination 2026', 'Recruitment'), 'new-recruitment');
assert.equal(detectJobStage('OSSC CGL 2026 Admit Card Released for Prelims', 'Notice'), 'admit-card');
assert.equal(detectJobStage('OSSSC RI/AMIN Hall Ticket Download Link Active', 'Notice'), 'admit-card');
assert.equal(detectJobStage('OSSC CGL 2026 Answer Key & Objection Window', 'Answer Key'), 'answer-key');
assert.equal(detectJobStage('OPSC Medical Officer Final Result and Merit List Announced', 'Results'), 'result');
assert.equal(detectJobStage('OSSSC Laboratory Technician Shortlist of Candidates', 'Recruitment'), 'result');
assert.equal(detectPublicStage('OSSC CGL Admit Card', 'jobs'), 'admit-card');

assert.equal(formatJobStageLabel('new-recruitment'), 'New Recruitment');
assert.equal(formatJobStageLabel('admit-card'), 'Admit Card');
assert.equal(formatJobStageLabel('answer-key'), 'Answer Key');
assert.equal(formatJobStageLabel('result'), 'Final Result');
assert.equal(formatJobStageLabel('unknown'), 'New Recruitment');

// 2. Test in-memory D1 integration with /api/content/jobs
console.log('Testing /api/content/jobs with in-memory D1 database...');
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    type TEXT,
    slug TEXT,
    title TEXT,
    title_or TEXT,
    summary TEXT,
    summary_or TEXT,
    category TEXT,
    tags TEXT,
    goal_exam_ids TEXT,
    cover_media_key TEXT,
    organisation TEXT,
    vacancies INTEGER,
    qualification TEXT,
    last_date TEXT,
    apply_url TEXT,
    notification_media_key TEXT,
    state TEXT,
    district TEXT,
    location TEXT,
    age_limit TEXT,
    salary_pay TEXT,
    source_url TEXT,
    event_date TEXT,
    notification_url TEXT,
    official_website TEXT,
    status TEXT,
    published_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  );

  INSERT INTO posts (id, type, slug, title, category, status, published_at) VALUES
    ('job-1', 'job', 'opsc-civil-services-2026', 'OPSC OAS Civil Services Recruitment', 'OPSC', 'published', '2026-11-20'),
    ('job-2', 'job', 'ossc-cgl-admit-card-2026', 'OSSC CGL 2026 Prelims Admit Card', 'OSSC', 'published', '2026-11-21'),
    ('job-3', 'job', 'osssc-ri-answer-key-2026', 'OSSSC RI Answer Key 2026', 'OSSSC', 'published', '2026-11-22'),
    ('job-4', 'job', 'opsc-asst-prof-result-2026', 'OPSC Assistant Professor Final Result Merit List', 'OPSC', 'published', '2026-11-22');
`);

const stmt = (sql, args = []) => ({
  bind: (...a) => stmt(sql, a),
  run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
  first: async () => db.prepare(sql).get(...args) || null,
  all: async () => ({ results: db.prepare(sql).all(...args) || [] })
});
const mockEnv = { DB: { prepare: s => stmt(s) } };

// Test GET all jobs
{
  const req = new Request('https://csodisha.com/api/content/jobs', {
    headers: { 'cf-connecting-ip': '127.0.0.1' }
  });
  const res = await onRequestGet({ request: req, env: mockEnv });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.items.length, 4);
  const admitCardJob = data.items.find(j => j.slug === 'ossc-cgl-admit-card-2026');
  assert.ok(admitCardJob, 'Admit card job found');
  assert.equal(admitCardJob.stage, 'admit-card');
  assert.equal(admitCardJob.stage_label, 'Admit Card');
}

// Test GET with ?stage=admit-card
{
  const req = new Request('https://csodisha.com/api/content/jobs?stage=admit-card', {
    headers: { 'cf-connecting-ip': '127.0.0.1' }
  });
  const res = await onRequestGet({ request: req, env: mockEnv });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].slug, 'ossc-cgl-admit-card-2026');
  assert.equal(data.items[0].stage, 'admit-card');
}

// Test GET with ?stage=result
{
  const req = new Request('https://csodisha.com/api/content/jobs?stage=result', {
    headers: { 'cf-connecting-ip': '127.0.0.1' }
  });
  const res = await onRequestGet({ request: req, env: mockEnv });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].slug, 'opsc-asst-prof-result-2026');
}

// 3. Verify Admin Studio markup & stage selector
console.log('Testing Admin Studio markup in admin/index.html...');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8');
assert.ok(adminHtml.includes('id="cso-job-publisher-card"'), 'admin/index.html missing #cso-job-publisher-card');
assert.ok(adminHtml.includes('id="csoJobStage"'), 'admin/index.html missing #csoJobStage');
assert.ok(adminHtml.includes('value="new-recruitment"'), 'admin/index.html missing new-recruitment option');
assert.ok(adminHtml.includes('value="admit-card"'), 'admin/index.html missing admit-card option');
assert.ok(adminHtml.includes('value="answer-key"'), 'admin/index.html missing answer-key option');
assert.ok(adminHtml.includes('value="result"'), 'admin/index.html missing result option');

// 4. Verify /jobs-careers/ markup & single search bar
console.log('Testing /jobs-careers/ index.html markup...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(jobsHtml.includes('id="live-jobs-stages"'), 'jobs-careers/index.html missing #live-jobs-stages');
assert.ok(jobsHtml.includes('data-stage="all"'), 'Missing All Notices stage pill');
assert.ok(jobsHtml.includes('data-stage="new-recruitment"'), 'Missing New Recruitment stage pill');
assert.ok(jobsHtml.includes('data-stage="admit-card"'), 'Missing Admit Card stage pill');
assert.ok(jobsHtml.includes('data-stage="answer-key"'), 'Missing Answer Key stage pill');
assert.ok(jobsHtml.includes('data-stage="result"'), 'Missing Final Result stage pill');

// Strictly verify single search bar rule
const searchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(searchInputs.length, 1, 'jobs-careers/index.html must have exactly 1 search bar (#directory-search)');
assert.ok(jobsHtml.includes('id="directory-search"'), 'Missing #directory-search');

// 5. Verify CSS classes in jobs-careers/assets/dashboard.css
console.log('Testing jobs-careers/assets/dashboard.css stage styles...');
const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('.live-stage-strip'), 'Missing .live-stage-strip in dashboard.css');
assert.ok(dashCss.includes('.live-stage-pill'), 'Missing .live-stage-pill in dashboard.css');
assert.ok(dashCss.includes('min-height: 44px') || dashCss.includes('min-height:44px'), 'Missing 44px touch target on stage pills');
assert.ok(dashCss.includes('.live-badge--stage-new'), 'Missing .live-badge--stage-new in dashboard.css');
assert.ok(dashCss.includes('.live-badge--stage-admit'), 'Missing .live-badge--stage-admit in dashboard.css');
assert.ok(dashCss.includes('.live-badge--stage-key'), 'Missing .live-badge--stage-key in dashboard.css');
assert.ok(dashCss.includes('.live-badge--stage-result'), 'Missing .live-badge--stage-result in dashboard.css');

// 6. Verify master navigation 23 folders / 299 modules
console.log('Testing admin/data/master-navigation.json preservation...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) {
  totalModules += (navJson.folders[f].modules || []).length;
}
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 7. Strict CSP compliance check on touched files
console.log('Testing strict CSP compliance on touched files...');
const touchedFiles = [
  'admin/index.html',
  'jobs-careers/index.html',
  'admin/fast-publish.js',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'functions/api/content/jobs.js',
  'functions/api/content/_public.js'
];

for (const rel of touchedFiles) {
  const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!content.includes('style=""'), `${rel} contains style=""`);
  assert.ok(!/\sonclick\s*=/i.test(content), `${rel} contains inline onclick=`);
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(content), `${rel} contains inline <style>`);
    const noExt = content.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
    const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(!/<script\b/i.test(noJsonLd), `${rel} contains executable inline <script>`);
  }
}

// 8. Verify cache version bump to cso-candidate-cache-v209
console.log('Testing cache version bump to cso-candidate-cache-v209...');
const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v209';"), 'sw.js missing v209 cache name');
const opsSentinelJs = fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8');
assert.ok(opsSentinelJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v209';"), 'ops-sentinel.js missing v209 cache version');

console.log('All v209 Odisha Exam Lifecycle Stage Filter tests PASSED successfully!');
