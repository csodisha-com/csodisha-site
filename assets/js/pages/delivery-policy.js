/* Extracted from delivery-policy.html for strict CSP (v151). */
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

  function hydrateDeliveryPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_delivery_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "1.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Shipping & Digital Delivery Policy", badge: "Instant Edge Distribution", lastReviewed: "2026-11-01" },
        modes: [
          { id: "DEL-01", title: "Immediate Digital Access", format: "Direct Web / PDF Download", speed: "Instant (< 2 Seconds)", description: "Curated syllabus guides, previous question compilations, and model tests are delivered instantaneously via high-speed Cloudflare CDN edge nodes across Odisha.", active: true },
          { id: "DEL-02", title: "Zero Physical Shipping Notice", format: "Paperless Digital", speed: "N/A", description: "Common Sense Odisha does not print, warehouse, or physically ship paper textbooks or hardcopy notes via postal services. All instructional assets remain 100% paperless.", active: true },
          { id: "DEL-03", title: "Offline & Low-Bandwidth Caching", format: "Service Worker PWA", speed: "Immediate", description: "Aspirants in interior and rural districts can access cached study notes and previous questions even with intermittent 2G/3G connectivity.", active: true }
        ],
        infrastructure: {
          cdnProvider: "Cloudflare Global Anycast Edge Network",
          odishaNodes: "Bhubaneswar Edge POP & Kolkata Regional Data Center",
          downtimeSla: "99.9% Uptime Commitment",
          supportEmail: "tech@csodisha.com"
        }
      };
    }

    var doc = config.document || {};
    var infra = config.infrastructure || {};

    var badgeEl = document.getElementById('delivery-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('delivery-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('delivery-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('delivery-last-reviewed');
    if (dateEl && doc.lastReviewed) dateEl.textContent = doc.lastReviewed;

    var cdnEl = document.getElementById('delivery-cdn-provider');
    if (cdnEl && infra.cdnProvider) cdnEl.textContent = infra.cdnProvider;

    var nodesEl = document.getElementById('delivery-odisha-nodes');
    if (nodesEl && infra.odishaNodes) nodesEl.textContent = infra.odishaNodes;

    var slaEl = document.getElementById('delivery-downtime-sla');
    if (slaEl && infra.downtimeSla) slaEl.textContent = infra.downtimeSla;

    var emailEl = document.getElementById('delivery-support-email');
    if (emailEl && infra.supportEmail) {
      emailEl.textContent = infra.supportEmail;
      emailEl.href = "mailto:" + infra.supportEmail;
    }

    var container = document.getElementById('delivery-modes-container');
    var list = Array.isArray(config.modes) ? config.modes.filter(function(m) { return m.active !== false; }) : [];
    if (container && list.length > 0) {
      csoSetHtml(container, list.map(function(m, idx) {
        var num = idx + 1;
        return '<article class="mode-card">' +
               '  <div class="mode-header">' +
               '    <div class="mode-badge-wrap">' +
               '      <span class="mode-num">#' + num + '</span>' +
               '      <span class="mode-format-badge">' + escapeText(m.format || 'Digital') + '</span>' +
               '      <span class="mode-speed-badge">' + escapeText(m.speed || 'Instant') + '</span>' +
               '    </div>' +
               '    <span class="cso-u-87e5b3ed">' + escapeText(m.id || '') + '</span>' +
               '  </div>' +
               '  <h2 class="mode-title">' + escapeText(m.title || '') + '</h2>' +
               '  <p class="mode-desc">' + escapeText(m.description || '') + '</p>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateDeliveryPolicy);
  } else {
    hydrateDeliveryPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_delivery_config') {
      hydrateDeliveryPolicy();
    }
  });
})();
