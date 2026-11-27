/**
 * Common Sense Odisha — Interactive Candidate Toolkit Quick-Jump Directory
 * & Live Search Index (/tools/, v430)
 * Mounted at the top of tools/index.html (#cso-tools-quick-jump-root).
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens; >=44px tap targets.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOToolsQuickJumpDirectory = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOToolsQuickJumpDirectory = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v430';
  var ROOT_ID = 'cso-tools-quick-jump-root';
  var PREFS_KEY = 'cso_tools_directory_prefs_v1';

  var CATEGORIES = [
    { id: 'all', en: 'All Tools', or: 'ସବୁ ଉପକରଣ' },
    { id: 'calculators', en: 'Calculators & Estimators', or: 'କାଲକୁଲେଟର ଓ ଆକଳନ' },
    { id: 'exam-practice', en: 'Exam & Skill Practice', or: 'ପରୀକ୍ଷା ଓ ଦକ୍ଷତା ଅଭ୍ୟାସ' },
    { id: 'certificates', en: 'Certificates & Verification', or: 'ପ୍ରମାଣପତ୍ର ଓ ଯାଞ୍ଚ' },
    { id: 'offline-backup', en: 'Offline & Backup', or: 'ଅଫଲାଇନ୍ ଓ ବ୍ୟାକଅପ୍' }
  ];

  var TOOL_CATALOG = [
    // 1. Calculators & Estimators
    {
      id: 'orsp-salary',
      category: 'calculators',
      targetId: 'cso-orsp-salary-estimator-root',
      badgeEn: 'Pay Matrix',
      badgeOr: 'ବେତନ ସାରଣୀ',
      titleEn: 'ORSP 7th Pay Commission Salary & In-Hand Estimator',
      titleOr: 'ORSP ସପ୍ତମ ବେତନ ଓ ଇନ୍-ହ୍ୟାଣ୍ଡ୍ ସାଲାରୀ କାଲକୁଲେଟର',
      descEn: 'Compute Odisha Level 1–17 basic pay, 63% DA, HRA slabs, NPS/GPF & 5-year increments.',
      descOr: 'ସ୍ତର ୧–୧୭ ମୂଳ ବେତନ, 63% DA, HRA ସ୍ଲାବ୍, NPS/GPF ଓ ୫-ବର୍ଷ ବୃଦ୍ଧି ଗଣନା କରନ୍ତୁ।',
      keywords: 'salary orsp 7th pay da hra nps gpf basic level in-hand ବେତନ ଦରମା ସାଲାରୀ'
    },
    {
      id: 'multi-post-eligibility',
      category: 'calculators',
      targetId: 'cso-multi-post-eligibility-root',
      badgeEn: 'Age & Fee Matrix',
      badgeOr: 'ବୟସ ଓ ଫି ମ୍ୟାଟ୍ରିକ୍ସ',
      titleEn: 'Multi-Post Age Relaxation & ₹0 Fee Exemption Matrix',
      titleOr: 'ଏକାଧିକ ପଦବୀ ବୟସ ଛାଡ଼ ଓ ₹0 ଫି ଛାଡ଼ ମ୍ୟାଟ୍ରିକ୍ସ',
      descEn: 'Evaluate DOB, category, gender & PwBD age cutoffs and fee waivers across all Odisha drives.',
      descOr: 'ଜନ୍ମ ତାରିଖ, ବର୍ଗ, ଲିଙ୍ଗ ଓ PwBD ଅନୁସାରେ ସମସ୍ତ ନିଯୁକ୍ତିର ବୟସ ଓ ଫି ଛାଡ଼ ଯାଞ୍ଚ କରନ୍ତୁ।',
      keywords: 'age dob relaxation fee exemption multi post matrix opsc ossc osssc pwbd ବୟସ ଫି ଛାଡ଼'
    },
    {
      id: 'cgpa-converter',
      category: 'calculators',
      targetId: 'cso-cgpa-converter-root',
      badgeEn: 'University Marks',
      badgeOr: 'ବିଶ୍ୱବିଦ୍ୟାଳୟ ମାର୍କ',
      titleEn: 'Odisha University CGPA / SGPA to Percentage & Marks Converter',
      titleOr: 'ଓଡ଼ିଶା ବିଶ୍ୱବିଦ୍ୟାଳୟ CGPA / SGPA ରୁ ଶତକଡ଼ା କନଭର୍ଟର',
      descEn: 'Official formulas for Utkal, BPUT, Sambalpur, Berhampur, FM, Ravenshaw & Rama Devi.',
      descOr: 'ଉତ୍କଳ, BPUT, ସମ୍ବଲପୁର, ବ୍ରହ୍ମପୁର, ରେଭେନ୍ସା ଓ ରମାଦେବୀ ପାଇଁ ସରକାରୀ ସୂତ୍ର।',
      keywords: 'cgpa sgpa percentage marks bput utkal sambalpur berhampur ravenshaw ଶତକଡ଼ା ମାର୍କ'
    },
    {
      id: 'pet-pst-standards',
      category: 'calculators',
      targetId: 'cso-pet-pst-standards-root',
      badgeEn: 'Physical Standards',
      badgeOr: 'ଶାରୀରିକ ମାନଦଣ୍ଡ',
      titleEn: 'Odisha Police SI, Constable, Forest Guard & Excise PET/PST Checker',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI, କନଷ୍ଟେବଲ୍, ଫରେଷ୍ଟ ଗାର୍ଡ PET/PST ଯାଞ୍ଚ',
      descEn: 'Verify height, chest, weight/BMI, running, long jump & high jump by gender & category.',
      descOr: 'ଉଚ୍ଚତା, ଛାତି, ଓଜନ/BMI, ଦୌଡ଼, ଲମ୍ବ ଡିଆଁ ଓ ଉଚ୍ଚ ଡିଆଁ ମାନଦଣ୍ଡ ଯାଞ୍ଚ କରନ୍ତୁ।',
      keywords: 'police si constable forest guard excise pet pst height chest running bmi ପୋଲିସ୍ ଶାରୀରିକ'
    },
    {
      id: 'income-tax-macp',
      category: 'calculators',
      href: '/career-paths/#cso-income-tax-takehome-root',
      badgeEn: 'Career Paths Hub',
      badgeOr: 'କ୍ୟାରିଅର ପଥ ହବ୍',
      titleEn: 'FY 2026–27 Income Tax (New vs. Old) & MACP Progression Simulators',
      titleOr: 'FY 2026–27 ଆୟକର (ନୂଆ ବନାମ ପୁରୁଣା) ଓ MACP ପଦୋନ୍ନତି ସିମୁଲେଟର',
      descEn: 'Compare New vs. Old tax regimes with 80CCD(2), PT & 10/20/30-yr MACP pay growth.',
      descOr: '80CCD(2), ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ ଓ ୧୦/୨୦/୩୦-ବର୍ଷ MACP ସହିତ ଆୟକର ତୁଳନା କରନ୍ତୁ।',
      keywords: 'income tax new old regime macp promotion ups nps tds 80c 80ccd ଆୟକର ପଦୋନ୍ନତି'
    },
    {
      id: 'vacancy-age-relaxation',
      category: 'calculators',
      href: '/jobs/',
      badgeEn: 'Jobs Hub',
      badgeOr: 'ଚାକିରି ହବ୍',
      titleEn: 'Vacancy, Fee Waiver, Age Cutoff & 30-District Recruitment Finder',
      titleOr: 'ଖାଲି ପଦବୀ, ଫି ଛାଡ଼, ବୟସ ସୀମା ଓ ୩୦-ଜିଲ୍ଲା ନିଯୁକ୍ତି ଖୋଜନ୍ତୁ',
      descEn: 'Inspect category-wise reservation splits, age relaxation & district-level Odisha jobs.',
      descOr: 'ବର୍ଗଭିତ୍ତିକ ସଂରକ୍ଷଣ, ବୟସ ଛାଡ଼ ଓ ଜିଲ୍ଲାସ୍ତରୀୟ ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି ଦେଖନ୍ତୁ।',
      keywords: 'age cutoff relaxation vacancy fee waiver reservation district jobs ବୟସ ଖାଲି ପଦବୀ ଚାକିରି'
    },
    {
      id: 'results-cutoff-estimator',
      category: 'calculators',
      href: '/results/',
      badgeEn: 'Results Hub',
      badgeOr: 'ଫଳାଫଳ ହବ୍',
      titleEn: 'Odisha Exam Cut-Off & Merit Rank Estimator',
      titleOr: 'ଓଡ଼ିଶା ପରୀକ୍ଷା କଟ୍-ଅଫ୍ ଓ ମେରିଟ୍ ର‍୍ୟାଙ୍କ ଆକଳନ',
      descEn: 'Track OPSC, OSSC & OSSSC results, normalization cut-offs & category merit bands.',
      descOr: 'OPSC, OSSC ଓ OSSSC ଫଳାଫଳ, କଟ୍-ଅଫ୍ ଓ ମେରିଟ୍ ତାଲିକା ଯାଞ୍ଚ କରନ୍ତୁ।',
      keywords: 'result cutoff merit rank opsc ossc osssc normalisation ଫଳାଫଳ କଟ୍ ଅଫ୍'
    },

    // 2. Exam & Skill Practice
    {
      id: 'typing-skill-arena',
      category: 'exam-practice',
      targetId: 'cso-typing-skill-arena-root',
      badgeEn: 'Skill Test',
      badgeOr: 'ଦକ୍ଷତା ପରୀକ୍ଷା',
      titleEn: 'Odisha Typing, Stenography & Computer Skill Test Arena (EN & Odia)',
      titleOr: 'ଓଡ଼ିଶା ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ଟାଇପିଂ ଏବଂ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ଅଭ୍ୟାସ',
      descEn: 'Live WPM, net speed & accuracy trainer for OSSC CGL, OSSSC JA/DEO & High Court.',
      descOr: 'OSSC CGL, OSSSC JA/DEO ଓ ହାଇକୋର୍ଟ ପାଇଁ ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ଟାଇପିଂ ଅଭ୍ୟାସ କରନ୍ତୁ।',
      keywords: 'typing wpm odia inscript stenography computer skill test ossc osssc ଟାଇପିଂ ଓଡ଼ିଆ'
    },
    {
      id: 'study-streak-planner',
      category: 'exam-practice',
      href: '/mock-tests/#cso-study-streak-planner-root',
      badgeEn: 'Mock Tests Hub',
      badgeOr: 'ମକ୍ ଟେଷ୍ଟ ହବ୍',
      titleEn: 'Study Streak, Daily Goal & 7-Day Revision Planner',
      titleOr: 'ଅଧ୍ୟୟନ ଷ୍ଟ୍ରିକ୍, ଦୈନିକ ଲକ୍ଷ୍ୟ ଓ ୭-ଦିନିଆ ରିଭିଜନ୍ ପ୍ଲାନର୍',
      descEn: 'Track daily preparation streaks, revision blocks & exam countdown targets.',
      descOr: 'ଦୈନିକ ଅଧ୍ୟୟନ ଷ୍ଟ୍ରିକ୍, ରିଭିଜନ୍ ଯୋଜନା ଓ ପରୀକ୍ଷା ଲକ୍ଷ୍ୟ ଟ୍ରାକ୍ କରନ୍ତୁ।',
      keywords: 'study streak daily goal revision planner timetable mock ଅଧ୍ୟୟନ ରିଭିଜନ୍'
    },
    {
      id: 'pyq-mock-vault',
      category: 'exam-practice',
      href: '/mock-tests/#cso-pyq-vault-analyzer-root',
      badgeEn: 'Mock Tests Hub',
      badgeOr: 'ମକ୍ ଟେଷ୍ଟ ହବ୍',
      titleEn: 'Bilingual CBT Mock Tests & Odisha PYQ Weightage Vault',
      titleOr: 'ଦ୍ୱିଭାଷୀ CBT ମକ୍ ଟେଷ୍ଟ ଓ ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର (PYQ) ଭଲ୍ଟ',
      descEn: 'Analyze topic weightage for OPSC OAS, OSSC CGL, OSSSC & launch sectional mocks.',
      descOr: 'OPSC OAS, OSSC CGL ଓ OSSSC ବିଷୟ ଭାରାଙ୍କ ବିଶ୍ଳେଷଣ ଓ ମକ୍ ଟେଷ୍ଟ ଦିଅନ୍ତୁ।',
      keywords: 'pyq previous year question mock test cbt opsc ossc osssc ପ୍ରଶ୍ନପତ୍ର ମକ୍ ଟେଷ୍ଟ'
    },
    {
      id: 'teacher-eligibility-checker',
      category: 'exam-practice',
      href: '/exams/#cso-teacher-eligibility-root',
      badgeEn: 'Exams Hub',
      badgeOr: 'ପରୀକ୍ଷା ହବ୍',
      titleEn: 'Odisha Govt Teacher (LTR / SSD / OAV / OTET / OSSTET) Eligibility Checker',
      titleOr: 'ଓଡ଼ିଶା ସରକାରୀ ଶିକ୍ଷକ (LTR / OAV / OTET / OSSTET) ଯୋଗ୍ୟତା ଯାଞ୍ଚ',
      descEn: 'Check TGT, PGT, Hindi, Sanskrit, PET & OTET subject combinations & relaxations.',
      descOr: 'TGT, PGT, ହିନ୍ଦୀ, ସଂସ୍କୃତ, PET ଓ OTET ବିଷୟ ସଂଯୋଗ ଓ ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ।',
      keywords: 'teacher ltr ssd oav otet osstet tgt pgt bed deled eligibility ଶିକ୍ଷକ ଯୋଗ୍ୟତା'
    },

    // 3. Certificates & Verification
    {
      id: 'edistrict-walkthrough',
      category: 'certificates',
      targetId: 'cso-edistrict-walkthrough-root',
      badgeEn: 'e-District Odisha',
      badgeOr: 'ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ଓଡ଼ିଶା',
      titleEn: 'e-District Odisha Certificate Walkthrough & Self-Declaration Generator',
      titleOr: 'ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ଗାଇଡ୍ ଓ ସ୍ୱ-ଘୋଷଣାପତ୍ର ଜେନେରେଟର',
      descEn: 'Step-by-step Resident, Income, Caste/SEBC, EWS & Legal Heir checklist with SLA.',
      descOr: 'ବାସିନ୍ଦା, ଆୟ, ଜାତି/SEBC, EWS ଓ ଉତ୍ତରାଧିକାରୀ ପ୍ରମାଣପତ୍ର ଆବେଦନ ପ୍ରକ୍ରିୟା।',
      keywords: 'edistrict resident income caste sebc ews legal heir certificate self declaration ପ୍ରମାଣପତ୍ର ବାସିନ୍ଦା ଆୟ ଜାତି'
    },
    {
      id: 'certificate-fee-matrix',
      category: 'certificates',
      targetId: 'cso-certificate-fee-matrix-root',
      badgeEn: 'Validity & Fees',
      badgeOr: 'ବୈଧତା ଓ ଫି',
      titleEn: 'Odisha Certificate Validity & Category Fee Waiver Matrix',
      titleOr: 'ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ବୈଧତା ଓ ବର୍ଗଭିତ୍ତିକ ଫି ଛାଡ଼ ସାରଣୀ',
      descEn: 'Check validity periods, issuing authorities & SC/ST/SEBC/PwBD exam fee exemptions.',
      descOr: 'ପ୍ରମାଣପତ୍ର ବୈଧତା ଅବଧି, ଅଧିକାରୀ ଓ SC/ST/SEBC/PwBD ଫି ଛାଡ଼ ନିୟମ ଜାଣନ୍ତୁ।',
      keywords: 'certificate validity fee waiver sc st sebc pwbd obc ews ପ୍ରମାଣପତ୍ର ବୈଧତା ଫି ଛାଡ଼'
    },
    {
      id: 'photo-signature-resizer',
      category: 'certificates',
      targetId: 'cso-photo-signature-resizer-root',
      badgeEn: 'On-Device Utility',
      badgeOr: 'ଅନ୍-ଡିଭାଇସ୍ ଟୁଲ୍',
      titleEn: '100% On-Device Exam Photo & Signature Resizer (20–50 KB JPG)',
      titleOr: 'ଅନ୍-ଡିଭାଇସ୍ ପରୀକ୍ଷା ଫଟୋ ଓ ଦସ୍ତଖତ ରିସାଇଜର୍ (20–50 KB JPG)',
      descEn: 'Resize passport photo, signature & thumb impression for OPSC, OSSC, OSSSC & SSC.',
      descOr: 'OPSC, OSSC, OSSSC ଓ SSC ଫର୍ମ ପାଇଁ ଫଟୋ, ଦସ୍ତଖତ ଓ ଆଙ୍ଗୁଠି ଛାପ ରିସାଇଜ୍ କରନ୍ତୁ।',
      keywords: 'photo signature thumb resizer kb jpg compress image passport ଫଟୋ ଦସ୍ତଖତ ରିସାଇଜ୍'
    },
    {
      id: 'admissions-doc-checklist',
      category: 'certificates',
      href: '/admissions/',
      badgeEn: 'Admissions Hub',
      badgeOr: 'ନାମଲେଖା ହବ୍',
      titleEn: 'SAMS, OJEE, Polytechnic, ITI & B.Ed. Document Verification Checklist',
      titleOr: 'SAMS, OJEE, ପଲିଟେକ୍ନିକ୍, ITI ଓ B.Ed. କାଗଜପତ୍ର ଯାଞ୍ଚ ତାଲିକା',
      descEn: 'Counselling schedules, seat matrices & required documents for Odisha admissions.',
      descOr: 'ଓଡ଼ିଶା ନାମଲେଖା କାଉନସେଲିଂ, ସିଟ୍ ମ୍ୟାଟ୍ରିକ୍ସ ଓ ଆବଶ୍ୟକୀୟ କାଗଜପତ୍ର ତାଲିକା।',
      keywords: 'sams ojee iti polytechnic bed admission counselling document checklist ନାମଲେଖା କାଗଜପତ୍ର'
    },

    // 4. Offline & Backup
    {
      id: 'candidate-data-backup',
      category: 'offline-backup',
      targetId: 'cso-candidate-data-backup-root',
      badgeEn: 'JSON Backup',
      badgeOr: 'JSON ବ୍ୟାକଅପ୍',
      titleEn: 'Candidate Saved Alerts, Watchlist & Study Streak JSON Backup / Restore',
      titleOr: 'ସେଭ୍ ଆଲର୍ଟ, ୱାଚଲିଷ୍ଟ ଓ ଅଧ୍ୟୟନ ଷ୍ଟ୍ରିକ୍ JSON ବ୍ୟାକଅପ୍ / ରିଷ୍ଟୋର',
      descEn: 'Export, merge-import or share a compact study-pack link across browsers & devices.',
      descOr: 'ଡିଭାଇସ୍ ବଦଳାଇଲେ ନିଜ ସେଭ୍ ଆଲର୍ଟ, ୱାଚଲିଷ୍ଟ ଓ ଷ୍ଟ୍ରିକ୍ ବ୍ୟାକଅପ୍ ଓ ରିଷ୍ଟୋର କରନ୍ତୁ।',
      keywords: 'backup restore json export import saved alerts watchlist study pack ବ୍ୟାକଅପ୍ ରିଷ୍ଟୋର'
    },
    {
      id: 'offline-toolkit-hub',
      category: 'offline-backup',
      targetId: 'cso-offline-toolkit-hub-root',
      badgeEn: 'Offline PWA',
      badgeOr: 'ଅଫଲାଇନ୍ PWA',
      titleEn: 'Offline PWA Candidate Toolkit Status & Cache Readiness',
      titleOr: 'ଅଫଲାଇନ୍ PWA ପ୍ରାର୍ଥୀ ଟୁଲକିଟ୍ ସ୍ଥିତି ଓ କ୍ୟାଶ୍ ପ୍ରସ୍ତୁତି',
      descEn: 'Check offline pre-cache readiness for low-connectivity Odisha districts & refresh cache.',
      descOr: 'କମ୍ ଇଣ୍ଟରନେଟ୍ ଅଞ୍ଚଳ ପାଇଁ ଅଫଲାଇନ୍ ଟୁଲକିଟ୍ କ୍ୟାଶ୍ ସ୍ଥିତି ଯାଞ୍ଚ ଓ ରିଫ୍ରେଶ୍ କରନ୍ତୁ।',
      keywords: 'offline pwa cache service worker toolkit status low connectivity ଅଫଲାଇନ୍ କ୍ୟାଶ୍'
    }
  ];

  function filterTools(category, query) {
    var cat = String(category || 'all').toLowerCase();
    var q = String(query || '').trim().toLowerCase();
    return TOOL_CATALOG.filter(function (item) {
      if (cat !== 'all' && item.category !== cat) return false;
      if (!q) return true;
      var hay = [
        item.titleEn,
        item.titleOr,
        item.descEn,
        item.descOr,
        item.badgeEn,
        item.badgeOr,
        item.keywords
      ].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function getCategoryCounts(query) {
    var counts = { all: 0, calculators: 0, 'exam-practice': 0, certificates: 0, 'offline-backup': 0 };
    var matched = filterTools('all', query);
    counts.all = matched.length;
    matched.forEach(function (item) {
      if (counts[item.category] !== undefined) counts[item.category] += 1;
    });
    return counts;
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          lang: parsed.lang === 'or' ? 'or' : 'en',
          category: typeof parsed.category === 'string' ? parsed.category : 'all'
        };
      }
    } catch (_) {}
    return { lang: 'en', category: 'all' };
  }

  function savePrefs(state) {
    try {
      if (win.localStorage) {
        win.localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: state.lang, category: state.category }));
      }
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function jumpToTool(targetId) {
    if (!doc || !targetId) return false;
    var target = doc.getElementById(targetId);
    if (!target) return false;
    var prefersReduced = false;
    try {
      prefersReduced = Boolean(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {}
    try {
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    } catch (_) {}
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    try {
      target.focus({ preventScroll: true });
    } catch (_) {}
    target.classList.add('cso-tqj-highlight');
    setTimeout(function () {
      target.classList.remove('cso-tqj-highlight');
    }, 1800);
    try {
      if (win.history && typeof win.history.replaceState === 'function') {
        win.history.replaceState(null, '', '#' + targetId);
      }
    } catch (_) {}
    return true;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs();
    var state = {
      lang: saved.lang,
      category: saved.category,
      query: ''
    };

    var card = el('div', 'cso-tqj-card');
    card.setAttribute('data-cso-tools-quick-jump', '1');

    // Header
    var head = el('div', 'cso-tqj-head');
    var headCopy = el('div', 'cso-tqj-head-copy');
    var eyebrow = el('div', 'cso-tqj-eyebrow');
    var title = el('h2', 'cso-tqj-title');
    var sub = el('p', 'cso-tqj-sub');
    headCopy.appendChild(eyebrow);
    headCopy.appendChild(title);
    headCopy.appendChild(sub);
    head.appendChild(headCopy);

    var langToggle = el('div', 'cso-tqj-lang-toggle');
    langToggle.setAttribute('role', 'group');
    langToggle.setAttribute('aria-label', 'Directory language');
    var btnEn = el('button', 'cso-tqj-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-tqj-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    btnEn.addEventListener('click', function () { state.lang = 'en'; savePrefs(state); renderDynamic(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; savePrefs(state); renderDynamic(); });
    langToggle.appendChild(btnEn);
    langToggle.appendChild(btnOr);
    head.appendChild(langToggle);
    card.appendChild(head);

    // Search Bar (kept outside dynamic replace so typing never loses focus!)
    var searchRow = el('div', 'cso-tqj-search-row');
    var searchInput = el('input', 'cso-tqj-search-input');
    searchInput.type = 'search';
    searchInput.id = 'cso-tqj-search';
    searchInput.setAttribute('aria-label', 'Filter candidate tools by keyword');
    var clearBtn = el('button', 'cso-tqj-clear-btn', '✕ Clear');
    clearBtn.type = 'button';
    clearBtn.hidden = true;
    searchInput.addEventListener('input', function () {
      state.query = searchInput.value;
      clearBtn.hidden = !state.query.trim();
      renderDynamic();
    });
    clearBtn.addEventListener('click', function () {
      state.query = '';
      searchInput.value = '';
      clearBtn.hidden = true;
      searchInput.focus();
      renderDynamic();
    });
    searchRow.appendChild(searchInput);
    searchRow.appendChild(clearBtn);
    card.appendChild(searchRow);

    // Category Pills Container
    var pillsWrap = el('div', 'cso-tqj-pills');
    pillsWrap.setAttribute('role', 'group');
    pillsWrap.setAttribute('aria-label', 'Filter tools by category');
    card.appendChild(pillsWrap);

    // Live Count Readout
    var statusEl = el('div', 'cso-tqj-status');
    statusEl.setAttribute('aria-live', 'polite');
    card.appendChild(statusEl);

    // Cards Grid
    var gridEl = el('div', 'cso-tqj-grid');
    card.appendChild(gridEl);

    container.replaceChildren(card);

    function renderDynamic() {
      var orMode = state.lang === 'or';
      eyebrow.textContent = orMode
        ? '⚡ ଦ୍ରୁତ ଟୁଲ୍ ଡିରେକ୍ଟୋରୀ ଓ ଲାଇଭ୍ ସର୍ଚ୍ଚ (/TOOLS/)'
        : '⚡ CANDIDATE TOOLKIT QUICK-JUMP DIRECTORY & LIVE SEARCH';
      title.textContent = orMode
        ? 'ସମସ୍ତ ଓଡ଼ିଶା ପରୀକ୍ଷା, ବେତନ ଓ ପ୍ରମାଣପତ୍ର ଉପକରଣ'
        : 'Jump to Any Odisha Exam, Salary, Typing or Certificate Tool';
      sub.textContent = orMode
        ? 'ସ୍କ୍ରୋଲ୍ ନକରି ବର୍ଗ ବାଛି କିମ୍ବା ଶବ୍ଦ ଲେଖି ୧-ଟ୍ୟାପ୍ ରେ ନିଜ ଆବଶ୍ୟକୀୟ ଟୁଲ୍ ଖୋଲନ୍ତୁ।'
        : 'Filter by category or keyword and launch any on-page calculator, skill arena, or companion hub in one tap.';
      searchInput.placeholder = orMode
        ? 'ଟୁଲ୍ ଖୋଜନ୍ତୁ (ଉଦାହରଣ: salary, typing, photo, e-District, CGPA, ଓଡ଼ିଆ)...'
        : 'Filter tools by exam, salary, typing, photo, certificate, or Odia...';
      clearBtn.textContent = orMode ? '✕ ସଫା କରନ୍ତୁ' : '✕ Clear';

      btnEn.className = 'cso-tqj-lang-btn' + (!orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.className = 'cso-tqj-lang-btn' + (orMode ? ' is-active' : '');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      var counts = getCategoryCounts(state.query);
      var pillsFrag = doc.createDocumentFragment();
      CATEGORIES.forEach(function (c) {
        var active = state.category === c.id;
        var label = (orMode ? c.or : c.en) + ' (' + (counts[c.id] || 0) + ')';
        var pb = el('button', 'cso-tqj-pill' + (active ? ' is-active' : ''), label);
        pb.type = 'button';
        pb.setAttribute('aria-pressed', active ? 'true' : 'false');
        pb.addEventListener('click', function () {
          state.category = c.id;
          savePrefs(state);
          renderDynamic();
        });
        pillsFrag.appendChild(pb);
      });
      pillsWrap.replaceChildren(pillsFrag);

      var items = filterTools(state.category, state.query);
      statusEl.textContent = orMode
        ? 'ମୋଟ ' + TOOL_CATALOG.length + ' ଟି ଉପକରଣ ମଧ୍ୟରୁ ' + items.length + ' ଟି ଦେଖାଯାଉଛି'
        : 'Showing ' + items.length + ' of ' + TOOL_CATALOG.length + ' utilities';

      var gridFrag = doc.createDocumentFragment();
      if (items.length === 0) {
        var empty = el('div', 'cso-tqj-empty');
        empty.appendChild(el('p', '', orMode
          ? 'ଏହି ସର୍ଚ୍ଚ ପାଇଁ କୌଣସି ଉପକରଣ ମିଳିଲା ନାହିଁ। ଦୟାକରି ଅନ୍ୟ ଶବ୍ଦ ଚେଷ୍ଟା କରନ୍ତୁ।'
          : 'No matching utilities found. Try clearing the search or switching to All Tools.'));
        var resetBtn = el('button', 'cso-tqj-action-btn', orMode ? 'ସବୁ ଉପକରଣ ଦେଖନ୍ତୁ' : 'Show All Tools');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          state.category = 'all';
          state.query = '';
          searchInput.value = '';
          clearBtn.hidden = true;
          savePrefs(state);
          renderDynamic();
        });
        empty.appendChild(resetBtn);
        gridFrag.appendChild(empty);
      } else {
        items.forEach(function (item) {
          var tile = el('article', 'cso-tqj-item');
          tile.appendChild(el('span', 'cso-tqj-badge', orMode ? item.badgeOr : item.badgeEn));
          tile.appendChild(el('h3', 'cso-tqj-item-title', orMode ? item.titleOr : item.titleEn));
          tile.appendChild(el('p', 'cso-tqj-item-desc', orMode ? item.descOr : item.descEn));

          if (item.targetId) {
            var jumpBtn = el('button', 'cso-tqj-action-btn cso-tqj-action-btn--jump', orMode ? 'ଟୁଲ୍ କୁ ଯାଆନ୍ତୁ ↓' : 'Jump to Tool ↓');
            jumpBtn.type = 'button';
            jumpBtn.addEventListener('click', function () {
              jumpToTool(item.targetId);
            });
            tile.appendChild(jumpBtn);
          } else if (item.href) {
            var link = el('a', 'cso-tqj-action-btn cso-tqj-action-btn--hub', orMode ? 'ହବ୍ ଖୋଲନ୍ତୁ →' : 'Open Hub →');
            link.href = item.href;
            tile.appendChild(link);
          }
          gridFrag.appendChild(tile);
        });
      }
      gridEl.replaceChildren(gridFrag);
    }

    renderDynamic();
    return { render: renderDynamic, getState: function () { return Object.assign({}, state); } };
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
    CATEGORIES: CATEGORIES,
    TOOL_CATALOG: TOOL_CATALOG,
    filterTools: filterTools,
    getCategoryCounts: getCategoryCounts,
    jumpToTool: jumpToTool,
    mount: mount
  };
});
