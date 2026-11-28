/**
 * Common Sense Odisha — /jobs/ 4-Tab Interactive Candidate Workspace (v451)
 * Groups Eligibility & Fee Matrix, District Reservation Roster, My Applications &
 * Grievance Tracker, and QR Flyer & Alert Poster inside an accessible ARIA tablist
 * with keyboard Left/Right/Home/End navigation, localStorage persistence
 * (cso_jobs_active_tab_v1), deep-link hash auto-activation, and 'Show All Expanded' mode.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection, zero inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOJobsWorkspaceTabs = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOJobsWorkspaceTabs = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v451';
  var ROOT_ID = 'cso-jobs-workspace-tabs';
  var STORE_KEY = 'cso_jobs_active_tab_v1';

  var TABS = [
    {
      key: 'eligibility',
      tabId: 'cso-jobs-tab-eligibility',
      panelId: 'cso-jobs-panel-eligibility',
      mountId: 'cso-multi-post-eligibility-root',
      en: '✅ Eligibility & Fee Matrix',
      or: '✅ ଯୋଗ୍ୟତା ଓ ଫି ମ୍ୟାଟ୍ରିକ୍ସ'
    },
    {
      key: 'roster',
      tabId: 'cso-jobs-tab-roster',
      panelId: 'cso-jobs-panel-roster',
      mountId: 'cso-district-reservation-root',
      en: '📊 District Reservation Roster',
      or: '📊 ଜିଲ୍ଲା ସଂରକ୍ଷଣ ରୋଷ୍ଟର୍'
    },
    {
      key: 'applications',
      tabId: 'cso-jobs-tab-applications',
      panelId: 'cso-jobs-panel-applications',
      mountId: 'cso-application-grievance-root',
      en: '🗂️ My Applications & Grievance',
      or: '🗂️ ମୋର ଆବେଦନ ଓ ଅଭିଯୋଗ'
    },
    {
      key: 'qr',
      tabId: 'cso-jobs-tab-qr',
      panelId: 'cso-jobs-panel-qr',
      mountId: 'cso-qr-flyer-generator-root',
      en: '📲 QR Flyer & Alert Poster',
      or: '📲 QR ଫ୍ଲାୟର୍ ଓ ଆଲର୍ଟ ପୋଷ୍ଟର୍'
    }
  ];

  var VALID_KEYS = TABS.map(function (t) { return t.key; });

  function resolveTabKey(raw) {
    var k = String(raw || '').trim().toLowerCase().replace(/^#/, '');
    if (VALID_KEYS.indexOf(k) !== -1) return k;
    for (var i = 0; i < TABS.length; i += 1) {
      if (TABS[i].mountId === k || TABS[i].panelId === k || TABS[i].tabId === k) {
        return TABS[i].key;
      }
    }
    return '';
  }

  function loadSavedTab() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(STORE_KEY);
      return resolveTabKey(raw) || TABS[0].key;
    } catch (_) {
      return TABS[0].key;
    }
  }

  function saveTab(key) {
    try {
      if (win.localStorage) win.localStorage.setItem(STORE_KEY, String(key));
    } catch (_) {}
  }

  function mount(container) {
    if (!doc || !container) return null;
    var hashTab = resolveTabKey(win.location && win.location.hash);
    var state = {
      activeKey: hashTab || loadSavedTab(),
      expandAll: false,
      lang: (doc.documentElement && (doc.documentElement.getAttribute('lang') === 'or' || doc.documentElement.getAttribute('data-cso-lang') === 'or')) ? 'or' : 'en'
    };

    var tabBtns = Array.prototype.slice.call(container.querySelectorAll('[role="tab"][data-jobs-tab]'));
    var panels = Array.prototype.slice.call(container.querySelectorAll('[role="tabpanel"][data-jobs-panel]'));
    var expandBtn = container.querySelector('[data-jobs-expand-all]');

    function localize() {
      var isOr = state.lang === 'or';
      container.querySelectorAll('[data-en]').forEach(function (n) {
        var txt = isOr ? n.getAttribute('data-or') : n.getAttribute('data-en');
        if (txt) n.textContent = txt;
      });
      if (expandBtn) {
        expandBtn.textContent = state.expandAll
          ? (isOr ? '⤡ ଟ୍ୟାବ୍ ଭ୍ୟୁକୁ ଫେରନ୍ତୁ' : '⤡ Collapse to Tabs')
          : (isOr ? '⤢ ସବୁ ଖୋଲି ଦେଖାନ୍ତୁ' : '⤢ Show All Expanded');
      }
    }

    function applyState() {
      container.setAttribute('data-cso-expand-all', state.expandAll ? '1' : '0');
      tabBtns.forEach(function (btn) {
        var k = btn.getAttribute('data-jobs-tab');
        var isActive = (k === state.activeKey);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
        btn.classList.toggle('is-active', isActive);
      });
      panels.forEach(function (panel) {
        var k = panel.getAttribute('data-jobs-panel');
        var visible = state.expandAll || (k === state.activeKey);
        panel.hidden = !visible;
        panel.classList.toggle('is-active', visible);
      });
      if (expandBtn) {
        expandBtn.setAttribute('aria-pressed', state.expandAll ? 'true' : 'false');
        expandBtn.classList.toggle('is-active', state.expandAll);
      }
      localize();
    }

    function activateTab(key, opts) {
      var resolved = resolveTabKey(key);
      if (!resolved) return false;
      state.activeKey = resolved;
      if (opts && opts.collapseAll) state.expandAll = false;
      saveTab(resolved);
      applyState();
      if (opts && opts.focus) {
        var btn = tabBtns.find(function (b) { return b.getAttribute('data-jobs-tab') === resolved; });
        if (btn && typeof btn.focus === 'function') btn.focus();
      }
      if (opts && opts.scroll && typeof container.scrollIntoView === 'function') {
        try { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { container.scrollIntoView(); }
      }
      return true;
    }

    function toggleExpandAll(force) {
      state.expandAll = typeof force === 'boolean' ? force : !state.expandAll;
      applyState();
      return state.expandAll;
    }

    tabBtns.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-jobs-tab');
        state.expandAll = false;
        activateTab(k);
      });
      btn.addEventListener('keydown', function (ev) {
        if (!ev) return;
        var nextIdx = -1;
        if (ev.key === 'ArrowRight') nextIdx = (idx + 1) % tabBtns.length;
        else if (ev.key === 'ArrowLeft') nextIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
        else if (ev.key === 'Home') nextIdx = 0;
        else if (ev.key === 'End') nextIdx = tabBtns.length - 1;
        if (nextIdx !== -1) {
          ev.preventDefault();
          state.expandAll = false;
          activateTab(tabBtns[nextIdx].getAttribute('data-jobs-tab'), { focus: true });
        }
      });
    });

    if (expandBtn) {
      expandBtn.addEventListener('click', function () {
        toggleExpandAll();
      });
    }

    if (typeof win.addEventListener === 'function') {
      win.addEventListener('cso:jobs-open-tab', function (ev) {
        var det = ev && ev.detail;
        var key = typeof det === 'string' ? det : (det && det.tab);
        if (key) activateTab(key, { scroll: Boolean(!det || det.scroll !== false), collapseAll: true });
      });
      win.addEventListener('hashchange', function () {
        var hk = resolveTabKey(win.location && win.location.hash);
        if (hk) activateTab(hk, { collapseAll: true });
      });
      win.addEventListener('cso:lang-change', function (ev) {
        var l = ev && ev.detail && ev.detail.lang;
        if (l === 'or' || l === 'en') {
          state.lang = l;
          localize();
        }
      });
    }

    applyState();

    var controller = {
      activateTab: activateTab,
      toggleExpandAll: toggleExpandAll,
      getState: function () { return Object.assign({}, state); }
    };
    container._csoJobsWorkspaceTabs = controller;
    return controller;
  }

  function autoMount() {
    if (!doc) return;
    var root = doc.getElementById(ROOT_ID);
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    STORE_KEY: STORE_KEY,
    TABS: TABS,
    resolveTabKey: resolveTabKey,
    mount: mount
  };
});
