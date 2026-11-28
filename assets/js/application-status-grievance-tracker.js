/**
 * Common Sense Odisha — Interactive Odisha Govt Recruitment Application Status,
 * Admit Card & Grievance Escalation Tracker (/jobs/ & /guides/, v449)
 * Local-first personal application ledger (localStorage: cso_personal_applications_ledger_v1),
 * official commission helpdesk directory, grievance escalation matrix and a 1-click formal
 * Representation / RTI (Section 6(1), RTI Act 2005) letter generator.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style
 * mutations; bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOApplicationGrievanceTracker = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOApplicationGrievanceTracker = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v449';
  var ROOT_ID = 'cso-application-grievance-root';
  var LEDGER_KEY = 'cso_personal_applications_ledger_v1';

  var BOARDS = ['OPSC', 'OSSC', 'OSSSC', 'OPRB', 'OAVS', 'SSB Odisha', 'RRB / SSC'];
  var STAGES = [
    'Applied & Fee Paid',
    'Admit Card Downloaded',
    'Written / CBT Appeared',
    'Answer Key Challenged',
    'Document Verification (DV)',
    'Final Selected'
  ];
  var STAGE_LABELS_OR = {
    'Applied & Fee Paid': 'ଆବେଦନ ଓ ଫି ଦିଆଯାଇଛି',
    'Admit Card Downloaded': 'ଆଡମିଟ୍ କାର୍ଡ ଡାଉନଲୋଡ୍',
    'Written / CBT Appeared': 'ଲିଖିତ / CBT ଦିଆଯାଇଛି',
    'Answer Key Challenged': 'ଉତ୍ତର ସୂଚୀ ଆପତ୍ତି',
    'Document Verification (DV)': 'ଦଲିଲ୍ ଯାଞ୍ଚ (DV)',
    'Final Selected': 'ଚୂଡ଼ାନ୍ତ ଚୟନ'
  };

  var DIRECTORY = {
    'OPSC': { key: 'OPSC', name: 'Odisha Public Service Commission', nameOr: 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ', website: 'opsconline.gov.in', phone: '0671-2304141', email: 'opsc@nic.in', spio: 'The State Public Information Officer, Odisha Public Service Commission, Cuttack' },
    'OSSC': { key: 'OSSC', name: 'Odisha Staff Selection Commission', nameOr: 'ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ', website: 'ossc.gov.in', phone: '0674-2394466', email: 'orissassc@gmail.com', spio: 'The State Public Information Officer, Odisha Staff Selection Commission, Bhubaneswar' },
    'OSSSC': { key: 'OSSSC', name: 'Odisha Subordinate Staff Selection Commission', nameOr: 'ଓଡ଼ିଶା ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ', website: 'osssc.gov.in', phone: '0674-2597149', email: 'helpdesk@osssc.gov.in', spio: 'The State Public Information Officer, Odisha Subordinate Staff Selection Commission, Bhubaneswar' },
    'OPRB': { key: 'OPRB', name: 'Odisha Police Recruitment Board (Odisha Police)', nameOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ ନିଯୁକ୍ତି ବୋର୍ଡ', website: 'odishapolice.gov.in', phone: '0671-2304001', email: '', spio: 'The State Public Information Officer, Odisha Police Recruitment Board, Cuttack' },
    'OAVS': { key: 'OAVS', name: 'Odisha Adarsha Vidyalaya Sangathan', nameOr: 'ଓଡ଼ିଶା ଆଦର୍ଶ ବିଦ୍ୟାଳୟ ସଂଗଠନ', website: 'oav.edu.in', phone: '0674-2303382', email: '', spio: 'The State Public Information Officer, Odisha Adarsha Vidyalaya Sangathan, Bhubaneswar' }
  };
  var DIRECTORY_KEYS = ['OPSC', 'OSSC', 'OSSSC', 'OPRB', 'OAVS'];

  var ESCALATION_PORTALS = [
    { key: 'jana-sunani', website: 'janasunani.odisha.gov.in', en: 'Odisha Jana Sunani — file an online public grievance with the Chief Minister’s Grievance Cell.', or: 'ଓଡ଼ିଶା ଜନ ସୁଣାଣି — ମୁଖ୍ୟମନ୍ତ୍ରୀଙ୍କ ଅଭିଯୋଗ ସେଲ୍‌ରେ ଅନଲାଇନ୍ ଅଭିଯୋଗ ଦାଖଲ କରନ୍ତୁ।' },
    { key: 'rti-odisha', website: 'rtiodisha.gov.in', en: 'RTI Odisha — file an online RTI application and track first-appeal status.', or: 'RTI ଓଡ଼ିଶା — ଅନଲାଇନ୍ RTI ଆବେଦନ ଦାଖଲ ଓ ପ୍ରଥମ ଆପିଲ୍ ସ୍ଥିତି ଟ୍ରାକ୍ କରନ୍ତୁ।' }
  ];

  var ESCALATION_STEPS = [
    { en: 'Step 1 — Helpdesk: email / call the commission helpdesk with your Application No., Roll No. and screenshots.', or: 'ପଦକ୍ଷେପ 1 — ହେଲ୍ପଡେସ୍କ: ଆବେଦନ ନମ୍ବର, ରୋଲ୍ ନମ୍ବର ଓ ସ୍କ୍ରିନସଟ୍ ସହ ଇମେଲ୍ / ଫୋନ୍ କରନ୍ତୁ।' },
    { en: 'Step 2 — Formal Representation: send the generated letter to the Secretary / Controller of Examinations by post and email; keep the receipt.', or: 'ପଦକ୍ଷେପ 2 — ଆନୁଷ୍ଠାନିକ ପ୍ରତିନିଧିତ୍ୱ: ସଚିବ / ପରୀକ୍ଷା ନିୟନ୍ତ୍ରକଙ୍କୁ ଡାକ ଓ ଇମେଲ୍‌ରେ ପଠାନ୍ତୁ; ରସିଦ ରଖନ୍ତୁ।' },
    { en: 'Step 3 — Odisha Jana Sunani: lodge a grievance if there is no reply in 15–30 days.', or: 'ପଦକ୍ଷେପ 3 — ଜନ ସୁଣାଣି: 15–30 ଦିନରେ ଉତ୍ତର ନ ମିଳିଲେ ଅଭିଯୋଗ କରନ୍ତୁ।' },
    { en: 'Step 4 — RTI: seek marksheet, cut-off, OMR copy or file notings under Section 6(1) of the RTI Act, 2005; appeal to the First Appellate Authority within 30 days if unsatisfied.', or: 'ପଦକ୍ଷେପ 4 — RTI: RTI ଆଇନ 2005 ଧାରା 6(1) ଅଧୀନରେ ମାର୍କସିଟ୍, କଟ୍-ଅଫ୍, OMR କପି ମାଗନ୍ତୁ; ଅସନ୍ତୁଷ୍ଟ ହେଲେ 30 ଦିନ ମଧ୍ୟରେ ପ୍ରଥମ ଆପିଲ୍ କରନ୍ତୁ।' }
  ];

  var REPRESENTATION_TYPES = {
    'admit-card': { en: 'Admit Card Discrepancy', or: 'ଆଡମିଟ୍ କାର୍ଡ ଭୁଲ' },
    'answer-key': { en: 'Answer Key Objection Follow-up', or: 'ଉତ୍ତର ସୂଚୀ ଆପତ୍ତି ଅନୁସରଣ' },
    'category-pwbd': { en: 'Category / PwBD Correction', or: 'ବର୍ଗ / PwBD ସଂଶୋଧନ' },
    'rti': { en: 'RTI — Marksheet / Cut-off Request', or: 'RTI — ମାର୍କସିଟ୍ / କଟ୍-ଅଫ୍ ଅନୁରୋଧ' }
  };
  var REPRESENTATION_KEYS = ['admit-card', 'answer-key', 'category-pwbd', 'rti'];

  var STAGE_RANK = {};
  STAGES.forEach(function (s, i) { STAGE_RANK[s] = i; });

  function todayIso() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function cleanText(v, max) {
    return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 200);
  }

  function normalizeDate(v) {
    var s = cleanText(v, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }

  function normalizeEntry(e) {
    var src = e || {};
    return {
      id: cleanText(src.id, 60),
      title: cleanText(src.title, 160) || 'Untitled Application',
      board: BOARDS.indexOf(src.board) !== -1 ? src.board : 'OSSC',
      appNo: cleanText(src.appNo, 60),
      rollNo: cleanText(src.rollNo, 60),
      examDate: normalizeDate(src.examDate),
      stage: STAGES.indexOf(src.stage) !== -1 ? src.stage : STAGES[0],
      notes: cleanText(src.notes, 500),
      sample: Boolean(src.sample),
      updatedAt: src.updatedAt || ''
    };
  }

  var idCounter = 0;
  function newId() {
    idCounter += 1;
    return 'app-' + Date.now().toString(36) + '-' + idCounter + '-' + Math.floor(Math.random() * 1e4).toString(36);
  }

  /** Pure function: returns a NEW ledger array with the entry inserted or updated by id. */
  function upsertApplicationEntry(ledger, entry) {
    var list = Array.isArray(ledger) ? ledger.map(normalizeEntry).map(function (x, i) { return Object.assign(x, { id: x.id || ('legacy-' + i) }); }) : [];
    var next = normalizeEntry(entry);
    next.sample = false;
    next.updatedAt = new Date().toISOString();
    if (!next.id) {
      next.id = newId();
      list.push(next);
      return list;
    }
    var idx = -1;
    list.forEach(function (x, i) { if (x.id === next.id) idx = i; });
    if (idx === -1) list.push(next);
    else {
      // preserve sample flag false once edited
      list[idx] = next;
    }
    return list;
  }

  function removeApplicationEntry(ledger, id) {
    return (Array.isArray(ledger) ? ledger : []).filter(function (x) { return x.id !== id; });
  }

  function summarizeApplicationLedger(ledger, today) {
    var list = Array.isArray(ledger) ? ledger : [];
    var now = normalizeDate(today) || todayIso();
    var byStage = {};
    STAGES.forEach(function (s) { byStage[s] = 0; });
    var byBoard = {};
    var upcoming = 0;
    var dvFinal = 0;
    var next = null;
    list.forEach(function (e) {
      var stage = STAGES.indexOf(e.stage) !== -1 ? e.stage : STAGES[0];
      byStage[stage] += 1;
      byBoard[e.board] = (byBoard[e.board] || 0) + 1;
      if (stage === 'Document Verification (DV)' || stage === 'Final Selected') dvFinal += 1;
      var upcomingStage = STAGE_RANK[stage] < STAGE_RANK['Written / CBT Appeared'];
      if (e.examDate && e.examDate >= now && upcomingStage) {
        upcoming += 1;
        if (!next || e.examDate < next.examDate) next = e;
      }
    });
    return {
      total: list.length,
      upcoming: upcoming,
      dvFinal: dvFinal,
      byStage: byStage,
      byBoard: byBoard,
      nextExam: next ? { id: next.id, title: next.title, board: next.board, examDate: next.examDate } : null
    };
  }

  function sampleLedger() {
    return [
      { id: 'sample-ossc-cgl', title: 'Sample: OSSC CGLRE Combined Graduate Level Exam', board: 'OSSC', appNo: 'SAMPLE-0001', rollNo: '', examDate: '2027-03-14', stage: 'Applied & Fee Paid', notes: 'Sample placeholder — edit or clear.', sample: true },
      { id: 'sample-osssc-ri', title: 'Sample: OSSSC RI / ARI / Amin Combined Cadre', board: 'OSSSC', appNo: 'SAMPLE-0002', rollNo: 'SAMPLE-ROLL-77', examDate: '2027-01-24', stage: 'Admit Card Downloaded', notes: 'Sample placeholder — edit or clear.', sample: true }
    ].map(normalizeEntry);
  }

  function loadLedger() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(LEDGER_KEY);
      if (raw === null || raw === undefined) return sampleLedger();
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return sampleLedger();
      return parsed.map(normalizeEntry).map(function (x, i) { return x.id ? x : Object.assign(x, { id: 'legacy-' + i }); });
    } catch (_) {
      return sampleLedger();
    }
  }

  function saveLedger(ledger) {
    try {
      if (win.localStorage) win.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
    } catch (_) {}
  }

  function formatLongDate(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ' ' + m[1];
  }

  /** Formal Representation / RTI letter generator. */
  function generateCommissionRepresentation(params) {
    var p = params || {};
    var board = DIRECTORY[p.board] || DIRECTORY.OSSC;
    var type = REPRESENTATION_TYPES[p.type] ? p.type : 'admit-card';
    var name = cleanText(p.name, 100) || '[Candidate Name]';
    var post = cleanText(p.post, 160) || '[Exam / Post Title]';
    var appNo = cleanText(p.appNo, 60) || '[Application No.]';
    var rollNo = cleanText(p.rollNo, 60) || '[Roll No.]';
    var details = cleanText(p.details, 800);
    var address = cleanText(p.address, 240) || '[Postal Address with PIN]';
    var dateText = formatLongDate(normalizeDate(p.date)) || formatLongDate(todayIso());
    var L = [];

    L.push('Date: ' + dateText);
    L.push('');
    L.push('To,');
    if (type === 'rti') {
      L.push(board.spio);
    } else {
      L.push('The Secretary / Controller of Examinations,');
      L.push(board.name + ',');
      L.push('Odisha');
    }
    L.push('');
    var subjects = {
      'admit-card': 'Subject: Representation for correction of discrepancy in Admit Card — ' + post,
      'answer-key': 'Subject: Follow-up representation on Answer Key objection — ' + post,
      'category-pwbd': 'Subject: Representation for correction of Category / PwBD status — ' + post,
      'rti': 'Subject: Application under Section 6(1) of the Right to Information Act, 2005 — ' + post
    };
    L.push(subjects[type]);
    L.push('');
    L.push('Candidate: ' + name + ' | Application / Registration No.: ' + appNo + ' | Roll No.: ' + rollNo);
    L.push('');
    L.push(type === 'rti' ? 'Sir / Madam,' : 'Respected Sir / Madam,');
    L.push('');
    if (type === 'admit-card') {
      L.push('I, ' + name + ', applied for ' + post + ' (Application No. ' + appNo + '). On downloading my Admit Card (Roll No. ' + rollNo + '), I noticed a discrepancy as follows: ' + (details || '[describe the error — name / photo / signature / date of birth / category / exam centre]') + '.');
      L.push('I request you to kindly get the Admit Card corrected and permit me to appear in the examination. I am enclosing a copy of my application form and identity documents for verification.');
    } else if (type === 'answer-key') {
      L.push('I, ' + name + ', appeared for ' + post + ' (Roll No. ' + rollNo + ') and had submitted an objection against the provisional Answer Key. My objection concerns: ' + (details || '[question no. / set / correct option with source reference]') + '.');
      L.push('I request you to kindly examine my objection with the subject experts and ensure that the final Answer Key and result are prepared accordingly.');
    } else if (type === 'category-pwbd') {
      L.push('I, ' + name + ', applied for ' + post + ' (Application No. ' + appNo + '). My Category / PwBD status has been recorded incorrectly: ' + (details || '[state the recorded value and the correct value with certificate number and issuing authority]') + '.');
      L.push('I request you to kindly correct my Category / PwBD status in the commission’s records after verifying the enclosed certificate.');
    } else {
      L.push('Under Section 6(1) of the Right to Information Act, 2005, I request the following information regarding ' + post + ' (Application No. ' + appNo + ', Roll No. ' + rollNo + '):');
      L.push('1. A certified copy of my marksheet / section-wise marks obtained.');
      L.push('2. The category-wise cut-off marks for each stage of selection.');
      L.push('3. ' + (details || 'A copy of my OMR sheet / evaluated answer script and the final Answer Key with the file notings on disposal of objections.'));
      L.push('');
      L.push('I am enclosing the application fee of ₹10 by Indian Postal Order / Treasury Challan under head 0070-60-800 (Other Administrative Services — Fees under RTI Act). I state that I am a citizen of India and that the information sought does not fall within the exemptions of Section 8 of the Act.');
    }
    L.push('');
    L.push('Thanking you,');
    L.push('Yours faithfully,');
    L.push(name);
    L.push('Address: ' + address);
    L.push('Enclosures: Application copy, Admit Card / ID proof' + (type === 'rti' ? ', IPO / Treasury Challan (₹10)' : ''));
    return L.join('\n');
  }

  function buildSummaryText(ledger, lang, today) {
    var isOr = lang === 'or';
    var s = summarizeApplicationLedger(ledger, today);
    var lines = [isOr ? 'ମୋର ଆବେଦନ ସାରାଂଶ — csodisha.com' : 'My Recruitment Application Summary — csodisha.com'];
    lines.push((isOr ? 'ମୋଟ ଆବେଦନ: ' : 'Total Applied: ') + s.total + ' | ' + (isOr ? 'ଆଗାମୀ ପରୀକ୍ଷା: ' : 'Upcoming Exams: ') + s.upcoming + ' | ' + (isOr ? 'DV / ଚୂଡ଼ାନ୍ତ: ' : 'DV / Final Stage: ') + s.dvFinal);
    (Array.isArray(ledger) ? ledger : []).forEach(function (e, i) {
      lines.push((i + 1) + '. [' + e.board + '] ' + e.title + ' — ' + (isOr ? STAGE_LABELS_OR[e.stage] : e.stage) + (e.examDate ? ' (' + e.examDate + ')' : ''));
    });
    return lines.join('\n');
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

  function downloadText(text, filename, mime) {
    try {
      var blob = new win.Blob([text], { type: mime });
      var url = win.URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      setTimeout(function () { win.URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch (_) {
      return false;
    }
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = {
      lang: 'en',
      filter: 'all',
      ledger: loadLedger(),
      editId: '',
      letter: { type: 'admit-card', board: 'OSSC', name: '', post: '', appNo: '', rollNo: '', details: '', address: '' },
      letterText: ''
    };
    try {
      var langPref = win.localStorage && win.localStorage.getItem(LEDGER_KEY + '_lang');
      if (langPref === 'or') state.lang = 'or';
    } catch (_) {}
    var statusMsg = '';

    function persist() { saveLedger(state.ledger); }
    function setLang(l) {
      state.lang = l;
      try { if (win.localStorage) win.localStorage.setItem(LEDGER_KEY + '_lang', l); } catch (_) {}
      render();
    }

    function render() {
      var isOr = state.lang === 'or';
      var summary = summarizeApplicationLedger(state.ledger);
      var card = el('div', 'cso-agt-card');

      var head = el('div', 'cso-agt-head');
      var hLeft = el('div');
      hLeft.appendChild(el('p', 'cso-agt-eyebrow', isOr ? 'ଆବେଦନ ସ୍ଥିତି, ଆଡମିଟ୍ କାର୍ଡ ଓ ଅଭିଯୋଗ • v449' : 'APPLICATION STATUS, ADMIT CARD & GRIEVANCE • v449'));
      hLeft.appendChild(el('h2', 'cso-agt-title', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ଆବେଦନ ସ୍ଥିତି ଓ ଅଭିଯୋଗ ବୃଦ୍ଧି ଟ୍ରାକର୍' : 'Odisha Govt Recruitment Application Status & Grievance Escalation Tracker'));
      hLeft.appendChild(el('p', 'cso-agt-sub', isOr ? 'ଆପଣଙ୍କ ବ୍ୟକ୍ତିଗତ ଆବେଦନ ଲେଜର୍ କେବଳ ଆପଣଙ୍କ ଡିଭାଇସ୍‌ରେ ସଞ୍ଚିତ — କୌଣସି ସର୍ଭରକୁ ପଠାଯାଏ ନାହିଁ।' : 'Your personal application ledger is stored only on this device — nothing is uploaded to any server.'));
      head.appendChild(hLeft);
      var langBox = el('div', 'cso-agt-lang-toggle');
      var enBtn = el('button', 'cso-agt-lang-btn', 'English');
      enBtn.type = 'button';
      enBtn.setAttribute('aria-pressed', String(!isOr));
      enBtn.addEventListener('click', function () { setLang('en'); });
      var orBtn = el('button', 'cso-agt-lang-btn', 'ଓଡ଼ିଆ');
      orBtn.type = 'button';
      orBtn.setAttribute('aria-pressed', String(isOr));
      orBtn.addEventListener('click', function () { setLang('or'); });
      langBox.appendChild(enBtn);
      langBox.appendChild(orBtn);
      head.appendChild(langBox);
      card.appendChild(head);

      // KPIs
      var kpis = el('div', 'cso-agt-kpis');
      function kpi(label, val) {
        var k = el('div', 'cso-agt-kpi');
        k.appendChild(el('div', 'cso-agt-kpi-label', label));
        k.appendChild(el('div', 'cso-agt-kpi-val', val));
        return k;
      }
      kpis.appendChild(kpi(isOr ? 'ମୋଟ ଆବେଦନ' : 'Total Applied', String(summary.total)));
      kpis.appendChild(kpi(isOr ? 'ଆଗାମୀ ପରୀକ୍ଷା' : 'Upcoming Exams', String(summary.upcoming)));
      kpis.appendChild(kpi(isOr ? 'DV / ଚୂଡ଼ାନ୍ତ ପର୍ଯ୍ୟାୟ' : 'DV / Final Stage', String(summary.dvFinal)));
      card.appendChild(kpis);

      // Filter pills
      var pills = el('div', 'cso-agt-tabs');
      pills.setAttribute('role', 'group');
      pills.setAttribute('aria-label', isOr ? 'ସ୍ଥିତି ଫିଲ୍ଟର୍' : 'Stage filter');
      var allBtn = el('button', 'cso-agt-tab-btn', (isOr ? 'ସମସ୍ତ' : 'All') + ' (' + summary.total + ')');
      allBtn.type = 'button';
      allBtn.setAttribute('aria-pressed', String(state.filter === 'all'));
      allBtn.addEventListener('click', function () { state.filter = 'all'; render(); });
      pills.appendChild(allBtn);
      STAGES.forEach(function (s) {
        var b = el('button', 'cso-agt-tab-btn', (isOr ? STAGE_LABELS_OR[s] : s) + ' (' + summary.byStage[s] + ')');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(state.filter === s));
        b.addEventListener('click', function () { state.filter = s; render(); });
        pills.appendChild(b);
      });
      card.appendChild(pills);

      // Ledger rows
      var visible = state.ledger.filter(function (e) { return state.filter === 'all' || e.stage === state.filter; });
      var listBox = el('div', 'cso-agt-list');
      if (!visible.length) {
        listBox.appendChild(el('p', 'cso-agt-empty', isOr ? 'କୌଣସି ଆବେଦନ ରେକର୍ଡ ନାହିଁ। ତଳେ ଯୋଗ କରନ୍ତୁ।' : 'No application records here yet. Add one below.'));
      }
      visible.forEach(function (e) {
        var row = el('div', 'cso-agt-row' + (e.sample ? ' cso-agt-row--sample' : ''));
        var top = el('div', 'cso-agt-row-top');
        top.appendChild(el('span', 'cso-agt-badge', e.board));
        top.appendChild(el('strong', 'cso-agt-row-title', e.title));
        row.appendChild(top);
        var meta = [];
        if (e.appNo) meta.push((isOr ? 'ଆବେଦନ ନଂ: ' : 'App No: ') + e.appNo);
        if (e.rollNo) meta.push((isOr ? 'ରୋଲ୍ ନଂ: ' : 'Roll No: ') + e.rollNo);
        if (e.examDate) meta.push((isOr ? 'ତାରିଖ: ' : 'Date: ') + e.examDate);
        if (meta.length) row.appendChild(el('p', 'cso-agt-row-meta', meta.join(' • ')));
        if (e.notes) row.appendChild(el('p', 'cso-agt-row-notes', e.notes));

        var ctl = el('div', 'cso-agt-row-actions');
        var sel = el('select', 'cso-agt-select');
        sel.setAttribute('aria-label', (isOr ? 'ସ୍ଥିତି: ' : 'Stage: ') + e.title);
        STAGES.forEach(function (s) {
          var opt = el('option', null, isOr ? STAGE_LABELS_OR[s] : s);
          opt.value = s;
          if (e.stage === s) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', function () {
          state.ledger = upsertApplicationEntry(state.ledger, Object.assign({}, e, { stage: sel.value }));
          persist();
          render();
        });
        ctl.appendChild(sel);

        var icsBtn = el('button', 'cso-agt-btn', isOr ? '📅 ପରୀକ୍ଷା ତାରିଖ (.ics)' : '📅 Export Exam Date (.ics)');
        icsBtn.type = 'button';
        icsBtn.disabled = !e.examDate;
        icsBtn.addEventListener('click', function () {
          var cal = win.CSOCalendarExport;
          if (cal && typeof cal.downloadSingleEvent === 'function' && e.examDate) {
            var ok = cal.downloadSingleEvent({
              uid: 'cso-app-' + e.id,
              date: e.examDate,
              summary: e.board + ' — ' + e.title,
              description: (e.appNo ? 'Application No: ' + e.appNo + '. ' : '') + (e.rollNo ? 'Roll No: ' + e.rollNo + '. ' : '') + 'Stage: ' + e.stage,
              url: 'https://csodisha.com/jobs/'
            }, 'cso-exam-' + e.board.toLowerCase().replace(/[^a-z0-9]+/g, '-'), icsBtn, isOr);
            statusMsg = ok ? (isOr ? '.ics ଫାଇଲ୍ ଡାଉନଲୋଡ୍ ହେଲା।' : 'Calendar (.ics) file downloaded.') : (isOr ? 'ତାରିଖ ବୈଧ ନୁହେଁ।' : 'Exam date is not valid for calendar export.');
          } else {
            statusMsg = isOr ? 'କ୍ୟାଲେଣ୍ଡର୍ ମଡ୍ୟୁଲ୍ ଉପଲବ୍ଧ ନୁହେଁ।' : 'Calendar export module is unavailable.';
          }
          statusEl.textContent = statusMsg;
        });
        ctl.appendChild(icsBtn);

        var editBtn = el('button', 'cso-agt-btn', isOr ? '✏️ ସମ୍ପାଦନ' : '✏️ Edit');
        editBtn.type = 'button';
        editBtn.addEventListener('click', function () { state.editId = e.id; render(); });
        ctl.appendChild(editBtn);

        var delBtn = el('button', 'cso-agt-btn', isOr ? '🗑️ ହଟାନ୍ତୁ' : '🗑️ Remove');
        delBtn.type = 'button';
        delBtn.addEventListener('click', function () {
          state.ledger = removeApplicationEntry(state.ledger, e.id);
          if (state.editId === e.id) state.editId = '';
          persist();
          render();
        });
        ctl.appendChild(delBtn);
        row.appendChild(ctl);
        listBox.appendChild(row);
      });
      card.appendChild(listBox);

      // Add / edit form
      var editing = null;
      state.ledger.forEach(function (x) { if (x.id === state.editId) editing = x; });
      var form = el('div', 'cso-agt-form');
      form.appendChild(el('h3', 'cso-agt-section', editing ? (isOr ? 'ଆବେଦନ ରେକର୍ଡ ସମ୍ପାଦନ' : 'Edit Application Record') : (isOr ? 'ଆବେଦନ ରେକର୍ଡ ଯୋଗ କରନ୍ତୁ' : 'Add Application Record')));
      var grid = el('div', 'cso-agt-grid');
      var inputs = {};
      function addField(key, labelText, type, def) {
        var f = el('div', 'cso-agt-field');
        var id = 'cso-agt-f-' + key;
        var lab = el('label', null, labelText);
        lab.setAttribute('for', id);
        var inp = el('input', 'cso-agt-input');
        inp.id = id;
        inp.type = type;
        inp.value = def || '';
        f.appendChild(lab);
        f.appendChild(inp);
        grid.appendChild(f);
        inputs[key] = inp;
      }
      function addSelect(key, labelText, options, def, labeler) {
        var f = el('div', 'cso-agt-field');
        var id = 'cso-agt-f-' + key;
        var lab = el('label', null, labelText);
        lab.setAttribute('for', id);
        var sel = el('select', 'cso-agt-select');
        sel.id = id;
        options.forEach(function (o) {
          var opt = el('option', null, labeler ? labeler(o) : o);
          opt.value = o;
          if (o === def) opt.selected = true;
          sel.appendChild(opt);
        });
        f.appendChild(lab);
        f.appendChild(sel);
        grid.appendChild(f);
        inputs[key] = sel;
      }
      var cur = editing || { title: '', board: 'OSSC', appNo: '', rollNo: '', examDate: '', stage: STAGES[0], notes: '' };
      addField('title', isOr ? 'ପରୀକ୍ଷା / ପଦ ଶୀର୍ଷକ' : 'Exam / Post Title', 'text', cur.title);
      addSelect('board', isOr ? 'ନିଯୁକ୍ତି ବୋର୍ଡ' : 'Recruiting Board', BOARDS, cur.board);
      addField('appNo', isOr ? 'ଆବେଦନ / ପଞ୍ଜୀକରଣ ନଂ.' : 'Application / Registration No.', 'text', cur.appNo);
      addField('rollNo', isOr ? 'ପରୀକ୍ଷା ରୋଲ୍ ନଂ.' : 'Exam Roll No.', 'text', cur.rollNo);
      addField('examDate', isOr ? 'ପରୀକ୍ଷା / ସାକ୍ଷାତକାର ତାରିଖ' : 'Exam / Interview Date', 'date', cur.examDate);
      addSelect('stage', isOr ? 'ପର୍ଯ୍ୟାୟ ସ୍ଥିତି' : 'Stage Status', STAGES, cur.stage, function (s) { return isOr ? STAGE_LABELS_OR[s] : s; });
      addField('notes', isOr ? 'ଟିପ୍ପଣୀ' : 'Notes', 'text', cur.notes);
      form.appendChild(grid);

      var formActions = el('div', 'cso-agt-actions');
      var saveBtn = el('button', 'cso-agt-btn cso-agt-btn--primary', editing ? (isOr ? '💾 ପରିବର୍ତ୍ତନ ସଞ୍ଚୟ' : '💾 Save Changes') : (isOr ? '➕ ଆବେଦନ ରେକର୍ଡ ଯୋଗ କରନ୍ତୁ' : '➕ Add Application Record'));
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', function () {
        var entry = {
          id: editing ? editing.id : '',
          title: inputs.title.value,
          board: inputs.board.value,
          appNo: inputs.appNo.value,
          rollNo: inputs.rollNo.value,
          examDate: inputs.examDate.value,
          stage: inputs.stage.value,
          notes: inputs.notes.value
        };
        if (!cleanText(entry.title, 160)) {
          statusEl.textContent = isOr ? 'ଦୟାକରି ପରୀକ୍ଷା / ପଦ ଶୀର୍ଷକ ଦିଅନ୍ତୁ।' : 'Please enter the Exam / Post Title.';
          return;
        }
        state.ledger = upsertApplicationEntry(state.ledger, entry);
        state.editId = '';
        statusMsg = isOr ? 'ରେକର୍ଡ ସଞ୍ଚିତ ହେଲା।' : 'Record saved.';
        persist();
        render();
      });
      formActions.appendChild(saveBtn);
      if (editing) {
        var cancelBtn = el('button', 'cso-agt-btn', isOr ? 'ବାତିଲ୍' : 'Cancel');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', function () { state.editId = ''; render(); });
        formActions.appendChild(cancelBtn);
      }
      var clearSamples = el('button', 'cso-agt-btn', isOr ? '🧹 ନମୁନା ରେକର୍ଡ ସଫା କରନ୍ତୁ' : '🧹 Clear Sample Entries');
      clearSamples.type = 'button';
      clearSamples.addEventListener('click', function () {
        state.ledger = state.ledger.filter(function (x) { return !x.sample; });
        statusMsg = isOr ? 'ନମୁନା ରେକର୍ଡ ହଟାଗଲା।' : 'Sample entries cleared.';
        persist();
        render();
      });
      formActions.appendChild(clearSamples);
      form.appendChild(formActions);
      card.appendChild(form);

      // Ledger actions
      var statusEl = el('p', 'cso-agt-status', statusMsg);
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
      var actions = el('div', 'cso-agt-actions');
      var jsonBtn = el('button', 'cso-agt-btn', isOr ? '📥 ଲେଜର୍ JSON ଏକ୍ସପୋର୍ଟ' : '📥 Export Ledger JSON');
      jsonBtn.type = 'button';
      jsonBtn.addEventListener('click', function () {
        var ok = downloadText(JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), applications: state.ledger }, null, 2), 'cso-application-ledger.json', 'application/json');
        statusEl.textContent = ok ? (isOr ? 'JSON ଡାଉନଲୋଡ୍ ହେଲା।' : 'Ledger JSON downloaded.') : (isOr ? 'ଡାଉନଲୋଡ୍ ଅସଫଳ।' : 'Download failed.');
      });
      var copyBtn = el('button', 'cso-agt-btn', isOr ? '📋 ଆବେଦନ ସାରାଂଶ କପି କରନ୍ତୁ' : '📋 Copy Application Summary');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        copyText(buildSummaryText(state.ledger, state.lang), statusEl, isOr ? 'ସାରାଂଶ କପି ହୋଇଗଲା।' : 'Summary copied.');
      });
      var printBtn = el('button', 'cso-agt-btn', isOr ? '🖨️ ବ୍ୟକ୍ତିଗତ ଆବେଦନ ଲଗ୍ ପ୍ରିଣ୍ଟ କରନ୍ତୁ' : '🖨️ Print Personal Application Log');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(jsonBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(printBtn);
      card.appendChild(actions);
      card.appendChild(statusEl);

      // Escalation matrix
      card.appendChild(el('h3', 'cso-agt-section', isOr ? 'ଅଭିଯୋଗ ବୃଦ୍ଧି ମାଟ୍ରିକ୍ସ — ଅଫିସିଆଲ୍ ହେଲ୍ପଡେସ୍କ' : 'Grievance Escalation Matrix — Official Helpdesks'));
      var tblWrap = el('div', 'cso-agt-table-wrap');
      var tbl = el('table', 'cso-agt-table');
      var thead = el('thead');
      var hr = el('tr');
      [isOr ? 'ଆୟୋଗ' : 'Commission', isOr ? 'ୱେବସାଇଟ୍' : 'Website', isOr ? 'ଫୋନ୍' : 'Phone', isOr ? 'ଇମେଲ୍' : 'Email'].forEach(function (h) {
        var th = el('th', null, h);
        th.setAttribute('scope', 'col');
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      tbl.appendChild(thead);
      var tbody = el('tbody');
      DIRECTORY_KEYS.forEach(function (k) {
        var d = DIRECTORY[k];
        var tr = el('tr');
        tr.appendChild(el('td', null, k + ' — ' + (isOr ? d.nameOr : d.name)));
        var tdW = el('td');
        var a = el('a', 'cso-agt-link', d.website);
        a.href = 'https://' + d.website + '/';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        tdW.appendChild(a);
        tr.appendChild(tdW);
        tr.appendChild(el('td', null, d.phone));
        tr.appendChild(el('td', null, d.email || '—'));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tblWrap.appendChild(tbl);
      card.appendChild(tblWrap);

      var portals = el('ul', 'cso-agt-steps');
      ESCALATION_PORTALS.forEach(function (pt) {
        var li = el('li');
        var a2 = el('a', 'cso-agt-link', pt.website);
        a2.href = 'https://' + pt.website + '/';
        a2.target = '_blank';
        a2.rel = 'noopener noreferrer';
        li.appendChild(a2);
        li.appendChild(doc.createTextNode(' — ' + (isOr ? pt.or : pt.en)));
        portals.appendChild(li);
      });
      card.appendChild(portals);
      var steps = el('ol', 'cso-agt-steps');
      ESCALATION_STEPS.forEach(function (s) { steps.appendChild(el('li', null, isOr ? s.or : s.en)); });
      card.appendChild(steps);

      // Letter composer
      card.appendChild(el('h3', 'cso-agt-section', isOr ? 'ଆନୁଷ୍ଠାନିକ ପ୍ରତିନିଧିତ୍ୱ / RTI ଆବେଦନ ଜେନେରେଟର୍' : 'Formal Representation / RTI Application Generator'));
      var lGrid = el('div', 'cso-agt-grid');
      var lIn = {};
      function lSelect(key, labelText, keys, labeler) {
        var f = el('div', 'cso-agt-field');
        var id = 'cso-agt-l-' + key;
        var lab = el('label', null, labelText);
        lab.setAttribute('for', id);
        var sel = el('select', 'cso-agt-select');
        sel.id = id;
        keys.forEach(function (k) {
          var opt = el('option', null, labeler(k));
          opt.value = k;
          if (state.letter[key] === k) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', function () { state.letter[key] = sel.value; });
        f.appendChild(lab);
        f.appendChild(sel);
        lGrid.appendChild(f);
        lIn[key] = sel;
      }
      function lField(key, labelText) {
        var f = el('div', 'cso-agt-field');
        var id = 'cso-agt-l-' + key;
        var lab = el('label', null, labelText);
        lab.setAttribute('for', id);
        var inp = el('input', 'cso-agt-input');
        inp.id = id;
        inp.type = 'text';
        inp.value = state.letter[key];
        inp.addEventListener('input', function () { state.letter[key] = inp.value; });
        f.appendChild(lab);
        f.appendChild(inp);
        lGrid.appendChild(f);
        lIn[key] = inp;
      }
      lSelect('type', isOr ? 'ପ୍ରତିନିଧିତ୍ୱ ପ୍ରକାର' : 'Representation Type', REPRESENTATION_KEYS, function (k) { return isOr ? REPRESENTATION_TYPES[k].or : REPRESENTATION_TYPES[k].en; });
      lSelect('board', isOr ? 'ଆୟୋଗ' : 'Commission', DIRECTORY_KEYS, function (k) { return k + ' — ' + (isOr ? DIRECTORY[k].nameOr : DIRECTORY[k].name); });
      lField('name', isOr ? 'ଆପଣଙ୍କ ନାମ' : 'Your Name');
      lField('post', isOr ? 'ପରୀକ୍ଷା / ପଦ' : 'Exam / Post');
      lField('appNo', isOr ? 'ଆବେଦନ ନଂ.' : 'Application No.');
      lField('rollNo', isOr ? 'ରୋଲ୍ ନଂ.' : 'Roll No.');
      lField('details', isOr ? 'ବିବରଣୀ (ଭୁଲ / ପ୍ରଶ୍ନ ନଂ. / ଅନୁରୋଧିତ ତଥ୍ୟ)' : 'Details (error / question no. / information sought)');
      lField('address', isOr ? 'ଡାକ ଠିକଣା' : 'Postal Address');
      card.appendChild(lGrid);

      var letterOut = el('pre', 'cso-agt-letter', state.letterText);
      letterOut.setAttribute('aria-label', isOr ? 'ଜେନେରେଟ୍ ହୋଇଥିବା ପତ୍ର' : 'Generated letter');
      var lActions = el('div', 'cso-agt-actions');
      var genBtn = el('button', 'cso-agt-btn cso-agt-btn--primary', isOr ? '✍️ ପତ୍ର ତିଆରି କରନ୍ତୁ' : '✍️ Generate Letter');
      genBtn.type = 'button';
      genBtn.addEventListener('click', function () {
        state.letterText = generateCommissionRepresentation(state.letter);
        letterOut.textContent = state.letterText;
        statusEl.textContent = isOr ? 'ପତ୍ର ପ୍ରସ୍ତୁତ।' : 'Letter generated.';
      });
      var copyLetter = el('button', 'cso-agt-btn', isOr ? '📋 ପତ୍ର କପି କରନ୍ତୁ' : '📋 Copy Letter');
      copyLetter.type = 'button';
      copyLetter.addEventListener('click', function () {
        if (!state.letterText) state.letterText = generateCommissionRepresentation(state.letter);
        letterOut.textContent = state.letterText;
        copyText(state.letterText, statusEl, isOr ? 'ପତ୍ର କପି ହୋଇଗଲା।' : 'Letter copied.');
      });
      var printLetter = el('button', 'cso-agt-btn', isOr ? '🖨️ ପତ୍ର ପ୍ରିଣ୍ଟ କରନ୍ତୁ' : '🖨️ Print Letter');
      printLetter.type = 'button';
      printLetter.addEventListener('click', function () {
        if (!state.letterText) { state.letterText = generateCommissionRepresentation(state.letter); letterOut.textContent = state.letterText; }
        if (typeof win.print === 'function') win.print();
      });
      lActions.appendChild(genBtn);
      lActions.appendChild(copyLetter);
      lActions.appendChild(printLetter);
      card.appendChild(lActions);
      card.appendChild(letterOut);
      card.appendChild(el('p', 'cso-agt-note', isOr ? 'ଯୋଗାଯୋଗ ବିବରଣୀ ଆୟୋଗଙ୍କ ସରକାରୀ ୱେବସାଇଟ୍ ଆଧାରିତ; ପଠାଇବା ପୂର୍ବରୁ ସର୍ବଶେଷ ବିବରଣୀ ଯାଞ୍ଚ କରନ୍ତୁ। ଏହା ଆଇନଗତ ପରାମର୍ଶ ନୁହେଁ।' : 'Contact details follow each commission’s official website; verify the latest details before sending. This is a drafting aid, not legal advice.'));

      container.replaceChildren(card);
    }

    render();
    return {
      render: render,
      getState: function () { return JSON.parse(JSON.stringify({ lang: state.lang, filter: state.filter, ledger: state.ledger })); }
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
    LEDGER_KEY: LEDGER_KEY,
    BOARDS: BOARDS,
    STAGES: STAGES,
    DIRECTORY: DIRECTORY,
    ESCALATION_PORTALS: ESCALATION_PORTALS,
    upsertApplicationEntry: upsertApplicationEntry,
    removeApplicationEntry: removeApplicationEntry,
    summarizeApplicationLedger: summarizeApplicationLedger,
    generateCommissionRepresentation: generateCommissionRepresentation,
    buildSummaryText: buildSummaryText,
    sampleLedger: sampleLedger,
    loadLedger: loadLedger,
    mount: mount
  };
});
