/**
 * Common Sense Odisha — Interactive Odisha District & Block-Level
 * Reservation Roster & Vacancy Distribution Explorer (/jobs/ & /odisha-special/, v439)
 * Covers all 30 Odisha districts & 314 blocks with Scheduled Area / TSP tagging,
 * exact Odisha ORV Act vertical quotas (UR 50% / ST 22.5% / SC 16.25% / SEBC 11.25%),
 * optional TSP local cadre mode, and horizontal sub-quotas (33% Women, 4% PwBD, 3% ESM, 1% Sports).
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSODistrictReservationRoster = api;
  if (typeof globalThis !== 'undefined') globalThis.CSODistrictReservationRoster = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v439';
  var ROOT_ID = 'cso-district-reservation-root';
  var PREFS_KEY = 'cso_district_roster_prefs_v1';

  // Exact 30 Odisha Districts & 314 Blocks (117 in 9 Fully Scheduled/TSP + 197 in 21 Non-Scheduled/Partial TSP)
  var DISTRICTS = [
    { slug: 'angul', en: 'Angul', or: 'ଅନୁଗୋଳ', division: 'Northern', blocks: 8, tsp: 'none' },
    { slug: 'balangir', en: 'Balangir', or: 'ବଲାଙ୍ଗୀର', division: 'Northern', blocks: 14, tsp: 'none' },
    { slug: 'balasore', en: 'Balasore', or: 'ବାଲେଶ୍ୱର', division: 'Central', blocks: 12, tsp: 'partial', tspNote: 'Nilagiri TSP Block' },
    { slug: 'bargarh', en: 'Bargarh', or: 'ବରଗଡ଼', division: 'Northern', blocks: 12, tsp: 'none' },
    { slug: 'bhadrak', en: 'Bhadrak', or: 'ଭଦ୍ରକ', division: 'Central', blocks: 7, tsp: 'none' },
    { slug: 'boudh', en: 'Boudh', or: 'ବୌଦ୍ଧ', division: 'Southern', blocks: 3, tsp: 'none' },
    { slug: 'cuttack', en: 'Cuttack', or: 'କଟକ', division: 'Central', blocks: 14, tsp: 'none' },
    { slug: 'deogarh', en: 'Deogarh', or: 'ଦେବଗଡ଼', division: 'Northern', blocks: 3, tsp: 'none' },
    { slug: 'dhenkanal', en: 'Dhenkanal', or: 'ଢେଙ୍କାନାଳ', division: 'Northern', blocks: 8, tsp: 'none' },
    { slug: 'gajapati', en: 'Gajapati', or: 'ଗଜପତି', division: 'Southern', blocks: 7, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'ganjam', en: 'Ganjam', or: 'ଗଞ୍ଜାମ', division: 'Southern', blocks: 22, tsp: 'partial', tspNote: 'Surada Partial TSP' },
    { slug: 'jagatsinghpur', en: 'Jagatsinghpur', or: 'ଜଗତସିଂହପୁର', division: 'Central', blocks: 8, tsp: 'none' },
    { slug: 'jajpur', en: 'Jajpur', or: 'ଯାଜପୁର', division: 'Central', blocks: 10, tsp: 'none' },
    { slug: 'jharsuguda', en: 'Jharsuguda', or: 'ଝାରସୁଗୁଡ଼ା', division: 'Northern', blocks: 5, tsp: 'none' },
    { slug: 'kalahandi', en: 'Kalahandi', or: 'କଳାହାଣ୍ଡି', division: 'Southern', blocks: 13, tsp: 'partial', tspNote: 'Th. Rampur & Lanjigarh TSP Blocks' },
    { slug: 'kandhamal', en: 'Kandhamal', or: 'କନ୍ଧମାଳ', division: 'Southern', blocks: 12, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'kendrapara', en: 'Kendrapara', or: 'କେନ୍ଦ୍ରାପଡ଼ା', division: 'Central', blocks: 9, tsp: 'none' },
    { slug: 'kendujhar', en: 'Kendujhar', or: 'କେନ୍ଦୁଝର', division: 'Northern', blocks: 13, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'khordha', en: 'Khordha', or: 'ଖୋର୍ଦ୍ଧା', division: 'Central', blocks: 10, tsp: 'none' },
    { slug: 'koraput', en: 'Koraput', or: 'କୋରାପୁଟ', division: 'Southern', blocks: 14, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'malkangiri', en: 'Malkangiri', or: 'ମାଲକାନଗିରି', division: 'Southern', blocks: 7, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'mayurbhanj', en: 'Mayurbhanj', or: 'ମୟୂରଭଞ୍ଜ', division: 'Central', blocks: 26, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'nabarangpur', en: 'Nabarangpur', or: 'ନବରଙ୍ଗପୁର', division: 'Southern', blocks: 10, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'nayagarh', en: 'Nayagarh', or: 'ନୟାଗଡ଼', division: 'Central', blocks: 8, tsp: 'none' },
    { slug: 'nuapada', en: 'Nuapada', or: 'ନୂଆପଡ଼ା', division: 'Southern', blocks: 5, tsp: 'none' },
    { slug: 'puri', en: 'Puri', or: 'ପୁରୀ', division: 'Central', blocks: 11, tsp: 'none' },
    { slug: 'rayagada', en: 'Rayagada', or: 'ରାୟଗଡ଼ା', division: 'Southern', blocks: 11, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' },
    { slug: 'sambalpur', en: 'Sambalpur', or: 'ସମ୍ବଲପୁର', division: 'Northern', blocks: 9, tsp: 'partial', tspNote: 'Kuchinda Sub-Division TSP' },
    { slug: 'subarnapur', en: 'Subarnapur', or: 'ସୁବର୍ଣ୍ଣପୁର', division: 'Northern', blocks: 6, tsp: 'none' },
    { slug: 'sundargarh', en: 'Sundargarh', or: 'ସୁନ୍ଦରଗଡ଼', division: 'Northern', blocks: 17, tsp: 'full', tspNote: 'Fully Scheduled / TSP District' }
  ];

  var CADRE_PRESETS = [
    { id: 'osssc-ri', label: 'OSSSC RI / ARI / Amin District Drive (120)', posts: 120 },
    { id: 'osssc-forest', label: 'OSSSC Forest Guard / Forester (240)', posts: 240 },
    { id: 'police-constable', label: 'Odisha Police Constable / Sepoy (180)', posts: 180 },
    { id: 'ltr-teacher', label: 'LTR / SSD Secondary Teacher (150)', posts: 150 },
    { id: 'district-ja', label: 'District Junior Assistant / DEO (80)', posts: 80 }
  ];

  function getDistrict(slugOrName) {
    var key = String(slugOrName || 'khordha').toLowerCase().trim();
    for (var i = 0; i < DISTRICTS.length; i += 1) {
      if (DISTRICTS[i].slug === key || DISTRICTS[i].en.toLowerCase() === key) return DISTRICTS[i];
    }
    return DISTRICTS[18]; // Khordha
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  /**
   * Largest-Remainder Seat Allocation guaranteeing exact sum conservation (sum === totalPosts)
   */
  function allocateSeats(totalPosts, ratios) {
    var keys = Object.keys(ratios);
    var floors = {};
    var remainders = [];
    var assigned = 0;
    for (var i = 0; i < keys.length; i += 1) {
      var k = keys[i];
      var exact = totalPosts * ratios[k];
      var fl = Math.floor(exact);
      floors[k] = fl;
      assigned += fl;
      remainders.push({ key: k, rem: exact - fl });
    }
    remainders.sort(function (a, b) { return b.rem - a.rem; });
    var leftover = totalPosts - assigned;
    for (var j = 0; j < leftover; j += 1) {
      floors[remainders[j % remainders.length].key] += 1;
    }
    return floors;
  }

  function computeOdishaReservationSplit(opts) {
    var o = opts || {};
    var totalPosts = Math.max(1, Math.min(10000, Math.round(Number(o.totalPosts || 120) || 120)));
    var dist = getDistrict(o.district || 'khordha');
    var useTspMode = Boolean(o.useScheduledAreaNorms) && dist.tsp === 'full';

    var ratios = useTspMode
      ? { ur: 0.30, st: 0.45, sc: 0.15, sebc: 0.10 }
      : { ur: 0.50, st: 0.225, sc: 0.1625, sebc: 0.1125 };

    var vertical = allocateSeats(totalPosts, ratios);
    var categories = ['ur', 'st', 'sc', 'sebc'];
    var matrix = {};
    var horizTotals = { women: 0, pwbd: 0, esm: 0, sports: 0 };

    categories.forEach(function (cat) {
      var seats = vertical[cat];
      var women = Math.floor(seats * 0.33);
      var pwbd = Math.round(seats * 0.04);
      var esm = Math.round(seats * 0.03);
      var sports = Math.round(seats * 0.01);
      horizTotals.women += women;
      horizTotals.pwbd += pwbd;
      horizTotals.esm += esm;
      horizTotals.sports += sports;
      matrix[cat] = {
        total: seats,
        pct: Number(((seats / totalPosts) * 100).toFixed(2)),
        barStep: quantizeStep((seats / totalPosts) * 100),
        women: women,
        pwbd: pwbd,
        esm: esm,
        sports: sports
      };
    });

    return {
      totalPosts: totalPosts,
      district: dist,
      cadreType: String(o.cadreType || 'osssc-ri'),
      useScheduledAreaNorms: useTspMode,
      ratios: ratios,
      vertical: vertical,
      matrix: matrix,
      horizontalTotals: horizTotals,
      pwbdBreakdown: {
        blindLowVision: Math.floor(horizTotals.pwbd / 4) + (horizTotals.pwbd % 4 > 0 ? 1 : 0),
        deafHardHearing: Math.floor(horizTotals.pwbd / 4) + (horizTotals.pwbd % 4 > 1 ? 1 : 0),
        locomotorCp: Math.floor(horizTotals.pwbd / 4) + (horizTotals.pwbd % 4 > 2 ? 1 : 0),
        autismIdMd: Math.floor(horizTotals.pwbd / 4)
      }
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

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      district: saved.district || 'khordha',
      totalPosts: saved.totalPosts || 120,
      cadreType: saved.cadreType || 'osssc-ri',
      useScheduledAreaNorms: Boolean(saved.useScheduledAreaNorms),
      highlightCat: saved.highlightCat || ''
    };

    if (typeof win.addEventListener === 'function') {
      win.addEventListener('cso:profile-synced', function (ev) {
        var detail = ev && ev.detail;
        if (!detail) return;
        if (detail.homeDistrictSlug) state.district = detail.homeDistrictSlug;
        if (detail.category) state.highlightCat = detail.category;
        savePrefs(state);
        render();
      });
    }

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var res = computeOdishaReservationSplit(state);
      var d = res.district;

      var card = el('div', 'cso-drr-card');
      card.setAttribute('data-cso-district-roster', '1');

      // Header
      var head = el('div', 'cso-drr-head');
      var headCopy = el('div', 'cso-drr-head-copy');
      headCopy.appendChild(el('div', 'cso-drr-eyebrow', orMode
        ? '🏛️ ୩୦-ଜିଲ୍ଲା ଓ ୩୧୪-ବ୍ଲକ୍ ଓଡ଼ିଶା ସଂରକ୍ଷଣ ରୋଷ୍ଟର୍ ଏକ୍ସପ୍ଲୋରର୍'
        : '🏛️ ODISHA 30-DISTRICT & 314-BLOCK RESERVATION ROSTER EXPLORER'));
      headCopy.appendChild(el('h2', 'cso-drr-title', orMode
        ? 'ଓଡ଼ିଶା ଜିଲ୍ଲାୱାରୀ ସଂରକ୍ଷଣ (UR/ST/SC/SEBC) ଓ ମହିଳା/PwBD ସିଟ୍ ଗଣନା'
        : 'Odisha District Reservation Roster & Vertical × Horizontal Seat Split'));
      headCopy.appendChild(el('p', 'cso-drr-sub', orMode
        ? 'ORV ଆଇନ (UR 50% / ST 22.5% / SC 16.25% / SEBC 11.25%), ଅନୁସୂଚିତ TSP ଜିଲ୍ଲା ନିୟମ ଓ 33% ମହିଳା / 4% PwBD / 3% ESM / 1% କ୍ରୀଡ଼ା କୋଟା ଗଣନା କରନ୍ତୁ।'
        : 'Compute exact Odisha ORV Act vertical quotas (UR 50%, ST 22.5%, SC 16.25%, SEBC 11.25%), TSP Scheduled-Area local norms & 33% Women / 4% PwBD / 3% ESM / 1% Sports splits.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-drr-lang-toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-drr-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Cadre Presets
      var presets = el('div', 'cso-drr-presets');
      CADRE_PRESETS.forEach(function (pr) {
        var b = el('button', 'cso-drr-pill' + (state.cadreType === pr.id ? ' is-active' : ''), pr.label);
        b.type = 'button';
        b.addEventListener('click', function () { state.cadreType = pr.id; state.totalPosts = pr.posts; persistAndRender(); });
        presets.appendChild(b);
      });
      card.appendChild(presets);

      // Controls
      var grid = el('div', 'cso-drr-grid');

      var dBox = el('div', 'cso-drr-field');
      var dLbl = el('label', 'cso-drr-label', orMode ? 'ଓଡ଼ିଶା ଜିଲ୍ଲା ବାଛନ୍ତୁ (30 ଜିଲ୍ଲା · 314 ବ୍ଲକ୍)' : 'Select Odisha District (30 Districts · 314 Blocks)');
      dLbl.setAttribute('for', 'cso-drr-dist');
      var dSel = el('select', 'cso-drr-input');
      dSel.id = 'cso-drr-dist';
      DISTRICTS.forEach(function (item) {
        var tspTag = item.tsp === 'full' ? ' [TSP / Scheduled]' : (item.tsp === 'partial' ? ' [Partial TSP]' : '');
        var opt = el('option', '', (orMode ? item.or : item.en) + ' (' + item.blocks + ' blocks)' + tspTag);
        opt.value = item.slug;
        if (item.slug === d.slug) opt.selected = true;
        dSel.appendChild(opt);
      });
      dSel.addEventListener('change', function () { state.district = dSel.value; persistAndRender(); });
      dBox.appendChild(dLbl);
      dBox.appendChild(dSel);
      grid.appendChild(dBox);

      var pBox = el('div', 'cso-drr-field');
      var pLbl = el('label', 'cso-drr-label', orMode ? 'ମୋଟ ବିଜ୍ଞାପିତ ପଦବୀ (1–10,000)' : 'Total Advertised Posts (1–10,000)');
      pLbl.setAttribute('for', 'cso-drr-posts');
      var pInp = el('input', 'cso-drr-input');
      pInp.id = 'cso-drr-posts';
      pInp.type = 'number';
      pInp.min = '1';
      pInp.max = '10000';
      pInp.value = String(state.totalPosts);
      pInp.addEventListener('change', function () { state.totalPosts = Math.max(1, Math.min(10000, Math.round(Number(pInp.value) || 120))); persistAndRender(); });
      pBox.appendChild(pLbl);
      pBox.appendChild(pInp);
      grid.appendChild(pBox);

      if (d.tsp === 'full') {
        var tspLbl = el('label', 'cso-drr-check-pill');
        var tspCb = el('input', 'cso-drr-checkbox');
        tspCb.type = 'checkbox';
        tspCb.checked = Boolean(state.useScheduledAreaNorms);
        tspCb.addEventListener('change', function () { state.useScheduledAreaNorms = tspCb.checked; persistAndRender(); });
        tspLbl.appendChild(tspCb);
        tspLbl.appendChild(el('span', '', orMode ? 'ଅନୁସୂଚିତ TSP ଜିଲ୍ଲା କ୍ୟାଡର୍ ମୋଡ୍ (ST 45%)' : 'Scheduled-Area / TSP Local Cadre Mode (ST 45%)'));
        grid.appendChild(tspLbl);
      }
      card.appendChild(grid);

      // District Meta Strip
      var metaStrip = el('div', 'cso-drr-meta');
      metaStrip.textContent = (orMode ? d.or : d.en) + ' · ' + d.division + ' Division · ' + d.blocks + ' Blocks · ' + (d.tspNote || 'Non-Scheduled Standard ORV District') + ' · Total Posts: ' + res.totalPosts;
      card.appendChild(metaStrip);

      // Discrete CSS Quota Bars
      var bars = el('div', 'cso-drr-bars');
      [
        { key: 'ur', lbl: 'UR (Unreserved — Merit Open): ' + res.matrix.ur.total + ' (' + res.matrix.ur.pct + '%)' },
        { key: 'st', lbl: 'ST (Scheduled Tribe): ' + res.matrix.st.total + ' (' + res.matrix.st.pct + '%)' },
        { key: 'sc', lbl: 'SC (Scheduled Caste): ' + res.matrix.sc.total + ' (' + res.matrix.sc.pct + '%)' },
        { key: 'sebc', lbl: 'SEBC (Socially & Ed. Backward): ' + res.matrix.sebc.total + ' (' + res.matrix.sebc.pct + '%)' }
      ].forEach(function (b) {
        var row = el('div', 'cso-drr-bar-row');
        row.appendChild(el('div', 'cso-drr-bar-lbl', b.lbl));
        var trk = el('div', 'cso-drr-bar-track');
        trk.appendChild(el('div', 'cso-drr-bar-fill cso-drr-fill--' + b.key + ' cso-vfv-bar--w' + res.matrix[b.key].barStep));
        row.appendChild(trk);
        bars.appendChild(row);
      });
      card.appendChild(bars);

      // 2D Vertical x Horizontal Seat Matrix Table
      var tblWrap = el('div', 'cso-drr-table-wrap');
      var tbl = el('table', 'cso-drr-table');
      var thead = el('thead');
      var htr = el('tr');
      [
        orMode ? 'ଭର୍ଟିକାଲ୍ ବର୍ଗ' : 'Vertical Category',
        orMode ? 'ମୋଟ ସିଟ୍' : 'Total Seats',
        orMode ? 'ମହିଳା (33%)' : 'Women (33%)',
        orMode ? 'ଭିନ୍ନକ୍ଷମ PwBD (4%)' : 'PwBD (4%)',
        orMode ? 'ପୂର୍ବତନ ସୈନିକ (3%)' : 'Ex-Servicemen (3%)',
        orMode ? 'କ୍ରୀଡ଼ାବିତ୍ (1%)' : 'Sportsperson (1%)'
      ].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      [
        { key: 'ur', name: 'UR (Unreserved)' },
        { key: 'st', name: 'ST (Scheduled Tribe)' },
        { key: 'sc', name: 'SC (Scheduled Caste)' },
        { key: 'sebc', name: 'SEBC' }
      ].forEach(function (cat) {
        var m = res.matrix[cat.key];
        var tr = el('tr', state.highlightCat === cat.key ? 'cso-drr-row-hi' : '');
        tr.appendChild(el('td', '', cat.name));
        tr.appendChild(el('td', '', String(m.total) + ' (' + m.pct + '%)'));
        tr.appendChild(el('td', '', String(m.women)));
        tr.appendChild(el('td', '', String(m.pwbd)));
        tr.appendChild(el('td', '', String(m.esm)));
        tr.appendChild(el('td', '', String(m.sports)));
        tbody.appendChild(tr);
      });
      var sumTr = el('tr', 'cso-drr-row-hi');
      sumTr.appendChild(el('td', '', orMode ? 'ମୋଟ (Total)' : 'TOTAL'));
      sumTr.appendChild(el('td', '', String(res.totalPosts) + ' (100%)'));
      sumTr.appendChild(el('td', '', String(res.horizontalTotals.women)));
      sumTr.appendChild(el('td', '', String(res.horizontalTotals.pwbd)));
      sumTr.appendChild(el('td', '', String(res.horizontalTotals.esm)));
      sumTr.appendChild(el('td', '', String(res.horizontalTotals.sports)));
      tbody.appendChild(sumTr);

      tbl.appendChild(tbody);
      tblWrap.appendChild(tbl);
      card.appendChild(tblWrap);

      // Actions
      var actions = el('div', 'cso-drr-actions');
      var statusEl = el('span', 'cso-drr-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-drr-btn cso-drr-btn--primary', orMode ? '📋 ସିଟ୍ ମ୍ୟାଟ୍ରିକ୍ସ କପି କରନ୍ତୁ' : '📋 Copy Category Seat Matrix');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var lines = [
          'CS Odisha — ' + d.en + ' (' + d.blocks + ' Blocks) Reservation Roster (' + res.totalPosts + ' Posts)',
          'UR: ' + res.matrix.ur.total + ' (Women ' + res.matrix.ur.women + ') | ST: ' + res.matrix.st.total + ' (Women ' + res.matrix.st.women + ')',
          'SC: ' + res.matrix.sc.total + ' (Women ' + res.matrix.sc.women + ') | SEBC: ' + res.matrix.sebc.total + ' (Women ' + res.matrix.sebc.women + ')',
          'Horizontal Totals — Women (33%): ' + res.horizontalTotals.women + ' | PwBD (4%): ' + res.horizontalTotals.pwbd + ' | ESM (3%): ' + res.horizontalTotals.esm + ' | Sports (1%): ' + res.horizontalTotals.sports
        ];
        copyText(lines.join('\n')).then(function () {
          statusEl.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Seat matrix copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-drr-btn', orMode ? '🖨️ ରୋଷ୍ଟର୍ ଟେବୁଲ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print District Roster Table');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(statusEl);
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
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    DISTRICTS: DISTRICTS,
    CADRE_PRESETS: CADRE_PRESETS,
    getDistrict: getDistrict,
    computeOdishaReservationSplit: computeOdishaReservationSplit,
    mount: mount
  };
});
