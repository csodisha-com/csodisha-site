/**
 * Common Sense Odisha — Lightweight Cached Public Search Index Endpoint (v396)
 * Endpoint: GET /api/public/search-index
 * Backed by Cloudflare D1 (`job_articles` + `informative_guides`) + core operational hubs.
 * Lean payload (< 60 KB gzipped), edge-cached (max-age=300, s-maxage=900, swr=3600),
 * and immediately purged on every Admin Studio save.
 */

export const SITE_ORIGIN = 'https://csodisha.com';

export const CORE_SEARCH_HUBS = [
  {
    id: 'hub:jobs',
    url: '/jobs/',
    title_en: 'Live Jobs & Recruitment Command Center',
    title_or: 'ଲାଇଭ୍ ଚାକିରି ଓ ନିଯୁକ୍ତି ହବ୍',
    org: 'OPSC · OSSC · OSSSC · OAVS · Central',
    district: 'All 30 Odisha Districts',
    keywords: 'jobs recruitment vacancy notification opsc ossc osssc oavs police railway banking teaching walk-in'
  },
  {
    id: 'hub:exams',
    url: '/exams/',
    title_en: 'Exams & Prep Hub (Admit Cards, Schedules & Results)',
    title_or: 'ପରୀକ୍ଷା, ଆଡମିଟ୍ କାର୍ଡ ଓ ଫଳାଫଳ ହବ୍',
    org: 'BSE Odisha · CBSE · NTA · OPSC',
    district: 'All Odisha & National',
    keywords: 'exams admit card city slip result scorecard answer key ctet osstet otet ugc net oavs opsc ossc osssc'
  },
  {
    id: 'hub:scholarships',
    url: '/scholarships/',
    title_en: 'Odisha & National Scholarships Hub',
    title_or: 'ଓଡ଼ିଶା ଓ ଜାତୀୟ ବୃତ୍ତି ହବ୍',
    org: 'State Scholarship Portal · NSP',
    district: 'All 30 Odisha Districts',
    keywords: 'scholarship post matric pre matric gopabandhu medhabruti nsp stipend'
  },
  {
    id: 'hub:study-materials',
    url: '/study-materials/',
    title_en: 'Study Materials, Syllabus & PYQ Vault',
    title_or: 'ଅଧ୍ୟୟନ ସାମଗ୍ରୀ, ସିଲାବସ୍ ଓ PYQ ଭଲ୍ଟ',
    org: 'Common Sense Odisha',
    district: 'All Odisha',
    keywords: 'study materials notes syllabus pyq previous year question papers pdf'
  },
  {
    id: 'hub:career-paths',
    url: '/career-paths/',
    title_en: 'Career Paths & ORSP 7th Pay Explorer',
    title_or: 'କ୍ୟାରିଅର ମାର୍ଗ ଓ ORSP ବେତନ ଏକ୍ସପ୍ଲୋରର',
    org: 'Govt. of Odisha ORSP',
    district: 'All Odisha',
    keywords: 'career paths roadmap orsp 7th pay salary matrix oas oes ri peo'
  },
  {
    id: 'hub:careers',
    url: '/careers/',
    title_en: 'Odisha & National Career Roadmaps Explorer (18 Tracks)',
    title_or: 'ଓଡ଼ିଶା ଓ ଜାତୀୟ କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍ ଏକ୍ସପ୍ଲୋରର୍',
    org: 'OPSC · OSSC · OSSSC · PSU · Banking · Healthcare · Agriculture',
    district: 'All Odisha & National',
    keywords: 'careers roadmap oas cglre optcl gate sbi ibps rbi nabard oscb omhs nursing ayush aao vas ouat macp after 10th +2 graduate'
  },
  {
    id: 'hub:odisha-special',
    url: '/odisha-special/',
    title_en: 'Odisha Special & 30-District Atlas',
    title_or: 'ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ଓ ୩୦ ଜିଲ୍ଲା ଆଟଲାସ୍',
    org: 'Odisha GK & Districts',
    district: 'Angul Balangir Balasore Bargarh Bhadrak Boudh Cuttack Deogarh Dhenkanal Gajapati Ganjam Jagatsinghpur Jajpur Jharsuguda Kalahandi Kandhamal Kendrapara Kendujhar Khordha Koraput Malkangiri Mayurbhanj Nabarangpur Nayagarh Nuapada Puri Rayagada Sambalpur Subarnapur Sundargarh',
    keywords: 'odisha districts 30 districts kalahandi bhawanipatna cuttack khordha puri sambalpur ganjam odisha gk'
  },
  {
    id: 'hub:guides',
    url: '/guides/',
    title_en: 'Informative Guides & Exam Handbooks',
    title_or: 'ସୂଚନାମୂଳକ ମାର୍ଗଦର୍ଶିକା ଓ ପରୀକ୍ଷା ପୁସ୍ତିକା',
    org: 'Common Sense Odisha',
    district: 'All Odisha',
    keywords: 'guides handbook how-to exam strategy bulletin syllabus'
  },
  {
    id: 'hub:updates',
    url: '/updates/',
    title_en: 'All Odisha Updates & Chronological Newsroom',
    title_or: 'ସମସ୍ତ ଓଡ଼ିଶା ଅପଡେଟ୍ ଓ ନ୍ୟୁଜରୁମ୍',
    org: 'Common Sense Odisha',
    district: 'All Odisha & National',
    keywords: 'updates newsroom archive chronological rss json feed latest jobs exams results guides'
  },
  {
    id: 'hub:mock-tests',
    url: '/mock-tests/',
    title_en: 'Live CBT Mock Tests',
    title_or: 'ଲାଇଭ୍ CBT ମକ୍ ଟେଷ୍ଟ',
    org: 'Common Sense Odisha',
    district: 'Online',
    keywords: 'mock test cbt practice mcq quiz timed test'
  },
  {
    id: 'hub:current-affairs',
    url: '/current-affairs/',
    title_en: 'Daily Odisha & National Current Affairs',
    title_or: 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
    org: 'Common Sense Odisha',
    district: 'All Odisha',
    keywords: 'current affairs daily news capsule gk odisha'
  },
  {
    id: 'hub:schemes',
    url: '/schemes/',
    title_en: 'Odisha Government Welfare Schemes',
    title_or: 'ଓଡ଼ିଶା ସରକାରୀ କଲ୍ୟାଣ ଯୋଜନା',
    org: 'Govt. of Odisha · Central',
    district: 'All 30 Odisha Districts',
    keywords: 'schemes subhadra kalia bsky ration dbt welfare benefits'
  },
  {
    id: 'hub:tools',
    url: '/tools/',
    title_en: 'Candidate Calculators & Utility Tools',
    title_or: 'ପରୀକ୍ଷାର୍ଥୀ କାଲକୁଲେଟର ଓ ଟୁଲ୍ସ',
    org: 'Common Sense Odisha',
    district: 'Online',
    keywords: 'tools age calculator percentage orsp salary photo resizer'
  }
];

