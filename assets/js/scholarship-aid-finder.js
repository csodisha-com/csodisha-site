/**
 * Common Sense Odisha — Interactive Odisha Scholarship & Student Financial Aid Finder
 * (/schemes/ & /admissions/, v431)
 * Covers 8 verified State Scholarship Portal (scholarship.odisha.gov.in) schemes with
 * income ceilings, marks/category rules, concurrent stacking flags, 8-item OSSP Fresh & Renewal
 * checklist, .ics deadline reminders (window.CSOCalendarExport), and Saved Alerts integration.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOScholarshipAidFinder = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOScholarshipAidFinder = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v431';
  var ROOT_ID = 'cso-scholarship-aid-finder-root';
  var PREFS_KEY = 'cso_scholarship_finder_prefs_v1';
  var CHECKLIST_KEY = 'cso_scholarship_renewal_checklist_v1';
  var OSSP_URL = 'https://scholarship.odisha.gov.in/';

  var CATEGORIES = [
    { id: 'all', en: 'All Categories', or: 'ସବୁ ବର୍ଗ' },
    { id: 'st', en: 'ST (Scheduled Tribe)', or: 'ST (ଅନୁସୂଚିତ ଜନଜାତି)' },
    { id: 'sc', en: 'SC (Scheduled Caste)', or: 'SC (ଅନୁସୂଚିତ ଜାତି)' },
    { id: 'obc-sebc', en: 'OBC / SEBC', or: 'OBC / SEBC' },
    { id: 'ebc', en: 'EBC (Economically Backward)', or: 'EBC (ଆର୍ଥିକ ପଛୁଆ)' },
    { id: 'general', en: 'General / UR', or: 'ସାଧାରଣ / UR' }
  ];

  var COURSE_LEVELS = [
    { id: 'all', en: 'All Courses', or: 'ସବୁ ପାଠ୍ୟକ୍ରମ' },
    { id: 'plus-2', en: 'Class 11–12 (+2)', or: 'ଏକାଦଶ–ଦ୍ୱାଦଶ (+୨)' },
    { id: 'ug', en: 'UG (+3 General / Honours)', or: 'ସ୍ନାତକ (+୩ ସାଧାରଣ / ଅନର୍ସ)' },
    { id: 'technical', en: 'Technical & Professional (B.Tech / Diploma / ITI / Medical)', or: 'ବୈଷୟିକ ଓ ବୃତ୍ତିଗତ (B.Tech / ଡିପ୍ଲୋମା / ITI / ମେଡିକାଲ୍)' },
    { id: 'pg', en: 'PG / Research', or: 'ସ୍ନାତକୋତ୍ତର (PG) / ଗବେଷଣା' }
  ];

  var SPECIAL_FLAGS = [
    { key: 'gssyVulnerable', en: 'Single Mother / Vulnerable Household (GSSY)', or: 'ଏକକ ମାତା / ଅସୁରକ୍ଷିତ ପରିବାର (GSSY)' },
    { key: 'farmerFamily', en: 'Farmer / Krushak Family (Krishi Vidya Nidhi)', or: 'କୃଷକ ପରିବାର — KALIA / CM-Kisan (କୃଷି ବିଦ୍ୟାନିଧି)' },
    { key: 'odiaHonours', en: 'Odia Honours / M.A. Odia Student (Fakirmohan Bhasabruti)', or: 'ଓଡ଼ିଆ ଅନର୍ସ / M.A. ଓଡ଼ିଆ ଛାତ୍ରଛାତ୍ରୀ (ଫକୀରମୋହନ ଭାଷାବୃତ୍ତି)' },
    { key: 'girlTech', en: 'Girl Student in Govt ITI / Polytechnic (Sudakshya)', or: 'ସରକାରୀ ITI / ପଲିଟେକ୍ନିକ୍ ଛାତ୍ରୀ (ସୁଦକ୍ଷା)' },
    { key: 'pwbd', en: 'PwBD Student >= 40% Disability (Banishree)', or: 'ଭିନ୍ନକ୍ଷମ ଛାତ୍ରଛାତ୍ରୀ >= 40% (ବାଣୀଶ୍ରୀ)' }
  ];

  var SCHOLARSHIP_SCHEMES = [
    {
      id: 'post-matric',
      nameEn: 'Post-Matric Scholarship (ST / SC / OBC / SEBC / EBC)',
      nameOr: 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି (ST / SC / OBC / SEBC / EBC)',
      deptEn: 'ST&SC Development & MBC Welfare Dept',
      deptOr: 'ଅନୁସୂଚିତ ଜାତି, ଜନଜାତି ଓ ପଛୁଆ ବର୍ଗ କଲ୍ୟାଣ ବିଭାଗ',
      payoutEn: 'Course Fee Reimbursement + ₹3,000–₹7,000+/yr Maintenance',
      payoutOr: 'ପାଠ୍ୟକ୍ରମ ଫି ପ୍ରତିପୂରଣ + ବାର୍ଷିକ ₹3,000–₹7,000+ ରକ୍ଷଣାବେକ୍ଷଣ ଭତ୍ତା',
      incomeCeiling: 250000,
      incomeLabelEn: '≤ ₹2,50,000 / year',
      incomeLabelOr: '≤ ₹2,50,000 / ବର୍ଷ',
      categories: ['st', 'sc', 'obc-sebc', 'ebc'],
      courses: ['plus-2', 'ug', 'technical', 'pg'],
      minMarks: 50,
      noMarksForScSt: true,
      specialKey: null,
      concurrentStacking: false,
      modes: ['fresh', 'renewal'],
      deadlineIso: '2026-12-31',
      deadlineLabelEn: 'AY 2026–27 Window: 31 Dec 2026 (Renewal Validation Open)',
      deadlineLabelOr: 'ଶିକ୍ଷାବର୍ଷ 2026–27 ଶେଷ ତାରିଖ: 31 ଡିସେମ୍ବର 2026',
      summaryEn: 'Covers +2, +3, ITI, Diploma, B.Tech, Medical & PG students; ≥50% marks needed for OBC/SEBC/EBC (no % bar for SC/ST).',
      summaryOr: '+୨, +୩, ITI, ଡିପ୍ଲୋମା, B.Tech, ମେଡିକାଲ୍ ଓ PG ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ; OBC/SEBC/EBC ପାଇଁ ≥50% ନମ୍ବର ଆବଶ୍ୟକ।',
      applyUrl: OSSP_URL
    },
    {
      id: 'e-medhabruti',
      nameEn: 'e-Medhabruti Merit Scholarship (UG / PG / Technical)',
      nameOr: 'ଇ-ମେଧାବୃତ୍ତି ମେଧା ଛାତ୍ରବୃତ୍ତି (UG / PG / ବୈଷୟିକ)',
      deptEn: 'Higher Education Dept, Govt of Odisha',
      deptOr: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ, ଓଡ଼ିଶା ସରକାର',
      payoutEn: '₹10,000/yr (UG) · ₹15,000/yr (PG) · ₹20,000/yr (Technical/Prof)',
      payoutOr: '₹10,000/ବର୍ଷ (UG) · ₹15,000/ବର୍ଷ (PG) · ₹20,000/ବର୍ଷ (ବୈଷୟିକ)',
      incomeCeiling: 800000,
      incomeLabelEn: '≤ ₹8,00,000 / year (Consolidated)',
      incomeLabelOr: '≤ ₹8,00,000 / ବର୍ଷ (ସଂଶୋଧିତ)',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['ug', 'technical', 'pg'],
      minMarks: 55,
      noMarksForScSt: false,
      specialKey: null,
      concurrentStacking: false,
      modes: ['fresh', 'renewal'],
      deadlineIso: '2027-03-12',
      deadlineLabelEn: 'Institute Validation: 30 Nov 2026 · Annual Cycle: 12 Mar 2027',
      deadlineLabelOr: 'ଅନୁଷ୍ଠାନ ଯାଞ୍ଚ: 30 ନଭେମ୍ବର 2026 · ବାର୍ଷିକ ଚକ୍ର: 12 ମାର୍ଚ୍ଚ 2027',
      summaryEn: 'Merit scholarship for regular 1st-year UG, PG & Technical/Professional students with ≥55% in last qualifying exam.',
      summaryOr: 'ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର ଓ ବୈଷୟିକ/ବୃତ୍ତିଗତ ପ୍ରଥମ ବର୍ଷ ଛାତ୍ରଛାତ୍ରୀ (≥55% ନମ୍ବର) ଙ୍କ ପାଇଁ ମେଧା ବୃତ୍ତି।',
      applyUrl: OSSP_URL
    },
    {
      id: 'gssy',
      nameEn: 'Gopabandhu Sikhya Sahayata Yojana (GSSY)',
      nameOr: 'ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା (GSSY)',
      deptEn: 'Higher Education Dept, Govt of Odisha',
      deptOr: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ, ଓଡ଼ିଶା ସରକାର',
      payoutEn: '₹20,000 / year for Full Course Duration',
      payoutOr: 'ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ ପାଇଁ ବାର୍ଷିକ ₹20,000',
      incomeCeiling: 120000,
      incomeLabelEn: '< ₹1,20,000 / year (< ₹10k/mo)',
      incomeLabelOr: '< ₹1,20,000 / ବର୍ଷ (< ₹10 ହଜାର/ମାସ)',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['ug', 'technical', 'pg'],
      minMarks: 0,
      noMarksForScSt: false,
      specialKey: 'gssyVulnerable',
      concurrentStacking: true,
      modes: ['fresh', 'renewal'],
      deadlineIso: '2026-12-15',
      deadlineLabelEn: 'DWO / Institute Validation Window: 15 Dec 2026',
      deadlineLabelOr: 'DWO / ଅନୁଷ୍ଠାନ ଯାଞ୍ଚ ଶେଷ ତାରିଖ: 15 ଡିସେମ୍ବର 2026',
      summaryEn: 'For vulnerable households (Single Mother, HIV/AIDS-affected, PVTG, Destitute, Manual Scavenger). Concurrent stacking permitted.',
      summaryOr: 'ଏକକ ମାତା, PVTG, ଅସହାୟ ଓ ଅସୁରକ୍ଷିତ ପରିବାରର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ। ଅନ୍ୟ ବୃତ୍ତି ସହିତ ମଧ୍ୟ ମିଳିପାରିବ।',
      applyUrl: OSSP_URL
    },
    {
      id: 'krishi-vidya-nidhi',
      nameEn: 'Krishi Vidya Nidhi Yojana',
      nameOr: 'କୃଷି ବିଦ୍ୟାନିଧି ଯୋଜନା',
      deptEn: 'Agriculture & Farmers’ Empowerment Dept',
      deptOr: 'କୃଷି ଓ କୃଷକ ସଶକ୍ତିକରଣ ବିଭାଗ',
      payoutEn: 'Tuition & Academic Financial Assistance (Course-Wise)',
      payoutOr: 'ଟ୍ୟୁସନ୍ ଓ ଶିକ୍ଷାଗତ ଆର୍ଥିକ ସହାୟତା (ପାଠ୍ୟକ୍ରମ ଅନୁସାରେ)',
      incomeCeiling: null,
      incomeLabelEn: 'Active KALIA / CM-Kisan Farmer Family',
      incomeLabelOr: 'ସକ୍ରିୟ KALIA / CM-Kisan କୃଷକ ପରିବାର',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['ug', 'technical', 'pg'],
      minMarks: 0,
      noMarksForScSt: false,
      specialKey: 'farmerFamily',
      concurrentStacking: false,
      modes: ['fresh', 'renewal'],
      deadlineIso: '2026-12-20',
      deadlineLabelEn: 'AY 2026–27 OSSP Portal Window: 20 Dec 2026',
      deadlineLabelOr: 'ଶିକ୍ଷାବର୍ଷ 2026–27 ପୋର୍ଟାଲ୍ ଶେଷ ତାରିଖ: 20 ଡିସେମ୍ବର 2026',
      summaryEn: 'Supports children of small/marginal farmers & landless agricultural labourers pursuing UG, technical & agriculture courses.',
      summaryOr: 'କ୍ଷୁଦ୍ର/ନାମମାତ୍ର ଚାଷୀ ଓ ଭୂମିହୀନ କୃଷି ଶ୍ରମିକଙ୍କ ପିଲାମାନଙ୍କ ଉଚ୍ଚ ଓ ବୈଷୟିକ ଶିକ୍ଷା ପାଇଁ ସହାୟତା।',
      applyUrl: OSSP_URL
    },
    {
      id: 'fakirmohan-bhasabruti',
      nameEn: 'Vyasakabi Fakirmohan Bhasabruti',
      nameOr: 'ବ୍ୟାସକବି ଫକୀରମୋହନ ଭାଷାବୃତ୍ତି',
      deptEn: 'Higher Education Dept, Govt of Odisha',
      deptOr: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ, ଓଡ଼ିଶା ସରକାର',
      payoutEn: '₹20,000 Merit Award (Odia Honours / M.A. Odia)',
      payoutOr: '₹20,000 ମେଧା ପୁରସ୍କାର (ଓଡ଼ିଆ ଅନର୍ସ / M.A. ଓଡ଼ିଆ)',
      incomeCeiling: null,
      incomeLabelEn: 'No Income Bar (Merit-Based)',
      incomeLabelOr: 'କୌଣସି ଆୟ ସୀମା ନାହିଁ (ମେଧାଭିତ୍ତିକ)',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['ug', 'pg'],
      minMarks: 60,
      noMarksForScSt: false,
      specialKey: 'odiaHonours',
      concurrentStacking: false,
      modes: ['fresh'],
      deadlineIso: '2027-01-31',
      deadlineLabelEn: 'Merit Cycle Window: 31 Jan 2027',
      deadlineLabelOr: 'ମେଧା ଆବେଦନ ଶେଷ ତାରିଖ: 31 ଜାନୁଆରୀ 2027',
      summaryEn: 'Encourages academic excellence in Odia language for meritorious students securing ≥60% in +3 Odia Honours or M.A. Odia.',
      summaryOr: '+୩ ଓଡ଼ିଆ ଅନର୍ସ କିମ୍ବା M.A. ଓଡ଼ିଆରେ ≥60% ନମ୍ବର ରଖିଥିବା ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ₹20,000 ପୁରସ୍କାର।',
      applyUrl: OSSP_URL
    },
    {
      id: 'godabarisha-laptop',
      nameEn: 'Godabarisha Vidyarthi Protsahana Yojana (Laptop DBT)',
      nameOr: 'ଗୋଦାବରୀଶ ବିଦ୍ୟାର୍ଥୀ ପ୍ରୋତ୍ସାହନ ଯୋଜନା (ଲ୍ୟାପଟପ୍ DBT)',
      deptEn: 'Higher Education Dept, Govt of Odisha',
      deptOr: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ, ଓଡ଼ିଶା ସରକାର',
      payoutEn: '₹30,000 Direct Benefit Transfer (Laptop Purchase)',
      payoutOr: 'ଲ୍ୟାପଟପ୍ କିଣିବା ପାଇଁ ₹30,000 ସିଧାସଳଖ DBT',
      incomeCeiling: null,
      incomeLabelEn: 'No Income Bar (Top 15,000 CHSE +2)',
      incomeLabelOr: 'କୌଣସି ଆୟ ସୀମା ନାହିଁ (ଶ୍ରେଷ୍ଠ 15,000 CHSE +୨)',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['plus-2', 'ug'],
      minMarks: 70,
      noMarksForScSt: false,
      specialKey: null,
      concurrentStacking: true,
      modes: ['fresh'],
      deadlineIso: '2026-12-15',
      deadlineLabelEn: 'AY 2026–27 Extended DBT Timeline: 15 Dec 2026',
      deadlineLabelOr: 'ଶିକ୍ଷାବର୍ଷ 2026–27 ବର୍ଦ୍ଧିତ DBT ତାରିଖ: 15 ଡିସେମ୍ବର 2026',
      summaryEn: 'One-time ₹30,000 DBT for laptop purchase to 15,000 meritorious CHSE +2 pass-out students across Arts, Science, Commerce & Vocational.',
      summaryOr: 'CHSE +୨ କଳା, ବିଜ୍ଞାନ, ବାଣିଜ୍ୟ ଓ ଧନ୍ଦାମୂଳକ ପରୀକ୍ଷାର ଶ୍ରେଷ୍ଠ 15,000 ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ₹30,000 DBT।',
      applyUrl: OSSP_URL
    },
    {
      id: 'sudakshya',
      nameEn: 'Sudakshya for Girl Child (Govt ITI & Polytechnic)',
      nameOr: 'ସୁଦକ୍ଷା ଯୋଜନା (ସରକାରୀ ITI ଓ ପଲିଟେକ୍ନିକ୍ ଛାତ୍ରୀ)',
      deptEn: 'Skill Development & Technical Education Dept',
      deptOr: 'ଦକ୍ଷତା ବିକାଶ ଓ ବୈଷୟିକ ଶିକ୍ଷା ବିଭାଗ',
      payoutEn: 'Annual Stipend + Tuition/Exam Fee Waiver + Hostel Support',
      payoutOr: 'ବାର୍ଷିକ ବୃତ୍ତି + ଟ୍ୟୁସନ୍/ପରୀକ୍ଷା ଫି ଛାଡ଼ + ହଷ୍ଟେଲ୍ ସହାୟତା',
      incomeCeiling: null,
      incomeLabelEn: 'All Eligible Girl Students in Govt ITI/Polytechnic',
      incomeLabelOr: 'ସରକାରୀ ITI/ପଲିଟେକ୍ନିକ୍ ସମସ୍ତ ଯୋଗ୍ୟ ଛାତ୍ରୀ',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['technical'],
      minMarks: 0,
      noMarksForScSt: false,
      specialKey: 'girlTech',
      concurrentStacking: true,
      modes: ['fresh', 'renewal'],
      deadlineIso: '2026-12-31',
      deadlineLabelEn: 'AY 2026–27 Institutional Enrolment Cycle: 31 Dec 2026',
      deadlineLabelOr: 'ଶିକ୍ଷାବର୍ଷ 2026–27 ଆବେଦନ ଶେଷ ତାରିଖ: 31 ଡିସେମ୍ବର 2026',
      summaryEn: 'Promotes technical education for girls in Odisha Govt ITIs & Polytechnics; concurrently eligible alongside ST/SC Post-Matric.',
      summaryOr: 'ସରକାରୀ ITI ଓ ପଲିଟେକ୍ନିକ୍ ଛାତ୍ରୀଙ୍କ ପାଇଁ; ST/SC ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି ସହିତ ମଧ୍ୟ ମିଳିପାରିବ।',
      applyUrl: OSSP_URL
    },
    {
      id: 'banishree',
      nameEn: 'Banishree Scholarship (Students with Disabilities)',
      nameOr: 'ବାଣୀଶ୍ରୀ ଛାତ୍ରବୃତ୍ତି (ଭିନ୍ନକ୍ଷମ ଛାତ୍ରଛାତ୍ରୀ)',
      deptEn: 'SSEPD Dept, Govt of Odisha',
      deptOr: 'ସାମାଜିକ ସୁରକ୍ଷା ଓ ଭିନ୍ନକ୍ଷମ ସଶକ୍ତିକରଣ ବିଭାଗ (SSEPD)',
      payoutEn: '₹500–₹1,200 / month (₹6,000–₹14,400/yr by Course Level)',
      payoutOr: 'ମାସିକ ₹500–₹1,200 (ପାଠ୍ୟକ୍ରମ ସ୍ତର ଅନୁସାରେ)',
      incomeCeiling: 250000,
      incomeLabelEn: '≤ ₹2,50,000 / year (PwBD ≥ 40%)',
      incomeLabelOr: '≤ ₹2,50,000 / ବର୍ଷ (ଭିନ୍ନକ୍ଷମ ≥ 40%)',
      categories: ['st', 'sc', 'obc-sebc', 'ebc', 'general'],
      courses: ['plus-2', 'ug', 'technical', 'pg'],
      minMarks: 0,
      noMarksForScSt: false,
      specialKey: 'pwbd',
      concurrentStacking: false,
      modes: ['fresh', 'renewal'],
      deadlineIso: '2026-12-31',
      deadlineLabelEn: 'AY 2026–27 OSSP / SSEPD Cycle: 31 Dec 2026',
      deadlineLabelOr: 'ଶିକ୍ଷାବର୍ଷ 2026–27 ଶେଷ ତାରିଖ: 31 ଡିସେମ୍ବର 2026',
      summaryEn: 'Monthly educational scholarship for Odisha domicile students with ≥40% benchmark disability (UDID / Disability Certificate).',
      summaryOr: '≥40% ଭିନ୍ନକ୍ଷମ ପ୍ରମାଣପତ୍ର (UDID) ଥିବା ଓଡ଼ିଶା ବାସିନ୍ଦା ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ମାସିକ ଶିକ୍ଷା ବୃତ୍ତି।',
      applyUrl: OSSP_URL
    }
  ];

  var RENEWAL_CHECKLIST_ITEMS = [
    { id: 'npci-dbt', en: 'Aadhaar-Seeded Active Bank Account (NPCI DBT Mapper Active — mandatory for DBT payout)', or: 'ଆଧାର-ସିଡେଡ୍ ସକ୍ରିୟ ବ୍ୟାଙ୍କ ଆକାଉଣ୍ଟ (NPCI DBT ମ୍ୟାପର୍ ସକ୍ରିୟ)' },
    { id: 'aadhaar-otp', en: 'Aadhaar-Linked Mobile Number for One-Time Registration (OTR) & Renewal OTP', or: 'OTR ଓ ରିନ୍ୟୁଆଲ୍ OTP ପାଇଁ ଆଧାର-ସଂଯୁକ୍ତ ମୋବାଇଲ୍ ନମ୍ବର' },
    { id: 'income-cert', en: 'Valid Income Certificate (< 1 year / Current FY from e-District Odisha Tahasildar)', or: 'ବୈଧ ଆୟ ପ୍ରମାଣପତ୍ର (ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ଓଡ଼ିଶା ତହସିଲଦାରଙ୍କ ଦ୍ୱାରା ଜାରି)' },
    { id: 'caste-cert', en: 'Caste / SEBC / EWS / Disability Certificate (with valid Bar Code / Token No.)', or: 'ଜାତି / SEBC / EWS / ଭିନ୍ନକ୍ଷମ ପ୍ରମାଣପତ୍ର (ବୈଧ ବାର୍ କୋଡ୍ ସହିତ)' },
    { id: 'resident-cert', en: 'Resident / Domicile Certificate of Odisha', or: 'ଓଡ଼ିଶା ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର' },
    { id: 'admission-proof', en: 'Last Qualifying Exam Marksheet & College Admission Receipt / ID Card', or: 'ଶେଷ ଯୋଗ୍ୟତା ପରୀକ୍ଷା ମାର୍କସିଟ୍ ଓ କଲେଜ ନାମଲେଖା ରସିଦ / ଆଇଡି କାର୍ଡ' },
    { id: 'renewal-promo', en: 'Previous Year Marksheet & Promotion Proof (for Renewal applicants)', or: 'ପୂର୍ବ ବର୍ଷର ମାର୍କସିଟ୍ ଓ ପଦୋନ୍ନତି ପ୍ରମାଣପତ୍ର (ରିନ୍ୟୁଆଲ୍ ପାଇଁ)' },
    { id: 'nodal-submit', en: 'Hard-Copy Printout Signed & Submitted to College Nodal Officer for Institute Validation', or: 'ଅନୁଷ୍ଠାନ ଯାଞ୍ଚ ପାଇଁ କଲେଜ ନୋଡାଲ୍ ଅଫିସରଙ୍କ ନିକଟରେ ଦସ୍ତଖତ ପ୍ରିଣ୍ଟଆଉଟ୍ ଦାଖଲ' }
  ];

  function evaluateScholarshipEligibility(studentProfile) {
    var p = studentProfile || {};
    var category = String(p.category || 'all').toLowerCase();
    var courseLevel = String(p.courseLevel || 'all').toLowerCase();
    var annualIncome = p.annualIncome !== undefined && p.annualIncome !== '' ? Math.max(0, Number(p.annualIncome) || 0) : 200000;
    var marksPct = p.marksPct !== undefined && p.marksPct !== '' ? Math.max(0, Math.min(100, Number(p.marksPct) || 0)) : 65;
    var applicationMode = String(p.applicationMode || 'all').toLowerCase();
    var special = (p.special && typeof p.special === 'object') ? p.special : {};

    var results = [];
    for (var i = 0; i < SCHOLARSHIP_SCHEMES.length; i += 1) {
      var s = SCHOLARSHIP_SCHEMES[i];
      var matchedCategory = (category === 'all') || (s.categories.indexOf(category) !== -1);
      var matchedCourse = (courseLevel === 'all') || (s.courses.indexOf(courseLevel) !== -1);
      var matchedMode = (applicationMode === 'all') || (s.modes.indexOf(applicationMode) !== -1);
      if (!matchedCategory || !matchedCourse || !matchedMode) continue;

      var matchedIncome = (s.incomeCeiling === null) || (annualIncome <= s.incomeCeiling);
      var effectiveMinMarks = (s.noMarksForScSt && (category === 'st' || category === 'sc')) ? 0 : s.minMarks;
      var matchedMarks = marksPct >= effectiveMinMarks;
      var matchedSpecial = !s.specialKey || Boolean(special[s.specialKey]);

      var reasonsEn = [];
      var reasonsOr = [];
      if (!matchedIncome) {
        reasonsEn.push('Family income exceeds ' + s.incomeLabelEn);
        reasonsOr.push('ପରିବାର ଆୟ ' + s.incomeLabelOr + ' ସୀମାଠାରୁ ଅଧିକ');
      }
      if (!matchedMarks) {
        reasonsEn.push('Requires ≥ ' + effectiveMinMarks + '% in last qualifying exam');
        reasonsOr.push('ଶେଷ ପରୀକ୍ଷାରେ ≥ ' + effectiveMinMarks + '% ନମ୍ବର ଆବଶ୍ୟକ');
      }
      if (!matchedSpecial) {
        reasonsEn.push('Select matching special eligibility criterion to confirm');
        reasonsOr.push('ନିଶ୍ଚିତ କରିବାକୁ ସମ୍ବନ୍ଧିତ ବିଶେଷ ଯୋଗ୍ୟତା ବିକଳ୍ପ ବାଛନ୍ତୁ');
      }

      var isEligible = matchedIncome && matchedMarks && matchedSpecial;
      results.push({
        scheme: s,
        status: isEligible ? 'eligible' : 'check',
        matchedCategory: matchedCategory,
        matchedCourse: matchedCourse,
        matchedIncome: matchedIncome,
        matchedMarks: matchedMarks,
        matchedSpecial: matchedSpecial,
        reasonsEn: reasonsEn,
        reasonsOr: reasonsOr
      });
    }

    results.sort(function (a, b) {
      if (a.status === b.status) return 0;
      return a.status === 'eligible' ? -1 : 1;
    });

    return {
      profile: {
        category: category,
        courseLevel: courseLevel,
        annualIncome: annualIncome,
        marksPct: marksPct,
        applicationMode: applicationMode,
        special: special
      },
      eligible: results.filter(function (r) { return r.status === 'eligible'; }),
      checkRequired: results.filter(function (r) { return r.status !== 'eligible'; }),
      results: results
    };
  }

  function loadJson(key) {
    try {
      var raw = win.localStorage && win.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveJson(key, val) {
    try {
      if (win.localStorage) win.localStorage.setItem(key, JSON.stringify(val));
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

  function triggerIcsDownload(scheme) {
    var ev = {
      title: scheme.nameEn + ' — OSSP Deadline Reminder',
      dateText: scheme.deadlineIso,
      description: scheme.payoutEn + ' | Apply at ' + scheme.applyUrl,
      url: scheme.applyUrl,
      location: 'Odisha State Scholarship Portal (scholarship.odisha.gov.in)'
    };
    if (win.CSOCalendarExport && typeof win.CSOCalendarExport.downloadSingleEvent === 'function') {
      return win.CSOCalendarExport.downloadSingleEvent(ev, 'cso-scholarship-' + scheme.id);
    }
    try {
      var ymd = scheme.deadlineIso.replace(/-/g, '');
      var ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Common Sense Odisha//Scholarship Finder v431//EN',
        'BEGIN:VEVENT',
        'UID:cso-saf-' + scheme.id + '@csodisha.com',
        'DTSTART;VALUE=DATE:' + ymd,
        'SUMMARY:' + ev.title,
        'DESCRIPTION:' + ev.description,
        'URL:' + scheme.applyUrl,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = 'cso-scholarship-' + scheme.id + '.ics';
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (_) {}
    return true;
  }

  function isSchemeSaved(schemeId) {
    if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.isSaved === 'function') {
      return Boolean(win.CSOSavedAlerts.isSaved('scholarship-' + schemeId));
    }
    return false;
  }

  function toggleSaveScheme(scheme) {
    if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.toggleAlert === 'function') {
      return win.CSOSavedAlerts.toggleAlert({
        id: 'scholarship-' + scheme.id,
        title: scheme.nameEn,
        category: 'Scholarship',
        deadline: scheme.deadlineIso,
        url: '/schemes/#cso-scholarship-aid-finder-root'
      });
    }
    return false;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var savedPrefs = loadJson(PREFS_KEY);
    var state = {
      lang: (savedPrefs && savedPrefs.lang === 'or') ? 'or' : 'en',
      category: (savedPrefs && savedPrefs.category) || 'all',
      courseLevel: (savedPrefs && savedPrefs.courseLevel) || 'all',
      annualIncome: (savedPrefs && savedPrefs.annualIncome !== undefined) ? Number(savedPrefs.annualIncome) : 200000,
      marksPct: (savedPrefs && savedPrefs.marksPct !== undefined) ? Number(savedPrefs.marksPct) : 65,
      applicationMode: (savedPrefs && savedPrefs.applicationMode) || 'all',
      special: (savedPrefs && savedPrefs.special && typeof savedPrefs.special === 'object') ? savedPrefs.special : {}
    };
    var checklistState = loadJson(CHECKLIST_KEY) || {};

    function persist() {
      saveJson(PREFS_KEY, state);
      saveJson(CHECKLIST_KEY, checklistState);
    }

    function render() {
      var orMode = state.lang === 'or';
      var evalRes = evaluateScholarshipEligibility(state);
      var checkedCount = RENEWAL_CHECKLIST_ITEMS.filter(function (it) { return Boolean(checklistState[it.id]); }).length;

      var card = el('div', 'cso-saf-card');
      card.setAttribute('data-cso-scholarship-aid-finder', '1');

      // Header
      var head = el('div', 'cso-saf-head');
      var headCopy = el('div', 'cso-saf-head-copy');
      headCopy.appendChild(el('div', 'cso-saf-eyebrow', orMode
        ? '🎓 ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (SCHOLARSHIP.ODISHA.GOV.IN)'
        : '🎓 ODISHA STATE SCHOLARSHIP PORTAL & STUDENT AID FINDER'));
      headCopy.appendChild(el('h2', 'cso-saf-title', orMode
        ? 'ଓଡ଼ିଶା ଛାତ୍ରବୃତ୍ତି ଯୋଗ୍ୟତା, ଆୟ ସୀମା ଓ ରିନ୍ୟୁଆଲ୍ ଯାଞ୍ଚ'
        : 'Odisha Scholarship & Student Financial Aid Finder (AY 2026–27)'));
      headCopy.appendChild(el('p', 'cso-saf-sub', orMode
        ? 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍, ଇ-ମେଧାବୃତ୍ତି, ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା (GSSY), କୃଷି ବିଦ୍ୟାନିଧି, ଫକୀରମୋହନ ଭାଷାବୃତ୍ତି, ଗୋଦାବରୀଶ ଲ୍ୟାପଟପ୍, ସୁଦକ୍ଷା ଓ ବାଣୀଶ୍ରୀ ଛାତ୍ରବୃତ୍ତି ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'Check eligibility across Post-Matric, e-Medhabruti, GSSY, Krishi Vidya Nidhi, Fakirmohan Bhasabruti, Godabarisha Laptop DBT, Sudakshya & Banishree with .ics reminders.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-saf-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-saf-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persist(); render(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Filter Form
      var form = el('div', 'cso-saf-form');
      var grid = el('div', 'cso-saf-grid');

      function addField(label, control) {
        var f = el('div', 'cso-saf-field');
        var l = el('label', 'cso-saf-label', label);
        if (control.id) l.setAttribute('for', control.id);
        f.appendChild(l);
        f.appendChild(control);
        grid.appendChild(f);
      }

      var catSel = el('select', 'cso-saf-input');
      catSel.id = 'cso-saf-cat';
      CATEGORIES.forEach(function (c) {
        var opt = el('option', '', orMode ? c.or : c.en);
        opt.value = c.id;
        if (c.id === state.category) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.addEventListener('change', function () { state.category = catSel.value; persist(); render(); });
      addField(orMode ? 'ସାମାଜିକ ବର୍ଗ (Category)' : 'Social Category', catSel);

      var courseSel = el('select', 'cso-saf-input');
      courseSel.id = 'cso-saf-course';
      COURSE_LEVELS.forEach(function (cl) {
        var opt = el('option', '', orMode ? cl.or : cl.en);
        opt.value = cl.id;
        if (cl.id === state.courseLevel) opt.selected = true;
        courseSel.appendChild(opt);
      });
      courseSel.addEventListener('change', function () { state.courseLevel = courseSel.value; persist(); render(); });
      addField(orMode ? 'ପାଠ୍ୟକ୍ରମ ସ୍ତର (Course Level)' : 'Course Level', courseSel);

      var incInp = el('input', 'cso-saf-input');
      incInp.id = 'cso-saf-income';
      incInp.type = 'number';
      incInp.min = '0';
      incInp.step = '10000';
      incInp.value = String(state.annualIncome);
      incInp.addEventListener('change', function () {
        state.annualIncome = Math.max(0, Math.round(Number(incInp.value) || 0));
        persist();
        render();
      });
      addField(orMode ? 'ବାର୍ଷିକ ପରିବାର ଆୟ (₹)' : 'Annual Family Income (₹)', incInp);

      var marksInp = el('input', 'cso-saf-input');
      marksInp.id = 'cso-saf-marks';
      marksInp.type = 'number';
      marksInp.min = '0';
      marksInp.max = '100';
      marksInp.step = '1';
      marksInp.value = String(state.marksPct);
      marksInp.addEventListener('change', function () {
        state.marksPct = Math.max(0, Math.min(100, Number(marksInp.value) || 0));
        persist();
        render();
      });
      addField(orMode ? 'ଶେଷ ପରୀକ୍ଷା ନମ୍ବର (%)' : 'Last Qualifying Exam Marks (%)', marksInp);

      var modeSel = el('select', 'cso-saf-input');
      modeSel.id = 'cso-saf-mode';
      [
        { id: 'all', en: 'All Modes (Fresh & Renewal)', or: 'ସବୁ (ନୂଆ ଓ ରିନ୍ୟୁଆଲ୍)' },
        { id: 'fresh', en: 'Fresh Application', or: 'ନୂଆ ଆବେଦନ' },
        { id: 'renewal', en: 'Renewal & Institute Validation', or: 'ରିନ୍ୟୁଆଲ୍ ଓ ଅନୁଷ୍ଠାନ ଯାଞ୍ଚ' }
      ].forEach(function (m) {
        var opt = el('option', '', orMode ? m.or : m.en);
        opt.value = m.id;
        if (m.id === state.applicationMode) opt.selected = true;
        modeSel.appendChild(opt);
      });
      modeSel.addEventListener('change', function () { state.applicationMode = modeSel.value; persist(); render(); });
      addField(orMode ? 'ଆବେଦନ ପ୍ରକାର' : 'Application Mode', modeSel);

      form.appendChild(grid);

      // Quick Income Presets
      var presets = el('div', 'cso-saf-presets');
      [
        { val: 100000, en: '≤ ₹1.2L (GSSY)', or: '≤ ₹1.2 ଲକ୍ଷ (GSSY)' },
        { val: 250000, en: '≤ ₹2.5L (Post-Matric)', or: '≤ ₹2.5 ଲକ୍ଷ (ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍)' },
        { val: 800000, en: '≤ ₹8L (e-Medhabruti)', or: '≤ ₹8 ଲକ୍ଷ (ଇ-ମେଧାବୃତ୍ତି)' },
        { val: 900000, en: '> ₹8L (Merit Only)', or: '> ₹8 ଲକ୍ଷ (କେବଳ ମେଧା)' }
      ].forEach(function (pr) {
        var b = el('button', 'cso-saf-preset-btn' + (state.annualIncome === pr.val ? ' is-active' : ''), orMode ? pr.or : pr.en);
        b.type = 'button';
        b.addEventListener('click', function () { state.annualIncome = pr.val; persist(); render(); });
        presets.appendChild(b);
      });
      form.appendChild(presets);

      // Special Criteria Checkboxes
      var specialWrap = el('div', 'cso-saf-specials');
      SPECIAL_FLAGS.forEach(function (sf) {
        var lbl = el('label', 'cso-saf-check-pill');
        var cb = el('input', 'cso-saf-checkbox');
        cb.type = 'checkbox';
        cb.checked = Boolean(state.special[sf.key]);
        cb.addEventListener('change', function () {
          state.special[sf.key] = cb.checked;
          persist();
          render();
        });
        lbl.appendChild(cb);
        lbl.appendChild(el('span', '', orMode ? sf.or : sf.en));
        specialWrap.appendChild(lbl);
      });
      form.appendChild(specialWrap);
      card.appendChild(form);

      // Summary Status Banner
      var summary = el('div', 'cso-saf-summary');
      summary.setAttribute('aria-live', 'polite');
      summary.textContent = orMode
        ? '✅ ' + evalRes.eligible.length + ' ଟି ଛାତ୍ରବୃତ୍ତି ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଯୋଗ୍ୟ · ⚠️ ' + evalRes.checkRequired.length + ' ଟି ପାଇଁ ଅତିରିକ୍ତ ଯାଞ୍ଚ ଆବଶ୍ୟକ (ମୋଟ ' + evalRes.results.length + ' ଟି ଦେଖାଯାଉଛି)'
        : '✅ ' + evalRes.eligible.length + ' Eligible Scholarships · ⚠️ ' + evalRes.checkRequired.length + ' Check Income / Marks / Criteria (Showing ' + evalRes.results.length + ' of 8 OSSP schemes)';
      card.appendChild(summary);

      // Scheme Cards
      var cardsGrid = el('div', 'cso-saf-schemes-grid');
      evalRes.results.forEach(function (res) {
        var s = res.scheme;
        var item = el('article', 'cso-saf-scheme' + (res.status === 'eligible' ? ' cso-saf-scheme--ok' : ' cso-saf-scheme--warn'));
        var top = el('div', 'cso-saf-scheme-top');
        top.appendChild(el('span', 'cso-saf-badge ' + (res.status === 'eligible' ? 'cso-saf-badge--ok' : 'cso-saf-badge--warn'),
          res.status === 'eligible' ? (orMode ? '✅ ଯୋଗ୍ୟ (ELIGIBLE)' : '✅ ELIGIBLE') : (orMode ? '⚠️ ଆୟ / ନମ୍ବର ଯାଞ୍ଚ କରନ୍ତୁ' : '⚠️ CHECK INCOME / MARKS')));
        if (s.concurrentStacking) {
          top.appendChild(el('span', 'cso-saf-badge cso-saf-badge--stack', orMode ? '🔗 ଏକାଧିକ ବୃତ୍ତି ଅନୁମୋଦିତ' : '🔗 Concurrent Stacking OK'));
        }
        item.appendChild(top);

        item.appendChild(el('h3', 'cso-saf-scheme-title', orMode ? s.nameOr : s.nameEn));
        item.appendChild(el('div', 'cso-saf-scheme-dept', orMode ? s.deptOr : s.deptEn));
        item.appendChild(el('p', 'cso-saf-scheme-desc', orMode ? s.summaryOr : s.summaryEn));

        var meta = el('div', 'cso-saf-meta');
        meta.appendChild(el('span', 'cso-saf-meta-pill', (orMode ? '💰 ସହାୟତା: ' : '💰 Benefit: ') + (orMode ? s.payoutOr : s.payoutEn)));
        meta.appendChild(el('span', 'cso-saf-meta-pill', (orMode ? '🏦 ଆୟ ସୀମା: ' : '🏦 Income: ') + (orMode ? s.incomeLabelOr : s.incomeLabelEn)));
        meta.appendChild(el('span', 'cso-saf-meta-pill', (orMode ? '📅 ତାରିଖ: ' : '📅 Window: ') + (orMode ? s.deadlineLabelOr : s.deadlineLabelEn)));
        item.appendChild(meta);

        if (res.reasonsEn.length > 0) {
          var note = el('div', 'cso-saf-reason', (orMode ? 'ℹ️ ଟିପ୍ପଣୀ: ' + res.reasonsOr.join(' · ') : 'ℹ️ Note: ' + res.reasonsEn.join(' · ')));
          item.appendChild(note);
        }

        var rowAct = el('div', 'cso-saf-scheme-actions');
        var icsBtn = el('button', 'cso-saf-btn', orMode ? '📅 ରିମାଇଣ୍ଡର୍ (.ics)' : '📅 Add Deadline Reminder (.ics)');
        icsBtn.type = 'button';
        icsBtn.addEventListener('click', function () { triggerIcsDownload(s); });
        rowAct.appendChild(icsBtn);

        var savedNow = isSchemeSaved(s.id);
        var saveBtn = el('button', 'cso-saf-btn', savedNow ? (orMode ? '★ ସେଭ୍ ହୋଇଛି' : '★ Saved') : (orMode ? '☆ ବୃତ୍ତି ସେଭ୍ କରନ୍ତୁ' : '☆ Save Scholarship'));
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', function () {
          toggleSaveScheme(s);
          render();
        });
        rowAct.appendChild(saveBtn);

        var applyLink = el('a', 'cso-saf-btn cso-saf-btn--primary', orMode ? 'OSSP ରେ ଆବେଦନ ↗' : 'Apply on OSSP ↗');
        applyLink.href = s.applyUrl;
        applyLink.target = '_blank';
        applyLink.rel = 'noopener noreferrer';
        rowAct.appendChild(applyLink);

        item.appendChild(rowAct);
        cardsGrid.appendChild(item);
      });
      card.appendChild(cardsGrid);

      // 8-Item Fresh & Renewal OSSP Readiness Checklist
      var chkSec = el('div', 'cso-saf-checklist');
      var chkHead = el('div', 'cso-saf-checklist-head');
      chkHead.appendChild(el('h3', 'cso-saf-sec-title', orMode
        ? '📋 ୮-ସୂତ୍ରୀ OSSP ନୂଆ ଓ ରିନ୍ୟୁଆଲ୍ କାଗଜପତ୍ର ଯାଞ୍ଚ ତାଲିକା'
        : '📋 8-Item Fresh & Renewal OSSP Readiness Checklist'));
      chkHead.appendChild(el('span', 'cso-saf-meter', checkedCount + ' / ' + RENEWAL_CHECKLIST_ITEMS.length + (orMode ? ' ଯାଞ୍ଚ ହୋଇଛି' : ' Verified')));
      chkSec.appendChild(chkHead);

      var chkGrid = el('div', 'cso-saf-checklist-grid');
      RENEWAL_CHECKLIST_ITEMS.forEach(function (it) {
        var row = el('label', 'cso-saf-chk-item' + (checklistState[it.id] ? ' is-done' : ''));
        var cb = el('input', 'cso-saf-checkbox');
        cb.type = 'checkbox';
        cb.checked = Boolean(checklistState[it.id]);
        cb.addEventListener('change', function () {
          checklistState[it.id] = cb.checked;
          persist();
          render();
        });
        row.appendChild(cb);
        row.appendChild(el('span', '', orMode ? it.or : it.en));
        chkGrid.appendChild(row);
      });
      chkSec.appendChild(chkGrid);
      card.appendChild(chkSec);

      // Footer Actions
      var foot = el('div', 'cso-saf-actions');
      var copyBtn = el('button', 'cso-saf-btn cso-saf-btn--primary', orMode ? '📋 ଯୋଗ୍ୟ ଛାତ୍ରବୃତ୍ତି କପି କରନ୍ତୁ' : '📋 Copy Eligible Scholarships');
      copyBtn.type = 'button';
      var copyStatus = el('span', 'cso-saf-copy-status');
      copyStatus.setAttribute('aria-live', 'polite');
      copyBtn.addEventListener('click', function () {
        var lines = [
          'CS Odisha — Eligible Odisha State Scholarship Portal (OSSP) Schemes (AY 2026–27)',
          'Profile: Category=' + state.category.toUpperCase() + ' | Course=' + state.courseLevel + ' | Income=₹' + state.annualIncome.toLocaleString('en-IN') + ' | Marks=' + state.marksPct + '%'
        ];
        evalRes.eligible.forEach(function (r, idx) {
          lines.push((idx + 1) + '. ' + r.scheme.nameEn + ' — ' + r.scheme.payoutEn + ' (Deadline: ' + r.scheme.deadlineIso + ')');
        });
        lines.push('Apply at: ' + OSSP_URL);
        copyText(lines.join('\n')).then(function () {
          copyStatus.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Eligible scholarships copied!';
          setTimeout(function () { copyStatus.textContent = ''; }, 2400);
        });
      });
      foot.appendChild(copyBtn);

      var printBtn = el('button', 'cso-saf-btn', orMode ? '🖨️ ଛାତ୍ରବୃତ୍ତି ଓ ରିନ୍ୟୁଆଲ୍ ଶିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Scholarship & Renewal Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      foot.appendChild(printBtn);
      foot.appendChild(copyStatus);
      card.appendChild(foot);

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
    CHECKLIST_KEY: CHECKLIST_KEY,
    OSSP_URL: OSSP_URL,
    CATEGORIES: CATEGORIES,
    COURSE_LEVELS: COURSE_LEVELS,
    SPECIAL_FLAGS: SPECIAL_FLAGS,
    SCHOLARSHIP_SCHEMES: SCHOLARSHIP_SCHEMES,
    RENEWAL_CHECKLIST_ITEMS: RENEWAL_CHECKLIST_ITEMS,
    evaluateScholarshipEligibility: evaluateScholarshipEligibility,
    mount: mount
  };
});
