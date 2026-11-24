/* Clean-slate Jobs Directory registry (v231): Zero hardcoded static job piles.
   All categories, notices, and dossiers are authored and served live from Cloudflare D1 via /admin/.
   Strict CSP-compliant: zero innerHTML, zero style mutations. */
(function (root) {
  'use strict';

  var DIRECTORY_SECTIONS = [];
  var LEGACY_HUB_REDIRECTS = {};
  var DIRECTORY_ITEMS = [];

  function slugifyBranch(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getSectionBySlug(slug) {
    var clean = String(slug || '').trim().toLowerCase();
    for (var i = 0; i < DIRECTORY_SECTIONS.length; i++) {
      if (DIRECTORY_SECTIONS[i].slug === clean) return DIRECTORY_SECTIONS[i];
    }
    return null;
  }

  function getItemsBySection() {
    return [];
  }

  function getItemBySlug() {
    return null;
  }

  function inferPortalForBranch() {
    return '';
  }

  function resolveBranchFromDirectory() {
    return null;
  }

  var api = {
    DIRECTORY_SECTIONS: DIRECTORY_SECTIONS,
    LEGACY_HUB_REDIRECTS: LEGACY_HUB_REDIRECTS,
    DIRECTORY_ITEMS: DIRECTORY_ITEMS,
    getSectionBySlug: getSectionBySlug,
    getItemsBySection: getItemsBySection,
    getItemBySlug: getItemBySlug,
    slugifyBranch: slugifyBranch,
    inferPortalForBranch: inferPortalForBranch,
    resolveBranchFromDirectory: resolveBranchFromDirectory
  };

  root.CSO_JOBS_DIRECTORY_DATA = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
