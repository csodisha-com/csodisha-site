/**
 * Common Sense Odisha — Interactive Odisha Govt Exam Syllabus & Topic Mastery Tracker
 * (/exams/ & /mock-tests/, v447)
 * 5 verified bilingual (EN / ଓଡ଼ିଆ) Odisha exam syllabi with chapter-level weightages,
 * per-chapter mastery status (Not Started | In Revision | Mastered) persisted in
 * localStorage (cso_syllabus_mastery_v1), Weightage-Weighted Readiness Engine and
 * Top-3 high-weightage weak-topic revision recommendations.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style
 * mutations; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOSyllabusMasteryTracker = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOSyllabusMasteryTracker = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v447';
  var ROOT_ID = 'cso-syllabus-mastery-tracker-root';
  var STORE_KEY = 'cso_syllabus_mastery_v1';

  var STATUS_NOT_STARTED = 'Not Started';
  var STATUS_IN_REVISION = 'In Revision';
  var STATUS_MASTERED = 'Mastered';
  var STATUSES = [STATUS_NOT_STARTED, STATUS_IN_REVISION, STATUS_MASTERED];
  var STATUS_LABELS = {
    'Not Started': { en: 'Not Started', or: 'ଆରମ୍ଭ ହୋଇନାହିଁ' },
    'In Revision': { en: 'In Revision', or: 'ପୁନରାବୃତ୍ତିରେ' },
    'Mastered': { en: 'Mastered', or: 'ଆୟତ୍ତ' }
  };
  var STATUS_FACTOR = { 'Not Started': 0, 'In Revision': 0.5, 'Mastered': 1 };

  function ch(id, w, en, or) { return { id: id, weight: w, en: en, or: or }; }

  var SYLLABI = {
    'opsc-oas': {
      key: 'opsc-oas',
      en: 'OPSC OAS Prelims & Mains',
      or: 'OPSC OAS ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ',
      papersEn: 'GS Paper-I, CSAT Paper-II, Odisha History / Geography / Economy, GS Mains I–IV & Essay',
      papersOr: 'GS ପେପର୍-I, CSAT ପେପର୍-II, ଓଡ଼ିଶା ଇତିହାସ / ଭୂଗୋଳ / ଅର୍ଥନୀତି, GS ମେନ୍ସ I–IV ଓ ପ୍ରବନ୍ଧ',
      chapters: [
        ch('polity', 18, 'Indian Polity & Governance', 'ଭାରତୀୟ ରାଜନୀତି ଓ ଶାସନ'),
        ch('odisha-history', 16, 'Odisha History, Culture & Freedom Movement', 'ଓଡ଼ିଶା ଇତିହାସ, ସଂସ୍କୃତି ଓ ସ୍ୱାଧୀନତା ଆନ୍ଦୋଳନ'),
        ch('economy', 15, 'Economy & Odisha Budget', 'ଅର୍ଥନୀତି ଓ ଓଡ଼ିଶା ବଜେଟ୍'),
        ch('geography', 14, 'Geography & Odisha Environment', 'ଭୂଗୋଳ ଓ ଓଡ଼ିଶା ପରିବେଶ'),
        ch('current-events', 15, 'Current National & Odisha Events', 'ସାମ୍ପ୍ରତିକ ଜାତୀୟ ଓ ଓଡ଼ିଶା ଘଟଣାବଳୀ'),
        ch('science-tech', 10, 'General Science & Technology', 'ସାଧାରଣ ବିଜ୍ଞାନ ଓ ପ୍ରଯୁକ୍ତି'),
        ch('csat', 12, 'CSAT Comprehension & Reasoning', 'CSAT ବୋଧଶକ୍ତି ଓ ଯୁକ୍ତି'),
        ch('mains-gs1', 6, 'GS Mains-I: Indian Heritage, Society & World History', 'GS ମେନ୍ସ-I: ଭାରତୀୟ ଐତିହ୍ୟ, ସମାଜ ଓ ବିଶ୍ୱ ଇତିହାସ'),
        ch('mains-gs2', 6, 'GS Mains-II: Governance, Institutions & International Relations', 'GS ମେନ୍ସ-II: ଶାସନ, ପ୍ରତିଷ୍ଠାନ ଓ ଆନ୍ତର୍ଜାତିକ ସମ୍ପର୍କ'),
        ch('mains-gs3', 6, 'GS Mains-III: Economy, Agriculture, Environment & Security', 'GS ମେନ୍ସ-III: ଅର୍ଥନୀତି, କୃଷି, ପରିବେଶ ଓ ସୁରକ୍ଷା'),
        ch('mains-gs4', 5, 'GS Mains-IV: Ethics, Integrity & Aptitude', 'GS ମେନ୍ସ-IV: ନୈତିକତା, ସଚ୍ଚୋଟତା ଓ ଅଭିରୁଚି'),
        ch('essay', 5, 'Essay Writing (English / Odia)', 'ପ୍ରବନ୍ଧ ଲେଖା (ଇଂରାଜୀ / ଓଡ଼ିଆ)')
      ]
    },
    'ossc-cglre': {
      key: 'ossc-cglre',
      en: 'OSSC CGLRE Prelims & Mains',
      or: 'OSSC CGLRE ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ',
      papersEn: 'Arithmetic, Data Interpretation, Logical Reasoning, Computer & Internet Awareness, Odisha & National Current Affairs, Odia & English Mains',
      papersOr: 'ଅଙ୍କଗଣିତ, ତଥ୍ୟ ବ୍ୟାଖ୍ୟା, ଯୁକ୍ତିଭିତ୍ତିକ ଚିନ୍ତାଧାରା, କମ୍ପ୍ୟୁଟର ଓ ଇଣ୍ଟରନେଟ୍ ସଚେତନତା, ଓଡ଼ିଶା ଓ ଜାତୀୟ ସାମ୍ପ୍ରତିକ ବିଷୟ, ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ମେନ୍ସ',
      chapters: [
        ch('arithmetic', 15, 'Arithmetic & Quantitative Aptitude', 'ଅଙ୍କଗଣିତ ଓ ପରିମାଣାତ୍ମକ ଅଭିରୁଚି'),
        ch('data-interpretation', 10, 'Data Interpretation', 'ତଥ୍ୟ ବ୍ୟାଖ୍ୟା'),
        ch('logical-reasoning', 12, 'Logical Reasoning', 'ଯୁକ୍ତିଭିତ୍ତିକ ଚିନ୍ତାଧାରା'),
        ch('computer-internet', 8, 'Computer & Internet Awareness', 'କମ୍ପ୍ୟୁଟର ଓ ଇଣ୍ଟରନେଟ୍ ସଚେତନତା'),
        ch('odisha-current-affairs', 10, 'Odisha Current Affairs', 'ଓଡ଼ିଶା ସାମ୍ପ୍ରତିକ ବିଷୟ'),
        ch('national-current-affairs', 10, 'National Current Affairs', 'ଜାତୀୟ ସାମ୍ପ୍ରତିକ ବିଷୟ'),
        ch('odia-mains', 10, 'Odia Language Mains', 'ଓଡ଼ିଆ ଭାଷା ମେନ୍ସ'),
        ch('english-mains', 10, 'English Language Mains', 'ଇଂରାଜୀ ଭାଷା ମେନ୍ସ'),
        ch('general-studies', 8, 'General Studies & Indian Polity', 'ସାଧାରଣ ଅଧ୍ୟୟନ ଓ ଭାରତୀୟ ରାଜନୀତି'),
        ch('odisha-gk', 7, 'Odisha General Knowledge', 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ')
      ]
    },
    'osssc-cadre': {
      key: 'osssc-cadre',
      en: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS / Forest Guard)',
      or: 'OSSSC ମିଳିତ ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ୍ / SFS / ବନରକ୍ଷୀ)',
      papersEn: 'Arithmetic, General Studies & Odisha GK, English, Odia Grammar & Comprehension, Computer Fundamentals',
      papersOr: 'ଅଙ୍କଗଣିତ, ସାଧାରଣ ଅଧ୍ୟୟନ ଓ ଓଡ଼ିଶା GK, ଇଂରାଜୀ, ଓଡ଼ିଆ ବ୍ୟାକରଣ ଓ ବୋଧଶକ୍ତି, କମ୍ପ୍ୟୁଟର ମୌଳିକତା',
      chapters: [
        ch('arithmetic', 20, 'Arithmetic', 'ଅଙ୍କଗଣିତ'),
        ch('general-studies', 12, 'General Studies', 'ସାଧାରଣ ଅଧ୍ୟୟନ'),
        ch('odisha-gk', 14, 'Odisha GK (History, Culture, Schemes)', 'ଓଡ଼ିଶା GK (ଇତିହାସ, ସଂସ୍କୃତି, ଯୋଜନା)'),
        ch('english', 10, 'English Grammar & Comprehension', 'ଇଂରାଜୀ ବ୍ୟାକରଣ ଓ ବୋଧଶକ୍ତି'),
        ch('odia-grammar', 12, 'Odia Grammar & Comprehension', 'ଓଡ଼ିଆ ବ୍ୟାକରଣ ଓ ବୋଧଶକ୍ତି'),
        ch('computer-fundamentals', 8, 'Computer Fundamentals', 'କମ୍ପ୍ୟୁଟର ମୌଳିକତା'),
        ch('reasoning', 8, 'Reasoning & Mental Ability', 'ଯୁକ୍ତି ଓ ମାନସିକ ଦକ୍ଷତା'),
        ch('current-affairs', 8, 'Current Affairs (Odisha & National)', 'ସାମ୍ପ୍ରତିକ ବିଷୟ (ଓଡ଼ିଶା ଓ ଜାତୀୟ)'),
        ch('odisha-geography', 4, 'Odisha Geography & Environment', 'ଓଡ଼ିଶା ଭୂଗୋଳ ଓ ପରିବେଶ'),
        ch('data-interpretation', 4, 'Data Interpretation', 'ତଥ୍ୟ ବ୍ୟାଖ୍ୟା')
      ]
    },
    'oprb-si': {
      key: 'oprb-si',
      en: 'Odisha Police Sub-Inspector (OPRB SI — CPSE)',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ସବ୍-ଇନ୍ସପେକ୍ଟର (OPRB SI — CPSE)',
      papersEn: 'General English & Odia Language, General Studies & Indian Constitution, Odisha GK & Current Affairs, Quantitative Aptitude & Reasoning, Computer & Cyber Awareness',
      papersOr: 'ସାଧାରଣ ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ଭାଷା, ସାଧାରଣ ଅଧ୍ୟୟନ ଓ ଭାରତୀୟ ସମ୍ବିଧାନ, ଓଡ଼ିଶା GK ଓ ସାମ୍ପ୍ରତିକ ବିଷୟ, ପରିମାଣାତ୍ମକ ଅଭିରୁଚି ଓ ଯୁକ୍ତି, କମ୍ପ୍ୟୁଟର ଓ ସାଇବର୍ ସଚେତନତା',
      chapters: [
        ch('english', 8, 'General English', 'ସାଧାରଣ ଇଂରାଜୀ'),
        ch('odia', 8, 'Odia Language', 'ଓଡ଼ିଆ ଭାଷା'),
        ch('general-studies', 12, 'General Studies', 'ସାଧାରଣ ଅଧ୍ୟୟନ'),
        ch('constitution', 12, 'Indian Constitution & Polity', 'ଭାରତୀୟ ସମ୍ବିଧାନ ଓ ରାଜନୀତି'),
        ch('odisha-gk', 10, 'Odisha GK', 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ'),
        ch('current-affairs', 10, 'Current Affairs', 'ସାମ୍ପ୍ରତିକ ବିଷୟ'),
        ch('quant', 14, 'Quantitative Aptitude', 'ପରିମାଣାତ୍ମକ ଅଭିରୁଚି'),
        ch('reasoning', 12, 'Reasoning', 'ଯୁକ୍ତି'),
        ch('computer-cyber', 8, 'Computer & Cyber Awareness', 'କମ୍ପ୍ୟୁଟର ଓ ସାଇବର୍ ସଚେତନତା'),
        ch('law-police', 6, 'Criminal Law & Police Procedure Basics', 'ଫୌଜଦାରୀ ଆଇନ ଓ ପୋଲିସ୍ ପ୍ରକ୍ରିୟା ମୌଳିକତା')
      ]
    },
    'teacher-ltr-ssd-oav': {
      key: 'teacher-ltr-ssd-oav',
      en: 'LTR / SSD / OAV Secondary Teacher',
      or: 'LTR / SSD / OAV ମାଧ୍ୟମିକ ଶିକ୍ଷକ',
      papersEn: 'Pedagogy, Child Development & NEP 2020, General Knowledge & Current Affairs, Reasoning & Numerical Ability, Computer Literacy, Subject Content & Methodology',
      papersOr: 'ଶିକ୍ଷଣ ପଦ୍ଧତି, ଶିଶୁ ବିକାଶ ଓ NEP 2020, ସାଧାରଣ ଜ୍ଞାନ ଓ ସାମ୍ପ୍ରତିକ ବିଷୟ, ଯୁକ୍ତି ଓ ସାଂଖ୍ୟିକ ଦକ୍ଷତା, କମ୍ପ୍ୟୁଟର ସାକ୍ଷରତା, ବିଷୟବସ୍ତୁ ଓ ପଦ୍ଧତି',
      chapters: [
        ch('pedagogy-child-dev', 14, 'Pedagogy & Child Development', 'ଶିକ୍ଷଣ ପଦ୍ଧତି ଓ ଶିଶୁ ବିକାଶ'),
        ch('nep-2020', 10, 'NEP 2020 & Odisha Education Policy', 'NEP 2020 ଓ ଓଡ଼ିଶା ଶିକ୍ଷା ନୀତି'),
        ch('gk-current-affairs', 10, 'General Knowledge & Current Affairs', 'ସାଧାରଣ ଜ୍ଞାନ ଓ ସାମ୍ପ୍ରତିକ ବିଷୟ'),
        ch('reasoning', 8, 'Reasoning', 'ଯୁକ୍ତି'),
        ch('numerical', 8, 'Numerical Ability', 'ସାଂଖ୍ୟିକ ଦକ୍ଷତା'),
        ch('computer-literacy', 6, 'Computer Literacy', 'କମ୍ପ୍ୟୁଟର ସାକ୍ଷରତା'),
        ch('subject-content', 20, 'Subject Content (Concerned Subject)', 'ବିଷୟବସ୍ତୁ (ସମ୍ବନ୍ଧିତ ବିଷୟ)'),
        ch('methodology', 12, 'Subject Teaching Methodology', 'ବିଷୟ ଶିକ୍ଷଣ ପଦ୍ଧତି'),
        ch('rte-acts', 6, 'RTE Act & Odisha Education Rules', 'RTE ଆଇନ ଓ ଓଡ଼ିଶା ଶିକ୍ଷା ନିୟମ'),
        ch('inclusive-education', 6, 'Inclusive Education & Assessment', 'ଅନ୍ତର୍ଭୁକ୍ତ ଶିକ୍ଷା ଓ ମୂଲ୍ୟାୟନ')
      ]
    }
  };
  var TRACK_KEYS = ['opsc-oas', 'ossc-cglre', 'osssc-cadre', 'oprb-si', 'teacher-ltr-ssd-oav'];

  function round2(n) { return Math.round(n * 100) / 100; }

  function normalizeStatus(s) {
    return STATUSES.indexOf(s) !== -1 ? s : STATUS_NOT_STARTED;
  }

  function getTrack(trackKey) {
    return SYLLABI[trackKey] || SYLLABI[TRACK_KEYS[0]];
  }

  function barClassFor(pct) {
    var bucket = Math.round(Math.max(0, Math.min(100, Number(pct) || 0)) / 5) * 5;
    return 'cso-vfv-bar--w' + bucket;
  }

  /**
   * Weightage-Weighted Readiness Engine.
   * Mastered = 1.0, In Revision = 0.5, Not Started = 0.0, each × chapter weightage;
   * result is normalised by the total weightage of the track.
   */
  function computeSyllabusReadiness(trackKey, masteryMap) {
    var track = getTrack(trackKey);
    var map = masteryMap || {};
    var totalWeight = 0;
    var earned = 0;
    var mastered = 0;
    var inRevision = 0;
    var notStarted = 0;
    var rows = track.chapters.map(function (c) {
      var status = normalizeStatus(map[c.id]);
      totalWeight += c.weight;
      earned += c.weight * STATUS_FACTOR[status];
      if (status === STATUS_MASTERED) mastered += 1;
      else if (status === STATUS_IN_REVISION) inRevision += 1;
      else notStarted += 1;
      return { id: c.id, en: c.en, or: c.or, weight: c.weight, status: status };
    });
    var pct = totalWeight > 0 ? round2((earned / totalWeight) * 100) : 0;

    // Weak topics: unstarted chapters first (highest weightage first), then In Revision.
    var byWeight = function (a, b) { return b.weight - a.weight || (a.id < b.id ? -1 : 1); };
    var weak = rows.filter(function (r) { return r.status === STATUS_NOT_STARTED; }).sort(byWeight)
      .concat(rows.filter(function (r) { return r.status === STATUS_IN_REVISION; }).sort(byWeight))
      .slice(0, 3);

    return {
      trackKey: track.key,
      totalChapters: rows.length,
      totalWeight: totalWeight,
      weightedMasteryPct: pct,
      masteredCount: mastered,
      inRevisionCount: inRevision,
      notStartedCount: notStarted,
      completionLabel: mastered + ' / ' + rows.length,
      barClass: barClassFor(pct),
      chapters: rows,
      weakTopics: weak
    };
  }

  function buildRevisionPlanText(trackKey, masteryMap, lang) {
    var isOr = lang === 'or';
    var track = getTrack(trackKey);
    var r = computeSyllabusReadiness(trackKey, masteryMap);
    var lines = [];
    lines.push((isOr ? 'ମୋର ଦୁର୍ବଳ ବିଷୟ ପୁନରାବୃତ୍ତି ଯୋଜନା — ' : 'My Weak-Topic Revision Plan — ') + (isOr ? track.or : track.en));
    lines.push((isOr ? 'ଓଜନ-ଭିତ୍ତିକ ପ୍ରସ୍ତୁତି: ' : 'Weightage-Weighted Mastery: ') + r.weightedMasteryPct + '% (' + r.completionLabel + (isOr ? ' ଅଧ୍ୟାୟ ଆୟତ୍ତ)' : ' chapters mastered)'));
    if (!r.weakTopics.length) {
      lines.push(isOr ? 'ସମସ୍ତ ଅଧ୍ୟାୟ ଆୟତ୍ତ — ମକ୍ ଟେଷ୍ଟ୍ ଅଭ୍ୟାସ ଜାରି ରଖନ୍ତୁ।' : 'All chapters mastered — keep practising full-length mock tests.');
    } else {
      r.weakTopics.forEach(function (w, i) {
        lines.push((i + 1) + '. ' + (isOr ? w.or : w.en) + ' — ' + w.weight + '% ' + (isOr ? 'ଓଜନ' : 'weightage') + ' [' + (isOr ? STATUS_LABELS[w.status].or : w.status) + ']');
      });
    }
    lines.push('csodisha.com/exams/');
    return lines.join('\n');
  }

  function buildChecklistText(trackKey, masteryMap, lang) {
    var isOr = lang === 'or';
    var track = getTrack(trackKey);
    var r = computeSyllabusReadiness(trackKey, masteryMap);
    var lines = [(isOr ? track.or : track.en) + ' — ' + (isOr ? 'ପାଠ୍ୟକ୍ରମ ଓ ଆୟତ୍ତ ଚେକ୍‌ଲିଷ୍ଟ' : 'Syllabus & Mastery Checklist')];
    r.chapters.forEach(function (c) {
      var mark = c.status === STATUS_MASTERED ? '[x]' : (c.status === STATUS_IN_REVISION ? '[~]' : '[ ]');
      lines.push(mark + ' ' + (isOr ? c.or : c.en) + ' (' + c.weight + '%)');
    });
    return lines.join('\n');
  }

  function loadStore() {
    var base = { lang: 'en', track: TRACK_KEYS[0], mastery: {} };
    try {
      var raw = win.localStorage && win.localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return base;
      base.lang = parsed.lang === 'or' ? 'or' : 'en';
      base.track = SYLLABI[parsed.track] ? parsed.track : TRACK_KEYS[0];
      var m = parsed.mastery && typeof parsed.mastery === 'object' ? parsed.mastery : {};
      TRACK_KEYS.forEach(function (k) {
        var src = m[k] && typeof m[k] === 'object' ? m[k] : {};
        var clean = {};
        SYLLABI[k].chapters.forEach(function (c) {
          if (STATUSES.indexOf(src[c.id]) !== -1) clean[c.id] = src[c.id];
        });
        base.mastery[k] = clean;
      });
      return base;
    } catch (_) {
      return base;
    }
  }

  function saveStore(store) {
    try {
      if (win.localStorage) win.localStorage.setItem(STORE_KEY, JSON.stringify(store));
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
    var store = loadStore();
    var statusMsg = '';

    function persist() { saveStore(store); }
    function currentMap() {
      if (!store.mastery[store.track]) store.mastery[store.track] = {};
      return store.mastery[store.track];
    }

    function render() {
      var isOr = store.lang === 'or';
      var track = getTrack(store.track);
      var res = computeSyllabusReadiness(store.track, currentMap());
      var card = el('div', 'cso-smt-card');

      var head = el('div', 'cso-smt-head');
      var hLeft = el('div');
      hLeft.appendChild(el('p', 'cso-smt-eyebrow', isOr ? 'ପାଠ୍ୟକ୍ରମ ଓ ବିଷୟ ଆୟତ୍ତ ଟ୍ରାକର୍ • v447' : 'SYLLABUS & TOPIC MASTERY TRACKER • v447'));
      hLeft.appendChild(el('h2', 'cso-smt-title', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ପାଠ୍ୟକ୍ରମ ଓ ବିଷୟ ଆୟତ୍ତ ଟ୍ରାକର୍' : 'Odisha Govt Exam Syllabus & Topic Mastery Tracker'));
      hLeft.appendChild(el('p', 'cso-smt-sub', isOr ? 'ପ୍ରତ୍ୟେକ ଅଧ୍ୟାୟର ସ୍ଥିତି ଚିହ୍ନଟ କରନ୍ତୁ — ଓଜନ-ଭିତ୍ତିକ ପ୍ରସ୍ତୁତି % ଓ ଶୀର୍ଷ 3 ଦୁର୍ବଳ ବିଷୟ ସ୍ୱୟଂଚାଳିତ ହିସାବ ହେବ। ତଥ୍ୟ କେବଳ ଆପଣଙ୍କ ଡିଭାଇସ୍‌ରେ ସଞ୍ଚିତ ରହେ।' : 'Mark each chapter’s status — Weightage-Weighted Mastery % and the Top 3 high-weightage weak topics update instantly. Progress stays only on your device.'));
      head.appendChild(hLeft);

      var langBox = el('div', 'cso-smt-lang-toggle');
      var enBtn = el('button', 'cso-smt-lang-btn', 'English');
      enBtn.type = 'button';
      enBtn.setAttribute('aria-pressed', String(!isOr));
      enBtn.addEventListener('click', function () { store.lang = 'en'; persist(); render(); });
      var orBtn = el('button', 'cso-smt-lang-btn', 'ଓଡ଼ିଆ');
      orBtn.type = 'button';
      orBtn.setAttribute('aria-pressed', String(isOr));
      orBtn.addEventListener('click', function () { store.lang = 'or'; persist(); render(); });
      langBox.appendChild(enBtn);
      langBox.appendChild(orBtn);
      head.appendChild(langBox);
      card.appendChild(head);

      // Track pills
      var tabs = el('div', 'cso-smt-tabs');
      tabs.setAttribute('role', 'group');
      tabs.setAttribute('aria-label', isOr ? 'ପରୀକ୍ଷା ପାଠ୍ୟକ୍ରମ ବାଛନ୍ତୁ' : 'Select exam syllabus');
      TRACK_KEYS.forEach(function (k) {
        var t = SYLLABI[k];
        var b = el('button', 'cso-smt-tab-btn', isOr ? t.or : t.en);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(k === store.track));
        b.addEventListener('click', function () { store.track = k; statusMsg = ''; persist(); render(); });
        tabs.appendChild(b);
      });
      card.appendChild(tabs);
      card.appendChild(el('p', 'cso-smt-papers', (isOr ? 'ପତ୍ର / ବିଷୟ: ' : 'Papers / Subjects: ') + (isOr ? track.papersOr : track.papersEn)));

      // KPIs
      var kpis = el('div', 'cso-smt-kpis');
      function kpi(label, val) {
        var k = el('div', 'cso-smt-kpi');
        k.appendChild(el('div', 'cso-smt-kpi-label', label));
        k.appendChild(el('div', 'cso-smt-kpi-val', val));
        return k;
      }
      kpis.appendChild(kpi(isOr ? 'ଓଜନ-ଭିତ୍ତିକ ଆୟତ୍ତ' : 'Weightage-Weighted Mastery', res.weightedMasteryPct + '%'));
      kpis.appendChild(kpi(isOr ? 'ଅଧ୍ୟାୟ ସମ୍ପୂର୍ଣ୍ଣ' : 'Chapter Completion', res.completionLabel));
      kpis.appendChild(kpi(isOr ? 'ପୁନରାବୃତ୍ତିରେ' : 'In Revision', String(res.inRevisionCount)));
      kpis.appendChild(kpi(isOr ? 'ଆରମ୍ଭ ହୋଇନାହିଁ' : 'Not Started', String(res.notStartedCount)));
      card.appendChild(kpis);

      var overall = el('div', 'cso-smt-overall');
      var track0 = el('div', 'cso-vfv-bar-track');
      track0.setAttribute('role', 'progressbar');
      track0.setAttribute('aria-valuemin', '0');
      track0.setAttribute('aria-valuemax', '100');
      track0.setAttribute('aria-valuenow', String(res.weightedMasteryPct));
      track0.setAttribute('aria-label', isOr ? 'ଓଜନ-ଭିତ୍ତିକ ପ୍ରସ୍ତୁତି' : 'Weightage-weighted readiness');
      track0.appendChild(el('div', 'cso-vfv-bar-fill ' + res.barClass));
      overall.appendChild(track0);
      card.appendChild(overall);

      // Weak topics
      var weakBox = el('div', 'cso-smt-weak');
      weakBox.appendChild(el('h3', 'cso-smt-weak-title', isOr ? 'ଶୀର୍ଷ 3 ଉଚ୍ଚ-ଓଜନ ଦୁର୍ବଳ ବିଷୟ ପୁନରାବୃତ୍ତି ସୁପାରିଶ' : 'Top 3 High-Weightage Weak-Topic Revision Recommendations'));
      if (!res.weakTopics.length) {
        weakBox.appendChild(el('p', 'cso-smt-weak-empty', isOr ? 'ସମସ୍ତ ଅଧ୍ୟାୟ ଆୟତ୍ତ! ମକ୍ ଟେଷ୍ଟ୍ ଅଭ୍ୟାସ ଜାରି ରଖନ୍ତୁ।' : 'All chapters mastered! Keep practising full-length mock tests.'));
      } else {
        var ol = el('ol', 'cso-smt-weak-list');
        res.weakTopics.forEach(function (w) {
          ol.appendChild(el('li', null, (isOr ? w.or : w.en) + ' — ' + w.weight + '% ' + (isOr ? 'ଓଜନ' : 'weightage') + ' · ' + (isOr ? STATUS_LABELS[w.status].or : w.status)));
        });
        weakBox.appendChild(ol);
      }
      card.appendChild(weakBox);

      // Chapter list
      var list = el('div', 'cso-smt-chapters');
      res.chapters.forEach(function (c) {
        var row = el('div', 'cso-smt-chapter cso-smt-chapter--' + (c.status === STATUS_MASTERED ? 'mastered' : (c.status === STATUS_IN_REVISION ? 'revision' : 'new')));
        var top = el('div', 'cso-smt-chapter-top');
        top.appendChild(el('span', 'cso-smt-chapter-name', isOr ? c.or : c.en));
        top.appendChild(el('span', 'cso-smt-chapter-weight', c.weight + '%'));
        row.appendChild(top);
        var wTrack = el('div', 'cso-vfv-bar-track');
        wTrack.appendChild(el('div', 'cso-vfv-bar-fill ' + barClassFor(Math.min(100, c.weight * 100 / 20))));
        row.appendChild(wTrack);
        var btns = el('div', 'cso-smt-status-group');
        btns.setAttribute('role', 'group');
        btns.setAttribute('aria-label', (isOr ? c.or : c.en));
        STATUSES.forEach(function (s) {
          var sb = el('button', 'cso-smt-status-btn', isOr ? STATUS_LABELS[s].or : STATUS_LABELS[s].en);
          sb.type = 'button';
          sb.setAttribute('data-status', s);
          sb.setAttribute('aria-pressed', String(c.status === s));
          sb.addEventListener('click', function () {
            var m = currentMap();
            if (s === STATUS_NOT_STARTED) delete m[c.id]; else m[c.id] = s;
            statusMsg = '';
            persist();
            render();
          });
          btns.appendChild(sb);
        });
        row.appendChild(btns);
        list.appendChild(row);
      });
      card.appendChild(list);

      // Actions
      var statusEl = el('p', 'cso-smt-status', statusMsg);
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
      var actions = el('div', 'cso-smt-actions');
      var copyBtn = el('button', 'cso-smt-btn cso-smt-btn--primary', isOr ? '📋 ଦୁର୍ବଳ ବିଷୟ ପୁନରାବୃତ୍ତି ଯୋଜନା କପି କରନ୍ତୁ' : '📋 Copy Weak-Topic Revision Plan');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        copyText(buildRevisionPlanText(store.track, currentMap(), store.lang), statusEl, isOr ? 'ପୁନରାବୃତ୍ତି ଯୋଜନା କପି ହୋଇଗଲା।' : 'Revision plan copied.');
      });
      var resetBtn = el('button', 'cso-smt-btn', isOr ? '↺ ଟ୍ରାକ୍ ପ୍ରଗତି ରିସେଟ୍ କରନ୍ତୁ' : '↺ Reset Track Progress');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        store.mastery[store.track] = {};
        statusMsg = isOr ? 'ଏହି ଟ୍ରାକ୍‌ର ପ୍ରଗତି ରିସେଟ୍ ହେଲା।' : 'Progress reset for this track.';
        persist();
        render();
      });
      var printBtn = el('button', 'cso-smt-btn', isOr ? '🖨️ ପାଠ୍ୟକ୍ରମ ଓ ଆୟତ୍ତ ଚେକ୍‌ଲିଷ୍ଟ ପ୍ରିଣ୍ଟ କରନ୍ତୁ' : '🖨️ Print Syllabus & Mastery Checklist');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(copyBtn);
      actions.appendChild(resetBtn);
      actions.appendChild(printBtn);
      card.appendChild(actions);
      card.appendChild(statusEl);
      card.appendChild(el('p', 'cso-smt-note', isOr ? 'ଓଜନ % ହେଉଛି ପୂର୍ବ ପ୍ରଶ୍ନପତ୍ର ବିଶ୍ଳେଷଣ ଆଧାରିତ ସାପେକ୍ଷିକ ଗୁରୁତ୍ୱ ସୂଚକ; ଚୂଡ଼ାନ୍ତ ପାଠ୍ୟକ୍ରମ ପାଇଁ ସର୍ବଦା ସରକାରୀ ବିଜ୍ଞପ୍ତି ଦେଖନ୍ତୁ।' : 'Weightage % is a relative importance indicator based on previous-year paper patterns; always confirm the final syllabus in the official recruitment notification.'));

      container.replaceChildren(card);
    }

    render();
    return {
      render: render,
      getState: function () { return JSON.parse(JSON.stringify(store)); }
    };
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
    STORE_KEY: STORE_KEY,
    STATUSES: STATUSES,
    TRACK_KEYS: TRACK_KEYS,
    SYLLABI: SYLLABI,
    computeSyllabusReadiness: computeSyllabusReadiness,
    buildRevisionPlanText: buildRevisionPlanText,
    buildChecklistText: buildChecklistText,
    barClassFor: barClassFor,
    mount: mount
  };
});
