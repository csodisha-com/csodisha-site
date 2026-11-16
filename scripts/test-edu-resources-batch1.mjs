import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureEduResourcesBatch1Schema,
  handleEduBatch1Admin,
  handlePublicEduResourcesApi
} from '../functions/_lib/edu-resources-batch1.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'candidate'
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (
      key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

function createMockR2() {
  const store = new Map();
  return {
    store,
    async put(key, buf, opts) { store.set(key, { buf, opts }); },
    async get(key) { return store.get(key) || null; },
    async delete(key) { store.delete(key); }
  };
}

const env = { DB: createMockDb(), MEDIA: createMockR2() };
const admin = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };

const req = (method, url, body = null, headers = {}) => {
  const opts = {
    method,
    headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1', ...headers }
  };
  if (body !== null) {
    if (body instanceof FormData) opts.body = body;
    else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  return new Request(url, opts);
};

// 1. RBAC & CSRF protection on /api/admin/edu/*
{
  await assert.rejects(
    () => requireRole(new Request('https://csodisha.com/api/admin/edu/overview', { method: 'GET' }), env, STAFF_ROLES),
    err => err.status === 401,
    'Unauthenticated request must reject with 401'
  );

  await env.DB.prepare(`INSERT INTO users (id, email, role) VALUES ('u_admin', 'admin@csodisha.com', 'admin')`).run();
  await env.DB.prepare(`INSERT INTO sessions (id, user_id, token, expires_at) VALUES ('s1', 'u_admin', 'tok_admin_123', ?)`).bind(Math.floor(Date.now() / 1000) + 3600).run();

  assert.throws(
    () => verifyCsrf(
      new Request('https://csodisha.com/api/admin/edu/resources', {
        method: 'POST',
        headers: { Origin: 'https://csodisha.com', 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_type: 'digital_library', title_en: 'Test' })
      })
    ),
    err => err.status === 403,
    'Missing X-CSO-CSRF must reject with 403'
  );
}

// 2. Auto-ensure & seeing existing contents across Modules 01-04
await ensureEduResourcesBatch1Schema(env.DB);
await ensureEduResourcesBatch1Schema(env.DB); // idempotent

const ovRes = await handleEduBatch1Admin(req('GET', 'https://csodisha.com/api/admin/edu/overview'), env, admin, 'overview');
assert.equal(ovRes.status, 200);
const ov = await ovRes.json();
assert.ok(ov.total >= 4, 'Starter Odisha entries for 01-04 must exist');
assert.ok(ov.by_type.digital_library >= 1 && ov.by_type.study_material >= 1 && ov.by_type.notes_pdf >= 1 && ov.by_type.book_reference >= 1);

// 3. Create draft, edit & rollback revision
const createRes = await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/resources', {
    resource_type: 'notes_pdf',
    stage_or_class: 'OPSC OAS',
    subject_name: 'Odisha Geography',
    exam_tag: 'OPSC OAS',
    title_en: 'Odisha Rivers & Basins Short Notes',
    title_or: 'ଓଡ଼ିଶାର ନଦୀ ଓ ଅବବାହିକା ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ',
    summary_en: 'Concise bilingual notes on Mahanadi, Brahmani, Baitarani, Rushikulya.',
    summary_or: 'ମହାନଦୀ, ବ୍ରାହ୍ମଣୀ, ବୈତରଣୀ ଓ ଋଷିକୁଲ୍ୟା ନଦୀ ଉପରେ ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ।',
    tags: ['odisha-geography', 'rivers', 'opsc'],
    external_links: [{ label: 'CSO Study Hub', url: '/study-library/', type: 'official' }],
    status: 'draft'
  }),
  env,
  admin,
  'resources'
);
assert.equal(createRes.status, 201);
const created = (await createRes.json()).item;
assert.equal(created.status, 'draft');
assert.deepEqual(created.tags, ['odisha-geography', 'rivers', 'opsc']);

const updateRes = await handleEduBatch1Admin(
  req('PUT', `https://csodisha.com/api/admin/edu/resources/${created.id}`, {
    title_en: 'Odisha Rivers & Dams Updated Notes',
    change_note: 'Added dams coverage'
  }),
  env,
  admin,
  'resources',
  created.id
);
assert.equal(updateRes.status, 200);
assert.equal((await updateRes.json()).item.title_en, 'Odisha Rivers & Dams Updated Notes');

