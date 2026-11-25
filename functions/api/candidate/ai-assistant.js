/**
 * Candidate Hub Study & Eligibility AI Assistant Endpoint (v319)
 *   GET  /api/candidate/ai-assistant -> Remaining daily free AI checks (0..6)
 *   POST /api/candidate/ai-assistant -> Run eligibility_check or mcq_explain
 *
 * Protected strictly by candidate session authentication (requireCandidateSession).
 */

import { jsonResponse, getSessionFromRequest } from '../auth/_utils.js';
import { getCandidateDailyUsage, runCandidateAiAssistant } from '../../_lib/candidate-ai.js';

export async function requireCandidateSession(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session || !session.userId) return null;
  return session;
}

export async function handleCandidateAiAssistant({ request, env }) {
  const session = await requireCandidateSession(request, env);
  if (!session) {
    return jsonResponse({ ok: false, error: 'Sign in required to use Candidate AI Assistant.' }, 401);
  }

  const method = request.method.toUpperCase();
  if (method === 'GET') {
    const usage = await getCandidateDailyUsage(env, session.userId);
    return jsonResponse({ ok: true, usage });
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    try {
      const result = await runCandidateAiAssistant(env, {
        candidateId: session.userId,
        mode: body.mode,
        payload: body
      });
      return jsonResponse(result);
    } catch (err) {
      const status = Number(err && err.status) || 500;
      return jsonResponse({
        ok: false,
        error: (err && err.message) || 'Candidate AI Assistant error.',
        quota_exceeded: Boolean(err && err.quota_exceeded),
        admin_reserve_reached: Boolean(err && err.admin_reserve_reached)
      }, status);
    }
  }

  return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
}

export async function onRequestGet({ request, env }) {
  return handleCandidateAiAssistant({ request, env });
}

export async function onRequestPost({ request, env }) {
  return handleCandidateAiAssistant({ request, env });
}
