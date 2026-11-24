-- v273 Careers Publishing House: 3-Layer Taxonomy, Preview Tokens & Reusable Bilingual Snippets
-- Upgrades career_taxonomy_nodes (L1 Track -> L2 Sub-Track -> L3 Role/Pathway + Region + Stage),
-- upgrades careers_articles (subtrack_slug, role_stream_slug, preview_token, preview_expires_at),
-- and creates + pre-seeds career_bilingual_snippets (10 reusable EN + Odia blocks).

-- 1. Ensure base tables exist (safe on fresh DB or existing v269 DB)
CREATE TABLE IF NOT EXISTS careers_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  track_slug TEXT NOT NULL DEFAULT 'civil-services',
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS career_taxonomy_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_or TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(kind, slug)
);

-- 2. Upgrade careers_articles cleanly (adds subtrack_slug, role_stream_slug, preview_token, preview_expires_at,
--    and relaxes region_scope CHECK so custom admin-created regions persist seamlessly)
CREATE TABLE IF NOT EXISTS careers_articles_v273 (
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
);

INSERT OR IGNORE INTO careers_articles_v273 (
  id, slug, title_en, title_or, track_slug, region_scope, career_stage,
  summary_en, summary_or, roadmap_body_en, roadmap_body_or,
  eligibility_summary, salary_band, key_exams, official_links_json,
  status, featured, created_at, updated_at, published_at
)
SELECT
  id, slug, title_en, title_or, track_slug, region_scope, career_stage,
  summary_en, summary_or, roadmap_body_en, roadmap_body_or,
  eligibility_summary, salary_band, key_exams, official_links_json,
  status, featured, created_at, updated_at, published_at
FROM careers_articles;

DROP TABLE careers_articles;
ALTER TABLE careers_articles_v273 RENAME TO careers_articles;

CREATE INDEX IF NOT EXISTS idx_careers_articles_status_track
  ON careers_articles(status, track_slug, region_scope, career_stage);

CREATE INDEX IF NOT EXISTS idx_careers_articles_l1_l2_l3
  ON careers_articles(status, track_slug, subtrack_slug, role_stream_slug);

