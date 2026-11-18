/* Extracted from privacy.html for strict CSP (v151). */
(function() {
  function escapeText(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return String(div.textContent).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function hydratePrivacyPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_privacy_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "2.4", updatedAt: new Date().toISOString() },
        compliance: {
          effectiveDate: "2026-11-01",
          governingAct: "Digital Personal Data Protection Act (DPDP), 2023 & Information Technology Act, 2000",
          dataProtectionOfficer: "dpo@csodisha.com",
          jurisdiction: "Odisha, India"
        },
        clauses: [
          { id: "PRIV-01", number: "1", title: "Scope & Academic Non-Commercial Nature", body: "Common Sense Odisha (csodisha.com) operates as a free, non-monetized educational intelligence platform for candidates across Odisha. We do not sell, rent, or trade candidate personal information.", active: true },
          { id: "PRIV-02", number: "2", title: "Data We Collect", body: "We collect minimal candidate details submitted voluntarily via contact or grievance forms (name, email, district) solely to respond to academic and syllabus queries. We do not collect government ID numbers, financial instruments, or biometric data.", active: true },
          { id: "PRIV-03", number: "3", title: "Local Storage & Session Tokens", body: "The portal uses client-side browser storage (localStorage and sessionStorage) strictly to preserve user interface preferences (theme, filters) and cryptographically signed session anchors for administrative authentication.", active: true },
          { id: "PRIV-04", number: "4", title: "Edge Telemetry & Cloudflare Protection", body: "Network requests pass through Cloudflare Edge servers for bot mitigation, DDoS defense, and latency optimization. Minimal network telemetry (IP address, user-agent, round-trip time) is processed strictly for diagnostic security.", active: true },
          { id: "PRIV-05", number: "5", title: "Candidate Rights & Grievance Desk", body: "Aspirants retain the statutory right to request inspection, correction, or permanent deletion of their inquiry records by contacting grievance@csodisha.com.", active: true }
        ],
        retention: {
          inquiryDataDays: 90,
          auditLogDays: 180,
          policySummary: "All candidate inquiries are automatically purged from active triage within 90 days of resolution."
        }
      };
    }

    // Version Badge
    var vBadge = document.getElementById('policy-version-badge');
    if (vBadge && config.meta && config.meta.version) {
      vBadge.textContent = "Version " + config.meta.version;
    }

    // Compliance Fields
    var c = config.compliance || {};
    var effDate = document.getElementById('policy-effective-date');
    if (effDate && c.effectiveDate) effDate.textContent = c.effectiveDate;

    var jurEl = document.getElementById('policy-jurisdiction');
    if (jurEl && c.jurisdiction) jurEl.textContent = c.jurisdiction;

    var dpoLink = document.getElementById('policy-dpo-email');
    if (dpoLink && c.dataProtectionOfficer) {
      dpoLink.textContent = c.dataProtectionOfficer;
      dpoLink.setAttribute('href', 'mailto:' + c.dataProtectionOfficer);
    }

    var govAct = document.getElementById('policy-governing-act');
    if (govAct && c.governingAct) govAct.textContent = c.governingAct;

    var dpoText = document.getElementById('policy-dpo-text');
    if (dpoText && c.dataProtectionOfficer) dpoText.textContent = c.dataProtectionOfficer;

    // Retention Days & Summary
    var ret = config.retention || {};
    var inqDays = document.getElementById('policy-inquiry-days');
    if (inqDays && ret.inquiryDataDays) inqDays.textContent = ret.inquiryDataDays + " Days Purge Window";

    var retSum = document.getElementById('policy-retention-summary');
    if (retSum && ret.policySummary) retSum.textContent = ret.policySummary;

    // Clauses List
    var clausesBox = document.getElementById('privacy-clauses-container');
    var clausesList = Array.isArray(config.clauses) ? config.clauses.filter(function(cl) { return cl.active !== false; }) : [];
    if (clausesBox && clausesList.length > 0) {
      csoSetHtml(clausesBox, clausesList.map(function(cl) {
        return '<article class="clause-box">' +
               '<div class="clause-header">' +
                 '<span class="clause-num-badge">§ ' + escapeText(cl.number || '1') + '</span>' +
                 '<h3 class="clause-title">' + escapeText(cl.title || 'Clause') + '</h3>' +
               '</div>' +
               '<p class="clause-body">' + escapeText(cl.body || '') + '</p>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydratePrivacyPolicy);
  } else {
    hydratePrivacyPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_privacy_config') {
      hydratePrivacyPolicy();
    }
  });
})();
