/* Clean-Slate v238: Candidate Hub Helper Utilities (zero hardcoded widgets or 30-district lists).
   Strict CSP: DOM APIs only. */
(function (root) {
  'use strict';

  var PROFILE_KEY = 'cso_eligibility_profile';
  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';
  var LANG_MODE_KEY = 'cso_study_lang_mode';
  var BOOKMARKS_KEY = 'cso_candidate_bookmarks_v1';
  var DISTRICTS = [];

  function readJson(key, fallback, storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
      var raw = st && st.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function writeJson(key, val, storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try { if (st) st.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function computeDaysLeft(dateStr, nowMs) {
    var target = Date.parse(String(dateStr || ''));
    if (isNaN(target)) return null;
    var now = new Date(nowMs === undefined ? Date.now() : nowMs);
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var tDate = new Date(target);
    var targetStart = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime();
    return Math.round((targetStart - todayStart) / 86400000);
  }

  function formatCountdownLabel(daysLeft) {
    if (daysLeft === null) return 'Upcoming';
    if (daysLeft < 0) return 'Closed';
    if (daysLeft === 0) return 'Closing Today';
    if (daysLeft === 1) return '1 day left';
    return daysLeft + ' days left';
  }

  function evaluateMatch(item, profile) {
    if (!profile) return { eligible: false, districtMatch: false };
    var hay = [item.title, item.qualification, item.category, item.summary, item.state, item.district].filter(Boolean).join(' ').toLowerCase();
    var eligible = true;
    if (profile.qualification) {
      var q = String(profile.qualification).toLowerCase();
      if (q.includes('10th') && /\b(graduate|post-graduate|b\.tech)\b/.test(hay) && !/\b10th\b/.test(hay)) {
        eligible = false;
      }
    }
    var dist = String(profile.district || '').trim().toLowerCase();
    var districtMatch = Boolean(dist && hay.includes(dist));
    return { eligible: eligible, districtMatch: districtMatch };
  }

  function buildBackupPayload(storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    return {
      version: 238,
      exported_at: new Date().toISOString(),
      cso_eligibility_profile: readJson(PROFILE_KEY, null, st),
      cso_study_mistake_deck: readJson(MISTAKE_DECK_KEY, [], st),
      cso_study_lang_mode: (st && st.getItem(LANG_MODE_KEY)) || 'en',
      cso_candidate_bookmarks_v1: readJson(BOOKMARKS_KEY, { jobs: [], schemes: [], study: [] }, st)
    };
  }

  function validateBackupPayload(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'Invalid backup JSON object.' };
    var hasKnown = ['cso_eligibility_profile', 'cso_study_mistake_deck', 'cso_study_lang_mode', 'cso_candidate_bookmarks_v1']
      .some(function (k) { return Object.prototype.hasOwnProperty.call(obj, k); });
    if (!hasKnown) return { ok: false, error: 'Backup file does not contain Candidate Hub data.' };
    return { ok: true };
  }

  function restoreBackupPayload(obj, storage) {
    var check = validateBackupPayload(obj);
    if (!check.ok) return check;
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_eligibility_profile')) {
      if (obj.cso_eligibility_profile) writeJson(PROFILE_KEY, obj.cso_eligibility_profile, st);
      else if (st) st.removeItem(PROFILE_KEY);
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_study_mistake_deck')) {
      writeJson(MISTAKE_DECK_KEY, obj.cso_study_mistake_deck || [], st);
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_study_lang_mode')) {
      try { if (st) st.setItem(LANG_MODE_KEY, String(obj.cso_study_lang_mode || 'en')); } catch (_) {}
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_candidate_bookmarks_v1')) {
      writeJson(BOOKMARKS_KEY, obj.cso_candidate_bookmarks_v1 || { jobs: [], schemes: [], study: [] }, st);
    }
    return { ok: true };
  }

  root.CSOCandidateHub = {
    DISTRICTS: DISTRICTS,
    computeDaysLeft: computeDaysLeft,
    formatCountdownLabel: formatCountdownLabel,
    evaluateMatch: evaluateMatch,
    buildBackupPayload: buildBackupPayload,
    validateBackupPayload: validateBackupPayload,
    restoreBackupPayload: restoreBackupPayload
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CSOCandidateHub;
})(typeof window !== 'undefined' ? window : globalThis);
