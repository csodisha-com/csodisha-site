/**
 * Admin Latest Updates Live Feed Controller API (v337)
 *   GET  /api/admin/latest-updates  -> list live homepage Latest Updates items (pin state + scope)
 *   POST /api/admin/latest-updates  -> pin / unpin / set_meta (scope) / unpublish with instant cache purge + Vectorize sync
 */
import { HttpError, json, readJson } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import {
  buildUnifiedLatestUpdates,
  upsertLatestUpdateMeta,
  unpublishLatestUpdateItem
} from '../../_lib/latest-updates.js';
import { scheduleSemanticSync } from '../../_lib/semantic-search.js';

const VECTOR_TYPE_MAP = {
  job: 'job',
  scheme: 'scheme',
  study: 'study',
  career: 'career',
  current_affairs: 'current_affairs',
  post: 'job'
};

export async function handleAdminLatestUpdates(request, env, actor, ctx = null) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const limit = Math.max(5, Math.min(30, Number(url.searchParams.get('limit')) || 20));
    const items = await buildUnifiedLatestUpdates(env.DB, { limit });
    return json({ ok: true, items, total: items.length }, 200, { 'Cache-Control': 'no-store' });
  }

  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    const body = await readJson(request, 16000);
    const action = String(body.action || 'set_meta').trim().toLowerCase();
    const entityType = String(body.entity_type || '').trim().toLowerCase();
    const entityId = String(body.entity_id || '').trim();

    if (!entityType || !entityId) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'entity_type and entity_id are required.');
    }

    if (action === 'unpublish') {
      const res = await unpublishLatestUpdateItem(env.DB, entityType, entityId);
      if (!res.ok) throw new HttpError(400, 'UNPUBLISH_FAILED', res.error || 'Could not unpublish item.');
      const vecType = VECTOR_TYPE_MAP[entityType];
      if (vecType) {
        scheduleSemanticSync(ctx, env, { action: 'delete', type: vecType, id: entityId });
      }
      await audit(env, request, actor, 'latest_updates.unpublish', entityType, entityId, { entity_type: entityType });
      return json({ ok: true, ...res }, 200, { 'Cache-Control': 'no-store' });
    }

    const pinnedFlag = action === 'pin'
      ? 1
      : (action === 'unpin' ? 0 : (body.is_pinned ? 1 : 0));
    const saved = await upsertLatestUpdateMeta(env.DB, {
      entity_type: entityType,
      entity_id: entityId,
      is_pinned: pinnedFlag,
      scope: body.scope || 'Odisha'
    });
    if (!saved.ok) throw new HttpError(400, 'VALIDATION_ERROR', saved.error || 'Failed to save Latest Updates metadata.');
    await audit(env, request, actor, `latest_updates.${action}`, entityType, entityId, {
      is_pinned: saved.is_pinned,
      scope: saved.scope
    });
    return json({ ok: true, item: saved }, 200, { 'Cache-Control': 'no-store' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
