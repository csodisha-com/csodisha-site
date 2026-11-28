/* CSO Shared Header, Navigation & Cross-Portal Saved Items Drawer (Strict CSP-Compliant) */
// Auth navigation links: href="/login.html" and href="/signup.html"
(() => {
  'use strict';

  let root = '../';
  const scriptEl = document.currentScript;
  if (scriptEl) {
    const src = scriptEl.getAttribute('src') || '';
    const idx = src.indexOf('assets/');
    if (idx !== -1) {
      root = src.slice(0, idx);
    }
  }
  if (!root) root = './';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  const NAV = [
    { key: 'jobs', labelEn: 'Jobs', labelOr: 'ଚାକିରି', fullEn: 'Jobs', fullOr: 'ଚାକିରି', icon: '💼', url: '/jobs/' },
    { key: 'careers', labelEn: 'Careers', labelOr: 'କ୍ୟାରିୟର୍', fullEn: 'Careers', fullOr: 'କ୍ୟାରିୟର୍', icon: '🧭', url: '/careers/' },
    { key: 'schemes-benefits', labelEn: 'Schemes & Benefits', labelOr: 'ଯୋଜନା ଓ ସୁବିଧା', fullEn: 'Schemes & Benefits', fullOr: 'ଯୋଜନା ଓ ସୁବିଧା', icon: '🏛', url: '/schemes/' },
    { key: 'study-library', labelEn: 'Study Library', labelOr: 'ଅଧ୍ୟୟନ ପାଠାଗାର', fullEn: 'Study Library', fullOr: 'ଅଧ୍ୟୟନ ପାଠାଗାର', icon: '📖', url: '/study-library/' },
    { key: 'community', labelEn: 'Community', labelOr: 'ସମୁଦାୟ', fullEn: 'Community', fullOr: 'ସମୁଦାୟ', icon: '👥', url: '/community/' },
    { key: 'about', labelEn: 'About', labelOr: 'ଆମ ବିଷୟରେ', fullEn: 'About', fullOr: 'ଆମ ବିଷୟରେ', icon: 'ⓘ', url: '/about/' }
  ];

  // Clean-slate v231 + v269 separated Jobs & Careers: Zero hardcoded mega-menu piles. Submenus sync live from /api/nav/config (D1 /admin/).
  const MENUS = {
    'jobs': [],
    'careers': [],
    'jobs-careers': [],
    'schemes-benefits': [],
    'study-library': [],
    'community': [],
    'about': []
  };

  const THEMES = ['light', 'dark', 'system', 'reading', 'sepia'];
  const THEME_ICONS = { light: '☀️', dark: '🌙', system: '💻', reading: '📖', sepia: '☕' };
  const PORTAL_THEMES = [
    { key: 'system', label: 'System', fullLabel: 'System (Auto Light/Dark)' },
    { key: 'dark', label: 'Dark', fullLabel: 'Dark Night' },
    { key: 'reading', label: 'Reading', fullLabel: 'Reading Mode' },
    { key: 'utkal-bharat', label: 'Odisha & Bharat', fullLabel: 'Odisha & Bharat' }
  ];
  const PORTAL_THEME_KEYS = PORTAL_THEMES.map(t => t.key);
  const LN = { en: 'English', or: 'ଓଡ଼ିଆ' };

  function resolvePaletteToThemeKey(paletteName) {
    const raw = String(paletteName || '').toLowerCase();
    if (PORTAL_THEME_KEYS.includes(raw)) return raw;
    if (raw.includes('dark') || raw.includes('night') || raw.includes('obsidian')) return 'dark';
    if (raw.includes('reading') || raw.includes('kalinga') || raw.includes('paper')) return 'reading';
    if (raw.includes('utkal') || raw.includes('bharat') || raw.includes('odisha') || raw.includes('heritage') || raw.includes('sandstone')) return 'utkal-bharat';
    return 'system';
  }

  function getStoredPortalTheme() {
    try {
      const k = localStorage.getItem('cso_portal_theme');
      return PORTAL_THEME_KEYS.includes(k) ? k : '';
    } catch (e) {
      return '';
    }
  }

  function resolveEffectiveMode(themeKey) {
    if (themeKey === 'dark') return 'dark';
    if (themeKey === 'reading' || themeKey === 'utkal-bharat') return 'light';
    try {
      return (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function syncHeaderThemeBtn(activeKey) {
    const bt = document.getElementById('cso-ctl-theme');
    const cur = PORTAL_THEMES.find(t => t.key === activeKey);
    if (bt && cur) {
      bt.textContent = '';
      const sw = el('span', `cso-theme-swatch is-${cur.key}`);
      bt.append(sw, document.createTextNode(` ${cur.label} ⌄`));
      bt.title = `Theme: ${cur.fullLabel}`;
    }
  }

  let activePortalTheme = getStoredPortalTheme() || 'system';

  function mapToDataThemeAttr(themeKey) {
    if (themeKey === 'utkal-bharat' || themeKey === 'odisha') return 'odisha';
    if (themeKey === 'dark' || themeKey === 'reading') return themeKey;
    return 'system';
  }

  function setPortalTheme(themeKey, persist = true) {
    const raw = themeKey === 'odisha' ? 'utkal-bharat' : themeKey;
    const key = PORTAL_THEME_KEYS.includes(raw) ? raw : 'system';
    activePortalTheme = key;
    document.documentElement.setAttribute('data-cso-theme', key);
    document.documentElement.setAttribute('data-theme', mapToDataThemeAttr(key));
    document.documentElement.setAttribute('data-cso-resolved-mode', resolveEffectiveMode(key));
    if (persist) {
      try { localStorage.setItem('cso_portal_theme', key); } catch (e) {}
    }
    syncHeaderThemeBtn(key);
    return key;
  }

  window.CSOTheme = {
    THEMES: PORTAL_THEMES,
    getTheme: () => activePortalTheme,
    getResolvedMode: () => resolveEffectiveMode(activePortalTheme),
    setTheme: (key, persist = true) => setPortalTheme(key, persist),
    apply: () => setPortalTheme(activePortalTheme, false),
    resolvePaletteToThemeKey
  };

  setPortalTheme(activePortalTheme, false);

  try {
    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onMqChange = () => {
        if (activePortalTheme === 'system') {
          document.documentElement.setAttribute('data-cso-resolved-mode', resolveEffectiveMode('system'));
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMqChange);
    }
  } catch (e) {}

  window.addEventListener('storage', e => {
    if (e.key === 'cso_portal_theme' && e.newValue && PORTAL_THEME_KEYS.includes(e.newValue)) {
      setPortalTheme(e.newValue, false);
    }
  });

  if (!getStoredPortalTheme() && typeof fetch === 'function') {
    fetch('/api/config/public', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => {
        if (!getStoredPortalTheme() && cfg && cfg.identity && cfg.identity.primary_palette_name) {
          setPortalTheme(resolvePaletteToThemeKey(cfg.identity.primary_palette_name), false);
        }
      })
      .catch(() => {});
  }
  const ZOOM_CLASSES = [
    'cso-zoom-85', 'cso-zoom-90', 'cso-zoom-95', 'cso-zoom-100',
    'cso-zoom-105', 'cso-zoom-110', 'cso-zoom-115', 'cso-zoom-120',
    'cso-zoom-125', 'cso-zoom-130'
  ];

  let S = { lang: 'en', theme: 'system', zoom: 1, hc: 0, ul: 0, rm: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem('cso') || '{}');
    if (saved && typeof saved === 'object') S = Object.assign(S, saved);
  } catch (e) {}

  function saveSettings() {
    try {
      localStorage.setItem('cso', JSON.stringify(S));
      localStorage.setItem('cso_lang_pref', S.lang || 'en');
    } catch (e) {}
  }

  function ensureGlobalEnhancements() {
    if (window.CSOGlobal) return;
    if (!document.getElementById('cso-global-enhancements-script')) {
      const s = document.createElement('script');
      s.id = 'cso-global-enhancements-script';
      s.src = '/assets/js/cso-global-enhancements.js';
      s.defer = true;
      document.head.appendChild(s);
    }
  }

  function applySettings() {
    const d = document.documentElement;
    d.setAttribute('data-theme', mapToDataThemeAttr(activePortalTheme));
    d.setAttribute('data-cso-theme', activePortalTheme);
    d.setAttribute('data-cso-resolved-mode', resolveEffectiveMode(activePortalTheme));
    d.lang = S.lang || 'en';
    d.dataset.lang = S.lang || 'en';
    if (document.body) {
      ZOOM_CLASSES.forEach(cls => document.body.classList.remove(cls));
      const pct = Math.round((S.zoom || 1) * 20) * 5;
      const clamped = Math.max(85, Math.min(130, pct));
      document.body.classList.add(`cso-zoom-${clamped}`);
      document.body.classList.toggle('hc', !!S.hc);
      document.body.classList.toggle('ul', !!S.ul);
      document.body.classList.toggle('rm', !!S.rm);
    }
    if (window.CSOGlobal && typeof window.CSOGlobal.syncLang === 'function') {
      window.CSOGlobal.syncLang(S.lang || 'en');
    }
  }

  function showPopup(target, items) {
    document.querySelectorAll('.pp').forEach(x => x.remove());
    const triggerBtn = target && target.closest ? (target.closest('button') || target) : target;
    const anchor = target.closest('.cso-popup-anchor') || target.parentElement || document.body;
    const m = el('div', 'pp');
    m.setAttribute('role', 'menu');
    const closePopup = () => {
      m.remove();
      if (triggerBtn && triggerBtn.setAttribute) triggerBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onPopEsc);
    };
    const onPopEsc = ev => {
      if (ev && ev.key === 'Escape') {
        closePopup();
        if (triggerBtn && typeof triggerBtn.focus === 'function') triggerBtn.focus();
      }
    };
    items.forEach(([label, fn, active]) => {
      const b = el('button', '', (active ? '✓ ' : '') + label);
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        fn();
        closePopup();
      });
      m.appendChild(b);
    });
    anchor.appendChild(m);
    if (triggerBtn && triggerBtn.setAttribute) triggerBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onPopEsc);
    setTimeout(() => {
      window.addEventListener('click', closePopup, { once: true });
    }, 0);
  }

  function getSavedBookmarksList() {
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getFlatBookmarks === 'function') {
      return window.CSOBookmarks.getFlatBookmarks();
    }
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getAllBookmarks === 'function') {
      const all = window.CSOBookmarks.getAllBookmarks();
      return [...(all.jobs || []), ...(all.schemes || []), ...(all.study || [])];
    }
    return [];
  }

  function updateSavedCountBadge() {
    const badge = document.getElementById('cso-saved-count');
    if (!badge) return;
    const count = getSavedBookmarksList().length;
    badge.textContent = String(count);
  }

  let activeSavedFilter = 'all';

  function ensureSavedDrawer() {
    let backdrop = document.getElementById('cso-saved-drawer-backdrop');
    if (backdrop) return backdrop;

    backdrop = el('div', 'cso-saved-backdrop');
    backdrop.id = 'cso-saved-drawer-backdrop';
    backdrop.hidden = true;

    const drawer = el('aside', 'cso-saved-drawer');
    drawer.id = 'cso-saved-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'cso-saved-drawer-title');

    const head = el('div', 'cso-saved-drawer__head');
    const title = el('h2', 'cso-saved-drawer__title', '★ Saved Bookmarks');
    title.id = 'cso-saved-drawer-title';
    const closeBtn = el('button', 'cso-saved-drawer__close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close saved bookmarks');
    const closeSavedDrawer = () => {
      backdrop.hidden = true;
      document.body.classList.remove('cso-modal-open');
    };
    closeBtn.addEventListener('click', closeSavedDrawer);
    head.append(title, closeBtn);

    const tabs = el('div', 'cso-saved-drawer__tabs');
    tabs.id = 'cso-saved-drawer-tabs';
    const tabDefs = [
      ['all', 'All'],
      ['job', 'Jobs'],
      ['current-affair', 'Current Affairs'],
      ['mock-test', 'Mock Tests'],
      ['resource', 'Resources']
    ];
    tabDefs.forEach(([key, label]) => {
      const btn = el('button', key === activeSavedFilter ? 'cso-saved-tab is-active' : 'cso-saved-tab', label);
      btn.type = 'button';
      btn.dataset.filter = key;
      btn.addEventListener('click', () => {
        activeSavedFilter = key;
        renderSavedDrawerContents();
      });
      tabs.appendChild(btn);
    });

    const body = el('div', 'cso-saved-drawer__body');
    body.id = 'cso-saved-drawer-body';

    const foot = el('div', 'cso-saved-drawer__foot');
    foot.id = 'cso-saved-drawer-foot';

    drawer.append(head, tabs, body, foot);
    backdrop.appendChild(drawer);

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) {
        backdrop.hidden = true;
        document.body.classList.remove('cso-modal-open');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !backdrop.hidden) {
        backdrop.hidden = true;
        document.body.classList.remove('cso-modal-open');
      }
    });

    document.body.appendChild(backdrop);
    return backdrop;
  }

  function renderSavedDrawerContents() {
    const backdrop = ensureSavedDrawer();
    const tabsEl = document.getElementById('cso-saved-drawer-tabs');
    const bodyEl = document.getElementById('cso-saved-drawer-body');
    const footEl = document.getElementById('cso-saved-drawer-foot');
    if (!bodyEl || !footEl) return;

    if (tabsEl) {
      tabsEl.querySelectorAll('.cso-saved-tab').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.filter === activeSavedFilter);
      });
    }

    const allItems = getSavedBookmarksList();
    const filtered = activeSavedFilter === 'all'
      ? allItems
      : allItems.filter(item => (item.item_type || 'resource') === activeSavedFilter);

    bodyEl.replaceChildren();
    if (filtered.length === 0) {
      const empty = el('div', 'cso-saved-empty');
      empty.append(
        el('p', '', activeSavedFilter === 'all'
          ? 'No saved bookmarks yet. Click "☆ Bookmark" on any job notification, current affair, mock test, or syllabus PDF to save it here.'
          : 'No saved items in this category yet.')
      );
      bodyEl.appendChild(empty);
    } else {
      filtered.forEach(item => {
        const card = el('div', 'cso-saved-item');
        const top = el('div', 'cso-saved-item__top');
        top.appendChild(el('span', 'cso-saved-item__badge', item.badge || item.item_type || 'Saved'));

        const rmBtn = el('button', 'cso-saved-item__remove', 'Remove');
        rmBtn.type = 'button';
        rmBtn.addEventListener('click', () => {
          if (window.CSOBookmarks && typeof window.CSOBookmarks.removeBookmark === 'function') {
            window.CSOBookmarks.removeBookmark(item.item_type || item.shelf || 'resource', item.item_id || item.id);
          }
          renderSavedDrawerContents();
          updateSavedCountBadge();
        });
        top.appendChild(rmBtn);

        const link = el('a', 'cso-saved-item__link', item.title || 'Saved Item');
        const rawUrl = String(item.url || '/');
        link.href = (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) || /^https?:\/\//i.test(rawUrl) ? rawUrl : '/';

        card.append(top, link);
        bodyEl.appendChild(card);
      });
    }

    footEl.replaceChildren();
    let hasSession = false;
    try {
      hasSession = Boolean(localStorage.getItem('cso_candidate_session_v1'));
    } catch (_) {}
    if (hasSession) {
      footEl.appendChild(el('span', '', '☁️ Synced across devices via your CSO account'));
      const dashLink = el('a', '', 'Dashboard →');
      dashLink.href = '/student-dashboard/';
      footEl.appendChild(dashLink);
    } else {
      footEl.appendChild(el('span', '', '💾 Saved on this device'));
      const loginLink = el('a', '', 'Sign in to sync →');
      loginLink.href = '/login.html';
      footEl.appendChild(loginLink);
    }
  }

  function openSavedDrawer() {
    if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.openDrawer === 'function') {
      window.CSOSavedAlerts.openDrawer();
      return;
    }
    const backdrop = ensureSavedDrawer();
    renderSavedDrawerContents();
    backdrop.hidden = false;
    document.body.classList.add('cso-modal-open');
  }

  function renderControls() {
    const ctl = document.getElementById('ctl');
    if (!ctl) return;
    ctl.replaceChildren();

    const savedBtn = el('button', 'pill cso-ctl-saved');
    savedBtn.id = 'cso-ctl-saved';
    savedBtn.type = 'button';
    savedBtn.setAttribute('data-cso-saved-trigger', '1');
    savedBtn.setAttribute('aria-label', 'Open My Saved Alerts drawer');
    const starSpan = el('span', '', '🔖');
    starSpan.setAttribute('aria-hidden', 'true');
    const savedTxt = el('span', '', 'Saved');
    const initSavedLen = (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.getAll === 'function')
      ? window.CSOSavedAlerts.getAll().length
      : getSavedBookmarksList().length;
    const countBadge = el('span', 'cso-saved-badge', String(initSavedLen));
    countBadge.id = 'cso-saved-count';
    countBadge.setAttribute('data-cso-saved-count', '1');
    const urgentDot = el('span', 'cso-sa-urgent-dot');
    urgentDot.setAttribute('data-cso-saved-urgent', '1');
    urgentDot.setAttribute('aria-hidden', 'true');
    urgentDot.hidden = !(window.CSOSavedAlerts && typeof window.CSOSavedAlerts.getUrgentCount === 'function' && window.CSOSavedAlerts.getUrgentCount() > 0);
    savedBtn.append(starSpan, ' ', savedTxt, ' ', countBadge, urgentDot);
    savedBtn.addEventListener('click', openSavedDrawer);

    const langWrap = el('span', 'cso-popup-anchor');
    const langBtn = el('button', 'pill cso-ctl-lang');
    langBtn.id = 'cso-ctl-lang';
    langBtn.type = 'button';
    langBtn.setAttribute('aria-label', 'Language selector');
    langBtn.append(
      el('span', 'cso-lang-icon', '🌐'),
      ' ',
      el('span', 'cso-lang-name', LN[S.lang] || 'English'),
      ' ⌄'
    );
    langBtn.addEventListener('click', e => {
      e.stopPropagation();
      showPopup(langBtn, Object.keys(LN).map(k => [
        LN[k],
        () => {
          S.lang = k;
          saveSettings();
          applySettings();
          renderControls();
          renderNav();
          try { window.dispatchEvent(new CustomEvent('cso:lang-change', { detail: { lang: k } })); } catch (_) {}
        },
        S.lang === k
      ]));
    });
    langWrap.appendChild(langBtn);

    const themeWrap = el('span', 'cso-popup-anchor');
    const curPortalTheme = PORTAL_THEMES.find(t => t.key === activePortalTheme) || PORTAL_THEMES[0];
    const bt = el('button', 'pill cso-ctl-theme');
    bt.id = 'cso-ctl-theme';
    bt.type = 'button';
    bt.setAttribute('aria-label', 'Select portal theme');
    bt.title = `Theme: ${curPortalTheme.fullLabel}`;
    bt.append(el('span', `cso-theme-swatch is-${curPortalTheme.key}`), document.createTextNode(` ${curPortalTheme.label} ⌄`));
    bt.addEventListener('click', e => {
      e.stopPropagation();
      showPopup(bt, PORTAL_THEMES.map(t => [
        t.fullLabel,
        () => {
          setPortalTheme(t.key, true);
          renderControls();
        },
        activePortalTheme === t.key
      ]));
    });
    themeWrap.appendChild(bt);

    const a11yWrap = el('span', 'cso-popup-anchor');
    const a11yBtn = el('button', 'pill cso-ctl-a11y', '♿ Accessibility ⌄');
    a11yBtn.id = 'cso-ctl-a11y';
    a11yBtn.type = 'button';
    a11yBtn.addEventListener('click', e => {
      e.stopPropagation();
      const hasG = Boolean(window.CSOGlobal);
      showPopup(a11yBtn, [
        ['High contrast', () => { S.hc = +!S.hc; saveSettings(); applySettings(); if (hasG) window.CSOGlobal.toggleA11y('contrast'); }, !!S.hc || document.documentElement.classList.contains('cso-a11y-contrast')],
        ['Dyslexia-friendly font', () => { if (hasG) window.CSOGlobal.toggleA11y('dyslexia'); else document.documentElement.classList.toggle('cso-a11y-dyslexia'); }, document.documentElement.classList.contains('cso-a11y-dyslexia')],
        ['Lite mode (low data)', () => { if (hasG) window.CSOGlobal.toggleA11y('lite'); else document.documentElement.classList.toggle('cso-a11y-lite'); }, document.documentElement.classList.contains('cso-a11y-lite')],
        ['Underline links', () => { S.ul = +!S.ul; saveSettings(); applySettings(); }, !!S.ul],
        ['Reduce motion', () => { S.rm = +!S.rm; saveSettings(); applySettings(); }, !!S.rm],
        ['Reset', () => { S.hc = S.ul = S.rm = 0; S.zoom = 1; saveSettings(); applySettings(); if (hasG) window.CSOGlobal.resetA11y(); }]
      ]);
    });
    a11yWrap.appendChild(a11yBtn);

    const searchBtn = el('button', 'pill cso-ctl-search cso-ks-trigger');
    searchBtn.type = 'button';
    searchBtn.id = 'cso-ctl-global-search';
    searchBtn.setAttribute('data-cso-search-trigger', '1');
    searchBtn.setAttribute('aria-label', 'Open instant search (Ctrl+K)');
    searchBtn.appendChild(el('span', 'cso-ctl-search-icon', '🔍'));
    searchBtn.appendChild(el('span', 'cso-ctl-search-label', 'Search'));
    searchBtn.appendChild(el('kbd', 'cso-ctl-search-kbd cso-ks-kbd', 'Ctrl K'));
    searchBtn.addEventListener('click', () => {
      if (window.CSOInstantSearch && typeof window.CSOInstantSearch.openOverlay === 'function') {
        window.CSOInstantSearch.openOverlay(searchBtn);
      } else if (window.CSOGlobal && typeof window.CSOGlobal.openSearch === 'function') {
        window.CSOGlobal.openSearch('');
      }
    });

    const setZoom = d => {
      S.zoom = d ? Math.max(0.85, Math.min(1.3, +(S.zoom + d).toFixed(2))) : 1;
      saveSettings();
      applySettings();
    };

    const zoomSpan = el('span', 'pill cso-ctl-zoom');
    const fm = el('button', 'fz', 'A–');
    fm.id = 'cso-ctl-fm';
    fm.type = 'button';
    fm.setAttribute('aria-label', 'Smaller text');
    fm.addEventListener('click', () => setZoom(-0.05));

    const fr = el('button', 'fz', 'A');
    fr.id = 'cso-ctl-fr';
    fr.type = 'button';
    fr.setAttribute('aria-label', 'Normal text');
    fr.addEventListener('click', () => setZoom(0));

    const fp = el('button', 'fz', 'A+');
    fp.id = 'cso-ctl-fp';
    fp.type = 'button';
    fp.setAttribute('aria-label', 'Larger text');
    fp.addEventListener('click', () => setZoom(0.05));

    zoomSpan.append(fm, fr, fp);
    ctl.append(searchBtn, langWrap, themeWrap, a11yWrap, zoomSpan);
    syncMobileControlsVisibility();
  }

  function syncMobileControlsVisibility() {
    const isMobileSearchHidden = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 640px)').matches
      : window.innerWidth <= 640;
    const searchBtn = document.getElementById('cso-ctl-global-search');
    if (searchBtn) {
      searchBtn.classList.toggle('cso-hidden', isMobileSearchHidden);
      searchBtn.setAttribute('aria-hidden', String(isMobileSearchHidden));
    }
  }

  function getActiveUser() {
    let candidate = null;
    try {
      const raw = localStorage.getItem('cso_candidate_session_v1');
      if (raw) candidate = JSON.parse(raw);
    } catch (e) {}
    return candidate || (window.CSOAuthClient && typeof window.CSOAuthClient.getUser === 'function' ? window.CSOAuthClient.getUser() : null);
  }

  function formatAccountLabel(user) {
    const raw = String((user && (user.name || user.fullName)) || '').trim();
    if (!raw || /^common\s*sense/i.test(raw) || /^(account|user|admin|candidate)$/i.test(raw)) {
      return 'Account';
    }
    const first = raw.split(/\s+/)[0];
    return first && first.length <= 18 ? first : 'Account';
  }

  function renderAuth() {
    const authEl = document.getElementById('auth');
    if (!authEl) return;
    authEl.replaceChildren();

    const acctEl = authEl.closest('.acct');
    if (acctEl) {
      acctEl.querySelectorAll('.cso-desktop-auth-icon, .cso-acct-icon').forEach(ic => ic.classList.add('cso-hidden'));
    }

    const activeUser = getActiveUser();
    syncMobileNavAuth(activeUser);

    if (activeUser) {
      const isAdmin = activeUser.role === 'admin' || activeUser.role === 'superadmin';
      const dashHref = isAdmin ? '/admin/' : '/student-dashboard/';
      const deskRow = el('div', 'cso-desktop-auth-buttons cso-auth-row');
      const dashLink = el('a', isAdmin ? 'btn-dashboard cso-btn-admin-studio' : 'btn-dashboard cso-btn-candidate-hub');
      dashLink.href = dashHref;
      const iconSpan = el('span', '', '👤');
      iconSpan.setAttribute('aria-hidden', 'true');
      dashLink.append(iconSpan, el('span', '', isAdmin ? 'Admin Studio' : 'My Dashboard'));
      dashLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.assign(dashHref);
      }, true);

      const doLogout = async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' });
        } catch (e) {}
        try {
          localStorage.removeItem('cso_candidate_session_v1');
          localStorage.removeItem('cso_candidate_profile');
          localStorage.removeItem('cso_auth_token');
        } catch (e) {}
        if (typeof caches !== 'undefined') {
          try {
            const purge = (async () => {
              const keys = await caches.keys();
              await Promise.all(keys.map(async k => {
                const c = await caches.open(k);
                await Promise.all(['/student-dashboard/', '/student-dashboard/index.html', '/candidate-hub/', '/login.html', '/api/auth/me'].map(p => c.delete(p, { ignoreSearch: true }).catch(() => false)));
              }));
            })();
            await Promise.race([purge, new Promise(r => setTimeout(r, 80))]);
          } catch (e) {}
        }
        if (/^\/(?:student-dashboard|candidate-hub|saved)(?:\/|$)/i.test(window.location.pathname || '')) {
          window.location.replace('/login.html');
        } else {
          window.location.reload();
        }
      };

      const logoutBtn = el('button', 'btn-header-logout cso-logout-button', 'Logout');
      logoutBtn.type = 'button';
      logoutBtn.id = 'cso-header-logout-btn';
      logoutBtn.addEventListener('click', doLogout);

      if (isAdmin) {
        const hubLink = el('a', 'btn-dashboard cso-btn-candidate-hub', 'Candidate Hub');
        hubLink.href = '/student-dashboard/';
        deskRow.append(dashLink, hubLink, logoutBtn);
      } else {
        deskRow.append(dashLink, logoutBtn);
      }

      const mobWrap = el('div', 'cso-mobile-auth-wrapper');
      const trigger = el('button', 'cso-auth-trigger');
      trigger.type = 'button';
      trigger.id = 'cso-auth-trigger';
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', 'cso-auth-menu');
      trigger.setAttribute('aria-label', 'Account options');

      const mIcon = el('span', 'auth-icon', '👤');
      mIcon.setAttribute('aria-hidden', 'true');
      const mLabel = el('span', 'auth-label', formatAccountLabel(activeUser));
      mLabel.id = 'cso-auth-cand-label';
      const mArrow = el('span', 'auth-arrow', '▾');
      mArrow.setAttribute('aria-hidden', 'true');
      trigger.append(mIcon, mLabel, mArrow);

      const menu = el('div', 'cso-auth-dropdown-menu');
      menu.id = 'cso-auth-menu';
      menu.hidden = true;

      const mDash = el('a', isAdmin ? 'cso-auth-item cso-auth-item--dash cso-auth-item--admin' : 'cso-auth-item cso-auth-item--dash cso-auth-item--hub', isAdmin ? '🛡️ Admin Studio' : '👤 My Dashboard');
      mDash.href = dashHref;
      const mProfile = el('a', 'cso-auth-item cso-auth-item--saved', '★ Profile / Saved');
      mProfile.href = '/student-dashboard/#saved';
      const mLogout = el('a', 'cso-auth-item cso-auth-item--logout', 'Logout');
      mLogout.href = '#';
      mLogout.id = 'cso-header-mob-logout';
      mLogout.addEventListener('click', e => {
        e.preventDefault();
        doLogout();
      });
      if (isAdmin) {
        const mHub = el('a', 'cso-auth-item cso-auth-item--hub', '👤 Candidate Hub');
        mHub.href = '/student-dashboard/';
        menu.append(mDash, mHub, mProfile, mLogout);
      } else {
        menu.append(mDash, mProfile, mLogout);
      }
      mobWrap.append(trigger, menu);

      authEl.append(deskRow, mobWrap);
      return;
    }

    function createAuthPair(loginCls, signupCls) {
      const loginA = el('a', loginCls, 'Login');
      loginA.setAttribute('href', '/login.html');
      const signupA = el('a', signupCls, 'Sign Up');
      signupA.setAttribute('href', '/signup.html');
      return [loginA, signupA];
    }

    const desk = el('div', 'cso-desktop-auth-buttons cso-auth-logged-out');
    desk.append(...createAuthPair('cso-auth-item-link cso-login-link login-btn', 'cso-signup-pill signup-btn'));

    const mobWrap = el('div', 'cso-mobile-auth-wrapper');
    const trigger = el('button', 'cso-auth-trigger');
    trigger.type = 'button';
    trigger.id = 'cso-auth-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'cso-auth-menu');
    trigger.setAttribute('aria-label', 'Account options');

    const mIcon = el('span', 'auth-icon', '👤');
    mIcon.setAttribute('aria-hidden', 'true');
    const mLabel = el('span', 'auth-label', 'Account');
    const mArrow = el('span', 'auth-arrow', '▾');
    mArrow.setAttribute('aria-hidden', 'true');
    trigger.append(mIcon, mLabel, mArrow);

    const menu = el('div', 'cso-auth-dropdown-menu');
    menu.id = 'cso-auth-menu';
    menu.hidden = true;
    menu.append(...createAuthPair('cso-auth-item cso-auth-item--login', 'cso-auth-item cso-auth-item--signup'));
    mobWrap.append(trigger, menu);

    authEl.append(desk, mobWrap);
  }

  function closeAuthDropdown() {
    const trigger = document.getElementById('cso-auth-trigger');
    const menu = document.getElementById('cso-auth-menu');
    if (trigger && menu) {
      trigger.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      menu.classList.remove('cso-open');
    }
  }

  function toggleAuthDropdown(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trigger = document.getElementById('cso-auth-trigger');
    const menu = document.getElementById('cso-auth-menu');
    if (!trigger || !menu) return;
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    const nextOpen = !isOpen;
    trigger.setAttribute('aria-expanded', String(nextOpen));
    menu.hidden = !nextOpen;
    menu.classList.toggle('cso-open', nextOpen);
  }

  const pathname = window.location.pathname;
  function resolveActivePillar(pathStr) {
    const p = String(pathStr || '/').toLowerCase();
    if (p === '/' || p === '/index.html' || p === '') return '';
    if (p.startsWith('/careers') || p.startsWith('/career-paths') || p.startsWith('/career-guidance') || p.startsWith('/odisha-special')) return 'careers';
    if (p.startsWith('/jobs-careers') || p.startsWith('/jobs') || p.startsWith('/exams') || p.startsWith('/results') || p.startsWith('/admissions') || p.startsWith('/job-opportunity-finder')) return 'jobs';
    if (p.startsWith('/schemes-benefits') || p.startsWith('/schemes') || p.startsWith('/scholarships') || p.startsWith('/scholarship-guidance') || p.startsWith('/scheme-opportunity-finder')) return 'schemes-benefits';
    if (p.startsWith('/study-library') || p.startsWith('/study') || p.startsWith('/resources') || p.startsWith('/current-affairs') || p.startsWith('/mock-tests') || p.startsWith('/guides') || p.startsWith('/updates') || p.startsWith('/tools') || p.startsWith('/education-explorer') || p.startsWith('/study-path-finder')) return 'study-library';
    if (p.startsWith('/community') || p.startsWith('/support')) return 'community';
    if (p.startsWith('/about') || p.startsWith('/trust-layer') || p.startsWith('/privacy-policy') || p.startsWith('/terms-of-use') || p.startsWith('/disclaimer') || p.startsWith('/copyright-policy')) return 'about';
    return '';
  }
  const activeSection = resolveActivePillar(pathname);
  let lastLiveNavPayload = null;

  function navLabel(item) {
    return S.lang === 'or' ? (item.labelOr || item.label_or || item.labelEn || item.label_en || '') : (item.labelEn || item.label_en || '');
  }

  function resolveSafeHref(url) {
    const raw = String(url || '/').trim();
    if (/^(javascript|data|vbscript)\s*:/i.test(raw)) return '/';
    return raw || '/';
  }

  function buildPillarDropdown(pillarKey, subItems) {
    const dd = el('div', 'dd');
    dd.id = 'cso-nav-dd-' + pillarKey;
    (subItems || []).forEach(sub => {
      const subA = el('a');
      subA.href = resolveSafeHref(sub.url);
      if (sub.open_new_tab) { subA.target = '_blank'; subA.rel = 'noopener noreferrer'; }
      const bullet = el('span', 'dd-bullet', '›');
      bullet.setAttribute('aria-hidden', 'true');
      subA.append(bullet, el('span', '', navLabel(sub)));
      dd.appendChild(subA);
    });
    return dd;
  }

  function closeDropdowns(except) {
    document.querySelectorAll('#navw .ni').forEach(n => {
      if (n === except) return;
      n.classList.remove('cso-open', 'is-open');
      const cascade = n.querySelector('.cso-jobs-cascade, .cso-careers-cascade, .cso-schemes-cascade, .cso-study-cascade, .cso-community-cascade');
      if (cascade) cascade.classList.remove('is-stage2-open');
      n.querySelectorAll('.cso-js1-item.is-active, .cso-js1-item.is-mob-open').forEach(it => {
        it.classList.remove('is-active', 'is-mob-open');
      });
      const b = n.querySelector('.cso-nav-arrow');
      if (b) b.setAttribute('aria-expanded', 'false');
      const trigA = n.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
      if (trigA) trigA.setAttribute('aria-expanded', 'false');
    });
    const navw = document.getElementById('navw');
    if (navw && document.activeElement && navw.contains(document.activeElement)) {
      if (!except || !except.contains(document.activeElement)) {
        try { document.activeElement.blur(); } catch (e) {}
      }
    }
  }

  function normalizeHeaderItems(rawItems) {
    const hasCareers = (rawItems || []).some(it => String(it && it.url || '').replace(/^\/+|\/+$/g, '').toLowerCase() === 'careers');
    const out = [];
    (rawItems || []).forEach(it => {
      const seg = String(it && it.url || '').replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
      const lbl = String(it && (it.labelEn || it.label_en) || '').trim().toLowerCase();
      if ((seg === 'jobs-careers' || lbl === 'jobs & careers') && !hasCareers) {
        out.push({ key: 'jobs', labelEn: 'Jobs', labelOr: 'ଚାକିରି', icon: '💼', url: '/jobs/', sort_order: Number(it.sort_order || 1) });
        out.push({ key: 'careers', labelEn: 'Careers', labelOr: 'କ୍ୟାରିୟର୍', icon: '🧭', url: '/careers/', sort_order: Number(it.sort_order || 1) + 0.5 });
      } else {
        out.push(it);
      }
    });
    return out;
  }

  function renderPillarNodes(navItems, items) {
    navItems.replaceChildren();

    const isHome = !activeSection && (pathname === '/' || pathname.endsWith('/index.html') || pathname === '');
    const homeA = el('a', 'cso-nav-home' + (isHome ? ' on' : ''));
    homeA.href = '/';
    if (isHome) homeA.setAttribute('aria-current', 'page');
    const homeIcon = el('span', '', '🏠');
    homeIcon.setAttribute('aria-hidden', 'true');
    homeA.append(homeIcon, ' ' + (S.lang === 'or' ? 'ମୂଳପୃଷ୍ଠା' : 'Home'));
    navItems.appendChild(homeA);

    normalizeHeaderItems(items).forEach(it => {
      const rawKey = it.key || String(it.url || '').replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase() || 'link';
      const pillarKey = rawKey === 'jobs-careers' ? 'jobs' : (rawKey === 'schemes' ? 'schemes-benefits' : rawKey);
      if (pillarKey === 'home' || it.url === '/') return;
      const isCurrent = pillarKey === activeSection;
      const isJobs = pillarKey === 'jobs';
      const isCareers = pillarKey === 'careers';
      const isSchemes = pillarKey === 'schemes-benefits' || pillarKey === 'schemes';
      const isStudy = pillarKey === 'study-library' || pillarKey === 'study';
      const isCommunity = pillarKey === 'community';
      const ni = el('div', 'ni' + (isCurrent ? ' cso-active' : '') + (isJobs ? ' cso-ni-jobs cso-nav-jobs-wrap' : '') + (isCareers ? ' cso-ni-careers cso-nav-careers-wrap' : '') + (isSchemes ? ' cso-ni-schemes cso-nav-schemes-wrap' : '') + (isStudy ? ' cso-ni-study cso-nav-study-wrap' : '') + (isCommunity ? ' cso-ni-community cso-nav-community-wrap' : ''));
      ni.dataset.pillar = pillarKey;
      const parent = el('div', 'cso-nav-parent');
      const a = el('a', isCurrent ? 'on' : '');
      a.href = resolveSafeHref(it.url || ('/' + pillarKey + '/'));
      if (it.open_new_tab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      if (isCurrent) a.setAttribute('aria-current', 'page');
      if (isJobs) {
        a.setAttribute('aria-haspopup', 'true');
        a.setAttribute('aria-expanded', 'false');
        a.setAttribute('aria-controls', 'cso-jobs-stage1');
      } else if (isCareers) {
        a.setAttribute('aria-haspopup', 'true');
        a.setAttribute('aria-expanded', 'false');
        a.setAttribute('aria-controls', 'cso-careers-stage1');
      } else if (isSchemes) {
        a.setAttribute('aria-haspopup', 'true');
        a.setAttribute('aria-expanded', 'false');
        a.setAttribute('aria-controls', 'cso-schemes-stage1');
      } else if (isStudy) {
        a.setAttribute('aria-haspopup', 'true');
        a.setAttribute('aria-expanded', 'false');
        a.setAttribute('aria-controls', 'cso-study-stage1');
      } else if (isCommunity) {
        a.setAttribute('aria-haspopup', 'true');
        a.setAttribute('aria-expanded', 'false');
        a.setAttribute('aria-controls', 'cso-community-stage1');
      }
      const iconText = it.icon || it.icon_key || '';
      if (iconText) {
        const ic = el('span', '', iconText);
        ic.setAttribute('aria-hidden', 'true');
        a.append(ic, ' ');
      }
      a.append(document.createTextNode(navLabel(it) || pillarKey));
      if (it.badge_text_en) a.append(' ', el('span', 'cso-nav-badge', it.badge_text_en));

      parent.appendChild(a);
      if (isJobs) {
        try {
          const chevBtn = el('button', 'cso-nav-arrow cso-jobs-flyout-toggle');
          chevBtn.type = 'button';
          chevBtn.setAttribute('aria-label', 'Toggle Jobs sectors menu');
          chevBtn.setAttribute('aria-haspopup', 'true');
          chevBtn.setAttribute('aria-expanded', 'false');
          chevBtn.setAttribute('aria-controls', 'cso-jobs-stage1');
          const chevIcon = el('span', 'cso-jobs-chev', '▾');
          chevIcon.setAttribute('aria-hidden', 'true');
          chevBtn.appendChild(chevIcon);
          parent.appendChild(chevBtn);
          ni.appendChild(parent);
          const cascade = buildJobsCascadingMenu();
          ni.appendChild(cascade);
          wireJobsCascadingInteractions(ni, a, chevBtn, cascade);
        } catch (err) {
          console.error('[CSO SharedHeader] Jobs menu failed:', err);
          if (!parent.parentNode) ni.appendChild(parent);
        }
      } else if (isCareers) {
        try {
          const chevBtn = el('button', 'cso-nav-arrow cso-careers-flyout-toggle');
          chevBtn.type = 'button';
          chevBtn.setAttribute('aria-label', 'Toggle Careers tracks menu');
          chevBtn.setAttribute('aria-haspopup', 'true');
          chevBtn.setAttribute('aria-expanded', 'false');
          chevBtn.setAttribute('aria-controls', 'cso-careers-stage1');
          const chevIcon = el('span', 'cso-jobs-chev', '▾');
          chevIcon.setAttribute('aria-hidden', 'true');
          chevBtn.appendChild(chevIcon);
          parent.appendChild(chevBtn);
          ni.appendChild(parent);
          const cascade = buildCareersCascadingMenu();
          ni.appendChild(cascade);
          wireCareersCascadingInteractions(ni, a, chevBtn, cascade);
        } catch (err) {
          console.error('[CSO SharedHeader] Careers menu failed:', err);
          if (!parent.parentNode) ni.appendChild(parent);
        }
      } else if (isSchemes) {
        try {
          const chevBtn = el('button', 'cso-nav-arrow cso-schemes-flyout-toggle');
          chevBtn.type = 'button';
          chevBtn.setAttribute('aria-label', 'Toggle Schemes categories menu');
          chevBtn.setAttribute('aria-haspopup', 'true');
          chevBtn.setAttribute('aria-expanded', 'false');
          chevBtn.setAttribute('aria-controls', 'cso-schemes-stage1');
          const chevIcon = el('span', 'cso-jobs-chev', '▾');
          chevIcon.setAttribute('aria-hidden', 'true');
          chevBtn.appendChild(chevIcon);
          parent.appendChild(chevBtn);
          ni.appendChild(parent);
          const cascade = buildSchemesCascadingMenu();
          ni.appendChild(cascade);
          wireSchemesCascadingInteractions(ni, a, chevBtn, cascade);
        } catch (err) {
          console.error('[CSO SharedHeader] Schemes menu failed:', err);
          if (!parent.parentNode) ni.appendChild(parent);
        }
      } else if (isStudy) {
        try {
          const chevBtn = el('button', 'cso-nav-arrow cso-study-flyout-toggle');
          chevBtn.type = 'button';
          chevBtn.setAttribute('aria-label', 'Toggle Study Library tracks menu');
          chevBtn.setAttribute('aria-haspopup', 'true');
          chevBtn.setAttribute('aria-expanded', 'false');
          chevBtn.setAttribute('aria-controls', 'cso-study-stage1');
          const chevIcon = el('span', 'cso-jobs-chev', '▾');
          chevIcon.setAttribute('aria-hidden', 'true');
          chevBtn.appendChild(chevIcon);
          parent.appendChild(chevBtn);
          ni.appendChild(parent);
          const cascade = buildStudyDropdownMenu();
          ni.appendChild(cascade);
          wireStudyDropdownInteractions(ni, a, chevBtn, cascade);
        } catch (err) {
          console.error('[CSO SharedHeader] Study Library menu failed:', err);
          if (!parent.parentNode) ni.appendChild(parent);
        }
      } else if (isCommunity) {
        try {
          const chevBtn = el('button', 'cso-nav-arrow cso-community-flyout-toggle');
          chevBtn.type = 'button';
          chevBtn.setAttribute('aria-label', 'Toggle Community channels menu');
          chevBtn.setAttribute('aria-haspopup', 'true');
          chevBtn.setAttribute('aria-expanded', 'false');
          chevBtn.setAttribute('aria-controls', 'cso-community-stage1');
          const chevIcon = el('span', 'cso-jobs-chev', '▾');
          chevIcon.setAttribute('aria-hidden', 'true');
          chevBtn.appendChild(chevIcon);
          parent.appendChild(chevBtn);
          ni.appendChild(parent);
          const cascade = buildCommunityDropdownMenu();
          ni.appendChild(cascade);
          wireCommunityDropdownInteractions(ni, a, chevBtn, cascade);
        } catch (err) {
          console.error('[CSO SharedHeader] Community menu failed:', err);
          if (!parent.parentNode) ni.appendChild(parent);
        }
      } else {
        ni.appendChild(parent);
      }
      navItems.appendChild(ni);
    });
  }

  // v450: Single-source-of-truth canonical aligned dropdowns (exact parity with assets/app.js & SSR shells)
  const CSO_CANONICAL_NAV_DROPDOWNS = {
    jobs: [
      { slug: 'job-alerts', icon: '💼', title_en: 'Job Alerts', title_or: 'ଚାକିରି ବିଜ୍ଞପ୍ତି', href: '/jobs/' },
      { slug: 'exam-updates', icon: '🪪', title_en: 'Exam Updates & Admit Cards', title_or: 'ପରୀକ୍ଷା ସୂଚନା ଓ ଆଡମିଟ୍ କାର୍ଡ', href: '/exams/' },
      { slug: 'results', icon: '🏆', title_en: 'Results & Cut-Offs', title_or: 'ଫଳାଫଳ ଓ କଟ୍-ଅଫ୍', href: '/results/' },
      { slug: 'admissions', icon: '🎓', title_en: 'Admissions & Counselling', title_or: 'ନାମଲେଖା ଓ କାଉନସେଲିଂ', href: '/admissions/' },
      { slug: 'odisha-recruitments', icon: '🏛️', title_en: 'Odisha State & University Recruitments', title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ବିଶ୍ୱବିଦ୍ୟାଳୟ ନିଯୁକ୍ତି', href: '/jobs/#odisha' }
    ],
    careers: [
      { slug: 'career-paths', icon: '🧭', title_en: 'Career Paths & ORSP 7th Pay Explorer', title_or: 'କ୍ୟାରିଅର ପଥ ଓ ORSP ୭ମ ବେତନ', href: '/career-paths/' },
      { slug: 'odisha-special', icon: '🗺️', title_en: 'Odisha Special & 30-District Atlas', title_or: 'ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ଓ ୩୦ ଜିଲ୍ଲା ଆଟଲାସ୍', href: '/odisha-special/' },
      { slug: 'career-roadmaps', icon: '📋', title_en: 'Career Roadmaps & Guides', title_or: 'କ୍ୟାରିଅର ରୋଡମ୍ୟାପ୍ ଓ ଗାଇଡ୍', href: '/careers/' }
    ],
    schemes: [
      { slug: 'scholarships', icon: '🎓', title_en: 'Scholarships Hub', title_or: 'ଛାତ୍ରବୃତ୍ତି ହବ୍', href: '/scholarships/' },
      { slug: 'odisha-schemes', icon: '🏛️', title_en: 'Odisha Welfare Schemes', title_or: 'ଓଡ଼ିଶା କଲ୍ୟାଣ ଯୋଜନା', href: '/schemes/' }
    ],
    study: [
      { slug: 'study-materials', icon: '📚', title_en: 'Study Materials & Notes', title_or: 'ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଓ ନୋଟ୍ସ', href: '/study-materials/' },
      { slug: 'guides', icon: '📘', title_en: 'Informative Guides', title_or: 'ସୂଚନାମୂଳକ ଗାଇଡ୍', href: '/guides/' },
      { slug: 'updates', icon: '📰', title_en: 'All Updates (Newsroom)', title_or: 'ସମସ୍ତ ଅପଡେଟ୍ (ନ୍ୟୁଜରୁମ୍)', href: '/updates/' },
      { slug: 'mock-tests', icon: '⏱️', title_en: 'Live CBT Mock Tests', title_or: 'ଲାଇଭ୍ CBT ମକ୍ ଟେଷ୍ଟ', href: '/mock-tests/' },
      { slug: 'pyq', icon: '📑', title_en: 'Syllabus & PYQ Papers', title_or: 'ସିଲାବସ୍ ଓ ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନ (PYQ)', href: '/study-materials/#pyq' }
    ],
    community: [
      { slug: 'exam-career-qa', icon: '❓', title_en: 'Exam & Career Q&A', title_or: 'ପରୀକ୍ଷା ଓ କ୍ୟାରିୟର ପ୍ରଶ୍ନୋତ୍ତର', href: '/community/?channel=exam-career-qa' },
      { slug: 'schemes-citizen-help', icon: '🏛️', title_en: 'Odisha Schemes & Citizen Help', title_or: 'ଓଡ଼ିଶା ଯୋଜନା ଓ ନାଗରିକ ସହାୟତା', href: '/community/?channel=schemes-citizen-help' },
      { slug: 'study-groups-notes', icon: '📚', title_en: 'Study Groups & Peer Notes', title_or: 'ଅଧ୍ୟୟନ ଦଳ ଓ ସହପାଠୀ ନୋଟ୍ସ', href: '/community/?channel=study-groups-notes' },
      { slug: 'success-stories-mentorship', icon: '🏆', title_en: 'Success Stories & Mentorship', title_or: 'ସଫଳତା କାହାଣୀ ଓ ମାର୍ଗଦର୍ଶନ', href: '/community/?channel=success-stories-mentorship' },
      { slug: 'all', icon: '🌐', title_en: 'All Community Discussions', title_or: 'ସମସ୍ତ ସମୁଦାୟ ଆଲୋଚନା', href: '/community/' }
    ]
  };
  window.CSO_CANONICAL_NAV_DROPDOWNS = CSO_CANONICAL_NAV_DROPDOWNS;

  function renderCanonicalStage1(stage1List, items, dataAttrKey) {
    if (!stage1List) return;
    const isOr = S.lang === 'or';
    const curPath = (window.location && window.location.pathname) ? window.location.pathname : '';
    const curHash = (window.location && window.location.hash) ? window.location.hash : '';
    const curSearch = (window.location && window.location.search) ? window.location.search : '';
    stage1List.replaceChildren();

    (items || []).forEach(item => {
      const li = el('li', 'cso-js1-item is-direct-only');
      if (dataAttrKey) li.dataset[dataAttrKey] = item.slug;

      const row = el('div', 'cso-js1-row');
      let isCur = false;
      if (item.href.indexOf('#') !== -1) isCur = (curPath + curHash === item.href);
      else if (item.href.indexOf('?') !== -1) isCur = (curPath + curSearch === item.href);
      else isCur = (curPath === item.href && !curHash && !curSearch);
      const a = el('a', 'cso-js1-link' + (isCur ? ' on' : ''));
      a.href = item.href;
      if (isCur) a.setAttribute('aria-current', 'page');

      const left = el('span', 'cso-js1-left');
      const ic = el('span', 'cso-js1-icon', item.icon);
      ic.setAttribute('aria-hidden', 'true');
      left.append(ic, el('span', 'cso-js1-title', isOr ? (item.title_or || item.title_en) : item.title_en));
      a.appendChild(left);
      row.appendChild(a);
      li.appendChild(row);

      a.addEventListener('keydown', ev => {
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          const nextLi = li.nextElementSibling;
          if (nextLi) { const na = nextLi.querySelector('.cso-js1-link'); if (na) na.focus(); }
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          const prevLi = li.previousElementSibling;
          if (prevLi) { const pa = prevLi.querySelector('.cso-js1-link'); if (pa) pa.focus(); }
        }
      });

      stage1List.appendChild(li);
    });
  }

  function populateStage1List(cascade, stage1List) {
    renderCanonicalStage1(stage1List, CSO_CANONICAL_NAV_DROPDOWNS.jobs, 'jsSector');
  }

  function hydrateJobsFlyoutFromD1(cascade, stage1List) {
    populateStage1List(cascade, stage1List);
  }

  function buildJobsCascadingMenu() {
    const isOr = S.lang === 'or';
    const cascade = el('div', 'cso-jobs-cascade');
    cascade.id = 'cso-jobs-cascade';

    const stage1 = el('div', 'cso-jobs-stage1');
    stage1.id = 'cso-jobs-stage1';
    stage1.setAttribute('role', 'region');
    stage1.setAttribute('aria-label', isOr ? 'ଚାକିରି କ୍ଷେତ୍ର ମେନୁ' : 'Jobs sectors menu');

    const list = el('ul', 'cso-js1-list');
    stage1.appendChild(list);

    populateStage1List(cascade, list);
    cascade.appendChild(stage1);
    return cascade;
  }

  function wireJobsCascadingInteractions(ni, triggerA, chevBtn, cascade) {
    let hoverCloseTimer = null;
    const stage1List = cascade.querySelector('.cso-js1-list');

    function setOpen(open) {
      if (open) {
        closeDropdowns(ni);
        populateStage1List(cascade, stage1List);
      }
      ni.classList.toggle('cso-open', open);
      ni.classList.toggle('is-open', open);
      triggerA.setAttribute('aria-expanded', String(open));
      chevBtn.setAttribute('aria-expanded', String(open));
    }

    ni.addEventListener('mouseenter', () => {
      if (window.innerWidth < 1100) return;
      clearTimeout(hoverCloseTimer);
      setOpen(true);
    });

    ni.addEventListener('mouseleave', () => {
      if (window.innerWidth < 1100) return;
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = setTimeout(() => setOpen(false), 150);
    });

    triggerA.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setOpen(true);
        const firstLink = cascade.querySelector('.cso-js1-link');
        if (firstLink) firstLink.focus();
      } else if (ev.key === 'Escape') {
        setOpen(false);
      }
    });

    chevBtn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = ev.key === 'ArrowDown' ? true : !ni.classList.contains('cso-open');
        setOpen(next);
        if (next) {
          const firstLink = cascade.querySelector('.cso-js1-link');
          if (firstLink) firstLink.focus();
        }
      } else if (ev.key === 'Escape') {
        setOpen(false);
        chevBtn.focus();
      }
    });

    ni.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && ni.classList.contains('cso-open')) {
        ev.preventDefault();
        setOpen(false);
        triggerA.focus();
      }
    });
  }

  function populateCareersStage1List(stage1List) {
    renderCanonicalStage1(stage1List, CSO_CANONICAL_NAV_DROPDOWNS.careers, 'crTrack');
  }

  function hydrateCareersFlyoutFromD1(stage1List) {
    populateCareersStage1List(stage1List);
  }

  function buildCareersCascadingMenu() {
    const isOr = S.lang === 'or';
    const cascade = el('div', 'cso-careers-cascade');
    cascade.id = 'cso-careers-cascade';

    const stage1 = el('div', 'cso-careers-stage1');
    stage1.id = 'cso-careers-stage1';
    stage1.setAttribute('role', 'region');
    stage1.setAttribute('aria-label', isOr ? 'କ୍ୟାରିୟର୍ ମାର୍ଗ ମେନୁ' : 'Career tracks menu');

    const list = el('ul', 'cso-js1-list');
    stage1.appendChild(list);

    populateCareersStage1List(list);
    cascade.appendChild(stage1);
    return cascade;
  }

  function wireCareersCascadingInteractions(ni, triggerA, chevBtn, cascade) {
    let hoverCloseTimer = null;
    const stage1List = cascade.querySelector('.cso-js1-list');
    const stage1Box = cascade.querySelector('.cso-careers-stage1');

    function setOpen(open) {
      if (open) {
        closeDropdowns(ni);
        populateCareersStage1List(stage1List);
      }
      ni.classList.toggle('cso-open', open);
      ni.classList.toggle('is-open', open);
      triggerA.setAttribute('aria-expanded', String(open));
      chevBtn.setAttribute('aria-expanded', String(open));
    }

    ni.addEventListener('mouseenter', () => {
      if (window.innerWidth < 1100) return;
      clearTimeout(hoverCloseTimer);
      setOpen(true);
    });

    ni.addEventListener('mouseleave', () => {
      if (window.innerWidth < 1100) return;
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = setTimeout(() => setOpen(false), 150);
    });

    if (stage1Box) {
      stage1Box.addEventListener('mouseenter', () => {
        if (window.innerWidth < 1100) return;
        clearTimeout(hoverCloseTimer);
      });
    }

    triggerA.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setOpen(true);
        const firstLink = cascade.querySelector('.cso-js1-link');
        if (firstLink) firstLink.focus();
      } else if (ev.key === 'Escape') {
        setOpen(false);
      }
    });

    chevBtn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = ev.key === 'ArrowDown' ? true : !ni.classList.contains('cso-open');
        setOpen(next);
        if (next) {
          const firstLink = cascade.querySelector('.cso-js1-link');
          if (firstLink) firstLink.focus();
        }
      } else if (ev.key === 'Escape') {
        setOpen(false);
        chevBtn.focus();
      }
    });

    ni.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && ni.classList.contains('cso-open')) {
        ev.preventDefault();
        setOpen(false);
        triggerA.focus();
      }
    });
  }

  function renderSchemesStage1(stage1List) {
    renderCanonicalStage1(stage1List, CSO_CANONICAL_NAV_DROPDOWNS.schemes, 'schScope');
  }

  function hydrateSchemesFlyoutFromD1(cascade, stage1List) {
    renderSchemesStage1(stage1List);
  }

  function buildSchemesCascadingMenu() {
    const cascade = el('div', 'cso-schemes-cascade');
    cascade.id = 'cso-schemes-cascade';

    const stage1 = el('div', 'cso-schemes-stage1');
    stage1.id = 'cso-schemes-stage1';
    stage1.setAttribute('role', 'region');
    stage1.setAttribute('aria-label', 'Schemes & Benefits');

    const list = el('ul', 'cso-js1-list');
    stage1.appendChild(list);

    cascade.appendChild(stage1);
    renderSchemesStage1(list);
    return cascade;
  }

  function wireSchemesCascadingInteractions(ni, triggerA, chevBtn, cascade) {
    let closeTimer = null;
    const stage1List = cascade.querySelector('.cso-js1-list');

    function setOpen(open) {
      if (open) {
        closeDropdowns(ni);
        renderSchemesStage1(stage1List);
      }
      ni.classList.toggle('cso-open', open);
      ni.classList.toggle('is-open', open);
      triggerA.setAttribute('aria-expanded', String(open));
      chevBtn.setAttribute('aria-expanded', String(open));
    }

    ni.addEventListener('mouseenter', () => {
      if (window.innerWidth < 1100) return;
      clearTimeout(closeTimer);
      setOpen(true);
    });

    ni.addEventListener('mouseleave', () => {
      if (window.innerWidth < 1100) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setOpen(false), 150);
    });

    triggerA.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setOpen(true);
        const firstLink = cascade.querySelector('.cso-js1-link');
        if (firstLink) firstLink.focus();
      } else if (ev.key === 'Escape') {
        setOpen(false);
      }
    });

    chevBtn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = ev.key === 'ArrowDown' ? true : !ni.classList.contains('cso-open');
        setOpen(next);
        if (next) {
          const firstLink = cascade.querySelector('.cso-js1-link');
          if (firstLink) firstLink.focus();
        }
      } else if (ev.key === 'Escape') {
        setOpen(false);
        chevBtn.focus();
      }
    });

    ni.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && ni.classList.contains('cso-open')) {
        ev.preventDefault();
        setOpen(false);
        triggerA.focus();
      }
    });
  }

  function renderStudyStage1(stage1List) {
    renderCanonicalStage1(stage1List, CSO_CANONICAL_NAV_DROPDOWNS.study, 'track');
  }

  function hydrateStudyDropdownFromD1(stage1List) {
    renderStudyStage1(stage1List);
  }

  function buildStudyDropdownMenu() {
    const cascade = el('div', 'cso-study-cascade');
    cascade.id = 'cso-study-cascade';

    const stage1 = el('div', 'cso-study-stage1');
    stage1.id = 'cso-study-stage1';
    stage1.setAttribute('role', 'region');
    stage1.setAttribute('aria-label', 'Study Library Tracks');

    const list = el('ul', 'cso-js1-list');
    stage1.appendChild(list);

    cascade.appendChild(stage1);
    renderStudyStage1(list);
    return cascade;
  }

  function wireStudyDropdownInteractions(ni, triggerA, chevBtn, cascade) {
    let closeTimer = null;
    const stage1 = cascade.querySelector('.cso-study-stage1');
    const stage1List = cascade.querySelector('.cso-js1-list');

    function setOpen(open) {
      if (open) {
        closeDropdowns(ni);
        renderStudyStage1(stage1List);
      }
      ni.classList.toggle('cso-open', open);
      ni.classList.toggle('is-open', open);
      triggerA.setAttribute('aria-expanded', String(open));
      chevBtn.setAttribute('aria-expanded', String(open));
    }

    function onEnter() {
      if (window.innerWidth < 1100) return;
      clearTimeout(closeTimer);
      setOpen(true);
    }

    function onLeave() {
      if (window.innerWidth < 1100) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setOpen(false), 150);
    }

    ni.addEventListener('mouseenter', onEnter);
    ni.addEventListener('mouseleave', onLeave);
    if (stage1) {
      stage1.addEventListener('mouseenter', () => { if (window.innerWidth >= 1100) clearTimeout(closeTimer); });
      stage1.addEventListener('mouseleave', onLeave);
    }

    triggerA.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setOpen(true);
        const firstLink = cascade.querySelector('.cso-js1-link');
        if (firstLink) firstLink.focus();
      } else if (ev.key === 'Escape') {
        setOpen(false);
      }
    });

    chevBtn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = ev.key === 'ArrowDown' ? true : !ni.classList.contains('cso-open');
        setOpen(next);
        if (next) {
          const firstLink = cascade.querySelector('.cso-js1-link');
          if (firstLink) firstLink.focus();
        }
      } else if (ev.key === 'Escape') {
        setOpen(false);
        chevBtn.focus();
      }
    });

    ni.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && ni.classList.contains('cso-open')) {
        ev.preventDefault();
        setOpen(false);
        triggerA.focus();
      }
    });
  }

  function renderCommunityStage1(stage1List) {
    renderCanonicalStage1(stage1List, CSO_CANONICAL_NAV_DROPDOWNS.community, 'channel');
  }

  function hydrateCommunityDropdownFromD1(stage1List) {
    renderCommunityStage1(stage1List);
  }

  function buildCommunityDropdownMenu() {
    const cascade = el('div', 'cso-community-cascade');
    cascade.id = 'cso-community-cascade';

    const stage1 = el('div', 'cso-community-stage1');
    stage1.id = 'cso-community-stage1';
    stage1.setAttribute('role', 'region');
    stage1.setAttribute('aria-label', 'Community Channels');

    const list = el('ul', 'cso-js1-list');
    stage1.appendChild(list);

    cascade.appendChild(stage1);
    renderCommunityStage1(list);
    return cascade;
  }

  function wireCommunityDropdownInteractions(ni, triggerA, chevBtn, cascade) {
    let closeTimer = null;
    const stage1 = cascade.querySelector('.cso-community-stage1');
    const stage1List = cascade.querySelector('.cso-js1-list');

    function setOpen(open) {
      if (open) {
        closeDropdowns(ni);
        renderCommunityStage1(stage1List);
      }
      ni.classList.toggle('cso-open', open);
      ni.classList.toggle('is-open', open);
      triggerA.setAttribute('aria-expanded', String(open));
      chevBtn.setAttribute('aria-expanded', String(open));
    }

    function onEnter() {
      if (window.innerWidth < 1100) return;
      clearTimeout(closeTimer);
      setOpen(true);
    }

    function onLeave() {
      if (window.innerWidth < 1100) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setOpen(false), 150);
    }

    ni.addEventListener('mouseenter', onEnter);
    ni.addEventListener('mouseleave', onLeave);
    if (stage1) {
      stage1.addEventListener('mouseenter', () => { if (window.innerWidth >= 1100) clearTimeout(closeTimer); });
      stage1.addEventListener('mouseleave', onLeave);
    }

    triggerA.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setOpen(true);
        const firstLink = cascade.querySelector('.cso-js1-link');
        if (firstLink) firstLink.focus();
      } else if (ev.key === 'Escape') {
        setOpen(false);
      }
    });

    chevBtn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = ev.key === 'ArrowDown' ? true : !ni.classList.contains('cso-open');
        setOpen(next);
        if (next) {
          const firstLink = cascade.querySelector('.cso-js1-link');
          if (firstLink) firstLink.focus();
        }
      } else if (ev.key === 'Escape') {
        setOpen(false);
        chevBtn.focus();
      }
    });

    ni.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && ni.classList.contains('cso-open')) {
        ev.preventDefault();
        setOpen(false);
        triggerA.focus();
      }
    });
  }

  function getOpenPillarKey(container) {
    if (!container) return '';
    const openNi = container.querySelector('.ni.cso-open, .ni.is-open');
    if (!openNi) return '';
    const pillarClasses = ['cso-ni-jobs', 'cso-ni-careers', 'cso-ni-schemes', 'cso-ni-study', 'cso-ni-community'];
    for (let i = 0; i < pillarClasses.length; i++) {
      if (openNi.classList.contains(pillarClasses[i])) return pillarClasses[i];
    }
    const trig = openNi.querySelector('.cso-nav-parent > a');
    return trig ? String(trig.getAttribute('href') || '') : '';
  }

  function restoreOpenPillar(container, key) {
    if (!container || !key) return;
    let targetNi = null;
    if (key.startsWith('cso-ni-')) {
      targetNi = container.querySelector('.ni.' + key);
    } else {
      const links = container.querySelectorAll('.ni > .cso-nav-parent > a');
      for (let i = 0; i < links.length; i++) {
        if (String(links[i].getAttribute('href') || '') === key) {
          targetNi = links[i].closest('.ni');
          break;
        }
      }
    }
    if (!targetNi) return;
    targetNi.classList.add('cso-open', 'is-open');
    const arrow = targetNi.querySelector('.cso-nav-arrow');
    if (arrow) arrow.setAttribute('aria-expanded', 'true');
    const trigA = targetNi.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
    if (trigA) trigA.setAttribute('aria-expanded', 'true');
  }

  function renderNav() {
    const navw = document.getElementById('navw');
    if (!navw) return;
    const prevItems = document.getElementById('cso-nav-items');
    const wasDrawerOpen = Boolean(prevItems && prevItems.classList.contains('cso-mobile-open'));
    const prevOpenKey = getOpenPillarKey(prevItems);
    navw.replaceChildren();

    const bar = el('div', 'cso-nav-bar-container');
    const mobToggle = el('button', 'cso-nav-mobile');
    mobToggle.type = 'button';
    mobToggle.id = 'cso-menu-toggle';
    mobToggle.setAttribute('aria-expanded', String(wasDrawerOpen));
    mobToggle.setAttribute('aria-controls', 'cso-nav-items');
    mobToggle.setAttribute('aria-label', 'Navigation Menu');
    const ham = el('span', '', '☰');
    ham.setAttribute('aria-hidden', 'true');
    mobToggle.append(ham, ' Menu');

    const navSavedBtn = el('button', 'pill cso-ctl-saved cso-nav-saved-pill acc-btn');
    navSavedBtn.id = 'cso-ctl-saved';
    navSavedBtn.type = 'button';
    navSavedBtn.setAttribute('data-cso-saved-trigger', '1');
    navSavedBtn.setAttribute('aria-label', 'Open My Saved Alerts drawer');
    const navSavedStar = el('span', '', '🔖');
    navSavedStar.setAttribute('aria-hidden', 'true');
    const navSavedTxt = el('span', '', 'Saved');
    const navInitLen = (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.getAll === 'function')
      ? window.CSOSavedAlerts.getAll().length
      : getSavedBookmarksList().length;
    const navSavedCount = el('span', 'cso-saved-badge', String(navInitLen));
    navSavedCount.id = 'cso-saved-count';
    navSavedCount.setAttribute('data-cso-saved-count', '1');
    const navUrgentDot = el('span', 'cso-sa-urgent-dot');
    navUrgentDot.setAttribute('data-cso-saved-urgent', '1');
    navUrgentDot.setAttribute('aria-hidden', 'true');
    navUrgentDot.hidden = !(window.CSOSavedAlerts && typeof window.CSOSavedAlerts.getUrgentCount === 'function' && window.CSOSavedAlerts.getUrgentCount() > 0);
    navSavedBtn.append(navSavedStar, ' ', navSavedTxt, ' ', navSavedCount, navUrgentDot);
    navSavedBtn.addEventListener('click', openSavedDrawer);

    const accCluster = el('div', 'cso-mobile-acc-cluster');
    const mobA11yWrap = el('span', 'cso-popup-anchor');
    const mobA11y = el('button', 'pill cso-ctl-a11y-mobile acc-btn', '♿ Options');
    mobA11y.type = 'button';
    mobA11y.id = 'cso-ctl-a11y-mobile';
    mobA11y.setAttribute('aria-label', 'Accessibility options');
    mobA11yWrap.appendChild(mobA11y);

    const mobZoom = el('span', 'pill cso-ctl-zoom-mobile acc-btn');
    const mFm = el('button', 'fz', 'A–');
    mFm.type = 'button';
    mFm.id = 'cso-ctl-fm-mobile';
    mFm.setAttribute('aria-label', 'Smaller text');
    const mFr = el('button', 'fz', 'A');
    mFr.type = 'button';
    mFr.id = 'cso-ctl-fr-mobile';
    mFr.setAttribute('aria-label', 'Normal text');
    const mFp = el('button', 'fz', 'A+');
    mFp.type = 'button';
    mFp.id = 'cso-ctl-fp-mobile';
    mFp.setAttribute('aria-label', 'Larger text');
    mobZoom.append(mFm, mFr, mFp);

    accCluster.append(mobA11yWrap, mobZoom);
    bar.append(mobToggle, navSavedBtn, accCluster);

    const navItems = el('div', 'cso-nav-items');
    navItems.id = 'cso-nav-items';
    if (wasDrawerOpen) navItems.classList.add('cso-mobile-open');

    if (lastLiveNavPayload) {
      renderPillarNodes(navItems, lastLiveNavPayload.items, lastLiveNavPayload.megaByParent);
    } else {
      renderPillarNodes(navItems, NAV, null);
    }
    if (prevOpenKey) restoreOpenPillar(navItems, prevOpenKey);

    navw.append(bar, navItems);
  }

  function hydrateHeaderNavFromApi() {
    if (typeof fetch !== 'function') return;
    fetch('/api/nav/config', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data || !Array.isArray(data.header) || !data.header.length) return;
        const navItems = document.getElementById('cso-nav-items');
        if (!navItems) return;
        const prevOpenKey = getOpenPillarKey(navItems);
        const user = getActiveUser();
        const visibleItems = data.header.filter(it => {
          const urlStr = String(it.url || '').toLowerCase();
          const labelStr = String(it.label_en || '').toLowerCase();
          const idStr = String(it.id || '').toLowerCase();
          if (urlStr.includes('student-hub') || /student\s*hub/.test(labelStr) || idStr.includes('student-hub') || urlStr === '/student/') {
            return false;
          }
          if (it.visibility_rule === 'logged_in') return Boolean(user);
          if (it.visibility_rule === 'logged_out') return !user;
          return true;
        });
        if (!visibleItems.length) return;
        visibleItems.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

        const megaByParent = new Map();
        const megaList = Array.isArray(data.mega_menu) ? data.mega_menu : [];
        megaList.forEach(mm => {
          if (!mm || !mm.parent_item_id) return;
          if (!megaByParent.has(mm.parent_item_id)) megaByParent.set(mm.parent_item_id, []);
          megaByParent.get(mm.parent_item_id).push(mm);
        });
        megaByParent.forEach(list => list.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)));

        lastLiveNavPayload = { items: visibleItems, megaByParent };
        const mobAuth = document.getElementById('cso-nav-mobile-auth');
        renderPillarNodes(navItems, visibleItems, megaByParent);
        if (prevOpenKey) restoreOpenPillar(navItems, prevOpenKey);
        if (mobAuth && !user) navItems.appendChild(mobAuth);
      })
      .catch(() => {});
  }

  function syncMobileNavAuth() {
    const existing = document.getElementById('cso-nav-mobile-auth');
    if (existing) existing.remove();
  }

  function ensureSharedDrawerBackdrop() {
    const navBar = document.getElementById('cso-main-navbar');
    const navw = document.getElementById('navw');
    let backdrop = document.getElementById('cso-mobile-drawer-backdrop');
    if (!backdrop) {
      backdrop = el('div', 'cso-mobile-drawer-backdrop');
      backdrop.id = 'cso-mobile-drawer-backdrop';
      backdrop.hidden = true;
    }
    if (navBar && backdrop.parentNode !== navBar) {
      if (navw && navw.parentNode === navBar) navBar.insertBefore(backdrop, navw);
      else navBar.prepend(backdrop);
    }
    return backdrop;
  }

  function setSharedDrawerOpen(open) {
    const items = document.getElementById('cso-nav-items');
    const toggle = document.querySelector('#navw .cso-nav-mobile');
    const backdrop = ensureSharedDrawerBackdrop();
    if (!items) return;
    const next = Boolean(open);
    items.classList.toggle('cso-mobile-open', next);
    if (toggle) toggle.setAttribute('aria-expanded', String(next));
    if (backdrop) backdrop.hidden = !next;
    document.documentElement.classList.toggle('cso-drawer-open', next);
    if (document.body) {
      document.body.classList.toggle('cso-drawer-open', next);
      document.body.classList.toggle('cso-modal-open', next);
    }
    if (!next) closeDropdowns();
  }

  function toggleSharedNavAccordion(parent, forceOpen) {
    if (!parent) return false;
    const isCurrentlyOpen = parent.classList.contains('cso-open') || parent.classList.contains('is-open');
    const open = typeof forceOpen === 'boolean' ? forceOpen : !isCurrentlyOpen;
    closeDropdowns(parent);
    parent.classList.toggle('cso-open', open);
    parent.classList.toggle('is-open', open);
    const arrow = parent.querySelector('.cso-nav-arrow');
    if (arrow) arrow.setAttribute('aria-expanded', String(open));
    const trigA = parent.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
    if (trigA) trigA.setAttribute('aria-expanded', String(open));
    if (open && parent.classList.contains('cso-ni-jobs')) {
      const cascade = parent.querySelector('.cso-jobs-cascade');
      if (cascade) {
        hydrateJobsFlyoutFromD1(cascade, cascade.querySelector('.cso-js1-list'), cascade.querySelector('.cso-jobs-stage2'));
      }
    } else if (open && parent.classList.contains('cso-ni-careers')) {
      const cascade = parent.querySelector('.cso-careers-cascade');
      if (cascade) {
        hydrateCareersFlyoutFromD1(cascade.querySelector('.cso-js1-list'));
      }
    } else if (open && parent.classList.contains('cso-ni-schemes')) {
      const cascade = parent.querySelector('.cso-schemes-cascade');
      if (cascade) {
        hydrateSchemesFlyoutFromD1(cascade, cascade.querySelector('.cso-js1-list'), cascade.querySelector('.cso-schemes-stage2'));
      }
    } else if (open && parent.classList.contains('cso-ni-study')) {
      const cascade = parent.querySelector('.cso-study-cascade');
      if (cascade) {
        hydrateStudyDropdownFromD1(cascade.querySelector('.cso-js1-list'));
      }
    } else if (open && parent.classList.contains('cso-ni-community')) {
      const cascade = parent.querySelector('.cso-community-cascade');
      if (cascade) {
        hydrateCommunityDropdownFromD1(cascade.querySelector('.cso-js1-list'));
      }
    } else if (!open) {
      const cascade = parent.querySelector('.cso-jobs-cascade, .cso-careers-cascade, .cso-schemes-cascade, .cso-study-cascade, .cso-community-cascade');
      if (cascade) cascade.classList.remove('is-stage2-open');
    }
    return open;
  }

  window.CSOSharedHeaderNav = {
    openDrawer: () => setSharedDrawerOpen(true),
    closeDrawer: () => setSharedDrawerOpen(false),
    toggleAccordion: (target, forceOpen) => {
      const node = typeof target === 'string' ? document.querySelector(target) : target;
      return toggleSharedNavAccordion(node ? node.closest('.ni') || node : null, forceOpen);
    }
  };

  if (!window.__csoNavDropdownWired) {
  window.__csoNavDropdownWired = true;
  document.addEventListener('click', e => {
    const authTrigger = e.target.closest('#cso-auth-trigger');
    if (authTrigger) {
      toggleAuthDropdown(e);
      return;
    }
    if (!e.target.closest('.cso-mobile-auth-wrapper')) {
      closeAuthDropdown();
    }
    if (e.target.closest('#cso-mobile-drawer-backdrop')) {
      e.preventDefault();
      e.stopPropagation();
      setSharedDrawerOpen(false);
      const toggle = document.querySelector('#navw .cso-nav-mobile');
      if (toggle) toggle.focus();
      return;
    }
    const mobile = e.target.closest('#navw .cso-nav-mobile');
    if (mobile) {
      e.preventDefault();
      e.stopPropagation();
      const items = document.getElementById('cso-nav-items');
      if (items) {
        setSharedDrawerOpen(!items.classList.contains('cso-mobile-open'));
      }
      return;
    }
    const arrow = e.target.closest('#navw .cso-nav-arrow');
    if (arrow) {
      e.preventDefault();
      e.stopPropagation();
      const parent = arrow.closest('.ni');
      if (parent) toggleSharedNavAccordion(parent);
      return;
    }
    const parentTriggerLink = e.target.closest('#navw .cso-nav-parent > a[aria-haspopup="true"]');
    if (parentTriggerLink) {
      const items = document.getElementById('cso-nav-items');
      const isMobileMode = window.innerWidth < 1100 || Boolean(items && items.classList.contains('cso-mobile-open'));
      if (isMobileMode) {
        e.preventDefault();
        e.stopPropagation();
        const parent = parentTriggerLink.closest('.ni');
        if (parent) toggleSharedNavAccordion(parent);
        return;
      }
    }
    const a11yMobile = e.target.closest('#cso-ctl-a11y-mobile');
    if (a11yMobile) {
      e.stopPropagation();
      showPopup(a11yMobile, [
        ['High contrast', () => { S.hc = +!S.hc; saveSettings(); applySettings(); }, !!S.hc],
        ['Underline links', () => { S.ul = +!S.ul; saveSettings(); applySettings(); }, !!S.ul],
        ['Reduce motion', () => { S.rm = +!S.rm; saveSettings(); applySettings(); }, !!S.rm],
        ['Reset', () => { S.hc = S.ul = S.rm = 0; S.zoom = 1; saveSettings(); applySettings(); }]
      ]);
      return;
    }
    if (e.target.closest('#cso-ctl-fm-mobile')) {
      S.zoom = Math.max(0.85, Math.min(1.3, +(S.zoom - 0.05).toFixed(2)));
      saveSettings();
      applySettings();
      return;
    }
    if (e.target.closest('#cso-ctl-fr-mobile')) {
      S.zoom = 1;
      saveSettings();
      applySettings();
      return;
    }
    if (e.target.closest('#cso-ctl-fp-mobile')) {
      S.zoom = Math.max(0.85, Math.min(1.3, +(S.zoom + 0.05).toFixed(2)));
      saveSettings();
      applySettings();
      return;
    }
    const footerLang = e.target.closest('.cso-footer-lang-pill');
    if (footerLang) {
      const l = footerLang.getAttribute('data-cso-lang');
      if (l && LN[l]) {
        S.lang = l;
        saveSettings();
        applySettings();
        renderControls();
        renderNav();
        try { window.dispatchEvent(new CustomEvent('cso:lang-change', { detail: { lang: l } })); } catch (_) {}
      }
      return;
    }
    if (e.target.closest('#navw a')) {
      setSharedDrawerOpen(false);
    } else if (!e.target.closest('#navw')) {
      closeDropdowns();
      const items = document.getElementById('cso-nav-items');
      if (items && items.classList.contains('cso-mobile-open')) {
        setSharedDrawerOpen(false);
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const savedBackdrop = document.getElementById('cso-saved-drawer-backdrop');
      if (savedBackdrop && !savedBackdrop.hidden) {
        savedBackdrop.hidden = true;
      }
      closeAuthDropdown();
      closeDropdowns();
      const items = document.getElementById('cso-nav-items');
      if (items && items.classList.contains('cso-mobile-open')) {
        setSharedDrawerOpen(false);
        const toggle = document.querySelector('#navw .cso-nav-mobile');
        if (toggle) toggle.focus();
      }
    }
  });

  document.addEventListener('focusout', e => {
    const items = document.getElementById('cso-nav-items');
    if (window.innerWidth < 1100 || (items && items.classList.contains('cso-mobile-open'))) {
      return;
    }
    const navw = document.getElementById('navw');
    if (!navw) return;
    const openItem = navw.querySelector('.ni.cso-open');
    if (openItem && e.relatedTarget && !openItem.contains(e.relatedTarget)) {
      closeDropdowns();
    }
  });

  window.addEventListener('scroll', () => {
    const items = document.getElementById('cso-nav-items');
    if (window.innerWidth >= 1100 && !(items && items.classList.contains('cso-mobile-open'))) {
      closeDropdowns();
      closeAuthDropdown();
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    syncMobileControlsVisibility();
    if (window.innerWidth >= 1100) {
      closeDropdowns();
      const items = document.getElementById('cso-nav-items');
      if (items && items.classList.contains('cso-mobile-open')) {
        setSharedDrawerOpen(false);
      }
    }
  });
  }

  window.addEventListener('cso:bookmarks-updated', () => {
    updateSavedCountBadge();
    const savedBackdrop = document.getElementById('cso-saved-drawer-backdrop');
    if (savedBackdrop && !savedBackdrop.hidden) {
      renderSavedDrawerContents();
    }
  });

  function ensureAdminLink() {
    const adminLink = document.querySelector('.top .adm, header .adm, .cso-header-top .adm');
    if (adminLink) {
      adminLink.setAttribute('href', '/admin/');
      adminLink.setAttribute('role', 'button');
      adminLink.setAttribute('aria-label', 'Admin');
      adminLink.setAttribute('title', 'Admin');
    }
  }

  async function syncAuthSession() {
    if (!window.CSOAuth || typeof window.CSOAuth.getCurrentUser !== 'function') return;
    try {
      const res = await window.CSOAuth.getCurrentUser();
      if (res && res.ok === true && res.authenticated === true && res.user && typeof res.user === 'object') {
        try {
          localStorage.setItem('cso_candidate_session_v1', JSON.stringify(res.user));
        } catch (e) {}
        renderAuth();
      } else if (res && (res.status === 401 || res.authenticated === false) && res.status !== 0) {
        let hadLocal = false;
        try {
          hadLocal = Boolean(localStorage.getItem('cso_candidate_session_v1'));
          localStorage.removeItem('cso_candidate_session_v1');
        } catch (e) {}
        if (hadLocal) renderAuth();
      }
    } catch (e) {}
  }

  function syncBrandLogoMarks() {
    const imgs = document.querySelectorAll('.cso-brand-logo, .cso-footer-logo, #cso-brand-logo, img.cso-brand-emblem');
    imgs.forEach(node => {
      const isFooterLogo = node.classList.contains('cso-footer-logo') || Boolean(node.closest('.cso-footer-brand-header'));
      if (node.tagName === 'IMG') {
        node.src = '/assets/img/cso-logo-96.webp?v=20261126v330';
        if (isFooterLogo) {
          node.alt = '';
          node.setAttribute('aria-hidden', 'true');
        } else {
          node.alt = 'Common Sense Odisha Logo';
        }
        node.width = 54;
        node.height = 38;
        node.classList.add('cso-brand-emblem');
        if (!node.dataset.emblemBound) {
          node.dataset.emblemBound = '1';
          node.addEventListener('error', () => {
            if (node.dataset.fallbackApplied === '1') return;
            node.dataset.fallbackApplied = '1';
            node.src = '/assets/img/cso-logo-96.png?v=20261126v330';
          });
        }
      } else {
        const img = document.createElement('img');
        img.src = '/assets/img/cso-logo-96.webp?v=20261126v330';
        img.alt = isFooterLogo ? '' : 'Common Sense Odisha Logo';
        if (isFooterLogo) img.setAttribute('aria-hidden', 'true');
        img.width = 54;
        img.height = 38;
        img.className = 'cso-brand-emblem';
        node.replaceChildren(img);
      }
    });
    dedupeFooterBrand();
  }

  function dedupeFooterBrand() {
    document.querySelectorAll('.cso-footer-zone1').forEach(z1 => {
      const headers = z1.querySelectorAll('.cso-footer-brand-header');
      headers.forEach((h, idx) => {
        if (idx > 0) h.remove();
      });
      const titles = z1.querySelectorAll('.cso-footer-title');
      titles.forEach((t, idx) => {
        if (idx > 0) t.remove();
      });
    });
  }

  /* v151 Auto-Shell Hydration Fallback: builds the canonical homepage utility bar, fluent pill navbar and
     3-zone footer for any page that carries <header data-cso-auto-shell> / <footer data-cso-auto-footer>
     or that lacks #header-top / #cso-main-navbar. Safe DOM APIs only. */
  function svgEl(tag, attrs) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    return n;
  }
  function buildUtilityBar(header) {
    header.id = 'header-top';
    header.className = 'top site-header__top';
    header.setAttribute('role', 'banner');
    header.removeAttribute('data-cso-auto-shell');
    header.setAttribute('data-cso-shell-hydrated', '1');
    const brand = el('a', 'cso-brand-link');
    brand.href = '/';
    brand.setAttribute('aria-label', 'Common Sense Odisha Home');
    const logo = document.createElement('img');
    logo.src = '/assets/img/cso-logo-96.webp?v=20261126v330';
    logo.alt = 'Common Sense Odisha Logo';
    logo.className = 'cso-brand-logo cso-brand-emblem';
    logo.width = 54; logo.height = 38;
    brand.appendChild(logo);
    const adm = el('a', 'adm cso-adm-icon-only cso-adm-stealth');
    adm.href = '/admin/';
    adm.setAttribute('role', 'button');
    adm.setAttribute('aria-label', 'Admin');
    adm.title = 'Admin';
    const ico = svgEl('svg', { 'class': 'adm-ico', viewBox: '0 0 24 24', width: '15', height: '15', 'aria-hidden': 'true', focusable: 'false' });
    ico.appendChild(svgEl('path', { fill: 'currentColor', d: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z' }));
    adm.appendChild(ico);
    const ctl = el('span', 'cso-contents'); ctl.id = 'ctl';
    const sp = el('span', 'sp');
    const acct = el('div', 'acct');
    const icon = el('span', 'cso-desktop-auth-icon', '👤');
    icon.setAttribute('aria-hidden', 'true');
    const auth = el('span', 'cso-contents'); auth.id = 'auth';
    acct.append(adm, icon, auth);
    header.replaceChildren(brand, ctl, sp, acct);
  }
  function buildNavShell() {
    const nav = el('nav', 'main-nav site-header__nav');
    nav.id = 'cso-main-navbar';
    nav.setAttribute('aria-label', 'Main Navigation');
    const w = el('div', 'w'); w.id = 'navw';
    nav.appendChild(w);
    return nav;
  }
  function ensureAutoShell() {
    const body = document.body;
    if (!body) return;
    let header = document.getElementById('header-top') || document.querySelector('header[data-cso-auto-shell]');
    if (!header) {
      const first = body.querySelector(':scope > header:not(.cso-dir-topbar)');
      header = (first && !first.children.length) ? first : null;
      if (!header) {
        header = document.createElement('header');
        const mount = document.getElementById('csoPublicAnnouncementMount');
        if (mount && mount.parentNode === body) mount.after(header); else body.prepend(header);
      }
    }
    if (header.id !== 'header-top' || header.hasAttribute('data-cso-auto-shell') || !header.querySelector('#ctl')) buildUtilityBar(header);
    if (!document.getElementById('cso-main-navbar')) header.after(buildNavShell());
  }
  const FOOTER_COLS = [
    ['Explore', [['Jobs', '/jobs/'], ['Careers', '/careers/'], ['Schemes & Benefits', '/schemes/'], ['Study Library', '/study-library/'], ['Community', '/community/'], ['About', '/about/']]],
    ['Quick Candidate Hubs', [['Results & Cut-Offs', '/results/'], ['Admissions & Counselling', '/admissions/'], ['Exam Updates & Admit Cards', '/exams/'], ['Live CBT Mock Tests', '/mock-tests/'], ['Candidate Tools', '/tools/']]],
    ['Support & Legal', [['Help & FAQs', '/support/#faqs'], ['Report an Error', '/support/#report-error'], ['Suggest Resource', '/support/#suggest-resource'], ['Privacy Policy', '/privacy-policy/'], ['Terms of Use', '/terms-of-use/'], ['Disclaimer', '/disclaimer/'], ['Copyright Policy', '/copyright-policy/']]]
  ];
  const FOOTER_SOCIAL = [
    ['Instagram', 'https://www.instagram.com/csodisha.official/'],
    ['Facebook', 'https://www.facebook.com/profile.php?id=61596187936770'],
    ['X', 'https://x.com/csodisha'],
    ['Telegram', 'https://t.me/csodisha'],
    ['WhatsApp', 'https://whatsapp.com/channel/0029Vb9aQYZ1Hspy0nfzRe0w'],
    ['YouTube', 'https://www.youtube.com/@CSOdisha']
  ];
  function buildFooter(footer) {
    footer.removeAttribute('data-cso-auto-footer');
    footer.setAttribute('data-cso-shell-hydrated', '1');
    const grid = el('div', 'w cso-footer-grid');
    const z1 = el('div', 'cso-footer-zone1');
    const bh = el('div', 'cso-footer-brand-header');
    const logo = document.createElement('img');
    logo.src = '/assets/img/cso-logo-96.webp?v=20261126v330';
    logo.alt = '';
    logo.setAttribute('aria-hidden', 'true');
    logo.className = 'cso-footer-logo cso-brand-emblem';
    logo.width = 54; logo.height = 38;
    bh.append(logo, el('div', 'cso-footer-title', 'Common Sense Odisha'));
    const contact = el('p', 'cso-footer-contact', 'Contact: ');
    const mail = el('a', 'cso-footer-contact-link', 'contact@csodisha.com');
    mail.href = 'mailto:contact@csodisha.com';
    contact.appendChild(mail);
    const social = el('div', 'cso-footer-social');
    social.setAttribute('role', 'navigation');
    social.setAttribute('aria-label', 'Official Social Channels');
    FOOTER_SOCIAL.forEach(([label, href]) => {
      const a = el('a', 'cso-footer-social-link');
      a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', label); a.title = label;
      a.appendChild(el('span', '', label));
      social.appendChild(a);
    });
    z1.append(bh,
      el('p', 'cso-footer-desc', 'Independent, open-access public resource platform.'),
      el('p', 'cso-footer-copy', '© 2026 Common Sense Odisha. All rights reserved.'),
      contact, social);
    const z2 = el('div', 'cso-footer-zone2');
    FOOTER_COLS.forEach(([title, links]) => {
      const col = el('div', 'cso-footer-col');
      col.appendChild(el('h4', '', title));
      links.forEach(([label, href]) => { const a = el('a', '', label); a.href = href; col.appendChild(a); });
      z2.appendChild(col);
    });
    const z3 = el('div', 'cso-footer-zone3');
    const map = document.createElement('img');
    map.className = 'cso-footer-odisha-map';
    map.src = '/assets/odisha-footer-map.svg';
    map.alt = 'Odisha vector outline';
    map.loading = 'lazy';
    const pills = el('div', 'cso-footer-lang-pills');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(([code, label], i) => {
      if (i) { const sep = el('span', 'cso-footer-lang-sep', '·'); sep.setAttribute('aria-hidden', 'true'); pills.appendChild(sep); }
      const b = el('button', 'cso-footer-lang-pill', label);
      b.type = 'button'; b.setAttribute('data-cso-lang', code);
      pills.appendChild(b);
    });
    z3.append(map, el('div', 'cso-footer-motto', 'Be Self-Reliant · Build a Better Tomorrow'), pills);
    grid.append(z1, z2, z3);
    footer.replaceChildren(grid);
  }
  function ensureAutoFooter() {
    let footer = document.querySelector('footer[data-cso-auto-footer]');
    if (!footer && !document.querySelector('.cso-footer-zone1') && document.body) {
      footer = document.querySelector('body > footer') || document.createElement('footer');
      if (!footer.parentNode) document.body.appendChild(footer);
    }
    if (footer) buildFooter(footer);
  }

  /* v312: Live Sponsored Ad Slot Hydration + Real Impression & Click Telemetry (/api/public/ads) */
  function hydratePublicAdSlots() {
    const p = String(window.location.pathname || '/').toLowerCase();
    if (/^\/(?:admin|login|signup|reset-password|student-dashboard)/.test(p)) return;
    if (typeof fetch !== 'function') return;

    const slotCandidates = ['site_banner'];
    if (p === '/' || p === '/index.html') slotCandidates.unshift('home_mid_banner');
    else if (p.startsWith('/jobs')) slotCandidates.unshift('jobs_top_sponsor');
    else if (p.startsWith('/careers')) slotCandidates.unshift('careers_top_sponsor');
    else if (p.startsWith('/schemes')) slotCandidates.unshift('schemes_top_sponsor');
    else if (p.startsWith('/study')) slotCandidates.unshift('study_top_sponsor');
    else if (p.startsWith('/mock-tests')) slotCandidates.unshift('mock_tests_banner');
    else if (p.startsWith('/community')) slotCandidates.unshift('community_top_sponsor');

    const explicitMounts = Array.from(document.querySelectorAll('[data-cso-ad-slot]'));
    explicitMounts.forEach(m => {
      const k = (m.getAttribute('data-cso-ad-slot') || '').trim();
      if (k && !slotCandidates.includes(k)) slotCandidates.push(k);
    });

    function trackAdEvent(id, event) {
      const body = JSON.stringify({ id, event });
      try {
        if (event === 'click' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/public/ads/track', new Blob([body], { type: 'application/json' }));
          return;
        }
      } catch (_) {}
      fetch('/api/public/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: event === 'click'
      }).catch(() => {});
    }

    fetch('/api/public/ads?slots=' + encodeURIComponent(slotCandidates.join(',')), { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const items = (data && Array.isArray(data.items)) ? data.items : [];
        if (!items.length) return;
        const slot = items[0];
        if (!slot || !slot.id || !slot.target_url) return;

        const explicit = document.querySelector(`[data-cso-ad-slot="${slot.slot_key}"]`);
        let host = explicit;
        if (!host) {
          const mainEl = document.getElementById('main-content') || document.querySelector('main');
          if (!mainEl) return;
          host = el('aside', 'cso-ad-slot-wrap');
          host.setAttribute('aria-label', slot.badge_text || 'Sponsored');
          mainEl.appendChild(host);
        } else {
          host.replaceChildren();
        }

        const card = el('a', 'cso-ad-slot-card');
        card.href = slot.target_url;
        card.target = '_blank';
        card.rel = 'sponsored noopener noreferrer';

        if (slot.image_url && (slot.image_url.startsWith('/') || /^https?:\/\//i.test(slot.image_url))) {
          const img = el('img', 'cso-ad-slot-img');
          img.src = slot.image_url;
          img.alt = slot.title || 'Sponsored partner';
          img.width = 160;
          img.height = 90;
          img.loading = 'lazy';
          img.decoding = 'async';
          card.appendChild(img);
        }

        const copy = el('div', 'cso-ad-slot-copy');
        copy.appendChild(el('span', 'cso-ad-slot-badge', slot.badge_text || 'Sponsored'));
        copy.appendChild(el('strong', 'cso-ad-slot-title', slot.title || 'Partner Notice'));
        copy.appendChild(el('span', 'cso-ad-slot-cta', 'Visit Partner ↗'));
        card.appendChild(copy);

        card.addEventListener('click', () => trackAdEvent(slot.id, 'click'));
        host.appendChild(card);
        trackAdEvent(slot.id, 'impression');
      })
      .catch(() => {});
  }

  function init() {
    [
      ['ensureAutoShell', ensureAutoShell],
      ['ensureAutoFooter', ensureAutoFooter],
      ['ensureGlobalEnhancements', ensureGlobalEnhancements],
      ['applySettings', applySettings],
      ['syncBrandLogoMarks', syncBrandLogoMarks],
      ['renderControls', renderControls],
      ['renderAuth', renderAuth],
      ['renderNav', renderNav],
      ['hydrateHeaderNavFromApi', hydrateHeaderNavFromApi],
      ['ensureAdminLink', ensureAdminLink],
      ['updateSavedCountBadge', updateSavedCountBadge],
      ['syncAuthSession', syncAuthSession],
      ['hydratePublicAdSlots', hydratePublicAdSlots]
    ].forEach(([name, fn]) => {
      try { fn(); } catch (err) { console.error('[CSO SharedHeader] ' + name + ' failed:', err); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* v26: reveal the stealth Admin Portal link only when a staff session flag exists (validated once against the server). */
(function csoRevealAdminLink(){
  function apply(){
    var links=document.querySelectorAll('.top .adm.cso-adm-stealth');
    if(!links.length)return;
    var flag=false;
    try{flag=localStorage.getItem('cso_admin_active')==='1'}catch(_){}
    links.forEach(function(a){a.classList.toggle('is-admin-visible',flag)});
    if(!flag||window.__csoAdminChecked)return;
    window.__csoAdminChecked=true;
    fetch('/api/admin/session',{credentials:'same-origin'}).then(function(r){
      if(r.status===401||r.status===403){try{localStorage.removeItem('cso_admin_active')}catch(_){}links.forEach(function(a){a.classList.remove('is-admin-visible')})}
    }).catch(function(){});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('storage',function(e){if(e.key==='cso_admin_active')apply()});
})();
