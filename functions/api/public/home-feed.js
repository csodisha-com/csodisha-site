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
import { buildTrendingTopicsFeed, DEFAULT_TRENDING_TOPICS, matchGuideToTopic } from '../../_lib/trending-topics.js';
import { normalizeOrganization, getIstDateYmd } from './jobs-hub.js';
import { CORE_STUDY_PACKS } from './study-hub.js';
import { CORE_CAREER_ROADMAPS } from './careers-hub.js';
import { FLAGSHIP_SCHOLARSHIPS } from './scholarships-hub.js';

function formatIstShortDate(raw) {
  const s = String(raw || '').slice(0, 10);
  const p = s.split('-');
  if (p.length !== 3) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(p[2])} ${months[Number(p[1]) - 1] || p[1]}`;
}

function orgBadgeTone(orgGroup) {
  if (orgGroup === 'opsc' || orgGroup === 'oavs') return 'brand';
  if (orgGroup === 'ossc' || orgGroup === 'osssc') return 'info';
  if (orgGroup === 'central' || orgGroup === 'police') return 'warning';
  return 'brand';
}

function extractPostCount(rawNum, blob = '') {
  const n = Number(rawNum || 0);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const m = String(blob || '').match(/\b(\d{1,5})\s*(?:posts?|vacancies|seats|teachers?)\b/i);
  return m ? Number(m[1]) : 0;
}

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

async function fetchPublishedGuidesForFeed(db) {
  try {
    const { results } = await db.prepare(
      `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
              is_exam, published_at, updated_at
       FROM informative_guides
       WHERE status = 'published'
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
       LIMIT 60`
    ).all();
    return results || [];
  } catch {
    return [];
  }
}

async function fetchLatestJobs(db, publishedGuides = []) {
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
      const org = normalizeOrganization(r.organisation_en || r.sector_badge, r.title_en);
      const vacancies = extractPostCount(r.total_vacancies, r.title_en);
      const district = String(r.location_district || 'All Odisha');
      const lastDate = String(r.last_date || '');
      const metaEnParts = [];
      if (vacancies > 0) metaEnParts.push(`${vacancies.toLocaleString('en-IN')} Posts`);
      if (district) metaEnParts.push(district);
      if (lastDate) metaEnParts.push(`Last Date: ${formatIstShortDate(lastDate) || lastDate}`);
      const url = `/jobs/?slug=${encodeURIComponent(slug)}`;
      merged.push({
        id: String(r.id || slug),
        slug,
        title_en: String(r.title_en || ''),
        title_or: String(r.title_or || ''),
        last_date: lastDate,
        vacancies,
        district,
        category: String(r.sector_badge || r.organisation_en || org.organization),
        org_badge: org.organization,
        badge_tone: orgBadgeTone(org.org_group),
        meta_en: metaEnParts.join(' · ') || 'Active Notice',
        meta_or: vacancies > 0 ? `${vacancies.toLocaleString('en-IN')} ପଦବୀ · ${district}` : 'ସକ୍ରିୟ ବିଜ୍ଞପ୍ତି',
        action_label_en: 'Notice →',
        action_label_or: 'ବିଜ୍ଞପ୍ତି →',
        organisation_en: String(r.organisation_en || org.organization),
        organisation_or: String(r.organisation_or || ''),
        lifecycle_stage: String(r.lifecycle_stage || 'notification'),
        qualification: String(r.qualification_summary || ''),
        href: `/jobs/${encodeURIComponent(slug)}`,
        url,
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
        const org = normalizeOrganization(r.organisation || r.category, r.title);
        const vacancies = extractPostCount(r.vacancies, r.title);
        const district = String(r.district_tag || r.state || 'All Odisha');
        const url = `/jobs/?id=${encodeURIComponent(String(r.id || slug))}`;
        merged.push({
          id: String(r.id || slug),
          slug,
          title_en: String(r.title || ''),
          title_or: String(r.title_or || ''),
          last_date: String(r.last_date || ''),
          vacancies,
          district,
          category: String(r.category || r.organisation || org.organization),
          org_badge: org.organization,
          badge_tone: orgBadgeTone(org.org_group),
          meta_en: vacancies > 0 ? `${vacancies.toLocaleString('en-IN')} Posts · ${district}` : `${district} · Active Notice`,
          meta_or: vacancies > 0 ? `${vacancies.toLocaleString('en-IN')} ପଦବୀ · ${district}` : `${district} · ସକ୍ରିୟ ବିଜ୍ଞପ୍ତି`,
          action_label_en: 'Notice →',
          action_label_or: 'ବିଜ୍ଞପ୍ତି →',
          organisation_en: String(r.organisation || org.organization),
          organisation_or: '',
          lifecycle_stage: String(r.stage || 'notification'),
          qualification: String(r.qualification || ''),
          href: `/jobs/${encodeURIComponent(slug)}`,
          url,
          sort_ts: String(r.published_at || r.updated_at || '')
        });
      }
    } catch { /* legacy posts table optional */ }
  }

  // Merge published recruitment informative_guides (e.g., OAVS Recruitment 2026 notifications/guides)
  for (const g of (publishedGuides || [])) {
    if (merged.length >= 6) break;
    if (String(g.category || '').toLowerCase() === 'citizen-scheme') continue;
    if (!matchGuideToTopic(g, 'recruitment')) continue;
    const slug = String(g.slug || g.id || '').trim();
    if (!slug || seenSlugs.has(`guide_${slug}`)) continue;
    seenSlugs.add(`guide_${slug}`);
    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''}`;
    const org = normalizeOrganization('', blob);
    const vacancies = extractPostCount(0, blob);
    const guideUrl = `/guides/${encodeURIComponent(slug)}`;
    merged.push({
      id: `guide_${g.id || slug}`,
      slug,
      title_en: String(g.title_en || ''),
      title_or: String(g.title_or || ''),
      last_date: '',
      vacancies,
      district: 'All Odisha',
      category: org.organization,
      org_badge: org.organization,
      badge_tone: orgBadgeTone(org.org_group),
      meta_en: vacancies > 0 ? `${vacancies.toLocaleString('en-IN')} Posts · All Odisha` : 'Admit Card / Recruitment Guide',
      meta_or: vacancies > 0 ? `${vacancies.toLocaleString('en-IN')} ପଦବୀ · ସମଗ୍ର ଓଡ଼ିଶା` : 'ନିଯୁକ୍ତି ଓ ଆଡମିଟ୍ କାର୍ଡ ଗାଇଡ୍',
      action_label_en: 'Guide →',
      action_label_or: 'ଗାଇଡ୍ →',
      organisation_en: org.organization,
      organisation_or: '',
      lifecycle_stage: 'notification',
      qualification: '',
      href: guideUrl,
      url: guideUrl,
      is_guide: true,
      sort_ts: String(g.published_at || g.updated_at || '')
    });
  }

  const out = merged
    .sort((a, b) => {
      if (Boolean(a.is_guide) !== Boolean(b.is_guide)) return a.is_guide ? 1 : -1;
      return String(b.sort_ts).localeCompare(String(a.sort_ts));
    })
    .slice(0, 6)
    .map(({ sort_ts, is_guide, ...item }) => item);

  const hubPads = [
    { id: 'hub_opsc', slug: 'opsc', title_en: 'Odisha State Government & PSU Recruitments (OPSC / OSSC)', title_or: 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି (OPSC / OSSC)', category: 'OPSC / OSSC', org_badge: 'OPSC', badge_tone: 'brand', meta_en: 'All Odisha · Active Notices', meta_or: 'ସମଗ୍ର ଓଡ଼ିଶା · ସକ୍ରିୟ ବିଜ୍ଞପ୍ତି', action_label_en: 'Notice →', action_label_or: 'ବିଜ୍ଞପ୍ତି →', href: '/jobs/?org=opsc', url: '/jobs/?org=opsc', district: 'All Odisha', vacancies: 0, last_date: '' },
    { id: 'hub_osssc', slug: 'osssc', title_en: 'OSSSC District Vacancies, Admit Cards & Exam Schedules', title_or: 'OSSSC ଜିଲ୍ଲା ପଦବୀ ଓ ଆଡମିଟ୍ କାର୍ଡ', category: 'OSSSC', org_badge: 'OSSSC', badge_tone: 'info', meta_en: '30 Districts · Admit Cards', meta_or: '୩୦ ଜିଲ୍ଲା · ଆଡମିଟ୍ କାର୍ଡ', action_label_en: 'Notice →', action_label_or: 'ବିଜ୍ଞପ୍ତି →', href: '/jobs/?org=osssc', url: '/jobs/?org=osssc', district: '30 Districts', vacancies: 0, last_date: '' },
    { id: 'hub_central', slug: 'central', title_en: 'SSC, RRB, IBPS & Central Government Job Deadlines', title_or: 'SSC, RRB, IBPS ଓ କେନ୍ଦ୍ରୀୟ ଚାକିରି', category: 'Central', org_badge: 'Central', badge_tone: 'warning', meta_en: 'Closing Soon · Official Portals', meta_or: 'ଶୀଘ୍ର ଶେଷ · ଅଫିସିଆଲ୍ ପୋର୍ଟାଲ୍', action_label_en: 'Notice →', action_label_or: 'ବିଜ୍ଞପ୍ତି →', href: '/jobs/?org=central', url: '/jobs/?org=central', district: 'All India', vacancies: 0, last_date: '' }
  ];
  for (const pad of hubPads) {
    if (out.length >= 3) break;
    out.push(pad);
  }
  return out;
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

function enrichCurrentAffairsWithGuides(baseItems, publishedGuides = []) {
  const out = [...baseItems];
  const seen = new Set(out.map((x) => x.slug));
  const istShort = formatIstShortDate(getIstDateYmd());
  for (const g of (publishedGuides || [])) {
    if (out.length >= 4) break;
    if (!matchGuideToTopic(g, 'odisha-gk')) continue;
    const slug = String(g.slug || g.id || '').trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const dStr = String(g.published_at || g.updated_at || '').slice(0, 10) || getIstDateYmd();
    const url = `/guides/${encodeURIComponent(slug)}`;
    out.push({
      id: `guide_${g.id || slug}`,
      slug,
      title_en: String(g.title_en || ''),
      title_or: String(g.title_or || ''),
      date: dStr,
      ist_date_badge: formatIstShortDate(dStr) || istShort,
      category: 'Odisha Special',
      summary_en: String(g.summary_en || ''),
      summary_or: String(g.summary_or || ''),
      highlights_count: 0,
      quiz_count: 0,
      action_label_en: 'Brief →',
      action_label_or: 'ବ୍ରିଫ୍ →',
      href: url,
      url
    });
  }
  const pads = [
    { id: 'od_pad_1', slug: 'odisha-special', title_en: 'Odisha 30-District Atlas, GI Tags & Daily State GK Brief', title_or: 'ଓଡ଼ିଶା ୩୦ ଜିଲ୍ଲା ଆଟଲାସ୍, GI ଟ୍ୟାଗ୍ ଓ ସାଧାରଣ ଜ୍ଞାନ', date: getIstDateYmd(), ist_date_badge: istShort, category: 'Odisha Special', highlights_count: 0, quiz_count: 5, action_label_en: 'Brief →', action_label_or: 'ବ୍ରିଫ୍ →', href: '/odisha-special/', url: '/odisha-special/' }
  ];
  if (out.length < 3) {
    for (const p of pads) { if (out.length < 3) out.push(p); }
  }
  return out.slice(0, 5);
}

function enrichMocksForHome(baseMocks) {
  const out = baseMocks.map((m) => ({ ...m, url: m.href, action_label_en: 'Start', action_label_or: 'ଆରମ୍ଭ' }));
  const pads = [
    { id: 'eh_mock_oavs', slug: 'oavs-2026', title_en: 'OAVS 2026 & Teaching Aptitude Bilingual CBT Drill', title_or: 'OAVS ୨୦୨୬ CBT ଅଭ୍ୟାସ ଟେଷ୍ଟ', exam_category: 'OAVS', duration_minutes: 45, question_count: 50, negative_marking: 0.25, href: '/exams/', url: '/exams/', action_label_en: 'Start', action_label_or: 'ଆରମ୍ଭ' },
    { id: 'eh_mock_opsc', slug: 'opsc-oas', title_en: 'OPSC OAS & OSSC CGL Prelims Quick 5-MCQ Exam Drill', title_or: 'OPSC OAS ଓ OSSC CGL ପ୍ରିଲିମ୍ସ ଅଭ୍ୟାସ', exam_category: 'OPSC / OSSC', duration_minutes: 15, question_count: 5, negative_marking: 0, href: '/exams/#cso-eh-drill', url: '/exams/#cso-eh-drill', action_label_en: 'Start', action_label_or: 'ଆରମ୍ଭ' },
    { id: 'eh_mock_otet', slug: 'otet-osstet', title_en: 'OTET, OSSTET & UGC NET Paper-1 Practice Mock Series', title_or: 'OTET, OSSTET ଓ UGC NET ମକ୍ ସିରିଜ୍', exam_category: 'TET / NET', duration_minutes: 60, question_count: 50, negative_marking: 0, href: '/exams/', url: '/exams/', action_label_en: 'Start', action_label_or: 'ଆରମ୍ଭ' }
  ];
  for (const p of pads) {
    if (out.length >= 3) break;
    out.push(p);
  }
  return out.slice(0, 4);
}

function enrichStudyForHome(baseStudy, publishedGuides = []) {
  const out = baseStudy.map((s) => ({ ...s, url: s.pdf_url || s.view_url }));
  const seen = new Set(out.map((x) => x.slug));
  for (const g of (publishedGuides || [])) {
    if (out.length >= 4) break;
    if (!matchGuideToTopic(g, 'study-notes')) continue;
    const slug = String(g.slug || g.id || '').trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const url = `/guides/${encodeURIComponent(slug)}`;
    out.push({
      id: `guide_${g.id || slug}`,
      slug,
      title_en: String(g.title_en || ''),
      title_or: String(g.title_or || ''),
      exam_tag: 'Study Guide',
      year: '2026',
      resource_type: 'Notes',
      pdf_url: '',
      view_url: url,
      url
    });
  }
  for (const pack of CORE_STUDY_PACKS) {
    if (out.length >= 3) break;
    out.push({
      id: pack.id,
      slug: pack.id,
      title_en: pack.title_en,
      title_or: pack.title_or,
      exam_tag: pack.exam_tag,
      year: pack.year,
      resource_type: pack.file_format,
      pdf_url: pack.pdf_url,
      view_url: '/study-materials/',
      url: '/study-materials/'
    });
  }
  return out.slice(0, 6);
}

function enrichCareersForHome(baseCareers, publishedGuides = []) {
  const out = baseCareers.map((c) => ({ ...c, url: c.href, action_label_en: 'Roadmap →', action_label_or: 'ରୋଡମ୍ୟାପ୍ →' }));
  const seen = new Set(out.map((x) => x.slug));
  for (const g of (publishedGuides || [])) {
    if (out.length >= 4) break;
    if (!matchGuideToTopic(g, 'career')) continue;
    const slug = String(g.slug || g.id || '').trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const url = `/guides/${encodeURIComponent(slug)}`;
    out.push({
      id: `guide_${g.id || slug}`,
      slug,
      title_en: String(g.title_en || ''),
      title_or: String(g.title_or || ''),
      eligibility: 'Career Guide',
      pay_band: 'ORSP 7th Pay',
      career_stage: 'Roadmap',
      href: url,
      url,
      action_label_en: 'Roadmap →',
      action_label_or: 'ରୋଡମ୍ୟାପ୍ →'
    });
  }
  for (const rm of CORE_CAREER_ROADMAPS) {
    if (out.length >= 3) break;
    out.push({
      id: rm.id,
      slug: rm.id,
      title_en: rm.title_en,
      title_or: rm.title_or,
      eligibility: rm.min_qualification,
      pay_band: rm.pay_level,
      career_stage: rm.domain,
      href: '/career-paths/',
      url: '/career-paths/',
      action_label_en: 'Roadmap →',
      action_label_or: 'ରୋଡମ୍ୟାପ୍ →'
    });
  }
  return out.slice(0, 4);
}

function enrichSchemesForHome(baseSchemes, publishedGuides = []) {
  const out = baseSchemes.map((s) => ({ ...s, url: s.href, action_label_en: 'Scheme →', action_label_or: 'ଯୋଜନା →' }));
  const seen = new Set(out.map((x) => x.slug));
  for (const g of (publishedGuides || [])) {
    if (out.length >= 4) break;
    if (!matchGuideToTopic(g, 'scholarships')) continue;
    const slug = String(g.slug || g.id || '').trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const url = `/guides/${encodeURIComponent(slug)}`;
    out.push({
      id: `guide_${g.id || slug}`,
      slug,
      title_en: String(g.title_en || ''),
      title_or: String(g.title_or || ''),
      benefit_summary: String(g.summary_en || 'DBT Scholarship & Welfare Guide'),
      department: 'Odisha Scholarship Portal',
      last_date: '',
      is_ongoing: true,
      href: url,
      url,
      action_label_en: 'Scheme →',
      action_label_or: 'ଯୋଜନା →'
    });
  }
  for (const sc of FLAGSHIP_SCHOLARSHIPS) {
    if (out.length >= 3) break;
    out.push({
      id: sc.id,
      slug: sc.id,
      title_en: sc.title_en,
      title_or: sc.title_or,
      benefit_summary: sc.amount_summary,
      department: sc.department_en,
      last_date: sc.last_date,
      is_ongoing: false,
      href: '/scholarships/',
      url: '/scholarships/',
      action_label_en: 'Scheme →',
      action_label_or: 'ଯୋଜନା →'
    });
  }
  return out.slice(0, 4);
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

async function fetchPortalStats(db) {
  const stats = { districts: 30, guides: 0, mocks: 0 };
  const count = async (sql) => {
    try {
      const r = await db.prepare(sql).first();
      return Number((r && r.n) || 0);
    } catch (_) {
      return 0;
    }
  };
  const [g, m] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM informative_guides WHERE status = 'published'"),
    count('SELECT COUNT(*) AS n FROM mock_tests')
  ]);
  stats.guides = g;
  stats.mocks = m;
  return stats;
}

