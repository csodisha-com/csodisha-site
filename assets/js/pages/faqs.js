/* Clean-Slate v238: 100% live D1 & strict CSP FAQ loader (zero hardcoded starter FAQs). */
(function () {
  'use strict';

  var EMPTY_MSG = 'No FAQs available in this category yet. Select All to view available answers.';
  var activeCategory = 'all';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function renderFaqs(items) {
    var catContainer = document.getElementById('faqs-category-pills');
    var container = document.getElementById('faqs-accordion-container');
    if (!container) return;

    var list = Array.isArray(items) ? items.filter(function (i) { return i && i.active !== false; }) : [];
    var categories = Array.from(new Set(list.map(function (i) { return i.category; }).filter(Boolean)));

    if (catContainer) {
      catContainer.replaceChildren();
      catContainer.hidden = !categories.length;
      if (categories.length) {
        var allBtn = el('button', 'filter-btn' + (activeCategory === 'all' ? ' active' : ''), 'All');
        allBtn.type = 'button';
        allBtn.addEventListener('click', function () { activeCategory = 'all'; renderFaqs(list); });
        catContainer.appendChild(allBtn);

        categories.forEach(function (cat) {
          var btn = el('button', 'filter-btn' + (activeCategory === cat ? ' active' : ''), cat);
          btn.type = 'button';
          btn.addEventListener('click', function () { activeCategory = cat; renderFaqs(list); });
          catContainer.appendChild(btn);
        });
      }
    }

    var filtered = activeCategory === 'all'
      ? list
      : list.filter(function (i) { return String(i.category || '').toLowerCase() === activeCategory.toLowerCase(); });

    container.replaceChildren();
    if (!filtered.length) {
      var box = el('div', 'card cso-empty-state');
      box.appendChild(el('p', '', EMPTY_MSG));
      container.appendChild(box);
      return;
    }

    filtered.forEach(function (item) {
      var details = el('details', 'faq-card');
      var summary = el('summary');
      if (item.category) summary.appendChild(el('span', 'faq-cat-badge', item.category));
      summary.appendChild(el('span', '', item.question || ''));
      details.appendChild(summary);
      details.appendChild(el('div', 'faq-content', item.answer || ''));
      container.appendChild(details);
    });
  }

  async function hydrateFaqs() {
    var items = [];
    try {
      var res = await fetch('/api/content/pages?slug=faqs', { cache: 'no-store' });
      if (res.ok) {
        var data = await res.json();
        if (Array.isArray(data && data.faqs)) items = data.faqs;
      }
    } catch (_) {}
    renderFaqs(items);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateFaqs);
  } else {
    hydrateFaqs();
  }
})();
