/**
 * Common Sense Odisha — Unified Latest Updates Engine (v338)
 *
 * Aggregates the latest published items across ALL Admin Studio content tables:
 *   - job_articles
 *   - mock_tests (CBT Mock Tests -> badge_type: "EXAM", "Start Test →")
 *   - scheme_articles
 *   - cso_current_affairs
 *   - study_articles
 *   - careers_articles
 *   - posts (legacy jobs / current_affairs)
 *   - community_posts (polls & civic threads)
 *
 * Persists explicit homepage pinning (`is_pinned`), geographic `scope` (`Odisha` | `National`),
 * and explicit `is_exam` override (`1` | `0` | NULL = auto) in `cso_latest_updates_meta`.
 */
import { ensureMockTestsV312Schema, formatMockTestRow } from '../api/admin/mock-tests.js';

const VALID_ENTITY_TYPES = new Set([
  'job',
  'mock_test',
  'scheme',
  'current_affairs',
  'study',
  'career',
  'guide',
  'post',
  'community'
]);

const DEFAULT_CTAS = {
  JOB: 'View Job →',
  EXAM: 'Start Test →',
  SCHEME: 'Check Scheme →',
  STUDY: 'Read Guide →',
  GUIDE: 'Read Guide →',
  'CURRENT AFFAIRS': 'Read Brief →',
  CAREER: 'View Roadmap →',
  COMMUNITY: 'Join Discussion →'
};

const EXAM_KEYWORD_RE = /\b(exam|exams|mock\s*test|cbt|syllabus|pyq|previous\s*year|admit\s*card|hall\s*ticket|answer\s*key|result|merit\s*list|cut[\s-]?off|prelims|mains|opsc|oas|ossc|osssc|osstet|otet|ctet|ugc\s*net|oavs|b\.?ed|ojee|neet|jee|upsc|ssc|rrb|ibps|cgl|chsl|peo|ri\/ari|amin|forest\s*guard|police\s*si)\b/i;

export function isExamRelated(hints = []) {
  const hay = hints.filter(Boolean).join(' ');
  return EXAM_KEYWORD_RE.test(hay);
}

let _luMetaChecked = false;
export async function ensureLatestUpdatesMetaSchema(db) {
  if (!db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS cso_latest_updates_meta (
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        scope TEXT NOT NULL DEFAULT 'Odisha',
        is_exam INTEGER,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (entity_type, entity_id)
      )`
    ).run();
    if (!_luMetaChecked) {
      _luMetaChecked = true;
      try {
        await db.prepare(`ALTER TABLE cso_latest_updates_meta ADD COLUMN is_exam INTEGER`).run();
      } catch { /* column already exists */ }
    }
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

function buildFilterTags(categoryTag, scope, isExam = false) {
  const tags = new Set(['all']);
  if (categoryTag) tags.add(categoryTag);
  if (isExam) tags.add('exams');
  tags.add(scope === 'National' ? 'national' : 'odisha');
  return Array.from(tags);
}

function resolveExamFlag(override, autoExam) {
  if (override && override.is_exam !== null && override.is_exam !== undefined) {
    return Number(override.is_exam) === 1;
  }
  return Boolean(autoExam);
}

function resolveCta(badgeType, url, { isPoll = false, entityType = '' } = {}) {
  const ext = isExternalHref(url);
  if (ext) return { cta_label: 'Official Source ↗', is_external: true };
  if (entityType === 'mock_test') return { cta_label: 'Start Test →', is_external: false };
  if (badgeType === 'EXAM' && entityType === 'job') return { cta_label: 'View Exam Update →', is_external: false };
  if (badgeType === 'EXAM' && entityType === 'study') return { cta_label: 'View Syllabus / PYQ →', is_external: false };
  if (badgeType === 'COMMUNITY' && isPoll) {
    return { cta_label: 'Join Poll →', is_external: false };
  }
  return { cta_label: DEFAULT_CTAS[badgeType] || 'View Details →', is_external: false };
}

export async function upsertLatestUpdateMeta(db, { entity_type, entity_id, is_pinned, scope, is_exam = undefined, category_tag = '' }) {
  if (!db) return { ok: false };
  const cleanType = String(entity_type || '').trim().toLowerCase();
  const cleanId = String(entity_id || '').trim();
  if (!VALID_ENTITY_TYPES.has(cleanType) || !cleanId) {
    return { ok: false, error: 'Invalid entity_type or entity_id' };
  }
  await ensureLatestUpdatesMetaSchema(db);
  const pinnedVal = (is_pinned === true || is_pinned === 1 || is_pinned === '1') ? 1 : 0;
  const scopeVal = normalizeScope(scope);
  let examVal = null;
  if (is_exam !== undefined && is_exam !== null && is_exam !== '') {
    examVal = (is_exam === true || is_exam === 1 || is_exam === '1') ? 1 : 0;
  } else if (String(category_tag || '').trim().toLowerCase() === 'exams') {
    examVal = 1;
  }
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO cso_latest_updates_meta (entity_type, entity_id, is_pinned, scope, is_exam, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id)
     DO UPDATE SET is_pinned = excluded.is_pinned,
                   scope = excluded.scope,
                   is_exam = COALESCE(excluded.is_exam, cso_latest_updates_meta.is_exam),
                   updated_at = excluded.updated_at`
  ).bind(cleanType, cleanId, pinnedVal, scopeVal, examVal, now).run();

  return {
    ok: true,
    entity_type: cleanType,
    entity_id: cleanId,
    is_pinned: Boolean(pinnedVal),
    scope: scopeVal,
    is_exam: examVal === null ? null : Boolean(examVal),
    updated_at: now
  };
}

