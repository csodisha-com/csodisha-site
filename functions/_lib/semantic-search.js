/**
 * 100% Free-Tier Smart Semantic Search ("Ask CSOdisha") Service (v320)
 * - Uses Cloudflare Vectorize (`csodisha-semantic-index`, 1024-dim cosine)
 *   + multilingual Workers AI `@cf/qwen/qwen3-embedding-0.6b` (English + Odia).
 * - Deduplicates indexing via `semantic_index_items.content_hash` so unchanged items cost 0 Neurons.
 * - Seamlessly falls back to D1 SQL keyword search whenever `env.VECTORIZE` is unbound
 *   or daily usage in `ai_generation_logs` reaches 9,000 / 10,000 free neurons.
 */

import { bufToHex } from '../api/auth/_utils.js';
import { getDailyAiUsage, ensureAiCoauthorSchema } from './ai-coauthor.js';

export const EMBEDDING_MODEL = '@cf/qwen/qwen3-embedding-0.6b';
export const SEMANTIC_NEURON_CAP = 9000;
export const VALID_SEARCH_TYPES = new Set(['all', 'job', 'scheme', 'study', 'career']);

let _schemaReadyDb = null;

export async function ensureSemanticSchema(env) {
  if (!env || !env.DB) return;
  if (_schemaReadyDb === env.DB) return;
  await ensureAiCoauthorSchema(env);
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS semantic_index_items (
        vector_id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        title_en TEXT NOT NULL,
        title_or TEXT,
        url TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        indexed_at TEXT NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_semantic_index_entity
       ON semantic_index_items(entity_type, entity_id)`
    )
  ]);
  _schemaReadyDb = env.DB;
}

async function sha256Hex(raw) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(raw)));
  return bufToHex(digest);
}

function buildUrlForType(type, slugOrId) {
  const s = encodeURIComponent(String(slugOrId || ''));
  if (type === 'scheme') return `/schemes/?slug=${s}`;
  if (type === 'study') return `/study-library/?slug=${s}`;
  if (type === 'career') return `/careers/?slug=${s}`;
  return `/jobs/?slug=${s}`;
}

export function buildIndexRecord(type, row) {
  const id = String(row.id || row.slug || '');
  const slug = String(row.slug || row.id || '');
  const titleEn = String(row.title_en || '').trim();
  const titleOr = String(row.title_or || '').trim();
  const summaryEn = String(row.summary_en || row.subtitle_en || '').trim();
  const summaryOr = String(row.summary_or || '').trim();
  const url = buildUrlForType(type, slug);
  const textForEmbedding = [type.toUpperCase(), titleEn, titleOr, summaryEn, summaryOr].filter(Boolean).join(' | ').slice(0, 1800);
  return {
    vector_id: `${type}:${id}`,
    entity_type: type,
    entity_id: id,
    title_en: titleEn,
    title_or: titleOr,
    url,
    summary: summaryEn || summaryOr,
    textForEmbedding
  };
}

async function logSemanticNeurons(env, { actorId, targetModule, neurons }) {
  if (!env || !env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO ai_generation_logs (id, actor_id, target_module, provider, model, estimated_neurons, status, created_at)
       VALUES (?, ?, ?, 'cloudflare_workers_ai', ?, ?, 'ok', ?)`
    ).bind(
      crypto.randomUUID(),
      String(actorId || 'system'),
      String(targetModule),
      EMBEDDING_MODEL,
      Math.max(1, Math.round(Number(neurons) || 10)),
      new Date().toISOString()
    ).run();
  } catch (_e) {}
}

async function generateEmbedding(env, text) {
  const resp = await env.AI.run(EMBEDDING_MODEL, { text: [String(text || '').slice(0, 1800)] });
  const vec = (resp && Array.isArray(resp.data) && Array.isArray(resp.data[0]))
    ? resp.data[0]
    : (Array.isArray(resp) && Array.isArray(resp[0]) ? resp[0] : null);
  if (!vec || !vec.length) throw new Error('Embedding model returned empty vector.');
  return vec;
}

