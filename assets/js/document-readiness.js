(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_doc_readiness_v1';

  var ITEMS = [];

  function normalizeState(raw) {
    var obj = raw && typeof raw === 'object' ? raw : {};
    var checked = obj.checked && typeof obj.checked === 'object' ? obj.checked : {};
    var cleanChecked = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var id = ITEMS[i].id;
      cleanChecked[id] = Boolean(checked[id]);
    }
    return {
      checked: cleanChecked,
      updatedAt: String(obj.updatedAt || '')
    };
  }

  function load(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return normalizeState({});
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return normalizeState({});
      return normalizeState(JSON.parse(raw));
    } catch (_) {
      return normalizeState({});
    }
  }

  function save(state, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var norm = normalizeState(state);
    norm.updatedAt = new Date().toISOString();
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(norm)); } catch (_) {}
    }
    if (typeof fetch === 'function') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_readiness: norm })
        }).catch(function () {});
      } catch (_) {}
    }
    return norm;
  }

  function toggle(id, storage) {
    var st = load(storage);
    if (Object.prototype.hasOwnProperty.call(st.checked, id)) {
      st.checked[id] = !st.checked[id];
      return save(st, storage);
    }
    return st;
  }

  function getSummary(state) {
    var norm = normalizeState(state);
    var ready = 0;
    for (var i = 0; i < ITEMS.length; i++) {
      if (norm.checked[ITEMS[i].id]) ready++;
    }
    var total = ITEMS.length;
    return {
      ready: ready,
      total: total,
      pct: total ? Math.round((ready / total) * 100) : 0
    };
  }

  root.CSO_DOCUMENT_READINESS = {
    STORAGE_KEY: STORAGE_KEY,
    ITEMS: ITEMS,
    load: load,
    save: save,
    toggle: toggle,
    getSummary: getSummary
  };
})(typeof window !== 'undefined' ? window : globalThis);
