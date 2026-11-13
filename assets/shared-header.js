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
    ['jobs-careers', 'Jobs & Careers', '💼'],
    ['schemes-benefits', 'Schemes & Benefits', '🏛'],
    ['study-library', 'Study Library', '📖'],
    ['community', 'Community', '👥'],
    ['about', 'About', 'ⓘ']
  ];

  const MENUS = {
    'jobs-careers': [
      'Jobs & Recruitment',
      'Career Explorer',
      'Eligibility & Qualification Explorer',
      'Courses, Entrance Exams & Certifications',
      'Scholarships & Financial Support',
      'International & Overseas Opportunities',
      'Career Development & Employability',
      'Institutions, Official Portals & Verification'
    ],
    'schemes-benefits': [
      'Government & Public Welfare',
      'Education, Employment & Talent',
      'Agriculture, Business & Livelihoods',
      'Health, Housing & Financial Protection',
      'Communities & Special Beneficiaries',
      'Private, Global & Innovation Support',
      'Find Schemes & Check Eligibility',
      'Citizen Services & Verification'
    ],
    'study-library': [
      'Early Childhood & Primary Education',
      'School & Higher Secondary Education',
      'Undergraduate, Postgraduate & Research',
      'Competitive Exams & Teacher Education',
      'Professional, Vocational & Digital Skills',
      'Subjects, Languages & Study Materials',
      'International & Inclusive Education',
      'Life Skills, Culture & Lifelong Learning',
      'Libraries, Educators & Learning Support',
      'Odisha Study Hub & Resource Organisation'
    ],
    'community': [
      'Local & Odisha Communities',
      'Students, Educators & Mentorship',
      'Careers, Business & Professional Networks',
      'Agriculture & Rural Livelihoods',
      'Women, Families, Health & Inclusion',
      'Youth, NGOs & Volunteering',
      'Culture, Sports & Traditional Communities',
      'Environment, Science & Technology',
      'Digital, International & Community Forums',
      'Community Directory, Safety & Governance'
    ],
    'about': [
      'About CSO',
      'Our Approach',
      'Trust & Transparency',
      'Team & Community',
      'Policies & Standards',
      'Contact & FAQs'
    ]
  };

  const THEMES = ['light', 'dark', 'system', 'reading', 'sepia'];
  const THEME_ICONS = { light: '☀️', dark: '🌙', system: '💻', reading: '📖', sepia: '☕' };
  const LN = { en: 'English', or: 'ଓଡ଼ିଆ', hi: 'हिन्दी' };
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
    } catch (e) {}
  }

  function applySettings() {
    const d = document.documentElement;
    d.dataset.theme = THEMES.includes(S.theme) ? S.theme : 'system';
    d.lang = S.lang || 'en';
    if (document.body) {
      ZOOM_CLASSES.forEach(cls => document.body.classList.remove(cls));
      const pct = Math.round((S.zoom || 1) * 20) * 5;
      const clamped = Math.max(85, Math.min(130, pct));
      document.body.classList.add(`cso-zoom-${clamped}`);
      document.body.classList.toggle('hc', !!S.hc);
      document.body.classList.toggle('ul', !!S.ul);
      document.body.classList.toggle('rm', !!S.rm);
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
        },
        S.lang === k
      ]));
    });
    langWrap.appendChild(langBtn);

    const bt = el('button', 'pill cso-ctl-theme', THEME_ICONS[S.theme || 'system'] || '💻');
    bt.id = 'cso-ctl-theme';
    bt.type = 'button';
    bt.setAttribute('aria-label', 'Change theme');
    bt.title = 'Theme: ' + (S.theme || 'system');
    bt.addEventListener('click', () => {
      const i = THEMES.indexOf(S.theme || 'system');
      S.theme = THEMES[(i + 1) % THEMES.length];
      saveSettings();
      applySettings();
      renderControls();
    });

    const a11yWrap = el('span', 'cso-popup-anchor');
    const a11yBtn = el('button', 'pill cso-ctl-a11y', '♿ Accessibility ⌄');
    a11yBtn.id = 'cso-ctl-a11y';
    a11yBtn.type = 'button';
    a11yBtn.addEventListener('click', e => {
      e.stopPropagation();
      showPopup(a11yBtn, [
        ['High contrast', () => { S.hc = +!S.hc; saveSettings(); applySettings(); }, !!S.hc],
        ['Underline links', () => { S.ul = +!S.ul; saveSettings(); applySettings(); }, !!S.ul],
        ['Reduce motion', () => { S.rm = +!S.rm; saveSettings(); applySettings(); }, !!S.rm],
        ['Reset', () => { S.hc = S.ul = S.rm = 0; S.zoom = 1; saveSettings(); applySettings(); }]
      ]);
    });
    a11yWrap.appendChild(a11yBtn);

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
    ctl.append(savedBtn, langWrap, bt, a11yWrap, zoomSpan);
  }

  function renderAuth() {
    const authEl = document.getElementById('auth');
    if (!authEl) return;
    authEl.replaceChildren();

    let candidate = null;
    try {
      const raw = localStorage.getItem('cso_candidate_session_v1');
      if (raw) candidate = JSON.parse(raw);
    } catch (e) {}

    const activeUser = candidate || (window.CSOAuthClient && typeof window.CSOAuthClient.getUser === 'function' ? window.CSOAuthClient.getUser() : null);

    if (activeUser) {
      const isAdmin = activeUser.role === 'admin' || activeUser.role === 'superadmin';
      const dashHref = isAdmin ? '/admin/' : '/student-dashboard/';
      const deskRow = el('div', 'cso-desktop-auth-buttons cso-auth-row');
      const dashLink = el('a', 'btn-dashboard');
      dashLink.href = dashHref;
      const iconSpan = el('span', '', '👤');
      iconSpan.setAttribute('aria-hidden', 'true');
      dashLink.append(iconSpan, el('span', '', isAdmin ? 'Admin Studio' : 'My Dashboard'));

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
      const displayName = activeUser.name || activeUser.fullName || activeUser.email || 'Account';
      const firstName = String(displayName).split(' ')[0];
      const mLabel = el('span', 'auth-label', firstName);
      mLabel.id = 'cso-auth-cand-label';
      const mArrow = el('span', 'auth-arrow', '▾');
      mArrow.setAttribute('aria-hidden', 'true');
      trigger.append(mIcon, mLabel, mArrow);

      const menu = el('div', 'cso-auth-dropdown-menu');
      menu.id = 'cso-auth-menu';
      menu.hidden = true;

      const mDash = el('a', 'cso-auth-item cso-auth-item--dash', isAdmin ? '🛡️ Admin Studio' : '👤 My Dashboard');
      mDash.href = dashHref;
      const mLogout = el('a', 'cso-auth-item cso-auth-item--logout', 'Logout');
      mLogout.href = '#';
      mLogout.id = 'cso-header-mob-logout';
      mLogout.addEventListener('click', e => {
        e.preventDefault();
        doLogout();
      });
      menu.append(mDash, mLogout);
      mobWrap.append(trigger, menu);

      authEl.append(deskRow, mobWrap);
      return;
    }

    const desk = el('div', 'cso-desktop-auth-buttons');
    const loginA = el('a', 'cso-auth-item-link cso-login-link login-btn', 'Login');
    loginA.setAttribute('href', '/login.html');
    const signupA = el('a', 'cso-signup-pill signup-btn', 'Sign Up');
    signupA.setAttribute('href', '/signup.html');
    desk.append(loginA, signupA);

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
    const mLogin = el('a', 'cso-auth-item', 'Login');
    mLogin.setAttribute('href', '/login.html');
    const mSignup = el('a', 'cso-auth-item', 'Sign Up');
    mSignup.setAttribute('href', '/signup.html');
    menu.append(mLogin, mSignup);
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
  let activeSection = '';
  for (const [key] of NAV) {
    if (pathname.includes('/' + key)) {
      activeSection = key;
      break;
    }
  }

  function closeDropdowns(except) {
    document.querySelectorAll('#navw .ni').forEach(n => {
      if (n === except) return;
      n.classList.remove('cso-open');
      const b = n.querySelector('.cso-nav-arrow');
      if (b) b.setAttribute('aria-expanded', 'false');
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

    const accCluster = el('div', 'cso-mobile-acc-cluster');
    const mobSaved = el('button', 'pill cso-ctl-saved acc-btn', '★ Saved');
    mobSaved.type = 'button';
    mobSaved.addEventListener('click', openSavedDrawer);

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

    accCluster.append(mobSaved, mobA11yWrap, mobZoom);
    bar.append(mobToggle, accCluster);

    const navItems = el('div', 'cso-nav-items');
    navItems.id = 'cso-nav-items';

    const isHome = !activeSection && (pathname === '/' || pathname.endsWith('/index.html') || pathname === '');
    const homeA = el('a', 'cso-nav-home' + (isHome ? ' on' : ''));
    homeA.href = root;
    const homeIcon = el('span', '', '🏠');
    homeIcon.setAttribute('aria-hidden', 'true');
    homeA.append(homeIcon, ' Home');
    navItems.appendChild(homeA);

    NAV.forEach(([s, t, icon]) => {
      const ni = el('div', 'ni' + (s === activeSection ? ' cso-active' : ''));
      const parent = el('div', 'cso-nav-parent');
      const a = el('a', s === activeSection ? 'on' : '');
      a.href = root + s + '/';
      if (s === activeSection) a.setAttribute('aria-current', 'page');
      const ic = el('span', '', icon);
      ic.setAttribute('aria-hidden', 'true');
      a.append(ic, ' ' + t);

      const arrow = el('button', 'cso-nav-arrow', '⌄');
      arrow.type = 'button';
      arrow.setAttribute('aria-label', 'Toggle ' + t + ' menu');
      arrow.setAttribute('aria-haspopup', 'true');
      arrow.setAttribute('aria-expanded', 'false');
      arrow.setAttribute('aria-controls', 'cso-nav-dd-' + s);

      parent.append(a, arrow);

      const dd = el('div', 'dd');
      dd.id = 'cso-nav-dd-' + s;
      MENUS[s].forEach((x, index) => {
        const subA = el('a');
        subA.href = root + s + '/?section=' + index;
        const bullet = el('span', 'dd-bullet', '›');
        bullet.setAttribute('aria-hidden', 'true');
        subA.append(bullet, el('span', '', x));
        dd.appendChild(subA);
      });

      ni.append(parent, dd);
      navItems.appendChild(ni);
    });

    navw.append(bar, navItems);
  }

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

  window.addEventListener('resize', () => {
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
      adminLink.setAttribute('aria-label', 'Admin Portal - Authorised Access Only');
    }
  }

  function init() {
    applySettings();
    renderControls();
    renderAuth();
    renderNav();
    ensureAdminLink();
    updateSavedCountBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
