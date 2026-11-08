/* CSO Shared Header and Navigation v1 */
(() => {
  'use strict';

  // Determine root relative path
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
    document.body.style.zoom = S.zoom || 1;
    document.body.classList.toggle('hc', !!S.hc);
    document.body.classList.toggle('ul', !!S.ul);
    document.body.classList.toggle('rm', !!S.rm);
  }

  function showPopup(target, items) {
    document.querySelectorAll('.pp').forEach(x => x.remove());
    const m = document.createElement('div');
    m.className = 'pp';
    const r = target.getBoundingClientRect();
    m.style.top = (r.bottom + 4) + 'px';
    m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 210)) + 'px';
    items.forEach(([label, fn, active]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (active ? '✓ ' : '') + label;
      b.onclick = () => { fn(); m.remove(); };
      m.appendChild(b);
    });
    document.body.appendChild(m);
    setTimeout(() => {
      window.addEventListener('click', () => m.remove(), { once: true });
    }, 0);
  }

  function renderControls() {
    const ctl = document.getElementById('ctl');
    if (!ctl) return;

    ctl.innerHTML =
      '<button class="pill cso-ctl-lang" id="cso-ctl-lang" type="button" aria-label="Language selector"><span class="cso-lang-icon">🌐</span> <span class="cso-lang-name">' + (LN[S.lang] || 'English') + '</span> ⌄</button>' +
      '<button class="pill cso-ctl-theme" id="cso-ctl-theme" type="button" aria-label="Change theme" title="Theme: ' + (S.theme || 'system') + '">' +
      (THEME_ICONS[S.theme || 'system'] || '💻') + '</button>' +
      '<button class="pill cso-ctl-a11y" id="cso-ctl-a11y" type="button">♿ Accessibility ⌄</button>' +
      '<span class="pill cso-ctl-zoom">' +
      '<button class="fz" id="cso-ctl-fm" type="button" aria-label="Smaller text">A–</button>' +
      '<button class="fz" id="cso-ctl-fr" type="button" aria-label="Normal text">A</button>' +
      '<button class="fz" id="cso-ctl-fp" type="button" aria-label="Larger text">A+</button>' +
      '</span>';

    const bt = document.getElementById('cso-ctl-theme');
    if (bt) {
      bt.onclick = () => {
        const i = THEMES.indexOf(S.theme || 'system');
        S.theme = THEMES[(i + 1) % THEMES.length];
        saveSettings();
        applySettings();
        renderControls();
      };
    }

    const setZoom = d => {
      S.zoom = d ? Math.max(0.85, Math.min(1.3, +(S.zoom + d).toFixed(2))) : 1;
      saveSettings();
      applySettings();
    };
    const fm = document.getElementById('cso-ctl-fm');
    if (fm) fm.onclick = () => setZoom(-0.05);
    const fr = document.getElementById('cso-ctl-fr');
    if (fr) fr.onclick = () => setZoom(0);
    const fp = document.getElementById('cso-ctl-fp');
    if (fp) fp.onclick = () => setZoom(0.05);

    const langBtn = document.getElementById('cso-ctl-lang');
    if (langBtn) {
      langBtn.onclick = e => {
        showPopup(e.target, Object.keys(LN).map(k => [
          LN[k],
          () => {
            S.lang = k;
            saveSettings();
            applySettings();
            renderControls();
          },
          S.lang === k
        ]));
      };
    }

    const a11yBtn = document.getElementById('cso-ctl-a11y');
    if (a11yBtn) {
      a11yBtn.onclick = e => {
        showPopup(e.target, [
          ['High contrast', () => { S.hc = +!S.hc; saveSettings(); applySettings(); }, !!S.hc],
          ['Underline links', () => { S.ul = +!S.ul; saveSettings(); applySettings(); }, !!S.ul],
          ['Reduce motion', () => { S.rm = +!S.rm; saveSettings(); applySettings(); }, !!S.rm],
          ['Reset', () => { S.hc = S.ul = S.rm = 0; S.zoom = 1; saveSettings(); applySettings(); }]
        ]);
      };
    }
  }

  function renderAuth() {
    const authEl = document.getElementById('auth');
    if (!authEl) return;
    if (window.CSOAuthClient && typeof window.CSOAuthClient.getUser === 'function') {
      const u = window.CSOAuthClient.getUser();
      if (u) {
        authEl.innerHTML = '<span class="mut" style="font-size:13px;font-weight:600">' + (u.fullName || u.email || 'User') + '</span>';
        return;
      }
    }
    authEl.innerHTML =
      '<div class="cso-desktop-auth-buttons">' +
        '<a href="' + root + '#login" class="cso-auth-item-link" style="font-size:13px;color:var(--tx);text-decoration:none;font-weight:600">Sign In</a>' +
      '</div>' +
      '<div class="cso-mobile-auth-wrapper">' +
        '<button type="button" class="cso-auth-trigger" id="cso-auth-trigger" aria-haspopup="true" aria-expanded="false" aria-label="Account options">' +
          '<span class="auth-icon" aria-hidden="true">👤</span>' +
          '<span class="auth-label">Account</span>' +
          '<span class="auth-arrow" aria-hidden="true">▾</span>' +
        '</button>' +
        '<div class="cso-auth-dropdown-menu" id="cso-auth-menu" hidden>' +
          '<a href="' + root + '#login" class="cso-auth-item">Login</a>' +
          '<a href="' + root + '#signup" class="cso-auth-item">Sign Up</a>' +
        '</div>' +
      '</div>';
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

    navw.innerHTML =
      '<div class="cso-nav-bar-container">' +
      '<button type="button" class="cso-nav-mobile" id="cso-menu-toggle" aria-expanded="false" aria-controls="cso-nav-items" aria-label="Navigation Menu">' +
      '<span aria-hidden="true">☰</span> Menu</button>' +
      '<div class="cso-mobile-acc-cluster">' +
      '<button type="button" class="pill cso-ctl-a11y-mobile acc-btn" id="cso-ctl-a11y-mobile" aria-label="Accessibility options">♿ Options</button>' +
      '<span class="pill cso-ctl-zoom-mobile acc-btn">' +
      '<button type="button" class="fz" id="cso-ctl-fm-mobile" aria-label="Smaller text">A–</button>' +
      '<button type="button" class="fz" id="cso-ctl-fr-mobile" aria-label="Normal text">A</button>' +
      '<button type="button" class="fz" id="cso-ctl-fp-mobile" aria-label="Larger text">A+</button>' +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div id="cso-nav-items" class="cso-nav-items">' +
      '<a href="' + root + '" class="cso-nav-home' + (!activeSection && (pathname === '/' || pathname.endsWith('/index.html') || pathname === '') ? ' on' : '') + '"><span aria-hidden="true">🏠</span> Home</a>' +
      NAV.map(([s, t, i]) =>
        '<div class="ni' + (s === activeSection ? ' cso-active' : '') + '">' +
        '<div class="cso-nav-parent">' +
        '<a href="' + root + s + '/"' + (s === activeSection ? ' class="on" aria-current="page"' : '') + '>' +
        '<span aria-hidden="true">' + i + '</span> ' + t + '</a>' +
        '<button type="button" class="cso-nav-arrow" aria-label="Toggle ' + t + ' menu" aria-haspopup="true" aria-expanded="false" aria-controls="cso-nav-dd-' + s + '">⌄</button>' +
        '</div>' +
        '<div class="dd" id="cso-nav-dd-' + s + '">' +
        MENUS[s].map((x, index) =>
          '<a href="' + root + s + '/?section=' + index + '">' +
          '<span class="dd-bullet" aria-hidden="true">›</span><span>' + x + '</span></a>'
        ).join('') +
        '</div>' +
        '</div>'
      ).join('') +
      '</div>';
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

  function init() {
    applySettings();
    renderControls();
    renderAuth();
    renderNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
