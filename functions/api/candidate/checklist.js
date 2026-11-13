/**
 * Cloudflare Pages Functions — Candidate Syllabus Checklist API
 * Routes:
 * GET  /api/candidate/checklist
 * POST /api/candidate/checklist
 *
 * Progress persists in `candidate_checklist` keyed by (candidate_id,
 * exam_code, milestone_key). Identity is resolved exclusively from the
 * server-side session (HttpOnly cookie or Bearer token) — client-supplied
 * user IDs are never trusted.
 */

import {
  CORS_HEADERS,
  jsonResponse,
  getSessionFromRequest
} from '../auth/_utils.js';
import { HttpError, errorResponse } from '../../_lib/http.js';
import { enforceCandidateControls } from '../../_lib/candidate-controls.js';
import {
  flattenChecklistPayload,
  upsertStatement,
  fetchChecklistTree
} from './_state-keys.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

// Identity is resolved exclusively from the server-side session. Client
// userId/candidateId values are ignored.
async function requireSession(request, env) {
  return getSessionFromRequest(request, env);
}

export async function onRequestGet({ request, env }) {
  try {
    const session = await requireSession(request, env);
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing or invalid candidate session' }, 401);
    }
    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }
    await enforceCandidateControls(env, session.userId, { isWrite: true, permission: 'canSyncCloud' });
    await enforceCandidateControls(env, session.userId, { isWrite: false });

    return jsonResponse({
      success: true,
      checklists: await fetchChecklistTree(env, session.userId)
    }, 200);

  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    console.error('Candidate Checklist GET Error:', err);
    return jsonResponse({ success: false, error: 'Failed to retrieve checklist state' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const session = await requireSession(request, env);
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing or invalid candidate session' }, 401);
    }
    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }
    await enforceCandidateControls(env, session.userId, { isWrite: true, permission: 'canSyncCloud' });

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const tuples = flattenChecklistPayload(body);
    if (tuples.length > 0) {
      const nowIso = new Date().toISOString().replace('T', ' ').split('.')[0];
      const stmts = tuples.map(t => upsertStatement(env, session.userId, t, nowIso));

      // D1 batch limit guard
      const CHUNK_SIZE = 50;
      for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
        await env.DB.batch(stmts.slice(i, i + CHUNK_SIZE));
      }
    }

    // Return reconciled state
    return jsonResponse({
      success: true,
      checklists: await fetchChecklistTree(env, session.userId)
    }, 200);

  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    console.error('Candidate Checklist POST Error:', err);
    return jsonResponse({ success: false, error: 'Failed to update checklist' }, 500);
  }
}
