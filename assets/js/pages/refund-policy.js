/* Extracted from refund-policy.html for strict CSP (v151). */
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

  function hydrateRefundPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_refund_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Refund & Cancellation Policy", badge: "100% Free Public Resource Guarantee", lastReviewed: "2026-11-01" },
        provisions: [
          { id: "REF-01", title: "Universal Free Access Guarantee", category: "Public Resource", body: "Common Sense Odisha provides syllabi, exam analyses, and educational resources completely free of charge. No payment gateway is integrated, and no fees are ever assessed.", active: true },
          { id: "REF-02", title: "Third-Party Fraud Warning", category: "Advisory", body: "Candidates are cautioned against fraudulent third-party agents soliciting money under our brand name. We never request payments, bank details, or UPI transfers.", active: true },
          { id: "REF-03", title: "Digital Materials Cancellation Terms", category: "Digital Services", body: "Because all digital preparatory materials and downloads are provided freely without commercial transaction, formal billing cancellations and refund requests are not applicable.", active: true }
        ],
        supportDesk: { email: "grievance@csodisha.com", note: "Report any fraudulent fee solicitations directly to our grievance desk." }
      };
    }

    var doc = config.document || {};
    var desk = config.supportDesk || {};

    var badgeEl = document.getElementById('refund-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('refund-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('refund-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('refund-last-reviewed');
    if (dateEl && doc.lastReviewed) dateEl.textContent = doc.lastReviewed;

    var noteEl = document.getElementById('refund-desk-note');
    if (noteEl && desk.note) noteEl.textContent = desk.note;

    var emailEl = document.getElementById('refund-desk-email');
    if (emailEl && desk.email) {
      emailEl.textContent = desk.email;
      emailEl.href = "mailto:" + desk.email;
    }

    var container = document.getElementById('refund-provisions-container');
    var list = Array.isArray(config.provisions) ? config.provisions.filter(function(pr) { return pr.active !== false; }) : [];
    if (container && list.length > 0) {
      csoSetHtml(container, list.map(function(pr, idx) {
        var num = idx + 1;
        return '<article class="prov-card">' +
               '  <div class="prov-header">' +
               '    <div class="prov-badge-wrap">' +
               '      <span class="prov-num">#' + num + '</span>' +
               '      <span class="prov-cat">' + escapeText(pr.category || 'Statutory') + '</span>' +
               '    </div>' +
               '    <span class="cso-u-87e5b3ed">' + escapeText(pr.id || '') + '</span>' +
               '  </div>' +
               '  <h2 class="prov-title">' + escapeText(pr.title || '') + '</h2>' +
               '  <div class="prov-body cso-u-5371db16">' + escapeText(pr.body || '') + '</div>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateRefundPolicy);
  } else {
    hydrateRefundPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_refund_config') {
      hydrateRefundPolicy();
    }
  });
})();
