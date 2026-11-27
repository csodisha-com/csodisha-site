/**
 * Common Sense Odisha — Interactive Odisha Exam Calendar & Admit Card Tracker (v413)
 * Mounted on /exams/ (#cso-exam-calendar-tracker-root) with month-by-month filtering, conducting-body
 * & stage pills, 4-milestone timeline cards, live /api/public/search-index D1 merge, .ics exports
 * (window.CSOCalendarExport), and Saved Alerts bookmarking (window.CSOSavedAlerts).
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOExamCalendarTracker = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOExamCalendarTracker = api;
})(function (win, doc) {
  'use strict';

  var PREFS_KEY = 'cso_exam_calendar_prefs_v1';

  var MONTH_FILTERS = [
    { key: 'all', en: 'All Months', or: 'ସମସ୍ତ ମାସ' },
    { key: '2026-11', en: 'November 2026', or: 'ନଭେମ୍ବର ୨୦୨୬' },
    { key: '2026-12', en: 'December 2026', or: 'ଡିସେମ୍ବର ୨୦୨୬' },
    { key: '2027-01', en: 'January 2027', or: 'ଜାନୁଆରୀ ୨୦୨୭' },
    { key: '2027-02-03', en: 'February–March 2027', or: 'ଫେବୃଆରୀ–ମାର୍ଚ୍ଚ ୨୦୨୭' }
  ];

  var BOARDS = [
    { key: 'all', en: 'All Boards', or: 'ସମସ୍ତ ବୋର୍ଡ' },
    { key: 'opsc', en: 'OPSC', or: 'OPSC' },
    { key: 'ossc', en: 'OSSC', or: 'OSSC' },
    { key: 'osssc', en: 'OSSSC', or: 'OSSSC' },
    { key: 'oprb', en: 'OPRB / Police', or: 'OPRB / ପୋଲିସ୍' },
    { key: 'central', en: 'Central (CBSE CTET / NTA / SSC / UPSC)', or: 'କେନ୍ଦ୍ରୀୟ (CTET / NTA / SSC / UPSC)' }
  ];

  var STAGES = [
    { key: 'all', en: 'All Stages', or: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ' },
    { key: 'application_open', en: 'Application Open', or: 'ଆବେଦନ ଚାଲିଛି' },
    { key: 'admit_card_live', en: 'Admit Card / City Slip Live', or: 'ଆଡମିଟ୍ କାର୍ଡ / ସିଟି ସ୍ଲିପ୍' },
    { key: 'upcoming_exam', en: 'Upcoming Exam Date', or: 'ଆଗାମୀ ପରୀକ୍ଷା ତାରିଖ' },
    { key: 'result_dv', en: 'Result / Verification', or: 'ଫଳାଫଳ / ଯାଞ୍ଚ' }
  ];

  var CURATED_SCHEDULE = [
    {
      id: 'cbse-ctet-dec-2026',
      slug: 'cbse-ctet-december-2026-22nd-edition',
      title_en: 'CBSE CTET December 2026 (22nd Edition)',
      title_or: 'CBSE CTET ଡିସେମ୍ବର ୨୦୨୬ (୨୨ତମ ସଂସ୍କରଣ)',
      board: 'central',
      board_label: 'Central (CBSE)',
      month_bucket: '2026-12',
      stage: 'admit_card_live',
      notification_date: 'Sep 2026',
      last_date_apply: 'Closed',
      admit_card_window: 'City Slip: 27 Nov 2026 · Admit Card: 10 Dec 2026',
      admit_card_iso: '2026-12-10',
      exam_date_label: '12–13 Dec 2026',
      exam_date_iso: '2026-12-12',
      exam_end_iso: '2026-12-13',
      portal_url: 'https://ctet.nic.in',
      guide_url: '/mock-tests/'
    },
    {
      id: 'nta-ugc-net-dec-2026',
      slug: 'nta-ugc-net-december-2026',
      title_en: 'NTA UGC NET December 2026',
      title_or: 'NTA UGC NET ଡିସେମ୍ବର ୨୦୨୬',
      board: 'central',
      board_label: 'Central (NTA)',
      month_bucket: '2026-12',
      stage: 'admit_card_live',
      notification_date: 'Oct 2026',
      last_date_apply: 'City Correction: 29 Nov 2026',
      admit_card_window: 'City Slip: 25 Nov 2026 · Admit Card: 10 Dec 2026',
      admit_card_iso: '2026-12-10',
      exam_date_label: '14–21 Dec 2026',
      exam_date_iso: '2026-12-14',
      exam_end_iso: '2026-12-21',
      portal_url: 'https://ugcnet.nta.nic.in',
      guide_url: '/guides/ugc-net-december-2026-schedule-nta-guidelines'
    },
    {
      id: 'odisha-police-si-oprb-2026',
      slug: 'odisha-police-si-cpse-oprb-2026',
      title_en: 'Odisha Police SI (CPSE / OPRB Written Exam 2026)',
      title_or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (CPSE / OPRB ଲିଖିତ ପରୀକ୍ଷା ୨୦୨୬)',
      board: 'oprb',
      board_label: 'OPRB / Police',
      month_bucket: '2026-12',
      stage: 'upcoming_exam',
      notification_date: '2026 Cycle',
      last_date_apply: 'Closed',
      admit_card_window: 'Mid-December 2026',
      admit_card_iso: '2026-12-15',
      exam_date_label: '26–27 Dec 2026 (OMR Paper I, II & III)',
      exam_date_iso: '2026-12-26',
      exam_end_iso: '2026-12-27',
      portal_url: 'https://oussc.odisha.gov.in',
      guide_url: '/study-library/odisha-police-oprb/'
    },
    {
      id: 'ossc-chsl-specialist-2026',
      slug: 'ossc-chsl-10-plus-2-specialist-4273-2026',
      title_en: 'OSSC Combined Higher Secondary (10+2) Specialist Posts 2026 (Advt. 4273/OSSC)',
      title_or: 'OSSC ମିଳିତ ଉଚ୍ଚ ମାଧ୍ୟମିକ (୧୦+୨) ସ୍ପେଶାଲିଷ୍ଟ ପଦବୀ ୨୦୨୬ (ବିଜ୍ଞପ୍ତି 4273)',
      board: 'ossc',
      board_label: 'OSSC',
      month_bucket: '2026-11',
      stage: 'application_open',
      notification_date: '19 Nov 2026',
      last_date_apply: 'Dec 2026 Window',
      admit_card_window: 'Jan 2027 (Expected)',
      admit_card_iso: '2027-01-10',
      exam_date_label: 'Dec 2026 – Jan 2027 Window',
      exam_date_iso: '2027-01-20',
      exam_end_iso: '2027-01-20',
      portal_url: 'https://www.ossc.gov.in',
      guide_url: '/jobs/'
    },
    {
      id: 'ossc-cglre-specialist-2025',
      slug: 'ossc-cglre-specialist-2025-prelims-dv',
      title_en: 'OSSC CGLRE Specialist 2025 Prelims & Document Verification',
      title_or: 'OSSC CGLRE ସ୍ପେଶାଲିଷ୍ଟ ୨୦୨୫ ପ୍ରିଲିମ୍ସ ଓ ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ',
      board: 'ossc',
      board_label: 'OSSC',
      month_bucket: '2026-11',
      stage: 'admit_card_live',
      notification_date: '2025 Cycle',
      last_date_apply: 'Completed',
      admit_card_window: 'Admission Letter Live: 20 Nov 2026',
      admit_card_iso: '2026-11-20',
      exam_date_label: 'Nov – Dec 2026 DV & Prelims',
      exam_date_iso: '2026-12-05',
      exam_end_iso: '2026-12-05',
      portal_url: 'https://www.ossc.gov.in',
      guide_url: '/jobs/'
    },
    {
      id: 'opsc-ocs-group-a-2026-27',
      slug: 'opsc-odisha-civil-services-ocs-cycle',
      title_en: 'OPSC Odisha Civil Services (OCS) & Group-A Recruitment Cycle',
      title_or: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OCS) ଓ ଗ୍ରୁପ୍-A ନିଯୁକ୍ତି',
      board: 'opsc',
      board_label: 'OPSC',
      month_bucket: '2027-01',
      stage: 'result_dv',
      notification_date: 'Mains Done: 07 Nov 2026',
      last_date_apply: 'Next Cycle Expected Q1 2027',
      admit_card_window: 'Interview Call Letters: Jan 2027',
      admit_card_iso: '2027-01-15',
      exam_date_label: 'Jan – Feb 2027 (Interview / Next Cycle)',
      exam_date_iso: '2027-01-25',
      exam_end_iso: '2027-02-15',
      portal_url: 'https://www.opsc.gov.in',
      guide_url: '/study-library/opsc-oas/'
    },
    {
      id: 'osssc-combined-ri-ari-amin-2027',
      slug: 'osssc-combined-ri-ari-amin-sfs-icds-2027',
      title_en: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS / ICDS Supervisor)',
      title_or: 'OSSSC ମିଳିତ ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / SFS / ICDS)',
      board: 'osssc',
      board_label: 'OSSSC',
      month_bucket: '2027-02-03',
      stage: 'upcoming_exam',
      notification_date: 'Active Cycle',
      last_date_apply: 'Portal Schedule',
      admit_card_window: '10 Days Prior to Exam',
      admit_card_iso: '2027-02-05',
      exam_date_label: 'Jan – Feb 2027 (Exam / Skill Test)',
      exam_date_iso: '2027-02-15',
      exam_end_iso: '2027-02-25',
      portal_url: 'https://www.osssc.gov.in',
      guide_url: '/study-library/osssc-ri-ari-amin/'
    }
  ];

  function resolveMonthBucket(dateIso) {
    var s = String(dateIso || '').trim();
    var m = s.match(/^(\d{4})-(\d{2})/);
    if (!m) return '2026-12';
    var ym = m[1] + '-' + m[2];
    if (ym === '2027-02' || ym === '2027-03') return '2027-02-03';
    return ym;
  }

  function inferBoardFromText(txt) {
    var t = String(txt || '').toLowerCase();
    if (/\bopsc\b|\boas\b|\bocs\b/.test(t)) return { board: 'opsc', label: 'OPSC' };
    if (/\bosssc\b|\bari\b|\bamin\b|\bpeo\b|\bicds\b/.test(t)) return { board: 'osssc', label: 'OSSSC' };
    if (/\bossc\b|\bcglre\b/.test(t)) return { board: 'ossc', label: 'OSSC' };
    if (/\boprb\b|\bpolice\b|\bcpse\b|\bconstable\b/.test(t)) return { board: 'oprb', label: 'OPRB / Police' };
    return { board: 'central', label: 'Central / Live Notice' };
  }

  function inferStageFromText(txt) {
    var t = String(txt || '').toLowerCase();
    if (/admit\s*card|admission\s*letter|city\s*intimation|city\s*slip/.test(t)) return 'admit_card_live';
    if (/result|merit\s*list|verification|cut\s*off|answer\s*key/.test(t)) return 'result_dv';
    if (/apply|recruitment|walk-in|vacancy|notification/.test(t)) return 'application_open';
    return 'upcoming_exam';
  }

  function mergeD1Items(curated, d1Items) {
    var base = Array.isArray(curated) ? curated.slice() : CURATED_SCHEDULE.slice();
    var seen = {};
    base.forEach(function (x) {
      seen[String(x.slug || x.id).toLowerCase()] = true;
      seen[String(x.title_en || '').toLowerCase()] = true;
    });

    var list = Array.isArray(d1Items) ? d1Items : [];
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it || !it.title) continue;
      var sl = String(it.slug || it.id || '').toLowerCase();
      var ttl = String(it.title || '').trim();
      if (!sl || seen[sl] || seen[ttl.toLowerCase()]) continue;
      var isExamRelevant = /exam|admit|ctet|ugc|net|opsc|ossc|osssc|oprb|otet|osstet|recruitment|walk-in|result/i.test(ttl + ' ' + (it.category || ''));
      if (!isExamRelevant) continue;
      seen[sl] = true;
      seen[ttl.toLowerCase()] = true;
      var bInfo = inferBoardFromText(ttl + ' ' + (it.org || ''));
      var refDate = String(it.deadline_iso || it.published_at || '2026-12-15').slice(0, 10);
      base.push({
        id: 'd1-' + sl,
        slug: sl,
        title_en: ttl,
        title_or: String(it.title_or || ttl).trim(),
        board: bInfo.board,
        board_label: bInfo.label,
        month_bucket: resolveMonthBucket(refDate),
        stage: inferStageFromText(ttl),
        notification_date: String(it.published_at || 'Live D1').slice(0, 10),
        last_date_apply: it.deadline_iso || 'See Notice',
        admit_card_window: 'As per Portal Schedule',
        admit_card_iso: '',
        exam_date_label: it.deadline_iso ? ('Key Date: ' + it.deadline_iso) : 'Date Awaited',
        exam_date_iso: it.deadline_iso || '',
        exam_end_iso: it.deadline_iso || '',
        portal_url: String(it.url || '/exams/'),
        guide_url: String(it.url || '/exams/')
      });
    }
    return base;
  }

  function filterSchedule(items, filters) {
    var list = Array.isArray(items) ? items : CURATED_SCHEDULE;
    var f = filters || {};
    var month = f.month || 'all';
    var board = f.board || 'all';
    var stage = f.stage || 'all';
    var q = String(f.query || '').trim().toLowerCase();

    return list.filter(function (ex) {
      if (!ex) return false;
      if (month !== 'all' && ex.month_bucket !== month) return false;
      if (board !== 'all' && ex.board !== board) return false;
      if (stage !== 'all' && ex.stage !== stage) return false;
      if (q) {
        var hay = [ex.title_en, ex.title_or, ex.board_label, ex.admit_card_window, ex.exam_date_label].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function computeExamCountdown(dateIso, nowDate) {
    var parts = String(dateIso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    var now = nowDate instanceof Date ? nowDate : new Date();
    var istNow = new Date(now.getTime() + 330 * 60000);
    var todayUtc = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
    var targetUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    return Math.round((targetUtc - todayUtc) / 86400000);
  }

  function loadPrefs() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          return {
            month: String(p.month || 'all'),
            board: String(p.board || 'all'),
            stage: String(p.stage || 'all'),
            query: String(p.query || '')
          };
        }
      }
    } catch (_) {}
    return { month: 'all', board: 'all', stage: 'all', query: '' };
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

  function buildIcsActionButton(opts) {
    if (win.CSOCalendarExport && typeof win.CSOCalendarExport.createCalendarButton === 'function') {
      return win.CSOCalendarExport.createCalendarButton({
        title: opts.title,
        startDate: opts.startDate,
        endDate: opts.endDate || opts.startDate,
        description: opts.description || 'Odisha Exam Calendar reminder — https://csodisha.com/exams/',
        url: opts.url || 'https://csodisha.com/exams/',
        label: opts.label,
        className: 'cso-ect-btn'
      });
    }
    var btn = el('button', 'cso-ect-btn', opts.label);
    btn.type = 'button';
    btn.addEventListener('click', function () {
      var dStr = String(opts.startDate || '').replace(/-/g, '');
      if (!dStr) return;
      var ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Common Sense Odisha//Exam Calendar//EN',
        'BEGIN:VEVENT',
        'UID:' + opts.uid + '@csodisha.com',
        'DTSTART;VALUE=DATE:' + dStr,
        'SUMMARY:' + opts.title,
        'DESCRIPTION:' + (opts.description || 'https://csodisha.com/exams/'),
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      try {
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var u = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = u;
        a.download = opts.uid + '.ics';
        doc.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      } catch (_) {}
    });
    return btn;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = Object.assign({
      lang: detectLang(),
      schedule: CURATED_SCHEDULE.slice()
    }, loadPrefs());

    function persistAndRender() {
      savePrefs({ month: state.month, board: state.board, stage: state.stage, query: state.query });
      render();
    }

    if (typeof fetch === 'function') {
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (payload) {
          var items = payload && Array.isArray(payload.items) ? payload.items : [];
          if (!items.length) return;
          state.schedule = mergeD1Items(CURATED_SCHEDULE, items);
          render();
        })
        .catch(function () {});
    }

    function isAlertSaved(slug) {
      return Boolean(win.CSOSavedAlerts && typeof win.CSOSavedAlerts.isSaved === 'function' && win.CSOSavedAlerts.isSaved(slug));
    }

    function toggleSaveAlert(ex) {
      if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.toggle === 'function') {
        win.CSOSavedAlerts.toggle({
          slug: ex.slug,
          title: ex.title_en,
          url: ex.guide_url || '/exams/',
          deadline_iso: ex.exam_date_iso || '',
          type: 'exam',
          org: ex.board_label
        });
        render();
      }
    }

    function render() {
      var isOr = state.lang === 'or';
      var filtered = filterSchedule(state.schedule, state);

      var wrap = el('section', 'cso-ect-card');
      wrap.setAttribute('data-cso-exam-calendar', 'v413');
      wrap.setAttribute('aria-label', isOr ? 'ଓଡ଼ିଶା ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର ଓ ଆଡମିଟ୍ କାର୍ଡ ଟ୍ରାକର୍' : 'Interactive Odisha Exam Calendar and Admit Card Tracker');

      // Header
      var head = el('div', 'cso-ect-head');
      var headLeft = el('div', 'cso-ect-head-left');
      headLeft.appendChild(el('span', 'cso-ect-badge', isOr ? '🗓️ ୨୦୨୬–୨୭ ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା ସୂଚୀ' : '🗓️ 2026–27 Odisha & Central Exam Schedule'));
      headLeft.appendChild(el('h2', 'cso-ect-title', isOr
        ? 'ମାସିକ ଓଡ଼ିଶା ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର ଓ ଆଡମିଟ୍ କାର୍ଡ ଟ୍ରାକର୍'
        : 'Interactive Odisha Exam Calendar & Admit Card Tracker'));
      headLeft.appendChild(el('p', 'cso-ect-sub', isOr
        ? 'ବିଜ୍ଞପ୍ତି, ଆବେଦନ ଶେଷ ତାରିଖ, ଆଡମିଟ୍ କାର୍ଡ ଓ ପରୀକ୍ଷା ତାରିଖ ଗୋଟିଏ ସ୍ଥାନରେ ଦେଖନ୍ତୁ ଏବଂ .ics ରିମାଇଣ୍ଡର୍ ସେଭ୍ କରନ୍ତୁ।'
        : 'Track Notification, Last Date to Apply, Admit Card / City Slip windows, and Exam Dates across OPSC, OSSC, OSSSC, OPRB, CBSE CTET & NTA with 1-click .ics reminders.'));

      var headRight = el('div', 'cso-ect-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-ect-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        headRight.appendChild(lb);
      });
      var printBtn = el('button', 'cso-ect-btn', isOr ? '🖨️ ପରୀକ୍ଷା ସୂଚୀ ପ୍ରିଣ୍ଟ' : '🖨️ Print Exam Schedule');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (win && typeof win.print === 'function') win.print(); });
      headRight.appendChild(printBtn);
      head.append(headLeft, headRight);
      wrap.appendChild(head);

      // Month Pills with Live Counts
      var monthBar = el('div', 'cso-ect-pill-bar');
      monthBar.setAttribute('role', 'group');
      monthBar.setAttribute('aria-label', 'Filter by month');
      MONTH_FILTERS.forEach(function (mf) {
        var count = mf.key === 'all'
          ? state.schedule.length
          : state.schedule.filter(function (x) { return x.month_bucket === mf.key; }).length;
        var act = state.month === mf.key;
        var mb = el('button', 'cso-ect-pill' + (act ? ' is-active' : ''), (isOr ? mf.or : mf.en) + ' (' + count + ')');
        mb.type = 'button';
        mb.setAttribute('data-ect-month', mf.key);
        mb.setAttribute('aria-pressed', act ? 'true' : 'false');
        mb.addEventListener('click', function () { state.month = mf.key; persistAndRender(); });
        monthBar.appendChild(mb);
      });
      wrap.appendChild(monthBar);

      // Board Pills
      var boardBar = el('div', 'cso-ect-pill-bar');
      boardBar.setAttribute('role', 'group');
      boardBar.setAttribute('aria-label', 'Filter by conducting board');
      BOARDS.forEach(function (b) {
        var act = state.board === b.key;
        var bb = el('button', 'cso-ect-pill' + (act ? ' is-active' : ''), isOr ? b.or : b.en);
        bb.type = 'button';
        bb.setAttribute('data-ect-board', b.key);
        bb.setAttribute('aria-pressed', act ? 'true' : 'false');
        bb.addEventListener('click', function () { state.board = b.key; persistAndRender(); });
        boardBar.appendChild(bb);
      });
      wrap.appendChild(boardBar);

      // Stage + Search + Reset Row
      var ctrlRow = el('div', 'cso-ect-controls');
      var stField = el('label', 'cso-ect-field');
      stField.appendChild(el('span', 'cso-ect-field-lbl', isOr ? 'ପରୀକ୍ଷା ପର୍ଯ୍ୟାୟ' : 'Exam Stage / Status'));
      var stSel = el('select', 'cso-ect-select');
      STAGES.forEach(function (st) {
        var o = el('option', '', isOr ? st.or : st.en);
        o.value = st.key;
        if (state.stage === st.key) o.selected = true;
        stSel.appendChild(o);
      });
      stSel.addEventListener('change', function () { state.stage = stSel.value; persistAndRender(); });
      stField.appendChild(stSel);

      var qField = el('label', 'cso-ect-field');
      qField.appendChild(el('span', 'cso-ect-field-lbl', isOr ? 'ପରୀକ୍ଷା ଖୋଜନ୍ତୁ' : 'Instant Keyword Search'));
      var qInp = el('input', 'cso-ect-input');
      qInp.type = 'search';
      qInp.value = state.query;
      qInp.placeholder = isOr ? 'CTET, UGC NET, Police SI, OSSC, OPSC, RI…' : 'CTET, UGC NET, Police SI, OSSC, OPSC, RI…';
      qInp.addEventListener('input', function () { state.query = qInp.value; persistAndRender(); });
      qField.appendChild(qInp);

      var resetBtn = el('button', 'cso-ect-btn', isOr ? '↻ ଫିଲ୍ଟର୍ ରିସେଟ୍' : '↻ Reset Filters');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        state.month = 'all';
        state.board = 'all';
        state.stage = 'all';
        state.query = '';
        persistAndRender();
      });
      ctrlRow.append(stField, qField, resetBtn);
      wrap.appendChild(ctrlRow);

      // Results Grid
      var grid = el('div', 'cso-ect-grid');
      if (!filtered.length) {
        grid.appendChild(el('div', 'cso-ect-empty', isOr
          ? 'ଏହି ଫିଲ୍ଟର୍ ପାଇଁ କୌଣସି ପରୀକ୍ଷା ସୂଚୀ ମିଳିଲା ନାହିଁ।'
          : 'No scheduled exams match this filter combination — click Reset Filters to view all upcoming milestones.'));
      } else {
        filtered.forEach(function (ex) {
          var card = el('article', 'cso-ect-item');

          var top = el('div', 'cso-ect-item-top');
          top.appendChild(el('span', 'cso-ect-board-tag', ex.board_label));
          var days = computeExamCountdown(ex.exam_date_iso);
          var cdLabel = days === null
            ? (isOr ? 'ତାରିଖ ଅପେକ୍ଷାରତ' : 'Date Awaited')
            : (days > 0
              ? (isOr ? (days + ' ଦିନ ବାକି') : ('Exam in ' + days + ' Days'))
              : (days === 0 ? (isOr ? 'ଆଜି ପରୀକ୍ଷା!' : 'Exam Today!') : (isOr ? 'ସମାପ୍ତ / ପରବର୍ତ୍ତୀ ପର୍ଯ୍ୟାୟ' : 'Completed / Next Stage')));
          top.appendChild(el('span', 'cso-ect-cd-pill', '⏳ ' + cdLabel));
          card.appendChild(top);

          card.appendChild(el('h3', 'cso-ect-item-title', isOr ? ex.title_or : ex.title_en));

          // 4-Milestone Timeline Strip
          var strip = el('div', 'cso-ect-milestones');
          [
            [isOr ? '୧. ବିଜ୍ଞପ୍ତି' : '1. Notification', ex.notification_date],
            [isOr ? '୨. ଆବେଦନ ଶେଷ' : '2. Last Date to Apply', ex.last_date_apply],
            [isOr ? '୩. ଆଡମିଟ୍ କାର୍ଡ' : '3. Admit Card / City Slip', ex.admit_card_window],
            [isOr ? '୪. ପରୀକ୍ଷା ତାରିଖ' : '4. Exam Date', ex.exam_date_label]
          ].forEach(function (pair) {
            var m = el('div', 'cso-ect-ms');
            m.append(el('span', 'cso-ect-ms-k', pair[0]), el('b', 'cso-ect-ms-v', pair[1]));
            strip.appendChild(m);
          });
          card.appendChild(strip);

          // Action Bar
          var foot = el('div', 'cso-ect-actions');
          if (ex.exam_date_iso) {
            foot.appendChild(buildIcsActionButton({
              uid: ex.id + '-exam',
              title: ex.title_en + ' (Exam Date)',
              startDate: ex.exam_date_iso,
              endDate: ex.exam_end_iso || ex.exam_date_iso,
              label: isOr ? '📅 ପରୀକ୍ଷା ତାରିଖ (.ics)' : '📅 Add Exam Date (.ics)',
              url: ex.portal_url
            }));
          }
          if (ex.admit_card_iso) {
            foot.appendChild(buildIcsActionButton({
              uid: ex.id + '-admit',
              title: ex.title_en + ' (Admit Card Window)',
              startDate: ex.admit_card_iso,
              label: isOr ? '🔔 ଆଡମିଟ୍ କାର୍ଡ ରିମାଇଣ୍ଡର୍ (.ics)' : '🔔 Add Admit Card Reminder (.ics)',
              url: ex.portal_url
            }));
          }
          var saved = isAlertSaved(ex.slug);
          var saveBtn = el('button', 'cso-ect-btn' + (saved ? ' is-saved' : ''), saved
            ? (isOr ? '★ ସେଭ୍ ହୋଇଛି' : '★ Saved')
            : (isOr ? '☆ ଆଲର୍ଟ ସେଭ୍' : '☆ Save Alert'));
          saveBtn.type = 'button';
          saveBtn.addEventListener('click', function () { toggleSaveAlert(ex); });
          foot.appendChild(saveBtn);

          var portalA = el('a', 'cso-ect-cta', isOr ? 'ସରକାରୀ ପୋର୍ଟାଲ୍ ↗' : 'Official Portal ↗');
          portalA.setAttribute('href', ex.portal_url || '/exams/');
          if (/^https?:\/\//i.test(ex.portal_url || '')) {
            portalA.setAttribute('target', '_blank');
            portalA.setAttribute('rel', 'noopener noreferrer');
          }
          foot.appendChild(portalA);

          card.appendChild(foot);
          grid.appendChild(card);
        });
      }
      wrap.appendChild(grid);

      container.replaceChildren(wrap);
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-exam-calendar-tracker-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v413',
    PREFS_KEY: PREFS_KEY,
    MONTH_FILTERS: MONTH_FILTERS,
    BOARDS: BOARDS,
    STAGES: STAGES,
    CURATED_SCHEDULE: CURATED_SCHEDULE,
    resolveMonthBucket: resolveMonthBucket,
    mergeD1Items: mergeD1Items,
    filterSchedule: filterSchedule,
    computeExamCountdown: computeExamCountdown,
    mount: mount
  };
});
