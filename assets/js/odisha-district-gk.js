/* Clean-slate v232: purged hardcoded district GK cards; district study items load strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var DISTRICTS_GK = [];

  function filterDistricts(list) { return Array.isArray(list) ? list : []; }
  function generateDistrictDrill() { return []; }

  function mountDistrictGk(rootEl) {
    if (typeof document === 'undefined') return;
    var host = rootEl || document.getElementById('odisha-district-gk');
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    if (!DISTRICTS_GK.length) {
      host.hidden = true;
      return;
    }
  }

  var api = {
    DISTRICTS_GK: DISTRICTS_GK,
    filterDistricts: filterDistricts,
    generateDistrictDrill: generateDistrictDrill,
    mountDistrictGk: mountDistrictGk
  };

  root.CSO_ODISHA_DISTRICT_GK = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountDistrictGk(); });
    else mountDistrictGk();
  }
})(typeof window !== 'undefined' ? window : globalThis);
