/* Clean-slate v232: purged hardcoded CBT exam packs; mock tests & questions load strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var EXAM_PACKS = [];

  function getPackById(id) {
    for (var i = 0; i < EXAM_PACKS.length; i++) {
      if (EXAM_PACKS[i].id === id) return EXAM_PACKS[i];
    }
    return null;
  }

  var api = {
    EXAM_PACKS: EXAM_PACKS,
    getPackById: getPackById
  };

  root.CSO_CBT_EXAM_PACKS = EXAM_PACKS;
  root.CSO_CBT_PACKS_API = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
