/* v207: Bilingual Daily Odisha Current Affairs & 5-Question Quiz Feed.
   Strict CSP compliance: document.createElement + textContent + addEventListener only. */
(function (root) {
  'use strict';

  var STREAK_STORAGE_KEY = 'cso_ca_quiz_streak_v1';
  var CAPSULE_STREAK_KEY = 'cso_capsule_streak_v1';
  var LANG_STORAGE_KEY = 'cso_ca_lang_v1';
  var EMPTY_MSG = "Today's Odisha Current Affairs capsule is being updated — check back shortly or practice a full CBT Mock Test";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function readStorage(key, fallback) {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function normalizeCapsule(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var quiz = Array.isArray(raw.quiz) ? raw.quiz.slice(0, 5) : [];
    return {
      id: String(raw.id || ''),
      capsule_date: String(raw.capsule_date || ''),
      title_en: String(raw.title_en || ''),
      title_or: String(raw.title_or || ''),
      highlights_en: Array.isArray(raw.highlights_en) ? raw.highlights_en : [],
      highlights_or: Array.isArray(raw.highlights_or) ? raw.highlights_or : [],
      quiz: quiz.map(function (q) {
        return {
          question_en: String(q.question_en || q.question || ''),
          question_or: String(q.question_or || ''),
          options_en: Array.isArray(q.options_en) ? q.options_en : (Array.isArray(q.options) ? q.options : []),
          options_or: Array.isArray(q.options_or) ? q.options_or : [],
          answer_index: Number.isInteger(Number(q.answer_index)) ? Number(q.answer_index) : 0,
          explanation_en: String(q.explanation_en || q.explanation || ''),
          explanation_or: String(q.explanation_or || '')
        };
      }),
      category: String(raw.category || 'Odisha')
    };
  }

  function scoreQuizAnswer(question, selectedIndex) {
    var ans = Number.isInteger(Number(question && question.answer_index)) ? Number(question.answer_index) : 0;
    return {
      isCorrect: Number(selectedIndex) === ans,
      correctIndex: ans
    };
  }

  function recordDailyStreak(capsuleDate, score, total, storageObj) {
    var today = String(capsuleDate || new Date().toISOString().slice(0, 10));
    var store = storageObj || (typeof localStorage !== 'undefined' ? localStorage : null);
    var prev = { streak: 0, lastCompletedDate: '', lastScore: 0, lastTotal: 0 };
    if (store) {
      try {
        var raw = store.getItem(STREAK_STORAGE_KEY);
        if (raw) prev = JSON.parse(raw);
      } catch (_) {}
    }

    var streak = Number(prev.streak) || 0;
    if (prev.lastCompletedDate !== today) {
      var d = new Date(today + 'T00:00:00Z');
      var yesterday = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
      streak = prev.lastCompletedDate === yesterday ? streak + 1 : 1;
    }

    var nextState = {
      streak: streak,
      lastCompletedDate: today,
      lastScore: Number(score) || 0,
      lastTotal: Number(total) || 0
    };

    if (store) {
      try {
        store.setItem(STREAK_STORAGE_KEY, JSON.stringify(nextState));
        var capRaw = store.getItem(CAPSULE_STREAK_KEY);
        var cap = capRaw ? JSON.parse(capRaw) : { streak: 0, lastCompletedDate: '', date: today, answered: {}, score: 0 };
        if (cap.lastCompletedDate !== today) {
          cap.streak = streak;
          cap.lastCompletedDate = today;
          cap.date = today;
          cap.score = Number(score) || 0;
          store.setItem(CAPSULE_STREAK_KEY, JSON.stringify(cap));
        }
      } catch (_) {}
    }

    if (typeof fetch === 'function') {
      try {
        var pct = total > 0 ? Math.round((score / total) * 100) : 0;
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mockScores: [
              {
                id: 'ca-quiz-' + today,
                exam: 'Daily Odisha Current Affairs (' + today + ')',
                score: Number(score) || 0,
                max: Number(total) || 5,
                accuracy: pct + '%'
              }
            ]
          })
        }).catch(function () {});
      } catch (_) {}
    }

    return nextState;
  }

  function renderCurrentAffairsPanel(container, items, options) {
    if (!container) return;
    var opts = options || {};
    var compact = Boolean(opts.compact || container.getAttribute('data-compact') === 'true');
    var list = Array.isArray(items) ? items.map(normalizeCapsule).filter(Boolean) : [];
    var lang = opts.lang || (typeof localStorage !== 'undefined' ? (localStorage.getItem(LANG_STORAGE_KEY) || 'en') : 'en');
    if (lang !== 'en' && lang !== 'or') lang = 'en';

    var activeIdx = 0;
    var qIdx = 0;
    var answeredMap = {};
    var score = 0;

    function getText(enVal, orVal) {
      if (lang === 'or' && orVal && String(orVal).trim()) return String(orVal);
      return String(enVal || '');
    }

    function render() {
      clear(container);

      var streakInfo = readStorage(STREAK_STORAGE_KEY, { streak: 0 });
      var head = el('div', 'cso-ca-head');
      var titleWrap = el('div', 'cso-ca-title-wrap');
      titleWrap.appendChild(el('span', 'cso-ca-kicker', 'DAILY ODISHA & NATIONAL BRIEF · EN / ଓଡ଼ିଆ'));
      var heading = el('h2', 'cso-ca-heading', lang === 'or' ? 'ଦୈନିକ ଓଡ଼ିଶା କରେଣ୍ଟ ଆଫେୟାର୍ସ ଓ ୫-ପ୍ରଶ୍ନ କୁଇଜ୍' : 'Daily Odisha Current Affairs & 5-Question Quiz');
      heading.id = 'cso-ca-heading';
      titleWrap.appendChild(heading);

      var controls = el('div', 'cso-ca-controls');
      controls.appendChild(el('span', 'cso-ca-streak-pill', '🔥 Streak: ' + (Number(streakInfo.streak) || 0) + 'd'));

      var langGroup = el('div', 'cso-ca-lang-group');
      langGroup.setAttribute('role', 'group');
      langGroup.setAttribute('aria-label', 'Current affairs language');

      var btnEn = el('button', 'cso-ca-lang-btn' + (lang === 'en' ? ' is-active' : ''), 'EN');
      btnEn.type = 'button';
      btnEn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
      btnEn.addEventListener('click', function () {
        lang = 'en';
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_STORAGE_KEY, 'en'); } catch (_) {}
        render();
      });

      var btnOr = el('button', 'cso-ca-lang-btn' + (lang === 'or' ? ' is-active' : ''), 'ଓଡ଼ିଆ');
      btnOr.type = 'button';
      btnOr.setAttribute('aria-pressed', lang === 'or' ? 'true' : 'false');
      btnOr.addEventListener('click', function () {
        lang = 'or';
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_STORAGE_KEY, 'or'); } catch (_) {}
        render();
      });

      langGroup.appendChild(btnEn);
      langGroup.appendChild(btnOr);
      controls.appendChild(langGroup);
      head.appendChild(titleWrap);
      head.appendChild(controls);
      container.appendChild(head);

      if (!list.length) {
        var emptyBox = el('div', 'cso-ca-empty');
        emptyBox.appendChild(el('p', 'cso-ca-empty-text', EMPTY_MSG));
        var mockLink = el('a', 'cso-ca-btn cso-ca-btn--primary', 'Practice CBT Mock Test →');
        mockLink.href = '/study-library/cbt-mock-test/';
        emptyBox.appendChild(mockLink);
        container.appendChild(emptyBox);
        return;
      }

      if (!compact && list.length > 1) {
        var dateTabs = el('div', 'cso-ca-date-tabs');
        list.forEach(function (cap, idx) {
          var db = el('button', 'cso-ca-date-btn' + (idx === activeIdx ? ' is-active' : ''), cap.capsule_date || ('Capsule #' + (idx + 1)));
          db.type = 'button';
          db.addEventListener('click', function () {
            activeIdx = idx;
            qIdx = 0;
            answeredMap = {};
            score = 0;
            render();
          });
          dateTabs.appendChild(db);
        });
        container.appendChild(dateTabs);
      }

      var capsule = list[activeIdx] || list[0];
      container.appendChild(el('h3', 'cso-ca-capsule-title', (capsule.capsule_date ? capsule.capsule_date + ' · ' : '') + getText(capsule.title_en, capsule.title_or)));

      var highlights = lang === 'or' && capsule.highlights_or.length ? capsule.highlights_or : capsule.highlights_en;
      if (highlights.length) {
        var details = el('details', 'cso-ca-highlights');
        if (!compact) details.open = true;
        var summary = el('summary', 'cso-ca-highlights-summary', (lang === 'or' ? 'ମୁଖ୍ୟ ବିନ୍ଦୁ (' : 'Odisha & National Highlights (') + highlights.length + ')');
        details.appendChild(summary);
        var ul = el('ul', 'cso-ca-highlights-list');
        highlights.forEach(function (h) {
          ul.appendChild(el('li', '', h));
        });
        details.appendChild(ul);
        container.appendChild(details);
      }

      var quiz = capsule.quiz || [];
      if (!quiz.length) return;

      var quizBox = el('div', 'cso-ca-quiz-box');
      var answeredCount = Object.keys(answeredMap).length;
      var meta = el('div', 'cso-ca-quiz-meta');
      meta.appendChild(el('span', '', (lang === 'or' ? 'ପ୍ରଶ୍ନ ' : 'Question ') + (qIdx + 1) + ' / ' + quiz.length));
      meta.appendChild(el('span', '', 'Score: ' + score + ' / ' + quiz.length));
      quizBox.appendChild(meta);

      var qItem = quiz[qIdx] || quiz[0];
      quizBox.appendChild(el('p', 'cso-ca-quiz-question', getText(qItem.question_en, qItem.question_or)));

      var optsList = lang === 'or' && qItem.options_or.length === qItem.options_en.length
        ? qItem.options_or
        : qItem.options_en;

      var optsWrap = el('div', 'cso-ca-quiz-options');
      var prevChoice = answeredMap[qIdx];
      var hasAnswered = prevChoice !== undefined;

      optsList.forEach(function (optText, idx) {
        var optBtn = el('button', 'cso-ca-quiz-opt');
        optBtn.type = 'button';
        optBtn.appendChild(el('span', '', String.fromCharCode(65 + idx) + '.'));
        optBtn.appendChild(el('span', '', optText));

        if (hasAnswered) {
          optBtn.disabled = true;
          if (idx === qItem.answer_index) optBtn.classList.add('is-correct');
          else if (idx === prevChoice && prevChoice !== qItem.answer_index) optBtn.classList.add('is-wrong');
        }

        optBtn.addEventListener('click', function () {
          if (answeredMap[qIdx] !== undefined) return;
          var res = scoreQuizAnswer(qItem, idx);
          answeredMap[qIdx] = idx;
          if (res.isCorrect) score += 1;
          if (Object.keys(answeredMap).length === quiz.length) {
            recordDailyStreak(capsule.capsule_date, score, quiz.length);
          }
          render();
        });

        optsWrap.appendChild(optBtn);
      });
      quizBox.appendChild(optsWrap);

      if (hasAnswered) {
        var wasRight = prevChoice === qItem.answer_index;
        var expText = getText(qItem.explanation_en, qItem.explanation_or);
        var fb = el('div', 'cso-ca-quiz-feedback', (wasRight ? '✓ Correct! ' : '✗ Incorrect. ') + expText);
        quizBox.appendChild(fb);
      }

      var nav = el('div', 'cso-ca-quiz-nav');
      if (qIdx > 0) {
        var prevBtn = el('button', 'cso-ca-btn', '← Previous');
        prevBtn.type = 'button';
        prevBtn.addEventListener('click', function () {
          qIdx -= 1;
          render();
        });
        nav.appendChild(prevBtn);
      }
      if (qIdx < quiz.length - 1) {
        var nextBtn = el('button', 'cso-ca-btn cso-ca-btn--primary', 'Next Question →');
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', function () {
          qIdx += 1;
          render();
        });
        nav.appendChild(nextBtn);
      } else if (answeredCount === quiz.length) {
        var doneBadge = el('span', 'cso-ca-streak-pill', '✅ Daily Quiz Complete (' + score + '/' + quiz.length + ')');
        nav.appendChild(doneBadge);
      }

      if (compact) {
        var fullLink = el('a', 'cso-ca-btn', 'Open Full Feed →');
        fullLink.href = '/study-library/#cso-current-affairs-panel';
        nav.appendChild(fullLink);
      }

      quizBox.appendChild(nav);
      container.appendChild(quizBox);
    }

    render();
  }

  function initCurrentAffairsFeed() {
    if (typeof document === 'undefined') return;
    var panel = document.getElementById('cso-current-affairs-panel');
    if (!panel) return;

    fetch('/api/public/current-affairs?limit=5', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : { items: [] }; })
      .then(function (data) {
        renderCurrentAffairsPanel(panel, Array.isArray(data && data.items) ? data.items : []);
      })
      .catch(function () {
        renderCurrentAffairsPanel(panel, []);
      });
  }

  var api = {
    EMPTY_MSG: EMPTY_MSG,
    normalizeCapsule: normalizeCapsule,
    scoreQuizAnswer: scoreQuizAnswer,
    recordDailyStreak: recordDailyStreak,
    renderCurrentAffairsPanel: renderCurrentAffairsPanel,
    initCurrentAffairsFeed: initCurrentAffairsFeed
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.__csoCurrentAffairs = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCurrentAffairsFeed);
    } else {
      initCurrentAffairsFeed();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
