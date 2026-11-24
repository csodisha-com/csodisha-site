-- Migration 0138: Jobs Publishing House, 3-Layer Taxonomy, Reusable Bilingual Snippets & Revisions (v249)

CREATE TABLE IF NOT EXISTS job_taxonomy_nodes (
  id TEXT PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id TEXT,
  slug TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  accent_variant TEXT NOT NULL DEFAULT 'emerald',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_taxonomy_level_parent ON job_taxonomy_nodes (level, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_job_taxonomy_slug ON job_taxonomy_nodes (slug, level);

CREATE TABLE IF NOT EXISTS job_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_l1_id TEXT,
  category_l2_id TEXT,
  category_l3_id TEXT,
  sector_badge TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  organisation_en TEXT NOT NULL DEFAULT '',
  organisation_or TEXT NOT NULL DEFAULT '',
  advt_number TEXT NOT NULL DEFAULT '',
  total_vacancies INTEGER NOT NULL DEFAULT 0,
  qualification_level TEXT NOT NULL DEFAULT '',
  qualification_summary TEXT NOT NULL DEFAULT '',
  min_age INTEGER,
  max_age INTEGER,
  age_cutoff_date TEXT NOT NULL DEFAULT '',
  age_limit_summary TEXT NOT NULL DEFAULT '',
  odisha_domicile_required INTEGER NOT NULL DEFAULT 0,
  salary_pay_scale TEXT NOT NULL DEFAULT '',
  selection_mode TEXT NOT NULL DEFAULT '',
  location_district TEXT NOT NULL DEFAULT 'All Odisha',
  application_start_date TEXT NOT NULL DEFAULT '',
  last_date TEXT NOT NULL DEFAULT '',
  exam_date TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_caption TEXT NOT NULL DEFAULT '',
  article_body_en TEXT NOT NULL DEFAULT '',
  article_body_or TEXT NOT NULL DEFAULT '',
  vacancy_breakdown_json TEXT NOT NULL DEFAULT '[]',
  important_dates_json TEXT NOT NULL DEFAULT '[]',
  fee_structure_json TEXT NOT NULL DEFAULT '[]',
  selection_steps_json TEXT NOT NULL DEFAULT '[]',
  cutoff_reference_json TEXT NOT NULL DEFAULT '[]',
  lifecycle_updates_json TEXT NOT NULL DEFAULT '[]',
  linked_study_ids_json TEXT NOT NULL DEFAULT '[]',
  official_apply_url TEXT NOT NULL DEFAULT '',
  official_website_url TEXT NOT NULL DEFAULT '',
  notification_pdf_url TEXT NOT NULL DEFAULT '',
  syllabus_pdf_url TEXT NOT NULL DEFAULT '',
  pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
  extra_attachments_json TEXT NOT NULL DEFAULT '[]',
  lifecycle_stage TEXT NOT NULL DEFAULT 'notification',
  corrigendum_note_en TEXT NOT NULL DEFAULT '',
  corrigendum_note_or TEXT NOT NULL DEFAULT '',
  scheduled_publish_at TEXT NOT NULL DEFAULT '',
  preview_token TEXT NOT NULL DEFAULT '',
  preview_expires_at TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  apply_clicks_count INTEGER NOT NULL DEFAULT 0,
  pdf_downloads_count INTEGER NOT NULL DEFAULT 0,
  bookmarks_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_articles_pub ON job_articles (is_published, scheduled_publish_at, last_date);
CREATE INDEX IF NOT EXISTS idx_job_articles_tax ON job_articles (category_l1_id, category_l2_id, category_l3_id);
CREATE INDEX IF NOT EXISTS idx_job_articles_stage ON job_articles (lifecycle_stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS editorial_snippets (
  id TEXT PRIMARY KEY,
  snippet_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_or TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_editorial_snippets_cat ON editorial_snippets (category, sort_order);

CREATE TABLE IF NOT EXISTS job_article_revisions (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_revisions_article ON job_article_revisions (article_id, revision_number DESC);

-- Starter 3-Layer Taxonomy Hierarchy (editable & extensible live from Admin Studio)
INSERT OR IGNORE INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('jtax_l1_state_odisha', 1, NULL, 'state-sector-odisha', 'State Sector (Odisha)', 'ରାଜ୍ୟ ସରକାରୀ (ଓଡ଼ିଶା)', 'OPSC, OSSC, OSSSC, OPRB & Odisha State departments', 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରଙ୍କ ନିଯୁକ୍ତି', '🏛️', 'emerald', 10, 1),
  ('jtax_l1_central', 1, NULL, 'central-sector', 'Central Sector', 'କେନ୍ଦ୍ରୀୟ ସରକାରୀ', 'UPSC, SSC, Railways (RRB), Defence & Ministries', 'କେନ୍ଦ୍ର ସରକାରଙ୍କ ବିଭିନ୍ନ ନିଯୁକ୍ତି', '🇮🇳', 'cobalt', 20, 1),
  ('jtax_l1_banking_psu', 1, NULL, 'banking-psu', 'Banking & PSU', 'ବ୍ୟାଙ୍କିଂ ଓ ପିଏସୟୁ', 'IBPS, SBI, RBI, NALCO, MCL, OHPC & CPSEs', 'ବ୍ୟାଙ୍କ ଓ ରାଷ୍ଟ୍ରାୟତ୍ତ ଉଦ୍ୟୋଗ ନିଯୁକ୍ତି', '🏦', 'violet', 30, 1),
  ('jtax_l1_private', 1, NULL, 'private-corporate', 'Private & Corporate', 'ବେସରକାରୀ ଓ କର୍ପୋରେଟ୍', 'IT, Software, Core Engineering & Campus Drives', 'ଆଇଟି, କର୍ପୋରେଟ୍ ଓ ଶିଳ୍ପ କ୍ଷେତ୍ର', '💼', 'amber', 40, 1);

INSERT OR IGNORE INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('jtax_l2_opsc', 2, 'jtax_l1_state_odisha', 'opsc', 'OPSC', 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ (OPSC)', 'Odisha Public Service Commission (Group-A & B)', 'ଗ୍ରୁପ୍-ଏ ଏବଂ ଗ୍ରୁପ୍-ବି ନିଯୁକ୍ତି', '⚖️', 'emerald', 10, 1),
  ('jtax_l2_ossc', 2, 'jtax_l1_state_odisha', 'ossc', 'OSSC', 'ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSC)', 'Odisha Staff Selection Commission (CGL, Technical)', 'ସିଜିଏଲ୍ ଓ ବୈଷୟିକ ନିଯୁକ୍ତି', '📋', 'emerald', 20, 1),
  ('jtax_l2_osssc', 2, 'jtax_l1_state_odisha', 'osssc', 'OSSSC', 'ଓଡ଼ିଶା ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSSC)', 'RI, ARI, Amin, Forester, Nursing & Group-C', 'ଆରଆଇ, ଅମିନ, ନର୍ସିଂ ଓ ଗ୍ରୁପ୍-ସି', '🗂️', 'emerald', 30, 1),
  ('jtax_l2_oprb', 2, 'jtax_l1_state_odisha', 'oprb', 'OPRB', 'ଓଡ଼ିଶା ପୋଲିସ ନିଯୁକ୍ତି ବୋର୍ଡ (OPRB)', 'Odisha Police SI, Constable & Fire Services', 'ପୋଲିସ ଏସଆଇ ଓ କନେଷ୍ଟବଳ ନିଯୁକ୍ତି', '🛡️', 'emerald', 40, 1),
  ('jtax_l2_upsc', 2, 'jtax_l1_central', 'upsc', 'UPSC', 'କେନ୍ଦ୍ର ଲୋକସେବା ଆୟୋଗ (UPSC)', 'CSE (IAS/IPS), CDS, NDA, CAPF & IES', 'ସିଭିଲ୍ ସର୍ଭିସେସ୍ ଓ ପ୍ରତିରକ୍ଷା ପରୀକ୍ଷା', '🏛️', 'cobalt', 10, 1),
  ('jtax_l2_ssc', 2, 'jtax_l1_central', 'ssc', 'SSC', 'ଷ୍ଟାଫ୍ ସିଲେକ୍ସନ୍ କମିଶନ୍ (SSC)', 'CGL, CHSL, MTS, GD Constable & JE', 'ସିଜିଏଲ୍, ସିଏଚ୍ଏସ୍ଏଲ୍ ଓ ଏମଟିଏସ୍', '📝', 'cobalt', 20, 1),
  ('jtax_l2_rrb', 2, 'jtax_l1_central', 'railway-rrb', 'Railway (RRB)', 'ରେଳବାଇ ନିଯୁକ୍ତି ବୋର୍ଡ (RRB)', 'NTPC, ALP, Technician, JE & Group-D (ECoR)', 'ରେଳବାଇ ଏନଟିପିସି ଓ ବୈଷୟିକ ପଦବୀ', '🚆', 'cobalt', 30, 1),
  ('jtax_l2_ibps_psu', 2, 'jtax_l1_banking_psu', 'ibps-sbi-psu', 'IBPS / SBI / Odisha PSUs', 'ବ୍ୟାଙ୍କ ଓ ଓଡ଼ିଶା ପିଏସୟୁ', 'PO, Clerk, SO, NALCO, OMC, OPTCL & OHPC', 'ବ୍ୟାଙ୍କ ପିଓ, କ୍ଲର୍କ ଓ ରାଷ୍ଟ୍ରାୟତ୍ତ ସଂସ୍ଥା', '🏦', 'violet', 10, 1),
  ('jtax_l2_it_sw', 2, 'jtax_l1_private', 'it-software', 'IT & Software', 'ଆଇଟି ଓ ସଫ୍ଟୱେର୍', 'Bhubaneswar Tech Parks, Product & MNC Hiring', 'ଭୁବନେଶ୍ୱର ଆଇଟି ପାର୍କ ଓ କର୍ପୋରେଟ୍', '💻', 'amber', 10, 1);

INSERT OR IGNORE INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('jtax_l3_opsc_perm', 3, 'jtax_l2_opsc', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Regular ORSP Level-10+ Gazetted Posts', 'ନିୟମିତ ସରକାରୀ ପଦବୀ', '✅', 'emerald', 10, 1),
  ('jtax_l3_opsc_groupa', 3, 'jtax_l2_opsc', 'group-a-gazetted', 'Group-A / Gazetted', 'ଗ୍ରୁପ୍-ଏ / ଗେଜେଟେଡ୍', 'OAS, OFS, OPS & State Civil Services', 'ରାଜ୍ୟ ପ୍ରଶାସନିକ ସେବା', '⭐', 'emerald', 20, 1),
  ('jtax_l3_ossc_perm', 3, 'jtax_l2_ossc', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Regular Group-B & Group-C State Cadre', 'ନିୟମିତ ଗ୍ରୁପ୍-ବି ଓ ଗ୍ରୁପ୍-ସି', '✅', 'emerald', 10, 1),
  ('jtax_l3_ossc_groupbc', 3, 'jtax_l2_ossc', 'group-b-group-c', 'Group-B / Group-C', 'ଗ୍ରୁପ୍-ବି / ଗ୍ରୁପ୍-ସି', 'Combined Graduate Level & Technical Posts', 'ସ୍ନାତକ ସ୍ତରୀୟ ଓ ବୈଷୟିକ ପଦବୀ', '📌', 'emerald', 20, 1),
  ('jtax_l3_osssc_perm', 3, 'jtax_l2_osssc', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'District & State Cadre Regular Recruitment', 'ନିୟମିତ ଜିଲ୍ଲା ସ୍ତରୀୟ ପଦବୀ', '✅', 'emerald', 10, 1),
  ('jtax_l3_osssc_contract', 3, 'jtax_l2_osssc', 'temporary-contractual', 'Temporary / Contractual', 'ଅସ୍ଥାୟୀ / ଠିକା', 'Contractual, Scheme & Project-Mode Posts', 'ଠିକା ଓ ପ୍ରକଳ୍ପ ଭିତ୍ତିକ ପଦବୀ', '⏳', 'amber', 20, 1),
  ('jtax_l3_oprb_perm', 3, 'jtax_l2_oprb', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Uniformed Regular State Police Cadre', 'ନିୟମିତ ପୋଲିସ ନିଯୁକ୍ତି', '✅', 'emerald', 10, 1),
  ('jtax_l3_upsc_groupa', 3, 'jtax_l2_upsc', 'group-a-gazetted', 'Group-A / Gazetted', 'ଗ୍ରୁପ୍-ଏ / ଗେଜେଟେଡ୍', 'All India & Central Civil Services', 'ଅଖିଳ ଭାରତୀୟ ପ୍ରଶାସନିକ ସେବା', '⭐', 'cobalt', 10, 1),
  ('jtax_l3_ssc_groupbc', 3, 'jtax_l2_ssc', 'group-b-group-c', 'Group-B / Group-C', 'ଗ୍ରୁପ୍-ବି / ଗ୍ରୁପ୍-ସି', 'Central Ministries & Subordinate Offices', 'କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟ ପଦବୀ', '📌', 'cobalt', 10, 1),
  ('jtax_l3_rrb_perm', 3, 'jtax_l2_rrb', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Indian Railways Permanent Cadre', 'ଭାରତୀୟ ରେଳବାଇ ସ୍ଥାୟୀ ପଦବୀ', '✅', 'cobalt', 10, 1),
  ('jtax_l3_rrb_apprentice', 3, 'jtax_l2_rrb', 'apprentice-trainee', 'Apprentice / Trainee', 'ଆପ୍ରେଣ୍ଟିସ୍ / ତାଲିମପ୍ରାପ୍ତ', 'Act Apprentice & Graduate Trainee', 'ତାଲିମ ଭିତ୍ତିକ ନିଯୁକ୍ତି', '🎓', 'amber', 20, 1),
  ('jtax_l3_psu_perm', 3, 'jtax_l2_ibps_psu', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Regular Officer & Executive Cadre', 'ନିୟମିତ ଅଧିକାରୀ ପଦବୀ', '✅', 'violet', 10, 1),
  ('jtax_l3_it_outsource', 3, 'jtax_l2_it_sw', 'outsourced-project', 'Outsourced / Project', 'ଆଉଟସୋର୍ସଡ୍ / ପ୍ରକଳ୍ପ', 'Project Engineers & Contract Roles', 'ପ୍ରକଳ୍ପ ଭିତ୍ତିକ ପଦବୀ', '🔧', 'amber', 10, 1);

-- Starter Reusable Bilingual Editorial Snippets
INSERT OR IGNORE INTO editorial_snippets (id, snippet_key, category, title_en, title_or, body_en, body_or, sort_order, is_published) VALUES
  (
    'snip_odisha_age_relax',
    'odisha-age-relaxation',
    'eligibility',
    'Odisha SEBC / SC / ST / Women / PwBD Age Relaxation Rules',
    'ଓଡ଼ିଶା SEBC / SC / ST / ମହିଳା / ଦିବ୍ୟାଙ୍ଗ ବୟସ ଛାଡ଼ ନିୟମ',
    '### Upper Age Limit Relaxation (Government of Odisha Norms)\n- **SEBC / SC / ST / Women / Ex-Servicemen:** Relaxable by **5 years** over the prescribed upper age limit.\n- **Persons with Benchmark Disabilities (PwBD, >=40%):** Relaxable by **10 years** (cumulative relaxation applies for SC/ST/SEBC PwBD candidates as per GA & PG Dept. resolution).\n> Keep your valid Caste / SEBC / UDID certificate issued by a competent Odisha Revenue Authority ready before the closing date.',
    '### ଉଚ୍ଚତମ ବୟସ ସୀମା ଛାଡ଼ (ଓଡ଼ିଶା ସରକାରୀ ନିୟମାବଳୀ)\n- **SEBC / SC / ST / ମହିଳା / ପୂର୍ବତନ ସୈନିକ:** ନିର୍ଦ୍ଧାରିତ ଉଚ୍ଚତମ ବୟସ ସୀମାରୁ **୫ ବର୍ଷ** ପର୍ଯ୍ୟନ୍ତ ଛାଡ଼ ମିଳିବ।\n- **ଦିବ୍ୟାଙ୍ଗ (PwBD, >=୪୦%):** **୧୦ ବର୍ଷ** ପର୍ଯ୍ୟନ୍ତ ବୟସ ଛାଡ଼ (SC/ST/SEBC ଦିବ୍ୟାଙ୍ଗ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ମିଳିତ ଛାଡ଼ ଲାଗୁ ହେବ)।\n> ଆବେଦନର ଶେଷ ତାରିଖ ପୂର୍ବରୁ ବୈଧ ଜାତି / SEBC / UDID ପ୍ରମାଣପତ୍ର ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।',
    10,
    1
  ),
  (
    'snip_odia_lang_rule',
    'odia-language-proficiency',
    'eligibility',
    'Mandatory Odia Language Proficiency Requirement',
    'ବାଧ୍ୟତାମୂଳକ ଓଡ଼ିଆ ଭାଷା ଦକ୍ଷତା ନିୟମ',
    '### Odia Language Eligibility Criteria\nCandidates must be able to **read, write, and speak Odia fluently** and must have:\n- Passed Middle School Examination with **Odia as a language subject**, OR\n- Passed **HSC / Matriculation (10th)** or equivalent examination with Odia as medium of examination in non-language subject, OR\n- Passed in Odia as a language subject in the final examination of Class VII from a school/educational institution recognized by Govt. of Odisha or Central Govt., OR\n- Passed a test in Odia in **M.E. School Standard** conducted by the School & Mass Education Department, Odisha.',
    '### ଓଡ଼ିଆ ଭାଷା ଯୋଗ୍ୟତା ସର୍ତ୍ତାବଳୀ\nପ୍ରାର୍ଥୀମାନେ **ଓଡ଼ିଆ ପଢ଼ିବା, ଲେଖିବା ଓ କହିବାରେ ଦକ୍ଷ** ହୋଇଥିବା ଆବଶ୍ୟକ ଏବଂ ନିମ୍ନଲିଖିତ ମଧ୍ୟରୁ ଯେକୌଣସି ଗୋଟିଏ ଯୋଗ୍ୟତା ଥିବା ଜରୁରୀ:\n- **ଓଡ଼ିଆ ବିଷୟ** ସହିତ ମଧ୍ୟମିକ (M.E.) ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ, କିମ୍ବା\n- ମାଟ୍ରିକ୍ (୧୦ମ) ବା ସମତୁଲ୍ୟ ପରୀକ୍ଷାରେ ଓଡ଼ିଆ ମାଧ୍ୟମରେ ଉତ୍ତୀର୍ଣ୍ଣ, କିମ୍ବା\n- ଓଡ଼ିଶା ସରକାର କିମ୍ବା କେନ୍ଦ୍ର ସରକାରଙ୍କ ଦ୍ୱାରା ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ବିଦ୍ୟାଳୟରୁ ୭ମ ଶ୍ରେଣୀରେ ଓଡ଼ିଆ ଭାଷା ବିଷୟରେ ଉତ୍ତୀର୍ଣ୍ଣ, କିମ୍ବା\n- ବିଦ୍ୟାଳୟ ଓ ଗଣଶିକ୍ଷା ବିଭାଗ ଦ୍ୱାରା ପରିଚାଳିତ **M.E. ମାନକ ଓଡ଼ିଆ ପରୀକ୍ଷା** ଉତ୍ତୀର୍ଣ୍ଣ।',
    20,
    1
  ),
  (
    'snip_resident_cert',
    'odisha-resident-certificate',
    'documents',
    'Odisha Resident & Caste Certificate Verification Rules',
    'ଓଡ଼ିଶା ବାସିନ୍ଦା ଓ ଜାତି ପ୍ରମାଣପତ୍ର ନିୟମାବଳୀ',
    '### Document & Certificate Checklist (Odisha e-District)\n- **Resident / Nativity Certificate:** Must be issued by an Odisha Tahasildar/Revenue Officer via the e-District portal.\n- **SEBC Certificate:** Should be recently issued (within 3 years or as specified in the advertisement) by a competent authority.\n- **Identity Proof:** Aadhaar Card / Voter ID / PAN Card matching your 10th HSC Certificate name and Date of Birth.',
    '### ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ ତାଲିକା (ଓଡ଼ିଶା ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ)\n- **ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର:** ଓଡ଼ିଶା ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ପୋର୍ଟାଲ୍ ମାଧ୍ୟମରେ ତହସିଲଦାର / ରାଜସ୍ୱ ଅଧିକାରୀଙ୍କ ଦ୍ୱାରା ପ୍ରଦତ୍ତ ହୋଇଥିବା ଆବଶ୍ୟକ।\n- **SEBC ପ୍ରମାଣପତ୍ର:** ବିଜ୍ଞାପନର ନିୟମ ଅନୁଯାୟୀ ବୈଧ ଅବଧି (ସାଧାରଣତଃ ୩ ବର୍ଷ ମଧ୍ୟରେ) ଥିବା ଜରୁରୀ।\n- **ପରିଚୟ ପତ୍ର:** ଆଧାର / ଭୋଟର ଆଇଡି / ପ୍ୟାନ୍ କାର୍ଡରେ ଥିବା ନାମ ଓ ଜନ୍ମ ତାରିଖ ୧୦ମ ପ୍ରମାଣପତ୍ର ସହ ମେଳ ଖାଇବା ଉଚିତ।',
    30,
    1
  ),
  (
    'snip_portal_apply_steps',
    'opsc-ossc-osssc-portal-guide',
    'how_to_apply',
    'OPSC / OSSC / OSSSC Online Application Step-by-Step Guide',
    'OPSC / OSSC / OSSSC ଅନଲାଇନ୍ ଆବେଦନ ପ୍ରଣାଳୀ',
    '### Step-by-Step Online Application Guide\n- **Step 1 — One-Time Registration (OTR):** Visit the official recruitment portal (`opsc.gov.in` / `ossc.gov.in` / `osssc.gov.in`) and register using an active mobile number and email ID.\n- **Step 2 — Profile & Qualification Details:** Fill in personal details, Odisha district, category, and academic marks accurately as per your HSC/Degree certificates.\n- **Step 3 — Upload Photo & Signature:** Keep scanned passport photograph (20–50 KB JPG) and signature (10–20 KB JPG) ready.\n- **Step 4 — Review & Final Submit:** Verify all details in preview mode before final submission and save the **Application Confirmation PDF** for future Admit Card download.',
    '### ଅନଲାଇନ୍ ଆବେଦନ କରିବାର ସରଳ ପ୍ରଣାଳୀ\n- **ପଦକ୍ଷେପ ୧ — ପଞ୍ଜୀକରଣ (OTR):** ସରକାରୀ ୱେବସାଇଟ୍ (`opsc.gov.in` / `ossc.gov.in` / `osssc.gov.in`) କୁ ଯାଇ ସକ୍ରିୟ ମୋବାଇଲ୍ ନମ୍ବର ଓ ଇମେଲ୍ ଦ୍ୱାରା ପଞ୍ଜୀକରଣ କରନ୍ତୁ।\n- **ପଦକ୍ଷେପ ୨ — ବ୍ୟକ୍ତିଗତ ଓ ଶିକ୍ଷାଗତ ତଥ୍ୟ:** ୧୦ମ / ସ୍ନାତକ ପ୍ରମାଣପତ୍ର ଅନୁଯାୟୀ ସଠିକ୍ ନାମ, ଜିଲ୍ଲା, ବର୍ଗ ଓ ମାର୍କ ପୂରଣ କରନ୍ତୁ।\n- **ପଦକ୍ଷେପ ୩ — ଫଟୋ ଓ ଦସ୍ତଖତ ଅପଲୋଡ୍:** ପାସପୋର୍ଟ ଫଟୋ ଓ ସ୍ୱାକ୍ଷର ସ୍କାନ୍ କରି ନିର୍ଦ୍ଧାରିତ ସାଇଜ୍‌ରେ ଅପଲୋଡ୍ କରନ୍ତୁ।\n- **ପଦକ୍ଷେପ ୪ — ଚୂଡ଼ାନ୍ତ ଦାଖଲ:** ସମସ୍ତ ତଥ୍ୟ ଭଲଭାବେ ଯାଞ୍ଚ କରି ସବମିଟ୍ କରନ୍ତୁ ଏବଂ ଆଡମିଟ୍ କାର୍ଡ ପାଇଁ **ଆବେଦନ ପିଡିଏଫ୍** ସାଇତି ରଖନ୍ତୁ।',
    40,
    1
  );
