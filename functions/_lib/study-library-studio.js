// Study Library Directory Suite — Modules #1-#4 Recursive Multi-Level Backend
// - Module #1: Early Childhood & Primary Education (early-childhood)
// - Module #2: School & Higher Secondary Education (school-higher-sec)
// - Module #3: Undergraduate, Postgraduate & Research (ug-pg-research)
// - Module #4: Competitive Exams & Teacher Education (competitive-teacher)
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';

export const STUDY_DOMAINS = [
  'early-childhood',
  'school-higher-sec',
  'ug-pg-research',
  'competitive-teacher',
  'vocational-digital',
  'subjects-materials',
  'international-inclusive',
  'life-skills-culture',
  'libraries-support',
  'odisha-study-hub'
];

export const STUDY_RESOURCE_TYPES = [
  'notes',
  'pyq',
  'syllabus',
  'ebook',
  'model-paper',
  'guide'
];

export const STUDY_STATUSES = ['draft', 'in_review', 'published', 'archived'];
export const STUDY_LANGUAGES = ['EN', 'OR', 'EN+OR'];

function validateSafeCtaUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_CTA_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_CTA_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_CTA_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

function sanitizeEditorialHtml(raw, maxLen = 50000) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw);
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');
  s = s.replace(/javascript\s*:/gi, '');
  return s.trim().slice(0, maxLen);
}

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) {
      try { arr = JSON.parse(t); } catch { arr = t.split(','); }
    } else {
      arr = t ? t.split(',') : [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 40)).filter(Boolean))].slice(0, 12);
}

function sanitizeLinks(raw) {
  const list = parseJsonArray(raw);
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const url = validateSafeCtaUrl(item.url);
    if (!url) continue;
    out.push({
      label: cleanStr(item.label, 120) || 'Reference Link',
      url
    });
    if (out.length >= 20) break;
  }
  return out;
}

const REQUIRED_FOLDER_COLS = [
  ['parent_id', 'TEXT'],
  ['depth', 'INTEGER DEFAULT 1'],
  ['title_or', 'TEXT'],
  ['node_slug', 'TEXT'],
  ['description', 'TEXT'],
  ['description_en', "TEXT DEFAULT ''"],
  ['description_or', "TEXT DEFAULT ''"],
  ['seo_title', "TEXT DEFAULT ''"],
  ['seo_description', "TEXT DEFAULT ''"],
  ['featured_badge', "TEXT DEFAULT ''"],
  ['verified_at', "TEXT DEFAULT ''"],
  ['sort_order', 'INTEGER DEFAULT 0'],
  ['is_active', 'INTEGER DEFAULT 1'],
  ['created_at', 'TEXT'],
  ['updated_at', 'TEXT']
];

export const DOMAIN_TO_GROUP_SLUG = {
  'early-childhood': 'early-childhood-primary-education',
  'school-higher-sec': 'school-higher-secondary-education',
  'ug-pg-research': 'undergraduate-postgraduate-research',
  'competitive-teacher': 'competitive-exams-teacher-education',
  'vocational-digital': 'professional-vocational-digital-skills',
  'subjects-materials': 'subjects-languages-study-materials',
  'international-inclusive': 'international-inclusive-education',
  'life-skills-culture': 'life-skills-culture-lifelong-learning',
  'libraries-support': 'libraries-educators-learning-support',
  'odisha-study-hub': 'odisha-study-hub-resource-organisation'
};

function redactPii(raw) {
  let s = String(raw || '');
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
  s = s.replace(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g, '[redacted-phone]');
  s = s.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[redacted-id]');
  return s;
}

async function purgeStudyLibraryEdgeCache(request) {
  try {
    if (typeof caches === 'undefined' || !caches.default || !request) return;
    const origin = new URL(request.url).origin;
    const keys = [
      `${origin}/study-library/`,
      `${origin}/api/public/study-library/items`,
      `${origin}/api/content/study-library-directory`,
      `${origin}/sitemap-study-library.xml`
    ];
    await Promise.all(keys.map(k => caches.default.delete(k).catch(() => false)));
  } catch {
    // Cache API unavailable in local Node test env
  }
}

export const DOMAIN_LABELS = {
  'early-childhood': 'Early Childhood & Primary Education',
  'school-higher-sec': 'School & Higher Secondary Education',
  'ug-pg-research': 'Undergraduate, Postgraduate & Research',
  'competitive-teacher': 'Competitive Exams & Teacher Education',
  'vocational-digital': 'Professional, Vocational & Digital Skills',
  'subjects-materials': 'Subjects, Languages & Study Materials',
  'international-inclusive': 'International & Inclusive Education',
  'life-skills-culture': 'Life Skills, Culture & Lifelong Learning',
  'libraries-support': 'Libraries, Educators & Learning Support',
  'odisha-study-hub': 'Odisha Study Hub & Resource Organisation'
};

export const GROUP_SLUG_TO_DOMAIN = {
  'early-childhood-primary-education': 'early-childhood',
  'early-childhood': 'early-childhood',
  'school-higher-secondary-education': 'school-higher-sec',
  'school-higher-sec': 'school-higher-sec',
  'undergraduate-postgraduate-research': 'ug-pg-research',
  'ug-pg-research': 'ug-pg-research',
  'competitive-exams-teacher-education': 'competitive-teacher',
  'competitive-teacher': 'competitive-teacher',
  'professional-vocational-digital-skills': 'vocational-digital',
  'vocational-digital': 'vocational-digital',
  'subjects-languages-study-materials': 'subjects-materials',
  'subjects-materials': 'subjects-materials',
  'international-inclusive-education': 'international-inclusive',
  'international-inclusive': 'international-inclusive',
  'life-skills-culture-lifelong-learning': 'life-skills-culture',
  'life-skills-culture': 'life-skills-culture',
  'libraries-educators-learning-support': 'libraries-support',
  'libraries-support': 'libraries-support',
  'odisha-study-hub-resource-organisation': 'odisha-study-hub',
  'odisha-study-hub': 'odisha-study-hub'
};

const REQUIRED_ITEM_COLS = [
  ['folder_id', 'TEXT'],
  ['folder_path', 'TEXT'],
  ['resource_type', "TEXT DEFAULT 'notes'"],
  ['board_or_exam', 'TEXT'],
  ['subject_tag', 'TEXT'],
  ['language_parity', "TEXT DEFAULT 'EN'"],
  ['summary', 'TEXT'],
  ['body_html', 'TEXT'],
  ['pdf_url', 'TEXT'],
  ['pdf_size_bytes', 'INTEGER DEFAULT 0'],
  ['cover_image_url', 'TEXT'],
  ['links_json', "TEXT DEFAULT '[]'"],
  ['tags_json', "TEXT DEFAULT '[]'"],
  ['seo_title', 'TEXT'],
  ['seo_description', 'TEXT'],
  ['is_featured', 'INTEGER DEFAULT 0'],
  ['status', "TEXT DEFAULT 'draft'"],
  ['verified_at', "TEXT DEFAULT ''"],
  ['entity_tags_json', "TEXT DEFAULT '[]'"],
  ['created_by', 'TEXT'],
  ['updated_by', 'TEXT'],
  ['created_at', 'TEXT'],
  ['updated_at', 'TEXT']
];

