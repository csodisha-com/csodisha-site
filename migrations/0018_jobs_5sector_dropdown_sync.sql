-- Migration 0018: Jobs 5-Sector + Geographic Taxonomy Sync & Mega-Dropdown Support (v274)
-- Synchronizes job_taxonomy_nodes cleanly to 5 Core Sectors without duplicates:
--   1. Government (government)
--   2. Private (private)
--   3. PSUs (psu)
--   4. NGOs / Non-Profit (ngo)
--   5. Foreign Jobs (foreign)
-- Plus geographic/sub-category L2 branches, L3 tenure nodes, and region_scope on job_articles.

-- 1. Add geographic region_scope column on job_articles
ALTER TABLE job_articles ADD COLUMN region_scope TEXT NOT NULL DEFAULT 'odisha';

CREATE INDEX IF NOT EXISTS idx_job_articles_region_stage
  ON job_articles (is_published, region_scope, lifecycle_stage, updated_at DESC);

-- 2. Upsert the 5 Core L1 Sectors cleanly (zero duplicates)
INSERT INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published)
VALUES
  ('jtax_l1_government', 1, NULL, 'government', 'Government', 'ସରକାରୀ ଚାକିରି', 'Odisha State Govt (OPSC/OSSC/OSSSC), Central Govt (UPSC/SSC/Railways) & District/Block', 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ କେନ୍ଦ୍ର ସରକାରୀ ନିଯୁକ୍ତି', '🏛️', 'emerald', 10, 1),
  ('jtax_l1_private', 1, NULL, 'private', 'Private', 'ବେସରକାରୀ ଚାକିରି', 'Odisha Private & IT, All-India Corporate & Tech, Freshers & Off-Campus Drives', 'ଓଡ଼ିଶା ଆଇଟି, କର୍ପୋରେଟ୍ ଓ ଫ୍ରେଶର୍ସ ନିଯୁକ୍ତି', '💼', 'amber', 20, 1),
  ('jtax_l1_psu', 1, NULL, 'psu', 'PSUs', 'ରାଷ୍ଟ୍ରାୟତ୍ତ ଉଦ୍ୟୋଗ (PSU)', 'Odisha State PSUs (OMC/OPTCL/GRIDCO/OHPC), Central Maharatna/Navratna & All-India PSUs', 'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ରୀୟ ରାଷ୍ଟ୍ରାୟତ୍ତ ସଂସ୍ଥା ନିଯୁକ୍ତି', '🏭', 'violet', 30, 1),
  ('jtax_l1_ngo', 1, NULL, 'ngo', 'NGOs / Non-Profit', 'ଏନଜିଓ / ଅଣ-ଲାଭଜନକ', 'Odisha Livelihoods (OLM/ORMAS), National Development & CSR, Fellowships & Field Roles', 'ସାମାଜିକ ବିକାଶ, CSR ଓ ଫେଲୋସିପ୍ ନିଯୁକ୍ତି', '🤝', 'teal', 40, 1),
  ('jtax_l1_foreign', 1, NULL, 'foreign', 'Foreign Jobs', 'ବିଦେଶୀ ଚାକିରି', 'MEA-Verified Overseas Opportunities, Gulf & Middle East Technical, Global Skilled Migration', 'MEA-ଯାଞ୍ଚିତ ବିଦେଶୀ ଓ ଆନ୍ତର୍ଜାତୀୟ ନିଯୁକ୍ତି', '✈️', 'cobalt', 50, 1)
ON CONFLICT(id) DO UPDATE SET
  slug = excluded.slug,
  title_en = excluded.title_en,
  title_or = excluded.title_or,
  subtitle_en = excluded.subtitle_en,
  subtitle_or = excluded.subtitle_or,
  icon = excluded.icon,
  accent_variant = excluded.accent_variant,
  sort_order = excluded.sort_order,
  is_published = 1,
  updated_at = datetime('now');

-- 3. Re-parent legacy v249 L2 boards & any existing job_articles onto the 5 canonical L1 sectors
UPDATE job_articles SET category_l1_id = 'jtax_l1_government', region_scope = 'odisha' WHERE category_l1_id = 'jtax_l1_state_odisha';
UPDATE job_articles SET category_l1_id = 'jtax_l1_government', region_scope = 'central' WHERE category_l1_id = 'jtax_l1_central';
UPDATE job_articles SET category_l1_id = 'jtax_l1_psu' WHERE category_l1_id = 'jtax_l1_banking_psu';

UPDATE job_taxonomy_nodes SET parent_id = 'jtax_l1_government' WHERE level = 2 AND parent_id IN ('jtax_l1_state_odisha', 'jtax_l1_central');
UPDATE job_taxonomy_nodes SET parent_id = 'jtax_l1_psu' WHERE level = 2 AND parent_id = 'jtax_l1_banking_psu';

-- Remove superseded legacy L1 rows so the 5 Core Sectors appear with zero duplicates
DELETE FROM job_taxonomy_nodes WHERE id IN ('jtax_l1_state_odisha', 'jtax_l1_central', 'jtax_l1_banking_psu');

-- 4. Seed Geographic & Domain L2 Sub-Categories under all 5 Core Sectors (idempotent)
INSERT OR IGNORE INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  -- Government (L2)
  ('jtax_l2_gov_odisha', 2, 'jtax_l1_government', 'odisha-state-govt', 'Odisha State Govt', 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ', 'OPSC, OSSC, OSSSC, OPRB & Odisha State Departments', 'OPSC, OSSC, OSSSC ଓ ରାଜ୍ୟ ବିଭାଗ', '🏛️', 'emerald', 1, 1),
  ('jtax_l2_gov_central', 2, 'jtax_l1_government', 'central-govt', 'Central Govt', 'କେନ୍ଦ୍ର ସରକାରୀ', 'UPSC, SSC, Indian Railways (RRB), Defence & Ministries', 'UPSC, SSC, ରେଳବାଇ ଓ କେନ୍ଦ୍ର ମନ୍ତ୍ରଣାଳୟ', '🇮🇳', 'cobalt', 2, 1),
  ('jtax_l2_gov_district', 2, 'jtax_l1_government', 'district-block-govt', 'District & Block / All Over India', 'ଜିଲ୍ଲା, ବ୍ଲକ୍ ଓ ସର୍ବଭାରତୀୟ', '30 Odisha District Collectorates, Zilla Parishad & All-India Boards', '୩୦ ଜିଲ୍ଲା ଓ ସର୍ବଭାରତୀୟ ସରକାରୀ ବୋର୍ଡ', '📍', 'emerald', 3, 1),
  -- Private (L2)
  ('jtax_l2_priv_odisha_it', 2, 'jtax_l1_private', 'odisha-private-it', 'Odisha Private & IT', 'ଓଡ଼ିଶା ବେସରକାରୀ ଓ ଆଇଟି', 'Bhubaneswar InfoCity, Infovalley, Cuttack & Odisha Industrial Parks', 'ଭୁବନେଶ୍ୱର ଆଇଟି ପାର୍କ ଓ ଶିଳ୍ପ କ୍ଷେତ୍ର', '💻', 'amber', 1, 1),
  ('jtax_l2_priv_all_india', 2, 'jtax_l1_private', 'all-india-corporate-tech', 'All-India Corporate & Tech', 'ସର୍ବଭାରତୀୟ କର୍ପୋରେଟ୍ ଓ ଟେକ୍', 'Bengaluru, Hyderabad, Pune, NCR & Remote MNC Openings', 'ଦେଶବ୍ୟାପୀ MNC ଓ କର୍ପୋରେଟ୍ ପଦବୀ', '🏢', 'amber', 2, 1),
  ('jtax_l2_priv_freshers', 2, 'jtax_l1_private', 'freshers-off-campus', 'Freshers & Off-Campus', 'ଫ୍ରେଶର୍ସ ଓ ଅଫ୍-କ୍ୟାମ୍ପସ୍', 'Graduate Trainee, Internships, Walk-In & Entry-Level Drives', 'ସ୍ନାତକ ଫ୍ରେଶର୍ସ ଓ କ୍ୟାମ୍ପସ୍ ଡ୍ରାଇଭ୍', '🎓', 'amber', 3, 1),
  -- PSUs (L2)
  ('jtax_l2_psu_odisha', 2, 'jtax_l1_psu', 'odisha-state-psus', 'Odisha State PSUs', 'ଓଡ଼ିଶା ରାଜ୍ୟ ପିଏସୟୁ', 'OMC, OPTCL, GRIDCO, OHPC, OPGC, IDCO & Odisha State Enterprises', 'OMC, OPTCL, GRIDCO, OHPC ଓ OPGC', '⚡', 'violet', 1, 1),
  ('jtax_l2_psu_central', 2, 'jtax_l1_psu', 'central-maharatna-navratna', 'Central Maharatna & Navratna', 'କେନ୍ଦ୍ରୀୟ ମହାରତ୍ନ ଓ ନବରତ୍ନ', 'NALCO, MCL, SAIL Rourkela, NTPC, IOCL, ONGC, BHEL & DRDO', 'NALCO, MCL, SAIL, NTPC ଓ IOCL', '🏭', 'violet', 2, 1),
  ('jtax_l2_psu_all_india', 2, 'jtax_l1_psu', 'all-india-psus', 'All Over India PSUs', 'ସମଗ୍ର ଭାରତ ପିଏସୟୁ', 'GATE-Based CPSEs, Power, Banking & Public Sector Undertakings', 'GATE ଆଧାରିତ ଓ ସର୍ବଭାରତୀୟ PSU', '🏦', 'violet', 3, 1),
  -- NGOs / Non-Profit (L2)
  ('jtax_l2_ngo_odisha', 2, 'jtax_l1_ngo', 'odisha-livelihoods-social', 'Odisha Livelihoods & Social Impact', 'ଓଡ଼ିଶା ଜୀବିକା ଓ ସାମାଜିକ ବିକାଶ', 'OLM, ORMAS, Mission Shakti, Tribal & Rural Development Missions', 'OLM, ORMAS ଓ ଗ୍ରାମୀଣ ବିକାଶ ମିଶନ', '🌱', 'teal', 1, 1),
  ('jtax_l2_ngo_national', 2, 'jtax_l1_ngo', 'national-development-csr', 'National Development & CSR', 'ଜାତୀୟ ବିକାଶ ଓ CSR', 'UN Agencies, Foundations, Healthcare, Education & Corporate CSR', 'ଜାତୀୟ NGO, ଫାଉଣ୍ଡେସନ୍ ଓ CSR', '🤝', 'teal', 2, 1),
  ('jtax_l2_ngo_fellowships', 2, 'jtax_l1_ngo', 'fellowships-field-roles', 'Fellowships & Field Roles', 'ଫେଲୋସିପ୍ ଓ ଫିଲ୍ଡ ପଦବୀ', 'Gandhi Fellowship, Lamp, SBI Youth for India & District Fellows', 'ଫେଲୋସିପ୍ ଓ ଜିଲ୍ଲା ସ୍ତରୀୟ ପଦବୀ', '🧭', 'teal', 3, 1),
  -- Foreign Jobs (L2)
  ('jtax_l2_foreign_mea', 2, 'jtax_l1_foreign', 'mea-verified-overseas', 'MEA-Verified Overseas', 'MEA-ଯାଞ୍ଚିତ ବିଦେଶୀ ନିଯୁକ୍ତି', 'eMigrate Registered Agencies & Govt-Verified International Drives', 'eMigrate ଓ ସରକାରୀ ଯାଞ୍ଚିତ ବିଦେଶୀ ନିଯୁକ୍ତି', '🛂', 'cobalt', 1, 1),
  ('jtax_l2_foreign_gulf', 2, 'jtax_l1_foreign', 'gulf-middle-east-tech', 'Gulf & Middle East Technical', 'ଗଲ୍ଫ ଓ ମଧ୍ୟପ୍ରାଚ୍ୟ ଟେକ୍ନିକାଲ୍', 'UAE, Saudi Arabia, Qatar, Oman Engineering, Healthcare & Skilled Trades', 'UAE, କତାର, ଓମାନ୍ ଇଞ୍ଜିନିୟରିଂ ଓ ସ୍ୱାସ୍ଥ୍ୟସେବା', '🏗️', 'cobalt', 2, 1),
  ('jtax_l2_foreign_global', 2, 'jtax_l1_foreign', 'global-skilled-migration', 'Global / Skilled Migration', 'ବିଶ୍ୱସ୍ତରୀୟ ଦକ୍ଷ ନିଯୁକ୍ତି', 'Europe, Japan (TIT/SSW), Germany Nursing, UK & Canada Skilled Tracks', 'ୟୁରୋପ, ଜାପାନ, ଜର୍ମାନୀ ଓ କାନାଡ଼ା ସୁଯୋଗ', '🌍', 'cobalt', 3, 1);

-- 5. Seed starter L3 Tenure / Cadre nodes under new L2 categories
INSERT OR IGNORE INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('jtax_l3_gov_odisha_perm', 3, 'jtax_l2_gov_odisha', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Regular Odisha State Govt Cadre', 'ନିୟମିତ ରାଜ୍ୟ ସରକାରୀ ପଦବୀ', '✅', 'emerald', 10, 1),
  ('jtax_l3_gov_central_perm', 3, 'jtax_l2_gov_central', 'permanent-regular', 'Permanent / Regular', 'ସ୍ଥାୟୀ / ନିୟମିତ', 'Regular Central Govt Cadre', 'ନିୟମିତ କେନ୍ଦ୍ର ସରକାରୀ ପଦବୀ', '✅', 'cobalt', 10, 1),
  ('jtax_l3_priv_fulltime', 3, 'jtax_l2_priv_odisha_it', 'full-time-private', 'Full-Time Corporate', 'ଫୁଲ୍-ଟାଇମ୍ କର୍ପୋରେଟ୍', 'Direct Company Payroll', 'ନିୟମିତ କମ୍ପାନୀ ପେ-ରୋଲ୍', '💼', 'amber', 10, 1),
  ('jtax_l3_psu_exec', 3, 'jtax_l2_psu_odisha', 'executive-trainee', 'Executive / Management Trainee', 'ଏକ୍ଜିକ୍ୟୁଟିଭ୍ / ଟ୍ରେନି', 'Permanent PSU Cadre', 'ସ୍ଥାୟୀ ପିଏସୟୁ ଅଧିକାରୀ', '⭐', 'violet', 10, 1),
  ('jtax_l3_ngo_project', 3, 'jtax_l2_ngo_odisha', 'project-fellowship', 'Project / Fellowship', 'ପ୍ରକଳ୍ପ / ଫେଲୋସିପ୍', 'Fixed-Term Development Roles', 'ପ୍ରକଳ୍ପ ଭିତ୍ତିକ ପଦବୀ', '🌱', 'teal', 10, 1),
  ('jtax_l3_foreign_contract', 3, 'jtax_l2_foreign_mea', 'overseas-contract', 'Verified Overseas Contract', 'ଯାଞ୍ଚିତ ବିଦେଶୀ ଚୁକ୍ତି', 'MEA / eMigrate Compliant Contract', 'MEA-ଯାଞ୍ଚିତ ବିଦେଶୀ ନିଯୁକ୍ତି', '✈️', 'cobalt', 10, 1);
