/**
 * Common Sense Odisha — Live D1-Driven Candidate Hub Workspace Controller (v244)
 * Hydrates 100% from /api/candidate/hub-config, /api/candidate/workspace, /api/candidate/matches
 * & /api/candidate/profile. Admin controls layout, UI config, core & custom features,
 * document templates, targeted content, and account access (403 blocked screen / 401 revocation).
 * Strict CSP-compliant: safe DOM APIs only, zero innerHTML / inline styles / inline handlers.
 */
(function () {
  'use strict';

  const EMPTY_WORKSPACE_MSG = 'Your workspace is clean — save items from published sections or add modules in Admin Studio.';
  const SESSION_KEY = 'cso_candidate_session_v1';
  const PROFILE_KEY = 'cso_candidate_profile';

  const state = {
    lang: 'en',
    activeModuleKey: 'overview',
    ui: null,
    profile: null,
    governance: null,
    controls: {},
    modules: [],
    docTemplates: [],
    assignedItems: [],
    bookmarks: [],
    locker: {},
    notes: '',
    mockScores: [],
    matches: null,
    restricted: null
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

  function pick(obj, field) {
    if (!obj) return '';
    if (state.lang === 'or' && obj[field + '_or']) return String(obj[field + '_or']);
    return String(obj[field + '_en'] || '');
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

  function applyThemeKey(themeKey) {
    const valid = ['system', 'dark', 'reading', 'utkal-bharat'];
    const key = valid.includes(themeKey) ? themeKey : 'system';
    const root = document.documentElement;
    root.setAttribute('data-cso-theme', key);
    root.setAttribute('data-theme', key === 'utkal-bharat' ? 'odisha' : key);
    if (key === 'dark') {
      root.setAttribute('data-cso-resolved-mode', 'dark');
    } else if (key === 'system') {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-cso-resolved-mode', dark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-cso-resolved-mode', 'light');
    }
    const labels = { system: 'System', dark: 'Dark Night', reading: 'Reading Mode', 'utkal-bharat': 'Odisha & Bharat' };
    const lbl = document.getElementById('cso-theme-label');
    const sw = document.getElementById('cso-theme-swatch');
    if (lbl) lbl.textContent = labels[key] || 'System';
    if (sw) sw.className = 'cso-theme-swatch is-' + key;
  }

  function initThemeSwitcher() {
    const themes = [
      { key: 'system', label: 'System' },
      { key: 'dark', label: 'Dark Night' },
      { key: 'reading', label: 'Reading Mode' },
      { key: 'utkal-bharat', label: 'Odisha & Bharat' }
    ];
    let saved = 'system';
    try { saved = localStorage.getItem('cso_portal_theme') || 'system'; } catch {}
    applyThemeKey(saved);

    function closeMenu() {
      document.querySelectorAll('.cso-hub-theme-menu').forEach(n => n.remove());
      document.getElementById('cso-theme-toggle')?.setAttribute('aria-expanded', 'false');
    }

    const btn = document.getElementById('cso-theme-toggle');
    if (btn) {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        if (document.querySelector('.cso-hub-theme-menu')) { closeMenu(); return; }
        const menu = el('div', 'pp cso-hub-theme-menu');
        menu.setAttribute('role', 'menu');
        const active = document.documentElement.getAttribute('data-cso-theme') || 'system';
        themes.forEach(t => {
          const item = el('button', t.key === active ? 'is-active' : '', (t.key === active ? '✓ ' : '') + t.label);
          item.type = 'button';
          item.setAttribute('role', 'menuitemradio');
          item.setAttribute('aria-checked', String(t.key === active));
          item.addEventListener('click', e => {
            e.stopPropagation();
            try { localStorage.setItem('cso_portal_theme', t.key); } catch {}
            applyThemeKey(t.key);
            if (window.CSOTheme && window.CSOTheme.setTheme) window.CSOTheme.setTheme(t.key, true);
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

  async function purgeAuthDashboardCaches() {
    if (typeof caches === 'undefined') return;
    const targets = ['/student-dashboard/', '/student-dashboard/index.html', '/candidate-hub/', '/login.html', '/api/auth/me'];
    try {
      const work = (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map(async key => {
          const cache = await caches.open(key);
          await Promise.all(targets.map(path => cache.delete(path, { ignoreSearch: true }).catch(() => false)));
        }));
      })();
      await Promise.race([work, new Promise(r => setTimeout(r, 80))]);
    } catch {}
  }

  function finishHydration() {
    const skel = document.getElementById('cso-workspace-skeleton');
    if (skel) skel.hidden = true;
    const navSkel = document.getElementById('bp-sidebar-skeleton');
    if (navSkel) navSkel.remove();
    const layout = document.getElementById('bp-app-layout');
    if (layout) layout.classList.remove('is-hydrating');
  }

  async function performSignOut() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' }); } catch {}
    [SESSION_KEY, PROFILE_KEY, 'cso_auth_token'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    await purgeAuthDashboardCaches();
    window.location.replace('/login.html');
  }

  function renderRestrictedScreen(info) {
    const host = document.getElementById('cso-restricted-screen');
    const ws = document.getElementById('cso-candidate-workspace');
    const stats = document.getElementById('cso-hub-quick-stats');
    const tabs = document.getElementById('cso-hub-top-tabs');
    const notice = document.getElementById('cso-admin-notice-banner');
    if (ws) ws.hidden = true;
    if (stats) stats.hidden = true;
    if (tabs) tabs.hidden = true;
    if (notice) notice.hidden = true;
    if (!host) return;
    host.hidden = false;
    host.replaceChildren();
    const card = el('section', 'cso-restricted-card');
    card.setAttribute('role', 'alert');
    card.appendChild(el('h2', '', 'Account Access Restricted'));
    card.appendChild(el('p', '', 'Status: ' + String(info.account_status || 'blocked').toUpperCase()));
    card.appendChild(el('div', 'cso-restricted-reason', info.block_reason || info.error || 'Your account has been restricted by an administrator.'));
    const out = el('button', 'cso-btn cso-btn-primary', 'Sign Out');
    out.type = 'button';
    out.addEventListener('click', performSignOut);
    card.appendChild(out);
    host.appendChild(card);
  }

  function applyUiShell() {
    const ui = state.ui || {};
    const layout = document.getElementById('bp-app-layout');
    if (layout) {
      layout.classList.toggle('bp-layout--toptabs', ui.layout_mode === 'top_tabs_cards');
      layout.classList.toggle('bp-sidebar--hidden', ui.show_sidebar === 0);
    }

    const titleEl = document.getElementById('bp-topbar-title');
    const subEl = document.getElementById('bp-topbar-subtitle');
    if (titleEl && (ui.hero_title_en || ui.hero_title_or)) titleEl.textContent = pick(ui, 'hero_title') || 'Candidate Workspace';
    if (subEl && (ui.hero_subtitle_en || ui.hero_subtitle_or)) subEl.textContent = pick(ui, 'hero_subtitle');

    const themeAnchor = document.getElementById('cso-theme-anchor');
    if (themeAnchor) themeAnchor.hidden = ui.allow_theme_switch === 0;
    let hasUserTheme = false;
    try { hasUserTheme = Boolean(localStorage.getItem('cso_portal_theme')); } catch {}
    if ((!hasUserTheme || ui.allow_theme_switch === 0) && ui.default_theme) {
      applyThemeKey(ui.default_theme);
    }

    const banner = document.getElementById('cso-admin-notice-banner');
    const lvl = document.getElementById('cso-admin-notice-level');
    const txt = document.getElementById('cso-admin-notice-text');
    const bannerMsg = ui.show_announcement ? pick(ui, 'announcement_banner') : '';
    const adminMsg = state.controls && state.controls.admin_notice_text ? String(state.controls.admin_notice_text) : '';
    const finalMsg = adminMsg || bannerMsg;
    if (banner && finalMsg) {
      const kind = adminMsg ? (state.controls.admin_notice_level || 'info') : (ui.announcement_type || 'info');
      banner.className = 'cso-hub-banner cso-hub-banner--' + (kind === 'urgent' ? 'warning' : kind);
      banner.hidden = false;
      if (lvl) lvl.textContent = String(kind).toUpperCase();
      if (txt) txt.textContent = finalMsg;
    } else if (banner) {
      banner.hidden = true;
    }

    const u = state.profile || {};
    const cp = state.communityProfile || null;
    const tierTag = cp && cp.membership_tier === 'permanent_member' ? ' 👑 Permanent' : (cp && cp.membership_tier === 'pro_member' ? ' ⭐ Pro' : '');
    const name = (u.fullName || 'Candidate') + tierTag;
    const dist = u.district || '';
    ['bp-side-name', 'bp-top-name'].forEach(id => { const n = document.getElementById(id); if (n) n.textContent = name; });
    ['bp-side-district', 'bp-top-district'].forEach(id => { const n = document.getElementById(id); if (n) n.textContent = dist; });
  }

  function renderNavigation() {
    const ui = state.ui || {};
    const navMods = state.modules.filter(m => m.layout_slot === 'sidebar' || m.layout_slot === 'both' || m.module_key === 'overview');
    const sideNav = document.getElementById('bp-sidebar-nav');
    if (sideNav) {
      sideNav.replaceChildren();
      const list = el('ul', 'bp-nav-list');
      navMods.forEach(m => {
        const li = el('li');
        const b = el('button', 'bp-nav-btn' + (state.activeModuleKey === m.module_key ? ' is-active' : ''));
        b.type = 'button';
        b.appendChild(el('span', '', m.icon || '📌'));
        b.appendChild(el('span', 'bp-nav-text', pick(m, 'title')));
        b.addEventListener('click', () => {
          state.activeModuleKey = m.module_key;
          document.getElementById('bp-sidebar')?.classList.remove('mobile-open');
          renderNavigation();
          renderWorkspace();
        });
        li.appendChild(b);
        list.appendChild(li);
      });
      sideNav.appendChild(list);
    }

    const topTabs = document.getElementById('cso-hub-top-tabs');
    if (topTabs) {
      topTabs.replaceChildren();
      const showTop = ui.layout_mode === 'top_tabs_cards' || ui.show_sidebar === 0;
      topTabs.hidden = !showTop || !navMods.length;
      if (!topTabs.hidden) {
        navMods.forEach(m => {
          const b = el('button', 'cso-hub-tab-btn' + (state.activeModuleKey === m.module_key ? ' is-active' : ''));
          b.type = 'button';
          b.appendChild(el('span', '', (m.icon || '') + ' ' + pick(m, 'title')));
          b.addEventListener('click', () => {
          state.activeModuleKey = m.module_key;
          document.getElementById('bp-sidebar')?.classList.remove('mobile-open');
          renderNavigation();
          renderWorkspace();
        });
          topTabs.appendChild(b);
        });
      }
    }
  }

  function renderQuickStats() {
    const host = document.getElementById('cso-hub-quick-stats');
    if (!host) return;
    const ui = state.ui || {};
    if (ui.show_quick_stats === 0 || !state.modules.length) { host.hidden = true; return; }
    host.hidden = false;
    host.replaceChildren();
    const totalDocs = Math.max(1, state.docTemplates.length);
    const doneDocs = state.docTemplates.filter(d => Boolean(state.locker[d.doc_key])).length;
    const docsPct = state.docTemplates.length ? Math.round((doneDocs / totalDocs) * 100) : 0;
    const cp = state.communityProfile || null;
    const stats = [
      ['Assigned Items', String(state.assignedItems.length)],
      ['Saved Deadlines', String(state.bookmarks.length)],
      ['Docs Ready', docsPct + '%'],
      ['Mock Tests', String(state.mockScores.length)]
    ];
    if (cp) {
      const tierTxt = cp.membership_tier === 'permanent_member' ? '👑 Permanent' : (cp.membership_tier === 'pro_member' ? '⭐ Pro' : 'Standard');
      stats.push(['Community Tier', tierTxt + ' · ' + (cp.reputation_xp || 0) + ' XP']);
      stats.push(['Circles / Unread DMs', (cp.joined_communities_count || 0) + ' / ' + (cp.unread_messages_count || 0)]);
    }
    stats.forEach(s => {
      const box = el('div', 'cso-hub-stat');
      box.appendChild(el('span', 'cso-hub-stat__val', s[1]));
      box.appendChild(el('span', 'cso-hub-stat__lbl', s[0]));
      host.appendChild(box);
    });
  }

  function makeCard(mod, forceFull) {
    const spanCls = (forceFull || mod.card_span === 'full') ? ' cso-hub-card--full' : '';
    const accentCls = mod.accent_variant ? ' cso-hub-card--' + mod.accent_variant : '';
    const card = el('article', 'cso-hub-card' + spanCls + accentCls);
    const head = el('div', 'cso-hub-card__head');
    const copy = el('div');
    copy.appendChild(el('h2', 'cso-hub-card__title', (mod.icon ? mod.icon + ' ' : '') + pick(mod, 'title')));
    const sub = pick(mod, 'subtitle');
    if (sub) copy.appendChild(el('p', 'cso-hub-card__sub', sub));
    head.appendChild(copy);
    card.appendChild(head);
    return card;
  }

  async function saveWorkspacePatch(patch, okMsg) {
    try {
      const res = await fetch('/api/candidate/workspace', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('Save failed');
      if (okMsg) showToast(okMsg);
      renderQuickStats();
    } catch {
      showToast('Could not sync to cloud right now.', true);
    }
  }

  const seenSent = new Set();

  function formatBytes(n) {
    n = Number(n || 0);
    if (!n) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function sendAssignedAck(itemId, action) {
    if (!itemId) return;
    fetch('/api/candidate/assigned-items/ack', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, action: action })
    }).catch(() => {});
  }

  // --- Core Module Renderers ---
  function buildAssignedCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const list = el('div', 'cso-hub-list');
    if (!state.assignedItems.length) {
      list.appendChild(el('p', 'cso-muted-note', 'No items assigned to your profile or district yet.'));
    } else {
      state.assignedItems.forEach(it => {
        if (!seenSent.has(it.id)) {
          seenSent.add(it.id);
          sendAssignedAck(it.id, 'seen');
        }
        const row = el('div', 'cso-hub-item' + (it.completed ? ' is-completed' : ''));
        const main = el('div', 'cso-hub-item__main');
        main.appendChild(el('div', 'cso-hub-item__title', pick(it, 'title')));
        const sum = pick(it, 'summary');
        const sizeLbl = formatBytes(it.file_size_bytes);
        const fileInfo = [it.file_ext, sizeLbl].filter(Boolean).join(' · ');
        const metaTxt = [it.item_type.replace(/_/g, ' '), fileInfo, it.expires_at ? 'Valid till ' + it.expires_at : '', sum].filter(Boolean).join(' · ');
        if (metaTxt) main.appendChild(el('div', 'cso-hub-item__meta', metaTxt));
        row.appendChild(main);

        const acts = el('div', 'cso-hub-item__actions');
        if (it.file_ext) acts.appendChild(el('span', 'cso-hub-pill', it.file_ext));
        acts.appendChild(el('span', 'cso-hub-pill cso-hub-pill--' + it.priority, it.priority));
        const href = safeUrl(it.resource_url);
        if (href) {
          const a = el('a', 'cso-btn cso-btn-sm cso-btn-primary', 'Open / Download ↗');
          a.href = href;
          if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
          a.addEventListener('click', () => { it.downloaded = true; sendAssignedAck(it.id, 'download'); });
          acts.appendChild(a);
        }
        const compBtn = el('button', 'cso-btn cso-btn-sm', it.completed ? '✓ Completed' : 'Mark Completed');
        compBtn.type = 'button';
        compBtn.addEventListener('click', () => {
          it.completed = !it.completed;
          sendAssignedAck(it.id, it.completed ? 'complete' : 'uncomplete');
          renderWorkspace();
        });
        acts.appendChild(compBtn);
        row.appendChild(acts);
        list.appendChild(row);
      });
    }
    card.appendChild(list);
    return card;
  }

  function buildMatcherCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const p = state.profile || {};
    const form = el('form', 'cso-hub-inline-form');
    const qWrap = el('div', 'cso-hub-field');
    qWrap.appendChild(el('label', '', 'Qualification'));
    const qIn = el('input'); qIn.type = 'text'; qIn.value = p.qualification || ''; qIn.placeholder = 'e.g. Graduate, 12th, B.Ed';
    qWrap.appendChild(qIn);

    const cWrap = el('div', 'cso-hub-field');
    cWrap.appendChild(el('label', '', 'Category (Odisha Relaxation)'));
    const cSel = el('select');
    [['UR', 'UR (0 yrs)'], ['EWS', 'EWS (0 yrs)'], ['SEBC', 'SEBC (+5 yrs)'], ['SC', 'SC (+5 yrs)'], ['ST', 'ST (+5 yrs)'], ['WOMEN', 'Women (+5 yrs)'], ['PWBD', 'PwBD (+10 yrs)']].forEach(o => {
      const op = el('option', '', o[1]); op.value = o[0]; if (o[0] === (p.category || 'UR')) op.selected = true; cSel.appendChild(op);
    });
    cWrap.appendChild(cSel);

    const aWrap = el('div', 'cso-hub-field');
    aWrap.appendChild(el('label', '', 'Your Age'));
    const aIn = el('input'); aIn.type = 'number'; aIn.min = '16'; aIn.max = '65'; aIn.value = p.age ? String(p.age) : ''; aIn.placeholder = '24';
    aWrap.appendChild(aIn);

    const btnWrap = el('div', 'cso-hub-field');
    btnWrap.appendChild(el('label', '', 'Run Live D1 Match'));
    const runBtn = el('button', 'cso-btn cso-btn-primary', 'Check Eligibility'); runBtn.type = 'submit';
    btnWrap.appendChild(runBtn);

    form.appendChild(qWrap); form.appendChild(cWrap); form.appendChild(aWrap); form.appendChild(btnWrap);
    card.appendChild(form);

    const out = el('div', 'cso-hub-list');
    function drawMatches() {
      out.replaceChildren();
      const m = state.matches;
      if (!m) { out.appendChild(el('p', 'cso-muted-note', 'Loading live D1 opportunities…')); return; }
      const cr = m.criteria || {};
      out.appendChild(el('p', 'cso-muted-note', 'Effective Odisha upper age limit: ' + (cr.effective_max_age || 38) + ' yrs (+' + (cr.relaxation_years || 0) + ' yrs relaxation).'));
      const combined = [].concat(m.jobs || [], m.schemes || []);
      if (!combined.length) {
        out.appendChild(el('p', 'cso-muted-note', 'No published Jobs or Schemes found in D1 yet.'));
        return;
      }
      combined.slice(0, forceFull ? 12 : 4).forEach(item => {
        const row = el('div', 'cso-hub-item');
        const main = el('div', 'cso-hub-item__main');
        main.appendChild(el('div', 'cso-hub-item__title', item.title));
        const meta = [item.kind.toUpperCase(), item.body || item.department || '', item.deadline ? 'Closes ' + item.deadline : '', (item.reasons || []).join(' · ')].filter(Boolean).join(' · ');
        main.appendChild(el('div', 'cso-hub-item__meta', meta));
        row.appendChild(main);
        row.appendChild(el('span', 'cso-hub-pill', item.match_score + '% match'));
        const href = safeUrl(item.url);
        if (href) { const a = el('a', 'cso-btn cso-btn-sm', 'View →'); a.href = href; row.appendChild(a); }
        out.appendChild(row);
      });
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const qs = '?qualification=' + encodeURIComponent(qIn.value.trim()) + '&category=' + encodeURIComponent(cSel.value) + '&age=' + encodeURIComponent(aIn.value.trim());
      try {
        const res = await fetch('/api/candidate/matches' + qs, { credentials: 'include', cache: 'no-store' });
        if (res.ok) { state.matches = await res.json(); drawMatches(); }
      } catch { showToast('Match lookup failed', true); }
    });
    drawMatches();
    card.appendChild(out);
    return card;
  }

  function buildSavedCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const list = el('div', 'cso-hub-list');
    if (!state.bookmarks.length) {
      list.appendChild(el('p', 'cso-muted-note', 'No saved items yet — bookmark any job, scheme or study notice to track its deadline here.'));
    } else {
      const hub = window.CSOCandidateHub;
      state.bookmarks.forEach(bm => {
        const row = el('div', 'cso-hub-item');
        const main = el('div', 'cso-hub-item__main');
        main.appendChild(el('div', 'cso-hub-item__title', bm.postTitle || bm.title || 'Saved Item'));
        const days = hub && bm.deadlineDate ? hub.computeDaysLeft(bm.deadlineDate) : null;
        const badgeTxt = bm.deadlineDate && hub ? hub.formatCountdownLabel(days) : (bm.category || 'SAVED');
        main.appendChild(el('div', 'cso-hub-item__meta', (bm.category || '') + (bm.deadlineDate ? ' · Deadline: ' + bm.deadlineDate : '')));
        row.appendChild(main);
        row.appendChild(el('span', 'cso-hub-pill' + (days !== null && days <= 3 ? ' cso-hub-pill--urgent' : ''), badgeTxt));
        const href = safeUrl(bm.postUrl || bm.url);
        if (href) { const a = el('a', 'cso-btn cso-btn-sm', 'Open →'); a.href = href; row.appendChild(a); }
        const rm = el('button', 'cso-btn cso-btn-sm', 'Remove'); rm.type = 'button';
        rm.addEventListener('click', async () => {
          await fetch('/api/candidate/bookmarks', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove', postId: bm.postId || bm.article_id || bm.id })
          });
          state.bookmarks = state.bookmarks.filter(x => x !== bm);
          renderQuickStats(); renderWorkspace();
        });
        row.appendChild(rm);
        list.appendChild(row);
      });
    }
    card.appendChild(list);
    return card;
  }

  function buildDocVaultCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const list = el('div', 'cso-hub-list');
    if (!state.docTemplates.length) {
      list.appendChild(el('p', 'cso-muted-note', 'No document checklist templates published in Admin Studio yet.'));
    } else {
      state.docTemplates.forEach(doc => {
        const lbl = el('label', 'cso-hub-check');
        const cb = el('input'); cb.type = 'checkbox'; cb.checked = Boolean(state.locker[doc.doc_key]);
        cb.addEventListener('change', () => {
          state.locker[doc.doc_key] = cb.checked;
          saveWorkspacePatch({ locker: state.locker }, 'Document vault synced');
        });
        const body = el('div', 'cso-hub-check__body');
        body.appendChild(el('span', 'cso-hub-check__title', pick(doc, 'title') + (doc.is_required ? ' *' : '')));
        const note = pick(doc, 'notes');
        if (note) body.appendChild(el('span', 'cso-hub-check__note', note));
        lbl.appendChild(cb); lbl.appendChild(body);
        list.appendChild(lbl);
      });
    }
    card.appendChild(list);
    return card;
  }

  function buildMockAnalyticsCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const list = el('div', 'cso-hub-list');
    if (!state.mockScores.length) {
      list.appendChild(el('p', 'cso-muted-note', 'No mock test attempts recorded yet.'));
    } else {
      const avg = Math.round(state.mockScores.reduce((acc, m) => acc + Number(m.accuracy_rate || 0), 0) / state.mockScores.length);
      list.appendChild(el('p', 'cso-muted-note', 'Attempts: ' + state.mockScores.length + ' · Average Accuracy: ' + avg + '%'));
      state.mockScores.slice(0, forceFull ? 20 : 5).forEach(m => {
        const row = el('div', 'cso-hub-item');
        const main = el('div', 'cso-hub-item__main');
        main.appendChild(el('div', 'cso-hub-item__title', m.exam_name || 'Mock Test'));
        main.appendChild(el('div', 'cso-hub-item__meta', (m.tested_at || '').slice(0, 10)));
        row.appendChild(main);
        row.appendChild(el('span', 'cso-hub-pill', m.score + ' / ' + m.total_marks + ' (' + Math.round(Number(m.accuracy_rate || 0)) + '%)'));
        list.appendChild(row);
      });
    }
    card.appendChild(list);
    return card;
  }

  function buildNotesCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const ta = el('textarea', 'cso-hub-textarea');
    ta.placeholder = 'Write your revision notes, exam roll numbers, or study targets here (synced to D1)…';
    ta.value = state.notes || '';
    const saveBtn = el('button', 'cso-btn cso-btn-primary', 'Save Notes to Cloud');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => {
      state.notes = ta.value;
      saveWorkspacePatch({ notes: state.notes }, 'Study notes saved');
    });
    card.appendChild(ta);
    card.appendChild(saveBtn);
    return card;
  }

  function buildProfileCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const p = state.profile || {};
    const form = el('form', 'cso-hub-inline-form');
    const mk = (lbl, name, val, type) => {
      const w = el('div', 'cso-hub-field');
      w.appendChild(el('label', '', lbl));
      const i = el('input'); i.name = name; i.type = type || 'text'; i.value = val == null ? '' : String(val);
      w.appendChild(i);
      return { w, i };
    };
    const fName = mk('Full Name', 'fullName', p.fullName || ''); fName.i.required = true;
    const fPhone = mk('Mobile', 'phone', p.phone || '', 'tel');
    const fDist = mk('District', 'district', p.district || '');
    const fQual = mk('Qualification', 'qualification', p.qualification || '');
    const fExam = mk('Primary Target Exam', 'primaryExam', p.primaryExam || '');
    const fAge = mk('Age', 'age', p.age || '', 'number');
    [fName, fPhone, fDist, fQual, fExam, fAge].forEach(x => form.appendChild(x.w));
    const sv = el('button', 'cso-btn cso-btn-primary', 'Save Profile'); sv.type = 'submit';
    form.appendChild(sv);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      await submitProfileUpdate({
        fullName: fName.i.value.trim(), phone: fPhone.i.value.trim(), district: fDist.i.value.trim(),
        qualification: fQual.i.value.trim(), primaryExam: fExam.i.value.trim(), age: fAge.i.value ? Number(fAge.i.value) : null
      });
    });
    card.appendChild(form);
    return card;
  }

  function buildCustomFeatureCard(mod, forceFull) {
    const card = makeCard(mod, forceFull);
    const cfg = mod.config || {};
    if (Array.isArray(cfg.checklist_items) && cfg.checklist_items.length) {
      const list = el('div', 'cso-hub-list');
      cfg.checklist_items.forEach((line, i) => {
        const key = 'cf_' + mod.module_key + '_' + i;
        if (mod.module_type === 'custom_checklist') {
          const lbl = el('label', 'cso-hub-check');
          const cb = el('input'); cb.type = 'checkbox'; cb.checked = Boolean(state.locker[key]);
          cb.addEventListener('change', () => {
            state.locker[key] = cb.checked;
            saveWorkspacePatch({ locker: state.locker }, 'Checklist synced');
          });
          lbl.appendChild(cb);
          lbl.appendChild(el('span', 'cso-hub-check__title', line));
          list.appendChild(lbl);
        } else {
          list.appendChild(el('div', 'cso-hub-item', line));
        }
      });
      card.appendChild(list);
    }
    const href = safeUrl(cfg.target_url);
    if (href) {
      const ctaText = (state.lang === 'or' && cfg.cta_label_or) ? cfg.cta_label_or : (cfg.cta_label_en || 'Open Feature →');
      const a = el('a', 'cso-btn cso-btn-primary', ctaText);
      a.href = href;
      if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      card.appendChild(a);
    }
    return card;
  }

  function renderModuleNode(mod, forceFull) {
    if (mod.module_type !== 'core') return buildCustomFeatureCard(mod, forceFull);
    switch (mod.module_key) {
      case 'assigned_content': return buildAssignedCard(mod, forceFull);
      case 'eligibility_matcher': return buildMatcherCard(mod, forceFull);
      case 'saved_deadlines': return buildSavedCard(mod, forceFull);
      case 'document_vault': return buildDocVaultCard(mod, forceFull);
      case 'mock_analytics': return buildMockAnalyticsCard(mod, forceFull);
      case 'study_notes': return buildNotesCard(mod, forceFull);
      case 'profile_preferences': return buildProfileCard(mod, forceFull);
      default: return buildCustomFeatureCard(mod, forceFull);
    }
  }

  function renderWorkspace() {
    const emptyEl = document.getElementById('cso-workspace-empty');
    const itemsEl = document.getElementById('cso-workspace-items');
    if (!emptyEl || !itemsEl) return;

    const ui = state.ui || {};
    const cols = [1, 2, 3].includes(Number(ui.grid_columns)) ? Number(ui.grid_columns) : 2;
    itemsEl.className = 'cso-hub-grid cso-hub-grid--' + cols;
    itemsEl.replaceChildren();

    if (!state.modules.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = (ui.custom_empty_title_en || ui.custom_empty_title_or)
        ? (pick(ui, 'custom_empty_title') || EMPTY_WORKSPACE_MSG)
        : EMPTY_WORKSPACE_MSG;
      itemsEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    itemsEl.hidden = false;

    if (state.activeModuleKey === 'overview') {
      const priorityItems = state.assignedItems.filter(it => it.priority === 'urgent' || it.priority === 'high');
      if (priorityItems.length) {
        const hl = el('div', 'cso-hub-highlight cso-hub-card--full');
        hl.appendChild(el('div', 'cso-hub-highlight__title', 'Priority Assigned Files & Alerts (' + priorityItems.length + ')'));
        priorityItems.slice(0, 3).forEach(it => {
          const row = el('div', 'cso-hub-item');
          const main = el('div', 'cso-hub-item__main');
          main.appendChild(el('div', 'cso-hub-item__title', pick(it, 'title')));
          const sz = formatBytes(it.file_size_bytes);
          main.appendChild(el('div', 'cso-hub-item__meta', [it.file_ext, sz, pick(it, 'summary')].filter(Boolean).join(' · ')));
          row.appendChild(main);
          const acts = el('div', 'cso-hub-item__actions');
          acts.appendChild(el('span', 'cso-hub-pill cso-hub-pill--' + it.priority, it.priority));
          const href = safeUrl(it.resource_url);
          if (href) {
            const a = el('a', 'cso-btn cso-btn-sm cso-btn-primary', 'Open / Download ↗');
            a.href = href;
            if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            a.addEventListener('click', () => { sendAssignedAck(it.id, 'download'); });
            acts.appendChild(a);
          }
          row.appendChild(acts);
          hl.appendChild(row);
        });
        itemsEl.appendChild(hl);
      }
      const overviewMods = state.modules.filter(m => m.module_key !== 'overview' && (m.layout_slot === 'overview' || m.layout_slot === 'both'));
      if (!overviewMods.length) {
        emptyEl.hidden = false;
        emptyEl.textContent = EMPTY_WORKSPACE_MSG;
        itemsEl.hidden = true;
        return;
      }
      overviewMods.forEach(m => itemsEl.appendChild(renderModuleNode(m, false)));
    } else {
      const active = state.modules.find(m => m.module_key === state.activeModuleKey) || state.modules[0];
      if (active) itemsEl.appendChild(renderModuleNode(active, true));
    }
  }

  async function submitProfileUpdate(payload) {
    if (!payload.fullName) return;
    try {
      const res = await fetch('/api/candidate/profile', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Unable to save profile');
      const d = await res.json();
      if (d && d.profile) state.profile = d.profile;
      applyUiShell();
      closeProfileModal();
      showToast('Profile saved');
      renderWorkspace();
    } catch {
      showToast('Could not save profile right now.', true);
    }
  }

  function openProfileModal() {
    const modal = document.getElementById('cso-profile-modal');
    if (!modal) return;
    const u = state.profile || {};
    const nameEl = document.getElementById('edit-candidate-name');
    const mobEl = document.getElementById('edit-candidate-mobile');
    const distEl = document.getElementById('edit-candidate-district');
    if (nameEl) nameEl.value = u.fullName || '';
    if (mobEl) mobEl.value = u.phone || '';
    if (distEl) distEl.value = u.district || '';
    modal.hidden = false;
  }

  function closeProfileModal() {
    const modal = document.getElementById('cso-profile-modal');
    if (modal) modal.hidden = true;
  }

  async function hydrateWorkspace() {
    try {
      const savedLang = localStorage.getItem('cso_lang_pref');
      if (savedLang === 'or') state.lang = 'or';
    } catch {}

    // v305: Fetch hub-config, workspace, and matches in parallel (single roundtrip)
    // to eliminate multi-stage pre-hydration flashes.
    const [hubSettled, wsRes, matchRes] = await Promise.allSettled([
      fetch('/api/candidate/hub-config', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/candidate/workspace', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/candidate/matches', { credentials: 'include', cache: 'no-store' })
    ]);

    const hubRes = hubSettled.status === 'fulfilled' ? hubSettled.value : null;
    if (hubRes && hubRes.status === 401) {
      performSignOut();
      return;
    }
    if (hubRes && hubRes.status === 403) {
      const errData = await hubRes.json().catch(() => ({}));
      state.restricted = errData;
      finishHydration();
      renderRestrictedScreen(errData);
      return;
    }
    if (hubRes && hubRes.ok) {
      const d = await hubRes.json().catch(() => null);
      if (d && d.ok) {
        state.ui = d.ui_config || null;
        state.modules = Array.isArray(d.modules) ? d.modules : [];
        state.docTemplates = Array.isArray(d.doc_templates) ? d.doc_templates : [];
        state.assignedItems = Array.isArray(d.assigned_items) ? d.assigned_items : [];
        state.profile = d.profile || null;
        state.governance = d.governance || null;
        state.controls = d.controls || {};
        if (!state.modules.some(m => m.module_key === state.activeModuleKey) && state.modules.length) {
          state.activeModuleKey = state.modules[0].module_key;
        }
      }
    }

    if (wsRes.status === 'fulfilled' && wsRes.value.ok) {
      const w = await wsRes.value.json().catch(() => null);
      if (w && w.ok) {
        state.locker = w.locker || {};
        state.notes = w.notes || '';
        state.mockScores = Array.isArray(w.mock_scores) ? w.mock_scores : [];
        state.bookmarks = Array.isArray(w.bookmarks) ? w.bookmarks : [];
        state.communityProfile = w.community_profile || null;
      }
    }
    if (matchRes.status === 'fulfilled' && matchRes.value.ok) {
      state.matches = await matchRes.value.json().catch(() => null);
    }

    applyUiShell();
    renderNavigation();
    renderQuickStats();
    renderWorkspace();
    finishHydration();
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
    document.getElementById('cso-profile-editor-form')?.addEventListener('submit', e => {
      e.preventDefault();
      submitProfileUpdate({
        fullName: document.getElementById('edit-candidate-name')?.value.trim() || '',
        phone: document.getElementById('edit-candidate-mobile')?.value.trim() || '',
        district: document.getElementById('edit-candidate-district')?.value.trim() || ''
      });
    });
    document.querySelectorAll('.cso-footer-lang-pill[data-cso-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.lang = btn.getAttribute('data-cso-lang') === 'or' ? 'or' : 'en';
        try { localStorage.setItem('cso_lang_pref', state.lang); } catch {}
        applyUiShell(); renderNavigation(); renderWorkspace();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEmblemFallback();
    initThemeSwitcher();
    wireControls();
    hydrateWorkspace();
  });
})();
