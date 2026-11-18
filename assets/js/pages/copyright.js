/* Extracted from copyright.html for strict CSP (v151). */
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

  function getCategoryClass(cat) {
    if (!cat) return '';
    var c = String(cat).toLowerCase();
    if (c.indexOf('intellectual') !== -1 || c.indexOf('ip') !== -1) return 'ip';
    if (c.indexOf('fair') !== -1 || c.indexOf('statutory') !== -1) return 'fair';
    if (c.indexOf('dmca') !== -1 || c.indexOf('takedown') !== -1) return 'dmca';
    return '';
  }

  function hydrateCopyrightPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_copyright_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: {
          title: "Copyright Notice & DMCA Policy",
          copyrightYear: "2023 - 2026",
          effectiveDate: "2026-11-01",
          badge: "Intellectual Property & Fair Dealing"
        },
        officer: {
          name: "Designated Copyright & Grievance Officer",
          email: "dmca@csodisha.com",
          secondaryEmail: "legal@csodisha.com",
          address: "Common Sense Odisha Academic Node, Legal & Statutory Redressal Cell, Bhubaneswar / Balasore, Odisha - 756001, India",
          responseSlaHours: 36
        },
        clauses: [
          { id: "CP-01", number: "1", title: "Proprietary Original Content & Editorial Compilations", category: "Intellectual Property", body: "All original analyses, curated editorial explanations, custom infographics, dynamic mock exam architectures, algorithms, interface layouts, and proprietary code hosted on Common Sense Odisha (csodisha.com) are the intellectual property of Common Sense Odisha and protected under the Indian Copyright Act, 1957, as well as applicable international copyright conventions.", active: true },
          { id: "CP-02", number: "2", title: "Fair Dealing & Non-Commercial Educational Exemption", category: "Fair Dealing", body: "Third-party recruitment notifications, syllabi, official answer keys, question paper formats, and gazette notifications referenced or mirrored on this portal remain the exclusive property of their respective government examination authorities (including OPSC, OSSSC, OSSC, BPEO, and CHSE). These materials are published solely for non-profit academic research, student guidance, and fair criticism in strict compliance with Section 52(1)(a) of the Indian Copyright Act, 1957 and Title 17 U.S. Code § 107.", active: true },
          { id: "CP-03", number: "3", title: "DMCA Takedown Notice & Notice-and-Takedown Protocol", category: "DMCA Compliance", body: "If you are a copyright owner, or authorized representative thereof, and believe that any content hosted on csodisha.com infringes upon your copyright under the DMCA or Indian law, you may submit a formal Notice of Infringement to our Designated Copyright Officer with: 1) Identification of copyrighted work; 2) Direct URL of infringing link; 3) Contact details; 4) Good faith statement.", active: true },
          { id: "CP-04", number: "4", title: "Counter-Notification & Restoration Procedure", category: "DMCA Compliance", body: "If you believe content you uploaded or contributed was erroneously removed due to mistake or misidentification, you may submit a counter-notification to dmca@csodisha.com with physical/electronic signature, identification of removed material, and declaration under penalty of perjury.", active: true },
          { id: "CP-05", number: "5", title: "Repeat Infringer Policy & Access Revocation", category: "Enforcement", body: "In appropriate circumstances and at our sole discretion, Common Sense Odisha will terminate or block access privileges of users, guest contributors, or community forum participants who are identified as repeat infringers of intellectual property rights.", active: true }
        ],
        fairUseNotice: "Common Sense Odisha operates strictly under Section 52(1)(a) of the Indian Copyright Act, 1957 (Fair Dealing for private or personal use, research, and criticism) and Title 17 U.S. Code § 107. Third-party examination logos, seal marks, syllabus excerpts, and gazette citations are invoked exclusively for factual nomination, educational identification, and public awareness across Odisha without any assertion of proprietary ownership."
      };
    }

    var doc = config.document || {};
    var off = config.officer || {};

    // Header & Badges
    var badgeEl = document.getElementById('copyright-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('copyright-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('copyright-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var yearEl = document.getElementById('copyright-year');
    if (yearEl && doc.copyrightYear) yearEl.textContent = doc.copyrightYear;

    var dateEl = document.getElementById('copyright-effective-date');
    if (dateEl && doc.effectiveDate) dateEl.textContent = doc.effectiveDate;

    // Designated Officer
    var offNameEl = document.getElementById('copyright-officer-name');
    if (offNameEl && off.name) offNameEl.textContent = off.name;

    var offEmailEl = document.getElementById('copyright-officer-email');
    if (offEmailEl && off.email) {
      offEmailEl.textContent = off.email;
      offEmailEl.href = "mailto:" + off.email;
    }

    var offSecEmailEl = document.getElementById('copyright-officer-secondary-email');
    if (offSecEmailEl && off.secondaryEmail) {
      offSecEmailEl.textContent = off.secondaryEmail;
      offSecEmailEl.href = "mailto:" + off.secondaryEmail;
    }

    var offAddressEl = document.getElementById('copyright-officer-address');
    if (offAddressEl && off.address) offAddressEl.textContent = off.address;

    var offSlaEl = document.getElementById('copyright-officer-sla');
    if (offSlaEl && off.responseSlaHours) {
      offSlaEl.textContent = "Acknowledgment within 24 Hours • Resolution in " + off.responseSlaHours + " Hours";
    }

    // Fair Use Notice
    var fuEl = document.getElementById('copyright-fair-use-notice');
    if (fuEl && config.fairUseNotice) fuEl.textContent = config.fairUseNotice;

    // Clauses
    var clausesWrap = document.getElementById('copyright-clauses-container');
    var clausesList = Array.isArray(config.clauses) ? config.clauses.filter(function(cl) { return cl.active !== false; }) : [];
    if (clausesWrap && clausesList.length > 0) {
      csoSetHtml(clausesWrap, clausesList.map(function(cl, idx) {
        var num = cl.number || (idx + 1);
        var catClass = getCategoryClass(cl.category);
        return '<article class="clause-card">' +
               '  <div class="clause-header">' +
               '    <div class="clause-badge-wrap">' +
               '      <span class="clause-num">§' + escapeText(num) + '</span>' +
               '      <span class="clause-cat ' + catClass + '">' + escapeText(cl.category || 'Statutory') + '</span>' +
               '    </div>' +
               '  </div>' +
               '  <h2 class="clause-title">' + escapeText(cl.title || '') + '</h2>' +
               '  <div class="clause-body cso-u-5371db16">' + escapeText(cl.body || '') + '</div>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCopyrightPolicy);
  } else {
    hydrateCopyrightPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_copyright_config') {
      hydrateCopyrightPolicy();
    }
  });
})();
