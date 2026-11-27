/**
 * Common Sense Odisha — Interactive Exams & Prep Command Center UI (v373)
 * Powers /exams/ from GET /api/public/exams-hub.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline handlers, zero inline styles, bilingual EN / ଓଡ଼ିଆ, 4-theme semantic tokens.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-exams-hub-root';

  var state = {
    lang: 'en',
    tracks: [],
    items: [],
    quiz: [],
    answers: {},
    filters: { family: 'all', tab: 'all', q: '' }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function isOdia() {
    if (state.lang === 'or') return true;
    var root = document.documentElement;
    return Boolean(root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or'));
  }

  function formatDate(ymd) {
    if (!ymd) return '';
    var p = String(ymd).split('-');
    if (p.length !== 3) return ymd;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return p[2] + ' ' + (months[Number(p[1]) - 1] || p[1]) + ' ' + p[0];
  }

  function updateSummary(summary) {
    var root = document.getElementById(HUB_ID);
    if (!root || !summary) return;
    var map = {
      tracks: Number(summary.active_tracks || 7),
      guides: Number(summary.live_guides || 0),
      mocks: Number(summary.cbt_mocks || 0),
      mcqs: Number(summary.daily_mcqs || 5)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-eh-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
  }

  function buildCountdownBadge(tr, orMode) {
    var d = tr.days_to_exam;
    if (d === null || d === undefined) {
      return el('span', 'cso-eh-countdown cso-eh-countdown--info', orMode ? 'ତାରିଖ ଶୀଘ୍ର' : 'Schedule TBA');
    }
    if (d < 0) {
      return el('span', 'cso-eh-countdown cso-eh-countdown--done', orMode ? 'ପରୀକ୍ଷା ସମାପ୍ତ' : 'Completed');
    }
    if (d === 0) {
      return el('span', 'cso-eh-countdown cso-eh-countdown--urgent', orMode ? 'ଆଜି ପରୀକ୍ଷା' : 'Exam Today');
    }
    if (d <= 30) {
      return el('span', 'cso-eh-countdown cso-eh-countdown--urgent', orMode ? (d + ' ଦିନ ବାକି') : (d + 'd to Exam'));
    }
    return el('span', 'cso-eh-countdown cso-eh-countdown--active', orMode ? (d + ' ଦିନ ବାକି • ' + formatDate(tr.exam_date)) : (d + 'd • ' + formatDate(tr.exam_date)));
  }

  function renderTracks() {
    var grid = document.getElementById('cso-eh-tracks-grid');
    if (!grid) return;
    var orMode = isOdia();
    var filtered = state.tracks.filter(function (tr) {
      return state.filters.family === 'all' || tr.family === state.filters.family;
    });

    var frag = document.createDocumentFragment();
    filtered.forEach(function (tr) {
      var tone = tr.family === 'teaching' ? 'cso-eh-track--purple' : (tr.family === 'national' ? 'cso-eh-track--info' : 'cso-eh-track--brand');
      var card = el('article', 'cso-eh-track ' + tone);

      var top = el('div', 'cso-eh-track__top');
      var badges = el('div', 'cso-eh-track__badges');
      badges.appendChild(el('span', 'cso-eh-code-badge', tr.code));
      badges.appendChild(el('span', 'cso-eh-stage-badge', tr.stage));
      top.appendChild(badges);
      top.appendChild(buildCountdownBadge(tr, orMode));
      card.appendChild(top);

      var primaryName = (orMode && tr.name_or) ? tr.name_or : tr.name_en;
      var secondaryName = (orMode && tr.name_or) ? tr.name_en : (tr.name_or || '');
      card.appendChild(el('h3', 'cso-eh-track__title', primaryName));
      if (secondaryName) card.appendChild(el('p', 'cso-eh-track__bi', secondaryName));

      var meta = el('div', 'cso-eh-track__meta');
      meta.appendChild(el('div', 'cso-eh-meta-line', (orMode ? '🏛️ ସଂସ୍ଥା: ' : '🏛️ Body: ') + tr.conducting_body + ' • ' + tr.eligibility_short));
      meta.appendChild(el('div', 'cso-eh-meta-line', (orMode ? '📋 ଢାଞ୍ଚା: ' : '📋 Pattern: ') + tr.pattern_summary));
      card.appendChild(meta);

      var counts = el('div', 'cso-eh-track__pills');
      counts.appendChild(el('span', 'cso-eh-pill', (tr.guide_count || 0) + (orMode ? ' ଗାଇଡ୍' : ' Guides')));
      counts.appendChild(el('span', 'cso-eh-pill', (tr.mock_count || 0) + (orMode ? ' CBT ମକ୍' : ' CBT Mocks')));
      card.appendChild(counts);

      var acts = el('div', 'cso-eh-track__actions');
      var mockBtn = el('a', 'cso-eh-btn cso-eh-btn--primary', orMode ? '⏱️ CBT ମକ୍ ଆରମ୍ଭ' : '⏱️ Launch CBT Mock');
      mockBtn.setAttribute('href', tr.mock_test_url || '/mock-tests/');
      acts.appendChild(mockBtn);

      var guideBtn = el('a', 'cso-eh-btn cso-eh-btn--outline', orMode ? '📘 ଗାଇଡ୍ ପଢ଼ନ୍ତୁ' : '📘 Strategy Guide');
      guideBtn.setAttribute('href', tr.primary_guide_url || '/guides/?category=exam-prep');
      acts.appendChild(guideBtn);

      if (tr.exam_date && window.CSOCalendarExport && typeof window.CSOCalendarExport.createCalendarButton === 'function') {
        var calTrackBtn = window.CSOCalendarExport.createCalendarButton({
          event: {
            uid: 'exam-track-' + tr.id + '-' + tr.exam_date,
            summary: tr.name_en + ' (' + tr.stage + ')',
            date: tr.exam_date,
            location: 'Odisha / Exam Center (Check Admit Card)',
            url: (window.location.origin || 'https://csodisha.com') + (tr.primary_guide_url || '/exams/'),
            description: 'Conducting Body: ' + tr.conducting_body + ' · Pattern: ' + tr.pattern_summary
          },
          filename: tr.id + '-exam',
          isOr: orMode,
          compact: true,
          ariaLabel: 'Add ' + tr.name_en + ' exam date to calendar (.ics)'
        });
        if (calTrackBtn) acts.appendChild(calTrackBtn);
      }

      if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.createBookmarkButton === 'function') {
        var bmTrackBtn = window.CSOSavedAlerts.createBookmarkButton({
          id: 'exam:' + tr.id,
          slug: tr.id,
          url: tr.primary_guide_url || '/exams/',
          title_en: tr.name_en,
          title_or: tr.name_or || '',
          org: tr.conducting_body,
          category: 'exam_update',
          deadline_iso: tr.exam_date || '',
          deadline_label: tr.stage || 'Exam Date',
          venue_or_mode: 'Odisha / Exam Center'
        }, { isOr: orMode, compact: true });
        if (bmTrackBtn) acts.appendChild(bmTrackBtn);
      }

      var shareUrl = (window.location.origin || 'https://csodisha.com') + '/exams/';
      var waText = tr.name_en + ' (' + tr.stage + ') — Free Mock Tests & Strategy Guide on CSOdisha: ' + shareUrl;
      var waBtn = el('a', 'cso-eh-btn cso-eh-btn--wa', 'WhatsApp');
      waBtn.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(waText));
      waBtn.setAttribute('target', '_blank');
      waBtn.setAttribute('rel', 'noopener noreferrer');
      waBtn.setAttribute('aria-label', 'Share on WhatsApp: ' + tr.name_en);
      acts.appendChild(waBtn);

      card.appendChild(acts);
      frag.appendChild(card);
    });

    grid.replaceChildren(frag);
  }

  function renderResources() {
    var grid = document.getElementById('cso-eh-resources-grid');
    var countEl = document.getElementById('cso-eh-res-count');
    if (!grid) return;
    var orMode = isOdia();
    var q = state.filters.q.toLowerCase();
    var tab = state.filters.tab;

    var filtered = state.items.filter(function (it) {
      if (tab !== 'all' && it.resource_type !== tab) return false;
      if (q) {
        var hay = [it.title_en, it.title_or, it.summary_en, it.exam_tag].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (countEl) {
      countEl.textContent = orMode
        ? ('ମୋଟ ' + filtered.length + ' ଟି ପ୍ରସ୍ତୁତି ସାମଗ୍ରୀ ମିଳିଲା')
        : ('Showing ' + filtered.length + ' of ' + state.items.length + ' live exam prep resources');
    }

    if (!filtered.length) {
      var empty = el('div', 'cso-eh-empty');
      empty.appendChild(el('p', 'cso-eh-empty__desc', orMode ? 'ଏହି ଫିଲ୍ଟରରେ କୌଣସି ସାମଗ୍ରୀ ମିଳିଲା ନାହିଁ।' : 'No matching exam prep resources for this filter yet.'));
      var link = el('a', 'cso-eh-btn cso-eh-btn--primary', orMode ? 'ସବୁ ପରୀକ୍ଷା ଗାଇଡ୍ ଦେଖନ୍ତୁ →' : 'Browse All Exam Guides →');
      link.setAttribute('href', '/guides/?category=exam-prep');
      empty.appendChild(link);
      grid.replaceChildren(empty);
      return;
    }

    var typeLabelMap = {
      strategy: orMode ? 'ରୋଡମ୍ୟାପ୍ / ଗାଇଡ୍' : 'Strategy & Guide',
      'admit-card': orMode ? 'ଆଡମିଟ୍ କାର୍ଡ / ସିଟି' : 'Exam City / Admit Card',
      syllabus: orMode ? 'ସିଲାବସ୍ ଓ PYQ' : 'Syllabus & PYQ',
      mock: orMode ? 'CBT ମକ୍ ଟେଷ୍ଟ' : 'Live CBT Mock'
    };

    var frag = document.createDocumentFragment();
    filtered.forEach(function (it) {
      var card = el('article', 'cso-eh-res-card cso-eh-res-card--' + (it.resource_type || 'strategy'));
      var top = el('div', 'cso-eh-res-card__top');
      top.appendChild(el('span', 'cso-eh-code-badge', it.exam_tag || 'Odisha Exams'));
      top.appendChild(el('span', 'cso-eh-stage-badge', typeLabelMap[it.resource_type] || 'Prep Resource'));
      card.appendChild(top);

      var title = (orMode && it.title_or) ? it.title_or : it.title_en;
      var h3 = el('h3', 'cso-eh-res-card__title');
      var a = el('a', 'cso-eh-res-card__link', title);
      a.setAttribute('href', it.detail_url || '/guides/?category=exam-prep');
      h3.appendChild(a);
      card.appendChild(h3);

      var summary = (orMode && it.summary_or) ? it.summary_or : it.summary_en;
      if (summary) card.appendChild(el('p', 'cso-eh-res-card__desc', summary));

      var foot = el('div', 'cso-eh-res-card__foot');
      var cta = el('a', 'cso-eh-btn cso-eh-btn--primary', it.resource_type === 'mock' ? (orMode ? 'ଆରମ୍ଭ କରନ୍ତୁ →' : 'Start Mock →') : (orMode ? 'ପଢ଼ନ୍ତୁ →' : 'Open Resource →'));
      cta.setAttribute('href', it.detail_url || '/guides/?category=exam-prep');
      foot.appendChild(cta);
      if (window.CSOCalendarExport && typeof window.CSOCalendarExport.parseDateRange === 'function') {
        var rawDt = it.exam_date || it.last_date || it.title_en || it.summary_en || '';
        var parsedDt = window.CSOCalendarExport.parseDateRange(rawDt);
        if (parsedDt) {
          var resCalBtn = window.CSOCalendarExport.createCalendarButton({
            event: {
              uid: 'exam-res-' + (it.slug || it.id || 'item') + '-' + parsedDt.isoStart,
              summary: it.title_en || 'Exam Update',
              date: rawDt,
              location: 'Online / Official Portal',
              url: (window.location.origin || 'https://csodisha.com') + (it.detail_url || '/exams/'),
              description: it.summary_en || ''
            },
            filename: (it.slug || it.id || 'exam-update'),
            isOr: orMode,
            compact: true,
            ariaLabel: 'Add ' + (it.title_en || 'exam date') + ' to calendar (.ics)'
          });
          if (resCalBtn) foot.appendChild(resCalBtn);
        }
      }
      if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.createBookmarkButton === 'function') {
        var bmResBtn = window.CSOSavedAlerts.createBookmarkButton({
          id: 'exam-res:' + (it.slug || it.id || it.title_en),
          slug: it.slug || it.id || '',
          url: it.detail_url || '/exams/',
          title_en: it.title_en || 'Exam Update',
          title_or: it.title_or || '',
          org: it.exam_tag || 'Odisha Exams',
          category: 'exam_update',
          deadline_iso: it.exam_date || it.last_date || it.title_en || ''
        }, { isOr: orMode, compact: true });
        if (bmResBtn) foot.appendChild(bmResBtn);
      }
      card.appendChild(foot);

      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  function renderQuiz() {
    var root = document.getElementById('cso-eh-quiz-root');
    if (!root) return;
    var orMode = isOdia();
    var total = state.quiz.length;
    var answered = 0;
    var score = 0;

    state.quiz.forEach(function (q) {
      if (Object.prototype.hasOwnProperty.call(state.answers, q.id)) {
        answered += 1;
        if (state.answers[q.id] === q.correct_index) score += 1;
      }
    });

    var scoreEl = document.getElementById('cso-eh-quiz-score');
    if (scoreEl) {
      scoreEl.textContent = orMode
        ? ('ସ୍କୋର୍: ' + score + ' / ' + total + ' (' + answered + ' ଉତ୍ତର ଦିଆଯାଇଛି)')
        : ('Score: ' + score + ' / ' + total + ' (' + answered + ' answered)');
    }

    var frag = document.createDocumentFragment();
    state.quiz.forEach(function (q, idx) {
      var box = el('article', 'cso-eh-q-card');
      var head = el('div', 'cso-eh-q-head');
      head.appendChild(el('span', 'cso-eh-q-num', 'Q' + (idx + 1)));
      head.appendChild(el('span', 'cso-eh-stage-badge', q.exam_tag));
      box.appendChild(head);

      box.appendChild(el('p', 'cso-eh-q-text', (orMode && q.question_or) ? q.question_or : q.question_en));

      var optsWrap = el('div', 'cso-eh-q-opts');
      var chosen = Object.prototype.hasOwnProperty.call(state.answers, q.id) ? state.answers[q.id] : -1;
      var opts = (orMode && Array.isArray(q.options_or)) ? q.options_or : q.options_en;

      opts.forEach(function (optText, oi) {
        var cls = 'cso-eh-q-opt';
        if (chosen !== -1) {
          if (oi === q.correct_index) cls += ' is-correct';
          else if (oi === chosen) cls += ' is-wrong';
        }
        var btn = el('button', cls, String.fromCharCode(65 + oi) + '. ' + optText);
        btn.type = 'button';
        btn.setAttribute('data-qid', q.id);
        btn.setAttribute('data-opt', String(oi));
        if (chosen !== -1) btn.disabled = true;
        optsWrap.appendChild(btn);
      });
      box.appendChild(optsWrap);

      if (chosen !== -1) {
        var isRight = chosen === q.correct_index;
        var fb = el('div', 'cso-eh-q-feedback ' + (isRight ? 'is-correct' : 'is-wrong'));
        var verdict = isRight ? (orMode ? '✓ ଠିକ୍ ଉତ୍ତର! ' : '✓ Correct! ') : (orMode ? '✕ ଭୁଲ୍ ଉତ୍ତର। ' : '✕ Not quite. ');
        var exp = (orMode && q.explanation_or) ? q.explanation_or : q.explanation_en;
        fb.textContent = verdict + exp;
        box.appendChild(fb);
      }

      frag.appendChild(box);
    });

    root.replaceChildren(frag);
  }

  function localizeStaticCopy() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var orMode = isOdia();
    root.querySelectorAll('[data-en]').forEach(function (n) {
      var txt = orMode ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (txt) n.textContent = txt;
    });
    root.querySelectorAll('.cso-eh-lang-btn').forEach(function (b) {
      var active = (b.getAttribute('data-lang') === 'or') === orMode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncControls() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    root.querySelectorAll('.cso-eh-family-pill').forEach(function (b) {
      var on = (b.getAttribute('data-family') || 'all') === state.filters.family;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    root.querySelectorAll('.cso-eh-res-tab').forEach(function (t) {
      var on = (t.getAttribute('data-tab') || 'all') === state.filters.tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var qInput = document.getElementById('cso-eh-search');
    if (qInput && qInput.value !== state.filters.q) qInput.value = state.filters.q;
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var qInput = document.getElementById('cso-eh-search');
    var timer = null;
    if (qInput) {
      qInput.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.filters.q = (qInput.value || '').trim();
          renderResources();
        }, 140);
      });
    }

    var resetQuizBtn = document.getElementById('cso-eh-quiz-reset');
    if (resetQuizBtn) {
      resetQuizBtn.addEventListener('click', function () {
        state.answers = {};
        renderQuiz();
      });
    }

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;

      var famBtn = t.closest('.cso-eh-family-pill');
      if (famBtn) {
        state.filters.family = famBtn.getAttribute('data-family') || 'all';
        syncControls();
        renderTracks();
        return;
      }
      var tabBtn = t.closest('.cso-eh-res-tab');
      if (tabBtn) {
        state.filters.tab = tabBtn.getAttribute('data-tab') || 'all';
        syncControls();
        renderResources();
        return;
      }
      var langBtn = t.closest('.cso-eh-lang-btn');
      if (langBtn) {
        state.lang = langBtn.getAttribute('data-lang') === 'or' ? 'or' : 'en';
        localizeStaticCopy();
        renderTracks();
        renderResources();
        renderQuiz();
        return;
      }
      var optBtn = t.closest('.cso-eh-q-opt');
      if (optBtn && !optBtn.disabled) {
        var qid = optBtn.getAttribute('data-qid');
        var oi = Number(optBtn.getAttribute('data-opt'));
        if (qid && isFinite(oi)) {
          state.answers[qid] = oi;
          renderQuiz();
        }
      }
    });

    window.addEventListener('cso:lang-change', function (ev) {
      var l = ev && ev.detail && ev.detail.lang;
      if (l === 'or' || l === 'en') {
        state.lang = l;
        localizeStaticCopy();
        renderTracks();
        renderResources();
        renderQuiz();
      }
    });
  }

  function init() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;

    var params = new URLSearchParams(window.location.search || '');
    state.filters.family = (params.get('family') || 'all').trim().toLowerCase() || 'all';
    state.filters.tab = (params.get('tab') || params.get('type') || 'all').trim().toLowerCase() || 'all';
    state.filters.q = (params.get('q') || params.get('search') || '').trim();

    bindEvents();
    syncControls();
    localizeStaticCopy();

    fetch('/api/public/exams-hub', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok) {
          state.tracks = Array.isArray(data.exam_tracks) ? data.exam_tracks : [];
          state.items = Array.isArray(data.items) ? data.items : [];
          state.quiz = Array.isArray(data.daily_quiz) ? data.daily_quiz : [];
          updateSummary(data.summary);
        }
        renderTracks();
        renderResources();
        renderQuiz();
      })
      .catch(function () {
        renderTracks();
        renderResources();
        renderQuiz();
      });
  }

  window.CSOExamsHub = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
