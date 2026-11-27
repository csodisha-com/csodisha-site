/**
 * Common Sense Odisha — Interactive Odisha Result, Cut-Off & Merit Rank Estimator (v415)
 * Mounted on /results/ (#cso-results-cutoff-estimator-root) with:
 *  - Section A: Category-Wise Score vs. Previous Cut-Off Margin & Merit Rank Estimator
 *               (OPSC OAS Prelims, OSSC CGL Prelims & Mains, OSSSC Combined, OPRB Police SI,
 *                CBSE CTET, and Custom Mode + Quick Answer-Key Score Calculator)
 *  - Section B: Filterable Odisha Result & Cut-Off Archive synced with /api/public/search-index
 *               and window.CSOSavedAlerts bookmarking.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOResultsCutoffEstimator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOResultsCutoffEstimator = api;
})(function (win, doc) {
  'use strict';

  var PREFS_KEY = 'cso_results_cutoff_prefs_v1';

  var BOARDS = [
    { key: 'all', en: 'All Boards', or: 'ସମସ୍ତ ବୋର୍ଡ' },
    { key: 'opsc', en: 'OPSC', or: 'OPSC' },
    { key: 'ossc', en: 'OSSC', or: 'OSSC' },
    { key: 'osssc', en: 'OSSSC', or: 'OSSSC' },
    { key: 'oprb', en: 'OPRB', or: 'OPRB' },
    { key: 'central', en: 'Central (CBSE CTET / NTA)', or: 'କେନ୍ଦ୍ରୀୟ (CTET / NTA)' }
  ];

  var STAGES = [
    { key: 'all', en: 'All Stages', or: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ' },
    { key: 'final_merit', en: 'Final Merit / Selection List', or: 'ଚୂଡ଼ାନ୍ତ ମେଧା ତାଲିକା' },
    { key: 'prelims_written', en: 'Prelims / Written Result', or: 'ପ୍ରିଲିମ୍ସ / ଲିଖିତ ଫଳାଫଳ' },
    { key: 'cutoff_key', en: 'Cut-Off & Answer Key', or: 'କଟଅଫ୍ ଓ ଉତ୍ତର କୁଞ୍ଜିକା' }
  ];

  var CATEGORIES = [
    { key: 'ur', label: 'UR / General' },
    { key: 'sebc', label: 'SEBC / OBC' },
    { key: 'sc', label: 'SC' },
    { key: 'st', label: 'ST' },
    { key: 'ews', label: 'EWS' },
    { key: 'pwbd', label: 'PwBD' }
  ];

  var BENCHMARKS = [
    {
      key: 'opsc-oas-prelims',
      slug: 'opsc-oas-ocs-prelims-cutoff',
      board: 'opsc',
      board_label: 'OPSC',
      stage: 'prelims_written',
      title_en: 'OPSC OAS / OCS Prelims (GS Paper I — 200 Marks)',
      title_or: 'OPSC OAS / OCS ପ୍ରିଲିମ୍ସ (GS ପେପର୍-୧ — ୨୦୦ ନମ୍ବର)',
      max_marks: 200,
      published_date: '2025–26 Benchmark',
      note_en: 'Includes 2025–26 difficulty-adjusted safe band (65–70 for GS Paper I).',
      cutoffs: {
        ur: { male: 76.09, female: 69.70 },
        sebc: { male: 73.32, female: 65.41 },
        sc: { male: 56.92, female: 50.49 },
        st: { male: 44.94, female: 43.45 },
        ews: { male: 73.32, female: 65.41 },
        pwbd: { male: 50.00, female: 45.00 }
      },
      official_url: 'https://www.opsc.gov.in'
    },
    {
      key: 'ossc-cgl-prelims',
      slug: 'ossc-cglre-prelims-cutoff',
      board: 'ossc',
      board_label: 'OSSC',
      stage: 'prelims_written',
      title_en: 'OSSC CGLRE Prelims (150 Marks)',
      title_or: 'OSSC CGLRE ପ୍ରିଲିମ୍ସ (୧୫୦ ନମ୍ବର)',
      max_marks: 150,
      published_date: 'OSSC Benchmark',
      note_en: 'Normalized preliminary examination cut-off reference for Mains shortlisting.',
      cutoffs: {
        ur: { male: 106.50, female: 97.50 },
        sebc: { male: 104.25, female: 94.25 },
        sc: { male: 84.75, female: 74.50 },
        st: { male: 66.25, female: 62.75 },
        ews: { male: 100.00, female: 92.00 },
        pwbd: { male: 72.00, female: 68.00 }
      },
      official_url: 'https://www.ossc.gov.in'
    },
    {
      key: 'ossc-cgl-mains',
      slug: 'ossc-cglre-mains-final-merit-cutoff',
      board: 'ossc',
      board_label: 'OSSC',
      stage: 'final_merit',
      title_en: 'OSSC CGLRE Mains / Final Merit (200 Marks)',
      title_or: 'OSSC CGLRE ମେନ୍ସ / ଚୂଡ଼ାନ୍ତ ମେଧା (୨୦୦ ନମ୍ବର)',
      max_marks: 200,
      published_date: 'OSSC Final Merit',
      note_en: 'Final selection cut-off benchmark across OSSC Combined Graduate Level cadres.',
      cutoffs: {
        ur: { male: 126.00, female: 123.00 },
        sebc: { male: 122.75, female: 119.00 },
        sc: { male: 102.75, female: 102.00 },
        st: { male: 92.50, female: 90.50 },
        ews: { male: 120.00, female: 116.00 },
        pwbd: { male: 95.00, female: 92.00 }
      },
      official_url: 'https://www.ossc.gov.in'
    },
    {
      key: 'osssc-combined-district',
      slug: 'osssc-combined-ri-ari-amin-sfs-cutoff',
      board: 'osssc',
      board_label: 'OSSSC',
      stage: 'final_merit',
      title_en: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS — 180 Marks)',
      title_or: 'OSSSC ମିଳିତ ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / SFS — ୧୮୦ ନମ୍ବର)',
      max_marks: 180,
      published_date: 'OSSSC District Benchmark',
      note_en: 'Statewide reference band across Odisha 30-district cadre selection lists.',
      cutoffs: {
        ur: { male: 124.50, female: 116.00 },
        sebc: { male: 121.25, female: 112.50 },
        sc: { male: 103.00, female: 94.75 },
        st: { male: 88.50, female: 82.00 },
        ews: { male: 118.00, female: 110.00 },
        pwbd: { male: 90.00, female: 84.00 }
      },
      official_url: 'https://www.osssc.gov.in'
    },
    {
      key: 'oprb-police-si',
      slug: 'oprb-odisha-police-si-written-cutoff',
      board: 'oprb',
      board_label: 'OPRB',
      stage: 'prelims_written',
      title_en: 'OPRB Odisha Police SI Written (300 Marks)',
      title_or: 'OPRB ଓଡ଼ିଶା ପୋଲିସ୍ SI ଲିଖିତ ପରୀକ୍ଷା (୩୦୦ ନମ୍ବର)',
      max_marks: 300,
      published_date: 'OPRB Written Benchmark',
      note_en: 'Written exam cut-off reference for PET/PST shortlisting (Paper I, II & III).',
      cutoffs: {
        ur: { male: 198.00, female: 182.50 },
        sebc: { male: 192.00, female: 176.00 },
        sc: { male: 164.00, female: 151.00 },
        st: { male: 142.00, female: 132.00 },
        ews: { male: 188.00, female: 172.00 },
        pwbd: { male: 145.00, female: 135.00 }
      },
      official_url: 'https://oussc.odisha.gov.in'
    },
    {
      key: 'cbse-ctet-qualifying',
      slug: 'cbse-ctet-qualifying-standard',
      board: 'central',
      board_label: 'Central (CBSE CTET)',
      stage: 'cutoff_key',
      title_en: 'CBSE CTET Paper I / II Qualifying Standard (150 Marks)',
      title_or: 'CBSE CTET ପେପର୍-୧ / ୨ ଯୋଗ୍ୟତା ମାନଦଣ୍ଡ (୧୫୦ ନମ୍ବର)',
      max_marks: 150,
      published_date: 'CBSE National Standard',
      note_en: 'UR / EWS qualifying mark is 90 (60%); OBC / SC / ST / PwBD is 82 (55%).',
      cutoffs: {
        ur: { male: 90.00, female: 90.00 },
        sebc: { male: 82.00, female: 82.00 },
        sc: { male: 82.00, female: 82.00 },
        st: { male: 82.00, female: 82.00 },
        ews: { male: 90.00, female: 90.00 },
        pwbd: { male: 82.00, female: 82.00 }
      },
      official_url: 'https://ctet.nic.in'
    },
    {
      key: 'custom',
      slug: 'custom-exam-cutoff',
      board: 'opsc',
      board_label: 'Custom',
      stage: 'cutoff_key',
      title_en: 'Custom Exam & Cut-Off Mode',
      title_or: 'କଷ୍ଟମ୍ ପରୀକ୍ଷା ଓ କଟଅଫ୍ ମୋଡ୍',
      max_marks: 100,
      published_date: 'User Defined',
      note_en: 'Enter any exam maximum marks, your score, and target cut-off.',
      cutoffs: {
        ur: { male: 65.00, female: 60.00 },
        sebc: { male: 62.00, female: 58.00 },
        sc: { male: 55.00, female: 50.00 },
        st: { male: 48.00, female: 45.00 },
        ews: { male: 60.00, female: 56.00 },
        pwbd: { male: 50.00, female: 46.00 }
      },
      official_url: '/results/'
    }
  ];

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function getBenchmark(key) {
    for (var i = 0; i < BENCHMARKS.length; i += 1) {
      if (BENCHMARKS[i].key === key) return BENCHMARKS[i];
    }
    return BENCHMARKS[0];
  }

  function computeRawScoreFromCounts(correct, wrong, negMark, marksPerQ) {
    var c = Math.max(0, Number(correct) || 0);
    var w = Math.max(0, Number(wrong) || 0);
    var neg = Math.max(0, Number(negMark) || 0);
    var mpq = Math.max(0.5, Number(marksPerQ) || 1);
    return Math.round(((c * mpq) - (w * neg)) * 100) / 100;
  }

  function getBenchmarkCutoff(benchmarkKey, category, gender, customCutoff) {
    if (benchmarkKey === 'custom' && customCutoff !== undefined && customCutoff !== null) {
      return Math.max(0, Number(customCutoff) || 0);
    }
    var b = getBenchmark(benchmarkKey);
    var catObj = (b.cutoffs && b.cutoffs[category]) || b.cutoffs.ur;
    var g = gender === 'female' ? 'female' : 'male';
    return Number(catObj[g] !== undefined ? catObj[g] : catObj.male) || 0;
  }

  function evaluateCutoffMargin(score, cutoff, maxMarks) {
    var maxM = Math.max(1, Number(maxMarks) || 100);
    var sc = Math.max(0, Math.min(maxM, Number(score) || 0));
    var cut = Math.max(0, Math.min(maxM, Number(cutoff) || 0));
    var margin = Math.round((sc - cut) * 100) / 100;
    var scorePct = Math.round((sc / maxM) * 10000) / 100;
    var cutoffPct = Math.round((cut / maxM) * 10000) / 100;

    var zone;
    var percentileBand;
    if (margin > 5) {
      zone = 'Safe';
      percentileBand = margin >= 15
        ? 'Top 2% · High Final Merit Buffer'
        : 'Top 8% · Mains / DV Shortlist Zone';
    } else if (margin >= -5) {
      zone = 'Borderline';
      percentileBand = 'Top 15% · Competitive Borderline Zone (±5 Marks)';
    } else {
      zone = 'Below';
      percentileBand = 'Target +' + Math.abs(margin).toFixed(2) + ' Marks Needed to Reach Previous Cut-Off';
    }

    return {
      score: sc,
      cutoff: cut,
      maxMarks: maxM,
      margin: margin,
      scorePct: scorePct,
      cutoffPct: cutoffPct,
      zone: zone,
      percentileBand: percentileBand,
      scoreBarStep: quantizeStep(scorePct),
      cutoffBarStep: quantizeStep(cutoffPct)
    };
  }

  function inferBoard(txt) {
    var t = String(txt || '').toLowerCase();
    if (/\bopsc\b|\boas\b|\bocs\b/.test(t)) return { board: 'opsc', label: 'OPSC' };
    if (/\bosssc\b|\bari\b|\bamin\b|\bpeo\b/.test(t)) return { board: 'osssc', label: 'OSSSC' };
    if (/\bossc\b|\bcglre\b/.test(t)) return { board: 'ossc', label: 'OSSC' };
    if (/\boprb\b|\bpolice\b|\bcpse\b/.test(t)) return { board: 'oprb', label: 'OPRB' };
    return { board: 'central', label: 'Central / Live Result' };
  }

  function inferStage(txt) {
    var t = String(txt || '').toLowerCase();
    if (/final\s*merit|selection\s*list|selected/.test(t)) return 'final_merit';
    if (/cut-?off|answer\s*key/.test(t)) return 'cutoff_key';
    return 'prelims_written';
  }

  function mergeD1Results(archive, d1Items) {
    var base = Array.isArray(archive) ? archive.slice() : BENCHMARKS.filter(function (b) { return b.key !== 'custom'; });
    var seen = {};
    base.forEach(function (x) { seen[String(x.slug || x.key).toLowerCase()] = true; });

    var list = Array.isArray(d1Items) ? d1Items : [];
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it || !it.title) continue;
      var sl = String(it.slug || it.id || '').toLowerCase();
      if (!sl || seen[sl]) continue;
      var isResult = String(it.category || '').toLowerCase() === 'results' ||
        String(it.type || '').toLowerCase() === 'result' ||
        /result|cut-?off|merit\s*list|answer\s*key/i.test(String(it.title || ''));
      if (!isResult) continue;
      seen[sl] = true;
      var bInfo = inferBoard(it.title + ' ' + (it.org || ''));
      base.push({
        key: 'd1-' + sl,
        slug: sl,
        board: bInfo.board,
        board_label: bInfo.label,
        stage: inferStage(it.title),
        title_en: String(it.title || '').trim(),
        title_or: String(it.title_or || it.title || '').trim(),
        max_marks: 150,
        published_date: String(it.published_at || 'Live D1').slice(0, 10),
        note_en: String(it.summary || 'Live published result & answer-key notice on Common Sense Odisha.').trim(),
        cutoffs: null,
        official_url: String(it.url || '/results/')
      });
    }
    return base;
  }

  function filterArchive(items, filters) {
    var list = Array.isArray(items) ? items : [];
    var f = filters || {};
    var board = f.board || 'all';
    var stage = f.stage || 'all';
    var q = String(f.query || '').trim().toLowerCase();

    return list.filter(function (it) {
      if (!it || it.key === 'custom') return false;
      if (board !== 'all' && it.board !== board) return false;
      if (stage !== 'all' && it.stage !== stage) return false;
      if (q) {
        var hay = [it.title_en, it.title_or, it.board_label, it.note_en].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function loadPrefs() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) return JSON.parse(raw) || {};
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
    var state = {
      lang: detectLang(),
      benchmarkKey: saved.benchmarkKey || 'opsc-oas-prelims',
      category: saved.category || 'ur',
      gender: saved.gender || 'male',
      score: saved.score !== undefined ? Number(saved.score) : 84,
      customMax: saved.customMax !== undefined ? Number(saved.customMax) : 100,
      customCutoff: saved.customCutoff !== undefined ? Number(saved.customCutoff) : 65,
      calcCorrect: 0,
      calcWrong: 0,
      calcNeg: 0.25,
      boardFilter: saved.boardFilter || 'all',
      stageFilter: saved.stageFilter || 'all',
      query: saved.query || '',
      copiedToast: false,
      archive: BENCHMARKS.filter(function (b) { return b.key !== 'custom'; })
    };

    function persist() {
      savePrefs({
        benchmarkKey: state.benchmarkKey,
        category: state.category,
        gender: state.gender,
        score: state.score,
        customMax: state.customMax,
        customCutoff: state.customCutoff,
        boardFilter: state.boardFilter,
        stageFilter: state.stageFilter,
        query: state.query
      });
    }

    if (typeof fetch === 'function') {
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (payload) {
          var items = payload && Array.isArray(payload.items) ? payload.items : [];
          if (!items.length) return;
          state.archive = mergeD1Results(BENCHMARKS.filter(function (b) { return b.key !== 'custom'; }), items);
          render();
        })
        .catch(function () {});
    }

    function isSaved(slug) {
      return Boolean(win.CSOSavedAlerts && typeof win.CSOSavedAlerts.isSaved === 'function' && win.CSOSavedAlerts.isSaved(slug));
    }

    function toggleSave(item) {
      if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.toggle === 'function') {
        win.CSOSavedAlerts.toggle({
          slug: item.slug,
          title: item.title_en,
          url: item.official_url || '/results/',
          type: 'result',
          org: item.board_label
        });
        render();
      }
    }

    function render() {
      var isOr = state.lang === 'or';
      var bm = getBenchmark(state.benchmarkKey);
      var maxMarks = state.benchmarkKey === 'custom' ? state.customMax : bm.max_marks;
      var cutoff = getBenchmarkCutoff(state.benchmarkKey, state.category, state.gender, state.customCutoff);
      var ev = evaluateCutoffMargin(state.score, cutoff, maxMarks);
      var visibleArchive = filterArchive(state.archive, {
        board: state.boardFilter,
        stage: state.stageFilter,
        query: state.query
      });

      var rootWrap = el('div', 'cso-rce-wrap');
      rootWrap.setAttribute('data-cso-results-estimator', 'v415');

      // Section A — Margin & Merit Rank Estimator Card
      var secA = el('section', 'cso-rce-card');
      secA.setAttribute('aria-label', isOr ? 'କଟଅଫ୍ ମାର୍ଜିନ୍ ଓ ମେଧା ର‍୍ୟାଙ୍କ୍ ଆକଳନକାରୀ' : 'Category-Wise Cut-Off Margin and Merit Rank Estimator');

      var headA = el('div', 'cso-rce-head');
      var headLeft = el('div', 'cso-rce-head-left');
      headLeft.appendChild(el('span', 'cso-rce-badge', isOr ? '📊 ଓଡ଼ିଶା ପରୀକ୍ଷା ଫଳାଫଳ ଓ କଟଅଫ୍ ଆକଳନକାରୀ' : '📊 Odisha Cut-Off Margin & Merit Rank Estimator'));
      headLeft.appendChild(el('h2', 'cso-rce-title', isOr
        ? 'ବର୍ଗ ଅନୁଯାୟୀ ଆପଣଙ୍କ ନମ୍ବର ବନାମ ପୂର୍ବ କଟଅଫ୍ ଯାଞ୍ଚ କରନ୍ତୁ'
        : 'Category-Wise Score vs. Previous Cut-Off Margin Calculator'));
      headLeft.appendChild(el('p', 'cso-rce-sub', isOr
        ? 'OPSC OAS, OSSC CGL (ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ), OSSSC RI/ARI/ଅମିନ, OPRB ପୋଲିସ୍ SI ଓ CBSE CTET କଟଅଫ୍ ସହିତ ଆପଣଙ୍କ ନମ୍ବର ତୁଳନା କରନ୍ତୁ।'
        : 'Compare your raw or normalized score against official OPSC OAS, OSSC CGL, OSSSC Combined, OPRB Police SI & CBSE CTET cut-offs by category and gender.'));

      var langWrap = el('div', 'cso-rce-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-rce-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        langWrap.appendChild(lb);
      });
      headA.append(headLeft, langWrap);
      secA.appendChild(headA);

      // Inputs Grid
      var inpGrid = el('div', 'cso-rce-controls');

      var bmField = el('label', 'cso-rce-field');
      bmField.appendChild(el('span', 'cso-rce-field-lbl', isOr ? 'ପରୀକ୍ଷା ବେଞ୍ଚମାର୍କ' : 'Exam Benchmark'));
      var bmSel = el('select', 'cso-rce-select');
      BENCHMARKS.forEach(function (b) {
        var o = el('option', '', isOr ? b.title_or : b.title_en);
        o.value = b.key;
        if (state.benchmarkKey === b.key) o.selected = true;
        bmSel.appendChild(o);
      });
      bmSel.addEventListener('change', function () { state.benchmarkKey = bmSel.value; persist(); render(); });
      bmField.appendChild(bmSel);

      var catField = el('label', 'cso-rce-field');
      catField.appendChild(el('span', 'cso-rce-field-lbl', isOr ? 'ବର୍ଗ (Category)' : 'Category'));
      var catSel = el('select', 'cso-rce-select');
      CATEGORIES.forEach(function (c) {
        var o = el('option', '', c.label);
        o.value = c.key;
        if (state.category === c.key) o.selected = true;
        catSel.appendChild(o);
      });
      catSel.addEventListener('change', function () { state.category = catSel.value; persist(); render(); });
      catField.appendChild(catSel);

      var genField = el('label', 'cso-rce-field');
      genField.appendChild(el('span', 'cso-rce-field-lbl', isOr ? 'ଲିଙ୍ଗ (Gender)' : 'Gender'));
      var genSel = el('select', 'cso-rce-select');
      [{ k: 'male', l: isOr ? 'ପୁରୁଷ (Male)' : 'Male' }, { k: 'female', l: isOr ? 'ମହିଳା (Female)' : 'Female' }].forEach(function (g) {
        var o = el('option', '', g.l);
        o.value = g.k;
        if (state.gender === g.k) o.selected = true;
        genSel.appendChild(o);
      });
      genSel.addEventListener('change', function () { state.gender = genSel.value; persist(); render(); });
      genField.appendChild(genSel);

      var scField = el('label', 'cso-rce-field');
      scField.appendChild(el('span', 'cso-rce-field-lbl', (isOr ? 'ଆପଣଙ୍କ ନମ୍ବର (0–' : 'Your Score (0–') + maxMarks + ')'));
      var scInp = el('input', 'cso-rce-input');
      scInp.type = 'number';
      scInp.step = '0.25';
      scInp.min = '0';
      scInp.max = String(maxMarks);
      scInp.value = String(state.score);
      scInp.addEventListener('change', function () { state.score = Math.max(0, Number(scInp.value) || 0); persist(); render(); });
      scField.appendChild(scInp);

      inpGrid.append(bmField, catField, genField, scField);
      secA.appendChild(inpGrid);

      if (state.benchmarkKey === 'custom') {
        var custGrid = el('div', 'cso-rce-controls');
        var cmField = el('label', 'cso-rce-field');
        cmField.appendChild(el('span', 'cso-rce-field-lbl', 'Custom Max Marks'));
        var cmInp = el('input', 'cso-rce-input');
        cmInp.type = 'number';
        cmInp.value = String(state.customMax);
        cmInp.addEventListener('change', function () { state.customMax = Math.max(10, Number(cmInp.value) || 100); persist(); render(); });
        cmField.appendChild(cmInp);

        var ccField = el('label', 'cso-rce-field');
        ccField.appendChild(el('span', 'cso-rce-field-lbl', 'Custom Target Cut-Off'));
        var ccInp = el('input', 'cso-rce-input');
        ccInp.type = 'number';
        ccInp.step = '0.25';
        ccInp.value = String(state.customCutoff);
        ccInp.addEventListener('change', function () { state.customCutoff = Math.max(0, Number(ccInp.value) || 0); persist(); render(); });
        ccField.appendChild(ccInp);
        custGrid.append(cmField, ccField);
        secA.appendChild(custGrid);
      }

      // Quick Answer-Key Raw Score Helper
      var keyHelper = el('div', 'cso-rce-helper');
      keyHelper.appendChild(el('div', 'cso-rce-field-lbl', isOr ? '🧮 ଉତ୍ତର କୁଞ୍ଜିକାରୁ ତୁରନ୍ତ ନମ୍ବର ହିସାବ (ବୈକଳ୍ପିକ):' : '🧮 Quick Answer-Key Score Calculator (Optional):'));
      var keyRow = el('div', 'cso-rce-controls');

      var corInp = el('input', 'cso-rce-input');
      corInp.type = 'number';
      corInp.min = '0';
      corInp.placeholder = 'Correct Count';
      corInp.value = state.calcCorrect ? String(state.calcCorrect) : '';
      corInp.addEventListener('change', function () { state.calcCorrect = Math.max(0, Number(corInp.value) || 0); });

      var wrgInp = el('input', 'cso-rce-input');
      wrgInp.type = 'number';
      wrgInp.min = '0';
      wrgInp.placeholder = 'Wrong Count';
      wrgInp.value = state.calcWrong ? String(state.calcWrong) : '';
      wrgInp.addEventListener('change', function () { state.calcWrong = Math.max(0, Number(wrgInp.value) || 0); });

      var negSel = el('select', 'cso-rce-select');
      [
        { v: 0, l: 'Negative: 0 (CTET)' },
        { v: 0.25, l: 'Negative: −0.25 (OSSC / OSSSC)' },
        { v: 0.5, l: 'Negative: −0.50 (Strict)' }
      ].forEach(function (n) {
        var o = el('option', '', n.l);
        o.value = String(n.v);
        if (state.calcNeg === n.v) o.selected = true;
        negSel.appendChild(o);
      });
      negSel.addEventListener('change', function () { state.calcNeg = Number(negSel.value) || 0; });

      var applyCalcBtn = el('button', 'cso-rce-btn', isOr ? 'ନମ୍ବର ଲାଗୁ କରନ୍ତୁ' : 'Apply Score');
      applyCalcBtn.type = 'button';
      applyCalcBtn.addEventListener('click', function () {
        state.score = computeRawScoreFromCounts(state.calcCorrect, state.calcWrong, state.calcNeg, 1);
        persist();
        render();
      });
      keyRow.append(corInp, wrgInp, negSel, applyCalcBtn);
      keyHelper.appendChild(keyRow);
      secA.appendChild(keyHelper);

      // Verdict & KPIs
      var zoneLabel = ev.zone === 'Safe'
        ? (isOr ? '🟢 ସୁରକ୍ଷିତ / ପୂର୍ବ କଟଅଫ୍ ଠାରୁ ଅଧିକ' : '🟢 Safe / Above Previous Cut-Off')
        : (ev.zone === 'Borderline'
          ? (isOr ? '🟡 ପ୍ରତିଯୋଗିତାମୂଳକ / ବର୍ଡରଲାଇନ୍ (±5)' : '🟡 Competitive / Borderline (±5 Marks)')
          : (isOr ? '🔴 ପୂର୍ବ କଟଅଫ୍ ଠାରୁ କମ୍' : '🔴 Below Previous Cut-Off'));

      var verdictBanner = el('div', 'cso-rce-verdict is-' + ev.zone.toLowerCase());
      verdictBanner.append(
        el('div', 'cso-rce-verdict-zone', zoneLabel),
        el('div', 'cso-rce-verdict-tier', ev.percentileBand)
      );
      secA.appendChild(verdictBanner);

      var kpis = el('div', 'cso-rce-kpis');
      [
        [isOr ? 'କଟଅଫ୍ ମାର୍ଜିନ୍' : 'Cut-Off Margin', (ev.margin >= 0 ? '+' : '') + ev.margin.toFixed(2) + ' Marks'],
        [isOr ? 'ଆପଣଙ୍କ ଶତକଡ଼ା' : 'Your Score %', ev.score.toFixed(2) + ' / ' + ev.maxMarks + ' (' + ev.scorePct.toFixed(1) + '%)'],
        [isOr ? 'ପୂର୍ବ କଟଅଫ୍' : 'Reference Cut-Off', ev.cutoff.toFixed(2) + ' (' + ev.cutoffPct.toFixed(1) + '%)']
      ].forEach(function (pair) {
        var tile = el('div', 'cso-rce-kpi');
        tile.append(el('span', 'cso-rce-kpi-k', pair[0]), el('b', 'cso-rce-kpi-v', pair[1]));
        kpis.appendChild(tile);
      });
      secA.appendChild(kpis);

      // Discrete CSS Comparison Bars (zero inline style)
      var bars = el('div', 'cso-rce-bars');
      [
        [isOr ? 'ଆପଣଙ୍କ ନମ୍ବର' : 'Your Score', ev.scorePct.toFixed(1) + '%', ev.scoreBarStep],
        [isOr ? 'ପୂର୍ବ କଟଅଫ୍' : 'Previous Cut-Off', ev.cutoffPct.toFixed(1) + '%', ev.cutoffBarStep]
      ].forEach(function (bRow) {
        var r = el('div', 'cso-vfv-bar-row');
        var m = el('div', 'cso-vfv-bar-meta');
        m.append(el('span', 'cso-vfv-bar-label', bRow[0]), el('span', 'cso-vfv-bar-val', bRow[1]));
        var trk = el('div', 'cso-vfv-bar-track');
        trk.appendChild(el('div', 'cso-vfv-bar-fill cso-vfv-bar--w' + bRow[2]));
        r.append(m, trk);
        bars.appendChild(r);
      });
      secA.appendChild(bars);

      var copyBtn = el('button', 'cso-rce-btn cso-rce-btn--primary', state.copiedToast ? '✓ Score Analysis Copied' : '📋 Copy Score Analysis');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var txt = [
          'CS Odisha Cut-Off Margin Analysis — ' + bm.title_en,
          'Category: ' + state.category.toUpperCase() + ' (' + state.gender + ')',
          'Score: ' + ev.score + '/' + ev.maxMarks + ' (' + ev.scorePct + '%) vs Cut-Off: ' + ev.cutoff,
          'Margin: ' + (ev.margin >= 0 ? '+' : '') + ev.margin.toFixed(2) + ' | Zone: ' + ev.zone + ' (' + ev.percentileBand + ')'
        ].join('\n');
        if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
          win.navigator.clipboard.writeText(txt).catch(function () {});
        }
        state.copiedToast = true;
        render();
      });
      secA.appendChild(copyBtn);
      rootWrap.appendChild(secA);

      // Section B — Filterable Odisha Result & Cut-Off Archive
      var secB = el('section', 'cso-rce-card');
      secB.setAttribute('aria-label', isOr ? 'ଓଡ଼ିଶା ପରୀକ୍ଷା ଫଳାଫଳ ଓ କଟଅଫ୍ ଆର୍କାଇଭ୍' : 'Odisha Exam Result and Cut-Off Archive');

      var headB = el('div', 'cso-rce-head');
      headB.appendChild(el('h2', 'cso-rce-title', isOr
        ? ('📜 ଓଡ଼ିଶା ଫଳାଫଳ ଓ କଟଅଫ୍ ଆର୍କାଇଭ୍ (' + visibleArchive.length + 'ଟି)')
        : ('📜 Odisha Exam Result & Cut-Off Archive (' + visibleArchive.length + ')')));
      var printBtn = el('button', 'cso-rce-btn', isOr ? '🖨️ କଟଅଫ୍ ସିଟ୍ ପ୍ରିଣ୍ଟ' : '🖨️ Print Cut-Off Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (win && typeof win.print === 'function') win.print(); });
      headB.appendChild(printBtn);
      secB.appendChild(headB);

      var boardBar = el('div', 'cso-rce-actions');
      BOARDS.forEach(function (b) {
        var act = state.boardFilter === b.key;
        var bb = el('button', 'cso-rce-pill' + (act ? ' is-active' : ''), isOr ? b.or : b.en);
        bb.type = 'button';
        bb.addEventListener('click', function () { state.boardFilter = b.key; persist(); render(); });
        boardBar.appendChild(bb);
      });
      secB.appendChild(boardBar);

      var filterRow = el('div', 'cso-rce-controls');
      var stSel = el('select', 'cso-rce-select');
      stSel.setAttribute('aria-label', 'Filter by stage');
      STAGES.forEach(function (st) {
        var o = el('option', '', isOr ? st.or : st.en);
        o.value = st.key;
        if (state.stageFilter === st.key) o.selected = true;
        stSel.appendChild(o);
      });
      stSel.addEventListener('change', function () { state.stageFilter = stSel.value; persist(); render(); });

      var qInp = el('input', 'cso-rce-input');
      qInp.type = 'search';
      qInp.value = state.query;
      qInp.placeholder = isOr ? 'OPSC, OSSC CGL, OSSSC RI, Police SI, CTET…' : 'OPSC, OSSC CGL, OSSSC RI, Police SI, CTET…';
      qInp.addEventListener('input', function () { state.query = qInp.value; persist(); render(); });

      var resetBtn = el('button', 'cso-rce-btn', isOr ? '↻ ଫିଲ୍ଟର୍ ରିସେଟ୍' : '↻ Reset Filters');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        state.boardFilter = 'all';
        state.stageFilter = 'all';
        state.query = '';
        persist();
        render();
      });
      filterRow.append(stSel, qInp, resetBtn);
      secB.appendChild(filterRow);

      var arcGrid = el('div', 'cso-rce-grid');
      visibleArchive.forEach(function (it) {
        var card = el('article', 'cso-rce-item');
        var top = el('div', 'cso-rce-item-top');
        top.append(el('span', 'cso-rce-tag', it.board_label), el('span', 'cso-rce-date', it.published_date + ' · ' + it.max_marks + ' Marks'));
        card.appendChild(top);
        card.appendChild(el('h3', 'cso-rce-item-title', isOr ? it.title_or : it.title_en));
        card.appendChild(el('p', 'cso-rce-note', it.note_en));

        if (it.cutoffs) {
          var pills = el('div', 'cso-rce-cutoff-pills');
          ['ur', 'sebc', 'sc', 'st'].forEach(function (ck) {
            if (it.cutoffs[ck]) {
              pills.appendChild(el('span', 'cso-rce-cut-chip', ck.toUpperCase() + ': M ' + it.cutoffs[ck].male + ' / F ' + it.cutoffs[ck].female));
            }
          });
          card.appendChild(pills);
        }

        var foot = el('div', 'cso-rce-actions');
        if (it.cutoffs) {
          var loadBtn = el('button', 'cso-rce-btn cso-rce-btn--primary', isOr ? '📊 ମାର୍ଜିନ୍ କ୍ୟାଲକୁଲେଟର୍ ରେ ଲୋଡ୍' : '📊 Load into Margin Calculator');
          loadBtn.type = 'button';
          loadBtn.addEventListener('click', function () {
            state.benchmarkKey = it.key;
            persist();
            render();
          });
          foot.appendChild(loadBtn);
        }
        var sv = isSaved(it.slug);
        var svBtn = el('button', 'cso-rce-btn' + (sv ? ' is-saved' : ''), sv ? '★ Saved' : '☆ Save Result');
        svBtn.type = 'button';
        svBtn.addEventListener('click', function () { toggleSave(it); });
        foot.appendChild(svBtn);

        var link = el('a', 'cso-rce-link', isOr ? 'ସରକାରୀ ଫଳାଫଳ ↗' : 'Official Result / Guide →');
        link.setAttribute('href', it.official_url || '/results/');
        if (/^https?:\/\//i.test(it.official_url || '')) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
        foot.appendChild(link);

        card.appendChild(foot);
        arcGrid.appendChild(card);
      });
      secB.appendChild(arcGrid);
      rootWrap.appendChild(secB);

      container.replaceChildren(rootWrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-results-cutoff-estimator-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v415',
    PREFS_KEY: PREFS_KEY,
    BOARDS: BOARDS,
    STAGES: STAGES,
    CATEGORIES: CATEGORIES,
    BENCHMARKS: BENCHMARKS,
    computeRawScoreFromCounts: computeRawScoreFromCounts,
    getBenchmarkCutoff: getBenchmarkCutoff,
    evaluateCutoffMargin: evaluateCutoffMargin,
    mergeD1Results: mergeD1Results,
    filterArchive: filterArchive,
    mount: mount
  };
});
