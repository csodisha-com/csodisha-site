(function () {
  'use strict';

  var state = {
    lang: 'en',
    q: '',
    region: '',
    membership: '',
    channel: '',
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
    var kpis = document.getElementById('community-kpis');
    if (!kpis || !overview) return;
    clear(kpis);
    var totals = overview.totals || {};
    var domains = overview.domains || [];

    [
      { label: 'Community Domains', val: totals.totalDomains || domains.length || 10 },
      { label: 'Directory Categories', val: totals.totalFolders || 0 },
      { label: 'Published Communities', val: totals.totalPublished || 0 },
      { label: 'Safety-Verified Circles', val: totals.totalVerified || 0 }
    ].forEach(function (k) {
      kpis.appendChild(el('div', { class: 'cso-comm-kpi' }, [
        el('div', { class: 'cso-comm-kpi-label', text: k.label }),
        el('div', { class: 'cso-comm-kpi-val', text: Number(k.val || 0).toLocaleString('en-IN') })
      ]));
    });
  }

  function renderDomains(overview) {
    var rail = document.getElementById('community-rail-nav');
    var grid = document.getElementById('community-domain-grid');
    if (!overview || !Array.isArray(overview.domains)) return;
    if (rail) {
      clear(rail);
      rail.appendChild(el('a', { class: 'cso-comm-nav-link is-active', href: '/community/' }, [
        el('span', { class: 'cso-comm-nav-num', text: 'All' }),
        el('span', { class: 'cso-comm-rail-label', text: 'Overview' }),
        el('span', { class: 'cso-comm-nav-count', text: String(overview.domains.length) })
      ]));
    }
    if (grid) clear(grid);

    overview.domains.forEach(function (d) {
      var href = d.publicPath || ('/community/' + encodeURIComponent(d.slug) + '/');
      if (rail) {
        rail.appendChild(el('a', { class: 'cso-comm-nav-link', href: href }, [
          el('span', { class: 'cso-comm-nav-num', text: d.num }),
          el('span', { class: 'cso-comm-rail-label', text: d.title }),
          el('span', { class: 'cso-comm-nav-count', text: String(d.folder_count || 0) })
        ]));
      }
      if (grid) {
        grid.appendChild(el('a', { class: 'cso-comm-domain-card', href: href }, [
          el('div', { class: 'cso-comm-domain-top' }, [
            el('span', { text: 'MODULE #' + d.num }),
            el('span', { text: (d.folder_count || 0) + ' dirs · ' + (d.item_count || 0) + ' live' })
          ]),
          el('div', { class: 'cso-comm-domain-title', text: d.title }),
          el('div', { class: 'cso-comm-domain-desc', text: d.summary || '' })
        ]));
      }
    });
  }

  function renderPagination() {
    var pagEl = document.getElementById('community-pagination');
    if (!pagEl) return;
    clear(pagEl);
    if (!state.total) return;

    var info = el('div', {
      class: 'cso-comm-page-info',
      text: 'Page ' + state.page + ' of ' + state.totalPages + ' · ' + state.total + ' total communities'
    });
    var btns = el('div', { class: 'cso-comm-page-btns' });

    if (state.page > 1) {
      var prevBtn = el('button', { type: 'button', class: 'cso-comm-btn', text: '← Previous' });
      prevBtn.addEventListener('click', function () {
        state.page -= 1;
        loadItems(false);
      });
      btns.appendChild(prevBtn);
    }
    if (state.hasMore) {
      var moreBtn = el('button', { type: 'button', class: 'cso-comm-btn', text: 'Load More' });
      moreBtn.addEventListener('click', function () {
        state.page += 1;
        loadItems(true);
      });
      var nextBtn = el('button', { type: 'button', class: 'cso-comm-btn cso-comm-btn-primary', text: 'Next Page →' });
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
    var host = document.getElementById('community-items-grid');
    var countEl = document.getElementById('community-results-count');
    if (!host) return;
    clear(host);
    if (countEl) countEl.textContent = 'Showing ' + items.length + ' of ' + state.total + ' verified communities';
    if (!items.length) {
      host.appendChild(el('div', { class: 'cso-comm-item-card' }, [
        el('p', { text: 'No published communities match your current filters. Try clearing filters or browsing one of the 10 directory domains above.' })
      ]));
      renderPagination();
      return;
    }
    items.forEach(function (it) {
      var title = state.lang === 'or' && it.title_or ? it.title_or : it.title;
      var metaChildren = [
        el('span', { class: 'cso-comm-tag', text: it.district_region || 'All Odisha (30 Districts)' }),
        el('span', { text: it.membership_model || 'Open & Free' }),
        el('span', { text: it.platform_channel || 'Hybrid' })
      ];
      if (it.safety_verified) metaChildren.push(el('span', { class: 'cso-comm-tag', text: 'Safety Verified' }));

      var actions = [
        el('a', { class: 'cso-comm-btn cso-comm-btn-primary', href: '/community/item/' + encodeURIComponent(it.slug || it.id) + '/' }, ['View Charter & Details'])
      ];
      if (it.join_or_portal_url) {
        actions.push(el('a', { class: 'cso-comm-btn', href: it.join_or_portal_url, target: '_blank', rel: 'noopener noreferrer' }, ['Join / Portal ↗']));
      }
      host.appendChild(el('article', { class: 'cso-comm-item-card' }, [
        el('div', { class: 'cso-comm-item-meta' }, metaChildren),
        el('h3', { class: 'cso-comm-item-title', text: title }),
        el('div', { class: 'cso-comm-item-meta', text: it.summary || '' }),
        el('div', { class: 'cso-comm-item-actions' }, actions)
      ]));
    });
    renderPagination();
  }

  async function loadItems(append) {
    var qs = new URLSearchParams();
    if (state.q) qs.set('q', state.q);
    if (state.region) qs.set('district_region', state.region);
    if (state.membership) qs.set('membership_model', state.membership);
    if (state.channel) qs.set('platform_channel', state.channel);
    if (state.domain) qs.set('domain', state.domain);
    if (state.lang === 'or') qs.set('language', 'OR');
    qs.set('page', String(state.page));
    qs.set('limit', String(state.limit));
    var res = await fetch('/api/public/community-directory/items?' + qs.toString());
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
    var shell = document.getElementById('community-shell');
    var railToggle = document.getElementById('community-rail-toggle');
    var mobileOpen = document.getElementById('community-mobile-open');
    var backdrop = document.getElementById('community-backdrop');
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

    var langBtn = document.getElementById('community-lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        state.lang = state.lang === 'en' ? 'or' : 'en';
        langBtn.textContent = state.lang === 'en' ? 'EN / ଓଡ଼ିଆ' : 'ଓଡ଼ିଆ / EN';
        renderItems(state.items);
      });
    }

    document.querySelectorAll('.cso-comm-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.cso-comm-pill').forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        state.q = pill.getAttribute('data-q') || '';
        state.domain = pill.getAttribute('data-domain') || '';
        state.page = 1;
        var searchEl = document.getElementById('community-search');
        if (searchEl) searchEl.value = state.q;
        loadItems(false);
      });
    });

    var searchEl = document.getElementById('community-search');
    var regionEl = document.getElementById('community-region');
    var memEl = document.getElementById('community-membership');
    var chanEl = document.getElementById('community-channel');
    var resetEl = document.getElementById('community-reset');

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
    if (regionEl) regionEl.addEventListener('change', function () { state.region = regionEl.value; state.page = 1; loadItems(false); });
    if (memEl) memEl.addEventListener('change', function () { state.membership = memEl.value; state.page = 1; loadItems(false); });
    if (chanEl) chanEl.addEventListener('change', function () { state.channel = chanEl.value; state.page = 1; loadItems(false); });
    if (resetEl) {
      resetEl.addEventListener('click', function () {
        state.q = ''; state.region = ''; state.membership = ''; state.channel = ''; state.domain = ''; state.page = 1;
        if (searchEl) searchEl.value = '';
        if (regionEl) regionEl.value = '';
        if (memEl) memEl.value = '';
        if (chanEl) chanEl.value = '';
        document.querySelectorAll('.cso-comm-pill').forEach(function (p, i) { p.classList.toggle('is-active', i === 0); });
        loadItems(false);
      });
    }

    var ovRes = await fetch('/api/public/community-directory/overview');
    if (ovRes.ok) {
      state.overview = await ovRes.json();
      renderTelemetry(state.overview);
      renderDomains(state.overview);
    }
    await loadItems(false);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
