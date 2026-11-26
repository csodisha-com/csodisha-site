import { HttpError, json, readJson, errorResponse, clientIp } from '../../_lib/http.js';
import { requireRole, rateLimit, audit, STAFF_ROLES } from '../../_lib/rbac.js';
import { ensureCurrentAffairsSchema, formatCapsuleRow } from '../public/current-affairs.js';
import { scheduleSemanticSync } from '../../_lib/semantic-search.js';

function normalizeHighlights(raw) {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n/)
      .map((x) => x.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

function normalizeQuizList(raw) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  return list
    .filter((q) => q && typeof q === 'object' && String(q.question_en || q.question || '').trim())
    .slice(0, 5)
    .map((q) => {
      const optsEn = Array.isArray(q.options_en)
        ? q.options_en.map((o) => String(o || '').trim()).slice(0, 4)
        : (Array.isArray(q.options) ? q.options.map((o) => String(o || '').trim()).slice(0, 4) : []);
      const optsOr = Array.isArray(q.options_or)
        ? q.options_or.map((o) => String(o || '').trim()).slice(0, 4)
        : [];
      const ansIdx = Number.isInteger(Number(q.answer_index))
        ? Math.max(0, Math.min(3, Number(q.answer_index)))
        : (Number.isInteger(Number(q.ans)) ? Math.max(0, Math.min(3, Number(q.ans))) : 0);
      return {
        question_en: String(q.question_en || q.question || '').trim(),
        question_or: String(q.question_or || '').trim(),
        options_en: optsEn,
        options_or: optsOr,
        answer_index: ansIdx,
        explanation_en: String(q.explanation_en || q.explanation || '').trim(),
        explanation_or: String(q.explanation_or || '').trim()
      };
    });
}

function slugifyId(dateStr, titleEn) {
  const slug = String(titleEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `ca-${dateStr}-${slug || Date.now()}`;
}

export async function handleAdminCurrentAffairs(request, env, actorArg = null, ctx = null, pathId = '') {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    const actor = actorArg || await requireRole(request, env, STAFF_ROLES);
    const method = request.method.toUpperCase();

    await ensureCurrentAffairsSchema(env.DB);

    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT id, capsule_date, title_en, title_or, highlights_en, highlights_or, quiz_json, category, status, created_by, created_at, updated_at
         FROM cso_current_affairs
         ORDER BY capsule_date DESC, created_at DESC
         LIMIT 50`
      ).all();
      return json({
        ok: true,
        items: (results || []).map(formatCapsuleRow).filter(Boolean)
      });
    }

    if (method === 'DELETE') {
      if (!actorArg) {
        await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      }
      const url = new URL(request.url);
      const targetId = String(pathId || url.searchParams.get('id') || '').trim();
      if (!targetId) throw new HttpError(400, 'VALIDATION_ERROR', 'Current affairs capsule id is required');
      await env.DB.prepare('DELETE FROM cso_current_affairs WHERE id = ?').bind(targetId).run();
      try {
        await audit(env, actor, 'current_affairs.delete', 'cso_current_affairs', targetId, {}, clientIp(request));
      } catch {}
      scheduleSemanticSync(ctx, env, { action: 'delete', type: 'current_affairs', id: targetId, actorId: actor && actor.userId });
      return json({ ok: true, deleted: true, id: targetId });
    }

    if (method === 'POST' || method === 'PUT') {
      if (!actorArg) {
        await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      }
      const body = await readJson(request, 1_000_000);
      const titleEn = String(body.title_en || body.title || '').trim();
      if (!titleEn) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'title_en is required');
      }

      const rawDate = String(body.capsule_date || '').trim();
      const capsuleDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : new Date().toISOString().slice(0, 10);

      const rawSlug = String(body.slug || '').trim();
      const id = String(body.id || pathId || '').trim() || (rawSlug ? slugifyId(capsuleDate, rawSlug) : slugifyId(capsuleDate, titleEn));
      const titleOr = String(body.title_or || '').trim();
      let highlightsEn = normalizeHighlights(body.highlights_en);
      let highlightsOr = normalizeHighlights(body.highlights_or);
      const summaryEn = String(body.summary_en || '').trim();
      const summaryOr = String(body.summary_or || '').trim();
      if (summaryEn && !highlightsEn.includes(summaryEn)) highlightsEn = [summaryEn, ...highlightsEn].slice(0, 20);
      if (summaryOr && !highlightsOr.includes(summaryOr)) highlightsOr = [summaryOr, ...highlightsOr].slice(0, 20);
      const quiz = normalizeQuizList(body.quiz !== undefined ? body.quiz : body.quiz_json);
      const category = String(body.category || 'Odisha').trim().slice(0, 60) || 'Odisha';
      const rawStatus = String(body.status || 'published').trim().toLowerCase();
      const status = rawStatus === 'draft' ? 'draft' : (rawStatus === 'archived' ? 'archived' : 'published');
      const nowIso = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO cso_current_affairs
          (id, capsule_date, title_en, title_or, highlights_en, highlights_or, quiz_json, category, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          capsule_date = excluded.capsule_date,
          title_en = excluded.title_en,
          title_or = excluded.title_or,
          highlights_en = excluded.highlights_en,
          highlights_or = excluded.highlights_or,
          quiz_json = excluded.quiz_json,
          category = excluded.category,
          status = excluded.status,
          updated_at = excluded.updated_at`
      ).bind(
        id,
        capsuleDate,
        titleEn,
        titleOr,
        JSON.stringify(highlightsEn),
        JSON.stringify(highlightsOr),
        JSON.stringify(quiz),
        category,
        status,
        actor.email || actor.userId || 'admin',
        nowIso,
        nowIso
      ).run();

      try {
        await audit(
          env,
          actor,
          status === 'published' ? 'current_affairs.publish' : `current_affairs.${status}`,
          'cso_current_affairs',
          id,
          { capsule_date: capsuleDate, status, quiz_count: quiz.length },
          clientIp(request)
        );
      } catch {}

      const saved = await env.DB.prepare(
        `SELECT id, capsule_date, title_en, title_or, highlights_en, highlights_or, quiz_json, category, status, created_at, updated_at
         FROM cso_current_affairs WHERE id = ?`
      ).bind(id).first();

      scheduleSemanticSync(ctx, env, {
        action: status === 'published' ? 'upsert' : 'delete',
        type: 'current_affairs',
        row: saved || { id, slug: id, title_en: titleEn, title_or: titleOr, highlights_en: highlightsEn, highlights_or: highlightsOr },
        id,
        actorId: actor && actor.userId
      });

      return json({
        ok: true,
        item: formatCapsuleRow(saved)
      }, method === 'PUT' ? 200 : 201);
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    return json({ ok: false, error: err?.message || 'Internal error' }, 500);
  }
}

export async function onRequestGet({ request, env }) {
  return handleAdminCurrentAffairs(request, env);
}

export async function onRequestPost({ request, env, waitUntil }) {
  return handleAdminCurrentAffairs(request, env, null, typeof waitUntil === 'function' ? { waitUntil } : null);
}

export async function onRequestPut({ request, env, waitUntil }) {
  return handleAdminCurrentAffairs(request, env, null, typeof waitUntil === 'function' ? { waitUntil } : null);
}

export async function onRequestDelete({ request, env, waitUntil }) {
  return handleAdminCurrentAffairs(request, env, null, typeof waitUntil === 'function' ? { waitUntil } : null);
}
