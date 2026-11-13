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
import { getCandidateControls } from '../../_lib/candidate-controls.js';

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

    // users.role is authoritative (sessions.role may be stale)
    const roleRow = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.userId).first().catch(() => null);
    const controls = await getCandidateControls(env, session.userId);
    if (controls.account_status === 'banned' || controls.account_status === 'suspended') {
      return jsonResponse({
        success: false,
        authenticated: false,
        code: 'ACCOUNT_RESTRICTED',
        error: controls.restriction_reason || `Account is ${controls.account_status}.`,
        account_status: controls.account_status,
        restriction_reason: controls.restriction_reason,
        suspended_until: controls.suspended_until
      }, 403);
    }

    const prefsRow = await env.DB.prepare(
      'SELECT domain_slug, track_slug, primary_exam, selected_exams_json, selected_streams_json, updated_at FROM candidate_exam_preferences WHERE user_id = ?'
    ).bind(session.userId).first().catch(() => null);

    let preferences = null;
    if (prefsRow) {
      let selectedExams = [];
      let selectedStreams = {};
      try { selectedExams = JSON.parse(prefsRow.selected_exams_json || '[]'); } catch (e) {}
      try { selectedStreams = JSON.parse(prefsRow.selected_streams_json || '{}'); } catch (e) {}
      preferences = {
        domain: prefsRow.domain_slug || null,
        track: prefsRow.track_slug || null,
        primaryExam: prefsRow.primary_exam || null,
        selectedExams: Array.isArray(selectedExams) ? selectedExams : [],
        selectedStreams: selectedStreams && typeof selectedStreams === 'object' ? selectedStreams : {},
        updatedAt: prefsRow.updated_at || null
      };
    }

    const user = {
      id: session.userId,
      email: session.email,
      name: profile ? profile.full_name : 'Candidate Aspirant',
      fullName: profile ? profile.full_name : 'Candidate Aspirant',
      phone: profile && profile.phone ? profile.phone : '',
      district: profile ? profile.district : 'Balasore (Baleswar)',
      targetStreams,
      role: (roleRow && roleRow.role) || 'candidate'
    };

    return jsonResponse({
      success: true,
      authenticated: true,
      user,
      controls,
      preferences
    }, 200);

  } catch (error) {
    console.error('Session Me Error:', error);
    return jsonResponse({ success: false, authenticated: false, error: 'Session lookup failed.' }, 500);
  }
}
