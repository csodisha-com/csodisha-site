/**
 * Cloudflare Pages Functions — Candidate Bookmarks API
 * Routes:
 * GET  /api/candidate/bookmarks
 * POST /api/candidate/bookmarks
 */

import { CORS_HEADERS, jsonResponse, getSessionFromRequest } from '../auth/_utils.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

// Identity is resolved exclusively from the server-side session (HttpOnly
// cookie or Bearer token). Client-supplied userId/candidateId values are
// never trusted.
async function requireSession(request, env) {
  return getSessionFromRequest(request, env);
}

export async function onRequestGet({ request, env }) {
  try {
    const session = await requireSession(request, env);
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing or invalid candidate session' }, 401);
    }
    const userId = session.userId;

    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    const { results } = await env.DB.prepare(`
      SELECT id, article_id, title, url, category, created_at
      FROM candidate_bookmarks
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return jsonResponse({
      success: true,
      userId,
      bookmarks: results || []
    }, 200);

  } catch (err) {
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
    const userId = session.userId;

    if (!env || !env.DB) {
      return jsonResponse({ success: false, error: 'Database service unavailable' }, 500);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    const { action, articleId, id, title, url, category, bookmarks } = body;
    const nowUnix = Math.floor(Date.now() / 1000);

    // Batch replacement / full sync
    if (Array.isArray(bookmarks)) {
      const deleteStmt = env.DB.prepare('DELETE FROM candidate_bookmarks WHERE user_id = ?').bind(userId);
      const insertStmts = bookmarks.map(b => {
        const bId = b.id || 'bm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const artId = b.articleId || b.id || b.title;
        return env.DB.prepare(`
          INSERT INTO candidate_bookmarks (id, user_id, article_id, title, url, category, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, article_id) DO UPDATE SET
            title = excluded.title,
            url = excluded.url,
            category = excluded.category
        `).bind(bId, userId, String(artId), String(b.title || ''), String(b.url || ''), String(b.category || 'general'), nowUnix);
      });

      await env.DB.batch([deleteStmt, ...insertStmts]);

      const { results } = await env.DB.prepare(`
        SELECT id, article_id, title, url, category, created_at
        FROM candidate_bookmarks WHERE user_id = ? ORDER BY created_at DESC
      `).bind(userId).all();

      return jsonResponse({ success: true, bookmarks: results || [] }, 200);
    }

    const targetArticleId = String(articleId || id || '').trim();
    if (!targetArticleId) {
      return jsonResponse({ success: false, error: 'Missing articleId' }, 400);
    }

    // Toggle: if delete action or already exists with action 'remove'
    if (action === 'delete' || action === 'remove') {
      await env.DB.prepare('DELETE FROM candidate_bookmarks WHERE user_id = ? AND article_id = ?')
        .bind(userId, targetArticleId)
        .run();
    } else {
      // Upsert
      const bookmarkId = 'bm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      await env.DB.prepare(`
        INSERT INTO candidate_bookmarks (id, user_id, article_id, title, url, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, article_id) DO UPDATE SET
          title = excluded.title,
          url = excluded.url,
          category = excluded.category
      `).bind(
        bookmarkId,
        userId,
        targetArticleId,
        String(title || targetArticleId),
        String(url || ''),
        String(category || 'general'),
        nowUnix
      ).run();
    }

    const { results } = await env.DB.prepare(`
      SELECT id, article_id, title, url, category, created_at
      FROM candidate_bookmarks WHERE user_id = ? ORDER BY created_at DESC
    `).bind(userId).all();

    return jsonResponse({
      success: true,
      bookmarks: results || []
    }, 200);

  } catch (err) {
    console.error('Candidate Bookmarks POST Error:', err);
    return jsonResponse({ success: false, error: 'Failed to update bookmarks' }, 500);
  }
}
