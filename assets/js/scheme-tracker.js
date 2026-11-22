(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_saved_schemes_v1';

  var PROFILE_RULES = {
    'Student / Scholarship': /\b(student|students|scholarship|scholarships|merit|stipend|post-matric|pre-matric|education|fellowship|hostel|laptop|vidya|medhabruti)\b/i,
    'Women Empowerment': /\b(women|woman|girl|girls|mother|mothers|subhadra|shg|mission\s+shakti|widow|maternity|mamata|female)\b/i,
    'Farmer / Agriculture': /\b(farmer|farmers|agriculture|agricultural|kisan|kalia|krushak|crop|irrigation|fishery|dairy|livestock|seed|paddy)\b/i,
    'Youth Skill & Employment': /\b(youth|skill|skills|employment|entrepreneur|startup|loan|mudra|swayam|apprentice|training|iti|rozgar|self-employment)\b/i,
    'Health & Family Welfare': /\b(health|medical|hospital|insurance|gjay|bsky|ayushman|family\s+welfare|nutrition|patient|treatment|asha)\b/i
  };

  var CATEGORY_RULES = {
    'SC / ST': /\b(sc|st|sc\/st|scheduled\s+caste|scheduled\s+tribe|tribal|adivasi|dalit)\b/i,
    'SEBC / OBC': /\b(sebc|obc|backward\s+class|other\s+backward)\b/i,
    'EWS / General': /\b(ews|general|economically\s+weaker|unreserved|all\s+categories|all\s+citizens)\b/i
  };

  function normalizeScheme(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var title = String(raw.title || raw.title_or || '').trim();
    if (!title) return null;
    var id = String(raw.id || raw.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64)).trim();
    if (!id) return null;
    return {
      id: id,
      title: title,
      department: String(raw.department || raw.department_name || raw.sponsor_level || 'Govt of Odisha').trim(),
      category: String(raw.category || raw.scheme_type || raw.beneficiary_group || 'Welfare Scheme').trim(),
      benefit: String(raw.benefit || raw.benefit_amount || '').trim(),
      officialUrl: String(raw.officialUrl || raw.official_apply_url || raw.apply_url || '').trim(),
      savedAt: String(raw.savedAt || new Date().toISOString())
    };
  }

  function load(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return [];
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      var seen = {};
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var norm = normalizeScheme(arr[i]);
        if (norm && !seen[norm.id]) {
          seen[norm.id] = true;
          out.push(norm);
        }
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function saveList(list, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var clean = Array.isArray(list) ? list : [];
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch (_) {}
    }
    if (typeof fetch === 'function') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
          body: JSON.stringify({ savedSchemes: clean })
        }).catch(function () {});
      } catch (_) {}
    }
    return clean;
  }

  function isSaved(id, storage) {
    var key = String(id || '').trim();
    if (!key) return false;
    return load(storage).some(function (it) { return it.id === key; });
  }

  function toggleSave(raw, storage) {
    var norm = normalizeScheme(raw);
    if (!norm) return { saved: false, items: load(storage) };
    var list = load(storage);
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === norm.id) { idx = i; break; }
    }
    if (idx >= 0) {
      list.splice(idx, 1);
      saveList(list, storage);
      return { saved: false, items: list };
    }
    list.unshift(norm);
    saveList(list, storage);
    return { saved: true, items: list };
  }

  function removeScheme(id, storage) {
    var key = String(id || '').trim();
    var list = load(storage).filter(function (it) { return it.id !== key; });
    saveList(list, storage);
    return list;
  }

  function buildSearchHaystack(scheme) {
    if (!scheme || typeof scheme !== 'object') return '';
    return [
      scheme.title,
      scheme.title_or,
      scheme.category,
      scheme.scheme_type,
      scheme.sponsor_level,
      scheme.department,
      scheme.department_name,
      scheme.beneficiary_group,
      scheme.eligibility,
      scheme.summary,
      scheme.benefit_amount,
      scheme.benefit
    ].filter(Boolean).join(' ');
  }

  function filterLiveSchemesByProfile(schemes, profile) {
    var list = Array.isArray(schemes) ? schemes : [];
    var prof = profile && typeof profile === 'object' ? profile : {};
    var applicant = String(prof.applicantProfile || 'All').trim();
    var socialCat = String(prof.socialCategory || 'All Categories').trim();

    var appRegex = (applicant && applicant !== 'All') ? PROFILE_RULES[applicant] : null;
    var catRegex = (socialCat && socialCat !== 'All Categories') ? CATEGORY_RULES[socialCat] : null;

    if (!appRegex && !catRegex) return list.slice();

    return list.filter(function (scheme) {
      var hay = buildSearchHaystack(scheme);
      if (appRegex && !appRegex.test(hay)) return false;
      if (catRegex && !catRegex.test(hay)) return false;
      return true;
    });
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    normalizeScheme: normalizeScheme,
    load: load,
    saveList: saveList,
    isSaved: isSaved,
    toggleSave: toggleSave,
    removeScheme: removeScheme,
    filterLiveSchemesByProfile: filterLiveSchemesByProfile
  };

  root.CSO_SCHEME_TRACKER = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
