/* Extracted from faqs.html for strict CSP (v151). */
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

  var activeCategory = 'all';

  function hydrateFaqs() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_faqs_config');
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
        document: { title: "Candidate Frequently Asked Questions", badge: "Verified Academic Knowledgebase", lastReviewed: "2026-11-01" },
        categories: ["General", "OPSC / OSSC Exams", "Syllabus Verification", "Technical Access", "Grievance Desk"],
        items: [
          { id: "FAQ-01", question: "Is Common Sense Odisha an official government portal?", answer: "No. Common Sense Odisha is an independent civic and educational intelligence gateway. We synthesize official Odisha Gazette publications and commission releases to assist aspirants across all 30 districts.", category: "General", active: true },
          { id: "FAQ-02", question: "Are study materials and syllabus breakdowns 100% free?", answer: "Yes. All digital materials, syllabus roadmaps, and PYQ analysis tools are delivered completely free without subscription paywalls.", category: "Syllabus Verification", active: true },
          { id: "FAQ-03", question: "How often are examination updates verified against official gazettes?", answer: "Our academic editorial desk runs reconciliation scans within 24 hours of any formal gazette notification released by OPSC, OSSC, OSSSC, or BSE Odisha.", category: "OPSC / OSSC Exams", active: true },
          { id: "FAQ-04", question: "Who do I contact if I discover a discrepancy in syllabus markings?", answer: "Aspirants can submit errata directly to corrections@csodisha.com or through our Corrections Desk under module-03-009.", category: "Grievance Desk", active: true }
        ]
      };
    }

    var doc = config.document || {};

    var badgeEl = document.getElementById('faqs-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('faqs-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('faqs-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('faqs-last-reviewed');
    if (dateEl && doc.lastReviewed) dateEl.textContent = doc.lastReviewed;

    // Categories
    var catContainer = document.getElementById('faqs-category-pills');
    var catList = Array.isArray(config.categories) ? config.categories : ["General"];
    if (catContainer) {
      var pillsHtml = '<button class="filter-btn ' + (activeCategory === 'all' ? 'active' : '') + '" data-cat="all">All Questions</button>';
      catList.forEach(function(c) {
        var isAct = activeCategory === c ? 'active' : '';
        pillsHtml += '<button class="filter-btn ' + isAct + '" data-cat="' + escapeText(c) + '">' + escapeText(c) + '</button>';
      });
      csoSetHtml(catContainer, pillsHtml);

      catContainer.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          activeCategory = this.getAttribute('data-cat') || 'all';
          hydrateFaqs();
        });
      });
    }

    // Accordion Items
    var container = document.getElementById('faqs-accordion-container');
    var allItems = Array.isArray(config.items) ? config.items.filter(function(i) { return i.active !== false; }) : [];
    var filtered = activeCategory === 'all' ? allItems : allItems.filter(function(i) { return (i.category || '').toLowerCase() === activeCategory.toLowerCase(); });

    if (container) {
      if (filtered.length === 0) {
        csoSetHtml(container, '<div class="cso-u-714226be">No questions found in this category.</div>');
      } else {
        csoSetHtml(container, filtered.map(function(item) {
          return '<details class="faq-card">' +
                 '  <summary>' +
                 '    <span><span class="faq-cat-badge">' + escapeText(item.category || 'General') + '</span>' + escapeText(item.question || '') + '</span>' +
                 '  </summary>' +
                 '  <div class="faq-content">' + escapeText(item.answer || '') + '</div>' +
                 '</details>';
        }).join(''));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateFaqs);
  } else {
    hydrateFaqs();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_faqs_config') {
      hydrateFaqs();
    }
  });
})();
