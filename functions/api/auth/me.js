/**
 * Cloudflare Pages / Worker Functions — Session introspection
 * Route: GET /api/auth/me
 *
 * Resolves identity exclusively from the HttpOnly session cookie (or Bearer
 * header). Returns the active candidate profile for session restoration.
 */

import {
  CORS_HEADERS,
  jsonResponse,
  getSessionFromRequest
} from './_utils.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env || !env.DB) {
      return jsonResponse({ success: false, authenticated: false, error: 'Database service unavailable' }, 500);
    }

    const session = await getSessionFromRequest(request, env);
    if (!session) {
      return jsonResponse({ success: false, authenticated: false, user: null }, 401);
    }

    // Load the verified profile for the session owner
    const profile = await env.DB.prepare(`
      SELECT c.id, c.full_name, c.email, c.phone, c.district, c.target_streams
      FROM candidates c
      WHERE c.id = ? OR c.email = ?
      LIMIT 1
    `).bind(session.userId, session.email).first();

    let targetStreams = ['opsc', 'ossc'];
    if (profile && profile.target_streams) {
      try { targetStreams = JSON.parse(profile.target_streams); } catch (e) {}
    }

    const user = {
      id: session.userId,
      email: session.email,
      name: profile ? profile.full_name : 'Candidate Aspirant',
      fullName: profile ? profile.full_name : 'Candidate Aspirant',
      phone: profile && profile.phone ? profile.phone : '',
      district: profile ? profile.district : 'Balasore (Baleswar)',
      targetStreams,
      role: session.role || 'candidate'
    };

    return jsonResponse({
      success: true,
      authenticated: true,
      user
    }, 200);

  } catch (error) {
    console.error('Session Me Error:', error);
    return jsonResponse({ success: false, authenticated: false, error: 'Session lookup failed.' }, 500);
  }
}
