// Deep Codebase & Live-Data Audit (v202)
// Run: node scripts/audit-full-live-sync-v202.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('test-')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, exts, out);
    else if (exts.some(ext => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

// a) 299 Admin Modules coverage check
const nav = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const suiteLive = fs.readFileSync(path.join(ROOT, 'admin/suite-live.js'), 'utf8');
const lazyLoader = fs.readFileSync(path.join(ROOT, 'admin/lazy-suite-loader.js'), 'utf8');
const modRestored = fs.readFileSync(path.join(ROOT, 'admin/modules-restored.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(ROOT, 'admin/admin.js'), 'utf8');
const allAdminBundle = [suiteLive, lazyLoader, modRestored, adminJs].join('\n');

const allModules = [];
for (const f of nav.folders || []) {
  for (const m of f.modules || []) {
    allModules.push({ folderId: f.id, folderTitle: f.title, id: m.id, title: m.title });
  }
}

const disconnectedModules = [];
for (const m of allModules) {
  const hasRoute = allAdminBundle.includes(`'${m.id}'`) || allAdminBundle.includes(`"${m.id}"`);
  if (!hasRoute) disconnectedModules.push(m);
}

console.log(`[A] 299 Admin Modules Audit: ${allModules.length} total, ${allModules.length - disconnectedModules.length} mapped, ${disconnectedModules.length} disconnected`);
if (disconnectedModules.length) {
  console.log('Disconnected modules:', disconnectedModules.slice(0, 20));
}

// b) Zero Mock / Sample / Dummy Data Scan
const SCAN_DIRS = [
  'admin', 'functions', 'assets', 'jobs-careers', 'schemes-benefits',
  'study-library', 'tools', 'student-dashboard', 'community'
];
const MOCK_RE = /\b(lorem ipsum|example\.com|john doe|sample job|mock data|dummy)\b|test@/i;

const mockHits = [];
for (const d of SCAN_DIRS) {
  for (const file of walkFiles(path.join(ROOT, d), ['.js', '.mjs', '.json', '.html'])) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      // Ignore regex/validator definitions, explicit "zero mock" comments, or timing-attack dummy PBKDF2 comment
      if (/zero mock|no mock|without mock|MOCK_RE|placeholder=|dummy PBKDF2/i.test(line)) return;
      const m = line.match(MOCK_RE);
      if (m) {
        mockHits.push({ file: rel, line: i + 1, match: m[0], text: line.trim().slice(0, 120) });
      }
    });
  }
}

console.log(`[B] Mock / Sample / Dummy Data Scan: ${mockHits.length} hits`);
for (const h of mockHits.slice(0, 40)) {
  console.log(`  ${h.file}:${h.line} [${h.match}] -> ${h.text}`);
}

// c) Frontend fetch('/api/...') vs Backend routes (_worker.js + functions/api/)
const workerJs = fs.readFileSync(path.join(ROOT, '_worker.js'), 'utf8');
const routerJs = fs.readFileSync(path.join(ROOT, 'functions/api/admin/_router.js'), 'utf8');
const backendFiles = walkFiles(path.join(ROOT, 'functions'), ['.js']).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const allBackend = workerJs + '\n' + routerJs + '\n' + backendFiles;

const apiCalls = new Set();
for (const d of SCAN_DIRS) {
  for (const file of walkFiles(path.join(ROOT, d), ['.js'])) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/['"`](\/api\/[a-z0-9/_-]+)(?:\?[^'"`]*)?['"`]/gi)) {
      apiCalls.add(m[1]);
    }
  }
}

const missingApis = [];
for (const ep of apiCalls) {
  const segs = ep.replace(/^\/api\//, '').split('/').filter(Boolean);
  const last = segs[segs.length - 1];
  const prefix = '/api/' + segs[0];
  const ok = allBackend.includes(ep) || (allBackend.includes(prefix) && allBackend.includes(last));
  if (!ok) missingApis.push(ep);
}

console.log(`[C] API Endpoint Sync Audit: ${apiCalls.size} unique /api/ calls, ${missingApis.length} unmatched`);
if (missingApis.length) console.log('Unmatched APIs:', missingApis);

if (disconnectedModules.length > 0 || mockHits.length > 0 || missingApis.length > 0) {
  process.exitCode = 1;
}
