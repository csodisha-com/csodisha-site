/**
 * Common Sense Odisha (CSO) — Public Mock Tests & CBT Practice Controller
 * Fetches published mock tests from GET /api/content/mock-tests and questions
 * from GET /api/content/mock-tests/:slug. Strict CSP-compliant, safe DOM rendering.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const pc = window.CSOPublicContent;
  const el = pc ? pc.el : (t, c, tx) => {
    const n = document.createElement(t);
    if (c) n.className = c;
    if (tx !== undefined && tx !== null) n.textContent = String(tx);
    return n;
  };

  const breadcrumbEl = $('mt-breadcrumb');
  const listViewEl = $('mt-list-view');
  const searchInput = $('mt-search');
  const searchClearBtn = $('mt-search-clear');
  const examsBar = $('mt-exams');
  const countLabel = $('mt-count-label');
  const resetBtn = $('mt-reset-btn');
  const statusEl = $('mt-status');
  const gridEl = $('mt-grid');
  const paginationEl = $('mt-pagination');

  const cbtViewEl = $('mt-cbt-view');
  const cbtExamEl = $('mt-cbt-exam');
  const cbtTitleEl = $('mt-cbt-title');
  const cbtTimerEl = $('mt-cbt-timer');
  const cbtLangBtn = $('mt-cbt-lang');
  const cbtExitBtn = $('mt-cbt-exit');
  const qPaneEl = $('mt-cbt-question-pane');
  const summaryPaneEl = $('mt-summary-pane');
  const qNumberEl = $('mt-q-number');
  const qSectionEl = $('mt-q-section');
  const qMarksEl = $('mt-q-marks');
  const qNegEl = $('mt-q-neg');
  const qStemEnEl = $('mt-q-stem-en');
  const qStemOrEl = $('mt-q-stem-or');
  const qImageEl = $('mt-q-image');
  const qOptionsEl = $('mt-q-options');

  const btnPrev = $('mt-btn-prev');
  const btnFlag = $('mt-btn-flag');
  const btnClear = $('mt-btn-clear');
  const btnNext = $('mt-btn-next');
  const btnSubmit = $('mt-btn-submit');
  const btnReview = $('mt-btn-review');
  const btnBackList = $('mt-btn-back-list');

  const paletteSummaryEl = $('mt-palette-summary');
  const paletteEl = $('mt-palette');
  const summarySubtitleEl = $('mt-summary-subtitle');
  const summaryStatsEl = $('mt-summary-stats');

  let state = {
    page: 1,
    limit: 12,
    exam: '',
    q: ''
  };

  let session = {
    test: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    flagged: {},
    showOdia: true,
    secondsLeft: 0,
    elapsedSeconds: 0,
    timerId: null
  };

  let searchTimer = null;

  function renderBreadcrumb(testTitle) {
    if (!breadcrumbEl) return;
    breadcrumbEl.replaceChildren();

    const liHome = el('li');
    const aHome = el('a', '', 'Home');
    aHome.href = '../index.html';
    liHome.appendChild(aHome);
    breadcrumbEl.appendChild(liHome);

    if (!testTitle) {
      const liCur = el('li');
      liCur.setAttribute('aria-current', 'page');
      liCur.appendChild(el('strong', '', 'Mock Tests'));
      breadcrumbEl.appendChild(liCur);
      return;
    }

    const liSec = el('li');
    const btnSec = el('button', '', 'Mock Tests');
    btnSec.type = 'button';
    btnSec.addEventListener('click', () => exitTest(true));
    liSec.appendChild(btnSec);
    breadcrumbEl.appendChild(liSec);

    const liTest = el('li');
    liTest.setAttribute('aria-current', 'page');
    liTest.appendChild(el('strong', '', testTitle));
    breadcrumbEl.appendChild(liTest);
  }

  function ensureExamChip(examName) {
    if (!examsBar || !examName) return;
    const exists = Array.from(examsBar.querySelectorAll('.pc-chip')).some(
      b => (b.dataset.exam || '').toLowerCase() === examName.toLowerCase()
    );
    if (!exists) {
      const chip = el('button', 'pc-chip', examName);
      chip.type = 'button';
      chip.dataset.exam = examName;
      examsBar.appendChild(chip);
    }
  }

  function updateExamChipsUI() {
    if (!examsBar) return;
    examsBar.querySelectorAll('.pc-chip').forEach(btn => {
      const active = (btn.dataset.exam || '') === state.exam;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function renderTestCard(item) {
    const card = el('article', 'pc-card');
    const top = el('div');

    const badges = el('div', 'pc-badges');
    if (item.target_exam) {
      ensureExamChip(item.target_exam);
      badges.appendChild(el('span', 'pc-badge', item.target_exam));
    }
    const qCount = Number(item.question_count) || 0;
    badges.appendChild(el('span', 'pc-badge pc-badge--green', `${qCount} ${qCount === 1 ? 'Question' : 'Questions'}`));
    if (item.duration_minutes) {
      badges.appendChild(el('span', 'pc-badge pc-badge--amber', `⏱ ${item.duration_minutes} min`));
    }
    top.appendChild(badges);

    top.appendChild(el('h2', 'pc-card__title', item.title || 'Practice Mock Test'));
    if (item.title_or) {
      top.appendChild(el('p', 'pc-card__subtitle', item.title_or));
    }

    const specs = el('div', 'pc-card__specs');
    if (item.total_marks) {
      specs.appendChild(el('span', '', `🏆 Total Marks: ${item.total_marks}`));
    }
    const neg = Number(item.negative_marking) || 0;
    specs.appendChild(el('span', '', neg > 0 ? `⚠️ Negative: −${neg}` : '✓ No Negative Marking'));
    if (item.published_at && pc) {
      specs.appendChild(el('span', '', `📅 ${pc.formatDate(item.published_at)}`));
    }
    top.appendChild(specs);
    card.appendChild(top);

    const footer = el('div', 'pc-card__footer');
    const startBtn = el('button', 'pc-btn pc-btn--primary', 'Start Practice Test →');
    startBtn.type = 'button';
    startBtn.addEventListener('click', () => startTest(item.slug || item.id, true));
    footer.appendChild(startBtn);

    if (pc && typeof pc.createBookmarkButton === 'function') {
      footer.appendChild(pc.createBookmarkButton({
        type: 'study',
        id: `mock-${item.slug || item.id}`,
        title: item.title,
        badge: item.target_exam ? `Mock Test · ${item.target_exam}` : 'Mock Test',
        url: `/mock-tests/?test=${encodeURIComponent(item.slug || item.id)}`
      }));
    }

    card.appendChild(footer);
    return card;
  }

  function renderPagination(page, limit, total) {
    if (!paginationEl) return;
    paginationEl.replaceChildren();
    const totalPages = Math.ceil((total || 0) / (limit || 12));
    if (totalPages <= 1) {
      paginationEl.hidden = true;
      return;
    }
    paginationEl.hidden = false;

    const prev = el('button', 'pc-btn', '← Previous');
    prev.type = 'button';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        loadList();
      }
    });

    const info = el('span', 'pc-badge', `Page ${page} of ${totalPages}`);

    const next = el('button', 'pc-btn', 'Next →');
    next.type = 'button';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => {
      if (state.page < totalPages) {
        state.page++;
        loadList();
      }
    });

    paginationEl.append(prev, info, next);
  }

  function formatClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(rem)}` : `${pad(mins)}:${pad(rem)}`;
  }

  function stopTimer() {
    if (session.timerId) {
      clearInterval(session.timerId);
      session.timerId = null;
    }
  }

  function startTimer(durationMinutes) {
    stopTimer();
    session.secondsLeft = Math.max(60, (Number(durationMinutes) || 30) * 60);
    session.elapsedSeconds = 0;
    if (cbtTimerEl) {
      cbtTimerEl.textContent = formatClock(session.secondsLeft);
      cbtTimerEl.classList.remove('is-low');
    }
    session.timerId = setInterval(() => {
      session.secondsLeft = Math.max(0, session.secondsLeft - 1);
      session.elapsedSeconds++;
      if (cbtTimerEl) {
        cbtTimerEl.textContent = formatClock(session.secondsLeft);
        cbtTimerEl.classList.toggle('is-low', session.secondsLeft <= 120);
      }
      if (session.secondsLeft === 0) {
        stopTimer();
        showTestSummary();
      }
    }, 1000);
  }

  function renderPalette() {
    if (!paletteEl || !paletteSummaryEl) return;
    paletteEl.replaceChildren();
    const total = session.questions.length;
    let answeredCount = 0;
    let flaggedCount = 0;

    session.questions.forEach((q, idx) => {
      const ans = session.answers[q.id];
      const flg = Boolean(session.flagged[q.id]);
      if (ans) answeredCount++;
      if (flg) flaggedCount++;

      const btn = el('button', 'cbt-pal-btn', String(idx + 1));
      btn.type = 'button';
      if (idx === session.currentIndex) btn.classList.add('is-current');
      if (ans) btn.classList.add('is-answered');
      else if (flg) btn.classList.add('is-flagged');

      btn.setAttribute('aria-label', `Question ${idx + 1}${ans ? ' (Answered)' : ''}${flg ? ' (Flagged)' : ''}`);
      btn.addEventListener('click', () => {
        session.currentIndex = idx;
        qPaneEl.hidden = false;
        summaryPaneEl.hidden = true;
        renderCurrentQuestion();
      });
      paletteEl.appendChild(btn);
    });

    paletteSummaryEl.textContent = `${answeredCount} of ${total} answered · ${flaggedCount} flagged`;
  }

  function renderCurrentQuestion() {
    const q = session.questions[session.currentIndex];
    if (!q) return;

    const total = session.questions.length;
    qNumberEl.textContent = `Question ${session.currentIndex + 1} of ${total}`;

    if (q.section) {
      qSectionEl.textContent = q.section;
      qSectionEl.hidden = false;
    } else {
      qSectionEl.hidden = true;
    }

    qMarksEl.textContent = `+${q.marks || 1} Marks`;
    const neg = Number(session.test && session.test.negative_marking) || 0;
    if (neg > 0) {
      qNegEl.textContent = `−${neg} Negative`;
      qNegEl.hidden = false;
    } else {
      qNegEl.hidden = true;
    }

    qStemEnEl.textContent = q.question_en || '';
    if (q.question_or && session.showOdia) {
      qStemOrEl.textContent = q.question_or;
      qStemOrEl.hidden = false;
    } else {
      qStemOrEl.hidden = true;
    }

    if (q.image_url && pc && pc.safeMediaSrc(q.image_url)) {
      qImageEl.src = q.image_url;
      qImageEl.hidden = false;
    } else {
      qImageEl.hidden = true;
    }

    qOptionsEl.replaceChildren();
    const selected = session.answers[q.id] || '';
    const opts = [
      ['A', q.option_a],
      ['B', q.option_b],
      ['C', q.option_c],
      ['D', q.option_d]
    ];

    opts.forEach(([key, text]) => {
      const btn = el('button', 'cbt-option');
      btn.type = 'button';
      const isSel = selected === key;
      if (isSel) btn.classList.add('is-selected');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(isSel));

      btn.appendChild(el('span', 'cbt-option__key', key));
      btn.appendChild(el('span', 'cbt-option__text', text || ''));

      btn.addEventListener('click', () => {
        session.answers[q.id] = key;
        renderCurrentQuestion();
      });
      qOptionsEl.appendChild(btn);
    });

    if (btnPrev) btnPrev.disabled = session.currentIndex <= 0;
    if (btnFlag) {
      const isFlg = Boolean(session.flagged[q.id]);
      btnFlag.textContent = isFlg ? '⚑ Flagged' : '⚑ Flag for Review';
    }
    if (btnNext) {
      btnNext.textContent = session.currentIndex + 1 < total ? 'Save & Next →' : 'Review Summary →';
    }

    renderPalette();
  }

  function showTestSummary() {
    stopTimer();
    if (!qPaneEl || !summaryPaneEl || !summaryStatsEl) return;
    qPaneEl.hidden = true;
    summaryPaneEl.hidden = false;

    const total = session.questions.length;
    const answered = Object.keys(session.answers).filter(k => Boolean(session.answers[k])).length;
    const unanswered = Math.max(0, total - answered);
    const flagged = Object.keys(session.flagged).filter(k => Boolean(session.flagged[k])).length;

    summarySubtitleEl.textContent = `${session.test ? session.test.title : 'Mock Test'} — Attempt summary recorded.`;
    summaryStatsEl.replaceChildren();

    const boxes = [
      [String(total), 'Total Questions'],
      [String(answered), 'Answered'],
      [String(unanswered), 'Unanswered'],
      [String(flagged), 'Flagged for Review'],
      [formatClock(session.elapsedSeconds), 'Time Spent']
    ];

    boxes.forEach(([val, label]) => {
      const b = el('div', 'cbt-stat-box');
      b.appendChild(el('strong', '', val));
      b.appendChild(el('span', '', label));
      summaryStatsEl.appendChild(b);
    });
  }

  async function startTest(slugOrId, pushHistory = true) {
    if (!slugOrId || !cbtViewEl || !listViewEl) return;
    listViewEl.hidden = true;
    cbtViewEl.hidden = false;
    qPaneEl.hidden = false;
    summaryPaneEl.hidden = true;

    cbtTitleEl.textContent = 'Loading practice test…';
    cbtExamEl.textContent = 'Loading…';
    qStemEnEl.textContent = 'Fetching questions…';
    qOptionsEl.replaceChildren();
    paletteEl.replaceChildren();

    if (pushHistory) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('test', slugOrId);
        window.history.pushState({ test: slugOrId }, '', u.toString());
      } catch (_) {}
    }

    try {
      const res = await fetch(`/api/content/mock-tests/${encodeURIComponent(slugOrId)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status === 404 ? 'Mock test not found or no longer active.' : `HTTP ${res.status}`);
      const test = await res.json();
      const questions = Array.isArray(test.questions) ? test.questions : [];

      session.test = test;
      session.questions = questions;
      session.currentIndex = 0;
      session.answers = {};
      session.flagged = {};

      renderBreadcrumb(test.title || 'Mock Test');
      document.title = `${test.title || 'Mock Test'} — Practice CBT | Common Sense Odisha`;

      cbtExamEl.textContent = test.target_exam || 'Mock Test';
      cbtTitleEl.textContent = test.title || 'Mock Test';

      if (questions.length === 0) {
        qStemEnEl.textContent = 'This mock test does not have any published questions yet.';
        return;
      }

      startTimer(test.duration_minutes || 60);
      renderCurrentQuestion();
    } catch (err) {
      cbtTitleEl.textContent = 'Unable to load mock test';
      qStemEnEl.textContent = err.message || 'Please try again later.';
    }
  }

  function exitTest(pushHistory = true) {
    stopTimer();
    session.test = null;
    session.questions = [];
    if (cbtViewEl) cbtViewEl.hidden = true;
    if (listViewEl) listViewEl.hidden = false;
    renderBreadcrumb(null);
    document.title = 'Mock Tests & Practice Series | Common Sense Odisha';
    if (pushHistory) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('test');
        window.history.pushState({}, '', u.toString());
      } catch (_) {}
    }
  }

  async function loadList() {
    if (!gridEl || !statusEl) return;
    const hasFilter = Boolean(state.exam || state.q);
    if (resetBtn) resetBtn.hidden = !hasFilter;
    if (searchClearBtn) searchClearBtn.hidden = !state.q;

    statusEl.hidden = false;
    statusEl.replaceChildren(
      el('h3', '', 'Loading Mock Tests…'),
      el('p', '', 'Fetching live question banks and CBT practice sets.')
    );
    gridEl.replaceChildren();

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));
    if (state.exam) params.set('exam', state.exam);
    if (state.q) params.set('q', state.q);

    try {
      const res = await fetch(`/api/content/mock-tests?${params.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const total = Number(data.total) || items.length;

      if (countLabel) {
        countLabel.textContent = `${total.toLocaleString('en-IN')} published ${total === 1 ? 'mock test' : 'mock tests'}`;
      }

      if (items.length === 0) {
        statusEl.hidden = false;
        statusEl.replaceChildren(
          el('h3', '', hasFilter ? 'No matching mock tests found' : 'No mock tests published yet'),
          el('p', '', hasFilter
            ? 'Try clearing your search or selecting All Exams.'
            : 'Published OPSC, OSSC, OSSSC, and teacher eligibility practice tests will appear here automatically.')
        );
        if (paginationEl) paginationEl.hidden = true;
        return;
      }

      statusEl.hidden = true;
      const frag = document.createDocumentFragment();
      items.forEach(item => frag.appendChild(renderTestCard(item)));
      gridEl.appendChild(frag);
      renderPagination(data.page || state.page, data.limit || state.limit, total);

      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      if (countLabel) countLabel.textContent = 'Feed unavailable';
      statusEl.hidden = false;
      const retry = el('button', 'pc-btn pc-btn--primary', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', loadList);
      statusEl.replaceChildren(
        el('h3', '', 'Unable to load mock tests'),
        el('p', '', 'Please check your connection and try again.'),
        retry
      );
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = searchInput.value.trim();
        state.page = 1;
        loadList();
      }, 220);
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.q = '';
      state.page = 1;
      loadList();
    });
  }

  if (examsBar) {
    examsBar.addEventListener('click', e => {
      const btn = e.target.closest('.pc-chip');
      if (!btn) return;
      state.exam = btn.dataset.exam || '';
      state.page = 1;
      updateExamChipsUI();
      loadList();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.exam = '';
      state.q = '';
      state.page = 1;
      if (searchInput) searchInput.value = '';
      updateExamChipsUI();
      loadList();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (session.currentIndex > 0) {
        session.currentIndex--;
        renderCurrentQuestion();
      }
    });
  }

  if (btnFlag) {
    btnFlag.addEventListener('click', () => {
      const q = session.questions[session.currentIndex];
      if (!q) return;
      session.flagged[q.id] = !session.flagged[q.id];
      renderCurrentQuestion();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const q = session.questions[session.currentIndex];
      if (!q) return;
      delete session.answers[q.id];
      renderCurrentQuestion();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (session.currentIndex + 1 < session.questions.length) {
        session.currentIndex++;
        renderCurrentQuestion();
      } else {
        showTestSummary();
      }
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', showTestSummary);
  }

  if (btnReview) {
    btnReview.addEventListener('click', () => {
      summaryPaneEl.hidden = true;
      qPaneEl.hidden = false;
      renderCurrentQuestion();
    });
  }

  if (btnBackList) {
    btnBackList.addEventListener('click', () => exitTest(true));
  }

  if (cbtExitBtn) {
    cbtExitBtn.addEventListener('click', () => exitTest(true));
  }

  if (cbtLangBtn) {
    cbtLangBtn.addEventListener('click', () => {
      session.showOdia = !session.showOdia;
      cbtLangBtn.textContent = session.showOdia ? '🌐 English + ଓଡ଼ିଆ' : '🌐 English Only';
      renderCurrentQuestion();
    });
  }

  window.addEventListener('popstate', () => {
    const t = new URLSearchParams(window.location.search).get('test');
    if (t) startTest(t, false);
    else exitTest(false);
  });

  const initialParams = new URLSearchParams(window.location.search);
  const initialExam = initialParams.get('exam');
  const initialQ = initialParams.get('q');
  const initialTest = initialParams.get('test');
  if (initialExam) {
    ensureExamChip(initialExam);
    state.exam = initialExam;
    updateExamChipsUI();
  }
  if (initialQ) {
    state.q = initialQ;
    if (searchInput) searchInput.value = initialQ;
  }

  loadList();
  if (initialTest) {
    startTest(initialTest, false);
  }
})();
