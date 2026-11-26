/**
 * Common Sense Odisha — Unified Live Career Paths & ORSP 7th Pay Hub API (v376)
 * Endpoint: GET /api/public/careers-hub
 *
 * Aggregates published career guides & articles from D1:
 *   1. `careers_articles` (published)
 *   2. `informative_guides` (published & matched to career)
 *   3. `posts` (published & career-tagged)
 * Merged with 8 structured Odisha & Central career progression roadmaps.
 */
import { json } from '../../_lib/http.js';
import { matchGuideToTopic } from '../../_lib/trending-topics.js';

function cleanText(val, max = 260) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const CORE_CAREER_ROADMAPS = [
  {
    id: 'opsc-oas-civil',
    title_en: 'Odisha Civil Services (OPSC OAS / OPS / OFS)',
    title_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OPSC OAS / OPS / OFS)',
    domain: 'Civil & Admin',
    domain_key: 'civil',
    min_qualification: 'Graduate',
    qual_keys: ['graduate'],
    age_range: '21–38 Years (+5 yrs SC/ST/SEBC/Women)',
    pay_level: 'ORSP Level-12 · ₹56,100 Basic (+ DA/HRA)',
    selection_stages: ['Stage 1: Prelims (GS + CSAT)', 'Stage 2: Mains (9 Written Papers)', 'Stage 3: Personality Test (Interview)'],
    key_exams: ['OPSC OAS', 'OPSC OCS'],
    timeline_months: 12,
    guide_url: '/guides/?category=career&q=OPSC',
    jobs_url: '/jobs/?org=opsc',
    mocks_url: '/mock-tests/?exam=opsc',
    source_type: 'roadmap'
  },
  {
    id: 'odisha-teaching-oavs',
    title_en: 'Odisha Govt School & OAVS Teaching (PGT / TGT / PRT / B.Ed)',
    title_or: 'ଓଡ଼ିଶା ସରକାରୀ ବିଦ୍ୟାଳୟ ଓ OAVS ଶିକ୍ଷକତା (PGT / TGT / PRT)',
    domain: 'Teaching & Academia',
    domain_key: 'teaching',
    min_qualification: 'B.Ed / Professional',
    qual_keys: ['graduate', 'bed-prof', 'pg'],
    age_range: '21–38 Years (+5 yrs SC/ST/SEBC/Women)',
    pay_level: 'ORSP Level-9 to Level-11 · ₹35,400 – ₹47,600 Basic',
    selection_stages: ['Stage 1: OTET / OSSTET / B.Ed Qualification', 'Stage 2: OAVS / LTR CBT Exam', 'Stage 3: Interview & Document Verification'],
    key_exams: ['OAVS', 'OTET', 'OSSTET', 'Odisha LTR'],
    timeline_months: 8,
    guide_url: '/guides/?category=career&q=OAVS',
    jobs_url: '/jobs/?org=oavs',
    mocks_url: '/mock-tests/?exam=oavs',
    source_type: 'roadmap'
  },
  {
    id: 'ossc-cgl-group-b',
    title_en: 'OSSC Combined Graduate Level (CGL) & Group-B Officers',
    title_or: 'OSSC କମ୍ବାଇଣ୍ଡ୍ ଗ୍ରାଜୁଏଟ୍ ଲେଭଲ୍ (CGL) ଓ ଗ୍ରୁପ୍-ବି ଅଧିକାରୀ',
    domain: 'Civil & Admin',
    domain_key: 'civil',
    min_qualification: 'Graduate',
    qual_keys: ['graduate'],
    age_range: '21–38 Years (+5 yrs SEBC/SC/ST/Women)',
    pay_level: 'ORSP Level-9 / Level-10 · ₹35,400 – ₹44,900 Basic',
    selection_stages: ['Stage 1: OMR/CBT Prelims (150 Marks)', 'Stage 2: Written Mains Exam', 'Stage 3: Computer Skill Test & Verification'],
    key_exams: ['OSSC CGL', 'OSSC CHSL', 'OSSC Welfare Extension'],
    timeline_months: 9,
    guide_url: '/guides/?category=career&q=OSSC',
    jobs_url: '/jobs/?org=ossc',
    mocks_url: '/mock-tests/?exam=ossc',
    source_type: 'roadmap'
  },
  {
    id: 'osssc-district-cadre',
    title_en: 'OSSSC District Cadre (RI, ARI, Amin, PEO, Livestock Inspector)',
    title_or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର (RI, ARI, ଅମିନ୍, PEO, ପଶୁଧନ ନିରୀକ୍ଷକ)',
    domain: 'District & Clerical',
    domain_key: 'district',
    min_qualification: '+2 / Inter',
    qual_keys: ['plus-2', 'graduate'],
    age_range: '20–38 Years (+5 yrs SC/ST/SEBC/Women)',
    pay_level: 'ORSP Level-4 to Level-7 · ₹19,900 – ₹25,500 Basic',
    selection_stages: ['Stage 1: CBT Prelims (100 Marks)', 'Stage 2: CBT Mains (180 Marks)', 'Stage 3: Practical Computer Skill Test'],
    key_exams: ['OSSSC RI/ARI/Amin', 'OSSSC PEO', 'OSSSC Forest Guard'],
    timeline_months: 7,
    guide_url: '/guides/?category=career&q=OSSSC',
    jobs_url: '/jobs/?org=osssc',
    mocks_url: '/mock-tests/?exam=osssc',
    source_type: 'roadmap'
  },
  {
    id: 'odisha-police-uniformed',
    title_en: 'Odisha Police & Uniformed Services (SI, Constable, Fireman, Forest Guard)',
    title_or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ଓ ୟୁନିଫର୍ମ ସେବା (SI, କନଷ୍ଟେବଳ, ଅଗ୍ନିଶମ, ଫରେଷ୍ଟ ଗାର୍ଡ)',
    domain: 'Police & Defence',
    domain_key: 'police',
    min_qualification: '10th Pass',
    qual_keys: ['10th', 'plus-2', 'graduate'],
    age_range: '18–25 / 21–28 Years (+5 yrs SC/ST/SEBC/Women)',
    pay_level: 'ORSP Level-5 to Level-9 · ₹21,700 – ₹35,400 Basic',
    selection_stages: ['Stage 1: Written CBT Examination', 'Stage 2: Physical Measurement & Efficiency (PST/PET)', 'Stage 3: Medical & Character Verification'],
    key_exams: ['Odisha Police SI', 'OPRB Constable', 'Odisha Fireman'],
    timeline_months: 6,
    guide_url: '/guides/?category=career&q=Police',
    jobs_url: '/jobs/?org=police',
    mocks_url: '/mock-tests/?exam=police',
    source_type: 'roadmap'
  },
  {
    id: 'higher-ed-assistant-prof',
    title_en: 'Higher Education & Assistant Professor (UGC NET / OPSC / SSB Odisha)',
    title_or: 'ଉଚ୍ଚଶିକ୍ଷା ଓ ସହକାରୀ ପ୍ରଫେସର (UGC NET / OPSC / SSB ଓଡ଼ିଶା)',
    domain: 'Teaching & Academia',
    domain_key: 'teaching',
    min_qualification: 'Post-Graduate',
    qual_keys: ['pg'],
    age_range: '21–42 Years (Odisha SSB / OPSC norms)',
    pay_level: 'Academic Level-10 · ₹57,700 Basic (+ UGC Allowances)',
    selection_stages: ['Stage 1: Master’s Degree (55%) + UGC NET / PhD', 'Stage 2: SSB Written / OPSC Shortlisting', 'Stage 3: Academic Viva-Voce & Demo Lecture'],
    key_exams: ['UGC NET / JRF', 'SSB Odisha Lecturer', 'OPSC Asst. Prof'],
    timeline_months: 12,
    guide_url: '/guides/?category=career&q=UGC+NET',
    jobs_url: '/jobs/?q=Assistant+Professor',
    mocks_url: '/mock-tests/?exam=ugc-net',
    source_type: 'roadmap'
  },
  {
    id: 'healthcare-nursing-cadre',
    title_en: 'Healthcare, Nursing & Paramedical Cadre (OSSSC Nursing Officer / Pharmacist)',
    title_or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା, ନର୍ସିଂ ଓ ପାରାମେଡିକାଲ୍ କ୍ୟାଡର (OSSSC ନର୍ସିଂ ଅଫିସର / ଫାର୍ମାସିଷ୍ଟ)',
    domain: 'Healthcare',
    domain_key: 'healthcare',
    min_qualification: 'B.Ed / Professional',
    qual_keys: ['plus-2', 'bed-prof'],
    age_range: '21–38 Years (+5 yrs SC/ST/SEBC/Women)',
    pay_level: 'ORSP Level-7 / Level-8 · ₹25,500 – ₹29,200 Basic',
    selection_stages: ['Stage 1: GNM / B.Sc Nursing / D.Pharm + ONMRC Reg.', 'Stage 2: OSSSC Written CBT (100 Marks)', 'Stage 3: Document & Council Registration Check'],
    key_exams: ['OSSSC Nursing Officer', 'OSSSC Pharmacist', 'MPHW'],
    timeline_months: 6,
    guide_url: '/guides/?category=career&q=Nursing',
    jobs_url: '/jobs/?q=Nursing',
    mocks_url: '/mock-tests/?exam=osssc',
    source_type: 'roadmap'
  },
  {
    id: 'banking-psu-skill-enterprise',
    title_en: 'Banking, PSU, Railway & Skill-to-Enterprise Pathways (IBPS / RRB / OSOU / OSDA)',
    title_or: 'ବ୍ୟାଙ୍କିଙ୍ଗ୍, PSU, ରେଳବାଇ ଓ ଦକ୍ଷତା-ଉଦ୍ୟୋଗ ମାର୍ଗ (IBPS / RRB / OSDA)',
    domain: 'Banking & PSU',
    domain_key: 'banking',
    min_qualification: '10th Pass',
    qual_keys: ['10th', 'plus-2', 'graduate'],
    age_range: '18–30 / 20–30 Years (+ Central & State Relaxations)',
    pay_level: 'Central 7th CPC Level-2 to Level-7 · ₹19,900 – ₹48,480 Basic',
    selection_stages: ['Stage 1: Prelims CBT / OSDA Skill Certification', 'Stage 2: Mains CBT / Trade Test', 'Stage 3: Interview / Placement & MUDRA Support'],
    key_exams: ['IBPS PO / Clerk', 'RRB NTPC / Group-D', 'OSDA / World Skill Center'],
    timeline_months: 8,
    guide_url: '/guides/?category=career&q=Banking',
    jobs_url: '/jobs/?org=central',
    mocks_url: '/mock-tests/?exam=central',
    source_type: 'roadmap'
  }
];

