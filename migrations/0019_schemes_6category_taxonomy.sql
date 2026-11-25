-- Migration 0019: Canonical 6-Category / 18-Subcategory Schemes Taxonomy for Two-Stage Cascading Menu & Admin Sync (v283)
-- Idempotent upsert: safe to run on fresh or existing D1 databases.

-- Retire legacy 4-bucket starter L1 nodes from active public nav_categories while preserving historical FK references
UPDATE scheme_taxonomy_nodes
SET is_published = 0, updated_at = datetime('now')
WHERE id IN ('stax_l1_odisha', 'stax_l1_central', 'stax_l1_joint', 'stax_l1_csr');

-- 6 Canonical L1 Scheme Categories
INSERT INTO scheme_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at) VALUES
  ('stax_l1_odisha_welfare', 1, NULL, 'odisha-state-welfare', 'Odisha State Welfare', 'ଓଡ଼ିଶା ରାଜ୍ୟ କଲ୍ୟାଣ', 'Ration, pensions, housing & flagship Odisha welfare schemes', 'ରାସନ୍, ଭତ୍ତା, ଆବାସ ଓ ଓଡ଼ିଶା ସରକାରୀ କଲ୍ୟାଣ ଯୋଜନା', '🏛️', 'emerald', 10, 1, datetime('now')),
  ('stax_l1_central_welfare', 1, NULL, 'central-welfare', 'Central Welfare Schemes', 'କେନ୍ଦ୍ର ସରକାରୀ କଲ୍ୟାଣ ଯୋଜନା', 'GoI DBT, national housing, sanitation & social cover schemes', 'କେନ୍ଦ୍ର ସରକାରଙ୍କ DBT, ଆବାସ ଓ ସାମାଜିକ ସୁରକ୍ଷା ଯୋଜନା', '🇮🇳', 'cobalt', 20, 1, datetime('now')),
  ('stax_l1_agriculture_farmers', 1, NULL, 'agriculture-farmers', 'Agriculture & Farmers', 'କୃଷି ଓ କୃଷକ କଲ୍ୟାଣ', 'CM-KISAN, PM-KISAN, crop insurance, irrigation & fisheries', 'CM-KISAN, PM-KISAN, ଫସଲ ବୀମା, ଜଳସେଚନ ଓ ମତ୍ସ୍ୟ ଚାଷ', '🌾', 'emerald', 30, 1, datetime('now')),
  ('stax_l1_education_scholarships', 1, NULL, 'education-scholarships', 'Education & Scholarships', 'ଶିକ୍ଷା ଓ ଛାତ୍ରବୃତ୍ତି', 'Pre/Post-Matric, higher education merit aid, skills & laptops', 'ପ୍ରି/ପୋଷ୍ଟ-ମାଟ୍ରିକ୍, ଉଚ୍ଚଶିକ୍ଷା ବୃତ୍ତି, ଦକ୍ଷତା ଓ ଲାପଟପ୍', '🎓', 'violet', 40, 1, datetime('now')),
  ('stax_l1_women_child_social', 1, NULL, 'women-child-social', 'Women, Child & Social Security', 'ମହିଳା, ଶିଶୁ ଓ ସାମାଜିକ ସୁରକ୍ଷା', 'Subhadra Yojana, SHGs, maternal care, Divyangjan & seniors', 'ସୁଭଦ୍ରା ଯୋଜନା, SHG, ମାତୃ ଯତ୍ନ, ଦିବ୍ୟାଙ୍ଗ ଓ ବରିଷ୍ଠ ନାଗରିକ', '👩', 'rose', 50, 1, datetime('now')),
  ('stax_l1_health_msme_livelihoods', 1, NULL, 'health-msme-livelihoods', 'Health, MSME & Livelihoods', 'ସ୍ୱାସ୍ଥ୍ୟ, MSME ଓ ଜୀବିକା', 'Cashless health cover, youth self-employment loans & labour aid', 'ନଗଦହୀନ ସ୍ୱାସ୍ଥ୍ୟ ବୀମା, ଯୁବ ଆତ୍ମନିଯୁକ୍ତି ଓ ଶ୍ରମିକ ସହାୟତା', '🏥', 'teal', 60, 1, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  level = excluded.level,
  parent_id = excluded.parent_id,
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

-- 18 Canonical L2 Sub-Categories (3 per L1 Category)
INSERT INTO scheme_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at) VALUES
  -- 1. Odisha State Welfare
  ('stax_l2_food_security_ration', 2, 'stax_l1_odisha_welfare', 'food-security-ration', 'Food Security & Ration', 'ଖାଦ୍ୟ ସୁରକ୍ଷା ଓ ରାସନ୍', 'NFSA, SFSS ration cards & subsidised food grains', 'NFSA, SFSS ରାସନ୍ କାର୍ଡ ଓ ଖାଦ୍ୟ ସୁରକ୍ଷା', '🍚', 'emerald', 10, 1, datetime('now')),
  ('stax_l2_financial_assistance_pensions', 2, 'stax_l1_odisha_welfare', 'financial-assistance-pensions', 'Financial Assistance & Pensions', 'ଆର୍ଥିକ ସହାୟତା ଓ ଭତ୍ତା', 'Madhu Babu Pension Yojana & state DBT grants', 'ମଧୁବାବୁ ପେନସନ୍ ଓ ରାଜ୍ୟ DBT ସହାୟତା', '💰', 'emerald', 20, 1, datetime('now')),
  ('stax_l2_housing_rural_infrastructure', 2, 'stax_l1_odisha_welfare', 'housing-rural-infrastructure', 'Housing & Rural Infrastructure', 'ଆବାସ ଓ ଗ୍ରାମ୍ୟ ଭିତ୍ତିଭୂମି', 'Antyodaya Gruha, rural housing & GP welfare', 'ଅନ୍ତ୍ୟୋଦୟ ଗୃହ ଓ ଗ୍ରାମ୍ୟ ଆବାସ', '🏠', 'emerald', 30, 1, datetime('now')),

  -- 2. Central Welfare Schemes
  ('stax_l2_direct_benefit_transfer_dbt', 2, 'stax_l1_central_welfare', 'direct-benefit-transfer-dbt', 'Direct Benefit Transfer (DBT)', 'ପ୍ରତ୍ୟକ୍ଷ ଅର୍ଥ ହସ୍ତାନ୍ତର (DBT)', 'Central Aadhaar-seeded direct benefit transfers', 'କେନ୍ଦ୍ରୀୟ ଆଧାର-ଲିଙ୍କ୍ DBT ଯୋଜନା', '🏦', 'cobalt', 10, 1, datetime('now')),
  ('stax_l2_national_housing_sanitation', 2, 'stax_l1_central_welfare', 'national-housing-sanitation', 'National Housing & Sanitation', 'ଜାତୀୟ ଆବାସ ଓ ସ୍ୱଚ୍ଛତା', 'PMAY-G, PMAY-U, Swachh Bharat & Jal Jeevan', 'PMAY-G, PMAY-U ଓ ସ୍ୱଚ୍ଛ ଭାରତ ମିଶନ୍', '🏘️', 'cobalt', 20, 1, datetime('now')),
  ('stax_l2_citizen_identity_social_cover', 2, 'stax_l1_central_welfare', 'citizen-identity-social-cover', 'Citizen Identity & Social Cover', 'ନାଗରିକ ପରିଚୟ ଓ ସାମାଜିକ ସୁରକ୍ଷା', 'PMSBY, PMJJBY, Atal Pension & e-Shram cover', 'PMSBY, PMJJBY, ଅଟଳ ପେନସନ୍ ଓ ଇ-ଶ୍ରମ', '🛡️', 'cobalt', 30, 1, datetime('now')),

  -- 3. Agriculture & Farmers
  ('stax_l2_income_support_crop_insurance', 2, 'stax_l1_agriculture_farmers', 'income-support-crop-insurance', 'Income Support & Crop Insurance', 'ଆୟ ସହାୟତା ଓ ଫସଲ ବୀମା', 'CM-KISAN, PM-KISAN & PMFBY crop cover', 'CM-KISAN, PM-KISAN ଓ ପ୍ରଧାନମନ୍ତ୍ରୀ ଫସଲ ବୀମା', '🌱', 'emerald', 10, 1, datetime('now')),
  ('stax_l2_irrigation_seeds_machinery', 2, 'stax_l1_agriculture_farmers', 'irrigation-seeds-machinery', 'Irrigation, Seeds & Machinery', 'ଜଳସେଚନ, ବିହନ ଓ କୃଷି ଯନ୍ତ୍ରପାତି', 'Farm mechanisation subsidy, seeds & solar pumps', 'କୃଷି ଯନ୍ତ୍ରପାତି ସବସିଡି, ବିହନ ଓ ଜଳସେଚନ', '🚜', 'emerald', 20, 1, datetime('now')),
  ('stax_l2_fisheries_animal_husbandry', 2, 'stax_l1_agriculture_farmers', 'fisheries-animal-husbandry', 'Fisheries & Animal Husbandry', 'ମତ୍ସ୍ୟ ଓ ପଶୁପାଳନ', 'Matsya Sampada, dairy, poultry & goat farming aid', 'ମତ୍ସ୍ୟ ସମ୍ପଦ, ଗୋପାଳନ ଓ କୁକୁଡ଼ା ଚାଷ ସହାୟତା', '🐟', 'emerald', 30, 1, datetime('now')),

  -- 4. Education & Scholarships
  ('stax_l2_pre_matric_post_matric', 2, 'stax_l1_education_scholarships', 'pre-matric-post-matric', 'Pre-Matric & Post-Matric', 'ପ୍ରି-ମାଟ୍ରିକ୍ ଓ ପୋଷ୍ଟ-ମାଟ୍ରିକ୍', 'Odisha State Scholarship Portal & NSP matric grants', 'ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ ଓ NSP ବୃତ୍ତି', '📚', 'violet', 10, 1, datetime('now')),
  ('stax_l2_higher_education_merit_aid', 2, 'stax_l1_education_scholarships', 'higher-education-merit-aid', 'Higher Education & Merit Aid', 'ଉଚ୍ଚଶିକ୍ଷା ଓ ମେଧା ବୃତ୍ତି', 'E-Medhabruti, Gopabandhu Sikhya & UGC fellowships', 'ଇ-ମେଧାବୃତ୍ତି, ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ଓ ଫେଲୋସିପ୍', '🏅', 'violet', 20, 1, datetime('now')),
  ('stax_l2_skill_training_laptops', 2, 'stax_l1_education_scholarships', 'skill-training-laptops', 'Skill Training & Laptops', 'ଦକ୍ଷତା ତାଲିମ ଓ ଲାପଟପ୍', 'Godabarisha Vidyarthi Protsahana, PMKVY & skill grants', 'ଗୋଦାବରୀଶ ବିଦ୍ୟାର୍ଥୀ ପ୍ରୋତ୍ସାହନ ଓ ଦକ୍ଷତା ତାଲିମ', '💻', 'violet', 30, 1, datetime('now')),

  -- 5. Women, Child & Social Security
  ('stax_l2_women_empowerment_shgs', 2, 'stax_l1_women_child_social', 'women-empowerment-shgs', 'Women Empowerment & SHGs', 'ମହିଳା ସଶକ୍ତିକରଣ ଓ SHG', 'Subhadra Yojana, Lakhpati Didi & Mission Shakti', 'ସୁଭଦ୍ରା ଯୋଜନା, ଲକ୍ଷପତି ଦିଦି ଓ ମିଶନ ଶକ୍ତି', '👩‍💼', 'rose', 10, 1, datetime('now')),
  ('stax_l2_girl_child_maternal_care', 2, 'stax_l1_women_child_social', 'girl-child-maternal-care', 'Girl Child & Maternal Care', 'କନ୍ୟା ସନ୍ତାନ ଓ ମାତୃ ଯତ୍ନ', 'Mamata, Sukanya Samriddhi & PMMVY maternal benefits', 'ମମତା, ସୁକନ୍ୟା ସମୃଦ୍ଧି ଓ PMMVY ଯୋଜନା', '🤱', 'rose', 20, 1, datetime('now')),
  ('stax_l2_divyangjan_senior_citizens', 2, 'stax_l1_women_child_social', 'divyangjan-senior-citizens', 'Divyangjan & Senior Citizens', 'ଦିବ୍ୟାଙ୍ଗ ଓ ବରିଷ୍ଠ ନାଗରିକ', 'Disability pensions, assistive devices & elder care', 'ଦିବ୍ୟାଙ୍ଗ ଭତ୍ତା, ସହାୟକ ଉପକରଣ ଓ ବରିଷ୍ଠ ଯତ୍ନ', '♿', 'rose', 30, 1, datetime('now')),

  -- 6. Health, MSME & Livelihoods
  ('stax_l2_cashless_health_insurance', 2, 'stax_l1_health_msme_livelihoods', 'cashless-health-insurance', 'Cashless Health Insurance', 'ନଗଦହୀନ ସ୍ୱାସ୍ଥ୍ୟ ବୀମା', 'Ayushman Bharat PM-JAY & Gopabandhu Jan Arogya', 'ଆୟୁଷ୍ମାନ ଭାରତ PM-JAY ଓ ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ', '🩺', 'teal', 10, 1, datetime('now')),
  ('stax_l2_youth_self_employment_loans', 2, 'stax_l1_health_msme_livelihoods', 'youth-self-employment-loans', 'Youth Self-Employment & Loans', 'ଯୁବ ଆତ୍ମନିଯୁକ୍ତି ଓ ଋଣ', 'PM Vishwakarma, MUDRA, PMEGP & Odisha MSME loans', 'PM ବିଶ୍ୱକର୍ମା, ମୁଦ୍ରା, PMEGP ଓ MSME ଋଣ', '💼', 'teal', 20, 1, datetime('now')),
  ('stax_l2_labour_construction_workers', 2, 'stax_l1_health_msme_livelihoods', 'labour-construction-workers', 'Labour & Construction Workers', 'ଶ୍ରମିକ ଓ ନିର୍ମାଣ ଶ୍ରମିକ', 'OBOCWWB Nirman Shramik Kalyan, tool & education aid', 'OBOCWWB ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ସହାୟତା', '🛠️', 'teal', 30, 1, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  level = excluded.level,
  parent_id = excluded.parent_id,
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
