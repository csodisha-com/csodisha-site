/**
 * Common Sense Odisha — Interactive e-District Odisha Certificate &
 * Revenue Service Walkthrough + Self-Declaration Generator (v427)
 * Mounted on /guides/ and /tools/ (#cso-edistrict-walkthrough-root).
 * Covers Resident, Income, Caste/SEBC, EWS, Legal Heir & Guardianship certificates on
 * edistrict.odisha.gov.in with ORTPS SLA days, RI/Tehsil workflow & bilingual Self-Declaration.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOEdistrictWalkthrough = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOEdistrictWalkthrough = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v427';
  var ROOT_ID = 'cso-edistrict-walkthrough-root';
  var PREFS_KEY = 'cso_edistrict_walkthrough_prefs_v1';
  var EDISTRICT_PORTAL = 'https://edistrict.odisha.gov.in/';

  var ODISHA_DISTRICTS = [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack',
    'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur',
    'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha',
    'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada',
    'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var CERT_SERVICES = [
    {
      key: 'resident',
      en: 'Resident (Domicile / Nativity) Certificate',
      or: 'ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର (Resident / Domicile)',
      statutoryFee: '₹0 (Free via e-District Citizen Login)',
      slaDays: 10,
      authority: 'Tahasildar / Additional Tahasildar (after local RI inquiry)',
      validity_en: 'Continuous residence >= 1 year in Tahasil jurisdiction (relaxed for transferred Odisha Govt employees & married women); valid for state recruitment & admissions.',
      validity_or: 'ତହସିଲ୍ ଅଞ୍ଚଳରେ >= ୧ ବର୍ଷ ବାସସ୍ଥାନ (ରାଜ୍ୟ ଚାକିରି ଓ ନାମଲେଖା ପାଇଁ ବୈଧ)।',
      enclosures: [
        { id: 'aadhaar', en: 'Aadhaar Card / EPIC Voter ID (Identity Proof)', or: 'ଆଧାର କାର୍ଡ / ଭୋଟର ପରିଚୟ ପତ୍ର' },
        { id: 'ror_bill', en: 'Copy of RoR (Patta) / Holding Tax / Electricity or Water Bill / Ration Card', or: 'RoR (ପଟ୍ଟା) / ବିଦ୍ୟୁତ୍ ବିଲ୍ / ରାସନ୍ କାର୍ଡ' },
        { id: 'self_decl', en: 'Signed Resident Self-Declaration Form', or: 'ସ୍ୱାକ୍ଷରିତ ବାସିନ୍ଦା ସ୍ୱ-ଘୋଷଣାପତ୍ର' }
      ]
    },
    {
      key: 'income',
      en: 'Income Certificate',
      or: 'ଆୟ ପ୍ରମାଣପତ୍ର (Income Certificate)',
      statutoryFee: '₹0 (Free online)',
      slaDays: 10,
      authority: 'Tahasildar / Additional Tahasildar (RI field/income inquiry)',
      validity_en: 'Covers annual income of all family members in a common mess (salary, agriculture, business, property); valid for the current Financial Year (up to March 31).',
      validity_or: 'ପରିବାରର ବାର୍ଷିକ ଆୟ (ଚାକିରି, କୃଷି, ବ୍ୟବସାୟ); ଚଳିତ ଆର୍ଥିକ ବର୍ଷ (ମାର୍ଚ୍ଚ ୩୧) ପର୍ଯ୍ୟନ୍ତ ବୈଧ।',
      enclosures: [
        { id: 'aadhaar', en: 'Aadhaar Card / EPIC Voter ID', or: 'ଆଧାର କାର୍ଡ / ଭୋଟର ID' },
        { id: 'ror', en: 'Copy of RoR (Patta) / Land Holding Record', or: 'RoR (ପଟ୍ଟା) ନକଲ' },
        { id: 'income_proof', en: 'Salary Certificate / Latest ITR / Proof of Agricultural Income', or: 'ଦରମା ପ୍ରମାଣପତ୍ର / ITR / କୃଷି ଆୟ ପ୍ରମାଣ' },
        { id: 'self_decl', en: 'Signed Income Self-Declaration Statement', or: 'ସ୍ୱାକ୍ଷରିତ ଆୟ ସ୍ୱ-ଘୋଷଣାପତ୍ର' }
      ]
    },
    {
      key: 'caste',
      en: 'Caste / Community Certificate (SC / ST / OBC / SEBC)',
      or: 'ଜାତି ପ୍ରମାଣପତ୍ର (SC / ST / OBC / SEBC)',
      statutoryFee: '₹0 (Free online)',
      slaDays: 15,
      authority: 'Tahasildar / Additional Tahasildar (RI verification of Presidential Order / Odisha SEBC list)',
      validity_en: 'Permanent for SC/ST; periodic renewal & Non-Creamy Layer (NCL) verification required for SEBC/OBC per recruitment notice.',
      validity_or: 'SC/ST ପାଇଁ ସ୍ଥାୟୀ; SEBC/OBC ପାଇଁ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ NCL ଯାଞ୍ଚ ଆବଶ୍ୟକ।',
      enclosures: [
        { id: 'aadhaar', en: 'Identity Proof (Aadhaar / EPIC Voter ID)', or: 'ଆଧାର / ଭୋଟର ପରିଚୟ ପତ୍ର' },
        { id: 'ror_caste', en: 'Copy of RoR / Land Passbook showing caste entry or Ancestor’s Caste Certificate', or: 'ଜାତି ଉଲ୍ଲେଖ ଥିବା RoR / ପୂର୍ବଜଙ୍କ ଜାତି ପ୍ରମାଣପତ୍ର' },
        { id: 'self_decl', en: 'Signed Caste Self-Declaration Form', or: 'ସ୍ୱାକ୍ଷରିତ ଜାତି ସ୍ୱ-ଘୋଷଣାପତ୍ର' }
      ]
    },
    {
      key: 'ews',
      en: 'Income & Asset Certificate (EWS — 10% Reservation)',
      or: 'ଆୟ ଓ ସମ୍ପତ୍ତି ପ୍ରମାଣପତ୍ର (EWS — ୧୦% ସଂରକ୍ଷଣ)',
      statutoryFee: '₹0 (Free online)',
      slaDays: 10,
      authority: 'Tahasildar / Additional Tahasildar (RI asset & family income verification)',
      validity_en: 'Applicant must NOT belong to SC/ST/SEBC (State List) and gross annual family income must be < ₹8,00,000 (with flat/plot & land ceiling checks); valid for 1 Financial Year.',
      validity_or: 'SC/ST/SEBC ନଥିବା ଓ ପରିବାରର ବାର୍ଷିକ ଆୟ < ₹୮,୦୦,୦୦୦; ୧ ଆର୍ଥିକ ବର୍ଷ ପାଇଁ ବୈଧ।',
      enclosures: [
        { id: 'aadhaar', en: 'Aadhaar Card / EPIC Voter ID', or: 'ଆଧାର କାର୍ଡ / ଭୋଟର ID' },
        { id: 'property', en: 'Copy of RoR / Residential Flat & Agricultural Land Property Records', or: 'RoR / ଘର ଓ କୃଷି ଜମି ସମ୍ପତ୍ତି କାଗଜପତ୍ର' },
        { id: 'income_proof', en: 'Salary Certificate / Latest ITR / Agricultural Income Proof', or: 'ଦରମା ପ୍ରମାଣପତ୍ର / ITR / କୃଷି ଆୟ ପ୍ରମାଣ' },
        { id: 'self_decl', en: 'Signed EWS Income & Asset Self-Declaration', or: 'ସ୍ୱାକ୍ଷରିତ EWS ସ୍ୱ-ଘୋଷଣାପତ୍ର' }
      ]
    },
    {
      key: 'legal-heir',
      en: 'Legal Heir Certificate',
      or: 'ଆଇନଗତ ଉତ୍ତରାଧିକାରୀ ପ୍ରମାଣପତ୍ର (Legal Heir)',
      statutoryFee: '₹0 (Free online)',
      slaDays: 30,
      authority: 'Tahasildar / Additional Tahasildar (RI local inquiry + 15-day public objection notice)',
      validity_en: 'Issued for pension/family pension, retirement/death gratuity, ex-gratia relief, PF/post-office/bank claim, and land mutation.',
      validity_or: 'ପେନସନ୍, ଗ୍ରାଚ୍ୟୁଇଟି, PF/ବ୍ୟାଙ୍କ ଦାବି ଓ ମ୍ୟୁଟେସନ୍ ପାଇଁ ଜାରି କରାଯାଏ।',
      enclosures: [
        { id: 'death_cert', en: 'Copy of Death Certificate of Deceased (Mandatory)', or: 'ମୃତ୍ୟୁ ପ୍ରମାଣପତ୍ର ନକଲ (ବାଧ୍ୟତାମୂଳକ)' },
        { id: 'aadhaar_heirs', en: 'Aadhaar / EPIC of Applicant & All Legal Heirs', or: 'ଆବେଦନକାରୀ ଓ ସମସ୍ତ ଉତ୍ତରାଧିକାରୀଙ୍କ ଆଧାର/ଭୋଟର ID' },
        { id: 'service_book', en: 'Copy of 1st Page of Service Book (if deceased was a Govt employee)', or: 'ସର୍ଭିସ୍ ବୁକ୍ ୧ମ ପୃଷ୍ଠା (ଯଦି ସରକାରୀ କର୍ମଚାରୀ)' },
        { id: 'family_decl', en: 'Signed Family Tree Self-Declaration', or: 'ସ୍ୱାକ୍ଷରିତ ବଂଶାବଳୀ ସ୍ୱ-ଘୋଷଣାପତ୍ର' }
      ]
    },
    {
      key: 'guardianship',
      en: 'Guardianship Certificate (Limited Purpose)',
      or: 'ଅଭିଭାବକତ୍ୱ ପ୍ରମାଣପତ୍ର (Guardianship Certificate)',
      statutoryFee: '₹0 (Free online)',
      slaDays: 30,
      authority: 'District Collector (via Sub-Collector / Tahasildar inquiry)',
      validity_en: 'Limited purpose: receipt of pension, family pension, retirement/death gratuity & Govt assistance on behalf of a minor or person incapable of managing own affairs.',
      validity_or: 'ନାବାଳକ କିମ୍ବା ଅସମର୍ଥ ବ୍ୟକ୍ତିଙ୍କ ପକ୍ଷରୁ ପେନସନ୍ ଓ ସରକାରୀ ସହାୟତା ଗ୍ରହଣ ପାଇଁ।',
      enclosures: [
        { id: 'birth_udid', en: 'Birth Certificate (if minor) or UDID / Disability Certificate (if applicable)', or: 'ଜନ୍ମ ପ୍ରମାଣପତ୍ର କିମ୍ବା UDID ଦିବ୍ୟାଙ୍ଗ ପ୍ରମାଣପତ୍ର' },
        { id: 'legal_heir', en: 'Legal Heir Certificate', or: 'ଆଇନଗତ ଉତ୍ତରାଧିକାରୀ ପ୍ରମାଣପତ୍ର' },
        { id: 'aadhaar', en: 'Aadhaar / EPIC of Proposed Guardian & Ward', or: 'ଅଭିଭାବକ ଓ ନାବାଳକଙ୍କ ଆଧାର/ଭୋଟର ID' },
        { id: 'pension_proof', en: 'Documentary Evidence of Pension / Gratuity / Govt Assistance Entitlement', or: 'ପେନସନ୍ / ଗ୍ରାଚ୍ୟୁଇଟି ହକ୍‌ଦାର ପ୍ରମାଣପତ୍ର' }
      ]
    }
  ];

  function getServiceByKey(key) {
    return CERT_SERVICES.find(function (s) { return s.key === key; }) || CERT_SERVICES[0];
  }

  function generateSelfDeclarationText(certKey, fields, lang) {
    var svc = getServiceByKey(certKey);
    var f = fields || {};
    var name = String(f.applicantName || '[Applicant Full Name]').trim();
    var guardian = String(f.guardianName || '[Father’s / Husband’s Name]').trim();
    var village = String(f.village || '[Village / Ward]').trim();
    var postPs = String(f.postPs || '[Post Office & Police Station]').trim();
    var tahasil = String(f.tahasil || '[Tahasil Name]').trim();
    var district = String(f.district || 'Khordha').trim();
    var purpose = String(f.purpose || 'Govt Job Recruitment / Higher-Ed Admission').trim();
    var income = String(f.annualIncome || '1,80,000').trim();
    var community = String(f.community || '[Caste / SEBC Community Name]').trim();
    var deceased = String(f.deceasedName || '[Deceased Name]').trim();
    var dod = String(f.dateOfDeath || '[DD-MM-YYYY]').trim();
    var isOr = lang === 'or';

    if (isOr) {
      var extraOr = '';
      if (svc.key === 'income' || svc.key === 'ews') {
        extraOr = 'ମୋ ପରିବାରର ସମସ୍ତ ସଦସ୍ୟଙ୍କ ବାର୍ଷିକ ମୋଟ ଆୟ ₹' + income + ' ଅଟେ' + (svc.key === 'ews' ? ' (₹୮,୦୦,୦୦୦ ରୁ କମ୍ ଏବଂ ମୁଁ SC/ST/SEBC ଅନ୍ତର୍ଭୁକ୍ତ ନୁହେଁ)।' : '।');
      } else if (svc.key === 'caste') {
        extraOr = 'ମୁଁ "' + community + '" ଜାତି/ସମ୍ପ୍ରଦାୟର ଅଟେ ଯାହା ଓଡ଼ିଶା ସରକାରଙ୍କ ତାଲିକାଭୁକ୍ତ।';
      } else if (svc.key === 'legal-heir') {
        extraOr = 'ସ୍ୱର୍ଗତ ' + deceased + ' (ମୃତ୍ୟୁ ତାରିଖ: ' + dod + ') ଙ୍କ ଆଇନଗତ ଉତ୍ତରାଧିକାରୀ ଭାବରେ ସମସ୍ତ ତଥ୍ୟ ସତ୍ୟ ଅଟେ।';
      } else {
        extraOr = 'ମୁଁ ଉପରୋକ୍ତ ଠିକଣାରେ ନିରନ୍ତର ୧ ବର୍ଷରୁ ଅଧିକ ସମୟ ଧରି ବସବାସ କରୁଅଛି।';
      }

      return [
        'ସ୍ୱ-ଘୋଷଣାପତ୍ର (SELF-DECLARATION — e-District Odisha)',
        'ସେବା: ' + svc.or,
        '',
        'ମୁଁ ଶ୍ରୀ/ଶ୍ରୀମତୀ ' + name + ', ପିତା/ସ୍ୱାମୀ: ' + guardian + ',',
        'ଗ୍ରାମ/ୱାର୍ଡ: ' + village + ', ପୋଷ୍ଟ/ଥାନା: ' + postPs + ',',
        'ତହସିଲ୍: ' + tahasil + ', ଜିଲ୍ଲା: ' + district + ', ଓଡ଼ିଶା,',
        'ଏତଦ୍ୱାରା ଘୋଷଣା କରୁଅଛି ଯେ —',
        extraOr,
        'ଉଦ୍ଦେଶ୍ୟ: ' + purpose + '।',
        '',
        'ଉପରୋକ୍ତ ସମସ୍ତ ତଥ୍ୟ ମୋର ଜ୍ଞାନ ଓ ବିଶ୍ୱାସ ଅନୁଯାୟୀ ସମ୍ପୂର୍ଣ୍ଣ ସତ୍ୟ ଅଟେ। କୌଣସି ତଥ୍ୟ ମିଥ୍ୟା ପ୍ରମାଣିତ ହେଲେ ମୁଁ ଆଇନଗତ କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ପାଇଁ ଦାୟୀ ରହିବି।',
        '',
        'ସ୍ଥାନ: ' + tahasil + '                     ଆବେଦନକାରୀଙ୍କ ସ୍ୱାକ୍ଷର: ______________________',
        'ତାରିଖ: ____/____/2026                ନାମ: ' + name
      ].join('\n');
    }

    var extraEn = '';
    if (svc.key === 'income') {
      extraEn = 'That the gross annual income of my family living in a common mess from all sources (salary, agriculture, business, and property) is ₹' + income + ' for the current Financial Year.';
    } else if (svc.key === 'ews') {
      extraEn = 'That I do not belong to SC, ST, or SEBC (Odisha State List), my gross annual family income is ₹' + income + ' (below ₹8,00,000), and my family satisfies the EWS asset/property ceilings.';
    } else if (svc.key === 'caste') {
      extraEn = 'That I belong to the "' + community + '" caste/community recognized under the Presidential Order / Government of Odisha notified list.';
    } else if (svc.key === 'legal-heir') {
      extraEn = 'That late ' + deceased + ' expired on ' + dod + ' and the list of surviving legal heirs furnished in the e-District application is complete and true.';
    } else if (svc.key === 'guardianship') {
      extraEn = 'That I am applying for a Limited-Purpose Guardianship Certificate solely to receive pension/gratuity/Govt assistance on behalf of the minor/dependent.';
    } else {
      extraEn = 'That I have been ordinarily residing continuously for more than one (1) year at the above address within ' + tahasil + ' Tahasil jurisdiction.';
    }

    return [
      'SELF-DECLARATION STATEMENT (e-District Odisha — edistrict.odisha.gov.in)',
      'Certificate Applied For: ' + svc.en,
      '',
      'I, ' + name + ', S/o / D/o / W/o ' + guardian + ',',
      'residing at Village/Ward: ' + village + ', PO/PS: ' + postPs + ',',
      'Tahasil: ' + tahasil + ', District: ' + district + ', Odisha,',
      'do hereby solemnly affirm and declare as follows:',
      '1. ' + extraEn,
      '2. This certificate is required for the purpose of: ' + purpose + '.',
      '3. The facts stated above and enclosures uploaded on e-District Odisha are true to the best of my knowledge and belief. I understand that any false information shall render the certificate liable to cancellation and legal action.',
      '',
      'Place: ' + tahasil + '                     Signature of Applicant: ______________________',
      'Date: ____/____/2026                 Full Name: ' + name
    ].join('\n');
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
            certKey: p.certKey || 'resident',
            checks: p.checks && typeof p.checks === 'object' ? p.checks : {},
            fields: p.fields && typeof p.fields === 'object' ? p.fields : {}
          };
        }
      }
    } catch (_) {}
    return {
      certKey: 'resident',
      checks: {},
      fields: {
        applicantName: '',
        guardianName: '',
        village: '',
        postPs: '',
        tahasil: '',
        district: 'Khordha',
        purpose: 'Odisha Govt Job Recruitment (OPSC / OSSC / OSSSC)',
        annualIncome: '1,80,000',
        community: '',
        deceasedName: '',
        dateOfDeath: ''
      }
    };
  }

  function savePrefs(prefs, storageOverride) {
    var st = resolveStorage(storageOverride);
    try { if (st) st.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) {}
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
      copyStatus: ''
    };

    var wrap = el('div', 'cso-edw-wrap');

    // Header
    var head = el('div', 'cso-edw-head');
    var titleBox = el('div', 'cso-edw-title-box');
    var heading = el('h2', 'cso-edw-title');
    var subtitle = el('p', 'cso-edw-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-edw-head-controls');
    var langGroup = el('div', 'cso-edw-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-edw-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-edw-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-edw-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Certificate Selector Pills
    var certPills = el('div', 'cso-edw-pills');
    certPills.setAttribute('role', 'group');

    // Active Service Detail + 4-Stage Workflow + Checklist
    var detailBox = el('section', 'cso-edw-detail');
    var helpdeskBar = el('div', 'cso-edw-helpdesk');

    // Section C: Self-Declaration Generator
    var declBox = el('section', 'cso-edw-decl');
    var declTitle = el('h3', 'cso-edw-sec-title');
    var declForm = el('div', 'cso-edw-form');

    function makeInput(id, tag, type) {
      var f = el('div', 'cso-edw-field');
      var lbl = el('label', 'cso-edw-label');
      lbl.setAttribute('for', id);
      var inp = el(tag, tag === 'select' ? 'cso-edw-select' : 'cso-edw-input');
      inp.id = id;
      if (type) inp.type = type;
      f.appendChild(lbl);
      f.appendChild(inp);
      return { wrap: f, label: lbl, input: inp };
    }

    var fName = makeInput('cso-edw-name', 'input', 'text');
    var fGuard = makeInput('cso-edw-guard', 'input', 'text');
    var fVil = makeInput('cso-edw-vil', 'input', 'text');
    var fPs = makeInput('cso-edw-ps', 'input', 'text');
    var fTah = makeInput('cso-edw-tah', 'input', 'text');
    var fDist = makeInput('cso-edw-dist', 'select');
    var fPurp = makeInput('cso-edw-purp', 'input', 'text');
    var fInc = makeInput('cso-edw-inc', 'input', 'text');
    var fComm = makeInput('cso-edw-comm', 'input', 'text');
    var fDec = makeInput('cso-edw-dec', 'input', 'text');
    var fDod = makeInput('cso-edw-dod', 'input', 'text');

    [fName, fGuard, fVil, fPs, fTah, fDist, fPurp, fInc, fComm, fDec, fDod].forEach(function (x) {
      declForm.appendChild(x.wrap);
    });

    var declPre = el('pre', 'cso-edw-preview');
    var declActions = el('div', 'cso-edw-actions');
    var copyDeclBtn = el('button', 'cso-edw-btn cso-edw-btn--primary');
    copyDeclBtn.type = 'button';
    var copyStatusEl = el('span', 'cso-edw-copy-status');
    declActions.appendChild(copyDeclBtn);
    declActions.appendChild(copyStatusEl);

    declBox.appendChild(declTitle);
    declBox.appendChild(declForm);
    declBox.appendChild(declPre);
    declBox.appendChild(declActions);

    wrap.appendChild(head);
    wrap.appendChild(certPills);
    wrap.appendChild(detailBox);
    wrap.appendChild(helpdeskBar);
    wrap.appendChild(declBox);
    root.replaceChildren(wrap);

    function renderDeclaration() {
      var k = state.prefs.certKey;
      fInc.wrap.hidden = !(k === 'income' || k === 'ews');
      fComm.wrap.hidden = k !== 'caste';
      fDec.wrap.hidden = k !== 'legal-heir';
      fDod.wrap.hidden = k !== 'legal-heir';
      declPre.textContent = generateSelfDeclarationText(k, state.prefs.fields, state.lang);
    }

    function renderDetail(orMode) {
      var svc = getServiceByKey(state.prefs.certKey);
      var certChecks = state.prefs.checks[svc.key] || {};
      var doneCount = 0;
      for (var i = 0; i < svc.enclosures.length; i += 1) {
        if (certChecks[svc.enclosures[i].id]) doneCount += 1;
      }

      var frag = doc.createDocumentFragment();
      var top = el('div', 'cso-edw-detail-top');
      top.appendChild(el('h3', 'cso-edw-sec-title', orMode ? svc.or : svc.en));
      var badges = el('div', 'cso-edw-badges');
      badges.appendChild(el('span', 'cso-edw-badge cso-edw-badge--free', svc.statutoryFee));
      badges.appendChild(el('span', 'cso-edw-badge cso-edw-badge--sla', 'ORTPS SLA: ' + svc.slaDays + ' Working Days'));
      top.appendChild(badges);
      frag.appendChild(top);

      frag.appendChild(el('p', 'cso-edw-meta', (orMode ? 'ଜାରି କର୍ତ୍ତୃପକ୍ଷ: ' : 'Issuing Authority: ') + svc.authority));
      frag.appendChild(el('p', 'cso-edw-meta', orMode ? svc.validity_or : svc.validity_en));

      // 4-Stage Workflow
      var stages = [
        { t: 'Stage 1 (Day 0)', d: 'Register/Login on edistrict.odisha.gov.in -> Fill Form & Upload PDF/JPG enclosures -> Save Application Reference Number.' },
        { t: 'Stage 2 (Days 1–4)', d: 'Revenue Inspector (RI) Field & Record Verification (checks RoR, Aadhaar, local residence/income/caste records).' },
        { t: 'Stage 3 (Days 5–' + svc.slaDays + ')', d: 'Tahasildar / Collector Scrutiny & Digital Signature (15-day public objection window for Legal Heir / Guardianship).' },
        { t: 'Stage 4 (Post-Approval)', d: 'Download digitally signed e-Certificate under Track Application Status + verify via Reference No. & Token No. or DigiLocker.' }
      ];
      var wfGrid = el('div', 'cso-edw-workflow');
      for (var w = 0; w < stages.length; w += 1) {
        var stCard = el('div', 'cso-edw-stage');
        stCard.appendChild(el('strong', 'cso-edw-stage__t', stages[w].t));
        stCard.appendChild(el('span', 'cso-edw-stage__d', stages[w].d));
        wfGrid.appendChild(stCard);
      }
      frag.appendChild(wfGrid);

      // Enclosure Checklist
      var ckHead = el('div', 'cso-edw-ck-head');
      ckHead.appendChild(el('strong', '', orMode ? '✅ ଆବଶ୍ୟକୀୟ କାଗଜପତ୍ର ଚେକଲିଷ୍ଟ' : '✅ Mandatory & Supporting Enclosures Checklist'));
      ckHead.appendChild(el('span', 'cso-edw-meter', doneCount + ' / ' + svc.enclosures.length + (orMode ? ' ପ୍ରସ୍ତୁତ' : ' Documents Ready')));
      frag.appendChild(ckHead);

      var ckGrid = el('div', 'cso-edw-ck-grid');
      for (var c = 0; c < svc.enclosures.length; c += 1) {
        (function (enc) {
          var checked = Boolean(certChecks[enc.id]);
          var lbl = el('label', 'cso-edw-ck-item' + (checked ? ' is-checked' : ''));
          var cb = el('input', 'cso-edw-cb');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.addEventListener('change', function () {
            if (!state.prefs.checks[svc.key]) state.prefs.checks[svc.key] = {};
            state.prefs.checks[svc.key][enc.id] = cb.checked;
            savePrefs(state.prefs);
            renderDetail(state.lang === 'or');
          });
          lbl.appendChild(cb);
          lbl.appendChild(el('span', '', orMode ? enc.or : enc.en));
          ckGrid.appendChild(lbl);
        })(svc.enclosures[c]);
      }
      frag.appendChild(ckGrid);
      detailBox.replaceChildren(frag);
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-edw-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-edw-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '🏛️ e-District ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ଓ ରାଜସ୍ୱ ସେବା ଗାଇଡ୍ + ସ୍ୱ-ଘୋଷଣାପତ୍ର ଜେନେରେଟର୍'
        : '🏛️ e-District Odisha Certificate & Revenue Service Walkthrough';
      subtitle.textContent = orMode
        ? 'edistrict.odisha.gov.in ରେ ବାସିନ୍ଦା, ଆୟ, ଜାତି/SEBC, EWS, ଆଇନଗତ ଉତ୍ତରାଧିକାରୀ ଓ ଅଭିଭାବକତ୍ୱ ପ୍ରମାଣପତ୍ର ପାଇଁ ORTPS ସମୟସୀମା, RI/ତହସିଲ୍ ଯାଞ୍ଚ ଓ ସ୍ୱ-ଘୋଷଣାପତ୍ର।'
        : 'Guided checklist, ₹0 statutory fee & ORTPS SLA tracker, RI/Tehsil verification workflow, and ready-to-copy Self-Declaration generator for edistrict.odisha.gov.in.';
      printBtn.textContent = orMode ? '🖨️ ସ୍ୱ-ଘୋଷଣାପତ୍ର ଓ ଚେକଲିଷ୍ଟ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Self-Declaration & Checklist';

      // Pills
      var pFrag = doc.createDocumentFragment();
      for (var i = 0; i < CERT_SERVICES.length; i += 1) {
        (function (s) {
          var active = state.prefs.certKey === s.key;
          var b = el('button', 'cso-edw-pill' + (active ? ' is-active' : ''), (orMode ? s.or : s.en) + ' (' + s.slaDays + 'd)');
          b.type = 'button';
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
          b.addEventListener('click', function () {
            state.prefs.certKey = s.key;
            savePrefs(state.prefs);
            render();
          });
          pFrag.appendChild(b);
        })(CERT_SERVICES[i]);
      }
      certPills.replaceChildren(pFrag);

      // Helpdesk bar
      var hFrag = doc.createDocumentFragment();
      var aPortal = el('a', 'cso-edw-btn cso-edw-btn--primary', orMode ? '🏛️ e-District ଓଡ଼ିଶା ପୋର୍ଟାଲ୍ ↗' : '🏛️ Open e-District Odisha ↗');
      aPortal.href = EDISTRICT_PORTAL;
      aPortal.target = '_blank';
      aPortal.rel = 'noopener noreferrer';
      hFrag.appendChild(aPortal);
      hFrag.appendChild(el('span', 'cso-edw-help-txt', '☎️ Toll-Free: 1800-121-8242 · Sanjog Helpline: 155335 · ✉️ ecertificate.rdm@odisha.gov.in'));
      helpdeskBar.replaceChildren(hFrag);

      // Form Labels
      declTitle.textContent = orMode ? '📝 e-District ସ୍ୱ-ଘୋଷଣାପତ୍ର (Self-Declaration) ଜେନେରେଟର୍' : '📝 Ready-to-Copy e-District Self-Declaration Generator';
      fName.label.textContent = orMode ? 'ଆବେଦନକାରୀଙ୍କ ସମ୍ପୂର୍ଣ୍ଣ ନାମ' : 'Applicant Full Name';
      fGuard.label.textContent = orMode ? 'ପିତା / ସ୍ୱାମୀଙ୍କ ନାମ' : 'Father’s / Husband’s Name';
      fVil.label.textContent = orMode ? 'ଗ୍ରାମ / ୱାର୍ଡ' : 'Village / Ward';
      fPs.label.textContent = orMode ? 'ପୋଷ୍ଟ ଅଫିସ୍ ଓ ଥାନା' : 'Post Office & Police Station';
      fTah.label.textContent = orMode ? 'ତହସିଲ୍' : 'Tahasil';
      fDist.label.textContent = orMode ? 'ଜିଲ୍ଲା (୩୦ ଓଡ଼ିଶା ଜିଲ୍ଲା)' : 'District (30 Odisha Districts)';
      fPurp.label.textContent = orMode ? 'ଉଦ୍ଦେଶ୍ୟ' : 'Purpose';
      fInc.label.textContent = orMode ? 'ବାର୍ଷିକ ପାରିବାରିକ ଆୟ (₹)' : 'Annual Family Income (₹)';
      fComm.label.textContent = orMode ? 'ଜାତି / ସମ୍ପ୍ରଦାୟର ନାମ' : 'Community / Caste Name';
      fDec.label.textContent = orMode ? 'ମୃତ ବ୍ୟକ୍ତିଙ୍କ ନାମ' : 'Deceased Person’s Name';
      fDod.label.textContent = orMode ? 'ମୃତ୍ୟୁ ତାରିଖ' : 'Date of Death';

      var df = doc.createDocumentFragment();
      for (var d = 0; d < ODISHA_DISTRICTS.length; d += 1) {
        var opt = el('option', '', ODISHA_DISTRICTS[d]);
        opt.value = ODISHA_DISTRICTS[d];
        if (ODISHA_DISTRICTS[d] === (state.prefs.fields.district || 'Khordha')) opt.selected = true;
        df.appendChild(opt);
      }
      fDist.input.replaceChildren(df);
      fDist.input.value = state.prefs.fields.district || 'Khordha';

      fName.input.value = state.prefs.fields.applicantName || '';
      fGuard.input.value = state.prefs.fields.guardianName || '';
      fVil.input.value = state.prefs.fields.village || '';
      fPs.input.value = state.prefs.fields.postPs || '';
      fTah.input.value = state.prefs.fields.tahasil || '';
      fPurp.input.value = state.prefs.fields.purpose || '';
      fInc.input.value = state.prefs.fields.annualIncome || '1,80,000';
      fComm.input.value = state.prefs.fields.community || '';
      fDec.input.value = state.prefs.fields.deceasedName || '';
      fDod.input.value = state.prefs.fields.dateOfDeath || '';

      copyDeclBtn.textContent = orMode ? '📋 ସ୍ୱ-ଘୋଷଣାପତ୍ର କପି କରନ୍ତୁ' : '📋 Copy Self-Declaration';
      copyStatusEl.textContent = state.copyStatus;

      renderDetail(orMode);
      renderDeclaration();
    }

    function syncFields() {
      state.prefs.fields = {
        applicantName: fName.input.value,
        guardianName: fGuard.input.value,
        village: fVil.input.value,
        postPs: fPs.input.value,
        tahasil: fTah.input.value,
        district: fDist.input.value,
        purpose: fPurp.input.value,
        annualIncome: fInc.input.value,
        community: fComm.input.value,
        deceasedName: fDec.input.value,
        dateOfDeath: fDod.input.value
      };
      savePrefs(state.prefs);
      renderDeclaration();
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });
    [fName, fGuard, fVil, fPs, fTah, fDist, fPurp, fInc, fComm, fDec, fDod].forEach(function (x) {
      x.input.addEventListener(x.input.tagName === 'SELECT' ? 'change' : 'input', syncFields);
    });

    copyDeclBtn.addEventListener('click', function () {
      var txt = generateSelfDeclarationText(state.prefs.certKey, state.prefs.fields, state.lang);
      if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        win.navigator.clipboard.writeText(txt).then(function () {
          state.copyStatus = '✅ Copied Self-Declaration!';
          copyStatusEl.textContent = state.copyStatus;
        }).catch(function () {});
      }
    });

    render();
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
    ODISHA_DISTRICTS: ODISHA_DISTRICTS,
    CERT_SERVICES: CERT_SERVICES,
    getServiceByKey: getServiceByKey,
    generateSelfDeclarationText: generateSelfDeclarationText,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    mount: mount
  };
});
