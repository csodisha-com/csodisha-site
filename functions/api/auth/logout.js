/**
 * Cloudflare Pages / Worker Functions — Session revocation
 * Route: POST /api/auth/logout
 *
 * Deletes the active session row and clears the HttpOnly cookie. Always
 * returns 200 so clients can clear local state unconditionally.
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

export async function onRequestPost({ request, env }) {
  try {
    if (env && env.DB) {
      const session = await getSessionFromRequest(request, env);
      if (session) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(session.token).run();
      }
    }

    return jsonResponse({
      success: true,
      message: 'Logged out successfully.'
    }, 200, {
      // Clear the cookie in every browser context
      'Set-Cookie': 'cso_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    });

  } catch (error) {
    console.error('Logout Error:', error);
    return jsonResponse({ success: false, error: 'Logout failed. Please try again.' }, 500);
  }
}
