/* Master Command Suite — Live D1/R2 module routing.
   All modules route to live D1 + R2 views via CSOCms (cms/cms.js) with zero fake localStorage placeholders. */
(function () {
  'use strict';

  var CONTENT = [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts']];
  var EDU = [['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']];
  var SITE = [['pages', 'All Pages'], ['pages/legal', 'Info & Legal'], ['banner', 'Homepage & Banner'], ['seo', 'SEO & Sitemaps']];
  var OPS = [['dashboard', 'Overview'], ['operations', 'Operations & Backups'], ['diagnostics', 'Site Health']];
  var SEC = [['audit/security', 'Security Audit'], ['incidents', 'Incidents'], ['audit', 'All Events']];

  var ROUTES = {
    'module-01-001': ['dashboard', OPS],
    'module-01-002': ['diagnostics', OPS],
    'module-01-003': ['operations', OPS],
    'module-01-004': ['audit', SEC],
    'module-01-005': ['incidents', SEC],
    'module-01-006': ['current-affairs', CONTENT],
    'module-01-007': ['dashboard', OPS],
    'module-01-008': ['registry'],
    'module-02-001': ['pages', SITE],
    'module-02-002': ['pages', SITE],
    'module-02-003': ['pages', SITE],
    'module-02-004': ['banner', SITE],
    'module-02-005': ['pages', SITE],
    'module-02-006': ['pages', SITE],
    'module-02-007': ['pages', SITE],
    'module-02-008': ['pages', SITE],
    'module-02-009': ['pages', SITE],
    'module-02-010': ['pages', SITE],
    'module-02-011': ['pages', SITE],
    'module-04-001': ['current-affairs', CONTENT],
    'module-04-002': ['current-affairs', CONTENT],
    'module-04-003': ['current-affairs', CONTENT],
    'module-04-004': ['current-affairs', CONTENT],
    'module-04-005': ['banner', SITE],
    'module-05-007': ['mock-tests', EDU],
    'module-05-008': ['jobs', CONTENT],
    'module-05-009': ['jobs', CONTENT],
    'module-05-010': ['syllabus', EDU],
    'module-05-011': ['pyq', EDU],
    'module-05-012': ['mock-tests', EDU],
    'module-05-013': ['mock-tests', EDU],
    'module-05-014': ['mock-tests', EDU],
    'module-05-015': ['mock-tests', EDU],
    'module-07-001': ['media'],
    'module-07-002': ['media'],
    'module-07-004': ['media'],
    'module-07-005': ['media'],
    'module-09-001': ['users'],
    'module-09-003': ['users'],
    'module-09-004': ['users'],
    'module-09-006': ['users'],
    'module-10-011': ['banner', SITE],
    'module-13-001': ['seo', SITE],
    'module-14-006': ['current-affairs', CONTENT],
    'module-14-007': ['jobs', CONTENT],
    'module-14-009': ['dashboard', OPS],
    'module-16-012': ['audit/security', SEC],
    'module-16-013': ['incidents', SEC],
    'module-17-001': ['operations', OPS],
    'module-17-010': ['dashboard', OPS],
    'module-17-016': ['operations', OPS]
  };

  var FOLDER_FALLBACKS = {
    'folder-01': ['dashboard', OPS],
    'folder-02': ['pages', SITE],
    'folder-03': ['pages/legal', SITE],
    'folder-04': ['current-affairs', CONTENT],
    'folder-05': ['mock-tests', EDU],
    'folder-06': ['pages', SITE],
    'folder-07': ['media'],
    'folder-08': ['operations', OPS],
    'folder-09': ['users'],
    'folder-10': ['dashboard', OPS],
    'folder-11': ['banner', SITE],
    'folder-12': ['banner', SITE],
    'folder-13': ['seo', SITE],
    'folder-14': ['jobs', CONTENT],
    'folder-15': ['diagnostics', OPS],
    'folder-16': ['audit/security', SEC],
    'folder-17': ['operations', OPS],
    'folder-18': ['banner', SITE],
    'folder-19': ['registry'],
    'folder-jobs-careers': ['jobs', CONTENT],
    'folder-schemes-benefits': ['current-affairs', CONTENT],
    'folder-study-library': ['syllabus', EDU],
    'folder-community': ['users']
  };

  function resolveRoute(folderId, moduleId) {
    if (ROUTES[moduleId]) return ROUTES[moduleId];
    if (FOLDER_FALLBACKS[folderId]) return FOLDER_FALLBACKS[folderId];
    return ['dashboard', OPS];
  }

  function render(folderId, moduleId, root, actions) {
    if (window.CSORestoredModules && window.CSORestoredModules.render(folderId, moduleId, root, actions)) {
      return true;
    }
    if (!window.CSOCms) return false;
    var r = resolveRoute(folderId, moduleId);
    if (actions) {
      var pill = document.createElement('span');
      pill.className = 'cso-live-pill';
      pill.textContent = '● Live · D1 / R2';
      actions.appendChild(pill);
    }
    var host = document.createElement('div');
    host.className = 'cms-embed';
    root.appendChild(host);
    window.CSOCms.mount(host, r[0], r[1]);
    return true;
  }

  async function publishFlash() {
    var res = await fetch('/api/admin/banner', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
      body: JSON.stringify({
        active: true,
        severity: 'urgent',
        headline: 'Urgent: OSSC CGL 2026 official hall ticket download released',
        context: 'Official examination portal has issued hall tickets. Download links and instructions verified.',
        ctaText: 'Check hall ticket',
        ctaUrl: '/jobs-careers/'
      })
    });
    var d = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(d.error || 'Request failed (' + res.status + ')');
    return d;
  }

  async function getSiteManifest() {
    var res = await fetch('./site-manifest.json', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  window.CSOLive = {
    render: render,
    resolveRoute: resolveRoute,
    publishFlash: publishFlash,
    getSiteManifest: getSiteManifest,
    routes: ROUTES
  };
})();
