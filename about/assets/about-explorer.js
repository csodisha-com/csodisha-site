/* Clean-slate v235: /about/ explorer — 100% live D1 & /api/nav/config driven.
   Strict CSP: DOM APIs only, addEventListener handlers, zero innerHTML, zero .style.*. */
(function () {
  'use strict';

  const EMPTY_STATE_TEXT = 'No items published yet — add categories or content in Admin Studio.';
  const $ = (id) => document.getElementById(id);

  let currentLang = 'en';
  let liveSections = [];
  let activeSlug = '';
  let searchQuery = '';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function pick(en, or) {
    return currentLang === 'or' && or ? or : (en || or || '');
  }

  function safeUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  function applyLanguage(lang) {
    currentLang = lang === 'or' ? 'or' : 'en';
    document.documentElement.lang = currentLang === 'or' ? 'or' : 'en';
    try { localStorage.setItem('cso_lang_pref', currentLang); } catch { /* ignore */ }

    document.querySelectorAll('[data-i18n-or]').forEach((node) => {
      if (!node.dataset.i18nEn) node.dataset.i18nEn = node.textContent;
      node.textContent = currentLang === 'or' ? node.dataset.i18nOr : node.dataset.i18nEn;
    });

    const toggleBtn = $('about-lang-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = currentLang === 'or' ? 'ଓଡ଼ିଆ / EN' : 'EN / ଓଡ଼ିଆ';
    }
    renderAll();
  }

  function setContext(label) {
    const ctxPill = $('about-context-pill');
    if (ctxPill) ctxPill.textContent = '⌂ ' + (label || 'Overview');
  }

  function renderSidebar() {
    const navEl = $('about-rail-nav');
    if (!navEl) return;
    navEl.replaceChildren();

    if (!liveSections.length) {
      navEl.appendChild(el('div', 'cso-empty-state cso-about-muted', EMPTY_STATE_TEXT));
      return;
    }

    const allLink = el('a', `cso-about-nav-link${!activeSlug ? ' is-active' : ''}`);
    allLink.href = '#overview';
    allLink.append(
      el('span', 'cso-about-nav-num', '◆'),
      el('span', 'cso-about-rail-label', pick('All Sections', 'ସମସ୍ତ ବିଭାଗ'))
    );
    allLink.addEventListener('click', (e) => {
      e.preventDefault();
      activeSlug = '';
      setContext('Overview');
      renderAll();
      closeMobileDrawer();
    });
    navEl.appendChild(allLink);

    liveSections.forEach((sec, idx) => {
      const link = el('a', `cso-about-nav-link${activeSlug === sec.slug ? ' is-active' : ''}`);
      link.href = sec.url || `#${encodeURIComponent(sec.slug)}`;
      link.append(
        el('span', 'cso-about-nav-num', String(idx + 1).padStart(2, '0')),
        el('span', 'cso-about-rail-label', pick(sec.title, sec.title_or))
      );
      if (!sec.url) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          activeSlug = sec.slug;
          setContext(pick(sec.title, sec.title_or));
          renderAll();
          closeMobileDrawer();
        });
      }
      navEl.appendChild(link);
    });
  }

  function renderGrid() {
    const mount = $('about-directory-grid');
    const statusEl = $('about-load-status');
    if (!mount) return;
    mount.replaceChildren();

    const needle = searchQuery.trim().toLowerCase();
    const filtered = liveSections.filter((sec) => {
      if (activeSlug && sec.slug !== activeSlug) return false;
      if (!needle) return true;
      const hay = [sec.title, sec.title_or, sec.summary, sec.summary_or, sec.badge].join(' ').toLowerCase();
      return hay.includes(needle);
    });

    if (!filtered.length) {
      if (statusEl) statusEl.textContent = EMPTY_STATE_TEXT;
      const emptyCard = el('article', 'cso-about-dir-card cso-empty-state');
      emptyCard.append(
        el('h3', '', pick('No items published yet', 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିଷୟ ପ୍ରକାଶିତ ହୋଇନାହିଁ')),
        el('p', '', EMPTY_STATE_TEXT)
      );
      mount.appendChild(emptyCard);
      return;
    }

    if (statusEl) {
      statusEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'published section' : 'published sections'}`;
    }

    filtered.forEach((sec) => {
      const card = el('article', 'cso-about-dir-card');
      if (sec.badge) card.appendChild(el('span', 'cso-about-tag', sec.badge));
      card.appendChild(el('h3', '', pick(sec.title, sec.title_or)));
      const desc = pick(sec.summary, sec.summary_or);
      if (desc) card.appendChild(el('p', '', desc));
      const href = safeUrl(sec.url);
      if (href) {
        const link = el('a', '', pick('Open Section →', 'ବିଭାଗ ଖୋଲନ୍ତୁ →'));
        link.href = href;
        if (/^https?:\/\//i.test(href)) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        card.appendChild(link);
      }
      mount.appendChild(card);
    });
  }

  function renderAll() {
    renderSidebar();
    renderGrid();
  }

  async function loadLiveAboutData() {
    const statusEl = $('about-load-status');
    if (statusEl) statusEl.textContent = 'Loading…';

    const [dirRes, navRes, ovRes] = await Promise.allSettled([
      fetch('/api/content/about-directory', { headers: { Accept: 'application/json' }, cache: 'no-store' }),
      fetch('/api/nav/config', { headers: { Accept: 'application/json' }, cache: 'no-store' }),
      fetch('/api/about/overview', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    ]);

    const items = [];
    const seen = new Set();

    if (dirRes.status === 'fulfilled' && dirRes.value.ok) {
      try {
        const data = await dirRes.value.json();
        const groups = Array.isArray(data?.groups) ? data.groups : [];
        const entries = Array.isArray(data?.entries) ? data.entries : [];
        const flat = entries.length ? entries : groups;
        flat.forEach((node, idx) => {
          const slug = String(node.slug || node.id || `about-${idx}`);
          if (seen.has(slug)) return;
          seen.add(slug);
          items.push({
            slug,
            title: node.title || slug,
            title_or: node.title_or || '',
            summary: node.subtitle || node.body_text || '',
            summary_or: node.subtitle_or || node.body_text_or || '',
            badge: node.badge_text || node.level || '',
            url: node.official_url || ''
          });
        });
      } catch { /* ignore */ }
    }

    if (navRes.status === 'fulfilled' && navRes.value.ok) {
      try {
        const navData = await navRes.value.json();
        const cats = Array.isArray(navData?.categories) ? navData.categories : [];
        const pillar = cats.find((c) => c.slug === 'about' || c.target_portal === 'about');
        const subs = pillar && Array.isArray(pillar.subcategories) ? pillar.subcategories : [];
        subs.forEach((sub, idx) => {
          const slug = String(sub.slug || sub.id || `nav-about-${idx}`);
          if (seen.has(slug)) return;
          seen.add(slug);
          items.push({
            slug,
            title: sub.name_en || slug,
            title_or: sub.name_or || '',
            summary: sub.description_en || '',
            summary_or: sub.description_or || '',
            badge: sub.code || 'About',
            url: sub.landing_url || ''
          });
        });
      } catch { /* ignore */ }
    }

    if (ovRes.status === 'fulfilled' && ovRes.value.ok) {
      try { await ovRes.value.json(); } catch { /* live telemetry warmed */ }
    }

    liveSections = items;
    renderAll();
  }

  function closeMobileDrawer() {
    const rail = document.querySelector('.cso-about-rail');
    const backdrop = $('about-backdrop');
    if (rail) rail.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  function initSidebarAndSearch() {
    const shell = $('about-shell');
    const rail = document.querySelector('.cso-about-rail');
    const toggleBtn = $('about-rail-toggle');
    const railCloseBtn = $('about-rail-close');
    const backdrop = $('about-backdrop');
    const topToggle = $('about-topbar-toggle');
    const topSearch = $('about-topbar-search');
    const topClear = $('about-topbar-clear');

    if (shell && toggleBtn) {
      let collapsed = false;
      try { collapsed = localStorage.getItem('cso_about_rail_collapsed') === '1'; } catch { /* ignore */ }
      shell.classList.toggle('is-collapsed', collapsed);
      toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggleBtn.addEventListener('click', () => {
        const next = !shell.classList.contains('is-collapsed');
        shell.classList.toggle('is-collapsed', next);
        toggleBtn.setAttribute('aria-expanded', next ? 'false' : 'true');
        if (topToggle) topToggle.setAttribute('aria-expanded', next ? 'false' : 'true');
        try { localStorage.setItem('cso_about_rail_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      });
    }

    if (topToggle && shell) {
      topToggle.addEventListener('click', () => {
        if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) {
          const open = !(rail && rail.classList.contains('is-open'));
          if (rail) rail.classList.toggle('is-open', open);
          if (backdrop) backdrop.classList.toggle('is-open', open);
          topToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        } else {
          const next = !shell.classList.contains('is-collapsed');
          shell.classList.toggle('is-collapsed', next);
          topToggle.setAttribute('aria-expanded', next ? 'false' : 'true');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', next ? 'false' : 'true');
          try { localStorage.setItem('cso_about_rail_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
        }
      });
    }

    if (railCloseBtn) railCloseBtn.addEventListener('click', closeMobileDrawer);
    if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);

    if (topSearch) {
      topSearch.addEventListener('input', () => {
        searchQuery = topSearch.value || '';
        if (topClear) topClear.hidden = !searchQuery.trim();
        setContext(searchQuery.trim() ? `Search: ${searchQuery.trim()}` : 'Overview');
        renderGrid();
      });
    }
    if (topClear) {
      topClear.addEventListener('click', () => {
        if (topSearch) { topSearch.value = ''; topSearch.focus(); }
        searchQuery = '';
        topClear.hidden = true;
        setContext('Overview');
        renderGrid();
      });
    }
  }

  function initEmblemFallback() {
    document.querySelectorAll('img.cso-brand-emblem').forEach((img) => {
      img.addEventListener('error', () => {
        if (img.dataset.fallbackApplied === '1') return;
        img.dataset.fallbackApplied = '1';
        img.src = '/assets/img/cso-logo-96.png';
      });
    });
  }

  function boot() {
    let savedLang = 'en';
    try {
      if (localStorage.getItem('cso_lang_pref') === 'or') savedLang = 'or';
    } catch { /* ignore */ }

    initSidebarAndSearch();
    initEmblemFallback();
    applyLanguage(savedLang);

    const langToggle = $('about-lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        applyLanguage(currentLang === 'or' ? 'en' : 'or');
      });
    }

    loadLiveAboutData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
