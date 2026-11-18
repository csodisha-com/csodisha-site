(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Save for Offline (caches current SSR page + R2 PDF in SW cache)
    var offlineBtn = document.querySelector('.cso-sl-pub-offline-btn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', async function () {
        var pageUrl = window.location.href;
        var pdfUrl = offlineBtn.getAttribute('data-pdf-url') || '';
        offlineBtn.disabled = true;
        offlineBtn.textContent = 'Saving Offline...';
        try {
          if ('caches' in window) {
            var cache = await caches.open('cso-study-offline-v1');
            await cache.add(pageUrl);
            if (pdfUrl) {
              await cache.add(pdfUrl).catch(function () {});
            }
          }
          offlineBtn.textContent = '✓ Saved for Offline';
          offlineBtn.classList.add('is-saved');
        } catch (err) {
          offlineBtn.textContent = 'Offline Save Unavailable';
          offlineBtn.disabled = false;
        }
      });
    }

    // 2. Report Outdated / Suggest Topic toggle + DPDP-safe submission
    var toggleBtn = document.querySelector('.cso-sl-pub-suggest-toggle');
    var form = document.querySelector('.cso-sl-pub-suggest-form');
    if (toggleBtn && form) {
      toggleBtn.addEventListener('click', function () {
        form.hidden = !form.hidden;
      });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var statusEl = form.querySelector('.cso-sl-pub-suggest-status');
        var submitBtn = form.querySelector('button[type="submit"]');
        var titleInp = form.querySelector('input[name="title"]');
        var typeSel = form.querySelector('select[name="suggestion_type"]');
        var detailsInp = form.querySelector('textarea[name="details"]');
        var urlInp = form.querySelector('input[name="source_url"]');
        var title = titleInp ? titleInp.value.trim() : '';
        if (title.length < 4) {
          if (statusEl) statusEl.textContent = 'Please enter at least 4 characters.';
          return;
        }
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Submitting...';
        try {
          var res = await fetch('/api/public/study-library/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain_slug: form.getAttribute('data-domain-slug') || 'odisha-study-hub',
              folder_id: form.getAttribute('data-folder-id') || '',
              item_slug: form.getAttribute('data-item-slug') || '',
              suggestion_type: typeSel ? typeSel.value : 'topic',
              title: title,
              details: detailsInp ? detailsInp.value.trim() : '',
              source_url: urlInp ? urlInp.value.trim() : ''
            })
          });
          var data = await res.json();
          if (!res.ok || !data.ok) {
            throw new Error((data && data.message) || 'Submission failed');
          }
          if (statusEl) statusEl.textContent = 'Thank you! Submitted for editorial review.';
          form.reset();
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'Could not submit right now.';
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
    // 3. Self-Test Mode toggle for Practice MCQs (100% CSP compliant)
    var selfTestBtn = document.querySelector('.cso-sl-selftest-toggle');
    var mcqList = document.querySelector('.cso-sl-mcq-list');
    if (selfTestBtn && mcqList) {
      selfTestBtn.addEventListener('click', function () {
        var hidden = mcqList.classList.toggle('is-selftest');
        selfTestBtn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        selfTestBtn.textContent = hidden ? 'Show Answers & Explanations' : 'Hide Answers (Self-Test Mode)';
      });
    }
    // 4. Subject / Domain filter pills on Class Study Hubs (100% CSP compliant)
    var filterPills = document.querySelectorAll('.cso-ec-filter-pill');
    var filterTargets = document.querySelectorAll('[data-ec-domain]');
    if (filterPills.length && filterTargets.length) {
      filterPills.forEach(function (pill) {
        pill.addEventListener('click', function () {
          var chosen = pill.getAttribute('data-ec-filter') || 'all';
          filterPills.forEach(function (b) {
            var active = b === pill;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          filterTargets.forEach(function (card) {
            var dom = card.getAttribute('data-ec-domain') || 'all';
            card.hidden = chosen !== 'all' && dom !== 'all' && dom !== chosen;
          });
        });
      });
    }
  });
})();
