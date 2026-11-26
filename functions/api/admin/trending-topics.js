/**
 * Common Sense Odisha — Admin Trending & Popular Topics API (v367)
 * Protected under /api/admin/trending-topics (requireRole STAFF_ROLES + CSRF + audit + edge cache purge)
 *
 * GET  /api/admin/trending-topics       -> returns current topics (with live D1 counts) + default 6 topics
 * PUT  /api/admin/trending-topics       -> saves custom topics[] to site_settings (`homepage_trending_topics_json`)
 *                                          or resets to defaults when `{ reset: true }` is sent
 * POST /api/admin/trending-topics/reset -> 1-click reset to default 6 topics
 */
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import {
  TRENDING_TOPICS_SETTING_KEY,
  DEFAULT_TRENDING_TOPICS,
  TRENDING_ICON_KEYS,
  TRENDING_BADGE_PRESETS,
  normalizeTrendingTopicsList,
  readTrendingTopicsConfig,
  buildTrendingTopicsFeed
} from '../../_lib/trending-topics.js';

export async function handleAdminTrendingTopicsApi(request, env, actor, subId = '') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');

  if (request.method === 'GET') {
    const [cfg, topics] = await Promise.all([
      readTrendingTopicsConfig(env),
      buildTrendingTopicsFeed(env, { includeDisabled: true })
    ]);
    return json({
      ok: true,
      topics,
      defaults: DEFAULT_TRENDING_TOPICS,
      icon_keys: TRENDING_ICON_KEYS,
      badge_presets: TRENDING_BADGE_PRESETS,
      is_custom: cfg.isCustom,
      updated_at: cfg.updatedAt
    });
  }

  if (request.method !== 'PUT' && request.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const body = await readJson(request, 60000).catch(() => ({}));
  const isReset = subId === 'reset' || Boolean(body && body.reset === true);

  if (isReset) {
    await env.DB.prepare('DELETE FROM site_settings WHERE key = ?')
      .bind(TRENDING_TOPICS_SETTING_KEY)
      .run();
    await audit(env, request, actor, 'site.trending_topics.reset', 'site_settings', TRENDING_TOPICS_SETTING_KEY, { reset: true });
    const topics = await buildTrendingTopicsFeed(env, { includeDisabled: true });
    return json({
      ok: true,
      reset: true,
      is_custom: false,
      topics,
      defaults: DEFAULT_TRENDING_TOPICS,
      updated_at: new Date().toISOString()
    });
  }

  const rawTopics = Array.isArray(body && body.topics) ? body.topics : (Array.isArray(body) ? body : null);
  if (!rawTopics || !rawTopics.length) {
    throw validationError({ topics: 'Provide at least 1 trending topic' });
  }
  if (rawTopics.length > 12) {
    throw validationError({ topics: 'Maximum 12 trending topics allowed' });
  }

  const errors = {};
  rawTopics.forEach((t, idx) => {
    const title = String((t && (t.title_en || t.title)) || '').trim();
    if (!title) errors[`topics.${idx}.title_en`] = `Topic #${idx + 1} requires an English title`;
    const href = String((t && t.href) || '').trim();
    if (href && !(href.startsWith('/') && !href.startsWith('//') && !href.includes('\\')) && !/^https?:\/\//i.test(href)) {
      errors[`topics.${idx}.href`] = `Topic #${idx + 1} has an invalid URL`;
    }
  });
  if (Object.keys(errors).length) throw validationError(errors);

  const normalized = normalizeTrendingTopicsList(rawTopics.map((t, i) => ({
    ...t,
    sort_order: Number.isFinite(Number(t && t.sort_order)) ? Number(t.sort_order) : (i + 1)
  })));

  if (!normalized.some((t) => t.enabled)) {
    throw validationError({ topics: 'Keep at least 1 topic enabled for the public homepage' });
  }

  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  ).bind(
    TRENDING_TOPICS_SETTING_KEY,
    JSON.stringify({ topics: normalized }),
    actor.userId || actor.email || 'admin'
  ).run();

  await audit(env, request, actor, 'site.trending_topics.update', 'site_settings', TRENDING_TOPICS_SETTING_KEY, {
    count: normalized.length,
    enabled_count: normalized.filter((t) => t.enabled).length
  });

  const [cfg, topics] = await Promise.all([
    readTrendingTopicsConfig(env),
    buildTrendingTopicsFeed(env, { includeDisabled: true })
  ]);

  return json({
    ok: true,
    is_custom: cfg.isCustom,
    topics,
    updated_at: cfg.updatedAt || new Date().toISOString()
  });
}
