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
      { label: 'Community Domains', val: totals.totalDomains || domains.length || 0 },
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
    var catPanel = document.getElementById('community-categories-panel');
    var domains = (overview && Array.isArray(overview.domains)) ? overview.domains : [];
    if (rail) clear(rail);
    if (grid) clear(grid);
    if (catPanel) catPanel.hidden = !domains.length;

    var icons = {
      'local-odisha-communities': '🏘',
      'students-educators-mentorship': '🎓',
      'careers-business-networks': '💼',
      'agriculture-rural-livelihoods': '🌾',
      'women-families-inclusion': '🤝',
      'youth-ngos-volunteering': '🌱',
      'culture-sports-traditional': '🎭',
      'environment-science-tech': '🔬',
      'digital-international-forums': '🌍',
      'community-safety-governance': '🛡'
    };

    if (!domains.length) return;

    domains.forEach(function (d) {
      var clean = function (s) {
        return String(s || '').replace(/^(?:module|track)\s*#?\s*\d+\s*[—–\-:]\s*/i, '').replace(/^directory\s*[—–\-:]\s*/i, '').replace(/^section\s*\d+\s*[·—–\-:]\s*/i, '').trim();
      };
      var title = clean(d.title);
      var href = d.publicPath || ('/community/' + encodeURIComponent(d.slug) + '/');
      var icon = icons[d.slug] || '•';
      if (rail) {
        rail.appendChild(el('a', { class: 'cso-comm-nav-link', href: href, 'data-domain': d.slug }, [
          el('span', { class: 'cso-comm-nav-num', text: icon }),
          el('span', { class: 'cso-comm-rail-label', text: title })
        ]));
      }
      if (grid) {
        grid.appendChild(el('a', { class: 'cso-comm-domain-card', href: href }, [
          el('div', { class: 'cso-comm-domain-title', text: icon + ' ' + title }),
          el('div', { class: 'cso-comm-domain-desc', text: clean(d.summary) })
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
    var filtersBar = document.getElementById('community-filters-bar');
    var pagEl = document.getElementById('community-pagination');
    if (!host) return;
    clear(host);
    var hasFilter = Boolean(state.q || state.region || state.membership || state.channel || state.domain);
    var showControls = items.length > 0 || hasFilter;
    if (filtersBar) filtersBar.hidden = !showControls;
    if (countEl) {
      countEl.hidden = !showControls;
      countEl.textContent = 'Showing ' + items.length + ' of ' + state.total + ' verified communities';
    }
    if (pagEl) pagEl.hidden = !showControls || !state.total;
    if (!items.length) {
      host.appendChild(el('div', { class: 'cso-comm-item-card' }, [
        el('p', { text: hasFilter ? 'No community items match your current filters.' : 'No items published yet — add categories or content in Admin Studio.' })
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

    var topSearch = document.getElementById('community-topbar-search');
    var topClear = document.getElementById('community-topbar-clear');
    var topToggle = document.getElementById('community-topbar-toggle');
    var ctxPill = document.getElementById('community-context-pill');
    var topTimer = null;

    document.querySelectorAll('.cso-comm-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.cso-comm-pill').forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        state.q = pill.getAttribute('data-q') || '';
        state.domain = pill.getAttribute('data-domain') || '';
        state.page = 1;
        if (topSearch) topSearch.value = state.q;
        if (topClear) topClear.hidden = !state.q;
        loadItems(false);
      });
    });

    var regionEl = document.getElementById('community-region');
    var memEl = document.getElementById('community-membership');
    var chanEl = document.getElementById('community-channel');
    var resetEl = document.getElementById('community-reset');

    if (regionEl) regionEl.addEventListener('change', function () { state.region = regionEl.value; state.page = 1; loadItems(false); });
    if (memEl) memEl.addEventListener('change', function () { state.membership = memEl.value; state.page = 1; loadItems(false); });
    if (chanEl) chanEl.addEventListener('change', function () { state.channel = chanEl.value; state.page = 1; loadItems(false); });
    if (resetEl) {
      resetEl.addEventListener('click', function () {
        state.q = ''; state.region = ''; state.membership = ''; state.channel = ''; state.domain = ''; state.page = 1;
        if (topSearch) topSearch.value = '';
        if (topClear) topClear.hidden = true;
        if (regionEl) regionEl.value = '';
        if (memEl) memEl.value = '';
        if (chanEl) chanEl.value = '';
        document.querySelectorAll('.cso-comm-pill').forEach(function (p, i) { p.classList.toggle('is-active', i === 0); });
        loadItems(false);
      });
    }

    function setContext(label) {
      if (ctxPill) ctxPill.textContent = '⌂ ' + (label || 'Overview');
    }
    function highlightMatches(q) {
      var needle = String(q || '').toLowerCase();
      document.querySelectorAll('.cso-comm-domain-card, .cso-comm-nav-link').forEach(function (n) {
        var hit = needle && (n.textContent || '').toLowerCase().indexOf(needle) !== -1;
        n.classList.toggle('is-search-match', Boolean(hit) && n.classList.contains('cso-comm-domain-card'));
        n.classList.toggle('is-search-dim', Boolean(needle) && !hit && n.classList.contains('cso-comm-domain-card'));
      });
    }
    function applyTopSearch(scroll) {
      var q = topSearch ? topSearch.value.trim() : '';
      if (topClear) topClear.hidden = !q;
      state.q = q;
      state.page = 1;
      highlightMatches(q);
      setContext(q ? 'Search: ' + q : (activeLabel || 'Overview'));
      loadItems(false);
      if (scroll) {
        var g = document.getElementById('community-items-grid');
        if (g && g.scrollIntoView) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    var activeLabel = '';
    if (topSearch) {
      topSearch.addEventListener('input', function () {
        clearTimeout(topTimer);
        if (topClear) topClear.hidden = !topSearch.value;
        topTimer = setTimeout(function () { applyTopSearch(false); }, 220);
      });
      topSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(topTimer); applyTopSearch(true); }
        else if (e.key === 'Escape') { topSearch.value = ''; clearTimeout(topTimer); applyTopSearch(false); }
      });
    }
    if (topClear) {
      topClear.addEventListener('click', function () {
        if (topSearch) { topSearch.value = ''; topSearch.focus(); }
        applyTopSearch(false);
      });
    }
    if (topToggle && shell) {
      topToggle.addEventListener('click', function () {
        if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
          shell.classList.add('is-mobile-open');
          topToggle.setAttribute('aria-expanded', 'true');
        } else {
          var collapsed = shell.classList.toggle('is-collapsed');
          topToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
          if (railToggle) railToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
      });
    }
    var topReset = document.getElementById('community-reset');
    if (topReset) {
      topReset.addEventListener('click', function () {
        activeLabel = '';
        if (topSearch) topSearch.value = '';
        if (topClear) topClear.hidden = true;
        highlightMatches('');
        setContext('Overview');
      });
    }
    var railNavEl = document.getElementById('community-rail-nav');
    if (railNavEl) {
      railNavEl.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a.cso-comm-nav-link') : null;
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        var slug = a.getAttribute('data-domain');
        var labelEl = a.querySelector('.cso-comm-rail-label');
        if (slug === null) return;
        e.preventDefault();
        railNavEl.querySelectorAll('a.cso-comm-nav-link').forEach(function (n) { n.classList.toggle('is-active', n === a); });
        activeLabel = slug ? (labelEl ? labelEl.textContent : '') : '';
        state.domain = slug;
        state.q = '';
        state.page = 1;
        if (topSearch) topSearch.value = '';
        if (topClear) topClear.hidden = true;
        highlightMatches('');
        setContext(activeLabel || 'Overview');
        loadItems(false);
        shell && shell.classList.remove('is-mobile-open');
        var g = document.getElementById('community-items-grid');
        if (slug && g && g.scrollIntoView) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    document.querySelectorAll('.cso-comm-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var lbl = pill.getAttribute('data-domain') ? pill.textContent : '';
        activeLabel = lbl;
        if (topSearch) topSearch.value = pill.getAttribute('data-q') || '';
        if (topClear) topClear.hidden = !(topSearch && topSearch.value);
        setContext(lbl || 'Overview');
      });
    });

    var ovResults = await Promise.allSettled([
      fetch('/api/public/community-directory/overview'),
      fetch('/api/nav/config', { cache: 'no-store' })
    ]);
    var ovData = { domains: [], totals: {} };
    if (ovResults[0].status === 'fulfilled' && ovResults[0].value.ok) {
      try { ovData = await ovResults[0].value.json(); } catch (_) {}
    }
    if ((!Array.isArray(ovData.domains) || !ovData.domains.length) && ovResults[1].status === 'fulfilled' && ovResults[1].value.ok) {
      try {
        var navData = await ovResults[1].value.json();
        var navCats = Array.isArray(navData && navData.categories) ? navData.categories : [];
        var pillar = navCats.find(function (c) { return c.slug === 'community' || c.target_portal === 'community'; });
        var subs = pillar && Array.isArray(pillar.subcategories) ? pillar.subcategories : [];
        ovData.domains = subs.map(function (s, idx) {
          return {
            slug: s.slug || ('cat-' + idx),
            title: s.name_en || s.slug || 'Category',
            summary: s.description_en || '',
            publicPath: s.landing_url || ('/community/' + encodeURIComponent(s.slug || ('cat-' + idx)) + '/')
          };
        });
      } catch (_) {}
    }
    state.overview = ovData;
    renderTelemetry(state.overview);
    renderDomains(state.overview);
    await loadItems(false);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
