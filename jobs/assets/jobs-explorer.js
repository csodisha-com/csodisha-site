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
    var heroSubEl = document.getElementById('jobs-hero-sub');
    var heroSubEn = heroSubEl ? heroSubEl.textContent : '';
    var heroSubOr = 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି (OPSC, OSSC, OSSSC, OPRB, OSEPA), କେନ୍ଦ୍ରୀୟ ଓ PSU ନିଯୁକ୍ତି, ବ୍ୟାଙ୍କିଂ ଏବଂ କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶିକା — ସମସ୍ତ ୮ଟି ବିଭାଗର ପ୍ରାମାଣିକ ଯୋଗ୍ୟତା, ବେତନ ଢାଞ୍ଚା, ପରୀକ୍ଷା ପ୍ରକ୍ରିୟା ଏବଂ ସରକାରୀ ପୋର୍ଟାଲ୍ ସୂଚନା।';
    langToggleBtn.addEventListener('click', function () {
      state.uiLang = state.uiLang === 'EN' ? 'OR' : 'EN';
      langToggleBtn.textContent = state.uiLang === 'OR' ? 'ଓଡ଼ିଆ (Active) / EN' : 'EN / ଓଡ଼ିଆ';
      if (heroSubEl) heroSubEl.textContent = state.uiLang === 'OR' ? heroSubOr : heroSubEn;
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
        { label: 'Navigation Groups', val: totals.totalDomains || 0 },
        { label: 'Main Sections', val: totals.totalSections || 0 },
        { label: 'Subcategories', val: totals.totalSubcategories || 0 },
        { label: 'Detailed Entries', val: Number(totals.totalPublished || 0).toLocaleString('en-IN') }
      ].forEach(function (k) {
        kpisEl.appendChild(el('div', { class: 'cso-jobs-kpi' }, [
          el('div', { class: 'cso-jobs-kpi-label', text: k.label }),
          el('div', { class: 'cso-jobs-kpi-val', text: String(k.val) })
        ]));
      });
    }

    var icons = {
      'jobs-recruitment': '💼',
      'career-explorer': '🧭',
      'eligibility-qualification': '📋',
      'courses-exams-certifications': '📝',
      'scholarships-financial-support': '🎓',
      'international-overseas': '🌍',
      'career-development-employability': '🚀',
      'institutions-official-portals': '🏛'
    };

    if (navEl) {
      clear(navEl);
      var ovChildren = [
        el('span', { class: 'cso-jobs-nav-num', text: '◆' }),
        el('span', { class: 'cso-jobs-rail-label', text: 'Overview' })
      ];
      if (domains.length) {
        ovChildren.push(el('span', { class: 'cso-jobs-nav-count', text: String(domains.length) }));
      }
      navEl.appendChild(el('a', { class: 'cso-jobs-nav-link is-active', href: '/jobs/' }, ovChildren));
      domains.forEach(function (d) {
        var icon = icons[d.slug] || '•';
        navEl.appendChild(el('a', { class: 'cso-jobs-nav-link', href: d.publicPath }, [
          el('span', { class: 'cso-jobs-nav-num', text: icon }),
          el('span', { class: 'cso-jobs-rail-label', text: d.title }),
          el('span', { class: 'cso-jobs-nav-count', text: String(d.folder_count || 0) })
        ]));
      });
    }

    var catPanel = document.getElementById('jobs-categories-panel');
    if (catPanel) catPanel.hidden = !domains.length;

    if (domainsEl) {
      clear(domainsEl);
      if (domains.length) {
        domains.forEach(function (d) {
          var icon = icons[d.slug] || '•';
          domainsEl.appendChild(el('a', { class: 'cso-jobs-domain-card', href: d.publicPath }, [
            el('div', { class: 'cso-jobs-domain-top' }, [
              el('span', { text: icon + ' Category' }),
              el('span', { text: (d.folder_count || 0) + ' categories · ' + (d.item_count || 0) + ' entries' })
            ]),
            el('div', { class: 'cso-jobs-domain-title', text: d.title }),
            el('div', { class: 'cso-jobs-domain-desc', text: d.summary })
          ]));
        });
      }
    }
  }

  function renderItems(items) {
    state.lastItems = items || [];
    var filtersPanel = document.getElementById('jobs-filters-panel');
    var hasFilter = Boolean(state.q || state.domain || state.state_location || state.item_type || state.qualification || state.active_only);
    if (filtersPanel) filtersPanel.hidden = !state.lastItems.length && !hasFilter;
    if (!itemsEl) return;
    clear(itemsEl);
    if (!state.lastItems.length) {
      itemsEl.appendChild(el('div', { class: 'cso-jobs-item-card' }, [
        el('p', { class: 'cso-jobs-domain-desc', text: hasFilter ? 'No jobs match your current filters.' : 'No items published yet — add categories or content in Admin Studio.' })
      ]));
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
    var data = { domains: [], totals: {} };
    try {
      var results = await Promise.allSettled([
        fetch('/api/public/jobs-directory/overview'),
        fetch('/api/nav/config', { cache: 'no-store' })
      ]);
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        var ov = await results[0].value.json();
        if (ov && ov.ok) data = ov;
      }
      if ((!Array.isArray(data.domains) || !data.domains.length) && results[1].status === 'fulfilled' && results[1].value.ok) {
        var navData = await results[1].value.json();
        var navCats = Array.isArray(navData && navData.categories) ? navData.categories : [];
        var pillar = navCats.find(function (c) { return c.slug === 'jobs-careers' || c.target_portal === 'jobs-careers'; });
        var subs = pillar && Array.isArray(pillar.subcategories) ? pillar.subcategories : [];
        data.domains = subs.map(function (s, idx) {
          return {
            slug: s.slug || ('cat-' + idx),
            title: s.name_en || s.slug || 'Category',
            summary: s.description_en || '',
            folder_count: 0,
            item_count: 0,
            publicPath: s.landing_url || ('/jobs/' + encodeURIComponent(s.slug || ('cat-' + idx)) + '/')
          };
        });
      }
    } catch (e) { /* non-fatal */ }
    renderOverview(data);
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
