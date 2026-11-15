(function () {
  'use strict';

  var state = {
    lang: 'en',
    q: '',
    sponsor: '',
    schemeType: '',
    beneficiary: '',
    mode: '',
    domain: '',
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasMore: false,
    overview: null,
    items: []
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'class') node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function renderTelemetry(overview) {
    var kpis = document.getElementById('schemes-kpis');
    if (!kpis || !overview) return;
    clear(kpis);
    var totals = overview.totals || {};
    var domains = overview.domains || [];
    var totalEntriesDisplay = Math.max(Number(totals.totalEntries || 0), Number(totals.totalPublished || 0));

    [
      { label: 'Navigation Groups', val: totals.totalDomains || domains.length || 8 },
      { label: 'Main Sections', val: totals.totalSections || 0 },
      { label: 'Subcategories', val: totals.totalSubcategories || 0 },
      { label: 'Detailed Entries', val: totalEntriesDisplay }
    ].forEach(function (k) {
      kpis.appendChild(el('div', { class: 'cso-schemes-kpi' }, [
        el('div', { class: 'cso-schemes-kpi-label', text: k.label }),
        el('div', { class: 'cso-schemes-kpi-val', text: Number(k.val || 0).toLocaleString('en-IN') })
      ]));
    });
  }

  function renderDomains(overview) {
    var rail = document.getElementById('schemes-rail-nav');
    var grid = document.getElementById('schemes-domain-grid');
    if (!overview || !Array.isArray(overview.domains)) return;
    if (rail) {
      clear(rail);
      rail.appendChild(el('a', { class: 'cso-schemes-nav-link is-active', href: '/schemes/' }, [
        el('span', { class: 'cso-schemes-nav-num', text: 'All' }),
        el('span', { class: 'cso-schemes-rail-label', text: 'Overview' }),
        el('span', { class: 'cso-schemes-nav-count', text: String(overview.domains.length) })
      ]));
    }
    if (grid) clear(grid);

    var icons = {
      'government-public-welfare': '🏛',
      'education-employment-talent': '🎓',
      'agriculture-business-livelihoods': '🌾',
      'health-housing-financial': '🏥',
      'communities-special-beneficiaries': '🤝',
      'private-global-innovation': '💡',
      'find-schemes-eligibility': '🧭',
      'citizen-services-verification': '✔'
    };

    overview.domains.forEach(function (d) {
      var title = state.lang === 'or' && d.titleOr ? d.titleOr : d.title;
      var href = d.publicPath || ('/schemes/' + encodeURIComponent(d.slug) + '/');
      var icon = icons[d.slug] || '•';
      if (rail) {
        rail.appendChild(el('a', { class: 'cso-schemes-nav-link', href: href }, [
          el('span', { class: 'cso-schemes-nav-num', text: icon }),
          el('span', { class: 'cso-schemes-rail-label', text: title }),
          el('span', { class: 'cso-schemes-nav-count', text: String(d.folder_count || 0) })
        ]));
      }
      if (grid) {
        grid.appendChild(el('a', { class: 'cso-schemes-domain-card', href: href }, [
          el('div', { class: 'cso-schemes-domain-top' }, [
            el('span', { text: icon + ' Category' }),
            el('span', { text: (d.folder_count || 0) + ' categories · ' + (d.item_count || 0) + ' entries' })
          ]),
          el('div', { class: 'cso-schemes-domain-title', text: title }),
          el('div', { class: 'cso-schemes-domain-desc', text: d.summary || '' })
        ]));
      }
    });
  }

  function renderPagination() {
    var pagEl = document.getElementById('schemes-pagination');
    if (!pagEl) return;
    clear(pagEl);
    if (!state.total) return;

    var info = el('div', {
      class: 'cso-schemes-page-info',
      text: 'Page ' + state.page + ' of ' + state.totalPages + ' · ' + state.total + ' total schemes'
    });
    var btns = el('div', { class: 'cso-schemes-page-btns' });

    if (state.page > 1) {
      var prevBtn = el('button', { type: 'button', class: 'cso-schemes-btn', text: '← Previous' });
      prevBtn.addEventListener('click', function () {
        state.page -= 1;
        loadItems(false);
      });
      btns.appendChild(prevBtn);
    }
    if (state.hasMore) {
      var moreBtn = el('button', { type: 'button', class: 'cso-schemes-btn', text: 'Load More' });
      moreBtn.addEventListener('click', function () {
        state.page += 1;
        loadItems(true);
      });
      var nextBtn = el('button', { type: 'button', class: 'cso-schemes-btn cso-schemes-btn-primary', text: 'Next Page →' });
      nextBtn.addEventListener('click', function () {
        state.page += 1;
        loadItems(false);
      });
      btns.appendChild(moreBtn);
      btns.appendChild(nextBtn);
    }

    pagEl.appendChild(info);
    pagEl.appendChild(btns);
  }

  function renderItems(items) {
    var host = document.getElementById('schemes-items-grid');
    var countEl = document.getElementById('schemes-results-count');
    if (!host) return;
    clear(host);
    if (countEl) countEl.textContent = 'Showing ' + items.length + ' of ' + state.total + ' verified schemes';
    if (!items.length) {
      host.appendChild(el('div', { class: 'cso-schemes-item-card' }, [
        el('p', { text: 'No published schemes match your current filters. Try clearing filters or browsing one of the 8 directory domains above.' })
      ]));
      renderPagination();
      return;
    }
    items.forEach(function (it) {
      var title = state.lang === 'or' && it.title_or ? it.title_or : it.title;
      var metaChildren = [
        el('span', { class: 'cso-schemes-tag', text: it.sponsor_level || 'Odisha State' }),
        el('span', { text: it.department_name || 'Govt of Odisha' })
      ];
      if (it.benefit_amount) metaChildren.push(el('span', { text: 'Benefit: ' + it.benefit_amount }));
      if (it.application_mode) metaChildren.push(el('span', { text: it.application_mode }));

      var actions = [
        el('a', { class: 'cso-schemes-btn cso-schemes-btn-primary', href: '/schemes/item/' + encodeURIComponent(it.slug || it.id) + '/' }, ['View Details'])
      ];
      if (it.official_apply_url) {
        actions.push(el('a', { class: 'cso-schemes-btn', href: it.official_apply_url, target: '_blank', rel: 'noopener noreferrer' }, ['Apply Online ↗']));
      }
      host.appendChild(el('article', { class: 'cso-schemes-item-card' }, [
        el('div', { class: 'cso-schemes-item-meta' }, metaChildren),
        el('h3', { class: 'cso-schemes-item-title', text: title }),
        el('div', { class: 'cso-schemes-item-meta', text: (it.beneficiary_group ? 'Beneficiaries: ' + it.beneficiary_group + ' · ' : '') + (it.summary || '') }),
        el('div', { class: 'cso-schemes-item-actions' }, actions)
      ]));
    });
    renderPagination();
  }

  async function loadItems(append) {
    var qs = new URLSearchParams();
    if (state.q) qs.set('q', state.q);
    if (state.sponsor) qs.set('sponsor_level', state.sponsor);
    if (state.schemeType) qs.set('scheme_type', state.schemeType);
    if (state.beneficiary) qs.set('beneficiary_group', state.beneficiary);
    if (state.mode) qs.set('application_mode', state.mode);
    if (state.domain) qs.set('domain', state.domain);
    qs.set('page', String(state.page));
    qs.set('limit', String(state.limit));
    var res = await fetch('/api/public/schemes-directory/items?' + qs.toString());
    if (!res.ok) return;
    var data = await res.json();
    var incoming = Array.isArray(data.items) ? data.items : [];
    state.items = append ? state.items.concat(incoming) : incoming;
    state.total = Number(data.total || state.items.length);
    state.totalPages = Number(data.totalPages || 1);
    state.hasMore = Boolean(data.hasMore);
    renderItems(state.items);
  }

  async function init() {
    var shell = document.getElementById('schemes-shell');
    var railToggle = document.getElementById('schemes-rail-toggle');
    var mobileOpen = document.getElementById('schemes-mobile-open');
    var backdrop = document.getElementById('schemes-backdrop');
    if (railToggle && shell) {
      railToggle.addEventListener('click', function () {
        var collapsed = shell.classList.toggle('is-collapsed');
        railToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    }
    if (mobileOpen && shell) {
      mobileOpen.addEventListener('click', function () { shell.classList.add('is-mobile-open'); });
    }
    if (backdrop && shell) {
      backdrop.addEventListener('click', function () { shell.classList.remove('is-mobile-open'); });
    }

    var langBtn = document.getElementById('schemes-lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        state.lang = state.lang === 'en' ? 'or' : 'en';
        langBtn.textContent = state.lang === 'en' ? 'EN / ଓଡ଼ିଆ' : 'ଓଡ଼ିଆ / EN';
        renderDomains(state.overview);
        renderItems(state.items);
      });
    }

    var eligBtn = document.getElementById('schemes-elig-pill');
    if (eligBtn) {
      eligBtn.addEventListener('click', function () {
        state.domain = 'find-schemes-eligibility';
        state.page = 1;
        loadItems(false);
        var gridEl = document.getElementById('schemes-items-grid');
        if (gridEl && gridEl.scrollIntoView) gridEl.scrollIntoView({ behavior: 'smooth' });
      });
    }

    document.querySelectorAll('.cso-schemes-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.cso-schemes-pill').forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        state.q = pill.getAttribute('data-q') || '';
        state.domain = pill.getAttribute('data-domain') || '';
        state.page = 1;
        var searchEl = document.getElementById('schemes-search');
        if (searchEl) searchEl.value = state.q;
        loadItems(false);
      });
    });

    var searchEl = document.getElementById('schemes-search');
    var sponsorEl = document.getElementById('schemes-sponsor');
    var typeEl = document.getElementById('schemes-type');
    var benEl = document.getElementById('schemes-beneficiary');
    var modeEl = document.getElementById('schemes-mode');
    var resetEl = document.getElementById('schemes-reset');

    var timer = null;
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = searchEl.value.trim();
          state.page = 1;
          loadItems(false);
        }, 220);
      });
    }
    if (sponsorEl) sponsorEl.addEventListener('change', function () { state.sponsor = sponsorEl.value; state.page = 1; loadItems(false); });
    if (typeEl) typeEl.addEventListener('change', function () { state.schemeType = typeEl.value; state.page = 1; loadItems(false); });
    if (benEl) benEl.addEventListener('change', function () { state.beneficiary = benEl.value; state.page = 1; loadItems(false); });
    if (modeEl) modeEl.addEventListener('change', function () { state.mode = modeEl.value; state.page = 1; loadItems(false); });
    if (resetEl) {
      resetEl.addEventListener('click', function () {
        state.q = ''; state.sponsor = ''; state.schemeType = ''; state.beneficiary = ''; state.mode = ''; state.domain = ''; state.page = 1;
        if (searchEl) searchEl.value = '';
        if (sponsorEl) sponsorEl.value = '';
        if (typeEl) typeEl.value = '';
        if (benEl) benEl.value = '';
        if (modeEl) modeEl.value = '';
        document.querySelectorAll('.cso-schemes-pill').forEach(function (p, i) { p.classList.toggle('is-active', i === 0); });
        loadItems(false);
      });
    }

    var ovRes = await fetch('/api/public/schemes-directory/overview');
    if (ovRes.ok) {
      state.overview = await ovRes.json();
      renderTelemetry(state.overview);
      renderDomains(state.overview);
    }
    await loadItems(false);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
