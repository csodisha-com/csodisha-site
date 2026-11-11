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

    // 1. Fetch Checklists
    const checklistResults = await env.DB.prepare(`
      SELECT exam_stream, topic_id, is_completed
      FROM candidate_checklists
      WHERE candidate_id = ?
    `).bind(candidateId).all();

    const checklists = {};
    if (checklistResults && checklistResults.results) {
      checklistResults.results.forEach(row => {
        if (!checklists[row.exam_stream]) checklists[row.exam_stream] = {};
        checklists[row.exam_stream][row.topic_id] = !!row.is_completed;
      });
    }

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

    const { checklists, locker, notes, mockScores } = payload;
    const candidateId = session.userId;

    if (!env || !env.DB) {
      return jsonResponse({
        success: true,
        mode: 'edge_simulated',
        syncedOperations: 0
      });
    }

    const batchStatements = [];

    // 1. Batch Upsert Checklists
    if (checklists && typeof checklists === 'object') {
      Object.entries(checklists).forEach(([examStream, topics]) => {
        if (typeof topics === 'object') {
          // Check if topics contains stage objects or flat topic booleans
          Object.entries(topics).forEach(([stageOrTopic, val]) => {
            if (typeof val === 'object' && val !== null) {
              // Nested stage format: { stageId: { topicId: true } }
              Object.entries(val).forEach(([tId, isDone]) => {
                batchStatements.push(
                  env.DB.prepare(`
                    INSERT INTO candidate_checklists (candidate_id, exam_stream, topic_id, is_completed, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(candidate_id, exam_stream, topic_id) DO UPDATE SET
                      is_completed = excluded.is_completed,
                      updated_at = CURRENT_TIMESTAMP
                  `).bind(candidateId, examStream, tId, isDone ? 1 : 0)
                );
              });
            } else {
              // Flat topic format: { topicId: true }
              batchStatements.push(
                env.DB.prepare(`
                  INSERT INTO candidate_checklists (candidate_id, exam_stream, topic_id, is_completed, updated_at)
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(candidate_id, exam_stream, topic_id) DO UPDATE SET
                    is_completed = excluded.is_completed,
                    updated_at = CURRENT_TIMESTAMP
                `).bind(candidateId, examStream, stageOrTopic, val ? 1 : 0)
              );
            }
          });
        }
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
    console.error('Fatal Edge Sync POST Error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to batch synchronize candidate state to D1.'
    }, 500);
  }
}
