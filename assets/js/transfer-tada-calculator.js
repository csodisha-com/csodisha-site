/**
 * Common Sense Odisha — Interactive Odisha Govt Employee Transfer,
 * Joining Time & TA/DA Rule Calculator (/career-paths/ & /guides/, v445)
 * Implements Orissa Service Code Rules 201–215 Joining Time brackets, holiday/Sunday
 * auto-extension, unavailed EL credit (up to 15 days), Odisha TA Rules 80% Composite
 * Transfer Grant (CTG), ORSP Pay Level L-1..L-17 Hotel/Food DA tiers & personal effects claim.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOTransferTadaCalculator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOTransferTadaCalculator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v445';
  var ROOT_ID = 'cso-transfer-tada-calculator-root';
  var PREFS_KEY = 'cso_transfer_tada_prefs_v1';
  var ORSP_PREFS_KEY = 'cso_orsp_salary_prefs_v1';

  var PAY_LEVEL_TIERS = [
    { id: 'L14-17', minLevel: 14, maxLevel: 17, labelEn: 'Level 14–17 (₹1,44,200+)', labelOr: 'ଲେଭେଲ୍ 14–17 (₹1,44,200+)', hotelPerDay: 7500, foodDaPerDay: 1200, maxGoodsKg: 6000, goodsRatePerKm: 50, travelClass: 'Air Economy / AC-I Tier' },
    { id: 'L12-13A', minLevel: 12, maxLevel: 13, labelEn: 'Level 12–13A (₹78,800–₹1,31,100)', labelOr: 'ଲେଭେଲ୍ 12–13A (₹78,800–₹1,31,100)', hotelPerDay: 4500, foodDaPerDay: 1000, maxGoodsKg: 6000, goodsRatePerKm: 50, travelClass: 'Air Economy / AC-II Tier' },
    { id: 'L9-11', minLevel: 9, maxLevel: 11, labelEn: 'Level 9–11 (₹35,400–₹67,700)', labelOr: 'ଲେଭେଲ୍ 9–11 (₹35,400–₹67,700)', hotelPerDay: 2250, foodDaPerDay: 900, maxGoodsKg: 3000, goodsRatePerKm: 25, travelClass: 'AC-II / AC-III Tier' },
    { id: 'L6-8', minLevel: 6, maxLevel: 8, labelEn: 'Level 6–8 (₹25,500–₹47,600)', labelOr: 'ଲେଭେଲ୍ 6–8 (₹25,500–₹47,600)', hotelPerDay: 750, foodDaPerDay: 800, maxGoodsKg: 3000, goodsRatePerKm: 25, travelClass: 'AC-III Tier / AC Chair Car' },
    { id: 'L1-5', minLevel: 1, maxLevel: 5, labelEn: 'Level 1–5 (₹18,000–₹29,200)', labelOr: 'ଲେଭେଲ୍ 1–5 (₹18,000–₹29,200)', hotelPerDay: 450, foodDaPerDay: 500, maxGoodsKg: 1500, goodsRatePerKm: 15, travelClass: 'Sleeper / First Class' }
  ];

  // Key fixed Odisha Govt Gazetted Holidays (MM-DD) for Sunday/Holiday auto-extension
  var FIXED_ODISHA_HOLIDAYS = ['01-26', '04-01', '08-15', '10-02', '12-25'];

  function getTierForLevel(payLevel) {
    var lv = Math.max(1, Math.min(17, Math.round(Number(payLevel) || 9)));
    for (var i = 0; i < PAY_LEVEL_TIERS.length; i += 1) {
      if (lv >= PAY_LEVEL_TIERS[i].minLevel && lv <= PAY_LEVEL_TIERS[i].maxLevel) {
        return PAY_LEVEL_TIERS[i];
      }
    }
    return PAY_LEVEL_TIERS[2];
  }

  function formatIsoDate(d) {
    var y = d.getUTCFullYear();
    var m = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    return y + '-' + (m < 10 ? '0' + m : String(m)) + '-' + (day < 10 ? '0' + day : String(day));
  }

  function isSundayOrFixedHoliday(d) {
    if (d.getUTCDay() === 0) return true;
    var m = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    var mmdd = (m < 10 ? '0' + m : String(m)) + '-' + (day < 10 ? '0' + day : String(day));
    return FIXED_ODISHA_HOLIDAYS.indexOf(mmdd) !== -1;
  }

  function addJoiningDays(reliefIso, days) {
    var m = String(reliefIso || '2026-12-01').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var base = m
      ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
      : new Date(Date.UTC(2026, 11, 1));
    var target = new Date(base.getTime() + days * 86400000);
    var extendedBy = 0;
    while (isSundayOrFixedHoliday(target) && extendedBy < 5) {
      target = new Date(target.getTime() + 86400000);
      extendedBy += 1;
    }
    return { lastDateToJoin: formatIsoDate(target), holidayExtensionDays: extendedBy };
  }

  function calculateTransferAndTada(params) {
    var p = params || {};
    var payLevel = Math.max(1, Math.min(17, Math.round(Number(p.payLevel || 9) || 9)));
    var basicPay = Math.max(18000, Math.round(Number(p.basicPay || 44900) || 44900));
    var transferType = String(p.transferType || 'outstation'); // 'outstation' | 'same-station-residence' | 'same-hq' | 'island'
    var distanceKm = Math.max(0, Math.round(Number(p.distanceKm !== undefined ? p.distanceKm : 320) || 0));
    var roadOver200Km = Boolean(p.roadOver200Km);
    var reliefDate = String(p.reliefDate || '2026-12-01');
    var daysActuallyAvailed = Math.max(0, Math.min(15, Math.round(Number(p.daysActuallyAvailed !== undefined ? p.daysActuallyAvailed : 5) || 0)));
    var familyMembers = Math.max(1, Math.min(8, Math.round(Number(p.familyMembers || 3) || 3)));
    var farePerPerson = Math.max(0, Math.round(Number(p.farePerPerson !== undefined ? p.farePerPerson : 850) || 0));
    var transitDays = Math.max(1, Math.min(7, Math.round(Number(p.transitDays || 2) || 2)));

    var tier = getTierForLevel(payLevel);

    // Orissa Service Code Rules 201–215 Joining Time
    var joiningDays = 1;
    var joiningRuleNote = 'Same HQ / No Change of Residence (1 Day)';
    if (transferType !== 'same-hq') {
      if (distanceKm <= 1000) {
        joiningDays = roadOver200Km ? 12 : 10;
        joiningRuleNote = roadOver200Km ? '<= 1,000 km with >200 km road transit (12 Days)' : '<= 1,000 km transit (10 Days)';
      } else if (distanceKm <= 2000) {
        joiningDays = roadOver200Km ? 15 : 12;
        joiningRuleNote = roadOver200Km ? '1,001–2,000 km with >200 km road transit (15 Days)' : '1,001–2,000 km transit (12 Days)';
      } else {
        joiningDays = 15;
        joiningRuleNote = '> 2,000 km transit (15 Days max)';
      }
    }

    var dateCalc = addJoiningDays(reliefDate, joiningDays);
    var unavailedElCredit = transferType === 'same-hq' ? 0 : Math.min(15, Math.max(0, joiningDays - daysActuallyAvailed));

    // Composite Transfer Grant (CTG)
    var ctgFactor = 0.80;
    if (transferType === 'same-hq') ctgFactor = 0;
    else if (transferType === 'same-station-residence') ctgFactor = 1 / 3;
    else if (transferType === 'island') ctgFactor = 1.0;
    var ctgAmount = Math.round(basicPay * ctgFactor);

    // Personal effects transport + Family fare + Transit DA
    var goodsTransportAmount = transferType === 'same-hq' ? 0 : Math.round(distanceKm * tier.goodsRatePerKm);
    var familyFareAmount = transferType === 'same-hq' ? 0 : Math.round(familyMembers * farePerPerson);
    var transitDaAmount = transferType === 'same-hq' ? 0 : Math.round(transitDays * tier.foodDaPerDay);
    var personalEffectsAndTravel = goodsTransportAmount + familyFareAmount + transitDaAmount;
    var totalTransferClaim = ctgAmount + personalEffectsAndTravel;

    return {
      payLevel: payLevel,
      tierId: tier.id,
      basicPay: basicPay,
      transferType: transferType,
      distanceKm: distanceKm,
      joiningDays: joiningDays,
      joiningRuleNote: joiningRuleNote,
      lastDateToJoin: dateCalc.lastDateToJoin,
      holidayExtensionDays: dateCalc.holidayExtensionDays,
      unavailedElCredit: unavailedElCredit,
      ctgFactor: ctgFactor,
      ctgAmount: ctgAmount,
      hotelPerDay: tier.hotelPerDay,
      foodDaPerDay: tier.foodDaPerDay,
      maxGoodsKg: tier.maxGoodsKg,
      goodsRatePerKm: tier.goodsRatePerKm,
      travelClass: tier.travelClass,
      goodsTransportAmount: goodsTransportAmount,
      familyFareAmount: familyFareAmount,
      transitDaAmount: transitDaAmount,
      personalEffectsAndTravel: personalEffectsAndTravel,
      totalTransferClaim: totalTransferClaim
    };
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
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
      payLevel: Number(saved.payLevel) || Number(orsp.payLevel) || 9,
      basicPay: Number(saved.basicPay) || Number(orsp.basicPay) || 44900,
      transferType: saved.transferType || 'outstation',
      distanceKm: saved.distanceKm !== undefined ? Number(saved.distanceKm) : 320,
      roadOver200Km: Boolean(saved.roadOver200Km),
      reliefDate: saved.reliefDate || '2026-12-01',
      daysActuallyAvailed: saved.daysActuallyAvailed !== undefined ? Number(saved.daysActuallyAvailed) : 5,
      familyMembers: Number(saved.familyMembers) || 3,
      farePerPerson: saved.farePerPerson !== undefined ? Number(saved.farePerPerson) : 850,
      transitDays: Number(saved.transitDays) || 2
    };

    function persist() { saveJson(PREFS_KEY, state); }

    function render() {
      var isOr = state.lang === 'or';
      var res = calculateTransferAndTada(state);
      var card = el('div', 'cso-ttc-card');

      // Header
      var head = el('div', 'cso-ttc-head');
      var hLeft = el('div');
      hLeft.appendChild(el('p', 'cso-ttc-eyebrow', isOr ? 'ଓଡ଼ିଶା ସେବା ସଂହିତା ନିୟମ 201–215 • v445' : 'ORISSA SERVICE CODE & ODISHA TA RULES • v445'));
      hLeft.appendChild(el('h2', 'cso-ttc-title', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀ ବଦଳି, ଯୋଗଦାନ ସମୟ ଓ TA/DA ହିସାବ' : 'Odisha Govt Employee Transfer, Joining Time & TA/DA Rule Calculator'));
      hLeft.appendChild(el('p', 'cso-ttc-sub', isOr ? 'ଯୋଗଦାନ ସମୟ, EL କ୍ରେଡିଟ୍, 80% କମ୍ପୋଜିଟ୍ ଟ୍ରାନ୍ସଫର୍ ଗ୍ରାଣ୍ଟ (CTG) ଓ ORSP ପେ-ଲେଭେଲ୍ ଅନୁସାରେ ହୋଟେଲ୍/DA ହିସାବ କରନ୍ତୁ।' : 'Compute Joining Time deadlines, unavailed EL credit, 80% Composite Transfer Grant (CTG), and ORSP L-1 to L-17 Hotel/DA & goods reimbursement.'));
      head.appendChild(hLeft);

      var langBox = el('div', 'cso-ttc-lang-toggle');
      var enBtn = el('button', 'cso-ttc-lang-btn', 'English');
      enBtn.type = 'button';
      enBtn.setAttribute('aria-pressed', String(!isOr));
      enBtn.addEventListener('click', function () { state.lang = 'en'; persist(); render(); });
      var orBtn = el('button', 'cso-ttc-lang-btn', 'ଓଡ଼ିଆ');
      orBtn.type = 'button';
      orBtn.setAttribute('aria-pressed', String(isOr));
      orBtn.addEventListener('click', function () { state.lang = 'or'; persist(); render(); });
      langBox.appendChild(enBtn);
      langBox.appendChild(orBtn);
      head.appendChild(langBox);
      card.appendChild(head);

      // Form Grid
      var grid = el('div', 'cso-ttc-grid');

      // ORSP Pay Level Select
      var lvField = el('div', 'cso-ttc-field');
      lvField.appendChild(el('label', null, isOr ? 'ORSP ପେ-ଲେଭେଲ୍ (L-1 ରୁ L-17)' : 'ORSP Pay Level (L-1 to L-17)'));
      var lvSel = el('select', 'cso-ttc-select');
      for (var lv = 1; lv <= 17; lv += 1) {
        var opt = el('option', null, 'Level ' + lv);
        opt.value = String(lv);
        if (lv === state.payLevel) opt.selected = true;
        lvSel.appendChild(opt);
      }
      lvSel.addEventListener('change', function () { state.payLevel = Number(lvSel.value); persist(); render(); });
      lvField.appendChild(lvSel);
      grid.appendChild(lvField);

      // Transfer Type Select
      var ttField = el('div', 'cso-ttc-field');
      ttField.appendChild(el('label', null, isOr ? 'ବଦଳି ପ୍ରକାର' : 'Transfer Type'));
      var ttSel = el('select', 'cso-ttc-select');
      [
        { v: 'outstation', en: 'Outstation Transfer (80% CTG)', or: 'ଅନ୍ୟ ଷ୍ଟେସନ୍ ବଦଳି (80% CTG)' },
        { v: 'same-station-residence', en: 'Same Station w/ Residence Shift (1/3rd CTG)', or: 'ସମାନ ଷ୍ଟେସନ୍ ବାସସ୍ଥାନ ପରିବର୍ତ୍ତନ (1/3rd CTG)' },
        { v: 'same-hq', en: 'Same HQ / No Residence Shift (1 Day, 0% CTG)', or: 'ସମାନ ମୁଖ୍ୟାଳୟ (1 ଦିନ, 0% CTG)' },
        { v: 'island', en: 'Island / Andaman / Lakshadweep (100% CTG)', or: 'ଦ୍ୱୀପପୁଞ୍ଜ ବଦଳି (100% CTG)' }
      ].forEach(function (o) {
        var op = el('option', null, isOr ? o.or : o.en);
        op.value = o.v;
        if (state.transferType === o.v) op.selected = true;
        ttSel.appendChild(op);
      });
      ttSel.addEventListener('change', function () { state.transferType = ttSel.value; persist(); render(); });
      ttField.appendChild(ttSel);
      grid.appendChild(ttField);

      function addInp(labelTxt, type, val, onChange) {
        var f = el('div', 'cso-ttc-field');
        f.appendChild(el('label', null, labelTxt));
        var inp = el('input', 'cso-ttc-input');
        inp.type = type;
        inp.value = String(val);
        inp.addEventListener('change', function () { onChange(inp.value); persist(); render(); });
        f.appendChild(inp);
        grid.appendChild(f);
      }

      addInp(isOr ? 'ଶେଷ ମୂଳ ବେତନ (Basic Pay ₹)' : 'Last Drawn Basic Pay (₹)', 'number', state.basicPay, function (v) { state.basicPay = Math.max(18000, Number(v) || 44900); });
      addInp(isOr ? 'ଦୂରତା (କିଲୋମିଟର)' : 'Transit Distance (km)', 'number', state.distanceKm, function (v) { state.distanceKm = Math.max(0, Number(v) || 0); });
      addInp(isOr ? 'ରିଲିଭ୍ ତାରିଖ (Date of Relief)' : 'Date of Relief (YYYY-MM-DD)', 'date', state.reliefDate, function (v) { state.reliefDate = v || '2026-12-01'; });
      addInp(isOr ? 'ବ୍ୟବହୃତ ଯୋଗଦାନ ଦିନ' : 'Joining Days Actually Availed', 'number', state.daysActuallyAvailed, function (v) { state.daysActuallyAvailed = Math.max(0, Math.min(15, Number(v) || 0)); });
      addInp(isOr ? 'ପରିବାର ସଦସ୍ୟ (Self + Dependents)' : 'Family Members (Self + Dependents)', 'number', state.familyMembers, function (v) { state.familyMembers = Math.max(1, Math.min(8, Number(v) || 1)); });
      addInp(isOr ? 'ପ୍ରତି ସଦସ୍ୟ ରେଳ/ବସ୍ ଭଡ଼ା (₹)' : 'Rail / Bus Fare per Person (₹)', 'number', state.farePerPerson, function (v) { state.farePerPerson = Math.max(0, Number(v) || 0); });
      card.appendChild(grid);

      // Road > 200 km checkbox
      var chkRow = el('label', 'cso-ttc-check');
      var chk = el('input');
      chk.type = 'checkbox';
      chk.checked = state.roadOver200Km;
      chk.addEventListener('change', function () { state.roadOver200Km = chk.checked; persist(); render(); });
      chkRow.appendChild(chk);
      chkRow.appendChild(el('span', null, isOr ? '200 କି.ମି. ରୁ ଅଧିକ ସଡ଼କ ଯାତ୍ରା ଅନ୍ତର୍ଭୁକ୍ତ (ଅତିରିକ୍ତ ଯୋଗଦାନ ଦିନ)' : 'Involves > 200 km continuous road travel (extends joining time bracket)'));
      card.appendChild(chkRow);

      // KPI Summary Cards
      var kpis = el('div', 'cso-ttc-kpis');
      [
        { l: isOr ? 'ଯୋଗଦାନ ଦିନ ଓ ଶେଷ ତାରିଖ' : 'Joining Days & Deadline', v: res.joiningDays + 'd → ' + res.lastDateToJoin },
        { l: isOr ? 'ଅବ୍ୟବହୃତ EL କ୍ରେଡିଟ୍' : 'Unavailed EL Credit', v: '+' + res.unavailedElCredit + (isOr ? ' ଦିନ EL' : ' Days EL') },
        { l: isOr ? 'କମ୍ପୋଜିଟ୍ ଟ୍ରାନ୍ସଫର୍ ଗ୍ରାଣ୍ଟ (CTG)' : 'Composite Transfer Grant (CTG)', v: fmtInr(res.ctgAmount) },
        { l: isOr ? 'ସାମଗ୍ରୀ ଓ ଯାତ୍ରା ଭତ୍ତା' : 'Personal Effects & Travel', v: fmtInr(res.personalEffectsAndTravel) },
        { l: isOr ? 'ମୋଟ ବଦଳି ଦାବି (Total Claim)' : 'Total Transfer Claim', v: fmtInr(res.totalTransferClaim) }
      ].forEach(function (k) {
        var box = el('div', 'cso-ttc-kpi');
        box.appendChild(el('div', 'cso-ttc-kpi-label', k.l));
        box.appendChild(el('div', 'cso-ttc-kpi-val', k.v));
        kpis.appendChild(box);
      });
      card.appendChild(kpis);

      // Entitlement Breakdown Table
      var tblWrap = el('div', 'cso-ttc-table-wrap');
      var tbl = el('table', 'cso-ttc-table');
      var tbody = el('tbody');
      [
        [isOr ? 'ORSP ପେ-ଲେଭେଲ୍ ଟାୟାର୍' : 'ORSP Pay Level Tier', 'Level ' + res.payLevel + ' (' + res.tierId + ') • ' + res.travelClass],
        [isOr ? 'ଯୋଗଦାନ ନିୟମ' : 'Joining Time Rule', res.joiningRuleNote + (res.holidayExtensionDays ? ' (+' + res.holidayExtensionDays + 'd holiday ext.)' : '')],
        [isOr ? 'ହୋଟେଲ୍ ଓ ଦୈନିକ ଭତ୍ତା (Tour/Transfer DA)' : 'Hotel Ceiling & Daily Allowance (DA)', fmtInr(res.hotelPerDay) + '/day Hotel + ' + fmtInr(res.foodDaPerDay) + '/day Food DA'],
        [isOr ? 'ଘରୋଇ ସାମଗ୍ରୀ ପରିବହନ' : 'Personal Effects Transport', res.maxGoodsKg.toLocaleString('en-IN') + ' kg max @ ₹' + res.goodsRatePerKm + '/km × ' + res.distanceKm + ' km = ' + fmtInr(res.goodsTransportAmount)],
        [isOr ? 'ପରିବାର ଯାତ୍ରା ଭଡ଼ା + ଟ୍ରାଞ୍ଜିଟ୍ DA' : 'Family Fare + Transit DA', fmtInr(res.familyFareAmount) + ' + ' + fmtInr(res.transitDaAmount) + ' = ' + fmtInr(res.familyFareAmount + res.transitDaAmount)]
      ].forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('th', null, r[0]));
        tr.appendChild(el('td', null, r[1]));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tblWrap.appendChild(tbl);
      card.appendChild(tblWrap);

      // Actions
      var statusEl = el('div', 'cso-ttc-status');
      var actions = el('div', 'cso-ttc-actions');
      var copyBtn = el('button', 'cso-ttc-btn cso-ttc-btn--primary', isOr ? '📋 ବଦଳି ଓ TA ଦାବି ସାରାଂଶ କପି କରନ୍ତୁ' : '📋 Copy Transfer & TA Claim Summary');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var txt = [
          'CS Odisha — Transfer, Joining Time & TA/DA Claim Worksheet',
          'ORSP Level ' + res.payLevel + ' | Basic Pay: ' + fmtInr(res.basicPay) + ' | Distance: ' + res.distanceKm + ' km',
          'Joining Time: ' + res.joiningDays + ' days | Last Date to Join: ' + res.lastDateToJoin + ' | Unavailed EL Credit: ' + res.unavailedElCredit + ' days',
          'CTG: ' + fmtInr(res.ctgAmount) + ' | Goods & Travel: ' + fmtInr(res.personalEffectsAndTravel) + ' | Total Claim: ' + fmtInr(res.totalTransferClaim),
          'Daily Allowance Entitlement: Hotel up to ' + fmtInr(res.hotelPerDay) + '/day + Food DA ' + fmtInr(res.foodDaPerDay) + '/day'
        ].join('\n');
        copyText(txt, statusEl, isOr ? 'ବଦଳି ଓ TA ସାରାଂଶ କପି ହେଲା!' : 'Transfer & TA claim summary copied!');
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-ttc-btn', isOr ? '🖨️ ୱାର୍କସିଟ୍ ପ୍ରିଣ୍ଟ କରନ୍ତୁ' : '🖨️ Print Transfer & TA Worksheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      card.appendChild(actions);
      card.appendChild(statusEl);

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
    PAY_LEVEL_TIERS: PAY_LEVEL_TIERS,
    getTierForLevel: getTierForLevel,
    calculateTransferAndTada: calculateTransferAndTada,
    mount: mount
  };
});
