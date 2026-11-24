/* Clean-slate v232: purged hardcoded syllabus/PYQ vault; syllabus items load strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_syllabus_progress_v1';
  var VAULT = [];

  function loadProgress(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return {};
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress(map, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return;
    try { s.setItem(STORAGE_KEY, JSON.stringify(map || {})); } catch (_) {}
  }

  function toggleTopic(topicId, storage) {
    var map = loadProgress(storage);
    if (map[topicId]) delete map[topicId];
    else map[topicId] = true;
    saveProgress(map, storage);
    return map;
  }

  function getExamStats(examId, storage) {
    var map = loadProgress(storage);
    var exam = null;
    for (var i = 0; i < VAULT.length; i++) {
      if (VAULT[i].id === examId) { exam = VAULT[i]; break; }
    }
    if (!exam || !Array.isArray(exam.topics)) return { total: 0, done: 0, pct: 0 };
    var total = exam.topics.length;
    var done = 0;
    for (var j = 0; j < total; j++) {
      if (map[exam.topics[j].id]) done += 1;
    }
    return {
      total: total,
      done: done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    VAULT: VAULT,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    toggleTopic: toggleTopic,
    getExamStats: getExamStats
  };

  root.CSO_SYLLABUS_PYQ_VAULT = VAULT;
  root.CSO_SYLLABUS_VAULT_API = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
