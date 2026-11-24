-- v253: About & Institutional Transparency Publishing House
-- Creates 3-layer institutional taxonomy, rich institutional pages & mentor profiles,
-- Verified Official Government Portals Registry (.gov.in anti-fraud directory),
-- revision snapshots, and public contact / partnership / grievance inquiries.

CREATE TABLE IF NOT EXISTS about_taxonomy_nodes (
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
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_about_tax_level_parent ON about_taxonomy_nodes(level, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_about_tax_slug ON about_taxonomy_nodes(slug);

CREATE TABLE IF NOT EXISTS about_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_l1_id TEXT NOT NULL DEFAULT '',
  category_l2_id TEXT NOT NULL DEFAULT '',
  category_l3_id TEXT NOT NULL DEFAULT '',
  doc_type_badge TEXT NOT NULL DEFAULT 'Institutional Charter',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  person_role_en TEXT NOT NULL DEFAULT '',
  person_role_or TEXT NOT NULL DEFAULT '',
  person_credentials TEXT NOT NULL DEFAULT '',
  person_district TEXT NOT NULL DEFAULT '',
  effective_date TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_caption TEXT NOT NULL DEFAULT '',
  article_body_en TEXT NOT NULL DEFAULT '',
  article_body_or TEXT NOT NULL DEFAULT '',
  highlights_table_json TEXT NOT NULL DEFAULT '[]',
  verification_steps_json TEXT NOT NULL DEFAULT '[]',
  impact_metrics_json TEXT NOT NULL DEFAULT '[]',
  faq_items_json TEXT NOT NULL DEFAULT '[]',
  reference_links_json TEXT NOT NULL DEFAULT '[]',
  charter_pdf_url TEXT NOT NULL DEFAULT '',
  press_kit_pdf_url TEXT NOT NULL DEFAULT '',
  pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
  extra_attachments_json TEXT NOT NULL DEFAULT '[]',
  revision_note_en TEXT NOT NULL DEFAULT '',
  revision_note_or TEXT NOT NULL DEFAULT '',
  scheduled_publish_at TEXT NOT NULL DEFAULT '',
  preview_token TEXT NOT NULL DEFAULT '',
  preview_expires_at TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  pdf_downloads_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_about_art_pub_cats ON about_articles(is_published, category_l1_id, category_l2_id, category_l3_id);
CREATE INDEX IF NOT EXISTS idx_about_art_sched ON about_articles(is_published, scheduled_publish_at);

CREATE TABLE IF NOT EXISTS about_official_sources (
  id TEXT PRIMARY KEY,
  sector TEXT NOT NULL DEFAULT 'Odisha State',
  authority_name_en TEXT NOT NULL,
  authority_name_or TEXT NOT NULL DEFAULT '',
  official_url TEXT NOT NULL,
  domain_badge TEXT NOT NULL DEFAULT '.gov.in',
  purpose_en TEXT NOT NULL DEFAULT '',
  purpose_or TEXT NOT NULL DEFAULT '',
  helpline_info TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_verified INTEGER NOT NULL DEFAULT 1,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_about_sources_sector ON about_official_sources(is_published, sector, sort_order);

CREATE TABLE IF NOT EXISTS about_article_revisions (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_about_rev_article ON about_article_revisions(article_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS about_public_inquiries (
  id TEXT PRIMARY KEY,
  inquiry_type TEXT NOT NULL DEFAULT 'general_inquiry',
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL DEFAULT '',
  sender_phone TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  subject_text TEXT NOT NULL,
  message_text TEXT NOT NULL,
  admin_reply TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_about_inq_status ON about_public_inquiries(status, created_at DESC);

-- ============================================================================
-- SEED STARTER 3-LAYER INSTITUTIONAL TAXONOMY (IDEMPOTENT)
-- ============================================================================
-- Level 1: Institutional Pillar
INSERT OR IGNORE INTO about_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('atax_l1_mission', 1, NULL, 'mission-vision-charter', 'Mission, Vision & Odisha Charter', 'ଲକ୍ଷ୍ୟ, ଦୃଷ୍ଟିଭଙ୍ଗୀ ଓ ଓଡ଼ିଶା ଚାର୍ଟର', 'Independent, open-access public knowledge mission for Odisha', 'ଓଡ଼ିଶା ପାଇଁ ସ୍ୱାଧୀନ ଓ ମୁକ୍ତ ଜ୍ଞାନ ପ୍ଲାଟଫର୍ମ', '🏛️', 'emerald', 10, 1),
  ('atax_l1_editorial', 1, NULL, 'editorial-standards-fact-checking', 'Editorial Standards & Fact-Checking Policy', 'ସମ୍ପାଦକୀୟ ମାନଦଣ୍ଡ ଓ ତଥ୍ୟ ଯାଞ୍ଚ ନୀତି', '3-step .gov.in source verification & correction protocol', '୩-ସ୍ତରୀୟ ସରକାରୀ ସୂତ୍ର ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା', '✅', 'cobalt', 20, 1),
  ('atax_l1_leadership', 1, NULL, 'leadership-authors-mentors', 'Leadership, Authors & Subject Mentors', 'ନେତୃତ୍ୱ, ଲେଖକ ଓ ବିଷୟ ମେଣ୍ଟର', 'Odisha educators, editors & verified domain reviewers', 'ଓଡ଼ିଶାର ଶିକ୍ଷକ, ସମ୍ପାଦକ ଓ ବିଶେଷଜ୍ଞ ଦଳ', '👩‍🏫', 'violet', 30, 1),
  ('atax_l1_sources', 1, NULL, 'official-sources-anti-fraud', 'Official Data Sources & Anti-Fraud Registry', 'ସରକାରୀ ପୋର୍ଟାଲ୍ ଓ ଠକେଇ ପ୍ରତିରୋଧ ତାଲିକା', 'Verified .gov.in / .nic.in links protecting Odisha citizens', 'ପ୍ରାମାଣିକ .gov.in ଓ .nic.in ପୋର୍ଟାଲ୍ ତାଲିକା', '🛡️', 'amber', 40, 1),
  ('atax_l1_legal', 1, NULL, 'legal-privacy-disclosures', 'Legal, Privacy & Public Disclosures', 'ଆଇନ, ଗୋପନୀୟତା ଓ ସାର୍ବଜନୀନ ଘୋଷଣା', 'Non-government disclaimer, DPDP Act 2023 privacy & terms', 'ଅଣ-ସରକାରୀ ସ୍ପଷ୍ଟୀକରଣ ଓ DPDP ଗୋପନୀୟତା ନୀତି', '⚖️', 'rose', 50, 1),
  ('atax_l1_contact', 1, NULL, 'contact-grievance-partnerships', 'Contact, Grievance & Partnerships', 'ଯୋଗାଯୋଗ, ଅଭିଯୋଗ ଓ ସହଭାଗିତା', 'Press desk, academic collaborations & editorial corrections', 'ସମ୍ପାଦକୀୟ ସଂଶୋଧନ ଓ ଶିକ୍ଷାଗତ ସହଭାଗିତା', '📩', 'teal', 60, 1);

-- Level 2: Section / Department
INSERT OR IGNORE INTO about_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('atax_l2_about_cso', 2, 'atax_l1_mission', 'about-common-sense-odisha', 'About Common Sense Odisha', 'Common Sense Odisha ବିଷୟରେ', 'Public-interest mandate, bilingual access & zero paywalls', 'ସାର୍ବଜନୀନ ଜ୍ଞାନ ଓ ଦ୍ୱିଭାଷୀ ସୁବିଧା', '📘', 'emerald', 10, 1),
  ('atax_l2_verification', 2, 'atax_l1_editorial', 'three-step-gov-verification', '3-Step .gov.in Verification Protocol', '୩-ସ୍ତରୀୟ .gov.in ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା', 'How every job, scheme & syllabus is verified before publishing', 'ପ୍ରକାଶନ ପୂର୍ବରୁ ତଥ୍ୟ ଯାଞ୍ଚ ପଦ୍ଧତି', '🔍', 'cobalt', 10, 1),
  ('atax_l2_review_board', 2, 'atax_l1_leadership', 'editorial-academic-review-board', 'Editorial & Academic Review Board', 'ସମ୍ପାଦକୀୟ ଓ ଶିକ୍ଷା ସମୀକ୍ଷା ପରିଷଦ', 'Subject editors for OPSC, OSSC, OSSSC, TET & Welfare Schemes', 'ପରୀକ୍ଷା ଓ ଯୋଜନା ସମୀକ୍ଷା ବିଶେଷଜ୍ଞ', '🎓', 'violet', 10, 1),
  ('atax_l2_portals', 2, 'atax_l1_sources', 'odisha-central-govt-portals', 'Odisha & Central Government Portals', 'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ସରକାରୀ ପୋର୍ଟାଲ୍', 'Authentic official portals for jobs, scholarships & citizen DBT', 'ନିଯୁକ୍ତି, ବୃତ୍ତି ଓ DBT ସରକାରୀ ପୋର୍ଟାଲ୍', '🌐', 'amber', 10, 1),
  ('atax_l2_privacy_terms', 2, 'atax_l1_legal', 'privacy-terms-disclaimer', 'Privacy Policy, Terms & Disclaimer', 'ଗୋପନୀୟତା ନୀତି, ସର୍ତ୍ତାବଳୀ ଓ ସ୍ପଷ୍ଟୀକରଣ', 'Independent portal status & zero-tracking DPDP compliance', 'ସ୍ୱାଧୀନ ପ୍ଲାଟଫର୍ମ ସ୍ପଷ୍ଟୀକରଣ', '📜', 'rose', 10, 1),
  ('atax_l2_grievance', 2, 'atax_l1_contact', 'citizen-grievance-press-desk', 'Citizen Grievance & Press Desk', 'ନାଗରିକ ଅଭିଯୋଗ ଓ ପ୍ରେସ୍ ଡେସ୍କ', 'Fast-track error correction & institutional collaboration desk', 'ତୁରନ୍ତ ତ୍ରୁଟି ସଂଶୋଧନ ଡେସ୍କ', '📬', 'teal', 10, 1);

-- Level 3: Document / Profile Format
INSERT OR IGNORE INTO about_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published) VALUES
  ('atax_l3_charter', 3, 'atax_l2_about_cso', 'institutional-charter', 'Institutional Charter', 'ସଂସ୍ଥାଗତ ଚାର୍ଟର', 'Founding principles & public-interest charter', 'ମୂଳ ନୀତି ଓ ଉଦ୍ଦେଶ୍ୟ', '🏛️', 'emerald', 10, 1),
  ('atax_l3_guideline', 3, 'atax_l2_verification', 'editorial-guideline', 'Editorial Guideline', 'ସମ୍ପାଦକୀୟ ନିର୍ଦ୍ଦେଶାବଳୀ', 'Fact-checking, corrigendum & source citation standards', 'ତଥ୍ୟ ଯାଞ୍ଚ ମାନଦଣ୍ଡ', '📋', 'cobalt', 10, 1),
  ('atax_l3_profile', 3, 'atax_l2_review_board', 'author-mentor-profile', 'Author / Mentor Profile', 'ଲେଖକ / ମେଣ୍ଟର ପରିଚୟ', 'Verified editorial contributors & academic mentors', 'ବିଶେଷଜ୍ଞ ପରିଚୟ', '👤', 'violet', 10, 1),
  ('atax_l3_disclosure', 3, 'atax_l2_privacy_terms', 'public-disclosure-compliance', 'Public Disclosure & Compliance', 'ସାର୍ବଜନୀନ ଘୋଷଣା ଓ ଅନୁପାଳନ', 'Non-government status, data minimization & accessibility', 'ଆଇନଗତ ସ୍ପଷ୍ଟୀକରଣ', '⚖️', 'rose', 10, 1),
  ('atax_l3_impact', 3, 'atax_l2_about_cso', 'annual-impact-report', 'Annual Impact Report', 'ବାର୍ଷିକ ପ୍ରଭାବ ରିପୋର୍ଟ', 'Odisha 30-district reach & open-access milestones', '୩୦ ଜିଲ୍ଲା ପ୍ରଭାବ ରିପୋର୍ଟ', '📊', 'amber', 20, 1),
  ('atax_l3_faq', 3, 'atax_l2_grievance', 'public-faq', 'Public FAQ', 'ସାଧାରଣ ପ୍ରଶ୍ନୋତ୍ତର', 'Common questions on verification, privacy & contributing', 'ସାଧାରଣ ସନ୍ଦେହ ସମାଧାନ', '❓', 'teal', 10, 1);

-- ============================================================================
-- SEED STARTER INSTITUTIONAL CHARTER & VERIFICATION POLICY PAGES
-- ============================================================================
INSERT OR IGNORE INTO about_articles (
  id, slug, category_l1_id, category_l2_id, category_l3_id, doc_type_badge,
  title_en, title_or, subtitle_en, subtitle_or, summary_en, summary_or,
  effective_date, article_body_en, article_body_or,
  highlights_table_json, verification_steps_json, impact_metrics_json, faq_items_json,
  is_featured, is_published, published_at
) VALUES (
  'aart_charter_cso',
  'common-sense-odisha-institutional-charter',
  'atax_l1_mission', 'atax_l2_about_cso', 'atax_l3_charter',
  'Institutional Charter',
  'About Common Sense Odisha — Independent Public Knowledge Charter',
  'Common Sense Odisha ବିଷୟରେ — ସ୍ୱାଧୀନ ସାର୍ବଜନୀନ ଜ୍ଞାନ ଚାର୍ଟର',
  'Be Self-Reliant · Build a Better Tomorrow',
  'ଆତ୍ମନିର୍ଭରଶୀଳ ହୁଅନ୍ତୁ · ଏକ ଉନ୍ନତ ଆସନ୍ତାକାଲି ଗଢ଼ନ୍ତୁ',
  'Common Sense Odisha (csodisha.com) is an independent, open-access civic and educational platform empowering Odisha students, job seekers, farmers, women, and citizens with verified bilingual information.',
  'Common Sense Odisha (csodisha.com) ହେଉଛି ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ, ନିଯୁକ୍ତି ଆଶାୟୀ ଏବଂ ନାଗରିକମାନଙ୍କ ପାଇଁ ଏକ ସ୍ୱାଧୀନ ଓ ମୁକ୍ତ ଦ୍ୱିଭାଷୀ ସୂଚନା ପ୍ଲାଟଫର୍ମ।',
  '2026-01-01',
  '## Our Public-Interest Mandate\n- **100% Independent & Non-Government:** Common Sense Odisha is NOT affiliated with the Government of Odisha, Government of India, OPSC, OSSC, OSSSC, or any political party. We aggregate and simplify official notifications exclusively from authentic `.gov.in` and `.nic.in` sources.\n- **Bilingual Access (English & ଓଡ଼ିଆ):** Every major recruitment notice, welfare scheme eligibility guide, and exam syllabus is structured clearly in both English and Odia so rural and urban citizens across all 30 districts have equal access.\n- **Zero Misleading Clickbait or Fake Apply Links:** Every Apply Now CTA points strictly to verified official government domains.',
  '## ଆମର ସାର୍ବଜନୀନ ଉଦ୍ଦେଶ୍ୟ\n- **ସମ୍ପୂର୍ଣ୍ଣ ସ୍ୱାଧୀନ ଓ ଅଣ-ସରକାରୀ:** Common Sense Odisha କୌଣସି ସରକାରୀ ବିଭାଗ କିମ୍ବା ରାଜନୈତିକ ଦଳ ସହ ଜଡ଼ିତ ନୁହେଁ। ଆମେ କେବଳ ପ୍ରାମାଣିକ `.gov.in` ଏବଂ `.nic.in` ସୂତ୍ରରୁ ସୂଚନା ସଂଗ୍ରହ କରି ସରଳ ଭାଷାରେ ଉପସ୍ଥାପନ କରୁ।\n- **ଦ୍ୱିଭାଷୀ ସୁବିଧା (ଇଂରାଜୀ ଓ ଓଡ଼ିଆ):** ରାଜ୍ୟର ସମସ୍ତ ୩୦ ଜିଲ୍ଲାର ନାଗରିକଙ୍କ ପାଇଁ ପ୍ରତ୍ୟେକ ନିଯୁକ୍ତି, ଯୋଜନା ଓ ପାଠ୍ୟକ୍ରମ ଉଭୟ ଇଂରାଜୀ ଓ ଓଡ଼ିଆରେ ଉପଲବ୍ଧ।',
  '[{"principle_en":"Independent & Open-Access","principle_or":"ସ୍ୱାଧୀନ ଓ ମୁକ୍ତ","detail_en":"Free public access to verified jobs, schemes, syllabi & PYQs without paywalls."},{"principle_en":"Strict .gov.in Attribution","principle_or":"ପ୍ରାମାଣିକ .gov.in ସୂତ୍ର","detail_en":"Every notification links directly to official Odisha/Central government PDFs and portals."},{"principle_en":"DPDP Act 2023 Privacy","principle_or":"DPDP ଗୋପନୀୟତା ସୁରକ୍ଷା","detail_en":"Zero third-party ad trackers, strict CSP security, and minimal candidate data storage."}]',
  '[{"step":"Step 1 — Official Source Capture","detail_en":"Editors verify the Gazette, Advertisement PDF, or Scheme Guideline directly from an authentic .gov.in / .nic.in domain.","detail_or":"ପ୍ରାମାଣିକ .gov.in / .nic.in ପୋର୍ଟାଲରୁ ସିଧାସଳଖ ବିଜ୍ଞପ୍ତି ଯାଞ୍ଚ କରାଯାଏ।"},{"step":"Step 2 — Bilingual Structuring & Eligibility Check","detail_en":"Vacancies, age relaxations (SEBC/SC/ST/PwBD), income caps, and NPCI DBT prerequisites are cross-checked before publishing.","detail_or":"ପଦବୀ, ବୟସ ସୀମା, ଆୟ ସୀମା ଓ DBT ନିୟମାବଳୀ ଯାଞ୍ଚ କରାଯାଏ।"},{"step":"Step 3 — Corrigendum & Expiry Monitoring","detail_en":"Notices are tracked through admit cards, answer keys, and final results with instant corrigendum updates.","detail_or":"ସଂଶୋଧନ, ଆଡମିଟ୍ କାର୍ଡ ଓ ଫଳାଫଳ ନିୟମିତ ଅଦ୍ୟତନ କରାଯାଏ।"}]',
  '[{"metric":"30 Districts","label_en":"Odisha Statewide Coverage","label_or":"ଓଡ଼ିଶାର ୩୦ ଜିଲ୍ଲା"},{"metric":"100%","label_en":"Verified Official .gov.in Apply Links","label_or":"ପ୍ରାମାଣିକ ସରକାରୀ ଲିଙ୍କ୍"},{"metric":"2 Languages","label_en":"English & Odia (ଓଡ଼ିଆ) Publishing","label_or":"ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ପ୍ରକାଶନ"}]',
  '[{"q_en":"Is Common Sense Odisha an official Odisha Government website?","q_or":"Common Sense Odisha କଣ ଏକ ସରକାରୀ ୱେବସାଇଟ୍?","a_en":"No. Common Sense Odisha is an independent civic & educational information portal. Always submit applications and fees only on official .gov.in / .nic.in portals.","a_or":"ନାଁ। ଏହା ଏକ ସ୍ୱାଧୀନ ସୂଚନା ପ୍ଲାଟଫର୍ମ। ଆବେଦନ ସର୍ବଦା ସରକାରୀ .gov.in ପୋର୍ଟାଲରେ କରନ୍ତୁ।"},{"q_en":"How can I report an outdated link or typo?","q_or":"ଭୁଲ୍ ତଥ୍ୟ ବା ଲିଙ୍କ୍ କିପରି ଜଣାଇବେ?","a_en":"Use the Public Contact & Editorial Correction Desk on this page — our editors review and update verified corrections rapidly.","a_or":"ଏହି ପୃଷ୍ଠାରେ ଥିବା ଯୋଗାଯୋଗ ଓ ସଂଶୋଧନ ଫର୍ମ ମାଧ୍ୟମରେ ଆମକୁ ଜଣାନ୍ତୁ।"}]',
  1, 1, datetime('now')
);

INSERT OR IGNORE INTO about_articles (
  id, slug, category_l1_id, category_l2_id, category_l3_id, doc_type_badge,
  title_en, title_or, subtitle_en, subtitle_or, summary_en, summary_or,
  effective_date, article_body_en, article_body_or,
  verification_steps_json, is_featured, is_published, published_at
) VALUES (
  'aart_editorial_protocol',
  'editorial-verification-and-fact-checking-policy',
  'atax_l1_editorial', 'atax_l2_verification', 'atax_l3_guideline',
  'Editorial Policy',
  '3-Step .gov.in Editorial Verification & Anti-Fraud Policy',
  '୩-ସ୍ତରୀୟ .gov.in ତଥ୍ୟ ଯାଞ୍ଚ ଓ ଠକେଇ ପ୍ରତିରୋଧ ନୀତି',
  'Zero Unverified Rumours · Direct Official PDF Archival',
  'କୌଣସି ଗୁଜବ ନୁହେଁ · ସିଧାସଳଖ ସରକାରୀ ପିଡିଏଫ୍ ପ୍ରମାଣ',
  'How Common Sense Odisha verifies every job notification, scholarship deadline, welfare eligibility rule, and exam syllabus against authentic government portals.',
  'ପ୍ରତ୍ୟେକ ନିଯୁକ୍ତି, ଛାତ୍ରବୃତ୍ତି, ଯୋଜନା ଓ ପାଠ୍ୟକ୍ରମ କିପରି ସରକାରୀ ପୋର୍ଟାଲ ସହ ମିଳାଇ ଯାଞ୍ଚ କରାଯାଏ।',
  '2026-01-01',
  '## Anti-Fraud Citizen Safety Checklist\n- Always verify that the browser address bar ends with **`.gov.in`** or **`.nic.in`** before entering Aadhaar, bank details, or exam fees.\n- Never pay any middleman or unofficial portal to apply for **Subhadra Yojana**, **CM-KISAN**, **Odisha State Scholarships**, or **OPSC/OSSC/OSSSC** exams.\n- Cross-check official domains using our live **Verified Official Government Portals Registry** below.',
  '## ନାଗରିକ ସୁରକ୍ଷା ଓ ଠକେଇ ପ୍ରତିରୋଧ ନିୟମ\n- ଆଧାର, ବ୍ୟାଙ୍କ ତଥ୍ୟ ବା ପରୀକ୍ଷା ଫି ଦେବା ପୂର୍ବରୁ ୱେବସାଇଟ୍ ଠିକଣା **`.gov.in`** କିମ୍ବା **`.nic.in`** ଅଛି କି ନାହିଁ ନିଶ୍ଚିତ କରନ୍ତୁ।\n- **ସୁଭଦ୍ରା ଯୋଜନା**, **ସିଏମ୍-କିଷାନ** ବା **ଓଡ଼ିଶା ଛାତ୍ରବୃତ୍ତି** ପାଇଁ କୌଣସି ମଧ୍ୟସ୍ଥିଙ୍କୁ ଟଙ୍କା ଦିଅନ୍ତୁ ନାହିଁ।',
  '[{"step":"1. Primary Domain Check","detail_en":"Confirm the recruitment/scheme notice originates on an authentic .gov.in or .nic.in portal.","detail_or":"ସରକାରୀ .gov.in ପୋର୍ଟାଲରୁ ମୂଳ ବିଜ୍ଞପ୍ତି ଯାଞ୍ଚ।"},{"step":"2. Dual-Editor Review","detail_en":"Verify Advertisement Number, last date, fee exemptions, and Odia translation accuracy.","detail_or":"ବିଜ୍ଞପ୍ତି ସଂଖ୍ୟା, ଶେଷ ତାରିଖ ଓ ଓଡ଼ିଆ ଅନୁବାଦ ଯାଞ୍ଚ।"},{"step":"3. Public Correction SLA","detail_en":"Citizen-reported discrepancies are audited and corrected with a visible revision note.","detail_or":"ନାଗରିକଙ୍କ ଦ୍ୱାରା ଜଣାଯାଇଥିବା ତ୍ରୁଟି ତୁରନ୍ତ ସଂଶୋଧନ କରାଯାଏ।"}]',
  1, 1, datetime('now')
);

-- ============================================================================
-- SEED 11 VERIFIED OFFICIAL ODISHA & CENTRAL .GOV.IN PORTALS (ANTI-FRAUD REGISTRY)
-- ============================================================================
INSERT OR IGNORE INTO about_official_sources (id, sector, authority_name_en, authority_name_or, official_url, domain_badge, purpose_en, purpose_or, helpline_info, sort_order, is_verified, is_published) VALUES
  ('asrc_opsc', 'Recruitment Commissions', 'Odisha Public Service Commission (OPSC)', 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC)', 'https://www.opsc.gov.in/', '.gov.in', 'OAS, OFS, OCS, Assistant Professor & Group-A/B gazetted recruitments in Odisha.', 'OAS, OCS ଓ ରାଜ୍ୟ ଗେଜେଟେଡ୍ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି।', '0671-2304141 / opsc.nic.in', 10, 1, 1),
  ('asrc_ossc', 'Recruitment Commissions', 'Odisha Staff Selection Commission (OSSC)', 'ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSC)', 'https://www.ossc.gov.in/', '.gov.in', 'CGL, Combined Technical Services, Traffic Constable & state Group-B/C posts.', 'CGL ଓ ରାଜ୍ୟ ଗ୍ରୁପ୍-ବି / ସି ନିଯୁକ୍ତି।', '0674-2394476', 20, 1, 1),
  ('asrc_osssc', 'Recruitment Commissions', 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)', 'ଓଡ଼ିଶା ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSSC)', 'https://www.osssc.gov.in/', '.gov.in', 'RI, ARI, Amin, PEO, Junior Assistant, Livestock Inspector & Forest Guard exams.', 'RI, ARI, Amin, PEO ଓ ଫରେଷ୍ଟ ଗାର୍ଡ ପରୀକ୍ଷା।', '0674-2597149', 30, 1, 1),
  ('asrc_oprb', 'Recruitment Commissions', 'Odisha Police Recruitment Board (OPRB)', 'ଓଡ଼ିଶା ପୋଲିସ ନିଯୁକ୍ତି ବୋର୍ଡ (OPRB)', 'https://odishapolice.gov.in/', '.gov.in', 'Odisha Police SI, Constable, Sepoy & Armed Police recruitment notifications.', 'ଓଡ଼ିଶା ପୋଲିସ ଏସଆଇ ଓ କନଷ୍ଟେବଳ ନିଯୁକ୍ତି।', '0671-2304001', 40, 1, 1),
  ('asrc_scholarship', 'Scholarships & DBT', 'Odisha State Scholarship Portal', 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍', 'https://scholarship.odisha.gov.in/', '.gov.in', 'Pre-Matric, Post-Matric, Gopabandhu Sikhya Sahayata & Kalia/Nirman Shramik scholarships.', 'ପ୍ରି/ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ଆବେଦନ।', '155335 / 1800-345-6770', 50, 1, 1),
  ('asrc_edistrict', 'Odisha State', 'e-District Odisha Portal', 'ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ଓଡ଼ିଶା ପୋର୍ଟାଲ୍', 'https://edistrict.odisha.gov.in/', '.gov.in', 'Online Resident, Income, Caste (SC/ST/SEBC), EWS & Legal Heir certificates.', 'ବାସିନ୍ଦା, ଆୟ, ଜାତି ଓ EWS ପ୍ରମାଣପତ୍ର ଆବେଦନ।', '1800-345-7155', 60, 1, 1),
  ('asrc_subhadra', 'Scholarships & DBT', 'Subhadra Yojana Official Portal (Odisha)', 'ସୁଭଦ୍ରା ଯୋଜନା ସରକାରୀ ପୋର୍ଟାଲ୍', 'https://subhadra.odisha.gov.in/', '.gov.in', 'Women empowerment DBT financial assistance by Women & Child Development Dept, Odisha.', 'ମହିଳା ସଶକ୍ତିକରଣ ସୁଭଦ୍ରା ଯୋଜନା DBT ପୋର୍ଟାଲ୍।', '14678', 70, 1, 1),
  ('asrc_cmkisan', 'Scholarships & DBT', 'CM-KISAN Odisha Portal', 'ସିଏମ୍-କିଷାନ ଓଡ଼ିଶା ପୋର୍ଟାଲ୍', 'https://cmkisan.odisha.gov.in/', '.gov.in', 'Farmer welfare DBT assistance, Krushak Odisha registration & e-KYC status.', 'କୃଷକ କଲ୍ୟାଣ ସିଏମ୍-କିଷାନ DBT ପୋର୍ଟାଲ୍।', '1800-102-5166', 80, 1, 1),
  ('asrc_upsc', 'Central Govt', 'Union Public Service Commission (UPSC)', 'କେନ୍ଦ୍ର ଲୋକ ସେବା ଆୟୋଗ (UPSC)', 'https://upsc.gov.in/', '.gov.in', 'IAS/IPS Civil Services, CDS, NDA, CAPF & Central engineering examinations.', 'IAS/IPS ସିଭିଲ୍ ସର୍ଭିସେସ୍ ଓ କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା।', '011-23385271', 90, 1, 1),
  ('asrc_ssc', 'Central Govt', 'Staff Selection Commission (SSC — GoI)', 'କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (SSC)', 'https://ssc.gov.in/', '.gov.in', 'SSC CGL, CHSL, MTS, GD Constable, JE & Selection Post central recruitments.', 'SSC CGL, CHSL, MTS ଓ GD ନିଯୁକ୍ତି।', 'ssc.gov.in Helpdesk', 100, 1, 1),
  ('asrc_myscheme', 'Central Govt', 'myScheme — National Scheme Discovery Portal', 'ମାଇଁ-ସ୍କିମ୍ — ଜାତୀୟ ଯୋଜନା ପୋର୍ଟାଲ୍', 'https://www.myscheme.gov.in/', '.gov.in', 'Government of India unified national welfare & citizen scheme discovery directory.', 'ଭାରତ ସରକାରଙ୍କ ଏକୀକୃତ ଯୋଜନା ସନ୍ଧାନ ପୋର୍ଟାଲ୍।', 'myscheme.gov.in', 110, 1, 1);
