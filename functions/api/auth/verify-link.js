/**
 * Cloudflare Pages Functions — Magic Link Verification Handler
 * Route: GET /api/auth/verify-link?email=...&token=...
 */

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequestGet({ request, env, ctx }) {
  try {
    const url = new URL(request.url);
    const emailParam = url.searchParams.get('email') || '';
    const tokenParam = url.searchParams.get('token') || '';

    const cleanEmail = emailParam.trim().toLowerCase();
    const cleanToken = tokenParam.trim();

    if (!cleanEmail || !cleanToken) {
      return new Response('Invalid verification link. Missing parameters.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    if (!env || !env.DB) {
      return new Response('Database service unavailable. Please try again later.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    // Look up pending row by email and token (channel 2: magic link)
    const pending = await env.DB.prepare(`
      SELECT email, token, password_hash, salt, candidate_data, expires_at
      FROM email_verifications
      WHERE LOWER(email) = ? AND token = ?
    `).bind(cleanEmail, cleanToken).first();

    if (!pending || pending.expires_at < nowUnix) {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Link Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,sans-serif;background:#090e18;color:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;padding:2rem;max-width:400px;background:#0f172a;border-radius:12px;border:1px solid #1e293b;"><h2>Link Expired or Invalid</h2><p style="color:#94a3b8;font-size:0.9rem;">This magic verification link has expired or has already been used.</p><a href="/signup.html" style="display:inline-block;margin-top:1rem;padding:0.75rem 1.5rem;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Request New Link</a></div></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Generate new user ID
    const userId = 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    let candidateObj = {
      fullName: 'Candidate Aspirant',
      district: 'Balasore (Baleswar)',
      targetStreams: ['opsc', 'ossc']
    };

    if (pending.candidate_data) {
      try {
        const parsed = JSON.parse(pending.candidate_data);
        if (parsed && typeof parsed === 'object') {
          candidateObj = { ...candidateObj, ...parsed };
        }
      } catch (e) {}
    }

    const streamArray = Array.isArray(candidateObj.targetStreams)
      ? candidateObj.targetStreams
      : ['opsc', 'ossc'];

    // Atomically promote account
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO users (
          id, email, password_hash, salt, failed_attempts, lockout_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
      `).bind(userId, cleanEmail, pending.password_hash, pending.salt, nowUnix, nowUnix),

      env.DB.prepare(`
        INSERT INTO candidates (
          id, full_name, email, district, password_hash, salt, failed_attempts, lockout_until, target_streams, created_at, last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `).bind(userId, candidateObj.fullName, cleanEmail, candidateObj.district, pending.password_hash, pending.salt, JSON.stringify(streamArray), nowIso, nowIso),

      env.DB.prepare(
        'DELETE FROM email_verifications WHERE LOWER(email) = ?'
      ).bind(cleanEmail)
    ]);

    // Lazy prune expired verifications
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(
        env.DB.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(nowUnix).run().catch(() => {})
      );
    }

    // Set HttpOnly session cookie and redirect via 302
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/student-dashboard/?verified=1',
        'Set-Cookie': `cso_session=${userId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      }
    });

  } catch (err) {
    console.error('Verify Link Error:', err);
    return new Response('An error occurred during verification. Please try again.', { status: 500 });
  }
}
