#!/usr/bin/env node
/**
 * v207 Verification:
 * 1. GET /api/public/current-affairs auto-creates cso_current_affairs and returns items: [] when empty (zero mock fallback)
 * 2. POST /api/admin/current-affairs requires auth and persists bilingual EN + ଓଡ଼ିଆ capsule & 5 MCQs in D1
 * 3. assets/js/current-affairs.js bilingual toggle, quiz scoring, streak recording, and empty state
 * 4. 100% CSP compliance & SW cache v207
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { handlePublicCurrentAffairsApi } from '../functions/api/public/current-affairs.js';
import { handleAdminCurrentAffairs } from '../functions/api/admin/current-affairs.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, salt TEXT, role TEXT, failed_attempts INTEGER, lockout_until INTEGER, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER, reset_at INTEGER);
  `);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) || [] })
  });
  return { db, prepare: (s) => stmt(s) };
}

const env = { DB: makeD1() };

// 1. Public GET when D1 has 0 capsules -> auto-creates table and returns items: []
const emptyRes = await handlePublicCurrentAffairsApi(
  new Request('https://csodisha.com/api/public/current-affairs', { method: 'GET' }),
  env
);
assert.equal(emptyRes.status, 200);
const emptyJson = await emptyRes.json();
assert.equal(emptyJson.ok, true);
assert.deepEqual(emptyJson.items, [], 'Empty D1 must return items: [] with zero mock data');

// 2. Admin endpoint rejects unauthenticated calls & is wired in _router.js
const unauthRes = await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', { method: 'GET' }),
  env
);
assert.equal(unauthRes.status, 401, 'Admin current-affairs must reject unauthenticated requests');
const routerSrc = read('functions/api/admin/_router.js');
assert.ok(routerSrc.includes("if (resource === 'current-affairs')"), '_router.js must route current-affairs');
assert.ok(routerSrc.includes('handleAdminCurrentAffairs(request, env, actor)'), '_router.js must invoke handleAdminCurrentAffairs with actor');

// 3. Admin POST publishes bilingual capsule + 5 MCQs into D1
const adminActor = { userId: 'u-admin', email: 'admin@csodisha.com', role: 'admin' };
const samplePayload = {
  capsule_date: '2026-11-22',
  title_en: 'Odisha Cabinet Approves Rural Connectivity Mission',
  title_or: 'ଓଡ଼ିଶା କ୍ୟାବିନେଟ୍ ଗ୍ରାମୀଣ ସଂଯୋଗୀକରଣ ମିଶନକୁ ଅନୁମୋଦନ କଲେ',
  highlights_en: ['All-weather roads across 30 districts', 'Biju Expressway phase-2 upgrade'],
  highlights_or: ['୩୦ ଜିଲ୍ଲାରେ ସବୁଋତୁ ସଡ଼କ', 'ବିଜୁ ଏକ୍ସପ୍ରେସୱେ ପର୍ଯ୍ୟାୟ-୨ ଉନ୍ନତିକରଣ'],
  quiz: [
    {
      question_en: 'How many districts are in Odisha?',
      question_or: 'ଓଡ଼ିଶାରେ କେତୋଟି ଜିଲ୍ଲା ଅଛି?',
      options_en: ['28', '30', '31', '32'],
      options_or: ['୨୮', '୩୦', '୩୧', '୩୨'],
      answer_index: 1,
      explanation_en: 'Odisha has 30 administrative districts.',
      explanation_or: 'ଓଡ଼ିଶାରେ ୩୦ଟି ପ୍ରଶାସନିକ ଜିଲ୍ଲା ଅଛି।'
    },
    {
      question_en: 'Which river is known as the sorrow of Odisha historically?',
      question_or: 'ଓଡ଼ିଶାର ଦୁଃଖ ଭାବେ କେଉଁ ନଦୀ ପରିଚିତ ଥିଲା?',
      options_en: ['Mahanadi', 'Brahmani', 'Baitarani', 'Rushikulya'],
      options_or: ['ମହାନଦୀ', 'ବ୍ରାହ୍ମଣୀ', 'ବୈତରଣୀ', 'ଋଷିକୁଲ୍ୟା'],
      answer_index: 0,
      explanation_en: 'Mahanadi floods historically earned this title before Hirakud Dam.',
      explanation_or: 'ହୀରାକୁଦ ବନ୍ଧ ପୂର୍ବରୁ ମହାନଦୀ ବନ୍ୟା ପାଇଁ ଏହା କୁହାଯାଉଥିଲା।'
    },
    {
      question_en: 'Where is Hirakud Dam located?',
      options_en: ['Sambalpur', 'Cuttack', 'Puri', 'Balasore'],
      answer_index: 0,
      explanation_en: 'Hirakud Dam is built across the Mahanadi near Sambalpur.'
    },
    {
      question_en: 'Which is the state animal of Odisha?',
      options_en: ['Sambar Deer', 'Royal Bengal Tiger', 'Asian Elephant', 'Olive Ridley'],
      answer_index: 0,
      explanation_en: 'Sambar Deer is the official state animal of Odisha.'
    },
    {
      question_en: 'What is the capital of Odisha?',
      options_en: ['Cuttack', 'Bhubaneswar', 'Rourkela', 'Berhampur'],
      answer_index: 1,
      explanation_en: 'Bhubaneswar is the capital of Odisha.'
    }
  ]
};

const postRes = await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(samplePayload)
  }),
  env,
  adminActor
);
assert.equal(postRes.status, 201);
const postJson = await postRes.json();
assert.equal(postJson.ok, true);
assert.equal(postJson.item.quiz.length, 5);

// Also insert an older capsule + a draft capsule to test sorting & draft exclusion
await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capsule_date: '2026-11-21',
      title_en: 'Odisha Millet Mission Expansion',
      status: 'published'
    })
  }),
  env,
  adminActor
);
await handleAdminCurrentAffairs(
  new Request('https://csodisha.com/api/admin/current-affairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capsule_date: '2026-11-23',
      title_en: 'Unpublished Draft Capsule',
      status: 'draft'
    })
  }),
  env,
  adminActor
);

const pubRes = await handlePublicCurrentAffairsApi(
  new Request('https://csodisha.com/api/public/current-affairs', { method: 'GET' }),
  env
);
const pubJson = await pubRes.json();
assert.equal(pubJson.items.length, 2, 'Drafts must not be returned in public feed');
assert.equal(pubJson.items[0].capsule_date, '2026-11-22', 'Newest published capsule must be first');
assert.equal(pubJson.items[0].title_or, samplePayload.title_or);

// 4. Client module unit tests (scoring, streak, empty state, bilingual toggle)
const caClient = require('../assets/js/current-affairs.js');
assert.equal(
  caClient.EMPTY_MSG,
  "Today's Odisha Current Affairs capsule is being updated — check back shortly or practice a full CBT Mock Test"
);
const correctCheck = caClient.scoreQuizAnswer(samplePayload.quiz[0], 1);
assert.equal(correctCheck.isCorrect, true);
const wrongCheck = caClient.scoreQuizAnswer(samplePayload.quiz[0], 0);
assert.equal(wrongCheck.isCorrect, false);

const memStore = new Map();
const fakeStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v))
};
const s1 = caClient.recordDailyStreak('2026-11-21', 4, 5, fakeStorage);
assert.equal(s1.streak, 1);
const s2 = caClient.recordDailyStreak('2026-11-22', 5, 5, fakeStorage);
assert.equal(s2.streak, 2);

// Lightweight DOM stub for renderCurrentAffairsPanel
function makeNode(tag) {
  const node = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    id: '',
    href: '',
    type: '',
    disabled: false,
    open: false,
    children: [],
    attrs: {},
    listeners: {},
    classList: {
      add(c) { node.className = (node.className + ' ' + c).trim(); }
    },
    get firstChild() { return node.children[0] || null; },
    appendChild(ch) { node.children.push(ch); return ch; },
    removeChild(ch) { node.children = node.children.filter((x) => x !== ch); },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return node.attrs[k] || null; },
    addEventListener(ev, fn) { (node.listeners[ev] = node.listeners[ev] || []).push(fn); }
  };
  return node;
}
function flattenText(node) {
  return [node.textContent || ''].concat((node.children || []).map(flattenText)).join(' ');
}
function findAll(node, pred, out = []) {
  if (pred(node)) out.push(node);
  for (const ch of node.children || []) findAll(ch, pred, out);
  return out;
}

globalThis.document = { createElement: makeNode };
const emptyHost = makeNode('section');
caClient.renderCurrentAffairsPanel(emptyHost, []);
assert.ok(flattenText(emptyHost).includes(caClient.EMPTY_MSG), 'Empty state must render exact message');

const liveHost = makeNode('section');
caClient.renderCurrentAffairsPanel(liveHost, [pubJson.items[0]], { lang: 'en' });
assert.ok(flattenText(liveHost).includes(samplePayload.title_en), 'EN title must render');
const orBtn = findAll(liveHost, (n) => n.tagName === 'BUTTON' && n.textContent === 'ଓଡ଼ିଆ')[0];
assert.ok(orBtn, 'ଓଡ଼ିଆ toggle button must exist');
orBtn.listeners.click[0]();
assert.ok(flattenText(liveHost).includes(samplePayload.title_or), 'Clicking ଓଡ଼ିଆ toggle must render Odia title');
delete globalThis.document;

// 5. CSP & Asset Checks
const filesToCheck = [
  'assets/js/current-affairs.js',
  'study-library/index.html',
  'student-dashboard/index.html',
  'functions/api/public/current-affairs.js',
  'functions/api/admin/current-affairs.js'
];
for (const rel of filesToCheck) {
  const content = read(rel);
  assert.ok(!/\.innerHTML\s*=/.test(content), `${rel}: no .innerHTML`);
  assert.ok(!/\sonclick\s*=/i.test(content), `${rel}: no onclick=`);
  assert.ok(!/\sstyle\s*=/i.test(content), `${rel}: no style=`);
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(content), `${rel}: no inline <style>`);
    assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(content), `${rel}: no executable inline <script>`);
    assert.ok(content.includes('id="cso-current-affairs-panel"'), `${rel}: must contain #cso-current-affairs-panel`);
    assert.ok(content.includes('/assets/css/current-affairs.css?v=20261122v207'), `${rel}: must reference v207 CSS`);
    assert.ok(content.includes('/assets/js/current-affairs.js?v=20261122v207'), `${rel}: must reference v207 JS`);
  }
}

assert.ok(read('assets/css/current-affairs.css').includes('min-height: 44px;'), 'CSS must enforce 44px touch targets');
assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v207';"), 'sw.js must be v207');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v207';"), 'ops-sentinel must be v207');

console.log('PASS: test-current-affairs-v207.mjs');
