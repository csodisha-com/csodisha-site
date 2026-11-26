/**
 * Common Sense Odisha — Unified Latest Updates Engine (v337)
 *
 * Aggregates the latest published items across ALL Admin Studio content tables:
 *   - job_articles
 *   - scheme_articles
 *   - cso_current_affairs
 *   - study_articles
 *   - careers_articles
 *   - posts (legacy jobs / current_affairs)
 *   - community_posts (polls & civic threads)
 *
 * Persists explicit homepage pinning (`is_pinned`) and geographic `scope` (`Odisha` | `National`)
 * in `cso_latest_updates_meta` (created idempotently without requiring destructive table alters).
 */

const VALID_ENTITY_TYPES = new Set([
  'job',
  'scheme',
  'current_affairs',
  'study',
  'career',
  'post',
  'community'
]);

const DEFAULT_CTAS = {
  JOB: 'View Job →',
  SCHEME: 'Check Scheme →',
  STUDY: 'Read Guide →',
  'CURRENT AFFAIRS': 'Read Brief →',
  CAREER: 'View Roadmap →',
  COMMUNITY: 'Join Discussion →'
};

export async function ensureLatestUpdatesMetaSchema(db) {
  if (!db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS cso_latest_updates_meta (
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        scope TEXT NOT NULL DEFAULT 'Odisha',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (entity_type, entity_id)
      )`
    ).run();
  } catch { /* ignore in minimal mock DBs */ }
}

export function normalizeScope(raw, hints = []) {
  const explicit = String(raw || '').trim().toLowerCase();
  if (explicit === 'national' || explicit === 'central' || explicit === 'all-india' || explicit === 'all india' || explicit === 'india') {
    return 'National';
  }
  if (explicit === 'odisha' || explicit === 'state' || explicit === 'odisha state') {
    return 'Odisha';
  }
  const combined = hints.filter(Boolean).join(' ').toLowerCase();
  if (/\b(national|central|all[\s-]?india|upsc|ssc|rrb|nta|ugc\s*net|ibps|central govt|india)\b/i.test(combined) && !/\b(odisha|opsc|ossc|osssc|otet|osstet|oavs)\b/i.test(combined)) {
    return 'National';
  }
  return 'Odisha';
}

export function isExternalHref(url) {
  const s = String(url || '').trim();
  if (!/^https?:\/\//i.test(s)) return false;
  return !/^https?:\/\/(?:www\.)?csodisha\.com(?:\/|$)/i.test(s);
}

function safePublicUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//') && !s.includes('\\')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function formatShortDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s.slice(0, 16);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${m[3]} ${months[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

function buildMetaLine(parts) {
  return parts
    .map((p) => String(p || '').trim())
    .filter((p) => p && !/^cs\s*odisha\s*editorial\s*desk$/i.test(p))
    .slice(0, 2)
    .join(' • ');
}

function buildFilterTags(categoryTag, scope) {
  const tags = new Set(['all']);
  if (categoryTag) tags.add(categoryTag);
  tags.add(scope === 'National' ? 'national' : 'odisha');
  return Array.from(tags);
}

function resolveCta(badgeType, url, isPoll = false) {
  const ext = isExternalHref(url);
  if (ext) return { cta_label: 'Official Source ↗', is_external: true };
  if (badgeType === 'COMMUNITY' && isPoll) {
    return { cta_label: 'Join Poll →', is_external: false };
  }
  return { cta_label: DEFAULT_CTAS[badgeType] || 'View Details →', is_external: false };
}

export async function upsertLatestUpdateMeta(db, { entity_type, entity_id, is_pinned, scope }) {
  if (!db) return { ok: false };
  const cleanType = String(entity_type || '').trim().toLowerCase();
  const cleanId = String(entity_id || '').trim();
  if (!VALID_ENTITY_TYPES.has(cleanType) || !cleanId) {
    return { ok: false, error: 'Invalid entity_type or entity_id' };
  }
  await ensureLatestUpdatesMetaSchema(db);
  const pinnedVal = (is_pinned === true || is_pinned === 1 || is_pinned === '1') ? 1 : 0;
  const scopeVal = normalizeScope(scope);
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO cso_latest_updates_meta (entity_type, entity_id, is_pinned, scope, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id)
     DO UPDATE SET is_pinned = excluded.is_pinned, scope = excluded.scope, updated_at = excluded.updated_at`
  ).bind(cleanType, cleanId, pinnedVal, scopeVal, now).run();

  return { ok: true, entity_type: cleanType, entity_id: cleanId, is_pinned: Boolean(pinnedVal), scope: scopeVal, updated_at: now };
}

