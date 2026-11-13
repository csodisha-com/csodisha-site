/**
 * Cloudflare Pages Functions — State Synchronization Engine
 * Route: /api/sync
 * GET: Aggregates candidate checklists, locker, notes, and mock scores from D1
 * POST: Atomic batch upsert for candidate workspace state
 *
 * Identity is resolved exclusively from the server-side session (HttpOnly
 * cookie or Bearer token) — client-supplied candidateId values are ignored.
 */

import { getSessionFromRequest } from './auth/_utils.js';
import { HttpError, errorResponse } from '../_lib/http.js';
import { enforceCandidateControls } from '../_lib/candidate-controls.js';
import {
  flattenChecklistPayload,
  upsertStatement,
  fetchChecklistTree
} from './candidate/_state-keys.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const session = await getSessionFromRequest(request, env);
    if (!session) {
      return jsonResponse({
        success: false,
        error: 'Unauthorized: Missing or invalid candidate session'
      }, 401);
    }
    const candidateId = session.userId;
    if (env && env.DB) {
      await enforceCandidateControls(env, candidateId, { isWrite: false });
    }

    if (!env || !env.DB) {
      return jsonResponse({
        success: true,
        candidateId,
        checklists: {},
        locker: {},
        notes: '',
        mockScores: []
      });
    }

    // 1. Fetch Checklists (nested canonical shape: {exam: {stage: {topic: bool}}})
    const checklists = await fetchChecklistTree(env, candidateId);

    // 2. Fetch Document Locker
    const lockerRow = await env.DB.prepare(`
      SELECT locker_data FROM candidate_lockers WHERE candidate_id = ?
    `).bind(candidateId).first();

    let locker = {};
    if (lockerRow && lockerRow.locker_data) {
      try { locker = JSON.parse(lockerRow.locker_data); } catch(e) {}
    }

    // 3. Fetch Scratchpad Notes
    const notesRow = await env.DB.prepare(`
      SELECT notes_content FROM candidate_notes WHERE candidate_id = ?
    `).bind(candidateId).first();

    const notes = notesRow ? (notesRow.notes_content || '') : '';

    // 4. Fetch Mock Scores
    const mockResults = await env.DB.prepare(`
      SELECT id, exam_name, score, total_marks, accuracy_rate, tested_at
      FROM candidate_mock_scores
      WHERE candidate_id = ?
      ORDER BY tested_at DESC
    `).bind(candidateId).all();

    const mockScores = (mockResults && mockResults.results) ? mockResults.results : [];

    return jsonResponse({
      success: true,
      candidateId,
      checklists,
      locker,
      notes,
      mockScores
    });

  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error);
    console.error('Fatal Edge Sync GET Error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to aggregate candidate state from D1 database.'
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const session = await getSessionFromRequest(request, env);
    if (!session) {
      return jsonResponse({
        success: false,
        error: 'Unauthorized: Missing or invalid candidate session'
      }, 401);
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const { locker, notes, mockScores } = payload;
    const candidateId = session.userId;
    if (env && env.DB) {
      await enforceCandidateControls(env, candidateId, { isWrite: false });
    }

    if (!env || !env.DB) {
      return jsonResponse({
        success: true,
        mode: 'edge_simulated',
        syncedOperations: 0
      });
    }
    await enforceCandidateControls(env, candidateId, { isWrite: true, permission: 'canSyncCloud' });

    const batchStatements = [];

    // 1. Batch Upsert Checklists (accepts nested {exam:{stage:{topic}}} or
    // legacy flat {exam:{topic}} payloads — see _state-keys.js)
    const checklistTuples = flattenChecklistPayload(payload);
    if (checklistTuples.length > 0) {
      const nowIso = new Date().toISOString().replace('T', ' ').split('.')[0];
      checklistTuples.forEach(tuple => {
        batchStatements.push(upsertStatement(env, candidateId, tuple, nowIso));
      });
    }

    // 2. Upsert Document Locker
    if (locker !== undefined && locker !== null) {
      const lockerJson = typeof locker === 'string' ? locker : JSON.stringify(locker);
      batchStatements.push(
        env.DB.prepare(`
          INSERT INTO candidate_lockers (candidate_id, locker_data, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(candidate_id) DO UPDATE SET
            locker_data = excluded.locker_data,
            updated_at = CURRENT_TIMESTAMP
        `).bind(candidateId, lockerJson)
      );
    }

    // 3. Upsert Scratchpad Notes
    if (notes !== undefined && notes !== null) {
      batchStatements.push(
        env.DB.prepare(`
          INSERT INTO candidate_notes (candidate_id, notes_content, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(candidate_id) DO UPDATE SET
            notes_content = excluded.notes_content,
            updated_at = CURRENT_TIMESTAMP
        `).bind(candidateId, String(notes))
      );
    }

    // 4. Batch Upsert Mock Scores
    if (Array.isArray(mockScores)) {
      mockScores.forEach(item => {
        const id = item.id || ('mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
        const examName = item.exam || item.exam_name || 'General Mock Test';
        const score = typeof item.score === 'number' ? item.score : parseFloat(item.score) || 0;
        const totalMarks = typeof item.max === 'number' ? item.max : (typeof item.total_marks === 'number' ? item.total_marks : 200);
        let accuracyRate = null;
        if (item.accuracy) {
          accuracyRate = parseFloat(String(item.accuracy).replace('%', ''));
        }

        batchStatements.push(
          env.DB.prepare(`
            INSERT INTO candidate_mock_scores (id, candidate_id, exam_name, score, total_marks, accuracy_rate, tested_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              score = excluded.score,
              total_marks = excluded.total_marks,
              accuracy_rate = excluded.accuracy_rate
          `).bind(id, candidateId, examName, score, totalMarks, accuracyRate)
        );
      });
    }

    // Execute atomic batch execution
    if (batchStatements.length > 0) {
      await env.DB.batch(batchStatements);
    }

    return jsonResponse({
      success: true,
      syncedOperations: batchStatements.length
    });

  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error);
    console.error('Fatal Edge Sync POST Error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to batch synchronize candidate state to D1.'
    }, 500);
  }
}
