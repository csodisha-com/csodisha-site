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
    { key: 'home', labelEn: 'Home', labelOr: 'ମୂଳପୃଷ୍ଠା', fullEn: 'Home & Live Updates', fullOr: 'ମୂଳପୃଷ୍ଠା ଓ ତାଜା ଅପଡେଟ୍', icon: '🏠', url: '/' },
    { key: 'jobs-careers', labelEn: 'Jobs', labelOr: 'ଚାକିରି', fullEn: 'Jobs & Recruitment', fullOr: 'ଚାକିରି ଓ ନିଯୁକ୍ତି', icon: '💼', url: '/jobs-careers/' },
    { key: 'study-library', labelEn: 'Study Library', labelOr: 'ପାଠାଗାର', fullEn: 'Study Library & Current Affairs', fullOr: 'ଅଧ୍ୟୟନ ପାଠାଗାର ଓ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', icon: '📖', url: '/study-library/' },
    { key: 'mock-tests', labelEn: 'Mock Tests', labelOr: 'ମକ୍ ଟେଷ୍ଟ', fullEn: 'Mock Tests & Practice', fullOr: 'ମକ୍ ଟେଷ୍ଟ ଓ ଅଭ୍ୟାସ', icon: '📝', url: '/mock-tests/' },
    { key: 'schemes-benefits', labelEn: 'Schemes', labelOr: 'ଯୋଜନା', fullEn: 'Schemes & Scholarships', fullOr: 'ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି', icon: '🏛', url: '/schemes-benefits/' },
    { key: 'tools', labelEn: 'Tools', labelOr: 'ଉପକରଣ', fullEn: 'Student Tools & Verified Portals', fullOr: 'ଛାତ୍ର ଉପକରଣ ଓ ସରକାରୀ ପୋର୍ଟାଲ୍', icon: '🧰', url: '/tools/' },
    { key: 'community', labelEn: 'Community', labelOr: 'ସମୁଦାୟ', fullEn: 'Community & Support', fullOr: 'ସମୁଦାୟ ଓ ସହାୟତା', icon: '👥', url: '/community/' }
  ];

  const MENUS = {
    'home': [
      { labelEn: 'Homepage Overview', labelOr: 'ମୂଳପୃଷ୍ଠା ବିବରଣୀ', url: '/' },
      { labelEn: 'Live Recruitment Alerts', labelOr: 'ତାଜା ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି', url: '/jobs/' },
      { labelEn: "Today's Current Affairs", labelOr: 'ଆଜିର ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', url: '/current-affairs/' },
      { labelEn: 'Annual Exam Calendar', labelOr: 'ବାର୍ଷିକ ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର୍', url: '/study/examinations/' }
    ],
    'jobs-careers': [
      { labelEn: 'Odisha State Govt: OPSC/OSSC/OSSSC/Police', labelOr: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ: OPSC/OSSC/OSSSC/ପୋଲିସ୍', url: '/jobs-careers/?track=odisha-govt' },
      { labelEn: 'Central Govt: UPSC/SSC/RRB/Banking', labelOr: 'କେନ୍ଦ୍ର ସରକାରୀ: UPSC/SSC/RRB/ବ୍ୟାଙ୍କିଂ', url: '/jobs-careers/?track=central-govt' },
      { labelEn: 'PSUs & Apprenticeships', labelOr: 'PSU ଓ ଆପ୍ରେଣ୍ଟିସଶିପ୍', url: '/jobs-careers/?track=psu-apprenticeship' },
      { labelEn: 'Notification Lifecycle Tracker', labelOr: 'ବିଜ୍ଞପ୍ତି ସ୍ଥିତି ଟ୍ରାକର୍', url: '/jobs/' }
    ],
    'study-library': [
      { labelEn: 'Syllabi & Exam Patterns', labelOr: 'ସିଲାବସ୍ ଓ ପରୀକ୍ଷା ପଦ୍ଧତି', url: '/resources/?kind=syllabus' },
      { labelEn: 'Solved PYQs', labelOr: 'ସମାଧାନ ହୋଇଥିବା PYQ', url: '/resources/?kind=pyq' },
      { labelEn: 'Bilingual Study Notes', labelOr: 'ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ନୋଟ୍ସ', url: '/study-library/' },
      { labelEn: 'Daily Current Affairs & 5-MCQ Capsules', labelOr: 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ଓ 5-MCQ', url: '/current-affairs/' }
    ],
    'mock-tests': [
      { labelEn: 'Odisha Govt Mock Tests', labelOr: 'ଓଡ଼ିଶା ସରକାରୀ ମକ୍ ଟେଷ୍ଟ', url: '/mock-tests/?track=odisha' },
      { labelEn: 'Central Govt CBT Tests', labelOr: 'କେନ୍ଦ୍ର ସରକାରୀ CBT ଟେଷ୍ଟ', url: '/study-library/cbt-mock-test/' },
      { labelEn: 'Sectional & Speed Drills', labelOr: 'ବିଭାଗୀୟ ଓ ସ୍ପିଡ୍ ଡ୍ରିଲ୍', url: '/mock-tests/?mode=sectional' },
      { labelEn: 'Scoreboard & Analytics', labelOr: 'ସ୍କୋରବୋର୍ଡ ଓ ବିଶ୍ଳେଷଣ', url: '/student-dashboard/' }
    ],
    'schemes-benefits': [
      { labelEn: 'Odisha State Welfare Schemes', labelOr: 'ଓଡ଼ିଶା ରାଜ୍ୟ କଲ୍ୟାଣ ଯୋଜନା', url: '/schemes-benefits/?scope=odisha' },
      { labelEn: 'Central Govt Schemes', labelOr: 'କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା', url: '/schemes-benefits/?scope=central' },
      { labelEn: 'Post-Matric & Merit Scholarships', labelOr: 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ମେଧା ଛାତ୍ରବୃତ୍ତି', url: '/scholarship-guidance/' },
      { labelEn: 'Eligibility Matcher', labelOr: 'ଯୋଗ୍ୟତା ଯାଞ୍ଚ', url: '/scheme-opportunity-finder/' }
    ],
    'tools': [
      { labelEn: 'Age Eligibility Calculator', labelOr: 'ବୟସ ଯୋଗ୍ୟତା କ୍ୟାଲକୁଲେଟର୍', url: '/tools/#age-calculator' },
      { labelEn: 'Photo & Signature Resizer', labelOr: 'ଫଟୋ ଓ ଦସ୍ତଖତ ରିସାଇଜର୍', url: '/tools/#photo-resizer' },
      { labelEn: 'Document Readiness Checklist', labelOr: 'ଡକ୍ୟୁମେଣ୍ଟ୍ ପ୍ରସ୍ତୁତି ତାଲିକା', url: '/tools/#doc-readiness-card' },
      { labelEn: 'Official .gov.in Portals Directory', labelOr: 'ଅଫିସିଆଲ୍ .gov.in ପୋର୍ଟାଲ୍', url: '/tools/#scam-checker' }
    ],
    'community': [
      { labelEn: 'Student Discussion Forum', labelOr: 'ଛାତ୍ର ଆଲୋଚନା ମଞ୍ଚ', url: '/community/' },
      { labelEn: 'Help & FAQs', labelOr: 'ସହାୟତା ଓ ସାଧାରଣ ପ୍ରଶ୍ନ', url: '/support/#faqs' },
      { labelEn: 'Report an Error / Suggest Resource', labelOr: 'ତ୍ରୁଟି ଜଣାନ୍ତୁ / ସମ୍ବଳ ପ୍ରସ୍ତାବ', url: '/support/#report-error' },
      { labelEn: 'About & Legal Policies', labelOr: 'ଆମ ବିଷୟରେ ଓ ଆଇନଗତ ନୀତି', url: '/about/' }
    ]
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

  function setPortalTheme(themeKey, persist = true) {
    const key = PORTAL_THEME_KEYS.includes(themeKey) ? themeKey : 'system';
    activePortalTheme = key;
    document.documentElement.setAttribute('data-cso-theme', key);
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
    d.dataset.theme = THEMES.includes(S.theme) ? S.theme : 'system';
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
      const dashLink = el('a', 'btn-dashboard');
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

      const logoutBtn = el('button', 'btn-header-logout', 'Logout');
      logoutBtn.type = 'button';
      logoutBtn.id = 'cso-header-logout-btn';
      logoutBtn.addEventListener('click', doLogout);

      if (isAdmin) {
        const hubLink = el('a', 'btn-dashboard', 'Candidate Hub');
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

      const mDash = el('a', 'cso-auth-item cso-auth-item--dash', isAdmin ? '🛡️ Admin Studio' : '👤 My Dashboard');
      mDash.href = dashHref;
      const mProfile = el('a', 'cso-auth-item', '★ Profile / Saved');
      mProfile.href = '/student-dashboard/#saved';
      const mLogout = el('a', 'cso-auth-item cso-auth-item--logout', 'Logout');
      mLogout.href = '#';
      mLogout.id = 'cso-header-mob-logout';
      mLogout.addEventListener('click', e => {
        e.preventDefault();
        doLogout();
      });
      menu.append(mDash, mProfile, mLogout);
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
    menu.append(...createAuthPair('cso-auth-item', 'cso-auth-item'));
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
    if (p === '/' || p === '/index.html' || p === '') return 'home';
    if (p.startsWith('/study-library/cbt-mock-test') || p.startsWith('/mock-tests') || p.startsWith('/student-dashboard')) return 'mock-tests';
    if (p.startsWith('/jobs-careers') || p.startsWith('/jobs') || p.startsWith('/career-guidance') || p.startsWith('/job-opportunity-finder')) return 'jobs-careers';
    if (p.startsWith('/study-library') || p.startsWith('/study') || p.startsWith('/resources') || p.startsWith('/current-affairs') || p.startsWith('/education-explorer') || p.startsWith('/study-path-finder')) return 'study-library';
    if (p.startsWith('/schemes-benefits') || p.startsWith('/schemes') || p.startsWith('/scholarship-guidance') || p.startsWith('/scheme-opportunity-finder')) return 'schemes-benefits';
    if (p.startsWith('/tools') || p.startsWith('/opportunity-compass')) return 'tools';
    if (p.startsWith('/community') || p.startsWith('/support') || p.startsWith('/about') || p.startsWith('/trust-layer') || p.startsWith('/privacy-policy') || p.startsWith('/terms-of-use') || p.startsWith('/disclaimer') || p.startsWith('/copyright-policy')) return 'community';
    return 'home';
  }
  const activeSection = resolveActivePillar(pathname);

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
      n.classList.remove('cso-open');
      const b = n.querySelector('.cso-nav-arrow');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    const navw = document.getElementById('navw');
    if (navw && document.activeElement && navw.contains(document.activeElement)) {
      if (!except || !except.contains(document.activeElement)) {
        try { document.activeElement.blur(); } catch (e) {}
      }
    }
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

    NAV.forEach(pillar => {
      const isCurrent = pillar.key === activeSection;
      const ni = el('div', 'ni' + (isCurrent ? ' cso-active' : ''));
      ni.dataset.pillar = pillar.key;
      const parent = el('div', 'cso-nav-parent');
      const a = el('a', (pillar.key === 'home' ? 'cso-nav-home ' : '') + (isCurrent ? 'on' : ''));
      a.href = pillar.url;
      a.title = S.lang === 'or' ? pillar.fullOr : pillar.fullEn;
      if (isCurrent) a.setAttribute('aria-current', 'page');
      const ic = el('span', '', pillar.icon);
      ic.setAttribute('aria-hidden', 'true');
      a.append(ic, ' ' + navLabel(pillar));

      const arrow = el('button', 'cso-nav-arrow', '⌄');
      arrow.type = 'button';
      arrow.setAttribute('aria-label', 'Toggle ' + pillar.fullEn + ' menu');
      arrow.setAttribute('aria-haspopup', 'true');
      arrow.setAttribute('aria-expanded', 'false');
      arrow.setAttribute('aria-controls', 'cso-nav-dd-' + pillar.key);

      parent.append(a, arrow);
      const dd = buildPillarDropdown(pillar.key, MENUS[pillar.key] || []);
      ni.append(parent, dd);
      navItems.appendChild(ni);
    });

    navw.append(bar, navItems);
  }

  function hydrateHeaderNavFromApi() {
    if (typeof fetch !== 'function') return;
    fetch('/api/nav/config', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data || !Array.isArray(data.header) || !data.header.length) return;
        const navItems = document.getElementById('cso-nav-items');
        if (!navItems) return;
        const user = getActiveUser();
        const CANONICAL_NAV_ORDER = ['home', 'jobs-careers', 'study-library', 'mock-tests', 'schemes-benefits', 'tools', 'community'];
        const normalizePillarKey = urlStr => {
          const raw = String(urlStr || '').replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
          if (!raw || raw === 'index.html') return 'home';
          if (raw === 'jobs') return 'jobs-careers';
          if (raw === 'schemes') return 'schemes-benefits';
          if (raw === 'current-affairs' || raw === 'resources' || raw === 'study') return 'study-library';
          if (raw === 'support' || raw === 'about') return 'community';
          return raw;
        };
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
        const matchedKeys = new Set(visibleItems.map(it => normalizePillarKey(it.url)));
        if (visibleItems.length < 7 || !CANONICAL_NAV_ORDER.every(k => matchedKeys.has(k))) {
          return;
        }
        visibleItems.sort((a, b) => {
          const ra = CANONICAL_NAV_ORDER.indexOf(normalizePillarKey(a.url));
          const rb = CANONICAL_NAV_ORDER.indexOf(normalizePillarKey(b.url));
          return (ra >= 0 ? ra : 100) - (rb >= 0 ? rb : 100);
        });

        const megaByParent = new Map();
        const megaList = Array.isArray(data.mega_menu) ? data.mega_menu : [];
        megaList.forEach(mm => {
          if (!mm || !mm.parent_item_id) return;
          if (!megaByParent.has(mm.parent_item_id)) megaByParent.set(mm.parent_item_id, []);
          megaByParent.get(mm.parent_item_id).push(mm);
        });

        const mobAuth = document.getElementById('cso-nav-mobile-auth');
        navItems.replaceChildren();
        visibleItems.forEach(it => {
          const pillarKey = normalizePillarKey(it.url);
          const isCurrent = pillarKey === activeSection;
          const apiSubs = (megaByParent.get(it.id) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const subItems = apiSubs.length ? apiSubs : (MENUS[pillarKey] || []);
          const ni = el('div', 'ni' + (isCurrent ? ' cso-active' : ''));
          ni.dataset.pillar = pillarKey;
          const parent = el('div', 'cso-nav-parent');
          const a = el('a', (pillarKey === 'home' ? 'cso-nav-home ' : '') + (isCurrent ? 'on' : ''));
          a.href = resolveSafeHref(it.url || '/');
          if (it.open_new_tab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
          if (isCurrent) a.setAttribute('aria-current', 'page');
          if (it.icon_key) { const ic = el('span', '', it.icon_key); ic.setAttribute('aria-hidden', 'true'); a.append(ic, ' '); }
          a.append(document.createTextNode(navLabel(it) || pillarKey));
          if (it.badge_text_en) a.append(' ', el('span', 'cso-nav-badge', it.badge_text_en));

          if (subItems.length) {
            const arrow = el('button', 'cso-nav-arrow', '⌄');
            arrow.type = 'button';
            arrow.setAttribute('aria-label', 'Toggle ' + (it.label_en || pillarKey) + ' menu');
            arrow.setAttribute('aria-haspopup', 'true');
            arrow.setAttribute('aria-expanded', 'false');
            arrow.setAttribute('aria-controls', 'cso-nav-dd-' + pillarKey);
            parent.append(a, arrow);
            ni.append(parent, buildPillarDropdown(pillarKey, subItems));
          } else {
            parent.appendChild(a);
            ni.appendChild(parent);
          }
          navItems.appendChild(ni);
        });
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
      if (node.tagName === 'IMG') {
        node.src = '/assets/img/cso-logo-96.webp';
        node.alt = 'Common Sense Odisha Logo';
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
        img.alt = 'Common Sense Odisha Logo';
        img.width = 36;
        img.height = 36;
        img.className = 'cso-brand-emblem';
        node.replaceChildren(img);
      }
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
    ['Explore', [['Jobs & Recruitment', '/jobs-careers/'], ['Study Library', '/study-library/'], ['Mock Tests', '/mock-tests/'], ['Schemes & Scholarships', '/schemes-benefits/'], ['Student Tools', '/tools/'], ['Community', '/community/']]],
    ['Support & Legal', [['Help & FAQs', '/support/#faqs'], ['Report an Error', '/support/#report-error'], ['Suggest Resource', '/support/#suggest-resource'], ['About CSO', '/about/'], ['Privacy Policy', '/privacy-policy/'], ['Terms of Use', '/terms-of-use/']]]
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
    logo.alt = 'Common Sense Odisha Logo';
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
    ensureAutoShell();
    ensureAutoFooter();
    ensureGlobalEnhancements();
    applySettings();
    syncBrandLogoMarks();
    renderControls();
    renderAuth();
    renderNav();
    hydrateHeaderNavFromApi();
    ensureAdminLink();
    updateSavedCountBadge();
    syncAuthSession();
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