function inferDomain(blob) {
  const hay = String(blob || '').toLowerCase();
  if (/teach|oavs|otet|osstet|b\.?ed|professor|lecturer|ugc net/.test(hay)) return { domain: 'Teaching & Academia', domain_key: 'teaching' };
  if (/police|constable|fireman|forest|defence|army|si\b/.test(hay)) return { domain: 'Police & Defence', domain_key: 'police' };
  if (/nurs|pharmac|health|doctor|medical|anm|gnm/.test(hay)) return { domain: 'Healthcare', domain_key: 'healthcare' };
  if (/bank|ibps|sbi|rrb|railway|psu|skill|osda|enterprise/.test(hay)) return { domain: 'Banking & PSU', domain_key: 'banking' };
  if (/osssc|peo|ri\b|ari\b|amin|clerk|district/.test(hay)) return { domain: 'District & Clerical', domain_key: 'district' };
  return { domain: 'Civil & Admin', domain_key: 'civil' };
}

function inferQual(rawQual, blob) {
  const hay = `${rawQual || ''} ${blob || ''}`.toLowerCase();
  if (/post[\s-]*grad|\bpg\b|master|phd|ugc net|professor/.test(hay)) return { min_qualification: 'Post-Graduate', qual_keys: ['pg'] };
  if (/b\.?ed|diploma|nursing|gnm|pharm|technical|iti/.test(hay)) return { min_qualification: 'B.Ed / Professional', qual_keys: ['bed-prof', 'graduate'] };
  if (/10th|matric|constable|fireman/.test(hay)) return { min_qualification: '10th Pass', qual_keys: ['10th', 'plus-2'] };
  if (/\+2|12th|inter|higher secondary/.test(hay)) return { min_qualification: '+2 / Inter', qual_keys: ['plus-2', 'graduate'] };
  return { min_qualification: 'Graduate', qual_keys: ['graduate'] };
}

