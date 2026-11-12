// Cron Lifecycle & D1 Maintenance Engine.
// Invoked every 15 minutes by the Cloudflare Worker `scheduled()` trigger and on-demand
// via `POST /api/admin/maintenance/run` (admin-only, CSRF-protected).

export const LAST_CRON_KEY = 'last_cron_run';

export function defaultLastCronRun() {
  return {
    promoted: 0,
    expired: 0,
    cleaned: 0,
    ran_at: null,
    actor_id: null
  };
}

export async function readLastCronRun(env) {
  if (!env || !env.DB) return defaultLastCronRun();
  try {
    const row = await env.DB.prepare(
      'SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?'
    ).bind(LAST_CRON_KEY).first();
    if (!row || !row.value_json) return defaultLastCronRun();
    const parsed = JSON.parse(row.value_json);
    return {
      ...defaultLastCronRun(),
      ...parsed,
      actor_id: parsed.actor_id || row.updated_by || null,
      updated_at: row.updated_at || parsed.ran_at || null
    };
  } catch {
    return defaultLastCronRun();
  }
}

export async function runLifecycleMaintenance(env, { actorId = 'system:cron', ipAddress = null } = {}) {
  if (!env || !env.DB) {
    throw new Error('Database binding unavailable');
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  const ranAt = new Date().toISOString();

  // Execute content lifecycle transitions and expired token/rate-limit cleanup atomically.
  const [
    rPosts,
    rTests,
    rExpired,
    rRateLimits,
    rSessions,
    rVerifications,
    rResets
  ] = await env.DB.batch([
    // 1a. Promote scheduled current_affairs and jobs whose publish time has arrived
    env.DB.prepare(
      `UPDATE posts
       SET status = 'published', updated_by = ?, updated_at = datetime('now')
       WHERE type IN ('current_affair', 'job')
         AND status = 'scheduled'
         AND published_at IS NOT NULL
         AND published_at <= datetime('now')
         AND deleted_at IS NULL`
    ).bind(actorId),

    // 1b. Promote scheduled mock_tests whose publish time has arrived
    env.DB.prepare(
      `UPDATE mock_tests
       SET status = 'published', updated_by = ?, updated_at = datetime('now')
       WHERE status = 'scheduled'
         AND published_at IS NOT NULL
         AND published_at <= datetime('now')
         AND deleted_at IS NULL`
    ).bind(actorId),

    // 2. Flag active published jobs whose application deadline (last_date < date('now')) has passed
    env.DB.prepare(
      `UPDATE posts
       SET status = 'expired', updated_by = ?, updated_at = datetime('now')
       WHERE type = 'job'
         AND status = 'published'
         AND last_date IS NOT NULL
         AND last_date != ''
         AND last_date < date('now')
         AND deleted_at IS NULL`
    ).bind(actorId),

    // 3a. Purge expired D1 fixed-window rate-limit counters (>24h old)
    env.DB.prepare(
      'DELETE FROM admin_rate_limits WHERE window_start < ?'
    ).bind(nowUnix - 86400),

    // 3b. Purge expired server sessions
    env.DB.prepare(
      'DELETE FROM sessions WHERE expires_at <= ?'
    ).bind(nowUnix),

    // 3c. Purge expired pending email OTP / magic-link verifications
    env.DB.prepare(
      'DELETE FROM email_verifications WHERE expires_at <= ?'
    ).bind(nowUnix),

    // 3d. Purge expired or already-consumed password reset grants
    env.DB.prepare(
      'DELETE FROM password_resets WHERE expires_at <= ? OR used = 1'
    ).bind(nowUnix)
  ]);

  const promotedPosts = Number(rPosts?.meta?.changes || 0);
  const promotedTests = Number(rTests?.meta?.changes || 0);
  const promoted = promotedPosts + promotedTests;
  const expired = Number(rExpired?.meta?.changes || 0);

  const cleanedRateLimits = Number(rRateLimits?.meta?.changes || 0);
  const cleanedSessions = Number(rSessions?.meta?.changes || 0);
  const cleanedVerifications = Number(rVerifications?.meta?.changes || 0);
  const cleanedResets = Number(rResets?.meta?.changes || 0);
  const cleaned = cleanedRateLimits + cleanedSessions + cleanedVerifications + cleanedResets;

  const summary = {
    promoted,
    expired,
    cleaned,
    ran_at: ranAt,
    actor_id: actorId,
    details: {
      promoted_posts: promotedPosts,
      promoted_tests: promotedTests,
      cleaned_rate_limits: cleanedRateLimits,
      cleaned_sessions: cleanedSessions,
      cleaned_verifications: cleanedVerifications,
      cleaned_resets: cleanedResets
    }
  };

  // Persist telemetry in site_settings and record audit_log entry atomically.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(LAST_CRON_KEY, JSON.stringify(summary), actorId),
    env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      actorId,
      'maintenance.run',
      'site_settings',
      LAST_CRON_KEY,
      JSON.stringify(summary).slice(0, 4000),
      ipAddress || 'system'
    )
  ]);

  return summary;
}
