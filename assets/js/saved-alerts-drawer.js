/**
 * Common Sense Odisha — Local-First Saved-Alerts & Deadline Countdown Drawer (v391)
 * Backed by localStorage (`cso_saved_alerts_v1`) with cross-tab storage sync,
 * live Asia/Kolkata (IST) countdown pills, and 1-click multi-event .ics calendar export
 * via window.CSOCalendarExport.
 * Strict CSP-compliant: DOM APIs only, zero inline styles/handlers, EN / ଓଡ଼ିଆ bilingual.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOSavedAlerts = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOSavedAlerts = api;
})(function (win, doc) {
  'use strict';

  var STORAGE_KEY = 'cso_saved_alerts_v1';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var activeFilter = 'all';
  var confirmClearMode = false;

  function isOdia() {
    if (!doc) return false;
    var root = doc.documentElement;
    var body = doc.body;
    if (body && body.getAttribute('data-guide-lang') === 'or') return true;
    if (root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or')) return true;
    try {
      var pref = win.localStorage && win.localStorage.getItem('cso_jobs_lang');
      if (pref === 'or' && body && body.getAttribute('data-cso-portal') === 'jobs') return true;
    } catch (_) {}
    return false;
  }

  function safeUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return '/';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '/';
  }

  function pad2(n) {
    return n < 10 ? ('0' + n) : String(n);
  }

  /** Returns current IST (Asia/Kolkata, UTC+5:30) calendar date as YYYY-MM-DD */
  function getIstTodayYmd(nowDate) {
    var d = nowDate instanceof Date ? nowDate : new Date();
    var istMs = d.getTime() + (330 * 60 * 1000);
    var ist = new Date(istMs);
    return String(ist.getUTCFullYear()) + '-' + pad2(ist.getUTCMonth() + 1) + '-' + pad2(ist.getUTCDate());
  }

  function extractIsoYmd(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var m = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    if (win && win.CSOCalendarExport && typeof win.CSOCalendarExport.parseDateRange === 'function') {
      var p = win.CSOCalendarExport.parseDateRange(s);
      if (p && p.isoStart) return p.isoStart;
    }
    return '';
  }

  /**
   * Computes live IST day delta and bilingual countdown badge metadata.
   */
  function computeIstCountdown(deadlineIso, opts) {
    var o = opts || {};
    var iso = extractIsoYmd(deadlineIso);
    if (!iso) {
      return {
        state: 'reference',
        days: null,
        tone: 'calm',
        urgent: false,
        label_en: 'Saved Reference',
        label_or: 'ସେଭ୍ ହୋଇଛି'
      };
    }
    var todayIso = o.todayIso || getIstTodayYmd(o.now);
    var tp = todayIso.split('-').map(Number);
    var dp = iso.split('-').map(Number);
    var todayUtc = Date.UTC(tp[0], tp[1] - 1, tp[2]);
    var targetUtc = Date.UTC(dp[0], dp[1] - 1, dp[2]);
    var delta = Math.round((targetUtc - todayUtc) / 86400000);
    var isWalkIn = /walk-?in/i.test(String(o.title || o.deadline_label || ''));

    if (delta < 0) {
      return {
        state: 'closed',
        days: delta,
        tone: 'muted',
        urgent: false,
        label_en: 'Closed / Passed',
        label_or: 'ସମାପ୍ତ'
      };
    }
    if (delta === 0) {
      return {
        state: 'today',
        days: 0,
        tone: 'urgent-pulse',
        urgent: true,
        label_en: 'Today!',
        label_or: 'ଆଜି!'
      };
    }
    if (delta === 1) {
      return {
        state: 'tomorrow',
        days: 1,
        tone: 'urgent',
        urgent: true,
        label_en: isWalkIn ? 'Walk-in Tomorrow' : 'Ends Tomorrow',
        label_or: 'ଆସନ୍ତାକାଲି'
      };
    }
    if (delta <= 7) {
      return {
        state: 'soon',
        days: delta,
        tone: 'warn',
        urgent: delta <= 3,
        label_en: 'Ends in ' + delta + ' days',
        label_or: delta + ' ଦିନ ବାକି'
      };
    }
    var ddMmm = pad2(dp[2]) + ' ' + (MONTHS[dp[1] - 1] || '');
    return {
      state: 'upcoming',
      days: delta,
      tone: 'calm',
      urgent: false,
      label_en: 'In ' + delta + ' days (' + ddMmm + ')',
      label_or: delta + ' ଦିନ ବାକି'
    };
  }

  function normalizeCategory(raw) {
    var c = String(raw || '').toLowerCase().trim();
    if (c === 'job_alert' || c === 'job' || c === 'jobs') return 'job_alert';
    if (c === 'exam_update' || c === 'exam' || c === 'admit_card' || c === 'exams') return 'exam_update';
    if (c === 'result' || c === 'results') return 'result';
    return 'guide';
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var slug = String(raw.slug || '').trim();
    var id = String(raw.id || slug || raw.url || '').trim();
    if (!id) return null;
    var titleEn = String(raw.title_en || raw.title || 'Saved Alert').trim().slice(0, 220);
    return {
      id: id,
      slug: slug || id,
      url: safeUrl(raw.url || (slug ? ('/jobs/' + encodeURIComponent(slug)) : '/')),
      title_en: titleEn,
      title_or: String(raw.title_or || titleEn).trim().slice(0, 260),
      org: String(raw.org || raw.organisation_en || '').trim().slice(0, 120),
      category: normalizeCategory(raw.category),
      deadline_iso: extractIsoYmd(raw.deadline_iso || raw.deadline || raw.last_date || raw.exam_date || ''),
      deadline_label: String(raw.deadline_label || '').trim().slice(0, 80),
      venue_or_mode: String(raw.venue_or_mode || raw.location_district || 'Online / Official Portal').trim().slice(0, 120),
      official_url: String(raw.official_url || '').trim().slice(0, 400),
      saved_at: String(raw.saved_at || new Date().toISOString())
    };
  }

  function readStorage() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      var seen = {};
      var out = [];
      for (var i = 0; i < arr.length; i += 1) {
        var norm = normalizeItem(arr[i]);
        if (!norm || seen[norm.id]) continue;
        seen[norm.id] = true;
        out.push(norm);
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function writeStorage(list) {
    try {
      if (win.localStorage) {
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (_) {}
    syncAllButtons();
    if (isDrawerOpen()) renderDrawerBody();
  }

  function getAll() {
    return readStorage();
  }

  function isSaved(id) {
    var key = String(id || '').trim();
    if (!key) return false;
    var list = readStorage();
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === key) return true;
    }
    return false;
  }

  function toggleAlert(item) {
    var norm = normalizeItem(item);
    if (!norm) return false;
    var list = readStorage();
    var idx = -1;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === norm.id) { idx = i; break; }
    }
    if (idx !== -1) {
      list.splice(idx, 1);
      writeStorage(list);
      return false;
    }
    list.unshift(norm);
    writeStorage(list.slice(0, 100));
    return true;
  }

  function removeAlert(id) {
    var key = String(id || '').trim();
    var list = readStorage().filter(function (x) { return x.id !== key; });
    writeStorage(list);
    return list.length;
  }

  function clearAll() {
    confirmClearMode = false;
    writeStorage([]);
  }

  function getUrgentCount(nowDate) {
    var list = readStorage();
    var urgent = 0;
    for (var i = 0; i < list.length; i += 1) {
      var cd = computeIstCountdown(list[i].deadline_iso, { now: nowDate, title: list[i].title_en, deadline_label: list[i].deadline_label });
      if (cd.urgent) urgent += 1;
    }
    return urgent;
  }

  function sortAlertsForDrawer(list, nowDate) {
    return list.slice().sort(function (a, b) {
      var ca = computeIstCountdown(a.deadline_iso, { now: nowDate, title: a.title_en, deadline_label: a.deadline_label });
      var cb = computeIstCountdown(b.deadline_iso, { now: nowDate, title: b.title_en, deadline_label: b.deadline_label });
      var rankA = ca.days !== null && ca.days >= 0 ? ca.days : (ca.state === 'reference' ? 10000 : 20000 - (ca.days || 0));
      var rankB = cb.days !== null && cb.days >= 0 ? cb.days : (cb.state === 'reference' ? 10000 : 20000 - (cb.days || 0));
      if (rankA !== rankB) return rankA - rankB;
      return String(b.saved_at || '').localeCompare(String(a.saved_at || ''));
    });
  }

  function buildIcsEventsFromSaved(list) {
    var origin = (win && win.location && win.location.origin) || 'https://csodisha.com';
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it || !it.deadline_iso) continue;
      out.push({
        uid: 'saved-' + it.id + '-' + it.deadline_iso,
        summary: it.title_en + (it.deadline_label ? (' — ' + it.deadline_label) : ''),
        date: it.deadline_iso,
        location: it.venue_or_mode || 'Online / Official Portal',
        url: it.url.startsWith('http') ? it.url : (origin + it.url),
        officialUrl: it.official_url || '',
        description: it.org ? ('Authority: ' + it.org) : 'Saved deadline on Common Sense Odisha'
      });
    }
    return out;
  }

  function exportAllSavedIcs(btnEl) {
    var events = buildIcsEventsFromSaved(readStorage());
    if (!events.length) return false;
    var calApi = win && win.CSOCalendarExport;
    if (calApi && typeof calApi.downloadEventBundle === 'function') {
      return calApi.downloadEventBundle(events, 'csodisha-saved-deadlines', btnEl, isOdia());
    }
    return false;
  }

  // ---------- DOM Helpers ----------
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function updateButtonVisual(btn, saved, orMode) {
    if (!btn) return;
    btn.classList.toggle('is-saved', saved);
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    var compact = btn.classList.contains('cso-sa-bm-btn--icon');
    if (compact) {
      btn.textContent = saved ? '★' : '☆';
    } else {
      btn.textContent = saved
        ? (orMode ? '★ ସେଭ୍ ହୋଇଛି' : '★ Saved')
        : (orMode ? '☆ ସେଭ୍' : '☆ Save');
    }
  }

  function createBookmarkButton(item, opts) {
    if (!doc || !item) return null;
    var norm = normalizeItem(item);
    if (!norm) return null;
    var o = opts || {};
    var orMode = o.isOr !== undefined ? Boolean(o.isOr) : isOdia();
    var saved = isSaved(norm.id);
    var btn = el('button', 'cso-sa-bm-btn' + (o.compact ? ' cso-sa-bm-btn--compact' : '') + (o.iconOnly ? ' cso-sa-bm-btn--icon' : '') + (o.extraClass ? (' ' + o.extraClass) : ''));
    btn.type = 'button';
    btn.setAttribute('data-cso-save-id', norm.id);
    btn.setAttribute('aria-label', (saved ? 'Remove from saved alerts: ' : 'Save alert: ') + norm.title_en);
    updateButtonVisual(btn, saved, orMode);
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggleAlert(norm);
    });
    return btn;
  }

  function syncAllButtons() {
    if (!doc) return;
    var orMode = isOdia();
    var list = readStorage();
    var savedMap = {};
    list.forEach(function (x) { savedMap[x.id] = true; });
    doc.querySelectorAll('[data-cso-save-id]').forEach(function (btn) {
      var id = btn.getAttribute('data-cso-save-id') || '';
      updateButtonVisual(btn, Boolean(savedMap[id]), orMode);
    });
    var count = list.length;
    var urgent = getUrgentCount();
    doc.querySelectorAll('#cso-saved-count, [data-cso-saved-count]').forEach(function (badge) {
      badge.textContent = String(count);
    });
    doc.querySelectorAll('[data-cso-saved-trigger], #cso-ctl-saved').forEach(function (trig) {
      trig.classList.toggle('has-urgent-deadline', urgent > 0);
      var dot = trig.querySelector('[data-cso-saved-urgent]');
      if (dot) dot.hidden = urgent === 0;
    });
  }

  // ---------- Slide-Over Drawer ----------
  function isDrawerOpen() {
    if (!doc) return false;
    var bd = doc.getElementById('cso-sa-drawer-backdrop');
    return Boolean(bd && !bd.hidden);
  }

  function closeDrawer() {
    if (!doc) return;
    var bd = doc.getElementById('cso-sa-drawer-backdrop');
    if (bd) bd.hidden = true;
    confirmClearMode = false;
    if (doc.body) doc.body.classList.remove('cso-modal-open');
  }

  function ensureDrawer() {
    var existing = doc.getElementById('cso-sa-drawer-backdrop');
    if (existing) return existing;

    var backdrop = el('div', 'cso-sa-backdrop');
    backdrop.id = 'cso-sa-drawer-backdrop';
    backdrop.hidden = true;

    var drawer = el('aside', 'cso-sa-drawer');
    drawer.id = 'cso-sa-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'cso-sa-drawer-title');

    var head = el('div', 'cso-sa-drawer__head');
    var titleWrap = el('div', 'cso-sa-drawer__title-wrap');
    var h2 = el('h2', 'cso-sa-drawer__title', '🔖 My Saved Alerts | ମୋର ସେଭ୍ ହୋଇଥିବା ସୂଚନା');
    h2.id = 'cso-sa-drawer-title';
    titleWrap.appendChild(h2);
    var closeBtn = el('button', 'cso-sa-drawer__close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close My Saved Alerts drawer');
    closeBtn.addEventListener('click', closeDrawer);
    head.append(titleWrap, closeBtn);

    var tabs = el('div', 'cso-sa-tabs');
    tabs.id = 'cso-sa-drawer-tabs';
    tabs.setAttribute('role', 'tablist');
    [
      ['all', 'All'],
      ['upcoming', 'Upcoming Deadlines'],
      ['job_alert', 'Jobs'],
      ['exams_results', 'Exams & Results']
    ].forEach(function (pair) {
      var b = el('button', 'cso-sa-tab' + (activeFilter === pair[0] ? ' is-active' : ''), pair[1]);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('data-sa-filter', pair[0]);
      b.setAttribute('aria-selected', activeFilter === pair[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        activeFilter = pair[0];
        renderDrawerBody();
      });
      tabs.appendChild(b);
    });

    var body = el('div', 'cso-sa-drawer__body');
    body.id = 'cso-sa-drawer-body';

    var foot = el('div', 'cso-sa-drawer__foot');
    foot.id = 'cso-sa-drawer-foot';

    drawer.append(head, tabs, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeDrawer();
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && isDrawerOpen()) closeDrawer();
    });
    doc.body.appendChild(backdrop);
    return backdrop;
  }

  function renderDrawerBody() {
    var body = doc.getElementById('cso-sa-drawer-body');
    var foot = doc.getElementById('cso-sa-drawer-foot');
    var tabs = doc.getElementById('cso-sa-drawer-tabs');
    if (!body || !foot) return;

    var orMode = isOdia();
    if (tabs) {
      tabs.querySelectorAll('[data-sa-filter]').forEach(function (b) {
        var on = b.getAttribute('data-sa-filter') === activeFilter;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    var all = sortAlertsForDrawer(readStorage());
    var filtered = all.filter(function (it) {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'upcoming') {
        var cd = computeIstCountdown(it.deadline_iso, { title: it.title_en, deadline_label: it.deadline_label });
        return cd.days !== null && cd.days >= 0;
      }
      if (activeFilter === 'job_alert') return it.category === 'job_alert';
      if (activeFilter === 'exams_results') return it.category === 'exam_update' || it.category === 'result';
      return true;
    });

    var catLabels = {
      job_alert: orMode ? 'ଚାକିରି ବିଜ୍ଞପ୍ତି' : 'Job Alert',
      exam_update: orMode ? 'ପରୀକ୍ଷା ଓ ଆଡମିଟ୍ କାର୍ଡ' : 'Exam & Admit Card',
      result: orMode ? 'ପରୀକ୍ଷା ଫଳାଫଳ' : 'Result',
      guide: orMode ? 'ମାର୍ଗଦର୍ଶିକା' : 'Guide'
    };

    body.replaceChildren();
    if (!filtered.length) {
      var empty = el('div', 'cso-sa-empty');
      empty.appendChild(el('p', '', all.length
        ? (orMode ? 'ଏହି ଫିଲ୍ଟରରେ କୌଣସି ସେଭ୍ ହୋଇଥିବା ସୂଚନା ନାହିଁ।' : 'No saved alerts match this filter.')
        : (orMode ? 'କୌଣସି ସୂଚନା ସେଭ୍ ହୋଇନାହିଁ। ଯେକୌଣସି ଚାକିରି, ପରୀକ୍ଷା କିମ୍ବା ଗାଇଡ୍ କାର୍ଡରେ "☆ ସେଭ୍" କ୍ଲିକ୍ କରନ୍ତୁ।' : 'No saved alerts yet. Click "☆ Save" on any job, exam, result, or guide card to track deadlines offline here.')));
      body.appendChild(empty);
    } else {
      filtered.forEach(function (it) {
        var cd = computeIstCountdown(it.deadline_iso, { title: it.title_en, deadline_label: it.deadline_label });
        var card = el('article', 'cso-sa-card');

        var top = el('div', 'cso-sa-card__top');
        top.appendChild(el('span', 'cso-sa-cat-pill', catLabels[it.category] || 'Saved'));
        top.appendChild(el('span', 'cso-sa-cd-pill cso-sa-cd-pill--' + cd.tone, orMode ? cd.label_or : cd.label_en));
        card.appendChild(top);

        var titleTxt = (orMode && it.title_or) ? it.title_or : it.title_en;
        var titleLink = el('a', 'cso-sa-card__title', titleTxt);
        titleLink.href = safeUrl(it.url);
        card.appendChild(titleLink);

        if (it.org || it.deadline_iso) {
          var metaTxt = [it.org, it.deadline_iso ? ('Date: ' + it.deadline_iso) : ''].filter(Boolean).join(' · ');
          card.appendChild(el('div', 'cso-sa-card__meta', metaTxt));
        }

        var acts = el('div', 'cso-sa-card__acts');
        var openA = el('a', 'cso-sa-btn cso-sa-btn--primary', orMode ? 'ଖୋଲନ୍ତୁ ↗' : 'Open ↗');
        openA.href = safeUrl(it.url);
        acts.appendChild(openA);

        if (it.deadline_iso && win.CSOCalendarExport && typeof win.CSOCalendarExport.downloadSingleEvent === 'function') {
          var icsBtn = el('button', 'cso-sa-btn', '📅 .ics');
          icsBtn.type = 'button';
          icsBtn.setAttribute('aria-label', 'Export ' + it.title_en + ' to calendar (.ics)');
          icsBtn.addEventListener('click', function () {
            var evs = buildIcsEventsFromSaved([it]);
            if (evs.length) win.CSOCalendarExport.downloadSingleEvent(evs[0], it.slug || it.id, icsBtn, orMode);
          });
          acts.appendChild(icsBtn);
        }

        var rmBtn = el('button', 'cso-sa-btn cso-sa-btn--danger', '✕');
        rmBtn.type = 'button';
        rmBtn.setAttribute('aria-label', 'Remove saved alert: ' + it.title_en);
        rmBtn.addEventListener('click', function () { removeAlert(it.id); });
        acts.appendChild(rmBtn);

        card.appendChild(acts);
        body.appendChild(card);
      });
    }

    // Drawer Footer: Export All Saved Deadlines (.ics) + inline Clear All confirmation
    foot.replaceChildren();
    var datedCount = buildIcsEventsFromSaved(all).length;
    var expBtn = el('button', 'cso-sa-btn cso-sa-btn--primary cso-sa-foot-export', orMode
      ? ('📅 ସବୁ ସେଭ୍ ତାରିଖ (.ics) (' + datedCount + ')')
      : ('📅 Export All Saved Deadlines (.ics)' + (datedCount ? ' (' + datedCount + ')' : '')));
    expBtn.type = 'button';
    expBtn.disabled = datedCount === 0;
    expBtn.addEventListener('click', function () { exportAllSavedIcs(expBtn); });
    foot.appendChild(expBtn);

    if (all.length > 0) {
      var clearWrap = el('div', 'cso-sa-clear-wrap');
      if (!confirmClearMode) {
        var clrBtn = el('button', 'cso-sa-btn cso-sa-btn--danger', orMode ? 'ସବୁ ହଟାନ୍ତୁ' : 'Clear All');
        clrBtn.type = 'button';
        clrBtn.addEventListener('click', function () {
          confirmClearMode = true;
          renderDrawerBody();
        });
        clearWrap.appendChild(clrBtn);
      } else {
        var yesBtn = el('button', 'cso-sa-btn cso-sa-btn--danger', orMode ? 'ନିଶ୍ଚିତ ହଟାନ୍ତୁ' : 'Confirm Clear All?');
        yesBtn.type = 'button';
        yesBtn.addEventListener('click', clearAll);
        var noBtn = el('button', 'cso-sa-btn', orMode ? 'ବାତିଲ୍' : 'Cancel');
        noBtn.type = 'button';
        noBtn.addEventListener('click', function () {
          confirmClearMode = false;
          renderDrawerBody();
        });
        clearWrap.append(yesBtn, noBtn);
      }
      foot.appendChild(clearWrap);
    }
  }

  function openDrawer() {
    if (!doc) return;
    var bd = ensureDrawer();
    renderDrawerBody();
    bd.hidden = false;
    if (doc.body) doc.body.classList.add('cso-modal-open');
  }

  /** Ensures a compact 🔖 Saved trigger with live count + urgent dot exists in the header */
  function ensureHeaderTrigger() {
    if (!doc) return;
    var existing = doc.getElementById('cso-ctl-saved') || doc.querySelector('[data-cso-saved-trigger]');
    if (existing) {
      if (!existing.querySelector('[data-cso-saved-urgent]')) {
        var dot = el('span', 'cso-sa-urgent-dot');
        dot.setAttribute('data-cso-saved-urgent', '1');
        dot.setAttribute('aria-hidden', 'true');
        dot.hidden = getUrgentCount() === 0;
        existing.appendChild(dot);
      }
      syncAllButtons();
      return;
    }
    var ctl = doc.getElementById('ctl');
    if (!ctl) return;
    var btn = el('button', 'pill cso-ctl-saved cso-sa-header-trigger');
    btn.id = 'cso-ctl-saved';
    btn.type = 'button';
    btn.setAttribute('data-cso-saved-trigger', '1');
    btn.setAttribute('aria-label', 'Open My Saved Alerts drawer');
    var ico = el('span', '', '🔖');
    ico.setAttribute('aria-hidden', 'true');
    var lbl = el('span', '', 'Saved');
    var cnt = el('span', 'cso-saved-badge', String(readStorage().length));
    cnt.id = 'cso-saved-count';
    cnt.setAttribute('data-cso-saved-count', '1');
    var uDot = el('span', 'cso-sa-urgent-dot');
    uDot.setAttribute('data-cso-saved-urgent', '1');
    uDot.setAttribute('aria-hidden', 'true');
    uDot.hidden = getUrgentCount() === 0;
    btn.append(ico, ' ', lbl, ' ', cnt, uDot);
    btn.addEventListener('click', openDrawer);
    ctl.insertBefore(btn, ctl.firstChild);
    syncAllButtons();
  }

  /** Auto-mounts bookmark buttons on /guides/ hub cards and /guides/<slug> detail header */
  function enhanceGuidesPages() {
    if (!doc) return;
    var orMode = isOdia();
    // 1. /guides/<slug> detail header
    if (doc.body && doc.body.classList.contains('cso-guide-reader-page')) {
      var shareActions = doc.querySelector('.gp-article-head .gp-share-actions');
      if (shareActions && !shareActions.querySelector('[data-cso-save-id]')) {
        var url = (win && win.location && win.location.pathname) || '/guides/';
        var slug = url.replace(/^\/guides\//, '').replace(/\/$/, '') || 'guide';
        var tEn = doc.querySelector('.gp-article-title .gp-lang-en');
        var tOr = doc.querySelector('.gp-article-title .gp-lang-or');
        var bBtn = createBookmarkButton({
          id: 'guide:' + slug,
          slug: slug,
          url: url,
          title_en: tEn ? tEn.textContent.trim() : doc.title,
          title_or: tOr ? tOr.textContent.trim() : '',
          org: 'Common Sense Odisha',
          category: 'guide'
        }, { isOr: orMode, extraClass: 'gp-share-btn' });
        if (bBtn) shareActions.appendChild(bBtn);
      }
    }
    // 2. /guides/ hub cards
    doc.querySelectorAll('#gpGuidesGrid .gp-card').forEach(function (card) {
      if (card.querySelector('[data-cso-save-id]')) return;
      var link = card.querySelector('a[href*="/guides/"]');
      if (!link) return;
      var href = link.getAttribute('href') || '/guides/';
      var slug = href.replace(/^\/guides\//, '').replace(/[/?#].*$/, '') || 'guide';
      var titleEl = card.querySelector('.gp-card-title, h2, h3');
      var bBtn = createBookmarkButton({
        id: 'guide:' + slug,
        slug: slug,
        url: href,
        title_en: titleEl ? titleEl.textContent.trim() : link.textContent.trim(),
        org: 'Common Sense Odisha',
        category: 'guide'
      }, { isOr: orMode, compact: true });
      if (bBtn) {
        var foot = card.querySelector('.gp-card-foot, .gp-card-meta') || card;
        foot.appendChild(bBtn);
      }
    });
  }

  function init() {
    ensureHeaderTrigger();
    enhanceGuidesPages();
    syncAllButtons();
    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('storage', function (ev) {
        if (!ev || ev.key === STORAGE_KEY || ev.key === null) {
          syncAllButtons();
          if (isDrawerOpen()) renderDrawerBody();
        }
      });
    }
    // Re-check header trigger shortly after app.js / shared-header.js renders #ctl
    if (typeof setTimeout === 'function') {
      setTimeout(ensureHeaderTrigger, 350);
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    version: 'v391',
    STORAGE_KEY: STORAGE_KEY,
    getIstTodayYmd: getIstTodayYmd,
    computeIstCountdown: computeIstCountdown,
    getAll: getAll,
    isSaved: isSaved,
    toggleAlert: toggleAlert,
    removeAlert: removeAlert,
    clearAll: clearAll,
    getUrgentCount: getUrgentCount,
    sortAlertsForDrawer: sortAlertsForDrawer,
    buildIcsEventsFromSaved: buildIcsEventsFromSaved,
    exportAllSavedIcs: exportAllSavedIcs,
    createBookmarkButton: createBookmarkButton,
    syncAllButtons: syncAllButtons,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    ensureHeaderTrigger: ensureHeaderTrigger
  };
});
