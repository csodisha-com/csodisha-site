/**
 * Common Sense Odisha — Unified Live Jobs & Recruitment Hub API (v372)
 * Endpoint: GET /api/public/jobs-hub
 *
 * Aggregates all active/published recruitment items from D1:
 *   1. `job_articles` (published, non-future-scheduled)
 *   2. `posts` (`type = 'job'`, published, non-deleted)
 *   3. `informative_guides` (published & matched as recruitment / job-alert / admit-card / result)
 *
 * Normalized schema per item:
 *   id, title_en, title_or, summary_en, summary_or, organization, org_group,
 *   category, district, qualification, total_posts, last_date, days_remaining,
 *   is_closing_soon, official_url, is_verified_gov, detail_url, source_type, published_at
 */
import { json } from '../../_lib/http.js';
import { matchGuideToTopic } from '../../_lib/trending-topics.js';

export const ODISHA_30_DISTRICTS = [
  'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
  'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
  'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
  'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
  'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
];

const DISTRICT_LOOKUP = new Map(ODISHA_30_DISTRICTS.map((d) => [d.toLowerCase(), d]));
const DISTRICT_ALIASES = {
  khurda: 'Khordha',
  keonjhar: 'Kendujhar',
  bolangir: 'Balangir',
  baleswar: 'Balasore',
  baleshwar: 'Balasore',
  sonepur: 'Subarnapur',
  sundergarh: 'Sundargarh',
  nabrangpur: 'Nabarangpur',
  nowrangpur: 'Nabarangpur',
  bhubaneswar: 'Khordha',
  rourkela: 'Sundargarh',
  berhampur: 'Ganjam',
  brahmapur: 'Ganjam'
};

const RECRUITMENT_GUIDE_TAGS = ['recruitment', 'job-alert', 'job_alert', 'admit-card', 'admit_card', 'result', 'answer-key', 'vacancy', 'jobs'];

function cleanText(val, max = 260) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

export function isVerifiedGovUrl(raw) {
  const u = safeUrl(raw);
  if (!u || !/^https?:\/\//i.test(u)) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host.endsWith('.gov.in') || host.endsWith('.nic.in') || host === 'gov.in' || host === 'nic.in';
  } catch {
    return false;
  }
}

export function normalizeOrganization(rawOrg, textBlob = '') {
  const combined = `${rawOrg || ''} ${textBlob || ''}`.toLowerCase();
  if (/\bopsc\b|odisha public service commission/.test(combined)) return { organization: 'OPSC', org_group: 'opsc' };
  if (/\bosssc\b|sub-?ordinate staff selection/.test(combined)) return { organization: 'OSSSC', org_group: 'osssc' };
  if (/\bossc\b|odisha staff selection commission/.test(combined)) return { organization: 'OSSC', org_group: 'ossc' };
  if (/\boavs\b|odisha adarsha vidyalaya/.test(combined)) return { organization: 'OAVS', org_group: 'oavs' };
  if (/\bosrtc\b|state road transport/.test(combined)) return { organization: 'OSRTC', org_group: 'other' };
  if (/\bpolice\b|\boprb\b|constable|sub-?inspector|\bsi\b.*odisha/.test(combined)) return { organization: 'Odisha Police', org_group: 'police' };
  if (/\b(rrb|ibps|sbi|rbi|ssc\b|upsc|railways?|banking|central|isro|drdo|aiims|epfo|lic)\b/.test(combined)) {
    return { organization: 'Central / RRB / IBPS', org_group: 'central' };
  }
  const cleaned = cleanText(rawOrg, 60);
  if (cleaned) return { organization: cleaned, org_group: 'other' };
  return { organization: 'Govt. of Odisha', org_group: 'other' };
}

export function normalizeCategory(rawStage, textBlob = '', isGuide = false) {
  const stage = String(rawStage || '').trim().toLowerCase();
  const hay = `${stage} ${textBlob || ''}`.toLowerCase();
  if (stage === 'admit_card' || stage === 'admit-card' || /\badmit\s*card\b|\bhall\s*ticket\b/.test(hay)) return 'Admit Card';
  if (stage === 'answer_key' || stage === 'answer-key' || /\banswer\s*key\b/.test(hay)) return 'Answer Key';
  if (stage === 'result' || /\bresults?\b|\bmerit\s*list\b|\bcut-?off\b/.test(hay)) return 'Result';
  if (isGuide) {
    if (/\b(vacancy|vacancies|notification|recruitment|apply online|posts)\b/.test(hay)) return 'Latest Vacancy';
    return 'Strategy Guide';
  }
  return 'Latest Vacancy';
}

