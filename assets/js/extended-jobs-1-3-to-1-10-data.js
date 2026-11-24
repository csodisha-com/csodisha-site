/* Clean-slate empty registry (v231): All extended recruitment data is served live from D1 via /admin/. Strict CSP. */
(function (root) {
  'use strict';
  var EXTENDED_BRANCHES = {};
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EXTENDED_BRANCHES;
  }
  root.CSO_EXTENDED_JOBS_1_3_10 = EXTENDED_BRANCHES;
})(typeof window !== 'undefined' ? window : globalThis);