const SEED_TREE = [
  // Module #1: early-childhood
  { id: 'slf_ec_nipun', domain: 'early-childhood', parent: null, depth: 1, name: 'NIPUN Odisha & FLN', slug: 'nipun-odisha-fln', sort: 1 },
  { id: 'slf_ec_fln_lit', domain: 'early-childhood', parent: 'slf_ec_nipun', depth: 2, name: 'Foundational Literacy (Odia & English)', slug: 'foundational-literacy', sort: 1 },
  { id: 'slf_ec_fln_lit_cards', domain: 'early-childhood', parent: 'slf_ec_fln_lit', depth: 3, name: 'Odia Varnamala & Reading Cards', slug: 'odia-varnamala-cards', sort: 1 },
  { id: 'slf_ec_fln_num', domain: 'early-childhood', parent: 'slf_ec_nipun', depth: 2, name: 'Foundational Numeracy', slug: 'foundational-numeracy', sort: 2 },
  { id: 'slf_ec_osepa', domain: 'early-childhood', parent: null, depth: 1, name: 'Class 1–5 Textbooks (OSEPA)', slug: 'class-1-5-osepa', sort: 2 },
  { id: 'slf_ec_c1_3', domain: 'early-childhood', parent: 'slf_ec_osepa', depth: 2, name: 'Class 1–3', slug: 'class-1-3', sort: 1 },
  { id: 'slf_ec_c4_5', domain: 'early-childhood', parent: 'slf_ec_osepa', depth: 2, name: 'Class 4–5', slug: 'class-4-5', sort: 2 },

  // Module #2: school-higher-sec
  { id: 'slf_sh_bse', domain: 'school-higher-sec', parent: null, depth: 1, name: 'Class 9–10 HSC (BSE Odisha)', slug: 'class-9-10-hsc-bse', sort: 1 },
  { id: 'slf_sh_bse_math', domain: 'school-higher-sec', parent: 'slf_sh_bse', depth: 2, name: 'Mathematics', slug: 'mathematics', sort: 1 },
  { id: 'slf_sh_bse_math_alg', domain: 'school-higher-sec', parent: 'slf_sh_bse_math', depth: 3, name: 'Algebra & Geometry Notes', slug: 'algebra-geometry-notes', sort: 1 },
  { id: 'slf_sh_bse_sci', domain: 'school-higher-sec', parent: 'slf_sh_bse', depth: 2, name: 'Science', slug: 'science', sort: 2 },
  { id: 'slf_sh_bse_lang', domain: 'school-higher-sec', parent: 'slf_sh_bse', depth: 2, name: 'English & Odia', slug: 'english-odia', sort: 3 },
  { id: 'slf_sh_bse_pyq', domain: 'school-higher-sec', parent: 'slf_sh_bse', depth: 2, name: 'BSE PYQ Archive', slug: 'bse-pyq-archive', sort: 4 },
  { id: 'slf_sh_chse', domain: 'school-higher-sec', parent: null, depth: 1, name: 'Class 11–12 +2 (CHSE Odisha)', slug: 'class-11-12-chse', sort: 2 },
  { id: 'slf_sh_chse_sci', domain: 'school-higher-sec', parent: 'slf_sh_chse', depth: 2, name: '+2 Science (PCM/PCB)', slug: 'plus2-science', sort: 1 },
  { id: 'slf_sh_chse_arts', domain: 'school-higher-sec', parent: 'slf_sh_chse', depth: 2, name: '+2 Arts', slug: 'plus2-arts', sort: 2 },
  { id: 'slf_sh_chse_com', domain: 'school-higher-sec', parent: 'slf_sh_chse', depth: 2, name: '+2 Commerce', slug: 'plus2-commerce', sort: 3 },

  // Module #3: ug-pg-research
  { id: 'slf_ug_fyugp', domain: 'ug-pg-research', parent: null, depth: 1, name: 'NEP 2020 FYUGP Syllabus', slug: 'nep-2020-fyugp', sort: 1 },
  { id: 'slf_ug_core', domain: 'ug-pg-research', parent: 'slf_ug_fyugp', depth: 2, name: 'Core Papers', slug: 'core-papers', sort: 1 },
  { id: 'slf_ug_aec_sec', domain: 'ug-pg-research', parent: 'slf_ug_fyugp', depth: 2, name: 'AEC & SEC', slug: 'aec-sec', sort: 2 },
  { id: 'slf_ug_pg', domain: 'ug-pg-research', parent: null, depth: 1, name: 'Postgraduate (MA / MSc / MCom)', slug: 'postgraduate-ma-msc-mcom', sort: 2 },
  { id: 'slf_ug_pg_eng', domain: 'ug-pg-research', parent: 'slf_ug_pg', depth: 2, name: 'English Literature', slug: 'english-literature', sort: 1 },
  { id: 'slf_ug_pg_edu', domain: 'ug-pg-research', parent: 'slf_ug_pg', depth: 2, name: 'Education', slug: 'education', sort: 2 },
  { id: 'slf_ug_pg_pol', domain: 'ug-pg-research', parent: 'slf_ug_pg', depth: 2, name: 'Political Science & History', slug: 'political-science-history', sort: 3 },
  { id: 'slf_ug_phd', domain: 'ug-pg-research', parent: null, depth: 1, name: 'PhD & Research Methodology', slug: 'phd-research-methodology', sort: 3 },
  { id: 'slf_ug_phd_syn', domain: 'ug-pg-research', parent: 'slf_ug_phd', depth: 2, name: 'Synopsis & Literature Review', slug: 'synopsis-literature-review', sort: 1 },

  // Module #4: competitive-teacher
  { id: 'slf_ct_opsc', domain: 'competitive-teacher', parent: null, depth: 1, name: 'OPSC', slug: 'opsc', sort: 1 },
  { id: 'slf_ct_opsc_pre', domain: 'competitive-teacher', parent: 'slf_ct_opsc', depth: 2, name: 'OAS Prelims (GS & CSAT)', slug: 'oas-prelims-gs-csat', sort: 1 },
  { id: 'slf_ct_opsc_pre_od', domain: 'competitive-teacher', parent: 'slf_ct_opsc_pre', depth: 3, name: 'Odisha History & Polity', slug: 'odisha-history-polity', sort: 1 },
  { id: 'slf_ct_opsc_mains', domain: 'competitive-teacher', parent: 'slf_ct_opsc', depth: 2, name: 'OAS Mains (GS 1–4 & Optional)', slug: 'oas-mains', sort: 2 },
  { id: 'slf_ct_opsc_oes', domain: 'competitive-teacher', parent: 'slf_ct_opsc', depth: 2, name: 'OES & Assistant Professor', slug: 'oes-assistant-professor', sort: 3 },
  { id: 'slf_ct_osssc', domain: 'competitive-teacher', parent: null, depth: 1, name: 'OSSSC', slug: 'osssc', sort: 2 },
  { id: 'slf_ct_osssc_ri', domain: 'competitive-teacher', parent: 'slf_ct_osssc', depth: 2, name: 'RI / ARI / Amin', slug: 'ri-ari-amin', sort: 1 },
  { id: 'slf_ct_osssc_fg', domain: 'competitive-teacher', parent: 'slf_ct_osssc', depth: 2, name: 'Forest Guard & LSI', slug: 'forest-guard-lsi', sort: 2 },
  { id: 'slf_ct_ossc', domain: 'competitive-teacher', parent: null, depth: 1, name: 'OSSC', slug: 'ossc', sort: 3 },
  { id: 'slf_ct_ossc_cgl', domain: 'competitive-teacher', parent: 'slf_ct_ossc', depth: 2, name: 'CGL Prelims & Mains', slug: 'cgl-prelims-mains', sort: 1 },
  { id: 'slf_ct_ossc_ltr', domain: 'competitive-teacher', parent: 'slf_ct_ossc', depth: 2, name: 'LTR & Regular Teacher', slug: 'ltr-regular-teacher', sort: 2 },
  { id: 'slf_ct_tet', domain: 'competitive-teacher', parent: null, depth: 1, name: 'Teacher Eligibility (OTET / OSSTET / CTET / B.Ed.)', slug: 'teacher-eligibility-tet', sort: 4 },
  { id: 'slf_ct_net', domain: 'competitive-teacher', parent: null, depth: 1, name: 'UGC NET', slug: 'ugc-net', sort: 5 },
  { id: 'slf_ct_net_p1', domain: 'competitive-teacher', parent: 'slf_ct_net', depth: 2, name: 'Paper 1 (Teaching & Research Aptitude)', slug: 'paper-1-aptitude', sort: 1 },
  { id: 'slf_ct_net_eng', domain: 'competitive-teacher', parent: 'slf_ct_net', depth: 2, name: 'English & Education', slug: 'english-education', sort: 2 },

  // Module #5: vocational-digital
  { id: 'slf_vd_dig', domain: 'vocational-digital', parent: null, depth: 1, name: 'Digital Literacy & IT Skills', slug: 'digital-literacy-it', sort: 1 },
  { id: 'slf_vd_oscit', domain: 'vocational-digital', parent: 'slf_vd_dig', depth: 2, name: 'OS-CIT & Basic Computing', slug: 'os-cit-basic-computing', sort: 1 },
  { id: 'slf_vd_oscit_lab', domain: 'vocational-digital', parent: 'slf_vd_oscit', depth: 3, name: 'MS Office & LibreOffice Lab', slug: 'office-libreoffice-lab', sort: 1 },
  { id: 'slf_vd_ai', domain: 'vocational-digital', parent: 'slf_vd_dig', depth: 2, name: 'AI, Data & Prompt Literacy', slug: 'ai-data-prompt-literacy', sort: 2 },
  { id: 'slf_vd_cyber', domain: 'vocational-digital', parent: 'slf_vd_dig', depth: 2, name: 'Cyber Hygiene & Digital Safety', slug: 'cyber-hygiene-safety', sort: 3 },
  { id: 'slf_vd_skill', domain: 'vocational-digital', parent: null, depth: 1, name: 'Skill Odisha & Vocational Trades', slug: 'skill-odisha-vocational', sort: 2 },
  { id: 'slf_vd_iti', domain: 'vocational-digital', parent: 'slf_vd_skill', depth: 2, name: 'ITI & Polytechnic Streams', slug: 'iti-polytechnic-streams', sort: 1 },
  { id: 'slf_vd_hosp', domain: 'vocational-digital', parent: 'slf_vd_skill', depth: 2, name: 'Hospitality, Tourism & Handloom', slug: 'hospitality-tourism-handloom', sort: 2 },
  { id: 'slf_vd_career', domain: 'vocational-digital', parent: null, depth: 1, name: 'Career Readiness & Entrepreneurship', slug: 'career-readiness-entrepreneurship', sort: 3 },
  { id: 'slf_vd_resume', domain: 'vocational-digital', parent: 'slf_vd_career', depth: 2, name: 'Resume, Interview & Communication', slug: 'resume-interview-communication', sort: 1 },
  { id: 'slf_vd_msme', domain: 'vocational-digital', parent: 'slf_vd_career', depth: 2, name: 'MSME & Startup Odisha Schemes', slug: 'msme-startup-odisha', sort: 2 },

  // Module #6: subjects-materials
  { id: 'slf_sm_lang', domain: 'subjects-materials', parent: null, depth: 1, name: 'Languages & Literature', slug: 'languages-literature', sort: 1 },
  { id: 'slf_sm_odia', domain: 'subjects-materials', parent: 'slf_sm_lang', depth: 2, name: 'Odia Sahitya & Grammar', slug: 'odia-sahitya-grammar', sort: 1 },
  { id: 'slf_sm_odia_bya', domain: 'subjects-materials', parent: 'slf_sm_odia', depth: 3, name: 'Prabandha & Byakarana Notes', slug: 'prabandha-byakarana-notes', sort: 1 },
  { id: 'slf_sm_eng', domain: 'subjects-materials', parent: 'slf_sm_lang', depth: 2, name: 'English Literature & Communication', slug: 'english-literature-comm', sort: 2 },
  { id: 'slf_sm_hinsan', domain: 'subjects-materials', parent: 'slf_sm_lang', depth: 2, name: 'Hindi & Sanskrit', slug: 'hindi-sanskrit', sort: 3 },
  { id: 'slf_sm_soc', domain: 'subjects-materials', parent: null, depth: 1, name: 'Social Sciences & Odisha Studies', slug: 'social-sciences-odisha', sort: 2 },
  { id: 'slf_sm_odhist', domain: 'subjects-materials', parent: 'slf_sm_soc', depth: 2, name: 'Odisha History, Culture & Geography', slug: 'odisha-history-culture-geo', sort: 1 },
  { id: 'slf_sm_pol', domain: 'subjects-materials', parent: 'slf_sm_soc', depth: 2, name: 'Indian Polity, Economy & Governance', slug: 'indian-polity-economy-gov', sort: 2 },
  { id: 'slf_sm_stem', domain: 'subjects-materials', parent: null, depth: 1, name: 'STEM & Quantitative Aptitude', slug: 'stem-quantitative-aptitude', sort: 3 },
  { id: 'slf_sm_math', domain: 'subjects-materials', parent: 'slf_sm_stem', depth: 2, name: 'Mathematics & Reasoning', slug: 'mathematics-reasoning', sort: 1 },
  { id: 'slf_sm_sci', domain: 'subjects-materials', parent: 'slf_sm_stem', depth: 2, name: 'General Science & Environment', slug: 'general-science-environment', sort: 2 },

  // Module #7: international-inclusive
  { id: 'slf_ii_inc', domain: 'international-inclusive', parent: null, depth: 1, name: 'Inclusive & Special Education (RPwD & NEP)', slug: 'inclusive-special-education', sort: 1 },
  { id: 'slf_ii_cwsn', domain: 'international-inclusive', parent: 'slf_ii_inc', depth: 2, name: 'CWSN Pedagogy & Assistive Tools', slug: 'cwsn-pedagogy-assistive', sort: 1 },
  { id: 'slf_ii_braille', domain: 'international-inclusive', parent: 'slf_ii_cwsn', depth: 3, name: 'Braille, Sign & Screen-Reader Guides', slug: 'braille-sign-screen-reader', sort: 1 },
  { id: 'slf_ii_bed', domain: 'international-inclusive', parent: 'slf_ii_inc', depth: 2, name: 'B.Ed. Special Education Notes', slug: 'bed-special-education', sort: 2 },
  { id: 'slf_ii_glob', domain: 'international-inclusive', parent: null, depth: 1, name: 'Global Scholarships & Study Abroad', slug: 'global-scholarships-abroad', sort: 2 },
  { id: 'slf_ii_ielts', domain: 'international-inclusive', parent: 'slf_ii_glob', depth: 2, name: 'IELTS / TOEFL / GRE Prep', slug: 'ielts-toefl-gre-prep', sort: 1 },
  { id: 'slf_ii_fell', domain: 'international-inclusive', parent: 'slf_ii_glob', depth: 2, name: 'National & International Fellowships', slug: 'national-international-fellowships', sort: 2 },
  { id: 'slf_ii_mle', domain: 'international-inclusive', parent: null, depth: 1, name: 'Tribal & Multilingual Education (MLE Odisha)', slug: 'tribal-multilingual-mle-odisha', sort: 3 },
  { id: 'slf_ii_bridge', domain: 'international-inclusive', parent: 'slf_ii_mle', depth: 2, name: 'Odia-Tribal Bridge Materials', slug: 'odia-tribal-bridge-materials', sort: 1 },
  { id: 'slf_ii_ssd', domain: 'international-inclusive', parent: 'slf_ii_mle', depth: 2, name: 'Eklavya & SSD School Resources', slug: 'eklavya-ssd-school-resources', sort: 2 },

  // Module #8: life-skills-culture
  { id: 'slf_lc_her', domain: 'life-skills-culture', parent: null, depth: 1, name: 'Odisha Heritage, Art & Literature', slug: 'odisha-heritage-art-literature', sort: 1 },
  { id: 'slf_lc_jag', domain: 'life-skills-culture', parent: 'slf_lc_her', depth: 2, name: 'Jagannath Culture & Temple Architecture', slug: 'jagannath-culture-architecture', sort: 1 },
  { id: 'slf_lc_folk', domain: 'life-skills-culture', parent: 'slf_lc_her', depth: 2, name: 'Odia Folk, Classical Dance & Handloom', slug: 'odia-folk-dance-handloom', sort: 2 },
  { id: 'slf_lc_ikat', domain: 'life-skills-culture', parent: 'slf_lc_folk', depth: 3, name: 'Sambalpuri & Ikat Craft Guides', slug: 'sambalpuri-ikat-craft-guides', sort: 1 },
  { id: 'slf_lc_fin', domain: 'life-skills-culture', parent: null, depth: 1, name: 'Financial, Civic & Media Literacy', slug: 'financial-civic-media-literacy', sort: 2 },
  { id: 'slf_lc_pf', domain: 'life-skills-culture', parent: 'slf_lc_fin', depth: 2, name: 'Personal Finance & Citizen Rights', slug: 'personal-finance-citizen-rights', sort: 1 },
  { id: 'slf_lc_fact', domain: 'life-skills-culture', parent: 'slf_lc_fin', depth: 2, name: 'Fact-Checking & Misinformation Defense', slug: 'fact-checking-misinformation-defense', sort: 2 },
  { id: 'slf_lc_well', domain: 'life-skills-culture', parent: null, depth: 1, name: 'Mental Wellness, Ethics & Leadership', slug: 'mental-wellness-ethics-leadership', sort: 3 },
  { id: 'slf_lc_mind', domain: 'life-skills-culture', parent: 'slf_lc_well', depth: 2, name: 'Exam Stress Management & Mindfulness', slug: 'exam-stress-mindfulness', sort: 1 },
  { id: 'slf_lc_speak', domain: 'life-skills-culture', parent: 'slf_lc_well', depth: 2, name: 'Public Speaking & Critical Thinking', slug: 'public-speaking-critical-thinking', sort: 2 },

  // Module #9: libraries-support
  { id: 'slf_ls_pub', domain: 'libraries-support', parent: null, depth: 1, name: 'Public & Institutional Libraries (Odisha)', slug: 'public-institutional-libraries-odisha', sort: 1 },
  { id: 'slf_ls_dist', domain: 'libraries-support', parent: 'slf_ls_pub', depth: 2, name: 'District & State Central Library Guides', slug: 'district-state-central-library-guides', sort: 1 },
  { id: 'slf_ls_dig', domain: 'libraries-support', parent: 'slf_ls_pub', depth: 2, name: 'Digital Library & Open Access Portals', slug: 'digital-library-open-access', sort: 2 },
  { id: 'slf_ls_ndli', domain: 'libraries-support', parent: 'slf_ls_dig', depth: 3, name: 'NDLI & e-Pathshala Directory', slug: 'ndli-epathshala-directory', sort: 1 },
  { id: 'slf_ls_edu', domain: 'libraries-support', parent: null, depth: 1, name: 'Educator & Pedagogy Toolkits', slug: 'educator-pedagogy-toolkits', sort: 2 },
  { id: 'slf_ls_rub', domain: 'libraries-support', parent: 'slf_ls_edu', depth: 2, name: 'Lesson Planning & NEP Rubrics', slug: 'lesson-planning-nep-rubrics', sort: 1 },
  { id: 'slf_ls_tlm', domain: 'libraries-support', parent: 'slf_ls_edu', depth: 2, name: 'Classroom Assessment & TLM Guides', slug: 'classroom-assessment-tlm-guides', sort: 2 },
  { id: 'slf_ls_ment', domain: 'libraries-support', parent: null, depth: 1, name: 'Student Mentorship & Career Counseling', slug: 'student-mentorship-career-counseling', sort: 3 },
  { id: 'slf_ls_schol', domain: 'libraries-support', parent: 'slf_ls_ment', depth: 2, name: 'Scholarship & Hostel Directories', slug: 'scholarship-hostel-directories', sort: 1 },
  { id: 'slf_ls_peer', domain: 'libraries-support', parent: 'slf_ls_ment', depth: 2, name: 'Peer Study Circles & Doubt Clinics', slug: 'peer-study-circles-doubt-clinics', sort: 2 },

  // Module #10: odisha-study-hub
  { id: 'slf_oh_dist', domain: 'odisha-study-hub', parent: null, depth: 1, name: 'District-Wise Study Hubs (30 Districts)', slug: 'district-wise-study-hubs', sort: 1 },
  { id: 'slf_oh_north', domain: 'odisha-study-hub', parent: 'slf_oh_dist', depth: 2, name: 'North Odisha (Balasore, Mayurbhanj, Bhadrak, Keonjhar)', slug: 'north-odisha-hubs', sort: 1 },
  { id: 'slf_oh_cent', domain: 'odisha-study-hub', parent: 'slf_oh_dist', depth: 2, name: 'Central & Coastal (Khordha, Cuttack, Puri, Kendrapara)', slug: 'central-coastal-odisha-hubs', sort: 2 },
  { id: 'slf_oh_west', domain: 'odisha-study-hub', parent: 'slf_oh_dist', depth: 2, name: 'Western & Southern Odisha (Sambalpur, Berhampur, Koraput)', slug: 'western-southern-odisha-hubs', sort: 3 },
  { id: 'slf_oh_west_sbp', domain: 'odisha-study-hub', parent: 'slf_oh_west', depth: 3, name: 'Sambalpur & Western Odisha Reading Rooms', slug: 'sambalpur-reading-rooms', sort: 1 },
  { id: 'slf_oh_idx', domain: 'odisha-study-hub', parent: null, depth: 1, name: 'Master Index & Cross-Domain Compendiums', slug: 'master-index-compendiums', sort: 2 },
  { id: 'slf_oh_yb', domain: 'odisha-study-hub', parent: 'slf_oh_idx', depth: 2, name: 'Odisha Yearbook & Economic Survey Briefs', slug: 'odisha-yearbook-economic-survey', sort: 1 },
  { id: 'slf_oh_cal', domain: 'odisha-study-hub', parent: 'slf_oh_idx', depth: 2, name: 'Master Exam Calendar & Syllabus Index', slug: 'master-exam-calendar-syllabus', sort: 2 },
  { id: 'slf_oh_qual', domain: 'odisha-study-hub', parent: null, depth: 1, name: 'Resource Curation & Quality Standards', slug: 'resource-curation-quality-standards', sort: 3 },
  { id: 'slf_oh_chk', domain: 'odisha-study-hub', parent: 'slf_oh_qual', depth: 2, name: 'Editorial Verification Checklists', slug: 'editorial-verification-checklists', sort: 1 },
  { id: 'slf_oh_lic', domain: 'odisha-study-hub', parent: 'slf_oh_qual', depth: 2, name: 'Archival & Open-License Attribution', slug: 'archival-open-license-attribution', sort: 2 }
];