export async function unpublishLatestUpdateItem(db, entityType, entityId) {
  if (!db) return { ok: false, error: 'No database binding' };
  const t = String(entityType || '').trim().toLowerCase();
  const id = String(entityId || '').trim();
  if (!VALID_ENTITY_TYPES.has(t) || !id) return { ok: false, error: 'Invalid entity' };

  const now = new Date().toISOString();
  if (t === 'job') {
    await db.prepare(`UPDATE job_articles SET is_published = 0, updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'scheme') {
    await db.prepare(`UPDATE scheme_articles SET is_published = 0, updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'study') {
    await db.prepare(`UPDATE study_articles SET is_published = 0, updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'current_affairs') {
    await db.prepare(`UPDATE cso_current_affairs SET status = 'draft', updated_at = ? WHERE id = ?`).bind(now, id).run();
  } else if (t === 'career') {
    await db.prepare(`UPDATE careers_articles SET status = 'draft', updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'post') {
    await db.prepare(`UPDATE posts SET status = 'draft', updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'community') {
    await db.prepare(`UPDATE community_posts SET status = 'hidden', updated_at = ? WHERE id = ?`).bind(now, id).run();
  }

  try {
    await ensureLatestUpdatesMetaSchema(db);
    await db.prepare(`UPDATE cso_latest_updates_meta SET is_pinned = 0, updated_at = ? WHERE entity_type = ? AND entity_id = ?`).bind(now, t, id).run();
  } catch { /* optional */ }

  return { ok: true, entity_type: t, entity_id: id, unpublished: true };
}

async function loadMetaMap(db) {
  const map = new Map();
  try {
    await ensureLatestUpdatesMetaSchema(db);
    const { results } = await db.prepare(
      'SELECT entity_type, entity_id, is_pinned, scope, updated_at FROM cso_latest_updates_meta'
    ).all();
    for (const r of (results || [])) {
      map.set(`${String(r.entity_type)}:${String(r.entity_id)}`, {
        is_pinned: Number(r.is_pinned || 0) === 1,
        scope: r.scope ? normalizeScope(r.scope) : '',
        updated_at: String(r.updated_at || '')
      });
    }
  } catch { /* optional */ }
  return map;
}

export async function buildUnifiedLatestUpdates(db, { limit = 15 } = {}) {
  if (!db) return [];
  const safeLimit = Math.max(1, Math.min(30, Number(limit) || 15));
  const metaMap = await loadMetaMap(db);
  const rawItems = [];

  const getOverride = (type, id, slug) =>
    metaMap.get(`${type}:${id}`) || (slug ? metaMap.get(`${type}:${slug}`) : null) || null;

  await Promise.all([
    // 1. job_articles
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, slug, title_en, title_or, organisation_en, sector_badge, last_date,
                  location_district, total_vacancies, is_featured, published_at, updated_at
           FROM job_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY is_featured DESC, COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 10`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || r.slug || '').trim();
          const slug = String(r.slug || id).trim();
          if (!id) continue;
          const ov = getOverride('job', id, slug);
          const scope = (ov && ov.scope) || normalizeScope('', [r.location_district, r.sector_badge, r.organisation_en, r.title_en]);
          const isPinned = ov ? ov.is_pinned : Number(r.is_featured || 0) === 1;
          const url = `/jobs/${encodeURIComponent(slug)}`;
          const cta = resolveCta('JOB', url);
          const lastDt = r.last_date ? `Last Date: ${formatShortDate(r.last_date)}` : (Number(r.total_vacancies || 0) > 0 ? `${Number(r.total_vacancies).toLocaleString('en-IN')} Vacancies` : (r.location_district || scope));
          rawItems.push({
            id: `job:${id}`,
            entity_type: 'job',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'JOB',
            filter_tags: buildFilterTags('jobs', scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([r.organisation_en || r.sector_badge || 'Odisha Recruitment', lastDt]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 2. scheme_articles
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, slug, title_en, title_or, department_en, gov_badge, benefit_amount_summary,
                  last_date, is_ongoing, is_featured, published_at, updated_at
           FROM scheme_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY is_featured DESC, COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 8`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || r.slug || '').trim();
          const slug = String(r.slug || id).trim();
          if (!id) continue;
          const ov = getOverride('scheme', id, slug);
          const scope = (ov && ov.scope) || normalizeScope('', [r.gov_badge, r.department_en, r.title_en]);
          const isPinned = ov ? ov.is_pinned : Number(r.is_featured || 0) === 1;
          const url = `/schemes/${encodeURIComponent(slug)}`;
          const cta = resolveCta('SCHEME', url);
          const rightPart = r.last_date
            ? `Last Date: ${formatShortDate(r.last_date)}`
            : (Number(r.is_ongoing || 0) === 1 ? 'Ongoing Benefit' : (r.benefit_amount_summary || scope));
          rawItems.push({
            id: `scheme:${id}`,
            entity_type: 'scheme',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'SCHEME',
            filter_tags: buildFilterTags('schemes', scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([r.department_en || r.gov_badge || 'Govt. of Odisha', rightPart]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 3. cso_current_affairs
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, capsule_date, title_en, title_or, category, created_at, updated_at
           FROM cso_current_affairs
           WHERE status = 'published'
           ORDER BY capsule_date DESC, created_at DESC
           LIMIT 8`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || '').trim();
          if (!id) continue;
          const ov = getOverride('current_affairs', id, id);
          const scope = (ov && ov.scope) || normalizeScope('', [r.category, r.title_en]);
          const isPinned = ov ? ov.is_pinned : false;
          const url = `/current-affairs/${encodeURIComponent(id)}`;
          const cta = resolveCta('CURRENT AFFAIRS', url);
          rawItems.push({
            id: `current_affairs:${id}`,
            entity_type: 'current_affairs',
            entity_id: id,
            slug: id,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'CURRENT AFFAIRS',
            filter_tags: buildFilterTags('education', scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([formatShortDate(r.capsule_date || r.created_at), r.category || scope]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.created_at || r.capsule_date || '')
          });
        }
      } catch {}
    })(),

    // 4. study_articles
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, slug, title_en, title_or, exam_board_tag, pyq_year, resource_type_badge,
                  is_featured, published_at, updated_at
           FROM study_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY is_featured DESC, COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 8`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || r.slug || '').trim();
          const slug = String(r.slug || id).trim();
          if (!id) continue;
          const ov = getOverride('study', id, slug);
          const scope = (ov && ov.scope) || normalizeScope('', [r.exam_board_tag, r.title_en]);
          const isPinned = ov ? ov.is_pinned : Number(r.is_featured || 0) === 1;
          const url = `/study-library/?slug=${encodeURIComponent(slug)}`;
          const cta = resolveCta('STUDY', url);
          const rightPart = r.pyq_year ? `${r.resource_type_badge || 'Syllabus / PYQ'} (${r.pyq_year})` : (r.resource_type_badge || 'Study Guide');
          rawItems.push({
            id: `study:${id}`,
            entity_type: 'study',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'STUDY',
            filter_tags: buildFilterTags('education', scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([r.exam_board_tag || 'Study Library', rightPart]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 5. careers_articles
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, slug, title_en, title_or, eligibility_summary, salary_band, region_scope,
                  featured, published_at, updated_at
           FROM careers_articles
           WHERE status = 'published'
           ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC
           LIMIT 6`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || r.slug || '').trim();
          const slug = String(r.slug || id).trim();
          if (!id) continue;
          const ov = getOverride('career', id, slug);
          const scope = (ov && ov.scope) || normalizeScope(r.region_scope, [r.title_en]);
          const isPinned = ov ? ov.is_pinned : Number(r.featured || 0) === 1;
          const url = `/careers/${encodeURIComponent(slug)}`;
          const cta = resolveCta('CAREER', url);
          rawItems.push({
            id: `career:${id}`,
            entity_type: 'career',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'CAREER',
            filter_tags: buildFilterTags('education', scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([r.eligibility_summary || 'Career Roadmap', r.salary_band || scope]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 6. posts (legacy published jobs & current affairs)
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, type, slug, title, title_or, organisation, category, state, district_tag,
                  last_date, event_date, apply_url, source_url, published_at, updated_at
           FROM posts
           WHERE status = 'published' AND deleted_at IS NULL
           ORDER BY COALESCE(published_at, updated_at) DESC
           LIMIT 8`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || r.slug || '').trim();
          const slug = String(r.slug || id).trim();
          if (!id) continue;
          const ov = getOverride('post', id, slug);
          const isJob = String(r.type || '') === 'job';
          const badgeType = isJob ? 'JOB' : 'CURRENT AFFAIRS';
          const catTag = isJob ? 'jobs' : 'education';
          const scope = (ov && ov.scope) || normalizeScope(r.state, [r.district_tag, r.category, r.organisation, r.title]);
          const isPinned = ov ? ov.is_pinned : false;
          const extApply = safePublicUrl(r.source_url || r.apply_url);
          const url = isJob ? `/jobs/${encodeURIComponent(slug)}` : `/current-affairs/${encodeURIComponent(slug)}`;
          const cta = resolveCta(badgeType, url);
          const metaRight = isJob
            ? (r.last_date ? `Last Date: ${formatShortDate(r.last_date)}` : (r.district_tag || scope))
            : (r.event_date ? formatShortDate(r.event_date) : (r.category || scope));
          rawItems.push({
            id: `post:${id}`,
            entity_type: 'post',
            entity_id: id,
            slug,
            title_en: String(r.title || ''),
            title_or: String(r.title_or || ''),
            url: url || extApply,
            badge_type: badgeType,
            filter_tags: buildFilterTags(catTag, scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([r.organisation || r.category || (isJob ? 'Recruitment' : 'Current Affairs'), metaRight]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 7. community_posts (polls & civic updates)
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, title_en, title_or, post_type, is_pinned, created_at, updated_at
           FROM community_posts
           WHERE status = 'published'
           ORDER BY is_pinned DESC, updated_at DESC
           LIMIT 4`
        ).all();
        for (const r of (results || [])) {
          const id = String(r.id || '').trim();
          if (!id) continue;
          const ov = getOverride('community', id, id);
          const scope = (ov && ov.scope) || 'Odisha';
          const isPinned = ov ? ov.is_pinned : Number(r.is_pinned || 0) === 1;
          const isPoll = /poll/i.test(String(r.post_type || ''));
          const url = `/community/?post=${encodeURIComponent(id)}`;
          const cta = resolveCta('COMMUNITY', url, isPoll);
          rawItems.push({
            id: `community:${id}`,
            entity_type: 'community',
            entity_id: id,
            slug: id,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'COMMUNITY',
            filter_tags: buildFilterTags('', scope),
            scope,
            is_pinned: isPinned,
            meta_line: buildMetaLine([isPoll ? 'Community Poll' : 'Community Forum', formatShortDate(r.updated_at || r.created_at) || 'All Odisha']),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.created_at || '')
          });
        }
      } catch {}
    })()
  ]);

  // Deduplicate by normalized URL / slug so job_articles & posts don't double-show the same slug
  const deduped = [];
  const seenUrls = new Set();
  rawItems
    .filter((it) => it && it.title_en)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
    })
    .forEach((it) => {
      const k = String(it.url || it.id).toLowerCase();
      if (seenUrls.has(k)) return;
      seenUrls.add(k);
      deduped.push(it);
    });

  return deduped.slice(0, safeLimit);
}
