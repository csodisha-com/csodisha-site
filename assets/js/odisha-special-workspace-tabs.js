/**
 * Common Sense Odisha — /odisha-special/ 3-Tab Interactive Workspace (v457)
 * Organizes Exam Center & Travel Logistics, District Reservation Roster, and
 * Heritage, GI Tags & Odisha GK Vault inside an accessible ARIA tablist
 * (role="tablist", role="tab", aria-selected, role="tabpanel") with keyboard
 * ArrowLeft / ArrowRight / Home / End navigation, localStorage persistence
 * (cso_odisha_special_tab_v1), deep-link district pre-selection, and
 * 'Show All Expanded' mode.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection, zero inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOOdishaSpecialWorkspaceTabs = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOOdishaSpecialWorkspaceTabs = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v457';
  var ROOT_ID = 'cso-odisha-special-workspace-tabs';
  var STORE_KEY = 'cso_odisha_special_tab_v1';

  var TABS = [
    {
      key: 'travel',
      tabId: 'cso-od-ws-tab-travel',
      panelId: 'cso-od-ws-panel-travel',
      mountId: 'cso-district-exam-center-root',
      aliases: ['travel', 'exam-travel', 'cso-exam-travel-planner-root', 'cso-district-exam-center-root'],
      en: '🚆 Exam Center & Travel Logistics',
      or: '🚆 ପରୀକ୍ଷା କେନ୍ଦ୍ର ଓ ଯାତାୟାତ'
    },
    {
      key: 'roster',
      tabId: 'cso-od-ws-tab-roster',
      panelId: 'cso-od-ws-panel-roster',
      mountId: 'cso-district-reservation-root',
      aliases: ['roster', 'reservation', 'cso-district-reservation-root'],
      en: '📊 District Reservation Roster',
      or: '📊 ଜିଲ୍ଲା ସଂରକ୍ଷଣ ରୋଷ୍ଟର୍'
    },
    {
      key: 'heritage-gk',
      tabId: 'cso-od-ws-tab-heritage',
      panelId: 'cso-od-ws-panel-heritage',
      mountId: 'cso-od-heritage-gk-panel',
      aliases: ['heritage-gk', 'heritage', 'gk', 'cso-od-drill', 'cso-od-gk-heading'],
      en: '🏛️ Heritage, GI Tags & Odisha GK Vault',
      or: '🏛️ ଐତିହ୍ୟ, GI ଟ୍ୟାଗ୍ ଓ ଓଡ଼ିଶା GK ଭଲ୍ଟ'
    }
  ];

  function resolveTabKey(raw) {
    var k = String(raw || '').trim().toLowerCase().replace(/^#/, '');
    if (!k) return '';
    for (var i = 0; i < TABS.length; i += 1) {
      var t = TABS[i];
      if (t.key === k || t.tabId === k || t.panelId === k || t.mountId === k) return t.key;
      if (t.aliases && t.aliases.indexOf(k) !== -1) return t.key;
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

  function preselectDistrictInTravelPlanner(districtSlug) {
    if (!doc || !districtSlug) return false;
    var slug = String(districtSlug).toLowerCase().trim();
    var centerSel = doc.getElementById('cso-dec-center');
    if (centerSel) {
      centerSel.value = slug;
      try {
        centerSel.dispatchEvent(new win.Event('change', { bubbles: true }));
      } catch (_) {}
      return true;
    }
    try {
      if (win.localStorage) {
        var raw = win.localStorage.getItem('cso_district_exam_center_prefs_v1');
        var prefs = raw ? JSON.parse(raw) : {};
        prefs.centerDistrict = slug;
        win.localStorage.setItem('cso_district_exam_center_prefs_v1', JSON.stringify(prefs));
      }
    } catch (_) {}
    return false;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var hashTab = resolveTabKey(win.location && win.location.hash);
    var state = {
      activeKey: hashTab || loadSavedTab(),
      expandAll: false,
      lang: (doc.documentElement && (doc.documentElement.getAttribute('lang') === 'or' || doc.documentElement.getAttribute('data-cso-lang') === 'or')) ? 'or' : 'en'
    };

    var tabBtns = Array.prototype.slice.call(container.querySelectorAll('[role="tab"][data-od-ws-tab]'));
    var panels = Array.prototype.slice.call(container.querySelectorAll('[role="tabpanel"][data-od-ws-panel]'));
    var expandBtn = container.querySelector('[data-od-ws-expand-all]');

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
        var k = btn.getAttribute('data-od-ws-tab');
        var isActive = (k === state.activeKey);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
        btn.classList.toggle('is-active', isActive);
      });
      panels.forEach(function (panel) {
        var k = panel.getAttribute('data-od-ws-panel');
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

      if (resolved === 'travel' && opts && opts.district) {
        preselectDistrictInTravelPlanner(opts.district);
      }
      if (opts && opts.focus) {
        var btn = tabBtns.find(function (b) { return b.getAttribute('data-od-ws-tab') === resolved; });
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
        var k = btn.getAttribute('data-od-ws-tab');
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
          activateTab(tabBtns[nextIdx].getAttribute('data-od-ws-tab'), { focus: true });
        }
      });
    });

    if (expandBtn) {
      expandBtn.addEventListener('click', function () {
        toggleExpandAll();
      });
    }

    if (typeof win.addEventListener === 'function') {
      win.addEventListener('cso:odisha-open-tab', function (ev) {
        var det = ev && ev.detail;
        var key = typeof det === 'string' ? det : (det && det.tab);
        var dist = det && det.district;
        if (key) {
          activateTab(key, {
            district: dist || '',
            scroll: Boolean(!det || det.scroll !== false),
            collapseAll: true
          });
        }
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
    container._csoOdishaWorkspaceTabs = controller;
    return controller;
  }

  function autoMount() {
    if (!doc) return;
    var root = doc.getElementById(ROOT_ID);
    if (root && !root._csoOdishaWorkspaceTabs) {
      mount(root);
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', autoMount);
    } else {
      autoMount();
    }
  }

  return {
    version: VERSION,
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    STORE_KEY: STORE_KEY,
    TABS: TABS,
    resolveTabKey: resolveTabKey,
    preselectDistrictInTravelPlanner: preselectDistrictInTravelPlanner,
    mount: mount
  };
});