const _ensuredDbs = new WeakSet();

async function runBatch(db, stmts) {
  if (!stmts.length) return;
  const CHUNK = 100;
  for (let i = 0; i < stmts.length; i += CHUNK) {
    const slice = stmts.slice(i, i + CHUNK);
    if (typeof db.batch === 'function') {
      await db.batch(slice);
    } else {
      for (const s of slice) await s.run();
    }
  }
}

export async function ensureStudyLibraryStudioSchema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  if (_ensuredDbs.has(db)) return;

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS study_library_folders (
       id TEXT PRIMARY KEY,
       domain_slug TEXT NOT NULL,
       parent_id TEXT,
       depth INTEGER DEFAULT 1,
       name TEXT NOT NULL,
       title_or TEXT DEFAULT '',
       slug TEXT NOT NULL,
       node_slug TEXT DEFAULT '',
       description TEXT,
       sort_order INTEGER DEFAULT 0,
       is_active INTEGER DEFAULT 1,
       created_at TEXT,
       updated_at TEXT,
       UNIQUE(domain_slug, parent_id, slug)
     )`
  ).run();

  const fCols = new Set(((await db.prepare(`PRAGMA table_info(study_library_folders)`).all()).results || []).map(c => c.name));
  for (const [col, def] of REQUIRED_FOLDER_COLS) {
    if (!fCols.has(col)) await db.prepare(`ALTER TABLE study_library_folders ADD COLUMN ${col} ${def}`).run();
  }
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_slf_domain_parent ON study_library_folders(domain_slug, parent_id)`).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS study_library_items (
       id TEXT PRIMARY KEY,
       domain_slug TEXT NOT NULL,
       folder_id TEXT,
       folder_path TEXT,
       title TEXT NOT NULL,
       slug TEXT UNIQUE NOT NULL,
       resource_type TEXT DEFAULT 'notes',
       board_or_exam TEXT,
       subject_tag TEXT,
       language_parity TEXT DEFAULT 'EN',
       summary TEXT,
       body_html TEXT,
       pdf_url TEXT,
       pdf_size_bytes INTEGER DEFAULT 0,
       cover_image_url TEXT,
       links_json TEXT DEFAULT '[]',
       tags_json TEXT DEFAULT '[]',
       seo_title TEXT,
       seo_description TEXT,
       is_featured INTEGER DEFAULT 0,
       status TEXT DEFAULT 'draft',
       created_by TEXT,
       updated_by TEXT,
       created_at TEXT,
       updated_at TEXT
     )`
  ).run();

  const iCols = new Set(((await db.prepare(`PRAGMA table_info(study_library_items)`).all()).results || []).map(c => c.name));
  for (const [col, def] of REQUIRED_ITEM_COLS) {
    if (!iCols.has(col)) await db.prepare(`ALTER TABLE study_library_items ADD COLUMN ${col} ${def}`).run();
  }
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sli_domain_folder ON study_library_items(domain_slug, folder_id)`).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS study_library_revisions (
       id TEXT PRIMARY KEY,
       item_id TEXT NOT NULL,
       version_no INTEGER NOT NULL DEFAULT 1,
       title TEXT,
       slug TEXT,
       snapshot_json TEXT NOT NULL,
       edited_by TEXT,
       change_note TEXT,
       created_at TEXT NOT NULL
     )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS study_library_suggestions (
       id TEXT PRIMARY KEY,
       domain_slug TEXT NOT NULL,
       folder_id TEXT DEFAULT '',
       item_slug TEXT DEFAULT '',
       suggestion_type TEXT NOT NULL DEFAULT 'topic',
       title TEXT NOT NULL,
       details TEXT DEFAULT '',
       source_url TEXT DEFAULT '',
       status TEXT NOT NULL DEFAULT 'pending',
       created_at TEXT NOT NULL,
       reviewed_by TEXT DEFAULT '',
       reviewed_at TEXT DEFAULT ''
     )`
  ).run();

  // Bridge existing 1,681-node D1 taxonomy (study_library_nodes) into study_library_folders idempotently
  const bridgedNodesRow = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM study_library_folders WHERE id LIKE 'sln_%'`
  ).first();
  if (!bridgedNodesRow || Number(bridgedNodesRow.cnt || 0) === 0) {
    const nodesTbl = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='study_library_nodes'`
    ).first();
    if (nodesTbl) {
      const legacyNodes = (await db.prepare(
        `SELECT * FROM study_library_nodes
         WHERE status = 'published'
         ORDER BY CASE level WHEN 'group' THEN 1 WHEN 'section' THEN 2 WHEN 'subcategory' THEN 3 ELSE 4 END, sort_order ASC`
      ).all()).results || [];
      if (legacyNodes.length > 0) {
        const nowIso = new Date().toISOString();
        const idToFolder = new Map();
        const slugToFolder = new Map();
        const insertSql = `INSERT OR IGNORE INTO study_library_folders (
          id, domain_slug, parent_id, depth, name, title_or, slug, node_slug, description, sort_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`;
        const stmts = [];
        for (const n of legacyNodes) {
          const lvl = n.level === 'group' ? 1 : (n.level === 'section' ? 2 : (n.level === 'subcategory' ? 3 : 4));
          let domainSlug = '';
          let parentId = null;
          if (lvl === 1) {
            domainSlug = GROUP_SLUG_TO_DOMAIN[String(n.slug || '').toLowerCase()] || STUDY_DOMAINS[Math.max(0, Math.min(STUDY_DOMAINS.length - 1, (Number(n.sort_order) || 1) - 1))] || 'odisha-study-hub';
          } else {
            const pInfo = (n.parent_id != null ? idToFolder.get(n.parent_id) : null) || slugToFolder.get(n.parent_slug || '');
            if (!pInfo) continue;
            domainSlug = pInfo.domainSlug;
            parentId = pInfo.id;
          }
          const fId = `sln_${n.id}`;
          idToFolder.set(n.id, { id: fId, domainSlug });
          slugToFolder.set(n.slug, { id: fId, domainSlug });
          stmts.push(
            db.prepare(insertSql).bind(
              fId,
              domainSlug,
              parentId,
              lvl,
              n.title || n.slug,
              n.title_or || '',
              n.slug,
              n.slug,
              n.description || n.subtitle || '',
              Number(n.sort_order) || 0,
              nowIso,
              n.updated_at || nowIso
            )
          );
        }
        await runBatch(db, stmts);
      }
    }
  }

  // Bridge existing published resources table into study_library_items idempotently
  const bridgedItemsRow = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM study_library_items WHERE id LIKE 'res_%'`
  ).first();
  if (!bridgedItemsRow || Number(bridgedItemsRow.cnt || 0) === 0) {
    const resTbl = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='resources'`
    ).first();
    if (resTbl) {
      const legacyResources = ((await db.prepare(
        `SELECT * FROM resources WHERE status = 'published'`
      ).all()).results || []).filter((r) => !r.deleted_at);
      if (legacyResources.length > 0) {
        const nowIso = new Date().toISOString();
        const insertItemSql = `INSERT OR IGNORE INTO study_library_items (
          id, domain_slug, folder_id, folder_path, title, slug, resource_type,
          board_or_exam, subject_tag, language_parity, summary, body_html,
          pdf_url, pdf_size_bytes, cover_image_url, links_json, tags_json,
          seo_title, seo_description, is_featured, status,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'EN', ?, ?, ?, 0, '', '[]', '[]', ?, ?, 0, 'published', 'system', 'system', ?, ?)`;
        const itemStmts = [];
        for (const r of legacyResources) {
          const itemId = `res_${r.id}`;
          const itemSlug = r.slug ? slugify(r.slug) : (slugify(r.title || r.id) + '-' + String(r.id).slice(-5));
          const rType = STUDY_RESOURCE_TYPES.includes(r.resource_type) ? r.resource_type : 'syllabus';
          const domainSlug = r.exam_slug ? 'competitive-teacher' : 'odisha-study-hub';
          const summaryText = r.summary || r.description || '';
          const bodyContent = r.body_html || r.description || '';
          const pdfHref = r.pdf_url || r.file_url || r.official_source_url || r.source_url || '';
          itemStmts.push(
            db.prepare(insertItemSql).bind(
              itemId,
              domainSlug,
              DOMAIN_LABELS[domainSlug] || domainSlug,
              r.title || 'Verified Study Resource',
              itemSlug,
              rType,
              r.exam_slug || r.exam_type || 'Odisha',
              r.category || '',
              summaryText,
              bodyContent,
              pdfHref,
              r.title || '',
              summaryText.slice(0, 200),
              nowIso,
              r.updated_at || nowIso
            )
          );
        }
        await runBatch(db, itemStmts);
      }
    }
  }

  const domainCountsRes = await db.prepare(
    `SELECT domain_slug, COUNT(*) AS n FROM study_library_folders GROUP BY domain_slug`
  ).all();
  const seededDomains = new Set((domainCountsRes.results || []).filter(r => Number(r.n) > 0).map(r => r.domain_slug));
  const missingSeeds = SEED_TREE.filter(s => !seededDomains.has(s.domain));
  if (missingSeeds.length > 0) {
    const nowIso = new Date().toISOString();
    const seedSql = `INSERT OR IGNORE INTO study_library_folders (
      id, domain_slug, parent_id, depth, name, slug, description, sort_order, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', ?, 1, ?, ?)`;
    await runBatch(
      db,
      missingSeeds.map(s => db.prepare(seedSql).bind(s.id, s.domain, s.parent, s.depth, s.name, s.slug, s.sort, nowIso, nowIso))
    );
  }
  _ensuredDbs.add(db);
}

function buildFolderAnalytics(allFolders, directCounts) {
  const byId = new Map();
  const childrenByParent = new Map();

  for (const f of allFolders) {
    byId.set(f.id, { ...f, direct_item_count: directCounts.get(f.id) || 0, total_item_count: 0, child_count: 0, full_path: f.name });
    const pKey = f.parent_id || '__ROOT__';
    if (!childrenByParent.has(pKey)) childrenByParent.set(pKey, []);
    childrenByParent.get(pKey).push(f.id);
  }

  function computePath(id) {
    const chain = [];
    let cur = byId.get(id);
    const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.unshift(cur);
      cur = cur.parent_id ? byId.get(cur.parent_id) : null;
    }
    return chain;
  }

  function computeTotals(id, seen = new Set()) {
    if (seen.has(id)) return 0;
    seen.add(id);
    const node = byId.get(id);
    if (!node) return 0;
    const kids = childrenByParent.get(id) || [];
    node.child_count = kids.length;
    let sum = node.direct_item_count;
    for (const kidId of kids) {
      sum += computeTotals(kidId, seen);
    }
    node.total_item_count = sum;
    return sum;
  }

  for (const f of allFolders) {
    const chain = computePath(f.id);
    const node = byId.get(f.id);
    node.full_path = chain.map(x => x.name).join(' › ');
    if (!f.parent_id) computeTotals(f.id);
  }
  // Ensure any orphaned nodes also have totals computed
  for (const f of allFolders) {
    const node = byId.get(f.id);
    if (node.total_item_count === 0 && node.direct_item_count > 0) computeTotals(f.id);
  }

  const flatOrdered = [];
  function walk(parentKey) {
    const kids = (childrenByParent.get(parentKey) || [])
      .map(id => byId.get(id))
      .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    for (const k of kids) {
      flatOrdered.push(k);
      walk(k.id);
    }
  }
  walk('__ROOT__');

  return { byId, childrenByParent, flatOrdered, computePath };
}

