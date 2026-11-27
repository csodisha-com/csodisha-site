/**
 * Common Sense Odisha — Interactive Odisha Polytechnic, ITI, B.Ed. & Higher-Ed
 * Admission & Counselling Tracker (v420)
 * Mounted on /admissions/ (#cso-admissions-counselling-root).
 * Covers SAMS Odisha (+2/+3/PG/Int. B.Ed.-M.Ed.), OJEE (B.Tech/MBA/MCA/B.Pharm/B.Ed.),
 * DTE&T Odisha (Polytechnic Diploma & ITI), and NCET / ITEP 4-Year Integrated B.Ed.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOAdmissionsTracker = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOAdmissionsTracker = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v420';
  var ROOT_ID = 'cso-admissions-counselling-root';
  var PREFS_KEY = 'cso_admissions_tracker_prefs_v1';
  var CHECKLIST_KEY = 'cso_admissions_doc_checklist_v1';

  var AUTHORITIES = [
    { key: 'all', en: 'All Portals', or: 'ସମସ୍ତ ପୋର୍ଟାଲ୍' },
    { key: 'sams', en: 'SAMS Odisha (+2 / +3 / PG / B.Ed.)', or: 'SAMS ଓଡ଼ିଶା (+୨ / +୩ / PG / B.Ed.)' },
    { key: 'ojee', en: 'OJEE (B.Tech / MBA / MCA / B.Pharm)', or: 'OJEE (B.Tech / MBA / MCA / B.Pharm)' },
    { key: 'dtet', en: 'DTE&T Odisha (Diploma & ITI)', or: 'DTE&T ଓଡ଼ିଶା (ଡିପ୍ଲୋମା ଓ ITI)' },
    { key: 'ncet', en: 'NCET / ITEP (4-Yr Integrated B.Ed.)', or: 'NCET / ITEP (୪-ବର୍ଷୀୟ B.Ed.)' }
  ];

  var LEVELS = [
    { key: 'all', en: 'All Levels & Streams', or: 'ସମସ୍ତ ସ୍ତର ଓ ଷ୍ଟ୍ରିମ୍' },
    { key: 'class10', en: 'Class 10th Pass (+2 / ITI / 1st-Yr Diploma)', or: '୧୦ମ ପାସ୍ (+୨ / ITI / ୧ମ ବର୍ଷ ଡିପ୍ଲୋମା)' },
    { key: 'class12', en: 'Class 12th Pass (+3 UG / B.Tech / B.Pharm / ITEP)', or: '+୨ ପାସ୍ (+୩ UG / B.Tech / B.Pharm / ITEP)' },
    { key: 'graduate', en: 'Graduate / Lateral Entry (PG / MBA / MCA / B.Ed. / 3rd-Sem Diploma)', or: 'ସ୍ନାତକ / ଲାଟେରାଲ୍ ଏଣ୍ଟ୍ରି (PG / MBA / MCA / B.Ed.)' }
  ];

  var PHASES = [
    { key: 'all', en: 'All Phases', or: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ' },
    { key: 'caf', en: 'CAF & Choice Filling', or: 'CAF ଓ ଚଏସ୍ ଫିଲିଂ' },
    { key: 'allotment', en: 'Round 1–3 Seat Allotment & Freeze/Float', or: 'ରାଉଣ୍ଡ ୧–୩ ସିଟ୍ ଆଲଟମେଣ୍ଟ ଓ ଫ୍ରିଜ୍/ଫ୍ଲୋଟ୍' },
    { key: 'spot', en: 'SPOT / Special Round & Physical Reporting', or: 'SPOT / ସ୍ପେଶାଲ୍ ରାଉଣ୍ଡ ଓ ରିପୋର୍ଟିଂ' },
    { key: 'next-session', en: 'Next Session (2027–28) Prep', or: 'ଆଗାମୀ ଶିକ୍ଷାବର୍ଷ (୨୦୨୭–୨୮) ପ୍ରସ୍ତୁତି' }
  ];

  var ADMISSION_TRACKS = [
    {
      id: 'sams-plus2',
      authority: 'sams',
      authorityLabel: 'SAMS Odisha (DHE / SME)',
      level: 'class10',
      phase: 'allotment',
      en: 'SAMS Odisha Higher Secondary (+2 Arts / Science / Commerce / Vocational)',
      or: 'SAMS ଓଡ଼ିଶା +୨ (କଳା / ବିଜ୍ଞାନ / ବାଣିଜ୍ୟ / ବୃତ୍ତିମୂଳକ) ନାମଲେଖା',
      eligibility_en: 'Class 10th pass (BSE Odisha / CBSE / ICSE) — 100% merit-based Common Application Form (CAF).',
      eligibility_or: '୧୦ମ ପାସ୍ (BSE ଓଡ଼ିଶା / CBSE / ICSE) — ମେଧା ଭିତ୍ତିକ CAF ନାମଲେଖା।',
      seatMatrix: '5.1 Lakh+ Seats · Govt & Aided Higher Secondary Schools across 30 Districts',
      fee: '₹200 (Gen) / ₹100 (SC/ST) CAF Fee',
      portal: 'https://samsodisha.gov.in/',
      reminderDate: '2027-05-15',
      steps: [
        'CAF Registration & Option Selection (up to 10 HSS)',
        'Choice Locking & Merit List Publication',
        'Round 1, Round 2 & Slide-Up Seat Allotment',
        'SPOT Admission & Physical Reporting with SLC'
      ],
      keywords: 'sams plus2 +2 chse higher secondary arts science commerce vocational class 10'
    },
    {
      id: 'sams-plus3-ug',
      authority: 'sams',
      authorityLabel: 'SAMS Odisha (DHE)',
      level: 'class12',
      phase: 'allotment',
      en: 'SAMS Odisha Degree (+3 UG Honours — Arts, Science & Commerce)',
      or: 'SAMS ଓଡ଼ିଶା +୩ ସ୍ନାତକ (UG Honours — କଳା, ବିଜ୍ଞାନ ଓ ବାଣିଜ୍ୟ)',
      eligibility_en: 'Class 12th pass (CHSE Odisha / CBSE / ICSE) — NEP 4-Year Honours / 3-Year UG CAP.',
      eligibility_or: '+୨ ପାସ୍ (CHSE ଓଡ଼ିଶା / CBSE / ICSE) — NEP ୪-ବର୍ଷୀୟ / ୩-ବର୍ଷୀୟ UG ନାମଲେଖା।',
      seatMatrix: '2.7 Lakh+ Seats · Govt, Autonomous & Aided Degree Colleges in Odisha',
      fee: '₹275 (Gen) / ₹175 (SC/ST) CAF Fee',
      portal: 'https://samsodisha.gov.in/',
      reminderDate: '2027-06-05',
      steps: [
        'Online CAF & Honours Subject Preferences',
        'Choice Locking & Provisional Merit Publication',
        'Round 1–3 Seat Allotment (Freeze / Float / Slide)',
        'SPOT Round & College Document Verification'
      ],
      keywords: 'sams plus3 +3 degree ug honours nep ba bsc bcom class 12'
    },
    {
      id: 'sams-pg-cpet-bedmed',
      authority: 'sams',
      authorityLabel: 'SAMS Odisha (PG / CPET)',
      level: 'graduate',
      phase: 'caf',
      en: 'SAMS Odisha State PG (CPET) & 3-Year Integrated B.Ed.-M.Ed.',
      or: 'SAMS ଓଡ଼ିଶା ରାଜ୍ୟ PG (CPET) ଓ ୩-ବର୍ଷୀୟ ସମନ୍ୱିତ B.Ed.-M.Ed.',
      eligibility_en: 'Bachelor’s / Master’s degree (50% UR / 45% SEBC, SC, ST, PwBD) + CPET Entrance Score.',
      eligibility_or: 'ସ୍ନାତକ / ସ୍ନାତକୋତ୍ତର (୫୦% UR / ୪୫% ସଂରକ୍ଷିତ) + CPET ପ୍ରବେଶିକା ପରୀକ୍ଷା।',
      seatMatrix: 'State Universities & Autonomous Colleges + 200 Integrated B.Ed.-M.Ed. seats (MSCB, Sambalpur, Rajendra, Fakir Mohan)',
      fee: '₹500 (Gen) / ₹300 (SC/ST) First Subject',
      portal: 'https://pg.samsodisha.gov.in/',
      reminderDate: '2027-04-20',
      steps: [
        'CPET / Integrated B.Ed.-M.Ed. CAF & Admit Card',
        'State-Wide Merit & Subject Choice Locking',
        'Round 1–3 Seat Allotment & Online Fee Deposit',
        'SPOT Selection & University Physical Reporting'
      ],
      keywords: 'sams pg cpet integrated bed med mscb sambalpur rajendra fakir mohan postgraduate'
    },
    {
      id: 'ojee-sams-bed',
      authority: 'sams',
      authorityLabel: 'SAMS / OJEE Teacher Ed',
      level: 'graduate',
      phase: 'caf',
      en: 'Odisha B.Ed., BHED & M.Ed. State Teacher Education Counselling',
      or: 'ଓଡ଼ିଶା B.Ed., BHED ଓ M.Ed. ଶିକ୍ଷକ ଶିକ୍ଷା କାଉନସେଲିଂ',
      eligibility_en: 'Graduation / Post-Graduation (50% UR / 45% SC/ST/SEBC/PwBD; 55% B.Tech) + State B.Ed. Entrance.',
      eligibility_or: 'ସ୍ନାତକ / ସ୍ନାତକୋତ୍ତର (୫୦% UR / ୪୫% ସଂରକ୍ଷିତ) + ରାଜ୍ୟ B.Ed. ପ୍ରବେଶିକା ପରୀକ୍ଷା।',
      seatMatrix: 'Govt CTEs, IASEs (RNIASE Cuttack, NDWCTE Bhubaneswar, Dr. PMIASE Sambalpur) & Self-Financing Colleges',
      fee: '₹500 (Gen/SEBC) / ₹300 (SC/ST)',
      portal: 'https://samsodisha.gov.in/',
      reminderDate: '2027-05-01',
      steps: [
        'Online CAF & State B.Ed. Entrance Exam',
        'Institution Preference & Choice Locking',
        'Round 1–3 Allotment & Freeze/Slide Option',
        'SPOT Round & CTE/IASE Physical Reporting'
      ],
      keywords: 'bed b.ed bhed med teacher education cte iase sams ojee'
    },
    {
      id: 'ojee-btech',
      authority: 'ojee',
      authorityLabel: 'OJEE e-Counselling',
      level: 'class12',
      phase: 'allotment',
      en: 'OJEE Web-Based e-Counselling (B.Tech / B.Arch / B.Plan / Int. M.Sc.)',
      or: 'OJEE ୱେବ୍ ଇ-କାଉନସେଲିଂ (B.Tech / B.Arch / B.Plan / Int. M.Sc.)',
      eligibility_en: 'Class 12th PCM + JEE Main Rank or Special OJEE Rank (Odisha State & Outside State Quota).',
      eligibility_or: '+୨ ବିଜ୍ଞାନ (PCM) + JEE Main / Special OJEE ରାଙ୍କ୍।',
      seatMatrix: 'OUTR Bhubaneswar, VSSUT Burla, IGIT Sarang, GCE Kalahandi/Keonjhar/Berhampur & Private Engg Colleges',
      fee: '₹450 Counselling Registration Fee',
      portal: 'https://ojee.nic.in/',
      reminderDate: '2027-06-20',
      steps: [
        'OJEE Registration & Mock Seat Allotment',
        'Choice Locking for Govt & Private Colleges',
        'Round 1, Round 2 & Special OJEE Allotment (Freeze/Float)',
        'Online Verification, Seat Acceptance & Final Reporting'
      ],
      keywords: 'ojee btech engineering jee main outr vssut igit gce kalahandi barch bplan'
    },
    {
      id: 'ojee-pg-le',
      authority: 'ojee',
      authorityLabel: 'OJEE PG & Lateral Entry',
      level: 'graduate',
      phase: 'allotment',
      en: 'OJEE PG & Lateral Entry e-Counselling (MBA / MCA / M.Tech / B.Pharm / LE-Tech)',
      or: 'OJEE PG ଓ ଲାଟେରାଲ୍ ଏଣ୍ଟ୍ରି (MBA / MCA / M.Tech / B.Pharm / LE-Tech)',
      eligibility_en: 'OJEE / GATE / GPAT / CAT / MAT Rank or Diploma / B.Sc. for 2nd-Year LE-Tech / LE-Pharm.',
      eligibility_or: 'OJEE / GATE / GPAT ରାଙ୍କ୍ କିମ୍ବା ଡିପ୍ଲୋମା / B.Sc. (ଲାଟେରାଲ୍ ଏଣ୍ଟ୍ରି)।',
      seatMatrix: 'State Univ Departments (Utkal, Ravenshaw, OUTR, VSSUT, BPUT) & Approved Pharmacy/Management Institutes',
      fee: '₹450 Counselling Fee (₹10,000 / ₹5,000 Part Admission Fee)',
      portal: 'https://ojee.nic.in/',
      reminderDate: '2027-07-01',
      steps: [
        'Rank Registration & Web Choice Filling',
        'Choice Locking & Document Upload',
        'Round 1–2 Allotment, Freeze/Float & Query Resolution',
        'Final Allotment Letter & Institute Reporting'
      ],
      keywords: 'ojee mba mca mtech bpharm lateral entry le-tech gate gpat bput'
    },
    {
      id: 'dtet-polytechnic',
      authority: 'dtet',
      authorityLabel: 'DTE&T Odisha (SAMS)',
      level: 'class10',
      phase: 'spot',
      en: 'DTE&T Odisha Polytechnic Diploma (1st Year & 3rd Sem Lateral Entry)',
      or: 'DTE&T ଓଡ଼ିଶା ପଲିଟେକ୍ନିକ୍ ଡିପ୍ଲୋମା (୧ମ ବର୍ଷ ଓ ୩ୟ ସେମିଷ୍ଟର ଲାଟେରାଲ୍ ଏଣ୍ଟ୍ରି)',
      eligibility_en: 'Class 10th merit (no entrance exam; min age 14 yrs) for 1st Yr; Class 12th PCM / 2-Yr ITI for 3rd-Sem Lateral Entry.',
      eligibility_or: '୧୦ମ ମେଧା ଭିତ୍ତିକ (କୌଣସି ପ୍ରବେଶିକା ନାହିଁ; ସର୍ବନିମ୍ନ ବୟସ ୧୪) / +୨ କିମ୍ବା ITI (ଲାଟେରାଲ୍ ଏଣ୍ଟ୍ରି)।',
      seatMatrix: '34 Govt Polytechnics (BOSE Cuttack, GP Bhubaneswar, Jharsuguda, Berhampur, Bhawanipatna) & Private Polytechnics',
      fee: '₹300 (Gen Male) / ₹200 (SC / ST / PwD / Female)',
      portal: 'https://dtetodisha.gov.in/',
      reminderDate: '2027-05-10',
      steps: [
        'SAMS Diploma CAF & Branch/Polytechnic Preferences',
        'State Merit List & Choice Locking',
        '1st Round & Final Round Seat Allotment + Online Fee',
        'SPOT Admission & Physical Reporting at Polytechnic'
      ],
      keywords: 'dtet polytechnic diploma bose cuttack lateral entry 3rd sem class 10 merit'
    },
    {
      id: 'dtet-iti-ncet-itep',
      authority: 'ncet',
      authorityLabel: 'DTE&T ITI & NCET / ITEP',
      level: 'class12',
      phase: 'next-session',
      en: 'DTE&T Odisha Govt/Private ITI Admissions + NCET / ITEP 4-Year Integrated B.Ed.',
      or: 'DTE&T ଓଡ଼ିଶା ସରକାରୀ/ବେସରକାରୀ ITI ନାମଲେଖା + NCET / ITEP ୪-ବର୍ଷୀୟ ସମନ୍ୱିତ B.Ed.',
      eligibility_en: 'Class 8th / 10th for NCVT/SCVT ITI trades (Electrician, Fitter, COPA, Welder); Class 12th + NTA NCET score for 4-Year ITEP (B.A./B.Sc./B.Com. B.Ed.).',
      eligibility_or: '୮ମ / ୧୦ମ ପାସ୍ (ITI ଟ୍ରେଡ୍ — ଇଲେକ୍ଟ୍ରିସିଆନ୍, ଫିଟର୍, COPA) ଓ +୨ + NTA NCET (୪-ବର୍ଷୀୟ ITEP B.Ed.)।',
      seatMatrix: 'Govt ITIs across 30 Odisha Districts + ITEP at RIE Bhubaneswar, NIT Rourkela & Central/State Universities',
      fee: '₹100 (ITI SAMS CAF) · NTA NCET Registration Fee',
      portal: 'https://ncet.samarth.ac.in/',
      secondaryPortal: 'https://skillodisha.gov.in/',
      reminderDate: '2027-04-10',
      steps: [
        'SAMS ITI CAF / NTA NCET Registration & Exam',
        'Trade / University ITEP Choice Filling & Locking',
        'Merit Allotment Rounds & Online Seat Confirmation',
        'SPOT Round & Institute Physical Document Verification'
      ],
      keywords: 'iti dtet skillodisha electrician fitter copa ncet itep 4 year integrated bed rie bhubaneswar nit rourkela'
    }
  ];

  var REPORTING_DOCS = [
    { id: 'marksheets', en: '10th / 12th / Graduation Marksheets & Passing Certificates', or: '୧୦ମ / +୨ / ସ୍ନାତକ ମାର୍କସିଟ୍ ଓ ପାସ୍ ସାର୍ଟିଫିକେଟ୍' },
    { id: 'slc_clc', en: 'School / College Leaving Certificate (SLC / CLC) & Conduct Certificate', or: 'SLC / CLC ଓ ଚରିତ୍ର ପ୍ରମାଣପତ୍ର (Conduct Certificate)' },
    { id: 'allotment', en: 'SAMS / OJEE / NCET Intimation & Final Seat Allotment Letter', or: 'SAMS / OJEE / NCET ଇଣ୍ଟିମେସନ୍ ଓ ସିଟ୍ ଆଲଟମେଣ୍ଟ ପତ୍ର' },
    { id: 'aadhaar_abc', en: 'Aadhaar Card & Academic Bank of Credits (ABC ID / APAAR)', or: 'ଆଧାର କାର୍ଡ ଓ ABC ID / APAAR' },
    { id: 'caste_ews', en: 'Odisha Caste (SC/ST), SEBC or Valid EWS Income & Asset Certificate', or: 'ଓଡ଼ିଶା ଜାତି (SC/ST), SEBC କିମ୍ବା EWS ପ୍ରମାଣପତ୍ର' },
    { id: 'res_inc', en: 'Odisha Resident / Nativity & Annual Family Income Certificate (e-District)', or: 'ଓଡ଼ିଶା ବାସିନ୍ଦା ଓ ବାର୍ଷିକ ଆୟ ପ୍ରମାଣପତ୍ର (e-District)' },
    { id: 'medical_ragging', en: 'Medical Fitness Certificate & Anti-Ragging Affidavit', or: 'ମେଡିକାଲ୍ ଫିଟନେସ୍ ସାର୍ଟିଫିକେଟ୍ ଓ ଆଣ୍ଟି-ରାଗିଂ ସତ୍ୟପାଠ' },
    { id: 'photos_fee', en: 'Passport Photos (4–6 copies) & Counselling Fee Payment Receipt', or: 'ପାସପୋର୍ଟ ଫଟୋ (୪–୬ କପି) ଓ କାଉନସେଲିଂ ଫି ରସିଦ୍' }
  ];

  function norm(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function resolveStorage(override) {
    if (override) return override;
    try { return (win && win.localStorage) ? win.localStorage : null; } catch (_) { return null; }
  }

  function loadPrefs(storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      var raw = st && st.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          return {
            authority: typeof p.authority === 'string' ? p.authority : 'all',
            level: typeof p.level === 'string' ? p.level : 'all',
            phase: typeof p.phase === 'string' ? p.phase : 'all',
            query: typeof p.query === 'string' ? p.query.slice(0, 80) : ''
          };
        }
      }
    } catch (_) {}
    return { authority: 'all', level: 'all', phase: 'all', query: '' };
  }

  function savePrefs(prefs, storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      if (st) st.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }

  function loadChecklist(storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      var raw = st && st.getItem(CHECKLIST_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return {};
  }

  function saveChecklist(map, storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      if (st) st.setItem(CHECKLIST_KEY, JSON.stringify(map || {}));
    } catch (_) {}
  }

  function getChecklistProgress(checklistMap) {
    var map = checklistMap && typeof checklistMap === 'object' ? checklistMap : {};
    var done = 0;
    for (var i = 0; i < REPORTING_DOCS.length; i += 1) {
      if (map[REPORTING_DOCS[i].id]) done += 1;
    }
    return {
      completed: done,
      total: REPORTING_DOCS.length,
      pct: Math.round((done / REPORTING_DOCS.length) * 100)
    };
  }

  function filterTracks(options) {
    var opts = options || {};
    var auth = norm(opts.authority || 'all');
    var lvl = norm(opts.level || 'all');
    var ph = norm(opts.phase || 'all');
    var q = norm(opts.query || '');

    return ADMISSION_TRACKS.filter(function (tr) {
      if (auth && auth !== 'all') {
        if (auth === 'dtet') {
          if (tr.authority !== 'dtet' && tr.id !== 'dtet-iti-ncet-itep') return false;
        } else if (auth === 'ncet') {
          if (tr.authority !== 'ncet') return false;
        } else if (tr.authority !== auth) {
          return false;
        }
      }
      if (lvl && lvl !== 'all') {
        if (lvl === 'class10' && tr.level !== 'class10' && tr.id !== 'dtet-iti-ncet-itep') return false;
        if (lvl === 'class12' && tr.level !== 'class12') return false;
        if (lvl === 'graduate' && tr.level !== 'graduate' && tr.id !== 'dtet-polytechnic') return false;
      }
      if (ph && ph !== 'all' && tr.phase !== ph) return false;
      if (q) {
        var hay = norm([
          tr.en, tr.or, tr.authorityLabel, tr.eligibility_en, tr.eligibility_or,
          tr.seatMatrix, tr.fee, tr.keywords, tr.steps.join(' ')
        ].join(' '));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function extractLiveAdmissionNotices(searchItems) {
    var list = Array.isArray(searchItems) ? searchItems : [];
    var re = /\b(admission|counselling|counseling|sams|ojee|polytechnic|iti\b|cpet|itep|ncet|b\.?ed|diploma|allotment)\b/i;
    return list.filter(function (it) {
      if (!it || it.type === 'hub') return false;
      var hay = [it.title, it.summary, it.category, it.org, it.keywords].filter(Boolean).join(' ');
      return re.test(hay);
    }).slice(0, 8);
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function detectLang() {
    try {
      var root = doc && doc.documentElement;
      if (root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or')) return 'or';
    } catch (_) {}
    return 'en';
  }

  function mount(containerEl) {
    if (!doc) return null;
    var root = containerEl || doc.getElementById(ROOT_ID);
    if (!root) return null;

    var state = {
      lang: detectLang(),
      prefs: loadPrefs(),
      checklist: loadChecklist(),
      liveNotices: []
    };

    var wrap = el('div', 'cso-act-wrap');

    // Top bar: Language toggle & Print button
    var topBar = el('div', 'cso-act-topbar');
    var langGroup = el('div', 'cso-act-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-act-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-act-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var topActions = el('div', 'cso-act-top-actions');
    var printBtn = el('button', 'cso-act-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    topActions.appendChild(printBtn);
    topBar.appendChild(langGroup);
    topBar.appendChild(topActions);

    // Authority Filter Pills
    var authBar = el('div', 'cso-act-pills');
    authBar.setAttribute('role', 'group');

    // Secondary Filters Row
    var filterRow = el('div', 'cso-act-filters');
    var lvlWrap = el('div', 'cso-act-field');
    var lvlLabel = el('label', 'cso-act-label');
    lvlLabel.setAttribute('for', 'cso-act-level');
    var lvlSelect = el('select', 'cso-act-select');
    lvlSelect.id = 'cso-act-level';
    lvlWrap.appendChild(lvlLabel);
    lvlWrap.appendChild(lvlSelect);

    var phWrap = el('div', 'cso-act-field');
    var phLabel = el('label', 'cso-act-label');
    phLabel.setAttribute('for', 'cso-act-phase');
    var phSelect = el('select', 'cso-act-select');
    phSelect.id = 'cso-act-phase';
    phWrap.appendChild(phLabel);
    phWrap.appendChild(phSelect);

    var qWrap = el('div', 'cso-act-field');
    var qLabel = el('label', 'cso-act-label');
    qLabel.setAttribute('for', 'cso-act-search');
    var qInput = el('input', 'cso-act-input');
    qInput.type = 'search';
    qInput.id = 'cso-act-search';
    qInput.value = state.prefs.query;
    qWrap.appendChild(qLabel);
    qWrap.appendChild(qInput);

    var resetBtn = el('button', 'cso-act-btn cso-act-reset-btn');
    resetBtn.type = 'button';

    filterRow.appendChild(lvlWrap);
    filterRow.appendChild(phWrap);
    filterRow.appendChild(qWrap);
    filterRow.appendChild(resetBtn);

    var statusBar = el('div', 'cso-act-status');
    statusBar.setAttribute('role', 'status');
    statusBar.setAttribute('aria-live', 'polite');

    var liveBox = el('section', 'cso-act-live');
    var tracksGrid = el('div', 'cso-act-grid');
    tracksGrid.setAttribute('aria-live', 'polite');

    // Reporting Document Checklist Section
    var docSection = el('section', 'cso-act-checklist');

    wrap.appendChild(topBar);
    wrap.appendChild(authBar);
    wrap.appendChild(filterRow);
    wrap.appendChild(statusBar);
    wrap.appendChild(liveBox);
    wrap.appendChild(tracksGrid);
    wrap.appendChild(docSection);
    root.replaceChildren(wrap);

    function renderSelectOptions(selectEl, items, currentVal, orMode) {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < items.length; i += 1) {
        var opt = el('option', '', orMode ? items[i].or : items[i].en);
        opt.value = items[i].key;
        if (items[i].key === currentVal) opt.selected = true;
        frag.appendChild(opt);
      }
      selectEl.replaceChildren(frag);
      selectEl.value = currentVal;
    }

    function renderAuthorityPills(orMode) {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < AUTHORITIES.length; i += 1) {
        (function (a) {
          var active = state.prefs.authority === a.key;
          var btn = el('button', 'cso-act-pill' + (active ? ' is-active' : ''), orMode ? a.or : a.en);
          btn.type = 'button';
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
          btn.addEventListener('click', function () {
            state.prefs.authority = a.key;
            savePrefs(state.prefs);
            render();
          });
          frag.appendChild(btn);
        })(AUTHORITIES[i]);
      }
      authBar.replaceChildren(frag);
    }

    function renderLiveNotices(orMode) {
      if (!state.liveNotices.length) {
        liveBox.hidden = true;
        liveBox.replaceChildren();
        return;
      }
      liveBox.hidden = false;
      var frag = doc.createDocumentFragment();
      frag.appendChild(el('h2', 'cso-act-live__title',
        orMode ? '🟢 ଲାଇଭ୍ ପ୍ରକାଶିତ ନାମଲେଖା ଓ କାଉନସେଲିଂ ବିଜ୍ଞପ୍ତି (D1)' : '🟢 Live Published Admission & Counselling Notices (D1)'));
      var list = el('div', 'cso-act-live__list');
      for (var i = 0; i < state.liveNotices.length; i += 1) {
        var it = state.liveNotices[i];
        var a = el('a', 'cso-act-live__item', (it.title || 'Admission Notice') + ' →');
        a.href = it.url || '/updates/';
        list.appendChild(a);
      }
      frag.appendChild(list);
      liveBox.replaceChildren(frag);
    }

    function renderTracks(orMode) {
      var list = filterTracks(state.prefs);
      statusBar.textContent = orMode
        ? ('ଦେଖାଯାଉଛି ' + list.length + ' / ' + ADMISSION_TRACKS.length + ' ଓଡ଼ିଶା ନାମଲେଖା ଓ କାଉନସେଲିଂ ଟ୍ରାକ୍')
        : ('Showing ' + list.length + ' of ' + ADMISSION_TRACKS.length + ' Odisha Admission & Counselling Tracks');

      if (!list.length) {
        tracksGrid.replaceChildren(el('div', 'cso-act-empty',
          orMode ? 'କୌଣସି ନାମଲେଖା ଟ୍ରାକ୍ ମିଳିଲା ନାହିଁ। ଦୟାକରି ଫିଲ୍ଟର ପରିଷ୍କାର କରନ୍ତୁ।' : 'No matching admission or counselling track found. Try resetting filters.'));
        return;
      }

      var calApi = win && win.CSOCalendarExport;
      var savedApi = win && win.CSOSavedAlerts;
      var frag = doc.createDocumentFragment();

      for (var i = 0; i < list.length; i += 1) {
        (function (tr) {
          var card = el('article', 'cso-act-card');
          card.setAttribute('data-act-track', tr.id);

          var badges = el('div', 'cso-act-badges');
          badges.appendChild(el('span', 'cso-act-badge cso-act-badge--auth', tr.authorityLabel));
          badges.appendChild(el('span', 'cso-act-badge', tr.fee));
          card.appendChild(badges);

          card.appendChild(el('h2', 'cso-act-card__title', orMode ? tr.or : tr.en));
          card.appendChild(el('p', 'cso-act-card__elig', orMode ? tr.eligibility_or : tr.eligibility_en));
          card.appendChild(el('p', 'cso-act-card__seats', (orMode ? 'ସିଟ୍ ମ୍ୟାଟ୍ରିକ୍ସ: ' : 'Seat Matrix: ') + tr.seatMatrix));

          // 4-Step Round Timeline
          var ol = el('ol', 'cso-act-steps');
          for (var s = 0; s < tr.steps.length; s += 1) {
            ol.appendChild(el('li', 'cso-act-step', tr.steps[s]));
          }
          card.appendChild(ol);

          // Actions: .ics reminder, Save track, Official portal
          var actions = el('div', 'cso-act-actions');

          var icsBtn = el('button', 'cso-act-btn',
            orMode ? '📅 କାଉନସେଲିଂ ରିମାଇଣ୍ଡର୍ (.ics)' : '📅 Add Counselling Reminder (.ics)');
          icsBtn.type = 'button';
          icsBtn.addEventListener('click', function () {
            if (calApi && typeof calApi.downloadSingleEvent === 'function') {
              calApi.downloadSingleEvent({
                title: tr.en + ' — Counselling Window',
                date: tr.reminderDate,
                description: tr.eligibility_en + ' | Portal: ' + tr.portal,
                url: 'https://csodisha.com/admissions/'
              }, tr.id + '-counselling');
            }
          });
          actions.appendChild(icsBtn);

          if (savedApi && typeof savedApi.createBookmarkButton === 'function') {
            var bmBtn = savedApi.createBookmarkButton({
              id: 'admission:' + tr.id,
              title: tr.en,
              url: '/admissions/#' + tr.id,
              category: 'Admissions',
              deadline: tr.reminderDate
            }, {
              isOr: orMode,
              labelUnsavedEn: '☆ Save Admission Track',
              labelSavedEn: '★ Track Saved',
              labelUnsavedOr: '☆ ଟ୍ରାକ୍ ସେଭ୍ କରନ୍ତୁ',
              labelSavedOr: '★ ସେଭ୍ ହୋଇଛି'
            });
            if (bmBtn) {
              bmBtn.classList.add('cso-act-btn');
              actions.appendChild(bmBtn);
            }
          }

          var portalLink = el('a', 'cso-act-btn cso-act-btn--primary',
            orMode ? '🏛️ ଅଫିସିଆଲ୍ ପୋର୍ଟାଲ୍ ↗' : '🏛️ Official Portal ↗');
          portalLink.href = tr.portal;
          portalLink.target = '_blank';
          portalLink.rel = 'noopener noreferrer';
          actions.appendChild(portalLink);

          if (tr.secondaryPortal) {
            var secLink = el('a', 'cso-act-btn',
              orMode ? '🔧 Skill Odisha ITI ↗' : '🔧 Skill Odisha ITI ↗');
            secLink.href = tr.secondaryPortal;
            secLink.target = '_blank';
            secLink.rel = 'noopener noreferrer';
            actions.appendChild(secLink);
          }

          card.appendChild(actions);
          frag.appendChild(card);
        })(list[i]);
      }

      tracksGrid.replaceChildren(frag);
    }

    function renderChecklist(orMode) {
      var prog = getChecklistProgress(state.checklist);
      var frag = doc.createDocumentFragment();
      var head = el('div', 'cso-act-checklist__head');
      head.appendChild(el('h2', 'cso-act-checklist__title',
        orMode ? '✅ କାଉନସେଲିଂ ଓ ରିପୋର୍ଟିଂ ଡକ୍ୟୁମେଣ୍ଟ୍ ଚେକଲିଷ୍ଟ' : '✅ Counselling Reporting Document Readiness Checklist'));
      head.appendChild(el('span', 'cso-act-checklist__meter',
        prog.completed + ' / ' + prog.total + (orMode ? ' ଯାଞ୍ଚ ହୋଇଛି (' : ' Verified (') + prog.pct + '%)'));
      frag.appendChild(head);

      var list = el('div', 'cso-act-checklist__grid');
      for (var i = 0; i < REPORTING_DOCS.length; i += 1) {
        (function (d) {
          var checked = Boolean(state.checklist[d.id]);
          var label = el('label', 'cso-act-doc-item' + (checked ? ' is-checked' : ''));
          var cb = el('input', 'cso-act-doc-cb');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.addEventListener('change', function () {
            state.checklist[d.id] = cb.checked;
            saveChecklist(state.checklist);
            renderChecklist(state.lang === 'or');
          });
          label.appendChild(cb);
          label.appendChild(el('span', 'cso-act-doc-txt', orMode ? d.or : d.en));
          list.appendChild(label);
        })(REPORTING_DOCS[i]);
      }
      frag.appendChild(list);
      docSection.replaceChildren(frag);
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-act-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-act-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      printBtn.textContent = orMode ? '🖨️ କାଉନସେଲିଂ ସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Counselling Sheet';
      lvlLabel.textContent = orMode ? 'ଶିକ୍ଷାଗତ ସ୍ତର / ଷ୍ଟ୍ରିମ୍' : 'Academic Level / Stream';
      phLabel.textContent = orMode ? 'କାଉନସେଲିଂ ପର୍ଯ୍ୟାୟ' : 'Admission Round / Phase';
      qLabel.textContent = orMode ? 'କୋର୍ସ, କଲେଜ କିମ୍ବା ପୋର୍ଟାଲ୍ ଖୋଜନ୍ତୁ' : 'Search Course, Portal or College';
      qInput.placeholder = orMode ? 'ଉଦାହରଣ: SAMS +2, OJEE B.Tech, Polytechnic, ITI, ITEP...' : 'e.g., SAMS +2, OJEE B.Tech, Polytechnic, ITI, B.Ed., ITEP...';
      resetBtn.textContent = orMode ? '↻ ଫିଲ୍ଟର ହଟାନ୍ତୁ' : '↻ Reset Filters';

      renderAuthorityPills(orMode);
      renderSelectOptions(lvlSelect, LEVELS, state.prefs.level, orMode);
      renderSelectOptions(phSelect, PHASES, state.prefs.phase, orMode);
      renderLiveNotices(orMode);
      renderTracks(orMode);
      renderChecklist(orMode);
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });

    lvlSelect.addEventListener('change', function () {
      state.prefs.level = lvlSelect.value;
      savePrefs(state.prefs);
      renderTracks(state.lang === 'or');
    });

    phSelect.addEventListener('change', function () {
      state.prefs.phase = phSelect.value;
      savePrefs(state.prefs);
      renderTracks(state.lang === 'or');
    });

    qInput.addEventListener('input', function () {
      state.prefs.query = qInput.value;
      savePrefs(state.prefs);
      renderTracks(state.lang === 'or');
    });

    resetBtn.addEventListener('click', function () {
      state.prefs = { authority: 'all', level: 'all', phase: 'all', query: '' };
      qInput.value = '';
      savePrefs(state.prefs);
      render();
    });

    render();

    // Hydrate live D1 admission notices
    if (typeof win.fetch === 'function') {
      win.fetch('/api/public/search-index', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && Array.isArray(data.items)) {
            state.liveNotices = extractLiveAdmissionNotices(data.items);
            renderLiveNotices(state.lang === 'or');
          }
        })
        .catch(function () {});
    }

    return { refresh: render };
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function () { mount(); });
    } else {
      mount();
    }
  }

  return {
    version: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    CHECKLIST_KEY: CHECKLIST_KEY,
    AUTHORITIES: AUTHORITIES,
    LEVELS: LEVELS,
    PHASES: PHASES,
    ADMISSION_TRACKS: ADMISSION_TRACKS,
    REPORTING_DOCS: REPORTING_DOCS,
    filterTracks: filterTracks,
    extractLiveAdmissionNotices: extractLiveAdmissionNotices,
    getChecklistProgress: getChecklistProgress,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    loadChecklist: loadChecklist,
    saveChecklist: saveChecklist,
    mount: mount
  };
});
