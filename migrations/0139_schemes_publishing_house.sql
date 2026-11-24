-- Migration 0139: Schemes & Welfare Publishing House, 3-Layer Taxonomy, Revisions & Bilingual Snippets (v250)

CREATE TABLE IF NOT EXISTS scheme_taxonomy_nodes (
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

CREATE INDEX IF NOT EXISTS idx_scheme_taxonomy_level_parent ON scheme_taxonomy_nodes (level, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_scheme_taxonomy_slug ON scheme_taxonomy_nodes (slug, level);

CREATE TABLE IF NOT EXISTS scheme_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_l1_id TEXT,
  category_l2_id TEXT,
  category_l3_id TEXT,
  gov_badge TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  department_en TEXT NOT NULL DEFAULT '',
  department_or TEXT NOT NULL DEFAULT '',
  scheme_code TEXT NOT NULL DEFAULT '',
  benefit_amount_summary TEXT NOT NULL DEFAULT '',
  benefit_frequency TEXT NOT NULL DEFAULT '',
  dbt_mode TEXT NOT NULL DEFAULT '',
  npci_seeding_required INTEGER NOT NULL DEFAULT 0,
  prerequisite_otr_label TEXT NOT NULL DEFAULT '',
  prerequisite_otr_url TEXT NOT NULL DEFAULT '',
  target_beneficiaries TEXT NOT NULL DEFAULT '',
  min_age INTEGER,
  max_age INTEGER,
  gender_eligibility TEXT NOT NULL DEFAULT 'All',
  allowed_categories_json TEXT NOT NULL DEFAULT '[]',
  max_annual_income INTEGER,
  min_qualifying_marks REAL,
  occupation_tag TEXT NOT NULL DEFAULT '',
  odisha_domicile_required INTEGER NOT NULL DEFAULT 1,
  renewal_type TEXT NOT NULL DEFAULT 'Fresh & Renewal',
  stackable_policy TEXT NOT NULL DEFAULT '',
  application_mode TEXT NOT NULL DEFAULT 'Online Portal',
  application_start_date TEXT NOT NULL DEFAULT '',
  last_date TEXT NOT NULL DEFAULT '',
  institute_verification_date TEXT NOT NULL DEFAULT '',
  dwo_sanction_date TEXT NOT NULL DEFAULT '',
  is_ongoing INTEGER NOT NULL DEFAULT 0,
  helpline_number TEXT NOT NULL DEFAULT '',
  grievance_url TEXT NOT NULL DEFAULT '',
  track_status_url TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_caption TEXT NOT NULL DEFAULT '',
  article_body_en TEXT NOT NULL DEFAULT '',
  article_body_or TEXT NOT NULL DEFAULT '',
  benefits_breakdown_json TEXT NOT NULL DEFAULT '[]',
  eligibility_rules_json TEXT NOT NULL DEFAULT '[]',
  required_documents_json TEXT NOT NULL DEFAULT '[]',
  application_steps_json TEXT NOT NULL DEFAULT '[]',
  important_dates_json TEXT NOT NULL DEFAULT '[]',
  faq_items_json TEXT NOT NULL DEFAULT '[]',
  official_apply_url TEXT NOT NULL DEFAULT '',
  official_portal_url TEXT NOT NULL DEFAULT '',
  guidelines_pdf_url TEXT NOT NULL DEFAULT '',
  application_form_pdf_url TEXT NOT NULL DEFAULT '',
  pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
  extra_attachments_json TEXT NOT NULL DEFAULT '[]',
  scheme_status TEXT NOT NULL DEFAULT 'active',
  amendment_note_en TEXT NOT NULL DEFAULT '',
  amendment_note_or TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_scheme_articles_pub ON scheme_articles (is_published, scheduled_publish_at, last_date);
CREATE INDEX IF NOT EXISTS idx_scheme_articles_tax ON scheme_articles (category_l1_id, category_l2_id, category_l3_id);
CREATE INDEX IF NOT EXISTS idx_scheme_articles_status ON scheme_articles (scheme_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS scheme_article_revisions (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scheme_revisions_article ON scheme_article_revisions (article_id, revision_number DESC);

-- Starter 3-Layer Odisha & Central Schemes Taxonomy (editable & extensible live in Admin Studio)
INSERT OR IGNORE INTO scheme_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('stax_l1_odisha', 1, NULL, 'odisha-state-government', 'Odisha State Government', 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାର', 'Flagship Odisha DBT, Scholarships, Health & Welfare Schemes', 'ଓଡ଼ିଶା ସରକାରଙ୍କ ଜନକଲ୍ୟାଣ ଯୋଜନା', '🏛️', 'emerald', 10, 1),
  ('stax_l1_central', 1, NULL, 'central-government-goi', 'Central Government (GoI)', 'କେନ୍ଦ୍ର ସରକାର (ଭାରତ)', 'Central Sector Scholarships, PM Schemes & National DBT', 'କେନ୍ଦ୍ର ସରକାରଙ୍କ ଜାତୀୟ ଯୋଜନା', '🇮🇳', 'cobalt', 20, 1),
  ('stax_l1_joint', 1, NULL, 'centrally-sponsored-joint', 'Centrally Sponsored (Joint)', 'କେନ୍ଦ୍ର-ରାଜ୍ୟ ମିଳିତ ଯୋଜନା', 'Co-funded State + GoI Housing, Health & Livelihood Missions', 'କେନ୍ଦ୍ର ଓ ରାଜ୍ୟ ସରକାରଙ୍କ ମିଳିତ ଯୋଜନା', '🤝', 'violet', 30, 1),
  ('stax_l1_csr', 1, NULL, 'institutional-csr-scholarships', 'Institutional & CSR Scholarships', 'ସଂସ୍ଥାଗତ ଓ CSR ଛାତ୍ରବୃତ୍ତି', 'PSU, University & Corporate CSR Merit Grants', 'ପିଏସୟୁ ଓ କର୍ପୋରେଟ୍ ଛାତ୍ରବୃତ୍ତି', '🎓', 'amber', 40, 1);

INSERT OR IGNORE INTO scheme_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('stax_l2_odisha_edu', 2, 'stax_l1_odisha', 'education-scholarships', 'Education & Scholarships', 'ଶିକ୍ଷା ଓ ଛାତ୍ରବୃତ୍ତି', 'State Scholarship Portal, Gopabandhu Sikhya Sahayata, E-Medhabruti', 'ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ ଓ ମେଧାବୃତ୍ତି', '🎓', 'emerald', 10, 1),
  ('stax_l2_odisha_agri', 2, 'stax_l1_odisha', 'agriculture-farmers', 'Agriculture & Farmers (CM-KISAN / KALIA)', 'କୃଷି ଓ କୃଷକ କଲ୍ୟାଣ (CM-KISAN)', 'CM-KISAN DBT, Crop Insurance & Krushi Sahayata', 'ସିଏମ୍-କିଷାନ୍ ଓ କୃଷକ ସହାୟତା', '🌾', 'emerald', 20, 1),
  ('stax_l2_odisha_women', 2, 'stax_l1_odisha', 'women-child-empowerment', 'Women & Child Empowerment (Subhadra)', 'ମହିଳା ଓ ଶିଶୁ ସଶକ୍ତିକରଣ (ସୁଭଦ୍ରା)', 'Subhadra Yojana, Mamata & Mission Shakti', 'ସୁଭଦ୍ରା ଯୋଜନା ଓ ମିଶନ ଶକ୍ତି', '👩', 'rose', 30, 1),
  ('stax_l2_odisha_health', 2, 'stax_l1_odisha', 'health-insurance-gjay', 'Health & Insurance (GJAY / Ayushman)', 'ସ୍ୱାସ୍ଥ୍ୟ ଓ ବୀମା (GJAY / ଆୟୁଷ୍ମାନ)', 'Gopabandhu Jan Arogya Yojana & Cashless Care', 'ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ ଯୋଜନା', '🏥', 'teal', 40, 1),
  ('stax_l2_odisha_pension', 2, 'stax_l1_odisha', 'social-security-pension', 'Social Security & Pension', 'ସାମାଜିକ ସୁରକ୍ଷା ଓ ଭତ୍ତା', 'Madhu Babu Pension Yojana (Old Age, Widow, PwD)', 'ମଧୁବାବୁ ପେନସନ୍ ଯୋଜନା', '🛡️', 'violet', 50, 1),
  ('stax_l2_odisha_scst', 2, 'stax_l1_odisha', 'sc-st-obc-minority-welfare', 'SC / ST / OBC / Minority Welfare', 'SC / ST / OBC / ସଂଖ୍ୟାଲଘୁ କଲ୍ୟାଣ', 'ST & SC Dev Dept Hostels, Freeship & Post-Matric Aid', 'ଅନୁସୂଚିତ ଜାତି ଓ ଜନଜାତି କଲ୍ୟାଣ', '⚖️', 'emerald', 60, 1),
  ('stax_l2_odisha_labour', 2, 'stax_l1_odisha', 'labour-construction-workers', 'Labour & Construction Workers (OBOCWWB)', 'ଶ୍ରମିକ ଓ ନିର୍ମାଣ ଶ୍ରମିକ (OBOCWWB)', 'Nirman Shramik Kalyan, Marriage, Education & Tool Aid', 'ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ସହାୟତା', '🛠️', 'amber', 70, 1),
  ('stax_l2_central_edu', 2, 'stax_l1_central', 'nsp-central-scholarships', 'Education & Scholarships (NSP)', 'ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି (NSP)', 'National Scholarship Portal, PM-USP & UGC Fellowships', 'ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍', '📚', 'cobalt', 10, 1),
  ('stax_l2_central_agri', 2, 'stax_l1_central', 'pm-kisan-central-agri', 'Agriculture & Farmers (PM-KISAN)', 'ପ୍ରଧାନମନ୍ତ୍ରୀ କିଷାନ୍ (PM-KISAN)', 'PM-KISAN Samman Nidhi, PMFBY & KCC', 'ପିଏମ୍-କିଷାନ୍ ସମ୍ମାନ ନିଧି', '🚜', 'cobalt', 20, 1),
  ('stax_l2_central_msme', 2, 'stax_l1_central', 'skill-development-msme', 'Skill Development & MSME', 'ଦକ୍ଷତା ବିକାଶ ଓ MSME', 'PM Vishwakarma, MUDRA, PMEGP & Skill India', 'ପିଏମ୍ ବିଶ୍ୱକର୍ମା ଓ ମୁଦ୍ରା ଋଣ', '💼', 'cobalt', 30, 1),
  ('stax_l2_joint_housing', 2, 'stax_l1_joint', 'housing-rural-development', 'Housing & Rural Development', 'ଗୃହ ନିର୍ମାଣ ଓ ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ', 'PMAY-G, Antyodaya Gruha & MGNREGS', 'ପ୍ରଧାନମନ୍ତ୍ରୀ ଆବାସ ଓ ଅନ୍ତ୍ୟୋଦୟ ଗୃହ', '🏠', 'violet', 10, 1),
  ('stax_l2_csr_merit', 2, 'stax_l1_csr', 'psu-csr-merit-grants', 'PSU & Corporate Merit Scholarships', 'ପିଏସୟୁ ଓ କର୍ପୋରେଟ୍ ମେଧା ବୃତ୍ତି', 'NALCO, Tata, Reliance, ONGC & SBI Asha Grants', 'ନାଲକୋ, ଟାଟା ଓ ଏସବିଆଇ ଛାତ୍ରବୃତ୍ତି', '⭐', 'amber', 10, 1);

INSERT OR IGNORE INTO scheme_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('stax_l3_edu_postmatric', 3, 'stax_l2_odisha_edu', 'pre-post-matric-scholarship', 'Pre/Post-Matric Scholarship', 'ପ୍ରି / ପୋଷ୍ଟ-ମାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି', 'Annual tuition & maintenance DBT via State Scholarship Portal', 'ବାର୍ଷିକ ଛାତ୍ରବୃତ୍ତି ସହାୟତା', '🎓', 'emerald', 10, 1),
  ('stax_l3_edu_merit', 3, 'stax_l2_odisha_edu', 'direct-cash-transfer-dbt', 'Direct Cash Transfer (DBT)', 'ପ୍ରତ୍ୟକ୍ଷ ଅର୍ଥ ହସ୍ତାନ୍ତର (DBT)', 'Merit & laptop/academic DBT directly to Aadhaar-seeded account', 'ସିଧାସଳଖ ବ୍ୟାଙ୍କ ଖାତାକୁ ସହାୟତା', '💸', 'emerald', 20, 1),
  ('stax_l3_agri_dbt', 3, 'stax_l2_odisha_agri', 'direct-cash-transfer-dbt', 'Direct Cash Transfer (DBT)', 'ପ୍ରତ୍ୟକ୍ଷ ଅର୍ଥ ହସ୍ତାନ୍ତର (DBT)', 'Rabi & Kharif seasonal farmer DBT installments', 'ରବି ଓ ଖରିଫ୍ ଚାଷୀ ସହାୟତା', '💸', 'emerald', 10, 1),
  ('stax_l3_agri_subsidy', 3, 'stax_l2_odisha_agri', 'subsidy-loan-assistance', 'Subsidy / Loan Assistance', 'ସବସିଡି / ଋଣ ସହାୟତା', 'Farm machinery subsidy & zero-interest crop loan', 'କୃଷି ଯନ୍ତ୍ରପାତି ସବସିଡି ଓ ଋଣ', '🏦', 'amber', 20, 1),
  ('stax_l3_women_dbt', 3, 'stax_l2_odisha_women', 'direct-cash-transfer-dbt', 'Direct Cash Transfer (DBT)', 'ପ୍ରତ୍ୟକ୍ଷ ଅର୍ଥ ହସ୍ତାନ୍ତର (DBT)', 'Bi-annual / periodic DBT financial empowerment grant', 'ମହିଳା ଆର୍ଥିକ ସହାୟତା (DBT)', '💸', 'rose', 10, 1),
  ('stax_l3_health_cashless', 3, 'stax_l2_odisha_health', 'cashless-health-insurance', 'Cashless Health Insurance', 'ନଗଦହୀନ ସ୍ୱାସ୍ଥ୍ୟ ବୀମା', 'Empanelled hospital cashless coverage up to ₹5L–₹10L', 'ମାଗଣା ଚିକିତ୍ସା ବୀମା ସୁରକ୍ଷା', '🏥', 'teal', 10, 1),
  ('stax_l3_pension_monthly', 3, 'stax_l2_odisha_pension', 'monthly-pension-aid', 'Monthly Pension / Aid', 'ମାସିକ ପେନସନ୍ / ଭତ୍ତା', 'Monthly social security pension credited via DBT / GP', 'ମାସିକ ସାମାଜିକ ସୁରକ୍ଷା ଭତ୍ତା', '🛡️', 'violet', 10, 1),
  ('stax_l3_scst_schol', 3, 'stax_l2_odisha_scst', 'pre-post-matric-scholarship', 'Pre/Post-Matric Scholarship', 'ପ୍ରି / ପୋଷ୍ଟ-ମାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି', 'SC/ST/SEBC hostel & tuition reimbursement grants', 'SC/ST/SEBC ଛାତ୍ରବୃତ୍ତି', '🎓', 'emerald', 10, 1),
  ('stax_l3_labour_tool', 3, 'stax_l2_odisha_labour', 'tool-equipment-housing-grant', 'Tool / Equipment / Housing Grant', 'ଯନ୍ତ୍ରପାତି / ଗୃହ ଅନୁଦାନ', 'Cycle, safety kit, education & housing support for registered workers', 'ନିର୍ମାଣ ଶ୍ରମିକ ଉପକରଣ ଓ ଗୃହ ସହାୟତା', '🛠️', 'amber', 10, 1),
  ('stax_l3_nsp_schol', 3, 'stax_l2_central_edu', 'pre-post-matric-scholarship', 'Pre/Post-Matric Scholarship', 'ପ୍ରି / ପୋଷ୍ଟ-ମାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି', 'Central sector & minority merit-cum-means scholarships', 'କେନ୍ଦ୍ରୀୟ ଛାତ୍ରବୃତ୍ତି', '🎓', 'cobalt', 10, 1),
  ('stax_l3_pmkisan_dbt', 3, 'stax_l2_central_agri', 'direct-cash-transfer-dbt', 'Direct Cash Transfer (DBT)', 'ପ୍ରତ୍ୟକ୍ଷ ଅର୍ଥ ହସ୍ତାନ୍ତର (DBT)', 'Annual ₹6,000 farmer income support in 3 installments', 'ବାର୍ଷିକ ₹୬,୦୦୦ ଚାଷୀ ସହାୟତା', '💸', 'cobalt', 10, 1),
  ('stax_l3_msme_loan', 3, 'stax_l2_central_msme', 'subsidy-loan-assistance', 'Subsidy / Loan Assistance', 'ସବସିଡି / ଋଣ ସହାୟତା', 'Collateral-free enterprise credit & artisan toolkit grant', 'ଉଦ୍ୟୋଗୀ ଋଣ ଓ ସବସିଡି', '🏦', 'cobalt', 10, 1),
  ('stax_l3_housing_grant', 3, 'stax_l2_joint_housing', 'tool-equipment-housing-grant', 'Tool / Equipment / Housing Grant', 'ଗୃହ ନିର୍ମାଣ ଅନୁଦାନ', 'Pucca house construction grant released in milestone tranches', 'ପକ୍କା ଘର ନିର୍ମାଣ ସହାୟତା', '🏠', 'violet', 10, 1),
  ('stax_l3_csr_grant', 3, 'stax_l2_csr_merit', 'pre-post-matric-scholarship', 'Pre/Post-Matric Scholarship', 'ମେଧା ଛାତ୍ରବୃତ୍ତି ଅନୁଦାନ', 'Merit-cum-means scholarship for UG/PG/Professional students', 'ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀ ବୃତ୍ତି', '🎓', 'amber', 10, 1);

-- Scheme-Specific Reusable Bilingual Snippets (shared editorial_snippets table)
INSERT OR IGNORE INTO editorial_snippets (id, snippet_key, category, title_en, title_or, body_en, body_or, sort_order, is_published) VALUES
  (
    'snip_scheme_income_resident',
    'odisha-resident-income-1yr-rules',
    'schemes',
    'Odisha Resident & Income Certificate Rules (1-Yr Validity)',
    'ଓଡ଼ିଶା ବାସିନ୍ଦା ଓ ଆୟ ପ୍ରମାଣପତ୍ର ନିୟମ (୧ ବର୍ଷ ବୈଧତା)',
    '### Odisha e-District Certificate Validity Rules\n- **Annual Family Income Certificate:** Valid for **1 year** from the date of issue by the Tahasildar (`edistrict.odisha.gov.in`). Always verify the validity date before scholarship or welfare renewal.\n- **Resident / Nativity Certificate:** Required for all Odisha State Government schemes; ensure your Aadhaar address and Tahasil details match.\n- **Caste / SEBC Certificate:** Digitally signed QR-verified certificate issued by Odisha Revenue Authority.',
    '### ଓଡ଼ିଶା ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ପ୍ରମାଣପତ୍ର ବୈଧତା ନିୟମ\n- **ବାର୍ଷିକ ପାରିବାରିକ ଆୟ ପ୍ରମାଣପତ୍ର:** ତହସିଲଦାରଙ୍କ ଦ୍ୱାରା ପ୍ରଦତ୍ତ ତାରିଖରୁ **୧ ବର୍ଷ** ପର୍ଯ୍ୟନ୍ତ ବୈଧ ରହେ (`edistrict.odisha.gov.in`)। ନବୀକରଣ ପୂର୍ବରୁ ବୈଧତା ଯାଞ୍ଚ କରନ୍ତୁ।\n- **ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର:** ସମସ୍ତ ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା ପାଇଁ ବାଧ୍ୟତାମୂଳକ।\n- **ଜାତି / SEBC ପ୍ରମାଣପତ୍ର:** ଡିଜିଟାଲ୍ ସ୍ୱାକ୍ଷରିତ QR ଯୁକ୍ତ ପ୍ରମାଣପତ୍ର ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।',
    50,
    1
  ),
  (
    'snip_scheme_npci_seeding',
    'npci-aadhaar-bank-seeding-guide',
    'schemes',
    'NPCI Aadhaar-Bank Seeding vs Bank Linking Guide',
    'NPCI ଆଧାର-ବ୍ୟାଙ୍କ ସିଡିଂ ବନାମ ବ୍ୟାଙ୍କ ଲିଙ୍କିଂ ମାର୍ଗଦର୍ଶିକା',
    '### Why NPCI DBT Seeding Is Mandatory (Not Just Aadhaar KYC)\n- **Aadhaar Linking (KYC)** only verifies identity at your bank branch, whereas **NPCI Aadhaar Mapper Seeding (DBT Enabled)** lets Government treasuries credit Subhadra, CM-KISAN, and Scholarship funds directly via Aadhaar Payment Bridge (APB).\n- **How to Check Status:** Visit [myAadhaar NPCI Bank Seeding Status](https://myaadhaar.uidai.gov.in/) or dial `*99*99#` from your Aadhaar-registered mobile.\n> If status shows **Inactive**, submit an **NPCI DBT Consent Form** at your bank branch with a copy of your Aadhaar and passbook.',
    '### NPCI DBT ସିଡିଂ କାହିଁକି ବାଧ୍ୟତାମୂଳକ (କେବଳ KYC ଯଥେଷ୍ଟ ନୁହେଁ)\n- **ବ୍ୟାଙ୍କ ଲିଙ୍କିଂ (KYC)** କେବଳ ପରିଚୟ ଯାଞ୍ଚ କରେ, କିନ୍ତୁ **NPCI ଆଧାର ସିଡିଂ (DBT Enabled)** ଦ୍ୱାରା ସୁଭଦ୍ରା, CM-KISAN ଓ ଛାତ୍ରବୃତ୍ତି ଟଙ୍କା ସିଧାସଳଖ ଆପଣଙ୍କ ଖାତାକୁ ଆସେ।\n- **ସ୍ଥିତି କିପରି ଯାଞ୍ଚ କରିବେ:** [myAadhaar NPCI Status](https://myaadhaar.uidai.gov.in/) ପୋର୍ଟାଲରେ କିମ୍ବା `*99*99#` ଡାଏଲ୍ କରି ଯାଞ୍ଚ କରନ୍ତୁ।\n> ଯଦି **Inactive** ଦେଖାଏ, ତେବେ ବ୍ୟାଙ୍କ ଶାଖାରେ **NPCI DBT Consent Form** ଦାଖଲ କରନ୍ତୁ।',
    60,
    1
  ),
  (
    'snip_scheme_otr_freeship',
    'odisha-scholarship-otr-freeship-guide',
    'schemes',
    'Odisha State Scholarship OTR & Freeship Card Guide',
    'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି OTR ଓ ଫ୍ରିସିପ୍ କାର୍ଡ ମାର୍ଗଦର୍ଶିକା',
    '### State Scholarship Portal OTR & Freeship Card Steps\n- **One-Time Registration (OTR):** Complete Aadhaar e-KYC registration on [scholarship.odisha.gov.in](https://scholarship.odisha.gov.in/) to generate your unique Student ID.\n- **Freeship Card (SC/ST/SEBC):** Download the Freeship Card before college admission so tuition fees are adjusted directly without upfront payment.\n- **Institute & DWO Verification:** After submitting online, hand over the signed print copy + documents to your **College Nodal Officer** before the Institute Verification deadline.',
    '### ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ OTR ଓ ଫ୍ରିସିପ୍ କାର୍ଡ ପଦକ୍ଷେପ\n- **OTR ପଞ୍ଜୀକରଣ:** [scholarship.odisha.gov.in](https://scholarship.odisha.gov.in/) ରେ ଆଧାର e-KYC କରି ଆପଣଙ୍କ Unique Student ID ତିଆରି କରନ୍ତୁ।\n- **ଫ୍ରିସିପ୍ କାର୍ଡ:** ନାମଲେଖା ପୂର୍ବରୁ SC/ST/SEBC ଛାତ୍ରଛାତ୍ରୀମାନେ ଫ୍ରିସିପ୍ କାର୍ଡ ଡାଉନଲୋଡ୍ କରନ୍ତୁ।\n- **କଲେଜ୍ ଓ DWO ଯାଞ୍ଚ:** ଅନଲାଇନ୍ ଆବେଦନ ପରେ ସ୍ୱାକ୍ଷରିତ ପ୍ରିଣ୍ଟ କପିକୁ ନିଜ **କଲେଜ୍ ନୋଡାଲ୍ ଅଫିସର**ଙ୍କ ନିକଟରେ ଦାଖଲ କରନ୍ତୁ।',
    70,
    1
  ),
  (
    'snip_scheme_moseba_csc',
    'mo-seba-kendra-csc-block-guide',
    'schemes',
    'Mo Seba Kendra / CSC & Block Office Application Guide',
    'ମୋ ସେବା କେନ୍ଦ୍ର / CSC ଓ ବ୍ଲକ୍ ଅଫିସ୍ ଆବେଦନ ମାର୍ଗଦର୍ଶିକା',
    '### Applying via Mo Seba Kendra (MSK) / CSC / Block Office\n- Carry **Original Aadhaar Card**, **Bank Passbook (NPCI Seeded)**, **Ration Card (NFSA/SFSS)**, and **e-District Certificates** to your nearest **Mo Seba Kendra (MSK)** or **Jana Seva Kendra**.\n- **Zero Private Commission:** Government welfare schemes do **not** charge unofficial agent fees. Always collect the official **Acknowledgement Receipt / Application Reference Number** to track payment status online.',
    '### ମୋ ସେବା କେନ୍ଦ୍ର (MSK) / CSC / ବ୍ଲକ୍ ଅଫିସ୍ ମାଧ୍ୟମରେ ଆବେଦନ\n- ନିକଟସ୍ଥ **ମୋ ସେବା କେନ୍ଦ୍ର (MSK)** କିମ୍ବା **ଜନସେବା କେନ୍ଦ୍ର**କୁ ମୂଳ **ଆଧାର କାର୍ଡ**, **NPCI ସିଡେଡ୍ ବ୍ୟାଙ୍କ ପାସବୁକ୍**, **ରାସନ୍ କାର୍ଡ** ଓ **ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ପ୍ରମାଣପତ୍ର** ନେଇ ଯାଆନ୍ତୁ।\n- **କୌଣସି ଦଲାଲ୍ ଫିସ୍ ନାହିଁ:** ସରକାରୀ ଯୋଜନା ପାଇଁ ଅତିରିକ୍ତ କମିଶନ୍ ଦିଅନ୍ତୁ ନାହିଁ ଏବଂ ସର୍ବଦା **ଆବେଦନ ରସିଦ୍ (Acknowledgement Receipt)** ସଂଗ୍ରହ କରନ୍ତୁ।',
    80,
    1
  );
