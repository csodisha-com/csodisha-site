/* Common Sense Odisha — Homepage Studio live hydration (v242, strict CSP: DOM APIs only).
 * Hydrates Popular Searches, Latest Updates tabs, Opportunity Compass, Trending Topics,
 * Important Tools and Action Hub from /api/public/homepage-blocks. The static markup in
 * index.html stays in place as the graceful fallback if D1 is unreachable or empty.
 * Also exposes window.CSOHomeBlocks.createNode() so the Admin Studio preview renders the same cards. */
(function (window, document) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    briefcase: [['rect', { x: 2, y: 7, width: 20, height: 14, rx: 2, ry: 2 }], ['path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }]],
    graduation: [['path', { d: 'M22 10v6M2 10l10-5 10 5-10 5z' }], ['path', { d: 'M6 12v5c3 3 9 3 12 0v-5' }]],
    award: [['circle', { cx: 12, cy: 8, r: 7 }], ['polyline', { points: '8.21 13.89 7 23 12 20 17 23 15.79 13.88' }]],
    compass: [['circle', { cx: 12, cy: 12, r: 10 }], ['polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' }]],
    book: [['path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }], ['path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }]],
    star: [['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]],
    users: [['path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]],
    bell: [['path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }], ['path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }]]
  };
  var ICON_KEYS = Object.keys(ICONS);
  var HUB_BTN = { community: 'blue', library: 'green', alerts: 'amber' };
  var SECTIONS = [
    'popular_searches', 'latest_updates_tabs', 'opportunity_compass',
    'trending_topics', 'important_tools', 'action_hub'
  ];

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = text;
    return n;
  }

  function clean(v) { return String(v || '').replace(/[^a-z0-9_-]/gi, ''); }

  function svgIcon(key, size) {
    var def = ICONS[key];
    if (!def) return null;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    def.forEach(function (part) {
      var node = document.createElementNS(SVG_NS, part[0]);
      Object.keys(part[1]).forEach(function (k) { node.setAttribute(k, String(part[1][k])); });
      svg.appendChild(node);
    });
    return svg;
  }

  function safeHref(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    if (/^(javascript|data|vbscript)\s*:/i.test(u)) return '';
    return u;
  }

  function pick(item, field, lang) {
    if (lang === 'or' && item[field + '_or']) return item[field + '_or'];
    return item[field + '_en'] || '';
  }

  function arrow() { return make('span', 'arrow', '\u2192'); }

  function applyLink(node, item) {
    var href = safeHref(item.href);
    if (href) node.setAttribute('href', href);
    var meta = item.meta || {};
    if (meta.route) node.setAttribute('data-route', clean(meta.route));
    if (meta.h) node.setAttribute('data-h', clean(meta.h));
    if (/^https?:\/\//i.test(href) && href.indexOf(window.location.origin) !== 0) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    node.setAttribute('data-hb-id', item.id || '');
  }

  /** Build a single block node for a section (shared by homepage + Admin Studio preview). */
  function createNode(section, item, lang) {
    var accent = clean(item.accent_variant);
    var title = pick(item, 'title', lang);
    var sub = pick(item, 'subtitle', lang);
    var node;
    if (section === 'popular_searches') {
      node = make('button', 'search-chip', title);
      node.type = 'button';
      node.setAttribute('data-hb-id', item.id || '');
      return node;
    }
    if (section === 'latest_updates_tabs') {
      var canonicalCat = String(item.title_en || title || '').trim();
      var tabKey = canonicalCat.toLowerCase();
      node = make('button', '', title);
      node.type = 'button';
      node.setAttribute('role', 'tab');
      node.setAttribute('data-tab', tabKey);
      node.setAttribute('data-filter', tabKey);
      node.setAttribute('data-category', canonicalCat);
      node.setAttribute('aria-selected', 'false');
      node.setAttribute('aria-pressed', 'false');
      node.setAttribute('data-hb-id', item.id || '');
      return node;
    }
    if (section === 'opportunity_compass') {
      node = make('a', 'cso-compass-card' + (accent ? ' cso-compass-card--' + accent : ''));
      var ic = make('div', 'cso-compass-card__icon');
      ic.setAttribute('aria-hidden', 'true');
      var svg = svgIcon(item.icon, 20);
      if (svg) ic.appendChild(svg);
      var info = make('div', 'cso-compass-card__info');
      var h = make('h3', 'cso-compass-card__heading', title + ' ');
      h.appendChild(arrow());
      info.appendChild(h);
      info.appendChild(make('p', 'cso-compass-card__desc', sub));
      node.appendChild(ic);
      node.appendChild(info);
      applyLink(node, item);
      return node;
    }
    if (section === 'trending_topics') {
      node = make('a', 'cso-topic-card' + (accent ? ' cso-topic-card--' + accent : ''));
      var badge = make('div', 'cso-topic-card__badge');
      badge.setAttribute('aria-hidden', 'true');
      var tsvg = svgIcon(item.icon, 22);
      if (tsvg) badge.appendChild(tsvg);
      var txt = make('div', 'cso-topic-card__text');
      var th = make('h3', 'cso-topic-card__title', title + ' ');
      th.appendChild(arrow());
      txt.appendChild(th);
      txt.appendChild(make('p', 'cso-topic-card__desc', sub));
      node.appendChild(badge);
      node.appendChild(txt);
      applyLink(node, item);
      return node;
    }
    if (section === 'important_tools') {
      node = make('div', 'card tl tool-card');
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      var ico = make('span', 'ic' + (accent ? ' cso-tool-ic-' + accent : ''), item.icon || '');
      ico.setAttribute('aria-hidden', 'true');
      node.appendChild(ico);
      var body = make('span', '');
      body.appendChild(make('b', '', title));
      body.appendChild(make('small', '', sub));
      node.appendChild(body);
      node.setAttribute('data-hb-id', item.id || '');
      if (item.title_en) node.setAttribute('data-title-en', item.title_en);
      if (item.title_or) node.setAttribute('data-title-or', item.title_or);
      if (item.subtitle_en) node.setAttribute('data-sub-en', item.subtitle_en);
      if (item.subtitle_or) node.setAttribute('data-sub-or', item.subtitle_or);
      if (item.badge_en) node.setAttribute('data-badge', item.badge_en);
      return node;
    }
    if (section === 'action_hub') {
      var meta = item.meta || {};
      var variant = accent || 'community';
      node = make('div', 'cso-hub-card cso-hub-card--' + variant);
      var hic = make('div', 'cso-hub-card__icon');
      hic.setAttribute('aria-hidden', 'true');
      var hsvg = svgIcon(item.icon, 24);
      if (hsvg) hic.appendChild(hsvg);
      var content = make('div', 'cso-hub-card__content');
      content.appendChild(make('h3', 'cso-hub-card__title', title));
      content.appendChild(make('p', 'cso-hub-card__desc', sub));
      var btnVariant = clean(meta.btn) || HUB_BTN[variant] || 'blue';
      var cta = make('a', 'cso-hub-card__btn cso-hub-card__btn--' + btnVariant, (pick(item, 'cta_label', lang) || title) + ' \u2192');
      applyLink(cta, item);
      content.appendChild(cta);
      node.appendChild(hic);
      node.appendChild(content);
      return node;
    }
    return make('div', '', title);
  }

  function currentLang() {
    try {
      if (document.documentElement.getAttribute('lang') === 'or') return 'or';
      if (localStorage.getItem('cso_lang_pref') === 'or') return 'or';
      if (localStorage.getItem('cso_lang') === 'or') return 'or';
    } catch (_) {}
    return 'en';
  }

  var cachedSections = null;

  function ensureTrendingAboveFeeds() {
    var allTrending = document.querySelectorAll('#cso-trending-topics, .cso-trending-topics-sec');
    if (!allTrending.length) return;
    var primary = allTrending[0];
    for (var i = 1; i < allTrending.length; i += 1) {
      allTrending[i].remove();
    }
    var feeds = document.getElementById('cso-home-feeds');
    if (feeds && primary.parentNode && feeds.parentNode === primary.parentNode) {
      if (primary.compareDocumentPosition(feeds) & Node.DOCUMENT_POSITION_PRECEDING) {
        feeds.parentNode.insertBefore(primary, feeds);
      }
    }
  }

  function track(id) {
    if (!id) return;
    try {
      fetch('/api/public/homepage-blocks/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id }),
        keepalive: true,
        credentials: 'same-origin'
      }).catch(function () {});
    } catch (_) {}
  }

  function replaceKids(container, nodes, keepSelector) {
    Array.prototype.slice.call(container.children).forEach(function (c) {
      if (keepSelector && c.matches(keepSelector)) return;
      container.removeChild(c);
    });
    nodes.forEach(function (n) { container.appendChild(n); });
  }

  function hydrate(sections) {
    cachedSections = sections;
    var lang = currentLang();
    var home = window.csoHome || {};
    var any = false;
    ensureTrendingAboveFeeds();

    function build(key) { return (sections[key] || []).map(function (it) { return createNode(key, it, lang); }); }
    function has(key) { return Array.isArray(sections[key]); }

    var chips = document.querySelector('.chips');
    if (chips && has('popular_searches')) {
      var chipNodes = build('popular_searches').slice(0, 7);
      replaceKids(chips, chipNodes, '.chips-label');
      chipNodes.forEach(function (n) {
        if (home.bindChip) {
          home.bindChip(n);
        } else {
          n.addEventListener('click', function () {
            var q = (n.textContent || '').trim();
            var inp = document.getElementById('cso-ask-input');
            if (inp) {
              inp.value = q;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (window.CSOAskSearch && typeof window.CSOAskSearch.run === 'function') {
              window.CSOAskSearch.run(q);
            }
          });
        }
      });
      any = true;
    }

    var tabs = document.querySelector('.lu .tabs');
    if (tabs && has('latest_updates_tabs')) {
      var tabNodes = build('latest_updates_tabs');
      var hasAll = tabNodes.some(function (n) { return n.getAttribute('data-tab') === 'all'; });
      if (!hasAll) {
        tabNodes.unshift(createNode('latest_updates_tabs', { id: 'hb_latest_updates_tabs_01', title_en: 'All', title_or: 'ସମସ୍ତ' }, lang));
      }
      var hasExams = tabNodes.some(function (n) { return n.getAttribute('data-tab') === 'exams'; });
      if (!hasExams) {
        var jobsIdx = tabNodes.findIndex(function (n) { return n.getAttribute('data-tab') === 'jobs'; });
        var examsBtn = createNode('latest_updates_tabs', { id: 'hb_latest_updates_tabs_exams', title_en: 'Exams', title_or: 'ପରୀକ୍ଷା' }, lang);
        tabNodes.splice(jobsIdx >= 0 ? jobsIdx + 1 : 1, 0, examsBtn);
      }
      if (tabNodes.length) {
        tabNodes[0].className = 'a';
        tabNodes[0].setAttribute('aria-selected', 'true');
        tabNodes[0].setAttribute('aria-pressed', 'true');
      }
      tabs.setAttribute('role', 'tablist');
      replaceKids(tabs, tabNodes);
      if (home.bindTabs) home.bindTabs();
      if (!document.getElementById('cso-lu-list') && home.setCategory) {
        home.setCategory(tabNodes[0] ? (tabNodes[0].getAttribute('data-category') || 'All') : 'All');
      }
      any = true;
    }

    // v334: CSO Opportunity Compass removed from homepage; never hydrate or re-inject opportunity_compass blocks
    var retiredCompass = document.getElementById('cso-opportunity-compass');
    if (retiredCompass) retiredCompass.remove();

    var topics = document.querySelector('#cso-trending-topics .trending-grid') || document.querySelector('.trending-grid');
    if (topics && has('trending_topics')) { replaceKids(topics, build('trending_topics')); any = true; }
    ensureTrendingAboveFeeds();

    var tools = document.getElementById('cso-tools-grid');
    if (tools && has('important_tools')) {
      var toolNodes = build('important_tools');
      toolNodes.forEach(function (n, i) {
        var item = sections.important_tools[i];
        var href = safeHref(item.href);
        if (href) {
          n.tabIndex = 0;
          n.setAttribute('role', 'link');
          n.addEventListener('click', function () { track(item.id); window.location.assign(href); });
          n.addEventListener('keydown', function (e) { if (e.key === 'Enter') { track(item.id); window.location.assign(href); } });
        } else if (home.bindTool) {
          home.bindTool(n, item.title_en);
        }
      });
      replaceKids(tools, toolNodes);
      any = true;
    }

    // v352: Duplicate lower-homepage Action Hub promo cards removed; never hydrate or re-inject onto homepage
    var retiredActionHub = document.querySelector('.cso-action-hub-section');
    if (retiredActionHub) retiredActionHub.remove();

    if (any && lang === 'or' && home.localize) { try { home.localize(document.querySelector('main')); } catch (_) {} }
  }

  function wireClickTracking() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-hb-id]') : null;
      if (!t || t.classList.contains('tool-card') && t.getAttribute('role') === 'link') return;
      track(t.getAttribute('data-hb-id'));
    }, true);
  }

  function wireLangRefresh() {
    document.addEventListener('click', function (ev) {
      var pill = ev.target && ev.target.closest ? ev.target.closest('[data-cso-lang], [data-lang]') : null;
      if (pill && cachedSections) {
        setTimeout(function () { hydrate(cachedSections); }, 65);
      }
    });
    window.addEventListener('storage', function (e) {
      if ((e.key === 'cso_lang_pref' || e.key === 'cso_lang') && cachedSections) {
        hydrate(cachedSections);
      }
    });
  }

  function init() {
    if (!document.getElementById('cso-tools-grid')) return;
    var retiredActionHub = document.querySelector('.cso-action-hub-section');
    if (retiredActionHub) retiredActionHub.remove();
    ensureTrendingAboveFeeds();
    wireClickTracking();
    wireLangRefresh();
    var forceRefresh = /[?&](refresh|_cb)=/.test(window.location.search || '');
    var url = '/api/public/homepage-blocks' + (forceRefresh ? '?refresh=1' : '');
    fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok && d.source === 'd1' && d.sections) hydrate(d.sections);
      })
      .catch(function () { /* keep static fallback markup */ });
  }

  window.CSOHomeBlocks = { createNode: createNode, ICON_KEYS: ICON_KEYS, SECTIONS: SECTIONS };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
