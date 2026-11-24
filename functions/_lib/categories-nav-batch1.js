// Categories & Navigation Batch 1 (v84): Modules 01-04
// 01 Master Categories | 02 Subcategories | 03 Tags & Taxonomies | 04 Header Navigation
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';

export const NAV_STATUSES = ['draft', 'published', 'archived'];
export const NAV_PORTALS = ['all', 'study-library', 'jobs-careers', 'schemes', 'community', 'about'];
export const TAXONOMY_GROUPS = ['exam_body', 'subject', 'class_stage', 'scheme_type', 'district_odisha', 'general'];
export const MENU_LOCATIONS = ['header', 'mega_menu', 'footer', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_library', 'sidebar_community'];
export const VISIBILITY_RULES = ['all', 'logged_in', 'logged_out'];
export const HIGHLIGHT_STYLES = ['default', 'pill', 'accent'];

const _navReady = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function validateSafeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/') || s.startsWith('#')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

async function saveNavRevision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM nav_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  await db.prepare(
    `INSERT INTO nav_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || '', 200), cleanStr(actorEmail || 'system', 120)).run();
}

const STARTER_CATEGORIES = [
  // 7 Pillar Master Categories
  { id: 'ncat-pillar-01', parent_id: null, slug: 'home-live-updates', code: 'HOM', name_en: 'Home & Live Updates', name_or: 'ମୂଳପୃଷ୍ଠା ଓ ତାଜା ଅପଡେଟ୍', description_en: 'Homepage overview, live recruitment alerts, daily current affairs, and annual exam calendar.', target_portal: 'all', landing_url: '/', icon_key: 'home', sort_order: 1, featured: 1, status: 'published' },
  { id: 'ncat-pillar-02', parent_id: null, slug: 'jobs-recruitment', code: 'JOB', name_en: 'Jobs & Recruitment', name_or: 'ଚାକିରି ଓ ନିଯୁକ୍ତି', description_en: 'Odisha State Govt (OPSC/OSSC/OSSSC/Police), Central Govt, PSUs, and lifecycle tracking.', target_portal: 'jobs-careers', landing_url: '/jobs-careers/', icon_key: 'briefcase', sort_order: 2, featured: 1, status: 'published' },
  { id: 'ncat-pillar-03', parent_id: null, slug: 'study-library-ca', code: 'LIB', name_en: 'Study Library & Current Affairs', name_or: 'ଅଧ୍ୟୟନ ପାଠାଗାର ଓ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', description_en: 'Official syllabi, solved PYQs, bilingual study notes, and daily 5-MCQ capsules.', target_portal: 'study-library', landing_url: '/study-library/', icon_key: 'book', sort_order: 3, featured: 1, status: 'published' },
  { id: 'ncat-pillar-04', parent_id: null, slug: 'mock-tests-practice', code: 'CBT', name_en: 'Mock Tests & Practice', name_or: 'ମକ୍ ଟେଷ୍ଟ ଓ ଅଭ୍ୟାସ', description_en: 'Odisha & Central CBT mock tests, sectional speed drills, and performance analytics.', target_portal: 'study-library', landing_url: '/mock-tests/', icon_key: 'award', sort_order: 4, featured: 1, status: 'published' },
  { id: 'ncat-pillar-05', parent_id: null, slug: 'schemes-scholarships', code: 'SCH', name_en: 'Schemes & Scholarships', name_or: 'ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି', description_en: 'Odisha welfare schemes, Central Govt schemes, post-matric scholarships, and eligibility matcher.', target_portal: 'schemes', landing_url: '/schemes-benefits/', icon_key: 'landmark', sort_order: 5, featured: 1, status: 'published' },
  { id: 'ncat-pillar-06', parent_id: null, slug: 'student-tools-portals', code: 'TLS', name_en: 'Student Tools & Verified Portals', name_or: 'ଛାତ୍ର ଉପକରଣ ଓ ସରକାରୀ ପୋର୍ଟାଲ୍', description_en: 'Age calculator, photo/signature resizer, document checklist, and official .gov.in portals.', target_portal: 'all', landing_url: '/tools/', icon_key: 'wrench', sort_order: 6, featured: 1, status: 'published' },
  { id: 'ncat-pillar-07', parent_id: null, slug: 'community-support', code: 'COM', name_en: 'Community & Support', name_or: 'ସମୁଦାୟ ଓ ସହାୟତା', description_en: 'Student forum, help & FAQs, error reports, resource suggestions, and legal policies.', target_portal: 'community', landing_url: '/community/', icon_key: 'users', sort_order: 7, featured: 1, status: 'published' },

  // 28 Pillar Subcategories (4 per pillar)
  { id: 'nsub-01-01', parent_id: 'ncat-pillar-01', slug: 'homepage-overview', code: 'P1M1', name_en: 'Homepage Overview', name_or: 'ମୂଳପୃଷ୍ଠା ବିବରଣୀ', description_en: 'CS Odisha portal overview and quick discovery.', target_portal: 'all', landing_url: '/', icon_key: 'home', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-01-02', parent_id: 'ncat-pillar-01', slug: 'live-recruitment-alerts', code: 'P1M2', name_en: 'Live Recruitment Alerts', name_or: 'ତାଜା ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି', description_en: 'Latest Odisha and Central recruitment alerts.', target_portal: 'jobs-careers', landing_url: '/jobs/', icon_key: 'bell', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-01-03', parent_id: 'ncat-pillar-01', slug: 'todays-current-affairs', code: 'P1M3', name_en: "Today's Current Affairs", name_or: 'ଆଜିର ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', description_en: 'Daily Odisha and national news briefs.', target_portal: 'study-library', landing_url: '/current-affairs/', icon_key: 'newspaper', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-01-04', parent_id: 'ncat-pillar-01', slug: 'annual-exam-calendar', code: 'P1M4', name_en: 'Annual Exam Calendar', name_or: 'ବାର୍ଷିକ ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର୍', description_en: 'OPSC, OSSC, OSSSC and national exam schedule.', target_portal: 'study-library', landing_url: '/study/examinations/', icon_key: 'calendar', sort_order: 4, featured: 1, status: 'published' },

  { id: 'nsub-02-01', parent_id: 'ncat-pillar-02', slug: 'odisha-state-govt-jobs', code: 'P2M1', name_en: 'Odisha State Govt: OPSC/OSSC/OSSSC/Police', name_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ: OPSC/OSSC/OSSSC/ପୋଲିସ୍', description_en: 'State commissions, police, and district recruitments.', target_portal: 'jobs-careers', landing_url: '/jobs-careers/?track=odisha-govt', icon_key: 'briefcase', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-02-02', parent_id: 'ncat-pillar-02', slug: 'central-govt-jobs', code: 'P2M2', name_en: 'Central Govt: UPSC/SSC/RRB/Banking', name_or: 'କେନ୍ଦ୍ର ସରକାରୀ: UPSC/SSC/RRB/ବ୍ୟାଙ୍କିଂ', description_en: 'All-India civil services, staff selection, railway, and banking jobs.', target_portal: 'jobs-careers', landing_url: '/jobs-careers/?track=central-govt', icon_key: 'landmark', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-02-03', parent_id: 'ncat-pillar-02', slug: 'psus-apprenticeships', code: 'P2M3', name_en: 'PSUs & Apprenticeships', name_or: 'PSU ଓ ଆପ୍ରେଣ୍ଟିସଶିପ୍', description_en: 'NALCO, MCL, SAIL, NTPC, OPGC and NATS/NAPS apprenticeships.', target_portal: 'jobs-careers', landing_url: '/jobs-careers/?track=psu-apprenticeship', icon_key: 'factory', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-02-04', parent_id: 'ncat-pillar-02', slug: 'notification-lifecycle-tracker', code: 'P2M4', name_en: 'Notification Lifecycle Tracker', name_or: 'ବିଜ୍ଞପ୍ତି ସ୍ଥିତି ଟ୍ରାକର୍', description_en: 'Track advertisements, admit cards, answer keys, and final results.', target_portal: 'jobs-careers', landing_url: '/jobs/', icon_key: 'check', sort_order: 4, featured: 1, status: 'published' },

  { id: 'nsub-03-01', parent_id: 'ncat-pillar-03', slug: 'syllabi-exam-patterns', code: 'P3M1', name_en: 'Syllabi & Exam Patterns', name_or: 'ସିଲାବସ୍ ଓ ପରୀକ୍ଷା ପଦ୍ଧତି', description_en: 'Official syllabus PDFs and stage-wise marking patterns.', target_portal: 'study-library', landing_url: '/resources/?kind=syllabus', icon_key: 'file', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-03-02', parent_id: 'ncat-pillar-03', slug: 'solved-pyqs', code: 'P3M2', name_en: 'Solved PYQs', name_or: 'ସମାଧାନ ହୋଇଥିବା PYQ', description_en: 'Previous year question papers with answer keys.', target_portal: 'study-library', landing_url: '/resources/?kind=pyq', icon_key: 'archive', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-03-03', parent_id: 'ncat-pillar-03', slug: 'bilingual-study-notes', code: 'P3M3', name_en: 'Bilingual Study Notes', name_or: 'ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ନୋଟ୍ସ', description_en: 'English & Odia study notes, Odisha GK, and textbooks.', target_portal: 'study-library', landing_url: '/study-library/', icon_key: 'book', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-03-04', parent_id: 'ncat-pillar-03', slug: 'daily-ca-5mcq-capsules', code: 'P3M4', name_en: 'Daily Current Affairs & 5-MCQ Capsules', name_or: 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ଓ 5-MCQ', description_en: 'Daily digest with 5 exam-ready bilingual MCQs.', target_portal: 'study-library', landing_url: '/current-affairs/', icon_key: 'zap', sort_order: 4, featured: 1, status: 'published' },

  { id: 'nsub-04-01', parent_id: 'ncat-pillar-04', slug: 'odisha-govt-mock-tests', code: 'P4M1', name_en: 'Odisha Govt Mock Tests', name_or: 'ଓଡ଼ିଶା ସରକାରୀ ମକ୍ ଟେଷ୍ଟ', description_en: 'Full-length OPSC, OSSC, OSSSC, OTET & Police practice tests.', target_portal: 'study-library', landing_url: '/mock-tests/?track=odisha', icon_key: 'award', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-04-02', parent_id: 'ncat-pillar-04', slug: 'central-govt-cbt-tests', code: 'P4M2', name_en: 'Central Govt CBT Tests', name_or: 'କେନ୍ଦ୍ର ସରକାରୀ CBT ଟେଷ୍ଟ', description_en: 'Timed CBT mock exams for SSC, RRB, Banking & CTET.', target_portal: 'study-library', landing_url: '/study-library/cbt-mock-test/', icon_key: 'monitor', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-04-03', parent_id: 'ncat-pillar-04', slug: 'sectional-speed-drills', code: 'P4M3', name_en: 'Sectional & Speed Drills', name_or: 'ବିଭାଗୀୟ ଓ ସ୍ପିଡ୍ ଡ୍ରିଲ୍', description_en: 'Targeted topic quizzes for Reasoning, Math, Odia & GK.', target_portal: 'study-library', landing_url: '/mock-tests/?mode=sectional', icon_key: 'clock', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-04-04', parent_id: 'ncat-pillar-04', slug: 'scoreboard-analytics', code: 'P4M4', name_en: 'Scoreboard & Analytics', name_or: 'ସ୍କୋରବୋର୍ଡ ଓ ବିଶ୍ଳେଷଣ', description_en: 'Track accuracy, attempt history, and exam readiness.', target_portal: 'study-library', landing_url: '/student-dashboard/', icon_key: 'chart', sort_order: 4, featured: 1, status: 'published' },

  { id: 'nsub-05-01', parent_id: 'ncat-pillar-05', slug: 'odisha-state-welfare-schemes', code: 'P5M1', name_en: 'Odisha State Welfare Schemes', name_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ କଲ୍ୟାଣ ଯୋଜନା', description_en: 'State welfare, agriculture, health, and women empowerment schemes.', target_portal: 'schemes', landing_url: '/schemes-benefits/?scope=odisha', icon_key: 'landmark', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-05-02', parent_id: 'ncat-pillar-05', slug: 'central-govt-schemes', code: 'P5M2', name_en: 'Central Govt Schemes', name_or: 'କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା', description_en: 'Union ministry welfare, education, and livelihood schemes.', target_portal: 'schemes', landing_url: '/schemes-benefits/?scope=central', icon_key: 'globe', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-05-03', parent_id: 'ncat-pillar-05', slug: 'post-matric-merit-scholarships', code: 'P5M3', name_en: 'Post-Matric & Merit Scholarships', name_or: 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ମେଧା ଛାତ୍ରବୃତ୍ତି', description_en: 'Odisha State Scholarship Portal, Gopabandhu & NSP scholarships.', target_portal: 'schemes', landing_url: '/scholarship-guidance/', icon_key: 'graduation', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-05-04', parent_id: 'ncat-pillar-05', slug: 'eligibility-matcher', code: 'P5M4', name_en: 'Eligibility Matcher', name_or: 'ଯୋଗ୍ୟତା ଯାଞ୍ଚ', description_en: 'Interactive scheme and scholarship eligibility finder.', target_portal: 'schemes', landing_url: '/scheme-opportunity-finder/', icon_key: 'filter', sort_order: 4, featured: 1, status: 'published' },

  { id: 'nsub-06-01', parent_id: 'ncat-pillar-06', slug: 'age-eligibility-calculator', code: 'P6M1', name_en: 'Age Eligibility Calculator', name_or: 'ବୟସ ଯୋଗ୍ୟତା କ୍ୟାଲକୁଲେଟର୍', description_en: 'Verify exact age and Odisha category relaxations.', target_portal: 'all', landing_url: '/tools/#age-calculator', icon_key: 'calculator', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-06-02', parent_id: 'ncat-pillar-06', slug: 'photo-signature-resizer', code: 'P6M2', name_en: 'Photo & Signature Resizer', name_or: 'ଫଟୋ ଓ ଦସ୍ତଖତ ରିସାଇଜର୍', description_en: 'Offline browser photo and signature resizer for exam portals.', target_portal: 'all', landing_url: '/tools/#photo-resizer', icon_key: 'image', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-06-03', parent_id: 'ncat-pillar-06', slug: 'document-readiness-checklist', code: 'P6M3', name_en: 'Document Readiness Checklist', name_or: 'ଡକ୍ୟୁମେଣ୍ଟ୍ ପ୍ରସ୍ତୁତି ତାଲିକା', description_en: 'Mandatory Odisha certificates and OTR readiness tracker.', target_portal: 'all', landing_url: '/tools/#doc-readiness-card', icon_key: 'clipboard', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-06-04', parent_id: 'ncat-pillar-06', slug: 'official-gov-portals-directory', code: 'P6M4', name_en: 'Official .gov.in Portals Directory', name_or: 'ଅଫିସିଆଲ୍ .gov.in ପୋର୍ଟାଲ୍', description_en: 'Verified government URLs and anti-scam link checker.', target_portal: 'all', landing_url: '/tools/#scam-checker', icon_key: 'shield', sort_order: 4, featured: 1, status: 'published' },

  { id: 'nsub-07-01', parent_id: 'ncat-pillar-07', slug: 'student-discussion-forum', code: 'P7M1', name_en: 'Student Discussion Forum', name_or: 'ଛାତ୍ର ଆଲୋଚନା ମଞ୍ଚ', description_en: 'Peer Q&A, exam circles, and district study communities.', target_portal: 'community', landing_url: '/community/', icon_key: 'users', sort_order: 1, featured: 1, status: 'published' },
  { id: 'nsub-07-02', parent_id: 'ncat-pillar-07', slug: 'help-and-faqs', code: 'P7M2', name_en: 'Help & FAQs', name_or: 'ସହାୟତା ଓ ସାଧାରଣ ପ୍ରଶ୍ନ', description_en: 'Getting started guides and frequently asked questions.', target_portal: 'community', landing_url: '/support/#faqs', icon_key: 'help', sort_order: 2, featured: 1, status: 'published' },
  { id: 'nsub-07-03', parent_id: 'ncat-pillar-07', slug: 'report-error-suggest-resource', code: 'P7M3', name_en: 'Report an Error / Suggest Resource', name_or: 'ତ୍ରୁଟି ଜଣାନ୍ତୁ / ସମ୍ବଳ ପ୍ରସ୍ତାବ', description_en: 'Report outdated notices or suggest verified resources.', target_portal: 'community', landing_url: '/support/#report-error', icon_key: 'flag', sort_order: 3, featured: 1, status: 'published' },
  { id: 'nsub-07-04', parent_id: 'ncat-pillar-07', slug: 'about-legal-policies', code: 'P7M4', name_en: 'About & Legal Policies', name_or: 'ଆମ ବିଷୟରେ ଓ ଆଇନଗତ ନୀତି', description_en: 'About CS Odisha, editorial standards, privacy, and terms.', target_portal: 'about', landing_url: '/about/', icon_key: 'info', sort_order: 4, featured: 1, status: 'published' }
];

const STARTER_TAGS = [
  { id: 'ntag-opsc', slug: 'opsc', canonical_tag: 'opsc', label_en: 'OPSC', label_or: 'OPSC', taxonomy_group: 'exam_body', synonyms_json: JSON.stringify(['opsc-oas', 'odisha-public-service']), usage_count: 24, featured: 1, status: 'published' },
  { id: 'ntag-ossc', slug: 'ossc', canonical_tag: 'ossc', label_en: 'OSSC', label_or: 'OSSC', taxonomy_group: 'exam_body', synonyms_json: JSON.stringify(['ossc-cgl']), usage_count: 19, featured: 1, status: 'published' },
  { id: 'ntag-odisha-gk', slug: 'odisha-gk', canonical_tag: 'odisha-gk', label_en: 'Odisha GK', label_or: 'ଓଡ଼ିଶା GK', taxonomy_group: 'subject', synonyms_json: JSON.stringify(['odisha-general-knowledge']), usage_count: 32, featured: 1, status: 'published' },
  { id: 'ntag-khordha', slug: 'khordha', canonical_tag: 'khordha', label_en: 'Khordha', label_or: 'ଖୋର୍ଦ୍ଧା', taxonomy_group: 'district_odisha', synonyms_json: JSON.stringify(['khurda']), usage_count: 11, featured: 0, status: 'published' }
];

const STARTER_HEADER_ITEMS = [
  { id: 'nmenu-pillar-01', menu_location: 'header', label_en: 'Home', label_or: 'ମୂଳପୃଷ୍ଠା', url: '/', icon_key: '🏠', badge_text_en: '', highlight_style: 'default', sort_order: 1, status: 'published' },
  { id: 'nmenu-pillar-02', menu_location: 'header', label_en: 'Jobs', label_or: 'ଚାକିରି', url: '/jobs-careers/', icon_key: '💼', badge_text_en: 'LIVE', highlight_style: 'pill', sort_order: 2, status: 'published' },
  { id: 'nmenu-pillar-03', menu_location: 'header', label_en: 'Study Library', label_or: 'ପାଠାଗାର', url: '/study-library/', icon_key: '📖', badge_text_en: '', highlight_style: 'default', sort_order: 3, status: 'published' },
  { id: 'nmenu-pillar-04', menu_location: 'header', label_en: 'Mock Tests', label_or: 'ମକ୍ ଟେଷ୍ଟ', url: '/mock-tests/', icon_key: '📝', badge_text_en: '', highlight_style: 'default', sort_order: 4, status: 'published' },
  { id: 'nmenu-pillar-05', menu_location: 'header', label_en: 'Schemes', label_or: 'ଯୋଜନା', url: '/schemes-benefits/', icon_key: '🏛', badge_text_en: '', highlight_style: 'default', sort_order: 5, status: 'published' },
  { id: 'nmenu-pillar-06', menu_location: 'header', label_en: 'Tools', label_or: 'ଉପକରଣ', url: '/tools/', icon_key: '🧰', badge_text_en: '', highlight_style: 'default', sort_order: 6, status: 'published' },
  { id: 'nmenu-pillar-07', menu_location: 'header', label_en: 'Community', label_or: 'ସମୁଦାୟ', url: '/community/', icon_key: '👥', badge_text_en: '', highlight_style: 'default', sort_order: 7, status: 'published' }
];

export const CANONICAL_HEADER_ORDER = ['home', 'jobs-careers', 'study-library', 'mock-tests', 'schemes-benefits', 'tools', 'community'];

export function canonicalHeaderRank(item) {
  const raw = String((item && item.url) || '').replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
  if (!raw || raw === 'index.html') return 0;
  const slug = raw === 'schemes' ? 'schemes-benefits'
    : (raw === 'jobs' ? 'jobs-careers'
      : ((raw === 'current-affairs' || raw === 'resources' || raw === 'study') ? 'study-library'
        : ((raw === 'support' || raw === 'about') ? 'community' : raw)));
  const idx = CANONICAL_HEADER_ORDER.indexOf(slug);
  return idx >= 0 ? idx : 100 + Number((item && item.sort_order) || 0);
}

export function sortCanonicalHeaderItems(items) {
  return [...(items || [])].sort((a, b) => canonicalHeaderRank(a) - canonicalHeaderRank(b));
}

export async function ensureCategoriesNavBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_navReady.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS nav_categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL DEFAULT '',
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      icon_key TEXT NOT NULL DEFAULT 'folder',
      color_token TEXT NOT NULL DEFAULT 'teal',
      target_portal TEXT NOT NULL DEFAULT 'all' CHECK (target_portal IN (
        'all', 'study-library', 'jobs-careers', 'schemes', 'community', 'about'
      )),
      landing_url TEXT NOT NULL DEFAULT '',
      seo_title_en TEXT NOT NULL DEFAULT '',
      seo_title_or TEXT NOT NULL DEFAULT '',
      item_count_cached INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 10,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_cat_parent_status ON nav_categories(parent_id, status, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_nav_cat_portal ON nav_categories(target_portal, status)`,
    `CREATE TABLE IF NOT EXISTS nav_tags (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      canonical_tag TEXT NOT NULL UNIQUE,
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      taxonomy_group TEXT NOT NULL DEFAULT 'general' CHECK (taxonomy_group IN (
        'exam_body', 'subject', 'class_stage', 'scheme_type', 'district_odisha', 'general'
      )),
      synonyms_json TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_tags_group_status ON nav_tags(taxonomy_group, status, usage_count DESC)`,
    `CREATE TABLE IF NOT EXISTS nav_menu_items (
      id TEXT PRIMARY KEY,
      menu_location TEXT NOT NULL DEFAULT 'header' CHECK (menu_location IN (
        'header', 'mega_menu', 'footer', 'sidebar_jobs', 'sidebar_schemes', 'sidebar_library', 'sidebar_community'
      )),
      parent_item_id TEXT,
      column_group TEXT NOT NULL DEFAULT '',
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      icon_key TEXT NOT NULL DEFAULT '',
      badge_text_en TEXT NOT NULL DEFAULT '',
      badge_text_or TEXT NOT NULL DEFAULT '',
      open_new_tab INTEGER NOT NULL DEFAULT 0,
      visibility_rule TEXT NOT NULL DEFAULT 'all' CHECK (visibility_rule IN ('all', 'logged_in', 'logged_out')),
      highlight_style TEXT NOT NULL DEFAULT 'default' CHECK (highlight_style IN ('default', 'pill', 'accent')),
      sort_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_menu_loc_status ON nav_menu_items(menu_location, status, sort_order)`,
    `CREATE TABLE IF NOT EXISTS nav_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nav_rev_entity ON nav_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  const catCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_categories`).first();
  if (!catCnt || Number(catCnt.n || 0) === 0) {
    for (const c of STARTER_CATEGORIES) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, target_portal, landing_url, icon_key, sort_order, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(c.id, c.parent_id, c.slug, c.code, c.name_en, c.name_or, c.description_en, c.target_portal, c.landing_url, c.icon_key, c.sort_order, c.featured, c.status).run();
    }
  }

  const tagCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_tags`).first();
  if (!tagCnt || Number(tagCnt.n || 0) === 0) {
    for (const t of STARTER_TAGS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_tags (id, slug, canonical_tag, label_en, label_or, taxonomy_group, synonyms_json, usage_count, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(t.id, t.slug, t.canonical_tag, t.label_en, t.label_or, t.taxonomy_group, t.synonyms_json, t.usage_count, t.featured, t.status).run();
    }
  }

  const menuCnt = await db.prepare(`SELECT COUNT(*) AS n FROM nav_menu_items`).first();
  if (!menuCnt || Number(menuCnt.n || 0) === 0) {
    for (const m of STARTER_HEADER_ITEMS) {
      await db.prepare(
        `INSERT OR IGNORE INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, highlight_style, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(m.id, m.menu_location, m.label_en, m.label_or, m.url, m.icon_key, m.badge_text_en, m.highlight_style, m.sort_order, m.status).run();
    }
  }

  _navReady.add(db);
}

