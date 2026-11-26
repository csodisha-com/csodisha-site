/**
 * Protected Admin API: Multi-Provider AI API Manager (v361)
 * Strictly guarded by Admin RBAC (`requireAdmin` -> role === 'admin') + CSRF/Origin checks.
 *
 * Routes (via /api/admin/ai-providers):
 *   GET    /api/admin/ai-providers       -> List saved providers (priority ASC) with masked API keys
 *   POST   /api/admin/ai-providers       -> Create or update custom provider (preserves key if blank on edit)
 *   POST   /api/admin/ai-providers/test  -> Live 10-token connection test (unsaved payload or saved id)
 *   DELETE /api/admin/ai-providers/:id   -> Delete saved custom provider
 */

import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { requireRole } from '../../_lib/rbac.js';
import {
  ensureAiProvidersSchema,
  maskApiKey,
  validateProviderBaseUrl,
  testAiProviderConnection
} from '../../_lib/ai-coauthor.js';
import { recordAdminAuditLog } from './system-ops.js';

export async function requireAdmin(request, env) {
  return requireRole(request, env, ['admin']);
}

const VALID_PROVIDER_TYPES = new Set(['openai_compatible', 'gemini']);

function sanitizeProviderRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || ''),
    label: String(row.label || ''),
    provider_type: String(row.provider_type || 'openai_compatible'),
    base_url: String(row.base_url || ''),
    model_id: String(row.model_id || ''),
    api_key_masked: maskApiKey(row.api_key || ''),
    has_api_key: Boolean(String(row.api_key || '').trim()),
    enabled: Number(row.enabled) === 1,
    priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 10,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || '')
  };
}

