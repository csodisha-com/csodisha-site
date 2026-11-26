/**
 * Common Sense Odisha — Unified Live Scholarships & Financial Aid Hub API (v374)
 * Endpoint: GET /api/public/scholarships-hub
 *
 * Aggregates published scholarship & student financial aid entries from D1:
 *   1. `scheme_articles` (published, student/scholarship/stipend/education welfare)
 *   2. `informative_guides` (published & matched to scholarships / stipend / financial-aid / student-scheme)
 *   3. `posts` (published & tagged scholarship)
 * Merged with 8 verified flagship Odisha State (`scholarship.odisha.gov.in`) & Central (`scholarships.gov.in`) programs.
 */
import { json } from '../../_lib/http.js';
import { matchGuideToTopic } from '../../_lib/trending-topics.js';
import { computeDaysRemaining, getIstDateYmd, isVerifiedGovUrl, normalizeYmd } from './jobs-hub.js';

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

const DEFAULT_REQUIRED_DOCS = [
  'Aadhaar Card (Linked to Mobile)',
  'Caste / Residence Certificate',
  'Income Certificate (Tehsildar)',
  'Previous Exam Marksheet',
  'Bank Passbook (NPCI / DBT Seeded)'
];

export const FLAGSHIP_SCHOLARSHIPS = [
  {
    id: 'odisha-post-matric',
    title_en: 'Odisha Post-Matric Scholarship (SC / ST / OBC / SEBC / EBC)',
    title_or: 'ଓଡ଼ିଶା ପୋଷ୍ଟ-ମାଟ୍ରିକ୍ ବୃତ୍ତି (SC / ST / OBC / SEBC / EBC)',
    department_en: 'ST & SC Development Dept',
    department_or: 'ଅନୁସୂଚିତ ଜାତି ଓ ଜନଜାତି ଉନ୍ନୟନ ବିଭାଗ',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: '+2 / Higher Secondary, UG, PG & Technical',
    level_keys: ['plus-2', 'ug', 'pg', 'technical'],
    social_category: 'SC / ST / OBC / SEBC',
    category_keys: ['sc-st', 'obc-sebc'],
    income_ceiling: 'Up to ₹2.50 Lakh/year',
    amount_summary: 'Up to ₹10,000 – ₹40,000 / year + Hostel',
    last_date: '2026-12-08',
    required_docs: ['Aadhaar', 'Caste Certificate', 'Income Certificate', 'Previous Marksheet', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=Post-Matric',
    source_type: 'portal'
  },
  {
    id: 'odisha-pre-matric',
    title_en: 'Odisha Pre-Matric Scholarship (Class 9–10 SC / ST / OBC)',
    title_or: 'ଓଡ଼ିଶା ପ୍ରି-ମାଟ୍ରିକ୍ ବୃତ୍ତି (ନବମ–ଦଶମ ଶ୍ରେଣୀ)',
    department_en: 'ST & SC Development Dept',
    department_or: 'ଅନୁସୂଚିତ ଜାତି ଓ ଜନଜାତି ଉନ୍ନୟନ ବିଭାଗ',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: 'Class 9–10',
    level_keys: ['class-9-10'],
    social_category: 'SC / ST / OBC / SEBC',
    category_keys: ['sc-st', 'obc-sebc'],
    income_ceiling: 'Up to ₹2.50 Lakh/year',
    amount_summary: '₹3,500 – ₹7,000 / year (Day Scholar & Hosteller)',
    last_date: '2026-12-10',
    required_docs: ['Aadhaar', 'Caste Certificate', 'Income Certificate', 'School Bonafide', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=Pre-Matric',
    source_type: 'portal'
  },
  {
    id: 'odisha-e-medhabruti',
    title_en: 'e-Medhabruti Merit Scholarship (UG / PG / Technical & Professional)',
    title_or: 'ଇ-ମେଧାବୃତ୍ତି (UG / PG / ବୈଷୟିକ ଓ ବୃତ୍ତିଗତ ଶିକ୍ଷା)',
    department_en: 'Higher Education Dept',
    department_or: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ, ଓଡ଼ିଶା ସରକାର',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: 'Undergraduate (UG), Postgraduate (PG) & Technical',
    level_keys: ['ug', 'pg', 'technical'],
    social_category: 'All Categories (Merit 60%+)',
    category_keys: ['all', 'sc-st', 'obc-sebc', 'girls', 'minority'],
    income_ceiling: 'Merit-Based / Up to ₹6.00 Lakh/year',
    amount_summary: '₹5,000 (UG) • ₹10,000 (PG & Technical) / year',
    last_date: '2026-12-15',
    required_docs: ['Aadhaar', 'Residence Certificate', 'Income Certificate', 'Previous Marksheet (60%+)', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=Medhabruti',
    source_type: 'portal'
  },
  {
    id: 'gopabandhu-sikhya-sahayata',
    title_en: 'Gopabandhu Sikhya Sahayata Yojana (UG / PG Financial Aid)',
    title_or: 'ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା',
    department_en: 'Higher Education Dept',
    department_or: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ, ଓଡ଼ିଶା ସରକାର',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: 'Undergraduate (UG) & Postgraduate (PG)',
    level_keys: ['ug', 'pg'],
    social_category: 'All Categories (Vulnerable / Low Income)',
    category_keys: ['all', 'sc-st', 'obc-sebc', 'girls'],
    income_ceiling: 'Up to ₹2.50 Lakh/year',
    amount_summary: '₹20,000 / year Direct Benefit Transfer (DBT)',
    last_date: '2026-12-20',
    required_docs: ['Aadhaar', 'Income Certificate', 'College Admission Receipt', 'Previous Marksheet', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=Gopabandhu',
    source_type: 'portal'
  },
  {
    id: 'nirman-shramik-education',
    title_en: 'Nirman Shramik Kalyan Yojana (Education Assistance for Worker Wards)',
    title_or: 'ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ଯୋଜନା (ଶିକ୍ଷା ସହାୟତା)',
    department_en: 'Labour & ESI Dept',
    department_or: 'ଶ୍ରମ ଓ କର୍ମଚାରୀ ରାଜ୍ୟ ବୀମା ବିଭାଗ',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: 'Class 9–10, +2, UG, PG & Technical / Medical',
    level_keys: ['class-9-10', 'plus-2', 'ug', 'pg', 'technical'],
    social_category: 'Farmer / Construction Worker Family',
    category_keys: ['worker-farmer'],
    income_ceiling: 'Registered OB&OCWWB Construction Worker',
    amount_summary: '₹2,000 to ₹40,000 / year (B.Tech / Medical / Degree)',
    last_date: '2026-12-31',
    required_docs: ['Aadhaar', 'OB&OCWWB Worker Registration Card', 'Previous Marksheet', 'Institution Verification', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=Nirman+Shramik',
    source_type: 'portal'
  },
  {
    id: 'kalia-chhatra-brutti',
    title_en: 'KALIA Chhatra Brutti (Scholarship for Farmers’ Children)',
    title_or: 'କାଳିଆ ଛାତ୍ରବୃତ୍ତି (କୃଷକ ପରିବାରର ପିଲାଙ୍କ ପାଇଁ)',
    department_en: 'Agriculture Dept',
    department_or: 'କୃଷି ଓ କୃଷକ ସଶକ୍ତିକରଣ ବିଭାଗ',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: 'Technical / Diploma / ITI / Medical & Professional',
    level_keys: ['ug', 'technical'],
    social_category: 'Farmer / Construction Worker Family',
    category_keys: ['worker-farmer'],
    income_ceiling: 'Eligible KALIA / CM-KISAN Farmer Beneficiary',
    amount_summary: '100% Tuition Fee + Hostel & Mess Allowance',
    last_date: '2026-12-25',
    required_docs: ['Aadhaar', 'Parent KALIA / Ration Card', 'Admission Letter (Govt. Technical Inst.)', 'Previous Marksheet', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=KALIA',
    source_type: 'portal'
  },
  {
    id: 'sudakshya-girls-stipend',
    title_en: 'Sudakshya Technical Stipend for Girl Students (ITI / Polytechnic)',
    title_or: 'ସୁଦକ୍ଷା ବୈଷୟିକ ଛାତ୍ରବୃତ୍ତି (ଛାତ୍ରୀମାନଙ୍କ ପାଇଁ)',
    department_en: 'Skill Dev & Technical Education',
    department_or: 'ଦକ୍ଷତା ବିକାଶ ଓ ବୈଷୟିକ ଶିକ୍ଷା ବିଭାଗ',
    portal_domain: 'scholarship.odisha.gov.in',
    portal_source: 'odisha',
    is_verified_gov: true,
    study_level: 'Technical / Diploma / ITI / Medical',
    level_keys: ['technical'],
    social_category: 'Girl Students',
    category_keys: ['girls'],
    income_ceiling: 'All Girl Trainees in Govt. ITI / Diploma',
    amount_summary: '₹1,500/month Hostel + Exam & Book Grant',
    last_date: '2026-12-18',
    required_docs: ['Aadhaar', 'Residence Certificate', 'ITI / Polytechnic Enrollment ID', 'Previous Marksheet', 'Bank Passbook NPCI'],
    official_url: 'https://scholarship.odisha.gov.in/',
    guide_url: '/guides/?category=scholarships&q=Sudakshya',
    source_type: 'portal'
  },
  {
    id: 'nsp-central-sector-nmms',
    title_en: 'National Scholarship Portal (NSP) — Central Sector & NMMS Scholarship',
    title_or: 'ଜାତୀୟ ବୃତ୍ତି ପୋର୍ଟାଲ୍ (NSP) — କେନ୍ଦ୍ରୀୟ ଓ NMMS ବୃତ୍ତି',
    department_en: 'Ministry of Education (Govt. of India)',
    department_or: 'ଶିକ୍ଷା ମନ୍ତ୍ରଣାଳୟ (ଭାରତ ସରକାର)',
    portal_domain: 'scholarships.gov.in',
    portal_source: 'nsp',
    is_verified_gov: true,
    study_level: 'Class 9–10, +2, UG & PG',
    level_keys: ['class-9-10', 'plus-2', 'ug', 'pg'],
    social_category: 'All Categories / Minority / Merit',
    category_keys: ['all', 'minority', 'sc-st', 'obc-sebc', 'girls'],
    income_ceiling: 'Up to ₹4.50 Lakh/year (Central Sector) • ₹3.50 Lakh (NMMS)',
    amount_summary: '₹12,000 / year (NMMS & UG) • ₹20,000 / year (PG)',
    last_date: '2026-12-06',
    required_docs: ['Aadhaar / OTR ID', 'Income Certificate', 'Class 12 / NMMS Merit Certificate', 'Institution Bonafide', 'Bank Passbook NPCI'],
    official_url: 'https://scholarships.gov.in/',
    guide_url: '/guides/?category=scholarships&q=NSP',
    source_type: 'portal'
  }
];

function inferLevelKeys(blob) {
  const hay = String(blob || '').toLowerCase();
  const keys = [];
  if (/pre-?matric|class\s*9|class\s*10|9th|10th|nmms|school/.test(hay)) keys.push('class-9-10');
  if (/\+2|12th|higher secondary|intermediate|post-?matric/.test(hay)) keys.push('plus-2');
  if (/\bug\b|undergrad|degree|b\.?a\b|b\.?sc\b|medhabruti|gopabandhu|post-?matric/.test(hay)) keys.push('ug');
  if (/\bpg\b|postgrad|master|research|phd|net|jrf|medhabruti/.test(hay)) keys.push('pg');
  if (/technical|diploma|iti|polytechnic|b\.?tech|medical|mbbs|engineering|sudakshya|kalia/.test(hay)) keys.push('technical');
  return keys.length ? keys : ['ug', 'pg'];
}

function inferCategoryKeys(blob) {
  const hay = String(blob || '').toLowerCase();
  const keys = [];
  if (/\bsc\b|\bst\b|tribal|scheduled/.test(hay)) keys.push('sc-st');
  if (/\bobc\b|\bsebc\b|\bebc\b|backward/.test(hay)) keys.push('obc-sebc');
  if (/girl|women|female|sudakshya|mahila|subhadra/.test(hay)) keys.push('girls');
  if (/minority|muslim|christian|sikh|buddhist|jain/.test(hay)) keys.push('minority');
  if (/shramik|worker|labour|farmer|kalia|krushak/.test(hay)) keys.push('worker-farmer');
  return keys.length ? keys : ['all'];
}

function computeStatusLabel(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) return 'Open / Active';
  if (daysRemaining < 0) return 'Portal Renewal';
  if (daysRemaining <= 15) return 'Closing Soon';
  return 'Open / Active';
}

function isScholarshipItem(textBlob) {
  return /(scholarship|stipend|medhabruti|gopabandhu|post-?matric|pre-?matric|chhatra\s*brutti|brutti|sudakshya|financial\s*aid|nsp|nmms|shramik.*education|student.*aid|tuition)/i.test(String(textBlob || ''));
}

export async function buildScholarshipsHubPayload(db, { nowIso } = {}) {
  const istToday = getIstDateYmd(nowIso);

  const [schemeRows, guideRows, postRows] = db
    ? await Promise.all([
        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, department_en, department_or,
                  benefit_summary, income_limit, official_apply_url, official_website_url,
                  last_date, published_at, updated_at
           FROM scheme_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 80`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
                  published_at, updated_at
           FROM informative_guides
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 120`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title, title_or, summary, department, category, last_date,
                  official_url, published_at, updated_at
           FROM posts
           WHERE status = 'published' AND deleted_at IS NULL
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 80`
        ).all().then((r) => r.results || []).catch(() => [])
      ])
    : [[], [], []];

  const items = [];
  const seenTitles = new Set();

  // 1. D1 scheme_articles matched as scholarships/student financial aid
  for (const s of schemeRows) {
    const blob = `${s.title_en || ''} ${s.summary_en || ''} ${s.benefit_summary || ''} ${s.department_en || ''}`;
    if (!isScholarshipItem(blob)) continue;
    const normTitle = cleanText(s.title_en, 180).toLowerCase();
    if (seenTitles.has(normTitle)) continue;
    seenTitles.add(normTitle);

    const officialUrl = safeUrl(s.official_apply_url || s.official_website_url) || 'https://scholarship.odisha.gov.in/';
    const portalDomain = officialUrl.includes('scholarships.gov.in') ? 'scholarships.gov.in' : 'scholarship.odisha.gov.in';
    const lastDate = normalizeYmd(s.last_date);
    const daysRemaining = computeDaysRemaining(lastDate, nowIso);

    items.push({
      id: `scheme_${s.id || s.slug}`,
      title_en: cleanText(s.title_en, 220),
      title_or: cleanText(s.title_or, 220),
      department_en: cleanText(s.department_en, 100) || 'Govt. of Odisha',
      department_or: cleanText(s.department_or, 100) || 'ଓଡ଼ିଶା ସରକାର',
      portal_domain: portalDomain,
      portal_source: portalDomain === 'scholarships.gov.in' ? 'nsp' : 'odisha',
      is_verified_gov: isVerifiedGovUrl(officialUrl),
      study_level: 'UG / PG / Higher Education',
      level_keys: inferLevelKeys(blob),
      social_category: 'Eligible Odisha Students',
      category_keys: inferCategoryKeys(blob),
      income_ceiling: cleanText(s.income_limit, 90) || 'As per official portal norms',
      amount_summary: cleanText(s.benefit_summary || s.summary_en, 140) || 'Direct Benefit Transfer (DBT)',
      last_date: lastDate,
      days_remaining: daysRemaining,
      status_label: computeStatusLabel(daysRemaining),
      required_docs: DEFAULT_REQUIRED_DOCS,
      official_url: officialUrl,
      guide_url: s.slug ? `/schemes/?slug=${encodeURIComponent(s.slug)}` : '/schemes/',
      source_type: 'scheme'
    });
  }

  // 2. D1 informative_guides matched to scholarships / stipend / financial-aid / student-scheme
  for (const g of guideRows) {
    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''} ${g.category || ''}`;
    const isMatch =
      matchGuideToTopic(g, 'scholarships') ||
      /(scholarship|stipend|financial-aid|student-scheme)/i.test(`${g.category || ''} ${g.tags || ''}`);
    if (!isMatch) continue;
    const normTitle = cleanText(g.title_en, 180).toLowerCase();
    if (seenTitles.has(normTitle)) continue;
    seenTitles.add(normTitle);

    const isNsp = /\bnsp\b|national scholarship|central sector|nmms/i.test(blob);
    const portalDomain = isNsp ? 'scholarships.gov.in' : 'scholarship.odisha.gov.in';

    items.push({
      id: `guide_${g.id || g.slug}`,
      title_en: cleanText(g.title_en, 220),
      title_or: cleanText(g.title_or, 220),
      department_en: isNsp ? 'Ministry of Education (NSP)' : 'Odisha Scholarship Portal Guide',
      department_or: isNsp ? 'ଶିକ୍ଷା ମନ୍ତ୍ରଣାଳୟ (NSP)' : 'ଓଡ଼ିଶା ବୃତ୍ତି ପୋର୍ଟାଲ୍ ଗାଇଡ୍',
      portal_domain: portalDomain,
      portal_source: isNsp ? 'nsp' : 'odisha',
      is_verified_gov: true,
      study_level: 'Student Eligibility & Apply Guide',
      level_keys: inferLevelKeys(blob),
      social_category: 'All Eligible Categories',
      category_keys: inferCategoryKeys(blob),
      income_ceiling: 'Check guide eligibility matrix',
      amount_summary: cleanText(g.summary_en, 140) || 'Step-by-step DBT application guide',
      last_date: '',
      days_remaining: null,
      status_label: 'Open / Active',
      required_docs: DEFAULT_REQUIRED_DOCS,
      official_url: isNsp ? 'https://scholarships.gov.in/' : 'https://scholarship.odisha.gov.in/',
      guide_url: g.slug ? `/guides/${encodeURIComponent(g.slug)}` : '/guides/?category=scholarships',
      source_type: 'guide'
    });
  }

  // 3. D1 posts tagged scholarship
  for (const p of postRows) {
    const blob = `${p.title || ''} ${p.summary || ''} ${p.category || ''} ${p.department || ''}`;
    if (!isScholarshipItem(blob)) continue;
    const normTitle = cleanText(p.title, 180).toLowerCase();
    if (seenTitles.has(normTitle)) continue;
    seenTitles.add(normTitle);

    const officialUrl = safeUrl(p.official_url) || 'https://scholarship.odisha.gov.in/';
    const isNsp = officialUrl.includes('scholarships.gov.in') || /\bnsp\b/i.test(blob);
    const lastDate = normalizeYmd(p.last_date);
    const daysRemaining = computeDaysRemaining(lastDate, nowIso);

    items.push({
      id: `post_${p.id || p.slug}`,
      title_en: cleanText(p.title, 220),
      title_or: cleanText(p.title_or, 220),
      department_en: cleanText(p.department, 100) || 'Govt. of Odisha',
      department_or: 'ଓଡ଼ିଶା ସରକାର',
      portal_domain: isNsp ? 'scholarships.gov.in' : 'scholarship.odisha.gov.in',
      portal_source: isNsp ? 'nsp' : 'odisha',
      is_verified_gov: isVerifiedGovUrl(officialUrl),
      study_level: 'Higher Education / School',
      level_keys: inferLevelKeys(blob),
      social_category: 'Eligible Students',
      category_keys: inferCategoryKeys(blob),
      income_ceiling: 'As per scheme notification',
      amount_summary: cleanText(p.summary, 140) || 'Scholarship Financial Aid',
      last_date: lastDate,
      days_remaining: daysRemaining,
      status_label: computeStatusLabel(daysRemaining),
      required_docs: DEFAULT_REQUIRED_DOCS,
      official_url: officialUrl,
      guide_url: '/guides/?category=scholarships',
      source_type: 'scheme'
    });
  }

  // 4. Merge verified flagship Odisha & NSP scholarship programs
  for (const f of FLAGSHIP_SCHOLARSHIPS) {
    const normTitle = f.title_en.toLowerCase();
    if (seenTitles.has(normTitle)) continue;
    seenTitles.add(normTitle);
    const daysRemaining = computeDaysRemaining(f.last_date, nowIso);
    items.push({
      ...f,
      days_remaining: daysRemaining,
      status_label: computeStatusLabel(daysRemaining)
    });
  }

  // Sort closing soon first, then D1 guides/schemes, then flagship portals
  items.sort((a, b) => {
    const aUrg = a.days_remaining !== null && a.days_remaining >= 0 && a.days_remaining <= 15;
    const bUrg = b.days_remaining !== null && b.days_remaining >= 0 && b.days_remaining <= 15;
    if (aUrg !== bUrg) return aUrg ? -1 : 1;
    if (aUrg && bUrg) return (a.days_remaining ?? 999) - (b.days_remaining ?? 999);
    return 0;
  });

  const verifiedPortals = new Set(items.filter((x) => x.is_verified_gov).map((x) => x.portal_domain)).size || 2;
  const closingWithin15 = items.filter((x) => x.days_remaining !== null && x.days_remaining >= 0 && x.days_remaining <= 15).length;

  return {
    ok: true,
    version: 'v374',
    ist_date: istToday,
    generated_at: new Date().toISOString(),
    summary: {
      active_scholarships: items.length,
      verified_gov_portals: verifiedPortals,
      odisha_and_nsp_schemes: items.filter((x) => x.portal_source === 'odisha' || x.portal_source === 'nsp').length,
      closing_within_15_days: closingWithin15
    },
    items
  };
}

function filterScholarships(items, params) {
  const q = cleanText(params.get('q') || params.get('search'), 120).toLowerCase();
  const level = cleanText(params.get('level'), 40).toLowerCase();
  const cat = cleanText(params.get('category') || params.get('cat'), 40).toLowerCase();
  const portal = cleanText(params.get('portal'), 40).toLowerCase();

  return items.filter((it) => {
    if (q) {
      const hay = `${it.title_en} ${it.title_or} ${it.department_en} ${it.amount_summary} ${it.social_category} ${it.study_level} ${it.portal_domain}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (level && level !== 'all') {
      if (!Array.isArray(it.level_keys) || !it.level_keys.includes(level)) return false;
    }
    if (cat && cat !== 'all') {
      if (!Array.isArray(it.category_keys) || (!it.category_keys.includes(cat) && !it.category_keys.includes('all'))) return false;
    }
    if (portal && portal !== 'all') {
      if (it.portal_source !== portal) return false;
    }
    return true;
  });
}

export async function handlePublicScholarshipsHubApi(request, env) {
  const url = new URL(request.url);
  const payload = await buildScholarshipsHubPayload(env && env.DB);
  const filtered = filterScholarships(payload.items, url.searchParams);
  return json(
    {
      ...payload,
      filtered_count: filtered.length,
      items: filtered
    },
    200,
    {
      'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
      'X-CSO-Scholarships-Hub': 'v374'
    }
  );
}

export async function onRequestGet({ request, env }) {
  return handlePublicScholarshipsHubApi(request, env);
}