function getDescendantIds(childrenByParent, rootId) {
  const out = [];
  const stack = [rootId];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    out.push(cur);
    const kids = childrenByParent.get(cur) || [];
    for (const k of kids) stack.push(k);
  }
  return out;
}

function normalizeStudyItem(row) {
  return {
    id: row.id,
    domain_slug: row.domain_slug,
    folder_id: row.folder_id || '',
    folder_path: row.folder_path || '',
    title: row.title,
    slug: row.slug,
    resource_type: row.resource_type || 'notes',
    board_or_exam: row.board_or_exam || '',
    subject_tag: row.subject_tag || '',
    language_parity: STUDY_LANGUAGES.includes(row.language_parity) ? row.language_parity : 'EN',
    summary: row.summary || '',
    body_html: row.body_html || '',
    pdf_url: row.pdf_url || '',
    pdf_size_bytes: Number(row.pdf_size_bytes || 0),
    cover_image_url: row.cover_image_url || '',
    links: parseJsonArray(row.links_json),
    tags: parseTags(row.tags_json),
    seo_title: row.seo_title || '',
    seo_description: row.seo_description || '',
    has_seo_meta: Boolean(String(row.seo_title || '').trim() && String(row.seo_description || '').trim()),
    is_featured: Boolean(row.is_featured),
    status: row.status || 'draft',
    verified_at: row.verified_at || '',
    entity_tags: parseTags(row.entity_tags_json),
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function buildFolderPublicPath(chain, domainSlug) {
  const trackSlug = DOMAIN_TO_GROUP_SLUG[domainSlug] || domainSlug;
  const firstSlug = chain[0] ? String(chain[0].slug || '').toLowerCase() : '';
  const hasTrackRoot = Boolean(GROUP_SLUG_TO_DOMAIN[firstSlug] || STUDY_DOMAINS.includes(firstSlug));
  const segs = hasTrackRoot ? chain.map(x => x.slug) : [trackSlug, ...chain.map(x => x.slug)];
  const slugPath = segs.filter(Boolean).join('/');
  return {
    slug_path: slugPath,
    public_url: `/study-library/${slugPath}/`
  };
}

export async function getStudyTree(env, { domain, parent_id = '' }) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const domainSlug = cleanStr(domain, 60);
  if (!STUDY_DOMAINS.includes(domainSlug)) {
    throw validationError({ domain: `domain must be one of: ${STUDY_DOMAINS.join(', ')}` });
  }

  const allFolders = (await env.DB.prepare(
    `SELECT * FROM study_library_folders WHERE domain_slug = ? ORDER BY depth ASC, sort_order ASC, name ASC`
  ).bind(domainSlug).all()).results || [];

  const countsRes = await env.DB.prepare(
    `SELECT COALESCE(folder_id, '') AS fid, COUNT(*) AS n FROM study_library_items WHERE domain_slug = ? GROUP BY fid`
  ).bind(domainSlug).all();
  const directCounts = new Map();
  for (const r of (countsRes.results || [])) {
    if (r.fid) directCounts.set(r.fid, Number(r.n || 0));
  }

  const { byId, childrenByParent, flatOrdered, computePath } = buildFolderAnalytics(allFolders, directCounts);
  const activeParentId = cleanStr(parent_id, 80) || null;
  if (activeParentId && !byId.has(activeParentId)) {
    throw new HttpError(404, 'FOLDER_NOT_FOUND', `Folder "${activeParentId}" not found in domain "${domainSlug}"`);
  }

  const enrichFolder = (f) => {
    const chain = computePath(f.id);
    const { slug_path, public_url } = buildFolderPublicPath(chain, domainSlug);
    return {
      ...f,
      title_or: f.title_or || '',
      description_en: f.description_en || f.description || '',
      description_or: f.description_or || '',
      seo_title: f.seo_title || '',
      seo_description: f.seo_description || '',
      featured_badge: f.featured_badge || '',
      verified_at: f.verified_at || '',
      is_active: Number(f.is_active ?? 1),
      slug_path,
      public_url
    };
  };

  const breadcrumb = activeParentId
    ? computePath(activeParentId).map(n => {
        const { slug_path, public_url } = buildFolderPublicPath(computePath(n.id), domainSlug);
        return { id: n.id, name: n.name, slug: n.slug, depth: n.depth, slug_path, public_url };
      })
    : [];

  const children = (childrenByParent.get(activeParentId || '__ROOT__') || [])
    .map(id => byId.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
    .map(enrichFolder);

  const enrichedFlat = flatOrdered.map(enrichFolder);

  let maxDepth = 0;
  for (const f of allFolders) {
    if (Number(f.depth || 1) > maxDepth) maxDepth = Number(f.depth || 1);
  }

  const pendingSugRow = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM study_library_suggestions WHERE domain_slug = ? AND status = 'pending'`
  ).bind(domainSlug).first();

  return {
    ok: true,
    domain_slug: domainSlug,
    track_slug: DOMAIN_TO_GROUP_SLUG[domainSlug] || domainSlug,
    public_url: `/study-library/${DOMAIN_TO_GROUP_SLUG[domainSlug] || domainSlug}/`,
    parent_id: activeParentId,
    breadcrumb,
    children,
    folders: enrichedFlat,
    metrics: {
      total_folders: allFolders.length,
      max_depth: maxDepth,
      pending_suggestions: Number((pendingSugRow && pendingSugRow.cnt) || 0)
    }
  };
}

export async function createStudyFolder(env, body = {}, actor) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const domain_slug = cleanStr(body.domain_slug, 60);
  if (!STUDY_DOMAINS.includes(domain_slug)) {
    throw validationError({ domain_slug: `domain_slug must be one of: ${STUDY_DOMAINS.join(', ')}` });
  }
  const name = cleanStr(body.name, 120, { required: true });
  if (!name) throw validationError({ name: 'Folder name is required' });

  const parent_id = cleanStr(body.parent_id, 80) || null;
  let depth = 1;
  if (parent_id) {
    const parent = await env.DB.prepare(
      `SELECT id, domain_slug, depth FROM study_library_folders WHERE id = ?`
    ).bind(parent_id).first();
    if (!parent || parent.domain_slug !== domain_slug) {
      throw new HttpError(404, 'PARENT_NOT_FOUND', 'Parent folder not found in this domain');
    }
    depth = Number(parent.depth || 1) + 1;
    if (depth > 6) throw validationError({ parent_id: 'Maximum sub-directory depth (6) reached' });
  }

  const rawSlug = cleanStr(body.slug, 80);
  const slug = (rawSlug ? rawSlug.toLowerCase() : slugify(name)) || 'folder';
  if (!SLUG_RE.test(slug)) throw validationError({ slug: 'Invalid folder slug' });

  const dup = parent_id
    ? await env.DB.prepare(`SELECT id FROM study_library_folders WHERE domain_slug = ? AND parent_id = ? AND slug = ? LIMIT 1`).bind(domain_slug, parent_id, slug).first()
    : await env.DB.prepare(`SELECT id FROM study_library_folders WHERE domain_slug = ? AND parent_id IS NULL AND slug = ? LIMIT 1`).bind(domain_slug, slug).first();
  if (dup) throw new HttpError(409, 'SLUG_CONFLICT', `Sub-directory "${slug}" already exists here`);

  const id = `slf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const description = cleanStr(body.description, 300) || '';
  const sort_order = Math.max(0, Math.min(999, Math.round(Number(body.sort_order) || 0)));

  await env.DB.prepare(
    `INSERT INTO study_library_folders (
       id, domain_slug, parent_id, depth, name, slug, description, sort_order, is_active, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, domain_slug, parent_id, depth, name, slug, description, sort_order, nowIso, nowIso).run();

  const row = await env.DB.prepare(`SELECT * FROM study_library_folders WHERE id = ?`).bind(id).first();
  return { ok: true, folder: row, actor: actor && actor.email };
}

export async function updateStudyFolder(env, id, body = {}) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM study_library_folders WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Folder "${id}" not found`);

  const rawName = body.name_en !== undefined ? body.name_en : body.name;
  const name = rawName !== undefined ? cleanStr(rawName, 120, { required: true }) : existing.name;
  if (!name) throw validationError({ name: 'Folder name cannot be empty' });

  const slug = body.slug !== undefined
    ? ((cleanStr(body.slug, 80).toLowerCase() || slugify(name)) || existing.slug)
    : existing.slug;
  if (!SLUG_RE.test(slug)) throw validationError({ slug: 'Invalid folder slug' });

  let parent_id = existing.parent_id || null;
  let depth = Number(existing.depth || 1);
  if (body.parent_id !== undefined) {
    const nextParent = cleanStr(body.parent_id, 80) || null;
    if (nextParent === id) throw validationError({ parent_id: 'Folder cannot be its own parent' });
    if (nextParent) {
      const pRow = await env.DB.prepare(`SELECT id, domain_slug, depth FROM study_library_folders WHERE id = ?`).bind(nextParent).first();
      if (!pRow || pRow.domain_slug !== existing.domain_slug) {
        throw new HttpError(404, 'PARENT_NOT_FOUND', 'Parent folder not found in this domain');
      }
      parent_id = pRow.id;
      depth = Math.min(6, Number(pRow.depth || 1) + 1);
    } else {
      parent_id = null;
      depth = 1;
    }
  }

  const title_or = body.title_or !== undefined ? cleanStr(body.title_or, 140) : (existing.title_or || '');
  const description_en = body.description_en !== undefined
    ? cleanStr(body.description_en, 1200)
    : (body.description !== undefined ? cleanStr(body.description, 1200) : (existing.description_en || existing.description || ''));
  const description_or = body.description_or !== undefined ? cleanStr(body.description_or, 1200) : (existing.description_or || '');
  const description = description_en.slice(0, 300);
  const seo_title = body.seo_title !== undefined ? cleanStr(body.seo_title, 120) : (existing.seo_title || '');
  const seo_description = body.seo_description !== undefined ? cleanStr(body.seo_description, 320) : (existing.seo_description || '');
  const featured_badge = body.featured_badge !== undefined ? cleanStr(body.featured_badge, 40) : (existing.featured_badge || '');
  const verified_at = body.verified_at !== undefined ? cleanStr(body.verified_at, 40) : (existing.verified_at || '');
  const sort_order = body.sort_order !== undefined
    ? Math.max(0, Math.min(999, Math.round(Number(body.sort_order) || 0)))
    : Number(existing.sort_order || 0);
  const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : Number(existing.is_active ?? 1);
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE study_library_folders
     SET name = ?, title_or = ?, slug = ?, parent_id = ?, depth = ?,
         description = ?, description_en = ?, description_or = ?,
         seo_title = ?, seo_description = ?, featured_badge = ?,
         verified_at = ?, sort_order = ?, is_active = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    name, title_or, slug, parent_id, depth,
    description, description_en, description_or,
    seo_title, seo_description, featured_badge,
    verified_at, sort_order, is_active, nowIso, id
  ).run();

  const updated = await env.DB.prepare(`SELECT * FROM study_library_folders WHERE id = ?`).bind(id).first();
  return { ok: true, folder: updated };
}

export async function deleteStudyFolder(env, id, reassignTo = '') {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM study_library_folders WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Folder "${id}" not found`);

  const childCount = Number((await env.DB.prepare(`SELECT COUNT(*) AS n FROM study_library_folders WHERE parent_id = ?`).bind(id).first()).n || 0);
  const itemCount = Number((await env.DB.prepare(`SELECT COUNT(*) AS n FROM study_library_items WHERE folder_id = ?`).bind(id).first()).n || 0);

  if (childCount > 0 || itemCount > 0) {
    const targetId = cleanStr(reassignTo, 80);
    if (!targetId) {
      throw new HttpError(
        409,
        'FOLDER_NOT_EMPTY',
        `Folder contains ${childCount} sub-folder(s) and ${itemCount} resource(s). Supply reassign_to or delete children first.`
      );
    }
    if (targetId === id) throw validationError({ reassign_to: 'Cannot reassign folder into itself' });
    const target = await env.DB.prepare(`SELECT * FROM study_library_folders WHERE id = ? AND domain_slug = ?`).bind(targetId, existing.domain_slug).first();
    if (!target) throw new HttpError(404, 'TARGET_NOT_FOUND', 'Reassign target folder not found in this domain');

    await env.DB.prepare(`UPDATE study_library_folders SET parent_id = ?, depth = ? WHERE parent_id = ?`)
      .bind(target.id, Number(target.depth || 1) + 1, id).run();
    await env.DB.prepare(`UPDATE study_library_items SET folder_id = ? WHERE folder_id = ?`)
      .bind(target.id, id).run();
  }

  await env.DB.prepare(`DELETE FROM study_library_folders WHERE id = ?`).bind(id).run();
  return { ok: true, deleted_id: id, reassigned_to: reassignTo || null };
}

export async function listStudyItems(env, opts = {}) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const domain = cleanStr(opts.domain, 60);
  if (!STUDY_DOMAINS.includes(domain)) {
    throw validationError({ domain: `domain must be one of: ${STUDY_DOMAINS.join(', ')}` });
  }

  const allFolders = (await env.DB.prepare(`SELECT * FROM study_library_folders WHERE domain_slug = ?`).bind(domain).all()).results || [];
  const { childrenByParent } = buildFolderAnalytics(allFolders, new Map());

  const folderId = cleanStr(opts.folder_id, 80);
  const includeDesc = opts.include_descendants === '1' || opts.include_descendants === true || opts.include_descendants === 'true';
  const resourceType = cleanStr(opts.resource_type, 40) || 'all';
  const status = cleanStr(opts.status, 40) || 'all';
  const q = cleanStr(opts.q, 120);
  const limit = Math.min(100, Math.max(1, Math.round(Number(opts.limit) || 25)));
  const offset = Math.max(0, Math.round(Number(opts.offset) || 0));

  const where = ['domain_slug = ?'];
  const binds = [domain];

  if (folderId) {
    if (includeDesc) {
      const ids = getDescendantIds(childrenByParent, folderId);
      where.push(`folder_id IN (${ids.map(() => '?').join(',')})`);
      binds.push(...ids);
    } else {
      where.push('folder_id = ?');
      binds.push(folderId);
    }
  }
  if (resourceType !== 'all' && STUDY_RESOURCE_TYPES.includes(resourceType)) {
    where.push('resource_type = ?');
    binds.push(resourceType);
  }
  if (status !== 'all' && STUDY_STATUSES.includes(status)) {
    where.push('status = ?');
    binds.push(status);
  }
  if (q) {
    const l = likeEscape(q);
    where.push("(title LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' OR board_or_exam LIKE ? ESCAPE '\\' OR subject_tag LIKE ? ESCAPE '\\' OR folder_path LIKE ? ESCAPE '\\')");
    binds.push(l, l, l, l, l);
  }

  const wSql = where.join(' AND ');
  const total = Number((await env.DB.prepare(`SELECT COUNT(*) AS n FROM study_library_items WHERE ${wSql}`).bind(...binds).first()).n || 0);
  const rows = (await env.DB.prepare(
    `SELECT * FROM study_library_items WHERE ${wSql} ORDER BY is_featured DESC, updated_at DESC, created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()).results || [];

  const kpiRow = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total_items,
       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_items,
       SUM(CASE WHEN resource_type IN ('pyq', 'syllabus') THEN 1 ELSE 0 END) AS pyq_and_syllabus_count,
       SUM(CASE WHEN language_parity = 'EN+OR' THEN 1 ELSE 0 END) AS bilingual_count
     FROM study_library_items WHERE domain_slug = ?`
  ).bind(domain).first();

  const crossRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM study_library_items`).first();

  return {
    ok: true,
    items: rows.map(normalizeStudyItem),
    kpis: {
      total_items: Number((kpiRow && kpiRow.total_items) || 0),
      published_items: Number((kpiRow && kpiRow.published_items) || 0),
      pyq_and_syllabus_count: Number((kpiRow && kpiRow.pyq_and_syllabus_count) || 0),
      bilingual_count: Number((kpiRow && kpiRow.bilingual_count) || 0),
      folder_count: allFolders.length,
      cross_domain_total_items: Number((crossRow && crossRow.n) || 0)
    },
    paging: { total, limit, offset }
  };
}

