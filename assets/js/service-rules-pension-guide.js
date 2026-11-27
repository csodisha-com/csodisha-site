/**
 * Common Sense Odisha — Interactive Odisha Govt Leave, TA/DA & NPS vs. UPS Pension Quick-Reference (v416)
 * Mounted on /career-paths/ and /guides/ (#cso-service-rules-guide-root) with bilingual EN + Odia UI,
 * localStorage preference persistence (`cso_service_rules_prefs_v1`), Orissa Service Code leave rules,
 * Earned Leave retirement encashment calculator, ORSP TA/DA slabs, and NPS vs. UPS Pension Estimator
 * (Odisha Finance Dept Notification 9364/F, effective April 1, 2025).
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOServiceRulesGuide = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOServiceRulesGuide = api;
})(function (win, doc) {
  'use strict';

  var PREFS_KEY = 'cso_service_rules_prefs_v1';
  var ORSP_PREFS_KEY = 'cso_orsp_salary_prefs_v1';

  var ORSP_LEVELS = [
    { level: 1, basic: 16600, label: 'Level 1 (₹16,600)' },
    { level: 2, basic: 17200, label: 'Level 2 (₹17,200)' },
    { level: 3, basic: 18000, label: 'Level 3 (₹18,000)' },
    { level: 4, basic: 19900, label: 'Level 4 (₹19,900)' },
    { level: 5, basic: 21700, label: 'Level 5 (₹21,700)' },
    { level: 6, basic: 23600, label: 'Level 6 (₹23,600)' },
    { level: 7, basic: 25500, label: 'Level 7 (₹25,500)' },
    { level: 8, basic: 29200, label: 'Level 8 (₹29,200)' },
    { level: 9, basic: 35400, label: 'Level 9 (₹35,400)' },
    { level: 10, basic: 44900, label: 'Level 10 (₹44,900)' },
    { level: 11, basic: 47600, label: 'Level 11 (₹47,600)' },
    { level: 12, basic: 56100, label: 'Level 12 (₹56,100)' },
    { level: 13, basic: 67700, label: 'Level 13 (₹67,700)' },
    { level: 14, basic: 78800, label: 'Level 14 (₹78,800)' },
    { level: 15, basic: 105900, label: 'Level 15 (₹1,05,900)' },
    { level: 16, basic: 123100, label: 'Level 16 (₹1,23,100)' },
    { level: 17, basic: 131100, label: 'Level 17 (₹1,31,100)' }
  ];

  var VIEW_TABS = [
    { key: 'all', en: 'All Sections', or: 'ସମସ୍ତ ବିଭାଗ' },
    { key: 'leave', en: 'Leave Rules & Encashment', or: 'ଛୁଟି ନିୟମ ଓ EL ଏନକ୍ୟାସମେଣ୍ଟ' },
    { key: 'tada', en: 'TA / DA & Joining Entitlements', or: 'TA / DA ଓ ଟ୍ରାନ୍ସଫର୍ ଭତ୍ତା' },
    { key: 'pension', en: 'NPS vs. UPS Pension Estimator', or: 'NPS ବନାମ UPS ପେନସନ୍ ହିସାବ' }
  ];

  var LEAVE_RULES = [
    {
      key: 'casual-leave',
      name_en: 'Casual Leave (CL)',
      name_or: 'ଆକସ୍ମିକ ଛୁଟି (Casual Leave)',
      quota: '10 Days / Calendar Year',
      rule_en: 'Non-cumulative; lapses on Dec 31. Cannot be combined with EL/HPL; sanctioned by Head of Office.',
      rule_or: 'ବର୍ଷ ଶେଷରେ ସମାପ୍ତ ହୁଏ; EL/HPL ସହ ମିଶାଯାଇପାରିବ ନାହିଁ; କାର୍ଯ୍ୟାଳୟ ମୁଖ୍ୟ ମଞ୍ଜୁର କରନ୍ତି।'
    },
    {
      key: 'earned-leave',
      name_en: 'Earned Leave (EL)',
      name_or: 'ଅର୍ଜିତ ଛୁଟି (Earned Leave)',
      quota: '30 Days / Year (Max 300 Days Cap)',
      rule_en: 'Credited in 2 instalments of 15 days (Jan 1 & Jul 1). Max accumulation & retirement encashment up to 300 days at (Basic + DA) / 30.',
      rule_or: 'ଜାନୁଆରୀ ୧ ଓ ଜୁଲାଇ ୧ରେ ୧୫ ଦିନ ଲେଖାଏଁ ଜମା ହୁଏ। ଅବସର ସମୟରେ ସର୍ବାଧିକ ୩୦୦ ଦିନ ପର୍ଯ୍ୟନ୍ତ ନଗଦୀକରଣ।'
    },
    {
      key: 'half-pay-leave',
      name_en: 'Half Pay Leave (HPL) & Commuted Leave',
      name_or: 'ଅର୍ଦ୍ଧ ବେତନ ଛୁଟି (HPL) ଓ କମ୍ୟୁଟେଡ୍ ଛୁଟି',
      quota: '20 Days / Year',
      rule_en: '10 days credited every 6 months; can be commuted to full pay on medical certificate at 2 HPL = 1 Commuted Leave.',
      rule_or: 'ପ୍ରତି ୬ ମାସରେ ୧୦ ଦିନ ଜମା ହୁଏ; ଡାକ୍ତରୀ ପ୍ରମାଣପତ୍ରରେ ୨ HPL = ୧ ପୂର୍ଣ୍ଣ ବେତନ ଛୁଟି।'
    },
    {
      key: 'maternity-leave',
      name_en: 'Maternity Leave (Rule 194, Orissa Service Code)',
      name_or: 'ମାତୃତ୍ୱ ଛୁଟି (ନିୟମ ୧୯୪, ଓଡ଼ିଶା ସର୍ଭିସ୍ କୋଡ୍)',
      quota: '180 Days (Full Pay)',
      rule_en: 'For female govt servants with < 2 surviving children; extendable to surrogate/commissioning mothers per Odisha Finance Dept OM; up to 45 days for miscarriage.',
      rule_or: '୨ରୁ କମ୍ ଜୀବିତ ସନ୍ତାନ ଥିବା ମହିଳା କର୍ମଚାରୀଙ୍କ ପାଇଁ ୧୮୦ ଦିନ ପୂର୍ଣ୍ଣ ବେତନ ଛୁଟି (ଗର୍ଭପାତ ପାଇଁ ୪୫ ଦିନ)।'
    },
    {
      key: 'paternity-leave',
      name_en: 'Paternity Leave',
      name_or: 'ପିତୃତ୍ୱ ଛୁଟି (Paternity Leave)',
      quota: '15 Days (Full Pay)',
      rule_en: 'For male govt servants with < 2 surviving children; must be availed within 6 months of childbirth or valid adoption.',
      rule_or: '୨ରୁ କମ୍ ଜୀବିତ ସନ୍ତାନ ଥିବା ପୁରୁଷ କର୍ମଚାରୀଙ୍କ ପାଇଁ ସନ୍ତାନ ଜନ୍ମ/ପୋଷ୍ୟ ଗ୍ରହଣର ୬ ମାସ ଭିତରେ ୧୫ ଦିନ।'
    },
    {
      key: 'eol-study-leave',
      name_en: 'Extraordinary Leave (EOL) & Study Leave',
      name_or: 'ଅସାଧାରଣ ଛୁଟି (EOL) ଓ ଅଧ୍ୟୟନ ଛୁଟି',
      quota: 'Study Leave: Up to 24 Months (36m Tech)',
      rule_en: 'Study Leave up to 24 months (extendable to 36 months for higher/technical qualification with service bond); EOL sanctioned when no other leave is due.',
      rule_or: 'ଉଚ୍ଚଶିକ୍ଷା ପାଇଁ ସର୍ଭିସ୍ ବଣ୍ଡ ସହ ୨୪ ମାସ (ବୈଷୟିକ ପାଇଁ ୩୬ ମାସ) ଅଧ୍ୟୟନ ଛୁଟି; ଅନ୍ୟ ଛୁଟି ନଥିଲେ EOL।'
    }
  ];

  var TADA_SLABS = [
    {
      band: 'Level 1 – Level 5',
      minLevel: 1,
      maxLevel: 5,
      rail_air: 'Sleeper / AC-III Economy (Train) · Ordinary/Deluxe Bus',
      da_ordinary: '₹500 / day',
      da_bbsr_ctc: '₹650 / day',
      da_metro: '₹900 / day',
      transfer_rule: 'Composite Transfer Grant = 80% of Basic Pay + 10–15 days Joining Time'
    },
    {
      band: 'Level 6 – Level 8',
      minLevel: 6,
      maxLevel: 8,
      rail_air: 'AC-III Tier (Train) · AC Bus',
      da_ordinary: '₹650 / day',
      da_bbsr_ctc: '₹800 / day',
      da_metro: '₹1,100 / day',
      transfer_rule: 'Composite Transfer Grant = 80% of Basic Pay + 10–15 days Joining Time'
    },
    {
      band: 'Level 9 – Level 11',
      minLevel: 9,
      maxLevel: 11,
      rail_air: 'AC-II Tier (Train) · AC Volvo Bus',
      da_ordinary: '₹800 / day',
      da_bbsr_ctc: '₹1,000 / day',
      da_metro: '₹1,400 / day',
      transfer_rule: 'Composite Transfer Grant = 80% of Basic Pay + 10–15 days Joining Time'
    },
    {
      band: 'Level 12 – Level 17',
      minLevel: 12,
      maxLevel: 17,
      rail_air: 'Economy Air / AC-I / AC-II Tier (Train)',
      da_ordinary: '₹1,000 / day',
      da_bbsr_ctc: '₹1,200 / day',
      da_metro: '₹1,800 / day',
      transfer_rule: 'Composite Transfer Grant = 80% of Basic Pay + 10–15 days Joining Time'
    }
  ];

  function getOrspLevel(lvl) {
    var n = Number(lvl) || 9;
    for (var i = 0; i < ORSP_LEVELS.length; i += 1) {
      if (ORSP_LEVELS[i].level === n) return ORSP_LEVELS[i];
    }
    return ORSP_LEVELS[8]; // Level 9 default
  }

  function getTaDaSlabForLevel(lvl) {
    var n = Number(lvl) || 9;
    for (var i = 0; i < TADA_SLABS.length; i += 1) {
      if (n >= TADA_SLABS[i].minLevel && n <= TADA_SLABS[i].maxLevel) return TADA_SLABS[i];
    }
    return TADA_SLABS[2];
  }

  function computeElEncashment(basicPay, daPct, elDays) {
    var bp = Math.max(0, Number(basicPay) || 0);
    var da = Math.max(0, Number(daPct) || 0);
    var cappedDays = Math.max(0, Math.min(300, Math.round(Number(elDays) || 0)));
    var monthlyEmolument = bp * (1 + da / 100);
    var dailyRate = Math.round(monthlyEmolument / 30);
    var totalAmount = cappedDays * dailyRate;
    return {
      cappedDays: cappedDays,
      dailyRate: dailyRate,
      totalAmount: totalAmount
    };
  }

  function computeCompositeTransferGrant(basicPay) {
    return Math.round(Math.max(0, Number(basicPay) || 0) * 0.8);
  }

  function computeUpsVsNps(avgBasicPay, serviceYears, daPct) {
    var bp = Math.max(0, Number(avgBasicPay) || 0);
    var yrs = Math.max(0, Math.min(40, Number(serviceYears) || 0));
    var da = Math.max(0, Number(daPct) || 0);
    var qualifyingMonths = Math.round(yrs * 12);
    var monthlyEmolument = Math.round(bp * (1 + da / 100));

    // UPS Assured Pension (Odisha Finance Dept Notification 9364/F, effective Apr 1, 2025)
    var upsBasicPension = 0;
    if (yrs >= 25) {
      upsBasicPension = Math.round(bp * 0.5);
    } else if (yrs >= 10) {
      var proRata = Math.round((bp * 0.5) * (qualifyingMonths / 300));
      upsBasicPension = Math.max(10000, proRata);
    }
    var upsDr = Math.round(upsBasicPension * (da / 100));
    var upsTotalMonthly = upsBasicPension + upsDr;

    var upsFamilyBasic = Math.round(upsBasicPension * 0.6);
    var upsFamilyDr = Math.round(upsFamilyBasic * (da / 100));
    var upsFamilyTotal = upsFamilyBasic + upsFamilyDr;

    // 1/10th of monthly emoluments (Basic + DA) for every completed 6-month period
    var completedSixMonths = Math.floor(qualifyingMonths / 6);
    var upsLumpSum = Math.round((monthlyEmolument / 10) * completedSixMonths);

    var empContrib = Math.round(monthlyEmolument * 0.10);
    var upsGovtContrib = Math.round(monthlyEmolument * 0.185);
    var npsGovtContrib = Math.round(monthlyEmolument * 0.14);

    return {
      avgBasicPay: bp,
      serviceYears: yrs,
      qualifyingMonths: qualifyingMonths,
      daPct: da,
      monthlyEmolument: monthlyEmolument,
      ups: {
        eligible: yrs >= 10,
        fullAssured: yrs >= 25,
        basicPension: upsBasicPension,
        dearnessRelief: upsDr,
        totalMonthly: upsTotalMonthly,
        familyBasic: upsFamilyBasic,
        familyTotal: upsFamilyTotal,
        lumpSum: upsLumpSum,
        employeeContribMonthly: empContrib,
        govtContribMonthly: upsGovtContrib
      },
      nps: {
        employeeContribMonthly: empContrib,
        govtContribMonthly: npsGovtContrib,
        totalMonthlyContrib: empContrib + npsGovtContrib,
        lumpSumSharePct: 60,
        annuitySharePct: 40
      }
    };
  }

  function fmtInr(n) {
    var v = Math.round(Number(n) || 0);
    return '₹' + v.toLocaleString('en-IN');
  }

  function loadInitialState() {
    var base = { tab: 'all', level: 9, basicPay: 35400, serviceYears: 25, daPct: 63, elDays: 240 };
    try {
      if (win && win.location && win.location.search) {
        var sp = new URLSearchParams(win.location.search);
        var qLvl = Number(sp.get('level'));
        if (qLvl >= 1 && qLvl <= 17) {
          base.level = qLvl;
          base.basicPay = getOrspLevel(qLvl).basic;
        }
      }
    } catch (_) {}
    try {
      var orspRaw = win && win.localStorage && win.localStorage.getItem(ORSP_PREFS_KEY);
      if (orspRaw) {
        var op = JSON.parse(orspRaw);
        if (op && op.level >= 1 && op.level <= 17) {
          base.level = Number(op.level);
          base.basicPay = getOrspLevel(base.level).basic;
        }
        if (op && op.daPct !== undefined) base.daPct = Number(op.daPct) || 63;
      }
    } catch (_) {}
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') Object.assign(base, p);
      }
    } catch (_) {}
    return base;
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
    var state = Object.assign({ lang: detectLang(), copiedToast: false }, loadInitialState());

    function persistAndRender() {
      savePrefs({
        tab: state.tab,
        level: state.level,
        basicPay: state.basicPay,
        serviceYears: state.serviceYears,
        daPct: state.daPct,
        elDays: state.elDays
      });
      render();
    }

    function render() {
      var isOr = state.lang === 'or';
      var elRes = computeElEncashment(state.basicPay, state.daPct, state.elDays);
      var ctg = computeCompositeTransferGrant(state.basicPay);
      var activeSlab = getTaDaSlabForLevel(state.level);
      var pen = computeUpsVsNps(state.basicPay, state.serviceYears, state.daPct);

      var wrap = el('section', 'cso-srp-card');
      wrap.setAttribute('data-cso-service-rules', 'v416');
      wrap.setAttribute('aria-label', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ ଛୁଟି, TA/DA ଓ NPS ବନାମ UPS ପେନସନ୍ ଗାଇଡ୍' : 'Odisha Govt Leave, TA/DA and NPS vs UPS Pension Quick Reference');

      // Header
      var head = el('div', 'cso-srp-head');
      var headLeft = el('div', 'cso-srp-head-left');
      headLeft.appendChild(el('span', 'cso-srp-badge', isOr ? '📘 ଓଡ଼ିଶା ସର୍ଭିସ୍ କୋଡ୍ ଓ ଅର୍ଥ ବିଭାଗ ବିଜ୍ଞପ୍ତି 9364/F' : '📘 Orissa Service Code & Odisha Finance Dept 9364/F'));
      headLeft.appendChild(el('h2', 'cso-srp-title', isOr
        ? 'ଓଡ଼ିଶା ସରକାରୀ ଛୁଟି, TA/DA ଓ NPS ବନାମ UPS ପେନସନ୍ କ୍ୟାଲକୁଲେଟର୍'
        : 'Odisha Govt Leave Rules, TA/DA & NPS vs. UPS Pension Quick-Reference'));
      headLeft.appendChild(el('p', 'cso-srp-sub', isOr
        ? 'ନୂତନ ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀଙ୍କ ପାଇଁ CL/EL/HPL/ମାତୃତ୍ୱ/ପିତୃତ୍ୱ ଛୁଟି, EL ନଗଦୀକରଣ, ଟୁର୍ TA/DA ଓ UPS ବନାମ NPS ପେନସନ୍ ତୁଳନା।'
        : 'Essential reference for Odisha State Govt recruits: Orissa Service Code leave rules, EL retirement encashment, ORSP TA/DA slabs, and NPS vs. Unified Pension Scheme (UPS).'));

      var headRight = el('div', 'cso-srp-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-srp-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        headRight.appendChild(lb);
      });
      var copyBtn = el('button', 'cso-srp-btn', state.copiedToast ? '✓ Summary Copied' : '📋 Copy Service & Pension Summary');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var txt = [
          'CS Odisha Service Rules & Pension Summary (ORSP Level ' + state.level + ')',
          'Avg Basic Pay: ' + fmtInr(state.basicPay) + ' | DA: ' + state.daPct + '% | Service: ' + state.serviceYears + ' yrs',
          'UPS Assured Basic Pension: ' + fmtInr(pen.ups.basicPension) + '/mo (+ DR = ' + fmtInr(pen.ups.totalMonthly) + '/mo)',
          'UPS Family Pension: ' + fmtInr(pen.ups.familyBasic) + '/mo (+ DR = ' + fmtInr(pen.ups.familyTotal) + '/mo) | UPS Lump-Sum: ' + fmtInr(pen.ups.lumpSum),
          'EL Encashment (' + elRes.cappedDays + ' days): ' + fmtInr(elRes.totalAmount) + ' | Composite Transfer Grant (80%): ' + fmtInr(ctg)
        ].join('\n');
        if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
          win.navigator.clipboard.writeText(txt).catch(function () {});
        }
        state.copiedToast = true;
        render();
      });
      var printBtn = el('button', 'cso-srp-btn', '🖨️ Print Reference Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (win && typeof win.print === 'function') win.print(); });
      headRight.append(copyBtn, printBtn);
      head.append(headLeft, headRight);
      wrap.appendChild(head);

      // View Tabs
      var tabBar = el('div', 'cso-srp-actions');
      tabBar.setAttribute('role', 'group');
      tabBar.setAttribute('aria-label', 'Filter service rules sections');
      VIEW_TABS.forEach(function (t) {
        var act = state.tab === t.key;
        var tb = el('button', 'cso-srp-pill' + (act ? ' is-active' : ''), isOr ? t.or : t.en);
        tb.type = 'button';
        tb.setAttribute('aria-pressed', act ? 'true' : 'false');
        tb.addEventListener('click', function () { state.tab = t.key; persistAndRender(); });
        tabBar.appendChild(tb);
      });
      wrap.appendChild(tabBar);

      // Shared Calculator Controls (ORSP Level, Avg Basic Pay, Service Years, DA%)
      var ctrlGrid = el('div', 'cso-srp-controls');

      var lvlF = el('label', 'cso-srp-field');
      lvlF.appendChild(el('span', 'cso-srp-field-lbl', isOr ? 'ORSP ପେ ଲେଭେଲ୍ (1–17)' : 'ORSP Pay Level (1–17)'));
      var lvlSel = el('select', 'cso-srp-select');
      ORSP_LEVELS.forEach(function (lv) {
        var o = el('option', '', lv.label);
        o.value = String(lv.level);
        if (state.level === lv.level) o.selected = true;
        lvlSel.appendChild(o);
      });
      lvlSel.addEventListener('change', function () {
        state.level = Number(lvlSel.value) || 9;
        state.basicPay = getOrspLevel(state.level).basic;
        persistAndRender();
      });
      lvlF.appendChild(lvlSel);

      var bpF = el('label', 'cso-srp-field');
      bpF.appendChild(el('span', 'cso-srp-field-lbl', isOr ? 'ଶେଷ ୧୨-ମାସ ହାରାହାରି ମୂଳ ବେତନ (₹)' : 'Last 12-Month Avg Basic Pay (₹)'));
      var bpInp = el('input', 'cso-srp-input');
      bpInp.type = 'number';
      bpInp.step = '500';
      bpInp.min = '10000';
      bpInp.value = String(state.basicPay);
      bpInp.addEventListener('change', function () { state.basicPay = Math.max(10000, Number(bpInp.value) || 35400); persistAndRender(); });
      bpF.appendChild(bpInp);

      var yrF = el('label', 'cso-srp-field');
      yrF.appendChild(el('span', 'cso-srp-field-lbl', isOr ? 'ଚାକିରି ବର୍ଷ (10–35)' : 'Qualifying Service Years (10–35)'));
      var yrInp = el('input', 'cso-srp-input');
      yrInp.type = 'number';
      yrInp.min = '10';
      yrInp.max = '35';
      yrInp.value = String(state.serviceYears);
      yrInp.addEventListener('change', function () { state.serviceYears = Math.max(10, Math.min(35, Number(yrInp.value) || 25)); persistAndRender(); });
      yrF.appendChild(yrInp);

      var daF = el('label', 'cso-srp-field');
      daF.appendChild(el('span', 'cso-srp-field-lbl', isOr ? 'ବର୍ତ୍ତମାନ DA / DR (%)' : 'Current DA / DR (%)'));
      var daInp = el('input', 'cso-srp-input');
      daInp.type = 'number';
      daInp.min = '0';
      daInp.max = '120';
      daInp.value = String(state.daPct);
      daInp.addEventListener('change', function () { state.daPct = Math.max(0, Math.min(120, Number(daInp.value) || 0)); persistAndRender(); });
      daF.appendChild(daInp);

      ctrlGrid.append(lvlF, bpF, yrF, daF);
      wrap.appendChild(ctrlGrid);

      // Section A — Leave Rules & EL Encashment
      if (state.tab === 'all' || state.tab === 'leave') {
        wrap.appendChild(el('h3', 'cso-srp-subhead', isOr ? '୧. ଓଡ଼ିଶା ସର୍ଭିସ୍ କୋଡ୍ ଛୁଟି ନିୟମ ଓ EL ନଗଦୀକରଣ' : '1. Orissa Service Code Leave Rules & EL Retirement Encashment'));
        var lGrid = el('div', 'cso-srp-grid');
        LEAVE_RULES.forEach(function (lr) {
          var item = el('article', 'cso-srp-item');
          item.appendChild(el('span', 'cso-srp-tag', lr.quota));
          item.appendChild(el('h4', 'cso-srp-item-title', isOr ? lr.name_or : lr.name_en));
          item.appendChild(el('p', 'cso-srp-note', isOr ? lr.rule_or : lr.rule_en));
          lGrid.appendChild(item);
        });
        wrap.appendChild(lGrid);

        var elBox = el('div', 'cso-srp-highlight-box');
        var elLeft = el('label', 'cso-srp-field');
        elLeft.appendChild(el('span', 'cso-srp-field-lbl', isOr ? 'ଅବସର ସମୟରେ ଜମା ଥିବା EL ଦିନ (ସର୍ବାଧିକ 300):' : 'Unavailed EL Days at Retirement (Max 300):'));
        var elInp = el('input', 'cso-srp-input');
        elInp.type = 'number';
        elInp.min = '0';
        elInp.max = '300';
        elInp.value = String(state.elDays);
        elInp.addEventListener('change', function () { state.elDays = Math.max(0, Math.min(300, Number(elInp.value) || 0)); persistAndRender(); });
        elLeft.appendChild(elInp);
        var elOut = el('div', 'cso-srp-el-out', (isOr ? 'ଅବସର EL ନଗଦୀକରଣ: ' : 'Tax-Exempt EL Encashment (' + elRes.cappedDays + ' days × ' + fmtInr(elRes.dailyRate) + '/day): ') + fmtInr(elRes.totalAmount));
        elBox.append(elLeft, elOut);
        wrap.appendChild(elBox);
      }

      // Section B — TA / DA & Transfer TTA
      if (state.tab === 'all' || state.tab === 'tada') {
        wrap.appendChild(el('h3', 'cso-srp-subhead', isOr ? '୨. ଟୁର୍ TA / DA ସ୍ଲାବ୍ ଓ ଟ୍ରାନ୍ସଫର୍ ଭତ୍ତା (Level ' + state.level + ')' : '2. Odisha Govt Tour TA / DA Slabs & Transfer TTA (Your Level ' + state.level + ')'));
        wrap.appendChild(el('div', 'cso-srp-note', 'Active Level ' + state.level + ' Composite Transfer Grant (80% of Basic Pay): ' + fmtInr(ctg) + ' · Travel Class: ' + activeSlab.rail_air));

        var tblWrap = el('div', 'cso-srp-table-wrap');
        var tbl = el('table', 'cso-srp-table');
        var th = el('thead');
        var hr = el('tr');
        ['ORSP Pay Band', 'Tour Travel Class', 'Ordinary DA', 'BBSR / Cuttack DA', 'Outside Odisha Metro DA', 'Transfer TTA'].forEach(function (h) {
          hr.appendChild(el('th', '', h));
        });
        th.appendChild(hr);
        tbl.appendChild(th);
        var tb = el('tbody');
        TADA_SLABS.forEach(function (sl) {
          var tr = el('tr', state.level >= sl.minLevel && state.level <= sl.maxLevel ? 'is-active' : '');
          [sl.band, sl.rail_air, sl.da_ordinary, sl.da_bbsr_ctc, sl.da_metro, sl.transfer_rule].forEach(function (cell) {
            tr.appendChild(el('td', '', cell));
          });
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        tblWrap.appendChild(tbl);
        wrap.appendChild(tblWrap);
      }

      // Section C — NPS vs. UPS Pension Estimator
      if (state.tab === 'all' || state.tab === 'pension') {
        wrap.appendChild(el('h3', 'cso-srp-subhead', isOr
          ? '୩. NPS ବନାମ ୟୁନିଫାଏଡ୍ ପେନସନ୍ ସ୍କିମ୍ (UPS — ୧ ଏପ୍ରିଲ ୨୦୨୫ ରୁ ଲାଗୁ)'
          : '3. NPS vs. Unified Pension Scheme (UPS — Odisha Finance Dept 9364/F, w.e.f. Apr 1, 2025)'));

        var cmpGrid = el('div', 'cso-srp-cmp-grid');

        // UPS Card
        var upsCard = el('article', 'cso-srp-item is-featured');
        upsCard.appendChild(el('span', 'cso-srp-tag', pen.ups.fullAssured ? 'UPS · Full 50% Assured Pension' : 'UPS · Pro-Rata Assured (₹10,000 Floor)'));
        upsCard.appendChild(el('h4', 'cso-srp-item-title', isOr ? 'ୟୁନିଫାଏଡ୍ ପେନସନ୍ ସ୍କିମ୍ (UPS)' : 'Unified Pension Scheme (UPS — Assured Option)'));
        var upsUl = el('ul', 'cso-srp-list');
        [
          'Assured Basic Pension: ' + fmtInr(pen.ups.basicPension) + ' / month',
          'Initial Monthly Pension with ' + state.daPct + '% DR: ' + fmtInr(pen.ups.totalMonthly) + ' / month',
          'Family Pension (60% + DR): ' + fmtInr(pen.ups.familyBasic) + ' basic (' + fmtInr(pen.ups.familyTotal) + ' with DR)',
          'Superannuation Lump-Sum (1/10th per 6m): ' + fmtInr(pen.ups.lumpSum) + ' (in addition to Gratuity)',
          'Contribution: 10% Employee (' + fmtInr(pen.ups.employeeContribMonthly) + ') + 18.5% Govt (' + fmtInr(pen.ups.govtContribMonthly) + ')'
        ].forEach(function (line) { upsUl.appendChild(el('li', '', line)); });
        upsCard.appendChild(upsUl);

        // NPS Card
        var npsCard = el('article', 'cso-srp-item');
        npsCard.appendChild(el('span', 'cso-srp-tag', 'NPS · Market-Linked Corpus (24% Total)'));
        npsCard.appendChild(el('h4', 'cso-srp-item-title', isOr ? 'ଜାତୀୟ ପେନସନ୍ ବ୍ୟବସ୍ଥା (NPS)' : 'National Pension System (NPS — Market-Linked)'));
        var npsUl = el('ul', 'cso-srp-list');
        [
          'Monthly Employee Contribution (10%): ' + fmtInr(pen.nps.employeeContribMonthly),
          'Odisha Govt Contribution (14%): ' + fmtInr(pen.nps.govtContribMonthly),
          'Total Monthly Corpus Addition (24%): ' + fmtInr(pen.nps.totalMonthlyContrib) + ' / month',
          'At Retirement: Up to 60% tax-free lump-sum withdrawal + min 40% annuity purchase',
          'Pension Payout: Market-linked annuity rate (no guaranteed DR-indexed floor)'
        ].forEach(function (line) { npsUl.appendChild(el('li', '', line)); });
        npsCard.appendChild(npsUl);

        cmpGrid.append(upsCard, npsCard);
        wrap.appendChild(cmpGrid);
      }

      container.replaceChildren(wrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-service-rules-guide-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v416',
    PREFS_KEY: PREFS_KEY,
    ORSP_LEVELS: ORSP_LEVELS,
    LEAVE_RULES: LEAVE_RULES,
    TADA_SLABS: TADA_SLABS,
    getTaDaSlabForLevel: getTaDaSlabForLevel,
    computeElEncashment: computeElEncashment,
    computeCompositeTransferGrant: computeCompositeTransferGrant,
    computeUpsVsNps: computeUpsVsNps,
    mount: mount
  };
});
