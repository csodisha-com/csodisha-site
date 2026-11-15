(function () {
  'use strict';

  var shell = document.getElementById('jobs-shell');
  var railToggle = document.getElementById('jobs-rail-toggle');
  var mobileOpenBtn = document.getElementById('jobs-mobile-open');
  var backdrop = document.getElementById('jobs-backdrop');
  var kpisEl = document.getElementById('jobs-kpis');
  var telemetryEl = document.getElementById('jobs-telemetry-bars');
  var domainsEl = document.getElementById('jobs-domains-grid');
  var itemsEl = document.getElementById('jobs-items-grid');
  var navEl = document.getElementById('jobs-rail-nav');

  var searchInp = document.getElementById('jobs-filter-q');
  var stateSel = document.getElementById('jobs-filter-state');
  var typeSel = document.getElementById('jobs-filter-type');
  var qualSel = document.getElementById('jobs-filter-qual');
  var activeCb = document.getElementById('jobs-filter-active');
  var langToggleBtn = document.getElementById('jobs-lang-toggle');

  var state = {
    q: '',
    domain: '',
    state_location: '',
    item_type: '',
    qualification: '',
    active_only: false,
    uiLang: 'EN',
    lastItems: []
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

  if (railToggle && shell) {
    railToggle.addEventListener('click', function () {
      var collapsed = shell.classList.toggle('is-collapsed');
      railToggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }
  if (mobileOpenBtn && shell) {
    mobileOpenBtn.addEventListener('click', function () {
      shell.classList.add('is-mobile-open');
    });
  }
  if (backdrop && shell) {
    backdrop.addEventListener('click', function () {
      shell.classList.remove('is-mobile-open');
    });
  }

  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', function () {
      state.uiLang = state.uiLang === 'EN' ? 'OR' : 'EN';
      langToggleBtn.textContent = state.uiLang === 'OR' ? 'ଓଡ଼ିଆ (Active) / EN' : 'EN / ଓଡ଼ିଆ';
      renderItems(state.lastItems);
    });
  }

  document.querySelectorAll('.cso-jobs-pill').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var qVal = btn.getAttribute('data-q') || '';
      var typeVal = btn.getAttribute('data-type') || '';
      state.q = qVal;
      state.item_type = typeVal;
      if (searchInp) searchInp.value = qVal;
      if (typeSel) typeSel.value = typeVal;
      document.querySelectorAll('.cso-jobs-pill').forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      loadItems();
    });
  });

  document.querySelectorAll('.cso-jobs-qfilter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var qVal = btn.getAttribute('data-q') || '';
      state.q = qVal;
      if (searchInp) searchInp.value = qVal;
      document.querySelectorAll('.cso-jobs-qfilter').forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      loadItems();
    });
  });

  function renderOverview(data) {
    var totals = data.totals || {};
    var domains = data.domains || [];
    var tb = data.typeBreakdown || {};

    if (kpisEl) {
      clear(kpisEl);
      [
        { label: 'Navigation Groups', val: totals.totalDomains || 8 },
        { label: 'Main Sections', val: totals.totalSections || 0 },
        { label: 'Subcategories', val: totals.totalSubcategories || 0 },
        { label: 'Detailed Entries', val: Number(totals.totalPublished || 0).toLocaleString('en-IN') + '+' }
      ].forEach(function (k) {
        kpisEl.appendChild(el('div', { class: 'cso-jobs-kpi' }, [
          el('div', { class: 'cso-jobs-kpi-label', text: k.label }),
          el('div', { class: 'cso-jobs-kpi-val', text: String(k.val) })
        ]));
      });
    }

    if (navEl) {
      clear(navEl);
      navEl.appendChild(el('a', { class: 'cso-jobs-nav-link is-active', href: '/jobs/' }, [
        el('span', { class: 'cso-jobs-nav-num', text: 'All' }),
        el('span', { class: 'cso-jobs-rail-label', text: 'Overview' }),
        el('span', { class: 'cso-jobs-nav-count', text: String(domains.length) })
      ]));
      domains.forEach(function (d) {
        navEl.appendChild(el('a', { class: 'cso-jobs-nav-link', href: d.publicPath }, [
          el('span', { class: 'cso-jobs-nav-num', text: d.num }),
          el('span', { class: 'cso-jobs-rail-label', text: d.title }),
          el('span', { class: 'cso-jobs-nav-count', text: String(d.folder_count) })
        ]));
      });
    }

    if (domainsEl) {
      clear(domainsEl);
      domains.forEach(function (d) {
        domainsEl.appendChild(el('a', { class: 'cso-jobs-domain-card', href: d.publicPath }, [
          el('div', { class: 'cso-jobs-domain-top' }, [
            el('span', { text: 'MODULE #' + d.num }),
            el('span', { text: d.folder_count + ' categories · ' + d.item_count + ' entries' })
          ]),
          el('div', { class: 'cso-jobs-domain-title', text: d.title }),
          el('div', { class: 'cso-jobs-domain-desc', text: d.summary })
        ]));
      });
    }
  }

  function renderItems(items) {
    state.lastItems = items || [];
    if (!itemsEl) return;
    clear(itemsEl);
    if (!state.lastItems.length) {
      itemsEl.appendChild(el('p', { class: 'cso-jobs-domain-desc', text: 'No published opportunities or guides matched your current filters.' }));
      return;
    }
    state.lastItems.forEach(function (it) {
      var titleText = (state.uiLang === 'OR' && it.title_or) ? it.title_or : it.title;
      var actions = [
        el('a', { class: 'cso-jobs-btn cso-jobs-btn-primary', href: '/jobs/item/' + encodeURIComponent(it.slug) + '/', text: 'View Details' })
      ];
      if (it.official_apply_url) {
        actions.push(el('a', { class: 'cso-jobs-btn', href: it.official_apply_url, target: '_blank', rel: 'noopener noreferrer', text: 'Apply Online ↗' }));
      }
      itemsEl.appendChild(el('article', { class: 'cso-jobs-item-card' }, [
        el('div', { class: 'cso-jobs-item-meta' }, [
          el('span', { class: 'cso-jobs-tag', text: it.item_type }),
          it.qualification_tag ? el('span', { text: it.qualification_tag }) : null,
          it.deadline_date ? el('span', { text: 'Deadline: ' + it.deadline_date }) : null,
          it.verified_at ? el('span', { class: 'cso-jobs-tag', text: 'Verified' }) : null
        ]),
        el('h3', { class: 'cso-jobs-item-title', text: titleText }),
        el('div', { class: 'cso-jobs-domain-desc', text: (it.recruiting_body ? it.recruiting_body + ' — ' : '') + (it.summary || '') }),
        el('div', { class: 'cso-jobs-item-actions' }, actions)
      ]));
    });
  }

  async function loadOverview() {
    try {
      var res = await fetch('/api/public/jobs-directory/overview');
      var data = await res.json();
      if (res.ok && data.ok) renderOverview(data);
    } catch (e) { /* non-fatal */ }
  }

  async function loadItems() {
    var qs = new URLSearchParams();
    if (state.q) qs.set('q', state.q);
    if (state.domain) qs.set('domain', state.domain);
    if (state.state_location) qs.set('state_location', state.state_location);
    if (state.item_type) qs.set('item_type', state.item_type);
    if (state.qualification) qs.set('qualification', state.qualification);
    if (state.active_only) qs.set('active_only', '1');
    try {
      var res = await fetch('/api/public/jobs-directory/items?' + qs.toString());
      var data = await res.json();
      if (res.ok && data.ok) renderItems(data.items || []);
    } catch (e) { /* non-fatal */ }
  }

  if (searchInp) searchInp.addEventListener('input', function () { state.q = searchInp.value.trim(); loadItems(); });
  if (stateSel) stateSel.addEventListener('change', function () { state.state_location = stateSel.value; loadItems(); });
  if (typeSel) typeSel.addEventListener('change', function () { state.item_type = typeSel.value; loadItems(); });
  if (qualSel) qualSel.addEventListener('change', function () { state.qualification = qualSel.value; loadItems(); });
  if (activeCb) activeCb.addEventListener('change', function () { state.active_only = activeCb.checked; loadItems(); });

  loadOverview();
  loadItems();
})();
