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

    var resultsBox = el('div', 'cso-ask-results');
    resultsBox.hidden = true;
    resultsBox.setAttribute('aria-live', 'polite');

    form.append(lbl, input, sel, btn);
    bar.append(form, resultsBox);

    if (main.firstChild) main.insertBefore(bar, main.firstChild);
    else main.appendChild(bar);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q.length < 2) {
        resultsBox.hidden = false;
        resultsBox.replaceChildren(el('p', 'cso-ask-item-summary', 'Enter at least 2 characters in English or ଓଡ଼ିଆ.'));
        input.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Searching…';
      fetch('/api/search/semantic?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(sel.value), {
        credentials: 'same-origin'
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
          meta.appendChild(el('span', '', (data.results || []).length + ' result(s) for "' + q + '"'));
          meta.appendChild(el('span', 'cso-ask-mode-badge', data.mode === 'semantic' ? 'Semantic AI Match' : 'Instant Keyword Match'));
          resultsBox.appendChild(meta);

          if (!data.results || !data.results.length) {
            resultsBox.appendChild(el('p', 'cso-ask-item-summary', 'No matching published notices or guides found yet. Try broader keywords.'));
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
          resultsBox.hidden = false;
          resultsBox.replaceChildren(el('p', 'cso-ask-item-summary', err.message || 'Search failed.'));
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Ask CSOdisha';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAskBar);
  } else {
    mountAskBar();
  }
})();
