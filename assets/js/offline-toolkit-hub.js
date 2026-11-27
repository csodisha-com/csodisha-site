/**
 * Common Sense Odisha — Offline PWA Candidate Toolkit Hub (v414)
 * Mounted on /tools/ (#cso-offline-toolkit-hub-root) with 1-click Service Worker pre-caching
 * (CSO_PRECACHE_TOOLKIT / CSO_GET_TOOLKIT_STATUS), direct Cache Storage fallback, live online/offline
 * status badge, storage footprint readout, and 6-tool offline readiness checklist.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOOfflineToolkitHub = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOOfflineToolkitHub = api;
})(function (win, doc) {
  'use strict';

  var CACHE_NAME = 'cso-candidate-cache-v429';
  var META_KEY = 'cso_offline_toolkit_meta_v1';

  var TOOLKIT_URLS = [
    '/tools/',
    '/exams/',
    '/mock-tests/',
    '/career-paths/',
    '/guides/',
    '/schemes/',
    '/current-affairs/',
    '/assets/style.css?v=20261127v429',
    '/assets/css/cso-themes.css?v=20261127v429',
    '/assets/shared-header.js?v=20261127v429',
    '/assets/js/offline-toolkit-hub.js?v=20261127v429',
    '/assets/js/orsp-salary-estimator.js?v=20261127v429',
    '/assets/js/photo-signature-resizer.js?v=20261127v429',
    '/assets/js/certificate-fee-matrix.js?v=20261127v429',
    '/assets/js/cgpa-percentage-converter.js?v=20261127v429',
    '/assets/js/exam-calendar-tracker.js?v=20261127v429',
    '/assets/js/mock-tests-hub.js?v=20261127v429',
    '/assets/js/schemes-eligibility-finder.js?v=20261127v429',
    '/assets/js/current-affairs-hub.js?v=20261127v429',
    '/assets/js/ics-calendar-export.js?v=20261127v429',
    '/assets/js/saved-alerts-drawer.js?v=20261127v429',
    '/assets/js/candidate-watchlist.js?v=20261127v429',
    '/assets/js/odisha-district-filter.js?v=20261127v429'
  ];

  var TOOLKIT_ITEMS = [
    {
      key: 'orsp-salary',
      en: 'ORSP 7th Pay Salary Estimator',
      or: 'ORSP ସପ୍ତମ ବେତନ ହିସାବ',
      href: '/tools/#cso-orsp-salary-estimator-root',
      assetUrl: '/assets/js/orsp-salary-estimator.js?v=20261127v429'
    },
    {
      key: 'photo-resizer',
      en: 'Photo, Signature & Thumb Resizer',
      or: 'ଫଟୋ, ଦସ୍ତଖତ ଓ ଆଙ୍ଗୁଠି ଛାପ ରିସାଇଜର୍',
      href: '/tools/#cso-photo-signature-resizer-root',
      assetUrl: '/assets/js/photo-signature-resizer.js?v=20261127v429'
    },
    {
      key: 'cert-matrix',
      en: 'Odisha Certificate & Fee Waiver Matrix',
      or: 'ଓଡ଼ିଶା ପ୍ରମାଣପତ୍ର ଓ ଫି ଛାଡ଼ ସାରଣୀ',
      href: '/tools/#cso-certificate-fee-matrix-root',
      assetUrl: '/assets/js/certificate-fee-matrix.js?v=20261127v429'
    },
    {
      key: 'cgpa-converter',
      en: 'Odisha University CGPA / SGPA Converter',
      or: 'ଓଡ଼ିଶା ବିଶ୍ୱବିଦ୍ୟାଳୟ CGPA କନଭର୍ଟର୍',
      href: '/tools/#cso-cgpa-converter-root',
      assetUrl: '/assets/js/cgpa-percentage-converter.js?v=20261127v429'
    },
    {
      key: 'exam-calendar',
      en: 'Odisha Exam Calendar & Admit Card Tracker',
      or: 'ଓଡ଼ିଶା ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର ଓ ଆଡମିଟ୍ କାର୍ଡ',
      href: '/exams/',
      assetUrl: '/assets/js/exam-calendar-tracker.js?v=20261127v429'
    },
    {
      key: 'mock-tests',
      en: '25-MCQ Sectional Mock Test Series',
      or: '୨୫-MCQ ବିଭାଗୀୟ ମକ୍ ଟେଷ୍ଟ ସିରିଜ୍',
      href: '/mock-tests/',
      assetUrl: '/assets/js/mock-tests-hub.js?v=20261127v429'
    }
  ];

  function formatBytes(bytes) {
    var b = Math.max(0, Number(bytes) || 0);
    if (b < 1024) return b + ' B';
    var kb = b / 1024;
    if (kb < 1024) return (Math.round(kb * 10) / 10) + ' KB';
    return (Math.round((kb / 1024) * 100) / 100) + ' MB';
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function computeReadinessMetrics(availabilityMap, urls) {
    var list = Array.isArray(urls) ? urls : TOOLKIT_URLS;
    var map = availabilityMap && typeof availabilityMap === 'object' ? availabilityMap : {};
    var cached = 0;
    for (var i = 0; i < list.length; i += 1) {
      if (map[list[i]]) cached += 1;
    }
    var total = list.length;
    var pct = total > 0 ? Math.round((cached / total) * 100) : 0;
    return {
      cachedCount: cached,
      totalCount: total,
      percent: pct,
      barStep: quantizeStep(pct),
      isReady: total > 0 && cached >= Math.ceil(total * 0.8)
    };
  }

  function formatIstTimestamp(iso) {
    if (!iso) return 'Not synced yet';
    try {
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
    } catch (_) {
      return String(iso).slice(0, 16);
    }
  }

  function loadMeta() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(META_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (_) {}
    return {};
  }

  function saveMeta(meta) {
    try {
      if (win && win.localStorage) win.localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (_) {}
  }

  function detectLang() {
    try {
      if (doc && doc.documentElement && doc.documentElement.getAttribute('lang') === 'or') return 'or';
      if (win && win.localStorage) {
        if (win.localStorage.getItem('cso_lang_pref') === 'or' || win.localStorage.getItem('cso_lang') === 'or') return 'or';
      }
    } catch (_) {}
    return 'en';
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var savedMeta = loadMeta();
    var state = {
      lang: detectLang(),
      online: typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true,
      busy: false,
      progressPct: 0,
      availability: {},
      footprintBytes: Number(savedMeta.footprintBytes || 0),
      storageQuotaBytes: 0,
      lastSyncedIso: String(savedMeta.lastSyncedIso || ''),
      statusNote: ''
    };

    async function inspectCacheStatus() {
      var availability = {};
      var totalBytes = 0;
      if (win && win.caches && typeof win.caches.open === 'function') {
        try {
          var cache = await win.caches.open(CACHE_NAME);
          for (var i = 0; i < TOOLKIT_URLS.length; i += 1) {
            var u = TOOLKIT_URLS[i];
            var hit = await cache.match(u);
            if (hit) {
              availability[u] = true;
              try {
                var blob = await hit.clone().blob();
                totalBytes += blob.size || 0;
              } catch (_) {}
            } else {
              availability[u] = false;
            }
          }
        } catch (_) {}
      }
      if (win && win.navigator && win.navigator.storage && typeof win.navigator.storage.estimate === 'function') {
        try {
          var est = await win.navigator.storage.estimate();
          if (est && est.quota) state.storageQuotaBytes = Number(est.quota) || 0;
        } catch (_) {}
      }
      state.availability = availability;
      state.footprintBytes = totalBytes;
      var metrics = computeReadinessMetrics(availability, TOOLKIT_URLS);
      state.progressPct = metrics.percent;
      render();
    }

    async function precacheDirectFallback() {
      if (!win || !win.caches || typeof win.caches.open !== 'function') {
        state.busy = false;
        state.statusNote = 'Cache Storage is unavailable in this browser context.';
        render();
        return;
      }
      var cache = await win.caches.open(CACHE_NAME);
      var completed = 0;
      for (var i = 0; i < TOOLKIT_URLS.length; i += 1) {
        var u = TOOLKIT_URLS[i];
        try {
          var res = await fetch(u, { cache: 'no-cache', credentials: 'same-origin' });
          if (res && res.ok) {
            await cache.put(u, res.clone());
            state.availability[u] = true;
          }
        } catch (_) {}
        completed += 1;
        state.progressPct = Math.round((completed / TOOLKIT_URLS.length) * 100);
        render();
      }
      state.lastSyncedIso = new Date().toISOString();
      state.busy = false;
      await inspectCacheStatus();
      saveMeta({ lastSyncedIso: state.lastSyncedIso, footprintBytes: state.footprintBytes });
    }

    function triggerPrecache() {
      if (state.busy) return;
      state.busy = true;
      state.progressPct = 5;
      state.statusNote = '';
      render();

      var sw = win && win.navigator && win.navigator.serviceWorker;
      if (sw && sw.controller && typeof sw.controller.postMessage === 'function') {
        sw.controller.postMessage({ type: 'CSO_PRECACHE_TOOLKIT' });
        // Safety fallback if SW doesn't respond within 4s
        setTimeout(function () {
          if (state.busy) precacheDirectFallback();
        }, 4000);
      } else {
        precacheDirectFallback();
      }
    }

    async function clearOfflineCache() {
      if (win && win.caches && typeof win.caches.open === 'function') {
        try {
          var cache = await win.caches.open(CACHE_NAME);
          await Promise.allSettled(TOOLKIT_URLS.map(function (u) { return cache.delete(u); }));
        } catch (_) {}
      }
      state.availability = {};
      state.footprintBytes = 0;
      state.progressPct = 0;
      state.lastSyncedIso = '';
      saveMeta({ lastSyncedIso: '', footprintBytes: 0 });
      render();
    }

    if (win && win.navigator && win.navigator.serviceWorker && typeof win.navigator.serviceWorker.addEventListener === 'function') {
      win.navigator.serviceWorker.addEventListener('message', function (ev) {
        var msg = ev && ev.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'CSO_PRECACHE_PROGRESS') {
          state.progressPct = msg.total ? Math.round((msg.completed / msg.total) * 100) : 0;
          render();
        } else if (msg.type === 'CSO_PRECACHE_COMPLETE') {
          state.busy = false;
          state.availability = msg.availability || {};
          state.lastSyncedIso = msg.syncedAtIso || new Date().toISOString();
          inspectCacheStatus().then(function () {
            saveMeta({ lastSyncedIso: state.lastSyncedIso, footprintBytes: state.footprintBytes });
          });
        } else if (msg.type === 'CSO_TOOLKIT_STATUS') {
          state.availability = msg.availability || {};
          render();
        }
      });
    }

    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('online', function () { state.online = true; render(); });
      win.addEventListener('offline', function () { state.online = false; render(); });
    }

    function render() {
      var isOr = state.lang === 'or';
      var metrics = computeReadinessMetrics(state.availability, TOOLKIT_URLS);
      var barStep = state.busy ? quantizeStep(state.progressPct) : metrics.barStep;

      var wrap = el('section', 'cso-otk-card');
      wrap.setAttribute('data-cso-offline-toolkit', 'v414');
      wrap.setAttribute('aria-label', isOr ? 'ଅଫଲାଇନ୍ PWA ପ୍ରାର୍ଥୀ ଟୁଲକିଟ୍ ହବ୍' : 'Offline PWA Candidate Toolkit Hub');

      // Header + Live Network & Readiness Badges
      var head = el('div', 'cso-otk-head');
      var headLeft = el('div', 'cso-otk-head-left');
      var badgeRow = el('div', 'cso-otk-badges');
      badgeRow.appendChild(el('span', 'cso-otk-net-pill' + (state.online ? ' is-online' : ' is-offline'), state.online
        ? (isOr ? '🟢 ଅନଲାଇନ୍ · ସିଙ୍କ୍ ପାଇଁ ପ୍ରସ୍ତୁତ' : '🟢 Online · Ready to Sync')
        : (isOr ? '🟠 ଅଫଲାଇନ୍ ମୋଡ୍ ସକ୍ରିୟ' : '🟠 Offline Mode Active')));
      badgeRow.appendChild(el('span', 'cso-otk-ready-pill' + (metrics.isReady ? ' is-ready' : ''), metrics.isReady
        ? (isOr
          ? ('✅ ଟୁଲକିଟ୍ ଅଫଲାଇନ୍ ସେଭ୍ ଅଛି (' + metrics.cachedCount + '/' + metrics.totalCount + ')')
          : ('✅ Toolkit Saved Offline (' + metrics.cachedCount + '/' + metrics.totalCount + ' Assets)'))
        : (isOr ? '📲 ଅଫଲାଇନ୍ ଡାଉନଲୋଡ୍ ପାଇଁ ଉପଲବ୍ଧ' : '📲 Available for Offline Download')));
      headLeft.appendChild(badgeRow);

      headLeft.appendChild(el('h2', 'cso-otk-title', isOr
        ? '📥 ଅଫଲାଇନ୍ PWA ପ୍ରାର୍ଥୀ ଟୁଲକିଟ୍ (କମ୍ ନେଟୱାର୍କ ଜିଲ୍ଲା ପାଇଁ)'
        : '📥 Offline PWA Candidate Toolkit Hub (Works Without Internet)'));
      headLeft.appendChild(el('p', 'cso-otk-sub', isOr
        ? 'ଗୋଟିଏ କ୍ଲିକରେ ବେତନ ହିସାବ, ଫଟୋ ରିସାଇଜର୍, ପ୍ରମାଣପତ୍ର ସାରଣୀ, CGPA କନଭର୍ଟର୍, ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର ଓ ମକ୍ ଟେଷ୍ଟ ଅଫଲାଇନ୍ ସେଭ୍ କରନ୍ତୁ।'
        : 'Save the Salary Estimator, Photo/Signature Resizer, Certificate Matrix, CGPA Converter, Exam Calendar & 25-MCQ Mock Tests into local Cache Storage for zero-network access across Odisha.'));

      var langWrap = el('div', 'cso-otk-actions');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-otk-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        langWrap.appendChild(lb);
      });
      head.append(headLeft, langWrap);
      wrap.appendChild(head);

      // Action Buttons + Discrete Progress Bar
      var actRow = el('div', 'cso-otk-actions');
      var saveBtn = el('button', 'cso-otk-btn cso-otk-btn--primary', state.busy
        ? (isOr ? ('⏳ ସେଭ୍ ହେଉଛି... ' + state.progressPct + '%') : ('⏳ Caching Toolkit... ' + state.progressPct + '%'))
        : (isOr ? '📥 ଅଫଲାଇନ୍ ଟୁଲକିଟ୍ ସେଭ୍ କରନ୍ତୁ' : '📥 Save Candidate Toolkit Offline'));
      saveBtn.type = 'button';
      saveBtn.disabled = state.busy;
      saveBtn.addEventListener('click', triggerPrecache);

      var clearBtn = el('button', 'cso-otk-btn', isOr ? '🗑️ ଅଫଲାଇନ୍ କ୍ୟାସ୍ ସଫା କରନ୍ତୁ' : '🗑️ Clear Offline Cache');
      clearBtn.type = 'button';
      clearBtn.disabled = state.busy || metrics.cachedCount === 0;
      clearBtn.addEventListener('click', clearOfflineCache);

      actRow.append(saveBtn, clearBtn);
      wrap.appendChild(actRow);

      // Progress Bar (discrete CSS class, zero inline style)
      var progWrap = el('div', 'cso-vfv-bar-row');
      var progMeta = el('div', 'cso-vfv-bar-meta');
      progMeta.append(
        el('span', 'cso-vfv-bar-label', isOr ? 'ଅଫଲାଇନ୍ ପ୍ରସ୍ତୁତି ପ୍ରଗତି' : 'Offline Readiness Progress'),
        el('span', 'cso-vfv-bar-val', metrics.cachedCount + ' / ' + metrics.totalCount + ' (' + (state.busy ? state.progressPct : metrics.percent) + '%)')
      );
      var progTrack = el('div', 'cso-vfv-bar-track');
      progTrack.appendChild(el('div', 'cso-vfv-bar-fill cso-vfv-bar--w' + barStep));
      progWrap.append(progMeta, progTrack);
      wrap.appendChild(progWrap);

      // Storage Readout Strip
      var statsGrid = el('div', 'cso-otk-stats');
      [
        [isOr ? 'କ୍ୟାସ୍ ହୋଇଥିବା ଫାଇଲ୍' : 'Cached Toolkit Assets', metrics.cachedCount + ' / ' + metrics.totalCount],
        [isOr ? 'ଟୁଲକିଟ୍ ଆକାର' : 'Toolkit Footprint', formatBytes(state.footprintBytes)],
        [isOr ? 'ଶେଷ ସିଙ୍କ୍ (IST)' : 'Last Synced (IST)', formatIstTimestamp(state.lastSyncedIso)],
        [isOr ? 'କ୍ୟାସ୍ ଭର୍ସନ୍' : 'SW Cache Version', CACHE_NAME]
      ].forEach(function (pair) {
        var tile = el('div', 'cso-otk-stat');
        tile.append(el('span', 'cso-otk-stat-k', pair[0]), el('b', 'cso-otk-stat-v', pair[1]));
        statsGrid.appendChild(tile);
      });
      wrap.appendChild(statsGrid);

      if (state.statusNote) {
        wrap.appendChild(el('div', 'cso-otk-note', state.statusNote));
      }

      // 6-Tool Offline Readiness Checklist Grid
      var toolGrid = el('div', 'cso-otk-grid');
      TOOLKIT_ITEMS.forEach(function (t) {
        var ok = Boolean(state.availability[t.assetUrl]);
        var a = el('a', 'cso-otk-tool-card');
        a.setAttribute('href', t.href);
        a.appendChild(el('span', 'cso-otk-tool-status' + (ok ? ' is-cached' : ''), ok
          ? (isOr ? '✅ କ୍ୟାସ୍ ଅଛି' : '✅ Cached')
          : (isOr ? '⏳ ବାକି ଅଛି' : '⏳ Pending')));
        a.appendChild(el('div', 'cso-otk-tool-name', isOr ? t.or : t.en));
        toolGrid.appendChild(a);
      });
      wrap.appendChild(toolGrid);

      container.replaceChildren(wrap);
    }

    render();
    inspectCacheStatus();
    return { triggerPrecache: triggerPrecache, clearOfflineCache: clearOfflineCache, inspectCacheStatus: inspectCacheStatus };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-offline-toolkit-hub-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v414',
    CACHE_NAME: CACHE_NAME,
    META_KEY: META_KEY,
    TOOLKIT_URLS: TOOLKIT_URLS,
    TOOLKIT_ITEMS: TOOLKIT_ITEMS,
    formatBytes: formatBytes,
    quantizeStep: quantizeStep,
    computeReadinessMetrics: computeReadinessMetrics,
    mount: mount
  };
});
