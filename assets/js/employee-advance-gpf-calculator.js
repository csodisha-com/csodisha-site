/**
 * Common Sense Odisha — Interactive Odisha Govt Employee House Building Advance (HBA),
 * GPF Withdrawal & Festival / Vehicle Advance Calculator (/career-paths/, v448)
 * Module A: HBA (34 months Basic Pay | construction cost | 40% repaying capacity, capped),
 *           principal recovery up to 180 installments + simple-interest recovery up to 60.
 * Module B: GPF part-final (non-refundable) withdrawal limits & service eligibility.
 * Module C: Festival Advance (₹20,000 / 10 × ₹2,000) and Computer / Two-Wheeler advances.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style
 * mutations; bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 * Indicative worksheet only — confirm against the latest Odisha Finance Dept resolution.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOEmployeeAdvanceGpfCalculator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOEmployeeAdvanceGpfCalculator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v448';
  var ROOT_ID = 'cso-employee-advance-gpf-root';
  var PREFS_KEY = 'cso_employee_advance_gpf_v1';
  var ORSP_PREFS_KEY = 'cso_orsp_salary_prefs_v1';

  var HBA_BASIC_PAY_MULTIPLE = 34;
  var HBA_REPAY_CAPACITY_PCT = 0.40;
  var HBA_CAP_STANDARD = 2500000;
  var HBA_CAP_EXTENDED = 4000000;
  var HBA_MAX_PRINCIPAL_INSTALMENTS = 180;
  var HBA_MAX_INTEREST_INSTALMENTS = 60;
  var HBA_DEFAULT_RATE = 7.1;
  var FESTIVAL_ADVANCE_AMOUNT = 20000;
  var FESTIVAL_ADVANCE_INSTALMENTS = 10;

  var GPF_PURPOSES = {
    house: { key: 'house', pct: 90, minServiceYears: 10, en: 'House Purchase / Construction [up to 90%]', or: 'ଗୃହ କ୍ରୟ / ନିର୍ମାଣ [90% ପର୍ଯ୍ୟନ୍ତ]' },
    education: { key: 'education', pct: 75, minServiceYears: 15, en: 'Higher Education / Marriage of Dependents [up to 75%]', or: 'ଉଚ୍ଚ ଶିକ୍ଷା / ଆଶ୍ରିତଙ୍କ ବିବାହ [75% ପର୍ଯ୍ୟନ୍ତ]' },
    medical: { key: 'medical', pct: 90, minServiceYears: 10, en: 'Medical Treatment [up to 90%]', or: 'ଚିକିତ୍ସା [90% ପର୍ଯ୍ୟନ୍ତ]' },
    vehicle: { key: 'vehicle', pct: 75, minServiceYears: 15, en: 'Motor Car / Two-Wheeler Purchase [up to 75%]', or: 'ମୋଟର କାର୍ / ଦୁଇଚକିଆ କ୍ରୟ [75% ପର୍ଯ୍ୟନ୍ତ]' },
    superannuation: { key: 'superannuation', pct: 90, minServiceYears: 10, en: 'Within 1 Year of Superannuation [up to 90%]', or: 'ଅବସର ପୂର୍ବ 1 ବର୍ଷ ମଧ୍ୟରେ [90% ପର୍ଯ୍ୟନ୍ତ]' }
  };
  var GPF_PURPOSE_KEYS = ['house', 'education', 'medical', 'vehicle', 'superannuation'];

  // Indicative ceilings (editable via params) for Module C.
  var COMPUTER_ADVANCE_CEILING = 50000;
  var TWO_WHEELER_ADVANCE_CEILING = 100000;
  var COMPUTER_INSTALMENTS = 48;
  var TWO_WHEELER_INSTALMENTS = 60;

  function num(v, def, min, max) {
    var n = Number(v);
    if (!isFinite(n)) n = def;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }

  function calculateHba(p) {
    var basicPay = Math.round(num(p.basicPay, 44900, 0));
    var remainingMonths = Math.round(num(p.remainingServiceMonths, 240, 1, 480));
    var estimatedCost = Math.round(num(p.estimatedCost, 3000000, 0));
    var cap = p.capMode === 'extended' ? HBA_CAP_EXTENDED : HBA_CAP_STANDARD;
    var rate = num(p.hbaInterestRate, HBA_DEFAULT_RATE, 0, 30);

    var byBasicPay = basicPay * HBA_BASIC_PAY_MULTIPLE;
    var byRepayCapacity = Math.round(basicPay * HBA_REPAY_CAPACITY_PCT * remainingMonths);
    var limits = [
      { key: 'basic-pay-34', amount: byBasicPay },
      { key: 'estimated-cost', amount: estimatedCost },
      { key: 'repaying-capacity', amount: byRepayCapacity },
      { key: 'ceiling', amount: cap }
    ];
    var binding = limits[0];
    limits.forEach(function (l) { if (l.amount < binding.amount) binding = l; });
    var maxHba = Math.max(0, binding.amount);

    var principalMonths = Math.min(HBA_MAX_PRINCIPAL_INSTALMENTS, remainingMonths);
    var interestMonths = HBA_MAX_INTEREST_INSTALMENTS;
    var monthlyPrincipalEmi = maxHba > 0 ? Math.round(maxHba / principalMonths) : 0;
    // Simple interest on the diminishing principal balance during the principal-recovery phase.
    var exactEmi = maxHba / principalMonths;
    var totalSimpleInterest = Math.round((rate / 1200) * (principalMonths * maxHba - exactEmi * principalMonths * (principalMonths - 1) / 2));
    var monthlyInterestEmi = totalSimpleInterest > 0 ? Math.round(totalSimpleInterest / interestMonths) : 0;
    var totalRecoveryMonths = principalMonths + interestMonths;

    return {
      byBasicPay: byBasicPay,
      byEstimatedCost: estimatedCost,
      byRepayCapacity: byRepayCapacity,
      capApplied: cap,
      capMode: p.capMode === 'extended' ? 'extended' : 'standard',
      bindingLimit: binding.key,
      maxSanctionedHba: maxHba,
      interestRate: rate,
      principalInstalments: principalMonths,
      monthlyPrincipalEmi: monthlyPrincipalEmi,
      totalSimpleInterest: totalSimpleInterest,
      interestInstalments: interestMonths,
      monthlyInterestEmi: monthlyInterestEmi,
      totalRepayable: maxHba + totalSimpleInterest,
      totalRecoveryMonths: totalRecoveryMonths,
      recoveryExceedsService: totalRecoveryMonths > remainingMonths
    };
  }

  function calculateGpfWithdrawal(p) {
    var balance = Math.round(num(p.gpfBalance, 800000, 0));
    var years = num(p.serviceYears, 12, 0, 45);
    var purpose = GPF_PURPOSES[p.gpfPurpose] || GPF_PURPOSES.house;
    var eligible = years >= purpose.minServiceYears && balance > 0;
    var maxPermissible = Math.floor(balance * purpose.pct / 100);
    var amount = eligible ? maxPermissible : 0;
    var reason = eligible ? 'eligible' : (balance <= 0 ? 'no-balance' : 'insufficient-service');
    var basicPay = Math.round(num(p.basicPay, 44900, 0));
    // Indicative temporary (refundable) advance: lesser of 3 months' Basic Pay or 1/2 of balance.
    var temporaryAdvance = Math.round(Math.min(basicPay * 3, balance / 2));
    return {
      purposeKey: purpose.key,
      purposePct: purpose.pct,
      minServiceYears: purpose.minServiceYears,
      serviceYears: years,
      eligible: eligible,
      eligibilityReason: reason,
      maxPermissibleAmount: maxPermissible,
      permissibleWithdrawal: amount,
      taxFreeAmount: amount,
      taxExemptSection: '10(11)',
      temporaryAdvance: temporaryAdvance,
      temporaryAdvanceInstalments: 12,
      remainingBalanceAfter: balance - amount
    };
  }

  function calculateOtherAdvances(p) {
    var basicPay = Math.round(num(p.basicPay, 44900, 0));
    var cost = Math.round(num(p.vehicleCost, 60000, 0));
    var kind = p.vehicleKind === 'computer' ? 'computer' : 'two-wheeler';
    var ceiling = kind === 'computer'
      ? num(p.computerCeiling, COMPUTER_ADVANCE_CEILING, 0)
      : num(p.twoWheelerCeiling, TWO_WHEELER_ADVANCE_CEILING, 0);
    var instalments = kind === 'computer' ? COMPUTER_INSTALMENTS : TWO_WHEELER_INSTALMENTS;
    var confirmed = p.confirmedService !== false;
    var eligible = confirmed && cost > 0 && basicPay > 0;
    var amount = eligible ? Math.min(cost, ceiling, basicPay * 10) : 0;
    return {
      festivalAdvance: FESTIVAL_ADVANCE_AMOUNT,
      festivalInstalments: FESTIVAL_ADVANCE_INSTALMENTS,
      festivalMonthlyRecovery: FESTIVAL_ADVANCE_AMOUNT / FESTIVAL_ADVANCE_INSTALMENTS,
      festivalInterestFree: true,
      vehicleKind: kind,
      vehicleEligible: eligible,
      vehicleAdvanceAmount: amount,
      vehicleInstalments: instalments,
      vehicleMonthlyRecovery: amount > 0 ? Math.round(amount / instalments) : 0
    };
  }

  function calculateEmployeeAdvanceAndGpf(params) {
    var p = params || {};
    var hba = calculateHba(p);
    var gpf = calculateGpfWithdrawal(p);
    var other = calculateOtherAdvances(p);
    return {
      hba: hba,
      gpf: gpf,
      other: other,
      // Flattened headline values
      maxSanctionedHba: hba.maxSanctionedHba,
      monthlyPrincipalEmi: hba.monthlyPrincipalEmi,
      totalSimpleInterest: hba.totalSimpleInterest,
      monthlyInterestEmi: hba.monthlyInterestEmi,
      permissibleWithdrawal: gpf.permissibleWithdrawal,
      festivalAdvance: other.festivalAdvance,
      festivalMonthlyRecovery: other.festivalMonthlyRecovery
    };
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  }

  function buildSummaryText(state, res, lang) {
    var isOr = lang === 'or';
    var purpose = GPF_PURPOSES[state.gpfPurpose] || GPF_PURPOSES.house;
    var lines = [];
    lines.push(isOr ? 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀ ଅଗ୍ରିମ ଓ GPF ଯୋଗ୍ୟତା ସାରାଂଶ' : 'Odisha Govt Employee Advance & GPF Eligibility Summary');
    lines.push((isOr ? 'ମୌଳିକ ବେତନ: ' : 'Basic Pay: ') + fmtInr(state.basicPay));
    lines.push('— HBA —');
    lines.push((isOr ? 'ସର୍ବାଧିକ HBA: ' : 'Max Sanctioned HBA: ') + fmtInr(res.hba.maxSanctionedHba));
    lines.push((isOr ? 'ମାସିକ ମୂଳଧନ EMI: ' : 'Monthly Principal EMI: ') + fmtInr(res.hba.monthlyPrincipalEmi) + ' × ' + res.hba.principalInstalments);
    lines.push((isOr ? 'ମୋଟ ସରଳ ସୁଧ: ' : 'Total Simple Interest: ') + fmtInr(res.hba.totalSimpleInterest) + ' @ ' + res.hba.interestRate + '%');
    lines.push((isOr ? 'ମାସିକ ସୁଧ EMI: ' : 'Monthly Interest EMI: ') + fmtInr(res.hba.monthlyInterestEmi) + ' × ' + res.hba.interestInstalments);
    lines.push('— GPF —');
    lines.push((isOr ? purpose.or : purpose.en) + ': ' + (res.gpf.eligible ? fmtInr(res.gpf.permissibleWithdrawal) + (isOr ? ' (କରମୁକ୍ତ, ଧାରା 10(11))' : ' (tax-free u/s 10(11))') : (isOr ? 'ଯୋଗ୍ୟ ନୁହେଁ — ' + res.gpf.minServiceYears + ' ବର୍ଷ ସେବା ଆବଶ୍ୟକ' : 'Not eligible — ' + res.gpf.minServiceYears + ' years of service required')));
    lines.push('— ' + (isOr ? 'ଅଗ୍ରିମ' : 'Advances') + ' —');
    lines.push((isOr ? 'ଉତ୍ସବ ଅଗ୍ରିମ: ' : 'Festival Advance: ') + fmtInr(res.other.festivalAdvance) + ' / ' + res.other.festivalInstalments + ' × ' + fmtInr(res.other.festivalMonthlyRecovery));
    lines.push((state.vehicleKind === 'computer' ? (isOr ? 'କମ୍ପ୍ୟୁଟର ଅଗ୍ରିମ: ' : 'Computer Advance: ') : (isOr ? 'ଦୁଇଚକିଆ ଅଗ୍ରିମ: ' : 'Two-Wheeler Advance: ')) + fmtInr(res.other.vehicleAdvanceAmount) + ' / ' + res.other.vehicleInstalments + ' × ' + fmtInr(res.other.vehicleMonthlyRecovery));
    lines.push('csodisha.com/career-paths/');
    return lines.join('\n');
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
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function copyText(text, statusEl, okMsg) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      win.navigator.clipboard.writeText(text).then(function () {
        if (statusEl) statusEl.textContent = okMsg;
      }).catch(function () {
        if (statusEl) statusEl.textContent = okMsg;
      });
    } else if (statusEl) {
      statusEl.textContent = okMsg;
    }
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadJson(PREFS_KEY) || {};
    var orsp = loadJson(ORSP_PREFS_KEY) || {};

    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      basicPay: Number(saved.basicPay) || Number(orsp.basicPay) || 44900,
      remainingServiceMonths: Number(saved.remainingServiceMonths) || 240,
      estimatedCost: saved.estimatedCost !== undefined ? Number(saved.estimatedCost) : 3000000,
      capMode: saved.capMode === 'extended' ? 'extended' : 'standard',
      hbaInterestRate: saved.hbaInterestRate !== undefined ? Number(saved.hbaInterestRate) : HBA_DEFAULT_RATE,
      gpfBalance: saved.gpfBalance !== undefined ? Number(saved.gpfBalance) : 800000,
      serviceYears: saved.serviceYears !== undefined ? Number(saved.serviceYears) : 12,
      gpfPurpose: GPF_PURPOSES[saved.gpfPurpose] ? saved.gpfPurpose : 'house',
      vehicleKind: saved.vehicleKind === 'computer' ? 'computer' : 'two-wheeler',
      vehicleCost: saved.vehicleCost !== undefined ? Number(saved.vehicleCost) : 60000
    };
    var statusMsg = '';

    function persist() { saveJson(PREFS_KEY, state); }

    function field(labelText, control) {
      var f = el('div', 'cso-eag-field');
      f.appendChild(el('label', null, labelText));
      f.appendChild(control);
      return f;
    }
    function numInput(key, min, step) {
      var inp = el('input', 'cso-eag-input');
      inp.type = 'number';
      inp.min = String(min);
      inp.step = String(step || 1);
      inp.value = String(state[key]);
      inp.addEventListener('change', function () {
        var v = Number(inp.value);
        state[key] = isFinite(v) ? Math.max(min, v) : state[key];
        persist();
        render();
      });
      return inp;
    }
    function selectInput(key, options) {
      var sel = el('select', 'cso-eag-select');
      options.forEach(function (o) {
        var opt = el('option', null, o.label);
        opt.value = o.value;
        if (state[key] === o.value) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () { state[key] = sel.value; persist(); render(); });
      return sel;
    }
    function kpi(label, val) {
      var k = el('div', 'cso-eag-kpi');
      k.appendChild(el('div', 'cso-eag-kpi-label', label));
      k.appendChild(el('div', 'cso-eag-kpi-val', val));
      return k;
    }

    function render() {
      var isOr = state.lang === 'or';
      var res = calculateEmployeeAdvanceAndGpf(state);
      var card = el('div', 'cso-eag-card');

      var head = el('div', 'cso-eag-head');
      var hLeft = el('div');
      hLeft.appendChild(el('p', 'cso-eag-eyebrow', isOr ? 'ଓଡ଼ିଶା ଅର୍ଥ ବିଭାଗ ଅଗ୍ରିମ ଓ GPF ନିୟମ • v448' : 'ODISHA FINANCE DEPT ADVANCE & GPF RULES • v448'));
      hLeft.appendChild(el('h2', 'cso-eag-title', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀ HBA, GPF ଉତ୍ତୋଳନ ଓ ଉତ୍ସବ / ଯାନ ଅଗ୍ରିମ କାଲକୁଲେଟର' : 'Odisha Govt Employee HBA, GPF Withdrawal & Festival / Vehicle Advance Calculator'));
      hLeft.appendChild(el('p', 'cso-eag-sub', isOr ? '34 ମାସର ମୌଳିକ ବେତନ ଆଧାରିତ HBA, ସରଳ ସୁଧ ପୁନରୁଦ୍ଧାର, GPF ଆଂଶିକ-ଅନ୍ତିମ ଉତ୍ତୋଳନ ସୀମା ଓ ₹20,000 ଉତ୍ସବ ଅଗ୍ରିମ ହିସାବ କରନ୍ତୁ।' : 'Compute HBA on 34 months’ Basic Pay with simple-interest recovery, GPF part-final withdrawal limits and the ₹20,000 Festival Advance schedule.'));
      head.appendChild(hLeft);

      var langBox = el('div', 'cso-eag-lang-toggle');
      var enBtn = el('button', 'cso-eag-lang-btn', 'English');
      enBtn.type = 'button';
      enBtn.setAttribute('aria-pressed', String(!isOr));
      enBtn.addEventListener('click', function () { state.lang = 'en'; persist(); render(); });
      var orBtn = el('button', 'cso-eag-lang-btn', 'ଓଡ଼ିଆ');
      orBtn.type = 'button';
      orBtn.setAttribute('aria-pressed', String(isOr));
      orBtn.addEventListener('click', function () { state.lang = 'or'; persist(); render(); });
      langBox.appendChild(enBtn);
      langBox.appendChild(orBtn);
      head.appendChild(langBox);
      card.appendChild(head);

      // Shared input
      var shared = el('div', 'cso-eag-grid');
      shared.appendChild(field(isOr ? 'ମୌଳିକ ବେତନ (₹/ମାସ)' : 'Basic Pay (₹/month)', numInput('basicPay', 0, 100)));
      card.appendChild(shared);

      // Module A
      card.appendChild(el('h3', 'cso-eag-section', isOr ? 'A. ଗୃହ ନିର୍ମାଣ ଅଗ୍ରିମ (HBA)' : 'A. House Building Advance (HBA)'));
      var gridA = el('div', 'cso-eag-grid');
      gridA.appendChild(field(isOr ? 'ଅନୁମାନିତ ନିର୍ମାଣ / ଫ୍ଲାଟ୍ ମୂଲ୍ୟ (₹)' : 'Estimated Construction / Flat Cost (₹)', numInput('estimatedCost', 0, 10000)));
      gridA.appendChild(field(isOr ? 'ଅବଶିଷ୍ଟ ସେବା ମାସ' : 'Remaining Service (months)', numInput('remainingServiceMonths', 1, 1)));
      gridA.appendChild(field(isOr ? 'ସର୍ବାଧିକ ସୀମା' : 'HBA Ceiling', selectInput('capMode', [
        { value: 'standard', label: isOr ? '₹25,00,000 (ମାନକ)' : '₹25,00,000 (Standard)' },
        { value: 'extended', label: isOr ? '₹40,00,000 (ବର୍ଦ୍ଧିତ)' : '₹40,00,000 (Extended State Cap)' }
      ])));
      gridA.appendChild(field(isOr ? 'ସରଳ ସୁଧ ହାର (%)' : 'Simple Interest Rate (%)', numInput('hbaInterestRate', 0, 0.1)));
      card.appendChild(gridA);
      var kpisA = el('div', 'cso-eag-kpis');
      kpisA.appendChild(kpi(isOr ? 'ସର୍ବାଧିକ ମଞ୍ଜୁର HBA' : 'Max Sanctioned HBA', fmtInr(res.hba.maxSanctionedHba)));
      kpisA.appendChild(kpi(isOr ? 'ମାସିକ ମୂଳଧନ EMI' : 'Monthly Principal EMI', fmtInr(res.hba.monthlyPrincipalEmi) + ' × ' + res.hba.principalInstalments));
      kpisA.appendChild(kpi(isOr ? 'ମୋଟ ସରଳ ସୁଧ' : 'Total Simple Interest', fmtInr(res.hba.totalSimpleInterest)));
      kpisA.appendChild(kpi(isOr ? 'ମାସିକ ସୁଧ EMI' : 'Monthly Interest EMI', fmtInr(res.hba.monthlyInterestEmi) + ' × ' + res.hba.interestInstalments));
      card.appendChild(kpisA);

      var tblWrap = el('div', 'cso-eag-table-wrap');
      var tbl = el('table', 'cso-eag-table');
      function row(th, td) {
        var tr = el('tr');
        tr.appendChild(el('th', null, th));
        tr.appendChild(el('td', null, td));
        tbl.appendChild(tr);
      }
      row(isOr ? '34 ମାସ ମୌଳିକ ବେତନ' : '34 × Basic Pay', fmtInr(res.hba.byBasicPay));
      row(isOr ? 'ନିର୍ମାଣ / ଫ୍ଲାଟ୍ ମୂଲ୍ୟ' : 'Construction / Flat Cost', fmtInr(res.hba.byEstimatedCost));
      row(isOr ? 'ପରିଶୋଧ କ୍ଷମତା (40% × ଅବଶିଷ୍ଟ ମାସ)' : 'Repaying Capacity (40% × remaining months)', fmtInr(res.hba.byRepayCapacity));
      row(isOr ? 'ସର୍ବାଧିକ ସୀମା' : 'Applicable Ceiling', fmtInr(res.hba.capApplied));
      row(isOr ? 'ମୋଟ ପରିଶୋଧ' : 'Total Repayable (Principal + Interest)', fmtInr(res.hba.totalRepayable));
      tblWrap.appendChild(tbl);
      card.appendChild(tblWrap);
      if (res.hba.recoveryExceedsService) {
        card.appendChild(el('p', 'cso-eag-warn', isOr ? '⚠️ ପୁନରୁଦ୍ଧାର ଅବଧି ଅବଶିଷ୍ଟ ସେବାଠାରୁ ଅଧିକ — ଅବଶିଷ୍ଟ ପରିମାଣ ଅବସର ସୁବିଧାରୁ କଟାଯାଇପାରେ।' : '⚠️ Recovery period exceeds remaining service — any balance may be adjusted from terminal benefits.'));
      }

      // Module B
      card.appendChild(el('h3', 'cso-eag-section', isOr ? 'B. GPF ଆଂଶିକ-ଅନ୍ତିମ (ଅଫେରତ) ଉତ୍ତୋଳନ' : 'B. GPF Part-Final (Non-Refundable) Withdrawal'));
      var gridB = el('div', 'cso-eag-grid');
      gridB.appendChild(field(isOr ? 'ବର୍ତ୍ତମାନ GPF ଲେଜର୍ ବାଲାନ୍ସ (₹)' : 'Current GPF Ledger Balance (₹)', numInput('gpfBalance', 0, 1000)));
      gridB.appendChild(field(isOr ? 'ସମ୍ପୂର୍ଣ୍ଣ ସେବା ବର୍ଷ' : 'Completed Service Years', numInput('serviceYears', 0, 1)));
      gridB.appendChild(field(isOr ? 'ଉତ୍ତୋଳନ ଉଦ୍ଦେଶ୍ୟ' : 'Withdrawal Purpose', selectInput('gpfPurpose', GPF_PURPOSE_KEYS.map(function (k) {
        return { value: k, label: isOr ? GPF_PURPOSES[k].or : GPF_PURPOSES[k].en };
      }))));
      card.appendChild(gridB);
      var kpisB = el('div', 'cso-eag-kpis');
      kpisB.appendChild(kpi(isOr ? 'ଅନୁମତିପ୍ରାପ୍ତ କରମୁକ୍ତ ଉତ୍ତୋଳନ' : 'Permissible Tax-Free Withdrawal', res.gpf.eligible ? fmtInr(res.gpf.permissibleWithdrawal) : '₹0'));
      kpisB.appendChild(kpi(isOr ? 'ସୀମା' : 'Limit', res.gpf.purposePct + '%'));
      kpisB.appendChild(kpi(isOr ? 'ସର୍ବନିମ୍ନ ସେବା' : 'Minimum Service', res.gpf.minServiceYears + (isOr ? ' ବର୍ଷ' : ' yrs')));
      kpisB.appendChild(kpi(isOr ? 'ସାମୟିକ ଅଗ୍ରିମ (ସୂଚକ)' : 'Temporary Advance (indicative)', fmtInr(res.gpf.temporaryAdvance)));
      card.appendChild(kpisB);
      var verdict = el('p', 'cso-eag-verdict', res.gpf.eligible
        ? (isOr ? '✅ ଯୋଗ୍ୟ — ଆଇକର ଧାରା 10(11) ଅନୁଯାୟୀ 100% କରମୁକ୍ତ।' : '✅ Eligible — 100% exempt u/s 10(11) of the Income Tax Act.')
        : (isOr ? '❌ ଏହି ଉଦ୍ଦେଶ୍ୟ ପାଇଁ ' + res.gpf.minServiceYears + ' ବର୍ଷ ସମ୍ପୂର୍ଣ୍ଣ ସେବା ଆବଶ୍ୟକ।' : '❌ This purpose requires ' + res.gpf.minServiceYears + ' completed years of service.'));
      card.appendChild(verdict);

      // Module C
      card.appendChild(el('h3', 'cso-eag-section', isOr ? 'C. ଉତ୍ସବ, କମ୍ପ୍ୟୁଟର ଓ ଦୁଇଚକିଆ ଅଗ୍ରିମ' : 'C. Festival, Computer & Two-Wheeler Advances'));
      var gridC = el('div', 'cso-eag-grid');
      gridC.appendChild(field(isOr ? 'ଅଗ୍ରିମ ପ୍ରକାର' : 'Advance Type', selectInput('vehicleKind', [
        { value: 'two-wheeler', label: isOr ? 'ଦୁଇଚକିଆ' : 'Two-Wheeler' },
        { value: 'computer', label: isOr ? 'ପର୍ସନାଲ୍ କମ୍ପ୍ୟୁଟର' : 'Personal Computer' }
      ])));
      gridC.appendChild(field(isOr ? 'କ୍ରୟ ମୂଲ୍ୟ (₹)' : 'Purchase Cost (₹)', numInput('vehicleCost', 0, 1000)));
      card.appendChild(gridC);
      var kpisC = el('div', 'cso-eag-kpis');
      kpisC.appendChild(kpi(isOr ? 'ଉତ୍ସବ ଅଗ୍ରିମ (ସୁଧମୁକ୍ତ)' : 'Festival Advance (interest-free)', fmtInr(res.other.festivalAdvance)));
      kpisC.appendChild(kpi(isOr ? 'ଉତ୍ସବ ମାସିକ ପୁନରୁଦ୍ଧାର' : 'Festival Recovery', fmtInr(res.other.festivalMonthlyRecovery) + ' × ' + res.other.festivalInstalments));
      kpisC.appendChild(kpi(state.vehicleKind === 'computer' ? (isOr ? 'କମ୍ପ୍ୟୁଟର ଅଗ୍ରିମ' : 'Computer Advance') : (isOr ? 'ଦୁଇଚକିଆ ଅଗ୍ରିମ' : 'Two-Wheeler Advance'), fmtInr(res.other.vehicleAdvanceAmount)));
      kpisC.appendChild(kpi(isOr ? 'ମାସିକ ପୁନରୁଦ୍ଧାର' : 'Monthly Recovery', fmtInr(res.other.vehicleMonthlyRecovery) + ' × ' + res.other.vehicleInstalments));
      card.appendChild(kpisC);

      var statusEl = el('p', 'cso-eag-status', statusMsg);
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
      var actions = el('div', 'cso-eag-actions');
      var copyBtn = el('button', 'cso-eag-btn cso-eag-btn--primary', isOr ? '📋 ଅଗ୍ରିମ ଓ GPF ଯୋଗ୍ୟତା ସାରାଂଶ କପି କରନ୍ତୁ' : '📋 Copy Advance & GPF Eligibility Summary');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        copyText(buildSummaryText(state, res, state.lang), statusEl, isOr ? 'ସାରାଂଶ କପି ହୋଇଗଲା।' : 'Summary copied.');
      });
      var printBtn = el('button', 'cso-eag-btn', isOr ? '🖨️ ଅଗ୍ରିମ ଓ GPF ୱାର୍କସିଟ୍ ପ୍ରିଣ୍ଟ କରନ୍ତୁ' : '🖨️ Print Advance & GPF Worksheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(copyBtn);
      actions.appendChild(printBtn);
      card.appendChild(actions);
      card.appendChild(statusEl);
      card.appendChild(el('p', 'cso-eag-note', isOr ? 'ଏହା ଏକ ସୂଚକ ୱାର୍କସିଟ୍; ଚୂଡ଼ାନ୍ତ ସୀମା, ସୁଧ ହାର ଓ ଯୋଗ୍ୟତା ପାଇଁ ଓଡ଼ିଶା ଅର୍ଥ ବିଭାଗର ସର୍ବଶେଷ ସଂକଳ୍ପ ଦେଖନ୍ତୁ।' : 'Indicative worksheet only — confirm final ceilings, interest rate and eligibility with the latest Odisha Finance Department resolution and your DDO.'));

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
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    GPF_PURPOSES: GPF_PURPOSES,
    calculateEmployeeAdvanceAndGpf: calculateEmployeeAdvanceAndGpf,
    calculateHba: calculateHba,
    calculateGpfWithdrawal: calculateGpfWithdrawal,
    calculateOtherAdvances: calculateOtherAdvances,
    buildSummaryText: buildSummaryText,
    mount: mount
  };
});
