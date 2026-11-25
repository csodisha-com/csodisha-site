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
    const anchor = target.closest('.cso-popup-anchor') || target.parentElement || document.body;
    const m = el('div', 'pp');
    items.forEach(([label, fn, active]) => {
      const b = el('button', '', (active ? '✓ ' : '') + label);
      b.type = 'button';
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        fn();
        m.remove();
      });
      m.appendChild(b);
    });
    anchor.appendChild(m);
    setTimeout(() => {
      window.addEventListener('click', () => m.remove(), { once: true });
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
    closeBtn.addEventListener('click', () => {
      backdrop.hidden = true;
    });
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
      if (e.target === backdrop) backdrop.hidden = true;
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
    const backdrop = ensureSavedDrawer();
    renderSavedDrawerContents();
    backdrop.hidden = false;
  }

  function renderControls() {
    const ctl = document.getElementById('ctl');
    if (!ctl) return;
    ctl.replaceChildren();

    const savedBtn = el('button', 'pill cso-ctl-saved');
    savedBtn.id = 'cso-ctl-saved';
    savedBtn.type = 'button';
    savedBtn.setAttribute('aria-label', 'Open saved bookmarks');
    const starSpan = el('span', '', '★');
    starSpan.setAttribute('aria-hidden', 'true');
    const savedTxt = el('span', '', 'Saved');
    const countBadge = el('span', 'cso-saved-badge', String(getSavedBookmarksList().length));
    countBadge.id = 'cso-saved-count';
    savedBtn.append(starSpan, ' ', savedTxt, ' ', countBadge);
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

    const searchBtn = el('button', 'pill cso-ctl-search');
    searchBtn.type = 'button';
    searchBtn.id = 'cso-ctl-global-search';
    searchBtn.setAttribute('aria-label', 'Open global D1 search (Ctrl+K)');
    searchBtn.appendChild(el('span', 'cso-ctl-search-icon', '🔍'));
    searchBtn.appendChild(el('span', 'cso-ctl-search-label', 'Search'));
    searchBtn.appendChild(el('kbd', 'cso-ctl-search-kbd', 'Ctrl+K'));
    searchBtn.addEventListener('click', () => {
      if (window.CSOGlobal && typeof window.CSOGlobal.openSearch === 'function') {
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
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {}
        try {
          localStorage.removeItem('cso_candidate_session_v1');
          localStorage.removeItem('cso_auth_token');
        } catch (e) {}
        window.location.reload();
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
    if (p.startsWith('/careers') || p.startsWith('/career-guidance')) return 'careers';
    if (p.startsWith('/jobs-careers') || p.startsWith('/jobs') || p.startsWith('/job-opportunity-finder')) return 'jobs';
    if (p.startsWith('/schemes-benefits') || p.startsWith('/schemes') || p.startsWith('/scholarship-guidance') || p.startsWith('/scheme-opportunity-finder')) return 'schemes-benefits';
    if (p.startsWith('/study-library') || p.startsWith('/study') || p.startsWith('/resources') || p.startsWith('/current-affairs') || p.startsWith('/mock-tests') || p.startsWith('/education-explorer') || p.startsWith('/study-path-finder')) return 'study-library';
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

  const JOBS_FLYOUT_CACHE_KEY = 'cso_jobs_flyout_v277';
  let jobsFlyoutData = null;
  let jobsFlyoutFetchStarted = false;

  const JOBS_DEFAULT_SECTORS = [
    { id: 'jtax_l1_government', slug: 'government', icon: '🏛️', title_en: 'Government', title_or: 'ସରକାରୀ ଚାକିରି' },
    { id: 'jtax_l1_private', slug: 'private', icon: '💼', title_en: 'Private', title_or: 'ବେସରକାରୀ ଚାକିରି' },
    { id: 'jtax_l1_psu', slug: 'psu', icon: '🏭', title_en: 'PSUs', title_or: 'ରାଷ୍ଟ୍ରାୟତ୍ତ ଉଦ୍ୟୋଗ (PSU)' },
    { id: 'jtax_l1_ngo', slug: 'ngo', icon: '🤝', title_en: 'NGOs / Non-Profit', title_or: 'ଏନଜିଓ / ଅଣ-ଲାଭଜନକ' },
    { id: 'jtax_l1_foreign', slug: 'foreign', icon: '✈️', title_en: 'Foreign Jobs', title_or: 'ବିଦେଶୀ ଚାକିରି' }
  ];

  const JOBS_STAGE2_REGIONS = [
    { key: 'central', labelEn: 'Central', labelOr: 'କେନ୍ଦ୍ର' },
    { key: 'odisha', labelEn: 'Odisha', labelOr: 'ଓଡ଼ିଶା' },
    { key: 'all-india', labelEn: 'All Over India', labelOr: 'ସମଗ୍ର ଭାରତ' }
  ];

  function readJobsFlyoutCache() {
    if (jobsFlyoutData) return jobsFlyoutData;
    try {
      const raw = sessionStorage.getItem(JOBS_FLYOUT_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && (Date.now() - parsed.ts < 120000) && Array.isArray(parsed.sectors) && parsed.sectors.length) {
          jobsFlyoutData = parsed;
          return parsed;
        }
      }
    } catch (_e) {}
    return null;
  }

  function getActiveJobsSectors() {
    const cached = readJobsFlyoutCache();
    if (cached && Array.isArray(cached.sectors) && cached.sectors.length) return cached.sectors;
    return JOBS_DEFAULT_SECTORS;
  }

  function buildStage2RegionList(sector, isOr) {
    const secSlug = encodeURIComponent((sector && sector.slug) || 'government');
    const ul = el('ul', 'cso-js2-list');
    JOBS_STAGE2_REGIONS.forEach(reg => {
      const li = el('li', 'cso-js2-item');
      const a = el('a', 'cso-js2-link', isOr ? reg.labelOr : reg.labelEn);
      a.href = '/jobs/?sector=' + secSlug + '&region=' + reg.key;
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  function renderStage2Contents(stage2El, sector, isOr) {
    stage2El.replaceChildren();
    if (!sector) return;
    stage2El.appendChild(buildStage2RegionList(sector, isOr));
  }

  function buildMobileAccordionSub(sector, isOr) {
    const box = el('div', 'cso-js1-mob-sub');
    box.appendChild(buildStage2RegionList(sector, isOr));
    return box;
  }

  function populateStage1List(cascade, stage1List, stage2El) {
    const isOr = S.lang === 'or';
    const sectors = getActiveJobsSectors();
    stage1List.replaceChildren();

    function activateSector(sec, itemEl, openStage2) {
      stage1List.querySelectorAll('.cso-js1-item.is-active').forEach(elItem => elItem.classList.remove('is-active'));
      if (itemEl) itemEl.classList.add('is-active');
      const isDirectOnly = String((sec && sec.slug) || '').toLowerCase() === 'foreign';
      if (isDirectOnly) {
        cascade.classList.remove('is-stage2-open');
        stage2El.replaceChildren();
        return;
      }
      renderStage2Contents(stage2El, sec, isOr);
      if (openStage2 && window.innerWidth >= 1100) {
        cascade.classList.add('is-stage2-open');
        const stage1Box = cascade.querySelector('.cso-jobs-stage1');
        if (stage1Box) {
          const rect = stage1Box.getBoundingClientRect();
          stage2El.classList.toggle('is-flip-left', rect.right + 224 > window.innerWidth);
        }
      }
    }

    sectors.forEach(sec => {
      const slugLower = String(sec.slug || '').toLowerCase();
      const hasStage2 = slugLower !== 'foreign';
      const li = el('li', 'cso-js1-item' + (hasStage2 ? '' : ' is-direct-only'));
      li.dataset.jsSector = sec.slug || '';

      const row = el('div', 'cso-js1-row');
      const a = el('a', 'cso-js1-link');
      a.href = '/jobs/?sector=' + encodeURIComponent(sec.slug || 'government');

      const left = el('span', 'cso-js1-left');
      const ic = el('span', 'cso-js1-icon', sec.icon || '💼');
      ic.setAttribute('aria-hidden', 'true');
      left.append(ic, el('span', 'cso-js1-title', isOr ? (sec.title_or || sec.title_en) : sec.title_en));
      a.appendChild(left);

      if (hasStage2) {
        const arrow = el('span', 'cso-js1-arrow', '›');
        arrow.setAttribute('aria-hidden', 'true');
        a.appendChild(arrow);
      }

      row.appendChild(a);
      if (hasStage2) {
        const mobExp = el('button', 'cso-js1-mob-exp', '▾');
        mobExp.type = 'button';
        mobExp.setAttribute('aria-expanded', 'false');
        mobExp.setAttribute('aria-label', 'Expand ' + (sec.title_en || 'sector') + ' regions');
        mobExp.addEventListener('click', ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const isOpen = li.classList.toggle('is-mob-open');
          mobExp.setAttribute('aria-expanded', String(isOpen));
        });
        row.appendChild(mobExp);
        li.append(row, buildMobileAccordionSub(sec, isOr));
      } else {
        li.appendChild(row);
      }

      li.addEventListener('mouseenter', () => {
        if (window.innerWidth < 1100) return;
        activateSector(sec, li, hasStage2);
      });
      a.addEventListener('focus', () => {
        if (window.innerWidth < 1100) return;
        activateSector(sec, li, hasStage2);
      });
      a.addEventListener('keydown', ev => {
        if (ev.key === 'ArrowRight' && hasStage2 && window.innerWidth >= 1100) {
          ev.preventDefault();
          activateSector(sec, li, true);
          const firstS2 = stage2El.querySelector('a');
          if (firstS2) firstS2.focus();
        } else if (ev.key === 'ArrowDown') {
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

  function hydrateJobsFlyoutFromD1(cascade, stage1List, stage2El) {
    const cached = readJobsFlyoutCache();
    if (cached) {
      populateStage1List(cascade, stage1List, stage2El);
      return;
    }
    if (jobsFlyoutFetchStarted || typeof fetch !== 'function') return;
    jobsFlyoutFetchStarted = true;
    fetch('/api/public/jobs/bootstrap', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || !d.ok) return;
        let sectors = [];
        if (Array.isArray(d.nav_sectors) && d.nav_sectors.length) {
          sectors = d.nav_sectors.map(l1 => ({
            id: l1.id, slug: l1.slug, title_en: l1.title_en, title_or: l1.title_or || l1.title_en, icon: l1.icon || '💼'
          }));
        } else if (Array.isArray(d.tree) && d.tree.length) {
          sectors = d.tree.map(l1 => ({
            id: l1.id, slug: l1.slug, title_en: l1.title_en, title_or: l1.title_or || l1.title_en, icon: l1.icon || '💼'
          }));
        } else {
          sectors = JOBS_DEFAULT_SECTORS;
        }
        jobsFlyoutData = { ts: Date.now(), sectors };
        try { sessionStorage.setItem(JOBS_FLYOUT_CACHE_KEY, JSON.stringify(jobsFlyoutData)); } catch (_e) {}
        document.querySelectorAll('.cso-jobs-cascade').forEach(cEl => {
          const s1 = cEl.querySelector('.cso-js1-list');
          const s2 = cEl.querySelector('.cso-jobs-stage2');
          if (s1 && s2) populateStage1List(cEl, s1, s2);
        });
      })
      .catch(() => {});
  }

  function buildJobsCascadingMenu() {
    const isOr = S.lang === 'or';
    const cascade = el('div', 'cso-jobs-cascade');
    cascade.id = 'cso-jobs-cascade';

    // Stage 1 — Minimal Vertical Sector List (240px)
    const stage1 = el('div', 'cso-jobs-stage1');
    stage1.id = 'cso-jobs-stage1';
    stage1.setAttribute('role', 'region');
    stage1.setAttribute('aria-label', isOr ? 'ଚାକିରି କ୍ଷେତ୍ର ମେନୁ' : 'Jobs sectors menu');

    const list = el('ul', 'cso-js1-list');
    stage1.appendChild(list);

    // Stage 2 — Minimal Right-Side Slide Flyout (210px, Central / Odisha / All Over India)
    const stage2 = el('div', 'cso-jobs-stage2');
    stage2.id = 'cso-jobs-stage2';
    stage2.setAttribute('role', 'region');
    stage2.setAttribute('aria-label', isOr ? 'ଭୌଗୋଳିକ ପରିସର' : 'Geographic scopes');
    stage2.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const activeLink = list.querySelector('.cso-js1-item.is-active .cso-js1-link') || list.querySelector('.cso-js1-link');
        if (activeLink) activeLink.focus();
      }
    });

    populateStage1List(cascade, list, stage2);
    cascade.append(stage1, stage2);
    return cascade;
  }

  function wireJobsCascadingInteractions(ni, triggerA, chevBtn, cascade) {
    let hoverCloseTimer = null;
    const stage1List = cascade.querySelector('.cso-js1-list');
    const stage2El = cascade.querySelector('.cso-jobs-stage2');

    function setOpen(open) {
      if (open) {
        closeDropdowns(ni);
        hydrateJobsFlyoutFromD1(cascade, stage1List, stage2El);
      } else {
        cascade.classList.remove('is-stage2-open');
        stage1List.querySelectorAll('.cso-js1-item.is-active').forEach(it => it.classList.remove('is-active'));
      }
      ni.classList.toggle('cso-open', open);
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

  const CAREERS_FLYOUT_CACHE_KEY = 'cso_careers_flyout_v278';
  let careersFlyoutData = null;
  let careersFlyoutFetchStarted = false;

  const CAREERS_DEFAULT_TRACKS = [
    { id: 'ctax-track-civil-services', slug: 'civil-services', icon: '🏛️', label_en: 'Civil Services', label_or: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍' },
    { id: 'ctax-track-engineering-it', slug: 'engineering-it', icon: '💻', label_en: 'Engineering / IT', label_or: 'ଇଞ୍ଜିନିୟରିଂ / ଆଇଟି' },
    { id: 'ctax-track-banking-finance', slug: 'banking-finance', icon: '🏦', label_en: 'Banking & Finance', label_or: 'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି' },
    { id: 'ctax-track-healthcare', slug: 'healthcare', icon: '🩺', label_en: 'Healthcare', label_or: 'ସ୍ୱାସ୍ଥ୍ୟ ସେବା' },
    { id: 'ctax-track-agriculture', slug: 'agriculture', icon: '🌾', label_en: 'Agriculture', label_or: 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ' },
    { id: 'ctax-track-pathways', slug: 'pathways', icon: '🧭', label_en: 'Career Stage & Pathways', label_or: 'କ୍ୟାରିୟର୍ ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗ' }
  ];

  function readCareersFlyoutCache() {
    if (careersFlyoutData) return careersFlyoutData;
    try {
      const raw = sessionStorage.getItem(CAREERS_FLYOUT_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && (Date.now() - parsed.ts < 120000) && Array.isArray(parsed.tracks) && parsed.tracks.length) {
          careersFlyoutData = parsed;
          return parsed;
        }
      }
    } catch (_e) {}
    return null;
  }

  function getActiveCareersTracks() {
    const cached = readCareersFlyoutCache();
    if (cached && Array.isArray(cached.tracks) && cached.tracks.length) return cached.tracks;
    return CAREERS_DEFAULT_TRACKS;
  }

  function populateCareersStage1List(stage1List) {
    if (!stage1List) return;
    const isOr = S.lang === 'or';
    const tracks = getActiveCareersTracks();
    stage1List.replaceChildren();

    const items = tracks.map(tr => ({
      slug: tr.slug || 'civil-services',
      icon: tr.icon || '🧭',
      title: isOr ? (tr.label_or || tr.label_en) : tr.label_en,
      href: '/careers/?track=' + encodeURIComponent(tr.slug || 'civil-services')
    }));
    items.push({
      slug: 'all',
      icon: '📋',
      title: isOr ? 'ସମସ୍ତ କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍' : 'All Career Roadmaps',
      href: '/careers/'
    });

    items.forEach(item => {
      const li = el('li', 'cso-js1-item is-direct-only');
      li.dataset.crTrack = item.slug;

      const row = el('div', 'cso-js1-row');
      const a = el('a', 'cso-js1-link');
      a.href = item.href;

      const left = el('span', 'cso-js1-left');
      const ic = el('span', 'cso-js1-icon', item.icon);
      ic.setAttribute('aria-hidden', 'true');
      left.append(ic, el('span', 'cso-js1-title', item.title));
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

  function hydrateCareersFlyoutFromD1(stage1List) {
    const cached = readCareersFlyoutCache();
    if (cached) {
      populateCareersStage1List(stage1List);
      return;
    }
    if (careersFlyoutFetchStarted || typeof fetch !== 'function') return;
    careersFlyoutFetchStarted = true;
    fetch('/api/public/careers/bootstrap', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || !d.ok) return;
        let tracks = [];
        if (Array.isArray(d.nav_tracks) && d.nav_tracks.length) {
          tracks = d.nav_tracks;
        } else if (d.taxonomy && Array.isArray(d.taxonomy.tracks) && d.taxonomy.tracks.length) {
          tracks = d.taxonomy.tracks.map(tr => ({
            id: tr.id,
            slug: tr.slug,
            label_en: tr.label_en,
            label_or: tr.label_or || tr.label_en,
            icon: tr.icon || '🧭'
          }));
        } else {
          tracks = CAREERS_DEFAULT_TRACKS;
        }
        careersFlyoutData = { ts: Date.now(), tracks };
        try { sessionStorage.setItem(CAREERS_FLYOUT_CACHE_KEY, JSON.stringify(careersFlyoutData)); } catch (_e) {}
        document.querySelectorAll('.cso-careers-cascade .cso-js1-list').forEach(s1 => {
          populateCareersStage1List(s1);
        });
      })
      .catch(() => {});
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
        hydrateCareersFlyoutFromD1(stage1List);
      } else {
        stage1List.querySelectorAll('.cso-js1-item.is-active').forEach(it => it.classList.remove('is-active'));
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

  // ---- Minimal 3-Item Schemes & Benefits Dropdown (v284 — single vertical dropdown, no Stage 2) ----
  const SCHEMES_DROPDOWN_ITEMS = [
    { slug: 'odisha', icon: '🏛️', title_en: 'Odisha State Schemes', title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଯୋଜନା', href: '/schemes/?scope=odisha' },
    { slug: 'central', icon: '🇮🇳', title_en: 'Central Government Schemes', title_or: 'କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା', href: '/schemes/?scope=central' },
    { slug: 'all', icon: '📋', title_en: 'All Schemes & Benefits', title_or: 'ସମସ୍ତ ଯୋଜନା ଓ ସୁବିଧା', href: '/schemes/' }
  ];

  function renderSchemesStage1(stage1List) {
    if (!stage1List) return;
    const isOr = S.lang === 'or';
    stage1List.replaceChildren();

    SCHEMES_DROPDOWN_ITEMS.forEach(item => {
      const li = el('li', 'cso-js1-item is-direct-only');
      li.dataset.schScope = item.slug;

      const row = el('div', 'cso-js1-row');
      const a = el('a', 'cso-js1-link');
      a.href = item.href;

      const left = el('span', 'cso-js1-left');
      const ic = el('span', 'cso-js1-icon', item.icon);
      ic.setAttribute('aria-hidden', 'true');
      left.append(ic, el('span', 'cso-js1-title', isOr ? item.title_or : item.title_en));
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

  // v286: Single-Stage Vertical Study Library ▾ Dropdown (ONLY 5 items, NO Stage 2 slideout, NO › chevrons)
  const STUDY_DROPDOWN_CACHE_KEY = 'cso_study_library_dropdown_v286';
  const STUDY_RETIRED_SLUGS = new Set(['skill-coding-digital', 'previous-papers-mock-tests']);
  const STUDY_DEFAULT_TRACKS = [
    { id: 'stl_l1_central_exams', slug: 'central-competitive-exams', icon: '🇮🇳', title_en: 'Central Competitive Exams', title_or: 'କେନ୍ଦ୍ରୀୟ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା' },
    { id: 'stl_l1_odisha_state', slug: 'odisha-state-exams', icon: '🏛️', title_en: 'Odisha State Exams', title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପରୀକ୍ଷା' },
    { id: 'stl_l1_teaching_educator', slug: 'teaching-educator-exams', icon: '🎓', title_en: 'Teaching & Educator Exams', title_or: 'ଶିକ୍ଷକ ଓ ଶିକ୍ଷାଦାନ ପରୀକ୍ଷା' },
    { id: 'stl_l1_school_board', slug: 'school-board-notes', icon: '📘', title_en: 'School & Board Exams', title_or: 'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ପରୀକ୍ଷା' }
  ];
  let studyDropdownTracks = null;
  let studyDropdownFetchStarted = false;

  function getStudyDropdownTracks() {
    if (Array.isArray(studyDropdownTracks) && studyDropdownTracks.length) return studyDropdownTracks;
    try {
      const raw = window.sessionStorage.getItem(STUDY_DROPDOWN_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tracks) && parsed.tracks.length && (Date.now() - Number(parsed.ts || 0) < 300000)) {
          studyDropdownTracks = parsed.tracks;
          return studyDropdownTracks;
        }
      }
    } catch (_e) {}
    return STUDY_DEFAULT_TRACKS;
  }

  function renderStudyStage1(stage1List) {
    if (!stage1List) return;
    stage1List.replaceChildren();
    const isOr = S.lang === 'or';
    const tracks = getStudyDropdownTracks();
    const items = tracks.map(t => ({
      slug: t.slug,
      icon: t.icon || '📚',
      title_en: t.title_en || t.slug,
      title_or: t.title_or || t.title_en || t.slug,
      href: '/study-library/?track=' + encodeURIComponent(t.slug || '')
    }));
    items.push({
      slug: 'all',
      icon: '📖',
      title_en: 'All Study Resources',
      title_or: 'ସମସ୍ତ ଅଧ୍ୟୟନ ସାମଗ୍ରୀ',
      href: '/study-library/'
    });

    items.forEach(item => {
      const li = el('li', 'cso-js1-item');
      li.dataset.track = item.slug;
      const row = el('div', 'cso-js1-row');
      const a = el('a', 'cso-js1-link');
      a.href = item.href;
      const left = el('span', 'cso-js1-left');
      const ic = el('span', 'cso-js1-icon', item.icon);
      ic.setAttribute('aria-hidden', 'true');
      left.append(ic, el('span', 'cso-js1-title', isOr ? item.title_or : item.title_en));
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

  function hydrateStudyDropdownFromD1(stage1List) {
    renderStudyStage1(stage1List);
    if (studyDropdownFetchStarted || typeof fetch !== 'function') return;
    studyDropdownFetchStarted = true;
    fetch('/api/public/study-library/bootstrap', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.nav_tracks) && data.nav_tracks.length) {
          const filtered = data.nav_tracks
            .filter(t => t && !STUDY_RETIRED_SLUGS.has(String(t.slug || '').toLowerCase()))
            .map(t => ({
              id: t.id,
              slug: t.slug,
              icon: t.icon || '📚',
              title_en: t.slug === 'school-board-notes' ? 'School & Board Exams' : t.title_en,
              title_or: t.slug === 'school-board-notes' ? 'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ପରୀକ୍ଷା' : (t.title_or || t.title_en)
            }));
          if (filtered.length) {
            studyDropdownTracks = filtered;
            try {
              window.sessionStorage.setItem(STUDY_DROPDOWN_CACHE_KEY, JSON.stringify({ ts: Date.now(), tracks: studyDropdownTracks }));
            } catch (_e) {}
            document.querySelectorAll('#cso-study-stage1 .cso-js1-list').forEach(listEl => renderStudyStage1(listEl));
          }
        }
      })
      .catch(() => {});
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
        hydrateStudyDropdownFromD1(stage1List);
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

  // v287: Single-Stage Vertical Community ▾ Dropdown (ONLY 5 items, NO Stage 2 slideout, NO › chevrons)
  const COMMUNITY_DROPDOWN_CACHE_KEY = 'cso_community_dropdown_v287';
  const COMMUNITY_CANONICAL_SLUGS = new Set([
    'exam-career-qa',
    'schemes-citizen-help',
    'study-groups-notes',
    'success-stories-mentorship'
  ]);
  const COMMUNITY_DEFAULT_CHANNELS = [
    { id: 'comm_l1_exam_career_qa', slug: 'exam-career-qa', icon: '❓', title_en: 'Exam & Career Q&A', title_or: 'ପରୀକ୍ଷା ଓ କ୍ୟାରିୟର ପ୍ରଶ୍ନୋତ୍ତର' },
    { id: 'comm_l1_schemes_citizen_help', slug: 'schemes-citizen-help', icon: '🏛️', title_en: 'Odisha Schemes & Citizen Help', title_or: 'ଓଡ଼ିଶା ଯୋଜନା ଓ ନାଗରିକ ସହାୟତା' },
    { id: 'comm_l1_study_groups_notes', slug: 'study-groups-notes', icon: '📚', title_en: 'Study Groups & Peer Notes', title_or: 'ଅଧ୍ୟୟନ ଦଳ ଓ ସହପାଠୀ ନୋଟ୍ସ' },
    { id: 'comm_l1_success_stories', slug: 'success-stories-mentorship', icon: '🏆', title_en: 'Success Stories & Mentorship', title_or: 'ସଫଳତା କାହାଣୀ ଓ ମାର୍ଗଦର୍ଶନ' }
  ];
  let communityDropdownChannels = null;
  let communityDropdownFetchStarted = false;

  function getCommunityDropdownChannels() {
    if (Array.isArray(communityDropdownChannels) && communityDropdownChannels.length) return communityDropdownChannels;
    try {
      const raw = window.sessionStorage.getItem(COMMUNITY_DROPDOWN_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.channels) && parsed.channels.length && (Date.now() - Number(parsed.ts || 0) < 300000)) {
          communityDropdownChannels = parsed.channels;
          return communityDropdownChannels;
        }
      }
    } catch (_e) {}
    return COMMUNITY_DEFAULT_CHANNELS;
  }

  function renderCommunityStage1(stage1List) {
    if (!stage1List) return;
    stage1List.replaceChildren();
    const isOr = S.lang === 'or';
    const channels = getCommunityDropdownChannels();
    const items = channels.map(ch => ({
      slug: ch.slug,
      icon: ch.icon || '💬',
      title_en: ch.title_en || ch.slug,
      title_or: ch.title_or || ch.title_en || ch.slug,
      href: '/community/?channel=' + encodeURIComponent(ch.slug || '')
    }));
    items.push({
      slug: 'all',
      icon: '🌐',
      title_en: 'All Community Discussions',
      title_or: 'ସମସ୍ତ ସମୁଦାୟ ଆଲୋଚନା',
      href: '/community/'
    });

    items.forEach(item => {
      const li = el('li', 'cso-js1-item');
      li.dataset.channel = item.slug;
      const row = el('div', 'cso-js1-row');
      const a = el('a', 'cso-js1-link');
      a.href = item.href;
      const left = el('span', 'cso-js1-left');
      const ic = el('span', 'cso-js1-icon', item.icon);
      ic.setAttribute('aria-hidden', 'true');
      left.append(ic, el('span', 'cso-js1-title', isOr ? item.title_or : item.title_en));
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

  function hydrateCommunityDropdownFromD1(stage1List) {
    renderCommunityStage1(stage1List);
    if (communityDropdownFetchStarted || typeof fetch !== 'function') return;
    communityDropdownFetchStarted = true;
    fetch('/api/public/community/bootstrap', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.nav_channels) && data.nav_channels.length) {
          const canonical = data.nav_channels.filter(c => c && COMMUNITY_CANONICAL_SLUGS.has(String(c.slug || '').toLowerCase()));
          const source = canonical.length ? canonical : COMMUNITY_DEFAULT_CHANNELS;
          communityDropdownChannels = source.map(c => ({
            id: c.id,
            slug: c.slug,
            icon: c.icon || '💬',
            title_en: c.title_en,
            title_or: c.title_or || c.title_en
          }));
          try {
            window.sessionStorage.setItem(COMMUNITY_DROPDOWN_CACHE_KEY, JSON.stringify({ ts: Date.now(), channels: communityDropdownChannels }));
          } catch (_e) {}
          document.querySelectorAll('#cso-community-stage1 .cso-js1-list').forEach(listEl => renderCommunityStage1(listEl));
        }
      })
      .catch(() => {});
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
        hydrateCommunityDropdownFromD1(stage1List);
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

  function renderNav() {
    const navw = document.getElementById('navw');
    if (!navw) return;
    navw.replaceChildren();

    const bar = el('div', 'cso-nav-bar-container');
    const mobToggle = el('button', 'cso-nav-mobile');
    mobToggle.type = 'button';
    mobToggle.id = 'cso-menu-toggle';
    mobToggle.setAttribute('aria-expanded', 'false');
    mobToggle.setAttribute('aria-controls', 'cso-nav-items');
    mobToggle.setAttribute('aria-label', 'Navigation Menu');
    const ham = el('span', '', '☰');
    ham.setAttribute('aria-hidden', 'true');
    mobToggle.append(ham, ' Menu');

    const navSavedBtn = el('button', 'pill cso-ctl-saved cso-nav-saved-pill acc-btn');
    navSavedBtn.id = 'cso-ctl-saved';
    navSavedBtn.type = 'button';
    navSavedBtn.setAttribute('aria-label', 'Open saved bookmarks');
    const navSavedStar = el('span', '', '★');
    navSavedStar.setAttribute('aria-hidden', 'true');
    const navSavedTxt = el('span', '', 'Saved');
    const navSavedCount = el('span', 'cso-saved-badge', String(getSavedBookmarksList().length));
    navSavedCount.id = 'cso-saved-count';
    navSavedBtn.append(navSavedStar, ' ', navSavedTxt, ' ', navSavedCount);
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

    if (lastLiveNavPayload) {
      renderPillarNodes(navItems, lastLiveNavPayload.items, lastLiveNavPayload.megaByParent);
    } else {
      renderPillarNodes(navItems, NAV, null);
    }

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
        if (mobAuth && !user) navItems.appendChild(mobAuth);
      })
      .catch(() => {});
  }

  function syncMobileNavAuth() {
    const existing = document.getElementById('cso-nav-mobile-auth');
    if (existing) existing.remove();
  }

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
    const mobile = e.target.closest('#navw .cso-nav-mobile');
    if (mobile) {
      e.preventDefault();
      e.stopPropagation();
      const items = document.getElementById('cso-nav-items');
      if (items) {
        const open = items.classList.toggle('cso-mobile-open');
        mobile.setAttribute('aria-expanded', String(open));
        if (!open) closeDropdowns();
      }
      return;
    }
    const arrow = e.target.closest('#navw .cso-nav-arrow');
    if (arrow) {
      e.preventDefault();
      e.stopPropagation();
      const parent = arrow.closest('.ni');
      if (parent) {
        const open = !parent.classList.contains('cso-open');
        closeDropdowns(parent);
        parent.classList.toggle('cso-open', open);
        arrow.setAttribute('aria-expanded', String(open));
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
        } else if (!open && (parent.classList.contains('cso-ni-jobs') || parent.classList.contains('cso-ni-careers') || parent.classList.contains('cso-ni-schemes') || parent.classList.contains('cso-ni-study') || parent.classList.contains('cso-ni-community'))) {
          const cascade = parent.querySelector('.cso-jobs-cascade, .cso-careers-cascade, .cso-schemes-cascade, .cso-study-cascade, .cso-community-cascade');
          if (cascade) cascade.classList.remove('is-stage2-open');
        }
      }
      return;
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
      }
      return;
    }
    if (e.target.closest('#navw a')) {
      closeDropdowns();
      const items = document.getElementById('cso-nav-items');
      if (items) items.classList.remove('cso-mobile-open');
      const toggle = document.querySelector('#navw .cso-nav-mobile');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    } else if (!e.target.closest('#navw')) {
      closeDropdowns();
      const items = document.getElementById('cso-nav-items');
      if (items && items.classList.contains('cso-mobile-open')) {
        items.classList.remove('cso-mobile-open');
        const toggle = document.querySelector('#navw .cso-nav-mobile');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
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
        items.classList.remove('cso-mobile-open');
        const toggle = document.querySelector('#navw .cso-nav-mobile');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      }
    }
  });

  document.addEventListener('focusout', e => {
    const navw = document.getElementById('navw');
    if (!navw) return;
    const openItem = navw.querySelector('.ni.cso-open');
    if (openItem && e.relatedTarget && !openItem.contains(e.relatedTarget)) {
      closeDropdowns();
    }
    const items = document.getElementById('cso-nav-items');
    if (items && items.classList.contains('cso-mobile-open') && e.relatedTarget && !navw.contains(e.relatedTarget)) {
      items.classList.remove('cso-mobile-open');
      const toggle = navw.querySelector('.cso-nav-mobile');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      closeDropdowns();
    }
  });

  window.addEventListener('scroll', () => {
    if (window.innerWidth > 768) {
      closeDropdowns();
      closeAuthDropdown();
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    syncMobileControlsVisibility();
    if (window.innerWidth > 768) {
      closeDropdowns();
      const items = document.getElementById('cso-nav-items');
      if (items && items.classList.contains('cso-mobile-open')) {
        items.classList.remove('cso-mobile-open');
        const toggle = document.querySelector('#navw .cso-nav-mobile');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
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
        node.src = '/assets/img/cso-logo-96.webp';
        if (isFooterLogo) {
          node.alt = '';
          node.setAttribute('aria-hidden', 'true');
        } else {
          node.alt = 'Common Sense Odisha Logo';
        }
        node.width = 36;
        node.height = 36;
        node.classList.add('cso-brand-emblem');
        if (!node.dataset.emblemBound) {
          node.dataset.emblemBound = '1';
          node.addEventListener('error', () => {
            if (node.dataset.fallbackApplied === '1') return;
            node.dataset.fallbackApplied = '1';
            node.src = '/assets/img/cso-logo-96.png';
          });
        }
      } else {
        const img = document.createElement('img');
        img.src = '/assets/img/cso-logo-96.webp';
        img.alt = isFooterLogo ? '' : 'Common Sense Odisha Logo';
        if (isFooterLogo) img.setAttribute('aria-hidden', 'true');
        img.width = 36;
        img.height = 36;
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
    logo.src = '/assets/img/cso-logo-96.webp';
    logo.alt = 'Common Sense Odisha Logo';
    logo.className = 'cso-brand-logo cso-brand-emblem';
    logo.width = 36; logo.height = 36;
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
    logo.src = '/assets/img/cso-logo-96.webp';
    logo.alt = '';
    logo.setAttribute('aria-hidden', 'true');
    logo.className = 'cso-footer-logo cso-brand-emblem';
    logo.width = 36; logo.height = 36;
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
      ['syncAuthSession', syncAuthSession]
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
