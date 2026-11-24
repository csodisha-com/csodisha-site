(function (root) {
  'use strict';

  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';

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

  function loadProgress(progressKey, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return { completedModules: [] };
    var data = safeReadJson(s, progressKey, { completedModules: [] });
    var list = Array.isArray(data.completedModules)
      ? data.completedModules.filter(function (id) { return typeof id === 'string'; })
      : [];
    return { completedModules: list };
  }

  function saveProgress(progressKey, completedModules, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return { completedModules: completedModules };
    var unique = [];
    for (var i = 0; i < completedModules.length; i++) {
      if (unique.indexOf(completedModules[i]) === -1) unique.push(completedModules[i]);
    }
    var payload = { completedModules: unique, updatedAt: Date.now() };
    safeWriteJson(s, progressKey, payload);
    return payload;
  }

  function toggleModuleCompletion(progressKey, moduleId, storage) {
    var current = loadProgress(progressKey, storage).completedModules;
    var idx = current.indexOf(moduleId);
    if (idx === -1) current.push(moduleId);
    else current.splice(idx, 1);
    return saveProgress(progressKey, current, storage);
  }

  function pushToMistakeDeck(entry, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s || !entry || !entry.id) return [];
    var deck = safeReadJson(s, MISTAKE_DECK_KEY, []);
    if (!Array.isArray(deck)) deck = [];
    var exists = false;
    for (var i = 0; i < deck.length; i++) {
      if (deck[i] && deck[i].id === entry.id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      deck.unshift({
        id: String(entry.id),
        exam: String(entry.exam || 'Course Hub'),
        q: String(entry.q || ''),
        a: String(entry.a || ''),
        addedAt: Date.now()
      });
      if (deck.length > 250) deck = deck.slice(0, 250);
      safeWriteJson(s, MISTAKE_DECK_KEY, deck);
    }
    return deck;
  }

  function evaluateQuizAnswer(examPrefix, moduleObj, questionId, selectedIndex, storage) {
    if (!moduleObj || !Array.isArray(moduleObj.quiz)) return null;
    var question = null;
    for (var i = 0; i < moduleObj.quiz.length; i++) {
      if (moduleObj.quiz[i].id === questionId) {
        question = moduleObj.quiz[i];
        break;
      }
    }
    if (!question) return null;
    var isCorrect = selectedIndex === question.answerIndex;
    if (!isCorrect) {
      pushToMistakeDeck({
        id: question.id,
        exam: examPrefix + ' Module ' + moduleObj.number,
        q: question.question,
        a: question.options[question.answerIndex] + ' — ' + question.explanation
      }, storage);
    }
    return {
      questionId: question.id,
      isCorrect: isCorrect,
      correctIndex: question.answerIndex,
      explanation: question.explanation
    };
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function updateProgressBar(completedModules, total) {
    var count = completedModules.length;
    var countEl = document.getElementById('ece-progress-count');
    var fillEl = document.getElementById('ece-progress-fill');
    var barEl = document.getElementById('ece-progress-track');
    if (countEl) countEl.textContent = count + ' of ' + total + ' Modules Completed';
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(count));
      barEl.setAttribute('aria-valuemax', String(total));
    }
    if (fillEl) {
      fillEl.className = 'ece-progress-fill';
      var pct = total > 0 ? Math.round((count / total) * 100) : 0;
      if (pct >= 100) fillEl.classList.add('ece-progress-fill--100');
      else if (pct >= 80) fillEl.classList.add('ece-progress-fill--80');
      else if (pct >= 60) fillEl.classList.add('ece-progress-fill--60');
      else if (pct >= 40) fillEl.classList.add('ece-progress-fill--40');
      else if (pct >= 20) fillEl.classList.add('ece-progress-fill--20');
    }
  }

  function buildQuizSection(examPrefix, mod) {
    var box = el('div', 'ece-quiz-box');
    var header = el('div', 'ece-quiz-header');
    header.appendChild(el('h3', 'ece-section-heading', 'Module ' + mod.number + ' Self-Check Quiz (' + mod.quiz.length + ' Questions)'));
    var scoreBadge = el('span', 'ece-quiz-score', '0 / ' + mod.quiz.length + ' answered');
    header.appendChild(scoreBadge);
    box.appendChild(header);

    var state = {};
    var questionsWrap = el('div');

    function refreshScore() {
      var answered = Object.keys(state).length;
      var correct = 0;
      for (var k in state) {
        if (Object.prototype.hasOwnProperty.call(state, k) && state[k]) correct++;
      }
      scoreBadge.textContent = answered === 0
        ? '0 / ' + mod.quiz.length + ' answered'
        : 'Score: ' + correct + ' / ' + mod.quiz.length + ' (' + answered + ' answered)';
    }

    function renderQuestions() {
      while (questionsWrap.firstChild) questionsWrap.removeChild(questionsWrap.firstChild);
      mod.quiz.forEach(function (q, qIdx) {
        var qCard = el('div', 'ece-question-card');
        qCard.appendChild(el('p', 'ece-question-text', (qIdx + 1) + '. ' + q.question));

        var optsGrid = el('div', 'ece-options-grid');
        var feedback = el('div', 'ece-quiz-feedback');
        feedback.hidden = true;

        var buttons = [];
        q.options.forEach(function (optText, optIdx) {
          var btn = el('button', 'ece-option-btn', optText);
          btn.type = 'button';
          btn.addEventListener('click', function () {
            if (Object.prototype.hasOwnProperty.call(state, q.id)) return;
            var result = evaluateQuizAnswer(examPrefix, mod, q.id, optIdx);
            state[q.id] = result.isCorrect;

            buttons.forEach(function (b, bIdx) {
              b.disabled = true;
              if (bIdx === result.correctIndex) b.classList.add('is-correct');
              else if (bIdx === optIdx && !result.isCorrect) b.classList.add('is-wrong');
            });

            feedback.hidden = false;
            feedback.className = 'ece-quiz-feedback ' + (result.isCorrect ? 'ece-quiz-feedback--ok' : 'ece-quiz-feedback--err');
            feedback.textContent = (result.isCorrect ? 'Correct: ' : 'Added to Mistake Deck for review: ') + result.explanation;
            refreshScore();
          });
          buttons.push(btn);
          optsGrid.appendChild(btn);
        });

        qCard.appendChild(optsGrid);
        qCard.appendChild(feedback);
        questionsWrap.appendChild(qCard);
      });
    }

    renderQuestions();
    box.appendChild(questionsWrap);

    var actions = el('div', 'ece-quiz-actions');
    var resetBtn = el('button', 'ece-reset-quiz-btn', 'Reset Quiz');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', function () {
      state = {};
      renderQuestions();
      refreshScore();
    });
    actions.appendChild(resetBtn);

    var note = el('span', 'ece-mistake-note');
    note.appendChild(document.createTextNode('Missed questions auto-sync to your '));
    var link = el('a', '', 'Study Library Mistake Deck');
    link.href = '/study-library/#mistake-deck-section';
    note.appendChild(link);
    note.appendChild(document.createTextNode('.'));
    actions.appendChild(note);

    box.appendChild(actions);
    return box;
  }

  function renderCourseHub(config) {
    var container = document.getElementById('ece-course-modules');
    var tocNav = document.getElementById('ece-toc-nav');
    if (!container || !config || !Array.isArray(config.modules)) return;

    var progressKey = config.progressKey;
    var examPrefix = config.examPrefix || 'Course';
    var modules = config.modules;

    var progress = loadProgress(progressKey);
    updateProgressBar(progress.completedModules, modules.length);

    if (tocNav) {
      while (tocNav.firstChild) tocNav.removeChild(tocNav.firstChild);
      modules.forEach(function (mod) {
        var tocLink = el('a', 'ece-toc-link', 'Module ' + mod.number);
        tocLink.href = '#' + mod.id;
        tocNav.appendChild(tocLink);
      });
    }

    while (container.firstChild) container.removeChild(container.firstChild);

    if (!modules.length) {
      var emptyCard = el('article', 'ece-module-card');
      emptyCard.appendChild(el('h2', 'ece-module-title', 'No items published yet'));
      emptyCard.appendChild(el('p', 'ece-module-subtitle-or', 'No items published yet — add categories or content in Admin Studio.'));
      container.appendChild(emptyCard);
      return;
    }

    modules.forEach(function (mod) {
      var isDone = progress.completedModules.indexOf(mod.id) !== -1;
      var card = el('article', 'ece-module-card' + (isDone ? ' is-completed' : ''));
      card.id = mod.id;

      var head = el('div', 'ece-module-head');
      var titleGroup = el('div');
      titleGroup.appendChild(el('span', 'ece-module-kicker', 'Module ' + mod.number + ' of ' + modules.length));
      titleGroup.appendChild(el('h2', 'ece-module-title', mod.title));
      titleGroup.appendChild(el('p', 'ece-module-subtitle-or', mod.titleOr));
      head.appendChild(titleGroup);

      var completeBtn = el('button', 'ece-complete-btn', isDone ? '✓ Completed' : '✓ Mark Module Complete');
      completeBtn.type = 'button';
      completeBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      completeBtn.addEventListener('click', function () {
        var updated = toggleModuleCompletion(progressKey, mod.id);
        var nowDone = updated.completedModules.indexOf(mod.id) !== -1;
        completeBtn.setAttribute('aria-pressed', nowDone ? 'true' : 'false');
        completeBtn.textContent = nowDone ? '✓ Completed' : '✓ Mark Module Complete';
        card.classList.toggle('is-completed', nowDone);
        updateProgressBar(updated.completedModules, modules.length);
      });
      head.appendChild(completeBtn);
      card.appendChild(head);

      var outBlock = el('div', 'ece-section-block');
      outBlock.appendChild(el('h3', 'ece-section-heading', 'Learning Outcomes'));
      var outList = el('ul', 'ece-outcomes-list');
      mod.outcomes.forEach(function (item) {
        outList.appendChild(el('li', '', item));
      });
      outBlock.appendChild(outList);
      card.appendChild(outBlock);

      var diagBlock = el('div', 'ece-section-block');
      diagBlock.appendChild(el('h3', 'ece-section-heading', mod.diagramTitle));
      var diagGrid = el('div', 'ece-diagram-grid');
      mod.diagramNodes.forEach(function (node) {
        var diagCard = el('div', 'ece-diagram-node');
        diagCard.appendChild(el('div', 'ece-diagram-stage', node.stage));
        diagCard.appendChild(el('div', 'ece-diagram-title', node.title));
        diagCard.appendChild(el('p', 'ece-diagram-detail', node.detail));
        diagGrid.appendChild(diagCard);
      });
      diagBlock.appendChild(diagGrid);
      card.appendChild(diagBlock);

      var notesBlock = el('div', 'ece-section-block');
      notesBlock.appendChild(el('h3', 'ece-section-heading', 'Key Study Notes'));
      var notesList = el('ul', 'ece-notes-list');
      mod.notes.forEach(function (note) {
        var li = el('li');
        li.appendChild(el('strong', '', note.lead + ' '));
        li.appendChild(document.createTextNode(note.text));
        notesList.appendChild(li);
      });
      notesBlock.appendChild(notesList);
      card.appendChild(notesBlock);

      var refsBlock = el('div', 'ece-section-block');
      refsBlock.appendChild(el('h3', 'ece-section-heading', 'Reference Books & Official Guidelines'));
      var refsList = el('ul', 'ece-refs-list');
      mod.references.forEach(function (ref) {
        var li = el('li');
        var a = el('a', '', ref.label);
        a.href = ref.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.appendChild(a);
        refsList.appendChild(li);
      });
      refsBlock.appendChild(refsList);
      card.appendChild(refsBlock);

      card.appendChild(buildQuizSection(examPrefix, mod));
      container.appendChild(card);
    });
  }

  function mount(config) {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        renderCourseHub(config);
      });
    } else {
      renderCourseHub(config);
    }
  }

  var api = {
    MISTAKE_DECK_KEY: MISTAKE_DECK_KEY,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    toggleModuleCompletion: toggleModuleCompletion,
    pushToMistakeDeck: pushToMistakeDeck,
    evaluateQuizAnswer: evaluateQuizAnswer,
    renderCourseHub: renderCourseHub,
    mount: mount
  };

  root.CSOCourseHub = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
