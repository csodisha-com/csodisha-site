/**
 * Common Sense Odisha — Public Homepage Live Feed API (v332)
 * GET /api/public/home-feed
 *
 * Returns a fast, edge-cached payload containing the latest published items across
 * ALL Admin Studio "+ Create New" content types so the public homepage stays live
 * the moment anything is published:
 *   - broadcast       (active Homepage Broadcast banner EN/OR + badge + CTA)
 *   - jobs            (latest 6 published Job Alerts)
 *   - current_affairs (latest 5 published Current Affairs Posts)
 *   - mock_tests      (latest 4 published CBT Mock Tests)
 *   - syllabus_pyq    (latest 6 published Syllabus / PYQ Resources)
 *   - careers         (latest 4 published Career Roadmaps)
 *   - schemes         (latest 4 published Government Schemes)
 */
import { json } from '../../_lib/http.js';
import { readBanner, readHomeSections, defaultHomeSections } from '../admin/_site.js';
import { ensureMockTestsV312Schema, formatMockTestRow } from '../admin/mock-tests.js';
import { buildUnifiedLatestUpdates } from '../../_lib/latest-updates.js';
import { buildTrendingTopicsFeed, DEFAULT_TRENDING_TOPICS } from '../../_lib/trending-topics.js';

export const HOME_FEED_CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=180';

function safeJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function slugifyId(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function safePublicUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//') && !s.includes('\\')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function mediaToUrl(keyOrUrl) {
  const s = String(keyOrUrl || '').trim();
  if (!s) return '';
  if (s.startsWith('/') || /^https?:\/\//i.test(s)) return safePublicUrl(s);
  return `/api/media/${encodeURIComponent(s)}`;
}

async function fetchBroadcast(env) {
  try {
    const b = await readBanner(env);
    if (!b || !b.active || !String(b.headline || '').trim()) {
      return { active: false };
    }
    const headline = String(b.headline || '');
    const updatedAt = b.updatedAt || null;
    return {
      id: String(updatedAt || headline),
      active: true,
      headline,
      headline_or: String(b.headline_or || ''),
      context: String(b.context || ''),
      context_or: String(b.context_or || ''),
      badge_label: String(b.badge_label || ''),
      severity: String(b.severity || 'info'),
      ctaText: String(b.ctaText || ''),
      ctaUrl: safePublicUrl(b.ctaUrl),
      updatedAt
    };
  } catch {
    return { active: false };
  }
}

async function fetchNavHeader(db) {
  try {
    const { results } = await db.prepare(
      `SELECT id, label_en, label_or, url, icon_key, badge_text_en, badge_text_or,
              open_new_tab, highlight_style, sort_order
       FROM nav_menu_items
       WHERE menu_location = 'header' AND status = 'published'
       ORDER BY sort_order ASC, updated_at DESC`
    ).all();
    return (results || [])
      .map((r) => {
        const url = safePublicUrl(r.url);
        if (!url) return null;
        return {
          id: String(r.id || ''),
          label_en: String(r.label_en || ''),
          label_or: String(r.label_or || ''),
          url,
          icon_key: String(r.icon_key || ''),
          badge_text_en: String(r.badge_text_en || ''),
          badge_text_or: String(r.badge_text_or || ''),
          open_new_tab: Number(r.open_new_tab || 0) === 1,
          highlight_style: String(r.highlight_style || 'default'),
          sort_order: Number(r.sort_order || 10)
        };
      })
      .filter((item) => item && item.label_en);
  } catch {
    return [];
  }
}

async function fetchLatestJobs(db) {
  const merged = [];
  const seenSlugs = new Set();

  try {
    const { results } = await db.prepare(
      `SELECT id, slug, title_en, title_or, last_date, total_vacancies,
              location_district, sector_badge, organisation_en, organisation_or,
              lifecycle_stage, qualification_summary, published_at, updated_at
       FROM job_articles
       WHERE is_published = 1
         AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC, updated_at DESC
       LIMIT 6`
    ).all();
    for (const r of (results || [])) {
      const slug = String(r.slug || r.id || '').trim();
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      merged.push({
        id: String(r.id || slug),
        slug,
        title_en: String(r.title_en || ''),
        title_or: String(r.title_or || ''),
        last_date: String(r.last_date || ''),
        vacancies: Number(r.total_vacancies || 0) || 0,
        district: String(r.location_district || 'All Odisha'),
        category: String(r.sector_badge || r.organisation_en || 'Odisha Govt'),
        organisation_en: String(r.organisation_en || ''),
        organisation_or: String(r.organisation_or || ''),
        lifecycle_stage: String(r.lifecycle_stage || 'notification'),
        qualification: String(r.qualification_summary || ''),
        href: `/jobs/${encodeURIComponent(slug)}`,
        sort_ts: String(r.published_at || r.updated_at || '')
      });
    }
  } catch { /* job_articles table may not exist in minimal unit-test DBs */ }

  if (merged.length < 6) {
    try {
      const { results } = await db.prepare(
        `SELECT id, slug, title, title_or, last_date, vacancies, district_tag, state, category, organisation, stage, qualification, published_at, updated_at
         FROM posts
         WHERE type = 'job' AND status = 'published' AND deleted_at IS NULL
         ORDER BY COALESCE(published_at, updated_at) DESC
         LIMIT 6`
      ).all();
      for (const r of (results || [])) {
        const slug = String(r.slug || r.id || '').trim();
        if (!slug || seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);
        merged.push({
          id: String(r.id || slug),
          slug,
          title_en: String(r.title || ''),
          title_or: String(r.title_or || ''),
          last_date: String(r.last_date || ''),
          vacancies: Number(r.vacancies || 0) || 0,
          district: String(r.district_tag || r.state || 'All Odisha'),
          category: String(r.category || r.organisation || 'Odisha Govt'),
          organisation_en: String(r.organisation || ''),
          organisation_or: '',
          lifecycle_stage: String(r.stage || 'notification'),
          qualification: String(r.qualification || ''),
          href: `/jobs/${encodeURIComponent(slug)}`,
          sort_ts: String(r.published_at || r.updated_at || '')
        });
      }
    } catch { /* legacy posts table optional */ }
  }

  return merged
    .sort((a, b) => String(b.sort_ts).localeCompare(String(a.sort_ts)))
    .slice(0, 6)
    .map(({ sort_ts, ...item }) => item);
}

async function fetchLatestCurrentAffairs(db) {
  const merged = [];
  const seenKeys = new Set();

  try {
    const { results } = await db.prepare(
      `SELECT id, capsule_date, title_en, title_or, highlights_en, highlights_or, quiz_json, category, created_at, updated_at
       FROM cso_current_affairs
       WHERE status = 'published'
       ORDER BY capsule_date DESC, created_at DESC
       LIMIT 5`
    ).all();
    for (const r of (results || [])) {
      const id = String(r.id || '').trim();
      const slug = id || slugifyId(r.title_en);
      if (!slug || seenKeys.has(slug)) continue;
      seenKeys.add(slug);
      const hiEn = safeJsonArray(r.highlights_en);
      const hiOr = safeJsonArray(r.highlights_or);
      const quiz = safeJsonArray(r.quiz_json);
      merged.push({
        id,
        slug,
        title_en: String(r.title_en || ''),
        title_or: String(r.title_or || ''),
        date: String(r.capsule_date || String(r.created_at || '').slice(0, 10)),
        category: String(r.category || 'Odisha'),
        summary_en: String(hiEn[0] || ''),
        summary_or: String(hiOr[0] || ''),
        highlights_count: hiEn.length,
        quiz_count: quiz.length,
        href: `/current-affairs/${encodeURIComponent(slug)}`,
        sort_ts: String(r.capsule_date || r.updated_at || r.created_at || '')
      });
    }
  } catch { /* cso_current_affairs optional */ }

  if (merged.length < 5) {
    try {
      const { results } = await db.prepare(
        `SELECT id, slug, title, title_or, event_date, category, summary, summary_or, published_at, updated_at
         FROM posts
         WHERE type = 'current_affair' AND status = 'published' AND deleted_at IS NULL
         ORDER BY COALESCE(event_date, substr(published_at, 1, 10)) DESC, published_at DESC
         LIMIT 5`
      ).all();
      for (const r of (results || [])) {
        const slug = String(r.slug || r.id || '').trim();
        if (!slug || seenKeys.has(slug)) continue;
        seenKeys.add(slug);
        merged.push({
          id: String(r.id || slug),
          slug,
          title_en: String(r.title || ''),
          title_or: String(r.title_or || ''),
          date: String(r.event_date || String(r.published_at || '').slice(0, 10)),
          category: String(r.category || 'Odisha'),
          summary_en: String(r.summary || ''),
          summary_or: String(r.summary_or || ''),
          highlights_count: 0,
          quiz_count: 0,
          href: `/current-affairs/${encodeURIComponent(slug)}`,
          sort_ts: String(r.event_date || r.published_at || r.updated_at || '')
        });
      }
    } catch { /* legacy posts table optional */ }
  }

  return merged
    .sort((a, b) => String(b.sort_ts).localeCompare(String(a.sort_ts)))
    .slice(0, 5)
    .map(({ sort_ts, ...item }) => item);
}

async function fetchLatestMockTests(db) {
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
       LIMIT 4`
    ).all();
    return (results || []).map((row) => {
      const m = formatMockTestRow(row);
      const slugOrId = String(m.slug || m.id || '');
      return {
        id: String(m.id || ''),
        slug: slugOrId,
        title_en: String(m.title_en || m.title || ''),
        title_or: String(m.title_or || ''),
        exam_category: String(m.exam_category || 'Odisha Exams'),
        duration_minutes: Number(m.duration_minutes || 60),
        question_count: Number(m.question_count || 0),
        negative_marking: Number(m.negative_mark || 0),
        href: slugOrId ? `/mock-tests/?test=${encodeURIComponent(slugOrId)}` : '/mock-tests/'
      };
    });
  } catch {
    return [];
  }
}

async function fetchLatestSyllabusPyq(db) {
  const merged = [];
  const seenKeys = new Set();

  try {
    const { results } = await db.prepare(
      `SELECT id, slug, title_en, title_or, summary_en, summary_or,
              exam_board_tag, pyq_year, resource_type_badge,
              notes_pdf_url, pyq_pdf_url, answer_key_pdf_url,
              published_at, updated_at
       FROM study_articles
       WHERE is_published = 1
         AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC, updated_at DESC
       LIMIT 6`
    ).all();
    for (const r of (results || [])) {
      const slug = String(r.slug || r.id || '').trim();
      if (!slug || seenKeys.has(slug)) continue;
      seenKeys.add(slug);
      const pdfUrl = safePublicUrl(r.pyq_pdf_url || r.notes_pdf_url || r.answer_key_pdf_url || '');
      merged.push({
        id: String(r.id || slug),
        slug,
        title_en: String(r.title_en || ''),
        title_or: String(r.title_or || ''),
        summary_en: String(r.summary_en || ''),
        summary_or: String(r.summary_or || ''),
        exam_tag: String(r.exam_board_tag || 'Odisha Exams'),
        year: String(r.pyq_year || ''),
        resource_type: String(r.resource_type_badge || 'Syllabus / PYQ'),
        pdf_url: pdfUrl,
        view_url: `/study-library/?slug=${encodeURIComponent(slug)}`,
        sort_ts: String(r.published_at || r.updated_at || '')
      });
    }
  } catch { /* study_articles optional */ }

  if (merged.length < 6) {
    try {
      const { results } = await db.prepare(
        `SELECT id, kind, title, title_or, exam, year, media_key, external_url, published_at, updated_at
         FROM resources
         WHERE deleted_at IS NULL AND status = 'published'
         ORDER BY COALESCE(published_at, updated_at) DESC, year DESC
         LIMIT 6`
      ).all();
      for (const r of (results || [])) {
        const key = String(r.id || slugifyId(r.title));
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);
        const pdfUrl = r.media_key ? mediaToUrl(r.media_key) : safePublicUrl(r.external_url);
        merged.push({
          id: String(r.id || key),
          slug: key,
          title_en: String(r.title || ''),
          title_or: String(r.title_or || ''),
          summary_en: '',
          summary_or: '',
          exam_tag: String(r.exam || 'Odisha Exams'),
          year: r.year ? String(r.year) : '',
          resource_type: String(r.kind || 'Syllabus / PYQ').toUpperCase(),
          pdf_url: pdfUrl,
          view_url: pdfUrl || '/study-library/',
          sort_ts: String(r.published_at || r.updated_at || '')
        });
      }
    } catch { /* legacy resources optional */ }
  }

  return merged
    .sort((a, b) => String(b.sort_ts).localeCompare(String(a.sort_ts)))
    .slice(0, 6)
    .map(({ sort_ts, ...item }) => item);
}

async function fetchLatestCareers(db) {
  try {
    const { results } = await db.prepare(
      `SELECT id, slug, title_en, title_or, summary_en, summary_or,
              eligibility_summary, salary_band, track_slug, career_stage, published_at, updated_at
       FROM careers_articles
       WHERE status = 'published'
       ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC
       LIMIT 4`
    ).all();
    return (results || []).map((r) => {
      const slug = String(r.slug || r.id || '').trim();
      return {
        id: String(r.id || slug),
        slug,
        title_en: String(r.title_en || ''),
        title_or: String(r.title_or || ''),
        summary_en: String(r.summary_en || ''),
        summary_or: String(r.summary_or || ''),
        eligibility: String(r.eligibility_summary || ''),
        pay_band: String(r.salary_band || ''),
        track_slug: String(r.track_slug || ''),
        career_stage: String(r.career_stage || ''),
        href: `/careers/${encodeURIComponent(slug)}`
      };
    });
  } catch {
    return [];
  }
}

async function fetchLatestSchemes(db) {
  const merged = [];
  const seenSlugs = new Set();

  try {
    const { results } = await db.prepare(
      `SELECT id, slug, title_en, title_or, summary_en, summary_or,
              benefit_amount_summary, department_en, department_or, gov_badge,
              last_date, is_ongoing, published_at, updated_at
       FROM scheme_articles
       WHERE is_published = 1
         AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
       ORDER BY is_featured DESC, COALESCE(NULLIF(published_at, ''), updated_at) DESC
       LIMIT 4`
    ).all();
    for (const r of (results || [])) {
      const slug = String(r.slug || r.id || '').trim();
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      merged.push({
        id: String(r.id || slug),
        slug,
        title_en: String(r.title_en || ''),
        title_or: String(r.title_or || ''),
        benefit_summary: String(r.benefit_amount_summary || r.summary_en || ''),
        summary_en: String(r.summary_en || ''),
        summary_or: String(r.summary_or || ''),
        department: String(r.department_en || r.gov_badge || 'Govt. of Odisha'),
        last_date: String(r.last_date || ''),
        is_ongoing: Number(r.is_ongoing || 0) === 1,
        href: `/schemes/${encodeURIComponent(slug)}`
      });
    }
  } catch { /* scheme_articles optional */ }

  return merged.slice(0, 4);
}

export async function buildPublicHomeFeed(env) {
  const db = env && env.DB;
  if (!db) {
    return {
      ok: true,
      version: 'v367',
      generated_at: new Date().toISOString(),
      broadcast: { active: false },
      nav_header: [],
      section_visibility: defaultHomeSections(),
      trending_topics: DEFAULT_TRENDING_TOPICS.map((t) => ({ ...t, item_count: 0 })),
      latest_updates: [],
      jobs: [],
      current_affairs: [],
      mock_tests: [],
      syllabus_pyq: [],
      careers: [],
      schemes: []
    };
  }

  const [broadcast, nav_header, homeSections, trending_topics, latest_updates, jobs, current_affairs, mock_tests, syllabus_pyq, careers, schemes] = await Promise.all([
    fetchBroadcast(env),
    fetchNavHeader(db),
    readHomeSections(env).catch(() => ({ sections: defaultHomeSections() })),
    buildTrendingTopicsFeed(env).catch(() => DEFAULT_TRENDING_TOPICS.map((t) => ({ ...t, item_count: 0 }))),
    buildUnifiedLatestUpdates(db, { limit: 18 }),
    fetchLatestJobs(db),
    fetchLatestCurrentAffairs(db),
    fetchLatestMockTests(db),
    fetchLatestSyllabusPyq(db),
    fetchLatestCareers(db),
    fetchLatestSchemes(db)
  ]);

  return {
    ok: true,
    version: 'v367',
    generated_at: new Date().toISOString(),
    broadcast,
    nav_header,
    section_visibility: (homeSections && homeSections.sections) || defaultHomeSections(),
    trending_topics,
    latest_updates,
    jobs,
    current_affairs,
    mock_tests,
    syllabus_pyq,
    careers,
    schemes
  };
}

export async function handlePublicHomeFeedApi(request, env, ctx = null) {
  const url = new URL(request.url);
  const bypass = url.searchParams.has('refresh') || url.searchParams.has('_cb');
  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  const cacheKey = new Request(new URL('/api/public/home-feed', url.origin).toString(), { method: 'GET' });

  if (cache && request.method === 'GET' && !bypass) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const payload = await buildPublicHomeFeed(env);
  const headers = {
    'Cache-Control': bypass ? 'no-store, max-age=0' : HOME_FEED_CACHE_CONTROL,
    'Vary': 'Accept-Encoding'
  };
  const res = json(payload, 200, headers);

  if (cache && request.method === 'GET' && !bypass) {
    const putP = cache.put(cacheKey, res.clone()).catch(() => {});
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(putP);
    else await putP;
  }
  return res;
}

export async function onRequestGet({ request, env, waitUntil }) {
  const ctx = typeof waitUntil === 'function' ? { waitUntil } : null;
  return handlePublicHomeFeedApi(request, env, ctx);
}