export async function getCategoriesNavOverview(env) {
  await ensureCategoriesNavBatch1Schema(env.DB);
  const [cats, tags, hdr] = await Promise.all([
    env.DB.prepare(`SELECT parent_id, name_or FROM nav_categories`).all(),
    env.DB.prepare(`SELECT label_or FROM nav_tags`).all(),
    env.DB.prepare(`SELECT label_or FROM nav_menu_items WHERE menu_location = 'header'`).all()
  ]);
  const cRows = cats.results || [];
  const tRows = tags.results || [];
  const hRows = hdr.results || [];
  const total = cRows.length + tRows.length + hRows.length;
  const bi = cRows.filter(r => r.name_or).length + tRows.filter(r => r.label_or).length + hRows.filter(r => r.label_or).length;

  return {
    master_categories: cRows.filter(r => !r.parent_id).length,
    subcategories: cRows.filter(r => Boolean(r.parent_id)).length,
    canonical_tags: tRows.length,
    header_links: hRows.length,
    bilingual_pct: total ? Math.round((bi / total) * 100) : 100
  };
}

// ---------- Modules 01 & 02: Master Categories & Subcategories ----------
function formatCat(row) {
  if (!row) return null;
  return { ...row, featured: Boolean(row.featured) };
}

async function handleCategories(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const level = url.searchParams.get('level') || '';
      const parentId = url.searchParams.get('parent_id') || '';
      const portal = url.searchParams.get('target_portal') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (level === 'master') where.push('parent_id IS NULL');
      else if (level === 'sub') where.push('parent_id IS NOT NULL');
      if (parentId) { where.push('parent_id = ?'); binds.push(parentId); }
      if (portal && NAV_PORTALS.includes(portal)) { where.push('target_portal = ?'); binds.push(portal); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(name_en LIKE ? ESCAPE '\\' OR name_or LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\')`); binds.push(l, l, l); }

      const { results } = await env.DB.prepare(`SELECT * FROM nav_categories WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const countSql = level === 'master' ? `SELECT status FROM nav_categories WHERE parent_id IS NULL`
        : level === 'sub' ? `SELECT status FROM nav_categories WHERE parent_id IS NOT NULL`
          : `SELECT status FROM nav_categories`;
      const { results: allRows } = await env.DB.prepare(countSql).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }

      const { results: masters } = await env.DB.prepare(`SELECT id, name_en, slug FROM nav_categories WHERE parent_id IS NULL ORDER BY sort_order ASC`).all();
      return json({ ok: true, items: (results || []).map(formatCat), counts, masters: masters || [] });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_categories SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      if (body.action === 'reorder' && Array.isArray(body.ordered_ids)) {
        for (let i = 0; i < body.ordered_ids.length; i++) {
          await env.DB.prepare(`UPDATE nav_categories SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i + 1, body.ordered_ids[i]).run();
        }
        return json({ ok: true, reordered: body.ordered_ids.length });
      }
      const name_en = cleanStr(body.name_en || '', 160);
      if (!name_en) throw validationError({ name_en: 'name_en is required' });
      const parent_id = body.parent_id ? cleanStr(body.parent_id, 100) : null;
      const portal = NAV_PORTALS.includes(body.target_portal) ? body.target_portal : 'all';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || name_en).slice(0, 90) || 'category';
      const dup = await env.DB.prepare(`SELECT id FROM nav_categories WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `${parent_id ? 'nsub' : 'ncat'}-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, description_or, icon_key, color_token, target_portal, landing_url, seo_title_en, seo_title_or, sort_order, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, parent_id, finalSlug, cleanStr(body.code || '', 24).toUpperCase(), name_en, cleanStr(body.name_or || '', 160),
        cleanStr(body.description_en || '', 500), cleanStr(body.description_or || '', 500),
        cleanStr(body.icon_key || 'folder', 40), cleanStr(body.color_token || 'teal', 30), portal,
        validateSafeUrl(body.landing_url || ''), cleanStr(body.seo_title_en || '', 160), cleanStr(body.seo_title_or || '', 160),
        Number(body.sort_order ?? 10), body.featured ? 1 : 0, status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, parent_id ? '02' : '01', newId, created, 'Created category', actor.email);
      await audit(env, request, actor, 'nav.category.create', 'nav_categories', newId);
      return json({ ok: true, item: formatCat(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Category not found');
  const modCode = existing.parent_id ? '02' : '01';

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = ? AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(modCode, id).all();
    return json({ ok: true, item: formatCat(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const portal = NAV_PORTALS.includes(body.target_portal) ? body.target_portal : existing.target_portal;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    const parentId = body.parent_id !== undefined ? (body.parent_id || null) : existing.parent_id;
    await env.DB.prepare(
      `UPDATE nav_categories SET parent_id = ?, code = ?, name_en = ?, name_or = ?, description_en = ?, description_or = ?, icon_key = ?, color_token = ?, target_portal = ?, landing_url = ?, seo_title_en = ?, seo_title_or = ?, sort_order = ?, featured = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      parentId, cleanStr(body.code ?? existing.code, 24).toUpperCase(),
      cleanStr(body.name_en ?? existing.name_en, 160), cleanStr(body.name_or ?? existing.name_or, 160),
      cleanStr(body.description_en ?? existing.description_en, 500), cleanStr(body.description_or ?? existing.description_or, 500),
      cleanStr(body.icon_key ?? existing.icon_key, 40), cleanStr(body.color_token ?? existing.color_token, 30),
      portal, validateSafeUrl(body.landing_url ?? existing.landing_url),
      cleanStr(body.seo_title_en ?? existing.seo_title_en, 160), cleanStr(body.seo_title_or ?? existing.seo_title_or, 160),
      Number(body.sort_order ?? existing.sort_order), body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, modCode, id, updated, body.change_note || 'Updated category', actor.email);
    return json({ ok: true, item: formatCat(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `${existing.parent_id ? 'nsub' : 'ncat'}-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, description_or, icon_key, color_token, target_portal, landing_url, seo_title_en, seo_title_or, sort_order, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft')`
      ).bind(cloneId, existing.parent_id, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.code, `${existing.name_en} (Copy)`, existing.name_or, existing.description_en, existing.description_or, existing.icon_key, existing.color_token, existing.target_portal, existing.landing_url, existing.seo_title_en, existing.seo_title_or, existing.sort_order).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatCat(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = ? AND entity_id = ?`).bind(body.revision_id, modCode, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_categories SET name_en = ?, name_or = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.name_en, snap.name_or || '', Number(snap.sort_order || 10), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCat(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_categories SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_categories WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCat(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_categories WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 03: Tags & Taxonomies ----------
function formatTag(row) {
  if (!row) return null;
  return { ...row, featured: Boolean(row.featured), synonyms: parseJson(row.synonyms_json, []) };
}

async function handleTags(request, env, actor, id) {
  const method = request.method;
  if (id === 'merge' && method === 'POST') {
    const body = await readJson(request, 50_000);
    const sourceId = cleanStr(body.source_tag_id || '', 100);
    const targetId = cleanStr(body.target_tag_id || '', 100);
    if (!sourceId || !targetId || sourceId === targetId) throw validationError({ target_tag_id: 'Distinct source_tag_id and target_tag_id required' });
    const src = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(sourceId).first();
    const tgt = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(targetId).first();
    if (!src || !tgt) throw new HttpError(404, 'NOT_FOUND', 'Source or target tag not found');

    const srcSyns = parseJson(src.synonyms_json, []);
    const tgtSyns = parseJson(tgt.synonyms_json, []);
    const mergedSyns = [...new Set([...tgtSyns, src.canonical_tag, ...srcSyns].map(s => cleanStr(s, 48).toLowerCase()).filter(s => s && s !== tgt.canonical_tag))];
    const newUsage = Number(tgt.usage_count || 0) + Number(src.usage_count || 0);

    await env.DB.prepare(`UPDATE nav_tags SET synonyms_json = ?, usage_count = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(JSON.stringify(mergedSyns), newUsage, targetId).run();
    await env.DB.prepare(`DELETE FROM nav_tags WHERE id = ?`).bind(sourceId).run();

    // Best-effort sync across edu_resources if table exists
    try {
      const { results: eduRows } = await env.DB.prepare(`SELECT id, tags_json FROM edu_resources WHERE tags_json LIKE ? ESCAPE '\\'`).bind(`%${likeEscape(src.canonical_tag)}%`).all();
      for (const r of eduRows || []) {
        const arr = parseJson(r.tags_json, []).map(t => (t === src.canonical_tag ? tgt.canonical_tag : t));
        await env.DB.prepare(`UPDATE edu_resources SET tags_json = ? WHERE id = ?`).bind(JSON.stringify([...new Set(arr)]), r.id).run();
      }
    } catch {}

    await audit(env, request, actor, 'nav.tag.merge', 'nav_tags', targetId, { merged_from: src.canonical_tag });
    const updated = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(targetId).first();
    return json({ ok: true, item: formatTag(updated), merged_from: src.canonical_tag });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const grp = url.searchParams.get('taxonomy_group') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (grp && TAXONOMY_GROUPS.includes(grp)) { where.push('taxonomy_group = ?'); binds.push(grp); }
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(canonical_tag LIKE ? ESCAPE '\\' OR label_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_tags WHERE ${where.join(' AND ')} ORDER BY usage_count DESC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_tags`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatTag), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_tags SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const label_en = cleanStr(body.label_en || '', 120);
      const canonical = slugify(body.canonical_tag || label_en).slice(0, 60);
      if (!label_en || !canonical) throw validationError({ label_en: 'label_en is required' });
      const grp = TAXONOMY_GROUPS.includes(body.taxonomy_group) ? body.taxonomy_group : 'general';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const syns = Array.isArray(body.synonyms) ? body.synonyms.map(s => cleanStr(s, 48).toLowerCase()).filter(Boolean) : [];
      const newId = `ntag-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_tags (id, slug, canonical_tag, label_en, label_or, taxonomy_group, synonyms_json, usage_count, featured, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, canonical, canonical, label_en, cleanStr(body.label_or || '', 120), grp, JSON.stringify(syns), Number(body.usage_count || 0), body.featured ? 1 : 0, status).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '03', newId, created, 'Created canonical tag', actor.email);
      return json({ ok: true, item: formatTag(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tag not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '03' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatTag(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const grp = TAXONOMY_GROUPS.includes(body.taxonomy_group) ? body.taxonomy_group : existing.taxonomy_group;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    const syns = body.synonyms !== undefined ? (Array.isArray(body.synonyms) ? body.synonyms : []) : parseJson(existing.synonyms_json, []);
    await env.DB.prepare(
      `UPDATE nav_tags SET label_en = ?, label_or = ?, taxonomy_group = ?, synonyms_json = ?, featured = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.label_en ?? existing.label_en, 120), cleanStr(body.label_or ?? existing.label_or, 120),
      grp, JSON.stringify(syns), body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '03', id, updated, body.change_note || 'Updated tag', actor.email);
    return json({ ok: true, item: formatTag(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '03' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_tags SET label_en = ?, synonyms_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.label_en, snap.synonyms_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatTag(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_tags SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_tags WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatTag(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_tags WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 04: Header Navigation (and reusable nav_menu_items) ----------
function formatMenuItem(row) {
  if (!row) return null;
  return { ...row, open_new_tab: Boolean(row.open_new_tab) };
}

async function handleHeaderMenu(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [`menu_location = 'header'`]; const binds = [];
      if (status && NAV_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(label_en LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM nav_menu_items WHERE menu_location = 'header'`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatMenuItem), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !NAV_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE nav_menu_items SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      if (body.action === 'reorder' && Array.isArray(body.ordered_ids)) {
        for (let i = 0; i < body.ordered_ids.length; i++) {
          await env.DB.prepare(`UPDATE nav_menu_items SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i + 1, body.ordered_ids[i]).run();
        }
        return json({ ok: true, reordered: body.ordered_ids.length });
      }
      const label_en = cleanStr(body.label_en || '', 80);
      const url = validateSafeUrl(body.url || '');
      if (!label_en || !url) throw validationError({ label_en: 'label_en and url are required' });
      const vis = VISIBILITY_RULES.includes(body.visibility_rule) ? body.visibility_rule : 'all';
      const hl = HIGHLIGHT_STYLES.includes(body.highlight_style) ? body.highlight_style : 'default';
      const status = NAV_STATUSES.includes(body.status) ? body.status : 'draft';
      const newId = `nmenu-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, badge_text_or, open_new_tab, visibility_rule, highlight_style, sort_order, status)
         VALUES (?, 'header', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, label_en, cleanStr(body.label_or || '', 80), url, cleanStr(body.icon_key || '', 24),
        cleanStr(body.badge_text_en || '', 20), cleanStr(body.badge_text_or || '', 20),
        body.open_new_tab ? 1 : 0, vis, hl, Number(body.sort_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(newId).first();
      await saveNavRevision(env.DB, '04', newId, created, 'Created header nav link', actor.email);
      await audit(env, request, actor, 'nav.header.create', 'nav_menu_items', newId);
      return json({ ok: true, item: formatMenuItem(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Menu item not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM nav_revisions WHERE module_code = '04' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatMenuItem(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const vis = VISIBILITY_RULES.includes(body.visibility_rule) ? body.visibility_rule : existing.visibility_rule;
    const hl = HIGHLIGHT_STYLES.includes(body.highlight_style) ? body.highlight_style : existing.highlight_style;
    const status = NAV_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE nav_menu_items SET label_en = ?, label_or = ?, url = ?, icon_key = ?, badge_text_en = ?, badge_text_or = ?, open_new_tab = ?, visibility_rule = ?, highlight_style = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.label_en ?? existing.label_en, 80), cleanStr(body.label_or ?? existing.label_or, 80),
      validateSafeUrl(body.url ?? existing.url), cleanStr(body.icon_key ?? existing.icon_key, 24),
      cleanStr(body.badge_text_en ?? existing.badge_text_en, 20), cleanStr(body.badge_text_or ?? existing.badge_text_or, 20),
      body.open_new_tab !== undefined ? (body.open_new_tab ? 1 : 0) : existing.open_new_tab,
      vis, hl, Number(body.sort_order ?? existing.sort_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
    await saveNavRevision(env.DB, '04', id, updated, body.change_note || 'Updated header link', actor.email);
    return json({ ok: true, item: formatMenuItem(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `nmenu-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, badge_text_or, open_new_tab, visibility_rule, highlight_style, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, existing.menu_location, `${existing.label_en} (Copy)`, existing.label_or, existing.url, existing.icon_key, existing.badge_text_en, existing.badge_text_or, existing.open_new_tab, existing.visibility_rule, existing.highlight_style, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatMenuItem(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM nav_revisions WHERE id = ? AND module_code = '04' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE nav_menu_items SET label_en = ?, url = ?, badge_text_en = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.label_en, snap.url, snap.badge_text_en || '', Number(snap.sort_order || 10), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatMenuItem(rolled) });
    }
    if (body.status && NAV_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE nav_menu_items SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM nav_menu_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatMenuItem(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM nav_menu_items WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCategoriesNavBatch1Admin(request, env, actor, id, sub) {
  await ensureCategoriesNavBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json({ ok: true, ...(await getCategoriesNavOverview(env)) });
  }
  if (id === 'categories') return handleCategories(request, env, actor, sub);
  if (id === 'tags') return handleTags(request, env, actor, sub);
  if (id === 'header') return handleHeaderMenu(request, env, actor, sub);
  return null;
}

// ---------- Public /api/nav/config ----------
export async function handlePublicNavConfigApi(request, env) {
  await ensureCategoriesNavBatch1Schema(env.DB);
  const [hdrRes, catRes, tagRes] = await Promise.all([
    env.DB.prepare(`SELECT * FROM nav_menu_items WHERE menu_location = 'header' AND status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_categories WHERE status = 'published' ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT * FROM nav_tags WHERE status = 'published' AND featured = 1 ORDER BY usage_count DESC LIMIT 30`).all()
  ]);

  const allCats = (catRes.results || []).map(formatCat);
  const masters = allCats.filter(c => !c.parent_id).map(m => ({
    ...m,
    subcategories: allCats.filter(s => s.parent_id === m.id)
  }));

  return json({
    ok: true,
    header: sortCanonicalHeaderItems((hdrRes.results || []).map(formatMenuItem)),
    categories: masters,
    featured_tags: (tagRes.results || []).map(formatTag)
  });
}
