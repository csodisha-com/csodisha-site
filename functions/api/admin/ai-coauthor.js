/**
 * Admin API Endpoint: Gemini-First AI Co-Author & Image Generator (v350)
 *   GET  /api/admin/ai-coauthor       -> Daily free-tier neuron usage stats
 *   POST /api/admin/ai-coauthor       -> Generate structured bilingual draft / PDF-to-Article / Auto-Fix
 *   POST /api/admin/ai/generate-image -> Gemini-first -> Workers AI FLUX -> SVG cover/gallery image into cso-media R2
 */

import { json, readJson } from '../../_lib/http.js';
import { requireRole, STAFF_ROLES } from '../../_lib/rbac.js';
import { getDailyAiUsage, generateAiCoAuthorDraft, generateAiEditorialImage } from '../../_lib/ai-coauthor.js';

export async function handleAdminAiCoauthorApi(request, env, actor, ctx = null) {
  const method = request.method.toUpperCase();
  if (method === 'GET') {
    const usage = await getDailyAiUsage(env);
    return json({ ok: true, usage });
  }

  if (method === 'POST') {
    const body = await readJson(request, 260000);
    try {
      const result = await generateAiCoAuthorDraft(env, {
        mode: body.mode,
        input: body.input !== undefined ? body.input : (body.prompt !== undefined ? body.prompt : body.text),
        fields: body.fields,
        kind: body.kind,
        pdf_text: body.pdf_text,
        pdf_filename: body.pdf_filename,
        draft: body.draft,
        body_en: body.body_en,
        overwrite: body.overwrite,
        depth: body.depth,
        skip_body_or: body.skip_body_or,
        preserve_body_en: body.preserve_body_en,
        preferred_model: body.preferred_model,
        auto_failover: body.auto_failover,
        actorId: (actor && actor.userId) || 'admin'
      });
      return json(result);
    } catch (err) {
      const status = Number(err && err.status) || 502;
      const payload = {
        ok: false,
        error: (err && err.message) || 'AI generation failed.',
        is_daily_quota: Boolean(err && err.is_gemini_workers_daily_quota)
      };
      if (Array.isArray(err && err.attempted_errors) && err.attempted_errors.length) {
        payload.attempted_errors = err.attempted_errors;
      }
      return json(payload, status);
    }
  }

  return json({ ok: false, error: 'Method not allowed' }, 405);
}

export async function handleAdminAiGenerateImage(request, env, actor) {
  if (request.method.toUpperCase() !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }
  const body = await readJson(request, 24000);
  try {
    const result = await generateAiEditorialImage(env, {
      prompt: body.prompt,
      title_en: body.title_en,
      category: body.category,
      scope: body.scope,
      aspect_ratio: body.aspect_ratio,
      actorId: (actor && actor.userId) || 'admin',
      actorEmail: (actor && actor.email) || 'admin'
    });
    return json(result, 201);
  } catch (err) {
    const status = Number(err && err.status) || 502;
    return json({
      ok: false,
      error: (err && err.message) || 'AI image generation failed.'
    }, status);
  }
}

export async function onRequestGet({ request, env }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handleAdminAiCoauthorApi(request, env, actor);
}

export async function onRequestPost({ request, env, ctx }) {
  const actor = await requireRole(request, env, STAFF_ROLES);
  return handleAdminAiCoauthorApi(request, env, actor, ctx);
}
