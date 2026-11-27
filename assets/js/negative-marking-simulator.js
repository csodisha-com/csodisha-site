/**
 * Common Sense Odisha — Interactive Odisha Govt Exam Negative-Marking Risk
 * & Attempt Strategy Simulator (/mock-tests/ & /tools/, v444)
 * Simulates expected net score, 10th-percentile floor, 90th-percentile ceiling,
 * break-even guess accuracy threshold, and Conservative vs Balanced vs Aggressive
 * attempt strategies for OPSC, OSSC, OSSSC, OPRB & CTET/OTET/OSSTET exams.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS progress bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSONegativeMarkingSimulator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSONegativeMarkingSimulator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v444';
  var ROOT_ID = 'cso-negative-marking-simulator-root';
  var PREFS_KEY = 'cso_negative_marking_prefs_v1';

  var EXAM_PRESETS = [
    {
      id: 'opsc-prelims',
      en: 'OPSC Prelims (OAS / OES / ASO — +2.00 / -0.66)',
      or: 'OPSC ପ୍ରିଲିମ୍ସ (OAS / OES / ASO — +2.00 / -0.66)',
      reward: 2.0,
      penalty: 2 / 3,
      penaltyLabel: '-0.66 (1/3rd)',
      totalQuestions: 100,
      defaultCutoff: 92,
      optionsCount: 4
    },
    {
      id: 'ossc-cglre',
      en: 'OSSC Prelims / Mains (CGLRE / CHSL — +1.00 / -0.25)',
      or: 'OSSC ପ୍ରିଲିମ୍ସ / ମେନ୍ସ (CGLRE / CHSL — +1.00 / -0.25)',
      reward: 1.0,
      penalty: 0.25,
      penaltyLabel: '-0.25 (1/4th)',
      totalQuestions: 150,
      defaultCutoff: 98,
      optionsCount: 4
    },
    {
      id: 'osssc-district',
      en: 'OSSSC District Cadre (RI / ARI / Amin / Forest Guard — +1.00 / -0.25)',
      or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / ଫରେଷ୍ଟ ଗାର୍ଡ — +1.00 / -0.25)',
      reward: 1.0,
      penalty: 0.25,
      penaltyLabel: '-0.25 (1/4th)',
      totalQuestions: 180,
      defaultCutoff: 118,
      optionsCount: 4
    },
    {
      id: 'oprb-police',
      en: 'Odisha Police SI / Constable (OPRB — +1.00 / -0.25)',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI / କନେଷ୍ଟବଳ (OPRB — +1.00 / -0.25)',
      reward: 1.0,
      penalty: 0.25,
      penaltyLabel: '-0.25 (1/4th)',
      totalQuestions: 100,
      defaultCutoff: 64,
      optionsCount: 4
    },
    {
      id: 'tet-zero-neg',
      en: 'CBSE CTET / OTET / OSSTET (+1.00 / 0.00 Zero Negative)',
      or: 'CTET / OTET / OSSTET (+1.00 / 0.00 ଶୂନ୍ୟ ନେଗେଟିଭ୍)',
      reward: 1.0,
      penalty: 0,
      penaltyLabel: '0.00 (No Negative)',
      totalQuestions: 150,
      defaultCutoff: 90,
      optionsCount: 4
    }
  ];

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function findPreset(presetId) {
    for (var i = 0; i < EXAM_PRESETS.length; i += 1) {
      if (EXAM_PRESETS[i].id === presetId) return EXAM_PRESETS[i];
    }
    return EXAM_PRESETS[0];
  }

  function bucketStats(count, prob, reward, penalty) {
    var n = Math.max(0, Math.round(Number(count) || 0));
    var p = Math.max(0, Math.min(1, Number(prob) || 0));
    var expected = n * (p * reward - (1 - p) * penalty);
    var perQRange = reward + penalty;
    var variance = n * p * (1 - p) * perQRange * perQRange;
    return { count: n, prob: p, expected: expected, variance: variance };
  }

  function simulateAttemptStrategy(params) {
    var p = params || {};
    var preset = findPreset(p.presetId || 'opsc-prelims');
    var reward = p.reward !== undefined ? Math.max(0.25, Number(p.reward) || preset.reward) : preset.reward;
    var penalty = p.penalty !== undefined ? Math.max(0, Number(p.penalty) || 0) : preset.penalty;
    var totalQuestions = Math.max(10, Math.min(300, Math.round(Number(p.totalQuestions || preset.totalQuestions) || preset.totalQuestions)));
    var maxMarks = round2(totalQuestions * reward);
    var targetCutoff = Math.max(0, Math.min(maxMarks, Number(p.targetCutoff !== undefined ? p.targetCutoff : preset.defaultCutoff) || 0));

    var sureAccuracy = Math.max(0.5, Math.min(1, Number(p.sureAccuracy !== undefined ? p.sureAccuracy : 0.90) || 0.90));
    var sureCount = Math.max(0, Math.min(totalQuestions, Math.round(Number(p.sureCount !== undefined ? p.sureCount : Math.round(totalQuestions * 0.50)) || 0)));
    var rem1 = Math.max(0, totalQuestions - sureCount);
    var fiftyCount = Math.max(0, Math.min(rem1, Math.round(Number(p.fiftyCount !== undefined ? p.fiftyCount : Math.round(totalQuestions * 0.22)) || 0)));
    var rem2 = Math.max(0, rem1 - fiftyCount);
    var threeOptCount = Math.max(0, Math.min(rem2, Math.round(Number(p.threeOptCount !== undefined ? p.threeOptCount : Math.round(totalQuestions * 0.10)) || 0)));
    var rem3 = Math.max(0, rem2 - threeOptCount);
    var blindCount = Math.max(0, Math.min(rem3, Math.round(Number(p.blindCount !== undefined ? p.blindCount : Math.round(totalQuestions * 0.08)) || 0)));

    var attemptedCount = sureCount + fiftyCount + threeOptCount + blindCount;
    var skippedCount = Math.max(0, totalQuestions - attemptedCount);

    var bSure = bucketStats(sureCount, sureAccuracy, reward, penalty);
    var bFifty = bucketStats(fiftyCount, 0.50, reward, penalty);
    var bThree = bucketStats(threeOptCount, 1 / 3, reward, penalty);
    var bBlind = bucketStats(blindCount, 0.25, reward, penalty);

    var expectedNet = bSure.expected + bFifty.expected + bThree.expected + bBlind.expected;
    var totalStdDev = Math.sqrt(bSure.variance + bFifty.variance + bThree.variance + bBlind.variance);
    // 10th & 90th percentile normal approximation (z = 1.28155)
    var floor10 = Math.max(-attemptedCount * penalty, expectedNet - 1.28155 * totalStdDev);
    var ceiling90 = Math.min(maxMarks, expectedNet + 1.28155 * totalStdDev);

    var breakEvenPct = round2((penalty / (reward + penalty)) * 100);
    var gainFromFifty = round2(bFifty.expected);
    var gainFromThree = round2(bThree.expected);
    var gainFromBlind = round2(bBlind.expected);

    var verdictCode = 'borderline';
    var verdictEn = '🟡 BORDERLINE — OPTIMIZE 50-50 ELIMINATIONS';
    var verdictOr = '🟡 ସୀମାରେଖା — 50-50 ଏଲିମିନେସନ୍ ବଢ଼ାନ୍ତୁ';
    if (penalty === 0 && skippedCount > 0) {
      verdictCode = 'attempt-all';
      verdictEn = '✅ ZERO NEGATIVE — ATTEMPT ALL ' + totalQuestions + ' QUESTIONS SAFELY';
      verdictOr = '✅ ଶୂନ୍ୟ ନେଗେଟିଭ୍ — ସବୁ ' + totalQuestions + ' ପ୍ରଶ୍ନ ନିରାପଦରେ ଉତ୍ତର ଦିଅନ୍ତୁ';
    } else if (expectedNet >= targetCutoff + 2 && floor10 >= targetCutoff - 4 && (blindCount === 0 || gainFromBlind >= 0)) {
      verdictCode = 'safe';
      verdictEn = '✅ SAFE ABOVE CUT-OFF';
      verdictOr = '✅ କଟ୍-ଅଫ୍ ଉପରେ ନିରାପଦ ଜୋନ୍';
    } else if ((penalty > 0 && blindCount >= Math.max(6, Math.round(totalQuestions * 0.08)) && gainFromBlind <= 0) || expectedNet < targetCutoff - 3) {
      verdictCode = 'high-risk';
      verdictEn = '⚠️ HIGH NEGATIVE RISK — TRIM BLIND GUESSES';
      verdictOr = '⚠️ ଉଚ୍ଚ ନେଗେଟିଭ୍ ବିପଦ — ଅନ୍ଧ ଅନୁମାନ କମାନ୍ତୁ';
    }

    // 3 Strategy Comparisons
    var conservativeNet = round2(bSure.expected);
    var balancedNet = round2(bSure.expected + bFifty.expected + (breakEvenPct < 33.3 ? bThree.expected : 0));
    var aggExtraBlind = bucketStats(skippedCount, 0.25, reward, penalty);
    var aggressiveNet = round2(expectedNet + aggExtraBlind.expected);

    var strategies = [
      {
        id: 'conservative',
        en: 'Conservative (Sure-Shot Only)',
        or: 'ସୁରକ୍ଷିତ (କେବଳ ନିଶ୍ଚିତ ପ୍ରଶ୍ନ)',
        attempts: sureCount,
        expectedScore: conservativeNet,
        pctOfMax: maxMarks > 0 ? Math.max(0, Math.round((conservativeNet / maxMarks) * 100)) : 0,
        clearsCutoff: conservativeNet >= targetCutoff
      },
      {
        id: 'balanced',
        en: 'Balanced (Sure + 50-50 Eliminations)',
        or: 'ସନ୍ତୁଳିତ (ନିଶ୍ଚିତ + 50-50 ଏଲିମିନେସନ୍)',
        attempts: sureCount + fiftyCount + (breakEvenPct < 33.3 ? threeOptCount : 0),
        expectedScore: balancedNet,
        pctOfMax: maxMarks > 0 ? Math.max(0, Math.round((balancedNet / maxMarks) * 100)) : 0,
        clearsCutoff: balancedNet >= targetCutoff
      },
      {
        id: 'aggressive',
        en: 'Aggressive (All ' + totalQuestions + ' Attempted)',
        or: 'ଆକ୍ରମଣାତ୍ମକ (ସବୁ ' + totalQuestions + ' ପ୍ରଶ୍ନ)',
        attempts: totalQuestions,
        expectedScore: aggressiveNet,
        pctOfMax: maxMarks > 0 ? Math.max(0, Math.round((aggressiveNet / maxMarks) * 100)) : 0,
        clearsCutoff: aggressiveNet >= targetCutoff
      }
    ];

    return {
      presetId: preset.id,
      presetLabelEn: preset.en,
      reward: round2(reward),
      penalty: round2(penalty),
      totalQuestions: totalQuestions,
      maxMarks: maxMarks,
      targetCutoff: round2(targetCutoff),
      sureCount: sureCount,
      fiftyCount: fiftyCount,
      threeOptCount: threeOptCount,
      blindCount: blindCount,
      attemptedCount: attemptedCount,
      skippedCount: skippedCount,
      breakEvenPct: breakEvenPct,
      expectedNet: round2(expectedNet),
      floor10: round2(floor10),
      ceiling90: round2(ceiling90),
      gainFromFifty: gainFromFifty,
      gainFromThree: gainFromThree,
      gainFromBlind: gainFromBlind,
      verdictCode: verdictCode,
      verdictEn: verdictEn,
      verdictOr: verdictOr,
      strategies: strategies
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

  function savePrefs(obj) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(obj));
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
    var saved = loadPrefs() || {};
    var defPreset = findPreset(saved.presetId || 'opsc-prelims');

    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      presetId: defPreset.id,
      totalQuestions: Number(saved.totalQuestions) || defPreset.totalQuestions,
      targetCutoff: saved.targetCutoff !== undefined ? Number(saved.targetCutoff) : defPreset.defaultCutoff,
      sureAccuracy: Number(saved.sureAccuracy) || 0.90,
      sureCount: saved.sureCount !== undefined ? Number(saved.sureCount) : Math.round(defPreset.totalQuestions * 0.50),
      fiftyCount: saved.fiftyCount !== undefined ? Number(saved.fiftyCount) : Math.round(defPreset.totalQuestions * 0.22),
      threeOptCount: saved.threeOptCount !== undefined ? Number(saved.threeOptCount) : Math.round(defPreset.totalQuestions * 0.10),
      blindCount: saved.blindCount !== undefined ? Number(saved.blindCount) : Math.round(defPreset.totalQuestions * 0.08)
    };

    function persist() { savePrefs(state); }

    function render() {
      var isOr = state.lang === 'or';
      var sim = simulateAttemptStrategy(state);
      var card = el('div', 'cso-nms-card');

      // Header
      var head = el('div', 'cso-nms-head');
      var hLeft = el('div');
      hLeft.appendChild(el('p', 'cso-nms-eyebrow', isOr ? 'ପରୀକ୍ଷା ରଣନୀତି ସିମୁଲେଟର୍ • v444' : 'EXAM ATTEMPT STRATEGY SIMULATOR • v444'));
      hLeft.appendChild(el('h2', 'cso-nms-title', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ନେଗେଟିଭ୍-ମାର୍କିଂ ଓ ପ୍ରୟାସ ରଣନୀତି ସିମୁଲେଟର୍' : 'Odisha Govt Exam Negative-Marking Risk & Attempt Strategy Simulator'));
      hLeft.appendChild(el('p', 'cso-nms-sub', isOr ? 'OPSC, OSSC, OSSSC, OPRB ଓ TET ପାଇଁ 50-50 ଏଲିମିନେସନ୍, ବ୍ରେକ୍-ଇଭେନ୍ ସଠିକତା ଓ ସମ୍ଭାବ୍ୟ ସ୍କୋର ହିସାବ କରନ୍ତୁ।' : 'Model break-even guess accuracy, 50-50 elimination gain, and 10th–90th percentile score ranges for OPSC, OSSC, OSSSC, OPRB & TET.'));
      head.appendChild(hLeft);

      var langBox = el('div', 'cso-nms-lang-toggle');
      var enBtn = el('button', 'cso-nms-lang-btn', 'English');
      enBtn.type = 'button';
      enBtn.setAttribute('aria-pressed', String(!isOr));
      enBtn.addEventListener('click', function () { state.lang = 'en'; persist(); render(); });
      var orBtn = el('button', 'cso-nms-lang-btn', 'ଓଡ଼ିଆ');
      orBtn.type = 'button';
      orBtn.setAttribute('aria-pressed', String(isOr));
      orBtn.addEventListener('click', function () { state.lang = 'or'; persist(); render(); });
      langBox.appendChild(enBtn);
      langBox.appendChild(orBtn);
      head.appendChild(langBox);
      card.appendChild(head);

      // Preset Pills
      var presetsRow = el('div', 'cso-nms-presets');
      EXAM_PRESETS.forEach(function (pr) {
        var b = el('button', 'cso-nms-preset-btn', isOr ? pr.or : pr.en);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(state.presetId === pr.id));
        b.addEventListener('click', function () {
          state.presetId = pr.id;
          state.totalQuestions = pr.totalQuestions;
          state.targetCutoff = pr.defaultCutoff;
          state.sureCount = Math.round(pr.totalQuestions * 0.52);
          state.fiftyCount = Math.round(pr.totalQuestions * 0.22);
          state.threeOptCount = Math.round(pr.totalQuestions * 0.10);
          state.blindCount = pr.penalty === 0 ? (pr.totalQuestions - state.sureCount - state.fiftyCount - state.threeOptCount) : Math.round(pr.totalQuestions * 0.06);
          persist();
          render();
        });
        presetsRow.appendChild(b);
      });
      card.appendChild(presetsRow);

      // Controls Grid
      var grid = el('div', 'cso-nms-grid');
      function addNumField(labelTxt, val, min, max, step, onChange) {
        var f = el('div', 'cso-nms-field');
        f.appendChild(el('label', null, labelTxt));
        var inp = el('input', 'cso-nms-input');
        inp.type = 'number';
        inp.min = String(min);
        inp.max = String(max);
        inp.step = String(step);
        inp.value = String(val);
        inp.addEventListener('change', function () {
          onChange(Number(inp.value));
          persist();
          render();
        });
        f.appendChild(inp);
        grid.appendChild(f);
      }

      addNumField(isOr ? 'ମୋଟ ପ୍ରଶ୍ନ ସଂଖ୍ୟା' : 'Total Questions', state.totalQuestions, 10, 300, 1, function (v) { state.totalQuestions = Math.max(10, Math.min(300, Math.round(v || 100))); });
      addNumField(isOr ? 'ଲକ୍ଷ୍ୟ କଟ୍-ଅଫ୍ ମାର୍କ' : 'Target Cut-Off Marks', state.targetCutoff, 0, sim.maxMarks, 0.5, function (v) { state.targetCutoff = Math.max(0, v || 0); });
      addNumField(isOr ? 'ନିଶ୍ଚିତ ପ୍ରଶ୍ନ (Sure-Shot)' : 'Sure-Shot Questions', state.sureCount, 0, state.totalQuestions, 1, function (v) { state.sureCount = Math.max(0, Math.round(v || 0)); });
      addNumField(isOr ? 'ନିଶ୍ଚିତ ସଠିକତା (%)' : 'Sure-Shot Accuracy (%)', Math.round(state.sureAccuracy * 100), 60, 100, 1, function (v) { state.sureAccuracy = Math.max(0.6, Math.min(1, (v || 90) / 100)); });
      addNumField(isOr ? '50-50 ଏଲିମିନେଟେଡ୍ ପ୍ରଶ୍ନ' : '50-50 Eliminated Qs', state.fiftyCount, 0, state.totalQuestions, 1, function (v) { state.fiftyCount = Math.max(0, Math.round(v || 0)); });
      addNumField(isOr ? '3-ବିକଳ୍ପ ସୀମିତ ପ୍ରଶ୍ନ' : '3-Option Narrowed Qs', state.threeOptCount, 0, state.totalQuestions, 1, function (v) { state.threeOptCount = Math.max(0, Math.round(v || 0)); });
      addNumField(isOr ? 'ଅନ୍ଧ ଅନୁମାନ (Blind Guesses)' : 'Blind Guesses (4-Opt)', state.blindCount, 0, state.totalQuestions, 1, function (v) { state.blindCount = Math.max(0, Math.round(v || 0)); });
      card.appendChild(grid);

      // Verdict Banner
      var verdictBanner = el('div', 'cso-nms-verdict cso-nms-verdict--' + sim.verdictCode, isOr ? sim.verdictOr : sim.verdictEn);
      card.appendChild(verdictBanner);

      // KPI Strip
      var kpis = el('div', 'cso-nms-kpis');
      var kpiList = [
        { l: isOr ? 'ସମ୍ଭାବ୍ୟ ନେଟ୍ ସ୍କୋର' : 'Expected Net Score', v: sim.expectedNet + ' / ' + sim.maxMarks },
        { l: isOr ? '10th–90th ରେଞ୍ଜ' : 'Floor (10%) – Ceiling (90%)', v: sim.floor10 + ' – ' + sim.ceiling90 },
        { l: isOr ? 'ବ୍ରେକ୍-ଇଭେନ୍ ସଠିକତା' : 'Break-Even Accuracy', v: sim.breakEvenPct + '%' },
        { l: isOr ? '50-50 ବନାମ ଅନ୍ଧ ଲାଭ' : '50-50 vs Blind Net Gain', v: (sim.gainFromFifty >= 0 ? '+' : '') + sim.gainFromFifty + ' / ' + (sim.gainFromBlind >= 0 ? '+' : '') + sim.gainFromBlind }
      ];
      kpiList.forEach(function (k) {
        var box = el('div', 'cso-nms-kpi');
        box.appendChild(el('div', 'cso-nms-kpi-label', k.l));
        box.appendChild(el('div', 'cso-nms-kpi-val', k.v));
        kpis.appendChild(box);
      });
      card.appendChild(kpis);

      // Scenario Comparison Matrix
      var compWrap = el('div', 'cso-nms-comp');
      compWrap.appendChild(el('h3', 'cso-nms-comp-title', isOr ? 'ରଣନୀତି ତୁଳନା (Conservative vs Balanced vs Aggressive)' : 'Attempt Strategy Comparison Matrix'));
      sim.strategies.forEach(function (st) {
        var row = el('div', 'cso-nms-comp-row');
        var top = el('div', 'cso-nms-comp-top');
        top.appendChild(el('strong', null, isOr ? st.or : st.en));
        top.appendChild(el('span', null, st.expectedScore + ' marks (' + st.attempts + ' Qs) ' + (st.clearsCutoff ? '✅' : '⚠️')));
        row.appendChild(top);
        var track = el('div', 'cso-vfv-track');
        var bar = el('div', 'cso-vfv-bar cso-vfv-bar--w' + quantizeStep(st.pctOfMax));
        track.appendChild(bar);
        row.appendChild(track);
        compWrap.appendChild(row);
      });
      card.appendChild(compWrap);

      // Actions
      var statusEl = el('div', 'cso-nms-status');
      var actions = el('div', 'cso-nms-actions');
      var copyBtn = el('button', 'cso-nms-btn cso-nms-btn--primary', isOr ? '📋 ପରୀକ୍ଷା ରଣନୀତି କପି କରନ୍ତୁ' : '📋 Copy Exam Attempt Strategy');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var summary = [
          'CS Odisha — Negative-Marking Strategy (' + sim.presetLabelEn + ')',
          'Expected Net: ' + sim.expectedNet + '/' + sim.maxMarks + ' (Floor ' + sim.floor10 + ' – Ceiling ' + sim.ceiling90 + ')',
          'Break-Even Threshold: ' + sim.breakEvenPct + '% | Target Cut-Off: ' + sim.targetCutoff,
          'Attempts: Sure=' + sim.sureCount + ', 50-50=' + sim.fiftyCount + ', 3-Opt=' + sim.threeOptCount + ', Blind=' + sim.blindCount + ', Skipped=' + sim.skippedCount,
          'Verdict: ' + sim.verdictEn
        ].join('\n');
        copyText(summary, statusEl, isOr ? 'ରଣନୀତି କ୍ଲିପବୋର୍ଡରେ କପି ହେଲା!' : 'Exam attempt strategy copied to clipboard!');
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-nms-btn', isOr ? '🖨️ ରଣନୀତି କାର୍ଡ ପ୍ରିଣ୍ଟ କରନ୍ତୁ' : '🖨️ Print Strategy Card');
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
    EXAM_PRESETS: EXAM_PRESETS,
    simulateAttemptStrategy: simulateAttemptStrategy,
    mount: mount
  };
});
