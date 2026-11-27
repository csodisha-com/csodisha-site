/**
 * Common Sense Odisha — Candidate Saved-Alerts, Watchlist & Study Streak
 * JSON Backup / Restore & Shareable Study-Pack Generator (v419)
 * Mounted on /tools/ (#cso-candidate-data-backup-root).
 * 100% Client-Side · Zero Server Upload.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline styles or on* handlers; bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOCandidateDataBackup = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCandidateDataBackup = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v419';
  var ROOT_ID = 'cso-candidate-data-backup-root';
  var SCHEMA_VERSION = 'csodisha-candidate-backup-v1';
  var PACK_VERSION = 'csodisha-study-pack-v1';

  var KEYS = {
    savedAlerts: 'cso_saved_alerts_v1',
    watchlist: 'cso_candidate_watchlist_v1',
    studyStreak: 'cso_study_streak_planner_v1',
    docWallet: 'cso_doc_wallet_v1',
    candidateDob: 'cso_candidate_dob_v1',
    adminDirPrefs: 'cso_odisha_admin_dir_prefs_v1'
  };

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function getIstDateYmd(nowDate) {
    var d = nowDate instanceof Date ? nowDate : new Date();
    var ist = new Date(d.getTime() + 330 * 60000);
    return ist.getUTCFullYear() + '-' + pad2(ist.getUTCMonth() + 1) + '-' + pad2(ist.getUTCDate());
  }

  function getIstTimestamp(nowDate) {
    var d = nowDate instanceof Date ? nowDate : new Date();
    var ist = new Date(d.getTime() + 330 * 60000);
    return (
      ist.getUTCFullYear() + '-' + pad2(ist.getUTCMonth() + 1) + '-' + pad2(ist.getUTCDate()) +
      'T' + pad2(ist.getUTCHours()) + ':' + pad2(ist.getUTCMinutes()) + ':' + pad2(ist.getUTCSeconds()) + '+05:30'
    );
  }

  function shiftDateKey(dateKey, deltaDays) {
    var parts = String(dateKey || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + Number(deltaDays || 0)));
    return dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate());
  }

  function resolveStorage(storageOverride) {
    if (storageOverride) return storageOverride;
    try {
      return (win && win.localStorage) ? win.localStorage : null;
    } catch (_) {
      return null;
    }
  }

  function readJsonKey(storage, key, fallback) {
    if (!storage || typeof storage.getItem !== 'function') return fallback;
    try {
      var raw = storage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonKey(storage, key, value) {
    if (!storage || typeof storage.setItem !== 'function') return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function normalizeSavedAlerts(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    var seen = {};
    for (var i = 0; i < raw.length; i += 1) {
      var item = raw[i];
      if (!item || typeof item !== 'object') continue;
      var idKey = String(item.id || item.url || item.slug || '').trim().toLowerCase();
      if (!idKey || seen[idKey]) continue;
      seen[idKey] = true;
      out.push(item);
    }
    return out;
  }

  function normalizeWatchlist(raw) {
    var obj = raw && typeof raw === 'object' ? raw : {};
    function cleanList(arr, maxLen) {
      if (!Array.isArray(arr)) return [];
      var out = [];
      var seen = {};
      for (var i = 0; i < arr.length; i += 1) {
        var s = String(arr[i] || '').trim();
        if (!s) continue;
        var low = s.toLowerCase();
        if (seen[low]) continue;
        seen[low] = true;
        out.push(s);
        if (maxLen && out.length >= maxLen) break;
      }
      return out;
    }
    return {
      districts: cleanList(obj.districts, 30).map(function (d) { return d.toLowerCase(); }),
      tracks: cleanList(obj.tracks, 20).map(function (t) { return t.toLowerCase(); }),
      keywords: cleanList(obj.keywords, 10)
    };
  }

  function normalizeStudyStreak(raw) {
    var obj = raw && typeof raw === 'object' ? raw : {};
    var target = Number(obj.dailyTarget);
    if ([10, 25, 50].indexOf(target) === -1) target = 25;

    var days = {};
    if (obj.days && typeof obj.days === 'object') {
      var dKeys = Object.keys(obj.days);
      for (var i = 0; i < dKeys.length; i += 1) {
        var dk = dKeys[i];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) continue;
        var rec = obj.days[dk];
        if (!rec || typeof rec !== 'object') continue;
        var mcqs = Math.max(0, Math.floor(Number(rec.mcqs) || 0));
        var correct = Math.max(0, Math.min(mcqs, Math.floor(Number(rec.correct) || 0)));
        var sessions = Math.max(0, Math.floor(Number(rec.sessions) || 0));
        if (mcqs > 0 || sessions > 0) {
          days[dk] = { mcqs: mcqs, correct: correct, sessions: sessions };
        }
      }
    }

    var topics = {};
    if (obj.topics && typeof obj.topics === 'object') {
      var tKeys = Object.keys(obj.topics);
      for (var t = 0; t < tKeys.length; t += 1) {
        var tk = String(tKeys[t] || '').trim();
        var tr = obj.topics[tk];
        if (!tk || !tr || typeof tr !== 'object') continue;
        var attempted = Math.max(0, Math.floor(Number(tr.attempted) || 0));
        var tCorrect = Math.max(0, Math.min(attempted, Math.floor(Number(tr.correct) || 0)));
        if (attempted > 0) topics[tk] = { attempted: attempted, correct: tCorrect };
      }
    }

    var planByDate = {};
    if (obj.planByDate && typeof obj.planByDate === 'object') {
      var pKeys = Object.keys(obj.planByDate);
      for (var p = 0; p < pKeys.length; p += 1) {
        var pk = pKeys[p];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(pk)) continue;
        var focus = String(obj.planByDate[pk] || '').trim().slice(0, 64);
        if (focus) planByDate[pk] = focus;
      }
    }

    var computedBest = computeBestStreak(days, Math.max(0, Math.floor(Number(obj.bestStreak) || 0)));
    return {
      dailyTarget: target,
      bestStreak: computedBest,
      days: days,
      topics: topics,
      planByDate: planByDate
    };
  }

  function computeCurrentStreak(daysObj, todayKey) {
    var days = daysObj && typeof daysObj === 'object' ? daysObj : {};
    var anchor = todayKey || getIstDateYmd();
    var hasToday = Boolean(days[anchor] && Number(days[anchor].mcqs) > 0);
    var cursor = hasToday ? anchor : shiftDateKey(anchor, -1);
    var count = 0;
    while (days[cursor] && Number(days[cursor].mcqs) > 0 && count < 3650) {
      count += 1;
      cursor = shiftDateKey(cursor, -1);
    }
    return count;
  }

  function computeBestStreak(daysObj, existingBest) {
    var days = daysObj && typeof daysObj === 'object' ? daysObj : {};
    var activeKeys = Object.keys(days).filter(function (k) {
      return /^\d{4}-\d{2}-\d{2}$/.test(k) && days[k] && Number(days[k].mcqs) > 0;
    }).sort();
    var best = Math.max(0, Number(existingBest) || 0);
    var run = 0;
    var prev = '';
    for (var i = 0; i < activeKeys.length; i += 1) {
      var k = activeKeys[i];
      if (prev && shiftDateKey(prev, 1) === k) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > best) best = run;
      prev = k;
    }
    return best;
  }

  function buildCandidateBackupPayload(storageOverride, nowDate) {
    var storage = resolveStorage(storageOverride);
    var savedAlerts = normalizeSavedAlerts(readJsonKey(storage, KEYS.savedAlerts, []));
    var watchlist = normalizeWatchlist(readJsonKey(storage, KEYS.watchlist, {}));
    var studyStreak = normalizeStudyStreak(readJsonKey(storage, KEYS.studyStreak, {}));
    var docWallet = readJsonKey(storage, KEYS.docWallet, {});
    if (!docWallet || typeof docWallet !== 'object' || Array.isArray(docWallet)) docWallet = {};
    var candidateDob = '';
    try {
      if (storage && typeof storage.getItem === 'function') {
        candidateDob = String(storage.getItem(KEYS.candidateDob) || '').trim();
      }
    } catch (_) {}
    var adminDirPrefs = readJsonKey(storage, KEYS.adminDirPrefs, null);

    return {
      schema: SCHEMA_VERSION,
      version: VERSION,
      exportedAtIst: getIstTimestamp(nowDate),
      exportedDateIst: getIstDateYmd(nowDate),
      data: {
        savedAlerts: savedAlerts,
        watchlist: watchlist,
        studyStreak: studyStreak,
        docWallet: docWallet,
        candidateDob: candidateDob,
        adminDirPrefs: adminDirPrefs
      }
    };
  }

  function getTelemetry(storageOverride, nowDate) {
    var payload = buildCandidateBackupPayload(storageOverride, nowDate);
    var d = payload.data;
    var todayKey = getIstDateYmd(nowDate);
    var dayKeys = Object.keys(d.studyStreak.days);
    var totalMcqs = 0;
    for (var i = 0; i < dayKeys.length; i += 1) {
      totalMcqs += Number(d.studyStreak.days[dayKeys[i]].mcqs || 0);
    }
    var currentStreak = computeCurrentStreak(d.studyStreak.days, todayKey);
    var plannedDays = Object.keys(d.studyStreak.planByDate).length;
    var docWalletReady = Object.keys(d.docWallet).filter(function (k) { return Boolean(d.docWallet[k]); }).length;

    return {
      savedAlertsCount: d.savedAlerts.length,
      watchlistDistrictsCount: d.watchlist.districts.length,
      watchlistTracksCount: d.watchlist.tracks.length,
      watchlistKeywordsCount: d.watchlist.keywords.length,
      currentStreak: currentStreak,
      bestStreak: Math.max(currentStreak, d.studyStreak.bestStreak),
      totalMcqs: totalMcqs,
      dailyTarget: d.studyStreak.dailyTarget,
      activeStudyDays: dayKeys.length,
      plannedDaysCount: plannedDays,
      docWalletReadyCount: docWalletReady
    };
  }

  // ===== UTF-8 URL-Safe Base64 Codec for Shareable Study Packs =====
  function utf8ToBase64Url(str) {
    var bytes;
    if (typeof TextEncoder !== 'undefined') {
      bytes = new TextEncoder().encode(str);
    } else {
      var enc = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      });
      bytes = new Uint8Array(enc.length);
      for (var i = 0; i < enc.length; i += 1) bytes[i] = enc.charCodeAt(i);
    }
    var bin = '';
    for (var b = 0; b < bytes.length; b += 1) {
      bin += String.fromCharCode(bytes[b]);
    }
    var b64 = (typeof btoa === 'function')
      ? btoa(bin)
      : (typeof Buffer !== 'undefined' ? Buffer.from(bytes).toString('base64') : '');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlToUtf8(token) {
    var clean = String(token || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) clean += '=';
    var bytes;
    if (typeof atob === 'function') {
      var bin = atob(clean);
      bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    } else if (typeof Buffer !== 'undefined') {
      bytes = new Uint8Array(Buffer.from(clean, 'base64'));
    } else {
      throw new Error('Base64 decoder unavailable');
    }
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    var out = '';
    for (var k = 0; k < bytes.length; k += 1) {
      out += '%' + ('00' + bytes[k].toString(16)).slice(-2);
    }
    return decodeURIComponent(out);
  }

  function encodeStudyPack(payloadOrStorage) {
    var source;
    if (payloadOrStorage && typeof payloadOrStorage === 'object' && payloadOrStorage.schema === SCHEMA_VERSION && payloadOrStorage.data) {
      source = payloadOrStorage.data;
    } else if (payloadOrStorage && typeof payloadOrStorage === 'object' && (payloadOrStorage.watchlist || payloadOrStorage.studyStreak)) {
      source = payloadOrStorage;
    } else {
      source = buildCandidateBackupPayload(payloadOrStorage).data;
    }
    var wl = normalizeWatchlist(source.watchlist || {});
    var st = normalizeStudyStreak(source.studyStreak || {});
    var compact = {
      s: PACK_VERSION,
      d: wl.districts,
      t: wl.tracks,
      k: wl.keywords,
      g: st.dailyTarget,
      p: st.planByDate
    };
    return utf8ToBase64Url(JSON.stringify(compact));
  }

  function decodeStudyPack(token) {
    try {
      var rawToken = String(token || '').trim();
      if (!rawToken) return { ok: false, error: 'Empty Study-Pack code.' };
      // Also support pasting a full URL containing ?pack=...
      var packMatch = rawToken.match(/[?&]pack=([A-Za-z0-9_-]+)/);
      if (packMatch) rawToken = packMatch[1];

      var jsonStr = base64UrlToUtf8(rawToken);
      var parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object' || parsed.s !== PACK_VERSION) {
        return { ok: false, error: 'Invalid or unsupported Study-Pack code.' };
      }
      var wl = normalizeWatchlist({
        districts: parsed.d,
        tracks: parsed.t,
        keywords: parsed.k
      });
      var st = normalizeStudyStreak({
        dailyTarget: parsed.g,
        planByDate: parsed.p
      });
      return {
        ok: true,
        schema: PACK_VERSION,
        data: {
          savedAlerts: [],
          watchlist: wl,
          studyStreak: st,
          docWallet: {},
          candidateDob: ''
        }
      };
    } catch (_) {
      return { ok: false, error: 'Could not decode Study-Pack code. Please check the link or token.' };
    }
  }

  function buildShareablePackUrl(payloadOrStorage, baseOrigin) {
    var token = encodeStudyPack(payloadOrStorage);
    var origin = baseOrigin || 'https://csodisha.com';
    return origin.replace(/\/$/, '') + '/tools/?pack=' + encodeURIComponent(token) + '#' + ROOT_ID;
  }

  function parseIncomingPayload(rawInput) {
    if (rawInput && typeof rawInput === 'object') {
      if (rawInput.schema === SCHEMA_VERSION && rawInput.data && typeof rawInput.data === 'object') {
        return { ok: true, isPack: false, data: rawInput.data };
      }
      if (rawInput.schema === PACK_VERSION && rawInput.data && typeof rawInput.data === 'object') {
        return { ok: true, isPack: true, data: rawInput.data };
      }
      return { ok: false, error: 'Unsupported backup schema. Expected csodisha-candidate-backup-v1.' };
    }
    var text = String(rawInput || '').trim();
    if (!text) return { ok: false, error: 'Backup input is empty.' };

    if (text.charAt(0) === '{') {
      try {
        var parsed = JSON.parse(text);
        return parseIncomingPayload(parsed);
      } catch (_) {
        return { ok: false, error: 'Malformed JSON file or snippet. No browser data was modified.' };
      }
    }

    // Try decoding as compact Study-Pack token or share URL
    var decoded = decodeStudyPack(text);
    if (decoded.ok) {
      return { ok: true, isPack: true, data: decoded.data };
    }
    return { ok: false, error: 'Unrecognized backup format. Please select a valid CSO backup .json file or Study-Pack link/code.' };
  }

  function mergeObjects(baseObj, incObj) {
    var out = {};
    var k1 = Object.keys(baseObj || {});
    for (var i = 0; i < k1.length; i += 1) out[k1[i]] = baseObj[k1[i]];
    var k2 = Object.keys(incObj || {});
    for (var j = 0; j < k2.length; j += 1) out[k2[j]] = incObj[k2[j]];
    return out;
  }

  function dispatchRestoredEvent(detail) {
    try {
      if (win && typeof win.dispatchEvent === 'function' && typeof win.CustomEvent === 'function') {
        win.dispatchEvent(new win.CustomEvent('cso:candidate-data-restored', { detail: detail }));
      }
    } catch (_) {}
  }

  function importCandidateBackupPayload(rawJsonOrObj, mode, storageOverride) {
    var cleanMode = mode === 'replace' ? 'replace' : 'merge';
    var parsed = parseIncomingPayload(rawJsonOrObj);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, mode: cleanMode };
    }

    var storage = resolveStorage(storageOverride);
    var incomingData = parsed.data;
    var incAlerts = normalizeSavedAlerts(incomingData.savedAlerts || []);
    var incWatchlist = normalizeWatchlist(incomingData.watchlist || {});
    var incStreak = normalizeStudyStreak(incomingData.studyStreak || {});
    var incWallet = (incomingData.docWallet && typeof incomingData.docWallet === 'object' && !Array.isArray(incomingData.docWallet))
      ? incomingData.docWallet
      : {};
    var incDob = typeof incomingData.candidateDob === 'string' ? incomingData.candidateDob.trim() : '';

    var finalAlerts;
    var finalWatchlist;
    var finalStreak;
    var finalWallet;
    var finalDob;

    if (cleanMode === 'replace' && !parsed.isPack) {
      finalAlerts = incAlerts;
      finalWatchlist = incWatchlist;
      finalStreak = incStreak;
      finalWallet = incWallet;
      finalDob = incDob;
    } else {
      var cur = buildCandidateBackupPayload(storage).data;

      // Merge Saved Alerts (deduplicate by id || url)
      finalAlerts = normalizeSavedAlerts(cur.savedAlerts.concat(incAlerts));

      // Merge Watchlist (union districts, tracks, keywords)
      finalWatchlist = normalizeWatchlist({
        districts: cur.watchlist.districts.concat(incWatchlist.districts),
        tracks: cur.watchlist.tracks.concat(incWatchlist.tracks),
        keywords: cur.watchlist.keywords.concat(incWatchlist.keywords)
      });

      // Merge Study Streak (Math.max per IST date & recompute bestStreak)
      var mergedDays = {};
      var allDayKeys = Object.keys(cur.studyStreak.days).concat(Object.keys(incStreak.days));
      for (var d = 0; d < allDayKeys.length; d += 1) {
        var dk = allDayKeys[d];
        if (mergedDays[dk]) continue;
        var a = cur.studyStreak.days[dk] || { mcqs: 0, correct: 0, sessions: 0 };
        var b = incStreak.days[dk] || { mcqs: 0, correct: 0, sessions: 0 };
        var maxMcqs = Math.max(Number(a.mcqs) || 0, Number(b.mcqs) || 0);
        var maxCorrect = Math.min(maxMcqs, Math.max(Number(a.correct) || 0, Number(b.correct) || 0));
        var maxSessions = Math.max(Number(a.sessions) || 0, Number(b.sessions) || 0);
        if (maxMcqs > 0 || maxSessions > 0) {
          mergedDays[dk] = { mcqs: maxMcqs, correct: maxCorrect, sessions: maxSessions };
        }
      }

      var mergedTopics = {};
      var allTopicKeys = Object.keys(cur.studyStreak.topics).concat(Object.keys(incStreak.topics));
      for (var t = 0; t < allTopicKeys.length; t += 1) {
        var tk = allTopicKeys[t];
        if (mergedTopics[tk]) continue;
        var ta = cur.studyStreak.topics[tk] || { attempted: 0, correct: 0 };
        var tb = incStreak.topics[tk] || { attempted: 0, correct: 0 };
        var maxAtt = Math.max(Number(ta.attempted) || 0, Number(tb.attempted) || 0);
        var maxCor = Math.min(maxAtt, Math.max(Number(ta.correct) || 0, Number(tb.correct) || 0));
        if (maxAtt > 0) mergedTopics[tk] = { attempted: maxAtt, correct: maxCor };
      }

      // Preserve existing revision plan days unless empty; fill missing days from incoming
      var mergedPlan = {};
      var incPlanKeys = Object.keys(incStreak.planByDate);
      for (var ip = 0; ip < incPlanKeys.length; ip += 1) {
        mergedPlan[incPlanKeys[ip]] = incStreak.planByDate[incPlanKeys[ip]];
      }
      var curPlanKeys = Object.keys(cur.studyStreak.planByDate);
      for (var cp = 0; cp < curPlanKeys.length; cp += 1) {
        if (cur.studyStreak.planByDate[curPlanKeys[cp]]) {
          mergedPlan[curPlanKeys[cp]] = cur.studyStreak.planByDate[curPlanKeys[cp]];
        }
      }

      var nextTarget = parsed.isPack ? incStreak.dailyTarget : (incStreak.dailyTarget || cur.studyStreak.dailyTarget);
      finalStreak = {
        dailyTarget: [10, 25, 50].indexOf(nextTarget) !== -1 ? nextTarget : 25,
        bestStreak: computeBestStreak(mergedDays, Math.max(cur.studyStreak.bestStreak, incStreak.bestStreak)),
        days: mergedDays,
        topics: mergedTopics,
        planByDate: mergedPlan
      };

      finalWallet = mergeObjects(cur.docWallet, incWallet);
      finalDob = cur.candidateDob || incDob;
    }

    writeJsonKey(storage, KEYS.savedAlerts, finalAlerts);
    writeJsonKey(storage, KEYS.watchlist, finalWatchlist);
    writeJsonKey(storage, KEYS.studyStreak, finalStreak);
    writeJsonKey(storage, KEYS.docWallet, finalWallet);
    if (storage && typeof storage.setItem === 'function') {
      try {
        if (finalDob) storage.setItem(KEYS.candidateDob, finalDob);
        else if (cleanMode === 'replace' && typeof storage.removeItem === 'function') storage.removeItem(KEYS.candidateDob);
      } catch (_) {}
    }

    var stats = {
      alertsRestored: finalAlerts.length,
      districtsRestored: finalWatchlist.districts.length,
      tracksRestored: finalWatchlist.tracks.length,
      studyDaysRestored: Object.keys(finalStreak.days).length,
      plannedDaysRestored: Object.keys(finalStreak.planByDate).length
    };

    dispatchRestoredEvent({ mode: cleanMode, isPack: parsed.isPack, stats: stats });

    return {
      ok: true,
      mode: cleanMode,
      isPack: parsed.isPack,
      stats: stats
    };
  }

  // ===== Browser UI Mount =====
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function detectLang() {
    try {
      var root = doc && doc.documentElement;
      if (root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or')) return 'or';
    } catch (_) {}
    return 'en';
  }

  function readIncomingPackParam() {
    try {
      if (!win || !win.location || !win.location.search) return '';
      var u = new URL(win.location.href);
      return u.searchParams.get('pack') || '';
    } catch (_) {
      return '';
    }
  }

  function clearPackParamFromUrl() {
    try {
      if (!win || !win.history || typeof win.history.replaceState !== 'function' || !win.location) return;
      var u = new URL(win.location.href);
      u.searchParams.delete('pack');
      win.history.replaceState({}, '', u.toString());
    } catch (_) {}
  }

  function triggerDownloadJson(filename, text) {
    try {
      var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch (_) {
      return false;
    }
  }

  function copyText(text) {
    if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  function mount(containerEl) {
    if (!doc) return null;
    var root = containerEl || doc.getElementById(ROOT_ID);
    if (!root) return null;

    var state = {
      lang: detectLang(),
      restoreMode: 'merge',
      toast: '',
      toastTone: 'ok',
      incomingPackToken: readIncomingPackParam(),
      generatedUrl: '',
      generatedCode: ''
    };

    var wrap = el('div', 'cso-cdb-wrap');

    // Header
    var head = el('div', 'cso-cdb-head');
    var titleBox = el('div', 'cso-cdb-title-box');
    var privacyBadge = el('span', 'cso-cdb-privacy');
    var title = el('h2', 'cso-cdb-title');
    var subtitle = el('p', 'cso-cdb-sub');
    titleBox.appendChild(privacyBadge);
    titleBox.appendChild(title);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-cdb-head-controls');
    var langWrap = el('div', 'cso-cdb-lang-toggle');
    langWrap.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-cdb-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-cdb-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langWrap.appendChild(btnEn);
    langWrap.appendChild(btnOr);
    headControls.appendChild(langWrap);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Incoming Shared Study-Pack Banner (conditional)
    var packBanner = el('div', 'cso-cdb-pack-banner');

    // Toast Notification
    var toastBox = el('div', 'cso-cdb-toast');
    toastBox.setAttribute('role', 'status');
    toastBox.setAttribute('aria-live', 'polite');

    // Live Telemetry Grid
    var telemetryGrid = el('div', 'cso-cdb-telemetry');

    // 3 Sections Grid
    var sections = el('div', 'cso-cdb-sections');

    // Section A: Export
    var secA = el('section', 'cso-cdb-card');
    var secATitle = el('h3', 'cso-cdb-card__title');
    var secADesc = el('p', 'cso-cdb-card__desc');
    var secAActions = el('div', 'cso-cdb-btn-row');
    var downloadBtn = el('button', 'cso-cdb-btn cso-cdb-btn--primary');
    downloadBtn.type = 'button';
    var copyJsonBtn = el('button', 'cso-cdb-btn');
    copyJsonBtn.type = 'button';
    secAActions.appendChild(downloadBtn);
    secAActions.appendChild(copyJsonBtn);
    secA.appendChild(secATitle);
    secA.appendChild(secADesc);
    secA.appendChild(secAActions);

    // Section B: Import & Merge / Replace
    var secB = el('section', 'cso-cdb-card');
    var secBTitle = el('h3', 'cso-cdb-card__title');
    var secBDesc = el('p', 'cso-cdb-card__desc');

    var modeRow = el('div', 'cso-cdb-mode-row');
    modeRow.setAttribute('role', 'group');
    var mergeModeBtn = el('button', 'cso-cdb-mode-pill');
    mergeModeBtn.type = 'button';
    var replaceModeBtn = el('button', 'cso-cdb-mode-pill');
    replaceModeBtn.type = 'button';
    modeRow.appendChild(mergeModeBtn);
    modeRow.appendChild(replaceModeBtn);

    var fileLabel = el('label', 'cso-cdb-dropzone');
    fileLabel.setAttribute('for', 'cso-cdb-file-input');
    var fileLabelText = el('span', 'cso-cdb-dropzone__text');
    var fileInput = el('input', 'cso-cdb-file-input');
    fileInput.type = 'file';
    fileInput.id = 'cso-cdb-file-input';
    fileInput.accept = 'application/json,.json';
    fileLabel.appendChild(fileLabelText);
    fileLabel.appendChild(fileInput);

    var pasteLabel = el('label', 'cso-cdb-label');
    pasteLabel.setAttribute('for', 'cso-cdb-paste-area');
    var pasteArea = el('textarea', 'cso-cdb-textarea');
    pasteArea.id = 'cso-cdb-paste-area';
    pasteArea.rows = 3;

    var importBtn = el('button', 'cso-cdb-btn cso-cdb-btn--primary');
    importBtn.type = 'button';

    secB.appendChild(secBTitle);
    secB.appendChild(secBDesc);
    secB.appendChild(modeRow);
    secB.appendChild(fileLabel);
    secB.appendChild(pasteLabel);
    secB.appendChild(pasteArea);
    secB.appendChild(importBtn);

    // Section C: Shareable Study-Pack Link & Code
    var secC = el('section', 'cso-cdb-card');
    var secCTitle = el('h3', 'cso-cdb-card__title');
    var secCDesc = el('p', 'cso-cdb-card__desc');
    var genPackBtn = el('button', 'cso-cdb-btn cso-cdb-btn--primary');
    genPackBtn.type = 'button';
    var packOutWrap = el('div', 'cso-cdb-pack-out');
    var packUrlInput = el('input', 'cso-cdb-input');
    packUrlInput.type = 'text';
    packUrlInput.readOnly = true;
    packUrlInput.setAttribute('aria-label', 'Shareable Study-Pack Link');
    var packActions = el('div', 'cso-cdb-btn-row');
    var copyLinkBtn = el('button', 'cso-cdb-btn');
    copyLinkBtn.type = 'button';
    var copyCodeBtn = el('button', 'cso-cdb-btn');
    copyCodeBtn.type = 'button';
    var waShareLink = el('a', 'cso-cdb-btn');
    waShareLink.target = '_blank';
    waShareLink.rel = 'noopener noreferrer';
    packActions.appendChild(copyLinkBtn);
    packActions.appendChild(copyCodeBtn);
    packActions.appendChild(waShareLink);
    packOutWrap.appendChild(packUrlInput);
    packOutWrap.appendChild(packActions);

    secC.appendChild(secCTitle);
    secC.appendChild(secCDesc);
    secC.appendChild(genPackBtn);
    secC.appendChild(packOutWrap);

    sections.appendChild(secA);
    sections.appendChild(secB);
    sections.appendChild(secC);

    wrap.appendChild(head);
    wrap.appendChild(packBanner);
    wrap.appendChild(toastBox);
    wrap.appendChild(telemetryGrid);
    wrap.appendChild(sections);
    root.replaceChildren(wrap);

    function setToast(msg, tone) {
      state.toast = msg || '';
      state.toastTone = tone || 'ok';
      renderToast();
    }

    function renderToast() {
      if (!state.toast) {
        toastBox.hidden = true;
        toastBox.textContent = '';
        return;
      }
      toastBox.hidden = false;
      toastBox.className = 'cso-cdb-toast cso-cdb-toast--' + state.toastTone;
      toastBox.textContent = state.toast;
    }

    function renderPackBanner(orMode) {
      if (!state.incomingPackToken) {
        packBanner.hidden = true;
        packBanner.replaceChildren();
        return;
      }
      var decoded = decodeStudyPack(state.incomingPackToken);
      if (!decoded.ok) {
        packBanner.hidden = true;
        packBanner.replaceChildren();
        return;
      }
      packBanner.hidden = false;
      var wl = decoded.data.watchlist;
      var st = decoded.data.studyStreak;
      var planned = Object.keys(st.planByDate).length;
      var frag = doc.createDocumentFragment();
      frag.appendChild(el('strong', 'cso-cdb-pack-banner__title',
        orMode ? '📦 ସେୟାର ହୋଇଥିବା ଷ୍ଟଡି-ପ୍ୟାକ୍ ମିଳିଛି!' : '📦 Shared Study-Pack Link Detected!'));
      frag.appendChild(el('p', 'cso-cdb-pack-banner__meta',
        (orMode
          ? ('ଜିଲ୍ଲା: ' + wl.districts.length + ' · ଟ୍ରାକ୍: ' + wl.tracks.length + ' · ଦୈନିକ ଲକ୍ଷ୍ୟ: ' + st.dailyTarget + ' MCQs · ରିଭିଜନ୍ ଦିନ: ' + planned)
          : ('Includes ' + wl.districts.length + ' Watchlist Districts · ' + wl.tracks.length + ' Exam Tracks · ' + st.dailyTarget + ' MCQs/Day Goal · ' + planned + ' Revision Days'))));
      var act = el('div', 'cso-cdb-btn-row');
      var applyBtn = el('button', 'cso-cdb-btn cso-cdb-btn--primary',
        orMode ? '✅ ସେୟାର ଷ୍ଟଡି ପ୍ୟାକ୍ ପ୍ରୟୋଗ କରନ୍ତୁ' : '✅ Apply Shared Study Pack');
      applyBtn.type = 'button';
      applyBtn.addEventListener('click', function () {
        var res = importCandidateBackupPayload(state.incomingPackToken, 'merge');
        if (res.ok) {
          state.incomingPackToken = '';
          clearPackParamFromUrl();
          setToast(
            orMode
              ? ('✅ ଷ୍ଟଡି-ପ୍ୟାକ୍ ଯୋଡ଼ାଗଲା (' + res.stats.districtsRestored + ' ଜିଲ୍ଲା, ' + res.stats.plannedDaysRestored + ' ରିଭିଜନ୍ ଦିନ)')
              : ('✅ Applied Study Pack: ' + res.stats.districtsRestored + ' Watchlist Districts, ' + res.stats.tracksRestored + ' Exam Tracks & ' + res.stats.plannedDaysRestored + ' Revision Days'),
            'ok'
          );
          render();
        }
      });
      var dismissBtn = el('button', 'cso-cdb-btn', orMode ? 'ବାତିଲ୍ କରନ୍ତୁ' : 'Dismiss');
      dismissBtn.type = 'button';
      dismissBtn.addEventListener('click', function () {
        state.incomingPackToken = '';
        clearPackParamFromUrl();
        renderPackBanner(state.lang === 'or');
      });
      act.appendChild(applyBtn);
      act.appendChild(dismissBtn);
      frag.appendChild(act);
      packBanner.replaceChildren(frag);
    }

    function renderTelemetry(orMode) {
      var t = getTelemetry();
      var cards = [
        {
          n: String(t.savedAlertsCount),
          l: orMode ? 'ସେଭ୍ ଆଲର୍ଟ (ଚାକିରି / ପରୀକ୍ଷା / ଯୋଜନା)' : 'Saved Alerts (Jobs / Exams / Schemes)'
        },
        {
          n: t.watchlistDistrictsCount + ' · ' + t.watchlistTracksCount,
          l: orMode ? 'ୱାଚଲିଷ୍ଟ (ଜିଲ୍ଲା · ପରୀକ୍ଷା ଟ୍ରାକ୍)' : 'Watchlist (Districts · Exam Tracks)'
        },
        {
          n: '🔥 ' + t.currentStreak + 'd · ' + t.totalMcqs,
          l: orMode
            ? ('ଷ୍ଟଡି ଷ୍ଟ୍ରିକ୍ · ମୋଟ MCQ (ଲକ୍ଷ୍ୟ ' + t.dailyTarget + '/ଦିନ)')
            : ('Study Streak · Total MCQs (Goal ' + t.dailyTarget + '/day)')
        },
        {
          n: String(t.plannedDaysCount),
          l: orMode ? '୭-ଦିନ ରିଭିଜନ୍ ପ୍ଲାନ୍ ଦିନ' : 'Planned Revision Days'
        }
      ];
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < cards.length; i += 1) {
        var box = el('div', 'cso-cdb-stat');
        box.appendChild(el('strong', 'cso-cdb-stat__n', cards[i].n));
        box.appendChild(el('span', 'cso-cdb-stat__l', cards[i].l));
        frag.appendChild(box);
      }
      telemetryGrid.replaceChildren(frag);
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-cdb-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-cdb-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      privacyBadge.textContent = orMode
        ? '🔒 ୧୦୦% ଡିଭାଇସ୍-ଭିତ୍ତିକ · କୌଣସି ସର୍ଭର ଅପଲୋଡ୍ ନାହିଁ'
        : '🔒 100% On-Device · Zero Server Upload';
      title.textContent = orMode
        ? '💾 ପ୍ରାର୍ଥୀ ପ୍ରୋଫାଇଲ୍ ବ୍ୟାକଅପ୍, ରିଷ୍ଟୋର୍ ଓ ସେୟାରେବଲ୍ ଷ୍ଟଡି-ପ୍ୟାକ୍'
        : '💾 Candidate Profile Backup, Restore & Shareable Study-Pack';
      subtitle.textContent = orMode
        ? 'ଆପଣଙ୍କର ସେଭ୍ ଆଲର୍ଟ, ୱାଚଲିଷ୍ଟ ଜିଲ୍ଲା, ଷ୍ଟଡି ଷ୍ଟ୍ରିକ୍ ଓ ୭-ଦିନ ରିଭିଜନ୍ ପ୍ଲାନ୍ JSON ଫାଇଲ୍ ଭାବରେ ବ୍ୟାକଅପ୍ କରନ୍ତୁ କିମ୍ବା ନୂଆ ଫୋନ୍/ବ୍ରାଉଜରକୁ ସ୍ଥାନାନ୍ତର କରନ୍ତୁ।'
        : 'Back up and restore your Saved Alerts, Watchlist districts/tracks, Study Streak history, and 7-day Revision Plan as JSON or a compact Study-Pack link.';

      secATitle.textContent = orMode ? 'A. ସମ୍ପୂର୍ଣ୍ଣ JSON ବ୍ୟାକଅପ୍ ଏକ୍ସପୋର୍ଟ' : 'A. Full JSON Backup Export';
      secADesc.textContent = orMode
        ? 'ସମସ୍ତ ସ୍ଥାନୀୟ ପ୍ରାର୍ଥୀ ତଥ୍ୟକୁ ଗୋଟିଏ JSON ଫାଇଲରେ ଡାଉନଲୋଡ୍ କିମ୍ବା କପି କରନ୍ତୁ।'
        : 'Download a schema-versioned JSON snapshot of your alerts, watchlist, study streak, revision plan, and document wallet.';
      downloadBtn.textContent = orMode ? '⬇️ ବ୍ୟାକଅପ୍ JSON ଡାଉନଲୋଡ୍' : '⬇️ Download Backup JSON';
      copyJsonBtn.textContent = orMode ? '📋 JSON କପି କରନ୍ତୁ' : '📋 Copy JSON Snapshot';

      secBTitle.textContent = orMode ? 'B. ଫାଇଲ୍ ଇମ୍ପୋର୍ଟ ଓ ମର୍ଜ୍ / ରିପ୍ଲେସ୍' : 'B. Safe File Import & Merge / Replace';
      secBDesc.textContent = orMode
        ? 'ପୁରୁଣା .json ବ୍ୟାକଅପ୍ ଫାଇଲ୍ କିମ୍ବା ଷ୍ଟଡି-ପ୍ୟାକ୍ କୋଡ୍ ପେଷ୍ଟ କରି ତଥ୍ୟ ପୁନରୁଦ୍ଧାର କରନ୍ତୁ।'
        : 'Upload a .json backup file or paste a JSON snapshot / Study-Pack code to restore cleanly.';
      mergeModeBtn.textContent = orMode ? '🔀 ସ୍ମାର୍ଟ ମର୍ଜ୍ (ପୁରୁଣା + ନୂଆ)' : '🔀 Smart Merge (Keep Existing + Add New)';
      replaceModeBtn.textContent = orMode ? '♻️ ସମ୍ପୂର୍ଣ୍ଣ ରିପ୍ଲେସ୍' : '♻️ Full Replace (Overwrite Current Browser)';
      mergeModeBtn.className = 'cso-cdb-mode-pill' + (state.restoreMode === 'merge' ? ' is-active' : '');
      replaceModeBtn.className = 'cso-cdb-mode-pill' + (state.restoreMode === 'replace' ? ' is-active' : '');
      mergeModeBtn.setAttribute('aria-pressed', state.restoreMode === 'merge' ? 'true' : 'false');
      replaceModeBtn.setAttribute('aria-pressed', state.restoreMode === 'replace' ? 'true' : 'false');

      fileLabelText.textContent = orMode
        ? '📂 .json ବ୍ୟାକଅପ୍ ଫାଇଲ୍ ବାଛନ୍ତୁ କିମ୍ବା ଏଠାରେ ଡ୍ରପ୍ କରନ୍ତୁ'
        : '📂 Choose or Drop a .json Backup File';
      pasteLabel.textContent = orMode ? 'କିମ୍ବା JSON / ଷ୍ଟଡି-ପ୍ୟାକ୍ କୋଡ୍ ପେଷ୍ଟ କରନ୍ତୁ:' : 'Or paste JSON Backup / Study-Pack Link or Code:';
      pasteArea.placeholder = orMode ? '{"schema":"csodisha-candidate-backup-v1",...} କିମ୍ବା ଷ୍ଟଡି-ପ୍ୟାକ୍ କୋଡ୍' : '{"schema":"csodisha-candidate-backup-v1",...} or Study-Pack code';
      importBtn.textContent = orMode ? '✅ ବ୍ୟାକଅପ୍ ରିଷ୍ଟୋର୍ କରନ୍ତୁ' : '✅ Restore Backup / Study Pack';

      secCTitle.textContent = orMode ? 'C. ସେୟାରେବଲ୍ ଷ୍ଟଡି-ପ୍ୟାକ୍ ଲିଙ୍କ୍ ଜେନେରେଟର୍' : 'C. Compact Shareable Study-Pack Generator';
      secCDesc.textContent = orMode
        ? 'ଆପଣଙ୍କର ୱାଚଲିଷ୍ଟ ଜିଲ୍ଲା, ଦୈନିକ MCQ ଲକ୍ଷ୍ୟ ଓ ୭-ଦିନ ରିଭିଜନ୍ ପ୍ଲାନ୍ ପାଇଁ ଗୋଟିଏ କମ୍ପାକ୍ଟ ଲିଙ୍କ୍ ତିଆରି କରି WhatsApp/Telegram ରେ ସେୟାର କରନ୍ତୁ।'
        : 'Create a compact URL carrying your Watchlist districts/tracks, daily MCQ goal, and 7-day Revision Plan to sync devices or share with a friend.';
      genPackBtn.textContent = orMode ? '🔗 ଷ୍ଟଡି-ପ୍ୟାକ୍ ଲିଙ୍କ୍ ତିଆରି କରନ୍ତୁ' : '🔗 Generate Shareable Study-Pack Link';
      copyLinkBtn.textContent = orMode ? '📋 ଲିଙ୍କ୍ କପି କରନ୍ତୁ' : '📋 Copy Link';
      copyCodeBtn.textContent = orMode ? '🔑 କୋଡ୍ କପି କରନ୍ତୁ' : '🔑 Copy Code';
      waShareLink.textContent = orMode ? '💬 WhatsApp ରେ ସେୟାର ↗' : '💬 Share on WhatsApp ↗';

      packOutWrap.hidden = !state.generatedUrl;
      if (state.generatedUrl) {
        packUrlInput.value = state.generatedUrl;
        waShareLink.href = 'https://wa.me/?text=' + encodeURIComponent('My Common Sense Odisha Study Pack: ' + state.generatedUrl);
      }

      renderPackBanner(orMode);
      renderTelemetry(orMode);
      renderToast();
    }

    function runImportFromText(rawText) {
      var orMode = state.lang === 'or';
      var res = importCandidateBackupPayload(rawText, state.restoreMode);
      if (!res.ok) {
        setToast('❌ ' + res.error, 'err');
        return;
      }
      setToast(
        orMode
          ? ('✅ ପୁନରୁଦ୍ଧାର ସଫଳ: ' + res.stats.alertsRestored + ' ଆଲର୍ଟ, ' + res.stats.districtsRestored + ' ଜିଲ୍ଲା ଓ ' + res.stats.studyDaysRestored + ' ଅଭ୍ୟାସ ଦିନ')
          : ('✅ Restored ' + res.stats.alertsRestored + ' Alerts, ' + res.stats.districtsRestored + ' Watchlist Districts & ' + res.stats.studyDaysRestored + ' Study Days'),
        'ok'
      );
      pasteArea.value = '';
      render();
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });

    mergeModeBtn.addEventListener('click', function () { state.restoreMode = 'merge'; render(); });
    replaceModeBtn.addEventListener('click', function () { state.restoreMode = 'replace'; render(); });

    downloadBtn.addEventListener('click', function () {
      var payload = buildCandidateBackupPayload();
      var fname = 'csodisha-candidate-backup-' + payload.exportedDateIst + '.json';
      var ok = triggerDownloadJson(fname, JSON.stringify(payload, null, 2));
      setToast(ok ? ('⬇️ Downloaded ' + fname) : '⚠️ Download blocked by browser.', ok ? 'ok' : 'err');
    });

    copyJsonBtn.addEventListener('click', function () {
      var payload = buildCandidateBackupPayload();
      copyText(JSON.stringify(payload, null, 2)).then(function (ok) {
        setToast(ok ? '📋 Copied candidate backup JSON to clipboard.' : '⚠️ Clipboard permission unavailable.', ok ? 'ok' : 'err');
      });
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        runImportFromText(String(reader.result || ''));
        fileInput.value = '';
      };
      reader.onerror = function () {
        setToast('❌ Could not read selected file.', 'err');
      };
      reader.readAsText(file);
    });

    fileLabel.addEventListener('dragover', function (ev) {
      ev.preventDefault();
      fileLabel.classList.add('is-dragover');
    });
    fileLabel.addEventListener('dragleave', function () {
      fileLabel.classList.remove('is-dragover');
    });
    fileLabel.addEventListener('drop', function (ev) {
      ev.preventDefault();
      fileLabel.classList.remove('is-dragover');
      var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { runImportFromText(String(reader.result || '')); };
      reader.readAsText(file);
    });

    importBtn.addEventListener('click', function () {
      runImportFromText(pasteArea.value);
    });

    genPackBtn.addEventListener('click', function () {
      var payload = buildCandidateBackupPayload();
      var origin = (win && win.location && win.location.origin && /^https?:/i.test(win.location.origin))
        ? win.location.origin
        : 'https://csodisha.com';
      state.generatedCode = encodeStudyPack(payload);
      state.generatedUrl = buildShareablePackUrl(payload, origin);
      setToast('🔗 Shareable Study-Pack link generated!', 'ok');
      render();
    });

    copyLinkBtn.addEventListener('click', function () {
      if (!state.generatedUrl) return;
      copyText(state.generatedUrl).then(function (ok) {
        setToast(ok ? '📋 Copied Study-Pack link!' : '⚠️ Clipboard permission unavailable.', ok ? 'ok' : 'err');
      });
    });

    copyCodeBtn.addEventListener('click', function () {
      if (!state.generatedCode) return;
      copyText(state.generatedCode).then(function (ok) {
        setToast(ok ? '🔑 Copied compact Study-Pack code!' : '⚠️ Clipboard permission unavailable.', ok ? 'ok' : 'err');
      });
    });

    if (win) {
      win.addEventListener('storage', function () { renderTelemetry(state.lang === 'or'); });
      win.addEventListener('cso:candidate-data-restored', function () { renderTelemetry(state.lang === 'or'); });
    }

    render();
    return { refresh: render };
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function () { mount(); });
    } else {
      mount();
    }
  }

  return {
    version: VERSION,
    ROOT_ID: ROOT_ID,
    SCHEMA_VERSION: SCHEMA_VERSION,
    PACK_VERSION: PACK_VERSION,
    KEYS: KEYS,
    getIstDateYmd: getIstDateYmd,
    getIstTimestamp: getIstTimestamp,
    getTelemetry: getTelemetry,
    buildCandidateBackupPayload: buildCandidateBackupPayload,
    importCandidateBackupPayload: importCandidateBackupPayload,
    encodeStudyPack: encodeStudyPack,
    decodeStudyPack: decodeStudyPack,
    buildShareablePackUrl: buildShareablePackUrl,
    mount: mount
  };
});