export function normalizeDistrict(rawDistrict, textBlob = '') {
  const raw = cleanText(rawDistrict, 80);
  if (raw) {
    const lower = raw.toLowerCase();
    if (DISTRICT_LOOKUP.has(lower)) return DISTRICT_LOOKUP.get(lower);
    if (DISTRICT_ALIASES[lower]) return DISTRICT_ALIASES[lower];
    for (const [k, canonical] of DISTRICT_LOOKUP.entries()) {
      if (lower.includes(k)) return canonical;
    }
    for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
      if (lower.includes(alias)) return canonical;
    }
  }
  const hay = String(textBlob || '').toLowerCase();
  if (hay) {
    for (const [k, canonical] of DISTRICT_LOOKUP.entries()) {
      if (new RegExp(`\\b${k}\\b`, 'i').test(hay)) return canonical;
    }
    for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(hay)) return canonical;
    }
  }
  return 'All Odisha';
}

export function normalizeQualification(rawQual, textBlob = '') {
  const hay = `${rawQual || ''} ${textBlob || ''}`.toLowerCase();
  if (/\bb\.?\s*ed\b|\bdiploma\b|\bctet\b|\botet\b|\bosstet\b|\biti\b|\bd\.?\s*el\.?\s*ed\b/.test(hay)) return 'B.Ed / Diploma';
  if (/\bpost[\s-]*grad|\bpg\b|\bm\.?a\.?\b|\bm\.?sc\.?\b|\bm\.?com\b|\bnet\b|\bphd\b|\bmaster/.test(hay)) return 'Post-Graduate';
  if (/\bgraduat|\bdegree\b|\bb\.?a\.?\b|\bb\.?sc\.?\b|\bb\.?tech\b|\bbachelor/.test(hay)) return 'Graduate';
  if (/\+2\b|\b12th\b|\bhsc\b|\bchse\b|\bintermediate\b|\bhigher secondary/.test(hay)) return '+2';
  if (/\b10th\b|\bmatric\b|\bsslc\b|\bhigh school/.test(hay)) return '10th';
  return 'Graduate';
}

/**
 * Compute IST (Asia/Kolkata, UTC+05:30) YYYY-MM-DD date string from a Date or ISO timestamp.
 */
