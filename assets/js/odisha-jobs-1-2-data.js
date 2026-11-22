(function (root) {
  'use strict';

  var ODISHA_RELAXATION = function (baseAge, feeNote, attemptsNote) {
    return [
      ['Unreserved (UR)', baseAge, (attemptsNote || 'No attempt cap') + ' · ' + (feeNote || '₹0 Exam Fee (Odisha State Waiver)')],
      ['SEBC (Odisha State List)', '+5 Years Relaxation (GA&PG Rule)', (attemptsNote ? '9 Attempts (OCS)' : 'No attempt cap') + ' · ' + (feeNote || '₹0 Exam Fee')],
      ['SC / ST (Odisha)', '+5 Years Relaxation (GA&PG Rule)', 'Unlimited attempts · ₹0 Exam Fee'],
      ['Women (All Categories)', '+5 Years Relaxation (GA&PG Rule)', '33% Horizontal Reservation · ₹0 Exam Fee'],
      ['PwBD (≥40% Disability)', '+10 Years (Cumulative +15 yrs for SC/ST/SEBC)', 'Scribe / Compensatory Time · ₹0 Exam Fee'],
      ['Ex-Servicemen (ESM)', 'Full Military Service + 3 Years', 'Horizontal Quota · ₹0 Exam Fee']
    ];
  };

  var ORSP_L4_TO_L9 = [
    { label: 'Level-4 (₹19,900)', pay: 19900 },
    { label: 'Level-5 (₹21,700)', pay: 21700 },
    { label: 'Level-7 (₹25,500)', pay: 25500 },
    { label: 'Level-8 (₹29,200)', pay: 29200 },
    { label: 'Level-9 (₹35,400)', pay: 35400 }
  ];

  var ORSP_L9_TO_L14 = [
    { label: 'Level-9 (₹35,400)', pay: 35400 },
    { label: 'Level-10 (₹44,900)', pay: 44900 },
    { label: 'Level-11 (₹47,600)', pay: 47600 },
    { label: 'Level-12 (₹56,100)', pay: 56100 },
    { label: 'Level-14 (₹78,800)', pay: 78800 }
  ];

  var ORSP_L10_TO_L16 = [
    { label: 'Level-10 (₹44,900)', pay: 44900 },
    { label: 'Level-12 (₹56,100)', pay: 56100 },
    { label: 'Level-13 (₹67,700)', pay: 67700 },
    { label: 'Level-14 (₹78,800)', pay: 78800 },
    { label: 'Level-16 (₹1,31,100)', pay: 131100 }
  ];

  var CSO_COMMON_TOOLS = [
    { href: '/tools/#orsp-salary-calculator', title: '💰 CSO ORSP 2017 Salary Calculator', desc: 'Calculate Odisha Level-4 to Level-16 Gross Pay, DA & HRA' },
    { href: '/tools/#age-calculator', title: '🎂 CSO Odisha Age Eligibility Calculator', desc: 'Check 1st January cut-off & +5/+10/+15 yr GA&PG relaxation' },
    { href: '/mock-tests/', title: '🧪 CSO Odisha Mock Tests', desc: 'Practice OPSC, OSSC, OSSSC, Odia Grammar & Odisha GK' },
    { href: '/study-library/', title: '📚 CSO Odisha Study Library', desc: 'Download Odisha Gazette Syllabus & PYQs' }
  ];

  function refs(list) {
    return (list || []).concat(CSO_COMMON_TOOLS);
  }

  var POLICE_SI_PST = [
    ['Height (Male UR / SEBC)', '168 cm minimum (SC/ST: 163 cm)', 'Weight: 55 kg (SC/ST: 50 kg)'],
    ['Height (Female UR / SEBC)', '155 cm minimum (SC/ST: 150 cm)', 'Weight: 47.5 kg (SC/ST: 45 kg)'],
    ['Chest (Male UR / SEBC)', '79 cm unexpanded / 84 cm expanded (SC/ST: 76 / 81 cm)', 'Minimum 5 cm expansion'],
    ['PET Running', 'Male: 1.6 km in 8 min · Female: 1.6 km in 10 min', 'Long Jump: 3.66 m (M) / 2.77 m (F) in 3 attempts'],
    ['Cycling / Swimming (SI)', 'Cycling 1.6 km (4.5 min M / 6 min F) · Swimming 40 m (optional/cadre)', 'Odisha Police Medical Board Fitness']
  ];

  var CONSTABLE_PST = [
    ['Height (Male UR / SEBC)', '168 cm (SC/ST: 163 cm)', 'Chest: 79–84 cm (SC/ST: 76–81 cm)'],
    ['Height (Female UR / SEBC)', '155 cm (SC/ST: 150 cm)', 'Weight: 47.5 kg (SC/ST: 45 kg)'],
    ['PET Running', 'Male: 1.6 km in 7 min · Female: 1.6 km in 9 min', 'Broad Jump, High Jump (1.22 m M / 0.91 m F), Rope Climbing'],
    ['Vision & Medical', '6/6 & 6/9 distant vision without glasses', 'No flat foot, knock-knee, varicose veins or colour blindness']
  ];

  var FOREST_PST = [
    ['Height (Male / Female)', 'Male UR/SEBC: 168 cm (ST: 158 cm) · Female: 153 cm', 'Chest (Male): 81 cm unexpanded / 86 cm expanded'],
    ['Walking Test (4 Hours)', 'Male: 25 km in 4 hours · Female: 16 km in 4 hours', 'Mandatory Odisha Forest Service / Forester / Guard endurance test'],
    ['Cycling Test', '1.6 km cycling proficiency test (where notified)', 'Odisha Forest Dept Medical Fitness Certificate']
  ];

  var BRANCHES = {
    // ================= 1.2.1 OPSC =================
    'odisha-civil-services': {
      l2Code: '1.2.1',
      title: 'OPSC Odisha Civil Services (OCS) — OAS, OFS, OPS, OCS, ORFS & Allied',
      title_or: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OCS) — OAS, OFS, OPS',
      organisation: 'Odisha Public Service Commission (OPSC), Cuttack',
      qualification: "Bachelor's Degree in any discipline + Odia proficiency (ME / HSC / Odia pass)",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10; UR 6, SEBC 9, SC/ST Unlimited attempts)',
      pay_level: 'ORSP 2017 Level-12 (₹56,100 – ₹1,77,500) Group-A & Level-10 (₹44,900) Group-B',
      vacancies: '200–400+ Annual Group-A & Group-B Gazetted Posts',
      apply_url: 'https://www.opsc.gov.in',
      summary: 'Odisha Civil Services Examination (OCS) conducted by OPSC Cuttack recruits Group-A & Group-B State Gazetted Officers into Odisha Administrative Service (OAS), Odisha Finance Service (OFS), Odisha Police Service (OPS), Odisha Revenue Service (ORS), and Odisha Co-operative / Taxation / Welfare Services across all 30 Odisha districts.',
      summary_or: 'OPSC କଟକ ଦ୍ୱାରା ପରିଚାଳିତ ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OCS) ପରୀକ୍ଷା ମାଧ୍ୟମରେ OAS, OFS, OPS, ORS ଏବଂ ଅନ୍ୟାନ୍ୟ ଗ୍ରୁପ୍-A/B ରାଜ୍ୟ ଗେଜେଟେଡ୍ ଅଧିକାରୀ ପଦବୀରେ ନିଯୁକ୍ତି ହୁଏ।',
      examPatternTable: [
        ['Prelims Paper-I (GS)', '100 Objective Qs · 200 Marks · 2 Hours', '-0.33 Negative Marking (Odisha & India GS)'],
        ['Prelims Paper-II (CSAT)', '80 Objective Qs · 200 Marks · 2 Hours', 'Qualifying at 33% (66/200) · -0.33 Negative Marking'],
        ['Mains Qualifying Papers (2)', 'Odia Language (250 Marks) + English (250 Marks)', '3 Hours each · Qualifying at 25% (63/250) each'],
        ['Mains Merit Papers (7)', 'Essay (250) + GS-I/II/III/IV (4×250=1,000) + Optional I & II (2×250=500)', 'Total Mains Merit: 1,750 Marks (Descriptive)'],
        ['Personality Test / Viva-Voce', '250 Marks (OPSC Board at Cuttack)', 'Grand Total Merit: 2,000 Marks (1,750 + 250)']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years', '₹0 Exam Fee (Odisha State Waiver)', 'UR 6 / SEBC 9 / SC-ST Unlimited'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.opsc.gov.in', title: '🏛️ OPSC Official Portal (opsc.gov.in)', desc: 'OCS Notification, Online Application & Admit Card' },
        { href: 'https://gaodisha.gov.in', title: '📜 GA & PG Department, Odisha', desc: 'OAS Cadre Rules, Age Relaxation & Reservation Gazette' }
      ])
    },
    'administrative-and-executive-posts': {
      l2Code: '1.2.1',
      title: 'OPSC Administrative & Executive Posts (ORS, OES, OWS, OIS, Statistical Officer)',
      title_or: 'OPSC ପ୍ରଶାସନିକ ଓ କାର୍ଯ୍ୟନିର୍ବାହୀ ପଦବୀ (ORS, OES, OWS)',
      organisation: 'Odisha Public Service Commission (OPSC)',
      qualification: "Bachelor's / Master's Degree in relevant discipline + Odia ME/HSC pass",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-10 (₹44,900) to Level-12 (₹56,100)',
      vacancies: 'Notified Cadre Vacancies across Odisha Departments',
      apply_url: 'https://www.opsc.gov.in',
      summary: 'Direct OPSC Gazetted Group-A/B administrative and executive recruitments including Assistant Director (Statistics/Economics), Odisha Welfare Service (OWS), Labour Officer, and District Culture/Sports Officer across Odisha.',
      summary_or: 'OPSC ମାଧ୍ୟମରେ ଓଡ଼ିଶା କଲ୍ୟାଣ ସେବା (OWS), ସହକାରୀ ନିର୍ଦ୍ଦେଶକ (ପରିସଂଖ୍ୟାନ), ଶ୍ରମ ଅଧିକାରୀ ଆଦି ଗେଜେଟେଡ୍ ପ୍ରଶାସନିକ ପଦବୀରେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Examination (CBRT/OMR)', 'Paper-I (GS & Odia/English) + Paper-II (Domain Subject)', 'Objective MCQ · -0.25 Negative Marking'],
        ['Viva-Voce / Interview', '30–50 Marks (3x/2x shortlisted candidates)', 'Final Merit: Written + Viva-Voce']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.opsc.gov.in', title: '🏛️ OPSC Recruitment Portal', desc: 'Apply Online & Syllabus PDFs' }
      ])
    },
    'assistant-section-officer-and-other-notified-posts': {
      l2Code: '1.2.1',
      title: 'OPSC Assistant Section Officer (ASO) — Odisha Secretariat Service',
      title_or: 'OPSC ସହକାରୀ ସେକ୍ସନ ଅଫିସର (ASO) — ଲୋକସେବା ଭବନ',
      organisation: 'Odisha Public Service Commission (OPSC) / Home Department',
      qualification: "Bachelor's Degree in any discipline + Adequate Computer Application Knowledge + Odia ME/HSC",
      age_limit: '21–32 yrs / 38 yrs (as notified by GA&PG Dept; SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-9 (₹35,400 – ₹1,12,400) Group-B State Service',
      vacancies: '796+ Secretariat Group-B ASO Posts',
      apply_url: 'https://www.opsc.gov.in',
      summary: 'OPSC ASO recruits Group-B Assistant Section Officers for Odisha Secretariat (Lokaseva Bhawan, Bhubaneswar) and Governor Secretariat through a 400-mark written test plus qualifying Computer Skill Test.',
      summary_or: 'ଲୋକସେବା ଭବନ (ଓଡ଼ିଶା ସଚିବାଳୟ) ରେ ଗ୍ରୁପ୍-B ସହକାରୀ ସେକ୍ସନ ଅଫିସର (ASO) ପଦବୀ ପାଇଁ OPSC ଦ୍ୱାରା ୪୦୦ ମାର୍କର ଲିଖିତ ପରୀକ୍ଷା ଓ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା।',
      examPatternTable: [
        ['Paper-I: General Awareness', '100 Qs · 100 Marks · 1.5 Hours', '-0.25 Negative Marking (Odisha & National GK)'],
        ['Paper-II: Reasoning & Mathematics', '100 Qs (50 Reasoning + 50 Maths) · 100 Marks · 1.5 Hours', '-0.25 Negative Marking'],
        ['Paper-III: Odia & English Language', '200 Qs (100 Odia + 100 English) · 200 Marks · 2 Hours', '-0.25 Negative Marking · Total Written: 400 Marks'],
        ['Stage-II: Computer Skill Test', '50 Marks (Practical MS Windows, Word, Excel, PowerPoint)', 'Qualifying (Minimum 40% / 20 Marks)']
      ],
      relaxationTable: ODISHA_RELAXATION('21–32 / 38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://www.opsc.gov.in', title: '🏛️ OPSC ASO Portal', desc: 'ASO Advertisement & Provisional Select List' },
        { href: 'https://home.odisha.gov.in', title: '🏢 Home Department, Odisha', desc: 'Odisha Secretariat Service Cadre Rules' }
      ])
    },
    'medical-engineering-and-specialist-recruitment': {
      l2Code: '1.2.1',
      title: 'OPSC Medical Officer (OMHS), Assistant Executive Engineer (AEE) & Specialists',
      title_or: 'OPSC ମେଡିକାଲ ଅଫିସର (OMHS), ସହକାରୀ ନିର୍ବାହୀ ଯନ୍ତ୍ରୀ (AEE)',
      organisation: 'Odisha Public Service Commission (OPSC)',
      qualification: 'MBBS (OMHS) / MD-MS (Specialist) / B.E.-B.Tech Civil, Mech, Elec (AEE) + Odia ME/HSC',
      age_limit: '21–38 yrs (Doctors up to 40/45 yrs as notified; SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-12 (₹56,100 – ₹1,77,500) Class-I / Group-A',
      vacancies: '500–1,300+ Medical Officer & AEE Gazetted Posts',
      apply_url: 'https://www.opsc.gov.in',
      summary: 'OPSC recruits Assistant Surgeons / Medical Officers (OMHS Group-A), Dental Surgeons, Homoeopathic/Ayurvedic MOs, and Assistant Executive Engineers (Civil/Mechanical/Electrical) for Works, Water Resources, Housing & Urban Dev, and Health Departments.',
      summary_or: 'OPSC ମାଧ୍ୟମରେ ଓଡ଼ିଶା ମେଡିକାଲ ଓ ହେଲଥ୍ ସର୍ଭିସ୍ (OMHS) ଡାକ୍ତର ଏବଂ ପୂର୍ତ୍ତ, ଜଳସମ୍ପଦ ଓ ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ ବିଭାଗର AEE (ସିଭିଲ୍/ମେକାନିକାଲ/ଇଲେକ୍ଟ୍ରିକାଲ) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Medical Officer (OMHS)', '200 MCQ Qs · 200 Marks · 3 Hours (No Negative Marking)', 'Clinical, Pre-Clinical & Para-Clinical MBBS Syllabus'],
        ['AEE (GATE / OPSC Written)', 'GATE Score + OPSC Interview OR Written + Viva-Voce', 'B.Tech Civil / Mechanical / Electrical Core'],
        ['Document Verification & Medical', 'OCMR / OMC Registration & Odia Pass Proof', '30-District CHC/DHH & Engineering Division Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 40 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.opsc.gov.in', title: '🏛️ OPSC OMHS & AEE Portal', desc: 'Medical & Engineering Gazetted Recruitment' },
        { href: 'https://health.odisha.gov.in', title: '🏥 Health & Family Welfare, Odisha', desc: 'OMHS Cadre & Posting Rules' }
      ])
    },
    'other-opsc-examinations': {
      l2Code: '1.2.1',
      title: 'Other OPSC Examinations (OFS Forest Service, Assistant Professor, PGT, Law Officer)',
      title_or: 'ଅନ୍ୟାନ୍ୟ OPSC ପରୀକ୍ଷା (ACF/Forest Ranger, Assistant Professor, PGT)',
      organisation: 'Odisha Public Service Commission (OPSC)',
      qualification: 'B.Sc / Master Degree (55% + NET/Ph.D for Asst Prof) / B.Ed + Odia ME/HSC',
      age_limit: '21–38 yrs / 21–45 yrs (Assistant Professor) as on Jan 1',
      pay_level: 'ORSP Level-10 (₹44,900) / Level-12 (₹56,100) / Academic Level-10 (₹57,700)',
      vacancies: 'ACF, Forest Range Officer, OES College Asst Prof, Govt PGT',
      apply_url: 'https://www.opsc.gov.in',
      summary: 'Includes OPSC Odisha Forest Service (ACF & Forest Range Officer), OES Assistant Professor (Govt Degree Colleges), Higher Secondary PGTs, Insurance Medical Officer, and Tourist/Research Officer examinations.',
      summary_or: 'OPSC ଦ୍ୱାରା ପରିଚାଳିତ ACF, ଫରେଷ୍ଟ ରେଞ୍ଜ ଅଫିସର, ସରକାରୀ ମହାବିଦ୍ୟାଳୟ ଆସିଷ୍ଟାଣ୍ଟ ପ୍ରଫେସର (OES) ଏବଂ +୨ PGT ନିଯୁକ୍ତି ପରୀକ୍ଷା।',
      examPatternTable: [
        ['ACF / Forest Ranger', 'Written (English, GK, 2 Forestry/Science Optionals = 1,400 Marks) + Walk Test + Viva', '25 km (M) / 16 km (F) Walk in 4 Hrs'],
        ['Assistant Professor (OES)', 'API Shortlisting (UGC) + Viva-Voce Interview (100 Marks)', 'NET / SET / Ph.D Mandatory'],
        ['Govt Higher Secondary PGT', 'Written MCQ / Descriptive + Viva-Voce', 'Master Degree (50%) + B.Ed']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 45 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.opsc.gov.in', title: '🏛️ OPSC Examinations Archive', desc: 'ACF, OES Asst Prof & PGT Advertisements' }
      ])
    },

    // ================= 1.2.2 OSSC =================
    'combined-graduate-level-recruitment-examination': {
      l2Code: '1.2.2',
      title: 'OSSC Combined Graduate Level Recruitment Examination (CGLRE)',
      title_or: 'OSSC କମ୍ବାଇନ୍ଡ ଗ୍ରାଜୁଏଟ୍ ଲେଭେଲ୍ (CGLRE)',
      organisation: 'Odisha Staff Selection Commission (OSSC), Bhubaneswar',
      qualification: "Bachelor's Degree in any discipline + Computer Knowledge + Odia ME/HSC pass",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-7 (₹25,500) to Level-9 (₹35,400) Group-B & C',
      vacancies: '500–1,200+ Annual Group-B/C State Cadre Posts',
      apply_url: 'https://www.ossc.gov.in',
      summary: 'OSSC CGLRE is Odisha’s premier graduate-level examination recruiting Auditor, Inspector of Supplies, Junior Enforcement Officer, Inspector of Co-operative Societies, Junior Employment Officer, and Assistant CT & GST Officer across Odisha State Directorates.',
      summary_or: 'OSSC CGLRE ମାଧ୍ୟମରେ ଓଡ଼ିଶାର ବିଭିନ୍ନ ନିର୍ଦ୍ଦେଶାଳୟରେ ଅଡିଟର, ଯୋଗାଣ ନିରୀକ୍ଷକ, ସମବାୟ ନିରୀକ୍ଷକ, CT & GST ଅଫିସର ଆଦି ଗ୍ରୁପ୍-B/C ପଦବୀରେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Stage-I: Preliminary Exam', '150 Qs · 150 Marks · 150 Min (Arithmetic, DI, Reasoning, Current Affairs, Computer)', 'CBRT/OMR · -0.25 Negative Marking · 5x Shortlisting'],
        ['Stage-II: Main Written Exam', 'Paper-I Language (Odia & English 100 Marks) + Paper-II GS (100 Marks)', 'Total 200 Marks · -0.25 Negative Marking'],
        ['Stage-III: Computer Skill / Cert Verification', 'Computer Practical (50 Marks Qualifying) + Document Verification', 'Auditor / Specialist Posts include Domain Paper']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.ossc.gov.in', title: '📋 OSSC Official Portal (ossc.gov.in)', desc: 'CGLRE Calendar, Admit Cards & Answer Keys' }
      ])
    },
    'combined-higher-secondary-level-recruitment-examination': {
      l2Code: '1.2.2',
      title: 'OSSC Combined Higher Secondary (10+2) Recruitment Examination (CHSLE)',
      title_or: 'OSSC କମ୍ବାଇନ୍ଡ ହାୟର ସେକେଣ୍ଡାରୀ (CHSLE 10+2)',
      organisation: 'Odisha Staff Selection Commission (OSSC)',
      qualification: '+2 (10+2) / Equivalent (+ Diploma/Computer for Amin/Soil Conservation) + Odia ME/HSC',
      age_limit: '21–38 yrs (18–38 yrs for some posts) as on Jan 1',
      pay_level: 'ORSP 2017 Level-4 (₹19,900) to Level-7 (₹25,500)',
      vacancies: '350–670+ State 10+2 Cadre Posts (Amin, Soil Conservation Ext Worker, Welfare Ext Officer)',
      apply_url: 'https://www.ossc.gov.in',
      summary: 'OSSC CHSLE recruits 10+2 qualified candidates into Soil Conservation Extension Worker, Amin, Technical Assistant, Weaving Supervisor, and Ayush Assistant posts across Odisha districts.',
      summary_or: '+୨ ଯୋଗ୍ୟତାଧାରୀଙ୍କ ପାଇଁ OSSC CHSLE ମାଧ୍ୟମରେ ମୃତ୍ତିକା ସଂରକ୍ଷଣ କର୍ମୀ, ଅମିନ, ଟେକ୍ନିକାଲ ଆସିଷ୍ଟାଣ୍ଟ ଆଦି ପଦବୀରେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Prelims (OMR / CBRT)', '150 Qs · 150 Marks · 150 Min (Arithmetic, Reasoning, GK, Computer, DI)', '-0.25 Negative Marking'],
        ['Mains Written Exam', '200 Marks (Language, GS & Post-Specific Technical Paper)', '-0.25 Negative Marking'],
        ['Certificate Verification', 'Original +2, Caste, Resident & Odia Pass Verification', 'District / Directorate Cadre Allotment']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.ossc.gov.in', title: '📋 OSSC CHSLE Notifications', desc: '10+2 Recruitment Syllabus & Calendar' }
      ])
    },
    'specialist-and-technical-posts': {
      l2Code: '1.2.2',
      title: 'OSSC Combined Technical Services Recruitment Examination (CTSRE) & Specialists',
      title_or: 'OSSC କମ୍ବାଇନ୍ଡ ଟେକ୍ନିକାଲ ସର୍ଭିସେସ୍ (CTSRE — JE, ATO, Technician)',
      organisation: 'Odisha Staff Selection Commission (OSSC)',
      qualification: 'Diploma in Civil/Mech/Elec Engineering OR ITI/NCVT + Odia ME/HSC pass',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-7 (₹25,500) / Level-9 (₹35,400 – Junior Engineer)',
      vacancies: '400–1,000+ Junior Engineer (Civil/Mech/Elec) & ATO Posts',
      apply_url: 'https://www.ossc.gov.in',
      summary: 'OSSC CTSRE recruits Diploma Junior Engineers (Civil, Mechanical, Electrical), Assistant Training Officers (ATO), Junior Mining Officers, and Laboratory Assistants across Works, WR, RD, PR&DW, and Skill Development Departments.',
      summary_or: 'OSSC CTSRE ମାଧ୍ୟମରେ ପୂର୍ତ୍ତ, ଜଳସମ୍ପଦ ଓ ପଞ୍ଚାୟତିରାଜ ବିଭାଗରେ ଜୁନିଅର ଇଞ୍ଜିନିୟର (JE Civil/Mech/Elec) ଓ ITI ATO ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Stage-I: Preliminary Exam', '150 Qs · 150 Marks · 150 Min (Arithmetic, DI, Reasoning, Current Affairs, Computer)', '-0.25 Negative Marking'],
        ['Stage-II: Technical Paper', '200 Marks (100/200 Technical Qs in Civil / Mech / Elec / Trade)', 'Diploma / ITI Standard · -0.25 Negative Marking'],
        ['Certificate Verification', 'AICTE/SCTEVT Diploma or NCVT ITI Verification', 'Direct Merit Selection (No Interview)']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.ossc.gov.in', title: '📋 OSSC CTSRE Technical Portal', desc: 'JE Civil/Mech/Elec & ATO Syllabus' }
      ])
    },
    'junior-assistant-and-clerical-posts': {
      l2Code: '1.2.2',
      title: 'OSSC & OSSSC Junior Assistant, Junior Clerk & Head Clerk Cadres',
      title_or: 'OSSC / OSSSC ଜୁନିଅର ଆସିଷ୍ଟାଣ୍ଟ ଓ ଜୁନିଅର କ୍ଲର୍କ ପଦବୀ',
      organisation: 'OSSC (Heads of Dept) & OSSSC (District Cadre)',
      qualification: "Bachelor's Degree / +2 with Basic Computer Skill (PGDCA/OS-CIT) + Odia ME/HSC",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900 – ₹63,200) Group-C',
      vacancies: '2,000+ Secretariat HOD & 30-District Clerical Posts',
      apply_url: 'https://www.ossc.gov.in',
      summary: 'Covers both OSSC Junior Assistant / Junior Stenographer (Heads of Departments, Bhubaneswar) and OSSSC District Cadre Junior Assistant / Junior Clerk posts with Computer Practical Skill Test.',
      summary_or: 'ଭୁବନେଶ୍ୱରସ୍ଥିତ HOD କାର୍ଯ୍ୟାଳୟ (OSSC) ଏବଂ ୩୦ଟି ଜିଲ୍ଲା କାର୍ଯ୍ୟାଳୟ (OSSSC) ରେ ଜୁନିଅର ଆସିଷ୍ଟାଣ୍ଟ ଓ ଜୁନିଅର କ୍ଲର୍କ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (180–200 Marks)', 'Odia, English, Mathematics, GK & Basic Computer', 'OMR / CBRT · -0.25 to -0.50 Negative Marking'],
        ['Practical Computer Skill Test', '50 Marks (MS Word, Excel, PowerPoint, Odia/English Typing)', 'Qualifying (40% Cutoff) · Stenography 80 wpm for Steno']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.ossc.gov.in', title: '📋 OSSC HOD Clerical Portal', desc: 'Junior Assistant & Stenographer Notices' },
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC District JA Portal', desc: 'District Cadre Junior Assistant & PEO' }
      ])
    },
    'other-ossc-recruitment': {
      l2Code: '1.2.2',
      title: 'Other OSSC Recruitments (Traffic SI, Excise SI, CGL Specialist, Statistical Field Surveyor)',
      title_or: 'ଅନ୍ୟାନ୍ୟ OSSC ନିଯୁକ୍ତି (ଟ୍ରାଫିକ୍ SI, ଅବକାରୀ SI, ଷ୍ଟାଟିଷ୍ଟିକାଲ ଫିଲ୍ଡ ସର୍ଭେୟର)',
      organisation: 'Odisha Staff Selection Commission (OSSC)',
      qualification: "Bachelor's Degree / +2 (Post-specific) + Odia ME/HSC",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-5 (₹21,700) to Level-9 (₹35,400)',
      vacancies: 'Specialised State Directorate Notifications',
      apply_url: 'https://www.ossc.gov.in',
      summary: 'Includes OSSC Sub-Inspector of Traffic, Sub-Inspector of Excise, Junior Motor Vehicle Inspector (JMVI), Statistical Field Surveyor, and Welfare Extension Officer recruitments.',
      summary_or: 'OSSC ଦ୍ୱାରା ପରିଚାଳିତ ଟ୍ରାଫିକ୍ SI, ଅବକାରୀ SI, JMVI ଏବଂ ଷ୍ଟାଟିଷ୍ଟିକାଲ ଫିଲ୍ଡ ସର୍ଭେୟର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Prelims & Mains Written', 'GS, Arithmetic, Reasoning, Computer & Domain Paper', 'CBRT / OMR · -0.25 Negative Marking'],
        ['Skill / Physical Test (if applicable)', 'PMT/PET for Excise/Traffic SI · Driving/Tech for JMVI', 'Merit on Written + Verification']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.ossc.gov.in', title: '📋 OSSC All Notifications', desc: 'Latest Calendar & Results' }
      ])
    },

    // ================= 1.2.3 OSSSC =================
    'ri-ari-and-related-notified-posts': {
      l2Code: '1.2.3',
      title: 'OSSSC Combined Recruitment Exam (CRE) — RI, ICDS Supervisor, ARI, Amin, SFS',
      title_or: 'OSSSC କମ୍ବାଇନ୍ଡ ପରୀକ୍ଷା (CRE) — RI, ICDS ସୁପରଭାଇଜର, ARI, ଅମିନ',
      organisation: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
      qualification: "Bachelor's Degree (RI / ICDS Supervisor) or +2 (ARI / Amin / SFS) + Computer + Odia",
      age_limit: '21–38 yrs (RI/ICDS) / 20–38 yrs (ARI/Amin/SFS) as on Jan 1',
      pay_level: 'ORSP 2017 Level-4 (₹19,900 – Amin/ARI) to Level-9 (₹35,400 – RI/ICDS)',
      vacancies: '2,895+ District Revenue & Field Cadre Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'OSSSC CRE is Odisha’s largest district-level revenue & field recruitment covering Revenue Inspector (RI), ICDS Supervisor (Women), Assistant Revenue Inspector (ARI), Amin, and Statistical Field Surveyor (SFS) across all 30 districts.',
      summary_or: 'OSSSC CRE ମାଧ୍ୟମରେ ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାରେ ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI), ICDS ସୁପରଭାଇଜର, ARI, ଅମିନ ଏବଂ SFS ପଦବୀରେ ବୃହତ୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Preliminary Exam (100 Marks)', 'Mathematics (20), GS (20), English (20), Odia (20), Reasoning (20)', '1.5 Hours · -0.33 Negative Marking · 5x Shortlist'],
        ['Main Written Exam (180 Marks)', 'Maths (40), GS (40), English (40), Odia (40), Computer (20)', '3 Hours · -0.33 Negative Marking'],
        ['Skill Test & District Allocation', 'Practical Computer Test (50 Marks Qualifying) + District Preference', 'District Collectorate Appointment']
      ],
      relaxationTable: ODISHA_RELAXATION('20/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC Official Portal (osssc.gov.in)', desc: 'CRE RI/ARI/Amin/ICDS Registration & Admit Card' }
      ])
    },
    'revenue-and-field-level-positions': {
      l2Code: '1.2.3',
      title: 'OSSSC Revenue & Field Positions (PEO, Gram Rozgar Sevak, Tahasil Field Staff)',
      title_or: 'OSSSC ରାଜସ୍ୱ ଓ କ୍ଷେତ୍ରସ୍ତରୀୟ ପଦବୀ (PEO, ତହସିଲ କର୍ମଚାରୀ)',
      organisation: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
      qualification: '+2 Pass (10+2) + Basic Computer Skill + Odia ME/HSC pass',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-5 (₹21,700 – ₹69,100)',
      vacancies: '2,297+ Panchayat Executive Officer (PEO) & Field Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'Covers OSSSC Panchayat Executive Officer (PEO) and Gram Panchayat / Tahasil field-level district cadre posts responsible for rural governance, welfare schemes, and land record support.',
      summary_or: 'OSSSC ମାଧ୍ୟମରେ ଗ୍ରାମ ପଞ୍ଚାୟତ କାର୍ଯ୍ୟନିର୍ବାହୀ ଅଧିକାରୀ (PEO) ଓ କ୍ଷେତ୍ରସ୍ତରୀୟ ପଦବୀରେ ଜିଲ୍ଲାୱାରୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (180 Marks)', 'English (40), Odia (35), Mathematics (35), GK (35), Computer (35)', '3 Hours · -0.50 Negative Marking'],
        ['Practical Computer Test', '50 Marks (MS Office, Internet & File Management)', 'Qualifying at 40% (20 Marks)']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC PEO & Field Portal', desc: 'District-wise Vacancy & Merit List' }
      ])
    },
    'nursing-officer-and-other-notified-recruitment': {
      l2Code: '1.2.3',
      title: 'OSSSC Nursing Officer, Pharmacist, MPHW (F/M) & Radiographer Recruitment',
      title_or: 'OSSSC ନର୍ସିଂ ଅଫିସର, ଫାର୍ମାସିଷ୍ଟ ଓ MPHW ନିଯୁକ୍ତି',
      organisation: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
      qualification: 'GNM / B.Sc Nursing (ONMRC Regd) / D.Pharm / ANM + Odia ME/HSC pass',
      age_limit: '21–38 yrs as on Jan 1 (Contractual age relaxation +1 yr/year of service)',
      pay_level: 'ORSP 2017 Level-7 (₹25,500) / Level-8 (₹29,200 – ₹92,300)',
      vacancies: '7,483+ Nursing Officer & 2,753+ MPHW(F) District Medical Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'OSSSC conducts massive state-wide recruitment for Nursing Officers, Pharmacists, Multipurpose Health Workers (Male/Female), Radiographers, and Lab Technicians for all 30 District Headquarter Hospitals (DHH), SDH, CHC, and Medical Colleges.',
      summary_or: 'OSSSC ମାଧ୍ୟମରେ ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), CHC ଓ ମେଡିକାଲ କଲେଜରେ ନର୍ସିଂ ଅଫିସର, ଫାର୍ମାସିଷ୍ଟ ଓ MPHW ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (100 Marks)', 'Domain Technical Qs (60) + Practical Skill Qs (25) + Arithmetic (10) + English (5)', '2 Hours · -0.25 Negative Marking'],
        ['Experience Weightage', '1% per completed year of contractual service (max 5%)', 'ONMRC / Odisha Pharmacy Council Registration Mandatory']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC Health Cadre Portal', desc: 'Nursing Officer, Pharmacist & MPHW Notices' },
        { href: 'https://health.odisha.gov.in', title: '🏥 Health & Family Welfare Odisha', desc: 'ONMRC & Paramedical Cadre Rules' }
      ])
    },
    'forest-agriculture-and-technical-posts': {
      l2Code: '1.2.3',
      title: 'OSSSC Forest Guard, Forester, Livestock Inspector (LSI) & Horticulture Posts',
      title_or: 'OSSSC ଫରେଷ୍ଟ ଗାର୍ଡ, ଫରେଷ୍ଟର ଓ ଲାଇଭ୍‌ଷ୍ଟକ୍ ଇନ୍ସପେକ୍ଟର (LSI)',
      organisation: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
      qualification: '10th Pass (Forest Guard) / +2 Science (Forester / Livestock Inspector) + Odia',
      age_limit: '18–38 yrs (Forest Guard) / 18–38 yrs (Forester/LSI) as on Jan 1',
      pay_level: 'ORSP 2017 Level-4 (₹19,900) to Level-7 (₹25,500)',
      vacancies: '2,712+ Combined CRE Forest Guard, Forester & LSI Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'OSSSC CRE for Forest Guard, Forester, and Livestock Inspector (LSI) combines a 150-mark CBRT written exam with mandatory Odisha Physical Standard Measurement (PST) and 25 km (Male) / 16 km (Female) walking endurance test.',
      summary_or: 'OSSSC CRE ମାଧ୍ୟମରେ ଫରେଷ୍ଟ ଗାର୍ଡ, ଫରେଷ୍ଟର ଓ ପ୍ରାଣୀଧନ ନିରୀକ୍ଷକ (LSI) ନିଯୁକ୍ତି। ୧୫୦ ମାର୍କର ଲିଖିତ ପରୀକ୍ଷା ସହ ୨୫ କି.ମି./୧୬ କି.ମି. ଚାଲିବା ପରୀକ୍ଷା ବାଧ୍ୟତାମୂଳକ।',
      examPatternTable: [
        ['Written CBRT (150 Marks)', 'English (25), Odia (25), Arithmetic (25), GK (25), Computer (25), Gen Science (25)', '2.5 Hours · -0.50 Negative Marking'],
        ['PST & Walking Test (PET)', 'Height/Chest Measurement + 25 km (M) / 16 km (F) Walk in 4 Hours', 'Qualifying (Conducted at Forest Divisions)']
      ],
      relaxationTable: ODISHA_RELAXATION('18–38 Years'),
      physicalStandards: FOREST_PST,
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC Forest & LSI Portal', desc: 'CRE Forest Guard/Forester/LSI Application' },
        { href: 'https://forest.odisha.gov.in', title: '🌲 Forest, Environment & CC Dept', desc: 'Odisha Forest Division Cadre Info' }
      ])
    },

    // ================= 1.2.4 EDUCATION =================
    'government-school-teachers': {
      l2Code: '1.2.4',
      title: 'OSEPA / DSE Odisha Government School Teachers (LTR, RHT & SSD Schools)',
      title_or: 'OSEPA / DSE ଓଡ଼ିଶା ସରକାରୀ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ (LTR / RHT / SSD)',
      organisation: 'OSEPA / Directorate of Secondary Education (DSE) / ST&SC Dev Dept',
      qualification: 'Graduation (50%) + B.Ed / B.A.Ed / B.Sc.Ed + OSSTET Qualified + Odia ME/HSC',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-9 (₹35,400 – TGT/Hindi/Sanskrit/PET)',
      vacancies: '6,025+ Leave Training Reserve (LTR) & 7,540+ RHT Posts',
      apply_url: 'https://osepa.odisha.gov.in',
      summary: 'State-wide regular teacher recruitment for Odisha Government High Schools (TGT Arts, TGT Science PCM/CBZ, Hindi, Sanskrit, Telugu, Urdu, PET) under School & Mass Education and ST&SC Development Departments.',
      summary_or: 'ଓଡ଼ିଶା ସରକାରୀ ଉଚ୍ଚ ବିଦ୍ୟାଳୟରେ TGT କଳା, TGT ବିଜ୍ଞାନ, ହିନ୍ଦୀ, ସଂସ୍କୃତ ଓ PET ଶିକ୍ଷକ (LTR / RHT) ନିଯୁକ୍ତି। OSSTET ଉତ୍ତୀର୍ଣ୍ଣ ବାଧ୍ୟତାମୂଳକ।',
      examPatternTable: [
        ['Preliminary Exam (if >10x)', '100 Marks (GK, Current Affairs, Reasoning, Computer, Pedagogy)', 'CBRT · -0.25 Negative Marking'],
        ['Main Written Exam (150 Marks)', 'Subject Content (100 Marks) + Pedagogy & Odia/English (50 Marks)', '2.5 Hours · -0.25 Negative Marking'],
        ['District Preference Merit', 'OSSTET Certificate + 30-District Counselling', 'Regular Level-9 Scale from Day 1']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://osepa.odisha.gov.in', title: '🏫 OSEPA Teacher Portal', desc: 'LTR / RHT / JTS Official Notifications' },
        { href: 'https://www.bseodisha.ac.in', title: '📝 BSE Odisha (OSSTET / OTET)', desc: 'Teacher Eligibility Test Certificates' }
      ])
    },
    'primary-and-upper-primary-teaching': {
      l2Code: '1.2.4',
      title: 'OSEPA Junior Teacher (Schematic / Regular) — Class I–V & VI–VIII',
      title_or: 'OSEPA ଜୁନିଅର ଶିକ୍ଷକ (ପ୍ରାଥମିକ ଓ ଉଚ୍ଚ ପ୍ରାଥମିକ)',
      organisation: 'Odisha School Education Programme Authority (OSEPA)',
      qualification: '+2 (50%) + D.El.Ed / CT + OTET Paper-I (Cat-I) OR Graduation + B.Ed/D.El.Ed + OTET-II',
      age_limit: '18–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'Schematic Pay ₹16,000–₹20,000 -> Regular ORSP Level-6/7 upon absorption',
      vacancies: '20,000+ Primary & Upper Primary Junior Teacher Posts',
      apply_url: 'https://osepa.odisha.gov.in',
      summary: 'OSEPA recruits Category-I (Class I–V) and Category-II (Class VI–VIII Arts/Science) Junior Teachers across all 30 Zilla Parishads of Odisha through Computer-Based Recruitment Test (CBRT).',
      summary_or: 'OSEPA ମାଧ୍ୟମରେ ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲା ପରିଷଦ ଅଧୀନରେ ପ୍ରାଥମିକ (ଶ୍ରେଣୀ I–V) ଓ ଉଚ୍ଚ ପ୍ରାଥମିକ (VI–VIII) ଜୁନିଅର ଶିକ୍ଷକ ନିଯୁକ୍ତି। OTET ଉତ୍ତୀର୍ଣ୍ଣ ବାଧ୍ୟତାମୂଳକ।',
      examPatternTable: [
        ['Paper-I (Category-I: Class I–V)', '120 Qs · 240 Marks (GK, Reasoning, Computer, Child Dev, Odia, Eng, Maths, EVS)', '2.5 Hours CBRT · -0.50 Negative Marking'],
        ['Paper-II (Category-II: Class VI–VIII)', '120 Qs · 240 Marks (Part-A General/Pedagogy + Part-B Arts/Science Content)', '2.5 Hours CBRT · -0.50 Negative Marking']
      ],
      relaxationTable: ODISHA_RELAXATION('18–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://osepa.odisha.gov.in', title: '🏫 OSEPA Junior Teacher Portal', desc: 'District-wise Merit & Counselling' }
      ])
    },
    'secondary-and-higher-secondary-teaching': {
      l2Code: '1.2.4',
      title: 'OAVS (Odisha Adarsha Vidyalaya) & SSB Odisha Higher Secondary PGT Recruitment',
      title_or: 'OAVS (ଓଡ଼ିଶା ଆଦର୍ଶ ବିଦ୍ୟାଳୟ) ଓ SSB +୨ PGT ଶିକ୍ଷକ ନିଯୁକ୍ତି',
      organisation: 'OAVS / State Selection Board (SSB), Higher Education Odisha',
      qualification: 'Master Degree (50%) / Graduation + B.Ed + OSSTET/CTET (OAVS) + Odia ME/HSC',
      age_limit: '21–38 yrs (Principal up to 50 yrs in OAVS) as on Jan 1',
      pay_level: 'ORSP 2017 Level-9 (TGT ₹35,400) · Level-10 (PGT ₹44,900) · Level-12 (Principal ₹56,100)',
      vacancies: '1,000+ OAVS PGT/TGT/Principal & 1,061+ SSB Non-Govt Aided PGT Posts',
      apply_url: 'https://oav.edu.in',
      summary: 'Covers Odisha Adarsha Vidyalaya Sangathan (314+ CBSE Model Schools across every Block of Odisha) and SSB Odisha Higher Secondary (+2) PGTs in Physics, Chemistry, Maths, Odia, English, Economics, and Commerce.',
      summary_or: 'ଓଡ଼ିଶାର ୩୧୪ଟି ବ୍ଲକ୍‌ରେ ଥିବା ଓଡ଼ିଶା ଆଦର୍ଶ ବିଦ୍ୟାଳୟ (OAVS) ଏବଂ SSB +୨ ଉଚ୍ଚ ମାଧ୍ୟମିକ ବିଦ୍ୟାଳୟ PGT/TGT/ଅଧ୍ୟକ୍ଷ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OAVS CBRT + Interview', '200 Marks CBRT (40 Language + 40 GK/Reasoning + 120 Subject/Pedagogy) + 40 Interview', '70% Written + 30% Interview Weightage'],
        ['SSB Odisha PGT Written', '150 Marks (100 Qs × 1.5 Marks, -0.50 Negative) + Career Weightage (50 Marks)', '2 Hours · 30+ Odisha Exam Centres']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://oav.edu.in', title: '🏫 OAVS Official Portal (oav.edu.in)', desc: 'Odisha Adarsha Vidyalaya Recruitment' },
        { href: 'https://ssbodisha.ac.in', title: '🎓 SSB Odisha Portal (ssbodisha.ac.in)', desc: '+2 PGT & Degree College Lecturer Notices' }
      ])
    },
    'lecturers-and-college-faculty': {
      l2Code: '1.2.4',
      title: 'SSB Odisha Degree College Lecturer & OPSC Assistant Professor (OES)',
      title_or: 'SSB ଓଡ଼ିଶା ଡିଗ୍ରୀ କଲେଜ ଅଧ୍ୟାପକ ଓ OPSC ଆସିଷ୍ଟାଣ୍ଟ ପ୍ରଫେସର',
      organisation: 'State Selection Board (SSB) / OPSC Higher Education Dept',
      qualification: "Master's Degree with ≥55% marks (50% SC/ST/SEBC/PwBD) + NET/Ph.D (for OPSC) + Odia",
      age_limit: '21–42 yrs (SSB Lecturer) / 21–45 yrs (OPSC Asst Prof)',
      pay_level: 'ORSP Level-10 (₹44,900 SSB) / UGC Academic Level-10 (₹57,700 – ₹1,82,400 OPSC)',
      vacancies: '786+ SSB Lecturers & 385+ OPSC OES Assistant Professors',
      apply_url: 'https://ssbodisha.ac.in',
      summary: 'Recruits Lecturers in Non-Government Aided Degree Colleges (via SSB Odisha) and Assistant Professors in Government Degree Colleges & State Universities (via OPSC) across Arts, Science, and Commerce streams.',
      summary_or: 'SSB ଓଡ଼ିଶା ମାଧ୍ୟମରେ ଅନୁଦାନପ୍ରାପ୍ତ ଡିଗ୍ରୀ କଲେଜ ଅଧ୍ୟାପକ ଏବଂ OPSC ମାଧ୍ୟମରେ ସରକାରୀ କଲେଜ ଆସିଷ୍ଟାଣ୍ଟ ପ୍ରଫେସର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['SSB Lecturer Written Exam', '150 Marks (100 Subject MCQs · -0.50 Negative Marking) · 2 Hours', 'PG Core Subject Syllabus'],
        ['Career Assessment & Viva-Voce', 'Career Weightage (25 Marks: Ph.D 25 / M.Phil+NET 10) + Viva-Voce (25 Marks)', 'Grand Total: 200 Marks']
      ],
      relaxationTable: ODISHA_RELAXATION('21–42 / 45 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://ssbodisha.ac.in', title: '🎓 SSB Odisha Lecturer Portal', desc: 'Advertisement, Answer Key & Viva Schedule' },
        { href: 'https://dhe.odisha.gov.in', title: '🏛️ Higher Education Dept Odisha', desc: 'College Cadre & University Rules' }
      ])
    },
    'b-ed-and-teacher-education-institutions': {
      l2Code: '1.2.4',
      title: 'TE&SCERT Teacher Educator, DIET Faculty & Govt B.Ed College Recruitment',
      title_or: 'TE&SCERT ଶିକ୍ଷକ ପ୍ରଶିକ୍ଷକ, DIET ଓ ସରକାରୀ B.Ed କଲେଜ ନିଯୁକ୍ତି',
      organisation: 'OPSC / Directorate of TE & SCERT, Odisha',
      qualification: 'Post-Graduate Degree (55%) + M.Ed (55%) + NET/Ph.D (where applicable) + Odia',
      age_limit: '21–38 / 42 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-10 (₹44,900) to Level-12 (₹56,100)',
      vacancies: 'DIET, CTE, IASE & SCERT Teacher Educator Posts',
      apply_url: 'https://scertodisha.nic.in',
      summary: 'Recruitment for Teacher Educators (TE), Senior Teacher Educators, and Assistant Professors in 30 District Institutes of Education & Training (DIET), CTEs, and Radhanath IASE Cuttack.',
      summary_or: 'ଓଡ଼ିଶାର ୩୦ଟି DIET, CTE ଏବଂ SCERT ରେ ଶିକ୍ଷକ ପ୍ରଶିକ୍ଷକ (Teacher Educator) ଓ ଆସିଷ୍ଟାଣ୍ଟ ପ୍ରଫେସର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / API Shortlist', 'Education Pedagogy, Research Methodology & School Subject (100–150 Marks)', 'M.Ed Standard'],
        ['Viva-Voce & Demo Class', 'Teaching Demonstration + Interview (OPSC / SCERT Board)', '30-District DIET Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 42 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://scertodisha.nic.in', title: '📚 TE & SCERT Odisha', desc: 'DIET & B.Ed Institution Notifications' }
      ])
    },
    'non-teaching-school-and-college-posts': {
      l2Code: '1.2.4',
      title: 'Non-Teaching School & College Posts (Laboratory Assistant, Librarian, Clerk, Peon)',
      title_or: 'ବିଦ୍ୟାଳୟ ଓ ମହାବିଦ୍ୟାଳୟ ଅଣ-ଶିକ୍ଷକ ପଦବୀ (ଲ୍ୟାବ୍ ଆସିଷ୍ଟାଣ୍ଟ, ଲାଇବ୍ରେରିଆନ୍, କ୍ଲର୍କ)',
      organisation: 'SSB Odisha / OAVS / State Universities / OSSC',
      qualification: '+2 / Graduation / B.Lib.I.Sc (Librarian) / B.Sc (Lab Asst) + Computer + Odia',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900) to Level-9 (₹35,400)',
      vacancies: 'Lab Assistant-cum-Storekeeper, PET, Librarian & Ministerial Posts',
      apply_url: 'https://ssbodisha.ac.in',
      summary: 'Covers SSB Lab Assistant-cum-Storekeeper, OAVS Computer Teacher / Librarian / Junior Clerk, and State University (Utkal, Ravenshaw, Berhampur, Sambalpur, Fakir Mohan) non-teaching recruitments.',
      summary_or: 'ସରକାରୀ ଓ ଅନୁଦାନପ୍ରାପ୍ତ କଲେଜ, OAVS ଏବଂ ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ଲ୍ୟାବ୍ ଆସିଷ୍ଟାଣ୍ଟ, ଲାଇବ୍ରେରିଆନ୍ ଏବଂ କ୍ଲର୍କ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (100–150 Marks)', 'General Awareness, Reasoning, English, Odia & Domain (Lab/Lib Science)', '-0.25 / -0.50 Negative Marking'],
        ['Computer Skill Test', 'Practical MS Office & Library/Lab Software', 'Qualifying Verification']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://ssbodisha.ac.in', title: '🎓 SSB Non-Teaching Portal', desc: 'Lab Assistant & College Staff Notices' }
      ])
    },
    'education-department-administrative-posts': {
      l2Code: '1.2.4',
      title: 'Odisha Education Service (OES) Administrative Posts — DEO, BEO, ADEO & Inspector',
      title_or: 'ଓଡ଼ିଶା ଶିକ୍ଷା ସେବା (OES) ପ୍ରଶାସନିକ ପଦବୀ — DEO, BEO, ADEO',
      organisation: 'OPSC / School & Mass Education Department, Odisha',
      qualification: "Bachelor's / Master's Degree + B.Ed + Teaching Experience (where required) + Odia",
      age_limit: '21–38 yrs (In-service teachers up to 45 yrs) as on Jan 1',
      pay_level: 'ORSP 2017 Level-10 (₹44,900 BEO) to Level-12/13 (₹56,100–₹67,700 DEO)',
      vacancies: 'Block Education Officer (BEO), District Education Officer (DEO) & OES Group-B',
      apply_url: 'https://sme.odisha.gov.in',
      summary: 'Odisha Education Service (School Branch) administrative cadre managing 314 Block Education Offices (BEO) and 30 District Education Offices (DEO) across Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ୩୧୪ଟି ବ୍ଲକ୍ (BEO) ଓ ୩୦ଟି ଜିଲ୍ଲା ଶିକ୍ଷା କାର୍ଯ୍ୟାଳୟ (DEO) ପାଇଁ ଓଡ଼ିଶା ଶିକ୍ଷା ସେବା (OES) ପ୍ରଶାସନିକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (OPSC OES)', 'Paper-I GS & Odia/English + Paper-II Education Administration & Pedagogy', 'Objective / Descriptive'],
        ['Viva-Voce (OPSC)', 'Personality & School Governance Assessment', 'Block & District Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 45 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://sme.odisha.gov.in', title: '🏛️ School & Mass Education Dept', desc: 'OES Cadre & BEO/DEO Orders' }
      ])
    },

    // ================= 1.2.5 POLICE & SECURITY =================
    'odisha-police': {
      l2Code: '1.2.5',
      title: 'Odisha Police Recruitment Board (OPRB) — SI, Sergeant, ASI & Ministerial Cadres',
      title_or: 'ଓଡ଼ିଶା ପୋଲିସ ନିଯୁକ୍ତି ବୋର୍ଡ (OPRB) — SI, ସର୍ଜେଣ୍ଟ, ASI',
      organisation: 'Odisha Police Recruitment Board (OPRB), Cuttack',
      qualification: "Bachelor's Degree in any discipline + Odia ME/HSC pass (B.Tech/M.Sc for Technical SI)",
      age_limit: '21–25 / 28 yrs as on Jan 1 (SEBC/SC/ST/Women +5 yrs)',
      pay_level: 'ORSP 2017 Level-9 (₹35,400 – ₹1,12,400) + Police Allowances',
      vacancies: '933+ CPSE Sub-Inspector, Station Officer (Fire) & Asst Jailor Posts',
      apply_url: 'https://odishapolice.gov.in',
      summary: 'Odisha Police Recruitment Board (OPRB) conducts Combined Police Service Examination (CPSE) for Sub-Inspector of Police, SI (Armed), Station Officer (Fire Service), and Assistant Jailor across Commissionerate Police (Bhubaneswar-Cuttack) and 34 Police Districts.',
      summary_or: 'OPRB କଟକ ଦ୍ୱାରା ପରିଚାଳିତ CPSE ପରୀକ୍ଷା ମାଧ୍ୟମରେ ଓଡ଼ିଶା ପୋଲିସ ସବ୍-ଇନ୍ସପେକ୍ଟର (SI), ଅଗ୍ନିଶମ ଷ୍ଟେସନ ଅଫିସର ଓ ସହକାରୀ ଜେଲର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Paper-I: General English & Odia', '100 Qs · 100 Marks · 1.5 Hours (OMR / CBRT)', '-0.25 Negative Marking'],
        ['Paper-II: General Studies', '100 Qs · 200 Marks · 3 Hours (GK, Reasoning, Maths, Computer)', '-0.50 Negative Marking · Total: 300 Marks'],
        ['PST & PET (Qualifying)', 'Height/Chest/Weight Measurement + 1.6 km Run + Long Jump + Cycling', 'Merit strictly on Paper I+II + NCC Bonus']
      ],
      relaxationTable: ODISHA_RELAXATION('21–25 / 28 Years'),
      physicalStandards: POLICE_SI_PST,
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://odishapolice.gov.in', title: '👮 Odisha Police Portal (odishapolice.gov.in)', desc: 'OPRB CPSE SI & Recruitment Notices' },
        { href: 'https://oprb.odisha.gov.in', title: '🛡️ OPRB Official Portal (oprb.odisha.gov.in)', desc: 'Apply Online, Admit Card & PST Schedule' }
      ])
    },
    'constable-and-sub-inspector-recruitment': {
      l2Code: '1.2.5',
      title: 'Odisha Police Sepoy / Constable (OSAP / IRB / District Police) & SI Recruitment',
      title_or: 'ଓଡ଼ିଶା ପୋଲିସ ସିପାହୀ / କନେଷ୍ଟବଳ (OSAP / IRB) ଓ SI ନିଯୁକ୍ତି',
      organisation: 'State Selection Board, Odisha Police (SSB Cuttack) / OPRB',
      qualification: '10th Pass (OSAP/IRB Sepoy) / +2 Pass (Civil Constable) / Degree (SI) + Odia',
      age_limit: '18–23 yrs (Sepoy/Constable; +5 yrs SC/ST/SEBC/Women; Home Guards up to 28)',
      pay_level: 'ORSP 2017 Level-5 (₹21,700 – Constable) · Level-9 (₹35,400 – SI)',
      vacancies: '2,030+ OSAP/IRB Sepoy & 4,790+ District Civil Constable Posts',
      apply_url: 'https://odishapolice.gov.in',
      summary: 'Direct recruitment for Sepoy / Constable in OSAP Battalions, India Reserve Battalions (IRB), Specialised IRB, and District Police Stations across Odisha.',
      summary_or: 'OSAP ବାଟାଲିଅନ୍, IRB ଏବଂ ଜିଲ୍ଲା ପୋଲିସରେ ସିପାହୀ / କନେଷ୍ଟବଳ (ଦଶମ/+୨ ପାସ୍) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written CBRT (100 Marks)', 'Odia, English, Arithmetic, GK, Situational Awareness & Reasoning', '2 Hours · -0.25 Negative Marking'],
        ['PST & PET (Qualifying)', '1.6 km Run (7 min M / 9 min F), High Jump, Broad Jump', 'Driving Licence (+5) & NCC (+5) Bonus Marks']
      ],
      relaxationTable: ODISHA_RELAXATION('18–23 Years'),
      physicalStandards: CONSTABLE_PST,
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://odishapolice.gov.in', title: '👮 Odisha Police Constable Portal', desc: 'OSAP / IRB & District Constable Notifications' }
      ])
    },
    'fire-services': {
      l2Code: '1.2.5',
      title: 'Odisha Fire & Emergency Services — Fireman, Fireman Driver & Station Officer',
      title_or: 'ଓଡ଼ିଶା ଅଗ୍ନିଶମ ଓ ଜରୁରୀକାଳୀନ ସେବା — ଫାୟାରମ୍ୟାନ୍ ଓ ଷ୍ଟେସନ ଅଫିସର',
      organisation: 'Directorate of Fire & Emergency Services, Odisha (Cuttack)',
      qualification: '+2 Pass (Fireman) / +2 + Heavy Driving Licence (Driver) / Science Degree (Station Officer)',
      age_limit: '18–25 yrs (Fireman) / 21–25 yrs (Station Officer) (+5 SC/ST/SEBC/Home Guard)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900 Fireman) · Level-9 (₹35,400 Station Officer)',
      vacancies: '941+ Fireman & Fireman Driver Posts across 340+ Odisha Fire Stations',
      apply_url: 'https://odishafireservice.gov.in',
      summary: 'Odisha Fire & Emergency Services recruits Firemen, Fireman Drivers, Leading Firemen, and Station Officers for 340+ Fire Stations and OFDRA (Bhubaneswar) Disaster Response teams.',
      summary_or: 'ଓଡ଼ିଶାର ୩୪୦+ ଅଗ୍ନିଶମ କେନ୍ଦ୍ରରେ ଫାୟାରମ୍ୟାନ୍, ଡ୍ରାଇଭର ଓ ଷ୍ଟେସନ ଅଫିସର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written OMR (100 Marks)', 'Odia (25), English (25), GK & General Science (25), Arithmetic/Computer (25)', '2 Hours · -0.25 Negative Marking'],
        ['PST & PET + Swimming', '1.6 km Run (7 min), Rope Climbing, Cross-Country 5 km, Swimming 50 m', 'Heavy Vehicle Driving Test (for Driver)']
      ],
      relaxationTable: ODISHA_RELAXATION('18–25 Years'),
      physicalStandards: CONSTABLE_PST,
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://odishafireservice.gov.in', title: '🚒 Odisha Fire Service Portal', desc: 'Fireman & Station Officer Recruitment' }
      ])
    },
    'jail-and-correctional-services': {
      l2Code: '1.2.5',
      title: 'Odisha Prisons & Correctional Services — Jail Warder & Assistant Jailor',
      title_or: 'ଓଡ଼ିଶା କାରାଗାର ଓ ସଂସ୍କାର ସେବା — ଜେଲ୍ ୱାର୍ଡର ଓ ସହକାରୀ ଜେଲର',
      organisation: 'Directorate of Prisons & Correctional Services, Odisha / OPRB',
      qualification: '+2 Pass (Jail Warder) / Bachelor Degree (Assistant Jailor) + Odia ME/HSC',
      age_limit: '18–25 yrs (Warder) / 21–25 yrs (Asst Jailor) (+5 SC/ST/SEBC/Women)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900 Warder) · Level-9 (₹35,400 Assistant Jailor)',
      vacancies: '403+ Jail Warder & Assistant Jailor Posts across Circle/District Jails',
      apply_url: 'https://prisons.odisha.gov.in',
      summary: 'Recruits Jail Warders (Head Warders) and Assistant Jailors for Circle Jails (Choudwar, Berhampur, Sambalpur, Baripada, Koraput) and 87+ Sub/District Jails across Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ଚୌଦ୍ୱାର, ବ୍ରହ୍ମପୁର, ସମ୍ବଲପୁର ସମେତ ସମସ୍ତ ଜିଲ୍ଲା ଓ ସବ୍-ଜେଲରେ ଜେଲ୍ ୱାର୍ଡର ଏବଂ ସହକାରୀ ଜେଲର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written CBRT (100 Marks)', 'Odia, English, Arithmetic, GK & Reasoning', '2 Hours · -0.25 Negative Marking'],
        ['PST & PET', 'Height 168 cm (M) / 155 cm (F) + 1.6 km Run + High/Broad Jump', 'Prisons Medical Fitness']
      ],
      relaxationTable: ODISHA_RELAXATION('18–25 Years'),
      physicalStandards: CONSTABLE_PST,
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://prisons.odisha.gov.in', title: '🏛️ Odisha Prisons Directorate', desc: 'Warder & Assistant Jailor Notices' }
      ])
    },
    'state-intelligence-and-other-notified-posts': {
      l2Code: '1.2.5',
      title: 'Odisha Special Branch / State Intelligence, Excise Constable & Signal Cadre',
      title_or: 'ଓଡ଼ିଶା ଗୁଇନ୍ଦା ବିଭାଗ (Special Branch), ଅବକାରୀ କନେଷ୍ଟବଳ ଓ ସିଗନାଲ କ୍ୟାଡର',
      organisation: 'Odisha Police / State Excise Dept / OSSSC',
      qualification: '10th/+2 (Excise Constable) / B.Sc Physics-CS or B.Tech ECE (SI Signals)',
      age_limit: '18–25 / 21–32 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900) to Level-9 (₹35,400)',
      vacancies: 'Excise Constable, SI Signals, Fingerprint Bureau & STF Posts',
      apply_url: 'https://odishapolice.gov.in',
      summary: 'Covers Odisha Police Technical Wing (SI Signals/Communication), Special Intelligence Wing (SIW), State Forensic Science Laboratory (SFSL), and Odisha Excise Constable posts.',
      summary_or: 'ଓଡ଼ିଶା ପୋଲିସ ସିଗନାଲ (Communication), ଗୁଇନ୍ଦା ବିଭାଗ, ଫରେନସିକ୍ ଲ୍ୟାବ୍ ଓ ଅବକାରୀ କନେଷ୍ଟବଳ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written CBRT', 'General Paper (100 Marks) + Technical Electronics/CS or Excise Paper', '-0.25 Negative Marking'],
        ['PST / PET & Antecedent Verification', 'Police Physical Standards + Special Branch Vetting', 'State-wide Intelligence/Excise Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–25/32 Years'),
      physicalStandards: CONSTABLE_PST,
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://odishapolice.gov.in', title: '👮 Odisha Police Technical & Signal', desc: 'SI Signals & Specialised Cadres' }
      ])
    },

    // ================= 1.2.6 HEALTH & MEDICAL =================
    'doctors-and-specialists': {
      l2Code: '1.2.6',
      title: 'Odisha Doctors & Specialists — OMHS Medical Officer, Specialists & Dental Surgeons',
      title_or: 'ଓଡ଼ିଶା ଡାକ୍ତର ଓ ବିଶେଷଜ୍ଞ — OMHS ମେଡିକାଲ ଅଫିସର ଓ ସ୍ପେଶାଲିଷ୍ଟ',
      organisation: 'OPSC / Health & Family Welfare Department, Odisha',
      qualification: 'MBBS / MD / MS / MDS / DNB with Valid OCMR / Odisha Dental Council Registration',
      age_limit: '21–38 yrs (Specialists up to 45 yrs; +5 SC/ST/SEBC/Women)',
      pay_level: 'ORSP Level-12 (₹56,100) to Level-14 (₹78,800) + KBK/Rural Incentive',
      vacancies: '1,300+ OMHS Medical Officer & Specialist Posts across 30 Districts',
      apply_url: 'https://health.odisha.gov.in',
      summary: 'Recruits Allopathic Medical Officers (OMHS), Specialists (Medicine, Surgery, O&G, Paediatrics, Anaesthesia), Dental Surgeons, and AYUSH Doctors for District Hospitals, CHCs, and PHCs across Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ଜିଲ୍ଲା ଚିକିତ୍ସାଳୟ, CHC ଓ PHC ପାଇଁ MBBS ମେଡିକାଲ ଅଫିସର, MD/MS ବିଶେଷଜ୍ଞ ଓ ଦନ୍ତ ଚିକିତ୍ସକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OPSC Written Exam', '200 MCQs · 200 Marks · 3 Hours (Pre-Clinical, Para-Clinical & Clinical)', 'No Negative Marking'],
        ['NHM / DHS Walk-in (Contractual)', 'MBBS Marks + PG Bonus + Rural Service Incentive', 'Extra ₹20k–₹40k/mo KBK/Tribal Allowance']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 45 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://health.odisha.gov.in', title: '🏥 Health & Family Welfare Odisha', desc: 'OMHS & Specialist Notifications' },
        { href: 'https://www.opsc.gov.in', title: '🏛️ OPSC Medical Officer Portal', desc: 'Apply Online for OMHS Group-A' }
      ])
    },
    'staff-nurses': {
      l2Code: '1.2.6',
      title: 'Odisha Staff Nurse & Nursing Officer (OSSSC Regular & NHM Odisha)',
      title_or: 'ଓଡ଼ିଶା ଷ୍ଟାଫ୍ ନର୍ସ ଓ ନର୍ସିଂ ଅଫିସର (OSSSC / NHM)',
      organisation: 'OSSSC / National Health Mission (NHM) Odisha',
      qualification: 'GNM Diploma / B.Sc Nursing + Valid Odisha Nurses & Midwives Council (ONMRC) Regn',
      age_limit: '21–38 yrs as on Jan 1 (+5 SC/ST/SEBC/Women + Contractual Weightage)',
      pay_level: 'ORSP 2017 Level-7 (₹25,500) / Level-8 (₹29,200 – ₹92,300)',
      vacancies: '7,483+ OSSSC Nursing Officer & NHM Staff Nurse Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'Permanent Nursing Officer (via OSSSC) and contractual Staff Nurse / CHO (via NHM Odisha) positions across SCB Cuttack, MKCG Berhampur, VIMSAR Burla, and all 30 District Headquarter Hospitals.',
      summary_or: 'SCB କଟକ, MKCG ବ୍ରହ୍ମପୁର, VIMSAR ବୁର୍ଲା ଓ ୩୦ଟି ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟରେ ସ୍ଥାୟୀ ନର୍ସିଂ ଅଫିସର (OSSSC) ଓ NHM ଷ୍ଟାଫ୍ ନର୍ସ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OSSSC Written Exam (100 Marks)', 'Nursing Syllabus (60) + Practical Skills (25) + Arithmetic (10) + English (5)', '2 Hours · -0.25 Negative Marking'],
        ['ONMRC Verification', 'Live Odisha Nursing Council Registration + Odia Pass', 'Contractual COVID/NHM Bonus Marks']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC Nursing Officer Portal', desc: 'Regular Nursing Officer Recruitment' },
        { href: 'https://nhmodisha.gov.in', title: '🏥 NHM Odisha Portal', desc: 'Staff Nurse & CHO Walk-in Notices' }
      ])
    },
    'pharmacists': {
      l2Code: '1.2.6',
      title: 'Odisha Government Pharmacist & Drug Inspector (OSSSC & OPSC)',
      title_or: 'ଓଡ଼ିଶା ସରକାରୀ ଫାର୍ମାସିଷ୍ଟ ଓ ଡ୍ରଗ୍ ଇନ୍ସପେକ୍ଟର (OSSSC / OPSC)',
      organisation: 'OSSSC (Pharmacist) / OPSC (Drug Inspector)',
      qualification: 'D.Pharm / B.Pharm + Odisha State Pharmacy Council Registration + Odia ME/HSC',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-7 (₹25,500 Pharmacist) · Level-10 (₹44,900 Drug Inspector)',
      vacancies: '1,002+ Pharmacist & State Drug Inspector Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'OSSSC recruits Pharmacists for Niramaya Free Medicine Centres across Odisha PHCs/CHCs/DHHs, while OPSC recruits B.Pharm Drug Inspectors under the State Drugs Controller.',
      summary_or: 'ନିରାମୟ କେନ୍ଦ୍ର, PHC ଓ CHC ରେ ଫାର୍ମାସିଷ୍ଟ (OSSSC) ଏବଂ OPSC ମାଧ୍ୟମରେ ଡ୍ରଗ୍ ଇନ୍ସପେକ୍ଟର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Pharmacist Written (100 Marks)', 'D.Pharm Core (60) + Practical Dispensing (25) + Arithmetic/English (15)', '-0.25 Negative Marking'],
        ['Drug Inspector (OPSC)', 'B.Pharm Technical Paper (200 Marks) + Viva-Voce', 'Drugs & Cosmetics Act & Pharmacology']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC Pharmacist Portal', desc: 'OSSSC Pharmacist CRE Notices' }
      ])
    },
    'laboratory-technicians': {
      l2Code: '1.2.6',
      title: 'Odisha Laboratory Technician (LT), Radiographer & OT Technician',
      title_or: 'ଓଡ଼ିଶା ଲାବୋରେଟୋରୀ ଟେକ୍ନିସିଆନ୍ (LT) ଓ ରେଡିଓଗ୍ରାଫର',
      organisation: 'OSSSC / Directorate of Health Services, Odisha',
      qualification: '+2 Science + DMLT / DMRT from Govt Medical Colleges or AICTE/Odisha Paramedical Board',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-7 (₹25,500 – ₹81,100)',
      vacancies: '921+ Laboratory Technician & 378+ Radiographer Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'Recruits Medical Laboratory Technicians (DMLT) and Radiographers (DMRT) for Nidan Free Diagnostic Centres in all 30 Odisha District Hospitals and Medical Colleges.',
      summary_or: 'ନିଦାନ ଡାଇଗ୍ନୋଷ୍ଟିକ୍ କେନ୍ଦ୍ର ଓ ଜିଲ୍ଲା ଚିକିତ୍ସାଳୟ ପାଇଁ DMLT ଲାବୋରେଟୋରୀ ଟେକ୍ନିସିଆନ୍ ଓ DMRT ରେଡିଓଗ୍ରାଫର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (100 Marks)', 'DMLT/DMRT Core (60) + Practical Clinical Qs (25) + Arithmetic/English (15)', '2 Hours · -0.25 Negative Marking'],
        ['Council Registration', 'Odisha Allied Medical Council / Paramedical Board Regn', 'Contractual Experience Weightage']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC LT & Radiographer', desc: 'Paramedical District Cadre Portal' }
      ])
    },
    'community-health-and-public-health-positions': {
      l2Code: '1.2.6',
      title: 'NHM Odisha Community Health Officer (CHO), MPHW, BPM & ASHA Supervisors',
      title_or: 'NHM ଓଡ଼ିଶା କମ୍ୟୁନିଟି ହେଲଥ୍ ଅଫିସର (CHO), MPHW ଓ ଜନସ୍ୱାସ୍ଥ୍ୟ ପଦବୀ',
      organisation: 'National Health Mission (NHM), Odisha / OSSSC',
      qualification: 'B.Sc Nursing / GNM + CCH (CHO) / ANM (MPHW-F) / MBA-MPH (BPM/DPM)',
      age_limit: '21–38 / 40 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'CHO ₹25,000 + ₹15,000 PBI · OSSSC MPHW ORSP Level-5 (₹21,700)',
      vacancies: '2,753+ MPHW(F) & 1,500+ Ayushman Arogya Mandir CHO Posts',
      apply_url: 'https://nhmodisha.gov.in',
      summary: 'Recruits Community Health Officers (CHO) for Ayushman Arogya Mandirs (HWC), Multipurpose Health Workers (MPHW Male/Female), Block Programme Managers (BPM), and Epidemiologists across Odisha.',
      summary_or: 'ଆୟୁଷ୍ମାନ ଆରୋଗ୍ୟ ମନ୍ଦିରରେ CHO, NHM ରେ BPM/DPM ଏବଂ OSSSC ମାଧ୍ୟମରେ MPHW (ମହିଳା/ପୁରୁଷ) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['MPHW (OSSSC Written)', '100 Marks (ANM/Health Worker Syllabus + Practical + Maths/English)', '-0.25 Negative Marking'],
        ['NHM CHO / BPM Selection', 'B.Sc/GNM Academic Merit or CBRT + Viva-Voce', '314 Block HWC Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 40 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://nhmodisha.gov.in', title: '🏥 NHM Odisha Portal (nhmodisha.gov.in)', desc: 'CHO, BPM & District Health Walk-ins' }
      ])
    },
    'medical-college-and-hospital-recruitment': {
      l2Code: '1.2.6',
      title: 'Odisha Govt Medical Colleges (SCB, MKCG, VIMSAR, PRM, SLN, FM, BB) & AIIMS/AHPGIC',
      title_or: 'ଓଡ଼ିଶା ସରକାରୀ ମେଡିକାଲ କଲେଜ (SCB, MKCG, VIMSAR) ଓ AHPGIC ନିଯୁକ୍ତି',
      organisation: 'DMET Odisha / OPSC / Medical College Deans',
      qualification: 'MD/MS/DM/M.Ch (Faculty/SR) · B.Sc Nursing/DMLT/10+2 (Paramedical/Ministerial)',
      age_limit: '21–45 yrs (Faculty/SR) / 21–38 yrs (Staff)',
      pay_level: 'ORSP Level-12/13 (SR/Asst Prof ₹56,100–₹78,800) · Level-7 (Paramedical)',
      vacancies: 'Senior Resident, Tutor, Assistant Professor & Hospital Staff Posts',
      apply_url: 'https://dmetodisha.gov.in',
      summary: 'Covers Senior Residents, Tutors, Assistant Professors, and Paramedical/Hospital Staff across SCB Cuttack, MKCG Berhampur, VIMSAR Burla, PRM Baripada, SLN Koraput, FM Balasore, BB Bolangir, SJMC Puri, and AHPGIC Cuttack.',
      summary_or: 'SCB କଟକ, MKCG ବ୍ରହ୍ମପୁର, VIMSAR ବୁର୍ଲା, PRM ବାରିପଦା, SLN କୋରାପୁଟ, FM ବାଲେଶ୍ୱର, BB ବଲାଙ୍ଗିର ଓ AHPGIC କଟକରେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Faculty / SR / Tutor', 'MBBS/MD/MS Academic Merit + NMC Teaching Experience + Walk-in Interview', 'DMET / OPSC Counselling'],
        ['Hospital Technical / Nursing', 'OSSSC / Medical College Written + Skill Test', 'Tertiary Care Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 45 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://dmetodisha.gov.in', title: '🏥 DMET Odisha Portal', desc: 'Medical College SR, Tutor & Faculty Notices' }
      ])
    },

    // ================= 1.2.7 REVENUE & DISTRICT =================
    'district-level-recruitment': {
      l2Code: '1.2.7',
      title: '30-District Collectorate & Zilla Parishad Recruitment (Khordha, Cuttack, Ganjam, Sambalpur...)',
      title_or: 'ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ ଓ ଜିଲ୍ଲା ପରିଷଦ ନିଯୁକ୍ତି',
      organisation: '30 District Collectors & District Magistrates, Odisha',
      qualification: '10th / +2 / Bachelor Degree + Odia ME/HSC + Local District Residence (where notified)',
      age_limit: '18/21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-1 to Level-7 (Regular) / Consolidated District Project Pay',
      vacancies: 'District-wise Collectorate, Social Welfare, Mission Shakti & e-Governance Posts',
      apply_url: 'https://odisha.gov.in',
      summary: 'Direct notifications published on all 30 Odisha District NIC portals (`khordha.odisha.gov.in`, `cuttack.odisha.gov.in`, `ganjam.odisha.gov.in`, `sambalpur.odisha.gov.in`, `sundargarh.odisha.gov.in`, etc.) for Collectorate, DCPU, DEOC, and Mission Shakti posts.',
      summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାର ସରକାରୀ NIC ପୋର୍ଟାଲରେ ପ୍ରକାଶିତ ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ, DEOC, DCPU ଓ ମିଶନ ଶକ୍ତି ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Academic / Written Screening', '10th/12th/Degree Marks OR District CBRT/OMR Test', 'District Selection Committee'],
        ['Computer Test & Viva-Voce', 'Practical Computer Test + Document Verification', 'District HQ / Block Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://odisha.gov.in', title: '🌐 Odisha State & 30-District Portal', desc: 'Official District Collectorate Links' }
      ])
    },
    'collectorate-and-revenue-offices': {
      l2Code: '1.2.7',
      title: 'Collectorate, Sub-Collectorate & Revenue Board Offices (Cuttack)',
      title_or: 'ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ, ଉପ-ଜିଲ୍ଲାପାଳ ଓ ରାଜସ୍ୱ ପର୍ଷଦ (କଟକ)',
      organisation: 'Board of Revenue, Odisha (Cuttack) & District Collectorates',
      qualification: "Bachelor's Degree / +2 + Computer Proficiency + Odia ME/HSC pass",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900) to Level-9 (₹35,400)',
      vacancies: 'Senior/Junior Revenue Assistant, Section Officer & DEO Posts',
      apply_url: 'https://revenue.odisha.gov.in',
      summary: 'Covers Revenue Ministerial Cadre (Junior Revenue Assistant, Senior Revenue Assistant, Head Clerk) across Board of Revenue Cuttack, 3 RDC Offices (Central, Northern, Southern), and 30 District Collectorates.',
      summary_or: 'ରାଜସ୍ୱ ପର୍ଷଦ କଟକ, ୩ଟି RDC କାର୍ଯ୍ୟାଳୟ ଏବଂ ୩୦ଟି ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟରେ ରାଜସ୍ୱ ସହାୟକ ଓ ମିନିଷ୍ଟେରିଆଲ ପଦବୀ।',
      examPatternTable: [
        ['OSSSC / District Written Exam', 'Odia, English, Maths, GK & Computer (180 Marks)', '-0.33 / -0.50 Negative Marking'],
        ['Computer Skill & Typing', 'Practical MS Office & Revenue Portal (Bhulekh/LRMS)', 'Qualifying Verification']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://revenue.odisha.gov.in', title: '📜 Revenue & DM Dept, Odisha', desc: 'Board of Revenue & Collectorate Rules' }
      ])
    },
    'tahasil-and-field-offices': {
      l2Code: '1.2.7',
      title: '317 Tahasil Offices & RI Circles — Field & Land Record Positions',
      title_or: '୩୧୭ ତହସିଲ ଓ ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI) ସର୍କଲ କ୍ଷେତ୍ରସ୍ତରୀୟ ପଦବୀ',
      organisation: 'Revenue & Disaster Management Department, Odisha',
      qualification: '+2 / 10th + Survey/Amin Training or Computer Skill + Odia ME/HSC',
      age_limit: '20–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900 – ₹63,200)',
      vacancies: '317 Tahasil Amin, ARI, Process Server & Land Record Assistant Posts',
      apply_url: 'https://revenue.odisha.gov.in',
      summary: 'Field-level land demarcation, Bhulekh RoR mutation support, and disaster relief positions across Odisha’s 317 Tahasil Offices and 1,900+ Revenue Inspector (RI) Circles.',
      summary_or: 'ଓଡ଼ିଶାର ୩୧୭ଟି ତହସିଲ ଓ RI ସର୍କଲରେ ଜମି ମାପ, ଭୂଲେଖ ଏବଂ ବିପର୍ଯ୍ୟୟ ପରିଚାଳନା କ୍ଷେତ୍ରସ୍ତରୀୟ ପଦବୀ।',
      examPatternTable: [
        ['OSSSC / Collectorate Exam', 'Arithmetic, Odia, English, GK & Computer (180 Marks)', 'OMR / CBRT'],
        ['Field / Practical Verification', 'Survey / Map Reading & Computer Entry', 'Tahasil HQ Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('20–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://bhulekh.ori.nic.in', title: '🗺️ Bhulekh Odisha Land Records', desc: '317 Tahasil & RI Circle Portal' }
      ])
    },
    'revenue-inspectors-and-related-posts': {
      l2Code: '1.2.7',
      title: 'Revenue Inspector (RI), Assistant Revenue Inspector (ARI) & Consolidation Amin',
      title_or: 'ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI), ARI ଓ ଚକବନ୍ଦୀ ଅମିନ',
      organisation: 'OSSSC / Revenue & Disaster Management Dept',
      qualification: "Bachelor's Degree (RI) / +2 (ARI & Amin) + Computer Knowledge + Odia ME/HSC",
      age_limit: '20/21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-4 (ARI/Amin ₹19,900) · Level-9 (RI ₹35,400)',
      vacancies: 'RI, ARI & Amin Regular District Cadre Posts',
      apply_url: 'https://www.osssc.gov.in',
      summary: 'Direct Revenue Inspector (RI), ARI, and Amin cadre posts responsible for land revenue collection, caste/resident/income certificate field enquiry, and natural calamity assessment.',
      summary_or: 'ଜମି ରାଜସ୍ୱ ଆଦାୟ, ଜାତି/ବାସିନ୍ଦା/ଆୟ ପ୍ରମାଣପତ୍ର ତଦନ୍ତ ଓ ପ୍ରାକୃତିକ ବିପର୍ଯ୍ୟୟ ଆକଳନ ପାଇଁ RI, ARI ଓ ଅମିନ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CRE Prelims & Mains', 'Prelims 100 Marks + Mains 180 Marks (Maths, GS, Eng, Odia, Comp)', '-0.33 Negative Marking'],
        ['Computer Skill Test', '50 Marks Practical MS Office & Internet', 'District Revenue Cadre']
      ],
      relaxationTable: ODISHA_RELAXATION('20/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osssc.gov.in', title: '📋 OSSSC RI / ARI / Amin Portal', desc: 'CRE Syllabus & District Vacancy' }
      ])
    },
    'local-administrative-and-support-positions': {
      l2Code: '1.2.7',
      title: 'District Emergency Operation Centre (DEOC), Election & e-Governance Support Posts',
      title_or: 'ଜିଲ୍ଲା ଜରୁରୀକାଳୀନ କେନ୍ଦ୍ର (DEOC), ନିର୍ବାଚନ ଓ ଇ-ଗଭର୍ଣ୍ଣାନ୍ସ ସହାୟକ ପଦବୀ',
      organisation: 'OSDMA / CEO Odisha / OCAC / District Collectorates',
      qualification: '+2 / Graduation + PGDCA / BCA / B.Tech (for District Informatics/GIS)',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-4/5 or ₹18,000–₹45,000 District Project Pay',
      vacancies: 'DEOC Data Entry Operator, District Project Officer (OSDMA) & BLO/Election Staff',
      apply_url: 'https://www.osdma.org',
      summary: 'Includes District Emergency Operation Centre (OSDMA DEOC) operators, District e-Governance Managers (DeGS), and District Election Cell support staff across all 30 Odisha Collectorates.',
      summary_or: 'OSDMA ଜିଲ୍ଲା ଜରୁରୀକାଳୀନ କେନ୍ଦ୍ର (DEOC), ଇ-ଗଭର୍ଣ୍ଣାନ୍ସ (DeGS) ଏବଂ ନିର୍ବାଚନ ସେଲ୍ ସହାୟକ ପଦବୀ।',
      examPatternTable: [
        ['Shortlisting & Written/Computer', 'Computer Typing (35 wpm), Excel/GIS & Disaster Mgmt', 'District Collectorate Panel'],
        ['Interview & Document Check', 'Collectorate Selection Committee', '30-District Emergency / Election Cell']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.osdma.org', title: '🌪️ OSDMA Odisha Portal', desc: 'Disaster Management & DEOC Notices' }
      ])
    },

    // ================= 1.2.8 JUDICIARY & LEGAL =================
    'odisha-judicial-service': {
      l2Code: '1.2.8',
      title: 'Odisha Judicial Service (OJS) — Civil Judge (Junior Division) via OPSC',
      title_or: 'ଓଡ଼ିଶା ନ୍ୟାୟିକ ସେବା (OJS) — ସିଭିଲ୍ ଜଜ୍ (OPSC)',
      organisation: 'Odisha Public Service Commission (OPSC) & High Court of Orissa',
      qualification: 'LL.B Degree from a recognized University + Enrolled Advocate / Fresh Law Grad + Odia',
      age_limit: '23–35 yrs as on Aug 1 (SC/ST/SEBC/Women +5 yrs; PwBD +10 yrs)',
      pay_level: '2nd National Judicial Pay Commission: ₹77,840 – ₹1,36,520 (Entry Civil Judge)',
      vacancies: '40–60+ Annual Civil Judge (Junior Division) Cadre Posts',
      apply_url: 'https://www.opsc.gov.in',
      summary: 'OPSC conducts the 3-stage Odisha Judicial Service (OJS) Examination to appoint Civil Judges (Junior Division) across Odisha District & Sub-Divisional Courts under the High Court of Orissa, Cuttack.',
      summary_or: 'OPSC ଓ ଓଡ଼ିଶା ହାଇକୋର୍ଟଙ୍କ ଦ୍ୱାରା ପରିଚାଳିତ ଓଡ଼ିଶା ନ୍ୟାୟିକ ସେବା (OJS) ପରୀକ୍ଷା ମାଧ୍ୟମରେ ସିଭିଲ୍ ଜଜ୍ (ଜୁନିଅର ଡିଭିଜନ) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Stage-I: Preliminary Exam', '100 Objective Qs · 100 Marks · 1.5 Hours (Constitutional, BNS/BNSS/BSA, CPC, Contract)', '-0.25 Negative Marking · 10x Shortlist'],
        ['Stage-II: Main Written Exam', '2 Compulsory (GS Eng 150 + Procedural Law 150) + 3 Optional Law Papers (3×150)', 'Total Mains: 750 Marks (Descriptive)'],
        ['Stage-III: Interview (Cuttack)', '100 Marks before High Court Judge & OPSC Board', 'Grand Total: 850 Marks']
      ],
      relaxationTable: ODISHA_RELAXATION('23–35 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.opsc.gov.in', title: '⚖️ OPSC OJS Portal', desc: 'OJS Syllabus, PYQs & Notifications' },
        { href: 'https://www.orissahighcourt.nic.in', title: '🏛️ High Court of Orissa, Cuttack', desc: 'Judicial Service Rules & Postings' }
      ])
    },
    'high-court-recruitment': {
      l2Code: '1.2.8',
      title: 'High Court of Orissa Recruitment — ASO, Translator, Stenographer & District Judge',
      title_or: 'ଓଡ଼ିଶା ହାଇକୋର୍ଟ ନିଯୁକ୍ତି (ASO, ଅନୁବାଦକ, ଷ୍ଟେନୋଗ୍ରାଫର ଓ ଜିଲ୍ଲା ଜଜ୍)',
      organisation: 'High Court of Orissa, Cuttack',
      qualification: "Bachelor's Degree + Diploma in Computer Application (for ASO) / LL.B (Law Clerk/DJ)",
      age_limit: '21–32 / 35 yrs (SEBC/SC/ST/Women +5 yrs)',
      pay_level: 'ORSP 2017 Level-9 (₹35,400 ASO) to Level-12+ (Court Master / DJ)',
      vacancies: '147+ High Court ASO, Junior Stenographer & Translator Posts',
      apply_url: 'https://www.orissahighcourt.nic.in',
      summary: 'Direct recruitment by the High Court of Orissa, Cuttack for Assistant Section Officer (ASO), Junior Stenographer, Translator, System Officer, and Direct District Judge (ODJS) cadre posts.',
      summary_or: 'କଟକସ୍ଥିତ ଓଡ଼ିଶା ହାଇକୋର୍ଟରେ ASO, ଜୁନିଅର ଷ୍ଟେନୋଗ୍ରାଫର, ଅନୁବାଦକ ଏବଂ ସିଷ୍ଟମ ଅଫିସର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Prelims (OMR / CBRT)', '150 Marks (English, GK, Logical Reasoning, Quantitative Aptitude)', '-0.50 Negative Marking'],
        ['Main Written (Descriptive)', '300 Marks (English 100, Mathematics 100, GK & Reasoning 100)', '2 Hours each Paper'],
        ['Computer Test & Viva-Voce', 'Computer Application (100 Marks Qualifying) + Viva-Voce (40 Marks)', 'Final Merit: Mains + Viva']
      ],
      relaxationTable: ODISHA_RELAXATION('21–32 / 35 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://www.orissahighcourt.nic.in', title: '🏛️ High Court of Orissa Recruitment', desc: 'ASO, Steno & Translator Portal' }
      ])
    },
    'district-court-recruitment': {
      l2Code: '1.2.8',
      title: '30-District Judgeship Courts — Junior Clerk, Junior Typist & Stenographer Grade-III',
      title_or: '୩୦ଟି ଜିଲ୍ଲା ଅଦାଲତ ନିଯୁକ୍ତି (ଜୁନିଅର କ୍ଲର୍କ, ଟାଇପିଷ୍ଟ ଓ ଷ୍ଟେନୋଗ୍ରାଫର)',
      organisation: 'Office of the District & Sessions Judge (All 30 Judgeships, Odisha)',
      qualification: '+2 Pass + Diploma in Computer Application + Odia Typewriting/Shorthand',
      age_limit: '18–32 / 38 yrs as on cutoff date (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-4 (₹19,900 Junior Clerk/Typist) · Level-7 (₹25,500 Steno)',
      vacancies: 'District-wise Judgeship Clerical, Typist, Salaried Amin & Steno Posts',
      apply_url: 'https://districts.ecourts.gov.in/odisha',
      summary: 'Every District & Sessions Judge Court in Odisha (Khordha, Cuttack, Puri, Ganjam, Sambalpur, Balasore, Mayurbhanj, etc.) conducts recruitment for Junior Clerk-cum-Copyist, Junior Typist, and Stenographer Grade-III.',
      summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲା ଦୌରା ଜଜ୍ ଅଦାଲତରେ ଜୁନିଅର କ୍ଲର୍କ, ଟାଇପିଷ୍ଟ, ଷ୍ଟେନୋଗ୍ରାଫର ଓ ଅମିନ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Exam (200–300 Marks)', 'English (100), Arithmetic (100), General Knowledge (100)', 'Descriptive / Objective at District HQ'],
        ['Typewriting & Computer Test', 'English Typing 40 wpm / Shorthand 80 wpm + Computer Practical (100 Marks)', 'Viva-Voce (45 Marks)']
      ],
      relaxationTable: ODISHA_RELAXATION('18–32 / 38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://districts.ecourts.gov.in/odisha', title: '⚖️ eCourts Odisha 30 Judgeships', desc: 'District Court Recruitment Notices' }
      ])
    },
    'legal-assistants-and-research-positions': {
      l2Code: '1.2.8',
      title: 'Assistant Public Prosecutor (APP), Law Officer, Law Clerk & OSLSA Legal Posts',
      title_or: 'ସହକାରୀ ସରକାରୀ ଓକିଲ (APP), ଲ ଅଫିସର ଓ OSLSA ପଦବୀ',
      organisation: 'OPSC / Law Department / OSLSA Cuttack',
      qualification: 'LL.B Degree + Bar Council of Odisha Enrolment + 2–5 yrs Practice (for APP/Law Officer)',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP 2017 Level-10 (₹44,900) to Level-12 (₹56,100)',
      vacancies: 'APP (OPSC), Govt Law Officer, High Court Law Clerk & DLSA Panel',
      apply_url: 'https://law.odisha.gov.in',
      summary: 'Covers OPSC Assistant Public Prosecutor (APP), Departmental Law Officers, High Court Research & Law Clerks (₹25,000–₹35,000), and Odisha State Legal Services Authority (OSLSA/DLSA) Legal Aid Defense Counsel.',
      summary_or: 'OPSC APP (ସରକାରୀ ଓକିଲ), ବିଭାଗୀୟ ଲ ଅଫିସର, ହାଇକୋର୍ଟ ଲ କ୍ଲର୍କ ଓ OSLSA ଆଇନ ସେବା ପଦବୀ।',
      examPatternTable: [
        ['APP Written Exam (OPSC)', 'Paper-I General English & Odia + Paper-II Criminal & Constitutional Law', 'Descriptive / MCQ'],
        ['Viva-Voce & Bar Verification', 'Odisha State Bar Council Practice Certificate', 'District Court / High Court Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://law.odisha.gov.in', title: '⚖️ Law Department, Odisha', desc: 'APP & State Legal Cadre Rules' },
        { href: 'https://oslsa.odisha.gov.in', title: '⚖️ OSLSA Odisha Portal', desc: 'DLSA & Legal Aid Counsel Notices' }
      ])
    },
    'court-clerical-and-support-posts': {
      l2Code: '1.2.8',
      title: 'Court Process Server, Orderly, Peon, Daftary & e-Court Technical Support',
      title_or: 'ଅଦାଲତ ପ୍ରୋସେସ୍ ସର୍ଭର, ପିଅନ, ଦପ୍ତରୀ ଓ ଇ-କୋର୍ଟ ସହାୟକ',
      organisation: 'High Court of Orissa & 30 District Judgeships',
      qualification: '7th / 10th Pass (Group-D) · BCA / PGDCA (e-Court System Assistant)',
      age_limit: '18–32 / 38 yrs as on cutoff date',
      pay_level: 'ORSP 2017 Level-1 (₹16,600) to Level-4 (₹19,900)',
      vacancies: 'Group-D Peon/Orderly/Process Server & e-Seva Kendra Staff',
      apply_url: 'https://www.orissahighcourt.nic.in',
      summary: 'Recruits Process Servers, Orderly Peons, Watchmen, and e-Courts Technical Assistants across the High Court of Orissa and all 30 District & Taluk Court Complexes.',
      summary_or: 'ଓଡ଼ିଶା ହାଇକୋର୍ଟ ଓ ଜିଲ୍ଲା ଅଦାଲତରେ ପ୍ରୋସେସ୍ ସର୍ଭର, ପିଅନ ଓ ଇ-ସେବା କେନ୍ଦ୍ର କର୍ମଚାରୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Screening Test', 'Basic Odia, English, General Awareness & Arithmetic', '7th/10th Standard'],
        ['Interview & Physical Check', 'Cycling Proficiency (for Process Server) + Viva-Voce', 'District Judgeship Appointment']
      ],
      relaxationTable: ODISHA_RELAXATION('18–32 / 38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.orissahighcourt.nic.in', title: '🏛️ High Court Support Staff', desc: 'Class-IV & e-Court Notices' }
      ])
    },

    // ================= 1.2.9 DEPARTMENTS & DIRECTORATES =================
    'agriculture': {
      l2Code: '1.2.9',
      title: 'Odisha Agriculture & FE Dept — AAO, VAW, Horticulture Overseer & Soil Conservation',
      title_or: 'ଓଡ଼ିଶା କୃଷି ବିଭାଗ — AAO, VAW, ଉଦ୍ୟାନ କୃଷି ଓ ମୃତ୍ତିକା ସଂରକ୍ଷଣ',
      organisation: 'OPSC (AAO/AHO) & OSSC / OSSSC (VAW/HEW/SCEW)',
      qualification: 'B.Sc Agriculture/Horticulture (AAO/AHO) · +2 Science/Agri (VAW/HEW/SCEW) + Odia',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-4 (₹19,900 VAW/HEW) · Level-10 (₹44,900 AAO/AHO)',
      vacancies: 'Assistant Agriculture Officer (AAO), VAW, HEW & Veterinary Asst Surgeon',
      apply_url: 'https://agriodisha.nic.in',
      summary: 'Covers Group-A/B OPSC Assistant Agriculture Officer (AAO), Assistant Horticulture Officer (AHO), Assistant Soil Conservation Officer (ASCO), and Group-C Village Agricultural Worker (VAW) / Horticulture Extension Worker (HEW).',
      summary_or: 'OPSC ମାଧ୍ୟମରେ ସହକାରୀ କୃଷି ଅଧିକାରୀ (AAO/AHO) ଏବଂ OSSC/OSSSC ମାଧ୍ୟମରେ ଗ୍ରାମ୍ୟ କୃଷି କର୍ମଚାରୀ (VAW) ଓ ଉଦ୍ୟାନ କୃଷି କର୍ମୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['AAO / AHO (OPSC)', '2 Papers (200 Marks Agriculture/Horticulture MCQs) + Viva-Voce', 'B.Sc (Agri/Horti) Core'],
        ['VAW / HEW / SCEW (OSSC)', 'Prelims (150 Marks) + Mains Domain Paper (200 Marks)', '+2 Science Standard']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://agriodisha.nic.in', title: '🌾 Agriculture Dept Odisha', desc: 'AAO, VAW & Directorate Cadres' }
      ])
    },
    'school-and-higher-education': {
      l2Code: '1.2.9',
      title: 'Directorates of Secondary, Elementary & Higher Education Administrative Cadres',
      title_or: 'ବିଦ୍ୟାଳୟ ଓ ଉଚ୍ଚଶିକ୍ଷା ନିର୍ଦ୍ଦେଶାଳୟ ନିଯୁକ୍ତି',
      organisation: 'DSE / DEE / DHE Odisha (OPSC / OSSC)',
      qualification: "Bachelor's / Master's Degree + Computer / B.Ed + Odia ME/HSC",
      age_limit: '21–38 yrs as on Jan 1',
      pay_level: 'ORSP 2017 Level-7 (₹25,500) to Level-12 (₹56,100)',
      vacancies: 'Directorate Statistical, Academic & Ministerial Posts',
      apply_url: 'https://dseodisha.in',
      summary: 'Recruits academic monitors, statistical investigators, and ministerial staff under Directorate of Secondary Education (DSE), Directorate of Elementary Education (DEE), and Directorate of Higher Education (DHE), Bhubaneswar.',
      summary_or: 'DSE, DEE ଏବଂ DHE ଭୁବନେଶ୍ୱର ଅଧୀନରେ ଶିକ୍ଷା ବିଭାଗୀୟ ନିର୍ଦ୍ଦେଶାଳୟ ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OSSC / OPSC Written', 'General Awareness, Reasoning, Odia/English & Domain Paper', '-0.25 Negative Marking'],
        ['Skill / Verification', 'Computer Skill Test & Certificate Verification', 'Directorate / District Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://dseodisha.in', title: '🏫 DSE Odisha Portal', desc: 'Secondary Education Directorate Notices' }
      ])
    },
    'women-and-child-development': {
      l2Code: '1.2.9',
      title: 'W&CD Odisha — ICDS Supervisor, Anganwadi Worker/Helper, CDPO & One Stop Centre',
      title_or: 'ମହିଳା ଓ ଶିଶୁ ବିକାଶ ବିଭାଗ — ICDS ସୁପରଭାଇଜର, ଅଙ୍ଗନୱାଡ଼ି ଓ CDPO',
      organisation: 'Women & Child Development Dept, Odisha / OSSSC / OPSC',
      qualification: '10th/+2 (AWW/AWH) · Bachelor Degree (ICDS Supervisor / CDPO — Women Only)',
      age_limit: '18–35 yrs (AWW) · 21–38 yrs (Supervisor/CDPO)',
      pay_level: 'AWW Honorarium ₹10,000+ · ICDS Supervisor Level-9 (₹35,400) · CDPO Level-10',
      vacancies: 'ICDS Supervisor, CDPO, DCPU Protection Officer & 74,000+ AWC Cadre',
      apply_url: 'https://wcd.odisha.gov.in',
      summary: 'Recruits Women Supervisors (via OSSSC), Child Development Project Officers (CDPO via OPSC), District Child Protection Unit (DCPU) Counsellors, One Stop Centre (Sakhi) staff, and Anganwadi Workers across 338 ICDS Projects.',
      summary_or: 'OSSSC ICDS ସୁପରଭାଇଜର, OPSC CDPO, DCPU ଶିଶୁ ସୁରକ୍ଷା ଅଧିକାରୀ ଏବଂ ୩୩୮ଟି ICDS ପ୍ରକଳ୍ପରେ ଅଙ୍ଗନୱାଡ଼ି କର୍ମୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['ICDS Supervisor (OSSSC)', 'CRE Prelims (100) + Mains (180 Marks) + Computer Skill Test', 'Women Candidates (Direct & AWW Quota)'],
        ['DCPU / Anganwadi', 'Academic Career Merit + Interview (District Collectorate / Sub-Collector)', 'GP / Ward Level Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://wcd.odisha.gov.in', title: '👩‍👧 W&CD Dept Odisha Portal', desc: 'ICDS, DCPU & Mission Shakti Notices' }
      ])
    },
    'social-security-and-empowerment': {
      l2Code: '1.2.9',
      title: 'SSEPD Odisha — Block Social Security Officer (BSSO) & District Social Security Posts',
      title_or: 'SSEPD ଓଡ଼ିଶା — ବ୍ଲକ୍ ସାମାଜିକ ସୁରକ୍ଷା ଅଧିକାରୀ (BSSO) ଓ DSSO',
      organisation: 'Social Security & Empowerment of Persons with Disabilities Dept / OSSC',
      qualification: "Bachelor's Degree in any discipline + Computer Knowledge + Odia ME/HSC",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5 · PwBD +10)',
      pay_level: 'ORSP 2017 Level-9 (₹35,400 – ₹1,12,400)',
      vacancies: 'Block Social Security Officer (BSSO) & Special School Staff across 314 Blocks',
      apply_url: 'https://ssepd.odisha.gov.in',
      summary: 'Covers Block Social Security Officer (BSSO via OSSC), District Social Security Officer (DSSO), and Special Educator / Braille / Sign Language posts for Divyangjan and Senior Citizen welfare across 314 Odisha Blocks.',
      summary_or: 'ଓଡ଼ିଶାର ୩୧୪ଟି ବ୍ଲକ୍‌ରେ ବ୍ଲକ୍ ସାମାଜିକ ସୁରକ୍ଷା ଅଧିକାରୀ (BSSO) ଓ ଭିନ୍ନକ୍ଷମ କଲ୍ୟାଣ ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['BSSO Written (OSSC)', 'Prelims (150 Marks) + Mains (Paper-I Language 100 + Paper-II GS 100)', '-0.25 Negative Marking'],
        ['Computer Skill Test', 'Practical MS Office & Pension Portal Handling', '314 Block HQ Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://ssepd.odisha.gov.in', title: '♿ SSEPD Odisha Portal', desc: 'BSSO, DSSO & Divyangjan Welfare' }
      ])
    },
    'rural-development': {
      l2Code: '1.2.9',
      title: 'Rural Development Dept Odisha — AE, JE (Civil), RWSS & Quality Control Posts',
      title_or: 'ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ ବିଭାଗ (RD) — AE, JE (ସିଭିଲ୍) ଓ RWSS ପଦବୀ',
      organisation: 'Rural Development Dept / OPSC (AEE) / OSSC (JE)',
      qualification: 'B.Tech Civil (AEE) / Diploma Civil (JE) + Odia ME/HSC',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-9 (JE ₹35,400) · Level-12 (AEE ₹56,100)',
      vacancies: 'Rural Works (PMGSY) & RWSS Engineering Cadre Posts',
      apply_url: 'https://rd.odisha.gov.in',
      summary: 'Engineering and technical recruitment for Rural Works (PMGSY rural roads & bridges) and Rural Water Supply & Sanitation (RWSS) Divisions across all 30 Odisha districts.',
      summary_or: 'ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ (PMGSY ରାସ୍ତା/ସେତୁ) ଓ RWSS ଜଳଯୋଗାଣ ଡିଭିଜନରେ AEE ଓ JE ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['JE Civil (OSSC CTSRE)', 'Prelims (150 Marks) + Civil Engineering Technical Paper (200 Marks)', '-0.25 Negative Marking'],
        ['AEE Civil (OPSC)', 'GATE Score / Written + Viva-Voce', 'Rural Works & RWSS Division Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://rd.odisha.gov.in', title: '🛣️ Rural Development Dept', desc: 'PMGSY & RWSS Engineering Notices' }
      ])
    },
    'panchayati-raj-and-drinking-water': {
      l2Code: '1.2.9',
      title: 'Panchayati Raj & Drinking Water Dept — PEO, BDO Support, GRS & JJM Staff',
      title_or: 'ପଞ୍ଚାୟତିରାଜ ଓ ପାନୀୟ ଜଳ ବିଭାଗ — PEO, GRS ଓ ଜଳ ଜୀବନ ମିଶନ',
      organisation: 'PR&DW Department, Odisha / OSSSC / 30 Zilla Parishads',
      qualification: '+2 Pass (PEO/GRS) · B.Tech/Diploma (JJM Technical) + Computer + Odia',
      age_limit: '18/21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-5 (PEO ₹21,700) · Level-9 (JE ₹35,400) · GRS Consolidated',
      vacancies: 'Panchayat Executive Officer (PEO), GRS & Block Technical Staff',
      apply_url: 'https://panchayat.odisha.gov.in',
      summary: 'Covers 6,794 Gram Panchayats and 314 Blocks of Odisha for Panchayat Executive Officer (PEO), Gram Rozgar Sevak (GRS), MIS-cum-Accountant, and Jal Jeevan Mission (BASUDHA) drinking water engineers.',
      summary_or: 'ଓଡ଼ିଶାର ୬,୭୯୪ଟି ଗ୍ରାମ ପଞ୍ଚାୟତ ଓ ୩୧୪ଟି ବ୍ଲକ୍‌ରେ PEO, GRS, ଆକାଉଣ୍ଟାଣ୍ଟ ଓ ପାନୀୟ ଜଳ ପ୍ରକଳ୍ପ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['PEO (OSSSC Written)', '180 Marks (Eng, Odia, Maths, GK, Comp) + 50 Marks Practical', '-0.50 Negative Marking'],
        ['GRS / JJM District Panel', '+2 Academic Merit (GRS) or Degree/Diploma + Interview', 'Gram Panchayat / Block Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://panchayat.odisha.gov.in', title: '🏡 PR&DW Odisha Portal', desc: 'PEO, GRS & Zilla Parishad Notices' }
      ])
    },
    'works-water-resources-and-public-health-engineering': {
      l2Code: '1.2.9',
      title: 'Works, Water Resources (DoWR) & H&UD (PHEO) — AEE, JE & Technical Cadres',
      title_or: 'ପୂର୍ତ୍ତ, ଜଳସମ୍ପଦ (DoWR) ଓ PHEO — AEE, JE ଓ ଯାନ୍ତ୍ରିକ ପଦବୀ',
      organisation: 'OPSC (AEE) / OSSC (JE) / DoWR & Works Dept, Odisha',
      qualification: 'B.E./B.Tech (AEE) / Diploma (JE) in Civil, Mechanical or Electrical + Odia',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-9 (JE ₹35,400) · Level-12 (AEE ₹56,100)',
      vacancies: 'AEE & JE Civil/Mech/Elec across Major Irrigation, Roads & Urban Water',
      apply_url: 'https://dowrodisha.gov.in',
      summary: 'Recruits Assistant Executive Engineers (AEE) and Junior Engineers (JE) for Odisha Works Department (Highways/Buildings), Department of Water Resources (Dams/Canals/Mega Lift), and Public Health Engineering Organisation (PHEO).',
      summary_or: 'ପୂର୍ତ୍ତ ବିଭାଗ, ଜଳସମ୍ପଦ ବିଭାଗ (DoWR) ଏବଂ PHEO ରେ ସହକାରୀ ନିର୍ବାହୀ ଯନ୍ତ୍ରୀ (AEE) ଓ ଜୁନିଅର ଇଞ୍ଜିନିୟର (JE) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OSSC JE (CTSRE)', 'Prelims (150 Marks) + Technical Paper (200 Marks Civil/Mech/Elec)', '-0.25 Negative Marking'],
        ['OPSC AEE', 'GATE / Written Technical + Viva-Voce', 'Irrigation, Works & PHEO Circles']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://dowrodisha.gov.in', title: '💧 Dept of Water Resources Odisha', desc: 'Irrigation & Engineering Cadres' },
        { href: 'https://works.odisha.gov.in', title: '🏗️ Works Dept Odisha', desc: 'State Highways & Buildings Cadre' }
      ])
    },
    'forest-environment-and-fisheries': {
      l2Code: '1.2.9',
      title: 'Forest, Environment & Fisheries Dept — ACF, Range Officer, Forester, Guard & AFO',
      title_or: 'ଜଙ୍ଗଲ, ପରିବେଶ ଓ ମତ୍ସ୍ୟ ବିଭାଗ — ACF, ରେଞ୍ଜ ଅଫିସର, ଫରେଷ୍ଟ ଗାର୍ଡ ଓ AFO',
      organisation: 'OPSC (ACF/Ranger/AFO) & OSSSC (Forester/Forest Guard) & OSSC (JFA)',
      qualification: 'B.Sc/B.F.Sc (ACF/AFO) · +2 Science (Forester) · 10th (Forest Guard) + Odia',
      age_limit: '18–38 yrs (Guard/Forester) · 21–38 yrs (ACF/Ranger/AFO)',
      pay_level: 'ORSP Level-4 (Guard ₹19,900) · Level-10 (Ranger/AFO ₹44,900) · Level-12 (ACF ₹56,100)',
      vacancies: 'ACF, Forest Range Officer, Forester, Forest Guard & Asst Fisheries Officer',
      apply_url: 'https://forest.odisha.gov.in',
      summary: 'Recruits Odisha Forest Service (ACF/Ranger via OPSC), Forester & Forest Guard (via OSSSC with 25 km/16 km walking test), and Assistant Fisheries Officer (AFO) & Junior Fisheries Technical Assistant.',
      summary_or: 'OPSC ACF ଓ ରେଞ୍ଜ ଅଫିସର, OSSSC ଫରେଷ୍ଟର/ଫରେଷ୍ଟ ଗାର୍ଡ (୨୫/୧୬ କି.ମି. ଚାଲିବା ପରୀକ୍ଷା ସହ) ଏବଂ ମତ୍ସ୍ୟ ଅଧିକାରୀ (AFO) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['ACF / Range Officer (OPSC)', '1,400 Marks Written + 25 km (M) / 16 km (F) Walk + Viva-Voce', 'B.Sc / Engineering / Forestry'],
        ['Forester / Forest Guard (OSSSC)', '150 Marks CBRT + PST + 25 km / 16 km Walking Test', '-0.50 Negative Marking']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      physicalStandards: FOREST_PST,
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://forest.odisha.gov.in', title: '🌲 Forest & Environment Dept', desc: 'PCCF Odisha & Wildlife Circle Notices' },
        { href: 'https://fardodisha.gov.in', title: '🐟 Fisheries & ARD Dept Odisha', desc: 'AFO, VAS & Livestock Inspector' }
      ])
    },
    'finance-planning-and-statistics': {
      l2Code: '1.2.9',
      title: 'Finance, Planning & Convergence Dept — OFS, OT&AS, Auditor, DE&S Statistical Staff',
      title_or: 'ଅର୍ଥ, ଯୋଜନା ଓ ପରିସଂଖ୍ୟାନ ବିଭାଗ — OFS, OT&AS, ଅଡିଟର ଓ ଷ୍ଟାଟିଷ୍ଟିକାଲ ଅଫିସର',
      organisation: 'OPSC (OFS/OT&AS/Asst Dir) & OSSC (Auditor/Inspector)',
      qualification: "Bachelor's / Master's Degree in Commerce, Economics, Statistics or Maths + Odia",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-7 (₹25,500) · Level-9 (₹35,400) · Level-12 (OFS ₹56,100)',
      vacancies: 'Odisha Taxation & Accounts Service (OT&AS), Local Fund Auditor & SFS',
      apply_url: 'https://finance.odisha.gov.in',
      summary: 'Includes Odisha Finance Service (OFS via OCS), Odisha Taxation & Accounts Service (OT&AS), Local Fund / Co-operative Auditors, and Directorate of Economics & Statistics (DE&S) Investigators.',
      summary_or: 'ଓଡ଼ିଶା ଅର୍ଥ ସେବା (OFS), OT&AS, ଲୋକାଲ୍ ଫଣ୍ଡ ଅଡିଟର ଏବଂ ଅର୍ଥନୀତି ଓ ପରିସଂଖ୍ୟାନ ନିର୍ଦ୍ଦେଶାଳୟ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OSSC Auditor / OT&AS', 'Prelims (150 Marks) + Mains (200 Marks) + Domain Paper', '-0.25 Negative Marking'],
        ['DE&S Statistical Officer', 'Statistics / Economics / Maths Paper + Interview', 'District Planning & Monitoring Unit']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://finance.odisha.gov.in', title: '💼 Finance Department Odisha', desc: 'OFS, OT&AS & Treasury Cadres' }
      ])
    },
    'other-state-departments': {
      l2Code: '1.2.9',
      title: 'Other State Departments — Transport (MVI), Tourism, Handlooms, Industries & Labour',
      title_or: 'ଅନ୍ୟାନ୍ୟ ରାଜ୍ୟ ବିଭାଗ — ପରିବହନ (MVI), ପର୍ଯ୍ୟଟନ, ଶିଳ୍ପ ଓ ଶ୍ରମ ବିଭାଗ',
      organisation: 'OPSC / OSSC / STA Odisha',
      qualification: 'Diploma/B.Tech Auto/Mech (MVI) · Degree (Labour/Tourism/Industries) + Odia',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-7 (₹25,500) to Level-10 (₹44,900)',
      vacancies: 'Junior MVI, Assistant Labour Officer, Tourist Officer & IPO Posts',
      apply_url: 'https://odishatransport.gov.in',
      summary: 'Recruits Junior Motor Vehicle Inspectors (JMVI / MVI under Commerce & Transport), Assistant Labour Officers, Industrial Promotion Officers (IPO), and Tourist Officers across Odisha.',
      summary_or: 'ପରିବହନ ବିଭାଗ (JMVI/MVI), ଶ୍ରମ ଅଧିକାରୀ, ଶିଳ୍ପ ପ୍ରୋତ୍ସାହନ ଅଧିକାରୀ (IPO) ଓ ପର୍ଯ୍ୟଟନ ଅଧିକାରୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OSSC / OPSC Written', 'Prelims (150 Marks) + Mains / Automobile Engineering Paper (200 Marks)', '-0.25 Negative Marking'],
        ['Driving / Skill Verification', 'Heavy Motor Vehicle Licence (for MVI/JMVI)', 'RTO & District Office Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://odishatransport.gov.in', title: '🚘 State Transport Authority Odisha', desc: 'MVI, JMVI & RTO Recruitment' }
      ])
    },

    // ================= 1.2.10 LOCAL BODIES =================
    'panchayati-raj-institutions': {
      l2Code: '1.2.10',
      title: 'Panchayati Raj Institutions — 30 Zilla Parishads, 314 Blocks & 6,794 Gram Panchayats',
      title_or: 'ପଞ୍ଚାୟତିରାଜ ଅନୁଷ୍ଠାନ — ୩୦ ଜିଲ୍ଲା ପରିଷଦ, ୩୧୪ ବ୍ଲକ୍ ଓ ୬,୭୯୪ ଗ୍ରାମ ପଞ୍ଚାୟତ',
      organisation: 'Zilla Parishad / Panchayat Samiti / PR&DW Dept Odisha',
      qualification: '+2 Pass (PEO/GRS) · Degree/B.Com (MIS/Accountant) + Computer + Odia',
      age_limit: '18/21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-5 (PEO ₹21,700) · Block Contractual ₹15,000–₹35,000',
      vacancies: 'PEO, Gram Rozgar Sevak, Block MIS & MGNREGA Technical Assistant',
      apply_url: 'https://panchayat.odisha.gov.in',
      summary: 'Covers all 3-tier Panchayati Raj Institutions (PRI) in Odisha — Zilla Parishads, 314 Panchayat Samitis, and 6,794 Gram Panchayats — including PEO, GRS, and MGNREGA technical/accounts posts.',
      summary_or: 'ଓଡ଼ିଶାର ୩-ସ୍ତରୀୟ ପଞ୍ଚାୟତିରାଜ ଅନୁଷ୍ଠାନ (ଜିଲ୍ଲା ପରିଷଦ, ୩୧୪ ବ୍ଲକ୍ ଓ ୬,୭୯୪ ଗ୍ରାମ ପଞ୍ଚାୟତ) ରେ PEO, GRS ଓ MGNREGA ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['PEO (OSSSC) / GRS Merit', '180 Marks Written (PEO) OR +2 Marks Merit List (GRS)', 'Block / GP Level Posting'],
        ['Computer & Document Check', 'Basic Computer Practical + Residence Certificate', 'Zilla Parishad Collector Approval']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://panchayat.odisha.gov.in', title: '🏡 PR&DW PRI Recruitment', desc: 'Zilla Parishad & GP Staff Orders' }
      ])
    },
    'urban-local-bodies': {
      l2Code: '1.2.10',
      title: 'Odisha Urban Local Bodies (ULBs) — Executive Officer, Tax Collector & Jalsathi',
      title_or: 'ଓଡ଼ିଶା ପୌରସଂସ୍ଥା (ULB) — କାର୍ଯ୍ୟନିର୍ବାହୀ ଅଧିକାରୀ, ଟ୍ୟାକ୍ସ କଲେକ୍ଟର ଓ ଜଳସାଥୀ',
      organisation: 'Housing & Urban Development Dept / SUDA Odisha / OSSC',
      qualification: "Bachelor's Degree (Executive Officer/Accountant) · +2 (Tax Collector/Supervisor)",
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-4 (₹19,900) to Level-10 (₹44,900 Executive Officer)',
      vacancies: '115+ ULB Executive Officer, Municipal Engineer, Sanitary Inspector & MIS Posts',
      apply_url: 'https://urban.odisha.gov.in',
      summary: 'Recruits Executive Officers (Odisha Municipal Administrative Service), Sanitary Inspectors, Tax Collectors, Accountants, and Swachh Bharat / SUDA Urban Planners across 115 ULBs in Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ୧୧୫ଟି ପୌରସଂସ୍ଥା (ULB) ରେ କାର୍ଯ୍ୟନିର୍ବାହୀ ଅଧିକାରୀ, ସାନିଟାରୀ ଇନ୍ସପେକ୍ଟର, ଟ୍ୟାକ୍ସ କଲେକ୍ଟର ଓ SUDA ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OSSC / H&UD Written', 'GS, Urban Governance, Accounting / Engineering & Odia/English', '-0.25 Negative Marking'],
        ['Skill & Document Verification', 'Computer Practical + Municipality Allotment', '115 ULB Posting across Odisha']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://urban.odisha.gov.in', title: '🏙️ H&UD Dept Odisha (urban.odisha.gov.in)', desc: 'Municipal & ULB Recruitment Portal' }
      ])
    },
    'municipal-corporations-and-municipalities': {
      l2Code: '1.2.10',
      title: '5 Municipal Corporations (BMC, CMC, BeMC, SMC, RMC) & 48 Municipalities',
      title_or: '୫ଟି ମହାନଗର ନିଗମ (BMC, CMC, BeMC, SMC, RMC) ଓ ୪୮ ପୌରପାଳିକା',
      organisation: 'BMC Bhubaneswar / CMC Cuttack / BeMC / SMC / RMC',
      qualification: '10th/+2 (Ward/Sanitary) · Diploma/B.Tech (Municipal JE/AE) · Degree (Revenue)',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-4 (₹19,900) to Level-10 (₹44,900)',
      vacancies: 'Ward Officer, Sanitary Inspector, Municipal JE & Smart City Posts',
      apply_url: 'https://www.bmc.gov.in',
      summary: 'Covers Bhubaneswar Municipal Corporation (BMC), Cuttack (CMC), Berhampur (BeMC), Sambalpur (SMC), and Rourkela (RMC) plus 48 Municipalities and 62 NACs across Odisha.',
      summary_or: 'ଭୁବନେଶ୍ୱର (BMC), କଟକ (CMC), ବ୍ରହ୍ମପୁର (BeMC), ସମ୍ବଲପୁର (SMC) ଓ ରାଉରକେଲା (RMC) ମହାନଗର ନିଗମରେ ବିଭିନ୍ନ ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Walk-in Selection', 'Corporation Exam OR Academic + Technical Interview', 'City Commissionerate Panel'],
        ['Practical / Field Test', 'GIS/AutoCAD (for Engineers) or Municipal Tax Software', 'City HQ Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://www.bmc.gov.in', title: '🏙️ BMC Bhubaneswar Portal', desc: 'Municipal Corporation Notices' },
        { href: 'https://cmccuttack.gov.in', title: '🏙️ CMC Cuttack Portal', desc: 'Cuttack Municipal Recruitment' }
      ])
    },
    'block-level-recruitment': {
      l2Code: '1.2.10',
      title: '314 Block Office & Panchayat Samiti Recruitment (CP, GPTA, BSSO, BPM, CRP)',
      title_or: '୩୧୪ ବ୍ଲକ୍ କାର୍ଯ୍ୟାଳୟ ଓ ପଞ୍ଚାୟତ ସମିତି ନିଯୁକ୍ତି (GPTA, CP, BSSO)',
      organisation: '314 Block Development Offices (BDO) / Zilla Parishad Odisha',
      qualification: 'Diploma Civil (GPTA) · +2/Degree + PGDCA (Computer Programmer/DEO)',
      age_limit: '21–38 yrs as on Jan 1 (SEBC/SC/ST/Women +5)',
      pay_level: '₹15,000–₹35,000 (Block Project) · ORSP Level-7/9 (Regular Block Posts)',
      vacancies: 'Gram Panchayat Technical Assistant (GPTA), Block Coordinator & DEO Posts',
      apply_url: 'https://panchayat.odisha.gov.in',
      summary: 'Block-level positions across Odisha’s 314 Blocks including Gram Panchayat Technical Assistant (GPTA), Block Level Coordinator, OLM Block Project Manager, and Block Data Entry Operator.',
      summary_or: 'ଓଡ଼ିଶାର ୩୧୪ଟି ବ୍ଲକ୍‌ରେ GPTA (ଡିପ୍ଲୋମା ସିଭିଲ୍), କମ୍ପ୍ୟୁଟର ପ୍ରୋଗ୍ରାମର, OLM ବ୍ଲକ୍ ସଂଯୋଜକ ଓ DEO ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Academic & Written Test', 'Diploma/Degree Marks + District Written / Computer Practical', 'Zilla Parishad / BDO Board'],
        ['Interview & Local Residence', 'District Residence & Odia Proficiency Verification', '314 Block HQ Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://panchayat.odisha.gov.in', title: '🏡 Block & Samiti Recruitment', desc: 'GPTA & Block Coordinator Orders' }
      ])
    },
    'district-level-project-positions': {
      l2Code: '1.2.10',
      title: 'District-Level Project & Mission Posts (OLM, ODISHA MILLETS, DMF, OMBADC)',
      title_or: 'ଜିଲ୍ଲାସ୍ତରୀୟ ପ୍ରକଳ୍ପ ଓ ମିଶନ ପଦବୀ (OLM, DMF, OMBADC, ମିଲେଟ୍ସ ମିଶନ)',
      organisation: 'District Mineral Foundation (DMF) / OMBADC / OLM / Collectorates',
      qualification: 'Degree / PG / MSW / MBA / B.Tech / B.Sc Agri + Computer Proficiency + Odia',
      age_limit: '21–38 / 45 yrs (Project-specific)',
      pay_level: '₹25,000 – ₹75,000+ Consolidated Monthly Project Remuneration',
      vacancies: 'DMF Keonjhar/Sundargarh/Angul/Jajpur/Mayurbhanj & OMBADC Fellows',
      apply_url: 'https://odisha.gov.in',
      summary: 'High-impact district project roles funded by District Mineral Foundation (DMF), OMBADC, Odisha Livelihoods Mission (OLM), and Shree Anna Abhiyan (Odisha Millets Mission) across mining & tribal districts.',
      summary_or: 'DMF (କେନ୍ଦୁଝର, ସୁନ୍ଦରଗଡ଼, ଅନୁଗୁଳ, ଯାଜପୁର), OMBADC ଏବଂ ଓଡ଼ିଶା ଜୀବିକା ମିଶନ (OLM) ରେ ଜିଲ୍ଲାସ୍ତରୀୟ ପ୍ରକଳ୍ପ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Shortlisting & Written', 'Project Domain, Quantitative Analysis, Report Writing & Computer', 'District Project Society'],
        ['Personal Interview', 'Collector / PD DRDA Selection Committee', 'Fixed-Term Renewable Tenure']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 45 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://odisha.gov.in', title: '🌐 30-District DMF & OMBADC', desc: 'District NIC Project Recruitment' }
      ])
    },

    // ================= 1.2.11 STATE PSUs =================
    'state-government-companies': {
      l2Code: '1.2.11',
      title: 'Odisha State Govt Companies — IDCO, IPICOL, OCAC, OSCSC & OSWC',
      title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ କମ୍ପାନୀ — IDCO, IPICOL, OCAC, OSCSC',
      organisation: 'IDCO / IPICOL / OCAC / Odisha State Civil Supplies Corp (OSCSC)',
      qualification: 'B.Tech / MBA / CA / ICWA / MCA / Graduate + Odia ME/HSC',
      age_limit: '21–32 / 38 yrs as on cutoff date (SEBC/SC/ST/Women +5)',
      pay_level: 'PSU IDA / ORSP Level-9 (₹35,400) to Level-12 (₹56,100 – Management Trainee)',
      vacancies: 'Management Trainee (MT), Asst Manager, IT Engineer & Civil Engineer Posts',
      apply_url: 'https://www.idco.in',
      summary: 'Recruits Executives, Management Trainees, Engineers, and Accounts Officers in Odisha’s flagship State PSUs including IDCO (Industrial Infrastructure), IPICOL, OCAC (IT), and OSCSC (Civil Supplies).',
      summary_or: 'IDCO, IPICOL, OCAC ଏବଂ ଓଡ଼ିଶା ରାଜ୍ୟ ଯୋଗାଣ ନିଗମ (OSCSC) ରେ ମ୍ୟାନେଜମେଣ୍ଟ ଟ୍ରେନି, ଇଞ୍ଜିନିୟର ଓ ଆକାଉଣ୍ଟାଣ୍ଟ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBRT / GATE / CAT Shortlist', 'Domain Paper (100 Marks) + Aptitude/Reasoning/English (50 Marks)', '-0.25 Negative Marking'],
        ['Group Discussion & Interview', 'PSU Selection Board at Bhubaneswar', 'Probation 1–2 Years -> Regular']
      ],
      relaxationTable: ODISHA_RELAXATION('21–32 / 38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.idco.in', title: '🏭 IDCO Odisha Portal', desc: 'Industrial Infrastructure PSU Careers' },
        { href: 'https://ocac.odisha.gov.in', title: '💻 OCAC Odisha Portal', desc: 'State IT Directorate & PSU Careers' }
      ])
    },
    'electricity-and-power-utilities': {
      l2Code: '1.2.11',
      title: 'Odisha Power Utilities — OPTCL, OHPC, OPGC & GRIDCO (MT / DET / JOT)',
      title_or: 'ଓଡ଼ିଶା ବିଦ୍ୟୁତ ନିଗମ — OPTCL, OHPC, OPGC ଓ GRIDCO (MT / DET / JOT)',
      organisation: 'OPTCL / OHPC / OPGC / GRIDCO (Bhubaneswar)',
      qualification: 'B.E./B.Tech Elec/Mech/IT (MT) · Diploma (DET) · ITI Electrician (JOT/Technician) + Odia',
      age_limit: '21–32 yrs (MT/DET) · 18–32 / 38 yrs (JOT) (+5 SC/ST/SEBC/Women)',
      pay_level: 'JOT ₹19,900–₹63,200 · DET ₹35,400 · MT E-3 ₹56,100 – ₹1,77,500',
      vacancies: '500+ Management Trainee (MT), Diploma Engineer Trainee & Junior Operator Posts',
      apply_url: 'https://www.optcl.co.in',
      summary: 'Odisha’s power sector PSUs — OPTCL (Transmission), OHPC (Hydro Power), OPGC (Thermal Ib Valley), and GRIDCO — recruit Management Trainees (via GATE/CBRT), Diploma Engineer Trainees (DET), and ITI Junior Operation Trainees (JOT).',
      summary_or: 'OPTCL, OHPC, OPGC ଓ GRIDCO ରେ ମ୍ୟାନେଜମେଣ୍ଟ ଟ୍ରେନି (MT), ଡିପ୍ଲୋମା ଇଞ୍ଜିନିୟର ଟ୍ରେନି (DET) ଓ ITI ଜୁନିଅର ଅପରେଟର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBRT Exam (200 Marks)', 'Subject Knowledge (60% — Electrical/Mech/Civil) + Reasoning/GK/English (40%)', '3 Hours · No/0.25 Neg Marking'],
        ['Personal Interview / Skill Test', 'Technical Viva (for MT) or Climbing/Safety Practical (for JOT/Lineman)', 'State-wide Grid & Power Plant Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–32 / 38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://www.optcl.co.in', title: '⚡ OPTCL Careers (optcl.co.in)', desc: 'MT, DET & JOT Electrician Recruitment' },
        { href: 'https://www.ohpcltd.com', title: '💧 OHPC Odisha Portal', desc: 'Hydro Power Trainee & Executive Jobs' }
      ])
    },
    'mining-and-industrial-organisations': {
      l2Code: '1.2.11',
      title: 'Odisha Mining Corporation (OMC), OMECL & IDCOL — Non-Executive & Executive Cadres',
      title_or: 'ଓଡ଼ିଶା ଖଣି ନିଗମ (OMC), OMECL ଓ IDCOL ନିଯୁକ୍ତି',
      organisation: 'Odisha Mining Corporation Ltd (OMC) — State Gold Category PSU',
      qualification: 'ITI/Diploma (Mining Mate/Foreman/Jr Engineer) · B.Tech/M.Sc/CA (Deputy Manager E-2)',
      age_limit: '18–38 yrs (Non-Executive) · 21–32 / 36 yrs (Executive) (+5 SC/ST/SEBC/Women)',
      pay_level: 'Non-Exec ₹21,700–₹69,100 · Jr Engineer ₹35,400 · Executive E-2 ₹67,700–₹2,08,700',
      vacancies: 'Jr Engineer (Mining/Mech/Elec/Civil), Mining Mate-III, Surveyor & Dy Manager',
      apply_url: 'https://omcltd.in',
      summary: 'Odisha Mining Corporation (OMC), India’s largest State PSU mining company, recruits Junior Engineers, Surveyors, Mining Mates, Junior Pharmacists, and E-2/E-3 Executives for Barbil, Joda, Daitari, Gandhamardan, Kodingamali, and Bhubaneswar HQ.',
      summary_or: 'ଓଡ଼ିଶା ଖଣି ନିଗମ (OMC) ରେ ଜୁନିଅର ଇଞ୍ଜିନିୟର, ମାଇନିଂ ମେଟ୍, ସର୍ଭେୟର, ଜୁନିଅର ନର୍ସ ଏବଂ ଡେପୁଟି ମ୍ୟାନେଜର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Non-Executive CBRT (120 Marks)', 'Domain Technical (60) + General Awareness, Reasoning, English, Quant (60)', '2 Hours · -0.25 Negative Marking'],
        ['Executive (E-2 / E-3)', 'GATE Score / Written + Personal Interview at Bhubaneswar', 'Mines Act Statutory Certificates (DGMS)']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      payProgression: ORSP_L10_TO_L16,
      referenceLinks: refs([
        { href: 'https://omcltd.in', title: '⛏️ OMC Ltd Careers (omcltd.in)', desc: 'Non-Executive & Executive Recruitment' }
      ])
    },
    'state-transport-and-infrastructure-organisations': {
      l2Code: '1.2.11',
      title: 'OSRTC, CRUT (Ama Bus / Mo Bus), OBCC (Bridge & Construction) & Odisha Rail Infra',
      title_or: 'OSRTC, CRUT (ମୋ ବସ୍), OBCC ଓ ଓଡ଼ିଶା ସେତୁ/ପରିବହନ ନିଗମ',
      organisation: 'OSRTC / CRUT Bhubaneswar / OBCC Ltd / ORIDL',
      qualification: '10th + Heavy Passenger Licence (Driver/Conductor) · B.Tech/Diploma Civil (OBCC)',
      age_limit: '21–38 yrs as on cutoff date (SEBC/SC/ST/Women +5)',
      pay_level: '₹19,900–₹35,400 (Technical/Ops) · ₹44,900–₹67,700 (OBCC Engineers)',
      vacancies: 'OBCC Civil Engineers, OSRTC Mechanics/Drivers & CRUT Operations Staff',
      apply_url: 'https://osrtc.in',
      summary: 'Recruits Civil Engineers and Managers in Odisha Bridge & Construction Corporation (OBCC), Transport Officers/Drivers/Mechanics in OSRTC, and Urban Transit Managers in CRUT.',
      summary_or: 'OBCC ରେ ସିଭିଲ୍ ଇଞ୍ଜିନିୟର, OSRTC ରେ ଡ୍ରାଇଭର/ମେକାନିକ୍ ଏବଂ CRUT (ମୋ ବସ୍) ରେ ପରିବହନ ପରିଚାଳକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Technical Test', 'Civil Engineering / Automobile / Transport Management (100 Marks)', 'CBRT or Skill-based'],
        ['Trade / Driving Test & Viva', 'Heavy Passenger Vehicle Driving Test (OSRTC) or Interview (OBCC)', 'Depots & Project Sites across Odisha']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://osrtc.in', title: '🚌 OSRTC Odisha Portal', desc: 'State Road Transport Careers' },
        { href: 'https://www.obcc.in', title: '🌉 OBCC Odisha Portal', desc: 'Bridge & Construction Engineering Jobs' }
      ])
    },
    'state-corporations-and-development-authorities': {
      l2Code: '1.2.11',
      title: 'BDA, CDA, SDA, PKDA, OTDC, APICOL & OFDC State Corporations',
      title_or: 'BDA, CDA, SDA, OTDC, APICOL ଓ ଓଡ଼ିଶା ବନ ଉନ୍ନୟନ ନିଗମ (OFDC)',
      organisation: 'BDA / CDA / OFDC / OTDC / APICOL / WATCO',
      qualification: 'B.Arch / B.Plan / B.Tech / B.Com / Forestry Graduate + Odia ME/HSC',
      age_limit: '21–38 yrs as on cutoff date (SEBC/SC/ST/Women +5)',
      pay_level: 'ORSP Level-7 (₹25,500) to Level-12 (₹56,100)',
      vacancies: 'Town Planner, Junior Field Assistant (OFDC), WATCO Engineer & OTDC Staff',
      apply_url: 'https://www.bda.gov.in',
      summary: 'Covers Bhubaneswar Development Authority (BDA), Cuttack (CDA), Sambalpur (SDA), Puri-Konark (PKDA), WATCO (24×7 Drink from Tap), Odisha Forest Development Corp (OFDC), and OTDC.',
      summary_or: 'BDA, CDA, WATCO, ଓଡ଼ିଶା ବନ ଉନ୍ନୟନ ନିଗମ (OFDC) ଏବଂ OTDC ରେ ଟାଉନ୍ ପ୍ଲାନର, ଇଞ୍ଜିନିୟର ଓ କ୍ଷେତ୍ର ସହାୟକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Shortlist', 'Planning / Engineering / Forestry / Accounts Paper (100–150 Marks)', 'Corporation Selection Board'],
        ['Interview & Skill Test', 'AutoCAD / GIS / Field Verification', 'Urban & Forest Division Posting']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://www.bda.gov.in', title: '🏙️ BDA Bhubaneswar Portal', desc: 'Development Authority Recruitment' },
        { href: 'https://www.odishafdc.com', title: '🌲 OFDC Odisha Portal', desc: 'Odisha Forest Development Corp Jobs' }
      ])
    },

    // ================= 1.2.12 CONTRACTUAL & PROJECT =================
    'mission-mode-recruitment': {
      l2Code: '1.2.12',
      title: 'Odisha Mission-Mode Recruitment — NHM, Mission Shakti, OLM & Samagra Shiksha',
      title_or: 'ଓଡ଼ିଶା ମିଶନ-ମୋଡ୍ ନିଯୁକ୍ତି — NHM, ମିଶନ ଶକ୍ତି, OLM ଓ ସମଗ୍ର ଶିକ୍ଷା',
      organisation: 'NHM / Mission Shakti / OLM / OSEPA Odisha',
      qualification: 'Graduate / MSW / MBA / ANM / GNM / B.Tech + Computer + Odia ME/HSC',
      age_limit: '21–38 / 45 yrs (Project-specific; +5 SC/ST/SEBC/Women)',
      pay_level: '₹15,000 – ₹60,000+ Consolidated Monthly + Annual 5% Increment',
      vacancies: 'Block Mission Coordinator, CRP, MBK, NHM Managers & MIS Coordinators',
      apply_url: 'https://missionshakti.odisha.gov.in',
      summary: 'Covers state-wide mission-mode programmes in Odisha including National Health Mission (NHM), Mission Shakti (SHG Federations), Odisha Livelihoods Mission (OLM), and Samagra Shiksha Abhiyan.',
      summary_or: 'NHM, ମିଶନ ଶକ୍ତି, ଓଡ଼ିଶା ଜୀବିକା ମିଶନ (OLM) ଏବଂ ସମଗ୍ର ଶିକ୍ଷା ଅଭିଯାନ ଅଧୀନରେ ବ୍ଲକ୍ ଓ ଜିଲ୍ଲାସ୍ତରୀୟ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Academic Merit + Written', '10th/12th/Grad Weightage + Written/Computer Test', 'District / State Mission Society'],
        ['Interview / Group Discussion', 'Domain & Field Mobilisation Assessment', 'Renewable 1–3 Year Contract']
      ],
      relaxationTable: ODISHA_RELAXATION('21–38 / 45 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://missionshakti.odisha.gov.in', title: '👩 Mission Shakti Odisha', desc: 'SHG Federation & Block Coordinator Notices' }
      ])
    },
    'scheme-based-positions': {
      l2Code: '1.2.12',
      title: 'Scheme-Based Positions — PMAY-G, MGNREGA, Ama Odisha Nabin Odisha & JJM',
      title_or: 'ଯୋଜନା-ଭିତ୍ତିକ ପଦବୀ — PMAY-G, MGNREGA ଓ ଜଳ ଜୀବନ ମିଶନ',
      organisation: 'PR&DW / H&UD / District Rural Development Agencies (Zilla Parishad)',
      qualification: '10th/+2 / Diploma Civil / B.Com + PGDCA + Odia ME/HSC',
      age_limit: '18/21–38 yrs as on cutoff date',
      pay_level: '₹12,000 – ₹35,000 Monthly Consolidated Remuneration',
      vacancies: 'Gram Rozgar Sevak, Awaas Mitra, Technical Assistant & Social Audit Staff',
      apply_url: 'https://panchayat.odisha.gov.in',
      summary: 'Scheme-linked contractual positions implemented across Odisha Blocks and Gram Panchayats under PMAY-Gramin, MGNREGA, Social Audit Society (OSSAAT), and Swachh Bharat Mission.',
      summary_or: 'PMAY-ଗ୍ରାମୀଣ, MGNREGA, ସାମାଜିକ ସମୀକ୍ଷା (OSSAAT) ଓ ସ୍ୱଚ୍ଛ ଭାରତ ମିଶନ ଅଧୀନରେ ଯୋଜନା-ଭିତ୍ତିକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Merit List / Computer Test', 'Academic % Merit OR Practical Computer Skill Test', 'District Zilla Parishad Selection'],
        ['Document Verification', 'Local Block/GP Residence (where applicable)', 'Scheme Tenure']
      ],
      relaxationTable: ODISHA_RELAXATION('18/21–38 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://panchayat.odisha.gov.in', title: '🏡 Odisha Scheme Recruitment', desc: 'MGNREGA & PMAY-G Orders' }
      ])
    },
    'project-staff': {
      l2Code: '1.2.12',
      title: 'Odisha Research, IT & Technical Project Staff (OCAC, ORSAC, IIT/NIT/OUAT/ICAR)',
      title_or: 'ଓଡ଼ିଶା ଗବେଷଣା, IT ଓ ପ୍ରକଳ୍ପ କର୍ମଚାରୀ (OCAC, ORSAC, OUAT, IIT/NIT)',
      organisation: 'OCAC / ORSAC / OUAT Bhubaneswar / State Universities',
      qualification: 'B.Tech / MCA / M.Sc / Ph.D (JRF/SRF/RA/GIS Analyst) + Odia',
      age_limit: '21–35 / 40 yrs as per Project Guidelines',
      pay_level: '₹31,000 – ₹67,000+ (JRF/SRF/GIS/Software Specialist)',
      vacancies: 'GIS Analyst, Software Developer, Project Fellow & JRF/SRF Posts',
      apply_url: 'https://orsac.gov.in',
      summary: 'Technical project staff positions at Odisha Space Applications Centre (ORSAC), OCAC, OUAT Bhubaneswar, State Council on Science & Technology, and central-state R&D institutes in Odisha.',
      summary_or: 'ORSAC, OCAC, OUAT ଭୁବନେଶ୍ୱର ଓ ରାଜ୍ୟ ଗବେଷଣା ପ୍ରତିଷ୍ଠାନରେ GIS ଆନାଲିଷ୍ଟ, ସଫ୍ଟୱେର ଡେଭଲପର ଓ ପ୍ରୋଜେକ୍ଟ ଫେଲୋ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Academic & Technical Shortlist', 'GATE/NET Score OR Coding/GIS Practical Test', 'Institute Selection Panel'],
        ['Walk-in / Online Interview', 'Research & Domain Technical Assessment', 'Project Duration (1–5 Years)']
      ],
      relaxationTable: ODISHA_RELAXATION('21–35 / 40 Years'),
      payProgression: ORSP_L9_TO_L14,
      referenceLinks: refs([
        { href: 'https://orsac.gov.in', title: '🛰️ ORSAC Odisha Portal', desc: 'Remote Sensing & GIS Project Careers' }
      ])
    },
    'fixed-term-contractual-posts': {
      l2Code: '1.2.12',
      title: 'Fixed-Term Contractual Posts — Guest Faculty, Medical Consultants & Retd Re-Engagement',
      title_or: 'ନିର୍ଦ୍ଦିଷ୍ଟ ଅବଧି ଚୁକ୍ତିଭିତ୍ତିକ ପଦବୀ — ଗେଷ୍ଟ ଫ୍ୟାକଲ୍ଟି ଓ ମେଡିକାଲ କନସଲ୍ଟାଣ୍ଟ',
      organisation: 'Higher Education / Health / Skill Dev (ITI/Polytechnic) Odisha',
      qualification: "Master's Degree / B.Tech / MBBS / Diploma (Post-specific) + Odia",
      age_limit: '21–45 yrs (Up to 65 yrs for Retired Govt Re-engagement)',
      pay_level: '₹500–₹1,500/Class (Guest Faculty) · ₹40,000–₹1,20,000/mo (Consultants)',
      vacancies: 'Govt +2/Degree Guest Faculty, ITI/Polytechnic Part-Time & OSD Posts',
      apply_url: 'https://dhe.odisha.gov.in',
      summary: 'Fixed-term academic and specialist engagements in Odisha Government Degree Colleges, Higher Secondary Schools, Govt ITIs/Polytechnics, and State Secretariat Consultant panels.',
      summary_or: 'ସରକାରୀ +୨/ଡିଗ୍ରୀ କଲେଜ, ITI/ପଲିଟେକ୍ନିକ୍‌ରେ ଗେଷ୍ଟ ଫ୍ୟାକଲ୍ଟି ଏବଂ ବିଭାଗୀୟ କନସଲ୍ଟାଣ୍ଟ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Career Score / Walk-in', 'Academic Percentage + Teaching/Domain Experience', 'College / Directorate Committee'],
        ['Demo Lecture / Interview', 'Subject Presentation & Verification', 'Annual Academic Session Tenure']
      ],
      relaxationTable: ODISHA_RELAXATION('21–45 / 65 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://dhe.odisha.gov.in', title: '🎓 DHE Odisha Guest Faculty', desc: 'College & University Academic Notices' }
      ])
    },
    'outsourced-positions': {
      l2Code: '1.2.12',
      title: 'Odisha Govt Outsourced & Service-Provider Posts (DEO, Driver, Security, Housekeeping)',
      title_or: 'ଓଡ଼ିଶା ସରକାରୀ ଆଉଟସୋର୍ସିଂ ପଦବୀ (DEO, ଡ୍ରାଇଭର, ସୁରକ୍ଷା କର୍ମୀ)',
      organisation: 'OCAC Empanelled Agencies / Finance Dept Odisha GeM Manpower',
      qualification: '8th/10th (Attendant/Security) · +2/Grad + PGDCA (Data Entry Operator) + Odia',
      age_limit: '18–40 yrs as per Odisha Finance Dept Outsourcing Norms',
      pay_level: 'Minimum Wages + EPF + ESI (₹13,500 – ₹24,000/mo as per Skilled/Highly Skilled slab)',
      vacancies: 'Secretariat, Collectorate, Hospital & University Outsourced Support Staff',
      apply_url: 'https://finance.odisha.gov.in',
      summary: 'Manpower engagements through GeM / Odisha Finance Department empanelled agencies for Data Entry Operators (DEO), Drivers, Hospital Attendants, and Watch-and-Ward staff with mandatory EPF & ESI protection.',
      summary_or: 'GeM ଓ ଅର୍ଥ ବିଭାଗ ପ୍ୟାନେଲ ଏଜେନ୍ସି ମାଧ୍ୟମରେ DEO, ଡ୍ରାଇଭର, ହସ୍ପିଟାଲ ସହାୟକ ଓ ସୁରକ୍ଷା କର୍ମୀ ନିଯୁକ୍ତି (EPF ଓ ESI ସହ)।',
      examPatternTable: [
        ['Agency Screening & Skill Test', 'Typing Test (30–35 wpm for DEO) / Driving Licence Check', 'Verify Empanelled Agency Authenticity'],
        ['EPF / ESI Compliance', 'Check UAN & ESIC Registration — Zero Bribe / Deposit Rule', 'Odisha Labour Minimum Wage Act']
      ],
      relaxationTable: ODISHA_RELAXATION('18–40 Years', 'Zero Fee — Never Pay Agents/Middlemen'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://finance.odisha.gov.in', title: '📜 Finance Dept Outsourcing Rules', desc: 'Official Remuneration & EPF Guidelines' }
      ])
    },
    'temporary-and-seasonal-recruitment': {
      l2Code: '1.2.12',
      title: 'Temporary & Seasonal Odisha Recruitment — Paddy Procurement DEO, Fire Watchers & Census',
      title_or: 'ସାମୟିକ ଓ ଋତୁକାଳୀନ ନିଯୁକ୍ତି — ଧାନ ସଂଗ୍ରହ DEO, ଫାୟାର ୱାଚର ଓ ଜନଗଣନା',
      organisation: 'OSCSC / Forest Dept / Revenue & Census Operations Odisha',
      qualification: '10th / +2 + PGDCA (Paddy Procurement DEO) + Odia Fluency',
      age_limit: '18–40 yrs as on cutoff date',
      pay_level: 'Daily Wage / Seasonal Consolidated ₹12,000 – ₹22,000/mo',
      vacancies: 'Kharif/Rabi Mandi DEO, Forest Fire Squads & Election/Survey Enumerators',
      apply_url: 'https://foododisha.in',
      summary: 'Seasonal engagements during Odisha Kharif/Rabi Paddy Procurement (PACS/LAMPCS DEOs), Summer Forest Fire Watchers, Rath Yatra/Festival Medical & Volunteer deployments, and Census/Socio-Economic Surveys.',
      summary_or: 'ଖରିଫ/ରବି ଧାନ ସଂଗ୍ରହ (PACS/LAMPCS DEO), ଗ୍ରୀଷ୍ମକାଳୀନ ଜଙ୍ଗଲ ନିଆଁ ନିରାକରଣ ସ୍କ୍ୱାଡ୍ ଏବଂ ଜନଗଣନା/ସର୍ଭେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['District / PACS Screening', 'Local Block Residence + Basic Computer / Field Readiness', 'Collectorate / DFO Approval'],
        ['Seasonal Deployment', '3–6 Months Kharif/Rabi or Summer Fire Season', 'Direct Bank Account DBT Payment']
      ],
      relaxationTable: ODISHA_RELAXATION('18–40 Years'),
      payProgression: ORSP_L4_TO_L9,
      referenceLinks: refs([
        { href: 'https://foododisha.in', title: '🌾 Food Supplies & CW Dept Odisha', desc: 'Paddy Procurement & PACS Notices' }
      ])
    }
  };

  root.CSO_ODISHA_JOBS_1_2 = BRANCHES;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BRANCHES;
  }
})(typeof window !== 'undefined' ? window : globalThis);
