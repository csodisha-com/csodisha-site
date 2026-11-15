// Category #04 (v71): Exhaustive Minute Bilingual Enrichment of Courses, Entrance Exams & Certifications (35 Subcategories + 14 Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', 'cat03-enrich', 'cat04-enrich', '']);

function isShort160(val) {
  return String(val || '').trim().length < 160;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isShort160(row?.description_en || row?.description) && !isShort160(row?.description_or);
}

// Tailored >=160-char bilingual metadata for Category #04 folders
const CAT04_FOLDER_ENRICHMENTS = {
  'courses, degrees and educational pathways': {
    title_or: 'ପାଠ୍ୟକ୍ରମ, ଡିଗ୍ରୀ ଏବଂ ଶିକ୍ଷାଗତ ପଥ',
    badge: 'DEGREES & COURSES',
    en: 'Comprehensive Odisha and National higher education guide covering +2 SAMS streams, 3-yr/4-yr NEP Undergraduate degrees, Postgraduate programmes, SCTE&VT Polytechnic Diplomas, NCVT/SCVT ITI trades, CA/CMA/CS/LL.B. professional tracks, and IGNOU/OSOU open learning.',
    or: 'ପାଠ୍ୟକ୍ରମ ଓ ଡିଗ୍ରୀ ମାର୍ଗଦର୍ଶିକା: SAMS +୨ ଓ +୩ (NEP), ସ୍ନାତକୋତ୍ତର (PG), SCTE&VT ପଲିଟେକ୍ନିକ୍ ଡିପ୍ଲୋମା, ITI, CA/CMA/CS/LL.B. ବୃତ୍ତିଗତ ପାଠ୍ୟକ୍ରମ ଏବଂ IGNOU/OSOU ମୁକ୍ତ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଶିକ୍ଷାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'entrance examinations and admission tests': {
    title_or: 'ପ୍ରବେଶିକା ପରୀକ୍ଷା ଏବଂ ନାମଲେଖା ଟେଷ୍ଟ',
    badge: 'ENTRANCE EXAMS',
    en: 'Complete directory of state, national, and global admission tests for Odisha students including OJEE, Special OJEE, JEE Main/Advanced, NEET-UG/PG, CPET Odisha, CUET-UG/PG, OUAT CEE, GATE, CAT/XAT, CLAT/AILET, NEST/IAT, and IELTS/GRE/TOEFL.',
    or: 'ପ୍ରବେଶିକା ପରୀକ୍ଷା ଡାଇରେକ୍ଟୋରୀ: OJEE, ସ୍ପେଶାଲ୍ OJEE, JEE Main/Advanced, NEET-UG/PG, CPET ଓଡ଼ିଶା, CUET, OUAT CEE, GATE, CAT/XAT, CLAT, NEST ଏବଂ ବିଦେଶୀ ନାମଲେଖା ପରୀକ୍ଷାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'competitive and recruitment examinations': {
    title_or: 'ପ୍ରତିଯୋଗିତାମୂଳକ ଏବଂ ନିଯୁକ୍ତି ପରୀକ୍ଷା',
    badge: 'RECRUITMENT EXAMS',
    en: 'Detailed exam blueprints, syllabi, and qualifying rules for National (UPSC, SSC, RRB, IBPS/SBI/RBI), Odisha State (OPSC, OSSC, OSSSC, OPRB), and Teaching Eligibility Tests (OTET Paper I & II, OSSTET, CTET) with PYQ and cutoff strategies.',
    or: 'ପ୍ରତିଯୋଗିତାମୂଳକ ଓ ନିଯୁକ୍ତି ପରୀକ୍ଷା: UPSC, SSC, RRB, IBPS/SBI, OPSC, OSSC, OSSSC, OPRB ଏବଂ OTET/OSSTET/CTET ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷାର ପାଠ୍ୟକ୍ରମ, ମାର୍କ ବିଭାଜନ ଓ ପ୍ରସ୍ତୁତି ରଣନୀତି।'
  },
  'skill development and certifications': {
    title_or: 'ଦକ୍ଷତା ବିକାଶ ଏବଂ ସରକାରୀ ପ୍ରମାଣପତ୍ର',
    badge: 'SKILL & CERTS',
    en: 'Career-accelerating certifications for Odisha youth covering OKCL OS-CIT, NIELIT CCC/O-Level, World Skill Center (OSDA) Bhubaneswar, NAPS/NATS, programming, AI/ML, Cloud/DevOps, Tally/GST, NISM, and healthcare emergency training.',
    or: 'ଦକ୍ଷତା ବିକାଶ ଓ ପ୍ରମାଣପତ୍ର: OKCL OS-CIT, NIELIT CCC/O-Level, ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର (OSDA) ଭୁବନେଶ୍ୱର, NAPS/NATS, କୋଡିଂ, AI/ML, କ୍ଲାଉଡ୍, Tally/GST, NISM ଏବଂ ସ୍ୱାସ୍ଥ୍ୟସେବା ତାଲିମ ସୂଚନା।'
  },
  'odisha state entrance exams': {
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପ୍ରବେଶିକା ପରୀକ୍ଷା',
    badge: 'STATE EXAMS',
    en: 'Authoritative guide to Odisha state-level entrance tests including OJEE, Special OJEE, CPET (Common PG Entrance Test), OUAT CEE, SAMS +2/+3/B.Ed./D.El.Ed. e-Admission, OTET, OSSTET, and Diploma DET lateral entry counselling.',
    or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପ୍ରବେଶିକା ପରୀକ୍ଷା: OJEE, ସ୍ପେଶାଲ୍ OJEE, CPET ଓଡ଼ିଶା, OUAT CEE, SAMS +୨/+୩/B.Ed. ଇ-ଆଡମିଶନ୍, OTET, OSSTET ଏବଂ DET କାଉନସେଲିଂ ପ୍ରକ୍ରିୟାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'national entrance & fellowship exams': {
    title_or: 'ଜାତୀୟ ପ୍ରବେଶିକା ଏବଂ ଫେଲୋସିପ୍ ପରୀକ୍ଷା',
    badge: 'NATIONAL EXAMS',
    en: 'National admission and fellowship gateway covering JEE Main/Advanced, NEET-UG/PG, CUET-UG/PG, GATE, CAT/XAT, CLAT/AILET, NEST (NISER), IAT (IISER), and UGC-NET / CSIR-NET JRF with Odisha exam centres and reservation rules.',
    or: 'ଜାତୀୟ ପ୍ରବେଶିକା ଓ ଫେଲୋସିପ୍ ପରୀକ୍ଷା: JEE Main/Advanced, NEET, CUET, GATE, CAT/XAT, CLAT, NEST (NISER), IAT (IISER) ଏବଂ UGC/CSIR-NET JRF ପରୀକ୍ଷାର ଓଡ଼ିଶା କେନ୍ଦ୍ର ଓ ଯୋଗ୍ୟତା ବିବରଣୀ।'
  },
  'skill certifications & short courses': {
    title_or: 'ଦକ୍ଷତା ପ୍ରମାଣପତ୍ର ଏବଂ ସ୍ୱଳ୍ପକାଳୀନ ପାଠ୍ୟକ୍ରମ',
    badge: 'SKILL CERT',
    en: 'Government-recognised short courses and computer certifications for Odisha students including OKCL OS-CIT, NIELIT CCC/BCC/O-Level, OSDA World Skill Center Bhubaneswar, PMKVY/NSQF trades, and SWAYAM-NPTEL MOOCs.',
    or: 'ଦକ୍ଷତା ପ୍ରମାଣପତ୍ର ଓ ସ୍ୱଳ୍ପକାଳୀନ ପାଠ୍ୟକ୍ରମ: OKCL OS-CIT, NIELIT CCC/O-Level, ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଭୁବନେଶ୍ୱର, PMKVY/NSQF ଏବଂ SWAYAM-NPTEL ପାଠ୍ୟକ୍ରମର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'ojee & technical admissions': {
    title_or: 'OJEE ଏବଂ ବୈଷୟିକ ନାମଲେଖା',
    badge: 'OJEE',
    en: 'Complete OJEE and Special OJEE engineering/management/pharmacy admission guide covering B.Tech Lateral Entry, MBA, MCA, M.Tech, B.Pharm, and Odisha 85% State Quota MBBS/BDS counselling with TFW fee-waiver seat rules.',
    or: 'OJEE ଏବଂ ବୈଷୟିକ ନାମଲେଖା: B.Tech ଲାଟେରାଲ୍ ଏଣ୍ଟ୍ରି, MBA, MCA, M.Tech, B.Pharm, ଡିପ୍ଲୋମା ଏବଂ ଓଡ଼ିଶା ୮୫% ରାଜ୍ୟ କୋଟା MBBS/BDS କାଉନସେଲିଂ ସହିତ TFW ଫି ଛାଡ଼, ସିଟ୍ ଆବଣ୍ଟନ ଓ ନୋଡାଲ୍ ଭେରିଫିକେସନ୍ ନିୟମାବଳୀ।'
  },
  'world skill center & osda tracks': {
    title_or: 'ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଏବଂ OSDA ପାଠ୍ୟକ୍ରମ',
    badge: 'WSC / OSDA',
    en: 'Advanced finishing-school skill tracks at World Skill Center (WSC) Bhubaneswar under Odisha Skill Development Authority (OSDA) and ITE Singapore partnership covering Mechatronics, Cloud, Precision Engineering, and Vertical Transportation.',
    or: 'ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର (WSC) ଭୁବନେଶ୍ୱର ଓ OSDA: ମେକାଟ୍ରୋନିକ୍ସ, କ୍ଲାଉଡ୍ କମ୍ପ୍ୟୁଟିଂ, ପ୍ରିସିସନ୍ ଇଞ୍ଜିନିୟରିଂ, ITE ସିଙ୍ଗାପୁର ସହଯୋଗୀ ଦକ୍ଷତା ତାଲିମ, ସ୍କଲାରଶିପ୍ ଏବଂ ଜାତୀୟ/ଆନ୍ତର୍ଜାତୀୟ ପ୍ଲେସମେଣ୍ଟ ସୂଚନା।'
  },
  'ojee counselling & document checklist': {
    title_or: 'OJEE କାଉନସେଲିଂ ଏବଂ ପ୍ରମାଣପତ୍ର ଚେକ୍-ଲିଷ୍ଟ',
    badge: 'COUNSELLING',
    en: 'Step-by-step OJEE web counselling, choice locking, seat allotment, TFW (Tuition Fee Waiver) income limits, and nodal centre verification checklist covering Resident, Caste, EWS, Green Card, and Ex-Servicemen certificates.',
    or: 'OJEE କାଉନସେଲିଂ ଓ ଡକ୍ୟୁମେଣ୍ଟ ଚେକ୍-ଲିଷ୍ଟ: ୱେବ୍ କାଉନସେଲିଂ, ଚଏସ୍ ଲକିଂ, ସିଟ୍ ଆବଣ୍ଟନ, TFW ଆୟ ସୀମା ଏବଂ ବାସିନ୍ଦା, ଜାତି, EWS, ଗ୍ରୀନ୍ କାର୍ଡ, ଏକ୍ସ-ସର୍ଭିସମ୍ୟାନ୍ ଓ ନୋଡାଲ୍ ସେଣ୍ଟର ଭେରିଫିକେସନ୍ ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  }
};

function buildSmartCourseFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const hay = `${title} ${parentTitle || ''} ${folder.slug || ''}`.toLowerCase();

  let badge = 'COURSES & EXAMS';
  let en = '';
  let or = '';

  if (hay.includes('digital') || hay.includes('programming') || hay.includes('ai,') || hay.includes('cloud') || hay.includes('cybersecurity') || hay.includes('office') || hay.includes('accounting')) {
    badge = 'TECH & DIGITAL';
    en = `Verified ${title} certification and training roadmap for Odisha students, highlighting OKCL OS-CIT, NIELIT CCC/O-Level, World Skill Center Bhubaneswar, SWAYAM-NPTEL, and industry-aligned job readiness.`;
    or = `${title} ପ୍ରଶିକ୍ଷଣ ଓ ପ୍ରମାଣପତ୍ର: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ OKCL OS-CIT, NIELIT CCC/O-Level, ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଭୁବନେଶ୍ୱର, SWAYAM-NPTEL, କ୍ରେଡିଟ୍ ଟ୍ରାନ୍ସଫର ଏବଂ ଚାକିରି-ମୁଖୀ ଦକ୍ଷତା ତାଲିମ ସୂଚନା।`;
  } else if (hay.includes('entrance') || hay.includes('examination') || hay.includes('teaching eligibility') || hay.includes('fellowship')) {
    badge = 'EXAM GUIDE';
    en = `Minute ${title} guide covering conducting authorities, minimum qualifying marks, negative marking, syllabus structure, Odisha exam centres, fee waivers, and counselling/application workflows.`;
    or = `${title} ପରୀକ୍ଷା ମାର୍ଗଦର୍ଶିକା: ପରୀକ୍ଷା ପରିଚାଳନା ସଂସ୍ଥା, ସର୍ବନିମ୍ନ ଯୋଗ୍ୟତା ମାର୍କ, ନେଗେଟିଭ୍ ମାର୍କିଂ, ବିସ୍ତୃତ ପାଠ୍ୟକ୍ରମ, ଓଡ଼ିଶା ପରୀକ୍ଷା କେନ୍ଦ୍ର, ଫି ଛାଡ଼ ଏବଂ ଆବେଦନ/କାଉନସେଲିଂ ପ୍ରକ୍ରିୟାର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।`;
  } else if (hay.includes('diploma') || hay.includes('iti') || hay.includes('trades') || hay.includes('safety') || hay.includes('healthcare') || hay.includes('skill')) {
    badge = 'SKILL & TVET';
    en = `Hands-on ${title} pathway in Odisha covering SCTE&VT, NCVT/SCVT, OSDA, Skill India/PMKVY, NAPS apprenticeships, NSQF certification levels, and direct industrial placement opportunities.`;
    or = `${title} ଦକ୍ଷତା ତାଲିମ: ଓଡ଼ିଶାରେ SCTE&VT, NCVT/SCVT, OSDA, Skill India/PMKVY, NAPS ଆପ୍ରେଣ୍ଟିସଶିପ୍, NSQF ପ୍ରମାଣପତ୍ର ସ୍ତର ଏବଂ ଶିଳ୍ପ କ୍ଷେତ୍ରରେ ସିଧାସଳଖ ନିଯୁକ୍ତି ସୁଯୋଗର ପ୍ରାମାଣିକ ବିବରଣୀ।`;
  } else {
    en = `Comprehensive ${title} academic and certification guide for Odisha learners, detailing SAMS Odisha / NTA / UGC pathways, credit norms, fee waivers, and verified institutional portals.`;
    or = `${title} ଶିକ୍ଷା ଓ ପ୍ରମାଣପତ୍ର ମାର୍ଗଦର୍ଶିକା: ଓଡ଼ିଶାର ଶିକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ SAMS ଓଡ଼ିଶା, NTA ଓ UGC ପଥ, କ୍ରେଡିଟ୍ ନିୟମ, ପାଠ୍ୟକ୍ରମ ଅବଧି, ଫି ଛାଡ଼ ସୁବିଧା ଏବଂ ସରକାରୀ ପୋର୍ଟାଲ୍ ସୂଚନା।`;
  }

  return {
    title_or: folder.title_or || `${title} (ପାଠ୍ୟକ୍ରମ ଓ ପରୀକ୍ଷା)`,
    badge,
    en,
    or
  };
}

// 14 Exhaustive Minute Bilingual Course, Entrance Exam & Certification Handbooks (Category #04)
const CAT04_HANDBOOKS = [
  {
    id: 'ji-cx-ojee-guide',
    slug: 'ojee-counselling-document-checklist',
    folderHints: ['ojee-counselling-checklist', 'ojee-technical-admissions', 'undergraduate entrance examinations'],
    title: 'OJEE & Special OJEE — B.Tech. Lateral Entry, MBA, MCA, M.Tech., B.Pharm & Counselling Guide',
    title_or: 'ଓଜେଇଇ (OJEE) ଏବଂ ସ୍ପେଶାଲ୍ OJEE — B.Tech. LE, MBA, MCA, M.Tech., B.Pharm ଏବଂ କାଉନସେଲିଂ ଗାଇଡ୍',
    conducting_body: 'Odisha Joint Entrance Examination (OJEE) Board',
    exam_code: 'OJEE & Special OJEE',
    cadre_group: 'State Technical, Pharmacy, Management & Lateral Entry Admissions',
    pay_matrix: 'TFW (Tuition Fee Waiver) available for families with annual income < ₹8 Lakh; Sudakshya / State Scholarship eligible.',
    age_limit_relaxation: 'No upper age bar for B.Tech LE, B.Pharm, MBA, MCA, M.Tech; minimum 17 yrs for B.Pharm/MBBS counselling.',
    qualification_odia_rule: 'B.Pharm: +2 Science (PCM/PCB); B.Tech LE: 3-yr SCTE&VT Diploma or B.Sc. (45%/40% SC-ST); MBA/MCA/M.Tech: Graduation (50%/45% SC-ST). Odisha Nativity required for 85% State/TFW seats.',
    selection_stages: 'CBT Exam (4 marks per right answer, -1 negative marking; 60–120 questions depending on course) -> Rank Card -> Online Web Counselling -> Choice Filling & Locking -> Nodal Verification.',
    pst_pet_skill_norms: 'Syllabus: Lateral Entry (Engg Math, Engg Mechanics, Basic Electrical/Electronics); MBA (Verbal, Analytical, Quant, GK); MCA (Math & Computer Awareness); B.Pharm (Physics, Chemistry, Math/Bio).',
    documents_checklist: 'OJEE Rank Card, 10th/+2/Diploma/Degree Marksheets, Resident/Nativity Certificate (Tahasil), Caste Certificate (SC/ST/SEBC), Income Certificate (for TFW), Green Card / ESM / PwD Proof, CLC.',
    application_steps: '1. Register at ojee.nic.in (₹1,000–₹1,500 fee). 2. Appear at Odisha CBT centres (30 districts). 3. Participate in OJEE e-Counselling, upload documents online, and lock college choices (OUTR, VSSUT, IGIT, Parala Maharaja, BPUT colleges).',
    official_portal_url: 'https://ojee.nic.in/',
    qualification_tag: '+2 / Diploma / Graduate',
    summary: 'Complete OJEE & Special OJEE guide covering B.Tech Lateral Entry, MBA, MCA, M.Tech & B.Pharm exam pattern (+4/-1), TFW income waiver (<₹8L), and ojee.nic.in counselling.',
    tags: ['OJEE', 'Special OJEE', 'TFW', 'Counselling', 'B.Tech LE', 'MBA', 'MCA']
  },
  {
    id: 'ji-cx-jee-main-adv',
    slug: 'jee-main-and-jee-advanced-nit-rourkela-iit-bhubaneswar-roadmap',
    folderHints: ['undergraduate entrance examinations', 'national-entrances-fellowships'],
    title: 'JEE Main & JEE Advanced — NIT Rourkela, IIT Bhubaneswar, IIIT, VSSUT Burla & OUTR Roadmap',
    title_or: 'ଜେଇଇ ମେନ୍ ଏବଂ ଆଡଭାନ୍ସଡ୍ — NIT ରାଉରକେଲା, IIT ଭୁବନେଶ୍ୱର, IIIT, VSSUT ଏବଂ OUTR ପ୍ରବେଶିକା',
    conducting_body: 'National Testing Agency (NTA) & IITs (JAB)',
    exam_code: 'JEE Main (Session 1 & 2) / JEE Advanced',
    cadre_group: 'B.Tech. / B.E. / B.Arch. / B.Plan. Premier Engineering Admissions',
    pay_matrix: '50% Home State Quota at NIT Rourkela for Odisha +2 students; 100% SC/ST & Income (<₹1L) Tuition Fee Waiver at IITs/NITs.',
    age_limit_relaxation: 'No age limit; up to 3 consecutive years from Class 12 passing year for JEE Main, 2 consecutive attempts for JEE Advanced.',
    qualification_odia_rule: '+2 / Class 12 with Physics, Chemistry & Mathematics (75% aggregate or Top-20 percentile in CHSE/CBSE/ICSE for IIT/NIT; 65% for SC/ST). Odia is an official JEE Main exam language.',
    selection_stages: 'JEE Main (300 Marks: Physics, Chemistry, Math — 75 Qs, +4/-1 negative) -> Top 2.5 Lakh qualify for JEE Advanced (Paper 1 & 2) -> JoSAA / CSAB Counselling (for IIT/NIT/IIIT) & OJEE Counselling (for VSSUT/OUTR/IGIT).',
    pst_pet_skill_norms: 'Exam Centres in Odisha: Bhubaneswar, Cuttack, Rourkela, Berhampur, Sambalpur, Balasore, Angul, Dhenkanal, Bhadrak, Puri, Jeypore, Jharsuguda.',
    documents_checklist: '10th & +2 Marksheets, JEE Admit Card & Rank Card, Central OBC-NCL / EWS / SC / ST Certificate (post-April 1 format), Odisha Domicile (for NIT Rourkela HS quota & OJEE), Medical Certificate.',
    application_steps: '1. Apply at jeemain.nta.ac.in (select Odia/English medium). 2. Register on josaa.nic.in for IIT Bhubaneswar, NIT Rourkela & IIIT-Bhubaneswar OR ojee.nic.in for VSSUT Burla & OUTR.',
    official_portal_url: 'https://jeemain.nta.ac.in/',
    qualification_tag: '+2 PCM (CHSE/CBSE/ICSE)',
    summary: 'JEE Main & Advanced guide for Odisha aspirants featuring Odia exam medium, NIT Rourkela 50% Home State quota, IIT Bhubaneswar, VSSUT Burla, OUTR, and JoSAA/OJEE counselling.',
    tags: ['JEE Main', 'JEE Advanced', 'NIT Rourkela', 'IIT Bhubaneswar', 'VSSUT', 'OUTR']
  },
  {
    id: 'ji-cx-neet-ug-pg',
    slug: 'neet-ug-and-neet-pg-odisha-85-percent-state-quota-aiims',
    folderHints: ['undergraduate entrance examinations', 'postgraduate entrance examinations'],
    title: 'NEET UG & NEET PG — Odisha 85% State Quota (OJEE Medical) & 15% AIQ (SCB, MKCG, VIMSAR, AIIMS)',
    title_or: 'ନିଟ୍ (NEET UG & PG) — ଓଡ଼ିଶା ୮୫% ରାଜ୍ୟ କୋଟା ଏବଂ ୧୫% AIQ (SCB, MKCG, VIMSAR, AIIMS)',
    conducting_body: 'NTA (NEET-UG) / NBEMS (NEET-PG) / MCC / OJEE Medical Counselling',
    exam_code: 'NEET-UG / NEET-PG',
    cadre_group: 'MBBS, BDS, BAMS, BHMS & MD/MS/MDS Admissions',
    pay_matrix: 'Odisha Govt MBBS annual fee ~₹37,950 (lowest in India); Medhabruti & Post-Matric Scholarship eligible.',
    age_limit_relaxation: 'NEET-UG: Minimum 17 years by Dec 31 of admission year; no upper age limit.',
    qualification_odia_rule: 'NEET-UG: +2 PCB + English (50% UR, 40% SC/ST/OBC). Odia is available as a NEET-UG question paper language. Odisha 85% State Quota requires Odisha Domicile/Permanent Resident.',
    selection_stages: 'NEET-UG (720 Marks: 180 Qs in Physics, Chemistry, Botany, Zoology — 3 hrs, +4/-1 negative) -> 15% AIQ & AIIMS Bhubaneswar via mcc.nic.in + 85% Odisha Govt/Pvt MBBS/BDS/AYUSH via ojee.nic.in.',
    pst_pet_skill_norms: 'Odisha Govt Medical Colleges: SCB Cuttack, MKCG Berhampur, VIMSAR Burla, PRM Baripada, SLN Koraput, FM Balasore, BB Bolangir, SJ Puri, DMM Sundargarh, Bhawanipatna, Talcher, Jajpur.',
    documents_checklist: 'NEET Admit Card & Scorecard, 10th/+2 PCB Marksheets, Odisha Permanent Resident Certificate, Caste/EWS/Green Card/Ex-Servicemen Certificate, CLC, Bond Undertaking (for PG).',
    application_steps: '1. Register at neet.nta.nic.in (select Odia or English medium). 2. After results, register separately on mcc.nic.in (AIIMS/AIQ) AND ojee.nic.in (85% Odisha State Quota).',
    official_portal_url: 'https://neet.nta.nic.in/',
    qualification_tag: '+2 PCB (NEET-UG) / MBBS (NEET-PG)',
    summary: 'NEET-UG & NEET-PG handbook covering Odia medium paper, 720-mark NCERT pattern, AIIMS Bhubaneswar (MCC), and 85% Odisha State Quota OJEE Medical Counselling for SCB/MKCG/VIMSAR.',
    tags: ['NEET UG', 'NEET PG', 'OJEE Medical', 'AIIMS Bhubaneswar', 'SCB Cuttack', 'MBBS']
  },
  {
    id: 'ji-cx-cpet-sams-odisha',
    slug: 'cpet-odisha-and-sams-higher-education-eadmission-guide',
    folderHints: ['postgraduate entrance examinations', 'school-to-higher-education pathways'],
    title: 'CPET Odisha (Common PG Entrance Test) & SAMS Odisha e-Admission (+2, +3, PG, B.Ed./D.El.Ed.)',
    title_or: 'ସିପିଇଟି ଓଡ଼ିଶା (CPET) ଏବଂ SAMS ଓଡ଼ିଶା ଇ-ଆଡମିଶନ୍ (+୨, +୩, PG, B.Ed./D.El.Ed.)',
    conducting_body: 'Higher Education Dept & S&ME Dept, Govt of Odisha (OCAC)',
    exam_code: 'CPET Odisha / SAMS e-Admission',
    cadre_group: 'State Public Universities, Autonomous Colleges & Teacher Education Admissions',
    pay_matrix: 'Subsidised Govt Tuition; eligible for State Scholarship Portal, Gopabandhu Sikhya Sahayata & Laptop DBT.',
    age_limit_relaxation: 'As per SAMS Odisha admission prospectus; no upper age bar for general +3/PG admissions.',
    qualification_odia_rule: '+2 (SAMS): 10th pass; +3 Degree (SAMS NEP 4-yr Hons): +2 pass; CPET PG: Bachelor’s degree in relevant/allied subject (45–50%); State B.Ed.: Graduation (50% UR, 45% SC/ST/SEBC/PwD).',
    selection_stages: 'CPET: 80 Marks Entrance MCQ (No negative marking, 90 mins) + 20 Marks Career Weightage (10th/+2/+3) -> Centralised SAMS Merit & Slide-Up Allotment; +2/+3 SAMS: Purely qualifying exam merit.',
    pst_pet_skill_norms: 'Covers Utkal, Ravenshaw, Sambalpur, Berhampur, FM, MSCB Baripada, Gangadhar Meher, Rajendra, Kalahandi, and Rama Devi Women’s University.',
    documents_checklist: 'CAF (Common Application Form) Printout, Intimation Letter, CLC & Conduct Certificate, Marksheets, Resident/Caste Certificate, Weightage Proof (NCC/NSS/Sports).',
    application_steps: '1. Visit samsodisha.gov.in and select +2, +3, PG (CPET), or Teacher Education (B.Ed./D.El.Ed.). 2. Fill CAF & pay fee online. 3. Download Intimation Letter & report at allotted college.',
    official_portal_url: 'https://samsodisha.gov.in/',
    qualification_tag: '10th / +2 / Graduation',
    summary: 'Complete CPET Odisha (80+20 merit) and SAMS Odisha e-Admission guide for +2, +3 (NEP 4-yr), Postgraduate, and State B.Ed./D.El.Ed. admissions across all Odisha universities.',
    tags: ['CPET Odisha', 'SAMS Odisha', 'PG Admission', 'State B.Ed', 'NEP Degree']
  },
  {
    id: 'ji-cx-cuet-ug-pg',
    slug: 'cuet-ug-and-cuet-pg-central-university-of-odisha-du-bhu-jnu',
    folderHints: ['undergraduate entrance examinations', 'postgraduate entrance examinations'],
    title: 'CUET UG & CUET PG (NTA) — Central University of Odisha (Koraput), DU, BHU, JNU & HCU Guide',
    title_or: 'ସିୟୁଇଟି (CUET UG & PG) — କେନ୍ଦ୍ରୀୟ ବିଶ୍ୱବିଦ୍ୟାଳୟ କୋରାପୁଟ, DU, BHU, JNU ଏବଂ HCU ପ୍ରବେଶିକା',
    conducting_body: 'National Testing Agency (NTA)',
    exam_code: 'CUET-UG / CUET-PG',
    cadre_group: 'Central Universities, IIMC Dhenkanal & National Institutes',
    pay_matrix: 'Central University fee structure + NSP / State Post-Matric Scholarship eligible.',
    age_limit_relaxation: 'No upper age limit in NTA CUET-UG / CUET-PG.',
    qualification_odia_rule: 'CUET-UG: +2 pass (any board); CUET-PG: Bachelor’s degree. Odia is available as a Language Paper in CUET-UG and MA Odia / Journalism (IIMC Dhenkanal Odia) in CUET-PG.',
    selection_stages: 'CUET-UG: Language + Domain Subjects + General Test (+5/-1 marking); CUET-PG: 75 Domain MCQs (105 mins, +4/-1 marking) -> University-wise CSAS/Samarth Counselling.',
    pst_pet_skill_norms: 'Mandatory single gateway for Central University of Odisha (CUO Koraput), IIMC Dhenkanal, University of Delhi, BHU, JNU, Hyderabad Central University, and Visva-Bharati.',
    documents_checklist: 'CUET Scorecard, 10th/+2/Graduation Marksheets, Central OBC-NCL / EWS / SC / ST Certificate, Transfer/Migration Certificate.',
    application_steps: '1. Apply on cuetug.ntaonline.in or pgcuet.samarth.ac.in. 2. Select subject codes matching target university programme. 3. Register on each participating university portal (CUO Koraput / DU CSAS / IIMC) after score release.',
    official_portal_url: 'https://cuo.ac.in/',
    qualification_tag: '+2 (CUET-UG) / Graduate (CUET-PG)',
    summary: 'CUET-UG & CUET-PG roadmap for Odisha students targeting Central University of Odisha (Koraput), IIMC Dhenkanal, Delhi University, BHU, JNU, and HCU.',
    tags: ['CUET UG', 'CUET PG', 'CUO Koraput', 'IIMC Dhenkanal', 'DU', 'JNU', 'BHU']
  },
  {
    id: 'ji-cx-ouat-cee',
    slug: 'ouat-common-entrance-examination-agriculture-veterinary-forestry',
    folderHints: ['undergraduate entrance examinations', 'odisha state entrance exams'],
    title: 'OUAT Common Entrance Examination (CEE) — Agriculture, Horticulture, Forestry, Veterinary & Fisheries',
    title_or: 'ଓୟୁଏଟି (OUAT) ପ୍ରବେଶିକା ପରୀକ୍ଷା — କୃଷି, ଉଦ୍ୟାନକୃଷି, ବନବିଜ୍ଞାନ, ପ୍ରାଣୀଚିକିତ୍ସା ଏବଂ ମତ୍ସ୍ୟ',
    conducting_body: 'Odisha University of Agriculture & Technology (OUAT), Bhubaneswar',
    exam_code: 'OUAT UG / PG CEE',
    cadre_group: 'B.Sc. (Hons.) Agri/Hort/Forestry, B.V.Sc. & A.H., B.F.Sc., B.Tech. (Ag. Engg)',
    pay_matrix: 'Govt University fee; KALIA / Krishi Vidya Nidhi & State Scholarship eligible.',
    age_limit_relaxation: 'Minimum 17 years as on Dec 31 of admission year.',
    qualification_odia_rule: '+2 Science with Physics, Chemistry & Biology/Mathematics (50% UR, 40% SC/ST/PwD). Odisha Domicile required for State quota; ICAR 15–20% AIQ seats also available.',
    selection_stages: 'Weighted Merit: 50% OUAT CBT (200 MCQs: Physics 66, Chemistry 66, Math/Bio 68 — NO negative marking, 2 hrs) + 25% 10th Marks + 25% +2 Science Marks -> Counselling at OUAT Bhubaneswar.',
    pst_pet_skill_norms: 'Note: B.V.Sc. & A.H. admission uses OUAT CEE or NEET-UG/VCI quota as notified in the annual prospectus.',
    documents_checklist: 'OUAT Form-A & Form-B Printout, 10th & +2 Science Marksheets, Resident/Caste Certificate, Green Card / Agro-Polytechnic / Farmer Family Certificate (if claiming reserved quota).',
    application_steps: '1. Submit Form-A at ouat.ac.in before CBT. 2. Appear for OUAT CBT across Odisha centres. 3. Submit Form-B (+2 marks upload) within deadline to generate Final Rank Card.',
    official_portal_url: 'https://www.ouat.ac.in/',
    qualification_tag: '+2 Science (PCB / PCM)',
    summary: 'OUAT CEE complete guide covering 50% CBT (no negative marking) + 25% 10th + 25% +2 weightage, Form-A/Form-B workflow, and Agriculture/Veterinary/Forestry/Fisheries seats.',
    tags: ['OUAT', 'B.Sc Agriculture', 'Veterinary', 'Forestry', 'Fisheries', 'Odisha Entrance']
  },
  {
    id: 'ji-cx-otet-osstet-ctet',
    slug: 'otet-paper-1-2-osstet-ctet-odisha-teacher-eligibility-tests',
    folderHints: ['teaching eligibility examinations', 'odisha state entrance exams'],
    title: 'OTET (Paper I & II), OSSTET & CTET — Syllabus, Qualifying Marks & Lifetime Validity',
    title_or: 'ଓଟିଇଟି (OTET), ଓଏସଏସଟିଇଟି (OSSTET) ଏବଂ ସିଟିଇଟି (CTET) — ପାଠ୍ୟକ୍ରମ ଏବଂ ବୈଧତା',
    conducting_body: 'Board of Secondary Education (BSE) Odisha & CBSE',
    exam_code: 'OTET (Paper I & II) / OSSTET / CTET',
    cadre_group: 'Primary, Upper Primary & Secondary School Teacher Eligibility',
    pay_matrix: 'Mandatory qualifying certificate for OSEPA JTS, OSSC LTR, OAVS, SSD, KVS, NVS & EMRS.',
    age_limit_relaxation: 'No age limit to appear in OTET, OSSTET, or CTET.',
    qualification_odia_rule: 'OTET Paper-I (Class I–V): +2 + D.El.Ed./CT; OTET Paper-II (VI–VIII): Graduation + D.El.Ed./B.Ed.; OSSTET (IX–X): Graduation + B.Ed./B.P.Ed. + Odia MIL/ME pass.',
    selection_stages: '150 MCQs, 150 Marks, 2.5 Hours, NO Negative Marking. Qualifying Marks: 60% (90/150) for UR; 50% (75/150) for SC/ST/SEBC/PwD (OSSTET/OTET) & 55% (82/150) OBC/SC/ST in CTET.',
    pst_pet_skill_norms: 'As per NCTE & Govt of Odisha notification, OTET, OSSTET, and CTET pass certificates carry LIFETIME VALIDITY.',
    documents_checklist: 'D.El.Ed./B.Ed. Final or Appearing Proof, 10th/+2/Degree Marksheets, Caste/PwD Certificate (for 50% qualifying relaxation), Odia Pass Proof.',
    application_steps: '1. Apply at bseodisha.ac.in (OTET/OSSTET) or ctet.nic.in (CTET). 2. Choose Paper-I/II or TGT stream (Arts/Science PCM-CBZ/Hindi/Sanskrit/Urdu/Telugu/PET). 3. Download DigiLocker/BSE certificate.',
    official_portal_url: 'https://www.bseodisha.ac.in/',
    qualification_tag: 'D.El.Ed. (CT) / B.Ed. / B.P.Ed.',
    summary: 'Complete OTET Paper I & II, OSSTET, and CTET handbook detailing 150-MCQ no-negative pattern, 60%/50% qualifying marks, lifetime validity, and syllabus breakdown.',
    tags: ['OTET', 'OSSTET', 'CTET', 'BSE Odisha', 'Teacher Eligibility', 'Lifetime Validity']
  },
  {
    id: 'ji-cx-ugc-csir-net-jrf',
    slug: 'ugc-net-jrf-and-csir-net-assistant-professor-phd-categories',
    folderHints: ['research and fellowship examinations', 'national-entrances-fellowships'],
    title: 'UGC NET / JRF & CSIR NET (NTA) — Assistant Professor, Ph.D. Categories (1, 2 & 3) & JRF Rules',
    title_or: 'ୟୁଜିସି ନେଟ୍ (UGC NET / JRF) ଏବଂ CSIR NET — ସହକାରୀ ପ୍ରଫେସର, Ph.D. ବର୍ଗ ଏବଂ ଫେଲୋସିପ୍',
    conducting_body: 'National Testing Agency (NTA) on behalf of UGC & CSIR',
    exam_code: 'UGC-NET / CSIR-NET (June & December Cycles)',
    cadre_group: 'Assistant Professor Eligibility, JRF (₹37k–₹42k/mo) & Ph.D. Admission',
    pay_matrix: 'JRF Stipend: ₹37,000/mo (First 2 yrs) + HRA -> SRF: ₹42,000/mo + HRA + Contingency.',
    age_limit_relaxation: 'JRF: Max 30 years (+5 yrs SC/ST/OBC-NCL/PwD/Women); Assistant Professor & Ph.D. Admission: No upper age limit.',
    qualification_odia_rule: 'Master’s degree (55% UR, 50% SC/ST/OBC-NCL/PwD) OR 4-year Bachelor’s Hons with 75%+ (for direct Ph.D./JRF). Odia Subject (Code 23) is a full UGC-NET subject.',
    selection_stages: 'UGC-NET CBT (3 hrs, NO negative marking): Paper-1 Teaching/Research Aptitude (100 marks) + Paper-2 Subject (200 marks) = 300 Marks. Result classifies into Cat-1 (JRF+AP+PhD), Cat-2 (AP+PhD), Cat-3 (PhD only, valid 1 yr).',
    pst_pet_skill_norms: 'CSIR-NET (Life, Chemical, Physical, Mathematical, Earth Sciences) includes negative marking in Part A/B/C.',
    documents_checklist: 'PG Marksheets/Provisional Certificate, Central OBC-NCL/SC/ST/EWS/PwD Certificate, NTA Scorecard & e-Certificate.',
    application_steps: '1. Apply at ugcnet.nta.ac.in or csirnet.nta.ac.in. 2. Select Odisha CBT centres (Bhubaneswar, Cuttack, Berhampur, Sambalpur, Rourkela, Balasore). 3. Use JRF Award Letter for Ph.D. & OPSC Asst. Prof applications.',
    official_portal_url: 'https://ugcnet.nta.ac.in/',
    qualification_tag: 'Master’s (55%/50%) or 4-Yr Hons (75%)',
    summary: 'UGC-NET & CSIR-NET complete guide covering Cat-1/2/3 Ph.D. rules, ₹37,000–₹42,000 JRF fellowship, Odia Subject Code 23, and Odisha NTA CBT centres.',
    tags: ['UGC NET', 'CSIR NET', 'JRF', 'PhD Admission', 'Assistant Professor', 'Odia NET']
  },
  {
    id: 'ji-cx-gate-mtech-psu',
    slug: 'gate-exam-mtech-stipend-and-nalco-mcl-sail-optcl-psu-guide',
    folderHints: ['research and fellowship examinations', 'postgraduate entrance examinations'],
    title: 'GATE — M.Tech. Admission, Stipend (₹12,400/mo) & Maharatna/Odisha PSU Recruitment',
    title_or: 'ଗେଟ୍ (GATE) — M.Tech. ନାମଲେଖା, ₹୧୨,୪୦୦ ଷ୍ଟାଇପେଣ୍ଡ୍ ଏବଂ NALCO/MCL/SAIL/OPTCL PSU ନିଯୁକ୍ତି',
    conducting_body: 'IITs / IISc (NCEB) on behalf of Ministry of Education',
    exam_code: 'GATE (30 Subjects — Annual February Exam)',
    cadre_group: 'M.Tech./Ph.D. Fellowships & PSU Executive Trainee (E-1/E-2) Shortlisting',
    pay_matrix: 'M.Tech. AICTE/MoE Stipend: ₹12,400/month; Ph.D. Direct: ₹37,000/month; PSU GET CTC: ₹13–₹18 LPA.',
    age_limit_relaxation: 'No age limit to appear in GATE (Scorecard valid for 3 years); PSUs enforce 27–30/32 yr upper age limit.',
    qualification_odia_rule: '3rd-year or completed B.E./B.Tech./B.Arch./B.Sc. (4-yr) or M.Sc./MCA. Direct gateway to IIT Bhubaneswar, NIT Rourkela, VSSUT, OUTR, OPSC AEE, NALCO, NTPC, IOCL, BHEL, PGCIL, DRDO.',
    selection_stages: 'CBT (3 Hours, 65 Questions, 100 Marks): General Aptitude (15 marks) + Engineering Math & Core Subject (85 marks); Negative marking -1/3 (1-mark MCQ) & -2/3 (2-mark MCQ), zero negative for MSQ/NAT.',
    pst_pet_skill_norms: 'COAP (for IITs) & CCMT (for NIT Rourkela/IIITs/VSSUT) handle M.Tech. seat allotment; PSUs open separate portals using GATE Registration Number.',
    documents_checklist: 'GATE Scorecard, B.Tech. Marksheets, Provisional Degree, Central OBC-NCL/SC/ST/EWS Certificate.',
    application_steps: '1. Register at gate2026.iitg.ac.in / GOAPS portal in Aug–Sep. 2. Choose 1 or 2 permitted paper combinations. 3. Register on COAP/CCMT and PSU portals (NALCO, NTPC, IOCL, OPTCL) once GATE admits release.',
    official_portal_url: 'https://gate.iitk.ac.in/',
    qualification_tag: 'B.E./B.Tech. (3rd Yr+) / M.Sc. / MCA',
    summary: 'GATE complete handbook for Odisha engineers covering 100-mark CBT pattern, ₹12,400/mo M.Tech. stipend, IIT Bhubaneswar & NIT Rourkela CCMT/COAP, and NALCO/NTPC/OPSC AEE PSU recruitment.',
    tags: ['GATE', 'M.Tech', 'CCMT', 'COAP', 'NALCO', 'NIT Rourkela', 'PSU']
  },
  {
    id: 'ji-cx-clat-ailet-law',
    slug: 'clat-ailet-and-odisha-5-year-integrated-llb-llm-nluo-cuttack',
    folderHints: ['undergraduate entrance examinations', 'postgraduate entrance examinations'],
    title: 'CLAT, AILET & Odisha 5-Year Integrated LL.B. / LL.M. Admissions (NLUO Cuttack, MLU)',
    title_or: 'କ୍ଲାଟ୍ (CLAT), AILET ଏବଂ ଓଡ଼ିଶା ୫-ବର୍ଷୀୟ LL.B. / LL.M. ନାମଲେଖା (NLUO କଟକ, MLU)',
    conducting_body: 'Consortium of NLUs / NLU Delhi / Madhusudan Law University',
    exam_code: 'CLAT-UG / CLAT-PG / AILET',
    cadre_group: 'B.A./B.B.A. LL.B. (Hons.) & LL.M. Legal Admissions',
    pay_matrix: 'State Domicile reservation (25% Odisha State Quota at NLUO Cuttack); Aditya Birla / State Merit Scholarships.',
    age_limit_relaxation: 'No upper age limit for CLAT-UG or CLAT-PG.',
    qualification_odia_rule: 'CLAT-UG: +2 pass (45% UR/OBC/SEBC, 40% SC/ST); CLAT-PG: LL.B. degree (50% UR, 45% SC/ST). NLUO Cuttack reserves 25% seats for Odisha Domicile students.',
    selection_stages: 'CLAT-UG (120 Passage-Based MCQs, 2 hrs, +1/-0.25 negative): English, Current Affairs & GK, Legal Reasoning, Logical Reasoning, Quantitative Techniques -> 5 rounds of Consortium Counselling.',
    pst_pet_skill_norms: 'CLAT-PG score is also used for Public Sector Undertaking Legal Officer recruitment (ONGC, IOCL, NTPC, NHPC, OIL).',
    documents_checklist: 'CLAT Admit Card & Scorecard, +2/LL.B. Marksheets, Odisha Domicile Certificate (for NLUO State Quota), Caste/EWS/PwD Certificate.',
    application_steps: '1. Register at consortiumofnlus.ac.in (Aug–Oct). 2. Opt for NLUO Cuttack Odisha Domicile preference if eligible. 3. Appear at Cuttack/Bhubaneswar/Rourkela/Sambalpur centres.',
    official_portal_url: 'https://consortiumofnlus.ac.in/',
    qualification_tag: '+2 Any Stream (UG) / LL.B. (PG)',
    summary: 'CLAT & AILET law admission guide highlighting NLUO Cuttack’s 25% Odisha Domicile quota, Madhusudan Law University, 120-mark passage-based pattern, and PSU legal recruitment.',
    tags: ['CLAT', 'AILET', 'NLUO Cuttack', 'LLB', 'Law Entrance', 'Odisha Domicile']
  },
  {
    id: 'ji-cx-cat-xat-mba',
    slug: 'cat-xat-cmat-mat-ximb-iim-sambalpur-b-school-guide',
    folderHints: ['postgraduate entrance examinations', 'national-entrances-fellowships'],
    title: 'CAT, XAT, CMAT & MAT — XIMB (XIM University), IIM Sambalpur & Top B-School Admission Guide',
    title_or: 'କ୍ୟାଟ୍ (CAT), XAT, CMAT ଏବଂ MAT — XIMB, IIM ସମ୍ବଲପୁର ଏବଂ ଶ୍ରେଷ୍ଠ B-School ନାମଲେଖା',
    conducting_body: 'IIMs (CAT) / XLRI (XAT) / NTA (CMAT) / AIMA (MAT)',
    exam_code: 'CAT / XAT / CMAT / NMAT',
    cadre_group: 'MBA / PGDM / MBA-RM / MBA-HRM Admissions',
    pay_matrix: 'IIM Sambalpur Avg CTC ~₹14–₹16 LPA; XIMB Avg CTC ~₹19–₹20 LPA; Education Loan (PM-Vidyalaxmi) up to ₹40L collateral-free.',
    age_limit_relaxation: 'No age limit; work experience adds composite score points.',
    qualification_odia_rule: 'Bachelor’s degree in any stream (50% UR, 45% SC/ST/PwD). XIMB Bhubaneswar offers 50% Odisha Domicile Quota across MBA-BM, MBA-HRM & MBA-RM programmes.',
    selection_stages: 'CAT (120 mins: VARC, DILR, QA, +3/-1 negative) / XAT (Decision Making + VALR + QADI + GK) -> WAT / GD / Personal Interview (CAP IIMs, IIM Sambalpur, XIMB).',
    pst_pet_skill_norms: 'XIMB conducts XGMT (X-GMT) as an additional Odisha-friendly entrance alongside CAT/XAT/GMAT/NMAT.',
    documents_checklist: 'Graduation Marksheets, CAT/XAT/XGMT Scorecard, Odisha Domicile Certificate (for XIMB 50% State Quota), Work Experience Payslips, Caste/EWS/PwD.',
    application_steps: '1. Register at iimcat.ac.in (Aug–Sep) & xatonline.in (Jul–Nov). 2. Apply separately to xim.edu.in (select Odisha Domicile) and IIMs via CAT form.',
    official_portal_url: 'https://iimcat.ac.in/',
    qualification_tag: 'Graduate (50% UR / 45% SC-ST)',
    summary: 'MBA entrance guide for Odisha aspirants covering CAT, XAT, XGMT & CMAT, XIMB’s 50% Odisha Domicile quota, IIM Sambalpur CAP/SAP admissions, and placement ROI.',
    tags: ['CAT', 'XAT', 'XIMB', 'IIM Sambalpur', 'MBA', 'XGMT', 'B-School']
  },
  {
    id: 'ji-cx-oscit-nielit-computer',
    slug: 'okcl-oscit-and-nielit-ccc-bcc-o-level-computer-certifications',
    folderHints: ['digital literacy and computer fundamentals', 'office productivity and data entry', 'skill certifications & short courses'],
    title: 'OKCL OS-CIT & NIELIT (CCC, BCC, O-Level) — Govt-Approved Computer Certifications for OSSC/OSSSC',
    title_or: 'OKCL OS-CIT ଏବଂ NIELIT (CCC, BCC, O-Level) — OSSC/OSSSC ପାଇଁ ସରକାରୀ କମ୍ପ୍ୟୁଟର ପ୍ରମାଣପତ୍ର',
    conducting_body: 'OKCL (Odisha Knowledge Corporation Ltd) & NIELIT (MeitY, Govt of India)',
    exam_code: 'OS-CIT / NIELIT BCC, CCC & O-Level',
    cadre_group: 'Mandatory Computer Proficiency for OSSC, OSSSC, OPSC ASO & High Court',
    pay_matrix: 'Low Govt-regulated fee (OS-CIT ~₹3,500–₹4,200; NIELIT CCC exam ~₹590).',
    age_limit_relaxation: 'No age bar for OKCL OS-CIT or NIELIT CCC/O-Level.',
    qualification_odia_rule: 'OS-CIT: Open to 10th/+2/Graduates across 30 Odisha districts (BPUT/OCAC/OSDA ecosystem); NIELIT O-Level (NSQF Level-4): +2 or ITI pass — widely accepted as 1-yr Computer Diploma equivalent in State & Central exams.',
    selection_stages: 'OS-CIT: e-Learning lab sessions + final online exam; NIELIT CCC: 100 MCQs (no negative, 50% pass); NIELIT O-Level: 4 Modules (IT Tools, Web Design, Python, IoT) + Practical + Project.',
    pst_pet_skill_norms: 'Directly builds practical skills tested in OSSC CGL, OSSSC RI/ARI/Amin, and OPSC/High Court ASO Computer Skill Tests (MS Word, Excel, PowerPoint, Access, Internet).',
    documents_checklist: 'Aadhaar, 10th/+2 Marksheet, Passport Photo, OKCL ALC / NIELIT Student Registration Number.',
    application_steps: '1. Enrol at an authorised OKCL Learning Centre (ALC) via okcl.org OR register directly as a direct candidate at student.nielit.gov.in. 2. Clear online CBT & download digitally signed certificate.',
    official_portal_url: 'https://www.okcl.org/',
    qualification_tag: '10th / +2 / Graduate',
    summary: 'Essential guide to OKCL OS-CIT and NIELIT (BCC, CCC, O-Level) government-approved computer certifications accepted in OSSC, OSSSC, OPSC ASO, and High Court recruitments.',
    tags: ['OS-CIT', 'OKCL', 'NIELIT', 'CCC', 'O-Level', 'Computer Certificate', 'OSSC']
  },
  {
    id: 'ji-cx-sctevt-iti-wsc',
    slug: 'sctevt-polytechnic-diploma-ncvt-iti-and-world-skill-center-odisha',
    folderHints: ['world-skill-center-osda', 'diploma, iti and vocational training', 'government-recognised skill development programmes'],
    title: 'SCTE&VT Odisha Polytechnic Diploma, NCVT/SCVT ITI & World Skill Center Bhubaneswar Courses',
    title_or: 'SCTE&VT ପଲିଟେକ୍ନିକ୍ ଡିପ୍ଲୋମା, ITI ଏବଂ ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର (WSC) ଭୁବନେଶ୍ୱର ପାଠ୍ୟକ୍ରମ',
    conducting_body: 'SCTE&VT Odisha / DTE&T Odisha / OSDA / World Skill Center (WSC)',
    exam_code: 'SAMS ITI / DET Diploma / WSC Advanced Diploma',
    cadre_group: 'Technical Trades, Diploma Engineers & International Finishing-School Tracks',
    pay_matrix: 'Govt ITI/Polytechnic tuition highly subsidised; WSC Bhubaneswar offers free/scholarship-backed residential training with international placements.',
    age_limit_relaxation: 'ITI: 14+ yrs; Diploma: 14+ yrs; WSC Bhubaneswar: 18–25/28 yrs (ITI/Diploma/B.Tech pass).',
    qualification_odia_rule: 'ITI: 8th/10th pass (SAMS merit); Polytechnic: 10th pass (3-yr) or +2 Science/ITI (2-yr Lateral); WSC Bhubaneswar: ITI/Diploma pass for 1-yr Advanced Diploma in Mechatronics, Precision Engg, Cloud, HVAC, Beauty/Wellness.',
    selection_stages: 'SAMS Merit Selection (no entrance for standard ITI/Diploma); WSC Bhubaneswar conducts aptitude test + interview at Mancheswar Tower.',
    pst_pet_skill_norms: 'World Skill Center (WSC) Bhubaneswar is built in partnership with ITE Education Services (Singapore) with global industry labs.',
    documents_checklist: '10th/ITI/Diploma Marksheets, CLC, Resident & Caste Certificate, Income Certificate (for Sudakshya Girl Child Scheme — free ITI/Diploma/hostel stipend for Odisha girls).',
    application_steps: '1. Apply for ITI/Polytechnic via samsodisha.gov.in (Skill Dev & Tech Ed portal). 2. Apply for World Skill Center at worldskillcenter.org.',
    official_portal_url: 'https://worldskillcenter.org/',
    qualification_tag: '10th / ITI / Diploma',
    summary: 'Complete Odisha TVET guide covering SAMS ITI, SCTE&VT Polytechnic Diploma, Sudakshya scheme for girls, and World Skill Center (OSDA) Bhubaneswar global finishing-school courses.',
    tags: ['World Skill Center', 'OSDA', 'SCTEVT', 'ITI', 'Polytechnic', 'Sudakshya']
  },
  {
    id: 'ji-cx-ca-cma-cs-nism',
    slug: 'ca-icai-cma-icmai-cs-icsi-nism-and-irdai-certifications',
    folderHints: ['professional qualifications', 'accounting and financial software', 'international professional certifications'],
    title: 'Professional & Financial Certifications: CA (ICAI), CMA (ICMAI), CS (ICSI), NISM & IRDAI',
    title_or: 'ବୃତ୍ତିଗତ ଏବଂ ଆର୍ଥିକ ପ୍ରମାଣପତ୍ର: CA (ICAI), CMA (ICMAI), CS (ICSI), NISM ଏବଂ IRDAI',
    conducting_body: 'ICAI / ICMAI / ICSI / NISM (SEBI) / Insurance Institute of India (IRDAI)',
    exam_code: 'CA / CMA / CS / NISM Series / IRDAI IC-38',
    cadre_group: 'Statutory Accounting, Costing, Corporate Governance & Capital Markets',
    pay_matrix: 'CA/CMA/CS Freshers: ₹8–₹14 LPA; NISM/IRDAI Licensed Advisors & Mutual Fund Distributors: Salary + Trail Commission.',
    age_limit_relaxation: 'No upper age bar for CA, CMA, CS, NISM, or IRDAI certifications.',
    qualification_odia_rule: '+2 pass (Foundation/CSEET) or Graduate 55%+ (Direct Intermediate); NISM & IRDAI IC-38 open to 10th/+2/Graduates.',
    selection_stages: 'CA/CMA/CS: 3 Levels (Foundation/CSEET -> Intermediate/Executive -> Final/Professional + Articleship/Training); NISM: 100-MCQ Online Test at Bhubaneswar/Cuttack centres (₹1,500 fee, 50–60% pass, 3-yr validity).',
    pst_pet_skill_norms: 'NISM Series V-A (Mutual Fund Distributors) & Series VIII (Equity Derivatives) are mandatory SEBI licences for banking, broking & wealth management jobs.',
    documents_checklist: '+2/Graduation Marksheets, PAN Card (mandatory for NISM/AMFI ARN), Aadhaar, ICAI/ICMAI/ICSI SSP Portal Registration.',
    application_steps: '1. Register on eservices.icai.org, icmai.in, or icsi.edu (Bhubaneswar/Cuttack/Rourkela chapters). 2. For Capital Markets, register at certifications.nism.ac.in.',
    official_portal_url: 'https://certifications.nism.ac.in/',
    qualification_tag: '+2 / B.Com. / Any Graduate',
    summary: 'Guide to ICAI CA, ICMAI CMA, ICSI CS, SEBI NISM Series V-A/VIII, and IRDAI IC-38 certifications with Bhubaneswar/Cuttack chapters and banking/finance job requirements.',
    tags: ['CA', 'CMA', 'CS', 'NISM', 'IRDAI', 'SEBI', 'Financial Certifications']
  }
];

export async function enrichCoursesExamsCategory04(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Fetch all folders in Category #04 (courses-exams / courses-entrance-certifications / courses-exams-certifications)
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug IN ('courses-exams', 'courses-entrance-certifications', 'courses-exams-certifications') ORDER BY depth ASC, sort_order ASC, title ASC")
    .all();
  const folders = foldersRes.results || [];
  const folderById = new Map(folders.map(f => [f.id, f]));

  const folderStmts = [];
  for (const f of folders) {
    if (isCustomAdminEdit(f)) continue;

    const key = String(f.title || '').trim().toLowerCase();
    const parent = f.parent_id ? folderById.get(f.parent_id) : null;
    const spec = CAT04_FOLDER_ENRICHMENTS[key] || buildSmartCourseFolderEnrichment(f, parent ? parent.title : '');

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
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Courses & Exams` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat04-enrich', updated_at = ?
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

  // 2. Resolve best target folder for each of the 14 Course/Exam handbooks
  function pickFolderId(hints) {
    for (const h of hints) {
      const hl = h.toLowerCase();
      const hit = folders.find(f =>
        String(f.slug || '').toLowerCase() === hl ||
        String(f.slug || '').toLowerCase().includes(hl) ||
        String(f.title || '').toLowerCase().includes(hl)
      );
      if (hit) return hit.id;
    }
    return folders[0]?.id || 'jf-cx-state-entrance';
  }

  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug IN ('courses-exams', 'courses-entrance-certifications', 'courses-exams-certifications')")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map(r => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map(r => [r.slug, r]));

  const itemStmts = [];
  for (const hb of CAT04_HANDBOOKS) {
    const folderId = pickFolderId(hb.folderHints);
    const existing = existingById.get(hb.id) || existingBySlug.get(hb.slug);
    if (existing && existing.updated_by && !SYSTEM_AUTHORS.has(String(existing.updated_by).toLowerCase())) {
      continue;
    }

    const bodyHtml = [
      `<h2>${hb.title}</h2>`,
      `<p><strong>ଓଡ଼ିଆ ସାରାଂଶ:</strong> ${hb.title_or} — ${hb.conducting_body}</p>`,
      `<ul>`,
      `<li><strong>Conducting Authority &amp; Exam Code:</strong> ${hb.conducting_body} (${hb.exam_code})</li>`,
      `<li><strong>Target Admissions / Certifications:</strong> ${hb.cadre_group}</li>`,
      `<li><strong>Fees, Fee Waivers &amp; Scholarships:</strong> ${hb.pay_matrix}</li>`,
      `<li><strong>Age Limit &amp; Attempts:</strong> ${hb.age_limit_relaxation}</li>`,
      `<li><strong>Eligibility &amp; Odisha Quota Rules:</strong> ${hb.qualification_odia_rule}</li>`,
      `<li><strong>Exam Pattern, Marking &amp; Counselling:</strong> ${hb.selection_stages}</li>`,
      `<li><strong>Syllabus &amp; Odisha Centres:</strong> ${hb.pst_pet_skill_norms}</li>`,
      `<li><strong>Mandatory Documents Checklist:</strong> ${hb.documents_checklist}</li>`,
      `<li><strong>Step-by-Step Application &amp; Prep Strategy:</strong> ${hb.application_steps}</li>`,
      `</ul>`
    ].join('');

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'course-exam',
              recruiting_body = ?, conducting_body = ?, exam_code = ?, cadre_group = ?,
              pay_matrix = ?, age_limit_relaxation = ?, qualification_odia_rule = ?,
              selection_stages = ?, pst_pet_skill_norms = ?, documents_checklist = ?,
              application_steps = ?, qualification_tag = ?,
              official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat04-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat04-enrich', updated_at = ?
          WHERE id = ?`)
          .bind(
            folderId, hb.title, hb.title_or,
            hb.conducting_body, hb.conducting_body, hb.exam_code, hb.cadre_group,
            hb.pay_matrix, hb.age_limit_relaxation, hb.qualification_odia_rule,
            hb.selection_stages, hb.pst_pet_skill_norms, hb.documents_checklist,
            hb.application_steps, hb.qualification_tag,
            hb.official_portal_url, hb.official_portal_url,
            JSON.stringify(hb.tags), hb.summary, bodyHtml,
            `${hb.title} | CSOdisha Courses & Exams`.slice(0, 160), hb.summary.slice(0, 300),
            ts, ts, existing.id
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
          VALUES (?, 'courses-exams', ?, ?, ?, ?, 'course-exam', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat04-enrich@csodisha.com', ?, 'Odisha', 'cat04-enrich', 'cat04-enrich', ?, ?)`)
          .bind(
            hb.id, folderId, hb.title, hb.title_or, hb.slug,
            hb.conducting_body, hb.conducting_body, hb.exam_code, hb.cadre_group,
            hb.pay_matrix, hb.age_limit_relaxation, hb.qualification_odia_rule,
            hb.selection_stages, hb.pst_pet_skill_norms, hb.documents_checklist,
            hb.application_steps, hb.qualification_tag,
            hb.official_portal_url, hb.official_portal_url,
            JSON.stringify(hb.tags), hb.summary, bodyHtml,
            `${hb.title} | CSOdisha Courses & Exams`.slice(0, 160), hb.summary.slice(0, 300),
            ts, ts, ts
          )
      );
    }
  }

  for (let i = 0; i < itemStmts.length; i += 30) {
    await db.batch(itemStmts.slice(i, i + 30));
  }

  return { foldersUpdated: folderStmts.length, itemsUpserted: itemStmts.length };
}