function cleanStr(raw, maxLen = 180) {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`~>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function classifyJobType(stageRaw) {
  const st = String(stageRaw || '').toLowerCase().trim();
  if (st === 'result') {
    return { type: 'result', label_en: 'Exam Result', label_or: 'ପରୀକ୍ଷା ଫଳାଫଳ' };
  }
  if (st === 'admit_card' || st === 'exam_date' || st === 'answer_key') {
    return { type: 'exam_update', label_en: 'Exam & Admit Card', label_or: 'ପରୀକ୍ଷା ଓ ଆଡମିଟ୍ କାର୍ଡ' };
  }
  if (st === 'current_affairs') {
    return { type: 'current_affairs', label_en: 'Current Affairs', label_or: 'ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ' };
  }
  return { type: 'job_alert', label_en: 'Job Alert', label_or: 'ଚାକିରି ବିଜ୍ଞପ୍ତି' };
}

export function buildSearchIndexRecords({ jobRows = [], guideRows = [] }) {
  const items = [];
  const seen = new Set();

  for (const r of (Array.isArray(jobRows) ? jobRows : [])) {
    if (!r || !r.slug) continue;
    if (r.is_published !== undefined && Number(r.is_published) !== 1) continue;
    const slug = String(r.slug).trim();
    const url = `/jobs/${encodeURIComponent(slug)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const cls = classifyJobType(r.lifecycle_stage);
    const deadlineIso = cleanStr(r.last_date || r.exam_date || '', 24);
    const kw = cleanStr([
      r.advt_number,
      r.sector_badge,
      r.organisation_en,
      r.organisation_or,
      r.location_district,
      r.qualification_level,
      r.qualification_summary,
      r.summary_en
    ].filter(Boolean).join(' '), 280);

    items.push({
      id: `job:${slug}`,
      type: cls.type,
      url,
      title_en: cleanStr(r.title_en, 180),
      title_or: cleanStr(r.title_or, 220),
      org: cleanStr(r.organisation_en || r.sector_badge || 'Odisha Govt', 100),
      district: cleanStr(r.location_district || 'All Odisha', 80),
      category_label_en: cls.label_en,
      category_label_or: cls.label_or,
      deadline_iso: deadlineIso,
      deadline_label: deadlineIso ? (cls.type === 'result' ? 'OMR / Window' : (cls.type === 'exam_update' ? 'Exam Date' : 'Last Date')) : '',
      keywords: kw,
      updated_at: String(r.updated_at || r.published_at || '')
    });
  }

  for (const g of (Array.isArray(guideRows) ? guideRows : [])) {
    if (!g || !g.slug) continue;
    if (g.status !== undefined && String(g.status).toLowerCase() !== 'published') continue;
    const slug = String(g.slug).trim();
    const url = `/guides/${encodeURIComponent(slug)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const isExam = Number(g.is_exam || 0) === 1;
    const kw = cleanStr([g.tags, g.category, g.scope, g.summary_en].filter(Boolean).join(' '), 260);
    items.push({
      id: `guide:${slug}`,
      type: 'guide',
      url,
      title_en: cleanStr(g.title_en, 180),
      title_or: cleanStr(g.title_or, 220),
      org: cleanStr(g.scope || 'Common Sense Odisha', 80),
      district: cleanStr(g.scope === 'National' ? 'All India' : 'All Odisha', 60),
      category_label_en: isExam ? 'Exam Guide' : 'Study Guide',
      category_label_or: isExam ? 'ପରୀକ୍ଷା ଗାଇଡ୍' : 'ମାର୍ଗଦର୍ଶିକା',
      deadline_iso: '',
      deadline_label: '',
      keywords: kw,
      updated_at: String(g.updated_at || g.created_at || '')
    });
  }

  for (const h of CORE_SEARCH_HUBS) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    items.push({
      id: h.id,
      type: 'hub',
      url: h.url,
      title_en: h.title_en,
      title_or: h.title_or,
      org: h.org,
      district: h.district,
      category_label_en: 'Portal Hub',
      category_label_or: 'ପୋର୍ଟାଲ୍ ହବ୍',
      deadline_iso: '',
      deadline_label: '',
      keywords: h.keywords,
      updated_at: ''
    });
  }

  return items;
}

export async function handlePublicSearchIndexApi(request, env) {
  let jobRows = [];
  let guideRows = [];

  if (env && env.DB) {
    const [jobsRes, guidesRes] = await Promise.all([
      env.DB.prepare(
        `SELECT slug, title_en, title_or, summary_en, organisation_en, organisation_or,
                advt_number, sector_badge, location_district, qualification_level,
                qualification_summary, last_date, exam_date, lifecycle_stage,
                is_published, published_at, updated_at
         FROM job_articles
         WHERE is_published = 1
         ORDER BY updated_at DESC
         LIMIT 250`
      ).all().catch(() => ({ results: [] })),
      env.DB.prepare(
        `SELECT slug, category, title_en, title_or, summary_en, tags, scope, is_exam, status, created_at, updated_at
         FROM informative_guides
         WHERE status = 'published'
         ORDER BY updated_at DESC
         LIMIT 250`
      ).all().catch(() => ({ results: [] }))
    ]);
    jobRows = (jobsRes && jobsRes.results) || [];
    guideRows = (guidesRes && guidesRes.results) || [];
  }

  const items = buildSearchIndexRecords({ jobRows, guideRows });
  const payload = {
    ok: true,
    version: 'v396',
    generated_at: new Date().toISOString(),
    total: items.length,
    items
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
