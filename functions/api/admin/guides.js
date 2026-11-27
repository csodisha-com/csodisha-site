/**
 * Admin CRUD API for Informative Articles & Guides (v348)
 * Routes (via /api/admin/guides):
 *   GET    /api/admin/guides                  -> List guides + category/draft counts
 *   GET    /api/admin/guides/:id              -> Fetch single guide by id or slug
 *   POST   /api/admin/guides                  -> Create guide (draft or published)
 *   PUT    /api/admin/guides/:id              -> Full update guide
 *   PATCH  /api/admin/guides/:id              -> Quick toggle (status, is_pinned, is_exam)
 *   POST   /api/admin/guides/:id/duplicate    -> Duplicate guide as draft template
 *   DELETE /api/admin/guides/:id              -> Delete guide + clean Vectorize & Latest Updates
 */

import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import {
  GUIDE_CATEGORIES,
  ensureInformativeGuidesSchema,
  recordGuideSlugChange,
  slugifyGuide,
  safeGuideUrl,
  normalizeCategory,
  normalizeTakeaways,
  normalizePhotos,
  normalizePdfs,
  normalizeLinks,
  normalizeRelatedCta,
  estimateReadMinutes,
  formatGuideRow
} from '../../_lib/informative-guides.js';
import { upsertLatestUpdateMeta, unpublishLatestUpdateItem, normalizeScope } from '../../_lib/latest-updates.js';
import { invalidateEdgePaths } from '../../_lib/edge-cache-invalidator.js';
import { scheduleSemanticSync } from '../../_lib/semantic-search.js';
import { validateAndNormalizeQuizJson } from '../../_lib/article-mini-quiz.js';
import { pingIndexNowUrls } from '../../_lib/indexnow-pinger.js';
import { recordAdminAuditLog } from './system-ops.js';

function purgeGuideEdgePaths(request, ctx, slugs = []) {
  const paths = ['/api/public/home-feed', '/api/public/search-index', '/api/public/jobs-hub', '/api/public/exams-hub', '/api/public/article-quiz', '/', '/index.html', '/api/public/guides', '/guides/', '/updates/', '/sitemap.xml', '/feed.xml', '/rss.xml', '/feed.json'];
  for (const s of slugs) {
    const clean = String(s || '').trim();
    if (clean) {
      paths.push(`/guides/${encodeURIComponent(clean)}`);
      paths.push(`/api/public/article-quiz?type=guide&slug=${encodeURIComponent(clean)}`);
      paths.push(`/api/public/article-quiz?type=guide&slug=${encodeURIComponent(clean)}&auto_only=1`);
    }
  }
  const p = invalidateEdgePaths(request, paths).catch(() => {});
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
  return p;
}

async function ensureUniqueSlug(db, baseSlug, excludeId = '') {
  let candidate = slugifyGuide(baseSlug) || ('guide-' + Date.now().toString(36));
  let attempt = 0;
  while (attempt < 20) {
    const row = await db.prepare(
      'SELECT id FROM informative_guides WHERE slug = ? LIMIT 1'
    ).bind(candidate).first();
    if (!row || (excludeId && String(row.id) === String(excludeId))) {
      return candidate;
    }
    attempt += 1;
    candidate = `${slugifyGuide(baseSlug).slice(0, 78)}-${attempt + 1}`;
  }
  return `${slugifyGuide(baseSlug).slice(0, 72)}-${Date.now().toString(36)}`;
}

async function computeCounts(db) {
  const counts = { all: 0, published: 0, drafts: 0, 'how-to': 0, 'exam-strategy': 0, 'citizen-scheme': 0, 'odisha-gk': 0 };
  try {
    const { results } = await db.prepare(
      'SELECT category, status, COUNT(*) AS cnt FROM informative_guides GROUP BY category, status'
    ).all();
    for (const r of (results || [])) {
      const n = Number(r.cnt || 0);
      counts.all += n;
      if (String(r.status) === 'published') counts.published += n;
      else counts.drafts += n;
      const cat = normalizeCategory(r.category);
      counts[cat] = (counts[cat] || 0) + n;
    }
  } catch (_e) {}
  return counts;
}

function buildSemanticRow(guide) {
  const takeawayText = (guide.takeaways || []).map((t) => t.text_en).filter(Boolean).join(' • ');
  return {
    id: guide.id,
    slug: guide.slug,
    title_en: guide.title_en,
    title_or: guide.title_or,
    summary_en: [guide.summary_en, takeawayText, guide.tags].filter(Boolean).join(' | ').slice(0, 1200),
    summary_or: guide.summary_or,
    url: `/guides/${encodeURIComponent(guide.slug)}`
  };
}

