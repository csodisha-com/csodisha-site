/* v152: sticky .cso-dir-topbar (Back to Explorer + live filter + module pill) for module/category sub-pages.
   Strict CSP: DOM APIs only, visibility via the hidden attribute. Runs on pages with <main data-cso-subpage-topbar>. */
(function () {
  'use strict';
  var main = document.querySelector('main[data-cso-subpage-topbar]');
  if (!main || main.querySelector('.cso-dir-topbar')) return;
  var explorer = main.getAttribute('data-cso-explorer-url') || location.pathname;
  var placeholder = main.getAttribute('data-cso-search-placeholder') || 'Search programs, eligibility, portals in this module...';
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var bar = el('header', 'cso-dir-topbar');
  bar.id = 'cso-subpage-topbar';
  bar.setAttribute('role', 'search');
  var back = el('a', 'cso-dir-back', '← Back to Explorer');
  back.href = explorer;
  var wrap = el('div', 'cso-dir-search');
  var icon = el('span', 'cso-dir-search-icon', '⌕'); icon.setAttribute('aria-hidden', 'true');
  var input = el('input', 'cso-dir-search-input');
  input.id = 'cso-subpage-search'; input.type = 'search'; input.autocomplete = 'off';
  input.placeholder = placeholder; input.setAttribute('aria-label', placeholder);
  var clear = el('button', 'cso-dir-clear', '×');
  clear.type = 'button'; clear.hidden = true; clear.setAttribute('aria-label', 'Clear search'); clear.title = 'Clear search';
  wrap.append(icon, input, clear);
  var pill = el('a', 'cso-dir-context-pill', '');
  pill.id = 'cso-subpage-context-pill'; pill.href = explorer; pill.setAttribute('aria-live', 'polite');
  bar.append(back, wrap, pill);
  main.prepend(bar);

  function updatePill() {
    var h = main.querySelector('h1, h2');
    pill.textContent = '⌂ ' + (h ? h.textContent.replace(/\s+/g, ' ').trim() : 'Overview');
  }
  var ITEMS = '.cso-card, .card, article, .cso-dir-card, [data-cso-filter-item], li.cso-list-item';
  function apply() {
    var q = input.value.trim().toLowerCase();
    clear.hidden = !q;
    main.querySelectorAll(ITEMS).forEach(function (n) {
      if (bar.contains(n)) return;
      n.hidden = !!q && n.textContent.toLowerCase().indexOf(q) === -1;
    });
  }
  input.addEventListener('input', apply);
  clear.addEventListener('click', function () { input.value = ''; apply(); input.focus(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; apply(); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.defaultPrevented) { e.preventDefault(); input.focus(); }
  });
  var t = null;
  new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(function () { updatePill(); if (input.value) apply(); }, 120);
  }).observe(main, { childList: true, subtree: true });
  window.addEventListener('hashchange', updatePill);
  updatePill();
})();
