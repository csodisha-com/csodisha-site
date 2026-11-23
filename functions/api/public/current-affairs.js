import { json } from '../../_lib/http.js';

const CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';

let _caSchemaChecked = false;
export async function ensureCurrentAffairsSchema(db) {
  if (!db || _caSchemaChecked) return;
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS cso_current_affairs (
      id TEXT PRIMARY KEY,
      capsule_date TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      highlights_en TEXT NOT NULL DEFAULT '[]',
      highlights_or TEXT NOT NULL DEFAULT '[]',
      quiz_json TEXT NOT NULL DEFAULT '[]',
      category TEXT NOT NULL DEFAULT 'Odisha',
      status TEXT NOT NULL DEFAULT 'published',
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_cso_ca_status_date ON cso_current_affairs(status, capsule_date DESC, created_at DESC)`
  ).run();
  _caSchemaChecked = true;
}

function safeParseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatCapsuleRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || ''),
    capsule_date: String(row.capsule_date || ''),
    title_en: String(row.title_en || ''),
    title_or: String(row.title_or || ''),
    highlights_en: safeParseJsonArray(row.highlights_en),
    highlights_or: safeParseJsonArray(row.highlights_or),
    quiz: safeParseJsonArray(row.quiz_json).slice(0, 5),
    category: String(row.category || 'Odisha'),
    status: String(row.status || 'published'),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

export async function getPublicCurrentAffairs(env, { date = '', limit = 10 } = {}) {
  const db = env?.DB;
  if (!db) return { ok: true, items: [] };

  await ensureCurrentAffairsSchema(db);

  const safeLimit = Math.max(1, Math.min(30, Number(limit) || 10));
  const cleanDate = String(date || '').trim();

  let rows = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const res = await db.prepare(
      `SELECT id, capsule_date, title_en, title_or, highlights_en, highlights_or, quiz_json, category, status, created_at, updated_at
       FROM cso_current_affairs
       WHERE status = 'published' AND capsule_date = ?
       ORDER BY capsule_date DESC, created_at DESC
       LIMIT ?`
    ).bind(cleanDate, safeLimit).all();
    rows = res?.results || [];
  } else {
    const res = await db.prepare(
      `SELECT id, capsule_date, title_en, title_or, highlights_en, highlights_or, quiz_json, category, status, created_at, updated_at
       FROM cso_current_affairs
       WHERE status = 'published'
       ORDER BY capsule_date DESC, created_at DESC
       LIMIT ?`
    ).bind(safeLimit).all();
    rows = res?.results || [];
  }

  return {
    ok: true,
    items: rows.map(formatCapsuleRow).filter(Boolean)
  };
}

export async function handlePublicCurrentAffairsApi(request, env) {
  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  const cacheKey = new Request(request.url, { method: 'GET' });
  if (cache && request.method === 'GET') {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || '';
  const limit = url.searchParams.get('limit') || '10';
  const data = await getPublicCurrentAffairs(env, { date, limit });
  const res = json(data, 200, { 'Cache-Control': CACHE_CONTROL });
  if (cache && request.method === 'GET') {
    try { await cache.put(cacheKey, res.clone()); } catch (_) {}
  }
  return res;
}

export async function onRequestGet({ request, env }) {
  return handlePublicCurrentAffairsApi(request, env);
}
