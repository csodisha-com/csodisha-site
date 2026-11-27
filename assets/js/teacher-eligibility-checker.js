/**
 * Common Sense Odisha — Interactive Odisha Govt Teacher
 * (LTR / SSD / OAV / OTET / OSSTET) Eligibility & Subject-Combination Checker (v428)
 * Mounted on /exams/ and /guides/ (#cso-teacher-eligibility-root).
 * Validates all 9 Odisha Secondary & Elementary teacher tracks, subject combinations,
 * B.Ed./D.El.Ed./ITEP degrees, category percentage relaxations & TET lifetime validity.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOTeacherEligibilityChecker = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOTeacherEligibilityChecker = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v428';
  var ROOT_ID = 'cso-teacher-eligibility-root';
  var PREFS_KEY = 'cso_teacher_eligibility_prefs_v1';

  var SUBJECT_POOL = [
    { key: 'history', en: 'History', group: 'arts' },
    { key: 'geography', en: 'Geography', group: 'arts' },
    { key: 'pol-science', en: 'Political Science / Indian Polity', group: 'arts' },
    { key: 'economics', en: 'Economics / Indian Economy', group: 'arts' },
    { key: 'english', en: 'English', group: 'arts' },
    { key: 'odia', en: 'Odia', group: 'arts' },
    { key: 'sanskrit', en: 'Sanskrit', group: 'lang' },
    { key: 'hindi', en: 'Hindi', group: 'lang' },
    { key: 'physics', en: 'Physics', group: 'pcm' },
    { key: 'chemistry', en: 'Chemistry', group: 'science' },
    { key: 'mathematics', en: 'Mathematics', group: 'pcm' },
    { key: 'electronics', en: 'Electronics / Computer Science / Statistics', group: 'pcm' },
    { key: 'botany', en: 'Botany', group: 'cbz' },
    { key: 'zoology', en: 'Zoology', group: 'cbz' },
    { key: 'biology', en: 'Biology / Biotechnology / Life Science', group: 'cbz' }
  ];

  var ARTS_SUBJECTS = ['history', 'geography', 'pol-science', 'economics', 'english', 'odia', 'sanskrit'];
  var PCM_SUBJECTS = ['physics', 'chemistry', 'mathematics', 'electronics'];
  var CBZ_SUBJECTS = ['chemistry', 'botany', 'zoology', 'biology'];

  var TRAINING_DEGREES = [
    { key: 'bed', en: '2-Yr B.Ed. (NCTE Recognized)' },
    { key: 'itep', en: '4-Yr Integrated B.A./B.Sc. B.Ed. (ITEP)' },
    { key: 'bed-med', en: '3-Yr Integrated B.Ed.-M.Ed.' },
    { key: 'deled', en: '2-Yr D.El.Ed. (CT) / 4-Yr B.El.Ed.' },
    { key: 'bhed-shastri', en: 'B.H.Ed. / Hindi Sikshyan Parangat / Sikshya Shastri' },
    { key: 'bped', en: 'C.P.Ed. / D.P.Ed. / B.P.Ed. / M.P.Ed.' },
    { key: 'pg-bed', en: 'Master’s Degree + B.Ed. (or PG Computer Science)' },
    { key: 'none', en: 'Pursuing Final Year / No Training Degree Yet' }
  ];

  var TET_OPTIONS = [
    { key: 'osstet-1', en: 'OSSTET Paper-I Qualified (Lifetime Valid)' },
    { key: 'osstet-2', en: 'OSSTET Paper-II Qualified (PET · Lifetime Valid)' },
    { key: 'otet-1', en: 'OTET Paper-I Qualified (Classes I–V)' },
    { key: 'otet-2', en: 'OTET Paper-II Qualified (Classes VI–VIII)' },
    { key: 'ctet-1', en: 'CBSE CTET Paper-I Qualified' },
    { key: 'ctet-2', en: 'CBSE CTET Paper-II Qualified' },
    { key: 'none', en: 'Appearing / Not Yet Qualified' }
  ];

  var ODIA_OPTIONS = [
    { key: 'hsc', en: 'BSE Odisha HSC (10th) Odia' },
    { key: 'plus2', en: 'CHSE +2 Odia' },
    { key: 'single-10', en: 'BSE Single-Subject 10th Odia Pass' },
    { key: 'class-7', en: 'BSE 7th/8th Standard Odia (Hindi/Sanskrit)' },
    { key: 'none', en: 'Not Passed Odia Yet' }
  ];

  var TEACHER_TRACKS = [
    {
      key: 'tgt-arts',
      en: 'LTR / SSD / OAV TGT Arts (Social Science / Odia / English)',
      or: 'LTR / SSD / OAV TGT କଳା (ସାମାଜିକ ବିଜ୍ଞାନ / ଓଡ଼ିଆ / ଇଂରାଜୀ)',
      minDeg: 'Bachelor’s in Arts / Commerce',
      subjectRule: 'arts-2',
      subjectDesc: 'Any 2 school subjects (History, Geography, Pol. Science, Economics, English, Odia, Sanskrit · >=200 marks each)',
      allowedTraining: ['bed', 'itep', 'bed-med', 'pg-bed'],
      allowedTet: ['osstet-1', 'otet-2', 'ctet-2'],
      allowedOdia: ['hsc', 'plus2', 'single-10'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'tgt-pcm',
      en: 'LTR / SSD / OAV TGT Science (PCM — Physics, Chemistry, Maths)',
      or: 'LTR / SSD / OAV TGT ବିଜ୍ଞାନ (PCM — ପଦାର୍ଥ, ରସାୟନ, ଗଣିତ)',
      minDeg: 'B.Sc. / B.Tech. / B.E.',
      subjectRule: 'pcm-2',
      subjectDesc: 'At least 2 of Physics, Chemistry, Mathematics, Electronics, CS, Statistics (>=200 marks each)',
      allowedTraining: ['bed', 'itep', 'bed-med', 'pg-bed'],
      allowedTet: ['osstet-1'],
      allowedOdia: ['hsc', 'plus2', 'single-10'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'tgt-cbz',
      en: 'LTR / SSD / OAV TGT Science (CBZ — Chemistry, Botany, Zoology)',
      or: 'LTR / SSD / OAV TGT ବିଜ୍ଞାନ (CBZ — ରସାୟନ, ଉଦ୍ଭିଦ, ପ୍ରାଣୀବିଜ୍ଞାନ)',
      minDeg: 'B.Sc. (Biological Sciences)',
      subjectRule: 'cbz-2',
      subjectDesc: 'At least 2 of Chemistry, Botany, Zoology, Biology, Biotechnology, Life Science (>=200 marks each)',
      allowedTraining: ['bed', 'itep', 'bed-med', 'pg-bed'],
      allowedTet: ['osstet-1'],
      allowedOdia: ['hsc', 'plus2', 'single-10'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'pgt',
      en: 'OAVS / Higher Secondary (+2) PGT (All Subjects / CS)',
      or: 'OAVS / ଉଚ୍ଚ ମାଧ୍ୟମିକ (+୨) PGT ଶିକ୍ଷକ',
      minDeg: 'Master’s Degree / 2-Yr Int. PG in concerned subject',
      subjectRule: 'pgt',
      subjectDesc: 'Concerned PG subject (English, Odia, Physics, Chemistry, Maths, Bio, Commerce, Econ, Hist, Pol Sci, CS)',
      allowedTraining: ['pg-bed', 'bed', 'bed-med'],
      allowedTet: ['osstet-1', 'otet-2', 'ctet-2', 'none'],
      tetOptional: true,
      allowedOdia: ['hsc', 'plus2', 'single-10', 'class-7'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'hindi',
      en: 'LTR / SSD / OAV Hindi Teacher',
      or: 'LTR / SSD / OAV ହିନ୍ଦୀ ଶିକ୍ଷକ',
      minDeg: 'Bachelor’s Degree with Hindi (Hons/Elective/Pass)',
      subjectRule: 'hindi',
      subjectDesc: 'Hindi studied as Honours / Elective / Pass subject in Graduation',
      allowedTraining: ['bhed-shastri', 'bed', 'bed-med', 'pg-bed'],
      allowedTet: ['osstet-1'],
      allowedOdia: ['hsc', 'plus2', 'single-10', 'class-7'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'sanskrit',
      en: 'LTR / SSD / OAV Classical Teacher (Sanskrit)',
      or: 'LTR / SSD / OAV ସଂସ୍କୃତ ଶିକ୍ଷକ (Classical Sanskrit)',
      minDeg: 'Bachelor’s with Sanskrit (>=200 marks) / Shastri',
      subjectRule: 'sanskrit',
      subjectDesc: 'Sanskrit (>=200 marks) in Graduation or Shastri (Sanskrit)',
      allowedTraining: ['bhed-shastri', 'bed', 'bed-med', 'pg-bed'],
      allowedTet: ['osstet-1'],
      allowedOdia: ['hsc', 'plus2', 'single-10', 'class-7'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'pet',
      en: 'LTR / SSD / OAV Physical Education Teacher (PET)',
      or: 'LTR / SSD / OAV କ୍ରୀଡ଼ା ଶିକ୍ଷକ (PET)',
      minDeg: '+2 / Higher Secondary Examination',
      subjectRule: 'none',
      subjectDesc: 'No specific school-subject pair required; sports/physical education degree mandatory',
      allowedTraining: ['bped'],
      allowedTet: ['osstet-2'],
      allowedOdia: ['hsc', 'plus2', 'single-10'],
      ageRule: '21–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'elementary-primary',
      en: 'Elementary Primary Teacher (Classes I–V · OTET Paper-I / Junior Teacher)',
      or: 'ପ୍ରାଥମିକ ଶିକ୍ଷକ (ଶ୍ରେଣୀ I–V · OTET ପେପର୍-I / କନିଷ୍ଠ ଶିକ୍ଷକ)',
      minDeg: '+2 / Higher Secondary Examination',
      subjectRule: 'none',
      subjectDesc: '+2 pass (any stream) with NCTE D.El.Ed. (CT) / B.El.Ed.',
      allowedTraining: ['deled'],
      allowedTet: ['otet-1', 'ctet-1'],
      allowedOdia: ['hsc', 'plus2', 'single-10'],
      ageRule: '18–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    },
    {
      key: 'elementary-up',
      en: 'Elementary Upper Primary Teacher (Classes VI–VIII · OTET Paper-II / Junior Teacher)',
      or: 'ଉଚ୍ଚ ପ୍ରାଥମିକ ଶିକ୍ଷକ (ଶ୍ରେଣୀ VI–VIII · OTET ପେପର୍-II / କନିଷ୍ଠ ଶିକ୍ଷକ)',
      minDeg: 'Graduation (B.A. / B.Sc. / B.Com.)',
      subjectRule: 'none',
      subjectDesc: 'Graduation in Arts/Science/Commerce with D.El.Ed. / B.Ed. / 4-Yr ITEP',
      allowedTraining: ['deled', 'bed', 'itep', 'bed-med', 'pg-bed'],
      allowedTet: ['otet-2', 'ctet-2'],
      allowedOdia: ['hsc', 'plus2', 'single-10'],
      ageRule: '18–38 yrs UR (+5 yrs SC/ST/SEBC/Women, +10 yrs PwBD)'
    }
  ];

  function getTrackByKey(key) {
    return TEACHER_TRACKS.find(function (t) { return t.key === key; }) || TEACHER_TRACKS[0];
  }

  function evaluateTeacherEligibility(profile) {
    var p = profile || {};
    var track = getTrackByKey(p.trackKey);
    var cat = String(p.category || 'ur').toLowerCase();
    var isReserved = ['sebc', 'sc', 'st', 'pwbd'].indexOf(cat) !== -1;
    var minPct = isReserved ? 45 : 50;
    var tetCutoffLabel = isReserved ? '50% (75/150 · Lifetime Valid)' : '60% (90/150 · Lifetime Valid)';

    var aggPct = Number(p.aggregatePct) || 0;
    var training = String(p.trainingDegree || 'none');
    var tet = String(p.tetStatus || 'none');
    var odia = String(p.odiaLevel || 'none');
    var subs = Array.isArray(p.subjects) ? p.subjects : [];

    // 1. Academic Aggregate
    var aggPass = aggPct >= minPct;

    // 2. Subject Combination
    var subPass = true;
    var subDetail = track.subjectDesc;
    if (track.subjectRule === 'arts-2') {
      var artsHits = subs.filter(function (s) { return ARTS_SUBJECTS.indexOf(s) !== -1; });
      subPass = artsHits.length >= 2;
      subDetail = subPass ? ('Matched ' + artsHits.length + ' Arts/Social Science subjects') : 'Select at least 2 Arts/Social Science subjects (>=200 marks each)';
    } else if (track.subjectRule === 'pcm-2') {
      var pcmHits = subs.filter(function (s) { return PCM_SUBJECTS.indexOf(s) !== -1; });
      subPass = pcmHits.length >= 2;
      subDetail = subPass ? ('Matched ' + pcmHits.length + ' PCM subjects') : 'Select at least 2 PCM subjects (Physics, Chemistry, Maths, Electronics/CS)';
    } else if (track.subjectRule === 'cbz-2') {
      var cbzHits = subs.filter(function (s) { return CBZ_SUBJECTS.indexOf(s) !== -1; });
      subPass = cbzHits.length >= 2;
      subDetail = subPass ? ('Matched ' + cbzHits.length + ' CBZ subjects') : 'Select at least 2 CBZ subjects (Chemistry, Botany, Zoology, Biology)';
    } else if (track.subjectRule === 'hindi') {
      subPass = subs.indexOf('hindi') !== -1;
      subDetail = subPass ? 'Hindi subject verified' : 'Select Hindi as a studied Graduation subject';
    } else if (track.subjectRule === 'sanskrit') {
      subPass = subs.indexOf('sanskrit') !== -1;
      subDetail = subPass ? 'Sanskrit subject verified' : 'Select Sanskrit as a studied Graduation / Shastri subject';
    }

    // 3. NCTE Training Degree
    var trainPass = track.allowedTraining.indexOf(training) !== -1;

    // 4. Odia Language Norm
    var odiaPass = track.allowedOdia.indexOf(odia) !== -1;

    // 5. TET / OSSTET
    var tetPass = Boolean(track.tetOptional) || track.allowedTet.indexOf(tet) !== -1;

    var core4Pass = aggPass && subPass && trainPass && odiaPass;
    var status = 'not_eligible';
    var verdict = '❌ NOT ELIGIBLE — CHECK DEFICITS';
    if (core4Pass && tetPass) {
      status = 'eligible';
      verdict = '✅ FULLY ELIGIBLE FOR POST';
    } else if (core4Pass && !tetPass && tet === 'none') {
      status = 'tet_pending';
      verdict = '🟡 ELIGIBLE FOR OSSTET / OTET (QUALIFY TET BEFORE RECRUITMENT)';
    }

    var checks = [
      { key: 'academic', label: '1. Academic Aggregate %', pass: aggPass, detail: aggPct + '% (Min ' + minPct + '% for ' + cat.toUpperCase() + ')' },
      { key: 'subjects', label: '2. Subject Combination', pass: subPass, detail: subDetail },
      { key: 'training', label: '3. NCTE Training Degree', pass: trainPass, detail: trainPass ? 'Recognized training degree matched' : 'Required: ' + track.allowedTraining.join(' / ').toUpperCase() },
      { key: 'odia', label: '4. Odia Language Norm', pass: odiaPass, detail: odiaPass ? 'Odisha Odia language norm satisfied' : 'Must pass HSC / Single-Subject Odia (or 7th/8th for Language Teachers)' },
      { key: 'tet', label: '5. TET / OSSTET & Validity', pass: tetPass, detail: track.tetOptional ? 'Not mandatory for PGT (OAVS / +2)' : (tetPass ? ('Qualified · ' + tetCutoffLabel) : ('Required: ' + track.allowedTet.join(' / ').toUpperCase() + ' · ' + tetCutoffLabel)) }
    ];

    return {
      trackKey: track.key,
      trackName: track.en,
      category: cat,
      minPct: minPct,
      tetCutoffLabel: tetCutoffLabel,
      status: status,
      verdict: verdict,
      checks: checks
    };
  }

  function resolveStorage(override) {
    if (override) return override;
    try { return (win && win.localStorage) ? win.localStorage : null; } catch (_) { return null; }
  }

  function loadPrefs(storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      var raw = st && st.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          return {
            trackKey: p.trackKey || 'tgt-arts',
            category: p.category || 'ur',
            aggregatePct: Number(p.aggregatePct) || 55,
            trainingDegree: p.trainingDegree || 'bed',
            subjects: Array.isArray(p.subjects) ? p.subjects : ['history', 'pol-science'],
            tetStatus: p.tetStatus || 'osstet-1',
            odiaLevel: p.odiaLevel || 'hsc'
          };
        }
      }
    } catch (_) {}
    return {
      trackKey: 'tgt-arts',
      category: 'ur',
      aggregatePct: 55,
      trainingDegree: 'bed',
      subjects: ['history', 'pol-science'],
      tetStatus: 'osstet-1',
      odiaLevel: 'hsc'
    };
  }

  function savePrefs(prefs, storageOverride) {
    var st = resolveStorage(storageOverride);
    try { if (st) st.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) {}
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
      prefs: loadPrefs(),
      copyStatus: ''
    };

    var wrap = el('div', 'cso-tec-wrap');

    // Header
    var head = el('div', 'cso-tec-head');
    var titleBox = el('div', 'cso-tec-title-box');
    var heading = el('h2', 'cso-tec-title');
    var subtitle = el('p', 'cso-tec-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-tec-head-controls');
    var langGroup = el('div', 'cso-tec-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-tec-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-tec-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-tec-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Form Controls
    var formGrid = el('div', 'cso-tec-form');
    function makeField(id, tag, type) {
      var f = el('div', 'cso-tec-field');
      var lbl = el('label', 'cso-tec-label');
      lbl.setAttribute('for', id);
      var inp = el(tag, tag === 'select' ? 'cso-tec-select' : 'cso-tec-input');
      inp.id = id;
      if (type) inp.type = type;
      f.appendChild(lbl);
      f.appendChild(inp);
      return { wrap: f, label: lbl, input: inp };
    }

    var fTrack = makeField('cso-tec-track', 'select');
    var fCat = makeField('cso-tec-cat', 'select');
    var fAgg = makeField('cso-tec-agg', 'input', 'number');
    fAgg.input.min = '30';
    fAgg.input.max = '100';
    fAgg.input.step = '0.5';
    var fTrain = makeField('cso-tec-train', 'select');
    var fTet = makeField('cso-tec-tet', 'select');
    var fOdia = makeField('cso-tec-odia', 'select');

    [fTrack, fCat, fAgg, fTrain, fTet, fOdia].forEach(function (x) { formGrid.appendChild(x.wrap); });

    // Multi-Select Subject Checkboxes
    var subSection = el('div', 'cso-tec-subjects');
    var subHeading = el('div', 'cso-tec-sub-head');
    var subGrid = el('div', 'cso-tec-sub-grid');
    subSection.appendChild(subHeading);
    subSection.appendChild(subGrid);

    // Verdict + 5-Point Breakdown
    var verdictBox = el('div', 'cso-tec-verdict');
    verdictBox.setAttribute('role', 'status');
    verdictBox.setAttribute('aria-live', 'polite');

    var checksGrid = el('div', 'cso-tec-checks');

    var actionsRow = el('div', 'cso-tec-actions');
    var copyBtn = el('button', 'cso-tec-btn cso-tec-btn--primary');
    copyBtn.type = 'button';
    var copyStatusEl = el('span', 'cso-tec-copy-status');
    actionsRow.appendChild(copyBtn);
    actionsRow.appendChild(copyStatusEl);

    // Reference Matrix
    var matrixBox = el('div', 'cso-tec-matrix');

    wrap.appendChild(head);
    wrap.appendChild(formGrid);
    wrap.appendChild(subSection);
    wrap.appendChild(verdictBox);
    wrap.appendChild(checksGrid);
    wrap.appendChild(actionsRow);
    wrap.appendChild(matrixBox);
    root.replaceChildren(wrap);

    function renderVerdict() {
      var res = evaluateTeacherEligibility(state.prefs);
      verdictBox.className = 'cso-tec-verdict is-' + res.status;
      verdictBox.textContent = res.verdict + ' · ' + res.trackName + ' (TET Cut-Off: ' + res.tetCutoffLabel + ')';

      var frag = doc.createDocumentFragment();
      for (var i = 0; i < res.checks.length; i += 1) {
        var c = res.checks[i];
        var box = el('div', 'cso-tec-check ' + (c.pass ? 'is-pass' : 'is-fail'));
        var top = el('div', 'cso-tec-check__top');
        top.appendChild(el('strong', '', c.label));
        top.appendChild(el('span', 'cso-tec-stat', c.pass ? '✅ PASS' : '❌ CHECK'));
        box.appendChild(top);
        box.appendChild(el('div', 'cso-tec-check__det', c.detail));
        frag.appendChild(box);
      }
      checksGrid.replaceChildren(frag);
    }

    function renderSubjects() {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < SUBJECT_POOL.length; i += 1) {
        (function (sub) {
          var checked = state.prefs.subjects.indexOf(sub.key) !== -1;
          var lbl = el('label', 'cso-tec-sub-pill' + (checked ? ' is-checked' : ''));
          var cb = el('input', 'cso-tec-cb');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.addEventListener('change', function () {
            var next = state.prefs.subjects.slice();
            var idx = next.indexOf(sub.key);
            if (cb.checked && idx === -1) next.push(sub.key);
            if (!cb.checked && idx !== -1) next.splice(idx, 1);
            state.prefs.subjects = next;
            savePrefs(state.prefs);
            renderSubjects();
            renderVerdict();
          });
          lbl.appendChild(cb);
          lbl.appendChild(el('span', '', sub.en));
          frag.appendChild(lbl);
        })(SUBJECT_POOL[i]);
      }
      subGrid.replaceChildren(frag);
    }

    function renderMatrix(orMode) {
      var frag = doc.createDocumentFragment();
      frag.appendChild(el('h3', 'cso-tec-matrix__title',
        orMode ? '📋 ଓଡ଼ିଶା ଶିକ୍ଷକ ନିଯୁକ୍ତି ଯୋଗ୍ୟତା ଓ TET ବୈଧତା ତାଲିକା (ସମସ୍ତ ୯ ଟ୍ରାକ୍)' : '📋 Complete Odisha Teacher Eligibility & TET Validity Matrix (9 Tracks)'));
      var tbl = el('table', 'cso-tec-table');
      var thead = doc.createElement('thead');
      var htr = doc.createElement('tr');
      ['Teacher Cadre / Exam', 'Qualifying Degree & Marks', 'Subject Combination', 'Age Limit & TET Validity'].forEach(function (h) {
        htr.appendChild(el('th', '', h));
      });
      thead.appendChild(htr);
      tbl.appendChild(thead);

      var tbody = doc.createElement('tbody');
      for (var i = 0; i < TEACHER_TRACKS.length; i += 1) {
        var t = TEACHER_TRACKS[i];
        var tr = doc.createElement('tr');
        tr.appendChild(el('td', '', orMode ? t.or : t.en));
        tr.appendChild(el('td', '', t.minDeg + ' (50% UR / 45% Reserved)'));
        tr.appendChild(el('td', '', t.subjectDesc));
        tr.appendChild(el('td', '', t.ageRule + ' · TET: Lifetime Valid (90/150 UR, 75/150 Reserved)'));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      var tw = el('div', 'cso-tec-table-wrap');
      tw.appendChild(tbl);
      frag.appendChild(tw);
      matrixBox.replaceChildren(frag);
    }

    function fillSelect(sel, list, val, orMode) {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < list.length; i += 1) {
        var o = el('option', '', (orMode && list[i].or) ? list[i].or : list[i].en);
        o.value = list[i].key;
        if (list[i].key === val) o.selected = true;
        frag.appendChild(o);
      }
      sel.replaceChildren(frag);
      sel.value = val;
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-tec-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-tec-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '👩‍🏫 ଓଡ଼ିଶା ସରକାରୀ ଶିକ୍ଷକ (LTR / SSD / OAV / OTET / OSSTET) ଯୋଗ୍ୟତା ଯାଞ୍ଚକାରୀ'
        : '👩‍🏫 Odisha Govt Teacher (LTR / SSD / OAV / OTET / OSSTET) Eligibility Checker';
      subtitle.textContent = orMode
        ? 'TGT କଳା/ବିଜ୍ଞାନ (PCM/CBZ), PGT, ହିନ୍ଦୀ, ସଂସ୍କୃତ, PET ଓ ପ୍ରାଥମିକ ଶିକ୍ଷକ ପାଇଁ ବିଷୟ-ସଂଯୋଜନ, B.Ed./D.El.Ed./ITEP, ବର୍ଗ ରିହାତି ଓ TET ବୈଧତା ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'Validate subject combinations, B.Ed./D.El.Ed./ITEP degrees, 50%/45% category relaxations, HSC Odia norms, and OSSTET/OTET lifetime validity across all 9 Odisha teacher tracks.';
      printBtn.textContent = orMode ? '🖨️ ଯୋଗ୍ୟତା ସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Teacher Eligibility Sheet';

      fTrack.label.textContent = orMode ? 'ଶିକ୍ଷକ ନିଯୁକ୍ତି କ୍ୟାଡର୍ / ପରୀକ୍ଷା' : 'Target Recruitment Cadre / Exam';
      fCat.label.textContent = orMode ? 'ଶ୍ରେଣୀ (Category)' : 'Social Category';
      fAgg.label.textContent = orMode ? 'ସ୍ନାତକ / +୨ ଶତକଡ଼ା (%)' : 'Qualifying Degree Aggregate (%)';
      fTrain.label.textContent = orMode ? 'ଶିକ୍ଷକ ତାଲିମ ଡିଗ୍ରୀ (NCTE)' : 'Professional Training Degree';
      fTet.label.textContent = orMode ? 'TET / OSSTET ସ୍ଥିତି' : 'TET / Eligibility Test Status';
      fOdia.label.textContent = orMode ? 'ଓଡ଼ିଆ ଭାଷା ଯୋଗ୍ୟତା' : 'Odia Language Qualification';

      fillSelect(fTrack.input, TEACHER_TRACKS, state.prefs.trackKey, orMode);
      fillSelect(fCat.input, [
        { key: 'ur', en: 'UR / General (50% Deg · 60% TET)' },
        { key: 'ews', en: 'EWS (50% Deg · 60% TET)' },
        { key: 'sebc', en: 'SEBC (45% Deg · 50% TET)' },
        { key: 'sc', en: 'SC (45% Deg · 50% TET)' },
        { key: 'st', en: 'ST (45% Deg · 50% TET)' },
        { key: 'pwbd', en: 'PwBD (45% Deg · 50% TET)' }
      ], state.prefs.category, false);
      fAgg.input.value = String(state.prefs.aggregatePct);
      fillSelect(fTrain.input, TRAINING_DEGREES, state.prefs.trainingDegree, false);
      fillSelect(fTet.input, TET_OPTIONS, state.prefs.tetStatus, false);
      fillSelect(fOdia.input, ODIA_OPTIONS, state.prefs.odiaLevel, false);

      subHeading.textContent = orMode
        ? '📚 ସ୍ନାତକରେ ଅଧ୍ୟୟନ କରିଥିବା ବିଷୟଗୁଡ଼ିକ ବାଛନ୍ତୁ (>= ୨୦୦ ମାର୍କ ପ୍ରତ୍ୟେକ):'
        : '📚 Select Studied School Subjects in Graduation (>= 200 marks each):';
      copyBtn.textContent = orMode ? '📋 ଯୋଗ୍ୟତା ରିପୋର୍ଟ କପି କରନ୍ତୁ' : '📋 Copy Eligibility Report';
      copyStatusEl.textContent = state.copyStatus;

      renderSubjects();
      renderVerdict();
      renderMatrix(orMode);
    }

    function syncForm() {
      state.prefs.trackKey = fTrack.input.value;
      state.prefs.category = fCat.input.value;
      state.prefs.aggregatePct = Number(fAgg.input.value) || 0;
      state.prefs.trainingDegree = fTrain.input.value;
      state.prefs.tetStatus = fTet.input.value;
      state.prefs.odiaLevel = fOdia.input.value;
      savePrefs(state.prefs);
      renderVerdict();
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });
    [fTrack, fCat, fTrain, fTet, fOdia].forEach(function (x) { x.input.addEventListener('change', syncForm); });
    fAgg.input.addEventListener('input', syncForm);

    copyBtn.addEventListener('click', function () {
      var res = evaluateTeacherEligibility(state.prefs);
      var lines = ['CS Odisha Teacher Eligibility Report — ' + res.trackName, res.verdict];
      res.checks.forEach(function (c) { lines.push((c.pass ? 'PASS' : 'CHECK') + ' | ' + c.label + ': ' + c.detail); });
      if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        win.navigator.clipboard.writeText(lines.join('\n')).then(function () {
          state.copyStatus = '✅ Copied Eligibility Report!';
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
    PREFS_KEY: PREFS_KEY,
    SUBJECT_POOL: SUBJECT_POOL,
    TEACHER_TRACKS: TEACHER_TRACKS,
    TRAINING_DEGREES: TRAINING_DEGREES,
    TET_OPTIONS: TET_OPTIONS,
    ODIA_OPTIONS: ODIA_OPTIONS,
    getTrackByKey: getTrackByKey,
    evaluateTeacherEligibility: evaluateTeacherEligibility,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    mount: mount
  };
});