CREATE INDEX IF NOT EXISTS idx_careers_articles_featured
  ON careers_articles(status, featured DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_careers_articles_slug
  ON careers_articles(slug);

CREATE INDEX IF NOT EXISTS idx_careers_articles_preview_token
  ON careers_articles(preview_token);

-- 3. Upgrade career_taxonomy_nodes cleanly for 3-layer hierarchy (L1 track -> L2 subtrack -> L3 role_stream) + region + stage
CREATE TABLE IF NOT EXISTS career_taxonomy_nodes_v273 (
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
);

INSERT OR IGNORE INTO career_taxonomy_nodes_v273 (
  id, kind, level, parent_id, slug, label_en, label_or, sort_order, active
)
SELECT
  id,
  kind,
  CASE WHEN kind = 'subtrack' THEN 2 WHEN kind = 'role_stream' THEN 3 ELSE 1 END,
  '',
  slug,
  label_en,
  label_or,
  sort_order,
  active
FROM career_taxonomy_nodes;

DROP TABLE career_taxonomy_nodes;
ALTER TABLE career_taxonomy_nodes_v273 RENAME TO career_taxonomy_nodes;

CREATE INDEX IF NOT EXISTS idx_career_taxonomy_kind_active
  ON career_taxonomy_nodes(kind, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_career_taxonomy_parent
  ON career_taxonomy_nodes(parent_id, kind, active, sort_order);

-- Pre-seed core L1 Tracks, Regions, Stages (idempotent)
INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, level, parent_id, slug, label_en, label_or, icon, sort_order, active) VALUES
  ('ctax-track-civil-services', 'track', 1, '', 'civil-services', 'Civil Services', 'ସିଭିଲ୍ ସର୍ଭିସେସ୍', '🏛️', 1, 1),
  ('ctax-track-engineering-it', 'track', 1, '', 'engineering-it', 'Engineering / IT', 'ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି', '💻', 2, 1),
  ('ctax-track-banking-finance', 'track', 1, '', 'banking-finance', 'Banking & Finance', 'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି', '🏦', 3, 1),
  ('ctax-track-healthcare', 'track', 1, '', 'healthcare', 'Healthcare', 'ସ୍ୱାସ୍ଥ୍ୟସେବା', '🩺', 4, 1),
  ('ctax-track-agriculture', 'track', 1, '', 'agriculture', 'Agriculture', 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ', '🌾', 5, 1),
  ('ctax-track-pathways', 'track', 1, '', 'pathways', 'Career Stage & Pathways', 'କ୍ୟାରିୟର ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗଦର୍ଶନ', '🧭', 6, 1),
  ('ctax-region-odisha', 'region', 1, '', 'odisha', 'Odisha', 'ଓଡ଼ିଶା', '📍', 1, 1),
  ('ctax-region-central', 'region', 1, '', 'central', 'Central', 'କେନ୍ଦ୍ର ସରକାର', '🇮🇳', 2, 1),
  ('ctax-region-all-india', 'region', 1, '', 'all-india', 'All Over India', 'ସମଗ୍ର ଭାରତ', '🌏', 3, 1),
  ('ctax-stage-after-10th-12th', 'stage', 1, '', 'after-10th-12th', 'After 10th / 12th', 'ଦଶମ / ଦ୍ୱାଦଶ ପରେ', '🎒', 1, 1),
  ('ctax-stage-graduate', 'stage', 1, '', 'graduate', 'Graduate', 'ସ୍ନାତକ', '🎓', 2, 1),
  ('ctax-stage-postgraduate', 'stage', 1, '', 'postgraduate', 'Postgraduate', 'ସ୍ନାତକୋତ୍ତର', '📘', 3, 1),
  ('ctax-stage-internship-apprenticeship', 'stage', 1, '', 'internship-apprenticeship', 'Internship & Apprenticeship', 'ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍', '🛠️', 4, 1),
  ('ctax-stage-all-stages', 'stage', 1, '', 'all-stages', 'All Stages', 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ', '✨', 5, 1);

-- Pre-seed L2 Sub-Tracks / Domains under each L1 Career Track
INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, level, parent_id, slug, label_en, label_or, sort_order, active) VALUES
  ('ctax-sub-odisha-state-pcs', 'subtrack', 2, 'ctax-track-civil-services', 'odisha-state-pcs', 'Odisha State Civil Services (OPSC)', 'ଓଡ଼ିଶା ରାଜ୍ୟ ପ୍ରଶାସନିକ ସେବା (OPSC)', 1, 1),
  ('ctax-sub-union-civil-services', 'subtrack', 2, 'ctax-track-civil-services', 'union-civil-services', 'Union Civil Services (UPSC)', 'କେନ୍ଦ୍ର ଲୋକସେବା (UPSC)', 2, 1),
  ('ctax-sub-psu-gate-engineering', 'subtrack', 2, 'ctax-track-engineering-it', 'psu-gate-engineering', 'GATE, PSU & State Engineering', 'GATE, PSU ଓ ରାଜ୍ୟ ଇଞ୍ଜିନିୟରିଂ', 1, 1),
  ('ctax-sub-software-ai-cloud', 'subtrack', 2, 'ctax-track-engineering-it', 'software-ai-cloud', 'Software, AI & Cloud IT', 'ସଫ୍ଟୱେର୍, AI ଓ କ୍ଲାଉଡ୍ ଆଇଟି', 2, 1),
  ('ctax-sub-public-sector-banks', 'subtrack', 2, 'ctax-track-banking-finance', 'public-sector-banks', 'Public Sector & Regulatory Banks', 'ସରକାରୀ ବ୍ୟାଙ୍କ ଓ ନିୟାମକ ସଂସ୍ଥା', 1, 1),
  ('ctax-sub-insurance-finance', 'subtrack', 2, 'ctax-track-banking-finance', 'insurance-finance', 'Insurance, Accounting & Finance', 'ବୀମା, ଆକାଉଣ୍ଟିଂ ଓ ଅର୍ଥନୀତି', 2, 1),
  ('ctax-sub-medical-doctors', 'subtrack', 2, 'ctax-track-healthcare', 'medical-doctors', 'Medical, Dental & AYUSH Cadre', 'ଡାକ୍ତରୀ, ଦନ୍ତ ଓ ଆୟୁଷ ସେବା', 1, 1),
  ('ctax-sub-nursing-allied', 'subtrack', 2, 'ctax-track-healthcare', 'nursing-allied', 'Nursing, Pharmacy & Allied Health', 'ନର୍ସିଂ, ଫାର୍ମାସୀ ଓ ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ', 2, 1),
  ('ctax-sub-agri-officers', 'subtrack', 2, 'ctax-track-agriculture', 'agri-officers', 'Agricultural & Allied State Officers', 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ ଅଧିକାରୀ', 1, 1),
  ('ctax-sub-agri-research-ouat', 'subtrack', 2, 'ctax-track-agriculture', 'agri-research-ouat', 'OUAT, ICAR & Agri-Tech Research', 'OUAT, ICAR ଓ କୃଷି ଗବେଷଣା', 2, 1),
  ('ctax-sub-school-college-tracks', 'subtrack', 2, 'ctax-track-pathways', 'school-college-tracks', 'After 10th / 12th & Degree Streams', 'ଦଶମ / ଦ୍ୱାଦଶ ଓ ସ୍ନାତକ ମାର୍ଗ', 1, 1),
  ('ctax-sub-skill-apprenticeship', 'subtrack', 2, 'ctax-track-pathways', 'skill-apprenticeship', 'Skill India, ITI & Apprenticeships', 'ଦକ୍ଷତା ବିକାଶ, ITI ଓ ଆପ୍ରେଣ୍ଟିସ୍', 2, 1);

-- Pre-seed L3 Roles / Pathways under L2 Sub-Tracks
INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, level, parent_id, slug, label_en, label_or, sort_order, active) VALUES
  ('ctax-role-oas-ops-ofs', 'role_stream', 3, 'ctax-sub-odisha-state-pcs', 'oas-ops-ofs', 'OAS / OPS / OFS Group-A Officer', 'OAS / OPS / OFS ଗ୍ରୁପ୍-ଏ ଅଧିକାରୀ', 1, 1),
  ('ctax-role-ors-otds', 'role_stream', 3, 'ctax-sub-odisha-state-pcs', 'ors-otds', 'ORS / OTS / Group-B Executive', 'ORS / OTS / ଗ୍ରୁପ୍-ବି ଅଧିକାରୀ', 2, 1),
  ('ctax-role-ias-ips-ifs', 'role_stream', 3, 'ctax-sub-union-civil-services', 'ias-ips-ifs', 'IAS / IPS / IFS All-India Services', 'IAS / IPS / IFS ସର୍ବଭାରତୀୟ ସେବା', 1, 1),
  ('ctax-role-opsc-aee-je', 'role_stream', 3, 'ctax-sub-psu-gate-engineering', 'opsc-aee-je', 'OPSC AEE & OSSC Junior Engineer', 'OPSC AEE ଓ OSSC ଜୁନିୟର ଇଞ୍ଜିନିୟର', 1, 1),
  ('ctax-role-fullstack-ai-eng', 'role_stream', 3, 'ctax-sub-software-ai-cloud', 'fullstack-ai-eng', 'Full-Stack, Data & AI Engineer', 'ଫୁଲ୍-ଷ୍ଟାକ୍, ଡାଟା ଓ AI ଇଞ୍ଜିନିୟର', 1, 1),
  ('ctax-role-rbi-sbi-ibps-po', 'role_stream', 3, 'ctax-sub-public-sector-banks', 'rbi-sbi-ibps-po', 'RBI Grade B / SBI PO / IBPS PO', 'RBI ଗ୍ରେଡ୍-ବି / SBI PO / IBPS PO', 1, 1),
  ('ctax-role-nabard-lic-ca', 'role_stream', 3, 'ctax-sub-insurance-finance', 'nabard-lic-ca', 'NABARD Grade A / LIC AAO / CA', 'NABARD ଗ୍ରେଡ୍-ଏ / LIC AAO / CA', 1, 1),
  ('ctax-role-omhs-medical-officer', 'role_stream', 3, 'ctax-sub-medical-doctors', 'omhs-medical-officer', 'OPSC Medical Officer (OMHS)', 'OPSC ମେଡିକାଲ୍ ଅଫିସର୍ (OMHS)', 1, 1),
  ('ctax-role-osssc-nursing-pharma', 'role_stream', 3, 'ctax-sub-nursing-allied', 'osssc-nursing-pharma', 'OSSSC Nursing Officer & Pharmacist', 'OSSSC ନର୍ସିଂ ଅଫିସର୍ ଓ ଫାର୍ମାସିଷ୍ଟ', 1, 1),
  ('ctax-role-opsc-aao-aho', 'role_stream', 3, 'ctax-sub-agri-officers', 'opsc-aao-aho', 'OPSC AAO / AHO / Soil Conservation', 'OPSC AAO / AHO / ମୃତ୍ତିକା ସଂରକ୍ଷଣ', 1, 1),
  ('ctax-role-plus2-entrance-guide', 'role_stream', 3, 'ctax-sub-school-college-tracks', 'plus2-entrance-guide', 'JEE / NEET / CUET / CLAT Track', 'JEE / NEET / CUET / CLAT ମାର୍ଗ', 1, 1),
  ('ctax-role-nats-naps-iti', 'role_stream', 3, 'ctax-sub-skill-apprenticeship', 'nats-naps-iti', 'NATS / NAPS & Odisha Skill Centres', 'NATS / NAPS ଓ ଓଡ଼ିଶା ଦକ୍ଷତା କେନ୍ଦ୍ର', 1, 1);

-- 4. Create & pre-seed career_bilingual_snippets (10 reusable English + Odia blocks)
CREATE TABLE IF NOT EXISTS career_bilingual_snippets (
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
);

CREATE INDEX IF NOT EXISTS idx_career_snippets_cat_active
  ON career_bilingual_snippets(category, active, sort_order);

INSERT OR IGNORE INTO career_bilingual_snippets (id, category, title_en, title_or, body_en, body_or, sort_order, active) VALUES
  (
    'csnip-01-odisha-eligibility',
    'eligibility',
    'Odisha State Eligibility & Age Relaxation',
    'ଓଡ଼ିଶା ରାଜ୍ୟ ଯୋଗ୍ୟତା ଓ ବୟସ କୋହଳ',
    '### Eligibility & Age Criteria (Odisha Norms)
- Educational Qualification: Bachelor Degree from a recognised university (or equivalent qualification specified in the official notification).
- Age Limit: 21 to 38 years as on 1st January of the recruitment year.
- Upper Age Relaxation: +5 years for SC / ST / SEBC / Women / Ex-Servicemen; +10 years for PwBD candidates as per Odisha Govt rules.
- Odia Language Requirement: Must be able to read, write, and speak Odia fluently (ME standard / HSC with Odia).',
    '### ଯୋଗ୍ୟତା ଓ ବୟସ ସୀମା (ଓଡ଼ିଶା ସରକାରୀ ନିୟମ)
- ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା: ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ବିଶ୍ୱବିଦ୍ୟାଳୟରୁ ସ୍ନାତକ ଡିଗ୍ରୀ (କିମ୍ବା ସରକାରୀ ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ ସମକକ୍ଷ ଯୋଗ୍ୟତା)।
- ବୟସ ସୀମା: ନିଯୁକ୍ତି ବର୍ଷର ଜାନୁଆରୀ ୧ ସୁଦ୍ଧା ୨୧ ରୁ ୩୮ ବର୍ଷ।
- ବୟସ କୋହଳ: SC / ST / SEBC / ମହିଳା / ପୂର୍ବତନ ସୈନିକଙ୍କ ପାଇଁ +୫ ବର୍ଷ; PwBD ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ +୧୦ ବର୍ଷ।
- ଓଡ଼ିଆ ଭାଷା ଜ୍ଞାନ: ଓଡ଼ିଆ ପଢ଼ିବା, ଲେଖିବା ଓ କହିବାରେ ଦକ୍ଷତା (ଅଷ୍ଟମ / ଦଶମ ଶ୍ରେଣୀରେ ଓଡ଼ିଆ ବିଷୟ)।',
    1, 1
  ),
  (
    'csnip-02-central-eligibility',
    'eligibility',
    'Central Govt / UPSC / SSC Eligibility Block',
    'କେନ୍ଦ୍ର ସରକାର / UPSC / SSC ଯୋଗ୍ୟତା ବିବରଣୀ',
    '### Central Services Eligibility & Age Criteria
- Nationality: Citizen of India.
- Minimum Qualification: Recognised Graduation / Diploma / 10+2 as per post cadre.
- Age Relaxation: +3 years for OBC (Non-Creamy Layer), +5 years for SC / ST, and +10 years for PwBD under DoPT guidelines.
- Number of Attempts: Check official UPSC / SSC / RRB notification for category-wise attempt caps.',
    '### କେନ୍ଦ୍ର ସରକାରୀ ସେବା ଯୋଗ୍ୟତା ଓ ବୟସ ସୀମା
- ଜାତୀୟତା: ଭାରତୀୟ ନାଗରିକ।
- ସର୍ବନିମ୍ନ ଯୋଗ୍ୟତା: ପଦବୀ ଅନୁଯାୟୀ ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ସ୍ନାତକ / ଡିପ୍ଲୋମା / +୨ ପାସ୍।
- ବୟସ କୋହଳ: OBC (NCL) ପାଇଁ +୩ ବର୍ଷ, SC / ST ପାଇଁ +୫ ବର୍ଷ, PwBD ପାଇଁ +୧୦ ବର୍ଷ।
- ପରୀକ୍ଷା ସୁଯୋଗ ସଂଖ୍ୟା: ବର୍ଗ ଅନୁଯାୟୀ ସୁଯୋଗ ସଂଖ୍ୟା ପାଇଁ ସରକାରୀ UPSC / SSC ବିଜ୍ଞପ୍ତି ଯାଞ୍ଚ କରନ୍ତୁ।',
    2, 1
  ),
  (
    'csnip-03-orsp-salary',
    'salary',
    'ORSP & 7th CPC Salary / Pay Matrix Band',
    'ORSP ଓ ସପ୍ତମ ବେତନ ଆୟୋଗ ଦରମା ବିବରଣୀ',
    '### Salary Structure, Pay Matrix & Allowances
- Entry Pay Scale: ORSP 2017 / 7th CPC Pay Matrix Level (Basic Pay + Dearness Allowance + House Rent Allowance + Medical Allowance).
- Probation & Confirmation: Standard 2-year probation followed by regular cadre increments and annual 3% pay progression.
- Retirement & Social Security: Covered under NPS / UPS pension scheme, Group Insurance, and Govt quarter / HRA entitlement.',
    '### ଦରମା ଗଠନ, ପେ-ମ୍ୟାଟ୍ରିକ୍ସ ଓ ଭତ୍ତା
- ପ୍ରାରମ୍ଭିକ ଦରମା: ORSP ୨୦୧୭ / ୭ମ ବେତନ ଆୟୋଗ ପେ-ମ୍ୟାଟ୍ରିକ୍ସ ଲେଭେଲ୍ (ମୂଳ ଦରମା + ମହଙ୍ଗା ଭତ୍ତା + ଘର ଭଡ଼ା ଭତ୍ତା + ଚିକିତ୍ସା ଭତ୍ତା)।
- ପ୍ରୋବେସନ୍ ଓ ନିୟମିତକରଣ: ୨ ବର୍ଷର ପ୍ରୋବେସନ୍ ପରେ ବାର୍ଷିକ ୩% ବେତନ ବୃଦ୍ଧି ଓ ପଦୋନ୍ନତି।
- ପେନସନ୍ ଓ ସୁବିଧା: NPS / UPS ପେନସନ୍, ସରକାରୀ ବାସଭବନ / HRA ଓ ଚିକିତ୍ସା ସୁବିଧା।',
    3, 1
  ),
  (
    'csnip-04-banking-psu-ctc',
    'salary',
    'Banking, PSU & Corporate CTC Progression',
    'ବ୍ୟାଙ୍କିଂ, PSU ଓ କର୍ପୋରେଟ୍ ଦରମା ପ୍ରଗତି',
    '### Compensation, Perks & Career Growth Ladder
- Entry CTC / Basic Scale: Competitive starting pay with DA, CCA, Leased Accommodation, Conveyance, and Medical coverage.
- Fast-Track Promotions: Officer Scale-I → Scale-II / Manager → Senior Manager → AGM / DGM through internal exams and merit appraisal.
- Skill Bonus: Additional allowances for JAIIB / CAIIB, GATE score, or specialised technical certifications.',
    '### ଦରମା, ସୁବିଧା ଓ ପଦୋନ୍ନତି ସୋପାନ
- ପ୍ରାରମ୍ଭିକ CTC / ସ୍କେଲ୍: DA, CCA, ଘର ଭଡ଼ା ସୁବିଧା, ଯାତାୟାତ ଓ ପରିବାର ଚିକିତ୍ସା ବୀମା।
- ଦ୍ରୁତ ପଦୋନ୍ନତି: ଅଫିସର୍ ସ୍କେଲ୍-୧ → ମ୍ୟାନେଜର୍ → ସିନିୟର ମ୍ୟାନେଜର୍ → AGM / DGM।
- ଅତିରିକ୍ତ ଭତ୍ତା: JAIIB / CAIIB କିମ୍ବା ବିଶେଷ ପ୍ରମାଣପତ୍ର ପାଇଁ ଅତିରିକ୍ତ ଇନକ୍ରିମେଣ୍ଟ।',
    4, 1
  ),
  (
    'csnip-05-three-stage-selection',
    'selection',
    '3-Stage Selection Pattern (Prelims + Mains + Interview)',
    '୩-ସ୍ତରୀୟ ଚୟନ ପଦ୍ଧତି (ପ୍ରିଲିମ୍ସ + ମେନ୍ସ + ସାକ୍ଷାତକାର)',
    '### Selection & Examination Stages
- Stage 1 — Preliminary Exam (Objective MCQ): Qualifying screening test with negative marking (typically 1/3rd or 1/4th).
- Stage 2 — Main Written Examination (Descriptive): General Studies, Essay, Odia/English Language, and Optional/Subject papers.
- Stage 3 — Personality Test / Interview: Evaluates administrative clarity, Odisha & national awareness, ethics, and decision-making.',
    '### ପରୀକ୍ଷା ଓ ଚୟନ ପର୍ଯ୍ୟାୟ
- ପର୍ଯ୍ୟାୟ ୧ — ପ୍ରାରମ୍ଭିକ ପରୀକ୍ଷା (Objective MCQ): ନେଗେଟିଭ୍ ମାର୍କିଂ ସହିତ ଯୋଗ୍ୟତା ନିର୍ଦ୍ଧାରଣ ପରୀକ୍ଷା।
- ପର୍ଯ୍ୟାୟ ୨ — ମୁଖ୍ୟ ଲିଖିତ ପରୀକ୍ଷା (Descriptive): ସାଧାରଣ ଅଧ୍ୟୟନ, ପ୍ରବନ୍ଧ, ଓଡ଼ିଆ/ଇଂରାଜୀ ଭାଷା ଓ ଇଚ୍ଛାଧୀନ ବିଷୟ।
- ପର୍ଯ୍ୟାୟ ୩ — ବ୍ୟକ୍ତିତ୍ୱ ପରୀକ୍ଷା / ସାକ୍ଷାତକାର: ପ୍ରଶାସନିକ ଦକ୍ଷତା, ଓଡ଼ିଶା ଓ ଜାତୀୟ ଜ୍ଞାନ ଏବଂ ନୈତିକତା ମୂଲ୍ୟାୟନ।',
    5, 1
  ),
  (
    'csnip-06-cbt-skill-selection',
    'selection',
    'CBT + Computer Skill Test + Document Verification',
    'CBT + କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା + ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ',
    '### Selection Stages (CBT & Skill Track)
- Stage 1 — Computer-Based Test (CBT): Covers General Awareness, Quantitative Aptitude, Reasoning, English, and Odia Grammar.
- Stage 2 — Practical / Computer Skill Test: MS Office, spreadsheet accuracy, typing speed, or trade-specific practical assessment.
- Stage 3 — Certificate & Document Verification: Original academic marksheets, Resident, Caste/SEBC, and Employment Exchange certificates.',
    '### ଚୟନ ପର୍ଯ୍ୟାୟ (CBT ଓ ଦକ୍ଷତା ପରୀକ୍ଷା)
- ପର୍ଯ୍ୟାୟ ୧ — କମ୍ପ୍ୟୁଟର ଆଧାରିତ ପରୀକ୍ଷା (CBT): ସାଧାରଣ ଜ୍ଞାନ, ଗଣିତ, ରିଜନିଂ, ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ବ୍ୟାକରଣ।
- ପର୍ଯ୍ୟାୟ ୨ — ବ୍ୟବହାରିକ / କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା: MS Office, ଟାଇପିଂ କିମ୍ବା ବିଷୟଗତ ପ୍ରାକ୍ଟିକାଲ୍।
- ପର୍ଯ୍ୟାୟ ୩ — ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ: ମୂଳ ଶିକ୍ଷାଗତ ପ୍ରମାଣପତ୍ର, ସ୍ଥାୟୀ ବାସିନ୍ଦା, ଜାତିଗତ ଓ ନିଯୁକ୍ତି ବିନିମୟ ପ୍ରମାଣପତ୍ର।',
    6, 1
  ),
  (
    'csnip-07-6month-roadmap',
    'preparation',
    '6-Month Structured Preparation Roadmap Checklist',
    '୬-ମାସିଆ ପ୍ରସ୍ତୁତି ରୋଡମ୍ୟାପ୍ ଚେକଲିଷ୍ଟ',
    '### 6-Month Preparation Roadmap Checklist
- Months 1–2 (Foundation): Complete NCERT (Classes 6–12), Odisha Board History/Geography, and core syllabus mapping.
- Months 3–4 (Practice & PYQs): Solve last 10 years Previous Year Question papers and maintain concise revision notes.
- Month 5 (Mock Tests): Attempt weekly full-length timed mock tests and track accuracy in weak topics.
- Month 6 (Final Revision): Revise Odisha Budget, Economic Survey, Current Affairs capsules, and official syllabus checklists.',
    '### ୬-ମାସିଆ ପ୍ରସ୍ତୁତି ରୋଡମ୍ୟାପ୍ ଚେକଲିଷ୍ଟ
- ମାସ ୧–୨ (ମୂଳଦୁଆ): NCERT (ଷଷ୍ଠ–ଦ୍ୱାଦଶ), ଓଡ଼ିଶା ଇତିହାସ/ଭୂଗୋଳ ଓ ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ ଅଧ୍ୟୟନ।
- ମାସ ୩–୪ (ଅଭ୍ୟାସ ଓ PYQ): ବିଗତ ୧୦ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର ସମାଧାନ ଓ ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ ପ୍ରସ୍ତୁତି।
- ମାସ ୫ (ମକ୍ ଟେଷ୍ଟ): ପ୍ରତି ସପ୍ତାହରେ ପୂର୍ଣ୍ଣକାଳୀନ ମକ୍ ଟେଷ୍ଟ ଓ ଦୁର୍ବଳ ବିଷୟର ସଂଶୋଧନ।
- ମାସ ୬ (ଅନ୍ତିମ ପୁନରାବୃତ୍ତି): ଓଡ଼ିଶା ବଜେଟ୍, ଅର୍ଥନୈତିକ ସର୍ଭେ ଓ ଦୈନିକ କରେଣ୍ଟ ଆଫେୟାର୍ସ ପୁନରାବୃତ୍ତି।',
    7, 1
  ),
  (
    'csnip-08-odia-checklist',
    'preparation',
    'Odisha GK & Odia Language Preparation Checklist',
    'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ଓଡ଼ିଆ ଭାଷା ପ୍ରସ୍ତୁତି ଚେକଲିଷ୍ଟ',
    '### Odisha GK & Odia Language Focus Areas
- Odisha Geography & Polity: 30 Districts, river systems (Mahanadi, Brahmani, Baitarani), tribal heritage, and state governance.
- Odisha Economy & Schemes: State Budget highlights, Subhadra, CM-KISAN, industrial corridors, and disaster management.
- Odia Grammar & Composition: Sandhi, Samasa, Krudanta, Taddhita, Precis writing, and Odia-to-English translation.',
    '### ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ଓଡ଼ିଆ ଭାଷା ମୁଖ୍ୟ ବିଷୟ
- ଓଡ଼ିଶା ଭୂଗୋଳ ଓ ରାଜନୀତି: ୩୦ ଜିଲ୍ଲା, ନଦୀ ବ୍ୟବସ୍ଥା (ମହାନଦୀ, ବ୍ରାହ୍ମଣୀ, ବୈତରଣୀ), ଜନଜାତି ସଂସ୍କୃତି ଓ ଶାସନ ବ୍ୟବସ୍ଥା।
- ଓଡ଼ିଶା ଅର୍ଥନୀତି ଓ ଯୋଜନା: ରାଜ୍ୟ ବଜେଟ୍, ସୁଭଦ୍ରା, CM-KISAN, ଶିଳ୍ପ କରିଡର ଓ ବିପର୍ଯ୍ୟୟ ପରିଚାଳନା।
- ଓଡ଼ିଆ ବ୍ୟାକରଣ ଓ ରଚନା: ସନ୍ଧି, ସମାସ, କୃଦନ୍ତ, ତଦ୍ଧିତ, ସାରାଂଶ ଲିଖନ ଓ ଅନୁବାଦ।',
    8, 1
  ),
  (
    'csnip-09-gov-verification',
    'verification',
    'Official .gov.in Portal Verification Note',
    'ସରକାରୀ .gov.in ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ ସୂଚନା',
    '### Official Portal Verification Note
- Always verify latest advertisement numbers, vacancy changes, corrigenda, and closing dates exclusively on official `.gov.in` / `.nic.in` portals (OPSC, OSSC, OSSSC, UPSC, SSC).
- Never share OTPs or pay application fees through unverified third-party links. Keep your OTR (One-Time Registration) ID and PDF receipt saved safely.',
    '### ସରକାରୀ ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ ସୂଚନା
- ସର୍ବଦା ଅଫିସିଆଲ୍ `.gov.in` / `.nic.in` ୱେବସାଇଟ୍ (OPSC, OSSC, OSSSC, UPSC, SSC) ରେ ନୂତନ ବିଜ୍ଞପ୍ତି ଓ ଶେଷ ତାରିଖ ଯାଞ୍ଚ କରନ୍ତୁ।
- ଅଜଣା ଲିଙ୍କରେ କେବେହେଲେ OTP କିମ୍ବା ଆବେଦନ ଫିସ୍ ଦିଅନ୍ତୁ ନାହିଁ। OTR ID ଓ PDF ରସିଦ ସୁରକ୍ଷିତ ରଖନ୍ତୁ।',
    9, 1
  ),
  (
    'csnip-10-apprenticeship-verification',
    'verification',
    'NATS / NAPS Internship & Apprenticeship Guide Note',
    'NATS / NAPS ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍ ସୂଚନା',
    '### Internship & Apprenticeship Verification (NATS / NAPS)
- Register free on the official National Apprenticeship Training Scheme (nats.education.gov.in) for Graduate/Diploma holders or NAPS (apprenticeshipindia.gov.in) for ITI/10th/12th youth.
- Verify monthly stipend, training duration (6–12 months), and Central/State PSU establishment code before applying.',
    '### ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍ ଯାଞ୍ଚ (NATS / NAPS)
- ସ୍ନାତକ/ଡିପ୍ଲୋମା ପ୍ରାର୍ଥୀ NATS (nats.education.gov.in) ଏବଂ ITI/ଦଶମ/ଦ୍ୱାଦଶ ପ୍ରାର୍ଥୀ NAPS (apprenticeshipindia.gov.in) ରେ ମାଗଣା ପଞ୍ଜୀକରଣ କରନ୍ତୁ।
- ଆବେଦନ ପୂର୍ବରୁ ମାସିକ ବୃତ୍ତି (Stipend), ତାଲିମ ଅବଧି ଓ ସରକାରୀ ସଂସ୍ଥା କୋଡ୍ ଯାଞ୍ଚ କରନ୍ତୁ।',
    10, 1
  );