async function resolveFolderPath(db, domainSlug, folderId) {
  if (!folderId) return '';
  const allFolders = (await db.prepare(`SELECT * FROM study_library_folders WHERE domain_slug = ?`).bind(domainSlug).all()).results || [];
  const { byId, computePath } = buildFolderAnalytics(allFolders, new Map());
  if (!byId.has(folderId)) throw new HttpError(404, 'FOLDER_NOT_FOUND', `Folder "${folderId}" not found in domain "${domainSlug}"`);
  return computePath(folderId).map(n => n.name).join(' › ');
}

function validateStudyItemInput(body = {}, existing = null) {
  const pick = (k) => (body[k] !== undefined ? body[k] : (existing ? existing[k] : undefined));

  const domain_slug = cleanStr(pick('domain_slug'), 60);
  if (!STUDY_DOMAINS.includes(domain_slug)) {
    throw validationError({ domain_slug: `domain_slug must be one of: ${STUDY_DOMAINS.join(', ')}` });
  }
  const title = cleanStr(pick('title'), 200, { required: true });
  if (!title) throw validationError({ title: 'Title is required' });

  const rawSlug = body.slug !== undefined ? cleanStr(body.slug, 90) : (existing ? existing.slug : '');
  const slug = (rawSlug ? rawSlug.toLowerCase() : slugify(title)) || 'study-resource';
  if (!SLUG_RE.test(slug)) throw validationError({ slug: 'Invalid slug format' });

  const rawType = String(pick('resource_type') || 'notes').trim().toLowerCase();
  const resource_type = STUDY_RESOURCE_TYPES.includes(rawType) ? rawType : 'notes';

  const rawStatus = String(pick('status') || 'draft').trim().toLowerCase();
  const status = STUDY_STATUSES.includes(rawStatus) ? rawStatus : 'draft';

  const rawLang = String(pick('language_parity') || 'EN').trim().toUpperCase();
  const language_parity = STUDY_LANGUAGES.includes(rawLang) ? rawLang : 'EN';

  const folder_id = cleanStr(pick('folder_id'), 80) || null;
  const board_or_exam = cleanStr(pick('board_or_exam'), 120) || '';
  const subject_tag = cleanStr(pick('subject_tag'), 80) || '';
  const summary = sanitizeEditorialHtml(pick('summary') || '', 800);
  const body_html = sanitizeEditorialHtml(pick('body_html') || '', 50000);
  const pdf_url = validateSafeCtaUrl(pick('pdf_url'));
  const pdf_size_bytes = Math.max(0, Math.round(Number(pick('pdf_size_bytes')) || 0));
  const cover_image_url = validateSafeCtaUrl(pick('cover_image_url'));
  const linksRaw = body.links !== undefined ? body.links : (body.links_json !== undefined ? body.links_json : (existing && existing.links_json));
  const links_json = JSON.stringify(sanitizeLinks(linksRaw));
  const tagsArr = body.tags !== undefined ? parseTags(body.tags) : parseTags(existing && existing.tags_json);
  const seo_title = cleanStr(pick('seo_title'), 120) || '';
  const seo_description = cleanStr(pick('seo_description'), 240) || '';
  const is_featured = Boolean(pick('is_featured')) ? 1 : 0;

  return {
    domain_slug,
    folder_id,
    title,
    slug,
    resource_type,
    board_or_exam,
    subject_tag,
    language_parity,
    summary,
    body_html,
    pdf_url,
    pdf_size_bytes,
    cover_image_url,
    links_json,
    tags_json: JSON.stringify(tagsArr),
    seo_title,
    seo_description,
    is_featured,
    status
  };
}

