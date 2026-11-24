/* Clean-slate v232: purged hardcoded glossary dataset; terms load strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_odia_glossary_saved_v1';
  var CATEGORIES = [];
  var GLOSSARY_TERMS = [];

  function loadSaved(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return [];
    try {
      var parsed = JSON.parse(s.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  function saveIds(ids, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return;
    try { s.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(ids) ? ids : [])); } catch (_) {}
  }
  function isSaved(id, storage) { return loadSaved(storage).indexOf(id) !== -1; }
  function toggleSave(id, storage) {
    var list = loadSaved(storage);
    var idx = list.indexOf(id);
    var saved = idx === -1;
    if (saved) list.push(id);
    else list.splice(idx, 1);
    saveIds(list, storage);
    return { saved: saved, ids: list };
  }
  function filterTerms(terms) { return Array.isArray(terms) ? terms : []; }

  function mountGlossary(rootEl) {
    if (typeof document === 'undefined') return;
    var host = rootEl || document.getElementById('odia-glossary');
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    if (!GLOSSARY_TERMS.length) {
      host.hidden = true;
      return;
    }
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    CATEGORIES: CATEGORIES,
    GLOSSARY_TERMS: GLOSSARY_TERMS,
    loadSaved: loadSaved,
    saveIds: saveIds,
    isSaved: isSaved,
    toggleSave: toggleSave,
    filterTerms: filterTerms,
    mountGlossary: mountGlossary
  };

  root.CSO_ODIA_GLOSSARY = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountGlossary(); });
    else mountGlossary();
  }
})(typeof window !== 'undefined' ? window : globalThis);
