/**
 * Common Sense Odisha — Interactive Odisha Govt Job & Exam Clean-Sheet
 * Study Packet Compiler (/guides/ & /updates/, v433)
 * Bundles syllabus weightage, age/fee eligibility rules, certificate checklists,
 * and exam-day protocols into a single copyable, downloadable (.md), and printable dossier.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOStudyPacketCompiler = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOStudyPacketCompiler = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v433';
  var ROOT_ID = 'cso-study-packet-compiler-root';
  var PREFS_KEY = 'cso_study_packet_prefs_v1';

  var CATEGORY_PROFILES = [
    { id: 'ur-ews', en: 'UR / EWS', or: 'ସାଧାରଣ / EWS', relaxYears: 0, noteEn: 'Standard upper age limit; 10% EWS reservation with valid current-FY Income & Asset Certificate.', noteOr: 'ସାଧାରଣ ସର୍ବାଧିକ ବୟସ ସୀମା; ବୈଧ EWS ପ୍ରମାଣପତ୍ର ସହିତ 10% ସଂରକ୍ଷଣ।' },
    { id: 'sebc', en: 'SEBC', or: 'SEBC (ସାମାଜିକ ଓ ଶିକ୍ଷାଗତ ପଛୁଆ)', relaxYears: 5, noteEn: '+5 years Odisha State upper-age relaxation; valid Non-Creamy Layer SEBC Certificate required.', noteOr: 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତିରେ +5 ବର୍ଷ ବୟସ ଛାଡ଼; ବୈଧ SEBC ପ୍ରମାଣପତ୍ର ଆବଶ୍ୟକ।' },
    { id: 'sc', en: 'SC', or: 'SC (ଅନୁସୂଚିତ ଜାତି)', relaxYears: 5, noteEn: '+5 years upper-age relaxation; lifetime valid Caste Certificate from e-District Tahasildar.', noteOr: '+5 ବର୍ଷ ବୟସ ଛାଡ଼; ତହସିଲଦାରଙ୍କ ଦ୍ୱାରା ଜାରି ଜାତି ପ୍ରମାଣପତ୍ର ଆବଶ୍ୟକ।' },
    { id: 'st', en: 'ST', or: 'ST (ଅନୁସୂଚିତ ଜନଜାତି)', relaxYears: 5, noteEn: '+5 years upper-age relaxation; lifetime valid Caste Certificate from e-District Tahasildar.', noteOr: '+5 ବର୍ଷ ବୟସ ଛାଡ଼; ତହସିଲଦାରଙ୍କ ଦ୍ୱାରା ଜାରି ଜାତି ପ୍ରମାଣପତ୍ର ଆବଶ୍ୟକ।' },
    { id: 'pwbd', en: 'PwBD', or: 'ଭିନ୍ନକ୍ଷମ (PwBD)', relaxYears: 10, noteEn: '+10 years upper-age relaxation (cumulative with SC/ST/SEBC), UDID card & 20 min/hr compensatory time.', noteOr: '+10 ବର୍ଷ ବୟସ ଛାଡ଼, UDID କାର୍ଡ ଓ ଅତିରିକ୍ତ ସମୟ ସୁବିଧା।' },
    { id: 'women', en: 'Women', or: 'ମହିଳା ପ୍ରାର୍ଥୀ', relaxYears: 5, noteEn: '+5 years Odisha State upper-age relaxation & 33% horizontal women reservation across cadres.', noteOr: 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତିରେ +5 ବର୍ଷ ବୟସ ଛାଡ଼ ଓ 33% ମହିଳା ସଂରକ୍ଷଣ।' }
  ];

  var EXAM_TRACKS = [
    {
      key: 'opsc-oas',
      en: 'OPSC Odisha Civil Services (OAS / OFS / OPS)',
      or: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS / OPS)',
      board: 'OPSC',
      baseMinAge: 21,
      baseMaxAge: 38,
      feeStateEn: '₹0 (Odisha State Govt Examination Fee Exempted for All Categories)',
      feeStateOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଫି ସମସ୍ତ ବର୍ଗ ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଛାଡ଼)',
      patternEn: 'Prelims (GS Paper-I 200M + CSAT Paper-II 200M Qualifying 33%) → Mains (1750M, 7 Papers + 2 Qualifying) → Personality Test (250M). Negative Marking: -1/3rd in Prelims.',
      patternOr: 'ପ୍ରିଲିମ୍ସ (GS-I 200 + CSAT 200 ଯୋଗ୍ୟତା) → ମେନ୍ସ (1750 ମାର୍କ) → ସାକ୍ଷାତକାର (250 ମାର୍କ)। ନେଗେଟିଭ୍ ମାର୍କିଂ: -1/3।',
      weightage: [
        'Polity, Governance & Odisha Admin: 22%',
        'History, Art, Culture & Paika/Freedom Movement: 20%',
        'Geography, Environment & Odisha Rivers/Ramsar: 18%',
        'Economy, Odisha Budget & Welfare Schemes: 18%',
        'Current Affairs & Science-Tech: 22%'
      ],
      certs: [
        'HSC (10th) Certificate for DOB & Odia Pass Proof (M.E./HSC Odia)',
        'Bachelor’s Degree Certificate & All Semester Marksheets',
        'e-District Odisha Resident & Caste/SEBC/EWS/UDID Certificate',
        'Aadhaar Card + Recent Passport Photos + OPSC Online Application Copy'
      ]
    },
    {
      key: 'ossc-cglre',
      en: 'OSSC Combined Graduate Level (CGLRE)',
      or: 'OSSC ସମ୍ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGLRE)',
      board: 'OSSC',
      baseMinAge: 21,
      baseMaxAge: 38,
      feeStateEn: '₹0 (Odisha State Govt Examination Fee Exempted for All Categories)',
      feeStateOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଫି ଛାଡ଼)',
      patternEn: 'Prelims (150 Qs / 150 Marks, 150 mins — Arithmetic, DI, Reasoning, Current Affairs, Computer) → Mains (Language 100M + GS 100M) → Computer Skill Test (50M Qualifying). Negative: -0.25.',
      patternOr: 'ପ୍ରିଲିମ୍ସ (150 ପ୍ରଶ୍ନ / 150 ମାର୍କ) → ମେନ୍ସ (ଭାଷା 100 + GS 100) → କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା। ନେଗେଟିଭ୍: -0.25।',
      weightage: [
        'Arithmetic & Data Interpretation (10th Standard): 36%',
        'Logical Reasoning & Analytical Ability: 24%',
        'Current Events (National & Odisha): 20%',
        'Computer & Internet Awareness: 20%'
      ],
      certs: [
        'HSC (10th) Certificate + Odia Language Pass Proof',
        'Graduation Certificate & Consolidated Marksheet',
        'e-District Resident & Caste/SEBC/EWS Certificate (Barcode Verified)',
        'Aadhaar Card & OSSC Admit Card / Bio-Data Form'
      ]
    },
    {
      key: 'osssc-district',
      en: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS / ICDS)',
      or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / SFS / ICDS)',
      board: 'OSSSC',
      baseMinAge: 20,
      baseMaxAge: 38,
      feeStateEn: '₹0 (Odisha State Govt Examination Fee Exempted for All Categories)',
      feeStateOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଫି ଛାଡ଼)',
      patternEn: 'Prelims (100M, 1.5 hrs — Math, GS, English, Odia, Reasoning) → Mains (180M, 3 hrs — Math, GS, English, Odia, Computer) → Practical Computer Skill Test (50M). Negative: -0.33.',
      patternOr: 'ପ୍ରିଲିମ୍ସ (100 ମାର୍କ) → ମେନ୍ସ (180 ମାର୍କ) → କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା (50 ମାର୍କ)। ନେଗେଟିଭ୍: -0.33।',
      weightage: [
        'Mathematics & Quantitative Aptitude: 22%',
        'General Studies & Odisha GK: 22%',
        'English Language & Comprehension: 20%',
        'Odia Language & Grammar: 20%',
        'Computer Knowledge & Reasoning: 16%'
      ],
      certs: [
        '10th, +2 & Graduation Certificates (Post-Specific)',
        'e-District Odisha Resident Certificate (District Cadre Proof)',
        'Valid Caste / SEBC / EWS / Sports / Ex-Serviceman Certificate',
        'Aadhaar Card & Active Employment Exchange Registration (if applicable)'
      ]
    },
    {
      key: 'oprb-si',
      en: 'Odisha Police Sub-Inspector (OPRB SI — CPSE)',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ସବ୍-ଇନ୍ସପେକ୍ଟର (OPRB SI — CPSE)',
      board: 'OPRB',
      baseMinAge: 21,
      baseMaxAge: 25,
      feeStateEn: '₹0 (Odisha State Govt Examination Fee Exempted for All Categories)',
      feeStateOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଫି ଛାଡ଼)',
      patternEn: 'OMR/CBT Paper-I (General English & Odia 100M, 90 mins) + Paper-II (General Studies 200M, 180 mins) → PST/PET (Height/Chest + 1.6 km Run + Long Jump). Negative: -0.25.',
      patternOr: 'ପେପର-I (ଇଂରାଜୀ ଓ ଓଡ଼ିଆ 100 ମାର୍କ) + ପେପର-II (GS 200 ମାର୍କ) → PST/PET। ନେଗେଟିଭ୍: -0.25।',
      weightage: [
        'General Studies, Indian & Odisha Polity/History/Geo: 45%',
        'Reasoning, Quantitative & Computer Aptitude: 22%',
        'General English Language: 17%',
        'Odia Language & Grammar: 16%'
      ],
      certs: [
        '10th & Graduation Degree Certificate + Odia Pass Proof',
        'e-District Caste/SEBC/Resident Certificate (for Height/Chest Relaxation)',
        'NCC B/C Certificate (if claiming bonus marks)',
        'Valid Photo ID (Aadhaar / Voter ID / Driving Licence) & Admit Card'
      ]
    },
    {
      key: 'ltr-oav-teacher',
      en: 'LTR / SSD / OAV Secondary School Teacher (TGT / PGT)',
      or: 'LTR / SSD / OAV ମାଧ୍ୟମିକ ଶିକ୍ଷକ (TGT / PGT)',
      board: 'OSSC / OAVS',
      baseMinAge: 21,
      baseMaxAge: 38,
      feeStateEn: '₹0 (LTR / SSD via OSSC); OAVS Fee per Notification (SC/ST/PwBD Exempted)',
      feeStateOr: '₹0 (LTR / SSD OSSC); OAVS ବିଜ୍ଞପ୍ତି ଅନୁସାରେ',
      patternEn: 'Prelims (100M — GS, Reasoning, Arithmetic, Computer, Current Affairs) → Mains Subject Paper (150M — Pedagogy + Core Subject). Negative: -0.25.',
      patternOr: 'ପ୍ରିଲିମ୍ସ (100 ମାର୍କ) → ମେନ୍ସ ବିଷୟ ପେପର (150 ମାର୍କ — ଶିକ୍ଷାଶାସ୍ତ୍ର + ମୂଳ ବିଷୟ)। ନେଗେଟିଭ୍: -0.25।',
      weightage: [
        'Core Teaching Subject (Arts / PCM / CBZ / Hindi / Sanskrit): 65%',
        'Pedagogy, Educational Management & Evaluation: 20%',
        'General Awareness, Reasoning & Computer (Prelims): 15%'
      ],
      certs: [
        'Graduation / PG Marksheets verifying Subject Combination & % (50% UR / 45% Reserved)',
        'NCTE-Recognized B.Ed. / B.P.Ed. / ITEP Degree Certificate',
        'Valid OSSTET / OTET Pass Certificate (Lifetime Validity)',
        'e-District Resident & Caste/SEBC/EWS/PwBD Certificate + Odia Proof'
      ]
    },
    {
      key: 'osssc-forest',
      en: 'OSSSC Forest Guard / Forester / Livestock Inspector',
      or: 'OSSSC ଫରେଷ୍ଟ ଗାର୍ଡ / ଫରେଷ୍ଟର / ପ୍ରାଣୀଧନ ନିରୀକ୍ଷକ',
      board: 'OSSSC',
      baseMinAge: 18,
      baseMaxAge: 38,
      feeStateEn: '₹0 (Odisha State Govt Examination Fee Exempted for All Categories)',
      feeStateOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଫି ଛାଡ଼)',
      patternEn: 'CBT Written (150M, 2.5 hrs — English, Odia, Arithmetic, GK, Computer, General Science) → Physical Standard & Walking Test (25 km Male / 16 km Female in 4 hrs). Negative: -0.50.',
      patternOr: 'CBT ଲିଖିତ (150 ମାର୍କ) → ଶାରୀରିକ ମାନଦଣ୍ଡ ଓ ଚାଲିବା ପରୀକ୍ଷା (25 କିମି ପୁରୁଷ / 16 କିମି ମହିଳା)। ନେଗେଟିଭ୍: -0.50।',
      weightage: [
        'General Science & Environment: 20%',
        'Arithmetic (10th Standard): 17%',
        'General Knowledge & Odisha Geography: 17%',
        'English & Odia Language: 30%',
        'Basic Computer Knowledge: 16%'
      ],
      certs: [
        '10th / +2 Science Marksheet & Board Certificate (Post-Specific)',
        'e-District Resident & Caste/SEBC Certificate (Height/Chest Norm)',
        'Medical Fitness & Vision Readiness for 25 km / 16 km Walk Test',
        'Aadhaar Card & OSSSC Admit Card'
      ]
    },
    {
      key: 'ossc-chsl-ja',
      en: 'OSSC CHSL (10+2) & Junior Assistant / DEO',
      or: 'OSSC CHSL (10+2) ଓ ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ / DEO',
      board: 'OSSC',
      baseMinAge: 21,
      baseMaxAge: 38,
      feeStateEn: '₹0 (Odisha State Govt Examination Fee Exempted for All Categories)',
      feeStateOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଫି ଛାଡ଼)',
      patternEn: 'Prelims (150M — Arithmetic, DI, Reasoning, Current Affairs, Computer) → Mains (Technical / Language Paper) → Typing & Computer Skill Test (30 WPM EN / 16–20 WPM Odia). Negative: -0.25.',
      patternOr: 'ପ୍ରିଲିମ୍ସ (150 ମାର୍କ) → ମେନ୍ସ → ଟାଇପିଂ ଓ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା। ନେଗେଟିଭ୍: -0.25।',
      weightage: [
        'Arithmetic & Data Interpretation: 35%',
        'Logical Reasoning & Mental Ability: 25%',
        'Computer & MS Office Fundamentals: 20%',
        'Current Affairs & General Awareness: 20%'
      ],
      certs: [
        '10th & +2 (10+2) Certificates + Odia Pass Proof',
        'PGDCA / DCA / Computer Proficiency Certificate (if post-mandated)',
        'e-District Resident & Caste/SEBC/EWS Certificate',
        'Aadhaar Card & OSSC Admit Card'
      ]
    },
    {
      key: 'ctet-otet-osstet',
      en: 'CBSE CTET / OTET / OSSTET Teaching Eligibility',
      or: 'CBSE CTET / OTET / OSSTET ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା',
      board: 'CBSE / BSE Odisha',
      baseMinAge: 18,
      baseMaxAge: 99,
      feeStateEn: 'Central CTET: ₹1,000–₹1,200 (UR/OBC), ₹500–₹600 (SC/ST/PwBD) · OTET/OSSTET: ₹600 (UR/SEBC), ₹400 (SC/ST)',
      feeStateOr: 'CTET: ₹1,000–₹1,200 (UR), ₹500–₹600 (SC/ST/PwBD) · OTET/OSSTET: ₹600 (UR), ₹400 (SC/ST)',
      patternEn: '150 MCQs / 150 Marks (150 mins) — Zero Negative Marking! Qualifying Cut-off: 60% (90/150) for UR; 50% (75/150) for SC/ST/SEBC/PwBD in OTET/OSSTET (55% for CTET Reserved).',
      patternOr: '150 ପ୍ରଶ୍ନ / 150 ମାର୍କ (150 ମିନିଟ୍) — କୌଣସି ନେଗେଟିଭ୍ ମାର୍କିଂ ନାହିଁ! ପାସ୍ ମାର୍କ: UR 60% (90), ସଂରକ୍ଷିତ 50% (75)।',
      weightage: [
        'Child Development & Pedagogy (CDP): 20%',
        'Language-I (Odia) & Language-II (English): 40%',
        'Mathematics / EVS / Core Subject Stream: 40%'
      ],
      certs: [
        '10th, +2, Graduation & D.El.Ed. / B.Ed. Marksheets / Appearing Proof',
        'Academic Bank of Credits (ABC ID) & DigiLocker Aadhaar Link',
        'e-District Caste / SEBC / PwBD Certificate (for Qualifying % Relaxation)',
        'Admit Card & Valid Photo ID Proof'
      ]
    }
  ];

  var EXAM_DAY_PROTOCOL = [
    'T-90 mins: Reach test center zone to avoid morning traffic & locate exam wing.',
    'T-60 mins: Complete biometric / frisking queue check with Printed Admit Card + Original Photo ID (Aadhaar / Voter ID / PAN / DL) + 2 Passport Photos.',
    'T-30 mins: STRICT GATE CLOSURE — no candidate entry permitted after gate closure.',
    'Prohibited Items: Mobile phones, smartwatches, Bluetooth earpieces, calculators, metallic jewellery, wallets & chits are strictly barred inside OMR/CBT halls.'
  ];

  function getTrack(trackKey) {
    var key = String(trackKey || 'opsc-oas').toLowerCase();
    for (var i = 0; i < EXAM_TRACKS.length; i += 1) {
      if (EXAM_TRACKS[i].key === key) return EXAM_TRACKS[i];
    }
    return EXAM_TRACKS[0];
  }

  function getCategory(catId) {
    var id = String(catId || 'ur-ews').toLowerCase();
    for (var i = 0; i < CATEGORY_PROFILES.length; i += 1) {
      if (CATEGORY_PROFILES[i].id === id) return CATEGORY_PROFILES[i];
    }
    return CATEGORY_PROFILES[0];
  }

  function compileStudyPacket(trackKey, options) {
    var opts = options || {};
    var track = getTrack(trackKey);
    var cat = getCategory(opts.category || 'ur-ews');
    var candidateName = String(opts.candidateName || '').trim();
    var targetDate = String(opts.targetDate || '').trim();
    var includeSyllabus = opts.includeSyllabus !== false;
    var includeEligibility = opts.includeEligibility !== false;
    var includeCertificates = opts.includeCertificates !== false;
    var includeExamDay = opts.includeExamDay !== false;

    var effectiveMaxAge = track.baseMaxAge >= 99
      ? 'No Upper Age Limit'
      : (track.baseMaxAge + cat.relaxYears) + ' years (Base ' + track.baseMaxAge + ' + ' + cat.relaxYears + ' yrs ' + cat.en + ' relaxation)';

    var sections = [];
    if (includeSyllabus) {
      sections.push({
        id: 'syllabus',
        titleEn: 'Section 1 — Exam Pattern, Negative Marking & Subject Weightage',
        titleOr: 'ବିଭାଗ ୧ — ପରୀକ୍ଷା ପଦ୍ଧତି, ନେଗେଟିଭ୍ ମାର୍କିଂ ଓ ବିଷୟ ଭାରାଙ୍କ',
        bodyEn: track.patternEn,
        bodyOr: track.patternOr,
        bullets: track.weightage
      });
    }
    if (includeEligibility) {
      sections.push({
        id: 'eligibility',
        titleEn: 'Section 2 — Age Limits, Category Relaxation & Application Fee Rules',
        titleOr: 'ବିଭାଗ ୨ — ବୟସ ସୀମା, ବର୍ଗଭିତ୍ତିକ ଛାଡ଼ ଓ ଆବେଦନ ଫି ନିୟମ',
        bodyEn: 'Age Band (' + cat.en + '): ' + track.baseMinAge + ' to ' + effectiveMaxAge + '. ' + cat.noteEn,
        bodyOr: 'ବୟସ ସୀମା (' + cat.or + '): ' + track.baseMinAge + ' ରୁ ' + effectiveMaxAge + '। ' + cat.noteOr,
        bullets: [
          'Application Fee Rule: ' + track.feeStateEn,
          'Category Note: ' + cat.noteEn
        ]
      });
    }
    if (includeCertificates) {
      sections.push({
        id: 'certificates',
        titleEn: 'Section 3 — Mandatory Certificate & Verification Enclosure Checklist',
        titleOr: 'ବିଭାଗ ୩ — ବାଧ୍ୟତାମୂଳକ ପ୍ରମାଣପତ୍ର ଓ ଯାଞ୍ଚ ତାଲିକା',
        bodyEn: 'Keep originals + 2 self-attested photocopy sets verified against e-District Odisha barcode records.',
        bodyOr: 'ମୂଳ ପ୍ରମାଣପତ୍ର + ୨ ସେଟ୍ ସ୍ୱ-ପ୍ରମାଣିତ ଫଟୋକପି ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ବାର୍ କୋଡ୍ ଯାଞ୍ଚ ସହିତ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।',
        bullets: track.certs
      });
    }
    if (includeExamDay) {
      sections.push({
        id: 'exam-day',
        titleEn: 'Section 4 — Exam-Day Gate Closure Timeline & OMR/CBT Protocol',
        titleOr: 'ବିଭାଗ ୪ — ପରୀକ୍ଷା ଦିନ ଗେଟ୍ ବନ୍ଦ ସମୟସୀମା ଓ ନିୟମାବଳୀ',
        bodyEn: 'Follow strict Odisha OPSC/OSSC/OSSSC/NTA reporting buffers to avoid last-minute gate refusal.',
        bodyOr: 'ଶେଷ ମୁହୂର୍ତ୍ତର ଅସୁବିଧା ଏଡ଼ାଇବାକୁ କଡ଼ାକଡ଼ି ଗେଟ୍ ବନ୍ଦ ସମୟସୀମା ପାଳନ କରନ୍ତୁ।',
        bullets: EXAM_DAY_PROTOCOL
      });
    }

    var mdLines = [
      '# CS Odisha Clean-Sheet Study Dossier — ' + track.en,
      candidateName ? ('**Candidate:** ' + candidateName + ' | **Category:** ' + cat.en) : ('**Category:** ' + cat.en),
      targetDate ? ('**Target Exam Date:** ' + targetDate + ' | **Board:** ' + track.board) : ('**Board:** ' + track.board),
      ''
    ];
    sections.forEach(function (sec) {
      mdLines.push('## ' + sec.titleEn);
      mdLines.push(sec.bodyEn);
      sec.bullets.forEach(function (b) { mdLines.push('- [ ] ' + b); });
      mdLines.push('');
    });
    mdLines.push('---');
    mdLines.push('Generated offline on Common Sense Odisha — https://csodisha.com/guides/');

    var markdown = mdLines.join('\n');
    return {
      track: track,
      category: cat,
      candidateName: candidateName,
      targetDate: targetDate,
      effectiveMaxAge: effectiveMaxAge,
      sections: sections,
      markdown: markdown,
      plainText: markdown.replace(/^#+\s*/gm, '').replace(/\*\*/g, '')
    };
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savePrefs(state) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function copyText(str) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(str);
    }
    return new Promise(function (resolve) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = str;
        ta.className = 'cso-sr-only';
        doc.body.appendChild(ta);
        ta.select();
        doc.execCommand('copy');
        ta.remove();
      } catch (_) {}
      resolve();
    });
  }

  function downloadFile(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (_) {}
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      trackKey: saved.trackKey || 'opsc-oas',
      category: saved.category || 'ur-ews',
      candidateName: saved.candidateName || '',
      targetDate: saved.targetDate || '2026-12-20',
      includeSyllabus: saved.includeSyllabus !== false,
      includeEligibility: saved.includeEligibility !== false,
      includeCertificates: saved.includeCertificates !== false,
      includeExamDay: saved.includeExamDay !== false
    };

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var packet = compileStudyPacket(state.trackKey, state);

      var card = el('div', 'cso-spc-card');
      card.setAttribute('data-cso-study-packet-compiler', '1');

      // Header
      var head = el('div', 'cso-spc-head');
      var headCopy = el('div', 'cso-spc-head-copy');
      headCopy.appendChild(el('div', 'cso-spc-eyebrow', orMode
        ? '📑 କ୍ଲିନ୍-ସିଟ୍ ଅଧ୍ୟୟନ ପ୍ୟାକେଟ୍ କମ୍ପାଇଲର୍ (/GUIDES/ & /UPDATES/)'
        : '📑 CLEAN-SHEET ODISHA EXAM STUDY PACKET COMPILER'));
      headCopy.appendChild(el('h2', 'cso-spc-title', orMode
        ? '୧-କ୍ଲିକ୍ ଓଡ଼ିଶା ପରୀକ୍ଷା ରିଭିଜନ୍ ଡୋସିଅର୍ ଓ ପ୍ରିଣ୍ଟେବଲ୍ ପ୍ୟାକେଟ୍'
        : '1-Click Odisha Govt Exam Revision Dossier & Printable Packet'));
      headCopy.appendChild(el('p', 'cso-spc-sub', orMode
        ? 'ଯେକୌଣସି ଓଡ଼ିଶା ପରୀକ୍ଷାର ସିଲାବସ୍ ଭାରାଙ୍କ, ବୟସ ଓ ଫି ନିୟମ, ପ୍ରମାଣପତ୍ର ତାଲିକା ଓ ପରୀକ୍ଷା ଦିନର ପ୍ରୋଟୋକଲ୍ କୁ ଗୋଟିଏ ପ୍ରିଣ୍ଟେବଲ୍ ପ୍ୟାକେଟ୍ ରେ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।'
        : 'Bundle syllabus weightage, category age/fee rules, mandatory certificates, and exam-day gate timelines into a single printable & downloadable revision packet.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-spc-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-spc-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Controls Form
      var form = el('div', 'cso-spc-form');
      var grid = el('div', 'cso-spc-grid');

      function addField(label, ctrl) {
        var box = el('div', 'cso-spc-field');
        var lbl = el('label', 'cso-spc-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }

      var trackSel = el('select', 'cso-spc-input');
      trackSel.id = 'cso-spc-track';
      EXAM_TRACKS.forEach(function (t) {
        var opt = el('option', '', orMode ? t.or : t.en);
        opt.value = t.key;
        if (t.key === state.trackKey) opt.selected = true;
        trackSel.appendChild(opt);
      });
      trackSel.addEventListener('change', function () { state.trackKey = trackSel.value; persistAndRender(); });
      addField(orMode ? 'ପରୀକ୍ଷା ଟ୍ରାକ୍ ବାଛନ୍ତୁ (8 ଟି ଓଡ଼ିଶା ପରୀକ୍ଷା)' : 'Select Odisha Exam Track (8 Tracks)', trackSel);

      var catSel = el('select', 'cso-spc-input');
      catSel.id = 'cso-spc-cat';
      CATEGORY_PROFILES.forEach(function (c) {
        var opt = el('option', '', orMode ? c.or : c.en);
        opt.value = c.id;
        if (c.id === state.category) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.addEventListener('change', function () { state.category = catSel.value; persistAndRender(); });
      addField(orMode ? 'ପ୍ରାର୍ଥୀ ବର୍ଗ (ବୟସ ଓ ଫି ଛାଡ଼)' : 'Candidate Category (Age & Fee Rules)', catSel);

      var nameInp = el('input', 'cso-spc-input');
      nameInp.id = 'cso-spc-name';
      nameInp.type = 'text';
      nameInp.placeholder = orMode ? 'ପ୍ରିଣ୍ଟ୍ ହେଡର୍ ପାଇଁ ନାମ (ଇଚ୍ଛାଧୀନ)' : 'Optional name for printed header';
      nameInp.value = state.candidateName;
      nameInp.addEventListener('change', function () { state.candidateName = nameInp.value.trim(); persistAndRender(); });
      addField(orMode ? 'ପ୍ରାର୍ଥୀଙ୍କ ନାମ (ଇଚ୍ଛାଧୀନ)' : 'Candidate Name (Optional)', nameInp);

      var dateInp = el('input', 'cso-spc-input');
      dateInp.id = 'cso-spc-date';
      dateInp.type = 'date';
      dateInp.value = state.targetDate;
      dateInp.addEventListener('change', function () { state.targetDate = dateInp.value; persistAndRender(); });
      addField(orMode ? 'ଲକ୍ଷ୍ୟ ପରୀକ୍ଷା ତାରିଖ (.ics ପାଇଁ)' : 'Target Exam Date (for .ics Reminder)', dateInp);

      form.appendChild(grid);

      // Toggleable Modules
      var modRow = el('div', 'cso-spc-toggles');
      [
        { key: 'includeSyllabus', en: '1. Syllabus & Weightage', or: '୧. ସିଲାବସ୍ ଓ ଭାରାଙ୍କ' },
        { key: 'includeEligibility', en: '2. Age & Fee Rules', or: '୨. ବୟସ ଓ ଫି ନିୟମ' },
        { key: 'includeCertificates', en: '3. Certificate Checklist', or: '୩. ପ୍ରମାଣପତ୍ର ତାଲିକା' },
        { key: 'includeExamDay', en: '4. Exam-Day Protocol', or: '୪. ପରୀକ୍ଷା ଦିନ ପ୍ରୋଟୋକଲ୍' }
      ].forEach(function (m) {
        var lbl = el('label', 'cso-spc-toggle-pill');
        var cb = el('input', 'cso-spc-checkbox');
        cb.type = 'checkbox';
        cb.checked = Boolean(state[m.key]);
        cb.addEventListener('change', function () { state[m.key] = cb.checked; persistAndRender(); });
        lbl.appendChild(cb);
        lbl.appendChild(el('span', '', orMode ? m.or : m.en));
        modRow.appendChild(lbl);
      });
      form.appendChild(modRow);
      card.appendChild(form);

      // Live Structured Preview Card (#cso-study-packet-preview)
      var preview = el('div', 'cso-spc-preview');
      preview.id = 'cso-study-packet-preview';
      var pHead = el('div', 'cso-spc-preview-head');
      pHead.appendChild(el('h3', 'cso-spc-preview-title', (orMode ? packet.track.or : packet.track.en)));
      var pMeta = [
        (orMode ? 'ବୋର୍ଡ: ' : 'Board: ') + packet.track.board,
        (orMode ? 'ବର୍ଗ: ' : 'Category: ') + (orMode ? packet.category.or : packet.category.en),
        packet.candidateName ? ((orMode ? 'ପ୍ରାର୍ଥୀ: ' : 'Candidate: ') + packet.candidateName) : '',
        packet.targetDate ? ((orMode ? 'ଲକ୍ଷ୍ୟ ତାରିଖ: ' : 'Target Date: ') + packet.targetDate) : ''
      ].filter(Boolean).join(' · ');
      pHead.appendChild(el('div', 'cso-spc-preview-meta', pMeta));
      preview.appendChild(pHead);

      if (packet.sections.length === 0) {
        preview.appendChild(el('p', 'cso-spc-empty', orMode ? 'ଅତି କମରେ ଗୋଟିଏ ଡୋସିଅର୍ ବିଭାଗ ବାଛନ୍ତୁ।' : 'Select at least one dossier module above to compile your study packet.'));
      } else {
        var secGrid = el('div', 'cso-spc-sections');
        packet.sections.forEach(function (sec) {
          var box = el('div', 'cso-spc-section');
          box.appendChild(el('h4', 'cso-spc-sec-title', orMode ? sec.titleOr : sec.titleEn));
          box.appendChild(el('p', 'cso-spc-sec-body', orMode ? sec.bodyOr : sec.bodyEn));
          var ul = el('ul', 'cso-spc-list');
          sec.bullets.forEach(function (b) { ul.appendChild(el('li', '', b)); });
          box.appendChild(ul);
          secGrid.appendChild(box);
        });
        preview.appendChild(secGrid);
      }
      card.appendChild(preview);

      // 1-Click Actions
      var actions = el('div', 'cso-spc-actions');
      var statusEl = el('span', 'cso-spc-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-spc-btn cso-spc-btn--primary', orMode ? '📋 ସମ୍ପୂର୍ଣ୍ଣ ଅଧ୍ୟୟନ ଡୋସିଅର୍ କପି କରନ୍ତୁ' : '📋 Copy Full Study Dossier');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        copyText(packet.plainText).then(function () {
          statusEl.textContent = orMode ? '✅ ଡୋସିଅର୍ କପି ହୋଇଗଲା!' : '✅ Study dossier copied to clipboard!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var dlBtn = el('button', 'cso-spc-btn', orMode ? '📥 ପ୍ୟାକେଟ୍ ଡାଉନଲୋଡ୍ (.md)' : '📥 Download Study Packet (.md)');
      dlBtn.type = 'button';
      dlBtn.addEventListener('click', function () {
        downloadFile('cso-study-packet-' + packet.track.key + '.md', packet.markdown, 'text/markdown;charset=utf-8');
        statusEl.textContent = orMode ? '✅ .md ଫାଇଲ୍ ଡାଉନଲୋଡ୍ ହେଲା!' : '✅ Downloaded .md revision packet!';
        setTimeout(function () { statusEl.textContent = ''; }, 2400);
      });
      actions.appendChild(dlBtn);

      var icsBtn = el('button', 'cso-spc-btn', orMode ? '📅 ପରୀକ୍ଷା ରିମାଇଣ୍ଡର୍ (.ics)' : '📅 Add Target Exam Reminder (.ics)');
      icsBtn.type = 'button';
      icsBtn.addEventListener('click', function () {
        var dt = state.targetDate || '2026-12-20';
        var ev = {
          title: packet.track.en + ' — Target Exam Date',
          dateText: dt,
          description: packet.track.patternEn,
          url: 'https://csodisha.com/guides/#cso-study-packet-compiler-root',
          location: 'Odisha Exam Center'
        };
        if (win.CSOCalendarExport && typeof win.CSOCalendarExport.downloadSingleEvent === 'function') {
          win.CSOCalendarExport.downloadSingleEvent(ev, 'cso-exam-' + packet.track.key);
        } else {
          var ymd = dt.replace(/-/g, '');
          var ics = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Common Sense Odisha//Study Packet v433//EN',
            'BEGIN:VEVENT', 'UID:cso-spc-' + packet.track.key + '@csodisha.com',
            'DTSTART;VALUE=DATE:' + ymd, 'SUMMARY:' + ev.title, 'DESCRIPTION:' + ev.description,
            'END:VEVENT', 'END:VCALENDAR'
          ].join('\r\n');
          downloadFile('cso-exam-' + packet.track.key + '.ics', ics, 'text/calendar;charset=utf-8');
        }
      });
      actions.appendChild(icsBtn);

      var printBtn = el('button', 'cso-spc-btn', orMode ? '🖨️ କ୍ଲିନ୍-ସିଟ୍ ଡୋସିଅର୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Clean-Sheet Revision Dossier');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(statusEl);
      card.appendChild(actions);

      container.replaceChildren(card);
    }

    render();
    return { render: render, getState: function () { return Object.assign({}, state); } };
  }

  function autoMount() {
    if (!doc) return;
    var root = doc.getElementById(ROOT_ID);
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', autoMount);
    } else {
      autoMount();
    }
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    CATEGORY_PROFILES: CATEGORY_PROFILES,
    EXAM_TRACKS: EXAM_TRACKS,
    EXAM_DAY_PROTOCOL: EXAM_DAY_PROTOCOL,
    getTrack: getTrack,
    getCategory: getCategory,
    compileStudyPacket: compileStudyPacket,
    mount: mount
  };
});
