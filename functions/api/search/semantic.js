/**
 * Public Semantic Search Endpoint ("Ask CSOdisha") (v320)
 *   GET /api/search/semantic?q=...&type=all|job|scheme|study|career
 *
 * Cached at the edge (Cache-Control: public, max-age=300) so repeat queries cost 0 Neurons.
 */

import { checkRateLimit } from '../auth/_utils.js';
import { runSemanticSearch } from '../../_lib/semantic-search.js';

export async function handlePublicSemanticSearch({ request, env, ctx = null }) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type') || 'all';

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anon';
  const rate = checkRateLimit(`sem_search_${ip}`, 30, 60 * 1000);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many search requests. Please wait a moment.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(rate.retryAfter)
      }
    });
  }

  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey).catch(() => null);
    if (cached) return cached;
  }

  try {
    const data = await runSemanticSearch(env, { q, type, limit: 6, clientIp: ip });
    const res = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
    if (edgeCache && ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(edgeCache.put(cacheKey, res.clone()).catch(() => {}));
    }
    return res;
  } catch (err) {
    const status = Number(err && err.status) || 400;
    return new Response(JSON.stringify({ ok: false, error: (err && err.message) || 'Search failed.' }), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

export async function onRequestGet({ request, env, ctx }) {
  return handlePublicSemanticSearch({ request, env, ctx });
}
