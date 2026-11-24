/**
 * Common Sense Odisha — Clean-Slate Candidate Workspace Controller (v238)
 * 100% live D1 driven (/api/auth/me, /api/candidate/bookmarks, /api/nav/config).
 * Strict CSP-compliant: safe DOM construction APIs only, zero inline styles.
 */
(function () {
  'use strict';

  const EMPTY_WORKSPACE_MSG = 'Your workspace is clean — save items from published sections or add modules in Admin Studio.';
  const SESSION_KEY = 'cso_candidate_session_v1';
  const PROFILE_KEY = 'cso_candidate_profile';

  const state = {
    user: null,
    controls: {},
    bookmarks: [],
    modules: []
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function safeUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  function showToast(msg, isError) {
    const host = document.getElementById('cso-toast-container');
    if (!host) return;
    const toast = el('div', isError ? 'cso-toast is-error' : 'cso-toast', msg);
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function initEmblemFallback() {
    document.querySelectorAll('img.cso-brand-emblem').forEach(img => {
      img.addEventListener('error', () => {
        if (img.dataset.fallbackApplied === '1') return;
        img.dataset.fallbackApplied = '1';
        img.src = '/assets/img/cso-logo-96.png';
      });
    });
  }

  function initThemeSwitcher() {
    const fallback = [
      { key: 'system', label: 'System', fullLabel: 'System' },
      { key: 'dark', label: 'Dark', fullLabel: 'Dark' },
      { key: 'reading', label: 'Reading', fullLabel: 'Reading Mode' },
      { key: 'utkal-bharat', label: 'Odisha & Bharat', fullLabel: 'Odisha & Bharat' }
    ];
    const themes = () => (window.CSOTheme && window.CSOTheme.THEMES) || fallback;
    const current = () => (window.CSOTheme ? window.CSOTheme.getTheme() : 'system');

    function syncBtn() {
      const key = current();
      const cur = themes().find(t => t.key === key) || themes()[0];
      const lbl = document.getElementById('cso-theme-label');
      const sw = document.getElementById('cso-theme-swatch');
      if (lbl) lbl.textContent = cur.label;
      if (sw) sw.className = 'cso-theme-swatch is-' + cur.key;
    }

    function closeMenu() {
      document.querySelectorAll('.cso-hub-theme-menu').forEach(n => n.remove());
      document.getElementById('cso-theme-toggle')?.setAttribute('aria-expanded', 'false');
    }

    const btn = document.getElementById('cso-theme-toggle');
    syncBtn();
    if (btn) {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        if (document.querySelector('.cso-hub-theme-menu')) {
          closeMenu();
          return;
        }
        const menu = el('div', 'pp cso-hub-theme-menu');
        menu.setAttribute('role', 'menu');
        const active = current();
        themes().forEach(t => {
          const item = el('button', t.key === active ? 'is-active' : '', (t.key === active ? '✓ ' : '') + t.fullLabel);
          item.type = 'button';
          item.setAttribute('role', 'menuitemradio');
          item.setAttribute('aria-checked', String(t.key === active));
          item.addEventListener('click', e => {
            e.stopPropagation();
            if (window.CSOTheme) window.CSOTheme.setTheme(t.key, true);
            syncBtn();
            closeMenu();
          });
          menu.appendChild(item);
        });
        (btn.closest('.cso-popup-anchor') || btn.parentElement).appendChild(menu);
        btn.setAttribute('aria-expanded', 'true');
      });
    }
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeMenu(); });
  }

  function renderProfile() {
    const u = state.user || {};
    const name = u.fullName || u.name || 'Candidate';
    const district = u.district || '';
    ['bp-side-name', 'bp-top-name'].forEach(id => {
      const n = document.getElementById(id);
      if (n) n.textContent = name;
    });
    ['bp-side-district', 'bp-top-district'].forEach(id => {
      const n = document.getElementById(id);
      if (n) n.textContent = district;
    });

    const noticeBanner = document.getElementById('cso-admin-notice-banner');
    const noticeLvl = document.getElementById('cso-admin-notice-level');
    const noticeTxt = document.getElementById('cso-admin-notice-text');
    if (noticeBanner && state.controls && state.controls.admin_notice_text) {
      noticeBanner.hidden = false;
      if (noticeLvl) noticeLvl.textContent = String(state.controls.admin_notice_level || 'info').toUpperCase();
      if (noticeTxt) noticeTxt.textContent = String(state.controls.admin_notice_text);
    } else if (noticeBanner) {
      noticeBanner.hidden = true;
    }
  }

  function renderSidebar() {
    const nav = document.getElementById('bp-sidebar-nav');
    if (!nav) return;
    nav.replaceChildren();
    if (!state.modules.length) return;

    const list = el('ul', 'bp-nav-list');
    state.modules.forEach(mod => {
      const li = el('li');
      const a = el('a', 'bp-nav-item');
      a.href = safeUrl(mod.url) || '#';
      a.appendChild(el('span', 'bp-nav-text', mod.title));
      li.appendChild(a);
      list.appendChild(li);
    });
    nav.appendChild(list);
  }

  function renderWorkspace() {
    const emptyEl = document.getElementById('cso-workspace-empty');
    const itemsEl = document.getElementById('cso-workspace-items');
    if (!emptyEl || !itemsEl) return;

    itemsEl.replaceChildren();
    if (!state.bookmarks.length && !state.modules.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = EMPTY_WORKSPACE_MSG;
      itemsEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    itemsEl.hidden = false;

    state.bookmarks.forEach(bm => {
      const card = el('article', 'bp-panel');
      const title = bm.postTitle || bm.title || 'Saved Item';
      card.appendChild(el('h3', '', title));
      const href = safeUrl(bm.postUrl || bm.url);
      if (href) {
        const link = el('a', 'cso-btn cso-btn-sm', 'Open →');
        link.href = href;
        card.appendChild(link);
      }
      itemsEl.appendChild(card);
    });
  }

  async function performSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    [SESSION_KEY, PROFILE_KEY, 'cso_auth_token'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    window.location.replace('/login.html');
  }

  function openProfileModal() {
    const modal = document.getElementById('cso-profile-modal');
    if (!modal) return;
    const u = state.user || {};
    const nameEl = document.getElementById('edit-candidate-name');
    const mobEl = document.getElementById('edit-candidate-mobile');
    const distEl = document.getElementById('edit-candidate-district');
    if (nameEl) nameEl.value = u.fullName || u.name || '';
    if (mobEl) mobEl.value = u.mobile || '';
    if (distEl) distEl.value = u.district || '';
    modal.hidden = false;
  }

  function closeProfileModal() {
    const modal = document.getElementById('cso-profile-modal');
    if (modal) modal.hidden = true;
  }

  async function saveProfile(e) {
    e.preventDefault();
    const nameEl = document.getElementById('edit-candidate-name');
    const mobEl = document.getElementById('edit-candidate-mobile');
    const distEl = document.getElementById('edit-candidate-district');
    const payload = {
      fullName: nameEl ? nameEl.value.trim() : '',
      mobile: mobEl ? mobEl.value.trim() : '',
      district: distEl ? distEl.value.trim() : ''
    };
    if (!payload.fullName) return;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Unable to save profile');
      state.user = Object.assign({}, state.user || {}, payload);
      renderProfile();
      closeProfileModal();
      showToast('Profile saved');
    } catch (_) {
      showToast('Could not save profile right now.', true);
    }
  }

  async function hydrateWorkspace() {
    const [meRes, bmRes, navRes] = await Promise.allSettled([
      fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/candidate/bookmarks', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/nav/config', { cache: 'no-store' })
    ]);

    if (meRes.status === 'fulfilled' && meRes.value.ok) {
      try {
        const me = await meRes.value.json();
        state.user = me.user || me.candidate || me || null;
        if (me.controls) state.controls = me.controls;
      } catch {}
    }

    if (bmRes.status === 'fulfilled' && bmRes.value.ok) {
      try {
        const bmData = await bmRes.value.json();
        state.bookmarks = Array.isArray(bmData && bmData.bookmarks) ? bmData.bookmarks : [];
      } catch {}
    }

    if (navRes.status === 'fulfilled' && navRes.value.ok) {
      try {
        const navData = await navRes.value.json();
        const cats = Array.isArray(navData && navData.categories) ? navData.categories : [];
        const hub = cats.find(c => c.slug === 'candidate-hub' || c.target_portal === 'student-dashboard');
        const subs = hub && Array.isArray(hub.subcategories) ? hub.subcategories : [];
        state.modules = subs.map(s => ({
          title: s.name_en || s.slug || 'Module',
          url: s.landing_url || '#'
        }));
      } catch {}
    }

    renderProfile();
    renderSidebar();
    renderWorkspace();
  }

  function wireControls() {
    const sb = document.getElementById('bp-sidebar');
    document.getElementById('bp-sidebar-toggle-btn')?.addEventListener('click', () => sb?.classList.toggle('is-collapsed'));
    document.getElementById('bp-mobile-menu-trigger')?.addEventListener('click', () => sb?.classList.toggle('mobile-open'));
    document.getElementById('bp-topbar-logout-btn')?.addEventListener('click', performSignOut);
    document.getElementById('bp-topbar-user-btn')?.addEventListener('click', openProfileModal);
    document.getElementById('bp-sidebar-user-btn')?.addEventListener('click', openProfileModal);
    document.getElementById('cso-profile-modal-close')?.addEventListener('click', closeProfileModal);
    document.getElementById('cso-profile-cancel-btn')?.addEventListener('click', closeProfileModal);
    document.getElementById('cso-profile-editor-form')?.addEventListener('submit', saveProfile);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEmblemFallback();
    initThemeSwitcher();
    wireControls();
    hydrateWorkspace();
  });
})();
