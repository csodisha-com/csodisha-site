/**
 * Common Sense Odisha — Interactive Odisha Police SI, Constable, Forest Guard &
 * Excise PET/PST Standards Checker (v426)
 * Mounted on /tools/ and /guides/ (#cso-pet-pst-standards-root).
 * Verifies Height, Weight/BMI, Chest Expansion (>=5 cm), Run/Walk Time, Long Jump & High Jump
 * by Gender and Category (UR / SEBC / SC / ST) against OPRB, OSSSC & OSSC benchmarks.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOPetPstChecker = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOPetPstChecker = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v426';
  var ROOT_ID = 'cso-pet-pst-standards-root';
  var PREFS_KEY = 'cso_pet_pst_prefs_v1';

  var POST_BENCHMARKS = {
    'police-si': {
      key: 'police-si',
      en: 'OPRB Odisha Police Sub-Inspector (SI — CPSE)',
      or: 'OPRB ଓଡ଼ିଶା ପୋଲିସ୍ ସବ୍-ଇନ୍ସପେକ୍ଟର (SI)',
      pst: {
        male: {
          ur: { heightCm: 168, weightKg: 55, chestUnexp: 79, chestExp: 84, minExp: 5 },
          sebc: { heightCm: 168, weightKg: 55, chestUnexp: 79, chestExp: 84, minExp: 5 },
          sc: { heightCm: 163, weightKg: 50, chestUnexp: 76, chestExp: 81, minExp: 5 },
          st: { heightCm: 163, weightKg: 50, chestUnexp: 76, chestExp: 81, minExp: 5 }
        },
        female: {
          ur: { heightCm: 155, weightKg: 47.5 },
          sebc: { heightCm: 155, weightKg: 47.5 },
          sc: { heightCm: 150, weightKg: 45 },
          st: { heightCm: 150, weightKg: 45 }
        }
      },
      pet: {
        male: { runLabel: '1.6 km Run', isWalk: false, maxSec: 480, longJumpM: 3.66, highJumpM: null, extra: 'Cycling 1.6 km in <= 5 min (where applicable)' },
        female: { runLabel: '1.6 km Run', isWalk: false, maxSec: 600, longJumpM: 2.77, highJumpM: null, extra: 'Broad Jump 2.77 m (9 ft) in 3 chances' }
      }
    },
    'police-constable': {
      key: 'police-constable',
      en: 'OPRB Odisha Police Constable / Sepoy (OSAP / IRBn)',
      or: 'OPRB ଓଡ଼ିଶା ପୋଲିସ୍ କନଷ୍ଟେବଳ / ସିପାହୀ (OSAP / IRBn)',
      pst: {
        male: {
          ur: { heightCm: 168, weightKg: 55, chestUnexp: 79, chestExp: 84, minExp: 5 },
          sebc: { heightCm: 168, weightKg: 55, chestUnexp: 79, chestExp: 84, minExp: 5 },
          sc: { heightCm: 163, weightKg: 50, chestUnexp: 76, chestExp: 81, minExp: 5 },
          st: { heightCm: 163, weightKg: 50, chestUnexp: 76, chestExp: 81, minExp: 5 }
        },
        female: {
          ur: { heightCm: 155, weightKg: 47.5 },
          sebc: { heightCm: 155, weightKg: 47.5 },
          sc: { heightCm: 150, weightKg: 45 },
          st: { heightCm: 150, weightKg: 45 }
        }
      },
      pet: {
        male: { runLabel: '1.6 km Run', isWalk: false, maxSec: 420, longJumpM: 3.66, highJumpM: 1.22, extra: 'Swimming 50 m within 8 min (qualifying)' },
        female: { runLabel: '1.6 km Run', isWalk: false, maxSec: 540, longJumpM: 2.75, highJumpM: 1.00, extra: 'Swimming 50 m within 10 min (qualifying)' }
      }
    },
    'forest-guard': {
      key: 'forest-guard',
      en: 'OSSSC CRE Forest Guard / Forester / Livestock Inspector',
      or: 'OSSSC ବନରକ୍ଷୀ (Forest Guard) / ଫରେଷ୍ଟର୍',
      pst: {
        male: {
          ur: { heightCm: 168, weightKg: null, chestUnexp: 81, chestExp: 86, minExp: 5 },
          sebc: { heightCm: 168, weightKg: null, chestUnexp: 81, chestExp: 86, minExp: 5 },
          sc: { heightCm: 163, weightKg: null, chestUnexp: 79, chestExp: 84, minExp: 5 },
          st: { heightCm: 158, weightKg: null, chestUnexp: 79, chestExp: 84, minExp: 5 }
        },
        female: {
          ur: { heightCm: 153, weightKg: null },
          sebc: { heightCm: 153, weightKg: null },
          sc: { heightCm: 153, weightKg: null },
          st: { heightCm: 153, weightKg: null }
        }
      },
      pet: {
        male: { runLabel: '25 km Endurance Walk', isWalk: true, maxSec: 14400, longJumpM: null, highJumpM: null, extra: 'Cycling 1.6 km in <= 5 min' },
        female: { runLabel: '16 km Endurance Walk', isWalk: true, maxSec: 14400, longJumpM: null, highJumpM: null, extra: 'Cycling 1.6 km in <= 7 min' }
      }
    },
    'excise-si-constable': {
      key: 'excise-si-constable',
      en: 'Odisha Excise SI & Excise Constable (OSSC / OSSSC)',
      or: 'ଓଡ଼ିଶା ଅବକାରୀ SI ଓ ଅବକାରୀ କନଷ୍ଟେବଳ (OSSC / OSSSC)',
      pst: {
        male: {
          ur: { heightCm: 168, weightKg: 55, chestUnexp: 79, chestExp: 84, minExp: 5 },
          sebc: { heightCm: 168, weightKg: 55, chestUnexp: 79, chestExp: 84, minExp: 5 },
          sc: { heightCm: 163, weightKg: 50, chestUnexp: 76, chestExp: 81, minExp: 5 },
          st: { heightCm: 163, weightKg: 50, chestUnexp: 76, chestExp: 81, minExp: 5 }
        },
        female: {
          ur: { heightCm: 155, weightKg: 47.5 },
          sebc: { heightCm: 155, weightKg: 47.5 },
          sc: { heightCm: 150, weightKg: 45 },
          st: { heightCm: 150, weightKg: 45 }
        }
      },
      pet: {
        male: { runLabel: '1.6 km Run', isWalk: false, maxSec: 450, longJumpM: 3.66, highJumpM: 1.22, extra: 'Long Jump 3.66 m & High Jump 1.22 m (3 chances)' },
        female: { runLabel: '1.6 km Run', isWalk: false, maxSec: 570, longJumpM: 2.75, highJumpM: 1.00, extra: 'Long Jump 2.75 m & High Jump 1.00 m (3 chances)' }
      }
    }
  };

  function cmToFtIn(cm) {
    var totalIn = (Number(cm) || 0) / 2.54;
    var ft = Math.floor(totalIn / 12);
    var inch = Math.round((totalIn - ft * 12) * 10) / 10;
    return ft + ' ft ' + inch + ' in';
  }

  function mToFt(m) {
    return (Math.round(((Number(m) || 0) * 3.28084) * 10) / 10) + ' ft';
  }

  function fmtDuration(sec, isWalk) {
    var s = Math.max(0, Math.round(Number(sec) || 0));
    if (isWalk) {
      var hr = Math.floor(s / 3600);
      var mn = Math.floor((s % 3600) / 60);
      return hr + ' hr ' + (mn < 10 ? '0' : '') + mn + ' min';
    }
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ' min ' + (r < 10 ? '0' : '') + r + ' sec';
  }

  function quantizeStep(pct) {
    var c = Math.max(5, Math.min(100, Number(pct) || 5));
    return Math.round(c / 5) * 5;
  }

  function evaluatePetPstCandidate(input) {
    var inp = input || {};
    var post = POST_BENCHMARKS[inp.postKey] || POST_BENCHMARKS['police-si'];
    var gender = inp.gender === 'female' ? 'female' : 'male';
    var catRaw = String(inp.category || 'ur').toLowerCase();
    var category = ['ur', 'sebc', 'sc', 'st'].indexOf(catRaw) !== -1 ? catRaw : 'ur';

    var pstReq = post.pst[gender][category];
    var petReq = post.pet[gender];

    var heightCm = Math.max(100, Number(inp.heightCm) || 0);
    var weightKg = Math.max(25, Number(inp.weightKg) || 0);
    var chestUnexp = Number(inp.chestUnexp) || 0;
    var chestExp = Number(inp.chestExp) || 0;
    var chestDiff = Math.round((chestExp - chestUnexp) * 10) / 10;
    var runSec = Math.max(1, Number(inp.runSec) || 0);
    var longJumpM = Number(inp.longJumpM) || 0;
    var highJumpM = Number(inp.highJumpM) || 0;

    var bmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;

    var checks = [];
    var deficits = [];
    var pstPass = true;
    var petPass = true;

    // 1. Height
    var hPass = heightCm >= pstReq.heightCm;
    if (!hPass) {
      pstPass = false;
      deficits.push('Need +' + (Math.round((pstReq.heightCm - heightCm) * 10) / 10) + ' cm height');
    }
    checks.push({
      key: 'height',
      group: 'PST',
      label: 'Height',
      actual: heightCm + ' cm (' + cmToFtIn(heightCm) + ')',
      required: '>= ' + pstReq.heightCm + ' cm',
      pass: hPass,
      pct: Math.min(100, Math.round((heightCm / pstReq.heightCm) * 100))
    });

    // 2. Weight & BMI
    var wPass = pstReq.weightKg ? (weightKg >= pstReq.weightKg) : true;
    if (!wPass) {
      pstPass = false;
      deficits.push('Need +' + (Math.round((pstReq.weightKg - weightKg) * 10) / 10) + ' kg weight');
    }
    checks.push({
      key: 'weight',
      group: 'PST',
      label: 'Weight & BMI',
      actual: weightKg + ' kg (BMI ' + bmi + ')',
      required: pstReq.weightKg ? ('>= ' + pstReq.weightKg + ' kg') : 'Proportionate BMI (18.5–25)',
      pass: wPass,
      pct: pstReq.weightKg ? Math.min(100, Math.round((weightKg / pstReq.weightKg) * 100)) : 100
    });

    // 3. Chest (Male only)
    if (gender === 'male' && pstReq.chestUnexp) {
      var cUnPass = chestUnexp >= pstReq.chestUnexp;
      var cExPass = chestExp >= pstReq.chestExp;
      var cDiffPass = chestDiff >= pstReq.minExp;
      var cPass = cUnPass && cExPass && cDiffPass;
      if (!cPass) {
        pstPass = false;
        if (!cUnPass) deficits.push('Need +' + (Math.round((pstReq.chestUnexp - chestUnexp) * 10) / 10) + ' cm unexpanded chest');
        if (!cDiffPass) deficits.push('Need +' + (Math.round((pstReq.minExp - chestDiff) * 10) / 10) + ' cm chest expansion');
      }
      checks.push({
        key: 'chest',
        group: 'PST',
        label: 'Chest & 5 cm Expansion',
        actual: chestUnexp + ' / ' + chestExp + ' cm (+' + chestDiff + ' cm)',
        required: pstReq.chestUnexp + ' / ' + pstReq.chestExp + ' cm (>= ' + pstReq.minExp + ' cm exp)',
        pass: cPass,
        pct: Math.min(100, Math.round((chestExp / pstReq.chestExp) * 100))
      });
    }

    // 4. Run / Endurance Walk
    var rPass = runSec <= petReq.maxSec;
    if (!rPass) {
      petPass = false;
      var overSec = Math.round(runSec - petReq.maxSec);
      deficits.push(petReq.isWalk
        ? ('Shave ' + Math.ceil(overSec / 60) + ' min off ' + petReq.runLabel)
        : ('Shave ' + overSec + ' sec off ' + petReq.runLabel));
    }
    checks.push({
      key: 'runWalk',
      group: 'PET',
      label: petReq.runLabel,
      actual: fmtDuration(runSec, petReq.isWalk),
      required: '<= ' + fmtDuration(petReq.maxSec, petReq.isWalk),
      pass: rPass,
      pct: rPass ? 100 : Math.max(15, Math.min(95, Math.round((petReq.maxSec / runSec) * 100)))
    });

    // 5. Long Jump (when applicable)
    if (petReq.longJumpM) {
      var ljPass = longJumpM >= petReq.longJumpM;
      if (!ljPass) {
        petPass = false;
        deficits.push('Need +' + (Math.round((petReq.longJumpM - longJumpM) * 100) / 100) + ' m long jump');
      }
      checks.push({
        key: 'longJump',
        group: 'PET',
        label: 'Broad (Long) Jump',
        actual: longJumpM + ' m (' + mToFt(longJumpM) + ')',
        required: '>= ' + petReq.longJumpM + ' m (' + mToFt(petReq.longJumpM) + ')',
        pass: ljPass,
        pct: Math.min(100, Math.round((longJumpM / petReq.longJumpM) * 100))
      });
    }

    // 6. High Jump (when applicable)
    if (petReq.highJumpM) {
      var hjPass = highJumpM >= petReq.highJumpM;
      if (!hjPass) {
        petPass = false;
        deficits.push('Need +' + (Math.round((petReq.highJumpM - highJumpM) * 100) / 100) + ' m high jump');
      }
      checks.push({
        key: 'highJump',
        group: 'PET',
        label: 'High Jump',
        actual: highJumpM + ' m (' + mToFt(highJumpM) + ')',
        required: '>= ' + petReq.highJumpM + ' m (' + mToFt(petReq.highJumpM) + ')',
        pass: hjPass,
        pct: Math.min(100, Math.round((highJumpM / petReq.highJumpM) * 100))
      });
    }

    var overallEligible = pstPass && petPass;
    var verdict = overallEligible
      ? '✅ ELIGIBLE IN BOTH PST & PET'
      : ('⚠️ MARGINAL / NEEDS IMPROVEMENT — ' + deficits.join(' · '));

    return {
      postKey: post.key,
      postName: post.en,
      gender: gender,
      category: category,
      bmi: bmi,
      heightFtIn: cmToFtIn(heightCm),
      pstPass: pstPass,
      petPass: petPass,
      overallEligible: overallEligible,
      checks: checks,
      deficits: deficits,
      extraNote: petReq.extra,
      verdict: verdict
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
            postKey: POST_BENCHMARKS[p.postKey] ? p.postKey : 'police-si',
            gender: p.gender === 'female' ? 'female' : 'male',
            category: ['ur', 'sebc', 'sc', 'st'].indexOf(p.category) !== -1 ? p.category : 'ur',
            heightCm: Number(p.heightCm) || 170,
            weightKg: Number(p.weightKg) || 62,
            chestUnexp: Number(p.chestUnexp) || 82,
            chestExp: Number(p.chestExp) || 88,
            runMin: Number(p.runMin) >= 0 ? Number(p.runMin) : 7,
            runSecPart: Number(p.runSecPart) >= 0 ? Number(p.runSecPart) : 15,
            longJumpM: Number(p.longJumpM) || 3.8,
            highJumpM: Number(p.highJumpM) || 1.25
          };
        }
      }
    } catch (_) {}
    return {
      postKey: 'police-si',
      gender: 'male',
      category: 'ur',
      heightCm: 170,
      weightKg: 62,
      chestUnexp: 82,
      chestExp: 88,
      runMin: 7,
      runSecPart: 15,
      longJumpM: 3.8,
      highJumpM: 1.25
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

    var wrap = el('div', 'cso-pps-wrap');

    // Header
    var head = el('div', 'cso-pps-head');
    var titleBox = el('div', 'cso-pps-title-box');
    var heading = el('h2', 'cso-pps-title');
    var subtitle = el('p', 'cso-pps-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-pps-head-controls');
    var langGroup = el('div', 'cso-pps-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-pps-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-pps-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-pps-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Input Grid
    var formGrid = el('div', 'cso-pps-form');
    function makeField(id, tag, type) {
      var f = el('div', 'cso-pps-field');
      var lbl = el('label', 'cso-pps-label');
      lbl.setAttribute('for', id);
      var inp = el(tag, tag === 'select' ? 'cso-pps-select' : 'cso-pps-input');
      inp.id = id;
      if (type) inp.type = type;
      f.appendChild(lbl);
      f.appendChild(inp);
      return { wrap: f, label: lbl, input: inp };
    }

    var fPost = makeField('cso-pps-post', 'select');
    var fGender = makeField('cso-pps-gender', 'select');
    var fCat = makeField('cso-pps-cat', 'select');
    var fHeight = makeField('cso-pps-height', 'input', 'number');
    fHeight.input.step = '0.5';
    var fWeight = makeField('cso-pps-weight', 'input', 'number');
    fWeight.input.step = '0.5';
    var fChestU = makeField('cso-pps-chestu', 'input', 'number');
    fChestU.input.step = '0.5';
    var fChestE = makeField('cso-pps-cheste', 'input', 'number');
    fChestE.input.step = '0.5';
    var fRunMin = makeField('cso-pps-runm', 'input', 'number');
    var fRunSec = makeField('cso-pps-runs', 'input', 'number');
    var fLongJump = makeField('cso-pps-lj', 'input', 'number');
    fLongJump.input.step = '0.05';
    var fHighJump = makeField('cso-pps-hj', 'input', 'number');
    fHighJump.input.step = '0.05';

    [fPost, fGender, fCat, fHeight, fWeight, fChestU, fChestE, fRunMin, fRunSec, fLongJump, fHighJump].forEach(function (x) {
      formGrid.appendChild(x.wrap);
    });

    var verdictBox = el('div', 'cso-pps-verdict');
    verdictBox.setAttribute('role', 'status');
    verdictBox.setAttribute('aria-live', 'polite');

    var matrixGrid = el('div', 'cso-pps-matrix');
    var actionsRow = el('div', 'cso-pps-actions');
    var copyBtn = el('button', 'cso-pps-btn cso-pps-btn--primary');
    copyBtn.type = 'button';
    var copyStatusEl = el('span', 'cso-pps-copy-status');
    actionsRow.appendChild(copyBtn);
    actionsRow.appendChild(copyStatusEl);

    var refWrap = el('div', 'cso-pps-ref');

    wrap.appendChild(head);
    wrap.appendChild(formGrid);
    wrap.appendChild(verdictBox);
    wrap.appendChild(matrixGrid);
    wrap.appendChild(actionsRow);
    wrap.appendChild(refWrap);
    root.replaceChildren(wrap);

    function currentEval() {
      var p = state.prefs;
      var post = POST_BENCHMARKS[p.postKey];
      var isWalk = post.pet[p.gender].isWalk;
      var totalSec = isWalk ? (p.runMin * 60) : (p.runMin * 60 + p.runSecPart);
      return evaluatePetPstCandidate({
        postKey: p.postKey,
        gender: p.gender,
        category: p.category,
        heightCm: p.heightCm,
        weightKg: p.weightKg,
        chestUnexp: p.chestUnexp,
        chestExp: p.chestExp,
        runSec: totalSec,
        longJumpM: p.longJumpM,
        highJumpM: p.highJumpM
      });
    }

    function renderResults(orMode) {
      var p = state.prefs;
      var post = POST_BENCHMARKS[p.postKey];
      var petReq = post.pet[p.gender];

      fChestU.wrap.hidden = p.gender !== 'male';
      fChestE.wrap.hidden = p.gender !== 'male';
      fLongJump.wrap.hidden = !petReq.longJumpM;
      fHighJump.wrap.hidden = !petReq.highJumpM;
      fRunSec.wrap.hidden = Boolean(petReq.isWalk);

      var ev = currentEval();
      verdictBox.className = 'cso-pps-verdict ' + (ev.overallEligible ? 'is-pass' : 'is-warn');
      verdictBox.textContent = ev.verdict + ' · BMI ' + ev.bmi + ' · ' + ev.extraNote;

      var mFrag = doc.createDocumentFragment();
      for (var i = 0; i < ev.checks.length; i += 1) {
        var c = ev.checks[i];
        var card = el('div', 'cso-pps-check ' + (c.pass ? 'is-pass' : 'is-fail'));
        var top = el('div', 'cso-pps-check__top');
        top.appendChild(el('strong', '', c.group + ' · ' + c.label));
        top.appendChild(el('span', 'cso-pps-pill-stat', c.pass ? '✅ PASS' : '❌ FAIL'));
        card.appendChild(top);
        card.appendChild(el('div', 'cso-pps-check__vals', (orMode ? 'ଆପଣଙ୍କର: ' : 'Yours: ') + c.actual + ' | ' + (orMode ? 'ଆବଶ୍ୟକ: ' : 'Req: ') + c.required));
        var track = el('div', 'cso-pps-bar-track');
        track.appendChild(el('div', 'cso-pps-bar-fill cso-vfv-bar--w' + quantizeStep(c.pct)));
        card.appendChild(track);
        mFrag.appendChild(card);
      }
      matrixGrid.replaceChildren(mFrag);

      // Reference Table across all 4 posts
      var rFrag = doc.createDocumentFragment();
      rFrag.appendChild(el('h3', 'cso-pps-ref__title', orMode ? '📋 ସରକାରୀ PST / PET ବେଞ୍ଚମାର୍କ ତାଲିକା (ସମସ୍ତ ୪ ପଦବୀ)' : '📋 Official Odisha Category Standards Reference Table (All 4 Posts)'));
      var tbl = el('table', 'cso-pps-table');
      var thead = doc.createElement('thead');
      var htr = doc.createElement('tr');
      ['Post / Force', 'Male (UR/SEBC) Height & Chest', 'Male (SC/ST) Height & Chest', 'Female Height', 'PET Qualifying Benchmark'].forEach(function (h) {
        htr.appendChild(el('th', '', h));
      });
      thead.appendChild(htr);
      tbl.appendChild(thead);
      var tbody = doc.createElement('tbody');
      Object.keys(POST_BENCHMARKS).forEach(function (k) {
        var b = POST_BENCHMARKS[k];
        var tr = doc.createElement('tr');
        tr.appendChild(el('td', '', b.en));
        tr.appendChild(el('td', '', b.pst.male.ur.heightCm + ' cm · ' + b.pst.male.ur.chestUnexp + '/' + b.pst.male.ur.chestExp + ' cm'));
        tr.appendChild(el('td', '', b.pst.male.sc.heightCm + (b.pst.male.st.heightCm !== b.pst.male.sc.heightCm ? (' / ' + b.pst.male.st.heightCm + ' (ST)') : '') + ' cm · ' + b.pst.male.sc.chestUnexp + '/' + b.pst.male.sc.chestExp + ' cm'));
        tr.appendChild(el('td', '', b.pst.female.ur.heightCm + ' cm (UR) / ' + b.pst.female.sc.heightCm + ' cm (SC/ST)'));
        tr.appendChild(el('td', '', b.pet.male.runLabel + ' (' + fmtDuration(b.pet.male.maxSec, b.pet.male.isWalk) + ' M / ' + fmtDuration(b.pet.female.maxSec, b.pet.female.isWalk) + ' F)'));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      var tw = el('div', 'cso-pps-table-wrap');
      tw.appendChild(tbl);
      rFrag.appendChild(tw);
      refWrap.replaceChildren(rFrag);
    }

    function render() {
      var orMode = state.lang === 'or';
      var p = state.prefs;
      btnEn.className = 'cso-pps-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-pps-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '🏃 ଓଡ଼ିଶା ପୋଲିସ୍ SI, କନଷ୍ଟେବଳ, ବନରକ୍ଷୀ ଓ ଅବକାରୀ PET/PST ଯାଞ୍ଚକାରୀ'
        : '🏃 Odisha Police SI, Constable, Forest Guard & Excise PET/PST Standards Checker';
      subtitle.textContent = orMode
        ? 'ଉଚ୍ଚତା, ଓଜନ/BMI, ଛାତି ଫୁଲାଇବା (୫ ସେ.ମି.), ଦୌଡ଼ / ୨୫ କି.ମି. ଚାଲିବା, ଲମ୍ବା ଡିଆଁ ଓ ଉଚ୍ଚ ଡିଆଁ ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'Verify Physical Standard (PST) & Physical Efficiency (PET) benchmarks across OPRB Police SI, Constable, OSSSC Forest Guard & Excise posts by gender and category.';
      printBtn.textContent = orMode ? '🖨️ ଫିଟନେସ୍ କାର୍ଡ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Physical Fitness Card';

      fPost.label.textContent = orMode ? 'ପଦବୀ / ବାହିନୀ' : 'Uniformed Post / Force';
      var pf = doc.createDocumentFragment();
      Object.keys(POST_BENCHMARKS).forEach(function (k) {
        var o = el('option', '', orMode ? POST_BENCHMARKS[k].or : POST_BENCHMARKS[k].en);
        o.value = k;
        if (k === p.postKey) o.selected = true;
        pf.appendChild(o);
      });
      fPost.input.replaceChildren(pf);
      fPost.input.value = p.postKey;

      fGender.label.textContent = orMode ? 'ଲିଙ୍ଗ (Gender)' : 'Gender';
      var gf = doc.createDocumentFragment();
      [['male', orMode ? 'ପୁରୁଷ (Male)' : 'Male'], ['female', orMode ? 'ମହିଳା (Female)' : 'Female']].forEach(function (pair) {
        var o = el('option', '', pair[1]);
        o.value = pair[0];
        if (pair[0] === p.gender) o.selected = true;
        gf.appendChild(o);
      });
      fGender.input.replaceChildren(gf);
      fGender.input.value = p.gender;

      fCat.label.textContent = orMode ? 'ଶ୍ରେଣୀ (Category)' : 'Social Category';
      var cf = doc.createDocumentFragment();
      [['ur', 'UR / General'], ['sebc', 'SEBC'], ['sc', 'SC'], ['st', 'ST']].forEach(function (pair) {
        var o = el('option', '', pair[1]);
        o.value = pair[0];
        if (pair[0] === p.category) o.selected = true;
        cf.appendChild(o);
      });
      fCat.input.replaceChildren(cf);
      fCat.input.value = p.category;

      var isWalk = POST_BENCHMARKS[p.postKey].pet[p.gender].isWalk;
      fHeight.label.textContent = orMode ? 'ଉଚ୍ଚତା (cm)' : 'Height (cm)';
      fWeight.label.textContent = orMode ? 'ଓଜନ (kg)' : 'Weight (kg)';
      fChestU.label.textContent = orMode ? 'ଛାତି (ସାଧାରଣ cm)' : 'Chest Unexpanded (cm)';
      fChestE.label.textContent = orMode ? 'ଛାତି (ଫୁଲାଇ cm)' : 'Chest Expanded (cm)';
      fRunMin.label.textContent = isWalk ? (orMode ? 'ଚାଲିବା ସମୟ (ମିନିଟ୍)' : 'Walk Time (Total Mins)') : (orMode ? 'ଦୌଡ଼ ସମୟ (ମିନିଟ୍)' : 'Run Time (Mins)');
      fRunSec.label.textContent = orMode ? 'ଅତିରିକ୍ତ ସେକେଣ୍ଡ' : 'Run Time (Secs)';
      fLongJump.label.textContent = orMode ? 'ଲମ୍ବା ଡିଆଁ (ମିଟର)' : 'Long Jump (meters)';
      fHighJump.label.textContent = orMode ? 'ଉଚ୍ଚ ଡିଆଁ (ମିଟର)' : 'High Jump (meters)';

      fHeight.input.value = String(p.heightCm);
      fWeight.input.value = String(p.weightKg);
      fChestU.input.value = String(p.chestUnexp);
      fChestE.input.value = String(p.chestExp);
      fRunMin.input.value = String(p.runMin);
      fRunSec.input.value = String(p.runSecPart);
      fLongJump.input.value = String(p.longJumpM);
      fHighJump.input.value = String(p.highJumpM);

      copyBtn.textContent = orMode ? '📋 PST/PET ରିପୋର୍ଟ କପି' : '📋 Copy PST/PET Assessment';
      copyStatusEl.textContent = state.copyStatus;

      renderResults(orMode);
    }

    function syncInputs() {
      var p = state.prefs;
      p.postKey = fPost.input.value;
      p.gender = fGender.input.value;
      p.category = fCat.input.value;
      p.heightCm = Number(fHeight.input.value) || 168;
      p.weightKg = Number(fWeight.input.value) || 55;
      p.chestUnexp = Number(fChestU.input.value) || 79;
      p.chestExp = Number(fChestE.input.value) || 84;
      p.runMin = Math.max(0, Number(fRunMin.input.value) || 0);
      p.runSecPart = Math.max(0, Math.min(59, Number(fRunSec.input.value) || 0));
      p.longJumpM = Number(fLongJump.input.value) || 0;
      p.highJumpM = Number(fHighJump.input.value) || 0;
      savePrefs(p);
      renderResults(state.lang === 'or');
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });
    fPost.input.addEventListener('change', function () {
      state.prefs.postKey = fPost.input.value;
      var isWalk = POST_BENCHMARKS[state.prefs.postKey].pet[state.prefs.gender].isWalk;
      if (isWalk && state.prefs.runMin < 30) state.prefs.runMin = 220;
      if (!isWalk && state.prefs.runMin > 30) state.prefs.runMin = 7;
      savePrefs(state.prefs);
      render();
    });
    fGender.input.addEventListener('change', function () { state.prefs.gender = fGender.input.value; savePrefs(state.prefs); render(); });
    fCat.input.addEventListener('change', function () { state.prefs.category = fCat.input.value; savePrefs(state.prefs); renderResults(state.lang === 'or'); });
    [fHeight, fWeight, fChestU, fChestE, fRunMin, fRunSec, fLongJump, fHighJump].forEach(function (x) {
      x.input.addEventListener('input', syncInputs);
    });

    copyBtn.addEventListener('click', function () {
      var ev = currentEval();
      var lines = ['CS Odisha PST/PET Assessment — ' + ev.postName + ' (' + ev.gender.toUpperCase() + ' · ' + ev.category.toUpperCase() + ')', ev.verdict];
      ev.checks.forEach(function (c) {
        lines.push((c.pass ? 'PASS' : 'FAIL') + ' | ' + c.label + ': ' + c.actual + ' (Req ' + c.required + ')');
      });
      if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        win.navigator.clipboard.writeText(lines.join('\n')).then(function () {
          state.copyStatus = '✅ Copied PST/PET Assessment!';
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
    POST_BENCHMARKS: POST_BENCHMARKS,
    evaluatePetPstCandidate: evaluatePetPstCandidate,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    mount: mount
  };
});
