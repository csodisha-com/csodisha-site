/**
 * Common Sense Odisha — Interactive Odisha Govt Employee Promotion,
 * MACP (10/20/30-Yr) & ORSP Pay Matrix Progression Simulator (v425)
 * Mounted on /career-paths/ (#cso-macp-progression-simulator-root).
 * Authentic ORSP 2017 Pay Matrix (Levels 4–15), Odisha Finance Dept MACP / Promotion
 * notional +1 cell pay fixation, 3% annual increments, DA/HRA growth & UPS 50% pension estimate.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS horizontal bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOMacpProgressionSimulator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOMacpProgressionSimulator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v425';
  var ROOT_ID = 'cso-macp-progression-simulator-root';
  var PREFS_KEY = 'cso_macp_simulator_prefs_v1';

  // Official ORSP 2017 Level Entry Basic Pays (Levels 4 to 15)
  var LEVEL_ENTRY_BASIC = {
    4: 19900,
    5: 21700,
    6: 23600,
    7: 25500,
    8: 29200,
    9: 35400,
    10: 44900,
    11: 47600,
    12: 56100,
    13: 67700,
    14: 78800,
    15: 118500
  };

  function buildPayMatrix() {
    var matrix = {};
    var levels = Object.keys(LEVEL_ENTRY_BASIC).map(Number);
    for (var i = 0; i < levels.length; i += 1) {
      var lvl = levels[i];
      var cells = [LEVEL_ENTRY_BASIC[lvl]];
      for (var c = 1; c < 40; c += 1) {
        var next = Math.round((cells[c - 1] * 1.03) / 100) * 100;
        if (next <= cells[c - 1]) next = cells[c - 1] + 100;
        cells.push(next);
      }
      matrix[lvl] = cells;
    }
    return matrix;
  }

  var PAY_MATRIX = buildPayMatrix();

  var CADRE_TRACKS = [
    {
      key: 'secretariat-aso',
      en: 'Odisha Secretariat Service (ASO Direct Recruit)',
      or: 'ଓଡ଼ିଶା ସଚିବାଳୟ ସେବା (ASO ସିଧାସଳଖ ନିଯୁକ୍ତି)',
      stages: [
        { level: 9, en: 'Assistant Section Officer (ASO)', or: 'ସହକାରୀ ସେକ୍ସନ୍ ଅଫିସର୍ (ASO)' },
        { level: 10, en: 'Section Officer (1st Prom / 10-Yr MACP)', or: 'ସେକ୍ସନ୍ ଅଫିସର୍ (୧ମ ପଦୋନ୍ନତି / MACP)' },
        { level: 12, en: 'Under Secretary (2nd Prom / 20-Yr MACP)', or: 'ଅଣ୍ଡର୍ ସେକ୍ରେଟାରୀ (୨ୟ ପଦୋନ୍ନତି / MACP)' },
        { level: 13, en: 'Deputy Secretary (3rd Prom / 30-Yr MACP)', or: 'ଡେପୁଟି ସେକ୍ରେଟାରୀ (୩ୟ ପଦୋନ୍ନତି / MACP)' }
      ]
    },
    {
      key: 'opsc-oas',
      en: 'Odisha State Civil Service (OPSC OAS Group-A)',
      or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OPSC OAS Group-A)',
      stages: [
        { level: 12, en: 'OAS Group-A (Junior Branch)', or: 'OAS ଗ୍ରୁପ୍-A (ଜୁନିଅର୍ ଶାଖା)' },
        { level: 13, en: 'OAS Senior Branch (Sr. Grade)', or: 'OAS ସିନିଅର୍ ଶାଖା' },
        { level: 14, en: 'OAS Supertime / Additional Secretary', or: 'OAS ସୁପରଟାଇମ୍ / ଅତିରିକ୍ତ ସଚିବ' },
        { level: 15, en: 'OAS Special Secretary', or: 'OAS ସ୍ୱତନ୍ତ୍ର ସଚିବ' }
      ]
    },
    {
      key: 'teaching-tgt',
      en: 'Odisha Secondary & Higher Secondary Teaching Cadre (TGT / PGT)',
      or: 'ଓଡ଼ିଶା ମାଧ୍ୟମିକ ଓ ଉଚ୍ଚ ମାଧ୍ୟମିକ ଶିକ୍ଷକ କ୍ୟାଡର୍ (TGT / PGT)',
      stages: [
        { level: 9, en: 'Trained Graduate Teacher (TGT)', or: 'ତାଲିମପ୍ରାପ୍ତ ସ୍ନାତକ ଶିକ୍ଷକ (TGT)' },
        { level: 10, en: 'Senior Teacher (10-Yr MACP / Promotion)', or: 'ବରିଷ୍ଠ ଶିକ୍ଷକ (୧୦-ବର୍ଷ MACP)' },
        { level: 11, en: 'PGT / Headmaster (20-Yr MACP)', or: 'PGT / ପ୍ରଧାନଶିକ୍ଷକ (୨୦-ବର୍ଷ MACP)' },
        { level: 12, en: 'Senior Headmaster (30-Yr MACP)', or: 'ବରିଷ୍ଠ ପ୍ରଧାନଶିକ୍ଷକ (୩୦-ବର୍ଷ MACP)' }
      ]
    },
    {
      key: 'district-ri',
      en: 'District Revenue & Field Executive Cadre (OSSSC RI → ORS → OAS)',
      or: 'ଜିଲ୍ଲା ରାଜସ୍ୱ କ୍ୟାଡର୍ (OSSSC RI → ORS → OAS)',
      stages: [
        { level: 9, en: 'Revenue Inspector (RI)', or: 'ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI)' },
        { level: 10, en: 'Revenue Supervisor (10-Yr MACP)', or: 'ରାଜସ୍ୱ ସୁପରଭାଇଜର୍ (୧୦-ବର୍ଷ MACP)' },
        { level: 11, en: 'ORS Group-B (20-Yr MACP)', or: 'ORS ଗ୍ରୁପ୍-B (୨୦-ବର୍ଷ MACP)' },
        { level: 12, en: 'Senior Grade / OAS Induction (30-Yr MACP)', or: 'ବରିଷ୍ଠ ଗ୍ରେଡ୍ / OAS (୩୦-ବର୍ଷ MACP)' }
      ]
    },
    {
      key: 'ministerial-ja',
      en: 'District & Heads of Dept Ministerial Cadre (Junior Assistant)',
      or: 'ଜିଲ୍ଲା ଓ ବିଭାଗୀୟ ମିନିଷ୍ଟେରିଆଲ୍ କ୍ୟାଡର୍ (ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ)',
      stages: [
        { level: 4, en: 'Junior Assistant (Entry)', or: 'ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ (ପ୍ରବେଶ)' },
        { level: 7, en: 'Senior Assistant (10-Yr MACP / Prom)', or: 'ସିନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ (୧୦-ବର୍ଷ MACP)' },
        { level: 9, en: 'Section Officer (20-Yr MACP / Prom)', or: 'ସେକ୍ସନ୍ ଅଫିସର୍ (୨୦-ବର୍ଷ MACP)' },
        { level: 10, en: 'Establishment Officer (30-Yr MACP)', or: 'ଏଷ୍ଟାବ୍ଲିସମେଣ୍ଟ ଅଫିସର୍ (୩୦-ବର୍ଷ MACP)' }
      ]
    }
  ];

  var SCENARIOS = {
    macp: {
      key: 'macp',
      en: 'Assured MACP Baseline (10 / 20 / 30-Yr Financial Upgradations)',
      or: 'ନିଶ୍ଚିତ MACP (୧୦ / ୨୦ / ୩୦ ବର୍ଷ ଆର୍ଥିକ ଉନ୍ନୀତକରଣ)',
      upgradeYears: [10, 20, 30]
    },
    'fast-track': {
      key: 'fast-track',
      en: 'Fast-Track Departmental Promotion (Yr 7 / Yr 15 / Yr 24)',
      or: 'ଦ୍ରୁତ ବିଭାଗୀୟ ପଦୋନ୍ନତି (୭ମ / ୧୫ତମ / ୨୪ତମ ବର୍ଷ)',
      upgradeYears: [7, 15, 24]
    }
  };

  /**
   * Official Odisha Finance Dept MACP / Promotion Pay Fixation:
   * 1) Grant 1 notional increment in current level (Cell N -> Cell N+1).
   * 2) Find equal or next higher cell (>= notionalPay) in targetLevel.
   */
  function fixPayOnPromotion(currentLevel, currentCellIndex, targetLevel) {
    var curRow = PAY_MATRIX[currentLevel] || PAY_MATRIX[9];
    var tgtRow = PAY_MATRIX[targetLevel] || PAY_MATRIX[currentLevel];
    var notionalIdx = Math.min(curRow.length - 1, Math.max(0, Number(currentCellIndex) || 0) + 1);
    var notionalPay = curRow[notionalIdx];

    var newCellIdx = 0;
    for (var i = 0; i < tgtRow.length; i += 1) {
      if (tgtRow[i] >= notionalPay) {
        newCellIdx = i;
        break;
      }
      newCellIdx = i;
    }
    return {
      notionalPay: notionalPay,
      level: targetLevel,
      cellIndex: newCellIdx,
      basicPay: tgtRow[newCellIdx]
    };
  }

  function simulateCareerProgression(opts) {
    var o = opts || {};
    var track = CADRE_TRACKS.find(function (t) { return t.key === o.trackKey; }) || CADRE_TRACKS[0];
    var scen = SCENARIOS[o.scenario] || SCENARIOS.macp;
    var serviceYears = Math.max(15, Math.min(35, Math.floor(Number(o.serviceYears) || 30)));
    var daPct = Math.max(0, Math.min(200, Number(o.daPct !== undefined ? o.daPct : 63)));
    var hraPct = Number(o.hraPct) === 20 ? 20 : 10;

    var stageIdx = 0;
    var curLevel = track.stages[0].level;
    var curCell = 0;
    var rows = [];

    for (var yr = 1; yr <= serviceYears; yr += 1) {
      var eventTag = yr === 1 ? 'Entry Appointment' : 'Annual 3% Increment';

      if (yr > 1) {
        var upgradePos = scen.upgradeYears.indexOf(yr);
        if (upgradePos !== -1 && stageIdx < track.stages.length - 1) {
          stageIdx += 1;
          var nextStage = track.stages[stageIdx];
          var fixed = fixPayOnPromotion(curLevel, curCell, nextStage.level);
          curLevel = fixed.level;
          curCell = fixed.cellIndex;
          eventTag = (scen.key === 'macp' ? 'MACP ' : 'Promotion ') + (upgradePos + 1) + ' → L-' + curLevel;
        } else {
          var rowArr = PAY_MATRIX[curLevel];
          curCell = Math.min(rowArr.length - 1, curCell + 1);
        }
      }

      var basicPay = PAY_MATRIX[curLevel][curCell];
      var daAmount = Math.round(basicPay * (daPct / 100));
      var hraAmount = Math.round(basicPay * (hraPct / 100));
      var grossPay = basicPay + daAmount + hraAmount;

      rows.push({
        year: yr,
        level: curLevel,
        cell: curCell + 1,
        designationEn: track.stages[stageIdx].en,
        designationOr: track.stages[stageIdx].or,
        event: eventTag,
        basicPay: basicPay,
        daAmount: daAmount,
        hraAmount: hraAmount,
        grossPay: grossPay
      });
    }

    var entryRow = rows[0];
    var yr10Row = rows[Math.min(9, rows.length - 1)];
    var yr20Row = rows[Math.min(19, rows.length - 1)];
    var finalRow = rows[rows.length - 1];

    // Estimated UPS 50% Assured Monthly Pension (50% of final basic + DR at current DA %)
    var upsBasicPension = Math.round(finalRow.basicPay * 0.5);
    var upsDr = Math.round(upsBasicPension * (daPct / 100));
    var upsTotalMonthly = upsBasicPension + upsDr;

    return {
      track: track,
      scenario: scen,
      serviceYears: serviceYears,
      daPct: daPct,
      hraPct: hraPct,
      rows: rows,
      milestones: {
        entry: entryRow,
        yr10: yr10Row,
        yr20: yr20Row,
        retirement: finalRow
      },
      upsPension: {
        basicPension: upsBasicPension,
        drAmount: upsDr,
        totalMonthly: upsTotalMonthly
      }
    };
  }

  function quantizeStep(pct) {
    var c = Math.max(5, Math.min(100, Number(pct) || 5));
    return Math.round(c / 5) * 5;
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
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
            trackKey: p.trackKey || CADRE_TRACKS[0].key,
            scenario: p.scenario === 'fast-track' ? 'fast-track' : 'macp',
            serviceYears: [20, 25, 30, 35].indexOf(Number(p.serviceYears)) !== -1 ? Number(p.serviceYears) : 30,
            daPct: Number(p.daPct) >= 0 ? Number(p.daPct) : 63,
            hraPct: Number(p.hraPct) === 20 ? 20 : 10
          };
        }
      }
    } catch (_) {}
    return { trackKey: CADRE_TRACKS[0].key, scenario: 'macp', serviceYears: 30, daPct: 63, hraPct: 20 };
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
      showTable: false,
      copyStatus: ''
    };

    var wrap = el('div', 'cso-mps-wrap');

    // Header
    var head = el('div', 'cso-mps-head');
    var titleBox = el('div', 'cso-mps-title-box');
    var heading = el('h2', 'cso-mps-title');
    var subtitle = el('p', 'cso-mps-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-mps-head-controls');
    var langGroup = el('div', 'cso-mps-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-mps-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-mps-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-mps-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Controls Grid
    var controls = el('div', 'cso-mps-controls');
    var trackWrap = el('div', 'cso-mps-field');
    var trackLabel = el('label', 'cso-mps-label');
    trackLabel.setAttribute('for', 'cso-mps-track');
    var trackSelect = el('select', 'cso-mps-select');
    trackSelect.id = 'cso-mps-track';
    trackWrap.appendChild(trackLabel);
    trackWrap.appendChild(trackSelect);

    var scenWrap = el('div', 'cso-mps-field');
    var scenLabel = el('span', 'cso-mps-label');
    var scenRow = el('div', 'cso-mps-pills');
    var macpBtn = el('button', 'cso-mps-pill');
    macpBtn.type = 'button';
    var fastBtn = el('button', 'cso-mps-pill');
    fastBtn.type = 'button';
    scenRow.appendChild(macpBtn);
    scenRow.appendChild(fastBtn);
    scenWrap.appendChild(scenLabel);
    scenWrap.appendChild(scenRow);

    var spanWrap = el('div', 'cso-mps-field');
    var spanLabel = el('span', 'cso-mps-label');
    var spanRow = el('div', 'cso-mps-pills');
    spanWrap.appendChild(spanLabel);
    spanWrap.appendChild(spanRow);

    var daWrap = el('div', 'cso-mps-field');
    var daLabel = el('label', 'cso-mps-label');
    daLabel.setAttribute('for', 'cso-mps-da');
    var daInput = el('input', 'cso-mps-input');
    daInput.type = 'number';
    daInput.id = 'cso-mps-da';
    daInput.min = '0';
    daInput.max = '150';
    daInput.step = '1';
    daInput.value = String(state.prefs.daPct);
    daWrap.appendChild(daLabel);
    daWrap.appendChild(daInput);

    var hraWrap = el('div', 'cso-mps-field');
    var hraLabel = el('label', 'cso-mps-label');
    hraLabel.setAttribute('for', 'cso-mps-hra');
    var hraSelect = el('select', 'cso-mps-select');
    hraSelect.id = 'cso-mps-hra';
    hraWrap.appendChild(hraLabel);
    hraWrap.appendChild(hraSelect);

    controls.appendChild(trackWrap);
    controls.appendChild(scenWrap);
    controls.appendChild(spanWrap);
    controls.appendChild(daWrap);
    controls.appendChild(hraWrap);

    // Output containers
    var kpiGrid = el('div', 'cso-mps-kpis');
    var barsBox = el('div', 'cso-mps-bars');
    var actionsRow = el('div', 'cso-mps-actions');
    var tableToggleBtn = el('button', 'cso-mps-btn');
    tableToggleBtn.type = 'button';
    var copyBtn = el('button', 'cso-mps-btn cso-mps-btn--primary');
    copyBtn.type = 'button';
    var copyStatusEl = el('span', 'cso-mps-copy-status');
    actionsRow.appendChild(tableToggleBtn);
    actionsRow.appendChild(copyBtn);
    actionsRow.appendChild(copyStatusEl);

    var tableWrap = el('div', 'cso-mps-table-wrap');
    tableWrap.hidden = true;

    wrap.appendChild(head);
    wrap.appendChild(controls);
    wrap.appendChild(kpiGrid);
    wrap.appendChild(barsBox);
    wrap.appendChild(actionsRow);
    wrap.appendChild(tableWrap);
    root.replaceChildren(wrap);

    function renderSimulation(orMode) {
      var sim = simulateCareerProgression(state.prefs);
      var ms = sim.milestones;
      var maxGross = Math.max(1, ms.retirement.grossPay);

      // Summary KPI cards
      var cards = [
        { title: orMode ? 'ପ୍ରବେଶ ମାସିକ ଦରମା (Year 1)' : 'Entry Monthly Gross (Yr 1)', val: fmtInr(ms.entry.grossPay), sub: 'L-' + ms.entry.level + ' · Basic ' + fmtInr(ms.entry.basicPay) },
        { title: orMode ? '୧୦-ବର୍ଷ ମାଇଲଷ୍ଟୋନ୍' : '10-Year Milestone Gross', val: fmtInr(ms.yr10.grossPay), sub: 'L-' + ms.yr10.level + ' · Basic ' + fmtInr(ms.yr10.basicPay) },
        { title: orMode ? '୨୦-ବର୍ଷ ମାଇଲଷ୍ଟୋନ୍' : '20-Year Milestone Gross', val: fmtInr(ms.yr20.grossPay), sub: 'L-' + ms.yr20.level + ' · Basic ' + fmtInr(ms.yr20.basicPay) },
        { title: orMode ? ('ଅବସର ଦରମା (Year ' + sim.serviceYears + ')') : ('Retirement Gross (Yr ' + sim.serviceYears + ')'), val: fmtInr(ms.retirement.grossPay), sub: 'L-' + ms.retirement.level + ' · Basic ' + fmtInr(ms.retirement.basicPay) },
        { title: orMode ? 'ଅନୁମାନିତ UPS ୫୦% ପେନସନ୍' : 'Est. UPS 50% Monthly Pension', val: fmtInr(sim.upsPension.totalMonthly), sub: 'Basic ' + fmtInr(sim.upsPension.basicPension) + ' + ' + sim.daPct + '% DR' }
      ];
      var kFrag = doc.createDocumentFragment();
      for (var i = 0; i < cards.length; i += 1) {
        var box = el('div', 'cso-mps-kpi');
        box.appendChild(el('span', 'cso-mps-kpi__l', cards[i].title));
        box.appendChild(el('strong', 'cso-mps-kpi__n', cards[i].val));
        box.appendChild(el('span', 'cso-mps-kpi__s', cards[i].sub));
        kFrag.appendChild(box);
      }
      kpiGrid.replaceChildren(kFrag);

      // Visual Milestone Bars
      var milestoneList = [
        { tag: 'Year 1 (Entry)', row: ms.entry },
        { tag: 'Year 10', row: ms.yr10 },
        { tag: 'Year 20', row: ms.yr20 },
        { tag: 'Year ' + sim.serviceYears + ' (Retirement)', row: ms.retirement }
      ];
      var bFrag = doc.createDocumentFragment();
      for (var m = 0; m < milestoneList.length; m += 1) {
        var mr = milestoneList[m].row;
        var pct = Math.round((mr.grossPay / maxGross) * 100);
        var bRow = el('div', 'cso-mps-bar-row');
        var bTop = el('div', 'cso-mps-bar-top');
        bTop.appendChild(el('strong', '', milestoneList[m].tag + ' — ' + (orMode ? mr.designationOr : mr.designationEn) + ' (L-' + mr.level + ', Cell ' + mr.cell + ')'));
        bTop.appendChild(el('span', 'cso-mps-bar-val', fmtInr(mr.grossPay) + '/mo'));
        var bTrack = el('div', 'cso-mps-bar-track');
        bTrack.appendChild(el('div', 'cso-mps-bar-fill cso-vfv-bar--w' + quantizeStep(pct)));
        bRow.appendChild(bTop);
        bRow.appendChild(bTrack);
        bFrag.appendChild(bRow);
      }
      barsBox.replaceChildren(bFrag);

      // Collapsible Year-by-Year Table
      tableWrap.hidden = !state.showTable;
      if (state.showTable) {
        var tbl = el('table', 'cso-mps-table');
        var thead = doc.createElement('thead');
        var htr = doc.createElement('tr');
        ['Year', 'Level / Cell', 'Stage / Event', 'Basic Pay', 'DA (' + sim.daPct + '%)', 'HRA (' + sim.hraPct + '%)', 'Gross Monthly'].forEach(function (col) {
          htr.appendChild(el('th', '', col));
        });
        thead.appendChild(htr);
        tbl.appendChild(thead);

        var tbody = doc.createElement('tbody');
        for (var r = 0; r < sim.rows.length; r += 1) {
          var row = sim.rows[r];
          var tr = doc.createElement('tr');
          if (row.event.indexOf('MACP') === 0 || row.event.indexOf('Promotion') === 0) tr.className = 'is-upgrade';
          tr.appendChild(el('td', '', 'Yr ' + row.year));
          tr.appendChild(el('td', '', 'L-' + row.level + ' / C-' + row.cell));
          tr.appendChild(el('td', '', row.event));
          tr.appendChild(el('td', '', fmtInr(row.basicPay)));
          tr.appendChild(el('td', '', fmtInr(row.daAmount)));
          tr.appendChild(el('td', '', fmtInr(row.hraAmount)));
          tr.appendChild(el('td', '', fmtInr(row.grossPay)));
          tbody.appendChild(tr);
        }
        tbl.appendChild(tbody);
        tableWrap.replaceChildren(tbl);
      } else {
        tableWrap.replaceChildren();
      }
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-mps-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-mps-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '📈 ଓଡ଼ିଶା ସରକାରୀ ପଦୋନ୍ନତି, MACP (୧୦/୨୦/୩୦ ବର୍ଷ) ଓ ORSP ବେତନ ପ୍ରଗତି ସିମୁଲେଟର୍'
        : '📈 Odisha Govt Promotion, MACP (10/20/30-Yr) & Pay Matrix Progression Simulator';
      subtitle.textContent = orMode
        ? 'ଓଡ଼ିଶା ସଚିବାଳୟ ASO, OPSC OAS, ଶିକ୍ଷକ (TGT/PGT), ଜିଲ୍ଲା ରାଜସ୍ୱ (RI) ଓ ଜୁନିଅର୍ ଆସିଷ୍ଟାଣ୍ଟ ପାଇଁ ORSP ସପ୍ତମ ବେତନ ବୃଦ୍ଧି ଓ ଅବସର UPS ୫୦% ପେନସନ୍ ଗଣନା କରନ୍ତୁ।'
        : 'Simulate 10 / 20 / 30-year MACP financial upgradations, departmental promotions, annual 3% ORSP increments, DA/HRA growth, and retirement UPS 50% monthly pension.';
      printBtn.textContent = orMode ? '🖨️ କ୍ୟାରିଅର ବେତନ ସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Career Pay Projection';

      trackLabel.textContent = orMode ? 'ଓଡ଼ିଶା ସରକାରୀ କ୍ୟାଡର୍ ଟ୍ରାକ୍' : 'Odisha Govt Cadre Track';
      var tFrag = doc.createDocumentFragment();
      for (var i = 0; i < CADRE_TRACKS.length; i += 1) {
        var opt = el('option', '', orMode ? CADRE_TRACKS[i].or : CADRE_TRACKS[i].en);
        opt.value = CADRE_TRACKS[i].key;
        if (CADRE_TRACKS[i].key === state.prefs.trackKey) opt.selected = true;
        tFrag.appendChild(opt);
      }
      trackSelect.replaceChildren(tFrag);
      trackSelect.value = state.prefs.trackKey;

      scenLabel.textContent = orMode ? 'ପଦୋନ୍ନତି ମୋଡ୍' : 'Progression Scenario Mode';
      macpBtn.textContent = orMode ? 'ନିଶ୍ଚିତ MACP (୧୦ / ୨୦ / ୩୦ ବର୍ଷ)' : 'Assured MACP (10 / 20 / 30-Yr)';
      fastBtn.textContent = orMode ? 'ଦ୍ରୁତ ପଦୋନ୍ନତି (୭ / ୧୫ / ୨୪ ବର୍ଷ)' : 'Fast-Track Promotion (Yr 7 / 15 / 24)';
      macpBtn.className = 'cso-mps-pill' + (state.prefs.scenario === 'macp' ? ' is-active' : '');
      fastBtn.className = 'cso-mps-pill' + (state.prefs.scenario === 'fast-track' ? ' is-active' : '');

      spanLabel.textContent = orMode ? 'ମୋଟ ଚାକିରି ଅବଧି (ବର୍ଷ)' : 'Total Service Span';
      var spans = [20, 25, 30, 35];
      var sFrag = doc.createDocumentFragment();
      for (var s = 0; s < spans.length; s += 1) {
        (function (yr) {
          var b = el('button', 'cso-mps-pill' + (state.prefs.serviceYears === yr ? ' is-active' : ''), yr + (orMode ? ' ବର୍ଷ' : ' Years'));
          b.type = 'button';
          b.addEventListener('click', function () {
            state.prefs.serviceYears = yr;
            savePrefs(state.prefs);
            render();
          });
          sFrag.appendChild(b);
        })(spans[s]);
      }
      spanRow.replaceChildren(sFrag);

      daLabel.textContent = orMode ? 'ବର୍ତ୍ତମାନ ମହଙ୍ଗା ଭତ୍ତା (DA %)' : 'Current DA (%)';
      hraLabel.textContent = orMode ? 'ଘରଭଡ଼ା ଭତ୍ତା (HRA ସହର ଶ୍ରେଣୀ)' : 'HRA City Tier';
      var hFrag = doc.createDocumentFragment();
      var hOpts = [
        { v: '20', l: orMode ? 'X/Y ସହର (20% — ଭୁବନେଶ୍ୱର/କଟକ/ରାଉରକେଲା/ବ୍ରହ୍ମପୁର/ସମ୍ବଲପୁର)' : 'X/Y Tier (20% — BBSR / Cuttack / Rourkela / Berhampur / Sambalpur)' },
        { v: '10', l: orMode ? 'Z ଶ୍ରେଣୀ (10% — ଅନ୍ୟାନ୍ୟ ଜିଲ୍ଲା)' : 'Z Tier (10% — Other Odisha Districts)' }
      ];
      for (var h = 0; h < hOpts.length; h += 1) {
        var ho = el('option', '', hOpts[h].l);
        ho.value = hOpts[h].v;
        if (String(state.prefs.hraPct) === hOpts[h].v) ho.selected = true;
        hFrag.appendChild(ho);
      }
      hraSelect.replaceChildren(hFrag);
      hraSelect.value = String(state.prefs.hraPct);

      tableToggleBtn.textContent = state.showTable
        ? (orMode ? '▲ ବର୍ଷ-ଭିତ୍ତିକ ଟେବୁଲ୍ ଲୁଚାନ୍ତୁ' : '▲ Hide Year-by-Year Increment Table')
        : (orMode ? '▼ ବର୍ଷ-ଭିତ୍ତିକ ବେତନ ଟେବୁଲ୍ ଦେଖନ୍ତୁ' : '▼ Show Year-by-Year Increment Table');
      copyBtn.textContent = orMode ? '📋 କ୍ୟାରିଅର ସାରାଂଶ କପି କରନ୍ତୁ' : '📋 Copy Career Progression Summary';
      copyStatusEl.textContent = state.copyStatus;

      renderSimulation(orMode);
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });
    trackSelect.addEventListener('change', function () { state.prefs.trackKey = trackSelect.value; savePrefs(state.prefs); render(); });
    macpBtn.addEventListener('click', function () { state.prefs.scenario = 'macp'; savePrefs(state.prefs); render(); });
    fastBtn.addEventListener('click', function () { state.prefs.scenario = 'fast-track'; savePrefs(state.prefs); render(); });
    daInput.addEventListener('input', function () { state.prefs.daPct = Math.max(0, Math.min(150, Number(daInput.value) || 0)); savePrefs(state.prefs); renderSimulation(state.lang === 'or'); });
    hraSelect.addEventListener('change', function () { state.prefs.hraPct = Number(hraSelect.value) === 20 ? 20 : 10; savePrefs(state.prefs); renderSimulation(state.lang === 'or'); });
    tableToggleBtn.addEventListener('click', function () { state.showTable = !state.showTable; render(); });

    copyBtn.addEventListener('click', function () {
      var sim = simulateCareerProgression(state.prefs);
      var ms = sim.milestones;
      var txt = [
        'CS Odisha MACP & Pay Progression (' + sim.track.en + ' · ' + sim.scenario.en + ')',
        'Entry (Yr 1): ' + fmtInr(ms.entry.grossPay) + ' (L-' + ms.entry.level + ', Basic ' + fmtInr(ms.entry.basicPay) + ')',
        'Year 10: ' + fmtInr(ms.yr10.grossPay) + ' (L-' + ms.yr10.level + ')',
        'Year 20: ' + fmtInr(ms.yr20.grossPay) + ' (L-' + ms.yr20.level + ')',
        'Retirement (Yr ' + sim.serviceYears + '): ' + fmtInr(ms.retirement.grossPay) + ' (L-' + ms.retirement.level + ', Basic ' + fmtInr(ms.retirement.basicPay) + ')',
        'Est. UPS 50% Monthly Pension: ' + fmtInr(sim.upsPension.totalMonthly)
      ].join('\n');
      if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        win.navigator.clipboard.writeText(txt).then(function () {
          state.copyStatus = '✅ Copied Career Progression Summary!';
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
    LEVEL_ENTRY_BASIC: LEVEL_ENTRY_BASIC,
    PAY_MATRIX: PAY_MATRIX,
    CADRE_TRACKS: CADRE_TRACKS,
    SCENARIOS: SCENARIOS,
    fixPayOnPromotion: fixPayOnPromotion,
    simulateCareerProgression: simulateCareerProgression,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    mount: mount
  };
});