export async function handleAdminGuidesApi(request, env, actor, id = '', sub = '', ctx = null) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureInformativeGuidesSchema(env.DB);
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const actorEmail = (actor && actor.email) || 'admin';
  const actorId = (actor && actor.userId) || 'admin';

  // GET /api/admin/guides/:id
  if (method === 'GET' && id) {
    const row = await env.DB.prepare(
      'SELECT * FROM informative_guides WHERE id = ? OR slug = ? LIMIT 1'
    ).bind(id, id).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Guide not found');
    return json({ ok: true, item: formatGuideRow(row), categories: GUIDE_CATEGORIES });
  }

  // GET /api/admin/guides
  if (method === 'GET') {
    const category = String(url.searchParams.get('category') || '').trim().toLowerCase();
    const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 100));

    let sql = 'SELECT * FROM informative_guides WHERE 1=1';
    const binds = [];
    if (category && category !== 'all' && category !== 'drafts') {
      sql += ' AND category = ?';
      binds.push(normalizeCategory(category));
    }
    if (status === 'draft' || category === 'drafts') {
      sql += " AND status = 'draft'";
    } else if (status === 'published') {
      sql += " AND status = 'published'";
    }
    sql += ' ORDER BY is_pinned DESC, updated_at DESC LIMIT ?';
    binds.push(limit);

    const [{ results }, counts] = await Promise.all([
      env.DB.prepare(sql).bind(...binds).all(),
      computeCounts(env.DB)
    ]);

    let items = (results || []).map(formatGuideRow);
    if (q) {
      items = items.filter((g) =>
        `${g.title_en} ${g.title_or} ${g.slug} ${g.summary_en} ${g.tags}`.toLowerCase().includes(q)
      );
    }

    return json({ ok: true, items, counts, categories: GUIDE_CATEGORIES });
  }

  // POST /api/admin/guides/:id/duplicate
  if (method === 'POST' && id && sub === 'duplicate') {
    const orig = await env.DB.prepare(
      'SELECT * FROM informative_guides WHERE id = ? OR slug = ? LIMIT 1'
    ).bind(id, id).first();
    if (!orig) throw new HttpError(404, 'NOT_FOUND', 'Guide not found to duplicate');
    const newId = 'guide_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const newSlug = await ensureUniqueSlug(env.DB, `${orig.slug}-copy`);
    const now = new Date().toISOString();
    const copyTitleEn = `Copy of ${orig.title_en}`.slice(0, 180);
    const copyTitleOr = orig.title_or ? `${orig.title_or} (ନକଲ)`.slice(0, 220) : '';

    await env.DB.prepare(`
      INSERT INTO informative_guides (
        id, slug, category, title_en, title_or, summary_en, summary_or, takeaways_json,
        body_en, body_or, cover_image, cover_caption_en, cover_caption_or,
        photos_json, pdfs_json, links_json, related_cta_json, quiz_json,
        read_minutes, tags, scope, is_pinned, is_exam, status, author_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft', ?, ?, ?)
    `).bind(
      newId, newSlug, orig.category, copyTitleEn, copyTitleOr, orig.summary_en, orig.summary_or,
      orig.takeaways_json, orig.body_en, orig.body_or, orig.cover_image, orig.cover_caption_en, orig.cover_caption_or,
      orig.photos_json, orig.pdfs_json, orig.links_json, orig.related_cta_json, String(orig.quiz_json || ''),
      orig.read_minutes, orig.tags, orig.scope, orig.is_exam, actorEmail, now, now
    ).run();

    const created = await env.DB.prepare('SELECT * FROM informative_guides WHERE id = ?').bind(newId).first();
    recordAdminAuditLog(env, request, actor, 'guides.duplicate', newId, { source_id: orig.id, slug: newSlug }, ctx);
    return json({ ok: true, item: formatGuideRow(created) }, 201);
  }

  // PATCH /api/admin/guides/:id (quick toggle: status / is_pinned / is_exam)
  if (method === 'PATCH' && id) {
    const existing = await env.DB.prepare(
      'SELECT * FROM informative_guides WHERE id = ? OR slug = ? LIMIT 1'
    ).bind(id, id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Guide not found');
    const body = await readJson(request, 16000);
    const nextStatus = body.status !== undefined
      ? (String(body.status).toLowerCase() === 'published' ? 'published' : 'draft')
      : existing.status;
    const nextPinned = body.is_pinned !== undefined ? (body.is_pinned ? 1 : 0) : Number(existing.is_pinned || 0);
    const nextExam = body.is_exam !== undefined ? (body.is_exam ? 1 : 0) : Number(existing.is_exam || 0);
    const nextScope = body.scope !== undefined ? normalizeScope(body.scope) : existing.scope;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE informative_guides
      SET status = ?, is_pinned = ?, is_exam = ?, scope = ?, updated_at = ?
      WHERE id = ?
    `).bind(nextStatus, nextPinned, nextExam, nextScope, now, existing.id).run();

    const updatedRow = await env.DB.prepare('SELECT * FROM informative_guides WHERE id = ?').bind(existing.id).first();
    const formatted = formatGuideRow(updatedRow);

    if (formatted.status === 'published') {
      await upsertLatestUpdateMeta(env.DB, {
        entity_type: 'guide',
        entity_id: formatted.id,
        is_pinned: formatted.is_pinned,
        scope: formatted.scope,
        is_exam: formatted.is_exam
      }).catch(() => {});
      scheduleSemanticSync(ctx, env, { action: 'upsert', type: 'guide', row: buildSemanticRow(formatted), actorId });
    } else {
      await upsertLatestUpdateMeta(env.DB, {
        entity_type: 'guide',
        entity_id: formatted.id,
        is_pinned: false,
        scope: formatted.scope,
        is_exam: formatted.is_exam
      }).catch(() => {});
      scheduleSemanticSync(ctx, env, { action: 'delete', type: 'guide', id: formatted.id, actorId });
    }

    recordAdminAuditLog(env, request, actor, 'guides.patch', formatted.id, { status: formatted.status, is_pinned: formatted.is_pinned }, ctx);
    await purgeGuideEdgePaths(request, ctx, [formatted.slug]);
    const indexnow = formatted.status === 'published'
      ? pingIndexNowUrls(env, [`https://csodisha.com/guides/${encodeURIComponent(formatted.slug)}`, 'https://csodisha.com/', 'https://csodisha.com/guides/'], ctx)
      : { queued: false, urls: [] };
    return json({ ok: true, item: formatted, indexnow });
  }

  // POST /api/admin/guides or PUT /api/admin/guides/:id
  if (method === 'POST' || (method === 'PUT' && id)) {
    const body = await readJson(request, 128000);
    const existing = method === 'PUT'
      ? await env.DB.prepare('SELECT * FROM informative_guides WHERE id = ? OR slug = ? LIMIT 1').bind(id, id).first()
      : null;
    if (method === 'PUT' && !existing) throw new HttpError(404, 'NOT_FOUND', 'Guide not found');

    const titleEn = String(body.title_en || '').trim().slice(0, 200);
    if (!titleEn) throw validationError({ title_en: 'Title (English) is required' });

    const titleOr = String(body.title_or || '').trim().slice(0, 260);
    const category = normalizeCategory(body.category || (existing && existing.category) || 'how-to');
    const summaryEn = String(body.summary_en || '').trim().slice(0, 600);
    const summaryOr = String(body.summary_or || '').trim().slice(0, 800);
    const bodyEn = String(body.body_en || '').trim().slice(0, 60000);
    const bodyOr = String(body.body_or || '').trim().slice(0, 80000);
    const takeaways = normalizeTakeaways(body.takeaways !== undefined ? body.takeaways : body.takeaways_json);
    const coverImage = safeGuideUrl(body.cover_image);
    const coverCaptionEn = String(body.cover_caption_en || '').trim().slice(0, 280);
    const coverCaptionOr = String(body.cover_caption_or || '').trim().slice(0, 360);
    const photos = normalizePhotos(body.photos !== undefined ? body.photos : body.photos_json);
    const pdfs = normalizePdfs(body.pdfs !== undefined ? body.pdfs : body.pdfs_json);
    const links = normalizeLinks(body.links !== undefined ? body.links : body.links_json);
    const relatedCta = normalizeRelatedCta(body.related_cta !== undefined ? body.related_cta : body.related_cta_json);
    const quizJson = body.quiz_json !== undefined
      ? validateAndNormalizeQuizJson(body.quiz_json)
      : (existing ? String(existing.quiz_json || '') : '');
    const readMinutes = estimateReadMinutes(bodyEn, body.read_minutes);
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t || '').trim()).filter(Boolean).join(', ').slice(0, 300)
      : String(body.tags || '').trim().slice(0, 300);
    const scope = normalizeScope(body.scope || 'Odisha');
    const isPinned = (body.is_pinned === true || body.is_pinned === 1 || body.is_pinned === '1') ? 1 : 0;
    const isExam = (body.is_exam === true || body.is_exam === 1 || body.is_exam === '1') ? 1 : 0;
    const status = String(body.status || 'draft').trim().toLowerCase() === 'published' ? 'published' : 'draft';
    const now = new Date().toISOString();

    const guideId = existing ? existing.id : ('guide_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
    const slug = await ensureUniqueSlug(env.DB, body.slug || titleEn, existing ? existing.id : '');

    if (existing) {
      await env.DB.prepare(`
        UPDATE informative_guides SET
          slug = ?, category = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?,
          takeaways_json = ?, body_en = ?, body_or = ?,
          cover_image = ?, cover_caption_en = ?, cover_caption_or = ?,
          photos_json = ?, pdfs_json = ?, links_json = ?, related_cta_json = ?, quiz_json = ?,
          read_minutes = ?, tags = ?, scope = ?, is_pinned = ?, is_exam = ?, status = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        slug, category, titleEn, titleOr, summaryEn, summaryOr,
        JSON.stringify(takeaways), bodyEn, bodyOr,
        coverImage, coverCaptionEn, coverCaptionOr,
        JSON.stringify(photos), JSON.stringify(pdfs), JSON.stringify(links), JSON.stringify(relatedCta), quizJson,
        readMinutes, tags, scope, isPinned, isExam, status,
        now, guideId
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO informative_guides (
          id, slug, category, title_en, title_or, summary_en, summary_or, takeaways_json,
          body_en, body_or, cover_image, cover_caption_en, cover_caption_or,
          photos_json, pdfs_json, links_json, related_cta_json, quiz_json,
          read_minutes, tags, scope, is_pinned, is_exam, status, author_email, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        guideId, slug, category, titleEn, titleOr, summaryEn, summaryOr, JSON.stringify(takeaways),
        bodyEn, bodyOr, coverImage, coverCaptionEn, coverCaptionOr,
        JSON.stringify(photos), JSON.stringify(pdfs), JSON.stringify(links), JSON.stringify(relatedCta), quizJson,
        readMinutes, tags, scope, isPinned, isExam, status, actorEmail, now, now
      ).run();
    }

    const saved = await env.DB.prepare('SELECT * FROM informative_guides WHERE id = ?').bind(guideId).first();
    await recordGuideSlugChange(env.DB, guideId, existing ? existing.slug : '', slug).catch(() => {});
    const formatted = formatGuideRow(saved);

    await upsertLatestUpdateMeta(env.DB, {
      entity_type: 'guide',
      entity_id: formatted.id,
      is_pinned: formatted.status === 'published' && formatted.is_pinned,
      scope: formatted.scope,
      is_exam: formatted.is_exam
    }).catch(() => {});

    if (formatted.status === 'published') {
      scheduleSemanticSync(ctx, env, { action: 'upsert', type: 'guide', row: buildSemanticRow(formatted), actorId });
    } else {
      scheduleSemanticSync(ctx, env, { action: 'delete', type: 'guide', id: formatted.id, actorId });
    }

    recordAdminAuditLog(env, request, actor, existing ? 'guides.update' : 'guides.create', formatted.id, { slug: formatted.slug, status: formatted.status }, ctx);
    await purgeGuideEdgePaths(request, ctx, [formatted.slug, existing && existing.slug !== formatted.slug ? existing.slug : '']);
    const indexnow = formatted.status === 'published'
      ? pingIndexNowUrls(env, [`https://csodisha.com/guides/${encodeURIComponent(formatted.slug)}`, 'https://csodisha.com/', 'https://csodisha.com/guides/'], ctx)
      : { queued: false, urls: [] };
    return json({ ok: true, item: formatted, indexnow }, existing ? 200 : 201);
  }

  // DELETE /api/admin/guides/:id
  if (method === 'DELETE' && id) {
    const existing = await env.DB.prepare(
      'SELECT id, slug, title_en FROM informative_guides WHERE id = ? OR slug = ? LIMIT 1'
    ).bind(id, id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Guide not found');

    await env.DB.prepare('DELETE FROM informative_guides WHERE id = ?').bind(existing.id).run();
    await unpublishLatestUpdateItem(env.DB, 'guide', existing.id).catch(() => {});
    scheduleSemanticSync(ctx, env, { action: 'delete', type: 'guide', id: existing.id, actorId });
    recordAdminAuditLog(env, request, actor, 'guides.delete', existing.id, { slug: existing.slug, title_en: existing.title_en }, ctx);
    await purgeGuideEdgePaths(request, ctx, [existing.slug]);
    return json({ ok: true, deleted: true, id: existing.id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