export async function createStudyItem(env, body = {}, actor) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const data = validateStudyItemInput(body, null);
  const folder_path = await resolveFolderPath(env.DB, data.domain_slug, data.folder_id);

  const dup = await env.DB.prepare(`SELECT id FROM study_library_items WHERE slug = ? LIMIT 1`).bind(data.slug).first();
  if (dup) throw new HttpError(409, 'SLUG_CONFLICT', `Resource slug "${data.slug}" already exists`);

  const id = `sli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';

  await env.DB.prepare(
    `INSERT INTO study_library_items (
       id, domain_slug, folder_id, folder_path, title, slug, resource_type,
       board_or_exam, subject_tag, language_parity, summary, body_html,
       pdf_url, pdf_size_bytes, cover_image_url, links_json, tags_json,
       seo_title, seo_description, is_featured, status,
       created_by, updated_by, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, data.domain_slug, data.folder_id, folder_path, data.title, data.slug, data.resource_type,
    data.board_or_exam, data.subject_tag, data.language_parity, data.summary, data.body_html,
    data.pdf_url, data.pdf_size_bytes, data.cover_image_url, data.links_json, data.tags_json,
    data.seo_title, data.seo_description, data.is_featured, data.status,
    actorEmail, actorEmail, nowIso, nowIso
  ).run();

  const row = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  return { ok: true, item: normalizeStudyItem(row) };
}

