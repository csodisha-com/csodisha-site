/* Clean-slate empty registry (v231): All recruitment data is served live from D1 via /admin/. Strict CSP. */
(function (root) {
  'use strict';
  var BRANCHES = {};
  root.CSO_NATIONAL_JOBS_1_1 = BRANCHES;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BRANCHES;
  }
})(typeof window !== 'undefined' ? window : globalThis);
