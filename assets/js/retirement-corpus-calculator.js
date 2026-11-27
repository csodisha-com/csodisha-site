/**
 * Common Sense Odisha — Interactive Odisha Govt Employee Leave Encashment,
 * Gratuity (DCRG) & Pension Commutation Retirement Corpus Calculator (/career-paths/, v436)
 * Computes 300-day EL encashment, DCRG (₹25L ceiling at DA >= 50% vs ₹20L below 50%),
 * 40% pension commutation lump-sum (factor 8.194 at age 60), and immediate vs restored
 * monthly pension (with DR on 100% full basic pension).
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSORetirementCorpusCalculator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSORetirementCorpusCalculator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v436';
  var ROOT_ID = 'cso-retirement-corpus-root';
  var PREFS_KEY = 'cso_retirement_corpus_v1';
  var ORSP_PREFS_KEY = 'cso_orsp_salary_prefs_v1';

  var COMMUTATION_FACTORS = {
    58: 8.371,
    60: 8.194,
    62: 7.991
  };

  var ORSP_PRESETS = [
    { level: 9, basic: 35400, label: 'Level 9 (₹35,400)' },
    { level: 10, basic: 44900, label: 'Level 10 (₹44,900)' },
    { level: 11, basic: 47600, label: 'Level 11 (₹47,600)' },
    { level: 12, basic: 56100, label: 'Level 12 (₹56,100)' },
    { level: 13, basic: 67700, label: 'Level 13 (₹67,700)' },
    { level: 14, basic: 78800, label: 'Level 14 (₹78,800)' },
    { level: 15, basic: 123100, label: 'Level 15 (₹1,23,100)' }
  ];

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
  }

  function calculateRetirementCorpus(params) {
    var p = params || {};
    var lastBasic = Math.max(10000, Math.round(Number(p.lastBasic !== undefined ? p.lastBasic : 78800) || 78800));
    var daRate = p.daRate !== undefined && p.daRate !== '' ? Math.max(0, Number(p.daRate) || 0) : 63;
    var serviceYears = Math.max(10, Math.min(35, Number(p.serviceYears !== undefined ? p.serviceYears : 30) || 30));
    var rawElDays = Math.max(0, Math.round(Number(p.elDays !== undefined ? p.elDays : 300) || 0));
    var cappedElDays = Math.min(300, rawElDays);
    var scheme = String(p.scheme || 'ops-ups').toLowerCase() === 'nps' ? 'nps' : 'ops-ups';
    var retirementAge = parseInt(p.retirementAge, 10) || 60;
    if (!COMMUTATION_FACTORS[retirementAge]) retirementAge = 60;
    var commutationFactor = COMMUTATION_FACTORS[retirementAge];

    var rawCommPct = p.commutationPct !== undefined && p.commutationPct !== '' ? Number(p.commutationPct) : 40;
    var commutationPct = scheme === 'ops-ups' ? Math.max(0, Math.min(40, isFinite(rawCommPct) ? rawCommPct : 40)) : 0;

    var daAmount = Math.round((lastBasic * daRate) / 100);
    var emoluments = lastBasic + daAmount;

    // 1. Earned Leave (EL) Encashment — max 300 days, 100% tax-exempt u/s 10(10AA)(i)
    var elEncashment = Math.round(cappedElDays * (emoluments / 30));

    // 2. Death-cum-Retirement Gratuity (DCRG) — max 66 six-monthly periods (16.5 months), ₹25L ceiling at DA >= 50% else ₹20L
    var sixMonthlyPeriods = Math.min(66, Math.max(0, Math.round(serviceYears * 2)));
    var dcrgUncapped = Math.round(emoluments * (sixMonthlyPeriods / 4));
    var dcrgCeiling = daRate >= 50 ? 2500000 : 2000000;
    var dcrgAmount = Math.min(dcrgCeiling, dcrgUncapped);

    // 3. Pension Commutation & Monthly Pension (DR paid on 100% full basic pension)
    var serviceFactor = serviceYears >= 20 ? 1 : (serviceYears / 20);
    var basicPension = Math.round(lastBasic * 0.50 * serviceFactor);
    var commutedMonthly = Math.round((basicPension * commutationPct) / 100);
    var commutationLumpSum = Math.round(commutedMonthly * 12 * commutationFactor);
    var drAmount = Math.round((basicPension * daRate) / 100);
    var monthlyPensionFull = basicPension + drAmount;
    var monthlyPensionImmediate = (basicPension - commutedMonthly) + drAmount;

    var totalLumpSum = elEncashment + dcrgAmount + commutationLumpSum;
    var denom = Math.max(1, totalLumpSum);

    return {
      lastBasic: lastBasic,
      daRate: daRate,
      daAmount: daAmount,
      emoluments: emoluments,
      serviceYears: serviceYears,
      sixMonthlyPeriods: sixMonthlyPeriods,
      rawElDays: rawElDays,
      cappedElDays: cappedElDays,
      scheme: scheme,
      retirementAge: retirementAge,
      commutationFactor: commutationFactor,
      commutationPct: commutationPct,
      elEncashment: elEncashment,
      dcrgUncapped: dcrgUncapped,
      dcrgCeiling: dcrgCeiling,
      dcrgAmount: dcrgAmount,
      basicPension: basicPension,
      commutedMonthly: commutedMonthly,
      commutationLumpSum: commutationLumpSum,
      drAmount: drAmount,
      monthlyPensionFull: monthlyPensionFull,
      monthlyPensionImmediate: monthlyPensionImmediate,
      totalLumpSum: totalLumpSum,
      elBarStep: quantizeStep((elEncashment / denom) * 100),
      dcrgBarStep: quantizeStep((dcrgAmount / denom) * 100),
      commBarStep: quantizeStep((commutationLumpSum / denom) * 100)
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

  function saveJson(key, obj) {
    try {
      if (win.localStorage) win.localStorage.setItem(key, JSON.stringify(obj));
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

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadJson(PREFS_KEY) || {};
    var orsp = loadJson(ORSP_PREFS_KEY) || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      lastBasic: saved.lastBasic !== undefined ? Number(saved.lastBasic) : (orsp.customBasic ? Number(orsp.customBasic) : 78800),
      daRate: saved.daRate !== undefined ? Number(saved.daRate) : (orsp.daRate !== undefined ? Number(orsp.daRate) : 63),
      serviceYears: saved.serviceYears !== undefined ? Number(saved.serviceYears) : 30,
      elDays: saved.elDays !== undefined ? Number(saved.elDays) : 300,
      scheme: saved.scheme || 'ops-ups',
      commutationPct: saved.commutationPct !== undefined ? Number(saved.commutationPct) : 40,
      retirementAge: saved.retirementAge || 60
    };

    function persistAndRender() {
      saveJson(PREFS_KEY, state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var calc = calculateRetirementCorpus(state);

      var card = el('div', 'cso-rcc-card');
      card.setAttribute('data-cso-retirement-corpus', '1');

      // Header
      var head = el('div', 'cso-rcc-head');
      var headCopy = el('div', 'cso-rcc-head-copy');
      headCopy.appendChild(el('div', 'cso-rcc-eyebrow', orMode
        ? '🏦 ଓଡ଼ିଶା ସରକାରୀ ଅବସରକାଳୀନ ସେଟଲମେଣ୍ଟ ଓ କର୍ପସ୍ କାଲକୁଲେଟର'
        : '🏦 ODISHA GOVT RETIREMENT SETTLEMENT & CORPUS CALCULATOR'));
      headCopy.appendChild(el('h2', 'cso-rcc-title', orMode
        ? 'ଅର୍ଜିତ ଛୁଟି (EL), ଗ୍ରାଚ୍ୟୁଇଟି (DCRG) ଓ ପେନସନ୍ କମ୍ୟୁଟେସନ୍ କାଲକୁଲେଟର'
        : 'Leave Encashment (300-Day EL), Gratuity (DCRG) & Commutation Calculator'));
      headCopy.appendChild(el('p', 'cso-rcc-sub', orMode
        ? 'ଅଧିକତମ 300 ଦିନ EL ଏନକ୍ୟାଶମେଣ୍ଟ (ଟ୍ୟାକ୍ସ-ମୁକ୍ତ), ₹25 ଲକ୍ଷ DCRG ସୀମା (DA ≥ 50%) ଓ 40% ପେନସନ୍ କମ୍ୟୁଟେସନ୍ (ଫ୍ୟାକ୍ଟର୍ 8.194) ଗଣନା କରନ୍ତୁ।'
        : 'Calculate 300-day EL encashment (100% tax-exempt u/s 10(10AA)), DCRG up to ₹25L (DA ≥ 50%), and 40% pension commutation lump-sum vs. monthly pension.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-rcc-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-rcc-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Quick ORSP Basic Presets
      var presets = el('div', 'cso-rcc-presets');
      ORSP_PRESETS.forEach(function (pr) {
        var b = el('button', 'cso-rcc-pill' + (state.lastBasic === pr.basic ? ' is-active' : ''), pr.label);
        b.type = 'button';
        b.addEventListener('click', function () { state.lastBasic = pr.basic; persistAndRender(); });
        presets.appendChild(b);
      });
      card.appendChild(presets);

      // Form
      var formGrid = el('div', 'cso-rcc-grid');
      function addField(label, ctrl) {
        var box = el('div', 'cso-rcc-field');
        var lbl = el('label', 'cso-rcc-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        formGrid.appendChild(box);
      }
      function makeNum(id, val, min, max, step, onChange) {
        var inp = el('input', 'cso-rcc-input');
        inp.id = id;
        inp.type = 'number';
        inp.min = String(min);
        inp.max = String(max);
        inp.step = String(step);
        inp.value = String(val);
        inp.addEventListener('change', function () { onChange(Number(inp.value) || 0); });
        return inp;
      }

      addField(orMode ? 'ଶେଷ ମୂଳ ବେତନ (Last Drawn Basic ₹)' : 'Last Drawn Basic Pay (₹)', makeNum('cso-rcc-basic', state.lastBasic, 10000, 300000, 100, function (v) { state.lastBasic = Math.max(10000, Math.round(v)); persistAndRender(); }));
      addField(orMode ? 'ମହଙ୍ଗା ଭତ୍ତା / DR (%)' : 'Dearness Allowance / Relief (%)', makeNum('cso-rcc-da', state.daRate, 0, 150, 1, function (v) { state.daRate = Math.max(0, v); persistAndRender(); }));
      addField(orMode ? 'ଯୋଗ୍ୟ ସେବା ବର୍ଷ (10–35)' : 'Qualifying Service Years (10–35)', makeNum('cso-rcc-yrs', state.serviceYears, 10, 35, 1, function (v) { state.serviceYears = Math.max(10, Math.min(35, v)); persistAndRender(); }));
      addField(orMode ? 'ସଞ୍ଚିତ ଅର୍ଜିତ ଛୁଟି (EL ଦିନ, ସର୍ବାଧିକ 300)' : 'Accumulated Earned Leave (Days, Max 300)', makeNum('cso-rcc-el', state.elDays, 0, 400, 1, function (v) { state.elDays = Math.max(0, Math.round(v)); persistAndRender(); }));

      var schSel = el('select', 'cso-rcc-input');
      schSel.id = 'cso-rcc-scheme';
      [
        { id: 'ops-ups', en: 'OPS / Unified Pension Scheme (UPS — 50% Assured)', or: 'OPS / ଏକୀକୃତ ପେନସନ୍ (UPS — 50% ନିଶ୍ଚିତ)' },
        { id: 'nps', en: 'NPS Corpus Mode (No Govt Commutation)', or: 'NPS କର୍ପସ୍ ମୋଡ୍' }
      ].forEach(function (s) {
        var opt = el('option', '', orMode ? s.or : s.en);
        opt.value = s.id;
        if (s.id === state.scheme) opt.selected = true;
        schSel.appendChild(opt);
      });
      schSel.addEventListener('change', function () { state.scheme = schSel.value; persistAndRender(); });
      addField(orMode ? 'ପେନସନ୍ ଯୋଜନା' : 'Pension Scheme', schSel);

      addField(orMode ? 'କମ୍ୟୁଟେସନ୍ ଶତକଡ଼ା (0%–40%)' : 'Commutation Percentage (0%–40%)', makeNum('cso-rcc-comm', state.commutationPct, 0, 40, 1, function (v) { state.commutationPct = Math.max(0, Math.min(40, v)); persistAndRender(); }));

      var ageSel = el('select', 'cso-rcc-input');
      ageSel.id = 'cso-rcc-age';
      [
        { val: 60, en: '60 Years — Odisha Govt Standard (Factor 8.194)', or: '60 ବର୍ଷ — ଓଡ଼ିଶା ସରକାରୀ ମାନକ (8.194)' },
        { val: 58, en: '58 Years — Voluntary / Early (Factor 8.371)', or: '58 ବର୍ଷ — ସ୍ୱେଚ୍ଛାକୃତ (8.371)' },
        { val: 62, en: '62 Years — Academic / Medical (Factor 7.991)', or: '62 ବର୍ଷ — ଶିକ୍ଷା / ମେଡିକାଲ୍ (7.991)' }
      ].forEach(function (a) {
        var opt = el('option', '', orMode ? a.or : a.en);
        opt.value = String(a.val);
        if (a.val === Number(state.retirementAge)) opt.selected = true;
        ageSel.appendChild(opt);
      });
      ageSel.addEventListener('change', function () { state.retirementAge = parseInt(ageSel.value, 10) || 60; persistAndRender(); });
      addField(orMode ? 'ଅବସର ବୟସ (କମ୍ୟୁଟେସନ୍ ଫ୍ୟାକ୍ଟର୍)' : 'Retirement Age (Commutation Factor)', ageSel);

      card.appendChild(formGrid);

      // KPI Strip
      var kpis = el('div', 'cso-rcc-kpis');
      [
        { lbl: orMode ? '💰 ମୋଟ ଏକକାଳୀନ ସେଟଲମେଣ୍ଟ' : '💰 Total Lump-Sum Settlement', val: fmtInr(calc.totalLumpSum), sub: 'EL + DCRG + Commutation (Tax-Exempt)', mod: ' cso-rcc-kpi--win' },
        { lbl: orMode ? '📅 EL ଏନକ୍ୟାଶମେଣ୍ଟ (' + calc.cappedElDays + ' ଦିନ)' : '📅 EL Encashment (' + calc.cappedElDays + ' Days)', val: fmtInr(calc.elEncashment), sub: 'u/s 10(10AA)(i) Tax-Free', mod: '' },
        { lbl: orMode ? '🏛️ ଗ୍ରାଚ୍ୟୁଇଟି (DCRG)' : '🏛️ Gratuity (DCRG)', val: fmtInr(calc.dcrgAmount), sub: (orMode ? 'ସୀମା: ' : 'Ceiling: ') + fmtInr(calc.dcrgCeiling), mod: '' },
        { lbl: orMode ? '🧾 ମାସିକ ପେନସନ୍ (ତୁରନ୍ତ / ପୂର୍ଣ୍ଣ)' : '🧾 Monthly Pension (Immediate / Full)', val: fmtInr(calc.monthlyPensionImmediate), sub: (orMode ? '15 ବର୍ଷ ପରେ ପୂର୍ଣ୍ଣ: ' : 'Full (after 15y): ') + fmtInr(calc.monthlyPensionFull), mod: '' }
      ].forEach(function (k) {
        var box = el('div', 'cso-rcc-kpi' + k.mod);
        box.appendChild(el('span', 'cso-rcc-kpi-lbl', k.lbl));
        box.appendChild(el('strong', 'cso-rcc-kpi-val', k.val));
        box.appendChild(el('span', 'cso-rcc-kpi-sub', k.sub));
        kpis.appendChild(box);
      });
      card.appendChild(kpis);

      // Discrete CSS Corpus Breakdown Bars
      var bars = el('div', 'cso-rcc-bars');
      [
        { lbl: (orMode ? 'EL ଏନକ୍ୟାଶମେଣ୍ଟ: ' : 'Earned Leave Encashment: ') + fmtInr(calc.elEncashment), step: calc.elBarStep, cls: 'cso-rcc-fill--el' },
        { lbl: (orMode ? 'DCRG ଗ୍ରାଚ୍ୟୁଇଟି: ' : 'DCRG Gratuity: ') + fmtInr(calc.dcrgAmount), step: calc.dcrgBarStep, cls: 'cso-rcc-fill--dcrg' },
        { lbl: (orMode ? 'ପେନସନ୍ କମ୍ୟୁଟେସନ୍ ଏକକାଳୀନ (' + calc.commutationPct + '%): ' : 'Commutation Lump-Sum (' + calc.commutationPct + '%): ') + fmtInr(calc.commutationLumpSum), step: calc.commBarStep, cls: 'cso-rcc-fill--comm' }
      ].forEach(function (b) {
        var r = el('div', 'cso-rcc-bar-row');
        r.appendChild(el('div', 'cso-rcc-bar-lbl', b.lbl));
        var trk = el('div', 'cso-rcc-bar-track');
        trk.appendChild(el('div', 'cso-rcc-bar-fill ' + b.cls + ' cso-vfv-bar--w' + b.step));
        r.appendChild(trk);
        bars.appendChild(r);
      });
      card.appendChild(bars);

      // Detailed Settlement Breakdown Table
      var tblWrap = el('div', 'cso-rcc-table-wrap');
      var tbl = el('table', 'cso-rcc-table');
      var thead = el('thead');
      var htr = el('tr');
      [orMode ? 'ଅବସରକାଳୀନ ବିବରଣୀ' : 'Retirement Settlement Component', orMode ? 'ନିୟମ / ସୂତ୍ର' : 'Odisha OCS Rule / Formula', orMode ? 'ରାଶି (₹)' : 'Estimated Amount'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      [
        ['Last Drawn Emoluments (Basic + ' + calc.daRate + '% DA)', fmtInr(calc.lastBasic) + ' + ' + fmtInr(calc.daAmount), fmtInr(calc.emoluments) + '/mo'],
        ['Earned Leave (EL) Encashment', calc.cappedElDays + ' days × (Emoluments / 30) · Tax-Free u/s 10(10AA)', fmtInr(calc.elEncashment)],
        ['Death-cum-Retirement Gratuity (DCRG)', calc.sixMonthlyPeriods + '/4 × Emoluments (Cap ' + fmtInr(calc.dcrgCeiling) + ') · Tax-Free u/s 10(10)', fmtInr(calc.dcrgAmount)],
        ['Pension Commutation Lump-Sum (' + calc.commutationPct + '%)', fmtInr(calc.commutedMonthly) + ' × 12 × ' + calc.commutationFactor + ' (Restored after 15 yrs)', fmtInr(calc.commutationLumpSum)],
        ['Total Tax-Free Lump-Sum Retirement Corpus', 'EL + DCRG + Commutation', fmtInr(calc.totalLumpSum)],
        ['Immediate Post-Retirement Monthly Pension', '(' + fmtInr(calc.basicPension) + ' - ' + fmtInr(calc.commutedMonthly) + ') + DR on 100% Basic (' + fmtInr(calc.drAmount) + ')', fmtInr(calc.monthlyPensionImmediate) + '/mo'],
        ['Full Restored Monthly Pension (After 15 Years)', 'Full Basic Pension + ' + calc.daRate + '% DR', fmtInr(calc.monthlyPensionFull) + '/mo']
      ].forEach(function (row, idx) {
        var tr = el('tr', idx === 4 ? 'cso-rcc-row-hi' : '');
        tr.appendChild(el('td', '', row[0]));
        tr.appendChild(el('td', '', row[1]));
        tr.appendChild(el('td', '', row[2]));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tblWrap.appendChild(tbl);
      card.appendChild(tblWrap);

      // Actions
      var actions = el('div', 'cso-rcc-actions');
      var statusEl = el('span', 'cso-rcc-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-rcc-btn cso-rcc-btn--primary', orMode ? '📋 ଅବସରକାଳୀନ ସାରାଂଶ କପି କରନ୍ତୁ' : '📋 Copy Retirement Settlement Summary');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var text = [
          'CS Odisha — Odisha Govt Retirement Settlement & Corpus Estimate',
          'Last Basic: ' + fmtInr(calc.lastBasic) + ' | DA: ' + calc.daRate + '% | Service: ' + calc.serviceYears + ' yrs | Age: ' + calc.retirementAge,
          'EL Encashment (' + calc.cappedElDays + ' days): ' + fmtInr(calc.elEncashment),
          'DCRG Gratuity (Cap ' + fmtInr(calc.dcrgCeiling) + '): ' + fmtInr(calc.dcrgAmount),
          'Commutation Lump-Sum (' + calc.commutationPct + '% @ ' + calc.commutationFactor + '): ' + fmtInr(calc.commutationLumpSum),
          'Total Lump-Sum Settlement: ' + fmtInr(calc.totalLumpSum),
          'Immediate Monthly Pension: ' + fmtInr(calc.monthlyPensionImmediate) + '/mo | Full Restored (15y): ' + fmtInr(calc.monthlyPensionFull) + '/mo',
          'Calculate yours: https://csodisha.com/career-paths/#cso-retirement-corpus-root'
        ].join('\n');
        copyText(text).then(function () {
          statusEl.textContent = orMode ? '✅ ସାରାଂଶ କପି ହୋଇଗଲା!' : '✅ Retirement settlement copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-rcc-btn', orMode ? '🖨️ ଅବସରକାଳୀନ ଡୋସିଅର୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Retirement Corpus Dossier');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(statusEl);
      card.appendChild(actions);

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
    ORSP_PREFS_KEY: ORSP_PREFS_KEY,
    COMMUTATION_FACTORS: COMMUTATION_FACTORS,
    ORSP_PRESETS: ORSP_PRESETS,
    calculateRetirementCorpus: calculateRetirementCorpus,
    mount: mount
  };
});