export async function unpublishLatestUpdateItem(db, entityType, entityId) {
  if (!db) return { ok: false, error: 'No database binding' };
  const t = String(entityType || '').trim().toLowerCase();
  const id = String(entityId || '').trim();
  if (!VALID_ENTITY_TYPES.has(t) || !id) return { ok: false, error: 'Invalid entity' };

  const now = new Date().toISOString();
  if (t === 'job') {
    await db.prepare(`UPDATE job_articles SET is_published = 0, updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'mock_test') {
    await db.prepare(`UPDATE mock_tests SET status = 'draft', updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'scheme') {
    await db.prepare(`UPDATE scheme_articles SET is_published = 0, updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'study') {
    await db.prepare(`UPDATE study_articles SET is_published = 0, updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'current_affairs') {
    await db.prepare(`UPDATE cso_current_affairs SET status = 'draft', updated_at = ? WHERE id = ?`).bind(now, id).run();
  } else if (t === 'career') {
    await db.prepare(`UPDATE careers_articles SET status = 'draft', updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
  } else if (t === 'guide') {
    await db.prepare(`UPDATE informative_guides SET status = 'draft', updated_at = ? WHERE id = ? OR slug = ?`).bind(now, id, id).run();
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
      'SELECT entity_type, entity_id, is_pinned, scope, is_exam, updated_at FROM cso_latest_updates_meta'
    ).all();
    for (const r of (results || [])) {
      map.set(`${String(r.entity_type)}:${String(r.entity_id)}`, {
        is_pinned: Number(r.is_pinned || 0) === 1,
        scope: r.scope ? normalizeScope(r.scope) : '',
        is_exam: (r.is_exam === null || r.is_exam === undefined) ? null : Number(r.is_exam),
        updated_at: String(r.updated_at || '')
      });
    }
  } catch { /* optional */ }
  return map;
}

export async function buildUnifiedLatestUpdates(db, { limit = 18 } = {}) {
  if (!db) return [];
  const safeLimit = Math.max(1, Math.min(35, Number(limit) || 18));
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
                  location_district, total_vacancies, lifecycle_stage, is_featured, published_at, updated_at
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
          const stage = String(r.lifecycle_stage || '').toLowerCase();
          const isExamStage = /admit|answer|result|exam|hall|city/i.test(stage) || /admit\s*card|answer\s*key|exam\s*city|result/i.test(String(r.title_en || ''));
          const autoExam = isExamStage || isExamRelated([r.title_en, r.organisation_en, r.sector_badge, stage]);
          const isExam = resolveExamFlag(ov, autoExam);
          const badgeType = isExamStage ? 'EXAM' : 'JOB';
          const url = `/jobs/${encodeURIComponent(slug)}`;
          const cta = resolveCta(badgeType, url, { entityType: 'job' });
          const lastDt = r.last_date ? `Last Date: ${formatShortDate(r.last_date)}` : (Number(r.total_vacancies || 0) > 0 ? `${Number(r.total_vacancies).toLocaleString('en-IN')} Vacancies` : (r.location_district || scope));
          rawItems.push({
            id: `job:${id}`,
            entity_type: 'job',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: badgeType,
            filter_tags: buildFilterTags('jobs', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([r.organisation_en || r.sector_badge || 'Odisha Recruitment', lastDt]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 2. mock_tests (CBT Mock Tests -> always EXAM + Start Test →)
    (async () => {
      try {
        const schema = await ensureMockTestsV312Schema(db);
        const tDel = schema.hasLegacyTestDeleted ? 't.deleted_at IS NULL' : '1=1';
        const qDel = schema.hasLegacyQDeleted ? 'AND q.deleted_at IS NULL' : '';
        const { results } = await db.prepare(
          `SELECT t.*,
                  (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = t.id ${qDel}) AS question_count
           FROM mock_tests t
           WHERE ${tDel} AND t.status = 'published'
           ORDER BY t.updated_at DESC, t.id DESC
           LIMIT 6`
        ).all();
        for (const row of (results || [])) {
          const m = formatMockTestRow(row);
          const id = String(m.id || m.slug || '').trim();
          const slug = String(m.slug || id).trim();
          if (!id) continue;
          const ov = getOverride('mock_test', id, slug);
          const scope = (ov && ov.scope) || normalizeScope('', [m.exam_category, m.title_en]);
          const isPinned = ov ? ov.is_pinned : false;
          const isExam = resolveExamFlag(ov, true);
          const url = `/mock-tests/?test=${encodeURIComponent(slug)}`;
          const cta = resolveCta('EXAM', url, { entityType: 'mock_test' });
          const qCount = Number(m.question_count || 0);
          const dur = Number(m.duration_minutes || 60);
          const rightPart = qCount > 0 ? `${dur} min • ${qCount} Qs` : `${dur} min CBT`;
          rawItems.push({
            id: `mock_test:${id}`,
            entity_type: 'mock_test',
            entity_id: id,
            slug,
            title_en: String(m.title_en || m.title || ''),
            title_or: String(m.title_or || ''),
            url,
            badge_type: 'EXAM',
            filter_tags: buildFilterTags('education', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([m.exam_category || 'CBT Mock Test', rightPart]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(m.updated_at || m.published_at || '')
          });
        }
      } catch {}
    })(),

    // 3. scheme_articles
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
          const isExam = resolveExamFlag(ov, false);
          const url = `/schemes/${encodeURIComponent(slug)}`;
          const cta = resolveCta('SCHEME', url, { entityType: 'scheme' });
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
            filter_tags: buildFilterTags('schemes', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([r.department_en || r.gov_badge || 'Govt. of Odisha', rightPart]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 4. cso_current_affairs
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
          const autoExam = isExamRelated([r.category, r.title_en]);
          const isExam = resolveExamFlag(ov, autoExam);
          const url = `/current-affairs/${encodeURIComponent(id)}`;
          const cta = resolveCta('CURRENT AFFAIRS', url, { entityType: 'current_affairs' });
          rawItems.push({
            id: `current_affairs:${id}`,
            entity_type: 'current_affairs',
            entity_id: id,
            slug: id,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'CURRENT AFFAIRS',
            filter_tags: buildFilterTags('education', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([formatShortDate(r.capsule_date || r.created_at), r.category || scope]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.created_at || r.capsule_date || '')
          });
        }
      } catch {}
    })(),

    // 5. study_articles (Syllabus / PYQ / Study Guides -> auto exam-tagged)
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
          const autoExam = Boolean(r.exam_board_tag) || isExamRelated([r.resource_type_badge, r.title_en, r.exam_board_tag]);
          const isExam = resolveExamFlag(ov, autoExam);
          const isSyllabusPyq = /syllabus|pyq|answer\s*key/i.test(String(r.resource_type_badge || r.title_en || ''));
          const badgeType = isSyllabusPyq ? 'EXAM' : 'STUDY';
          const url = `/study-library/?slug=${encodeURIComponent(slug)}`;
          const cta = resolveCta(badgeType, url, { entityType: 'study' });
          const rightPart = r.pyq_year ? `${r.resource_type_badge || 'Syllabus / PYQ'} (${r.pyq_year})` : (r.resource_type_badge || 'Study Guide');
          rawItems.push({
            id: `study:${id}`,
            entity_type: 'study',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: badgeType,
            filter_tags: buildFilterTags('education', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([r.exam_board_tag || 'Study Library', rightPart]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 6. careers_articles
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, slug, title_en, title_or, eligibility_summary, salary_band, region_scope,
                  key_exams, featured, published_at, updated_at
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
          const autoExam = isExamRelated([r.key_exams, r.title_en]);
          const isExam = resolveExamFlag(ov, autoExam);
          const url = `/careers/${encodeURIComponent(slug)}`;
          const cta = resolveCta('CAREER', url, { entityType: 'career' });
          rawItems.push({
            id: `career:${id}`,
            entity_type: 'career',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'CAREER',
            filter_tags: buildFilterTags('education', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([r.eligibility_summary || 'Career Roadmap', r.salary_band || scope]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 7. posts (legacy published jobs & current affairs)
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
          const autoExam = isExamRelated([r.title, r.organisation, r.category]);
          const isExam = resolveExamFlag(ov, autoExam);
          const isExamNotice = /admit\s*card|answer\s*key|result|exam\s*city/i.test(String(r.title || ''));
          const badgeType = isExamNotice ? 'EXAM' : (isJob ? 'JOB' : 'CURRENT AFFAIRS');
          const catTag = isJob ? 'jobs' : 'education';
          const scope = (ov && ov.scope) || normalizeScope(r.state, [r.district_tag, r.category, r.organisation, r.title]);
          const isPinned = ov ? ov.is_pinned : false;
          const extApply = safePublicUrl(r.source_url || r.apply_url);
          const url = isJob ? `/jobs/${encodeURIComponent(slug)}` : `/current-affairs/${encodeURIComponent(slug)}`;
          const cta = resolveCta(badgeType, url, { entityType: isJob ? 'job' : 'post' });
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
            filter_tags: buildFilterTags(catTag, scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([r.organisation || r.category || (isJob ? 'Recruitment' : 'Current Affairs'), metaRight]),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.published_at || '')
          });
        }
      } catch {}
    })(),

    // 8. community_posts (polls & civic updates)
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
          const autoExam = isExamRelated([r.title_en]);
          const isExam = resolveExamFlag(ov, autoExam);
          const isPoll = /poll/i.test(String(r.post_type || ''));
          const url = `/community/?post=${encodeURIComponent(id)}`;
          const cta = resolveCta('COMMUNITY', url, { isPoll, entityType: 'community' });
          rawItems.push({
            id: `community:${id}`,
            entity_type: 'community',
            entity_id: id,
            slug: id,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'COMMUNITY',
            filter_tags: buildFilterTags('', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([isPoll ? 'Community Poll' : 'Community Forum', formatShortDate(r.updated_at || r.created_at) || 'All Odisha']),
            cta_label: cta.cta_label,
            is_external: cta.is_external,
            updated_at: String(r.updated_at || r.created_at || '')
          });
        }
      } catch {}
    })(),

    // 9. informative_guides (Informative Articles & Guides -> GUIDE + Read Guide →)
    (async () => {
      try {
        const { results } = await db.prepare(
          `SELECT id, slug, category, title_en, title_or, read_minutes, tags, scope, is_pinned, is_exam, created_at, updated_at
           FROM informative_guides
           WHERE status = 'published'
           ORDER BY is_pinned DESC, updated_at DESC
           LIMIT 8`
        ).all();
        const catLabels = {
          'how-to': 'How-To Guide',
          'exam-strategy': 'Exam Strategy',
          'citizen-scheme': 'Scheme Explainer',
          'odisha-gk': 'Odisha GK & Heritage'
        };
        for (const r of (results || [])) {
          const id = String(r.id || r.slug || '').trim();
          const slug = String(r.slug || id).trim();
          if (!id || !slug) continue;
          const ov = getOverride('guide', id, slug);
          const scope = (ov && ov.scope) || normalizeScope(r.scope, [r.title_en, r.tags]);
          const isPinned = ov ? ov.is_pinned : Number(r.is_pinned || 0) === 1;
          const autoExam = Number(r.is_exam || 0) === 1 || String(r.category || '') === 'exam-strategy' || isExamRelated([r.title_en, r.tags]);
          const isExam = resolveExamFlag(ov, autoExam);
          const url = `/guides/${encodeURIComponent(slug)}`;
          rawItems.push({
            id: `guide:${id}`,
            entity_type: 'guide',
            entity_id: id,
            slug,
            title_en: String(r.title_en || ''),
            title_or: String(r.title_or || ''),
            url,
            badge_type: 'GUIDE',
            filter_tags: buildFilterTags('education', scope, isExam),
            scope,
            is_pinned: isPinned,
            is_exam: isExam,
            meta_line: buildMetaLine([catLabels[r.category] || 'Informative Guide', `${Number(r.read_minutes) || 5} min read`]),
            cta_label: 'Read Guide →',
            is_external: false,
            updated_at: String(r.updated_at || r.created_at || '')
          });
        }
      } catch {}
    })()
  ]);

  // Deduplicate by normalized URL / slug
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
