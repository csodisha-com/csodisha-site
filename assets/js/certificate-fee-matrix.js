/**
 * Common Sense Odisha — Bilingual Odisha Certificate Validity & Fee Waiver Matrix (v411)
 * Mounted on /guides/ and /tools/ (#cso-certificate-fee-matrix-root) with localStorage filter state
 * (`cso_cert_matrix_prefs_v1`), certificate expiry calculator, and OPSC/OSSC/OSSSC/Central fee rules.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOCertificateFeeMatrix = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCertificateFeeMatrix = api;
})(function (win, doc) {
  'use strict';

  var PREFS_KEY = 'cso_cert_matrix_prefs_v1';

  var EXAM_BOARDS = [
    { key: 'all', en: 'All Exam Boards', or: 'ସମସ୍ତ ପରୀକ୍ଷା ବୋର୍ଡ' },
    { key: 'opsc', en: 'OPSC (Odisha Public Service Commission)', or: 'OPSC (ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ)' },
    { key: 'ossc', en: 'OSSC (Odisha Staff Selection)', or: 'OSSC (ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ)' },
    { key: 'osssc', en: 'OSSSC (Subordinate Staff Selection)', or: 'OSSSC (ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ)' },
    { key: 'central', en: 'Central Exams (UPSC / SSC / CTET / NTA)', or: 'କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା (UPSC / SSC / CTET / NTA)' }
  ];

  var CANDIDATE_CATEGORIES = [
    { key: 'all', en: 'All Categories', or: 'ସମସ୍ତ ବର୍ଗ' },
    { key: 'ur', en: 'UR / General', or: 'ସାଧାରଣ / UR' },
    { key: 'sebc_obc', en: 'SEBC / OBC', or: 'SEBC / OBC' },
    { key: 'sc_st', en: 'SC / ST', or: 'SC / ST' },
    { key: 'ews', en: 'EWS', or: 'EWS (ଆର୍ଥିକ ଦୁର୍ବଳ)' },
    { key: 'pwbd', en: 'PwBD (≥40% Disability)', or: 'PwBD (≥୪୦% ଭିନ୍ନକ୍ଷମ)' },
    { key: 'women', en: 'Women Candidate', or: 'ମହିଳା ପ୍ରାର୍ଥୀ' }
  ];

  var VALIDITY_FILTERS = [
    { key: 'all', en: 'All Validity Windows', or: 'ସମସ୍ତ ବୈଧତା ଅବଧି' },
    { key: 'permanent', en: 'Permanent / Lifetime', or: 'ସ୍ଥାୟୀ / ଆଜୀବନ' },
    { key: 'fy', en: 'Annual / Financial Year Renewal', or: 'ବାର୍ଷିକ / ଆର୍ଥିକ ବର୍ଷ ନବୀକରଣ' },
    { key: 'conditional', en: '1-Year / 3-Year / Conditional', or: '୧-ବର୍ଷ / ୩-ବର୍ଷ / ସର୍ତ୍ତମୂଳକ' }
  ];

  var CERTIFICATES = [
    {
      key: 'caste-sc-st',
      name_en: 'Caste Certificate (SC / ST)',
      name_or: 'ଜାତି ପ୍ରମାଣପତ୍ର (SC / ST)',
      authority_en: 'Tehsildar / Addl. Tehsildar / Sub-Collector (e-District Odisha)',
      authority_or: 'ତହସିଲଦାର / ଅତିରିକ୍ତ ତହସିଲଦାର / ଉପ-ଜିଲ୍ଲାପାଳ (e-District Odisha)',
      validity_type: 'permanent',
      validity_en: 'Permanent (No renewal required unless name/jurisdiction changes)',
      validity_or: 'ସ୍ଥାୟୀ (ନାମ ବା ଠିକଣା ପରିବର୍ତ୍ତନ ନହେଲେ ନବୀକରଣ ଆବଶ୍ୟକ ନାହିଁ)',
      note_en: 'Valid across OPSC, OSSC, OSSSC, UPSC, SSC, CTET, and NTA.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['sc_st', 'women'],
      portal_url: 'https://edistrict.odisha.gov.in'
    },
    {
      key: 'sebc-state',
      name_en: 'SEBC Certificate (Odisha State List)',
      name_or: 'SEBC ପ୍ରମାଣପତ୍ର (ଓଡ଼ିଶା ରାଜ୍ୟ ତାଲିକା)',
      authority_en: 'Tehsildar / Addl. Tehsildar (e-District Odisha)',
      authority_or: 'ତହସିଲଦାର / ଅତିରିକ୍ତ ତହସିଲଦାର (e-District Odisha)',
      validity_type: 'conditional',
      duration_years: 1,
      validity_en: '1 Year from date of issue (or as per OPSC/OSSC/OSSSC advertisement cut-off)',
      validity_or: 'ଜାରି ତାରିଖଠାରୁ ୧ ବର୍ଷ (କିମ୍ବା ବିଜ୍ଞପ୍ତିର ଶେଷ ତାରିଖ ଅନୁଯାୟୀ)',
      note_en: 'Valid ONLY for Odisha State Govt jobs/admissions — NOT valid for Central Govt exams.',
      boards: ['opsc', 'ossc', 'osssc'],
      categories: ['sebc_obc', 'women'],
      portal_url: 'https://edistrict.odisha.gov.in'
    },
    {
      key: 'obc-central-ncl',
      name_en: 'OBC Non-Creamy Layer (Central List NCL)',
      name_or: 'OBC ନନ୍-କ୍ରିମି ଲେୟାର (କେନ୍ଦ୍ରୀୟ ତାଲିକା NCL)',
      authority_en: 'Tehsildar / Sub-Collector (Central Govt Prescribed Format)',
      authority_or: 'ତହସିଲଦାର / ଉପ-ଜିଲ୍ଲାପାଳ (କେନ୍ଦ୍ରୀୟ ସରକାର ଫର୍ମାଟ୍)',
      validity_type: 'fy',
      validity_en: '1 Financial Year (Issued after April 1 of the relevant FY; ₹8.00 Lakh ceiling)',
      validity_or: '୧ ଆର୍ଥିକ ବର୍ଷ (ଏପ୍ରିଲ ୧ ପରେ ଜାରି; ₹୮.୦୦ ଲକ୍ଷ ଆୟ ସୀମା)',
      note_en: 'Mandatory for UPSC, SSC, CBSE CTET, NTA, Railways, and IBPS OBC reservation.',
      boards: ['central'],
      categories: ['sebc_obc', 'women'],
      portal_url: 'https://edistrict.odisha.gov.in'
    },
    {
      key: 'ews-income-asset',
      name_en: 'EWS (Income & Asset Certificate)',
      name_or: 'EWS (ଆୟ ଓ ସମ୍ପତ୍ତି ପ୍ରମାଣପତ୍ର)',
      authority_en: 'Tehsildar / Addl. Tehsildar / Sub-Collector',
      authority_or: 'ତହସିଲଦାର / ଅତିରିକ୍ତ ତହସିଲଦାର / ଉପ-ଜିଲ୍ଲାପାଳ',
      validity_type: 'fy',
      validity_en: '1 Financial Year (Valid for FY of issue; family gross annual income < ₹8.00 Lakh + asset limits)',
      validity_or: '୧ ଆର୍ଥିକ ବର୍ଷ (ବାର୍ଷିକ ପାରିବାରିକ ଆୟ ₹୮ ଲକ୍ଷରୁ କମ୍ ଓ ସମ୍ପତ୍ତି ମାନଦଣ୍ଡ)',
      note_en: 'Required for 10% EWS reservation in both State and Central Govt posts.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['ews', 'ur', 'women'],
      portal_url: 'https://edistrict.odisha.gov.in'
    },
    {
      key: 'resident-nativity',
      name_en: 'Resident / Nativity Certificate',
      name_or: 'ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର (Resident / Nativity)',
      authority_en: 'Tehsildar / Addl. Tehsildar (e-District Odisha)',
      authority_or: 'ତହସିଲଦାର / ଅତିରିକ୍ତ ତହସିଲଦାର (e-District Odisha)',
      validity_type: 'permanent',
      validity_en: 'Permanent (Some district-cadre walk-in notices ask for issue within last 1–3 years)',
      validity_or: 'ସ୍ଥାୟୀ (କିଛି ଜିଲ୍ଲାସ୍ତରୀୟ ନିଯୁକ୍ତିରେ ଗତ ୧–୩ ବର୍ଷର ପ୍ରମାଣପତ୍ର ମଗାଯାଏ)',
      note_en: 'Essential proof of Odisha domicile and district residency for OSSSC/district walk-ins.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['ur', 'sebc_obc', 'sc_st', 'ews', 'pwbd', 'women'],
      portal_url: 'https://edistrict.odisha.gov.in'
    },
    {
      key: 'income-certificate',
      name_en: 'Income Certificate',
      name_or: 'ଆୟ ପ୍ରମାଣପତ୍ର (Income Certificate)',
      authority_en: 'Tehsildar / Addl. Tehsildar (e-District Odisha)',
      authority_or: 'ତହସିଲଦାର / ଅତିରିକ୍ତ ତହସିଲଦାର (e-District Odisha)',
      validity_type: 'conditional',
      duration_years: 1,
      validity_en: '1 Year from date of issue',
      validity_or: 'ଜାରି ତାରିଖଠାରୁ ୧ ବର୍ଷ',
      note_en: 'Used for Post-Matric / Nua-O Scholarships, fee waivers, and Subhadra / welfare verification.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['ur', 'sebc_obc', 'sc_st', 'ews', 'pwbd', 'women'],
      portal_url: 'https://edistrict.odisha.gov.in'
    },
    {
      key: 'pwbd-udid',
      name_en: 'PwBD Disability Certificate & UDID Card',
      name_or: 'PwBD ଭିନ୍ନକ୍ଷମ ପ୍ରମାଣପତ୍ର ଓ UDID କାର୍ଡ',
      authority_en: 'Chief District Medical & Public Health Officer (CDM & PHO) / Medical Board (Swavlamban)',
      authority_or: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଧିକାରୀ (CDM & PHO) / ମେଡିକାଲ୍ ବୋର୍ଡ',
      validity_type: 'permanent',
      validity_en: 'Permanent (for ≥40% permanent disability) or Until Re-assessment Date (temporary)',
      validity_or: 'ସ୍ଥାୟୀ (≥୪୦% ସ୍ଥାୟୀ ଭିନ୍ନକ୍ଷମତା) କିମ୍ବା ପୁନଃ-ମୂଲ୍ୟାୟନ ତାରିଖ ପର୍ଯ୍ୟନ୍ତ',
      note_en: 'Grants reservation, scribe facility, compensatory time, and Central exam fee exemptions.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['pwbd', 'women'],
      portal_url: 'https://swavlambancard.gov.in'
    },
    {
      key: 'abc-id',
      name_en: 'ABC ID (Academic Bank of Credits)',
      name_or: 'ABC ID (ଏକାଡେମିକ୍ ବ୍ୟାଙ୍କ ଅଫ୍ କ୍ରେଡିଟସ୍)',
      authority_en: 'NAD / DigiLocker / UGC Portal (abc.gov.in)',
      authority_or: 'NAD / ଡିଜିଲକର୍ / UGC ପୋର୍ଟାଲ୍ (abc.gov.in)',
      validity_type: 'permanent',
      validity_en: 'Permanent (12-digit lifelong student academic credit ID)',
      validity_or: 'ସ୍ଥାୟୀ (୧୨-ଅଙ୍କ ବିଶିଷ୍ଟ ଆଜୀବନ ଛାତ୍ର କ୍ରେଡିଟ୍ ID)',
      note_en: 'Mandatory for NEP 2020 university admissions, Odisha Higher Education counseling & verification.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['ur', 'sebc_obc', 'sc_st', 'ews', 'pwbd', 'women'],
      portal_url: 'https://www.abc.gov.in'
    },
    {
      key: 'esm-sportsperson',
      name_en: 'Ex-Servicemen / Sportsperson Identity Card',
      name_or: 'ପୂର୍ବତନ ସୈନିକ / କ୍ରୀଡ଼ାବିତ୍ ପରିଚୟପତ୍ର',
      authority_en: 'Zilla / Rajya Sainik Board or Directorate of Sports & Youth Services, Odisha',
      authority_or: 'ଜିଲ୍ଲା / ରାଜ୍ୟ ସୈନିକ ବୋର୍ଡ କିମ୍ବା ଓଡ଼ିଶା କ୍ରୀଡ଼ା ଓ ଯୁବ ସେବା ନିର୍ଦ୍ଦେଶାଳୟ',
      validity_type: 'permanent',
      validity_en: 'Permanent / Service Discharge Linked',
      validity_or: 'ସ୍ଥାୟୀ / ଚାକିରି ଅବସର ପ୍ରମାଣପତ୍ର ସହ ସଂଯୁକ୍ତ',
      note_en: 'Required for horizontal reservation and age relaxation in OPSC, OSSC, OSSSC & Central exams.',
      boards: ['opsc', 'ossc', 'osssc', 'central'],
      categories: ['ur', 'sebc_obc', 'sc_st', 'ews', 'women'],
      portal_url: 'https://sports.odisha.gov.in'
    }
  ];

  var FEE_MATRIX = [
    {
      board: 'opsc',
      board_en: 'OPSC (Odisha Public Service Commission)',
      board_or: 'OPSC (ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ)',
      policy_en: 'Exempted (₹0) for ALL categories per Odisha GA & PG Dept fee-waiver policy.',
      policy_or: 'ଓଡ଼ିଶା ସରକାରଙ୍କ ନୀତି ଅନୁଯାୟୀ ସମସ୍ତ ବର୍ଗ ପାଇଁ ଆବେଦନ ଫି ସମ୍ପୂର୍ଣ୍ଣ ଛାଡ଼ (₹0)।',
      fees: {
        ur: '₹0 (Exempted)',
        sebc_obc: '₹0 (Exempted)',
        sc_st: '₹0 (Exempted)',
        ews: '₹0 (Exempted)',
        pwbd: '₹0 (Exempted)',
        women: '₹0 (Exempted)'
      }
    },
    {
      board: 'ossc',
      board_en: 'OSSC (Odisha Staff Selection Commission)',
      board_or: 'OSSC (ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ)',
      policy_en: 'Exempted (₹0) for ALL categories across OSSC recruitment advertisements.',
      policy_or: 'ସମସ୍ତ OSSC ନିଯୁକ୍ତି ପରୀକ୍ଷାରେ ସମସ୍ତ ବର୍ଗ ପାଇଁ ପରୀକ୍ଷା ଫି ଛାଡ଼ (₹0)।',
      fees: {
        ur: '₹0 (Exempted)',
        sebc_obc: '₹0 (Exempted)',
        sc_st: '₹0 (Exempted)',
        ews: '₹0 (Exempted)',
        pwbd: '₹0 (Exempted)',
        women: '₹0 (Exempted)'
      }
    },
    {
      board: 'osssc',
      board_en: 'OSSSC (Odisha Subordinate Staff Selection)',
      board_or: 'OSSSC (ଓଡ଼ିଶା ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ)',
      policy_en: 'Exempted (₹0) for ALL categories across combined & district-cadre recruitments.',
      policy_or: 'ସମସ୍ତ OSSSC ମିଳିତ ଓ ଜିଲ୍ଲାସ୍ତରୀୟ ନିଯୁକ୍ତିରେ ସମସ୍ତ ବର୍ଗ ପାଇଁ ଫି ଛାଡ଼ (₹0)।',
      fees: {
        ur: '₹0 (Exempted)',
        sebc_obc: '₹0 (Exempted)',
        sc_st: '₹0 (Exempted)',
        ews: '₹0 (Exempted)',
        pwbd: '₹0 (Exempted)',
        women: '₹0 (Exempted)'
      }
    },
    {
      board: 'central',
      board_en: 'Central Exams (UPSC / SSC / CBSE CTET / NTA)',
      board_or: 'କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା (UPSC / SSC / CBSE CTET / NTA)',
      policy_en: '100% exempted (₹0) for SC/ST/PwBD/Women in UPSC & SSC; 50% concession in CBSE CTET & NTA.',
      policy_or: 'UPSC ଓ SSC ରେ SC/ST/PwBD/ମହିଳାଙ୍କ ପାଇଁ ₹0; CBSE CTET ଓ NTA ରେ ୫୦% ରିହାତି।',
      fees: {
        ur: '₹100 (UPSC/SSC) · ₹1,000–₹1,200 (CTET/NTA)',
        sebc_obc: '₹100 (UPSC/SSC) · ₹600–₹1,000 (CTET/NTA)',
        sc_st: '₹0 (UPSC/SSC) · 50% Concession (CTET/NTA)',
        ews: '₹100 (UPSC/SSC) · ₹600–₹1,000 (CTET/NTA)',
        pwbd: '₹0 (UPSC/SSC) · 50% Concession (CTET/NTA)',
        women: '₹0 (UPSC/SSC) · Standard / Category Rate (CTET/NTA)'
      }
    }
  ];

  function checkCertificateExpiry(certKey, issueDateIso, refDate) {
    var cert = null;
    for (var i = 0; i < CERTIFICATES.length; i += 1) {
      if (CERTIFICATES[i].key === certKey) { cert = CERTIFICATES[i]; break; }
    }
    if (!cert) return null;
    if (cert.validity_type === 'permanent') {
      return {
        cert_key: cert.key,
        status: 'permanent',
        expiry_iso: null,
        days_left: null,
        message_en: 'Permanent / Lifetime Validity — No annual renewal required.',
        message_or: 'ସ୍ଥାୟୀ ବୈଧତା — ବାର୍ଷିକ ନବୀକରଣ ଆବଶ୍ୟକ ନାହିଁ।'
      };
    }
    var parts = String(issueDateIso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return {
        cert_key: cert.key,
        status: 'invalid_date',
        expiry_iso: null,
        days_left: null,
        message_en: 'Enter a valid certificate issue date (YYYY-MM-DD).',
        message_or: 'ସଠିକ୍ ପ୍ରମାଣପତ୍ର ଜାରି ତାରିଖ ଦିଅନ୍ତୁ।'
      };
    }
    var y = parts[0];
    var m = parts[1];
    var d = parts[2];
    var expY;
    var expM;
    var expD;

    if (cert.validity_type === 'fy') {
      // Financial Year runs April 1 to March 31
      expY = m >= 4 ? y + 1 : y;
      expM = 3;
      expD = 31;
    } else {
      // Conditional 1-year from issue date
      expY = y + (cert.duration_years || 1);
      expM = m;
      expD = d;
    }

    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var expiryIso = expY + '-' + pad2(expM) + '-' + pad2(expD);
    var now = refDate instanceof Date ? refDate : new Date();
    var todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    var expUtc = Date.UTC(expY, expM - 1, expD);
    var daysLeft = Math.round((expUtc - todayUtc) / 86400000);

    var status = daysLeft < 0 ? 'expired' : (daysLeft <= 45 ? 'expiring_soon' : 'valid');
    return {
      cert_key: cert.key,
      status: status,
      expiry_iso: expiryIso,
      days_left: daysLeft,
      message_en: status === 'expired'
        ? ('Expired on ' + expiryIso + ' (' + Math.abs(daysLeft) + ' days ago) — Renew on e-District Odisha before applying.')
        : (status === 'expiring_soon'
          ? ('Expiring soon on ' + expiryIso + ' (' + daysLeft + ' days left) — Apply for renewal early.')
          : ('Valid until ' + expiryIso + ' (' + daysLeft + ' days remaining).')),
      message_or: status === 'expired'
        ? (expiryIso + ' ରେ ଅବଧି ଶେଷ ହୋଇଛି — ଆବେଦନ ପୂର୍ବରୁ e-District Odisha ରେ ନବୀକରଣ କରନ୍ତୁ।')
        : (expiryIso + ' ପର୍ଯ୍ୟନ୍ତ ବୈଧ (' + daysLeft + ' ଦିନ ବାକି ଅଛି)।')
    };
  }

  function filterCertificates(filters) {
    var f = filters || {};
    var board = f.board || 'all';
    var category = f.category || 'all';
    var validity = f.validity || 'all';
    var q = String(f.query || '').trim().toLowerCase();

    return CERTIFICATES.filter(function (c) {
      if (board !== 'all' && c.boards.indexOf(board) === -1) return false;
      if (category !== 'all' && c.categories.indexOf(category) === -1) return false;
      if (validity !== 'all' && c.validity_type !== validity) return false;
      if (q) {
        var hay = [c.name_en, c.name_or, c.authority_en, c.validity_en, c.note_en].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function getFeeRule(boardKey, categoryKey) {
    var b = FEE_MATRIX.find(function (x) { return x.board === boardKey; });
    if (!b) return '';
    return b.fees[categoryKey] || '';
  }

  function loadPrefs() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          return {
            board: String(p.board || 'all'),
            category: String(p.category || 'all'),
            validity: String(p.validity || 'all'),
            query: String(p.query || '')
          };
        }
      }
    } catch (_) {}
    return { board: 'all', category: 'all', validity: 'all', query: '' };
  }

  function savePrefs(p) {
    try {
      if (win && win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch (_) {}
  }

  function detectLang() {
    try {
      if (doc && doc.documentElement && doc.documentElement.getAttribute('lang') === 'or') return 'or';
      if (win && win.localStorage) {
        if (win.localStorage.getItem('cso_lang_pref') === 'or' || win.localStorage.getItem('cso_lang') === 'or') return 'or';
      }
    } catch (_) {}
    return 'en';
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = Object.assign({
      lang: detectLang(),
      activeTab: 'certificates', // 'certificates' | 'fees'
      expiryCertKey: 'sebc-state',
      expiryIssueDate: '2026-04-15',
      copiedToast: false
    }, loadPrefs());

    function persistAndRender() {
      savePrefs({
        board: state.board,
        category: state.category,
        validity: state.validity,
        query: state.query
      });
      render();
    }

    function render() {
      var isOr = state.lang === 'or';
      var filteredCerts = filterCertificates(state);
      var visibleBoards = state.board === 'all'
        ? FEE_MATRIX
        : FEE_MATRIX.filter(function (b) { return b.board === state.board; });

      var wrap = el('section', 'cso-cfm-card');
      wrap.setAttribute('data-cso-cert-matrix', 'v411');
      wrap.setAttribute('aria-label', isOr ? 'ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ବୈଧତା ଓ ପରୀକ୍ଷା ଫି ଛାଡ଼ ସାରଣୀ' : 'Odisha Certificate Validity and Fee Waiver Matrix');

      // Header
      var head = el('div', 'cso-cfm-head');
      var headLeft = el('div', 'cso-cfm-head-left');
      headLeft.appendChild(el('span', 'cso-cfm-badge', isOr ? '📜 ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ଓ ପରୀକ୍ଷା ଫି ଗାଇଡ୍' : '📜 Official Odisha Certificate & Fee Waiver Guide'));
      headLeft.appendChild(el('h2', 'cso-cfm-title', isOr
        ? 'ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ବୈଧତା ଓ ଆବେଦନ ଫି ଛାଡ଼ ସାରଣୀ'
        : 'Bilingual Odisha Certificate Validity & Fee Waiver Matrix'));
      headLeft.appendChild(el('p', 'cso-cfm-sub', isOr
        ? 'OPSC, OSSC, OSSSC ଓ କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା (UPSC / SSC / CTET / NTA) ପାଇଁ ଆବଶ୍ୟକ ପ୍ରମାଣପତ୍ର, ଜାରି କର୍ତ୍ତୃପକ୍ଷ, ବୈଧତା ଓ ଫି ଛାଡ଼ ତଥ୍ୟ।'
        : 'Compare issuing authorities, exact renewal windows, and category-wise application fee exemptions across OPSC, OSSC, OSSSC, UPSC, SSC, CBSE CTET, and NTA.'));

      var headRight = el('div', 'cso-cfm-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-cfm-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        headRight.appendChild(lb);
      });
      var copyBtn = el('button', 'cso-cfm-btn', state.copiedToast ? '✓ Checklist Copied' : '📋 Copy Certificate Checklist');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var lines = ['CS Odisha Certificate Checklist (' + state.board.toUpperCase() + '):']
          .concat(filteredCerts.map(function (c, idx) {
            return (idx + 1) + '. ' + c.name_en + ' — ' + c.validity_en + ' (' + c.authority_en + ')';
          }));
        if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
          win.navigator.clipboard.writeText(lines.join('\n')).catch(function () {});
        }
        state.copiedToast = true;
        render();
      });
      var printBtn = el('button', 'cso-cfm-btn', '🖨️ Print Matrix');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (win && typeof win.print === 'function') win.print(); });
      headRight.append(copyBtn, printBtn);
      head.append(headLeft, headRight);
      wrap.appendChild(head);

      // Exam Board Pills
      var boardBar = el('div', 'cso-cfm-pill-bar');
      boardBar.setAttribute('role', 'group');
      boardBar.setAttribute('aria-label', 'Exam board filter');
      EXAM_BOARDS.forEach(function (b) {
        var act = state.board === b.key;
        var bb = el('button', 'cso-cfm-pill' + (act ? ' is-active' : ''), isOr ? b.or : b.en);
        bb.type = 'button';
        bb.setAttribute('aria-pressed', act ? 'true' : 'false');
        bb.addEventListener('click', function () { state.board = b.key; persistAndRender(); });
        boardBar.appendChild(bb);
      });
      wrap.appendChild(boardBar);

      // Filters Row
      var ctrlRow = el('div', 'cso-cfm-controls');
      var catField = el('label', 'cso-cfm-field');
      catField.appendChild(el('span', 'cso-cfm-field-lbl', isOr ? 'ପ୍ରାର୍ଥୀ ବର୍ଗ' : 'Candidate Category'));
      var catSel = el('select', 'cso-cfm-select');
      CANDIDATE_CATEGORIES.forEach(function (cc) {
        var o = el('option', '', isOr ? cc.or : cc.en);
        o.value = cc.key;
        if (state.category === cc.key) o.selected = true;
        catSel.appendChild(o);
      });
      catSel.addEventListener('change', function () { state.category = catSel.value; persistAndRender(); });
      catField.appendChild(catSel);

      var valField = el('label', 'cso-cfm-field');
      valField.appendChild(el('span', 'cso-cfm-field-lbl', isOr ? 'ବୈଧତା ପ୍ରକାର' : 'Validity Window'));
      var valSel = el('select', 'cso-cfm-select');
      VALIDITY_FILTERS.forEach(function (vf) {
        var o = el('option', '', isOr ? vf.or : vf.en);
        o.value = vf.key;
        if (state.validity === vf.key) o.selected = true;
        valSel.appendChild(o);
      });
      valSel.addEventListener('change', function () { state.validity = valSel.value; persistAndRender(); });
      valField.appendChild(valSel);

      var qField = el('label', 'cso-cfm-field');
      qField.appendChild(el('span', 'cso-cfm-field-lbl', isOr ? 'ପ୍ରମାଣପତ୍ର ଖୋଜନ୍ତୁ' : 'Search Certificate'));
      var qInp = el('input', 'cso-cfm-input');
      qInp.type = 'search';
      qInp.value = state.query;
      qInp.placeholder = isOr ? 'SEBC, EWS, OBC NCL, UDID, ABC…' : 'SEBC, EWS, OBC NCL, UDID, ABC…';
      qInp.addEventListener('input', function () { state.query = qInp.value; persistAndRender(); });
      qField.appendChild(qInp);

      ctrlRow.append(catField, valField, qField);
      wrap.appendChild(ctrlRow);

      // Quick Certificate Expiry Checker Box
      var expBox = el('div', 'cso-cfm-expiry-box');
      expBox.appendChild(el('div', 'cso-cfm-sec-lbl', isOr ? '📅 ମୋର ପ୍ରମାଣପତ୍ର ବୈଧତା ଯାଞ୍ଚ କରନ୍ତୁ' : '📅 Check My Certificate Expiry'));
      var expGrid = el('div', 'cso-cfm-controls');

      var ecField = el('label', 'cso-cfm-field');
      ecField.appendChild(el('span', 'cso-cfm-field-lbl', isOr ? 'ପ୍ରମାଣପତ୍ର ପ୍ରକାର' : 'Certificate Type'));
      var ecSel = el('select', 'cso-cfm-select');
      CERTIFICATES.forEach(function (c) {
        var o = el('option', '', isOr ? c.name_or : c.name_en);
        o.value = c.key;
        if (state.expiryCertKey === c.key) o.selected = true;
        ecSel.appendChild(o);
      });
      ecSel.addEventListener('change', function () { state.expiryCertKey = ecSel.value; render(); });
      ecField.appendChild(ecSel);

      var edField = el('label', 'cso-cfm-field');
      edField.appendChild(el('span', 'cso-cfm-field-lbl', isOr ? 'ଜାରି ତାରିଖ' : 'Issue Date'));
      var edInp = el('input', 'cso-cfm-input');
      edInp.type = 'date';
      edInp.value = state.expiryIssueDate;
      edInp.addEventListener('change', function () { state.expiryIssueDate = edInp.value; render(); });
      edField.appendChild(edInp);

      var expRes = checkCertificateExpiry(state.expiryCertKey, state.expiryIssueDate);
      var expOut = el('div', 'cso-cfm-expiry-res' + (expRes && expRes.status === 'expired' ? ' is-expired' : ''), expRes ? (isOr ? expRes.message_or : expRes.message_en) : '');
      expGrid.append(ecField, edField);
      expBox.append(expGrid, expOut);
      wrap.appendChild(expBox);

      // Section 1: 9-Certificate Validity & Issuing Authority Matrix
      wrap.appendChild(el('h3', 'cso-cfm-subhead', isOr
        ? ('୧. ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ବୈଧତା ଓ ଜାରି କର୍ତ୍ତୃପକ୍ଷ (' + filteredCerts.length + 'ଟି)')
        : ('1. Odisha Certificate Validity & Issuing Authority Matrix (' + filteredCerts.length + ')')));

      var certGrid = el('div', 'cso-cfm-grid');
      filteredCerts.forEach(function (c) {
        var item = el('article', 'cso-cfm-item');
        var top = el('div', 'cso-cfm-item-top');
        top.appendChild(el('span', 'cso-cfm-tag', c.validity_type === 'permanent' ? (isOr ? 'ସ୍ଥାୟୀ' : 'Permanent') : (c.validity_type === 'fy' ? (isOr ? 'ଆର୍ଥିକ ବର୍ଷ (FY)' : '1 Financial Year') : (isOr ? '୧ ବର୍ଷ / ସର୍ତ୍ତମୂଳକ' : '1 Year / Conditional'))));
        item.appendChild(top);
        item.appendChild(el('h4', 'cso-cfm-item-title', isOr ? c.name_or : c.name_en));
        item.appendChild(el('div', 'cso-cfm-meta', (isOr ? 'ଜାରି କର୍ତ୍ତୃପକ୍ଷ: ' : 'Issuing Authority: ') + (isOr ? c.authority_or : c.authority_en)));
        item.appendChild(el('div', 'cso-cfm-meta', (isOr ? 'ବୈଧତା: ' : 'Validity: ') + (isOr ? c.validity_or : c.validity_en)));
        item.appendChild(el('p', 'cso-cfm-note', c.note_en));
        var link = el('a', 'cso-cfm-link', isOr ? 'ସରକାରୀ ପୋର୍ଟାଲ୍ ↗' : 'Official Portal ↗');
        link.setAttribute('href', c.portal_url);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        item.appendChild(link);
        certGrid.appendChild(item);
      });
      wrap.appendChild(certGrid);

      // Section 2: Application Fee Exemption Matrix Across Exam Boards
      wrap.appendChild(el('h3', 'cso-cfm-subhead', isOr
        ? '୨. ପରୀକ୍ଷା ବୋର୍ଡ ଅନୁଯାୟୀ ଆବେଦନ ଫି ଛାଡ଼ ସାରଣୀ (OPSC / OSSC / OSSSC / Central)'
        : '2. Application Fee Exemption & Concession Matrix (OPSC / OSSC / OSSSC / Central)'));

      var tableWrap = el('div', 'cso-cfm-table-wrap');
      var tbl = el('table', 'cso-cfm-table');
      var thead = el('thead');
      var hr = el('tr');
      [
        isOr ? 'ପରୀକ୍ଷା ବୋର୍ଡ' : 'Exam Board',
        'UR / Gen',
        'SEBC / OBC',
        'SC / ST',
        'EWS',
        'PwBD (≥40%)',
        isOr ? 'ମହିଳା' : 'Women'
      ].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      visibleBoards.forEach(function (b) {
        var tr = el('tr');
        var tdBoard = el('td');
        tdBoard.append(el('strong', '', isOr ? b.board_or : b.board_en), el('div', 'cso-cfm-td-note', isOr ? b.policy_or : b.policy_en));
        tr.appendChild(tdBoard);
        ['ur', 'sebc_obc', 'sc_st', 'ews', 'pwbd', 'women'].forEach(function (ck) {
          tr.appendChild(el('td', state.category === ck ? 'is-highlight' : '', b.fees[ck]));
        });
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
      wrap.appendChild(tableWrap);

      container.replaceChildren(wrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-certificate-fee-matrix-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v411',
    PREFS_KEY: PREFS_KEY,
    EXAM_BOARDS: EXAM_BOARDS,
    CANDIDATE_CATEGORIES: CANDIDATE_CATEGORIES,
    VALIDITY_FILTERS: VALIDITY_FILTERS,
    CERTIFICATES: CERTIFICATES,
    FEE_MATRIX: FEE_MATRIX,
    checkCertificateExpiry: checkCertificateExpiry,
    filterCertificates: filterCertificates,
    getFeeRule: getFeeRule,
    mount: mount
  };
});
