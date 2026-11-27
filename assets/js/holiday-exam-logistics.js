/**
 * Common Sense Odisha — Interactive Odisha Govt Holiday, Treasury &
 * Exam-Day Logistics Calendar (v422)
 * Mounted on /guides/ and /exams/ (#cso-holiday-exam-logistics-root).
 * Searchable 2026–27 Odisha State Govt Gazetted/Optional Holiday & RBI Bank/Treasury Calendar
 * + Backward Exam-Day Center Travel & Gate Closure Timer + 8-Item Reporting Checklist.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOHolidayExamLogistics = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOHolidayExamLogistics = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v422';
  var ROOT_ID = 'cso-holiday-exam-logistics-root';
  var PREFS_KEY = 'cso_holiday_logistics_prefs_v1';
  var CHECKLIST_KEY = 'cso_exam_day_checklist_v1';

  var HOLIDAY_TYPES = [
    { key: 'all', en: 'All Holidays', or: 'ସମସ୍ତ ଛୁଟି' },
    { key: 'gazetted', en: 'Gazetted Govt Holidays', or: 'ସରକାରୀ ଗେଜେଟେଡ୍ ଛୁଟି' },
    { key: 'optional', en: 'Optional / Restricted Holidays', or: 'ଐଚ୍ଛିକ / ସୀମିତ ଛୁଟି' },
    { key: 'bank', en: 'Bank & Treasury Closures (NI Act)', or: 'ବ୍ୟାଙ୍କ ଓ ଟ୍ରେଜେରୀ ଛୁଟି (NI Act)' }
  ];

  var PERIODS = [
    { key: 'all', en: 'All 2026–27', or: 'ସମସ୍ତ ୨୦୨୬–୨୭' },
    { key: 'nov-dec-2026', en: 'Nov–Dec 2026', or: 'ନଭେମ୍ବର–ଡିସେମ୍ବର ୨୦୨୬' },
    { key: 'jan-mar-2027', en: 'Jan–Mar 2027', or: 'ଜାନୁଆରୀ–ମାର୍ଚ୍ଚ ୨୦୨୭' },
    { key: 'apr-jun-2027', en: 'Apr–Jun 2027', or: 'ଏପ୍ରିଲ୍–ଜୁନ୍ ୨୦୨୭' },
    { key: 'jul-nov-2027', en: 'Jul–Nov 2027', or: 'ଜୁଲାଇ–ନଭେମ୍ବର ୨୦୨୭' }
  ];

  var HOLIDAYS = [
    {
      id: 'xmas-2026',
      date: '2026-12-25',
      displayDate: '25 Dec 2026 (Fri)',
      period: 'nov-dec-2026',
      en: 'Christmas Day',
      or: 'ବଡ଼ଦିନ (Christmas Day)',
      types: ['gazetted', 'bank'],
      note: 'Odisha Govt Offices, Schools & RBI Banks/Treasuries Closed'
    },
    {
      id: 'newyear-2027',
      date: '2027-01-01',
      displayDate: '01 Jan 2027 (Fri)',
      period: 'jan-mar-2027',
      en: 'New Year’s Day',
      or: 'ନବବର୍ଷ ଦିବସ (New Year)',
      types: ['optional'],
      note: 'Optional / Restricted Govt Holiday · Check Local Treasury Desk Notice'
    },
    {
      id: 'makar-2027',
      date: '2027-01-14',
      displayDate: '14 Jan 2027 (Thu)',
      period: 'jan-mar-2027',
      en: 'Makar Sankranti',
      or: 'ମକର ସଂକ୍ରାନ୍ତି',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & Bank/Treasury Closure (NI Act)'
    },
    {
      id: 'netaji-vss-2027',
      date: '2027-01-23',
      displayDate: '23 Jan 2027 (Sat)',
      period: 'jan-mar-2027',
      en: 'Netaji Subhas Chandra Bose Jayanti / Vir Surendra Sai Jayanti',
      or: 'ନେତାଜୀ ସୁଭାଷ ଚନ୍ଦ୍ର ବୋଷ / ବୀର ସୁରେନ୍ଦ୍ର ସାଏ ଜୟନ୍ତୀ',
      types: ['gazetted', 'bank'],
      note: 'Odisha State Gazetted Holiday (Also 4th Saturday Bank Closure)'
    },
    {
      id: 'republic-2027',
      date: '2027-01-26',
      displayDate: '26 Jan 2027 (Tue)',
      period: 'jan-mar-2027',
      en: 'Republic Day',
      or: 'ସାଧାରଣତନ୍ତ୍ର ଦିବସ (Republic Day)',
      types: ['gazetted', 'bank'],
      note: 'National & State Gazetted Holiday · All Offices & Banks Closed'
    },
    {
      id: 'vasant-2027',
      date: '2027-02-11',
      displayDate: '11 Feb 2027 (Thu)',
      period: 'jan-mar-2027',
      en: 'Vasant Panchami / Saraswati Puja',
      or: 'ବସନ୍ତ ପଞ୍ଚମୀ / ସରସ୍ୱତୀ ପୂଜା',
      types: ['gazetted'],
      note: 'Odisha State Gazetted Holiday (Banks Usually Open)'
    },
    {
      id: 'shivaratri-2027',
      date: '2027-03-06',
      displayDate: '06 Mar 2027 (Sat)',
      period: 'jan-mar-2027',
      en: 'Maha Shivaratri',
      or: 'ମହା ଶିବରାତ୍ରି',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & NI Act Bank/Treasury Closure'
    },
    {
      id: 'dola-2027',
      date: '2027-03-22',
      displayDate: '22 Mar 2027 (Mon)',
      period: 'jan-mar-2027',
      en: 'Dola Purnima',
      or: 'ଦୋଳ ପୂର୍ଣ୍ଣିମା',
      types: ['gazetted'],
      note: 'Odisha State Gazetted Holiday'
    },
    {
      id: 'holi-2027',
      date: '2027-03-23',
      displayDate: '23 Mar 2027 (Tue)',
      period: 'jan-mar-2027',
      en: 'Holi',
      or: 'ହୋଲି (ରଙ୍ଗ ପର୍ବ)',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & NI Act Bank/Treasury Closure'
    },
    {
      id: 'utkal-divas-2027',
      date: '2027-04-01',
      displayDate: '01 Apr 2027 (Thu)',
      period: 'apr-jun-2027',
      en: 'Utkal Divas (Odisha Foundation Day)',
      or: 'ଉତ୍କଳ ଦିବସ (ଓଡ଼ିଶା ପ୍ରତିଷ୍ଠା ଦିବସ)',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday + Annual Bank Accounts Closing Day'
    },
    {
      id: 'pana-ambedkar-2027',
      date: '2027-04-14',
      displayDate: '14 Apr 2027 (Wed)',
      period: 'apr-jun-2027',
      en: 'Maha Vishuba Sankranti (Pana Sankranti) & Dr. B.R. Ambedkar Jayanti',
      or: 'ମହା ବିଷୁବ ସଂକ୍ରାନ୍ତି (ପଣା ସଂକ୍ରାନ୍ତି) ଓ ଆମ୍ବେଦକର ଜୟନ୍ତୀ',
      types: ['gazetted', 'bank'],
      note: 'Odia New Year · State Gazetted & Bank/Treasury Closure'
    },
    {
      id: 'raja-2027',
      date: '2027-06-14',
      displayDate: '14–15 Jun 2027 (Mon–Tue)',
      period: 'apr-jun-2027',
      en: 'Raja Sankranti (Pahili Raja & Raja)',
      or: 'ରଜ ସଂକ୍ରାନ୍ତି (ପହିଲି ରଜ ଓ ରଜ)',
      types: ['gazetted'],
      note: 'Odisha State Gazetted Holiday (2 Days)'
    },
    {
      id: 'rath-yatra-2027',
      date: '2027-07-05',
      displayDate: '05 Jul 2027 (Mon)',
      period: 'jul-nov-2027',
      en: 'Rath Yatra (Car Festival)',
      or: 'ରଥଯାତ୍ରା (ଶ୍ରୀଗୁଣ୍ଡିଚା)',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & NI Act Bank/Treasury Closure'
    },
    {
      id: 'independence-2027',
      date: '2027-08-15',
      displayDate: '15 Aug 2027 (Sun)',
      period: 'jul-nov-2027',
      en: 'Independence Day',
      or: 'ସ୍ୱାଧୀନତା ଦିବସ',
      types: ['gazetted', 'bank'],
      note: 'National & State Gazetted Holiday'
    },
    {
      id: 'nuakhai-2027',
      date: '2027-09-05',
      displayDate: '05 Sep 2027 (Sun)',
      period: 'jul-nov-2027',
      en: 'Nuakhai (Western Odisha Agrarian Festival)',
      or: 'ନୂଆଖାଇ',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & Bank/Treasury Closure'
    },
    {
      id: 'gandhi-2027',
      date: '2027-10-02',
      displayDate: '02 Oct 2027 (Sat)',
      period: 'jul-nov-2027',
      en: 'Mahatma Gandhi Jayanti',
      or: 'ଗାନ୍ଧୀ ଜୟନ୍ତୀ',
      types: ['gazetted', 'bank'],
      note: 'National & State Gazetted Holiday · All Offices & Banks Closed'
    },
    {
      id: 'durga-puja-2027',
      date: '2027-10-07',
      displayDate: '07–10 Oct 2027 (Thu–Sun)',
      period: 'jul-nov-2027',
      en: 'Durga Puja (Maha Ashtami / Maha Navami / Vijaya Dashami)',
      or: 'ଦୁର୍ଗା ପୂଜା (ମହାଷ୍ଟମୀ / ମହାନବମୀ / ବିଜୟାଦଶମୀ)',
      types: ['gazetted', 'bank'],
      note: 'Major State Gazetted & Bank/Treasury Holiday Window'
    },
    {
      id: 'diwali-2027',
      date: '2027-10-28',
      displayDate: '28 Oct 2027 (Thu)',
      period: 'jul-nov-2027',
      en: 'Diwali / Kali Puja',
      or: 'ଦୀପାବଳି / କାଳୀ ପୂଜା',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & NI Act Bank/Treasury Closure'
    },
    {
      id: 'kartika-2027',
      date: '2027-11-13',
      displayDate: '13 Nov 2027 (Sat)',
      period: 'jul-nov-2027',
      en: 'Rahas Purnima / Kartika Purnima (Boita Bandana)',
      or: 'ରାସ ପୂର୍ଣ୍ଣିମା / କାର୍ତ୍ତିକ ପୂର୍ଣ୍ଣିମା (ବୋଇତ ବନ୍ଦାଣ)',
      types: ['gazetted', 'bank'],
      note: 'State Gazetted Holiday & NI Act Bank/Treasury Closure (2nd Saturday)'
    }
  ];

  var EXAM_CHECKLIST_ITEMS = [
    { id: 'admit_card', en: 'Printed Admit Card / Admission Letter (2 clear copies)', or: 'ପ୍ରିଣ୍ଟେଡ୍ ଆଡମିଟ୍ କାର୍ଡ (୨ କପି)' },
    { id: 'photo_id', en: 'Original Valid Photo ID Proof (Aadhaar / Voter ID / PAN / Passport / DL — exact Name & DOB match)', or: 'ମୂଳ ଫଟୋ ପରିଚୟ ପତ୍ର (ଆଧାର / ଭୋଟର ID / PAN / DL)' },
    { id: 'photos', en: '2 Recent Passport-Size Color Photographs (matching uploaded form photo)', or: '୨ଟି ସାମ୍ପ୍ରତିକ ପାସପୋର୍ଟ ରଙ୍ଗୀନ ଫଟୋ' },
    {
      id: 'stationery',
      omr_en: '2 Black/Blue Ballpoint Pens (OMR Mode — no gel/pencil)',
      omr_or: '୨ଟି କଳା/ନୀଳ ବଲ୍‌ପଏଣ୍ଟ କଲମ (OMR ମୋଡ୍)',
      cbt_en: 'Center-Provided Pen & Rough Sheet (CBT Mode — follow lab rules)',
      cbt_or: 'କେନ୍ଦ୍ର ପ୍ରଦତ୍ତ କଲମ ଓ ରଫ୍ ସିଟ୍ (CBT ମୋଡ୍)'
    },
    { id: 'water_bottle', en: 'Transparent Clear Water Bottle (label removed)', or: 'ସ୍ୱଚ୍ଛ ପାଣି ବୋତଲ (ଲେବଲ୍ ହଟାଯାଇଥିବା)' },
    { id: 'no_electronics', en: 'Zero Electronic & Metal Items Check (no smartwatch, earbuds, calculator, phone, jewelry)', or: 'ଇଲେକ୍ଟ୍ରୋନିକ୍ ଓ ଧାତୁ ସାମଗ୍ରୀ ଯାଞ୍ଚ (ସ୍ମାର୍ଟୱାଚ୍/ଫୋନ୍ ନିଷେଧ)' },
    { id: 'route_buffer', en: 'Center Landmark, District Route & Traffic Buffer Verified', or: 'ପରୀକ୍ଷା କେନ୍ଦ୍ର ଠିକଣା, ରାସ୍ତା ଓ ଟ୍ରାଫିକ୍ ସମୟ ଯାଞ୍ଚ' },
    { id: 'pwbd_decl', en: 'PwBD Certificate / Scribe Undertaking / Self-Declaration Form (if applicable)', or: 'PwBD ପ୍ରମାଣପତ୍ର / ସ୍କ୍ରାଇବ୍ / ସେଲ୍ଫ-ଡିକ୍ଲାରେସନ୍ (ଯଦି ପ୍ରଯୁଜ୍ୟ)' }
  ];

  function norm(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function resolveStorage(override) {
    if (override) return override;
    try { return (win && win.localStorage) ? win.localStorage : null; } catch (_) { return null; }
  }

  function filterHolidays(options) {
    var opts = options || {};
    var type = norm(opts.type || 'all');
    var period = norm(opts.period || 'all');
    var q = norm(opts.query || '');

    return HOLIDAYS.filter(function (h) {
      if (type && type !== 'all' && h.types.indexOf(type) === -1) return false;
      if (period && period !== 'all' && h.period !== period) return false;
      if (q) {
        var hay = norm([h.en, h.or, h.displayDate, h.date, h.note, h.types.join(' ')].join(' '));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function parseHhmmToMinutes(hhmm) {
    var m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 9 * 60 + 30;
    var hh = Math.max(0, Math.min(23, Number(m[1])));
    var mm = Math.max(0, Math.min(59, Number(m[2])));
    return hh * 60 + mm;
  }

  function formatMinutes12h(totalMins) {
    var wrapped = ((totalMins % 1440) + 1440) % 1440;
    var h24 = Math.floor(wrapped / 60);
    var m = wrapped % 60;
    var ampm = h24 >= 12 ? 'PM' : 'AM';
    var h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return (h12 < 10 ? '0' : '') + h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function computeExamDayTimeline(startHhmm, travelMins, mode) {
    var examStart = parseHhmmToMinutes(startHhmm);
    var travel = Math.max(10, Math.min(240, Number(travelMins) || 45));
    var cleanMode = mode === 'cbt' ? 'cbt' : 'omr';
    var gateClose = examStart - 30;
    var biometric = examStart - 60;
    var arrival = examStart - 90;
    var departure = arrival - travel;

    return {
      mode: cleanMode,
      travelMins: travel,
      examStart: formatMinutes12h(examStart),
      departure: formatMinutes12h(departure),
      arrival: formatMinutes12h(arrival),
      biometric: formatMinutes12h(biometric),
      gateClosure: formatMinutes12h(gateClose),
      milestones: [
        { key: 'departure', time: formatMinutes12h(departure), en: 'Recommended Home Departure', or: 'ଘରୁ ବାହାରିବା ସମୟ', note: 'Includes ' + travel + ' min travel + 90 min pre-exam buffer' },
        { key: 'arrival', time: formatMinutes12h(arrival), en: 'Center Arrival & Seating Board Check', or: 'କେନ୍ଦ୍ରରେ ପହଞ୍ଚିବା ଓ ସିଟ୍ ଯାଞ୍ଚ', note: '90 mins before exam start' },
        { key: 'biometric', time: formatMinutes12h(biometric), en: 'Biometric, Frisking & Invigilator Verification', or: 'ବାୟୋମେଟ୍ରିକ୍ ଓ ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା', note: '60 mins before exam start' },
        { key: 'gate', time: formatMinutes12h(gateClose), en: 'Strict Gate Closure Cutoff', or: 'ଗେଟ୍ ବନ୍ଦ ହେବାର ଶେଷ ସମୟ', note: '30 mins before exam — zero entry after cutoff' }
      ]
    };
  }

  function loadPrefs(storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      var raw = st && st.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          return {
            type: p.type || 'all',
            period: p.period || 'all',
            query: p.query || '',
            shift: p.shift || 'morning',
            customTime: p.customTime || '09:30',
            travelMins: Number(p.travelMins) || 45,
            mode: p.mode === 'cbt' ? 'cbt' : 'omr'
          };
        }
      }
    } catch (_) {}
    return { type: 'all', period: 'all', query: '', shift: 'morning', customTime: '09:30', travelMins: 45, mode: 'omr' };
  }

  function savePrefs(prefs, storageOverride) {
    var st = resolveStorage(storageOverride);
    try { if (st) st.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) {}
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
    try { if (st) st.setItem(CHECKLIST_KEY, JSON.stringify(map || {})); } catch (_) {}
  }

  function getChecklistProgress(map) {
    var m = map && typeof map === 'object' ? map : {};
    var done = 0;
    for (var i = 0; i < EXAM_CHECKLIST_ITEMS.length; i += 1) {
      if (m[EXAM_CHECKLIST_ITEMS[i].id]) done += 1;
    }
    return { completed: done, total: EXAM_CHECKLIST_ITEMS.length, pct: Math.round((done / EXAM_CHECKLIST_ITEMS.length) * 100) };
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
      copyStatus: ''
    };

    var wrap = el('div', 'cso-hel-wrap');

    // Header
    var head = el('div', 'cso-hel-head');
    var titleBox = el('div', 'cso-hel-title-box');
    var heading = el('h2', 'cso-hel-title');
    var subtitle = el('p', 'cso-hel-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-hel-head-controls');
    var langGroup = el('div', 'cso-hel-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-hel-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-hel-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-hel-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });

    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Section A: Holiday Calendar
    var secA = el('section', 'cso-hel-section');
    var secATitle = el('h3', 'cso-hel-sec-title');
    var bankHelper = el('div', 'cso-hel-helper');
    var typePills = el('div', 'cso-hel-pills');
    typePills.setAttribute('role', 'group');

    var holFilters = el('div', 'cso-hel-filters');
    var perWrap = el('div', 'cso-hel-field');
    var perLabel = el('label', 'cso-hel-label');
    perLabel.setAttribute('for', 'cso-hel-period');
    var perSelect = el('select', 'cso-hel-select');
    perSelect.id = 'cso-hel-period';
    perWrap.appendChild(perLabel);
    perWrap.appendChild(perSelect);

    var qWrap = el('div', 'cso-hel-field');
    var qLabel = el('label', 'cso-hel-label');
    qLabel.setAttribute('for', 'cso-hel-search');
    var qInput = el('input', 'cso-hel-input');
    qInput.type = 'search';
    qInput.id = 'cso-hel-search';
    qInput.value = state.prefs.query;
    qWrap.appendChild(qLabel);
    qWrap.appendChild(qInput);

    holFilters.appendChild(perWrap);
    holFilters.appendChild(qWrap);

    var holGrid = el('div', 'cso-hel-hol-grid');
    secA.appendChild(secATitle);
    secA.appendChild(bankHelper);
    secA.appendChild(typePills);
    secA.appendChild(holFilters);
    secA.appendChild(holGrid);

    // Section B: Exam-Day Logistics & Checklist
    var secB = el('section', 'cso-hel-section');
    var secBTitle = el('h3', 'cso-hel-sec-title');

    var logControls = el('div', 'cso-hel-filters');
    var shiftWrap = el('div', 'cso-hel-field');
    var shiftLabel = el('label', 'cso-hel-label');
    shiftLabel.setAttribute('for', 'cso-hel-shift');
    var shiftSelect = el('select', 'cso-hel-select');
    shiftSelect.id = 'cso-hel-shift';
    shiftWrap.appendChild(shiftLabel);
    shiftWrap.appendChild(shiftSelect);

    var customWrap = el('div', 'cso-hel-field');
    var customLabel = el('label', 'cso-hel-label');
    customLabel.setAttribute('for', 'cso-hel-custom-time');
    var customInput = el('input', 'cso-hel-input');
    customInput.type = 'time';
    customInput.id = 'cso-hel-custom-time';
    customInput.value = state.prefs.customTime;
    customWrap.appendChild(customLabel);
    customWrap.appendChild(customInput);

    var travWrap = el('div', 'cso-hel-field');
    var travLabel = el('label', 'cso-hel-label');
    travLabel.setAttribute('for', 'cso-hel-travel');
    var travSelect = el('select', 'cso-hel-select');
    travSelect.id = 'cso-hel-travel';
    travWrap.appendChild(travLabel);
    travWrap.appendChild(travSelect);

    var modeWrap = el('div', 'cso-hel-field');
    var modeLabel = el('span', 'cso-hel-label');
    var modeBtns = el('div', 'cso-hel-mode-row');
    var omrBtn = el('button', 'cso-hel-pill');
    omrBtn.type = 'button';
    var cbtBtn = el('button', 'cso-hel-pill');
    cbtBtn.type = 'button';
    modeBtns.appendChild(omrBtn);
    modeBtns.appendChild(cbtBtn);
    modeWrap.appendChild(modeLabel);
    modeWrap.appendChild(modeBtns);

    logControls.appendChild(shiftWrap);
    logControls.appendChild(customWrap);
    logControls.appendChild(travWrap);
    logControls.appendChild(modeWrap);

    var timelineGrid = el('div', 'cso-hel-timeline');
    var checklistBox = el('div', 'cso-hel-checklist');
    var rulesGrid = el('div', 'cso-hel-rules');
    var logActions = el('div', 'cso-hel-actions');
    var copyPlanBtn = el('button', 'cso-hel-btn cso-hel-btn--primary');
    copyPlanBtn.type = 'button';
    var copyStatusEl = el('span', 'cso-hel-copy-status');
    copyStatusEl.setAttribute('role', 'status');
    copyStatusEl.setAttribute('aria-live', 'polite');
    logActions.appendChild(copyPlanBtn);
    logActions.appendChild(copyStatusEl);

    secB.appendChild(secBTitle);
    secB.appendChild(logControls);
    secB.appendChild(timelineGrid);
    secB.appendChild(checklistBox);
    secB.appendChild(rulesGrid);
    secB.appendChild(logActions);

    wrap.appendChild(head);
    wrap.appendChild(secA);
    wrap.appendChild(secB);
    root.replaceChildren(wrap);

    function activeStartTime() {
      if (state.prefs.shift === 'morning') return '09:30';
      if (state.prefs.shift === 'afternoon') return '14:30';
      return state.prefs.customTime || '09:30';
    }

    function renderHolidays(orMode) {
      var list = filterHolidays(state.prefs);
      if (!list.length) {
        holGrid.replaceChildren(el('div', 'cso-hel-empty',
          orMode ? 'କୌଣସି ଛୁଟି ମିଳିଲା ନାହିଁ।' : 'No matching Odisha holiday found.'));
        return;
      }
      var calApi = win && win.CSOCalendarExport;
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < list.length; i += 1) {
        (function (h) {
          var card = el('article', 'cso-hel-hol-card');
          var top = el('div', 'cso-hel-hol-top');
          top.appendChild(el('span', 'cso-hel-date-pill', h.displayDate));
          var tags = el('div', 'cso-hel-badges');
          if (h.types.indexOf('gazetted') !== -1) tags.appendChild(el('span', 'cso-hel-badge cso-hel-badge--gaz', orMode ? 'ଗେଜେଟେଡ୍' : 'Gazetted'));
          if (h.types.indexOf('optional') !== -1) tags.appendChild(el('span', 'cso-hel-badge', orMode ? 'ଐଚ୍ଛିକ' : 'Optional'));
          if (h.types.indexOf('bank') !== -1) tags.appendChild(el('span', 'cso-hel-badge cso-hel-badge--bank', orMode ? 'ବ୍ୟାଙ୍କ/ଟ୍ରେଜେରୀ' : 'Bank/Treasury'));
          top.appendChild(tags);
          card.appendChild(top);

          card.appendChild(el('strong', 'cso-hel-hol-name', orMode ? h.or : h.en));
          card.appendChild(el('p', 'cso-hel-hol-note', h.note));

          var expBtn = el('button', 'cso-hel-btn cso-hel-btn--sm', orMode ? '📅 ଛୁଟି ସେଭ୍ (.ics)' : '📅 Export Holiday (.ics)');
          expBtn.type = 'button';
          expBtn.addEventListener('click', function () {
            if (calApi && typeof calApi.downloadSingleEvent === 'function') {
              calApi.downloadSingleEvent({
                title: h.en + ' — Odisha Govt Holiday',
                date: h.date,
                description: h.note,
                url: 'https://csodisha.com/guides/'
              }, h.id);
            }
          });
          card.appendChild(expBtn);
          frag.appendChild(card);
        })(list[i]);
      }
      holGrid.replaceChildren(frag);
    }

    function renderLogistics(orMode) {
      customWrap.hidden = state.prefs.shift !== 'custom';
      omrBtn.textContent = orMode ? 'OMR ସିଟ୍ (OPSC/OSSC/OSSSC)' : 'OMR Sheet (OPSC / OSSC / OSSSC / OPRB)';
      cbtBtn.textContent = orMode ? 'CBT ଅନଲାଇନ୍ (NTA/CTET/SSC)' : 'CBT Online (NTA / CBSE CTET / SSC)';
      omrBtn.className = 'cso-hel-pill' + (state.prefs.mode === 'omr' ? ' is-active' : '');
      cbtBtn.className = 'cso-hel-pill' + (state.prefs.mode === 'cbt' ? ' is-active' : '');

      var tl = computeExamDayTimeline(activeStartTime(), state.prefs.travelMins, state.prefs.mode);
      var tlFrag = doc.createDocumentFragment();
      for (var i = 0; i < tl.milestones.length; i += 1) {
        var ms = tl.milestones[i];
        var box = el('div', 'cso-hel-ms' + (ms.key === 'gate' ? ' is-cutoff' : ''));
        box.appendChild(el('strong', 'cso-hel-ms__time', ms.time));
        box.appendChild(el('div', 'cso-hel-ms__label', orMode ? ms.or : ms.en));
        box.appendChild(el('span', 'cso-hel-ms__note', ms.note));
        tlFrag.appendChild(box);
      }
      timelineGrid.replaceChildren(tlFrag);

      // 8-Item Checklist
      var prog = getChecklistProgress(state.checklist);
      var cFrag = doc.createDocumentFragment();
      var cHead = el('div', 'cso-hel-check-head');
      cHead.appendChild(el('h4', 'cso-hel-check-title', orMode ? '✅ ପରୀକ୍ଷା ଦିନ ରିପୋର୍ଟିଂ ଚେକଲିଷ୍ଟ' : '✅ Exam-Day Reporting Checklist'));
      cHead.appendChild(el('span', 'cso-hel-meter', prog.completed + ' / ' + prog.total + (orMode ? ' ପ୍ରସ୍ତୁତ' : ' Ready')));
      cFrag.appendChild(cHead);

      var cGrid = el('div', 'cso-hel-check-grid');
      for (var c = 0; c < EXAM_CHECKLIST_ITEMS.length; c += 1) {
        (function (item) {
          var checked = Boolean(state.checklist[item.id]);
          var lbl = el('label', 'cso-hel-check-item' + (checked ? ' is-checked' : ''));
          var cb = el('input', 'cso-hel-cb');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.addEventListener('change', function () {
            state.checklist[item.id] = cb.checked;
            saveChecklist(state.checklist);
            renderLogistics(state.lang === 'or');
          });
          var txt = item.id === 'stationery'
            ? (state.prefs.mode === 'cbt' ? (orMode ? item.cbt_or : item.cbt_en) : (orMode ? item.omr_or : item.omr_en))
            : (orMode ? item.or : item.en);
          lbl.appendChild(cb);
          lbl.appendChild(el('span', '', txt));
          cGrid.appendChild(lbl);
        })(EXAM_CHECKLIST_ITEMS[c]);
      }
      cFrag.appendChild(cGrid);
      checklistBox.replaceChildren(cFrag);

      // Permitted vs Prohibited cards
      var rFrag = doc.createDocumentFragment();
      var perm = el('div', 'cso-hel-rule-card');
      perm.appendChild(el('h4', 'cso-hel-rule-title', orMode ? '✅ ଅନୁମତିପ୍ରାପ୍ତ ସାମଗ୍ରୀ' : '✅ Permitted Items'));
      perm.appendChild(el('p', 'cso-hel-rule-body',
        'Printed Admit Card, Original Govt Photo ID (Aadhaar/Voter/PAN/DL), 2 Passport Photos, Transparent Water Bottle, ' +
        (state.prefs.mode === 'cbt' ? 'Center-provided pen & rough sheet.' : '2 Black/Blue Ballpoint Pens (OMR).')));

      var proh = el('div', 'cso-hel-rule-card cso-hel-rule-card--warn');
      proh.appendChild(el('h4', 'cso-hel-rule-title', orMode ? '⛔ ନିଷିଦ୍ଧ ସାମଗ୍ରୀ' : '⛔ Prohibited Items'));
      proh.appendChild(el('p', 'cso-hel-rule-body',
        'Mobile phones, smartwatches, Bluetooth earbuds, calculators, log tables, wallets/purses, metallic jewelry, or loose notes.'));
      rFrag.appendChild(perm);
      rFrag.appendChild(proh);
      rulesGrid.replaceChildren(rFrag);
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-hel-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-hel-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '🗓️ ଓଡ଼ିଶା ସରକାରୀ ଛୁଟି, ଟ୍ରେଜେରୀ ଓ ପରୀକ୍ଷା-ଦିନ ଲଜିଷ୍ଟିକ୍ସ'
        : '🗓️ Odisha Govt Holiday, Treasury & Exam-Day Logistics Calendar';
      subtitle.textContent = orMode
        ? '୨୦୨୬–୨୭ ଓଡ଼ିଶା ସରକାରୀ ଗେଜେଟେଡ୍, ଐଚ୍ଛିକ ଓ ବ୍ୟାଙ୍କ/ଟ୍ରେଜେରୀ ଛୁଟି ତାଲିକା ଏବଂ ପରୀକ୍ଷା-ଦିନ ଗେଟ୍ କ୍ଲୋଜର୍ ଟାଇମର୍ ଓ ରିପୋର୍ଟିଂ ଚେକଲିଷ୍ଟ।'
        : 'Searchable 2026–27 Odisha State Govt Gazetted/Optional & RBI Bank/Treasury holiday calendar plus backward Exam-Day gate-closure planner and reporting checklist.';
      printBtn.textContent = orMode ? '🖨️ କ୍ଲିନ୍-ସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Clean-Sheet Checklist';

      secATitle.textContent = orMode ? 'A. ୨୦୨୬–୨୭ ଓଡ଼ିଶା ସରକାରୀ ଓ ବ୍ୟାଙ୍କ/ଟ୍ରେଜେରୀ ଛୁଟି କ୍ୟାଲେଣ୍ଡର୍' : 'A. 2026–27 Odisha State Govt & RBI Bank / Treasury Holiday Calendar';
      bankHelper.textContent = orMode
        ? '🏦 ଟ୍ରେଜେରୀ ଓ ବ୍ୟାଙ୍କ ସୂଚନା: ପ୍ରତି ମାସର ୨ୟ ଓ ୪ର୍ଥ ଶନିବାର ଏବଂ ସମସ୍ତ ରବିବାର RBI ବ୍ୟାଙ୍କ ଓ ଟ୍ରେଜେରୀ ବନ୍ଦ ରହେ — ଚାଲାଣ/DD ଓ ଡକ୍ୟୁମେଣ୍ଟ୍ ଆଟେଷ୍ଟେସନ୍ ପୂର୍ବରୁ ଯୋଜନା କରନ୍ତୁ।'
        : '🏦 Treasury & Bank Working Day Helper: All 2nd & 4th Saturdays and Sundays are RBI Bank/Treasury closures — plan challan verification, DD preparation, and document attestation ahead of deadlines.';

      // Type pills
      var pFrag = doc.createDocumentFragment();
      for (var i = 0; i < HOLIDAY_TYPES.length; i += 1) {
        (function (t) {
          var active = state.prefs.type === t.key;
          var b = el('button', 'cso-hel-pill' + (active ? ' is-active' : ''), orMode ? t.or : t.en);
          b.type = 'button';
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
          b.addEventListener('click', function () {
            state.prefs.type = t.key;
            savePrefs(state.prefs);
            render();
          });
          pFrag.appendChild(b);
        })(HOLIDAY_TYPES[i]);
      }
      typePills.replaceChildren(pFrag);

      // Period dropdown
      perLabel.textContent = orMode ? 'ସମୟ ଅବଧି' : 'Quarter / Period';
      var perFrag = doc.createDocumentFragment();
      for (var p = 0; p < PERIODS.length; p += 1) {
        var opt = el('option', '', orMode ? PERIODS[p].or : PERIODS[p].en);
        opt.value = PERIODS[p].key;
        if (PERIODS[p].key === state.prefs.period) opt.selected = true;
        perFrag.appendChild(opt);
      }
      perSelect.replaceChildren(perFrag);
      perSelect.value = state.prefs.period;

      qLabel.textContent = orMode ? 'ଛୁଟି ଖୋଜନ୍ତୁ' : 'Search Holiday or Festival';
      qInput.placeholder = orMode ? 'ଉଦାହରଣ: Utkal Divas, Raja, Rath Yatra, Nuakhai...' : 'e.g., Utkal Divas, Raja, Rath Yatra, Nuakhai, Diwali...';

      // Section B labels
      secBTitle.textContent = orMode ? 'B. ପରୀକ୍ଷା-ଦିନ ଯାତ୍ରା, ଗେଟ୍ କ୍ଲୋଜର୍ ଟାଇମର୍ ଓ ଚେକଲିଷ୍ଟ' : 'B. Exam-Day Center Travel, Gate Closure Timer & Reporting Checklist';
      shiftLabel.textContent = orMode ? 'ପରୀକ୍ଷା ଶିଫ୍ଟ' : 'Exam Shift Preset';
      var shiftOpts = [
        { k: 'morning', l: orMode ? 'ସକାଳ ଶିଫ୍ଟ (09:30 AM · ଗେଟ୍ 09:00 AM)' : 'Morning Shift (Exam 09:30 AM)' },
        { k: 'afternoon', l: orMode ? 'ଅପରାହ୍ନ ଶିଫ୍ଟ (02:30 PM · ଗେଟ୍ 02:00 PM)' : 'Afternoon Shift (Exam 02:30 PM)' },
        { k: 'custom', l: orMode ? 'କଷ୍ଟମ୍ ସମୟ (HH:MM)' : 'Custom Exam Start Time (HH:MM)' }
      ];
      var sFrag = doc.createDocumentFragment();
      for (var s = 0; s < shiftOpts.length; s += 1) {
        var sOpt = el('option', '', shiftOpts[s].l);
        sOpt.value = shiftOpts[s].k;
        if (shiftOpts[s].k === state.prefs.shift) sOpt.selected = true;
        sFrag.appendChild(sOpt);
      }
      shiftSelect.replaceChildren(sFrag);
      shiftSelect.value = state.prefs.shift;

      customLabel.textContent = orMode ? 'ପରୀକ୍ଷା ଆରମ୍ଭ ସମୟ' : 'Custom Exam Start Time';
      travLabel.textContent = orMode ? 'ଯାତ୍ରା ସମୟ (ମିନିଟ୍)' : 'Travel Buffer (mins)';
      var tVals = [30, 45, 60, 90];
      var tFrag = doc.createDocumentFragment();
      for (var tv = 0; tv < tVals.length; tv += 1) {
        var tOpt = el('option', '', tVals[tv] + ' mins');
        tOpt.value = String(tVals[tv]);
        if (tVals[tv] === state.prefs.travelMins) tOpt.selected = true;
        tFrag.appendChild(tOpt);
      }
      travSelect.replaceChildren(tFrag);
      travSelect.value = String(state.prefs.travelMins);

      modeLabel.textContent = orMode ? 'ପରୀକ୍ଷା ମୋଡ୍' : 'Exam Mode';
      copyPlanBtn.textContent = orMode ? '📋 ପରୀକ୍ଷା-ଦିନ ପ୍ଲାନ୍ କପି କରନ୍ତୁ' : '📋 Copy Exam-Day Plan';
      copyStatusEl.textContent = state.copyStatus;

      renderHolidays(orMode);
      renderLogistics(orMode);
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });
    perSelect.addEventListener('change', function () { state.prefs.period = perSelect.value; savePrefs(state.prefs); renderHolidays(state.lang === 'or'); });
    qInput.addEventListener('input', function () { state.prefs.query = qInput.value; savePrefs(state.prefs); renderHolidays(state.lang === 'or'); });
    shiftSelect.addEventListener('change', function () { state.prefs.shift = shiftSelect.value; savePrefs(state.prefs); renderLogistics(state.lang === 'or'); });
    customInput.addEventListener('change', function () { state.prefs.customTime = customInput.value || '09:30'; savePrefs(state.prefs); renderLogistics(state.lang === 'or'); });
    travSelect.addEventListener('change', function () { state.prefs.travelMins = Number(travSelect.value) || 45; savePrefs(state.prefs); renderLogistics(state.lang === 'or'); });
    omrBtn.addEventListener('click', function () { state.prefs.mode = 'omr'; savePrefs(state.prefs); renderLogistics(state.lang === 'or'); });
    cbtBtn.addEventListener('click', function () { state.prefs.mode = 'cbt'; savePrefs(state.prefs); renderLogistics(state.lang === 'or'); });

    copyPlanBtn.addEventListener('click', function () {
      var tl = computeExamDayTimeline(activeStartTime(), state.prefs.travelMins, state.prefs.mode);
      var txt = [
        'CS Odisha Exam-Day Plan (' + tl.mode.toUpperCase() + ' Mode · Exam ' + tl.examStart + ')',
        '1. Depart Home: ' + tl.departure + ' (' + tl.travelMins + 'm travel)',
        '2. Reach Center: ' + tl.arrival,
        '3. Biometric & Verification: ' + tl.biometric,
        '4. Strict Gate Closure: ' + tl.gateClosure
      ].join('\n');
      if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        win.navigator.clipboard.writeText(txt).then(function () {
          state.copyStatus = '✅ Copied Exam-Day Plan!';
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
    CHECKLIST_KEY: CHECKLIST_KEY,
    HOLIDAY_TYPES: HOLIDAY_TYPES,
    PERIODS: PERIODS,
    HOLIDAYS: HOLIDAYS,
    EXAM_CHECKLIST_ITEMS: EXAM_CHECKLIST_ITEMS,
    filterHolidays: filterHolidays,
    computeExamDayTimeline: computeExamDayTimeline,
    getChecklistProgress: getChecklistProgress,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    loadChecklist: loadChecklist,
    saveChecklist: saveChecklist,
    mount: mount
  };
});
