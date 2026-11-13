/**
 * Cloudflare Pages Functions — Candidate Bookmarks API (Recruitment Posts)
 * Routes:
 * GET  /api/candidate/bookmarks
 * POST /api/candidate/bookmarks
 *
 * Persists bookmarked recruitment posts (with optional deadline dates for the
 * dashboard countdown widgets) into the spec-shaped candidate_bookmarks table.
 * Identity is resolved exclusively from the server-side session (HttpOnly
 * cookie or Bearer token) — client-supplied user IDs are never trusted.
 */

import { CORS_HEADERS, jsonResponse, getSessionFromRequest } from '../auth/_utils.js';
import { HttpError, errorResponse } from '../../_lib/http.js';
import { enforceCandidateControls } from '../../_lib/candidate-controls.js';

const ALLOWED_CATEGORIES = ['OPSC', 'OSSC', 'OSSSC', 'TEACHING', 'OTHER'];

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

// Map any client label (badge, shelf type, raw category) onto the strict
// category enum. Everything unknown is bucketed as 'OTHER'.
function normalizeCategory(raw) {
  const value = String(raw || '').trim().toUpperCase();
  return ALLOWED_CATEGORIES.includes(value) ? value : 'OTHER';
}

// Deadlines must be ISO 'YYYY-MM-DD' (countdown widgets parse this directly).
// Absent/empty deadlines are fine (null); malformed ones are rejected.
function parseDeadline(raw) {
  const value = String(raw || '').trim();
  if (!value) return { value: null };
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? { value } : { error: true };
}

const DEADLINE_ERROR = { success: false, error: 'Invalid deadline date format (expected YYYY-MM-DD)' };

// Build a deterministic row id from the natural key.
function bookmarkRowId(candidateId, postId) {
  return 'bm_' + candidateId + '_' + String(postId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Shape a DB row for the client (new spec fields + legacy aliases so older
// clients and shelves keep working).
function shapeBookmark(row) {
  return {
    id: row.id,
    postId: row.post_id,
    category: row.category,
    postTitle: row.post_title,
    postUrl: row.post_url || '',
    deadlineDate: row.deadline_date || null,
    createdAt: row.created_at,
    // Legacy aliases (article_id/title/url) for existing client code
    article_id: row.post_id,
    title: row.post_title,
    url: row.post_url || ''
  };
}

async function fetchAll(env, candidateId) {
  const { results } = await env.DB.prepare(`
    SELECT id, post_id, category, post_title, post_url, deadline_date, created_at
    FROM candidate_bookmarks
    WHERE candidate_id = ?
    ORDER BY created_at DESC, post_id ASC
  `).bind(candidateId).all();
  return (results || []).map(shapeBookmark);
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
    await enforceCandidateControls(env, session.userId, { isWrite: true, permission: 'canBookmark' });
    await enforceCandidateControls(env, session.userId, { isWrite: false });

    return jsonResponse({
      success: true,
      bookmarks: await fetchAll(env, session.userId)
    }, 200);

  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    console.error('Candidate Bookmarks GET Error:', err);
    return jsonResponse({ success: false, error: 'Failed to retrieve bookmarks' }, 500);
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
    await enforceCandidateControls(env, session.userId, { isWrite: true, permission: 'canBookmark' });

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const candidateId = session.userId;
    const nowIso = new Date().toISOString().replace('T', ' ').split('.')[0];

    // Batch replacement / full sync: the client sends its complete list and
    // D1 stores exactly that set.
    if (Array.isArray(body.bookmarks)) {
      const stmts = [env.DB.prepare('DELETE FROM candidate_bookmarks WHERE candidate_id = ?').bind(candidateId)];

      for (const b of body.bookmarks) {
        const postId = String(b.postId || b.post_id || b.articleId || b.id || '').trim();
        if (!postId) continue;

        const deadline = parseDeadline(b.deadlineDate || b.deadline_date || b.deadline);
        if (deadline.error) {
          return jsonResponse(DEADLINE_ERROR, 400);
        }

        stmts.push(env.DB.prepare(`
          INSERT INTO candidate_bookmarks (id, candidate_id, post_id, category, post_title, post_url, deadline_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(candidate_id, post_id) DO UPDATE SET
            category = excluded.category,
            post_title = excluded.post_title,
            post_url = excluded.post_url,
            deadline_date = excluded.deadline_date,
            created_at = excluded.created_at
        `).bind(
          bookmarkRowId(candidateId, postId),
          candidateId,
          postId,
          normalizeCategory(b.category || b.type || b.badge),
          String(b.postTitle || b.post_title || b.title || 'Saved Item').slice(0, 300),
          String(b.postUrl || b.post_url || b.url || '').slice(0, 1000) || null,
          deadline.value,
          nowIso
        ));
      }

      // D1 batch limit guard
      const CHUNK_SIZE = 50;
      for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
        await env.DB.batch(stmts.slice(i, i + CHUNK_SIZE));
      }

      return jsonResponse({ success: true, bookmarks: await fetchAll(env, candidateId) }, 200);
    }

    // Single bookmark toggle / delete
    const postId = String(body.postId || body.post_id || body.articleId || body.id || '').trim();
    if (!postId) {
      return jsonResponse({ success: false, error: 'Missing postId' }, 400);
    }

    if (body.action === 'delete' || body.action === 'remove') {
      await env.DB.prepare('DELETE FROM candidate_bookmarks WHERE candidate_id = ? AND post_id = ?')
        .bind(candidateId, postId)
        .run();
    } else {
      const deadline = parseDeadline(body.deadlineDate || body.deadline_date || body.deadline);
      if (deadline.error) {
        return jsonResponse(DEADLINE_ERROR, 400);
      }

      await env.DB.prepare(`
        INSERT INTO candidate_bookmarks (id, candidate_id, post_id, category, post_title, post_url, deadline_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(candidate_id, post_id) DO UPDATE SET
          category = excluded.category,
          post_title = excluded.post_title,
          post_url = excluded.post_url,
          deadline_date = excluded.deadline_date,
          created_at = excluded.created_at
      `).bind(
        bookmarkRowId(candidateId, postId),
        candidateId,
        postId,
        normalizeCategory(body.category || body.type || body.badge),
        String(body.postTitle || body.post_title || body.title || 'Saved Item').slice(0, 300),
        String(body.postUrl || body.post_url || body.url || '').slice(0, 1000) || null,
        deadline.value,
        nowIso
      ).run();
    }

    return jsonResponse({
      success: true,
      bookmarks: await fetchAll(env, candidateId)
    }, 200);

  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    console.error('Candidate Bookmarks POST Error:', err);
    return jsonResponse({ success: false, error: 'Failed to update bookmarks' }, 500);
  }
}
