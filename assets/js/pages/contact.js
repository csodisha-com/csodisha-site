/* Extracted from contact.html for strict CSP (v151). */
(function() {
    'use strict';

    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const phoneInput = document.getElementById('contact-phone');
      const districtInput = document.getElementById('contact-district');
      const subjectInput = document.getElementById('contact-subject');
      const messageInput = document.getElementById('contact-message');

      const name = (nameInput.value || '').trim();
      const email = (emailInput.value || '').trim();
      const phone = (phoneInput.value || '').trim();
      const district = (districtInput.value || '').trim();
      const subject = (subjectInput.value || '').trim();
      const message = (messageInput.value || '').trim();

      if (!name || !email || !phone || !district || !subject || !message) {
        alert('Please complete all required fields before submitting.');
        return;
      }

      const timestamp = new Date().toISOString();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const id = 'INQ-' + new Date().getFullYear() + '-' + randomId;

      // Formatted inquiry payload required by specification:
      // (id, name, email, phone, district, subject, message, timestamp)
      const inquiry = {
        id: id,
        name: name,
        email: email,
        phone: phone,
        district: district,
        subject: subject,
        message: message,
        timestamp: timestamp
      };

      try {
        let existing = [];
        const raw = localStorage.getItem('cso_super_inquiries');
        if (raw) {
          try {
            existing = JSON.parse(raw);
            if (!Array.isArray(existing)) existing = [];
          } catch (_) {
            existing = [];
          }
        }
        // Prepend directly into cso_super_inquiries in localStorage
        existing.unshift(inquiry);
        localStorage.setItem('cso_super_inquiries', JSON.stringify(existing));

        // Dispatch storage event so open admin windows update immediately
        try {
          window.dispatchEvent(new Event('storage'));
        } catch (_) {}
      } catch (err) {
        console.warn('Failed to persist inquiry to localStorage:', err);
      }

      // Show clean confirmation toast/message without a full page reload
      const toast = document.getElementById('contact-toast');
      const toastName = document.getElementById('toast-name');
      const toastId = document.getElementById('toast-id');

      if (toastName) toastName.textContent = name;
      if (toastId) toastId.textContent = id;
      if (toast) {
        toast.style.display = 'flex';
        toast.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      form.reset();
    });
  })();

  // Hydrate Live Institutional Contact Directory
  (function() {
    function escapeText(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return String(div.textContent).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function hydrateContactDirectory() {
      let conf = null;
      try {
        const raw = localStorage.getItem('cso_contact_config') || localStorage.getItem('cso_contact_directory');
        if (raw) conf = JSON.parse(raw);
      } catch (_) {}

      // Normalize between cso_contact_config and legacy cso_contact_directory schemas
      let endpoints = {};
      let departments = [];

      if (conf && conf.endpoints) {
        endpoints = conf.endpoints;
        departments = Array.isArray(conf.departments) ? conf.departments : [];
      } else if (conf) {
        endpoints = {
          primaryEmail: conf.primaryEmail,
          helplinePhone: conf.helplineNumber,
          operatingHours: conf.operatingHours,
          postalAddress: conf.postalAddress,
          slaResponseTime: "Within 24 business hours"
        };
        departments = Array.isArray(conf.channels) ? conf.channels : [];
      } else {
        endpoints = {
          primaryEmail: "contact@csodisha.com",
          helplinePhone: "+91 674 239 0000",
          operatingHours: "09:30 AM - 05:30 PM IST (Mon - Sat)",
          postalAddress: "CS Odisha Academic Intelligence Node, Bhubaneswar / Balasore Liaison Desk, Odisha - 751001",
          slaResponseTime: "Within 24 business hours"
        };
        departments = [
          { id: "DEPT-01", name: "Candidate Admission & Syllabus Helpdesk", email: "academic@csodisha.com", category: "Academic", hours: "10:00 - 17:00 IST", active: true },
          { id: "DEPT-02", name: "Grievance & Statutory Redressal", email: "grievance@csodisha.com", category: "Legal", hours: "10:00 - 16:00 IST", active: true },
          { id: "DEPT-03", name: "Technical Portal & CDN Operations", email: "admin@csodisha.com", category: "Technical", hours: "24/7 Monitoring", active: true },
          { id: "DEPT-04", name: "District Community Outreach Desk", email: "outreach@csodisha.com", category: "Outreach", hours: "10:00 - 17:00 IST", active: true }
        ];
      }

      const sec = document.getElementById('contact-directory-section');
      if (sec) sec.style.display = 'block';

      const emailEl = document.getElementById('dir-primary-email');
      if (emailEl) emailEl.textContent = endpoints.primaryEmail || 'contact@csodisha.com';

      const phoneEl = document.getElementById('dir-helpline-phone');
      if (phoneEl) phoneEl.textContent = endpoints.helplinePhone || '+91 674 239 0000';

      const hoursEl = document.getElementById('contact-hours-badge');
      if (hoursEl) hoursEl.textContent = endpoints.operatingHours || '09:30 AM - 05:30 PM IST (Mon - Sat)';

      const slaEl = document.getElementById('contact-sla-badge');
      if (slaEl) slaEl.textContent = endpoints.slaResponseTime || 'Within 24 business hours';

      const addrEl = document.getElementById('dir-postal-address');
      if (addrEl) addrEl.textContent = endpoints.postalAddress || 'Odisha, India';

      const channelsGrid = document.getElementById('dir-channels-grid');
      const activeDepts = departments.filter(function(d) { return d.active !== false; });
      if (channelsGrid && activeDepts.length > 0) {
        csoSetHtml(channelsGrid, activeDepts.map(function(c) {
          return '<div class="cso-u-a90f5b9f">' +
                 '<div class="cso-u-558521bb">' + escapeText(c.name) + '</div>' +
                 '<div class="cso-u-f95078ea">' + escapeText(c.email) + '</div>' +
                 '<div class="cso-u-df729a45">' +
                   '<span>' + escapeText(c.category) + '</span>' +
                   '<span>' + escapeText(c.hours) + '</span>' +
                 '</div>' +
                 '</div>';
        }).join(''));
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hydrateContactDirectory);
    } else {
      hydrateContactDirectory();
    }

    window.addEventListener('storage', function(e) {
      if (e.key === 'cso_contact_config' || e.key === 'cso_contact_directory') {
        hydrateContactDirectory();
      }
    });
  })();
