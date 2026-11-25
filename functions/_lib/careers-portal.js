// v273 Careers Portal & 3-Layer Publishing House Engine
// Strict D1-backed public & admin handlers with safe pending-migration fallback,
// 3-layer taxonomy (L1 Track -> L2 Sub-Track -> L3 Role/Pathway + Region + Stage),
// reusable bilingual snippets, signed/time-limited preview tokens, RBAC admin preview,
// duplicate/publish/unpublish/delete, audit logging, and immediate edge cache invalidation.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';
import { logZeroResultSearch } from './radars-v311.js';

export const CAREER_STATUSES = ['draft', 'published', 'archived'];
export const CAREER_TAXONOMY_KINDS = ['track', 'subtrack', 'role_stream', 'region', 'stage'];
export const CAREER_SNIPPET_CATEGORIES = ['eligibility', 'salary', 'selection', 'preparation', 'verification', 'general'];

export const DEFAULT_CAREER_TAXONOMY = [
  // L1: 6 Core Career Tracks
  { id: 'ctax-track-civil-services', kind: 'track', level: 1, parent_id: '', slug: 'civil-services', label_en: 'Civil Services', label_or: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍', icon: '🏛️', sort_order: 1, active: 1 },
  { id: 'ctax-track-engineering-it', kind: 'track', level: 1, parent_id: '', slug: 'engineering-it', label_en: 'Engineering / IT', label_or: 'ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି', icon: '💻', sort_order: 2, active: 1 },
  { id: 'ctax-track-banking-finance', kind: 'track', level: 1, parent_id: '', slug: 'banking-finance', label_en: 'Banking & Finance', label_or: 'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି', icon: '🏦', sort_order: 3, active: 1 },
  { id: 'ctax-track-healthcare', kind: 'track', level: 1, parent_id: '', slug: 'healthcare', label_en: 'Healthcare', label_or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା', icon: '🩺', sort_order: 4, active: 1 },
  { id: 'ctax-track-agriculture', kind: 'track', level: 1, parent_id: '', slug: 'agriculture', label_en: 'Agriculture', label_or: 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ', icon: '🌾', sort_order: 5, active: 1 },
  { id: 'ctax-track-pathways', kind: 'track', level: 1, parent_id: '', slug: 'pathways', label_en: 'Career Stage & Pathways', label_or: 'କ୍ୟାରିୟର ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗଦର୍ଶନ', icon: '🧭', sort_order: 6, active: 1 },
  // L2: Sub-Tracks / Domains
  { id: 'ctax-sub-odisha-state-pcs', kind: 'subtrack', level: 2, parent_id: 'ctax-track-civil-services', slug: 'odisha-state-pcs', label_en: 'Odisha State Civil Services (OPSC)', label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପ୍ରଶାସନିକ ସେବା (OPSC)', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-sub-union-civil-services', kind: 'subtrack', level: 2, parent_id: 'ctax-track-civil-services', slug: 'union-civil-services', label_en: 'Union Civil Services (UPSC)', label_or: 'କେନ୍ଦ୍ର ଲୋକସେବା (UPSC)', icon: '', sort_order: 2, active: 1 },
  { id: 'ctax-sub-psu-gate-engineering', kind: 'subtrack', level: 2, parent_id: 'ctax-track-engineering-it', slug: 'psu-gate-engineering', label_en: 'GATE, PSU & State Engineering', label_or: 'GATE, PSU ଓ ରାଜ୍ୟ ଇଞ୍ଜିନିୟରିଂ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-sub-software-ai-cloud', kind: 'subtrack', level: 2, parent_id: 'ctax-track-engineering-it', slug: 'software-ai-cloud', label_en: 'Software, AI & Cloud IT', label_or: 'ସଫ୍ଟୱେର୍, AI ଓ କ୍ଲାଉଡ୍ ଆଇଟି', icon: '', sort_order: 2, active: 1 },
  { id: 'ctax-sub-public-sector-banks', kind: 'subtrack', level: 2, parent_id: 'ctax-track-banking-finance', slug: 'public-sector-banks', label_en: 'Public Sector & Regulatory Banks', label_or: 'ସରକାରୀ ବ୍ୟାଙ୍କ ଓ ନିୟାମକ ସଂସ୍ଥା', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-sub-insurance-finance', kind: 'subtrack', level: 2, parent_id: 'ctax-track-banking-finance', slug: 'insurance-finance', label_en: 'Insurance, Accounting & Finance', label_or: 'ବୀମା, ଆକାଉଣ୍ଟିଂ ଓ ଅର୍ଥନୀତି', icon: '', sort_order: 2, active: 1 },
  { id: 'ctax-sub-medical-doctors', kind: 'subtrack', level: 2, parent_id: 'ctax-track-healthcare', slug: 'medical-doctors', label_en: 'Medical, Dental & AYUSH Cadre', label_or: 'ଡାକ୍ତରୀ, ଦନ୍ତ ଓ ଆୟୁଷ ସେବା', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-sub-nursing-allied', kind: 'subtrack', level: 2, parent_id: 'ctax-track-healthcare', slug: 'nursing-allied', label_en: 'Nursing, Pharmacy & Allied Health', label_or: 'ନର୍ସିଂ, ଫାର୍ମାସୀ ଓ ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ', icon: '', sort_order: 2, active: 1 },
  { id: 'ctax-sub-agri-officers', kind: 'subtrack', level: 2, parent_id: 'ctax-track-agriculture', slug: 'agri-officers', label_en: 'Agricultural & Allied State Officers', label_or: 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ ଅଧିକାରୀ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-sub-agri-research-ouat', kind: 'subtrack', level: 2, parent_id: 'ctax-track-agriculture', slug: 'agri-research-ouat', label_en: 'OUAT, ICAR & Agri-Tech Research', label_or: 'OUAT, ICAR ଓ କୃଷି ଗବେଷଣା', icon: '', sort_order: 2, active: 1 },
  { id: 'ctax-sub-school-college-tracks', kind: 'subtrack', level: 2, parent_id: 'ctax-track-pathways', slug: 'school-college-tracks', label_en: 'After 10th / 12th & Degree Streams', label_or: 'ଦଶମ / ଦ୍ୱାଦଶ ଓ ସ୍ନାତକ ମାର୍ଗ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-sub-skill-apprenticeship', kind: 'subtrack', level: 2, parent_id: 'ctax-track-pathways', slug: 'skill-apprenticeship', label_en: 'Skill India, ITI & Apprenticeships', label_or: 'ଦକ୍ଷତା ବିକାଶ, ITI ଓ ଆପ୍ରେଣ୍ଟିସ୍', icon: '', sort_order: 2, active: 1 },
  // L3: Roles / Pathways
  { id: 'ctax-role-oas-ops-ofs', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-odisha-state-pcs', slug: 'oas-ops-ofs', label_en: 'OAS / OPS / OFS Group-A Officer', label_or: 'OAS / OPS / OFS ଗ୍ରୁପ୍-ଏ ଅଧିକାରୀ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-ors-otds', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-odisha-state-pcs', slug: 'ors-otds', label_en: 'ORS / OTS / Group-B Executive', label_or: 'ORS / OTS / ଗ୍ରୁପ୍-ବି ଅଧିକାରୀ', icon: '', sort_order: 2, active: 1 },
  { id: 'ctax-role-ias-ips-ifs', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-union-civil-services', slug: 'ias-ips-ifs', label_en: 'IAS / IPS / IFS All-India Services', label_or: 'IAS / IPS / IFS ସର୍ବଭାରତୀୟ ସେବା', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-opsc-aee-je', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-psu-gate-engineering', slug: 'opsc-aee-je', label_en: 'OPSC AEE & OSSC Junior Engineer', label_or: 'OPSC AEE ଓ OSSC ଜୁନିୟର ଇଞ୍ଜିନିୟର', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-fullstack-ai-eng', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-software-ai-cloud', slug: 'fullstack-ai-eng', label_en: 'Full-Stack, Data & AI Engineer', label_or: 'ଫୁଲ୍-ଷ୍ଟାକ୍, ଡାଟା ଓ AI ଇଞ୍ଜିନିୟର', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-rbi-sbi-ibps-po', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-public-sector-banks', slug: 'rbi-sbi-ibps-po', label_en: 'RBI Grade B / SBI PO / IBPS PO', label_or: 'RBI ଗ୍ରେଡ୍-ବି / SBI PO / IBPS PO', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-nabard-lic-ca', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-insurance-finance', slug: 'nabard-lic-ca', label_en: 'NABARD Grade A / LIC AAO / CA', label_or: 'NABARD ଗ୍ରେଡ୍-ଏ / LIC AAO / CA', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-omhs-medical-officer', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-medical-doctors', slug: 'omhs-medical-officer', label_en: 'OPSC Medical Officer (OMHS)', label_or: 'OPSC ମେଡିକାଲ୍ ଅଫିସର୍ (OMHS)', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-osssc-nursing-pharma', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-nursing-allied', slug: 'osssc-nursing-pharma', label_en: 'OSSSC Nursing Officer & Pharmacist', label_or: 'OSSSC ନର୍ସିଂ ଅଫିସର୍ ଓ ଫାର୍ମାସିଷ୍ଟ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-opsc-aao-aho', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-agri-officers', slug: 'opsc-aao-aho', label_en: 'OPSC AAO / AHO / Soil Conservation', label_or: 'OPSC AAO / AHO / ମୃତ୍ତିକା ସଂରକ୍ଷଣ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-plus2-entrance-guide', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-school-college-tracks', slug: 'plus2-entrance-guide', label_en: 'JEE / NEET / CUET / CLAT Track', label_or: 'JEE / NEET / CUET / CLAT ମାର୍ଗ', icon: '', sort_order: 1, active: 1 },
  { id: 'ctax-role-nats-naps-iti', kind: 'role_stream', level: 3, parent_id: 'ctax-sub-skill-apprenticeship', slug: 'nats-naps-iti', label_en: 'NATS / NAPS & Odisha Skill Centres', label_or: 'NATS / NAPS ଓ ଓଡ଼ିଶା ଦକ୍ଷତା କେନ୍ଦ୍ର', icon: '', sort_order: 1, active: 1 },
  // 3 Region Scopes
  { id: 'ctax-region-odisha', kind: 'region', level: 1, parent_id: '', slug: 'odisha', label_en: 'Odisha', label_or: 'ଓଡ଼ିଶା', icon: '📍', sort_order: 1, active: 1 },
  { id: 'ctax-region-central', kind: 'region', level: 1, parent_id: '', slug: 'central', label_en: 'Central', label_or: 'କେନ୍ଦ୍ର ସରକାର', icon: '🇮🇳', sort_order: 2, active: 1 },
  { id: 'ctax-region-all-india', kind: 'region', level: 1, parent_id: '', slug: 'all-india', label_en: 'All Over India', label_or: 'ସମଗ୍ର ଭାରତ', icon: '🌏', sort_order: 3, active: 1 },
  // 5 Career Stages
  { id: 'ctax-stage-after-10th-12th', kind: 'stage', level: 1, parent_id: '', slug: 'after-10th-12th', label_en: 'After 10th / 12th', label_or: 'ଦଶମ / ଦ୍ୱାଦଶ ପରେ', icon: '🎒', sort_order: 1, active: 1 },
  { id: 'ctax-stage-graduate', kind: 'stage', level: 1, parent_id: '', slug: 'graduate', label_en: 'Graduate', label_or: 'ସ୍ନାତକ', icon: '🎓', sort_order: 2, active: 1 },
  { id: 'ctax-stage-postgraduate', kind: 'stage', level: 1, parent_id: '', slug: 'postgraduate', label_en: 'Postgraduate', label_or: 'ସ୍ନାତକୋତ୍ତର', icon: '📘', sort_order: 3, active: 1 },
  { id: 'ctax-stage-internship-apprenticeship', kind: 'stage', level: 1, parent_id: '', slug: 'internship-apprenticeship', label_en: 'Internship & Apprenticeship', label_or: 'ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍', icon: '🛠️', sort_order: 4, active: 1 },
  { id: 'ctax-stage-all-stages', kind: 'stage', level: 1, parent_id: '', slug: 'all-stages', label_en: 'All Stages', label_or: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ', icon: '✨', sort_order: 5, active: 1 }
];

export const DEFAULT_CAREER_SNIPPETS = [
  {
    id: 'csnip-01-odisha-eligibility',
    category: 'eligibility',
    title_en: 'Odisha State Eligibility & Age Relaxation',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଯୋଗ୍ୟତା ଓ ବୟସ କୋହଳ',
    body_en: '### Eligibility & Age Criteria (Odisha Norms)\n- Educational Qualification: Bachelor Degree from a recognised university (or equivalent qualification specified in the official notification).\n- Age Limit: 21 to 38 years as on 1st January of the recruitment year.\n- Upper Age Relaxation: +5 years for SC / ST / SEBC / Women / Ex-Servicemen; +10 years for PwBD candidates as per Odisha Govt rules.\n- Odia Language Requirement: Must be able to read, write, and speak Odia fluently (ME standard / HSC with Odia).',
    body_or: '### ଯୋଗ୍ୟତା ଓ ବୟସ ସୀମା (ଓଡ଼ିଶା ସରକାରୀ ନିୟମ)\n- ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା: ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ବିଶ୍ୱବିଦ୍ୟାଳୟରୁ ସ୍ନାତକ ଡିଗ୍ରୀ (କିମ୍ବା ସରକାରୀ ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ ସମକକ୍ଷ ଯୋଗ୍ୟତା)।\n- ବୟସ ସୀମା: ନିଯୁକ୍ତି ବର୍ଷର ଜାନୁଆରୀ ୧ ସୁଦ୍ଧା ୨୧ ରୁ ୩୮ ବର୍ଷ।\n- ବୟସ କୋହଳ: SC / ST / SEBC / ମହିଳା / ପୂର୍ବତନ ସୈନିକଙ୍କ ପାଇଁ +୫ ବର୍ଷ; PwBD ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ +୧୦ ବର୍ଷ।\n- ଓଡ଼ିଆ ଭାଷା ଜ୍ଞାନ: ଓଡ଼ିଆ ପଢ଼ିବା, ଲେଖିବା ଓ କହିବାରେ ଦକ୍ଷତା (ଅଷ୍ଟମ / ଦଶମ ଶ୍ରେଣୀରେ ଓଡ଼ିଆ ବିଷୟ)।',
    sort_order: 1
  },
  {
    id: 'csnip-02-central-eligibility',
    category: 'eligibility',
    title_en: 'Central Govt / UPSC / SSC Eligibility Block',
    title_or: 'କେନ୍ଦ୍ର ସରକାର / UPSC / SSC ଯୋଗ୍ୟତା ବିବରଣୀ',
    body_en: '### Central Services Eligibility & Age Criteria\n- Nationality: Citizen of India.\n- Minimum Qualification: Recognised Graduation / Diploma / 10+2 as per post cadre.\n- Age Relaxation: +3 years for OBC (Non-Creamy Layer), +5 years for SC / ST, and +10 years for PwBD under DoPT guidelines.\n- Number of Attempts: Check official UPSC / SSC / RRB notification for category-wise attempt caps.',
    body_or: '### କେନ୍ଦ୍ର ସରକାରୀ ସେବା ଯୋଗ୍ୟତା ଓ ବୟସ ସୀମା\n- ଜାତୀୟତା: ଭାରତୀୟ ନାଗରିକ।\n- ସର୍ବନିମ୍ନ ଯୋଗ୍ୟତା: ପଦବୀ ଅନୁଯାୟୀ ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ସ୍ନାତକ / ଡିପ୍ଲୋମା / +୨ ପାସ୍।\n- ବୟସ କୋହଳ: OBC (NCL) ପାଇଁ +୩ ବର୍ଷ, SC / ST ପାଇଁ +୫ ବର୍ଷ, PwBD ପାଇଁ +୧୦ ବର୍ଷ।\n- ପରୀକ୍ଷା ସୁଯୋଗ ସଂଖ୍ୟା: ବର୍ଗ ଅନୁଯାୟୀ ସୁଯୋଗ ସଂଖ୍ୟା ପାଇଁ ସରକାରୀ UPSC / SSC ବିଜ୍ଞପ୍ତି ଯାଞ୍ଚ କରନ୍ତୁ।',
    sort_order: 2
  },
  {
    id: 'csnip-03-orsp-salary',
    category: 'salary',
    title_en: 'ORSP & 7th CPC Salary / Pay Matrix Band',
    title_or: 'ORSP ଓ ସପ୍ତମ ବେତନ ଆୟୋଗ ଦରମା ବିବରଣୀ',
    body_en: '### Salary Structure, Pay Matrix & Allowances\n- Entry Pay Scale: ORSP 2017 / 7th CPC Pay Matrix Level (Basic Pay + Dearness Allowance + House Rent Allowance + Medical Allowance).\n- Probation & Confirmation: Standard 2-year probation followed by regular cadre increments and annual 3% pay progression.\n- Retirement & Social Security: Covered under NPS / UPS pension scheme, Group Insurance, and Govt quarter / HRA entitlement.',
    body_or: '### ଦରମା ଗଠନ, ପେ-ମ୍ୟାଟ୍ରିକ୍ସ ଓ ଭତ୍ତା\n- ପ୍ରାରମ୍ଭିକ ଦରମା: ORSP ୨୦୧୭ / ୭ମ ବେତନ ଆୟୋଗ ପେ-ମ୍ୟାଟ୍ରିକ୍ସ ଲେଭେଲ୍ (ମୂଳ ଦରମା + ମହଙ୍ଗା ଭତ୍ତା + ଘର ଭଡ଼ା ଭତ୍ତା + ଚିକିତ୍ସା ଭତ୍ତା)।\n- ପ୍ରୋବେସନ୍ ଓ ନିୟମିତକରଣ: ୨ ବର୍ଷର ପ୍ରୋବେସନ୍ ପରେ ବାର୍ଷିକ ୩% ବେତନ ବୃଦ୍ଧି ଓ ପଦୋନ୍ନତି।\n- ପେନସନ୍ ଓ ସୁବିଧା: NPS / UPS ପେନସନ୍, ସରକାରୀ ବାସଭବନ / HRA ଓ ଚିକିତ୍ସା ସୁବିଧା।',
    sort_order: 3
  },
  {
    id: 'csnip-04-banking-psu-ctc',
    category: 'salary',
    title_en: 'Banking, PSU & Corporate CTC Progression',
    title_or: 'ବ୍ୟାଙ୍କିଂ, PSU ଓ କର୍ପୋରେଟ୍ ଦରମା ପ୍ରଗତି',
    body_en: '### Compensation, Perks & Career Growth Ladder\n- Entry CTC / Basic Scale: Competitive starting pay with DA, CCA, Leased Accommodation, Conveyance, and Medical coverage.\n- Fast-Track Promotions: Officer Scale-I → Scale-II / Manager → Senior Manager → AGM / DGM through internal exams and merit appraisal.\n- Skill Bonus: Additional allowances for JAIIB / CAIIB, GATE score, or specialised technical certifications.',
    body_or: '### ଦରମା, ସୁବିଧା ଓ ପଦୋନ୍ନତି ସୋପାନ\n- ପ୍ରାରମ୍ଭିକ CTC / ସ୍କେଲ୍: DA, CCA, ଘର ଭଡ଼ା ସୁବିଧା, ଯାତାୟାତ ଓ ପରିବାର ଚିକିତ୍ସା ବୀମା।\n- ଦ୍ରୁତ ପଦୋନ୍ନତି: ଅଫିସର୍ ସ୍କେଲ୍-୧ → ମ୍ୟାନେଜର୍ → ସିନିୟର ମ୍ୟାନେଜର୍ → AGM / DGM।\n- ଅତିରିକ୍ତ ଭତ୍ତା: JAIIB / CAIIB କିମ୍ବା ବିଶେଷ ପ୍ରମାଣପତ୍ର ପାଇଁ ଅତିରିକ୍ତ ଇନକ୍ରିମେଣ୍ଟ।',
    sort_order: 4
  },
  {
    id: 'csnip-05-three-stage-selection',
    category: 'selection',
    title_en: '3-Stage Selection Pattern (Prelims + Mains + Interview)',
    title_or: '୩-ସ୍ତରୀୟ ଚୟନ ପଦ୍ଧତି (ପ୍ରିଲିମ୍ସ + ମେନ୍ସ + ସାକ୍ଷାତକାର)',
    body_en: '### Selection & Examination Stages\n- Stage 1 — Preliminary Exam (Objective MCQ): Qualifying screening test with negative marking (typically 1/3rd or 1/4th).\n- Stage 2 — Main Written Examination (Descriptive): General Studies, Essay, Odia/English Language, and Optional/Subject papers.\n- Stage 3 — Personality Test / Interview: Evaluates administrative clarity, Odisha & national awareness, ethics, and decision-making.',
    body_or: '### ପରୀକ୍ଷା ଓ ଚୟନ ପର୍ଯ୍ୟାୟ\n- ପର୍ଯ୍ୟାୟ ୧ — ପ୍ରାରମ୍ଭିକ ପରୀକ୍ଷା (Objective MCQ): ନେଗେଟିଭ୍ ମାର୍କିଂ ସହିତ ଯୋଗ୍ୟତା ନିର୍ଦ୍ଧାରଣ ପରୀକ୍ଷା।\n- ପର୍ଯ୍ୟାୟ ୨ — ମୁଖ୍ୟ ଲିଖିତ ପରୀକ୍ଷା (Descriptive): ସାଧାରଣ ଅଧ୍ୟୟନ, ପ୍ରବନ୍ଧ, ଓଡ଼ିଆ/ଇଂରାଜୀ ଭାଷା ଓ ଇଚ୍ଛାଧୀନ ବିଷୟ।\n- ପର୍ଯ୍ୟାୟ ୩ — ବ୍ୟକ୍ତିତ୍ୱ ପରୀକ୍ଷା / ସାକ୍ଷାତକାର: ପ୍ରଶାସନିକ ଦକ୍ଷତା, ଓଡ଼ିଶା ଓ ଜାତୀୟ ଜ୍ଞାନ ଏବଂ ନୈତିକତା ମୂଲ୍ୟାୟନ।',
    sort_order: 5
  },
  {
    id: 'csnip-06-cbt-skill-selection',
    category: 'selection',
    title_en: 'CBT + Computer Skill Test + Document Verification',
    title_or: 'CBT + କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା + ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ',
    body_en: '### Selection Stages (CBT & Skill Track)\n- Stage 1 — Computer-Based Test (CBT): Covers General Awareness, Quantitative Aptitude, Reasoning, English, and Odia Grammar.\n- Stage 2 — Practical / Computer Skill Test: MS Office, spreadsheet accuracy, typing speed, or trade-specific practical assessment.\n- Stage 3 — Certificate & Document Verification: Original academic marksheets, Resident, Caste/SEBC, and Employment Exchange certificates.',
    body_or: '### ଚୟନ ପର୍ଯ୍ୟାୟ (CBT ଓ ଦକ୍ଷତା ପରୀକ୍ଷା)\n- ପର୍ଯ୍ୟାୟ ୧ — କମ୍ପ୍ୟୁଟର ଆଧାରିତ ପରୀକ୍ଷା (CBT): ସାଧାରଣ ଜ୍ଞାନ, ଗଣିତ, ରିଜନିଂ, ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ବ୍ୟାକରଣ।\n- ପର୍ଯ୍ୟାୟ ୨ — ବ୍ୟବହାରିକ / କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା: MS Office, ଟାଇପିଂ କିମ୍ବା ବିଷୟଗତ ପ୍ରାକ୍ଟିକାଲ୍।\n- ପର୍ଯ୍ୟାୟ ୩ — ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ: ମୂଳ ଶିକ୍ଷାଗତ ପ୍ରମାଣପତ୍ର, ସ୍ଥାୟୀ ବାସିନ୍ଦା, ଜାତିଗତ ଓ ନିଯୁକ୍ତି ବିନିମୟ ପ୍ରମାଣପତ୍ର।',
    sort_order: 6
  },
  {
    id: 'csnip-07-6month-roadmap',
    category: 'preparation',
    title_en: '6-Month Structured Preparation Roadmap Checklist',
    title_or: '୬-ମାସିଆ ପ୍ରସ୍ତୁତି ରୋଡମ୍ୟାପ୍ ଚେକଲିଷ୍ଟ',
    body_en: '### 6-Month Preparation Roadmap Checklist\n- Months 1–2 (Foundation): Complete NCERT (Classes 6–12), Odisha Board History/Geography, and core syllabus mapping.\n- Months 3–4 (Practice & PYQs): Solve last 10 years Previous Year Question papers and maintain concise revision notes.\n- Month 5 (Mock Tests): Attempt weekly full-length timed mock tests and track accuracy in weak topics.\n- Month 6 (Final Revision): Revise Odisha Budget, Economic Survey, Current Affairs capsules, and official syllabus checklists.',
    body_or: '### ୬-ମାସିଆ ପ୍ରସ୍ତୁତି ରୋଡମ୍ୟାପ୍ ଚେକଲିଷ୍ଟ\n- ମାସ ୧–୨ (ମୂଳଦୁଆ): NCERT (ଷଷ୍ଠ–ଦ୍ୱାଦଶ), ଓଡ଼ିଶା ଇତିହାସ/ଭୂଗୋଳ ଓ ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ ଅଧ୍ୟୟନ।\n- ମାସ ୩–୪ (ଅଭ୍ୟାସ ଓ PYQ): ବିଗତ ୧୦ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର ସମାଧାନ ଓ ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ ପ୍ରସ୍ତୁତି।\n- ମାସ ୫ (ମକ୍ ଟେଷ୍ଟ): ପ୍ରତି ସପ୍ତାହରେ ପୂର୍ଣ୍ଣକାଳୀନ ମକ୍ ଟେଷ୍ଟ ଓ ଦୁର୍ବଳ ବିଷୟର ସଂଶୋଧନ।\n- ମାସ ୬ (ଅନ୍ତିମ ପୁନରାବୃତ୍ତି): ଓଡ଼ିଶା ବଜେଟ୍, ଅର୍ଥନୈତିକ ସର୍ଭେ ଓ ଦୈନିକ କରେଣ୍ଟ ଆଫେୟାର୍ସ ପୁନରାବୃତ୍ତି।',
    sort_order: 7
  },
  {
    id: 'csnip-08-odia-checklist',
    category: 'preparation',
    title_en: 'Odisha GK & Odia Language Preparation Checklist',
    title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ଓଡ଼ିଆ ଭାଷା ପ୍ରସ୍ତୁତି ଚେକଲିଷ୍ଟ',
    body_en: '### Odisha GK & Odia Language Focus Areas\n- Odisha Geography & Polity: 30 Districts, river systems (Mahanadi, Brahmani, Baitarani), tribal heritage, and state governance.\n- Odisha Economy & Schemes: State Budget highlights, Subhadra, CM-KISAN, industrial corridors, and disaster management.\n- Odia Grammar & Composition: Sandhi, Samasa, Krudanta, Taddhita, Precis writing, and Odia-to-English translation.',
    body_or: '### ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ଓଡ଼ିଆ ଭାଷା ମୁଖ୍ୟ ବିଷୟ\n- ଓଡ଼ିଶା ଭୂଗୋଳ ଓ ରାଜନୀତି: ୩୦ ଜିଲ୍ଲା, ନଦୀ ବ୍ୟବସ୍ଥା (ମହାନଦୀ, ବ୍ରାହ୍ମଣୀ, ବୈତରଣୀ), ଜନଜାତି ସଂସ୍କୃତି ଓ ଶାସନ ବ୍ୟବସ୍ଥା।\n- ଓଡ଼ିଶା ଅର୍ଥନୀତି ଓ ଯୋଜନା: ରାଜ୍ୟ ବଜେଟ୍, ସୁଭଦ୍ରା, CM-KISAN, ଶିଳ୍ପ କରିଡର ଓ ବିପର୍ଯ୍ୟୟ ପରିଚାଳନା।\n- ଓଡ଼ିଆ ବ୍ୟାକରଣ ଓ ରଚନା: ସନ୍ଧି, ସମାସ, କୃଦନ୍ତ, ତଦ୍ଧିତ, ସାରାଂଶ ଲିଖନ ଓ ଅନୁବାଦ।',
    sort_order: 8
  },
  {
    id: 'csnip-09-gov-verification',
    category: 'verification',
    title_en: 'Official .gov.in Portal Verification Note',
    title_or: 'ସରକାରୀ .gov.in ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ ସୂଚନା',
    body_en: '### Official Portal Verification Note\n- Always verify latest advertisement numbers, vacancy changes, corrigenda, and closing dates exclusively on official `.gov.in` / `.nic.in` portals (OPSC, OSSC, OSSSC, UPSC, SSC).\n- Never share OTPs or pay application fees through unverified third-party links. Keep your OTR (One-Time Registration) ID and PDF receipt saved safely.',
    body_or: '### ସରକାରୀ ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ ସୂଚନା\n- ସର୍ବଦା ଅଫିସିଆଲ୍ `.gov.in` / `.nic.in` ୱେବସାଇଟ୍ (OPSC, OSSC, OSSSC, UPSC, SSC) ରେ ନୂତନ ବିଜ୍ଞପ୍ତି ଓ ଶେଷ ତାରିଖ ଯାଞ୍ଚ କରନ୍ତୁ।\n- ଅଜଣା ଲିଙ୍କରେ କେବେହେଲେ OTP କିମ୍ବା ଆବେଦନ ଫିସ୍ ଦିଅନ୍ତୁ ନାହିଁ। OTR ID ଓ PDF ରସିଦ ସୁରକ୍ଷିତ ରଖନ୍ତୁ।',
    sort_order: 9
  },
  {
    id: 'csnip-10-apprenticeship-verification',
    category: 'verification',
    title_en: 'NATS / NAPS Internship & Apprenticeship Guide Note',
    title_or: 'NATS / NAPS ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍ ସୂଚନା',
    body_en: '### Internship & Apprenticeship Verification (NATS / NAPS)\n- Register free on the official National Apprenticeship Training Scheme (nats.education.gov.in) for Graduate/Diploma holders or NAPS (apprenticeshipindia.gov.in) for ITI/10th/12th youth.\n- Verify monthly stipend, training duration (6–12 months), and Central/State PSU establishment code before applying.',
    body_or: '### ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍ ଯାଞ୍ଚ (NATS / NAPS)\n- ସ୍ନାତକ/ଡିପ୍ଲୋମା ପ୍ରାର୍ଥୀ NATS (nats.education.gov.in) ଏବଂ ITI/ଦଶମ/ଦ୍ୱାଦଶ ପ୍ରାର୍ଥୀ NAPS (apprenticeshipindia.gov.in) ରେ ମାଗଣା ପଞ୍ଜୀକରଣ କରନ୍ତୁ।\n- ଆବେଦନ ପୂର୍ବରୁ ମାସିକ ବୃତ୍ତି (Stipend), ତାଲିମ ଅବଧି ଓ ସରକାରୀ ସଂସ୍ଥା କୋଡ୍ ଯାଞ୍ଚ କରନ୍ତୁ।',
    sort_order: 10
  }
];

const _schemaReady = new WeakSet();

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function slugify(raw, fallback = 'career-guide') {
  const s = String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || fallback;
}

function randomHex(byteLen = 24) {
  const arr = new Uint8Array(byteLen);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function safeLinksArray(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const label = str(item.label || item.title || '', 160);
    const url = str(item.url || item.href || '', 500);
    if (!url || /^(javascript|data|vbscript)\s*:/i.test(url)) continue;
    if (!url.startsWith('/') && !/^https?:\/\//i.test(url)) continue;
    out.push({ label: label || url, url });
  }
  return out;
}

function normalizeNode(n) {
  const kind = String(n.kind || 'track');
  const defaultLevel = kind === 'subtrack' ? 2 : (kind === 'role_stream' ? 3 : 1);
  return {
    id: n.id,
    kind,
    level: Number(n.level || defaultLevel),
    parent_id: String(n.parent_id || ''),
    slug: String(n.slug || ''),
    label_en: String(n.label_en || ''),
    label_or: String(n.label_or || ''),
    icon: String(n.icon || ''),
    description_en: String(n.description_en || ''),
    description_or: String(n.description_or || ''),
    sort_order: Number(n.sort_order || 0),
    active: Number(n.active ?? 1) === 1 ? 1 : 0
  };
}

function groupTaxonomy(rawNodes, includeInactive = false) {
  const source = Array.isArray(rawNodes) && rawNodes.length ? rawNodes : DEFAULT_CAREER_TAXONOMY;
  const list = source.map(normalizeNode);
  const sortFn = (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.label_en || '').localeCompare(String(b.label_en || ''));
  const visible = includeInactive ? list : list.filter(n => n.active === 1);
  return {
    tracks: visible.filter(n => n.kind === 'track').sort(sortFn),
    subtracks: visible.filter(n => n.kind === 'subtrack').sort(sortFn),
    role_streams: visible.filter(n => n.kind === 'role_stream').sort(sortFn),
    regions: visible.filter(n => n.kind === 'region').sort(sortFn),
    stages: visible.filter(n => n.kind === 'stage').sort(sortFn),
    nodes: list.sort(sortFn)
  };
}

function hydrateArticle(row, includePrivate = false) {
  if (!row) return null;
  const out = {
    id: row.id,
    slug: row.slug,
    title_en: row.title_en || '',
    title_or: row.title_or || '',
    track_slug: row.track_slug || 'civil-services',
    subtrack_slug: row.subtrack_slug || '',
    role_stream_slug: row.role_stream_slug || '',
    region_scope: row.region_scope || 'odisha',
    career_stage: row.career_stage || 'graduate',
    summary_en: row.summary_en || '',
    summary_or: row.summary_or || '',
    roadmap_body_en: row.roadmap_body_en || '',
    roadmap_body_or: row.roadmap_body_or || '',
    eligibility_summary: row.eligibility_summary || '',
    salary_band: row.salary_band || '',
    key_exams: row.key_exams || '',
    official_links: safeLinksArray(row.official_links_json),
    official_links_json: typeof row.official_links_json === 'string' ? row.official_links_json : JSON.stringify(safeLinksArray(row.official_links_json)),
    status: row.status || 'draft',
    featured: Number(row.featured || 0) ? 1 : 0,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    published_at: row.published_at || null
  };
  if (includePrivate) {
    out.preview_token = row.preview_token || '';
    out.preview_expires_at = row.preview_expires_at || '';
  }
  return out;
}

function isMissingTableError(err) {
  const msg = String((err && err.message) || err || '').toLowerCase();
  return msg.includes('no such table') || msg.includes('does not exist');
}

async function invalidateCareersCaches(request, slug = '') {
  const extra = [
    '/careers/',
    '/api/public/careers/bootstrap',
    '/api/public/careers/list'
  ];
  if (slug) {
    extra.push(`/api/public/careers/list?slug=${encodeURIComponent(slug)}`);
  }
  await invalidateAllPublicCaches(request, extra);
}

export async function ensureCareersSchema(db) {
  if (!db || _schemaReady.has(db)) return;

  // Create full v273 tables if they do not exist
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS careers_articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      track_slug TEXT NOT NULL DEFAULT 'civil-services',
      subtrack_slug TEXT NOT NULL DEFAULT '',
      role_stream_slug TEXT NOT NULL DEFAULT '',
      region_scope TEXT NOT NULL DEFAULT 'odisha',
      career_stage TEXT NOT NULL DEFAULT 'graduate',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      roadmap_body_en TEXT NOT NULL DEFAULT '',
      roadmap_body_or TEXT NOT NULL DEFAULT '',
      eligibility_summary TEXT NOT NULL DEFAULT '',
      salary_band TEXT NOT NULL DEFAULT '',
      key_exams TEXT NOT NULL DEFAULT '',
      official_links_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      preview_token TEXT NOT NULL DEFAULT '',
      preview_expires_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    )`
  ).run();

  // Safely upgrade legacy v269 careers_articles table if columns are missing
  try {
    const info = await db.prepare(`PRAGMA table_info(careers_articles)`).all();
    const cols = new Set((info.results || []).map(c => c.name));
    if (!cols.has('subtrack_slug')) {
      await db.prepare(`ALTER TABLE careers_articles ADD COLUMN subtrack_slug TEXT NOT NULL DEFAULT ''`).run();
    }
    if (!cols.has('role_stream_slug')) {
      await db.prepare(`ALTER TABLE careers_articles ADD COLUMN role_stream_slug TEXT NOT NULL DEFAULT ''`).run();
    }
    if (!cols.has('preview_token')) {
      await db.prepare(`ALTER TABLE careers_articles ADD COLUMN preview_token TEXT NOT NULL DEFAULT ''`).run();
    }
    if (!cols.has('preview_expires_at')) {
      await db.prepare(`ALTER TABLE careers_articles ADD COLUMN preview_expires_at TEXT NOT NULL DEFAULT ''`).run();
    }
  } catch {}

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_careers_articles_status_track ON careers_articles(status, track_slug, region_scope, career_stage)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_careers_articles_l1_l2_l3 ON careers_articles(status, track_slug, subtrack_slug, role_stream_slug)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_careers_articles_featured ON careers_articles(status, featured DESC, updated_at DESC)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_careers_articles_preview_token ON careers_articles(preview_token)`).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS career_taxonomy_nodes (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('track', 'subtrack', 'role_stream', 'region', 'stage')),
      level INTEGER NOT NULL DEFAULT 1,
      parent_id TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL,
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(kind, parent_id, slug)
    )`
  ).run();

  // Safely detect & upgrade legacy v269 career_taxonomy_nodes (which lacked parent_id/level and had narrow kind CHECK)
  try {
    const tInfo = await db.prepare(`PRAGMA table_info(career_taxonomy_nodes)`).all();
    const tCols = new Set((tInfo.results || []).map(c => c.name));
    if (!tCols.has('parent_id')) {
      await db.prepare(
        `CREATE TABLE IF NOT EXISTS career_taxonomy_nodes_v273 (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('track', 'subtrack', 'role_stream', 'region', 'stage')),
          level INTEGER NOT NULL DEFAULT 1,
          parent_id TEXT NOT NULL DEFAULT '',
          slug TEXT NOT NULL,
          label_en TEXT NOT NULL,
          label_or TEXT NOT NULL DEFAULT '',
          icon TEXT NOT NULL DEFAULT '',
          description_en TEXT NOT NULL DEFAULT '',
          description_or TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          UNIQUE(kind, parent_id, slug)
        )`
      ).run();
      await db.prepare(
        `INSERT OR IGNORE INTO career_taxonomy_nodes_v273 (id, kind, level, parent_id, slug, label_en, label_or, sort_order, active)
         SELECT id, kind, 1, '', slug, label_en, label_or, sort_order, active FROM career_taxonomy_nodes`
      ).run();
      await db.prepare(`DROP TABLE career_taxonomy_nodes`).run();
      await db.prepare(`ALTER TABLE career_taxonomy_nodes_v273 RENAME TO career_taxonomy_nodes`).run();
    }
  } catch {}

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_career_taxonomy_kind_active ON career_taxonomy_nodes(kind, active, sort_order)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_career_taxonomy_parent ON career_taxonomy_nodes(parent_id, kind, active, sort_order)`).run();

  for (const n of DEFAULT_CAREER_TAXONOMY) {
    await db.prepare(
      `INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, level, parent_id, slug, label_en, label_or, icon, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(n.id, n.kind, n.level, n.parent_id, n.slug, n.label_en, n.label_or, n.icon || '', n.sort_order, n.active).run();
  }

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS career_bilingual_snippets (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'general',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_career_snippets_cat_active ON career_bilingual_snippets(category, active, sort_order)`).run();

  for (const sn of DEFAULT_CAREER_SNIPPETS) {
    await db.prepare(
      `INSERT OR IGNORE INTO career_bilingual_snippets (id, category, title_en, title_or, body_en, body_or, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(sn.id, sn.category, sn.title_en, sn.title_or, sn.body_en, sn.body_or, sn.sort_order).run();
  }

  _schemaReady.add(db);
}

// ============================================================================
// PUBLIC: GET /api/public/careers/bootstrap
// ============================================================================
export async function handlePublicCareersBootstrap(request, env) {
  const fallbackTaxonomy = groupTaxonomy(DEFAULT_CAREER_TAXONOMY, false);
  const buildNavTracks = (tax, tCounts = {}, sCounts = {}) => (tax.tracks || []).map(tr => ({
    id: tr.id,
    slug: tr.slug,
    label_en: tr.label_en,
    label_or: tr.label_or || tr.label_en,
    icon: tr.icon || '🧭',
    sort_order: Number(tr.sort_order || 0),
    published_guides_count: Number(tCounts[tr.slug] || 0),
    subtracks: (tax.subtracks || [])
      .filter(sub => sub.parent_id === tr.id)
      .map(sub => ({
        id: sub.id,
        slug: sub.slug,
        label_en: sub.label_en,
        label_or: sub.label_or || sub.label_en,
        sort_order: Number(sub.sort_order || 0),
        published_guides_count: Number(sCounts[sub.slug] || 0)
      }))
  }));
  const emptyPayload = (pending) => json({
    ok: true,
    migration_pending: Boolean(pending),
    stats: {
      total_published: 0,
      featured_count: 0,
      tracks_count: fallbackTaxonomy.tracks.length,
      subtracks_count: fallbackTaxonomy.subtracks.length,
      role_streams_count: fallbackTaxonomy.role_streams.length,
      regions_count: fallbackTaxonomy.regions.length,
      track_counts: {},
      subtrack_counts: {},
      region_counts: {}
    },
    nav_tracks: buildNavTracks(fallbackTaxonomy),
    taxonomy: fallbackTaxonomy,
    featured: [],
    latest: []
  }, 200, { 'Cache-Control': 'public, max-age=15, s-maxage=300, stale-while-revalidate=60' });

  if (!env || !env.DB) return emptyPayload(true);

  try {
    const db = env.DB;
    let taxRows = [];
    let countRows = [];
    let regionRows = [];
    let featuredRows = [];
    let latestRows = [];

    const qTax = db.prepare(`SELECT * FROM career_taxonomy_nodes WHERE active = 1 ORDER BY kind ASC, sort_order ASC, label_en ASC`);
    const qTrackCounts = db.prepare(`SELECT track_slug, COUNT(*) AS cnt FROM careers_articles WHERE status = 'published' GROUP BY track_slug`);
    const qRegionCounts = db.prepare(`SELECT region_scope, COUNT(*) AS cnt FROM careers_articles WHERE status = 'published' GROUP BY region_scope`);
    const qFeatured = db.prepare(`SELECT * FROM careers_articles WHERE status = 'published' AND featured = 1 ORDER BY updated_at DESC LIMIT 6`);
    const qLatest = db.prepare(`SELECT * FROM careers_articles WHERE status = 'published' ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC LIMIT 48`);

    if (typeof db.batch === 'function') {
      const batchRes = await db.batch([qTax, qTrackCounts, qRegionCounts, qFeatured, qLatest]);
      taxRows = (batchRes[0] && batchRes[0].results) || [];
      countRows = (batchRes[1] && batchRes[1].results) || [];
      regionRows = (batchRes[2] && batchRes[2].results) || [];
      featuredRows = (batchRes[3] && batchRes[3].results) || [];
      latestRows = (batchRes[4] && batchRes[4].results) || [];
    } else {
      taxRows = ((await qTax.all()) || {}).results || [];
      countRows = ((await qTrackCounts.all()) || {}).results || [];
      regionRows = ((await qRegionCounts.all()) || {}).results || [];
      featuredRows = ((await qFeatured.all()) || {}).results || [];
      latestRows = ((await qLatest.all()) || {}).results || [];
    }

    const taxonomy = groupTaxonomy(taxRows.length ? taxRows : DEFAULT_CAREER_TAXONOMY, false);
    const trackCounts = {};
    let totalPublished = 0;
    for (const r of countRows) {
      const c = Number(r.cnt || 0);
      trackCounts[r.track_slug] = c;
      totalPublished += c;
    }
    const regionCounts = {};
    for (const r of regionRows) {
      regionCounts[r.region_scope] = Number(r.cnt || 0);
    }
    const subtrackCounts = {};
    for (const r of latestRows) {
      if (r.subtrack_slug) {
        subtrackCounts[r.subtrack_slug] = (subtrackCounts[r.subtrack_slug] || 0) + 1;
      }
    }

    return json({
      ok: true,
      migration_pending: false,
      stats: {
        total_published: totalPublished,
        featured_count: featuredRows.length,
        tracks_count: taxonomy.tracks.length,
        subtracks_count: taxonomy.subtracks.length,
        role_streams_count: taxonomy.role_streams.length,
        regions_count: taxonomy.regions.length,
        track_counts: trackCounts,
        subtrack_counts: subtrackCounts,
        region_counts: regionCounts
      },
      nav_tracks: buildNavTracks(taxonomy, trackCounts, subtrackCounts),
      taxonomy,
      featured: featuredRows.map(r => hydrateArticle(r, false)),
      latest: latestRows.map(r => hydrateArticle(r, false))
    }, 200, { 'Cache-Control': 'public, max-age=15, s-maxage=300, stale-while-revalidate=60' });
  } catch (err) {
    if (isMissingTableError(err)) return emptyPayload(true);
    return emptyPayload(true);
  }
}

// ============================================================================
// PUBLIC: GET /api/public/careers/list
// ============================================================================
export async function handlePublicCareersList(request, env, ctx = null) {
  const url = new URL(request.url);
  const track = str(url.searchParams.get('track'), 80).toLowerCase();
  const subtrack = str(url.searchParams.get('subtrack'), 80).toLowerCase();
  const roleStream = str(url.searchParams.get('role_stream'), 80).toLowerCase();
  const region = str(url.searchParams.get('region'), 80).toLowerCase();
  const stage = str(url.searchParams.get('stage'), 80).toLowerCase();
  const q = str(url.searchParams.get('q'), 120).toLowerCase();
  const slugParam = str(url.searchParams.get('slug'), 120).toLowerCase();
  const previewId = str(url.searchParams.get('preview_id'), 120);
  const previewToken = str(url.searchParams.get('preview_token'), 160);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 40));

  if (!env || !env.DB) {
    return json({ ok: true, migration_pending: true, items: [], total: 0, preview: false }, 200, { 'Cache-Control': 'no-store' });
  }

  try {
    // Draft / unpublished preview mode:
    //  Mode A: Temporary signed token (?preview_id=...&preview_token=... or ?slug=...&preview_token=...)
    //  Mode B: Authenticated admin staff session (?preview_id=...)
    if (previewId || previewToken) {
      let row = null;
      let previewMode = '';

      if (previewToken) {
        if (previewId) {
          row = await env.DB.prepare(`SELECT * FROM careers_articles WHERE (id = ? OR slug = ?) AND preview_token = ? LIMIT 1`)
            .bind(previewId, previewId, previewToken).first();
        } else if (slugParam) {
          row = await env.DB.prepare(`SELECT * FROM careers_articles WHERE slug = ? AND preview_token = ? LIMIT 1`)
            .bind(slugParam, previewToken).first();
        } else {
          row = await env.DB.prepare(`SELECT * FROM careers_articles WHERE preview_token = ? LIMIT 1`)
            .bind(previewToken).first();
        }
        if (!row) {
          return json({ ok: false, error: 'Temporary preview link is invalid or has been revoked.' }, 401, { 'Cache-Control': 'no-store' });
        }
        const expMs = row.preview_expires_at ? Date.parse(row.preview_expires_at) : 0;
        if (!expMs || Number.isNaN(expMs) || expMs < Date.now()) {
          return json({ ok: false, error: 'Temporary preview link has expired. Generate a fresh link in Admin Studio.' }, 401, { 'Cache-Control': 'no-store' });
        }
        previewMode = 'token';
      } else {
        let actor = null;
        try {
          actor = await getActor(request, env);
        } catch {
          actor = null;
        }
        if (!actor || !STAFF_ROLES.includes(actor.role)) {
          return json({ ok: false, error: 'Admin authentication or a valid temporary preview token is required to preview drafts.' }, 401, { 'Cache-Control': 'no-store' });
        }
        row = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ? OR slug = ? LIMIT 1`)
          .bind(previewId, previewId).first();
        if (!row) {
          return json({ ok: false, error: 'Career guide not found for preview.' }, 404, { 'Cache-Control': 'no-store' });
        }
        previewMode = 'admin';
      }

      const item = hydrateArticle(row, false);
      return json({
        ok: true,
        preview: true,
        preview_mode: previewMode,
        preview_expires_at: row.preview_expires_at || '',
        preview_item: item,
        items: [item],
        total: 1
      }, 200, { 'Cache-Control': 'no-store' });
    }

    const where = [`status = 'published'`];
    const binds = [];
    if (slugParam) {
      where.push(`slug = ?`);
      binds.push(slugParam);
    }
    if (track && track !== 'all') {
      where.push(`track_slug = ?`);
      binds.push(track);
    }
    if (subtrack && subtrack !== 'all') {
      where.push(`subtrack_slug = ?`);
      binds.push(subtrack);
    }
    if (roleStream && roleStream !== 'all') {
      where.push(`role_stream_slug = ?`);
      binds.push(roleStream);
    }
    if (region && region !== 'all') {
      where.push(`region_scope = ?`);
      binds.push(region);
    }
    if (stage && stage !== 'all') {
      where.push(`(career_stage = ? OR career_stage = 'all-stages')`);
      binds.push(stage);
    }
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push(`(LOWER(title_en) LIKE ? ESCAPE '\\' OR LOWER(title_or) LIKE ? ESCAPE '\\' OR LOWER(summary_en) LIKE ? ESCAPE '\\' OR LOWER(key_exams) LIKE ? ESCAPE '\\' OR LOWER(eligibility_summary) LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like, like);
    }

    const sql = `SELECT * FROM careers_articles WHERE ${where.join(' AND ')} ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC LIMIT ?`;
    const { results } = await env.DB.prepare(sql).bind(...binds, limit).all();
    const items = (results || []).map(r => hydrateArticle(r, false));
    if (q && items.length === 0) {
      logZeroResultSearch(env, q, 'careers', ctx);
    }

    return json({
      ok: true,
      migration_pending: false,
      preview: false,
      items,
      total: items.length
    }, 200, { 'Cache-Control': 'public, max-age=15, s-maxage=300, stale-while-revalidate=60' });
  } catch (err) {
    if (isMissingTableError(err)) {
      return json({ ok: true, migration_pending: true, items: [], total: 0, preview: false }, 200, { 'Cache-Control': 'no-store' });
    }
    throw err;
  }
}

// ============================================================================
// ADMIN: POST /api/admin/careers/preview-token
// ============================================================================
export async function handleAdminCareersPreviewToken(request, env, actor) {
  await ensureCareersSchema(env.DB);
  if (request.method.toUpperCase() !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }
  const body = await readJson(request, 20000);
  const targetId = str(body.id || body.article_id, 120);
  if (!targetId) throw validationError({ id: 'Career guide ID is required' });

  const existing = await env.DB.prepare(`SELECT id, slug, title_en, status FROM careers_articles WHERE id = ? OR slug = ? LIMIT 1`)
    .bind(targetId, targetId).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');

  const ttlHours = Math.max(1, Math.min(72, Number(body.ttl_hours) || 24));
  const token = randomHex(24);
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

  await env.DB.prepare(`UPDATE careers_articles SET preview_token = ?, preview_expires_at = ? WHERE id = ?`)
    .bind(token, expiresAt, existing.id).run();

  await audit(env, request, actor, 'careers.preview_token.create', 'careers_article', existing.id, {
    slug: existing.slug,
    ttl_hours: ttlHours,
    expires_at: expiresAt
  });

  const previewUrl = `/careers/?preview_id=${encodeURIComponent(existing.id)}&preview_token=${encodeURIComponent(token)}`;
  return json({
    ok: true,
    id: existing.id,
    slug: existing.slug,
    status: existing.status,
    preview_token: token,
    preview_expires_at: expiresAt,
    preview_url: previewUrl
  }, 200, { 'Cache-Control': 'no-store' });
}

// ============================================================================
// ADMIN: GET / POST / PUT / DELETE /api/admin/careers
// ============================================================================
export async function handleAdminCareers(request, env, actor, pathId = '') {
  await ensureCareersSchema(env.DB);
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (method === 'GET') {
    const statusFilter = str(url.searchParams.get('status'), 40).toLowerCase();
    const trackFilter = str(url.searchParams.get('track'), 80).toLowerCase();
    const subtrackFilter = str(url.searchParams.get('subtrack'), 80).toLowerCase();
    const roleFilter = str(url.searchParams.get('role_stream'), 80).toLowerCase();
    const regionFilter = str(url.searchParams.get('region'), 80).toLowerCase();
    const stageFilter = str(url.searchParams.get('stage'), 80).toLowerCase();
    const q = str(url.searchParams.get('q'), 120).toLowerCase();

    const where = ['1=1'];
    const binds = [];
    if (statusFilter && CAREER_STATUSES.includes(statusFilter)) {
      where.push('status = ?');
      binds.push(statusFilter);
    }
    if (trackFilter && trackFilter !== 'all') {
      where.push('track_slug = ?');
      binds.push(trackFilter);
    }
    if (subtrackFilter && subtrackFilter !== 'all') {
      where.push('subtrack_slug = ?');
      binds.push(subtrackFilter);
    }
    if (roleFilter && roleFilter !== 'all') {
      where.push('role_stream_slug = ?');
      binds.push(roleFilter);
    }
    if (regionFilter && regionFilter !== 'all') {
      where.push('region_scope = ?');
      binds.push(regionFilter);
    }
    if (stageFilter && stageFilter !== 'all') {
      where.push('career_stage = ?');
      binds.push(stageFilter);
    }
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push(`(LOWER(title_en) LIKE ? ESCAPE '\\' OR LOWER(title_or) LIKE ? ESCAPE '\\' OR LOWER(slug) LIKE ? ESCAPE '\\' OR LOWER(key_exams) LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like);
    }

    const [articlesRes, taxRes, statsRes, featRes, snipRes] = await Promise.all([
      env.DB.prepare(`SELECT * FROM careers_articles WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT 200`).bind(...binds).all(),
      env.DB.prepare(`SELECT * FROM career_taxonomy_nodes ORDER BY kind ASC, sort_order ASC, label_en ASC`).all(),
      env.DB.prepare(`SELECT status, COUNT(*) AS cnt FROM careers_articles GROUP BY status`).all(),
      env.DB.prepare(`SELECT COUNT(*) AS cnt FROM careers_articles WHERE featured = 1`).first(),
      env.DB.prepare(`SELECT * FROM career_bilingual_snippets ORDER BY sort_order ASC, title_en ASC`).all()
    ]);

    const taxGrouped = groupTaxonomy(taxRes.results || [], true);
    const snippets = snipRes.results || [];
    const counts = {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
      featured: Number((featRes && featRes.cnt) || 0),
      tracks_count: taxGrouped.tracks.length,
      subtracks_count: taxGrouped.subtracks.length,
      role_streams_count: taxGrouped.role_streams.length,
      taxonomy_total: taxGrouped.tracks.length + taxGrouped.subtracks.length + taxGrouped.role_streams.length,
      snippets_count: snippets.length
    };
    for (const r of (statsRes.results || [])) {
      const c = Number(r.cnt || 0);
      counts.total += c;
      if (r.status === 'published' || r.status === 'draft' || r.status === 'archived') {
        counts[r.status] = c;
      }
    }

    return json({
      ok: true,
      items: (articlesRes.results || []).map(r => hydrateArticle(r, true)),
      taxonomy: taxGrouped,
      snippets,
      stats: counts
    }, 200, { 'Cache-Control': 'no-store' });
  }

  if (method === 'DELETE') {
    const targetId = str(pathId || url.searchParams.get('id'), 120);
    if (!targetId) throw validationError({ id: 'Career guide ID is required' });
    const existing = await env.DB.prepare(`SELECT id, title_en, slug FROM careers_articles WHERE id = ?`).bind(targetId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
    await env.DB.prepare(`DELETE FROM careers_articles WHERE id = ?`).bind(targetId).run();
    await audit(env, request, actor, 'careers.delete', 'careers_article', targetId, { slug: existing.slug, title: existing.title_en });
    await invalidateCareersCaches(request, existing.slug);
    return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const body = await readJson(request, 200000);
    const action = str(body.action, 40).toLowerCase();

    // Action: delete via POST
    if (action === 'delete') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Career guide ID is required' });
      const existing = await env.DB.prepare(`SELECT id, title_en, slug FROM careers_articles WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
      await env.DB.prepare(`DELETE FROM careers_articles WHERE id = ?`).bind(targetId).run();
      await audit(env, request, actor, 'careers.delete', 'careers_article', targetId, { slug: existing.slug, title: existing.title_en });
      await invalidateCareersCaches(request, existing.slug);
      return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    // Action: duplicate an existing guide as a draft copy
    if (action === 'duplicate') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Career guide ID is required' });
      const existing = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');

      const newId = `car-${crypto.randomUUID().slice(0, 12)}`;
      const nowIso = new Date().toISOString();
      const copyTitleEn = `${existing.title_en} (Copy)`.slice(0, 240);
      const copyTitleOr = existing.title_or ? `${existing.title_or} (ନକଲ)`.slice(0, 240) : '';
      const copySlug = `${slugify(existing.slug, 'career-guide')}-copy-${newId.slice(-5)}`;

      await env.DB.prepare(
        `INSERT INTO careers_articles (
           id, slug, title_en, title_or, track_slug, subtrack_slug, role_stream_slug, region_scope, career_stage,
           summary_en, summary_or, roadmap_body_en, roadmap_body_or,
           eligibility_summary, salary_band, key_exams, official_links_json,
           status, featured, preview_token, preview_expires_at, created_at, updated_at, published_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, '', '', ?, ?, NULL)`
      ).bind(
        newId, copySlug, copyTitleEn, copyTitleOr,
        existing.track_slug || 'civil-services',
        existing.subtrack_slug || '',
        existing.role_stream_slug || '',
        existing.region_scope || 'odisha',
        existing.career_stage || 'graduate',
        existing.summary_en || '',
        existing.summary_or || '',
        existing.roadmap_body_en || '',
        existing.roadmap_body_or || '',
        existing.eligibility_summary || '',
        existing.salary_band || '',
        existing.key_exams || '',
        existing.official_links_json || '[]',
        nowIso, nowIso
      ).run();

      await audit(env, request, actor, 'careers.duplicate', 'careers_article', newId, { source_id: targetId, slug: copySlug });
      await invalidateCareersCaches(request, copySlug);
      const created = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(newId).first();
      return json({ ok: true, item: hydrateArticle(created, true) }, 201, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    // Action: toggle_status / status change
    if (action === 'toggle_status' || action === 'set_status') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Career guide ID is required' });
      const existing = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
      const requestedStatus = str(body.status, 30).toLowerCase();
      const nextStatus = CAREER_STATUSES.includes(requestedStatus)
        ? requestedStatus
        : (existing.status === 'published' ? 'draft' : 'published');
      const nowIso = new Date().toISOString();
      const publishedAt = nextStatus === 'published' ? (existing.published_at || nowIso) : existing.published_at;
      await env.DB.prepare(`UPDATE careers_articles SET status = ?, published_at = ?, updated_at = ? WHERE id = ?`)
        .bind(nextStatus, publishedAt, nowIso, targetId).run();
      await audit(env, request, actor, nextStatus === 'published' ? 'careers.publish' : 'careers.unpublish', 'careers_article', targetId, { from: existing.status, to: nextStatus });
      await invalidateCareersCaches(request, existing.slug);
      const updated = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(targetId).first();
      return json({ ok: true, item: hydrateArticle(updated, true) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    // Default: Create or Update career roadmap
    const id = str(body.id || pathId, 120);
    const titleEn = str(body.title_en, 240);
    if (!titleEn) throw validationError({ title_en: 'English title is required' });

    const titleOr = str(body.title_or, 240);
    const trackSlug = slugify(body.track_slug || 'civil-services', 'civil-services');
    const subtrackSlug = body.subtrack_slug ? slugify(body.subtrack_slug, '') : '';
    const roleStreamSlug = body.role_stream_slug ? slugify(body.role_stream_slug, '') : '';
    const regionScope = slugify(body.region_scope || 'odisha', 'odisha');
    const careerStage = slugify(body.career_stage || 'graduate', 'graduate');
    const summaryEn = str(body.summary_en, 1200);
    const summaryOr = str(body.summary_or, 1200);
    const roadmapBodyEn = str(body.roadmap_body_en, 40000);
    const roadmapBodyOr = str(body.roadmap_body_or, 40000);
    const eligibilitySummary = str(body.eligibility_summary, 600);
    const salaryBand = str(body.salary_band, 240);
    const keyExams = str(body.key_exams, 500);
    const linksArr = safeLinksArray(body.official_links !== undefined ? body.official_links : body.official_links_json);
    const officialLinksJson = JSON.stringify(linksArr);
    const rawStatus = str(body.status, 30).toLowerCase();
    const status = CAREER_STATUSES.includes(rawStatus) ? rawStatus : 'draft';
    const featured = body.featured ? 1 : 0;
    const nowIso = new Date().toISOString();

    const baseSlug = slugify(body.slug || titleEn, 'career-guide');

    if (id) {
      const existing = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career guide not found');
      let finalSlug = baseSlug;
      const collision = await env.DB.prepare(`SELECT id FROM careers_articles WHERE slug = ? AND id != ?`).bind(finalSlug, id).first();
      if (collision) finalSlug = `${baseSlug}-${id.slice(0, 6)}`;
      const publishedAt = status === 'published' ? (existing.published_at || nowIso) : existing.published_at;

      await env.DB.prepare(
        `UPDATE careers_articles SET
           slug = ?, title_en = ?, title_or = ?, track_slug = ?, subtrack_slug = ?, role_stream_slug = ?,
           region_scope = ?, career_stage = ?,
           summary_en = ?, summary_or = ?, roadmap_body_en = ?, roadmap_body_or = ?,
           eligibility_summary = ?, salary_band = ?, key_exams = ?, official_links_json = ?,
           status = ?, featured = ?, updated_at = ?, published_at = ?
         WHERE id = ?`
      ).bind(
        finalSlug, titleEn, titleOr, trackSlug, subtrackSlug, roleStreamSlug,
        regionScope, careerStage,
        summaryEn, summaryOr, roadmapBodyEn, roadmapBodyOr,
        eligibilitySummary, salaryBand, keyExams, officialLinksJson,
        status, featured, nowIso, publishedAt, id
      ).run();

      await audit(env, request, actor, 'careers.update', 'careers_article', id, { slug: finalSlug, status });
      await invalidateCareersCaches(request, finalSlug);
      const updated = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: hydrateArticle(updated, true) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    const newId = `car-${crypto.randomUUID().slice(0, 12)}`;
    let finalSlug = baseSlug;
    const collision = await env.DB.prepare(`SELECT id FROM careers_articles WHERE slug = ?`).bind(finalSlug).first();
    if (collision) finalSlug = `${baseSlug}-${newId.slice(-6)}`;
    const publishedAt = status === 'published' ? nowIso : null;

    await env.DB.prepare(
      `INSERT INTO careers_articles (
         id, slug, title_en, title_or, track_slug, subtrack_slug, role_stream_slug,
         region_scope, career_stage,
         summary_en, summary_or, roadmap_body_en, roadmap_body_or,
         eligibility_summary, salary_band, key_exams, official_links_json,
         status, featured, preview_token, preview_expires_at, created_at, updated_at, published_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?)`
    ).bind(
      newId, finalSlug, titleEn, titleOr, trackSlug, subtrackSlug, roleStreamSlug,
      regionScope, careerStage,
      summaryEn, summaryOr, roadmapBodyEn, roadmapBodyOr,
      eligibilitySummary, salaryBand, keyExams, officialLinksJson,
      status, featured, nowIso, nowIso, publishedAt
    ).run();

    await audit(env, request, actor, 'careers.create', 'careers_article', newId, { slug: finalSlug, status });
    await invalidateCareersCaches(request, finalSlug);
    const created = await env.DB.prepare(`SELECT * FROM careers_articles WHERE id = ?`).bind(newId).first();
    return json({ ok: true, item: hydrateArticle(created, true) }, 201, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ============================================================================
// ADMIN: GET / POST / PUT / PATCH / DELETE /api/admin/careers/taxonomy
// ============================================================================
export async function handleAdminCareersTaxonomy(request, env, actor, pathId = '') {
  await ensureCareersSchema(env.DB);
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM career_taxonomy_nodes ORDER BY kind ASC, sort_order ASC, label_en ASC`
    ).all();
    return json({ ok: true, taxonomy: groupTaxonomy(results || [], true) }, 200, { 'Cache-Control': 'no-store' });
  }

  if (method === 'DELETE') {
    const targetId = str(pathId || url.searchParams.get('id'), 120);
    if (!targetId) throw validationError({ id: 'Taxonomy node ID is required' });
    const existing = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(targetId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
    await env.DB.prepare(`DELETE FROM career_taxonomy_nodes WHERE id = ? OR parent_id = ?`).bind(targetId, targetId).run();
    await audit(env, request, actor, 'careers.taxonomy.delete', 'career_taxonomy', targetId, { kind: existing.kind, slug: existing.slug });
    await invalidateCareersCaches(request);
    return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const body = await readJson(request, 25000);
    const action = str(body.action, 40).toLowerCase();

    if (action === 'delete') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Taxonomy node ID is required' });
      const existing = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
      await env.DB.prepare(`DELETE FROM career_taxonomy_nodes WHERE id = ? OR parent_id = ?`).bind(targetId, targetId).run();
      await audit(env, request, actor, 'careers.taxonomy.delete', 'career_taxonomy', targetId, { kind: existing.kind, slug: existing.slug });
      await invalidateCareersCaches(request);
      return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    if (action === 'toggle_active') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Taxonomy node ID is required' });
      const existing = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
      const nextActive = Number(existing.active) === 1 ? 0 : 1;
      await env.DB.prepare(`UPDATE career_taxonomy_nodes SET active = ? WHERE id = ?`).bind(nextActive, targetId).run();
      await audit(env, request, actor, 'careers.taxonomy.toggle', 'career_taxonomy', targetId, { active: nextActive });
      await invalidateCareersCaches(request);
      const updated = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(targetId).first();
      return json({ ok: true, node: normalizeNode(updated) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    const editId = str(body.id || pathId, 120);
    const kind = str(body.kind, 24).toLowerCase();
    if (!editId && !CAREER_TAXONOMY_KINDS.includes(kind)) {
      throw validationError({ kind: 'kind must be track, subtrack, role_stream, region, or stage' });
    }
    const labelEn = str(body.label_en, 140);
    if (!labelEn) {
      throw validationError({ label_en: 'English label is required' });
    }
    const labelOr = str(body.label_or, 140);
    const parentId = str(body.parent_id, 120);
    const icon = str(body.icon, 16);
    const descEn = str(body.description_en, 300);
    const descOr = str(body.description_or, 300);
    const active = body.active !== undefined ? (body.active ? 1 : 0) : 1;

    if (editId) {
      const existing = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(editId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
      const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : Number(existing.sort_order || 0);
      await env.DB.prepare(
        `UPDATE career_taxonomy_nodes
         SET label_en = ?, label_or = ?, icon = ?, description_en = ?, description_or = ?, sort_order = ?, active = ?
         WHERE id = ?`
      ).bind(labelEn, labelOr, icon || existing.icon || '', descEn, descOr, sortOrder, active, editId).run();
      await audit(env, request, actor, 'careers.taxonomy.update', 'career_taxonomy', editId, { kind: existing.kind, label_en: labelEn });
      await invalidateCareersCaches(request);
      const updated = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(editId).first();
      return json({ ok: true, node: normalizeNode(updated) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    const level = kind === 'subtrack' ? 2 : (kind === 'role_stream' ? 3 : 1);
    const slug = slugify(body.slug || labelEn, `${kind}-option`);
    const existing = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE kind = ? AND parent_id = ? AND slug = ?`)
      .bind(kind, parentId, slug).first();
    if (existing) {
      const sortOrder = Number.isFinite(Number(body.sort_order)) && Number(body.sort_order) > 0
        ? Number(body.sort_order)
        : Number(existing.sort_order || 0);
      await env.DB.prepare(
        `UPDATE career_taxonomy_nodes SET label_en = ?, label_or = ?, icon = ?, description_en = ?, description_or = ?, sort_order = ?, active = 1 WHERE id = ?`
      ).bind(labelEn, labelOr || existing.label_or, icon || existing.icon || '', descEn || existing.description_en || '', descOr || existing.description_or || '', sortOrder, existing.id).run();
      await audit(env, request, actor, 'careers.taxonomy.update', 'career_taxonomy', existing.id, { kind, slug, label_en: labelEn });
      await invalidateCareersCaches(request);
      const updated = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(existing.id).first();
      return json({ ok: true, node: normalizeNode(updated) }, 200, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
    }

    const maxRow = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS mx FROM career_taxonomy_nodes WHERE kind = ? AND parent_id = ?`)
      .bind(kind, parentId).first();
    const sortOrder = Number.isFinite(Number(body.sort_order)) && Number(body.sort_order) > 0
      ? Number(body.sort_order)
      : Number(maxRow?.mx || 0) + 1;
    const nodeId = `ctax-${kind}-${slug}-${crypto.randomUUID().slice(0, 6)}`;
    await env.DB.prepare(
      `INSERT INTO career_taxonomy_nodes (id, kind, level, parent_id, slug, label_en, label_or, icon, description_en, description_or, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(nodeId, kind, level, parentId, slug, labelEn, labelOr, icon, descEn, descOr, sortOrder, active).run();

    await audit(env, request, actor, 'careers.taxonomy.create', 'career_taxonomy', nodeId, { kind, parent_id: parentId, slug, label_en: labelEn });
    await invalidateCareersCaches(request);
    const created = await env.DB.prepare(`SELECT * FROM career_taxonomy_nodes WHERE id = ?`).bind(nodeId).first();
    return json({ ok: true, node: normalizeNode(created) }, 201, { 'Cache-Control': 'no-store', 'X-CSO-Cache-Purged': '1' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ============================================================================
// ADMIN: GET / POST / PUT / PATCH / DELETE /api/admin/careers/snippets
// ============================================================================
export async function handleAdminCareersSnippets(request, env, actor, pathId = '') {
  await ensureCareersSchema(env.DB);
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (method === 'GET') {
    const category = str(url.searchParams.get('category'), 40).toLowerCase();
    const q = str(url.searchParams.get('q'), 120).toLowerCase();
    const where = ['1=1'];
    const binds = [];
    if (category && category !== 'all') {
      where.push('category = ?');
      binds.push(category);
    }
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push(`(LOWER(title_en) LIKE ? ESCAPE '\\' OR LOWER(title_or) LIKE ? ESCAPE '\\' OR LOWER(body_en) LIKE ? ESCAPE '\\' OR LOWER(body_or) LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like);
    }
    const { results } = await env.DB.prepare(
      `SELECT * FROM career_bilingual_snippets WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, title_en ASC`
    ).bind(...binds).all();
    return json({ ok: true, snippets: results || [] }, 200, { 'Cache-Control': 'no-store' });
  }

  if (method === 'DELETE') {
    const targetId = str(pathId || url.searchParams.get('id'), 120);
    if (!targetId) throw validationError({ id: 'Snippet ID is required' });
    const existing = await env.DB.prepare(`SELECT id, title_en FROM career_bilingual_snippets WHERE id = ?`).bind(targetId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Snippet not found');
    await env.DB.prepare(`DELETE FROM career_bilingual_snippets WHERE id = ?`).bind(targetId).run();
    await audit(env, request, actor, 'careers.snippet.delete', 'career_snippet', targetId, { title: existing.title_en });
    return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store' });
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const body = await readJson(request, 60000);
    const action = str(body.action, 40).toLowerCase();

    if (action === 'delete') {
      const targetId = str(body.id || pathId, 120);
      if (!targetId) throw validationError({ id: 'Snippet ID is required' });
      const existing = await env.DB.prepare(`SELECT id, title_en FROM career_bilingual_snippets WHERE id = ?`).bind(targetId).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Snippet not found');
      await env.DB.prepare(`DELETE FROM career_bilingual_snippets WHERE id = ?`).bind(targetId).run();
      await audit(env, request, actor, 'careers.snippet.delete', 'career_snippet', targetId, { title: existing.title_en });
      return json({ ok: true, deleted: true, id: targetId }, 200, { 'Cache-Control': 'no-store' });
    }

    const id = str(body.id || pathId, 120);
    const titleEn = str(body.title_en, 160);
    if (!titleEn) throw validationError({ title_en: 'Snippet English title is required' });
    const titleOr = str(body.title_or, 160);
    const rawCat = str(body.category, 40).toLowerCase();
    const category = CAREER_SNIPPET_CATEGORIES.includes(rawCat) ? rawCat : 'general';
    const bodyEn = str(body.body_en, 12000);
    const bodyOr = str(body.body_or, 12000);
    const active = body.active !== undefined ? (body.active ? 1 : 0) : 1;
    const nowIso = new Date().toISOString();

    if (id) {
      const existing = await env.DB.prepare(`SELECT * FROM career_bilingual_snippets WHERE id = ?`).bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Snippet not found');
      const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : Number(existing.sort_order || 0);
      await env.DB.prepare(
        `UPDATE career_bilingual_snippets
         SET category = ?, title_en = ?, title_or = ?, body_en = ?, body_or = ?, sort_order = ?, active = ?, updated_at = ?
         WHERE id = ?`
      ).bind(category, titleEn, titleOr, bodyEn, bodyOr, sortOrder, active, nowIso, id).run();
      await audit(env, request, actor, 'careers.snippet.update', 'career_snippet', id, { category, title: titleEn });
      const updated = await env.DB.prepare(`SELECT * FROM career_bilingual_snippets WHERE id = ?`).bind(id).first();
      return json({ ok: true, snippet: updated }, 200, { 'Cache-Control': 'no-store' });
    }

    const maxRow = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS mx FROM career_bilingual_snippets`).first();
    const sortOrder = Number.isFinite(Number(body.sort_order)) && Number(body.sort_order) > 0
      ? Number(body.sort_order)
      : Number(maxRow?.mx || 0) + 1;
    const newId = `csnip-${slugify(titleEn, 'block').slice(0, 32)}-${crypto.randomUUID().slice(0, 6)}`;
    await env.DB.prepare(
      `INSERT INTO career_bilingual_snippets (id, category, title_en, title_or, body_en, body_or, sort_order, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, category, titleEn, titleOr, bodyEn, bodyOr, sortOrder, active, nowIso, nowIso).run();
    await audit(env, request, actor, 'careers.snippet.create', 'career_snippet', newId, { category, title: titleEn });
    const created = await env.DB.prepare(`SELECT * FROM career_bilingual_snippets WHERE id = ?`).bind(newId).first();
    return json({ ok: true, snippet: created }, 201, { 'Cache-Control': 'no-store' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