export async function updateStudyItem(env, id, body = {}, actor) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Study resource "${id}" not found`);

  const data = validateStudyItemInput(body, existing);
  const folder_path = await resolveFolderPath(env.DB, data.domain_slug, data.folder_id);

  if (data.slug !== existing.slug) {
    const dup = await env.DB.prepare(`SELECT id FROM study_library_items WHERE slug = ? AND id != ? LIMIT 1`).bind(data.slug, id).first();
    if (dup) throw new HttpError(409, 'SLUG_CONFLICT', `Resource slug "${data.slug}" already exists`);
  }

  const verRow = await env.DB.prepare(`SELECT COALESCE(MAX(version_no), 0) AS max_v FROM study_library_revisions WHERE item_id = ?`).bind(id).first();
  const nextVer = Number((verRow && verRow.max_v) || 0) + 1;
  const revId = `slr_${Date.now().toString(36)}_${nextVer}`;
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';

  await env.DB.prepare(
    `INSERT INTO study_library_revisions (id, item_id, version_no, title, slug, snapshot_json, edited_by, change_note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, id, nextVer, existing.title, existing.slug, JSON.stringify(existing), actorEmail, cleanStr(body.change_note, 120) || 'study_edit', nowIso).run();

  await env.DB.prepare(
    `UPDATE study_library_items SET
       domain_slug = ?, folder_id = ?, folder_path = ?, title = ?, slug = ?, resource_type = ?,
       board_or_exam = ?, subject_tag = ?, language_parity = ?, summary = ?, body_html = ?,
       pdf_url = ?, pdf_size_bytes = ?, cover_image_url = ?, links_json = ?, tags_json = ?,
       seo_title = ?, seo_description = ?, is_featured = ?, status = ?,
       updated_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    data.domain_slug, data.folder_id, folder_path, data.title, data.slug, data.resource_type,
    data.board_or_exam, data.subject_tag, data.language_parity, data.summary, data.body_html,
    data.pdf_url, data.pdf_size_bytes, data.cover_image_url, data.links_json, data.tags_json,
    data.seo_title, data.seo_description, data.is_featured, data.status,
    actorEmail, nowIso, id
  ).run();

  const row = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  return { ok: true, revision: { id: revId, version_no: nextVer }, item: normalizeStudyItem(row) };
}

export async function updateStudyItemStatus(env, id, body = {}, actor) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Study resource "${id}" not found`);
  const nextStatus = String(body.status || '').trim().toLowerCase();
  if (!STUDY_STATUSES.includes(nextStatus)) {
    throw validationError({ status: `status must be one of: ${STUDY_STATUSES.join(', ')}` });
  }
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  await env.DB.prepare(`UPDATE study_library_items SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
    .bind(nextStatus, actorEmail, nowIso, id).run();
  const row = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  return { ok: true, item: normalizeStudyItem(row) };
}

export async function deleteStudyItem(env, id) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT id FROM study_library_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Study resource "${id}" not found`);
  await env.DB.prepare(`DELETE FROM study_library_items WHERE id = ?`).bind(id).run();
  return { ok: true, deleted_id: id };
}

export async function verifyStudyItem(env, id, actor) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Study resource "${id}" not found`);
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  await env.DB.prepare(
    `UPDATE study_library_items SET verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`
  ).bind(nowIso, actorEmail, nowIso, id).run();
  const row = await env.DB.prepare(`SELECT * FROM study_library_items WHERE id = ?`).bind(id).first();
  return { ok: true, item: normalizeStudyItem(row) };
}

export async function listStudySuggestions(env, { domain = '', status = 'all', limit = 50 } = {}) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const where = [];
  const binds = [];
  const dom = cleanStr(domain, 60);
  if (dom && STUDY_DOMAINS.includes(dom)) {
    where.push('domain_slug = ?');
    binds.push(dom);
  }
  const st = cleanStr(status, 20).toLowerCase();
  if (st && st !== 'all' && ['pending', 'approved', 'dismissed'].includes(st)) {
    where.push('status = ?');
    binds.push(st);
  }
  const lim = Math.max(1, Math.min(200, Number(limit) || 50));
  const sql = `SELECT * FROM study_library_suggestions${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`;
  const rows = (await env.DB.prepare(sql).bind(...binds, lim).all()).results || [];
  return { ok: true, suggestions: rows };
}

export async function updateStudySuggestion(env, id, body = {}, actor) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const existing = await env.DB.prepare(`SELECT * FROM study_library_suggestions WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', `Suggestion "${id}" not found`);
  const nextStatus = cleanStr(body.status, 20).toLowerCase();
  if (!['pending', 'approved', 'dismissed'].includes(nextStatus)) {
    throw validationError({ status: 'status must be pending, approved, or dismissed' });
  }
  const nowIso = new Date().toISOString();
  const actorEmail = (actor && (actor.email || actor.userId)) || 'admin';
  await env.DB.prepare(
    `UPDATE study_library_suggestions SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`
  ).bind(nextStatus, actorEmail, nowIso, id).run();
  const updated = await env.DB.prepare(`SELECT * FROM study_library_suggestions WHERE id = ?`).bind(id).first();
  return { ok: true, suggestion: updated };
}

