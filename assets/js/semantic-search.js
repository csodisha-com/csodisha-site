/* "Ask CSOdisha" Smart Semantic Search Client (v320) — 100% CSP-Safe */
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
    career: 'Career'
  };

  function mountAskBar() {
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
          resultsBox.hidden = false;
          resultsBox.replaceChildren();
          var meta = el('div', 'cso-ask-meta');
          meta.appendChild(el('span', '', (data.results || []).length + ' matching article(s) for "' + q + '"'));
          var metaRight = el('div', 'cso-ask-meta-right');
          metaRight.appendChild(el('span', 'cso-ask-mode-badge', data.mode === 'semantic' ? 'Semantic AI Match' : 'Instant Keyword Match'));
          var panelResetBtn = el('button', 'cso-ask-clear-btn cso-ask-panel-reset-btn', '✕ Close / Reset');
          panelResetBtn.type = 'button';
          panelResetBtn.setAttribute('aria-label', 'Close and reset Ask CSOdisha results');
          panelResetBtn.addEventListener('click', resetSearch);
          metaRight.appendChild(panelResetBtn);
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
            ansCard.appendChild(el('p', 'cso-ask-answer-en', data.ai_answer.answer_en));
            if (data.ai_answer.answer_or) {
              ansCard.appendChild(el('p', 'cso-ask-answer-or', data.ai_answer.answer_or));
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAskBar);
  } else {
    mountAskBar();
  }
})();
