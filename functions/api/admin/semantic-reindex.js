/**
 * Admin Semantic Re-Index Endpoint (v320)
 *   GET  /api/admin/semantic-reindex -> Index count + Vectorize binding status
 *   POST /api/admin/semantic-reindex -> Batch-index up to 20 published items within free neuron budget
 */

import { json, readJson } from '../../_lib/http.js';
import { requireRole, STAFF_ROLES } from '../../_lib/rbac.js';
import { getSemanticIndexStatus, reindexPublishedContent } from '../../_lib/semantic-search.js';

export async function handleAdminSemanticReindexApi(request, env, actor) {
  const method = request.method.toUpperCase();
  if (method === 'GET') {
    const st = await getSemanticIndexStatus(env);
    return json(st);
  }
  if (method === 'POST') {
    const body = await readJson(request, 8000).catch(() => ({}));
    const out = await reindexPublishedContent(env, {
      limit: Math.min(20, Number(body && body.limit) || 20),
      actorId: (actor && actor.userId) || 'admin'
    });
    return json(out);
  }
  return json({ ok: false, error: 'Method not allowed' }, 405);
}

export async function onRequestGet({ request, env }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handleAdminSemanticReindexApi(request, env, actor);
}

export async function onRequestPost({ request, env }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handleAdminSemanticReindexApi(request, env, actor);
}
