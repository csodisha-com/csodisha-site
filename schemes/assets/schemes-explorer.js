(function () {
  'use strict';

  var state = {
    lang: 'en',
    q: '',
    sponsor: '',
    beneficiary: '',
    mode: '',
    domain: '',
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
    var sb = overview.sponsorBreakdown || {};
    var totalPublished = Math.max(1, Number(totals.totalPublished || 1));
    [
      { label: 'Schemes & Welfare Directories', val: totals.totalFolders || 0, max: Math.max(1, totals.totalFolders || 1), cur: totals.totalFolders || 0 },
      { label: 'Published Schemes & Guides', val: totals.totalPublished || 0, max: totalPublished, cur: totals.totalPublished || 0 },
      { label: 'Odisha State Schemes', val: sb.odishaState || 0, max: totalPublished, cur: sb.odishaState || 0 },
      { label: 'Verified Official Portals', val: totals.totalVerified || 0, max: totalPublished, cur: totals.totalVerified || 0 }
    ].forEach(function (k) {
      kpis.appendChild(el('div', { class: 'cso-schemes-kpi' }, [
        el('div', { class: 'cso-schemes-kpi-label', text: k.label }),
        el('div', { class: 'cso-schemes-kpi-val', text: String(k.val) }),
        el('progress', { class: 'cso-schemes-progress', max: String(k.max), value: String(k.cur) })
      ]));
    });

    var tele = document.getElementById('schemes-telemetry');
    if (!tele) return;
    clear(tele);
    var sponsorCard = el('div', { class: 'cso-schemes-telemetry-card' }, [el('h3', { text: 'Sponsor Level Breakdown' })]);
    var sponsorCounts = {
      'Odisha State': Number(sb.odishaState || 0),
      'Central Govt': Number(sb.centralGovt || 0),
      'Joint State-Central': Number(sb.joint || 0),
      'CSR / Global': Number(sb.csrGlobal || 0)
    };
    var maxSponsor = Math.max(1, Object.values(sponsorCounts).reduce(function (a, b) { return Math.max(a, Number(b || 0)); }, 0));
    Object.keys(sponsorCounts).forEach(function (label) {
      var cnt = Number(sponsorCounts[label] || 0);
      sponsorCard.appendChild(el('div', { class: 'cso-schemes-bar-row' }, [
        el('div', { class: 'cso-schemes-bar-meta' }, [el('span', { text: label }), el('span', { text: String(cnt) })]),
        el('progress', { class: 'cso-schemes-progress', max: String(maxSponsor), value: String(cnt) })
      ]));
    });

    var domainCard = el('div', { class: 'cso-schemes-telemetry-card' }, [el('h3', { text: '8-Domain Coverage' })]);
    var domains = overview.domains || [];
    var maxDom = Math.max(1, domains.reduce(function (a, d) { return Math.max(a, Number(d.folderCount || 0)); }, 0));
    domains.forEach(function (d) {
      domainCard.appendChild(el('div', { class: 'cso-schemes-bar-row' }, [
        el('div', { class: 'cso-schemes-bar-meta' }, [
          el('span', { text: '#' + d.num + ' ' + d.title }),
          el('span', { text: (d.folderCount || 0) + ' dirs · ' + (d.itemCount || 0) + ' schemes' })
        ]),
        el('progress', { class: 'cso-schemes-progress', max: String(maxDom), value: String(d.folderCount || 0) })
      ]));
    });

    tele.appendChild(sponsorCard);
    tele.appendChild(domainCard);
  }

  function renderDomains(overview) {
    var rail = document.getElementById('schemes-rail-nav');
    var grid = document.getElementById('schemes-domain-grid');
    if (!overview || !Array.isArray(overview.domains)) return;
    if (rail) clear(rail);
    if (grid) clear(grid);

    overview.domains.forEach(function (d) {
      var title = state.lang === 'or' && d.titleOr ? d.titleOr : d.title;
      if (rail) {
        rail.appendChild(el('a', { class: 'cso-schemes-nav-link', href: d.url }, [
          el('span', { class: 'cso-schemes-nav-num', text: d.num }),
          el('span', { class: 'cso-schemes-rail-label', text: title }),
          el('span', { class: 'cso-schemes-nav-count', text: String(d.itemCount || 0) })
        ]));
      }
      if (grid) {
        grid.appendChild(el('a', { class: 'cso-schemes-domain-card', href: d.url }, [
          el('div', { class: 'cso-schemes-domain-top' }, [
            el('span', { text: 'MODULE #' + d.num }),
            el('span', { text: (d.folderCount || 0) + ' dirs · ' + (d.itemCount || 0) + ' live' })
          ]),
          el('div', { class: 'cso-schemes-domain-title', text: title }),
          el('div', { class: 'cso-schemes-domain-desc', text: d.description || '' })
        ]));
      }
    });
  }

  function renderItems(items) {
    var host = document.getElementById('schemes-items-grid');
    var countEl = document.getElementById('schemes-results-count');
    if (!host) return;
    clear(host);
    if (countEl) countEl.textContent = items.length + ' verified scheme' + (items.length === 1 ? '' : 's') + ' shown';
    if (!items.length) {
      host.appendChild(el('div', { class: 'cso-schemes-item-card' }, [
        el('p', { text: 'No published schemes match your current filters. Try clearing filters or browsing one of the 8 directory domains above.' })
      ]));
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
        el('a', { class: 'cso-schemes-btn cso-schemes-btn-primary', href: '/schemes/item/' + encodeURIComponent(it.slug || it.id) + '/' }, ['View Eligibility & Details'])
      ];
      if (it.official_apply_url) {
        actions.push(el('a', { class: 'cso-schemes-btn', href: it.official_apply_url, target: '_blank', rel: 'noopener noreferrer' }, ['Official Apply Portal ↗']));
      }
      host.appendChild(el('article', { class: 'cso-schemes-item-card' }, [
        el('div', { class: 'cso-schemes-item-meta' }, metaChildren),
        el('h3', { class: 'cso-schemes-item-title', text: title }),
        el('div', { class: 'cso-schemes-item-meta', text: (it.beneficiary_group ? 'Beneficiaries: ' + it.beneficiary_group + ' · ' : '') + (it.summary || '') }),
        el('div', { class: 'cso-schemes-item-actions' }, actions)
      ]));
    });
  }

  async function loadItems() {
    var qs = new URLSearchParams();
    if (state.q) qs.set('q', state.q);
    if (state.sponsor) qs.set('sponsor_level', state.sponsor);
    if (state.beneficiary) qs.set('beneficiary_group', state.beneficiary);
    if (state.mode) qs.set('application_mode', state.mode);
    if (state.domain) qs.set('domain', state.domain);
    qs.set('limit', '60');
    var res = await fetch('/api/public/schemes-directory/items?' + qs.toString());
    if (!res.ok) return;
    var data = await res.json();
    state.items = Array.isArray(data.items) ? data.items : [];
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

    document.querySelectorAll('.cso-schemes-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.cso-schemes-pill').forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        state.q = pill.getAttribute('data-q') || '';
        state.domain = pill.getAttribute('data-domain') || '';
        var searchEl = document.getElementById('schemes-search');
        if (searchEl) searchEl.value = state.q;
        loadItems();
      });
    });

    var searchEl = document.getElementById('schemes-search');
    var sponsorEl = document.getElementById('schemes-sponsor');
    var benEl = document.getElementById('schemes-beneficiary');
    var modeEl = document.getElementById('schemes-mode');
    var resetEl = document.getElementById('schemes-reset');

    var timer = null;
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = searchEl.value.trim();
          loadItems();
        }, 220);
      });
    }
    if (sponsorEl) sponsorEl.addEventListener('change', function () { state.sponsor = sponsorEl.value; loadItems(); });
    if (benEl) benEl.addEventListener('change', function () { state.beneficiary = benEl.value; loadItems(); });
    if (modeEl) modeEl.addEventListener('change', function () { state.mode = modeEl.value; loadItems(); });
    if (resetEl) {
      resetEl.addEventListener('click', function () {
        state.q = ''; state.sponsor = ''; state.beneficiary = ''; state.mode = ''; state.domain = '';
        if (searchEl) searchEl.value = '';
        if (sponsorEl) sponsorEl.value = '';
        if (benEl) benEl.value = '';
        if (modeEl) modeEl.value = '';
        document.querySelectorAll('.cso-schemes-pill').forEach(function (p, i) { p.classList.toggle('is-active', i === 0); });
        loadItems();
      });
    }

    var ovRes = await fetch('/api/public/schemes-directory/overview');
    if (ovRes.ok) {
      state.overview = await ovRes.json();
      renderTelemetry(state.overview);
      renderDomains(state.overview);
    }
    await loadItems();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
