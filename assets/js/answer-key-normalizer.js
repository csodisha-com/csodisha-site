/**
 * Common Sense Odisha — Interactive Odisha Govt Recruitment Answer Key
 * & Raw-to-Normalized Score Calculator (/results/ & /mock-tests/, v435)
 * Supports OPSC (+2 / -0.66), OSSC (+1 / -0.25), OSSSC (+1 / -0.25), OPRB (+1 / -0.25),
 * CTET/OTET/OSSTET (+1 / 0.00), Z-Score & Equipercentile multi-shift normalization,
 * and Answer Key Objection-Window Tracker with .ics reminders & Saved Alerts.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOAnswerKeyNormalizer = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOAnswerKeyNormalizer = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v435';
  var ROOT_ID = 'cso-answer-key-normalizer-root';
  var PREFS_KEY = 'cso_answer_key_normalizer_v1';

  var MARKING_PRESETS = [
    {
      id: 'opsc',
      en: 'OPSC Prelims (OAS / OES / ASO — +2.00 / -0.66 [1/3rd Neg])',
      or: 'OPSC ପ୍ରିଲିମ୍ସ (OAS / OES / ASO — +2.00 / -0.66)',
      posMarks: 2.0,
      negMarks: 0.66,
      defaultTotal: 100
    },
    {
      id: 'ossc',
      en: 'OSSC Prelims / Mains (CGLRE / CHSL — +1.00 / -0.25 [1/4th Neg])',
      or: 'OSSC ପ୍ରିଲିମ୍ସ / ମେନ୍ସ (CGLRE / CHSL — +1.00 / -0.25)',
      posMarks: 1.0,
      negMarks: 0.25,
      defaultTotal: 150
    },
    {
      id: 'osssc',
      en: 'OSSSC District Cadre (RI / ARI / Amin / Forest Guard — +1.00 / -0.25)',
      or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / ଫରେଷ୍ଟ ଗାର୍ଡ — +1.00 / -0.25)',
      posMarks: 1.0,
      negMarks: 0.25,
      defaultTotal: 100
    },
    {
      id: 'oprb',
      en: 'Odisha Police SI / Constable (OPRB — +1.00 / -0.25)',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI / କନଷ୍ଟେବଲ୍ (OPRB — +1.00 / -0.25)',
      posMarks: 1.0,
      negMarks: 0.25,
      defaultTotal: 100
    },
    {
      id: 'tet',
      en: 'CBSE CTET / OTET / OSSTET (+1.00 / 0.00 No Negative)',
      or: 'CBSE CTET / OTET / OSSTET (+1.00 / 0.00 ନେଗେଟିଭ୍ ନାହିଁ)',
      posMarks: 1.0,
      negMarks: 0.0,
      defaultTotal: 150
    }
  ];

  var OBJECTION_WINDOWS = [
    {
      id: 'opsc-provisional-key',
      board: 'OPSC',
      titleEn: 'OPSC Prelims Provisional Answer Key Challenge Portal',
      titleOr: 'OPSC ପ୍ରିଲିମ୍ସ ପ୍ରୋଭିଜନାଲ୍ ଆନ୍ସର୍ କି ଅଭିଯୋଗ ପୋର୍ଟାଲ୍',
      feeEn: '₹0 (Free Online Objection via OPSC Candidate Login)',
      feeOr: '₹0 (OPSC ଲଗଇନ୍ ରେ ମାଗଣା ଅନଲାଇନ୍ ଅଭିଯୋଗ)',
      proofEn: 'NCERT / Odisha State Bureau Textbook / Official Gazette PDF citation',
      proofOr: 'NCERT / ଓଡ଼ିଶା ରାଜ୍ୟ ପାଠ୍ୟପୁସ୍ତକ ବ୍ୟୁରୋ / ଗେଜେଟ୍ ପ୍ରମାଣ PDF',
      deadlineIso: '2026-12-18',
      url: 'https://www.opsc.gov.in/'
    },
    {
      id: 'ossc-provisional-key',
      board: 'OSSC',
      titleEn: 'OSSC CGLRE / CHSL Provisional Answer Key Objection Window',
      titleOr: 'OSSC CGLRE / CHSL ଆନ୍ସର୍ କି ଅଭିଯୋଗ ୱିଣ୍ଡୋ',
      feeEn: '₹0 (Free Online Objection within 3–5 Days of Key Release)',
      feeOr: '₹0 (୩–୫ ଦିନ ମଧ୍ୟରେ ମାଗଣା ଅନଲାଇନ୍ ଅଭିଯୋଗ)',
      proofEn: 'Standard textbook page scan + Question ID & Response Sheet PDF',
      proofOr: 'ମାନକ ପାଠ୍ୟପୁସ୍ତକ ପୃଷ୍ଠା ସ୍କାନ୍ + ପ୍ରଶ୍ନ ID',
      deadlineIso: '2026-12-22',
      url: 'https://www.ossc.gov.in/'
    },
    {
      id: 'osssc-provisional-key',
      board: 'OSSSC',
      titleEn: 'OSSSC Combined Cadre / Forest Guard Answer Key Challenge',
      titleOr: 'OSSSC କମ୍ବାଇଣ୍ଡ୍ କ୍ୟାଡର୍ / ଫରେଷ୍ଟ ଗାର୍ଡ ଆନ୍ସର୍ କି ଚ୍ୟାଲେଞ୍ଜ',
      feeEn: '₹0 (Free via OSSSC Registered User Login)',
      feeOr: '₹0 (OSSSC ପଞ୍ଜୀକୃତ ଲଗଇନ୍ ରେ ମାଗଣା)',
      proofEn: 'BSE Odisha / CHSE / NCERT authoritative reference PDF',
      proofOr: 'BSE ଓଡ଼ିଶା / CHSE / NCERT ପ୍ରାମାଣିକ ସନ୍ଦର୍ଭ PDF',
      deadlineIso: '2026-12-28',
      url: 'https://www.osssc.gov.in/'
    },
    {
      id: 'oprb-provisional-key',
      board: 'OPRB / NTA',
      titleEn: 'Odisha Police SI (OPRB) & NTA / CTET Challenge Window',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (OPRB) ଓ NTA / CTET ଚ୍ୟାଲେଞ୍ଜ ୱିଣ୍ଡୋ',
      feeEn: '₹250 Refundable (OPRB) · ₹1,000/Q (CBSE CTET if upheld)',
      feeOr: '₹250 ଫେରସ୍ତଯୋଗ୍ୟ (OPRB) · ₹1,000 (CTET)',
      proofEn: 'Published Government Report / NCERT / Bare Act citation required',
      proofOr: 'ସରକାରୀ ରିପୋର୍ଟ / NCERT / ବେୟାର୍ ଆକ୍ଟ ସନ୍ଦର୍ଭ ଆବଶ୍ୟକ',
      deadlineIso: '2026-12-30',
      url: 'https://odishapolice.gov.in/'
    }
  ];

  function getPreset(presetId) {
    var key = String(presetId || 'opsc').toLowerCase();
    for (var i = 0; i < MARKING_PRESETS.length; i += 1) {
      if (MARKING_PRESETS[i].id === key) return MARKING_PRESETS[i];
    }
    return MARKING_PRESETS[0];
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function computeNormalizedScore(params) {
    var p = params || {};
    var preset = getPreset(p.presetId || 'opsc');
    var posMarks = p.posMarks !== undefined ? Number(p.posMarks) : preset.posMarks;
    var negMarks = p.negMarks !== undefined ? Number(p.negMarks) : preset.negMarks;

    var totalQuestions = Math.max(1, Math.min(500, Math.round(Number(p.totalQuestions || preset.defaultTotal) || preset.defaultTotal)));
    var correct = Math.max(0, Math.min(totalQuestions, Math.round(Number(p.correct !== undefined ? p.correct : Math.round(totalQuestions * 0.65)) || 0)));
    var maxWrong = Math.max(0, totalQuestions - correct);
    var wrong = Math.max(0, Math.min(maxWrong, Math.round(Number(p.wrong !== undefined ? p.wrong : Math.round(totalQuestions * 0.15)) || 0)));
    var graceQuestions = Math.max(0, Math.min(totalQuestions, Math.round(Number(p.graceQuestions || 0) || 0)));

    var attempted = correct + wrong;
    var unattempted = Math.max(0, totalQuestions - attempted);
    var maxScore = Number((totalQuestions * posMarks).toFixed(2));
    var positiveMarks = Number((correct * posMarks).toFixed(2));
    var penaltyDeducted = Number((wrong * negMarks).toFixed(2));
    var graceMarks = Number((graceQuestions * posMarks).toFixed(2));
    var rawScore = Number(Math.min(maxScore, positiveMarks - penaltyDeducted + graceMarks).toFixed(2));
    var accuracyPct = attempted > 0 ? Number(((correct / attempted) * 100).toFixed(1)) : 0;

    var normMode = String(p.normMode || 'single').toLowerCase();
    if (normMode !== 'zscore' && normMode !== 'equipercentile') normMode = 'single';

    var shiftMean = p.shiftMean !== undefined ? Number(p.shiftMean) : Number((maxScore * 0.52).toFixed(2));
    var shiftStdDev = Math.max(0.5, Number(p.shiftStdDev !== undefined ? p.shiftStdDev : (maxScore * 0.12)) || 12);
    var overallMean = p.overallMean !== undefined ? Number(p.overallMean) : Number((maxScore * 0.56).toFixed(2));
    var overallStdDev = Math.max(0.5, Number(p.overallStdDev !== undefined ? p.overallStdDev : (maxScore * 0.13)) || 13);
    var shiftPercentile = Math.max(0, Math.min(100, Number(p.shiftPercentile !== undefined ? p.shiftPercentile : 85) || 0));

    var normalizedScore = rawScore;
    if (normMode === 'zscore') {
      var z = (rawScore - shiftMean) / shiftStdDev;
      normalizedScore = Number(Math.max(0, Math.min(maxScore, overallMean + (z * overallStdDev))).toFixed(2));
    } else if (normMode === 'equipercentile') {
      var zEq = ((shiftPercentile - 50) / 50) * 2.0;
      normalizedScore = Number(Math.max(0, Math.min(maxScore, overallMean + (zEq * overallStdDev))).toFixed(2));
    }

    var shiftDelta = Number((normalizedScore - rawScore).toFixed(2));
    var rawPct = maxScore > 0 ? Math.max(0, (rawScore / maxScore) * 100) : 0;
    var normPct = maxScore > 0 ? Math.max(0, (normalizedScore / maxScore) * 100) : 0;

    return {
      preset: preset,
      totalQuestions: totalQuestions,
      correct: correct,
      wrong: wrong,
      attempted: attempted,
      unattempted: unattempted,
      graceQuestions: graceQuestions,
      maxScore: maxScore,
      positiveMarks: positiveMarks,
      penaltyDeducted: penaltyDeducted,
      graceMarks: graceMarks,
      rawScore: rawScore,
      accuracyPct: accuracyPct,
      normMode: normMode,
      normalizedScore: normalizedScore,
      shiftDelta: shiftDelta,
      rawBarStep: quantizeStep(rawPct),
      normBarStep: quantizeStep(normPct),
      accBarStep: quantizeStep(accuracyPct)
    };
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savePrefs(state) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(state));
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

  function triggerIcs(objWin) {
    var ev = {
      title: objWin.titleEn + ' — Objection Deadline',
      dateText: objWin.deadlineIso,
      description: objWin.feeEn + ' | Proof: ' + objWin.proofEn,
      url: objWin.url,
      location: objWin.board + ' Official Portal'
    };
    if (win.CSOCalendarExport && typeof win.CSOCalendarExport.downloadSingleEvent === 'function') {
      return win.CSOCalendarExport.downloadSingleEvent(ev, 'cso-objection-' + objWin.id);
    }
    try {
      var ymd = objWin.deadlineIso.replace(/-/g, '');
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Common Sense Odisha//Answer Key v435//EN',
        'BEGIN:VEVENT', 'UID:cso-akn-' + objWin.id + '@csodisha.com',
        'DTSTART;VALUE=DATE:' + ymd, 'SUMMARY:' + ev.title, 'DESCRIPTION:' + ev.description,
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = 'cso-objection-' + objWin.id + '.ics';
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (_) {}
    return true;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      presetId: saved.presetId || 'opsc',
      totalQuestions: saved.totalQuestions || 100,
      correct: saved.correct !== undefined ? Number(saved.correct) : 65,
      wrong: saved.wrong !== undefined ? Number(saved.wrong) : 15,
      graceQuestions: saved.graceQuestions !== undefined ? Number(saved.graceQuestions) : 0,
      normMode: saved.normMode || 'zscore',
      shiftMean: saved.shiftMean !== undefined ? Number(saved.shiftMean) : 96,
      shiftStdDev: saved.shiftStdDev !== undefined ? Number(saved.shiftStdDev) : 20,
      overallMean: saved.overallMean !== undefined ? Number(saved.overallMean) : 104,
      overallStdDev: saved.overallStdDev !== undefined ? Number(saved.overallStdDev) : 22,
      shiftPercentile: saved.shiftPercentile !== undefined ? Number(saved.shiftPercentile) : 85
    };

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var calc = computeNormalizedScore(state);

      var card = el('div', 'cso-akn-card');
      card.setAttribute('data-cso-answer-key-normalizer', '1');

      // Header
      var head = el('div', 'cso-akn-head');
      var headCopy = el('div', 'cso-akn-head-copy');
      headCopy.appendChild(el('div', 'cso-akn-eyebrow', orMode
        ? '📊 ଆନ୍ସର୍ କି ମୂଲ୍ୟାଙ୍କନ ଓ ନର୍ମାଲାଇଜ୍ଡ ସ୍କୋର୍ କାଲକୁଲେଟର'
        : '📊 ANSWER KEY EVALUATOR & MULTI-SHIFT SCORE NORMALIZER'));
      headCopy.appendChild(el('h2', 'cso-akn-title', orMode
        ? 'ଓଡ଼ିଶା ପରୀକ୍ଷା ଆନ୍ସର୍ କି, ନେଗେଟିଭ୍ ମାର୍କିଂ ଓ ନର୍ମାଲାଇଜେସନ୍ କାଲକୁଲେଟର'
        : 'Odisha Govt Answer Key & Raw-to-Normalized Score Calculator'));
      headCopy.appendChild(el('p', 'cso-akn-sub', orMode
        ? 'OPSC (+2/-0.66), OSSC (+1/-0.25), OSSSC (+1/-0.25) ଓ CTET/OTET ପାଇଁ ସଠିକ୍ ର-ସ୍କୋର୍, Z-Score / Equipercentile ନର୍ମାଲାଇଜେସନ୍ ଓ ଅଭିଯୋଗ ଶେଷ ତାରିଖ ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'Evaluate response sheets with exact negative marking, grace marks, Z-Score or Equipercentile multi-shift normalization, and active objection deadlines.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-akn-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-akn-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Form
      var form = el('div', 'cso-akn-form');
      var grid = el('div', 'cso-akn-grid');

      function addField(label, ctrl) {
        var box = el('div', 'cso-akn-field');
        var lbl = el('label', 'cso-akn-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }

      var presetSel = el('select', 'cso-akn-input');
      presetSel.id = 'cso-akn-preset';
      MARKING_PRESETS.forEach(function (mp) {
        var opt = el('option', '', orMode ? mp.or : mp.en);
        opt.value = mp.id;
        if (mp.id === state.presetId) opt.selected = true;
        presetSel.appendChild(opt);
      });
      presetSel.addEventListener('change', function () {
        state.presetId = presetSel.value;
        var np = getPreset(state.presetId);
        state.totalQuestions = np.defaultTotal;
        var maxS = np.defaultTotal * np.posMarks;
        state.shiftMean = Math.round(maxS * 0.50);
        state.overallMean = Math.round(maxS * 0.54);
        state.shiftStdDev = Math.round(maxS * 0.11);
        state.overallStdDev = Math.round(maxS * 0.12);
        persistAndRender();
      });
      addField(orMode ? 'ମାର୍କିଂ ସ୍କିମ୍ ପ୍ରିସେଟ୍' : 'Exam Marking Scheme Preset', presetSel);

      function makeNumInput(id, val, min, max, step, onChange) {
        var inp = el('input', 'cso-akn-input');
        inp.id = id;
        inp.type = 'number';
        inp.min = String(min);
        inp.max = String(max);
        inp.step = String(step);
        inp.value = String(val);
        inp.addEventListener('change', function () { onChange(Number(inp.value) || 0); });
        return inp;
      }

      addField(orMode ? 'ମୋଟ ପ୍ରଶ୍ନ ସଂଖ୍ୟା' : 'Total Questions', makeNumInput('cso-akn-total', state.totalQuestions, 1, 500, 1, function (v) { state.totalQuestions = Math.max(1, Math.round(v)); persistAndRender(); }));
      addField(orMode ? 'ସଠିକ୍ ଉତ୍ତର (Correct)' : 'Correct Answers', makeNumInput('cso-akn-correct', state.correct, 0, state.totalQuestions, 1, function (v) { state.correct = Math.max(0, Math.round(v)); persistAndRender(); }));
      addField(orMode ? 'ଭୁଲ୍ ଉତ୍ତର (Wrong)' : 'Wrong Answers', makeNumInput('cso-akn-wrong', state.wrong, 0, state.totalQuestions, 1, function (v) { state.wrong = Math.max(0, Math.round(v)); persistAndRender(); }));
      addField(orMode ? 'ଗ୍ରେସ୍ / ବାତିଲ୍ ପ୍ରଶ୍ନ (+Marks)' : 'Dropped / Grace Questions (+Marks)', makeNumInput('cso-akn-grace', state.graceQuestions, 0, 50, 1, function (v) { state.graceQuestions = Math.max(0, Math.round(v)); persistAndRender(); }));

      var modeSel = el('select', 'cso-akn-input');
      modeSel.id = 'cso-akn-mode';
      [
        { id: 'single', en: 'Single-Shift (Raw Score = Final Score)', or: 'ଏକକ ଶିଫ୍ଟ (ର-ସ୍କୋର୍ = ଚୂଡ଼ାନ୍ତ ସ୍କୋର୍)' },
        { id: 'zscore', en: 'Multi-Shift Z-Score Mean & StdDev Normalization', or: 'ମଲ୍ଟି-ଶିଫ୍ଟ Z-Score ନର୍ମାଲାଇଜେସନ୍' },
        { id: 'equipercentile', en: 'Multi-Shift Equipercentile Normalization', or: 'ମଲ୍ଟି-ଶିଫ୍ଟ Equipercentile ନର୍ମାଲାଇଜେସନ୍' }
      ].forEach(function (m) {
        var opt = el('option', '', orMode ? m.or : m.en);
        opt.value = m.id;
        if (m.id === state.normMode) opt.selected = true;
        modeSel.appendChild(opt);
      });
      modeSel.addEventListener('change', function () { state.normMode = modeSel.value; persistAndRender(); });
      addField(orMode ? 'ଶିଫ୍ଟ ନର୍ମାଲାଇଜେସନ୍ ପଦ୍ଧତି' : 'Shift Normalization Mode', modeSel);

      if (state.normMode === 'zscore') {
        addField(orMode ? 'ଆପଣଙ୍କ ଶିଫ୍ଟ ହାରାହାରି (Shift Mean)' : 'Your Shift Mean Score', makeNumInput('cso-akn-smean', state.shiftMean, 0, calc.maxScore, 0.5, function (v) { state.shiftMean = v; persistAndRender(); }));
        addField(orMode ? 'ଆପଣଙ୍କ ଶିଫ୍ଟ StdDev' : 'Your Shift StdDev', makeNumInput('cso-akn-ssd', state.shiftStdDev, 0.5, calc.maxScore, 0.5, function (v) { state.shiftStdDev = Math.max(0.5, v); persistAndRender(); }));
        addField(orMode ? 'ସମଗ୍ର ଶିଫ୍ଟ ହାରାହାରି (Overall Mean)' : 'All-Shift Overall Mean', makeNumInput('cso-akn-omean', state.overallMean, 0, calc.maxScore, 0.5, function (v) { state.overallMean = v; persistAndRender(); }));
        addField(orMode ? 'ସମଗ୍ର ଶିଫ୍ଟ StdDev' : 'All-Shift Overall StdDev', makeNumInput('cso-akn-osd', state.overallStdDev, 0.5, calc.maxScore, 0.5, function (v) { state.overallStdDev = Math.max(0.5, v); persistAndRender(); }));
      } else if (state.normMode === 'equipercentile') {
        addField(orMode ? 'ଆପଣଙ୍କ ଶିଫ୍ଟ ପର୍ସେଣ୍ଟାଇଲ୍ (0–100)' : 'Your Shift Percentile (0–100)', makeNumInput('cso-akn-pct', state.shiftPercentile, 0, 100, 0.5, function (v) { state.shiftPercentile = Math.max(0, Math.min(100, v)); persistAndRender(); }));
        addField(orMode ? 'ସମଗ୍ର ଶିଫ୍ଟ ହାରାହାରି (Overall Mean)' : 'All-Shift Overall Mean', makeNumInput('cso-akn-omean', state.overallMean, 0, calc.maxScore, 0.5, function (v) { state.overallMean = v; persistAndRender(); }));
        addField(orMode ? 'ସମଗ୍ର ଶିଫ୍ଟ StdDev' : 'All-Shift Overall StdDev', makeNumInput('cso-akn-osd', state.overallStdDev, 0.5, calc.maxScore, 0.5, function (v) { state.overallStdDev = Math.max(0.5, v); persistAndRender(); }));
      }

      form.appendChild(grid);
      card.appendChild(form);

      // KPI Results Strip
      var deltaPrefix = calc.shiftDelta >= 0 ? '+' : '';
      var kpis = el('div', 'cso-akn-kpis');
      [
        { lbl: orMode ? 'ସଠିକ୍ ର-ସ୍କୋର୍ (Raw Score)' : 'Exact Raw Score', val: calc.rawScore + ' / ' + calc.maxScore, sub: (orMode ? 'ଅଣ-ଉତ୍ତରିତ: ' : 'Unattempted: ') + calc.unattempted, mod: '' },
        { lbl: orMode ? 'ନର୍ମାଲାଇଜ୍ଡ ଚୂଡ଼ାନ୍ତ ସ୍କୋର୍' : 'Normalized Final Score', val: calc.normalizedScore + ' / ' + calc.maxScore, sub: (orMode ? 'ଶିଫ୍ଟ ପାର୍ଥକ୍ୟ: ' : 'Shift Delta: ') + deltaPrefix + calc.shiftDelta, mod: ' cso-akn-kpi--win' },
        { lbl: orMode ? 'ସଠିକତା ହାର (Accuracy)' : 'Accuracy (%)', val: calc.accuracyPct + '%', sub: calc.correct + ' / ' + calc.attempted + (orMode ? ' ଚେଷ୍ଟିତ' : ' attempted'), mod: '' },
        { lbl: orMode ? 'ନେଗେଟିଭ୍ କଟାଯାଇଥିବା ମାର୍କ' : 'Net Penalty Deducted', val: '-' + calc.penaltyDeducted, sub: (orMode ? 'ଗ୍ରେସ୍ ମାର୍କ: +' : 'Grace Marks: +') + calc.graceMarks, mod: '' }
      ].forEach(function (k) {
        var box = el('div', 'cso-akn-kpi' + k.mod);
        box.appendChild(el('span', 'cso-akn-kpi-lbl', k.lbl));
        box.appendChild(el('strong', 'cso-akn-kpi-val', k.val));
        box.appendChild(el('span', 'cso-akn-kpi-sub', k.sub));
        kpis.appendChild(box);
      });
      card.appendChild(kpis);

      // Discrete CSS Comparison Bars
      var bars = el('div', 'cso-akn-bars');
      [
        { lbl: (orMode ? 'ର-ସ୍କୋର୍: ' : 'Raw Score: ') + calc.rawScore + ' / ' + calc.maxScore, step: calc.rawBarStep, cls: 'cso-akn-fill--raw' },
        { lbl: (orMode ? 'ନର୍ମାଲାଇଜ୍ଡ ସ୍କୋର୍: ' : 'Normalized Score: ') + calc.normalizedScore + ' / ' + calc.maxScore, step: calc.normBarStep, cls: 'cso-akn-fill--norm' },
        { lbl: (orMode ? 'ସଠିକତା: ' : 'Accuracy: ') + calc.accuracyPct + '%', step: calc.accBarStep, cls: 'cso-akn-fill--acc' }
      ].forEach(function (b) {
        var r = el('div', 'cso-akn-bar-row');
        r.appendChild(el('div', 'cso-akn-bar-lbl', b.lbl));
        var trk = el('div', 'cso-akn-bar-track');
        trk.appendChild(el('div', 'cso-akn-bar-fill ' + b.cls + ' cso-vfv-bar--w' + b.step));
        r.appendChild(trk);
        bars.appendChild(r);
      });
      card.appendChild(bars);

      // Copy & Print Actions
      var actions = el('div', 'cso-akn-actions');
      var statusEl = el('span', 'cso-akn-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-akn-btn cso-akn-btn--primary', orMode ? '📋 ସ୍କୋର୍ ଓ ନର୍ମାଲାଇଜେସନ୍ ରିପୋର୍ଟ କପି' : '📋 Copy Score & Normalization Report');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var text = [
          'CS Odisha — Answer Key & Normalization Report (' + calc.preset.en + ')',
          'Attempted: ' + calc.attempted + '/' + calc.totalQuestions + ' (Correct: ' + calc.correct + ', Wrong: ' + calc.wrong + ', Unattempted: ' + calc.unattempted + ')',
          'Positive: +' + calc.positiveMarks + ' | Penalty: -' + calc.penaltyDeducted + ' | Grace: +' + calc.graceMarks,
          'Exact Raw Score: ' + calc.rawScore + ' / ' + calc.maxScore + ' | Accuracy: ' + calc.accuracyPct + '%',
          'Normalized Final Score (' + calc.normMode + '): ' + calc.normalizedScore + ' / ' + calc.maxScore + ' (Delta: ' + deltaPrefix + calc.shiftDelta + ')',
          'Evaluate yours: https://csodisha.com/results/#cso-answer-key-normalizer-root'
        ].join('\n');
        copyText(text).then(function () {
          statusEl.textContent = orMode ? '✅ ରିପୋର୍ଟ କପି ହୋଇଗଲା!' : '✅ Score report copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-akn-btn', orMode ? '🖨️ ଆନ୍ସର୍ କି ମୂଲ୍ୟାଙ୍କନ ଶିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Answer Key Evaluation Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(statusEl);
      card.appendChild(actions);

      // Active Answer Key Objection-Window & Fee Tracker
      var objSec = el('div', 'cso-akn-objections');
      objSec.appendChild(el('h3', 'cso-akn-sec-title', orMode ? '⚖️ ସକ୍ରିୟ ଆନ୍ସର୍ କି ଅଭିଯୋଗ ୱିଣ୍ଡୋ ଓ ଫି ଟ୍ରାକର୍' : '⚖️ Active Answer Key Objection-Window & Fee Tracker'));
      var objGrid = el('div', 'cso-akn-obj-grid');
      OBJECTION_WINDOWS.forEach(function (ow) {
        var tile = el('article', 'cso-akn-obj-card');
        tile.appendChild(el('span', 'cso-akn-obj-badge', ow.board + ' · ' + ow.deadlineIso));
        tile.appendChild(el('h4', 'cso-akn-obj-title', orMode ? ow.titleOr : ow.titleEn));
        tile.appendChild(el('p', 'cso-akn-obj-meta', (orMode ? '💸 ଫି: ' : '💸 Fee: ') + (orMode ? ow.feeOr : ow.feeEn)));
        tile.appendChild(el('p', 'cso-akn-obj-meta', (orMode ? '📚 ପ୍ରମାଣ: ' : '📚 Proof: ') + (orMode ? ow.proofOr : ow.proofEn)));

        var rowAct = el('div', 'cso-akn-obj-actions');
        var icsBtn = el('button', 'cso-akn-btn', orMode ? '📅 ଅଭିଯୋଗ ତାରିଖ (.ics)' : '📅 Add Objection Deadline (.ics)');
        icsBtn.type = 'button';
        icsBtn.addEventListener('click', function () { triggerIcs(ow); });
        rowAct.appendChild(icsBtn);

        var isSaved = Boolean(win.CSOSavedAlerts && typeof win.CSOSavedAlerts.isSaved === 'function' && win.CSOSavedAlerts.isSaved('akn-' + ow.id));
        var saveBtn = el('button', 'cso-akn-btn', isSaved ? '★ Saved' : (orMode ? '☆ ଆଲର୍ଟ ସେଭ୍' : '☆ Save Answer Key Alert'));
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', function () {
          if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.toggleAlert === 'function') {
            win.CSOSavedAlerts.toggleAlert({
              id: 'akn-' + ow.id,
              title: ow.titleEn,
              category: 'Answer Key',
              deadline: ow.deadlineIso,
              url: '/results/#cso-answer-key-normalizer-root'
            });
            render();
          }
        });
        rowAct.appendChild(saveBtn);
        tile.appendChild(rowAct);
        objGrid.appendChild(tile);
      });
      objSec.appendChild(objGrid);
      card.appendChild(objSec);

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
    MARKING_PRESETS: MARKING_PRESETS,
    OBJECTION_WINDOWS: OBJECTION_WINDOWS,
    getPreset: getPreset,
    computeNormalizedScore: computeNormalizedScore,
    mount: mount
  };
});