export function getIstDateYmd(nowIso) {
  const baseMs = nowIso ? Date.parse(nowIso) : Date.now();
  const safeMs = Number.isFinite(baseMs) ? baseMs : Date.now();
  const istMs = safeMs + (5.5 * 60 * 60 * 1000);
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeYmd(rawDate) {
  const s = String(rawDate || '').trim();
  if (!s) return '';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return '';
}

export function computeDaysRemaining(lastDateRaw, nowIso) {
  const targetYmd = normalizeYmd(lastDateRaw);
  if (!targetYmd) return null;
  const todayYmd = getIstDateYmd(nowIso);
  const t0 = Date.UTC(Number(todayYmd.slice(0, 4)), Number(todayYmd.slice(5, 7)) - 1, Number(todayYmd.slice(8, 10)));
  const t1 = Date.UTC(Number(targetYmd.slice(0, 4)), Number(targetYmd.slice(5, 7)) - 1, Number(targetYmd.slice(8, 10)));
  return Math.round((t1 - t0) / 86400000);
}

function isRecruitmentGuide(g) {
  if (!g) return false;
  const cat = String(g.category || '').trim().toLowerCase();
  const tags = String(g.tags || '').toLowerCase();
  if (RECRUITMENT_GUIDE_TAGS.includes(cat)) return true;
  if (RECRUITMENT_GUIDE_TAGS.some((t) => tags.includes(t))) return true;
  return matchGuideToTopic(g, 'recruitment');
}

function extractPostsCount(rawNum, textBlob = '') {
  const n = Number(rawNum || 0);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const m = String(textBlob || '').match(/\b(\d{1,5})\s*(?:posts?|vacancies|seats|teachers?)\b/i);
  return m ? Number(m[1]) : 0;
}

export async function buildJobsHubPayload(db, { nowIso } = {}) {
  const istToday = getIstDateYmd(nowIso);
  const empty = {
    ok: true,
    version: 'v372',
    ist_date: istToday,
    generated_at: new Date().toISOString(),
    summary: {
      total_active: 0,
      closing_soon: 0,
      districts_covered: 30,
      verified_gov_count: 0,
      jobs_count: 0,
      guides_count: 0
    },
    districts: ODISHA_30_DISTRICTS,
    items: []
  };
  if (!db) return empty;

  const [jobArticles, legacyPosts, guides] = await Promise.all([
    db.prepare(
      `SELECT id, slug, title_en, title_or, summary_en, summary_or, organisation_en,
              total_vacancies, qualification_level, qualification_summary, location_district,
              last_date, official_apply_url, official_website_url, lifecycle_stage, published_at, updated_at
       FROM job_articles
       WHERE is_published = 1
         AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
       LIMIT 120`
    ).all().then((r) => r.results || []).catch(() => []),

    db.prepare(
      `SELECT id, slug, title, title_or, summary, department, category, district,
              qualification, vacancies, last_date, official_url, published_at, updated_at
       FROM posts
       WHERE type = 'job' AND status = 'published' AND deleted_at IS NULL
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
       LIMIT 80`
    ).all().then((r) => r.results || []).catch(() => []),

    db.prepare(
      `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
              is_exam, published_at, updated_at
       FROM informative_guides
       WHERE status = 'published'
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
       LIMIT 120`
    ).all().then((r) => r.results || []).catch(() => [])
  ]);

  const seenUrls = new Set();
  const items = [];

  for (const j of jobArticles) {
    const slug = cleanText(j.slug || j.id, 140);
    const detailUrl = slug ? `/jobs/?slug=${encodeURIComponent(slug)}` : '/jobs/';
    if (seenUrls.has(detailUrl)) continue;
    seenUrls.add(detailUrl);

    const blob = `${j.title_en || ''} ${j.summary_en || ''} ${j.organisation_en || ''}`;
    const orgInfo = normalizeOrganization(j.organisation_en, blob);
    const officialUrl = safeUrl(j.official_apply_url || j.official_website_url);
    const lastDate = normalizeYmd(j.last_date);
    const daysRemaining = computeDaysRemaining(lastDate, nowIso);
    const isClosingSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

    items.push({
      id: `job_${j.id || slug}`,
      title_en: cleanText(j.title_en, 220) || 'Odisha Govt Recruitment',
      title_or: cleanText(j.title_or, 220),
      summary_en: cleanText(j.summary_en, 240),
      summary_or: cleanText(j.summary_or, 240),
      organization: orgInfo.organization,
      org_group: orgInfo.org_group,
      category: normalizeCategory(j.lifecycle_stage, blob, false),
      district: normalizeDistrict(j.location_district, blob),
      qualification: normalizeQualification(j.qualification_level || j.qualification_summary, blob),
      total_posts: extractPostsCount(j.total_vacancies, blob),
      last_date: lastDate,
      days_remaining: daysRemaining,
      is_closing_soon: isClosingSoon,
      official_url: officialUrl,
      is_verified_gov: isVerifiedGovUrl(officialUrl),
      detail_url: detailUrl,
      source_type: 'job',
      published_at: cleanText(j.published_at || j.updated_at, 40)
    });
  }

  for (const p of legacyPosts) {
    const slug = cleanText(p.slug || p.id, 140);
    const detailUrl = slug ? `/jobs/?slug=${encodeURIComponent(slug)}` : '/jobs/';
    if (seenUrls.has(detailUrl)) continue;
    seenUrls.add(detailUrl);

    const blob = `${p.title || ''} ${p.summary || ''} ${p.department || ''} ${p.category || ''}`;
    const orgInfo = normalizeOrganization(p.department || p.category, blob);
    const officialUrl = safeUrl(p.official_url);
    const lastDate = normalizeYmd(p.last_date);
    const daysRemaining = computeDaysRemaining(lastDate, nowIso);
    const isClosingSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

    items.push({
      id: `post_${p.id || slug}`,
      title_en: cleanText(p.title, 220) || 'Recruitment Notice',
      title_or: cleanText(p.title_or, 220),
      summary_en: cleanText(p.summary, 240),
      summary_or: '',
      organization: orgInfo.organization,
      org_group: orgInfo.org_group,
      category: normalizeCategory(p.category, blob, false),
      district: normalizeDistrict(p.district, blob),
      qualification: normalizeQualification(p.qualification, blob),
      total_posts: extractPostsCount(p.vacancies, blob),
      last_date: lastDate,
      days_remaining: daysRemaining,
      is_closing_soon: isClosingSoon,
      official_url: officialUrl,
      is_verified_gov: isVerifiedGovUrl(officialUrl),
      detail_url: detailUrl,
      source_type: 'job',
      published_at: cleanText(p.published_at || p.updated_at, 40)
    });
  }

  for (const g of guides) {
    if (!isRecruitmentGuide(g)) continue;
    const slug = cleanText(g.slug || g.id, 140);
    const detailUrl = slug ? `/guides/${encodeURIComponent(slug)}` : '/guides/?category=recruitment';
    if (seenUrls.has(detailUrl)) continue;
    seenUrls.add(detailUrl);

    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''} ${g.category || ''}`;
    const orgInfo = normalizeOrganization('', blob);

    items.push({
      id: `guide_${g.id || slug}`,
      title_en: cleanText(g.title_en, 220) || 'Recruitment Guide',
      title_or: cleanText(g.title_or, 220),
      summary_en: cleanText(g.summary_en, 240),
      summary_or: cleanText(g.summary_or, 240),
      organization: orgInfo.organization,
      org_group: orgInfo.org_group,
      category: normalizeCategory(g.category, blob, true),
      district: normalizeDistrict('', blob),
      qualification: normalizeQualification('', blob),
      total_posts: extractPostsCount(0, blob),
      last_date: '',
      days_remaining: null,
      is_closing_soon: false,
      official_url: '',
      is_verified_gov: false,
      detail_url: detailUrl,
      source_type: 'guide',
      published_at: cleanText(g.published_at || g.updated_at, 40)
    });
  }

  // Sort: closing soon first (soonest deadline), then active jobs, then newest published
  items.sort((a, b) => {
    if (a.is_closing_soon !== b.is_closing_soon) return a.is_closing_soon ? -1 : 1;
    if (a.is_closing_soon && b.is_closing_soon) return (a.days_remaining ?? 999) - (b.days_remaining ?? 999);
    if (a.source_type !== b.source_type) return a.source_type === 'job' ? -1 : 1;
    return String(b.published_at || '').localeCompare(String(a.published_at || ''));
  });

  const jobsCount = items.filter((i) => i.source_type === 'job').length;
  const guidesCount = items.filter((i) => i.source_type === 'guide').length;
  const closingSoon = items.filter((i) => i.is_closing_soon).length;
  const verifiedGovCount = items.filter((i) => i.is_verified_gov).length;

  return {
    ok: true,
    version: 'v372',
    ist_date: istToday,
    generated_at: new Date().toISOString(),
    summary: {
      total_active: items.length,
      closing_soon: closingSoon,
      districts_covered: 30,
      verified_gov_count: verifiedGovCount,
      jobs_count: jobsCount,
      guides_count: guidesCount
    },
    districts: ODISHA_30_DISTRICTS,
    items
  };
}

function filterItemsByParams(items, params) {
  const q = cleanText(params.get('q') || params.get('search'), 120).toLowerCase();
  const org = cleanText(params.get('org') || params.get('organization'), 60).toLowerCase();
  const cat = cleanText(params.get('category') || params.get('type'), 60).toLowerCase();
  const district = cleanText(params.get('district'), 60).toLowerCase();
  const qual = cleanText(params.get('qualification') || params.get('qual'), 60).toLowerCase();

  return items.filter((it) => {
    if (q) {
      const hay = `${it.title_en} ${it.title_or} ${it.summary_en} ${it.organization} ${it.category} ${it.district} ${it.qualification}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (org && org !== 'all') {
      if (it.org_group !== org && it.organization.toLowerCase() !== org && !it.organization.toLowerCase().includes(org)) return false;
    }
    if (cat && cat !== 'all') {
      if (cat === 'guides' || cat === 'prep-guides' || cat === 'strategy guide') {
        if (it.source_type !== 'guide' && it.category !== 'Strategy Guide') return false;
      } else if (cat === 'vacancies' || cat === 'latest vacancy') {
        if (it.category !== 'Latest Vacancy') return false;
      } else if (cat === 'admit-cards' || cat === 'admit card') {
        if (it.category !== 'Admit Card') return false;
      } else if (cat === 'results' || cat === 'result') {
        if (it.category !== 'Result' && it.category !== 'Answer Key') return false;
      } else if (it.category.toLowerCase() !== cat) {
        return false;
      }
    }
    if (district && district !== 'all' && district !== 'all odisha') {
      if (it.district.toLowerCase() !== district && it.district !== 'All Odisha') return false;
    }
    if (qual && qual !== 'all') {
      const qVal = it.qualification.toLowerCase();
      if (qual === 'bed-pg' || qual === 'b.ed / pg') {
        if (!qVal.includes('b.ed') && !qVal.includes('post-grad') && !qVal.includes('diploma')) return false;
      } else if (!qVal.includes(qual)) {
        return false;
      }
    }
    return true;
  });
}

export async function handlePublicJobsHubApi(request, env) {
  const url = new URL(request.url);
  const payload = await buildJobsHubPayload(env && env.DB);
  const filtered = filterItemsByParams(payload.items, url.searchParams);
  return json(
    {
      ...payload,
      filtered_count: filtered.length,
      items: filtered
    },
    200,
    {
      'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
      'X-CSO-Jobs-Hub': 'v372'
    }
  );
}

export async function onRequestGet({ request, env }) {
  return handlePublicJobsHubApi(request, env);
}
