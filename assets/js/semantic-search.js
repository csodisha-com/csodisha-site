/* "Ask CSOdisha" Smart Semantic Search Client (v335) — 100% CSP-Safe
 * On homepage (index.html), integrates directly with the Hero Search Bar (#sf, #cso-ask-input,
 * #cso-hero-clear, #cso-hero-ask-results) & Popular Searches chips for a single clean search UX.
 * On portal subpages (/jobs/, /schemes/, /study-library/, /careers/), mounts #csoAskSearchBar.
 */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  var TYPE_LABELS = {
    job: 'Job',
    scheme: 'Scheme',
    study: 'Study',
    career: 'Career',
    guide: 'Guide',
    current_affairs: 'Current Affairs'
  };

  function formatHumanSectionNames(raw) {
    return String(raw || '')
      .replace(/\/jobs-careers\/?/gi, 'Jobs')
      .replace(/\/jobs\/?/gi, 'Jobs')
      .replace(/\/schemes-benefits\/?/gi, 'Government Schemes')
      .replace(/\/schemes\/?/gi, 'Government Schemes')
      .replace(/\/study-library\/?/gi, 'Study Library')
      .replace(/\/guides\/?/gi, 'Informative Guides')
      .replace(/\/mock-tests\/?/gi, 'CBT Mock Tests')
      .replace(/\/current-affairs\/?/gi, 'Current Affairs')
      .replace(/\/careers\/?/gi, 'Careers')
      .replace(/\/resources\/?/gi, 'Syllabus & PYQs');
  }

  function renderSemanticResults(resultsBox, q, data) {
    resultsBox.hidden = false;
    resultsBox.replaceChildren();

    var meta = el('div', 'cso-ask-meta');
    meta.appendChild(el('span', '', (data.results || []).length + ' matching article(s) for "' + q + '"'));
    var metaRight = el('div', 'cso-ask-meta-right');
    metaRight.appendChild(el('span', 'cso-ask-mode-badge', data.mode === 'semantic' ? 'Semantic AI Match' : 'Instant Keyword Match'));
    meta.appendChild(metaRight);
    resultsBox.appendChild(meta);

    if (data.ai_answer && data.ai_answer.answer_en) {
      var ansCard = el('div', 'cso-ask-answer-card');
      var ansHead = el('div', 'cso-ask-answer-head');
      ansHead.appendChild(el('strong', 'cso-ask-answer-title', '✨ CSOdisha AI Answer'));
      var badges = el('div', 'cso-ask-answer-badges');
      badges.appendChild(el(
        'span',
        'cso-ask-mode-badge',
        data.ai_answer.grounded ? 'Grounded in CSOdisha Articles' : 'General Odisha Guidance — Verify Official Notification'
      ));
      if (data.ai_answer.cached) {
        badges.appendChild(el('span', 'cso-ask-type-badge', 'Instant Cache'));
      }
      ansHead.appendChild(badges);
      ansCard.appendChild(ansHead);
      ansCard.appendChild(el('p', 'cso-ask-answer-en', formatHumanSectionNames(data.ai_answer.answer_en)));
      if (data.ai_answer.answer_or) {
        ansCard.appendChild(el('p', 'cso-ask-answer-or', formatHumanSectionNames(data.ai_answer.answer_or)));
      }
      resultsBox.appendChild(ansCard);
    }

    if (!data.results || !data.results.length) {
      var chips = el('div', 'cso-ask-portal-chips');
      [
        ['/jobs/', 'Browse Jobs →'],
        ['/schemes/', 'Browse Schemes →'],
        ['/study-library/', 'Study Library →'],
        ['/mock-tests/', 'CBT Mock Tests →']
      ].forEach(function (pair) {
        var link = el('a', 'cso-ask-type-badge cso-ask-portal-link', pair[1]);
        link.href = pair[0];
        chips.appendChild(link);
      });
      resultsBox.appendChild(chips);
      return;
    }

    data.results.forEach(function (item) {
      var a = el('a', 'cso-ask-item');
      a.href = item.url || '/';
      var head = el('div', 'cso-ask-item-head');
      head.appendChild(el('span', 'cso-ask-type-badge', TYPE_LABELS[item.type] || 'Resource'));
      head.appendChild(el('span', 'cso-ask-item-title', item.title_en || 'Untitled'));
      a.appendChild(head);
      if (item.title_or) a.appendChild(el('span', 'cso-ask-item-or', item.title_or));
      if (item.summary) a.appendChild(el('p', 'cso-ask-item-summary', item.summary));
      resultsBox.appendChild(a);
    });
  }

  function wireHeroAskSearch() {
    var heroForm = document.getElementById('sf');
    var heroInput = document.getElementById('cso-ask-input');
    var heroResults = document.getElementById('cso-hero-ask-results');
    if (!heroForm || !heroInput || !heroResults) return false;

    var clearBtn = document.getElementById('cso-hero-clear');
    var submitBtn = document.getElementById('cso-hero-ask-btn') || heroForm.querySelector('button[type="submit"]');
    var labelEl = submitBtn ? submitBtn.querySelector('.cso-hero-ask-label') : null;
    var activeController = null;

    function setBtnBusy(busy) {
      if (!submitBtn) return;
      submitBtn.disabled = busy;
      if (labelEl) {
        var isOr = false;
        try { isOr = document.documentElement.getAttribute('lang') === 'or' || localStorage.getItem('cso_lang_pref') === 'or'; } catch (_) {}
        labelEl.textContent = busy ? (isOr ? 'ଖୋଜୁଛି…' : 'Asking…') : (isOr ? '✨ ପଚାରନ୍ତୁ' : '✨ Ask');
      }
    }

    function syncClearVisibility() {
      var hasActive = Boolean(heroInput.value.trim()) || !heroResults.hidden;
      heroForm.classList.toggle('has-query', hasActive);
      if (clearBtn) clearBtn.hidden = !hasActive;
    }

    function resetHeroSearch() {
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
      heroInput.value = '';
      heroResults.replaceChildren();
      heroResults.hidden = true;
      setBtnBusy(false);
      var dd = document.getElementById('cso-search-autocomplete');
      if (dd) dd.hidden = true;
      syncClearVisibility();
      heroInput.focus();
    }

    function runHeroSearch(rawQuery, filterType) {
      var q = String(rawQuery !== undefined ? rawQuery : heroInput.value).trim();
      if (rawQuery !== undefined) heroInput.value = q;
      var dd = document.getElementById('cso-search-autocomplete');
      if (dd) dd.hidden = true;

      if (q.length < 2) {
        heroResults.hidden = false;
        heroResults.replaceChildren(el('p', 'cso-ask-item-summary', 'Enter at least 2 characters in English or ଓଡ଼ିଆ.'));
        syncClearVisibility();
        heroInput.focus();
        return;
      }

      if (activeController) activeController.abort();
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      activeController = controller;
      setBtnBusy(true);
      syncClearVisibility();

      var reqType = filterType || 'all';
      fetch('/api/search/semantic?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(reqType), {
        credentials: 'same-origin',
        signal: controller ? controller.signal : undefined
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok || !d.ok) throw new Error(d.error || 'Search unavailable.');
            return d;
          });
        })
        .then(function (data) {
          renderSemanticResults(heroResults, q, data);
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          heroResults.hidden = false;
          heroResults.replaceChildren(el('p', 'cso-ask-item-summary', err.message || 'Search failed.'));
        })
        .finally(function () {
          if (activeController === controller) activeController = null;
          setBtnBusy(false);
          syncClearVisibility();
        });
    }

    if (clearBtn) clearBtn.addEventListener('click', resetHeroSearch);
    heroInput.addEventListener('input', syncClearVisibility);
    heroForm.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (!heroResults.hidden || heroInput.value.trim())) {
        e.preventDefault();
        resetHeroSearch();
      }
    });
    heroForm.addEventListener('submit', function (e) {
      e.preventDefault();
      runHeroSearch(heroInput.value, 'all');
    });

    syncClearVisibility();
    window.CSOAskSearch = {
      run: runHeroSearch,
      reset: resetHeroSearch,
      syncClear: syncClearVisibility
    };
    return true;
  }

  function mountAskBar() {
    // Homepage hero search bar handles Ask CSOdisha natively without mounting a duplicate bar
    if (wireHeroAskSearch()) return;

    var main = document.getElementById('main-content') || document.querySelector('main');
    if (!main || document.getElementById('csoAskSearchBar')) return;

    var bar = el('section', 'cso-ask-bar');
    bar.id = 'csoAskSearchBar';
    bar.setAttribute('aria-label', 'Ask CSOdisha Smart Search');

    var form = el('form', 'cso-ask-form');
    form.noValidate = true;

    var lbl = el('label', 'cso-sr-only', 'Ask CSOdisha in English or Odia');
    lbl.setAttribute('for', 'csoAskSearchInput');

    var input = el('input', 'cso-ask-input');
    input.id = 'csoAskSearchInput';
    input.type = 'search';
    input.placeholder = '✨ Ask CSOdisha (EN / ଓଡ଼ିଆ): e.g. scholarship for +2 girls, OPSC OAS, ଓଡ଼ିଶା ପୋଲିସ...';
    input.autocomplete = 'off';

    var sel = el('select', 'cso-ask-select');
    sel.id = 'csoAskSearchType';
    sel.setAttribute('aria-label', 'Filter search category');
    [
      ['all', 'All Pillars'],
      ['job', 'Jobs'],
      ['scheme', 'Schemes'],
      ['study', 'Study'],
      ['guide', 'Guides'],
      ['career', 'Careers']
    ].forEach(function (pair) {
      var opt = document.createElement('option');
      opt.value = pair[0];
      opt.textContent = pair[1];
      sel.appendChild(opt);
    });

    var btn = el('button', 'cso-ask-btn', 'Ask CSOdisha');
    btn.type = 'submit';

    var clearBtn = el('button', 'cso-ask-clear-btn', '✕ Clear');
    clearBtn.type = 'button';
    clearBtn.hidden = true;
    clearBtn.setAttribute('aria-label', 'Clear search and close results');

    var resultsBox = el('div', 'cso-ask-results');
    resultsBox.hidden = true;
    resultsBox.setAttribute('aria-live', 'polite');

    form.append(lbl, input, sel, btn, clearBtn);
    bar.append(form, resultsBox);

    if (main.firstChild) main.insertBefore(bar, main.firstChild);
    else main.appendChild(bar);

    var activeController = null;

    function syncClearVisibility() {
      clearBtn.hidden = !input.value.trim() && resultsBox.hidden;
    }

    function resetSearch() {
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
      input.value = '';
      sel.value = 'all';
      resultsBox.replaceChildren();
      resultsBox.hidden = true;
      btn.disabled = false;
      btn.textContent = 'Ask CSOdisha';
      syncClearVisibility();
      input.focus();
    }

    clearBtn.addEventListener('click', resetSearch);
    input.addEventListener('input', syncClearVisibility);
    bar.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        resetSearch();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q.length < 2) {
        resultsBox.hidden = false;
        resultsBox.replaceChildren(el('p', 'cso-ask-item-summary', 'Enter at least 2 characters in English or ଓଡ଼ିଆ.'));
        syncClearVisibility();
        input.focus();
        return;
      }
      if (activeController) activeController.abort();
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      activeController = controller;
      btn.disabled = true;
      btn.textContent = 'Searching…';
      syncClearVisibility();
      fetch('/api/search/semantic?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(sel.value), {
        credentials: 'same-origin',
        signal: controller ? controller.signal : undefined
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok || !d.ok) throw new Error(d.error || 'Search unavailable.');
            return d;
          });
        })
        .then(function (data) {
          renderSemanticResults(resultsBox, q, data);
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          resultsBox.hidden = false;
          resultsBox.replaceChildren(el('p', 'cso-ask-item-summary', err.message || 'Search failed.'));
        })
        .finally(function () {
          if (activeController === controller) activeController = null;
          btn.disabled = false;
          btn.textContent = 'Ask CSOdisha';
          syncClearVisibility();
        });
    });

    window.CSOAskSearch = {
      run: function (q) {
        input.value = String(q || '').trim();
        syncClearVisibility();
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      },
      reset: resetSearch,
      syncClear: syncClearVisibility
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAskBar);
  } else {
    mountAskBar();
  }
})();
