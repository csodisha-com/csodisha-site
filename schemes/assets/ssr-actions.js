(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var offlineBtn = document.querySelector('.cso-schemes-ssr-offline-btn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', async function () {
        var pageUrl = window.location.href;
        var pdfUrl = offlineBtn.getAttribute('data-pdf-url') || '';
        offlineBtn.disabled = true;
        offlineBtn.textContent = 'Saving Offline...';
        try {
          if ('caches' in window) {
            var cache = await caches.open('cso-schemes-offline-v1');
            await cache.add(pageUrl);
            if (pdfUrl) await cache.add(pdfUrl).catch(function () {});
          }
          offlineBtn.textContent = 'Saved for Offline';
        } catch (err) {
          offlineBtn.textContent = 'Offline Save Unavailable';
          offlineBtn.disabled = false;
        }
      });
    }

    var printBtn = document.querySelector('.cso-schemes-ssr-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', function () { window.print(); });
    }

    var toggleBtn = document.querySelector('.cso-schemes-ssr-suggest-toggle');
    var form = document.querySelector('.cso-ssr-suggest-form');
    if (toggleBtn && form) {
      toggleBtn.addEventListener('click', function () {
        form.hidden = !form.hidden;
      });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var statusEl = form.querySelector('.cso-ssr-suggest-status');
        var submitBtn = form.querySelector('button[type="submit"]');
        var msgInp = form.querySelector('textarea[name="message"]');
        var catSel = form.querySelector('select[name="category"]');
        var urlInp = form.querySelector('input[name="suggested_url"]');
        var message = msgInp ? msgInp.value.trim() : '';
        if (message.length < 4) {
          if (statusEl) statusEl.textContent = 'Please enter at least 4 characters.';
          return;
        }
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Submitting...';
        try {
          var res = await fetch('/api/public/schemes-directory/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain_slug: form.getAttribute('data-domain-slug') || 'govt-public-welfare',
              folder_id: form.getAttribute('data-folder-id') || '',
              item_id: form.getAttribute('data-item-id') || '',
              category: catSel ? catSel.value : 'outdated-link',
              message: message,
              suggested_url: urlInp ? urlInp.value.trim() : ''
            })
          });
          var data = await res.json();
          if (!res.ok || !data.ok) throw new Error((data && data.message) || 'Submission failed');
          if (statusEl) statusEl.textContent = 'Thank you! Submitted for editorial verification.';
          form.reset();
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'Could not submit right now.';
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  });
})();
