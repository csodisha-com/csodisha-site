/* Clean-Slate v238: Shared 100% live D1 page loader for standalone public routes.
   Strict CSP-compliant: document.createElement / textContent / replaceChildren only. */
(function () {
  'use strict';

  var EMPTY_MSG = 'No updates in this category yet. Check back soon or explore other sections.';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function safeUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  async function hydrateCleanPage() {
    var mount = document.getElementById('cso-clean-page-content');
    if (!mount) return;

    var slug = mount.getAttribute('data-page-slug') || '';
    var pillarSlug = mount.getAttribute('data-pillar-slug') || '';
    var items = [];

    try {
      var tasks = [fetch('/api/nav/config', { cache: 'no-store' })];
      if (slug) {
        tasks.push(fetch('/api/content/pages?slug=' + encodeURIComponent(slug), { cache: 'no-store' }));
      }
      var results = await Promise.allSettled(tasks);

      if (results[1] && results[1].status === 'fulfilled' && results[1].value.ok) {
        var pageData = await results[1].value.json();
        var list = Array.isArray(pageData && pageData.items) ? pageData.items : (pageData && pageData.page ? [pageData.page] : []);
        list.forEach(function (p) {
          if (!p || !p.title) return;
          items.push({
            title: p.title,
            summary: p.summary || p.description || '',
            url: p.url || ''
          });
        });
      }

      if (!items.length && pillarSlug && results[0] && results[0].status === 'fulfilled' && results[0].value.ok) {
        var navData = await results[0].value.json();
        var cats = Array.isArray(navData && navData.categories) ? navData.categories : [];
        var pillar = cats.find(function (c) { return c.slug === pillarSlug || c.target_portal === pillarSlug; });
        var subs = pillar && Array.isArray(pillar.subcategories) ? pillar.subcategories : [];
        subs.forEach(function (s) {
          items.push({
            title: s.name_en || s.slug || 'Category',
            summary: s.description_en || '',
            url: s.landing_url || ''
          });
        });
      }
    } catch (_) {}

    mount.replaceChildren();
    if (!items.length) {
      var box = el('div', 'card cso-empty-state');
      box.appendChild(el('p', '', EMPTY_MSG));
      mount.appendChild(box);
      return;
    }

    var grid = el('div', 'cso-clean-grid');
    items.forEach(function (it) {
      var card = el('article', 'card');
      card.appendChild(el('h2', '', it.title));
      if (it.summary) card.appendChild(el('p', '', it.summary));
      var href = safeUrl(it.url);
      if (href) {
        var a = el('a', '', 'Open →');
        a.href = href;
        card.appendChild(a);
      }
      grid.appendChild(card);
    });
    mount.appendChild(grid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCleanPage);
  } else {
    hydrateCleanPage();
  }
})();
