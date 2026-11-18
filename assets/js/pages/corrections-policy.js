/* Extracted from corrections-policy.html for strict CSP (v151). */
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

  function hydrateCorrectionsPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_corrections_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "1.3", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Corrections & Retraction Policy", badge: "Transparent Accountability", lastReviewed: "2026-11-01" },
        desk: {
          deskName: "Editorial Fact-Check & Retraction Desk",
          email: "corrections@csodisha.com",
          turnaroundHours: 24,
          portalSection: "Trust Layer & Verification Log"
        },
        workflow: [
          { step: 1, title: "Candidate or Reader Flag", description: "Any user flags a discrepancy with primary gazette citation via corrections desk or feedback form." },
          { step: 2, title: "Independent Verification", description: "Verification desk cross-references official gazette, corrigendum notices, and commission archives within 24 hours." },
          { step: 3, title: "Transparent Retraction Note", description: "If an error exists, the article is updated immediately with an explicit, high-visibility retraction badge and timestamped revision note." }
        ],
        recentCorrections: [
          { id: "CORR-2026-01", date: "2026-10-18", module: "OSSC CGL 2026", note: "Corrected age relaxation eligibility bracket for SEBC candidates in accordance with Corrigendum No. 418/OSSC.", verifiedBy: "Senior Fact Checker" },
          { id: "CORR-2026-02", date: "2026-10-25", module: "OPSC OCS Preliminary", note: "Reconciled CSAT qualifying benchmark from 33% to notification standard.", verifiedBy: "Academic Director" }
        ]
      };
    }

    var doc = config.document || {};
    var desk = config.desk || {};

    var badgeEl = document.getElementById('corrections-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('corrections-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('corrections-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('corrections-last-reviewed');
    if (dateEl && doc.lastReviewed) dateEl.textContent = doc.lastReviewed;

    // Desk
    var deskNameEl = document.getElementById('corrections-desk-name');
    if (deskNameEl && desk.deskName) deskNameEl.textContent = desk.deskName;

    var deskEmailEl = document.getElementById('corrections-desk-email');
    if (deskEmailEl && desk.email) {
      deskEmailEl.textContent = desk.email;
      deskEmailEl.href = "mailto:" + desk.email;
    }

    var deskSlaEl = document.getElementById('corrections-desk-sla');
    if (deskSlaEl && desk.turnaroundHours) {
      deskSlaEl.textContent = "Investigation within " + desk.turnaroundHours + " Hours";
    }

    var deskSectionEl = document.getElementById('corrections-desk-section');
    if (deskSectionEl && desk.portalSection) deskSectionEl.textContent = desk.portalSection;

    // Workflow
    var wfContainer = document.getElementById('corrections-workflow-container');
    var wfList = Array.isArray(config.workflow) ? config.workflow : [];
    if (wfContainer && wfList.length > 0) {
      csoSetHtml(wfContainer, wfList.map(function(wf, idx) {
        return '<div class="workflow-card">' +
               '  <span class="workflow-step">Step ' + (idx + 1) + '</span>' +
               '  <h3>' + escapeText(wf.title || '') + '</h3>' +
               '  <p>' + escapeText(wf.description || '') + '</p>' +
               '</div>';
      }).join(''));
    }

    // Log Table
    var logTable = document.getElementById('corrections-log-table-body');
    var logs = Array.isArray(config.recentCorrections) ? config.recentCorrections : [];
    if (logTable && logs.length > 0) {
      csoSetHtml(logTable, logs.map(function(item) {
        return '<tr>' +
               '  <td><span class="log-id-badge">' + escapeText(item.id || '') + '</span></td>' +
               '  <td class="cso-u-78f57674">' + escapeText(item.date || '') + '</td>' +
               '  <td><strong class="cso-u-eecf08e0">' + escapeText(item.module || '') + '</strong></td>' +
               '  <td>' + escapeText(item.note || '') + '</td>' +
               '  <td class="cso-u-4029c554">' + escapeText(item.verifiedBy || '') + '</td>' +
               '</tr>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCorrectionsPolicy);
  } else {
    hydrateCorrectionsPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_corrections_config') {
      hydrateCorrectionsPolicy();
    }
  });
})();
