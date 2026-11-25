/**
 * Admin API Endpoint: 100% Free-Tier AI Co-Author (v318)
 *   GET  /api/admin/ai-coauthor -> Daily free-tier neuron usage stats
 *   POST /api/admin/ai-coauthor -> Generate structured bilingual draft
 */

import { json, readJson } from '../../_lib/http.js';
import { requireRole, STAFF_ROLES } from '../../_lib/rbac.js';
import { getDailyAiUsage, generateAiCoAuthorDraft } from '../../_lib/ai-coauthor.js';

export async function handleAdminAiCoauthorApi(request, env, actor, ctx = null) {
  const method = request.method.toUpperCase();
  if (method === 'GET') {
    const usage = await getDailyAiUsage(env);
    return json({ ok: true, usage });
  }

  if (method === 'POST') {
    const body = await readJson(request, 24000);
    try {
      const result = await generateAiCoAuthorDraft(env, {
        mode: body.mode,
        input: body.input || body.prompt || body.text,
        actorId: (actor && actor.userId) || 'admin'
      });
      return json(result);
    } catch (err) {
      const status = Number(err && err.status) || 502;
      return json({
        ok: false,
        error: (err && err.message) || 'AI generation failed.'
      }, status);
    }
  }

  return json({ ok: false, error: 'Method not allowed' }, 405);
}

export async function onRequestGet({ request, env }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handleAdminAiCoauthorApi(request, env, actor);
}

export async function onRequestPost({ request, env, ctx }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handleAdminAiCoauthorApi(request, env, actor, ctx);
}
