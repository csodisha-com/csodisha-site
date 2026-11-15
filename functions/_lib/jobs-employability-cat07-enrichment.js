// Category #07 (v74): Exhaustive Minute Bilingual Enrichment of Career Development & Employability (20 Subcategories + 12 Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', 'cat03-enrich', 'cat04-enrich', 'cat05-enrich', 'cat06-enrich', 'cat07-enrich', '']);

function isShort160(val) {
  return String(val || '').trim().length < 160;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isShort160(row?.description_en || row?.description) && !isShort160(row?.description_or);
}

// Tailored >=160-char bilingual metadata for key Category #07 folders
const CAT07_FOLDER_ENRICHMENTS = {
  'career planning and guidance': {
    title_or: 'କ୍ୟାରିଅର୍ ଯୋଜନା ଏବଂ ପରାମର୍ଶ',
    badge: 'CAREER PLANNING',
    en: 'Structured career discovery, goal-setting, and district-level career counselling directory for Odisha students and graduates, integrating National Career Service (NCS) and Odisha State Employment Exchange guidance.',
    or: 'କ୍ୟାରିଅର୍ ଯୋଜନା ଓ ପରାମର୍ଶ: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ ଏବଂ ସ୍ନାତକଙ୍କ ପାଇଁ କ୍ୟାରିଅର୍ ଚୟନ, ଦୀର୍ଘକାଳୀନ ଲକ୍ଷ୍ୟ ନିର୍ଦ୍ଧାରଣ, NCS ପୋର୍ଟାଲ୍ ଏବଂ ଜିଲ୍ଲା ନିୟୋଜନ କାର୍ଯ୍ୟାଳୟ ପରାମର୍ଶର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'application preparation': {
    title_or: 'ଆବେଦନ ପ୍ରସ୍ତୁତି ଏବଂ ଡକ୍ୟୁମେଣ୍ଟ ଗାଇଡ୍',
    badge: 'APPLICATIONS',
    en: 'Complete toolkit for crafting ATS-compliant resumes, academic CVs, Government service biodata, Statements of Purpose (SOP), and error-free OPSC/OSSC/OSSSC/UPSC and corporate job applications.',
    or: 'ଆବେଦନ ପ୍ରସ୍ତୁତି: ATS-ଅନୁକୂଳ ରିଜ୍ୟୁମ୍, ଏକାଡେମିକ୍ CV, ସରକାରୀ ଚାକିରି ବାୟୋଡାଟା, SOP ଏବଂ OPSC/OSSC/OSSSC/UPSC ଓ କର୍ପୋରେଟ୍ ଆବେଦନ ପାଇଁ ତ୍ରୁଟି-ଶୂନ୍ୟ ଡକ୍ୟୁମେଣ୍ଟ ପ୍ରସ୍ତୁତି ଗାଇଡ୍।'
  },
  'interview and selection preparation': {
    title_or: 'ସାକ୍ଷାତକାର ଏବଂ ଚୟନ ପ୍ରସ୍ତୁତି',
    badge: 'INTERVIEW PREP',
    en: 'Comprehensive interview readiness covering OPSC OAS / UPSC Personality Test (DAF & Home District prep), OPSC Assistant Professor / OAVS teaching demos, IBPS/PSU GD & psychometric rounds, and technical coding interviews.',
    or: 'ସାକ୍ଷାତକାର ଓ ଚୟନ ପ୍ରସ୍ତୁତି: OPSC OAS / UPSC ପର୍ସନାଲିଟି ଟେଷ୍ଟ (DAF), ଆସିଷ୍ଟାଣ୍ଟ ପ୍ରଫେସର ଓ OAVS ଡେମୋ କ୍ଲାସ୍, ବ୍ୟାଙ୍କିଙ୍ଗ୍/PSU GD ଏବଂ ଟେକ୍ନିକାଲ୍ ସାକ୍ଷାତକାର ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ମାର୍ଗଦର୍ଶିକା।'
  },
  'employability and professional skills': {
    title_or: 'ନିଯୁକ୍ତି ଯୋଗ୍ୟତା ଏବଂ ବୃତ୍ତିଗତ ଦକ୍ଷତା',
    badge: 'EMPLOYABILITY',
    en: 'Practical skill-building roadmap for Odisha youth covering English & Odia official communication, digital portfolios (GitHub/LinkedIn), NAPS/NATS apprenticeships, World Skill Center Bhubaneswar, DDU-GKY, and PMKVY 4.0.',
    or: 'ନିଯୁକ୍ତି ଯୋଗ୍ୟତା ଓ ବୃତ୍ତିଗତ ଦକ୍ଷତା: ଇଂରାଜୀ-ଓଡ଼ିଆ ସରକାରୀ ଯୋଗାଯୋଗ, GitHub/LinkedIn ପୋର୍ଟଫୋଲିଓ, NAPS/NATS ଆପ୍ରେଣ୍ଟିସଶିପ୍, ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର, DDU-GKY ଏବଂ PMKVY 4.0 ତାଲିମ ସୂଚନା।'
  },
  'salary, benefits and career progression': {
    title_or: 'ଦରମା, ସୁବିଧା ଏବଂ କ୍ୟାରିଅର୍ ଉନ୍ନତି',
    badge: 'WORKPLACE RIGHTS',
    en: 'Essential guide to offer letter verification, EPFO/ESIC social security, POSH Act workplace safety, ORSP 2017 / 7th CPC pay progression, minimum wages, and mid-career transition or gap-year justification.',
    or: 'ଦରମା, ସୁବିଧା ଓ କ୍ୟାରିଅର୍ ଉନ୍ନତି: ଅଫର୍ ଲେଟର୍ ଯାଞ୍ଚ, EPFO/ESIC ସାମାଜିକ ସୁରକ୍ଷା, POSH ଆଇନ, ORSP/7th CPC ବେତନ କ୍ରମ ଏବଂ ମଧ୍ୟ-କ୍ୟାରିଅର୍ ପରିବର୍ତ୍ତନ ଓ ଗ୍ୟାପ୍-ଇୟର୍ ସମାଧାନ ଗାଇଡ୍।'
  },
  'entrepreneurship and business support': {
    title_or: 'ଉଦ୍ୟୋଗୀକରଣ ଏବଂ ବ୍ୟବସାୟ ସହାୟତା',
    badge: 'STARTUP ODISHA',
    en: 'Step-by-step entrepreneurship playbook for Odisha youth covering Startup Odisha (O-Hub Bhubaneswar), MSME Udyam registration, PMEGP/Mudra/CMEGP subsidies, campus incubators, and DPIIT startup recognition.',
    or: 'ଉଦ୍ୟୋଗୀକରଣ ଓ ବ୍ୟବସାୟ ସହାୟତା: ଷ୍ଟାର୍ଟଅପ୍ ଓଡ଼ିଶା (O-Hub ଭୁବନେଶ୍ୱର), MSME ଉଦ୍ୟମ ପଞ୍ଜୀକରଣ, PMEGP/ମୁଦ୍ରା/CMEGP ସବସିଡି ଏବଂ କ୍ୟାମ୍ପସ୍ ଇନକ୍ୟୁବେସନ୍ ସୁବିଧାର ସମ୍ପୂର୍ଣ୍ଣ ମାର୍ଗଦର୍ଶିକା।'
  },
  'resume, cv & interview readiness': {
    title_or: 'ରିଜ୍ୟୁମ୍, CV ଏବଂ ସାକ୍ଷାତକାର ପ୍ରସ୍ତୁତି',
    badge: 'READINESS',
    en: 'Actionable templates and checklists for ATS-friendly resumes, Academic CVs, OPSC/UPSC DAF Personality Tests, teaching micro-demos, and PSU/Banking Group Discussions & psychometric assessments.',
    or: 'ରିଜ୍ୟୁମ୍, CV ଓ ସାକ୍ଷାତକାର ପ୍ରସ୍ତୁତି: ATS ରିଜ୍ୟୁମ୍, ଏକାଡେମିକ୍ CV, OPSC/UPSC DAF ଭାଇଭା, ଶିକ୍ଷକ ଡେମୋ କ୍ଲାସ୍ ଏବଂ ବ୍ୟାଙ୍କିଙ୍ଗ୍/PSU GD ଓ ସାଇକୋମେଟ୍ରିକ୍ ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'workplace skills, internships & freelancing': {
    title_or: 'କାର୍ଯ୍ୟକ୍ଷେତ୍ର ଦକ୍ଷତା, ଇଣ୍ଟର୍ନଶିପ୍ ଏବଂ ଫ୍ରିଲାନ୍ସିଂ',
    badge: 'EMPLOYABILITY',
    en: 'Verified pathways for Odisha graduates into NAPS/NATS apprenticeships, NCS & Odisha Employment Exchange job fairs, WSC/DDU-GKY/PMKVY training, remote freelancing, and EPFO/ESIC workplace rights.',
    or: 'କାର୍ଯ୍ୟକ୍ଷେତ୍ର ଦକ୍ଷତା ଓ ଇଣ୍ଟର୍ନଶିପ୍: NAPS/NATS ଆପ୍ରେଣ୍ଟିସଶିପ୍, NCS ଓ ଓଡ଼ିଶା ନିୟୋଜନ ପୋର୍ଟାଲ୍, WSC/DDU-GKY ତାଲିମ, ରିମୋଟ୍ ଫ୍ରିଲାନ୍ସିଂ ଏବଂ EPFO/ESIC ଶ୍ରମିକ ଅଧିକାର ସୂଚନା।'
  }
};

function buildSmartEmployabilityFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const hay = `${title} ${parentTitle || ''} ${folder.slug || ''}`.toLowerCase();

  let badge = 'EMPLOYABILITY';
  let en = '';
  let or = '';

  if (hay.includes('resume') || hay.includes('cv') || hay.includes('application') || hay.includes('daf') || hay.includes('interview') || hay.includes('viva')) {
    badge = 'READINESS';
    en = `Practical ${title} handbook for Odisha candidates featuring step-by-step templates, evaluation rubrics, common mistakes to avoid, and verified checklists for OPSC/UPSC, PSU, and private-sector hiring.`;
    or = `${title} ପ୍ରସ୍ତୁତି ଗାଇଡ୍: ଓଡ଼ିଶାର ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ବ୍ୟବହାରିକ ଟେମ୍ପଲେଟ୍, ମୂଲ୍ୟାଙ୍କନ ମାନଦଣ୍ଡ, ସାଧାରଣ ତ୍ରୁଟି ନିବାରଣ ଏବଂ OPSC/UPSC, PSU ଓ କର୍ପୋରେଟ୍ ନିଯୁକ୍ତି ଚେକ୍-ଲିଷ୍ଟର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  } else if (hay.includes('salary') || hay.includes('benefits') || hay.includes('progression') || hay.includes('workplace') || hay.includes('rights')) {
    badge = 'WORKPLACE & PAY';
    en = `Authoritative ${title} guide for first-time and mid-career Odisha professionals covering EPFO/ESIC social security, offer letter verification, POSH compliance, and structured career upskilling.`;
    or = `${title} ମାର୍ଗଦର୍ଶିକା: ଓଡ଼ିଶାର କର୍ମଚାରୀଙ୍କ ପାଇଁ EPFO/ESIC ସାମାଜିକ ସୁରକ୍ଷା, ଅଫର୍ ଲେଟର୍ ଯାଞ୍ଚ, POSH ଆଇନ ସୁରକ୍ଷା ଏବଂ କ୍ୟାରିଅର୍ ଉନ୍ନତି ରଣନୀତିର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।`;
  } else if (hay.includes('digital') || hay.includes('communication') || hay.includes('technical') || hay.includes('internship') || hay.includes('naps')) {
    badge = 'SKILLS & PORTALS';
    en = `Hands-on ${title} roadmap connecting Odisha students to NCS, Odisha Employment Exchange, NAPS/NATS stipends, WSC Bhubaneswar, GitHub/LinkedIn portfolios, and official RTI/email drafting standards.`;
    or = `${title} ଦକ୍ଷତା ପଥ: ଓଡ଼ିଶାର ଯୁବପିଢ଼ିଙ୍କ ପାଇଁ NCS, ଓଡ଼ିଶା ନିୟୋଜନ ପୋର୍ଟାଲ୍, NAPS/NATS ଷ୍ଟାଇପେଣ୍ଡ, WSC ଭୁବନେଶ୍ୱର ଏବଂ GitHub/LinkedIn ପୋର୍ଟଫୋଲିଓ ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  } else {
    en = `Comprehensive ${title} career development guide for Odisha learners covering official government portals (NCS, EmpMission Odisha, Startup Odisha), structured action plans, and readiness checklists.`;
    or = `${title} କ୍ୟାରିଅର୍ ବିକାଶ ଗାଇଡ୍: ଓଡ଼ିଶାର ଶିକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ ସରକାରୀ ପୋର୍ଟାଲ୍ (NCS, EmpMission Odisha, Startup Odisha), କାର୍ଯ୍ୟ ଯୋଜନା ଏବଂ ନିଯୁକ୍ତି ପ୍ରସ୍ତୁତି ଚେକ୍-ଲିଷ୍ଟର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  }

  return {
    title_or: folder.title_or || `${title} (କ୍ୟାରିଅର୍ ବିକାଶ)`,
    badge,
    en,
    or
  };
}

// 12 Exhaustive Minute Employability, Interview, Apprenticeship & Skill Handbooks (Category #07)
const CAT07_HANDBOOKS = [
  {
    id: 'ji-cd-ats-resume-cv-biodata',
    folderKey: 'application documents',
    fallbackFolder: 'jf-cd-ats-resume',
    slug: 'ats-resume-academic-cv-and-govt-biodata-master-guide',
    title: 'ATS-Compliant Resume, Academic CV & Government Service Biodata Master Guide (Freshers, Experienced & Ph.D./Faculty Formats)',
    title_or: 'ATS-ଅନୁକୂଳ ରିଜ୍ୟୁମ୍, ଏକାଡେମିକ୍ CV ଏବଂ ସରକାରୀ ବାୟୋଡାଟା ମାଷ୍ଟର ଗାଇଡ୍ (ଫ୍ରେଶର୍, ଅଭିଜ୍ଞ ଓ PhD/ଅଧ୍ୟାପକ)',
    conducting_body: 'CSOdisha Career Readiness Desk / AICTE & UGC Academic Standards',
    exam_code: 'EMP-ATS-RESUME-CV',
    cadre_group: 'Freshers, Lateral Tech/Core Professionals, Ph.D./NET Faculty & Govt Viva Candidates',
    pay_matrix: 'Zero-Cost Open Formats (LaTeX / Google Docs / Single-Column DOCX & PDF)',
    age_limit_relaxation: 'Applicable across all career stages (0–15+ years experience)',
    qualification_odia_rule: 'Single-column ATS-safe layout (10–11pt standard font, zero tables/text-boxes/photos for corporate ATS); Academic CV includes UGC API score, Scopus/UGC-CARE papers & Funded Projects',
    selection_stages: '1. Choose Format (1-Page Fresher ATS / 2-Page Experienced / Multi-Page Academic CV / Govt Biodata) -> 2. Quantify Impact (XYZ Formula) -> 3. Mirror Job Description Keywords -> 4. Run Plain-Text Copy-Paste ATS Check -> 5. Export Clean PDF',
    pst_pet_skill_norms: 'Common Mistakes to Avoid: Multi-column Canva graphics that break ATS parsers, generic objective statements, unverified skill bars (e.g., "Java 80%"), and spelling errors.',
    documents_checklist: '1. Clean Contact Header (Name, Phone, Email, GitHub/LinkedIn, District/Odisha)\n2. Education & CGPA/Percentage (Reverse Chronological)\n3. Projects / Internships with Measurable Metrics\n4. Publications / Patents / Teaching Experience (for Academic CV)',
    application_steps: '1. Use single-column layout with standard headings (Experience, Education, Skills, Projects).\n2. Replace passive duties with action verbs + metrics (e.g., "Reduced API latency by 35%").\n3. Save as text-selectable PDF named FirstName_LastName_Role.pdf.',
    official_portal_url: 'https://www.ncs.gov.in/',
    summary_en: 'Complete blueprint for ATS-safe corporate resumes, UGC/OPSC Academic CVs, and Government service biodata with XYZ bullet formulas, formatting rules, and common ATS traps to avoid.',
    summary_or: 'ATS-ଅନୁକୂଳ ରିଜ୍ୟୁମ୍, UGC/OPSC ଏକାଡେମିକ୍ CV ଏବଂ ସରକାରୀ ବାୟୋଡାଟା ଗାଇଡ୍: ସଠିକ୍ ଫର୍ମାଟ୍, କୀ-ୱାର୍ଡ ରଣନୀତି ଏବଂ ସାଧାରଣ ତ୍ରୁଟି ନିବାରଣ ଚେକ୍-ଲିଷ୍ଟ।',
    body_html: '<h3>Three Distinct Formats — Never Mix Them</h3><ul><li><strong>Corporate ATS Resume (1–2 Pages):</strong> Single-column, zero photos/charts, tailored keywords, quantified bullets.</li><li><strong>Academic / Faculty CV:</strong> Unlimited pages covering Teaching Experience, UGC-CARE/Scopus publications, Ph.D. guidance, and Conferences.</li><li><strong>Govt Interview / OPSC Biodata:</strong> Strictly factual chronological record matching your DAF and original certificates.</li></ul>',
    body_or: '<h3>ତିନୋଟି ଭିନ୍ନ ଫର୍ମାଟ୍ — କେବେ ମିଶାନ୍ତୁ ନାହିଁ</h3><p>କର୍ପୋରେଟ୍ ଚାକିରି ପାଇଁ <strong>୧-୨ ପୃଷ୍ଠାର ATS ରିଜ୍ୟୁମ୍</strong>, ଅଧ୍ୟାପକ/ଗବେଷକ ପାଇଁ <strong>ଏକାଡେମିକ୍ CV</strong> ଏବଂ ସରକାରୀ ସାକ୍ଷାତକାର ପାଇଁ <strong>ତଥ୍ୟ-ଆଧାରିତ ବାୟୋଡାଟା</strong> ପୃଥକ ଭାବେ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।</p>',
    tags: ['ATS Resume', 'Academic CV', 'Biodata', 'Career Readiness']
  },
  {
    id: 'ji-cd-oas-daf',
    folderKey: 'interview and selection preparation',
    fallbackFolder: 'jf-cd-oas-daf-prep',
    slug: 'opsc-oas-personality-test-daf-kit',
    title: 'OPSC & UPSC Personality Test (Interview Board) & Detailed Application Form (DAF) Preparation Handbook (Odisha State Profile, Home District & Hobby Questions)',
    title_or: 'OPSC ଓ UPSC ପର୍ସନାଲିଟି ଟେଷ୍ଟ (ସାକ୍ଷାତକାର) ଏବଂ DAF ପ୍ରସ୍ତୁତି ହ୍ୟାଣ୍ଡବୁକ୍ (ଓଡ଼ିଶା ପ୍ରୋଫାଇଲ୍, ଜିଲ୍ଲା ଓ ହବି ପ୍ରଶ୍ନ)',
    conducting_body: 'Odisha Public Service Commission (OPSC) & UPSC Interview Boards',
    exam_code: 'OPSC-UPSC-DAF-VIVA',
    cadre_group: 'OPSC OAS/OFS/OPS & UPSC CSE Mains-Qualified Candidates (Group A/B Gazetted)',
    pay_matrix: 'OPSC OCS Personality Test: 250 Marks | UPSC CSE Personality Test: 275 Marks',
    age_limit_relaxation: 'For all Mains-qualified candidates preparing DAF / Attestation Forms',
    qualification_odia_rule: 'Deep familiarity with Odisha geography, 30 districts, GI tags, flagship Odisha welfare schemes, Odia literature/heritage, and Home District socio-economic indicators',
    selection_stages: '1. Audit Every Line of Your DAF (DOB, Birthplace, Schooling, Graduation Subject, Work Experience, Hobbies, Service Preferences) -> 2. Build 150-Question Personal DAF Bank -> 3. Home District & Odisha Economy Dossier -> 4. 3–5 Timed Mock Boards -> 5. Final Board Day Composure',
    pst_pet_skill_norms: 'Evaluation Rubric: Mental alertness, balance of judgement, integrity, administrative empathy, ability to say "Sorry Sir/Ma’am, I do not know" honestly without bluffing.',
    documents_checklist: '1. Signed DAF / Attestation Form Copies (2–3 sets)\n2. Original HSC, +2, Degree, Caste/SEBC/EWS & Disability Certificates\n3. Experience / NOC (if employed in Govt/PSU)\n4. One-Page Home District & Odisha Current Affairs Brief',
    application_steps: '1. Map every keyword in your DAF (name meaning, hometown history, college, optional subject, hobby) to probable cross-questions.\n2. Prepare balanced views on Odisha development (mining, cyclones/OSDMA, agriculture, tribal welfare, industrial corridor).\n3. Practice crisp 30–45 second answers.',
    official_portal_url: 'https://www.opsc.gov.in/',
    summary_en: 'Exhaustive OPSC OAS & UPSC Personality Test (250/275 marks) and DAF prep handbook covering Odisha district profiles, GI tags, flagship schemes, hobby defence, and ethical board scenarios.',
    summary_or: 'OPSC OAS ଓ UPSC ପର୍ସନାଲିଟି ଟେଷ୍ଟ (୨୫୦/୨୭୫ ମାର୍କ) ଏବଂ DAF ପ୍ରସ୍ତୁତି ଗାଇଡ୍: ନିଜ ଜିଲ୍ଲାର ପ୍ରୋଫାଇଲ୍, ଓଡ଼ିଶା ଯୋଜନା, ହବି ପ୍ରଶ୍ନ ଏବଂ ସାକ୍ଷାତକାର ବୋର୍ଡ ରଣନୀତି।',
    body_html: '<h3>Decoding the OPSC / UPSC Personality Test</h3><p>The Personality Test is not a second knowledge exam—it evaluates administrative suitability, integrity, and composure. Every word in your <strong>DAF (Detailed Application Form)</strong>—from your birthplace and graduation stream to your hobbies and service preference—becomes a direct prompt for the board.</p>',
    body_or: '<h3>OPSC / UPSC ସାକ୍ଷାତକାର ବୋର୍ଡର ମୂଳ ମନ୍ତ୍ର</h3><p>ପର୍ସନାଲିଟି ଟେଷ୍ଟରେ ଆପଣଙ୍କ ଜ୍ଞାନ ନୁହେଁ ବରଂ ପ୍ରଶାସନିକ ଦକ୍ଷତା, ସଚ୍ଚୋଟତା, ସନ୍ତୁଳିତ ବିଚାର ଏବଂ DAF ତଥ୍ୟ ଉପରେ ସ୍ପଷ୍ଟତା ପରୀକ୍ଷା କରାଯାଏ।</p>',
    tags: ['OPSC OAS Viva', 'UPSC DAF', 'Personality Test', 'Odisha District Profile']
  },
  {
    id: 'ji-cd-teaching-demo-api',
    folderKey: 'interview and selection preparation',
    fallbackFolder: 'jf-cd-opsc-viva',
    slug: 'teaching-demo-class-micro-teaching-and-academic-api-guide',
    title: 'Teaching Demo Class, Micro-Teaching & Academic API / Research Proposal Portfolio Guide (for OPSC Assistant Professor, OES, OAVS & College Interviews)',
    title_or: 'ଶିକ୍ଷକ ଡେମୋ କ୍ଲାସ୍, ମାଇକ୍ରୋ-ଟିଚିଂ ଏବଂ ଏକାଡେମିକ୍ API / ଗବେଷଣା ପ୍ରସ୍ତାବ ଗାଇଡ୍ (OPSC Asst Prof, OES, OAVS)',
    conducting_body: 'OPSC (Asst Professor / OES), SSB Odisha (Lecturers), OAVS & Kendriya/Navodaya Vidyalayas',
    exam_code: 'TEACH-DEMO-API-2026',
    cadre_group: 'OPSC Assistant Professor, SSB Lecturer, OES, OAVS/KVS/NVS PGT/TGT & Private College Faculty',
    pay_matrix: 'Academic Pay Level 10 (₹57,700+) for Asst Prof / Level 7–8 (₹44,900–₹47,600) for OAVS/OES/PGT',
    age_limit_relaxation: 'As per OPSC/SSB/OAVS recruitment rules',
    qualification_odia_rule: 'NEP 2020 pedagogy alignment; for OAVS/OES/SSB Odisha, clear bilingual communication and Odia language compliance (ME/HSC Standard) where notified',
    selection_stages: '1. 5–10 Minute Demo Lesson Plan (Hook -> Core Concept -> Board Work -> Real-Life Example -> Recap) -> 2. Subject Depth Viva -> 3. UGC API / Research Proposal & Publications Review -> 4. Classroom Management Scenarios',
    pst_pet_skill_norms: 'Demo Class Rubric: Voice modulation, blackboard/whiteboard organization, student engagement (asking diagnostic questions), zero reading from slides/notes, and exact time management.',
    documents_checklist: '1. UGC API Score Sheet & Bound Copies of Best Research Papers (for Asst Prof)\n2. 1-Page Research Proposal (Next 3 Years Plan)\n3. 2 Prepared Demo Lesson Plans (1 Basic + 1 Advanced Topic)\n4. Ph.D./NET/SET/OSSTET/OTET Certificates',
    application_steps: '1. Prepare two 7-minute blackboard demo topics without PowerPoint dependency.\n2. Align teaching examples with NEP 2020 experiential learning.\n3. For OPSC Asst Prof, organize UGC-CARE/Scopus publications chronologically with ISSN/DOI proofs.',
    official_portal_url: 'https://www.opsc.gov.in/',
    summary_en: 'Step-by-step teaching demo class, micro-teaching, UGC API score, and research proposal guide for OPSC Assistant Professor, SSB Odisha Lecturer, OES, and OAVS/KVS interviews.',
    summary_or: 'ଶିକ୍ଷକ ଡେମୋ କ୍ଲାସ୍, ମାଇକ୍ରୋ-ଟିଚିଂ ଏବଂ ଏକାଡେମିକ୍ API ଗାଇଡ୍: OPSC ଆସିଷ୍ଟାଣ୍ଟ ପ୍ରଫେସର, SSB ଓଡ଼ିଶା ଅଧ୍ୟାପକ, OES ଏବଂ OAVS ସାକ୍ଷାତକାର ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ପ୍ରସ୍ତୁତି।',
    body_html: '<h3>7-Minute High-Impact Demo Class Framework</h3><p>Whether facing an <strong>OPSC Assistant Professor</strong>, <strong>SSB Odisha</strong>, or <strong>OAVS/KVS</strong> panel, structure your 7-minute demo as: 1 min Concept Hook, 4 min Structured Blackboard Explanation with Diagram, 1 min Odisha/Real-World Application, and 1 min Quick Assessment Question.</p>',
    body_or: '<h3>୭-ମିନିଟ୍ ପ୍ରଭାବଶାଳୀ ଡେମୋ କ୍ଲାସ୍ ରଣନୀତି</h3><p>ବ୍ଲାକବୋର୍ଡ ବ୍ୟବହାର, ସ୍ପଷ୍ଟ ସ୍ୱର, ଛାତ୍ରଛାତ୍ରୀଙ୍କ ସହ ଯୋଗାଯୋଗ ଏବଂ NEP 2020 ଆଧାରିତ ଉଦାହରଣ ସହିତ ଡେମୋ କ୍ଲାସ୍ ପ୍ରଦର୍ଶନ କରନ୍ତୁ।</p>',
    tags: ['Teaching Demo', 'OPSC Assistant Professor', 'SSB Odisha', 'OAVS Interview']
  },
  {
    id: 'ji-cd-ncs-employment-exchange',
    folderKey: 'career guidance services',
    fallbackFolder: 'jf-cd-govt-internships',
    slug: 'ncs-and-odisha-employment-exchange-empmission-guide',
    title: 'National Career Service (NCS — ncs.gov.in) & Odisha State Employment Exchange (empmissionodisha.gov.in) Registration, Renewal & Job Fair Guide',
    title_or: 'ନ୍ୟାସନାଲ୍ କ୍ୟାରିଅର୍ ସର୍ଭିସ୍ (NCS) ଏବଂ ଓଡ଼ିଶା ରାଜ୍ୟ ନିୟୋଜନ ପୋର୍ଟାଲ୍ (empmissionodisha.gov.in) ପଞ୍ଜୀକରଣ ଓ ନିଯୁକ୍ତି ମେଳା ଗାଇଡ୍',
    conducting_body: 'Ministry of Labour & Employment (NCS) & Directorate of Employment, Odisha (OSDA)',
    exam_code: 'NCS-EMPMISSION-ODISHA',
    cadre_group: 'All Job Seekers in Odisha (10th, +2, ITI, Diploma, Graduate, PG & Skilled Youth)',
    pay_matrix: '100% Free Government Registration, Career Counselling & District Job Fair (Niyukti Mela) Access',
    age_limit_relaxation: '14+ years (for Employment Exchange / NCS registration); valid across all 30 Odisha districts',
    qualification_odia_rule: 'Many Odisha Govt / District / Contractual & PSU recruitments require an active Employment Exchange Registration Card (issued via empmissionodisha.gov.in / District Employment Exchange)',
    selection_stages: '1. Online Aadhaar Registration on empmissionodisha.gov.in & ncs.gov.in -> 2. Upload Educational & Caste/Resident Certificates -> 3. Receive Registration Card (X-10B) -> 4. Periodic Renewal (Every 3 Years) -> 5. Attend District Niyukti Mela / NCS Virtual Job Fairs',
    pst_pet_skill_norms: 'Warning: Never miss your 3-year Employment Exchange renewal window; add new higher qualifications immediately so your seniority/eligibility stays updated.',
    documents_checklist: '1. Aadhaar Card & Passport Photo\n2. HSC, +2, ITI/Diploma/Degree Marksheets & Certificates\n3. Odisha Resident & Caste Certificate (if applicable)\n4. Active Mobile Number & Email ID',
    application_steps: '1. Register at empmissionodisha.gov.in (Odisha Employment Mission) and download your Employment Registration Card.\n2. Create your free Jobseeker profile on ncs.gov.in for pan-India verified private/PSU job alerts.\n3. Track District Model Career Centre (MCC) job fairs.',
    official_portal_url: 'https://www.ncs.gov.in/',
    summary_en: 'Complete Odisha guide to National Career Service (ncs.gov.in) and Odisha State Employment Exchange (empmissionodisha.gov.in): free registration, 3-year renewal, and District Niyukti Melas.',
    summary_or: 'NCS (ncs.gov.in) ଏବଂ ଓଡ଼ିଶା ରାଜ୍ୟ ନିୟୋଜନ ପୋର୍ଟାଲ୍ (empmissionodisha.gov.in): ମାଗଣା ପଞ୍ଜୀକରଣ, ୩-ବର୍ଷିଆ ନବୀକରଣ ଏବଂ ଜିଲ୍ଲା ନିଯୁକ୍ତି ମେଳା ସୂଚନା।',
    body_html: '<h3>Two Essential Free Government Job Portals</h3><p>Every Odisha job seeker should maintain active profiles on both <strong>empmissionodisha.gov.in</strong> (for mandatory Odisha Employment Exchange registration cards required in district/PSU recruitments) and <strong>ncs.gov.in</strong> (for National Career Service verified vacancies and Model Career Centres).</p>',
    body_or: '<h3>ଦୁଇଟି ଜରୁରୀ ସରକାରୀ ନିଯୁକ୍ତି ପୋର୍ଟାଲ୍</h3><p>ଓଡ଼ିଶାର ପ୍ରତ୍ୟେକ ଚାକିରି ଆଶାୟୀ <strong>empmissionodisha.gov.in</strong> ରେ ନିୟୋଜନ କାର୍ଡ ପଞ୍ଜୀକରଣ ଏବଂ <strong>ncs.gov.in</strong> ରେ ଜାତୀୟ ନିଯୁକ୍ତି ପୋର୍ଟାଲ୍ ପ୍ରୋଫାଇଲ୍ ରଖିବା ଉଚିତ।</p>',
    tags: ['NCS Portal', 'Odisha Employment Exchange', 'EmpMission Odisha', 'Niyukti Mela']
  },
  {
    id: 'ji-cd-naps-nats-apprenticeship',
    folderKey: 'technical and industry skills',
    fallbackFolder: 'jf-cd-govt-internships',
    slug: 'naps-and-nats-apprenticeship-stipend-and-training-guide',
    title: 'National Apprenticeship Promotion Scheme (NAPS — apprenticeshipindia.gov.in) & NATS (nats.education.gov.in — BOPT Eastern Region) Stipend & Industry Training Guide',
    title_or: 'NAPS (apprenticeshipindia.gov.in) ଏବଂ NATS (nats.education.gov.in — BOPT ପୂର୍ବାଞ୍ଚଳ) ଆପ୍ରେଣ୍ଟିସଶିପ୍ ଷ୍ଟାଇପେଣ୍ଡ ଓ ଶିଳ୍ପ ତାଲିମ ଗାଇଡ୍',
    conducting_body: 'MSDE (NAPS) & Ministry of Education / BOPT Eastern Region Kolkata (NATS)',
    exam_code: 'NAPS-NATS-STIPEND',
    cadre_group: 'ITI / 10th-12th (NAPS) & Engineering Diploma / B.Tech / General Graduates (NATS)',
    pay_matrix: 'NAPS: ₹7,000–₹9,000+/mo (incl. ₹1,500 DBT Central Share) | NATS: Diploma ₹8,000+/mo, Graduate/B.Tech ₹9,000+/mo (NALCO, SAIL, HAL, OMC, OPTCL, Indian Railways)',
    age_limit_relaxation: 'NAPS: 14+ yrs | NATS: Within 3–5 years of passing Diploma/Degree; never previously undergone NATS training',
    qualification_odia_rule: 'NAPS for ITI/Non-ITI trades (Fitter, Electrician, Welder, COPA); NATS for SCTE&VT Diploma, B.Tech, and B.A./B.Sc./B.Com graduates',
    selection_stages: '1. Register on apprenticeshipindia.gov.in (NAPS) or nats.education.gov.in (NATS) -> 2. Complete e-KYC & Profile Verification -> 3. Apply to Odisha PSUs/Industries (NALCO, SAIL RSP, HAL Sunabeda, Paradip Port, Tata Steel) -> 4. Sign Apprenticeship Contract -> 5. 1-Year Paid Training + NAC/CoP Certificate',
    pst_pet_skill_norms: 'Bonus Benefit: Completing 1-year Railway/PSU Apprenticeship under NAPS/NATS grants dedicated quota/relaxation (e.g., 20% Railway Level-1 CCAA quota) and real industrial experience.',
    documents_checklist: '1. Aadhaar Card (NPCI Bank Seeded for NAPS-2 DBT)\n2. ITI / Diploma / Degree Provisional Certificate & Marksheets\n3. Active Bank Passbook & Passport Photo\n4. Caste / PwD Certificate (where applicable)',
    application_steps: '1. ITI/10th/12th youth register on apprenticeshipindia.gov.in.\n2. Diploma/B.Tech/Graduates register on nats.education.gov.in (under BOPT Eastern Region for Odisha).\n3. Apply directly to NALCO, SAIL Rourkela, HAL Koraput, MCL, OPTCL, and Tata Steel notifications.',
    official_portal_url: 'https://www.apprenticeshipindia.gov.in/',
    summary_en: 'Complete Odisha NAPS and NATS (BOPT Eastern Region) apprenticeship guide covering ₹7,000–₹9,000+ monthly stipends, DBT rules, and PSU openings at NALCO, SAIL RSP, HAL, and Railways.',
    summary_or: 'NAPS ଓ NATS (BOPT ପୂର୍ବାଞ୍ଚଳ) ଆପ୍ରେଣ୍ଟିସଶିପ୍ ଗାଇଡ୍: ମାସିକ ₹୭,୦୦୦–₹୯,୦୦୦+ ଷ୍ଟାଇପେଣ୍ଡ, DBT ନିୟମ ଏବଂ NALCO, SAIL ରାଉରକେଲା, HAL ଓ ରେଳବାଇ ତାଲିମ ସୂଚନା।',
    body_html: '<h3>Earn While You Learn in Odisha’s Premier PSUs</h3><p><strong>NAPS</strong> (for ITI &amp; school-pass trades) and <strong>NATS</strong> (for Diploma, B.Tech &amp; Graduates under BOPT Eastern Region) offer 1-year paid industrial training at NALCO, SAIL Rourkela, HAL Sunabeda, Paradip Port, MCL, and Indian Railways—plus valuable CCAA recruitment advantages.</p>',
    body_or: '<h3>ଓଡ଼ିଶାର ପ୍ରମୁଖ PSU ରେ ବେତନଭୋଗୀ ଶିଳ୍ପ ତାଲିମ</h3><p>NAPS (ITI) ଏବଂ NATS (ଡିପ୍ଲୋମା/B.Tech/ସ୍ନାତକ) ମାଧ୍ୟମରେ NALCO, SAIL ରାଉରକେଲା, HAL, MCL ଏବଂ ରେଳବାଇରେ ୧ ବର୍ଷିଆ ଷ୍ଟାଇପେଣ୍ଡଭିତ୍ତିକ ତାଲିମ ମିଳିଥାଏ।</p>',
    tags: ['NAPS', 'NATS', 'Apprenticeship Odisha', 'NALCO SAIL Apprentice']
  },
  {
    id: 'ji-cd-wsc-ddugky-pmkvy',
    folderKey: 'technical and industry skills',
    fallbackFolder: 'jf-cd-skills-internships',
    slug: 'world-skill-center-ddugky-pmkvy-odisha-skill-programs',
    title: 'World Skill Center (Bhubaneswar), DDU-GKY & PMKVY 4.0 — Free Residential Skill Training & Placement Programs in Odisha',
    title_or: 'ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର (ଭୁବନେଶ୍ୱର), DDU-GKY ଏବଂ PMKVY 4.0 — ଓଡ଼ିଶାରେ ମାଗଣା ଆବାସିକ ଦକ୍ଷତା ତାଲିମ ଓ ନିଯୁକ୍ତି ଗାଇଡ୍',
    conducting_body: 'Odisha Skill Development Authority (OSDA), ORMAS (DDU-GKY) & NSDC (PMKVY 4.0)',
    exam_code: 'OSDA-WSC-DDUGKY-PMKVY',
    cadre_group: 'Odisha Youth (18–35 yrs) — ITI/Diploma/10th/12th/Rural Youth',
    pay_matrix: '100% Free Govt-Sponsored Training (DDU-GKY includes Free Hostel, Food, Uniform & Placement Support)',
    age_limit_relaxation: 'WSC: ITI/Diploma passouts (18–26 yrs) | DDU-GKY: Rural youth (15–35 yrs, up to 45 for Women/PwD/PVTG)',
    qualification_odia_rule: 'Odisha Resident; WSC requires ITI/Diploma for advanced finishing tracks (Mechatronics, Precision Engg, Cloud, Vertical Transport); DDU-GKY targets rural BPL/MGNREGA/SHG households',
    selection_stages: '1. Online Registration (worldskillcenter.org / kaushalpanjee.nic.in / skillindiadigital.gov.in) -> 2. District Counselling & Aptitude Check -> 3. Enrolment & NSQF Assessment -> 4. Placement Drive & Post-Placement Tracking',
    pst_pet_skill_norms: 'Verify that any DDU-GKY or PMKVY training centre displays an official OSDA / NSDC Centre ID; never pay fees for government-sponsored free residential courses.',
    documents_checklist: '1. Aadhaar Card & Odisha Resident Certificate\n2. Educational Marksheet (8th/10th/12th/ITI/Diploma)\n3. Ration Card / BPL / MGNREGA / SHG Proof (for DDU-GKY)\n4. Bank Passbook & Passport Photos',
    application_steps: '1. Apply for World Skill Center Bhubaneswar advanced tracks at worldskillcenter.org.\n2. Rural youth can register on kaushalpanjee.nic.in or contact Block/ORMAS Mission Shakti coordinator for free DDU-GKY residential training.\n3. Explore PMKVY 4.0 short courses on skillindiadigital.gov.in.',
    official_portal_url: 'https://www.worldskillcenter.org/',
    summary_en: 'Complete Odisha free skill training guide covering World Skill Center Bhubaneswar, DDU-GKY free residential rural youth training (ORMAS), and PMKVY 4.0 Skill India Digital courses.',
    summary_or: 'ଓଡ଼ିଶାରେ ମାଗଣା ଦକ୍ଷତା ତାଲିମ: ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଭୁବନେଶ୍ୱର, DDU-GKY ମାଗଣା ଆବାସିକ ତାଲିମ (ORMAS) ଏବଂ PMKVY 4.0 ସ୍କିଲ୍ ଇଣ୍ଡିଆ ଡିଜିଟାଲ୍ ପାଠ୍ୟକ୍ରମର ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Free Govt-Funded Skill & Placement Ecosystems in Odisha</h3><ul><li><strong>World Skill Center (Mancheswar, Bhubaneswar):</strong> OSDA + ITE Singapore finishing school for ITI/Diploma youth.</li><li><strong>DDU-GKY (ORMAS Odisha):</strong> 100% free residential training + uniform + placement for rural youth.</li><li><strong>PMKVY 4.0:</strong> Short-term NSQF-certified upskilling via Skill India Digital Hub.</li></ul>',
    body_or: '<h3>ଓଡ଼ିଶାରେ ମାଗଣା ଦକ୍ଷତା ତାଲିମ ଓ ନିଯୁକ୍ତି</h3><p>ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଭୁବନେଶ୍ୱର, ଗ୍ରାମୀଣ ଯୁବକଙ୍କ ପାଇଁ DDU-GKY ମାଗଣା ଆବାସିକ ତାଲିମ ଏବଂ PMKVY 4.0 ମାଧ୍ୟମରେ NSQF ପ୍ରମାଣପତ୍ର ଓ ନିଯୁକ୍ତି ସୁଯୋଗ ଉପଲବ୍ଧ।</p>',
    tags: ['World Skill Center', 'DDU-GKY Odisha', 'PMKVY 4.0', 'OSDA']
  },
  {
    id: 'ji-cd-startup-odisha-msme',
    folderKey: 'entrepreneurship and business support',
    fallbackFolder: 'jf-cd-skills-internships',
    slug: 'startup-odisha-ohub-msme-udyam-and-incubation-guide',
    title: 'Startup Odisha (O-Hub Bhubaneswar), MSME Udyam Registration & Student Entrepreneurship / Incubation Readiness Guide',
    title_or: 'ଷ୍ଟାର୍ଟଅପ୍ ଓଡ଼ିଶା (O-Hub ଭୁବନେଶ୍ୱର), MSME ଉଦ୍ୟମ ପଞ୍ଜୀକରଣ ଏବଂ ଛାତ୍ର ଉଦ୍ୟୋଗୀକରଣ / ଇନକ୍ୟୁବେସନ୍ ଗାଇଡ୍',
    conducting_body: 'Startup Odisha (MSME Dept, Govt of Odisha), DPIIT & Ministry of MSME',
    exam_code: 'STARTUP-ODISHA-OHUB',
    cadre_group: 'Student Founders, Tech/Agri/Handloom Startups & Micro/Small Entrepreneurs in Odisha',
    pay_matrix: 'Startup Odisha Monthly Allowance (₹20,000/mo up to 1 yr), Product Dev Grant (up to ₹15L), O-Hub Incubation & PMEGP/Mudra Loans',
    age_limit_relaxation: 'Startup must be incorporated in Odisha (≤10 yrs old, turnover ≤₹100 Cr); Special incentives for Women-led & SC/ST/Transgender founders',
    qualification_odia_rule: 'Recognised entity (Pvt Ltd / LLP / Partnership) with innovative/scalable product; zero-cost Udyam Registration (udyamregistration.gov.in) for all MSMEs',
    selection_stages: '1. Validate Prototype at University Incubator (IIT BBSR, NITR, KIIT TBI, Ravenshaw/Utkal) -> 2. Register on startupodisha.gov.in & DPIIT Startup India -> 3. Apply for Monthly Allowance / Product Dev Grant -> 4. Scale via O-Hub Bhubaneswar',
    pst_pet_skill_norms: 'Anti-Scam Note: MSME Udyam Registration on udyamregistration.gov.in is 100% FREE; never pay private lookalike websites.',
    documents_checklist: '1. Certificate of Incorporation (CIN / LLPIN / Partnership Deed) & PAN\n2. Aadhaar & PAN of Founders (for Free Udyam Registration)\n3. Pitch Deck, Prototype Video & Innovation Brief\n4. Incubation Letter from O-Hub / Recognised Nodal Incubator',
    application_steps: '1. Register your enterprise for free at udyamregistration.gov.in.\n2. Apply for Startup Odisha recognition & seed/product grants at startupodisha.gov.in.\n3. Connect with O-Hub (Bhubaneswar) or nearest DIC (District Industries Centre) for PMEGP/CMEGP subsidies.',
    official_portal_url: 'https://startupodisha.gov.in/',
    summary_en: 'Complete Odisha entrepreneurship guide covering Startup Odisha (O-Hub Bhubaneswar) ₹20k/mo allowance & ₹15L grants, free MSME Udyam registration, and PMEGP/Mudra subsidies.',
    summary_or: 'ଷ୍ଟାର୍ଟଅପ୍ ଓଡ଼ିଶା (O-Hub ଭୁବନେଶ୍ୱର) ଏବଂ MSME ଉଦ୍ୟମ ଗାଇଡ୍: ମାସିକ ₹୨୦,୦୦୦ ସହାୟତା, ₹୧୫ ଲକ୍ଷ ପ୍ରଡକ୍ଟ ଗ୍ରାଣ୍ଟ, ମାଗଣା ଉଦ୍ୟମ ପଞ୍ଜୀକରଣ ଏବଂ PMEGP/ମୁଦ୍ରା ଋଣ ସୂଚନା।',
    body_html: '<h3>Building a Startup or MSME in Odisha</h3><p>Through <strong>Startup Odisha (startupodisha.gov.in)</strong> and the <strong>O-Hub</strong> facility in Bhubaneswar, eligible Odisha startups receive monthly sustenance allowances, up to ₹15 Lakh in product development grants, and incubation at IIT Bhubaneswar, NIT Rourkela, and KIIT TBI.</p>',
    body_or: '<h3>ଓଡ଼ିଶାରେ ଷ୍ଟାର୍ଟଅପ୍ ଓ MSME ଆରମ୍ଭ କରିବାର ସୋପାନ</h3><p>ଷ୍ଟାର୍ଟଅପ୍ ଓଡ଼ିଶା (O-Hub ଭୁବନେଶ୍ୱର) ମାଧ୍ୟମରେ ନୂତନ ଉଦ୍ୟୋଗୀମାନେ ମାସିକ ଭତ୍ତା, ପ୍ରଡକ୍ଟ ଡେଭଲପମେଣ୍ଟ ଅନୁଦାନ ଏବଂ ମାଗଣା ଉଦ୍ୟମ ପଞ୍ଜୀକରଣର ଲାଭ ଉଠାଇପାରିବେ।</p>',
    tags: ['Startup Odisha', 'O-Hub Bhubaneswar', 'MSME Udyam', 'PMEGP']
  },
  {
    id: 'ji-cd-gd-psychometric-psu',
    folderKey: 'interview and selection preparation',
    fallbackFolder: 'jf-cd-opsc-viva',
    slug: 'gd-extempore-psychometric-tests-and-banking-psu-interview-guide',
    title: 'Group Discussion (GD), Extempore, Psychometric Tests & Banking/PSU Interview Mastery (IBPS, SBI, NALCO, SAIL, OMC)',
    title_or: 'ଗ୍ରୁପ୍ ଡିସକସନ୍ (GD), ଏକ୍ସଟେମ୍ପୋର୍, ସାଇକୋମେଟ୍ରିକ୍ ଟେଷ୍ଟ ଏବଂ ବ୍ୟାଙ୍କିଙ୍ଗ୍/PSU ସାକ୍ଷାତକାର (IBPS, SBI, NALCO, SAIL, OMC)',
    conducting_body: 'IBPS, SBI, RBI, GATE-PSU Boards (NALCO, SAIL, NTPC, IOCL) & Odisha PSUs (OMC, OPTCL, OHPC)',
    exam_code: 'GD-PSU-BANK-INTERVIEW',
    cadre_group: 'Bank PO/SO, Management Trainees (GATE PSUs) & Odisha State PSU Technical/Executive Cadres',
    pay_matrix: 'IBPS/SBI PO Interview: 100 Marks (80:20 Mains:Interview Ratio) | PSU GD/GT/PI: 15–25% Final Weightage',
    age_limit_relaxation: 'As per IBPS/SBI/PSU recruitment notifications',
    qualification_odia_rule: 'Banking panels test RBI monetary policy, priority sector lending, and Odisha rural banking; PSU panels test core engineering fundamentals + safety/ESG awareness',
    selection_stages: '1. GD / Group Exercise (10–15 min case/topic discussion) -> 2. Extempore (1-min prep + 2-min speech) -> 3. Psychometric / Situational Judgement Test -> 4. Technical + HR Panel Interview',
    pst_pet_skill_norms: 'GD Golden Rule: Never shout or interrupt; enter constructively 2–3 times using PREP (Point -> Reason -> Example -> Point) and summarize neutrally if possible.',
    documents_checklist: '1. Prelims/Mains/GATE Scorecard & Interview Call Letter\n2. Caste/OBC-NCL/EWS Certificate (Central Format for IBPS/PSUs)\n3. Graduation/B.Tech Marksheets & Project Report\n4. Experience / Relieving / NOC Documents',
    application_steps: '1. Revise RBI repo/CRR/SLR, NPA/Basel norms, and Odisha SHG/MSME credit for Banking interviews.\n2. Revise 3 core B.Tech subjects + final year project for NALCO/SAIL/OMC.\n3. Practice 2-minute extempore speaking daily on current economic & industrial topics.',
    official_portal_url: 'https://www.ibps.in/',
    summary_en: 'Master guide for GD, Extempore, Psychometric Tests, and IBPS/SBI PO & NALCO/SAIL/OMC PSU interviews using PREP speaking frameworks and technical/banking checklists.',
    summary_or: 'GD, ଏକ୍ସଟେମ୍ପୋର୍, ସାଇକୋମେଟ୍ରିକ୍ ଟେଷ୍ଟ ଏବଂ IBPS/SBI PO ଓ NALCO/SAIL/OMC PSU ସାକ୍ଷାତକାର ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Winning GD, Extempore & Banking/PSU Panels</h3><p>In <strong>SBI/IBPS PO</strong> Group Exercises and <strong>NALCO/SAIL/OMC</strong> Management Trainee panels, clarity of thought beats aggression. Use the <strong>PREP framework</strong> (Point, Reason, Example, Point) and stay fluent on both RBI/banking fundamentals and Odisha’s industrial economy.</p>',
    body_or: '<h3>GD ଏବଂ ବ୍ୟାଙ୍କିଙ୍ଗ୍/PSU ସାକ୍ଷାତକାରରେ ସଫଳତାର ସୂତ୍ର</h3><p>ଗ୍ରୁପ୍ ଡିସକସନରେ ଶାନ୍ତ ଓ ତଥ୍ୟ-ଆଧାରିତ ଭାବେ PREP ପଦ୍ଧତିରେ ମତ ରଖନ୍ତୁ ଏବଂ ବ୍ୟାଙ୍କିଙ୍ଗ୍ ଓ କୋର୍ ଇଞ୍ଜିନିୟରିଂ ମୌଳିକ ବିଷୟଗୁଡ଼ିକୁ ଦୃଢ଼ କରନ୍ତୁ।</p>',
    tags: ['Group Discussion', 'IBPS Interview', 'PSU Interview', 'Psychometric Test']
  },
  {
    id: 'ji-cd-digital-portfolio-freelance',
    folderKey: 'digital skills',
    fallbackFolder: 'jf-cd-digital-portfolio',
    slug: 'digital-portfolio-github-linkedin-and-remote-freelance-guide',
    title: 'Digital Portfolio, GitHub, LinkedIn Optimization & Remote / Freelance Work Readiness for Tier-2 & Tier-3 Odisha Graduates',
    title_or: 'ଡିଜିଟାଲ୍ ପୋର୍ଟଫୋଲିଓ, GitHub, LinkedIn ଅପ୍ଟିମାଇଜେସନ୍ ଏବଂ ରିମୋଟ୍ / ଫ୍ରିଲାନ୍ସ କାର୍ଯ୍ୟ ପ୍ରସ୍ତୁତି ଗାଇଡ୍',
    conducting_body: 'CSOdisha Digital Employability Desk / Global Remote & Open-Source Standards',
    exam_code: 'EMP-GITHUB-LINKEDIN-REMOTE',
    cadre_group: 'CS/IT, Design, Content, Data, Digital Marketing & Tier-2/3 Odisha Graduates',
    pay_matrix: 'Remote Tech/Freelance Earnings + GST/PAN Compliance + Verified Client Escrow',
    age_limit_relaxation: '18+ years with valid PAN, Bank Account & verifiable work samples',
    qualification_odia_rule: 'Proof-of-Work beats college tier: 3–4 live GitHub/Behance/writing projects with READMEs, screenshots, and deployed demos outweigh generic certificates',
    selection_stages: '1. Clean LinkedIn Profile (Headline + Banner + Featured Projects) -> 2. Pin 3 Best Repos on GitHub with Architecture READMEs -> 3. Build 1-Page Portfolio Site -> 4. Network & Cold-Outreach with Value Proof -> 5. Use Escrow Platforms / Formal Invoices',
    pst_pet_skill_norms: 'Anti-Scam Note for Freelancers: Never pay "registration/security deposit" fees to get data-entry or typing jobs; genuine clients never charge freelancers upfront.',
    documents_checklist: '1. PAN Card & Savings/Current Bank Account (for legal freelance payouts)\n2. 3 Live Deployed Projects / Case Studies\n3. Standard Freelance Service Agreement & Invoice Template\n4. Verified LinkedIn & GitHub Profiles',
    application_steps: '1. Rewrite your LinkedIn headline as "Role | Core Skills | Value You Deliver" instead of "Student at XYZ".\n2. Host 3 real projects on GitHub Pages / Cloudflare Pages with clear problem-solution READMEs.\n3. Reject any remote/data-entry offer asking for upfront payment.',
    official_portal_url: 'https://www.ncs.gov.in/',
    summary_en: 'Practical digital portfolio, GitHub, LinkedIn, and safe remote/freelancing playbook for Tier-2/3 Odisha graduates focusing on proof-of-work and zero-deposit anti-scam rules.',
    summary_or: 'ଓଡ଼ିଶାର ସ୍ନାତକଙ୍କ ପାଇଁ ଡିଜିଟାଲ୍ ପୋର୍ଟଫୋଲିଓ, GitHub, LinkedIn ଏବଂ ସୁରକ୍ଷିତ ରିମୋଟ୍/ଫ୍ରିଲାନ୍ସିଂ ଗାଇଡ୍: ପ୍ରକୃତ ପ୍ରୋଜେକ୍ଟ ପ୍ରଦର୍ଶନ ଏବଂ ନକଲି ଡାଟା-ଏଣ୍ଟ୍ରି ପ୍ରତାରଣାରୁ ରକ୍ଷା।',
    body_html: '<h3>Proof-of-Work Over College Tier</h3><p>For graduates from Sambalpur, Berhampur, Balasore, Rourkela, or rural Odisha colleges, a well-documented <strong>GitHub / Portfolio</strong> with 3 deployed projects and a crisp <strong>LinkedIn</strong> profile opens national and remote opportunities—provided you avoid upfront-fee data-entry scams.</p>',
    body_or: '<h3>କଲେଜ୍ ନୁହେଁ, ପ୍ରକୃତ କାମର ପ୍ରମାଣ (Proof-of-Work)</h3><p>ତିନୋଟି ଲାଇଭ୍ ପ୍ରୋଜେକ୍ଟ ସହିତ ସଠିକ୍ GitHub ଓ LinkedIn ପ୍ରୋଫାଇଲ୍ ଆପଣଙ୍କୁ ଜାତୀୟ ଓ ରିମୋଟ୍ ନିଯୁକ୍ତିରେ ଆଗରେ ରଖିବ।</p>',
    tags: ['GitHub Portfolio', 'LinkedIn', 'Remote Work', 'Freelancing']
  },
  {
    id: 'ji-cd-workplace-rights-epfo-posh',
    folderKey: 'benefits and employment conditions',
    fallbackFolder: 'jf-cd-skills-internships',
    slug: 'workplace-rights-epfo-esic-offer-letter-and-posh-guide',
    title: 'Workplace Rights, Offer Letter Verification, EPFO / ESIC Social Security & POSH Act Compliance for First-Time Employees',
    title_or: 'କାର୍ଯ୍ୟକ୍ଷେତ୍ର ଅଧିକାର, ଅଫର୍ ଲେଟର୍ ଯାଞ୍ଚ, EPFO / ESIC ସାମାଜିକ ସୁରକ୍ଷା ଏବଂ POSH ଆଇନ ଗାଇଡ୍',
    conducting_body: 'EPFO, ESIC, Ministry of Labour & Employment & Odisha Labour Commissionerate',
    exam_code: 'WORKPLACE-EPFO-ESIC-POSH',
    cadre_group: 'All First-Time Private, Contractual, Outsourced & Corporate Employees in Odisha/India',
    pay_matrix: 'EPF: 12% Employee + 12% Employer Contribution | ESIC: Medical & Cash Benefits (Wage ≤ ₹21,000/mo)',
    age_limit_relaxation: 'All statutory employees from Day 1 of eligible employment',
    qualification_odia_rule: 'Verify employer CIN/GSTIN on MCA portal, demand written Appointment Letter (CTC vs In-Hand split), activate UAN on EPFO Unified Portal, and know Internal Committee (POSH Act, 2013) rights',
    selection_stages: '1. Verify Company CIN on mca.gov.in -> 2. Check CTC vs Take-Home, Probation & Notice Period -> 3. Activate EPFO UAN & Link Aadhaar/Bank -> 4. Download ESIC e-Pehchan Card (if gross ≤ ₹21k) -> 5. Know Grievance Portals (SAMADHAN / EPFiGMS / SHe-Box)',
    pst_pet_skill_norms: 'Red Flags: Employers withholding original certificates, demanding blank signed cheques, or deducting PF from salary without depositing it into your UAN passbook.',
    documents_checklist: '1. Signed Offer & Appointment Letter (Keep copies safe)\n2. EPFO UAN Number & Aadhaar-seeded KYC\n3. ESIC e-Pehchan Card (where applicable)\n4. Monthly Payslips & Form 16',
    application_steps: '1. Verify your UAN passbook monthly at passbook.epfindia.gov.in.\n2. Never surrender original HSC/Degree certificates to private employers.\n3. Report unpaid wages or PF default on EPFiGMS (epfigms.gov.in) or SAMADHAN (samadhan.labour.gov.in).',
    official_portal_url: 'https://www.epfindia.gov.in/',
    summary_en: 'Essential first-job legal & social security guide covering offer letter red flags, CTC vs in-hand pay, EPFO UAN passbook checks, ESIC benefits, and POSH Act workplace protection.',
    summary_or: 'ନୂଆ କର୍ମଚାରୀଙ୍କ ପାଇଁ କାର୍ଯ୍ୟକ୍ଷେତ୍ର ଅଧିକାର ଗାଇଡ୍: ଅଫର୍ ଲେଟର୍ ଯାଞ୍ଚ, EPFO UAN ପାସବୁକ୍, ESIC ସ୍ୱାସ୍ଥ୍ୟ ସୁବିଧା, POSH ଆଇନ ସୁରକ୍ଷା ଏବଂ ଶ୍ରମ ଅଭିଯୋଗ ପୋର୍ଟାଲ୍ ସୂଚନା।',
    body_html: '<h3>Protect Your First Salary & Original Certificates</h3><p>Never hand over original educational certificates to any private company. Always check your <strong>EPFO UAN Passbook</strong> monthly to confirm employer PF deposits, verify ESIC coverage if gross pay is ≤ ₹21,000, and know your rights under the <strong>POSH Act, 2013</strong>.</p>',
    body_or: '<h3>ନିଜର ପ୍ରଥମ ଦରମା ଓ ମୂଳ ପ୍ରମାଣପତ୍ର ସୁରକ୍ଷିତ ରଖନ୍ତୁ</h3><p>କୌଣସି ଘରୋଇ କମ୍ପାନୀକୁ ମୂଳ ଶିକ୍ଷାଗତ ସାର୍ଟିଫିକେଟ୍ ଦିଅନ୍ତୁ ନାହିଁ ଏବଂ ପ୍ରତି ମାସରେ <strong>EPFO UAN</strong> ପାସବୁକ୍ ଯାଞ୍ଚ କରନ୍ତୁ।</p>',
    tags: ['EPFO UAN', 'ESIC', 'POSH Act', 'Workplace Rights']
  },
  {
    id: 'ji-cd-communication-rti-drafting',
    folderKey: 'communication',
    fallbackFolder: 'jf-cd-digital-portfolio',
    slug: 'english-odia-communication-email-rti-and-official-drafting-guide',
    title: 'English & Odia Professional Communication, Email Etiquette, RTI Drafting & Official Correspondence Skills',
    title_or: 'ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ବୃତ୍ତିଗତ ଯୋଗାଯୋଗ, ଇମେଲ୍ ଶିଷ୍ଟାଚାର, RTI ଡ୍ରାଫ୍ଟିଂ ଏବଂ ସରକାରୀ ପତ୍ରାଳାପ ଦକ୍ଷତା',
    conducting_body: 'Odisha Information Commission / DoPT RTI Standards / CSOdisha Communication Desk',
    exam_code: 'EMP-COMM-EMAIL-RTI',
    cadre_group: 'Aspirants, Office Assistants (ASO/Junior Assistant), Managers & Citizens',
    pay_matrix: 'RTI Application Fee: ₹10 (BPL Exempt) via Odisha RTI Portal / Indian Postal Order',
    age_limit_relaxation: 'Open to all students, employees, and citizens of Odisha',
    qualification_odia_rule: 'Official correspondence in Odisha Govt offices uses both English and Odia (Official Language Act); RTI requests under RTI Act 2005 must be specific, numbered, and free of hypothetical "Why" questions',
    selection_stages: '1. Professional Email Structure (Clear Subject -> Context -> Action Item -> Polite Sign-off) -> 2. Official Govt Letter / Office Note Format -> 3. RTI Section 6(1) Drafting -> 4. First Appeal u/s 19(1) after 30 Days',
    pst_pet_skill_norms: 'Email Mistake to Avoid: Sending blank emails with only an attachment, using "Urgent!!" in subject lines, or writing wall-of-text paragraphs without bullet points.',
    documents_checklist: '1. Formal Job/Internship Cold Email Template\n2. Official Leave / NOC / Document Request Format\n3. RTI Section 6(1) Application Template (English & Odia)\n4. ₹10 Court Fee Stamp / IPO / Online Fee Receipt',
    application_steps: '1. Structure every work email with a specific subject line ("Application for [Role] — [Name] — [Roll/Exp]").\n2. File state RTI queries online via rtionline.odisha.gov.in or central queries at rtionline.gov.in.\n3. Keep RTI questions strictly factual (records, dates, copies, marks).',
    official_portal_url: 'https://rtionline.odisha.gov.in/',
    summary_en: 'Practical English & Odia professional communication guide covering crisp workplace email etiquette, official Odisha government note/letter formats, and RTI Act 2005 drafting.',
    summary_or: 'ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ବୃତ୍ତିଗତ ଯୋଗାଯୋଗ ଗାଇଡ୍: ପ୍ରଫେସନାଲ୍ ଇମେଲ୍ ଲେଖିବା ଶୈଳୀ, ସରକାରୀ ପତ୍ରାଳାପ ଫର୍ମାଟ୍ ଏବଂ ଓଡ଼ିଶା RTI ପୋର୍ଟାଲ୍ (rtionline.odisha.gov.in) ଡ୍ରାଫ୍ଟିଂ।',
    body_html: '<h3>Crisp Communication & Citizen RTI Drafting</h3><p>Strong written communication separates top candidates in ASO, OAS, and corporate roles. Learn crisp 3-paragraph email etiquette, formal Odisha government letter formats, and factual <strong>RTI Section 6(1)</strong> drafting on <strong>rtionline.odisha.gov.in</strong>.</p>',
    body_or: '<h3>ସ୍ପଷ୍ଟ ପତ୍ରାଳାପ ଏବଂ RTI ଆବେଦନ କୌଶଳ</h3><p>ସଠିକ୍ ଇମେଲ୍ ଶିଷ୍ଟାଚାର, ସରକାରୀ ଚିଠି ଲେଖିବା ଶୈଳୀ ଏବଂ rtionline.odisha.gov.in ମାଧ୍ୟମରେ ତଥ୍ୟ-ଆଧାରିତ RTI ଆବେଦନ ପ୍ରସ୍ତୁତି ଶିଖନ୍ତୁ।</p>',
    tags: ['Email Etiquette', 'Odia Official Drafting', 'RTI Odisha', 'Communication']
  },
  {
    id: 'ji-cd-career-transition-gap-year',
    folderKey: 'career progression',
    fallbackFolder: 'jf-cd-resume-interview',
    slug: 'career-transition-gap-year-justification-and-upskilling-roadmap',
    title: 'Career Transition, Gap-Year Justification & Mid-Career Upskilling Roadmap (Switching from Private to Govt/Teaching or Core to Tech)',
    title_or: 'କ୍ୟାରିଅର୍ ପରିବର୍ତ୍ତନ, ଗ୍ୟାପ୍-ଇୟର୍ ସମାଧାନ ଏବଂ ମଧ୍ୟ-କ୍ୟାରିଅର୍ ଦକ୍ଷତା ବିକାଶ ରୋଡମ୍ୟାପ୍',
    conducting_body: 'CSOdisha Career Transition Desk / SWAYAM-NPTEL & IGNOU/OSOU Flexible Pathways',
    exam_code: 'EMP-TRANSITION-UPSKILL',
    cadre_group: 'UPSC/OPSC Aspirants Returning to Jobs, Core Engineers Moving to IT/Data, Private Employees Moving to Govt/Teaching',
    pay_matrix: 'Zero/Low-Cost Upskilling via SWAYAM-NPTEL, Skill India Digital, OSOU/IGNOU & Open-Source Certifications',
    age_limit_relaxation: 'Odisha Govt age relaxations (SEBC/SC/ST/Women/PwD/Ex-Servicemen) + In-service contractual weightage where applicable',
    qualification_odia_rule: 'Gap years spent in OPSC/UPSC/GATE preparation are respected when backed by honest framing, clear mains/interview milestones, or concurrent upskilling/freelance projects',
    selection_stages: '1. Audit Transferable Skills -> 2. Bridge 2–3 Year Gap With Verifiable Mini-Projects / Certifications (SWAYAM/NPTEL) -> 3. Craft Honest 30-Second Gap Narrative -> 4. Target Bridge Roles (Analyst, Technical Writer, EdTech, State PSU) -> 5. Execute 90-Day Transition Plan',
    pst_pet_skill_norms: 'Never fabricate fake experience certificates to hide a competitive exam gap—background verification (BGV) failures lead to permanent blacklisting.',
    documents_checklist: '1. Mains/Interview Admit Cards or Scorecards (if referencing exam prep)\n2. Recent SWAYAM-NPTEL / Skill Certification Proof\n3. 2–3 Fresh Portfolio Projects showing current readiness\n4. Relieving / Experience Letters from prior roles',
    application_steps: '1. Never fake employment to cover an exam gap; pair honest framing with a recent 8–12 week verified project/certification.\n2. Core-to-Tech switchers: combine domain knowledge (e.g., Electrical/Mechanical) with Python, SQL, or Power BI.\n3. Private-to-Teaching switchers: complete B.Ed./UGC-NET/OSSTET via recognised mode.',
    official_portal_url: 'https://swayam.gov.in/',
    summary_en: 'Honest, practical roadmap for OPSC/UPSC gap-year justification, core-to-tech transitions, and private-to-govt/teaching switches using SWAYAM-NPTEL and transferable skills.',
    summary_or: 'କ୍ୟାରିଅର୍ ପରିବର୍ତ୍ତନ ଓ ଗ୍ୟାପ୍-ଇୟର୍ ରୋଡମ୍ୟାପ୍: OPSC/UPSC ପ୍ରସ୍ତୁତି ଗ୍ୟାପ୍-ଇୟର୍ ସମାଧାନ, କୋର୍ ରୁ IT ପରିବର୍ତ୍ତନ ଏବଂ SWAYAM-NPTEL ଦକ୍ଷତା ବିକାଶର ସଠିକ୍ ମାର୍ଗଦର୍ଶିକା।',
    body_html: '<h3>Turning Exam Gaps & Career Pivots Into Strengths</h3><p>Thousands of Odisha graduates invest 2–4 years in OPSC/UPSC/Banking preparation before pivoting. Never use fake experience letters—instead, pair honest framing with a fresh 8-week <strong>SWAYAM-NPTEL</strong> certification and 2 demonstrable projects.</p>',
    body_or: '<h3>ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି ଗ୍ୟାପ୍ ଏବଂ କ୍ୟାରିଅର୍ ପରିବର୍ତ୍ତନକୁ ଶକ୍ତିରେ ପରିଣତ କରନ୍ତୁ</h3><p>କେବେବି ନକଲି ଅଭିଜ୍ଞତା ପ୍ରମାଣପତ୍ର ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ; ସଚ୍ଚୋଟ ଉତ୍ତର ସହିତ SWAYAM-NPTEL ପ୍ରମାଣପତ୍ର ଓ ନୂତନ ପ୍ରୋଜେକ୍ଟ ଦ୍ୱାରା ନିଜର ଯୋଗ୍ୟତା ପ୍ରମାଣିତ କରନ୍ତୁ।</p>',
    tags: ['Career Transition', 'Gap Year', 'SWAYAM NPTEL', 'Upskilling']
  }
];

export async function enrichCareerDevelopmentCategory07(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Enrich all depth >= 1 folders in Category #07
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug IN ('career-employability', 'career-development', 'career-development-employability') ORDER BY depth ASC, sort_order ASC, title ASC")
    .all();
  const folders = foldersRes.results || [];
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const folderByTitle = new Map(folders.map((f) => [String(f.title || '').trim().toLowerCase(), f]));

  const folderStmts = [];
  for (const f of folders) {
    if (f.depth === 0) continue;
    if (isCustomAdminEdit(f)) continue;

    const key = String(f.title || '').trim().toLowerCase();
    const parent = f.parent_id ? folderById.get(f.parent_id) : null;
    const spec = CAT07_FOLDER_ENRICHMENTS[key] || buildSmartEmployabilityFolderEnrichment(f, parent ? parent.title : '');

    const needsEn = isShort160(f.description_en) || isShort160(f.description);
    const needsOr = isShort160(f.description_or);
    const needsTitleOr = !String(f.title_or || '').trim();
    const needsBadge = !String(f.featured_badge || f.hero_badge || '').trim();
    const needsSeoTitle = !String(f.seo_title || '').trim();
    const needsSeoDesc = isShort160(f.seo_description);
    const needsVerified = !String(f.verified_at || '').trim();

    if (!needsEn && !needsOr && !needsTitleOr && !needsBadge && !needsSeoTitle && !needsSeoDesc && !needsVerified) {
      continue;
    }

    const nextDescEn = isShort160(f.description_en)
      ? (isShort160(f.description) ? spec.en : f.description)
      : f.description_en;
    const nextDesc = isShort160(f.description) ? nextDescEn : f.description;
    const nextDescOr = needsOr ? spec.or : f.description_or;
    const nextTitleOr = needsTitleOr ? spec.title_or : f.title_or;
    const nextBadge = String(f.featured_badge || f.hero_badge || spec.badge).trim();
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Career Development` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat07-enrich', updated_at = ?
        WHERE id = ?`)
        .bind(
          nextDesc,
          nextDescEn,
          nextDescOr,
          nextTitleOr,
          nextBadge,
          nextBadge,
          nextSeoTitle.slice(0, 160),
          nextSeoDesc,
          nextVerifiedAt,
          ts,
          f.id
        )
    );
  }

  for (let i = 0; i < folderStmts.length; i += 45) {
    await db.batch(folderStmts.slice(i, i + 45));
  }

  // 2. Upsert all 12 Career Development & Employability handbooks
  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug IN ('career-employability', 'career-development', 'career-development-employability')")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map((r) => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map((r) => [r.slug, r]));

  const itemStmts = [];
  for (const item of CAT07_HANDBOOKS) {
    const existing = existingById.get(item.id) || existingBySlug.get(item.slug);
    if (existing && existing.updated_by && !SYSTEM_AUTHORS.has(String(existing.updated_by).toLowerCase())) {
      continue;
    }

    const matchedFolder =
      folderByTitle.get(item.folderKey) ||
      folderById.get(item.fallbackFolder) ||
      folders.find((f) => f.depth >= 1) ||
      null;
    const folderId = matchedFolder ? matchedFolder.id : item.fallbackFolder;
    const bodyHtml = `${item.body_html}${item.body_or || ''}`;
    const seoTitle = `${item.title} | CSOdisha Career Development`.slice(0, 160);
    const seoDesc = item.summary_en.slice(0, 300);

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'employability-guide',
              recruiting_body = ?, conducting_body = ?, exam_code = ?, cadre_group = ?,
              pay_matrix = ?, age_limit_relaxation = ?, qualification_odia_rule = ?,
              selection_stages = ?, pst_pet_skill_norms = ?, documents_checklist = ?,
              application_steps = ?, qualification_tag = ?,
              official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat07-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat07-enrich', updated_at = ?
          WHERE id = ?`)
          .bind(
            folderId, item.title, item.title_or,
            item.conducting_body, item.conducting_body, item.exam_code, item.cadre_group,
            item.pay_matrix, item.age_limit_relaxation, item.qualification_odia_rule,
            item.selection_stages, item.pst_pet_skill_norms, item.documents_checklist,
            item.application_steps, item.cadre_group,
            item.official_portal_url, item.official_portal_url,
            JSON.stringify(item.tags), item.summary_en, bodyHtml,
            seoTitle, seoDesc, ts, ts, existing.id
          )
      );
    } else {
      itemStmts.push(
        db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
          (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, conducting_body,
           exam_code, cadre_group, pay_matrix, age_limit_relaxation, qualification_odia_rule,
           selection_stages, pst_pet_skill_norms, documents_checklist, application_steps,
           qualification_tag, official_apply_url, official_portal_url,
           cover_image_url, cover_image_alt, attachments_json, links_json, tags_json,
           language, status, featured, summary, body_html, seo_title, seo_description,
           verified_by, verified_at, state_location, created_by, updated_by, created_at, updated_at)
          VALUES (?, 'career-employability', ?, ?, ?, ?, 'employability-guide', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat07-enrich@csodisha.com', ?, 'Odisha', 'cat07-enrich', 'cat07-enrich', ?, ?)`)
          .bind(
            item.id, folderId, item.title, item.title_or, item.slug,
            item.conducting_body, item.conducting_body, item.exam_code, item.cadre_group,
            item.pay_matrix, item.age_limit_relaxation, item.qualification_odia_rule,
            item.selection_stages, item.pst_pet_skill_norms, item.documents_checklist,
            item.application_steps, item.cadre_group,
            item.official_portal_url, item.official_portal_url,
            JSON.stringify(item.tags), item.summary_en, bodyHtml,
            seoTitle, seoDesc, ts, ts, ts
          )
      );
    }
  }

  for (let i = 0; i < itemStmts.length; i += 30) {
    await db.batch(itemStmts.slice(i, i + 30));
  }

  return { foldersUpdated: folderStmts.length, itemsUpserted: itemStmts.length };
}
