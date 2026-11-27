/**
 * Common Sense Odisha — Interactive Odisha Govt Scheme & Scholarship Eligibility Finder (v410)
 * Local-first filterable eligibility checker mounted on /schemes/ (#cso-schemes-eligibility-finder-root)
 * with localStorage preference persistence (`cso_schemes_finder_prefs_v1`), bilingual EN + Odia UI,
 * dynamic /api/public/search-index scheme merging, and window.CSOSavedAlerts bookmarking.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOSchemesFinder = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOSchemesFinder = api;
})(function (win, doc) {
  'use strict';

  var PREFS_KEY = 'cso_schemes_finder_prefs_v1';

  var CATEGORIES = [
    { key: 'all', en: 'All Schemes', or: 'ସମସ୍ତ ଯୋଜନା' },
    { key: 'women', en: 'Women Empowerment', or: 'ମହିଳା ସଶକ୍ତିକରଣ' },
    { key: 'education', en: 'Education & Scholarships', or: 'ଶିକ୍ଷା ଓ ବୃତ୍ତି' },
    { key: 'healthcare', en: 'Healthcare', or: 'ସ୍ୱାସ୍ଥ୍ୟ ସେବା' },
    { key: 'agriculture', en: 'Agriculture & Farmers', or: 'କୃଷି ଓ କୃଷକ' },
    { key: 'energy-housing', en: 'Clean Energy & Housing', or: 'ସୌର ଶକ୍ତି ଓ ଗୃହ' },
    { key: 'social-security', en: 'Social Security', or: 'ସାମାଜିକ ସୁରକ୍ଷା' }
  ];

  var PROFILES = [
    { key: 'all', en: 'All Profiles', or: 'ସମସ୍ତ ହିତାଧିକାରୀ' },
    { key: 'women', en: 'Women (21–60 yrs)', or: 'ମହିଳା (୨୧–୬୦ ବର୍ଷ)' },
    { key: 'student', en: 'Student (UG / PG / +2)', or: 'ଛାତ୍ରଛାତ୍ରୀ (+୨ / UG / PG)' },
    { key: 'farmer', en: 'Farmer / Landless Agri Household', or: 'କୃଷକ / ଭୂମିହୀନ କୃଷି ପରିବାର' },
    { key: 'senior_pwbd', en: 'Senior Citizen / Widow / PwBD', or: 'ବରିଷ୍ଠ ନାଗରିକ / ବିଧବା / ଭିନ୍ନକ୍ଷମ' },
    { key: 'residential_consumer', en: 'Residential Electricity Consumer', or: 'ଘରୋଇ ବିଦ୍ୟୁତ୍ ଉପଭୋକ୍ତା' }
  ];

  var SOCIAL_CATEGORIES = [
    { key: 'all', en: 'All Categories', or: 'ସମସ୍ତ ବର୍ଗ' },
    { key: 'general', en: 'General / UR', or: 'ସାଧାରଣ / UR' },
    { key: 'sebc', en: 'SEBC / OBC', or: 'SEBC / OBC' },
    { key: 'sc', en: 'SC', or: 'SC (ଅନୁସୂଚିତ ଜାତି)' },
    { key: 'st', en: 'ST', or: 'ST (ଅନୁସୂଚିତ ଜନଜାତି)' },
    { key: 'ews_nfsa', en: 'EWS / NFSA-SFSS Ration Card', or: 'EWS / NFSA-SFSS ରାସନ କାର୍ଡ' }
  ];

  var INCOME_BRACKETS = [
    { key: 'any', en: 'Any Income', or: 'ଯେକୌଣସି ଆୟ' },
    { key: '<= 1L', en: 'Up to ₹1.00 Lakh (BPL / Antyodaya)', or: '₹୧.୦୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ (BPL / ଅନ୍ତ୍ୟୋଦୟ)' },
    { key: '<= 2.5L', en: 'Up to ₹2.50 Lakh (NFSA / SFSS / Subhadra / Scholarship)', or: '₹୨.୫୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ (NFSA / ସୁଭଦ୍ରା / ବୃତ୍ତି ସୀମା)' },
    { key: '2.5L-6L', en: '₹2.50 Lakh – ₹6.00 Lakh', or: '₹୨.୫୦ ଲକ୍ଷ – ₹୬.୦୦ ଲକ୍ଷ' },
    { key: '> 6L', en: 'Above ₹6.00 Lakh (No Income Ceiling Schemes)', or: '₹୬.୦୦ ଲକ୍ଷରୁ ଅଧିକ (ଆୟ ସୀମା ନଥିବା ଯୋଜନା)' }
  ];

  var FLAGSHIP_SCHEMES = [
    {
      id: 'subhadra-yojana',
      slug: 'subhadra-yojana',
      name_en: 'Subhadra Yojana',
      name_or: 'ସୁଭଦ୍ରା ଯୋଜନା',
      category: 'women',
      benefit_en: '₹10,000 / Year (₹50,000 over 5 yrs)',
      benefit_or: 'ବାର୍ଷିକ ₹୧୦,୦୦୦ (୫ ବର୍ଷରେ ₹୫୦,୦୦୦)',
      summary_en: 'Direct Benefit Transfer of ₹10,000/year in two ₹5,000 instalments (Raksha Bandhan & International Women\'s Day, 2024–29) to eligible women in Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ଯୋଗ୍ୟ ମହିଳାମାନଙ୍କୁ ୨ଟି କିସ୍ତିରେ (₹୫,୦୦୦ ଲେଖାଏଁ) ବାର୍ଷିକ ₹୧୦,୦୦୦ ସିଧାସଳଖ DBT ସହାୟତା।',
      profiles: ['women'],
      social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: 2.5,
      eligibility_en: [
        'Women aged 21–60 years domiciled in Odisha under NFSA/SFSS or family income ≤ ₹2.50 lakh/year.',
        'Excludes income-tax payers, regular Govt/PSU employees, and recipients of ≥ ₹1,500/month govt aid.',
        'Aadhaar-seeded, DBT-enabled single-holder bank account with e-KYC required.'
      ],
      documents: ['Aadhaar Card', 'NFSA/SFSS Ration Card', 'Income Certificate', 'Aadhaar-Seeded Bank Passbook'],
      official_url: 'https://subhadra.odisha.gov.in'
    },
    {
      id: 'gopabandhu-jan-arogya-yojana',
      slug: 'gopabandhu-jan-arogya-yojana-gjay',
      name_en: 'Gopabandhu Jan Arogya Yojana (GJAY) & Ayushman Bharat PM-JAY',
      name_or: 'ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ ଯୋଜନା (GJAY) ଓ ଆୟୁଷ୍ମାନ ଭାରତ',
      category: 'healthcare',
      benefit_en: 'Up to ₹10 Lakh / Family / Year',
      benefit_or: 'ପରିବାର ପ୍ରତି ବାର୍ଷିକ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ଚିକିତ୍ସା',
      summary_en: 'Cashless treatment up to ₹5 lakh/family/year plus an additional ₹5 lakh exclusively for women members at empanelled hospitals nationwide.',
      summary_or: 'ତାଲିକାଭୁକ୍ତ ହସ୍ପିଟାଲରେ ପରିବାର ପାଇଁ ₹୫ ଲକ୍ଷ ଓ ମହିଳା ସଦସ୍ୟଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ₹୫ ଲକ୍ଷ ମାଗଣା ଚିକିତ୍ସା।',
      profiles: ['women', 'student', 'farmer', 'senior_pwbd', 'residential_consumer'],
      social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: 2.5,
      eligibility_en: [
        'All Odisha NFSA / SFSS ration cardholder families and Ayushman Bharat PM-JAY beneficiaries.',
        'Covers secondary and tertiary hospitalization across empanelled Odisha & national hospitals.',
        'Extra ₹5 lakh top-up dedicated to female family members.'
      ],
      documents: ['Aadhaar Card', 'NFSA/SFSS Ration Card', 'GJAY / Ayushman Health Card'],
      official_url: 'https://health.odisha.gov.in'
    },
    {
      id: 'post-matric-nua-o-scholarship',
      slug: 'odisha-post-matric-nua-o-scholarship',
      name_en: 'Odisha Post-Matric & Nua-O Scholarship (State Scholarship Portal)',
      name_or: 'ଓଡ଼ିଶା ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ନୂଆ-ଓ ବୃତ୍ତି (State Scholarship Portal)',
      category: 'education',
      benefit_en: 'Direct DBT Tuition & Maintenance Stipend',
      benefit_or: 'ସିଧାସଳଖ DBT ଶିକ୍ଷା ଓ ରକ୍ଷଣାବେକ୍ଷଣ ବୃତ୍ତି',
      summary_en: 'Annual scholarship & tuition assistance for SC, ST, OBC/SEBC, and EBC students pursuing +2, UG, PG, and technical courses in Odisha; Nua-O covers eligible UG/PG students.',
      summary_or: '+୨, UG, PG ଓ ବୈଷୟିକ ଶିକ୍ଷା କରୁଥିବା SC, ST, OBC/SEBC ଓ EBC ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ବାର୍ଷିକ DBT ବୃତ୍ତି।',
      profiles: ['student'],
      social_categories: ['sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: 2.5,
      eligibility_en: [
        'Domicile of Odisha enrolled in recognized +2, UG, PG, diploma, or technical institutions.',
        'Annual family income ceiling of ₹2.50 lakh/year for Post-Matric scholarship categories.',
        'Apply online via Odisha State Scholarship Portal with Aadhaar-seeded bank account.'
      ],
      documents: ['Aadhaar Card', 'Caste Certificate', 'Income Certificate', 'Residence Certificate', 'College ID & Marksheet', 'Bank Passbook'],
      official_url: 'https://scholarship.odisha.gov.in'
    },
    {
      id: 'pm-surya-ghar-odisha',
      slug: 'pm-surya-ghar-muft-bijli-yojana-odisha',
      name_en: 'PM Surya Ghar: Muft Bijli Yojana (Odisha Rooftop Solar)',
      name_or: 'ପିଏମ୍ ସୂର୍ଯ୍ୟ ଘର: ମୁକ୍ତ ବିଜୁଳି ଯୋଜନା (ଓଡ଼ିଶା ରୁଫଟପ୍ ସୋଲାର)',
      category: 'energy-housing',
      benefit_en: 'Up to ₹78,000 Central CFA + Odisha Top-Up',
      benefit_or: '₹୭୮,୦୦୦ କେନ୍ଦ୍ରୀୟ ସବସିଡି + ଓଡ଼ିଶା ରାଜ୍ୟ ସହାୟତା',
      summary_en: 'Central CFA subsidy (₹30,000 for 1 kW, ₹60,000 for 2 kW, ₹78,000 for 3 kW+) plus Odisha state top-up subsidy for residential electricity consumers; no upper income cap.',
      summary_or: 'ଘରୋଇ ବିଦ୍ୟୁତ୍ ଉପଭୋକ୍ତାଙ୍କ ପାଇଁ ୧–୩ kW ରୁଫଟପ୍ ସୋଲାର ଉପରେ ₹୭୮,୦୦୦ ପର୍ଯ୍ୟନ୍ତ କେନ୍ଦ୍ରୀୟ ଓ ରାଜ୍ୟ ସବସିଡି।',
      profiles: ['residential_consumer', 'farmer', 'women', 'senior_pwbd'],
      social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: null,
      eligibility_en: [
        'Open to all residential electricity consumers in Odisha with an active DISCOM connection (TPCODL/TPNODL/TPSODL/TPWODL).',
        'No upper household income limit; eligible across all social categories.',
        'Requires suitable shadow-free roof space and net-metering approval.'
      ],
      documents: ['Aadhaar Card', 'Latest Electricity Bill', 'Bank Passbook / Cancelled Cheque', 'Roof Ownership / ROR Proof'],
      official_url: 'https://pmsuryaghar.gov.in'
    },
    {
      id: 'cm-kisan-samrudha-krushak',
      slug: 'cm-kisan-samrudha-krushak-yojana',
      name_en: 'CM-KISAN & Samrudha Krushak Yojana',
      name_or: 'ସିଏମ୍-କିଷାନ୍ ଓ ସମୃଦ୍ଧ କୃଷକ ଯୋଜନା',
      category: 'agriculture',
      benefit_en: '₹4,000 / Year DBT + ₹3,100/Qtl Paddy Support',
      benefit_or: 'ବାର୍ଷିକ ₹୪,୦୦୦ DBT + କ୍ୱିଣ୍ଟାଲ ପ୍ରତି ₹୩,୧୦୦ ଧାନ ମୂଲ୍ୟ',
      summary_en: '₹4,000/year in two ₹2,000 instalments (Nuakhai & Akshaya Tritiya) to small/marginal farmers and landless agricultural households registered on Krushak Odisha, plus ₹3,100/quintal paddy procurement support.',
      summary_or: 'କୃଷକ ଓଡ଼ିଶାରେ ପଞ୍ଜୀକୃତ କ୍ଷୁଦ୍ର/ନାମମାତ୍ର ଚାଷୀ ଓ ଭୂମିହୀନ କୃଷି ପରିବାରଙ୍କୁ ବାର୍ଷିକ ₹୪,୦୦୦ ଓ ₹୩,୧୦୦/କ୍ୱିଣ୍ଟାଲ ଧାନ ସହାୟତା।',
      profiles: ['farmer'],
      social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: 2.5,
      eligibility_en: [
        'Small & marginal farmers and landless agricultural households registered on the Krushak Odisha portal.',
        'Excludes income-tax payers and regular State/Central Govt or PSU employees.',
        'e-KYC and Aadhaar-linked bank account required for DBT instalments.'
      ],
      documents: ['Aadhaar Card', 'Krushak Odisha ID', 'ROR / Land Patta (or Landless Certificate)', 'Bank Passbook'],
      official_url: 'https://krushak.odisha.gov.in'
    },
    {
      id: 'madhu-babu-pension-yojana',
      slug: 'madhu-babu-pension-yojana-mbpy',
      name_en: 'Madhu Babu Pension Yojana (MBPY)',
      name_or: 'ମଧୁବାବୁ ପେନସନ୍ ଯୋଜନା (MBPY)',
      category: 'social-security',
      benefit_en: '₹1,000 – ₹3,500 / Month DBT Pension',
      benefit_or: 'ମାସିକ ₹୧,୦୦୦ – ₹୩,୫୦୦ DBT ପେନସନ୍',
      summary_en: 'Monthly social security pension (₹1,000–₹1,200/month base; ₹3,500/month for 80+ years or ≥80% disability) for elderly (60+), widows, and PwBD residents from low-income households.',
      summary_or: '୬୦+ ବରିଷ୍ଠ ନାଗରିକ, ବିଧବା ଓ ଭିନ୍ନକ୍ଷମ ହିତାଧିକାରୀଙ୍କ ପାଇଁ ମାସିକ ₹୧,୦୦୦–₹୩,୫୦୦ ସାମାଜିକ ସୁରକ୍ଷା ପେନସନ୍।',
      profiles: ['senior_pwbd', 'women'],
      social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: 1.0,
      eligibility_en: [
        'Permanent resident of Odisha aged 60+ years, widow, or person with ≥40% benchmark disability (UDID).',
        'Enhanced ₹3,500/month pension for beneficiaries aged 80+ years or with ≥80% disability.',
        'Low-income / BPL household not receiving any other regular government pension.'
      ],
      documents: ['Aadhaar Card', 'Age Proof / Voter ID', 'Income Certificate', 'UDID / Widow Certificate (if applicable)', 'Bank Passbook'],
      official_url: 'https://ssepd.odisha.gov.in'
    },
    {
      id: 'antyodaya-gruha-yojana',
      slug: 'antyodaya-gruha-yojana-odisha',
      name_en: 'Antyodaya Gruha Yojana',
      name_or: 'ଅନ୍ତ୍ୟୋଦୟ ଗୃହ ଯୋଜନା',
      category: 'energy-housing',
      benefit_en: '₹1,20,000 Pucca House Grant + Incentives',
      benefit_or: '₹୧,୨୦,୦୦୦ ପକ୍କା ଘର ଅନୁଦାନ + ପ୍ରୋତ୍ସାହନ',
      summary_en: '₹1,20,000 pucca house construction grant (plus early-completion financial incentives) for houseless rural families or kutcha-house households in Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ଗୃହହୀନ ଗ୍ରାମୀଣ ପରିବାର ଓ କଚ୍ଚା ଘର ଥିବା ପରିବାରଙ୍କ ପାଇଁ ₹୧,୨୦,୦୦୦ ପକ୍କା ଘର ନିର୍ମାଣ ସହାୟତା।',
      profiles: ['farmer', 'women', 'senior_pwbd'],
      social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
      income_max_lakh: 1.0,
      eligibility_en: [
        'Houseless rural households or families living in kutcha houses not previously covered under PMAY-G/BPGY.',
        'Priority for Antyodaya / BPL families, PwBD households, and calamity-affected rural families.',
        'Verified through Gram Sabha and Block-level Rural Housing portal.'
      ],
      documents: ['Aadhaar Card', 'NFSA/SFSS or Antyodaya Card', 'Income Certificate', 'ROR / Homestead Land Proof', 'Bank Passbook'],
      official_url: 'https://rhodisha.gov.in'
    }
  ];

  function loadPrefs() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            category: String(parsed.category || 'all'),
            profile: String(parsed.profile || 'all'),
            socialCategory: String(parsed.socialCategory || 'all'),
            incomeBracket: String(parsed.incomeBracket || 'any'),
            query: String(parsed.query || '')
          };
        }
      }
    } catch (_) {}
    return { category: 'all', profile: 'all', socialCategory: 'all', incomeBracket: 'any', query: '' };
  }

  function savePrefs(prefs) {
    try {
      if (win && win.localStorage) {
        win.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      }
    } catch (_) {}
  }

  function incomeMatches(scheme, bracket) {
    if (!bracket || bracket === 'any') return { ok: true, exact: true };
    var cap = scheme.income_max_lakh;
    if (cap === null || cap === undefined) {
      // No income ceiling (e.g. PM Surya Ghar) — eligible across all brackets
      return { ok: true, exact: true };
    }
    if (bracket === '<= 1L') return { ok: true, exact: true };
    if (bracket === '<= 2.5L') return { ok: cap >= 2.5, exact: cap >= 2.5 };
    if (bracket === '2.5L-6L') return { ok: cap >= 6, exact: cap >= 6 };
    if (bracket === '> 6L') return { ok: false, exact: false };
    return { ok: true, exact: true };
  }

  function filterSchemes(catalog, filters) {
    var list = Array.isArray(catalog) ? catalog : FLAGSHIP_SCHEMES;
    var f = filters || {};
    var cat = f.category || 'all';
    var prof = f.profile || 'all';
    var soc = f.socialCategory || 'all';
    var inc = f.incomeBracket || 'any';
    var q = String(f.query || '').trim().toLowerCase();

    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var s = list[i];
      if (!s) continue;
      if (cat !== 'all' && s.category !== cat) continue;
      if (prof !== 'all' && Array.isArray(s.profiles) && s.profiles.indexOf(prof) === -1) continue;
      if (soc !== 'all' && Array.isArray(s.social_categories) && s.social_categories.indexOf(soc) === -1) continue;

      var incCheck = incomeMatches(s, inc);
      if (!incCheck.ok) continue;

      if (q) {
        var hay = [
          s.name_en, s.name_or, s.summary_en, s.summary_or, s.benefit_en,
          (s.documents || []).join(' '), (s.eligibility_en || []).join(' ')
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }

      var isSpecificFilter = (prof !== 'all') || (soc !== 'all') || (inc !== 'any');
      out.push(Object.assign({}, s, {
        matchStatus: isSpecificFilter ? 'likely_eligible' : 'check_criteria'
      }));
    }
    return out;
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

  function inferCategoryFromText(txt) {
    var t = String(txt || '').toLowerCase();
    if (/subhadra|women|mahila|mamata/.test(t)) return 'women';
    if (/scholar|nua-o|student|matric|stipend|education/.test(t)) return 'education';
    if (/health|arogya|ayushman|gjay|hospital|medical/.test(t)) return 'healthcare';
    if (/kisan|krushak|farmer|agri|paddy|kalia/.test(t)) return 'agriculture';
    if (/solar|surya|gruha|housing|awas|bijli/.test(t)) return 'energy-housing';
    return 'social-security';
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = Object.assign({
      lang: detectLang(),
      catalog: FLAGSHIP_SCHEMES.slice()
    }, loadPrefs());

    function persistAndRender() {
      savePrefs({
        category: state.category,
        profile: state.profile,
        socialCategory: state.socialCategory,
        incomeBracket: state.incomeBracket,
        query: state.query
      });
      render();
    }

    // Merge live published scheme articles from /api/public/search-index
    if (typeof fetch === 'function') {
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (payload) {
          var items = payload && Array.isArray(payload.items) ? payload.items : [];
          var existingSlugs = {};
          state.catalog.forEach(function (c) { existingSlugs[String(c.slug || c.id).toLowerCase()] = true; });
          var added = 0;
          for (var i = 0; i < items.length; i += 1) {
            var it = items[i];
            if (!it) continue;
            var isScheme = String(it.category || '').toLowerCase() === 'schemes' || String(it.type || '').toLowerCase() === 'scheme';
            if (!isScheme) continue;
            var sl = String(it.slug || it.id || '').toLowerCase();
            if (!sl || existingSlugs[sl]) continue;
            existingSlugs[sl] = true;
            state.catalog.push({
              id: 'd1-' + sl,
              slug: sl,
              name_en: String(it.title || 'Odisha Scheme').trim(),
              name_or: String(it.title_or || it.title || 'ଓଡ଼ିଶା ଯୋଜନା').trim(),
              category: inferCategoryFromText(it.title + ' ' + (it.summary || '')),
              benefit_en: 'Live D1 Scheme Notice',
              benefit_or: 'ଲାଇଭ୍ D1 ଯୋଜନା ସୂଚନା',
              summary_en: String(it.summary || 'Published official scheme guide on Common Sense Odisha.').trim(),
              summary_or: String(it.summary_or || it.summary || 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶାରେ ପ୍ରକାଶିତ ଯୋଜନା ଗାଇଡ୍।').trim(),
              profiles: ['women', 'student', 'farmer', 'senior_pwbd', 'residential_consumer'],
              social_categories: ['general', 'sebc', 'sc', 'st', 'ews_nfsa'],
              income_max_lakh: null,
              eligibility_en: ['Published in Admin Studio — open the full guide for exact eligibility & apply steps.'],
              documents: ['Aadhaar Card', 'Residence Proof', 'Bank Passbook'],
              official_url: String(it.url || ('/schemes/?slug=' + encodeURIComponent(sl)))
            });
            added += 1;
          }
          if (added > 0) render();
        })
        .catch(function () {});
    }

    function isSchemeSaved(slug) {
      if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.isSaved === 'function') {
        return win.CSOSavedAlerts.isSaved(slug);
      }
      return false;
    }

    function toggleSaveScheme(s) {
      if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.toggle === 'function') {
        win.CSOSavedAlerts.toggle({
          slug: s.slug,
          title: s.name_en,
          url: '/schemes/',
          type: 'scheme',
          org: 'Government of Odisha'
        });
        render();
      }
    }

    function render() {
      var isOr = state.lang === 'or';
      var matched = filterSchemes(state.catalog, state);

      var wrap = el('section', 'cso-sef-card');
      wrap.setAttribute('data-cso-schemes-finder', 'v410');
      wrap.setAttribute('aria-label', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା ଓ ବୃତ୍ତି ଯୋଗ୍ୟତା ଯାଞ୍ଚ' : 'Odisha Govt Scheme and Scholarship Eligibility Finder');

      // Header
      var head = el('div', 'cso-sef-head');
      var headLeft = el('div', 'cso-sef-head-left');
      headLeft.appendChild(el('span', 'cso-sef-badge', isOr ? '🏛️ ୨୦୨୬ ଯାଞ୍ଚିତ ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ରୀୟ ଯୋଜନା' : '🏛️ Verified 2026 Odisha & Central Welfare Finder'));
      headLeft.appendChild(el('h2', 'cso-sef-title', isOr
        ? 'ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା ଓ ବୃତ୍ତି ଯୋଗ୍ୟତା ଯାଞ୍ଚକାରୀ'
        : 'Interactive Odisha Govt Scheme & Scholarship Eligibility Finder'));
      headLeft.appendChild(el('p', 'cso-sef-sub', isOr
        ? 'ସୁଭଦ୍ରା, GJAY, ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍/ନୂଆ-ଓ ବୃତ୍ତି, ପିଏମ୍ ସୂର୍ଯ୍ୟ ଘର, ସିଏମ୍-କିଷାନ୍, ମଧୁବାବୁ ପେନସନ୍ ଓ ଅନ୍ତ୍ୟୋଦୟ ଗୃହ ଯୋଜନାରେ ଆପଣଙ୍କ ଯୋଗ୍ୟତା ତୁରନ୍ତ ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'Check your eligibility across Subhadra Yojana, GJAY, Post-Matric & Nua-O Scholarships, PM Surya Ghar, CM-KISAN, Madhu Babu Pension, and Antyodaya Gruha Yojana in seconds.'));

      var langGroup = el('div', 'cso-sef-lang-group');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-sef-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        langGroup.appendChild(lb);
      });
      head.append(headLeft, langGroup);
      wrap.appendChild(head);

      // Category Pills
      var catBar = el('div', 'cso-sef-pill-bar');
      catBar.setAttribute('role', 'group');
      catBar.setAttribute('aria-label', 'Scheme category filter');
      CATEGORIES.forEach(function (c) {
        var act = state.category === c.key;
        var cb = el('button', 'cso-sef-pill' + (act ? ' is-active' : ''), isOr ? c.or : c.en);
        cb.type = 'button';
        cb.setAttribute('data-sef-cat', c.key);
        cb.setAttribute('aria-pressed', act ? 'true' : 'false');
        cb.addEventListener('click', function () { state.category = c.key; persistAndRender(); });
        catBar.appendChild(cb);
      });
      wrap.appendChild(catBar);

      // Profile Pills
      var profLabel = el('div', 'cso-sef-sec-lbl', isOr ? '👤 ହିତାଧିକାରୀ ପ୍ରୋଫାଇଲ୍ ବାଛନ୍ତୁ:' : '👤 Beneficiary Profile:');
      wrap.appendChild(profLabel);
      var profBar = el('div', 'cso-sef-pill-bar');
      profBar.setAttribute('role', 'group');
      profBar.setAttribute('aria-label', 'Beneficiary profile filter');
      PROFILES.forEach(function (p) {
        var act = state.profile === p.key;
        var pb = el('button', 'cso-sef-pill' + (act ? ' is-active' : ''), isOr ? p.or : p.en);
        pb.type = 'button';
        pb.setAttribute('data-sef-profile', p.key);
        pb.setAttribute('aria-pressed', act ? 'true' : 'false');
        pb.addEventListener('click', function () { state.profile = p.key; persistAndRender(); });
        profBar.appendChild(pb);
      });
      wrap.appendChild(profBar);

      // Selectors + Search + Reset Row
      var controlsRow = el('div', 'cso-sef-controls');

      var socField = el('label', 'cso-sef-field');
      socField.appendChild(el('span', 'cso-sef-field-lbl', isOr ? 'ସାମାଜିକ ବର୍ଗ' : 'Social Category'));
      var socSel = el('select', 'cso-sef-select');
      socSel.setAttribute('aria-label', 'Social Category');
      SOCIAL_CATEGORIES.forEach(function (sc) {
        var o = el('option', '', isOr ? sc.or : sc.en);
        o.value = sc.key;
        if (state.socialCategory === sc.key) o.selected = true;
        socSel.appendChild(o);
      });
      socSel.addEventListener('change', function () { state.socialCategory = socSel.value; persistAndRender(); });
      socField.appendChild(socSel);

      var incField = el('label', 'cso-sef-field');
      incField.appendChild(el('span', 'cso-sef-field-lbl', isOr ? 'ବାର୍ଷିକ ପାରିବାରିକ ଆୟ' : 'Annual Household Income'));
      var incSel = el('select', 'cso-sef-select');
      incSel.setAttribute('aria-label', 'Annual Household Income Bracket');
      INCOME_BRACKETS.forEach(function (ib) {
        var o = el('option', '', isOr ? ib.or : ib.en);
        o.value = ib.key;
        if (state.incomeBracket === ib.key) o.selected = true;
        incSel.appendChild(o);
      });
      incSel.addEventListener('change', function () { state.incomeBracket = incSel.value; persistAndRender(); });
      incField.appendChild(incSel);

      var qField = el('label', 'cso-sef-field');
      qField.appendChild(el('span', 'cso-sef-field-lbl', isOr ? 'ତୁରନ୍ତ ଖୋଜନ୍ତୁ' : 'Instant Keyword Search'));
      var qInp = el('input', 'cso-sef-input');
      qInp.type = 'search';
      qInp.value = state.query;
      qInp.placeholder = isOr ? 'ସୁଭଦ୍ରା, ବୃତ୍ତି, ସୋଲାର, ପେନସନ୍…' : 'Subhadra, Solar, Scholarship, Pension…';
      qInp.addEventListener('input', function () { state.query = qInp.value; persistAndRender(); });
      qField.appendChild(qInp);

      var resetBtn = el('button', 'cso-sef-btn', isOr ? '↻ ଫିଲ୍ଟର୍ ରିସେଟ୍' : '↻ Reset Filters');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        state.category = 'all';
        state.profile = 'all';
        state.socialCategory = 'all';
        state.incomeBracket = 'any';
        state.query = '';
        persistAndRender();
      });

      controlsRow.append(socField, incField, qField, resetBtn);
      wrap.appendChild(controlsRow);

      // Summary Strip
      wrap.appendChild(el('div', 'cso-sef-summary', isOr
        ? ('ମୋଟ ' + matched.length + 'ଟି ଯୋଜନା ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ସହ ମେଳ ଖାଉଛି')
        : ('Showing ' + matched.length + ' matching Odisha & Central scheme' + (matched.length === 1 ? '' : 's'))));

      // Results Grid
      var grid = el('div', 'cso-sef-grid');
      if (!matched.length) {
        grid.appendChild(el('div', 'cso-sef-empty', isOr
          ? 'ଏହି ଫିଲ୍ଟର୍ ପାଇଁ କୌଣସି ଯୋଜନା ମିଳିଲା ନାହିଁ — ଆୟ ସୀମା କିମ୍ବା ବର୍ଗ ପରିବର୍ତ୍ତନ କରନ୍ତୁ।'
          : 'No schemes match this exact combination — try widening the Income Bracket or clicking Reset Filters.'));
      } else {
        matched.forEach(function (s) {
          var card = el('article', 'cso-sef-item');

          var topRow = el('div', 'cso-sef-item-top');
          var statusLbl = s.matchStatus === 'likely_eligible'
            ? (isOr ? '✅ ସମ୍ଭାବ୍ୟ ଯୋଗ୍ୟ' : '✅ Likely Eligible')
            : (isOr ? 'ℹ️ ନିର୍ଦ୍ଦିଷ୍ଟ ସର୍ତ୍ତାବଳୀ ଦେଖନ୍ତୁ' : 'ℹ️ Check Specific Criteria');
          topRow.appendChild(el('span', 'cso-sef-status' + (s.matchStatus === 'likely_eligible' ? ' is-eligible' : ''), statusLbl));
          topRow.appendChild(el('span', 'cso-sef-benefit', isOr ? s.benefit_or : s.benefit_en));
          card.appendChild(topRow);

          card.appendChild(el('h3', 'cso-sef-item-title', isOr ? s.name_or : s.name_en));
          card.appendChild(el('p', 'cso-sef-item-sum', isOr ? s.summary_or : s.summary_en));

          if (Array.isArray(s.eligibility_en) && s.eligibility_en.length) {
            var ul = el('ul', 'cso-sef-elig-list');
            s.eligibility_en.forEach(function (pt) {
              ul.appendChild(el('li', '', pt));
            });
            card.appendChild(ul);
          }

          if (Array.isArray(s.documents) && s.documents.length) {
            var docRow = el('div', 'cso-sef-docs');
            docRow.appendChild(el('span', 'cso-sef-docs-lbl', isOr ? 'ଆବଶ୍ୟକ କାଗଜପତ୍ର:' : 'Required Docs:'));
            s.documents.forEach(function (d) {
              docRow.appendChild(el('span', 'cso-sef-doc-chip', d));
            });
            card.appendChild(docRow);
          }

          var foot = el('div', 'cso-sef-item-foot');
          var saved = isSchemeSaved(s.slug);
          var saveBtn = el('button', 'cso-sef-btn' + (saved ? ' is-saved' : ''), saved
            ? (isOr ? '★ ସେଭ୍ ହୋଇଛି' : '★ Saved')
            : (isOr ? '☆ ଯୋଜନା ସେଭ୍ କରନ୍ତୁ' : '☆ Save Scheme'));
          saveBtn.type = 'button';
          saveBtn.addEventListener('click', function () { toggleSaveScheme(s); });

          var portalLink = el('a', 'cso-sef-cta', isOr ? 'ସରକାରୀ ପୋର୍ଟାଲ୍ ↗' : 'Official Portal ↗');
          portalLink.setAttribute('href', s.official_url || '/schemes/');
          if (/^https?:\/\//i.test(s.official_url || '')) {
            portalLink.setAttribute('target', '_blank');
            portalLink.setAttribute('rel', 'noopener noreferrer');
          }

          foot.append(saveBtn, portalLink);
          card.appendChild(foot);
          grid.appendChild(card);
        });
      }
      wrap.appendChild(grid);

      container.replaceChildren(wrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-schemes-eligibility-finder-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v410',
    PREFS_KEY: PREFS_KEY,
    CATEGORIES: CATEGORIES,
    PROFILES: PROFILES,
    SOCIAL_CATEGORIES: SOCIAL_CATEGORIES,
    INCOME_BRACKETS: INCOME_BRACKETS,
    FLAGSHIP_SCHEMES: FLAGSHIP_SCHEMES,
    filterSchemes: filterSchemes,
    mount: mount
  };
});
