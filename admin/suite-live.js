/* Master Command Suite — live D1/R2 module routing.
   Modules listed here render real data from /api/admin/* (D1 + R2) via CSOCms (cms/cms.js)
   instead of the browser-localStorage demo renderers in admin.js. All requests are same-origin,
   cookie-authenticated, carry X-CSO-CSRF and are authorised server-side (requireRole). */
(function () {
  'use strict';
  var CONTENT = [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts']];
  var EDU = [['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']];
  var ROUTES = {
    'module-01-001': ['dashboard'],
    'module-01-004': ['audit'],
    'module-04-001': ['current-affairs', CONTENT],
    'module-04-004': ['current-affairs', CONTENT],
    'module-04-005': ['banner'],
    'module-05-008': ['jobs', CONTENT],
    'module-05-010': ['syllabus', EDU],
    'module-05-011': ['pyq', EDU],
    'module-05-012': ['mock-tests', EDU],
    'module-05-014': ['mock-tests', EDU],
    'module-07-001': ['media'],
    'module-07-004': ['media'],
    'module-07-005': ['media'],
    'module-09-001': ['users'],
    'module-09-006': ['users'],
    'module-10-011': ['banner'],
    'module-14-006': ['current-affairs', CONTENT],
    'module-14-007': ['jobs', CONTENT],
    'module-14-009': ['dashboard'],
    'module-16-012': ['audit/security'],
    'module-16-013': ['incidents'],
    'module-17-010': ['dashboard']
  };

  function render(folderId, moduleId, root, actions) {
    var r = ROUTES[moduleId];
    if (!r || !window.CSOCms) return false;
    if (actions) {
      var pill = document.createElement('span');
      pill.className = 'px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded border border-brand-emerald/40 bg-brand-emerald/10 text-brand-emerald';
      pill.textContent = '● Live · D1 / R2';
      actions.appendChild(pill);
    }
    var host = document.createElement('div');
    host.className = 'cms-embed';
    root.appendChild(host);
    window.CSOCms.mount(host, r[0], r[1]);
    return true;
  }

  /* Quick Actions → "Flash Admit Card Broadcast": writes the homepage banner in D1. */
  async function publishFlash() {
    var res = await fetch('/api/admin/banner', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
      body: JSON.stringify({
        active: true, severity: 'urgent',
        headline: 'Urgent: OSSC CGL 2026 official hall ticket download released',
        context: 'Official examination portal has issued hall tickets. Download links and instructions verified.',
        ctaText: 'Check hall ticket', ctaUrl: '/jobs-careers/'
      })
    });
    var d = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(d.error || 'Request failed (' + res.status + ')');
    return d;
  }

  window.CSOLive = { render: render, publishFlash: publishFlash, routes: ROUTES };
})();
