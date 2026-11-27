/* Common Sense Odisha — Interactive 25-MCQ "Test Yourself" Practice Drill (v387, Strict CSP)
 * Mounts inside #cso-article-quiz-root on /guides/<slug> and /jobs/<slug> detail pages ONLY.
 * Supports:
 *  - Mode Switcher: ⚡ 5-Question Quick Drill (default) vs 📚 Full 25-MCQ Set (paginated 5/page)
 *  - Instant right/wrong visual feedback + bilingual EN / ଓଡ଼ିଆ factual explanations
 *  - Live score counter + ↻ Retry / Shuffle button
 * Strict CSP: DOM APIs only, zero inline style/on* attributes.
 */
(function (window, document) {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function isOdiaActive() {
    try {
      var dl = document.documentElement.getAttribute('data-cso-lang') || document.documentElement.getAttribute('data-lang') || '';
      if (dl === 'or') return true;
      var saved = localStorage.getItem('cso_lang_pref') || localStorage.getItem('cso_lang') || '';
      return saved === 'or';
    } catch (_) {
      return false;
    }
  }

  function readEmbeddedData() {
    var tag = document.getElementById('cso-article-quiz-data');
    if (!tag || !tag.textContent) return null;
    try {
      var parsed = JSON.parse(tag.textContent);
      return (parsed && Array.isArray(parsed.questions) && parsed.questions.length) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function shuffleCopy(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function renderQuizCard(root, data) {
    if (!root || !data || !Array.isArray(data.questions) || !data.questions.length) return;
    var allQuestions = data.questions.slice(0, 25);
    var state = {
      mode: 'quick', // 'quick' (5) | 'full' (25, 5/page)
      page: 1,
      questions: allQuestions.slice(),
      answers: {}, // q.id -> selectedIdx
      lang: isOdiaActive() ? 'or' : 'en'
    };

    function activePool() {
      return state.mode === 'quick' ? state.questions.slice(0, Math.min(5, state.questions.length)) : state.questions;
    }

    function computeScore() {
      var pool = activePool();
      var correct = 0;
      var attempted = 0;
      pool.forEach(function (q) {
        if (Object.prototype.hasOwnProperty.call(state.answers, q.id)) {
          attempted += 1;
          if (state.answers[q.id] === q.correct_index) correct += 1;
        }
      });
      return { correct: correct, attempted: attempted, total: pool.length };
    }

    function draw() {
      clear(root);
      var isOr = state.lang === 'or';
      var pool = activePool();
      var totalPages = Math.max(1, Math.ceil(pool.length / 5));
      if (state.page > totalPages) state.page = 1;
      var startIdx = (state.page - 1) * 5;
      var pageQuestions = pool.slice(startIdx, startIdx + 5);
      var sc = computeScore();

      var card = el('div', 'cso-aq-card');

      // Header
      var head = el('div', 'cso-aq-head');
      var titleBox = el('div', 'cso-aq-title-box');
      titleBox.appendChild(el('span', 'cso-aq-eyebrow', isOr ? '🧠 ଅଭ୍ୟାସ କ୍ୱିଜ୍ (EN / ଓଡ଼ିଆ)' : '🧠 INTERACTIVE PRACTICE DRILL (EN / ଓଡ଼ିଆ)'));
      titleBox.appendChild(el('h2', 'cso-aq-title', isOr ? 'ନିଜକୁ ପରୀକ୍ଷା କରନ୍ତୁ — ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପ୍ରଶ୍ନୋତ୍ତର' : 'Test Yourself: Interactive Practice Drill'));
      head.appendChild(titleBox);

      var controls = el('div', 'cso-aq-controls');
      var langBtn = el('button', 'cso-aq-btn cso-aq-btn--ghost', isOr ? 'English' : 'ଓଡ଼ିଆ');
      langBtn.type = 'button';
      langBtn.addEventListener('click', function () {
        state.lang = state.lang === 'or' ? 'en' : 'or';
        draw();
      });

      var scorePill = el('span', 'cso-aq-score', (isOr ? 'ସ୍କୋର: ' : 'Score: ') + sc.correct + ' / ' + sc.total);
      var retryBtn = el('button', 'cso-aq-btn', isOr ? '↻ ପୁନଃ ଚେଷ୍ଟା / ସଫଲ୍' : '↻ Retry / Shuffle');
      retryBtn.type = 'button';
      retryBtn.addEventListener('click', function () {
        state.answers = {};
        state.page = 1;
        state.questions = shuffleCopy(allQuestions);
        draw();
      });
      controls.append(scorePill, langBtn, retryBtn);
      head.appendChild(controls);
      card.appendChild(head);

      // Mode Switcher Pills
      var modeBar = el('div', 'cso-aq-mode-bar');
      modeBar.setAttribute('role', 'tablist');
      modeBar.setAttribute('aria-label', 'Quiz mode selector');

      var quickBtn = el('button', 'cso-aq-mode-pill' + (state.mode === 'quick' ? ' is-active' : ''), isOr ? '⚡ ୫-ପ୍ରଶ୍ନ ତ୍ୱରିତ ଅଭ୍ୟାସ' : '⚡ 5-Question Quick Drill');
      quickBtn.type = 'button';
      quickBtn.setAttribute('role', 'tab');
      quickBtn.setAttribute('aria-selected', String(state.mode === 'quick'));
      quickBtn.addEventListener('click', function () {
        state.mode = 'quick';
        state.page = 1;
        draw();
      });

      var fullBtn = el('button', 'cso-aq-mode-pill' + (state.mode === 'full' ? ' is-active' : ''), isOr ? ('📚 ସମ୍ପୂର୍ଣ୍ଣ ' + allQuestions.length + '-MCQ ସେଟ୍') : ('📚 Full ' + allQuestions.length + '-MCQ Set'));
      fullBtn.type = 'button';
      fullBtn.setAttribute('role', 'tab');
      fullBtn.setAttribute('aria-selected', String(state.mode === 'full'));
      fullBtn.addEventListener('click', function () {
        state.mode = 'full';
        state.page = 1;
        draw();
      });

      modeBar.append(quickBtn, fullBtn);
      card.appendChild(modeBar);

      // Questions List
      var qList = el('div', 'cso-aq-list');
      pageQuestions.forEach(function (q, localIdx) {
        var qNum = startIdx + localIdx + 1;
        var qBox = el('article', 'cso-aq-item');
        var qMeta = el('div', 'cso-aq-qmeta');
        qMeta.appendChild(el('span', 'cso-aq-qnum', 'Q' + qNum));
        if (q.tag) qMeta.appendChild(el('span', 'cso-aq-qtag', q.tag));
        qBox.appendChild(qMeta);

        qBox.appendChild(el('p', 'cso-aq-qtext', isOr ? (q.question_or || q.question_en) : q.question_en));

        var opts = isOr && Array.isArray(q.options_or) ? q.options_or : q.options_en;
        var hasAns = Object.prototype.hasOwnProperty.call(state.answers, q.id);
        var chosenIdx = hasAns ? state.answers[q.id] : -1;

        var optGrid = el('div', 'cso-aq-opts');
        opts.forEach(function (optText, idx) {
          var cls = 'cso-aq-opt';
          if (hasAns) {
            if (idx === q.correct_index) cls += ' is-correct';
            else if (idx === chosenIdx) cls += ' is-wrong';
          }
          var oBtn = el('button', cls);
          oBtn.type = 'button';
          oBtn.disabled = hasAns;
          oBtn.appendChild(el('span', 'cso-aq-opt-key', String.fromCharCode(65 + idx)));
          oBtn.appendChild(el('span', 'cso-aq-opt-txt', optText));
          oBtn.addEventListener('click', function () {
            state.answers[q.id] = idx;
            draw();
          });
          optGrid.appendChild(oBtn);
        });
        qBox.appendChild(optGrid);

        if (hasAns) {
          var isRight = chosenIdx === q.correct_index;
          var exp = el('div', 'cso-aq-exp ' + (isRight ? 'is-right' : 'is-wrong'));
          exp.appendChild(el('strong', '', isRight ? (isOr ? '✓ ସଠିକ୍ ଉତ୍ତର! ' : '✓ Correct! ') : (isOr ? '✕ ଭୁଲ୍ ଉତ୍ତର — ' : '✕ Incorrect — ')));
          exp.appendChild(document.createTextNode(isOr ? (q.explanation_or || q.explanation_en || '') : (q.explanation_en || '')));
          qBox.appendChild(exp);
        }

        qList.appendChild(qBox);
      });
      card.appendChild(qList);

      // Pagination (Full 25-MCQ mode)
      if (state.mode === 'full' && totalPages > 1) {
        var pager = el('nav', 'cso-aq-pager');
        pager.setAttribute('aria-label', 'Quiz pages');
        for (var p = 1; p <= totalPages; p += 1) {
          (function (pageNum) {
            var pb = el('button', 'cso-aq-page-pill' + (state.page === pageNum ? ' is-active' : ''), String(pageNum));
            pb.type = 'button';
            pb.setAttribute('aria-current', state.page === pageNum ? 'page' : 'false');
            pb.addEventListener('click', function () {
              state.page = pageNum;
              draw();
              card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            pager.appendChild(pb);
          })(p);
        }
        card.appendChild(pager);
      }

      root.appendChild(card);
    }

    draw();
    window.addEventListener('cso:langchange', function () {
      state.lang = isOdiaActive() ? 'or' : 'en';
      draw();
    });
  }

  function mount(targetEl) {
    var root = targetEl || document.getElementById('cso-article-quiz-root');
    if (!root || root.getAttribute('data-aq-mounted') === '1') return;
    root.setAttribute('data-aq-mounted', '1');

    var embedded = readEmbeddedData();
    var reqSlug = (root.getAttribute('data-quiz-slug') || '').trim();
    var reqType = (root.getAttribute('data-quiz-type') || 'job').trim();

    if (embedded && (!reqSlug || embedded.slug === reqSlug)) {
      renderQuizCard(root, embedded);
      return;
    }

    if (!reqSlug) return;
    fetch('/api/public/article-quiz?type=' + encodeURIComponent(reqType) + '&slug=' + encodeURIComponent(reqSlug), { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok && Array.isArray(d.questions) && d.questions.length) renderQuizCard(root, d); })
      .catch(function () {});
  }

  window.CSOArticleMiniQuiz = { mount: mount, renderQuizCard: renderQuizCard };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(); });
  } else {
    mount();
  }
})(window, document);
