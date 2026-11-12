/**
 * Common Sense Odisha (CSO) — Public Mock Tests & CBT Practice Controller
 * Fetches published mock tests from GET /api/content/mock-tests, questions from
 * GET /api/content/mock-tests/:slug, grades strictly server-side via
 * POST /api/content/mock-tests/:slug/submit, and renders live Top-10 Leaderboards
 * (GET /api/content/mock-tests/:slug/leaderboard) & Attempt History (GET /api/user/attempts).
 * Strict CSP-compliant: zero inline styles, zero innerHTML.
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

  const historyToggleBtn = $('mt-history-toggle-btn');
  const historyPanelEl = $('mt-history-panel');
  const historyCloseBtn = $('mt-history-close-btn');
  const historyBodyEl = $('mt-history-body');

  const leaderboardPanelEl = $('mt-leaderboard-panel');
  const leaderboardTitleEl = $('mt-leaderboard-title');
  const leaderboardCloseBtn = $('mt-leaderboard-close-btn');
  const leaderboardBodyEl = $('mt-leaderboard-body');

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
  const btnRetake = $('mt-btn-retake');
  const btnBackList = $('mt-btn-back-list');

  const paletteSummaryEl = $('mt-palette-summary');
  const paletteEl = $('mt-palette');
  const summarySubtitleEl = $('mt-summary-subtitle');
  const summaryBannerEl = $('mt-summary-banner');
  const summaryStatsEl = $('mt-summary-stats');
  const cbtLeaderboardEl = $('mt-cbt-leaderboard');
  const cbtBreakdownEl = $('mt-cbt-breakdown');

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
    timerId: null,
    submitting: false,
    submitted: false
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

  function formatClock(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(rem)}` : `${pad(mins)}:${pad(rem)}`;
  }

  function renderLeaderboardTable(container, items) {
    if (!container) return;
    container.replaceChildren();
    if (!Array.isArray(items) || items.length === 0) {
      container.appendChild(el('p', 'pc-card__summary', 'No ranked attempts recorded yet for this mock test. Sign in and complete the test to claim Rank #1!'));
      return;
    }

    const wrap = el('div', 'cbt-leaderboard-wrap');
    const table = el('table', 'cbt-table');
    const thead = el('thead');
    const hRow = el('tr');
    ['Rank', 'Candidate', 'Score', 'Accuracy', 'Time', 'Date'].forEach(col => {
      hRow.appendChild(el('th', '', col));
    });
    thead.appendChild(hRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    items.forEach((entry, idx) => {
      const tr = el('tr');
      const rankNum = entry.rank || (idx + 1);
      const medal = rankNum === 1 ? '🥇 #1' : rankNum === 2 ? '🥈 #2' : rankNum === 3 ? '🥉 #3' : `#${rankNum}`;
      tr.appendChild(el('td', '', medal));
      tr.appendChild(el('td', '', entry.displayName || entry.display_name || 'Aspirant'));
      const sc = `${entry.score ?? 0} / ${entry.maxScore ?? entry.max_score ?? 0}`;
      tr.appendChild(el('td', '', sc));
      tr.appendChild(el('td', '', `${entry.accuracy ?? 0}%`));
      tr.appendChild(el('td', '', formatClock(entry.timeTakenSec ?? entry.time_taken_sec ?? 0)));
      const dt = (entry.createdAt || entry.created_at) && pc ? pc.formatDate(entry.createdAt || entry.created_at) : '';
      tr.appendChild(el('td', '', dt));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  async function loadLeaderboardInto(container, slugOrId, titleLabel) {
    if (!container || !slugOrId) return;
    container.replaceChildren(el('p', 'pc-card__summary', 'Loading Top-10 leaderboard…'));
    try {
      const res = await fetch(`/api/content/mock-tests/${encodeURIComponent(slugOrId)}/leaderboard`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (titleLabel && data.title) {
        titleLabel.textContent = `🏆 Top-10 Leaderboard — ${data.title}`;
      }
      renderLeaderboardTable(container, data.items || []);
    } catch (_) {
      container.replaceChildren(el('p', 'pc-card__summary', 'Unable to load leaderboard right now.'));
    }
  }

  function openListLeaderboard(item) {
    if (!leaderboardPanelEl || !leaderboardBodyEl) return;
    leaderboardPanelEl.hidden = false;
    if (leaderboardTitleEl) {
      leaderboardTitleEl.textContent = `🏆 Top-10 Leaderboard — ${item.title || 'Mock Test'}`;
    }
    loadLeaderboardInto(leaderboardBodyEl, item.slug || item.id, leaderboardTitleEl);
    leaderboardPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadAttemptHistory() {
    if (!historyBodyEl) return;
    historyBodyEl.replaceChildren(el('p', 'pc-card__summary', 'Loading your CBT attempt history…'));
    try {
      const res = await fetch('/api/user/attempts', { credentials: 'same-origin' });
      if (res.status === 401) {
        const box = el('div', 'cbt-banner cbt-banner--guest');
        box.appendChild(el('span', '', 'Sign in to view your saved CBT attempt history, accuracy trends, and rankings across devices.'));
        const loginLink = el('a', 'pc-btn pc-btn--primary', 'Sign In →');
        loginLink.href = '/login.html?redirect=/mock-tests/';
        box.appendChild(loginLink);
        historyBodyEl.replaceChildren(box);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        historyBodyEl.replaceChildren(
          el('p', 'pc-card__summary', 'You have not submitted any mock tests yet. Start any practice test below to record your first scorecard!')
        );
        return;
      }

      const wrap = el('div', 'cbt-leaderboard-wrap');
      const table = el('table', 'cbt-table');
      const thead = el('thead');
      const hRow = el('tr');
      ['Mock Test', 'Exam', 'Score', 'Accuracy', 'Time', 'Date', 'Action'].forEach(c => hRow.appendChild(el('th', '', c)));
      thead.appendChild(hRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(att => {
        const tr = el('tr');
        tr.appendChild(el('td', '', att.title || att.test_title || 'Mock Test'));
        tr.appendChild(el('td', '', att.target_exam || '—'));
        tr.appendChild(el('td', '', `${att.score} / ${att.max_score ?? att.maxScore ?? 0}`));
        tr.appendChild(el('td', '', `${att.accuracy}%`));
        tr.appendChild(el('td', '', formatClock(att.time_taken_sec ?? att.timeTakenSec ?? 0)));
        tr.appendChild(el('td', '', (att.created_at && pc) ? pc.formatDate(att.created_at) : ''));

        const actionTd = el('td');
        const retakeBtn = el('button', 'pc-btn', 'Practice Again →');
        retakeBtn.type = 'button';
        retakeBtn.addEventListener('click', () => {
          if (historyPanelEl) historyPanelEl.hidden = true;
          startTest(att.test_slug || att.test_id, true);
        });
        actionTd.appendChild(retakeBtn);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      historyBodyEl.replaceChildren(wrap);
    } catch (_) {
      historyBodyEl.replaceChildren(el('p', 'pc-card__summary', 'Unable to load attempt history right now.'));
    }
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

    const lbBtn = el('button', 'pc-btn', '🏆 Leaderboard');
    lbBtn.type = 'button';
    lbBtn.addEventListener('click', () => openListLeaderboard(item));
    footer.appendChild(lbBtn);

    if (pc && typeof pc.createBookmarkButton === 'function') {
      footer.appendChild(pc.createBookmarkButton({
        type: 'mock-test',
        id: item.slug || item.id,
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
        submitTest();
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
        if (session.submitted) return;
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
        if (session.submitted) return;
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
      btnNext.textContent = session.currentIndex + 1 < total ? 'Save & Next →' : 'Finish & Submit →';
    }

    renderPalette();
  }

  function renderBreakdown(breakdownList) {
    if (!cbtBreakdownEl) return;
    cbtBreakdownEl.replaceChildren();
    if (!Array.isArray(breakdownList) || breakdownList.length === 0) return;

    const qById = new Map(session.questions.map(q => [q.id, q]));

    breakdownList.forEach((item, idx) => {
      const q = qById.get(item.questionId) || item;
      const status = item.status || 'unanswered';
      const card = el('div', `cbt-review-card cbt-review-card--${status}`);

      const head = el('div', 'cbt-review-head');
      head.appendChild(el('strong', '', `Q${idx + 1}. ${q.section ? `[${q.section}]` : ''}`));

      const badgeCls = status === 'correct'
        ? 'pc-badge pc-badge--green'
        : status === 'wrong'
          ? 'pc-badge pc-badge--amber'
          : 'pc-badge';
      const deltaStr = item.marksAwarded > 0 ? `+${item.marksAwarded}` : String(item.marksAwarded ?? 0);
      const statusLabel = status === 'correct'
        ? `✓ Correct (${deltaStr})`
        : status === 'wrong'
          ? `✕ Incorrect (${deltaStr})`
          : '○ Unanswered (0)';
      head.appendChild(el('span', badgeCls, statusLabel));
      card.appendChild(head);

      card.appendChild(el('p', 'cbt-q-stem', q.question_en || ''));
      if (q.question_or && session.showOdia) {
        card.appendChild(el('p', 'cbt-q-stem-or', q.question_or));
      }

      const optMap = {
        A: q.option_a || '',
        B: q.option_b || '',
        C: q.option_c || '',
        D: q.option_d || ''
      };

      const ansRow = el('div', 'cbt-review-ans');
      const userKey = item.selectedOption || 'None';
      const userText = item.selectedOption && optMap[item.selectedOption] ? ` (${optMap[item.selectedOption]})` : '';
      ansRow.appendChild(el('span', '', `Your Answer: ${userKey}${userText}`));

      const corrKey = item.correctOption || '—';
      const corrText = item.correctOption && optMap[item.correctOption] ? ` (${optMap[item.correctOption]})` : '';
      ansRow.appendChild(el('span', '', `Correct Key: ${corrKey}${corrText}`));
      card.appendChild(ansRow);

      if (item.explanation) {
        const exp = el('div', 'cbt-review-exp');
        exp.appendChild(el('strong', '', 'Explanation: '));
        exp.appendChild(el('span', '', item.explanation));
        card.appendChild(exp);
      }

      cbtBreakdownEl.appendChild(card);
    });
  }

  async function submitTest() {
    if (session.submitting || !session.test) return;
    stopTimer();
    session.submitting = true;
    if (btnSubmit) btnSubmit.disabled = true;

    qPaneEl.hidden = true;
    summaryPaneEl.hidden = false;
    summarySubtitleEl.textContent = 'Grading your responses on the server…';
    if (summaryBannerEl) summaryBannerEl.replaceChildren();
    summaryStatsEl.replaceChildren();
    if (cbtLeaderboardEl) cbtLeaderboardEl.replaceChildren();
    if (cbtBreakdownEl) cbtBreakdownEl.replaceChildren();

    const slugOrId = session.test.slug || session.test.id;

    try {
      const res = await fetch(`/api/content/mock-tests/${encodeURIComponent(slugOrId)}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSO-CSRF': '1'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          answers: session.answers,
          timeTakenSec: session.elapsedSeconds
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      session.submitted = true;

      summarySubtitleEl.textContent = `${session.test.title || 'Mock Test'} — Official server-graded scorecard.`;

      if (summaryBannerEl) {
        summaryBannerEl.replaceChildren();
        if (data.persisted) {
          const rankBanner = el('div', 'cbt-banner cbt-banner--rank');
          rankBanner.appendChild(
            el('strong', '', `🏆 Rank #${data.rank} of ${data.totalParticipants || data.totalAttempts || 1} (${data.percentile ?? 100}%ile)`)
          );
          rankBanner.appendChild(
            el('span', '', '✓ Attempt saved to your candidate profile & leaderboard.')
          );
          summaryBannerEl.appendChild(rankBanner);
        } else {
          const guestBanner = el('div', 'cbt-banner cbt-banner--guest');
          guestBanner.appendChild(
            el('span', '', 'You practiced as a guest. Sign in to save your CBT attempts to D1 and appear on the state-wide leaderboard.')
          );
          const signInLink = el('a', 'pc-btn pc-btn--primary', 'Sign In to Save Progress →');
          signInLink.href = `/login.html?redirect=${encodeURIComponent('/mock-tests/?test=' + slugOrId)}`;
          guestBanner.appendChild(signInLink);
          summaryBannerEl.appendChild(guestBanner);
        }
      }

      const boxes = [
        [`${data.score} / ${data.maxScore}`, 'Final Score'],
        [`${data.accuracy}%`, 'Accuracy'],
        [String(data.correctCount), 'Correct'],
        [String(data.wrongCount), 'Wrong'],
        [String(data.unansweredCount), 'Unanswered'],
        [formatClock(data.timeTakenSec ?? session.elapsedSeconds), 'Time Taken']
      ];

      boxes.forEach(([val, label]) => {
        const b = el('div', 'cbt-stat-box');
        b.appendChild(el('strong', '', val));
        b.appendChild(el('span', '', label));
        summaryStatsEl.appendChild(b);
      });

      renderBreakdown(data.breakdown || []);
      loadLeaderboardInto(cbtLeaderboardEl, slugOrId, null);
    } catch (err) {
      summarySubtitleEl.textContent = 'Unable to submit mock test for grading. Please check your connection and try again.';
      const retryBtn = el('button', 'pc-btn pc-btn--primary', 'Retry Submission');
      retryBtn.type = 'button';
      retryBtn.addEventListener('click', () => {
        session.submitting = false;
        submitTest();
      });
      summaryStatsEl.appendChild(retryBtn);
    } finally {
      session.submitting = false;
      if (btnSubmit) btnSubmit.disabled = false;
    }
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
      session.submitting = false;
      session.submitted = false;
      if (btnSubmit) btnSubmit.disabled = false;

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
    session.submitted = false;
    session.submitting = false;
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

  if (historyToggleBtn && historyPanelEl) {
    historyToggleBtn.addEventListener('click', () => {
      const nextHidden = !historyPanelEl.hidden;
      historyPanelEl.hidden = nextHidden;
      if (!nextHidden) {
        loadAttemptHistory();
      }
    });
  }

  if (historyCloseBtn && historyPanelEl) {
    historyCloseBtn.addEventListener('click', () => {
      historyPanelEl.hidden = true;
    });
  }

  if (leaderboardCloseBtn && leaderboardPanelEl) {
    leaderboardCloseBtn.addEventListener('click', () => {
      leaderboardPanelEl.hidden = true;
    });
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
      if (!q || session.submitted) return;
      session.flagged[q.id] = !session.flagged[q.id];
      renderCurrentQuestion();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const q = session.questions[session.currentIndex];
      if (!q || session.submitted) return;
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
        submitTest();
      }
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', submitTest);
  }

  if (btnRetake) {
    btnRetake.addEventListener('click', () => {
      if (session.test) {
        startTest(session.test.slug || session.test.id, false);
      }
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
      if (!qPaneEl.hidden) renderCurrentQuestion();
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