export async function upsertSemanticVector(env, type, row, actorId = 'admin') {
  await ensureSemanticSchema(env);
  if (!row || !row.id || !row.title_en) return { skipped: true, reason: 'invalid_row' };
  if (!env || !env.VECTORIZE || typeof env.VECTORIZE.upsert !== 'function' || !env.AI || typeof env.AI.run !== 'function') {
    return { skipped: true, reason: 'vectorize_unbound' };
  }

  const rec = buildIndexRecord(type, row);
  const contentHash = await sha256Hex(rec.textForEmbedding);
  const existing = await env.DB.prepare(
    'SELECT content_hash FROM semantic_index_items WHERE vector_id = ? LIMIT 1'
  ).bind(rec.vector_id).first().catch(() => null);

  if (existing && existing.content_hash === contentHash) {
    return { skipped: true, reason: 'unchanged', vector_id: rec.vector_id };
  }

  const usage = await getDailyAiUsage(env);
  if (usage.neurons_used >= SEMANTIC_NEURON_CAP) {
    return { skipped: true, reason: 'neuron_cap', vector_id: rec.vector_id };
  }

  const vector = await generateEmbedding(env, rec.textForEmbedding);
  await env.VECTORIZE.upsert([{
    id: rec.vector_id,
    values: vector,
    metadata: {
      entity_type: rec.entity_type,
      entity_id: rec.entity_id,
      title_en: rec.title_en,
      title_or: rec.title_or,
      url: rec.url
    }
  }]);

  await env.DB.prepare(
    `INSERT OR REPLACE INTO semantic_index_items (vector_id, entity_type, entity_id, title_en, title_or, url, content_hash, indexed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    rec.vector_id,
    rec.entity_type,
    rec.entity_id,
    rec.title_en,
    rec.title_or,
    rec.url,
    contentHash,
    new Date().toISOString()
  ).run();

  await logSemanticNeurons(env, { actorId, targetModule: 'semantic_index', neurons: 15 });
  return { skipped: false, indexed: true, vector_id: rec.vector_id };
}

export async function runKeywordFallbackSearch(env, { q, type = 'all', limit = 8 }) {
  if (!env || !env.DB) return [];
  const like = `%${String(q || '').trim()}%`;
  const results = [];

  const queries = [];
  if (type === 'all' || type === 'job') {
    queries.push({
      t: 'job',
      sql: `SELECT id, slug, title_en, title_or, summary_en FROM job_articles
            WHERE is_published = 1 AND (title_en LIKE ? OR title_or LIKE ? OR summary_en LIKE ? OR summary_or LIKE ?)
            ORDER BY updated_at DESC LIMIT ?`
    });
  }
  if (type === 'all' || type === 'scheme') {
    queries.push({
      t: 'scheme',
      sql: `SELECT id, slug, title_en, title_or, summary_en FROM scheme_articles
            WHERE is_published = 1 AND (title_en LIKE ? OR title_or LIKE ? OR summary_en LIKE ? OR summary_or LIKE ?)
            ORDER BY updated_at DESC LIMIT ?`
    });
  }
  if (type === 'all' || type === 'study') {
    queries.push({
      t: 'study',
      sql: `SELECT id, slug, title_en, title_or, summary_en FROM study_articles
            WHERE is_published = 1 AND (title_en LIKE ? OR title_or LIKE ? OR summary_en LIKE ? OR summary_or LIKE ?)
            ORDER BY updated_at DESC LIMIT ?`
    });
  }
  if (type === 'all' || type === 'career') {
    queries.push({
      t: 'career',
      sql: `SELECT id, slug, title_en, title_or, summary_en FROM careers_articles
            WHERE status = 'published' AND (title_en LIKE ? OR title_or LIKE ? OR summary_en LIKE ? OR summary_or LIKE ?)
            ORDER BY updated_at DESC LIMIT ?`
    });
  }

  for (const item of queries) {
    try {
      const res = await env.DB.prepare(item.sql).bind(like, like, like, like, limit).all();
      (res.results || []).forEach((r) => {
        results.push({
          type: item.t,
          id: String(r.id),
          title_en: r.title_en || '',
          title_or: r.title_or || '',
          url: buildUrlForType(item.t, r.slug || r.id),
          summary: String(r.summary_en || '').slice(0, 180),
          score: 0.75
        });
      });
    } catch (_e) {}
  }

  return results.slice(0, limit);
}

async function hydrateMatchFromD1(env, match) {
  const meta = (match && match.metadata) || {};
  const parts = String((match && match.id) || '').split(':');
  const type = meta.entity_type || parts[0];
  const entityId = meta.entity_id || parts[1];
  if (!type || !entityId || !env || !env.DB) return null;

  const tableMap = {
    job: { table: 'job_articles', cond: 'is_published = 1' },
    scheme: { table: 'scheme_articles', cond: 'is_published = 1' },
    study: { table: 'study_articles', cond: 'is_published = 1' },
    career: { table: 'careers_articles', cond: "status = 'published'" }
  };
  const cfg = tableMap[type];
  if (!cfg) return null;

  try {
    const row = await env.DB.prepare(
      `SELECT id, slug, title_en, title_or, summary_en FROM ${cfg.table} WHERE id = ? AND ${cfg.cond} LIMIT 1`
    ).bind(entityId).first();
    if (!row) return null;
    return {
      type,
      id: String(row.id),
      title_en: row.title_en || meta.title_en || '',
      title_or: row.title_or || meta.title_or || '',
      url: buildUrlForType(type, row.slug || row.id),
      summary: String(row.summary_en || '').slice(0, 180),
      score: Number((match && match.score) || 0.8)
    };
  } catch (_e) {
    return null;
  }
}

export async function runSemanticSearch(env, { q, type = 'all', limit = 8 }) {
  await ensureSemanticSchema(env);
  const cleanQ = String(q || '').trim();
  const cleanType = VALID_SEARCH_TYPES.has(String(type || '').toLowerCase()) ? String(type).toLowerCase() : 'all';

  if (cleanQ.length < 2 || cleanQ.length > 200) {
    const err = new Error('Search query must be between 2 and 200 characters.');
    err.status = 400;
    throw err;
  }

  const hasVectorize = Boolean(env && env.VECTORIZE && typeof env.VECTORIZE.query === 'function' && env && env.AI && typeof env.AI.run === 'function');
  const usage = await getDailyAiUsage(env);

  if (hasVectorize && usage.neurons_used < SEMANTIC_NEURON_CAP) {
    try {
      const vec = await generateEmbedding(env, cleanQ);
      await logSemanticNeurons(env, { actorId: 'public_search', targetModule: 'semantic_search', neurons: 10 });
      const queryOpts = { topK: limit, returnMetadata: 'all' };
      if (cleanType !== 'all') queryOpts.filter = { entity_type: cleanType };
      const vecRes = await env.VECTORIZE.query(vec, queryOpts);
      const matches = (vecRes && Array.isArray(vecRes.matches)) ? vecRes.matches : [];
      const hydrated = (await Promise.all(matches.map((m) => hydrateMatchFromD1(env, m)))).filter(Boolean);
      const filtered = cleanType === 'all' ? hydrated : hydrated.filter((r) => r.type === cleanType);

      if (filtered.length >= 3) {
        return { ok: true, mode: 'semantic', results: filtered.slice(0, limit) };
      }
      const kw = await runKeywordFallbackSearch(env, { q: cleanQ, type: cleanType, limit });
      const seen = new Set(filtered.map((r) => `${r.type}:${r.id}`));
      const merged = filtered.concat(kw.filter((r) => !seen.has(`${r.type}:${r.id}`)));
      return { ok: true, mode: filtered.length ? 'semantic' : 'keyword_fallback', results: merged.slice(0, limit) };
    } catch (_err) {
      // Seamless fallback on Vectorize/AI error
    }
  }

  const kwResults = await runKeywordFallbackSearch(env, { q: cleanQ, type: cleanType, limit });
  return { ok: true, mode: 'keyword_fallback', results: kwResults };
}

export async function getSemanticIndexStatus(env) {
  await ensureSemanticSchema(env);
  let indexedCount = 0;
  if (env && env.DB) {
    try {
      const row = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM semantic_index_items').first();
      indexedCount = Number((row && row.cnt) || 0);
    } catch (_e) {}
  }
  return {
    ok: true,
    indexed_count: indexedCount,
    vectorize_bound: Boolean(env && env.VECTORIZE && typeof env.VECTORIZE.query === 'function'),
    index_name: 'csodisha-semantic-index'
  };
}

export async function reindexPublishedContent(env, { limit = 20, actorId = 'admin' } = {}) {
  await ensureSemanticSchema(env);
  const cap = Math.max(1, Math.min(20, Number(limit) || 20));
  const sources = [
    { type: 'job', sql: 'SELECT id, slug, title_en, title_or, summary_en, summary_or FROM job_articles WHERE is_published = 1 ORDER BY updated_at DESC LIMIT ?' },
    { type: 'scheme', sql: 'SELECT id, slug, title_en, title_or, summary_en, summary_or FROM scheme_articles WHERE is_published = 1 ORDER BY updated_at DESC LIMIT ?' },
    { type: 'study', sql: 'SELECT id, slug, title_en, title_or, summary_en, summary_or FROM study_articles WHERE is_published = 1 ORDER BY updated_at DESC LIMIT ?' },
    { type: 'career', sql: "SELECT id, slug, title_en, title_or, summary_en, summary_or FROM careers_articles WHERE status = 'published' ORDER BY updated_at DESC LIMIT ?" }
  ];

  let indexed = 0;
  let skipped = 0;
  let processed = 0;
  let stoppedReason = null;

  for (const src of sources) {
    if (processed >= cap || stoppedReason) break;
    let rows = [];
    try {
      const res = await env.DB.prepare(src.sql).bind(cap - processed).all();
      rows = res.results || [];
    } catch (_e) {
      rows = [];
    }
    for (const row of rows) {
      if (processed >= cap) break;
      processed += 1;
      const out = await upsertSemanticVector(env, src.type, row, actorId);
      if (out.indexed) indexed += 1;
      else {
        skipped += 1;
        if (out.reason === 'neuron_cap' || out.reason === 'vectorize_unbound') {
          stoppedReason = out.reason;
          break;
        }
      }
    }
  }

  const st = await getSemanticIndexStatus(env);
  return {
    ok: true,
    indexed,
    skipped,
    stopped_reason: stoppedReason,
    indexed_count: st.indexed_count,
    vectorize_bound: st.vectorize_bound
  };
}
