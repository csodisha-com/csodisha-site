// Role-based access control, CSRF, D1-backed rate limiting and audit logging.
// users.role is the single source of truth — it is re-read from D1 on every
// request, so demotions take effect immediately and sessions.role is ignored.
import { getSessionFromRequest } from '../api/auth/_utils.js';
import { HttpError, clientIp } from './http.js';

export const STAFF_ROLES = ['editor', 'admin'];
export const ALL_ROLES = ['candidate', 'editor', 'admin'];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function getActor(request, env) {
  if (!env || !env.DB) return null;
  const session = await getSessionFromRequest(request, env);
  if (!session) return null;
  const row = await env.DB.prepare('SELECT id, email, role FROM users WHERE id = ?').bind(session.userId).first();
  if (!row) return null;
  return { userId: row.id, email: row.email, role: row.role || 'candidate', sessionToken: session.token };
}

// CSRF: mutating requests must come from our own origin AND carry the custom header.
// (Cookie is SameSite=Lax as a third layer.)
export function verifyCsrf(request) {
  const self = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  let ok = false;
  if (origin) {
    ok = origin === self;
  } else {
    const ref = request.headers.get('Referer');
    try { ok = !!ref && new URL(ref).origin === self; } catch { ok = false; }
  }
  if (!ok || request.headers.get('X-CSO-CSRF') !== '1') {
    throw new HttpError(403, 'CSRF_REJECTED', 'Cross-site request rejected');
  }
}

export async function requireRole(request, env, roles = STAFF_ROLES) {
  const actor = await getActor(request, env);
  if (!actor) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in required');
  if (!roles.includes(actor.role)) throw new HttpError(403, 'FORBIDDEN', 'You do not have permission for this action');
  if (MUTATING.has(request.method)) verifyCsrf(request);
  return actor;
}

// Fixed-window counter in D1 (survives isolate restarts, shared across the edge).
export async function rateLimit(env, key, max, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  const row = await env.DB.prepare(
    `INSERT INTO admin_rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET count = count + 1
     RETURNING count`
  ).bind(`${key}:${windowStart}`, windowStart).first();
  if (Math.random() < 0.02) {
    await env.DB.prepare('DELETE FROM admin_rate_limits WHERE window_start < ?').bind(now - 86400).run();
  }
  if (row && row.count > max) {
    throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.', { retryAfter: windowStart + windowSec - now });
  }
}

export async function audit(env, request, actor, action, targetType, targetId, metadata = null) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(actor ? actor.userId : null, action, targetType || null, targetId || null,
      metadata ? JSON.stringify(metadata).slice(0, 4000) : null, clientIp(request)).run();
  } catch (e) {
    console.error('audit_log write failed:', e);
  }
}
