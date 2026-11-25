-- v285: Canonical 6-Track / 18-Subcollection Study Library Taxonomy (Idempotent)
-- Retires legacy starter L1 nodes (is_published = 0) and upserts the 6 canonical L1 Study Tracks
-- and 18 L2 Sub-Collections in study_taxonomy_nodes for live sync across:
--   1. Public single-stage Study Library ▾ navigation dropdown (/api/public/study-library/bootstrap)
--   2. Minimal /study-library/ & /study/ Explorer track pills and Sub-Collection filter
--   3. Admin Studio Study Library ▾ sidebar folder & Publishing House

-- Retire legacy starter L1 tracks (keep rows intact for any historical article references)
UPDATE study_taxonomy_nodes
SET is_published = 0, updated_at = datetime('now')
WHERE level = 1
  AND id IN (
    'stax_l1_opsc_oas',
    'stax_l1_ossc_osssc',
    'stax_l1_teaching_tet',
    'stax_l1_odisha_gk',
    'stax_l1_odia_lang',
    'stax_l1_ugc_net',
    'stax_l1_central_exams',
    'stax_l1_school_board'
  );

-- Upsert 6 Canonical Level 1 Study Tracks
INSERT INTO study_taxonomy_nodes (
  id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at
) VALUES
  (
    'stl_l1_odisha_state', 1, NULL, 'odisha-state-exams',
    'Odisha State Exams', 'ଓଡ଼ିଶା ରାଜ୍ୟ ପରୀକ୍ଷା',
    'OPSC OAS/ASO, OSSC & OSSSC Combined, Odisha Police & High Court preparation',
    'OPSC, OSSC, OSSSC, ଓଡ଼ିଶା ପୋଲିସ୍ ଓ ହାଇକୋର୍ଟ ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି',
    '🏛️', 'emerald', 10, 1, datetime('now')
  ),
  (
    'stl_l1_central_exams', 1, NULL, 'central-competitive-exams',
    'Central Competitive Exams', 'କେନ୍ଦ୍ରୀୟ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା',
    'UPSC Civil Services, SSC CGL/CHSL/GD, Banking (IBPS/SBI/RBI) & Railways',
    'UPSC, SSC, ବ୍ୟାଙ୍କିଂ (IBPS/SBI/RBI) ଓ ରେଳବାଇ ପରୀକ୍ଷା',
    '🇮🇳', 'indigo', 20, 1, datetime('now')
  ),
  (
    'stl_l1_teaching_educator', 1, NULL, 'teaching-educator-exams',
    'Teaching & Educator Exams', 'ଶିକ୍ଷକ ଓ ଶିକ୍ଷାଦାନ ପରୀକ୍ଷା',
    'OTET, OSSTET, CTET, KVS/NVS/EMRS, OAVS, LTR, PGT/TGT & B.Ed pedagogy',
    'OTET, OSSTET, CTET, KVS/NVS, OAVS, LTR ଓ B.Ed ପ୍ରସ୍ତୁତି',
    '🎓', 'violet', 30, 1, datetime('now')
  ),
  (
    'stl_l1_school_board', 1, NULL, 'school-board-notes',
    'School & Board Notes (CHSE / BSE)', 'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ନୋଟ୍ସ (CHSE / BSE)',
    'Class 10 BSE Odisha Matric, Class 12 CHSE Science/Commerce/Arts & NCERT',
    'ଦଶମ (BSE Odisha) ଓ ଦ୍ୱାଦଶ (CHSE) ବିଜ୍ଞାନ, ବାଣିଜ୍ୟ, କଳା ଓ NCERT ନୋଟ୍ସ',
    '📘', 'cobalt', 40, 1, datetime('now')
  ),
  (
    'stl_l1_skill_coding', 1, NULL, 'skill-coding-digital',
    'Skill, Coding & Digital Literacy', 'କୌଶଳ, କୋଡିଂ ଓ ଡିଜିଟାଲ୍ ଜ୍ଞାନ',
    'Computer fundamentals, MS Office, Web Dev, Python, AI basics & Spoken English',
    'କମ୍ପ୍ୟୁଟର, MS Office, ୱେବ୍ ଡେଭଲପମେଣ୍ଟ, Python, AI ଓ ଇଂରାଜୀ କଥୋପକଥନ',
    '💻', 'teal', 50, 1, datetime('now')
  ),
  (
    'stl_l1_pyq_mocks', 1, NULL, 'previous-papers-mock-tests',
    'Previous Papers & Mock Tests', 'ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର ଓ ମକ୍ ଟେଷ୍ଟ',
    'Solved Odisha & Central Govt PYQ archives, topic-wise practice sets & syllabi',
    'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ସରକାରୀ ପରୀକ୍ଷାର PYQ, ଅଭ୍ୟାସ ସେଟ୍ ଓ ସିଲାବସ୍ PDF',
    '📜', 'amber', 60, 1, datetime('now')
  )
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

