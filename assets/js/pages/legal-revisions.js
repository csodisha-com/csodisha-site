/* Extracted from legal-revisions.html for strict CSP (v151). */
(function() {
  function escapeText(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hydrateLegalRevisions() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_legal_revisions_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "3.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Legal & Statutory Policy Revision Log", badge: "Statutory Transparency Audit Trail", lastAudited: "2026-11-01" },
        revisions: [
          {
            id: "REV-2026-06",
            date: "2026-11-01",
            moduleName: "module-03-007 Copyright & DMCA",
            version: "v2.0",
            editor: "Legal & Redressal Cell",
            summary: "Reconciled fair dealing statutory provisions with Section 52(1)(a) of Indian Copyright Act and configured 36h DMCA redressal SLA.",
            route: "/copyright.html"
          },
          {
            id: "REV-2026-05",
            date: "2026-11-01",
            moduleName: "module-03-006 Cookie Policy",
            version: "v1.2",
            editor: "Privacy Compliance Team",
            summary: "Codified edge telemetry cookies and session token lifecycles with 365-day retention policy.",
            route: "/cookie-policy.html"
          },
          {
            id: "REV-2026-04",
            date: "2026-11-01",
            moduleName: "module-03-005 Terms & Conditions",
            version: "v2.4",
            editor: "Statutory Governance Desk",
            summary: "Formalized 5-clause terms covering acceptance of educational scope and High Court of Orissa jurisdiction.",
            route: "/terms.html"
          },
          {
            id: "REV-2026-03",
            date: "2026-11-01",
            moduleName: "module-03-004 Official Disclaimer",
            version: "v2.1",
            editor: "Legal Counsel",
            summary: "Reinforced non-affiliation notices regarding OPSC, OSSC, and OSSSC government recruitment commissions.",
            route: "/disclaimer.html"
          },
          {
            id: "REV-2026-02",
            date: "2026-11-01",
            moduleName: "module-03-003 Privacy Policy",
            version: "v2.4",
            editor: "Data Protection Officer",
            summary: "DPDP Act 2023 compliance alignment, grievance turnaround SLA (48h), and zero-commercialization pledge.",
            route: "/privacy.html"
          },
          {
            id: "REV-2026-01",
            date: "2026-10-15",
            moduleName: "module-03-001 Site Identity & Mission",
            version: "v2.0",
            editor: "Academic Directorate",
            summary: "Standardized 30-district candidate educational mission and non-profit identity standards.",
            route: "/about.html"
          }
        ]
      };
    }

    var doc = config.document || {};

    var badgeEl = document.getElementById('legal-rev-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('legal-rev-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('legal-rev-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('legal-rev-last-audited');
    if (dateEl && doc.lastAudited) dateEl.textContent = doc.lastAudited;

    var container = document.getElementById('legal-revisions-timeline');
    var revList = Array.isArray(config.revisions) ? config.revisions : [];
    if (container && revList.length > 0) {
      csoSetHtml(container, revList.map(function(rev) {
        var routeHtml = rev.route ? '<a href="' + escapeText(rev.route.replace(/^\//, '')) + '" class="timeline-route-link">View Published Policy →</a>' : '';
        return '<article class="timeline-item">' +
               '  <div class="timeline-header">' +
               '    <div class="timeline-title-wrap">' +
               '      <h2 class="timeline-title">' + escapeText(rev.moduleName || '') + '</h2>' +
               '      <span class="timeline-ver">' + escapeText(rev.version || 'v1.0') + '</span>' +
               '    </div>' +
               '    <span class="timeline-date">' + escapeText(rev.date || '') + '</span>' +
               '  </div>' +
               '  <p class="timeline-summary">' + escapeText(rev.summary || '') + '</p>' +
               '  <div class="timeline-footer">' +
               '    <div><strong>Enacted by:</strong> ' + escapeText(rev.editor || 'Legal Team') + '</div>' +
               '    ' + routeHtml +
               '  </div>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateLegalRevisions);
  } else {
    hydrateLegalRevisions();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_legal_revisions_config') {
      hydrateLegalRevisions();
    }
  });
})();