export async function handleStudyLibraryStudio(request, env, actor, subResource, id, action) {
  const method = request.method;

  if (subResource === 'tree' && method === 'GET') {
    const u = new URL(request.url);
    return json(await getStudyTree(env, {
      domain: u.searchParams.get('domain') || '',
      parent_id: u.searchParams.get('parent_id') || ''
    }), 200, { 'Cache-Control': 'no-store' });
  }

  if (subResource === 'folders') {
    if (!id && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can create sub-directories');
      }
      const body = await readJson(request, 8192).catch(() => ({}));
      const res = await createStudyFolder(env, body, actor);
      await audit(env, request, actor, 'study.folder.save', 'study_library_folders', res.folder.id, {
        domain_slug: res.folder.domain_slug,
        depth: res.folder.depth,
        name: res.folder.name
      });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'PUT') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can update sub-directories');
      }
      const body = await readJson(request, 16384).catch(() => ({}));
      const res = await updateStudyFolder(env, id, body);
      await audit(env, request, actor, 'study.folder.save', 'study_library_folders', id, { name: res.folder.name, is_active: res.folder.is_active });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'DELETE') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can delete sub-directories');
      }
      const u = new URL(request.url);
      const reassignTo = u.searchParams.get('reassign_to') || '';
      const res = await deleteStudyFolder(env, id, reassignTo);
      await audit(env, request, actor, 'study.folder.delete', 'study_library_folders', id, { reassigned_to: res.reassigned_to });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (subResource === 'items') {
    if (!id && method === 'GET') {
      const u = new URL(request.url);
      return json(await listStudyItems(env, {
        domain: u.searchParams.get('domain') || '',
        folder_id: u.searchParams.get('folder_id') || '',
        include_descendants: u.searchParams.get('include_descendants') || '0',
        resource_type: u.searchParams.get('resource_type') || 'all',
        status: u.searchParams.get('status') || 'all',
        q: u.searchParams.get('q') || '',
        limit: u.searchParams.get('limit') || 25,
        offset: u.searchParams.get('offset') || 0
      }), 200, { 'Cache-Control': 'no-store' });
    }
    if (!id && method === 'POST') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can create study resources');
      }
      const body = await readJson(request, 65536).catch(() => ({}));
      const res = await createStudyItem(env, body, actor);
      await audit(env, request, actor, 'study.item.create', 'study_library_items', res.item.id, {
        domain_slug: res.item.domain_slug,
        folder_id: res.item.folder_id
      });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'PUT') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can update study resources');
      }
      const body = await readJson(request, 65536).catch(() => ({}));
      const res = await updateStudyItem(env, id, body, actor);
      await audit(env, request, actor, 'study.item.update', 'study_library_items', id, {
        revision_version: res.revision.version_no
      });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && action === 'status' && (method === 'PATCH' || method === 'PUT')) {
      if (actor.role !== 'admin' && actor.role !== 'editor' && actor.role !== 'reviewer') {
        throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions to update study resource status');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await updateStudyItemStatus(env, id, body, actor);
      await audit(env, request, actor, 'study.item.status', 'study_library_items', id, { status: res.item.status });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && action === 'verify' && (method === 'POST' || method === 'PATCH')) {
      if (actor.role !== 'admin' && actor.role !== 'editor' && actor.role !== 'reviewer') {
        throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions to verify study resource');
      }
      const res = await verifyStudyItem(env, id, actor);
      await audit(env, request, actor, 'study.item.verify', 'study_library_items', id, { verified_at: res.item.verified_at });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (id && !action && method === 'DELETE') {
      if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Only editors and administrators can delete study resources');
      }
      const res = await deleteStudyItem(env, id);
      await audit(env, request, actor, 'study.item.delete', 'study_library_items', id, { deleted: true });
      await purgeStudyLibraryEdgeCache(request);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (subResource === 'suggestions') {
    if (!id && method === 'GET') {
      const u = new URL(request.url);
      return json(await listStudySuggestions(env, {
        domain: u.searchParams.get('domain') || '',
        status: u.searchParams.get('status') || 'all',
        limit: u.searchParams.get('limit') || 50
      }), 200, { 'Cache-Control': 'no-store' });
    }
    if (id && (method === 'PATCH' || method === 'PUT')) {
      if (actor.role !== 'admin' && actor.role !== 'editor' && actor.role !== 'reviewer') {
        throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions to moderate suggestions');
      }
      const body = await readJson(request, 4096).catch(() => ({}));
      const res = await updateStudySuggestion(env, id, body, actor);
      await audit(env, request, actor, 'study.suggestion.moderate', 'study_library_suggestions', id, { status: res.suggestion.status });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown study-library resource');
}

export async function resolvePublicStudyDirectory(env, segments = [], opts = {}) {
  await ensureStudyLibraryStudioSchema(env.DB);
  if (!segments.length) return null;

  const first = cleanStr(segments[0], 100).toLowerCase();
  const domainSlug = GROUP_SLUG_TO_DOMAIN[first] || (STUDY_DOMAINS.includes(first) ? first : '');
  if (!domainSlug) return null;

  const rawFolders = (await env.DB.prepare(
    `SELECT * FROM study_library_folders WHERE domain_slug = ? AND is_active = 1 ORDER BY depth ASC, sort_order ASC, name ASC`
  ).bind(domainSlug).all()).results || [];
  // Filter out folders whose ancestor was hidden (is_active = 0)
  const activeIds = new Set(rawFolders.map(f => f.id));
  const allFolders = [];
  for (const f of rawFolders) {
    if (!f.parent_id || activeIds.has(f.parent_id)) {
      allFolders.push(f);
    } else {
      activeIds.delete(f.id);
    }
  }

  const countsRes = await env.DB.prepare(
    `SELECT COALESCE(folder_id, '') AS fid, COUNT(*) AS n FROM study_library_items WHERE domain_slug = ? AND status = 'published' GROUP BY fid`
  ).bind(domainSlug).all();
  const directCounts = new Map();
  for (const r of (countsRes.results || [])) {
    if (r.fid) directCounts.set(r.fid, Number(r.n || 0));
  }

  const { byId, childrenByParent, flatOrdered, computePath } = buildFolderAnalytics(allFolders, directCounts);

  // Walk segments[1..] to find target folder; if segments.length === 1 and a single depth-1 root matches the group slug, use domain root or that group folder
  let activeFolder = null;
  let walkSegs = segments.slice(1);

  // If first segment matches a depth-1 folder slug directly (e.g. from 1,681-node group), check if children live under it
  const rootMatches = (childrenByParent.get('__ROOT__') || [])
    .map(id => byId.get(id))
    .filter(f => f && (f.slug === first || f.node_slug === first));
  if (rootMatches.length === 1 && walkSegs.length > 0) {
    const candidateKids = childrenByParent.get(rootMatches[0].id) || [];
    const nextSeg = cleanStr(walkSegs[0], 100).toLowerCase();
    const hasUnderRoot = candidateKids.some(kidId => {
      const k = byId.get(kidId);
      return k && (k.slug === nextSeg || k.node_slug === nextSeg);
    });
    if (hasUnderRoot) activeFolder = rootMatches[0];
  }

  for (const rawSeg of walkSegs) {
    const seg = cleanStr(rawSeg, 100).toLowerCase();
    if (!seg) continue;
    const parentKey = activeFolder ? activeFolder.id : '__ROOT__';
    const kids = (childrenByParent.get(parentKey) || []).map(id => byId.get(id)).filter(Boolean);
    let match = kids.find(k => k.slug === seg || k.node_slug === seg);
    if (!match && !activeFolder) {
      match = flatOrdered.find(k => k.slug === seg || k.node_slug === seg);
    }
    if (!match) return null;
    activeFolder = match;
  }

  // If still at domain root and a bridged depth-1 group wrapper matches the track slug, expose it as the active folder
  let childParentKey = activeFolder ? activeFolder.id : '__ROOT__';
  if (!activeFolder && rootMatches.length >= 1) {
    activeFolder = rootMatches[0];
    childParentKey = activeFolder.id;
  }

  const withSlugPath = (f) => {
    if (!f) return null;
    const chain = computePath(f.id);
    const firstSlug = chain[0] ? String(chain[0].slug || '').toLowerCase() : '';
    const hasTrackRoot = Boolean(GROUP_SLUG_TO_DOMAIN[firstSlug] || STUDY_DOMAINS.includes(firstSlug));
    const segs = hasTrackRoot ? chain.map(x => x.slug) : [first, ...chain.map(x => x.slug)];
    return { ...f, slug_path: segs.filter(Boolean).join('/') };
  };

  const children = (childrenByParent.get(childParentKey) || [])
    .map(id => byId.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
    .map(withSlugPath);

  const parentFolder = activeFolder && activeFolder.parent_id ? withSlugPath(byId.get(activeFolder.parent_id)) : null;
  const siblingParentKey = activeFolder && activeFolder.parent_id ? activeFolder.parent_id : '__ROOT__';
  const siblingFolders = (childrenByParent.get(siblingParentKey) || [])
    .map(id => byId.get(id))
    .filter(f => f && (!activeFolder || f.id !== activeFolder.id))
    .map(withSlugPath);

  const breadcrumb = activeFolder ? computePath(activeFolder.id).map(withSlugPath) : [{
    id: domainSlug,
    name: DOMAIN_LABELS[domainSlug] || domainSlug,
    slug: first,
    slug_path: first,
  }];

  const includeDesc = opts.includeDescendants !== false;
  const where = ['domain_slug = ?', "status = 'published'"];
  const binds = [domainSlug];
  let descendantIdSet = null;
  if (activeFolder) {
    if (includeDesc) {
      if (activeFolder.depth > 1) {
        descendantIdSet = new Set(getDescendantIds(childrenByParent, activeFolder.id));
      }
    } else {
      where.push('folder_id = ?');
      binds.push(activeFolder.id);
    }
  }
  if (opts.resourceType && opts.resourceType !== 'all' && STUDY_RESOURCE_TYPES.includes(opts.resourceType)) {
    where.push('resource_type = ?');
    binds.push(opts.resourceType);
  }
  if (opts.lang && opts.lang !== 'all' && STUDY_LANGUAGES.includes(opts.lang)) {
    where.push('language_parity = ?');
    binds.push(opts.lang);
  }

  let rows = (await env.DB.prepare(
    `SELECT * FROM study_library_items WHERE ${where.join(' AND ')} ORDER BY is_featured DESC, updated_at DESC, created_at DESC LIMIT 200`
  ).bind(...binds).all()).results || [];
  if (descendantIdSet) {
    rows = rows.filter(r => r.folder_id && descendantIdSet.has(r.folder_id));
  }
  rows = rows.slice(0, 60);

  const effectiveFolder = activeFolder ? withSlugPath(activeFolder) : {
    id: domainSlug,
    domain_slug: domainSlug,
    parent_id: null,
    depth: 1,
    name: DOMAIN_LABELS[domainSlug] || domainSlug,
    title_or: '',
    slug: first,
    node_slug: first,
    slug_path: first,
    description: `Structured curriculum directory for ${DOMAIN_LABELS[domainSlug] || domainSlug}.`,
    direct_item_count: 0,
    total_item_count: rows.length,
    child_count: children.length,
    full_path: DOMAIN_LABELS[domainSlug] || domainSlug,
  };

  return {
    domain_slug: domainSlug,
    domain_title: DOMAIN_LABELS[domainSlug] || domainSlug,
    track_slug: first,
    folder: effectiveFolder,
    breadcrumb,
    children,
    parentFolder,
    siblingFolders: siblingFolders.slice(0, 12),
    items: rows.map(normalizeStudyItem),
    total_folders: allFolders.length
  };
}

export async function resolvePublicStudyItem(env, slugOrId) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const key = cleanStr(slugOrId, 120);
  if (!key) return null;
  const row = await env.DB.prepare(
    `SELECT * FROM study_library_items WHERE (slug = ? OR id = ?) AND status = 'published' LIMIT 1`
  ).bind(key, key).first();
  if (!row) return null;
  const item = normalizeStudyItem(row);
  const relatedRows = (await env.DB.prepare(
    `SELECT * FROM study_library_items WHERE domain_slug = ? AND id != ? AND status = 'published' ORDER BY updated_at DESC LIMIT 6`
  ).bind(item.domain_slug, item.id).all()).results || [];
  return {
    item,
    domain_title: DOMAIN_LABELS[item.domain_slug] || item.domain_slug,
    related: relatedRows.map(normalizeStudyItem)
  };
}

export async function handlePublicStudyItemsApi(request, env) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const u = new URL(request.url);
  const domain = cleanStr(u.searchParams.get('domain') || '', 60);
  const rType = cleanStr(u.searchParams.get('type') || '', 30).toLowerCase();
  const lang = cleanStr(u.searchParams.get('lang') || '', 12).toUpperCase();
  const q = cleanStr(u.searchParams.get('q') || '', 80);
  const limit = Math.max(1, Math.min(100, Number(u.searchParams.get('limit') || 50)));

  const where = ["status = 'published'"];
  const binds = [];
  if (domain && STUDY_DOMAINS.includes(domain)) {
    where.push('domain_slug = ?');
    binds.push(domain);
  }
  if (rType && STUDY_RESOURCE_TYPES.includes(rType)) {
    where.push('resource_type = ?');
    binds.push(rType);
  }
  if (lang && STUDY_LANGUAGES.includes(lang)) {
    where.push('language_parity = ?');
    binds.push(lang);
  }
  if (q) {
    const pat = `%${likeEscape(q)}%`;
    where.push("(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR board_or_exam LIKE ? ESCAPE '\\')");
    binds.push(pat, pat, pat);
  }

  const rows = (await env.DB.prepare(
    `SELECT * FROM study_library_items WHERE ${where.join(' AND ')} ORDER BY is_featured DESC, updated_at DESC, created_at DESC LIMIT ?`
  ).bind(...binds, limit).all()).results || [];

  return json({
    ok: true,
    items: rows.map(normalizeStudyItem),
    total: rows.length
  }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=120' });
}

export async function handlePublicStudySuggestApi(request, env) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const body = await readJson(request, 8192).catch(() => ({}));
  const suggestionType = ['topic', 'correction'].includes(String(body.suggestion_type || '').toLowerCase())
    ? String(body.suggestion_type).toLowerCase()
    : 'topic';
  const rawDomain = cleanStr(body.domain_slug || '', 60);
  const domain_slug = STUDY_DOMAINS.includes(rawDomain) ? rawDomain : 'odisha-study-hub';
  const folder_id = cleanStr(body.folder_id || '', 80);
  const item_slug = cleanStr(body.item_slug || '', 120);
  const title = redactPii(cleanStr(body.title || '', 160, { required: true }));
  if (!title || title.length < 4) {
    throw validationError({ title: 'Suggestion title must be at least 4 characters' });
  }
  const details = redactPii(cleanStr(body.details || '', 1200));
  const source_url = body.source_url ? (validateSafeCtaUrl(body.source_url) || '') : '';

  // Lightweight hourly rate cap against study_library_suggestions (max 30/hour global fallback)
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const recentRow = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM study_library_suggestions WHERE created_at >= ?`
  ).bind(oneHourAgo).first();
  if (recentRow && Number(recentRow.cnt || 0) >= 120) {
    throw new HttpError(429, 'RATE_LIMITED', 'Too many suggestions submitted recently. Please try again later.');
  }

  const id = `slsug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO study_library_suggestions (
       id, domain_slug, folder_id, item_slug, suggestion_type, title, details, source_url, status, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, domain_slug, folder_id, item_slug, suggestionType, title, details, source_url, nowIso).run();

  return json({
    ok: true,
    suggestion: { id, domain_slug, suggestion_type: suggestionType, title, status: 'pending', created_at: nowIso }
  }, 201, { 'Cache-Control': 'no-store' });
}

function xmlEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function handleStudyLibrarySitemapXml(request, env) {
  await ensureStudyLibraryStudioSchema(env.DB);
  const origin = 'https://csodisha.com';
  const rawFolders = (await env.DB.prepare(
    `SELECT id, domain_slug, parent_id, slug, updated_at, is_active FROM study_library_folders WHERE is_active = 1 ORDER BY depth ASC, sort_order ASC`
  ).all()).results || [];

  const byId = new Map();
  for (const f of rawFolders) {
    if (!f.parent_id || byId.has(f.parent_id)) {
      byId.set(f.id, f);
    }
  }

  const urls = [{ loc: `${origin}/study-library/`, lastmod: new Date().toISOString().slice(0, 10) }];
  const seenLoc = new Set([urls[0].loc]);

  for (const f of byId.values()) {
    const chain = [];
    let cur = f;
    const guard = new Set();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      chain.unshift(cur);
      cur = cur.parent_id ? byId.get(cur.parent_id) : null;
    }
    const { public_url } = buildFolderPublicPath(chain, f.domain_slug);
    const loc = `${origin}${public_url}`;
    if (!seenLoc.has(loc)) {
      seenLoc.add(loc);
      urls.push({ loc, lastmod: String(f.updated_at || '').slice(0, 10) || undefined });
    }
  }

  const items = (await env.DB.prepare(
    `SELECT id, slug, updated_at FROM study_library_items WHERE status = 'published' ORDER BY updated_at DESC`
  ).all()).results || [];
  for (const it of items) {
    const loc = `${origin}/study-library/item/${encodeURIComponent(it.slug || it.id)}/`;
    if (!seenLoc.has(loc)) {
      seenLoc.add(loc);
      urls.push({ loc, lastmod: String(it.updated_at || '').slice(0, 10) || undefined });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(u => `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${xmlEsc(u.lastmod)}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600'
    }
  });
}
