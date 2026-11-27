/**
 * Common Sense Odisha — Interactive Odisha Govt Employee Income Tax
 * (FY 2026–27 New vs. Old Regime) & GPF / NPS / UPS Take-Home Estimator (v429)
 * Mounted on /career-paths/ (#cso-income-tax-takehome-root).
 * Integrated with ORSP 7th Pay Matrix (Level 1–17) & synced with cso_orsp_salary_prefs_v1.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * discrete CSS bars (cso-vfv-bar--w*); bilingual EN / ଓଡ଼ିଆ.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOIncomeTaxTakehomeEstimator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOIncomeTaxTakehomeEstimator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v429';
  var ROOT_ID = 'cso-income-tax-takehome-root';
  var PREFS_KEY = 'cso_income_tax_prefs_v1';
  var ORSP_PREFS_KEY = 'cso_orsp_salary_prefs_v1';

  var ORSP_LEVELS = [
    { level: 1, entryBasic: 16600, en: 'Level 1 (₹16,600) — Group-D / Peon', or: 'ସ୍ତର-୧ (₹୧୬,୬୦୦) — ଗ୍ରୁପ୍-ଡି' },
    { level: 2, entryBasic: 17200, en: 'Level 2 (₹17,200) — Attendant / Helper', or: 'ସ୍ତର-୨ (₹୧୭,୨୦୦)' },
    { level: 3, entryBasic: 18000, en: 'Level 3 (₹18,000) — Multi-Tasking / Guard', or: 'ସ୍ତର-୩ (₹୧୮,୦୦୦)' },
    { level: 4, entryBasic: 19900, en: 'Level 4 (₹19,900) — Junior Assistant / PEO / Amin', or: 'ସ୍ତର-୪ (₹୧୯,୯୦୦) — କନିଷ୍ଠ ସହାୟକ / PEO' },
    { level: 5, entryBasic: 21700, en: 'Level 5 (₹21,700) — Constable / Forest Guard', or: 'ସ୍ତର-୫ (₹୨୧,୭୦୦) — କନଷ୍ଟେବଲ୍' },
    { level: 6, entryBasic: 23600, en: 'Level 6 (₹23,600) — Senior Clerk / Technician', or: 'ସ୍ତର-୬ (₹୨୩,୬୦୦)' },
    { level: 7, entryBasic: 25500, en: 'Level 7 (₹25,500) — Revenue Inspector (RI) / Nurse', or: 'ସ୍ତର-୭ (₹୨୫,୫୦୦) — ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI)' },
    { level: 8, entryBasic: 29200, en: 'Level 8 (₹29,200) — ASO Entry / Senior Asst', or: 'ସ୍ତର-୮ (₹୨୯,୨୦୦)' },
    { level: 9, entryBasic: 35400, en: 'Level 9 (₹35,400) — TGT Teacher / OSSC CGL / SI Police', or: 'ସ୍ତର-୯ (₹୩୫,୪୦୦) — TGT ଶିକ୍ଷକ / OSSC CGL' },
    { level: 10, entryBasic: 44900, en: 'Level 10 (₹44,900) — PGT / OAVS / ASO / Lecturer', or: 'ସ୍ତର-୧୦ (₹୪୪,୯୦୦) — PGT / OAVS / ASO' },
    { level: 11, entryBasic: 47600, en: 'Level 11 (₹47,600) — Assistant Professor / Senior Officer', or: 'ସ୍ତର-୧୧ (₹୪୭,୬୦୦) — ସହକାରୀ ପ୍ରଫେସର' },
    { level: 12, entryBasic: 56100, en: 'Level 12 (₹56,100) — OAS / OFS / OPS Group-A', or: 'ସ୍ତର-୧୨ (₹୫୬,୧୦୦) — OAS / OFS / OPS' },
    { level: 13, entryBasic: 67700, en: 'Level 13 (₹67,700) — Senior Scale Group-A', or: 'ସ୍ତର-୧୩ (₹୬୭,୭୦୦)' },
    { level: 14, entryBasic: 78800, en: 'Level 14 (₹78,800) — Deputy Secretary / Joint Director', or: 'ସ୍ତର-୧୪ (₹୭୮,୮୦୦)' },
    { level: 15, entryBasic: 123100, en: 'Level 15 (₹1,23,100) — Additional Secretary / Director', or: 'ସ୍ତର-୧୫ (₹୧,୨୩,୧୦୦)' },
    { level: 16, entryBasic: 127100, en: 'Level 16 (₹1,27,100) — Special Secretary', or: 'ସ୍ତର-୧୬ (₹୧,୨୭,୧୦୦)' },
    { level: 17, entryBasic: 135100, en: 'Level 17 (₹1,35,100) — Senior Administrative Grade', or: 'ସ୍ତର-୧୭ (₹୧,୩୫,୧୦୦)' }
  ];

  var HRA_TIERS = [
    { rate: 20, en: '20% — X/Y Cities (Bhubaneswar, Cuttack, Rourkela, Berhampur, Sambalpur)', or: '୨୦% — X/Y ସହର (ଭୁବନେଶ୍ୱର, କଟକ, ରାଉରକେଲା, ବ୍ରହ୍ମପୁର, ସମ୍ବଲପୁର)' },
    { rate: 10, en: '10% — Z Tier (Other District HQs, Blocks & Rural Odisha)', or: '୧୦% — Z ଶ୍ରେଣୀ (ଅନ୍ୟାନ୍ୟ ଜିଲ୍ଲା, ବ୍ଲକ୍ ଓ ଗ୍ରାମାଞ୍ଚଳ)' },
    { rate: 0, en: '0% — Govt Quarters Allotted', or: '୦% — ସରକାରୀ କ୍ୱାର୍ଟର୍ସ ଆବଣ୍ଟିତ' }
  ];

  var PENSION_TRACKS = [
    {
      id: 'nps',
      en: 'NPS (10% Employee + 14% Odisha Govt u/s 80CCD(2))',
      or: 'NPS (୧୦% କର୍ମଚାରୀ + ୧୪% ଓଡ଼ିଶା ସରକାର u/s 80CCD(2))'
    },
    {
      id: 'ups',
      en: 'UPS — Unified Pension Scheme (10% Emp + 10% Ind / 18.5% Govt Pool)',
      or: 'UPS — ଏକୀକୃତ ପେନସନ୍ ଯୋଜନା (୧୦% କର୍ମଚାରୀ + ୧୦% ବ୍ୟକ୍ତିଗତ / ୧୮.୫% ସରକାରୀ)'
    },
    {
      id: 'gpf',
      en: 'GPF / Pre-2005 Old Pension Staff (Custom Monthly GPF ₹)',
      or: 'GPF / ୨୦୦୫ ପୂର୍ବ ପୁରୁଣା ପେନସନ୍ (ଇଚ୍ଛାଧୀନ ମାସିକ GPF ₹)'
    }
  ];

  function getLevelBasic(level) {
    var lv = Math.max(1, Math.min(17, parseInt(level, 10) || 9));
    for (var i = 0; i < ORSP_LEVELS.length; i += 1) {
      if (ORSP_LEVELS[i].level === lv) return ORSP_LEVELS[i].entryBasic;
    }
    return 35400;
  }

  function clampNum(v, min, max, fallback) {
    var n = Number(v);
    if (!isFinite(n)) return fallback;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return Math.round(n);
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
  }

  /**
   * Odisha State Professional Tax (PT) statutory slabs:
   * - Annual Gross <= ₹1,60,000: ₹0/yr
   * - ₹1,60,001 to ₹3,00,000: ₹1,500/yr (₹125/mo)
   * - Above ₹3,00,000: ₹2,500/yr (₹200/mo x 11 + ₹300 in Feb)
   */
  function computeOdishaProfessionalTax(annualGross) {
    var gross = Math.max(0, Math.round(Number(annualGross) || 0));
    if (gross <= 160000) {
      return { annual: 0, monthlyAvg: 0, regularMonth: 0, febMonth: 0, slabLabel: 'Exempt (≤ ₹1.60L/yr)' };
    }
    if (gross <= 300000) {
      return { annual: 1500, monthlyAvg: 125, regularMonth: 125, febMonth: 125, slabLabel: '₹1,500/yr (₹125/mo)' };
    }
    return { annual: 2500, monthlyAvg: 208, regularMonth: 200, febMonth: 300, slabLabel: '₹2,500/yr (₹200×11 + ₹300 Feb)' };
  }

  function computeNewRegimeSlabTax(taxableIncome) {
    var inc = Math.max(0, Math.round(Number(taxableIncome) || 0));
    var tax = 0;
    if (inc > 2400000) {
      tax += (inc - 2400000) * 0.30;
      inc = 2400000;
    }
    if (inc > 2000000) {
      tax += (inc - 2000000) * 0.25;
      inc = 2000000;
    }
    if (inc > 1600000) {
      tax += (inc - 1600000) * 0.20;
      inc = 1600000;
    }
    if (inc > 1200000) {
      tax += (inc - 1200000) * 0.15;
      inc = 1200000;
    }
    if (inc > 800000) {
      tax += (inc - 800000) * 0.10;
      inc = 800000;
    }
    if (inc > 400000) {
      tax += (inc - 400000) * 0.05;
    }
    return Math.round(tax);
  }

  function computeOldRegimeSlabTax(taxableIncome) {
    var inc = Math.max(0, Math.round(Number(taxableIncome) || 0));
    var tax = 0;
    if (inc > 1000000) {
      tax += (inc - 1000000) * 0.30;
      inc = 1000000;
    }
    if (inc > 500000) {
      tax += (inc - 500000) * 0.20;
      inc = 500000;
    }
    if (inc > 250000) {
      tax += (inc - 250000) * 0.05;
    }
    return Math.round(tax);
  }

  /**
   * Exact FY 2026–27 (AY 2027–28) Income Tax & Take-Home Comparison Engine
   */
  function calculateFy2026TaxComparison(input) {
    var p = input || {};
    var level = clampNum(p.level !== undefined ? p.level : 9, 1, 17, 9);
    var customBasic = Number(p.customBasic);
    var basic = (isFinite(customBasic) && customBasic > 0) ? Math.round(customBasic) : getLevelBasic(level);
    var daRate = p.daRate !== undefined && p.daRate !== '' ? Number(p.daRate) : 63;
    if (!isFinite(daRate) || daRate < 0) daRate = 63;
    var hraRate = p.hraRate !== undefined && p.hraRate !== '' ? Number(p.hraRate) : 20;
    if (!isFinite(hraRate) || hraRate < 0) hraRate = 20;
    var monthlyAllowances = clampNum(p.monthlyAllowances !== undefined ? p.monthlyAllowances : 0, 0, 500000, 0);

    var daMonthly = Math.round((basic * daRate) / 100);
    var hraMonthly = Math.round((basic * hraRate) / 100);
    var grossMonthly = basic + daMonthly + hraMonthly + monthlyAllowances;
    var annualGross = grossMonthly * 12;

    var rawTrack = String(p.pensionTrack || 'nps').toLowerCase();
    var pensionTrack = (rawTrack === 'ups' || rawTrack === 'gpf') ? rawTrack : 'nps';
    var customMonthlyGpf = clampNum(
      p.customMonthlyGpf !== undefined && p.customMonthlyGpf !== '' ? p.customMonthlyGpf : Math.round(basic * 0.10),
      0,
      500000,
      Math.round(basic * 0.10)
    );

    var employeePensionMonthly = pensionTrack === 'gpf'
      ? customMonthlyGpf
      : Math.round((basic + daMonthly) * 0.10);
    var employeePensionAnnual = employeePensionMonthly * 12;

    // Section 80CCD(2) Employer contribution deductible in BOTH New & Old Regimes:
    // NPS: 14% of (Basic + DA); UPS: 10% individual corpus (with 8.5% govt pool = 18.5% total); GPF: 0
    var employer80CCD2Monthly = pensionTrack === 'nps'
      ? Math.round((basic + daMonthly) * 0.14)
      : (pensionTrack === 'ups' ? Math.round((basic + daMonthly) * 0.10) : 0);
    var employer80CCD2Annual = employer80CCD2Monthly * 12;
    var upsGovtPoolMonthly = pensionTrack === 'ups' ? Math.round((basic + daMonthly) * 0.085) : 0;
    var employerTotalGovtMonthly = employer80CCD2Monthly + upsGovtPoolMonthly;

    // Odisha Professional Tax
    var pt = computeOdishaProfessionalTax(annualGross);

    // Old Regime deductions (capped at statutory limits)
    var ded80C = clampNum(p.ded80C !== undefined ? p.ded80C : 150000, 0, 150000, 150000);
    var ded80CCD1B = clampNum(p.ded80CCD1B !== undefined ? p.ded80CCD1B : 0, 0, 50000, 0);
    var ded80D = clampNum(p.ded80D !== undefined ? p.ded80D : 25000, 0, 75000, 25000);
    var hraOr24b = clampNum(p.hraOr24b !== undefined ? p.hraOr24b : 0, 0, 200000, 0);

    // --- NEW TAX REGIME (FY 2026–27 / Income-tax Act, 2025) ---
    var newStdDed = 75000;
    var newTotalDeductions = newStdDed + employer80CCD2Annual;
    var newTaxableIncome = Math.max(0, annualGross - newTotalDeductions);
    var newSlabTax = computeNewRegimeSlabTax(newTaxableIncome);
    var newRebate87A = 0;
    var newMarginalRelief = 0;
    var newTaxBeforeCess = newSlabTax;

    if (newTaxableIncome <= 1200000) {
      newRebate87A = Math.min(newSlabTax, 60000);
      newTaxBeforeCess = Math.max(0, newSlabTax - newRebate87A);
    } else {
      var excessOver12L = newTaxableIncome - 1200000;
      if (newSlabTax > excessOver12L) {
        newMarginalRelief = newSlabTax - excessOver12L;
        newTaxBeforeCess = excessOver12L;
      }
    }
    var newCess = Math.round(newTaxBeforeCess * 0.04);
    var newTotalTax = newTaxBeforeCess + newCess;
    var newMonthlyTds = Math.round(newTotalTax / 12);

    // --- OLD TAX REGIME (FY 2026–27 Optional) ---
    var oldStdDed = 50000;
    var oldTotalDeductions = oldStdDed + pt.annual + hraOr24b + ded80C + ded80CCD1B + employer80CCD2Annual + ded80D;
    var oldTaxableIncome = Math.max(0, annualGross - oldTotalDeductions);
    var oldSlabTax = computeOldRegimeSlabTax(oldTaxableIncome);
    var oldRebate87A = 0;
    var oldTaxBeforeCess = oldSlabTax;
    if (oldTaxableIncome <= 500000) {
      oldRebate87A = Math.min(oldSlabTax, 12500);
      oldTaxBeforeCess = Math.max(0, oldSlabTax - oldRebate87A);
    }
    var oldCess = Math.round(oldTaxBeforeCess * 0.04);
    var oldTotalTax = oldTaxBeforeCess + oldCess;
    var oldMonthlyTds = Math.round(oldTotalTax / 12);

    // Monthly Net In-Hand Breakdown
    var monthlyTotalDedNew = employeePensionMonthly + pt.monthlyAvg + newMonthlyTds;
    var monthlyTotalDedOld = employeePensionMonthly + pt.monthlyAvg + oldMonthlyTds;
    var monthlyNetNew = Math.max(0, grossMonthly - monthlyTotalDedNew);
    var monthlyNetOld = Math.max(0, grossMonthly - monthlyTotalDedOld);

    var recommended = 'equal';
    if (newTotalTax < oldTotalTax) recommended = 'new';
    else if (oldTotalTax < newTotalTax) recommended = 'old';
    var annualSavings = Math.abs(oldTotalTax - newTotalTax);
    var monthlySavings = Math.round(annualSavings / 12);

    var maxTax = Math.max(newTotalTax, oldTotalTax, 1);
    var newTaxBarStep = newTotalTax === 0 ? 0 : quantizeStep((newTotalTax / maxTax) * 100);
    var oldTaxBarStep = oldTotalTax === 0 ? 0 : quantizeStep((oldTotalTax / maxTax) * 100);
    var newNetBarStep = grossMonthly > 0 ? quantizeStep((monthlyNetNew / grossMonthly) * 100) : 0;
    var oldNetBarStep = grossMonthly > 0 ? quantizeStep((monthlyNetOld / grossMonthly) * 100) : 0;

    return {
      level: level,
      basic: basic,
      daRate: daRate,
      daMonthly: daMonthly,
      hraRate: hraRate,
      hraMonthly: hraMonthly,
      monthlyAllowances: monthlyAllowances,
      grossMonthly: grossMonthly,
      annualGross: annualGross,
      pensionTrack: pensionTrack,
      employeePensionMonthly: employeePensionMonthly,
      employeePensionAnnual: employeePensionAnnual,
      employer80CCD2Monthly: employer80CCD2Monthly,
      employer80CCD2Annual: employer80CCD2Annual,
      upsGovtPoolMonthly: upsGovtPoolMonthly,
      employerTotalGovtMonthly: employerTotalGovtMonthly,
      professionalTax: pt,
      oldInputs: {
        ded80C: ded80C,
        ded80CCD1B: ded80CCD1B,
        ded80D: ded80D,
        hraOr24b: hraOr24b
      },
      newRegime: {
        standardDeduction: newStdDed,
        ded80CCD2: employer80CCD2Annual,
        totalDeductions: newTotalDeductions,
        taxableIncome: newTaxableIncome,
        slabTax: newSlabTax,
        rebate87A: newRebate87A,
        marginalRelief: newMarginalRelief,
        taxBeforeCess: newTaxBeforeCess,
        cess: newCess,
        totalTax: newTotalTax,
        monthlyTds: newMonthlyTds,
        monthlyTotalDeductions: monthlyTotalDedNew,
        monthlyNetInHand: monthlyNetNew,
        annualNetInHand: Math.max(0, annualGross - employeePensionAnnual - pt.annual - newTotalTax),
        taxBarStep: newTaxBarStep,
        netBarStep: newNetBarStep
      },
      oldRegime: {
        standardDeduction: oldStdDed,
        professionalTaxDeduction: pt.annual,
        ded80C: ded80C,
        ded80CCD1B: ded80CCD1B,
        ded80CCD2: employer80CCD2Annual,
        ded80D: ded80D,
        hraOr24b: hraOr24b,
        totalDeductions: oldTotalDeductions,
        taxableIncome: oldTaxableIncome,
        slabTax: oldSlabTax,
        rebate87A: oldRebate87A,
        taxBeforeCess: oldTaxBeforeCess,
        cess: oldCess,
        totalTax: oldTotalTax,
        monthlyTds: oldMonthlyTds,
        monthlyTotalDeductions: monthlyTotalDedOld,
        monthlyNetInHand: monthlyNetOld,
        annualNetInHand: Math.max(0, annualGross - employeePensionAnnual - pt.annual - oldTotalTax),
        taxBarStep: oldTaxBarStep,
        netBarStep: oldNetBarStep
      },
      recommended: recommended,
      annualSavings: annualSavings,
      monthlySavings: monthlySavings
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

  function getInitialState() {
    var saved = loadJson(PREFS_KEY);
    var orsp = loadJson(ORSP_PREFS_KEY);
    var base = {
      lang: 'en',
      level: 9,
      customBasic: '',
      daRate: 63,
      hraRate: 20,
      monthlyAllowances: 0,
      pensionTrack: 'nps',
      customMonthlyGpf: 3540,
      ded80C: 150000,
      ded80CCD1B: 0,
      ded80D: 25000,
      hraOr24b: 0
    };
    if (orsp && typeof orsp === 'object') {
      if (orsp.level >= 1 && orsp.level <= 17) base.level = parseInt(orsp.level, 10);
      if (orsp.daRate !== undefined && isFinite(Number(orsp.daRate))) base.daRate = Number(orsp.daRate);
      if (orsp.otherAllowances !== undefined && isFinite(Number(orsp.otherAllowances))) base.monthlyAllowances = Math.max(0, Math.round(Number(orsp.otherAllowances)));
      if (orsp.scheme === 'gpf') base.pensionTrack = 'gpf';
      if (orsp.customBasic) base.customBasic = String(orsp.customBasic);
    }
    if (saved && typeof saved === 'object') {
      Object.keys(base).forEach(function (k) {
        if (saved[k] !== undefined) base[k] = saved[k];
      });
    }
    return base;
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

  function buildSummaryText(calc) {
    var recLabel = calc.recommended === 'new'
      ? ('New Tax Regime (Saves ' + fmtInr(calc.annualSavings) + '/yr)')
      : (calc.recommended === 'old'
        ? ('Old Tax Regime (Saves ' + fmtInr(calc.annualSavings) + '/yr)')
        : 'Equal Tax Liability in Both Regimes');
    return [
      'CS Odisha — FY 2026–27 Income Tax & Take-Home Salary Estimate (ORSP Level ' + calc.level + ')',
      'Basic Pay: ' + fmtInr(calc.basic) + ' | DA (' + calc.daRate + '%): ' + fmtInr(calc.daMonthly) + ' | HRA (' + calc.hraRate + '%): ' + fmtInr(calc.hraMonthly),
      'Monthly Gross: ' + fmtInr(calc.grossMonthly) + ' | Annual Gross: ' + fmtInr(calc.annualGross),
      'Pension Track: ' + calc.pensionTrack.toUpperCase() + ' (Employee: ' + fmtInr(calc.employeePensionMonthly) + '/mo | Govt 80CCD(2): ' + fmtInr(calc.employer80CCD2Annual) + '/yr)',
      'Odisha Professional Tax: ' + calc.professionalTax.slabLabel,
      '--- NEW TAX REGIME (FY 2026–27 Default) ---',
      'Taxable Income: ' + fmtInr(calc.newRegime.taxableIncome) + ' | Annual Tax (incl. 4% Cess): ' + fmtInr(calc.newRegime.totalTax) + ' | Monthly TDS: ' + fmtInr(calc.newRegime.monthlyTds),
      'Monthly Net In-Hand (New): ' + fmtInr(calc.newRegime.monthlyNetInHand),
      '--- OLD TAX REGIME (Optional) ---',
      'Taxable Income: ' + fmtInr(calc.oldRegime.taxableIncome) + ' | Annual Tax (incl. 4% Cess): ' + fmtInr(calc.oldRegime.totalTax) + ' | Monthly TDS: ' + fmtInr(calc.oldRegime.monthlyTds),
      'Monthly Net In-Hand (Old): ' + fmtInr(calc.oldRegime.monthlyNetInHand),
      'Recommended: ' + recLabel,
      'Estimate yours: https://csodisha.com/career-paths/#cso-income-tax-takehome-root'
    ].join('\n');
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = getInitialState();

    function persistAndRender() {
      saveJson(PREFS_KEY, state);
      render();
    }

    function addField(parent, labelText, controlEl, hintText) {
      var box = el('div', 'cso-itt-field');
      var lbl = el('label', 'cso-itt-label', labelText);
      if (controlEl.id) lbl.setAttribute('for', controlEl.id);
      box.appendChild(lbl);
      box.appendChild(controlEl);
      if (hintText) box.appendChild(el('span', 'cso-itt-hint', hintText));
      parent.appendChild(box);
      return box;
    }

    function render() {
      var orMode = state.lang === 'or';
      var calc = calculateFy2026TaxComparison(state);

      var card = el('div', 'cso-itt-card');
      card.setAttribute('data-cso-income-tax-estimator', '1');

      // Header
      var head = el('div', 'cso-itt-head');
      var headCopy = el('div', 'cso-itt-head-copy');
      headCopy.appendChild(el('div', 'cso-itt-eyebrow', orMode
        ? '🧾 FY 2026–27 ଆୟକର (ନୂଆ ବନାମ ପୁରୁଣା) ଓ ନେଟ୍ ଦରମା କାଲକୁଲେଟର'
        : '🧾 FY 2026–27 (AY 2027–28) INCOME TAX & NET TAKE-HOME ESTIMATOR'));
      headCopy.appendChild(el('h2', 'cso-itt-title', orMode
        ? 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀ ଆୟକର ଓ GPF / NPS / UPS ଇନ୍-ହ୍ୟାଣ୍ଡ୍ ସାଲାରୀ'
        : 'Odisha Govt Employee Income Tax (New vs. Old) & GPF/NPS/UPS Take-Home'));
      headCopy.appendChild(el('p', 'cso-itt-sub', orMode
        ? '₹75,000 ଷ୍ଟାଣ୍ଡାର୍ଡ ଡିଡକ୍ସନ୍, ₹12 ଲକ୍ଷ ଜିରୋ-ଟ୍ୟାକ୍ସ ରିବେଟ୍, 80CCD(2) ସରକାରୀ NPS/UPS ଯୋଗଦାନ ଓ ଓଡ଼ିଶା ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ (₹2,500/ବର୍ଷ) ସହିତ ନୂଆ ଓ ପୁରୁଣା ଟ୍ୟାକ୍ସ ତୁଳନା କରନ୍ତୁ।'
        : 'Compare FY 2026–27 New Regime (₹75,000 Std Deduction, ₹12L Zero-Tax Rebate & 14% Govt 80CCD(2)) against Old Regime (80C, 80CCD(1B), 80D, HRA/24b & Odisha PT ₹2,500/yr).'));
      head.appendChild(headCopy);

      var headCtl = el('div', 'cso-itt-head-ctl');
      var langToggle = el('div', 'cso-itt-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-itt-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () {
          state.lang = lk;
          persistAndRender();
        });
        langToggle.appendChild(lb);
      });
      headCtl.appendChild(langToggle);
      head.appendChild(headCtl);
      card.appendChild(head);

      // Verdict Banner
      var verdictCls = 'cso-itt-verdict' + (calc.recommended === 'new' ? ' cso-itt-verdict--new' : (calc.recommended === 'old' ? ' cso-itt-verdict--old' : ' cso-itt-verdict--equal'));
      var verdict = el('div', verdictCls);
      verdict.setAttribute('role', 'status');
      verdict.setAttribute('aria-live', 'polite');
      var verdictBadgeText = calc.recommended === 'new'
        ? (orMode ? '✅ ନୂଆ ଟ୍ୟାକ୍ସ ବ୍ୟବସ୍ଥା ବାର୍ଷିକ ' + fmtInr(calc.annualSavings) + ' ସଞ୍ଚୟ କରୁଛି' : '✅ New Tax Regime Saves ' + fmtInr(calc.annualSavings) + '/yr (' + fmtInr(calc.monthlySavings) + '/mo)')
        : (calc.recommended === 'old'
          ? (orMode ? '✅ ପୁରୁଣା ଟ୍ୟାକ୍ସ ବ୍ୟବସ୍ଥା ବାର୍ଷିକ ' + fmtInr(calc.annualSavings) + ' ସଞ୍ଚୟ କରୁଛି' : '✅ Old Tax Regime Saves ' + fmtInr(calc.annualSavings) + '/yr (' + fmtInr(calc.monthlySavings) + '/mo)')
          : (orMode ? '⚖️ ଉଭୟ ଟ୍ୟାକ୍ସ ବ୍ୟବସ୍ଥାରେ ସମାନ ଟ୍ୟାକ୍ସ (' + fmtInr(calc.newRegime.totalTax) + '/ବର୍ଷ)' : '⚖️ Equal Tax Liability (' + fmtInr(calc.newRegime.totalTax) + '/yr)'));
      verdict.appendChild(el('strong', 'cso-itt-verdict-badge', verdictBadgeText));
      var verdictSubText = calc.newRegime.totalTax === 0 && calc.newRegime.taxableIncome <= 1200000
        ? (orMode
          ? 'ଆପଣଙ୍କ ନୂଆ ବ୍ୟବସ୍ଥା ଟ୍ୟାକ୍ସଯୋଗ୍ୟ ଆୟ (' + fmtInr(calc.newRegime.taxableIncome) + ') ₹12,00,000 ମଧ୍ୟରେ ଥିବାରୁ ଧାରା 87A/156 ଅନୁଯାୟୀ ସମ୍ପୂର୍ଣ୍ଣ ଜିରୋ ଟ୍ୟାକ୍ସ।'
          : 'Zero Tax under New Regime u/s 87A/156 — taxable income (' + fmtInr(calc.newRegime.taxableIncome) + ') is within ₹12,00,000 after ₹75,000 standard deduction & 80CCD(2).')
        : (calc.newRegime.marginalRelief > 0
          ? (orMode
            ? '₹12 ଲକ୍ଷ ଉପରେ ମାର୍ଜିନାଲ୍ ରିଲିଫ୍ ଲାଗୁ ହୋଇଛି: ' + fmtInr(calc.newRegime.marginalRelief) + ' ଟ୍ୟାକ୍ସ ଛାଡ଼।'
            : 'Marginal Relief applied just above ₹12,00,000 in New Regime: ' + fmtInr(calc.newRegime.marginalRelief) + ' tax saved before 4% cess.')
          : (orMode
            ? 'ବାର୍ଷିକ ମୋଟ ଦରମା: ' + fmtInr(calc.annualGross) + ' | ଓଡ଼ିଶା ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ: ' + calc.professionalTax.slabLabel
            : 'Annual Gross Salary: ' + fmtInr(calc.annualGross) + ' | Odisha Professional Tax: ' + calc.professionalTax.slabLabel));
      verdict.appendChild(el('span', 'cso-itt-verdict-sub', verdictSubText));
      card.appendChild(verdict);

      // Form Section 1: ORSP Salary & Pension Track
      var formSection = el('div', 'cso-itt-form-wrap');
      formSection.appendChild(el('h3', 'cso-itt-sec-title', orMode ? '୧. ORSP ବେତନ ଓ ପେନସନ୍ / GPF ବିବରଣୀ' : '1. ORSP Salary & Pension / GPF Track'));
      var grid1 = el('div', 'cso-itt-grid');

      // Level select
      var levelSel = el('select', 'cso-itt-input');
      levelSel.id = 'cso-itt-level';
      ORSP_LEVELS.forEach(function (lv) {
        var opt = el('option', '', orMode ? lv.or : lv.en);
        opt.value = String(lv.level);
        if (lv.level === state.level) opt.selected = true;
        levelSel.appendChild(opt);
      });
      levelSel.addEventListener('change', function () {
        state.level = parseInt(levelSel.value, 10) || 9;
        state.customBasic = '';
        if (state.pensionTrack === 'gpf') {
          state.customMonthlyGpf = Math.round(getLevelBasic(state.level) * 0.10);
        }
        persistAndRender();
      });
      addField(grid1, orMode ? 'ORSP ପେ-ଲେଭେଲ୍ (ସ୍ତର ୧–୧୭)' : 'ORSP Pay Level (Level 1–17)', levelSel);

      // Custom Basic Pay
      var basicInp = el('input', 'cso-itt-input');
      basicInp.id = 'cso-itt-basic';
      basicInp.type = 'number';
      basicInp.min = '0';
      basicInp.step = '100';
      basicInp.placeholder = String(getLevelBasic(state.level));
      basicInp.value = state.customBasic !== '' ? String(state.customBasic) : '';
      basicInp.addEventListener('change', function () {
        state.customBasic = basicInp.value.trim();
        persistAndRender();
      });
      addField(grid1, orMode ? 'ମାସିକ ମୂଳ ବେତନ (ଇଚ୍ଛାଧୀନ ₹)' : 'Monthly Basic Pay (Optional Override ₹)', basicInp, orMode ? 'ଖାଲି ରଖିଲେ ସ୍ତରର ପ୍ରବେଶ ବେତନ (' + fmtInr(getLevelBasic(state.level)) + ')' : 'Blank uses level entry basic (' + fmtInr(getLevelBasic(state.level)) + ')');

      // DA %
      var daInp = el('input', 'cso-itt-input');
      daInp.id = 'cso-itt-da';
      daInp.type = 'number';
      daInp.min = '0';
      daInp.max = '150';
      daInp.step = '1';
      daInp.value = String(state.daRate);
      daInp.addEventListener('change', function () {
        state.daRate = Math.max(0, Number(daInp.value) || 0);
        persistAndRender();
      });
      addField(grid1, orMode ? 'ବର୍ତ୍ତମାନ DA (%)' : 'Current DA (%)', daInp, orMode ? 'ଡିଫଲ୍ଟ 63% (ORSP 2026)' : 'Default 63% Odisha DA');

      // HRA City Tier
      var hraSel = el('select', 'cso-itt-input');
      hraSel.id = 'cso-itt-hra';
      HRA_TIERS.forEach(function (ht) {
        var opt = el('option', '', orMode ? ht.or : ht.en);
        opt.value = String(ht.rate);
        if (ht.rate === Number(state.hraRate)) opt.selected = true;
        hraSel.appendChild(opt);
      });
      hraSel.addEventListener('change', function () {
        state.hraRate = Number(hraSel.value) || 0;
        persistAndRender();
      });
      addField(grid1, orMode ? 'HRA ସହର ଶ୍ରେଣୀ' : 'HRA City Tier', hraSel);

      // Monthly Allowances
      var allowInp = el('input', 'cso-itt-input');
      allowInp.id = 'cso-itt-allow';
      allowInp.type = 'number';
      allowInp.min = '0';
      allowInp.step = '100';
      allowInp.value = String(state.monthlyAllowances);
      allowInp.addEventListener('change', function () {
        state.monthlyAllowances = Math.max(0, Math.round(Number(allowInp.value) || 0));
        persistAndRender();
      });
      addField(grid1, orMode ? 'ଅନ୍ୟାନ୍ୟ ମାସିକ ଭତ୍ତା (TA / Medical ₹)' : 'Monthly Allowances (TA / Medical / Other ₹)', allowInp);

      // Pension Track
      var trackSel = el('select', 'cso-itt-input');
      trackSel.id = 'cso-itt-track';
      PENSION_TRACKS.forEach(function (ptItem) {
        var opt = el('option', '', orMode ? ptItem.or : ptItem.en);
        opt.value = ptItem.id;
        if (ptItem.id === state.pensionTrack) opt.selected = true;
        trackSel.appendChild(opt);
      });
      trackSel.addEventListener('change', function () {
        state.pensionTrack = trackSel.value;
        persistAndRender();
      });
      addField(grid1, orMode ? 'ପେନସନ୍ ଓ ପ୍ରୋଭିଡେଣ୍ଟ ଫଣ୍ଡ ଟ୍ରାକ୍' : 'Pension & Provident Fund Track', trackSel);

      if (state.pensionTrack === 'gpf') {
        var gpfInp = el('input', 'cso-itt-input');
        gpfInp.id = 'cso-itt-gpf';
        gpfInp.type = 'number';
        gpfInp.min = '0';
        gpfInp.step = '100';
        gpfInp.value = String(state.customMonthlyGpf);
        gpfInp.addEventListener('change', function () {
          state.customMonthlyGpf = Math.max(0, Math.round(Number(gpfInp.value) || 0));
          persistAndRender();
        });
        addField(grid1, orMode ? 'ମାସିକ GPF ଯୋଗଦାନ (₹)' : 'Custom Monthly GPF Contribution (₹)', gpfInp, orMode ? 'ପୁରୁଣା ବ୍ୟବସ୍ଥାରେ 80C ଅଧୀନରେ ଛାଡ଼' : 'Eligible u/s 80C in Old Regime');
      }

      formSection.appendChild(grid1);

      // Form Section 2: Old Regime Chapter VI-A Deductions
      formSection.appendChild(el('h3', 'cso-itt-sec-title', orMode ? '୨. ପୁରୁଣା ଟ୍ୟାକ୍ସ ବ୍ୟବସ୍ଥା ଛାଡ଼ (Chapter VI-A & HRA / 24b)' : '2. Old Regime Exemptions & Chapter VI-A Deductions'));
      var grid2 = el('div', 'cso-itt-grid');

      var d80cInp = el('input', 'cso-itt-input');
      d80cInp.id = 'cso-itt-80c';
      d80cInp.type = 'number';
      d80cInp.min = '0';
      d80cInp.max = '150000';
      d80cInp.step = '1000';
      d80cInp.value = String(state.ded80C);
      d80cInp.addEventListener('change', function () {
        state.ded80C = clampNum(d80cInp.value, 0, 150000, 0);
        persistAndRender();
      });
      addField(grid2, orMode ? 'ଧାରା 80C (GPF / PPF / LIC / ELSS — ସର୍ବାଧିକ ₹1.5L)' : 'Section 80C (GPF / PPF / LIC / ELSS — Max ₹1,50,000)', d80cInp);

      var d80ccd1bInp = el('input', 'cso-itt-input');
      d80ccd1bInp.id = 'cso-itt-80ccd1b';
      d80ccd1bInp.type = 'number';
      d80ccd1bInp.min = '0';
      d80ccd1bInp.max = '50000';
      d80ccd1bInp.step = '1000';
      d80ccd1bInp.value = String(state.ded80CCD1B);
      d80ccd1bInp.addEventListener('change', function () {
        state.ded80CCD1B = clampNum(d80ccd1bInp.value, 0, 50000, 0);
        persistAndRender();
      });
      addField(grid2, orMode ? 'ଧାରା 80CCD(1B) ଅତିରିକ୍ତ NPS Tier-I (ସର୍ବାଧିକ ₹50,000)' : 'Section 80CCD(1B) Voluntary NPS Tier-I (Max ₹50,000)', d80ccd1bInp);

      var d80dInp = el('input', 'cso-itt-input');
      d80dInp.id = 'cso-itt-80d';
      d80dInp.type = 'number';
      d80dInp.min = '0';
      d80dInp.max = '75000';
      d80dInp.step = '1000';
      d80dInp.value = String(state.ded80D);
      d80dInp.addEventListener('change', function () {
        state.ded80D = clampNum(d80dInp.value, 0, 75000, 0);
        persistAndRender();
      });
      addField(grid2, orMode ? 'ଧାରା 80D ସ୍ୱାସ୍ଥ୍ୟ ବୀମା (ସର୍ବାଧିକ ₹75,000)' : 'Section 80D Health Insurance (Max ₹25,000–₹75,000)', d80dInp);

      var hra24bInp = el('input', 'cso-itt-input');
      hra24bInp.id = 'cso-itt-hra24b';
      hra24bInp.type = 'number';
      hra24bInp.min = '0';
      hra24bInp.max = '200000';
      hra24bInp.step = '1000';
      hra24bInp.value = String(state.hraOr24b);
      hra24bInp.addEventListener('change', function () {
        state.hraOr24b = clampNum(hra24bInp.value, 0, 200000, 0);
        persistAndRender();
      });
      addField(grid2, orMode ? 'HRA ଛାଡ଼ u/s 10(13A) କିମ୍ବା ଗୃହ ଋଣ ସୁଧ u/s 24(b) (ସର୍ବାଧିକ ₹2L)' : 'HRA u/s 10(13A) or Home Loan Interest u/s 24(b) (Max ₹2,00,000)', hra24bInp);

      formSection.appendChild(grid2);
      card.appendChild(formSection);

      // KPI Summary Row
      var kpiRow = el('div', 'cso-itt-kpis');
      var kpis = [
        { label: orMode ? 'ମାସିକ ମୋଟ ଦରମା' : 'Monthly Gross Salary', val: fmtInr(calc.grossMonthly), sub: (orMode ? 'ବାର୍ଷିକ: ' : 'Annual: ') + fmtInr(calc.annualGross), mod: '' },
        { label: orMode ? 'ମାସିକ ଇନ୍-ହ୍ୟାଣ୍ଡ୍ (ନୂଆ)' : 'Monthly Net In-Hand (New)', val: fmtInr(calc.newRegime.monthlyNetInHand), sub: (orMode ? 'ମାସିକ TDS: ' : 'Monthly TDS: ') + fmtInr(calc.newRegime.monthlyTds), mod: calc.recommended === 'new' ? ' cso-itt-kpi--win' : '' },
        { label: orMode ? 'ମାସିକ ଇନ୍-ହ୍ୟାଣ୍ଡ୍ (ପୁରୁଣା)' : 'Monthly Net In-Hand (Old)', val: fmtInr(calc.oldRegime.monthlyNetInHand), sub: (orMode ? 'ମାସିକ TDS: ' : 'Monthly TDS: ') + fmtInr(calc.oldRegime.monthlyTds), mod: calc.recommended === 'old' ? ' cso-itt-kpi--win' : '' },
        { label: orMode ? 'ସରକାରୀ 80CCD(2) + PT' : 'Govt 80CCD(2) & Odisha PT', val: fmtInr(calc.employer80CCD2Annual) + '/yr', sub: 'PT: ' + calc.professionalTax.slabLabel, mod: '' }
      ];
      kpis.forEach(function (k) {
        var box = el('div', 'cso-itt-kpi' + k.mod);
        box.appendChild(el('span', 'cso-itt-kpi-label', k.label));
        box.appendChild(el('strong', 'cso-itt-kpi-val', k.val));
        box.appendChild(el('span', 'cso-itt-kpi-sub', k.sub));
        kpiRow.appendChild(box);
      });
      card.appendChild(kpiRow);

      // Visual Comparison Bars (discrete cso-vfv-bar--w*, zero inline styles)
      var barsBox = el('div', 'cso-itt-bars');
      barsBox.appendChild(el('h3', 'cso-itt-sec-title', orMode ? 'ନୂଆ ବନାମ ପୁରୁଣା ଟ୍ୟାକ୍ସ ଓ ଇନ୍-ହ୍ୟାଣ୍ଡ୍ ତୁଳନା' : 'Side-by-Side Tax Liability & Take-Home Comparison'));
      var barItems = [
        { label: (orMode ? 'ନୂଆ ବ୍ୟବସ୍ଥା ବାର୍ଷିକ ଟ୍ୟାକ୍ସ: ' : 'New Regime Annual Tax: ') + fmtInr(calc.newRegime.totalTax), step: calc.newRegime.taxBarStep, cls: 'cso-itt-bar-fill--new' },
        { label: (orMode ? 'ପୁରୁଣା ବ୍ୟବସ୍ଥା ବାର୍ଷିକ ଟ୍ୟାକ୍ସ: ' : 'Old Regime Annual Tax: ') + fmtInr(calc.oldRegime.totalTax), step: calc.oldRegime.taxBarStep, cls: 'cso-itt-bar-fill--old' },
        { label: (orMode ? 'ନୂଆ ବ୍ୟବସ୍ଥା ମାସିକ ଇନ୍-ହ୍ୟାଣ୍ଡ୍: ' : 'New Regime Monthly Net In-Hand: ') + fmtInr(calc.newRegime.monthlyNetInHand), step: calc.newRegime.netBarStep, cls: 'cso-itt-bar-fill--net' },
        { label: (orMode ? 'ପୁରୁଣା ବ୍ୟବସ୍ଥା ମାସିକ ଇନ୍-ହ୍ୟାଣ୍ଡ୍: ' : 'Old Regime Monthly Net In-Hand: ') + fmtInr(calc.oldRegime.monthlyNetInHand), step: calc.oldRegime.netBarStep, cls: 'cso-itt-bar-fill--net' }
      ];
      barItems.forEach(function (bi) {
        var row = el('div', 'cso-itt-bar-row');
        row.appendChild(el('div', 'cso-itt-bar-label', bi.label));
        var track = el('div', 'cso-itt-bar-track');
        track.appendChild(el('div', 'cso-itt-bar-fill ' + bi.cls + ' cso-vfv-bar--w' + bi.step));
        row.appendChild(track);
        barsBox.appendChild(row);
      });
      card.appendChild(barsBox);

      // Detailed Side-by-Side Breakdown Table
      var tableWrap = el('div', 'cso-itt-table-wrap');
      var tbl = el('table', 'cso-itt-table');
      var thead = el('thead');
      var htr = el('tr');
      [
        orMode ? 'ବିବରଣୀ (FY 2026–27)' : 'Component (FY 2026–27 / AY 2027–28)',
        orMode ? 'ନୂଆ ଟ୍ୟାକ୍ସ (Default)' : 'New Tax Regime (Default)',
        orMode ? 'ପୁରୁଣା ଟ୍ୟାକ୍ସ (Optional)' : 'Old Tax Regime (Optional)'
      ].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      var rows = [
        [orMode ? 'ବାର୍ଷିକ ମୋଟ ଦରମା (Gross)' : 'Annual Gross Salary (Basic + DA + HRA + Allowances)', fmtInr(calc.annualGross), fmtInr(calc.annualGross)],
        [orMode ? 'ଷ୍ଟାଣ୍ଡାର୍ଡ ଡିଡକ୍ସନ୍' : 'Standard Deduction u/s 16(ia)', '-' + fmtInr(calc.newRegime.standardDeduction), '-' + fmtInr(calc.oldRegime.standardDeduction)],
        [orMode ? 'ସରକାରୀ NPS/UPS ଯୋଗଦାନ u/s 80CCD(2)' : 'Govt Employer NPS/UPS Deduction u/s 80CCD(2)', '-' + fmtInr(calc.newRegime.ded80CCD2), '-' + fmtInr(calc.oldRegime.ded80CCD2)],
        [orMode ? 'ଓଡ଼ିଶା ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ u/s 16(iii)' : 'Odisha Professional Tax u/s 16(iii)', '₹0 (Not Allowed)', '-' + fmtInr(calc.oldRegime.professionalTaxDeduction)],
        [orMode ? '80C + 80CCD(1B) + 80D + HRA/24(b)' : 'Chapter VI-A (80C + 80CCD(1B) + 80D) & HRA/24(b)', '₹0 (Not Allowed)', '-' + fmtInr(calc.oldRegime.ded80C + calc.oldRegime.ded80CCD1B + calc.oldRegime.ded80D + calc.oldRegime.hraOr24b)],
        [orMode ? 'ନେଟ୍ ଟ୍ୟାକ୍ସଯୋଗ୍ୟ ଆୟ' : 'Net Taxable Income', fmtInr(calc.newRegime.taxableIncome), fmtInr(calc.oldRegime.taxableIncome)],
        [orMode ? 'ସ୍ଲାବ୍ ଆୟକର (ରିବେଟ୍ ପୂର୍ବରୁ)' : 'Slab Income Tax (Before Rebate / Relief)', fmtInr(calc.newRegime.slabTax), fmtInr(calc.oldRegime.slabTax)],
        [orMode ? '87A ରିବେଟ୍ / ମାର୍ଜିନାଲ୍ ରିଲିଫ୍' : 'Section 87A/156 Rebate & Marginal Relief', '-' + fmtInr(calc.newRegime.rebate87A + calc.newRegime.marginalRelief), '-' + fmtInr(calc.oldRegime.rebate87A)],
        [orMode ? '4% ସ୍ୱାସ୍ଥ୍ୟ ଓ ଶିକ୍ଷା ସେସ୍' : 'Health & Education Cess (4%)', fmtInr(calc.newRegime.cess), fmtInr(calc.oldRegime.cess)],
        [orMode ? 'ମୋଟ ବାର୍ଷିକ ଆୟକର' : 'Total Annual Income Tax Payable', fmtInr(calc.newRegime.totalTax), fmtInr(calc.oldRegime.totalTax)],
        [orMode ? 'ମାସିକ କର୍ମଚାରୀ ' + calc.pensionTrack.toUpperCase() + ' + PT + TDS' : 'Monthly Deductions (' + calc.pensionTrack.toUpperCase() + ' + Odisha PT + TDS)', '-' + fmtInr(calc.newRegime.monthlyTotalDeductions), '-' + fmtInr(calc.oldRegime.monthlyTotalDeductions)],
        [orMode ? 'ମାସିକ ନେଟ୍ ଇନ୍-ହ୍ୟାଣ୍ଡ୍ ଦରମା' : 'Monthly Net In-Hand Take-Home Salary', fmtInr(calc.newRegime.monthlyNetInHand), fmtInr(calc.oldRegime.monthlyNetInHand)]
      ];
      rows.forEach(function (r, idx) {
        var tr = el('tr', idx === rows.length - 1 ? 'cso-itt-row-highlight' : '');
        tr.appendChild(el('td', '', r[0]));
        tr.appendChild(el('td', '', r[1]));
        tr.appendChild(el('td', '', r[2]));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
      card.appendChild(tableWrap);

      // Action Buttons
      var actions = el('div', 'cso-itt-actions');
      var copyBtn = el('button', 'cso-itt-btn cso-itt-btn--primary', orMode ? '📋 ଟ୍ୟାକ୍ସ ଓ ଇନ୍-ହ୍ୟାଣ୍ଡ୍ ସାରାଂଶ କପି କରନ୍ତୁ' : '📋 Copy Tax & Take-Home Summary');
      copyBtn.type = 'button';
      var copyStatus = el('span', 'cso-itt-copy-status');
      copyStatus.setAttribute('aria-live', 'polite');
      copyBtn.addEventListener('click', function () {
        copyText(buildSummaryText(calc)).then(function () {
          copyStatus.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Summary copied to clipboard!';
          setTimeout(function () { copyStatus.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-itt-btn', orMode ? '🖨️ FY 2026–27 ପେ ଓ ଟ୍ୟାକ୍ସ ଶିଟ୍ ପ୍ରିଣ୍ଟ୍ କରନ୍ତୁ' : '🖨️ Print FY 2026–27 Pay & Tax Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () {
        if (typeof win.print === 'function') win.print();
      });
      actions.appendChild(printBtn);

      var syncBtn = el('button', 'cso-itt-btn', orMode ? '🔄 ORSP କାଲକୁଲେଟରରୁ ସିଙ୍କ୍ କରନ୍ତୁ' : '🔄 Sync from ORSP Pay Estimator');
      syncBtn.type = 'button';
      syncBtn.addEventListener('click', function () {
        var orsp = loadJson(ORSP_PREFS_KEY);
        if (orsp && typeof orsp === 'object') {
          if (orsp.level >= 1 && orsp.level <= 17) state.level = parseInt(orsp.level, 10);
          if (orsp.daRate !== undefined) state.daRate = Number(orsp.daRate) || 63;
          if (orsp.otherAllowances !== undefined) state.monthlyAllowances = Math.max(0, Math.round(Number(orsp.otherAllowances) || 0));
          if (orsp.scheme === 'gpf') state.pensionTrack = 'gpf';
          persistAndRender();
          copyStatus.textContent = orMode ? '✅ ORSP ତଥ୍ୟ ସିଙ୍କ୍ ହେଲା!' : '✅ Synced from ORSP Salary Estimator!';
        } else {
          copyStatus.textContent = orMode ? 'ℹ️ ORSP ପେ-ଲେଭେଲ୍ ଡିଫଲ୍ଟ ବ୍ୟବହୃତ' : 'ℹ️ Using current ORSP level settings';
        }
        setTimeout(function () { copyStatus.textContent = ''; }, 2400);
      });
      actions.appendChild(syncBtn);
      actions.appendChild(copyStatus);
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
    ORSP_LEVELS: ORSP_LEVELS,
    HRA_TIERS: HRA_TIERS,
    PENSION_TRACKS: PENSION_TRACKS,
    getLevelBasic: getLevelBasic,
    computeOdishaProfessionalTax: computeOdishaProfessionalTax,
    computeNewRegimeSlabTax: computeNewRegimeSlabTax,
    computeOldRegimeSlabTax: computeOldRegimeSlabTax,
    calculateFy2026TaxComparison: calculateFy2026TaxComparison,
    buildSummaryText: buildSummaryText,
    mount: mount
  };
});