export async function buildCareersHubPayload(db) {
  const [careerRows, guideRows, postRows] = db
    ? await Promise.all([
        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, domain_tag, eligibility,
                  pay_band, career_stage, published_at, updated_at
           FROM careers_articles
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 60`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
                  published_at, updated_at
           FROM informative_guides
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 100`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title, title_or, summary, category, published_at, updated_at
           FROM posts
           WHERE status = 'published' AND deleted_at IS NULL AND (type = 'career' OR LOWER(category) LIKE '%career%')
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 40`
        ).all().then((r) => r.results || []).catch(() => [])
      ])
    : [[], [], []];

  const items = [];
  const seen = new Set();

  // Always lead with the 8 structured Odisha & Central career roadmaps
  for (const r of CORE_CAREER_ROADMAPS) {
    seen.add(r.id);
    items.push({ ...r });
  }

  for (const c of careerRows) {
    const slug = cleanText(c.slug || c.id, 140);
    const key = `career_${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const blob = `${c.title_en || ''} ${c.summary_en || ''} ${c.domain_tag || ''} ${c.eligibility || ''}`;
    const dom = inferDomain(blob);
    const qual = inferQual(c.eligibility, blob);

    items.push({
      id: key,
      title_en: cleanText(c.title_en, 220),
      title_or: cleanText(c.title_or, 220),
      domain: dom.domain,
      domain_key: dom.domain_key,
      min_qualification: qual.min_qualification,
      qual_keys: qual.qual_keys,
      age_range: 'As per Odisha Govt / Central recruitment norms',
      pay_level: cleanText(c.pay_band, 80) || 'ORSP 7th Pay Matrix',
      selection_stages: ['Stage 1: Eligibility & Application', 'Stage 2: Written / CBT Exam', 'Stage 3: Verification & Appointment'],
      key_exams: [cleanText(c.domain_tag, 40) || dom.domain],
      timeline_months: 8,
      guide_url: `/careers/?slug=${encodeURIComponent(slug)}`,
      jobs_url: '/jobs/',
      mocks_url: '/mock-tests/',
      source_type: 'career'
    });
  }

  for (const g of guideRows) {
    if (!matchGuideToTopic(g, 'career')) continue;
    const slug = cleanText(g.slug || g.id, 140);
    const key = `guide_${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''}`;
    const dom = inferDomain(blob);
    const qual = inferQual('', blob);

    items.push({
      id: key,
      title_en: cleanText(g.title_en, 220),
      title_or: cleanText(g.title_or, 220),
      domain: dom.domain,
      domain_key: dom.domain_key,
      min_qualification: qual.min_qualification,
      qual_keys: qual.qual_keys,
      age_range: 'Includes Odisha SEBC/SC/ST/Women relaxations',
      pay_level: 'ORSP / Central 7th Pay Scale',
      selection_stages: ['Stage 1: Check Eligibility & OTR', 'Stage 2: Prepare Syllabus & PYQs', 'Stage 3: Clear CBT / Interview'],
      key_exams: [dom.domain],
      timeline_months: 6,
      guide_url: slug ? `/guides/${encodeURIComponent(slug)}` : '/guides/?category=career',
      jobs_url: '/jobs/',
      mocks_url: '/mock-tests/',
      source_type: 'guide'
    });
  }

  for (const p of postRows) {
    const slug = cleanText(p.slug || p.id, 140);
    const key = `post_${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const blob = `${p.title || ''} ${p.summary || ''}`;
    const dom = inferDomain(blob);
    const qual = inferQual('', blob);
    items.push({
      id: key,
      title_en: cleanText(p.title, 220),
      title_or: cleanText(p.title_or, 220),
      domain: dom.domain,
      domain_key: dom.domain_key,
      min_qualification: qual.min_qualification,
      qual_keys: qual.qual_keys,
      age_range: 'Odisha / Central norms',
      pay_level: 'ORSP 7th Pay Matrix',
      selection_stages: ['Stage 1: Notification', 'Stage 2: Exam', 'Stage 3: Selection'],
      key_exams: [dom.domain],
      timeline_months: 6,
      guide_url: '/guides/?category=career',
      jobs_url: '/jobs/',
      mocks_url: '/mock-tests/',
      source_type: 'career'
    });
  }

  return {
    ok: true,
    version: 'v376',
    generated_at: new Date().toISOString(),
    summary: {
      career_tracks: items.length,
      qualification_levels: 5,
      pay_scales: 8,
      linked_guides_and_mocks: items.filter((i) => i.guide_url).length
    },
    items
  };
}

function filterCareerItems(items, params) {
  const q = cleanText(params.get('q') || params.get('search'), 120).toLowerCase();
  const qual = cleanText(params.get('qual') || params.get('qualification'), 40).toLowerCase();
  const domain = cleanText(params.get('domain') || params.get('sector'), 40).toLowerCase();

  return items.filter((it) => {
    if (q) {
      const hay = `${it.title_en} ${it.title_or} ${it.domain} ${it.min_qualification} ${it.pay_level} ${(it.key_exams || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (qual && qual !== 'all') {
      if (!Array.isArray(it.qual_keys) || !it.qual_keys.includes(qual)) return false;
    }
    if (domain && domain !== 'all') {
      if (it.domain_key !== domain) return false;
    }
    return true;
  });
}

export async function handlePublicCareersHubApi(request, env) {
  const url = new URL(request.url);
  const payload = await buildCareersHubPayload(env && env.DB);
  const filtered = filterCareerItems(payload.items, url.searchParams);
  return json(
    {
      ...payload,
      filtered_count: filtered.length,
      items: filtered
    },
    200,
    {
      'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
      'X-CSO-Careers-Hub': 'v376'
    }
  );
}

export async function onRequestGet({ request, env }) {
  return handlePublicCareersHubApi(request, env);
}
