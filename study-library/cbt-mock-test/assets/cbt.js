(function (root) {
  'use strict';

  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';
  var HISTORY_KEY = 'cso_cbt_history_v1';
  var STREAK_KEY = 'cso_cbt_streak_v1';

  var EXAM_PRESETS = [
    { id: 'opsc-oas', label: 'OPSC OAS Prelims (GS Paper-I)', pos: 2, neg: 0.66 },
    { id: 'osssc-ri', label: 'OSSSC RI/ARI/Amin/SFS', pos: 1, neg: 0.5 },
    { id: 'otet-osstet', label: 'OTET / OSSTET Paper-I', pos: 1, neg: 0 },
    { id: 'oprb', label: 'Odisha Police SI / Constable', pos: 1, neg: 0.25 },
    { id: 'ece', label: 'Early Childhood Education', pos: 1, neg: 0 },
    { id: 'all-odisha', label: 'All-Odisha Mixed', pos: 1, neg: 0.25 }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function safeReadJson(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeWriteJson(storage, key, val) {
    try {
      storage.setItem(key, JSON.stringify(val));
      return true;
    } catch (_) {
      return false;
    }
  }

  function getPresetById(id) {
    for (var i = 0; i < EXAM_PRESETS.length; i++) {
      if (EXAM_PRESETS[i].id === id) return EXAM_PRESETS[i];
    }
    return EXAM_PRESETS[0];
  }

  function formatTimer(seconds) {
    var s = Math.max(0, Math.floor(Number(seconds) || 0));
    var mins = Math.floor(s / 60);
    var secs = s % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function getPaletteStatus(state, index) {
    if (state && state.marked && state.marked[index]) return 'marked';
    if (state && state.responses && state.responses[index] !== undefined && state.responses[index] !== null) return 'answered';
    return 'unanswered';
  }

  function scoreAttempt(questions, responses, preset) {
    var qList = Array.isArray(questions) ? questions : [];
    var resp = responses || {};
    var p = preset || EXAM_PRESETS[0];
    var correct = 0;
    var wrong = 0;
    var unanswered = 0;
    var missedItems = [];
    var sectionMap = {};

    for (var i = 0; i < qList.length; i++) {
      var q = qList[i];
      var secName = String(q.section || q.exam || p.label || 'General');
      if (!sectionMap[secName]) sectionMap[secName] = { total: 0, correct: 0, wrong: 0, unanswered: 0 };
      sectionMap[secName].total += 1;

      var chosen = resp[i];
      if (chosen === undefined || chosen === null) {
        unanswered += 1;
        sectionMap[secName].unanswered += 1;
      } else if (chosen === q.answerIndex) {
        correct += 1;
        sectionMap[secName].correct += 1;
      } else {
        wrong += 1;
        sectionMap[secName].wrong += 1;
        missedItems.push({
          id: q.id,
          section: secName,
          exam: q.exam || p.label,
          q: q.question,
          a: (q.options && q.options[q.answerIndex] ? q.options[q.answerIndex] : '') + (q.explanation ? ' — ' + q.explanation : '')
        });
      }
    }

    var sectionStats = [];
    var weakTopic = '';
    var lowestAcc = 101;
    Object.keys(sectionMap).forEach(function (sec) {
      var st = sectionMap[sec];
      var att = st.correct + st.wrong;
      var acc = att > 0 ? Math.round((st.correct / att) * 100) : 0;
      sectionStats.push({ section: sec, total: st.total, correct: st.correct, wrong: st.wrong, accuracyPct: acc });
      if (att > 0 && acc < lowestAcc) {
        lowestAcc = acc;
        weakTopic = sec;
      }
    });

    var netScore = Number((correct * p.pos - wrong * p.neg).toFixed(2));
    var maxScore = Number((qList.length * p.pos).toFixed(2));
    var attempted = correct + wrong;
    var accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    return {
      total: qList.length,
      correct: correct,
      wrong: wrong,
      unanswered: unanswered,
      netScore: netScore,
      maxScore: maxScore,
      accuracyPct: accuracyPct,
      weakTopic: weakTopic || (sectionStats[0] ? sectionStats[0].section : p.label),
      sectionStats: sectionStats,
      missedItems: missedItems
    };
  }

  function syncMissedToMistakeDeck(missedItems, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s || !Array.isArray(missedItems) || !missedItems.length) return [];
    var deck = safeReadJson(s, MISTAKE_DECK_KEY, []);
    if (!Array.isArray(deck)) deck = [];

    for (var i = 0; i < missedItems.length; i++) {
      var entry = missedItems[i];
      if (!entry || !entry.id) continue;
      var exists = false;
      for (var j = 0; j < deck.length; j++) {
        if (deck[j] && deck[j].id === entry.id) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        deck.unshift({
          id: String(entry.id),
          exam: String(entry.exam || 'CBT Mock Test'),
          q: String(entry.q || ''),
          a: String(entry.a || ''),
          addedAt: Date.now()
        });
      }
    }
    if (deck.length > 250) deck = deck.slice(0, 250);
    safeWriteJson(s, MISTAKE_DECK_KEY, deck);
    return deck;
  }

  function loadCbtHistory(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return [];
    var list = safeReadJson(s, HISTORY_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function updateStudyStreak(storage, dateIso) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var today = String(dateIso || new Date().toISOString().slice(0, 10));
    if (!s) return { count: 1, lastDate: today };
    var cur = safeReadJson(s, STREAK_KEY, { count: 0, lastDate: '' });
    if (cur.lastDate === today) return cur;
    var prevDate = new Date(today + 'T00:00:00Z');
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    var yesterday = prevDate.toISOString().slice(0, 10);
    var nextCount = cur.lastDate === yesterday ? (Number(cur.count) || 0) + 1 : 1;
    var next = { count: nextCount, lastDate: today };
    safeWriteJson(s, STREAK_KEY, next);
    return next;
  }

  function saveCbtHistory(entry, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s || !entry) return [];
    var list = loadCbtHistory(s);
    if (!entry.date) entry.date = new Date().toISOString().slice(0, 10);
    list.unshift(entry);
    if (list.length > 20) list = list.slice(0, 20);
    safeWriteJson(s, HISTORY_KEY, list);
    updateStudyStreak(s, entry.date);
    return list;
  }

  function collectQuestionsForTrack(trackId) {
    var packs = Array.isArray(root.CSO_CBT_EXAM_PACKS) ? root.CSO_CBT_EXAM_PACKS : [];
    var pool = [];
    packs.forEach(function (pack) {
      if (trackId !== 'all-odisha' && pack.id !== trackId) return;
      (pack.questions || []).forEach(function (q) {
        pool.push({
          id: q.id,
          section: q.section || pack.title,
          exam: pack.title,
          question: q.question,
          question_or: q.question_or || q.question,
          options: q.options,
          options_or: q.options_or || q.options,
          answerIndex: q.answerIndex,
          explanation: q.explanation,
          explanation_or: q.explanation_or || q.explanation
        });
      });
    });

    var sources = [
      { id: 'opsc-oas', label: 'OPSC OAS', mods: root.CSOOpscCourse && root.CSOOpscCourse.MODULES },
      { id: 'osssc-ri', label: 'OSSSC RI/ARI/Amin', mods: root.CSOOssscCourse && root.CSOOssscCourse.MODULES },
      { id: 'otet-osstet', label: 'OTET / OSSTET', mods: root.CSOOtetCourse && root.CSOOtetCourse.MODULES },
      { id: 'oprb', label: 'Odisha Police OPRB', mods: root.CSOOprbCourse && root.CSOOprbCourse.MODULES },
      { id: 'ece', label: 'ECE', mods: root.CSOEceCourse && root.CSOEceCourse.ECE_MODULES }
    ];

    sources.forEach(function (src) {
      if (trackId !== 'all-odisha' && src.id !== trackId) return;
      (src.mods || []).forEach(function (mod) {
        (mod.quiz || []).forEach(function (q) {
          pool.push({
            id: q.id,
            section: mod.title || (src.label + ' Module ' + mod.number),
            exam: src.label + ' Module ' + mod.number,
            question: q.question,
            question_or: q.question_or || q.question,
            options: q.options,
            options_or: q.options_or || q.options,
            answerIndex: q.answerIndex,
            explanation: q.explanation,
            explanation_or: q.explanation_or || q.explanation
          });
        });
      });
    });
    return pool;
  }

  function mountSimulator() {
    var container = document.getElementById('cbt-app-root');
    if (!container) return;

    var timerHandle = null;
    var session = null;

    function stopTimer() {
      if (timerHandle) {
        clearInterval(timerHandle);
        timerHandle = null;
      }
    }

    function renderSetup() {
      stopTimer();
      clear(container);

      var card = el('div', 'cbt-card');
      card.appendChild(el('h2', null, 'Configure Your Timed CBT'));

      var grid = el('div', 'cbt-setup-grid');

      var fTrack = el('div', 'cbt-field');
      var lTrack = el('label', null, 'Exam Track & Marking Scheme');
      lTrack.setAttribute('for', 'cbt-track-select');
      var sTrack = el('select', 'cbt-select');
      sTrack.id = 'cbt-track-select';
      EXAM_PRESETS.forEach(function (p) {
        var opt = el('option', null, p.label + ' (+' + p.pos + ' / -' + p.neg + ')');
        opt.value = p.id;
        sTrack.appendChild(opt);
      });
      fTrack.appendChild(lTrack);
      fTrack.appendChild(sTrack);

      var fCount = el('div', 'cbt-field');
      var lCount = el('label', null, 'Question Count');
      lCount.setAttribute('for', 'cbt-count-select');
      var sCount = el('select', 'cbt-select');
      sCount.id = 'cbt-count-select';
      [10, 15].forEach(function (n) {
        var opt = el('option', null, n + ' Questions');
        opt.value = String(n);
        sCount.appendChild(opt);
      });
      fCount.appendChild(lCount);
      fCount.appendChild(sCount);

      var fTime = el('div', 'cbt-field');
      var lTime = el('label', null, 'Timer Duration');
      lTime.setAttribute('for', 'cbt-time-select');
      var sTime = el('select', 'cbt-select');
      sTime.id = 'cbt-time-select';
      [10, 15].forEach(function (m) {
        var opt = el('option', null, m + ' Minutes');
        opt.value = String(m);
        sTime.appendChild(opt);
      });
      fTime.appendChild(lTime);
      fTime.appendChild(sTime);

      grid.appendChild(fTrack);
      grid.appendChild(fCount);
      grid.appendChild(fTime);
      card.appendChild(grid);

      var startBtn = el('button', 'cbt-btn cbt-btn--primary', 'Start Timed CBT →');
      startBtn.type = 'button';
      startBtn.addEventListener('click', function () {
        var preset = getPresetById(sTrack.value);
        var count = Number(sCount.value) || 10;
        var mins = Number(sTime.value) || 10;
        var pool = collectQuestionsForTrack(preset.id);
        var selected = pool.slice(0, Math.min(count, pool.length));
        if (!selected.length) return;
        session = {
          preset: preset,
          questions: selected,
          responses: {},
          marked: {},
          currentIndex: 0,
          secondsLeft: mins * 60
        };
        startExamLoop();
      });
      card.appendChild(startBtn);
      container.appendChild(card);

      var packs = Array.isArray(root.CSO_CBT_EXAM_PACKS) ? root.CSO_CBT_EXAM_PACKS : [];
      if (packs.length) {
        var packCard = el('div', 'cbt-card');
        packCard.appendChild(el('h2', null, 'Dedicated Odisha Exam Mock Packs (EN / ଓଡ଼ିଆ)'));
        var packGrid = el('div', 'cbt-pack-grid');
        packs.forEach(function (pk) {
          var item = el('article', 'cbt-pack-item');
          item.appendChild(el('span', 'cbt-badge cbt-badge--gold', pk.negLabel));
          item.appendChild(el('h3', 'cbt-pack-title', pk.title));
          item.appendChild(el('p', 'cbt-pack-sub', pk.subtitle));
          var launchBtn = el('button', 'cbt-btn cbt-btn--primary', 'Start Pack (' + pk.questions.length + ' Qs) →');
          launchBtn.type = 'button';
          launchBtn.addEventListener('click', function () {
            var preset = { id: pk.id, label: pk.title, pos: pk.pos, neg: pk.neg };
            var pool = collectQuestionsForTrack(pk.id);
            if (!pool.length) return;
            session = {
              preset: preset,
              questions: pool.slice(0, 15),
              responses: {},
              marked: {},
              currentIndex: 0,
              lang: 'en',
              secondsLeft: (pk.durationMin || 15) * 60
            };
            startExamLoop();
          });
          item.appendChild(launchBtn);
          packGrid.appendChild(item);
        });
        packCard.appendChild(packGrid);
        container.appendChild(packCard);
      }

      var history = loadCbtHistory();
      var histCard = el('div', 'cbt-card');
      histCard.appendChild(el('h3', null, 'Recent Attempts'));
      if (!history.length) {
        histCard.appendChild(el('p', null, 'No CBT attempts recorded yet. Start a test above!'));
      } else {
        var list = el('div', 'cbt-history-list');
        history.slice(0, 6).forEach(function (h) {
          var row = el('div', 'cbt-history-row');
          row.appendChild(el('strong', null, h.examLabel + ' (' + h.total + ' Qs)'));
          row.appendChild(el('span', null, 'Score: ' + h.netScore + ' / ' + h.maxScore + ' · Accuracy: ' + h.accuracyPct + '%'));
          list.appendChild(row);
        });
        histCard.appendChild(list);
      }
      container.appendChild(histCard);
    }

    function submitAttempt() {
      stopTimer();
      var result = scoreAttempt(session.questions, session.responses, session.preset);
      syncMissedToMistakeDeck(result.missedItems);
      saveCbtHistory({
        examId: session.preset.id,
        examLabel: session.preset.label,
        netScore: result.netScore,
        maxScore: result.maxScore,
        accuracyPct: result.accuracyPct,
        weakTopic: result.weakTopic || session.preset.label,
        date: new Date().toISOString().slice(0, 10),
        total: result.total,
        completedAt: Date.now()
      });
      if (typeof fetch === 'function') {
        try {
          fetch('/api/sync', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cbt_attempt: {
                examId: session.preset.id,
                examLabel: session.preset.label,
                score: result.netScore,
                maxScore: result.maxScore,
                accuracyPct: result.accuracyPct,
                weakTopic: result.weakTopic || ''
              }
            })
          }).catch(function () {});
        } catch (_) {}
      }
      renderScorecard(result);
    }

    function startExamLoop() {
      stopTimer();
      renderExam();
      timerHandle = setInterval(function () {
        if (!session) return;
        session.secondsLeft -= 1;
        var timerEl = document.getElementById('cbt-live-timer');
        if (timerEl) {
          timerEl.textContent = '⏱ ' + formatTimer(session.secondsLeft);
          timerEl.classList.toggle('is-warning', session.secondsLeft < 120);
        }
        if (session.secondsLeft <= 0) {
          submitAttempt();
        }
      }, 1000);
    }

    function renderExam() {
      clear(container);
      var idx = session.currentIndex;
      var q = session.questions[idx];

      var lang = session.lang === 'or' ? 'or' : 'en';
      var qText = lang === 'or' && q.question_or ? q.question_or : q.question;
      var qOpts = lang === 'or' && Array.isArray(q.options_or) ? q.options_or : q.options;

      var top = el('div', 'cbt-card cbt-topbar');
      top.appendChild(el('strong', null, session.preset.label + ' (+' + session.preset.pos + ' / -' + session.preset.neg + ')'));
      var topRight = el('div', 'cbt-topbar-right');
      var langBtn = el('button', 'cbt-btn cbt-lang-toggle', lang === 'en' ? 'EN / ଓଡ଼ିଆ' : 'ଓଡ଼ିଆ / EN');
      langBtn.type = 'button';
      langBtn.addEventListener('click', function () {
        session.lang = session.lang === 'or' ? 'en' : 'or';
        renderExam();
      });
      var timerEl = el('div', 'cbt-timer' + (session.secondsLeft < 120 ? ' is-warning' : ''), '⏱ ' + formatTimer(session.secondsLeft));
      timerEl.id = 'cbt-live-timer';
      topRight.appendChild(langBtn);
      topRight.appendChild(timerEl);
      top.appendChild(topRight);
      container.appendChild(top);

      var layout = el('div', 'cbt-exam-layout');

      var qCard = el('div', 'cbt-card');
      qCard.appendChild(el('div', 'cbt-badge', 'Question ' + (idx + 1) + ' of ' + session.questions.length + (q.section ? ' · ' + q.section : '')));
      qCard.appendChild(el('h2', null, qText));

      var optsWrap = el('div', 'cbt-options');
      qOpts.forEach(function (optText, optIdx) {
        var isSel = session.responses[idx] === optIdx;
        var b = el('button', 'cbt-option-btn' + (isSel ? ' is-selected' : ''), String.fromCharCode(65 + optIdx) + '. ' + optText);
        b.type = 'button';
        b.addEventListener('click', function () {
          session.responses[idx] = optIdx;
          renderExam();
        });
        optsWrap.appendChild(b);
      });
      qCard.appendChild(optsWrap);

      var actions = el('div', 'cbt-actions-row');
      var saveNext = el('button', 'cbt-btn cbt-btn--primary', idx + 1 < session.questions.length ? 'Save & Next →' : 'Save');
      saveNext.type = 'button';
      saveNext.addEventListener('click', function () {
        if (idx + 1 < session.questions.length) {
          session.currentIndex += 1;
          renderExam();
        }
      });
      var markBtn = el('button', 'cbt-btn cbt-btn--review', session.marked[idx] ? 'Unmark Review' : 'Mark for Review');
      markBtn.type = 'button';
      markBtn.addEventListener('click', function () {
        session.marked[idx] = !session.marked[idx];
        renderExam();
      });
      var clearBtn = el('button', 'cbt-btn', 'Clear Response');
      clearBtn.type = 'button';
      clearBtn.addEventListener('click', function () {
        delete session.responses[idx];
        renderExam();
      });
      var submitBtn = el('button', 'cbt-btn cbt-btn--danger', 'Submit Test');
      submitBtn.type = 'button';
      submitBtn.addEventListener('click', submitAttempt);

      actions.appendChild(saveNext);
      actions.appendChild(markBtn);
      actions.appendChild(clearBtn);
      actions.appendChild(submitBtn);
      qCard.appendChild(actions);

      var palCard = el('aside', 'cbt-card');
      palCard.appendChild(el('h3', null, 'Question Palette'));
      var palGrid = el('div', 'cbt-palette-grid');
      session.questions.forEach(function (_, pIdx) {
        var st = getPaletteStatus(session, pIdx);
        var cls = 'cbt-palette-btn is-' + st + (pIdx === idx ? ' is-current' : '');
        var pb = el('button', cls, String(pIdx + 1));
        pb.type = 'button';
        pb.addEventListener('click', function () {
          session.currentIndex = pIdx;
          renderExam();
        });
        palGrid.appendChild(pb);
      });
      palCard.appendChild(palGrid);

      layout.appendChild(qCard);
      layout.appendChild(palCard);
      container.appendChild(layout);
    }

    function renderScorecard(result) {
      clear(container);

      var card = el('div', 'cbt-card');
      card.appendChild(el('h2', null, 'CBT Scorecard — ' + session.preset.label));

      var stats = el('div', 'cbt-stats-grid');
      [
        ['Net Score', result.netScore + ' / ' + result.maxScore],
        ['Correct', String(result.correct)],
        ['Wrong', String(result.wrong)],
        ['Unanswered', String(result.unanswered)],
        ['Accuracy', result.accuracyPct + '%']
      ].forEach(function (pair) {
        var box = el('div', 'cbt-stat-box');
        box.appendChild(el('div', null, pair[0]));
        box.appendChild(el('div', 'cbt-stat-val', pair[1]));
        stats.appendChild(box);
      });
      card.appendChild(stats);

      if (Array.isArray(result.sectionStats) && result.sectionStats.length) {
        var secWrap = el('div', 'cbt-section-breakdown');
        secWrap.appendChild(el('h3', null, 'Section-Wise Accuracy Breakdown'));
        var secGrid = el('div', 'cbt-section-grid');
        result.sectionStats.forEach(function (st) {
          var row = el('div', 'cbt-section-row');
          row.appendChild(el('strong', null, st.section));
          row.appendChild(el('span', null, st.correct + '/' + st.total + ' correct (' + st.accuracyPct + '%)'));
          secGrid.appendChild(row);
        });
        secWrap.appendChild(secGrid);
        card.appendChild(secWrap);
      }

      if (result.missedItems.length) {
        card.appendChild(el('p', 'cbt-badge cbt-badge--gold', result.missedItems.length + ' missed question(s) synced to Revise Again (Mistake Deck)'));
      }

      var btnRow = el('div', 'cbt-actions-row');
      var retake = el('button', 'cbt-btn cbt-btn--primary', '🔄 Retake Test');
      retake.type = 'button';
      retake.addEventListener('click', renderSetup);
      var libLink = el('a', 'cbt-btn', '🔁 Open Study Library Revise Again');
      libLink.href = '/study-library/';
      btnRow.appendChild(retake);
      btnRow.appendChild(libLink);
      card.appendChild(btnRow);
      container.appendChild(card);

      var revCard = el('div', 'cbt-card');
      revCard.appendChild(el('h3', null, 'Answer Key & Explanation Review'));
      session.questions.forEach(function (q, i) {
        var item = el('div', 'cbt-review-item');
        var chosen = session.responses[i];
        var status = chosen === undefined ? 'Unanswered' : (chosen === q.answerIndex ? '✓ Correct' : '✗ Wrong');
        item.appendChild(el('strong', null, 'Q' + (i + 1) + ' (' + status + '): ' + q.question));
        item.appendChild(el('p', null, 'Correct Answer: ' + q.options[q.answerIndex]));
        if (q.explanation) item.appendChild(el('p', null, q.explanation));
        revCard.appendChild(item);
      });
      container.appendChild(revCard);
    }

    renderSetup();
  }

  var api = {
    MISTAKE_DECK_KEY: MISTAKE_DECK_KEY,
    HISTORY_KEY: HISTORY_KEY,
    STREAK_KEY: STREAK_KEY,
    EXAM_PRESETS: EXAM_PRESETS,
    getPresetById: getPresetById,
    formatTimer: formatTimer,
    getPaletteStatus: getPaletteStatus,
    scoreAttempt: scoreAttempt,
    syncMissedToMistakeDeck: syncMissedToMistakeDeck,
    loadCbtHistory: loadCbtHistory,
    saveCbtHistory: saveCbtHistory,
    updateStudyStreak: updateStudyStreak
  };

  root.CSOCbtSimulator = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSimulator);
    } else {
      mountSimulator();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
