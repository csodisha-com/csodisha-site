/**
 * Common Sense Odisha — Interactive Odisha Typing, Stenography &
 * Computer Skill Test Practice Arena (v424)
 * Mounted on /tools/ and /mock-tests/ (#cso-typing-skill-arena-root).
 * 100% Browser-Side English & Odia (Unicode InScript / Phonetic) WPM, Net Speed,
 * KDPH & Accuracy Trainer calibrated to Orissa High Court, OSSC & OSSSC benchmarks.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOTypingSkillArena = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOTypingSkillArena = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v424';
  var ROOT_ID = 'cso-typing-skill-arena-root';
  var HISTORY_KEY = 'cso_typing_arena_history_v1';

  var EXAM_PRESETS = [
    {
      key: 'ohc-junior-typist',
      en: 'Orissa High Court Junior Typist / DEO (40 WPM · 100 Marks)',
      or: 'ଓଡ଼ିଶା ହାଇକୋର୍ଟ ଜୁନିଅର୍ ଟାଇପିଷ୍ଟ / DEO (୪୦ WPM · ୧୦୦ ମାର୍କ)',
      targetWpmEn: 40,
      targetWpmOr: 20,
      durationSec: 600,
      maxErrorPct: 5,
      courtScale100: true,
      benchmark: '400 words in 10 mins · -0.25/mistake · >20 mistakes disqualified · Min 40/100'
    },
    {
      key: 'ossc-chsl',
      en: 'OSSC CHSL Junior Typist / Clerical (40 WPM · Max 5% Error)',
      or: 'OSSC CHSL ଜୁନିଅର୍ ଟାଇପିଷ୍ଟ (୪୦ WPM · ୯୫% ସଠିକତା)',
      targetWpmEn: 40,
      targetWpmOr: 20,
      durationSec: 600,
      maxErrorPct: 5,
      courtScale100: false,
      benchmark: '40 WPM English (12,000 KDPH) · Min 95% Net Accuracy'
    },
    {
      key: 'osssc-ja-deo',
      en: 'OSSSC Junior Assistant / DEO (40 WPM EN · 20 WPM Odia)',
      or: 'OSSSC ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ / DEO (୪୦ WPM EN · ୨୦ WPM ଓଡ଼ିଆ)',
      targetWpmEn: 40,
      targetWpmOr: 20,
      durationSec: 600,
      maxErrorPct: 5,
      courtScale100: false,
      benchmark: 'BIS IS 16350 Odia InScript (20 WPM) & English (40 WPM) · 10 Min'
    },
    {
      key: 'ossc-cgl-ja',
      en: 'OSSC CGLRE / Junior Assistant (30 WPM EN · 16 WPM Odia)',
      or: 'OSSC CGLRE / ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ (୩୦ WPM EN · ୧୬ WPM ଓଡ଼ିଆ)',
      targetWpmEn: 30,
      targetWpmOr: 16,
      durationSec: 600,
      maxErrorPct: 5,
      courtScale100: false,
      benchmark: '30 WPM English (9,000 KDPH) & 16 WPM Odia InScript · 10 Min'
    },
    {
      key: 'steno-dest',
      en: 'Stenography Transcription & DEO DEST (8,000 KDPH / ~27 WPM)',
      or: 'ଷ୍ଟେନୋଗ୍ରାଫି ଟ୍ରାନ୍ସକ୍ରିପସନ୍ ଓ DEO DEST (୮,୦୦୦ KDPH)',
      targetWpmEn: 27,
      targetWpmOr: 16,
      durationSec: 900,
      maxErrorPct: 5,
      courtScale100: false,
      benchmark: '8,000 Key Depressions Per Hour (KDPH) · 15 Min Accuracy Drill'
    }
  ];

  var DURATIONS = [
    { sec: 60, en: '1 Min Sprint', or: '୧ ମିନିଟ୍ ସ୍ପ୍ରିଣ୍ଟ୍' },
    { sec: 120, en: '2 Min Warm-Up', or: '୨ ମିନିଟ୍ ୱାର୍ମ-ଅପ୍' },
    { sec: 300, en: '5 Min Drill', or: '୫ ମିନିଟ୍ ଡ୍ରିଲ୍' },
    { sec: 600, en: '10 Min Official Exam', or: '୧୦ ମିନିଟ୍ ଅଫିସିଆଲ୍ ପରୀକ୍ଷା' }
  ];

  var PASSAGES = {
    en: [
      {
        id: 'en-odisha-admin',
        title: 'Odisha District Administration & e-Governance',
        text: 'The Government of Odisha administers thirty districts grouped under three revenue divisions with headquarters at Cuttack, Sambalpur, and Berhampur. Through the e-District portal, citizens obtain caste, resident, income, and legal heir certificates within notified timelines. Transparent digital service delivery strengthens public trust across all three hundred fourteen Panchayat Samiti blocks of the state.'
      },
      {
        id: 'en-high-court',
        title: 'Orissa High Court Judicial Registry & Records',
        text: 'The High Court of Orissa at Cuttack exercises appellate and writ jurisdiction throughout the state. Accurate transcription of daily cause lists, certified copies, and judicial orders demands disciplined keyboard speed and strict attention to punctuation. Every clerical officer must verify dates, case numbers, and statutory citations before placing files before the Honble Bench.'
      },
      {
        id: 'en-mahanadi-geo',
        title: 'Mahanadi Basin, Chilika & Odisha Geography',
        text: 'Flowing eastward into the Bay of Bengal, the Mahanadi river system nourishes the fertile coastal plains of Odisha and supports the Hirakud Dam reservoir in Sambalpur district. South of Puri lies Chilika Lake, Asia’s largest brackish water lagoon and a designated Ramsar wetland celebrated for migratory birds and Irrawaddy dolphins.'
      },
      {
        id: 'en-orsp-service',
        title: 'Odisha Revised Scales of Pay & Public Service',
        text: 'Under the Odisha Revised Scales of Pay Rules, state government employees are placed across seventeen pay matrix levels with transparent annual increments and dearness allowance revisions. Newly appointed Junior Assistants and Data Entry Operators complete probation while mastering official noting, drafting, treasury procedures, and bilingual correspondence.'
      },
      {
        id: 'en-sams-ed',
        title: 'SAMS Odisha & Technical Education Ecosystem',
        text: 'Student Academic Management System in Odisha streamlines admissions into higher secondary schools, degree colleges, postgraduate departments, polytechnic diplomas, and industrial training institutes. Merit based seat allotment, online choice locking, and verified document reporting ensure equal opportunity for students from rural and urban districts alike.'
      },
      {
        id: 'en-heritage',
        title: 'Konark Sun Temple & Classical Odia Heritage',
        text: 'Built in the thirteenth century by King Narasimhadeva I of the Eastern Ganga dynasty, the Sun Temple at Konark stands as a UNESCO World Heritage monument shaped like a colossal stone chariot. Classical Odia literature, Pattachitra painting, Sambalpuri handloom textiles, and Odissi dance reflect centuries of living cultural excellence.'
      }
    ],
    or: [
      {
        id: 'or-odisha-admin',
        title: 'ଓଡ଼ିଶା ପ୍ରଶାସନ ଓ ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ସେବା',
        text: 'ଓଡ଼ିଶା ରାଜ୍ୟରେ ତିରିଶଟି ଜିଲ୍ଲା, ତିନୋଟି ରାଜସ୍ୱ ଡିଭିଜନ୍ ଏବଂ ତିନିଶହ ଚଉଦଟି ପଞ୍ଚାୟତ ସମିତି ବ୍ଲକ୍ ରହିଛି। ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ପୋର୍ଟାଲ୍ ମାଧ୍ୟମରେ ନାଗରିକମାନେ ଜାତି, ବାସିନ୍ଦା ଏବଂ ଆୟ ପ୍ରମାଣପତ୍ର ସହଜରେ ଅନଲାଇନରେ ପାଇପାରୁଛନ୍ତି। ସ୍ୱଚ୍ଛ ଓ ଦ୍ରୁତ ପ୍ରଶାସନିକ ସେବା ରାଜ୍ୟର ବିକାଶକୁ ଆଗେଇ ନେଉଛି।'
      },
      {
        id: 'or-mahanadi',
        title: 'ମହାନଦୀ, ହୀରାକୁଦ ଓ ଚିଲିକା ହ୍ରଦ',
        text: 'ମହାନଦୀ ହେଉଛି ଓଡ଼ିଶାର ଜୀବନରେଖା ଏବଂ ସମ୍ବଲପୁର ଜିଲ୍ଲାରେ ନିର୍ମିତ ହୀରାକୁଦ ବନ୍ଧ ବିଶ୍ୱର ଅନ୍ୟତମ ଦୀର୍ଘତମ ମାଟି ବନ୍ଧ। ପୁରୀ, ଖୋର୍ଦ୍ଧା ଓ ଗଞ୍ଜାମ ଜିଲ୍ଲାକୁ ଲାଗି ରହିଥିବା ଚିଲିକା ହ୍ରଦ ଏସିଆର ବୃହତ୍ତମ ଲୁଣିଜଳ ହ୍ରଦ ଭାବରେ ପରିଚିତ। ପ୍ରତିବର୍ଷ ଶୀତ ଋତୁରେ ଲକ୍ଷାଧିକ ବିଦେଶୀ ପକ୍ଷୀ ଏଠାକୁ ଆସନ୍ତି।'
      },
      {
        id: 'or-odia-heritage',
        title: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ଓ ଓଡ଼ିଆ ସଂସ୍କୃତି',
        text: 'ତ୍ରୟୋଦଶ ଶତାବ୍ଦୀରେ ଗଙ୍ଗ ବଂଶର ରାଜା ପ୍ରଥମ ନରସିଂହଦେବଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ବିଶ୍ୱ ଐତିହ୍ୟ ସ୍ଥଳ ଭାବରେ ମାନ୍ୟତା ପାଇଛି। ଓଡ଼ିଶୀ ନୃତ୍ୟ, ପଟ୍ଟଚିତ୍ର, ସମ୍ବଲପୁରୀ ବସ୍ତ୍ର ଏବଂ ଶାସ୍ତ୍ରୀୟ ଓଡ଼ିଆ ଭାଷା ଆମ ରାଜ୍ୟର ଗୌରବମୟ ପରମ୍ପରାକୁ ବିଶ୍ୱ ଦରବାରରେ ପରିଚିତ କରାଇଛି।'
      },
      {
        id: 'or-exam-prep',
        title: 'ସରକାରୀ ପରୀକ୍ଷା ଓ ଟାଇପିଂ ଦକ୍ଷତା',
        text: 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି ପରୀକ୍ଷାରେ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ଏବଂ ଓଡ଼ିଆ ଇନସ୍କ୍ରିପ୍ଟ ଟାଇପିଂର ଗୁରୁତ୍ୱ ବହୁତ ଅଧିକ। ପ୍ରତିଦିନ ନିୟମିତ ଅଭ୍ୟାସ ଦ୍ୱାରା ଟାଇପିଂ ଗତି ଏବଂ ସଠିକତା ବୃଦ୍ଧି ପାଇଥାଏ। ଧ୍ୟାନ ଓ ଶୃଙ୍ଖଳା ସହିତ ଅଭ୍ୟାସ କଲେ ପ୍ରାର୍ଥୀମାନେ ନିଶ୍ଚୟ ସଫଳତା ହାସଲ କରିପାରିବେ।'
      }
    ]
  };

  var ODIA_INSCRIPT_ROWS = [
    ['ୌ (q)', 'ୈ (w)', 'ା (e)', 'ୀ (r)', 'ୂ (t)', 'ବ (y)', 'ହ (u)', 'ଗ (i)', 'ଦ (o)', 'ଜ (p)', 'ଡ ([)'],
    ['ୋ (a)', 'େ (s)', '୍ (d)', 'ି (f)', 'ୁ (g)', 'ପ (h)', 'ର (j)', 'କ (k)', 'ତ (l)', 'ଚ (;)', 'ଟ (\')'],
    ['ଂ (x)', 'ମ (c)', 'ନ (v)', 'ୱ (b)', 'ଲ (n)', 'ସ (m)', ', (,)', '. (.)', 'ଯ (/)']
  ];

  function toChars(str) {
    return Array.from(String(str || ''));
  }

  function evaluateTypingSession(opts) {
    var o = opts || {};
    var targetChars = toChars(o.targetText || '');
    var typedChars = toChars(o.typedText || '');
    var elapsedSec = Math.max(1, Number(o.elapsedSeconds) || 1);
    var minutes = elapsedSec / 60;
    var targetWpm = Math.max(1, Number(o.targetWpm) || 30);
    var maxErrorPct = Number(o.maxErrorPct) >= 0 ? Number(o.maxErrorPct) : 5;
    var courtScale100 = Boolean(o.courtScale100);

    var totalChars = typedChars.length;
    var correctChars = 0;
    var errors = 0;
    for (var i = 0; i < totalChars; i += 1) {
      if (i < targetChars.length && typedChars[i] === targetChars[i]) {
        correctChars += 1;
      } else {
        errors += 1;
      }
    }

    var grossWpm = Math.round(((totalChars / 5) / minutes) * 10) / 10;
    var netWpm = Math.max(0, Math.round((((totalChars / 5) - errors) / minutes) * 10) / 10);
    var accuracyPct = totalChars > 0 ? Math.round((correctChars / totalChars) * 1000) / 10 : 100;
    var errorPct = totalChars > 0 ? Math.round((errors / totalChars) * 1000) / 10 : 0;
    var kdph = Math.round((correctChars / minutes) * 60);

    var courtScore = null;
    var courtDisqualified = false;
    var qualified = false;

    if (courtScale100) {
      var rawMarks = Math.min(100, (grossWpm / 40) * 100);
      courtScore = Math.max(0, Math.round((rawMarks - (errors * 0.25)) * 100) / 100);
      courtDisqualified = errors > 20;
      qualified = !courtDisqualified && courtScore >= 40 && netWpm >= targetWpm;
    } else {
      qualified = totalChars >= 15 && netWpm >= targetWpm && errorPct <= maxErrorPct;
    }

    var gapWpm = Math.max(0, Math.round((targetWpm - netWpm) * 10) / 10);
    var verdict = qualified
      ? ('✅ QUALIFIED (Meets ' + targetWpm + ' WPM & Error Cut-Off)')
      : (courtDisqualified
        ? ('⚠️ DISQUALIFIED (> 20 Mistakes on High Court Scale)')
        : ('⚠️ NEEDS PRACTICE (Target +' + gapWpm + ' Net WPM / ≤ ' + maxErrorPct + '% Error)'));

    return {
      totalChars: totalChars,
      correctChars: correctChars,
      errors: errors,
      grossWpm: grossWpm,
      netWpm: netWpm,
      accuracyPct: accuracyPct,
      errorPct: errorPct,
      kdph: kdph,
      targetWpm: targetWpm,
      maxErrorPct: maxErrorPct,
      courtScale100: courtScale100,
      courtScore: courtScore,
      courtDisqualified: courtDisqualified,
      qualified: qualified,
      gapWpm: gapWpm,
      verdict: verdict
    };
  }

  function resolveStorage(override) {
    if (override) return override;
    try { return (win && win.localStorage) ? win.localStorage : null; } catch (_) { return null; }
  }

  function loadHistory(storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      var raw = st && st.getItem(HISTORY_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            bestNetWpmEn: Number(parsed.bestNetWpmEn) || 0,
            bestNetWpmOr: Number(parsed.bestNetWpmOr) || 0,
            attempts: Array.isArray(parsed.attempts) ? parsed.attempts.slice(0, 5) : []
          };
        }
      }
    } catch (_) {}
    return { bestNetWpmEn: 0, bestNetWpmOr: 0, attempts: [] };
  }

  function recordAttempt(entry, storageOverride) {
    var hist = loadHistory(storageOverride);
    if (entry.medium === 'or') {
      if (entry.netWpm > hist.bestNetWpmOr) hist.bestNetWpmOr = entry.netWpm;
    } else {
      if (entry.netWpm > hist.bestNetWpmEn) hist.bestNetWpmEn = entry.netWpm;
    }
    hist.attempts.unshift(entry);
    hist.attempts = hist.attempts.slice(0, 5);
    var st = resolveStorage(storageOverride);
    try { if (st) st.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch (_) {}
    return hist;
  }

  function formatMmSs(sec) {
    var s = Math.max(0, Math.floor(Number(sec) || 0));
    var mm = Math.floor(s / 60);
    var ss = s % 60;
    return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
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
      presetKey: EXAM_PRESETS[0].key,
      medium: 'en',
      durationSec: 60,
      allowBackspace: true,
      passageIdx: 0,
      showKeymap: false,
      started: false,
      finished: false,
      startTs: 0,
      remainingSec: 60,
      timerId: null,
      lastEval: null,
      copyStatus: ''
    };

    var wrap = el('div', 'cso-tsa-wrap');

    // Header
    var head = el('div', 'cso-tsa-head');
    var titleBox = el('div', 'cso-tsa-title-box');
    var heading = el('h2', 'cso-tsa-title');
    var subtitle = el('p', 'cso-tsa-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-tsa-head-controls');
    var langGroup = el('div', 'cso-tsa-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-tsa-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-tsa-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-tsa-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Controls Grid
    var ctrlGrid = el('div', 'cso-tsa-controls');
    var presetWrap = el('div', 'cso-tsa-field');
    var presetLabel = el('label', 'cso-tsa-label');
    presetLabel.setAttribute('for', 'cso-tsa-preset');
    var presetSelect = el('select', 'cso-tsa-select');
    presetSelect.id = 'cso-tsa-preset';
    presetWrap.appendChild(presetLabel);
    presetWrap.appendChild(presetSelect);

    var medWrap = el('div', 'cso-tsa-field');
    var medLabel = el('span', 'cso-tsa-label');
    var medRow = el('div', 'cso-tsa-pills');
    var medEnBtn = el('button', 'cso-tsa-pill');
    medEnBtn.type = 'button';
    var medOrBtn = el('button', 'cso-tsa-pill');
    medOrBtn.type = 'button';
    medRow.appendChild(medEnBtn);
    medRow.appendChild(medOrBtn);
    medWrap.appendChild(medLabel);
    medWrap.appendChild(medRow);

    var durWrap = el('div', 'cso-tsa-field');
    var durLabel = el('span', 'cso-tsa-label');
    var durRow = el('div', 'cso-tsa-pills');
    durWrap.appendChild(durLabel);
    durWrap.appendChild(durRow);

    var bsWrap = el('div', 'cso-tsa-field');
    var bsLabel = el('span', 'cso-tsa-label');
    var bsRow = el('div', 'cso-tsa-pills');
    var bsAllowBtn = el('button', 'cso-tsa-pill');
    bsAllowBtn.type = 'button';
    var bsStrictBtn = el('button', 'cso-tsa-pill');
    bsStrictBtn.type = 'button';
    bsRow.appendChild(bsAllowBtn);
    bsRow.appendChild(bsStrictBtn);
    bsWrap.appendChild(bsLabel);
    bsWrap.appendChild(bsRow);

    ctrlGrid.appendChild(presetWrap);
    ctrlGrid.appendChild(medWrap);
    ctrlGrid.appendChild(durWrap);
    ctrlGrid.appendChild(bsWrap);

    var benchmarkNote = el('div', 'cso-tsa-bench');

    // Live Telemetry Bar
    var telemetry = el('div', 'cso-tsa-telemetry');
    var statGross = el('strong', 'cso-tsa-stat__n', '0');
    var statNet = el('strong', 'cso-tsa-stat__n', '0');
    var statAcc = el('strong', 'cso-tsa-stat__n', '100%');
    var statKdph = el('strong', 'cso-tsa-stat__n', '0');
    var statTime = el('strong', 'cso-tsa-stat__n', '01:00');

    function makeStat(nEl, labelEn) {
      var box = el('div', 'cso-tsa-stat');
      box.appendChild(nEl);
      box.appendChild(el('span', 'cso-tsa-stat__l', labelEn));
      return box;
    }
    telemetry.appendChild(makeStat(statGross, 'Gross WPM'));
    telemetry.appendChild(makeStat(statNet, 'Net WPM'));
    telemetry.appendChild(makeStat(statAcc, 'Accuracy (%)'));
    telemetry.appendChild(makeStat(statKdph, 'KDPH'));
    telemetry.appendChild(makeStat(statTime, 'Time Left'));

    // Passage Display + Input Box
    var passageHead = el('div', 'cso-tsa-passage-head');
    var passageTitle = el('strong', 'cso-tsa-passage-title');
    var keymapToggleBtn = el('button', 'cso-tsa-btn');
    keymapToggleBtn.type = 'button';
    passageHead.appendChild(passageTitle);
    passageHead.appendChild(keymapToggleBtn);

    var keymapBox = el('div', 'cso-tsa-keymap');
    keymapBox.hidden = true;

    var passageView = el('div', 'cso-tsa-passage');
    passageView.setAttribute('aria-live', 'off');

    var inputLabel = el('label', 'cso-tsa-label');
    inputLabel.setAttribute('for', 'cso-tsa-input');
    var inputArea = el('textarea', 'cso-tsa-textarea');
    inputArea.id = 'cso-tsa-input';
    inputArea.rows = 4;
    inputArea.setAttribute('autocomplete', 'off');
    inputArea.setAttribute('autocorrect', 'off');
    inputArea.setAttribute('autocapitalize', 'off');
    inputArea.setAttribute('spellcheck', 'false');

    var verdictBox = el('div', 'cso-tsa-verdict');
    verdictBox.setAttribute('role', 'status');
    verdictBox.setAttribute('aria-live', 'polite');
    verdictBox.hidden = true;

    var actionRow = el('div', 'cso-tsa-actions');
    var newPassageBtn = el('button', 'cso-tsa-btn cso-tsa-btn--primary');
    newPassageBtn.type = 'button';
    var finishBtn = el('button', 'cso-tsa-btn');
    finishBtn.type = 'button';
    var copyBtn = el('button', 'cso-tsa-btn');
    copyBtn.type = 'button';
    var copyStatusEl = el('span', 'cso-tsa-copy-status');
    actionRow.appendChild(newPassageBtn);
    actionRow.appendChild(finishBtn);
    actionRow.appendChild(copyBtn);
    actionRow.appendChild(copyStatusEl);

    var historyBox = el('div', 'cso-tsa-history');

    wrap.appendChild(head);
    wrap.appendChild(ctrlGrid);
    wrap.appendChild(benchmarkNote);
    wrap.appendChild(telemetry);
    wrap.appendChild(passageHead);
    wrap.appendChild(keymapBox);
    wrap.appendChild(passageView);
    wrap.appendChild(inputLabel);
    wrap.appendChild(inputArea);
    wrap.appendChild(verdictBox);
    wrap.appendChild(actionRow);
    wrap.appendChild(historyBox);
    root.replaceChildren(wrap);

    function currentPreset() {
      return EXAM_PRESETS.find(function (p) { return p.key === state.presetKey; }) || EXAM_PRESETS[0];
    }

    function currentPassage() {
      var bank = PASSAGES[state.medium] || PASSAGES.en;
      return bank[state.passageIdx % bank.length];
    }

    function stopTimer() {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
    }

    function resetSession(nextPassage) {
      stopTimer();
      if (nextPassage) state.passageIdx += 1;
      state.started = false;
      state.finished = false;
      state.startTs = 0;
      state.remainingSec = state.durationSec;
      state.lastEval = null;
      inputArea.value = '';
      inputArea.disabled = false;
      verdictBox.hidden = true;
      renderPassageHighlight();
      updateTelemetryDisplay();
    }

    function computeCurrentEval() {
      var preset = currentPreset();
      var elapsed = state.started ? Math.max(1, (Date.now() - state.startTs) / 1000) : 1;
      var targetWpm = state.medium === 'or' ? preset.targetWpmOr : preset.targetWpmEn;
      return evaluateTypingSession({
        targetText: currentPassage().text,
        typedText: inputArea.value,
        elapsedSeconds: elapsed,
        targetWpm: targetWpm,
        maxErrorPct: preset.maxErrorPct,
        courtScale100: preset.courtScale100 && state.medium === 'en'
      });
    }

    function renderPassageHighlight() {
      var target = toChars(currentPassage().text);
      var typed = toChars(inputArea.value);
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < target.length; i += 1) {
        var cls = 'cso-tsa-char cso-tsa-char--pending';
        if (i < typed.length) {
          cls = typed[i] === target[i] ? 'cso-tsa-char cso-tsa-char--ok' : 'cso-tsa-char cso-tsa-char--err';
        } else if (i === typed.length) {
          cls = 'cso-tsa-char cso-tsa-char--cur';
        }
        frag.appendChild(el('span', cls, target[i]));
      }
      passageView.replaceChildren(frag);
    }

    function updateTelemetryDisplay() {
      if (!state.started) {
        statGross.textContent = '0';
        statNet.textContent = '0';
        statAcc.textContent = '100%';
        statKdph.textContent = '0';
        statTime.textContent = formatMmSs(state.remainingSec);
        return;
      }
      var ev = computeCurrentEval();
      state.lastEval = ev;
      statGross.textContent = String(ev.grossWpm);
      statNet.textContent = String(ev.netWpm);
      statAcc.textContent = ev.accuracyPct + '%';
      statKdph.textContent = ev.kdph.toLocaleString('en-IN');
      statTime.textContent = formatMmSs(state.remainingSec);
    }

    function finishSession() {
      if (state.finished || !state.started) return;
      stopTimer();
      state.finished = true;
      inputArea.disabled = true;
      var ev = computeCurrentEval();
      state.lastEval = ev;
      updateTelemetryDisplay();

      var preset = currentPreset();
      recordAttempt({
        preset: preset.key,
        medium: state.medium,
        netWpm: ev.netWpm,
        grossWpm: ev.grossWpm,
        accuracyPct: ev.accuracyPct,
        kdph: ev.kdph,
        qualified: ev.qualified,
        ts: new Date().toISOString().slice(0, 10)
      });

      var summary = ev.verdict + ' · Net ' + ev.netWpm + ' WPM · Accuracy ' + ev.accuracyPct + '% · ' + ev.kdph + ' KDPH';
      if (ev.courtScale100 && ev.courtScore !== null) {
        summary += ' · High Court Score: ' + ev.courtScore + ' / 100';
      }
      verdictBox.className = 'cso-tsa-verdict ' + (ev.qualified ? 'is-pass' : 'is-warn');
      verdictBox.textContent = summary;
      verdictBox.hidden = false;
      renderHistory(state.lang === 'or');
    }

    function renderKeymap() {
      keymapBox.hidden = !state.showKeymap;
      if (!state.showKeymap) {
        keymapBox.replaceChildren();
        return;
      }
      var frag = doc.createDocumentFragment();
      frag.appendChild(el('div', 'cso-tsa-keymap__title', '⌨️ Odia Unicode InScript Reference (Click any key to insert)'));
      for (var r = 0; r < ODIA_INSCRIPT_ROWS.length; r += 1) {
        var rowEl = el('div', 'cso-tsa-keymap__row');
        for (var k = 0; k < ODIA_INSCRIPT_ROWS[r].length; k += 1) {
          (function (label) {
            var ch = label.split(' ')[0];
            var btn = el('button', 'cso-tsa-key', label);
            btn.type = 'button';
            btn.addEventListener('click', function () {
              if (inputArea.disabled) return;
              inputArea.value += ch;
              inputArea.dispatchEvent(new Event('input'));
              inputArea.focus();
            });
            rowEl.appendChild(btn);
          })(ODIA_INSCRIPT_ROWS[r][k]);
        }
        frag.appendChild(rowEl);
      }
      keymapBox.replaceChildren(frag);
    }

    function renderHistory(orMode) {
      var hist = loadHistory();
      var frag = doc.createDocumentFragment();
      frag.appendChild(el('div', 'cso-tsa-hist-head',
        (orMode ? '🏆 ସର୍ବୋତ୍ତମ ନେଟ୍ ସ୍ପିଡ୍: ' : '🏆 Personal Best Net Speed: ') +
        'EN ' + hist.bestNetWpmEn + ' WPM · ଓଡ଼ିଆ ' + hist.bestNetWpmOr + ' WPM'));
      if (hist.attempts.length) {
        var list = el('div', 'cso-tsa-hist-list');
        for (var i = 0; i < hist.attempts.length; i += 1) {
          var a = hist.attempts[i];
          list.appendChild(el('span', 'cso-tsa-hist-pill',
            (a.qualified ? '✅ ' : '⚠️ ') + a.medium.toUpperCase() + ' · ' + a.netWpm + ' WPM · ' + a.accuracyPct + '%'));
        }
        frag.appendChild(list);
      }
      historyBox.replaceChildren(frag);
    }

    function render() {
      var orMode = state.lang === 'or';
      var preset = currentPreset();
      btnEn.className = 'cso-tsa-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-tsa-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '⌨️ ଓଡ଼ିଶା ଟାଇପିଂ, ଷ୍ଟେନୋଗ୍ରାଫି ଓ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ଅଭ୍ୟାସ ଆରେନା'
        : '⌨️ Odisha Typing, Stenography & Computer Skill Test Practice Arena';
      subtitle.textContent = orMode
        ? 'ଓଡ଼ିଶା ହାଇକୋର୍ଟ, OSSC CGLRE/CHSL ଓ OSSSC ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ/DEO ପାଇଁ ୧୦୦% ବ୍ରାଉଜର୍-ଭିତ୍ତିକ ଇଂରାଜୀ (୩୦–୪୦ WPM) ଓ ଓଡ଼ିଆ (୧୬–୨୦ WPM) ଟାଇପିଂ ଟ୍ରେନର୍।'
        : '100% browser-side English (30–40 WPM) & Odia Unicode InScript (16–20 WPM) speed, KDPH & accuracy trainer calibrated to Orissa High Court, OSSC & OSSSC cut-offs.';
      printBtn.textContent = orMode ? '🖨️ ସ୍କୋର୍ ସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Skill-Test Score Sheet';

      presetLabel.textContent = orMode ? 'ପରୀକ୍ଷା ବେଞ୍ଚମାର୍କ ପ୍ରୋଫାଇଲ୍' : 'Odisha Exam Profile & Cut-Off Benchmark';
      var pFrag = doc.createDocumentFragment();
      for (var i = 0; i < EXAM_PRESETS.length; i += 1) {
        var opt = el('option', '', orMode ? EXAM_PRESETS[i].or : EXAM_PRESETS[i].en);
        opt.value = EXAM_PRESETS[i].key;
        if (EXAM_PRESETS[i].key === state.presetKey) opt.selected = true;
        pFrag.appendChild(opt);
      }
      presetSelect.replaceChildren(pFrag);
      presetSelect.value = state.presetKey;

      medLabel.textContent = orMode ? 'ଟାଇପିଂ ମାଧ୍ୟମ' : 'Typing Medium';
      medEnBtn.textContent = 'English (QWERTY)';
      medOrBtn.textContent = 'ଓଡ଼ିଆ (Unicode InScript / Phonetic)';
      medEnBtn.className = 'cso-tsa-pill' + (state.medium === 'en' ? ' is-active' : '');
      medOrBtn.className = 'cso-tsa-pill' + (state.medium === 'or' ? ' is-active' : '');

      durLabel.textContent = orMode ? 'ଅଭ୍ୟାସ ସମୟ' : 'Test Duration';
      var dFrag = doc.createDocumentFragment();
      for (var d = 0; d < DURATIONS.length; d += 1) {
        (function (du) {
          var b = el('button', 'cso-tsa-pill' + (state.durationSec === du.sec ? ' is-active' : ''), orMode ? du.or : du.en);
          b.type = 'button';
          b.addEventListener('click', function () {
            state.durationSec = du.sec;
            resetSession(false);
            render();
          });
          dFrag.appendChild(b);
        })(DURATIONS[d]);
      }
      durRow.replaceChildren(dFrag);

      bsLabel.textContent = orMode ? 'ବ୍ୟାକସ୍ପେସ୍ ନିୟମ' : 'Backspace Policy';
      bsAllowBtn.textContent = orMode ? 'ବ୍ୟାକସ୍ପେସ୍ ଅନୁମତି (ଅଫିସିଆଲ୍)' : 'Backspace Allowed (Default)';
      bsStrictBtn.textContent = orMode ? 'ନୋ-ବ୍ୟାକସ୍ପେସ୍ ଡ୍ରିଲ୍' : 'Strict No-Backspace Drill';
      bsAllowBtn.className = 'cso-tsa-pill' + (state.allowBackspace ? ' is-active' : '');
      bsStrictBtn.className = 'cso-tsa-pill' + (!state.allowBackspace ? ' is-active' : '');

      benchmarkNote.textContent = '🎯 Benchmark: ' + preset.benchmark;
      passageTitle.textContent = '📄 ' + currentPassage().title;
      keymapToggleBtn.textContent = state.showKeymap
        ? (orMode ? '⌨️ ଓଡ଼ିଆ କିମ୍ୟାପ୍ ଲୁଚାନ୍ତୁ' : '⌨️ Hide Odia InScript Keymap')
        : (orMode ? '⌨️ ଓଡ଼ିଆ ଇନସ୍କ୍ରିପ୍ଟ କିମ୍ୟାପ୍ ଦେଖନ୍ତୁ' : '⌨️ Show Odia InScript Keymap');

      inputLabel.textContent = orMode ? 'ଟାଇପିଂ ଆରମ୍ଭ କରନ୍ତୁ (ପ୍ରଥମ ଅକ୍ଷରରେ ଟାଇମର୍ ଚାଲିବ):' : 'Start typing below (countdown starts automatically on first keystroke):';
      inputArea.placeholder = state.medium === 'or'
        ? 'ଉପରୋକ୍ତ ଓଡ଼ିଆ ଅନୁଚ୍ଛେଦ ଏଠାରେ ଟାଇପ୍ କରନ୍ତୁ...'
        : 'Begin typing the passage shown above...';
      newPassageBtn.textContent = orMode ? '🔄 ନୂଆ ଅନୁଚ୍ଛେଦ' : '🔄 New Passage';
      finishBtn.textContent = orMode ? '🏁 ସମାପ୍ତ ଓ ମୂଲ୍ୟାଙ୍କନ' : '🏁 Finish & Grade Now';
      copyBtn.textContent = orMode ? '📋 ସ୍ପିଡ୍ ରିପୋର୍ଟ କପି' : '📋 Copy Speed Report';
      copyStatusEl.textContent = state.copyStatus;

      renderKeymap();
      renderPassageHighlight();
      updateTelemetryDisplay();
      renderHistory(orMode);
    }

    inputArea.addEventListener('keydown', function (ev) {
      if (!state.allowBackspace && ev.key === 'Backspace') {
        ev.preventDefault();
      }
    });

    inputArea.addEventListener('input', function () {
      if (state.finished) return;
      if (!state.started && inputArea.value.length > 0) {
        state.started = true;
        state.startTs = Date.now();
        state.remainingSec = state.durationSec;
        state.timerId = setInterval(function () {
          var elapsed = Math.floor((Date.now() - state.startTs) / 1000);
          state.remainingSec = Math.max(0, state.durationSec - elapsed);
          updateTelemetryDisplay();
          if (state.remainingSec <= 0) {
            finishSession();
          }
        }, 500);
      }
      renderPassageHighlight();
      updateTelemetryDisplay();
      if (toChars(inputArea.value).length >= toChars(currentPassage().text).length) {
        finishSession();
      }
    });

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });
    presetSelect.addEventListener('change', function () { state.presetKey = presetSelect.value; resetSession(false); render(); });
    medEnBtn.addEventListener('click', function () { state.medium = 'en'; state.passageIdx = 0; resetSession(false); render(); });
    medOrBtn.addEventListener('click', function () { state.medium = 'or'; state.passageIdx = 0; resetSession(false); render(); });
    bsAllowBtn.addEventListener('click', function () { state.allowBackspace = true; render(); });
    bsStrictBtn.addEventListener('click', function () { state.allowBackspace = false; render(); });
    keymapToggleBtn.addEventListener('click', function () { state.showKeymap = !state.showKeymap; render(); });
    newPassageBtn.addEventListener('click', function () { resetSession(true); render(); });
    finishBtn.addEventListener('click', function () { finishSession(); });

    copyBtn.addEventListener('click', function () {
      var ev = state.lastEval || computeCurrentEval();
      var txt = 'CS Odisha Typing Report (' + currentPreset().en + ' · ' + state.medium.toUpperCase() + '): Net ' + ev.netWpm + ' WPM | Gross ' + ev.grossWpm + ' WPM | Accuracy ' + ev.accuracyPct + '% | ' + ev.kdph + ' KDPH | ' + ev.verdict;
      if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        win.navigator.clipboard.writeText(txt).then(function () {
          state.copyStatus = '✅ Copied Speed Report!';
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
    HISTORY_KEY: HISTORY_KEY,
    EXAM_PRESETS: EXAM_PRESETS,
    DURATIONS: DURATIONS,
    PASSAGES: PASSAGES,
    ODIA_INSCRIPT_ROWS: ODIA_INSCRIPT_ROWS,
    evaluateTypingSession: evaluateTypingSession,
    loadHistory: loadHistory,
    recordAttempt: recordAttempt,
    mount: mount
  };
});
