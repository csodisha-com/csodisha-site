(function (root) {
  'use strict';

  var STANDARD_RELAXATION = function (baseAge, feeGen, attemptsNote) {
    return [
      ['General / EWS', baseAge, (attemptsNote || 'No attempt cap') + ' · Fee ' + (feeGen || '₹100')],
      ['OBC (Non-Creamy Layer)', '+3 Years Relaxation', (attemptsNote ? 'Relaxed per Gazette' : 'No attempt cap') + ' · Fee ' + (feeGen || '₹100')],
      ['SC / ST', '+5 Years Relaxation', '₹0 Fee Exempted (100% Waiver)'],
      ['Female / PwBD', 'PwBD +10/+13/+15 Years', '₹0 Fee Exempted (Govt of India)'],
      ['Ex-Servicemen (ESM)', 'Service Period + 3 Years', '₹0 Fee Exempted (Group C/D & Gazetted rules)']
    ];
  };

  var PAY_L1_TO_L6 = [
    { label: 'Level-1 (₹18,000)', pay: 18000 },
    { label: 'Level-2 (₹19,900)', pay: 19900 },
    { label: 'Level-4 (₹25,500)', pay: 25500 },
    { label: 'Level-5 (₹29,200)', pay: 29200 },
    { label: 'Level-6 (₹35,400)', pay: 35400 }
  ];

  var PAY_L4_TO_L10 = [
    { label: 'Level-4 (₹25,500)', pay: 25500 },
    { label: 'Level-6 (₹35,400)', pay: 35400 },
    { label: 'Level-7 (₹44,900)', pay: 44900 },
    { label: 'Level-8 (₹47,600)', pay: 47600 },
    { label: 'Level-10 (₹56,100)', pay: 56100 }
  ];

  var PAY_L10_TO_L18 = [
    { label: 'Level-10 (Entry)', pay: 56100 },
    { label: 'Level-12 (JAG)', pay: 78800 },
    { label: 'Level-14 (Super Time)', pay: 144200 },
    { label: 'Level-17 (Apex Scale)', pay: 225000 },
    { label: 'Level-18 (Cab. Secy)', pay: 250000 }
  ];

  var CSO_TOOLS_REFS = [
    { href: '/tools/#age-calculator', title: '🎂 CSO Age Eligibility Calculator', desc: 'Check cut-off age & OBC/SC/ST/PwBD relaxation' },
    { href: '/tools/#photo-resizer', title: '📸 Photo & Signature Resizer', desc: 'Format 20–50 KB JPG for UPSC / SSC / RRB OTR' },
    { href: '/mock-tests/', title: '🧪 CSO National & Odisha Mock Tests', desc: 'Timed CBT practice for SSC, RRB, Banking & UPSC' },
    { href: '/study-library/', title: '📚 CSO Study Library & PYQs', desc: 'Solved PYQs, Current Affairs & Odia Glossary' }
  ];

  function refs(portalList) {
    return portalList.concat(CSO_TOOLS_REFS);
  }

  var CAPF_PHYSICAL = [
    ['Height (Gen / OBC / SC)', '170 cm (165 cm ST)', '157 cm (150 cm ST)'],
    ['Chest (Unexpanded / Expanded)', '80 cm / 85 cm (+5 cm)', 'Not Applicable'],
    ['Running (PET)', '5 km in 24 Minutes (GD) / 1.6 km 6.5m (SI)', '1.6 km in 8.5 Minutes'],
    ['Vision & Medical', '6/6 & 6/9 Distant, No Knock-Knee / Flat Foot', '6/6 & 6/9 Distant, Standard Medical']
  ];

  var DEFENCE_PHYSICAL = [
    ['Height (Minimum)', '157.5 cm – 169 cm (Trade/Region wise)', '152 cm (148 cm NE/Tribal)'],
    ['Running (1.6 km)', '5 Min 30 Sec (Group I) / 5 Min 45 Sec (Group II)', '7 Min 30 Sec – 8 Min'],
    ['Push-ups / Sit-ups / Beam', '10 Pull-ups, 9 ft Ditch, Zig-Zag Balance', 'Long Jump 10 ft, High Jump 3 ft'],
    ['Medical & Vision', '6/6 Distant, Color Vision CP-II/III', 'Standard Armed Forces Medical Board']
  ];

  // Shared 1.1.1 UPSC CSE spec
  var UPSC_EXAM_TABLE = [
    ['Stage 1: Prelims — GS Paper-I', '100 Objective MCQs · 2 Hours · Merit Ranking', '200 Marks (-0.66 / 1/3rd negative)'],
    ['Stage 1: Prelims — CSAT Paper-II', '80 Objective MCQs · 2 Hours · Qualifying (33%)', '200 Marks (66 Marks to Qualify)'],
    ['Stage 2: Mains — Paper-A (Indian Language)', '8th Schedule Language incl. Odia (Qualifying 25%)', '300 Marks (Qualifying)'],
    ['Stage 2: Mains — Paper-B (English)', 'Conventional Comprehension & Precis (Qualifying 25%)', '300 Marks (Qualifying)'],
    ['Stage 2: Mains — Essay + GS-I, GS-II, GS-III, GS-IV', '5 Merit Papers × 250 Marks (Conventional)', '1,250 Marks (Merit)'],
    ['Stage 2: Mains — Optional Paper-I & Paper-II', '2 Merit Papers × 250 Marks (incl. Odia Literature)', '500 Marks (Merit · Mains Total 1,750)'],
    ['Stage 3: Personality Test (Interview)', 'UPSC Board at Dholpur House, New Delhi', '275 Marks (Grand Total: 2,025 Marks)']
  ];

  var UPSC_RELAXATION = [
    ['General / EWS', '21–32 Years (as on 1st August)', '6 Attempts · Fee ₹100 (Female ₹0)'],
    ['OBC (Non-Creamy Layer)', '21–35 Years (+3 Yrs)', '9 Attempts · Fee ₹100 (Female ₹0)'],
    ['SC / ST', '21–37 Years (+5 Yrs)', 'Unlimited (up to 37 Yrs) · Fee ₹0'],
    ['Defence / Ex-Servicemen', '21–35 / 37 Years (+3 to +5 Yrs)', 'Category + Defence Relaxation'],
    ['PwBD (Benchmark Disability)', '21–42 / 47 Years (+10 Yrs)', '9 (Gen/OBC/EWS) · Unlimited (SC/ST) · Fee ₹0']
  ];

  var SSC_CGL_TABLE = [
    ['Tier-I (Qualifying CBT)', 'General Intelligence, GA, Quant, English (100 Qs · 60 Min)', '200 Marks (-0.50 negative)'],
    ['Tier-II Paper-I Session-I', 'Math (30 Qs) + Reasoning (30 Qs) + English (45 Qs) + GA (25 Qs)', '390 Marks (-1.00 negative · Merit)'],
    ['Tier-II Computer & DEST', 'Computer Knowledge (20 Qs, 60 Marks) + 15 Min Typing (2000 KDPH)', 'Qualifying (Mandatory)'],
    ['Tier-II Paper-II (JSO)', 'Statistics (100 Qs · 2 Hours · for JSO posts)', '200 Marks (-0.50 negative)']
  ];

  var BANK_PO_TABLE = [
    ['Prelims (Objective CBT)', 'English (30 Qs) + Quant (35 Qs) + Reasoning (35 Qs) · 60 Min', '100 Marks (-0.25 negative)'],
    ['Mains (Objective + Descriptive)', 'Reasoning & Computer, Data Analysis, GA/Banking, English + Letter/Essay', '200 + 25 = 225 Marks (-0.25 negative)'],
    ['Phase-III: Interview / GD', 'Panel Interview (100 Marks · 80:20 Mains:Interview Ratio)', '100 Marks (Final Merit)']
  ];

  var RRB_NTPC_TABLE = [
    ['CBT-1 (Screening)', 'GA (40 Qs) + Mathematics (30 Qs) + Reasoning (30 Qs) · 90 Min', '100 Marks (-1/3rd negative)'],
    ['CBT-2 (Merit)', 'GA (50 Qs) + Mathematics (35 Qs) + Reasoning (35 Qs) · 90 Min', '120 Marks (-1/3rd negative)'],
    ['CBAT / Typing Skill Test', 'Psycho Test (Station Master) or 30 WPM EN / 25 WPM HI Typing', 'Qualifying / 30% CBAT Weightage']
  ];

  // Explicit specifications for all 71 branches across 1.1.1 - 1.1.12
  var BRANCHES = {
    // --- 1.1.1 Civil Services and Administration (4) ---
    'upsc-civil-services-examination': {
      organisation: 'Union Public Service Commission (UPSC)',
      qualification: "Bachelor's Degree in any discipline (Final-year candidates eligible for Prelims)",
      age_limit: '21–32 Years (Gen/EWS 6 attempts · OBC 35 / 9 · SC/ST 37 / Unlimited · PwBD 42–47)',
      pay_level: '7th CPC Level-10 (₹56,100) to Cabinet Secretary Level-18 (₹2,50,000)',
      vacancies: 1056,
      apply_url: 'https://upsconline.nic.in',
      summary: 'UPSC Civil Services Examination (CSE) recruits into 21 All-India, Central Group A & UT Group B Services (IAS, IFS, IPS, IA&AS, IRS, IRMS, DANICS). Odisha exam centres: Cuttack, Sambalpur, and Berhampur (Prelims) with Cuttack Mains centre.',
      summary_or: 'UPSC ସିଭିଲ୍ ସର୍ଭିସେସ୍ ପରୀକ୍ଷା (CSE) ମାଧ୍ୟମରେ IAS, IFS, IPS ସମେତ ୨୧ଟି ସର୍ବଭାରତୀୟ ଓ କେନ୍ଦ୍ରୀୟ ସେବାରେ ନିଯୁକ୍ତି। ଓଡ଼ିଶାରେ କଟକ, ସମ୍ବଲପୁର ଓ ବ୍ରହ୍ମପୁର ପରୀକ୍ଷା କେନ୍ଦ୍ର।',
      examPatternTable: UPSC_EXAM_TABLE,
      relaxationTable: UPSC_RELAXATION,
      physicalStandards: [['IPS / DANIPS / IRPFS Height', '165 cm Male (160 cm ST)', '150 cm Female (145 cm ST)'], ['Chest & Vision', '84 cm + 5 cm exp. · 6/6 or 6/9', 'Standard IPS Medical Board']],
      payProgression: PAY_L10_TO_L18,
      marksChart: [{ label: 'Prelims (GS+CSAT)', count: 400 }, { label: 'Mains Merit', count: 1750 }, { label: 'Interview', count: 275 }, { label: 'Grand Total', count: 2025 }],
      referenceLinks: refs([
        { href: 'https://upsc.gov.in', title: '🏛️ UPSC Official Portal (upsc.gov.in)', desc: 'Notifications, Calendar & Final Merit Lists' },
        { href: 'https://upsconline.nic.in', title: '📝 UPSC Online OTR (upsconline.nic.in)', desc: 'OTR, Prelims/Mains DAF & e-Admit Cards' },
        { href: 'https://dopt.gov.in', title: '⚖️ DoPT Cadre Rules (dopt.gov.in)', desc: 'Service Allocation & 7th CPC Rules' }
      ])
    },
    'ias-ips-indian-foreign-service-and-other-group-a-services': {
      organisation: 'Union Public Service Commission (UPSC) / DoPT',
      qualification: "Bachelor's Degree in any discipline; Indian Citizenship mandatory for IAS, IFS & IPS",
      age_limit: '21–32 Years (Gen/EWS) · 35 (OBC) · 37 (SC/ST) · 42 (PwBD)',
      pay_level: '7th CPC Level-10 (₹56,100 – ₹1,77,500) to Apex Level-17/18 (₹2,25,000–₹2,50,000)',
      vacancies: 900,
      apply_url: 'https://upsc.gov.in',
      summary: 'Covers the 3 All-India Services (IAS, IPS, IFoS) and 14 Central Group-A Services (IFS, IRS IT/C&IT, IA&AS, ICAS, ICLS, IDAS, IDES, IIS, IPoS, IP&TAFS, IRPFS, ITS, IRMS) allocated via UPSC CSE merit & LBSNAA/SVPNPA/FSI training.',
      summary_or: 'IAS, IPS, ଭାରତୀୟ ବୈଦେଶିକ ସେବା (IFS) ଏବଂ ଅନ୍ୟାନ୍ୟ ଗ୍ରୁପ୍-A କେନ୍ଦ୍ରୀୟ ସେବାଗୁଡ଼ିକର କ୍ୟାଡର ଓ ଦରମା ବିବରଣୀ।',
      examPatternTable: UPSC_EXAM_TABLE,
      relaxationTable: UPSC_RELAXATION,
      physicalStandards: [['IPS / IRPFS Height', '165 cm Male (160 cm ST)', '150 cm Female (145 cm ST)']],
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([
        { href: 'https://upsc.gov.in', title: '🏛️ UPSC Official Portal', desc: 'CSE Gazette & Service Rules' },
        { href: 'https://dopt.gov.in', title: '⚖️ DoPT Service Allocation', desc: 'IAS/Group-A Cadre & Training Rules' }
      ])
    },
    'central-secretariat-and-administrative-services': {
      organisation: 'UPSC / DoPT / Staff Selection Commission (SSC)',
      qualification: "Bachelor's Degree (CSS Section Officer via UPSC/LDCE; ASO via SSC CGL; AFHQCS/DANICS via UPSC CSE)",
      age_limit: '20–30 Years (SSC CGL ASO) · 21–32 Years (UPSC AFHQCS / DANICS)',
      pay_level: '7th CPC Level-7 (₹44,900 ASO) to Level-10/13 (Section Officer / Under Secretary)',
      vacancies: 1200,
      apply_url: 'https://dopt.gov.in',
      summary: 'Central Secretariat Service (CSS), Central Secretariat Stenographers Service (CSSS), AFHQCS, DANICS, and PONDICS administrative cadres posted in New Delhi Ministries and Union Territories.',
      summary_or: 'କେନ୍ଦ୍ରୀୟ ସଚିବାଳୟ ସେବା (CSS), ASO, AFHQCS ଏବଂ DANICS ପ୍ରଶାସନିକ ପଦବୀ ନିଯୁକ୍ତି ବିବରଣୀ।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('20–30 / 21–32 Years', '₹100'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://dopt.gov.in', title: '⚖️ DoPT CSS Division', desc: 'Central Secretariat Service Rules' },
        { href: 'https://ssc.gov.in', title: '📝 SSC Official Portal', desc: 'CSS ASO & Stenographer Exams' }
      ])
    },
    'central-government-administrative-and-executive-posts': {
      organisation: 'UPSC / SSC / Central Ministries',
      qualification: "Bachelor's Degree (Group-A/B Executive) or 10+2 (Group-C Ministerial)",
      age_limit: '18–30 Years (SSC) · 21–32 Years (UPSC Group A/B)',
      pay_level: '7th CPC Level-4 (₹25,500) to Level-10 (₹56,100)',
      vacancies: 2500,
      apply_url: 'https://upsconline.nic.in',
      summary: 'Cross-ministry administrative, enforcement, and executive officer posts including Enforcement Officer (ED/EPFO), Income Tax/GST Inspector, and Central Administrative Tribunal executive cadres.',
      summary_or: 'କେନ୍ଦ୍ର ସରକାରଙ୍କ ବିଭିନ୍ନ ମନ୍ତ୍ରଣାଳୟରେ ପ୍ରଶାସନିକ ଓ କାର୍ଯ୍ୟନିର୍ବାହୀ (Executive) ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–30 / 21–32 Years', '₹100'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://upsc.gov.in', title: '🏛️ UPSC Portal', desc: 'Executive & EPFO Recruitment' },
        { href: 'https://ssc.gov.in', title: '📝 SSC Portal', desc: 'Central Executive Posts' }
      ])
    },

    // --- 1.1.2 Staff Selection Commission (SSC) (7) ---
    'ssc-cgl': {
      organisation: 'Staff Selection Commission (SSC Eastern Region)',
      qualification: "Bachelor's Degree in any discipline (Statistics/Commerce for JSO/AAO)",
      age_limit: '18–30 / 32 Years (Post-wise; OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-4 (₹25,500) to Level-8 (₹47,600 – ₹1,51,100)',
      vacancies: 17727,
      apply_url: 'https://ssc.gov.in',
      summary: 'SSC Combined Graduate Level (CGL) recruits Group-B & Group-C officers (ASO in CSS/MEA, Income Tax Inspector, GST Inspector, CBI/NIA SI, CAG Auditor). Odisha CBT centres: Bhubaneswar, Cuttack, Berhampur, Rourkela, Sambalpur.',
      summary_or: 'SSC CGL ପରୀକ୍ଷା ମାଧ୍ୟମରେ କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟ ASO, ଆୟକର ଓ GST ଇନ୍ସପେକ୍ଟର ନିଯୁକ୍ତି। ଓଡ଼ିଶାର ୫ଟି ସହରରେ CBT ପରୀକ୍ଷା କେନ୍ଦ୍ର।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–30 / 32 Years', '₹100'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://ssc.gov.in', title: '📝 SSC Official Portal (ssc.gov.in)', desc: 'OTR, CGL Notification & Admit Cards' },
        { href: 'https://www.sscer.org', title: '📍 SSC Eastern Region (sscer.org)', desc: 'Odisha Exam Centre Status & DV Schedules' }
      ])
    },
    'ssc-chsl': {
      organisation: 'Staff Selection Commission (SSC ER)',
      qualification: '12th Standard (+2) Pass from recognized Board (CHSE / CBSE / ICSE)',
      age_limit: '18–27 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-2 (₹19,900 LDC/JSA) & Level-4/5 (₹25,500–₹29,200 DEO)',
      vacancies: 3712,
      apply_url: 'https://ssc.gov.in',
      summary: 'SSC Combined Higher Secondary Level (10+2) for Lower Division Clerk (LDC), Junior Secretariat Assistant (JSA), and Data Entry Operator (DEO) across Central Ministries with Odisha CBT centres.',
      summary_or: '+୨ ପାସ୍ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ SSC CHSL (LDC, JSA, DEO) କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Tier-I (Qualifying CBT)', 'English, General Intelligence, Quant, GA (100 Qs · 60 Min)', '200 Marks (-0.50 negative)'],
        ['Tier-II Session-I', 'Math (30 Qs) + Reasoning (30 Qs) + English (40 Qs) + GA (20 Qs)', '360 Marks (-1.00 negative · Merit)'],
        ['Tier-II Skill / Typing Test', 'Computer (15 Qs) + Typing 35 WPM EN / DEO 8000 KDPH', 'Qualifying (Mandatory)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–27 Years', '₹100'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC Official Portal', desc: 'CHSL Notification & Typing Rules' }])
    },
    'ssc-mts-and-havaldar': {
      organisation: 'Staff Selection Commission (SSC ER)',
      qualification: 'Matriculation (10th Pass) from recognized Board (BSE Odisha / CBSE)',
      age_limit: '18–25 / 27 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-1 (₹18,000 – ₹56,900)',
      vacancies: 9583,
      apply_url: 'https://ssc.gov.in',
      summary: 'Multi-Tasking (Non-Technical) Staff in Central Offices and Havaldar in CBIC & CBN. Single-day CBT (Session-I Qualifying, Session-II GA & English Merit) available in Odia language.',
      summary_or: 'ଦଶମ ପାସ୍ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ SSC MTS ଓ ହାବିଲଦାର ନିଯୁକ୍ତି (ଓଡ଼ିଆ ଭାଷାରେ CBT ପରୀକ୍ଷା ସୁବିଧା)।',
      examPatternTable: [
        ['Session-I (Qualifying, 45 Min)', 'Numerical Ability (20 Qs) + Reasoning (20 Qs) · No Negative Marking', '120 Marks (Qualifying 30%/25%)'],
        ['Session-II (Merit, 45 Min)', 'General Awareness (25 Qs) + English (25 Qs) · -1 Negative Marking', '150 Marks (Final Merit)'],
        ['PET/PST (Havaldar Only)', 'Walking: 1600m in 15 min (M) / 1 km in 20 min (F); Height 157.5/152 cm', 'Qualifying']
      ],
      relaxationTable: STANDARD_RELAXATION('18–25 / 27 Years', '₹100'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC MTS & Havaldar Portal', desc: '10th Pass Regional Language CBT' }])
    },
    'ssc-cpo': {
      organisation: 'Staff Selection Commission (SSC ER)',
      qualification: "Bachelor's Degree in any discipline (+ Valid LMV Driving Licence for Delhi Police SI)",
      age_limit: '20–25 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-6 (₹35,400 – ₹1,12,400)',
      vacancies: 4187,
      apply_url: 'https://ssc.gov.in',
      summary: 'Sub-Inspector (SI) in Delhi Police and Central Armed Police Forces (BSF, CISF, CRPF, ITBP, SSB) — Group-B Non-Gazetted uniformed officer cadre.',
      summary_or: 'ଦିଲ୍ଲୀ ପୋଲିସ ଏବଂ CAPF (BSF, CRPF, CISF, ITBP, SSB) ରେ ସବ୍-ଇନ୍ସପେକ୍ଟର (SI) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Paper-I (CBT · 2 Hours)', 'Reasoning, GA, Quant, English (50 Qs each = 200 Qs)', '200 Marks (-0.25 negative)'],
        ['PET / PST (Qualifying)', '100m (16s M / 18s F), 1.6 km (6.5m M), 800m (4m F), Long/High Jump', 'Qualifying'],
        ['Paper-II (CBT · 2 Hours)', 'English Language & Comprehension (200 Qs)', '200 Marks (-0.25 negative · Total 400)']
      ],
      relaxationTable: STANDARD_RELAXATION('20–25 Years', '₹100'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC CPO SI Portal', desc: 'Paper-I/II & PET Norms' }])
    },
    'ssc-gd-constable': {
      organisation: 'Staff Selection Commission (SSC ER)',
      qualification: '10th Pass (Matriculation) from recognized Board',
      age_limit: '18–23 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-3 (₹21,700 – ₹69,100)',
      vacancies: 39481,
      apply_url: 'https://ssc.gov.in',
      summary: 'Constable (General Duty) in BSF, CISF, CRPF, SSB, ITBP, AR, SSF, and NCB. CBT available in 13 regional languages including Odia, with Odisha state-wise vacancy quota.',
      summary_or: 'BSF, CRPF, CISF, ITBP ଓ SSB ରେ କନେଷ୍ଟବଳ (GD) ନିଯୁକ୍ତି — ଓଡ଼ିଆ ଭାଷାରେ CBT ପରୀକ୍ଷା।',
      examPatternTable: [
        ['CBT Exam (60 Minutes)', 'Reasoning (20 Qs), GK/GA (20 Qs), Math (20 Qs), EN/HI (20 Qs)', '160 Marks (-0.25 negative)'],
        ['PET / PST & Medical', '5 km in 24 min (Male) / 1.6 km in 8.5 min (Female) · Height 170/157 cm', 'Qualifying + DME']
      ],
      relaxationTable: STANDARD_RELAXATION('18–23 Years', '₹100'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC GD Constable Portal', desc: 'Odia CBT & State-Wise Quota' }])
    },
    'ssc-selection-post': {
      organisation: 'Staff Selection Commission (SSC ER)',
      qualification: '10th / 12th / Graduate / Diploma (Post-specific Matric, HS, or Graduation level)',
      age_limit: '18–25 / 27 / 30 Years (Post-specific + Category Relaxations)',
      pay_level: '7th CPC Level-1 (₹18,000) to Level-7 (₹44,900)',
      vacancies: 2049,
      apply_url: 'https://ssc.gov.in',
      summary: 'Phase-wise specialist recruitment across Central Ministries, Botanical/Zoological Survey, Meteorological Dept, and Regional Offices (including SSC Eastern Region).',
      summary_or: 'କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟର ବିଭିନ୍ନ ବୈଷୟିକ ଓ ପ୍ରଶାସନିକ ପଦବୀ ପାଇଁ SSC ସିଲେକ୍ସନ୍ ପୋଷ୍ଟ ପରୀକ୍ଷା।',
      examPatternTable: [
        ['Single CBT (60 Minutes)', 'General Intelligence (25), GA (25), Quant (25), English (25)', '200 Marks (-0.50 negative)'],
        ['Skill / Trade Test', 'Typing / Stenography / Laboratory Test (where applicable)', 'Qualifying + Document Scrutiny']
      ],
      relaxationTable: STANDARD_RELAXATION('18–30 Years', '₹100'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC Selection Post Portal', desc: 'Phase Notifications & Scrutiny' }])
    },
    'stenographer-and-other-ssc-examinations': {
      organisation: 'Staff Selection Commission (SSC ER)',
      qualification: '12th Pass (+2) + Stenography Speed (100 WPM Grade C / 80 WPM Grade D)',
      age_limit: '18–27 Years (Grade D) · 18–30 Years (Grade C)',
      pay_level: '7th CPC Level-4 (₹25,500 Grade D) & Level-6/7 (₹35,400–₹44,900 Grade C)',
      vacancies: 2006,
      apply_url: 'https://ssc.gov.in',
      summary: 'SSC Stenographer Grade C & D, Junior Hindi Translator (JHT), and SSC JE (Civil/Electrical/Mechanical) examinations for Central Government departments.',
      summary_or: 'SSC ଷ୍ଟେନୋଗ୍ରାଫର୍ ଗ୍ରେଡ୍ C/D, ଜୁନିଅର ହିନ୍ଦୀ ଟ୍ରାନ୍ସଲେଟର୍ ଏବଂ SSC JE ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT (2 Hours)', 'General Intelligence (50), GA (50), English Language & Comp (100)', '200 Marks (-0.25 negative)'],
        ['Stenography Skill Test', '10-Min Dictation @ 100 WPM (Gr C) / 80 WPM (Gr D) + Transcription', 'Qualifying (Mandatory)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–30 Years', '₹100'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC Stenographer & JE Portal', desc: 'Skill Test & Transcription Norms' }])
    },

    // --- 1.1.3 Banking, Finance and Insurance (6) ---
    'ibps-po-clerk-and-specialist-officer': {
      organisation: 'Institute of Banking Personnel Selection (IBPS)',
      qualification: "Bachelor's Degree in any discipline + Proficiency in Odisha State Official Language (Odia) for Clerk/RRB",
      age_limit: '20–30 Years (PO/SO) · 20–28 Years (Clerk/CSA) · 18–40 Years (RRB Officer)',
      pay_level: '12th Bipartite Settlement: ₹48,480 Basic (PO Scale-I) · ₹24,050 Basic (Clerk)',
      vacancies: 10000,
      apply_url: 'https://www.ibps.in',
      summary: 'Common Recruitment Process (CRP) for Probationary Officers (PO/MT), Customer Service Associates (Clerk), Specialist Officers (IT, Law, Agri), and Regional Rural Banks (Odisha Gramya Bank / Utkal Grameen Bank).',
      summary_or: 'IBPS PO, କ୍ଲର୍କ, ସ୍ପେଶାଲିଷ୍ଟ ଅଫିସର୍ ଏବଂ ଓଡ଼ିଶା ଗ୍ରାମ୍ୟ ବ୍ୟାଙ୍କ (RRB) ନିଯୁକ୍ତି ପରୀକ୍ଷା।',
      examPatternTable: BANK_PO_TABLE,
      relaxationTable: STANDARD_RELAXATION('20–30 Years', '₹850 (SC/ST/PwBD ₹175)'),
      payProgression: [{ label: 'Clerk Entry', pay: 24050 }, { label: 'PO Scale-I', pay: 48480 }, { label: 'Manager Scale-II', pay: 64820 }, { label: 'Sr Mgr Scale-III', pay: 85920 }],
      referenceLinks: refs([{ href: 'https://www.ibps.in', title: '🏦 IBPS Official Portal (ibps.in)', desc: 'CRP PO, Clerk, SO & RRB Notifications' }])
    },
    'sbi-recruitment': {
      organisation: 'State Bank of India (Central Recruitment & Promotion Dept)',
      qualification: "Bachelor's Degree in any discipline + Ability to read, write & speak Odia (for Odisha Circle)",
      age_limit: '21–30 Years (SBI PO) · 20–28 Years (SBI Junior Associate / Clerk)',
      pay_level: 'SBI PO Entry Basic ₹48,480 (4 advance increments) · JA Basic ₹24,050 + Allowances',
      vacancies: 14000,
      apply_url: 'https://sbi.co.in/careers',
      summary: 'Direct recruitment for SBI Probationary Officers (PO), Junior Associates (Customer Support & Sales — Bhubaneswar Circle), and Circle Based Officers (CBO) with Odisha state language test (LPT).',
      summary_or: 'ଷ୍ଟେଟ୍ ବ୍ୟାଙ୍କ ଅଫ୍ ଇଣ୍ଡିଆ (SBI) PO, କ୍ଲର୍କ (ଭୁବନେଶ୍ୱର ସର୍କଲ) ଓ CBO ନିଯୁକ୍ତି।',
      examPatternTable: BANK_PO_TABLE,
      relaxationTable: STANDARD_RELAXATION('21–30 Years', '₹750 (SC/ST/PwBD ₹0)'),
      payProgression: [{ label: 'SBI Clerk', pay: 26730 }, { label: 'SBI PO Entry', pay: 56480 }, { label: 'Scale-II', pay: 64820 }, { label: 'Scale-IV', pay: 102300 }],
      referenceLinks: refs([{ href: 'https://sbi.co.in/careers', title: '🏦 SBI Careers Portal (sbi.co.in/careers)', desc: 'Bhubaneswar Circle PO/Clerk Notices' }])
    },
    'rbi-recruitment': {
      organisation: 'Reserve Bank of India Services Board (RBISB)',
      qualification: "Bachelor's Degree with 60% (50% SC/ST/PwBD) for Grade B; Bachelor's Degree (50%) for Assistant",
      age_limit: '21–30 Years (Grade B) · 20–28 Years (Assistant) · Max 6 Attempts (Gen)',
      pay_level: 'RBI Grade B Basic ₹55,200 (Gross ~₹1.25 Lakh/mo) · Assistant Basic ₹20,700',
      vacancies: 550,
      apply_url: 'https://opportunities.rbi.org.in',
      summary: 'Reserve Bank of India Officer Grade B (General / DEPR / DSIM) and RBI Assistant recruitment (with RBI Bhubaneswar Regional Office vacancies and Odia Language Proficiency Test).',
      summary_or: 'ଭାରତୀୟ ରିଜର୍ଭ ବ୍ୟାଙ୍କ (RBI) ଗ୍ରେଡ୍-B ଅଫିସର୍ ଓ ଆସିଷ୍ଟାଣ୍ଟ (ଭୁବନେଶ୍ୱର କାର୍ଯ୍ୟାଳୟ) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Grade B Phase-I (CBT)', 'GA (80), Reasoning (60), English (30), Quant (30) · 120 Min', '200 Marks (-0.25 negative)'],
        ['Grade B Phase-II (3 Papers)', 'Economic & Social Issues (100), English Writing (100), Finance & Mgmt (100)', '300 Marks (Obj + Desc)'],
        ['Phase-III: Interview', 'RBI Services Board Interview', '75 Marks (Total 375)']
      ],
      relaxationTable: STANDARD_RELAXATION('21–30 Years', '₹850 (SC/ST/PwBD ₹100)'),
      payProgression: [{ label: 'Assistant', pay: 20700 }, { label: 'Grade B Entry', pay: 55200 }, { label: 'Grade C (AGM)', pay: 79600 }, { label: 'Grade D (DGM)', pay: 100700 }],
      referenceLinks: refs([{ href: 'https://opportunities.rbi.org.in', title: '🏦 RBI Opportunities Portal', desc: 'Grade B & Assistant Notifications' }])
    },
    'nabard-recruitment': {
      organisation: 'National Bank for Agriculture and Rural Development (NABARD)',
      qualification: "Bachelor's Degree with 60% (55% SC/ST/PwBD) for Grade A (RDBS / Rajbhasha / Legal)",
      age_limit: '21–30 Years (Grade A) · 25–32 Years (Grade B)',
      pay_level: 'NABARD Grade A Basic ₹44,500 (Gross ~₹1.05 Lakh/mo)',
      vacancies: 150,
      apply_url: 'https://www.nabard.org',
      summary: 'Assistant Manager (Grade A) and Manager (Grade B) in Rural Development Banking Service, Agriculture, Fisheries, and Forestry with regional posting options including NABARD Odisha Regional Office (Bhubaneswar).',
      summary_or: 'NABARD ଗ୍ରେଡ୍-A ଓ ଗ୍ରେଡ୍-B ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍ (କୃଷି ଓ ଗ୍ରାମୀଣ ବିକାଶ) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Phase-I Prelims (200 Marks)', 'Reasoning, English, Computer, Quant, Decision Making, GA, ESI & ARD', '200 Marks (ESI+ARD+GA Merit)'],
        ['Phase-II Mains (200 Marks)', 'Paper-I General English (Desc 100) + Paper-II ESI & ARD (Obj+Desc 100)', '200 Marks'],
        ['Phase-III Interview', 'Psychometric Test + Interview', '50 Marks']
      ],
      relaxationTable: STANDARD_RELAXATION('21–30 Years', '₹800 (SC/ST/PwBD ₹150)'),
      payProgression: [{ label: 'Grade A Entry', pay: 44500 }, { label: 'Grade B', pay: 55200 }, { label: 'Grade C (AGM)', pay: 79600 }, { label: 'Grade D (DGM)', pay: 100700 }],
      referenceLinks: refs([{ href: 'https://www.nabard.org', title: '🌾 NABARD Careers Portal', desc: 'Grade A & Development Assistant' }])
    },
    'public-sector-insurance-recruitment': {
      organisation: 'LIC / NIACL / UIIC / NICL / OICL / GIC Re',
      qualification: "Bachelor's Degree in any discipline (Specialist streams for Legal/IT/Actuarial)",
      age_limit: '21–30 Years (AAO / AO) · 18–30 Years (LIC Assistant / ADO)',
      pay_level: 'AO / AAO Basic ₹50,925 – ₹53,600 (Gross ~₹88,000–₹95,000/mo)',
      vacancies: 1800,
      apply_url: 'https://licindia.in',
      summary: 'Public sector insurance officer & assistant drives: LIC AAO, LIC ADO, NIACL AO, UIIC AO, NICL AO, and OICL AO across Odisha divisional offices (Cuttack, Bhubaneswar, Berhampur, Sambalpur).',
      summary_or: 'LIC AAO, NIACL AO, UIIC ଏବଂ ଅନ୍ୟାନ୍ୟ ସରକାରୀ ବୀମା କମ୍ପାନୀରେ ଅଫିସର୍ ଓ ଆସିଷ୍ଟାଣ୍ଟ ନିଯୁକ୍ତି।',
      examPatternTable: BANK_PO_TABLE,
      relaxationTable: STANDARD_RELAXATION('21–30 Years', '₹700–₹850'),
      payProgression: [{ label: 'Assistant', pay: 24050 }, { label: 'AAO / AO Scale-I', pay: 50925 }, { label: 'Scale-II (AM)', pay: 64820 }, { label: 'Scale-III (DM)', pay: 85920 }],
      referenceLinks: refs([{ href: 'https://licindia.in', title: '🛡️ LIC Careers Portal', desc: 'AAO / ADO / Assistant Notices' }])
    },
    'other-central-financial-institutions': {
      organisation: 'SEBI / SIDBI / IRDAI / EXIM Bank / NHB / IFSCA',
      qualification: "Master's Degree or Bachelor's in Law / Engg / CA / MBA (varies by Grade A stream)",
      age_limit: '21–30 Years (Max 30 on cut-off; OBC +3, SC/ST +5 Yrs)',
      pay_level: 'SEBI / SIDBI / EXIM Grade A Basic ₹44,500 (Gross ~₹1.15–₹1.49 Lakh/mo)',
      vacancies: 300,
      apply_url: 'https://www.sebi.gov.in',
      summary: 'Specialist Officer Grade-A recruitments in Securities & Exchange Board of India (SEBI), SIDBI, IRDAI, EXIM Bank, and National Housing Bank (NHB).',
      summary_or: 'SEBI, SIDBI, IRDAI, EXIM ବ୍ୟାଙ୍କ ଏବଂ NHB ଗ୍ରେଡ୍-A ସ୍ପେଶାଲିଷ୍ଟ ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Phase-I (2 Papers)', 'Paper-1 General Awareness/Quant/Eng (100) + Paper-2 Commerce/Econ/Law (100)', '200 Marks (Qualifying 30%/40%)'],
        ['Phase-II (2 Papers)', 'English Descriptive (100) + Domain Paper (100)', '200 Marks (Merit)'],
        ['Phase-III Interview', 'Board Interview', '15% Weightage']
      ],
      relaxationTable: STANDARD_RELAXATION('21–30 Years', '₹1,000 (SC/ST/PwBD ₹100)'),
      payProgression: [{ label: 'Grade A Entry', pay: 44500 }, { label: 'Grade B', pay: 55200 }, { label: 'Grade C', pay: 79600 }, { label: 'Grade D', pay: 100700 }],
      referenceLinks: refs([{ href: 'https://www.sebi.gov.in', title: '📈 SEBI Careers Portal', desc: 'Grade A Officer Notifications' }])
    },

    // --- 1.1.4 Indian Railways (7) ---
    'rrb-ntpc': {
      organisation: 'Railway Recruitment Board (RRB Bhubaneswar / ECoR)',
      qualification: '12th Pass (Undergraduate Level-2/3) or Graduate (Level-4/5/6 Station Master, Goods Train Manager)',
      age_limit: '18–30 / 33 Years (UG) · 18–33 / 36 Years (Graduate)',
      pay_level: '7th CPC Level-2 (₹19,900) to Level-6 (₹35,400 + Allowances)',
      vacancies: 11558,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'Non-Technical Popular Categories (Station Master, Goods Train Manager, Senior Clerk, Commercial-cum-Ticket Clerk) under RRB Bhubaneswar covering East Coast Railway (Khordha Road, Sambalpur, Waltair).',
      summary_or: 'RRB ଭୁବନେଶ୍ୱର (ପୂର୍ବତଟ ରେଳପଥ) ଅଧୀନରେ ଷ୍ଟେସନ ମାଷ୍ଟର, ଗୁଡ୍ସ ଟ୍ରେନ୍ ମ୍ୟାନେଜର୍ ଓ କ୍ଲର୍କ ନିଯୁକ୍ତି।',
      examPatternTable: RRB_NTPC_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–33 / 36 Years', '₹500 (₹400 Refundable) · SC/ST/Women ₹250 (Full Refund)'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🚆 RRB Bhubaneswar (rrbbbs.gov.in)', desc: 'East Coast Railway NTPC & Admit Cards' }])
    },
    'rrb-group-d': {
      organisation: 'Railway Recruitment Cell (RRC ECoR Bhubaneswar / RRB)',
      qualification: '10th Pass (Matriculation) OR ITI from NCVT/SCVT OR NAC granted by NCVT',
      age_limit: '18–33 / 36 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-1 (₹18,000 – ₹56,900 + DA/HRA/Night Duty/Track Allowance)',
      vacancies: 32438,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'Level-1 Track Maintainer Grade-IV, Helper/Assistant in Electrical/Mechanical/S&T, and Pointsman posts in East Coast Railway (Bhubaneswar, Khordha Road, Sambalpur).',
      summary_or: 'ପୂର୍ବତଟ ରେଳପଥରେ ଟ୍ରାକ୍ ମେଣ୍ଟେନର୍, ପଏଣ୍ଟସମ୍ୟାନ୍ ଓ ହେଲ୍ପର (ଲେଭଲ୍-୧ ଗ୍ରୁପ୍-D) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (90 Minutes)', 'General Science (25), Math (25), Reasoning (30), GA & CA (20)', '100 Marks (-1/3rd negative)'],
        ['PET (Qualifying)', '35 kg weight carry 100m in 2m + 1 km in 4m15s (M) / 20 kg + 1 km in 5m40s (F)', 'Qualifying + DV & Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('18–33 / 36 Years', '₹500 (SC/ST/Women ₹250 Refundable)'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🚆 RRB Bhubaneswar Level-1', desc: 'ECoR Group-D CBT & PET Norms' }])
    },
    'assistant-loco-pilot': {
      organisation: 'Railway Recruitment Board (RRB Bhubaneswar)',
      qualification: '10th Pass + NCVT/SCVT ITI in Electrician/Fitter/Mechanic OR 3-Yr Engineering Diploma / B.Tech',
      age_limit: '18–30 / 33 Years · Vision Standard A-1 (6/6 without glasses) Mandatory',
      pay_level: '7th CPC Level-2 (₹19,900 + Running Kilometre Allowance ~₹45,000–₹60,000/mo)',
      vacancies: 18799,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'Assistant Loco Pilot (ALP) running staff recruitment for electric and diesel locomotives across East Coast Railway divisions.',
      summary_or: 'ରେଳବାଇ ଆସିଷ୍ଟାଣ୍ଟ ଲୋକୋ ପାଇଲଟ୍ (ALP) ନିଯୁକ୍ତି (ଦଶମ + ITI / ଡିପ୍ଲୋମା, A-1 ଦୃଷ୍ଟି ମାନଦଣ୍ଡ)।',
      examPatternTable: [
        ['CBT-1 (60 Min, Qualifying)', 'Math (20), Reasoning (25), Science (20), GA (10)', '75 Marks (-1/3rd negative)'],
        ['CBT-2 Part-A (90 Min, Merit)', 'Math, Reasoning, Basic Science & Engineering (100 Qs)', '100 Marks (70% Merit Weightage)'],
        ['CBT-2 Part-B & CBAT', 'Relevant ITI Trade Test (75 Qs, 35% Qual.) + CBAT Psycho Test (30% Weight)', 'Final Merit = 70% Part-A + 30% CBAT']
      ],
      relaxationTable: STANDARD_RELAXATION('18–33 Years', '₹500 (Refundable)'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🚆 RRB ALP Portal', desc: 'CBT-1/2 & CBAT Guidelines' }])
    },
    'technician': {
      organisation: 'Railway Recruitment Board (RRB Bhubaneswar)',
      qualification: 'Technician Grade-III: 10th + ITI (or 10+2 Physics/Math for S&T); Grade-I Signal: B.Sc./Diploma/B.E.',
      age_limit: '18–33 / 36 Years (Grade-III) · 18–36 Years (Grade-I Signal)',
      pay_level: '7th CPC Level-2 (₹19,900 Grade-III) & Level-5 (₹29,200 Grade-I Signal)',
      vacancies: 14298,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'Railway Technician Grade-I (Signal) and Grade-III (Electrical, Diesel, Carriage & Wagon, S&T, Track Machine) posts in East Coast Railway workshops (Mancheswar, Khordha).',
      summary_or: 'ମଞ୍ଚେଶ୍ୱର ୱାର୍କସପ୍ ଓ ପୂର୍ବତଟ ରେଳପଥରେ ଟେକ୍ନିସିଆନ୍ ଗ୍ରେଡ୍-I ଏବଂ ଗ୍ରେଡ୍-III ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Single CBT (90 Min)', 'Grade-III: Math (25), Reasoning (25), General Science (40), GA (10)', '100 Marks (-1/3rd negative)'],
        ['Grade-I Signal CBT', 'GA (10), Reasoning (15), Computer (20), Math (20), Basic Science & Engg (35)', '100 Marks (-1/3rd negative)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–36 Years', '₹500 (Refundable)'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🚆 RRB Technician Portal', desc: 'Trade-Wise Eligibility & CBT' }])
    },
    'junior-engineer': {
      organisation: 'Railway Recruitment Board (RRB Bhubaneswar)',
      qualification: '3-Year Diploma or B.E./B.Tech in Civil, Mechanical, Electrical, Electronics; B.Sc. Chem for CMA',
      age_limit: '18–36 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-6 (₹35,400 – ₹1,12,400 + Allowances)',
      vacancies: 7951,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'Junior Engineer (JE), Depot Material Superintendent (DMS), and Chemical & Metallurgical Assistant (CMA) supervisory technical cadres in Indian Railways.',
      summary_or: 'ଭାରତୀୟ ରେଳବାଇରେ ଜୁନିଅର ଇଞ୍ଜିନିୟର (JE), DMS ଏବଂ CMA ବୈଷୟିକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT-1 (90 Min, Screening)', 'Math (30), Reasoning (25), GA (15), General Science (30)', '100 Marks (-1/3rd negative)'],
        ['CBT-2 (120 Min, Merit)', 'GA (15), Physics & Chem (15), Computer (10), Env (10), Technical (100)', '150 Marks (-1/3rd negative)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–36 Years', '₹500 (Refundable)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🚆 RRB JE Portal', desc: 'Engineering Diploma/Degree CBT' }])
    },
    'railway-protection-force': {
      organisation: 'Railway Recruitment Board (RRB / RPF)',
      qualification: "RPF Constable: 10th Pass · RPF Sub-Inspector (SI): Bachelor's Degree",
      age_limit: '18–28 Years (Constable) · 20–28 Years (SI)',
      pay_level: '7th CPC Level-3 (₹21,700 Constable) & Level-6 (₹35,400 SI)',
      vacancies: 4660,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'Railway Protection Force (RPF) & RPSF Sub-Inspector and Constable security force recruitment with CBT + PET/PMT.',
      summary_or: 'ରେଳବାଇ ସୁରକ୍ଷା ବଳ (RPF) ସବ୍-ଇନ୍ସପେକ୍ଟର ଓ କନେଷ୍ଟବଳ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (90 Min)', 'General Awareness (50), Arithmetic (35), General Intelligence & Reasoning (35)', '120 Marks (-1/3rd negative)'],
        ['PET / PMT (Qualifying)', '1600m in 5m45s (Constable M) / 6m30s (SI M) · 800m in 3m40s/4m (F)', 'Qualifying + DV']
      ],
      relaxationTable: STANDARD_RELAXATION('18–28 Years', '₹500 (Refundable)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🛡️ RPF / RRB Portal', desc: 'RPF SI & Constable CBT/PET' }])
    },
    'ministerial-paramedical-and-other-railway-posts': {
      organisation: 'Railway Recruitment Board (RRB Bhubaneswar)',
      qualification: 'GNM / B.Sc. Nursing (Staff Nurse), D.Pharm, DMLT, or Steno/PG for Ministerial Categories',
      age_limit: '18–36 / 40 Years (Post-specific + Category Relaxations)',
      pay_level: '7th CPC Level-4 (₹25,500) to Level-7 (₹44,900 Nursing Superintendent)',
      vacancies: 2412,
      apply_url: 'https://www.rrbbbs.gov.in',
      summary: 'RRB Paramedical (Nursing Superintendent, Pharmacist, Lab Superintendent, Health & Malaria Inspector) and Ministerial & Isolated Categories (Stenographer, Chief Law Assistant, TGT/PGT).',
      summary_or: 'ରେଳବାଇ ହସ୍ପିଟାଲ୍ ନର୍ସିଂ, ଫାର୍ମାସିଷ୍ଟ, ଲାବ୍ ଟେକ୍ନିସିଆନ୍ ଏବଂ ମିନିଷ୍ଟରିଆଲ୍ ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Single CBT (90 Min)', 'Professional Ability (70 Qs) + GA (10), Arithmetic (10), Reasoning/Science (10)', '100 Marks (-1/3rd negative)'],
        ['Skill / Stenography (MI)', 'Typing / Stenography / Teaching Demo (where applicable)', 'Qualifying + Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('18–40 Years', '₹500 (Refundable)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.rrbbbs.gov.in', title: '🏥 RRB Paramedical & MI', desc: 'Railway Hospital & School Posts' }])
    },

    // --- 1.1.5 Defence and Armed Forces (7) ---
    'army': {
      organisation: 'Indian Army (ARO Cuttack & ARO Sambalpur / Recruiting Directorate)',
      qualification: '10th / 12th / Graduate / B.Tech (TES, TGC, SSC Tech, JAG, NCC Special Entry)',
      age_limit: '17.5–21 Years (Agniveer) · 19–27 Years (Officer Entries)',
      pay_level: 'Agniveer ₹30,000–₹40,000/mo · Lieutenant Level-10 (₹56,100 + ₹15,500 MSP)',
      vacancies: 25000,
      apply_url: 'https://joinindianarmy.nic.in',
      summary: 'Indian Army recruitment rallies via ARO Cuttack & ARO Sambalpur (Gopalpur/Berhampur/Cuttack) and Officer Entries (IMA, OTA, TES, TGC, NCC).',
      summary_or: 'ଭାରତୀୟ ସ୍ଥଳସେନା (ARO କଟକ ଓ ସମ୍ବଲପୁର) ନିଯୁକ୍ତି ରାଲି ଏବଂ ଅଫିସର୍ ଏଣ୍ଟ୍ରି।',
      examPatternTable: [
        ['Online CEE (Agniveer)', 'GK, General Science, Math, Reasoning (50 Qs · 60 Min)', '100 / 200 Marks (-25% negative)'],
        ['Rally PET / PMT & SSB', '1.6 km Run, Pull-ups, Balance (Rally) or 5-Day SSB Interview (Officers)', 'Merit + Armed Forces Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('17.5–21 / 19–27 Years', '₹250 (CEE) / ₹0 (Officer)'),
      physicalStandards: DEFENCE_PHYSICAL,
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([{ href: 'https://joinindianarmy.nic.in', title: '🪖 Join Indian Army', desc: 'ARO Cuttack/Sambalpur & Officer Entries' }])
    },
    'navy': {
      organisation: 'Indian Navy (INS Chilka, Odisha / Directorate of Manpower)',
      qualification: '10th (Agniveer MR) / 10+2 PCM (Agniveer SSR / 10+2 B.Tech) / B.E./B.Tech (INET / SSC)',
      age_limit: '17.5–21 Years (Agniveer SSR/MR) · 19–25 Years (Commissioned Officers)',
      pay_level: 'Agniveer ₹30,000–₹40,000/mo · Sub-Lieutenant Level-10 (₹56,100 + ₹15,500 MSP)',
      vacancies: 4500,
      apply_url: 'https://www.joinindiannavy.gov.in',
      summary: 'Indian Navy SSR, MR, and Commissioned Officer entries with basic naval training conducted at INS Chilka (Khordha district, Odisha).',
      summary_or: 'ଭାରତୀୟ ନୌସେନା (INS ଚିଲିକା, ଓଡ଼ିଶା) ଅଗ୍ନିବୀର SSR/MR ଏବଂ ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['INET / Agniveer CBT', 'English, Science, Math, General Awareness (100 Qs · 60 Min SSR)', '100 Marks (-0.25 negative)'],
        ['PFT & Medical (INS Chilka)', '1.6 km Run (6m30s M / 8m F), Squats, Push-ups / SSB for Officers', 'Qualifying + Naval Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('17.5–21 / 19–25 Years', '₹550 + GST (Agniveer) / ₹0 (Officer)'),
      physicalStandards: DEFENCE_PHYSICAL,
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([{ href: 'https://www.joinindiannavy.gov.in', title: '⚓ Join Indian Navy', desc: 'SSR/MR & Officer Applications' }])
    },
    'air-force': {
      organisation: 'Indian Air Force (CASB / AFCAT C-DAC)',
      qualification: '10+2 PCM 50% or 3-Yr Diploma (Agniveer Vayu Science) · Graduate 60% (AFCAT Flying/Tech/GD)',
      age_limit: '17.5–21 Years (Agniveer Vayu) · 20–24 Years (AFCAT Flying) · 20–26 Years (GD)',
      pay_level: 'Agniveer Vayu ₹30,000–₹40,000/mo · Flying Officer Level-10 (₹56,100 + ₹15,500 MSP)',
      vacancies: 4000,
      apply_url: 'https://afcat.cdac.in',
      summary: 'Indian Air Force Agniveer Vayu (Science & Other than Science) and AFCAT Commissioned Officer (Flying, Technical, Ground Duty) recruitment.',
      summary_or: 'ଭାରତୀୟ ବାୟୁସେନା ଅଗ୍ନିବୀର ବାୟୁ ଏବଂ AFCAT ଅଫିସର୍ ନିଯୁକ୍ତି ପରୀକ୍ଷା।',
      examPatternTable: [
        ['AFCAT CBT (2 Hours)', 'GA, Verbal Ability in English, Numerical Ability, Reasoning & Military Aptitude (100 Qs)', '300 Marks (+3 / -1 negative)'],
        ['AFSB Interview / CASB PFT', '5-Day AFSB Testing + CPSS (Flying) or 1.6 km Run & Adaptability Test', 'Merit + Air Force Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('17.5–26 Years', '₹550 + GST'),
      physicalStandards: DEFENCE_PHYSICAL,
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([
        { href: 'https://afcat.cdac.in', title: '✈️ AFCAT Official Portal', desc: 'Flying, Technical & Ground Duty' },
        { href: 'https://agnipathvayu.cdac.in', title: '✈️ Agniveer Vayu Portal', desc: '10+2 Air Force Entry' }
      ])
    },
    'nda-and-cds': {
      organisation: 'Union Public Service Commission (UPSC)',
      qualification: 'NDA & NA: 12th Pass (PCM for Air Force/Navy) · CDS: Bachelor Degree (B.E./B.Tech for INA/AFA)',
      age_limit: '16.5–19.5 Years (NDA Unmarried M/F) · 19–25 Years (CDS IMA/INA/AFA/OTA)',
      pay_level: 'Stipend ₹56,100 during training → Lieutenant / Sub-Lt / Flying Officer Level-10 + ₹15,500 MSP',
      vacancies: 860,
      apply_url: 'https://upsconline.nic.in',
      summary: 'Biannual UPSC National Defence Academy (NDA) and Combined Defence Services (CDS) examinations for permanent & short-service commissions with Cuttack & Sambalpur exam centres.',
      summary_or: 'UPSC NDA ଏବଂ CDS ପରୀକ୍ଷା (କଟକ ଓ ସମ୍ବଲପୁର କେନ୍ଦ୍ର) — ସେନା, ନୌସେନା ଓ ବାୟୁସେନା ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['NDA Written (900 Marks)', 'Mathematics (300 Marks, 2.5h) + General Ability Test (600 Marks, 2.5h)', '900 Marks (-1/3rd negative)'],
        ['CDS Written (IMA/INA/AFA)', 'English (100) + General Knowledge (100) + Elementary Math (100)', '300 Marks (200 for OTA)'],
        ['SSB Interview (5 Days)', 'Stage-I (OIR/PPDT) + Stage-II (Psych, GTO, Interview)', '900 Marks (NDA) / 300 Marks (CDS)']
      ],
      relaxationTable: [['Unmarried Candidates', 'NDA: 16.5–19.5 Yrs · CDS: 19–25 Yrs', 'No age relaxation · Fee ₹100 (SC/ST/Female ₹0)']],
      physicalStandards: DEFENCE_PHYSICAL,
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([{ href: 'https://upsconline.nic.in', title: '🎖️ UPSC NDA & CDS Portal', desc: 'Application & e-Admit Card' }])
    },
    'agniveer-recruitment': {
      organisation: 'Indian Army / Indian Navy / Indian Air Force',
      qualification: '8th / 10th / 12th / ITI (Army GD, Clerk, Tech; Navy SSR/MR; Air Force Vayu)',
      age_limit: '17.5–21 Years (Upper limit strictly 21 years on enrollment)',
      pay_level: 'Year-1 ₹30,000 → Year-4 ₹40,000 + ₹10.04 Lakh Tax-Free Seva Nidhi Package',
      vacancies: 45000,
      apply_url: 'https://joinindianarmy.nic.in',
      summary: '4-year Agnipath Tour of Duty across Army, Navy (INS Chilka), and Air Force with 25% regular cadre retention and 10% CAPF/PSU reservation.',
      summary_or: 'ଅଗ୍ନିପଥ ଯୋଜନା ଅଧୀନରେ ସ୍ଥଳ, ନୌ ଓ ବାୟୁସେନାରେ ୪ ବର୍ଷିଆ ଅଗ୍ନିବୀର ନିଯୁକ୍ତି ଓ ₹୧୦.୦୪ ଲକ୍ଷ ସେବା ନିଧି।',
      examPatternTable: [
        ['Online CEE / CBT', 'Objective CBT (50–100 Qs depending on Army/Navy/IAF trade)', '100 / 200 Marks'],
        ['PFT, PMT & Medical', '1.6 km Run, Pull-ups, Medical Fitness & Document Verification', 'Merit + 25% Permanent Retention']
      ],
      relaxationTable: [['All Categories', '17.5–21 Years (Strictly Unmarried)', 'Seva Nidhi ₹10.04L + ₹48L Insurance']],
      physicalStandards: DEFENCE_PHYSICAL,
      payProgression: [{ label: 'Year 1', pay: 30000 }, { label: 'Year 2', pay: 33000 }, { label: 'Year 3', pay: 36500 }, { label: 'Year 4', pay: 40000 }],
      referenceLinks: refs([
        { href: 'https://joinindianarmy.nic.in', title: '🪖 Army Agniveer', desc: 'ARO Cuttack & Sambalpur' },
        { href: 'https://www.joinindiannavy.gov.in', title: '⚓ Navy Agniveer', desc: 'INS Chilka Training' }
      ])
    },
    'technical-and-non-technical-defence-posts': {
      organisation: 'Indian Coast Guard / Indian Army TGC / Navy SSC Tech',
      qualification: '10+2 PCM (Navik GD) / 10th (Navik DB) / Diploma (Yantrik) / B.E./B.Tech (Coast Guard AC / TGC)',
      age_limit: '18–22 Years (Navik/Yantrik) · 20–27 Years (Technical Officer)',
      pay_level: '7th CPC Level-3 (₹21,700 Navik) to Level-10 (₹56,100 Asst Commandant)',
      vacancies: 1200,
      apply_url: 'https://joinindiancoastguard.cdac.in',
      summary: 'Indian Coast Guard (Paradip Coast Guard District HQ-7 Odisha) Navik GD/DB, Yantrik, Assistant Commandant, plus Army TGC and Navy B.Tech/SSC Tech entries.',
      summary_or: 'ଭାରତୀୟ ତଟରକ୍ଷୀ ବାହିନୀ (ପାରାଦୀପ) ନାବିକ, ଯାନ୍ତ୍ରିକ ଏବଂ ଟେକ୍ନିକାଲ୍ ଡିଫେନ୍ସ ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CGEPT / CGCAT CBT', 'Section-I (Math, Science, Eng, Reasoning, GK) + Section-II (Physics/Math or Engg)', '60 + 50 = 110 Marks'],
        ['PFT & PSB/FSB', '1.6 km Run in 7 min, 20 Squats, 10 Push-ups / Officer Selection Board', 'Qualifying + Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('18–22 / 20–27 Years', '₹300 (SC/ST ₹0)'),
      physicalStandards: DEFENCE_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://joinindiancoastguard.cdac.in', title: '🛟 Join Indian Coast Guard', desc: 'Navik, Yantrik & Asst Commandant' }])
    },
    'defence-civilian-recruitment': {
      organisation: 'MES / AOC / BRO / Naval Dockyard / Ordnance Factories / DRDO',
      qualification: '10th + ITI (Tradesman Mate, Fireman, Fitter) / 12th (LDC) / Diploma (JE MES)',
      age_limit: '18–25 / 27 / 30 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-1 (₹18,000) to Level-6 (₹35,400 JE MES / Chargeman)',
      vacancies: 3500,
      apply_url: 'https://www.aocrecruitment.gov.in',
      summary: 'Non-combatant Group-C & Group-B civilian posts in Military Engineer Services (MES), Army Ordnance Corps (AOC), Border Roads Organisation (BRO), Naval Armament Depot, and INS Chilka civilian staff.',
      summary_or: 'MES, AOC, BRO ଏବଂ ନୌସେନା ଡକୟାର୍ଡରେ ପ୍ରତିରକ୍ଷା ବେସାମରିକ (Civilian) ଗ୍ରୁପ୍-B/C ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written OMR/CBT', 'General Intelligence (25), Math (25), English (25), General Awareness (25–50)', '100 / 150 Marks'],
        ['PET / Trade Skill Test', '1.5 km Run + 50 kg Weight Carry (AOC/Fireman) or ITI Trade Test', 'Qualifying']
      ],
      relaxationTable: STANDARD_RELAXATION('18–27 / 30 Years', '₹100 (SC/ST/Women ₹0)'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.aocrecruitment.gov.in', title: '🪖 AOC & Defence Civilian', desc: 'Tradesman, Fireman & JOA' }])
    },

    // --- 1.1.6 Central Armed Police Forces and Security (7) ---
    'bsf': {
      organisation: 'Border Security Force (BSF / MHA)',
      qualification: '10th / ITI (Tradesman) · 12th PCM (HC RO/RM) · Diploma (SI Tech) · Graduate (CAPF AC / CPO SI)',
      age_limit: '18–25 Years (HC/Constable) · 20–25 Years (AC/SI)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-10 (₹56,100 Assistant Commandant)',
      vacancies: 5000,
      apply_url: 'https://rectt.bsf.gov.in',
      summary: 'BSF Head Constable (Radio Operator / Radio Mechanic / Ministerial), ASI Steno, Constable Tradesman, SI (Works/Electrical), and Assistant Commandant (via UPSC CAPF AC).',
      summary_or: 'ସୀମା ସୁରକ୍ଷା ବଳ (BSF) ହେଡ୍ କନେଷ୍ଟବଳ RO/RM, ଟ୍ରେଡ୍ସମ୍ୟାନ୍, SI ଏବଂ AC ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Phase-I Written / CBT', 'Physics (40), Math (20), Chem (20), Eng & GK (20) for HC RO/RM', '200 Marks (-0.25 negative)'],
        ['Phase-II PST/PET & Dictation', '1.6 km in 6.5 min (M) / 800m in 4 min (F) + Long/High Jump + Medical', 'Qualifying']
      ],
      relaxationTable: STANDARD_RELAXATION('18–25 Years', '₹100 (SC/ST/Women ₹0)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://rectt.bsf.gov.in', title: '🛡️ BSF Recruitment Portal', desc: 'HC RO/RM, Tradesman & SI' }])
    },
    'crpf': {
      organisation: 'Central Reserve Police Force (CRPF / MHA)',
      qualification: '10th / ITI (Constable Technical/Tradesman) · 12th (HCM / ASI Steno) · Graduate (SI / AC)',
      age_limit: '18–25 Years (HCM/Tradesman) · 20–25 Years (CAPF AC / CPO SI)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-10 (₹56,100 Assistant Commandant)',
      vacancies: 9212,
      apply_url: 'https://rectt.crpf.gov.in',
      summary: 'CRPF Constable (Technical & Tradesman), Head Constable (Ministerial), ASI (Steno), Paramedical Staff, and Group Centre Bhubaneswar / Sambalpur rallies.',
      summary_or: 'CRPF କନେଷ୍ଟବଳ (ଟେକ୍ନିକାଲ୍/ଟ୍ରେଡ୍ସମ୍ୟାନ୍), HCM, ASI ଷ୍ଟେନୋ ଏବଂ ଗ୍ରୁପ୍ ସେଣ୍ଟର ଭୁବନେଶ୍ୱର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (2 Hours)', 'Reasoning (25), GK/GA (25), Elementary Math (25), EN/HI (25)', '100 Marks (-0.25 negative)'],
        ['PST, PET, Trade & DME', 'Height 170/157 cm, 5 km / 1.6 km Run, Trade Test / Typing 35 WPM', 'Qualifying']
      ],
      relaxationTable: STANDARD_RELAXATION('18–25 Years', '₹100 (SC/ST/Women ₹0)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://rectt.crpf.gov.in', title: '🛡️ CRPF Recruitment Portal', desc: 'Tradesman, HCM & Paramedical' }])
    },
    'cisf': {
      organisation: 'Central Industrial Security Force (CISF / MHA)',
      qualification: '10th (Tradesman) · 12th Science (Constable Fire) · 12th (HC Ministerial / ASI Steno) · Graduate (AC)',
      age_limit: '18–23 / 25 Years (Constable Fire/Driver/HCM) · 20–25 Years (SI/AC)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-10 (₹56,100 Assistant Commandant)',
      vacancies: 2500,
      apply_url: 'https://cisfrectt.cisf.gov.in',
      summary: 'CISF Constable/Fire, Constable/Driver, Head Constable (Ministerial), and ASI (Steno) guarding Odisha airports (Bhubaneswar), Paradip Port, NALCO, SAIL Rourkela, and NTPC Talcher.',
      summary_or: 'CISF କନେଷ୍ଟବଳ ଫାୟାର, ଡ୍ରାଇଭର୍ ଓ HCM — ପାରାଦୀପ ବନ୍ଦର, ରାଉରକେଲା ଇସ୍ପାତ, NALCO ଓ ବିମାନବନ୍ଦର ସୁରକ୍ଷା ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['PET / PST (First Stage)', '5 km in 24 min (Fire) / 1.6 km (HCM/Driver) · Height 170/157 cm', 'Qualifying'],
        ['CBT / OMR (100 Marks)', 'Reasoning (25), GK (25), Math (25), EN/HI (25) · 120 Min', '100 Marks (No negative in Fire/HCM)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–25 Years', '₹100 (SC/ST/Women ₹0)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://cisfrectt.cisf.gov.in', title: '🛡️ CISF Recruitment Portal', desc: 'Constable Fire, Driver & HCM' }])
    },
    'itbp': {
      organisation: 'Indo-Tibetan Border Police (ITBP / MHA)',
      qualification: '10th / ITI (Tradesman / Pioneer / Telecom) · 12th (HCM / Animal Transport) · Graduate (AC / MO)',
      age_limit: '18–25 Years (Constable/HC) · 20–25 Years (SI/AC)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-10 (₹56,100)',
      vacancies: 1800,
      apply_url: 'https://recruitment.itbpolice.nic.in',
      summary: 'ITBP Constable (Telecom, Pioneer, Driver, Animal Transport, Tradesman), Head Constable (Ministerial / Dresser Veterinary), and SI (Staff Nurse / Overseer).',
      summary_or: 'ITBP କନେଷ୍ଟବଳ (ଟେଲିକମ୍, ଡ୍ରାଇଭର୍, ଟ୍ରେଡ୍ସମ୍ୟାନ୍), HCM ଏବଂ SI ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Phase-I PET / PST', '1.6 km in 7m30s (M) / 800m in 4m45s (F) + Long/High Jump', 'Qualifying'],
        ['Phase-II Written / CBT', 'GK, Math, Reasoning, EN/HI (50–100 Qs)', '100 Marks + Trade/Skill Test']
      ],
      relaxationTable: STANDARD_RELAXATION('18–25 Years', '₹100 (SC/ST/Women ₹0)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://recruitment.itbpolice.nic.in', title: '🏔️ ITBP Recruitment Portal', desc: 'Constable, HC & SI Notices' }])
    },
    'ssb': {
      organisation: 'Sashastra Seema Bal (SSB / MHA)',
      qualification: '10th / ITI (Constable Tradesman) · 12th (HC Ministerial / Communication) · Diploma (SI Comm)',
      age_limit: '18–25 / 27 Years (Constable/HC) · 20–25 / 30 Years (SI/AC)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-10 (₹56,100)',
      vacancies: 1656,
      apply_url: 'https://ssbrectt.gov.in',
      summary: 'Sashastra Seema Bal (SSB) Constable (Driver, Veterinary, Tradesman), Head Constable (Ministerial, Electrician, Mechanic, Communication), and ASI (Pharmacist / Radiographer).',
      summary_or: 'ସଶସ୍ତ୍ର ସୀମା ବଳ (SSB) କନେଷ୍ଟବଳ, ହେଡ୍ କନେଷ୍ଟବଳ (କମ୍ୟୁନିକେସନ୍/ମିନିଷ୍ଟରିଆଲ୍) ଏବଂ ASI ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['PET / PST', '4.8 km in 24 min (M) / 2.4 km in 18 min (F)', 'Qualifying'],
        ['Written CBT (2 Hours)', 'GK, Math, Reasoning, EN/HI (100 Qs) / Tech Paper for SI', '100 / 150 Marks + Skill Test']
      ],
      relaxationTable: STANDARD_RELAXATION('18–27 Years', '₹100 (SC/ST/Women ₹0)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://ssbrectt.gov.in', title: '🛡️ SSB Recruitment Portal', desc: 'Constable, HC & ASI Notices' }])
    },
    'assam-rifles': {
      organisation: 'Assam Rifles (DGAR Shillong / MHA)',
      qualification: '10th / ITI (Rifleman GD / Tradesman) · 12th (Havildar Clerk / Operator Radio) · Diploma/Degree (Naib Subedar)',
      age_limit: '18–23 / 25 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-6 (₹35,400)',
      vacancies: 1200,
      apply_url: 'https://www.assamrifles.gov.in',
      summary: 'Assam Rifles Technical & Tradesmen Rally and Meritorious Sportspersons recruitment for Clerk, Operator Radio & Line, Religious Teacher, Nursing Assistant, and Rifleman.',
      summary_or: 'ଆସାମ ରାଇଫଲ୍ସ ଟେକ୍ନିକାଲ୍ ଓ ଟ୍ରେଡ୍ସମ୍ୟାନ୍ ନିଯୁକ୍ତି ରାଲି (କ୍ଲର୍କ, ରେଡିଓ ଅପରେଟର୍, ନର୍ସିଂ ଆସିଷ୍ଟାଣ୍ଟ)।',
      examPatternTable: [
        ['PST / PET & Trade Test', '5 km in 24 min (M) / 1.6 km in 8.5 min (F) + Skill/Typing 35 WPM', 'Qualifying'],
        ['Written Test (100 Marks)', 'English, Reasoning, Quant, GK (100 Qs)', '100 Marks (Merit) + Medical']
      ],
      relaxationTable: STANDARD_RELAXATION('18–25 Years', '₹100–₹200 (SC/ST/Women ₹0)'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.assamrifles.gov.in', title: '🛡️ Assam Rifles Portal', desc: 'Technical & Tradesmen Rally' }])
    },
    'nsg-and-other-eligible-security-organisations': {
      organisation: 'UPSC CAPF (AC) / NSG / IB / NIA / SPG',
      qualification: "Bachelor's Degree (UPSC CAPF AC & IB ACIO-II) · 10th (IB Security Assistant)",
      age_limit: '20–25 Years (UPSC CAPF AC) · 18–27 Years (IB ACIO / SA)',
      pay_level: '7th CPC Level-7 (₹44,900 IB ACIO) to Level-10 (₹56,100 CAPF AC)',
      vacancies: 1500,
      apply_url: 'https://upsconline.nic.in',
      summary: 'UPSC CAPF (Assistant Commandant in BSF, CRPF, CISF, ITBP, SSB), Intelligence Bureau (IB ACIO-II & SA/Exe), NIA, and NSG deputation/specialist security cadres.',
      summary_or: 'UPSC CAPF ଆସିଷ୍ଟାଣ୍ଟ କମାଣ୍ଡାଣ୍ଟ (AC), ଇଣ୍ଟେଲିଜେନ୍ସ ବ୍ୟୁରୋ (IB ACIO) ଏବଂ NIA/NSG ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CAPF AC Paper-I (250)', 'General Ability & Intelligence (125 MCQs · 2 Hours · -1/3rd neg)', '250 Marks'],
        ['CAPF AC Paper-II (200)', 'General Studies, Essay (EN/HI) & Comprehension (3 Hours)', '200 Marks'],
        ['PET/PST & Interview', '100m, 800m, Long Jump, Shot Put + UPSC Interview (150 Marks)', 'Grand Total 600 Marks']
      ],
      relaxationTable: STANDARD_RELAXATION('20–25 / 18–27 Years', '₹200 (CAPF AC) · SC/ST/Female ₹0'),
      physicalStandards: CAPF_PHYSICAL,
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://upsconline.nic.in', title: '🛡️ UPSC CAPF AC Portal', desc: 'Assistant Commandant Gazette' },
        { href: 'https://www.mha.gov.in', title: '🏛️ Ministry of Home Affairs', desc: 'IB ACIO, NIA & Security Portals' }
      ])
    },

    // --- 1.1.7 Central Ministries and Departments (4) ---
    'ministry-wise-vacancies': {
      organisation: 'Union Ministries (Finance, Labour/EPFO, Railways, Defence, Commerce)',
      qualification: '10th / 12th / Graduate / Technical (varies by Ministry Group A/B/C notification)',
      age_limit: '18–30 / 35 Years (Category Relaxations per DoPT)',
      pay_level: '7th CPC Level-2 (₹19,900) to Level-10 (₹56,100)',
      vacancies: 4500,
      apply_url: 'https://upsc.gov.in',
      summary: 'Direct ministry-wise recruitment including EPFO Enforcement Officer/APFC/SSA, ESIC UDC/SSO, Ministry of External Affairs, and Ministry of Finance subordinate cadres.',
      summary_or: 'EPFO, ESIC, ଅର୍ଥ ଓ ଶ୍ରମ ମନ୍ତ୍ରଣାଳୟ ସମେତ ବିଭିନ୍ନ କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟ ନିଯୁକ୍ତି।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–30 / 35 Years', '₹25–₹100 (SC/ST/Female ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://upsc.gov.in', title: '🏛️ UPSC Direct Recruitment', desc: 'EPFO EO/AO, APFC & Ministry Gazetted' },
        { href: 'https://www.epfindia.gov.in', title: '💼 EPFO Official Portal', desc: 'SSA & Steno Recruitment' }
      ])
    },
    'department-wise-recruitment': {
      organisation: 'CBDT / CBIC / CWC / CPWD / Geological Survey / IMD',
      qualification: '12th / Diploma / Graduate / M.Sc. (Department-specific)',
      age_limit: '18–30 / 32 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-4 (₹25,500) to Level-10 (₹56,100)',
      vacancies: 3200,
      apply_url: 'https://ssc.gov.in',
      summary: 'Department-wise central recruitment in Income Tax (CBDT), Customs & GST (CBIC), Central Water Commission (CWC Bhubaneswar), CPWD, and India Meteorological Dept (IMD Bhubaneswar).',
      summary_or: 'CBDT, CBIC, କେନ୍ଦ୍ରୀୟ ଜଳ ଆୟୋଗ (CWC), CPWD ଏବଂ ପାଣିପାଗ ବିଭାଗ (IMD) ନିଯୁକ୍ତି।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–32 Years', '₹100'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC & Dept Portals', desc: 'CGL, JE & Scientific Assistant' }])
    },
    'group-a-b-and-c-posts': {
      organisation: 'UPSC / SSC / Central Autonomous Bodies',
      qualification: 'Group A: Graduate/PG · Group B: Graduate/Diploma · Group C: 10th/12th/ITI',
      age_limit: '18–27 (Gr C) · 20–30 (Gr B) · 21–35 (Gr A)',
      pay_level: '7th CPC Level-1–5 (Group C) · Level-6–9 (Group B) · Level-10+ (Group A)',
      vacancies: 8000,
      apply_url: 'https://dopt.gov.in',
      summary: 'Classification of Central Civil Services under CCS (CCA) Rules into Group A (Gazetted Officers), Group B (Gazetted & Non-Gazetted), and Group C (Ministerial, Technical & MTS).',
      summary_or: 'କେନ୍ଦ୍ର ସରକାରୀ ଗ୍ରୁପ୍-A, ଗ୍ରୁପ୍-B ଏବଂ ଗ୍ରୁପ୍-C ପଦବୀର ଯୋଗ୍ୟତା ଓ ୭ମ ବେତନ ସ୍ତର ବିବରଣୀ।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–35 Years', '₹100 (SC/ST/Female ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://dopt.gov.in', title: '⚖️ DoPT Classification Rules', desc: 'Group A, B & C Service Norms' }])
    },
    'clerical-assistant-technical-and-support-posts': {
      organisation: 'SSC / Central Ministries / Autonomous Bodies',
      qualification: '10th (MTS) / 12th + Typing 35 WPM (JSA/LDC) / Graduate (ASO/Assistant) / ITI (Tech)',
      age_limit: '18–27 / 30 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-1 (₹18,000) to Level-6 (₹35,400)',
      vacancies: 5500,
      apply_url: 'https://ssc.gov.in',
      summary: 'Central clerical, junior secretariat assistant (JSA), stenographer, lab attendant, driver, and technical support vacancies across central offices in Bhubaneswar & Cuttack.',
      summary_or: 'କେନ୍ଦ୍ରୀୟ କାର୍ଯ୍ୟାଳୟରେ କ୍ଲର୍କ, JSA, ଆସିଷ୍ଟାଣ୍ଟ, ଡ୍ରାଇଭର୍ ଓ ବୈଷୟିକ ସହାୟକ ପଦବୀ।',
      examPatternTable: [
        ['CBT (Objective)', 'Reasoning, Quantitative Aptitude, English, General Awareness', '200 Marks'],
        ['Skill / Typing Test', '35 WPM English or 30 WPM Hindi Typing on Computer', 'Qualifying']
      ],
      relaxationTable: STANDARD_RELAXATION('18–30 Years', '₹100'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://ssc.gov.in', title: '📝 SSC Ministerial Portal', desc: 'LDC, JSA & Support Staff' }])
    },

    // --- 1.1.8 National Scientific and Technical Organisations (7) ---
    'isro': {
      organisation: 'Indian Space Research Organisation (ISRO Centralised Recruitment Board)',
      qualification: 'B.E./B.Tech 65% (Scientist/Engg SC) · 3-Yr Diploma (Tech Asst) · 10th + ITI (Technician-B)',
      age_limit: '18–28 / 30 Years (Scientist/SC) · 18–35 Years (Tech Asst / Technician-B)',
      pay_level: '7th CPC Level-3 (₹21,700 Tech-B) · Level-7 (₹44,900 TA) · Level-10 (₹56,100 Scientist-SC)',
      vacancies: 650,
      apply_url: 'https://www.isro.gov.in/Careers.html',
      summary: 'ISRO Scientist/Engineer-SC (VSSC, SDSC SHAR, URSC, SAC, LPSC), Technical Assistant, Scientific Assistant, and Technician-B recruitment.',
      summary_or: 'ISRO ବୈଜ୍ଞାନିକ/ଇଞ୍ଜିନିୟର-SC, ଟେକ୍ନିକାଲ୍ ଆସିଷ୍ଟାଣ୍ଟ ଏବଂ ଟେକ୍ନିସିଆନ୍-B ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written Test / CBT', 'Part-A Discipline Engg (80 Qs, 90m) + Part-B Aptitude/Ability (15 Qs, 30m)', '100 Marks (-1/3rd negative)'],
        ['Skill Test & Interview', 'Scientist-SC Interview (100 Marks, 60% Qual.) / Technician Skill Test', 'Merit (Written + Interview)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–35 Years', '₹250–₹750 (Refundable on Exam)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.isro.gov.in/Careers.html', title: '🚀 ISRO Careers Portal', desc: 'ICRB Scientist & Technician Notices' }])
    },
    'drdo': {
      organisation: 'Defence Research & Development Organisation (RAC & CEPTAM — ITR Chandipur Odisha)',
      qualification: 'B.E./B.Tech + GATE (Scientist-B via RAC) · Diploma/B.Sc (STA-B) · 10th + ITI (Technician-A)',
      age_limit: '18–28 Years (Scientist-B & CEPTAM STA-B/Tech-A; OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-2 (₹19,900 Tech-A) · Level-6 (₹35,400 STA-B) · Level-10 (₹56,100 Scientist-B)',
      vacancies: 1901,
      apply_url: 'https://www.drdo.gov.in',
      summary: 'DRDO Scientist-B (RAC) and CEPTAM STA-B / Technician-A recruitment including Odisha establishments ITR Chandipur & PXE Balasore.',
      summary_or: 'DRDO ବୈଜ୍ଞାନିକ-B (RAC) ଏବଂ CEPTAM STA-B / ଟେକ୍ନିସିଆନ୍-A (ITR ଚାନ୍ଦିପୁର ଓ PXE ବାଲେଶ୍ୱର) ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CEPTAM Tier-I (CBT)', 'Quant, Reasoning, GA, English, Basic Science (120 Qs · 90 Min)', '120 Marks (No negative)'],
        ['CEPTAM Tier-II / RAC Interview', 'Subject/Trade Specific CBT (100 Marks) + Trade Test / RAC Interview (Scientist-B)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('18–28 Years', '₹100 (SC/ST/Women/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://www.drdo.gov.in', title: '🔬 DRDO CEPTAM Portal', desc: 'STA-B, Technician-A & ITR Balasore' },
        { href: 'https://rac.gov.in', title: '🔬 DRDO RAC Portal', desc: 'Scientist-B via GATE' }
      ])
    },
    'barc-and-other-eligible-atomic-energy-organisations': {
      organisation: 'BARC / NPCIL / IREL (Chhatrapur Odisha) / HWB (Talcher) / AMD',
      qualification: 'B.E./B.Tech / M.Sc. (OCES/DGFS) · Diploma/B.Sc (Cat-I Trainee) · 10th/12th + ITI (Cat-II Trainee)',
      age_limit: '18–24 / 26 Years (Trainees & OCES) · OBC +3, SC/ST +5 Yrs',
      pay_level: 'Stipend ₹20,000–₹55,000/mo → Level-6 (₹35,400) / Level-7 (₹44,900) / Level-10 (₹56,100)',
      vacancies: 4374,
      apply_url: 'https://www.barc.gov.in',
      summary: 'Bhabha Atomic Research Centre (BARC), NPCIL, IREL (India) Limited OSCOM Chhatrapur (Ganjam), Heavy Water Board Talcher (Angul), and Atomic Minerals Directorate (AMD).',
      summary_or: 'BARC, NPCIL, IREL ଛତ୍ରପୁର (ଗଞ୍ଜାମ) ଏବଂ ହେଭି ୱାଟର ବୋର୍ଡ ତାଳଚେର ବୈଜ୍ଞାନିକ ଓ ଟ୍ରେନି ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Stage 1 & 2 CBT', 'Preliminary (Math 20, Science 20, GA 10) + Advanced Subject Test (50 Qs)', '150 Marks (+3 / -1 negative)'],
        ['Stage 3 Skill / Interview', 'Trade Skill Test (Cat-II) or BARC Selection Interview (OCES/Cat-I)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('18–26 Years', '₹100–₹500 (SC/ST/Women ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.barc.gov.in', title: '⚛️ BARC & DAE Portal', desc: 'OCES/DGFS & Stipendiary Trainees' }])
    },
    'csir-laboratories': {
      organisation: 'Council of Scientific & Industrial Research (CSIR-IMMT Bhubaneswar / Labs)',
      qualification: '10th + ITI (Tech-1) · Diploma/B.Sc (Tech Asst) · M.Sc/Ph.D. (Scientist) · Graduate (SO/ASO)',
      age_limit: '28 Years (Tech/TA) · 32 Years (Scientist) · 30 Years (CASE SO/ASO)',
      pay_level: '7th CPC Level-2 (₹19,900 Tech) · Level-6 (₹35,400 TA) · Level-11 (₹67,700 Scientist)',
      vacancies: 800,
      apply_url: 'https://www.csir.res.in',
      summary: 'CSIR Scientist, Technical Assistant, Technician, and CASE (Section Officer / ASO) recruitment across 37 national labs including CSIR-IMMT (Institute of Minerals & Materials Technology, Bhubaneswar).',
      summary_or: 'CSIR-IMMT ଭୁବନେଶ୍ୱର ସମେତ ଦେଶର ୩୭ଟି ଗବେଷଣାଗାରରେ ବୈଜ୍ଞାନିକ, TA, ଟେକ୍ନିସିଆନ୍ ଓ SO/ASO ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Paper-I & II (Tech/TA)', 'Mental Ability (50 Qs, 100 Marks) + GA/English + Concerned Subject (100 Qs)', '300 Marks'],
        ['CSIR CASE (SO/ASO)', 'Paper-I (GA+Eng 150) + Paper-II (Aptitude 200) + Paper-III (Desc 150) + CPT/Interview', '500 + 100 Marks']
      ],
      relaxationTable: STANDARD_RELAXATION('28–32 Years', '₹500 (SC/ST/Women/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://www.csir.res.in', title: '🧪 CSIR Official Portal', desc: 'CASE SO/ASO & Lab Notices' },
        { href: 'https://www.immt.res.in', title: '🧪 CSIR-IMMT Bhubaneswar', desc: 'Odisha CSIR Lab Vacancies' }
      ])
    },
    'icar-institutions': {
      organisation: 'ASRB / ICAR (NRRI Cuttack, CIFA Bhubaneswar, IIWM, CIWA)',
      qualification: 'M.Sc./Ph.D. + NET (ARS Scientist) · B.Sc. Agri/Bio (Technical Asst T-3) · 10th (Technician T-1)',
      age_limit: '21–32 Years (ARS Scientist) · 18–30 Years (T-1 / T-3 / Assistant)',
      pay_level: '7th CPC Level-3 (₹21,700 T-1) · Level-5 (₹29,200 T-3) · Academic Level-10 (₹57,700 Scientist)',
      vacancies: 1200,
      apply_url: 'https://www.asrb.org.in',
      summary: 'ICAR Agricultural Research Service (ARS), NET, Technical Staff (T-1/T-3), and Administrative roles across Odisha ICAR hubs: ICAR-NRRI (Cuttack), ICAR-CIFA (Kausalyaganga, Bhubaneswar), ICAR-IIWM, and ICAR-CIWA.',
      summary_or: 'ICAR-NRRI କଟକ, ICAR-CIFA ଭୁବନେଶ୍ୱରରେ କୃଷି ବୈଜ୍ଞାନିକ (ARS), ଟେକ୍ନିକାଲ୍ ଓ ପ୍ରଶାସନିକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['ARS Prelims & Mains', 'Prelims (150 Marks) + Mains Agricultural Discipline (240 Marks)', '240 + 60 Interview = 300 Marks'],
        ['Technician T-1 / Asst', 'GK (25), Math (25), Science (25), Social Science (25)', '100 Marks (-0.25 negative)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–32 Years', '₹500–₹1,000'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://www.asrb.org.in', title: '🌾 ASRB Official Portal', desc: 'ARS Scientist & ICAR-NET' },
        { href: 'https://icar.org.in', title: '🌾 ICAR Portal', desc: 'NRRI Cuttack & CIFA Bhubaneswar' }
      ])
    },
    'icmr-institutions': {
      organisation: 'Indian Council of Medical Research (ICMR-RMRC Bhubaneswar)',
      qualification: '10th/12th DMLT (Lab Tech) · B.Sc./M.Sc. Life Sciences (Technical Asst / Project Staff) · MBBS/Ph.D. (Scientist)',
      age_limit: '18–30 Years (Tech Asst / Technician) · 35–40 Years (Scientist B/C)',
      pay_level: '7th CPC Level-2 (₹19,900) · Level-6 (₹35,400 TA) · Level-10 (₹56,100 Scientist-B)',
      vacancies: 600,
      apply_url: 'https://www.icmr.gov.in',
      summary: 'ICMR Scientist-B/C, Technical Assistant, Technician-1, Laboratory Attendant, and Project Research posts including ICMR-RMRC (Regional Medical Research Centre, Bhubaneswar).',
      summary_or: 'ICMR-RMRC ଭୁବନେଶ୍ୱର ସମେତ ଜାତୀୟ ଚିକିତ୍ସା ଗବେଷଣା ପରିଷଦରେ ବୈଜ୍ଞାନିକ ଓ ଟେକ୍ନିସିଆନ୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (90 Min)', 'General Intelligence, Awareness, English + Domain Life Sciences/Lab Tech (100 Qs)', '100 Marks (-0.25 negative)'],
        ['Interview (Scientist)', 'Research Publication & Technical Interview (Scientist B/C)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('18–35 Years', '₹1,500 (SC/ST/Women/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://www.icmr.gov.in', title: '🧬 ICMR Official Portal', desc: 'Technical & Scientist Recruitment' },
        { href: 'https://www.rmrcbbsr.gov.in', title: '🧬 ICMR-RMRC Bhubaneswar', desc: 'Odisha Medical Research Posts' }
      ])
    },
    'other-central-research-bodies': {
      organisation: 'DST / DBT / NISER Bhubaneswar / ILS Bhubaneswar / CPRI',
      qualification: '12th / Graduate / M.Sc. / B.Tech / Ph.D. (Research & Scientific Technical Cadres)',
      age_limit: '28–35 Years (Technical/Scientific Officer; OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-6 (₹35,400) to Level-11 (₹67,700)',
      vacancies: 450,
      apply_url: 'https://www.niser.ac.in',
      summary: 'Central autonomous research institutes including NISER Jatni (Bhubaneswar), Institute of Life Sciences (ILS Bhubaneswar), CIPET, and Botanical/Zoological Survey of India.',
      summary_or: 'NISER ଜଟଣୀ (ଭୁବନେଶ୍ୱର), ILS ଭୁବନେଶ୍ୱର ଏବଂ ଅନ୍ୟାନ୍ୟ କେନ୍ଦ୍ରୀୟ ଗବେଷଣା ପ୍ରତିଷ୍ଠାନରେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Screening Test', 'Subject Aptitude + General Analytical Ability (100 Marks)', '100 Marks'],
        ['Trade Test / Interview', 'Laboratory Skill Test / Selection Committee Interview', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('28–35 Years', '₹500 (SC/ST/Women ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://www.niser.ac.in', title: '⚛️ NISER Bhubaneswar', desc: 'Scientific & Administrative Vacancies' },
        { href: 'https://www.ils.res.in', title: '🧬 ILS Bhubaneswar', desc: 'DBT Life Sciences Recruitment' }
      ])
    },

    // --- 1.1.9 Central Education and Teaching Recruitment (6) ---
    'kvs': {
      organisation: 'Kendriya Vidyalaya Sangathan (KVS — Bhubaneswar Region)',
      qualification: 'PRT: 12th + D.El.Ed + CTET-I · TGT: Graduate + B.Ed + CTET-II · PGT: PG (50%) + B.Ed',
      age_limit: '30 Years (PRT) · 35 Years (TGT) · 40 Years (PGT) · Women +10 Yrs Relaxation',
      pay_level: '7th CPC Level-6 (₹35,400 PRT) · Level-7 (₹44,900 TGT) · Level-8 (₹47,600 PGT)',
      vacancies: 13404,
      apply_url: 'https://kvsangathan.nic.in',
      summary: 'All-India KVS recruitment for PRT, TGT, PGT, Vice-Principal, Principal, and Non-Teaching (JSA/SSA/ASCO) across 60+ Kendriya Vidyalayas in Odisha (Bhubaneswar Region).',
      summary_or: 'କେନ୍ଦ୍ରୀୟ ବିଦ୍ୟାଳୟ ସଂଗଠନ (KVS ଭୁବନେଶ୍ୱର ରିଜିଅନ୍) PRT, TGT, PGT ଓ ଅଣ-ଶିକ୍ଷକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (180 Min)', '180 Objective MCQs (Proficiency, General Awareness, Perspectives on Ed, Subject)', '180 Marks (No negative)'],
        ['Demo Teaching & Interview', '30 Marks Demo Teaching + 30 Marks Interview (70:30 Weightage)', '60 Marks (Final Merit)']
      ],
      relaxationTable: STANDARD_RELAXATION('30–40 Years (Women +10 Yrs)', '₹1,500 (SC/ST/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://kvsangathan.nic.in', title: '🏫 KVS Official Portal', desc: 'PRT, TGT, PGT & Bhubaneswar Region' }])
    },
    'nvs': {
      organisation: 'Navodaya Vidyalaya Samiti (NVS — Bhopal/Regional)',
      qualification: 'TGT: Graduate (50%) + B.Ed + CTET-II · PGT: PG (50%) + B.Ed · Non-Teaching: 10th/12th/Grad',
      age_limit: '35 Years (TGT) · 40 Years (PGT) · 18–30 Years (JSA/MTS)',
      pay_level: '7th CPC Level-7 (₹44,900 TGT) · Level-8 (₹47,600 PGT) + Free Residential Quarters',
      vacancies: 3000,
      apply_url: 'https://navodaya.gov.in',
      summary: 'Residential Jawahar Navodaya Vidyalaya (JNV) TGT, PGT, Miscellaneous Teachers, Staff Nurse, and Non-Teaching (JSA, Lab Attendant, Catering) posts across all 30 Odisha districts.',
      summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାର ଜବାହର ନବୋଦୟ ବିଦ୍ୟାଳୟ (NVS) ରେ TGT, PGT ଓ ଅଣ-ଶିକ୍ଷକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (150–180 Min)', 'Reasoning, GA, Teaching Aptitude, Domain Subject, Language Competency', '150 Marks (-0.25 negative)'],
        ['Interview / Skill Test', 'Personal Interview (Teaching) or Typing/Skill Test (JSA)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('35–40 Years', '₹1,000–₹1,800 (SC/ST/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://navodaya.gov.in', title: '🏫 NVS Official Portal', desc: 'TGT, PGT & Non-Teaching Drives' }])
    },
    'central-government-schools': {
      organisation: 'NESTS (EMRS) / Sainik School Bhubaneswar & Sambalpur / Atomic Energy Schools',
      qualification: 'Graduate + B.Ed + CTET/STET (TGT/PRT) · PG + B.Ed (PGT) · 10th/12th (Hostel Warden/JSA)',
      age_limit: '35 Years (TGT/Warden) · 40 Years (PGT) · 45 Years (Principal)',
      pay_level: '7th CPC Level-6 (₹35,400) to Level-12 (₹78,800 Principal)',
      vacancies: 10391,
      apply_url: 'https://emrs.tribal.gov.in',
      summary: 'Eklavya Model Residential Schools (EMRS — 100+ schools in Odisha tribal districts), Sainik School Bhubaneswar & Sambalpur, and Atomic Energy Central Schools (AEES).',
      summary_or: 'ଏକଲବ୍ୟ ଆଦର୍ଶ ଆବାସିକ ବିଦ୍ୟାଳୟ (EMRS), ସୈନିକ ସ୍କୁଲ ଭୁବନେଶ୍ୱର ଓ ସମ୍ବଲପୁର ଶିକ୍ଷକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['OMR / CBT (150 Marks)', 'GA, Reasoning, ICT, Teaching Aptitude, Domain Subject (120) + Language Qual (30)', '150 Marks (-0.25 negative)'],
        ['Interview (Principal/PGT)', 'Document Verification & Subject Interview (where notified)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('35–40 Years', '₹1,000–₹1,500 (SC/ST/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://emrs.tribal.gov.in', title: '🏫 NESTS EMRS Portal', desc: 'Odisha Tribal School Recruitment' }])
    },
    'central-universities': {
      organisation: 'Central University of Odisha (CUO Koraput) / Central Universities (CU-Chayan)',
      qualification: 'Assistant Professor: PG (55%) + UGC-NET / Ph.D. · Non-Teaching: 10th/12th/Graduate',
      age_limit: 'No upper age limit for Assistant Professor (UGC Norms) · 27–35 Years (Non-Teaching)',
      pay_level: 'UGC 7th CPC Academic Level-10 (₹57,700) to Level-14 (₹1,44,200 Professor)',
      vacancies: 1800,
      apply_url: 'https://curec.samarth.ac.in',
      summary: 'Central University of Odisha (Koraput) and 45+ Central Universities faculty (Assistant/Associate Professor, Professor) and non-teaching (UDC, LDC, Lab Asst) recruitment via CU-Chayan.',
      summary_or: 'ଓଡ଼ିଶା କେନ୍ଦ୍ରୀୟ ବିଶ୍ୱବିଦ୍ୟାଳୟ (କୋରାପୁଟ) ସମେତ କେନ୍ଦ୍ରୀୟ ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ଅଧ୍ୟାପକ ଓ କର୍ମଚାରୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['API Shortlisting (Faculty)', 'UGC 2018 Academic Performance Indicator Score + Research Publications', '100-Point Screening'],
        ['Interview / Non-Teaching CBT', 'Selection Committee Interview (Faculty) or NTA CBT (Group B/C)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('No Cap (Faculty) · 27–35 Yrs (Staff)', '₹1,000 (SC/ST/Women/PwBD ₹0)'),
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([
        { href: 'https://curec.samarth.ac.in', title: '🎓 CU-Chayan Portal', desc: 'Central University Faculty Portal' },
        { href: 'https://cuo.ac.in', title: '🎓 Central University of Odisha', desc: 'Koraput Faculty & Staff Notices' }
      ])
    },
    'iits-nits-and-other-centrally-funded-institutions': {
      organisation: 'IIT Bhubaneswar / NIT Rourkela / IIM Sambalpur / IISER Berhampur / IIIT',
      qualification: 'Faculty: Ph.D. with First Class · Technical/Admin Staff: B.Tech / Diploma / Graduate / 12th',
      age_limit: '27–35 Years (Non-Teaching JTS/JA/Superintendent) · 35–45 Years (Faculty)',
      pay_level: '7th CPC Level-3 (₹21,700) to Level-7 (₹44,900) Staff · Level-10/12 (₹57,700–₹1,01,500 Faculty)',
      vacancies: 950,
      apply_url: 'https://www.iitbbs.ac.in',
      summary: 'Direct recruitment in Odisha’s premier Centrally Funded Technical Institutions (CFTIs): IIT Bhubaneswar (Argul), NIT Rourkela, IIM Sambalpur, and IISER Berhampur.',
      summary_or: 'IIT ଭୁବନେଶ୍ୱର, NIT ରାଉରକେଲା, IIM ସମ୍ବଲପୁର ଏବଂ IISER ବ୍ରହ୍ମପୁରରେ ଅଧ୍ୟାପକ ଓ ଟେକ୍ନିକାଲ୍/ଅଣ-ଶିକ୍ଷକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Screening CBT / Written', 'General Aptitude, Computer Literacy, English & Technical Trade (100 Marks)', '100 Marks'],
        ['Skill Test / Seminar', 'Lab Trade Test (Tech Staff) or Teaching Seminar + Board Interview (Faculty)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('27–35 Years (Staff)', '₹500 (SC/ST/Women/PwBD ₹0)'),
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([
        { href: 'https://www.iitbbs.ac.in', title: '🏛️ IIT Bhubaneswar', desc: 'Faculty & Staff Recruitment' },
        { href: 'https://www.nitrkl.ac.in', title: '🏛️ NIT Rourkela', desc: 'Technical & Admin Posts' }
      ])
    },
    'teaching-non-teaching-and-research-positions': {
      organisation: 'UGC / NCERT / RIE Bhubaneswar / CBSE / AICTE',
      qualification: 'NET/JRF (Research & Lectureship) · CTET (School Teaching) · Graduate/12th (CBSE/NCERT Staff)',
      age_limit: '30 Years (UGC JRF) · No Upper Age Limit (Assistant Professor / NET)',
      pay_level: 'JRF ₹37,000/mo · SRF ₹42,000/mo · Level-6–10 (CBSE/NCERT Academic & Admin)',
      vacancies: 2200,
      apply_url: 'https://ugcnet.nta.ac.in',
      summary: 'National eligibility and research fellowships (UGC-NET/JRF, CSIR-NET, CTET), Regional Institute of Education (RIE Bhubaneswar), and CBSE/NCERT academic & administrative posts.',
      summary_or: 'UGC-NET/JRF, CSIR-NET, CTET, RIE ଭୁବନେଶ୍ୱର ଏବଂ CBSE/NCERT ଶିକ୍ଷା ଓ ଗବେଷଣା ପଦବୀ।',
      examPatternTable: [
        ['UGC-NET CBT (3 Hours)', 'Paper-I Teaching & Research Aptitude (50 Qs) + Paper-II Subject (100 Qs)', '300 Marks (No Negative)'],
        ['CBSE / NCERT Recruitment', 'CBT Objective + Skill Test / Interview (Asst Secretary / Supt / JSA)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('30 Years (JRF) · No Cap (NET)', '₹1,150 (OBC ₹600 · SC/ST ₹325)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://ugcnet.nta.ac.in', title: '📚 NTA UGC-NET Portal', desc: 'JRF & Assistant Professor Eligibility' },
        { href: 'https://ctet.nic.in', title: '📚 CBSE CTET Portal', desc: 'Central Teacher Eligibility Test' }
      ])
    },

    // --- 1.1.10 Healthcare and Medical Recruitment (5) ---
    'aiims-and-central-medical-institutions': {
      organisation: 'AIIMS Bhubaneswar / AIIMS Delhi (NORCET & CRE)',
      qualification: 'B.Sc. Nursing / GNM + 2 Yrs Exp (NORCET) · MBBS/MD/MS (Faculty/SR) · 10th/12th/Dip (CRE)',
      age_limit: '18–30 Years (NORCET Nursing Officer) · 18–35 Years (CRE) · 37–50 Years (SR/Faculty)',
      pay_level: '7th CPC Level-7 (₹44,900 Nursing Officer) · Level-11 (₹67,700 SR) · Level-12+ (Faculty)',
      vacancies: 5500,
      apply_url: 'https://www.aiimsexams.ac.in',
      summary: 'All India Institute of Medical Sciences (including AIIMS Bhubaneswar, Sijua) Nursing Officer Recruitment Common Eligibility Test (NORCET), Common Recruitment Exam (CRE), and Senior Resident/Faculty drives.',
      summary_or: 'AIIMS ଭୁବନେଶ୍ୱର ସମେତ ଦେଶର ସମସ୍ତ AIIMS ରେ NORCET ନର୍ସିଂ ଅଫିସର୍, CRE ଏବଂ ଡାକ୍ତର ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['NORCET Stage-I Prelims', '100 MCQs (80 Nursing + 20 GK/Aptitude · 90 Min)', '100 Marks (-1/3rd negative · Qual)'],
        ['NORCET Stage-II Mains', '160 Case-Based Nursing Clinical MCQs (180 Min)', '160 Marks (-1/3rd negative · Merit)']
      ],
      relaxationTable: STANDARD_RELAXATION('18–30 / 35 Years', '₹3,000 (SC/ST/EWS ₹2,400 · PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([
        { href: 'https://www.aiimsexams.ac.in', title: '🏥 AIIMS Exams Portal', desc: 'NORCET & CRE Notifications' },
        { href: 'https://aiimsbhubaneswar.nic.in', title: '🏥 AIIMS Bhubaneswar', desc: 'Odisha AIIMS Faculty & Staff' }
      ])
    },
    'central-health-services': {
      organisation: 'UPSC Combined Medical Services (CMS) / ESIC / CGHS',
      qualification: 'MBBS Degree (Passed written & practical parts of final MBBS + Compulsory Internship)',
      age_limit: 'Not exceeding 32 Years as on 1st August (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-10 (₹56,100 + 20% NPA = ~₹1,05,000+/mo)',
      vacancies: 827,
      apply_url: 'https://upsconline.nic.in',
      summary: 'UPSC Combined Medical Services (CMS) for Medical Officer in CHS, Indian Railways (IRHS), New Delhi Municipal Council, and ESIC Hospitals (Bhubaneswar / Rourkela / Angul).',
      summary_or: 'UPSC CMS ଏବଂ ESIC ହସ୍ପିଟାଲ୍ (ଭୁବନେଶ୍ୱର/ରାଉରକେଲା/ଅନୁଗୁଳ) ମେଡିକାଲ୍ ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Paper-I (CBT · 2 Hours)', 'General Medicine (96 Qs) & Paediatrics (24 Qs)', '250 Marks (-1/3rd negative)'],
        ['Paper-II (CBT · 2 Hours)', 'Surgery (40), Gynaecology & Obs (40), Preventive & Social Medicine (40)', '250 Marks (-1/3rd negative)'],
        ['Personality Test', 'UPSC Medical Board Interview', '100 Marks (Total 600)']
      ],
      relaxationTable: STANDARD_RELAXATION('Up to 32 Years', '₹200 (SC/ST/Female/PwBD ₹0)'),
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([{ href: 'https://upsconline.nic.in', title: '🩺 UPSC CMS Portal', desc: 'MBBS Officer Recruitment' }])
    },
    'nursing-and-paramedical-posts': {
      organisation: 'ESIC / AIIMS CRE / RRB / JIPMER / Safdarjung',
      qualification: 'B.Sc. Nursing / GNM (Nursing) · D.Pharm / B.Pharm (Pharmacist) · DMLT / BMLT / BPT',
      age_limit: '18–30 / 35 / 37 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: '7th CPC Level-5 (₹29,200 Pharmacist/MLT) to Level-7 (₹44,900 Nursing Officer)',
      vacancies: 3800,
      apply_url: 'https://www.esic.gov.in',
      summary: 'Central government Staff Nurse, Nursing Officer, Pharmacist, Medical Lab Technologist (MLT), Radiographer, and Physiotherapist posts in ESIC, AIIMS, and Central Govt Hospitals.',
      summary_or: 'ESIC, AIIMS ଏବଂ କେନ୍ଦ୍ରୀୟ ହସ୍ପିଟାଲରେ ନର୍ସିଂ ଅଫିସର୍, ଫାର୍ମାସିଷ୍ଟ ଏବଂ MLT ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Exam (120 Min)', 'Technical/Nursing/Pharmacy Subject (100 Qs) + GA/Aptitude (25 Qs)', '125 Marks (-0.25 negative)'],
        ['Document & Skill Verification', 'State Nursing / Pharmacy Council Registration Verification', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('18–35 Years', '₹500 (SC/ST/Female ₹250)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.esic.gov.in', title: '🏥 ESIC Recruitment', desc: 'Paramedical & Nursing Officer' }])
    },
    'medical-research-institutions': {
      organisation: 'ICMR / NIPER / AIIMS Research / NCDC / NIV',
      qualification: 'M.Sc. / M.Pharm / Ph.D. / MBBS / B.Sc. MLT (Research Fellow, Project Tech, Scientist)',
      age_limit: '28–35 Years (JRF/SRF/Tech) · 35–40 Years (Scientist)',
      pay_level: 'ICMR/DBT JRF ₹37,000 + HRA · Level-6–11 (Regular Technical & Scientist)',
      vacancies: 500,
      apply_url: 'https://www.icmr.gov.in',
      summary: 'Biomedical, epidemiology, and clinical research openings across ICMR institutes (including RMRC Bhubaneswar), National Centre for Disease Control (NCDC), and NIPER.',
      summary_or: 'ICMR-RMRC ଭୁବନେଶ୍ୱର, NCDC ଏବଂ NIPER ରେ ଚିକିତ୍ସା ଗବେଷଣା (Research) ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['ICMR-JRF / Written CBT', 'Aptitude (50 Qs) + Biomedical / Social Sciences (100 Qs)', '150 Marks'],
        ['Interview / Skill Test', 'Research Proposal & Technical Panel Interview', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('28–40 Years', '₹1,500 (SC/ST/PwBD ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.icmr.gov.in', title: '🧬 ICMR Research Portal', desc: 'JRF, Project & Scientist Posts' }])
    },
    'public-health-and-laboratory-positions': {
      organisation: 'FSSAI / NABL / Central Drugs Standard Control (CDSCO) / NHM',
      qualification: 'B.Sc./M.Sc. Chemistry, Microbiology, Food Tech, Biotechnology, or Pharmacy',
      age_limit: '21–30 / 35 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-6 (₹35,400 Food Analyst/TA) to Level-10 (₹56,100 Technical Officer)',
      vacancies: 750,
      apply_url: 'https://www.fssai.gov.in',
      summary: 'Food Safety & Standards Authority of India (FSSAI) Technical Officer, Central Food Safety Officer (CFSO), CDSCO Drug Inspector (UPSC), and Public Health Lab Microbiologist posts.',
      summary_or: 'FSSAI ଟେକ୍ନିକାଲ୍ ଅଫିସର୍, ଫୁଡ୍ ସେଫ୍ଟି ଅଫିସର୍, CDSCO ଡ୍ରଗ୍ ଇନ୍ସପେକ୍ଟର ଏବଂ ଲାବୋରେଟୋରୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['CBT Stage-I (120 Min)', 'General Aptitude (40) + FSSAI/Food/Pharma Functional Knowledge (80)', '480 Marks (+4 / -1 negative)'],
        ['CBT Stage-II / Interview', 'Written Descriptive/Objective + Interview (Technical Officer)', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('21–35 Years', '₹1,500 (SC/ST/Women ₹500)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.fssai.gov.in', title: '🔬 FSSAI Careers Portal', desc: 'CFSO, Technical Officer & Lab' }])
    },

    // --- 1.1.11 Law, Courts and Parliamentary Services (5) ---
    'supreme-court-recruitment': {
      organisation: 'Supreme Court of India (SCI, New Delhi)',
      qualification: "Bachelor's Degree + 35 WPM English Typing (JCA) · Law Degree (Law Clerk-cum-Research Associate)",
      age_limit: '18–30 Years (Junior Court Assistant) · 20–32 Years (Law Clerk)',
      pay_level: '7th CPC Level-6 (₹35,400 JCA — Gross ~₹72,000/mo) · ₹80,000/mo Consolidated (Law Clerk)',
      vacancies: 300,
      apply_url: 'https://www.sci.gov.in',
      summary: 'Supreme Court of India Junior Court Assistant (JCA), Senior Personal Assistant, Court Master, and Law Clerk-cum-Research Associate direct recruitments.',
      summary_or: 'ଭାରତର ସର୍ବୋଚ୍ଚ ନ୍ୟାୟାଳୟ (Supreme Court) ଜୁନିଅର କୋର୍ଟ ଆସିଷ୍ଟାଣ୍ଟ (JCA) ଓ ଲ କ୍ଲର୍କ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Objective CBT (125 Qs)', 'English (50), General Aptitude (25), GA (25), Computer (25) · 2 Hours', '125 Marks (-0.25 negative)'],
        ['Typing & Descriptive Test', '35 WPM Typing (10 Min) + Descriptive Essay/Comprehension (100 Marks)', 'Merit + Interview']
      ],
      relaxationTable: STANDARD_RELAXATION('18–30 Years', '₹1,000 (SC/ST/PwBD ₹250)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.sci.gov.in', title: '⚖️ Supreme Court Recruitment', desc: 'JCA, SPA & Law Clerk Notices' }])
    },
    'central-tribunals': {
      organisation: 'CAT (Cuttack Bench) / NCLT / DRT (Cuttack) / Armed Forces Tribunal',
      qualification: 'LL.B. / Graduate / Stenographer / Law Graduate (for Registrar, Section Officer, Court Officer, Steno)',
      age_limit: '21–35 Years (Direct) · Up to 56 Years (Deputation)',
      pay_level: '7th CPC Level-6 (₹35,400) to Level-11 (₹67,700)',
      vacancies: 250,
      apply_url: 'https://cgat.gov.in',
      summary: 'Central Administrative Tribunal (CAT Cuttack Bench), National Company Law Tribunal (NCLT Cuttack), Debt Recovery Tribunal (DRT Cuttack), and AFT administrative & legal staff.',
      summary_or: 'CAT କଟକ ବେଞ୍ଚ, NCLT କଟକ ଏବଂ DRT କଟକ ସମେତ କେନ୍ଦ୍ରୀୟ ଟ୍ରିବ୍ୟୁନାଲ୍‌ରେ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Skill Test', 'General English, Legal/Procedural Aptitude, Computer & Stenography', '100 Marks'],
        ['Interview / DV', 'Tribunal Selection Board Interview', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('21–35 Years', '₹0–₹500'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://cgat.gov.in', title: '⚖️ CAT Official Portal', desc: 'Cuttack Bench & Tribunal Notices' }])
    },
    'legal-officers-and-law-researchers': {
      organisation: 'UPSC / IBPS SO Law / SEBI Legal / PSUs (CLAT PG) / Law Commission',
      qualification: 'LL.B. (3-Year / 5-Year Integrated) + Bar Council Enrollment (2–5 Yrs Bar Exp for UPSC APP/Legal)',
      age_limit: '21–30 / 35 Years (IBPS/SEBI/UPSC Legal Officer)',
      pay_level: '7th CPC Level-10 (₹56,100 Public Prosecutor) to Scale-I/II Officer (₹48,480–₹64,820)',
      vacancies: 400,
      apply_url: 'https://upsc.gov.in',
      summary: 'Assistant Public Prosecutor (CBI/NIA via UPSC), Legal Officer Grade-A (SEBI/RBI/IBPS SO), PSU Law Officer (via CLAT-PG), and Judicial/Law Researchers.',
      summary_or: 'CBI/NIA ପବ୍ଲିକ୍ ପ୍ରୋସିକ୍ୟୁଟର (UPSC), IBPS SO ଲ, SEBI ଲିଗାଲ୍ ଏବଂ PSU ଲ ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written CBT / CLAT-PG', 'Constitutional, Criminal (BNS/BNSS/BSA), Corporate & Procedural Law', '150–300 Marks'],
        ['Interview', 'Legal Panel Interview & Bar Experience Assessment', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('21–35 Years', '₹100–₹850'),
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([{ href: 'https://upsc.gov.in', title: '⚖️ UPSC Legal & CBI APP', desc: 'Law Officer & Prosecutor Notices' }])
    },
    'court-assistants-and-administrative-posts': {
      organisation: 'Supreme Court / High Courts / District Courts / e-Courts',
      qualification: "Bachelor's Degree + Computer Knowledge + Typing (30–35 WPM) / Stenography",
      age_limit: '18–30 / 32 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-4 (₹25,500) to Level-7 (₹44,900 Court Master/Translator)',
      vacancies: 600,
      apply_url: 'https://www.sci.gov.in',
      summary: 'Court Assistant, Junior Translator, Judicial Assistant, and Stenographer roles in Supreme Court and Central Judicial Academies.',
      summary_or: 'ନ୍ୟାୟାଳୟ ସହାୟକ, ଅନୁବାଦକ (Translator) ଏବଂ ଷ୍ଟେନୋଗ୍ରାଫର୍ ପ୍ରଶାସନିକ ପଦବୀ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Objective + Descriptive', 'English Comprehension, General Knowledge, Legal Terms & Essay', '100–200 Marks'],
        ['Computer & Typing Test', '35 WPM Typing + MS Word/Excel Formatting', 'Qualifying']
      ],
      relaxationTable: STANDARD_RELAXATION('18–32 Years', '₹500–₹1,000'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://www.sci.gov.in', title: '⚖️ SCI & Courts Portal', desc: 'Assistant & Translator Posts' }])
    },
    'parliamentary-and-legislative-support-positions': {
      organisation: 'Lok Sabha Secretariat / Rajya Sabha Secretariat (Parliament of India)',
      qualification: 'Graduate / PG (Research Officer, Parliamentary Reporter 160 WPM, Executive/Protocol Asst)',
      age_limit: '21–27 / 30 / 40 Years (Post-wise + Category Relaxations)',
      pay_level: '7th CPC Level-7 (₹44,900) to Level-10 (₹56,100 Parliamentary Reporter/RO)',
      vacancies: 200,
      apply_url: 'https://sansad.in',
      summary: 'Parliament of India Lok Sabha & Rajya Sabha Secretariat Parliamentary Reporter, Research/Reference Assistant, Translator, Security Assistant, and Executive/Legislative Officer posts.',
      summary_or: 'ଭାରତୀୟ ସଂସଦ (ଲୋକସଭା ଓ ରାଜ୍ୟସଭା ସଚିବାଳୟ) ରିପୋର୍ଟର୍, ଗବେଷଣା ଓ ପ୍ରଶାସନିକ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Prelims (Objective)', 'GK & Current Affairs, Parliamentary Procedure, English/Hindi', '100–200 Marks'],
        ['Mains / Shorthand Skill', 'Descriptive Papers or 160 WPM Shorthand (Reporter) + Interview', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('21–30 / 40 Years', '₹0–₹300'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://sansad.in', title: '🏛️ Parliament of India (sansad.in)', desc: 'Lok Sabha & Rajya Sabha Recruitment' }])
    },

    // --- 1.1.12 Other National Recruitment (6) ---
    'postal-services': {
      organisation: 'Department of Posts, Ministry of Communications (Odisha Postal Circle)',
      qualification: '10th/12th/Graduate (Postal Assistant / Sorting Assistant via SSC CGL; Postman / MTS via Circle)',
      age_limit: '18–27 Years (PA/SA/Postman) · 18–25 Years (MTS)',
      pay_level: '7th CPC Level-1 (₹18,000 MTS) · Level-3 (₹21,700 Postman) · Level-4 (₹25,500 PA/SA)',
      vacancies: 3500,
      apply_url: 'https://www.indiapost.gov.in',
      summary: 'Odisha Postal Circle (Bhubaneswar HQ) Postal Assistant (PA), Sorting Assistant (SA), Mail Guard, Postman, and IPPB Executive posts.',
      summary_or: 'ଓଡ଼ିଶା ଡାକ ସର୍କଲ (ଭୁବନେଶ୍ୱର) ପୋଷ୍ଟାଲ୍ ଆସିଷ୍ଟାଣ୍ଟ, ସର୍ଟିଂ ଆସିଷ୍ଟାଣ୍ଟ ଓ ପୋଷ୍ଟମ୍ୟାନ୍ ନିଯୁକ୍ତି।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–27 Years', '₹100 (SC/ST/Female ₹0)'),
      payProgression: PAY_L1_TO_L6,
      referenceLinks: refs([{ href: 'https://www.indiapost.gov.in', title: '📮 India Post Official Portal', desc: 'Odisha Postal Circle Notices' }])
    },
    'india-post-gds-and-other-notified-posts': {
      organisation: 'India Post GDS Online (Odisha Postal Circle — 23 Divisions)',
      qualification: '10th Pass (Mathematics & English mandatory) + Studied Odia as Compulsory/Elective in 10th',
      age_limit: '18–40 Years (OBC +3, SC/ST +5, PwBD +10 Yrs)',
      pay_level: 'TRCA Slab: ₹12,000–₹29,380 (BPM) · ₹10,000–₹24,470 (ABPM / Dak Sevak) + DA',
      vacancies: 44228,
      apply_url: 'https://indiapostgdsonline.gov.in',
      summary: 'Gramin Dak Sevak (Branch Postmaster BPM & Assistant BPM) recruitment across all 23 Postal Divisions of Odisha — purely 10th Board marks merit-based selection (no written exam).',
      summary_or: 'ଓଡ଼ିଶା ଡାକ ସର୍କଲ ଗ୍ରାମୀଣ ଡାକ ସେବକ (GDS — BPM ଓ ABPM) ନିଯୁକ୍ତି (ବିନା ପରୀକ୍ଷାରେ ଦଶମ ମାର୍କ ଆଧାରରେ ଚୟନ)।',
      examPatternTable: [
        ['Merit List (No Written Exam)', 'System-generated 10th Standard Board Percentage Merit List', '100% 10th Marks Merit'],
        ['Document Verification', 'Original 10th Marksheet, Odia Proof, Caste/Residence & Computer Certificate', 'Division-Level DV']
      ],
      relaxationTable: STANDARD_RELAXATION('18–40 Years', '₹100 (SC/ST/Female/PwBD ₹0)'),
      payProgression: [{ label: 'ABPM Entry', pay: 10000 }, { label: 'BPM Entry', pay: 12000 }, { label: 'ABPM Max', pay: 24470 }, { label: 'BPM Max', pay: 29380 }],
      referenceLinks: refs([{ href: 'https://indiapostgdsonline.gov.in', title: '📮 India Post GDS Online', desc: 'Odisha Circle Division Merit Lists' }])
    },
    'public-broadcasting-and-communication-organisations': {
      organisation: 'Prasar Bharati (Doordarshan Kendra / Akashvani Cuttack & Bhubaneswar) / BSNL',
      qualification: 'Graduate / PG Diploma in Journalism (IIS/Reporter) · B.Tech ECE/IT (BSNL JTO/MT)',
      age_limit: '21–30 / 35 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-6/7 (₹35,400–₹44,900) · BSNL E-1/E-2 IDA Scale (₹16,400–₹40,500)',
      vacancies: 400,
      apply_url: 'https://prasarbharati.gov.in',
      summary: 'Prasar Bharati (Doordarshan / All India Radio Cuttack, Bhubaneswar, Sambalpur, Jeypore), Indian Information Service (UPSC), and BSNL Telecom Officer openings.',
      summary_or: 'ପ୍ରସାର ଭାରତୀ (ଆକାଶବାଣୀ ଓ ଦୂରଦର୍ଶନ କଟକ/ଭୁବନେଶ୍ୱର) ଏବଂ BSNL ଟେଲିକମ୍ ଅଫିସର୍ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['Written / Skill Assessment', 'Media/Journalism/Telecom Aptitude + Odia/English Language Proficiency', '100–200 Marks'],
        ['Voice / Interview Test', 'Broadcast Audition / Panel Interview', 'Merit']
      ],
      relaxationTable: STANDARD_RELAXATION('21–35 Years', '₹500 (SC/ST/Women ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://prasarbharati.gov.in', title: '📻 Prasar Bharati Portal', desc: 'AIR & Doordarshan Vacancies' }])
    },
    'survey-statistics-and-data-collection': {
      organisation: 'UPSC ISS / NSSO (FOD Odisha) / Registrar General (Census) / MoSPI',
      qualification: 'PG in Statistics (UPSC ISS) · Graduate with Statistics/Math (SSC CGL JSO / Statistical Investigator)',
      age_limit: '21–30 / 32 Years (OBC +3, SC/ST +5 Yrs)',
      pay_level: '7th CPC Level-6 (₹35,400 JSO/SI) · Level-10 (₹56,100 Indian Statistical Service)',
      vacancies: 450,
      apply_url: 'https://upsconline.nic.in',
      summary: 'UPSC Indian Statistical Service (ISS), National Sample Survey Office (NSSO Bhubaneswar/Sambalpur), Census Directorate Odisha, and SSC JSO / Statistical Investigator posts.',
      summary_or: 'UPSC ଭାରତୀୟ ପରିସଂଖ୍ୟାନ ସେବା (ISS), NSSO ଭୁବନେଶ୍ୱର ଏବଂ SSC JSO ପରିସଂଖ୍ୟାନ ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['ISS Written (1,000 Marks)', 'Gen English (100), GS (100) + 4 Statistics Papers (200 each = 800)', '1,000 Marks'],
        ['Personality Test', 'UPSC Interview', '200 Marks (Total 1,200)']
      ],
      relaxationTable: STANDARD_RELAXATION('21–32 Years', '₹200 (SC/ST/Female ₹0)'),
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([{ href: 'https://upsconline.nic.in', title: '📊 UPSC ISS & MoSPI Portal', desc: 'Statistical Service & NSSO' }])
    },
    'audit-accounts-and-taxation': {
      organisation: 'CAG of India (AG Odisha Bhubaneswar) / CBDT / CBIC / UPSC ICAS',
      qualification: "Bachelor's Degree (Commerce/Accounts preferred for AAO; Any stream for Auditor/Accountant)",
      age_limit: '18–27 / 30 Years (SSC CGL Auditor/AAO) · 21–32 Years (UPSC IA&AS)',
      pay_level: '7th CPC Level-5 (₹29,200 Auditor) · Level-8 (₹47,600 AAO) · Level-10 (₹56,100 IA&AS)',
      vacancies: 3200,
      apply_url: 'https://cag.gov.in',
      summary: 'Office of the Principal Accountant General (A&E / Audit) Odisha, Bhubaneswar — Assistant Audit Officer (AAO), Auditor, Accountant, and Tax Assistant (CBDT/CBIC) via SSC CGL & UPSC.',
      summary_or: 'CAG (AG ଓଡ଼ିଶା ଭୁବନେଶ୍ୱର) ଅଡିଟର, ଆକାଉଣ୍ଟାଣ୍ଟ, AAO ଏବଂ ଆୟକର/GST ଟ୍ୟାକ୍ସ ଆସିଷ୍ଟାଣ୍ଟ ନିଯୁକ୍ତି।',
      examPatternTable: SSC_CGL_TABLE,
      relaxationTable: STANDARD_RELAXATION('18–30 Years', '₹100 (SC/ST/Female ₹0)'),
      payProgression: PAY_L4_TO_L10,
      referenceLinks: refs([{ href: 'https://cag.gov.in', title: '📒 CAG of India Portal', desc: 'AG Odisha & Audit Cadre Rules' }])
    },
    'other-statutory-and-autonomous-bodies': {
      organisation: 'UPSC IES / Geo-Scientist / UIDAI / FSSAI / TRAI / BIS / FCI',
      qualification: 'B.E./B.Tech (IES / BIS) · M.Sc. Geology (UPSC Geo-Scientist) · Graduate (FCI AG-III)',
      age_limit: '21–30 / 32 Years (UPSC IES/Geo-Scientist) · 18–28 Years (FCI/BIS)',
      pay_level: '7th CPC Level-5 (₹29,200 FCI) to Level-10 (₹56,100 UPSC IES / BIS Scientist-B)',
      vacancies: 3000,
      apply_url: 'https://upsc.gov.in',
      summary: 'UPSC Engineering Services (IES/ESE), Combined Geo-Scientist, Bureau of Indian Standards (BIS Bhubaneswar), Food Corporation of India (FCI Odisha), and UIDAI statutory recruitment.',
      summary_or: 'UPSC ଇଞ୍ଜିନିୟରିଂ ସର୍ଭିସେସ୍ (IES), ଜିଓ-ସାଇଣ୍ଟିଷ୍ଟ, BIS, FCI ଓଡ଼ିଶା ଏବଂ UIDAI ନିଯୁକ୍ତି।',
      examPatternTable: [
        ['IES Prelims (500 Marks)', 'Paper-I GS & Engg Aptitude (200) + Paper-II Engg Discipline (300)', '500 Marks (-1/3rd negative)'],
        ['IES Mains (600) + Interview (200)', '2 Conventional Engineering Papers (300 each) + UPSC Interview', 'Grand Total 1,300 Marks']
      ],
      relaxationTable: STANDARD_RELAXATION('21–30 / 32 Years', '₹200 (SC/ST/Female ₹0)'),
      payProgression: PAY_L10_TO_L18,
      referenceLinks: refs([
        { href: 'https://upsc.gov.in', title: '⚙️ UPSC IES & Geo-Scientist', desc: 'Central Engineering Services' },
        { href: 'https://fci.gov.in', title: '🌾 FCI Recruitment Portal', desc: 'FCI Odisha AG-III & Manager' }
      ])
    }
  };

  root.CSO_NATIONAL_JOBS_1_1 = BRANCHES;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BRANCHES;
  }
})(typeof window !== 'undefined' ? window : globalThis);