function makeProviderId(label) {
  const slug = String(label || 'provider')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28) || 'provider';
  return `aip_${slug}_${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

export async function handleAdminAiProvidersApi(request, env, actor, id = '', ctx = null) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureAiProvidersSchema(env.DB);
  const method = request.method.toUpperCase();

  // GET /api/admin/ai-providers -> list all providers with masked api_key (never expose raw keys)
  if (method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT id, label, provider_type, base_url, model_id, api_key, enabled, priority, created_at, updated_at
       FROM ai_custom_providers
       ORDER BY priority ASC, created_at ASC`
    ).all();
    const providers = (results || []).map(sanitizeProviderRow);
    return json({ ok: true, providers });
  }

  // POST /api/admin/ai-providers/test -> test either saved id or unsaved payload
  if (method === 'POST' && id === 'test') {
    const body = await readJson(request, 24000);
    let target = null;

    if (body && body.id && !String(body.api_key || '').trim()) {
      const saved = await env.DB.prepare(
        `SELECT id, label, provider_type, base_url, model_id, api_key, enabled, priority
         FROM ai_custom_providers WHERE id = ? LIMIT 1`
      ).bind(String(body.id).trim()).first();
      if (!saved) throw new HttpError(404, 'NOT_FOUND', 'Saved AI provider not found.');
      target = {
        id: saved.id,
        label: String(body.label || saved.label || '').trim(),
        provider_type: String(body.provider_type || saved.provider_type || 'openai_compatible').trim().toLowerCase(),
        base_url: String(body.base_url || saved.base_url || '').trim(),
        model_id: String(body.model_id || saved.model_id || '').trim(),
        api_key: String(saved.api_key || '').trim()
      };
    } else {
      let existingKey = '';
      if (body && body.id) {
        const saved = await env.DB.prepare(
          'SELECT api_key FROM ai_custom_providers WHERE id = ? LIMIT 1'
        ).bind(String(body.id).trim()).first();
        existingKey = String((saved && saved.api_key) || '').trim();
      }
      target = {
        id: String((body && body.id) || '').trim(),
        label: String((body && body.label) || 'Test Provider').trim(),
        provider_type: String((body && body.provider_type) || 'openai_compatible').trim().toLowerCase(),
        base_url: String((body && body.base_url) || '').trim(),
        model_id: String((body && body.model_id) || '').trim(),
        api_key: String((body && body.api_key) || existingKey).trim()
      };
    }

    if (!VALID_PROVIDER_TYPES.has(target.provider_type)) {
      throw validationError({ provider_type: 'Expected openai_compatible or gemini.' });
    }
    const baseCheck = validateProviderBaseUrl(target.base_url);
    if (!baseCheck.ok) {
      throw validationError({ base_url: baseCheck.error });
    }
    target.base_url = baseCheck.url;
    if (!target.model_id) {
      throw validationError({ model_id: 'Model ID is required.' });
    }
    if (!target.api_key) {
      throw validationError({ api_key: 'API key is required to test connection.' });
    }

    const testResult = await testAiProviderConnection(target);
    return json(testResult, testResult.ok ? 200 : 502);
  }

  // POST /api/admin/ai-providers -> create or update provider
  if (method === 'POST') {
    const body = await readJson(request, 24000);
    const reqId = String((body && body.id) || '').trim().slice(0, 80);
    const existing = reqId
      ? await env.DB.prepare('SELECT * FROM ai_custom_providers WHERE id = ? LIMIT 1').bind(reqId).first()
      : null;

    // Quick toggle-only update if caller sent { id, enabled } without full fields
    if (existing && body.enabled !== undefined && body.label === undefined && body.base_url === undefined && body.model_id === undefined) {
      const nextEnabled = (body.enabled === true || body.enabled === 1 || body.enabled === '1') ? 1 : 0;
      const now = new Date().toISOString();
      await env.DB.prepare(
        'UPDATE ai_custom_providers SET enabled = ?, updated_at = ? WHERE id = ?'
      ).bind(nextEnabled, now, existing.id).run();
      const updated = await env.DB.prepare('SELECT * FROM ai_custom_providers WHERE id = ?').bind(existing.id).first();
      recordAdminAuditLog(env, request, actor, 'ai_providers.toggle', existing.id, { enabled: nextEnabled === 1 }, ctx);
      return json({ ok: true, provider: sanitizeProviderRow(updated) });
    }

    const label = String((body && body.label) || '').trim().slice(0, 120);
    const providerType = String((body && body.provider_type) || 'openai_compatible').trim().toLowerCase();
    const rawBaseUrl = String((body && body.base_url) || '').trim();
    const modelId = String((body && body.model_id) || '').trim().slice(0, 140);
    const rawApiKey = String((body && body.api_key) || '').trim();
    const finalApiKey = rawApiKey || (existing ? String(existing.api_key || '') : '');
    const enabled = (body && body.enabled !== undefined)
      ? ((body.enabled === true || body.enabled === 1 || body.enabled === '1') ? 1 : 0)
      : (existing ? Number(existing.enabled) : 1);
    const priorityNum = Number(body && body.priority !== undefined ? body.priority : (existing ? existing.priority : 10));
    const priority = Number.isFinite(priorityNum) ? Math.max(1, Math.min(999, Math.round(priorityNum))) : 10;

    const errs = {};
    if (!label) errs.label = 'Display label is required.';
    if (!VALID_PROVIDER_TYPES.has(providerType)) errs.provider_type = 'Provider type must be openai_compatible or gemini.';
    const baseCheck = validateProviderBaseUrl(rawBaseUrl);
    if (!baseCheck.ok) errs.base_url = baseCheck.error;
    if (!modelId) errs.model_id = 'Model ID is required.';
    if (!finalApiKey) errs.api_key = 'API key is required.';
    if (Object.keys(errs).length) throw validationError(errs);

    const now = new Date().toISOString();
    if (existing) {
      await env.DB.prepare(`
        UPDATE ai_custom_providers
        SET label = ?, provider_type = ?, base_url = ?, model_id = ?, api_key = ?, enabled = ?, priority = ?, updated_at = ?
        WHERE id = ?
      `).bind(label, providerType, baseCheck.url, modelId, finalApiKey, enabled, priority, now, existing.id).run();
      const updated = await env.DB.prepare('SELECT * FROM ai_custom_providers WHERE id = ?').bind(existing.id).first();
      recordAdminAuditLog(env, request, actor, 'ai_providers.update', existing.id, { label, provider_type: providerType, model_id: modelId, enabled: enabled === 1, priority }, ctx);
      return json({ ok: true, provider: sanitizeProviderRow(updated) });
    }

    const newId = reqId && /^[a-z0-9_-]{3,64}$/i.test(reqId) ? reqId : makeProviderId(label);
    await env.DB.prepare(`
      INSERT INTO ai_custom_providers (
        id, label, provider_type, base_url, model_id, api_key, enabled, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(newId, label, providerType, baseCheck.url, modelId, finalApiKey, enabled, priority, now, now).run();

    const created = await env.DB.prepare('SELECT * FROM ai_custom_providers WHERE id = ?').bind(newId).first();
    recordAdminAuditLog(env, request, actor, 'ai_providers.create', newId, { label, provider_type: providerType, model_id: modelId, priority }, ctx);
    return json({ ok: true, provider: sanitizeProviderRow(created) }, 201);
  }

  // DELETE /api/admin/ai-providers/:id -> remove saved provider
  if (method === 'DELETE' && id) {
    const existing = await env.DB.prepare(
      'SELECT id, label, model_id FROM ai_custom_providers WHERE id = ? LIMIT 1'
    ).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'AI provider not found.');
    await env.DB.prepare('DELETE FROM ai_custom_providers WHERE id = ?').bind(existing.id).run();
    recordAdminAuditLog(env, request, actor, 'ai_providers.delete', existing.id, { label: existing.label, model_id: existing.model_id }, ctx);
    return json({ ok: true, deleted: true, id: existing.id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function onRequestGet({ request, env, ctx }) {
  const actor = await requireAdmin(request, env);
  return handleAdminAiProvidersApi(request, env, actor, '', ctx);
}

export async function onRequestPost({ request, env, ctx }) {
  const actor = await requireAdmin(request, env);
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/admin\/ai-providers\/?/, '').split('/').filter(Boolean);
  return handleAdminAiProvidersApi(request, env, actor, parts[0] || '', ctx);
}

export async function onRequestDelete({ request, env, ctx }) {
  const actor = await requireAdmin(request, env);
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/admin\/ai-providers\/?/, '').split('/').filter(Boolean);
  return handleAdminAiProvidersApi(request, env, actor, parts[0] || '', ctx);
}
