/**
 * Common Sense Odisha — Interactive Odisha Govt Pay Matrix & In-Hand Salary Estimator (v405)
 * Complete ORSP 2017 / 7th Pay Commission Pay Matrix (Level 1 to Level 17, Cells 1 to 15),
 * Odisha DA (63% default), Odisha HRA slabs (16% / 12% / 8% / 4% / 0%) + Central CPC (30% / 20% / 10%),
 * NPS (10% emp + 14% govt info) vs GPF, post-April 2026 ₹0 Professional Tax default (+ legacy compare),
 * 5-year 3% increment projection, and 1-click Copy Salary Breakdown.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOOrspSalaryEstimator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOOrspSalaryEstimator = api;
})(function (win, doc) {
  'use strict';

  var ORSP_LEVELS = [
    { level: 1, entryBasic: 16600, gradePay: 1700, labelEn: 'Level 1 (₹16,600) — Group-D / Peon', labelOr: 'ସ୍ତର-୧ (₹୧୬,୬୦୦) — ଗ୍ରୁପ୍-ଡି' },
    { level: 2, entryBasic: 17200, gradePay: 1750, labelEn: 'Level 2 (₹17,200) — Attendant / Helper', labelOr: 'ସ୍ତର-୨ (₹୧୭,୨୦୦)' },
    { level: 3, entryBasic: 18000, gradePay: 1800, labelEn: 'Level 3 (₹18,000) — Multi-Tasking / Guard', labelOr: 'ସ୍ତର-୩ (₹୧୮,୦୦୦)' },
    { level: 4, entryBasic: 19900, gradePay: 1900, labelEn: 'Level 4 (₹19,900) — Junior Assistant / PEO / Amin', labelOr: 'ସ୍ତର-୪ (₹୧୯,୯୦୦) — କନିଷ୍ଠ ସହାୟକ / PEO' },
    { level: 5, entryBasic: 21700, gradePay: 2000, labelEn: 'Level 5 (₹21,700) — Constable / Forest Guard', labelOr: 'ସ୍ତର-୫ (₹୨୧,୭୦୦) — କନଷ୍ଟେବଲ୍' },
    { level: 6, entryBasic: 23600, gradePay: 2200, labelEn: 'Level 6 (₹23,600) — Senior Clerk / Technician', labelOr: 'ସ୍ତର-୬ (₹୨୩,୬୦୦)' },
    { level: 7, entryBasic: 25500, gradePay: 2400, labelEn: 'Level 7 (₹25,500) — Revenue Inspector (RI) / Nurse', labelOr: 'ସ୍ତର-୭ (₹୨୫,୫୦୦) — ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI)' },
    { level: 8, entryBasic: 29200, gradePay: 2800, labelEn: 'Level 8 (₹29,200) — Assistant Section Officer (Entry)', labelOr: 'ସ୍ତର-୮ (₹୨୯,୨୦୦)' },
    { level: 9, entryBasic: 35400, gradePay: 4200, labelEn: 'Level 9 (₹35,400) — TGT Teacher / OSSC CGL / SI Police', labelOr: 'ସ୍ତର-୯ (₹୩୫,୪୦୦) — TGT ଶିକ୍ଷକ / OSSC CGL' },
    { level: 10, entryBasic: 44900, gradePay: 4600, labelEn: 'Level 10 (₹44,900) — PGT / OAVS / ASO / Lecturer', labelOr: 'ସ୍ତର-୧୦ (₹୪୪,୯୦୦) — PGT / OAVS / ASO' },
    { level: 11, entryBasic: 47600, gradePay: 4800, labelEn: 'Level 11 (₹47,600) — Assistant Professor / Senior Officer', labelOr: 'ସ୍ତର-୧୧ (₹୪୭,୬୦୦) — ସହକାରୀ ପ୍ରଫେସର' },
    { level: 12, entryBasic: 56100, gradePay: 5400, labelEn: 'Level 12 (₹56,100) — OAS / OFS / OPS Group-A', labelOr: 'ସ୍ତର-୧୨ (₹୫୬,୧୦୦) — OAS / OFS / OPS' },
    { level: 13, entryBasic: 67700, gradePay: 6600, labelEn: 'Level 13 (₹67,700) — Senior Scale Group-A', labelOr: 'ସ୍ତର-୧୩ (₹୬୭,୭୦୦)' },
    { level: 14, entryBasic: 78800, gradePay: 7600, labelEn: 'Level 14 (₹78,800) — Deputy Secretary / Joint Director', labelOr: 'ସ୍ତର-୧୪ (₹୭୮,୮୦୦)' },
    { level: 15, entryBasic: 123100, gradePay: 8700, labelEn: 'Level 15 (₹1,23,100) — Additional Secretary / Director', labelOr: 'ସ୍ତର-୧୫ (₹୧,୨୩,୧୦୦)' },
    { level: 16, entryBasic: 127100, gradePay: 8800, labelEn: 'Level 16 (₹1,27,100) — Special Secretary', labelOr: 'ସ୍ତର-୧୬ (₹୧,୨୭,୧୦୦)' },
    { level: 17, entryBasic: 135100, gradePay: 9000, labelEn: 'Level 17 (₹1,35,100) — Senior Administrative Grade', labelOr: 'ସ୍ତର-୧୭ (₹୧,୩୫,୧୦୦)' }
  ];

  var POST_PRESETS = [
    { id: 'group-d', label: 'Group-D / Peon (L-1)', level: 1, hra: 16, regime: 'odisha' },
    { id: 'ja-peo', label: 'Junior Asst / PEO / Amin (L-4)', level: 4, hra: 12, regime: 'odisha' },
    { id: 'ri-ari', label: 'Revenue Inspector / RI (L-7)', level: 7, hra: 12, regime: 'odisha' },
    { id: 'tgt-cgl', label: 'TGT Teacher / OSSC CGL (L-9)', level: 9, hra: 16, regime: 'odisha' },
    { id: 'pgt-oavs', label: 'PGT / OAVS / ASO (L-10)', level: 10, hra: 16, regime: 'odisha' },
    { id: 'asst-prof', label: 'Asst Professor / Academic (L-11)', level: 11, hra: 16, regime: 'odisha' },
    { id: 'oas-ofs', label: 'OAS / OFS Group-A (L-12)', level: 12, hra: 16, regime: 'odisha' }
  ];

  var ODISHA_HRA_SLABS = [
    { rate: 16, en: '16% — Municipal Corporations (BBSR, Cuttack, Berhampur, Rourkela, Sambalpur)', or: '୧୬% — ମହାନଗର ନିଗମ (ଭୁବନେଶ୍ୱର, କଟକ, ବ୍ରହ୍ମପୁର, ରାଉରକେଲା, ସମ୍ବଲପୁର)' },
    { rate: 12, en: '12% — Major District HQs & Municipalities (Balasore, Puri, Baripada, Bhawanipatna…)', or: '୧୨% — ପ୍ରମୁଖ ଜିଲ୍ଲା ସଦର ମହକୁମା ଓ ପୌରପାଳିକା' },
    { rate: 8, en: '8% — Other Municipalities / NACs', or: '୮% — ଅନ୍ୟାନ୍ୟ ପୌରପାଳିକା / NAC' },
    { rate: 4, en: '4% — Rural / Block / Panchayat Areas', or: '୪% — ଗ୍ରାମାଞ୍ଚଳ / ବ୍ଲକ୍ / ପଞ୍ଚାୟତ' },
    { rate: 0, en: '0% — Govt Quarters Allotted', or: '୦% — ସରକାରୀ କ୍ୱାର୍ଟର୍ସ ଆବଣ୍ଟିତ' }
  ];

  var CENTRAL_HRA_SLABS = [
    { rate: 30, en: '30% — Central X-Class Metro (Delhi, Mumbai, Bengaluru…)', or: '୩୦% — କେନ୍ଦ୍ରୀୟ X-ଶ୍ରେଣୀ ମେଟ୍ରୋ' },
    { rate: 20, en: '20% — Central Y-Class City (Bhubaneswar, Cuttack, Rourkela…)', or: '୨୦% — କେନ୍ଦ୍ରୀୟ Y-ଶ୍ରେଣୀ ସହର (ଭୁବନେଶ୍ୱର, କଟକ…)' },
    { rate: 10, en: '10% — Central Z-Class Town / Rural', or: '୧୦% — କେନ୍ଦ୍ରୀୟ Z-ଶ୍ରେଣୀ ସହର / ଗ୍ରାମାଞ୍ଚଳ' },
    { rate: 0, en: '0% — Govt Quarters Allotted', or: '୦% — ସରକାରୀ କ୍ୱାର୍ଟର୍ସ' }
  ];

  function getLevelMeta(level) {
    var lv = Math.max(1, Math.min(17, parseInt(level, 10) || 9));
    for (var i = 0; i < ORSP_LEVELS.length; i += 1) {
      if (ORSP_LEVELS[i].level === lv) return ORSP_LEVELS[i];
    }
    return ORSP_LEVELS[8];
  }

  function getCellBasicPay(level, cell) {
    var meta = getLevelMeta(level);
    var c = Math.max(1, Math.min(15, parseInt(cell, 10) || 1));
    var pay = meta.entryBasic;
    for (var step = 2; step <= c; step += 1) {
      pay = Math.round((pay * 1.03) / 100) * 100;
    }
    return pay;
  }

  function quantizePct(pct) {
    var clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    var step = Math.round(clamped / 5) * 5;
    if (clamped > 0 && step === 0) step = 5;
    return step;
  }

  function calculateOrspSalary(params) {
    var p = params || {};
    var level = Math.max(1, Math.min(17, parseInt(p.level, 10) || 9));
    var cell = Math.max(1, Math.min(15, parseInt(p.cell, 10) || 1));
    var customBasic = Number(p.customBasic || 0);
    var basic = (isFinite(customBasic) && customBasic > 0) ? Math.round(customBasic) : getCellBasicPay(level, cell);

    var daRate = p.daRate !== undefined && p.daRate !== '' ? Number(p.daRate) : 63;
    if (!isFinite(daRate) || daRate < 0) daRate = 63;
    var hraRate = p.hraRate !== undefined && p.hraRate !== '' ? Number(p.hraRate) : 16;
    if (!isFinite(hraRate) || hraRate < 0) hraRate = 16;

    var otherAllowances = Math.max(0, Math.round(Number(p.otherAllowances || 0) || 0));
    var da = Math.round((basic * daRate) / 100);
    var hra = Math.round((basic * hraRate) / 100);
    var grossMonthly = basic + da + hra + otherAllowances;

    var scheme = String(p.scheme || 'nps').toLowerCase() === 'gpf' ? 'gpf' : 'nps';
    var gpfRate = p.gpfRate !== undefined && p.gpfRate !== '' ? Number(p.gpfRate) : 10;
    if (!isFinite(gpfRate) || gpfRate < 0) gpfRate = 10;

    var retirementEmployee = scheme === 'nps'
      ? Math.round((basic + da) * 0.10)
      : Math.round((basic * gpfRate) / 100);
    var npsEmployerGovt = scheme === 'nps' ? Math.round((basic + da) * 0.14) : 0;

    // Odisha abolished Professional Tax effective April 1, 2026 (default ₹0).
    // Optional legacy compare applies pre-April 2026 slabs (₹125 / ₹200).
    var legacyPt = Boolean(p.legacyPt);
    var professionalTax = 0;
    if (legacyPt) {
      if (grossMonthly > 25000) professionalTax = 200;
      else if (grossMonthly >= 13304) professionalTax = 125;
    }

    var otherDeductions = Math.max(0, Math.round(Number(p.otherDeductions || 0) || 0));
    var totalDeductions = retirementEmployee + professionalTax + otherDeductions;
    var netMonthly = Math.max(0, grossMonthly - totalDeductions);
    var annualGross = grossMonthly * 12;
    var annualNet = netMonthly * 12;

    var netSharePct = grossMonthly > 0 ? Math.round((netMonthly / grossMonthly) * 100) : 0;
    var dedSharePct = Math.max(0, 100 - netSharePct);

    return {
      level: level,
      cell: cell,
      basic: basic,
      da_rate: daRate,
      da: da,
      hra_rate: hraRate,
      hra: hra,
      other_allowances: otherAllowances,
      gross_monthly: grossMonthly,
      scheme: scheme,
      gpf_rate: gpfRate,
      retirement_employee: retirementEmployee,
      nps_employer_govt: npsEmployerGovt,
      professional_tax: professionalTax,
      legacy_pt: legacyPt,
      other_deductions: otherDeductions,
      total_deductions: totalDeductions,
      net_monthly: netMonthly,
      annual_gross: annualGross,
      annual_net: annualNet,
      net_share_step: quantizePct(netSharePct),
      ded_share_step: quantizePct(dedSharePct)
    };
  }

  function computeFiveYearProjection(params) {
    var p = params || {};
    var baseCell = Math.max(1, Math.min(15, parseInt(p.cell, 10) || 1));
    var rows = [];
    for (var y = 0; y < 5; y += 1) {
      var c = Math.min(15, baseCell + y);
      var calc = calculateOrspSalary(Object.assign({}, p, { cell: c, customBasic: 0 }));
      rows.push({
        year: y + 1,
        cell: c,
        basic: calc.basic,
        gross_monthly: calc.gross_monthly,
        total_deductions: calc.total_deductions,
        net_monthly: calc.net_monthly
      });
    }
    return rows;
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
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
    var initLevel = 9;
    try {
      var u = new URL(win.location.href);
      var lvParam = parseInt(u.searchParams.get('level') || '', 10);
      if (lvParam >= 1 && lvParam <= 17) initLevel = lvParam;
    } catch (_) {}

    var state = {
      lang: 'en',
      regime: 'odisha',
      level: initLevel,
      cell: 1,
      customBasic: '',
      daRate: 63,
      hraRate: 16,
      otherAllowances: 0,
      scheme: 'nps',
      gpfRate: 10,
      legacyPt: false,
      otherDeductions: 0
    };

    function render() {
      var orMode = state.lang === 'or';
      var calc = calculateOrspSalary(state);
      var proj = computeFiveYearProjection(state);
      var hraSlabs = state.regime === 'central' ? CENTRAL_HRA_SLABS : ODISHA_HRA_SLABS;

      var wrap = el('div', 'cso-orsp-card');
      wrap.setAttribute('data-cso-orsp-estimator', '1');

      // Header
      var head = el('div', 'cso-orsp-head');
      var headCopy = el('div', 'cso-orsp-head-copy');
      headCopy.appendChild(el('div', 'cso-orsp-eyebrow', orMode
        ? '💰 ORSP ସପ୍ତମ ବେତନ କମିଶନ (ସ୍ତର-୧ ରୁ ସ୍ତର-୧୭)'
        : '💰 ORSP 7TH PAY COMMISSION MATRIX (LEVEL 1 TO LEVEL 17)'));
      headCopy.appendChild(el('h2', 'cso-orsp-title', orMode
        ? 'ଓଡ଼ିଶା ସରକାରୀ ବେତନ ଓ ଇନ୍-ହ୍ୟାଣ୍ଡ ସାଲାରୀ କାଲକୁଲେଟର'
        : 'Odisha Govt Pay Matrix & In-Hand Salary Estimator'));
      headCopy.appendChild(el('p', 'cso-orsp-sub', orMode
        ? '63% DA, ଓଡ଼ିଶା HRA ସ୍ଲାବ୍ (16%/12%/8%/4%), NPS/GPF ଓ ଏପ୍ରିଲ୍ ୨୦୨୬ ପରେ ₹0 ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ ସହିତ ସଠିକ୍ ମାସିକ ଦରମା ଗଣନା କରନ୍ତୁ।'
        : 'Calculate exact monthly & annual take-home pay with 63% DA, Odisha HRA slabs (16%/12%/8%/4%), NPS/GPF & ₹0 post-April 2026 Professional Tax.'));
      head.appendChild(headCopy);

      var headCtl = el('div', 'cso-orsp-head-ctl');
      var langToggle = el('div', 'cso-orsp-lang-toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-orsp-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; render(); });
        langToggle.appendChild(lb);
      });
      headCtl.appendChild(langToggle);

      var copyBtn = el('button', 'cso-orsp-btn cso-orsp-btn--primary', orMode ? '📋 ସାଲାରୀ ବିବରଣୀ କପି କରନ୍ତୁ' : '📋 Copy Salary Breakdown');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var text = [
          'CS Odisha ORSP 7th Pay Salary Estimate (Level ' + calc.level + ', Cell ' + calc.cell + ')',
          'Basic Pay: ' + fmtInr(calc.basic),
          'DA (' + calc.da_rate + '%): ' + fmtInr(calc.da),
          'HRA (' + calc.hra_rate + '%): ' + fmtInr(calc.hra),
          (calc.other_allowances ? ('Other Allowances: ' + fmtInr(calc.other_allowances)) : ''),
          'Gross Monthly: ' + fmtInr(calc.gross_monthly),
          'Deductions (' + calc.scheme.toUpperCase() + ' + PT + Other): -' + fmtInr(calc.total_deductions),
          'Net In-Hand Monthly: ' + fmtInr(calc.net_monthly),
          'Annual Net Package: ' + fmtInr(calc.annual_net),
          'Calculate yours: https://csodisha.com/career-paths/?level=' + calc.level
        ].filter(Boolean).join('\n');
        var orig = copyBtn.textContent;
        copyText(text).then(function () {
          copyBtn.textContent = '✅ Copied!';
          setTimeout(function () { copyBtn.textContent = orig; }, 2200);
        });
      });
      headCtl.appendChild(copyBtn);
      head.appendChild(headCtl);
      wrap.appendChild(head);

      // Quick Post Presets
      var presetsRow = el('div', 'cso-orsp-presets');
      presetsRow.setAttribute('role', 'group');
      presetsRow.setAttribute('aria-label', 'Popular Odisha recruitment post presets');
      POST_PRESETS.forEach(function (pr) {
        var act = state.level === pr.level && !state.customBasic;
        var pb = el('button', 'cso-orsp-pill' + (act ? ' is-active' : ''), pr.label);
        pb.type = 'button';
        pb.addEventListener('click', function () {
          state.level = pr.level;
          state.cell = 1;
          state.customBasic = '';
          state.regime = pr.regime;
          state.hraRate = pr.hra;
          render();
        });
        presetsRow.appendChild(pb);
      });
      wrap.appendChild(presetsRow);

      // Form Grid
      var formGrid = el('div', 'cso-orsp-form-grid');

      // 1. Pay Level
      var fLevel = el('label', 'cso-orsp-field');
      fLevel.appendChild(el('span', 'cso-orsp-label', orMode ? '୧. ORSP ବେତନ ସ୍ତର (Level 1–17)' : '1. ORSP Pay Level (Level 1–17)'));
      var lvSel = el('select', 'cso-orsp-select');
      ORSP_LEVELS.forEach(function (lv) {
        var o = el('option', '', orMode ? lv.labelOr : lv.labelEn);
        o.value = String(lv.level);
        if (lv.level === state.level) o.selected = true;
        lvSel.appendChild(o);
      });
      lvSel.addEventListener('change', function () {
        state.level = parseInt(lvSel.value, 10) || 9;
        state.customBasic = '';
        render();
      });
      fLevel.appendChild(lvSel);
      formGrid.appendChild(fLevel);

      // 2. Pay Matrix Cell (1-15)
      var fCell = el('label', 'cso-orsp-field');
      fCell.appendChild(el('span', 'cso-orsp-label', orMode ? '୨. ପେ ମ୍ୟାଟ୍ରିକ୍ସ ସେଲ୍ / ସେବା ବର୍ଷ' : '2. Matrix Cell / Service Year (1–15)'));
      var cellSel = el('select', 'cso-orsp-select');
      for (var ci = 1; ci <= 15; ci += 1) {
        var co = el('option', '', 'Cell ' + ci + ' — ' + fmtInr(getCellBasicPay(state.level, ci)));
        co.value = String(ci);
        if (ci === state.cell) co.selected = true;
        cellSel.appendChild(co);
      }
      cellSel.addEventListener('change', function () {
        state.cell = parseInt(cellSel.value, 10) || 1;
        state.customBasic = '';
        render();
      });
      fCell.appendChild(cellSel);
      formGrid.appendChild(fCell);

      // 3. Custom Basic Pay Override
      var fCustom = el('label', 'cso-orsp-field');
      fCustom.appendChild(el('span', 'cso-orsp-label', orMode ? '୩. କଷ୍ଟମ୍ ବେସିକ୍ ପେ (ଇଚ୍ଛାଧୀନ)' : '3. Custom Basic Pay (Optional ₹)'));
      var custInp = el('input', 'cso-orsp-input');
      custInp.type = 'number';
      custInp.min = '0';
      custInp.step = '100';
      custInp.placeholder = String(getCellBasicPay(state.level, state.cell));
      custInp.value = state.customBasic;
      custInp.addEventListener('change', function () {
        state.customBasic = custInp.value;
        render();
      });
      fCustom.appendChild(custInp);
      formGrid.appendChild(fCustom);

      // 4. DA %
      var fDa = el('div', 'cso-orsp-field');
      fDa.appendChild(el('span', 'cso-orsp-label', orMode ? '୪. ମହଙ୍ଗା ଭତ୍ତା (DA %)' : '4. Dearness Allowance (DA %)'));
      var daRow = el('div', 'cso-orsp-inline');
      var daInp = el('input', 'cso-orsp-input cso-orsp-input--sm');
      daInp.type = 'number';
      daInp.min = '0';
      daInp.max = '150';
      daInp.value = String(state.daRate);
      daInp.setAttribute('aria-label', 'DA percentage');
      daInp.addEventListener('change', function () {
        state.daRate = Number(daInp.value) || 0;
        render();
      });
      daRow.appendChild(daInp);
      [63, 58, 55].forEach(function (rate) {
        var db = el('button', 'cso-orsp-mini-pill' + (state.daRate === rate ? ' is-active' : ''), rate + '%' + (rate === 63 ? ' Current' : ''));
        db.type = 'button';
        db.addEventListener('click', function () { state.daRate = rate; render(); });
        daRow.appendChild(db);
      });
      fDa.appendChild(daRow);
      formGrid.appendChild(fDa);

      // 5. HRA Regime & City Slab
      var fHra = el('div', 'cso-orsp-field cso-orsp-field--wide');
      var hraHead = el('div', 'cso-orsp-inline-head');
      hraHead.appendChild(el('span', 'cso-orsp-label', orMode ? '୫. ସହର / ପୋଷ୍ଟିଂ HRA ସ୍ଲାବ୍' : '5. City / Posting HRA Slab'));
      var regToggle = el('div', 'cso-orsp-inline');
      [['odisha', 'Odisha ORSP'], ['central', 'Central CPC (X/Y/Z)']].forEach(function (pair) {
        var rb = el('button', 'cso-orsp-mini-pill' + (state.regime === pair[0] ? ' is-active' : ''), pair[1]);
        rb.type = 'button';
        rb.addEventListener('click', function () {
          state.regime = pair[0];
          state.hraRate = pair[0] === 'central' ? 20 : 16;
          if (pair[0] === 'central' && state.otherAllowances === 0) state.otherAllowances = 3600;
          if (pair[0] === 'odisha' && state.otherAllowances === 3600) state.otherAllowances = 0;
          render();
        });
        regToggle.appendChild(rb);
      });
      hraHead.appendChild(regToggle);
      fHra.appendChild(hraHead);

      var hraSel = el('select', 'cso-orsp-select');
      hraSel.setAttribute('aria-label', 'Select HRA slab');
      hraSlabs.forEach(function (sl) {
        var ho = el('option', '', orMode ? sl.or : sl.en);
        ho.value = String(sl.rate);
        if (sl.rate === state.hraRate) ho.selected = true;
        hraSel.appendChild(ho);
      });
      hraSel.addEventListener('change', function () {
        state.hraRate = Number(hraSel.value) || 0;
        render();
      });
      fHra.appendChild(hraSel);
      formGrid.appendChild(fHra);

      // 6. Retirement Scheme (NPS vs GPF)
      var fRet = el('div', 'cso-orsp-field');
      fRet.appendChild(el('span', 'cso-orsp-label', orMode ? '୬. ଅବସର ଯୋଜନା (NPS / GPF)' : '6. Retirement Deduction (NPS / GPF)'));
      var retRow = el('div', 'cso-orsp-inline');
      [['nps', 'NPS (10% Basic+DA)'], ['gpf', 'GPF / OPS']].forEach(function (pair) {
        var sb = el('button', 'cso-orsp-mini-pill' + (state.scheme === pair[0] ? ' is-active' : ''), pair[1]);
        sb.type = 'button';
        sb.addEventListener('click', function () { state.scheme = pair[0]; render(); });
        retRow.appendChild(sb);
      });
      if (state.scheme === 'gpf') {
        var gpfInp = el('input', 'cso-orsp-input cso-orsp-input--sm');
        gpfInp.type = 'number';
        gpfInp.min = '0';
        gpfInp.max = '50';
        gpfInp.value = String(state.gpfRate);
        gpfInp.setAttribute('aria-label', 'GPF percentage');
        gpfInp.addEventListener('change', function () { state.gpfRate = Number(gpfInp.value) || 0; render(); });
        retRow.appendChild(gpfInp);
      }
      fRet.appendChild(retRow);
      formGrid.appendChild(fRet);

      // 7. Other Allowances & Deductions + Post-April 2026 PT Toggle
      var fAllow = el('label', 'cso-orsp-field');
      fAllow.appendChild(el('span', 'cso-orsp-label', orMode ? '୭. ଅନ୍ୟାନ୍ୟ ଭତ୍ତା (TA / Medical ₹)' : '7. Transport / Special Allowance (₹)'));
      var allowInp = el('input', 'cso-orsp-input');
      allowInp.type = 'number';
      allowInp.min = '0';
      allowInp.value = String(state.otherAllowances);
      allowInp.addEventListener('change', function () { state.otherAllowances = Number(allowInp.value) || 0; render(); });
      fAllow.appendChild(allowInp);
      formGrid.appendChild(fAllow);

      var fDed = el('label', 'cso-orsp-field');
      fDed.appendChild(el('span', 'cso-orsp-label', orMode ? '୮. ଅନ୍ୟାନ୍ୟ କଟୌତି (GIS / TDS ₹)' : '8. GIS / Income Tax TDS (₹)'));
      var dedInp = el('input', 'cso-orsp-input');
      dedInp.type = 'number';
      dedInp.min = '0';
      dedInp.value = String(state.otherDeductions);
      dedInp.addEventListener('change', function () { state.otherDeductions = Number(dedInp.value) || 0; render(); });
      fDed.appendChild(dedInp);
      formGrid.appendChild(fDed);

      wrap.appendChild(formGrid);

      // Professional Tax note & legacy compare toggle
      var ptRow = el('label', 'cso-orsp-pt-toggle');
      var ptChk = doc.createElement('input');
      ptChk.type = 'checkbox';
      ptChk.className = 'cso-orsp-check';
      ptChk.checked = state.legacyPt;
      ptChk.addEventListener('change', function () { state.legacyPt = ptChk.checked; render(); });
      ptRow.append(ptChk, el('span', '', orMode
        ? 'ପୁରୁଣା ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ (₹125/₹200) ତୁଳନା କରନ୍ତୁ (ଏପ୍ରିଲ୍ ୧, ୨୦୨୬ ରୁ ଓଡ଼ିଶାରେ PT ₹0)'
        : 'Compare legacy pre-April 2026 Professional Tax (₹125 / ₹200) — Default is ₹0 (Abolished in Odisha w.e.f. April 1, 2026)'));
      wrap.appendChild(ptRow);

      // KPI Summary Cards
      var kpiGrid = el('div', 'cso-orsp-kpis');
      var kpis = [
        { k: orMode ? 'ମୋଟ ମାସିକ ଦରମା (Gross)' : 'Gross Monthly Salary', v: fmtInr(calc.gross_monthly), cls: '' },
        { k: orMode ? 'ମୋଟ କଟୌତି (Deductions)' : 'Total Monthly Deductions', v: '−' + fmtInr(calc.total_deductions), cls: 'is-warn' },
        { k: orMode ? 'ମାସିକ ଇନ୍-ହ୍ୟାଣ୍ଡ ଦରମା' : 'Net In-Hand Monthly', v: fmtInr(calc.net_monthly), cls: 'is-accent' },
        { k: orMode ? 'ବାର୍ଷିକ ନେଟ୍ ପ୍ୟାକେଜ୍' : 'Annual Net Package', v: fmtInr(calc.annual_net), cls: 'is-ok' }
      ];
      kpis.forEach(function (kp) {
        var kc = el('div', 'cso-orsp-kpi ' + kp.cls);
        kc.appendChild(el('span', 'cso-orsp-kpi-k', kp.k));
        kc.appendChild(el('b', 'cso-orsp-kpi-v', kp.v));
        kpiGrid.appendChild(kc);
      });
      wrap.appendChild(kpiGrid);

      // Discrete CSS-class proportion bar (Zero inline styles)
      var barWrap = el('div', 'cso-orsp-bar-wrap');
      var barTrack = el('div', 'cso-orsp-bar-track');
      barTrack.appendChild(el('div', 'cso-orsp-bar-net cso-vfv-bar--w' + calc.net_share_step));
      barWrap.appendChild(barTrack);
      var barLeg = el('div', 'cso-orsp-bar-legend');
      barLeg.appendChild(el('span', '', '🟢 In-Hand Take-Home: ' + Math.round((calc.net_monthly / Math.max(1, calc.gross_monthly)) * 100) + '%'));
      if (calc.nps_employer_govt > 0) {
        barLeg.appendChild(el('span', '', '🏛️ +14% Govt Employer NPS Perk: ' + fmtInr(calc.nps_employer_govt) + '/mo (Extra Retirement Corpus)'));
      }
      barWrap.appendChild(barLeg);
      wrap.appendChild(barWrap);

      // Itemized Earnings vs Deductions Ledger + 5-Year Progression
      var tablesGrid = el('div', 'cso-orsp-tables');

      var ledgerBox = el('div', 'cso-orsp-box');
      ledgerBox.appendChild(el('h3', 'cso-orsp-box-title', orMode ? '📑 ଆୟ ଓ କଟୌତି ବିବରଣୀ' : '📑 Itemized Earnings & Deductions'));
      var tbl = el('table', 'cso-orsp-table');
      var tbody = doc.createElement('tbody');
      [
        ['Basic Pay (Level ' + calc.level + ', Cell ' + calc.cell + ')', fmtInr(calc.basic)],
        ['Dearness Allowance (' + calc.da_rate + '%)', fmtInr(calc.da)],
        ['House Rent Allowance (' + calc.hra_rate + '%)', fmtInr(calc.hra)],
        ['Transport / Special Allowance', fmtInr(calc.other_allowances)],
        ['Gross Monthly Earnings', fmtInr(calc.gross_monthly)],
        [calc.scheme === 'nps' ? 'NPS Employee (10% of Basic + DA)' : ('GPF / OPS (' + calc.gpf_rate + '% of Basic)'), '−' + fmtInr(calc.retirement_employee)],
        ['Professional Tax (Odisha)', calc.professional_tax ? ('−' + fmtInr(calc.professional_tax)) : '₹0 (Exempt / Abolished)'],
        ['Other Deductions (GIS / TDS)', calc.other_deductions ? ('−' + fmtInr(calc.other_deductions)) : '₹0'],
        ['Net In-Hand Monthly Take-Home', fmtInr(calc.net_monthly)]
      ].forEach(function (pair, idx) {
        var tr = doc.createElement('tr');
        if (idx === 4 || idx === 8) tr.className = 'is-total';
        tr.append(el('td', '', pair[0]), el('td', 'cso-orsp-num', pair[1]));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      ledgerBox.appendChild(tbl);
      tablesGrid.appendChild(ledgerBox);

      var projBox = el('div', 'cso-orsp-box');
      projBox.appendChild(el('h3', 'cso-orsp-box-title', orMode ? '📈 ୫-ବର୍ଷିଆ ବାର୍ଷିକ ୩% ବୃଦ୍ଧି ଆକଳନ' : '📈 5-Year Annual 3% Increment Projection'));
      var ptbl = el('table', 'cso-orsp-table');
      var phead = doc.createElement('thead');
      var phr = doc.createElement('tr');
      ['Year', 'Cell', 'Basic', 'Gross', 'In-Hand'].forEach(function (h) { phr.appendChild(el('th', '', h)); });
      phead.appendChild(phr);
      ptbl.appendChild(phead);
      var ptbody = doc.createElement('tbody');
      proj.forEach(function (row) {
        var tr = doc.createElement('tr');
        tr.append(
          el('td', '', 'Yr ' + row.year),
          el('td', '', 'C' + row.cell),
          el('td', 'cso-orsp-num', fmtInr(row.basic)),
          el('td', 'cso-orsp-num', fmtInr(row.gross_monthly)),
          el('td', 'cso-orsp-num is-strong', fmtInr(row.net_monthly))
        );
        ptbody.appendChild(tr);
      });
      ptbl.appendChild(ptbody);
      projBox.appendChild(ptbl);
      tablesGrid.appendChild(projBox);

      wrap.appendChild(tablesGrid);
      container.replaceChildren(wrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-orsp-salary-estimator-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v405',
    ORSP_LEVELS: ORSP_LEVELS,
    POST_PRESETS: POST_PRESETS,
    ODISHA_HRA_SLABS: ODISHA_HRA_SLABS,
    CENTRAL_HRA_SLABS: CENTRAL_HRA_SLABS,
    getLevelMeta: getLevelMeta,
    getCellBasicPay: getCellBasicPay,
    calculateOrspSalary: calculateOrspSalary,
    computeFiveYearProjection: computeFiveYearProjection,
    mount: mount
  };
});
