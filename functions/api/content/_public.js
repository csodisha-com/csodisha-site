// Public read-only content API. Visibility is evaluated at query time so scheduled
// items go live automatically — no cron worker required.
import { json } from '../../_lib/http.js';
import { readBanner } from '../admin/_site.js';
import { renderMarkdown } from '../../_lib/markdown.js';
import { PUBLIC_VISIBLE_SQL, parsePaging, likeEscape } from '../../_lib/validate.js';

const CACHE = 'public, max-age=60, s-maxage=300';
const notFound = () => json({ error: 'Not found', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'public, max-age=30' });
const media = k => (k ? `/api/media/${k}` : null);

function postSummary(r) {
  return {
    id: r.id, slug: r.slug, title: r.title, title_or: r.title_or, summary: r.summary, summary_or: r.summary_or,
    category: r.category, tags: JSON.parse(r.tags || '[]'), cover_url: media(r.cover_media_key),
    published_at: r.published_at, event_date: r.event_date,
    ...(r.type === 'job' ? {
      organisation: r.organisation, vacancies: r.vacancies, qualification: r.qualification, last_date: r.last_date,
      apply_url: r.apply_url, notification_url: media(r.notification_media_key), state: r.state
    } : {})
  };
}

const LIST_COLS = `id, type, slug, title, title_or, summary, summary_or, category, tags, cover_media_key, published_at, event_date,
  organisation, vacancies, qualification, last_date, apply_url, notification_media_key, state`;

async function listPosts(env, request, type, orderBy) {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaging(url);
  const where = [`type = ?`, PUBLIC_VISIBLE_SQL]; const binds = [type];
  const cat = (url.searchParams.get('category') || '').slice(0, 60);
  if (cat) { where.push('category = ?'); binds.push(cat); }
  const state = (url.searchParams.get('state') || '').slice(0, 60);
  if (state && type === 'job') { where.push('state = ?'); binds.push(state); }
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (q) {
    where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR organisation LIKE ? ESCAPE '\\')`);
    const l = likeEscape(q); binds.push(l, l, l);
  }
  const w = where.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${w}`).bind(...binds).first()).n;
  const { results } = await env.DB.prepare(
    `SELECT ${LIST_COLS} FROM posts WHERE ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ items: results.map(postSummary), page, limit, total }, 200, { 'Cache-Control': CACHE });
}

async function postDetail(env, type, slug) {
  const r = await env.DB.prepare(`SELECT ${LIST_COLS}, body_md, body_md_or FROM posts WHERE type = ? AND slug = ? AND ${PUBLIC_VISIBLE_SQL}`)
    .bind(type, slug).first();
  if (!r) return notFound();
  return json({ ...postSummary(r), body_html: renderMarkdown(r.body_md), body_html_or: r.body_md_or ? renderMarkdown(r.body_md_or) : '' },
    200, { 'Cache-Control': CACHE });
}

const TEST_COLS = 'id, slug, title, title_or, target_exam, duration_minutes, total_marks, negative_marking, published_at';

export async function handleContent(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET, HEAD' });
  }
  if (!env.DB) return json({ error: 'Database unavailable', code: 'NO_DATABASE' }, 500);
  try {
    const url = new URL(request.url);
    const [resource, key] = url.pathname.replace(/^\/api\/content\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (resource === 'current-affairs') {
      return key ? await postDetail(env, 'current_affair', key)
        : await listPosts(env, request, 'current_affair', 'COALESCE(event_date, substr(published_at, 1, 10)) DESC, published_at DESC');
    }
    if (resource === 'jobs') {
      return key ? await postDetail(env, 'job', key)
        : await listPosts(env, request, 'job', "(last_date IS NULL OR last_date < date('now')) ASC, last_date ASC, published_at DESC");
    }
    if (resource === 'banner') {
      const b = await readBanner(env);
      const live = b.active && b.headline;
      return json(live ? { active: true, headline: b.headline, context: b.context, severity: b.severity, ctaText: b.ctaText, ctaUrl: b.ctaUrl, updatedAt: b.updatedAt } : { active: false },
        200, { 'Cache-Control': 'public, max-age=15, s-maxage=15' });
    }
    if (resource === 'resources') {
      const { page, limit, offset } = parsePaging(url);
      const where = ["deleted_at IS NULL AND status = 'published'"]; const binds = [];
      const kind = url.searchParams.get('kind');
      if (kind === 'syllabus' || kind === 'pyq') { where.push('kind = ?'); binds.push(kind); }
      const exam = (url.searchParams.get('exam') || '').slice(0, 100);
      if (exam) { where.push('exam = ?'); binds.push(exam); }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM resources WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT id, kind, title, exam, year, description, media_key, published_at FROM resources WHERE ${w} ORDER BY year DESC, published_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({ items: results.map(({ media_key, ...r }) => ({ ...r, file_url: media(media_key) })), page, limit, total }, 200, { 'Cache-Control': CACHE });
    }
    if (resource === 'mock-tests') {
      if (!key) {
        const { page, limit, offset } = parsePaging(url);
        const where = [PUBLIC_VISIBLE_SQL]; const binds = [];
        const exam = (url.searchParams.get('exam') || '').slice(0, 100);
        if (exam) { where.push('target_exam = ?'); binds.push(exam); }
        const w = where.join(' AND ');
        const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM mock_tests WHERE ${w}`).bind(...binds).first()).n;
        const { results } = await env.DB.prepare(
          `SELECT ${TEST_COLS}, (SELECT COUNT(*) FROM mock_questions q WHERE q.test_id = mock_tests.id AND q.deleted_at IS NULL) AS question_count
           FROM mock_tests WHERE ${w} ORDER BY published_at DESC LIMIT ? OFFSET ?`
        ).bind(...binds, limit, offset).all();
        return json({ items: results, page, limit, total }, 200, { 'Cache-Control': CACHE });
      }
      // Detail by slug or id. Answers/explanations are deliberately NOT exposed here;
      // the future test engine will grade server-side.
      const t = await env.DB.prepare(`SELECT ${TEST_COLS} FROM mock_tests WHERE (slug = ? OR id = ?) AND ${PUBLIC_VISIBLE_SQL}`).bind(key, key).first();
      if (!t) return notFound();
      const { results } = await env.DB.prepare(
        `SELECT id, position, section, question_en, question_or, option_a, option_b, option_c, option_d, image_media_key, marks
         FROM mock_questions WHERE test_id = ? AND deleted_at IS NULL ORDER BY position`
      ).bind(t.id).all();
      return json({ ...t, questions: results.map(({ image_media_key, ...q }) => ({ ...q, image_url: media(image_media_key) })) },
        200, { 'Cache-Control': CACHE });
    }
    return notFound();
  } catch (e) {
    console.error('content API error:', e);
    return json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
}
