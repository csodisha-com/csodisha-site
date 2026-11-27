/**
 * Common Sense Odisha — Interactive Odisha University CGPA / SGPA to Percentage & Marks Converter (v412)
 * 100% client-side calculator on /tools/ (#cso-cgpa-converter-root) supporting BPUT, Sambalpur, Utkal,
 * Ravenshaw, Berhampur, Fakir Mohan, MSCB, Gangadhar Meher, Kalahandi, CBSE, CHSE/UGC, and Custom formulas
 * with multi-semester SGPA-to-CGPA aggregation and OPSC/OSSC/OSSSC form marks conversion.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOCgpaPercentageConverter = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCgpaPercentageConverter = api;
})(function (win, doc) {
  'use strict';

  var PREFS_KEY = 'cso_cgpa_converter_prefs_v1';

  var UNIVERSITIES = [
    {
      key: 'bput',
      en: 'BPUT (Biju Patnaik University of Technology)',
      or: 'BPUT (ବିଜୁ ପଟ୍ଟନାୟକ ବୈଷୟିକ ବିଶ୍ୱବିଦ୍ୟାଳୟ)',
      offset: 0.5,
      multiplier: 10,
      formula_text: '(CGPA − 0.5) × 10',
      note_en: 'Official BPUT CBCS ordinance formula for B.Tech, MBA, MCA, B.Pharm & M.Tech.',
      note_or: 'B.Tech, MBA, MCA ଓ B.Pharm ପାଇଁ ସରକାରୀ BPUT CBCS ସୂତ୍ର।'
    },
    {
      key: 'sambalpur',
      en: 'Sambalpur / Gangadhar Meher / Kalahandi University (Odisha CBCS)',
      or: 'ସମ୍ବଲପୁର / ଗଙ୍ଗାଧର ମେହେର / କଳାହାଣ୍ଡି ବିଶ୍ୱବିଦ୍ୟାଳୟ (CBCS)',
      offset: 0.5,
      multiplier: 10,
      formula_text: '(CGPA − 0.5) × 10',
      note_en: 'Standard Odisha State CBCS 10-point formula (use quick toggle below if your marksheet prints × 9.5 or × 10).',
      note_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ CBCS ୧୦-ପଏଣ୍ଟ ସୂତ୍ର (ମାର୍କସିଟ୍ ଅନୁଯାୟୀ × 9.5 ବା × 10 ମଧ୍ୟ ବାଛିପାରିବେ)।'
    },
    {
      key: 'utkal',
      en: 'Utkal University (Vani Vihar)',
      or: 'ଉତ୍କଳ ବିଶ୍ୱବିଦ୍ୟାଳୟ (ବାଣୀବିହାର)',
      offset: 0,
      multiplier: 9.5,
      formula_text: 'CGPA × 9.5',
      note_en: 'Utkal University CoE note: where aggregate marks are printed on the CBCS marksheet, OPSC/OSSC/OSSSC forms also accept (Marks Obtained ÷ Total Marks) × 100 directly.',
      note_or: 'ଉତ୍କଳ ବିଶ୍ୱବିଦ୍ୟାଳୟ CBCS ମାର୍କସିଟରେ ମୋଟ ନମ୍ବର ଥିଲେ (ପ୍ରାପ୍ତ ନମ୍ବର ÷ ମୋଟ ନମ୍ବର) × 100 ସିଧାସଳଖ ବ୍ୟବହାର କରନ୍ତୁ।'
    },
    {
      key: 'ravenshaw',
      en: 'Ravenshaw University (Cuttack)',
      or: 'ରେଭେନ୍ସା ବିଶ୍ୱବିଦ୍ୟାଳୟ (କଟକ)',
      offset: 0,
      multiplier: 9.5,
      formula_text: 'CGPA × 9.5',
      note_en: 'Ravenshaw University standard 10-point CGPA to percentage conversion.',
      note_or: 'ରେଭେନ୍ସା ବିଶ୍ୱବିଦ୍ୟାଳୟର ୧୦-ପଏଣ୍ଟ CGPA ରୁ ଶତକଡ଼ା ସୂତ୍ର।'
    },
    {
      key: 'berhampur',
      en: 'Berhampur University (Bhanja Bihar)',
      or: 'ବ୍ରହ୍ମପୁର ବିଶ୍ୱବିଦ୍ୟାଳୟ (ଭଞ୍ଜବିହାର)',
      offset: 0.5,
      multiplier: 10,
      formula_text: '(CGPA − 0.5) × 10',
      note_en: 'Berhampur University CBCS conversion (verify back-of-marksheet for × 9.5 where applicable).',
      note_or: 'ବ୍ରହ୍ମପୁର ବିଶ୍ୱବିଦ୍ୟାଳୟ CBCS ସୂତ୍ର।'
    },
    {
      key: 'fakir-mohan',
      en: 'Fakir Mohan University (Balasore) & MSCB University (Baripada)',
      or: 'ଫକୀର ମୋହନ (ବାଲେଶ୍ୱର) ଓ MSCB (ବାରିପଦା) ବିଶ୍ୱବିଦ୍ୟାଳୟ',
      offset: 0.5,
      multiplier: 10,
      formula_text: '(CGPA − 0.5) × 10',
      note_en: 'Odisha State CBCS 10-point conversion used by FMU Balasore and MSCB North Orissa University.',
      note_or: 'ଫକୀର ମୋହନ ଓ MSCB ଉତ୍ତର ଓଡ଼ିଶା ବିଶ୍ୱବିଦ୍ୟାଳୟ CBCS ସୂତ୍ର।'
    },
    {
      key: 'cbse',
      en: 'CBSE Class 10 / 12 (10-Point CGPA)',
      or: 'CBSE ଦଶମ / ଦ୍ୱାଦଶ (୧୦-ପଏଣ୍ଟ CGPA)',
      offset: 0,
      multiplier: 9.5,
      formula_text: 'CGPA × 9.5',
      note_en: 'Official CBSE 10-point CGPA indicative percentage equivalence formula.',
      note_or: 'CBSE ର ସରକାରୀ ୧୦-ପଏଣ୍ଟ CGPA ଶତକଡ଼ା ସୂତ୍ର।'
    },
    {
      key: 'chse-ugc',
      en: 'CHSE Odisha / UGC / AICTE Standard',
      or: 'CHSE ଓଡ଼ିଶା / UGC / AICTE ମାନକ ସୂତ୍ର',
      offset: 0.75,
      multiplier: 10,
      formula_text: '(CGPA − 0.75) × 10',
      note_en: 'AICTE / UGC standard formula (switch to Custom or × 10 if your board uses direct scaling).',
      note_or: 'AICTE / UGC ମାନକ ସୂତ୍ର (କିମ୍ବା କଷ୍ଟମ୍ ସୂତ୍ର ବାଛନ୍ତୁ)।'
    },
    {
      key: 'custom',
      en: 'Custom University Formula ((CGPA − Offset) × Multiplier)',
      or: 'କଷ୍ଟମ୍ ବିଶ୍ୱବିଦ୍ୟାଳୟ ସୂତ୍ର ((CGPA − Offset) × Multiplier)',
      offset: 0.5,
      multiplier: 10,
      formula_text: '(CGPA − Offset) × Multiplier',
      note_en: 'Enter the exact Offset (0.00–1.00) and Multiplier (8.5–10.0) printed on the back of your marksheet.',
      note_or: 'ଆପଣଙ୍କ ମାର୍କସିଟ୍ ପଛରେ ଥିବା ସଠିକ୍ Offset ଓ Multiplier ଦିଅନ୍ତୁ।'
    }
  ];

  var MAX_MARKS_PRESETS = [100, 600, 1800, 2400, 3000];
  var QUICK_REF_CGPAS = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5];

  function getUniversity(key) {
    for (var i = 0; i < UNIVERSITIES.length; i += 1) {
      if (UNIVERSITIES[i].key === key) return UNIVERSITIES[i];
    }
    return UNIVERSITIES[0];
  }

  function classifyDivision(pct) {
    var p = Number(pct) || 0;
    if (p >= 75) return { key: 'distinction', en: 'First Class with Distinction (≥ 75%)', or: 'ପ୍ରଥମ ଶ୍ରେଣୀ (Distinction ≥ ୭୫%)' };
    if (p >= 60) return { key: 'first', en: 'First Class (≥ 60%)', or: 'ପ୍ରଥମ ଶ୍ରେଣୀ (≥ ୬୦%)' };
    if (p >= 50) return { key: 'second', en: 'Second Class (≥ 50%)', or: 'ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ (≥ ୫୦%)' };
    if (p >= 40) return { key: 'pass', en: 'Pass Class (≥ 40%)', or: 'ଉତ୍ତୀର୍ଣ୍ଣ (≥ ୪୦%)' };
    return { key: 'below_pass', en: 'Below Pass (< 40%)', or: '୪୦% ରୁ କମ୍' };
  }

  function convertCgpaToPercentage(cgpa, presetOrParams) {
    var c = Math.max(0, Math.min(10, Number(cgpa) || 0));
    var offset = 0.5;
    var multiplier = 10;
    if (typeof presetOrParams === 'string') {
      var u = getUniversity(presetOrParams);
      offset = u.offset;
      multiplier = u.multiplier;
    } else if (presetOrParams && typeof presetOrParams === 'object') {
      offset = presetOrParams.offset !== undefined ? Number(presetOrParams.offset) : 0.5;
      multiplier = presetOrParams.multiplier !== undefined ? Number(presetOrParams.multiplier) : 10;
    }
    offset = Math.max(0, Math.min(1, isFinite(offset) ? offset : 0.5));
    multiplier = Math.max(8.5, Math.min(10, isFinite(multiplier) ? multiplier : 10));

    var rawPct = (c - offset) * multiplier;
    var pct = Math.max(0, Math.min(100, Math.round(rawPct * 100) / 100));
    var formulaLabel = offset > 0
      ? ('(CGPA − ' + offset + ') × ' + multiplier)
      : ('CGPA × ' + multiplier);

    return {
      cgpa: Math.round(c * 100) / 100,
      percentage: pct,
      offset: offset,
      multiplier: multiplier,
      formulaLabel: formulaLabel,
      division: classifyDivision(pct)
    };
  }

  function computeFormMarks(pct, maxMarks) {
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    var maxM = Math.max(1, Math.round(Number(maxMarks) || 100));
    var exact = Math.round(((p / 100) * maxM) * 100) / 100;
    var rounded = Math.round(exact);
    return {
      maxMarks: maxM,
      exact: exact,
      rounded: rounded
    };
  }

  function aggregateSemesters(semesters) {
    var list = Array.isArray(semesters) ? semesters : [];
    var weightedSum = 0;
    var totalCredits = 0;
    var validCount = 0;
    for (var i = 0; i < list.length; i += 1) {
      var row = list[i];
      if (!row) continue;
      var sgpa = Number(row.sgpa);
      if (!isFinite(sgpa) || sgpa <= 0) continue;
      var clampedSgpa = Math.max(0, Math.min(10, sgpa));
      var cr = Number(row.credits);
      var weight = (isFinite(cr) && cr > 0) ? cr : 1;
      weightedSum += clampedSgpa * weight;
      totalCredits += weight;
      validCount += 1;
    }
    var cgpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;
    return {
      cgpa: cgpa,
      totalCredits: Math.round(totalCredits * 100) / 100,
      validCount: validCount
    };
  }

  function loadPrefs() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') return p;
      }
    } catch (_) {}
    return {};
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
    var saved = loadPrefs();
    var initUni = getUniversity(saved.uniKey || 'bput');
    var state = {
      lang: detectLang(),
      mode: saved.mode === 'semesters' ? 'semesters' : 'direct',
      uniKey: initUni.key,
      offset: saved.offset !== undefined ? Number(saved.offset) : initUni.offset,
      multiplier: saved.multiplier !== undefined ? Number(saved.multiplier) : initUni.multiplier,
      cgpa: saved.cgpa !== undefined ? Number(saved.cgpa) : 8.5,
      maxMarks: saved.maxMarks !== undefined ? Number(saved.maxMarks) : 2400,
      cutoffPct: saved.cutoffPct !== undefined ? Number(saved.cutoffPct) : 50,
      semCount: saved.semCount || 6,
      semesters: Array.isArray(saved.semesters) && saved.semesters.length
        ? saved.semesters
        : [
          { sgpa: 8.2, credits: 20 },
          { sgpa: 8.4, credits: 20 },
          { sgpa: 8.6, credits: 22 },
          { sgpa: 8.5, credits: 22 },
          { sgpa: 8.8, credits: 22 },
          { sgpa: 8.9, credits: 24 },
          { sgpa: 0, credits: 20 },
          { sgpa: 0, credits: 20 }
        ],
      copiedToast: false
    };

    function persist() {
      savePrefs({
        mode: state.mode,
        uniKey: state.uniKey,
        offset: state.offset,
        multiplier: state.multiplier,
        cgpa: state.cgpa,
        maxMarks: state.maxMarks,
        cutoffPct: state.cutoffPct,
        semCount: state.semCount,
        semesters: state.semesters
      });
    }

    function render() {
      var isOr = state.lang === 'or';
      var uni = getUniversity(state.uniKey);
      var effectiveCgpa = state.mode === 'semesters'
        ? aggregateSemesters(state.semesters.slice(0, state.semCount)).cgpa
        : state.cgpa;
      var conv = convertCgpaToPercentage(effectiveCgpa, { offset: state.offset, multiplier: state.multiplier });
      var marks = computeFormMarks(conv.percentage, state.maxMarks);
      var meetsCutoff = conv.percentage >= state.cutoffPct;

      var wrap = el('section', 'cso-cgpa-card');
      wrap.setAttribute('data-cso-cgpa-converter', 'v412');
      wrap.setAttribute('aria-label', isOr ? 'ଓଡ଼ିଶା ବିଶ୍ୱବିଦ୍ୟାଳୟ CGPA ରୁ ଶତକଡ଼ା ଓ ନମ୍ବର କନଭର୍ଟର୍' : 'Odisha University CGPA to Percentage and Marks Converter');

      // Header
      var head = el('div', 'cso-cgpa-head');
      var headLeft = el('div', 'cso-cgpa-head-left');
      headLeft.appendChild(el('span', 'cso-cgpa-badge', isOr ? '🎓 ୧୦୦% ଅନ୍-ଡିଭାଇସ୍ · OPSC / OSSC / OSSSC ଫର୍ମ ପ୍ରସ୍ତୁତ' : '🎓 100% On-Device · OPSC / OSSC / OSSSC Form Ready'));
      headLeft.appendChild(el('h2', 'cso-cgpa-title', isOr
        ? 'ଓଡ଼ିଶା ବିଶ୍ୱବିଦ୍ୟାଳୟ CGPA / SGPA ରୁ ଶତକଡ଼ା ଓ ନମ୍ବର କନଭର୍ଟର୍'
        : 'Odisha University CGPA / SGPA to Percentage & Marks Converter'));
      headLeft.appendChild(el('p', 'cso-cgpa-sub', isOr
        ? 'BPUT, ସମ୍ବଲପୁର, ଉତ୍କଳ, ରେଭେନ୍ସା, ବ୍ରହ୍ମପୁର, ଫକୀର ମୋହନ, MSCB, ଗଙ୍ଗାଧର ମେହେର, କଳାହାଣ୍ଡି ଓ CBSE/CHSE CGPA କୁ ସଠିକ୍ ଶତକଡ଼ା ଓ ପ୍ରାପ୍ତ ନମ୍ବରରେ ପରିଣତ କରନ୍ତୁ।'
        : 'Convert 10-point CGPA/SGPA across BPUT, Sambalpur, Utkal, Ravenshaw, Berhampur, Fakir Mohan, MSCB, Gangadhar Meher, Kalahandi University & CBSE/CHSE into exact percentage and form marks.'));

      var langGroup = el('div', 'cso-cgpa-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-cgpa-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        langGroup.appendChild(lb);
      });
      head.append(headLeft, langGroup);
      wrap.appendChild(head);

      // Mode Toggle
      var modeBar = el('div', 'cso-cgpa-actions');
      modeBar.setAttribute('role', 'group');
      modeBar.setAttribute('aria-label', 'Calculator mode');
      [
        { key: 'direct', en: '⚡ Direct CGPA / SGPA Converter', or: '⚡ ସିଧାସଳଖ CGPA / SGPA କନଭର୍ଟର୍' },
        { key: 'semesters', en: '📚 Multi-Semester SGPA → CGPA Aggregator', or: '📚 ବହୁ-ସେମିଷ୍ଟାର୍ SGPA → CGPA ହିସାବ' }
      ].forEach(function (m) {
        var mb = el('button', 'cso-cgpa-pill' + (state.mode === m.key ? ' is-active' : ''), isOr ? m.or : m.en);
        mb.type = 'button';
        mb.setAttribute('aria-pressed', state.mode === m.key ? 'true' : 'false');
        mb.addEventListener('click', function () { state.mode = m.key; persist(); render(); });
        modeBar.appendChild(mb);
      });
      wrap.appendChild(modeBar);

      // University Preset Selector + Quick Formula Override Pills
      var uniField = el('label', 'cso-cgpa-field');
      uniField.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? '୧. ବିଶ୍ୱବିଦ୍ୟାଳୟ / ବୋର୍ଡ ବାଛନ୍ତୁ' : '1. Select Odisha University / Board Preset'));
      var uniSel = el('select', 'cso-cgpa-select');
      UNIVERSITIES.forEach(function (u) {
        var o = el('option', '', (isOr ? u.or : u.en) + ' — ' + u.formula_text);
        o.value = u.key;
        if (state.uniKey === u.key) o.selected = true;
        uniSel.appendChild(o);
      });
      uniSel.addEventListener('change', function () {
        var nextU = getUniversity(uniSel.value);
        state.uniKey = nextU.key;
        if (nextU.key !== 'custom') {
          state.offset = nextU.offset;
          state.multiplier = nextU.multiplier;
        }
        persist();
        render();
      });
      uniField.appendChild(uniSel);
      wrap.appendChild(uniField);

      wrap.appendChild(el('div', 'cso-cgpa-note', (isOr ? uni.note_or : uni.note_en) + ' · Formula: ' + conv.formulaLabel));

      // Quick Formula Overrides (useful when marksheet prints ×9.5 or ×10)
      var quickFormulaBar = el('div', 'cso-cgpa-actions');
      quickFormulaBar.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? 'ତୁରନ୍ତ ସୂତ୍ର:' : 'Quick Formula:'));
      [
        { label: '(CGPA − 0.5) × 10', offset: 0.5, mult: 10 },
        { label: 'CGPA × 9.5', offset: 0, mult: 9.5 },
        { label: 'CGPA × 10', offset: 0, mult: 10 },
        { label: '(CGPA − 0.75) × 10', offset: 0.75, mult: 10 }
      ].forEach(function (qf) {
        var act = state.offset === qf.offset && state.multiplier === qf.mult;
        var qb = el('button', 'cso-cgpa-pill' + (act ? ' is-active' : ''), qf.label);
        qb.type = 'button';
        qb.addEventListener('click', function () {
          state.offset = qf.offset;
          state.multiplier = qf.mult;
          persist();
          render();
        });
        quickFormulaBar.appendChild(qb);
      });
      wrap.appendChild(quickFormulaBar);

      if (state.uniKey === 'custom') {
        var custGrid = el('div', 'cso-cgpa-grid-2');
        var offF = el('label', 'cso-cgpa-field');
        offF.appendChild(el('span', 'cso-cgpa-field-lbl', 'Offset (0.00 – 1.00)'));
        var offInp = el('input', 'cso-cgpa-input');
        offInp.type = 'number';
        offInp.step = '0.05';
        offInp.min = '0';
        offInp.max = '1';
        offInp.value = String(state.offset);
        offInp.addEventListener('change', function () {
          state.offset = Math.max(0, Math.min(1, Number(offInp.value) || 0));
          persist();
          render();
        });
        offF.appendChild(offInp);

        var mulF = el('label', 'cso-cgpa-field');
        mulF.appendChild(el('span', 'cso-cgpa-field-lbl', 'Multiplier (8.5 – 10.0)'));
        var mulInp = el('input', 'cso-cgpa-input');
        mulInp.type = 'number';
        mulInp.step = '0.1';
        mulInp.min = '8.5';
        mulInp.max = '10';
        mulInp.value = String(state.multiplier);
        mulInp.addEventListener('change', function () {
          state.multiplier = Math.max(8.5, Math.min(10, Number(mulInp.value) || 9.5));
          persist();
          render();
        });
        mulF.appendChild(mulInp);
        custGrid.append(offF, mulF);
        wrap.appendChild(custGrid);
      }

      // Mode A vs Mode B Inputs
      if (state.mode === 'direct') {
        var dirGrid = el('div', 'cso-cgpa-grid-3');

        var cField = el('label', 'cso-cgpa-field');
        cField.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? 'CGPA / SGPA (0.00 – 10.00)' : 'CGPA / SGPA (0.00 – 10.00)'));
        var cInp = el('input', 'cso-cgpa-input');
        cInp.type = 'number';
        cInp.step = '0.01';
        cInp.min = '0';
        cInp.max = '10';
        cInp.value = String(state.cgpa);
        cInp.addEventListener('input', function () {
          state.cgpa = Math.max(0, Math.min(10, Number(cInp.value) || 0));
          persist();
          render();
        });
        cField.appendChild(cInp);

        var mField = el('label', 'cso-cgpa-field');
        mField.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? 'ମୋଟ ନମ୍ବର (OPSC/OSSC/OSSSC)' : 'Maximum Marks (Form Total)'));
        var mInp = el('input', 'cso-cgpa-input');
        mInp.type = 'number';
        mInp.min = '10';
        mInp.max = '10000';
        mInp.value = String(state.maxMarks);
        mInp.addEventListener('change', function () {
          state.maxMarks = Math.max(10, Number(mInp.value) || 100);
          persist();
          render();
        });
        mField.appendChild(mInp);

        var cutField = el('label', 'cso-cgpa-field');
        cutField.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? 'ସର୍ବନିମ୍ନ ଯୋଗ୍ୟତା କଟଅଫ୍ (%)' : 'Min Eligibility Cutoff (%)'));
        var cutInp = el('input', 'cso-cgpa-input');
        cutInp.type = 'number';
        cutInp.min = '0';
        cutInp.max = '100';
        cutInp.value = String(state.cutoffPct);
        cutInp.addEventListener('change', function () {
          state.cutoffPct = Math.max(0, Math.min(100, Number(cutInp.value) || 0));
          persist();
          render();
        });
        cutField.appendChild(cutInp);

        dirGrid.append(cField, mField, cutField);
        wrap.appendChild(dirGrid);

        var presetMarksRow = el('div', 'cso-cgpa-actions');
        presetMarksRow.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? 'ମୋଟ ନମ୍ବର ପ୍ରିସେଟ୍:' : 'Total Marks Presets:'));
        MAX_MARKS_PRESETS.forEach(function (mm) {
          var mb = el('button', 'cso-cgpa-pill' + (state.maxMarks === mm ? ' is-active' : ''), String(mm));
          mb.type = 'button';
          mb.addEventListener('click', function () { state.maxMarks = mm; persist(); render(); });
          presetMarksRow.appendChild(mb);
        });
        wrap.appendChild(presetMarksRow);
      } else {
        // Multi-semester SGPA -> CGPA Aggregator
        var semHead = el('div', 'cso-cgpa-actions');
        semHead.appendChild(el('span', 'cso-cgpa-field-lbl', isOr ? 'ସେମିଷ୍ଟାର୍ ସଂଖ୍ୟା:' : 'Semesters:'));
        [2, 4, 6, 8].forEach(function (cnt) {
          var sb = el('button', 'cso-cgpa-pill' + (state.semCount === cnt ? ' is-active' : ''), cnt + ' Semesters');
          sb.type = 'button';
          sb.addEventListener('click', function () { state.semCount = cnt; persist(); render(); });
          semHead.appendChild(sb);
        });
        wrap.appendChild(semHead);

        var semGrid = el('div', 'cso-cgpa-sem-grid');
        for (var si = 0; si < state.semCount; si += 1) {
          (function (idx) {
            var row = el('div', 'cso-cgpa-sem-card');
            row.appendChild(el('div', 'cso-cgpa-field-lbl', 'Sem ' + (idx + 1)));
            var sInp = el('input', 'cso-cgpa-input');
            sInp.type = 'number';
            sInp.step = '0.01';
            sInp.min = '0';
            sInp.max = '10';
            sInp.placeholder = 'SGPA';
            sInp.setAttribute('aria-label', 'Semester ' + (idx + 1) + ' SGPA');
            sInp.value = String((state.semesters[idx] && state.semesters[idx].sgpa) || '');
            sInp.addEventListener('change', function () {
              if (!state.semesters[idx]) state.semesters[idx] = { sgpa: 0, credits: 20 };
              state.semesters[idx].sgpa = Math.max(0, Math.min(10, Number(sInp.value) || 0));
              persist();
              render();
            });

            var crInp = el('input', 'cso-cgpa-input');
            crInp.type = 'number';
            crInp.min = '1';
            crInp.max = '60';
            crInp.placeholder = 'Credits';
            crInp.setAttribute('aria-label', 'Semester ' + (idx + 1) + ' Credits');
            crInp.value = String((state.semesters[idx] && state.semesters[idx].credits) || 20);
            crInp.addEventListener('change', function () {
              if (!state.semesters[idx]) state.semesters[idx] = { sgpa: 0, credits: 20 };
              state.semesters[idx].credits = Math.max(1, Number(crInp.value) || 1);
              persist();
              render();
            });
            row.append(sInp, crInp);
            semGrid.appendChild(row);
          })(si);
        }
        wrap.appendChild(semGrid);
      }

      // Output KPI Summary Cards
      var kpis = el('div', 'cso-cgpa-kpis');
      [
        [isOr ? 'ସମତୁଲ୍ୟ ଶତକଡ଼ା (%)' : 'Equivalent Percentage', conv.percentage.toFixed(2) + '%'],
        [isOr ? 'ଶ୍ରେଣୀ / ଡିଭିଜନ୍' : 'Division / Class', isOr ? conv.division.or : conv.division.en],
        [isOr ? 'ଫର୍ମ ନମ୍ବର (ପ୍ରାପ୍ତ / ମୋଟ)' : 'Form Marks (Obtained / Total)', marks.rounded + ' / ' + marks.maxMarks + ' (' + marks.exact.toFixed(2) + ')'],
        [isOr ? 'କଟଅଫ୍ ସ୍ଥିତି (' + state.cutoffPct + '%)' : 'Cutoff Check (' + state.cutoffPct + '%)', meetsCutoff ? (isOr ? '✅ ଯୋଗ୍ୟ' : '✅ Meets Cutoff') : (isOr ? '⚠️ କଟଅଫ୍ ଠାରୁ କମ୍' : '⚠️ Below Cutoff')]
      ].forEach(function (pair) {
        var tile = el('div', 'cso-cgpa-kpi');
        tile.append(el('span', 'cso-cgpa-kpi-k', pair[0]), el('b', 'cso-cgpa-kpi-v', pair[1]));
        kpis.appendChild(tile);
      });
      wrap.appendChild(kpis);

      // Copy & Reset Row
      var actRow = el('div', 'cso-cgpa-actions');
      var copyBtn = el('button', 'cso-cgpa-btn cso-cgpa-btn--primary', state.copiedToast ? '✓ Result Copied for Form' : '📋 Copy Result for Form');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var txt = [
          'University: ' + uni.en,
          'CGPA: ' + conv.cgpa.toFixed(2) + ' | Formula: ' + conv.formulaLabel,
          'Equivalent Percentage: ' + conv.percentage.toFixed(2) + '% (' + conv.division.en + ')',
          'Form Marks: ' + marks.rounded + ' / ' + marks.maxMarks + ' (Exact: ' + marks.exact.toFixed(2) + ')'
        ].join('\n');
        if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
          win.navigator.clipboard.writeText(txt).catch(function () {});
        }
        state.copiedToast = true;
        render();
      });
      var resetBtn = el('button', 'cso-cgpa-btn', isOr ? '↻ ରିସେଟ୍' : '↻ Reset');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        state.uniKey = 'bput';
        state.offset = 0.5;
        state.multiplier = 10;
        state.cgpa = 8.5;
        state.maxMarks = 2400;
        state.cutoffPct = 50;
        state.copiedToast = false;
        persist();
        render();
      });
      actRow.append(copyBtn, resetBtn);
      wrap.appendChild(actRow);

      // Quick Reference Table (6.0 to 9.5)
      wrap.appendChild(el('h3', 'cso-cgpa-subhead', isOr ? '📊 ତୁରନ୍ତ CGPA ରୁ ଶତକଡ଼ା ସାରଣୀ (6.0 – 9.5)' : '📊 Quick CGPA to Percentage Reference Table (6.0 – 9.5)'));
      var tblWrap = el('div', 'cso-cgpa-table-wrap');
      var tbl = el('table', 'cso-cgpa-table');
      var th = el('thead');
      var hr = el('tr');
      ['CGPA', '(CGPA − 0.5) × 10 (BPUT / CBCS)', 'CGPA × 9.5 (Utkal / Ravenshaw / CBSE)', 'CGPA × 10 (Direct)'].forEach(function (h) {
        hr.appendChild(el('th', '', h));
      });
      th.appendChild(hr);
      tbl.appendChild(th);

      var tb = el('tbody');
      QUICK_REF_CGPAS.forEach(function (val) {
        var tr = el('tr');
        tr.appendChild(el('td', '', val.toFixed(1)));
        tr.appendChild(el('td', '', convertCgpaToPercentage(val, { offset: 0.5, multiplier: 10 }).percentage.toFixed(2) + '%'));
        tr.appendChild(el('td', '', convertCgpaToPercentage(val, { offset: 0, multiplier: 9.5 }).percentage.toFixed(2) + '%'));
        tr.appendChild(el('td', '', convertCgpaToPercentage(val, { offset: 0, multiplier: 10 }).percentage.toFixed(2) + '%'));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      tblWrap.appendChild(tbl);
      wrap.appendChild(tblWrap);

      container.replaceChildren(wrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-cgpa-converter-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v412',
    PREFS_KEY: PREFS_KEY,
    UNIVERSITIES: UNIVERSITIES,
    MAX_MARKS_PRESETS: MAX_MARKS_PRESETS,
    classifyDivision: classifyDivision,
    convertCgpaToPercentage: convertCgpaToPercentage,
    computeFormMarks: computeFormMarks,
    aggregateSemesters: aggregateSemesters,
    mount: mount
  };
});
