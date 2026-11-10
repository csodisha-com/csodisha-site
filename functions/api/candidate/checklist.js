/**
 * Cloudflare Pages Functions — Candidate Syllabus Checklist API
 * Routes:
 * GET  /api/candidate/checklist
 * POST /api/candidate/checklist
 */

import { CORS_HEADERS, jsonResponse } from '../auth/_utils.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

function getUserIdFromRequest(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/cso_session=([^;]+)/);
  if (match) return match[1].trim();

  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const url = new URL(request.url);
  const param = url.searchParams.get('userId') || url.searchParams.get('candidateId');
  if (param) return param.trim();

  return null;
}

export async function onRequestGet({ request, env }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing candidate session' }, 401);
    }

    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    const { results } = await env.DB.prepare(`
      SELECT exam_stream, topic_id, is_completed, updated_at
      FROM candidate_checklists
      WHERE candidate_id = ?
    `).bind(userId).all();

    const checklists = {};
    if (results) {
      results.forEach(row => {
        if (!checklists[row.exam_stream]) checklists[row.exam_stream] = {};
        checklists[row.exam_stream][row.topic_id] = !!row.is_completed;
      });
    }

    return jsonResponse({
      success: true,
      userId,
      checklists
    }, 200);

  } catch (err) {
    console.error('Candidate Checklist GET Error:', err);
    return jsonResponse({ success: false, error: 'Failed to retrieve checklist state' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing candidate session' }, 401);
    }

    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const { examStream, stream, topicId, completed, isCompleted, updates, checklists } = body;
    const nowIso = new Date().toISOString();

    // 1. Full batch dictionary: { opsc: { topic1: true }, ossc: { ... } }
    if (checklists && typeof checklists === 'object') {
      const stmts = [];
      for (const [sKey, topics] of Object.entries(checklists)) {
        if (topics && typeof topics === 'object') {
          for (const [tId, val] of Object.entries(topics)) {
            stmts.push(
              env.DB.prepare(`
                INSERT INTO candidate_checklists (candidate_id, exam_stream, topic_id, is_completed, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(candidate_id, exam_stream, topic_id) DO UPDATE SET
                  is_completed = excluded.is_completed,
                  updated_at = excluded.updated_at
              `).bind(userId, sKey, tId, val ? 1 : 0, nowIso)
            );
          }
        }
      }

      if (stmts.length > 0) {
        // Chunk statements if needed (D1 allows up to 100 in batch)
        const CHUNK_SIZE = 50;
        for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
          await env.DB.batch(stmts.slice(i, i + CHUNK_SIZE));
        }
      }
    } else if (Array.isArray(updates)) {
      // 2. Array of updates: [{ examStream, topicId, completed }]
      const stmts = updates.map(u => {
        const str = u.examStream || u.stream || 'opsc';
        const tId = u.topicId || u.id;
        const comp = (u.completed !== undefined ? u.completed : u.isCompleted) ? 1 : 0;
        return env.DB.prepare(`
          INSERT INTO candidate_checklists (candidate_id, exam_stream, topic_id, is_completed, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(candidate_id, exam_stream, topic_id) DO UPDATE SET
            is_completed = excluded.is_completed,
            updated_at = excluded.updated_at
        `).bind(userId, str, tId, comp, nowIso);
      });

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
      }
    } else if (topicId) {
      // 3. Single topic toggle
      const str = examStream || stream || 'opsc';
      const comp = (completed !== undefined ? completed : isCompleted) ? 1 : 0;
      await env.DB.prepare(`
        INSERT INTO candidate_checklists (candidate_id, exam_stream, topic_id, is_completed, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(candidate_id, exam_stream, topic_id) DO UPDATE SET
          is_completed = excluded.is_completed,
          updated_at = excluded.updated_at
      `).bind(userId, str, topicId, comp, nowIso).run();
    }

    // Return reconciled state
    const { results } = await env.DB.prepare(`
      SELECT exam_stream, topic_id, is_completed, updated_at
      FROM candidate_checklists
      WHERE candidate_id = ?
    `).bind(userId).all();

    const reconciled = {};
    if (results) {
      results.forEach(row => {
        if (!reconciled[row.exam_stream]) reconciled[row.exam_stream] = {};
        reconciled[row.exam_stream][row.topic_id] = !!row.is_completed;
      });
    }

    return jsonResponse({
      success: true,
      checklists: reconciled
    }, 200);

  } catch (err) {
    console.error('Candidate Checklist POST Error:', err);
    return jsonResponse({ success: false, error: 'Failed to update checklist' }, 500);
  }
}
