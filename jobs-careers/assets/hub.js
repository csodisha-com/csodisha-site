/* v161: Career Hub pages + landing hub counts. Strict CSP: DOM APIs only, addEventListener handlers, no innerHTML. */
(function () {
  'use strict';

  var pc = window.CSOPublicContent || null;
  var MAX_PAGES = 5;
  var PAGE_SIZE = 50;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function compile(pattern) {
    if (!pattern) return null;
    try { return new RegExp(pattern, 'i'); } catch (_) { return null; }
  }

  function haystack(job) {
    var tags = Array.isArray(job.tags) ? job.tags.join(' ') : '';
    return [job.title, job.summary, job.organisation, job.category, job.qualification, tags].join(' ').toLowerCase();
  }

  async function fetchAllJobs() {
    var all = [];
    for (var page = 1; page <= MAX_PAGES; page++) {
      var res = await fetch('/api/content/jobs?page=' + page + '&limit=' + PAGE_SIZE, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var items = Array.isArray(data.items) ? data.items : [];
      all = all.concat(items);
      var total = Number(data.total) || items.length;
      if (!items.length || all.length >= total) break;
    }
    return all;
  }

  /* ---------- toast + share ---------- */
  var toastTimer = null;
  function showToast(message) {
    var toast = document.getElementById('cso-live-toast');
    if (!toast) {
      toast = el('div', 'cso-live-toast');
      toast.id = 'cso-live-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2400);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'cso-offscreen-copy';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function triggerShare(info) {
    if (window.CSOStudentUtils && typeof window.CSOStudentUtils.openShareSheet === 'function') {
      window.CSOStudentUtils.openShareSheet(info);
      return;
    }
    if (window.CSOStudentUtils && typeof window.CSOStudentUtils.shareWhatsAppFormatted === 'function') {
      await window.CSOStudentUtils.shareWhatsAppFormatted(info);
      return;
    }
    var safeTitle = (info && info.title) || 'Job Notification';
    var detailUrl = (info && info.url) || window.location.href;
    var text = safeTitle + (info && info.lastDate ? ' (Last Date: ' + info.lastDate + ')' : '');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: safeTitle, text: text, url: detailUrl });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    var ok = await copyText(detailUrl);
    showToast(ok ? 'Copied for WhatsApp!' : 'Copy this link: ' + detailUrl);
  }

  function shareButton(job, detailUrl) {
    var title = job.title || 'Job Notification';
    var btn = el('button', 'live-btn live-btn--wa', '📲 Share');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Share ' + title);
    btn.addEventListener('click', function () {
      triggerShare({
        title: title,
        organisation: job.organisation || job.category || '',
        qualification: job.qualification || '',
        lastDate: job.last_date || '',
        url: detailUrl
      });
    });
    return btn;
  }

  function remindButton(job, detailUrl) {
    if (!job || !job.last_date) return null;
    var btn = el('button', 'live-btn live-btn--remind', '📅 Remind');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Add calendar reminder for ' + (job.title || 'Job Notification'));
    btn.addEventListener('click', function () {
      if (window.CSOStudentUtils && typeof window.CSOStudentUtils.downloadJobIcs === 'function') {
        window.CSOStudentUtils.downloadJobIcs({
          slug: job.slug || job.id || 'job',
          title: job.title || 'Job Notification',
          organisation: job.organisation || job.category || 'Common Sense Odisha',
          lastDate: job.last_date,
          url: detailUrl
        });
      }
    });
    return btn;
  }

  function hydrateSsrHubCards(grid) {
    if (!grid) return false;
    var cards = grid.querySelectorAll('[data-ssr-card]');
    if (!cards.length) return false;
    cards.forEach(function (card) {
      if (card.getAttribute('data-hydrated') === '1') return;
      card.setAttribute('data-hydrated', '1');
      var slug = card.getAttribute('data-job-slug') || '';
      var shareBtn = card.querySelector('[data-action="share"]');
      if (shareBtn && slug) {
        var title = shareBtn.getAttribute('data-title') || (card.querySelector('.live-job-card__title') ? card.querySelector('.live-job-card__title').textContent.trim() : 'Job Notification');
        var organisation = shareBtn.getAttribute('data-org') || '';
        var qualification = shareBtn.getAttribute('data-qual') || '';
        var lastDate = shareBtn.getAttribute('data-last-date') || '';
        var detailUrl = window.location.origin + '/jobs-careers/?job=' + encodeURIComponent(slug);
        shareBtn.addEventListener('click', function () {
          triggerShare({ title: title, organisation: organisation, qualification: qualification, lastDate: lastDate, url: detailUrl });
        });
      }
      var remBtn = card.querySelector('[data-action="remind"]');
      if (remBtn && slug) {
        var rTitle = remBtn.getAttribute('data-title') || (card.querySelector('.live-job-card__title') ? card.querySelector('.live-job-card__title').textContent.trim() : 'Job Notification');
        var rOrg = remBtn.getAttribute('data-org') || 'Common Sense Odisha';
        var rDate = remBtn.getAttribute('data-last-date') || '';
        var rUrl = window.location.origin + '/jobs-careers/?job=' + encodeURIComponent(slug);
        remBtn.addEventListener('click', function () {
          if (window.CSOStudentUtils && typeof window.CSOStudentUtils.downloadJobIcs === 'function') {
            window.CSOStudentUtils.downloadJobIcs({ slug: slug, title: rTitle, organisation: rOrg, lastDate: rDate, url: rUrl });
          }
        });
      }
    });
    if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
      window.CSOBookmarks.updateUI();
    }
    return true;
  }

  function saveButton(job) {
    if (!pc || typeof pc.createBookmarkButton !== 'function') return null;
    var btn = pc.createBookmarkButton({
      type: 'job',
      id: job.slug || job.id,
      title: job.title,
      badge: job.organisation || job.category || 'Job Alert',
      url: '/jobs-careers/?job=' + encodeURIComponent(job.slug || job.id),
      pdfUrl: job.notification_url || '',
      deadline: job.last_date || ''
    });
    btn.dataset.bookmarkIdle = '★ Save';
    btn.dataset.bookmarkSaved = '★ Saved';
    btn.classList.add('live-btn', 'live-btn--save');
    btn.title = 'Save to your Candidate Hub dashboard';
    var txt = btn.querySelector('.cso-bm-text');
    if (txt) txt.textContent = '★ Save';
    return btn;
  }

  function deadlineBadge(job) {
    if (job.status === 'expired' || job.expired) return { cls: 'cso-dl-closed', label: 'Application Closed' };
    if (job.last_date && pc && typeof pc.deadlineInfo === 'function') {
      var dl = pc.deadlineInfo(job.last_date);
      if (dl) return { cls: dl.statusClass, label: dl.label };
    }
    return null;
  }

  function jobCard(job) {
    var card = el('article', 'live-job-card');
    var top = el('div', 'live-job-card__top');
    var badges = el('div', 'live-job-card__badges');
    if (job.organisation) badges.appendChild(el('span', 'live-badge live-badge--org', job.organisation));
    if (job.state) badges.appendChild(el('span', 'live-badge live-badge--state', job.state));
    if (job.category) badges.appendChild(el('span', 'live-badge', job.category));
    var dl = deadlineBadge(job);
    if (dl) badges.appendChild(el('span', 'live-badge ' + dl.cls, dl.label));
    top.appendChild(badges);
    top.appendChild(el('h3', 'live-job-card__title', job.title || 'Untitled Notification'));
    if (job.summary) top.appendChild(el('p', 'live-job-card__summary', job.summary));
    var meta = el('div', 'live-job-card__meta');
    var vac = (job.vacancies !== null && job.vacancies !== undefined && job.vacancies !== '')
      ? '👥 ' + Number(job.vacancies).toLocaleString('en-IN') + ' Vacancies'
      : '👥 Vacancies: Refer PDF';
    meta.appendChild(el('span', 'live-meta-pill', vac));
    if (job.qualification) meta.appendChild(el('span', 'live-meta-pill', '🎓 ' + job.qualification));
    if (job.last_date && pc && typeof pc.formatDate === 'function') {
      meta.appendChild(el('span', 'live-meta-pill', '⏰ Deadline: ' + pc.formatDate(job.last_date)));
    }
    top.appendChild(meta);
    card.appendChild(top);

    var slug = job.slug || job.id || '';
    var detailPath = '/jobs-careers/?job=' + encodeURIComponent(slug);
    var detailUrl = window.location.origin + detailPath;
    var footer = el('div', 'live-job-card__footer');

    var details = el('a', 'live-btn live-btn--primary', 'View Details');
    details.href = detailPath;
    footer.appendChild(details);

    var applyHref = job.apply_url || job.notification_url || '';
    if (applyHref && pc && typeof pc.safeHref === 'function' && pc.safeHref(applyHref)) {
      var apply = el('a', 'live-btn', 'Apply Online ↗');
      apply.href = applyHref;
      apply.target = '_blank';
      apply.rel = 'noopener noreferrer';
      footer.appendChild(apply);
    } else {
      var info = el('a', 'live-btn', 'Official Info');
      info.href = detailPath;
      footer.appendChild(info);
    }

    footer.appendChild(shareButton(job, detailUrl));
    var save = saveButton(job);
    if (save) footer.appendChild(save);
    var remind = remindButton(job, detailUrl);
    if (remind) footer.appendChild(remind);
    card.appendChild(footer);
    return card;
  }

  /* ---------- hub page ---------- */
  function initHub(main) {
    var hubRe = compile(main.getAttribute('data-hub-pattern'));
    var grid = document.getElementById('hub-grid');
    var status = document.getElementById('hub-status');
    var countEl = document.getElementById('hub-count');
    var search = document.getElementById('hub-search');
    var chipWrap = document.getElementById('hub-chips');
    var resetBtn = document.getElementById('hub-reset');
    var moreWrap = document.getElementById('hub-more');
    if (!grid || !status) return;

    var hasSsr = grid.getAttribute('data-ssr') === '1' && hydrateSsrHubCards(grid);
    var hubJobs = [];
    var dataReady = false;
    var showAll = false;
    var state = { q: '', chip: -1 };
    var chips = chipWrap ? Array.prototype.slice.call(chipWrap.querySelectorAll('[data-hub-chip]')) : [];
    var chipRes = chips.map(function (c) { return compile(c.getAttribute('data-pattern')); });
    var timer = null;

    function filtered() {
      var q = state.q.toLowerCase();
      return hubJobs.filter(function (job) {
        var hay = haystack(job);
        if (state.chip > 0 && chipRes[state.chip] && !chipRes[state.chip].test(hay)) return false;
        if (q && hay.indexOf(q) === -1) return false;
        return true;
      });
    }

    function syncChips() {
      chips.forEach(function (btn, i) {
        var active = (state.chip < 1 && i === 0) || state.chip === i;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function reset() {
      state.q = '';
      state.chip = -1;
      if (search) search.value = '';
      syncChips();
      render();
    }

    function render() {
      var items = filtered();
      var hasFilter = Boolean(state.q || state.chip > 0);
      if (resetBtn) resetBtn.hidden = !hasFilter;
      if (moreWrap) moreWrap.hidden = true;
      if (countEl) countEl.textContent = items.length.toLocaleString('en-IN') + (items.length === 1 ? ' Active Notice' : ' Active Notices');
      grid.replaceChildren();
      grid.removeAttribute('data-ssr');
      if (!items.length) {
        status.hidden = false;
        status.replaceChildren(el('p', '', hasFilter
          ? 'No live notices match these filters.'
          : 'No live notices are open in this hub right now. Check the official portals above or the study resources below.'));
        if (hasFilter) {
          var again = el('button', 'live-btn live-btn--primary', 'Reset Filters');
          again.type = 'button';
          again.addEventListener('click', reset);
          status.appendChild(again);
        }
        return;
      }
      status.hidden = true;
      var frag = document.createDocumentFragment();
      items.forEach(function (job) { frag.appendChild(jobCard(job)); });
      grid.appendChild(frag);
      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') window.CSOBookmarks.updateUI();
    }

    var ssrMoreBtn = document.getElementById('hub-more-btn');
    if (ssrMoreBtn) {
      ssrMoreBtn.addEventListener('click', function () {
        showAll = true;
        if (dataReady) render();
      });
    }

    chips.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        state.chip = i === 0 ? -1 : i;
        syncChips();
        if (dataReady || !hasSsr) render();
      });
    });
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = search.value.trim();
          if (dataReady || !hasSsr) render();
        }, 150);
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', reset);

    fetchAllJobs().then(function (all) {
      hubJobs = hubRe ? all.filter(function (job) { return hubRe.test(haystack(job)); }) : all;
      dataReady = true;
      var hasFilter = Boolean(state.q || state.chip > 0);
      if (hasSsr && !hasFilter && !showAll) {
        var ssrCards = Array.prototype.slice.call(grid.querySelectorAll('[data-ssr-card]'));
        var ssrSlugs = ssrCards.map(function (n) { return n.getAttribute('data-job-slug') || ''; }).join(',');
        var topSlugs = hubJobs.slice(0, ssrCards.length).map(function (j) { return j.slug || j.id || ''; }).join(',');
        if (ssrSlugs && ssrSlugs === topSlugs) {
          if (countEl) countEl.textContent = hubJobs.length.toLocaleString('en-IN') + (hubJobs.length === 1 ? ' Active Notice' : ' Active Notices');
          if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') window.CSOBookmarks.updateUI();
          return;
        }
      }
      render();
    }).catch(function () {
      if (hasSsr && grid.querySelector('[data-ssr-card]')) return;
      if (countEl) countEl.textContent = 'Unavailable';
      status.hidden = false;
      status.replaceChildren(el('p', '', 'Unable to load live notices right now.'));
      var retry = el('button', 'live-btn', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', function () { window.location.reload(); });
      status.appendChild(retry);
    });
  }

  /* ---------- landing: live counts on hub cards ---------- */
  function initLandingCounts(counters) {
    fetchAllJobs().then(function (all) {
      var hays = all.map(haystack);
      counters.forEach(function (node) {
        var card = node.closest('[data-hub-pattern]');
        var re = card ? compile(card.getAttribute('data-hub-pattern')) : null;
        if (!re) return;
        var n = hays.filter(function (h) { return re.test(h); }).length;
        node.textContent = n > 0
          ? n.toLocaleString('en-IN') + (n === 1 ? ' live notice' : ' live notices')
          : 'Study resources & portals';
      });
    }).catch(function () { /* keep the default "Open hub" label */ });
  }

  function boot() {
    var main = document.getElementById('career-hub');
    if (main) initHub(main);
    var counters = Array.prototype.slice.call(document.querySelectorAll('[data-hub-count]'));
    if (counters.length) initLandingCounts(counters);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