-- Upsert 18 Canonical Level 2 Sub-Collections (3 per L1 Study Track)
INSERT INTO study_taxonomy_nodes (
  id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at
) VALUES
  -- 1. Odisha State Exams
  ('stl_l2_opsc_oas', 2, 'stl_l1_odisha_state', 'opsc-oas-ojs-aso',
   'OPSC (OAS / OJS / ASO)', 'OPSC (OAS / OJS / ASO)',
   'Odisha Civil Services Prelims, Mains GS, Judicial Services & ASO', 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା, ନ୍ୟାୟିକ ସେବା ଓ ASO', '🏛️', 'emerald', 10, 1, datetime('now')),
  ('stl_l2_ossc_osssc', 2, 'stl_l1_odisha_state', 'ossc-osssc-cgl-ri-amin',
   'OSSC & OSSSC (CGL / RI / Amin)', 'OSSC ଓ OSSSC (CGL / RI / ଅମିନ)',
   'Combined Graduate Level, RI, ARI, Amin, ICDS, Forest Guard & PEO', 'CGL, RI, ARI, ଅମିନ, ଫରେଷ୍ଟ ଗାର୍ଡ ଓ PEO', '📋', 'emerald', 20, 1, datetime('now')),
  ('stl_l2_odisha_police', 2, 'stl_l1_odisha_state', 'odisha-police-oprb-high-court',
   'Odisha Police (OPRB) & High Court', 'ଓଡ଼ିଶା ପୋଲିସ୍ (OPRB) ଓ ହାଇକୋର୍ଟ',
   'Odisha Police SI, Constable, Fireman & Orissa High Court ASO/Clerk', 'ପୋଲିସ୍ SI, କନଷ୍ଟେବଳ, ଅଗ୍ନିଶମ ଓ ହାଇକୋର୍ଟ ASO', '🛡️', 'emerald', 30, 1, datetime('now')),

  -- 2. Central Competitive Exams
  ('stl_l2_upsc_nda', 2, 'stl_l1_central_exams', 'upsc-civil-services-nda-cds',
   'UPSC Civil Services & NDA/CDS', 'UPSC ସିଭିଲ୍ ସର୍ଭିସେସ୍ ଓ NDA/CDS',
   'UPSC CSE Prelims & Mains, CAPF, NDA & CDS foundation notes', 'UPSC CSE, CAPF, NDA ଓ CDS ଅଧ୍ୟୟନ ସାମଗ୍ରୀ', '🇮🇳', 'indigo', 10, 1, datetime('now')),
  ('stl_l2_ssc_cgl', 2, 'stl_l1_central_exams', 'ssc-cgl-chsl-mts-gd',
   'SSC (CGL / CHSL / MTS / GD)', 'SSC (CGL / CHSL / MTS / GD)',
   'Staff Selection Commission Tier-I & Tier-II Quant, Reasoning, GK & English', 'SSC Tier-I ଓ Tier-II ଗଣିତ, ଯୁକ୍ତିଶକ୍ତି ଓ ଇଂରାଜୀ', '📊', 'indigo', 20, 1, datetime('now')),
  ('stl_l2_banking_rrb', 2, 'stl_l1_central_exams', 'banking-ibps-sbi-rbi-railways-rrb',
   'Banking (IBPS / SBI / RBI) & Railways (RRB)', 'ବ୍ୟାଙ୍କିଂ (IBPS / SBI / RBI) ଓ ରେଳବାଇ (RRB)',
   'IBPS PO/Clerk, SBI, RBI Assistant, RRB NTPC, ALP & Group D', 'IBPS, SBI, RBI ଓ ରେଳବାଇ NTPC/ALP/Group D', '🏦', 'indigo', 30, 1, datetime('now')),

  -- 3. Teaching & Educator Exams
  ('stl_l2_otet_osstet', 2, 'stl_l1_teaching_educator', 'otet-osstet-odisha-teacher',
   'OTET & OSSTET (Odisha Teacher Eligibility)', 'OTET ଓ OSSTET (ଓଡ଼ିଶା ଶିକ୍ଷକ ଯୋଗ୍ୟତା)',
   'Paper-I & Paper-II Child Development, Pedagogy, Odia & subject notes', 'ପେପର୍-୧ ଓ ପେପର୍-୨ ଶିଶୁ ବିକାଶ, ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ ଓ ବିଷୟ', '🎓', 'violet', 10, 1, datetime('now')),
  ('stl_l2_ctet_kvs', 2, 'stl_l1_teaching_educator', 'ctet-kvs-nvs-emrs',
   'CTET & KVS / NVS / EMRS', 'CTET ଓ KVS / NVS / EMRS',
   'Central Teacher Eligibility Test, Kendriya Vidyalaya, Navodaya & EMRS', 'କେନ୍ଦ୍ରୀୟ ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା, KVS, NVS ଓ EMRS', '🏫', 'violet', 20, 1, datetime('now')),
  ('stl_l2_oavs_ltr', 2, 'stl_l1_teaching_educator', 'oavs-ltr-pgt-tgt-bed-pedagogy',
   'OAVS, LTR, PGT / TGT & B.Ed Pedagogy', 'OAVS, LTR, PGT / TGT ଓ B.Ed ପେଡାଗୋଜି',
   'Odisha Adarsha Vidyalaya, Leave Training Reserve & State B.Ed entrance', 'ଓଡ଼ିଶା ଆଦର୍ଶ ବିଦ୍ୟାଳୟ, LTR ଓ B.Ed ପ୍ରବେଶିକା', '📚', 'violet', 30, 1, datetime('now')),

  -- 4. School & Board Notes (CHSE / BSE)
  ('stl_l2_bse_class10', 2, 'stl_l1_school_board', 'class-10-bse-odisha-matric',
   'Class 10 (BSE Odisha Matric)', 'ଦଶମ ଶ୍ରେଣୀ (BSE Odisha ମାଟ୍ରିକ୍)',
   'HSC Matric Science, Mathematics, English, Odia MIL & Social Science', 'ମାଟ୍ରିକ୍ ବିଜ୍ଞାନ, ଗଣିତ, ଇଂରାଜୀ, ସାହିତ୍ୟ ଓ ସାମାଜିକ ବିଜ୍ଞାନ', '📘', 'cobalt', 10, 1, datetime('now')),
  ('stl_l2_chse_sci_com', 2, 'stl_l1_school_board', 'class-12-science-commerce-chse',
   'Class 12 Science & Commerce (CHSE)', 'ଦ୍ୱାଦଶ ବିଜ୍ଞାନ ଓ ବାଣିଜ୍ୟ (CHSE)',
   '+2 CHSE Physics, Chemistry, Maths, Biology, Accountancy & Business Studies', '+୨ ପଦାର୍ଥ ବିଜ୍ଞାନ, ରସାୟନ, ଗଣିତ, ଜୀବ ବିଜ୍ଞାନ ଓ ବାଣିଜ୍ୟ', '🧪', 'cobalt', 20, 1, datetime('now')),
  ('stl_l2_chse_arts_ncert', 2, 'stl_l1_school_board', 'class-12-arts-ncert-foundation',
   'Class 12 Arts & NCERT Foundation', 'ଦ୍ୱାଦଶ କଳା ଓ NCERT ଫାଉଣ୍ଡେସନ୍',
   '+2 Arts History, Political Science, Economics, Education & Class 6-12 NCERT', '+୨ ଇତିହାସ, ରାଜନୀତି, ଅର୍ଥନୀତି ଓ NCERT ସାରାଂଶ', '📖', 'cobalt', 30, 1, datetime('now')),

  -- 5. Skill, Coding & Digital Literacy
  ('stl_l2_comp_office', 2, 'stl_l1_skill_coding', 'computer-fundamentals-ms-office',
   'Computer Fundamentals & MS Office', 'କମ୍ପ୍ୟୁଟର ମୌଳିକ ଜ୍ଞାନ ଓ MS Office',
   'Hardware, OS, MS Word, Excel, PowerPoint, Shortcuts & Cyber Safety', 'MS Word, Excel, PowerPoint, ସର୍ଟକଟ୍ ଓ ସାଇବର ସୁରକ୍ଷା', '🖥️', 'teal', 10, 1, datetime('now')),
  ('stl_l2_web_python_ai', 2, 'stl_l1_skill_coding', 'web-dev-python-ai-basics',
   'Web Development, Python & AI Basics', 'ୱେବ୍ ଡେଭଲପମେଣ୍ଟ, Python ଓ AI',
   'HTML/CSS/JS, Python programming, SQL & practical AI productivity tools', 'HTML/CSS/JS, Python ପ୍ରୋଗ୍ରାମିଂ ଓ AI ମୌଳିକ ଜ୍ଞାନ', '💻', 'teal', 20, 1, datetime('now')),
  ('stl_l2_english_interview', 2, 'stl_l1_skill_coding', 'spoken-english-interview-prep',
   'Spoken English & Interview Prep', 'ସ୍ପୋକେନ୍ ଇଂରାଜୀ ଓ ଇଣ୍ଟରଭ୍ୟୁ ପ୍ରସ୍ତୁତି',
   'Grammar, workplace communication, resume writing & viva-voce preparation', 'ବ୍ୟାକରଣ, କର୍ମକ୍ଷେତ୍ର ଯୋଗାଯୋଗ, ରେଜ୍ୟୁମେ ଓ ଇଣ୍ଟରଭ୍ୟୁ', '🗣️', 'teal', 30, 1, datetime('now')),

  -- 6. Previous Papers & Mock Tests
  ('stl_l2_odisha_pyq', 2, 'stl_l1_pyq_mocks', 'odisha-govt-pyq-archive',
   'Odisha Govt PYQ Archive', 'ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା PYQ ସଂଗ୍ରହ',
   'Solved OPSC, OSSC, OSSSC, OTET, OSSTET & Odisha Police question papers', 'OPSC, OSSC, OSSSC, OTET ଓ ପୋଲିସ୍ ବିଗତ ପ୍ରଶ୍ନପତ୍ର', '📜', 'amber', 10, 1, datetime('now')),
  ('stl_l2_central_pyq', 2, 'stl_l1_pyq_mocks', 'central-govt-pyq-archive',
   'Central Govt PYQ Archive', 'କେନ୍ଦ୍ର ସରକାରୀ ପରୀକ୍ଷା PYQ ସଂଗ୍ରହ',
   'Solved UPSC, SSC, IBPS, SBI, CTET & RRB shift-wise question papers', 'UPSC, SSC, ବ୍ୟାଙ୍କିଂ, CTET ଓ ରେଳବାଇ ବିଗତ ପ୍ରଶ୍ନପତ୍ର', '🗂️', 'amber', 20, 1, datetime('now')),
  ('stl_l2_practice_syllabus', 2, 'stl_l1_pyq_mocks', 'topic-wise-practice-sets-syllabus',
   'Topic-Wise Practice Sets & Syllabus PDFs', 'ବିଷୟଭିତ୍ତିକ ଅଭ୍ୟାସ ସେଟ୍ ଓ ସିଲାବସ୍ PDF',
   'Timed MCQ drills, official exam syllabi, negative-marking mocks & checklists', 'ଅଭ୍ୟାସ MCQ ସେଟ୍, ସରକାରୀ ସିଲାବସ୍ ଓ ମକ୍ ଟେଷ୍ଟ', '✅', 'amber', 30, 1, datetime('now'))
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
