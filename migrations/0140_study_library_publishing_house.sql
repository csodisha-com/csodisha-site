-- v251: Study Library, Curriculum & EdTech Publishing House
-- Creates 3-layer academic taxonomy, rich bilingual study articles, revision snapshots,
-- candidate syllabus progress & streak tracking, and reader doubts / PYQ correction queue.

CREATE TABLE IF NOT EXISTS study_taxonomy_nodes (
  id TEXT PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id TEXT,
  slug TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  accent_variant TEXT NOT NULL DEFAULT 'indigo',
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_tax_level_parent ON study_taxonomy_nodes(level, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_study_tax_slug ON study_taxonomy_nodes(slug);

CREATE TABLE IF NOT EXISTS study_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_l1_id TEXT NOT NULL DEFAULT '',
  category_l2_id TEXT NOT NULL DEFAULT '',
  category_l3_id TEXT NOT NULL DEFAULT '',
  resource_type_badge TEXT NOT NULL DEFAULT 'Study Notes',
  difficulty_level TEXT NOT NULL DEFAULT 'Moderate',
  high_yield_priority TEXT NOT NULL DEFAULT 'High',
  estimated_read_mins INTEGER NOT NULL DEFAULT 10,
  negative_marking_rule TEXT NOT NULL DEFAULT 'None',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  exam_board_tag TEXT NOT NULL DEFAULT '',
  paper_code TEXT NOT NULL DEFAULT '',
  pyq_year TEXT NOT NULL DEFAULT '',
  language_medium TEXT NOT NULL DEFAULT 'Bilingual (EN + OR)',
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_caption TEXT NOT NULL DEFAULT '',
  article_body_en TEXT NOT NULL DEFAULT '',
  article_body_or TEXT NOT NULL DEFAULT '',
  syllabus_topics_json TEXT NOT NULL DEFAULT '[]',
  key_facts_table_json TEXT NOT NULL DEFAULT '[]',
  pyq_analysis_json TEXT NOT NULL DEFAULT '[]',
  practice_mcqs_json TEXT NOT NULL DEFAULT '[]',
  reference_links_json TEXT NOT NULL DEFAULT '[]',
  linked_job_ids_json TEXT NOT NULL DEFAULT '[]',
  notes_pdf_url TEXT NOT NULL DEFAULT '',
  pyq_pdf_url TEXT NOT NULL DEFAULT '',
  answer_key_pdf_url TEXT NOT NULL DEFAULT '',
  pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
  extra_attachments_json TEXT NOT NULL DEFAULT '[]',
  edition_note_en TEXT NOT NULL DEFAULT '',
  edition_note_or TEXT NOT NULL DEFAULT '',
  scheduled_publish_at TEXT NOT NULL DEFAULT '',
  preview_token TEXT NOT NULL DEFAULT '',
  preview_expires_at TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_free_access INTEGER NOT NULL DEFAULT 1,
  is_published INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  pdf_downloads_count INTEGER NOT NULL DEFAULT 0,
  completions_count INTEGER NOT NULL DEFAULT 0,
  bookmarks_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_art_pub_cats ON study_articles(is_published, category_l1_id, category_l2_id, category_l3_id);
CREATE INDEX IF NOT EXISTS idx_study_art_pub_type ON study_articles(is_published, resource_type_badge, high_yield_priority);
CREATE INDEX IF NOT EXISTS idx_study_art_sched ON study_articles(is_published, scheduled_publish_at);
CREATE INDEX IF NOT EXISTS idx_study_art_updated ON study_articles(updated_at DESC);

CREATE TABLE IF NOT EXISTS study_article_revisions (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_rev_article ON study_article_revisions(article_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS candidate_study_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  needs_revision INTEGER NOT NULL DEFAULT 0,
  mcq_score REAL NOT NULL DEFAULT 0,
  mcq_total INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 1,
  last_studied_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_cand_study_prog_user ON candidate_study_progress(user_id, last_studied_at DESC);
CREATE INDEX IF NOT EXISTS idx_cand_study_prog_art ON candidate_study_progress(article_id, status);

CREATE TABLE IF NOT EXISTS study_reader_doubts (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  reader_name TEXT NOT NULL DEFAULT 'Anonymous Learner',
  doubt_type TEXT NOT NULL DEFAULT 'chapter_doubt',
  message_text TEXT NOT NULL,
  admin_reply TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_study_doubts_status ON study_reader_doubts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_doubts_article ON study_reader_doubts(article_id, status);

-- Ensure shared editorial_snippets table exists even on clean standalone DBs
CREATE TABLE IF NOT EXISTS editorial_snippets (
  id TEXT PRIMARY KEY,
  snippet_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_or TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- SEED STARTER 3-LAYER ACADEMIC & COMPETITIVE EXAM TAXONOMY (IDEMPOTENT)
-- ============================================================================

-- Level 1: Exam Track / Academic Stream
INSERT OR IGNORE INTO study_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('stax_l1_opsc_oas', 1, NULL, 'opsc-oas', 'Odisha Civil Services (OPSC OAS)', 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OPSC OAS)', 'Prelims, Mains GS, Optional & Personality Test curriculum', 'ପ୍ରିଲିମ୍ସ, ମେନ୍ସ ଜିଏସ୍ ଏବଂ ଇଣ୍ଟରଭ୍ୟୁ ପାଠ୍ୟକ୍ରମ', '🏛️', 'emerald', 10, 1),
  ('stax_l1_ossc_osssc', 1, NULL, 'ossc-osssc-combined', 'OSSC & OSSSC Combined Exams (CGL / RI / ARI / PEO)', 'OSSC ଓ OSSSC ମିଳିତ ପରୀକ୍ଷା (CGL / RI / PEO)', 'State Group-B & Group-C combined recruitment preparation', 'ରାଜ୍ୟ ଗ୍ରୁପ୍-ବି ଓ ଗ୍ରୁପ୍-ସି ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି', '📋', 'cobalt', 20, 1),
  ('stax_l1_teaching_tet', 1, NULL, 'teaching-tet', 'Teaching & TET (OTET / OSSTET / OAVS / B.Ed)', 'ଶିକ୍ଷକ ନିଯୁକ୍ତି ଓ TET (OTET / OSSTET / OAVS)', 'Pedagogy, school subject papers & teacher eligibility kits', 'ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ ଓ ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା', '🎓', 'violet', 30, 1),
  ('stax_l1_odisha_gk', 1, NULL, 'odisha-gk-culture', 'Odisha GK, History & Culture', 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ, ଇତିହାସ ଓ ସଂସ୍କୃତି', '30 districts, dynasties, rivers, tribes, arts & state polity', '୩୦ ଜିଲ୍ଲା, ଇତିହାସ, ନଦୀ, ସଂସ୍କୃତି ଓ ଶାସନ ବ୍ୟବସ୍ଥା', '🗺️', 'amber', 40, 1),
  ('stax_l1_odia_lang', 1, NULL, 'odia-language-grammar', 'Odia Language & Grammar', 'ଓଡ଼ିଆ ଭାଷା ଓ ବ୍ୟାକରଣ', 'Sandhi, Samasa, Krudanta, Taddhita, Pratisabda & Precis', 'ସନ୍ଧି, ସମାସ, କୃଦନ୍ତ, ତଦ୍ଧିତ, ପ୍ରତିଶବ୍ଦ ଓ ଅନୁବାଦ', '✍️', 'rose', 50, 1),
  ('stax_l1_ugc_net', 1, NULL, 'ugc-net-higher-ed', 'UGC NET & Higher Education', 'UGC NET ଓ ଉଚ୍ଚ ଶିକ୍ଷା', 'Paper-I Teaching/Research Aptitude, SSB Lecturer & Ph.D.', 'ପେପର୍-୧ ଗବେଷଣା ଯୋଗ୍ୟତା ଓ ଅଧ୍ୟାପକ ପରୀକ୍ଷା', '🔬', 'teal', 60, 1),
  ('stax_l1_central_exams', 1, NULL, 'central-exams', 'Central Exams (UPSC / SSC / Banking / RRB)', 'କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା (UPSC / SSC / ବ୍ୟାଙ୍କିଂ / RRB)', 'UPSC CSE, SSC CGL/CHSL, IBPS/SBI PO & Railway NTPC/ALP', 'ୟୁପିଏସସି, ଏସଏସସି, ବ୍ୟାଙ୍କିଂ ଓ ରେଳବାଇ ପରୀକ୍ଷା', '🇮🇳', 'indigo', 70, 1),
  ('stax_l1_school_board', 1, NULL, 'school-board-foundation', 'School & Board Foundation (BSE Odisha / CHSE)', 'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ଫାଉଣ୍ଡେସନ୍ (BSE / CHSE)', 'Class 8-12 SCERT/NCERT notes, model papers & board guides', 'ଅଷ୍ଟମରୁ ଦ୍ୱାଦଶ ଶ୍ରେଣୀ ନୋଟ୍ସ ଓ ମଡେଲ୍ ପେପର୍', '📘', 'emerald', 80, 1);

-- Level 2: Subject / Paper (under Level 1)
INSERT OR IGNORE INTO study_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('stax_l2_opsc_gs1', 2, 'stax_l1_opsc_oas', 'general-studies-paper-1', 'General Studies Paper-I', 'ସାଧାରଣ ଅଧ୍ୟୟନ ପେପର୍-୧', 'History, Polity, Geography, Economy & Environment', 'ଇତିହାସ, ରାଜନୀତି, ଭୂଗୋଳ ଓ ଅର୍ଥନୀତି', '📚', 'emerald', 10, 1),
  ('stax_l2_opsc_ca', 2, 'stax_l1_opsc_oas', 'current-affairs-digest', 'Current Affairs Digest', 'ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ସଂକଳନ', 'Monthly Odisha & National current affairs capsules', 'ମାସିକ ଓଡ଼ିଶା ଓ ଜାତୀୟ ସାମ୍ପ୍ରତିକ ତଥ୍ୟ', '🗞️', 'amber', 20, 1),
  ('stax_l2_ossc_quant', 2, 'stax_l1_ossc_osssc', 'quantitative-aptitude-reasoning', 'Quantitative Aptitude & Reasoning', 'ଗଣିତ ଓ ଯୁକ୍ତିଶକ୍ତି', 'Arithmetic, DI, logical reasoning & shortcut formulas', 'ଅଙ୍କଗଣିତ, ତଥ୍ୟ ବିଶ୍ଳେଷଣ ଓ ଯୁକ୍ତିଶକ୍ତି', '🧮', 'cobalt', 10, 1),
  ('stax_l2_ossc_comp', 2, 'stax_l1_ossc_osssc', 'computer-digital-literacy', 'Computer & Digital Literacy', 'କମ୍ପ୍ୟୁଟର ଓ ଡିଜିଟାଲ୍ ଜ୍ଞାନ', 'MS Office, Networking, Cybersecurity & Shortcut Keys', 'ଏମ୍ଏସ୍ ଅଫିସ୍, ନେଟୱର୍କିଂ ଓ ସାଇବର ସୁରକ୍ଷା', '💻', 'indigo', 20, 1),
  ('stax_l2_tet_cdp', 2, 'stax_l1_teaching_tet', 'child-development-pedagogy', 'Child Development & Pedagogy', 'ଶିଶୁ ବିକାଶ ଓ ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ', 'Piaget, Vygotsky, NCF, NEP 2020 & Inclusive Classroom', 'ଶିଶୁ ମନୋବିଜ୍ଞାନ, NEP 2020 ଓ ଶ୍ରେଣୀଗୃହ ଶିକ୍ଷାଦାନ', '🧠', 'violet', 10, 1),
  ('stax_l2_ogk_hist_geo', 2, 'stax_l1_odisha_gk', 'odisha-history-geography', 'Odisha History & Geography', 'ଓଡ଼ିଶା ଇତିହାସ ଓ ଭୂଗୋଳ', 'Kalinga, Ganga/Gajapati era, freedom movement, rivers & minerals', 'କଳିଙ୍ଗ, ଗଙ୍ଗ-ଗଜପତି ଯୁଗ, ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ ଓ ଭୂଗୋଳ', '🏛️', 'amber', 10, 1),
  ('stax_l2_odia_gram', 2, 'stax_l1_odia_lang', 'odia-grammar-comprehension', 'Odia Grammar & Comprehension', 'ଓଡ଼ିଆ ବ୍ୟାକରଣ ଓ ବୋଧଜ୍ଞାନ', 'Complete Odia Vyakarana rules, idioms & essay drills', 'ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ ବ୍ୟାକରଣ ନିୟମ ଓ ରଚନା ଅଭ୍ୟାସ', '📖', 'rose', 10, 1),
  ('stax_l2_ugc_p1', 2, 'stax_l1_ugc_net', 'ugc-net-paper-1', 'Teaching & Research Aptitude (Paper-I)', 'ଶିକ୍ଷାଦାନ ଓ ଗବେଷଣା ଯୋଗ୍ୟତା (ପେପର୍-୧)', 'All 10 NTA UGC NET Paper-I units with solved PYQs', 'NTA UGC NET ପେପର୍-୧ ର ସମସ୍ତ ୧୦ ଟି ୟୁନିଟ୍', '🔎', 'teal', 10, 1),
  ('stax_l2_central_gs', 2, 'stax_l1_central_exams', 'central-gk-polity-econ', 'Indian Polity, Economy & General Science', 'ଭାରତୀୟ ସମ୍ବିଧାନ, ଅର୍ଥନୀତି ଓ ବିଜ୍ଞାନ', 'NCERT-aligned polity, budget & general science digests', 'ଏନସିଇଆରଟି ଆଧାରିତ ସମ୍ବିଧାନ, ଅର୍ଥନୀତି ଓ ବିଜ୍ଞାନ', '⚖️', 'indigo', 10, 1),
  ('stax_l2_school_scert', 2, 'stax_l1_school_board', 'bse-chse-core-subjects', 'BSE Class 10 & CHSE +2 Core Subjects', 'ଦଶମ ଓ +୨ ମୁଖ୍ୟ ବିଷୟସମୂହ', 'Mathematics, Science, Social Studies & Odia MIL guides', 'ଗଣିତ, ବିଜ୍ଞାନ, ସାମାଜିକ ବିଜ୍ଞାନ ଓ ସାହିତ୍ୟ', '🎒', 'emerald', 10, 1);

-- Level 3: Chapter / Module / Resource Format (under Level 2)
INSERT OR IGNORE INTO study_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('stax_l3_opsc_syl', 3, 'stax_l2_opsc_gs1', 'official-syllabus-pattern', 'Official Syllabus & Exam Pattern', 'ସରକାରୀ ସିଲାବସ୍ ଓ ପରୀକ୍ଷା ପଦ୍ଧତି', 'Unit-wise marks weightage and latest OPSC blueprint', 'ୟୁନିଟ୍ ଅନୁଯାୟୀ ମାର୍କ ବିଭାଜନ', '📑', 'emerald', 10, 1),
  ('stax_l3_opsc_notes', 3, 'stax_l2_opsc_gs1', 'chapter-study-notes', 'Chapter Study Notes & Mind Maps', 'ଅଧ୍ୟାୟ ନୋଟ୍ସ ଓ ମାଇଣ୍ଡ ମ୍ୟାପ୍', 'Structured exam-ready notes with high-yield tables', 'ପରୀକ୍ଷା ଉପଯୋଗୀ ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ', '📝', 'cobalt', 20, 1),
  ('stax_l3_opsc_pyq', 3, 'stax_l2_opsc_gs1', 'previous-year-papers', 'Previous Year Question Papers (PYQs)', 'ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର (PYQs)', 'Solved year-wise papers with trend analysis', 'ସମାଧାନ ସହିତ ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର', '📜', 'amber', 30, 1),
  ('stax_l3_opsc_mcq', 3, 'stax_l2_opsc_gs1', 'topic-practice-mcqs', 'Topic-Wise Practice MCQ Sets', 'ବିଷୟଭିତ୍ତିକ ଅଭ୍ୟାସ MCQ ସେଟ୍', 'Timed & tutor-mode objective test banks', 'ଅଭ୍ୟାସ ପ୍ରଶ୍ନୋତ୍ତର ସେଟ୍', '✅', 'violet', 40, 1),
  ('stax_l3_opsc_rev', 3, 'stax_l2_opsc_gs1', 'quick-revision-sheets', 'Quick Revision & Formula Sheets', 'ଦ୍ରୁତ ପୁନରାବୃତ୍ତି ଓ ସୂତ୍ର ପତ୍ର', 'One-page A4 printable revision sheets & flashcards', 'ଏକ-ପୃଷ୍ଠା ପ୍ରିଣ୍ଟେବଲ୍ ରିଭିଜନ୍ ସିଟ୍', '⚡', 'rose', 50, 1),
  ('stax_l3_opsc_ncert', 3, 'stax_l2_opsc_gs1', 'ncert-scert-digests', 'NCERT / SCERT Reference Digests', 'NCERT / SCERT ସାରାଂଶ', 'Class 6-12 foundation summaries for Odisha aspirants', 'ଷଷ୍ଠରୁ ଦ୍ୱାଦଶ ଶ୍ରେଣୀ ସାରାଂଶ', '📕', 'teal', 60, 1),
  ('stax_l3_ossc_quant_notes', 3, 'stax_l2_ossc_quant', 'chapter-study-notes', 'Chapter Study Notes & Formula Sheets', 'ଅଧ୍ୟାୟ ନୋଟ୍ସ ଓ ଗଣିତ ସୂତ୍ର', 'Percentage, Ratio, Time-Work, SI/CI & Mensuration tricks', 'ଶତକଡ଼ା, ଅନୁପାତ ଓ କ୍ଷେତ୍ରମିତି ସୂତ୍ର', '📐', 'cobalt', 10, 1),
  ('stax_l3_ossc_quant_pyq', 3, 'stax_l2_ossc_quant', 'previous-year-papers', 'Previous Year Question Papers (PYQs)', 'ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର (PYQs)', 'OSSC CGL, OSSSC RI/ARI/Amin/PEO solved quant sets', 'OSSC CGL ଓ OSSSC RI/PEO ପ୍ରଶ୍ନପତ୍ର', '📜', 'amber', 20, 1),
  ('stax_l3_ossc_comp_notes', 3, 'stax_l2_ossc_comp', 'chapter-study-notes', 'Computer Practical & Theory Notes', 'କମ୍ପ୍ୟୁଟର ତତ୍ତ୍ୱ ଓ ବ୍ୟବହାରିକ ନୋଟ୍ସ', 'Word, Excel, PowerPoint, Windows & Internet MCQs', 'ଏମ୍ଏସ୍ ୱାର୍ଡ, ଏକ୍ସେଲ୍ ଓ ଇଣ୍ଟରନେଟ୍ ନୋଟ୍ସ', '🖥️', 'indigo', 10, 1),
  ('stax_l3_tet_cdp_notes', 3, 'stax_l2_tet_cdp', 'chapter-study-notes', 'Chapter Study Notes & Mind Maps', 'ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ ନୋଟ୍ସ', 'OTET / OSSTET Paper-I & Paper-II high-yield pedagogy', 'OTET ଓ OSSTET ପେଡାଗୋଜି ନୋଟ୍ସ', '🧠', 'violet', 10, 1),
  ('stax_l3_ogk_notes', 3, 'stax_l2_ogk_hist_geo', 'chapter-study-notes', 'Chapter Study Notes & District Profiles', 'ଓଡ଼ିଶା ଇତିହାସ ଓ ଜିଲ୍ଲା ତଥ୍ୟ', 'Dynasties, Paika Rebellion, rivers, sanctuaries & census', 'ରାଜବଂଶ, ପାଇକ ବିଦ୍ରୋହ, ନଦୀ ଓ ଅଭୟାରଣ୍ୟ', '🗺️', 'amber', 10, 1),
  ('stax_l3_ogk_rev', 3, 'stax_l2_ogk_hist_geo', 'quick-revision-sheets', 'Quick Revision & One-Liners', 'ଦ୍ରୁତ ପୁନରାବୃତ୍ତି ଓ ଏକ-ଧାଡ଼ିଆ ତଥ୍ୟ', '500+ high-frequency Odisha GK facts for last-week revision', '୫୦୦+ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ', '⚡', 'emerald', 20, 1),
  ('stax_l3_odia_notes', 3, 'stax_l2_odia_gram', 'chapter-study-notes', 'Grammar Rules & Practice Sheets', 'ବ୍ୟାକରଣ ନିୟମ ଓ ଅଭ୍ୟାସ ପତ୍ର', 'High-scoring Odia grammar chapters with solved examples', 'ଉଦାହରଣ ସହିତ ଓଡ଼ିଆ ବ୍ୟାକରଣ ଅଧ୍ୟାୟ', '✍️', 'rose', 10, 1),
  ('stax_l3_ugc_pyq', 3, 'stax_l2_ugc_p1', 'previous-year-papers', 'Previous Year Question Papers (PYQs)', 'ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର (PYQs)', 'Shift-wise solved NTA UGC NET Paper-I papers', 'ସମାଧାନ ସହିତ UGC NET ପ୍ରଶ୍ନପତ୍ର', '📜', 'teal', 10, 1),
  ('stax_l3_central_notes', 3, 'stax_l2_central_gs', 'ncert-scert-digests', 'NCERT / Standard Book Digests', 'NCERT ସାରାଂଶ', 'Concise Laxmikanth, Spectrum & NCERT chapter capsules', 'ସଂକ୍ଷିପ୍ତ NCERT ଓ ମାନକ ପୁସ୍ତକ ନୋଟ୍ସ', '📕', 'indigo', 10, 1),
  ('stax_l3_school_rev', 3, 'stax_l2_school_scert', 'quick-revision-sheets', 'Board Model Papers & Revision Sheets', 'ବୋର୍ଡ ମଡେଲ୍ ପେପର୍ ଓ ରିଭିଜନ୍ ସିଟ୍', 'BSE Odisha Class 10 & CHSE +2 chapter-wise capsules', 'ଦଶମ ଓ +୨ ବୋର୍ଡ ପରୀକ୍ଷା ରିଭିଜନ୍', '📘', 'emerald', 10, 1);

-- ============================================================================
-- SEED STUDY-SPECIFIC REUSABLE BILINGUAL SNIPPETS INTO editorial_snippets
-- ============================================================================
INSERT OR IGNORE INTO editorial_snippets (id, snippet_key, category, title_en, title_or, body_en, body_or, sort_order, is_published) VALUES
  ('snip_study_odisha_gk_box', 'odisha-gk-quick-fact-box', 'study',
   'Odisha GK Quick Fact Box Template',
   'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଦ୍ରୁତ ତଥ୍ୟ ବାକ୍ସ',
   '## Quick Fact Box — Odisha High-Yield Snapshot\n- **State Formation (Utkala Dibasa):** 1 April 1936 (First linguistic state in India)\n- **Districts / Sub-Divisions / Blocks:** 30 Districts · 58 Sub-Divisions · 314 Blocks\n- **State Symbols:** Animal — Sambar Deer · Bird — Indian Roller (Bhada-Bhadalia) · Tree — Ashwattha · Flower — Ashoka\n- **Highest Peak:** Deomali (1,672 m, Koraput) · **Largest Lagoon:** Chilika Lake (Asia''s largest brackish water lagoon)',
   '## ଦ୍ରୁତ ତଥ୍ୟ ବାକ୍ସ — ଓଡ଼ିଶା ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା\n- **ରାଜ୍ୟ ଗଠନ (ଉତ୍କଳ ଦିବସ):** ୧ ଅପ୍ରେଲ ୧୯୩୬ (ଭାରତର ପ୍ରଥମ ଭାଷାଭିତ୍ତିକ ରାଜ୍ୟ)\n- **ଜିଲ୍ଲା / ସବ୍-ଡିଭିଜନ୍ / ବ୍ଲକ୍:** ୩୦ ଜିଲ୍ଲା · ୫୮ ସବ୍-ଡିଭିଜନ୍ · ୩୧୪ ବ୍ଲକ୍\n- **ରାଜ୍ୟ ପ୍ରତୀକ:** ପଶୁ — ସମ୍ବର · ପକ୍ଷୀ — ଭଦଭଦଳିଆ · ବୃକ୍ଷ — ଅଶ୍ୱତ୍ଥ · ଫୁଲ — ଅଶୋକ\n- **ସର୍ବୋଚ୍ଚ ଶୃଙ୍ଗ:** ଦେଓମାଳି (୧,୬୭୨ ମି., କୋରାପୁଟ) · **ବୃହତ୍ତମ ହ୍ରଦ:** ଚିଲିକା ହ୍ରଦ',
   50, 1),
  ('snip_study_neg_marking', 'opsc-ossc-negative-marking-rules', 'study',
   'OPSC / OSSC Negative Marking & Exam Hall Rules',
   'OPSC / OSSC ନେଗେଟିଭ୍ ମାର୍କିଂ ଓ ପରୀକ୍ଷା ନିୟମାବଳୀ',
   '## Exam Marking & Accuracy Strategy\n- **OPSC OAS Prelims:** +2 marks per correct answer; **-0.33 (1/3rd)** penalty for each wrong MCQ. Avoid blind guessing.\n- **OSSC CGL / OSSSC Combined (RI/ARI/PEO):** Usually **-0.25 (1/4th)** negative marking per wrong response; check your shift instruction sheet.\n- **OTET / OSSTET:** Generally **No Negative Marking** — attempt all 150 questions systematically.\n- **OMR / CBT Tip:** Mark confident questions in Round-1, eliminate 2 options in Round-2, and review flagged items in the final 10 minutes.',
   '## ନେଗେଟିଭ୍ ମାର୍କିଂ ଓ ପରୀକ୍ଷା ରଣନୀତି\n- **OPSC OAS ପ୍ରିଲିମ୍ସ:** ପ୍ରତ୍ୟେକ ସଠିକ୍ ଉତ୍ତର ପାଇଁ +୨ ମାର୍କ; ଭୁଲ୍ ଉତ୍ତର ପାଇଁ **-୦.୩୩ (୧/୩)** ମାର୍କ କଟିବ।\n- **OSSC CGL / OSSSC (RI/ARI/PEO):** ସାଧାରଣତଃ ପ୍ରତ୍ୟେକ ଭୁଲ୍ ଉତ୍ତର ପାଇଁ **-୦.୨୫ (୧/୪)** ନେଗେଟିଭ୍ ମାର୍କିଂ ରହିଥାଏ।\n- **OTET / OSSTET:** ସାଧାରଣତଃ କୌଣସି ନେଗେଟିଭ୍ ମାର୍କିଂ ନାହିଁ — ସମସ୍ତ ୧୫୦ ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ।',
   60, 1),
  ('snip_study_odia_sandhi', 'odia-grammar-sandhi-samasa-block', 'study',
   'Odia Grammar Sandhi & Samasa Summary Block',
   'ଓଡ଼ିଆ ବ୍ୟାକରଣ: ସନ୍ଧି ଓ ସମାସ ସଂକ୍ଷିପ୍ତ ନିୟମ',
   '## Odia Grammar Quick Revision — Sandhi & Samasa\n- **Swara Sandhi (ସ୍ୱର ସନ୍ଧି):** Vowel + Vowel fusion (e.g., ବିଦ୍ୟା + ଆଳୟ = ବିଦ୍ୟାଳୟ; ମହା + ଇନ୍ଦ୍ର = ମହେନ୍ଦ୍ର).\n- **Byanjana Sandhi (ବ୍ୟଞ୍ଜନ ସନ୍ଧି):** Consonant + Vowel/Consonant change (e.g., ଜଗତ୍ + ନାଥ = ଜଗନ୍ନାଥ; ଉତ୍ + ଚାରଣ = ଉଚ୍ଚାରଣ).\n- **Bisarga Sandhi (ବିସର୍ଗ ସନ୍ଧି):** Visarga transformation (e.g., ମନଃ + ରଥ = ମନୋରଥ; ନିଃ + ଧନ = ନିର୍ଦ୍ଧନ).\n- **Core Samasa Types:** Tatpurusha, Karmadharaya, Dwigu (numeral first), Dwandwa, Bahubrihi (third meaning), Abyayibhaba.',
   '## ଓଡ଼ିଆ ବ୍ୟାକରଣ ଦ୍ରୁତ ପୁନରାବୃତ୍ତି — ସନ୍ଧି ଓ ସମାସ\n- **ସ୍ୱର ସନ୍ଧି:** ସ୍ୱରବର୍ଣ୍ଣ ସହ ସ୍ୱରବର୍ଣ୍ଣର ମିଳନ (ଯଥା: ବିଦ୍ୟା + ଆଳୟ = ବିଦ୍ୟାଳୟ; ମହା + ଇନ୍ଦ୍ର = ମହେନ୍ଦ୍ର)।\n- **ବ୍ୟଞ୍ଜନ ସନ୍ଧି:** ବ୍ୟଞ୍ଜନ ସହ ସ୍ୱର ବା ବ୍ୟଞ୍ଜନର ମିଳନ (ଯଥା: ଜଗତ୍ + ନାଥ = ଜଗନ୍ନାଥ; ଉତ୍ + ଚାରଣ = ଉଚ୍ଚାରଣ)।\n- **ବିସର୍ଗ ସନ୍ଧି:** ବିସର୍ଗ ସହ ସ୍ୱର ବା ବ୍ୟଞ୍ଜନର ମିଳନ (ଯଥା: ମନଃ + ରଥ = ମନୋରଥ; ନିଃ + ଧନ = ନିର୍ଦ୍ଧନ)।\n- **ପ୍ରମୁଖ ସମାସ:** ତତ୍ପୁରୁଷ, କର୍ମଧାରୟ, ଦ୍ୱିଗୁ, ଦ୍ୱନ୍ଦ୍ୱ, ବହୁବ୍ରୀହି ଓ ଅବ୍ୟୟୀଭାବ।',
   70, 1),
  ('snip_study_pyq_callout', 'pyq-trend-high-yield-callout', 'study',
   'PYQ Trend & High-Yield Chapter Callout',
   'PYQ ଧାରା ଓ ଅତ୍ୟନ୍ତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଅଧ୍ୟାୟ ସୂଚନା',
   '> **High-Yield Exam Alert:** Over the last 5 OPSC / OSSC / OSSSC exam cycles, this chapter has consistently contributed **3–6 direct objective questions**.\n- Prioritize the **Key Facts / Formula Table** and test yourself with **Flip-Card Revision Mode** before attempting the Timed Mini-Mock below.\n- Flag this chapter for **Revise Again** if your practice quiz accuracy is below **75%**.',
   '> **ପରୀକ୍ଷା ପାଇଁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା:** ବିଗତ ୫ଟି OPSC / OSSC / OSSSC ପରୀକ୍ଷାରେ ଏହି ଅଧ୍ୟାୟରୁ ନିୟମିତ ଭାବେ **୩ ରୁ ୬ ଟି ପ୍ରଶ୍ନ** ଆସିଅଛି।\n- ତଳେ ଥିବା **ମୁଖ୍ୟ ତଥ୍ୟ ତାଲିକା** ଓ **ଫ୍ଲିପ୍-କାର୍ଡ ରିଭିଜନ୍ ମୋଡ୍** ଅଭ୍ୟାସ କରି ଟାଇମ୍ଡ୍ ମିନି-ମକ୍ ଦିଅନ୍ତୁ।\n- ଅଭ୍ୟାସ ପରୀକ୍ଷାରେ **୭୫%** ରୁ କମ୍ ସ୍କୋର ଆସିଲେ ଏହି ଅଧ୍ୟାୟକୁ **ପୁନରାବୃତ୍ତି** ପାଇଁ ଚିହ୍ନିତ କରନ୍ତୁ।',
   80, 1);
