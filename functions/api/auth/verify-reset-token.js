/**
 * Cloudflare Pages Functions — Reset Token Validity Check (magic-link page)
 * Route: POST /api/auth/verify-reset-token
 *
 * Body: { token }
 * Stateless check (no state change, no consumption) used by
 * /reset-password.html to present the "Set New Password" fields only when
 * the one-click link token is still valid.
 */

import { CORS_HEADERS, jsonResponse } from './_utils.js';
import { sha256Hex } from './_reset-utils.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.DB) {
      return jsonResponse({ success: false, valid: false, error: 'Database service unavailable' }, 500);
    }

    let body = {};
    try { body = await request.json(); } catch { /* handled below */ }

    const magicToken = String(body.token || '').trim();
    if (!magicToken) {
      return jsonResponse({ success: true, valid: false, error: 'Missing reset token.' }, 200);
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const tokenHash = await sha256Hex(magicToken);
    const reset = await env.DB.prepare(`
      SELECT id, used, expires_at
      FROM password_resets
      WHERE token_hash = ?
      ORDER BY expires_at DESC
      LIMIT 1
    `).bind(tokenHash).first();

    const valid = !!reset && !reset.used && (reset.expires_at || 0) > nowUnix;
    return jsonResponse({ success: true, valid }, 200);

  } catch (err) {
    console.error('Verify Reset Token Error:', err);
    return jsonResponse({ success: false, valid: false, error: 'Unable to validate the reset token.' }, 500);
  }
}