const detailRes = await handleEduBatch1Admin(
  req('GET', `https://csodisha.com/api/admin/edu/resources/${created.id}`),
  env,
  admin,
  'resources',
  created.id
);
const detail = await detailRes.json();
assert.equal(detail.revisions.length, 2);
const v1Rev = detail.revisions.find(r => r.version_num === 1);
assert.ok(v1Rev);

const rbRes = await handleEduBatch1Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/resources/${created.id}`, {
    action: 'rollback',
    revision_id: v1Rev.id
  }),
  env,
  admin,
  'resources',
  created.id
);
assert.equal(rbRes.status, 200);
const rolled = (await rbRes.json()).item;
assert.equal(rolled.title_en, 'Odisha Rivers & Basins Short Notes');

// 4. R2 File Upload metadata
const fd = new FormData();
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
fd.append('file', new File([pdfBytes], 'odisha-rivers.pdf', { type: 'application/pdf' }));
fd.append('resource_type', 'notes_pdf');
const upRes = await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/resources/upload', fd),
  env,
  admin,
  'resources',
  'upload'
);
assert.equal(upRes.status, 201);
const upData = await upRes.json();
assert.ok(upData.r2_key.startsWith('edu-resources/notes_pdf/'));
assert.ok(upData.file_url.startsWith('/api/media/edu-resources/notes_pdf/'));
assert.equal(upData.file_size_bytes, pdfBytes.length);

// 5. External link-check
const lcRes = await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/link-check', { resource_id: created.id }),
  env,
  admin,
  'link-check'
);
assert.equal(lcRes.status, 200);
const lc = await lcRes.json();
assert.equal(lc.checked, 1);
assert.equal(lc.broken_count, 0);

// 6. Cross-module bidirectional interlinking
const linkRes = await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/interlinks', {
    source_module: '03',
    source_id: created.id,
    target_module: '02',
    target_id: 'edu-sm-opsc-oas-prelims-pack',
    relation_type: 'notes_for'
  }),
  env,
  admin,
  'interlinks'
);
assert.equal(linkRes.status, 201);
const linkObj = await linkRes.json();
const getLinksRes = await handleEduBatch1Admin(
  req('GET', `https://csodisha.com/api/admin/edu/interlinks?source_id=${created.id}`),
  env,
  admin,
  'interlinks'
);
const getLinks = await getLinksRes.json();
assert.ok(getLinks.links.some(l => l.id === linkObj.id));

// 7. Bulk import (dry-run + commit) & CSV export
const dryRes = await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/resources/import', {
    dry_run: true,
    items: [{ resource_type: 'book_reference', title_en: 'Odisha Polity Reference', status: 'published' }]
  }),
  env,
  admin,
  'resources',
  'import'
);
assert.equal((await dryRes.json()).valid_count, 1);

const impRes = await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/resources/import', {
    items: [{ resource_type: 'book_reference', title_en: 'Odisha Polity Reference', status: 'published' }]
  }),
  env,
  admin,
  'resources',
  'import'
);
assert.equal(impRes.status, 201);
assert.equal((await impRes.json()).imported, 1);

const expRes = await handleEduBatch1Admin(
  req('GET', 'https://csodisha.com/api/admin/edu/resources/export?format=csv&resource_type=book_reference'),
  env,
  admin,
  'resources',
  'export'
);
assert.equal(expRes.status, 200);
assert.ok((await expRes.text()).includes('Odisha Polity Reference'));

// 8. Publish & verify public /api/edu/resources
const pubPatch = await handleEduBatch1Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/resources/${created.id}`, { status: 'published' }),
  env,
  admin,
  'resources',
  created.id
);
assert.equal(pubPatch.status, 200);

const pubApiRes = await handlePublicEduResourcesApi(
  new Request(`https://csodisha.com/api/edu/resources?tag=rivers`, { method: 'GET' }),
  env
);
assert.equal(pubApiRes.status, 200);
const pubData = await pubApiRes.json();
assert.equal(pubData.count, 1);
assert.equal(pubData.items[0].id, created.id);
assert.equal(pubData.items[0].json_ld['@type'], 'DigitalDocument');
assert.ok(pubData.items[0].interlinks.length >= 1);

console.log('ALL EDUCATIONAL RESOURCES BATCH 1 (01-04) TESTS PASSED');