export async function buildPublicHomeFeed(env) {
  const db = env && env.DB;
  if (!db) {
    return {
      ok: true,
      version: 'v378',
      generated_at: new Date().toISOString(),
      broadcast: { active: false },
      nav_header: [],
      section_visibility: defaultHomeSections(),
      trending_topics: DEFAULT_TRENDING_TOPICS.map((t) => ({ ...t, item_count: 0 })),
      latest_updates: [],
      jobs: [],
      current_affairs: [],
      mock_tests: [],
      mocks: [],
      syllabus_pyq: [],
      study: [],
      careers: [],
      schemes: [],
      portal_stats: { districts: 30, guides: 0, mocks: 0 }
    };
  }

  const [portal_stats, publishedGuides] = await Promise.all([
    fetchPortalStats(db),
    fetchPublishedGuidesForFeed(db)
  ]);

  const [broadcast, nav_header, homeSections, trending_topics, latest_updates, jobs, rawCa, rawMocks, rawStudy, rawCareers, rawSchemes] = await Promise.all([
    fetchBroadcast(env),
    fetchNavHeader(db),
    readHomeSections(env).catch(() => ({ sections: defaultHomeSections() })),
    buildTrendingTopicsFeed(env).catch(() => DEFAULT_TRENDING_TOPICS.map((t) => ({ ...t, item_count: 0 }))),
    buildUnifiedLatestUpdates(db, { limit: 18 }),
    fetchLatestJobs(db, publishedGuides),
    fetchLatestCurrentAffairs(db),
    fetchLatestMockTests(db),
    fetchLatestSyllabusPyq(db),
    fetchLatestCareers(db),
    fetchLatestSchemes(db)
  ]);

  const current_affairs = enrichCurrentAffairsWithGuides(rawCa, publishedGuides);
  const mock_tests = enrichMocksForHome(rawMocks);
  const syllabus_pyq = enrichStudyForHome(rawStudy, publishedGuides);
  const careers = enrichCareersForHome(rawCareers, publishedGuides);
  const schemes = enrichSchemesForHome(rawSchemes, publishedGuides);

  return {
    ok: true,
    version: 'v378',
    generated_at: new Date().toISOString(),
    broadcast,
    nav_header,
    section_visibility: (homeSections && homeSections.sections) || defaultHomeSections(),
    trending_topics,
    latest_updates,
    jobs,
    current_affairs,
    mock_tests,
    mocks: mock_tests,
    syllabus_pyq,
    study: syllabus_pyq,
    careers,
    schemes,
    portal_stats
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
