/**
 * Common Sense Odisha — Candidate Study Streak, Daily Goal & Revision Planner (v417)
 * Mounted on /mock-tests/ and /current-affairs/ (#cso-study-streak-planner-root), persisted in
 * localStorage (`cso_study_streak_planner_v1`) with IST (Asia/Kolkata) calendar day keys,
 * customizable daily targets (10 / 25 / 50 MCQs/day), weak-topic quick-launch links, and a
 * 7-day rolling revision calendar.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOStudyStreakPlanner = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOStudyStreakPlanner = api;
})(function (win, doc) {
  'use strict';

  var STORAGE_KEY = 'cso_study_streak_planner_v1';

  var DAILY_TARGETS = [
    { value: 10, en: '10 MCQs / Day (Warm-Up)', or: '୧୦ ପ୍ରଶ୍ନ / ଦିନ (Warm-Up)' },
    { value: 25, en: '25 MCQs / Day (Standard)', or: '୨୫ ପ୍ରଶ୍ନ / ଦିନ (Standard)' },
    { value: 50, en: '50 MCQs / Day (Exam Sprint)', or: '୫୦ ପ୍ରଶ୍ନ / ଦିନ (Exam Sprint)' }
  ];

  var TRACKED_TOPICS = [
    { key: 'odisha-gk', en: 'Odisha GK & Current Affairs', or: 'ଓଡ଼ିଶା GK ଓ ସାମ୍ପ୍ରତିକ ଘଟଣା', cta: 'Practice Odisha GK →', href: '/mock-tests/' },
    { key: 'teaching-pedagogy', en: 'Teaching Aptitude & Pedagogy', or: 'ଶିକ୍ଷାଦାନ ଦକ୍ଷତା ଓ ପେଡାଗୋଜି', cta: 'Practice Teaching Drill →', href: '/mock-tests/' },
    { key: 'reasoning-quant', en: 'Reasoning & Quantitative Aptitude', or: 'ତର୍କଶକ୍ତି ଓ ଗାଣିତିକ ଦକ୍ଷତା', cta: 'Practice Reasoning & Quant →', href: '/mock-tests/' },
    { key: 'odisha-governance', en: 'Odisha Governance', or: 'ଓଡ଼ିଶା ଶାସନ ବ୍ୟବସ୍ଥା', cta: 'Practice Daily CA Drill →', href: '/current-affairs/' },
    { key: 'economy', en: 'Economy', or: 'ଅର୍ଥନୀତି', cta: 'Practice Economy CA →', href: '/current-affairs/' },
    { key: 'awards-sports', en: 'Awards & Sports', or: 'ପୁରସ୍କାର ଓ କ୍ରୀଡ଼ା', cta: 'Practice Awards & Sports →', href: '/current-affairs/' },
    { key: 'national-international', en: 'National & International', or: 'ଜାତୀୟ ଓ ଆନ୍ତର୍ଜାତୀୟ', cta: 'Practice National CA →', href: '/current-affairs/' }
  ];

  var FOCUS_OPTIONS = [
    'Odisha GK',
    'Teaching Aptitude',
    'Reasoning & Quant',
    'Current Affairs',
    'Mixed Grand Mock',
    'Weak-Topic Revision',
    'Clean-Sheet Digest'
  ];

  var DEFAULT_WEEKDAY_FOCUS = [
    'Clean-Sheet Digest',    // Sun (0)
    'Odisha GK',             // Mon (1)
    'Teaching Aptitude',     // Tue (2)
    'Reasoning & Quant',     // Wed (3)
    'Current Affairs',       // Thu (4)
    'Mixed Grand Mock',      // Fri (5)
    'Weak-Topic Revision'    // Sat (6)
  ];

  var WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var mountedListeners = [];

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function getIstDateKey(dateObj) {
    var d = dateObj instanceof Date ? dateObj : new Date();
    var ist = new Date(d.getTime() + 330 * 60000);
    return ist.getUTCFullYear() + '-' + pad2(ist.getUTCMonth() + 1) + '-' + pad2(ist.getUTCDate());
  }

  function shiftDateKey(dateKey, deltaDays) {
    var parts = String(dateKey || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + Number(deltaDays || 0)));
    return dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate());
  }

  function weekdayOfDateKey(dateKey) {
    var parts = String(dateKey || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function defaultData() {
    return {
      dailyTarget: 25,
      bestStreak: 0,
      days: {},
      topics: {},
      planByDate: {}
    };
  }

  function loadData() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            dailyTarget: [10, 25, 50].indexOf(Number(parsed.dailyTarget)) !== -1 ? Number(parsed.dailyTarget) : 25,
            bestStreak: Math.max(0, Number(parsed.bestStreak) || 0),
            days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
            topics: parsed.topics && typeof parsed.topics === 'object' ? parsed.topics : {},
            planByDate: parsed.planByDate && typeof parsed.planByDate === 'object' ? parsed.planByDate : {}
          };
        }
      }
    } catch (_) {}
    return defaultData();
  }

  function saveData(data) {
    try {
      if (win && win.localStorage) win.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
    mountedListeners.forEach(function (fn) {
      try { fn(); } catch (_) {}
    });
  }

  function computeStreakMetrics(data, refDate) {
    var d = data || loadData();
    var target = [10, 25, 50].indexOf(Number(d.dailyTarget)) !== -1 ? Number(d.dailyTarget) : 25;
    var todayKey = getIstDateKey(refDate);
    var daysMap = d.days || {};
    var todayRec = daysMap[todayKey] || { count: 0, correct: 0 };
    var todayCount = Number(todayRec.count) || 0;
    var remainingToday = Math.max(0, target - todayCount);
    var goalMetToday = todayCount >= target;
    var progressPct = target > 0 ? Math.min(100, Math.round((todayCount / target) * 100)) : 0;

    // Consecutive IST day streak where count >= target
    var currentStreak = 0;
    var cursor = goalMetToday ? todayKey : shiftDateKey(todayKey, -1);
    for (var i = 0; i < 365; i += 1) {
      var rec = daysMap[cursor];
      if (rec && (Number(rec.count) || 0) >= target) {
        currentStreak += 1;
        cursor = shiftDateKey(cursor, -1);
      } else {
        break;
      }
    }

    // Also compute best historical consecutive streak across recorded dates
    var allMetKeys = Object.keys(daysMap).filter(function (k) {
      return (Number(daysMap[k] && daysMap[k].count) || 0) >= target;
    }).sort();
    var maxHist = 0;
    var run = 0;
    var prevKey = '';
    for (var j = 0; j < allMetKeys.length; j += 1) {
      var k = allMetKeys[j];
      if (prevKey && shiftDateKey(prevKey, 1) === k) run += 1;
      else run = 1;
      if (run > maxHist) maxHist = run;
      prevKey = k;
    }
    var bestStreak = Math.max(Number(d.bestStreak) || 0, currentStreak, maxHist);

    var totalAttempted = 0;
    var totalCorrect = 0;
    Object.keys(daysMap).forEach(function (dk) {
      totalAttempted += Number(daysMap[dk].count) || 0;
      totalCorrect += Number(daysMap[dk].correct) || 0;
    });
    var overallAccuracyPct = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    return {
      todayKey: todayKey,
      todayCount: todayCount,
      dailyTarget: target,
      remainingToday: remainingToday,
      goalMetToday: goalMetToday,
      progressPct: progressPct,
      barStep: quantizeStep(progressPct),
      currentStreak: currentStreak,
      bestStreak: bestStreak,
      totalAttempted: totalAttempted,
      totalCorrect: totalCorrect,
      overallAccuracyPct: overallAccuracyPct
    };
  }

  function getWeakTopics(data, limit) {
    var d = data || loadData();
    var maxItems = Math.max(1, Number(limit) || 3);
    var topicsMap = d.topics || {};

    var scored = TRACKED_TOPICS.map(function (t) {
      var rec = topicsMap[t.key] || { count: 0, correct: 0 };
      var cnt = Number(rec.count) || 0;
      var cor = Number(rec.correct) || 0;
      var acc = cnt > 0 ? Math.round((cor / cnt) * 100) : -1;
      return Object.assign({}, t, {
        attempted: cnt,
        correct: cor,
        accuracyPct: acc
      });
    });

    scored.sort(function (a, b) {
      // Unpracticed (-1) or lowest accuracy come first
      var aVal = a.accuracyPct === -1 ? -1 : a.accuracyPct;
      var bVal = b.accuracyPct === -1 ? -1 : b.accuracyPct;
      if (aVal !== bVal) return aVal - bVal;
      return a.attempted - b.attempted;
    });

    return scored.slice(0, maxItems);
  }

  function buildSevenDayCalendar(data, refDate) {
    var d = data || loadData();
    var target = [10, 25, 50].indexOf(Number(d.dailyTarget)) !== -1 ? Number(d.dailyTarget) : 25;
    var todayKey = getIstDateKey(refDate);
    var daysMap = d.days || {};
    var planByDate = d.planByDate || {};
    var cells = [];

    for (var offset = -3; offset <= 3; offset += 1) {
      var dk = shiftDateKey(todayKey, offset);
      var wd = weekdayOfDateKey(dk);
      var cnt = Number(daysMap[dk] && daysMap[dk].count) || 0;
      var status = cnt >= target ? 'met' : (cnt > 0 ? 'partial' : 'none');
      cells.push({
        dateKey: dk,
        shortDate: dk.slice(5),
        weekdayLabel: WEEKDAY_NAMES[wd],
        isToday: offset === 0,
        isPast: offset < 0,
        count: cnt,
        status: status,
        focusTrack: planByDate[dk] || DEFAULT_WEEKDAY_FOCUS[wd]
      });
    }
    return cells;
  }

  function recordPracticeActivity(payload) {
    var p = payload || {};
    var count = Math.max(0, Math.round(Number(p.count) || 0));
    if (count <= 0) return loadData();
    var correct = Math.max(0, Math.min(count, Math.round(Number(p.correct) || 0)));
    var dateKey = p.dateKey || getIstDateKey(p.refDate);
    var data = loadData();

    if (!data.days[dateKey]) data.days[dateKey] = { count: 0, correct: 0 };
    data.days[dateKey].count += count;
    data.days[dateKey].correct += correct;

    if (p.topicKey) {
      var tk = String(p.topicKey).toLowerCase().trim();
      if (!data.topics[tk]) data.topics[tk] = { count: 0, correct: 0 };
      data.topics[tk].count += count;
      data.topics[tk].correct += correct;
    }

    var metrics = computeStreakMetrics(data, p.refDate);
    data.bestStreak = metrics.bestStreak;
    saveData(data);
    return data;
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
    var state = { lang: detectLang(), copiedToast: false };

    function render() {
      var isOr = state.lang === 'or';
      var data = loadData();
      var m = computeStreakMetrics(data);
      var weakList = getWeakTopics(data, 3);
      var cal = buildSevenDayCalendar(data);

      var wrap = el('section', 'cso-ssp-card');
      wrap.setAttribute('data-cso-streak-planner', 'v417');
      wrap.setAttribute('aria-label', isOr ? 'ଦୈନିକ ଅଧ୍ୟୟନ ଷ୍ଟ୍ରିକ୍ ଓ ରିଭିଜନ୍ ପ୍ଲାନର୍' : 'Candidate Study Streak, Daily Goal and Revision Planner');

      // Header
      var head = el('div', 'cso-ssp-head');
      var headLeft = el('div', 'cso-ssp-head-left');
      headLeft.appendChild(el('span', 'cso-ssp-badge', m.goalMetToday
        ? (isOr ? '✅ ଆଜିର ଲକ୍ଷ୍ୟ ପୂରଣ ହୋଇଛି!' : '✅ Daily Goal Achieved!')
        : (isOr ? ('⏳ ଆଜି ଆଉ ' + m.remainingToday + 'ଟି ପ୍ରଶ୍ନ ବାକି') : ('⏳ ' + m.remainingToday + ' MCQs Left Today'))));
      headLeft.appendChild(el('h2', 'cso-ssp-title', isOr
        ? '🔥 ଦୈନିକ ଅଧ୍ୟୟନ ଷ୍ଟ୍ରିକ୍, ଲକ୍ଷ୍ୟ ଓ ୭-ଦିନ ରିଭିଜନ୍ ପ୍ଲାନର୍'
        : '🔥 Study Streak, Daily Goal & 7-Day Revision Planner'));

      var headRight = el('div', 'cso-ssp-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-ssp-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        headRight.appendChild(lb);
      });
      var logBtn = el('button', 'cso-ssp-btn cso-ssp-btn--primary', isOr ? '+ ଅଫଲାଇନ୍ ରିଭିଜନ୍ (+10 MCQ)' : '+ Log Offline Revision (+10 MCQs)');
      logBtn.type = 'button';
      logBtn.addEventListener('click', function () {
        recordPracticeActivity({ count: 10, correct: 8, topicKey: 'odisha-gk', source: 'offline-revision' });
      });
      headRight.appendChild(logBtn);
      head.append(headLeft, headRight);
      wrap.appendChild(head);

      // KPI Strip
      var kpis = el('div', 'cso-ssp-kpis');
      [
        [isOr ? 'ବର୍ତ୍ତମାନ ଷ୍ଟ୍ରିକ୍' : 'Current Streak', '🔥 ' + m.currentStreak + ' Days'],
        [isOr ? 'ସର୍ବୋତ୍ତମ ଷ୍ଟ୍ରିକ୍' : 'Best Streak', '🏆 ' + m.bestStreak + ' Days'],
        [isOr ? 'ଆଜିର ପ୍ରଗତି' : 'Today\'s Progress', m.todayCount + ' / ' + m.dailyTarget + ' MCQs'],
        [isOr ? 'ମୋଟ ସଠିକତା' : 'Overall Accuracy', m.overallAccuracyPct + '% (' + m.totalAttempted + ' Qs)']
      ].forEach(function (pair) {
        var tile = el('div', 'cso-ssp-kpi');
        tile.append(el('span', 'cso-ssp-kpi-k', pair[0]), el('b', 'cso-ssp-kpi-v', pair[1]));
        kpis.appendChild(tile);
      });
      wrap.appendChild(kpis);

      // Progress Bar
      var progRow = el('div', 'cso-vfv-bar-row');
      var progMeta = el('div', 'cso-vfv-bar-meta');
      progMeta.append(
        el('span', 'cso-vfv-bar-label', isOr ? 'ଆଜିର ଦୈନିକ ଲକ୍ଷ୍ୟ (' + m.todayKey + ' IST)' : 'Today\'s Goal (' + m.todayKey + ' IST)'),
        el('span', 'cso-vfv-bar-val', m.progressPct + '%')
      );
      var track = el('div', 'cso-vfv-bar-track');
      track.appendChild(el('div', 'cso-vfv-bar-fill cso-vfv-bar--w' + m.barStep));
      progRow.append(progMeta, track);
      wrap.appendChild(progRow);

      // Daily Target Pills
      var targetBar = el('div', 'cso-ssp-actions');
      targetBar.setAttribute('role', 'group');
      targetBar.setAttribute('aria-label', 'Daily MCQ target');
      targetBar.appendChild(el('span', 'cso-ssp-lbl', isOr ? 'ଦୈନିକ ଲକ୍ଷ୍ୟ:' : 'Daily Target:'));
      DAILY_TARGETS.forEach(function (t) {
        var act = data.dailyTarget === t.value;
        var tb = el('button', 'cso-ssp-pill' + (act ? ' is-active' : ''), isOr ? t.or : t.en);
        tb.type = 'button';
        tb.setAttribute('aria-pressed', act ? 'true' : 'false');
        tb.addEventListener('click', function () {
          var next = loadData();
          next.dailyTarget = t.value;
          saveData(next);
        });
        targetBar.appendChild(tb);
      });
      wrap.appendChild(targetBar);

      // Weak-Topic Quick-Launch Cards
      wrap.appendChild(el('h3', 'cso-ssp-subhead', isOr ? '🎯 ଦୁର୍ବଳ ବିଷୟ ଓ ତୁରନ୍ତ ଅଭ୍ୟାସ' : '🎯 Priority Weak-Topic Revision Links'));
      var weakGrid = el('div', 'cso-ssp-weak-grid');
      weakList.forEach(function (wt) {
        var card = el('div', 'cso-ssp-weak-item');
        var accTxt = wt.accuracyPct === -1
          ? (isOr ? 'ଅଭ୍ୟାସ ବାକି ଅଛି' : 'Not practiced yet')
          : (wt.accuracyPct + '% accuracy (' + wt.correct + '/' + wt.attempted + ')');
        card.append(
          el('div', 'cso-ssp-weak-name', isOr ? wt.or : wt.en),
          el('div', 'cso-ssp-weak-meta', accTxt)
        );
        var link = el('a', 'cso-ssp-link', wt.cta);
        link.setAttribute('href', wt.href);
        card.appendChild(link);
        weakGrid.appendChild(card);
      });
      wrap.appendChild(weakGrid);

      // 7-Day Rolling IST Revision Calendar
      wrap.appendChild(el('h3', 'cso-ssp-subhead', isOr ? '📅 ୭-ଦିନ ରିଭିଜନ୍ କ୍ୟାଲେଣ୍ଡର (IST)' : '📅 7-Day Rolling Revision Calendar (IST)'));
      var calGrid = el('div', 'cso-ssp-cal-grid');
      cal.forEach(function (cell) {
        var box = el('div', 'cso-ssp-cal-cell' + (cell.isToday ? ' is-today' : '') + (cell.status === 'met' ? ' is-met' : ''));
        var badgeTxt = cell.status === 'met' ? ('✅ ' + cell.count) : (cell.status === 'partial' ? ('🟡 ' + cell.count) : '—');
        box.append(
          el('div', 'cso-ssp-cal-day', cell.weekdayLabel + ' · ' + cell.shortDate + (cell.isToday ? ' (Today)' : '')),
          el('div', 'cso-ssp-cal-stat', badgeTxt)
        );
        var sel = el('select', 'cso-ssp-cal-select');
        sel.setAttribute('aria-label', 'Focus track for ' + cell.dateKey);
        FOCUS_OPTIONS.forEach(function (fo) {
          var o = el('option', '', fo);
          o.value = fo;
          if (cell.focusTrack === fo) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function () {
          var next = loadData();
          next.planByDate[cell.dateKey] = sel.value;
          saveData(next);
        });
        box.appendChild(sel);
        calGrid.appendChild(box);
      });
      wrap.appendChild(calGrid);

      // Footer Actions: Copy Study Plan & Reset Stats
      var foot = el('div', 'cso-ssp-actions');
      var copyBtn = el('button', 'cso-ssp-btn', state.copiedToast ? '✓ Study Plan Copied' : '📋 Copy Study Plan');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var lines = [
          'CS Odisha 7-Day Revision Plan (Target: ' + m.dailyTarget + ' MCQs/day | Streak: ' + m.currentStreak + ' days)'
        ].concat(cal.map(function (c) {
          return c.weekdayLabel + ' ' + c.dateKey + ': ' + c.focusTrack + ' (' + c.count + ' MCQs done)';
        }));
        if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
          win.navigator.clipboard.writeText(lines.join('\n')).catch(function () {});
        }
        state.copiedToast = true;
        render();
      });
      var resetBtn = el('button', 'cso-ssp-btn', isOr ? '↻ ରିସେଟ୍' : '↻ Reset Stats');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () { saveData(defaultData()); });
      foot.append(copyBtn, resetBtn);
      wrap.appendChild(foot);

      container.replaceChildren(wrap);
    }

    mountedListeners.push(render);
    if (win && typeof win.addEventListener === 'function' && !container.__csoSspWired) {
      container.__csoSspWired = true;
      win.addEventListener('storage', function (ev) {
        if (ev && ev.key === STORAGE_KEY) render();
      });
    }

    render();
    return { render: render };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-study-streak-planner-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v417',
    STORAGE_KEY: STORAGE_KEY,
    DAILY_TARGETS: DAILY_TARGETS,
    TRACKED_TOPICS: TRACKED_TOPICS,
    FOCUS_OPTIONS: FOCUS_OPTIONS,
    getIstDateKey: getIstDateKey,
    shiftDateKey: shiftDateKey,
    loadData: loadData,
    saveData: saveData,
    computeStreakMetrics: computeStreakMetrics,
    getWeakTopics: getWeakTopics,
    buildSevenDayCalendar: buildSevenDayCalendar,
    recordPracticeActivity: recordPracticeActivity,
    mount: mount
  };
});
