/**
 * Common Sense Odisha — Public Support, Report an Error & Suggest Resource Desk (v312)
 * Connects directly to POST /api/public/support (D1 support_tickets -> Folder #7 Admin Inbox).
 * Strict CSP-compliant: zero innerHTML, zero .style.*, pure DOM APIs.
 */
(function (window, document) {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function initSupportForm() {
    var form = document.getElementById('csoSupportDeskForm');
    if (!form) return;

    var typeSel = document.getElementById('csoSupType');
    var urlInp = document.getElementById('csoSupPageUrl');
    var subjInp = document.getElementById('csoSupSubject');
    var msgInp = document.getElementById('csoSupMessage');
    var emailInp = document.getElementById('csoSupEmail');
    var hpInp = document.getElementById('csoSupWebsite');
    var statusEl = document.getElementById('csoSupStatus');
    var submitBtn = document.getElementById('csoSupSubmitBtn');

    function syncHashDefaults() {
      var hash = String(window.location.hash || '').toLowerCase();
      if (typeSel) {
        if (hash === '#suggest-resource') typeSel.value = 'suggest_resource';
        else if (hash === '#report-error') typeSel.value = 'report_error';
      }
      if (urlInp && !urlInp.value && document.referrer && document.referrer.indexOf(window.location.origin) === 0) {
        urlInp.value = document.referrer.slice(window.location.origin.length);
      }
    }

    syncHashDefaults();
    window.addEventListener('hashchange', syncHashDefaults);

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      if (!statusEl || !submitBtn) return;
      statusEl.textContent = '';
      statusEl.className = 'cso-support-status';

      var subject = subjInp ? subjInp.value.trim() : '';
      var message = msgInp ? msgInp.value.trim() : '';
      if (subject.length < 3 || message.length < 5) {
        statusEl.textContent = 'Please provide a clear subject and description before submitting.';
        statusEl.classList.add('is-error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      try {
        var res = await fetch('/api/public/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            ticket_type: typeSel ? typeSel.value : 'report_error',
            page_url: urlInp ? urlInp.value.trim() : '',
            subject: subject,
            message: message,
            contact_email: emailInp ? emailInp.value.trim() : '',
            website: hpInp ? hpInp.value.trim() : ''
          })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
        statusEl.textContent = '✓ ' + (data.message || 'Submitted successfully.') + (data.id ? (' (Ref: ' + data.id + ')') : '');
        statusEl.classList.add('is-ok');
        if (subjInp) subjInp.value = '';
        if (msgInp) msgInp.value = '';
      } catch (err) {
        statusEl.textContent = '⚠️ ' + (err.message || 'Could not submit right now. Please try again.');
        statusEl.classList.add('is-error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Ticket →';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportForm);
  } else {
    initSupportForm();
  }
})(window, document);
